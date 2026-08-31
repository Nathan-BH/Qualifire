/**
 * QA — retroactive way creation (OPEN-ITEMS item 2; COLD-START §3 steps 5–9).
 * Pure half: draftWayCreation / buildWayCreationCatalog. Locks:
 *  1. an unmatched ride on an empty catalog drafts two new landmarks;
 *  2. degenerate rides (too short, <2 fixes) draft nothing;
 *  3. endpoints inside an existing disc reuse the landmark; near-misses get
 *     a shrunk radius; sub-MIN slivers reuse the squeezing place instead;
 *  4. a ride ending back at its own new start landmark drafts a loop;
 *  5. an existing (start,end) way means NO offer (matching is a later
 *     package), while an existing landmark pair with no way still offers;
 *  6. the built catalog VALIDATES when merged, carries referenceRideId =
 *     the ride, refLineId = the route's own id, and the provisional 1%/99%
 *     start/finish gate pair.
 * The store seam (saveUserCatalog actually called, boot-time malformed-file
 * fix) lives in catalogstore_suite.ts, which owns the seed shim.
 */
import { assert, test } from './lib.ts';
import { emptyCatalog, mergeCatalogs, metresBetween, validateCatalog } from '../src/store/catalog.ts';
import {
  MIN_LANDMARK_RADIUS_M,
  MIN_TRACK_LENGTH_M,
  NEW_LANDMARK_RADIUS_M,
  buildWayCreationCatalog,
  draftWayCreation,
  trackLengthM,
} from '../src/store/wayCreation.ts';
import type { Catalog, Landmark } from '../src/store/types.ts';

const LAT0 = 50.87;
const LON0 = 4.70;
/** ~111.32 m per 0.001° lat at any longitude; fixture rides run due north. */
function northRide(nFixes: number, stepLat = 0.001): { lat: number; lon: number }[] {
  return Array.from({ length: nFixes }, (_, i) => ({ lat: LAT0 + i * stepLat, lon: LON0 }));
}
function lm(id: string, lat: number, lon: number, radiusM: number): Landmark {
  return { id, label: id, lat, lon, radiusM, activeFromMs: 0, activeUntilMs: null, offerAtStart: true };
}
function catWith(landmarks: Landmark[], ways: Catalog['ways'] = []): Catalog {
  const c = emptyCatalog();
  c.landmarks = landmarks;
  c.ways = ways;
  return c;
}
const RIDE = { rideId: 'ride-t1', startedAtMs: 1_700_000_000_000 };

test('wayCreation: an unmatched ride on an empty catalog drafts two new default-radius landmarks', () => {
  const fixes = northRide(20); // ~2115 m
  const d = draftWayCreation(emptyCatalog(), { ...RIDE, fixes });
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
  assert(draftWayCreation(emptyCatalog(), { ...RIDE, fixes: northRide(1) }) === null, '<2 fixes');
  assert(draftWayCreation(emptyCatalog(), { ...RIDE, fixes: northRide(2, 0.0005) }) === null,
    `~56 m < MIN_TRACK_LENGTH_M (${MIN_TRACK_LENGTH_M})`);
});

test('wayCreation: an endpoint inside an existing disc reuses that landmark', () => {
  const home = lm('home', LAT0, LON0, 150);
  const d = draftWayCreation(catWith([home]), { ...RIDE, fixes: northRide(20) });
  assert(d !== null && d!.start.kind === 'existing' && d!.start.landmarkId === 'home', 'start reused');
  assert(d!.end.kind === 'new', 'end (2.1 km away) is still new');
});

test('wayCreation: a near-miss endpoint gets a shrunk radius; a sub-MIN sliver reuses the place', () => {
  // Disc edge 50 m from the start fix: new radius must shrink to ~50 m.
  const near = lm('near', LAT0 - 0.0017966, LON0, 150); // ~200 m away, radius 150
  const d = draftWayCreation(catWith([near]), { ...RIDE, fixes: northRide(20) });
  assert(d !== null && d!.start.kind === 'new', 'still a new place');
  const got = d!.start.draft!.radiusM;
  const gap = metresBetween({ lat: LAT0, lon: LON0 }, near) - near.radiusM;
  assert(Math.abs(got - gap) < 0.01 && got >= MIN_LANDMARK_RADIUS_M && got < NEW_LANDMARK_RADIUS_M,
    `shrunk to the clear gap (${gap.toFixed(1)} m), got ${got}`);
  // Disc edge ~20 m from the start fix: below MIN — that IS the place.
  const tight = lm('tight', LAT0 - 0.0015272, LON0, 150); // ~170 m away
  const d2 = draftWayCreation(catWith([tight]), { ...RIDE, fixes: northRide(20) });
  assert(d2 !== null && d2!.start.kind === 'existing' && d2!.start.landmarkId === 'tight',
    'a sliver under MIN_LANDMARK_RADIUS_M reuses the squeezing landmark');
});

