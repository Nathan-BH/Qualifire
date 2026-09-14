# Cycle 07 — silent-studio rename and render cleanup

**Status (2026-09-14): planned and packaged, NOT executed.** `device_bash` could not reach the mount for the entire session (see `OPEN-ITEMS.md` → Blocker), so nothing in this cycle has been renamed, rewritten, moved or committed. Everything below describes what the two scripts *will* do when Nathan runs them himself. Same fallback pattern as cycle 06.

## What this cycle covers

1. **Rename `marketing/hyperframes/` → `marketing/silent-studio/`** so it mirrors its sibling `marketing/audio-studio/`, and rewrite every *path* reference to the old folder, repo-wide. The tool that builds the scenes is still called **HyperFrames** (github.com/heygen-com/hyperframes, HeyGen, Apache 2.0); the studio folder is what gets a new name. The two senses were already cleanly split in the docs — lowercase `hyperframes` = the folder path, capitalised `HyperFrames` = the tool — and the rename keeps that split.
2. **The render-folder staleness check** Nathan originally asked for, consolidated from a timestamp/version digest across every scene in both studios and cross-referenced against cycle 06's `OPEN-ITEMS.md`. Verdict below.
3. **Cleanup of superseded renders** into `safe_to_delete/` (never deleted — project rule), folding in the still-unexecuted cycle-06 list plus one straggler found today.

## Staleness verdict (Task 2)

| Where | Finding | Action |
|---|---|---|
| `silent-studio/teaser/renders/` | Last dump 2026-09-09 while `rounds/` reached v6 on 2026-09-14. **Expected, not stale**: teaser is built by ffmpeg-concatenating the other five scenes' rendered output (`rounds/vN/concat.txt` + assembly step), so it never gets its own `render.ps1` dump. `renders/` is simply unused on that path. `silent-studio/all-renders/teaser_v6.mp4` and `audio-studio/all-renders/teaser_v6_with_sound_v2.mp4` are both current (built after the Sept-14 gates-saving v5 / ranking v5 / closing v3 updates they depend on). | None. Documented here. Optional move block in the cleanup script, off by default. |
| `silent-studio/gates-saving/renders/` | Four `2026-09-10` files superseded by `2026-09-14_00-24-17` (now `rounds/v5/`). Flagged in cycle 06, never moved (no shell). | Cleanup script, group A. |
| `silent-studio/ranking/renders/` | Four `2026-09-10` files superseded by `2026-09-14_00-30-36` (`rounds/v5/`). Same history. | Cleanup script, group A. |
| `silent-studio/brandmark/closing/renders/` | One `2026-09-10_23-53-37` file superseded by `2026-09-14_00-31-41` (`rounds/v3/`). Same history. | Cleanup script, group A. |
| `audio-studio/all-renders/opening_v3_with_sound_v1.mp4` | **Still present** next to the current `opening_v3_with_sound_v2.mp4`. This is the one cycle-06 item that never got done. | Cleanup script, group B. |
| `audio-studio/all-renders/` other cycle-06 items (`start-ride_v4_with_sound_v1`, `gates-saving_v4_with_sound_v2`, `gates-saving_v4_with_sound_v3`, `ranking_v4_with_sound_v1`, `closing_v2_with_sound_v1`, `teaser_v5_with_sound_v1`) | Today's digest confirms these are already gone. | Listed in group B anyway so the script reports "not present (as expected)" — a re-check for free. |
| `colours/renders/` | **Correction (caught by fresh-Fable inspection, not the original digest):** this one *does* have a superseded file — `colours_2026-09-09_18-09-50.mp4` (= `rounds/v1`) sits alongside `colours_2026-09-10_20-05-33.mp4` (= current `rounds/v2`). The original digest's "colours: one version everywhere" was wrong. | Cleanup script, group A (added after inspection). |
| `silent-studio/all-renders/` older silent `_vN` files | Not assessed by this cycle's digest. | Not touched; noted in OPEN-ITEMS. |

## Implementation order and why

