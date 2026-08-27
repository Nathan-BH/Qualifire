/**
 * Catalog + results-store suite (product/DATA-MODEL.md).
 *
 * Two things this suite exists to lock:
 *  1. the structural failures the archive actually produced — overlapping
 *     landmark discs (the 88-visit cluster merged two places 141 m apart),
 *     loops without a discriminator, gate sets that are not monotonic;
 *  2. the colour-model independence claim: the SAME stored history must feed
 *     D-007/D-008's rolling-day window and IDEAS §19's last-N window, with no
 *     tier or colour anywhere in the store.
 */
import * as path from 'node:path';
import {
  analyzeOffline, assert, FIXTURES_DIR, loadFixture, loadJson, numEq, refFor, test, TESTS_DIR,
} from './lib.ts';
import {
  CORRIDOR_M, PROPOSED_GATES, gateChainages, nearestOnSegments, toXY,
} from '../core/src/index.ts';
import { deriveRideResult } from '../src/store/derive.ts';
import { fallbackRouteId, routeLabel } from '../src/store/defaultRoute.ts';
import {
  addGateSet,
  decodeCatalog,
  emptyCatalog,
  encodeCatalog,
  freeRideRouteIds,
  gateSetFor,
  landmarkAt,
  lapsComparable,
  metresBetween,
  needsRoutePick,
  routesForWay,
  sectorsComparable,
  startableLandmarks,
  validateCatalog,
  waysFrom,
} from '../src/store/catalog.ts';
import {
  emptyResultsIndex,
  isStale,
  positionLabel,
  ranks,
  rebuildIndex,
  sectorHistory,
  tower,
  upsertResult,
  windowByDays,
  windowLastN,
} from '../src/store/results.ts';
import type { Catalog, RideResult } from '../src/store/types.ts';
import { projectToPixel, type RouteAsset } from '../src/ui/routeMapMath.ts';
import { RESULT_SCHEMA_VERSION } from '../src/store/types.ts';

const DAY = 86400_000;
const APR2026 = Date.UTC(2026, 3, 13);
const AUG2026 = Date.UTC(2026, 7, 16);

/** The ratified landmark set (data/analysis/landmarks_v1.json), abridged. */
function baseCatalog(): Catalog {
  const c = emptyCatalog();
  c.landmarks = [
    { id: 'home', label: 'home', lat: 50.8365, lon: 4.6382, radiusM: 120,
      activeFromMs: APR2026, activeUntilMs: null, offerAtStart: true },
    { id: 'work', label: 'work', lat: 50.8635, lon: 4.6883, radiusM: 130,
      activeFromMs: 0, activeUntilMs: null, offerAtStart: true },
    // dormant: Nathan moved away in April 2026 — seeds history, never offered
    { id: 'puttestraat', label: 'family home', lat: 50.822078, lon: 4.505119, radiusM: 120,
      activeFromMs: 0, activeUntilMs: APR2026, offerAtStart: false },
  ];
  c.ways = [
    { id: 'home>work', startLandmarkId: 'home', endLandmarkId: 'work', routeIds: ['MorningA', 'MorningB'] },
    { id: 'work>home', startLandmarkId: 'work', endLandmarkId: 'home', routeIds: ['EveningA'] },
  ];
  c.routes = [
    { id: 'MorningA', wayId: 'home>work', refLineId: 'Morning', gateSetVersion: 1, seeded: true },
    { id: 'MorningB', wayId: 'home>work', refLineId: 'EveningB', gateSetVersion: 1, seeded: false },
    { id: 'EveningA', wayId: 'work>home', refLineId: 'EveningA', gateSetVersion: 1, seeded: true },
  ];
  c.gateSets = [
    { routeId: 'MorningA', version: 1, chainageM: [160, 1500, 3000, 4400, 5650], createdAtMs: 0 },
    { routeId: 'MorningB', version: 1, chainageM: [160, 1600, 3100, 4500, 5780], createdAtMs: 0 },
    { routeId: 'EveningA', version: 1, chainageM: [160, 1500, 3000, 4400, 5650], createdAtMs: 0 },
  ];
  return c;
}

function mkResult(o: Partial<RideResult> & { rideId: string; startedAtMs: number }): RideResult {
  return {
    kind: 'rideResult',
    schemaVersion: RESULT_SCHEMA_VERSION,
    routeId: 'MorningA',
    source: 'app',
    lap: { rawS: 900, movingS: 880, quality: 'clean' },
    sectors: [
      { index: 1, fromChainageM: 160, toChainageM: 1500, rawS: 220, movingS: 210, quality: 'clean' },
      { index: 2, fromChainageM: 1500, toChainageM: 3000, rawS: 240, movingS: 235, quality: 'clean' },
    ],
    derivedBy: { engineVersion: 'e1', gateSetVersion: 1, resultSchemaVersion: RESULT_SCHEMA_VERSION },
    ...o,
  };
}

// ------------------------------------------------------------------ catalog

test('store: the ratified catalog validates clean', () => {
  assert(validateCatalog(baseCatalog()).length === 0, 'base catalog should be valid');
});

