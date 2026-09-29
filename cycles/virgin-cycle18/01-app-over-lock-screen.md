# 01 — Show the recording screen over the lock screen (press power, see the ride, press END)

**Source: a real tester, relayed by Nathan 2026-09-29, approved as cycle18 idea #1.** Tester's
words: "could the app be shown before the lock screen; apps like Google Maps or Strava can show
the app just by pressing the power button, without unlocking the phone." Motivation: stop the
ride quickly on arrival at work without unlocking.

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-29 by the Plan tier
(Fable) from a Haiku digest plus anchor checks against the working tree (branch `virgin`, HEAD
`e418dec`). Executor: Sonnet, cold, this file only. **This brief changes the native surface
(one manifest attribute + one local Kotlin module). It is NOT OTA-able: nothing here reaches any
phone until Nathan runs a new EAS build (§ "What Nathan must run"). The executor's job ends at
green tests, clean tsc, and a clean `npx expo config --type introspect`; it never builds.**

## What Android actually does (the honest version, for Nathan)

- **No app is launched by the power button.** Not Maps, not Strava. What those apps do: their
  ride/navigation activity carries the `showWhenLocked` flag, so when it was the app in front
  at the moment the screen went off, the next power press wakes the phone *onto that activity*,
  drawn on top of the keyguard — no PIN, no swipe. That is the whole trick, and it is available
  to any app since Android 8.1 (`android:showWhenLocked` on the activity, or
  `Activity.setShowWhenLocked(boolean)` at runtime).
- **Condition that must hold:** Qualifire was the foreground app when the screen locked (power
  press or timeout while on Qualifire). If the rider switched to another app or pressed home
  before locking, the next wake shows the normal lock screen; from there the ongoing
  "Qualifire — recording ride" notification is the way in (see next point).
- **Notification tap while locked:** expo-location's foreground-service notification already
  opens the app on tap (`LocationTaskService.kt` sets a `contentIntent` to the launcher
  activity — `node_modules/expo-location/android/.../services/LocationTaskService.kt` lines
  84-89; it supports NO action buttons, only a title/body/colour — so a "STOP" button *in* the
  notification is not available without forking that service; ruled out, see Decisions). With
  the manifest flag from this brief, AOSP's SystemUI launches a showWhenLocked target from a
  lock-screen notification without the unlock prompt. **Expected, not yet seen on a phone —
  on-device check 4 below.**
- **The keyguard is never dismissed.** Home/back from the over-lock screen lands on the lock
  screen; the phone stays as locked as it was. Nothing here unlocks anything (item (e) of the
  ask — not requested, not done).
- **Touch is live over the lock screen.** The running screen's existing guard is the two-step
  PAUSE → END (`RecordScreen.tsx` lines 1362-1385: END only exists after PAUSE opened the
  menu) and Discard's `Alert` confirm (`onDiscard`, line 819). No new hold-to-confirm is added —
  see Decision 5.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-29. If a quoted
  line is not where the brief says, or a name/signature differs, **stop and report the
  mismatch verbatim** (file, line, what you expected, what you found). Never guess, never
  patch around it, never rule on it yourself.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `safe_to_delete/` is the bin.
- **No new npm dependency.** `expo/config-plugins` (via `expo`), `requireOptionalNativeModule`
  (via `expo`) and `react-native`'s `AppState` are all already installed. Do not run
  `npm install`, `npx expo install`, `npx create-expo-module`, `npx expo prebuild`, or any
  `eas` command. The one `npx expo config --type introspect` in Verification is read-only.
- **Files touched — exactly these, nothing else:**
  - NEW `app/plugins/withShowWhenLocked.js`
  - NEW `app/modules/qualifire-lock-screen/expo-module.config.json`
  - NEW `app/modules/qualifire-lock-screen/android/build.gradle`
  - NEW `app/modules/qualifire-lock-screen/android/src/main/AndroidManifest.xml`
  - NEW `app/modules/qualifire-lock-screen/android/src/main/java/expo/modules/qualifirelockscreen/QualifireLockScreenModule.kt`
  - NEW `app/src/location/lockScreenPolicy.ts` (pure — no `expo`/`react-native` import)
  - NEW `app/src/location/lockScreen.ts`
  - NEW `app/tests/lockscreen_suite.ts`
  - EDIT `app/app.json` (one plugin entry)
  - EDIT `app/src/location/index.ts` (imports, one helper, three call sites, one header line)
  - EDIT `app/tests/run.ts` (one import line)
