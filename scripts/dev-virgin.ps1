<#
    Qualifire -- run the dev client against the EMPTY seed (B-39's virgin
    install path, cycle 025), for a peek at a blank install without an EAS
    build. Starts the same Metro/Expo dev server your regular dev client
    already talks to, just with EXPO_PUBLIC_SEED_MODE=empty for this one
    run -- your real data, catalog.seed.json, results.seed.json, and any
    already-installed dev client build are all untouched. Close this window
    and run `npx expo start` (or just re-open your usual terminal) from
    app/ to go back to normal.

        cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
        powershell -ExecutionPolicy Bypass -File .\dev-virgin.ps1

    (Nathan's machine needs the -ExecutionPolicy Bypass prefix every time --
    always write the commands that way. Or double-click dev-virgin.cmd,
    which does exactly that for you.)

    What you'll see on the phone once it reconnects and reloads (may need a
    manual Reload from the dev-client shake menu, not just Fast Refresh, so
    the newly-inlined env var actually takes): RECORD has no locked route to
    pick (free-ride only -- B-36/B-42's retroactive naming/way-creation flow
    isn't built yet, so there's no UI yet to turn a recorded ride into a
    landmark or route); ROUTES shows 0 routes, with no dedicated empty-state
    polish yet (that's B-43, unbuilt); DEMO still replays the bundled
    'Morning' ride -- the one deliberate, still-legitimate literal exception
    (a scripted asset, not the catalog).
#>
[CmdletBinding()]
param()

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $repoRoot "app")
$env:EXPO_PUBLIC_SEED_MODE = "empty"
Write-Host "EXPO_PUBLIC_SEED_MODE=empty -- starting the dev server with the blank catalog..." -ForegroundColor Yellow
npx expo start
