# cleanup-git-folder.ps1  (2026-09-26)
# 1. Moves the ~136 leftover lock files out of .git into safe_to_delete\ (nothing deleted by this script).
# 2. Runs git gc: packs ~559 MB of loose objects into a single pack file (much smaller, far fewer files).
#    The backup branch backup/before-index-repair stays, so the old commits are kept.

$ErrorActionPreference = 'Stop'
$repo = 'C:\Users\natha\Claude personal projects\Qualifire'
Set-Location -LiteralPath $repo

# 1. Lock leftovers -> safe_to_delete\git-lock-leftovers-<stamp>\
$dest = Join-Path $repo ("safe_to_delete\git-lock-leftovers-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $dest -Force | Out-Null
$locks = Get-ChildItem -LiteralPath (Join-Path $repo '.git') -File | Where-Object { $_.Name -match 'lock' -and $_.Name -notin @('index.lock','HEAD.lock') }
foreach ($f in $locks) { Move-Item -LiteralPath $f.FullName -Destination $dest }
Write-Host "Moved $($locks.Count) lock leftovers to $dest"

# 2. Pack loose objects
$before = (Get-ChildItem -LiteralPath (Join-Path $repo '.git\objects') -Recurse -File | Measure-Object Length -Sum).Sum / 1MB
git gc
$after = (Get-ChildItem -LiteralPath (Join-Path $repo '.git\objects') -Recurse -File | Measure-Object Length -Sum).Sum / 1MB
Write-Host ("objects: {0:N0} MB -> {1:N0} MB" -f $before, $after)
git count-objects -vH
