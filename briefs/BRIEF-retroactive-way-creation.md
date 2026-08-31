# BRIEF — Retroactive way creation, PART 1 of 2: store + data model + boot fix

**Written 2026-08-31 (Plan tier, fable) against `virgin` HEAD. Line numbers verified
that evening; the full edit set below was dry-run applied, verified (283 tests / 280
pass / 0 fail / 3 skip; `tsc --noEmit` exit 0), and restored.**

This is PART 1 of a two-brief sequence for OPEN-ITEMS item 2 ("Retroactive way
creation + ride-1-as-reference"). Part 1 is everything below the UI: the pure
way-creation logic, the `Route.referenceRideId` field, the `initCatalogStore()`
boot-crash fix, and the tests. PART 2 (`briefs/BRIEF-retroactive-way-creation-part2-ui.md`)
wires the STOP-step naming card in `RecordScreen.tsx` and MUST NOT be executed until
Part 1 has landed and its verification passed.

## Stop-on-ambiguity

**If any ambiguity or surprise arises — an anchor that doesn't match, a test that
fails differently than predicted, a file that differs from what this brief quotes —
STOP and report back. Never guess, never improvise a fix.** An escalation means this
brief was underspecified; that is the brief's fault, not yours.

## Mandate

1. Add an optional `referenceRideId` field to `Route` (the reference-*ride* concept;
   `refLineId` is a reference *line*, a different thing).
2. Create `app/src/store/wayCreation.ts` — pure draft/build logic that turns an
   unmatched finished ride into user-catalog additions (landmarks born from the
   ride's endpoints, one Way, one Route marked with the ride as reference, one
   provisional 2-gate set at 1%/99% of ridden length).
3. Fix the known `initCatalogStore()` bug: `recompute()` sits outside its try/catch
   and throws on a decodable-but-malformed `catalog.user.json`, silently skipping
   `initRideHistory` in App.tsx's boot chain.
4. Tests: new `app/tests/waycreation_suite.ts` (8 tests) + 2 tests appended to
   `app/tests/catalogstore_suite.ts` + registration in `app/tests/run.ts`.

No UI changes in this part. No gate-placement/sector logic (that is OPEN-ITEMS
item 3, the NEXT work package — this brief creates only the provisional
start/finish gate pair, which `validateCatalog()` structurally requires:
a Way must have >=1 route and a Route must have a gate set with >=2 gates).

## Design decisions already made (do not re-decide)

- **`refLineId` is deliberately unresolvable.** New routes get
  `refLineId = route id`, which has no entry in `refs.json`. Consequences, all
  verified acceptable: `live/tracks.ts:catalogTrackSpecs()` skips the route with a
  `console.warn` (it is not live-raceable yet); `ui/routeMapView.tsx` returns null
  for the unknown asset (no map drawn). Building a real reference line from the
  reference ride's recorded track is the next work package's job. Do NOT invent a
  reference line or copy another route's.
- **The reference-ride marker lives on `Route`, not on `RideResult`.** Results are
  derived/disposable by doctrine ("deleting every result must lose nothing but
  CPU" — `types.ts` header); a reference designation is NOT derivable, so it
  belongs in the curated catalog. Optional field ⇒ no schema-version bump, seed
  decodes unchanged.
- **Deriving the reference ride into the route's first scored all-purple lap is
  DEFERRED** to the next package together with the reference line + sector gates.
  This part records the designation only.
- **Landmark matching:** an endpoint inside an existing landmark's disc
  (`landmarkAt`, active-time filter OFF — dormant places still give identity)
  reuses it. Otherwise a new landmark with radius 120 m (bottom of the measured
  seed range) shrunk to clear every existing disc; if even 30 m cannot fit, the
  squeezing place is reused (within 30 m of a disc edge is that place, GPS-wise).
  A ride ending back inside its own new start landmark's disc is a loop (one
  landmark, `loopDiscriminator` on the way).
- **No offer** when the ride is < 200 m, has < 2 fixes, or both endpoints resolve
  to existing landmarks already linked by a way IN THAT DIRECTION (that is way
  *matching*, COLD-START §3 step 7, a later package). The reverse direction of an
  existing way still offers (ways are strictly directional).
- **Ids derive from the rideId** (`lm:<rideId>:start`, `lm:<rideId>:end`,
  `way:<rideId>`, `route:<rideId>`): globally unique, and can never collide with a
  seed id (seed wins every merge collision silently — a label-derived id could be
  silently swallowed).
- **Boot fix posture:** a decodable-but-unmergeable user file is treated exactly
  like an undecodable one — ignored for the session, NEVER overwritten (it is the
  only copy of the rider's own places). No `validateCatalog()` call at boot: a
  file that merges but no longer validates (e.g. after a seed change) must still
  load; the fix only stops the *throw*.

## Edit 1 — `app/src/store/types.ts`

Anchor: `export interface Route {` at **line 45**; the interface closes at line 51.

Before (lines 45–51, verbatim):
```typescript
export interface Route {
  id: string;
  wayId: string;
  refLineId: string;
  gateSetVersion: number;
  seeded: boolean;
}
```

After:
```typescript
export interface Route {
  id: string;
  wayId: string;
  refLineId: string;
  gateSetVersion: number;
  seeded: boolean;
  /** OPEN-ITEMS item 2 (COLD-START §3 step 9): the ride whose recorded track
   * is this route's benchmark — "ride 1 IS the reference by default";
   * promoting a later clean lap rewrites this field. Optional: seed routes
   * predate it (their reference is the archive-built refLine, not one ride). */
  referenceRideId?: string;
}
```

(`seeded: boolean` has no consumer anywhere in `src/` — grepped `\.seeded`, zero
hits outside comments — so new routes set it `false` and nothing changes behaviour.)

## Edit 2 — `app/src/store/catalogStore.ts`

Anchor: `initCatalogStore` at **line 77**; the buggy `recompute();` at **line 93**,
directly after the `} catch {` on line 92.

Before (lines 92–95, verbatim):
```typescript
  } catch { /* unreadable => same as missing for this session; nothing written */ }
  recompute();
  return current;
}
```

After:
```typescript
  } catch { /* unreadable => same as missing for this session; nothing written */ }
  try {
    recompute();
  } catch {
    // decodeCatalog checks that the four arrays exist but not their elements,
    // so a decodable-but-malformed file (e.g. {"landmarks":[null], ...} — a
    // torn write, a hand edit, an older app version) used to throw out of
    // mergeCatalogs HERE, past App.tsx's .then chain, silently skipping
    // initRideHistory. Same posture as an undecodable file: ignored for this
    // session, never overwritten. recompute() on an empty user catalog cannot
    // throw (the seed is bundled and structurally sound).
    console.warn(
      `initCatalogStore: ${USER_CATALOG_FILE} decoded but did not merge — ignored for this session, left untouched`,
    );
    user = emptyCatalog();
    recompute();
  }
  return current;
}
```

Do not touch `saveUserCatalog()` (lines 97–111) — its write-time validation is
correct and unrelated.

## Edit 3 — NEW FILE `app/src/store/wayCreation.ts`

Create with exactly this content (251 lines; imports only `./catalog.ts` and
`./types.ts`, both pure — keep it that way):

```typescript
/**
 * Retroactive way creation (OPEN-ITEMS item 2; COLD-START §3 steps 5–9).
 *
 * On a virgin install setup is retroactive: ride first, name after. When a
 * finished ride never locked a route, these pure helpers decide whether the
 * STOP step should offer to name its endpoints (draftWayCreation) and, once
 * named, build the user-catalog additions (buildWayCreationCatalog) that
 * catalogStore.saveUserCatalog() persists: landmark(s) born from the visited
 * endpoints, one Way linking them, one Route, and one PROVISIONAL two-gate
 * set (start/finish at 1%/99% of the ridden track length — the settled
 * default; the 25/50/75% sector gates are the NEXT work package, OPEN-ITEMS
 * item 3, deliberately absent here).
 *
 * Honest limits, by design (each is the next package's job, not a bug):
 *  - route.refLineId is set to the route's own id, which resolves to NO
 *    entry in refs.json — live/tracks.ts skips the route with a
 *    console.warn, and routeMapView returns null on the unknown asset, so
 *    the route exists structurally but is not yet raceable or drawable.
 *    Building a real reference line from the reference ride's recorded
 *    track is explicitly deferred; faking one would be worse than none.
 *  - route.referenceRideId records the ride-1-as-reference designation
 *    (COLD-START §3 step 9: "ride 1 IS the reference by default").
 *    Deriving that ride into the route's first scored all-purple lap needs
 *    the reference line + sector gates above, so it is deferred with them.
 *
 * Pure — no fs, no Date.now(); the caller supplies every fact.
 */
import { landmarkAt, metresBetween } from './catalog.ts';
import type { Catalog, GateSet, Landmark, Route, Way } from './types.ts';

/** Default disc for a landmark born from a single visit. The measured seed
 * radii run 120–256 m (p90 of endpoint spread + 30 m); with one visit there
 * is no spread to measure, so start at the bottom of the measured range and
 * let future work re-measure. */
export const NEW_LANDMARK_RADIUS_M = 120;
/** Below this a disc is a GPS-noise sliver: an endpoint that cannot fit
 * MIN m of radius beside an existing disc is treated as that place. */
export const MIN_LANDMARK_RADIUS_M = 30;
/** Below this a "way" is noise, not a route — no naming offer. */
export const MIN_TRACK_LENGTH_M = 200;

export interface RideFacts {
  rideId: string;
  startedAtMs: number;
  fixes: { lat: number; lon: number }[];
}

export interface EndpointResolution {
  kind: 'existing' | 'new';
  landmarkId: string;
  /** present iff kind === 'new'; label stays '' until the rider names it */
  draft?: Landmark;
}

export interface WayCreationDraft {
  rideId: string;
  startedAtMs: number;
  start: EndpointResolution;
  end: EndpointResolution;
  /** end resolved to the same landmark as start (way needs a discriminator) */
  loop: boolean;
  trackLengthM: number;
}

/** Ridden length: fix-to-fix sum, same flat-earth metric the catalog uses. */
export function trackLengthM(fixes: { lat: number; lon: number }[]): number {
  let sum = 0;
  for (let i = 1; i < fixes.length; i++) sum += metresBetween(fixes[i - 1], fixes[i]);
  return sum;
}

/** Largest radius ≤ NEW_LANDMARK_RADIUS_M that keeps a new disc at p clear
 * of every obstacle disc (validateCatalog rejects d < rA + rB), or null when
 * even MIN_LANDMARK_RADIUS_M does not fit. */
function fittedRadius(
  p: { lat: number; lon: number },
  obstacles: readonly Pick<Landmark, 'lat' | 'lon' | 'radiusM'>[],
): number | null {
  let r = NEW_LANDMARK_RADIUS_M;
  for (const o of obstacles) {
    const allowed = metresBetween(p, o) - o.radiusM;
    if (allowed < r) r = allowed;
  }
  return r >= MIN_LANDMARK_RADIUS_M ? r : null;
}

/** The obstacle whose edge is nearest to p (the one that squeezed the fit). */
function nearestByEdge<T extends Pick<Landmark, 'lat' | 'lon' | 'radiusM'>>(
  p: { lat: number; lon: number },
  obstacles: readonly T[],
): T | null {
  let best: T | null = null;
  let bestD = Infinity;
  for (const o of obstacles) {
    const d = metresBetween(p, o) - o.radiusM;
    if (d < bestD) {
      best = o;
      bestD = d;
    }
  }
  return best;
}

function newLandmark(
  id: string,
  p: { lat: number; lon: number },
  radiusM: number,
  activeFromMs: number,
): Landmark {
  return {
    id,
    label: '',
    lat: p.lat,
    lon: p.lon,
    radiusM,
    activeFromMs,
    activeUntilMs: null,
    offerAtStart: true,
  };
}

/**
 * Should STOP offer to name this ride's endpoints, and as what?
 *
 * null (no offer) when: fewer than 2 fixes; the ridden track is shorter than
 * MIN_TRACK_LENGTH_M; or both endpoints resolve to existing landmarks that a
 * way already links in this direction (a repeat ride — way MATCHING is
 * COLD-START §3 step 7, a later package, not creation).
 *
 * Endpoint resolution, per end:
 *  1. inside an existing landmark's disc (landmarkAt, active-time filter OFF —
 *     identity matching must include dormant places) → reuse it;
 *  2. else a new landmark at the fix, radius NEW_LANDMARK_RADIUS_M shrunk to
 *     clear every existing disc (and, for the end, the start's new draft);
 *  3. if even MIN_LANDMARK_RADIUS_M cannot fit, the squeezing disc's place is
 *     reused instead — within 30 m of a disc's edge is that place, GPS-wise.
 *     When the squeezing disc is the start's own draft, the ride is a loop.
 */
export function draftWayCreation(c: Catalog, ride: RideFacts): WayCreationDraft | null {
  if (ride.fixes.length < 2) return null;
  const len = trackLengthM(ride.fixes);
  if (len < MIN_TRACK_LENGTH_M) return null;
  const first = ride.fixes[0];
  const last = ride.fixes[ride.fixes.length - 1];

  let start: EndpointResolution;
  const startHit = landmarkAt(c, first);
  if (startHit) {
    start = { kind: 'existing', landmarkId: startHit.id };
  } else {
    const r = fittedRadius(first, c.landmarks);
    if (r !== null) {
      start = {
        kind: 'new',
        landmarkId: `lm:${ride.rideId}:start`,
        draft: newLandmark(`lm:${ride.rideId}:start`, first, r, ride.startedAtMs),
      };
    } else {
      start = { kind: 'existing', landmarkId: nearestByEdge(first, c.landmarks)!.id };
    }
  }

  let end: EndpointResolution;
  const endHit = landmarkAt(c, last);
  if (endHit) {
    end = { kind: 'existing', landmarkId: endHit.id };
  } else {
    const startDraftDisc = start.kind === 'new' ? [start.draft!] : [];
    const obstacles = [...c.landmarks, ...startDraftDisc];
    const r = fittedRadius(last, obstacles);
    if (r !== null) {
      end = {
        kind: 'new',
        landmarkId: `lm:${ride.rideId}:end`,
        draft: newLandmark(`lm:${ride.rideId}:end`, last, r, ride.startedAtMs),
      };
    } else {
      const squeezer = nearestByEdge(last, obstacles)!;
      end =
        start.kind === 'new' && squeezer === start.draft
          ? { kind: 'new', landmarkId: start.landmarkId } // loop onto the start draft
          : { kind: 'existing', landmarkId: (squeezer as Landmark).id };
    }
  }

  const loop = start.landmarkId === end.landmarkId;

  if (start.kind === 'existing' && end.kind === 'existing') {
    const already = c.ways.some(
      (w) => w.startLandmarkId === start.landmarkId && w.endLandmarkId === end.landmarkId,
    );
    if (already) return null;
  }

  return { rideId: ride.rideId, startedAtMs: ride.startedAtMs, start, end, loop, trackLengthM: len };
}

/**
 * The user catalog with the named way merged in: userCat (this phone's
 * additions, catalogStore.userCatalog()) plus the draft's new landmark(s)
 * carrying the rider's names, one Way, one Route (referenceRideId = the ride
 * just finished), and the provisional start/finish gate set at 1%/99% of the
 * ridden length (the settled start/end-gate default; STATE.md ground rules).
 * Feed the result to saveUserCatalog(), which validates the MERGE before
 * accepting. Names are trimmed here; the caller enforces non-empty.
 */
export function buildWayCreationCatalog(
  userCat: Catalog,
  draft: WayCreationDraft,
  names: { start: string; end: string },
): Catalog {
  const wayId = `way:${draft.rideId}`;
  const routeId = `route:${draft.rideId}`;
  const landmarks = [...userCat.landmarks];
  if (draft.start.kind === 'new' && draft.start.draft) {
    landmarks.push({ ...draft.start.draft, label: names.start.trim() });
  }
  if (!draft.loop && draft.end.kind === 'new' && draft.end.draft) {
    landmarks.push({ ...draft.end.draft, label: names.end.trim() });
  }
  const way: Way = {
    id: wayId,
    startLandmarkId: draft.start.landmarkId,
    endLandmarkId: draft.end.landmarkId,
    ...(draft.loop ? { loopDiscriminator: `loop:${draft.rideId}` } : {}),
    routeIds: [routeId],
  };
  const route: Route = {
    id: routeId,
    wayId,
    // Deliberately unresolvable for now — see the file header's honest limits.
    refLineId: routeId,
    gateSetVersion: 1,
    seeded: false,
    referenceRideId: draft.rideId,
  };
  const gateSet: GateSet = {
    routeId,
    version: 1,
    chainageM: [0.01 * draft.trackLengthM, 0.99 * draft.trackLengthM],
    createdAtMs: draft.startedAtMs,
    note: 'provisional: start/finish gates only — sector gates are the next work package',
  };
  return {
    schemaVersion: userCat.schemaVersion,
    landmarks,
    ways: [...userCat.ways, way],
    routes: [...userCat.routes, route],
    gateSets: [...userCat.gateSets, gateSet],
  };
}
```

## Edit 4 — NEW FILE `app/tests/waycreation_suite.ts`

Create with exactly this content:

```typescript
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
```

## Edit 5 — `app/tests/catalogstore_suite.ts`

The file is currently **190 lines**; the last test ends with the suite's final
`});` on line 190. APPEND the following two tests at the end of the file (they
reuse the file's existing imports and its `store`/`seedMod`/`createMemoryFsAdapter`/
`emptyCatalog` bindings — add no imports):

```typescript

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
```

## Edit 6 — `app/tests/run.ts`

Anchor: `import './catalogstore_suite.ts';` at **line 20**. Insert directly after it:

```typescript
import './waycreation_suite.ts';
```

## MANDATORY verification (run every step; predicted output is from the dry run)

1. `cd app && node --experimental-strip-types tests/run.ts` — the last line MUST be
   exactly:
   ```
   283 tests: 280 pass, 0 fail, 3 skip
   ```
   (Baseline before this brief is `273 tests: 270 pass, 0 fail, 3 skip`; the +10 are
   the 8 waycreation tests and the 2 appended catalogstore tests. If the baseline
   itself differs from 273, STOP — the tree is not what this brief was written
   against.) All 8 `wayCreation:` tests and both `item-2` tests must show `PASS`.
2. `cd app && ./node_modules/.bin/tsc --noEmit` — exit code 0, no output.
3. `cd app && git diff --stat` must list EXACTLY these tracked files and nothing
   else, plus the two new untracked files:
   ```
   app/src/store/catalogStore.ts | 17 +++++++-
   app/src/store/types.ts        |  5 +++
   app/tests/catalogstore_suite.ts | 50 +++++++++++++++++++++++
   app/tests/run.ts              |  1 +
   ```
   New untracked: `app/src/store/wayCreation.ts`, `app/tests/waycreation_suite.ts`.
4. Spot-check the fix does what it claims: temporarily revert ONLY the Edit-2 hunk
   (put `recompute();` back outside the try), rerun step 1, and confirm the
   `item-2 fix:` test now FAILS (the suite reports 1 fail); then re-apply Edit 2 and
   confirm step 1 passes again. (This proves the test actually guards the bug.)

## Must NOT change

- `saveUserCatalog()`, `mergeCatalogs()`, `decodeCatalog()`, `validateCatalog()` —
  read them, do not edit them.
- `CATALOG_SCHEMA_VERSION` stays 1 (the new field is optional).
- No edits to `App.tsx`, `RecordScreen.tsx`, or anything under `app/src/ui/` or
  `app/src/live/` — that is Part 2.
- No new dependencies, no seed-file (`catalog.seed.json`) changes, no changes to
  existing tests other than the append in Edit 5.
- Never run git write commands (add/commit/checkout/reset); never delete files —
  if something must be removed, move it under `safe_to_delete/` and say so.

## Report format

Report back: files created/changed (paths), the final test-count line verbatim,
tsc exit code, the step-4 revert check result, and any deviation from this brief
(there should be none — a deviation is a STOP, not a footnote).
