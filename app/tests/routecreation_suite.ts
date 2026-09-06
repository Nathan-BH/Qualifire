/**
 * QA — retroactive way creation (OPEN-ITEMS item 2; COLD-START §3 steps 5–9;
 * WP-G route specifications/variants).
 * Pure half: draftWayCreation / buildWayCreationCatalog. Locks:
 *  1. an unmatched ride on an empty catalog drafts two new landmarks;
 *  2. degenerate rides (too short, <2 fixes) draft nothing;
 *  3. endpoints inside an existing disc reuse the landmark; near-misses get
 *     a shrunk radius; sub-MIN slivers reuse the squeezing place instead;
 *  4. a ride ending back at its own new start landmark drafts a loop;
 *  5. an existing (start,end) way drafts a VARIANT (WP-G: existingWayId set,
 *     no longer a refusal), while an existing landmark pair with no way
 *     still offers a brand-new way;
 *  6. the built catalog VALIDATES when merged, carries referenceRideId =
 *     the ride, refLineId = the route's own id, and the provisional 1%/99%
 *     start/finish gate pair.
 * The store seam (saveUserCatalog actually called, boot-time malformed-file
 * fix) lives in catalogstore_suite.ts, which owns the seed shim.
 */
import * as path from 'node:path';
import { assert, loadFixture, loadJson, test, TESTS_DIR } from './lib.ts';
import { emptyCatalog, mergeCatalogs, metresBetween, waysForRoute, validateCatalog } from '../src/store/catalog.ts';
import { scopeCatalog, type SportsFile } from '../src/store/sports.ts';
import {
  MATCHED_ENDPOINT_SLACK_M,
  MIN_LANDMARK_RADIUS_M,
  MIN_TRACK_LENGTH_M,
  NEW_LANDMARK_RADIUS_M,
  buildRouteCreationCatalog,
  cleanSpecs,
  draftRouteCreation,
  findWayWithSpecs,
  sameSpecs,
  trackLengthM,
  type RouteCreationDraft,
} from '../src/store/routeCreation.ts';
import type { Catalog, GateSet, Landmark, Way, Route } from '../src/store/types.ts';

const LAT0 = 50.87;
const LON0 = 4.70;
/** ~111.32 m per 0.001° lat at any longitude; fixture rides run due north. */
function northRide(nFixes: number, stepLat = 0.001): { lat: number; lon: number }[] {
  return Array.from({ length: nFixes }, (_, i) => ({ lat: LAT0 + i * stepLat, lon: LON0 }));
}
function lm(id: string, lat: number, lon: number, radiusM: number): Landmark {
  return { id, label: id, lat, lon, radiusM, activeFromMs: 0, activeUntilMs: null, offerAtStart: true };
}
function catWith(landmarks: Landmark[], routes: Route[] = [], ways: Way[] = []): Catalog {
  const c = emptyCatalog();
  c.landmarks = landmarks;
  c.routes = routes;
  c.ways = ways;
  return c;
}
const RIDE = { rideId: 'ride-t1', startedAtMs: 1_700_000_000_000 };

test('wayCreation: an unmatched ride on an empty catalog drafts two new default-radius landmarks', () => {
  const fixes = northRide(20); // ~2115 m
  const d = draftRouteCreation(emptyCatalog(), { ...RIDE, fixes });
  assert(d !== null, 'a real unmatched ride must draft');
  assert(d!.start.kind === 'new' && d!.end.kind === 'new', 'both endpoints are new places');
  assert(d!.start.landmarkId === 'lm:ride-t1:start' && d!.end.landmarkId === 'lm:ride-t1:end', 'ids derive from the rideId');
  assert(d!.start.draft!.radiusM === NEW_LANDMARK_RADIUS_M && d!.end.draft!.radiusM === NEW_LANDMARK_RADIUS_M,
    'nothing nearby: full default radius');
  assert(d!.loop === false, 'not a loop');
  assert(Math.abs(d!.trackLengthM - trackLengthM(fixes)) < 1e-9, 'ridden length carried');
  assert(d!.start.draft!.label === '' && d!.start.draft!.offerAtStart === true, 'unnamed yet, offerable at START');
  assert(d!.start.draft!.activeFromMs === RIDE.startedAtMs, 'active from the ride that bore it');
});

test('wayCreation: degenerate rides draft nothing', () => {
  assert(draftRouteCreation(emptyCatalog(), { ...RIDE, fixes: northRide(1) }) === null, '<2 fixes');
  assert(draftRouteCreation(emptyCatalog(), { ...RIDE, fixes: northRide(2, 0.0005) }) === null,
    `~56 m < MIN_TRACK_LENGTH_M (${MIN_TRACK_LENGTH_M})`);
});

test('wayCreation: an endpoint inside an existing disc reuses that landmark', () => {
  const home = lm('home', LAT0, LON0, 150);
  const d = draftRouteCreation(catWith([home]), { ...RIDE, fixes: northRide(20) });
  assert(d !== null && d!.start.kind === 'existing' && d!.start.landmarkId === 'home', 'start reused');
  assert(d!.end.kind === 'new', 'end (2.1 km away) is still new');
});

test('wayCreation: a near-miss endpoint gets a shrunk radius; a sub-MIN sliver reuses the place', () => {
  // Disc edge 50 m from the start fix: new radius must shrink to ~50 m.
  const near = lm('near', LAT0 - 0.0017966, LON0, 150); // ~200 m away, radius 150
  const d = draftRouteCreation(catWith([near]), { ...RIDE, fixes: northRide(20) });
  assert(d !== null && d!.start.kind === 'new', 'still a new place');
  const got = d!.start.draft!.radiusM;
  const gap = metresBetween({ lat: LAT0, lon: LON0 }, near) - near.radiusM;
  assert(Math.abs(got - gap) < 0.01 && got >= MIN_LANDMARK_RADIUS_M && got < NEW_LANDMARK_RADIUS_M,
    `shrunk to the clear gap (${gap.toFixed(1)} m), got ${got}`);
  // Disc edge ~20 m from the start fix: below MIN — that IS the place.
  const tight = lm('tight', LAT0 - 0.0015272, LON0, 150); // ~170 m away
  const d2 = draftRouteCreation(catWith([tight]), { ...RIDE, fixes: northRide(20) });
  assert(d2 !== null && d2!.start.kind === 'existing' && d2!.start.landmarkId === 'tight',
    'a sliver under MIN_LANDMARK_RADIUS_M reuses the squeezing landmark');
});

test('wayCreation: a ride ending back at its own new start landmark drafts a loop', () => {
  // Out ~500 m and back to ~55 m from the start: end lands inside the start
  // draft's default disc.
  const out = northRide(6, 0.001); // 0 .. 0.005
  const back = northRide(5, 0.001).reverse().map((p) => ({ lat: p.lat + 0.0005, lon: p.lon + 0.00001 }));
  const fixes = [...out, ...back]; // ends at LAT0+0.0005 => ~55.7 m from start
  const d = draftRouteCreation(emptyCatalog(), { ...RIDE, fixes });
  assert(d !== null, 'a 1.1 km loop drafts');
  assert(d!.loop === true, 'recognised as a loop');
  assert(d!.start.kind === 'new' && d!.end.landmarkId === d!.start.landmarkId, 'one landmark, both ends');
});

test('WP-G 0: an existing directed way drafts a VARIANT', () => {
  const a = lm('a', LAT0, LON0, 150);
  const b = lm('b', LAT0 + 0.019, LON0, 150);
  const linked = catWith([a, b], [{ id: 'w1', startLandmarkId: 'a', endLandmarkId: 'b', wayIds: ['r1'] }]);
  const d = draftRouteCreation(linked, { ...RIDE, fixes: northRide(20) });
  assert(d !== null, 'way exists in this direction: a variant offer now, never null');
  assert(d!.existingRouteId === 'w1', 'existingWayId names the way that already links a->b');
  assert(d!.start.kind === 'existing' && d!.end.kind === 'existing', 'both endpoints resolve to existing places');
  assert(d!.loop === false, 'not a loop');
  const unlinked = catWith([a, b]);
  const d2 = draftRouteCreation(unlinked, { ...RIDE, fixes: northRide(20) });
  assert(d2 !== null && d2!.existingRouteId === null && d2!.start.kind === 'existing' && d2!.end.kind === 'existing',
    'both places known but no way yet: brand-new-way offer, existingWayId null');
  // The REVERSE direction of an existing way is a different way (ways are
  // strictly directional) — it drafts a brand-new-way offer too.
  const reverse = catWith([a, b], [{ id: 'b>a', startLandmarkId: 'b', endLandmarkId: 'a', wayIds: ['r1'] }]);
  const d3 = draftRouteCreation(reverse, { ...RIDE, fixes: northRide(20) });
  assert(d3 !== null && d3!.existingRouteId === null, 'reverse direction still a different way: existingWayId null');
});

test('WP-1: a sport:2 ride between two discs already bound by a sport:1 Route drafts a NEW route (not a variant), stamped sport:2, reusing both landmarks', () => {
  const a = lm('a', LAT0, LON0, 150);
  const b = lm('b', LAT0 + 0.019, LON0, 150);
  const bikeRoute: Route = { id: 'r-bike', startLandmarkId: 'a', endLandmarkId: 'b', wayIds: ['w-bike'], sportId: 'sport:1' };
  const bikeWay: Way = { id: 'w-bike', routeId: 'r-bike', refLineId: 'w-bike', gateSetVersion: 1, seeded: false };
  const full = catWith([a, b], [bikeRoute], [bikeWay]);
  const sports: SportsFile = {
    schemaVersion: 1,
    sports: [{ id: 'sport:1', label: 'Bike', createdAtMs: 0 }, { id: 'sport:2', label: 'Run', createdAtMs: 1 }],
    activeSportId: 'sport:2',
  };

  // Exactly what routeFromRide.ts's draftRouteFromRide hands to
  // draftRouteCreation: all landmarks, only THIS sport's routes.
  const runScoped = scopeCatalog(full, 'sport:2', sports);
  assert(runScoped.routes.length === 0, 'sanity: sport:2 sees no routes in this scoped view (bikeRoute is sport:1)');

  const d = draftRouteCreation(runScoped, { ...RIDE, fixes: northRide(20), sportId: 'sport:2' });
  assert(d !== null, 'drafts');
  assert(d!.existingRouteId === null, 'no existing route in the sport:2-scoped view: a brand-new route, not a variant');
  assert(d!.start.kind === 'existing' && d!.start.landmarkId === 'a', 'reuses landmark a (shared, unscoped)');
  assert(d!.end.kind === 'existing' && d!.end.landmarkId === 'b', 'reuses landmark b (shared, unscoped)');
  assert(d!.sportId === 'sport:2', 'the draft carries the ride\'s own sport');

  const built = buildRouteCreationCatalog(emptyCatalog(), d!, { start: 'A', end: 'B' });
  assert(built.routes.length === 1 && built.routes[0].sportId === 'sport:2', 'the new Route is stamped sport:2');
  assert(built.routes[0].startLandmarkId === 'a' && built.routes[0].endLandmarkId === 'b', 'both landmark ids reused, no new landmark minted');
  assert(built.landmarks.length === 0, 'no new landmark was drafted at all — both endpoints already existed');

  // Sanity: the ORIGINAL (unscoped) sport:1 route is untouched by any of this.
  assert(full.routes[0].id === 'r-bike' && full.routes[0].sportId === 'sport:1', 'the bike route is never touched');
});

