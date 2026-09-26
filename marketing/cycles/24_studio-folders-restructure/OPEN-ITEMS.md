# Cycle 24 — OPEN-ITEMS

## Blocker

None for the restructure itself. Nothing rendered this cycle. **Nothing committed** — git was not
touched at all (per the brief's "no git" rule); commit when the local git index is fixed (the moves
will show up as deletions + additions that git should pair as renames).

## 1. Smoke-check the new layout

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
powershell -ExecutionPolicy Bypass -File ".\render.ps1" -Name teaser-full
```

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
powershell -ExecutionPolicy Bypass -File ".\render.ps1" -Name scenes\start-ride
```

(A scene previewed from its new `scenes\` folder is the one thing not verifiable from the VM — please
check it opens correctly.)

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\audio-studio\tools\teaser-lanes"
powershell -ExecutionPolicy Bypass -File ".\serve.ps1"
```

Then **Open arrangement** from `marketing\audio-studio\teaser\arrangements\arrangement_v1\` — **note:
this is still the OLD path**, see the Escalations entry below; it was not moved to
`teaser-full\arrangements\` this cycle.

## 2. Cycle 23 (piano-sync) paths that changed

Cycle 23's `OPEN-ITEMS.md` step 5 and "Leave feedback" point at
`audio-studio/teaser/arrangements/arrangement_v1/FEEDBACK-v1.md` and the sibling `rides-options/`
files. **Because of the row-39 escalation below, these paths did NOT change this cycle** — they are
still exactly where cycle 23 left them (`marketing/audio-studio/teaser/arrangements/...`). No action
needed on cycle 23's own commands as a result. Its render, all-renders copy, `prep_kit`/kitv3 and
`kits.json` steps are unaffected either way.

## 3. Stale references left on purpose

From the brief's own §8 list (planner-verified, left as is):

- `app/src/ui/tower.tsx:29` comment cites `marketing/silent-studio/ranking/rounds/v7` (app code, out of
  scope).
- `silent-studio/scenes/opening/index.html` ~line 99 and `teaser-full/compositions/opening.html` ~line
  84: comment cites `marketing/audio-studio/teaser/arrangements/arrangement_v1/FEEDBACK-v1.md` (editing
  the source would change the generated composition; fix both together in a later cycle that re-runs
  the build).
- The scene sources and compositions have comments with `../_map/…` relative paths, now one level off
  from `scenes/<x>/` (comments only).
- `tools/teaser-lanes/prep_kit.py` ~line 64 note string cites `brandmark/opening/soundv3` (written into
  kit manifests; not edited while Nathan is building kitv3).
- `audio-studio/ride/ride_tunetank.py` and `ride_master.py` `__main__` blocks write into
  `../start-ride/soundvN/` and `../gates-saving/soundvN/`, and `ride/check_tunetank.py` reads from them —
  those folders are now archived, so running those scripts directly would fail. `prep_kit.py` only
  imports their constants/functions and is unaffected.
- `cycles/21_teaser-single-render-unification/check-teaser-full-v2.py` still uses pre-cycle-23 timings
  and old scene paths; historical, left as is.
- Candidate for a later cycle: moving `audio-studio/ride/` under a `sources/`-style folder, which needs
  `prep_kit.py` + `ride_*.py` path edits once Nathan's kitv3 build is done.

Additional items V8 (this cycle's stale-reference grep) turned up, not previously listed, left as is:

- `audio-studio/synth.py` (lines 4, 11, 288, 300) still cites `brandmark/opening`/`brandmark/closing` in
  comments — the file is out of scope for this brief's edits.
- The 5 moved scene `README.md` files (`scenes/{opening,closing,start-ride,gates-saving,ranking}/
  README.md`), below the inserted banner, still contain their original body text: old
  `render.ps1 -Name brandmark\...` commands and `../../teaser/` links. The brief specified only the one
  banner insert per file, not a body rewrite, so these were left untouched.
- `marketing/README.md` and `audio-studio/APPROACH.md` and `audio-studio/tools/av-align/README.md` still
  contain many old per-part paths below their inserted banners — by design, since each banner explicitly
  declares the rest of that document historical/retired rather than rewriting it line by line.
- Every other cycle's `OPEN-ITEMS.md` (02, 03, 04, 05, 06, 07, 10, 11, 20, 21, 22, 23) still contains its
  original old-path references below the new top banner — per §6.3 item 4's own instruction ("do not
  rewrite the paths themselves").

## Escalations (for a fresh Opus ruling)

**1. Row 39 — `mv` failed with Windows `Permission denied`. Corrected after Inspect (Opus) review: do NOT just retry this.**

- **What:** `marketing/audio-studio/teaser/arrangements/` could not be moved to
  `marketing/audio-studio/teaser-full/arrangements/`.
- **Exact command + output:**
  ```
  $ mv "marketing/audio-studio/teaser/arrangements" "marketing/audio-studio/teaser-full/arrangements"
  mv: cannot move 'marketing/audio-studio/teaser/arrangements' to 'marketing/audio-studio/teaser-full/arrangements': Permission denied
  ```
  Retried once (~1 minute later): identical error.
- **Corrected freshness evidence:** the executor's original note ("newest file is README.md at 12:06")
  was wrong. The actual newest file at the time of the attempt was
  `arrangements/arrangement_v2/arrangement_v2.json`, mtime **2026-09-26 13:10 UTC** — created by cycle 23
  only ~1 hour before this cycle ran, not two hours as originally logged.
- **Real reason this move should stay parked (found by Inspect, not just a Windows lock):**
  `audio-studio/tools/teaser-lanes/prep_kit.py` lines 75/77 **hard-code** the path
  `marketing/audio-studio/teaser/arrangements/arrangement_v2/arrangement_v2.json` as kitv3's
  `default_arrangement`. Moving the folder without also editing those two lines would silently break the
  next `prep_kit.py` run. Separately, `marketing/cycles/25_rides-ranking-arrangement-v3/questionsfornathan.md`
  (written 2026-09-26 13:52 UTC — after this cycle's execution) shows an active follow-on task building an
  "arrangement v3" from `arrangement_v1/option-A-piano-then-bed.json`, i.e. another piece of work reading
  from this exact folder. The Windows permission error may simply be a symptom of this folder being in
  active use, not an unrelated lock.
- **What I did instead:** left `marketing/audio-studio/teaser/arrangements/` (and therefore all of
  `marketing/audio-studio/teaser/`, row 40) exactly where it was; did not retry more than once; did not
  request delete permission; did not attempt any workaround. Proceeded with every other row/edit that does
  not depend on rows 39/40. The three doc/tool-string edits that had assumed row 39 succeeded
  (`audio-studio/structure.md`, `tools/teaser-lanes/README.md`, `teaser-lanes.html`'s save message) have
  been reverted back to the true, unmoved path (`teaser/arrangements/`) with a note pointing here, so no
  live doc currently claims a move that didn't happen.
- **Downstream effect:** `marketing/audio-studio/teaser-full/` exists (created by §4.0's `mkdir -p`) but is
  an **empty** directory, since `arrangements/` never landed inside it (flagged in V3). This is expected
  and fine to leave as-is until row 39 lands.
- **Ruling: do NOT retry the `mv` as-is.** Land row 39 only once (a) cycle 25's arrangement-v3 work is
  done and no longer reading from `teaser/arrangements/`, and (b) `prep_kit.py` lines 75 and 77 are edited
  in the same pass to point at the new `teaser-full/arrangements/...` path — and Nathan should confirm
  that edit, since `prep_kit.py` is explicitly out-of-scope for this cycle's brief (§7) and building kitv3
  from a moved default-arrangement path he hasn't seen change is exactly the kind of silent breakage this
  process exists to avoid. Once both are true, re-run this cycle's V1-V4 and V8 for the audio-studio side
  only, and re-apply the three doc/tool-string edits above (this time verified, not reverted).

## Nits (found by Inspect, not fixed live — low priority, next pass)

- `render.ps1`'s help text still says "all seven tokenised compositions" somewhere in its remaining prose
  (a leftover count from the old seven-part layout); cosmetic, doesn't affect behavior.
- `audio-studio/ride/soundv2/concat.txt` (an ffmpeg input list used only when running `ride_tunetank.py`/
  `ride_master.py` directly, not via `prep_kit.py`) now points at some archived per-part sound files;
  those direct-run scripts would fail if invoked standalone. `prep_kit.py`'s own use of `ride/` is
  unaffected (only imports constants/functions). Already flagged in §3 above, listed again here as it's
  the same "may need a path fix in a later cycle" bucket.
- `build_teaser_full.py`'s comment column alignment is slightly uneven after the two inserted comment
  lines — cosmetic only, script behavior unaffected (verified byte-identical output in V5).

## Leave feedback

Feedback on the new layout goes in this file or in chat.
