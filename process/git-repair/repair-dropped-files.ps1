# repair-dropped-files.ps1  (2026-09-26)
# Problem: after the pkill -9, git's index was left almost empty. Every commit made
# after 2c2f481 was built from that near-empty index, so each one recorded ~1300 files
# as DELETED. The files are still on disk -> git shows them as untracked.
# Fix: rebuild those 7 unpushed commits on top of the last good tree (2c2f481),
# keeping each commit's own changes, message, author and date. Working files are
# never touched. A backup branch is made first, so this is fully reversible.

$ErrorActionPreference = 'Stop'
$repo = 'C:\Users\natha\Claude personal projects\Qualifire'
Set-Location -LiteralPath $repo
$env:GIT_OPTIONAL_LOCKS = '0'

# 0. Move any stray lock files aside (never deleted)
$stamp = Get-Date -Format 'yyyyMMddHHmmss'
foreach ($l in 'index.lock', 'HEAD.lock', 'refs\heads\virgin.lock') {
    $p = Join-Path $repo ".git\$l"
    if (Test-Path -LiteralPath $p) { Move-Item -LiteralPath $p -Destination "$p.stale_$stamp"; Write-Host "moved aside $l" }
}

# 1. Sanity checks
$good = git rev-parse 2c2f481
$bad  = git rev-parse HEAD
if ((git rev-parse --abbrev-ref HEAD) -ne 'virgin') { throw 'Not on branch virgin - stopping.' }
git merge-base --is-ancestor $good $bad
if ($LASTEXITCODE -ne 0) { throw '2c2f481 is not an ancestor of HEAD - stopping.' }
Write-Host "Good tree: $(@(git ls-tree -r --name-only $good).Count) files | current HEAD: $(@(git ls-tree -r --name-only $bad).Count) files"

# 2. Backup branch pointing at the current (broken) HEAD
git branch -f backup/before-index-repair $bad
Write-Host 'Backup branch: backup/before-index-repair'

# 3. Rebuild each broken commit = previous rebuilt tree + that commit's own files
$work = Join-Path $env:TEMP "qualifire-repair-$stamp"
New-Item -ItemType Directory -Path $work | Out-Null
$parent = $good
$commits = @(git rev-list --reverse "$good..$bad")
$i = 0
foreach ($c in $commits) {
    $i++
    $env:GIT_INDEX_FILE = Join-Path $work "index$i"
    git read-tree $parent
    cmd /c "git ls-tree -r $c | git update-index --index-info"
    if ($LASTEXITCODE -ne 0) { throw "update-index failed on $c" }
    $tree = git write-tree
    $msg = Join-Path $work "msg$i.txt"
    cmd /c "git log -1 --format=%B $c > `"$msg`""
    $env:GIT_AUTHOR_NAME     = git log -1 --format=%an $c
    $env:GIT_AUTHOR_EMAIL    = git log -1 --format=%ae $c
    $env:GIT_AUTHOR_DATE     = git log -1 --format=%aI $c
    $env:GIT_COMMITTER_DATE  = git log -1 --format=%cI $c
    $new = git commit-tree $tree -p $parent -F $msg
    Remove-Item Env:GIT_INDEX_FILE, Env:GIT_AUTHOR_NAME, Env:GIT_AUTHOR_EMAIL, Env:GIT_AUTHOR_DATE, Env:GIT_COMMITTER_DATE
    Write-Host ("{0} -> {1}  ({2} files)  {3}" -f $c.Substring(0,7), $new.Substring(0,7), @(git ls-tree -r --name-only $new).Count, (git log -1 --format=%s $c))
    $parent = $new
}

# 4. Point virgin at the rebuilt history and rebuild the real index from it (working files untouched)
git update-ref refs/heads/virgin $parent $bad
git reset --mixed
Write-Host ''
Write-Host "Done. virgin now = $($parent.Substring(0,7)) with $(@(git ls-tree -r --name-only HEAD).Count) files."
Write-Host "Uncommitted entries now: $(@(git status --porcelain).Count)"
git status --short | Select-Object -First 40
