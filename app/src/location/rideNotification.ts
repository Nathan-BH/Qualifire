/**
 * Qualifire — virgin-cycle18 brief 03 / virgin-cycle20 brief 03: JS side of
 * modules/qualifire-ride-notification.
 *
 * index.ts feeds every liveEngine emit through pushRideNotification(); the
 * pure planner (rideNotificationPolicy.ts) decides when the native apply()
 * is worth calling. apply(startedAtMs, label) (re)starts the module's own
 * 1 Hz body ticker ("12:34 · S2") and updates its label; stop() parks it —
 * called from stopTracking BEFORE the foreground service is stopped (so a
 * tick can never re-post a ghost of a cancelled notification) and again,
 * belt and braces, when the planner sees a null desired. On an install
 * built BEFORE the module existed the optional require returns null and
 * every call is a no-op. Never throws into the recording path —
 * display-only, same doctrine as the gate buzz.
 */
import { requireOptionalNativeModule } from 'expo';
import {
  RIDE_NOTIFICATION_MODULE_NAME,
  forceReassert,
  initialPushState,
  noteResult,
  planTick,
  type PushState,
  type RideNotificationDesired,
} from './rideNotificationPolicy';

interface RideNotificationNative {
  /** (Re)starts the native 1 Hz body ticker with this zero + label. Resolves
   * true when the foreground-service notification was found (and re-posted
   * or already up to date), false when there is none yet / anything threw. */
  apply(startedAtMs: number, label: string | null): Promise<boolean>;
  /** Parks the ticker. Never posts anything. */
  stop(): Promise<void>;
}

const native = requireOptionalNativeModule<RideNotificationNative>(RIDE_NOTIFICATION_MODULE_NAME);

/** True only on a build that carries the native module. */
export function hasRideNotificationModule(): boolean {
  return native != null;
}

let state: PushState = initialPushState();
let inFlight = false;
/** apply() has been called since the last stop() — the ticker may be running. */
let armed = false;

/** Call on every liveEngine emit with the desired notification (null = no session). */
export function pushRideNotification(desired: RideNotificationDesired | null): void {
  const plan = planTick(state, desired);
  state = plan.state;
  if (desired === null) {
    stopRideNotification();
    return;
  }
  if (!plan.call || !native || inFlight) return;
  inFlight = true;
  armed = true;
  native
    .apply(desired.whenMs, desired.label)
    .then((ok) => {
      state = noteResult(state, desired, ok === true);
    })
    .catch(() => {
      state = noteResult(state, desired, false);
    })
    .finally(() => {
      inFlight = false;
    });
}

/** Park the native ticker. Idempotent; no-op when nothing was ever applied. */
export function stopRideNotification(): void {
  if (!armed || !native) return;
  armed = false;
  // Inspect G1 (virgin-cycle20): a build whose native module predates stop()
  // (e.g. build 7) must never throw into stopTracking's END path.
  try {
    native.stop?.()?.catch(() => {
      /* display-only channel */
    });
  } catch {
    /* display-only channel */
  }
}

/** App came to the foreground — force the next tick to re-apply. */
export function forceRideNotificationReassert(): void {
  state = forceReassert(state);
}
