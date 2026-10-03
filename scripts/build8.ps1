<#
    Qualifire -- build 8: the current native build of "Qualifire Preview"
    (app id com.nathanbonher.qualifire.preview, EAS profile "preview"),
    installed over the existing Preview APK. Its preflight describes the app
    as it is now (2026-10-03); the build itself is the build4.ps1 engine that
    built 5, 6 and 7.

    What the app is, and therefore what this script asserts:
      - Blank seed, permanent (Nathan 2026-09-06): the Preview ships no
        routes, ways, gates or sports. eas.json build.preview sets
        EXPO_PUBLIC_SEED_MODE=empty; src/store/seed.ts reads it at bundle
        time; publish-preview.ps1 sets the same value for OTA bundles.
      - The Leuven seed BYTES stay out too (virgin-cycle19 brief 01):
        app\metro.config.js + app\metro.seedRedirect.js swap the seed
        catalog, archive results, way manifest and three map PNGs for the
        stubs in app\assets\seed-stubs\ on every non-shipped bundle.
      - Native layer: expo-updates (OTA, fingerprint runtime policy),
        expo-location + expo-task-manager (background recording),
        expo-audio, MapLibre 11 on OpenFreeMap tiles, and the two local
        modules in app\modules\ (lock screen, ride notification) with
        plugins\withShowWhenLocked.js (virgin-cycles 18 and 20).
      - Upload archive (virgin-cycle19 brief 02): the repo-root .easignore
        uploads app\ only (about 8 MB instead of 1.1 GB). Its rule must read
        !/app -- written with a trailing slash, EAS's copy filter
        re-includes nothing and the build gets an empty archive.

    Steps (A-F only read; -DryRun installs nothing and spends nothing):
      A. expo-updates declared (the real run also runs npm install)
      B. EAS Update config: fingerprint policy, updates.url, preview channel
      C. blank seed: EXPO_PUBLIC_SEED_MODE=empty, the seed hook in app\src,
         the Metro seed redirect and its four stubs
      D. native layer: background-location packages, the local modules,
         the withShowWhenLocked plugin
      E. upload archive: .easignore rules + an upload-size estimate
      F. working-tree status (the APK freezes what is on disk now)
      G. the build4.ps1 engine: node, tsc + tests, native slate, variant,
         icons, verdict; then eas-cli login + build (skipped by -DryRun)

        powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\build8.ps1" -DryRun
        powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\build8.ps1"

    The real run does npm install, then queues the APK on Expo (about 10-20
    min, one EAS build slot); answer REUSE when asked about the keystore.
    Or double-click build8.cmd (build8.cmd dry = -DryRun).
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
    Write-Host 'Qualifire build 8 -- "Qualifire Preview" (com.nathanbonher.qualifire.preview), rebuilt in place' -ForegroundColor White

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

    # ------------------------------------------------------- C. blank seed
    # Problems found in C-E are collected and reported together, so one dry
    # run shows all of them; A, B and the two seed-mode checks stop at once.
    $b8problems = @()

    Step 'C. Blank seed (EXPO_PUBLIC_SEED_MODE=empty + the Metro seed redirect)'
    $seedMode = $eas.build.preview.env.EXPO_PUBLIC_SEED_MODE
    if ($seedMode -ne 'empty') {
        throw "eas.json build.preview.env.EXPO_PUBLIC_SEED_MODE is '$seedMode', expected 'empty' -- this build would ship the Leuven seed."
    }
    Ok 'eas.json build.preview sets EXPO_PUBLIC_SEED_MODE=empty (blank catalog)'

    $seedHits = Get-ChildItem -Path (Join-Path $app 'src') -Recurse -Include *.ts, *.tsx |
        Select-String -SimpleMatch 'EXPO_PUBLIC_SEED_MODE'
    if (-not $seedHits) {
        throw 'nothing under app/src reads EXPO_PUBLIC_SEED_MODE -- the seed would NOT be emptied. Do not ship this as a blank build.'
    }
    Ok "seed hook present: EXPO_PUBLIC_SEED_MODE is read in $(($seedHits | Select-Object -ExpandProperty Path -Unique | ForEach-Object { Split-Path $_ -Leaf }) -join ', ')"

    # virgin-cycle19 brief 01: keep the seed BYTES out of the bundle. These
    # five strings are the ones app\tests\seedstubs_suite.ts pins (test 1).
    $metroCfg = Join-Path $app 'metro.config.js'
    if (Test-Path $metroCfg) {
        $metroText = [string](Get-Content $metroCfg -Raw)
        $metroMissing = @(@('expo/metro-config', './metro.seedRedirect.js', 'resolveRequest', 'redirectResolution', 'seedModeFromEnv') |
            Where-Object { -not $metroText.Contains($_) })
        if ($metroMissing.Count -gt 0) {
            $b8problems += "app\metro.config.js does not mention $($metroMissing -join ', ') -- the seed redirect is not wired (brief 01)"
        } else {
            Ok 'metro.config.js wires the seed redirect (expo/metro-config + metro.seedRedirect.js via resolveRequest)'
        }
    } else {
        $b8problems += 'app\metro.config.js missing -- blank builds would bundle the Leuven seed files again (brief 01)'
    }
    $redirectJs = Join-Path $app 'metro.seedRedirect.js'
    if (Test-Path $redirectJs) {
        $redirectText = [string](Get-Content $redirectJs -Raw)
        if ($redirectText.Contains('SEED_FILES') -and $redirectText.Contains('assets/seed-stubs/')) {
            Ok 'metro.seedRedirect.js maps SEED_FILES to assets/seed-stubs/'
        } else {
            $b8problems += 'app\metro.seedRedirect.js has no SEED_FILES table pointing at assets/seed-stubs/ (brief 01)'
        }
    } else {
        $b8problems += 'app\metro.seedRedirect.js missing (brief 01)'
    }
    $stubNames = @('catalog.empty.json', 'results.empty.json', 'ways.empty.json', 'blank.png')
    $stubMissing = @($stubNames | Where-Object { -not (Test-Path (Join-Path (Join-Path $app 'assets\seed-stubs') $_)) })
    if ($stubMissing.Count -gt 0) {
        $b8problems += "app\assets\seed-stubs is missing $($stubMissing -join ', ') (brief 01)"
    } else {
        Ok "seed stubs present: $($stubNames -join ', ')"
    }
    foreach ($suite in @('seedstubs_suite.ts', 'easignore_suite.ts')) {
        if (Test-Path (Join-Path (Join-Path $app 'tests') $suite)) {
            Ok "pin test present: tests\$suite"
        } else {
            $b8problems += "app\tests\$suite missing (virgin-cycle19 brief 01/02 pin test)"
        }
    }

    # ----------------------------------------------- D. native layer (now)
    Step 'D. Native layer (background recording, local modules, lock-screen plugin)'
    $depNames = @($pkg.dependencies.PSObject.Properties.Name)
    $depMissing = @(@('expo-location', 'expo-task-manager') | Where-Object { $depNames -notcontains $_ })
    if ($depMissing.Count -gt 0) {
        $b8problems += "package.json does not declare $($depMissing -join ', ') -- background recording needs it"
    } else {
        Ok 'package.json declares expo-location + expo-task-manager (background recording)'
    }
    $pluginNames = @()
    foreach ($pl in $appJson.expo.plugins) {
        if ($pl -is [string]) { $pluginNames += $pl } else { $pluginNames += $pl[0] }
    }
    $lockPlugin = './plugins/withShowWhenLocked.js'
    if (($pluginNames -contains $lockPlugin) -and (Test-Path (Join-Path (Join-Path $app 'plugins') 'withShowWhenLocked.js'))) {
        Ok "app.json plugins include $lockPlugin (file present)"
    } else {
        $b8problems += "app.json plugins must include $lockPlugin and app\plugins\withShowWhenLocked.js must exist (virgin-cycle18)"
    }
    $modules = @(Get-ChildItem -LiteralPath (Join-Path $app 'modules') -Directory -ErrorAction SilentlyContinue)
    if ($modules.Count -eq 0) {
        $b8problems += 'app\modules has no local native module -- expected qualifire-lock-screen and qualifire-ride-notification (virgin-cycle18)'
    }
    foreach ($m in $modules) {
        if (Test-Path (Join-Path $m.FullName 'expo-module.config.json')) {
            Ok "local native module $($m.Name) (expo-module.config.json present)"
        } else {
            $b8problems += "app\modules\$($m.Name) has no expo-module.config.json -- Expo autolinking would skip it"
        }
    }

    # ------------------------------------- E. upload archive (brief 02 .easignore)
    Step 'E. Upload archive (repo-root .easignore uploads app\ only)'
    $easignore = Join-Path $repo '.easignore'
    if (Test-Path $easignore) {
        $rules = @(Get-Content $easignore | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' -and -not $_.StartsWith('#') })
        if ($rules -ccontains '!/app/') {
            $b8problems += ".easignore has the rule '!/app/' (trailing slash): EAS's copy filter re-includes NOTHING with it -- empty archive, failed build. It must read !/app (brief 02)"
        }
        $iGit = [array]::IndexOf($rules, '.git')
        $iAll = [array]::IndexOf($rules, '/*')
        $iApp = [array]::IndexOf($rules, '!/app')
        if ($iGit -lt 0 -or $iAll -lt 0 -or $iApp -lt 0) {
            $b8problems += '.easignore must contain the rules .git, /* and !/app (brief 02)'
        } elseif (-not (($iGit -lt $iAll) -and ($iAll -lt $iApp))) {
            $b8problems += '.easignore rules out of order -- expected .git, then /*, then !/app (later rules win)'
        } else {
            Ok '.easignore rules in order: .git, /*, !/app (no trailing slash)'
        }
    } else {
        $b8problems += '.easignore missing at the repo root -- EAS would upload the whole repo again (about 1.1 GB; brief 02)'
    }
    if (Test-Path (Join-Path $app '.easignore')) {
        $b8problems += 'app\.easignore exists -- EAS reads only the repo-root file, and this one moves the fingerprint. Move it to safe_to_delete (brief 02)'
    } else {
        Ok 'no app\.easignore (only the repo-root file is read)'
    }

    # Rough upload size: app\ minus what .easignore drops. EAS prints the real
    # figure ("Compressed project files ... (N MB)") when it uploads.
    $anyDepth = @('node_modules', '.expo', 'safe_to_delete', '_to_delete', '__pycache__')
    $topOnly  = @('dist', 'android')
    $skipExt  = @('.log', '.bak', '.apk', '.aab', '.gpx')
    function Measure-UploadBytes ([string]$Dir, [bool]$IsTop) {
        $sum = [long]0
        foreach ($e in @(Get-ChildItem -LiteralPath $Dir -Force -ErrorAction SilentlyContinue)) {
            if ($e.PSIsContainer) {
                if ($anyDepth -contains $e.Name) { continue }
                if ($IsTop -and ($topOnly -contains $e.Name)) { continue }
                $sum += Measure-UploadBytes $e.FullName $false
            } elseif ($skipExt -notcontains $e.Extension.ToLowerInvariant()) {
                $sum += $e.Length
            }
        }
        return $sum
    }
    $uploadMB = (Measure-UploadBytes $app $true) / 1MB
    if ($uploadMB -gt 50) {
        $b8problems += ('upload estimate {0:N1} MB is over 50 MB -- something new and big landed in app\ (brief 02 measured about 8 MB)' -f $uploadMB)
    } else {
        Ok ('upload estimate {0:N1} MB (app\ minus node_modules, .expo, dist, android, bins, logs)' -f $uploadMB)
    }

    # ---------------------------------------------- F. working tree status
    Step 'F. Working tree (the APK freezes what is on disk now)'
    $ErrorActionPreference = 'Continue'
    $dirty = git status --porcelain 2>$null
    $ErrorActionPreference = 'Stop'
    if ($dirty) {
        Warn 'git working tree is NOT clean -- uncommitted changes will be baked into the APK. Commit first unless that is what you want.'
    } else {
        Ok 'git working tree is clean'
    }

    # ----------------------------------------- verdict on build 8's own checks
    Step 'Build 8 checks (C-E) verdict'
    if ($b8problems.Count -gt 0) {
        $b8problems | ForEach-Object { Warn $_ }
        throw "build 8 preflight found $($b8problems.Count) problem(s) -- fix the above; nothing was built or spent"
    }
    Ok 'blank seed, native layer and upload archive check out -- handing over to the build4 engine'
}
finally { Pop-Location }

# ------------------------- G. the build4 engine (its preflight 0-5, then the build)
& (Join-Path $PSScriptRoot 'build4.ps1') -BuildProfile preview -Standalone `
    -DryRun:$DryRun -SkipTests:$SkipTests -NoWait:$NoWait

if (-not $DryRun) {
    Write-Host ''
    Say 'Build 8 notes (once the APK is installed over Qualifire Preview):'
    Say '  - installing over the existing Preview keeps its data: ride recordings, results, routes made on the phone.'
    Say '  - record the new fingerprint: npx.cmd eas-cli build:list --platform android --build-profile preview --limit 1'
    Say '    then add it to scripts\OTA-TROUBLESHOOTING.md (Known fingerprints by build); commit package-lock.json if step A changed it.'
    Say '  - publish-preview.ps1 sets EXPO_PUBLIC_SEED_MODE=empty and bundles through the same metro.config.js, so OTA publishes stay blank.'
}
