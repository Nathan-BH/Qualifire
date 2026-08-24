/**
 * "Fake it" route map — the maths only. Pure, headless-testable, NO native
 * module (Nathan, 2026-08-16).
 *
 * Each ratified route is pre-rendered once to a PNG (its line plus its gates)
 * by data/analysis/08_build_route_assets.py, together with the Web-Mercator
 * transform that produced it. At runtime the ride screen draws that PNG with
 * <Image> and puts the rider on top with a positioned <View>. No tile server,
 * no network on the bike, no map engine redrawing at 1 Hz — and because there
 * is no native dependency, changes here reach the phone over Fast Refresh
 * instead of needing a build.
 *
 * MapLibre stays an option: everything the ride screen needs is
 * projectToPixel() + cropFor(), so a real basemap can replace the Image later
 * without touching ride logic. The projection is Web Mercator precisely so a
 * tiled basemap lines up with these assets if it ever does.
 *
 * HONESTY (D-025): the dot is placed from the rider's TRUE position, never
 * from chainage-along-the-reference. Chainage would pin it to the drawn line
 * and make a detour look like a perfect lap. Off-route must look off-route —
 * see offRouteM().
 */

export interface RouteGate {
  name: string;
  lat: number;
  lon: number;
  px: number;
  py: number;
}

export interface RouteAsset {
  image: string;
  /** the ridden line, decimated — [lat, lon] pairs */
  path?: [number, number][];
  /** index into `path` of each gate, so a replay can walk the real road */
  gateIdx?: number[];
  w: number;
  h: number;
  /** transform constants, exactly as the renderer used them */
  x0: number;
  y1: number;
  scale: number;
  offx: number;
  offy: number;
  gates: RouteGate[];
  sourceRide: string;
}

export interface Px { px: number; py: number }

const mercX = (lon: number): number => (lon * Math.PI) / 180;
const mercY = (lat: number): number =>
  Math.log(Math.tan(Math.PI / 4 + ((lat * Math.PI) / 180) / 2));

/** lat/lon → pixel in the pre-rendered PNG. Mirrors the Python renderer. */
export function projectToPixel(a: RouteAsset, lat: number, lon: number): Px {
  return {
    px: a.offx + (mercX(lon) - a.x0) * a.scale,
    py: a.offy + (a.y1 - mercY(lat)) * a.scale,
  };
}

/** Metres per pixel at this latitude — for turning a pixel offset into a
 * distance the rider would recognise. */
export function metresPerPixel(a: RouteAsset, lat: number): number {
  return (6378137 * Math.cos((lat * Math.PI) / 180)) / a.scale;
}

/**
 * How far the rider is from the drawn line, in metres. Measures against the
 * decimated `path` (the actual ridden/drawn road) when the asset has one —
 * WP-E fix: measuring against the straight gate-to-gate chord instead made a
 * legitimate road bend read as false off-route whenever the road strayed
 * >120 m from the chord (2026-08-20 ride review). Falls back to the old
 * gate-chord polyline only when `path` is absent (pre-path assets, or a test
 * fixture built without one). Cheap and approximate — enough to decide
 * whether to say "off route", not a substitute for the engine's corridor
 * test.
 */
export function offRouteM(a: RouteAsset, lat: number, lon: number): number {
  const p = projectToPixel(a, lat, lon);
  let best = Infinity;
  if (a.path && a.path.length >= 2) {
    // precompute once per call — path is decimated, O(hundreds) at 1 Hz
    const px: Px[] = a.path.map(([plat, plon]) => projectToPixel(a, plat, plon));
    for (let i = 1; i < px.length; i++) {
      const g0 = px[i - 1];
      const g1 = px[i];
      const vx = g1.px - g0.px;
      const vy = g1.py - g0.py;
      const len2 = vx * vx + vy * vy || 1;
      let t = ((p.px - g0.px) * vx + (p.py - g0.py) * vy) / len2;
      t = Math.max(0, Math.min(1, t));
      const dx = p.px - (g0.px + t * vx);
      const dy = p.py - (g0.py + t * vy);
      best = Math.min(best, Math.hypot(dx, dy));
    }
  } else {
    for (let i = 1; i < a.gates.length; i++) {
      const g0 = a.gates[i - 1];
      const g1 = a.gates[i];
      const vx = g1.px - g0.px;
      const vy = g1.py - g0.py;
      const len2 = vx * vx + vy * vy || 1;
      let t = ((p.px - g0.px) * vx + (p.py - g0.py) * vy) / len2;
      t = Math.max(0, Math.min(1, t));
      const dx = p.px - (g0.px + t * vx);
      const dy = p.py - (g0.py + t * vy);
      best = Math.min(best, Math.hypot(dx, dy));
    }
  }
  return best * metresPerPixel(a, lat);
}

/**
 * Px-space twin of routeMapGeo.ts's `gateTicksFeatureCollection` — the tick
 * endpoints for the PNG rung, in the asset's own pixel space rather than
 * lat/lon. Heading at the gate: from `path`/`gateIdx` when both are present
 * and `gateIdx.length` matches the gate count (walks the real road either
 * side of the gate), else the chord between the adjacent gates — same
 * selection rule as the GeoJSON builder, so both rungs draw the same tick.
 */
