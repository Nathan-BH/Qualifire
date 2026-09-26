# Cycle 24 — BRIEF v2: rename `teaser-lanes` -> `videotrack-mapper`, move `arrangements/` inside it

Written 2026-09-26 by the Plan tier (Opus, fresh context; Fable skipped per Nathan's standing override).
Continuation of `marketing/cycles/24_studio-folders-restructure/` (v1 = `BRIEF-v1.md`). Executor: Sonnet.
You need no other context than this file and `apply_v2_edits.py` (section 3). Read this whole file before
running anything.

---

## 1. What changed and why (2026-09-26)

Cycle 24 v1 reorganised the marketing studios but could not move `marketing/audio-studio/teaser/arrangements/`
(row 39): Windows refused the `mv`, `prep_kit.py` hard-codes a path into that folder, and cycle 25 was about to
read from it. Later the same day Nathan decided two things in conversation: (1) the arrangements should live
**inside the tool that opens and saves them**, `marketing/audio-studio/tools/teaser-lanes/`, instead of the
originally planned `marketing/audio-studio/teaser-full/arrangements/` (that destination is superseded); and
(2) the name "teaser-lanes" does not say what the tool does (it loads a video render + a sound "kit" + an
arrangement together so he can review and scrub them), so the tool is renamed **`videotrack-mapper`** (his final
decision). He also explicitly approved editing `prep_kit.py`'s one functional path line, which v1 had said needed
his OK. Result: `tools/teaser-lanes/` becomes `tools/videotrack-mapper/` (page `videotrack-mapper.html`, unit tests
`videotrack-mapper.test.mjs`), the arrangements move to `tools/videotrack-mapper/arrangements/`, and the empty
`marketing/audio-studio/teaser/` folder disappears.

### Planner rulings you must follow (already baked into the script)

- **R1 — kitv1's kit id stays `"teaser-lanes"`.** `prep_kit.py` line 49 `kit_dir="kitv1", kit_id="teaser-lanes"`
  is NOT the tool's name: it is the identity of the kitv1 sound kit, stamped into `kitv1/manifest.json` (generated,
  git-ignored), into `arrangement_v1.json`'s `"kit"` field, into the unit/e2e tests' synthetic manifests and the
  e2e-real expectation table, and into the browser's localStorage keys for that kit. Renaming it would make
  `arrangement_v1.json` open with a "made for kit …" warning, invalidate kitv1's manifest until rebuilt, and churn
  ~20 test literals, for no user-visible gain. Leave every `kit: "teaser-lanes"` / `"kit": "teaser-lanes"` alone.
  Also never touch `kit_id="teaser-full"` (kitv2) or `kit_id="teaser-full-v2"` (kitv3) — unrelated, correct values.
- **R2 — backward compatibility, not a hard cut.** The page writes the new arrangement tag
  `"videotrack-mapper-arrangement"` but still OPENS files tagged `"teaser-lanes-arrangement"` (Nathan may have
  saved files in Downloads; history in older cycle folders). The page stores remembered clips/mutes under the new
  `videotrack-mapper:` localStorage prefix but READS the old `teaser-lanes:` key as a fallback (so Nathan's in-browser
  work survives the rename), and **Reset to defaults deletes both keys** (otherwise a reload would resurrect the old
  state). Same fallback for the served-mode kit pick key. `kits.json`'s tag becomes `"videotrack-mapper-kits"` with
  no fallback (it ships in the same folder and changes in the same pass).
- **R3 — dated/verbatim records are not rewritten.** Past-tense or dated narrative, Nathan's verbatim pastes, and
  provenance strings keep the old name; where a reader today needs the new location, a short dated note is added
  instead (Nathan's standing rule: any addition to a dated doc carries today's date).

---

## 2. Execution sequence

Run everything through `device_bash` from the repo root `$HOME/mnt/Qualifire` (Windows path
`C:\Users\natha\Claude personal projects\Qualifire`). Do the steps in order. **Read section 7 (environment
gotchas) before step P1.** Log what each step printed; you will need it for `EXECUTOR-REPORT-v2.md`.

### 2.0 Put the plan files in the cycle folder

- `BRIEF-v2.md` (this file) and `apply_v2_edits.py` must end up in
  `marketing/cycles/24_studio-folders-restructure/`. The Plan tier left verified copies in
  `_to_delete/plan-v2-dryrun/` (gitignored holding folder):
  ```
  cd $HOME/mnt/Qualifire
  cp _to_delete/plan-v2-dryrun/apply_v2_edits_r3.py marketing/cycles/24_studio-folders-restructure/apply_v2_edits.py
  md5sum marketing/cycles/24_studio-folders-restructure/apply_v2_edits.py   # MUST be 87ccfb517fa2040d094324a6fec22588
  ```
  If `BRIEF-v2.md` is not already in the cycle folder, copy it from `_to_delete/plan-v2-dryrun/BRIEF-v2.md` (or
  write it there from the text you were given). If the script's md5 differs, STOP and escalate — do not run a
  script whose content was not the one Plan dry-ran.

### 2.1 Preflight (any failure = STOP, zero changes, escalate)

