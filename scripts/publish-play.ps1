<#
    Qualifire -- publish a JS-only OTA update to the GOOGLE PLAY line of the app
    (clean package com.nathanbonher.qualifire, display name "Qualifire") over
    EAS Update, channel "play". Added 2026-10-05 (deployment round 2). Every
    Play release -- internal track and closed track alike -- listens to this one
    channel, so one publish reaches every Play install at once.

    Until a build made with the eas.json "play" profile (an .aab) has been
    uploaded to a Play track, there is NO install for this to land on: the
    publish succeeds and nobody downloads it. That is harmless, just pointless.

        powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-play.ps1" -DryRun                  # preflight only, publishes nothing
        powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-play.ps1"                          # publish; message = last commit subject
        powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-play.ps1" -Message "what changed"  # publish with an explicit message

    (-ExecutionPolicy Bypass always; full path always.)

    What this does: bundles the CURRENT JS in app/ (npx expo export under the
    hood) and uploads it to EAS Update -- ~1-2 minutes, NO build slot spent.
    Phones download it on the next launch and APPLY it on the launch after
    that: open the app on network, close it fully, open it again. Two
    launches is normal EAS Update behaviour.

    Identity guard: the Play line is the BASE identity from app.json. The
    preview script sets APP_VARIANT=preview; this one REMOVES APP_VARIANT from
    the environment before bundling, because a stale APP_VARIANT in the shell
    would bundle under the .preview fingerprint and the Play build would
    silently ignore the update (scripts\OTA-TROUBLESHOOTING.md section 3).

    When this is NOT enough: any native-surface change (new/upgraded native
    dependency, app.json plugins/permissions/icon/package, SDK upgrade)
    changes the FINGERPRINT runtime version. An update published after such a
    change silently never applies to older builds -- fail-safe: the phone just
    keeps its current JS. The fix is a new "play" build (.aab) uploaded to
    Play, which then goes through Play review. Debugging:
        npx eas-cli update:list
        npx eas-cli fingerprint:compare

    Same source, two publishes: today the .preview app and the Play app have
    DIFFERENT fingerprints (app.config.js renames the preview), so a bundle
    tested on .preview cannot be promoted as-is; publish the same commit with
    publish-preview.ps1 first, test, then run this script. A -Promote mode
    (eas update:republish) is planned once app/fingerprint.config.js lands --
    see deployment/rounds/round2/PLAN.md.

    Commit first (same D-043 discipline as builds): this publishes whatever
    is in the working tree. The script warns on a dirty tree but proceeds.

    SDK 55+ requires --environment on eas update; EAS knows only the
    environments development / preview / production, so this script passes
    "production" (the store line). If eas-cli ever rejects that environment,
    report it back rather than hand-editing the flag.
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
    Write-Host 'Qualifire -- OTA publish to the Google Play line (channel: play)' -ForegroundColor White
    if ($DryRun) { Warn 'DRY RUN -- checks only, nothing will be published' }

    # -------------------------------- 0. the updater must exist to publish to
    Step '0. Updater present and configured (play profile must exist in eas.json)'
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
    if ($eas.build.play.channel -ne 'play') {
        throw 'eas.json build.play.channel is not "play"'
    }
    if ($eas.build.play.android.buildType -ne 'app-bundle') {
        throw 'eas.json build.play.android.buildType is not "app-bundle"'
    }
    if ($null -ne $eas.build.play.env.APP_VARIANT) {
        throw 'eas.json build.play.env sets APP_VARIANT -- the Play line must keep the base identity (no variant)'
    }
    Ok 'expo-updates installed; fingerprint policy + updates.url + play channel all configured'
    Say 'reminder: this reaches only Play installs built from the "play" profile -- never the .preview APK.'

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
        $r = Invoke-Native { npx.cmd tsc --noEmit }
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
        if (-not $Message) { $Message = 'qualifire play OTA update' }
        Say "no -Message given; using last commit subject: $Message"
    }
    # Windows arg-parsing gotcha (Nathan, 2026-09-24 -- hit on a real commit
    # subject with embedded quotes, `RIDES: ... "no way" rides ...`):
    # PowerShell does NOT escape a literal " inside "$Message" when it builds
    # the command line for the native exe below (eas-cli, reached through the
    # npx.cmd/node shim chain) -- the embedded quote closes --message's value
    # early and everything after it lands as stray positional args, which
    # eas-cli then rejects ("Unexpected argument: ..."). This is message-only
    # text, never code, so swapping any embedded " for ' is the simplest safe
    # fix -- correctly escaping through two shim layers (cmd.exe, then
    # node's own argv parser) is not worth chasing for a human-readable
    # string. Applies to BOTH the -Message param and the git-derived
    # fallback above -- a hand-typed -Message with a quote in it hits the
    # exact same failure.
    if ($Message -match '"') {
        Warn 'commit message contains a double quote -- eas-cli chokes on it through the npx/node shim chain; using '' instead for this publish'
        $Message = $Message -replace '"', "'"
    }

    # --------------------------------------------- 4. Expo CLI + account
    # Checked in BOTH dry run and real run: npx has to fetch eas-cli itself on
    # its very first invocation anywhere on this machine, and that fetch asks
    # an interactive "Ok to proceed? (y)" -- which Invoke-Native's buffered
    # capture makes INVISIBLE, so the script looks hung for however long the
    # download takes (Nathan, 2026-09-15: looked stuck 5+ min on a bare
    # `npx eas-cli whoami`). -y/--yes makes npx auto-confirm so this can never
    # silently wait on a keypress again, in either mode.
    Step '4. Expo CLI + account'
    $r = Invoke-Native { npx.cmd -y eas-cli whoami }
    if ($r.Code -ne 0) {
        if ($DryRun) {
            Warn 'not logged in to eas-cli -- the real run will need `npx eas-cli login` (interactive, opens a browser)'
        } else {
            Say 'not logged in -- opening login'
            $ErrorActionPreference = 'Continue'   # login is interactive; let it talk
            npx.cmd -y eas-cli login
            $code = $LASTEXITCODE
            $ErrorActionPreference = 'Stop'
            if ($code -ne 0) { throw 'login failed' }
        }
    } else {
        Ok "logged in as $($r.Output | Select-Object -Last 1)"
    }

    if ($DryRun) {
        Step 'Dry run complete.'
        Would "run: npx eas-cli update --channel play --message ""$Message"" --environment production"
        Say 'Rerun without -DryRun to actually publish.'
        return
    }

    Step '5. Publishing (channel: play)'
    Remove-Item Env:APP_VARIANT -ErrorAction SilentlyContinue   # Play line = base identity; a stale APP_VARIANT would drift the fingerprint
    $env:EXPO_PUBLIC_SEED_MODE = 'empty'   # must match eas.json build.play.env
    Say 'bundles locally (npx expo export) then uploads -- ~1-2 min, spends NO build slot.'
    $ErrorActionPreference = 'Continue'
    npx.cmd -y eas-cli update --channel play --message "$Message" --environment production --platform android
    $code = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($code -ne 0) { throw 'eas update reported an error -- check the output above' }

    Step 'Done.'
    Say 'On a Play-installed phone: open Qualifire (on network), close it FULLY, open it again.'
    Say 'The update downloads on the first launch and applies on the second.'
    Say 'If no "play" build has been uploaded to Play yet, nothing receives this -- expected.'
    Say 'If a Play phone stays on old JS: the fingerprint may have moved (native change'
    Say 'since the last build?) -- check with: npx eas-cli update:list'
}
finally { Pop-Location }
