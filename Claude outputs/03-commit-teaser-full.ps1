# Commit: Silent studio teaser-full updates - renders, compositions, snapshots

$repoPath = "C:\Users\natha\Claude personal projects\Qualifire"

Push-Location $repoPath

Write-Host "Staging silent studio teaser-full updates..." -ForegroundColor Cyan

git add @(
    "marketing/silent-studio/teaser-full/README.md",
    "marketing/silent-studio/teaser-full/index.html",
    "marketing/silent-studio/teaser-full/.hyperframes/hf-ids-stamped.json",
    "marketing/silent-studio/teaser-full/.hyperframes/preview/",
    "marketing/silent-studio/teaser-full/.thumbnails/",
    "marketing/silent-studio/teaser-full/compositions/",
    "marketing/silent-studio/teaser-full/renders/",
    "marketing/silent-studio/teaser-full/snapshots/"
)

$commitMessage = @"
Silent studio teaser-full: renders, compositions, snapshots

Updates to teaser-full production:
- README.md: updated documentation & playback info
- index.html: refined interactive viewer
- .hyperframes/: metadata updates for preview system
- compositions/: finalized composition templates
- renders/: new teaser output renders (MP4 videos)
- snapshots/: rendered snapshot frames for reference
- thumbnails/: preview thumbnails for all compositions

Complete teaser-full package ready for distribution.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01JSabAd8TnE8jawZxckWEug
"@

git commit -m $commitMessage

if ($?) {
    Write-Host "✓ Teaser-full updates committed successfully" -ForegroundColor Green
    git log --oneline -1
} else {
    Write-Host "✗ Commit failed" -ForegroundColor Red
}

Pop-Location
