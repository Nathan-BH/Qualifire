# BRIEF v1 — marketing cycle 24: studio folders restructure (teaser-full-centred)

**Written:** 2026-09-26, Plan tier (Opus, standing in for Fable at Nathan's request).
**For:** a Sonnet Execute subagent that has seen nothing but this file. Everything you need is here.
**Mode:** pure file moves + doc/string edits. **No git of any kind** (no `git add/commit/status/mv`,
nothing) — Nathan's local git index is being repaired by hand today; he commits himself later.

---

## 0. Context (why)

Nathan now works on exactly one video: the single full-teaser render in `marketing/silent-studio/teaser-full/`
(one HyperFrames composition, since cycle 21). It is no longer assembled from separate per-scene renders, so the
old "one top-level folder per render part" layout in both `silent-studio/` and `audio-studio/` (brandmark,
colours, gates-saving, ranking, ride, start-ride, the old concat `teaser/`) is outdated. Sound design is now done
in the lane tool `marketing/audio-studio/tools/teaser-lanes/teaser-lanes.html`, not with per-scene
`soundtrack.py`/`soundvN/` rounds. This cycle reshapes both studios around `teaser-full/` + `teaser-lanes`, and
moves the per-part history to an archive (never deleted).

### Two facts that shape the whole plan (verified by the planner, do not re-litigate)

1. **Five per-scene `index.html` files are still live sources.** `teaser-full/compositions/*.html` are
   *generated* from `silent-studio/brandmark/opening/`, `start-ride/`, `gates-saving/`, `ranking/`,
   `brandmark/closing/` `index.html` by the script
   `marketing/cycles/21_teaser-single-render-unification/build_teaser_v2.py` (its `SCENES` list, lines 12-16).
   Cycle 23 edited `silent-studio/start-ride/index.html` this morning and re-ran that script. So those five
   scenes' **source files** move to a new `silent-studio/scenes/<scene>/` folder (a sibling of `teaser-full/`,
   deliberately *not inside it*, so nothing new appears inside the HyperFrames project folder Nathan is
   rendering), and only their `renders/` + `rounds/` history goes to the archive. The build script moves next
   to `render.ps1` as `silent-studio/build_teaser_full.py` with its 5 paths updated.
2. **`audio-studio/ride/` stays where it is.** `tools/teaser-lanes/prep_kit.py` (which Nathan is using *right
   now* to build `kitv3`) imports `ride/ride_master.py`, loads `ride/ride_tunetank.py`, and reads
   `ride/soundv2/ride_master_v2.wav`; it also imports the audio-studio root modules `synth.py`,
   `salamander_render.py`, `window_mix.py`, and reads `piano/…` and `stemsplitter/…`. None of those move, and
   **you do not edit `prep_kit.py`, `kits.json` or any `kitv*/` folder.**

### Paths

- Repo root in `device_bash`: `$HOME/mnt/Qualifire` (Windows: `C:\Users\natha\Claude personal projects\Qualifire`).
- Below, `M` = `$HOME/mnt/Qualifire/marketing` and `A` = `M/archive/pre-teaser-full-studios`.
  Every table path is written out in full from `marketing/…` anyway.
- **Archive choice (decided, do not change):** `marketing/archive/pre-teaser-full-studios/`, mirroring the
  original layout underneath (`…/silent-studio/<x>`, `…/audio-studio/<x>`). Why: (a) `marketing/archive/`
  already exists as the "old marketing stuff, kept for reference" home (see its `README.md`); (b) root
  `safe_to_delete/` and `_to_delete/` are both **gitignored** and mean "to be cleared", which would silently
  drop ~500 MB of reviewed FEEDBACK rounds from the repo — this material is history to keep, not trash;
  (c) mirroring the old sub-paths makes every old relative reference still recognisable.
- **Cycle folder:** this brief sits in `marketing/cycles/23_studio-folders-restructure/`, but a *different*
  cycle 23 already exists (`marketing/cycles/23_piano-sync-leadin-cut-and-kit-rename/`, created the same
  minute by a parallel session). Step 0 renames this folder to `24_studio-folders-restructure`. From then on
  the cycle folder is `C = M/cycles/24_studio-folders-restructure`, and every doc note you write says
  "cycle 24".

---

## 1. Working rules for you (Execute)

1. Use `mcp__remote-devices__device_bash` for everything. Use only `mv`, `mkdir -p`, `cp -p` (verification
   copies only), `find`, `ls`, `stat`, `md5sum`, `grep`, `diff`, `sed -i` / short `python3` read-modify-write
   for edits. **Never `rm`, `rmdir`, `unlink`, never `mv` onto an existing destination** (check `[ -e dest ]`
   first; if it exists, that row is an escalation). Never call `device_request_delete_permission`.
2. If `device_bash` fails with "no Plan9 drive shares mounted" (a known intermittent fault), retry twice ~30 s
   apart. If still down, stop before moving anything (or where you are), write what you did to
   `EXECUTOR-REPORT-v1.md` if you can reach the disk via `device_stage_files`/`device_commit_files`, and hand
   back a blocker report. Do not try to do the moves via staging.
3. Move one row at a time and check the exit code. If one `mv` fails (Windows file lock, permission), log it
   under **Escalations** in `C/OPEN-ITEMS.md` with the exact error, skip that row, continue with the rest.
4. **Stop-on-ambiguity, log-and-continue:** anything this brief did not anticipate (a file/folder not listed
   where the brief lists the expected contents, an anchor string that does not match exactly once, a check
   that fails) — do **not** guess and do **not** ask Nathan. Leave that item untouched, write it to
   `C/OPEN-ITEMS.md` under a heading `## Escalations (for a fresh Opus ruling)` — each entry: what, exact path,
   exact evidence (command + output), what you did instead — and keep going with everything that does not
   depend on it. The coordinator forwards escalations to a fresh Opus subagent; Nathan is not interrupted.
   The only exceptions (full stop, hand back) are §1.2 and the concurrency guard in §3 P1.