export function gateTickPx(
  a: RouteAsset, i: number, halfLenM = 15,
): { x0: number; y0: number; x1: number; y1: number } {
  const g = a.gates[i];
  const n = a.gates.length;
  let p0: Px;
  let p1: Px;
  if (a.path && a.gateIdx && a.gateIdx.length === a.gates.length) {
    const j = a.gateIdx[i];
    const jPrev = Math.max(j - 1, 0);
    const jNext = Math.min(j + 1, a.path.length - 1);
    p0 = projectToPixel(a, a.path[jPrev][0], a.path[jPrev][1]);
    p1 = projectToPixel(a, a.path[jNext][0], a.path[jNext][1]);
  } else {
    const iPrev = Math.max(i - 1, 0);
    const iNext = Math.min(i + 1, n - 1);
    const gPrev = a.gates[iPrev];
    const gNext = a.gates[iNext];
    p0 = { px: gPrev.px, py: gPrev.py };
    p1 = { px: gNext.px, py: gNext.py };
  }
  const dx = p1.px - p0.px;
  const dy = p1.py - p0.py;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // unit perpendicular to the heading direction
  const perpX = -uy;
  const perpY = ux;
  const halfLenPx = halfLenM / metresPerPixel(a, g.lat);
  return {
    x0: g.px - perpX * halfLenPx,
    y0: g.py - perpY * halfLenPx,
    x1: g.px + perpX * halfLenPx,
    y1: g.py + perpY * halfLenPx,
  };
}

/**
 * Position along the ROUTE at a given ride time, walking the real polyline.
 * `gateTimes` are the cumulative seconds at each gate. Between two gates the
 * dot advances by arc length, so it follows every bend the rider took instead
 * of cutting the corner (cycle 009 — the demo used to draw straight lines).
 */
export function positionAtTime(
  a: RouteAsset, gateTimes: number[], tSec: number,
): { lat: number; lon: number } | null {
  const path = a.path;
  const idx = a.gateIdx;
  if (!path || !idx || path.length < 2 || idx.length !== gateTimes.length) return null;

  let k = 0;
  while (k < gateTimes.length - 2 && tSec >= gateTimes[k + 1]) k++;
  const span = Math.max(gateTimes[k + 1] - gateTimes[k], 1e-6);
  const f = Math.max(0, Math.min(1, (tSec - gateTimes[k]) / span));

  const i0 = idx[k];
  const i1 = Math.max(idx[k + 1], i0 + 1);
  // cumulative planar length over this sector's slice of the path
  const cum: number[] = [0];
  for (let i = i0; i < i1 && i + 1 < path.length; i++) {
    const dy = (path[i + 1][0] - path[i][0]) * 111320;
    const dx = (path[i + 1][1] - path[i][1]) * 111320 * Math.cos((path[i][0] * Math.PI) / 180);
    cum.push(cum[cum.length - 1] + Math.hypot(dx, dy));
  }
  const total = cum[cum.length - 1];
  if (total <= 0) return { lat: path[i0][0], lon: path[i0][1] };

  const want = f * total;
  let j = 0;
  while (j < cum.length - 2 && cum[j + 1] < want) j++;
  const segLen = Math.max(cum[j + 1] - cum[j], 1e-9);
  const g = Math.max(0, Math.min(1, (want - cum[j]) / segLen));
  const p0 = path[Math.min(i0 + j, path.length - 1)];
  const p1 = path[Math.min(i0 + j + 1, path.length - 1)];
  return { lat: p0[0] + (p1[0] - p0[0]) * g, lon: p0[1] + (p1[1] - p0[1]) * g };
}

export interface Crop {
  /** style values for the <Image>: scale first, then translate, in px */
  scale: number;
  translateX: number;
  translateY: number;
}

/**
 * Centre the view on a pixel at a chosen zoom, clamped so the image never
 * pulls away from the edges of the viewport. `zoom` is a multiplier on the
 * asset's natural size: 1 = whole route visible, 4 = tight live crop.
 */
export function cropFor(
  a: RouteAsset, at: Px, viewW: number, viewH: number, zoom: number,
): Crop {
  const base = Math.min(viewW / a.w, viewH / a.h);   // fit-whole-route scale
  const scale = base * Math.max(1, zoom);
  const halfW = viewW / 2;
  const halfH = viewH / 2;
  const imgW = a.w * scale;
  const imgH = a.h * scale;
  // where the target pixel would land if the image were centred at origin
  let tx = halfW - at.px * scale;
  let ty = halfH - at.py * scale;
  // clamp — but only when the image is bigger than the viewport, otherwise
  // centre it (a short route at zoom 1 should not be shoved into a corner)
  tx = imgW <= viewW ? (viewW - imgW) / 2 : Math.min(0, Math.max(viewW - imgW, tx));
  ty = imgH <= viewH ? (viewH - imgH) / 2 : Math.min(0, Math.max(viewH - imgH, ty));
  return { scale, translateX: tx, translateY: ty };
}
