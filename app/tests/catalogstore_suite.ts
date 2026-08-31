/**
 * QA — cycle 025 (B-39 remainder): the runtime catalog store and the
 * empty-seed install path. Locks:
 *  1. boot with nothing added = the shipped seed, and NOTHING is written;
 *  2. a user catalog file merges in (seed first) and survives a re-init;
 *  3. an undecodable user file is ignored for the session and never
 *     overwritten (it is the only copy of the rider's own places);
 *  4. saveUserCatalog refuses a merged catalog that does not validate;
 *  5. the VIRGIN install (empty seed, nothing added): zero everything, no
 *     live candidates, the engine survives a ride start-to-finalize without
 *     a lock, every data-driven fallback answers null — nothing invented.
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { assert, test, loadFixture } from './lib.ts';
import { createMemoryFsAdapter } from '../src/storage/fsAdapter.ts';
import { emptyCatalog, validateCatalog } from '../src/store/catalog.ts';
import { defaultEndpoints, defaultMapRouteId, fallbackRouteId } from '../src/store/defaultRoute.ts';
import type { Catalog } from '../src/store/types.ts';

// Same bare-.json loader shim as resultsstore_suite.ts, same reason: the
// modules under test import the seed JSON directly (via store/seed.ts).
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const seedMod = await import('../src/store/seed.ts');
const store = await import('../src/store/catalogStore.ts');
const { catalogTrackSpecs } = await import('../src/live/tracks.ts');
const { LiveEngine } = await import('../src/live/engine.ts');

function userAddition(): Catalog {
  const c = emptyCatalog();
  c.landmarks = [
    { id: 'alpha', label: 'alpha', lat: 51.2, lon: 4.4, radiusM: 150, activeFromMs: 0, activeUntilMs: null, offerAtStart: true },
    { id: 'beta', label: 'beta', lat: 51.25, lon: 4.45, radiusM: 150, activeFromMs: 0, activeUntilMs: null, offerAtStart: true },
  ];
  c.ways = [{ id: 'alpha>beta', startLandmarkId: 'alpha', endLandmarkId: 'beta', routeIds: ['AlphaBeta'] }];
  c.routes = [{ id: 'AlphaBeta', wayId: 'alpha>beta', refLineId: 'AlphaBeta', gateSetVersion: 1, seeded: false }];
  c.gateSets = [{ routeId: 'AlphaBeta', version: 1, chainageM: [100, 1000, 2000, 3000, 3900], createdAtMs: 0 }];
  return c;
}

test('B-39 seed: under Node the seed mode is shipped; the empty mode is a real empty catalog and no ghosts', () => {
  assert(seedMod.SEED_MODE === 'shipped', `headless suite must run on the shipped seed, got ${seedMod.SEED_MODE}`);
  const shipped = seedMod.shippedCatalog();
  assert(shipped.routes.length === 20 && shipped.landmarks.length === 6 && shipped.ways.length === 13,
    `shipped seed is the ratified catalog (6/13/20), got ${shipped.landmarks.length}/${shipped.ways.length}/${shipped.routes.length}`);
  assert(seedMod.shippedResults().length > 0, 'shipped ghosts present');
  const empty = seedMod.catalogForSeedMode('empty');
  assert(empty.landmarks.length === 0 && empty.ways.length === 0 && empty.routes.length === 0 && empty.gateSets.length === 0,
    'empty seed mode: nothing at all');
  assert(validateCatalog(empty).length === 0, 'an empty catalog validates');
  assert(seedMod.resultsForSeedMode('empty').length === 0, 'empty seed mode: no ghosts');
  assert(JSON.stringify(seedMod.catalogForSeedMode('shipped')) === JSON.stringify(shipped), 'shipped mode is the shipped seed');
});

test('B-39 catalogStore: boot with nothing added = the shipped seed, byte for byte, and nothing is written', async () => {
  store.resetCatalogStoreForTests();
  try {
    const fs = createMemoryFsAdapter();
    const before = JSON.stringify(store.currentCatalog());
    assert(before === JSON.stringify(seedMod.shippedCatalog()), 'before init: the seed (synchronous readers see it at once)');
    const got = await store.initCatalogStore(fs);
    await store.flushCatalogWrites();
    assert(JSON.stringify(got) === before && JSON.stringify(store.currentCatalog()) === before,
      'after init with no user file: still exactly the seed');
    assert(fs.files.size === 0, `init must write nothing (the seed is never copied to disk), wrote ${[...fs.files.keys()].join(',')}`);
    assert(store.userCatalog().routes.length === 0, 'nothing added');
  } finally {
    store.resetCatalogStoreForTests();
  }
});

test('B-39 catalogStore: a user catalog file merges in (seed first), saveUserCatalog round-trips, re-init reproduces it', async () => {
  store.resetCatalogStoreForTests();
  try {
    const fs = createMemoryFsAdapter();
    await store.initCatalogStore(fs);
    const seedRoutes = store.currentCatalog().routes.length;
    const errs = await store.saveUserCatalog(userAddition());
    await store.flushCatalogWrites();
    assert(errs.length === 0, `save must accept a valid addition: ${errs.join('; ')}`);
    assert(store.currentCatalog().routes.length === seedRoutes + 1, 'merged catalog visible at once');
    assert(store.currentCatalog().routes[seedRoutes].id === 'AlphaBeta', 'user route appended AFTER the seed routes');
    assert(store.currentCatalog().routes[0].id === seedMod.shippedCatalog().routes[0].id, 'seed order intact');
    const text = fs.files.get(store.USER_CATALOG_FILE);
    assert(typeof text === 'string' && text.endsWith('\n'), 'the user file was written, newline-terminated');
    assert(JSON.stringify(JSON.parse(text!)) === JSON.stringify(userAddition()), 'the file holds ONLY the user catalog, never the seed');

    store.resetCatalogStoreForTests();
    assert(store.currentCatalog().routes.length === seedRoutes, 'reset drops the in-memory addition');
    await store.initCatalogStore(fs);
    assert(store.currentCatalog().routes.length === seedRoutes + 1 && store.userCatalog().landmarks.length === 2,
      're-init from the same fs reproduces the merged catalog');
    assert(fs.files.size === 1, 'init wrote nothing new');
  } finally {
    store.resetCatalogStoreForTests();
  }
});

test('B-39 catalogStore: an undecodable user file is ignored for the session and NEVER overwritten', async () => {
  store.resetCatalogStoreForTests();
  const origWarn = console.warn;
  console.warn = () => {};
  try {
    const fs = createMemoryFsAdapter();
    fs.files.set(store.USER_CATALOG_FILE, '{"landmarks": "not an array"');
    await store.initCatalogStore(fs);
    await store.flushCatalogWrites();
    assert(JSON.stringify(store.currentCatalog()) === JSON.stringify(seedMod.shippedCatalog()), 'runs on the seed alone');
    assert(fs.files.get(store.USER_CATALOG_FILE) === '{"landmarks": "not an array"', 'the corrupt file is left exactly as found');
    // A throwing adapter is the same story.
    const bad = createMemoryFsAdapter();
    bad.readText = async () => { throw new Error('disk'); };
    await store.initCatalogStore(bad);
    assert(JSON.stringify(store.currentCatalog()) === JSON.stringify(seedMod.shippedCatalog()) && bad.files.size === 0,
      'unreadable => seed alone, nothing written, no throw');
  } finally {
    console.warn = origWarn;
    store.resetCatalogStoreForTests();
  }
});

test('B-39 catalogStore: saveUserCatalog refuses an addition whose MERGED catalog does not validate — nothing changes, nothing is written', async () => {
  store.resetCatalogStoreForTests();
  try {
    const fs = createMemoryFsAdapter();
    await store.initCatalogStore(fs);
    const before = JSON.stringify(store.currentCatalog());
    // A landmark sitting on top of a seed landmark — the overlap error the
    // validator exists for (the 88-visit cluster), now guarding user input.
    const seedHome = seedMod.shippedCatalog().landmarks[0];
    const overlap = userAddition();
    overlap.landmarks.push({ ...seedHome, id: 'home2', label: 'home again' });
    const errs = await store.saveUserCatalog(overlap);
    await store.flushCatalogWrites();
    assert(errs.length > 0 && errs.some((e) => e.includes('overlap')), `expected an overlap error, got ${JSON.stringify(errs)}`);
    assert(JSON.stringify(store.currentCatalog()) === before, 'refused: the live catalog is untouched');
    assert(fs.files.size === 0, 'refused: nothing written');
    // Dangling references are refused too.
    const dangling = userAddition();
    dangling.routes[0].wayId = 'nowhere';
    const errs2 = await store.saveUserCatalog(dangling);
    assert(errs2.some((e) => e.includes('unknown way')), `expected an unknown-way error, got ${JSON.stringify(errs2)}`);
    assert(JSON.stringify(store.currentCatalog()) === before && fs.files.size === 0, 'refused again: untouched, unwritten');
  } finally {
    store.resetCatalogStoreForTests();
  }
});

test('B-39 VIRGIN install: empty seed + nothing added => zero catalog, zero live candidates, engine survives a ride unlocked, every fallback null', async () => {
  store.resetCatalogStoreForTests(emptyCatalog());
  try {
    const fs = createMemoryFsAdapter();
    const c = await store.initCatalogStore(fs);
    assert(c.landmarks.length === 0 && c.ways.length === 0 && c.routes.length === 0 && c.gateSets.length === 0,
      'the virgin catalog is empty');
    assert(fs.files.size === 0, 'nothing written on a virgin boot');
    assert(catalogTrackSpecs().length === 0, 'no catalog routes => no live candidates (and no throw)');
    assert(fallbackRouteId(c, []) === null, 'Result fallback route: null');
    assert(defaultMapRouteId(c, () => true) === null, 'map fallback route: null even though the manifest is bundled');
    const ends = defaultEndpoints(c);
    assert(ends.from === null && ends.to === null, 'RecordScreen defaults: null/null => new>>new');

    // The module-scope engine shape: NO injected specs, resolved at start().
    const f = loadFixture('clean_morning');
    for (const mode of ['route', 'free'] as const) {
      const engine = new LiveEngine();
      engine.start(mode === 'free' ? { mode: 'free', routeIds: null } : undefined);
      for (let i = 0; i < f.fixes.t.length; i += 10) {
        engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
      }
      engine.finalize();
      const st = engine.getState();
      assert(st.track === null && st.lap === null, `${mode}: a real Morning ride on an empty catalog locks nothing, scores nothing`);
      assert(st.gateFires === 0, `${mode}: no gate can fire with no candidates`);
      assert(st.fixesFed > 0, `${mode}: fixes were still counted (the ride records; D-023)`);
    }
  } finally {
    store.resetCatalogStoreForTests();
    assert(catalogTrackSpecs().length === 20, 'restored: the shipped seed is back for every later suite');
  }
});

test('item-2 fix: a decodable-but-malformed catalog.user.json no longer throws out of initCatalogStore — seed only, file untouched', async () => {
  store.resetCatalogStoreForTests();
  const origWarn = console.warn;
  console.warn = () => {};
  try {
    const fs = createMemoryFsAdapter();
    const malformed = '{"schemaVersion":1,"landmarks":[null],"ways":[],"routes":[],"gateSets":[]}';
    fs.files.set(store.USER_CATALOG_FILE, malformed);
    // Before the fix this REJECTED (TypeError inside mergeCatalogs — the
    // recompute() sat outside the try) and App.tsx's boot chain silently
    // skipped initRideHistory. Now: same posture as an undecodable file.
    const got = await store.initCatalogStore(fs);
    await store.flushCatalogWrites();
    assert(JSON.stringify(got) === JSON.stringify(seedMod.shippedCatalog()), 'runs on the seed alone');
    assert(store.userCatalog().landmarks.length === 0, 'the malformed additions are not trusted');
    assert(fs.files.get(store.USER_CATALOG_FILE) === malformed,
      "left exactly as found (it is the only copy of the rider's places)");
  } finally {
    console.warn = origWarn;
    store.resetCatalogStoreForTests();
  }
});

test('item-2 seam: a virgin ride drafts, gets named, and saveUserCatalog lands it on disk with the reference ride marked', async () => {
  store.resetCatalogStoreForTests(emptyCatalog());
  try {
    const fs = createMemoryFsAdapter();
    await store.initCatalogStore(fs);
    const wc = await import('../src/store/wayCreation.ts');
    const fixes = Array.from({ length: 20 }, (_, i) => ({ lat: 50.87 + i * 0.001, lon: 4.7 }));
    const draft = wc.draftWayCreation(store.currentCatalog(), { rideId: 'ride-e2e', startedAtMs: 123, fixes });
    assert(draft !== null, 'virgin catalog: an unmatched ride drafts');
    const built = wc.buildWayCreationCatalog(store.userCatalog(), draft!, { start: 'Home', end: 'Work' });
    const errs = await store.saveUserCatalog(built);
    await store.flushCatalogWrites();
    assert(errs.length === 0, `saveUserCatalog must accept the built catalog: ${errs.join('; ')}`);
    assert(typeof fs.files.get(store.USER_CATALOG_FILE) === 'string', 'catalog.user.json written');
    const r = store.currentCatalog().routes[0];
    assert(r !== undefined && r.referenceRideId === 'ride-e2e', 'the ride just recorded IS the reference (COLD-START §3 step 9)');
    // Survives a re-boot from the same disk.
    store.resetCatalogStoreForTests(emptyCatalog());
    await store.initCatalogStore(fs);
    assert(store.currentCatalog().routes[0]?.referenceRideId === 'ride-e2e', 'reference designation survives re-init');
    assert(store.currentCatalog().landmarks.length === 2 && store.currentCatalog().ways.length === 1
      && store.currentCatalog().gateSets.length === 1, 'landmarks/way/gates all round-trip');
  } finally {
    store.resetCatalogStoreForTests();
  }
});
