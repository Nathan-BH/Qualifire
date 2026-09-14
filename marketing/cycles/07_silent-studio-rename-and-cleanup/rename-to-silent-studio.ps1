<#
.SYNOPSIS
    Cycle 07 - rename marketing\hyperframes -> marketing\silent-studio and rewrite path references.

.DESCRIPTION
    Run this yourself in a native PowerShell window on the PC (device_bash could not reach the
    mount this cycle). Idempotent: re-running after success is a no-op that re-prints the report.

    Steps, in order:
      0. Preflight: repo root exists, git on PATH, folder is a git repo, `git status` before.
      1. `git mv marketing/hyperframes marketing/silent-studio` (history-preserving; skipped if done).
         git mv renames the directory on disk, so untracked/ignored files inside it (renders,
         .hyperframes caches, .thumbnails) travel with it.
      2. Rewrite PATH references to the old folder in text files, case-SENSITIVELY, with three
         guarded rules. The tool name "HyperFrames" (capitalised), the upstream URL
         github.com/heygen-com/hyperframes, the npm package / CLI `hyperframes`, and the tool's
         own `.hyperframes/` cache dirs are all left alone.
      3. Verification: re-scan every in-scope file for remaining lowercase `hyperframes`, print
         each with a hint tag (leave / REVIEW), plus any file or folder NAME still containing it.
      4. `git status --short` after, and the suggested commit command (nothing is committed).

    Replacement rules (this order; plain ordinal string ops, never case-insensitive):
      R1  marketing/hyperframes -> marketing/silent-studio   (and the backslash form)
      R2  ../hyperframes        -> ../silent-studio          (and the backslash form)
      R3  hyperframes/ or hyperframes\ at the START of a path token -> silent-studio/ ...
          i.e. NOT preceded by a word char, '.', '/', '@', '-' or 'node_modules\'.
          R3 runs only in doc-type files (.md .txt .ps1 .gitignore .gitattributes). In code-type
          files (.html .htm .css .js .ts .json .py .yml .yaml .toml) only R1+R2 run, because a
          bare `hyperframes/...` there is more likely an import/CDN path of the TOOL.
    Whatever the rules do not touch is NOT guessed at - step 3 lists it for you to decide.

    Why not one global `hyperframes -> silent-studio` replace: it would rewrite the upstream URL
    (github.com/heygen-com/hyperframes), any CLI call (`npx hyperframes ...`) in render.ps1 /
    COMMANDS.md, the "hyperframes" dependency key in any package.json / package-lock.json, and doc
    mentions of the tool's `.hyperframes/` cache folder. Those are all the TOOL, not our folder.

    Filename decision: HYPERFRAMES-PLAN.md and HYPERFRAMES-IDEAS-DETAILED.md are NOT renamed. They
    are titled after the tool/plan concept (the capitalised sense), not after the folder, and every
    reference to those filenames is all-caps so it stays consistent. Only lowercase path references
    inside them change. Commented-out `git mv` lines at the end of step 1 override this if wanted.

    IDEAS.md is Nathan's file and is never edited by this (agent-written) script; it is still
    scanned and its hits are reported.

.PARAMETER RepoRoot
    Qualifire repo root. Default is the known location on this PC.
.PARAMETER DryRun
    Print the rename that WOULD run and every line that WOULD change, plus the verification
    report. Writes nothing, runs no git mv.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\rename-to-silent-studio.ps1 -DryRun
    powershell -ExecutionPolicy Bypass -File .\rename-to-silent-studio.ps1
