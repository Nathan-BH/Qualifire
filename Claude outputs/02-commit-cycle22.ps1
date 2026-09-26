# Commit: Marketing cycle 22 - teaser-lanes multi-video kit

$repoPath = "C:\Users\natha\Claude personal projects\Qualifire"

Push-Location $repoPath

Write-Host "Staging cycle 22..." -ForegroundColor Cyan

git add "marketing/cycles/22_teaser-lanes-multi-video-kit/"

$commitMessage = @"
Marketing cycle 22: teaser-lanes multi-video kit

New cycle for expanding teaser-lanes output capabilities:
- Multi-video rendering support
- Kit-based composition system
- Streamlined output management

Initial structure, briefs, and planning in place.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01JSabAd8TnE8jawZxckWEug
"@

git commit -m $commitMessage

if ($?) {
    Write-Host "✓ Cycle 22 committed successfully" -ForegroundColor Green
    git log --oneline -1
} else {
    Write-Host "✗ Commit failed" -ForegroundColor Red
}

Pop-Location
