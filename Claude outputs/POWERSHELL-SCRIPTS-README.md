# Qualifire Git Commit Scripts (PowerShell)

PowerShell scripts to manage git commits for the Qualifire project. All scripts automatically use the correct execution policy and handle the Windows file paths.

## Quick Start

Run the master script to execute all commits in sequence:

```powershell
powershell -ExecutionPolicy Bypass -File ".\00-run-all-commits.ps1"
```

## Individual Scripts

### 01-cleanup-git-locks.ps1
**Purpose**: Clear stale git lock files that block operations

Removes:
- `.git/HEAD.lock`
- `.git/index.lock`

**Run when**: Git operations fail with "Unable to create lock" errors

```powershell
powershell -ExecutionPolicy Bypass -File ".\01-cleanup-git-locks.ps1"
```

### 02-commit-cycle22.ps1
**Purpose**: Commit marketing cycle 22 (teaser-lanes multi-video kit)

Stages: `marketing/cycles/22_teaser-lanes-multi-video-kit/`

Commit message: Describes new cycle for multi-video rendering and kit-based composition

```powershell
powershell -ExecutionPolicy Bypass -File ".\02-commit-cycle22.ps1"
```

### 03-commit-teaser-full.ps1
**Purpose**: Commit silent studio teaser-full updates

Stages:
- README, index.html updates
- Hyperframes metadata
- Composition templates
- Render outputs (MP4 videos)
- Snapshot frames
- Thumbnails

Commit message: Describes complete teaser-full package with renders and compositions

```powershell
powershell -ExecutionPolicy Bypass -File ".\03-commit-teaser-full.ps1"
```

### 04-commit-glossary.ps1
**Purpose**: Commit updated glossary terminology

Stages: `GLOSSARY.md`

Commit message: Documents new terminology for auto-theme, replay, map credits, teaser variants

```powershell
powershell -ExecutionPolicy Bypass -File ".\04-commit-glossary.ps1"
```

### 05-verify-status.ps1
**Purpose**: Check current git status and show commit history

Shows:
- Current branch
- Latest 10 commits
- Uncommitted changes
- Diff statistics
- Stashed changes

```powershell
powershell -ExecutionPolicy Bypass -File ".\05-verify-status.ps1"
```

### 06-push-commits.ps1
**Purpose**: Push all commits to origin

Shows commits to be pushed, then pushes to `origin/virgin` branch

```powershell
powershell -ExecutionPolicy Bypass -File ".\06-push-commits.ps1"
```

## Execution Order

**Recommended workflow**:

1. **Cleanup** (if needed):
   ```powershell
   powershell -ExecutionPolicy Bypass -File ".\01-cleanup-git-locks.ps1"
   ```

2. **Run all commits** (or run individual scripts):
   ```powershell
   powershell -ExecutionPolicy Bypass -File ".\00-run-all-commits.ps1"
   ```

3. **Verify status**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File ".\05-verify-status.ps1"
   ```

4. **Push to origin**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File ".\06-push-commits.ps1"
   ```

## Troubleshooting

### "Cannot be loaded because running scripts is disabled"
Make sure to use the full execution bypass command:
```powershell
powershell -ExecutionPolicy Bypass -File ".\script-name.ps1"
```

### "Git lock file exists"
Run the cleanup script first:
```powershell
powershell -ExecutionPolicy Bypass -File ".\01-cleanup-git-locks.ps1"
```

### "Commit failed"
Check status and see uncommitted changes:
```powershell
powershell -ExecutionPolicy Bypass -File ".\05-verify-status.ps1"
```

## Notes

- All scripts use full paths to ensure they work from any directory
- Execution policy is set to `Bypass` for the duration of script execution only
- Scripts use `$commitMessage` as a multi-line string for readability
- All commits include proper attribution and session ID
- Each script includes error checking and visual feedback (color-coded output)

## Script Structure

Each commit script follows this pattern:

1. Navigate to repo directory
2. Stage files with `git add`
3. Create commit message
4. Run `git commit` with message
5. Check result and display latest commit
6. Return to original directory

This ensures clean state management and allows scripts to be run individually or in sequence.
