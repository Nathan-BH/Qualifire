<#
.SYNOPSIS
    Commits a checkpoint of marketing/ before a Studio editing session, so whatever you do
    in Studio afterward can be diffed against a clean baseline, then kept or discarded.

.DESCRIPTION
    Run this once, right before opening HyperFrames Studio to experiment with a
    composition. It commits the current state of marketing/ if anything is uncommitted.
    Afterward, once you've messed around in Studio:
      - git diff marketing            -> see exactly what changed
      - git checkout -- marketing      -> DISCARD it, back to this checkpoint
      - git add marketing; git commit  -> KEEP it (a normal commit, once you're happy)

.EXAMPLE
    .\checkpoint.ps1
#>

$ErrorActionPreference = 'Stop'

# marketing\hyperframes -> marketing -> repo root
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Push-Location $repoRoot
try {
    git add marketing
    $staged = git diff --cached --name-only
    if (-not $staged) {
        Write-Host 'Nothing to checkpoint -- marketing/ already matches the last commit.' -ForegroundColor Yellow
        Write-Host 'Safe to open Studio and experiment; git diff marketing will show any changes.'
    }
    else {
        $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
        git commit -m "Checkpoint: marketing before Studio session ($stamp)"
        Write-Host 'Checkpoint committed. Safe to experiment in Studio now.' -ForegroundColor Green
        Write-Host 'When done:'
        Write-Host '  git diff marketing         -> see what changed'
        Write-Host '  git checkout -- marketing  -> discard it, back to this checkpoint'
        Write-Host '  git add marketing; git commit -m "..."  -> keep it'
    }
}
finally {
    Pop-Location
}
