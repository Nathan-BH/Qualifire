/**
 * Qualifire — virgin-cycle18 brief 01 (Nathan / tester, 2026-09-29).
 *
 * Marks .MainActivity `android:showWhenLocked="true"` in the generated
 * AndroidManifest.xml so the activity CAN be drawn on top of the keyguard:
 * the power button then wakes the phone onto the recording screen (no
 * unlock) when Qualifire was the app in front, and a tap on the ongoing
 * "recording ride" notification opens it over the lock screen. Whether the
 * activity actually shows over the keyguard at any moment is decided at
 * runtime by src/location/lockScreen.ts (ON only while a ride records) via
 * modules/qualifire-lock-screen; this manifest flag is the static default
 * SystemUI consults for a lock-screen notification tap.
 *
 * Native change: a new EAS build is required (fingerprint changes). Not OTA.
 */
const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

/** Pure, idempotent: sets the attribute on one manifest <activity> node. Exported for tests. */
function applyShowWhenLocked(activity) {
  if (!activity.$) activity.$ = {};
  activity.$['android:showWhenLocked'] = 'true';
  return activity;
}

function withShowWhenLocked(config) {
  return withAndroidManifest(config, (cfg) => {
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);
    applyShowWhenLocked(mainActivity);
    return cfg;
  });
}

module.exports = withShowWhenLocked;
module.exports.applyShowWhenLocked = applyShowWhenLocked;
