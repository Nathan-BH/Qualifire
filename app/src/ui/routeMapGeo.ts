/**
 * Pure GeoJSON builders for the MapLibre route map (B-50). No react-native,
 * no maplibre imports here — headless-testable, same discipline as
 * routeMapMath.ts.
 *
 * CRITICAL: RouteAsset stores `path` and gate lat/lon as [lat, lon] (and
 * lat, lon fields) — GeoJSON coordinates are [lon, lat]. Every function here
 * does that swap; get it backwards and the route silently draws in the
 * Gulf of Guinea.
 */
import type { RouteAsset } from './routeMapMath.ts';

// Minimal local GeoJSON shapes — the app's tsconfig (expo/tsconfig.base)
// does not pull in @types/geojson globals by default in this file's
// resolution, so these are defined locally rather than adding a dependency.
export interface GeoPosition extends Array<number> {
  0: number; // lon
  1: number; // lat
}

export interface LineStringGeometry {
  type: 'LineString';
  coordinates: GeoPosition[];
}

export interface PointGeometry {
  type: 'Point';
  coordinates: GeoPosition;
}

export interface GeoFeature<G, P = Record<string, unknown>> {
  type: 'Feature';
  geometry: G;
  properties: P;
}

export interface GeoFeatureCollection<G, P = Record<string, unknown>> {
  type: 'FeatureCollection';
  features: GeoFeature<G, P>[];
}

/** The ridden line, or null if the asset has no path (or too short to draw). */
export function routeLineFeature(a: RouteAsset): GeoFeature<LineStringGeometry> | null {
  if (!a.path || a.path.length < 2) return null;
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: a.path.map(([lat, lon]) => [lon, lat]),
    },
    properties: {},
  };
}

export interface GateProperties {
  name: string;
  colour?: string;
}

/**
 * One point per gate. `colour` is OMITTED (not set to null) when the gate has
 * no colour yet, so the ['has','colour'] paint expression can distinguish
 * "not scored" from "scored transparent".
 */
export function gatesFeatureCollection(
  a: RouteAsset, gateColours?: (string | null)[],
): GeoFeatureCollection<PointGeometry, GateProperties> {
  return {
    type: 'FeatureCollection',
    features: a.gates.map((g, i) => {
      // B-50 hardening: an empty string is "no colour yet", same as null —
      // without this a stray '' (e.g. a defensive `?? ''` upstream) would
      // set the paint expression's ['has','colour'] true with nothing to draw.
      const raw = gateColours?.[i] ?? null;
      const colour = raw === '' ? null : raw;
      const properties: GateProperties = colour !== null
        ? { name: g.name, colour }
        : { name: g.name };
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [g.lon, g.lat] },
        properties,
      };
    }),
  };
}

export interface AllGateProperties {
  name: string;
  routeId: string;
  colour?: string;
}

/**
 * WP-B (Nathan's free-ride "gates only" map): one Point feature per gate of
 * every route in `routeIds` (or every asset in `assets` when `routeIds` is
 * omitted/null — the full 20-route catalog, the deliberately-unfiltered
 * both-ends-unknown free ride). `colour` is set ONLY for a gate that appears
 * in `crossed` (the same `['has','colour']` paint convention as
 * gatesFeatureCollection above), to `crossedColour` — kept a caller-supplied
 * string so this module stays colour-agnostic (it has no theme import).
 * Dedupes nothing: two overlapping routes legitimately draw two gates a few
 * metres apart (accepted, per the brief's pre-resolved ambiguities).
 */
export function allGatesFeatureCollection(
  assets: Record<string, RouteAsset>,
  crossed: { routeId: string; gateIndex: number }[] | undefined,
  crossedColour: string,
  routeIds?: string[] | null,
): GeoFeatureCollection<PointGeometry, AllGateProperties> {
  const crossedSet = new Set((crossed ?? []).map((c) => `${c.routeId}:${c.gateIndex}`));
  const ids = routeIds ?? Object.keys(assets);
  const features: GeoFeature<PointGeometry, AllGateProperties>[] = [];
  for (const routeId of ids) {
    const asset = assets[routeId];
    if (!asset) continue; // defensive: an id with no asset (should not happen post-WP-D1/build) is just skipped
    asset.gates.forEach((g, i) => {
      const properties: AllGateProperties = crossedSet.has(`${routeId}:${i}`)
        ? { name: g.name, routeId, colour: crossedColour }
        : { name: g.name, routeId };
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [g.lon, g.lat] },
        properties,
      });
    });
  }
  return { type: 'FeatureCollection', features };
}

/** Bounding box over every gate of every route in `routeIds` (or every asset
 * when omitted/null) — the gates-only map's FIT target, since there is no
 * single route's `routeBounds()` to fit to. Null only when nothing matched
 * (an empty/all-unresolved `routeIds`). */
