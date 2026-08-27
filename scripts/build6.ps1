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