- Do not touch `RecordScreen.tsx`, `App.tsx`, `eas.json`, `app.config.js`, `package.json`,
  any `scripts/*.ps1`, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, this folder's `README.md`, or
  `scripts/OTA-TROUBLESHOOTING.md` (the fingerprint note there is written AFTER the build, by
  whoever runs it — not by this brief).
- **Do not create `app/android/`.** If any step of yours would need it, stop and report.
- **The test suite runs under plain Node (`--experimental-strip-types`), which CANNOT load
  `expo` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` — verified 2026-09-29).** So the test
  imports ONLY `lockScreenPolicy.ts` (pure) and reads `lockScreen.ts` as text; never import
  `lockScreen.ts` or `location/index.ts` from any test.

## Goal

After the next native build: while a ride is recording and Qualifire was the app in front
when the screen locked, pressing the power button shows the live recording screen on top of
the lock screen; PAUSE → END works there; the ending screen (tower, naming card, ride detail)
stays visible until the rider presses home/back, which lands on the normal lock screen. When no
ride is recording, locking the phone behaves exactly as today (lock screen, never Qualifire).
JS-side, the app keeps working unchanged on every install that does NOT carry the new native
module (today's dev client, today's Preview): the wrapper no-ops.

## Current state (verified 2026-09-29 against the tree)

### `app/app.json`

- Line 30: `    "plugins": [` — line 42: `      "@maplibre/maplibre-react-native"` — line 43:
  `    ],`. Four plugins: expo-location (object form, lines 31-39), expo-status-bar,
  expo-audio, MapLibre. `scripts/build4.ps1` lines 150-156 only checks that these four are
  PRESENT; a fifth entry does not trip it.
- Line 8: `"platforms": ["android"]` spans lines 9-11 — Android only; no iOS anything here.

### `app/src/location/index.ts` (606 lines)

- Lines 1-15: header doc comment; line 11 reads
  ` *  - relaunch recovery via a persisted active-ride marker (./session).` and line 12 is
  ` *`.
- Line 16: `import { Vibration } from 'react-native';`
- Line 24: `import { ActiveSession, saveSession, loadSession, clearSession } from './session';`
- Line 61: `let session: ActiveSession | null = null;` — the module-level truth this brief keys
  on.
- Lines 129-160: `async function ensureSession()`; line 157 is
  `      liveEngine.start({ pickId: null, wayIds: session.wayIds ?? null });` inside the
  `if (session && !engineArmedThisLaunch)` block. **Not edited** (a headless relaunch has no
  activity to flag; the UI path below covers the restore).
- Lines 310-417: `export async function startTracking(...)`. Line 372: `  session = s;` — line
  373: `  sessionLoaded = true;`.
- Lines 446-470: `export async function stopTracking()`. Line 464: `  session = null;`. **Not
  edited** — Decision 3 explains why the flag must NOT drop here.
- Lines 584-606: `export async function getRecoveryState()`. Line 589:
  `  const s = await ensureSession();` — line 590: `  if (!s) return null;`.
- `RecordScreen.tsx` line 375 calls `getRecoveryState()` from its mount effect; RECORD is the
  boot tab (`App.tsx` line 62: `useState<Tab>('record')`), so this runs on every cold start.

### What does NOT exist

- No `app/plugins/`, no `app/modules/` (verified `ls`). No `showWhenLocked` / `keyguard` /
  `turnScreenOn` anywhere under `app/src`, `app/app.json`, `app/app.config.js`.
- `expo-modules-autolinking` (56.x) scans `./modules` at the app root by default
  (`node_modules/expo-modules-autolinking/build/commands/autolinkingOptions.js` line 172:
  `resolvePathMaybe('./modules', appRoot)`), and a module directory needs NO `package.json`
  (`build/dependencies/scanning.js` lines 13-40: falls back to the directory name) — only an
  `expo-module.config.json` (`build/ExpoModuleConfig.js` line 176).
- `expo` re-exports `requireOptionalNativeModule` (`node_modules/expo/build/Expo.d.ts` line 5;
  signature `requireOptionalNativeModule<T>(name: string): T | null`).
- `@expo/config-plugins` 56.0.14 exports `AndroidConfig.Manifest.getMainActivityOrThrow`
  (`build/android/Manifest.d.ts` line 157).
- `expo-modules-core` `AppContext.currentActivity: Activity?` (`android/src/main/java/expo/
  modules/kotlin/AppContext.kt` line 402).
- `app/tsconfig.json` extends `expo/tsconfig.base` (`allowJs: true`, no `checkJs`) — the new
  `.js` plugin is parsed but not type-checked by `tsc --noEmit`; the new `.ts` files are.
- `.gitignore` (repo root) ignores `app/android/` only — `app/modules/**/android/` is tracked.

**Amended 2026-09-29 (same day, after brief 03's planner caught it):** the test must never import
`lockScreen.ts` — `expo` cannot load under Node's strip-types runner. The constant now lives in
pure `lockScreenPolicy.ts`; see § 7a/7b and the executor rule above.

## Decisions (pre-resolved — do not re-open)

1. **Two native pieces, both tiny, both required.** (a) Manifest attribute
   `android:showWhenLocked="true"` on `.MainActivity` via a local config plugin — this is what
   SystemUI reads when a lock-screen notification is tapped (it checks the manifest's
   `ActivityInfo` flag, not the runtime one), and it is what the activity starts with on a
   cold start from that tap. (b) A local Expo module exposing
   `setShowWhenLocked(enabled)` → `Activity.setShowWhenLocked` so the flag is ON only while
   a ride is recording. Manifest-only ("always on") was rejected: any screen Nathan happened
   to lock the phone on (RESULTS, ride detail, settings) would come back over the keyguard on
   every wake, with live touch, forever. Module-only was rejected: the notification-tap path
   after a process kill would still demand an unlock.
2. **Rule for the runtime flag: ON when a session exists, re-synced on every AppState change
   and on every RECORD-tab mount; never touched by `stopTracking()`.** One helper,
   `syncShowWhenLocked()` = `setShowWhenLocked(session != null)`, called from three places:
   the end of `startTracking` (ride just started, activity is in front), `getRecoveryState`
   (boot / remount with or without a restored ride — this is also what turns the manifest's
   default ON back OFF on an ordinary cold start), and a module-scope
   `AppState.addEventListener('change', ...)` (background/foreground transitions).
3. **Why `stopTracking()` does not flip it OFF.** The tester's whole scenario ends with END
   pressed *over the lock screen*. If the flag dropped in the same tick, the keyguard would
   re-assert and rip the ending screen (tower / naming card / ride detail) away from the rider
   mid-look. So the flag stays ON until the next AppState change: the rider presses home or
   locks the phone → `background` → `session == null` → OFF → the next wake shows the lock
   screen, not Qualifire. On an unlocked phone the same rule is invisible (locking is a
   `background` transition too).
4. **`turnScreenOn` is NOT set.** The power button already turns the screen on; `turnScreenOn`
   is for activities that launch while the screen is off (calls, alarms). Not asked, adds
   nothing, could light the phone in a pocket on a headless relaunch.
5. **No lock-safe view, no hold-to-END, in this brief.** Strava and Maps show their full
   screens (map included) over the keyguard; the phone is in the rider's hand; the running
   screen already needs PAUSE then END (two deliberate taps, `RecordScreen.tsx` 1362-1385) and
   Discard confirms via `Alert` (line 819). Flagged as **Nathan's call 1** — a follow-up
   brief, not a reason to widen this one.
6. **No notification action button.** expo-location's service builds a fixed notification
   (title/body/colour, `contentIntent` = launcher; `LocationTaskService.kt` 69-111) with no
   `addAction`; adding one means forking the service or a second notification via
   `expo-notifications` (new dependency + a broadcast receiver that can reach the JS
   `stopTracking` — a headless bridge this app does not have). Out of scope; noted under
   Open questions.
7. **The JS wrapper is optional-module safe.** `requireOptionalNativeModule` returns `null` on
   every install built before this brief (today's dev client, today's Preview APK) and the
   wrapper then returns `false` without throwing. This is what keeps `publish-preview.ps1`
   harmless if it is ever run before the rebuild — the OTA would be silently skipped anyway
   (fingerprint mismatch), but even if it applied, nothing would break.
8. **Module name `QualifireLockScreen`, directory `qualifire-lock-screen`, Kotlin package
   `expo.modules.qualifirelockscreen`.** The JS string and the Kotlin `Name(...)` must match
   byte-for-byte; the string lives in pure `lockScreenPolicy.ts` (Node-loadable), the wrapper
   imports it from there, and `tests/lockscreen_suite.ts` pins the pairing (test → policy file →
   Kotlin text) so it cannot drift silently.
9. **Test = the pinning suite (files exist, names agree, plugin is wired, plugin's pure
   function sets the attribute idempotently).** The runtime behaviour is native and only a
   phone can check it (on-device checklist). This is the checkable artifact rule 3 of
   `CLAUDE.md` asks for, applied to what a headless suite can actually reach.

## Files to touch

### 1. NEW `app/plugins/withShowWhenLocked.js`

Create with exactly this content:

```js
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
```

### 2. EDIT `app/app.json` — register the plugin

Read lines 30-43. Line 42 must be `      "@maplibre/maplibre-react-native"` and line 43
`    ],`. Replace line 42 with these two lines:

```json
      "@maplibre/maplibre-react-native",
      "./plugins/withShowWhenLocked.js"
