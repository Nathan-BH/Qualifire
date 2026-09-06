<#
    Qualifire -- build 7: rebuild the standalone "Qualifire Preview" APK IN
    PLACE (same app id com.nathanbonher.qualifire.preview, same icon) with two
    things baked in. Same engine as builds 4/5/6 (build4.ps1 does all the
    preflight and the EAS call); this wrapper adds the build-7 steps first.

    1. BLANK SEED (Nathan, 2026-09-06 -- weeks of travel abroad, recording free
       rides and walks with ZERO pre-seeded Leuven/Belgium routes or gates).
       eas.json build.preview now sets EXPO_PUBLIC_SEED_MODE=empty; the seed
       (src/store/seed.ts) reads it at bundle time and ships an empty catalog.
       This is what Nathan asked for INSTEAD of a separate "Qualifire Virgin"
       app (rejected the same day: "the virgin build should replace the
       qualifire preview ... not a separate APK"). It is the standalone
       counterpart of scripts/dev-virgin.ps1, which does the same for one Metro
       session -- with one difference: a native build has no runtime switch,
       the seed mode is frozen at build time. To get the shipped Leuven catalog
       back on Preview, remove that env line from eas.json build.preview and
       run the next numbered build (or see the OTA note below).
       Sports need nothing: they are never pre-seeded in ANY build (WP-1).

    2. FINGERPRINT RE-ANCHOR. Build 6 was fingerprinted at 251ddb86...; the
       tree has moved since (package-lock.json expo-updates 56.0.24 -> 56.0.25,
       plus the virgin additions to app.config.js / eas.json), so OTA updates
       from scripts/publish-preview.ps1 no longer match the installed APK
       (scripts/OTA-TROUBLESHOOTING.md). A fresh native build establishes a
       new baseline from the tree as it is now. Nothing here bumps anything;
       step A only makes sure node_modules matches the committed lock file.
       Note the new fingerprint from the build page into OTA-TROUBLESHOOTING.md.

    OTA caveat (known, NOT handled here): EXPO_PUBLIC_* values are inlined into
    the JS bundle when it is bundled. eas.json's env applies to EAS Build only;
    publish-preview.ps1 bundles LOCALLY and does not set EXPO_PUBLIC_SEED_MODE,
    so an OTA published from it would flip Preview back to the shipped Leuven
    seed (a JS-only change -- the fingerprint still matches, so it WOULD
    apply). Do not publish while travelling unless that is what you want; after
    the trip it is also the cheapest way to get the commute routes back.

    What stays on the phone: installing over the existing Preview keeps its
    data. Ride recordings and stored results persist (separate store); routes
    and ways created ON the phone persist (catalog.user.json -- the seed is
    never copied to disk, see src/store/catalogStore.ts). Only the bundled
    seed (Morning / EveningA / EveningB ...) disappears, and results recorded on
    those seed ways are hidden in RESULTS until the seed returns (the list is
    catalog-driven; nothing is deleted).

    Steps:
      A. expo-updates dependency + npm install            (from build6.ps1)
      B. EAS Update config: fingerprint policy, updates.url, preview channel
      C. blank-seed wiring: eas.json build.preview.env.EXPO_PUBLIC_SEED_MODE
         must be "empty", and something under app/src must read it
      D. working-tree status (the APK freezes what is on disk NOW)
      E. delegate to build4.ps1 -BuildProfile preview -Standalone

        cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
        powershell -ExecutionPolicy Bypass -File .\build7.ps1 -DryRun   # checks only -- installs nothing, spends nothing
        powershell -ExecutionPolicy Bypass -File .\build7.ps1           # npm install + queue the APK (~10-20 min); REUSE the keystore

    (Nathan's machine needs the -ExecutionPolicy Bypass prefix every time --
    or double-click build7.cmd, which does exactly that.)
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
    Write-Host 'Qualifire build 7 -- "Qualifire Preview" rebuilt in place: blank seed + OTA fingerprint re-anchor' -ForegroundColor White

    # ------------------------------------------ A. updater dependency on disk
    Step 'A. expo-updates dependency'
    $pkg = Get-Content (Join-Path $app 'package.json') -Raw | ConvertFrom-Json
    if (-not $pkg.dependencies.'expo-updates') {
        throw 'package.json does not declare expo-updates -- the EAS Update setup (build 6) is missing. Nothing to build.'
    }
    Ok "package.json declares expo-updates $($pkg.dependencies.'expo-updates')"

    if ($DryRun) {
        if (Test-Path (Join-Path $app 'node_modules\expo-updates\package.json')) {
            Ok 'expo-updates already in node_modules'
        } else {
            Warn 'expo-updates not yet in node_modules -- the real run will npm install it'
        }
    } else {
        Say 'npm install --no-audit --no-fund   (syncs node_modules to package-lock.json)'
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
        if ($lockDirty) { Warn 'package-lock.json changed -- COMMIT it after this build (the fingerprint is baked from it).' }
    }

    # ------------------------------------------------ B. update config sanity
    Step 'B. EAS Update config (fingerprint policy + updates.url + preview channel)'
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
    if ($null -eq $eas.build.preview) {
        throw 'eas.json has no build.preview profile -- nothing to build.'
    }
    if ($eas.build.preview.channel -ne 'preview') {
        throw "eas.json build.preview.channel is '$($eas.build.preview.channel)', expected 'preview'"
    }
    Ok 'eas.json preview profile is on channel "preview"'

    # ------------------------------------------------- C. blank-seed wiring
    # build4.ps1 step 4 re-checks APP_VARIANT (the app id). THIS is the build-7
    # intent build4 does not know about, kept here on purpose: a later preview
    # build that wants the shipped seed back just leaves this step out of its
    # own wrapper instead of editing the shared engine.
    Step 'C. Blank seed (EXPO_PUBLIC_SEED_MODE=empty on the preview profile)'
    $seedMode = $eas.build.preview.env.EXPO_PUBLIC_SEED_MODE
    if ($seedMode -ne 'empty') {
        throw "eas.json build.preview.env.EXPO_PUBLIC_SEED_MODE is '$seedMode', expected 'empty' -- this build would ship the Leuven seed. Add the line (see the header) or use a different build script."
    }
    Ok 'eas.json build.preview sets EXPO_PUBLIC_SEED_MODE=empty (blank catalog)'

    $seedHits = Get-ChildItem -Path (Join-Path $app 'src') -Recurse -Include *.ts, *.tsx |
        Select-String -SimpleMatch 'EXPO_PUBLIC_SEED_MODE'
    if (-not $seedHits) {
        throw 'nothing under app/src reads EXPO_PUBLIC_SEED_MODE -- the seed would NOT be emptied. Do not ship this as a blank build.'
    }
    Ok "seed hook present: EXPO_PUBLIC_SEED_MODE is read in $(($seedHits | Select-Object -ExpandProperty Path -Unique | ForEach-Object { Split-Path $_ -Leaf }) -join ', ')"

    # ---------------------------------------------- D. working tree status
    Step 'D. Working tree (the APK freezes what is on disk now)'
    $ErrorActionPreference = 'Continue'
    $dirty = git status --porcelain 2>$null
    $ErrorActionPreference = 'Stop'
    if ($dirty) {
        Warn 'git working tree is NOT clean -- uncommitted changes will be baked into the APK. Commit first unless that is what you want (abroad you cannot rebuild).'
    } else {
        Ok 'git working tree is clean'
    }
}
finally { Pop-Location }

# ------------------------------------- E. the build itself (the build4 engine)
& (Join-Path $PSScriptRoot 'build4.ps1') -BuildProfile preview -Standalone `
    -DryRun:$DryRun -SkipTests:$SkipTests -NoWait:$NoWait

if (-not $DryRun) {
    Write-Host ''
    Say 'Build 7 notes (once the APK is installed over Qualifire Preview):'
    Say '  - first launch shows an EMPTY catalog: no routes, ways, gates or sports. Name a sport, then record.'
    Say '  - ride recordings, stored results and routes created on the phone are kept; only the bundled seed is gone.'
    Say '  - write the new fingerprint (build page) into scripts\OTA-TROUBLESHOOTING.md; commit package-lock.json if step A changed it.'
    Say '  - do NOT run publish-preview.ps1 while travelling: its OTA would bring the Leuven seed back (see the header).'
}
