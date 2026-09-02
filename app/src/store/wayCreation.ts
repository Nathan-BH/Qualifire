/**
 * Retroactive way creation (OPEN-ITEMS item 2; COLD-START §3 steps 5–9).
 *
 * On a virgin install setup is retroactive: ride first, name after. When a
 * finished ride never locked a route, these pure helpers decide whether the
 * STOP step should offer to name its endpoints (draftWayCreation) and, once
 * named, build the user-catalog additions (buildWayCreationCatalog) that
 * catalogStore.saveUserCatalog() persists: landmark(s) born from the visited
 * endpoints, one Way linking them, one Route, and its v1 gate set: the full
 * 5-gate seed (1%/99% start/finish + 25/50/75% sector gates on the caller's
 * built reference line — store/gateSeeding.ts) when a `seed` is supplied,
 * else the PROVISIONAL start/finish pair at 1%/99% of the ridden length.
 *
 * Honest limits, by design:
 *  - route.refLineId is set to the route's own id. Since the save-flow
 *    package (OPEN-ITEMS item 3) the CALLER builds and persists a real
 *    reference line under that id (live/userRefs.ts) whenever it can; when
 *    it cannot, the id resolves to nothing and every consumer degrades as
 *    before (tracks.ts warns + skips; routeMapView builds a RouteAsset at
 *    runtime from that ref (ui/routeAssetRuntime.ts)).
 *  - route.referenceRideId records the ride-1-as-reference designation
 *    (COLD-START §3 step 9). Deriving that ride into the route's first
 *    scored all-purple lap is STILL deferred — a later package.
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
 * just finished), and its v1 gate set — `seed.chainageM` (the 5-gate
 * gateSeeding.ts proposal on the built reference line) when given, else the
 * provisional 1%/99% start/finish pair on the ridden length. Both carry
 * origin:'geometric' (R&S §3 honesty clause: a starting grid, not measured
 * placement). Feed the result to saveUserCatalog(), which validates the
 * MERGE before accepting. Names are trimmed here; the caller enforces
 * non-empty.
 */
export function buildWayCreationCatalog(
  userCat: Catalog,
  draft: WayCreationDraft,
  names: { start: string; end: string },
  seed?: { chainageM: number[] },
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
  const gateSet: GateSet = seed
    ? {
        routeId,
        version: 1,
        chainageM: seed.chainageM,
        createdAtMs: draft.startedAtMs,
        origin: 'geometric',
        note:
          'seeded: start/finish at 1%/99%, sectors at 25/50/75% of the reference line, ' +
          "nudged clear of the reference ride's own stops — a proposal, not measured placement",
      }
    : {
        routeId,
        version: 1,
        chainageM: [0.01 * draft.trackLengthM, 0.99 * draft.trackLengthM],
        createdAtMs: draft.startedAtMs,
        origin: 'geometric',
        note: 'provisional: start/finish gates only — no reference line could be built from this ride',
      };
  return {
    schemaVersion: userCat.schemaVersion,
    landmarks,
    ways: [...userCat.ways, way],
    routes: [...userCat.routes, route],
    gateSets: [...userCat.gateSets, gateSet],
  };
}
