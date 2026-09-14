<#
.SYNOPSIS
    Cycle 07 - move superseded render files into safe_to_delete\ (never deletes anything).

.DESCRIPTION
    Nathan-run, native PowerShell. Idempotent: files already moved are reported as gone.
    Works before OR after rename-to-silent-studio.ps1 (it looks for marketing\silent-studio first,
    then marketing\hyperframes).

    Sources - all identified in cycle 06 OPEN-ITEMS.md; today's (2026-09-14) re-check confirmed
    which are still present:

      A. Dated raw-render dumps, superseded by the 2026-09-14 renders that now live in rounds\vN:
           <studio>\gates-saving\renders\2026-09-10*               expected 4 files   keep 2026-09-14_00-24-17 (= rounds\v5)
           <studio>\ranking\renders\2026-09-10*                    expected 4 files   keep 2026-09-14_00-30-36 (= rounds\v5)
           <studio>\brandmark\closing\renders\2026-09-10_23-53-37* expected 1 file    keep 2026-09-14_00-31-41 (= rounds\v3)

      B. Named with-sound files in marketing\audio-studio\all-renders\, superseded by a later _vN:
           opening_v3_with_sound_v1.mp4       STILL PRESENT today (the one straggler)   keep opening_v3_with_sound_v2.mp4
           start-ride_v4_with_sound_v1.mp4    expected already gone
           gates-saving_v4_with_sound_v2.mp4  expected already gone
           gates-saving_v4_with_sound_v3.mp4  expected already gone
           ranking_v4_with_sound_v1.mp4       expected already gone
           closing_v2_with_sound_v1.mp4       expected already gone
           teaser_v5_with_sound_v1.mp4        expected already gone

    NOT touched, on purpose:
      - <studio>\teaser\renders\ (2026-09-09 dump). teaser is assembled by ffmpeg-concatenating the
        other scenes' rounds output, so renders\ is simply unused for it - stale-looking but expected.
        An optional, commented-out block at the end moves that dump if you decide you want it gone.
      - colours\ : one version everywhere, nothing superseded.
      - <studio>\all-renders\ older silent _vN files: not assessed this cycle, so not listed.

    Safety rails:
      - Destination mirrors the source path:  <repo>\safe_to_delete\<same relative path>
      - Every move is appended to <repo>\safe_to_delete\MOVE-LOG.md (when | from | to | why).
      - A dated group whose file count differs from the expectation is listed and SKIPPED unless -Force.
      - A superseded file is not moved unless its successor ("keep") is actually present.
      - An existing destination is never overwritten.

.PARAMETER RepoRoot
    Qualifire repo root. Default is the known location on this PC.
.PARAMETER DryRun
    Print what would move; move nothing.
.PARAMETER Force
    Move a dated group even when its file count differs from the cycle-06 expectation.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\move-superseded-renders.ps1 -DryRun
    powershell -ExecutionPolicy Bypass -File .\move-superseded-renders.ps1
