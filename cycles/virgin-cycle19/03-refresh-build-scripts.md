# 03 — `build8.ps1`: a build script that describes the app as it is now; builds 3–7 to `scripts/legacy/`

**Source: Nathan, 2026-09-30** — "I think we should just make new versions and update the
build-prepare and build files in general to reflect the current app implementations better."
Trigger: `build7.ps1` → `build4.ps1` still prints "6. Route map assets (the faked map --
pre-rendered PNGs, no native module)" and asserts the 20 Leuven routes + 3 PNGs are on disk —
the opposite of what the blank-seed app is.

**Status: brief only.** Written 2026-09-30 by the Plan tier (Fable). Executor: Sonnet, cold,
this file only. **Run this brief only after Nathan's current build 7 re-run has finished**
(it moves `build4.ps1`/`build7.ps1`). Briefs 01 and 02 land first (this script asserts their
files).

## What this changes on the phone

**Nothing.** It changes how Nathan starts a native build from his PC. The next APK Nathan
builds with `build8.ps1` is byte-identical to what `build7.ps1` would have built from the
same tree — except that the preflight now refuses to build when the Leuven seed is in the
bundle or the `.easignore` is missing.

## Executor rules (binding)

- **Stop-on-ambiguity** — anchors read 2026-09-30; report mismatches verbatim.
- No commit unless told (`GIT_OPTIONAL_LOCKS=0`; stray lock files `mv`'d aside). **Never
  delete: the legacy scripts are `mv`'d, not removed.** `mv` (not copy+delete) keeps history
  visible to `git log --follow`; stage with `git add -A scripts/` only if told to commit.
- No `npm`/`npx`/`eas` in the cloud. PowerShell cannot be run in the cloud either — the
  executor's syntax check is a careful read plus `pwsh -NoProfile -Command "[scriptblock]::Create((Get-Content -Raw scripts/build8.ps1))"`
  **only if `pwsh` exists** (`which pwsh`); otherwise skip and say so. Nathan runs the dry run
  (`COMMANDS.md` §5).
- **Files touched — exactly these:**
  - NEW `scripts/build8.ps1`, NEW `scripts/build8.cmd`
  - NEW `scripts/legacy/README.md`
  - MOVE `scripts/build3-prepare.ps1`, `scripts/build3-build.ps1`, `scripts/build4.ps1`,
    `scripts/build5.ps1`, `scripts/build5.cmd`, `scripts/build6.ps1`, `scripts/build6.cmd`,
    `scripts/build7.ps1`, `scripts/build7.cmd` → `scripts/legacy/` (same names)
  - EDIT `scripts/README.md` (rewrite the table)
  - EDIT `scripts/OTA-TROUBLESHOOTING.md` (§"Known fingerprints by build": one paragraph)
  - EDIT `deployment/CURRENT-STATE.md` lines 93-94 and 97 (three table cells)
- Do **not** touch `publish-preview.ps1`/`.cmd`, `dev-phone.*`, `gatefield-replay.*`,
  `spike-maplibre.ps1`, `recolour-icon.py`, `publish-preview.ps1.bak`, anything in `app/`,
  `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, the cycle README.
- Every path Nathan copy-pastes in a header or README is a FULL Windows path
  (`C:\Users\natha\Claude personal projects\Qualifire\…`) prefixed
  `powershell -ExecutionPolicy Bypass -File` — his standing rule.

## Goal

One script, `scripts/build8.ps1`, that a reader can trust as a description of the current
app: preflight (reads only) then build. Its `-DryRun` output is the checklist Nathan pastes
into chat. Old scripts stay runnable from `scripts/legacy/` (build7 still finds build4 next to
it), documented as history.

## Current state (verified 2026-09-30)

- `scripts/`: `build3-prepare.ps1` (176 lines), `build3-build.ps1` (120), `build4.ps1` (334 —
  the ENGINE: preflight sections 0-6, then `eas-cli build`), `build5.ps1` (33) / `.cmd`,
  `build6.ps1` (114) / `.cmd`, `build7.ps1` (190) / `.cmd` — **build7 is a wrapper: line 180
  `& (Join-Path $PSScriptRoot 'build4.ps1') -BuildProfile preview -Standalone …`**, so build4
  is not superseded, it is what runs. `publish-preview.ps1` (212, current OTA path),
  `dev-phone.ps1`/`.cmd`, `gatefield-replay.*`, `spike-maplibre.ps1`, `recolour-icon.py`,
  `OTA-TROUBLESHOOTING.md`, `README.md`.
- `build4.ps1` sections: 0 profile gate (`-Standalone`/`-Force`), 1 node ≥ 22, 2 `npx.cmd tsc
  --noEmit` + `node --experimental-strip-types tests/run.ts` (lines 118-139, `Invoke-Native`
  helper lines 74-83), 3 native slate (deps `expo-audio`, `react-native-safe-area-context`,
  `@maplibre/maplibre-react-native`; plugins `expo-location`, `expo-status-bar`, `expo-audio`,
  `@maplibre/…`; MapLibre 11.x in node_modules; `tiles.openfreemap.org` in `wayMapView.tsx`),
  4 variant (`app.config.js` reads `APP_VARIANT`; `eas.json` profile env), 5 icons, **6 route
  assets (lines 255-274: counts `ways.json` entries, asserts each PNG exists, and on a missing
  manifest points at an archived python script)**, verdict, 7 `eas-cli whoami`/login,
  8 `eas-cli build --platform android --profile $BuildProfile [--no-wait]`, then per-profile
  install notes (lines 320-332, incl. the dormant `virgin` profile).
- `build7.ps1` adds: A `expo-updates` declared + `npm install`, B `runtimeVersion.policy ==
  fingerprint`, `updates.url == https://u.expo.dev/a9f51461-f939-49a2-8c47-087fc39dc5f3`,
  `eas.json build.preview.channel == preview`, C `build.preview.env.EXPO_PUBLIC_SEED_MODE ==
  empty` + grep `EXPO_PUBLIC_SEED_MODE` under `app/src`, D `git status --porcelain` warning.
- `app/app.json` plugins today: `expo-location` (with config), `expo-status-bar`,
  `expo-audio`, `@maplibre/maplibre-react-native`, `./plugins/withShowWhenLocked.js`.
  `app/modules/qualifire-lock-screen/` and `app/modules/qualifire-ride-notification/` each
  carry `expo-module.config.json` (virgin-cycle18). `app/package.json` deps: `@maplibre/
  maplibre-react-native ^11.3.6, expo ~56, expo-audio, expo-dev-client, expo-file-system,
  expo-location, expo-status-bar, expo-task-manager, expo-updates, react 19.2.3,
  react-native 0.85.3, react-native-safe-area-context`.
- `scripts/OTA-TROUBLESHOOTING.md` lines 54-67 already record build 6 (superseded) and **build
  7 `cc04b4582bf8d69ff768b7e897f786c7a1862e7f`** (commit `03710eb`, confirmed 2026-09-08) — the
  digest's "add it if missing" is moot; what is missing is the fingerprint of Nathan's
  2026-09-30 build 7 re-run (cycle18 native modules), which nobody has read yet.
- `scripts/README.md` table lists build3/4/5, spike, gatefield-replay, dev-phone,
  recolour-icon — no build6, build7, publish-preview. `deployment/CURRENT-STATE.md` line 93
  names `scripts/build7.ps1` as the current build, 94 `build4.ps1` as its engine, 97 the
  lineage "build3 → build7".
- Build numbering: builds 5, 6, 7 were real EAS builds; Nathan is re-running the build 7
  script today (its APK is still "build 7" in his words). **The next script is `build8`.**
- `app/dist/` (12 MB, gitignored) is where `expo export` writes by default; `.easignore`
  (brief 02) excludes it; `build8` writes its export check elsewhere anyway.

## Decisions

1. **`build8.ps1` is self-contained** — preflight + build in one file, no `build4.ps1` engine.
   The wrapper-over-engine pattern is why a 2026-08 "faked map" section survived to today.
   Reuse build4's proven plumbing verbatim where it is still right: `Invoke-Native`,
   `Say/Step/Ok/Warn/Would`, the `$problems` accumulator + verdict, the stderr notes, section
   7/8 (`whoami`, `build`, keystore prompt note).
2. **Profiles:** `-BuildProfile preview` (default; the standalone "Qualifire Preview" APK,
   `com.nathanbonher.qualifire.preview`) or `development` (the dev client). No `virgin`
   profile in build8 (the `eas.json` profile stays, dormant, untouched — Nathan rejected the
   separate app 2026-09-06). No `-Standalone`/`-Force` gates: since 2026-08-19 every build has
   been a standalone preview with `-Standalone` passed by a wrapper; the gate only ever
   guarded against itself. `-Force` survives only as "build despite preflight problems".
3. **Preflight = the current app, nothing older:** (sections, in order)
   - 0 header: profile, repo path, git HEAD short hash + branch, `DRY RUN` banner.
   - 1 toolchain: node ≥ 22.
   - 2 typecheck + tests (from build4 §2, unchanged). `-SkipTests` keeps existing.
   - 3 native slate — what the APK must contain: deps present in `package.json`
     (`expo-updates`, `expo-location`, `expo-task-manager`, `expo-audio`,
     `@maplibre/maplibre-react-native`, `react-native-safe-area-context`); MapLibre 11.x in
     `node_modules`; `app.json` plugins include `expo-location`, `expo-audio`,
     `@maplibre/maplibre-react-native`, `./plugins/withShowWhenLocked.js`; each folder under
     `app/modules/*` has `expo-module.config.json` (list them by name); `tiles.openfreemap.org`
     still in `wayMapView.tsx`.
   - 4 update wiring (build7 §B): fingerprint policy, `updates.url`, channel == profile name
     for preview; `app.config.js` reads `APP_VARIANT`; `eas.json build.<profile>.env.APP_VARIANT`
     equals the profile for preview (development has no env — skip).
   - 5 icons (build4 §5 unchanged).
   - **6 blank seed — replaces the old "route map assets" section:** `eas.json
     build.preview.env.EXPO_PUBLIC_SEED_MODE == 'empty'` (preview only); something under
     `app/src` reads `EXPO_PUBLIC_SEED_MODE`; `app/metro.config.js` exists and contains
     `seed-stubs` and `EXPO_PUBLIC_SEED_MODE` (brief 01); the four stubs exist. Then, unless
     `-SkipExportCheck`: run `npx.cmd expo export --platform android --output-dir "$env:TEMP\qualifire-build8-export"`
     with `$env:EXPO_PUBLIC_SEED_MODE = 'empty'` and `$env:APP_VARIANT = <profile>` set for that
     call (through `Invoke-Native`; ~1-2 min; the folder is overwritten each run and lives
     outside the repo); then assert `assetmap.json` names none of `Morning`, `EveningA`,
     `EveningB`; the `.hbc` under `_expo\static\js\android\` contains none of the byte
     strings `home2work`, `seed:2026`, `WorkHomeDry` (`[IO.File]::ReadAllBytes` →
     `[Text.Encoding]::Latin1.GetString` → `.Contains`); print bundle size in KB and total
     `assets\` size. Any hit → `$problems += 'the Leuven seed is in the bundle — brief 01 not in effect'`.
   - **7 upload archive (brief 02):** `<repo>\.easignore` exists and contains the lines
     `.git`, `/*`, `!/app/`; no `app\.easignore`; estimate = sum of file sizes under `app\`
     excluding `node_modules`, `dist`, `android`, `.expo`, `safe_to_delete`, `_to_delete`,
     printed in MB; `$problems` if over 50 MB ("something new and big landed in app/").
   - 8 working tree: `git status --porcelain` → Warn (not a problem) when dirty, as build7 §D.
   - verdict (build4's), `-DryRun` stops here printing the `eas-cli build` line it would run.
   - 9 `eas-cli whoami`/login, 10 build (`--platform android --profile <profile>`,
     `--no-wait` with `-NoWait`).
   - 11 after a successful (waited) build: `npx.cmd eas-cli build:list --platform android
     --build-profile <profile> --limit 1 --json --non-interactive` via `Invoke-Native`, parse,
     print `id`, `runtimeVersion` (= the fingerprint) and `artifacts.applicationArchiveUrl`;
     then `Invoke-WebRequest -Method Head` on that URL and print `Content-Length` in MB as
     "APK size". Wrap in try/catch → Warn on failure (the build already succeeded). Then the
     notes: install over the existing app keeps data; write the fingerprint into
     `OTA-TROUBLESHOOTING.md`; `publish-preview.ps1` needs a matching fingerprint.
4. **No `npm install` step in build8.** build6/7 ran it to materialise `expo-updates`; it is
   in `node_modules` now. build8 asserts `node_modules\expo-updates\package.json` exists and
   tells Nathan to run `npm install` himself if not (`$problems`). Fewer side effects in a
   script that is otherwise read-only before section 10.
5. **Legacy move, not deletion**, and build4+build7 move together so `build7.ps1` keeps
   working from `scripts/legacy/` (`$PSScriptRoot` → same folder; `.cmd` uses `%~dp0`).
   `scripts/legacy/README.md` says what each was and that `build8.ps1` supersedes all of them.
6. **`.cmd` wrapper** identical in shape to `build7.cmd`: `build8.cmd` → full run,
   `build8.cmd dry` → `-DryRun`, `pause` at the end.
7. **Docs:** `scripts/README.md` rewritten as a table of what is in `scripts/` NOW (build8,
   publish-preview, dev-phone, gatefield-replay, spike-maplibre, recolour-icon,
   OTA-TROUBLESHOOTING, legacy/); `OTA-TROUBLESHOOTING.md` gets one paragraph under "Known
   fingerprints by build": build 7's 2026-09-30 re-run (cycle18 native modules) has a NEW
   fingerprint that must be read with `COMMANDS.md` §2/§3 and written here by Nathan —
   **write no hash you have not read**; `build8.ps1` §11 prints it after every build.
   `deployment/CURRENT-STATE.md` rows 93/94/97: build8 is current, build4 is legacy, lineage
   "build3 → build8".

## Files to touch

### NEW `scripts/build8.ps1`

Header comment (what it checks and why, the two usage lines with FULL paths):

```
    cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
    powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\build8.ps1" -DryRun
    powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\build8.ps1"
    powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\build8.ps1" -BuildProfile development
```

`param`: `[switch]$DryRun, [switch]$SkipTests, [switch]$SkipExportCheck, [switch]$NoWait,
[switch]$Force, [ValidateSet('preview','development')][string]$BuildProfile = 'preview'`.
`$repo = Split-Path -Parent $PSScriptRoot`, `$app = Join-Path $repo 'app'`, `Push-Location
$app` / `finally { Pop-Location }` as build4. Sections exactly as Decision 3. Every `Ok` line
states the fact it verified (a reader must be able to paste the dry run and have it mean
something). Target ~250-300 lines; ASCII only (the mojibake incident, cycle12).

### NEW `scripts/build8.cmd`

```
@echo off
rem Double-clickable launcher for build 8 -- the current Qualifire build (preflight reflects the blank-seed app; see build8.ps1 header).
rem Usage: build8.cmd        -> preflight, then queue the build
rem        build8.cmd dry    -> preflight only (-DryRun)
cd /d "%~dp0"
if /i "%~1"=="dry" (
  powershell -ExecutionPolicy Bypass -File ".\build8.ps1" -DryRun
) else (
  powershell -ExecutionPolicy Bypass -File ".\build8.ps1" %*
)
pause
```

### MOVE → `scripts/legacy/` and NEW `scripts/legacy/README.md`

`mkdir scripts/legacy`, then `mv` each of the nine files. README: one line per file — build3
(failed, stale-JS preview), build4 (dev-client + MapLibre engine, wrapped by 5/6/7; asserted
the Leuven route PNGs until 2026-09-30), build5 (first Preview APK), build6 (OTA updater),
build7 (blank seed + fingerprint re-anchor; still runnable from here) — and "superseded by
`scripts/build8.ps1` on 2026-09-30 (virgin-cycle19 brief 03); kept for history, never run
these for a new build."

### EDIT `scripts/README.md`

Replace the table with rows for: `build8.ps1`/`.cmd` (current), `publish-preview.ps1`/`.cmd`
(OTA, JS-only), `dev-phone.*`, `gatefield-replay.*`, `spike-maplibre.ps1`, `recolour-icon.py`,
`OTA-TROUBLESHOOTING.md`, `legacy/`. Keep the closing "Read by" paragraph, updated.

### EDIT `scripts/OTA-TROUBLESHOOTING.md`

After the build 7 bullet (line 67 ends "…while build 7 remains the installed Preview APK."),
add a bullet: build 7 was re-run 2026-09-30 with virgin-cycle18's native modules
(`app/modules/`, `plugins/withShowWhenLocked.js`), so its fingerprint is NOT
`cc04b458…` any more; read it with `cycles/virgin-cycle19/COMMANDS.md` §2 and record it here;
from build 8 on, `build8.ps1` prints it after each build.

### EDIT `deployment/CURRENT-STATE.md`

Line 93: `scripts/build7.ps1` → `scripts/build8.ps1` ("Current APK build … preflight
reflects the blank-seed app"); line 94: build4 row → "`scripts/legacy/build4.ps1` — the engine
builds 5-7 wrapped; legacy since 2026-09-30"; line 97: "build3 → build8".

## Verification plan

1. `ls scripts/` shows `build8.ps1`, `build8.cmd`, `legacy/` with the nine files, and no
   `build[3-7]*` at the top level; `git status --porcelain` shows renames + the new/edited
   files only.
2. `grep -n "Route map assets\|08_build_route_assets\|assets\\\\ways" scripts/build8.ps1` →
   nothing. `grep -c "ExecutionPolicy Bypass -File \"C:" scripts/build8.ps1` ≥ 3.
3. `grep -n "PSScriptRoot 'build4.ps1'" scripts/legacy/build7.ps1` → still line 180 (unchanged
   file, now next to build4 again).
4. `pwsh` syntax check if available (rules); otherwise a line-by-line read for unbalanced
   braces/`try`/`finally`.
5. **Nathan — `COMMANDS.md` §5**: `build8.ps1 -DryRun`. Expected: every section `OK`, section 6
   reports "seed not in bundle" with the bundle size, section 7 reports the archive estimate
   (~10-20 MB) and `.easignore` present, verdict "safe to spend a build", then the would-run
   line. Paste the output into `PROGRESS.md`.
6. Inspect (fresh Opus): reads build8.ps1 against Decision 3 section by section; confirms
   nothing from build4 §6 survived; confirms no file outside the list changed.

## On-device checklist

None from this brief. The next real `build8.ps1` run (whenever a native change needs it)
prints the fingerprint + APK size; Nathan records both in `OTA-TROUBLESHOOTING.md` /
`PROGRESS.md`.

## Out of scope

- A `play` profile / AAB build (`deployment/DEPLOYMENT-OPTIONS.md`) — build8 is written so a
  later `-BuildProfile play` is one `ValidateSet` entry plus one env check, but it is not added.
- Editing `publish-preview.ps1` (still correct). Retiring `spike-maplibre.ps1`.

## Open calls (default chosen — executor does NOT stop)

- **A. Default profile** `preview` (default) vs `development`. Preview is what every build
  since 5 has been.
- **B. Export check on by default** (default; ~1-2 min, `-SkipExportCheck` to skip) vs
  opt-in. On by default, because it is the one check that answers Nathan's original question
  every time.
- **C. Keep `build7.ps1` runnable from legacy** (default, free) vs also renaming it
  `build7-superseded.ps1`. Default: keep names; the folder says it.
