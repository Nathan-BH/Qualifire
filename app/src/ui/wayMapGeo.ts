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
import { CORRIDOR_M, PASS_GAP_M } from '../../core/src/index.ts';
import { pathCumulativeM, type WayAsset } from './wayMapMath.ts';

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
export function wayLineFeature(a: WayAsset): GeoFeature<LineStringGeometry> | null {
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
  /** virgin-cycle26 brief 04: present (1) when this feature belongs to a pass
   * the rider is NOT on (wayMapGeo.ts faintVertices); omitted otherwise, so
   * the ['has','faint'] opacity expression leaves everything else at 1. */
  faint?: 1;
}

/**
 * One point per gate. `colour` is OMITTED (not set to null) when the gate has
 * no colour yet, so the ['has','colour'] paint expression can distinguish
 * "not scored" from "scored transparent".
 */
export function gatesFeatureCollection(
  a: WayAsset, gateColours?: (string | null)[],
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
export function wayBounds(a: WayAsset): LonLatBoundsBox | null {
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

/** WP-H: bounds of a ridden trail, for a browse map with no route asset
 * (unmatched or free ride). null for < 2 points. */
export function trailBounds(pts: readonly { lat: number; lon: number }[]): LonLatBoundsBox | null {
  if (pts.length < 2) return null;
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const p of pts) {
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
  }
  return { minLon, minLat, maxLon, maxLat };
}

export interface PolygonGeometry { type: 'Polygon'; coordinates: GeoPosition[][] }

export interface PlaceProperties { part: 'disc' | 'centre' }

const EARTH_R_M = 6371000;

/** virgin-cycle15 brief 12: a landmark's arrival disc (catalog.ts landmarkAt's
 * `d <= radiusM`) as a closed polygon ring in REAL metres, plus its centre as a
 * point — so the disc scales with the map on zoom, which a pixel-radius circle
 * layer cannot do. Same equirectangular offsets as metresBetween; sub-decimetre
 * at the radii the catalog validates (catalog.ts:67 forbids <= 0). Ring is
 * [lon, lat] like every other builder here. */
export function placeFeatureCollection(
  lat: number, lon: number, radiusM: number, steps = 64,
): GeoFeatureCollection<PolygonGeometry | PointGeometry, PlaceProperties> {
  const dLat = (radiusM / EARTH_R_M) * (180 / Math.PI);
  const dLon = dLat / Math.cos((lat * Math.PI) / 180);
  const ring: GeoPosition[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (2 * Math.PI * i) / steps;
    ring.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  ring.push([ring[0][0], ring[0][1]]);
  return {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { part: 'disc' }, geometry: { type: 'Polygon', coordinates: [ring] } },
      { type: 'Feature', properties: { part: 'centre' }, geometry: { type: 'Point', coordinates: [lon, lat] } },
    ],
  };
}

/** Bounds for the camera 'fit': the disc's box widened by `pad` (1.6 = the
 * disc sits inside the frame with air around it, on top of cameraTargetFor's
 * own 20 px padding). */
