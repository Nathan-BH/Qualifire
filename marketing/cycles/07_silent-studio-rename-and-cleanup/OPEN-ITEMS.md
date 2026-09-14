# Cycle 07 — open items

## 1. Blocker

`device_bash` was unreachable for the whole session. Tool error, verbatim: *"sandbox-helper: no Plan9 drive shares mounted... A Windows update released September 8 prevents Claude's workspace from reaching your files."* Same outage as cycles 01, 02 and 06. The fallback tools (`device_list_dir` / `device_stage_files` / `device_commit_files`) can read and write **new** files but cannot run PowerShell, git or ffmpeg, and cannot move, rename or delete anything already on disk.

Consequence: **nothing in this cycle has been executed.** The folder is still `marketing/hyperframes/`, no reference has been rewritten, no render has been moved, nothing is committed. The two scripts below are for Nathan to run by hand, and each prints its own verification so the outcome is checkable without an agent in the loop.

## 2. Scripts to run (in this order)

Open a PowerShell window (Windows PowerShell 5.1 or `pwsh` 7 — both work) and, before starting, **close anything that holds files under `marketing\hyperframes` open** (VS Code, a video player, the HyperFrames dev server, an Explorer preview pane). A Windows-side lock is the one thing that makes `git mv` fail, and the script says so and stops if it does.

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\cycles\07_silent-studio-rename-and-cleanup"

# Step 1 - rename + reference rewrite. Dry run first, read the output, then live.
powershell -ExecutionPolicy Bypass -File .\rename-to-silent-studio.ps1 -DryRun
powershell -ExecutionPolicy Bypass -File .\rename-to-silent-studio.ps1

# Step 2 - move superseded renders into safe_to_delete\. Dry run first, then live.
powershell -ExecutionPolicy Bypass -File .\move-superseded-renders.ps1 -DryRun
powershell -ExecutionPolicy Bypass -File .\move-superseded-renders.ps1

