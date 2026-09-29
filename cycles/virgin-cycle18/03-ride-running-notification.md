# 03 — Ride-running notification: live elapsed timer + current sector in the status shade

> **Amended 2026-09-29 (Nathan): flame pictogram folded in** — Decision 12, Files-to-touch 4b, the
> Kotlin `setLargeIcon` lines, one pin-test extension, verification 6, checklist 8, Nathan's call 6,
> assumptions 5-6. Assets: `cycles/virgin-cycle18/assets-03/`.

**Source: several testers, relayed by Nathan 2026-09-29, approved as cycle18 idea #3.**
Testers' words: people "forgot the app was still recording and left it running for hours".
Wanted: while a ride is being recorded, a running notification that shows the elapsed timer
ticking, so anyone sees at a glance how long they have been going; and when the ride is on a
known way, "S1" (etc.) next to it, updating with the current sector.

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-29 by the Plan
tier (Fable) from a Haiku digest plus anchor checks against the working tree (branch `virgin`,
HEAD `e418dec`, `expo-location` 19.x sources under `app/node_modules`). Executor: Sonnet, cold,
this file only. **This brief adds a second local Kotlin module (sibling of brief 01's). It is
NOT OTA-able: nothing here reaches any phone until Nathan runs a new EAS build (§ "What Nathan
must run"). The executor's job ends at green tests and clean tsc; it never builds.**

## Relation to brief 01 (`01-app-over-lock-screen.md`) — read this first

- **Independent, either order, one shared rebuild.** Brief 01 adds `app/plugins/withShowWhenLocked.js`
  + `app/modules/qualifire-lock-screen/` + `app/src/location/lockScreen.ts` and edits
  `app/app.json`. This brief adds `app/modules/qualifire-ride-notification/` (a **sibling
  directory, not an extension of 01's module** — Decision 6) + two new `src/location/*.ts`
  files and touches **no** `app.json` and **no** config plugin (no manifest change is needed:
  updating a notification your own package already posted needs no new permission entry —
  `POST_NOTIFICATIONS` is already declared, `app.json` line 20). So the two briefs share **no**
  new file and no `app.json` line.
- **Both edit `app/src/location/index.ts`.** Every anchor below is by *text*, never by line
  number, and each is chosen so it is unchanged by 01's edits. Where 01 changes a line this
  brief also needs (the `react-native` import), the edit is written for both states.
- **One native rebuild covers both** (fingerprint moves once). Run `build7.ps1` after whichever
  of 01/03 lands last — or after 03 alone. The build section below is the same as 01's.
- **Heads-up for whoever executes 01 (not this executor's job):** 01's
  `tests/lockscreen_suite.ts` imports `../src/location/lockScreen.ts`, which imports `expo` at
  module top. Verified 2026-09-29 on this mount: `node --experimental-strip-types` cannot load
  `expo` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` on `node_modules/expo/src/Expo.ts`), so
  that import will FAIL the suite. This brief avoids the trap by splitting the pure policy
  (Node-testable, no `expo` import) from the runtime wrapper (imports `expo`, read by the test
  only as text). 01 should do the same (move its constant into a pure file) — log it for the
  coordinator; do not fix 01 from here.

## What Android actually offers (the honest version, for Nathan)

- **A notification can tick by itself.** `Notification.Builder.setUsesChronometer(true)` +
  `setWhen(startedAtMs)` makes SystemUI render the header timestamp as a live stopwatch
  ("12:34", then "1:02:11" past an hour) computed from `when`, with **no work from the app** —
  no per-second updates, works with the screen off, keeps ticking while the JS process is dead.
  This is exactly what Google Maps / Strava's ongoing notifications use.
- **The sector must be pushed.** Text in a notification only changes when the app re-posts it.
  Sector changes are rare (a few per ride), so this is a handful of updates per ride, done
  from the location task handler — which **does run JS in the background**: the digest's claim
  that "JS is not running when backgrounded" is wrong; `index.ts`'s `TaskManager.defineTask`
  handler calls `liveEngine.feed()` for every fix (index.ts, inside the task handler, the
  `try { liveEngine.feed(` block) precisely because expo-task-manager executes the handler in
  the app's JS context (headless when no activity exists), kept alive by the foreground
  service. So `currentSector` changes are observable with the screen off, and a
  `liveEngine.subscribe` at module scope sees them (the gate buzz already relies on this —
  index.ts, the `liveEngine.subscribe((st) => {` block that vibrates).
- **expo-location's notification is fixed text.** `LocationTaskService.kt`
  (`app/node_modules/expo-location/android/src/main/java/expo/modules/location/services/
  LocationTaskService.kt`) builds it once per `startForeground(serviceOptions)` (lines 62-65,
  69-111): title, body, colour, launcher `contentIntent`, small icon, `CATEGORY_SERVICE`.
  No chronometer, no subText, no actions, no hook. The notification **id** is
  `mServiceId = sServiceId++` (line 22, companion line 146: starts at 481756 per process, +1
  per service instance) — **not a constant**, so nothing may hard-code it. The channel id is
  `"<appScopeKey>:qualifire-ride-tracking"` (line 38 + `LOCATION_TASK`).
- **When expo-location re-posts its plain notification** (and would wipe ours): only in
  `LocationTaskConsumer.maybeStartForegroundService` (`.../taskConsumers/LocationTaskConsumer.kt`
  lines 176-237) — on task registration while the app is foregrounded: at START
  (`startLocationUpdatesAsync`, lines 205-231, posted asynchronously in `onServiceConnected`),
  and again on a **cold start of the app while a ride is still running** (expo-task-manager
  re-registers persisted tasks → `didRegister` line 56 → a fresh `mService == null` → re-post
  with the original title/body). Never from the background (line 181-184 returns when not
  foregrounded). So our update must be (a) retried until the notification exists, and
  (b) re-asserted after the app comes to the foreground. Decision 3 handles both cheaply.
- **Updating a foreground service's notification is the documented path:** post a notification
  with the same id (and tag) through `NotificationManager.notify` and the system keeps it as
  the service's ongoing, non-dismissable notification. The id is found at runtime from
  `NotificationManager.getActiveNotifications()` (API 23): the one carrying
  `Notification.FLAG_FOREGROUND_SERVICE` — Qualifire has exactly one foreground service. The
  existing notification is cloned with `Notification.Builder.recoverBuilder(context, n)`
  (API 24; Expo 56 minSdk is 24) so title, body, colour, icon and the launcher tap intent
  survive untouched; only `when`/chronometer/subText are set. `setOnlyAlertOnce(true)` keeps
  every update silent.
- **What it looks like.** Notification header row: `Qualifire · S2 · 12:34` — sub-text sits
  between the app name and the ticking chronometer, on the shade and on the lock screen's
  collapsed line. Title and body stay "Qualifire — recording ride" / "GPS tracking is active
  until you press Stop." Free ride or not yet past START: `Qualifire · 12:34`. After the
  FINISH gate: `Qualifire · finished · 1:02:11` (Nathan's call 1).
- **The uncomfortable finding: today's testers may never have SEEN the notification at all.**
  On Android 13+ `POST_NOTIFICATIONS` is a *runtime* permission. The manifest declares it
  (`app.json` line 20) but nothing in `app/src` ever requests it (grep: only
  `requestForegroundPermissionsAsync` / `requestBackgroundPermissionsAsync`, index.ts
  `ensurePermissions`). Android's rule (developer.android.com, notification-permission page,
  "Exemptions"): *"if the user denies the notification permission, they still see notices
  related to foreground services in the Task Manager but don't see them in the notification
  drawer."* An app targeting 13+ that never asks is treated as not granted. So on a 2026
  phone the "Qualifire — recording ride" notification is most likely invisible in the shade
  unless the tester enabled notifications by hand — which matches "forgot it was running".
  This brief adds the one missing runtime request (Decision 5). That part is JS-only and would
  be OTA-able on its own, but see "OTA-only tier" below for why it is not shipped that way.

## OTA-only tier (considered, insufficient)

JS-only options: (1) request `POST_NOTIFICATIONS` at START so the existing plain
notification becomes visible; (2) change the static body text ("tap to open; PAUSE → END to
stop"). Neither can show a ticking timer or the sector: expo-location only re-posts on
re-registration **while foregrounded** (`maybeStartForegroundService` line 181), so even
re-calling `startLocationUpdatesAsync` with new `notificationBody` text cannot update from the
background, and there is no chronometer path at all. (1) is folded into this brief; (2) is
not done (Nathan's call 3). **Also:** the moment `app/modules/` exists in the tree the native
fingerprint changes and `publish-preview.ps1`'s OTA is silently skipped by today's Preview, so
an OTA-only delivery of (1) would have to be committed and published *before* this brief's
module lands — Nathan's call 4, recommended no (one build carries everything).

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-29. If a quoted
  line is not where the brief says, or a name/signature differs, **stop and report the
  mismatch verbatim** (file, what you expected, what you found). Never guess, never patch
  around it, never rule on it yourself. Brief 01 having landed or not is NOT an ambiguity: the
  affected anchors are written for both states.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `safe_to_delete/` is the bin.
- **No new npm dependency.** `requireOptionalNativeModule` (via `expo`), `react-native`'s
  `AppState`, `PermissionsAndroid`, `Platform` are already installed. Do not run `npm install`,
  `npx expo install`, `npx create-expo-module`, `npx expo prebuild`, or any `eas` command.
- **Files touched — exactly these, nothing else:**
  - NEW `app/modules/qualifire-ride-notification/expo-module.config.json`
  - NEW `app/modules/qualifire-ride-notification/android/build.gradle`
  - NEW `app/modules/qualifire-ride-notification/android/src/main/AndroidManifest.xml`
  - NEW `app/modules/qualifire-ride-notification/android/src/main/java/expo/modules/qualifireridenotification/QualifireRideNotificationModule.kt`
  - NEW (flame icons, copied byte-for-byte from `cycles/virgin-cycle18/assets-03/res/`, see 4b):
    `app/modules/qualifire-ride-notification/android/src/main/res/drawable-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/notification_icon.png`,
    `.../res/drawable-nodpi/qualifire_flame_large.png`, `.../res/raw/keep.xml`
  - NEW `app/src/location/rideNotificationPolicy.ts` (pure — no `expo`/`react-native` import)
  - NEW `app/src/location/rideNotification.ts` (runtime wrapper)
  - NEW `app/tests/ridenotification_suite.ts`
  - EDIT `app/src/location/index.ts` (header line, imports, one permission step, one
    module-scope block)
  - EDIT `app/tests/run.ts` (one import line)
- Do not touch `RecordScreen.tsx`, `liveView.tsx`, `engine.ts`, `settings.tsx`, `App.tsx`,
  `app.json`, `eas.json`, `app.config.js`, `package.json`, anything under `app/plugins/` or
  `app/modules/qualifire-lock-screen/`, any `scripts/*.ps1`, `STATE.md`, `OPEN-ITEMS.md`,
  `IDEAS.md`, this folder's `README.md`, `scripts/OTA-TROUBLESHOOTING.md`.
- **Do not create `app/android/`.** If any step of yours would need it, stop and report.

## Goal

After the next native build: from the first GPS fix of a ride until END/Discard, the
"Qualifire — recording ride" notification shows a live elapsed stopwatch in its header (same
zero as the in-app clock: `session.startedAtMs`), and, once the START gate of a matched way
has been crossed, `S1`/`S2`/… next to it, changing within ~1 s of each gate fire, screen on or
off, app in front or not, and surviving a process kill (the stopwatch keeps ticking on its own;
the label is re-asserted by the next fix after relaunch). Free rides and the stretch before
START show the stopwatch only. On Android 13+ the app now asks for notification permission at
START (once), so the notification is actually visible in the shade. JS-side, every install
that does NOT carry the new module (today's dev client, today's Preview) keeps working
unchanged: the wrapper no-ops.

## Current state (verified 2026-09-29 against the tree)

### `app/src/location/index.ts` (606 lines at HEAD; +~20 if brief 01 landed)

- Header doc comment lines 1-15; line 11 is
  ` *  - relaunch recovery via a persisted active-ride marker (./session).` and the block's
  closing line is ` */`. (Brief 01 inserts three ` *    ...` lines after line 11.)
- Line 16: `import { Vibration } from 'react-native';` — brief 01 turns this into
  `import { AppState, Vibration } from 'react-native';`.
- Line 24: `import { ActiveSession, saveSession, loadSession, clearSession } from './session';`
  (brief 01 inserts `import { setShowWhenLocked } from './lockScreen';` right after it).
- Line 61: `let session: ActiveSession | null = null;` — the module truth we key on.
- Lines 129-160 `ensureSession()`: on a fresh launch with a persisted ride, `session =
  await loadSession();` (line 132) runs **before** `liveEngine.start({ pickId: null, wayIds:
  session.wayIds ?? null });` (line 157) — so the engine's start emit already sees `session`.
- Lines 166-270 the task handler: `liveEngine.feed(...)` per fix inside `try { ... } catch {
  /* display-only */ }` (lines 253-257). The engine emits on every `feed`, `start`, `stop`,
  `finalize` (`engine.ts` lines 401, 411, 511, 612 → `emit()` line 945).
- Lines 280-293 `ensurePermissions()`: line 286 `const fg = await
  Location.requestForegroundPermissionsAsync();`, line 287 `if (!fg.granted) return 'denied';`,
  line 288 `  // Step 2: background ("Allow all the time"). On Android 11+ this sends the`.
  Called from `RecordScreen.tsx` lines 517 and 564 (the START flows).
- Lines 310-417 `startTracking()`: `session = s;` (line 372) precedes `liveEngine.start({`
  (line 386) — the start emit sees the session. The foreground-service options are lines
  355-360 (title/body/colour/killServiceOnDestroy) — **not edited**.
- Lines 446-470 `stopTracking()`: `stopLocationUpdatesAsync` (line 450) → `liveEngine.finalize()`
  (line 459, emits with `session` still set — the service is already gone, so the native call
  returns false; harmless) → `session = null;` (line 464) → `liveEngine.stop();` (line 466,
  emits with `session === null` → our state resets). Discard (`RecordScreen.tsx` line 819)
  goes through the same `stopTracking()`. **Not edited.**
- Lines 488-502: the gate-buzz subscriber, ending exactly with
  ```
    buzzedFires = st.gateFires;
  });
  ```
  (unique in the file). Our block goes right after it.

### `app/src/live/engine.ts`

- `LiveEngineState` (lines 270-292): `phase: 'idle' | 'detecting' | 'locked' | 'finished'`
  (271), `currentSector: number | null` (276, "1-based sector currently being ridden; null
  pre-start / post-finish"). `liveView.tsx` line 207-208 labels it `` `S${st.currentSector}` ``
  — the same format we use.
- `subscribe(fn: (s: LiveEngineState) => void): () => void` (line 656).

### expo-location native (read-only, never edited — `app/node_modules/expo-location/android/src/main/java/expo/modules/location/`)

- `services/LocationTaskService.kt`: id `mServiceId` (22, 146), `startForeground(serviceOptions)`
  (62-65), builder (69-111, `Notification.Builder(this, mChannelId)` line 71, `setColorized`
  78-82, `contentIntent` 84-90, `CATEGORY_SERVICE` 108), `stop()` = `stopForeground(true)`
  (50-53, removes the notification whatever we changed on it).
- `taskConsumers/LocationTaskConsumer.kt`: `maybeStartForegroundService` 176-237 (foreground
  guard 181-184; async post in `onServiceConnected` 218-224; re-post on re-registration 234-236).

### What does NOT exist

- No `app/modules/`, no `app/plugins/` (before brief 01). No `chronometer`, `subText`,
  `getActiveNotifications`, `POST_NOTIFICATIONS` under `app/src` (grep).
- `expo-modules-autolinking` 56 scans `./modules` (brief 01 § "What does NOT exist") — a second
  directory there is picked up the same way; each needs its own `expo-module.config.json`.
- `expo-modules-core` `AppContext.reactContext: Context?` (`android/src/main/java/expo/modules/
  kotlin/AppContext.kt` line 227). Kotlin argument types `Double` and `String?` are supported
  converters (`types/AnyTypeCache.kt` line 71 for `String?`).
- `react-native` 0.85 `PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS` exists
  (`Libraries/PermissionsAndroid/PermissionsAndroid.d.ts` line 118).
- `tests/lib.ts` exports `test`, `assert`, `loadJson`, `TESTS_DIR` (lines 16, 30, 34, 100);
  `tests/run.ts` line 56 `import './replay_drift_suite.ts';` — line 57 `import { runAll } from
  './lib.ts';` (brief 01 inserts `import './lockscreen_suite.ts';` between them).

## Decisions (pre-resolved — do not re-open)

1. **Update expo-location's own notification in place (option a).** Rejected (b) a second
   ongoing notification: two "Qualifire" rows in the shade, one of them the plain
   expo-location one that says nothing, plus a second channel; a mess for exactly the people
   who already ignore the first one. Rejected (c) owning the foreground service natively:
   forks expo-location's service/consumer wiring (task registration, `START_REDELIVER_INTENT`,
   binding) for a feature that only needs three builder calls. (a) keeps one notification,
   one channel, the launcher tap, brief 01's lock-screen tap path, and disappears with the
   service on END/Discard with no clear-up code.
2. **Chronometer for the timer, subText for the sector.** Zero per-second work; `when` =
   `session.startedAtMs` (the in-app clock's zero, `liveView.tsx` `realTimebase`, line 52) so
   both clocks agree. subText, not contentText, so the label sits *next to* the time in the
   header line — the tester's "at a glance" — and the body copy stays.
3. **Driven entirely by `liveEngine.subscribe` at module scope + a pure push policy.** The
   engine emits on every fix (1 Hz), on start/stop/finalize; a subscriber computes the desired
   `{whenMs, subText}` from `session` + state and asks the native side to apply it **only
   when it changed, or every 30th tick as a re-assert** (`REASSERT_EVERY_N_TICKS = 30` ≈ 30 s,
   same cadence as the session heartbeat). The native side is idempotent (reads the live
   notification's extras; if `when`, chronometer flag and subText already match it returns
   `true` without `notify()`), so a re-assert is one cheap read. This one mechanism covers:
   the first fix after START (the service posts asynchronously, so the START-time apply may
   find nothing → `false` → retried on the next tick); a headless relaunch (ensureSession →
   engine start emit → apply); the foreground cold start where expo-location re-posts its
   plain notification (re-asserted within ≤30 s, or within ~1 s via the `AppState` 'active'
   hook that forces the next tick); every sector change. After `MAX_CONSECUTIVE_MISSES = 10`
   failed applies in a row (e.g. no notification at all), retries drop to the 30-tick cadence.
4. **No per-fix native traffic beyond a boolean planner call.** The native `apply()` is only
   invoked when the planner says so; a ride of one hour at 1 Hz costs ~120 native reads and a
   handful of `notify()`s.
5. **Request `POST_NOTIFICATIONS` inside `ensurePermissions()`, between the foreground and
   background location steps, Android 13+ only, never blocking.** The result is ignored:
   recording must work whether or not the rider allows notifications (a denial only hides
   the notification from the shade, as today). Placed at START because that is when the
   rider is looking at the phone and understands why. The system dialog shows at most twice
   per install.
6. **Sibling local module `qualifire-ride-notification`, not an extension of 01's
   `qualifire-lock-screen`.** 01 pins its module to *exactly one* Kotlin class and to its own
   directory, and 01 may land before/after this brief in any order; a shared directory would
   make the two briefs collide on the same Kotlin file and the same pin test. Two tiny
   modules cost nothing at build time.
7. **Module name `QualifireRideNotification`, directory `qualifire-ride-notification`,
   Kotlin package `expo.modules.qualifireridenotification`.** The JS constant and the Kotlin
   `Name(...)` must match byte-for-byte; `tests/ridenotification_suite.ts` pins the pairing.
8. **Pure policy in its own file, wrapper separate.** `rideNotificationPolicy.ts` (label
   rule + push planner) imports nothing from `expo`/`react-native` so Node can test it;
   `rideNotification.ts` holds `requireOptionalNativeModule` and module state and is only
   read as text by the suite (see the brief-01 heads-up above).
9. **No Settings toggle.** The notification exists regardless (Android requires it for the
   service); a toggle could only remove the timer/sector from it, which nobody asked for. If
   Nathan wants one later it is a four-line addition to `settings.tsx` + one `setEnabled`
   in the wrapper (Nathan's call 2) — not in this brief.
10. **Label rules** (Nathan's call 1 for the post-finish word): `currentSector !== null` →
    `S<n>`; `phase === 'finished'` → `finished` (a nudge to press END — the very symptom the
    testers reported); everything else (free ride, detecting, locked but before START) →
    no subText (stopwatch only). `session === null` → nothing is pushed, planner state resets.
11. **Test = pure-policy tests + pinning suite.** The chronometer is SystemUI's; only a phone
    can show it (on-device checklist). What the headless suite can check: the label rule, the
    planner's change/retry/re-assert/back-off arithmetic, and that config, Kotlin, wrapper
    and index.ts cannot drift apart.

12. **Flame pictogram (amendment 2026-09-29, Nathan: "a flame for something live and hot").**
    Two slots, two assets, both generated from `marketing/assets/qualifire_flame_layered_night.svg`
    by `cycles/virgin-cycle18/assets-03/make_flame_icons.py` (already run; PNGs already in
    `assets-03/res/`; the executor does NOT regenerate them, only copies):
    - **Small icon** (status bar + shade header): Android renders it as a flat mask — only the
      alpha channel counts, colour is thrown away, and a coloured PNG would show as a white
      blob. So it is a **white flame silhouette with the core cut out as a transparent hole**
      (outer + core survive as outline + hole; the yellow middle layer cannot survive a
      one-colour mask). Delivered as the drawable **`notification_icon`** in five densities
      (24/36/48/72/96 px) — expo-location's `LocationTaskService.kt` (lines ~128-133, read-only)
      already looks up `drawable/notification_icon` by name and falls back to the launcher icon,
      and `recoverBuilder` keeps it. **Zero Kotlin, zero `app.json`, zero plugin.**
    - **Large icon** (shade, coloured): the full layered night flame on the `#17171b` night
      background, 256×256, `drawable-nodpi/qualifire_flame_large.png`, set by the module
      (`setLargeIcon`, 3 lines) so it appears next to the title/timer in the expanded shade.
    - The icons live in the **module's own** `res/` (Android library resources merge into the
      app; `getIdentifier(..., packageName)` finds them at runtime). `res/raw/keep.xml`
      (`tools:keep`) stops a resource-shrinking release build from stripping drawables that are
      only looked up by *name* at runtime.
    - **Accent colour stays `#e10600`** — expo-location colorizes the notification
      (`setColorized(true)`), so that colour is the *card background*, not a tint; the flame's
      yellow would flood the whole card. See Nathan's call 6.

## Files to touch

### 1. NEW `app/modules/qualifire-ride-notification/expo-module.config.json`

```json
{
  "platforms": ["android"],
  "android": {
    "modules": ["expo.modules.qualifireridenotification.QualifireRideNotificationModule"]
  }
}
```

### 2. NEW `app/modules/qualifire-ride-notification/android/build.gradle`

```gradle
plugins {
  id 'com.android.library'
  id 'expo-module-gradle-plugin'
}

group = 'com.nathanbonher.qualifire'
version = '0.1.0'

android {
  namespace "expo.modules.qualifireridenotification"
  defaultConfig {
    versionCode 1
    versionName '0.1.0'
  }
}
```

### 3. NEW `app/modules/qualifire-ride-notification/android/src/main/AndroidManifest.xml`

```xml
<manifest>
</manifest>
```

### 4. NEW `app/modules/qualifire-ride-notification/android/src/main/java/expo/modules/qualifireridenotification/QualifireRideNotificationModule.kt`

```kotlin
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
```

The file name, the class name and the last segment of `expo-module.config.json`'s
`android.modules` entry must all be `QualifireRideNotificationModule`; the package line must
equal the directory path under `java/`. (`` existing.`when` `` — backticks are required:
`when` is a Kotlin keyword and a Java field name on `Notification`.)

### 4b. NEW flame icon resources (copy, do not regenerate)

Source of truth: `cycles/virgin-cycle18/assets-03/res/` (produced by `make_flame_icons.py` from
the night-flame SVG; `flame_preview_NOT_SHIPPED.png` beside it is a look-at-me sheet, never
copied). From the repo root:

```bash
SRC=cycles/virgin-cycle18/assets-03/res
DST=app/modules/qualifire-ride-notification/android/src/main/res
for d in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  mkdir -p "$DST/drawable-$d" && cp "$SRC/drawable-$d/notification_icon.png" "$DST/drawable-$d/notification_icon.png"
done
mkdir -p "$DST/drawable-nodpi" && cp "$SRC/drawable-nodpi/qualifire_flame_large.png" "$DST/drawable-nodpi/qualifire_flame_large.png"
mkdir -p "$DST/raw"
```

then create `$DST/raw/keep.xml` with exactly:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources xmlns:tools="http://schemas.android.com/tools"
    tools:keep="@drawable/notification_icon,@drawable/qualifire_flame_large" />
```

If any source PNG is missing, **stop and report** (do not draw a substitute). Never add a
`notification_icon` anywhere else in the tree (a second one would be a duplicate-resource build
error).

### 5. NEW `app/src/location/rideNotificationPolicy.ts` (pure; Node-testable)

```ts
/**
 * Qualifire — virgin-cycle18 brief 03: what the ride notification should say,
 * and when to bother the native side. PURE — no expo / react-native import,
 * so tests/ridenotification_suite.ts can drive it under plain Node.
 *
 * The elapsed timer is a SystemUI chronometer anchored at `whenMs` (the
 * session's startedAtMs — the same zero as the in-app clock) and needs no
 * updates; only the header sub-text ("S2", "finished") changes, and only when
 * a gate fires. The planner below turns the engine's 1 Hz emits into a
 * handful of native calls: on change, plus one re-assert every
 * REASSERT_EVERY_N_TICKS ticks (expo-location re-posts its plain notification
 * on a foreground cold start, and the very first apply after START usually
 * runs before the service has posted anything — both heal on a later tick).
 * After MAX_CONSECUTIVE_MISSES failed applies in a row (no foreground-service
 * notification at all), retries fall back to the re-assert cadence.
 */

/** Must equal the Kotlin module's Name("...") — pinned by tests/ridenotification_suite.ts. */
export const RIDE_NOTIFICATION_MODULE_NAME = 'QualifireRideNotification';

/** Engine emits between forced applies (~1 Hz while fixes arrive → ~30 s). */
export const REASSERT_EVERY_N_TICKS = 30;
/** Consecutive `false` results after which only the re-assert cadence retries. */
export const MAX_CONSECUTIVE_MISSES = 10;

export interface RideNotificationDesired {
  /** chronometer zero — session.startedAtMs (epoch ms) */
  whenMs: number;
  /** header sub-text next to the running time; null = none (stopwatch only) */
  subText: string | null;
}

/** The two LiveEngineState fields the label rule reads (structural, so no engine import). */
export interface RideNotificationEngineView {
  phase: 'idle' | 'detecting' | 'locked' | 'finished';
  currentSector: number | null;
}

/** Label rule (brief 03 Decision 10). null = no session → push nothing. */
export function rideNotificationFor(
  startedAtMs: number | null,
  st: RideNotificationEngineView,
): RideNotificationDesired | null {
  if (startedAtMs === null) return null;
  let subText: string | null = null;
  if (st.phase === 'finished') subText = 'finished';
  else if (st.currentSector !== null) subText = `S${st.currentSector}`;
  return { whenMs: startedAtMs, subText };
}

export function sameDesired(a: RideNotificationDesired, b: RideNotificationDesired): boolean {
  return a.whenMs === b.whenMs && a.subText === b.subText;
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

### 6. NEW `app/src/location/rideNotification.ts` (runtime wrapper)

```ts
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
```

### 7. EDIT `app/src/location/index.ts` — five edits (A-E), top to bottom (anchor on TEXT)

**Edit A — header.** In the header doc comment (lines 1-15 at HEAD), find the bullet
` *  - relaunch recovery via a persisted active-ride marker (./session).`. If brief 01 has
landed, three ` *    ...` lines about "show-over-lock-screen" follow it; skip past them.
Immediately BEFORE the next line that is exactly ` *` (the blank comment line before
` * Storage (../storage) is the Backend Dev's module ...`), insert:

```
 *  - virgin-cycle18 brief 03 (2026-09-29): the foreground-service notification
 *    gets a SystemUI chronometer (zero = session.startedAtMs) + "S<n>" header
 *    sub-text, driven by a module-scope liveEngine.subscribe through
 *    ./rideNotification (no-op on installs without the native module);
 *    POST_NOTIFICATIONS is requested at START (Android 13+).
```

**Edit B — the `react-native` import.** The single line starting `import {` and ending
`} from 'react-native';` near the top (line 16 at HEAD) reads either
`import { Vibration } from 'react-native';` (01 not landed) or
`import { AppState, Vibration } from 'react-native';` (01 landed). Replace it so the braces
contain exactly the union, alphabetical:

```ts
import { AppState, PermissionsAndroid, Platform, Vibration } from 'react-native';
```

(If the line contains anything other than these names, stop and report.)

**Edit C — wrapper import.** Find
`import { ActiveSession, saveSession, loadSession, clearSession } from './session';`.
If the next line is `import { setShowWhenLocked } from './lockScreen';` (01 landed), insert
AFTER that; otherwise insert directly after the `./session` line:

```ts
import { pushRideNotification, forceRideNotificationReassert } from './rideNotification';
import { rideNotificationFor } from './rideNotificationPolicy';
```

**Edit D — notification permission.** Inside `export async function ensurePermissions()`,
the pair

```ts
  if (!fg.granted) return 'denied';
  // Step 2: background ("Allow all the time"). On Android 11+ this sends the
```

is unique in the file. Insert between the two lines:

```ts
  // virgin-cycle18 brief 03: POST_NOTIFICATIONS is a RUNTIME permission on
  // Android 13+ and nothing ever asked for it — without it the "recording
  // ride" notification (and its new timer/sector) never appears in the shade,
  // only in the OS task manager. Asked here, at START, once; the answer never
  // gates recording (a denial only hides the notification, as before).
  if (Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version >= 33) {
    try {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    } catch {
      /* never blocks recording */
    }
  }
```

**Edit E — the module-scope subscriber.** Find the end of the gate-buzz subscriber, the
two lines

```ts
  buzzedFires = st.gateFires;
});
```

(unique). Insert immediately AFTER them (blank line first):

```ts

// virgin-cycle18 brief 03 (testers via Nathan, 2026-09-29): keep the
// foreground-service notification's header showing a live elapsed stopwatch
// (SystemUI chronometer, zero = startedAtMs — no per-second work) and the
// current sector ("S2"; "finished" after the last gate). Subscribed at module
// scope for the same headless-relaunch reason as the buzz above: the task
// handler feeds the engine with the screen off, so a gate fire here reaches
// the notification within a tick. `session` is the module truth (set before
// liveEngine.start() in startTracking and ensureSession; null before
// liveEngine.stop() in stopTracking, which resets the planner). Everything
// after this line is display-only: the wrapper never throws, the policy is
// pure (rideNotificationPolicy.ts), and installs without the native module
// no-op.
liveEngine.subscribe((st) => {
  pushRideNotification(rideNotificationFor(session ? session.startedAtMs : null, st));
});
// A foreground cold start makes expo-location re-post its PLAIN notification
// over ours (LocationTaskConsumer.maybeStartForegroundService on task
// re-registration); force the next engine tick to re-apply instead of
// waiting for the 30-tick re-assert.
AppState.addEventListener('change', (next) => {
  if (next === 'active') forceRideNotificationReassert();
});
```

Nothing else in `index.ts` changes: `startTracking`'s foreground-service options, `stopTracking`,
the task handler and `getRecoveryState` are untouched (Decision 3 explains why they need not be).

### 8. NEW `app/tests/ridenotification_suite.ts`

```ts
/**
 * virgin-cycle18 brief 03 — ride-running notification. The chronometer is
 * SystemUI's and only a phone can show it; what a headless suite CAN pin:
 * the label rule, the push planner's arithmetic (change / retry / re-assert /
 * back-off), and that config, Kotlin, wrapper and index.ts cannot drift apart.
 * The runtime wrapper imports `expo` (which plain Node cannot load), so it is
 * read here as TEXT only; the policy file is pure and imported for real.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, loadJson, test, TESTS_DIR } from './lib.ts';
import {
  MAX_CONSECUTIVE_MISSES,
  REASSERT_EVERY_N_TICKS,
  RIDE_NOTIFICATION_MODULE_NAME,
  forceReassert,
  initialPushState,
  noteResult,
  planTick,
  rideNotificationFor,
  type PushState,
} from '../src/location/rideNotificationPolicy.ts';

const APP_DIR = path.resolve(TESTS_DIR, '..');
const T0 = 1_759_100_000_000;

test('ridenotif: label rule — no session pushes nothing', () => {
  assert(rideNotificationFor(null, { phase: 'locked', currentSector: 2 }) === null, 'null session → null');
});

test('ridenotif: label rule — stopwatch only before START, on free rides, while detecting', () => {
  for (const phase of ['idle', 'detecting', 'locked'] as const) {
    const d = rideNotificationFor(T0, { phase, currentSector: null });
    assert(d !== null && d.whenMs === T0 && d.subText === null, `${phase}: stopwatch only`);
  }
});

test('ridenotif: label rule — S<n> while a sector is being ridden, "finished" after the last gate', () => {
  const s1 = rideNotificationFor(T0, { phase: 'locked', currentSector: 1 });
  const s4 = rideNotificationFor(T0, { phase: 'locked', currentSector: 4 });
  const fin = rideNotificationFor(T0, { phase: 'finished', currentSector: null });
  assert(s1?.subText === 'S1' && s4?.subText === 'S4', 'S-label format matches liveView');
  assert(fin?.subText === 'finished', 'post-finish label');
  assert(s1?.whenMs === T0 && fin?.whenMs === T0, 'chronometer zero never moves');
});

test('ridenotif: planner — first tick calls, unchanged ticks do not, change calls again', () => {
  const a = { whenMs: T0, subText: null };
  let st = initialPushState();
  let p = planTick(st, a);
  assert(p.call, 'first desired → call');
  st = noteResult(p.state, a, true);
  for (let i = 0; i < REASSERT_EVERY_N_TICKS - 2; i++) {
    p = planTick(st, a);
    assert(!p.call, `unchanged tick ${i + 1} must not call`);
    st = p.state;
  }
  const b = { whenMs: T0, subText: 'S1' };
  p = planTick(st, b);
  assert(p.call, 'sector change → call');
  st = noteResult(p.state, b, true);
  assert(st.applied?.subText === 'S1' && st.ticksSinceCall === 0, 'applied recorded, ticks reset');
});

test('ridenotif: planner — a false result retries next tick; back-off after MAX misses; re-assert still fires', () => {
  const a = { whenMs: T0, subText: null };
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
  const a = { whenMs: T0, subText: 'S2' };
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
  const modDir = path.join(APP_DIR, 'modules', 'qualifire-ride-notification');
  const cfg = loadJson<{ platforms: string[]; android: { modules: string[] } }>(
    path.join(modDir, 'expo-module.config.json'),
  );
  assert(cfg.platforms.length === 1 && cfg.platforms[0] === 'android', 'android-only module');
  assert(cfg.android.modules.length === 1, 'exactly one Kotlin module class');
  const cls = cfg.android.modules[0];
  const ktPath = path.join(modDir, 'android', 'src', 'main', 'java', ...cls.split('.')) + '.kt';
  assert(fs.existsSync(ktPath), `Kotlin file missing at ${ktPath}`);
  const kt = fs.readFileSync(ktPath, 'utf8');
  assert(kt.includes(`Name("${RIDE_NOTIFICATION_MODULE_NAME}")`), 'Kotlin Name(...) must equal RIDE_NOTIFICATION_MODULE_NAME');
  assert(kt.includes('AsyncFunction("apply")'), 'Kotlin must expose apply');
  assert(kt.includes('setUsesChronometer(true)'), 'timer must be a SystemUI chronometer');
  assert(kt.includes('Notification.Builder.recoverBuilder('), 'must clone expo-location\'s notification, not build a second one');
  assert(kt.includes('Notification.FLAG_FOREGROUND_SERVICE'), 'must find the foreground-service notification by flag (id is not constant)');
  assert(kt.includes('setOnlyAlertOnce(true)'), 'updates must be silent');
  assert(!/notify\(\s*\d/.test(kt), 'never a hard-coded notification id');
  assert(fs.existsSync(path.join(modDir, 'android', 'build.gradle')), 'build.gradle missing');
  assert(kt.includes('qualifire_flame_large') && kt.includes('setLargeIcon('), 'flame large icon must be set by the module');
  const resDir = path.join(modDir, 'android', 'src', 'main', 'res');
  for (const d of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
    assert(fs.existsSync(path.join(resDir, `drawable-${d}`, 'notification_icon.png')), `flame small icon missing for ${d} (expo-location looks up drawable/notification_icon by name)`);
  }
  assert(fs.existsSync(path.join(resDir, 'drawable-nodpi', 'qualifire_flame_large.png')), 'flame large icon missing');
  assert(fs.existsSync(path.join(resDir, 'raw', 'keep.xml')), 'res/raw/keep.xml missing (shrinker would strip name-looked-up drawables)');
  assert(!fs.existsSync(path.join(modDir, 'ios')), 'no ios/ directory (Android-only app)');
});

test('ridenotif: wrapper + index.ts wiring', () => {
  const wrapper = fs.readFileSync(path.join(APP_DIR, 'src', 'location', 'rideNotification.ts'), 'utf8');
  assert(wrapper.includes("from 'expo'") && wrapper.includes('requireOptionalNativeModule<'), 'wrapper must use the optional require');
  assert(wrapper.includes('RIDE_NOTIFICATION_MODULE_NAME'), 'wrapper must require by the pinned name');
  const src = fs.readFileSync(path.join(APP_DIR, 'src', 'location', 'index.ts'), 'utf8');
  assert(src.includes("import { pushRideNotification, forceRideNotificationReassert } from './rideNotification';"), 'wrapper import missing');
  assert(src.includes('pushRideNotification(rideNotificationFor(session ? session.startedAtMs : null, st));'), 'subscriber must key on session.startedAtMs');
  assert((src.match(/liveEngine\.subscribe\(/g) ?? []).length === 2, 'expected exactly two module-scope liveEngine.subscribe( calls (buzz + notification)');
  assert(src.includes('PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS'), 'POST_NOTIFICATIONS runtime request missing');
  assert(src.includes("if (next === 'active') forceRideNotificationReassert();"), 'AppState active re-assert missing');
  const fgOpts = src.slice(src.indexOf('foregroundService: {'), src.indexOf('killServiceOnDestroy'));
  assert(fgOpts.includes("notificationTitle: 'Qualifire — recording ride'"), 'expo-location options must be untouched');
});
```

Note the `liveEngine.subscribe(` count: the gate buzz is the only existing one; after Edit E
there are exactly two. `subscribeEvents(` / `subscribeDiagnostics(` do not match the pattern.
If your count differs, the edit is wrong, not the test.

### 9. EDIT `app/tests/run.ts`

Find `import { runAll } from './lib.ts';`. Insert immediately BEFORE it (after
`import './replay_drift_suite.ts';`, or after `import './lockscreen_suite.ts';` if 01 landed):

```ts
import './ridenotification_suite.ts';
```

## Verification

From the repo root (`GIT_OPTIONAL_LOCKS=0` on every git call):

1. `cd app && node --experimental-strip-types tests/run.ts` → **zero FAIL**; the total rises by
   8 (the eight `ridenotif:` tests) and every previously passing test still passes.
2. `cd app && ./node_modules/.bin/tsc --noEmit` → clean, exit 0. (`Platform.Version` is typed
   `number | string`; the `typeof` guard in Edit D is what keeps this clean — do not remove it.)
3. `ls app/android` → must NOT exist. If it does, `mv app/android
   app/safe_to_delete/android_stray_$(date +%s)` and say so in the report.
4. `GIT_OPTIONAL_LOCKS=0 git status --short -- app` → exactly (ignoring 01's files if it
   landed uncommitted, and anything outside `app/`): `M app/src/location/index.ts`,
   `M app/tests/run.ts`, `?? app/modules/` (or the sub-path if `app/modules/` already
   exists), `?? app/src/location/rideNotification.ts`,
   `?? app/src/location/rideNotificationPolicy.ts`, `?? app/tests/ridenotification_suite.ts`.
   **`app/app.json` must NOT appear** from this brief.
5. `grep -rn "rideNotification\|POST_NOTIFICATIONS" app/src` → hits only in
   `location/index.ts`, `location/rideNotification.ts`, `location/rideNotificationPolicy.ts`.
   `grep -rn "rideNotification" app/src/ui` → **no hits** (no UI was touched).
6. Flame icons are exact copies: `for d in mdpi hdpi xhdpi xxhdpi xxxhdpi; do cmp cycles/virgin-cycle18/assets-03/res/drawable-$d/notification_icon.png app/modules/qualifire-ride-notification/android/src/main/res/drawable-$d/notification_icon.png; done`
   and the same `cmp` for `drawable-nodpi/qualifire_flame_large.png` → no output. `grep -rn "notification_icon" app --include=*.png -l --exclude-dir=node_modules` shows only the five module copies.
7. Optional, read-only, not a stop if it fails for environment reasons:
   `cd app && npx expo-modules-autolinking search --platform android 2>/dev/null | grep -c qualifire-ride-notification`
   → ≥ 1 (autolinking sees the module). Report the outcome either way.

## Stop conditions (report verbatim, do nothing else)

- Any anchor text in § 7 absent or present more than once.
- `react-native` import line containing a name other than `AppState`, `PermissionsAndroid`,
  `Platform`, `Vibration`.
- `tsc` complaining about `PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS`,
  `requireOptionalNativeModule`, or `Platform.Version`.
- Any test outside the eight new ones changing from PASS to FAIL.
- Anything that would require editing a file outside the "Files touched" list.

## What Nathan must run (after the executor + Inspect land, and it is committed)

Native change ⇒ **new APK**; `publish-preview.ps1` cannot carry it (fingerprint moves —
`scripts/OTA-TROUBLESHOOTING.md`). Identical procedure to brief 01 § "What Nathan must run";
**run it once, after both 01 and 03 have landed** (or after 03 alone if 01 is still parked).
Keystore prompt: **reuse** the existing one.

```powershell
# 1. preflight only (installs nothing, spends nothing)
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\build7.ps1" -DryRun

# 2. the build (~10-20 min on EAS; one of the monthly Android build slots)
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\build7.ps1"

# 3. afterwards: note the NEW fingerprint (build page, or this) into scripts\OTA-TROUBLESHOOTING.md + STATE.md
powershell -ExecutionPolicy Bypass -Command "cd 'C:\Users\natha\Claude personal projects\Qualifire\app'; npx eas-cli build:list --limit 3 --platform android"
```

Optional, only if Fast Refresh should also carry the module (otherwise the dev client keeps
working with the wrapper no-op'ing):

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\build4.ps1" -BuildProfile development
```

Install the new Preview APK over the existing one (data kept, same package id). If the EAS
build fails inside `qualifire-ride-notification`, the Kotlin file and `build.gradle` are the
only two suspects; the log names which.

## On-device checklist (Nathan, after the new build is installed)

1. **Permission prompt.** Fresh install (or after "Clear data"): RECORD → START → after the
   location prompt, Android asks "Allow Qualifire to send you notifications?" → Allow. (On a
   phone where notifications were already allowed by hand, no prompt — fine.)
2. **The stopwatch.** Ride started, pull down the shade: the "Qualifire — recording ride" row's
   header shows a running `m:ss` that matches the in-app clock to the second. Lock the phone,
   wait a minute, look at the lock screen: still counting. It should appear within ~2 s of
   START (first fix), not necessarily at the instant of START.
3. **The sector.** On a known way, cross the START gate: within ~1 s the header reads
   `Qualifire · S1 · 0:xx`; each gate advances it (S2, S3 …); after the FINISH gate:
   `finished`. Screen off during a gate crossing → check afterwards that it advanced anyway.
4. **Free ride / before START.** No `S` label, only the stopwatch. No "undefined", no "S0".
5. **Cold start mid-ride.** Ride running → swipe the app away → reopen it → the notification
   may briefly show the plain header (expo-location re-posts it) → within ~1-2 s of the app
   being in front (next fix) the stopwatch and sector are back, still counting from START.
6. **Process kill mid-ride, screen off.** Same as 5 but do not reopen the app: the stopwatch
   keeps ticking on its own (SystemUI); once the OS relaunches the task headlessly the sector
   label updates again at the next gate. If the label stays stale until the app is opened,
   that is a finding for OPEN-ITEMS, not a reason to change the mechanism.
7. **END / Discard.** Both remove the notification entirely (service stops). Starting a new
   ride shows a fresh stopwatch from 0:00.
8. **Flame icons.** Status bar: a small white flame with a hole for the core (not a solid blob,
   not the launcher icon). Pull the shade: the layered yellow/white flame on the dark square
   sits at the left of the row. If the status-bar icon is a plain square/blob or the launcher
   icon, `notification_icon` was not picked up (resource shrinker / merge problem) → finding
   for OPEN-ITEMS, the timer and sector are unaffected.
9. **Old install sanity (optional, before installing the new APK):** nothing changes on
   today's Preview even after an OTA — the wrapper no-ops.

## Out of scope / NOT in this brief (follow-ups, each its own idea if Nathan wants it)

- **Long-ride reminder** — the root need behind "forgot it was running": after N hours (or
  after M minutes standing still with no gate activity) a buzz + a heads-up notification
  "Still recording — 2 h 10. Tap to open." Needs a timer that survives headless (a fix-count /
  wall-clock check inside the task handler would do) and a second, non-ongoing notification →
  its own brief; combine with brief 01's notification-tap-over-lock-screen path.
- **A STOP action button in the notification** (brief 01 Decision 6 / Open question 4) —
  needs a broadcast receiver that can reach JS `stopTracking()` headlessly; bigger native piece.
- **Auto-stop on prolonged stillness**; changing the body copy; a Settings toggle
  (Nathan's call 2); any change to `RecordScreen`, the running screen, PAUSE/RESUME/END.
- iOS (no iOS build; `platforms: ["android"]`).
- `STATE.md`, `OPEN-ITEMS.md`, this folder's `README.md`, `scripts/*`,
  `scripts/OTA-TROUBLESHOOTING.md` (fingerprint note is post-build bookkeeping).

## What this changes on Nathan's phone

**Nothing, until a new APK is built and installed** — this is a parked brief, and even once
executed and committed it is a native change: `publish-preview.ps1` will NOT deliver it (the
fingerprint changes; an OTA published from this tree is silently skipped by the current
Preview, which keeps its current JS). Nothing about this brief is verifiable — not the
stopwatch, not the sector label, not even the permission prompt — until `build7.ps1` has run
and the new Preview is installed. After that: the existing "Qualifire — recording ride"
notification gains a live elapsed stopwatch in its header and an `S<n>` label that follows the
ride's current sector (`finished` after the last gate), a small white **flame** in the status bar and shade header, and the full-colour layered flame beside the title when the shade is pulled down; on Android 13+ the app asks for
notification permission once, at START, so the notification is actually visible in the shade
and on the lock screen. The running screen itself looks exactly as today — nothing was
redesigned. The dev client (Fast Refresh) does not get any of this until `build4.ps1
-BuildProfile development` is run too; until then the wrapper silently no-ops there.

## Nathan's call (recommended defaults chosen; not blocking)

1. **Word after the FINISH gate.** Chosen: `finished` (a nudge to press END). Alternatives:
   no label (stopwatch only), or `done`. One-string change in `rideNotificationFor` + its test.
2. **Settings toggle "Timer in notification".** Chosen: none (Decision 9). If wanted: one
   `setRideNotificationEnabled(on)` in the wrapper (planner skipped when off) + the usual four
   `settings.tsx` lines (type, default `true`, effect, `<Row>` + `<Switch>` next to "Gate
   buzz"); OTA-able on its own.
3. **Body copy.** Chosen: keep "GPS tracking is active until you press Stop." Alternative,
   OTA-able, one string in `startTracking`: "Tap to open · PAUSE then END to stop."
4. **Ship the permission prompt by OTA first?** Chosen: no — commit and build once. If Nathan
   wants testers to see the plain notification *before* the rebuild, Edits B (Platform,
   PermissionsAndroid only) + D must be committed and `publish-preview.ps1` run BEFORE
   `app/modules/` is added to the tree (the module changes the fingerprint and kills the OTA).
5. **Label before the START gate on a known way.** Chosen: none. Alternative: `to start`
   while `phase === 'locked'` and `currentSector === null` and no lap yet — needs one more
   engine field in the view (`lap`), a 3-line policy change.

6. **Accent colour of the notification card (flame amendment).** Chosen: keep `#e10600`.
   expo-location colorizes the notification, so this colour is the whole card background; the
   flame palette is black / yellow / off-white, and yellow `#F5C542` would make a bright yellow
   card (SystemUI picks the text colour for contrast). The calmer on-brand option is the night
   flame background `#17171b` (dark card, white flame, flame large icon blends in). OTA-able,
   independent of everything else: change `notificationColor` in `startTracking`
   (`app/src/location/index.ts`, expo-location options) — the pin test only checks the title
   line, so no test changes. Try the build with red first; switch only if you dislike it.

## Open questions / assumptions (logged, not blocking)

1. **Assumption:** `NotificationManager.notify()` from the app process with the foreground
   service's own id/tag updates that notification in place and the system keeps its
   ongoing/foreground flags (this is the documented "update the notification with the same
   id" path; the id is read from `getActiveNotifications()`, never assumed). Checklist item 2
   is the proof. If an OEM shows a second row instead, that is a finding for OPEN-ITEMS.
2. **Assumption:** on Android 13+ without notification permission, `getActiveNotifications()`
   still lists the foreground-service notification (it is posted; the shade just hides it).
   If it does not, `apply()` returns false and the planner backs off — no cost, no crash.
3. **Assumption:** `expo-module-gradle-plugin` resolves for a second local module exactly as
   for brief 01's (same shape, no dependencies). Verified in `expo-modules-autolinking` 56
   source (scans `./modules`), not yet in an EAS build.
4. `Notification.Builder.recoverBuilder` is API 24; Expo 56's minSdk is 24, so the runtime
   guard is belt-and-braces. Colorized foreground notifications (expo-location sets
   `setColorized(true)` with `#e10600`) render the chronometer in the header like any other;
   if an OEM skin drops the sub-text on colorized rows, fallback is to move the label into
   `setContentText` (one Kotlin line) — a finding for OPEN-ITEMS, not a redesign.
5. **Assumption (flame amendment):** a library module's `res/drawable*/notification_icon.png`
   is merged into the app and `getIdentifier("notification_icon", "drawable", packageName)`
   (expo-location `LocationTaskService.kt` ~:133) finds it. `res/raw/keep.xml` guards against
   the shrinker. Not proven until a build is installed (checklist item 8). If it does not take,
   the fallback is a 15-line local config plugin copying the same PNGs into
   `android/app/src/main/res` — a follow-up, not a redesign.
6. **Legibility:** the 24 px status-bar silhouette is a simple flame with a small core hole;
   if it looks mushy on the phone, the fix is an art tweak in `make_flame_icons.py` (thicker
   core opening or drop the core hole), then re-copy — no code change.
