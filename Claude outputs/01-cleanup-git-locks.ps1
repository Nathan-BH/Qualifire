# Clear stale git lock files
# Run this to recover from git lock issues

$repoPath = "C:\Users\natha\Claude personal projects\Qualifire"

Write-Host "Cleaning up git lock files in: $repoPath" -ForegroundColor Cyan

Push-Location $repoPath

# Remove lock files
$lockFiles = @(".git\HEAD.lock", ".git\index.lock")

foreach ($lockFile in $lockFiles) {
    if (Test-Path $lockFile) {
        Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
        if ($?) {
            Write-Host "✓ Removed: $lockFile" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed to remove: $lockFile" -ForegroundColor Red
        }
    }
}

# Verify git state
Write-Host "`nVerifying git status..." -ForegroundColor Cyan
git status --short | Select-Object -First 20

Pop-Location
Write-Host "`nCleanup complete." -ForegroundColor Green
