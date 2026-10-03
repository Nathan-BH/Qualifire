package expo.modules.qualifireridenotification

import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Locale

/**
 * Qualifire — virgin-cycle18 brief 03, rewritten by virgin-cycle20 brief 03
 * (Nathan, 2026-09-30: no timer visible on Honor or Samsung).
 *
 * Owns a 1 Hz ticker (main-looper Handler) that rewrites the BODY of
 * expo-location's OWN foreground-service notification (found at runtime by
 * FLAG_FOREGROUND_SERVICE — its id is a per-process counter, never a
 * constant) with the elapsed ride time and an optional label:
 * "12:34", "12:34 · S2", "1:02:34 · finished". Elapsed = wall clock minus
 * startedAtMs (the in-app clock's zero), recomputed every tick, so a late
 * tick (Doze) never drifts. No SystemUI chronometer, no header sub-text, no
 * header time: OEM skins drop that header slot, the body line is always
 * rendered. Everything else (title, small icon, launcher tap intent) is
 * preserved via Notification.Builder.recoverBuilder — except colour: since
 * virgin-cycle20 brief 01 the card is forced plain (setColorized(false),
 * COLOR_DEFAULT) so it looks the same on every OEM, and there is no large
 * icon (the status-bar `notification_icon` silhouette is the only flame).
 * Idempotent per tick: if the live notification already carries this body
 * (and is plain) nothing is posted. apply() resolves false when there is no
 * foreground-service notification yet (posted asynchronously after START)
 * or anything throws — the ticker keeps trying once a second and parks
 * itself after MAX_TICK_MISSES; src/location/rideNotification.ts re-applies
 * on label change / every ~30 engine ticks / foreground, and stop()s before
 * the service is stopped. All mutable state is touched on the main looper only.
 */
class QualifireRideNotificationModule : Module() {
  companion object {
    /** Ticks with no foreground-service notification before the ticker parks. */
    const val MAX_TICK_MISSES = 120
    /** Fire this long after each whole-second boundary of the elapsed clock. */
    const val TICK_SLACK_MS = 20L
    /** Mirrors RIDE_NOTIFICATION_SEPARATOR in rideNotificationPolicy.ts. */
    const val SEPARATOR = " \u00B7 "
  }

  private val handler = Handler(Looper.getMainLooper())
  private var startedAtMs = 0L
  private var label: String? = null
  private var ticking = false
  private var misses = 0

  private val tick = object : Runnable {
    override fun run() {
      if (!ticking) return
      if (repost()) misses = 0 else misses++
      if (misses >= MAX_TICK_MISSES) {
        ticking = false
        return
      }
      scheduleNext()
    }
  }

  override fun definition() = ModuleDefinition {
    Name("QualifireRideNotification")

    AsyncFunction("apply") { startedAt: Double, lbl: String?, promise: Promise ->
      handler.post {
        startedAtMs = startedAt.toLong()
        label = lbl
        handler.removeCallbacks(tick)
        ticking = true
        misses = 0
        val ok = repost()
        scheduleNext()
        promise.resolve(ok)
      }
    }

    AsyncFunction("stop") { promise: Promise ->
      handler.post {
        ticking = false
        handler.removeCallbacks(tick)
        promise.resolve(null)
      }
    }

    OnDestroy {
      handler.removeCallbacks(tick)
      ticking = false
    }
  }

  private fun scheduleNext() {
    val elapsed = System.currentTimeMillis() - startedAtMs
    val intoSecond = ((elapsed % 1000L) + 1000L) % 1000L
    handler.postDelayed(tick, 1000L - intoSecond + TICK_SLACK_MS)
  }

  /** "m:ss" below one hour, "h:mm:ss" from one hour — same rule as formatElapsed in TS. */
  private fun bodyText(nowMs: Long): String {
    val s = maxOf(0L, (nowMs - startedAtMs) / 1000L)
    val h = s / 3600L
    val m = (s % 3600L) / 60L
    val sec = s % 60L
    val clock = if (h > 0L) String.format(Locale.ROOT, "%d:%02d:%02d", h, m, sec)
      else String.format(Locale.ROOT, "%d:%02d", m, sec)
    val l = label
    return if (l.isNullOrEmpty()) clock else clock + SEPARATOR + l
  }

  /** One re-post of the live foreground-service notification with the current body.
   * Looks the notification up FRESH every time (never a cached one): once the
   * service has cancelled it there is nothing to find, so nothing is posted. */
  private fun repost(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return false
    return try {
      val context = appContext.reactContext?.applicationContext ?: return false
      val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        ?: return false
      val sbn = nm.activeNotifications.firstOrNull {
        (it.notification.flags and Notification.FLAG_FOREGROUND_SERVICE) != 0
      } ?: return false
      val existing = sbn.notification
      val body = bodyText(System.currentTimeMillis())
      val sameBody = existing.extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() == body
      // A notification still carrying a colour is re-posted plain once (brief 01).
      val plain = existing.color == Notification.COLOR_DEFAULT
      if (sameBody && plain) return true
      val builder = Notification.Builder.recoverBuilder(context, existing)
        .setContentText(body)
        // No header time of any kind: the body carries the clock (brief 03).
        .setShowWhen(false)
        .setUsesChronometer(false)
        .setOnlyAlertOnce(true)
        // Plain look on every OEM (Nathan, 2026-09-30): never a colorized card, never an
        // accent tint. recoverBuilder would inherit both from the live notification, so
        // state it here instead of trusting index.ts's missing notificationColor alone.
        .setColor(Notification.COLOR_DEFAULT)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) builder.setColorized(false)
      // The status-bar SMALL icon needs no code: expo-location already prefers a drawable
      // named `notification_icon` and recoverBuilder preserves whatever it set. No large icon.
      nm.notify(sbn.tag, sbn.id, builder.build())
      true
    } catch (e: Exception) {
      false
    }
  }
}
