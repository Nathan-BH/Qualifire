/**
 * Qualifire — virgin-cycle18 brief 01: the pure half of the show-over-lock-screen
 * wiring. PURE — no expo / react-native import, so tests/lockscreen_suite.ts can
 * load it under plain Node (`expo` itself cannot be loaded there). lockScreen.ts
 * (the optional-native-module wrapper) imports from here; nothing imports the
 * other way round.
 */

/** Must equal the Kotlin module's Name("...") — pinned by tests/lockscreen_suite.ts. */
export const LOCK_SCREEN_MODULE_NAME = 'QualifireLockScreen';

/** The one policy: the activity may sit over the keyguard iff a ride session exists. */
export function showWhenLockedFor(sessionPresent: boolean): boolean {
  return sessionPresent;
}