```

(Trailing comma added to the MapLibre line; the new entry is the last element; line 43 `    ],`
unchanged.) Nothing else in `app.json` changes — permissions, package, runtimeVersion,
updates.url all stay byte-for-byte.

### 3. NEW `app/modules/qualifire-lock-screen/expo-module.config.json`

```json
{
  "platforms": ["android"],
  "android": {
    "modules": ["expo.modules.qualifirelockscreen.QualifireLockScreenModule"]
  }
}
```

### 4. NEW `app/modules/qualifire-lock-screen/android/build.gradle`

```gradle
plugins {
  id 'com.android.library'
  id 'expo-module-gradle-plugin'
}

group = 'com.nathanbonher.qualifire'
version = '0.1.0'

android {
  namespace "expo.modules.qualifirelockscreen"
  defaultConfig {
    versionCode 1
    versionName '0.1.0'
  }
}
```

(Same shape as `node_modules/expo-status-bar/android/build.gradle` minus its two
dependencies — this module needs none.)

### 5. NEW `app/modules/qualifire-lock-screen/android/src/main/AndroidManifest.xml`

```xml
<manifest>
</manifest>
```

### 6. NEW `app/modules/qualifire-lock-screen/android/src/main/java/expo/modules/qualifirelockscreen/QualifireLockScreenModule.kt`

```kotlin
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
```

The file name, the class name and the last segment of `expo-module.config.json`'s
`android.modules` entry must all be `QualifireLockScreenModule`; the package line must equal
the directory path under `java/`.

### 7a. NEW `app/src/location/lockScreenPolicy.ts` (pure; Node-testable)

```ts
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
```

### 7b. NEW `app/src/location/lockScreen.ts` (wrapper; imports `expo`; never imported by a test)

```ts
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
```

### 8. EDIT `app/src/location/index.ts` — five edits, top to bottom

**Edit A — header, after line 11.** Line 11 is
` *  - relaunch recovery via a persisted active-ride marker (./session).` and line 12 is ` *`.
Insert between them:

```
 *  - virgin-cycle18 brief 01 (2026-09-29): show-over-lock-screen flag ON while
 *    a session exists, re-synced on AppState changes and RECORD mounts, never
 *    dropped by stopTracking itself (see syncShowWhenLocked).
