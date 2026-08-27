# BRIEF — EAS Update (OTA) setup for the Qualifire Preview APK (cycle 025 · D-039 execution tier)

Written 2026-08-27 by the Fable planning pass, from the code at HEAD (commit 0b4ba39,
working tree clean — every fact below measured on Nathan's machine today, including a
live probe of the device_bash environment's network and toolchain). Nathan's approval,
2026-08-27: **EAS Update goes in; runtime-version policy = `fingerprint`.**

You are the Sonnet executor. This brief is your ONLY input — execute exactly what is
written here. **Stop-on-ambiguity rule:** if any baseline check below fails, if a file
you must replace no longer matches its recorded md5, if a verification produces
anything this brief does not predict, or if you need to make ANY decision this brief
does not already make — STOP, change nothing further, and report the exact discrepancy
verbatim to the coordinator. Never rule on ambiguity yourself.

## Environment (measured 2026-08-27 — these constraints shaped the whole design)

- Repo is mounted at `$HOME/mnt/Qualifire`. Access it ONLY via `device_bash`. Every
  call is a fresh shell (no cwd/env carryover) with a ~45 s timeout — start every
  command with `cd "$HOME/mnt/Qualifire" && …`. Background processes do NOT survive
  across calls (re-measured today).
- Toolchain in that shell: node v22.23.2, npm 10.9.8, python3 3.10.12 — all present.
- **The shell has NO network to the npm registry** (curl to registry.npmjs.org →
  connection failure, measured today) **and NO Expo credentials** (no `~/.expo`).
  Therefore you can NEVER run `npm install`, `npx expo install`, `npx eas-cli`, or
  any `eas …` command. Do not try, and do not attempt `eas login` (interactive,
  needs Nathan's browser) — if you ever believe an eas/npm command is unavoidable,
  that is an ambiguity: STOP and report. Everything npm/EAS is deferred to Nathan's
  own authenticated PowerShell session via the scripts YOU will write in Phase 2.
- What DOES work locally (no network needed, node_modules already populated):
  `npx tsc --noEmit` (~17 s, give `timeout_ms` near 45000) and
  `node --experimental-strip-types tests/run.ts` (~3 s).
- **Git: unlike other cycle-025 briefs, THIS pass commits** — coordinator-sanctioned
  (2026-08-27), because Nathan's very next action (double-clicking build6.cmd) bakes
  the current tree into an APK and the config must be committed before that. Phase 4
  gives the exact `git add` paths and the exact message. You run no other git write.
- **Mount quirk (measured 2026-08-27): `unlink` is DENIED on this mount, `rename` is
  allowed.** A plain `git status` takes an optional index lock and then cannot remove
  it, stranding `.git/index.lock` and blocking every later git write with
  "index.lock exists". Therefore ALWAYS run status as
  `GIT_OPTIONAL_LOCKS=0 git status --porcelain` (every status command below is
  already written that way). If any git command still complains about
  `.git/index.lock`: recover with `mv .git/index.lock .git/index_lock_stale_N`
  (next free N -- rename works, `rm` does not; never delete). Two zero-byte stale
  markers from the planning pass, `.git/index_lock_stale_2026-08-27` and
  `.git/index_lock_stale_2`, already sit in `.git/` -- leave them alone. `git add`
  and `git commit` land their results by rename, so Phase 4 works despite the
  unlink ban.
- Never delete a file. Nothing here requires deleting. In particular
  `app/eas.json.bak` stays exactly where it is.

## Mandate — what this pass is and why

The standalone "Qualifire Preview" APK (D-043, build 5) has no OTA update path:
every JS-only change costs a full `eas build` (one of 15 free slots/month, ~10–20
min). This pass wires in **EAS Update**: after ONE more build (build 6, Nathan-run,
bakes in the `expo-updates` native module), JS-only changes ship from Nathan's PC in
~1–2 minutes with no build slot spent, and a numbered build is only needed again when
the native surface changes.

**Nathan's ruled choices (2026-08-27 — deviations are escalations, not your call):**

- Runtime-version policy = **`fingerprint`**: the runtime version derives from a hash
  of everything native. An update published from a tree whose native surface differs
  from a build's simply never applies to that build — fail-safe (phone keeps its
  current JS; it can never crash on missing native code). This repo's own history is
  the motivating case: MapLibre was added between builds 3 and 4; under `appVersion`
  (with `expo.version` stuck at 0.1.0, never bumped) such an update would have been
  delivered and crashed.
- Update channel `preview` on the `preview` build profile; a decorative `development`
  channel on the dev profile (unused — the dev client streams from Metro).
- New scripts named `build6.*` and `publish-preview.*`, cloned from the build5/build4
  structure. `build4.ps1` and `build5.ps1`/`.cmd` are NOT modified.
- No `eas update:configure` run (needs npm+auth you don't have): this brief contains
  the exact resulting config, hand-verified against current Expo docs, as whole-file
  replacements.
- The `expo-updates` version pin **`~56.0.24`** was derived from
  `app/node_modules/expo/bundledNativeModules.json` (the SDK-56 table `npx expo
  install` itself reads) — not guessed.
- NO `plugins[]` entry for expo-updates in app.json: with the package installed and
  `updates.url` present, the SDK applies its config plugin automatically at prebuild
  (per current Expo docs); adding one is not part of this pass.
- `app/app.config.js` is untouched: its `{ ...config }` spread carries
  `runtimeVersion`/`updates` into the preview variant automatically (verified), and
  the channel is a per-build-profile property in eas.json, not an app-config one.

## Baseline at HEAD (measured 2026-08-27)

- HEAD `0b4ba39` ("route naming updates"), status empty but for this brief file.
- md5 of the three files you will replace (the Phase 0 drift guard):
  - `app/package.json` → `1f320838ab50485262205662920dac5a`
  - `app/app.json` → `7174a47a772ddcd58c0ebed422b98139`
  - `app/eas.json` → `803709150238f57ba0ad8ca639a7fd6f`
- `app/app.config.js` → `ce7605b16fd94d4a2b71c71344706d85` (must be UNCHANGED at the
  end of your pass too).
- Tests at HEAD: 0 fail. **Do not assert a total test count anywhere** — another
  cycle-025 brief (RECORD variant display) may land before or after this one and
  changes the count. It touches NONE of this brief's files; "0 fail" is the invariant.
- Current `eas.json` is UTF-8-with-BOM + CRLF (a PowerShell `ConvertTo-Json` rewrite);
  your replacement normalizes it to plain UTF-8/LF, matching `eas.json.bak`'s human
  style. That is intended, not drift.

---

## Phase 0 — preconditions (read-only; ALL must hold or STOP)

```
cd "$HOME/mnt/Qualifire" && git log --oneline -1 | cat && GIT_OPTIONAL_LOCKS=0 git status --porcelain | head -20
cd "$HOME/mnt/Qualifire/app" && md5sum package.json app.json eas.json app.config.js
```

- The three md5s above must match exactly. If ANY differs → STOP (a later pass
  touched them; your whole-file replacements would clobber it).
- HEAD may have moved past `0b4ba39` (other briefs landing) — that alone is fine.
- Status may show files from OTHER work — fine, record them in your report —
  but if `app/package.json`, `app/app.json`, or `app/eas.json` appear dirty → STOP.

## Phase 1 — the three config files (whole-file replacements)

Write each file with a quoted heredoc (`cat > path <<'QEOF' … QEOF`), one device_bash
call per file, UTF-8 no BOM, LF endings. Content EXACT — byte-for-byte as below.

### 1a. `app/package.json` — adds `"expo-updates": "~56.0.24"` (nothing else moves)

```json
{
  "name": "qualifire",
  "version": "0.1.0",
  "private": true,
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@maplibre/maplibre-react-native": "^11.3.6",
    "expo": "~56.0.0",
    "expo-audio": "~56.0.13",
    "expo-dev-client": "~56.0.24",
    "expo-file-system": "~56.0.9",
    "expo-location": "~56.0.23",
    "expo-status-bar": "~56.0.4",
    "expo-task-manager": "~56.0.25",
    "expo-updates": "~56.0.24",
    "react": "19.2.3",
    "react-native": "0.85.3",
    "react-native-safe-area-context": "~5.7.0"
  },
  "devDependencies": {
    "@types/react": "*",
    "typescript": "^5.6.0"
  }
}
```

Do NOT touch `app/package-lock.json` — you have no npm to sync it. Nathan's
`build6.ps1` run does that on his side (its step A) and reminds him to commit it.

### 1b. `app/app.json` — adds `runtimeVersion` + `updates` after the `extra` block

```json
{
  "expo": {
    "name": "Qualifire",
    "slug": "qualifire",
    "version": "0.1.0",
    "orientation": "portrait",
    "userInterfaceStyle": "dark",
    "backgroundColor": "#101014",
    "platforms": [
      "android"
    ],
    "android": {
      "package": "com.nathanbonher.qualifire",
      "permissions": [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_LOCATION",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.WAKE_LOCK",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.VIBRATE"
      ],
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#17171b"
      }
    },
    "plugins": [
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "Qualifire uses your location to time your commute sectors.",
          "locationAlwaysAndWhenInUsePermission": "Qualifire keeps recording your ride while the app is in the background or the screen is off.",
          "isAndroidBackgroundLocationEnabled": true,
          "isAndroidForegroundServiceEnabled": true
        }
      ],
      "expo-status-bar",
      "expo-audio",
      "@maplibre/maplibre-react-native"
    ],
    "extra": {
      "eas": {
        "projectId": "a9f51461-f939-49a2-8c47-087fc39dc5f3"
      }
    },
    "runtimeVersion": {
      "policy": "fingerprint"
    },
    "updates": {
      "url": "https://u.expo.dev/a9f51461-f939-49a2-8c47-087fc39dc5f3"
    },
    "owner": "nahtanhbs-team",
    "icon": "./assets/icon.png"
  }
}
```

### 1c. `app/eas.json` — adds `channel` to both profiles; everything else unchanged

```json
{
  "cli": { "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": { "buildType": "apk" },
      "env": { "APP_VARIANT": "preview" }
    }
  }
}
```

## Phase 2 — the four new scripts (full verbatim content)

All four are NEW files in `scripts/`. Rules:

- **Pure ASCII** — no em-dashes, no smart quotes, no unicode arrows anywhere
  (Windows PowerShell 5.1 misreads UTF-8-without-BOM non-ASCII; `build5.ps1`'s
  plain-ASCII precedent is deliberate). The content below is already pure ASCII —
  copy it exactly.
- `.ps1` files: LF endings are fine (build5.ps1 is LF) — write with a plain heredoc.
- `.cmd` files: MUST be CRLF (build5.cmd is CRLF; cmd.exe can misparse LF-only
  batch files). Write with a heredoc, then convert: `sed -i 's/$/\r/' <file>`.
  Run the sed exactly once per file.

### 2a. `scripts/build6.ps1`

```powershell
<#
    Qualifire -- build 6: rebuild the standalone "Qualifire Preview" APK WITH
    the OTA updater baked in (EAS Update; Nathan's ruling 2026-08-27, runtime
    version policy = fingerprint). Same engine as builds 4/5 (build4.ps1 does
    all the preflight and the EAS call); this wrapper adds the update-specific
    steps first:

      A. npm install            -- materializes expo-updates ~56.0.24 (declared
                                   in app/package.json by the setup pass) and
                                   updates package-lock.json. COMMIT the lock
                                   file change after the build.
      B. config sanity          -- app.json must carry runtimeVersion policy
                                   "fingerprint" + this project's updates.url;
                                   eas.json build.preview must carry channel
                                   "preview". Refuses to build without them.
      C. delegate to build4.ps1 -- -BuildProfile preview -Standalone, exactly
                                   like build5.ps1 did.

        cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
        powershell -ExecutionPolicy Bypass -File .\build6.ps1 -DryRun   # checks only -- installs nothing, spends nothing
        powershell -ExecutionPolicy Bypass -File .\build6.ps1           # npm install + queue the APK (~10-20 min); REUSE the keystore

    (Nathan's machine needs the -ExecutionPolicy Bypass prefix every time --
    or double-click build6.cmd, which does exactly that.)

    Why this build exists: the build-5 APK has no updater native code, so it
    can never receive an OTA update. Build 6 bakes in expo-updates + the
    "preview" channel + the fingerprint runtime version. From then on:

      JS-only change   -> scripts\publish-preview.ps1  (~1-2 min, no build slot)
      native change    -> the next numbered build (clone this wrapper)

    Which app it overwrites: com.nathanbonher.qualifire.preview -- the old
    Qualifire Preview icon -- keeping its data. The dev client
    (com.nathanbonher.qualifire) is untouched, exactly as with build 5.

    What rides: whatever JS is in app/ when you run this. Commit first.
#>
[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$SkipTests,
    [switch]$NoWait
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$app  = Join-Path $repo 'app'

function Say  ($m) { Write-Host "  $m" }
function Step ($m) { Write-Host "`n$m" -ForegroundColor Cyan }
function Ok   ($m) { Write-Host "  OK  $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  !!  $m" -ForegroundColor Yellow }

if (-not (Test-Path $app)) { throw "app folder not found at $app" }

Push-Location $app
try {
    Write-Host 'Qualifire build 6 -- preview APK with the OTA updater (EAS Update)' -ForegroundColor White

    # ------------------------------------------ A. updater dependency on disk
    Step 'A. expo-updates dependency'
    $pkg = Get-Content (Join-Path $app 'package.json') -Raw | ConvertFrom-Json
    if (-not $pkg.dependencies.'expo-updates') {
        throw 'package.json does not declare expo-updates -- the EAS Update setup pass (BRIEF-eas-update-setup) has not landed. Nothing to build.'
    }
    Ok "package.json declares expo-updates $($pkg.dependencies.'expo-updates')"

    if ($DryRun) {
        if (Test-Path (Join-Path $app 'node_modules\expo-updates\package.json')) {
            Ok 'expo-updates already in node_modules'
        } else {
            Warn 'expo-updates not yet in node_modules -- the real run will npm install it'
        }
    } else {
        Say 'npm install --no-audit --no-fund   (syncs node_modules + package-lock.json)'
        $ErrorActionPreference = 'Continue'   # npm chats on stderr; only the exit code decides
        npm install --no-audit --no-fund
        $code = $LASTEXITCODE
        $ErrorActionPreference = 'Stop'
        if ($code -ne 0) { throw "npm install failed (exit $code)" }
        if (-not (Test-Path (Join-Path $app 'node_modules\expo-updates\package.json'))) {
            throw 'npm install succeeded but node_modules\expo-updates is still missing'
        }
        Ok 'expo-updates installed in node_modules'
        $ErrorActionPreference = 'Continue'
        $lockDirty = git status --porcelain -- package-lock.json 2>$null
        $ErrorActionPreference = 'Stop'
        if ($lockDirty) { Warn 'package-lock.json changed -- COMMIT it after this build.' }
    }

    # ------------------------------------------------ B. update config sanity
    Step 'B. EAS Update config (fingerprint policy + preview channel)'
    $appJson = Get-Content (Join-Path $app 'app.json') -Raw | ConvertFrom-Json
    if ($appJson.expo.runtimeVersion.policy -ne 'fingerprint') {
        throw "app.json expo.runtimeVersion.policy is '$($appJson.expo.runtimeVersion.policy)', expected 'fingerprint' (Nathan's ruling 2026-08-27)"
    }
    Ok 'runtimeVersion policy is fingerprint'
    $expectedUrl = 'https://u.expo.dev/a9f51461-f939-49a2-8c47-087fc39dc5f3'
    if ($appJson.expo.updates.url -ne $expectedUrl) {
        throw "app.json expo.updates.url is '$($appJson.expo.updates.url)', expected $expectedUrl"
    }
    Ok 'updates.url points at this EAS project'
    $eas = Get-Content (Join-Path $app 'eas.json') -Raw | ConvertFrom-Json
    if ($eas.build.preview.channel -ne 'preview') {
        throw "eas.json build.preview.channel is '$($eas.build.preview.channel)', expected 'preview'"
    }
    Ok 'eas.json preview profile is on channel "preview"'
}
finally { Pop-Location }

# ------------------------------------- C. the build itself (the build4 engine)
& (Join-Path $PSScriptRoot 'build4.ps1') -BuildProfile preview -Standalone `
    -DryRun:$DryRun -SkipTests:$SkipTests -NoWait:$NoWait
```

### 2b. `scripts/build6.cmd` (write, then `sed -i 's/$/\r/'`)

```bat
@echo off
rem Double-clickable launcher for build 6 (Qualifire Preview APK with the OTA updater).
rem Usage: build6.cmd        -> npm install + queue the build
rem        build6.cmd dry    -> preflight only (-DryRun)
cd /d "%~dp0"
if /i "%~1"=="dry" (
  powershell -ExecutionPolicy Bypass -File ".\build6.ps1" -DryRun
) else (
  powershell -ExecutionPolicy Bypass -File ".\build6.ps1" %*
)
pause
```

### 2c. `scripts/publish-preview.ps1`

```powershell
<#
    Qualifire -- publish a JS-only OTA update to the standalone "Qualifire
    Preview" APK over EAS Update (channel "preview"). Set up 2026-08-27
    (Nathan's ruling: runtime-version policy = fingerprint); the first APK
    that can receive these updates is build 6 (scripts\build6.ps1).

        cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
        powershell -ExecutionPolicy Bypass -File .\publish-preview.ps1 -DryRun                  # preflight only, publishes nothing
        powershell -ExecutionPolicy Bypass -File .\publish-preview.ps1                          # publish; message = last commit subject
        powershell -ExecutionPolicy Bypass -File .\publish-preview.ps1 -Message "what changed"  # publish with an explicit message

    (Or double-click publish-preview.cmd. -ExecutionPolicy Bypass always.)

    What this does: bundles the CURRENT JS in app/ (npx expo export under the
    hood) and uploads it to EAS Update -- ~1-2 minutes, NO build slot spent.
    The phone downloads it on the next launch and APPLIES it on the launch
    after that: open the app on network, close it fully, open it again. Two
    launches is normal EAS Update behaviour -- NOT build-3-style staleness.

    When this is NOT enough: any native-surface change (new/upgraded native
    dependency, app.json plugins/permissions/icon/package, SDK upgrade)
    changes the FINGERPRINT runtime version. An update published after such a
    change silently never applies to older builds -- fail-safe: the phone just
    keeps its current JS; it can never crash on missing native code. The fix
    is the next numbered build (clone build6.ps1). Debugging:
        npx eas-cli update:list
        npx eas-cli fingerprint:compare

    Commit first (same D-043 discipline as builds): this publishes whatever
    is in the working tree. The script warns on a dirty tree but proceeds.

    SDK 55+ requires --environment on eas update; this script passes
    "preview". If eas-cli ever rejects that environment, report it back
    rather than hand-editing the flag.
#>
[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$SkipTests,
    [string]$Message = ''
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$app  = Join-Path $repo 'app'

function Say  ($m) { Write-Host "  $m" }
function Step ($m) { Write-Host "`n$m" -ForegroundColor Cyan }
function Ok   ($m) { Write-Host "  OK  $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  !!  $m" -ForegroundColor Yellow }
function Would($m) { Write-Host "  (dry run) would $m" -ForegroundColor DarkGray }

# Same rationale as build4.ps1: native stderr chatter must not be fatal; only
# the exit code decides.
function Invoke-Native {
    param([scriptblock]$Cmd)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $out  = & $Cmd 2>&1 | ForEach-Object { "$_" }
        $code = $LASTEXITCODE
    } finally { $ErrorActionPreference = $prev }
    [pscustomobject]@{ Output = $out; Code = $code }
}

if (-not (Test-Path $app)) { throw "app folder not found at $app" }

Push-Location $app
try {
    Write-Host 'Qualifire -- OTA publish to the Preview APK (channel: preview)' -ForegroundColor White
    if ($DryRun) { Warn 'DRY RUN -- checks only, nothing will be published' }

    # -------------------------------- 0. the updater must exist to publish to
    Step '0. Updater present and configured (build 6 must have landed)'
    $pkg = Get-Content (Join-Path $app 'package.json') -Raw | ConvertFrom-Json
    if (-not $pkg.dependencies.'expo-updates') {
        throw 'package.json does not declare expo-updates -- run the EAS Update setup + build6 first'
    }
    if (-not (Test-Path (Join-Path $app 'node_modules\expo-updates\package.json'))) {
        throw 'expo-updates not in node_modules -- run build6.ps1 (its npm install step) first'
    }
    $appJson = Get-Content (Join-Path $app 'app.json') -Raw | ConvertFrom-Json
    if ($appJson.expo.runtimeVersion.policy -ne 'fingerprint') {
        throw "app.json runtimeVersion policy is '$($appJson.expo.runtimeVersion.policy)', expected 'fingerprint'"
    }
    if ($appJson.expo.updates.url -ne 'https://u.expo.dev/a9f51461-f939-49a2-8c47-087fc39dc5f3') {
        throw 'app.json expo.updates.url missing or wrong'
    }
    $eas = Get-Content (Join-Path $app 'eas.json') -Raw | ConvertFrom-Json
    if ($eas.build.preview.channel -ne 'preview') {
        throw 'eas.json build.preview.channel is not "preview"'
    }
    Ok 'expo-updates installed; fingerprint policy + updates.url + preview channel all configured'
    Say 'reminder: only builds >= 6 carry the updater -- the build-5 APK never receives updates.'

    # --------------------------------------------------------- 1. toolchain
    Step '1. Toolchain'
    $node = (node --version)
    Say "node $node"
    if ([int](($node -replace '^v(\d+)\..*$', '$1')) -lt 22) {
        throw "node 22+ required (the test runner uses --experimental-strip-types); found $node"
    }
    Ok 'node version fine'

    # -------------------------------------------------------- 2. preflight
    Step '2. Preflight -- typecheck and tests (same gate as a build)'
    if ($SkipTests) {
        Warn 'skipped by -SkipTests'
    } else {
        Say 'npx tsc --noEmit'
        $r = Invoke-Native { npx tsc --noEmit }
        if ($r.Code -ne 0) {
            $r.Output | ForEach-Object { Say $_ }
            throw 'TypeScript errors -- fix before publishing'
        }
        Ok 'tsc clean'

        Say 'node --experimental-strip-types tests/run.ts'
        $r = Invoke-Native { node --experimental-strip-types tests/run.ts }
        $summary = $r.Output | Select-String -Pattern '^\d+ tests:' | Select-Object -Last 1
        if ($r.Code -ne 0) {
            $r.Output | Select-String -Pattern '^FAIL' | ForEach-Object { Warn $_ }
            throw 'test failures -- fix before publishing'
        }
        Ok $summary
    }

    # -------------------------------- 3. commit-first discipline (D-043)
    Step '3. Working tree (the publish bakes whatever is in app/ RIGHT NOW)'
    $r = Invoke-Native { git status --porcelain }
    if ($r.Code -eq 0 -and $r.Output) {
        $r.Output | ForEach-Object { Warn $_ }
        Warn 'working tree is dirty -- commit first is the discipline. Publishing anyway, tree as-is.'
    } elseif ($r.Code -eq 0) {
        Ok 'working tree clean'
    } else {
        Warn 'could not read git status -- continuing'
    }

    if (-not $Message) {
        $r = Invoke-Native { git log -1 --format=%s }
        if ($r.Code -eq 0 -and $r.Output) { $Message = ($r.Output | Select-Object -Last 1) }
        if (-not $Message) { $Message = 'qualifire preview OTA update' }
        Say "no -Message given; using last commit subject: $Message"
    }

    if ($DryRun) {
        Step 'Dry run complete.'
        Would "run: npx eas-cli update --channel preview --message ""$Message"" --environment preview"
        Say 'Rerun without -DryRun to actually publish.'
        return
    }

    # --------------------------------------------- 4. account + publish
    Step '4. Expo account'
    $r = Invoke-Native { npx eas-cli whoami }
    if ($r.Code -ne 0) {
        Say 'not logged in -- opening login'
        $ErrorActionPreference = 'Continue'   # login is interactive; let it talk
        npx eas-cli login
        $code = $LASTEXITCODE
        $ErrorActionPreference = 'Stop'
        if ($code -ne 0) { throw 'login failed' }
    } else {
        Ok "logged in as $($r.Output | Select-Object -Last 1)"
    }

    Step '5. Publishing (channel: preview)'
    Say 'bundles locally (npx expo export) then uploads -- ~1-2 min, spends NO build slot.'
    $ErrorActionPreference = 'Continue'
    npx eas-cli update --channel preview --message "$Message" --environment preview
    $code = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($code -ne 0) { throw 'eas update reported an error -- check the output above' }

    Step 'Done.'
    Say 'On the phone: open Qualifire Preview (on network), close it FULLY, open it again.'
    Say 'The update downloads on the first launch and applies on the second.'
    Say 'If the phone stays on old JS: the fingerprint may have moved (native change'
    Say 'since the last build?) -- check with: npx eas-cli update:list'
}
finally { Pop-Location }
```

### 2d. `scripts/publish-preview.cmd` (write, then `sed -i 's/$/\r/'`)

```bat
@echo off
rem Double-clickable launcher for the Qualifire Preview OTA publish (EAS Update).
rem Usage: publish-preview.cmd        -> publish (message = last commit subject)
rem        publish-preview.cmd dry    -> preflight only (-DryRun)
cd /d "%~dp0"
if /i "%~1"=="dry" (
  powershell -ExecutionPolicy Bypass -File ".\publish-preview.ps1" -DryRun
) else (
  powershell -ExecutionPolicy Bypass -File ".\publish-preview.ps1" %*
)
pause
```

## Phase 3 — verification (run all; every one must hold)

1. JSON integrity + exact fields:
   ```
   cd "$HOME/mnt/Qualifire" && python3 -c "
   import json
   p=json.load(open('app/package.json')); a=json.load(open('app/app.json')); e=json.load(open('app/eas.json'))
   assert p['dependencies']['expo-updates']=='~56.0.24', p['dependencies'].get('expo-updates')
   assert len(p['dependencies'])==12, len(p['dependencies'])
   x=a['expo']
   assert x['runtimeVersion']=={'policy':'fingerprint'}, x.get('runtimeVersion')
   assert x['updates']=={'url':'https://u.expo.dev/a9f51461-f939-49a2-8c47-087fc39dc5f3'}, x.get('updates')
   assert x['extra']['eas']['projectId']=='a9f51461-f939-49a2-8c47-087fc39dc5f3'
   assert 'expo-updates' not in [pl if isinstance(pl,str) else pl[0] for pl in x['plugins']], 'no plugins entry, per brief'
   assert e['cli']=={'appVersionSource':'remote'}
   assert e['build']['development']['channel']=='development' and e['build']['development']['developmentClient']==True
   assert e['build']['preview']['channel']=='preview' and e['build']['preview']['env']=={'APP_VARIANT':'preview'}
   print('config OK')"
   ```
   → prints `config OK`.
2. `cd "$HOME/mnt/Qualifire/app" && npx tsc --noEmit` → clean, exit 0
   (`timeout_ms` near 45000). Nothing imports expo-updates, so the missing
   node_modules copy cannot break this — if tsc fails, STOP and escalate.
3. `cd "$HOME/mnt/Qualifire/app" && node --experimental-strip-types tests/run.ts`
   → summary line shows **0 fail** (total count varies with the other in-flight
   brief; do not assert it).
4. Script sanity greps (all from repo root):
   - `grep -c "build4.ps1" scripts/build6.ps1` → 3 (two in the header comment --
     the "Same engine as builds 4/5" line and its step C -- plus one in the
     delegation call). [Corrected 2026-08-27 after an executor stop: the planning
     pass had miscounted the header comment; the script content is unchanged and
     byte-verified, md5 14fbf03d1514da6d26f56b4e782defd9.]
   - `grep -n -- "-BuildProfile preview -Standalone" scripts/build6.ps1` → exactly
     two matches (the header comment's step C line and the real delegation line,
     whose backtick continuation carries the remaining arguments). [Same
     correction pass: previously miscounted as one.]
   - `grep -c -- "--channel preview" scripts/publish-preview.ps1` → 2 (the dry-run
     Would line + the real call).
   - `grep -c -- "--environment preview" scripts/publish-preview.ps1` → 2 (same two).
   - `grep -rIl $'\xE2' scripts/build6.ps1 scripts/publish-preview.ps1 scripts/build6.cmd scripts/publish-preview.cmd` → no output (pure ASCII: no UTF-8 punctuation anywhere).
   - `file scripts/build6.cmd scripts/publish-preview.cmd` → both report CRLF line
     terminators; `file scripts/build6.ps1 scripts/publish-preview.ps1` → ASCII text,
     no CRLF requirement.
5. Untouched files: `cd "$HOME/mnt/Qualifire/app" && md5sum app.config.js` →
   `ce7605b16fd94d4a2b71c71344706d85`, and `ls eas.json.bak` → still present.
6. `cd "$HOME/mnt/Qualifire" && GIT_OPTIONAL_LOCKS=0 git status --porcelain` → exactly these seven
   entries (plus any UNRELATED pre-existing entries you recorded in Phase 0, which
   you leave alone):
   ```
    M app/app.json
    M app/eas.json
    M app/package.json
   ?? scripts/build6.cmd
   ?? scripts/build6.ps1
   ?? scripts/publish-preview.cmd
   ?? scripts/publish-preview.ps1
   ```
   (Plus `?? cycles/cycle-025-briefs/BRIEF-eas-update-setup.md` — this brief itself,
   which the planning pass wrote and which you commit along with your work.)

## Phase 4 — commit (coordinator-sanctioned for this pass)

```
cd "$HOME/mnt/Qualifire" && git add app/package.json app/app.json app/eas.json scripts/build6.ps1 scripts/build6.cmd scripts/publish-preview.ps1 scripts/publish-preview.cmd cycles/cycle-025-briefs/BRIEF-eas-update-setup.md && git commit -m "cycle025: EAS Update OTA setup -- expo-updates config, build6 + publish-preview scripts (BRIEF-eas-update-setup)"
```

Then verify: `git log --oneline -1 | cat` shows that message, and
`GIT_OPTIONAL_LOCKS=0 git status --porcelain` shows none of the eight paths (only pre-existing unrelated
entries, if Phase 0 recorded any). Add NOTHING beyond the eight listed paths —
never `git add -A`.

## Phase 5 — Nathan handoff (include VERBATIM in your report; you do NOT execute any of it)

> **Nathan — what happens next (on your PC, not the agents'):**
>
> 1. **Build 6** (the one unavoidable rebuild that bakes in the updater): double-click
>    `scripts\build6.cmd` — or `build6.cmd dry` first for a free preflight. It runs
>    `npm install` (adds expo-updates ~56.0.24 to node_modules and updates
>    package-lock.json), checks the new config, then hands off to the usual build4
>    engine: tsc + tests + `eas build` preview (~10–20 min on Expo's servers, one of
>    the 15 free monthly slots). **Keystore prompt: REUSE the existing one**, as
>    always. If it asks you to log in, that's the normal interactive `eas login`.
> 2. Install the APK from the printed link — it replaces the old Qualifire Preview
>    (`com.nathanbonher.qualifire.preview`), keeps its data, leaves the dev client
>    alone.
> 3. **Commit `app/package-lock.json`** when the script reminds you (the npm install
>    updates it on your side; the agents can't — no npm in their sandbox).
> 4. **Test the OTA loop once:** double-click `scripts\publish-preview.cmd`. When it
>    finishes, on the phone: open Qualifire Preview (on WiFi/data), close it fully,
>    open it again — the update applies on that second launch. Two launches is
>    normal EAS Update behaviour, not the build-3 staleness bug.
> 5. **From then on:** JS/TS/asset/catalog change → `publish-preview.cmd` (~1–2 min,
>    free). Native change (new native dependency, app.json plugins/permissions,
>    SDK upgrade) → next numbered build (clone build6.ps1 → build7.ps1). With the
>    fingerprint policy, publishing after an unbuilt native change is harmless: the
>    phone just quietly keeps its current JS until the next build — the symptom is
>    "my update didn't arrive", never a crash. `npx eas-cli update:list` and
>    `npx eas-cli fingerprint:compare` (run in `app\`) are the debug commands.
> 6. One known soft spot: `eas update` on SDK 55+ requires an `--environment` flag;
>    the script passes `preview`. If eas-cli ever rejects that environment name,
>    tell the team rather than editing the script — the fix is a one-time creation
>    on the EAS dashboard.

## Must-not-change list (byte-identical at the end of your pass)

`scripts/build4.ps1` · `scripts/build5.ps1` · `scripts/build5.cmd` ·
`app/app.config.js` · `app/eas.json.bak` (and never delete it) ·
`app/package-lock.json` · `app/src/**` · `app/core/**` · `app/tests/**` ·
`app/assets/**` · `app/App.tsx` · `app/tsconfig.json` · `demos/**` · `design/**` ·
`data/**` · `product/**` · `IDEAS.md` · `STATE.md` · `BUILD-4-RUNBOOK.md` ·
every other file in `cycles/`.

## Include in your report

1. Phase 0 outputs (HEAD, md5 matches, any pre-existing dirty files you left alone).
2. The Phase 3 verification outputs, verbatim (config OK line, tsc exit, test
   summary line, the grep/file results, final git status).
3. The commit hash.
4. The Phase 5 Nathan handoff block, verbatim.
5. Any deviation, however small — a deviation you did not escalate mid-run is a
   report-time escalation, not a footnote.