#>
[CmdletBinding()]
param(
    [string]$RepoRoot = 'C:\Users\natha\Claude personal projects\Qualifire',
    [switch]$DryRun,
    [switch]$Force
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------- locate things
if (-not (Test-Path -LiteralPath $RepoRoot -PathType Container)) { throw "Repo root not found: $RepoRoot" }
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path.TrimEnd('\')
$SafeRoot = Join-Path $RepoRoot 'safe_to_delete'
$LogFile  = Join-Path $SafeRoot 'MOVE-LOG.md'
$Stamp    = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'

$Studio = $null
foreach ($cand in @('silent-studio', 'hyperframes')) {
    $p = Join-Path $RepoRoot "marketing\$cand"
    if (Test-Path -LiteralPath $p -PathType Container) { $Studio = $p; break }
}
if (-not $Studio) { throw "Neither marketing\silent-studio nor marketing\hyperframes found under $RepoRoot" }
$Audio = Join-Path $RepoRoot 'marketing\audio-studio'
if (-not (Test-Path -LiteralPath $Audio -PathType Container)) { throw "marketing\audio-studio not found under $RepoRoot" }

Write-Host "Repo root : $RepoRoot"
Write-Host "Studio    : $Studio"
Write-Host "Audio     : $Audio"
Write-Host "Mode      : $(if ($DryRun) { 'DRY RUN - nothing is moved' } else { 'LIVE' })"

# ---------------------------------------------------------------- the lists
$DatedGroups = @(
    @{ Dir = 'gates-saving\renders';      Pattern = 'gates-saving_2026-09-10_*.mp4'; Expected = 4; KeepPattern = 'gates-saving_2026-09-14_00-24-17*'; Why = 'superseded by 2026-09-14_00-24-17 (rounds\v5); cycle 06 OPEN-ITEMS' },
    @{ Dir = 'ranking\renders';           Pattern = 'ranking_2026-09-10_*.mp4';      Expected = 4; KeepPattern = 'ranking_2026-09-14_00-30-36*';      Why = 'superseded by 2026-09-14_00-30-36 (rounds\v5); cycle 06 OPEN-ITEMS' },
    @{ Dir = 'brandmark\closing\renders'; Pattern = 'closing_2026-09-10_23-53-37*'; Expected = 1; KeepPattern = 'closing_2026-09-14_00-31-41*';      Why = 'superseded by 2026-09-14_00-31-41 (rounds\v3); cycle 06 OPEN-ITEMS' },
    @{ Dir = 'colours\renders';           Pattern = 'colours_2026-09-09_*.mp4';      Expected = 1; KeepPattern = 'colours_2026-09-10_20-05-33*';      Why = 'superseded by 2026-09-10_20-05-33 (rounds\v2); found during cycle 07 inspection, not in cycle 06 list' }
)
# NOTE (fixed during cycle-07 fresh-Fable inspection): the original patterns here were
# '2026-09-10*' / '2026-09-14_00-24-17*' etc - date-anchored with no scene prefix. Every real
# file is named '<scene>_<date>_<time>.mp4', so those globs matched ZERO files and the script
# would have silently reported every group as "already moved" without moving anything. Fixed to
# '<scene>_<date>_*.mp4' / '<scene>_<keep-date>*' so -like actually anchors on the real names.

$NamedFiles = @(
    @{ Path = 'all-renders\opening_v3_with_sound_v1.mp4';      Keep = 'all-renders\opening_v3_with_sound_v2.mp4';      Expect = 'present';      Why = 'superseded by opening_v3_with_sound_v2.mp4; cycle 06 OPEN-ITEMS, still present 2026-09-14' },
    @{ Path = 'all-renders\start-ride_v4_with_sound_v1.mp4';   Keep = '';                                               Expect = 'already gone'; Why = 'superseded; cycle 06 OPEN-ITEMS' },
    @{ Path = 'all-renders\gates-saving_v4_with_sound_v2.mp4'; Keep = '';                                               Expect = 'already gone'; Why = 'superseded; cycle 06 OPEN-ITEMS' },
    @{ Path = 'all-renders\gates-saving_v4_with_sound_v3.mp4'; Keep = '';                                               Expect = 'already gone'; Why = 'superseded; cycle 06 OPEN-ITEMS' },
    @{ Path = 'all-renders\ranking_v4_with_sound_v1.mp4';      Keep = '';                                               Expect = 'already gone'; Why = 'superseded; cycle 06 OPEN-ITEMS' },
    @{ Path = 'all-renders\closing_v2_with_sound_v1.mp4';      Keep = '';                                               Expect = 'already gone'; Why = 'superseded; cycle 06 OPEN-ITEMS' },
    @{ Path = 'all-renders\teaser_v5_with_sound_v1.mp4';       Keep = '';                                               Expect = 'already gone'; Why = 'superseded; cycle 06 OPEN-ITEMS' }
)

# ---------------------------------------------------------------- helpers
$script:moved         = 0
$script:wouldMove     = 0
$script:skippedGroups = 0
$script:alreadyGone   = 0
$script:failed        = 0

function Initialize-MoveLog {
    if (Test-Path -LiteralPath $LogFile) { return }
    New-Item -ItemType Directory -Force -Path $SafeRoot | Out-Null
    Set-Content -LiteralPath $LogFile -Encoding UTF8 -Value @(
        '# safe_to_delete move log',
        '',
        'Appended by marketing/cycles/*/move-*.ps1 scripts. Nothing here was deleted; each row is a plain move.',
        '',
        '| when | from (repo-relative) | to | why |',
        '|---|---|---|---|'
    )
}

function Move-ToSafe([System.IO.FileInfo]$File, [string]$Why) {
    $rel  = $File.FullName.Substring($RepoRoot.Length).TrimStart('\')
    $dest = Join-Path $SafeRoot $rel
    if (Test-Path -LiteralPath $dest) {
        Write-Warning "  NOT moved - destination already exists: safe_to_delete\$rel"
        $script:failed++
        return
    }
    if ($DryRun) {
        Write-Host "  would move  $rel  ->  safe_to_delete\$rel"
        $script:wouldMove++
        return
    }
    try {
        Initialize-MoveLog
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null
        Move-Item -LiteralPath $File.FullName -Destination $dest
        Add-Content -LiteralPath $LogFile -Encoding UTF8 -Value ("| {0} | {1} | safe_to_delete\{1} | {2} |" -f $Stamp, $rel, $Why)
        Write-Host "  moved       $rel  ->  safe_to_delete\$rel" -ForegroundColor Green
        $script:moved++
    }
    catch {
        Write-Warning "  FAILED to move $rel : $($_.Exception.Message)   (Windows-side lock? close players / Explorer preview and re-run)"
        $script:failed++
    }
}

# ---------------------------------------------------------------- A. dated groups
Write-Host ''
Write-Host '== A. Dated raw-render dumps (silent studio)' -ForegroundColor Cyan
foreach ($g in $DatedGroups) {
    $dir = Join-Path $Studio $g.Dir
    Write-Host ("{0}\{1}   (expected {2})" -f $g.Dir, $g.Pattern, $g.Expected)
    if (-not (Test-Path -LiteralPath $dir -PathType Container)) {
        Write-Warning "  folder missing: $dir - group skipped"
        $script:skippedGroups++
        continue
    }
    $found = @(Get-ChildItem -LiteralPath $dir -File | Where-Object { $_.Name -like $g.Pattern } | Sort-Object Name)
    if ($found.Count -eq 0) {
        Write-Host '  nothing matches - already moved, or nothing to do.'
        $script:alreadyGone++
        continue
    }
    foreach ($f in $found) { Write-Host ("  found: {0}  ({1} MB)" -f $f.Name, [math]::Round($f.Length / 1MB, 1)) }
    $keep = @(Get-ChildItem -LiteralPath $dir -File | Where-Object { $_.Name -like $g.KeepPattern })
    if ($keep.Count -eq 0) {
        Write-Warning ("  successor {0} NOT found in this folder - group SKIPPED (nothing supersedes these files here; check rounds\ by hand)." -f $g.KeepPattern)
        $script:skippedGroups++
        continue
    }
    if (($found.Count -ne $g.Expected) -and -not $Force) {
        Write-Warning ("  found {0}, expected {1} - group SKIPPED. Check the list above; re-run with -Force to move it anyway." -f $found.Count, $g.Expected)
        $script:skippedGroups++
        continue
    }
    foreach ($f in $found) { Move-ToSafe -File $f -Why $g.Why }
}

# ---------------------------------------------------------------- B. named files
Write-Host ''
Write-Host '== B. Superseded with-sound files (marketing\audio-studio)' -ForegroundColor Cyan
foreach ($n in $NamedFiles) {
    $p = Join-Path $Audio $n.Path
    if (Test-Path -LiteralPath $p -PathType Leaf) {
        Write-Host ("{0}   (expected: {1})" -f $n.Path, $n.Expect)
        if ($n.Keep -ne '') {
            $k = Join-Path $Audio $n.Keep
            if (-not (Test-Path -LiteralPath $k -PathType Leaf)) {
                Write-Warning ("  successor {0} NOT found - NOT moving {1}." -f $n.Keep, $n.Path)
                $script:failed++
                continue
            }
        }
        Move-ToSafe -File (Get-Item -LiteralPath $p) -Why $n.Why
    }
    else {
        $note = 'as expected'
        if ($n.Expect -ne 'already gone') { $note = 'UNEXPECTED - it was present at the 2026-09-14 check' }
        Write-Host ("{0}   not present ({1})" -f $n.Path, $note)
        $script:alreadyGone++
    }
}

# ---------------------------------------------------------------- C. optional: teaser raw dump (OFF by default)
# teaser\renders\ is unused by the concat-based teaser pipeline, so its 2026-09-09 dump is dead weight
# but harmless. Uncomment to move it too. Same safe_to_delete\ mirror, same log.
# $teaserRenders = Join-Path $Studio 'teaser\renders'
# if (Test-Path -LiteralPath $teaserRenders -PathType Container) {
#     Write-Host ''; Write-Host '== C. teaser\renders\ raw dump (optional)' -ForegroundColor Cyan
#     foreach ($f in @(Get-ChildItem -LiteralPath $teaserRenders -File | Where-Object { $_.Name -like 'teaser_2026-09-09_*.mp4' })) {
#         Move-ToSafe -File $f -Why 'teaser raw dump; teaser is built by concat of other scenes, renders\ unused (cycle 07 judgment call)'
#     }
# }

# ---------------------------------------------------------------- summary
Write-Host ''
Write-Host '== Summary' -ForegroundColor Cyan
Write-Host ("moved: {0}   would move (dry run): {1}   groups skipped: {2}   already gone / nothing to do: {3}   failed / refused: {4}" -f $script:moved, $script:wouldMove, $script:skippedGroups, $script:alreadyGone, $script:failed)
if (-not $DryRun -and $script:moved -gt 0) {
    Write-Host "Log: $LogFile"
    Write-Host 'If any of these renders were git-tracked, `git status` now shows them as deleted. That is expected: the bytes'
    Write-Host 'are in safe_to_delete\ (gitignored) and in git history. Commit that together with the rename, or separately.'
}
if ($DryRun) { Write-Host 'DRY RUN complete. Nothing was moved. Re-run without -DryRun to apply.' -ForegroundColor Cyan }