```

**Edit B — line 16.** Replace

```ts
import { Vibration } from 'react-native';
```

with

```ts
import { AppState, Vibration } from 'react-native';
```

**Edit C — after line 24** (`import { ActiveSession, saveSession, loadSession, clearSession } from './session';`), insert these two lines:

```ts
import { setShowWhenLocked } from './lockScreen';
import { showWhenLockedFor } from './lockScreenPolicy';
```

**Edit D — the helper + listener.** Find (after Edit A-C the numbers shift by +4; anchor on
text) the line `const listeners = new Set<(s: TrackerStatus) => void>();` (originally line
111). Insert immediately BEFORE it:

```ts
// virgin-cycle18 brief 01 (tester via Nathan, 2026-09-29): MainActivity may sit
// on top of the keyguard ONLY while a ride is recording — then the power
// button wakes the phone onto the live screen (no unlock) and PAUSE → END
// works there. Keyed on `session` (the module truth), re-synced at every
// AppState change and every getRecoveryState() (RECORD-tab mount, incl. cold
// start — which is also what turns the manifest's static ON default OFF for
// an idle app). Deliberately NOT called from stopTracking(): END is pressed
// over the lock screen in exactly the tester's scenario, and dropping the
// flag in that tick would let the keyguard re-cover the ending screen. The
// next AppState change (home / power) drops it instead. lockScreen.ts no-ops
// on any install without the native module.
function syncShowWhenLocked(): void {
  void setShowWhenLocked(showWhenLockedFor(session != null));
}
AppState.addEventListener('change', syncShowWhenLocked);

