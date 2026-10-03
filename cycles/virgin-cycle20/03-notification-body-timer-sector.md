# 03 — Ride notification: body = elapsed timer · sector, ticking every second (no chronometer, no static text)

**Source: Nathan, 2026-09-30** — he sees **no timer** on his Honor, and the Samsung testers see none
either: the SystemUI chronometer + `S<n>` header sub-text from cycle18 brief 03 cannot be relied on.
Ruling: **no unnecessary info**. The body text becomes just the elapsed time and the sector —
`12:34 · S2` — updated **every second** (per-second updates approved: the standard for timer
notifications). The static `GPS tracking is active until you press Stop.` goes away everywhere.
Title stays `Qualifire — recording ride`. The timer must keep ticking when GPS fixes stall, with the
screen off and the app in the background — that is what the foreground service is for.

**Status: brief only. Nothing below is in the app.** Written 2026-09-30 by the Plan tier (Fable)
against the working tree (branch `virgin`, HEAD `ae911bb`). Executor: Sonnet, cold, this file only.

**Sequencing (binding): execute AFTER `01-notification-consistent-plain-look.md` has landed** in
the same tree. This brief touches the same Kotlin module, `index.ts` block and test suite; it
*keeps* everything 01 introduced (no `notificationColor`, `setColor(Notification.COLOR_DEFAULT)`,
the guarded `setColorized(false)`, the `existing.color == Notification.COLOR_DEFAULT` idempotence
condition, no large icon, no `Icon` import, `keep.xml` with only `notification_icon`) and replaces
the chronometer/sub-text mechanism around them. §Pre-flight below checks 01 is in. If it is not,
**stop and report** — do not execute 01 yourself and do not execute this brief on a pre-01 tree.

## What this changes on the phone — and what it does not

