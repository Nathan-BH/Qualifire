/**
 * QA — WP-Q Part A: store/catalogDelete.ts, the pure cascade behind per-item
 * delete on the ROUTES tab. Every case asserts the contract this module
 * exists to satisfy: validateCatalog(mergeCatalogs(seed, next)).length === 0
 * after every deletion (store/catalog.ts).
 *
 * Fixtures follow the real lm:/way:/route: id scheme where a case can be
 * built from an actual ride (draftWayCreation/buildWayCreationCatalog,
 * wayCreation.ts) and are hand-built (same shape catalogstore_suite.ts's
 * userAddition() uses) where a case needs precise control — two routes on
 * one way, two ways sharing a landmark, a loop — that a single ride cannot
 * produce directly.
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { assert, test } from './lib.ts';
import { addGateSet, emptyCatalog, mergeCatalogs, validateCatalog } from '../src/store/catalog.ts';
import { draftRouteCreation, buildRouteCreationCatalog } from '../src/store/routeCreation.ts';
import { isSeedOwned, removeLandmark, removeWay, removeRoute } from '../src/store/catalogDelete.ts';
import type { Catalog, GateSet, Landmark } from '../src/store/types.ts';

// store/seed.ts (pulled in by catalogForSeedMode below) imports catalog.seed.json
// as a bare .json — Metro bundles that directly, Node needs a loader hook.
// Same shim, same reason, as catalogstore_suite.ts / resultsstore_suite.ts.
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const { catalogForSeedMode } = await import('../src/store/seed.ts');

// ------------------------------------------------------------------ helpers

const LAT0 = 50.87;
const LON0 = 4.70;

function rideFrom(lat0: number, lon0: number, n: number, stepLat = 0.001): { lat: number; lon: number }[] {
  return Array.from({ length: n }, (_, i) => ({ lat: lat0 + i * stepLat, lon: lon0 }));
}

function lm(id: string, lat: number, lon: number, radiusM = 150): Landmark {
  return { id, label: id, lat, lon, radiusM, activeFromMs: 0, activeUntilMs: null, offerAtStart: true };
}

function gs(wayId: string, version: number, createdAtMs = 0): GateSet {
  return { wayId, version, chainageM: [10, 100, 200, 300, 390], createdAtMs };
}

/** A single ride, drafted and built on an empty catalog: one brand-new way
 * with one route, ids lm:<rideId>:start / lm:<rideId>:end / way:<rideId> /
 * route:<rideId> (wayCreation.ts's real scheme). */
function baseRouteWay(rideId: string): { cat: Catalog; routeId: string; wayId: string } {
  const seed = emptyCatalog();
  const draft = draftRouteCreation(seed, { rideId, startedAtMs: 1, fixes: rideFrom(LAT0, LON0, 20) })!;
  assert(draft !== null, 'setup: a real 2 km ride must draft');
  const built = buildRouteCreationCatalog(emptyCatalog(), draft, { start: 'A', end: 'B' });
  return { cat: built, routeId: built.routes[0].id, wayId: built.ways[0].id };
}

/** Adds a second route onto an existing way (not something a single ride can
 * produce — hand-built, same shape addGateSet/wayCreation build). */
function addSecondWay(cat: Catalog, routeId: string, wayId: string): Catalog {
  const route = cat.routes.find((w) => w.id === routeId)!;
  return {
    ...cat,
    routes: cat.routes.map((w) => (w.id === routeId ? { ...w, wayIds: [...w.wayIds, wayId] } : w)),
    ways: [...cat.ways, { id: wayId, routeId, refLineId: wayId, gateSetVersion: 1, seeded: false }],
    gateSets: [...cat.gateSets, gs(wayId, 1)],
  };
}

// ============================================================ removeRoute

test('catalogDelete: way with two routes — removeRoute(r1) prunes the way to [r2], drops ALL of r1\'s gate-set versions, keeps both landmarks', () => {
  const seed = emptyCatalog();
  const base = baseRouteWay('ride-t1a');
  const r1 = base.wayId;
  const r2 = 'route:ride-t1a-b';
  let cat = addSecondWay(base.cat, base.routeId, r2);
  cat = addGateSet(cat, gs(r1, 2, 1)); // a moved gate: r1 now has v1 AND v2
  assert(validateCatalog(mergeCatalogs(seed, cat)).length === 0, 'fixture must validate');

  const d = removeWay(cat, seed, r1);
  assert(validateCatalog(mergeCatalogs(seed, d.next)).length === 0, `must validate: ${validateCatalog(mergeCatalogs(seed, d.next)).join('; ')}`);
  const route = d.next.routes.find((w) => w.id === base.routeId);
  assert(route !== undefined && route.wayIds.length === 1 && route.wayIds[0] === r2, `way remains with only r2, got ${JSON.stringify(route)}`);
  assert(d.next.gateSets.every((g) => g.wayId !== r1), 'every r1 gate-set version gone');
  assert(d.next.landmarks.length === 2, 'both landmarks remain (the way is not dropped)');
  assert(d.removedRouteIds.length === 0, 'way not removed');
  assert(d.removedWayIds.length === 1 && d.removedWayIds[0] === r1, 'r1 reported removed');
  assert(d.removedRefLineIds.length === 1 && d.removedRefLineIds[0] === base.cat.ways[0].refLineId, 'refLineId reported');
});

