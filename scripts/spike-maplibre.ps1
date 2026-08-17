<#
    Qualifire -- MapLibre install spike (part B of the cycle-014 Mobile Developer
    brief). Costs ZERO EAS builds: it only prebuilds and exports locally, on a
    throwaway branch, to prove @maplibre/maplibre-react-native resolves,
    typechecks and bundles under this exact repo before a single real build is
    spent on it. Style modelled on scripts/build4.ps1 -- preflight-style clear
    echo of each step, stop on first error, writes a report file next to it.

    DO NOT RUN THIS AUTOMATICALLY. Nathan runs it himself:

        cd "C:\Users\natha\Claude personal projects\Qualifire"
        .\scripts\spike-maplibre.ps1

    It will refuse to run if the git working tree is dirty (commit or stash
    first) -- this script creates a new branch and does not want to carry your
    uncommitted changes onto it, or off it if you bail out.

    Discard when done:  git checkout main; git clean -fd app/android app/dist; cd app; npm ci
    Keep it instead:    leave the branch, it costs nothing sitting there.
#>
[CmdletBinding()]
param(
    [switch]$SkipTypecheck
)

$ErrorActionPreference = 'Stop'
$repo   = Split-Path -Parent $PSScriptRoot   # script lives in scripts/, repo root is one level up
$app    = Join-Path $repo 'app'
$report = Join-Path $repo 'safe_to_delete\spike-maplibre-report.txt'

$reportDir = Split-Path -Parent $report
if (-not (Test-Path $reportDir)) { New-Item -ItemType Directory -Force -Path $reportDir | Out-Null }

function Say  ($m) { Write-Host "  $m" }
function Step ($m) { Write-Host "`n$m" -ForegroundColor Cyan }
function Ok   ($m) { Write-Host "  OK  $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  !!  $m" -ForegroundColor Yellow }
function Fail ($m) { Write-Host "  XX  $m" -ForegroundColor Red }

# Same stderr-is-not-fatal wrapper as build4.ps1 -- node's harmless
# MODULE_TYPELESS_PACKAGE_JSON warning would otherwise kill the run under
# $ErrorActionPreference = 'Stop'.
function Invoke-Native {
    param([scriptblock]$Cmd)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $global:LASTEXITCODE = 0
        $out  = & $Cmd 2>&1 | ForEach-Object { "$_" }
        $code = $LASTEXITCODE
    } finally { $ErrorActionPreference = $prev }
    [pscustomobject]@{ Output = $out; Code = $code }
}

$reportLines = New-Object System.Collections.Generic.List[string]
function Record($m) { $reportLines.Add($m) | Out-Null }