```

(Blank line after the listener, then the untouched `const listeners = ...` line. The listener
passes the function itself — AppState's callback argument is ignored by it.)

**Edit E — startTracking.** Anchor: the pair

```ts
  session = s;
  sessionLoaded = true;
```

inside `startTracking` (originally lines 372-373; it is the ONLY place in the file where
`session = s;` is directly followed by `sessionLoaded = true;` — `stopTracking` has
`session = null;` there). Insert between them:

```ts
  syncShowWhenLocked();
```

Result:

```ts
  session = s;
  syncShowWhenLocked();
  sessionLoaded = true;
```

**Edit F — getRecoveryState.** Anchor: inside `export async function getRecoveryState()`, the pair

```ts
  const s = await ensureSession();
  if (!s) return null;
```

(originally lines 589-590; `stopTracking` also has `const s = await ensureSession();` but
followed by `try {`, not by `if (!s) return null;`). Insert between them:

```ts
  syncShowWhenLocked();
```

so the OFF sync runs on an idle cold start too (before the early return).

### 9. NEW `app/tests/lockscreen_suite.ts`

```ts
/**
 * virgin-cycle18 brief 01 — show-over-lock-screen wiring pin. The behaviour is
 * native (Activity.setShowWhenLocked) and only a phone can exercise it; what
 * a headless suite CAN check is that the three halves cannot drift apart:
 * the config plugin is registered and sets the manifest attribute, the local
 * Expo module exists under the name the JS wrapper asks for, and the Kotlin
 * side exposes the one function the wrapper calls.
 */
import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, loadJson, test, TESTS_DIR } from './lib.ts';
// ONLY the pure policy file — lockScreen.ts imports `expo`, which Node cannot load here.
import { LOCK_SCREEN_MODULE_NAME, showWhenLockedFor } from '../src/location/lockScreenPolicy.ts';

const APP_DIR = path.resolve(TESTS_DIR, '..');
const require = createRequire(import.meta.url);

test('lockscreen: app.json registers the local showWhenLocked plugin', () => {
  const appJson = loadJson<{ expo: { plugins: unknown[] } }>(path.join(APP_DIR, 'app.json'));
  const names = appJson.expo.plugins.map((p) => (Array.isArray(p) ? p[0] : p));
  assert(names.includes('./plugins/withShowWhenLocked.js'), 'plugin entry missing from app.json');
  assert(fs.existsSync(path.join(APP_DIR, 'plugins', 'withShowWhenLocked.js')), 'plugin file missing');
});

