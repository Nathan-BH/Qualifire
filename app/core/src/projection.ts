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

/** virgin-cycle26 brief 02: two visits of one reference to the same ground
 * (a Home-to-Home loop closing where it opened, an out-and-back street) are
 * "passes". Candidate vertices further apart than this in chainage belong to
 * different passes; a hairpin shorter than this is one pass (nearest wins, as
 * before). 5 m-resampled vertices inside a <= ~85 m disc are <= 5 m apart in
 * chainage unless the line leaves and comes back. */
export const PASS_GAP_M = 120;

/** virgin-cycle26 brief 05: two passes are AMBIGUOUS for a fix only when
 * their nearest vertices are within this many metres of each other in
 * distance to the fix -- the two sides of one street (a few metres apart)
 * plus GPS jitter. A pass this much further away than the nearest one is
 * where the rider is NOT: parallel streets one block apart (>= 30 m) are
 * never confused, whatever the chainage context says. */
export const PASS_AMBIGUITY_M = 15;

/**
 * Pass-aware vertex pick (virgin-cycle26 brief 02). Among the vertices with
 * chainage in [sLo, sHi], take those within a band of the nearest distance
 * (CORRIDOR_M with no `nearS`, PASS_AMBIGUITY_M with one; brief 06) -- capped
 * at `within`, the caller's own acceptance distance, when
 * the nearest vertex is inside it (brief 05) -- split them into passes
 * (consecutive candidates > PASS_GAP_M
 * apart in chainage), and return the nearest vertex OF THE PASS whose
 * chainage is closest to `nearS` -- `-Infinity` (the default) = the earliest
 * pass. For a reference that passes the fix once the candidates form one
 * pass and the result is exactly nearestVertex(). Used wherever a vertex is
 * chosen without a window: the live and offline first-fix anchors (earliest
 * pass -- the START pick is ridden from its start; forward-only projection can
 * catch up from a too-early guess and never from a too-late one) and both
 * re-acquisitions (nearS = the last chainage: the pass the rider was on).
 */
export function passVertex(
  px: number, py: number, ref: RefLine, sLo = -Infinity, sHi = Infinity, nearS = -Infinity,
  within = CORRIDOR_M,
): { index: number; dist: number } {
  const near = nearestVertex(px, py, ref, sLo, sHi);
  if (near.index < 0) return near;
  const { rx, ry, ch } = ref;
  // Candidates: a band around the nearest vertex, capped at the caller's own
  // acceptance distance when the nearest vertex is inside it (a pass the
  // caller would reject is never preferred over one it accepts). With no
  // chainage context (the first-fix anchors: the START pick is where the ride
  // begins, so the earliest pass is a fact, not a guess) the band is the whole
  // corridor -- a loop closing up to CORRIDOR_M from its start, or a wide
  // road's return copy, must not capture the anchor (brief 06). With a
  // context (re-acquisition: the last chainage is a guess) it is
  // PASS_AMBIGUITY_M, so a clearly nearer pass is never overridden (brief 05).
  const band = near.dist + (nearS === -Infinity ? CORRIDOR_M : PASS_AMBIGUITY_M);
  const dMax = near.dist <= within ? Math.min(band, within) : band;
  const dMax2 = dMax * dMax;
  let bestIdx = -1;
  let bestScore = Infinity;
  let bestD2 = Infinity;
  let runIdx = -1;
  let runD2 = Infinity;
  let runLastCh = 0;
  const closeRun = (): void => {
    if (runIdx < 0) return;
    const sRun = ch[runIdx];
    const score = nearS === -Infinity ? sRun : Math.abs(sRun - nearS);
    if (score < bestScore) {
      bestScore = score;
      bestIdx = runIdx;
      bestD2 = runD2;
    }
    runIdx = -1;
    runD2 = Infinity;
  };
  for (let k = 0; k < rx.length; k++) {
    if (ch[k] < sLo || ch[k] > sHi) continue;
    const dx = rx[k] - px;
    const dy = ry[k] - py;
    const d2 = dx * dx + dy * dy;
    if (d2 > dMax2) continue;
    if (runIdx >= 0 && ch[k] - runLastCh > PASS_GAP_M) closeRun();
    if (d2 < runD2) {
      runD2 = d2;
      runIdx = k;
    }
    runLastCh = ch[k];
  }
  closeRun();
  return { index: bestIdx, dist: Math.sqrt(bestD2) };
}

/**
 * virgin-cycle26 brief 03: the chainages (ascending, one per vertex) of the
 * vertices that lie on RETRACED ground — another vertex of the same reference,
 * more than `gapM` (PASS_GAP_M) away in chainage, sits within `withinM`
 * (CORRIDOR_M) of them. Empty for a line that never comes back on itself; the
 * closing metres of a Home-to-Home loop and both copies of an out-and-back
 * street are what it reports. Gate seeding (store/gateSeeding.ts) keeps
 * sector gates clear of these so one physical spot never carries two gates
 * when the window allows. O(n²) over 5 m vertices, run once when a route is
 * born (a 20 km reference is 4 000 vertices).
 */
export function overlapChainages(ref: RefLine, withinM = CORRIDOR_M, gapM = PASS_GAP_M): number[] {
  const { rx, ry, ch } = ref;
  const n = rx.length;
  const w2 = withinM * withinM;
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    let hit = false;
    for (let j = 0; j < n && !hit; j++) {
      if (Math.abs(ch[j] - ch[k]) <= gapM) continue;
      const dx = rx[j] - rx[k];
      const dy = ry[j] - ry[k];
      if (dx * dx + dy * dy <= w2) hit = true;
    }
    if (hit) out.push(ch[k]);
  }
  return out;
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
  let sp = ch[passVertex(x[0], y[0], ref, -Infinity, Infinity, -Infinity, corridor).index];
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
        // offline re-acquisition: global, pass-aware (virgin-cycle26 brief 02:
        // the pass nearest the last chainage, so a retraced street does not
        // throw the projection back onto the outbound copy)
        const nv = passVertex(x[i], y[i], ref, -Infinity, Infinity, sp, corridor);
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