#>
[CmdletBinding()]
param(
    [string]$RepoRoot = 'C:\Users\natha\Claude personal projects\Qualifire',
    [switch]$DryRun
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
$env:GIT_OPTIONAL_LOCKS = '0'

# ---------------------------------------------------------------- configuration
$OldName = 'hyperframes'
$NewName = 'silent-studio'

# Directory NAMES never entered, wherever they occur in the tree.
#   .git / node_modules / safe_to_delete  : obvious
#   .hyperframes / .thumbnails            : HyperFrames-the-tool's own cache+backup dirs (name collision, not a reference)
#   07_silent-studio-rename-and-cleanup   : this cycle's own folder - it documents the OLD name on purpose
$ExcludeDirNames  = @('.git', 'node_modules', 'safe_to_delete', '_to_delete', '.hyperframes', '.thumbnails', '07_silent-studio-rename-and-cleanup')

# File NAMES never edited (still scanned for the report).
$ExcludeFileNames = @('IDEAS.md')

$DocExtensions  = @('.md', '.txt', '.ps1')                                                        # R1 + R2 + R3
$CodeExtensions = @('.html', '.htm', '.css', '.js', '.ts', '.json', '.py', '.yml', '.yaml', '.toml')  # R1 + R2 only
$ExtraFileNames = @('.gitignore', '.gitattributes')                                               # doc-type, no extension

# R3 pattern. [regex]::Replace with no options is case-sensitive.
$R3Pattern = '(?<![\w./@-])(?<!node_modules\\)hyperframes(?=[/\\])'

# ---------------------------------------------------------------- helpers
function Write-Step([string]$Text) { Write-Host ''; Write-Host "== $Text" -ForegroundColor Cyan }

function Get-Rel([string]$FullPath) { return $FullPath.Substring($RepoRoot.Length).TrimStart('\', '/') }

function Format-Snippet([string]$Text) {
    $t = $Text.Trim()
    if ($t.Length -gt 180) { return $t.Substring(0, 177) + '...' }
    return $t
}

function Invoke-Git([string[]]$GitArgs) {
    # Native git writes chatter to stderr even on success; keep that from tripping $ErrorActionPreference.
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $out = & git @GitArgs 2>&1
        $code = $LASTEXITCODE
    }
    finally { $ErrorActionPreference = $prev }
    $lines = @()
    foreach ($o in @($out)) { if ($null -ne $o) { $lines += "$o" } }
    return [pscustomobject]@{ Code = $code; Output = $lines }
}

function Get-ScopedFiles([string]$Dir) {
    foreach ($entry in @(Get-ChildItem -LiteralPath $Dir -Force)) {
        if ($entry.PSIsContainer) {
            if ($ExcludeDirNames -contains $entry.Name) { continue }
            Get-ScopedFiles -Dir $entry.FullName
        }
        else {
            $isDoc  = ($DocExtensions -contains $entry.Extension) -or ($ExtraFileNames -contains $entry.Name)
            $isCode = ($CodeExtensions -contains $entry.Extension)
            if ($isDoc -or $isCode) {
                [pscustomobject]@{
                    File     = $entry
                    Rel      = (Get-Rel $entry.FullName)
                    IsDoc    = $isDoc
                    Editable = -not ($ExcludeFileNames -contains $entry.Name)
                }
            }
        }
    }
}

function Get-NamesContaining([string]$Dir, [string]$Needle) {
    foreach ($entry in @(Get-ChildItem -LiteralPath $Dir -Force)) {
        if ($entry.PSIsContainer -and ($ExcludeDirNames -contains $entry.Name)) { continue }
        if ($entry.Name.Contains($Needle)) { $entry }          # String.Contains = ordinal, case-sensitive
        if ($entry.PSIsContainer) { Get-NamesContaining -Dir $entry.FullName -Needle $Needle }
    }
}

# Patterns for occurrences that are definitely the TOOL, not our folder - safe to leave alone.
# Fixed during cycle-07 fresh-Fable inspection: this used to be a first-match-wins chain of
# -cmatch checks, so a recognized "leave" pattern ANYWHERE on a line masked a real, un-rewritten
# folder reference elsewhere on that same line (e.g. "caches live in .hyperframes/ and the
# hyperframes folder holds scenes" tagged 'leave' and hid the bare-word folder mention). Also
# missing two real forms found in this repo's actual render.ps1/STUDIO-GUIDE.md: the doc domain
# hyperframes.heygen.com, and `npx --yes hyperframes ...` (flags between npx and the tool name).
# Fix: strip every recognized leave-span from the line first, then only call it REVIEW if a
# `hyperframes` occurrence survives the stripping - so leave and REVIEW are computed over
# disjoint, complete coverage of the line instead of first-match-wins.
$LeavePatterns = @(
    @{ Regex = '\.hyperframes\b';                                                                          Tag = 'leave  (tool cache dir .hyperframes/)' },
    @{ Regex = 'hyperframes\.heygen\.com|heygen-com/hyperframes|github\.com/\S*hyperframes|npmjs\.com/\S*hyperframes'; Tag = 'leave  (upstream URL / tool docs domain)' },
    @{ Regex = 'npx\s+(--?\S+\s+)*hyperframes|npm\s+(i|install|run|exec)\b.*hyperframes|"hyperframes"\s*:|node_modules[\\/]hyperframes'; Tag = 'leave  (CLI / npm package)' }
)

function Get-ResidualTag([string]$Line, $Item) {
    if (-not $Item.Editable) { return "leave  (IDEAS.md is Nathan's file - edit by hand if wanted)" }

    $stripped = $Line
    $matchedTag = $null
    foreach ($lp in $LeavePatterns) {
        if ($stripped -cmatch $lp.Regex) {
            if (-not $matchedTag) { $matchedTag = $lp.Tag }   # report the first kind found, for a friendly message
            $stripped = [regex]::Replace($stripped, $lp.Regex, '')   # no options arg = case-sensitive, same as the R3 usage above
        }
    }

    if ($stripped.IndexOf('hyperframes', [System.StringComparison]::Ordinal) -lt 0) {
        # every occurrence on the line was accounted for by a leave pattern
        if ($matchedTag) { return $matchedTag }
        return 'leave  (no hyperframes left after stripping - should not happen)'
    }

    # something real remains after removing every recognized tool-mention span - always REVIEW,
    # never silently folded back into 'leave' just because part of the line matched something else.
    if (-not $Item.IsDoc -and ($stripped -cmatch $R3Pattern)) { return 'REVIEW (path-like, in a code file where R3 is not applied - fix by hand if it is our folder)' }
    if ($stripped -cmatch '(?<![\w./@-])hyperframes(?![\w/\\-])') { return 'REVIEW (bare word - folder or tool? decide by hand)' }
    return 'REVIEW'
}

# ---------------------------------------------------------------- 0. preflight
Write-Step 'Preflight'
if (-not (Test-Path -LiteralPath $RepoRoot -PathType Container)) { throw "Repo root not found: $RepoRoot" }
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path.TrimEnd('\')
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'git is not on PATH in this window.' }

Push-Location -LiteralPath $RepoRoot
try {
    $top = Invoke-Git @('rev-parse', '--show-toplevel')
    if ($top.Code -ne 0) { throw "Not a git repository: $RepoRoot" }
    Write-Host "Repo root : $RepoRoot"
    Write-Host "git top   : $($top.Output -join ' ')"
    Write-Host "Mode      : $(if ($DryRun) { 'DRY RUN - nothing is written' } else { 'LIVE' })"

    $st = Invoke-Git @('status', '--porcelain')
    if ($st.Output.Count -gt 0) {
        Write-Warning "Working tree is not clean ($($st.Output.Count) entries). The rename commit is cleaner if you commit or stash first."
        $st.Output | ForEach-Object { Write-Host "   $_" }
        if (-not $DryRun) {
            $answer = Read-Host 'Continue anyway? (y/N)'
            if ($answer -notmatch '^[yY]') { Write-Host 'Stopped. Nothing changed.'; return }
        }
    }
    else { Write-Host 'git status : clean' }

    # ---------------------------------------------------------------- 1. rename
    Write-Step "1. Rename marketing\$OldName -> marketing\$NewName"
    $OldDir = Join-Path $RepoRoot "marketing\$OldName"
    $NewDir = Join-Path $RepoRoot "marketing\$NewName"
    $oldExists = Test-Path -LiteralPath $OldDir -PathType Container
    $newExists = Test-Path -LiteralPath $NewDir -PathType Container

    if ($oldExists -and $newExists) {
        throw "Both marketing\$OldName and marketing\$NewName exist. Merge or move one aside by hand (never delete), then re-run."
    }
    if (-not $oldExists -and -not $newExists) {
        throw "Neither marketing\$OldName nor marketing\$NewName exists under $RepoRoot. Wrong -RepoRoot?"
    }
    if ($newExists) {
        Write-Host "Already renamed (marketing\$NewName exists, marketing\$OldName does not). Skipping git mv."
    }
    elseif ($DryRun) {
        Write-Host "DRY RUN: would run   git mv -- marketing/$OldName marketing/$NewName"
    }
    else {
        $mv = Invoke-Git @('mv', '--', "marketing/$OldName", "marketing/$NewName")
        $mv.Output | ForEach-Object { Write-Host "   git: $_" }
        if ($mv.Code -ne 0 -or -not (Test-Path -LiteralPath $NewDir -PathType Container)) {
            throw "git mv failed (exit $($mv.Code)). Usual cause on this PC: something holds a file under marketing\$OldName open (VS Code, a video player, the HyperFrames dev server, an Explorer preview pane). Close it and re-run - the script is safe to repeat."
        }
        Write-Host 'Renamed and staged. Untracked/ignored files inside the folder moved with it.' -ForegroundColor Green
    }

    # Deliberately NOT renamed (doc titles named after the TOOL, not the folder). Uncomment both to override:
    # $null = Invoke-Git @('mv', '--', 'marketing/HYPERFRAMES-PLAN.md',           'marketing/SILENT-STUDIO-PLAN.md')
    # $null = Invoke-Git @('mv', '--', 'marketing/HYPERFRAMES-IDEAS-DETAILED.md', 'marketing/SILENT-STUDIO-IDEAS-DETAILED.md')

    # ---------------------------------------------------------------- 2. rewrite references
    Write-Step '2. Rewrite path references (case-sensitive, guarded rules R1-R3)'
    $utf8Strict = New-Object System.Text.UTF8Encoding($false, $true)
    $scoped = @(Get-ScopedFiles -Dir $RepoRoot)
    Write-Host "In-scope text files: $($scoped.Count)"

    $changedFiles = 0
    $changedLines = 0
    $skipped      = 0
    $residuals    = New-Object 'System.Collections.Generic.List[object]'

    foreach ($item in $scoped) {
        $path  = $item.File.FullName
        $bytes = [System.IO.File]::ReadAllBytes($path)
        $hasBom = ($bytes.Length -ge 3) -and ($bytes[0] -eq 0xEF) -and ($bytes[1] -eq 0xBB) -and ($bytes[2] -eq 0xBF)
        $offset = 0
        if ($hasBom) { $offset = 3 }
        try { $text = $utf8Strict.GetString($bytes, $offset, $bytes.Length - $offset) }
        catch {
            Write-Warning "Skipped (not valid UTF-8, left untouched): $($item.Rel)"
            $skipped++
            continue
        }
        if ($text.IndexOf($OldName, [System.StringComparison]::Ordinal) -lt 0) { continue }

        $new = $text
        if ($item.Editable) {
            $new = $new.Replace("marketing/$OldName", "marketing/$NewName")     # R1  (String.Replace = ordinal)
            $new = $new.Replace("marketing\$OldName", "marketing\$NewName")
            $new = $new.Replace("../$OldName",       "../$NewName")             # R2
            $new = $new.Replace("..\$OldName",       "..\$NewName")
            if ($item.IsDoc) { $new = [regex]::Replace($new, $R3Pattern, $NewName) }   # R3 (doc-type only)
        }

        if (-not [string]::Equals($new, $text, [System.StringComparison]::Ordinal)) {
            $oldLines = $text -split "`n"
            $newLines = $new  -split "`n"
            $diffs = @()
            for ($i = 0; $i -lt $oldLines.Count; $i++) {
                if (-not [string]::Equals($oldLines[$i], $newLines[$i], [System.StringComparison]::Ordinal)) { $diffs += $i }
            }
            $changedFiles++
            $changedLines += $diffs.Count
            $verb = 'CHANGED'
            if ($DryRun) { $verb = 'WOULD CHANGE' }
            Write-Host ("{0}  {1}  ({2} line(s))" -f $verb, $item.Rel, $diffs.Count) -ForegroundColor Green
            foreach ($i in $diffs) {
                Write-Host ("    L{0}: {1}" -f ($i + 1), (Format-Snippet $oldLines[$i])) -ForegroundColor DarkGray
                Write-Host ("        -> {0}" -f (Format-Snippet $newLines[$i]))
            }
            if (-not $DryRun) {
                $enc = New-Object System.Text.UTF8Encoding($hasBom)     # keep BOM state; line endings are untouched
                [System.IO.File]::WriteAllText($path, $new, $enc)
            }
        }

        # Residual scan runs on the post-edit content, so DRY RUN and LIVE produce the same report.
        $lines = $new -split "`n"
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i].IndexOf($OldName, [System.StringComparison]::Ordinal) -ge 0) {
                $residuals.Add([pscustomobject]@{
                    Rel  = $item.Rel
                    Line = $i + 1
                    Text = $lines[$i]
                    Tag  = (Get-ResidualTag -Line $lines[$i] -Item $item)
                })
            }
        }
    }
    Write-Host ''
    Write-Host ("Files changed: {0}   lines changed: {1}   files skipped (non-UTF-8): {2}" -f $changedFiles, $changedLines, $skipped)

    # ---------------------------------------------------------------- 3. verification
    Write-Step "3. Verification: remaining lowercase '$OldName' in text (tool dirs, .git, node_modules, safe_to_delete, cycle 07 excluded)"
    if ($residuals.Count -eq 0) {
        Write-Host 'None. Clean.' -ForegroundColor Green
    }
    else {
        $review = @($residuals | Where-Object { $_.Tag -like 'REVIEW*' })
        Write-Host ("{0} occurrence(s) remain: {1} tagged REVIEW (your call), {2} tagged leave (expected: tool name / URL / cache dir)." -f $residuals.Count, $review.Count, ($residuals.Count - $review.Count))
        foreach ($r in $residuals) {
            $colour = 'DarkGray'
            if ($r.Tag -like 'REVIEW*') { $colour = 'Yellow' }
            Write-Host ("  [{0}]  {1}:{2}" -f $r.Tag, $r.Rel, $r.Line) -ForegroundColor $colour
            Write-Host ("      {0}" -f (Format-Snippet $r.Text)) -ForegroundColor $colour
        }
    }

    Write-Step "3b. File / folder NAMES still containing '$OldName' (case-sensitive; .hyperframes tool dirs excluded)"
    $names = @(Get-NamesContaining -Dir $RepoRoot -Needle $OldName)
    if ($names.Count -eq 0) { Write-Host 'None.' -ForegroundColor Green }
    foreach ($n in $names) {
        $note = ''
        if ($n.FullName -eq $OldDir) { $note = '   (the folder itself - DRY RUN did not rename it)' }
        Write-Host ("  {0}{1}" -f (Get-Rel $n.FullName), $note) -ForegroundColor Yellow
    }

    # ---------------------------------------------------------------- 4. git status after
    Write-Step '4. git status --short (after)'
    $st2 = Invoke-Git @('status', '--short')
    if ($st2.Output.Count -eq 0) { Write-Host '(clean - nothing changed on disk)' }
    else { $st2.Output | ForEach-Object { Write-Host "   $_" } }

    Write-Host ''
    if ($DryRun) {
        Write-Host 'DRY RUN complete. Nothing was written. Re-run without -DryRun to apply.' -ForegroundColor Cyan
    }
    else {
        Write-Host 'Nothing was committed. When the report above looks right:' -ForegroundColor Cyan
        Write-Host '   git add -A'
        Write-Host '   git status'
        Write-Host "   git commit -m `"marketing: rename $OldName -> $NewName (cycle 07)`""
    }
}
finally {
    Pop-Location
}