test('lockscreen: plugin sets android:showWhenLocked="true" on an activity node, idempotently', () => {
  const { applyShowWhenLocked } = require('../plugins/withShowWhenLocked.js');
  const activity: { $: Record<string, string> } = { $: { 'android:name': '.MainActivity' } };
  applyShowWhenLocked(activity);
  assert(activity.$['android:showWhenLocked'] === 'true', 'attribute not set');
  assert(activity.$['android:name'] === '.MainActivity', 'other attributes must survive');
  applyShowWhenLocked(activity);
  assert(Object.keys(activity.$).length === 2, 'second application must not add keys');
});

test('lockscreen: local Expo module directory, config and Kotlin class agree with the JS name', () => {
  const modDir = path.join(APP_DIR, 'modules', 'qualifire-lock-screen');
  const cfg = loadJson<{ platforms: string[]; android: { modules: string[] } }>(
    path.join(modDir, 'expo-module.config.json'),
  );
  assert(cfg.platforms.length === 1 && cfg.platforms[0] === 'android', 'android-only module');
  assert(cfg.android.modules.length === 1, 'exactly one Kotlin module class');
  const cls = cfg.android.modules[0];
  const ktPath = path.join(modDir, 'android', 'src', 'main', 'java', ...cls.split('.')) + '.kt';
  assert(fs.existsSync(ktPath), `Kotlin file missing at ${ktPath}`);
  const kt = fs.readFileSync(ktPath, 'utf8');
  assert(kt.includes(`Name("${LOCK_SCREEN_MODULE_NAME}")`), 'Kotlin Name(...) must equal LOCK_SCREEN_MODULE_NAME');
  assert(kt.includes('AsyncFunction("setShowWhenLocked")'), 'Kotlin must expose setShowWhenLocked');
  assert(kt.includes('setShowWhenLocked(enabled)'), 'Kotlin must call Activity.setShowWhenLocked');
  assert(fs.existsSync(path.join(modDir, 'android', 'build.gradle')), 'build.gradle missing');
  assert(!fs.existsSync(path.join(modDir, 'ios')), 'no ios/ directory (Android-only app)');
});

test('lockscreen: policy is ON iff a session exists; wrapper reuses the policy name (read as text)', () => {
  assert(showWhenLockedFor(true) === true && showWhenLockedFor(false) === false, 'policy must mirror session presence');
  const wrapper = fs.readFileSync(path.join(APP_DIR, 'src', 'location', 'lockScreen.ts'), 'utf8');
  assert(wrapper.includes("import { LOCK_SCREEN_MODULE_NAME } from './lockScreenPolicy';"), 'wrapper must import the name from the pure policy file');
  assert(wrapper.includes('requireOptionalNativeModule<LockScreenNative>(LOCK_SCREEN_MODULE_NAME)'), 'wrapper must resolve the module by that name');
  assert(!wrapper.includes("'QualifireLockScreen'"), 'the literal must live only in lockScreenPolicy.ts');
});