5. Every doc edit that adds or changes durable content in an existing reference doc is **dated
   2026-09-26 and tagged "cycle 24"**, inline or as a banner — never spliced in undated.
6. Every PowerShell block you write or edit in any `.md` file must (a) start with its own full
   `cd "C:\Users\natha\Claude personal projects\Qualifire\…"` line, even if the previous block had the same
   one, never prose like "from inside X"; (b) run scripts as
   `powershell -ExecutionPolicy Bypass -File ".\x.ps1" …`; (c) use `npx.cmd`, never bare `npx`.
7. Do not touch anything listed in §7 (out of scope).

---

## 2. Target layout (what "done" looks like)

```
marketing/silent-studio/
  teaser-full/            UNCHANGED — the one deliverable (master index.html + generated compositions/)
  scenes/                 NEW — the five canonical scene sources teaser-full is generated from
    opening/  start-ride/  gates-saving/  ranking/  closing/     (index.html, theme.js, README.md, map*.png)
  _map/                   unchanged location (basemap capture tool) — README copy-loop paths updated
  all-renders/            silent teaser renders only: every teaser-full_v*.mp4 + teaser_v9.mp4 (kitv1's pinned source)
  build_teaser_full.py    MOVED here from cycles/21 (was build_teaser_v2.py), scene paths updated
  render.ps1              default -Name 'teaser' -> 'teaser-full', help text updated
  checkpoint.ps1          unchanged
  structure.md            NEW content (old one archived)
  COMMANDS.md             NEW content (old one archived)
  STUDIO-GUIDE.md         dated banner only

marketing/audio-studio/
  tools/teaser-lanes/     UNCHANGED location — the sound-design tool + kitvN kits (two one-line doc/string edits)
  tools/av-align/         unchanged (dated banner in README)
  teaser-full/            NEW
    arrangements/         MOVED from audio-studio/teaser/arrangements/ (arrangement_v1/, rides-options/, FEEDBACK-v1.md…)
  all-renders/            kept, now EMPTY — future home of teaser-full_vN_with_sound_vM.mp4
  ride/  piano/  stemsplitter/   unchanged — sound sources prep_kit.py reads
  synth.py salamander_render.py window_mix.py fluid_render.py __pycache__/   unchanged — imported by prep_kit/ride chain
  APPROACH.md             dated banner only
  structure.md            NEW content (old one archived)

marketing/archive/pre-teaser-full-studios/
  silent-studio/  brandmark/ colours/ ride/ teaser/ start-ride/ gates-saving/ ranking/ all-renders/ structure.md COMMANDS.md
  audio-studio/   brandmark/ colours/ gates-saving/ ranking/ start-ride/ teaser/ all-renders/
                  AUDIO-BRIEF.template.md FEEDBACK.template.md structure.md
```