- **Stays:** title `Qualifire — recording ride`; the plain uncoloured card from 01; the small
  status-bar flame (`notification_icon`, expo-location's by name); the launcher tap intent; silent
  updates (`setOnlyAlertOnce(true)`, channel is `IMPORTANCE_LOW` — expo-location's).
- **Changes:** the body line is the elapsed ride time, `m:ss` (`0:05`, `12:34`), `h:mm:ss` from
  one hour (`1:02:34`), followed by ` · S<n>` while a sector is being ridden and ` · finished`
  after the last gate — nothing else. It ticks once a second from START until END, whether or not
  fixes arrive, with the screen off, app backgrounded or swiped away (the service survives:
  `killServiceOnDestroy: false`). No header chronometer, no header sub-text, no header timestamp,
  no static sentence. Before the first tick lands (≤1 s after the service posts) the card shows the
  title only.
- **Zero = `session.startedAtMs`** — the same zero as the in-app lap clock (`fmtClock` in
  `liveView.tsx` shows `m:ss.d`; the notification is the same clock without tenths).
- **Native Kotlin change → needs a NEW BUILD (build 8 together with 01), not an OTA.** The TS
  side alone is OTA-able but useless without the module: an OTA onto build 7 would remove the
  static body and the old build-7 module would keep applying the (invisible) chronometer, i.e. a
  title-only card. Ship as one build.

## Why the chronometer never showed (investigated, but the fix does not depend on it)

Read 2026-09-30, `app/node_modules/expo-location/android/src/main/java/expo/modules/location/`
(never edited): `services/LocationTaskService.kt` builds a plain `Notification.Builder(this,
channel)` with title/body/colour/content-intent/small icon on a channel created at
`IMPORTANCE_LOW` (lines 69-111, 120); `taskConsumers/LocationTaskConsumer.kt` calls
`mService.startForeground(options)` again on every task (re)registration (`didRegister` line 57,
`maybeStartForegroundService` lines 176-237) — that is the plain re-post the cycle18 planner
re-asserts over. The cycle18 module then `recoverBuilder`s that notification and sets
`setWhen(startedAtMs).setShowWhen(true).setUsesChronometer(true).setSubText(label)`. Two
candidate reasons no timer is visible, not distinguishable without a phone in hand:

1. **OEM header layout.** The chronometer lives in the notification *header's* time slot (where
   stock Android prints "now" / "5 min"). Samsung One UI (4+) and Honor MagicOS both drop that
   header time slot for ordinary (non-media, non-call) notifications, so `setUsesChronometer` has
   nothing to render into — the API is honoured, the pixels are not there. The `S<n>` sub-text sits
   in the same header row and is equally at the OEM's mercy. This is the likelier cause.
2. **The module never reached `notify()`** — `apply()` resolves `false` when it finds no
   `FLAG_FOREGROUND_SERVICE` notification or anything throws, and nothing on screen tells the two
   apart today (the sub-text would be missing in both cases).

The new design side-steps both: the **body** (`EXTRA_TEXT`) is a first-class, always-rendered line
on every OEM, and because the module now writes it, **a ticking body is proof the module works** —
a title-only card after build 8 means cause 2, and that becomes a separate, now-diagnosable issue.
No `adb` needed.

## Design (decided — the executor does not re-decide any of it)

1. **Tick source = a native 1 Hz ticker inside the Kotlin module**, `Handler(Looper.getMainLooper())
   .postDelayed`, re-armed after each tick to fire ~20 ms after the next whole-second boundary of
   the elapsed clock. Rejected alternatives and why:
   - *Engine emits (~1 Hz while fixes arrive)* — Nathan's rule: the timer must tick when fixes
     stall (tunnel, indoor start, GPS hiccup). Emits stop with the fixes.
   - *JS `setInterval` in the location layer* — React Native's Android `JavaTimerManager` stops
     firing JS timers on `onHostPause` (Choreographer frame callback removed) unless a
     HeadlessJsTask is active; expo-task-manager delivers location events to a running app as
     ordinary bridge events, not headless tasks. So JS timers freeze with the app backgrounded —
     exactly the case that matters. (`react-native-background-timer` exists for this reason; not
     adding a dependency.)
   - *Keeping `setUsesChronometer`* — unreliable per the report above.
   A main-looper `Handler` runs as long as the process lives; the location foreground service keeps
   the process alive and, with fused-location fixes at 1 Hz, awake. In deep Doze ticks can be late
   (`postDelayed` uses uptime); the body is computed from **wall clock** (`System.currentTimeMillis()
   − startedAtMs`) on every tick, so a late tick shows the right time and nothing drifts.
2. **JS keeps the cycle18 planner shape; native owns the clock.** `pushRideNotification()` still
   calls `apply(startedAtMs, label)` on change / every 30 engine ticks / AppState `'active'`
   (each call (re)starts the ticker and updates the label); a new `stop()` is called when the
   session ends. The ticker self-parks after 120 consecutive ticks with no foreground-service
   notification (2 min — covers the sub-second gap between START and the service's first post, and
   the OS having killed the service); the JS re-assert restarts it. No busy loop can outlive a ride.
3. **Body format** (pure TS `formatElapsed` is the spec; Kotlin mirrors it, tests pin both):
   seconds floored; `m:ss` with unpadded minutes (`0:00`, `0:59`, `12:34`, `59:59`); from 3600 s
   `h:mm:ss` with padded minutes (`1:00:00`, `1:02:34`); negative / non-finite → `0:00`. Label
   joined with ` · ` (U+00B7, the app's own separator, e.g. `recording continues · resume or end`):
   `12:34`, `12:34 · S2`, `12:34 · finished`. Label rule ported verbatim from cycle18
   `rideNotificationFor`: `finished` when `phase === 'finished'`, else `S<currentSector>` when
   non-null, else none. The timer keeps counting after `finished` (recording is still on until END —
   same as the cycle18 chronometer).
4. **Drop `setUsesChronometer` / `setSubText` / `setWhen` / `setShowWhen(true)`.** On a phone
   that *does* render the header time they would show the timer and `S2` twice; on the others they
   are dead weight. The module now sets `setShowWhen(false)` and `setUsesChronometer(false)`
   explicitly (recoverBuilder inherits, so say it) — no header time of any kind, per "no unnecessary
   info".
5. **Idempotence compares the body.** `EXTRA_TEXT` of the live notification equals the computed
   body (and 01's `plain` condition holds) → resolve true without `notify()`. So the JS
   `apply()` right after a native tick, or two ticks inside one second, cost nothing.
6. **Silent + within limits.** `setOnlyAlertOnce(true)` stays (no buzz/sound on any update; the
   channel is `IMPORTANCE_LOW` anyway). NotificationManagerService rate-limits enqueues at 5 per
   second per package; 1 per second is well inside, and it is exactly what the AOSP Clock stopwatch
   notification does. Cost: one binder call + a SystemUI content update per second, dwarfed by the
   1 Hz GPS the ride already runs; no wakelock is taken (the ticker rides on the process the FGS
   keeps alive). Nathan approved the per-second cadence.
7. **`notificationBody` is removed from the expo-location options, not replaced.** A seed like
   `0:00` would flash mid-ride on every plain re-post (foreground cold start) for up to a second;
   a blank body for ≤1 s is cleaner, and title-only is the "module dead" diagnostic (see above).
8. **Ghost-notification guard.** A tick that ran between the service cancelling its notification
   and the process noticing could `notify()` a dismissable ghost. Two defences: every tick looks
   the live FGS notification up **fresh** (never a cached one — nothing found → nothing posted), and
   `stopTracking()` calls `stopRideNotification()` **before** `Location.stopLocationUpdatesAsync`.
   The wrapper also stops on `pushRideNotification(null)` (belt). All `apply`/`stop` state changes
   are serialised onto the main looper in call order.
9. **Field rename `subText` → `label`** in the pure policy (the header sub-text no longer exists;
   a lying name is worse than a suite edit). The planner (`planTick`, `noteResult`,
   `forceReassert`, constants) is unchanged.

## Pre-flight (01 landed?) — all must hold, else stop and report

- `app/src/location/index.ts`: no `notificationColor`, no `#e10600`; the comment `// No
  notificationColor (virgin-cycle20 brief 01)` is inside the `foregroundService: {` block.
- `QualifireRideNotificationModule.kt` contains `setColor(Notification.COLOR_DEFAULT)`,
  `setColorized(false)`, `existing.color == Notification.COLOR_DEFAULT`; contains **no**
  `qualifire_flame_large`, `setLargeIcon`, `import android.graphics.drawable.Icon`.
- `…/res/drawable-nodpi/qualifire_flame_large.png` absent; `…/res/raw/keep.xml` line 3 is
  `    tools:keep="@drawable/notification_icon" />`.
- `app/tests/ridenotification_suite.ts` contains the test name
  `virgin-cycle20 01: ride notification has no colour anywhere`.
- `cd app && node --experimental-strip-types tests/run.ts` → 0 FAIL; record the summary line
  (expected 785 total if only 01 landed on top of `ae911bb`; +7 if cycle19 landed too).

## Executor rules (binding)

- **Stop-on-ambiguity.** Anchors below were read on 2026-09-30 from the pre-01 tree plus 01's
  exact snippets. Where a quoted "before" is not found verbatim, stop and report (file, expected,
  found). Never guess, never patch around it. Three files are given as **full replacements**
  (policy, wrapper, Kotlin) and one as a full replacement too (the suite) precisely so no line
  number has to be trusted — still confirm the pre-flight tokens first.
- No commit unless told (`GIT_OPTIONAL_LOCKS=0 git …`; a leftover `.git/index.lock` is `mv`'d
  aside, never deleted). **Never delete** — `safe_to_delete/` is the bin. Nothing is deleted here.
- No `npm install`, `npx`, `eas`, Gradle. Kotlin is checked by reading and by the suite's token
  pins, not compiled.
- **Files touched — exactly these, nothing else:**
  - REPLACE `app/src/location/rideNotificationPolicy.ts`
  - REPLACE `app/src/location/rideNotification.ts`
  - REPLACE `app/modules/qualifire-ride-notification/android/src/main/java/expo/modules/qualifireridenotification/QualifireRideNotificationModule.kt`
  - EDIT `app/src/location/index.ts` (five small edits, a-e)
  - REPLACE `app/tests/ridenotification_suite.ts`
- Do **not** touch: `expo-module.config.json`, `android/build.gradle`, any `res/` file,
  `lockScreen*.ts`, `liveView.tsx`, `RecordScreen.tsx`, `tests/run.ts`, `app.json`,
  `app.config.js`, `eas.json`, `package.json`, `node_modules/`, `STATE.md`, `OPEN-ITEMS.md`,
  `IDEAS.md`, other files in this folder.

## Goal

After build 8: on Samsung and Honor alike, the ride card reads `Qualifire — recording ride` /
`12:34 · S2` and the seconds visibly tick with the screen off and the app backgrounded, GPS or no
GPS; no header time, no sub-text, no static sentence. The headless suite pins the format, the label
rule, the planner, the Kotlin tokens (ticker, `setContentText`, `EXTRA_TEXT`, no chronometer/sub-text,
01's colour lines intact) and the `index.ts` wiring (no `notificationBody`, `stopRideNotification()`
before `stopLocationUpdatesAsync`).

## Files to touch

### 1. REPLACE `app/src/location/rideNotificationPolicy.ts` with exactly:

```ts
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
```

### 2. REPLACE `app/src/location/rideNotification.ts` with exactly:

```ts
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
  native.stop().catch(() => {
    /* display-only channel */
  });
}

/** App came to the foreground — force the next tick to re-apply. */
export function forceRideNotificationReassert(): void {
  state = forceReassert(state);
}
```

### 3. REPLACE `QualifireRideNotificationModule.kt` with exactly:

(Path: `app/modules/qualifire-ride-notification/android/src/main/java/expo/modules/qualifireridenotification/QualifireRideNotificationModule.kt`.
Confirm the pre-flight tokens are present in the *old* file first; the new file keeps 01's colour
lines verbatim.)

```kotlin
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
```

Read-check after writing: the file contains **no** `setUsesChronometer(true)`, `setSubText(`,
`setWhen(`, `EXTRA_SUB_TEXT`, `EXTRA_SHOW_CHRONOMETER`, `qualifire_flame_large`, `setLargeIcon`,
`drawable.Icon`; it **does** contain `setContentText(body)`, `Notification.EXTRA_TEXT`,
`Handler(Looper.getMainLooper())`, `AsyncFunction("stop")`, `OnDestroy`, `"%d:%02d:%02d"`,
`"%d:%02d"`, `" \u00B7 "` (the six characters backslash-u-0-0-B-7 inside the string literal, not the dot itself), and 01's three
colour tokens.

### 4. EDIT `app/src/location/index.ts` — five edits (a-e)

(a) Header comment. Before (lines 15-19):
```
 *  - virgin-cycle18 brief 03 (2026-09-29): the foreground-service notification
 *    gets a SystemUI chronometer (zero = session.startedAtMs) + "S<n>" header
 *    sub-text, driven by a module-scope liveEngine.subscribe through
 *    ./rideNotification (no-op on installs without the native module);
 *    POST_NOTIFICATIONS is requested at START (Android 13+).
```
After:
```
 *  - virgin-cycle18 brief 03 → virgin-cycle20 brief 03 (2026-09-30): the
 *    foreground-service notification's BODY is the elapsed ride time + sector
 *    ("12:34 · S2"), rewritten once a second by the native module's own ticker
 *    (zero = session.startedAtMs; keeps ticking without fixes, screen off);
 *    JS only pushes the zero + label through a module-scope
 *    liveEngine.subscribe via ./rideNotification (no-op on installs without
 *    the native module) and stops the ticker before the service is stopped;
 *    POST_NOTIFICATIONS is requested at START (Android 13+).
```

(b) Import. Before (line 35):
```ts
import { pushRideNotification, forceRideNotificationReassert } from './rideNotification';
```
After:
```ts
import { pushRideNotification, forceRideNotificationReassert, stopRideNotification } from './rideNotification';
```

(c) expo-location options — the post-01 block. Before:
```ts
      foregroundService: {
        notificationTitle: 'Qualifire — recording ride',
        notificationBody: 'GPS tracking is active until you press Stop.',
        // No notificationColor (virgin-cycle20 brief 01): any value makes expo-location
        // setColorized(true) — a solid-colour card on Samsung One UI, ignored on Honor.
        // Plain system card on every OEM instead; the module re-asserts that too.
        killServiceOnDestroy: false, // survive the app being swiped away
      },
```
After:
```ts
      foregroundService: {
        notificationTitle: 'Qualifire — recording ride',
        // No notificationBody (virgin-cycle20 brief 03): the native module writes the
        // body ("12:34 · S2") once a second; a static sentence here would flash back on
        // every plain re-post and says nothing the rider needs. expo-location's TS type
        // declares the field required, but its Kotlin record is `String? = null` and
        // LocationTaskService only calls setContentText inside `body?.let`, so the cast
        // below leaves the runtime body undefined (title-only card until the first tick).
        // No notificationColor (virgin-cycle20 brief 01): any value makes expo-location
        // setColorized(true) — a solid-colour card on Samsung One UI, ignored on Honor.
        // Plain system card on every OEM instead; the module re-asserts that too.
        killServiceOnDestroy: false, // survive the app being swiped away
      } as Location.LocationTaskServiceOptions,
```
(The `as` cast is the Fable ruling of 2026-10-02 — see §Ruling at the end. `Location` is the
existing `import * as Location from 'expo-location'`; no new import.)

(d) `stopTracking` — stop the ticker before the service. Before (lines 487-494):
```ts
export async function stopTracking(): Promise<RideSummary | null> {
  const s = await ensureSession();
  try {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
```
After:
```ts
export async function stopTracking(): Promise<RideSummary | null> {
  const s = await ensureSession();
  // virgin-cycle20 brief 03: park the native 1 Hz body ticker BEFORE the
  // service (and its notification) go away, so no tick can re-post a ghost.
  stopRideNotification();
  try {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
```

(e) The subscription comment block. Before (lines 551-561, exact):
```ts
// virgin-cycle18 brief 03 (testers via Nathan, 2026-09-29): keep the
// foreground-service notification's header showing a live elapsed stopwatch
// (SystemUI chronometer, zero = startedAtMs — no per-second work) and the
// current sector ("S2"; "finished" after the last gate). Subscribed at module
```
After:
```ts
// virgin-cycle18 brief 03 → virgin-cycle20 brief 03 (Nathan, 2026-09-30): keep
// the foreground-service notification's BODY showing the elapsed ride time and
// the current sector ("12:34 · S2"; "finished" after the last gate). The native
// module ticks the clock itself once a second (zero = startedAtMs); this
// subscription only hands it the zero + label. Subscribed at module
```
The remaining lines of that comment and the `liveEngine.subscribe((st) => { pushRideNotification(
rideNotificationFor(session ? session.startedAtMs : null, st)); });` call and the `AppState`
listener below it are **unchanged** (the suite pins them verbatim).

### 5. REPLACE `app/tests/ridenotification_suite.ts` with exactly:

```ts
/**
 * virgin-cycle18 brief 03 → virgin-cycle20 briefs 01 + 03 — ride-running
 * notification. Only a phone can show the card; what a headless suite CAN
 * pin: the label rule, the body format (formatElapsed / rideNotificationBody
 * are the spec the Kotlin ticker mirrors), the push planner's arithmetic
 * (change / retry / re-assert / back-off), and that config, Kotlin, wrapper
 * and index.ts cannot drift apart. The runtime wrapper imports `expo` (which
 * plain Node cannot load), so it is read here as TEXT only; the policy file
 * is pure and imported for real.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, loadJson, test, TESTS_DIR } from './lib.ts';
import {
  MAX_CONSECUTIVE_MISSES,
  REASSERT_EVERY_N_TICKS,
  RIDE_NOTIFICATION_MODULE_NAME,
  RIDE_NOTIFICATION_SEPARATOR,
  forceReassert,
  formatElapsed,
  initialPushState,
  noteResult,
  planTick,
  rideNotificationBody,
  rideNotificationFor,
  rideNotificationLabel,
  type PushState,
} from '../src/location/rideNotificationPolicy.ts';

const APP_DIR = path.resolve(TESTS_DIR, '..');
const T0 = 1_759_100_000_000;
const MOD_DIR = path.join(APP_DIR, 'modules', 'qualifire-ride-notification');
const KT_PATH = path.join(
  MOD_DIR, 'android', 'src', 'main', 'java', 'expo', 'modules', 'qualifireridenotification',
  'QualifireRideNotificationModule.kt',
);

test('ridenotif: label rule — no session pushes nothing', () => {
  assert(rideNotificationFor(null, { phase: 'locked', currentSector: 2 }) === null, 'null session → null');
});

test('ridenotif: label rule — clock only before START, on free rides, while detecting', () => {
  for (const phase of ['idle', 'detecting', 'locked'] as const) {
    const d = rideNotificationFor(T0, { phase, currentSector: null });
    assert(d !== null && d.whenMs === T0 && d.label === null, `${phase}: clock only`);
    assert(rideNotificationLabel({ phase, currentSector: null }) === null, `${phase}: no label`);
  }
});

test('ridenotif: label rule — S<n> while a sector is being ridden, "finished" after the last gate', () => {
  const s1 = rideNotificationFor(T0, { phase: 'locked', currentSector: 1 });
  const s4 = rideNotificationFor(T0, { phase: 'locked', currentSector: 4 });
  const fin = rideNotificationFor(T0, { phase: 'finished', currentSector: null });
  assert(s1?.label === 'S1' && s4?.label === 'S4', 'S-label format matches liveView');
  assert(fin?.label === 'finished', 'post-finish label');
  assert(s1?.whenMs === T0 && fin?.whenMs === T0, 'clock zero never moves');
  assert(rideNotificationLabel({ phase: 'finished', currentSector: 3 }) === 'finished', 'finished wins over a stale sector');
});

test('virgin-cycle20 03: formatElapsed — m:ss below an hour, h:mm:ss from an hour, floored, clamped', () => {
  const cases: [number, string][] = [
    [0, '0:00'], [999, '0:00'], [1000, '0:01'], [45_900, '0:45'], [59_999, '0:59'],
    [60_000, '1:00'], [754_000, '12:34'], [754_999, '12:34'], [3_599_999, '59:59'],
    [3_600_000, '1:00:00'], [3_754_000, '1:02:34'], [36_000_000, '10:00:00'],
    [-5_000, '0:00'], [Number.NaN, '0:00'], [Number.POSITIVE_INFINITY, '0:00'],
  ];
  for (const [ms, want] of cases) {
    const got = formatElapsed(ms);
    assert(got === want, `formatElapsed(${ms}) = ${got}, want ${want}`);
  }
});

test('virgin-cycle20 03: rideNotificationBody — clock, then " · label" only when there is one', () => {
  assert(RIDE_NOTIFICATION_SEPARATOR === ' · ', 'separator is space·space (U+00B7)');
  assert(rideNotificationBody({ whenMs: T0, label: null }, T0 + 754_000) === '12:34', 'no label → clock only');
  assert(rideNotificationBody({ whenMs: T0, label: 'S2' }, T0 + 754_000) === '12:34 · S2', 'sector label');
  assert(rideNotificationBody({ whenMs: T0, label: 'finished' }, T0 + 3_754_000) === '1:02:34 · finished', 'finished, over an hour');
  assert(rideNotificationBody({ whenMs: T0, label: 'S1' }, T0 - 1) === '0:00 · S1', 'clock before zero reads 0:00');
});

test('ridenotif: planner — first tick calls, unchanged ticks do not, change calls again', () => {
  const a = { whenMs: T0, label: null };
  let st = initialPushState();
  let p = planTick(st, a);
  assert(p.call, 'first desired → call');
  st = noteResult(p.state, a, true);
  for (let i = 0; i < REASSERT_EVERY_N_TICKS - 2; i++) {
    p = planTick(st, a);
    assert(!p.call, `unchanged tick ${i + 1} must not call`);
    st = p.state;
  }
  const b = { whenMs: T0, label: 'S1' };
  p = planTick(st, b);
  assert(p.call, 'sector change → call');
  st = noteResult(p.state, b, true);
  assert(st.applied?.label === 'S1' && st.ticksSinceCall === 0, 'applied recorded, ticks reset');
});

test('ridenotif: planner — a false result retries next tick; back-off after MAX misses; re-assert still fires', () => {
  const a = { whenMs: T0, label: null };
  let st: PushState = initialPushState();
  for (let i = 0; i < MAX_CONSECUTIVE_MISSES; i++) {
    const p = planTick(st, a);
    assert(p.call, `miss ${i}: still retrying`);
    st = noteResult(p.state, a, false);
  }
  assert(st.misses === MAX_CONSECUTIVE_MISSES && st.applied === null, 'misses counted');
  let calls = 0;
  for (let i = 0; i < REASSERT_EVERY_N_TICKS; i++) {
    const p = planTick(st, a);
    if (p.call) calls++;
    st = p.state;
  }
  assert(calls === 1, `backed off: exactly one re-assert call in ${REASSERT_EVERY_N_TICKS} ticks, got ${calls}`);
});

test('ridenotif: planner — re-assert every REASSERT_EVERY_N_TICKS, forceReassert makes the next tick call, null desired resets', () => {
  const a = { whenMs: T0, label: 'S2' };
  let st = noteResult(initialPushState(), a, true);
  let calls = 0;
  for (let i = 0; i < REASSERT_EVERY_N_TICKS * 2; i++) {
    const p = planTick(st, a);
    st = p.state;
    if (p.call) {
      calls++;
      st = noteResult(st, a, true);
    }
  }
  assert(calls === 2, `two re-asserts in ${REASSERT_EVERY_N_TICKS * 2} unchanged ticks, got ${calls}`);
  st = forceReassert(st);
  assert(planTick(st, a).call, 'forced re-assert calls on the very next tick');
  const reset = planTick(st, null);
  assert(!reset.call && reset.state.applied === null && reset.state.misses === 0, 'null desired resets the planner');
});

test('ridenotif: local Expo module directory, config and Kotlin class agree with the JS name', () => {
  const cfg = loadJson<{ platforms: string[]; android: { modules: string[] } }>(
    path.join(MOD_DIR, 'expo-module.config.json'),
  );
  assert(cfg.platforms.length === 1 && cfg.platforms[0] === 'android', 'android-only module');
  assert(cfg.android.modules.length === 1, 'exactly one Kotlin module class');
  const cls = cfg.android.modules[0];
  const ktPath = path.join(MOD_DIR, 'android', 'src', 'main', 'java', ...cls.split('.')) + '.kt';
  assert(ktPath === KT_PATH, `config class path ${ktPath} must be the pinned module file`);
  assert(fs.existsSync(ktPath), `Kotlin file missing at ${ktPath}`);
  const kt = fs.readFileSync(ktPath, 'utf8');
  assert(kt.includes(`Name("${RIDE_NOTIFICATION_MODULE_NAME}")`), 'Kotlin Name(...) must equal RIDE_NOTIFICATION_MODULE_NAME');
  assert(kt.includes('AsyncFunction("apply")'), 'Kotlin must expose apply');
  assert(kt.includes('AsyncFunction("stop")'), 'Kotlin must expose stop (virgin-cycle20 03)');
  assert(kt.includes('Notification.Builder.recoverBuilder('), 'must clone expo-location\'s notification, not build a second one');
  assert(kt.includes('Notification.FLAG_FOREGROUND_SERVICE'), 'must find the foreground-service notification by flag (id is not constant)');
  assert(kt.includes('setOnlyAlertOnce(true)'), 'updates must be silent');
  assert(!/notify\(\s*\d/.test(kt), 'never a hard-coded notification id');
  assert(fs.existsSync(path.join(MOD_DIR, 'android', 'build.gradle')), 'build.gradle missing');
  assert(!kt.includes('qualifire_flame_large') && !kt.includes('setLargeIcon('), 'no large icon (virgin-cycle20 01): the status-bar silhouette is the only flame');
  assert(kt.includes('setColorized(false)') && kt.includes('setColor(Notification.COLOR_DEFAULT)'), 'module must force the plain card on every OEM');
  assert(kt.includes('existing.color == Notification.COLOR_DEFAULT'), 'idempotence must not keep a coloured notification');
  const resDir = path.join(MOD_DIR, 'android', 'src', 'main', 'res');
  for (const d of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
    assert(fs.existsSync(path.join(resDir, `drawable-${d}`, 'notification_icon.png')), `flame small icon missing for ${d} (expo-location looks up drawable/notification_icon by name)`);
  }
  assert(fs.existsSync(path.join(resDir, 'raw', 'keep.xml')), 'res/raw/keep.xml missing (shrinker would strip name-looked-up drawables)');
  assert(!fs.existsSync(path.join(resDir, 'drawable-nodpi', 'qualifire_flame_large.png')), 'large flame PNG must be gone from module res (moved to safe_to_delete/)');
  const keep = fs.readFileSync(path.join(resDir, 'raw', 'keep.xml'), 'utf8');
  assert(keep.includes('@drawable/notification_icon') && !keep.includes('qualifire_flame_large'), 'keep.xml keeps only notification_icon');
  assert(!fs.existsSync(path.join(MOD_DIR, 'ios')), 'no ios/ directory (Android-only app)');
});

test('virgin-cycle20 03: Kotlin owns a 1 Hz body ticker; no chronometer, sub-text or header time', () => {
  const kt = fs.readFileSync(KT_PATH, 'utf8');
  assert(kt.includes('Handler(Looper.getMainLooper())'), 'main-looper Handler ticker');
  assert(kt.includes('handler.postDelayed(tick,'), 'ticker re-arms itself');
  assert(kt.includes('MAX_TICK_MISSES = 120'), 'ticker parks after 120 empty ticks');
  assert(kt.includes('OnDestroy'), 'ticker cleared on module destroy');
  assert(kt.includes('setContentText(body)') && kt.includes('Notification.EXTRA_TEXT'), 'body is written and compared for idempotence');
  assert(kt.includes('System.currentTimeMillis()'), 'elapsed is wall clock minus startedAtMs (same zero as the in-app clock)');
  assert(kt.includes('"%d:%02d:%02d"') && kt.includes('"%d:%02d"'), 'h:mm:ss / m:ss — same rule as formatElapsed');
  assert(kt.includes('" \\u00B7 "'), 'Kotlin separator mirrors RIDE_NOTIFICATION_SEPARATOR');
  assert(kt.includes('setShowWhen(false)') && kt.includes('setUsesChronometer(false)'), 'no header time of any kind');
  for (const gone of ['setUsesChronometer(true)', 'setSubText(', 'setWhen(', 'EXTRA_SUB_TEXT', 'EXTRA_SHOW_CHRONOMETER']) {
    assert(!kt.includes(gone), `${gone} must be gone (virgin-cycle20 03)`);
  }
});

test('ridenotif: wrapper + index.ts wiring', () => {
  const wrapper = fs.readFileSync(path.join(APP_DIR, 'src', 'location', 'rideNotification.ts'), 'utf8');
  assert(wrapper.includes("from 'expo'") && wrapper.includes('requireOptionalNativeModule<'), 'wrapper must use the optional require');
  assert(wrapper.includes('RIDE_NOTIFICATION_MODULE_NAME'), 'wrapper must require by the pinned name');
  assert(wrapper.includes('apply(startedAtMs: number, label: string | null): Promise<boolean>;'), 'native apply signature');
  assert(wrapper.includes('stop(): Promise<void>;') && wrapper.includes('export function stopRideNotification()'), 'wrapper exposes stop');
  const src = fs.readFileSync(path.join(APP_DIR, 'src', 'location', 'index.ts'), 'utf8');
  assert(src.includes("import { pushRideNotification, forceRideNotificationReassert, stopRideNotification } from './rideNotification';"), 'wrapper import missing');
  assert(src.includes('pushRideNotification(rideNotificationFor(session ? session.startedAtMs : null, st));'), 'subscriber must key on session.startedAtMs');
  assert((src.match(/liveEngine\.subscribe\(/g) ?? []).length === 2, 'expected exactly two module-scope liveEngine.subscribe( calls (buzz + notification)');
  assert(src.includes('PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS'), 'POST_NOTIFICATIONS runtime request missing');
  assert(src.includes("if (next === 'active') forceRideNotificationReassert();"), 'AppState active re-assert missing');
  const fgOpts = src.slice(src.indexOf('foregroundService: {'), src.indexOf('killServiceOnDestroy'));
  assert(fgOpts.includes("notificationTitle: 'Qualifire — recording ride'"), 'expo-location title must be untouched');
  assert(!/notificationColor\s*:/.test(fgOpts), 'no notificationColor key: any value makes expo-location colorize the card (virgin-cycle20 01)');
});

test('virgin-cycle20 03: no static body anywhere; ticker stopped before the service is', () => {
  const src = fs.readFileSync(path.join(APP_DIR, 'src', 'location', 'index.ts'), 'utf8');
  assert(!/notificationBody\s*:/.test(src), 'index.ts must not pass notificationBody');
  assert(!src.includes('GPS tracking is active'), 'the static sentence is gone');
  const stopAt = src.indexOf('export async function stopTracking(');
  assert(stopAt >= 0, 'stopTracking present');
  const stopBody = src.slice(stopAt, src.indexOf('liveEngine.stop()', stopAt));
  const ticker = stopBody.indexOf('stopRideNotification();');
  const svc = stopBody.indexOf('Location.stopLocationUpdatesAsync(LOCATION_TASK)');
  assert(ticker >= 0 && svc >= 0 && ticker < svc, 'stopTracking must park the ticker BEFORE stopping the service (ghost guard)');
  const wrapper = fs.readFileSync(path.join(APP_DIR, 'src', 'location', 'rideNotification.ts'), 'utf8');
  assert(wrapper.includes('if (desired === null) {') && wrapper.includes('stopRideNotification();'), 'wrapper stops the ticker on a null desired too');
});

test('virgin-cycle20 01: ride notification has no colour anywhere (JS options, Kotlin, resources)', () => {
  const src = fs.readFileSync(path.join(APP_DIR, 'src', 'location', 'index.ts'), 'utf8');
  assert(!/notificationColor\s*:/.test(src), 'index.ts must not pass notificationColor');
  assert(!src.includes('#e10600'), 'the old red is gone from index.ts');
  const modDir = path.join(APP_DIR, 'modules', 'qualifire-ride-notification');
  const ktDir = path.join(modDir, 'android', 'src', 'main', 'java', 'expo', 'modules', 'qualifireridenotification');
  const kt = fs.readFileSync(path.join(ktDir, 'QualifireRideNotificationModule.kt'), 'utf8');
  assert(!kt.includes('import android.graphics.drawable.Icon'), 'Icon import removed with the large icon');
  assert(!fs.existsSync(path.join(modDir, 'android', 'src', 'main', 'res', 'drawable-nodpi', 'qualifire_flame_large.png')), 'no large icon resource');
  for (const d of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
    assert(fs.existsSync(path.join(modDir, 'android', 'src', 'main', 'res', `drawable-${d}`, 'notification_icon.png')), `small flame kept for ${d}`);
  }
});
```

Test count: the suite goes from 9 tests (post-01) to **13** (+4: formatElapsed, body, Kotlin
ticker pins, static-body/stop-order). 01's test is kept verbatim as the last test.

## Verification plan

1. **Before** editing anything but after pre-flight: run the suite once → record the summary.
2. Apply steps 1-4 (sources) and run the suite **with the OLD suite still in place** → expect
   FAILs (at least: the `.subText` label tests, `setUsesChronometer(true)` pin, the exact import
   pin). That is the "failed before" artifact; paste the FAIL names.
3. Apply step 5 → `cd app && node --experimental-strip-types tests/run.ts` → **0 FAIL**, total =
   pre-flight total + 4 (789 if pre-flight was 785). Report the exact summary line.
4. `cd app && ./node_modules/.bin/tsc --noEmit` → clean, exit 0 (the `label` rename must not leave
   a `.subText` reader anywhere: `grep -n "subText" app/src/location/*.ts` → no output).
5. `grep -n "GPS tracking is active\|notificationBody\|setUsesChronometer(true)\|setSubText\|EXTRA_SUB_TEXT" app/src/location/index.ts app/src/location/rideNotification.ts app/src/location/rideNotificationPolicy.ts app/modules/qualifire-ride-notification/android/src/main/java/expo/modules/qualifireridenotification/QualifireRideNotificationModule.kt app/tests/ridenotification_suite.ts`
   → only the suite's own negative pins (strings inside `assert(!…)` lines) and the single
   `// No notificationBody (virgin-cycle20 brief 03)` comment line in `index.ts` (step 4(c));
   no `notificationBody:` key, no static sentence in any source.
6. `GIT_OPTIONAL_LOCKS=0 git status --porcelain` → the five files of this brief modified (plus
   01's `keep.xml` / deleted PNG already there), nothing else new.
7. Inspect (fresh Opus): reruns 1-6; reads the Kotlin against Design 1/5/8 (state only touched
   inside `handler.post {}` / the Runnable; `repost()` looks up fresh; `stop` removes callbacks;
   `OnDestroy` present; `Promise` imported from `expo.modules.kotlin.Promise`); confirms 01's
   three colour lines survive verbatim; confirms `index.ts`'s `liveEngine.subscribe` /
   `AppState` block is byte-identical apart from the comment.

## On-device checklist — Nathan, after build 8 (NOT OTA; Kotlin changed)

Samsung (One UI) and Honor, same steps; screenshots into this folder's `PROGRESS.md`:
1. START a ride. Within ~1-2 s the card body reads `0:0x` and **ticks every second**. Title above
   it; nothing else on the card (no header time, no sub-text, no sentence). If the card is
   **title-only and stays so**: the module never reaches `notify()` on this phone — report it
   (that is cause 2 above, a new item), do not re-test the rest.
2. Screen off for 2 minutes, screen on, pull the shade without unlocking: the body shows the right
   elapsed time and keeps ticking.
3. Indoors / airplane-mode GPS for a minute: still ticks (fixes stalled, timer not).
4. Ride onto a way: body becomes `m:ss · S1`, then `· S2` …; after the last gate `· finished`,
   clock still counting.
5. Background the app, wait 30 s, reopen (foreground cold start re-post): at most one blank-body
   second, then the clock is back with the right value (no reset to 0:00).
6. Over an hour (or fake it: compare with the in-app clock at 59:59 → 1:00:00): `1:00:00`.
7. END: the card disappears and **stays gone** — no ghost notification appears afterwards.
8. Compare with the in-app lap clock: same minute:second at any instant (tenths aside).

## Out of scope

- Any change to the in-app clock, the lock-screen flag, the notification channel, the small icon,
  the tap intent; a pause indicator in the body (PAUSE is a safety catch, recording continues —
  D-042 — so the clock rightly keeps running); docs (`STATE.md`, cycle18 brief 03 §"chronometer"
  is superseded by this brief — the coordinator notes it). Brief 01's on-device item 2 ("running
  timer … in the header") is superseded by this checklist.

## Open calls (default chosen — executor does NOT stop for these)

- **A. Unpadded minutes (`0:05`) vs padded (`00:05`).** Chosen: unpadded, matching `fmtClock`'s
  `m:ss.d` in the app. One-character change in both `formatElapsed` and the Kotlin format if
  Nathan prefers padded.
- **B. Keep the clock running after `finished`.** Chosen: yes (recording continues until END;
  cycle18's chronometer did the same).
- **C. Ticker parks after 120 empty ticks.** Chosen over "never park": a service the OS killed
  must not leave a 1 Hz handler alive for hours; the JS re-assert restarts it if the service is
  back.
- **D. Title-only card until the first tick** rather than seeding `notificationBody: '0:00'`.
  Chosen: see Design 7.

## Report back

- Pre-flight result (01 landed: yes/no — if no, stopped there) and the pre-flight summary line.
- The FAIL names from Verification 2, the final summary line (0 FAIL, +4), `tsc` exit code.
- The grep from Verification 5 and the `git status --porcelain` list.
- Any anchor mismatch, verbatim, with what was actually found — and stop there.
- Reminder line for the coordinator: "needs build 8 (with 01); not OTA-able; on-device checklist
  Samsung + Honor pending".

## Ruling (Fable, 2026-10-02) — on the Sonnet executor's two STOPs

1. **STOP 1 (tsc TS2741, `notificationBody` required).** `LocationTaskServiceOptions` in
   `expo-location/build/Location.types.d.ts` declares `notificationBody: string` required, but the
   native side is lenient: the Kotlin record `LocationTaskServiceOptions` (`records/LocationArguments.kt`)
   has `notificationBody: String? = null`, `ReadableArguments.toBundle()` writes a null as
   `putString(key, null)`, and `LocationTaskService.buildServiceNotification` only calls
   `setContentText` inside `body?.let { }`. So an *omitted* body means **no `EXTRA_TEXT` at all** —
   title-only card — which is exactly Design 7 / Open call D. Resolution: keep the key out and add
   `as Location.LocationTaskServiceOptions` on the object literal (edit 4(c) above). Rejected:
   `notificationBody: ''` — expo-location would call `setContentText("")` on every plain re-post, the
   module's idempotence compare (`EXTRA_TEXT == body`) would still re-post correctly, but the key
   would be back in `index.ts` (the suite forbids it) and the "title-only = module dead" diagnostic
   would be muddied by an empty text view; `satisfies` cannot express a missing required field.
   The cast type-checks (`tsc --noEmit` exit 0) because TS's assertion comparability is one-way.
2. **STOP 2 (`fgOpts.includes('notificationColor')` fails on the 01 comment).** Same defect brief
   01's ruling fixed: pin the **key**, `!/notificationColor\s*:/.test(fgOpts)`. Applied in step 5
   above; the `'GPS tracking is active'` absence check is unchanged.
3. **Counts after the ruling** (shared tree, 01 + 03 + earlier uncommitted work): `790 tests:
   787 pass, 0 fail, 3 skip`; `tsc --noEmit` exit 0; `grep -n "subText" app/src/location/*.ts`
   empty; step-5 grep shows only the suite's negative pins and the 4(c) comment; `git status
   --porcelain` lists the five brief-03 files plus 01's `keep.xml` / deleted PNG and the earlier
   briefs' `RecordScreen.tsx`, `recordflow_suite.ts`, `scripts/OTA-TROUBLESHOOTING.md`,
   untracked `cycles/virgin-cycle19/`, `cycles/virgin-cycle20/`, `marketing/assets/fire/web-ideas/`.
   Edit 4 is five edits (a-e), not four — wording fixed above. Still **needs build 8 (with 01);
   not OTA-able; on-device checklist Samsung + Honor pending**.