test('lockscreen: index.ts keys the flag on the session and never drops it inside stopTracking', () => {
  const src = fs.readFileSync(path.join(APP_DIR, 'src', 'location', 'index.ts'), 'utf8');
  assert(src.includes("import { setShowWhenLocked } from './lockScreen';"), 'wrapper import missing');
  assert(src.includes("import { showWhenLockedFor } from './lockScreenPolicy';"), 'policy import missing');
  assert(src.includes('void setShowWhenLocked(showWhenLockedFor(session != null));'), 'sync must key on session through the policy');
  assert(src.includes("AppState.addEventListener('change', syncShowWhenLocked);"), 'AppState listener missing');
  assert((src.match(/syncShowWhenLocked\(\);/g) ?? []).length === 2, 'expected exactly two direct sync calls (startTracking, getRecoveryState)');
  const stopBody = src.slice(src.indexOf('export async function stopTracking('), src.indexOf('// D-019 gate buzz'));
  assert(!stopBody.includes('syncShowWhenLocked'), 'stopTracking must not touch the flag (Decision 3)');
});
```

Note the count assertion in the last test: `syncShowWhenLocked();` (with the `();`) occurs
exactly twice — startTracking and getRecoveryState. The helper's declaration
(`function syncShowWhenLocked(): void {`) and the listener line (`..., syncShowWhenLocked);`)
do not match the pattern. If your count differs after the edits, the edits are wrong, not
the test.

### 10. EDIT `app/tests/run.ts` — line 56

Line 56 is `import './replay_drift_suite.ts';` and line 57 is `import { runAll } from './lib.ts';`.
Insert between them:

```ts
import './lockscreen_suite.ts';
```

## Verification

From the repo root (`GIT_OPTIONAL_LOCKS=0` on every git call):

1. `cd app && node --experimental-strip-types tests/run.ts` → **zero FAIL**; the total rises by
   5 (the five `lockscreen:` tests) and every previously passing test still passes. If the
   runner dies with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`, a test imported `expo`
   transitively — that is a stop, not something to work around.
2. `cd app && ./node_modules/.bin/tsc --noEmit` → clean, exit 0.
3. `cd app && npx expo config --type introspect > /tmp/introspect.json; grep -c showWhenLocked /tmp/introspect.json`
   → **≥ 1** (the evaluated manifest carries the attribute; this runs the plugin without
   writing `app/android/`). If the command errors on the plugin, that is a stop: report the
   error verbatim. If it errors for an unrelated reason (network, `.expo/` state), report it
   and continue — items 1-2 and 4-5 still decide.
4. `ls app/android` → must NOT exist (introspect writes nothing). If it does, `mv app/android
   app/safe_to_delete/android_introspect_$(date +%s)` and say so in the report.
5. `GIT_OPTIONAL_LOCKS=0 git status --short -- app` → exactly: `M app/app.json`,
   `M app/src/location/index.ts`, `M app/tests/run.ts`, `?? app/plugins/`,
   `?? app/modules/`, `?? app/src/location/lockScreenPolicy.ts`, `?? app/src/location/lockScreen.ts`,
   `?? app/tests/lockscreen_suite.ts`
   (plus whatever unrelated `marketing/` churn was already there — ignore paths outside `app/`).
6. `grep -rn "showWhenLocked" app/src` → hits only in `lockScreenPolicy.ts`, `lockScreen.ts` and
   `location/index.ts`. `grep -n "from 'expo" app/src/location/lockScreenPolicy.ts` → no hits.
   `grep -rn "showWhenLocked\|lockScreen" app/src/ui` → **no hits** (no UI was touched).

## What Nathan must run (after the executor + Inspect land, and it is committed)

Native change ⇒ **new APK**; `publish-preview.ps1` cannot carry it (fingerprint moves —
`scripts/OTA-TROUBLESHOOTING.md`). `scripts/build7.ps1` is the "rebuild Qualifire Preview in
place" wrapper (blank seed + checks, then the build4 engine); it has no build-7-only state, so
re-running it produces the next Preview build from the committed tree. Keystore prompt:
**reuse** the existing one.

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

Install the new Preview APK over the existing one (data kept, same package id).

## On-device checklist (Nathan, after the new build is installed)

1. **The tester's scenario.** RECORD → START a ride → stay on the running screen → press
   power (screen off) → press power again → **the running screen is there, over the lock
   screen, no PIN**. Tap PAUSE → END → the ending screen plays (tower, card if any) and stays.
   Press home → the normal lock screen. Unlock → the app is where you left it.
2. **Idle stays private.** No ride running: open RESULTS (or anything) → power off → power on
   → **the lock screen, not Qualifire**. (Manifest default ON, turned OFF by the RECORD-mount
   sync and every AppState change.)
3. **After END over the lock screen, the next lock is normal.** From 1, after pressing home
   and locking again: power on → lock screen, not Qualifire.
