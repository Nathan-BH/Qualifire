<#
  serve.ps1 -- serve teaser-lanes over localhost so the page can auto-load the default kit (kits.json).
  Run:  powershell -ExecutionPolicy Bypass -File .\serve.ps1        (from marketing\audio-studio\tools\teaser-lanes)
  Stops with Ctrl+C. Needs Python 3 on PATH (tries `python`, then `py -3`).
#>
param([int]$Port = 8765)
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$url = "http://127.0.0.1:$Port/teaser-lanes.html"
$py = $null
foreach ($c in @(@('python'), @('py','-3'))) {
    try { & $c[0] @($c | Select-Object -Skip 1) -c "import sys; assert sys.version_info >= (3,7)" 2>$null; if ($LASTEXITCODE -eq 0) { $py = $c; break } } catch { }
}
if (-not $py) { Write-Error "No Python 3 found on PATH (tried python, py -3). Install Python 3 or open teaser-lanes.html by double-click and use Open kit folder."; exit 1 }
Write-Host "Serving $here at $url  (Ctrl+C stops)" -ForegroundColor Cyan
Start-Process $url
& $py[0] @($py | Select-Object -Skip 1) -m http.server $Port --bind 127.0.0.1 --directory "$here"
