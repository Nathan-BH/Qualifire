/**
 * QA — WP-3 (2026-09-05): the read-side v1 -> v2 schema migration
 * (src/store/migrations.ts) and its wiring into catalogStore.ts,
 * resultsStore.ts, freeRides.ts, eventsJsonl.ts and gpxPlusExport.ts. Covers
 * the brief's §4 A8 acceptance list (12 cases): the real-seed upgrade, a
 * synthetic full-shape upgrade, idempotency, refusals, the two init-time
 * read paths (catalog + results) leaving on-disk bytes untouched until the
 * next routine write, refuse-and-disarm, the free-rides cache, the
 * pick-event/GPX+ key rename with no read shim, and the legacy id-prefix
 * predicate + label helpers on both prefixes.
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import * as path from 'node:path';
import { assert, test, loadJson, TESTS_DIR } from './lib.ts';
import { createMemoryFsAdapter } from '../src/storage/fsAdapter.ts';
import { emptyCatalog, validateCatalog } from '../src/store/catalog.ts';
import { upgradeCatalog, upgradeResult, upgradeFreeRidesCache } from '../src/store/migrations.ts';
import { isStale } from '../src/store/results.ts';
import type { Catalog, RideResult } from '../src/store/types.ts';
import { isUserMintedWayId, wayLabelIn, wayVariantLabel } from '../src/store/defaultWay.ts';
import { buildRouteCreationCatalog, type RouteCreationDraft } from '../src/store/routeCreation.ts';
import { decodeEventsFile } from '../src/storage/eventsJsonl.ts';
import { buildGpxPlus } from '../src/storage/gpxPlusExport.ts';
import { isValidFreeRideRecord, type FreeRideRecord } from '../src/store/freeRides.ts';
import type { DecodedRide } from '../src/storage/types.ts';

// App code (catalogStore.ts -> seed.ts) imports catalog.seed.json as a bare
// `.json` — Metro bundles that directly, Node needs a loader hook. Same shim,
// same reason, as resultsstore_suite.ts/catalogstore_suite.ts: the modules
// under test are pulled in DYNAMICALLY, after the hook exists, since static
// imports are linked before any module body (including this hook) runs.
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const catalogStore = await import('../src/store/catalogStore.ts');
const resultsStore = await import('../src/store/resultsStore.ts');
const freeRidesMod = await import('../src/store/freeRides.ts');

// ------------------------------------------------------------------ helpers

/** Key-order-insensitive deep equality: recursively sorts object keys before
 * stringifying, so a same-content object built with a different property
 * insertion order still compares equal (the whole point of this migration —
 * object spread order is deliberately not a contract, per migrations.ts's own
 * header comment). */
function canon(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canon);
  if (v !== null && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) out[k] = canon((v as Record<string, unknown>)[k]);
    return out;
  }
  return v;
}
function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
}

function lm(id: string, lat: number, lon: number, radiusM = 100) {
  return { id, label: id, lat, lon, radiusM, activeFromMs: 0, activeUntilMs: null, offerAtStart: true };
}

// -------------------------------------------------------- 1. real-seed upgrade

