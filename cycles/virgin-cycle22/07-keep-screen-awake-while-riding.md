# 07 — Keep the screen on, on RECORD only, while a ride is running (expo-keep-awake)

**Source: Nathan, 2026-10-05 23:07 (README "Decision from Nathan (2026-10-05 23:07) — item 7";
intake digests/I7-keep-screen-awake-intake.md; Haiku digest D11 + COORDINATOR NOTE).** Tester
feedback: the screen turns off mid-ride when nobody touches it ("like watching a YouTube video, it
should stay on"). Decision: the screen stays on ONLY on the RECORD screen and ONLY while a ride is
running. Written by the Plan tier (Fable) on 2026-10-05 after reading App.tsx (the tab shell),
RecordScreen.tsx, recordFlow.ts, package.json/package-lock.json, app.json and the installed
`expo-keep-awake` + `@expo/fingerprint` + `expo-modules-autolinking` in node_modules. Nothing is
executed yet.

**Tier:** Execute = Sonnet, alone. STOP-ON-AMBIGUITY (EXECUTOR-RULES.md): any quoted anchor not found,
any test failing for a reason this brief does not name, any extra tsc error -> stop and report verbatim.

**Run order:** independent of 01-06 (touches `RecordScreen.tsx`, which 02 also edits — run after 02, and
re-check anchors by content; 05/06 do not touch this file). Can run before or after 05/06.

## 0. What the code does today (verified 2026-10-05; current-tree line numbers)

- **Tabs are a hand-rolled switch, not react-navigation** — `app/App.tsx:236-246` (`Shell`): the content
  area mounts exactly ONE screen: `gateAdjust !== null ? <GateAdjustScreen> : rideDetail !== null ?
  <RideDetailScreen> : catalogDetail !== null ? ... : tab === 'record' ? <RecordScreen onFullscreenChange=
  {setRecFullscreen} /> : tab === 'rides' ? <RidesScreen /> : ...`. **RecordScreen UNMOUNTS whenever another
  tab is selected or any full-screen detail opens** (D11 could not establish this; it is established now).
  While `phase` is armed/running/ending the tab bar is hidden entirely (`tabBarHidden`, App.tsx:200-201, via
  `isFullscreen(phase)`), so a rider cannot switch tabs mid-ride anyway; hardware back is swallowed while
  running/ending (RecordScreen.tsx:569-581).
- `app/src/ui/recordFlow.ts:27` `type RecordPhase = 'setup' | 'armed' | 'running' | 'ending'`.
  `app/src/ui/RecordScreen.tsx:180` `const [phase, setPhase] = useState<RecordPhase>('setup');` — `phase`
  is the single authoritative ride state for rendering. Transitions (all verified):
  - `'armed' -> 'running'`: the session-sync effect `:544-548` (`if (session != null && phase !== 'running'
    && phase !== 'ending') setPhase('running');`) — this is ALSO the relaunch-recovery path (a session
    restored from storage appears, phase follows).
  - `'running' -> 'ending'`: `onEnd` `:813 setPhase('ending');` (STOP). Failed stop: `:825 setPhase(sessionRef
    .current ? 'running' : 'setup')`.
  - `'running' -> 'setup'`: discard in the pause menu `:1037 setPhase('setup');` (after `stopTracking()`);
    failed stop there `:1014`.
  - `'ending' -> 'setup'`: `:1373` (after save/naming); `'armed' -> 'setup'` cancel `:1274`/back `:572`.
  - Red light: `liveState` on the map flips `moving <-> stopped` from `stationary` (`:1415`), **phase stays
    `'running'`** — so a red light keeps the screen on (Nathan's agreed reading).
- `:18` `import { Alert, Animated, AppState, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';`
  `:17` `import { useCallback, useEffect, useMemo, useRef, useState } from 'react';`. Module constants
  `:100-133` (`GPS_OFF_MSG` ... `const NEW_ID = '~new';` at :133, then `let recoveryAutoSaveStarted = false;`).
- The fullscreen-report effect `:553-561` ends with `  }, [phase, showAnim, onFullscreenChange]);` followed
  by a blank line and the comment `  // Hardware back (Cycle 024, WP-A2): registered here so it runs BEFORE`.
- **Native status (the load-bearing finding):** `expo-keep-awake` **56.0.3 is ALREADY in
  `app/node_modules`** as a dependency of `expo` itself (`node_modules/expo/package.json:87`
  `"expo-keep-awake": "~56.0.3"`, `package-lock.json:3222`), ships `expo-module.config.json` with the
  Android module `expo.modules.keepawake.KeepAwakeModule`, and **is already autolinked**: `node
  node_modules/expo-modules-autolinking/bin/expo-modules-autolinking.js resolve -p android --json` lists
  it among the 26 linked modules (run 2026-10-05 on this tree). Build 8 was built from this tree state
  (2026-10-03, same lockfile), so its APK already contains the native module. `@expo/fingerprint`
  (node_modules/@expo/fingerprint/build/sourcer/Bare.js:58-64, Expo.js:219-245) hashes package.json
  **scripts** and the autolinking **module directories** — not the `dependencies` list. Declaring the
  package directly in package.json therefore does NOT move the fingerprint. **Expected: OTA-safe, no new
  build** — to be CONFIRMED by Nathan's `publish-preview.ps1 -DryRun` (it runs the fingerprint check); if
  it reports drift, `build8.ps1` is the fallback (§ What changes on the phone). I7/D11 assumed a new build
  was unavoidable; that assumption was wrong for this repo.
- API (node_modules/expo-keep-awake/build/index.d.ts): `activateKeepAwakeAsync(tag?: string): Promise<void>`,
  `deactivateKeepAwake(tag?: string): Promise<void>`, `useKeepAwake(tag?, options?)` (unconditional hook —
  not usable here: it would hold the lock in setup/armed/ending too). Android implementation =
  `FLAG_KEEP_SCREEN_ON` on the activity window: a property of OUR window, inert while the app is in the
  background, no permission needed (`WAKE_LOCK` is declared in app.json anyway). `app.json` `platforms:
  ["android"]`; no config plugin needed for this module.
- No keep-awake code exists anywhere in app/src (grep `KeepAwake|keepawake|FLAG_KEEP_SCREEN_ON` -> 0).
- `tests/recordflow_suite.ts` already source-tests RecordScreen.tsx (`:128`, `:215`, `:279`, `:355`); imports
  `fs`, `path`, `assert`, `test`, `TESTS_DIR` (:6-8). Last test starts at `:355`.
- `tests/ui-strings.allow.json`: no change expected — this brief adds NO rider-facing string (the tag is a
  single word, `'QualifireRide'`, deliberately with no non-letter inside so the scanner's prose rule
  (`ui_strings_extract.ts:50`) cannot read it as rider text).

## Scope / non-scope

IN: `app/package.json` (one dependency line), `app/package-lock.json` (the matching one line in the root
`packages[""].dependencies` block only), `app/src/ui/RecordScreen.tsx` (one import, one constant, one
effect), `app/tests/recordflow_suite.ts` (one test), `cycles/virgin-cycle22/COMMANDS.md` (heading fix +
one appended section, exact text below).
OUT: App.tsx, recordFlow.ts, location/*, live/*, settings.tsx (no switch — decision 2), app.json,
eas.json, metro.*, every other screen, `core/`, ui-strings.allow.json, IDEAS.md, STATE.md, OPEN-ITEMS.md,
scripts/*.ps1 (no new build script).

## Target invariants

1. Screen-on is held exactly while `phase === 'running'` on a mounted RecordScreen; released (same tag) in
   that effect's cleanup — which runs on every exit: STOP (`'ending'`), discard (`'setup'`), failed stop
   that lost the session (`'setup'`), unmount (tab switch / full-screen detail / app teardown), and a
   relaunch starts with it off (the flag lives with the process). Recovery (session restored -> phase
   `'running'`) re-acquires it.
2. Not held in `'setup'`, `'armed'`, `'ending'`; never on another tab/screen (RecordScreen is unmounted there).
3. No AppState handling (decision 3), no settings switch (decision 2), no new string.
4. `expo-keep-awake` declared in package.json at the version already installed (`~56.0.3`), lockfile root in
   sync, no other dependency change.

## Steps (anchors by quoted content)

**Pre-flight.** `GIT_OPTIONAL_LOCKS=0 git status --short`; `ls app/node_modules/expo-keep-awake/package.json`
exists and `grep -n '"version"' app/node_modules/expo-keep-awake/package.json` -> `56.0.3` (if the module is
missing or another version: STOP — this brief's version line and the "already linked" reasoning depend on
it). Baseline tests (record the count; 0 fail) and tsc exit 0.

**Step 1 — test first (failed-before).** Append to `app/tests/recordflow_suite.ts` after the last test:
```ts
test('virgin-cycle22 07: RecordScreen keeps the screen awake ONLY while phase === running (expo-keep-awake, same tag released in the cleanup)', () => {
  // Nathan 2026-10-05 (tester): screen on like a video, but only on RECORD and only during the ride.
  const src = fs.readFileSync(path.resolve(TESTS_DIR, '..', 'src', 'ui', 'RecordScreen.tsx'), 'utf8');
  assert(src.includes("import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';"),
    'imports exactly the two imperative calls');
  assert(!src.includes('useKeepAwake('), 'the unconditional hook is not used (it would hold the lock in setup/armed/ending too)');
  assert(src.includes("const KEEP_AWAKE_TAG = 'QualifireRide';"), 'one tag constant, a single word (ui-strings scanner)');
  const effect = /useEffect\(\(\) => \{\s*if \(phase !== 'running'\) return;\s*void Promise\.resolve\(activateKeepAwakeAsync\(KEEP_AWAKE_TAG\)\)\.catch\(\(\) => \{\}\);\s*return \(\) => \{\s*void Promise\.resolve\(deactivateKeepAwake\(KEEP_AWAKE_TAG\)\)\.catch\(\(\) => \{\}\);\s*\};\s*\}, \[phase\]\);/;
  assert(effect.test(src), 'the keep-awake effect: guard on running, activate, release in the cleanup, deps [phase]');
  assert((src.match(/activateKeepAwakeAsync\(/g) ?? []).length === 1 && (src.match(/deactivateKeepAwake\(/g) ?? []).length === 1,
    'exactly one activate and one deactivate call site');
  const pkg = JSON.parse(fs.readFileSync(path.resolve(TESTS_DIR, '..', 'package.json'), 'utf8')) as { dependencies: Record<string, string> };
  assert(pkg.dependencies['expo-keep-awake'] === '~56.0.3', `package.json declares expo-keep-awake ~56.0.3 (got ${pkg.dependencies['expo-keep-awake']})`);
  const lock = JSON.parse(fs.readFileSync(path.resolve(TESTS_DIR, '..', 'package-lock.json'), 'utf8')) as { packages: Record<string, { dependencies?: Record<string, string> }> };
  assert(lock.packages['']?.dependencies?.['expo-keep-awake'] === '~56.0.3', 'package-lock root block matches package.json');
});
```
Run: this test FAILs (no import yet); everything else passes. Record the failure line.

**Step 2 — `app/package.json`.** After the line `    "expo-file-system": "~56.0.9",` insert
`    "expo-keep-awake": "~56.0.3",` (alphabetical, before `"expo-location"`). Nothing else.

**Step 3 — `app/package-lock.json`.** In the ROOT block only (`"packages": { "": { ... "dependencies": {`,
lines ~10-23), after the line `        "expo-file-system": "~56.0.9",` (:15) insert
`        "expo-keep-awake": "~56.0.3",`. Do NOT touch the second occurrence (:3052, inside
`node_modules/expo`'s own block) or anything else. This is byte-for-byte what `npm install` writes for a
package that is already resolved at that version; Nathan's `npm install` in COMMANDS.md § 3 then produces
no diff (that is the check).

**Step 4 — `app/src/ui/RecordScreen.tsx`.**
4a. After the line `import { Alert, Animated, AppState, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';`
add the line `import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';`.
4b. After `const NEW_ID = '~new';` (and before `/** virgin-cycle20 08: the silent interrupted-recording finaliser ...`) add:
```ts
/** virgin-cycle22 07: the one expo-keep-awake tag this screen holds while a ride
 * runs. A single word on purpose: the ui-strings scanner reads a hyphenated
 * literal as rider prose. */
const KEEP_AWAKE_TAG = 'QualifireRide';
```
4c. After the fullscreen-report effect's closing line `  }, [phase, showAnim, onFullscreenChange]);` and its
following blank line, and BEFORE `  // Hardware back (Cycle 024, WP-A2): registered here so it runs BEFORE`, insert:
```ts
  // virgin-cycle22 07 (Nathan 2026-10-05, tester feedback): keep the screen on
  // while a ride is RUNNING and only then — not in setup/armed/ending, not on
  // any other tab (Shell mounts one screen at a time, App.tsx: RecordScreen is
  // unmounted there, and this cleanup runs), not after STOP/discard/a failed
  // stop that lost the session (phase leaves 'running'). A red light is still
  // phase 'running' (only the map's liveState flips to 'stopped') and keeps it.
  // Relaunch recovery re-enters 'running' through the session-sync effect
  // above and re-acquires it; a killed process never holds it (the flag dies
  // with the window). No AppState handling: Android FLAG_KEEP_SCREEN_ON is a
  // property of OUR window and is inert while the app is in the background.
  // Promise.resolve() wraps both calls so a void-returning build of the module
  // can never throw on `.catch`.
  useEffect(() => {
    if (phase !== 'running') return;
    void Promise.resolve(activateKeepAwakeAsync(KEEP_AWAKE_TAG)).catch(() => {});
    return () => {
      void Promise.resolve(deactivateKeepAwake(KEEP_AWAKE_TAG)).catch(() => {});
    };
  }, [phase]);

```
(The regex in Step 1 matches this text exactly — keep the whitespace/line breaks as written.)

