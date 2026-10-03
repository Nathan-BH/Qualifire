/**
 * Qualifire — virgin-cycle18 brief 03, rewritten by virgin-cycle20 brief 03
 * (Nathan, 2026-09-30): what the ride notification's BODY should say, and
 * when to bother the native side. PURE — no expo / react-native import, so
 * tests/ridenotification_suite.ts can drive it under plain Node.
 *
 * Body = elapsed ride time (zero = session.startedAtMs, the in-app clock's
 * zero) plus an optional label ("S2", "finished"): "12:34", "12:34 · S2",
 * "1:02:34 · finished". The SystemUI chronometer of cycle18 never rendered on
 * Samsung One UI or Honor (header time slot dropped by the OEM), so the
 * native module now owns a 1 Hz ticker that rewrites the body from the wall
 * clock — it keeps ticking when fixes stall, screen off, app backgrounded.
 * JS only tells it the zero and the label: the planner below turns the
 * engine's emits into a handful of apply() calls — on label change, plus one
 * re-assert every REASSERT_EVERY_N_TICKS ticks (expo-location re-posts its
 * plain notification on a foreground cold start; the ticker also self-parks
 * after MAX_TICK_MISSES ticks without a foreground-service notification, and
 * a re-assert restarts it). After MAX_CONSECUTIVE_MISSES false results in a
 * row (no foreground-service notification yet), retries fall back to the
 * re-assert cadence. formatElapsed/rideNotificationBody are the SPEC of the
 * text the Kotlin ticker produces — the suite pins both sides.
 */

/** Must equal the Kotlin module's Name("...") — pinned by tests/ridenotification_suite.ts. */
export const RIDE_NOTIFICATION_MODULE_NAME = 'QualifireRideNotification';

/** Engine emits between forced applies (~1 Hz while fixes arrive → ~30 s). */
export const REASSERT_EVERY_N_TICKS = 30;
/** Consecutive `false` results after which only the re-assert cadence retries. */
export const MAX_CONSECUTIVE_MISSES = 10;
/** Between the clock and the label. Mirrored in Kotlin as " \u00B7 " (SEPARATOR). */
export const RIDE_NOTIFICATION_SEPARATOR = ' · ';

export interface RideNotificationDesired {
  /** clock zero — session.startedAtMs (epoch ms) */
  whenMs: number;
  /** label after the clock; null = clock only (before START gate / free ride) */
  label: string | null;
}

/** The two LiveEngineState fields the label rule reads (structural, so no engine import). */
export interface RideNotificationEngineView {
  phase: 'idle' | 'detecting' | 'locked' | 'finished';
  currentSector: number | null;
}

/** Label rule (cycle18 brief 03 Decision 10, unchanged). */
export function rideNotificationLabel(st: RideNotificationEngineView): string | null {
  if (st.phase === 'finished') return 'finished';
  if (st.currentSector !== null) return `S${st.currentSector}`;
  return null;
}

/** null = no session → push nothing (and stop the ticker). */
export function rideNotificationFor(
  startedAtMs: number | null,
  st: RideNotificationEngineView,
): RideNotificationDesired | null {
  if (startedAtMs === null) return null;
  return { whenMs: startedAtMs, label: rideNotificationLabel(st) };
}

/** m:ss below one hour (unpadded minutes), h:mm:ss from one hour; floored
 * seconds; anything negative / non-finite reads 0:00. */
export function formatElapsed(ms: number): string {
  const s = Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 1000)) : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const ss = sec < 10 ? `0${sec}` : `${sec}`;
  if (h > 0) return `${h}:${m < 10 ? `0${m}` : m}:${ss}`;
  return `${m}:${ss}`;
}

/** The exact body text the Kotlin ticker writes at `nowMs`. */
export function rideNotificationBody(d: RideNotificationDesired, nowMs: number): string {
  const clock = formatElapsed(nowMs - d.whenMs);
  return d.label ? `${clock}${RIDE_NOTIFICATION_SEPARATOR}${d.label}` : clock;
}

export function sameDesired(a: RideNotificationDesired, b: RideNotificationDesired): boolean {
  return a.whenMs === b.whenMs && a.label === b.label;
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
