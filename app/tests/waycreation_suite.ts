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
import { emptyCatalog, mergeCatalogs, metresBetween, routesForWay, validateCatalog } from '../src/store/catalog.ts';
import {
  MATCHED_ENDPOINT_SLACK_M,
  MIN_LANDMARK_RADIUS_M,
  MIN_TRACK_LENGTH_M,
  NEW_LANDMARK_RADIUS_M,
  buildWayCreationCatalog,
  cleanSpecs,
  draftWayCreation,
  findRouteWithSpecs,
  sameSpecs,
  trackLengthM,
  type WayCreationDraft,
} from '../src/store/wayCreation.ts';
import type { Catalog, GateSet, Landmark, Route, Way } from '../src/store/types.ts';

const LAT0 = 50.87;
const LON0 = 4.70;
/** ~111.32 m per 0.001° lat at any longitude; fixture rides run due north. */
function northRide(nFixes: number, stepLat = 0.001): { lat: number; lon: number }[] {
  return Array.from({ length: nFixes }, (_, i) => ({ lat: LAT0 + i * stepLat, lon: LON0 }));
}
function lm(id: string, lat: number, lon: number, radiusM: number): Landmark {
  return { id, label: id, lat, lon, radiusM, activeFromMs: 0, activeUntilMs: null, offerAtStart: true };
}
function catWith(landmarks: Landmark[], ways: Way[] = [], routes: Route[] = []): Catalog {
  const c = emptyCatalog();
  c.landmarks = landmarks;
  c.ways = ways;
  c.routes = routes;
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

test('WP-G 0: an existing directed way drafts a VARIANT', () => {
  const a = lm('a', LAT0, LON0, 150);
  const b = lm('b', LAT0 + 0.019, LON0, 150);
  const linked = catWith([a, b], [{ id: 'w1', startLandmarkId: 'a', endLandmarkId: 'b', routeIds: ['r1'] }]);
  const d = draftWayCreation(linked, { ...RIDE, fixes: northRide(20) });
  assert(d !== null, 'way exists in this direction: a variant offer now, never null');
  assert(d!.existingWayId === 'w1', 'existingWayId names the way that already links a->b');
  assert(d!.start.kind === 'existing' && d!.end.kind === 'existing', 'both endpoints resolve to existing places');
  assert(d!.loop === false, 'not a loop');
  const unlinked = catWith([a, b]);
  const d2 = draftWayCreation(unlinked, { ...RIDE, fixes: northRide(20) });
  assert(d2 !== null && d2!.existingWayId === null && d2!.start.kind === 'existing' && d2!.end.kind === 'existing',
    'both places known but no way yet: brand-new-way offer, existingWayId null');
  // The REVERSE direction of an existing way is a different way (ways are
  // strictly directional) — it drafts a brand-new-way offer too.
  const reverse = catWith([a, b], [{ id: 'b>a', startLandmarkId: 'b', endLandmarkId: 'a', routeIds: ['r1'] }]);
  const d3 = draftWayCreation(reverse, { ...RIDE, fixes: northRide(20) });
  assert(d3 !== null && d3!.existingWayId === null, 'reverse direction still a different way: existingWayId null');
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

test('wayCreation: a seeded build carries the 5-gate set, origin geometric, and validates', () => {
  const d = draftWayCreation(emptyCatalog(), { ...RIDE, fixes: northRide(20) })!;
  const seed = { chainageM: [10, 250, 500, 750, 990] };
  const built = buildWayCreationCatalog(emptyCatalog(), d, { start: 'Home', end: 'Work' }, seed);
  const gs = built.gateSets[0];
  assert(gs.chainageM.length === 5, '5 gates = 4 sectors (STATE.md ground rule)');
  assert(gs.chainageM.every((v, i) => v === seed.chainageM[i]), 'seed carried verbatim');
  assert(gs.origin === 'geometric', 'R&S §3 honesty clause: geometric, never silent');
  assert(gs.version === 1 && built.routes[0].gateSetVersion === 1, 'born at v1, no upgrade step');
  const errs = validateCatalog(mergeCatalogs(emptyCatalog(), built));
  assert(errs.length === 0, `seeded build must validate, got: ${errs.join('; ')}`);
});

test('wayCreation: the un-seeded fallback keeps the provisional pair, now flagged geometric', () => {
  const d = draftWayCreation(emptyCatalog(), { ...RIDE, fixes: northRide(20) })!;
  const built = buildWayCreationCatalog(emptyCatalog(), d, { start: 'Home', end: 'Work' });
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
const wayAB: Way = { id: 'a>b', startLandmarkId: 'a', endLandmarkId: 'b', routeIds: ['r-ab'] };
const routeAB: Route = { id: 'r-ab', wayId: 'a>b', refLineId: 'r-ab', gateSetVersion: 1, seeded: true };

test('WP-F 1: the gap case — a matched-but-different-endpoint ride still offers (the point of the WP)', () => {
  const g = lm('g', A0.lat, eastOf(A0, 2200).lon, 150);
  const cat = catWith([a, b, g], [wayAB], [routeAB]);
  const fixes = [A0, eastOf(A0, 2200)]; // a -> g, NOT a -> b
  for (const matchedRouteId of ['r-ab', null] as (string | null)[]) {
    const d = draftWayCreation(cat, { ...RIDE, fixes, matchedRouteId });
    assert(d !== null, `matchedRouteId=${matchedRouteId}: a->g (no way there) must draft, not null`);
    assert(d!.start.kind === 'existing' && d!.start.landmarkId === 'a', 'start is the known place a');
    assert(d!.end.kind === 'existing' && d!.end.landmarkId === 'g', 'end is the known (different) place g');
  }
});

test('WP-F 2 (WP-G): an existing pair drafts a variant regardless of the engine verdict (matching vs mismatching vs null)', () => {
  const cat = catWith([a, b], [wayAB], [routeAB]);
  const fixes = [A0, B0]; // a -> b, exactly the way that already exists
  for (const matchedRouteId of ['r-ab', 'some-other-route', null] as (string | null)[]) {
    const d = draftWayCreation(cat, { ...RIDE, fixes, matchedRouteId });
    assert(d !== null && d!.existingWayId === wayAB.id,
      `matchedRouteId=${matchedRouteId}: existing (a,b) pair drafts a variant on wayAB regardless`);
    assert(d!.matchedRouteId === matchedRouteId, `matchedRouteId=${matchedRouteId}: still round-trips onto the draft`);
  }
});

test('WP-F 3 (WP-G): slack snap — the latelock regression guard, start side', () => {
  // 225 m from a's centre (150 m radius): 75 m past the edge, same margin
  // §2.5 measured on latelock_20260805's real first fix.
  const startFix = northOf(A0, 225);
  const cat = catWith([a, b], [wayAB], [routeAB]);
  const fixes = [startFix, B0]; // end lands exactly inside b
  const matched = draftWayCreation(cat, { ...RIDE, fixes, matchedRouteId: 'r-ab' });
  // WP-G: the pair (a,b) already existing is no longer a refusal — the snap
  // still happens (start resolves to the existing landmark a, not a phantom
  // new place 75 m past its edge), but the result is now a variant offer on
  // wayAB rather than null.
  assert(matched !== null && matched!.existingWayId === wayAB.id
      && matched!.start.kind === 'existing' && matched!.start.landmarkId === 'a'
      && matched!.end.kind === 'existing' && matched!.end.landmarkId === 'b',
    'matched: the 75 m-past-edge start still snaps to a; pair (a,b) already exists -> variant offer on wayAB');
  const unmatched = draftWayCreation(cat, { ...RIDE, fixes, matchedRouteId: null });
  assert(unmatched !== null && unmatched!.start.kind === 'new' && unmatched!.end.kind === 'existing',
    'unmatched: today\'s behaviour preserved — new start, existing end');
});

test('WP-F 3b (WP-G): slack snap mirrored on the end side', () => {
  const endFix = northOf(B0, 225); // 75 m past b's edge
  const cat = catWith([a, b], [wayAB], [routeAB]);
  const fixes = [A0, endFix]; // start lands exactly inside a
  const matched = draftWayCreation(cat, { ...RIDE, fixes, matchedRouteId: 'r-ab' });
  assert(matched !== null && matched!.existingWayId === wayAB.id
      && matched!.start.kind === 'existing' && matched!.start.landmarkId === 'a'
      && matched!.end.kind === 'existing' && matched!.end.landmarkId === 'b',
    'matched: the 75 m-past-edge end still snaps to b; pair (a,b) already exists -> variant offer on wayAB');
  const unmatched = draftWayCreation(cat, { ...RIDE, fixes, matchedRouteId: null });
  assert(unmatched !== null && unmatched!.start.kind === 'existing' && unmatched!.end.kind === 'new',
    'unmatched: today\'s behaviour preserved — existing start, new end');
});

test('WP-F 4: the slack never swallows a different known place or a genuinely far new place', () => {
  // Start lands inside a DIFFERENT landmark c — must stay c regardless of
  // matchedRouteId (Gym->Home->Work still offers Gym->Work).
  const c = lm('c', eastOf(A0, 5000).lat, eastOf(A0, 5000).lon, 150);
  const cat1 = catWith([a, b, c], [wayAB], [routeAB]);
  const fixesC = [eastOf(A0, 5000), B0];
  for (const matchedRouteId of ['r-ab', null] as (string | null)[]) {
    const d = draftWayCreation(cat1, { ...RIDE, fixes: fixesC, matchedRouteId });
    assert(d !== null && d!.start.kind === 'existing' && d!.start.landmarkId === 'c',
      `matchedRouteId=${matchedRouteId}: start must stay the DIFFERENT known place c, not snap to a`);
  }
  // End 2 km past b's own edge stays new — the genuine Home->Work->Shop case.
  assert(2000 > MATCHED_ENDPOINT_SLACK_M, 'sanity: 2 km is well beyond the slack');
  const farEnd = northOf(B0, 150 + 2000);
  const cat2 = catWith([a, b], [wayAB], [routeAB]);
  const d2 = draftWayCreation(cat2, { ...RIDE, fixes: [A0, farEnd], matchedRouteId: 'r-ab' });
  assert(d2 !== null && d2!.end.kind === 'new', '2 km past the way\'s end stays a genuinely new place');
});

test('WP-F 5: an unknown or stale matchedRouteId behaves exactly like null', () => {
  const startFix = northOf(A0, 225); // same 75 m-past-edge scenario as WP-F 3
  const cat = catWith([a, b], [wayAB], [routeAB]);
  const fixes = [startFix, B0];
  const withNull = draftWayCreation(cat, { ...RIDE, fixes, matchedRouteId: null });
  const withUnknownRoute = draftWayCreation(cat, { ...RIDE, fixes, matchedRouteId: 'no-such-route' });
  assert(withUnknownRoute !== null
      && withUnknownRoute!.start.kind === withNull!.start.kind
      && withUnknownRoute!.end.kind === withNull!.end.kind,
    'an unknown route id must degrade exactly like matchedRouteId: null');
  // A route whose OWN wayId is missing from the catalog is just as stale.
  const staleRoute: Route = { id: 'r-stale', wayId: 'way-does-not-exist', refLineId: 'r-stale', gateSetVersion: 1, seeded: true };
  const catStale = catWith([a, b], [wayAB], [routeAB, staleRoute]);
  const withStaleWay = draftWayCreation(catStale, { ...RIDE, fixes, matchedRouteId: 'r-stale' });
  assert(withStaleWay !== null
      && withStaleWay!.start.kind === withNull!.start.kind
      && withStaleWay!.end.kind === withNull!.end.kind,
    'a route whose way id is missing must also degrade like null, never throw');
});

test('WP-F 6 (WP-G): real fixtures against the shipped seed catalog — matched, no other way ⇒ variant offer on that seed way', () => {
  // Same read-only-JSON pattern as store_suite.ts: this file's own module
  // graph must not statically import store/seed.ts (it pulls in the bare
  // catalog.seed.json import, which plain Node ESM cannot load without the
  // registerHooks dance other suites use for it — unneeded here since we only
  // need the shipped catalog's DATA, not the seed-mode selection logic).
  const seed = loadJson<Catalog>(path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  const homeWorkWayId = seed.routes.find((r) => r.id === 'Morning')?.wayId;
  assert(typeof homeWorkWayId === 'string', 'fixture sanity: the seed has a Morning route with a wayId');
  for (const name of ['latelock_20260805', 'clean_morning']) {
    const f = loadFixture(name);
    assert(f.track === 'Morning', `fixture sanity: ${name} expected track Morning, got ${f.track}`);
    const fixes = f.fixes.lat.map((lat, i) => ({ lat, lon: f.fixes.lon[i] }));
    const d = draftWayCreation(seed, {
      rideId: `real-${name}`,
      startedAtMs: 1_700_000_000_000,
      fixes,
      matchedRouteId: 'Morning',
    });
    assert(d !== null && d!.existingWayId === homeWorkWayId,
      `${name}: home->work already exists as a way — variant offer on it, got ${JSON.stringify(d)}`);
  }
});

test('WP-F 7: WayCreationDraft.matchedRouteId round-trips and buildWayCreationCatalog ignores it', () => {
  const fixes = northRide(20);
  const d = draftWayCreation(emptyCatalog(), { ...RIDE, fixes, matchedRouteId: 'some-route' })!;
  assert(d.matchedRouteId === 'some-route', 'matchedRouteId carried onto the draft unchanged');
  const dNone = draftWayCreation(emptyCatalog(), { ...RIDE, fixes })!;
  assert(dNone.matchedRouteId === null, 'no matchedRouteId given => null on the draft, not undefined-forever');
  const built = buildWayCreationCatalog(emptyCatalog(), d, { start: 'Home', end: 'Work' });
  const errs = validateCatalog(mergeCatalogs(emptyCatalog(), built));
  assert(errs.length === 0, `build must still validate, got: ${errs.join('; ')}`);
  assert(!JSON.stringify(built).includes('some-route'), 'matchedRouteId must never leak into the built catalog');
});

// ------------------------------------------------------------ WP-G: route
// specifications/variants — a second Route on an existing Way, named by
// free-text spec segments, instead of today's silent no-offer.

/** Helper: a variant draft on an existing way, both endpoints already known. */
function variantDraft(rideId: string, wayId: string, startId: string, endId: string): WayCreationDraft {
  return {
    rideId,
    startedAtMs: RIDE.startedAtMs,
    start: { kind: 'existing', landmarkId: startId },
    end: { kind: 'existing', landmarkId: endId },
    loop: startId === endId,
    trackLengthM: 2000,
    matchedRouteId: null,
    existingWayId: wayId,
  };
}

test('WP-G 1: variant build on a user way', () => {
  const wa = lm('a', LAT0, LON0, 150);
  const wb = lm('b', LAT0 + 0.019, LON0, 150);
  const w1: Way = { id: 'w1', startLandmarkId: 'a', endLandmarkId: 'b', routeIds: ['r1'] };
  const r1: Route = { id: 'r1', wayId: 'w1', refLineId: 'r1', gateSetVersion: 1, seeded: false };
  const userCat = catWith([wa, wb], [w1], [r1]);
  userCat.gateSets = [{ routeId: 'r1', version: 1, chainageM: [10, 990], createdAtMs: 0 }];
  const draft = variantDraft('ride-t1', 'w1', 'a', 'b');
  const built = buildWayCreationCatalog(userCat, draft, { start: '', end: '', specs: [' Dry ', '', 'Fast'] });
  assert(built.landmarks.length === userCat.landmarks.length, 'no new landmark');
  assert(built.ways.length === userCat.ways.length, 'ways.length unchanged');
  assert(JSON.stringify(built.ways[0].routeIds) === JSON.stringify(['r1', 'route:ride-t1']),
    'w1.routeIds deep-equals [r1, route:ride-t1]');
  const route = built.routes[built.routes.length - 1];
  assert(route.wayId === 'w1' && route.refLineId === 'route:ride-t1' && route.referenceRideId === 'ride-t1',
    'new route on w1, self-refLineId, referenceRideId set');
  assert(JSON.stringify(route.specs) === JSON.stringify(['Dry', 'Fast']), 'specs trimmed, empty dropped, order kept');
  assert(built.gateSets.length === userCat.gateSets.length + 1, 'one new gate set');
  const errs = validateCatalog(mergeCatalogs(emptyCatalog(), built));
  assert(errs.length === 0, `merged result must validate, got: ${errs.join('; ')}`);
});

test('WP-G 2: variant on a SEED-owned way', () => {
  const wa = lm('a', LAT0, LON0, 150);
  const wb = lm('b', LAT0 + 0.019, LON0, 150);
  const w1: Way = { id: 'w1', startLandmarkId: 'a', endLandmarkId: 'b', routeIds: ['r1'] };
  const r1: Route = { id: 'r1', wayId: 'w1', refLineId: 'r1', gateSetVersion: 1, seeded: true };
  const seed = catWith([wa, wb], [w1], [r1]);
  seed.gateSets = [{ routeId: 'r1', version: 1, chainageM: [10, 990], createdAtMs: 0 }];
  const userCat = emptyCatalog(); // the way is seed-owned — NOT in userCat
  const draft = variantDraft('ride-t2', 'w1', 'a', 'b');
  const built = buildWayCreationCatalog(userCat, draft, { start: '', end: '', specs: ['Wet'] });
  assert(JSON.stringify(built.ways) === JSON.stringify(userCat.ways), 'userCat.ways untouched — a seed way is not ours to edit');
  const route = built.routes.find((r) => r.id === 'route:ride-t2');
  assert(route !== undefined && route.wayId === 'w1', 'the new route points at the seed way by id');
  const merged = mergeCatalogs(seed, built);
  const errs = validateCatalog(merged);
  assert(errs.length === 0, `merged result must validate, got: ${errs.join('; ')}`);
  assert(routesForWay(merged, 'w1').some((r) => r.id === 'route:ride-t2'),
    'routesForWay resolves the variant by wayId, not way.routeIds (validateCatalog never requires the inverse link)');
});

test('WP-G 3: no specs given, or all-whitespace specs, => no specs field on the route (byte-identical)', () => {
  const fixes = northRide(20);
  const d = draftWayCreation(emptyCatalog(), { ...RIDE, fixes })!;
  const builtNoSpecs = buildWayCreationCatalog(emptyCatalog(), d, { start: 'Home', end: 'Work' });
  assert(!('specs' in builtNoSpecs.routes[0]), 'no names.specs at all: route carries no specs property');
  const builtBlankSpecs = buildWayCreationCatalog(emptyCatalog(), d, { start: 'Home', end: 'Work', specs: ['', '  '] });
  assert(!('specs' in builtBlankSpecs.routes[0]), 'all-whitespace specs: still no specs property, never []');
  assert(JSON.stringify(builtNoSpecs) === JSON.stringify(builtBlankSpecs), 'the two builds are byte-identical');
});

test('WP-G 4: specs on a brand-new way land trimmed on its first route; way/landmarks unaffected', () => {
  const fixes = northRide(20);
  const d = draftWayCreation(emptyCatalog(), { ...RIDE, fixes })!;
  const builtPlain = buildWayCreationCatalog(emptyCatalog(), d, { start: 'Home', end: 'Work' });
  const builtSpecs = buildWayCreationCatalog(emptyCatalog(), d, { start: 'Home', end: 'Work', specs: [' Dry ', 'Fast'] });
  assert(JSON.stringify(builtSpecs.landmarks) === JSON.stringify(builtPlain.landmarks), 'landmarks unaffected by specs');
  assert(JSON.stringify(builtSpecs.ways) === JSON.stringify(builtPlain.ways), 'the way itself unaffected by specs');
  assert(JSON.stringify(builtSpecs.routes[0].specs) === JSON.stringify(['Dry', 'Fast']), 'specs trimmed onto the new route');
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
  const rDry: Route = { id: 'r-dry', wayId: 'w1', refLineId: 'r-dry', gateSetVersion: 1, seeded: false, specs: ['Dry'] };
  const rDryFast: Route = { id: 'r-dry-fast', wayId: 'w1', refLineId: 'r-dry-fast', gateSetVersion: 1, seeded: false, specs: ['Dry', 'Fast'] };
  const rPlain: Route = { id: 'r-plain', wayId: 'w1', refLineId: 'r-plain', gateSetVersion: 1, seeded: false };
  const c = catWith([], [], [rDry, rDryFast, rPlain]);
  assert(findRouteWithSpecs(c, 'w1', ['dry'])?.id === 'r-dry', 'case-insensitive hit');
  assert(findRouteWithSpecs(c, 'w2', ['Dry']) === null, 'a matching list on a DIFFERENT way is a miss');
  assert(findRouteWithSpecs(c, 'w1', ['Dry', 'Fast'])?.id === 'r-dry-fast', 'the longer list finds the OTHER route — prefix is not equality');
  assert(findRouteWithSpecs(c, 'w1', [])?.id === 'r-plain', '[] finds the plain route');
});

test('WP-G 7: validateCatalog — spec shape and per-way duplicate specs', () => {
  const wa = lm('a', LAT0, LON0, 150);
  const wb = lm('b', LAT0 + 0.019, LON0, 150);
  const gs = (routeId: string): GateSet => ({ routeId, version: 1, chainageM: [10, 990], createdAtMs: 0 });

  // Two routes on one way with case-different-but-equal specs => one error naming both.
  const w1: Way = { id: 'w1', startLandmarkId: 'a', endLandmarkId: 'b', routeIds: ['r1', 'r2'] };
  const r1: Route = { id: 'r1', wayId: 'w1', refLineId: 'r1', gateSetVersion: 1, seeded: false, specs: ['Dry'] };
  const r2: Route = { id: 'r2', wayId: 'w1', refLineId: 'r2', gateSetVersion: 1, seeded: false, specs: ['dry'] };
  const c1 = catWith([wa, wb], [w1], [r1, r2]);
  c1.gateSets = [gs('r1'), gs('r2')];
  const errs1 = validateCatalog(c1);
  assert(errs1.some((e) => e.includes('r1') && e.includes('r2')), `expected one error naming both routes, got ${JSON.stringify(errs1)}`);

  // Two PLAIN routes (no specs at all) on one way stay legal — the seed's own shape.
  const r1p: Route = { id: 'r1', wayId: 'w1', refLineId: 'r1', gateSetVersion: 1, seeded: false };
  const r2p: Route = { id: 'r2', wayId: 'w1', refLineId: 'r2', gateSetVersion: 1, seeded: false };
  const c2 = catWith([wa, wb], [w1], [r1p, r2p]);
  c2.gateSets = [gs('r1'), gs('r2')];
  const errs2 = validateCatalog(c2);
  assert(!errs2.some((e) => e.includes('share specs')), `two plain routes must not be flagged, got ${JSON.stringify(errs2)}`);

  // Malformed specs: not trimmed / empty string.
  const w1b: Way = { id: 'w1', startLandmarkId: 'a', endLandmarkId: 'b', routeIds: ['r3', 'r4'] };
  const r3: Route = { id: 'r3', wayId: 'w1', refLineId: 'r3', gateSetVersion: 1, seeded: false, specs: [''] };
  const r4: Route = { id: 'r4', wayId: 'w1', refLineId: 'r4', gateSetVersion: 1, seeded: false, specs: [' Dry'] };
  const c3 = catWith([wa, wb], [w1b], [r3, r4]);
  c3.gateSets = [gs('r3'), gs('r4')];
  const errs3 = validateCatalog(c3);
  assert(errs3.filter((e) => e.includes('trimmed non-empty')).length === 2, `both malformed routes flagged, got ${JSON.stringify(errs3)}`);

  // The same list on a route of ANOTHER way: no error.
  const wb2 = lm('b2', LAT0 + 0.038, LON0, 150);
  const w1only: Way = { id: 'w1', startLandmarkId: 'a', endLandmarkId: 'b', routeIds: ['r1'] };
  const w2: Way = { id: 'w2', startLandmarkId: 'a', endLandmarkId: 'b2', routeIds: ['r5'] };
  const r1only: Route = { id: 'r1', wayId: 'w1', refLineId: 'r1', gateSetVersion: 1, seeded: false, specs: ['Dry'] };
  const r5: Route = { id: 'r5', wayId: 'w2', refLineId: 'r5', gateSetVersion: 1, seeded: false, specs: ['Dry'] };
  const c4 = catWith([wa, wb, wb2], [w1only, w2], [r1only, r5]);
  c4.gateSets = [gs('r1'), gs('r5')];
  const errs4 = validateCatalog(c4);
  assert(!errs4.some((e) => e.includes('share specs')), `same specs on different ways must not be flagged, got ${JSON.stringify(errs4)}`);

  // Inspect (WP-G): a non-array `specs` (hand-edited file) is REPORTED, never
  // thrown — the per-way duplicate loop must not call .map on it.
  const r6 = { id: 'r6', wayId: 'w1', refLineId: 'r6', gateSetVersion: 1, seeded: false, specs: 'Dry' as unknown as string[] } as Route;
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
  const loopWay: Way = {
    id: 'loop:existing', startLandmarkId: 'loopplace', endLandmarkId: 'loopplace',
    loopDiscriminator: 'loop:existing', routeIds: ['r-loop'],
  };
  const rLoop: Route = { id: 'r-loop', wayId: 'loop:existing', refLineId: 'r-loop', gateSetVersion: 1, seeded: false };
  const cat = catWith([home], [loopWay], [rLoop]);
  cat.gateSets = [{ routeId: 'r-loop', version: 1, chainageM: [10, 990], createdAtMs: 0 }];
  // A ride that starts and ends exactly at the existing loop place.
  const out = northRide(6, 0.001);
  const back = [...out].reverse();
  const fixes = [...out, ...back];
  const d = draftWayCreation(cat, { ...RIDE, fixes });
  assert(d !== null, 'a real loop ride on an existing loop place drafts');
  assert(d!.loop === true, 'recognised as a loop');
  assert(d!.start.kind === 'existing' && d!.end.kind === 'existing' && d!.start.landmarkId === 'loopplace',
    'both ends resolve to the existing loop place');
  assert(d!.existingWayId === 'loop:existing', 'the existing loop way is offered as a variant, not a new way');
  const built = buildWayCreationCatalog(cat, d!, { start: '', end: '', specs: ['Alt'] });
  assert(built.ways.length === cat.ways.length, 'no second loop way minted');
  assert(built.routes.length === cat.routes.length + 1, 'one new route on the existing loop way');
  const errs = validateCatalog(mergeCatalogs(emptyCatalog(), built));
  assert(errs.length === 0, `merged loop-variant catalog must validate, got: ${errs.join('; ')}`);
});