test('wayCreation: the built catalog validates when merged and carries the reference ride', () => {
  const fixes = northRide(20);
  const d = draftRouteCreation(emptyCatalog(), { ...RIDE, fixes })!;
  const built = buildRouteCreationCatalog(emptyCatalog(), d, { start: '  Home ', end: 'Work' });
  const errs = validateCatalog(mergeCatalogs(emptyCatalog(), built));
  assert(errs.length === 0, `merged result must validate, got: ${errs.join('; ')}`);
  assert(built.landmarks.length === 2 && built.landmarks[0].label === 'Home' && built.landmarks[1].label === 'Work',
    'names trimmed onto the new landmarks');
  const route = built.routes[0];
  const way = built.ways[0];
  const gs = built.gateSets[0];
  assert(route.id === 'route:ride-t1' && route.wayIds[0] === way.id, 'route links its way');
  assert(way.id === 'way:ride-t1' && way.routeId === route.id, 'way links its route');
  assert(way.referenceRideId === 'ride-t1', 'COLD-START §3 step 9: ride 1 IS the reference by default');
  assert(way.refLineId === way.id && way.seeded === false, 'refLineId self-id (unresolvable on purpose), not seeded');
  assert(gs.wayId === way.id && gs.version === 1 && gs.chainageM.length === 2, 'one provisional gate pair');
  const L = d.trackLengthM;
  assert(Math.abs(gs.chainageM[0] - 0.01 * L) < 1e-9 && Math.abs(gs.chainageM[1] - 0.99 * L) < 1e-9,
    'start/finish at 1%/99% of the ridden length (the settled default)');
  assert(typeof gs.note === 'string' && gs.note.includes('provisional'), 'the gate set says what it is');
});

test('wayCreation: a loop build needs (and gets) a loopDiscriminator and validates', () => {
  const out = northRide(6, 0.001);
  const back = northRide(5, 0.001).reverse().map((p) => ({ lat: p.lat + 0.0005, lon: p.lon + 0.00001 }));
  const d = draftRouteCreation(emptyCatalog(), { ...RIDE, fixes: [...out, ...back] })!;
  const built = buildRouteCreationCatalog(emptyCatalog(), d, { start: 'Home', end: '' });
  assert(built.landmarks.length === 1, 'a loop births ONE landmark');
  assert(built.routes[0].startLandmarkId === built.routes[0].endLandmarkId, 'loop way');
  assert(typeof built.routes[0].loopDiscriminator === 'string' && built.routes[0].loopDiscriminator!.length > 0,
    'loops are a real category and need a discriminator');
  const errs = validateCatalog(mergeCatalogs(emptyCatalog(), built));
  assert(errs.length === 0, `loop build must validate, got: ${errs.join('; ')}`);
});

test('wayCreation: a seeded build carries the 5-gate set, origin geometric, and validates', () => {
  const d = draftRouteCreation(emptyCatalog(), { ...RIDE, fixes: northRide(20) })!;
  const seed = { chainageM: [10, 250, 500, 750, 990] };
  const built = buildRouteCreationCatalog(emptyCatalog(), d, { start: 'Home', end: 'Work' }, seed);
  const gs = built.gateSets[0];
  assert(gs.chainageM.length === 5, '5 gates = 4 sectors (STATE.md ground rule)');
  assert(gs.chainageM.every((v, i) => v === seed.chainageM[i]), 'seed carried verbatim');
  assert(gs.origin === 'geometric', 'R&S §3 honesty clause: geometric, never silent');
  assert(gs.version === 1 && built.ways[0].gateSetVersion === 1, 'born at v1, no upgrade step');
  const errs = validateCatalog(mergeCatalogs(emptyCatalog(), built));
  assert(errs.length === 0, `seeded build must validate, got: ${errs.join('; ')}`);
});

test('wayCreation: the un-seeded fallback keeps the provisional pair, now flagged geometric', () => {
  const d = draftRouteCreation(emptyCatalog(), { ...RIDE, fixes: northRide(20) })!;
  const built = buildRouteCreationCatalog(emptyCatalog(), d, { start: 'Home', end: 'Work' });
  const gs = built.gateSets[0];
  assert(gs.chainageM.length === 2, 'no seed => the 1%/99% pair, unchanged');
  assert(gs.origin === 'geometric', 'the fallback pair is geometric too');
  assert(typeof gs.note === 'string' && gs.note.startsWith('provisional'), 'still says what it is');
});

// ------------------------------------------------------------ WP-F: the
// post-stop "save as new way" offer for ANY ride, not just unmatched ones.
// A ride the live engine locked onto some route X can still end somewhere no
// way of ours goes — matchedRouteId is evidence about WHERE the ride's
// endpoints sit, never a veto and never itself the source of an offer, and
// the matched-way endpoint guard (MATCHED_ENDPOINT_SLACK_M) exists purely to
// stop a fix a little outside X's own landmark disc from drafting as a
// spurious brand-new place (the latelock_20260805 regression, §2.5).

/** Point `metresN` due north of p (same flat-earth metric as the store). */
function northOf(p: { lat: number; lon: number }, metresN: number): { lat: number; lon: number } {
  return { lat: p.lat + metresN / 111320, lon: p.lon };
}
/** Point `metresE` due east of p. */
function eastOf(p: { lat: number; lon: number }, metresE: number): { lat: number; lon: number } {
  const meanLat = p.lat;
  return { lat: p.lat, lon: p.lon + metresE / (111320 * Math.cos((meanLat * Math.PI) / 180)) };
}

const A0 = { lat: LAT0, lon: LON0 };
const B0 = northOf(A0, 2115); // ~2115 m north of a — same separation northRide(20) covers
const a = lm('a', A0.lat, A0.lon, 150);
const b = lm('b', B0.lat, B0.lon, 150);
const routeAB: Route = { id: 'a>b', startLandmarkId: 'a', endLandmarkId: 'b', wayIds: ['r-ab'] };
const wayAB: Way = { id: 'r-ab', routeId: 'a>b', refLineId: 'r-ab', gateSetVersion: 1, seeded: true };

test('WP-F 1: the gap case — a matched-but-different-endpoint ride still offers (the point of the WP)', () => {
  const g = lm('g', A0.lat, eastOf(A0, 2200).lon, 150);
  const cat = catWith([a, b, g], [routeAB], [wayAB]);
  const fixes = [A0, eastOf(A0, 2200)]; // a -> g, NOT a -> b
  for (const matchedWayId of ['r-ab', null] as (string | null)[]) {
    const d = draftRouteCreation(cat, { ...RIDE, fixes, matchedWayId });
    assert(d !== null, `matchedRouteId=${matchedWayId}: a->g (no way there) must draft, not null`);
    assert(d!.start.kind === 'existing' && d!.start.landmarkId === 'a', 'start is the known place a');
    assert(d!.end.kind === 'existing' && d!.end.landmarkId === 'g', 'end is the known (different) place g');
  }
});

test('WP-F 2 (WP-G): an existing pair drafts a variant regardless of the engine verdict (matching vs mismatching vs null)', () => {
  const cat = catWith([a, b], [routeAB], [wayAB]);
  const fixes = [A0, B0]; // a -> b, exactly the way that already exists
  for (const matchedWayId of ['r-ab', 'some-other-route', null] as (string | null)[]) {
    const d = draftRouteCreation(cat, { ...RIDE, fixes, matchedWayId });
    assert(d !== null && d!.existingRouteId === routeAB.id,
      `matchedRouteId=${matchedWayId}: existing (a,b) pair drafts a variant on wayAB regardless`);
    assert(d!.matchedWayId === matchedWayId, `matchedRouteId=${matchedWayId}: still round-trips onto the draft`);
  }
});

test('WP-F 3 (WP-G): slack snap — the latelock regression guard, start side', () => {
  // 225 m from a's centre (150 m radius): 75 m past the edge, same margin
  // §2.5 measured on latelock_20260805's real first fix.
  const startFix = northOf(A0, 225);
  const cat = catWith([a, b], [routeAB], [wayAB]);
  const fixes = [startFix, B0]; // end lands exactly inside b
  const matched = draftRouteCreation(cat, { ...RIDE, fixes, matchedWayId: 'r-ab' });
  // WP-G: the pair (a,b) already existing is no longer a refusal — the snap
  // still happens (start resolves to the existing landmark a, not a phantom
  // new place 75 m past its edge), but the result is now a variant offer on
  // wayAB rather than null.
  assert(matched !== null && matched!.existingRouteId === routeAB.id
      && matched!.start.kind === 'existing' && matched!.start.landmarkId === 'a'
      && matched!.end.kind === 'existing' && matched!.end.landmarkId === 'b',
    'matched: the 75 m-past-edge start still snaps to a; pair (a,b) already exists -> variant offer on wayAB');
  const unmatched = draftRouteCreation(cat, { ...RIDE, fixes, matchedWayId: null });
  assert(unmatched !== null && unmatched!.start.kind === 'new' && unmatched!.end.kind === 'existing',
    'unmatched: today\'s behaviour preserved — new start, existing end');
});

