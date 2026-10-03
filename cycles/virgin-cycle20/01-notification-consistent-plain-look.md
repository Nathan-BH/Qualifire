# 01 — Ride notification: one plain look on every phone (no colour, no large flame)

**Source: Nathan, 2026-09-30** — the running-ride notification looks different per phone:
on Samsung One UI the whole card is red (`#e10600`, honoured as a *colorized* foreground-service
card), on his Honor it is not. Ruling: **(a)** the notification must look the same everywhere —
`setColorized(false)`, no special / red colour anywhere; **(b)** drop the three-colour flame
LARGE icon on the right; keep ONLY the small black-and-white status-bar flame silhouette
(drawable `notification_icon`, which expo-location picks up by name — untouched).

**Status: executed on the shared tree 2026-10-02 (uncommitted), ruling applied — see §5(c) and
Verification 3.** Written 2026-09-30 by the Plan tier
(Fable) against the working tree (branch `virgin`, HEAD `ae911bb`, 784 tests / 781 pass /
0 fail / 3 skip; virgin-cycle19 briefs are unexecuted, so that count is the baseline unless
cycle19 lands first — see §Verification). Executor: Sonnet, cold, this file only.

## What this changes on the phone — and what it does not

- **Stays exactly as today:** title `Qualifire — recording ride`, body `GPS tracking is active
  until you press Stop.`, the SystemUI chronometer anchored at `startedAtMs`, the `S<n>` /
  `finished` sub-text, the launcher tap intent, silent updates, the small status-bar flame
  (`notification_icon`, five densities).
- **Changes:** the card is the plain system notification style on every OEM (no red card on
  Samsung, no tinted app-name/icon anywhere — system default tint); the large coloured flame
  next to the title in the expanded shade is gone.
- **Native change → needs a NEW BUILD (build 8), not an OTA.** Kotlin and module `res/`
  changes move the `@expo/fingerprint` hash (module dir is autolinked). The one-line
  `index.ts` change alone would be OTA-able, but it is not sufficient (see Decision 2), so ship
  all of it in the build. Nothing is visible on a phone until then.

## Evidence (read 2026-09-30)

- `app/src/location/index.ts` lines 396-401 (inside `startTracking`'s
  `Location.startLocationUpdatesAsync(LOCATION_TASK, {…})`):
  ```ts
      foregroundService: {
        notificationTitle: 'Qualifire — recording ride',
        notificationBody: 'GPS tracking is active until you press Stop.',
        notificationColor: '#e10600',
        killServiceOnDestroy: false, // survive the app being swiped away
      },
  ```
- `app/node_modules/expo-location/android/src/main/java/expo/modules/location/services/LocationTaskService.kt`
  lines 74-81 (read-only, never edited): `val color = colorStringToInteger(serviceOptions.getString("notificationColor"))`
  … `color?.let { builder.setColorized(true).setColor(color) } ?: run { builder.setColorized(false) }`.
  So with **no** `notificationColor`, expo-location itself posts `setColorized(false)` and never
  calls `setColor` (colour stays `Notification.COLOR_DEFAULT` = 0).
- `app/modules/qualifire-ride-notification/android/src/main/java/expo/modules/qualifireridenotification/QualifireRideNotificationModule.kt`
  (67 lines): line 6 `import android.graphics.drawable.Icon`; line 18 header says
  "(title, body, colour, small icon, launcher tap intent) is preserved via
  Notification.Builder.recoverBuilder"; lines 45-48 idempotence:
  ```kotlin
      val sameWhen = existing.`when` == whenMs &&
        extras.getBoolean(Notification.EXTRA_SHOW_CHRONOMETER, false)
      val sameSub = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString() == subText
      if (sameWhen && sameSub) return true
  ```
  lines 49-54 `Notification.Builder.recoverBuilder(context, existing).setWhen(whenMs)
  .setShowWhen(true).setUsesChronometer(true).setOnlyAlertOnce(true).setSubText(subText)`;
  lines 55-59:
  ```kotlin
      // Flame pictogram (amendment 2026-09-29): the coloured layered flame as the LARGE icon.
      // The status-bar SMALL icon needs no code: expo-location already prefers a drawable
      // named `notification_icon` and recoverBuilder preserves whatever it set.
      val largeId = context.resources.getIdentifier("qualifire_flame_large", "drawable", context.packageName)
      if (largeId != 0) builder.setLargeIcon(Icon.createWithResource(context, largeId))
  ```
  line 60 `val rebuilt = builder.build()`, line 61 `nm.notify(sbn.tag, sbn.id, rebuilt)`.