export function allGatesBounds(
  assets: Record<string, RouteAsset>, routeIds?: string[] | null,
): LonLatBoundsBox | null {
  const ids = routeIds ?? Object.keys(assets);
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  let any = false;
  for (const routeId of ids) {
    const asset = assets[routeId];
    if (!asset) continue;
    for (const g of asset.gates) {
      any = true;
      if (g.lon < minLon) minLon = g.lon;
      if (g.lon > maxLon) maxLon = g.lon;
      if (g.lat < minLat) minLat = g.lat;
      if (g.lat > maxLat) maxLat = g.lat;
    }
  }
  return any ? { minLon, minLat, maxLon, maxLat } : null;
}

export function riderFeature(lat: number, lon: number): GeoFeature<PointGeometry> {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lon, lat] },
    properties: {},
  };
}

export interface LonLatBoundsBox { minLon: number; minLat: number; maxLon: number; maxLat: number }

/** Bounding box over `path` if present, else over the gates. Null only if
 * both are absent/empty. */
export function routeBounds(a: RouteAsset): LonLatBoundsBox | null {
  const points: [number, number][] = a.path && a.path.length > 0
    ? a.path.map(([lat, lon]) => [lon, lat])
    : a.gates.map((g) => [g.lon, g.lat]);
  if (points.length === 0) return null;
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const [lon, lat] of points) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLon, minLat, maxLon, maxLat };
}

/** Cheap equirectangular distance estimate (metres), good enough at
 * bike-ride scale to decide "did the fix actually move" — not a substitute
 * for a real geodesic when correctness at range matters (see bearingBetween
 * for the great-circle bearing itself). Shared by routeMapView's course-up
 * jitter guard and RecordScreen's stationary detection (B-51) so the two
 * "did it move" checks never drift apart. */
export function metresBetween(lat0: number, lon0: number, lat1: number, lon1: number): number {
  const R = 6378137;
  const rad = Math.PI / 180;
  const dLat = (lat1 - lat0) * rad;
  const dLon = (lon1 - lon0) * rad;
  const x = dLon * Math.cos(((lat0 + lat1) / 2) * rad);
  return Math.hypot(x, dLat) * R;
}

/** Initial great-circle bearing from (lat0,lon0) to (lat1,lon1), degrees,
 * 0 = north, 90 = east, range [0, 360). */
export function bearingBetween(lat0: number, lon0: number, lat1: number, lon1: number): number {
  const rad = Math.PI / 180;
  const phi0 = lat0 * rad;
  const phi1 = lat1 * rad;
  const dLambda = (lon1 - lon0) * rad;
  const y = Math.sin(dLambda) * Math.cos(phi1);
  const x = Math.cos(phi0) * Math.sin(phi1) - Math.sin(phi0) * Math.cos(phi1) * Math.cos(dLambda);
  const theta = Math.atan2(y, x) / rad;
  return (theta + 360) % 360;
}

// ============================================================= WP-E (race-map render fixes)

/**
 * Nearest point on `path` to (lat,lon): which segment, how far along it
 * (t in [0,1]), and the distance in metres. Planar equirectangular
 * projection per segment (same constants as metresBetween — R=6378137,
 * cos of the segment's average latitude scales longitude), clamped to the
 * segment. Null only when there is no drawable path (<2 points) — mirrors
 * routeLineFeature's own null rule.
 */
export function nearestOnPath(
  path: [number, number][], lat: number, lon: number,
): { seg: number; t: number; distM: number } | null {
  if (path.length < 2) return null;
  const R = 6378137;
  const rad = Math.PI / 180;
  let best: { seg: number; t: number; distM: number } | null = null;
  for (let i = 0; i < path.length - 1; i++) {
    const [lat0, lon0] = path[i];
    const [lat1, lon1] = path[i + 1];
    const cosRef = Math.cos(((lat0 + lat1) / 2) * rad);
    const toXY = (la: number, lo: number): [number, number] => [
      (lo - lon0) * rad * cosRef * R,
      (la - lat0) * rad * R,
    ];
    const [x0, y0] = [0, 0];
    const [x1, y1] = toXY(lat1, lon1);
    const [px, py] = toXY(lat, lon);
    const vx = x1 - x0;
    const vy = y1 - y0;
    const len2 = vx * vx + vy * vy || 1;
    let t = ((px - x0) * vx + (py - y0) * vy) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = x0 + t * vx;
    const cy = y0 + t * vy;
    const distM = Math.hypot(px - cx, py - cy);
    if (best === null || distM < best.distM) best = { seg: i, t, distM };
  }
  return best;
}

