# Template: Batch commit multiple changes at once
# Modify the $commits array to add your own commits

$repoPath = "C:\Users\natha\Claude personal projects\Qualifire"

# Define commits as array of hashtables
$commits = @(
    @{
        Name = "Cycle 22 Initialization"
        Files = @("marketing/cycles/22_teaser-lanes-multi-video-kit/")
        Message = @"
Marketing cycle 22: teaser-lanes multi-video kit

New cycle for expanding teaser-lanes output capabilities.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01JSabAd8TnE8jawZxckWEug
"@
    },
    @{
        Name = "Teaser-full Updates"
        Files = @(
            "marketing/silent-studio/teaser-full/README.md",
            "marketing/silent-studio/teaser-full/index.html",
            "marketing/silent-studio/teaser-full/compositions/",
            "marketing/silent-studio/teaser-full/renders/"
        )
        Message = @"
Silent studio teaser-full: renders and compositions

Updated teaser-full package with final renders.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01JSabAd8TnE8jawZxckWEug
"@
    },
    @{
        Name = "Glossary"
        Files = @("GLOSSARY.md")
        Message = @"
Glossary: terminology updates

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01JSabAd8TnE8jawZxckWEug
"@
    }
)

Push-Location $repoPath

Write-Host "Batch Commit Script" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host "Total commits to process: $($commits.Count)`n" -ForegroundColor Yellow

$successCount = 0
$failCount = 0

foreach ($i in 0..($commits.Count - 1)) {
    $commit = $commits[$i]
    $num = $i + 1

    Write-Host "[$num/$($commits.Count)] $($commit.Name)" -ForegroundColor Cyan
    Write-Host "Staging files..." -ForegroundColor Yellow

    # Stage files
    foreach ($file in $commit.Files) {
        git add $file
    }

    # Commit
    Write-Host "Committing..." -ForegroundColor Yellow
    $output = git commit -m $commit.Message 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Success" -ForegroundColor Green
        $successCount++
        git log --oneline -1 | ForEach-Object { Write-Host "  $_" }
    } else {
        Write-Host "✗ Failed" -ForegroundColor Red
        Write-Host "  Error: $output" -ForegroundColor Red
        $failCount++
    }

    Write-Host ""
}

Write-Host "==================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })

Write-Host "`nFinal status:" -ForegroundColor Cyan
git status --short

Pop-Location
