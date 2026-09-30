/**
 * Qualifire — virgin-cycle18 brief 03: what the ride notification should say,
 * and when to bother the native side. PURE — no expo / react-native import,
 * so tests/ridenotification_suite.ts can drive it under plain Node.
 *
 * The elapsed timer is a SystemUI chronometer anchored at `whenMs` (the
 * session's startedAtMs — the same zero as the in-app clock) and needs no
 * updates; only the header sub-text ("S2", "finished") changes, and only when
 * a gate fires. The planner below turns the engine's 1 Hz emits into a
 * handful of native calls: on change, plus one re-assert every
 * REASSERT_EVERY_N_TICKS ticks (expo-location re-posts its plain notification
 * on a foreground cold start, and the very first apply after START usually
 * runs before the service has posted anything — both heal on a later tick).
 * After MAX_CONSECUTIVE_MISSES failed applies in a row (no foreground-service
 * notification at all), retries fall back to the re-assert cadence.
 */

/** Must equal the Kotlin module's Name("...") — pinned by tests/ridenotification_suite.ts. */
export const RIDE_NOTIFICATION_MODULE_NAME = 'QualifireRideNotification';

/** Engine emits between forced applies (~1 Hz while fixes arrive → ~30 s). */
export const REASSERT_EVERY_N_TICKS = 30;
/** Consecutive `false` results after which only the re-assert cadence retries. */
export const MAX_CONSECUTIVE_MISSES = 10;

export interface RideNotificationDesired {
  /** chronometer zero — session.startedAtMs (epoch ms) */
  whenMs: number;
  /** header sub-text next to the running time; null = none (stopwatch only) */
  subText: string | null;
}

/** The two LiveEngineState fields the label rule reads (structural, so no engine import). */
export interface RideNotificationEngineView {
  phase: 'idle' | 'detecting' | 'locked' | 'finished';
  currentSector: number | null;
}

/** Label rule (brief 03 Decision 10). null = no session → push nothing. */
export function rideNotificationFor(
  startedAtMs: number | null,
  st: RideNotificationEngineView,
): RideNotificationDesired | null {
  if (startedAtMs === null) return null;
  let subText: string | null = null;
  if (st.phase === 'finished') subText = 'finished';
  else if (st.currentSector !== null) subText = `S${st.currentSector}`;
  return { whenMs: startedAtMs, subText };
}

export function sameDesired(a: RideNotificationDesired, b: RideNotificationDesired): boolean {
  return a.whenMs === b.whenMs && a.subText === b.subText;
}

export interface PushState {
  /** what the native side last confirmed (true result); null = unknown / not applied */
  applied: RideNotificationDesired | null;
  /** engine emits since the last native call */
  ticksSinceCall: number;
  /** consecutive false results */
  misses: number;
}

export const initialPushState = (): PushState => ({ applied: null, ticksSinceCall: 0, misses: 0 });

/** One engine emit. Decides whether to call native.apply(desired) this tick. */
export function planTick(
  state: PushState,
  desired: RideNotificationDesired | null,
): { call: boolean; state: PushState } {
  if (desired === null) return { call: false, state: initialPushState() };
  const ticks = state.ticksSinceCall + 1;
  const changed = state.applied === null || !sameDesired(state.applied, desired);
  const due = ticks >= REASSERT_EVERY_N_TICKS;
  const backedOff = state.misses >= MAX_CONSECUTIVE_MISSES;
  return { call: due || (changed && !backedOff), state: { ...state, ticksSinceCall: ticks } };
}

/** Fold a native result back in. A false result forgets `applied` so the next
 * tick counts as a change (retry), up to the back-off. */
export function noteResult(state: PushState, desired: RideNotificationDesired, ok: boolean): PushState {
  return ok
    ? { applied: desired, ticksSinceCall: 0, misses: 0 }
    : { applied: null, ticksSinceCall: 0, misses: state.misses + 1 };
}

/** Make the next tick a forced apply (app came to the foreground: expo-location
 * may just have re-posted its plain notification over ours). */
export function forceReassert(state: PushState): PushState {
  return { ...state, ticksSinceCall: REASSERT_EVERY_N_TICKS };
}