/** Mirrors the routeMapView OFF_ROUTE_M threshold (120 m) — kept as a local
 * constant because this module stays pure/decoupled from the view layer
 * (file header). Used only as a self-contained safety net inside
 * routeSplitFeatures below; the caller-supplied `opts.offRoute` is still the
 * primary signal (it may reflect a stricter/richer off-route test than the
 * plain nearest-path distance computed here). */
const SPLIT_OFF_ROUTE_M = 120;

/**
 * WP-E ("dotted ahead / solid behind"): splits the ridden line into a
 * 'behind' part (drawn solid) and an 'ahead' part (drawn dotted) at the
 * rider's nearest point on the path. Dotted-ahead is only earned when the
 * rider's on-route position is itself earned — browse/finished, no rider, or
 * off-route all fall back to a single whole-line feature (never invent a
 * "behind" claim the honesty rule (D-025) hasn't earned).
 */
export function routeSplitFeatures(
  a: RouteAsset, rider: { lat: number; lon: number } | null,
  opts: { active: boolean; offRoute: boolean },
): GeoFeatureCollection<LineStringGeometry, { seg: 'behind' | 'ahead' }> | null {
  if (!a.path || a.path.length < 2) return null;
  const path = a.path;
  const toCoord = ([lat, lon]: [number, number]): GeoPosition => [lon, lat] as GeoPosition;
  const whole = (seg: 'behind' | 'ahead'): GeoFeatureCollection<LineStringGeometry, { seg: 'behind' | 'ahead' }> => ({
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: path.map(toCoord) },
      properties: { seg },
    }],
  });

  if (!opts.active) return whole('behind');

  const nearest = rider ? nearestOnPath(path, rider.lat, rider.lon) : null;
  if (rider === null || opts.offRoute || nearest === null || nearest.distM > SPLIT_OFF_ROUTE_M) {
    return whole('ahead');
  }

  const { seg, t } = nearest;
  const p0 = path[seg];
  const p1 = path[seg + 1];
  const P: [number, number] = [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];

  const behindCoords: GeoPosition[] = [...path.slice(0, seg + 1).map(toCoord), toCoord(P)];
  const aheadCoords: GeoPosition[] = [toCoord(P), ...path.slice(seg + 1).map(toCoord)];

  const features: GeoFeature<LineStringGeometry, { seg: 'behind' | 'ahead' }>[] = [];
  if (behindCoords.length >= 2) {
    features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: behindCoords }, properties: { seg: 'behind' } });
  }
  if (aheadCoords.length >= 2) {
    features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: aheadCoords }, properties: { seg: 'ahead' } });
  }
  return { type: 'FeatureCollection', features };
}

/**
 * One 2-point LineString per gate, centred on the gate, perpendicular to the
 * local route heading, total ground length `2*halfLenM` (30 m default) —
 * replaces the gate-ring circles (invisible on the night basemap: transparent
 * fill + near-black ring on near-black tiles) with a short tick that stays
 * visible in a dim theme-aware colour until the sector is scored (D-013/D-030
 * honesty: unscored ticks carry no verdict hue, the caller supplies the dim
 * colour via paint). Heading at gate i: from `path`/`gateIdx` when both are
 * present and `gateIdx.length` matches the gate count (the real road either
 * side of the gate); else the chord between the adjacent gates.
 */
export function gateTicksFeatureCollection(
  a: RouteAsset, gateColours?: (string | null)[], halfLenM = 15,
): GeoFeatureCollection<LineStringGeometry, GateProperties> {
  const n = a.gates.length;
  return {
    type: 'FeatureCollection',
    features: a.gates.map((g, i) => {
      let heading: number;
      if (a.path && a.gateIdx && a.gateIdx.length === a.gates.length) {
        const j = a.gateIdx[i];
        const jPrev = Math.max(j - 1, 0);
        const jNext = Math.min(j + 1, a.path.length - 1);
        const p0 = a.path[jPrev];
        const p1 = a.path[jNext];
        heading = bearingBetween(p0[0], p0[1], p1[0], p1[1]);
      } else {
        const iPrev = Math.max(i - 1, 0);
        const iNext = Math.min(i + 1, n - 1);
        const gPrev = a.gates[iPrev];
        const gNext = a.gates[iNext];
        heading = bearingBetween(gPrev.lat, gPrev.lon, gNext.lat, gNext.lon);
      }
      const perp = (heading + 90) * (Math.PI / 180);
      const dLat = (halfLenM * Math.cos(perp)) / 111320;
      const dLon = (halfLenM * Math.sin(perp)) / (111320 * Math.cos((g.lat * Math.PI) / 180));

      // Same B-50 hardening as gatesFeatureCollection: '' is treated as null.
      const raw = gateColours?.[i] ?? null;
      const colour = raw === '' ? null : raw;
      const properties: GateProperties = colour !== null
        ? { name: g.name, colour }
        : { name: g.name };

      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [g.lon - dLon, g.lat - dLat] as GeoPosition,
            [g.lon + dLon, g.lat + dLat] as GeoPosition,
          ],
        },
        properties,
      };
    }),
  };
}

