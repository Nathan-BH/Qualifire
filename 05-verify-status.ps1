# Verify current git status and show summary

$repoPath = "C:\Users\natha\Claude personal projects\Qualifire"

Push-Location $repoPath

Write-Host "Git Repository Status" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan

# Current branch
$branch = git rev-parse --abbrev-ref HEAD
Write-Host "`nBranch: $branch" -ForegroundColor Green

# Commits ahead
Write-Host "`nLatest 10 commits:" -ForegroundColor Cyan
git log --oneline -10

# Working tree status
Write-Host "`nUncommitted changes:" -ForegroundColor Cyan
$changes = git status --short
if ($changes) {
    Write-Host $changes
} else {
    Write-Host "Working tree clean" -ForegroundColor Green
}

# Diff stats
Write-Host "`nChanged files summary:" -ForegroundColor Cyan
git diff --stat

# Stash info
Write-Host "`nStashed changes:" -ForegroundColor Cyan
$stash = git stash list
if ($stash) {
    Write-Host $stash
} else {
    Write-Host "No stashed changes" -ForegroundColor Green
}

Pop-Location
