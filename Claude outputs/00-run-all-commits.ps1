# Master script: Run all commit operations in sequence
# Run this to complete all remaining commits

$repoPath = "C:\Users\natha\Claude personal projects\Qualifire"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Qualifire Git Commit Sequence" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Cleanup locks
Write-Host "[1/5] Cleaning up git locks..." -ForegroundColor Yellow
& powershell -ExecutionPolicy Bypass -File "$scriptDir\01-cleanup-git-locks.ps1"
Start-Sleep -Seconds 2

# Step 2: Verify clean state
Write-Host "`n[2/5] Verifying git state..." -ForegroundColor Yellow
Push-Location $repoPath
git status
Pop-Location
Start-Sleep -Seconds 1

# Step 3: Commit cycle 22
Write-Host "`n[3/5] Committing cycle 22..." -ForegroundColor Yellow
& powershell -ExecutionPolicy Bypass -File "$scriptDir\02-commit-cycle22.ps1"
Start-Sleep -Seconds 1

# Step 4: Commit teaser-full updates
Write-Host "`n[4/5] Committing teaser-full updates..." -ForegroundColor Yellow
& powershell -ExecutionPolicy Bypass -File "$scriptDir\03-commit-teaser-full.ps1"
Start-Sleep -Seconds 1

# Step 5: Commit glossary
Write-Host "`n[5/5] Committing glossary..." -ForegroundColor Yellow
& powershell -ExecutionPolicy Bypass -File "$scriptDir\04-commit-glossary.ps1"

# Final summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Commit Sequence Complete" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Push-Location $repoPath
Write-Host "Latest commits:" -ForegroundColor Cyan
git log --oneline -7
Write-Host "`nStatus:" -ForegroundColor Cyan
git status --short | Select-Object -First 15
Pop-Location