$result = 'UNKNOWN'
try {
    Write-Host 'Qualifire -- MapLibre install spike (zero EAS builds)' -ForegroundColor White
    Say "repo: $repo"
    Record "Qualifire MapLibre install spike -- run $(Get-Date -Format s)"
    Record "repo: $repo"

    if (-not (Test-Path $app)) { throw "app folder not found at $app" }

    # ------------------------------------------------------------ 1. toolchain
    Step '1. Toolchain'
    $node = (node --version)
    Say "node $node"
    Record "node: $node"

    $npx = (Invoke-Native { npx.cmd --version })
    if ($npx.Code -ne 0) { throw 'npx not found on PATH' }
    Say "npx $($npx.Output | Select-Object -Last 1)"
    Ok 'npx present'
    Record "npx: $($npx.Output | Select-Object -Last 1)"

    $git = (Invoke-Native { git --version })
    if ($git.Code -ne 0) { throw 'git not found on PATH' }
    Say "$($git.Output | Select-Object -Last 1)"
    Ok 'git present'
    Record "git: $($git.Output | Select-Object -Last 1)"

    # -------------------------------------------------------- 2. dirty check
    Step '2. Git working tree must be clean'
    Push-Location $repo
    try {
        $status = (Invoke-Native { git status --porcelain --untracked-files=no })
        if ($status.Code -ne 0) { throw 'git status failed -- is this a git repo?' }
        if (($status.Output | Where-Object { $_.Trim() -ne '' }).Count -gt 0) {
            $status.Output | ForEach-Object { Say $_ }
            throw 'working tree is dirty -- commit or stash before running the spike (it creates a branch and does not want your uncommitted work riding along)'
        }
        Ok 'working tree clean'
        Record 'git status: clean'

        # ---------------------------------------------------- 3. branch
        Step '3. Branch spike/maplibre'
        $branches = (Invoke-Native { git branch --list 'spike/maplibre' }).Output
        if ($branches -and ($branches -join '') -match 'spike/maplibre') {
            throw "branch spike/maplibre already exists -- delete it first (git branch -D spike/maplibre) or check out and reuse it manually; this script does not overwrite branches"
        }
        $r = Invoke-Native { git checkout -b spike/maplibre }
        if ($r.Code -ne 0) { $r.Output | ForEach-Object { Say $_ }; throw 'git checkout -b spike/maplibre failed' }
        Ok 'on branch spike/maplibre'
        Record 'branch: spike/maplibre created and checked out'

        # ---------------------------------------------- 4. gitignore hygiene
        Step '4. Ensure app/android/ and app/dist/ are gitignored'
        $gitignorePath = Join-Path $repo '.gitignore'
        $gitignoreText = if (Test-Path $gitignorePath) { Get-Content $gitignorePath -Raw } else { '' }
        $toAdd = @()
        foreach ($line in @('app/android/', 'app/dist/')) {
            if ($gitignoreText -notmatch [regex]::Escape($line)) { $toAdd += $line }
        }
        if ($toAdd.Count -gt 0) {
            $addText = ($toAdd -join [Environment]::NewLine)
            if ($gitignoreText -and -not $gitignoreText.EndsWith([Environment]::NewLine)) {
                $addText = [Environment]::NewLine + $addText
            }
            Add-Content -Path $gitignorePath -Value $addText
            Ok "added to .gitignore: $($toAdd -join ', ')"
            Record ".gitignore: added $($toAdd -join ', ')"
        } else {
            Ok '.gitignore already covers app/android/ and app/dist/'
            Record '.gitignore: already covers app/android/ and app/dist/'
        }
    } finally { Pop-Location }

    # ---------------------------------------------------- 5. expo install
    Step '5. npx expo install @maplibre/maplibre-react-native'
    Push-Location $app
    try {
        $r = Invoke-Native { npx.cmd expo install '@maplibre/maplibre-react-native' }
        $r.Output | ForEach-Object { Say $_ }
        if ($r.Code -ne 0) { throw 'expo install failed -- see output above' }
        Ok 'installed'
        Record 'expo install @maplibre/maplibre-react-native: OK'

        # ------------------------------------------------- 6. app.json plugin
        Step '6. Add plugin to app.json'
        $p = Join-Path $app 'app.json'
        $t = [IO.File]::ReadAllText($p)
        if ($t -match [regex]::Escape('"@maplibre/maplibre-react-native"')) {
            Ok 'plugin already present in app.json (unexpected on a fresh spike, but not fatal)'
            Record 'app.json plugin: already present'
        } else {
            $pluginsMatch = [regex]::Match($t, '"plugins"\s*:\s*\[(?<body>.*?)\n\s*\]', 'Singleline')
            if (-not $pluginsMatch.Success) {
                throw 'could not locate the "plugins" array in app.json -- add "@maplibre/maplibre-react-native" to expo.plugins by hand instead'
            }
            $bodyGroup    = $pluginsMatch.Groups['body']
            $audioMatches = [regex]::Matches($bodyGroup.Value, '"expo-audio"')
            if ($audioMatches.Count -ne 1) {
                throw "expected exactly one `"expo-audio`" entry inside app.json's plugins array to anchor the insertion, found $($audioMatches.Count) -- add `"@maplibre/maplibre-react-native`" to expo.plugins by hand instead"
            }
            $lastAudio  = $audioMatches[$audioMatches.Count - 1]
            $insertAt   = $bodyGroup.Index + $lastAudio.Index + $lastAudio.Length
            $insertText = ",`n      `"@maplibre/maplibre-react-native`""
            $t = $t.Insert($insertAt, $insertText)
            [IO.File]::WriteAllText($p, $t, [Text.UTF8Encoding]::new($false))
            Ok 'added "@maplibre/maplibre-react-native" to expo.plugins'
            Record 'app.json plugin: added (string insert right after "expo-audio")'
        }

        # --------------------------------------------------- 7. prebuild
        Step '7. npx expo prebuild --clean --platform android --no-install'
        Say 'verified against Expo CLI docs 2026-08-17: --no-install exists ("skip installing npm packages and CocoaPods")'
        $r = Invoke-Native { npx.cmd expo prebuild --clean --platform android --no-install }
        $r.Output | ForEach-Object { Say $_ }
        if ($r.Code -ne 0) { throw 'expo prebuild failed -- see output above; this is the step most likely to surface a real incompatibility' }
        Ok 'prebuild succeeded'
        Record 'expo prebuild --clean --platform android --no-install: OK'

        # ----------------------------------------- 8. smoke import for tsc/export
        Step '8. Write smoke import (app/src/ui/maplibreSmoke.ts)'
        $smokePath = Join-Path $app 'src\ui\maplibreSmoke.ts'
        $smokeDir  = Split-Path -Parent $smokePath
        if (-not (Test-Path $smokeDir)) { New-Item -ItemType Directory -Force -Path $smokeDir | Out-Null }
        $smokeContent = "import '@maplibre/maplibre-react-native';`nexport const MAPLIBRE_SMOKE = true;`n"
        [IO.File]::WriteAllText($smokePath, $smokeContent, [Text.UTF8Encoding]::new($false))
        Ok 'wrote app/src/ui/maplibreSmoke.ts so tsc/export actually touch the package'
        Record 'app/src/ui/maplibreSmoke.ts: written (branch-only, imports @maplibre/maplibre-react-native)'

        # ----------------------------------------------------- 9. typecheck
        Step '9. npx tsc --noEmit'
        if ($SkipTypecheck) {
            Warn 'skipped by -SkipTypecheck'
            Record 'tsc: skipped (-SkipTypecheck)'
        } else {
            $r = Invoke-Native { npx.cmd tsc --noEmit }
            $r.Output | ForEach-Object { Say $_ }
            if ($r.Code -ne 0) { throw 'tsc reported errors -- see output above' }
            Ok 'tsc clean'
            Record 'tsc --noEmit: clean'
        }

        # -------------------------------------------------------- 10. export
        Step '10. npx expo export --platform android'
        Say 'this bundles the JS/native module WITHOUT spending an EAS build'
        $r = Invoke-Native { npx.cmd expo export --platform android }
        $r.Output | ForEach-Object { Say $_ }
        if ($r.Code -ne 0) { throw 'expo export failed -- see output above' }
        Ok 'export succeeded'
        Record 'expo export --platform android: OK'

        # ---------------------------------------------- 11. manifest permissions
        Step '11. Check AndroidManifest.xml for INTERNET'
        Say 'note: INTERNET is already in Expo templates manifest, so its presence here proves little either way -- recorded for completeness, not as evidence MapLibre wired anything'
        $manifestPath = Join-Path $app 'android\app\src\main\AndroidManifest.xml'
        if (Test-Path $manifestPath) {
            $manifestText = Get-Content $manifestPath -Raw
            $internetMatches = [regex]::Matches($manifestText, 'android\.permission\.INTERNET')
            if ($internetMatches.Count -gt 0) {
                Ok "INTERNET permission present ($($internetMatches.Count) mention(s)) -- expected regardless of MapLibre"
                Record "AndroidManifest.xml: android.permission.INTERNET present ($($internetMatches.Count)x) -- proves little, already in Expo's template manifest"
            } else {
                Warn 'INTERNET permission NOT found in manifest -- unexpected, note it for the option matrix'
                Record 'AndroidManifest.xml: android.permission.INTERNET NOT found'
            }
            $allPerms = [regex]::Matches($manifestText, '<uses-permission[^/]*android:name="([^"]+)"') |
                ForEach-Object { $_.Groups[1].Value }
            Record 'All uses-permission entries found:'
            $allPerms | Sort-Object -Unique | ForEach-Object { Record "  - $_" }
        } else {
            Warn "manifest not found at $manifestPath -- prebuild may not have generated android/ (check --no-install did not skip it)"
            Record "AndroidManifest.xml: NOT FOUND at $manifestPath"
        }

        # -------------------------------------------------------- 12. sizes
        Step '12. Measure dist/ size and grep Gradle files for maplibre'
        $distPath = Join-Path $app 'dist'
        if (Test-Path $distPath) {
            $distBytes = (Get-ChildItem $distPath -Recurse -File | Measure-Object -Property Length -Sum).Sum
            $distMb = [math]::Round($distBytes / 1MB, 2)
            Ok "dist/ = $distMb MB (JS bundle only; excludes maplibre unless imported)"
            Record "dist/ size: $distMb MB ($distBytes bytes) -- JS bundle only; excludes maplibre unless imported"
        } else {
            Warn 'dist/ not found -- expo export may use a different output path in this SDK version, check manually'
            Record 'dist/ size: NOT FOUND'
        }

        Say 'MapLibre Native itself arrives via Gradle at build time, not as prebuilt .so files under android/ -- grepping Gradle files instead of measuring .so sizes'
        $buildGradle    = Join-Path $app 'android\app\build.gradle'
        $settingsGradle = Join-Path $app 'android\settings.gradle'
        foreach ($gf in @($buildGradle, $settingsGradle)) {
            if (Test-Path $gf) {
                $hits = Select-String -Path $gf -Pattern 'maplibre' -SimpleMatch -AllMatches
                if ($hits) {
                    Ok "$(Split-Path $gf -Leaf): $($hits.Count) maplibre mention(s)"
                    Record "$($gf): $($hits.Count) maplibre mention(s)"
                    $hits | ForEach-Object { Record "  - line $($_.LineNumber): $($_.Line.Trim())" }
                } else {
                    Warn "$(Split-Path $gf -Leaf): no maplibre mentions found"
                    Record "$($gf): no maplibre mentions found"
                }
            } else {
                Warn "$gf not found"
                Record "$($gf): NOT FOUND"
            }
        }
    } finally { Pop-Location }

    $result = 'PASS'
}
catch {
    $result = 'FAIL'
    Fail "$($_.Exception.Message)"
    Record "FAILED: $($_.Exception.Message)"
}
finally {
    Step 'Summary'
    if ($result -eq 'PASS') {
        Ok 'PASS -- MapLibre resolves, prebuilds, typechecks and exports cleanly under this repo'
        Say 'This did NOT spend an EAS build. Nothing was pushed. The branch spike/maplibre holds the changes.'
        Say 'app/src/ui/maplibreSmoke.ts exists on the spike/maplibre branch only (smoke import for tsc/export).'

        Step 'Committing spike changes to spike/maplibre'
        Push-Location $repo
        try {
            $r = Invoke-Native { git add app/app.json app/package.json app/package-lock.json .gitignore app/src/ui/maplibreSmoke.ts }
            if ($r.Code -ne 0) {
                $r.Output | ForEach-Object { Say $_ }
                Warn 'git add failed -- commit the spike changes by hand'
                Record 'git add: FAILED'
            } else {
                $r = Invoke-Native { git commit -m 'spike: maplibre install (zero EAS builds)' }
                if ($r.Code -ne 0) {
                    $r.Output | ForEach-Object { Say $_ }
                    Warn 'git commit failed -- commit the spike changes by hand'
                    Record 'git commit: FAILED'
                } else {
                    Ok 'committed to spike/maplibre'
                    Record 'git commit: OK (spike: maplibre install (zero EAS builds))'
                }
            }
        } finally { Pop-Location }
    } else {
        Fail 'FAIL -- see the step above that threw; the spike stops on first error by design'
    }
    Say "Report written to: $report"
    Record ''
    Record "RESULT: $result"
    ($reportLines -join [Environment]::NewLine) | Set-Content $report -Encoding utf8

    Step 'What to do with the branch now'
    Say 'Discard everything (recommended if this was just curiosity):'
    Say '    git checkout main'
    Say '    git clean -fd app/android app/dist'
    Say '    cd app; npm ci'
    Say '    (node_modules keeps maplibre installed otherwise -- npm ci resets it to main''s package-lock.json)'
    Say 'Keep it (recommended if PASS and you want to build on it next):'
    Say '    leave the branch -- it costs nothing sitting there.'
    Say 'Either way: this script spent zero of the 15 free monthly EAS Android builds.'
}
