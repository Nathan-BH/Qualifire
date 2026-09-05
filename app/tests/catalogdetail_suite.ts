/**
 * QA — WP-K (cycle 2): `catalogDetailModel.ts` (placeDetailFor, wayDetailFor,
 * fmtLengthM). Pure; a small inline catalog covers a from/to way with two
 * sorted routes, a loop way, an orphan user place and a seed-owned place —
 * same fixture style as `catalogdelete_suite.ts`'s hand-built cases. No
 * `registerHooks` shim needed — the model's import chain is JSON-free.
 */
import { assert, test } from './lib.ts';
import {
  fmtLengthM, placeDetailFor, wayDetailFor, type CatalogDetailDeps,
} from '../src/ui/catalogDetailModel.ts';
import type { Catalog, GateSet, Landmark, Route, Way } from '../src/store/types.ts';

// ------------------------------------------------------------------ fixture

const STD_ID = 'rt:testStd';
const ALT_ID = 'rt:testAlt';
const LOOP_ID = 'rt:testLoop';

const lmA: Landmark = { id: 'lm:a', label: 'Home', lat: 50.87, lon: 4.70, radiusM: 180, activeFromMs: 0, activeUntilMs: null, offerAtStart: true };
const lmB: Landmark = { id: 'lm:b', label: 'Work', lat: 50.85, lon: 4.72, radiusM: 150, activeFromMs: 0, activeUntilMs: null, offerAtStart: false };
const lmC: Landmark = { id: 'lm:c', label: 'Park Loop', lat: 50.80, lon: 4.68, radiusM: 200, activeFromMs: 0, activeUntilMs: 500, offerAtStart: true };
const lmD: Landmark = { id: 'lm:d', label: 'Orphan', lat: 50.90, lon: 4.60, radiusM: 150, activeFromMs: 0, activeUntilMs: null, offerAtStart: true };
const lmSeed: Landmark = { id: 'lm:seed', label: 'Seed Place', lat: 50.95, lon: 4.55, radiusM: 150, activeFromMs: 0, activeUntilMs: null, offerAtStart: true };

const wayAB: Way = { id: 'way:AB', startLandmarkId: 'lm:a', endLandmarkId: 'lm:b', routeIds: [STD_ID, ALT_ID] };
const wayLoop: Way = { id: 'way:Loop', startLandmarkId: 'lm:c', endLandmarkId: 'lm:c', loopDiscriminator: 'via park', routeIds: [LOOP_ID] };

const routeStd: Route = { id: STD_ID, wayId: 'way:AB', refLineId: 'ref:std', gateSetVersion: 2, seeded: false, referenceRideId: 'ride:ref1' };
const routeAlt: Route = { id: ALT_ID, wayId: 'way:AB', refLineId: 'ref:alt', gateSetVersion: 1, seeded: false };
const routeLoop: Route = { id: LOOP_ID, wayId: 'way:Loop', refLineId: 'ref:loop', gateSetVersion: 1, seeded: false, referenceRideId: 'ride:missing' };

const gsStd: GateSet = { routeId: STD_ID, version: 2, chainageM: [0, 1200, 2900, 4400, 5800], createdAtMs: 0, origin: 'geometric' };
const gsLoop: GateSet = { routeId: LOOP_ID, version: 1, chainageM: [0, 300, 850], createdAtMs: 0 };

const CATALOG: Catalog = {
  schemaVersion: 1,
  landmarks: [lmA, lmB, lmC, lmD, lmSeed],
  ways: [wayAB, wayLoop],
  routes: [routeStd, routeAlt, routeLoop],
  gateSets: [gsStd, gsLoop],
};

const SEED: Catalog = {
  schemaVersion: 1,
  landmarks: [lmSeed],
  ways: [],
  routes: [],
  gateSets: [],
};

const DEPS: CatalogDetailDeps = {
  catalog: CATALOG,
  seed: SEED,
  nowMs: 1000,
  refLengthM: (id) => (id === 'ref:std' ? 5800 : id === 'ref:loop' ? 850 : null),
  resultsOnFile: (id) => (id === STD_ID ? 3 : 0),
  rankedCount: (id) => (id === STD_ID ? 2 : 0),
  storedStartMs: (id) => (id === 'ride:ref1' ? 12345 : null),
};

