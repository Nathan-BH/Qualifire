<#
    Qualifire -- build 4: rebuild the Fast Refresh DEV CLIENT to carry the
    MapLibre native module (B-50/D-041). MapLibre is the ONLY native change
    since build 3 -- everything else on the phone (six tabs, the D-030 colour
    model, the ghost tower, persisted settings, B-40's comparison-window
    cache, the B-50 real map itself as JS/JSX) already arrives live over Fast
    Refresh the instant Metro connects, and needs no build at all.

    Build 3 was the last completed build, and it FAILED: the resulting
    *preview* APK froze its JS at build time, so Nathan installed it and found
    the old three-tab app, carrying none of his changes since (see
    cycles/cycle-008.md: "The preview APK is stale: it froze the JS at build
    time and shows none of this."). Build 4 was never run.

    Build 4 CANNOT repeat that failure class. A dev client has no baked-in JS
    bundle to go stale -- it streams its JavaScript from Metro
    (`npx expo start`) at runtime, on every launch. The only thing a dev-client
    build freezes is the native layer, and the only native layer change since
    build 3 is MapLibre.

    Nathan's ruling, 2026-08-17 (binding): no standalone/preview APK until the
    app is finalized. This script REFUSES -BuildProfile preview unless -Force
    is also given -- see section 0 below. Build 4 also folds in the whole
    MapLibre rebuild; there is no build 5 for that.

        cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
        .\build4.ps1 -DryRun    # run every check, spend nothing
        .\build4.ps1            # run every check, then spend the build (development -- the default)
        .\build4.ps1 -BuildProfile preview -Standalone   # standalone "Qualifire Preview" commute APK (2026-08-19)

    One script, two halves: PREFLIGHT (sections 0-6 -- reads only, changes
    nothing, costs no build slot) and BUILD (sections 7-8 -- ~10-20 min on
    Expo's servers, one of the 15 free Android builds a month). -DryRun stops
    cleanly at the boundary between them.

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
    # Nathan 2026-08-19 (cycle 021): explicit opt-in for the standalone "Qualifire
    # Preview" APK -- a rebuildable commute build, NOT the final app. Separate
    # from -Force so preflight failures still stop a preview build.
    [switch]$Standalone,
    [ValidateSet('preview', 'development')]
    [string]$BuildProfile = 'development'
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

    # -------------------------------------------- 0. profile gate (Nathan, 2026-08-17)
    if ($BuildProfile -eq 'preview') {
        Step '0. Profile gate -- standalone/preview is barred until the app is finalized'
        if (-not ($Force -or $Standalone)) {
            Warn "preview/standalone builds need -Standalone (Nathan 2026-08-19: a rebuildable commute APK that bakes in the CURRENT working tree; build 3's stale-JS failure is the precedent -- commit first, rebuild after every change you want on the bike)."
            $problems += 'BuildProfile preview requires -Standalone (or -Force).'
        } else {
            Warn 'preview requested with -Standalone/-Force -- the APK freezes whatever JS is in app/ RIGHT NOW. Make sure every feature you want is in the working tree (git status clean is the easy check).'
        }
    }

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

    # ----------------------------- 3. native slate -- MapLibre added (B-50/D-041)
    Step '3. Native slate -- build 4 adds ONE native module since build 3: MapLibre (B-50/D-041)'
    $pkg  = Get-Content (Join-Path $app 'package.json') -Raw | ConvertFrom-Json
    $deps = $pkg.dependencies.PSObject.Properties.Name
    foreach ($p in @('expo-audio', 'react-native-safe-area-context', '@maplibre/maplibre-react-native')) {
        if ($deps -notcontains $p) {
            $problems += "$p missing from package.json -- run: npx expo install $p"
        }
    }
    $plugins = @()
    $appJson = Get-Content (Join-Path $app 'app.json') -Raw | ConvertFrom-Json
    foreach ($pl in $appJson.expo.plugins) {
        if ($pl -is [string]) { $plugins += $pl } else { $plugins += $pl[0] }
    }
    foreach ($p in @('expo-location', 'expo-status-bar', 'expo-audio', '@maplibre/maplibre-react-native')) {
        if ($plugins -notcontains $p) { $problems += "app.json expo.plugins is missing $p" }
    }
    if ($problems.Count -eq 0) { Ok 'package.json and app.json plugins list all four native packages' }

    # MapLibre is the one module build 4 actually exists to install -- verify
    # it is really on disk, not just declared, and that it is an 11.x release
    # (D-041 pinned 11.3.6).
    $mlPkgPath = Join-Path $app 'node_modules\@maplibre\maplibre-react-native\package.json'
    if (Test-Path $mlPkgPath) {
        $mlPkg = Get-Content $mlPkgPath -Raw | ConvertFrom-Json
        if ($mlPkg.version -like '11.*') {
            Ok "MapLibre native module installed in node_modules, version $($mlPkg.version)"
        } else {
            $problems += "MapLibre installed but version is $($mlPkg.version) -- expected an 11.x release"
        }
    } else {
        $problems += 'node_modules\@maplibre\maplibre-react-native\package.json missing -- run: npm install (or npx expo install @maplibre/maplibre-react-native) in app/'
    }

    # The map actually points at the free tiles (B-50) rather than a stale or
    # placeholder style URL.
    $mapViewFile = Join-Path $app 'src\ui\routeMapView.tsx'
    if (Test-Path $mapViewFile) {
        if ((Get-Content $mapViewFile -Raw) -match 'tiles\.openfreemap\.org') {
            Ok 'routeMapView.tsx points at tiles.openfreemap.org (OpenFreeMap, no key)'
        } else {
            $problems += 'routeMapView.tsx no longer references tiles.openfreemap.org -- the map style source may have changed'
        }
    } else {
        $problems += 'src\ui\routeMapView.tsx not found'
    }

    # ------------------------ 4. preview variant (D-026), only relevant with -Force
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
        Ok "profile is $BuildProfile -- rebuilds the dev client in place. This IS build 4's expected path (Nathan, 2026-08-17): no standalone/preview APK until the app is finalized."
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
            if (-not $n.Value.image) { Ok "  $($n.Name) -> (no PNG; MapLibre/path rung only)"; continue }
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
    if ($BuildProfile -eq 'development') {
        Say 'It installs OVER the old dev client (com.nathanbonher.qualifire) and keeps its data.'
    } else {
        Say 'It installs OVER the old preview app (com.nathanbonher.qualifire.preview) and keeps its data.'
    }
    Say 'Status of past builds:  npx eas-cli build:list'
    Say 'On-device checklist: see BUILD-4-RUNBOOK.md section 5.'
}
finally { Pop-Location }
