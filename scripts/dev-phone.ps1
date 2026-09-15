<#
    Qualifire -- start the Metro/Expo dev server for the phone dev-client:
    app/README-dev.md's "Daily dev loop" as a double-clickable entry point.
    Nothing is built or published. The ALREADY-INSTALLED Qualifire dev-client
    on the phone connects over WiFi and Fast-Refreshes on every save, so a
    JS-only change (theme.ts colours, copy, layout) shows on the phone about
    a second after the file is saved.

        cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
        powershell -ExecutionPolicy Bypass -File .\dev-phone.ps1            # virgin/empty seed (the default since 2026-09-08)
        powershell -ExecutionPolicy Bypass -File .\dev-phone.ps1 -Shipped   # Leuven seed: rides, results and tier chips populated (forces --clear)
        powershell -ExecutionPolicy Bypass -File .\dev-phone.ps1 -Clear     # also wipe Metro's transform cache first

    (Or double-click dev-phone.cmd. -ExecutionPolicy Bypass always.)

    -Shipped sets EXPO_PUBLIC_SEED_MODE=shipped for THIS process only. The
    value is inlined at bundle time, so -Shipped always adds --clear and you
    must do a full Reload from the dev-client shake menu once connected
    (Fast Refresh is not enough). Without -Shipped the variable is left as
    the shell has it (normally unset = virgin seed).

    What this does NOT do: change the launcher icon. The icon is a native
    asset baked into the installed dev-client at build time; a recoloured
    app/assets/icon.png only shows after the next numbered build.
#>
[CmdletBinding()]
param(
    [switch]$Shipped,
    [switch]$Clear
)
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $repoRoot 'app')

$expoArgs = @('expo', 'start')
if ($Shipped) {
    $env:EXPO_PUBLIC_SEED_MODE = 'shipped'
    $Clear = $true
    Write-Host 'EXPO_PUBLIC_SEED_MODE=shipped -- Leuven seed. Do a full Reload from the dev-client menu once the phone connects.' -ForegroundColor Yellow
}
if ($Clear) { $expoArgs += '--clear' }

Write-Host ''
Write-Host 'PHONE: open the installed Qualifire dev-client (same WiFi as this PC). It connects to this Metro server and Fast-Refreshes on every save.' -ForegroundColor Cyan
Write-Host 'Colour check: DEMO replays a scored ride (tier colours on the map and chips); START / Export are the yellow surfaces; the launcher icon only changes at the next build.' -ForegroundColor Cyan
Write-Host 'Ctrl+C in this window stops the server.' -ForegroundColor Cyan
Write-Host ''

& npx @expoArgs