test('migrations 1: upgradeCatalog(v1 fixture) deep-equals the committed v2 seed; validates', () => {
  const v1 = loadJson<unknown>(path.join(TESTS_DIR, 'fixtures', 'catalog.seed.v1.json'));
  const v2Committed = loadJson<Catalog>(path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  const upgraded = upgradeCatalog(v1);
  assert(upgraded !== null, 'upgradeCatalog(v1 fixture) must not refuse');
  assert(deepEqual(upgraded, v2Committed),
    'upgradeCatalog(v1 fixture) must deep-equal the committed v2 catalog.seed.json (key order aside)');
  const upgradedCat = upgraded as unknown as Catalog;
  assert(validateCatalog(upgradedCat).length === 0,
    `the upgraded seed must validate: ${validateCatalog(upgradedCat).join('; ')}`);
});

// -------------------------------------------------- 2. synthetic full-shape upgrade

test('migrations 2: upgradeCatalog — a loop, specs + referenceRideId, two gate-set versions, an unknown extra key', () => {
  const raw = {
    schemaVersion: 1,
    landmarks: [lm('a', 51.0, 4.0), lm('b', 51.1, 4.1)],
    // v1 "ways" = base paths (parent), holds routeIds[]
    ways: [
      { id: 'loopA', startLandmarkId: 'a', endLandmarkId: 'a', loopDiscriminator: 'loop:1', routeIds: ['var1'] },
    ],
    // v1 "routes" = variants (child), holds wayId FK
    routes: [
      {
        id: 'var1', wayId: 'loopA', refLineId: 'var1', gateSetVersion: 2, seeded: false,
        referenceRideId: 'ride9', specs: ['Dry', 'Fast'], extra: 1,
      },
    ],
    gateSets: [
      { routeId: 'var1', version: 1, chainageM: [10, 990], createdAtMs: 0 },
      { routeId: 'var1', version: 2, chainageM: [5, 995], createdAtMs: 100 },
    ],
  };
  const up = upgradeCatalog(raw) as unknown as Record<string, unknown>;
  assert(up !== null, 'must upgrade, not refuse');
  assert(up.schemaVersion === 2, 'schemaVersion bumped to 2');
  const routes = up.routes as Record<string, unknown>[]; // v2 base paths
  const ways = up.ways as Record<string, unknown>[]; // v2 variants
  const gateSets = up.gateSets as Record<string, unknown>[];
  assert(routes.length === 1 && routes[0].id === 'loopA' && routes[0].startLandmarkId === 'a'
    && routes[0].endLandmarkId === 'a' && routes[0].loopDiscriminator === 'loop:1',
    'the base path keeps every field, id and loop discriminator');
  assert(deepEqual(routes[0].wayIds, ['var1']) && !('routeIds' in routes[0]),
    'routeIds -> wayIds on the base path, old key gone');
  assert(ways.length === 1 && ways[0].id === 'var1' && ways[0].refLineId === 'var1'
    && ways[0].gateSetVersion === 2 && ways[0].seeded === false && ways[0].referenceRideId === 'ride9',
    'the variant keeps every field and id');
  assert(ways[0].routeId === 'loopA' && !('wayId' in ways[0]), 'wayId -> routeId on the variant, old key gone');
  assert(deepEqual(ways[0].specs, ['Dry', 'Fast']), 'specs untouched');
  assert(ways[0].extra === 1, 'an unrecognised extra key is carried through, not dropped');
  assert(gateSets.length === 2
    && gateSets[0].wayId === 'var1' && gateSets[0].version === 1 && deepEqual(gateSets[0].chainageM, [10, 990])
    && gateSets[1].wayId === 'var1' && gateSets[1].version === 2 && deepEqual(gateSets[1].chainageM, [5, 995])
    && !('routeId' in gateSets[0]) && !('routeId' in gateSets[1]),
    'both gate-set versions rename routeId -> wayId and keep their own version');
});

// -------------------------------------------------------------- 3. idempotent

test('migrations 3: upgradeCatalog is idempotent; a v2 input is returned as-is', () => {
  const v1 = loadJson<unknown>(path.join(TESTS_DIR, 'fixtures', 'catalog.seed.v1.json'));
  const once = upgradeCatalog(v1);
  const twice = upgradeCatalog(once);
  assert(once !== null && twice !== null, 'both upgrades must succeed');
  assert(deepEqual(once, twice), 'upgradeCatalog(upgradeCatalog(x)) deep-equals upgradeCatalog(x)');
  const v2 = loadJson<unknown>(path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  assert(upgradeCatalog(v2) === v2, 'a v2 input is returned by reference, untouched');
});

// -------------------------------------------------------------- 4. refusals

test('migrations 4: upgradeCatalog refuses a future schemaVersion or a missing array', () => {
  const shape = { landmarks: [], ways: [], routes: [], gateSets: [] };
  assert(upgradeCatalog({ ...shape, schemaVersion: 3 }) === null, 'a future schemaVersion is refused, never guessed at');
  assert(upgradeCatalog({ schemaVersion: 1, landmarks: [], ways: [], routes: [] }) === null, 'a missing gateSets array is refused');
  assert(upgradeCatalog({ schemaVersion: 1, ways: [], routes: [], gateSets: [] }) === null, 'a missing landmarks array is refused');
  assert(upgradeCatalog(null) === null && upgradeCatalog('x') === null && upgradeCatalog(42) === null,
    'a non-object is refused');
});

// ---------------------------------------------------- 5. catalogStore init/save

test('migrations 5: initCatalogStore migrates a v1 user file in memory without writing it; saveUserCatalog then persists it at v2', async () => {
  catalogStore.resetCatalogStoreForTests(emptyCatalog()); // isolate: no seed noise
  try {
    const v1Text = JSON.stringify({
      schemaVersion: 1,
      landmarks: [lm('p', 51.0, 4.0), lm('q', 51.2, 4.2)],
      ways: [{ id: 'p>q', startLandmarkId: 'p', endLandmarkId: 'q', routeIds: ['V1'] }],
      routes: [{ id: 'V1', wayId: 'p>q', refLineId: 'V1', gateSetVersion: 1, seeded: false }],
      gateSets: [{ routeId: 'V1', version: 1, chainageM: [10, 90], createdAtMs: 0 }],
    }, null, 1) + '\n';
    const fs = createMemoryFsAdapter();
    fs.files.set(catalogStore.USER_CATALOG_FILE, v1Text);

    await catalogStore.initCatalogStore(fs);
    const user = catalogStore.userCatalog();
    assert(user.schemaVersion === 2, 'in memory the user catalog reads at v2');
    assert(user.routes.length === 1 && user.routes[0].id === 'p>q' && deepEqual(user.routes[0].wayIds, ['V1']),
      'the base path is under v2 keys (wayIds), same id and content');
    assert(user.ways.length === 1 && user.ways[0].id === 'V1' && user.ways[0].routeId === 'p>q',
      'the variant is under v2 keys (routeId), same id and content');
    assert(fs.files.get(catalogStore.USER_CATALOG_FILE) === v1Text,
      'no write at init: the v1 file is byte-identical on disk after initCatalogStore');

    const errs = await catalogStore.saveUserCatalog(user);
    await catalogStore.flushCatalogWrites();
    assert(errs.length === 0, `re-saving the migrated catalog must validate: ${errs.join('; ')}`);
    const onDisk = fs.files.get(catalogStore.USER_CATALOG_FILE)!;
    assert(onDisk !== v1Text, 'the routine write path now rewrites the file');
    const parsed = JSON.parse(onDisk);
    assert(parsed.schemaVersion === 2 && deepEqual(parsed.routes[0].wayIds, ['V1']) && parsed.ways[0].routeId === 'p>q',
      'the file on disk is now v2, with wayIds/routeId, only through the ordinary save path');
  } finally {
    catalogStore.resetCatalogStoreForTests();
  }
});

// -------------------------------------------------------- 6. refuse-and-disarm

test('migrations 6: a refused catalog.user.json disarms writes — saveUserCatalog is a no-op on disk', async () => {
  catalogStore.resetCatalogStoreForTests(emptyCatalog());
  try {
    const futureText = JSON.stringify({ schemaVersion: 3, landmarks: [], ways: [], routes: [], gateSets: [] });
    const fs = createMemoryFsAdapter();
    fs.files.set(catalogStore.USER_CATALOG_FILE, futureText);
    await catalogStore.initCatalogStore(fs);
    assert(deepEqual(catalogStore.currentCatalog(), emptyCatalog()), 'a future schemaVersion is refused: seed-only (here, an empty seed)');

    const valid = emptyCatalog();
    valid.landmarks = [lm('x', 10, 10), lm('y', 10.2, 10.2)];
    valid.routes = [{ id: 'x>y', startLandmarkId: 'x', endLandmarkId: 'y', wayIds: ['XY'] }];
    valid.ways = [{ id: 'XY', routeId: 'x>y', refLineId: 'XY', gateSetVersion: 1, seeded: false }];
    valid.gateSets = [{ wayId: 'XY', version: 1, chainageM: [1, 9], createdAtMs: 0 }];
    const errs = await catalogStore.saveUserCatalog(valid);
    await catalogStore.flushCatalogWrites();
    assert(errs.length === 0, 'saveUserCatalog itself still succeeds (validation, not persistence, is the gate)');
    assert(fs.files.get(catalogStore.USER_CATALOG_FILE) === futureText,
      'refused: writes are disarmed — the file on disk is untouched');
  } finally {
    catalogStore.resetCatalogStoreForTests();
  }
});

test('migrations 6b: a decodable-but-unmergeable catalog.user.json also disarms writes', async () => {
  catalogStore.resetCatalogStoreForTests(emptyCatalog());
  try {
    const malformedText = JSON.stringify({ schemaVersion: 2, landmarks: [null], ways: [], routes: [], gateSets: [] });
    const fs = createMemoryFsAdapter();
    fs.files.set(catalogStore.USER_CATALOG_FILE, malformedText);
    await catalogStore.initCatalogStore(fs);
    assert(deepEqual(catalogStore.currentCatalog(), emptyCatalog()), 'decodable-but-malformed: seed-only');

    const valid = emptyCatalog();
    valid.landmarks = [lm('m', 20, 20), lm('n', 20.2, 20.2)];
    valid.routes = [{ id: 'm>n', startLandmarkId: 'm', endLandmarkId: 'n', wayIds: ['MN'] }];
    valid.ways = [{ id: 'MN', routeId: 'm>n', refLineId: 'MN', gateSetVersion: 1, seeded: false }];
    valid.gateSets = [{ wayId: 'MN', version: 1, chainageM: [1, 9], createdAtMs: 0 }];
    const errs = await catalogStore.saveUserCatalog(valid);
    await catalogStore.flushCatalogWrites();
    assert(errs.length === 0, 'saveUserCatalog still succeeds in memory');
    assert(fs.files.get(catalogStore.USER_CATALOG_FILE) === malformedText, 'refused again: untouched, unwritten');
  } finally {
    catalogStore.resetCatalogStoreForTests();
  }
});

// -------------------------------------------------------------- 7. upgradeResult

test('migrations 7: upgradeResult renames routeId -> wayId, bumps both version fields, keeps every other field', () => {
  const raw = {
    kind: 'rideResult', schemaVersion: 1, rideId: 'r1', startedAtMs: 1000,
    routeId: 'Morning', source: 'app',
    lap: { rawS: 100, movingS: 95, quality: 'clean' },
    sectors: [{ index: 1, fromChainageM: 0, toChainageM: 100, rawS: 50, movingS: 48, quality: 'clean' }],
    ignoredFromRanking: true, tripwireDemoted: true,
    derivedBy: { engineVersion: 'core-1', gateSetVersion: 1, resultSchemaVersion: 1 },
  };
  const up = upgradeResult(raw) as unknown as RideResult;
  assert(up !== null, 'must upgrade, not refuse');
  assert((up as unknown as Record<string, unknown>).routeId === undefined, 'old routeId key is gone');
  assert(up.wayId === 'Morning', 'routeId -> wayId, value preserved');
  assert(up.schemaVersion === 2, 'schemaVersion bumped');
  assert(up.derivedBy.resultSchemaVersion === 2, 'derivedBy.resultSchemaVersion bumped too — isStale must never condemn it');
  assert(up.derivedBy.engineVersion === 'core-1' && up.derivedBy.gateSetVersion === 1, 'other derivedBy fields untouched');
  assert(up.ignoredFromRanking === true && up.tripwireDemoted === true, 'rider/tripwire flags kept');
  assert(deepEqual(up.lap, raw.lap) && deepEqual(up.sectors, raw.sectors), 'lap and sectors untouched');
  assert(!isStale(up, 'core-1', 1), 'an upgraded result is never stale against its own engine/gate-set version');
  assert(resultsStore.isValidRideResult(up), 'the upgraded record is structurally valid');

  const v2 = { ...raw, schemaVersion: 2, wayId: 'Morning', routeId: undefined };
  delete (v2 as Record<string, unknown>).routeId;
  assert(upgradeResult(v2) === v2, 'a v2 input is returned by reference, untouched');
  assert(upgradeResult({ ...raw, schemaVersion: 3 }) === null, 'a future schemaVersion is refused');
  assert(upgradeResult({ kind: 'somethingElse' }) === null, 'not a rideResult -> refused');
});

// ------------------------------------------------- 8. resultsStore init (mixed v1/v2)

test('migrations 8: initResultsStore reads a v1 AND a v2 result file, neither is rewritten', async () => {
  resultsStore.resetResultsStoreForTests();
  try {
    const v1Result = {
      kind: 'rideResult', schemaVersion: 1, rideId: 'seed-v1', startedAtMs: 1000,
      routeId: 'Morning', source: 'app',
      lap: { rawS: 100, movingS: 95, quality: 'clean' },
      sectors: [{ index: 1, fromChainageM: 0, toChainageM: 100, rawS: 50, movingS: 48, quality: 'clean' }],
      derivedBy: { engineVersion: 'core-1', gateSetVersion: 1, resultSchemaVersion: 1 },
    };
    const v2Result = {
      kind: 'rideResult', schemaVersion: 2, rideId: 'seed-v2', startedAtMs: 2000,
      wayId: 'EveningA', source: 'app',
      lap: { rawS: 200, movingS: 190, quality: 'clean' },
      sectors: [{ index: 1, fromChainageM: 0, toChainageM: 100, rawS: 60, movingS: 58, quality: 'clean' }],
      derivedBy: { engineVersion: 'core-1', gateSetVersion: 1, resultSchemaVersion: 2 },
    };
    const v1Text = JSON.stringify(v1Result, null, 1) + '\n';
    const v2Text = JSON.stringify(v2Result, null, 1) + '\n';
    const fs = createMemoryFsAdapter();
    fs.files.set(`${resultsStore.RESULTS_DIR}/seed-v1.json`, v1Text);
    fs.files.set(`${resultsStore.RESULTS_DIR}/seed-v2.json`, v2Text);

    await resultsStore.initResultsStore(fs);
    const stored = resultsStore.storedResults();
    assert(stored.length === 2, `expected both results loaded, got ${stored.length}`);
    const r1 = stored.find((r) => r.rideId === 'seed-v1');
    const r2 = stored.find((r) => r.rideId === 'seed-v2');
    assert(r1 !== undefined && r1.wayId === 'Morning', 'the v1 result is upgraded in memory (wayId set)');
    assert(r2 !== undefined && r2.wayId === 'EveningA', 'the v2 result loads unchanged');
    assert(fs.files.get(`${resultsStore.RESULTS_DIR}/seed-v1.json`) === v1Text, 'the v1 result file is byte-identical on disk');
    assert(fs.files.get(`${resultsStore.RESULTS_DIR}/seed-v2.json`) === v2Text, 'the v2 result file is byte-identical on disk');

    const indexText = fs.files.get(resultsStore.RESULTS_INDEX_FILE);
    if (indexText !== undefined) {
      const idx = JSON.parse(indexText) as { entries: Record<string, unknown>[] };
      assert(idx.entries.every((e) => typeof e.wayId === 'string' && !('routeId' in e)),
        'the rebuilt index carries wayId entries only');
    }
  } finally {
    resultsStore.resetResultsStoreForTests();
  }
});

// --------------------------------------------------------- 9. free-rides cache

test('migrations 9: upgradeFreeRidesCache renames crossings/sectors routeId -> wayId; a v2 file is untouched; init never rewrites', async () => {
  const v1Raw = {
    schemaVersion: 1,
    rides: [{
      kind: 'freeRide', schemaVersion: 1, rideId: 'free:1', startedAtMs: 1000,
      crossings: [{ routeId: 'Morning', gateIndex: 0, t: 0, estimated: false }],
      sectors: [{ routeId: 'Morning', index: 1, rawS: 10 }],
    }],
  };
  const upgraded = upgradeFreeRidesCache(v1Raw) as unknown as Record<string, unknown>[];
  assert(upgraded !== null && upgraded.length === 1, 'must upgrade, not refuse');
  const ride = upgraded[0];
  assert(ride.schemaVersion === 2, 'the ride record itself is bumped to v2');
  const crossings = ride.crossings as Record<string, unknown>[];
  const sectors = ride.sectors as Record<string, unknown>[];
  assert(crossings[0].wayId === 'Morning' && !('routeId' in crossings[0]), 'crossings[].routeId -> wayId');
  assert(sectors[0].wayId === 'Morning' && !('routeId' in sectors[0]), 'sectors[].routeId -> wayId');

  const v2Raw = {
    schemaVersion: 2,
    rides: [{
      kind: 'freeRide', schemaVersion: 2, rideId: 'free:2', startedAtMs: 2000,
      crossings: [{ wayId: 'X', gateIndex: 0, t: 0, estimated: true }],
      sectors: [{ wayId: 'X', index: 1, rawS: 5 }],
    }],
  };
  const asIs = upgradeFreeRidesCache(v2Raw);
  assert(asIs === v2Raw.rides, 'a v2 file returns its rides array as-is (same reference)');
  assert(upgradeFreeRidesCache({ schemaVersion: 3, rides: [] }) === null, 'a future schemaVersion is refused');
  assert(upgradeFreeRidesCache({ schemaVersion: 1 }) === null, 'a missing rides array is refused');

  // isValidFreeRideRecord accepts the upgraded shape end to end.
  assert(isValidFreeRideRecord(ride as unknown as FreeRideRecord), 'the upgraded record passes the structural guard');

  freeRidesMod.resetFreeRides();
  try {
    const v1Text = JSON.stringify(v1Raw, null, 1) + '\n';
    const fs = createMemoryFsAdapter();
    fs.files.set(freeRidesMod.FREE_RIDES_CACHE_FILE, v1Text);
    await freeRidesMod.initFreeRidePersistence(fs);
    const rides = freeRidesMod.freeRideResults();
    assert(rides.length === 1 && rides[0].crossings[0].wayId === 'Morning', 'the v1 cache loads, upgraded, into memory');
    assert(fs.files.get(freeRidesMod.FREE_RIDES_CACHE_FILE) === v1Text, 'no write at init: the v1 cache file is untouched on disk');
  } finally {
    freeRidesMod.resetFreeRides();
  }
});

// ---------------------------------------------------- 10. pick event + GPX+

test('migrations 10: a pre-WP-3 pick record still validates; a new one exports wayId/wayIds under gpx/2, never routeId= or gpx/1', () => {
  const legacyLine = JSON.stringify({
    kind: 'pick', tUnixMs: 1000, mode: 'route', routeId: 'Morning', routeIds: ['Morning'],
  }) + '\n';
  const legacyDecoded = decodeEventsFile(legacyLine);
  assert(legacyDecoded.nDropped === 0 && legacyDecoded.events.length === 1,
    'a pre-WP-3 pick record (unknown routeId/routeIds keys) still validates — unknown keys are ignored, not rejected');

  const newLine = JSON.stringify({
    kind: 'pick', tUnixMs: 2000, mode: 'route', wayId: 'Morning', wayIds: ['Morning', 'MorningB'],
  }) + '\n';
  const newDecoded = decodeEventsFile(newLine);
  assert(newDecoded.nDropped === 0 && newDecoded.events.length === 1, 'a new-shape pick record validates');

  const decodedRide: DecodedRide = {
    header: null,
    fixes: [{ kind: 'fix', lat: 51.0, lon: 4.0, tUnixMs: 2000 }],
    end: null,
    nDropped: 0,
  };
  const gpx = buildGpxPlus(decodedRide, newDecoded, 'test-ride');
  assert(gpx.includes('wayId="Morning"'), 'export carries the wayId attribute');
  assert(gpx.includes('wayIds="Morning MorningB"'), 'export carries the wayIds attribute, space-joined');
  assert(gpx.includes('xmlns:qf="https://qualifire.local/gpx/2"'), 'the namespace is bumped to gpx/2');
  assert(!gpx.includes('routeId='), 'the export never emits the old routeId= attribute');
  assert(!gpx.includes('gpx/1'), 'the export never emits the old gpx/1 namespace');
});

// --------------------------------------------- 11. legacy id-prefix predicate

test('migrations 11: isUserMintedWayId accepts BOTH legacy prefixes; label helpers work on a legacy route: id', () => {
  assert(isUserMintedWayId('route:x') && isUserMintedWayId('way:x'), 'both pre- and post-WP-3 mint prefixes count as user-minted');
  assert(!isUserMintedWayId('Morning'), 'a plain seed id is never user-minted');

  assert(wayVariantLabel('route:x', { startLandmarkId: 'home', endLandmarkId: 'work' }, ['Dry']) === 'Dry',
    'specs win over id-shape for a legacy route: id');

  const c = emptyCatalog();
  c.landmarks = [lm('home', 0, 0), lm('work', 0.2, 0.2)];
  c.routes = [{ id: 'home>work', startLandmarkId: 'home', endLandmarkId: 'work', wayIds: ['route:legacy1'] }];
  c.ways = [{ id: 'route:legacy1', routeId: 'home>work', refLineId: 'route:legacy1', gateSetVersion: 1, seeded: false, specs: ['Dry'] }];
  assert(wayLabelIn(c, 'route:legacy1') === 'home → work · Dry',
    `a legacy route: way with specs must label "From → To · Dry", got "${wayLabelIn(c, 'route:legacy1')}"`);
});

// ------------------------------------------------------------- 12. new mints

test('migrations 12: buildRouteCreationCatalog mints way:<rideId> for the variant and route:<rideId> for the base path', () => {
  const draft: RouteCreationDraft = {
    rideId: 'mig1',
    startedAtMs: 1000,
    start: { kind: 'new', landmarkId: 'startX', draft: lm('startX', 52.0, 4.0) },
    end: { kind: 'new', landmarkId: 'endX', draft: lm('endX', 52.1, 4.1) },
    loop: false,
    trackLengthM: 1000,
    matchedWayId: null,
    existingRouteId: null,
    sportId: null,
  };
  const built = buildRouteCreationCatalog(emptyCatalog(), draft, { start: 'Start', end: 'End' });
  assert(built.ways.length === 1 && built.ways[0].id === 'way:mig1' && built.ways[0].refLineId === 'way:mig1',
    'the new variant mints way:<rideId>, self-refLineId');
  assert(built.routes.length === 1 && built.routes[0].id === 'route:mig1',
    'the new base path mints route:<rideId>');
  assert(deepEqual(built.routes[0].wayIds, ['way:mig1']) && built.ways[0].routeId === 'route:mig1',
    'the two new ids link each other');
  assert(validateCatalog(built).length === 0, `the freshly-minted catalog must validate: ${validateCatalog(built).join('; ')}`);
});