Naming conventions reused, none invented: `teaser-full_vN.mp4` (all-renders), `teaser-full/rounds/vN/`,
`arrangement_vN/`, `kitvN/`, and for a future built sound round `audio-studio/teaser-full/soundvN/` (the old
per-scene `soundvN` convention, now at teaser level — the moved `arrangements/README.md` already says "a built
round would be a later `../soundvN/` folder", which now resolves to exactly that).

---

## 3. Pre-flight (before any move)

Create `C/verify/` (after Step 0) and keep every piece of evidence there.

- **P1 — concurrency guard.** Nathan is actively rendering and building kitv3 today. Run
  `find <every source path in §4 and §5> -type f -newermt '-10 minutes'`. If anything prints, **do not move
  anything**: log it as an escalation, write a short `EXECUTOR-REPORT-v1.md`, hand back. (Files inside
  `teaser-full/`, `all-renders/teaser-full_v*`, `tools/teaser-lanes/` are not sources and do not count.)
- **P2 — existence + expected contents.** For each §4/§5 row, confirm the source exists and the destination
  does not. For the five scene folders, `ls -A` and compare to the expected lists in §4.1. Mismatch → rules in
  §4.1.
- **P3 — size manifests.** For every source (file or folder) in §4/§5:
  `find <src> -type f -printf '%P\t%s\n' | sort > C/verify/pre/<label>.tsv` (for a single file use
  `stat -c '%n\t%s'`). Also save full listings of both studios and the archive:
  `find M/silent-studio M/audio-studio M/archive -printf '%y\t%s\t%P\n' | sort > C/verify/pre/tree-<name>.tsv`,
  and `find … -type d -empty` → `C/verify/pre/empty-dirs.txt`.
- **P4 — map check.** `md5sum M/silent-studio/teaser-full/map.png M/silent-studio/start-ride/map.png
  M/silent-studio/gates-saving/map.png M/silent-studio/ranking/map.png` → `C/verify/pre/map-md5.txt`.
  Record whether teaser-full's `map.png` md5 equals the three scenes' (used in §6.1 item 5).
- **P5 — build-script baseline (writes nothing into teaser-full).**
  1. `grep -n 'TF' M/cycles/21_teaser-single-render-unification/build_teaser_v2.py`. Expected: the definition
     `TF = os.path.join(SS, 'teaser-full')` (line 6) and the output line
     `out_path = os.path.join(TF, 'compositions', cid + '.html')` (line 179), nothing else that *reads* from
     `TF`. If `TF` is used any other way → escalation, skip P5 and V5 entirely.
  2. `mkdir -p C/verify/build-before/compositions`; copy the script to `C/verify/build_before.py` and in the
     copy only, replace the line `TF = os.path.join(SS, 'teaser-full')` with
     `TF = '<absolute path of C/verify/build-before>'`. Run `python3 C/verify/build_before.py > C/verify/build-before.log 2>&1`.
  3. `md5sum` its 5 outputs and the 5 live `M/silent-studio/teaser-full/compositions/*.html` into
     `C/verify/pre/build-md5.txt`. Record (don't act on) whether they match — a mismatch only means the live
     compositions drifted from the sources before this cycle; note it in the report.
- **P6 — teaser-lanes test baseline.** `cd M/audio-studio/tools/teaser-lanes && node teaser-lanes.test.mjs
  > C/verify/pre/lanes-test.log 2>&1; echo $?`. Record pass/fail counts.
- **P7 — verify_default_mix baseline.** Same folder: `python3 verify_default_mix.py > C/verify/pre/vdm.log 2>&1;
  echo $?` (numpy 2.2.6 is present on the VM; pass `timeout_ms: 180000`). If it can't finish in 180 s, run it
  as `nohup … &` and poll the log; if it still can't run, log it and skip V7.

---

## 4. Moves — silent-studio

### 4.0 Step 0 (cycle folder) and directories

| # | source | destination |
|---|---|---|
| 0 | `marketing/cycles/23_studio-folders-restructure/` | `marketing/cycles/24_studio-folders-restructure/` |

Then `mkdir -p`: `marketing/silent-studio/scenes/{opening,start-ride,gates-saving,ranking,closing}`,
`marketing/archive/pre-teaser-full-studios/silent-studio/all-renders`,
`marketing/archive/pre-teaser-full-studios/audio-studio/all-renders`, `marketing/audio-studio/teaser-full`.
(Do **not** pre-create any other archive sub-folder — the folder `mv`s below create them.)

### 4.1 Scene sources → `silent-studio/scenes/` (do these BEFORE 4.2)

Expected contents seen by the planner (`ls -A`):
- `brandmark/opening/` and `brandmark/closing/`: `README.md index.html renders rounds theme.js`
- `start-ride/`, `gates-saving/`, `ranking/`: `README.md index.html map-day.png map.png renders rounds theme.js`

Rule: move **every entry except `renders/` and `rounds/`** into the scene folder. If an entry not in the
expected list appears, still move it with the source (the source side is the safe side — it keeps the scene
previewable) and log it as an escalation so a ruling can decide whether it belongs in the archive instead.

| # | source | destination |
|---|---|---|
| 1 | `marketing/silent-studio/brandmark/opening/index.html` | `marketing/silent-studio/scenes/opening/index.html` |
| 2 | `marketing/silent-studio/brandmark/opening/theme.js` | `marketing/silent-studio/scenes/opening/theme.js` |
| 3 | `marketing/silent-studio/brandmark/opening/README.md` | `marketing/silent-studio/scenes/opening/README.md` |
| 4 | `marketing/silent-studio/brandmark/closing/index.html` | `marketing/silent-studio/scenes/closing/index.html` |
| 5 | `marketing/silent-studio/brandmark/closing/theme.js` | `marketing/silent-studio/scenes/closing/theme.js` |
| 6 | `marketing/silent-studio/brandmark/closing/README.md` | `marketing/silent-studio/scenes/closing/README.md` |
| 7 | `marketing/silent-studio/start-ride/index.html` | `marketing/silent-studio/scenes/start-ride/index.html` |
| 8 | `marketing/silent-studio/start-ride/theme.js` | `marketing/silent-studio/scenes/start-ride/theme.js` |
| 9 | `marketing/silent-studio/start-ride/README.md` | `marketing/silent-studio/scenes/start-ride/README.md` |
| 10 | `marketing/silent-studio/start-ride/map.png` | `marketing/silent-studio/scenes/start-ride/map.png` |
| 11 | `marketing/silent-studio/start-ride/map-day.png` | `marketing/silent-studio/scenes/start-ride/map-day.png` |
| 12 | `marketing/silent-studio/gates-saving/index.html` | `marketing/silent-studio/scenes/gates-saving/index.html` |
| 13 | `marketing/silent-studio/gates-saving/theme.js` | `marketing/silent-studio/scenes/gates-saving/theme.js` |
| 14 | `marketing/silent-studio/gates-saving/README.md` | `marketing/silent-studio/scenes/gates-saving/README.md` |
| 15 | `marketing/silent-studio/gates-saving/map.png` | `marketing/silent-studio/scenes/gates-saving/map.png` |
| 16 | `marketing/silent-studio/gates-saving/map-day.png` | `marketing/silent-studio/scenes/gates-saving/map-day.png` |
| 17 | `marketing/silent-studio/ranking/index.html` | `marketing/silent-studio/scenes/ranking/index.html` |
| 18 | `marketing/silent-studio/ranking/theme.js` | `marketing/silent-studio/scenes/ranking/theme.js` |
| 19 | `marketing/silent-studio/ranking/README.md` | `marketing/silent-studio/scenes/ranking/README.md` |
| 20 | `marketing/silent-studio/ranking/map.png` | `marketing/silent-studio/scenes/ranking/map.png` |
| 21 | `marketing/silent-studio/ranking/map-day.png` | `marketing/silent-studio/scenes/ranking/map-day.png` |

Do **not** edit the contents of any moved `index.html` (not even stale comments) — that would change the
generated compositions and break V5.

### 4.2 Per-part folders → archive (after 4.1; each is a whole-folder `mv`, leaves no empty dir behind)

| # | source | destination | what's left inside / why archived |
|---|---|---|---|
| 22 | `marketing/silent-studio/brandmark/` | `marketing/archive/pre-teaser-full-studios/silent-studio/brandmark/` | base lockup (`index.html`, `theme.js`, `README.md`, `renders/`, `rounds/`) + `opening/{renders,rounds}` + `closing/{renders,rounds}` |
| 23 | `marketing/silent-studio/start-ride/` | `marketing/archive/pre-teaser-full-studios/silent-studio/start-ride/` | `renders/`, `rounds/` only |
| 24 | `marketing/silent-studio/gates-saving/` | `marketing/archive/pre-teaser-full-studios/silent-studio/gates-saving/` | `renders/`, `rounds/` only |
| 25 | `marketing/silent-studio/ranking/` | `marketing/archive/pre-teaser-full-studios/silent-studio/ranking/` | `renders/`, `rounds/` only |
| 26 | `marketing/silent-studio/colours/` | `marketing/archive/pre-teaser-full-studios/silent-studio/colours/` | not part of teaser-full at all |
| 27 | `marketing/silent-studio/ride/` | `marketing/archive/pre-teaser-full-studios/silent-studio/ride/` | cycle-17 start-ride+gates-saving pairing, superseded by teaser-full |
| 28 | `marketing/silent-studio/teaser/` | `marketing/archive/pre-teaser-full-studios/silent-studio/teaser/` | old ffmpeg-concat teaser (incl. hidden `.hyperframes/`, `.thumbnails/`, `parts/`) |

Before rows 23-25, confirm with `ls -A` that only `renders` and `rounds` remain; anything else → escalation,
skip that row.

### 4.3 all-renders (silent) — per-part files → archive

Keep in place: `teaser_v9.mp4` (pinned: `prep_kit.py` VIDEOS entry + `kitv1` + test fixtures point at it) and
**every** `teaser-full_v*.mp4` (at planning time `teaser-full_v1.mp4` and `teaser-full_v2.mp4`; Nathan may add
more while you work — never move any of them).

| # | source | destination |
|---|---|---|
| 29 | `marketing/silent-studio/all-renders/closing_v5.mp4` | `marketing/archive/pre-teaser-full-studios/silent-studio/all-renders/closing_v5.mp4` |
| 30 | `marketing/silent-studio/all-renders/colours_v5.mp4` | `…/silent-studio/all-renders/colours_v5.mp4` |
| 31 | `marketing/silent-studio/all-renders/gates-saving_v9.mp4` | `…/silent-studio/all-renders/gates-saving_v9.mp4` |
| 32 | `marketing/silent-studio/all-renders/opening_v3.mp4` | `…/silent-studio/all-renders/opening_v3.mp4` |
| 33 | `marketing/silent-studio/all-renders/ranking_v8.mp4` | `…/silent-studio/all-renders/ranking_v8.mp4` |
| 34 | `marketing/silent-studio/all-renders/ride_v1.mp4` | `…/silent-studio/all-renders/ride_v1.mp4` |
| 35 | `marketing/silent-studio/all-renders/start-ride_v4.mp4` | `…/silent-studio/all-renders/start-ride_v4.mp4` |

(`…` = `marketing/archive/pre-teaser-full-studios`.) Any other file you find in `all-renders/` that is neither
kept nor listed → leave it, log it.

### 4.4 Docs and the build script

| # | source | destination |
|---|---|---|
| 36 | `marketing/silent-studio/structure.md` | `marketing/archive/pre-teaser-full-studios/silent-studio/structure.md` (then write a new one, §6.1) |
| 37 | `marketing/silent-studio/COMMANDS.md` | `marketing/archive/pre-teaser-full-studios/silent-studio/COMMANDS.md` (then write a new one, §6.1) |
| 38 | `marketing/cycles/21_teaser-single-render-unification/build_teaser_v2.py` | `marketing/silent-studio/build_teaser_full.py` (then edit, §6.1 item 1) |

`check-teaser-full-v2.py` in the same cycle-21 folder stays (it is a one-off historical checker already out of
date since cycle 23; log it as a nit, don't edit).

---

## 5. Moves — audio-studio

| # | source | destination | note |
|---|---|---|---|
| 39 | `marketing/audio-studio/teaser/arrangements/` | `marketing/audio-studio/teaser-full/arrangements/` | LIVE — do this first; its internal `../../tools/teaser-lanes/` links still resolve at the new depth |
| 40 | `marketing/audio-studio/teaser/` | `marketing/archive/pre-teaser-full-studios/audio-studio/teaser/` | after 39: `AUDIO-BRIEF.md`, `README.md`, `soundtrack.py`, `soundv1/`, `soundv2/`. If `arrangements/` is still in it (39 failed), skip 40 and log |
| 41 | `marketing/audio-studio/brandmark/` | `…/audio-studio/brandmark/` | synth-era rounds (dropped cycle 16) |
| 42 | `marketing/audio-studio/colours/` | `…/audio-studio/colours/` | " |
| 43 | `marketing/audio-studio/gates-saving/` | `…/audio-studio/gates-saving/` | " |
| 44 | `marketing/audio-studio/ranking/` | `…/audio-studio/ranking/` | " |
| 45 | `marketing/audio-studio/start-ride/` | `…/audio-studio/start-ride/` | " |
| 46 | `marketing/audio-studio/all-renders/gates-saving_v9_with_sound_v11.mp4` | `…/audio-studio/all-renders/gates-saving_v9_with_sound_v11.mp4` | folder `audio-studio/all-renders/` itself stays, empty |
| 47 | `marketing/audio-studio/all-renders/opening_v3_with_sound_v3.mp4` | `…/audio-studio/all-renders/opening_v3_with_sound_v3.mp4` | |
| 48 | `marketing/audio-studio/all-renders/ride_v1_with_sound_v3.mp4` | `…/audio-studio/all-renders/ride_v1_with_sound_v3.mp4` | |
| 49 | `marketing/audio-studio/all-renders/start-ride_v4_with_sound_v9.mp4` | `…/audio-studio/all-renders/start-ride_v4_with_sound_v9.mp4` | |
| 50 | `marketing/audio-studio/AUDIO-BRIEF.template.md` | `…/audio-studio/AUDIO-BRIEF.template.md` | per-scene template, old workflow |
| 51 | `marketing/audio-studio/FEEDBACK.template.md` | `…/audio-studio/FEEDBACK.template.md` | " |
| 52 | `marketing/audio-studio/structure.md` | `…/audio-studio/structure.md` | then write a new one, §6.2 |

(`…` = `marketing/archive/pre-teaser-full-studios`.)

**Stays put in audio-studio, do not move:** `ride/` (see §0 fact 2), `piano/`, `stemsplitter/`, `tools/`
(both `teaser-lanes/` and `av-align/`), `__pycache__/`, `synth.py`, `salamander_render.py`, `window_mix.py`,
`fluid_render.py`, `APPROACH.md`.

---

## 6. Edits

### 6.1 silent-studio

1. **`marketing/silent-studio/build_teaser_full.py`** (moved in row 38). Change exactly these string literals,
   each must occur exactly once (else escalation, don't edit the script at all):
   - `'brandmark/opening/index.html'` → `'scenes/opening/index.html'`
   - `'start-ride/index.html'` → `'scenes/start-ride/index.html'` — careful: the comment on line 9 also contains
     `start-ride/index.html` without quotes; match the **quoted** literal for the SCENES entry, and separately
     change the comment's `see start-ride/index.html's own comment` → `see scenes/start-ride/index.html's own comment`.
   - `'gates-saving/index.html'` → `'scenes/gates-saving/index.html'`
   - `'ranking/index.html'` → `'scenes/ranking/index.html'`
   - `'brandmark/closing/index.html'` → `'scenes/closing/index.html'`
   - Insert after the `TF = …` line:
     `# Moved 2026-09-26 (marketing cycle 24) from cycles/21_teaser-single-render-unification/build_teaser_v2.py;`
     and `# scene sources now live in silent-studio/scenes/<scene>/. Claude-side tool (ROOT is the ~/mnt VM path).`
   - Leave everything else (ROOT, SS, TF, the numbers) byte-identical. Do **not** run it against the real
     `teaser-full/` — V5 runs a redirected copy.
2. **`marketing/silent-studio/render.ps1`** — four text changes, nothing else:
   - `render (e.g. gates-saving, colours, brandmark\opening). Defaults to` → `render (e.g. teaser-full, scenes\start-ride). Defaults to`
   - `'teaser' for backward compatibility.` → `'teaser-full' (changed 2026-09-26, marketing cycle 24: the old 'teaser' concat folder is archived).`
   - In `.EXAMPLE`, replace the five lines `.\render.ps1 -Name gates-saving` … `.\render.ps1 -Name gates-saving -Theme day -Render`
     with: `.\render.ps1 -Name scenes\start-ride`, `.\render.ps1 -Name scenes\gates-saving -Theme day`,
     `.\render.ps1 -Name teaser-full -Theme day -Render` (keep the first two lines `.\render.ps1` and
     `.\render.ps1 -Render`, same indentation as the originals).
   - `[string]$Name = 'teaser',` → `[string]$Name = 'teaser-full',`
3. **New `marketing/silent-studio/structure.md`.** Header: `# silent-studio — structure` then
   `> Rewritten 2026-09-26 (marketing cycle 24, studio-folders restructure). The previous version (the
   "one top-level folder per ingredient" layout) is archived at
   ../archive/pre-teaser-full-studios/silent-studio/structure.md.` Then short sections covering:
   - **The one rule now:** there is one deliverable, `teaser-full/`, a single HyperFrames composition
     (1920x1080, cycle 21). Nothing is assembled from separate renders any more.
   - **Layout:** the silent-studio part of the §2 tree, one line per entry.
   - **How a change reaches the teaser:** edit the scene source `scenes/<scene>/index.html` → Claude runs
     `build_teaser_full.py`, which regenerates `teaser-full/compositions/<id>.html` from the five sources (no
     hand-retyped tweens) → if a scene's duration changed, the slot `data-start`/`data-duration` values and the
     total in the hand-authored master `teaser-full/index.html` are updated to match (cycle 23 is the worked
     example) → render `teaser-full` with `render.ps1` → copy the MP4 to `all-renders/teaser-full_vN.mp4`
     (next free N; never overwrite an earlier one) and, for review, `teaser-full/rounds/vN/`. A table mapping
     `scenes/` folder ↔ `compositions/` file: opening↔`opening.html`, start-ride↔`startride.html`,
     gates-saving↔`gatessaving.html`, ranking↔`ranking.html`, closing↔`closing.html`. Scenes can still be
     previewed alone (`-Name scenes\<scene>`) but a scene is no longer rendered or reviewed on its own.
   - **all-renders:** silent teaser renders only — every `teaser-full_vN.mp4`, plus `teaser_v9.mp4` kept
     because `teaser-lanes`'s `kitv1` is built from it. Sibling rule kept but narrowed: `audio-studio/all-renders/`
     holds the with-sound version of the same teaser (`teaser-full_vN_with_sound_vM.mp4`) once one exists; a
     cleanup pass still checks both folders. Keep a heading containing the word "all-renders" (the cycles
     conventions doc points at "structure.md's all-renders section").
   - **`_map/`:** basemap capture tool for the three map scenes; unchanged.
   - **Where the old per-part folders went:** one line pointing at `../archive/pre-teaser-full-studios/silent-studio/`
     and at `../cycles/24_studio-folders-restructure/README.md` for the full path map.
   Keep it under ~90 lines, no invented facts beyond this brief.
4. **New `marketing/silent-studio/COMMANDS.md`.** Header `# COMMANDS.md — copy-paste PowerShell for HyperFrames`
   + `> Rewritten 2026-09-26 (marketing cycle 24) for the teaser-full-only layout; previous version archived at
   ../archive/pre-teaser-full-studios/silent-studio/COMMANDS.md.` Sections (every block obeys §1.6):
   - Preview / render the teaser:
     ```powershell
     cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
     powershell -ExecutionPolicy Bypass -File ".\render.ps1" -Name teaser-full
     ```
     and the same with `-Render`, and with `-Theme day -Render`. One line noting the MP4 lands in
     `teaser-full\renders\` and a block copying it to all-renders:
     ```powershell
     cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
     Copy-Item -Path ".\teaser-full\renders\<the file render.ps1 printed>.mp4" -Destination ".\all-renders\teaser-full_vN.mp4"
     ```
     (say: replace `<…>` and `N` by hand; never overwrite an existing version).
   - Preview one scene on its own: `powershell -ExecutionPolicy Bypass -File ".\render.ps1" -Name scenes\start-ride`
     (with its own `cd` line).
   - A section titled exactly **`## The three product scenes (start-ride, gates-saving, ranking)`** (the
     `_map/README.md` links to that title) with the map copy block:
     ```powershell
     cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
     $src = "$env:USERPROFILE\Downloads\map.png"
     $hf  = "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
     foreach ($c in 'scenes\start-ride','scenes\gates-saving','scenes\ranking') { Copy-Item $src (Join-Path $hf "$c\map.png") -Force }
     ```
     If P4 showed `teaser-full/map.png` is byte-identical to the three scenes', add `'teaser-full'` to that
     `foreach` list; if not, leave it out and log a nit ("teaser-full/map.png differs from the scenes' copy —
     not added to the copy loop").
   - Scaffolding and direct fallback, as in the archived version, but `npx.cmd hyperframes init <name>` /
     `npx.cmd hyperframes preview` / `npx.cmd hyperframes render`, each block with its own `cd`.
   Do not add a separate "build compositions" PowerShell command: `build_teaser_full.py` is a Claude-side
   tool (its ROOT is the VM path); just say so in one sentence.
5. **`marketing/silent-studio/_map/README.md`:** line 5 — replace `` `start-ride/`, `gates-saving/` and
   `ranking/` `` with `` `scenes/start-ride/`, `scenes/gates-saving/` and `scenes/ranking/` (moved there
   2026-09-26, cycle 24) ``; the PowerShell block containing line 26 — change the `foreach` list exactly as in
   item 4 (same P4 rule for `'teaser-full'`) and, if the block does not already start with a full `cd "C:\…"`
   line, add `cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"` as its first line.
6. **`marketing/silent-studio/STUDIO-GUIDE.md`:** insert under its first heading one banner line:
   `> 2026-09-26 (marketing cycle 24): the only live composition is now teaser-full/; scene sources live in
   scenes/<scene>/ and the old per-part folders (incl. the concat teaser/) are archived — see structure.md.
   Examples below that name other folders (e.g. project/teaser) predate this.` Nothing else.
7. **Each of the five `marketing/silent-studio/scenes/<scene>/README.md`:** insert under the first heading:
   `> 2026-09-26 (marketing cycle 24): this folder now holds only this scene's canonical source. Its renders/
   and rounds/ history (the links in the status table below) moved to
   marketing/archive/pre-teaser-full-studios/silent-studio/<old path>/ — <old path> is brandmark/opening,
   brandmark/closing, start-ride, gates-saving or ranking. Edits here reach the teaser only via
   ../../build_teaser_full.py → ../../teaser-full/compositions/.` (write the concrete old path for each file,
   not the placeholder).

### 6.2 audio-studio

1. **New `marketing/audio-studio/structure.md`.** Header `# audio-studio — structure` + `> Rewritten 2026-09-26
   (marketing cycle 24, studio-folders restructure). The previous per-scene version is archived at
   ../archive/pre-teaser-full-studios/audio-studio/structure.md.` Sections:
   - **Current workflow:** sound design for the one teaser happens in `tools/teaser-lanes/teaser-lanes.html`
     (video left, nine lanes right, one playhead; it plays live and writes no audio). Output = a clip list
     pasted into chat and/or a saved arrangement JSON. Carry forward in one line the cycle-16 decision
     (2026-09-23): synthesised `synth.py` sound is dropped; real recordings (Tunetank) only.
   - **Kits:** `tools/teaser-lanes/kitvN/`, numbered by build iteration, built by `tools/teaser-lanes/prep_kit.py`
     from a silent render in `../silent-studio/all-renders/` (point at `tools/teaser-lanes/README.md` for the
     current kit list rather than restating it).
   - **Arrangements:** `teaser-full/arrangements/arrangement_vN/` (moved from `teaser/arrangements/`
     2026-09-26); a built sound round, when one exists, goes in `teaser-full/soundvN/`, and its muxed MP4 in
     `all-renders/teaser-full_vN_with_sound_vM.mp4`.
   - **Sound sources `prep_kit.py` reads — do not move without editing it:** `piano/projects/tunetank/…`
     (logo), `stemsplitter/tunetank-emotional-classical/sources/` (bed + stems), `ride/` (`ride_master.py`,
     `ride_tunetank.py` constants, `soundv2/ride_master_v2.wav` regression reference), and the root modules
     `synth.py`, `salamander_render.py`, `window_mix.py` (plus `fluid_render.py`, used by the piano scripts).
   - **all-renders:** empty as of this cycle; the with-sound sibling of `../silent-studio/all-renders/`.
   - **Other tools:** `tools/av-align/` (older per-scene alignment tool, kept as is).
   - **Where the old per-scene folders went:** pointer to `../archive/pre-teaser-full-studios/audio-studio/`
     and to `../cycles/24_studio-folders-restructure/README.md`.
   Under ~80 lines.
2. **`marketing/audio-studio/APPROACH.md`:** insert under its first heading: `> 2026-09-26 (marketing cycle 24):
   historical. The per-scene soundtrack.py/soundvN workflow described here is retired (synth direction dropped
   in cycle 16; per-scene folders archived in cycle 24 to ../archive/pre-teaser-full-studios/audio-studio/).
   Current workflow: tools/teaser-lanes/ — see structure.md.`
3. **`marketing/audio-studio/tools/teaser-lanes/README.md`** line 26: `` keep it in `teaser/arrangements/<version>/` ``
   → `` keep it in `audio-studio/teaser-full/arrangements/<version>/` (path changed 2026-09-26, cycle 24) ``.
   Nothing else in that README.
4. **`marketing/audio-studio/tools/teaser-lanes/teaser-lanes.html`** line 1485: inside the string, `move it into
   teaser/arrangements/` → `move it into teaser-full/arrangements/`. Exactly that substring, must occur once.
5. **`marketing/audio-studio/tools/teaser-lanes/verify_default_mix.py`:**
   - line 131: `os.path.join(AS, "brandmark", "opening", "soundv3", "soundtrack_v3.wav")` →
     `os.path.join(AS, "..", "archive", "pre-teaser-full-studios", "audio-studio", "brandmark", "opening", "soundv3", "soundtrack_v3.wav")`
     and append `  # moved 2026-09-26 (marketing cycle 24)` at the end of that line.
   - line 8 (docstring): `brandmark/opening/soundv3/soundtrack_v3.wav` →
     `archive/pre-teaser-full-studios/audio-studio/brandmark/opening/soundv3/soundtrack_v3.wav` (keep the rest of
     the line).
6. **`marketing/audio-studio/tools/av-align/README.md`:** insert under its first heading: `> 2026-09-26
   (marketing cycle 24): the per-scene renders this tool's table points at moved — silent ones to
   marketing/archive/pre-teaser-full-studios/silent-studio/all-renders/, sounded ones and per-scene soundvN
   folders to marketing/archive/pre-teaser-full-studios/audio-studio/. audio-studio/ride/ did not move.`

### 6.3 marketing-level

1. **`marketing/archive/README.md`:** append a dated section `## pre-teaser-full-studios/ (added 2026-09-26,
   cycle 24)` — two or three sentences: the per-part folders and per-part renders of both studios, retired when
   the teaser became one render; sub-paths mirror the original `silent-studio/…` / `audio-studio/…` layout;
   full path map in `../cycles/24_studio-folders-restructure/README.md`.
2. **`marketing/README.md`** (last edited 2026-09-14, very stale): insert directly under its first heading one
   banner: `> 2026-09-26 (marketing cycle 24): the layout and status table below are historical. Current
   layout: silent-studio/structure.md and audio-studio/structure.md.` Nothing else.
3. **`marketing/cycles/README.md`:** in the numbered list, directly after item 4 (the one about touching
   `teaser/` and a concat assembly step), add an indented line: `(2026-09-26, cycle 24: teaser/ is archived; the
   teaser is now the single render silent-studio/teaser-full/, so this step no longer applies.)`
4. **Open cycles' OPEN-ITEMS banners.** Grep every `marketing/cycles/*/OPEN-ITEMS.md` (not this cycle's) for
   any old path that moved in §4/§5 (patterns in V8). For each file with at least one hit, insert **one** line
   at the very top: `> 2026-09-26: some paths below moved in the studio-folders restructure — see
   ../24_studio-folders-restructure/README.md, section "Path map".` Do not rewrite the paths themselves.
   `23_piano-sync-leadin-cut-and-kit-rename/OPEN-ITEMS.md` will be one of them (its step 5 and "Leave
   feedback" point at `audio-studio/teaser/arrangements/…`) — that one matters most because Nathan is working
   through it today.

---

## 7. Explicitly out of scope — do not touch

`marketing/guides/`, `marketing/website/`, `marketing/hex-colours/`, `marketing/assets/`,
`marketing/HYPERFRAMES-IDEAS-DETAILED.md`, `marketing/HYPERFRAMES-PLAN.md`, `marketing/PLAN.md`, root `IDEAS.md`,
anything under `app/`, the root `*.ps1` commit scripts, the whole `marketing/silent-studio/teaser-full/`
folder (including stale comments inside `compositions/opening.html`), the contents of the five moved scene
`index.html` files, `tools/teaser-lanes/prep_kit.py`, `kits.json`, every `kitv*/` folder, `tests/`,
`audio-studio/ride/**`, `piano/**`, `stemsplitter/**`, every other cycle folder's files except the one-line
banners of §6.3 item 4, and everything under `marketing/archive/` except §6.3 item 1 and the moves themselves.
If you believe one of these *must* change, log it as an escalation — never just do it.

---

## 8. Known stale references to LEAVE and log (planner already found these — list them as nits in OPEN-ITEMS)

- `app/src/ui/tower.tsx:29` comment cites `marketing/silent-studio/ranking/rounds/v7` (app code, out of scope).
- `silent-studio/scenes/opening/index.html` ~line 99 and `teaser-full/compositions/opening.html` ~line 84:
  comment cites `marketing/audio-studio/teaser/arrangements/arrangement_v1/FEEDBACK-v1.md` (editing the source
  would change the generated composition; fix both together in a later cycle that re-runs the build).
- The scene sources and compositions have comments with `../_map/…` relative paths (now one level off from
  `scenes/<x>/`); comments only.
- `tools/teaser-lanes/prep_kit.py` ~line 64 note string cites `brandmark/opening/soundv3` (written into kit
  manifests; not edited while Nathan is building kitv3).
- `audio-studio/ride/ride_tunetank.py` and `ride_master.py` `__main__` blocks write into
  `../start-ride/soundvN/` and `../gates-saving/soundvN/`, and `ride/check_tunetank.py` reads from them — those
  folders are now archived, so running those scripts directly would fail. `prep_kit.py` only imports their
  constants/functions and is unaffected (verified by V6/V7 where possible).
- `cycles/21_teaser-single-render-unification/check-teaser-full-v2.py` still uses the pre-cycle-23 timings and
  old scene paths; historical.
- Candidate for a later cycle (not this one): moving `audio-studio/ride/` under a `sources/`-style folder,
  which needs `prep_kit.py` + `ride_*.py` path edits once Nathan's kitv3 build is done.

---

## 9. Verification (after all moves and edits) — save every output under `C/verify/post/`

- **V1 sizes:** for every §4/§5 row, the destination's `find … -printf '%P\t%s\n' | sort` must `diff` clean
  against its `pre/` manifest. For rows 1-21 and the brandmark row 22, verify via the combined content of
  source-side (`scenes/<x>/`) + archive-side (`…/<x>/`) against the pre-manifest of the original folder.
- **V2 sources gone:** each §4/§5 source path no longer exists (`[ ! -e … ]`), except the three folders that
  intentionally remain (`silent-studio/all-renders/`, `audio-studio/all-renders/`) and nothing else.
- **V3 empty dirs:** `find M/silent-studio M/audio-studio M/archive/pre-teaser-full-studios -type d -empty`.
  Expected new empties: only `marketing/audio-studio/all-renders`. Anything else not already in
  `pre/empty-dirs.txt` → log (do not remove).
- **V4 tree diff:** new full listings; confirm file count + total bytes of (studios + archive) before == after
  (edits change a few small doc sizes — list those, they are the only allowed differences, plus the three newly
  written files `silent-studio/structure.md`, `silent-studio/COMMANDS.md`, `audio-studio/structure.md`, and
  the moved-in `silent-studio/build_teaser_full.py`).
- **V5 build check:** copy `M/silent-studio/build_teaser_full.py` to `C/verify/build_after.py`, redirect its
  `TF = …` line to `C/verify/build-after` (with a `compositions/` subfolder) exactly as in P5, run it, and
  `diff -r C/verify/build-before/compositions C/verify/build-after/compositions` — **must be identical**. This
  proves the moved script reads the moved sources correctly. Never run the unredirected script.
- **V6 lanes tests:** rerun `node teaser-lanes.test.mjs`; same pass count as P6, zero new failures. If a
  file-hygiene case fails because of the §6.2 item 3/4 edits, revert just that edit from your own notes (you
  know the exact old text), log it, rerun.
- **V7 verify_default_mix:** rerun; `diff C/verify/pre/vdm.log C/verify/post/vdm.log` must be empty (proves the
  archived opening WAV path resolves).
- **V8 stale-reference grep** over `M/silent-studio`, `M/audio-studio` (excluding `kitv*/`, `__pycache__/`,
  `tests/fixtures/`), `M/README.md`, `M/archive/README.md`, `M/cycles/*/OPEN-ITEMS.md`, patterns:
  `brandmark/`, `brandmark\\`, `start-ride/` and `start-ride\\` not preceded by `scenes/`/`scenes\\`,
  same for `gates-saving`, `ranking`, `colours/`, `(^|[^-])teaser/` (i.e. not `teaser-full/`), `ride/soundv`
  is fine (ride stays), `all-renders/(closing|colours|gates-saving|opening|ranking|ride|start-ride)_`,
  `\.template\.md`, `build_teaser_v2`. Every hit is either one of the §6 edits' intended new text, inside a
  moved scene/arrangement file you were told not to edit, one of the §8 known items, or a line you add to
  OPEN-ITEMS "Stale references left on purpose". Archived files are not grepped.

---

## 10. What you write in the cycle folder `C`

1. **`EXECUTOR-REPORT-v1.md`** — every row 0-52 with status (moved / skipped + why), every §6 edit with status,
   the P and V results (numbers, pass counts, diff outcomes), and anything you logged.
2. **`README.md`** (cycle 24) — title `# Cycle 24 — studio folders restructure (teaser-full-centred)`; a
   process note (Digest = Haiku, Plan = Opus instead of Fable at Nathan's request, Execute = Sonnet,
   Inspect = Opus to follow); **why** (§0, in Nathan's words: he only works on the full teaser now, it's no
   longer assembled from individual renders, and sound design happens in teaser-lanes); the two §0 facts and
   the archive choice with its reason; a `## Path map` section containing the complete old → new table (rows
   0-52, written with full `marketing/…` paths — the OPEN-ITEMS banners link here); what stayed and why
   (`teaser-full/`, `tools/teaser-lanes/`, `audio-studio/ride/` + sources, `_map/`, `teaser_v9.mp4`);
   implementation order (0 → 4.1 → 4.2 → 4.3 → 4.4 → 5 → 6 → 9); and an empty
   `## Readout` table `| tier | model | tokens | outcome |` for the coordinator to fill.
3. **`OPEN-ITEMS.md`** — everything for Nathan, all commands in one place:
   - `## Blocker`: none for the restructure itself; nothing rendered; **nothing committed** — git was not
     touched; commit when your index is fixed (the moves will show up as deletions + additions that git pairs
     as renames). No git command given.
   - `## 1. Smoke-check the new layout` — three blocks, each with its own full `cd`:
     ```powershell
     cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
     powershell -ExecutionPolicy Bypass -File ".\render.ps1" -Name teaser-full
     ```
     ```powershell
     cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
     powershell -ExecutionPolicy Bypass -File ".\render.ps1" -Name scenes\start-ride
     ```
     (a scene previewed from its new folder is the one thing not verifiable from the VM — say so)
     ```powershell
     cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\audio-studio\tools\teaser-lanes"
     powershell -ExecutionPolicy Bypass -File ".\serve.ps1"
     ```
     then **Open arrangement** from `marketing\audio-studio\teaser-full\arrangements\arrangement_v1\`.
   - `## 2. Cycle 23 (piano-sync) paths that changed` — the arrangement/FEEDBACK paths its step 5 and
     "Leave feedback" use now live under `audio-studio/teaser-full/arrangements/arrangement_v1/`. Its render,
     all-renders copy, prep_kit/kitv3 and kits.json steps are unaffected.
   - `## 3. Stale references left on purpose` — §8 list plus whatever V8 found.
   - `## Escalations (for a fresh Opus ruling)` — everything you logged under §1.4 (write "none" if none).
   - `## Leave feedback` — one line: feedback on the new layout goes in this file or chat.

Hand back a short summary: rows moved/skipped, edits done, V1-V8 outcomes, escalations count.