- Large-icon asset: **only one file**, `app/modules/qualifire-ride-notification/android/src/main/res/drawable-nodpi/qualifire_flame_large.png`
  (17,055 bytes; `drawable-nodpi/` holds nothing else). Referenced by name in exactly three
  places outside `cycles/`: the Kotlin line 58 above, `…/res/raw/keep.xml` line 3
  (`tools:keep="@drawable/notification_icon,@drawable/qualifire_flame_large"`), and
  `app/tests/ridenotification_suite.ts` lines 121 and 126. No `app.json` / `app.config.js` /
  `app/plugins/` / `scripts/` reference exists (grepped 2026-09-30).
- Small icon: `…/res/drawable-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/notification_icon.png` — five
  files, looked up by expo-location's `LocationTaskService.kt` by name. **Not touched.**
- `app/tests/ridenotification_suite.ts` line 121 `assert(kt.includes('qualifire_flame_large') && kt.includes('setLargeIcon('), 'flame large icon must be set by the module');`
  line 126 `assert(fs.existsSync(path.join(resDir, 'drawable-nodpi', 'qualifire_flame_large.png')), 'flame large icon missing');`
  lines 141-142 `const fgOpts = src.slice(src.indexOf('foregroundService: {'), src.indexOf('killServiceOnDestroy'));`
  `assert(fgOpts.includes("notificationTitle: 'Qualifire — recording ride'"), 'expo-location options must be untouched');`
- Re-post path: `index.ts` lines 565-571 — on `AppState` `'active'` `forceRideNotificationReassert()`
  (expo-location re-posts its PLAIN notification on task re-registration; the next engine tick
  re-applies the chronometer through the module).
- Source copies of the icon set for the record live in `cycles/virgin-cycle18/assets-03/`
  (`make_flame_icons.py`, `res/drawable-nodpi/qualifire_flame_large.png`, preview PNG). Those are
  cycle documentation, **not** build inputs — untouched.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor above was read from the tree on 2026-09-30. If a quoted
  line is not where the brief says, or a name differs, stop and report the mismatch verbatim
  (file, line, expected, found). Never guess, never patch around it.