// ============================================================ WP-D (rider-only map camera)

/** Pure camera-target rule for the MapLibre rung (WP-D §3.1c), factored out
 * of the view component so it is headlessly testable. Replaces the old
 * hardcoded Leuven-area fallback coordinate: when there is genuinely nothing
 * to target — no fix, no bounds — the camera gets NO target at all (`{}`),
 * never a real-world place unrelated to the rider. Rule, in order: 'free'
 * (post-drag/pinch) always `{}` so a new fix never yanks the camera back;
 * 'fit' with bounds returns the bounds tuple (bearing pinned to 0, the
 * existing 20px padding); otherwise follow the fix if there is one; else
 * follow the bounds midpoint if there are bounds (fit-with-null-bounds
 * degrades here too — same as 'follow' with no fix, useful); else `{}`. */
export interface CameraTarget {
  center?: [number, number];
  zoom?: number;
  bounds?: [number, number, number, number];
  bearing?: number;
  pitch?: number;
  duration?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
}

export function cameraTargetFor(input: {
  mode: 'follow' | 'fit' | 'free';
  here: { lat: number; lon: number } | null;
  bounds: LonLatBoundsBox | null;
  zoom: number;
  bearing: number;
}): CameraTarget {
  const { mode, here, bounds, zoom, bearing } = input;
  if (mode === 'free') return {};
  if (mode === 'fit' && bounds) {
    return {
      bounds: [bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat],
      bearing: 0,
      padding: { top: 20, right: 20, bottom: 20, left: 20 },
    };
  }
  if (here) {
    return { center: [here.lon, here.lat], zoom, bearing, pitch: 0, duration: 500 };
  }
  if (bounds) {
    return {
      center: [(bounds.minLon + bounds.maxLon) / 2, (bounds.minLat + bounds.maxLat) / 2],
      zoom, bearing, pitch: 0, duration: 500,
    };
  }
  return {};
}

// ==================================================== WP-sector-coloured-trail P1 (2026-08-26 ruling)

export interface SectorSpanProperties {
  /** 1-based sector number — the span ENDING at gate `sector`. */
  sector: number;
  colour?: string;
}

/**
 * One LineString per SECTOR — the slice of `path` between consecutive gates
 * (path[gateIdx[i-1]] .. path[gateIdx[i]], inclusive both ends, so adjacent
 * spans share their boundary vertex) — so the finished-ride trace can paint
 * each sector's stretch of the route in the colour that sector earned
 * (ruled 2026-08-26: verdict colour lives on the line spans; gate ticks are
 * neutral markers). `sectorColours` is GATE-indexed, the same shape
 * ResultScreen already computes for B-57's gate colours: index i is the
 * colour of the sector ending at gate i (sector i, 1-based); index 0
 * (START — no sector ends there) is ignored. `colour` is OMITTED when a
 * sector has no earned colour, and '' is treated as null — the same
 * ['has','colour'] paint convention and B-50 hardening as the gate builders
 * above. The path's lead-in (before gateIdx[0]) and lead-out (after the
 * last gateIdx) are covered by NO span: they are outside the timed lap and
 * stay the base line colour. Returns null when the asset cannot honestly be
 * split — no/short path, or no gateIdx matching the gate count — so the
 * caller falls back to the plain single-colour line.
 */
export function sectorSpansFeatureCollection(
  a: RouteAsset, sectorColours?: (string | null)[],
): GeoFeatureCollection<LineStringGeometry, SectorSpanProperties> | null {
  if (!a.path || a.path.length < 2) return null;
  if (!a.gateIdx || a.gateIdx.length !== a.gates.length || a.gateIdx.length < 2) return null;
  const features: GeoFeature<LineStringGeometry, SectorSpanProperties>[] = [];
  for (let i = 1; i < a.gateIdx.length; i++) {
    const slice = a.path.slice(a.gateIdx[i - 1], a.gateIdx[i] + 1);
    if (slice.length < 2) continue; // degenerate span (duplicate gateIdx) — nothing drawable
    const raw = sectorColours?.[i] ?? null;
    const colour = raw === '' ? null : raw;
    const properties: SectorSpanProperties = colour !== null
      ? { sector: i, colour }
      : { sector: i };
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: slice.map(([lat, lon]) => [lon, lat] as GeoPosition),
      },
      properties,
    });
  }
  return { type: 'FeatureCollection', features };
}