test('wayCreation: a ride ending back at its own new start landmark drafts a loop', () => {
  // Out ~500 m and back to ~55 m from the start: end lands inside the start
  // draft's default disc.
  const out = northRide(6, 0.001); // 0 .. 0.005
  const back = northRide(5, 0.001).reverse().map((p) => ({ lat: p.lat + 0.0005, lon: p.lon + 0.00001 }));
  const fixes = [...out, ...back]; // ends at LAT0+0.0005 => ~55.7 m from start
  const d = draftWayCreation(emptyCatalog(), { ...RIDE, fixes });
  assert(d !== null, 'a 1.1 km loop drafts');
  assert(d!.loop === true, 'recognised as a loop');
  assert(d!.start.kind === 'new' && d!.end.landmarkId === d!.start.landmarkId, 'one landmark, both ends');
});

test('wayCreation: an existing way in this direction means no offer; an unlinked landmark pair still offers', () => {
  const a = lm('a', LAT0, LON0, 150);
  const b = lm('b', LAT0 + 0.019, LON0, 150);
  const linked = catWith([a, b], [{ id: 'a>b', startLandmarkId: 'a', endLandmarkId: 'b', routeIds: ['r1'] }]);
  assert(draftWayCreation(linked, { ...RIDE, fixes: northRide(20) }) === null,
    'way exists in this direction: matching, not creation — no offer');
  const unlinked = catWith([a, b]);
  const d = draftWayCreation(unlinked, { ...RIDE, fixes: northRide(20) });
  assert(d !== null && d!.start.kind === 'existing' && d!.end.kind === 'existing',
    'both places known but no way yet: offer creates just the way');
  // The REVERSE direction of an existing way is a different way (ways are
  // strictly directional) — it must still offer.
  const reverse = catWith([a, b], [{ id: 'b>a', startLandmarkId: 'b', endLandmarkId: 'a', routeIds: ['r1'] }]);
  assert(draftWayCreation(reverse, { ...RIDE, fixes: northRide(20) }) !== null, 'reverse direction still offers');
});

test('wayCreation: the built catalog validates when merged and carries the reference ride', () => {
  const fixes = northRide(20);
  const d = draftWayCreation(emptyCatalog(), { ...RIDE, fixes })!;
  const built = buildWayCreationCatalog(emptyCatalog(), d, { start: '  Home ', end: 'Work' });
  const errs = validateCatalog(mergeCatalogs(emptyCatalog(), built));
  assert(errs.length === 0, `merged result must validate, got: ${errs.join('; ')}`);
  assert(built.landmarks.length === 2 && built.landmarks[0].label === 'Home' && built.landmarks[1].label === 'Work',
    'names trimmed onto the new landmarks');
  const way = built.ways[0];
  const route = built.routes[0];
  const gs = built.gateSets[0];
  assert(way.id === 'way:ride-t1' && way.routeIds[0] === route.id, 'way links its route');
  assert(route.id === 'route:ride-t1' && route.wayId === way.id, 'route links its way');
  assert(route.referenceRideId === 'ride-t1', 'COLD-START §3 step 9: ride 1 IS the reference by default');
  assert(route.refLineId === route.id && route.seeded === false, 'refLineId self-id (unresolvable on purpose), not seeded');
  assert(gs.routeId === route.id && gs.version === 1 && gs.chainageM.length === 2, 'one provisional gate pair');
  const L = d.trackLengthM;
  assert(Math.abs(gs.chainageM[0] - 0.01 * L) < 1e-9 && Math.abs(gs.chainageM[1] - 0.99 * L) < 1e-9,
    'start/finish at 1%/99% of the ridden length (the settled default)');
  assert(typeof gs.note === 'string' && gs.note.includes('provisional'), 'the gate set says what it is');
});

test('wayCreation: a loop build needs (and gets) a loopDiscriminator and validates', () => {
  const out = northRide(6, 0.001);
  const back = northRide(5, 0.001).reverse().map((p) => ({ lat: p.lat + 0.0005, lon: p.lon + 0.00001 }));
  const d = draftWayCreation(emptyCatalog(), { ...RIDE, fixes: [...out, ...back] })!;
  const built = buildWayCreationCatalog(emptyCatalog(), d, { start: 'Home', end: '' });
  assert(built.landmarks.length === 1, 'a loop births ONE landmark');
  assert(built.ways[0].startLandmarkId === built.ways[0].endLandmarkId, 'loop way');
  assert(typeof built.ways[0].loopDiscriminator === 'string' && built.ways[0].loopDiscriminator!.length > 0,
    'loops are a real category and need a discriminator');
  const errs = validateCatalog(mergeCatalogs(emptyCatalog(), built));
  assert(errs.length === 0, `loop build must validate, got: ${errs.join('; ')}`);
});
