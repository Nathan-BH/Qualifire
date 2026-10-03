<#
    Qualifire -- build 3, step 2 of 2: BUILD

    Sends the project to Expo's servers (EAS) and prints the APK link. The
    build itself is free (15 Android builds/month) and takes ~10-20 minutes.

        cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
        .\build3-build.ps1                 # preview APK, waits and prints the link
        .\build3-build.ps1 -NoWait         # queue it and hand the shell back
        .\build3-build.ps1 -Profile development   # rebuild the dev client instead

    Run build3-prepare.ps1 first -- this script refuses to spend a build if the
    preparation steps have not been done.
#>
[CmdletBinding()]
param(
    [ValidateSet('preview', 'development')]
    [string]$Profile = 'preview',
    [switch]$NoWait,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$app  = Join-Path $repo 'app'

function Say  ($m) { Write-Host "  $m" }
function Step ($m) { Write-Host "`n$m" -ForegroundColor Cyan }
function Ok   ($m) { Write-Host "  OK  $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  !!  $m" -ForegroundColor Yellow }

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

Push-Location $app
try {
    Write-Host "Qualifire build 3 -- $Profile" -ForegroundColor White

    # --------------------------------------------------------- 1. gate checks
    Step '1. Has prepare been run?'
    $problems = @()
    if ($Profile -eq 'preview') {
        if (-not (Test-Path (Join-Path $app 'app.config.js'))) {
            $problems += 'app.config.js missing -- the preview would overwrite your dev client'
        }
        $eas = Get-Content (Join-Path $app 'eas.json') -Raw | ConvertFrom-Json
        if ($eas.build.preview.env.APP_VARIANT -ne 'preview') {
            $problems += 'eas.json build.preview does not set APP_VARIANT=preview'
        }
    }
    $pkg = Get-Content (Join-Path $app 'package.json') -Raw | ConvertFrom-Json
    $deps = $pkg.dependencies.PSObject.Properties.Name
    foreach ($p in @('expo-audio', 'react-native-safe-area-context')) {
        if ($deps -notcontains $p) { $problems += "$p not installed" }
    }
    if ($problems.Count -gt 0) {
        $problems | ForEach-Object { Warn $_ }
        if (-not $Force) { throw 'run .\build3-prepare.ps1 first (or pass -Force to build anyway)' }
        Warn 'continuing because -Force was given'
    } else {
        Ok 'prepare looks done'
    }

    # ---------------------------------------------------------- 2. last checks
    Step '2. Final typecheck (cheap insurance against a wasted build slot)'
    $r = Invoke-Native { npx tsc --noEmit }
    if ($r.Code -ne 0) {
        $r.Output | ForEach-Object { Say $_ }
        throw 'TypeScript errors -- not spending a build'
    }
    Ok 'tsc clean'

    # ------------------------------------------------------------- 3. account
    Step '3. Expo account'
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

    # --------------------------------------------------------------- 4. build
    Step "4. Building ($Profile, android)"
    Say 'this runs on Expo servers; ~10-20 min. Ctrl-C here does NOT cancel it.'
    $easArgs = @('eas-cli', 'build', '--platform', 'android', '--profile', $Profile)
    if ($NoWait) { $easArgs += '--no-wait' }
    # streamed live, so no Invoke-Native here -- but stderr must not be fatal
    $ErrorActionPreference = 'Continue'
    npx @easArgs
    $code = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($code -ne 0) { throw 'eas build reported an error -- check the log link above' }

    Step 'Done.'
    Say 'Open the printed link on the phone and tap the APK to install.'
    Say 'Status of past builds:  npx eas-cli build:list'
    if ($Profile -eq 'preview') {
        Say 'You should end up with TWO Qualifire icons -- dev client and preview.'
    }
    Say 'On-device checklist: see BUILD-3-RUNBOOK.md section 8.'
}
finally { Pop-Location }