test('catalogDelete: way with one route — removeRoute drops the route, the way, and both landmarks (catalog order)', () => {
  const seed = emptyCatalog();
  const base = baseRouteWay('ride-t2');
  const expectedOrder = base.cat.landmarks.map((l) => l.id);

  const d = removeWay(base.cat, seed, base.wayId);
  assert(validateCatalog(mergeCatalogs(seed, d.next)).length === 0, 'must validate');
  assert(d.next.ways.length === 0 && d.next.routes.length === 0 && d.next.landmarks.length === 0, 'route, way and both landmarks gone');
  assert(d.removedRouteIds.length === 1 && d.removedRouteIds[0] === base.routeId, 'way reported removed');
  assert(JSON.stringify(d.removedLandmarkIds) === JSON.stringify(expectedOrder), `landmarks in catalog order, got ${d.removedLandmarkIds}`);
});

// ============================================================ removeWay

test('catalogDelete: two ways sharing a landmark — removeWay(Home->Work) leaves both places and the other way', () => {
  const seed = emptyCatalog();
  const home = lm('home', LAT0, LON0);
  const work = lm('work', LAT0 + 0.03, LON0);
  const cat: Catalog = {
    schemaVersion: 1,
    landmarks: [home, work],
    routes: [
      { id: 'way:hw', startLandmarkId: 'home', endLandmarkId: 'work', wayIds: ['route:hw'] },
      { id: 'way:wh', startLandmarkId: 'work', endLandmarkId: 'home', wayIds: ['route:wh'] },
    ],
    ways: [
      { id: 'route:hw', routeId: 'way:hw', refLineId: 'route:hw', gateSetVersion: 1, seeded: false },
      { id: 'route:wh', routeId: 'way:wh', refLineId: 'route:wh', gateSetVersion: 1, seeded: false },
    ],
    gateSets: [gs('route:hw', 1), gs('route:wh', 1)],
  };
  assert(validateCatalog(mergeCatalogs(seed, cat)).length === 0, 'fixture must validate');

  const d = removeRoute(cat, seed, 'way:hw');
  assert(validateCatalog(mergeCatalogs(seed, d.next)).length === 0, `must validate: ${validateCatalog(mergeCatalogs(seed, d.next)).join('; ')}`);
  assert(d.next.landmarks.length === 2, 'Home AND Work both survive');
  assert(d.removedLandmarkIds.length === 0, 'nothing orphaned');
  assert(d.next.routes.length === 1 && d.next.routes[0].id === 'way:wh', 'the reverse way survives untouched');
});

test('catalogDelete: a loop way — removeWay drops its single landmark exactly once, not twice', () => {
  const seed = emptyCatalog();
  const home = lm('home', LAT0, LON0);
  const cat: Catalog = {
    schemaVersion: 1,
    landmarks: [home],
    routes: [{ id: 'way:loop', startLandmarkId: 'home', endLandmarkId: 'home', loopDiscriminator: 'loop:1', wayIds: ['route:loop'] }],
    ways: [{ id: 'route:loop', routeId: 'way:loop', refLineId: 'route:loop', gateSetVersion: 1, seeded: false }],
    gateSets: [gs('route:loop', 1)],
  };
  assert(validateCatalog(mergeCatalogs(seed, cat)).length === 0, 'fixture must validate');

  const d = removeRoute(cat, seed, 'way:loop');
  assert(d.removedLandmarkIds.length === 1 && d.removedLandmarkIds[0] === 'home', `removed exactly once, got ${JSON.stringify(d.removedLandmarkIds)}`);
  assert(d.next.landmarks.length === 0, 'the landmark is actually gone');
});

// ============================================================ removeLandmark

test('catalogDelete: removeLandmark refuses a referenced landmark (unchanged, same reference) and removes a hand-built orphan', () => {
  const seed = emptyCatalog();
  const home = lm('home', LAT0, LON0);
  const work = lm('work', LAT0 + 0.03, LON0);
  const cat: Catalog = {
    schemaVersion: 1,
    landmarks: [home, work],
    routes: [{ id: 'way:hw', startLandmarkId: 'home', endLandmarkId: 'work', wayIds: ['route:hw'] }],
    ways: [{ id: 'route:hw', routeId: 'way:hw', refLineId: 'route:hw', gateSetVersion: 1, seeded: false }],
    gateSets: [gs('route:hw', 1)],
  };

  const d1 = removeLandmark(cat, seed, 'home');
  assert(d1.next === cat, 'referenced landmark: input returned unchanged (same reference)');
  assert(d1.removedLandmarkIds.length === 0, 'empty report');

  const orphanCat: Catalog = { ...cat, landmarks: [...cat.landmarks, lm('stray', LAT0 - 0.03, LON0)] };
  const d2 = removeLandmark(orphanCat, seed, 'stray');
  assert(d2.removedLandmarkIds.length === 1 && d2.removedLandmarkIds[0] === 'stray', 'the orphan is removed');
  assert(d2.next.landmarks.length === 2, 'only the orphan is gone');
});