// -------------------------------------------------------------------- tests

test('catalogdetail: placeDetailFor/wayDetailFor — unknown id → null', () => {
  assert(placeDetailFor('nope', DEPS) === null, 'placeDetailFor unknown id must be null');
  assert(wayDetailFor('nope', DEPS) === null, 'wayDetailFor unknown id must be null');
});

test('catalogdetail: place A — one touching way, direction "from", touchingRouteIds both routes in catalog order', () => {
  const p = placeDetailFor('lm:a', DEPS)!;
  assert(p.ways.length === 1, `expected 1 touching way, got ${p.ways.length}`);
  assert(p.ways[0].wayId === 'way:AB' && p.ways[0].direction === 'from', `expected way:AB/from, got ${p.ways[0].wayId}/${p.ways[0].direction}`);
  assert(p.ways[0].routeCount === 2, `expected routeCount 2, got ${p.ways[0].routeCount}`);
  assert(p.touchingRouteIds.length === 2 && p.touchingRouteIds[0] === STD_ID && p.touchingRouteIds[1] === ALT_ID,
    `expected [${STD_ID}, ${ALT_ID}], got ${JSON.stringify(p.touchingRouteIds)}`);
});

test('catalogdetail: place B — direction "to", dormant by offerAtStart=false', () => {
  const p = placeDetailFor('lm:b', DEPS)!;
  assert(p.ways.length === 1 && p.ways[0].direction === 'to', `expected direction to, got ${p.ways[0].direction}`);
  assert(p.dormant === true, 'place B (offerAtStart=false) must be dormant');
});

test('catalogdetail: place C — loop direction (way starts and ends on it), dormant by expired activeUntilMs, one touching route', () => {
  const p = placeDetailFor('lm:c', DEPS)!;
  assert(p.ways.length === 1 && p.ways[0].direction === 'loop', `expected loop, got ${p.ways[0].direction}`);
  assert(p.dormant === true, 'place C (activeUntilMs=500 < nowMs=1000) must be dormant');
  assert(p.touchingRouteIds.length === 1 && p.touchingRouteIds[0] === LOOP_ID, `expected [${LOOP_ID}], got ${JSON.stringify(p.touchingRouteIds)}`);
});

test('catalogdetail: place A — not dormant (offerAtStart true, activeUntilMs null)', () => {
  const p = placeDetailFor('lm:a', DEPS)!;
  assert(p.dormant === false, 'place A must not be dormant');
});

test('catalogdetail: place deletable — user-owned AND unreferenced only', () => {
  const orphan = placeDetailFor('lm:d', DEPS)!;
  assert(orphan.deletable === true, 'orphan user place must be deletable');
  const seeded = placeDetailFor('lm:seed', DEPS)!;
  assert(seeded.deletable === false, 'seed-owned place must never be deletable, even unreferenced');
  const referenced = placeDetailFor('lm:a', DEPS)!;
  assert(referenced.deletable === false, 'a place referenced by a way must not be deletable');
});

test('catalogdetail: wayDetailFor — routes sorted Std before Alt', () => {
  const w = wayDetailFor('way:AB', DEPS)!;
  assert(w.routes.length === 2, `expected 2 routes, got ${w.routes.length}`);
  assert(w.routes[0].id === STD_ID && w.routes[1].id === ALT_ID,
    `expected [${STD_ID}, ${ALT_ID}], got ${w.routes.map((r) => r.id).join(',')}`);
  assert(w.asksAtStart === true, 'a two-route way must ask which one at START');
});

test('catalogdetail: wayDetailFor — loop way: loop=true, loopDiscriminator carried, from===to', () => {
  const w = wayDetailFor('way:Loop', DEPS)!;
  assert(w.loop === true, 'wayLoop must report loop=true');
  assert(w.loopDiscriminator === 'via park', `expected 'via park', got ${w.loopDiscriminator}`);
  assert(w.from !== null && w.to !== null && w.from.id === w.to.id, 'loop way from/to must be the same landmark');
  assert(w.asksAtStart === false, 'a one-route way must not ask at START');
});

