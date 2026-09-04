/**
 * Pure rules for the save-flow gate-adjustment card (OPEN-ITEMS item 3,
 * Part B; SETUP-UX §4 "select, then nudge" — cited, not redesigned).
 * Headless-testable, same discipline as routeMapMath.ts / towerModel.ts.
 */

// WP-I (Q2, 2026-09-04): nudge size scales with the route's own length, so a
// short loop and a long commute both get a usable step — "±1% of the ride"
// (large) and "±0.1%" (small), per Nathan's own framing. Replaces the prior
// fixed 10 m / 50 m steps (kept as literal deltas in clampNudge's own tests,
// which are agnostic to how the caller derives deltaM).
export const NUDGE_SMALL_PCT = 0.001; // 0.1%
export const NUDGE_LARGE_PCT = 0.01;  // 1%

/** The nudge step in metres for a route of this length. Passed straight into
 * clampNudge as `deltaM` — clampNudge is unchanged by this. */
export function nudgeDeltaM(pct: number, refLengthM: number): number {
  return pct * refLengthM;
}

/** Same sanity floor as gateSeeding.ts — a nudge can never push two gates
 * closer than this. */
export const MIN_GATE_GAP_M = 50;

/** SETUP-UX §4: middle gates (G1..G3) adjust freely; START/FINISH are locked
 * (their unlock + laps-cost dialog is B-20 machinery, deliberately unbuilt
 * here — the ends simply do not select). */
export function isAdjustable(index: number, nGates: number): boolean {
  return index > 0 && index < nGates - 1;
}

export function gateName(index: number, nGates: number): string {
  if (index === 0) return 'START';
  if (index === nGates - 1) return 'FINISH';
  return `G${index}`;
}

/** The gate's new chainage after a nudge, clamped to stay MIN_GATE_GAP_M
 * clear of both neighbours (and on the line). Locked gates return their
 * current chainage unchanged. */
export function clampNudge(
  chainageM: readonly number[],
  index: number,
  deltaM: number,
  refLengthM: number,
  minGapM = MIN_GATE_GAP_M,
): number {
  if (!isAdjustable(index, chainageM.length)) return chainageM[index];
  const lo = chainageM[index - 1] + minGapM;
  const hi = Math.min(chainageM[index + 1] - minGapM, refLengthM);
  return Math.min(Math.max(chainageM[index] + deltaM, lo), hi);
}

/** "1842" -> "1 842 m" — the always-visible chainage readout (SETUP-UX §4:
 * never under the thumb, so it must stay short and fixed-position). */
export function fmtChainage(m: number): string {
  const v = String(Math.round(m)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${v} m`;
}
