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

/** WP-J (2026-09-04/05): every gate, START and FINISH included, nudges like
 * any other. SETUP-UX §4's original end-lock existed for B-20's laps-cost
 * dialog; on the card's two hosts that cost is nil by construction —
 * RecordScreen/RideDetailScreen show this card only for a route's FIRST gate
 * set (zero rides scored yet), and the ROUTES entry point (WP-I's
 * `editRouteGates` confirm, `RoutesScreen.tsx`/`GateAdjustScreen.tsx`)
 * already prices every gate move with its own reset dialog, so START/FINISH
 * need no separate lock there either. This function is kept (rather than
 * inlined at call sites) so `clampNudge`'s guard below has one place to ask
 * "is this index even valid". */
export function isAdjustable(index: number, nGates: number): boolean {
  return nGates >= 2 && index >= 0 && index < nGates;
}

export function gateName(index: number, nGates: number): string {
  if (index === 0) return 'START';
  if (index === nGates - 1) return 'FINISH';
  return `G${index}`;
}

/** The gate's new chainage after a nudge, clamped to stay MIN_GATE_GAP_M
 * clear of its neighbour(s) and on the line — START may reach chainage 0,
 * FINISH may reach `refLengthM` (WP-J: both ends are adjustable now; a gate
 * set starting at 0 or ending at refLengthM is valid — validateCatalog
 * (store/catalog.ts) only requires strictly-increasing chainages).
 * Out-of-range/degenerate input (see isAdjustable) returns the gate's
 * current chainage unchanged. */
export function clampNudge(
  chainageM: readonly number[],
  index: number,
  deltaM: number,
  refLengthM: number,
  minGapM = MIN_GATE_GAP_M,
): number {
  if (!isAdjustable(index, chainageM.length)) return chainageM[index];
  const n = chainageM.length;
  const lo = index === 0 ? 0 : chainageM[index - 1] + minGapM;
  const hi = index === n - 1 ? refLengthM : Math.min(chainageM[index + 1] - minGapM, refLengthM);
  return Math.min(Math.max(chainageM[index] + deltaM, lo), hi);
}

/** "1842" -> "1 842 m" — the always-visible chainage readout (SETUP-UX §4:
 * never under the thumb, so it must stay short and fixed-position). */
export function fmtChainage(m: number): string {
  const v = String(Math.round(m)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${v} m`;
}

/** "1488, 4000" -> "37.2 %" — the readout's percent-of-route figure
 * (WP-J §4.2). One decimal place; a non-positive route length (should never
 * happen — refLengthM comes from a real ride) reads as '— %' rather than
 * dividing by zero or a negative. */
export function fmtPct(chainageM: number, refLengthM: number): string {
  if (refLengthM <= 0) return '— %';
  return `${((chainageM / refLengthM) * 100).toFixed(1)} %`;
}