test('WP-F 3b (WP-G): slack snap mirrored on the end side', () => {
  const endFix = northOf(B0, 225); // 75 m past b's edge
  const cat = catWith([a, b], [routeAB], [wayAB]);
  const fixes = [A0, endFix]; // start lands exactly inside a
  const matched = draftRouteCreation(cat, { ...RIDE, fixes, matchedWayId: 'r-ab' });
  assert(matched !== null && matched!.existingRouteId === routeAB.id
      && matched!.start.kind === 'existing' && matched!.start.landmarkId === 'a'
      && matched!.end.kind === 'existing' && matched!.end.landmarkId === 'b',
    'matched: the 75 m-past-edge end still snaps to b; pair (a,b) already exists -> variant offer on wayAB');
  const unmatched = draftRouteCreation(cat, { ...RIDE, fixes, matchedWayId: null });
  assert(unmatched !== null && unmatched!.start.kind === 'existing' && unmatched!.end.kind === 'new',
    'unmatched: today\'s behaviour preserved — existing start, new end');
});

test('WP-F 4: the slack never swallows a different known place or a genuinely far new place', () => {
  // Start lands inside a DIFFERENT landmark c — must stay c regardless of
  // matchedRouteId (Gym->Home->Work still offers Gym->Work).
  const c = lm('c', eastOf(A0, 5000).lat, eastOf(A0, 5000).lon, 150);
  const cat1 = catWith([a, b, c], [routeAB], [wayAB]);
  const fixesC = [eastOf(A0, 5000), B0];
  for (const matchedWayId of ['r-ab', null] as (string | null)[]) {
    const d = draftRouteCreation(cat1, { ...RIDE, fixes: fixesC, matchedWayId });
    assert(d !== null && d!.start.kind === 'existing' && d!.start.landmarkId === 'c',
      `matchedRouteId=${matchedWayId}: start must stay the DIFFERENT known place c, not snap to a`);
  }
  // End 2 km past b's own edge stays new — the genuine Home->Work->Shop case.
  assert(2000 > MATCHED_ENDPOINT_SLACK_M, 'sanity: 2 km is well beyond the slack');
  const farEnd = northOf(B0, 150 + 2000);
  const cat2 = catWith([a, b], [routeAB], [wayAB]);
  const d2 = draftRouteCreation(cat2, { ...RIDE, fixes: [A0, farEnd], matchedWayId: 'r-ab' });
  assert(d2 !== null && d2!.end.kind === 'new', '2 km past the way\'s end stays a genuinely new place');
});

test('WP-F 5: an unknown or stale matchedRouteId behaves exactly like null', () => {
  const startFix = northOf(A0, 225); // same 75 m-past-edge scenario as WP-F 3
  const cat = catWith([a, b], [routeAB], [wayAB]);
  const fixes = [startFix, B0];
  const withNull = draftRouteCreation(cat, { ...RIDE, fixes, matchedWayId: null });
  const withUnknownWay = draftRouteCreation(cat, { ...RIDE, fixes, matchedWayId: 'no-such-route' });
  assert(withUnknownWay !== null
      && withUnknownWay!.start.kind === withNull!.start.kind
      && withUnknownWay!.end.kind === withNull!.end.kind,
    'an unknown route id must degrade exactly like matchedRouteId: null');
  // A route whose OWN wayId is missing from the catalog is just as stale.
  const staleWay: Way = { id: 'r-stale', routeId: 'way-does-not-exist', refLineId: 'r-stale', gateSetVersion: 1, seeded: true };
  const catStale = catWith([a, b], [routeAB], [wayAB, staleWay]);
  const withStaleRoute = draftRouteCreation(catStale, { ...RIDE, fixes, matchedWayId: 'r-stale' });
  assert(withStaleRoute !== null
      && withStaleRoute!.start.kind === withNull!.start.kind
      && withStaleRoute!.end.kind === withNull!.end.kind,
    'a route whose way id is missing must also degrade like null, never throw');
});

