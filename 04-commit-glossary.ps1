# Commit: Glossary updates

$repoPath = "C:\Users\natha\Claude personal projects\Qualifire"

Push-Location $repoPath

Write-Host "Staging glossary..." -ForegroundColor Cyan

git add "GLOSSARY.md"

$commitMessage = @"
Glossary: terminology updates

Added and updated terminology for:
- Auto-theme system (day/night switching)
- Replay screen and playback controls
- Map credits and attribution system
- Teaser rendering variants

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01JSabAd8TnE8jawZxckWEug
"@

git commit -m $commitMessage

if ($?) {
    Write-Host "[OK] Glossary committed successfully" -ForegroundColor Green
    git log --oneline -1
} else {
    Write-Host "[FAIL] Commit failed" -ForegroundColor Red
}

Pop-Location