# Step 3 - commit when the reports look right (nothing is committed by the scripts).
cd "C:\Users\natha\Claude personal projects\Qualifire"
git add -A
git status
git commit -m "marketing: rename hyperframes -> silent-studio; move superseded renders to safe_to_delete (cycle 07)"
```

Both scripts are idempotent — re-running after success is a no-op that re-prints the report. Both take `-RepoRoot "<path>"` if the repo is somewhere else. The cleanup script also takes `-Force` (see 2b).

### 2a. What `rename-to-silent-studio.ps1` does and what "clean" looks like

1. Preflight: checks the repo root, git on PATH, `git rev-parse`, prints `git status --porcelain`. If the tree is dirty it asks `Continue anyway? (y/N)` — committing or stashing first gives a cleaner rename commit, but it is not required.
2. `git mv -- marketing/hyperframes marketing/silent-studio`. Skipped (with a message) if `silent-studio` already exists and `hyperframes` does not. Stops if both or neither exist.
3. Rewrites path references with three case-sensitive rules — R1 `marketing/hyperframes`, R2 `../hyperframes`, R3 `hyperframes/` at the start of a path token (doc-type files only) — and prints every changed line as `L<n>: before` / `-> after`. Read/write is strict UTF-8, BOM preserved per file, line endings untouched, files that are not valid UTF-8 are skipped and named.
4. Verification report: every remaining lowercase `hyperframes` in scope, one line each, tagged
   - `leave (tool cache dir .hyperframes/)`, `leave (upstream URL / tool docs domain)`, `leave (CLI / npm package)`, `leave (IDEAS.md ...)` — expected, these are the tool, not the folder;
   - `REVIEW ...` — Nathan decides. A `$var\hyperframes\...` form in a `.ps1` is **already rewritten** by rule R3 (doc-type files include `.ps1`), so it will NOT show up here — REVIEW is for things R3/R1/R2 don't reach, mainly bare-word mentions like "the hyperframes folder" in prose, or a `hyperframes/...` path inside a code-type file (`.html`/`.js`/etc., where R3 is withheld on purpose).
   Then any file or folder **name** still containing `hyperframes` (excluding the tool's `.hyperframes/` dirs).
5. `git status --short` after, and the commit command above.

**Realistic expectation, not "0 REVIEW":** a fresh-context inspection pass (see §7) traced the tagger against this repo's actual files and found it correctly leaves alone `github.com/heygen-com/hyperframes`, `hyperframes.heygen.com` (the tool's own docs domain), and `npx --yes hyperframes render|preview` in `render.ps1`/`STUDIO-GUIDE.md` — those are expected `leave` lines, not something to fix. **Clean** means the REVIEW list (if any) is short and each line is genuinely a judgment call (folder vs. tool), not that the count must hit exactly zero. Step 3b should show `None.` for names (in a live run; a dry run still lists the un-renamed folder itself).

### 2b. What `move-superseded-renders.ps1` does

Moves (never deletes) these into `safe_to_delete\<same relative path>` and appends a row to `safe_to_delete\MOVE-LOG.md` for each:

| Group | Source | Expected | Kept successor |
|---|---|---|---|
| A | `marketing\silent-studio\gates-saving\renders\gates-saving_2026-09-10_*.mp4` | 4 files | `gates-saving_2026-09-14_00-24-17*` (= `rounds\v5`) |
| A | `marketing\silent-studio\ranking\renders\ranking_2026-09-10_*.mp4` | 4 files | `ranking_2026-09-14_00-30-36*` (= `rounds\v5`) |
| A | `marketing\silent-studio\brandmark\closing\renders\closing_2026-09-10_23-53-37*` | 1 file | `closing_2026-09-14_00-31-41*` (= `rounds\v3`) |
| A | `marketing\silent-studio\colours\renders\colours_2026-09-09_*.mp4` | 1 file | `colours_2026-09-10_20-05-33*` (= `rounds\v2`) — found during the fresh-Fable inspection, not in the original digest |
| B | `marketing\audio-studio\all-renders\opening_v3_with_sound_v1.mp4` | present | `opening_v3_with_sound_v2.mp4` |
| B | `marketing\audio-studio\all-renders\` — `start-ride_v4_with_sound_v1`, `gates-saving_v4_with_sound_v2`, `gates-saving_v4_with_sound_v3`, `ranking_v4_with_sound_v1`, `closing_v2_with_sound_v1`, `teaser_v5_with_sound_v1` (`.mp4`) | already gone | — (reported as "not present (as expected)") |

Safety rails: a group A whose file count differs from "Expected" is listed and **skipped** — re-run with `-Force` after eyeballing the list if the extra/missing file is fine; a file is not moved if its successor is not present; an existing destination is never overwritten; a failed `Move-Item` (lock) is reported and the script carries on. **Note:** if a group is partially moved (e.g. 2 of 4 files locked and failed), re-running without `-Force` will skip that group entirely on the retry because the remaining count no longer matches "Expected" — use `-Force` on the retry once the lock is cleared.

**Fixed during inspection, before this script reached you:** the patterns above originally read `'2026-09-10*'` / `'2026-09-14_00-24-17*'` etc. — anchored at the start of the filename with no scene prefix. Every real file is named `<scene>_<date>_<time>.mp4`, so those globs matched **zero** files; the script would have reported every group as "already moved" without moving a single one. Corrected to `<scene>_<date>_*.mp4` / `<scene>_<keep-date>*` so `-like` actually matches. This was caught by the fresh-context Inspect pass, not discovered by running it (nothing here can execute PowerShell) — traced by hand against the real filenames listed in the digest.

If the renders are git-tracked, `git status` will show them as deleted after the move. That is expected — the bytes are in `safe_to_delete\` (gitignored) and in git history.

## 3. Leave feedback

N/A this cycle — no `FEEDBACK.md` rounds involved, no renders produced.

## 4. Judgment calls for Nathan's review

1. **Guarded rules instead of a global replace (deviation from the brief).** The brief asked for a repo-wide case-sensitive literal replace of `hyperframes` → `silent-studio`. That would also rewrite `github.com/heygen-com/hyperframes`, any `npx hyperframes ...` CLI line in `render.ps1` / `COMMANDS.md`, a `"hyperframes"` key in any `package.json` / lock file, and doc mentions of the tool's `.hyperframes/` cache dir — none of which the digest covered, all of which are the tool. The script does the unambiguous path forms automatically and lists everything else as `REVIEW`. If the REVIEW list turns out to be long and all-folder, the fix is a quick find/replace in the editor, not a script change.
2. **`HYPERFRAMES-PLAN.md` and `HYPERFRAMES-IDEAS-DETAILED.md` keep their names.** They are titled after the tool/plan concept (the capitalised sense); references to those filenames are all-caps and therefore untouched, so the docs stay consistent. Their *contents'* lowercase path references do change. Two commented-out `git mv` lines in step 1 of the rename script rename them to `SILENT-STUDIO-*.md` if you would rather have the doc names track the folder.
3. **R3 is withheld in code-type files** (`.html .css .js .ts .json .py .yml .yaml .toml`). A `hyperframes/...` there could be an import or CDN subpath of the tool. Any such line shows up as `REVIEW (path-like, in a code file ...)` in the report; fix by hand if it is our folder. From the digest, `marketing/index.html` has zero occurrences, so this most likely affects nothing.
4. **Historical cycle docs 01–06 are rewritten too.** The brief said every reference; broken paths in old cycle docs are worse than a rewritten historical record. If you would rather keep cycles 01–06 verbatim, add `'cycles'` to `$ExcludeDirNames` in the rename script before running it (this cycle's folder is excluded regardless).
5. **`IDEAS.md` is not auto-edited** — it is Nathan's file and agents never edit it, and this script was written by one. Its hits are reported with a `leave (IDEAS.md ...)` tag; edit by hand if wanted.
6. **`teaser/renders/` 2026-09-09 dump is left in place.** It is dead weight but not wrong (teaser is concat-built, `renders/` is unused for it). Block C in the cleanup script moves it; it is commented out by default.
7. **The tool's `.hyperframes/` caches are not touched, and may hold stale absolute paths** to the old folder after the rename. They are cache/backup dirs; if HyperFrames complains on next open of a scene, the expected fix is that it regenerates them. Not verified this cycle (no shell).
8. **`silent-studio/all-renders/` older silent `_vN` files were not assessed** by this cycle's digest (only the with-sound family was). Not in the cleanup list; a candidate for a later pass.

## 5. Doc-only nits carried forward from cycle 06 (still unverified, still open)

Paths written post-rename. None of these could be checked this cycle without a shell; they stay logged, not fixed.

- `marketing/silent-studio/gates-saving/README.md` — duration table stuck at an old version (current is v5).
- `marketing/silent-studio/ranking/README.md` — duration table stuck at an old version (current is v5).
- `marketing/silent-studio/brandmark/closing/README.md` — version table stops at v2 (current is v3).
- `marketing/silent-studio/teaser/README.md` — possibly still describes v5 (current is v6).

## 6. Not done / not in scope this cycle

- No render, no ffmpeg, no git write of any kind — see Blocker.
- Root `STATE.md` / `OPEN-ITEMS.md` not updated to the new folder name; that is the coordinator's step once Nathan confirms the rename ran.

## 7. Fresh-context inspection: what it caught, before either script reached you

Per the project's model-tier protocol, a fresh-context Fable subagent (no memory of the planning conversation) traced both scripts by hand against the real repo content (device_bash is down, so nothing could be executed to catch bugs automatically — this was pure code reading). It found and the coordinator fixed directly (all mechanical, under the ~10-line threshold that skips a second full Plan/Execute/Inspect round):

1. **Blocking bug in `move-superseded-renders.ps1`** — the group-A glob patterns didn't match any real filename (see §2b note above). Would have silently reported success while moving nothing. Fixed.
2. **`Get-ResidualTag` first-match-wins masking** in `rename-to-silent-studio.ps1` — a recognized "leave" pattern anywhere on a line suppressed the REVIEW tag even if a real, un-rewritten folder reference sat elsewhere on that same line. Rewritten to strip every recognized leave-span first, then check what's left. Fixed.
3. **Two real "leave" forms were missing** from the tagger and would have shown as false `REVIEW`: `hyperframes.heygen.com` (the tool's own docs domain, used in `STUDIO-GUIDE.md`) and `npx --yes hyperframes ...` (flags between `npx` and the tool name, used in `render.ps1`). Added. This is also why §2's "clean" description was softened from "0 REVIEW" to "a short, judgment-call-only list."
4. **The `colours/` staleness verdict in `README.md` was wrong** — it claimed "one version everywhere, nothing superseded," but `colours/renders/` actually has a superseded `2026-09-09` file next to the current `2026-09-10` one. Added to the cleanup script as a 4th group-A entry and corrected in `README.md`.
5. **`_to_delete/` (the repo-root folder used for staged deletions) was missing from `$ExcludeDirNames`** in the rename script, so it would have been walked and had its contents rewritten/reported. Added to the exclusion list.

Everything else the inspector traced — the R1-R3 rewrite rules themselves, UTF-8/BOM read-write handling, the `git mv` preflight/failure branches, and both scripts' PowerShell syntax (brace/paren balance, strict-mode variable usage) — was checked line-by-line against real repo content and found sound. No further round was needed.
