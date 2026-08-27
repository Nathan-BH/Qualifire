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
    npx eas-cli update --channel preview --message "$Message" --environment preview --platform android
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