- **P1 — no stale git locks.** `ls .git/*.lock 2>/dev/null` must print nothing. If a lock exists and
  `ps aux | grep -c "[g]it "` shows no git process, rename it away (section 7). If a git process IS running, wait
  2 minutes and re-check; never kill it.
- **P2 — clean working tree in scope** (timeout 180000 ms):
  `GIT_OPTIONAL_LOCKS=0 git status --porcelain -- marketing/audio-studio marketing/silent-studio marketing/cycles/24_studio-folders-restructure`
  must print nothing (after 2.0, the two new cycle files will show as `??` — those two are fine; anything else = STOP).
- **P3 — cycle 25 is not mid-write in the arrangements folder:**
  ```
  ls marketing/cycles/25_rides-ranking-arrangement-v3/                       # expect ONLY questionsfornathan.md
  grep -c '^\*answer:$' marketing/cycles/25_rides-ranking-arrangement-v3/questionsfornathan.md   # expect 2 (both unanswered)
  find marketing/audio-studio/teaser/arrangements marketing/audio-studio/tools/teaser-lanes -newermt '-30 minutes' -not -path '*/tests/out/*'   # expect nothing
  find marketing -name 'arrangement_v3*'                                       # expect nothing
  ```
  If cycle 25 has more files, filled answers, or anything was modified in the last 30 minutes: STOP — another
  session may be working in these folders.
- **P4 — destinations free:** `ls -d marketing/audio-studio/tools/videotrack-mapper` must fail (no such file).
  `ls -A marketing/audio-studio/teaser` must print exactly `arrangements`.
- **P5 — baseline tests.** `mkdir -p marketing/cycles/24_studio-folders-restructure/verify-v2/pre`, then
  `cd marketing/audio-studio/tools/teaser-lanes && node teaser-lanes.test.mjs > ../../../cycles/24_studio-folders-restructure/verify-v2/pre/unit.log 2>&1; tail -3 ../../../cycles/24_studio-folders-restructure/verify-v2/pre/unit.log`.
  Expected: **`2 FAILED of 231`**, the two FAILs being `kits.json in the tool folder parses and defaults to
  kit-teaser-full` and `html: HOWTO entry 1 names both kits` (pre-existing, stale since cycle 23; NOT yours to fix).
  Any other result = STOP.
- **P6 — inventory:** `find marketing/audio-studio/tools/teaser-lanes marketing/audio-studio/teaser -type f -printf "%s\t%p\n" | sort -k2 > marketing/cycles/24_studio-folders-restructure/verify-v2/pre/tree-before.tsv`
  (includes the git-ignored `kitv1/ kitv2/ kitv3/` ~57 MB each and `tests/out/`).

### 2.2 Moves (git mv keeps history; check after EACH one)

```
cd $HOME/mnt/Qualifire
git mv marketing/audio-studio/tools/teaser-lanes marketing/audio-studio/tools/videotrack-mapper
```
- M1 check: `ls -d marketing/audio-studio/tools/teaser-lanes` must fail, and
  `ls marketing/audio-studio/tools/videotrack-mapper/kitv1/manifest.json marketing/audio-studio/tools/videotrack-mapper/kitv3/manifest.json marketing/audio-studio/tools/videotrack-mapper/tests/out`
  must succeed. `git mv` on a directory renames the directory itself, so git-ignored contents (the three kit
  folders, `tests/out/`) travel with it. **If the old folder still exists** with leftovers, `mv` each leftover
  item into the same relative place under `videotrack-mapper/` (check the target name is free first; never
  overwrite), then remove the then-empty old folder as in M4.

```
git mv marketing/audio-studio/tools/videotrack-mapper/teaser-lanes.html marketing/audio-studio/tools/videotrack-mapper/videotrack-mapper.html
git mv marketing/audio-studio/tools/videotrack-mapper/teaser-lanes.test.mjs marketing/audio-studio/tools/videotrack-mapper/videotrack-mapper.test.mjs
git mv marketing/audio-studio/teaser/arrangements marketing/audio-studio/tools/videotrack-mapper/arrangements
```
- M3 check: `ls marketing/audio-studio/tools/videotrack-mapper/arrangements/arrangement_v2/arrangement_v2.json` succeeds.
- **M4 — the now-empty `marketing/audio-studio/teaser/`.** Git does not track directories, so git already
  considers it gone; the physical folder may linger on the Windows mount. `ls -A marketing/audio-studio/teaser`:
  if it prints nothing, `rmdir marketing/audio-studio/teaser`. Deletion is normally denied on this mount — if
  `rmdir` says `Operation not permitted`, instead
  `mkdir -p _to_delete && mv marketing/audio-studio/teaser "_to_delete/cycle24-v2_empty-audio-studio-teaser_$(date +%s)"`.
  If it is NOT empty: STOP and escalate. Never `rm -rf`. Never request delete permission.
- **If any `git mv` fails** (e.g. `Permission denied` — v1 hit exactly this; usually a process holding the folder
  open: a running `serve.ps1` window, an editor, an Explorer window, a browser file dialog): check section 7 lock
  cleanup, wait 60 s, retry that one command ONCE. If it fails again: STOP, run no edits, and escalate with the
  exact command, output, and which moves already succeeded. Do not undo a move that succeeded. A state where M1
  succeeded but M3 did not is acceptable to leave for the coordinator; say so plainly.