test('store: overlapping landmark discs are an ERROR (the 88-cluster failure)', () => {
  const c = baseCatalog();
  // The two real places inside that cluster: 141 m apart. At the measured
  // radii they overlap, and the model must refuse rather than merge them.
  c.landmarks.push(
    { id: 'bikespot', label: 'old bike spot', lat: 50.86982, lon: 4.69003, radiusM: 120,
      activeFromMs: 0, activeUntilMs: Date.UTC(2025, 9, 25), offerAtStart: false },
    // Nathan's own pin for the old flat / Carrefour corner — 141 m from the
    // bike spot, i.e. inside a single 150 m cluster but two distinct places.
    { id: 'carrefour', label: 'Carrefour', lat: 50.87031, lon: 4.69189, radiusM: 120,
      activeFromMs: 0, activeUntilMs: null, offerAtStart: false },
  );
  const d = metresBetween(c.landmarks[3], c.landmarks[4]);
  assert(d > 130 && d < 155, `expected ~141 m between the two places, got ${d.toFixed(0)}`);
  const errs = validateCatalog(c);
  assert(errs.some((e) => e.includes('overlap')), `expected an overlap error, got ${errs}`);
});

test('store: a loop way without a discriminator is rejected', () => {
  const c = baseCatalog();
  c.ways.push({ id: 'putt-loop', startLandmarkId: 'puttestraat', endLandmarkId: 'puttestraat',
    routeIds: ['MorningA'] });
  assert(validateCatalog(c).some((e) => e.includes('loopDiscriminator')), 'loop must need a label');
  c.ways[c.ways.length - 1].loopDiscriminator = 'north';
  assert(validateCatalog(c).length === 0, 'discriminated loop should validate');
});

test('store: gate chainage must strictly increase, and routes need their version', () => {
  const c = baseCatalog();
  c.gateSets[0].chainageM = [160, 1500, 1500, 4400, 5650];
  assert(validateCatalog(c).some((e) => e.includes('not increasing')), 'must catch flat chainage');
  const c2 = baseCatalog();
  c2.routes[0].gateSetVersion = 7;
  assert(validateCatalog(c2).some((e) => e.includes('no gate set')), 'must catch missing version');
});

test('store: dormant landmarks seed history but are never offered at START', () => {
  const c = baseCatalog();
  const ids = startableLandmarks(c, AUG2026).map((l) => l.id).sort();
  assert(JSON.stringify(ids) === JSON.stringify(['home', 'work']),
    `expected home+work only, got ${ids}`);
  // and no way may be offered INTO a place he no longer goes
  c.ways.push({ id: 'home>putt', startLandmarkId: 'home', endLandmarkId: 'puttestraat',
    routeIds: ['MorningA'] });
  assert(waysFrom(c, 'home', AUG2026).length === 1, 'dormant destination must not be offered');
});

test('store: landmarkAt picks the containing landmark, and respects the era', () => {
  const c = baseCatalog();
  const atPutt = { lat: 50.822078, lon: 4.505119 };
  assert(landmarkAt(c, atPutt)?.id === 'puttestraat', 'should match with no time filter');
  assert(landmarkAt(c, atPutt, AUG2026) === null, 'must not match after the era ended');
  assert(landmarkAt(c, { lat: 50.85, lon: 4.60 }) === null, 'open field matches nothing');
});

test('store: a way with two routes needs a route pick at START (§8a)', () => {
  const c = baseCatalog();
  assert(needsRoutePick(c, 'home>work'), 'two routes ⇒ pick');
  assert(!needsRoutePick(c, 'work>home'), 'single route ⇒ no extra step');
  assert(routesForWay(c, 'home>work').length === 2, 'two routes on the way');
});

test('store: freeRideRouteIds — WP-B coordinator addendum directional filter', () => {
  const c = baseCatalog();
  // outbound from a known origin (home >> new): only home>work's own routeIds
  assert(
    JSON.stringify(freeRideRouteIds(c, 'home', null)) === JSON.stringify(['MorningA', 'MorningB']),
    'from=home,to=null must give home>work\'s own routeIds only',
  );
  // inbound to a known destination (new >> home): only work>home's own routeIds
  assert(
    JSON.stringify(freeRideRouteIds(c, null, 'home')) === JSON.stringify(['EveningA']),
    'from=null,to=home must give work>home\'s own routeIds only',
  );
  // both ends unknown (new >> new): NO filtering, deliberately (Nathan's
  // deferred-for-later case) — null, not an empty array.
  assert(freeRideRouteIds(c, null, null) === null, 'both ends unknown must return null (unfiltered)');
  // a landmark with no ways running that direction ⇒ an empty filter, never null
  assert(
    JSON.stringify(freeRideRouteIds(c, 'puttestraat', null)) === JSON.stringify([]),
    'a landmark with no outbound ways must yield an empty filter, not null',
  );
  // both ends known is not a real free-ride case; defensively unfiltered
  assert(freeRideRouteIds(c, 'home', 'work') === null, 'both ends known is defensively unfiltered');
});

