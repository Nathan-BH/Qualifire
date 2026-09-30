package expo.modules.qualifirelockscreen

import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Qualifire — virgin-cycle18 brief 01. One switch: whether MainActivity may
 * be drawn on top of the keyguard (Activity.setShowWhenLocked, API 27+).
 * src/location/index.ts turns it ON while a ride records and OFF otherwise;
 * the manifest default (plugins/withShowWhenLocked.js) is ON so a
 * lock-screen notification tap can open the app over the keyguard.
 * Resolves true when the flag was applied to a live activity, false when
 * there is no activity (headless relaunch) or the OS predates API 27.
 */
class QualifireLockScreenModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("QualifireLockScreen")

    AsyncFunction("setShowWhenLocked") { enabled: Boolean ->
      val activity = appContext.currentActivity
      if (activity == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.O_MR1) {
        false
      } else {
        activity.runOnUiThread { activity.setShowWhenLocked(enabled) }
        true
      }
    }
  }
}