- After the moves: `ls .git/*.lock 2>/dev/null` and clean up per section 7 if needed.

### 2.3 Content edits (scripted)

```
cd $HOME/mnt/Qualifire
python3 marketing/cycles/24_studio-folders-restructure/apply_v2_edits.py code --check
python3 marketing/cycles/24_studio-folders-restructure/apply_v2_edits.py code
```
The script asserts the exact occurrence count of every replacement and the final count of `teaser-lanes` (and other
strings) per file; if ANY assertion fails it prints all failures and writes **nothing**. Plan dry-ran it on a copy of
the current repo: `OK: 23 file(s) written`. **If `--check` reports any failure, STOP and escalate with its output —
do not edit the script's counts or strings to make it pass**, a mismatch means the repo differs from what was
planned. Do not hand-edit any file the script covers. Section 3 is the human-readable description of what the
script does, for your report and for Inspect.

Then run section 6 verification. Only when all of it passes:
```
python3 marketing/cycles/24_studio-folders-restructure/apply_v2_edits.py cycle-docs --check
python3 marketing/cycles/24_studio-folders-restructure/apply_v2_edits.py cycle-docs
```
then write `EXECUTOR-REPORT-v2.md` (section 9). **Do not `git add` edited files or commit** — Inspect and the
coordinator handle the commit. (The `git mv` steps already staged the renames; that is expected.)

---

## 3. Every content edit (what `apply_v2_edits.py` does)

Paths are post-move. `T` = `marketing/audio-studio/tools/videotrack-mapper`, `A` = `T/arrangements`.

### 3a. Internal tool files

| file | find | replace with | why |
|---|---|---|---|
| `T/videotrack-mapper.html` | `<title>Teaser sound lanes</title>`, `<h1>Teaser sound lanes</h1>` | `Videotrack mapper` in both | visible tool name |
| same | comment `Evaluated by teaser-lanes.test.mjs` | `…videotrack-mapper.test.mjs` | file renamed |
| same | copy-list header `["teaser-lanes · " + v.file` | `["videotrack-mapper · " + v.file` | first line of "Copy list" output (the text parser ignores header lines, so old pasted lists still open) |
| same | `const stateKey = manifest => "teaser-lanes:" + …` | prefix `"videotrack-mapper:"` + new line `const legacyStateKey = manifest => "teaser-lanes:" + …` (+ comment); `legacyStateKey` added to the core's export list | R2 localStorage fallback |
| same | `const saved = store.get(C.stateKey(manifest));` | `… \|\| store.get(C.legacyStateKey(manifest));` | read old key if new absent |
| same | `store.del(C.stateKey(S.manifest));` (2x, Reset handler) | `store.del(C.stateKey(S.manifest)); store.del(C.legacyStateKey(S.manifest));` | Reset must clear both |
| same | `store.set("teaser-lanes:kit-pick", …)` / `store.get("teaser-lanes:kit-pick")` | set new key `videotrack-mapper:kit-pick`; get new key `\|\|` old key | R2 |
| same | `m.format !== "teaser-lanes-kits"` + its error text | `videotrack-mapper-kits` | kits.json tag |
| same | `const ARRANGEMENT_FORMAT = "teaser-lanes-arrangement";` | `"videotrack-mapper-arrangement"` + new `const LEGACY_ARRANGEMENT_FORMAT = "teaser-lanes-arrangement";` | **functional** — see 3e |
| same | `if (obj.format !== ARRANGEMENT_FORMAT) throw new Error("not a teaser-lanes arrangement (…teaser-lanes-arrangement…)")` | `if (obj.format !== ARRANGEMENT_FORMAT && obj.format !== LEGACY_ARRANGEMENT_FORMAT) throw new Error("not a videotrack-mapper arrangement (expected \"format\": \"videotrack-mapper-arrangement\")")` | accept both tags |
| same | save message `move it into teaser/arrangements/` | `move it into this tool's arrangements/ folder` | new location |
| `T/videotrack-mapper.test.mjs` | file names in header comment + `htmlPath` | `videotrack-mapper.*` | renamed files |
| same | expected copy-list headers `"teaser-lanes · …` (3) | `"videotrack-mapper · …` | page output changed |
| same | stateKey expectation `"teaser-lanes:teaser-lanes:video.webm:…"` | `"videotrack-mapper:teaser-lanes:video.webm:…"` (first segment = tool prefix, second = kit id, kept) + new `legacyStateKey` case | R1/R2 |
| same | title regex, error text `not a teaser-lanes arrangement`, all `teaser-lanes-arrangement` (9), all `teaser-lanes-kits` (6) | new names | tags renamed |
| same | (insert) | 2 new cases: legacy tag still opens; `ARRANGEMENT_FORMAT === "videotrack-mapper-arrangement"` | R2 coverage |
| `T/tests/e2e.mjs`, `e2e-real.mjs`, `e2e-served.mjs`, `convert-arrangement.mjs` | page file name, copy-list header expectations, format/kits tags, `not a teaser-lanes arrangement`, `teaser-lanes:kit-pick`, temp-dir prefix `teaser-lanes-served-` | new names | same reasons; e2e scripts only run in the cloud container (Playwright), not on this mount |
| `T/tests/mutants-open.mjs` | mutant **O6** `find`/`replace` strings; page/test file names | O6 now anchors on the new format-check line (`if (false && obj.format !== … && obj.format !== LEGACY_ARRANGEMENT_FORMAT) …`) | a mutant's `find` must match the page exactly once or it reports ANCHOR MISSING |
| `T/tests/fixtures/arrangement_v1.json` | `"format": "teaser-lanes-arrangement",` | `videotrack-mapper-arrangement` | the unit suite checks the formatter's output equals this fixture byte for byte |
| `T/kits.json` | `"format": "teaser-lanes-kits",` | `"videotrack-mapper-kits",` | must match the page |
| `T/serve.ps1` | all 4 `teaser-lanes` | `videotrack-mapper` | includes the **functional** `$url = "http://127.0.0.1:$Port/teaser-lanes.html"` |
| `T/verify_default_mix.py` | docstring run path | new path | doc |
| `T/README.md` | title, page name, double-click step, Save-arrangement step (old "blocked move" text), prep_kit `cd`, test command | new names/paths; dated "Added 2026-09-26" paragraph explaining the rename, `arrangements/`, legacy tag, and R1 | live doc |