test('store: a MIDDLE-gate move keeps laps comparable; an END move does not', () => {
  const c0 = baseCatalog();
  const v1 = gateSetFor(c0, 'MorningA', 1)!;
  const middle = { routeId: 'MorningA', version: 2, chainageM: [160, 1450, 3050, 4400, 5650],
    createdAtMs: 1, note: 'sector boundary nudged' };
  const c1 = addGateSet(c0, middle);
  assert(c1.routes.find((r) => r.id === 'MorningA')!.gateSetVersion === 2, 'route follows the new version');
  assert(gateSetFor(c1, 'MorningA', 1) !== null, 'old version is kept, never deleted');
  assert(lapsComparable(v1, middle), 'same start+finish ⇒ laps still comparable');
  assert(!sectorsComparable(v1, middle), 'moved boundary ⇒ sectors incomparable');
  // IDEAS §22: moving the finish gate closer to the door breaks laps
  const ends = { routeId: 'MorningA', version: 3, chainageM: [40, 1500, 3000, 4400, 5900],
    createdAtMs: 2, note: '§22 — gates closer to the true start/finish' };
  assert(!lapsComparable(v1, ends), 'end move ⇒ lap history breaks');
});

test('store: catalog round-trips through encode/decode; garbage decodes to null', () => {
  const c = baseCatalog();
  const back = decodeCatalog(encodeCatalog(c));
  assert(back !== null && JSON.stringify(back) === JSON.stringify(c), 'round trip must be exact');
  assert(decodeCatalog('{oops') === null && decodeCatalog('{"schemaVersion":1}') === null,
    'unusable text must decode to null, not a half-catalog');
});

// ------------------------------------------------------------------ results

test('store: the index is a rebuildable cache, ordered by start time', () => {
  const rs = [
    mkResult({ rideId: 'c', startedAtMs: 300 }),
    mkResult({ rideId: 'a', startedAtMs: 100 }),
    mkResult({ rideId: 'b', startedAtMs: 200 }),
  ];
  const idx = rebuildIndex(rs);
  assert(idx.entries.map((e) => e.rideId).join('') === 'abc', 'must be time-ordered');
  // wiping and rebuilding must reproduce it exactly — nothing lives only here
  const wiped = rebuildIndex([]);
  assert(wiped.entries.length === 0, 'wipe clears');
  assert(JSON.stringify(rebuildIndex(rs)) === JSON.stringify(idx), 'rebuild is deterministic');
  // upsert replaces rather than duplicating
  const again = upsertResult(idx, mkResult({ rideId: 'b', startedAtMs: 250 }));
  assert(again.entries.length === 3 && again.entries[2].rideId === 'c', 'replaced in place');
  // a ride that matched no route leaves no entry (D-025: uncoloured, unranked)
  const noRoute = upsertResult(idx, mkResult({ rideId: 'a', startedAtMs: 100, routeId: null }));
  assert(!noRoute.entries.some((e) => e.rideId === 'a'), 'unmatched ride must not enter the index');
});

test('store: ONE history feeds both window shapes (the colour-agnostic claim)', () => {
  const now = 1_000 * DAY;
  let idx = emptyResultsIndex();
  // 12 rides on MorningA, one every 3 days; plus one on another route
  for (let i = 0; i < 12; i++) {
    idx = upsertResult(idx, mkResult({ rideId: `m${i}`, startedAtMs: now - (11 - i) * 3 * DAY }));
  }
  idx = upsertResult(idx, mkResult({ rideId: 'other', startedAtMs: now - DAY, routeId: 'EveningA' }));

  const d28 = windowByDays(idx, 'MorningA', now, 28);      // D-007/D-008 shape
  const lastN = windowLastN(idx, 'MorningA', now, 10);     // IDEAS §19/§21 shape
  assert(d28.every((e) => e.routeId === 'MorningA'), 'never mixes routes');
  assert(d28.length === 10, `28 days at one ride/3 days ⇒ 10, got ${d28.length}`);
  assert(lastN.length === 10 && lastN[9].rideId === 'm11', 'last-N takes the tail');
  assert(windowLastN(idx, 'MorningA', now, 20).length === 12, 'fewer than N returns what exists');
  assert(windowByDays(idx, 'MorningA', now - 40 * DAY, 28).length === 0, 'window respects "now"');
  // the point: same entries, no tier stored anywhere
  const stored = JSON.stringify(idx);
  assert(!/tier|colour|color|green|purple/i.test(stored), 'the store must hold no colour concept');
});

test('store: stale results are detected by derivedBy, not patched', () => {
  const r = mkResult({ rideId: 'x', startedAtMs: 1 });
  assert(!isStale(r, 'e1', 1), 'matching derivation is fresh');
  assert(isStale(r, 'e2', 1), 'engine change ⇒ stale');
  assert(isStale(r, 'e1', 2), 'gate-set change ⇒ stale');
});

