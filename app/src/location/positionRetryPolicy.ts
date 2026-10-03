/**
 * Qualifire — virgin-cycle20 brief 11: the pure half of "auto-detect START keeps
 * trying after location comes on late". PURE — no expo / react-native import, so
 * tests/positionretry_suite.ts can load it under plain Node. location/index.ts's
 * refreshPositionIfPermitted() does the actual quiet read; RecordScreen.tsx runs
 * the timer; THIS file decides whether / when the next quiet read happens.
 *
 * Why a poll at all: expo-location has no event for "location services were
 * just switched on" (hasServicesEnabledAsync is a plain LocationManager read),
 * and toggling location from the quick-settings shade never backgrounds the app,
 * so an AppState listener alone misses Nathan's case. A bounded, cheap poll
 * (permission + services check first; a real fix request only when both pass)
 * while the setup/armed screen is visible and no position is known closes it.
 */

/** RecordScreen's phases (recordFlow.ts) — a local literal union, never an
 * import from ui/ (location/ must not depend on ui/). */
export type RecordPhaseLike = 'setup' | 'armed' | 'running' | 'ending';

/** What a quiet read can come back with. 'fixed' is the only one that ends a
 * poll — and it ends it through the status subscription (lastLat !== null),
 * not through this value, so a fix from ANY source (onRecord's read, a late
 * native resolve) stops the timer too. */
export type QuietRefreshOutcome = 'fixed' | 'no-permission' | 'no-services' | 'failed';

/** Why a retry is being asked for. Every trigger performs a quiet read; the
 * ones in RESTARTING_TRIGGERS also restart the poll budget (RecordScreen bumps
 * its poll epoch for them). */
export type RetryTrigger = 'mount' | 'app-active' | 'record-press';

/** Delays between consecutive quiet reads within one budget — gentle backoff
 * to 5 s. Sum of the first 6 = 17 s; then 5 s steps to the budget end. */
export const POLL_DELAYS_MS: readonly number[] = [2000, 2000, 2000, 3000, 3000, 5000];
/** How long one poll run may keep trying (per budget; restarted by RESTARTING_TRIGGERS). */
export const POLL_BUDGET_MS = 60_000;
/** JS-side cap on one native getCurrentPositionAsync wait (index.ts). The fused
 * client has no caller-side timeout; after this the tick counts as 'failed' and
 * the poll goes on. A late native resolve still applies its fix. */
export const QUIET_REFRESH_TIMEOUT_MS = 20_000;

/** Delay before poll attempt `attempt` (0-based): the table, then its last entry. */
export function pollDelayFor(attempt: number): number {
  const i = Math.max(0, Math.floor(attempt));
  return POLL_DELAYS_MS[Math.min(i, POLL_DELAYS_MS.length - 1)];
}

export interface PollState {
  phase: RecordPhaseLike;
  /** status.lastLat !== null && status.lastLon !== null */
  hasFix: boolean;
  /** ms since this budget started (mount / epoch bump). */
  elapsedMs: number;
  /** quiet reads already scheduled in this budget (0 before the first). */
  attempt: number;
}

/** ms until the next quiet read, or null = stop polling. Stops when: a fix is
 * known; the phase is not setup/armed (the ride feed owns the position while
 * running; nothing to detect while ending); or the budget is spent. */
export function nextPollDelayMs(s: PollState): number | null {
  if (s.hasFix) return null;
  if (s.phase !== 'setup' && s.phase !== 'armed') return null;
  if (s.elapsedMs >= POLL_BUDGET_MS) return null;
  return pollDelayFor(s.attempt);
}

/** Triggers that restart the 60 s budget as well as reading once. 'mount' is a
 * fresh effect anyway (its own budget), so it is listed for completeness. */
export const RESTARTING_TRIGGERS: ReadonlySet<RetryTrigger> = new Set<RetryTrigger>(['mount', 'app-active', 'record-press']);
export function restartsBudget(trigger: RetryTrigger): boolean {
  return RESTARTING_TRIGGERS.has(trigger);
}

/** Upper bound on quiet reads in one budget — documents the battery ceiling
 * (tests pin it). Computed, not hard-coded, so the table and the budget can
 * never drift from the number. */
export function maxReadsPerBudget(): number {
  let t = 0, n = 0;
  for (;;) {
    const d = nextPollDelayMs({ phase: 'setup', hasFix: false, elapsedMs: t, attempt: n });
    if (d === null) return n;
    t += d;
    n += 1;
  }
}