- No commit unless told (`GIT_OPTIONAL_LOCKS=0 git …`; a leftover `.git/index.lock` is
  `mv`'d aside, never deleted). **Never delete** — `safe_to_delete/` (gitignored, repo root)
  is the bin; `mv`, never `rm`. If `mv` of the directory is refused by the mount, `mv` the
  file alone and report the empty directory left behind.
- No `npm install`, no `npx …`, no `eas …`, no Gradle in the cloud (no network, no Android
  SDK). Kotlin is checked by reading, not compiling — keep the edit to removals plus two
  builder calls.
- **Files touched — exactly these, nothing else:**
  - EDIT `app/src/location/index.ts` (one line removed)
  - EDIT `app/modules/qualifire-ride-notification/android/src/main/java/expo/modules/qualifireridenotification/QualifireRideNotificationModule.kt`
  - EDIT `app/modules/qualifire-ride-notification/android/src/main/res/raw/keep.xml`
  - MOVE `app/modules/qualifire-ride-notification/android/src/main/res/drawable-nodpi/qualifire_flame_large.png`
    → `safe_to_delete/virgin-cycle20-01/drawable-nodpi/qualifire_flame_large.png` (and the
    now-empty `drawable-nodpi/` directory goes with it)
  - EDIT `app/tests/ridenotification_suite.ts`
- Do **not** touch: any `drawable-*dpi/notification_icon.png`, `expo-module.config.json`,
  `android/build.gradle`, `src/location/rideNotification.ts`, `rideNotificationPolicy.ts`,
  `app.json`, `app.config.js`, `eas.json`, `package.json`, `tests/run.ts` (no new suite file —
  the checks go into the existing suite), anything under `node_modules/`, `cycles/virgin-cycle18/`,
  `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, this folder's other files.

## Goal

After a fresh build: on every Android phone the ride notification is the plain system card
(not colorized, default tint), with title / body / chronometer / sub-text / small flame exactly as
today and no large icon. The headless suite pins: no `notificationColor` in the expo-location
options, no `qualifire_flame_large` / `setLargeIcon(` in the Kotlin, `setColorized(false)` in
the Kotlin, the large PNG gone from module `res/`, `keep.xml` keeps only `notification_icon`, the
five small icons still present.

## Decisions

1. **Remove `notificationColor` from `index.ts`, do not replace it.** expo-location's own
   `?: run { builder.setColorized(false) }` branch is then the base notification on every OEM —
   exactly ruling (a) at the source, with no colour value anywhere in JS. (Alternative: keep the
   key with a neutral colour — rejected: any value flips expo-location to `setColorized(true)`,
   which is the Samsung red-card behaviour with a different colour.)
2. **The module also forces the plain look — `setColorized(false).setColor(Notification.COLOR_DEFAULT)`
   on the recovered builder.** `recoverBuilder` copies whatever the live notification carries,
   including colorized+colour; with Decision 1 in the same build that is already plain, but the
   module is the *last writer* of every re-post and the ruling says "no colour anywhere", so it
   states it explicitly instead of inheriting. `setColor(COLOR_DEFAULT)` (= 0, API 21) clears
   any inherited accent tint too (with colorized off, `color` still tints the small icon /
   app name on stock Android — Nathan wants none). API levels: `setColor` is API 21,
   `setColorized` is API 26; the module already returns `false` below API 24 (line 35), so
   `setColor(Notification.COLOR_DEFAULT)` is unconditional and `setColorized(false)` is guarded:
   `if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) builder.setColorized(false)` (on 24-25
   colorized notifications do not exist, so nothing is lost).
3. **Idempotence check gains a third condition.** Today `if (sameWhen && sameSub) return true`
   skips `notify()`. If the live notification were still colorized (only possible if some
   *other* poster left a coloured FGS notification — in this build expo-location never does),
   the module would leave it that way for the whole ride. Cheap belt: also require
   `existing.color == Notification.COLOR_DEFAULT` before the early return, so a coloured
   notification is always re-posted plain once. (`Notification.color` is a public `int` field
   since API 21; `isColorized()` is API 26 and gated on FGS/media, `EXTRA_COLORIZED` is `@hide`
   — `color` is the portable check.) Re-post cost: one extra `notify()` per ride at most.
4. **The AppState `'active'` re-assert path needs no change.** expo-location re-posts its plain
   (uncoloured, no large icon) notification; the forced tick calls the module, which adds the
   chronometer/sub-text and — per Decision 2 — leaves colour off. The 30-tick periodic re-assert
   (`REASSERT_EVERY_N_TICKS`) behaves the same. `rideNotification.ts` / policy untouched.
5. **Large icon: remove the code, the resource, and the keep entry — all three.** Leaving the
   PNG in `res/` with no reference would still ship 17 KB and a shrinker warning; leaving the
   `keep.xml` entry for a missing drawable is an AAPT error ("resource not found") on a release
   build. `tools:keep` stays for `notification_icon` (looked up by name → shrinker would strip it).
6. **Tests: edit the existing suite in place, inverting the two large-icon assertions and
   adding the new pins; one new `test(...)` for the colour rule.** Count goes +1 (784 → 785
   on the 2026-09-30 tree; brief 04 landed one test first, so the real run is **785 → 786**).

## Files to touch

### 1. EDIT `app/src/location/index.ts` — remove line 399

Before (lines 396-401):
```ts
      foregroundService: {
        notificationTitle: 'Qualifire — recording ride',
        notificationBody: 'GPS tracking is active until you press Stop.',
        notificationColor: '#e10600',
        killServiceOnDestroy: false, // survive the app being swiped away
      },
```
After:
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
Nothing else in the file changes. Note the `fgOpts` slice in the suite runs from
`foregroundService: {` to `killServiceOnDestroy`, so this comment sits *inside* it — that is why
§5(c) pins the **key** (`/notificationColor\s*:/`), not the bare word (Fable ruling 2026-10-02
on the executor's escalation; the comment's "No notificationColor (" does not match the key regex).

### 2. EDIT `QualifireRideNotificationModule.kt`

(a) Line 6 — remove `import android.graphics.drawable.Icon` (no other use of `Icon` remains;
grep the file to confirm before removing — if `Icon` appears elsewhere, stop and report).

(b) Header comment lines 17-19 — replace
```
 * startedAtMs and an optional header sub-text ("S2", "finished"). Everything
 * else on the notification (title, body, colour, small icon, launcher tap intent)
 * is preserved via Notification.Builder.recoverBuilder. Idempotent: if the
```
with
```
 * startedAtMs and an optional header sub-text ("S2", "finished"). Everything
 * else on the notification (title, body, small icon, launcher tap intent) is
 * preserved via Notification.Builder.recoverBuilder — except colour: since
 * virgin-cycle20 brief 01 the card is forced plain (setColorized(false),
 * COLOR_DEFAULT) so it looks the same on every OEM, and there is no large
 * icon (the status-bar `notification_icon` silhouette is the only flame). Idempotent: if the
```

(c) Lines 45-48 idempotence — replace
```kotlin
      if (sameWhen && sameSub) return true
```
with
```kotlin
      // Third condition: a notification still carrying a colour is re-posted plain once.
      val plain = existing.color == Notification.COLOR_DEFAULT
      if (sameWhen && sameSub && plain) return true
```

(d) Lines 49-59 — replace the builder chain plus the five large-icon lines
```kotlin
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
```
with
```kotlin
      val builder = Notification.Builder.recoverBuilder(context, existing)
        .setWhen(whenMs)
        .setShowWhen(true)
        .setUsesChronometer(true)
        .setOnlyAlertOnce(true)
        .setSubText(subText)
        // Plain look on every OEM (Nathan, 2026-09-30): never a colorized card, never an
        // accent tint. recoverBuilder would inherit both from the live notification, so
        // state it here instead of trusting index.ts's missing notificationColor alone.
        .setColor(Notification.COLOR_DEFAULT)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) builder.setColorized(false)
      // The status-bar SMALL icon needs no code: expo-location already prefers a drawable
      // named `notification_icon` and recoverBuilder preserves whatever it set. No large icon.
```
Lines 60-66 (`val rebuilt = builder.build()` … `catch`) unchanged. The resulting file must
contain **no** `qualifire_flame_large`, `setLargeIcon`, or `Icon.` token. `Build` is already
imported (line 7).

### 3. EDIT `…/res/raw/keep.xml`

Before (line 3): `    tools:keep="@drawable/notification_icon,@drawable/qualifire_flame_large" />`
After:  `    tools:keep="@drawable/notification_icon" />`

### 4. MOVE the large icon out of the module

```
mkdir -p safe_to_delete/virgin-cycle20-01
mv app/modules/qualifire-ride-notification/android/src/main/res/drawable-nodpi safe_to_delete/virgin-cycle20-01/drawable-nodpi
```
(repo root; the directory contains only `qualifire_flame_large.png`, verified). Afterwards
`ls app/modules/qualifire-ride-notification/android/src/main/res/` must list exactly
`drawable-hdpi drawable-mdpi drawable-xhdpi drawable-xxhdpi drawable-xxxhdpi raw`. If the mount
refuses the directory move, move the file alone into that target and report the leftover empty
`drawable-nodpi/` (harmless to Gradle; do not `rmdir`).

### 5. EDIT `app/tests/ridenotification_suite.ts`

(a) Line 121 — replace
```ts
  assert(kt.includes('qualifire_flame_large') && kt.includes('setLargeIcon('), 'flame large icon must be set by the module');
```
with
```ts
  assert(!kt.includes('qualifire_flame_large') && !kt.includes('setLargeIcon('), 'no large icon (virgin-cycle20 01): the status-bar silhouette is the only flame');
  assert(kt.includes('setColorized(false)') && kt.includes('setColor(Notification.COLOR_DEFAULT)'), 'module must force the plain card on every OEM');
  assert(kt.includes('existing.color == Notification.COLOR_DEFAULT'), 'idempotence must not keep a coloured notification');
```
(b) Line 126 — replace
```ts
  assert(fs.existsSync(path.join(resDir, 'drawable-nodpi', 'qualifire_flame_large.png')), 'flame large icon missing');
```
with
```ts
  assert(!fs.existsSync(path.join(resDir, 'drawable-nodpi', 'qualifire_flame_large.png')), 'large flame PNG must be gone from module res (moved to safe_to_delete/)');
  const keep = fs.readFileSync(path.join(resDir, 'raw', 'keep.xml'), 'utf8');
  assert(keep.includes('@drawable/notification_icon') && !keep.includes('qualifire_flame_large'), 'keep.xml keeps only notification_icon');
```
Place these three lines *after* the existing line 127 (`… 'res/raw/keep.xml missing …'`
existence assert) so the `keep` read never runs against a missing file.

(c) After line 142 (end of the `wrapper + index.ts wiring` test's `fgOpts` assert), inside the
same test, add:
```ts
  assert(!/notificationColor\s*:/.test(fgOpts), 'no notificationColor key: any value makes expo-location colorize the card (virgin-cycle20 01)');
```
(Regex on the *key*, not `includes('notificationColor')` — the §1 comment is inside the slice
and would trip a bare substring check. Ruled 2026-10-02.)

(d) Append one new test at the end of the file:
```ts
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
`APP_DIR`, `fs`, `path`, `test`, `assert` are already imported at the top of the suite.

## Verification plan

1. `cd app && node --experimental-strip-types tests/run.ts` — expect **786 tests / 783 pass /
   0 fail / 3 skip** (baseline on the shared tree is 785 / 782 since brief 04 added one test;
   this brief adds one; if cycle19 briefs land first add their counts — the README there says
   01 adds 4, 02 adds 3). Zero FAIL is the bar; report the exact summary line. Also
   run once *before* editing the suite and confirm the two inverted assertions FAIL against
   the new tree, then pass after — that is the "failed before, passes after" artifact.
2. `cd app && ./node_modules/.bin/tsc --noEmit` — clean, exit 0.
3. Two greps (grep only those paths; never the whole repo). Comments and the test pins
   legitimately *name* the removed tokens, so the check is restricted to code lines:
   (a) `grep -rn "qualifire_flame_large\|notificationColor\|e10600\|setLargeIcon" app/src app/modules app/app.json | grep -v ':[0-9]*:\s*//'`
   → **no output** (the only hits before the filter are the two `//` comment lines mandated in
   §1 `index.ts` and §2(d) Kotlin).
   (b) `grep -n "qualifire_flame_large\|notificationColor\|e10600\|setLargeIcon" app/tests/ridenotification_suite.ts`
   → **exactly 7 lines, all `assert(` pins** (on the 2026-10-02 tree: 121, 129, 131, 147, 152,
   153, 158); any hit that is not an `assert(`/message line is a failure.
4. `git status --porcelain` shows exactly: `M app/src/location/index.ts`,
   `M …/QualifireRideNotificationModule.kt`, `M …/res/raw/keep.xml`,
   `D …/res/drawable-nodpi/qualifire_flame_large.png`, `M app/tests/ridenotification_suite.ts`
   (`safe_to_delete/` is gitignored, so nothing else).
5. Inspect (fresh Opus): reruns 1-4, reads the Kotlin diff against Decisions 2-3 (API guard on
   `setColorized`, `setColor(COLOR_DEFAULT)` unconditional, third idempotence condition),
   confirms the five `notification_icon.png` are byte-identical to HEAD (`git diff --stat` shows
   none of them).

## On-device checklist — Nathan, after build 8 (NOT OTA; Kotlin + res changed)

Samsung (One UI) and Honor, same steps:
1. Start a ride; pull the shade. The card is the **plain system style** — on Samsung no red
   (or any coloured) background; the app name / small icon are the system default tint, not red.
2. Expanded: title, body, running timer, and — once on a known way — `S1` … `finished` in the
   header, exactly as build 7 was meant to show. **No large flame** on the right.
3. Status bar: the small white flame silhouette is still there (both phones).
4. Background the app, wait ≥30 s, reopen (AppState `'active'` re-assert): the card stays
   plain and keeps the timer.
5. Compare the two phones side by side: the only differences should be OEM chrome
   (font, corner radius), never colour or icon set. Paste a screenshot of each into this
   folder's `PROGRESS.md` (create it if absent).

## Out of scope

- The small icon's artwork; the launcher icon; the notification channel name/importance
  (expo-location's); the chronometer/label policy; any change to the lock-screen behaviour
  (cycle18 brief 01). Docs updates to `STATE.md` / cycle18's brief 03 (its "Nathan's call 6:
  keep `#e10600`" is now superseded by this brief — the coordinator notes that in `STATE.md`).

## Open calls (default chosen — executor does NOT stop for these)

- **A. `setColor(COLOR_DEFAULT)` vs leaving `color` inherited.** Chosen: clear it. With
  colorized off, an inherited accent would still tint the small icon / app name red on stock
  Android and some OEMs — "no special colour anywhere" reads as clearing it. Reversible in one
  line if Nathan later wants a brand tint.
- **B. Empty `drawable-nodpi/` after the move.** Chosen: move the directory with the file.
  If only the file could be moved, an empty resource dir is legal for AAPT.

## Report back

- The exact test summary line before the suite edit (expected: 2 FAIL from lines 121/126 once
  the tree changed) and after (0 FAIL, 786 total), and `tsc` exit code.
- The two greps from Verification 3 ((a) empty, (b) the 7 pin lines) and the
  `git status --porcelain` list.
- The final `ls` of the module `res/` directory and of `safe_to_delete/virgin-cycle20-01/`.
- Any anchor mismatch, verbatim, with the line actually found — and stop there.
- A reminder line for the coordinator: "needs build 8; not OTA-able".