// ============================================================ shipped seed

test('catalogDelete: shipped seed + a user way off a seed landmark — removeWay leaves no trace, never lists the seed landmark, isSeedOwned is honest', () => {
  const seed = catalogForSeedMode('shipped');
  const seedHome = seed.landmarks[0];
  assert(seedHome.id === 'home', `setup expects seed[0] === home, got ${seedHome.id}`);
  const draft = draftRouteCreation(seed, {
    rideId: 'ride-t6', startedAtMs: 1, fixes: rideFrom(seedHome.lat, seedHome.lon, 20),
  })!;
  assert(draft !== null && draft.start.kind === 'existing' && draft.start.landmarkId === 'home', 'starts inside the seed home disc — reused, not new');
  assert(draft.end.kind === 'new', 'the far end is a genuinely new place');
  const built = buildRouteCreationCatalog(emptyCatalog(), draft, { start: 'Home', end: 'Somewhere' });
  const userWay = built.ways[0];

  const d = removeRoute(built, seed, built.routes[0].id);
  assert(validateCatalog(mergeCatalogs(seed, d.next)).length === 0, `must validate: ${validateCatalog(mergeCatalogs(seed, d.next)).join('; ')}`);
  assert(d.next.routes.length === 0 && d.next.ways.length === 0 && d.next.gateSets.length === 0, 'no trace of the way left in the user catalog');
  assert(!d.removedLandmarkIds.includes('home'), 'the seed landmark is never reported removed (it was never in the user catalog)');
  assert(d.next.landmarks.length === 0, 'the new end landmark was orphaned and removed with the way');

  assert(isSeedOwned(seed, 'way', 'Morning') === true, 'Morning is seed-owned');
  assert(isSeedOwned(seed, 'way', userWay.id) === false, 'the ride-born way is not');
});

// ============================================================ unknown ids

test('catalogDelete: an unknown id returns the input catalog unchanged (same reference) with an empty report, for all three functions', () => {
  const seed = emptyCatalog();
  const cat = baseRouteWay('ride-t7').cat;
  for (const d of [removeWay(cat, seed, 'nope'), removeRoute(cat, seed, 'nope'), removeLandmark(cat, seed, 'nope')]) {
    assert(d.next === cat, 'same catalog reference returned for an unknown id');
    assert(
      d.removedWayIds.length === 0 && d.removedRouteIds.length === 0
        && d.removedLandmarkIds.length === 0 && d.removedRefLineIds.length === 0,
      'empty report for an unknown id',
    );
  }
});

// ============================================================ order preservation

test('catalogDelete: removing the middle of three ways preserves the order of everything that remains', () => {
  const seed = emptyCatalog();
  const cat: Catalog = {
    schemaVersion: 1,
    landmarks: ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => lm(id, LAT0 + i * 0.02, LON0)),
    routes: [
      { id: 'way:1', startLandmarkId: 'a', endLandmarkId: 'b', wayIds: ['route:1'] },
      { id: 'way:2', startLandmarkId: 'c', endLandmarkId: 'd', wayIds: ['route:2'] },
      { id: 'way:3', startLandmarkId: 'e', endLandmarkId: 'f', wayIds: ['route:3'] },
    ],
    ways: ['route:1', 'route:2', 'route:3'].map((id, i) => ({
      id, routeId: `way:${i + 1}`, refLineId: id, gateSetVersion: 1, seeded: false,
    })),
    gateSets: ['route:1', 'route:2', 'route:3'].map((id) => gs(id, 1)),
  };
  assert(validateCatalog(mergeCatalogs(seed, cat)).length === 0, 'fixture must validate');

  const d = removeRoute(cat, seed, 'way:2');
  assert(validateCatalog(mergeCatalogs(seed, d.next)).length === 0, 'must validate after delete');
  assert(d.next.routes.map((w) => w.id).join(',') === 'way:1,way:3', `way order preserved, got ${d.next.routes.map((w) => w.id)}`);
  assert(d.next.ways.map((r) => r.id).join(',') === 'route:1,route:3', `route order preserved, got ${d.next.ways.map((r) => r.id)}`);
  assert(d.next.landmarks.map((l) => l.id).join(',') === 'a,b,e,f', `landmark order preserved, got ${d.next.landmarks.map((l) => l.id)}`);
});