1. **Rename first, cleanup second.** The cleanup script's paths are relative to the studio folder and it resolves `silent-studio` first, `hyperframes` second, so it works in either order — but running the rename first means the `MOVE-LOG.md` rows and the `safe_to_delete/` mirror carry the final folder name.
2. **Dry-run before live, both scripts.** Each has a `-DryRun` switch that prints every line that would change / every file that would move, plus the same verification report the live run prints. Nathan reads that first.
3. **Rename via `git mv`, not a filesystem rename.** In a tracked repo `git mv` does the on-disk directory rename in one step (untracked renders and the tool's `.hyperframes/` caches move with it) and stages the index change; history follows. `git status` is printed before (with a stop-and-ask if the tree is dirty) and after.
4. **Path rewrite via guarded, case-sensitive rules, not a global replace — this is a deliberate deviation from the brief.** A global lowercase `hyperframes` → `silent-studio` would also rewrite: the upstream URL `github.com/heygen-com/hyperframes`; any CLI call such as `npx hyperframes render` in `render.ps1` / `COMMANDS.md` (files the digest did not cover); the `"hyperframes"` dependency key in any `package.json` / lock file; and doc mentions of the tool's `.hyperframes/` cache dir. So the script applies:
   - **R1** `marketing/hyperframes` → `marketing/silent-studio` (and backslash form) — unambiguous, everywhere.
   - **R2** `../hyperframes` → `../silent-studio` (and backslash form) — unambiguous, everywhere.
   - **R3** `hyperframes/` or `hyperframes\` at the *start* of a path token (not preceded by a word char, `.`, `/`, `@`, `-`, or `node_modules\`) → `silent-studio/…` — doc-type files only (`.md .txt .ps1 .gitignore .gitattributes`). In code-type files (`.html .css .js .ts .json .py .yml .yaml .toml`) a bare `hyperframes/...` is more likely an import/CDN path of the tool, so R3 is withheld there.
   - Then a **residual report**: every remaining lowercase `hyperframes` in scope, tagged `leave` (tool cache dir / upstream URL / CLI-npm) or `REVIEW` (Nathan decides), plus any file or folder *name* still containing it. Nothing ambiguous is guessed at.
5. **Exclusions** from both the rewrite and the report walk: `.git/`, `node_modules/`, `safe_to_delete/`, the tool's `.hyperframes/` and `.thumbnails/` dirs (name collision, not references — and they hold tool-internal JSON), and this cycle's own folder (it documents the old name on purpose). `IDEAS.md` is scanned but never edited (Nathan's file).
6. **UTF-8 safety**: files are read as strict UTF-8 (invalid ones are skipped and reported, not corrupted), BOM presence is preserved per file, line endings are untouched because the rewrite is a string operation on the whole file.

## What shipped (this folder)

| File | What it is |
|---|---|
| `rename-to-silent-studio.ps1` | Task 1: `git mv` + guarded path rewrite + verification report. `-DryRun` supported. ASCII-only so Windows PowerShell 5.1 reads it correctly without a BOM. |
| `move-superseded-renders.ps1` | Task 3: moves the superseded renders into `safe_to_delete/` (mirrored paths, `MOVE-LOG.md`), count-checked against cycle 06's expectations, successor-present guard, `-DryRun` / `-Force`. |
| `OPEN-ITEMS.md` | Blocker, exact run commands, judgment calls for Nathan, doc nits carried forward. |
| `README.md` | This file. |

Scripts are shipped as `.ps1` files rather than pasted into `OPEN-ITEMS.md` as the convention usually has it, for three reasons: `param(-DryRun)` and `Set-StrictMode` only work from a script file; ~200 lines with regex escapes do not survive console pasting reliably; and the scripts contain the literal `hyperframes` on purpose — a file path is trivially excluded from the rewrite pass, a code block inside a doc that itself needs rewriting is not. `OPEN-ITEMS.md` carries the copy-paste run commands.

## Model-tier readout

| Tier | Model | Mandate | Tokens | Outcome |
|---|---|---|---|---|
| Digest A | Haiku | grep + read the five `marketing/` root files for every `hyperframes` occurrence and classify by sense | 101,511 | Consistent split: lowercase = folder path, capitalised = tool. Coverage gap noted: `render.ps1`, `COMMANDS.md`, `STUDIO-GUIDE.md`, scene READMEs, `audio-studio/*.md`, `cycles/*` not read (device_bash was down, fell back to manual staged reads of the 5 root files only). |
| Digest B | Haiku | timestamp / version comparison across every scene in both studios | 61,809 | teaser `renders/` expected-stale; all cycle-06 audio-studio items gone except `opening_v3_with_sound_v1.mp4`. |
| Plan | Fable | design the rename rule + cleanup + cycle docs from digests only (D-046) | 108,024 | The four files in this folder, written in full. Deviation from brief (guarded rules instead of global replace) stated and reasoned. |
| Execute | Sonnet | materialise the four files verbatim via `device_commit_files` | 53,308 | All 4 files landed byte-identical (verified against container source sizes: 16,899 / 12,320 / 9,197 / 9,360 bytes). |
| Inspect | Fable (fresh context) | adversarially re-check scripts and docs against the brief before "done" | 126,501 | 1 blocking defect found: `move-superseded-renders.ps1`'s date-anchored `-like` globs (`'2026-09-10*'` etc.) matched none of the real `<scene>_<date>_<time>.mp4` filenames, so group A would have silently no-op'd and reported "already moved" without moving anything — **fixed directly by the coordinator** (globs corrected to `'<scene>_2026-09-10_*.mp4'` form). Also found: `Get-ResidualTag` in the rename script used first-match-wins tagging, so a recognized "leave" pattern anywhere on a line masked a real un-rewritten folder mention elsewhere on that line, and its leave-patterns missed `hyperframes.heygen.com` and `npx --yes hyperframes` (flagged forms actually present in `render.ps1`/`STUDIO-GUIDE.md`) — **fixed directly** (tagger rewritten to strip every recognized leave-span first, then check what's left). Also caught the `colours/` staleness verdict was wrong (a real superseded render existed) and `_to_delete/` was missing from the exclusion list — **both fixed directly**. Rewrite rules R1-R3, UTF-8 handling, `git mv` branch logic, and script syntax were all traced and found sound. |

## After Nathan runs the scripts (coordinator follow-ups, not done here)

- Update root `STATE.md` / `OPEN-ITEMS.md`: folder is `marketing/silent-studio/`; cycle-06 cleanup debt closed (or whatever the script summary says).
- Triage the residual `REVIEW` lines from the rename script's step 3 — that is the only place a judgment about "folder vs tool" is still open.
- Doc-only nits carried from cycle 06 remain open (listed in `OPEN-ITEMS.md`); they need a shell to verify, so they wait for `device_bash` to come back.