test('catalogdetail: gate rows — names (START/G.../FINISH) and fmtChainage output', () => {
  const w = wayDetailFor('way:AB', DEPS)!;
  const std = w.routes.find((r) => r.id === STD_ID)!;
  assert(std.gateRows.length === 5, `expected 5 gate rows, got ${std.gateRows.length}`);
  const names = std.gateRows.map((g) => g.name).join(',');
  assert(names === 'START,G1,G2,G3,FINISH', `expected START,G1,G2,G3,FINISH, got ${names}`);
  assert(std.gateRows[1].chainageLabel === '1 200 m', `expected '1 200 m', got ${std.gateRows[1].chainageLabel}`);
  assert(std.gateRows[4].chainageLabel === '5 800 m', `expected '5 800 m', got ${std.gateRows[4].chainageLabel}`);
});

test('catalogdetail: gatesLabel — with origin, without origin, and null when no gate set', () => {
  const ab = wayDetailFor('way:AB', DEPS)!;
  const std = ab.routes.find((r) => r.id === STD_ID)!;
  const alt = ab.routes.find((r) => r.id === ALT_ID)!;
  assert(std.gatesLabel === '5 · v2 · geometric', `expected '5 · v2 · geometric', got ${std.gatesLabel}`);
  assert(alt.gatesLabel === null, `route with no gate set must have gatesLabel null, got ${alt.gatesLabel}`);
  assert(alt.gateRows.length === 0, 'route with no gate set must have empty gateRows');

  const loopW = wayDetailFor('way:Loop', DEPS)!;
  const loop = loopW.routes.find((r) => r.id === LOOP_ID)!;
  assert(loop.gatesLabel === '3 · v1', `expected '3 · v1' (no origin), got ${loop.gatesLabel}`);
});

test('catalogdetail: lengthLabel — null when refLengthM is null, "850 m" under 1km, "5.8 km" at/over 1km', () => {
  const ab = wayDetailFor('way:AB', DEPS)!;
  const std = ab.routes.find((r) => r.id === STD_ID)!;
  const alt = ab.routes.find((r) => r.id === ALT_ID)!;
  assert(std.lengthLabel === '5.8 km', `expected '5.8 km', got ${std.lengthLabel}`);
  assert(alt.lengthLabel === null, `expected null (unresolvable ref), got ${alt.lengthLabel}`);

  const loopW = wayDetailFor('way:Loop', DEPS)!;
  const loop = loopW.routes.find((r) => r.id === LOOP_ID)!;
  assert(loop.lengthLabel === '850 m', `expected '850 m', got ${loop.lengthLabel}`);

  assert(fmtLengthM(850) === '850 m', `fmtLengthM(850) expected '850 m', got ${fmtLengthM(850)}`);
  assert(fmtLengthM(5800) === '5.8 km', `fmtLengthM(5800) expected '5.8 km', got ${fmtLengthM(5800)}`);
});

test('catalogdetail: referenceRide vs referenceUnscored vs omitted', () => {
  const ab = wayDetailFor('way:AB', DEPS)!;
  const std = ab.routes.find((r) => r.id === STD_ID)!;
  const alt = ab.routes.find((r) => r.id === ALT_ID)!;
  assert(std.referenceRide !== null && std.referenceRide.rideId === 'ride:ref1' && std.referenceRide.startedAtMs === 12345,
    `expected a resolved reference ride, got ${JSON.stringify(std.referenceRide)}`);
  assert(std.referenceUnscored === false, 'a resolved reference ride must not be flagged unscored');

  assert(alt.referenceRide === null && alt.referenceUnscored === false,
    'a route with no referenceRideId must show neither a reference row nor "unscored"');

  const loopW = wayDetailFor('way:Loop', DEPS)!;
  const loop = loopW.routes.find((r) => r.id === LOOP_ID)!;
  assert(loop.referenceRide === null, 'an unresolvable referenceRideId must not produce a referenceRide');
  assert(loop.referenceUnscored === true, 'a referenceRideId with no stored result must be flagged unscored');
});
