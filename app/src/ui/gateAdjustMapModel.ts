/**
 * Pure geometry for the gate-adjustment card's map (WP-I, map half). The
 * card draws the ride's REAL reference line (not a straight bar) and places
 * each gate on it by chainage on every nudge. Reuses routeAssetRuntime's
 * decimation + Mercator fit and routeMapMath's projection unchanged; the
 * only new maths is re-fitting the asset into the card's own box and a
 * chainage-probe tick (a sibling of gateTickPx that needs no gateIdx, so
 * the asset is built ONCE per ref, not once per nudge).
 *
 * Lives beside gateAdjustModel.ts rather than inside it: routeAssetRuntime
 * imports gateName from gateAdjustModel, so the map maths importing
 * routeAssetRuntime from there would be a cycle.
 *
 * Scrub-gesture geometry (WP-I §3.5) is DESIGNED but NOT AUTHORIZED
 * (Nathan's Q2 answer, QUESTIONS-FOR-NATHAN2.md: "keep just the +-pad for
 * now") — nothing from §3.5 is implemented here.
 */
import type { RefLine } from '../../core/src/index.ts';
import { buildRuntimeRouteAsset, pointAtChainage } from './routeAssetRuntime.ts';
import { metresPerPixel, projectToPixel, type RouteAsset } from './routeMapMath.ts';

/** Inset between the card box edge and the fitted path (room for ticks + labels). */
export const CARD_MAP_PAD_PX = 22;
/** Tick half-length in METRES — same as gateTickPx's default. */
export const CARD_TICK_HALF_M = 15;
/** ...but never shorter than this on screen (a 4 km route in a 320 px box
 * would make 30 m ≈ 2 px). PNG rung clamps to 10; the card's ticks are the
 * tap targets' visual anchor, so slightly larger. */
export const CARD_TICK_MIN_PX = 14;
/** Selected gate: tick drawn this many times longer/thicker. */
export const CARD_TICK_SELECTED_FACTOR = 1.6;
/** Heading probe either side of the gate chainage, metres. */
export const HEADING_PROBE_M = 10;

// Same Web-Mercator helpers routeAssetRuntime.ts / routeMapMath.ts keep private.
const mercX = (lon: number): number => (lon * Math.PI) / 180;
const mercY = (lat: number): number => Math.log(Math.tan(Math.PI / 4 + ((lat * Math.PI) / 180) / 2));

/**
 * Re-fit an asset's path into a w×h box with padPx inset: the same fit
 * buildRuntimeRouteAsset does for 900×1400/60, re-run for the card's box, so
 * projectToPixel()/metresPerPixel() answer directly in CARD pixels (no
 * cropFor, no <Image> transform). Gates are re-projected too. Pure.
 */
export function refitAssetToBox(asset: RouteAsset, w: number, h: number, padPx = CARD_MAP_PAD_PX): RouteAsset {
  const path = asset.path ?? [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [lat, lon] of path) {
    const x = mercX(lon), y = mercY(lat);
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (path.length === 0) { minX = maxX = 0; minY = maxY = 0; }
  const dx = Math.max(maxX - minX, 1e-12);
  const dy = Math.max(maxY - minY, 1e-12);
  const scale = Math.min((w - 2 * padPx) / dx, (h - 2 * padPx) / dy);
  const out: RouteAsset = {
    ...asset,
    w, h,
    x0: minX, y1: maxY, scale,
    offx: (w - dx * scale) / 2,
    offy: (h - dy * scale) / 2,
  };
  out.gates = asset.gates.map((g) => ({ ...g, ...projectToPixel(out, g.lat, g.lon) }));
  return out;
}

/**
 * The card's frame for one reference line: built ONCE per (ref, box) — the
 * path does not move when a gate is nudged, only the gate marks do (see
 * gateMarkPx). Only START/FINISH are handed to the builder; the card ignores
 * the returned `gates` and places its own from live chainages.
 */
export function buildCardMapFrame(ref: RefLine, w: number, h: number, padPx = CARD_MAP_PAD_PX): RouteAsset {
  return refitAssetToBox(buildRuntimeRouteAsset(ref, [0, ref.length], 'gate-card'), w, h, padPx);
}

/** One rotated-View segment, left-anchored — the routeMapView.tsx imgFailed convention. */
export interface SegPx { x0: number; y0: number; len: number; angDeg: number }

export function pathSegmentsPx(frame: RouteAsset): SegPx[] {
  const path = frame.path ?? [];
  const out: SegPx[] = [];
  for (let i = 0; i + 1 < path.length; i++) {
    const a = projectToPixel(frame, path[i][0], path[i][1]);
    const b = projectToPixel(frame, path[i + 1][0], path[i + 1][1]);
    const ddx = b.px - a.px, ddy = b.py - a.py;
    out.push({ x0: a.px, y0: a.py, len: Math.hypot(ddx, ddy), angDeg: (Math.atan2(ddy, ddx) * 180) / Math.PI });
  }
  return out;
}

/** A gate mark: centre (hit-area anchor) + its tick as a left-anchored segment. */
export interface GateMarkPx extends SegPx { cx: number; cy: number }

/**
 * Where a gate at chainage `s` sits on the card, and the perpendicular tick
 * through it. Heading is probed ±HEADING_PROBE_M along the ref (clamped to
 * [0, length]) so it turns corners with the road and never needs the gate to
 * be a path vertex. `s` outside [0, length] is clamped (same as the builder).
 */
export function gateMarkPx(
  ref: RefLine, frame: RouteAsset, s: number,
  opts: { halfLenM?: number; minLenPx?: number; probeM?: number; factor?: number } = {},
): GateMarkPx {
  const halfLenM = opts.halfLenM ?? CARD_TICK_HALF_M;
  const minLenPx = opts.minLenPx ?? CARD_TICK_MIN_PX;
  const probeM = opts.probeM ?? HEADING_PROBE_M;
  const factor = opts.factor ?? 1;
  const L = ref.length;
  const sc = Math.min(Math.max(s, 0), L);
  const [lat, lon] = pointAtChainage(ref, sc);
  const c = projectToPixel(frame, lat, lon);
  const sA = Math.max(sc - probeM, 0);
  const sB = Math.min(sc + probeM, L);
  const [la, lo] = pointAtChainage(ref, sA);
  const [lb, lob] = pointAtChainage(ref, sB);
  const a = projectToPixel(frame, la, lo);
  const b = projectToPixel(frame, lb, lob);
  const hx = b.px - a.px, hy = b.py - a.py;
  const hl = Math.hypot(hx, hy);
  // degenerate (zero-length ref / identical probes): heading east, tick vertical
  const ux = hl > 0 ? hx / hl : 1;
  const uy = hl > 0 ? hy / hl : 0;
  const perpX = -uy, perpY = ux;
  const halfPx = Math.max(halfLenM / metresPerPixel(frame, lat), minLenPx / 2) * factor;
  const x0 = c.px - perpX * halfPx, y0 = c.py - perpY * halfPx;
  const x1 = c.px + perpX * halfPx, y1 = c.py + perpY * halfPx;
  return {
    cx: c.px, cy: c.py, x0, y0,
    len: Math.hypot(x1 - x0, y1 - y0),
    angDeg: (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI,
  };
}
