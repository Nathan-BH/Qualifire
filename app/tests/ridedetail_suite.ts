/**
 * QA — WP-H: the ride-detail view model (rideDetailFor, rankLineFor,
 * sectorColoursFor) and the free-ride tolerance match (freeRideNear). Pure;
 * fixtures built inline, same style as ridehistory_suite.ts.
 *
 * rideDetailModel.ts imports colourModel.ts, which imports store/seed.ts,
 * which imports the bare catalog.seed.json — same reason (and same shim) as
 * resultsstore_suite.ts/catalogstore_suite.ts: those two must be pulled in
 * DYNAMICALLY, after the loader hook exists, since a static import is linked
 * before any module body (this hook included) runs.
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { assert, test } from './lib.ts';
import { colors } from '../src/ui/theme.ts';
import { freeRideNear, type FreeRideRecord } from '../src/store/freeRides.ts';
import { RESULT_SCHEMA_VERSION, type RideResult, type Route } from '../src/store/types.ts';
import type { RideDetailDeps } from '../src/ui/rideDetailModel.ts';

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const { rankLineFor, rideDetailFor, sectorColoursFor } = await import('../src/ui/rideDetailModel.ts');
const { MIN_HISTORY } = await import('../src/ui/colourModel.ts');

function mkResult(o: Partial<RideResult> & { rideId: string; startedAtMs: number }): RideResult {
  return {
    kind: 'rideResult',
    schemaVersion: RESULT_SCHEMA_VERSION,
    routeId: 'RouteA',
    source: 'app',
    lap: { rawS: 900, movingS: 880, quality: 'clean' },
    sectors: [
      { index: 1, fromChainageM: 0, toChainageM: 1000, rawS: 440, movingS: 430, quality: 'clean' },
      { index: 2, fromChainageM: 1000, toChainageM: 2000, rawS: 460, movingS: 450, quality: 'clean' },
    ],
    derivedBy: { engineVersion: 'e1', gateSetVersion: 1, resultSchemaVersion: RESULT_SCHEMA_VERSION },
    ...o,
  };
}

function mkRoute(o: Partial<Route> & { id: string }): Route {
  return { wayId: 'way:x', refLineId: o.id, gateSetVersion: 1, seeded: false, ...o };
}

const NOOP_DEPS: RideDetailDeps = {
  result: null, free: null, routes: [], userRoutes: [],
  laps: () => [], sectors: () => [], barred: () => false,
};

test('ridedetail: rideDetailFor — no result, no free → kind none, empty rows, canToggleIgnore false', () => {
  const m = rideDetailFor('r1', 1000, NOOP_DEPS);
  assert(m.kind === 'none', `expected kind none, got ${m.kind}`);
  assert(m.sectorRows.length === 0 && m.sectorColours.length === 0, 'no result -> no rows');
  assert(!m.canToggleIgnore, 'nothing stored -> nothing to toggle');
  assert(m.routeId === null && m.promoteTarget === null, 'no route, no promote target');
});

test('ridedetail: rideDetailFor — result with routeId null but a free record → kind free, free carried through', () => {
  const free: FreeRideRecord = { kind: 'freeRide', schemaVersion: 1, rideId: 'free:1000', startedAtMs: 1000, crossings: [], sectors: [] };
  const m = rideDetailFor('free:1000', 1000, { ...NOOP_DEPS, result: mkResult({ rideId: 'free:1000', startedAtMs: 1000, routeId: null }), free });
  assert(m.kind === 'free', `expected kind free, got ${m.kind}`);
  assert(m.free === free, 'free record carried through unchanged');
  assert(m.routeId === null, 'a free result carries no routeId');
});

test('ridedetail: rideDetailFor — clean ranked lap, >=MIN_HISTORY → rank line, lapTier from tierFor, rows sized right', () => {
  const hist = Array.from({ length: MIN_HISTORY }, (_, i) => 900 + i * 5); // all slower -> today is purple
  const res = mkResult({ rideId: 'r1', startedAtMs: 5000, lap: { rawS: 900, movingS: 850, quality: 'clean' } });
  const m = rideDetailFor('r1', 5000, {
    ...NOOP_DEPS, result: res,
    laps: () => hist, sectors: () => [], barred: () => false,
  });
  assert(m.kind === 'route', `expected route, got ${m.kind}`);
  assert(/^P\d+ of \d+ on this route$/.test(m.rankLine), `expected "P_ of _ on this route", got "${m.rankLine}"`);
  assert(m.lapTier === 'purple', `expected purple (850 < min of hist), got ${m.lapTier}`);
  assert(m.sectorRows.length === res.sectors.length, `sectorRows length ${m.sectorRows.length} != ${res.sectors.length}`);
  assert(m.sectorColours[0] === null, 'index 0 (START) is always null');
  assert(m.sectorColours.length === res.sectors.length + 1, `sectorColours length ${m.sectorColours.length} != sectors+1`);
});

test('ridedetail: rideDetailFor — ignoredFromRanking true → ignored, neutral tiers/colours, canToggleIgnore true', () => {
  const res = mkResult({ rideId: 'r2', startedAtMs: 6000, ignoredFromRanking: true });
  const m = rideDetailFor('r2', 6000, { ...NOOP_DEPS, result: res, laps: () => [1, 2, 3, 4, 5], sectors: () => [1, 2, 3] });
  assert(m.ignored, 'must read as ignored');
  assert(m.rankLine.startsWith('not ranked — you excluded'), `unexpected rank line: "${m.rankLine}"`);
  assert(m.lapTier === 'neutral', `expected neutral lapTier, got ${m.lapTier}`);
  assert(m.sectorRows.every((r) => r.tier === 'neutral' || r.tier === 'est'), 'every sector row must read neutral/est while ignored');
  assert(m.sectorColours.every((c) => c === null), 'every sector colour must be null while ignored');
  assert(m.canToggleIgnore, 'an ignored, otherwise-rankable lap can still be toggled back');
});

test('ridedetail: rideDetailFor — estimated lap → canToggleIgnore false, rank line names it', () => {
  const res = mkResult({
    rideId: 'r3', startedAtMs: 7000,
    lap: { rawS: 900, movingS: null, quality: 'estimated' },
    sectors: [{ index: 1, fromChainageM: 0, toChainageM: 1000, rawS: 900, movingS: null, quality: 'estimated' }],
  });
  const m = rideDetailFor('r3', 7000, { ...NOOP_DEPS, result: res });
  assert(!m.canToggleIgnore, 'nothing to ignore on a lap that never ranked in the first place');
  assert(m.rankLine === 'no time — an estimated lap never ranks', `unexpected rank line: "${m.rankLine}"`);
});

test('ridedetail: rideDetailFor — tripwireDemoted → barred → excluded-from-comparison line, canToggleIgnore false', () => {
  const res = mkResult({ rideId: 'r4', startedAtMs: 8000, tripwireDemoted: true });
  const m = rideDetailFor('r4', 8000, { ...NOOP_DEPS, result: res, laps: () => [1, 2, 3, 4, 5], barred: () => true });
  assert(m.rankLine === 'no rank — this lap is excluded from the comparison', `unexpected rank line: "${m.rankLine}"`);
  assert(!m.canToggleIgnore, 'a tripwire-demoted lap never ranks either way — nothing to toggle');
});

test('ridedetail: rideDetailFor — referenceOf resolves the route whose referenceRideId === rideId, null otherwise', () => {
  const routes = [mkRoute({ id: 'RouteA', referenceRideId: 'r5' }), mkRoute({ id: 'RouteB', referenceRideId: 'other' })];
  const res = mkResult({ rideId: 'r5', startedAtMs: 9000, routeId: 'RouteA' });
  const withRef = rideDetailFor('r5', 9000, { ...NOOP_DEPS, result: res, routes });
  assert(withRef.referenceOf?.id === 'RouteA', `expected referenceOf RouteA, got ${withRef.referenceOf?.id}`);
  const res2 = mkResult({ rideId: 'r6', startedAtMs: 9500, routeId: 'RouteB' });
  const withoutRef = rideDetailFor('r6', 9500, { ...NOOP_DEPS, result: res2, routes });
  assert(withoutRef.referenceOf === null, 'r6 is not any route\'s reference');
});

test('ridedetail: rankLineFor — ignored wins over every other branch', () => {
  const line = rankLineFor(
    { lapMovingS: 850, estimated: false, ignored: true },
    Array.from({ length: MIN_HISTORY }, () => 900),
    true, // barred too
  );
  assert(line === 'not ranked — you excluded this ride from ranking', `expected the ignored line, got "${line}"`);
});

test('ridedetail: sectorColoursFor — mirrors ResultScreen (clean+movingS coloured, interrupted/estimated/missed null; own ride excluded by rideId in hist, not by value — WP-K)', () => {
  const res = mkResult({
    rideId: 'r7', startedAtMs: 1_000_000,
    sectors: [
      { index: 1, fromChainageM: 0, toChainageM: 1000, rawS: 100, movingS: 90, quality: 'clean' },
      { index: 2, fromChainageM: 1000, toChainageM: 2000, rawS: 110, movingS: 100, quality: 'interrupted' },
      { index: 3, fromChainageM: 2000, toChainageM: 3000, rawS: 120, movingS: null, quality: 'estimated' },
      { index: 4, fromChainageM: 3000, toChainageM: 4000, rawS: 0, movingS: null, quality: 'missed' },
    ],
  });
  const hist = (i: number) => (i === 1 ? Array.from({ length: MIN_HISTORY }, (_, k) => 95 + k) : []);
  const colours = sectorColoursFor(res, hist);
  assert(colours.length === 5, `expected 5 (4 sectors + null head), got ${colours.length}`);
  assert(colours[0] === null, 'index 0 always null');
  assert(colours[1] === colors.purple, `S1 (clean, best of hist) expected purple line colour, got ${colours[1]}`);
  assert(colours[2] === null, 'S2 interrupted -> null (not coloured)');
  assert(colours[3] === null, 'S3 estimated -> null');
  assert(colours[4] === null, 'S4 missed -> null');
});

// ---------------------------------------------------- §3.3b promoteTarget

test('ridedetail: rideDetailFor — promoteTarget: user-owned unreferenced route, null when own reference, null when seed-owned, null for free/none', () => {
  const userA = mkRoute({ id: 'RouteA', referenceRideId: 'someOtherRide' });
  const resA = mkResult({ rideId: 'r8', startedAtMs: 10_000, routeId: 'RouteA' });
  const withTarget = rideDetailFor('r8', 10_000, { ...NOOP_DEPS, result: resA, routes: [userA], userRoutes: [userA] });
  assert(withTarget.promoteTarget?.id === 'RouteA', `expected promoteTarget RouteA, got ${withTarget.promoteTarget?.id}`);

  const userSelfRef = mkRoute({ id: 'RouteA', referenceRideId: 'r9' });
  const resSelf = mkResult({ rideId: 'r9', startedAtMs: 10_100, routeId: 'RouteA' });
  const withSelfRef = rideDetailFor('r9', 10_100, { ...NOOP_DEPS, result: resSelf, routes: [userSelfRef], userRoutes: [userSelfRef] });
  assert(withSelfRef.promoteTarget === null, 'a ride that is already the reference must not be its own promote target');

  // Seed-owned: the SAME route object is present in `routes` (currentCatalog)
  // but absent from `userRoutes` (userCatalog) — the seed-ownership rule.
  const seedRoute = mkRoute({ id: 'SeedRoute', referenceRideId: 'someRide' });
  const resSeed = mkResult({ rideId: 'r10', startedAtMs: 10_200, routeId: 'SeedRoute' });
  const seedCase = rideDetailFor('r10', 10_200, { ...NOOP_DEPS, result: resSeed, routes: [seedRoute], userRoutes: [] });
  assert(seedCase.promoteTarget === null, 'a seed-owned route (absent from userRoutes) must never be a promote target');

  const freeCase = rideDetailFor('r11', 10_300, {
    ...NOOP_DEPS,
    result: mkResult({ rideId: 'r11', startedAtMs: 10_300, routeId: null }),
    free: { kind: 'freeRide', schemaVersion: 1, rideId: 'r11', startedAtMs: 10_300, crossings: [], sectors: [] },
    routes: [userA], userRoutes: [userA],
  });
  assert(freeCase.promoteTarget === null, 'a free ride (no routeId) has no promote target');

  const noneCase = rideDetailFor('r12', 10_400, { ...NOOP_DEPS, routes: [userA], userRoutes: [userA] });
  assert(noneCase.promoteTarget === null, 'no result at all -> no promote target');
});

// ---------------------------------------------------- §5.5 free-ride match

test('freerides: freeRideNear — exact id hit wins; nearest-within-tolerance otherwise; null beyond tolerance; null on empty', () => {
  const mk = (startedAtMs: number): FreeRideRecord =>
    ({ kind: 'freeRide', schemaVersion: 1, rideId: `free:${startedAtMs}`, startedAtMs, crossings: [], sectors: [] });
  const records = [mk(1_000_000), mk(1_000_050), mk(2_000_000)];
  assert(freeRideNear(records, 1_000_050)?.rideId === 'free:1000050', 'exact id hit must win');
  assert(freeRideNear(records, 1_000_045)?.rideId === 'free:1000050', 'nearest within tolerance');
  assert(freeRideNear(records, 1_000_045, 2)?.rideId === undefined && freeRideNear(records, 1_000_045, 2) === null,
    'beyond a tight tolerance -> null');
  assert(freeRideNear([], 1_000_000) === null, 'empty records -> null');
});
