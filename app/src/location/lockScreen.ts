/**
 * Qualifire — virgin-cycle18 brief 01: JS side of modules/qualifire-lock-screen.
 *
 * `setShowWhenLocked(true)` lets MainActivity be drawn on top of the keyguard
 * (power button wakes onto the recording screen; no unlock). index.ts owns
 * the policy (ON while a ride records, OFF otherwise — see its
 * syncShowWhenLocked). This wrapper only makes the call safe everywhere:
 * on an install built BEFORE the module existed (a dev client or Preview APK
 * older than the cycle18 build) the native module is absent, the optional
 * require returns null, and every call resolves false without throwing.
 */
import { requireOptionalNativeModule } from 'expo';
import { LOCK_SCREEN_MODULE_NAME } from './lockScreenPolicy';

interface LockScreenNative {
  setShowWhenLocked(enabled: boolean): Promise<boolean>;
}

const native = requireOptionalNativeModule<LockScreenNative>(LOCK_SCREEN_MODULE_NAME);

/** True only on a build that carries the native module. */
export function hasLockScreenModule(): boolean {
  return native != null;
}

/** Resolves true when the flag was applied to a live activity; false when
 * the module is absent, no activity exists (headless), or the call failed. */
export async function setShowWhenLocked(enabled: boolean): Promise<boolean> {
  if (!native) return false;
  try {
    return await native.setShowWhenLocked(enabled);
  } catch {
    return false;
  }
}
