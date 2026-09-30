package expo.modules.qualifireridenotification

import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import android.graphics.drawable.Icon
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Qualifire — virgin-cycle18 brief 03 (testers via Nathan, 2026-09-29).
 *
 * Re-posts expo-location's OWN foreground-service notification (found at
 * runtime by FLAG_FOREGROUND_SERVICE — its id is a per-process counter, never
 * a constant) with a SystemUI-driven chronometer anchored at the ride's
 * startedAtMs and an optional header sub-text ("S2", "finished"). Everything
 * else on the notification (title, body, colour, small icon, launcher tap intent)
 * is preserved via Notification.Builder.recoverBuilder. Idempotent: if the
 * live notification already carries the requested when/chronometer/subText
 * it resolves true without notify(). Resolves false when there is no
 * foreground-service notification yet (posted asynchronously after START) or
 * anything throws — src/location/rideNotification.ts retries on the next tick.
 */
class QualifireRideNotificationModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("QualifireRideNotification")

    AsyncFunction("apply") { startedAtMs: Double, subText: String? ->
      applyToForegroundNotification(startedAtMs.toLong(), subText)
    }
  }

  private fun applyToForegroundNotification(whenMs: Long, subText: String?): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return false
    return try {
      val context = appContext.reactContext?.applicationContext ?: return false
      val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        ?: return false
      val sbn = nm.activeNotifications.firstOrNull {
        (it.notification.flags and Notification.FLAG_FOREGROUND_SERVICE) != 0
      } ?: return false
      val existing = sbn.notification
      val extras = existing.extras
      val sameWhen = existing.`when` == whenMs &&
        extras.getBoolean(Notification.EXTRA_SHOW_CHRONOMETER, false)
      val sameSub = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString() == subText
      if (sameWhen && sameSub) return true
      val builder = Notification.Builder.recoverBuilder(context, existing)
        .setWhen(whenMs)
        .setShowWhen(true)
        .setUsesChronometer(true)
        .setOnlyAlertOnce(true)
        .setSubText(subText)
      // Flame pictogram (amendment 2026-09-29): the coloured layered flame as the LARGE icon.
      // The status-bar SMALL icon needs no code: expo-location already prefers a drawable
      // named `notification_icon` and recoverBuilder preserves whatever it set.
      val largeId = context.resources.getIdentifier("qualifire_flame_large", "drawable", context.packageName)
      if (largeId != 0) builder.setLargeIcon(Icon.createWithResource(context, largeId))
      val rebuilt = builder.build()
      nm.notify(sbn.tag, sbn.id, rebuilt)
      true
    } catch (e: Exception) {
      false
    }
  }
}