export function placeBounds(lat: number, lon: number, radiusM: number, pad = 1.6): LonLatBoundsBox {
  const dLat = (radiusM / EARTH_R_M) * (180 / Math.PI) * pad;
  const dLon = (dLat / Math.cos((lat * Math.PI) / 180));
  return { minLon: lon - dLon, minLat: lat - dLat, maxLon: lon + dLon, maxLat: lat + dLat };
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
const SPLIT_OFF_WAY_M = 120;

/**
 * WP-E ("dotted ahead / solid behind"): splits the ridden line into a
 * 'behind' part (drawn solid) and an 'ahead' part (drawn dotted) at the
 * rider's nearest point on the path. Dotted-ahead is only earned when the
 * rider's on-route position is itself earned — browse/finished, no rider, or
 * off-route all fall back to a single whole-line feature (never invent a
 * "behind" claim the honesty rule (D-025) hasn't earned).
 */
export function waySplitFeatures(
  a: WayAsset, rider: { lat: number; lon: number } | null,
  opts: { active: boolean; offWay: boolean },
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
  if (rider === null || opts.offWay || nearest === null || nearest.distM > SPLIT_OFF_WAY_M) {
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
/**
 * Pixel-floor for a gate tick's geographic half-length, at the CURRENT
 * MapLibre zoom (not the PNG rung's own asset-pixel scale — see
 * `metresPerPixel` in wayMapMath.ts, which is a different thing entirely).
 *
 * Bug (cycle virgin-cycle10): `gateTicksFeatureCollection` draws each gate
 * as a fixed-length (default 30 m total) GeoJSON LineString, but the MapLibre
 * `line-width` paint property is a constant number of SCREEN PIXELS — it
 * does not scale with zoom. Zoomed in, 30 geographic metres is many screen
 * pixels and the tick reads as a line; zoomed out to fit a whole ride, 30 m
 * can be only a couple of screen pixels, and with `line-cap: 'round'` on
 * both ends a near-zero-length line renders as a filled dot, not a line.
 *
 * Fix: instead of a fixed geographic half-length, pick the LARGER of a
 * fixed geographic floor (`floorM`, still 15 m — unchanged from today at
 * typical follow/browse zooms) and whatever geographic length currently
 * projects to `minHalfPx` screen pixels at this zoom. `metresPerPixelAtZoom`
 * uses the standard Web Mercator constant for 512px tiles (78271.517 =
 * metres/pixel at zoom 0 on the equator), matching MapLibre GL's own tile
 * math, and divides by cos(lat) to correct for the Mercator latitude
 * stretch — this is deliberately a different formula from
 * `wayMapMath.ts`'s `metresPerPixel()`, which scales a pre-rendered PNG
 * asset's own fixed pixel grid and has nothing to do with live map zoom.
 */
export function gateHalfLenM(lat: number, zoom: number, minHalfPx = 7, floorM = 15): number {
  const metresPerPixelAtZoom = (78271.517 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  return Math.max(floorM, minHalfPx * metresPerPixelAtZoom);
}

export function gateTicksFeatureCollection(
  a: WayAsset, gateColours?: (string | null)[], halfLenM = 15,
  faintGates?: readonly boolean[],
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
      if (faintGates?.[i]) properties.faint = 1;

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
 * degrades here too — same as 'follow' with no fix, useful); else `{}`.
 *
 * WP-M: `userBearing` (a bearing the rider set by two-finger rotation) is
 * `undefined`/`null` for every pre-WP-M caller and every existing test —
 * byte-identical output. When non-null it overrides `bearing` on EVERY push,
 * including 'fit' (which otherwise pins 0), so a held rotation survives
 * +/-/FIT/ME until FIT explicitly sets it back to 0 (virgin-cycle27 08 — the compass button is gone) (0, not
 * null — a `finished` map holds a course-up `bearing`, so clearing to null
 * would let the next push bring that course-up value back and un-reset the
 * map). */
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
  /** WP-M: a bearing the rider set by two-finger rotation. See the doc
   * comment above `CameraTarget` for why this overrides `bearing`
   * everywhere, including the 'fit' pin. */
  userBearing?: number | null;
}): CameraTarget {
  const { mode, here, bounds, zoom } = input;
  const userBearing = input.userBearing ?? null;
  const bearing = userBearing ?? input.bearing;
  if (mode === 'free') return {};
  if (mode === 'fit' && bounds) {
    return {
      bounds: [bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat],
      bearing: userBearing ?? 0,
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

/** WP-M (Nathan Q3, 2026-09-05): two-finger rotation is on everywhere except
 * the actual race ribbon. Mirrors routeMapView's `unlocked` matrix: browse,
 * prestart and finished are "released to browse"; moving/stopped stay
 * course-up with the gesture off. Kept as its own function (not just reused
 * as `unlocked`) so the two rules can diverge later without a hidden
 * coupling — e.g. if the `finished` clause below ever needs to flip, it is
 * one edit in one place. Also gates reading a gesture back in
 * routeMapView.tsx's onRegionDidChange: while racing, touchRotate is false
 * but a one-finger PAN still ends with userInteraction: true and the current
 * course-up bearing in the payload — capturing that would freeze the
 * ribbon's heading, so that read is skipped whenever this returns false. */
export function rotateEnabledFor(
  variant: 'live' | 'browse',
  liveState: 'prestart' | 'moving' | 'stopped' | 'finished',
): boolean {
  return variant === 'browse' || liveState === 'prestart' || liveState === 'finished';
}

/** virgin-cycle22 06 (Nathan 2026-10-05): the ONE zoom-bar button where FIT and
 * ME used to be is labelled with the ACTION the next tap performs, never the
 * current state. Returns the mode that tap sets — 'fit' (label "FIT") or
 * 'follow' (label "ME"):
 *  - follow -> 'fit': the rider is being followed; the only other thing to do
 *    is fit the whole way.
 *  - fit or free (after FIT, or a drag/pinch/rotate) -> 'follow': the way back
 *    to the rider is "ME".
 *  - showRider false (browse surfaces) -> always 'fit': nothing to follow.
 * Deliberately NOT a function of the GPS fix: with no fix yet, 'follow' does
 * exactly what the old ME button did (cameraTargetFor centres the way bounds
 * at the follow zoom, or holds when there is no way either), and a label that
 * flipped the moment a fix arrived would change under a moving thumb
 * mid-race. Pure, so the headless suite pins the table. */
export function fitMeNextMode(mode: 'follow' | 'fit' | 'free', showRider: boolean): 'fit' | 'follow' {
  return showRider && mode !== 'follow' ? 'follow' : 'fit';
}

// ==================================================== WP-sector-coloured-trail P1 (2026-08-26 ruling)

export interface SectorSpanProperties {
  /** 1-based sector number — the span ENDING at gate `sector`. */
  sector: number;
  colour?: string;
  lead?: 'in' | 'out';
  /** virgin-cycle26 brief 04: present (1) when this feature belongs to a pass
   * the rider is NOT on (wayMapGeo.ts faintVertices); omitted otherwise, so
   * the ['has','faint'] opacity expression leaves everything else at 1. */
  faint?: 1;
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
 * above. The path's lead-in (start -> gateIdx[0]) and lead-out (gateIdx[last] -> end)
 * are outside the timed lap and are never a sector. By default they get NO
 * span (base line colour shows). When `leadColour` is a non-empty string, two
 * extra features are appended AFTER the sector spans — `lead: 'in'` with
 * `sector: 0` (the span ending at gate 0, matching the gate-indexed
 * convention) and `lead: 'out'` with `sector: gateIdx.length` (one past the
 * last gate) — both carrying `colour: leadColour`. Neither value can collide
 * with a real sector index (1..gateIdx.length-1). A degenerate stretch
 * (< 2 points, e.g. gateIdx[0] === 0) is skipped, same rule as the loop.
 * Returns null when the asset cannot honestly be
 * split — no/short path, or no gateIdx matching the gate count — so the
 * caller falls back to the plain single-colour line.
 */
export function sectorSpansFeatureCollection(
  a: WayAsset, sectorColours?: (string | null)[],
  leadColour?: string | null,
  faintGates?: readonly boolean[],
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
    if (faintGates?.[i]) properties.faint = 1;
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: slice.map(([lat, lon]) => [lon, lat] as GeoPosition),
      },
      properties,
    });
  }
  // Lead-in / lead-out: permanently non-scorable, so a fixed caller-supplied
  // colour, never data-driven from sectorColours. Appended after the sector
  // spans so features[0..n-2] stay the real sectors (tests index them).
  if (leadColour) {
    const firstGate = a.gateIdx[0];
    const lastGate = a.gateIdx[a.gateIdx.length - 1];
    const leadIn = a.path.slice(0, firstGate + 1);
    if (leadIn.length >= 2) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: leadIn.map(([lat, lon]) => [lon, lat] as GeoPosition),
        },
        properties: { sector: 0, lead: 'in', colour: leadColour },
      });
    }
    const leadOut = a.path.slice(lastGate);
    if (leadOut.length >= 2) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: leadOut.map(([lat, lon]) => [lon, lat] as GeoPosition),
        },
        properties: { sector: a.gateIdx.length, lead: 'out', colour: leadColour },
      });
    }
  }
  return { type: 'FeatureCollection', features };
}

