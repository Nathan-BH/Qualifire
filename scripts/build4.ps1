<#
    Qualifire -- build 4: bake the current JS into the standalone preview APK.

    Build 3 shipped the native slate (expo-audio, react-native-safe-area-context)
    and gave the preview profile its own app id. NOTHING NATIVE HAS CHANGED
    SINCE. Build 4 exists only to freeze in the JS that landed after it: six
    tabs, the live route map, the D-030 colour model, the ghost tower, persisted
    settings, and the corrected launcher icon.

        cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
        .\build4.ps1 -DryRun    # run every check, spend nothing
        .\build4.ps1            # run every check, then spend the build

    One script, two halves: PREFLIGHT (sections 1-6 -- reads only, changes
    nothing, costs no build slot) and BUILD (section 7 -- ~10-20 min on Expo's
    servers, one of the 15 free Android builds a month). -DryRun stops cleanly
    at the boundary between them.

    Keystore prompt during the build: REUSE the existing keystore. Details and
    the on-device checklist are in BUILD-4-RUNBOOK.md at the repo root.

    Safe to run as often as you like -- the preflight half never writes.
#>
[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$SkipTests,
    [switch]$NoWait,
    [switch]$Force,
    [ValidateSet('preview', 'development')]
    [string]$BuildProfile = 'preview'
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$app  = Join-Path $repo 'app'

function Say  ($m) { Write-Host "  $m" }
function Step ($m) { Write-Host "`n$m" -ForegroundColor Cyan }
function Ok   ($m) { Write-Host "  OK  $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  !!  $m" -ForegroundColor Yellow }
function Would($m) { Write-Host "  (dry run) would $m" -ForegroundColor DarkGray }

# PowerShell with $ErrorActionPreference='Stop' treats ANYTHING a native command
# writes to stderr as a terminating error -- node's harmless
# MODULE_TYPELESS_PACKAGE_JSON warning was enough to kill the run. So native
# calls go through here: stderr is captured as text, and only the EXIT CODE
# decides success.
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

# Anything added here stops the build before it is queued. -Force overrides.
$problems = @()

Push-Location $app
try {
    Write-Host "Qualifire build 4 -- $BuildProfile" -ForegroundColor White
    Say "repo: $repo"
    if ($DryRun) { Warn 'DRY RUN -- checks only, no build will be queued' }

    # ---------------------------------------------------------------- 1. tools
    Step '1. Toolchain'
    $node = (node --version)
    Say "node $node"
    if ([int](($node -replace '^v(\d+)\..*$', '$1')) -lt 22) {
        throw "node 22+ required (the test runner uses --experimental-strip-types); found $node"
    }
    Ok 'node version fine'

    # ------------------------------------------------------------- 2. preflight
    Step '2. Preflight -- typecheck and tests'
    if ($SkipTests) {
        Warn 'skipped by -SkipTests'
    } else {
        Say 'npx tsc --noEmit'
        $r = Invoke-Native { npx tsc --noEmit }
        if ($r.Code -ne 0) {
            $r.Output | ForEach-Object { Say $_ }
            throw 'TypeScript errors -- fix before building'
        }
        Ok 'tsc clean'

        Say 'node --experimental-strip-types tests/run.ts'
        $r = Invoke-Native { node --experimental-strip-types tests/run.ts }
        $summary = $r.Output | Select-String -Pattern '^\d+ tests:' | Select-Object -Last 1
        if ($r.Code -ne 0) {
            $r.Output | Select-String -Pattern '^FAIL' | ForEach-Object { Warn $_ }
            throw 'test failures -- fix before building'
        }
        Ok $summary
    }

    # -------------------------------------------------- 3. native slate (build 3)
    Step '3. Native slate -- unchanged since build 3, so nothing to install'
    $pkg  = Get-Content (Join-Path $app 'package.json') -Raw | ConvertFrom-Json
    $deps = $pkg.dependencies.PSObject.Properties.Name
    foreach ($p in @('expo-audio', 'react-native-safe-area-context')) {
        if ($deps -notcontains $p) {
            $problems += "$p missing from package.json -- run: npx expo install $p"
        }
    }
    $plugins = @()
    $appJson = Get-Content (Join-Path $app 'app.json') -Raw | ConvertFrom-Json
    foreach ($pl in $appJson.expo.plugins) {
        if ($pl -is [string]) { $plugins += $pl } else { $plugins += $pl[0] }
    }
    foreach ($p in @('expo-location', 'expo-status-bar', 'expo-audio')) {
        if ($plugins -notcontains $p) { $problems += "app.json expo.plugins is missing $p" }
    }
    if ($problems.Count -eq 0) { Ok 'both native packages present and the plugin list matches' }

    # --------------------------------------------- 4. preview variant (D-026)
    Step '4. Preview variant keeps its own app id, so it sits BESIDE the dev client'
    if ($BuildProfile -eq 'preview') {
        $cfg = Join-Path $app 'app.config.js'
        if (Test-Path $cfg) {
            $cfgText = Get-Content $cfg -Raw
            if ($cfgText -match 'APP_VARIANT') {
                Ok 'app.config.js present and reads APP_VARIANT'
            } else {
                $problems += 'app.config.js does not read APP_VARIANT -- preview would overwrite the dev client'
            }
        } else {
            $problems += 'app.config.js missing -- the preview would overwrite your dev client'
        }

        $eas = Get-Content (Join-Path $app 'eas.json') -Raw | ConvertFrom-Json
        if ($eas.build.preview.env.APP_VARIANT -eq 'preview') {
            Ok 'eas.json build.preview sets APP_VARIANT=preview'
        } else {
            $problems += 'eas.json build.preview does not set APP_VARIANT=preview'
        }
    } else {
        Warn "profile is $BuildProfile -- this REPLACES the dev client, not the preview app"
    }

    # ------------------------------------------------------------- 5. app icon
    Step '5. Launcher icon (corrected mark -- one of the things build 4 ships)'
    $icon    = Join-Path $app 'assets\icon.png'
    $adaptive = Join-Path $app 'assets\adaptive-icon.png'
    if (Test-Path $icon) { Ok 'assets\icon.png present' } else { $problems += 'assets\icon.png missing' }
    if (Test-Path $adaptive) {
        Ok 'assets\adaptive-icon.png present'
    } else {
        $problems += 'assets\adaptive-icon.png missing'
    }
    if ($appJson.expo.icon -eq './assets/icon.png') {
        Ok 'app.json references the icon'
    } else {
        $problems += "app.json expo.icon is '$($appJson.expo.icon)', expected ./assets/icon.png"
    }
    $fg = $appJson.expo.android.adaptiveIcon.foregroundImage
    if ($fg -eq './assets/adaptive-icon.png') {
        Ok 'app.json references the adaptive icon'
    } else {
        $problems += "app.json adaptiveIcon.foregroundImage is '$fg', expected ./assets/adaptive-icon.png"
    }

    # -------------------------------------------------------- 6. route assets
    Step '6. Route map assets (the faked map -- pre-rendered PNGs, no native module)'
    $routesJson = Join-Path $app 'assets\routes\routes.json'
    if (Test-Path $routesJson) {
        $routesDir = Split-Path -Parent $routesJson
        $rj = Get-Content $routesJson -Raw | ConvertFrom-Json
        $names = @($rj.routes.PSObject.Properties)
        Ok "$($names.Count) pre-rendered routes in routes.json"
        foreach ($n in $names) {
            $png = Join-Path $routesDir $n.Value.image
            if (Test-Path $png) {
                Ok "  $($n.Name) -> $($n.Value.image)"
            } else {
                $problems += "route $($n.Name) points at $($n.Value.image), which is not on disk"
            }
        }
    } else {
        $problems += 'assets\routes\routes.json missing -- regenerate with python data\analysis\08_build_route_assets.py'
    }

    # ------------------------------------------------------------- the verdict
    Step 'Preflight verdict'
    if ($problems.Count -gt 0) {
        $problems | ForEach-Object { Warn $_ }
        if (-not $Force) { throw 'preflight failed -- fix the above (or pass -Force to build anyway)' }
        Warn 'continuing because -Force was given'
    } else {
        Ok 'everything checks out -- safe to spend a build'
    }

    if ($DryRun) {
        Step 'Dry run complete.'
        Would "run: npx eas-cli build --platform android --profile $BuildProfile"
        Say 'Rerun without -DryRun to actually spend the build.'
        return
    }

    # ------------------------------------------------------- 7. account + build
    Step '7. Expo account'
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

    Step "8. Building ($BuildProfile, android)"
    Say 'this runs on Expo servers; ~10-20 min. Ctrl-C here does NOT cancel it.'
    Say 'If it asks about the Android keystore: REUSE the existing one.'
    $easArgs = @('eas-cli', 'build', '--platform', 'android', '--profile', $BuildProfile)
    if ($NoWait) { $easArgs += '--no-wait' }
    # streamed live so you can answer the keystore prompt -- no Invoke-Native
    # here, but stderr still must not be fatal.
    $ErrorActionPreference = 'Continue'
    npx @easArgs
    $code = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($code -ne 0) { throw 'eas build reported an error -- check the log link above' }

    Step 'Done.'
    Say 'Open the printed link on the phone and tap the APK to install.'
    Say 'It installs OVER the old preview app (same id) and keeps its data.'
    Say 'Status of past builds:  npx eas-cli build:list'
    Say 'On-device checklist: see BUILD-4-RUNBOOK.md section 5.'
}
finally { Pop-Location }