test('store: tower ranking honours D-028 (estimated never ranks, ghosts marked)', () => {
  const rs = [
    mkResult({ rideId: 'fast', startedAtMs: 1, lap: { rawS: 870, movingS: 850, quality: 'clean' } }),
    mkResult({ rideId: 'seed', startedAtMs: 2, source: 'archive',
      lap: { rawS: 890, movingS: 860, quality: 'clean' } }),
    mkResult({ rideId: 'inter', startedAtMs: 3,
      lap: { rawS: 990, movingS: 900, quality: 'interrupted' } }),
    mkResult({ rideId: 'est', startedAtMs: 4,
      lap: { rawS: 800, movingS: null, quality: 'estimated' } }),
    mkResult({ rideId: 'demoted', startedAtMs: 5, source: 'archive', tripwireDemoted: true,
      lap: { rawS: 700, movingS: 690, quality: 'clean' } }),
  ];
  const rows = tower(rs);
  const byId = new Map(rows.map((r) => [r.rideId, r]));
  assert(byId.get('fast')!.position === 1, 'fastest is P1');
  assert(byId.get('seed')!.position === 2 && byId.get('seed')!.ghost, 'seeds rank as ghosts');
  assert(byId.get('inter')!.position === 3 && byId.get('inter')!.interrupted, 'interrupted ranks');
  assert(byId.get('est')!.position === null, 'estimated never ranks — even though it is quickest raw');
  assert(byId.get('demoted')!.position === null, 'tripwire-demoted seed is unranked despite 690 s');
  assert(!ranks(rs[3]) && !ranks(rs[4]), 'ranks() agrees');
  assert(positionLabel(rows, 'inter') === 'P3', 'live chip label');
  assert(positionLabel(rows, 'est') === null, 'no fake rank for an unrankable lap');
  assert(positionLabel(rows, 'nope') === null, 'unknown ride ⇒ no chip');
});

// ------------------------------------------------------- derive + real seed

