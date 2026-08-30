/**
 * Stale-first-fix / warm-up classification (cycle 025 WP-stale-first-fix P1).
 * Pure — no expo, no Node imports — so it is headless-testable, unlike
 * location/index.ts itself (same pattern as elevationOutlier.ts).
 *
 * Nathan's ruling (2026-08-26): record-but-flag. Every fix is still appended
 * to the raw ride JSONL exactly as received (D-023 — the flags this module
 * produces are ADDITIVE optional fields, written only when true); DERIVED
 * consumers (live engine feed / matcher anchoring, elevation diagnostics,
 * every GPX+ session stat) exclude flagged fixes.
 *
 * Two independent rules:
 *  - preStart: the fix's timestamp precedes the START press (session marker's
 *    startedAtMs) — a stale cached Android fix. Observed on ALL four ride
 *    days to date (firstFixDelayS −6.30 … −11.05 s); this rule alone catches
 *    the primary offender every time. A stale fix's own claimed accuracy is
 *    untrustworthy, so it can never end the warm-up window either.
 *  - warmup: after START but before the first GOOD fix (accuracy <=
 *    WARMUP_ACC_M), a fix with poor or unknown accuracy is warm-up junk
 *    (2026-08-25: six coarse 23–90 m points frozen at the door for 22 s).
 *    Safety cap: the window closes unconditionally WARMUP_MAX_S after START,
 *    so a bad-GPS day degrades to today's behaviour instead of flagging the
 *    whole ride. The cap also makes a headless mid-ride relaunch (fresh
 *    module state, ride minutes old) a non-issue.
 *
 * Threshold reasoning: WARMUP_ACC_M = 20 sits below every observed warm-up
 * accuracy (23–90 m) and above a normal riding fix (3–15 m on this app's
 * rides). Deliberately NOT engine.ts's POOR_ACCURACY_M = 50 — that constant
 * guards matcher anchoring (B-75 owns its calibration); reusing it here
 * would miss the 23–49 m warm-up points outright.
 */

export const WARMUP_ACC_M = 20;
export const WARMUP_MAX_S = 60;

export interface FixFlags {
  preStart?: true;
  warmup?: true;
}

/** Per-ride warm-up memory; create fresh in startTracking. */
export interface WarmupState {
  goodFixSeen: boolean;
}

export function newWarmupState(): WarmupState {
  return { goodFixSeen: false };
}

/** Classifies one fix. Mutates `state` (marks warm-up over once a good
 * post-START fix is seen). Returns {} for a normal fix — spread the result
 * into the Fix object so unflagged fixes carry no new fields at all. */
export function classifyFix(
  tUnixMs: number,
  accuracyM: number | undefined,
  startedAtMs: number,
  state: WarmupState,
): FixFlags {
  if (tUnixMs < startedAtMs) return { preStart: true };
  const good = accuracyM !== undefined && Number.isFinite(accuracyM) && accuracyM <= WARMUP_ACC_M;
  if (good) state.goodFixSeen = true;
  if (state.goodFixSeen) return {};
  if ((tUnixMs - startedAtMs) / 1000 > WARMUP_MAX_S) return {};
  return { warmup: true };
}