// ==================================================== virgin-cycle26 brief 04 (pass-aware fade)

/** The other copy of a retraced stretch brightens once the rider's chainage is
 * within this of it — the live engine's own forward window (core/live.ts
 * DEFAULT_LIVE_OPTIONS.windowFwd), so "coming into view" means the same thing
 * to the map as to the projector. One constant to tune on device. */
export const FADE_NEAR_M = 240;
/** line-opacity of a faint run / tick / span. Dim, never hidden (Nathan
 * 2026-10-08: a rider who strays must still see it). */
export const FAINT_OPACITY = 0.3;

export interface PassModel {
  /** planar metres along the path, per vertex */
  cumM: number[];
  /** per vertex: chainage of the nearest vertex of ANOTHER pass of the same
   * line (> gapM away in chainage, within withinM), or null when the ground is
   * not retraced */
  partnerM: (number | null)[];
}

/** Once per asset. null when the asset has no drawable path. O(n²) over the
 * path (≤ RUNTIME_PATH_MAX_VERTICES = 4000). */
export function buildPassModel(a: WayAsset, withinM = CORRIDOR_M, gapM = PASS_GAP_M): PassModel | null {
  const path = a.path;
  if (!path || path.length < 2) return null;
  const cumM = pathCumulativeM(path);
  const n = path.length;
  const x: number[] = new Array(n);
  const y: number[] = new Array(n);
  const lat0 = path[0][0];
  const clat = 111320 * Math.cos((lat0 * Math.PI) / 180);
  for (let k = 0; k < n; k++) {
    x[k] = (path[k][1] - path[0][1]) * clat;
    y[k] = (path[k][0] - lat0) * 111320;
  }
  const w2 = withinM * withinM;
  const partnerM: (number | null)[] = new Array(n).fill(null);
  for (let k = 0; k < n; k++) {
    let bestD2 = w2;
    let best: number | null = null;
    for (let j = 0; j < n; j++) {
      if (Math.abs(cumM[j] - cumM[k]) <= gapM) continue;
      const dx = x[j] - x[k];
      const dy = y[j] - y[k];
      const d2 = dx * dx + dy * dy;
      if (d2 <= bestD2) { bestD2 = d2; best = cumM[j]; }
    }
    partnerM[k] = best;
  }
  return { cumM, partnerM };
}