test('store: the seeded catalog (ratified landmarks + D-016 gates) validates', () => {
  const seed = loadJson<Catalog>(path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  const errs = validateCatalog(seed);
  assert(errs.length === 0, `seed catalog invalid: ${errs.join(' | ')}`);
  assert(seed.landmarks.length === 6, 'six ratified landmarks');
  // dormant family home is seeded but never offered (Nathan, 2026-08-16)
  const putt = seed.landmarks.find((l) => l.id === 'puttestraat')!;
  assert(!putt.offerAtStart && putt.activeUntilMs !== null, 'family home must be dormant');
  assert(startableLandmarks(seed, AUG2026).length === 5, 'five offerable places today');
  assert(needsRoutePick(seed, 'work>home'), 'Evening A/B ⇒ the way needs a route pick');
  assert(needsRoutePick(seed, 'home>work'), 'home>work now has two catalog routes (Morning, MorningB — MorningB is a cold-start candidate, not yet ratified) — needs a route pick');
});

test('store: derive rebuilds a real ride from raw fixes and matches the offline pipeline', () => {
  const fx = loadFixture('clean_morning');
  const seed = loadJson<Catalog>(path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  const gates = gateSetFor(seed, 'Morning')!.chainageM;
  const res = deriveRideResult({
    rideId: 'clean_morning', t: fx.fixes.t, lat: fx.fixes.lat, lon: fx.fixes.lon,
    ref: refFor('Morning'), gates, routeId: 'Morning', gateSetVersion: 1, engineVersion: 'e1',
  });
  const oracle = analyzeOffline(fx.fixes, refFor('Morning'), 'Morning');
  assert(res.sectors.length === oracle.length, 'same sector count as the parity pipeline');
  for (const s of res.sectors) {
    const o = oracle[s.index - 1];
    assert(numEq(s.rawS, o.rawS, 1e-6), `sector ${s.index} raw differs from the engine`);
    if (s.quality === 'clean' || s.quality === 'interrupted') {
      assert(numEq(s.movingS, o.movingS, 1e-6), `sector ${s.index} moving differs`);
    }
  }
  // a clean ride must produce a rankable lap with real moving time
  assert(res.lap.quality === 'clean' || res.lap.quality === 'interrupted', 'clean ride ⇒ real lap');
  assert(res.lap.movingS !== null && res.lap.movingS <= res.lap.rawS, 'moving ≤ raw');
  assert(ranks(res), 'a clean derived lap ranks');
  assert(res.derivedBy.resultSchemaVersion === RESULT_SCHEMA_VERSION, 'stamped for staleness checks');
});

test('store: the real 237 s-gap ride derives dirty and never ranks', () => {
  const fx = loadFixture('gap_20260521');
  const seed = loadJson<Catalog>(path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  const track = fx.track as 'Morning' | 'EveningA' | 'EveningB';
  const res = deriveRideResult({
    rideId: 'gap', t: fx.fixes.t, lat: fx.fixes.lat, lon: fx.fixes.lon, ref: refFor(track),
    gates: gateSetFor(seed, track)!.chainageM, routeId: track, gateSetVersion: 1, engineVersion: 'e1',
  });
  // Offline, this ride's gap surfaces as an OFF-CORRIDOR sector, not an
  // interpolated one — core flags sector 3 excluded_offroute — so the honest
  // mapping is 'missed'. (The live layer calls it estimated because the gate
  // fires under the D-016(a) re-acquisition rule; the two views disagree by
  // design and both refuse to colour it.)
  const dirty = res.sectors.filter((s) => s.quality === 'missed' || s.quality === 'estimated');
  assert(dirty.length > 0, 'the gap must leave at least one sector unscorable');
  assert(dirty.every((s) => s.movingS === null), 'a dirty sector never carries moving time');
  assert(res.lap.movingS === null && !ranks(res), 'a dirty lap never ranks (D-028)');
});

test('store: offline never invents "estimated"; a punched gap reads as off-corridor', () => {
  const fx = loadFixture('clean_morning');
  const seed = loadJson<Catalog>(path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  const gates = gateSetFor(seed, 'Morning')!.chainageM;
  const base = { ref: refFor('Morning'), gates, routeId: 'Morning', gateSetVersion: 1,
    engineVersion: 'e1' } as const;
  const clean = deriveRideResult({ rideId: 'c', t: fx.fixes.t, lat: fx.fixes.lat,
    lon: fx.fixes.lon, ...base });
  assert(clean.sectors.every((s) => s.quality === 'clean' || s.quality === 'interrupted'),
    'baseline ride is fully scored');

  // Punch a 90 s hole into sector 2. The projector's forward window cannot skip
  // it, so core flags the sector off-corridor — offline it is 'missed', NOT an
  // interpolated 'estimated'. This is the behaviour, not a bug: nothing is
  // coloured either way, and offline refuses to guess where he was.
  const oracle = analyzeOffline(fx.fixes, refFor('Morning'), 'Morning')[1];
  const cut0 = (oracle.tA as number) + 30;
  const keep = [...fx.fixes.t.keys()].filter((i) => !(fx.fixes.t[i] > cut0 && fx.fixes.t[i] < cut0 + 90));
  const holed = deriveRideResult({ rideId: 'holed', t: keep.map((i) => fx.fixes.t[i]),
    lat: keep.map((i) => fx.fixes.lat[i]), lon: keep.map((i) => fx.fixes.lon[i]), ...base });
  assert(holed.sectors[1].quality === 'missed', `expected missed, got ${holed.sectors[1].quality}`);
  assert(holed.sectors[1].movingS === null && !ranks(holed), 'and it never ranks');
});

test('store: an estimated sector handed in by the live layer stays raw-only', () => {
  const fx = loadFixture('clean_morning');
  const seed = loadJson<Catalog>(path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  const gates = gateSetFor(seed, 'Morning')!.chainageM;
  const res = deriveRideResult({
    rideId: 'live-est', t: fx.fixes.t, lat: fx.fixes.lat, lon: fx.fixes.lon, ref: refFor('Morning'),
    gates, routeId: 'Morning', gateSetVersion: 1, engineVersion: 'e1',
    estimatedSectors: [2],   // as the live detector would report it (D-016(a))
  });
  const hit = res.sectors.find((s) => s.index === 2)!;
  assert(hit.quality === 'estimated', `expected estimated, got ${hit.quality}`);
  assert(hit.movingS === null && hit.rawS > 0, 'estimated ⇒ raw only, never moving');
  assert(res.lap.quality === 'estimated' && res.lap.movingS === null, 'dirty sector ⇒ dirty lap');
  assert(!ranks(res), 'an estimated lap never ranks (D-028)');
});

test('store: the archive ghost seed ranks, and a live lap places against it', () => {
  const seeds = loadJson<RideResult[]>(
    path.join(TESTS_DIR, '..', 'src', 'store', 'results.seed.json'));
  assert(seeds.length >= 25, `expected ~30 seeded rides, got ${seeds.length}`);
  assert(seeds.every((r) => r.source === 'archive'), 'every seed is an archive ghost (D-018)');
  assert(seeds.every((r) => r.derivedBy.resultSchemaVersion === RESULT_SCHEMA_VERSION),
    'seeds are stamped, so an engine change marks them stale rather than silently wrong');

  for (const routeId of ['Morning', 'EveningA', 'EveningB']) {
    const mine = seeds.filter((r) => r.routeId === routeId);
    assert(mine.length > 0, `no seeds for ${routeId}`);
    const rows = tower(mine);
    const ranked = rows.filter((r) => r.position !== null);
    assert(ranked.length >= 5, `${routeId}: too few rankable ghosts (${ranked.length})`);
    assert(ranked.every((r) => r.ghost), 'seeded laps rank as MARKED ghosts, never as plain rows');
    assert(ranked[0].position === 1 && ranked[0].movingS <= ranked[ranked.length - 1].movingS,
      `${routeId}: pole must be the fastest`);
    // sane e-bike commute laps: 8–40 min of moving time
    assert(ranked.every((r) => r.movingS > 480 && r.movingS < 2400),
      `${routeId}: implausible seeded lap time`);
    // Monday's point: a live lap slots in among them and gets a real position.
    const pole = ranked[0].movingS;
    const hot = mkResult({ rideId: 'today', startedAtMs: Date.now(), routeId,
      lap: { rawS: pole - 5, movingS: pole - 10, quality: 'clean' } });
    const withToday = tower([...mine, hot]);
    assert(positionLabel(withToday, 'today') === 'P1', 'beating the ghost pole ⇒ P1');
    const slow = mkResult({ rideId: 'slow', startedAtMs: Date.now(), routeId,
      lap: { rawS: 9999, movingS: 9999, quality: 'clean' } });
    const last = tower([...mine, slow]);
    assert(positionLabel(last, 'slow') === `P${ranked.length + 1}`, 'a slow lap places last, not nowhere');
  }
});

test('store: sector history drops dirty sectors before any benchmark sees them', () => {
  const rs = [
    mkResult({ rideId: 'a', startedAtMs: 1 }),
    mkResult({ rideId: 'b', startedAtMs: 2, sectors: [
      { index: 1, fromChainageM: 160, toChainageM: 1500, rawS: 260, movingS: null, quality: 'estimated' },
      { index: 2, fromChainageM: 1500, toChainageM: 3000, rawS: 250, movingS: 245, quality: 'interrupted' },
    ] }),
    mkResult({ rideId: 'c', startedAtMs: 3, sectors: [
      { index: 1, fromChainageM: 160, toChainageM: 1500, rawS: 999, movingS: null, quality: 'missed' },
      { index: 2, fromChainageM: 1500, toChainageM: 3000, rawS: 230, movingS: 228, quality: 'clean' },
    ] }),
  ];
  assert(JSON.stringify(sectorHistory(rs, 1)) === JSON.stringify([210]),
    'only the clean sector-1 time survives');
  assert(JSON.stringify(sectorHistory(rs, 2)) === JSON.stringify([235, 245, 228]),
    'interrupted sectors keep their moving time and do count');
});

// --------------------------------------------------- WP-D1 (cycle 024, 2026-08-20)

test('store: every seed route\'s refLineId resolves in refs.json and fits its gate set', () => {
  const seed = loadJson<Catalog>(path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  assert(validateCatalog(seed).length === 0, 'seed catalog must validate clean');
  assert(seed.routes.length === 20, `expected 20 catalog routes, got ${seed.routes.length}`);
  const refsFile = loadJson<{ tracks: Record<string, { length: number }> }>(
    path.join(FIXTURES_DIR, 'refs.json'));
  for (const route of seed.routes) {
    const track = refsFile.tracks[route.refLineId];
    assert(track !== undefined, `refs.json is missing track ${route.refLineId} (route ${route.id})`);
    const gs = gateSetFor(seed, route.id, route.gateSetVersion);
    assert(gs !== null, `route ${route.id}: no gate set at version ${route.gateSetVersion}`);
    const chain = gs!.chainageM;
    assert(chain[0] > 0, `route ${route.id}: first gate chainage must be > 0`);
    assert(chain[chain.length - 1] < track.length,
      `route ${route.id}: last gate ${chain[chain.length - 1]} m must be < ref length ${track.length} m`);
  }
});

test('catalog: station>home offers two routes (s>>h-w promotion, 2026-08-20)', () => {
  const seed = loadJson<Catalog>(path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  const way = seed.ways.find((w) => w.id === 'station>home')!;
  assert(way.routeIds.includes('StationHomeWet'), 'station>home must offer StationHomeWet');
  assert(needsRoutePick(seed, 'station>home'), 'two routes on station>home ⇒ a route pick is needed');
});

test('refs: StationHomeWet line sanity (s>>h-w promotion, 2026-08-20)', () => {
  const refsFile = loadJson<{ tracks: Record<string, { length: number; medoid: string }> }>(
    path.join(FIXTURES_DIR, 'refs.json'));
  const track = refsFile.tracks.StationHomeWet;
  assert(track !== undefined, 'refs.json must hold a StationHomeWet track');
  assert(track.length > 8650 && track.length < 8800,
    `StationHomeWet length ${track.length} m out of the expected [8650, 8800] range`);
  assert(track.medoid.includes('qualifire-20260819-2025'),
    `StationHomeWet must be built from Nathan's ride 3, got medoid=${track.medoid}`);

  const seed = loadJson<Catalog>(path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  const gs = gateSetFor(seed, 'StationHomeWet', 1)!;
  const chain = gs.chainageM;
  assert(chain.length === 5, 'StationHomeWet v1 must hold five placeholder gates');
  for (let i = 1; i < chain.length; i++) {
    assert(chain[i] > chain[i - 1], `StationHomeWet gate chainage must strictly increase at index ${i}`);
  }
  const firstFrac = chain[0] / track.length;
  const lastFrac = chain[chain.length - 1] / track.length;
  assert(Math.abs(firstFrac - 0.03) < 0.005, `first gate fraction ${firstFrac} not within 3% ±0.5%`);
  assert(Math.abs(lastFrac - 0.97) < 0.005, `last gate fraction ${lastFrac} not within 97% ±0.5%`);
});

test('refs: MorningB is the promoted 2026-08-19 ride (h>>w-w promotion, 2026-08-20)', () => {
  const refsFile = loadJson<{ tracks: Record<string, { length: number; medoid: string }> }>(
    path.join(FIXTURES_DIR, 'refs.json'));
  const track = refsFile.tracks.MorningB;
  assert(track !== undefined, 'refs.json must hold a MorningB track');
  assert(track.medoid.includes('qualifire-20260819-1155'),
    `MorningB must be built from Nathan's ride 1, got medoid=${track.medoid}`);
  assert(track.length > 5900 && track.length < 6000,
    `MorningB length ${track.length} m out of the expected [5900, 6000] range`);

  const seed = loadJson<Catalog>(path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  const route = seed.routes.find((r) => r.id === 'MorningB')!;
  assert(route.gateSetVersion === 2, `MorningB route must point at gate set v2, got v${route.gateSetVersion}`);
  assert(gateSetFor(seed, 'MorningB', 1) !== null, 'MorningB gate set v1 must be retained (history is never deleted)');
  const v2 = gateSetFor(seed, 'MorningB', 2);
  assert(v2 !== null, 'MorningB gate set v2 must exist');
  const chain = v2!.chainageM;
  assert(chain.length === 5, 'MorningB v2 must hold five gates');
  for (let i = 1; i < chain.length; i++) {
    assert(chain[i] > chain[i - 1], `MorningB v2 chainage must strictly increase at index ${i}`);
  }
  assert(chain[0] > 0 && chain[chain.length - 1] < track.length,
    `MorningB v2 gates [${chain.join(', ')}] must lie inside the ${track.length} m line`);

  // The duplication hazard the WP-D1 brief calls out: the same numbers live in
  // core/src/gates.ts (QA fixture harness) and in the catalog (engine source
  // after WP-D2). They must never drift apart.
  assert(JSON.stringify(gateChainages('MorningB')) === JSON.stringify(chain),
    `core/gates.ts MorningB [${gateChainages('MorningB').join(', ')}] != catalog v2 [${chain.join(', ')}]`);

  // Physical gate positions are PRESERVED across the promotion — only their
  // chainage moved. Re-projecting each stored lat/lon onto the promoted line
  // must land back on its v2 chainage (and inside the 40 m corridor).
  const ref = refFor('MorningB');
  for (let i = 0; i < PROPOSED_GATES.MorningB.length; i++) {
    const g = PROPOSED_GATES.MorningB[i];
    const { x, y } = toXY([g.lat], [g.lon], ref.lat0, ref.lon0);
    const hit = nearestOnSegments(x[0], y[0], ref, 0, ref.ch.length - 1);
    assert(hit.dist < CORRIDOR_M,
      `MorningB gate ${g.name} sits ${hit.dist.toFixed(1)} m off the promoted line`);
    assert(Math.abs(hit.s - chain[i]) < 1,
      `MorningB gate ${g.name} re-projects to ${hit.s.toFixed(1)} m, v2 says ${chain[i]} m`);
  }
});

for (const routeId of ['MorningB', 'StationHomeWet'] as const) {
  test(`routes.json: ${routeId} entry projects consistently (2026-08-20 promotions)`, () => {
    const routesJson = loadJson<{ routes: Record<string, RouteAsset> }>(
      path.join(TESTS_DIR, '..', 'assets', 'routes', 'routes.json'));
    const entry = routesJson.routes[routeId];
    assert(entry !== undefined, `routes.json must hold a ${routeId} entry`);
    for (const g of entry.gates) {
      const p = projectToPixel(entry, g.lat, g.lon);
      assert(Math.abs(p.px - g.px) < 0.5 && Math.abs(p.py - g.py) < 0.5,
        `gate ${g.name} reprojects to (${p.px.toFixed(2)},${p.py.toFixed(2)}) vs stored ` +
          `(${g.px.toFixed(2)},${g.py.toFixed(2)})`);
    }
    const seed = loadJson<Catalog>(path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
    const route = seed.routes.find((r) => r.id === routeId)!;
    const way = seed.ways.find((w) => w.id === route.wayId)!;
    const startLm = seed.landmarks.find((l) => l.id === way.startLandmarkId)!;
    const endLm = seed.landmarks.find((l) => l.id === way.endLandmarkId)!;
    const path0 = entry.path![0];
    const pathN = entry.path![entry.path!.length - 1];
    const dStart = metresBetween({ lat: path0[0], lon: path0[1] }, startLm);
    const dEnd = metresBetween({ lat: pathN[0], lon: pathN[1] }, endLm);
    assert(dStart < 150, `${routeId} path start is ${dStart.toFixed(0)} m from the ${startLm.id} landmark centre`);
    assert(dEnd < 150, `${routeId} path end is ${dEnd.toFixed(0)} m from the ${endLm.id} landmark centre`);
  });
}

// ------------------------------------------------------------- defaultRoute (WP-D3, B-39)

test('fallbackRouteId: most recent ranking result wins', () => {
  const c = emptyCatalog();
  c.routes = [
    { id: 'RouteB', wayId: 'w', refLineId: 'RouteB', gateSetVersion: 1, seeded: false },
    { id: 'RouteA', wayId: 'w', refLineId: 'RouteA', gateSetVersion: 1, seeded: false },
  ];
  const older = mkResult({ rideId: 'r1', startedAtMs: 1000, routeId: 'RouteA' });
  const newer = mkResult({ rideId: 'r2', startedAtMs: 2000, routeId: 'RouteB' });
  // Catalog order puts RouteB first, but the newer result is on RouteB anyway
  // here — flip the ages so the winner is decided by recency, not order.
  const olderOnB = mkResult({ rideId: 'r3', startedAtMs: 1000, routeId: 'RouteB' });
  const newerOnA = mkResult({ rideId: 'r4', startedAtMs: 2000, routeId: 'RouteA' });
  assert(fallbackRouteId(c, [older, newer]) === 'RouteB', 'the most recent result (RouteB, t=2000) must win');
  assert(fallbackRouteId(c, [newerOnA, olderOnB]) === 'RouteA',
    'recency decides even against catalog order (RouteB listed first)');
});

test('fallbackRouteId: empty results → first catalog route; empty catalog → null', () => {
  const c = emptyCatalog();
  c.routes = [
    { id: 'RouteFirst', wayId: 'w', refLineId: 'RouteFirst', gateSetVersion: 1, seeded: false },
    { id: 'RouteSecond', wayId: 'w', refLineId: 'RouteSecond', gateSetVersion: 1, seeded: false },
  ];
  assert(fallbackRouteId(c, []) === 'RouteFirst', 'no history: catalog order picks the first route');
  assert(fallbackRouteId(emptyCatalog(), []) === null, 'no routes at all (fresh install): null, nothing invented');
  assert(fallbackRouteId(emptyCatalog(), [mkResult({ rideId: 'r1', startedAtMs: 1, routeId: 'RouteFirst' })]) === null,
    'a result naming a route absent from the catalog cannot stand in for it either');
});

test('fallbackRouteId on the real seed = the newest seeded archive ride\'s route', () => {
  const catalog = loadJson<Catalog>(path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  const results = loadJson<RideResult[]>(path.join(TESTS_DIR, '..', 'src', 'store', 'results.seed.json'));
  const routeIds = new Set(catalog.routes.map((r) => r.id));

  // Independently derived expectation (no literal route id in this test):
  // the routeId of the newest result that names a route, RANKS (D-024/D-028
  // — same gate the timing tower itself uses, so an estimated lap or a
  // tripwire-demoted seed is excluded here too), and names a catalogued route.
  let expected: RideResult | null = null;
  for (const r of results) {
    if (r.routeId === null || !routeIds.has(r.routeId)) continue;
    if (!ranks(r)) continue;
    if (expected === null || r.startedAtMs > expected.startedAtMs) expected = r;
  }
  assert(expected !== null, 'the real seed must contain at least one rankable, catalogued result');
  assert(fallbackRouteId(catalog, results) === expected!.routeId,
    `fallbackRouteId returned ${fallbackRouteId(catalog, results)}, expected the newest seed's route ${expected!.routeId}`);
});

// -------------------------------------- route display-name overlay (Nathan 2026-08-26)

test('routeLabel: the four legacy ids + StationHomePreferred show their ruled display names', () => {
  assert(routeLabel('Morning') === 'Home Work Dry', `Morning -> ${routeLabel('Morning')}`);
  assert(routeLabel('MorningB') === 'Home Work Wet', `MorningB -> ${routeLabel('MorningB')}`);
  assert(routeLabel('EveningA') === 'Work Home Dry', `EveningA -> ${routeLabel('EveningA')}`);
  assert(routeLabel('EveningB') === 'Work Home Wet', `EveningB -> ${routeLabel('EveningB')}`);
  assert(routeLabel('StationHomePreferred') === 'Station Home Dry',
    `StationHomePreferred -> ${routeLabel('StationHomePreferred')}`);
});

test('routeLabel: StationWork pair (ruled unchanged) and native ids keep their derived labels', () => {
  assert(routeLabel('StationWorkStd') === 'Station Work Std', 'Std keeps its name (ruled)');
  assert(routeLabel('StationWorkAlt') === 'Station Work Alt', 'Alt keeps its name (ruled)');
  assert(routeLabel('StationHomeWet') === 'Station Home Wet', 'already descriptive — no entry');
  assert(routeLabel('WorkStationA') === 'Work Station A', 'native id spot check');
  assert(routeLabel('HomeChurch') === 'Home Church', 'native id spot check');
  assert(routeLabel('SomeFutureRoute') === 'Some Future Route',
    'an id the table has never heard of falls back to split-on-capitals');
});

test('overlay never touches stored ids: catalog, map-asset manifest and engine refs still key the legacy ids', () => {
  const legacy = ['Morning', 'MorningB', 'EveningA', 'EveningB', 'StationHomePreferred'];
  const display = ['HomeWorkDry', 'HomeWorkWet', 'WorkHomeDry', 'WorkHomeWet', 'StationHomeDry'];

  const catalog = loadJson<Catalog>(path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  const ids = new Set(catalog.routes.map((r) => r.id));
  for (const id of legacy) assert(ids.has(id), `catalog.seed.json must still contain route id ${id}`);
  for (const d of display) assert(!ids.has(d), `display name ${d} must never appear as a catalog route id`);
  for (const r of catalog.routes) {
    assert(!display.includes(r.refLineId), `refLineId ${r.refLineId} must stay a real track id`);
  }

  const manifest = loadJson<{ routes: Record<string, unknown> }>(
    path.join(TESTS_DIR, '..', 'assets', 'routes', 'routes.json'));
  for (const id of legacy) assert(id in manifest.routes, `map-asset manifest must still key ${id}`);
  for (const d of display) assert(!(d in manifest.routes), `map-asset manifest must not gain a ${d} key`);

  const refs = loadJson<{ tracks: Record<string, unknown> }>(path.join(TESTS_DIR, 'fixtures', 'refs.json'));
  for (const id of legacy) assert(id in refs.tracks, `engine refs.json must still key track ${id}`);
  for (const d of display) assert(!(d in refs.tracks), `engine refs.json must not gain a ${d} track`);
});