Not edited on purpose: `T/tests/synthetic-kit.mjs` (kit id only), `T/tests/fixtures/manifest-real.json`,
`T/tests/fixtures/arrangement_v1.txt`, `T/tests/fixtures/syn.txt` (verbatim/old-header inputs: prove old pasted
lists still parse), `T/.gitignore`, git-ignored `T/kitv1|2|3/*` (generated; rebuilt by `prep_kit.py`).

### 3b. `prep_kit.py` (Nathan approved, 2026-09-26)

| line (current) | find | replace with |
|---|---|---|
| 3 (docstring) | `builds tools/teaser-lanes/kitv1/, kitv2/ (or a future kitv3/) for teaser-lanes.html` | `builds tools/videotrack-mapper/kitv1/, kitv2/ (or a future kitv3/) for videotrack-mapper.html` |
| 14 (docstring) | `cd marketing/audio-studio/tools/teaser-lanes && python3 prep_kit.py` | `cd marketing/audio-studio/tools/videotrack-mapper && python3 prep_kit.py` |
| **77 (functional)** | `default_arrangement="marketing/audio-studio/teaser/arrangements/arrangement_v2/arrangement_v2.json",` | `default_arrangement="marketing/audio-studio/tools/videotrack-mapper/arrangements/arrangement_v2/arrangement_v2.json",` |

Left as is: line 49 `kit_id="teaser-lanes"` (R1); lines 74-75 `extra_notes` strings mentioning
`audio-studio/teaser/arrangements/…` (dated provenance/audit trail; the note `prep_kit.py` generates from
`default_arrangement` at build time prints the real new path). v1's "lines 75/77" was imprecise: 77 is the only
functional line. The script's `AS`/`REPO` paths are computed from the file's own location two levels up, which is
unchanged by the rename.

### 3c. Arrangement files (in `A/`)