test('WP-F 6 (WP-G): real fixtures against the shipped seed catalog — matched, no other way ⇒ variant offer on that seed way', () => {
  // Same read-only-JSON pattern as store_suite.ts: this file's own module
  // graph must not statically import store/seed.ts (it pulls in the bare
  // catalog.seed.json import, which plain Node ESM cannot load without the
  // registerHooks dance other suites use for it — unneeded here since we only
  // need the shipped catalog's DATA, not the seed-mode selection logic).
  const seed = loadJson<Catalog>(path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  const homeWorkRouteId = seed.ways.find((r) => r.id === 'Morning')?.routeId;
  assert(typeof homeWorkRouteId === 'string', 'fixture sanity: the seed has a Morning route with a wayId');
  for (const name of ['latelock_20260805', 'clean_morning']) {
    const f = loadFixture(name);
    assert(f.track === 'Morning', `fixture sanity: ${name} expected track Morning, got ${f.track}`);
    const fixes = f.fixes.lat.map((lat, i) => ({ lat, lon: f.fixes.lon[i] }));
    const d = draftRouteCreation(seed, {
      rideId: `real-${name}`,
      startedAtMs: 1_700_000_000_000,
      fixes,
      matchedWayId: 'Morning',
    });
    assert(d !== null && d!.existingRouteId === homeWorkRouteId,
      `${name}: home->work already exists as a way — variant offer on it, got ${JSON.stringify(d)}`);
  }
});

test('WP-F 7: WayCreationDraft.matchedRouteId round-trips and buildWayCreationCatalog ignores it', () => {
  const fixes = northRide(20);
  const d = draftRouteCreation(emptyCatalog(), { ...RIDE, fixes, matchedWayId: 'some-route' })!;
  assert(d.matchedWayId === 'some-route', 'matchedRouteId carried onto the draft unchanged');
  const dNone = draftRouteCreation(emptyCatalog(), { ...RIDE, fixes })!;
  assert(dNone.matchedWayId === null, 'no matchedRouteId given => null on the draft, not undefined-forever');
  const built = buildRouteCreationCatalog(emptyCatalog(), d, { start: 'Home', end: 'Work' });
  const errs = validateCatalog(mergeCatalogs(emptyCatalog(), built));
  assert(errs.length === 0, `build must still validate, got: ${errs.join('; ')}`);
  assert(!JSON.stringify(built).includes('some-route'), 'matchedRouteId must never leak into the built catalog');
});

// ------------------------------------------------------------ WP-G: route
// specifications/variants — a second Route on an existing Way, named by
// free-text spec segments, instead of today's silent no-offer.

/** Helper: a variant draft on an existing way, both endpoints already known. */
function variantDraft(rideId: string, routeId: string, startId: string, endId: string): RouteCreationDraft {
  return {
    rideId,
    startedAtMs: RIDE.startedAtMs,
    start: { kind: 'existing', landmarkId: startId },
    end: { kind: 'existing', landmarkId: endId },
    loop: startId === endId,
    trackLengthM: 2000,
    matchedWayId: null,
    existingRouteId: routeId,
    sportId: null,
  };
}

test('WP-G 1: variant build on a user way', () => {
  const wa = lm('a', LAT0, LON0, 150);
  const wb = lm('b', LAT0 + 0.019, LON0, 150);
  const w1: Route = { id: 'w1', startLandmarkId: 'a', endLandmarkId: 'b', wayIds: ['r1'] };
  const r1: Way = { id: 'r1', routeId: 'w1', refLineId: 'r1', gateSetVersion: 1, seeded: false };
  const userCat = catWith([wa, wb], [w1], [r1]);
  userCat.gateSets = [{ wayId: 'r1', version: 1, chainageM: [10, 990], createdAtMs: 0 }];
  const draft = variantDraft('ride-t1', 'w1', 'a', 'b');
  const built = buildRouteCreationCatalog(userCat, draft, { start: '', end: '', specs: [' Dry ', '', 'Fast'] });
  assert(built.landmarks.length === userCat.landmarks.length, 'no new landmark');
  assert(built.routes.length === userCat.routes.length, 'ways.length unchanged');
  assert(JSON.stringify(built.routes[0].wayIds) === JSON.stringify(['r1', 'way:ride-t1']),
    'w1.wayIds deep-equals [r1, way:ride-t1]');
  const way = built.ways[built.ways.length - 1];
  assert(way.routeId === 'w1' && way.refLineId === 'way:ride-t1' && way.referenceRideId === 'ride-t1',
    'new way on w1, self-refLineId, referenceRideId set');
  assert(JSON.stringify(way.specs) === JSON.stringify(['Dry', 'Fast']), 'specs trimmed, empty dropped, order kept');
  assert(built.gateSets.length === userCat.gateSets.length + 1, 'one new gate set');
  const errs = validateCatalog(mergeCatalogs(emptyCatalog(), built));
  assert(errs.length === 0, `merged result must validate, got: ${errs.join('; ')}`);
});

test('WP-G 2: variant on a SEED-owned way', () => {
  const wa = lm('a', LAT0, LON0, 150);
  const wb = lm('b', LAT0 + 0.019, LON0, 150);
  const w1: Route = { id: 'w1', startLandmarkId: 'a', endLandmarkId: 'b', wayIds: ['r1'] };
  const r1: Way = { id: 'r1', routeId: 'w1', refLineId: 'r1', gateSetVersion: 1, seeded: true };
  const seed = catWith([wa, wb], [w1], [r1]);
  seed.gateSets = [{ wayId: 'r1', version: 1, chainageM: [10, 990], createdAtMs: 0 }];
  const userCat = emptyCatalog(); // the way is seed-owned — NOT in userCat
  const draft = variantDraft('ride-t2', 'w1', 'a', 'b');
  const built = buildRouteCreationCatalog(userCat, draft, { start: '', end: '', specs: ['Wet'] });
  assert(JSON.stringify(built.routes) === JSON.stringify(userCat.routes), 'userCat.ways untouched — a seed way is not ours to edit');
  const way = built.ways.find((r) => r.id === 'way:ride-t2');
  assert(way !== undefined && way.routeId === 'w1', 'the new way points at the seed route by id');
  const merged = mergeCatalogs(seed, built);
  const errs = validateCatalog(merged);
  assert(errs.length === 0, `merged result must validate, got: ${errs.join('; ')}`);
  assert(waysForRoute(merged, 'w1').some((r) => r.id === 'way:ride-t2'),
    'waysForRoute resolves the variant by routeId, not route.wayIds (validateCatalog never requires the inverse link)');
});

test('WP-G 3: no specs given, or all-whitespace specs, => no specs field on the route (byte-identical)', () => {
  const fixes = northRide(20);
  const d = draftRouteCreation(emptyCatalog(), { ...RIDE, fixes })!;
  const builtNoSpecs = buildRouteCreationCatalog(emptyCatalog(), d, { start: 'Home', end: 'Work' });
  assert(!('specs' in builtNoSpecs.ways[0]), 'no names.specs at all: route carries no specs property');
  const builtBlankSpecs = buildRouteCreationCatalog(emptyCatalog(), d, { start: 'Home', end: 'Work', specs: ['', '  '] });
  assert(!('specs' in builtBlankSpecs.ways[0]), 'all-whitespace specs: still no specs property, never []');
  assert(JSON.stringify(builtNoSpecs) === JSON.stringify(builtBlankSpecs), 'the two builds are byte-identical');
});

test('WP-G 4: specs on a brand-new way land trimmed on its first route; way/landmarks unaffected', () => {
  const fixes = northRide(20);
  const d = draftRouteCreation(emptyCatalog(), { ...RIDE, fixes })!;
  const builtPlain = buildRouteCreationCatalog(emptyCatalog(), d, { start: 'Home', end: 'Work' });
  const builtSpecs = buildRouteCreationCatalog(emptyCatalog(), d, { start: 'Home', end: 'Work', specs: [' Dry ', 'Fast'] });
  assert(JSON.stringify(builtSpecs.landmarks) === JSON.stringify(builtPlain.landmarks), 'landmarks unaffected by specs');
  assert(JSON.stringify(builtSpecs.routes) === JSON.stringify(builtPlain.routes), 'the way itself unaffected by specs');
  assert(JSON.stringify(builtSpecs.ways[0].specs) === JSON.stringify(['Dry', 'Fast']), 'specs trimmed onto the new route');
  const errs = validateCatalog(mergeCatalogs(emptyCatalog(), builtSpecs));
  assert(errs.length === 0, `must validate, got: ${errs.join('; ')}`);
});

test('WP-G 5: cleanSpecs / sameSpecs', () => {
  assert(JSON.stringify(cleanSpecs([' Dry ', '', '  Fast  '])) === JSON.stringify(['Dry', 'Fast']), 'trims and drops empties');
  assert(JSON.stringify(cleanSpecs(undefined)) === JSON.stringify([]), 'undefined => []');
  assert(sameSpecs(['Dry', 'Fast'], ['dry', 'fast']) === true, 'case-insensitive positional equality');
  assert(sameSpecs(['Dry', 'Fast'], ['Fast', 'Dry']) === false, 'order matters — reversed is a different spec path');
  assert(sameSpecs([], []) === true, 'both empty: equal (the plain route)');
});

test('WP-G 6: findRouteWithSpecs', () => {
  const rDry: Way = { id: 'r-dry', routeId: 'w1', refLineId: 'r-dry', gateSetVersion: 1, seeded: false, specs: ['Dry'] };
  const rDryFast: Way = { id: 'r-dry-fast', routeId: 'w1', refLineId: 'r-dry-fast', gateSetVersion: 1, seeded: false, specs: ['Dry', 'Fast'] };
  const rPlain: Way = { id: 'r-plain', routeId: 'w1', refLineId: 'r-plain', gateSetVersion: 1, seeded: false };
  const c = catWith([], [], [rDry, rDryFast, rPlain]);
  assert(findWayWithSpecs(c, 'w1', ['dry'])?.id === 'r-dry', 'case-insensitive hit');
  assert(findWayWithSpecs(c, 'w2', ['Dry']) === null, 'a matching list on a DIFFERENT way is a miss');
  assert(findWayWithSpecs(c, 'w1', ['Dry', 'Fast'])?.id === 'r-dry-fast', 'the longer list finds the OTHER route — prefix is not equality');
  assert(findWayWithSpecs(c, 'w1', [])?.id === 'r-plain', '[] finds the plain route');
});

test('WP-G 7: validateCatalog — spec shape and per-way duplicate specs', () => {
  const wa = lm('a', LAT0, LON0, 150);
  const wb = lm('b', LAT0 + 0.019, LON0, 150);
  const gs = (wayId: string): GateSet => ({ wayId, version: 1, chainageM: [10, 990], createdAtMs: 0 });

  // Two routes on one way with case-different-but-equal specs => one error naming both.
  const w1: Route = { id: 'w1', startLandmarkId: 'a', endLandmarkId: 'b', wayIds: ['r1', 'r2'] };
  const r1: Way = { id: 'r1', routeId: 'w1', refLineId: 'r1', gateSetVersion: 1, seeded: false, specs: ['Dry'] };
  const r2: Way = { id: 'r2', routeId: 'w1', refLineId: 'r2', gateSetVersion: 1, seeded: false, specs: ['dry'] };
  const c1 = catWith([wa, wb], [w1], [r1, r2]);
  c1.gateSets = [gs('r1'), gs('r2')];
  const errs1 = validateCatalog(c1);
  assert(errs1.some((e) => e.includes('r1') && e.includes('r2')), `expected one error naming both routes, got ${JSON.stringify(errs1)}`);

  // Two PLAIN routes (no specs at all) on one way stay legal — the seed's own shape.
  const r1p: Way = { id: 'r1', routeId: 'w1', refLineId: 'r1', gateSetVersion: 1, seeded: false };
  const r2p: Way = { id: 'r2', routeId: 'w1', refLineId: 'r2', gateSetVersion: 1, seeded: false };
  const c2 = catWith([wa, wb], [w1], [r1p, r2p]);
  c2.gateSets = [gs('r1'), gs('r2')];
  const errs2 = validateCatalog(c2);
  assert(!errs2.some((e) => e.includes('share specs')), `two plain routes must not be flagged, got ${JSON.stringify(errs2)}`);

  // Malformed specs: not trimmed / empty string.
  const w1b: Route = { id: 'w1', startLandmarkId: 'a', endLandmarkId: 'b', wayIds: ['r3', 'r4'] };
  const r3: Way = { id: 'r3', routeId: 'w1', refLineId: 'r3', gateSetVersion: 1, seeded: false, specs: [''] };
  const r4: Way = { id: 'r4', routeId: 'w1', refLineId: 'r4', gateSetVersion: 1, seeded: false, specs: [' Dry'] };
  const c3 = catWith([wa, wb], [w1b], [r3, r4]);
  c3.gateSets = [gs('r3'), gs('r4')];
  const errs3 = validateCatalog(c3);
  assert(errs3.filter((e) => e.includes('trimmed non-empty')).length === 2, `both malformed routes flagged, got ${JSON.stringify(errs3)}`);

  // The same list on a route of ANOTHER way: no error.
  const wb2 = lm('b2', LAT0 + 0.038, LON0, 150);
  const w1only: Route = { id: 'w1', startLandmarkId: 'a', endLandmarkId: 'b', wayIds: ['r1'] };
  const w2: Route = { id: 'w2', startLandmarkId: 'a', endLandmarkId: 'b2', wayIds: ['r5'] };
  const r1only: Way = { id: 'r1', routeId: 'w1', refLineId: 'r1', gateSetVersion: 1, seeded: false, specs: ['Dry'] };
  const r5: Way = { id: 'r5', routeId: 'w2', refLineId: 'r5', gateSetVersion: 1, seeded: false, specs: ['Dry'] };
  const c4 = catWith([wa, wb, wb2], [w1only, w2], [r1only, r5]);
  c4.gateSets = [gs('r1'), gs('r5')];
  const errs4 = validateCatalog(c4);
  assert(!errs4.some((e) => e.includes('share specs')), `same specs on different ways must not be flagged, got ${JSON.stringify(errs4)}`);

  // Inspect (WP-G): a non-array `specs` (hand-edited file) is REPORTED, never
  // thrown — the per-way duplicate loop must not call .map on it.
  const r6 = { id: 'r6', routeId: 'w1', refLineId: 'r6', gateSetVersion: 1, seeded: false, specs: 'Dry' as unknown as string[] } as Way;
  const c5 = catWith([wa, wb], [w1only], [r6]);
  c5.gateSets = [gs('r6')];
  let errs5: string[] = [];
  let threw = false;
  try { errs5 = validateCatalog(c5); } catch { threw = true; }
  assert(!threw, 'validateCatalog must not throw on a non-array specs');
  assert(errs5.some((e) => e.includes('trimmed non-empty')), `non-array specs reported as a shape error, got ${JSON.stringify(errs5)}`);
});

test('WP-G 8: an existing loop way drafts a variant, not a second loop way', () => {
  const home = lm('loopplace', LAT0, LON0, 150);
  const loopRoute: Route = {
    id: 'loop:existing', startLandmarkId: 'loopplace', endLandmarkId: 'loopplace',
    loopDiscriminator: 'loop:existing', wayIds: ['r-loop'],
  };
  const rLoop: Way = { id: 'r-loop', routeId: 'loop:existing', refLineId: 'r-loop', gateSetVersion: 1, seeded: false };
  const cat = catWith([home], [loopRoute], [rLoop]);
  cat.gateSets = [{ wayId: 'r-loop', version: 1, chainageM: [10, 990], createdAtMs: 0 }];
  // A ride that starts and ends exactly at the existing loop place.
  const out = northRide(6, 0.001);
  const back = [...out].reverse();
  const fixes = [...out, ...back];
  const d = draftRouteCreation(cat, { ...RIDE, fixes });
  assert(d !== null, 'a real loop ride on an existing loop place drafts');
  assert(d!.loop === true, 'recognised as a loop');
  assert(d!.start.kind === 'existing' && d!.end.kind === 'existing' && d!.start.landmarkId === 'loopplace',
    'both ends resolve to the existing loop place');
  assert(d!.existingRouteId === 'loop:existing', 'the existing loop way is offered as a variant, not a new way');
  const built = buildRouteCreationCatalog(cat, d!, { start: '', end: '', specs: ['Alt'] });
  assert(built.routes.length === cat.routes.length, 'no second loop way minted');
  assert(built.ways.length === cat.ways.length + 1, 'one new route on the existing loop way');
  const errs = validateCatalog(mergeCatalogs(emptyCatalog(), built));
  assert(errs.length === 0, `merged loop-variant catalog must validate, got: ${errs.join('; ')}`);
});

test('WP-G 9: an END-side sub-MIN sliver reuses the pre-existing landmark (not the start draft) and the build pushes only the start', () => {
  const tight = lm('tight', LAT0 + 0.019 + 0.0015272, LON0, 150);
  const cat = catWith([tight]);
  const d = draftRouteCreation(cat, { ...RIDE, fixes: northRide(20) });
  assert(
    metresBetween({ lat: LAT0 + 0.019, lon: LON0 }, tight) - tight.radiusM < MIN_LANDMARK_RADIUS_M,
    'sanity: the fixture end fix sits in the sub-MIN sliver band around tight',
  );
  assert(d !== null, 'a real ride drafts');
  assert(d!.start.kind === 'new' && d!.start.draft!.radiusM === NEW_LANDMARK_RADIUS_M,
    'the far-away disc does not squeeze the start');
  assert(d!.end.kind === 'existing' && d!.end.landmarkId === 'tight', 'the end-side sliver reuses the pre-existing landmark');
  assert(d!.end.draft === undefined, 'no draft on an existing-kind endpoint');
  assert(d!.loop === false, 'not a loop');
  assert(d!.existingRouteId === null, 'no existing way between a fresh start and tight');
  const built = buildRouteCreationCatalog(cat, d!, { start: 'Home', end: '' });
  assert(built.landmarks.length === 2, 'the pre-existing tight plus exactly one new landmark');
  assert(built.landmarks.some((l) => l.id === 'lm:ride-t1:start' && l.label === 'Home'), 'the new start landmark is named Home');
  assert(!built.landmarks.some((l) => l.id === 'lm:ride-t1:end'), 'no end landmark minted');
  assert(built.routes[0].startLandmarkId === 'lm:ride-t1:start' && built.routes[0].endLandmarkId === 'tight',
    'the way runs from the new start landmark to the reused tight landmark');
  assert(built.routes[0].loopDiscriminator === undefined, 'not a loop way');
  const errs9 = validateCatalog(mergeCatalogs(emptyCatalog(), built));
  assert(errs9.length === 0, `merged result must validate, got: ${errs9.join('; ')}`);
});

test('WP-G 10: a loop from and back to an EXISTING landmark with no loop way yet builds a new loop way and mints no landmark', () => {
  const home = lm('home', LAT0, LON0, 150);
  const cat = catWith([home]);
  const out = northRide(6, 0.001);
  const fixes = [...out, ...[...out].reverse()];
  const d = draftRouteCreation(cat, { ...RIDE, fixes });
  assert(d !== null, 'a real loop ride drafts');
  assert(d!.start.kind === 'existing' && d!.start.landmarkId === 'home', 'start resolves to the existing home landmark');
  assert(d!.end.kind === 'existing' && d!.end.landmarkId === 'home', 'end resolves to the existing home landmark');
  assert(d!.loop === true, 'recognised as a loop');
  assert(d!.existingRouteId === null, 'no loop way on home yet');
  const built = buildRouteCreationCatalog(cat, d!, { start: '', end: '' });
  assert(built.landmarks.length === cat.landmarks.length, 'zero landmarks minted: the loop place already exists');
  assert(built.routes.length === 1, 'exactly one way built');
  assert(built.routes[0].startLandmarkId === 'home' && built.routes[0].endLandmarkId === 'home', 'the new way loops on home');
  assert(typeof built.routes[0].loopDiscriminator === 'string' && built.routes[0].loopDiscriminator!.length > 0,
    'loops are a real category and need a discriminator');
  assert(built.ways.length === 1 && built.ways[0].routeId === built.routes[0].id && built.ways[0].referenceRideId === 'ride-t1',
    'one new route referencing this ride, on the new way');
  const errs10 = validateCatalog(mergeCatalogs(emptyCatalog(), built));
  assert(errs10.length === 0, `merged result must validate, got: ${errs10.join('; ')}`);
});

// ============================================================ WP-H §3.3b:
// promoteRideToReference ("make this ride the reference of an EXISTING
// route" — reset, not remap; Nathan's 2026-09-04 ruling). This needs the
// full catalog/results/user-ref store stack, unlike this file's pure
// functions above, so it gets its own registerHooks + dynamic-import
// section — same shim as resultsstore_suite.ts/catalogstore_suite.ts.
// §5.4's draftWayFromRide/createWayFromDraft/saveAdjustedGates cases (16-18,
// plus the WP-G variant case the 2026-09-04 Fable ruling added) follow the
// promote cases below, on the same harness.
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { encodeEnd, encodeFix, encodeHeader } from '../src/storage/jsonl.ts';
import { createMemoryFsAdapter, type FsAdapter } from '../src/storage/fsAdapter.ts';
import { RESULT_SCHEMA_VERSION as WPH_RESULT_SCHEMA_VERSION } from '../src/store/types.ts';
import type { RideResult as WphRideResult } from '../src/store/types.ts';

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const wphCatalogStore = await import('../src/store/catalogStore.ts');
const wphResultsStore = await import('../src/store/resultsStore.ts');
const wphUserRefs = await import('../src/live/userRefs.ts');
const wphRouteFromRide = await import('../src/store/routeFromRide.ts');

const WPH_LAT0 = 51.30;
const WPH_LON0 = 4.50;

/** A straight synthetic ride with real timestamps (2 s apart), long enough
 * (with nFixes>=200-ish at stepDeg 0.0002 ~ 22 m/fix) to clear
 * MIN_TRACK_LENGTH_M when nFixes is large, and deliberately too short when
 * nFixes is small. */
function wphFixes(nFixes: number, stepDeg: number, startS: number) {
  const t: number[] = []; const lat: number[] = []; const lon: number[] = [];
  for (let i = 0; i < nFixes; i++) {
    t.push(startS + i * 2);
    lat.push(WPH_LAT0 + i * stepDeg);
    lon.push(WPH_LON0);
  }
  return { t, lat, lon };
}

async function wphWriteRideFile(
  fs: FsAdapter, rideId: string, fixes: { t: number[]; lat: number[]; lon: number[] },
): Promise<void> {
  const { t, lat, lon } = fixes;
  let text = encodeHeader(rideId, t[0] * 1000);
  for (let i = 0; i < t.length; i++) text += encodeFix({ tUnixMs: t[i] * 1000, lat: lat[i], lon: lon[i] });
  text += encodeEnd(t[t.length - 1] * 1000, t.length);
  await fs.ensureDir('rides');
  await fs.writeText(`rides/${rideId}.jsonl`, text);
}

function wphGhost(rideId: string, movingS: number): WphRideResult {
  return {
    kind: 'rideResult',
    schemaVersion: WPH_RESULT_SCHEMA_VERSION,
    rideId,
    startedAtMs: 1_700_000_000_000,
    wayId: 'WphRoute',
    source: 'app',
    lap: { rawS: movingS, movingS, quality: 'clean' },
    sectors: [{ index: 1, fromChainageM: 0, toChainageM: 1900, rawS: movingS, movingS, quality: 'clean' }],
    derivedBy: { engineVersion: 'e1', gateSetVersion: 1, resultSchemaVersion: WPH_RESULT_SCHEMA_VERSION },
  };
}

/** A user catalog with one non-seed route already referenced by 'oldref1',
 * gate-set v1. Fresh landmark/way ids on every call so tests never collide. */
function wphUserCatalog() {
  const c = emptyCatalog();
  c.landmarks = [
    lm('wph-a', WPH_LAT0, WPH_LON0, 150),
    lm('wph-b', WPH_LAT0 + 0.02, WPH_LON0, 150),
  ];
  c.routes = [{ id: 'wph-a>wph-b', startLandmarkId: 'wph-a', endLandmarkId: 'wph-b', wayIds: ['WphRoute'] }];
  c.ways = [{
    id: 'WphRoute', routeId: 'wph-a>wph-b', refLineId: 'WphRoute',
    gateSetVersion: 1, seeded: false, referenceRideId: 'oldref1',
  }];
  c.gateSets = [{ wayId: 'WphRoute', version: 1, chainageM: [50, 500, 1000, 1500, 1950], createdAtMs: 0 }];
  return c;
}

/** Boots the catalog/results/refs stack fresh with a memory fs and the
 * WphRoute user catalog seeded, plus 3 pre-existing "ghost" results on it. */
async function wphSetup(): Promise<{ fs: ReturnType<typeof createMemoryFsAdapter> }> {
  wphCatalogStore.resetCatalogStoreForTests();
  wphResultsStore.resetResultsStoreForTests();
  wphUserRefs.resetUserRefsForTests();
  const fs = createMemoryFsAdapter();
  await wphCatalogStore.initCatalogStore(fs);
  const errs = await wphCatalogStore.saveUserCatalog(wphUserCatalog());
  await wphCatalogStore.flushCatalogWrites();
  assert(errs.length === 0, `wphSetup: user catalog must save clean, got ${errs.join('; ')}`);
  await wphResultsStore.initResultsStore(fs);
  await wphUserRefs.initUserRefs(fs);
  for (const [id, s] of [['ghost1', 800], ['ghost2', 810], ['ghost3', 790]] as const) {
    await wphResultsStore.saveResult(wphGhost(id, s));
  }
  await wphResultsStore.flushResultWrites();
  return { fs };
}

test('WP-H 22 (promoteRideToReference): happy path rewrites the catalog — referenceRideId, new gate-set version, geometry changes', async () => {
  const { fs } = await wphSetup();
  const newRideId = 'promoted1';
  await wphWriteRideFile(fs, newRideId, wphFixes(200, 0.0002, 1_700_100_000));

  const out = await wphRouteFromRide.promoteRideToReference('WphRoute', newRideId, fs);
  assert(out.ok, `expected success, got ${JSON.stringify(out)}`);
  if (!out.ok) return;
  assert(out.gateSetVersion === 2, `expected the new gate set to be version 2, got ${out.gateSetVersion}`);

  const way = wphCatalogStore.userCatalog().ways.find((r) => r.id === 'WphRoute')!;
  assert(way.referenceRideId === newRideId, `route.referenceRideId must be rewritten to ${newRideId}, got ${way.referenceRideId}`);
  assert(way.gateSetVersion === 2, `route.gateSetVersion must be bumped to 2, got ${way.gateSetVersion}`);
  assert(way.refLineId === 'WphRoute', 'refLineId must stay the route\'s own id — a reset, not a remap');
});

test('WP-H 23 (promoteRideToReference): overwrites the reference line in place — the OLD v1 gate set survives, a NEW v2 one appears with different chainages', async () => {
  const { fs } = await wphSetup();
  const newRideId = 'promoted2';
  await wphWriteRideFile(fs, newRideId, wphFixes(200, 0.0002, 1_700_100_000));
  await wphRouteFromRide.promoteRideToReference('WphRoute', newRideId, fs);

  const cat = wphCatalogStore.userCatalog();
  const v1 = cat.gateSets.find((g) => g.wayId === 'WphRoute' && g.version === 1);
  const v2 = cat.gateSets.find((g) => g.wayId === 'WphRoute' && g.version === 2);
  assert(v1 !== undefined, 'the old v1 gate set must survive (history is never deleted)');
  assert(v2 !== undefined, 'a new v2 gate set must exist');
  assert(v2!.chainageM.length === 5, `expected 5 re-seeded gates, got ${v2!.chainageM.length}`);
  assert(JSON.stringify(v1!.chainageM) !== JSON.stringify(v2!.chainageM), 'the new geometry must re-seed different chainages, not copy v1');
  for (let i = 1; i < v2!.chainageM.length; i++) {
    assert(v2!.chainageM[i] > v2!.chainageM[i - 1], `v2 chainages must be strictly ascending, got ${v2!.chainageM}`);
  }
});

test('WP-H 24 (promoteRideToReference): the reset — every stored result on the route is removed, ghostsCleared counts them, clearedRideIds names them', async () => {
  const { fs } = await wphSetup();
  assert(wphResultsStore.storedResultsForWay('WphRoute').length === 3, 'sanity: 3 ghosts pre-promotion');
  // Inspect pass 2026-09-04 (brief §5.4b case 24's "R2 on another route is
  // untouched"): a result on a DIFFERENT route must survive the reset, in
  // memory and on disk — the reset is scoped to the promoted route only.
  await wphResultsStore.saveResult({ ...wphGhost('otherRouteGhost', 700), wayId: 'SomeOtherRoute' });
  await wphResultsStore.flushResultWrites();
  const newRideId = 'promoted3';
  await wphWriteRideFile(fs, newRideId, wphFixes(200, 0.0002, 1_700_100_000));

  const out = await wphRouteFromRide.promoteRideToReference('WphRoute', newRideId, fs);
  assert(out.ok, `expected success, got ${JSON.stringify(out)}`);
  if (!out.ok) return;
  assert(out.ghostsCleared === 3, `expected 3 ghosts cleared, got ${out.ghostsCleared}`);
  assert(!out.clearedRideIds.includes('otherRouteGhost'), 'a result on another route must not be in clearedRideIds');
  assert(wphResultsStore.getStoredResult('otherRouteGhost')?.wayId === 'SomeOtherRoute',
    'a result on another route must survive the reset in memory');
  await wphResultsStore.flushResultWrites();
  assert(fs.files.has('results/otherRouteGhost.json'), 'a result on another route must survive the reset on disk');
  assert(
    JSON.stringify([...out.clearedRideIds].sort()) === JSON.stringify(['ghost1', 'ghost2', 'ghost3']),
    `expected clearedRideIds to name the 3 ghosts, got ${JSON.stringify(out.clearedRideIds)}`,
  );
  for (const id of ['ghost1', 'ghost2', 'ghost3']) {
    assert(wphResultsStore.getStoredResult(id) === null, `${id}'s old stored result must be gone after the reset`);
  }
});

test('WP-H 25 (promoteRideToReference): the immediate re-time — the promoted ride itself re-derives a clean lap against its own new reference', async () => {
  const { fs } = await wphSetup();
  const newRideId = 'promoted4';
  await wphWriteRideFile(fs, newRideId, wphFixes(200, 0.0002, 1_700_100_000));

  const out = await wphRouteFromRide.promoteRideToReference('WphRoute', newRideId, fs);
  assert(out.ok, `expected success, got ${JSON.stringify(out)}`);
  if (!out.ok) return;
  assert(out.retimed.includes(newRideId), `expected ${newRideId} among retimed, got ${JSON.stringify(out.retimed)}`);
  const stored = wphResultsStore.getStoredResult(newRideId);
  assert(stored !== null, 'the promoted ride must have a fresh stored result — the reset must not leave it re-derived on the next boot only');
  assert(stored!.wayId === 'WphRoute', `expected routeId WphRoute, got ${stored!.wayId}`);
  assert(stored!.lap.quality === 'clean' || stored!.lap.quality === 'interrupted',
    `a ride re-timed against the reference IT JUST BUILT should score clean/interrupted, got ${stored!.lap.quality}`);
});

test('WP-H 26 (promoteRideToReference): four refusals write nothing at all', async () => {
  // (a) too-short ride: readable but under MIN_TRACK_LENGTH_M.
  {
    const { fs } = await wphSetup();
    await wphWriteRideFile(fs, 'tooshort', wphFixes(2, 0.0001, 1_700_100_000)); // ~22 m
    const beforeCat = JSON.stringify(wphCatalogStore.userCatalog());
    const beforeFiles = [...fs.files.keys()].sort();
    const out = await wphRouteFromRide.promoteRideToReference('WphRoute', 'tooshort', fs);
    assert(!out.ok, 'a too-short ride must refuse');
    assert(JSON.stringify(wphCatalogStore.userCatalog()) === beforeCat, 'too-short: catalog must be untouched');
    assert(JSON.stringify([...fs.files.keys()].sort()) === JSON.stringify(beforeFiles), 'too-short: no new file must be written');
  }
  // (b) already the reference.
  {
    const { fs } = await wphSetup();
    const beforeCat = JSON.stringify(wphCatalogStore.userCatalog());
    const out = await wphRouteFromRide.promoteRideToReference('WphRoute', 'oldref1', fs);
    assert(!out.ok, 'a ride already the reference must refuse');
    assert(JSON.stringify(wphCatalogStore.userCatalog()) === beforeCat, 'already-reference: catalog must be untouched');
  }
  // (c) seed-owned route (Morning is shipped, absent from userCatalog()).
  {
    const { fs } = await wphSetup();
    const beforeCat = JSON.stringify(wphCatalogStore.userCatalog());
    const out = await wphRouteFromRide.promoteRideToReference('Morning', 'whatever', fs);
    assert(!out.ok, 'a seed-owned route must refuse');
    assert(JSON.stringify(wphCatalogStore.userCatalog()) === beforeCat, 'seed-owned: catalog must be untouched');
  }
  // (d) unknown route id.
  {
    const { fs } = await wphSetup();
    const beforeCat = JSON.stringify(wphCatalogStore.userCatalog());
    const out = await wphRouteFromRide.promoteRideToReference('NoSuchRoute', 'whatever', fs);
    assert(!out.ok, 'an unknown route id must refuse');
    assert(JSON.stringify(wphCatalogStore.userCatalog()) === beforeCat, 'unknown route: catalog must be untouched');
  }
});

test('WP-H 27 (promoteRideToReference): the live seam sees the new geometry — catalogTrackSpecs() resolves the new ref and the new gate set', async () => {
  const { fs } = await wphSetup();
  const newRideId = 'promoted5';
  await wphWriteRideFile(fs, newRideId, wphFixes(200, 0.0002, 1_700_100_000));
  const out = await wphRouteFromRide.promoteRideToReference('WphRoute', newRideId, fs);
  assert(out.ok, `expected success, got ${JSON.stringify(out)}`);
  if (!out.ok) return;

  const { catalogTrackSpecs } = await import('../src/live/tracks.ts');
  const spec = catalogTrackSpecs().find((s) => s.id === 'WphRoute');
  assert(spec !== undefined, 'WphRoute must resolve as a live candidate after promotion');
  const savedRef = wphUserRefs.userRefFor('WphRoute');
  assert(savedRef !== null, 'the promoted ref must be in the userRefs registry');
  assert(spec!.ref.length === savedRef!.length, `catalogTrackSpecs' ref must be the freshly-saved one (length ${spec!.ref.length} vs ${savedRef!.length})`);
  const v2 = wphCatalogStore.userCatalog().gateSets.find((g) => g.wayId === 'WphRoute' && g.version === 2)!;
  assert(JSON.stringify(spec!.gates) === JSON.stringify(v2.chainageM), 'catalogTrackSpecs must resolve the NEW (v2) gate set, not the stale v1 one');
});

// ============================================================ WP-H §5.4:
// the WP-F §8 extraction (draftWayFromRide / createWayFromDraft /
// saveAdjustedGates), shared by RecordScreen and the ride detail. Cases
// 16-18 of the brief plus 16b: the WP-G variant draft that the ruling of
// 2026-09-04 made the detail's offer follow (existingWayId set).
const { draftRouteCreation: wphDraftRouteCreation } = await import('../src/store/routeCreation.ts');

test('WP-H 16 (draftWayFromRide): null when the ride file is missing; equals draftWayCreation(currentCatalog(), …) when present', async () => {
  const { fs } = await wphSetup();
  const missing = await wphRouteFromRide.draftRouteFromRide('nofile', 1_700_100_000_000, null, fs);
  assert(missing === null, 'a missing recording must yield no offer');

  // wph-a (disc 150 m at LAT0) → a place 0.04° north of it: start existing, end new.
  const fixes = wphFixes(200, 0.0002, 1_700_100_000);
  await wphWriteRideFile(fs, 'draft1', fixes);
  const d = await wphRouteFromRide.draftRouteFromRide('draft1', 1_700_100_000_000, null, fs);
  assert(d !== null, 'a readable ≥200 m ride must draft');
  const expected = wphDraftRouteCreation(wphCatalogStore.currentCatalog(), {
    rideId: 'draft1', startedAtMs: 1_700_100_000_000,
    fixes: fixes.lat.map((lat, i) => ({ lat, lon: fixes.lon[i] })), matchedWayId: null,
  });
  assert(JSON.stringify(d) === JSON.stringify(expected), 'draftWayFromRide must be draftWayCreation over the decoded file');
  assert(d!.start.kind === 'existing' && d!.start.landmarkId === 'wph-a', `start must resolve to wph-a, got ${JSON.stringify(d!.start)}`);
  assert(d!.end.kind === 'new', 'end must be a new place');
  assert(d!.existingRouteId === null, 'no way links wph-a to a new place — a NEW-way draft');
});

test('WP-H 16b (draftWayFromRide, WP-G): a repeat over the known way drafts a VARIANT (existingWayId set), not null', async () => {
  const { fs } = await wphSetup();
  // wph-a → wph-b exactly (0.02° north at 0.0002°/fix = 101 fixes ≈ 2.2 km).
  await wphWriteRideFile(fs, 'repeat1', wphFixes(101, 0.0002, 1_700_100_000));
  const d = await wphRouteFromRide.draftRouteFromRide('repeat1', 1_700_100_000_000, 'WphRoute', fs);
  assert(d !== null, 'WP-G: a repeat ride is an offer, not a refusal');
  assert(d!.existingRouteId === 'wph-a>wph-b', `expected the variant draft on wph-a>wph-b, got ${d!.existingRouteId}`);
  assert(d!.start.kind === 'existing' && d!.end.kind === 'existing', 'both endpoints exist in variant mode');
  assert(d!.matchedWayId === 'WphRoute', 'matchedRouteId round-trips for the card copy');
  const props = wphRouteFromRide.existingRouteProps('wph-a>wph-b');
  assert(props !== null, 'existingWayProps must resolve the way');
  assert(props!.knownSpecLists.length === 1 && props!.knownSpecLists[0].length === 0, `the plain route's spec list is [], got ${JSON.stringify(props!.knownSpecLists)}`);
  assert(wphRouteFromRide.existingRouteProps('no-such-way') === null, 'unknown way → null');
  assert(wphRouteFromRide.existingLandmarkLabel(d!.start) !== null, 'an existing endpoint has a label');
  assert(wphRouteFromRide.existingLandmarkLabel({ kind: 'new', landmarkId: 'x' }) === null, 'a new endpoint has none');
});

test('WP-H 17 (createWayFromDraft): happy path — route:<rideId> with referenceRideId, a registered ref, adjust with 5 seeded chainages', async () => {
  const { fs } = await wphSetup();
  await wphWriteRideFile(fs, 'create1', wphFixes(200, 0.0002, 1_700_100_000));
  const d = await wphRouteFromRide.draftRouteFromRide('create1', 1_700_100_000_000, null, fs);
  assert(d !== null && d.existingRouteId === null, 'precondition: a new-way draft');
  const routesBefore = wphCatalogStore.userCatalog().routes.length;

  const out = await wphRouteFromRide.createRouteFromDraft(d!, { start: '', end: 'Far North' }, fs);
  assert(out.ok, `expected success, got ${JSON.stringify(out)}`);
  if (!out.ok) return;
  assert(out.wayId === 'way:create1', `expected way:create1, got ${out.wayId}`);
  assert(out.adjust !== null, 'a ≥200 m ride builds a ref, so adjust must be offered');
  assert(out.adjust!.chainageM.length === 5, `expected 5 seeded gates, got ${out.adjust!.chainageM.length}`);
  assert(out.adjust!.wayId === out.wayId && out.adjust!.refLengthM > 0, 'adjust names the route and the ref length');

  const cat = wphCatalogStore.userCatalog();
  const way = cat.ways.find((r) => r.id === 'way:create1');
  assert(way !== undefined, 'the way must be in userCatalog()');
  assert(way!.referenceRideId === 'create1', 'this ride is the new way\'s reference');
  assert(way!.refLineId === 'way:create1', 'refLineId is the way\'s own id');
  assert(cat.routes.length === routesBefore + 1, 'one new route');
  assert(cat.landmarks.some((l) => l.label === 'Far North'), 'the new end landmark carries its name');
  assert(wphUserRefs.userRefFor('way:create1') !== null, 'the built reference line is registered under the way id');
  const v1 = cat.gateSets.find((g) => g.wayId === 'way:create1' && g.version === 1);
  assert(v1 !== undefined && JSON.stringify(v1.chainageM) === JSON.stringify(out.adjust!.chainageM), 'the v1 gate set is the seeded proposal');
});

test('WP-H 17b (createWayFromDraft, WP-G variant): adds a Route with specs under the existing way — no new landmark, no new way', async () => {
  const { fs } = await wphSetup();
  await wphWriteRideFile(fs, 'variant1', wphFixes(101, 0.0002, 1_700_100_000));
  const d = await wphRouteFromRide.draftRouteFromRide('variant1', 1_700_100_000_000, 'WphRoute', fs);
  assert(d !== null && d.existingRouteId === 'wph-a>wph-b', 'precondition: a variant draft');
  const before = wphCatalogStore.userCatalog();
  const out = await wphRouteFromRide.createRouteFromDraft(d!, { start: '', end: '', specs: [' Wet ', ''] }, fs);
  assert(out.ok, `expected success, got ${JSON.stringify(out)}`);
  if (!out.ok) return;
  const cat = wphCatalogStore.userCatalog();
  assert(cat.routes.length === before.routes.length, 'no second way');
  assert(cat.landmarks.length === before.landmarks.length, 'no new landmark');
  const way = cat.ways.find((r) => r.id === 'way:variant1');
  assert(way !== undefined && way.routeId === 'wph-a>wph-b', 'the new way hangs under the existing route');
  assert(JSON.stringify(way!.specs) === JSON.stringify(['Wet']), `specs must be cleaned to ['Wet'], got ${JSON.stringify(way!.specs)}`);
  assert(way!.referenceRideId === 'variant1', 'the variant\'s reference is this ride');
  assert(cat.routes.find((w) => w.id === 'wph-a>wph-b')!.wayIds.includes('way:variant1'), 'the route lists its new way');
  assert(wphUserRefs.userRefFor('way:variant1') !== null, 'the variant has its own reference line');
});

test('WP-H 18 (saveAdjustedGates): unmoved → { ok, moved:false } and no v2; moved → a v2 gate set with the new chainages', async () => {
  const { fs } = await wphSetup();
  await wphWriteRideFile(fs, 'adjust1', wphFixes(200, 0.0002, 1_700_100_000));
  const d = await wphRouteFromRide.draftRouteFromRide('adjust1', 1_700_100_000_000, null, fs);
  const out = await wphRouteFromRide.createRouteFromDraft(d!, { start: '', end: 'Far' }, fs);
  assert(out.ok && out.adjust !== null, 'precondition: a created route with an adjust draft');
  if (!out.ok || out.adjust === null) return;

  const same = await wphRouteFromRide.saveAdjustedGates(out.adjust, [...out.adjust.chainageM]);
  assert(same.ok && same.moved === false, `unmoved gates must be a no-op, got ${JSON.stringify(same)}`);
  assert(wphCatalogStore.userCatalog().gateSets.every((g) => !(g.wayId === out.wayId && g.version === 2)), 'unmoved: no v2 minted');

  const nudged = out.adjust.chainageM.map((c, i) => (i === 2 ? c + 25 : c));
  const moved = await wphRouteFromRide.saveAdjustedGates(out.adjust, nudged);
  assert(moved.ok && moved.moved === true, `moved gates must save, got ${JSON.stringify(moved)}`);
  const cat = wphCatalogStore.userCatalog();
  const v2 = cat.gateSets.find((g) => g.wayId === out.wayId && g.version === 2);
  assert(v2 !== undefined && JSON.stringify(v2.chainageM) === JSON.stringify(nudged), 'v2 carries the nudged chainages');
  assert(cat.gateSets.some((g) => g.wayId === out.wayId && g.version === 1), 'v1 survives (history is never deleted)');
  assert(cat.ways.find((r) => r.id === out.wayId)!.gateSetVersion === 2, 'the route points at v2');
});

// ============================================================ WP-I
// (virgin-cycle2): gateEditDraftFor / editRouteGates — "edit gates for an
// EXISTING route" from ROUTES, reusing the wph* harness above. The harness
// registers NO user ref for WphRoute by default, so each test that needs one
// builds it from a fixture track (buildRefFromRideFixes) — the track is long
// enough (~4.4 km) that the v1 chainages [50,500,1000,1500,1950] fit on it.

/** RefFixInput[] from wphFixes' {t,lat,lon} arrays — tUnixMs is required. */
function wphAsRefFixes(fixes: { t: number[]; lat: number[]; lon: number[] }) {
  return fixes.t.map((tSec, i) => ({ lat: fixes.lat[i], lon: fixes.lon[i], tUnixMs: tSec * 1000 }));
}

/** Builds a real reference line from a fixture track and registers it under
 * `routeId`, as buildRefFromRideFixes + saveUserRef (userRefs.ts). */
async function wphEstablishRef(wayId: string, fixes: { t: number[]; lat: number[]; lon: number[] }) {
  const built = wphUserRefs.buildRefFromRideFixes(wphAsRefFixes(fixes));
  assert(built !== null, 'wphEstablishRef: the fixture track must build a ref (>=200 m)');
  await wphUserRefs.saveUserRef(wayId, built!.ref);
  await wphUserRefs.flushUserRefWrites();
  return built!.ref;
}

test('WP-I 1 (gateEditDraftFor): null for a seed/unknown route and for a user route with no ref; with a ref, mirrors the current gate set (a copy)', async () => {
  const { fs } = await wphSetup();
  void fs;
  assert(wphRouteFromRide.gateEditDraftFor('Morning') === null, 'a seed route id (not in userCatalog) must yield null');
  assert(wphRouteFromRide.gateEditDraftFor('no-such-route') === null, 'an unknown route id must yield null');
  assert(wphRouteFromRide.gateEditDraftFor('WphRoute') === null, 'a user route with no user ref yet (harness default) must yield null');

  const ref = await wphEstablishRef('WphRoute', wphFixes(200, 0.0002, 1_700_100_000));
  const draft = wphRouteFromRide.gateEditDraftFor('WphRoute');
  assert(draft !== null, 'with a ref registered, a draft must be built');
  assert(draft!.wayId === 'WphRoute', `expected routeId WphRoute, got ${draft!.wayId}`);
  assert(draft!.refLengthM === ref.length, `expected refLengthM === ref.length (${ref.length}), got ${draft!.refLengthM}`);
  assert(JSON.stringify(draft!.chainageM) === JSON.stringify([50, 500, 1000, 1500, 1950]),
    `expected the CURRENT v1 chainages, got ${JSON.stringify(draft!.chainageM)}`);
  draft!.chainageM.push(9999);
  const draft2 = wphRouteFromRide.gateEditDraftFor('WphRoute')!;
  assert(draft2.chainageM.length === 5, 'mutating the returned chainageM must not mutate the catalog (it is a copy)');
});

test('WP-I 2 (editRouteGates): unmoved gates are a no-op — catalog byte-identical, all ghosts still stored', async () => {
  const { fs } = await wphSetup();
  await wphEstablishRef('WphRoute', wphFixes(200, 0.0002, 1_700_100_000));
  const before = JSON.stringify(wphCatalogStore.userCatalog());

  const out = await wphRouteFromRide.editWayGates('WphRoute', [50, 500, 1000, 1500, 1950], fs);
  assert(out.ok && out.moved === false, `unmoved gates must be a no-op, got ${JSON.stringify(out)}`);
  assert(JSON.stringify(wphCatalogStore.userCatalog()) === before, 'unmoved: catalog must be byte-identical');
  for (const id of ['ghost1', 'ghost2', 'ghost3']) {
    assert(wphResultsStore.getStoredResult(id) !== null, `${id}'s stored result must survive an unmoved save`);
  }
});

test('WP-I 3 (editRouteGates): moved gates mint latest+1 via addGateSet — old set survives, referenceRideId/refs.user.json untouched', async () => {
  const { fs } = await wphSetup();
  await wphEstablishRef('WphRoute', wphFixes(200, 0.0002, 1_700_100_000));
  const refsBefore = JSON.stringify(fs.files.get('refs.user.json'));
  const nudged = [50, 650, 1000, 1500, 1950]; // G2 (index 1) +150 m

  const out = await wphRouteFromRide.editWayGates('WphRoute', nudged, fs);
  assert(out.ok, `expected success, got ${JSON.stringify(out)}`);
  if (!out.ok) return;
  assert(out.moved === true, 'moved gates must report moved:true');
  assert(out.gateSetVersion === 2, `expected v1+1 = v2, got ${out.gateSetVersion}`);

  const cat = wphCatalogStore.userCatalog();
  const v1 = cat.gateSets.find((g) => g.wayId === 'WphRoute' && g.version === 1);
  const v2 = cat.gateSets.find((g) => g.wayId === 'WphRoute' && g.version === 2);
  assert(v1 !== undefined && JSON.stringify(v1.chainageM) === JSON.stringify([50, 500, 1000, 1500, 1950]),
    'the old v1 gate set must survive (history is never deleted)');
  assert(v2 !== undefined && JSON.stringify(v2.chainageM) === JSON.stringify(nudged), 'the new v2 set carries the given chainages');
  assert(v2!.origin === 'geometric', `expected origin 'geometric', got ${v2!.origin}`);
  const way = cat.ways.find((r) => r.id === 'WphRoute')!;
  assert(way.gateSetVersion === 2, `route.gateSetVersion must be bumped to 2, got ${way.gateSetVersion}`);
  assert(way.referenceRideId === 'oldref1', `referenceRideId must be untouched, got ${way.referenceRideId}`);

  await wphUserRefs.flushUserRefWrites();
  const refsAfter = JSON.stringify(fs.files.get('refs.user.json'));
  assert(refsAfter === refsBefore, 'refs.user.json must be byte-unchanged — only gate positions move, no ref rewrite');

  const { catalogTrackSpecs } = await import('../src/live/tracks.ts');
  const spec = catalogTrackSpecs().find((s) => s.id === 'WphRoute');
  assert(spec !== undefined, 'WphRoute must still resolve as a live candidate after the edit');
  assert(JSON.stringify(spec!.gates) === JSON.stringify(nudged), 'catalogTrackSpecs must resolve the NEW (v2) gate set, not the stale v1 one');
});

test('WP-I 4 (editRouteGates): the reset — every stored result on the route is removed; a result on another route survives, in memory and on disk', async () => {
  const { fs } = await wphSetup();
  await wphEstablishRef('WphRoute', wphFixes(200, 0.0002, 1_700_100_000));
  await wphResultsStore.saveResult({ ...wphGhost('otherRouteGhost', 700), wayId: 'SomeOtherRoute' });
  await wphResultsStore.flushResultWrites();

  const out = await wphRouteFromRide.editWayGates('WphRoute', [50, 650, 1000, 1500, 1950], fs);
  assert(out.ok, `expected success, got ${JSON.stringify(out)}`);
  if (!out.ok || !out.moved) return;
  assert(
    JSON.stringify([...out.clearedRideIds].sort()) === JSON.stringify(['ghost1', 'ghost2', 'ghost3']),
    `expected clearedRideIds to name the 3 ghosts, got ${JSON.stringify(out.clearedRideIds)}`,
  );
  for (const id of ['ghost1', 'ghost2', 'ghost3']) {
    assert(wphResultsStore.getStoredResult(id) === null, `${id}'s old stored result must be gone after the reset`);
  }
  assert(out.retimed.length === 0, `the synthetic ghosts have no ride file, so retimed must be [], got ${JSON.stringify(out.retimed)}`);
  assert(!out.clearedRideIds.includes('otherRouteGhost'), 'a result on another route must not be in clearedRideIds');
  assert(wphResultsStore.getStoredResult('otherRouteGhost')?.wayId === 'SomeOtherRoute',
    'a result on another route must survive the reset in memory');
  await wphResultsStore.flushResultWrites();
  assert(fs.files.has('results/otherRouteGhost.json'), 'a result on another route must survive the reset on disk');
});

test('WP-I 5 (editRouteGates): the immediate re-time — a ride with a real recording is re-derived against the new gates at once', async () => {
  const { fs } = await wphSetup();
  const fixes = wphFixes(200, 0.0002, 1_700_100_000);
  await wphEstablishRef('WphRoute', fixes);
  const rideId = 'realRide1';
  await wphWriteRideFile(fs, rideId, fixes);
  await wphResultsStore.saveResult(wphGhost(rideId, 800));
  await wphResultsStore.flushResultWrites();

  const out = await wphRouteFromRide.editWayGates('WphRoute', [50, 650, 1000, 1500, 1950], fs);
  assert(out.ok, `expected success, got ${JSON.stringify(out)}`);
  if (!out.ok || !out.moved) return;
  assert(out.clearedRideIds.includes(rideId), `expected ${rideId} among clearedRideIds, got ${JSON.stringify(out.clearedRideIds)}`);
  assert(out.retimed.includes(rideId), `expected ${rideId} among retimed, got ${JSON.stringify(out.retimed)}`);
  const stored = wphResultsStore.getStoredResult(rideId);
  assert(stored !== null, 'the ride must have a fresh stored result after the immediate re-derive');
  assert(stored!.wayId === 'WphRoute', `expected routeId WphRoute, got ${stored!.wayId}`);
  assert(stored!.derivedBy.gateSetVersion === out.gateSetVersion,
    `expected the fresh result derived against v${out.gateSetVersion}, got v${stored!.derivedBy.gateSetVersion}`);
});

test('WP-I 6 (editRouteGates): refusals write nothing at all', async () => {
  // (a) a seed route id (not in userCatalog).
  {
    const { fs } = await wphSetup();
    const beforeCat = JSON.stringify(wphCatalogStore.userCatalog());
    const out = await wphRouteFromRide.editWayGates('Morning', [1, 2], fs);
    assert(!out.ok, 'a seed route id must refuse');
    assert(JSON.stringify(wphCatalogStore.userCatalog()) === beforeCat, 'seed route: catalog must be untouched');
  }
  // (b) an unknown route id.
  {
    const { fs } = await wphSetup();
    const beforeCat = JSON.stringify(wphCatalogStore.userCatalog());
    const out = await wphRouteFromRide.editWayGates('no-such-route', [1, 2], fs);
    assert(!out.ok, 'an unknown route id must refuse');
    assert(JSON.stringify(wphCatalogStore.userCatalog()) === beforeCat, 'unknown route: catalog must be untouched');
  }
  // (c)-(e): shape refusals need a resolvable ref + gate set first.
  const mkRef = async () => {
    const { fs } = await wphSetup();
    const ref = await wphEstablishRef('WphRoute', wphFixes(200, 0.0002, 1_700_100_000));
    return { fs, ref };
  };
  // (c) wrong length.
  {
    const { fs } = await mkRef();
    const beforeCat = JSON.stringify(wphCatalogStore.userCatalog());
    const beforeResults = ['ghost1', 'ghost2', 'ghost3'].map((id) => wphResultsStore.getStoredResult(id));
    const out = await wphRouteFromRide.editWayGates('WphRoute', [50, 1000, 1950], fs);
    assert(!out.ok, 'a wrong-length chainage list must refuse');
    assert(JSON.stringify(wphCatalogStore.userCatalog()) === beforeCat, 'wrong length: catalog must be untouched');
    assert(JSON.stringify(['ghost1', 'ghost2', 'ghost3'].map((id) => wphResultsStore.getStoredResult(id))) === JSON.stringify(beforeResults),
      'wrong length: stored results must be untouched');
  }
  // (d) non-increasing.
  {
    const { fs } = await mkRef();
    const beforeCat = JSON.stringify(wphCatalogStore.userCatalog());
    const out = await wphRouteFromRide.editWayGates('WphRoute', [50, 1000, 900, 1500, 1950], fs);
    assert(!out.ok, 'a non-increasing chainage list must refuse');
    assert(JSON.stringify(wphCatalogStore.userCatalog()) === beforeCat, 'non-increasing: catalog must be untouched');
  }
  // (e) beyond the line.
  {
    const { fs, ref } = await mkRef();
    const beforeCat = JSON.stringify(wphCatalogStore.userCatalog());
    const out = await wphRouteFromRide.editWayGates('WphRoute', [50, 500, 1000, 1500, ref.length + 10], fs);
    assert(!out.ok, 'a chainage beyond the line must refuse');
    assert(JSON.stringify(wphCatalogStore.userCatalog()) === beforeCat, 'beyond-the-line: catalog must be untouched');
  }
});
