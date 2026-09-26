# Push commits to origin

$repoPath = "C:\Users\natha\Claude personal projects\Qualifire"

Push-Location $repoPath

Write-Host "Git Push to Origin" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan

# Check what will be pushed
Write-Host "`nCommits to push:" -ForegroundColor Yellow
git log --oneline @{u}..HEAD

Write-Host "`nPushing to origin..." -ForegroundColor Cyan
git push origin HEAD

if ($?) {
    Write-Host "`n✓ Push successful!" -ForegroundColor Green

    Write-Host "`nVerifying push..." -ForegroundColor Cyan
    $branch = git rev-parse --abbrev-ref HEAD
    git log --oneline origin/$branch -5 | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "`n✗ Push failed" -ForegroundColor Red
}

Pop-Location