| file | edit |
|---|---|
| `A/arrangement_v1/arrangement_v1.json`, `A/arrangement_v2/arrangement_v2.json`, `A/arrangement_v1/rides-options/option-A-piano-then-bed.json`, `A/arrangement_v1/rides-options/option-B-piano-plus-stems.json` | `"format": "teaser-lanes-arrangement",` -> `"format": "videotrack-mapper-arrangement",` only. `"kit"` fields (`teaser-lanes` / `teaser-full` / `teaser-full-v2`) and the `"note"` texts (dated provenance) untouched. |
| `A/README.md` | dated "Moved 2026-09-26" banner under the title; `../../tools/teaser-lanes/` -> `../` (the tool folder); `../../tools/teaser-lanes/teaser-lanes.html` -> `../videotrack-mapper.html`; `../soundvN/` -> `../../../teaser-full/soundvN/ (not created yet)` (the old `../` pointed at `audio-studio/teaser/`, which is gone; `structure.md` names `audio-studio/teaser-full/soundvN/` as where a built round goes); the dated 2026-09-24 provenance row keeps `tools/teaser-lanes/tests/convert-arrangement.mjs` and gains `(now ../tests/convert-arrangement.mjs)`. |
| `A/arrangement_v1/FEEDBACK-v1.md` | dated note under the title only (tool renamed, folder moved, body left as written). Body untouched — it is a dated response record full of already-stale paths from earlier cycles (`tools/teaser-lanes/kit/`, `brandmark/opening`), and line ~50 is Nathan's own words. |
| `A/arrangement_v1/rides-options/README.md` | "How to use" line: `tools/teaser-lanes/teaser-lanes.html` -> `tools/videotrack-mapper/videotrack-mapper.html (renamed 2026-09-26 from tools/teaser-lanes/teaser-lanes.html)` (audio-studio-relative, same style as before). |
| `A/arrangement_v1/arrangement_v1.txt`, `A/arrangement_v1/IDEA-v1.md` | untouched (Nathan's verbatim paste / his own words). |

### 3d. External live docs

| file | edit |
|---|---|
| `marketing/audio-studio/APPROACH.md` | `Current workflow: tools/teaser-lanes/ — see structure.md.` -> `Current workflow: tools/videotrack-mapper/ (named teaser-lanes until 2026-09-26, cycle 24 v2) — see structure.md.` |
| `marketing/audio-studio/structure.md` | dated "Updated 2026-09-26 (cycle 24 v2)" note under the header; tool page, kits, prep_kit and README paths -> `tools/videotrack-mapper/…`; "Arrangements" paragraph now says `tools/videotrack-mapper/arrangements/arrangement_vN/` (moved 2026-09-26, pointer to BRIEF-v2) instead of the "planned move … blocked" text. |
| `marketing/silent-studio/structure.md` line 57 | `` `teaser-lanes`'s `kitv1` is built from it. `` -> `` `videotrack-mapper`'s `kitv1` is built from it (tool named `teaser-lanes` until 2026-09-26). `` |

### 3e. CORRECTNESS RISK — format-tag coupling (double-check this)

The arrangement JSON `"format"` field is **data the page validates at runtime by exact string match**
(`parseArrangementJson`), and the page's own Save writes `ARRANGEMENT_FORMAT`. The four arrangement files, the
test fixture, the unit tests, the e2e literals, mutant O6's anchor and the page constant all have to agree, or
the tool rejects its own files ("not a … arrangement"). Same for `kits.json` vs `parseKitsList` (a mismatch
breaks served mode's auto-load entirely). The script changes all of them in one pass, and the page additionally
accepts the old arrangement tag. Section 6 V1/V2/V4 prove the coupling holds; do not skip them.

### 3f. Cycle 24 docs (script phase `cycle-docs`, only after section 6 passes)

`marketing/cycles/24_studio-folders-restructure/OPEN-ITEMS.md`:
- §1 smoke-check: the `serve.ps1` block's `cd` becomes
  `cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\audio-studio\tools\videotrack-mapper"`, and the
  "Open arrangement from … — note: this is still the OLD path" paragraph now points at
  `marketing\audio-studio\tools\videotrack-mapper\arrangements\arrangement_v1\` (dated).
- §2: original paragraph kept; a dated "Update 2026-09-26 (cycle 24 v2)" paragraph says the paths did change now
  and how to read cycle 23's old paths.
- §3: a dated "Added 2026-09-26 (cycle 24 v2)" list of the references left stale on purpose by v2 (section 5
  items + the 2 pre-existing unit FAILs + the kit-id ruling).
- Escalation 1: a **"Status: RESOLVED 2026-09-26 (cycle 24 v2)"** line under its heading, and a "Resolution"
  block at its end stating: the destination changed from `teaser-full/arrangements/` to
  `tools/videotrack-mapper/arrangements/` on Nathan's explicit instruction (colocate with the tool + tool renamed,
  his final naming decision); `marketing/audio-studio/teaser/` is gone (row 40 done by the same move);
  **`prep_kit.py` line 77 was edited with Nathan's explicit approval**, given in conversation 2026-09-26; condition
  (a) about cycle 25 was checked at move time (P3) and cycle 25 must now read/write
  `tools/videotrack-mapper/arrangements/`; the new tag + legacy-read behaviour. All v1 text above it is kept.

`marketing/cycles/24_studio-folders-restructure/README.md`: an "Addendum v2 (2026-09-26)" section appended after
the Readout table (what moved where, pointers to BRIEF-v2 / apply_v2_edits.py / EXECUTOR-REPORT-v2 /
OPEN-ITEMS, note that rows 39/40 above keep their v1 status as the v1 record) with its own v2 readout table.
After the script runs, fill the Execute (v2) row's outcome cell with a one-line result by hand (that is the only
hand edit you make to these two files).

---

## 4. Arrangement JSON files whose `"format"` changes

1. `marketing/audio-studio/tools/videotrack-mapper/arrangements/arrangement_v1/arrangement_v1.json`
2. `marketing/audio-studio/tools/videotrack-mapper/arrangements/arrangement_v2/arrangement_v2.json` (kitv3's
   shipped default via `prep_kit.py` `default_arrangement`; `prep_kit.py` does not check the tag)
3. `marketing/audio-studio/tools/videotrack-mapper/arrangements/arrangement_v1/rides-options/option-A-piano-then-bed.json`
4. `marketing/audio-studio/tools/videotrack-mapper/arrangements/arrangement_v1/rides-options/option-B-piano-plus-stems.json`
5. (test data) `marketing/audio-studio/tools/videotrack-mapper/tests/fixtures/arrangement_v1.json` — byte-identical
   to #1 before and after.

All: `"teaser-lanes-arrangement"` -> `"videotrack-mapper-arrangement"`. These are runtime data matched by exact
string in the page; see 3e.

---

## 5. DO NOT TOUCH

- Every file and folder name under `marketing/cycles/19_teaser-sound-lanes/`,
  `20_piano-spine-arrangement-and-opening-trim/`, `21_teaser-single-render-unification/`,
  `22_teaser-lanes-multi-video-kit/` (its folder name keeps "teaser-lanes" — historical),
  `23_piano-sync-leadin-cut-and-kit-rename/`. Also every other older cycle folder.
- `marketing/cycles/24_studio-folders-restructure/verify/` (all of `build-before/`, `build-after/`, `pre/`, `post/`,
  the two `.log` and two `.py` files), `BRIEF-v1.md`, `DIGEST.md`, `EXECUTOR-REPORT-v1.md`, `INSPECT-REPORT-v1.md`.
  Your v2 logs go in a NEW `verify-v2/` folder.
- `marketing/cycles/25_rides-ranking-arrangement-v3/` (active cycle; read-only for P3).
- Stale references left on purpose (generated-composition sync rule and dated narrative):
  `marketing/silent-studio/scenes/opening/index.html` (lines ~99 and ~107),
  `marketing/silent-studio/teaser-full/compositions/opening.html` (lines ~84 and ~92),
  `marketing/silent-studio/teaser-full/index.html` (line ~46, "see teaser-lanes/README.md"),
  `marketing/silent-studio/teaser-full/rounds/v1/FEEDBACK.md` (line 6).
- `prep_kit.py`: line 49 `kit_id="teaser-lanes"`, kitv2's `kit_id="teaser-full"`, kitv3's
  `kit_id="teaser-full-v2"`, and all `extra_notes=[...]` strings. Only lines 3, 14, 77 change.
- `arrangement_v1.txt`, `IDEA-v1.md`, the body of `FEEDBACK-v1.md`, the `"note"` and `"kit"` fields of every
  arrangement JSON.
- Git-ignored generated kit files (`kitv1/`, `kitv2/`, `kitv3/` contents incl. `manifest.json`,
  `prep-report.txt`) — they move with the folder but are not edited.
- Root `02-commit-cycle22.ps1`, `07-batch-commit-template.ps1`, `POWERSHELL-SCRIPTS-README.md`,
  `SCRIPTS-QUICK-REFERENCE.txt` and their copies in `Claude outputs/` (they name cycle 22's folder, which keeps its
  name), `marketing/archive/**`, `safe_to_delete/**`, `_to_delete/**`.
- `marketing/audio-studio/tools/av-align/`, `marketing/audio-studio/ride/`, and anything else not listed in section 3.

---

## 6. Verification (all must pass before the `cycle-docs` phase)

Save outputs under `marketing/cycles/24_studio-folders-restructure/verify-v2/post/`. Let
`T=marketing/audio-studio/tools/videotrack-mapper`.

- **V1 unit suite:** `cd $T && node videotrack-mapper.test.mjs > ../../../cycles/24_studio-folders-restructure/verify-v2/post/unit.log 2>&1; grep -E "^FAIL|FAILED|ALL PASS" ../../../cycles/24_studio-folders-restructure/verify-v2/post/unit.log`
  Expected exactly: the same two FAIL lines as P5 and **`2 FAILED of 234`** (231 + 3 new cases, which must
  `pass`: `legacyStateKey (pre-rename key, read-only fallback)`, `parseArrangementJson: legacy
  "teaser-lanes-arrangement" tag (pre-2026-09-26 files) still opens`, `ARRANGEMENT_FORMAT (the tag Save writes) is
  videotrack-mapper-arrangement`). Any other FAIL = escalate. (Plan got exactly this on the dry run.)
- **V2 mutant anchors:** `cd $T && node tests/mutants-open.mjs . $HOME/v2-mut/mut $HOME/v2-mut/nosyn 2>&1 | tail -2`
  (output dirs outside the repo) must print `ANCHOR MISSING: 0`. Note: because of the 2 pre-existing unit FAILs,
  every mutant reports "killed (unit)" trivially; the only thing this check proves is that all 20 anchors (incl.
  O6) still match the page. Same as baseline.
- **V3 syntax:** every `<script>` block of `$T/videotrack-mapper.html` passes `node --check` (extract each block
  to a temp file OUTSIDE the repo, e.g. with a short python regex `<script[^>]*>([\s\S]*?)</script>`); Plan's dry
  run: 2 blocks, both OK. `python3 -c "import ast;ast.parse(open('$T/prep_kit.py').read());ast.parse(open('$T/verify_default_mix.py').read())"`
  succeeds (do NOT `py_compile`, it writes `__pycache__`).
- **V4 data files:** each of the 5 files in section 4 plus `$T/kits.json` parses with `json.load`; formats are
  `videotrack-mapper-arrangement` (x5) / `videotrack-mapper-kits`; `"kit"` values unchanged: `teaser-lanes`
  (arrangement_v1 + fixture), `teaser-full-v2` (v2), `teaser-full` (option-A, option-B).
  `cmp $T/tests/fixtures/arrangement_v1.json $T/arrangements/arrangement_v1/arrangement_v1.json` = identical.
- **V5 prep_kit path resolves:** `grep -n default_arrangement= $T/prep_kit.py` shows the new path, and
  `test -f marketing/audio-studio/tools/videotrack-mapper/arrangements/arrangement_v2/arrangement_v2.json`.
  `grep -c 'teaser/arrangements' $T/prep_kit.py` = 2 (the two extra_notes only).
- **V6 relative links resolve** (run from the directory named):
  - in `$T/arrangements/`: `ls ../videotrack-mapper.html ../tests/convert-arrangement.mjs ../../../structure.md`
    (the last proves `../../../` = `marketing/audio-studio/`; `teaser-full/soundvN/` itself is documented as not created yet).
  - in `$T/arrangements/arrangement_v1/rides-options/`: `ls ../../../../videotrack-mapper/videotrack-mapper.html`
    (the README's `tools/videotrack-mapper/videotrack-mapper.html` is audio-studio-relative).
  - `ls $T/serve.ps1 && grep -n 'videotrack-mapper.html' $T/serve.ps1` (the `$url` line).
- **V7 repo-wide residual grep** (timeout 180000):
  ```
  cd $HOME/mnt/Qualifire && timeout 170 grep -rIc --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=safe_to_delete --exclude-dir=_to_delete --exclude-dir=archive "teaser-lanes" . | grep -v ':0$' | grep -v -E '^\./marketing/cycles/(0[0-9]|1[0-9]|2[0-3])_|^\./marketing/cycles/24_studio-folders-restructure/(verify/|BRIEF-v1\.md|DIGEST\.md|EXECUTOR-REPORT-v1\.md|INSPECT-REPORT-v1\.md|BRIEF-v2\.md|apply_v2_edits\.py|EXECUTOR-REPORT-v2\.md|verify-v2/)|^\./(Claude outputs/)?(02-commit-cycle22\.ps1|07-batch-commit-template\.ps1|POWERSHELL-SCRIPTS-README\.md|SCRIPTS-QUICK-REFERENCE\.txt):' | sort
  ```
  Expected output, exactly these files with these line counts (before the `cycle-docs` phase; after it,
  `OPEN-ITEMS.md` becomes 15 and `README.md` 7):

  | file | lines | why they remain |
  |---|---|---|
  | `marketing/audio-studio/APPROACH.md` | 1 | "(named teaser-lanes until 2026-09-26…)" |
  | `marketing/audio-studio/structure.md` | 1 | dated update note |
  | `marketing/silent-studio/structure.md` | 1 | "(tool named `teaser-lanes` until…)" |
  | `marketing/silent-studio/scenes/opening/index.html` | 1 | DO-NOT-TOUCH comment (~107) |
  | `marketing/silent-studio/teaser-full/compositions/opening.html` | 1 | DO-NOT-TOUCH comment (~92) |
  | `marketing/silent-studio/teaser-full/index.html` | 1 | DO-NOT-TOUCH comment (~46) |
  | `marketing/silent-studio/teaser-full/rounds/v1/FEEDBACK.md` | 1 | DO-NOT-TOUCH (line 6) |
  | `marketing/cycles/24_studio-folders-restructure/OPEN-ITEMS.md` | 4 before / 15 after cycle-docs | v1 record + v2 resolution text |
  | `marketing/cycles/24_studio-folders-restructure/README.md` | 4 before / 7 after cycle-docs | v1 record + addendum |
  | `$T/README.md` | 4 | title "(cycle 19 as …)" + dated rename paragraph |
  | `$T/videotrack-mapper.html` | 4 | legacy comment, `legacyStateKey`, `LEGACY_ARRANGEMENT_FORMAT`, kit-pick fallback |
  | `$T/videotrack-mapper.test.mjs` | 10 | kitv1 id in synthetic manifests/expectations + legacy cases |
  | `$T/prep_kit.py` | 1 | kitv1 `kit_id` (R1) |
  | `$T/kitv1/manifest.json` | 1 | kitv1 id (generated, ignored) |
  | `$T/tests/e2e.mjs` | 2 | `"kit": "teaser-lanes"` literals |
  | `$T/tests/e2e-real.mjs` | 1 | TABLE key = kitv1 id |
  | `$T/tests/e2e-served.mjs` | 1 | `kit: teaser-lanes · video.webm` (#kit-info shows the synthetic kit id) |
  | `$T/tests/synthetic-kit.mjs` | 1 | kit id |
  | `$T/tests/fixtures/arrangement_v1.json`, `manifest-real.json`, `arrangement_v1.txt`, `syn.txt` | 1 each | kit id / verbatim old headers |
  | `$T/arrangements/README.md` | 2 | banner + dated provenance row |
  | `$T/arrangements/arrangement_v1/FEEDBACK-v1.md` | 10 | banner + untouched dated body |
  | `$T/arrangements/arrangement_v1/arrangement_v1.json` | 1 | kit id |
  | `$T/arrangements/arrangement_v1/arrangement_v1.txt` | 1 | Nathan's verbatim paste |
  | `$T/arrangements/arrangement_v1/rides-options/README.md` | 1 | "(renamed … from …)" |
  | `$T/arrangements/arrangement_v1/rides-options/option-A-piano-then-bed.json`, `option-B-…json` | 1 each | dated `note` text |

  (Counts are matching LINES from `grep -c`, all checked by Plan on the live repo + a dry-run copy on
  2026-09-26.) A
  `__pycache__/*.pyc` hit means something compiled `prep_kit.py` — report it, it is ignored by git and harmless.
  **Any other file = escalate** (section 8).
- **V8 kits and ignored files arrived:** `find $T -type f -printf "%s\t%p\n" | sort -k2 > …/verify-v2/post/tree-after.tsv`;
  every `kitv1/ kitv2/ kitv3/ tests/out/` file of `pre/tree-before.tsv` exists under `$T` with the same size.
  `ls -d marketing/audio-studio/teaser marketing/audio-studio/tools/teaser-lanes` both fail.
- **V9 git view** (timeout 180000): `GIT_OPTIONAL_LOCKS=0 git status --porcelain -- marketing > …/verify-v2/post/git-status.txt`.
  Expected: 27 rename entries (`R ` or `RM`) from `…/tools/teaser-lanes/…` / `…/teaser/arrangements/…` to
  `…/tools/videotrack-mapper/…` (18 tool files + 9 arrangement files; `RM` = renamed and then edited, e.g.
  `RM marketing/audio-studio/tools/teaser-lanes/teaser-lanes.html -> marketing/audio-studio/tools/videotrack-mapper/videotrack-mapper.html`);
  ` M` for `marketing/audio-studio/APPROACH.md`, `marketing/audio-studio/structure.md`,
  `marketing/silent-studio/structure.md` (+ cycle 24 `OPEN-ITEMS.md`, `README.md` after cycle-docs); `??` for the
  new cycle-24 files (`BRIEF-v2.md`, `apply_v2_edits.py`, `verify-v2/`, `EXECUTOR-REPORT-v2.md`). **No `D`
  entries.** If git shows `D` + `??` pairs instead of `R`, the index missed the `git mv` — escalate, don't "fix"
  it with `git add -A`.

---

## 7. Environment gotchas (read before P1)

- `device_bash` runs in a Linux VM on Nathan's Windows PC; the repo is a Windows folder mounted at
  `$HOME/mnt/Qualifire`. Every call is a fresh shell: `cd` at the start of each command.
- **`unlink`/`rm`/`rmdir` are normally denied** on this mount ("Operation not permitted"); `rename`/`mv` works.
  Never `rm -rf`. Never call `device_request_delete_permission` (Nathan's hard rule for this project). Anything that
  must go away is `mv`'d into `_to_delete/` at the repo root (gitignored) with a non-colliding name. An empty
  leftover directory is not content: `rmdir` it, or `mv` it to `_to_delete/` if `rmdir` is refused.
- Git on this mount leaves debris because it cannot unlink: stray `.git/objects/*/tmp_obj_*` files and
  occasionally `.git/index.lock` / `.git/HEAD.lock`. When no git process is running, rename a lock away:
  `mv .git/index.lock ".git/index_lock_stale_$(date +%s)"` (same for `HEAD.lock`). Leave `tmp_obj_*` files alone
  unless git errors on them; then rename them the same way. **Never send any kill signal to a git process** — a
  `pkill -9` on git corrupted this repo's index once.
- Prefix every `git status` with `GIT_OPTIONAL_LOCKS=0` and give it a 180000 ms timeout (it has taken 60-120 s).
- `device_bash` sometimes fails with "no Plan9 drive shares mounted". Wait a minute and retry once; if it
  persists, stop and report — do not try to do the moves another way.
- Keep LF line endings: the unit suite fails the page on any `\r`. The script preserves bytes; do not re-save
  files through a Windows editor.
- Node 22 and python3 are available in the VM. The e2e/Playwright scripts need the cloud container; do not try to
  run them here.
- `device_commit_files` has been seen to deliver a stale earlier version of a file just re-staged under the same
  path. Always verify a copied/committed script by md5 (section 2.0).

---

## 8. Stop on ambiguity

If you find a `teaser-lanes` / `teaser/arrangements` reference that is not covered by section 3, 5 or the V7
table and looks live or functional (code, config, a command someone would copy-paste, a path a program reads),
**STOP: make no further edits**, and write it up under a clearly marked `## Escalations` heading in
`EXECUTOR-REPORT-v2.md`: file, line, exact text, why it looks live, and the state you left the repo in. The same
applies to any failed preflight, a failed move retried once, a `--check` failure, or any V-step result that differs
from what is written here. Do not guess, do not rule on it yourself, do not "fix" counts in the script.

---

## 9. What to write when done

- `marketing/cycles/24_studio-folders-restructure/EXECUTOR-REPORT-v2.md` (new), dated 2026-09-26, with:
  preflight results P1-P6 (incl. the P3 cycle-25 evidence, verbatim); each move command and its output; the
  M4 outcome (rmdir or moved to `_to_delete/…` name); the script's `--check` and real-run output (file list);
  V1-V9 results with the key lines quoted; any lock files renamed; anything moved into `_to_delete/`;
  `## Escalations` (write "none" if none); a readout row for yourself (tier | model | tokens | outcome).
- The `cycle-docs` phase writes the OPEN-ITEMS.md resolution and the README.md addendum (section 3f); then fill the
  README's "Execute (v2)" outcome cell with one line (e.g. "27 files renamed, 23 edited, V1-V9 pass").
- Do not commit. Do not edit the plan files (`BRIEF-v2.md`, `apply_v2_edits.py`).
