<#
    Qualifire -- WP-H gate-field offline replay (cycle 024).

    Runs data/analysis/10_gatefield_replay.py against the ride cache on THIS
    machine (data/analysis/cache/*.npz -- the live cache lives here, not in
    the cloud sandbox) and prints where the four output files landed:

        data/analysis/10_gatefield_hits.csv
        data/analysis/10_gatefield_sections.csv
        data/analysis/10_output.txt
        data/analysis/10_gatefield_report.md

    Usage:
        cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
        powershell -ExecutionPolicy Bypass -File .\gatefield-replay.ps1
        powershell -ExecutionPolicy Bypass -File .\gatefield-replay.ps1 -Limit 5   # smoke test

    Zero app changes -- this only reads routes.json / catalog.seed.json /
    refs.json / the npz cache and writes the four sidecar files above next to
    the script it runs. Nothing under app/ is touched.

    Python-on-Windows is unverified from the cloud sandbox that wrote this
    script -- the check below IS the mitigation. The canonical run (the one
    the evidence report was actually generated from) was the cloud sandbox;
    this launcher exists so you can reproduce it here.
#>
[CmdletBinding()]
param(
    [int]$Limit = 0
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$script = Join-Path $root 'data\analysis\10_gatefield_replay.py'

function Fail-Plain($msg) {
    Write-Host ""
    Write-Host $msg -ForegroundColor Red
    Write-Host ""
    exit 1
}

# --- check python ---
$pyOk = $false
try {
    $v = & python --version 2>&1
    if ($LASTEXITCODE -eq 0) { $pyOk = $true }
} catch { $pyOk = $false }
if (-not $pyOk) {
    Fail-Plain "This needs Python with numpy -- install Python from python.org, then run: pip install numpy"
}

# --- check numpy ---
$npOk = $false
try {
    & python -c "import numpy" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $npOk = $true }
} catch { $npOk = $false }
if (-not $npOk) {
    Fail-Plain "This needs Python with numpy -- install from python.org, then run: pip install numpy"
}

if (-not (Test-Path $script)) {
    Fail-Plain "Could not find $script -- is this checkout up to date?"
}

Write-Host "Running gate-field replay ($script)..."
if ($Limit -gt 0) {
    & python $script --limit $Limit
} else {
    & python $script
}
if ($LASTEXITCODE -ne 0) {
    Fail-Plain "The replay exited with an error (see above) -- most likely the sanity-anchor abort. Nothing was overwritten with garbage."
}

$an = Join-Path $root 'data\analysis'
Write-Host ""
Write-Host "Done. Outputs:"
Write-Host "  $(Join-Path $an '10_gatefield_hits.csv')"
Write-Host "  $(Join-Path $an '10_gatefield_sections.csv')"
Write-Host "  $(Join-Path $an '10_output.txt')"
Write-Host "  $(Join-Path $an '10_gatefield_report.md')"
