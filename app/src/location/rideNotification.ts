/**
 * Qualifire — virgin-cycle18 brief 03: JS side of modules/qualifire-ride-notification.
 *
 * index.ts feeds every liveEngine emit through pushRideNotification(); the
 * pure planner (rideNotificationPolicy.ts) decides when the native apply()
 * is worth calling. On an install built BEFORE the module existed (a dev
 * client or Preview APK older than the cycle18 build) the optional require
 * returns null and every call is a no-op. Never throws into the recording
 * path — display-only, same doctrine as the gate buzz.
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
  apply(startedAtMs: number, subText: string | null): Promise<boolean>;
}

const native = requireOptionalNativeModule<RideNotificationNative>(RIDE_NOTIFICATION_MODULE_NAME);

/** True only on a build that carries the native module. */
export function hasRideNotificationModule(): boolean {
  return native != null;
}

let state: PushState = initialPushState();
let inFlight = false;

/** Call on every liveEngine emit with the desired notification (null = no session). */
export function pushRideNotification(desired: RideNotificationDesired | null): void {
  const plan = planTick(state, desired);
  state = plan.state;
  if (!plan.call || desired === null || !native || inFlight) return;
  inFlight = true;
  native
    .apply(desired.whenMs, desired.subText)
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

/** App came to the foreground — force the next tick to re-apply. */
export function forceRideNotificationReassert(): void {
  state = forceReassert(state);
}