/** Per vertex: is it on a pass the rider is NOT on right now? null when there
 * is no progress or nothing is faint (so callers can keep today's single
 * feature). The rule: the ground is retraced, the rider's chainage is nearer
 * the OTHER copy than this one, and this one is further than FADE_NEAR_M away. */
export function faintVertices(model: PassModel, progressM: number | null | undefined, nearM = FADE_NEAR_M): boolean[] | null {
  if (progressM === null || progressM === undefined || !Number.isFinite(progressM)) return null;
  const s = progressM;
  const out: boolean[] = new Array(model.cumM.length);
  let any = false;
  for (let k = 0; k < model.cumM.length; k++) {
    const p = model.partnerM[k];
    const f = p !== null && Math.abs(s - p) < Math.abs(s - model.cumM[k]) && Math.abs(model.cumM[k] - s) > nearM;
    out[k] = f;
    if (f) any = true;
  }
  return any ? out : null;
}

/** Per gate: faint iff its path vertex is. All false without gateIdx or flags. */
export function gateFaint(a: WayAsset, faint: boolean[] | null): boolean[] {
  const idx = a.gateIdx;
  return a.gates.map((_, i) => !!(faint && idx && idx.length === a.gates.length && faint[Math.min(idx[i], faint.length - 1)]));
}

/** The route line as runs: consecutive vertices with the same faint flag form
 * one LineString (adjacent runs share their boundary vertex, like sector
 * spans); faint runs carry `faint: 1`, the others no property. With `faint`
 * null this is exactly today's single wayLineFeature. null without a path. */
export function routeRunsFeatureCollection(
  a: WayAsset, faint: boolean[] | null,
): GeoFeatureCollection<LineStringGeometry, { faint?: 1 }> | null {
  const single = wayLineFeature(a);
  if (!single) return null;
  if (!faint || faint.length !== a.path!.length) return { type: 'FeatureCollection', features: [single as GeoFeature<LineStringGeometry, { faint?: 1 }>] };
  const path = a.path!;
  const features: GeoFeature<LineStringGeometry, { faint?: 1 }>[] = [];
  let start = 0;
  for (let k = 1; k <= path.length; k++) {
    if (k < path.length && faint[k] === faint[start]) continue;
    const end = Math.min(k, path.length - 1); // share the boundary vertex
    const slice = path.slice(start, end + 1);
    if (slice.length >= 2) {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: slice.map(([lat, lon]) => [lon, lat] as GeoPosition) },
        properties: faint[start] ? { faint: 1 } : {},
      });
    }
    start = k;
  }
  return { type: 'FeatureCollection', features };
}

/** virgin-cycle28 01 (Nathan 2026-10-09): the camera stop that brings ONE gate into view when the rider
 * taps its chip on the gate card. Centre on the gate; never zoom OUT a rider who is already closer than
 * GATE_FOCUS_ZOOM. Pure, so the suite pins it. */
export const GATE_FOCUS_ZOOM = 17;
export function gateFocusStop(
  gate: { lat: number; lon: number },
  liveZoom: number | null,
): { center: [number, number]; zoom: number; duration: number } {
  return { center: [gate.lon, gate.lat], zoom: Math.max(liveZoom ?? 0, GATE_FOCUS_ZOOM), duration: 500 };
}
