/** D-011 chainage projection onto the reference polyline.
 *
 * Windowed nearest-segment projection. Two modes, matching the Python
 * reference (project_ride in 02_analysis.py):
 *  - offline (post-ride / parity): window [sp-60, sp+240], non-monotonic,
 *    GLOBAL re-acquisition after >=5 consecutive off-corridor fixes;
 *  - live: see live.ts (forward-only monotonic + D-016 amendments).
 */
import type { RefLine } from './types.ts';
import { searchsortedLeft } from './geo.ts';

export const CORRIDOR_M = 40.0;

export interface ProjectionResult {
  /** chainage (m along reference) per fix */
  s: Float64Array;
  /** cross-track distance per fix (999 when the search window was empty) */
  xtd: Float64Array;
}

export interface SegmentHit {
  /** candidate chainage */
  s: number;
  /** distance from the fix to the polyline */
  dist: number;
}

/** Project one fix onto reference segments [lo, hi); returns the nearest hit. */
export function nearestOnSegments(
  px: number, py: number, ref: RefLine, lo: number, hi: number,
): SegmentHit {
  const { rx, ry, ch } = ref;
  let bestDist = Infinity;
  let bestS = 0;
  for (let j = lo; j < hi; j++) {
    const ax = rx[j];
    const ay = ry[j];
    const dx = rx[j + 1] - ax;
    const dy = ry[j + 1] - ay;
    const len2 = dx * dx + dy * dy;
    let t = ((px - ax) * dx + (py - ay) * dy) / Math.max(len2, 1e-9);
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const ex = px - ax - t * dx;
    const ey = py - ay - t * dy;
    const d = Math.hypot(ex, ey);
    if (d < bestDist) {
      bestDist = d;
      bestS = ch[j] + t * Math.sqrt(len2);
    }
  }
  return { s: bestS, dist: bestDist };
}

/** Index of the reference VERTEX nearest to (px, py), restricted to ch in [sLo, sHi]. */
export function nearestVertex(
  px: number, py: number, ref: RefLine, sLo = -Infinity, sHi = Infinity,
): { index: number; dist: number } {
  const { rx, ry, ch } = ref;
  let best = -1;
  let bestD2 = Infinity;
  for (let k = 0; k < rx.length; k++) {
    if (ch[k] < sLo || ch[k] > sHi) continue;
    const dx = rx[k] - px;
    const dy = ry[k] - py;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = k;
    }
  }
  return { index: best, dist: best >= 0 ? Math.sqrt(bestD2) : Infinity };
}

/**
 * Offline projection of a whole ride (post-ride analysis, parity harness).
 * Exact port of the Python project_ride(live=False).
 */
export function projectRideOffline(
  x: ArrayLike<number>, y: ArrayLike<number>, ref: RefLine, corridor = CORRIDOR_M,
): ProjectionResult {
  const { ch } = ref;
  const n = x.length;
  const nseg = ch.length - 1;
  const s = new Float64Array(n);
  const xtd = new Float64Array(n);
  let sp = ch[nearestVertex(x[0], y[0], ref).index];
  let lost = 0;
  for (let i = 0; i < n; i++) {
    let lo = searchsortedLeft(ch, sp - 60);
    let hi = searchsortedLeft(ch, sp + 240);
    lo = Math.max(0, lo - 1);
    hi = Math.min(nseg, hi);
    if (hi <= lo) {
      s[i] = sp;
      xtd[i] = 999;
      continue;
    }
    const hit = nearestOnSegments(x[i], y[i], ref, lo, hi);
    if (hit.dist <= corridor) {
      s[i] = hit.s;
      xtd[i] = hit.dist;
      sp = hit.s;
      lost = 0;
    } else {
      s[i] = sp;
      xtd[i] = hit.dist;
      lost += 1;
      if (lost >= 5) {
        // offline re-acquisition: global nearest vertex
        const nv = nearestVertex(x[i], y[i], ref);
        if (nv.dist <= corridor) {
          sp = ch[nv.index];
          s[i] = sp;
          xtd[i] = nv.dist;
          lost = 0;
        }
      }
    }
  }
  return { s, xtd };
}