4. **Notification path (expected, unverified until seen).** Ride running → press home →
   power off → power on → lock screen shows "Qualifire — recording ride" → tap it → the app
   opens over the lock screen without a PIN. If it asks for the PIN instead, that is a finding
   for OPEN-ITEMS (SystemUI/OEM policy), not a reason to change the manifest.
5. **Process-kill path.** Ride running → swipe Qualifire away from recents (service survives,
   `killServiceOnDestroy: false`) → lock → tap the notification → app opens over the lock
   screen with the relaunch banner; PAUSE → END works.
6. **Old install sanity (before installing the new APK, optional):** nothing changes on
   today's Preview even after an OTA — the wrapper no-ops.

## Out of scope

- A "STOP" action button inside the notification (Decision 6); a lock-screen widget or quick
  tile; `turnScreenOn`; dismissing the keyguard; a reduced "lock-safe" pane; a hold-to-END
  (Nathan's call 1); iOS (no iOS build; `platforms: ["android"]`).
- Any change to the running screen's layout, the map, PAUSE/RESUME/END, Discard.
- `STATE.md`, `OPEN-ITEMS.md`, this folder's `README.md`, `scripts/*`,
  `scripts/OTA-TROUBLESHOOTING.md` (fingerprint note is post-build bookkeeping).

## What this changes on Nathan's phone

**Nothing, until a new APK is built and installed** — this is a parked brief, and even once
executed and committed it is a native change: `publish-preview.ps1` will NOT deliver it (the
fingerprint changes; an OTA published from this tree is silently skipped by the current
Preview, which keeps its current JS). After `build7.ps1` runs and the new Preview is installed:
while a ride is recording and Qualifire was the app in front when the screen locked, the power
button wakes the phone straight onto the live recording screen (no unlock); PAUSE → END works
there; the ending screen stays until home/back. When no ride is recording, locking and waking
behave exactly as today. The running screen itself looks exactly as today — map, clock,
sectors, PAUSE → RESUME | END, Discard — nothing was redesigned. The dev client (Fast Refresh)
does not get any of this until `build4.ps1 -BuildProfile development` is run too; until then
the wrapper silently no-ops there.

## Nathan's call (recommended defaults chosen; not blocking)

1. **Privacy / pocket-safety over the lock screen.** Chosen: show the full running screen
   (Strava/Maps model), rely on the existing PAUSE → END two-step and Discard's confirm.
   Alternative if he wants it: a reduced "lock-safe" pane (elapsed time + sector clock + PAUSE
   → END, no map, no route names) shown while the keyguard is locked — needs one more native
   function (`KeyguardManager.isKeyguardLocked`) and an AppState-driven re-read; a separate
   brief (~1 Digest + 1 Plan).
2. **Scope of the flag.** Chosen: ON only while a ride records (sticky until the next
   background). Alternative: always ON (manifest only, no Kotlin) — simpler build, but every
   screen he locks on comes back over the keyguard; rejected as default, one-line brief if he
   prefers it anyway.
3. **Rebuild the dev client too?** Chosen: optional. Fast Refresh keeps working without it;
   only lock-screen testing in the dev client needs it.

## Open questions / assumptions (logged, not blocking)

1. **Assumption:** AOSP SystemUI opens a `showWhenLocked` activity from a lock-screen
   notification tap without the unlock prompt (it checks the manifest `ActivityInfo` flag).
   OEM skins (Samsung One UI, etc.) may differ — checklist item 4 is the real test.
2. **Assumption:** `expo-module-gradle-plugin` resolves for a local module with no
   `package.json` exactly as for `node_modules` ones (autolinking scans `./modules`; verified
   in `expo-modules-autolinking` 56 source, not yet in an EAS build). If the EAS build fails in
   this module, the Kotlin file and `build.gradle` are the only two suspects; the log names
   which.
3. `Activity.setShowWhenLocked` is API 27; Expo 56's minSdk is 24, hence the runtime guard.
   Nathan's phone and any 2026 tester phone are far above 27.
4. A `STOP` button in the notification remains the better UX for the "phone in a mount"
   case (no screen interaction). Revisit only if a tester asks; it is a bigger native piece.