**Step 5 — `cycles/virgin-cycle22/COMMANDS.md`.** Two edits, nothing else in that file:
5a. Replace the heading line `## 1. Cycle 22 is JavaScript-only — OTA, no new native build` with
`## 1. Cycle 22 publishes as an OTA (briefs 01-06 JS-only; brief 07 expected OTA-safe too — § 3 has the check)`.
5b. Append at the end of the file (the outer fence here is four backticks; the inner ``` fences are part of the text to paste):
````
## 3. Brief 07 — keep the screen on while riding (expo-keep-awake)

The module `expo-keep-awake` 56.0.3 was ALREADY in `app\node_modules` (a dependency of `expo`) and
already linked into build 8 (autolinking lists it), so adding it to package.json should NOT change the
native fingerprint. Confirm before publishing — the dry run below runs the fingerprint check:

```
cd "C:\Users\natha\Claude personal projects\Qualifire\app"
npm install --no-audit --no-fund
```
(expected: "up to date", and `git status` shows no change to package-lock.json — the executor already
wrote the one line npm would write)

```
cd "C:\Users\natha\Claude personal projects\Qualifire"
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-preview.ps1" -DryRun
```
- Dry run clean (no fingerprint drift) -> publish as in § 1; brief 07 rides in the same OTA. On the
  phone: fully close "Qualifire Preview", reopen twice.
- Dry run reports a FINGERPRINT DRIFT -> the module was not in build 8 after all. Do NOT publish. Build
  instead (one EAS build slot, ~10-20 min, answer REUSE for the keystore), install the APK over the
  Preview, then send me the new fingerprint for `scripts\OTA-TROUBLESHOOTING.md`:
```
cd "C:\Users\natha\Claude personal projects\Qualifire"
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\build8.ps1" -DryRun
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\build8.ps1"
```
  If you have a DEV CLIENT installed (`dev-phone.ps1`), it already has the module too (same tree).

On-device check (brief 07):
1. RECORD > pick a way > RECORD > START. Put the phone in the holder and do not touch it for longer
   than your screen timeout (Settings > Display; set it to 30 s for the test). The screen stays on
   for the whole ride, including a red-light stop.
2. STOP. From the moment the end mark plays (phase `ending`) the screen is allowed to dim again:
   leave the phone alone on the naming/result card for the timeout — it dims/locks as usual.
3. Setup and armed: on the RECORD tab before START, and on every other tab, the screen dims as usual.
4. Discard: START a ride, open the pause menu, Discard — the screen dims as usual afterwards.
5. Optional: force-stop the app during a ride and reopen — the ride resumes (virgin-cycle21 04 rules)
   or is filed free; either way the screen behaves per 1-3 for the state you land in.
6. Anything odd: `cycles\virgin-cycle22\PROGRESS.md`.
````
(Nathan's standing rules: PowerShell `-File` calls with `-ExecutionPolicy Bypass` and FULL paths;
commands documented inside the cycle folder. Note the fenced blocks above are nested inside this brief's
own fence — in COMMANDS.md they are ordinary top-level fences.)

**Step 6 — run everything.** Tests: the Step-1 test passes; **+1 vs baseline**. tsc exit 0 (the import
resolves against the installed node_modules/expo-keep-awake). ui-strings suite green with no allow-list
change (`git diff app/tests/ui-strings.allow.json` -> empty). `git diff --stat`: exactly package.json,
package-lock.json, RecordScreen.tsx, recordflow_suite.ts, cycles/virgin-cycle22/COMMANDS.md beyond the
pre-existing modifications.

## Failed-before procedure (never git stash)
Step 1 is the record. To re-prove later: `cp app/src/ui/RecordScreen.tsx safe_to_delete/RecordScreen.c22-07.bak`,
change `if (phase !== 'running') return;` to `if (phase === 'setup') return;` (which would hold the lock in
armed/ending), run (the test FAILs on the effect regex), restore with `cp` and `cmp`.

## Verification (the inspector reruns all of it)
- Tests 0 FAIL with counts; tsc exit 0.
- `grep -n "KeepAwake\|KEEP_AWAKE_TAG" app/src/ui/RecordScreen.tsx` -> the import, the constant (+ its
  comment), one activate, one deactivate; nothing else in app/src (`grep -rln "KeepAwake" app/src` -> RecordScreen.tsx only).
- `grep -n "expo-keep-awake" app/package.json app/package-lock.json` -> package.json:1 hit, lock: the root
  line + the pre-existing `node_modules/expo` dependency line (:3052) + the pre-existing
  `"node_modules/expo-keep-awake": {` block — no new resolved entry.
- `node app/node_modules/expo-modules-autolinking/bin/expo-modules-autolinking.js resolve -p android --json`
  (run from `app/`, ~10 s) still lists `expo-keep-awake` `56.0.3` and the same 26 modules — the autolinking
  input to the fingerprint is unchanged.
- The effect sits AFTER the session-sync effect (`setPhase('running')` on a restored session) so recovery
  re-acquires the lock; confirm by reading the order in the file.
- `git diff app/App.tsx app/app.json app/src/ui/settings.tsx` -> empty.
- Native Kotlin cannot be compiled here: nothing native is added, say so.

## Added visible text
None. `'QualifireRide'` is an internal tag (one word, not prose; the scanner's Tier-B rule ignores it — and
if the ui-strings suite ever reports it UNLISTED, STOP: do not add an allow-list entry for an internal tag,
report instead).

## What changes on the phone / what does not
**Expected OTA-safe (no new build) — confirmed only by Nathan's dry run (COMMANDS.md § 3).** Reasoning:
the native module is already compiled into build 8 (autolinked as `expo`'s own dependency; the fingerprint
hashes module directories, which do not change). If the dry run disagrees, build8.ps1 produces the APK;
until that APK is installed NOTHING of this brief is on the phone — the OTA would be refused by the
fingerprint check, and that is the design, not a bug.
Changes (once on the phone): while a ride is running on RECORD the screen never dims or locks by itself,
red lights included; the moment you STOP (or discard, or the ride is otherwise over) the normal screen
timeout applies again; the same before START and on every other tab. Battery: the screen stays on for the
ride's duration — that is the point; there is no switch to turn it off this cycle (decision 2).
Does NOT change: recording while the phone is locked/backgrounded (background location is a separate
concern, I7 §4 — this brief does not touch it); notifications; the lock-screen behaviour of
`withShowWhenLocked`; any map, timing or ranking behaviour; any text.

## Out of scope (do not do)
- A settings switch (decision 2); AppState listeners (decision 3); keeping the screen on in armed/prestart
  or on DEMO; iOS (`platforms: ["android"]`).
- Background location / recording while locked (separate concern).
- New build scripts, `scripts/README.md`, `OTA-TROUBLESHOOTING.md` (coordinator/Nathan after the dry run
  or build). IDEAS.md, STATE.md, OPEN-ITEMS.md, other briefs. Coordinator: STATE.md "Where the app actually
  is" gets one line: "RECORD keeps the screen on while phase is `running` (virgin-cycle22 07, expo-keep-awake,
  already linked in build 8)"; `scripts/README.md`'s build8 row and `build8.ps1`'s header list of the native
  layer may add `expo-keep-awake` for completeness.

## I7/D11 digest errata found by Plan
- I7 "needs a native module -> new build, not OTA" and D11 §5 "Native fingerprint impact: YES": **wrong for
  this repo** — the module is already installed (56.0.3, dependency of `expo`) and autolinked into build 8;
  `@expo/fingerprint` does not hash the `dependencies` list. Expected OTA-safe; Nathan's dry run is the proof.
- D11 §1 "`live.phase` can be 'idle', 'detecting', 'locked', 'finished'" and the `RecordPhase` table are
  right; D11 §3 "assume react-navigation / `unmountOnBlur`" is wrong — App.tsx is a hand-rolled single-mount
  switch, RecordScreen unmounts on any tab change or full-screen detail.
- D11 §7 exit path 5 "App background -> turn OFF keep-awake" is unnecessary: FLAG_KEEP_SCREEN_ON is inert
  while the window is not shown (decision 3).
- D11 §4 settings plumbing is generic guesswork (no file read); not used.

## Decisions taken by the Plan tier (logged, not asked)
1. **"Running" = `phase === 'running'`**, nothing finer: moving AND red-light stopped (both are phase
   `running`), from the session-sync `setPhase('running')` until STOP (`ending`), discard (`setup`) or a
   lost session. `armed`/prestart and `ending` (naming/result cards) do not count — exactly Nathan's "only
   while a ride is running". `live.phase` (idle/detecting/locked/finished) is deliberately NOT consulted:
   a finished lap whose recording is still running is still a ride in progress.
2. **No settings switch this cycle**: it is not trivially cheap (store key + persistence + a settings row +
   at least one rider-facing string Nathan would own + tests), and the tester asked for the behaviour, not
   for a choice. Follow-up if battery complaints come in; the effect would then read one boolean.
3. **No AppState handling**: `FLAG_KEEP_SCREEN_ON` is a window flag — inert while the app is in the
   background, back in force when it returns, which is the wanted behaviour during a still-running ride.
   Adding listeners would only add exit paths to get wrong.
4. **Imperative `activateKeepAwakeAsync`/`deactivateKeepAwake` in an effect keyed on `[phase]`**, not the
   `useKeepAwake` hook: the hook is unconditional for the mounted component and would hold the lock in
   setup/armed/ending. One tag, same tag in the cleanup; `Promise.resolve(...)` wrapping so a void-returning
   build can never throw on `.catch`.
5. **Declare the dependency directly in package.json (and the lockfile root)** even though it is already
   installed transitively: importing an undeclared transitive dependency breaks the moment `expo` drops it;
   version pinned to the installed `~56.0.3`, so `npm install` is a no-op and the fingerprint input (module
   dirs) is unchanged. Execute edits the lockfile's root block by hand (no npm on the mount); Nathan's `npm
   install` in COMMANDS.md verifies it produces no diff.
6. **OTA vs build is stated as "expected OTA-safe, confirm with the dry run"**, not asserted: the evidence
   (autolinking output, fingerprint sourcer code) is strong, but the only authoritative check is the
   fingerprint compare against the installed APK, which runs on Nathan's PC. The build path is documented
   in the same COMMANDS.md section so nothing stalls if the dry run says otherwise.
