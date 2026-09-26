# INSPECT-REPORT-v1 — cycle 24 (studio folders restructure)

**Written:** 2026-09-26 (~14:25-14:45 UTC), Inspect tier (Opus, fresh context, read-only).
**Scope:** BRIEF-v1.md vs EXECUTOR-REPORT-v1.md / OPEN-ITEMS.md vs the actual filesystem.
Every number below comes from my own `find`/`stat`/`md5sum`/`diff`/reruns, not from the executor's logs.
Nothing in the repo was modified except this file; no git commands run. Scratch work went to `$HOME/inspect-v5`,
`$HOME/*.log` on the VM (outside `mnt/`).

## Verdict

**Has real defects (3) — but zero data loss and the moves themselves are clean.** All 50 executed move rows
landed byte-for-byte; the failed row 39/40 is genuinely in its pre-move state. The defects are in what the
executor *wrote* around the escalation: an unsafe suggested remedy, three live pointers to a folder that does
not exist, and one broken copy-paste command.

| # | Severity | Defect |
|---|---|---|
| D1 | real (blocks the suggested fix) | Escalation's remedy "retry the `mv`" would break `prep_kit.py` and a live parallel session (cycle 25); dependency missed by the brief, seen in V8 but not logged; escalation evidence also misstates the newest file |
| D2 | real | Three live docs/strings now point at `audio-studio/teaser-full/arrangements/`, which does not exist (row 39 failed) |
| D3 | real (small) | `silent-studio/COMMANDS.md` direct-fallback `npx.cmd hyperframes preview/render` blocks `cd` into the studio root, not a composition folder — won't work as written |

Nits N1-N7 at the end.

---

## 1. Move mapping spot-check (§4/§5) — PASS

I checked **every** executed row, not a sample:

- **§4.2 + §5 whole-folder rows** (22-28, 41-45): rebuilt `find -printf '%P\t%s'` manifests of each destination
  and diffed against `verify/pre/<label>.tsv`. `colours`, `ride-silent`, `teaser-silent` (incl. hidden
  `.hyperframes/`, `.thumbnails/`), `audio-brandmark`, `audio-colours`, `audio-gates-saving`, `audio-ranking`,
  `audio-start-ride`: **identical**.
- **§4.1 scene rows 1-21 + row 22-25 remainders**: `archive/.../<x>/` + `silent-studio/scenes/<x>/` combined vs
  pre manifest: identical except exactly the 5 scene `README.md` files (banner insert: opening 993→1344,
  closing 1653→2004, start-ride 978→1322, gates-saving 1988→2334, ranking 1585→1926). All `index.html`,
  `theme.js`, `map.png`, `map-day.png` sizes unchanged; `index.html` mtimes predate the cycle (not edited).
- **§4.3/§5 single-file rows** (29-35, 46-51) and docs (36, 37, 52): every destination exists with the exact
  pre size; every source is gone (36/37/52 sources exist again only as the newly written replacements; archived
  copies are the old 7623/4944/9852-byte versions).
- **Row 38**: `silent-studio/build_teaser_full.py` present (7508→7743 B, edits only — see §3); cycle-21
  source gone.
- **Row 0**: `cycles/23_studio-folders-restructure/` gone, `24_…` present.
- All 12 per-part source folders confirmed gone. `silent-studio/all-renders/` holds exactly
  `teaser-full_v1.mp4`, `teaser-full_v2.mp4`, `teaser_v9.mp4`; `audio-studio/all-renders/` is empty.

## 2. Nothing lost — PASS

Fresh `find marketing/silent-studio marketing/audio-studio marketing/archive -printf '%y\t%s\t%P'`:

| | files | bytes | dirs |
|---|---|---|---|
| pre (`verify/pre/tree-before.tsv`) | 645 | 821,604,032 | 197 |
| now (my scan, 14:25 UTC) | 649 | 821,622,580 | 209 |

- Multiset diff of (basename, size) pre vs now shows **only**: 4 new files (`build_teaser_full.py` entering the
  scan roots, the 3 rewritten `structure.md`/`COMMANDS.md`) and 13 in-place edits (`APPROACH.md`,
  `STUDIO-GUIDE.md`, `render.ps1`, `teaser-lanes.html`, `verify_default_mix.py`, 5 scene READMEs,
  `_map/README.md`, `teaser-lanes/README.md`, `av-align/README.md`, `archive/README.md`). No file vanished,
  no size changed unexplained. +4 files / +18,548 B is fully accounted for.
- +12 dirs = exactly the new ones (`scenes/` + 5, `pre-teaser-full-studios/` + `silent-studio/` +
  `audio-studio/` + 2× `all-renders/`, `audio-studio/teaser-full/`).
- Caveat on the evidence itself: `tree-before.tsv` uses `%P` across three roots, so paths from the three trees
  are blended (no root prefix). Counts/bytes are still valid; per-path comparison had to go via the per-row
  manifests (done in §1).

## 3. Independent reruns of executor checks

- **V5 build check — PASS.** Copied the live `silent-studio/build_teaser_full.py`, redirected only its
  `TF = …` line to `$HOME/inspect-v5/out` (asserted the anchor occurs once), ran it (rc 0, 5 files written).
  `diff -r` against the live `teaser-full/compositions/` **and** against `verify/build-before/compositions/`:
  both identical; md5s match `verify/pre/build-md5.txt` (closing `fdf32150…`, gatessaving `9f9c542b…`,
  opening `29b39d2c…`, ranking `961ec380…`, startride `e4a6e13d…`). Live compositions' mtimes are 11:09 UTC —
  untouched this cycle. Diff of `build_teaser_full.py` vs the executor's `build_before.py` shows only the
  5 SCENES literals, the one comment, and the two inserted comment lines — as specified.
- **V7 verify_default_mix — PASS.** Reran myself: rc 0, `MIX OK`, output byte-identical to `verify/pre/vdm.log`
  (span (b) now reads the archived `soundtrack_v3.wav`, 1,146,644 B, present).
- **V6 lanes tests — PASS.** Reran: 229/231, same two pre-existing failures (`kits.json … defaults to
  kit-teaser-full`, `HOWTO entry 1 names both kits`), identical FAIL lines to the pre log.
- **V8 stale-reference grep — PASS on coverage, FAIL on classification (→ D1, N5).** My own grep with the
  brief's patterns over both studios + `marketing/README.md` + `archive/README.md` hit 35 files; every one of
  them is in the executor's `verify/post/v8-studios.txt` (theirs is a superset). Nothing new outside that set.
  But one hit in their own log was not classified: `tools/teaser-lanes/prep_kit.py:77`
  (`default_arrangement="marketing/audio-studio/teaser/arrangements/arrangement_v2/arrangement_v2.json"`) — see D1.

## 4. Row 39/40 escalation state — PASS (state), FAIL (evidence + remedy)

- `audio-studio/teaser/arrangements/` intact: manifest identical to `verify/pre/audio-arrangements.tsv`
  (9 files incl. `arrangement_v2/arrangement_v2.json`). `audio-studio/teaser/` also identical to
  `audio-teaser.tsv` (18 files). `audio-studio/teaser-full/` exists and is **empty** (no partial move).
  Nothing under `archive/.../audio-studio/teaser/`. Clean pre-move state.
- **Evidence is wrong:** OPEN-ITEMS says the newest file inside `arrangements/` is `README.md` at 12:06 UTC.
  Actually `arrangement_v2/arrangement_v2.json` has mtime **13:10 UTC** (the folder `arrangement_v2/` was created
  12:04 today). Not within the 10-minute P1 window, so the go decision stands, but the stated evidence is inaccurate.
- The unsafe remedy is D1.

## 5. Out-of-scope list (§7) — PASS

`find . -newermt '2026-09-26 13:40' -type f` over the whole repo (excluding `.git`, `node_modules`) returns
only the cycle-24 folder, the 13 §6 edit targets + 4 new files listed above, the 12 cycle `OPEN-ITEMS.md`
banners, `marketing/cycles/README.md`, `marketing/README.md` — and `cycles/25_rides-ranking-arrangement-v3/questionsfornathan.md`
(13:52, before the executor's first pre-flight file at 14:06 — written by a parallel session, not the executor).
Specifically: `prep_kit.py` 12:04, `kits.json` 11:25, `kitv3/` untouched, `teaser-full/**` newest 11:09 (bar
renders at 13:15), `guides/`, `website/`, `hex-colours/`, `assets/`, `ride/**`, `piano/**`, `stemsplitter/**`
nothing modified. Five moved scene `index.html` files keep their original mtimes.

## 6. Doc edits (§6) — mostly PASS

Read in full: new `silent-studio/structure.md`, new `silent-studio/COMMANDS.md`, new `audio-studio/structure.md`,
`build_teaser_full.py` header/SCENES, `render.ps1` (whole file), 5 scene README heads, `_map/README.md` copy block,
`STUDIO-GUIDE.md`, `APPROACH.md`, `av-align/README.md`, `archive/README.md`, `marketing/README.md`,
`cycles/README.md` item 4, `verify_default_mix.py` lines 8 and 131, cycle-24 `README.md`.

- Dating/banner requirements: every edit is dated 2026-09-26 and tagged "cycle 24". No undated splices.
- `render.ps1`: all four changes exactly as specified; `.EXAMPLE` has the 2 kept + 3 new lines.
- Map copy-loop (`COMMANDS.md`, `_map/README.md`): includes `'teaser-full'`; justified — I confirmed md5
  `34f23820…` is identical for `teaser-full/map.png` and all three `scenes/*/map.png`. `_map` block now starts
  with its own full `cd`.
- Every PowerShell block in the new `COMMANDS.md` has its own full `cd` line, uses `-ExecutionPolicy Bypass -File`,
  and `npx.cmd`. Content is complete, not truncated or garbled.
- Required heading `## The three product scenes (start-ride, gates-saving, ranking)` present verbatim; `## all-renders`
  heading present in `silent-studio/structure.md`.
- Failures: D2, D3.

---

## Defects (precise)

### D1 — the row-39 remedy is unsafe; a live dependency was missed

- `marketing/audio-studio/tools/teaser-lanes/prep_kit.py:77` hard-codes
  `default_arrangement="marketing/audio-studio/teaser/arrangements/arrangement_v2/arrangement_v2.json"` (line 75's
  note string cites the same path; `kitv3/manifest.json:277-278` and `kitv3/prep-report.txt:48` record it).
  Brief §0 fact 2 ("prep_kit reads ride/, piano/, stemsplitter/, root modules") is incomplete — `arrangement_v2`
  was added by cycle 23 at 12:04 today, likely after the planner looked.
- A parallel session, `marketing/cycles/25_rides-ranking-arrangement-v3/` (file at 13:52 UTC), is actively building
  arrangement v3 from `teaser/arrangements/arrangement_v1/rides-options/option-A-piano-then-bed.json` and `FEEDBACK-v1.md`.
  That (or a teaser-lanes server/Explorer handle) is a plausible cause of the Windows "Permission denied".
- The executor's V8 log (`verify/post/v8-studios.txt` lines 131-132) contains `prep_kit.py:75/77`, but OPEN-ITEMS §3
  lists only `prep_kit.py` line 64. OPEN-ITEMS' "Suggested next step for the ruling: retry the `mv` …" would, if
  followed, make the next `prep_kit.py` run fail to find its default arrangement and would pull the folder out from
  under cycle 25.
- **For the ruling:** row 39 must not be retried as a bare `mv`. It needs (a) cycle 25 finished/parked, and
  (b) a coordinated edit of `prep_kit.py:75,77` (out of scope for cycle 24 and on Nathan's kitv3 path → needs his
  OK), or else row 39/40 are dropped and D2's edits reverted.

### D2 — live pointers to a non-existent folder

With row 39 not done, these three edits describe a state that does not exist:
- `marketing/audio-studio/structure.md:21` — "`teaser-full/arrangements/arrangement_vN/` (moved from
  `teaser/arrangements/` 2026-09-26)" — false; also its "Sound sources `prep_kit.py` reads" section omits
  `teaser/arrangements/arrangement_v2/arrangement_v2.json`, and the doc never mentions the still-present `teaser/`.
- `marketing/audio-studio/tools/teaser-lanes/README.md:26` — "keep it in `audio-studio/teaser-full/arrangements/<version>/`".
- `marketing/audio-studio/tools/teaser-lanes/teaser-lanes.html:1485` — the Save status message now says
  "move it into teaser-full/arrangements/". Since `audio-studio/teaser-full/` exists (empty), Nathan following it
  would create a second arrangements folder and split arrangements across two locations.
OPEN-ITEMS §1/§2 correctly say arrangements are still at the old path, but do not flag that these three edits now
contradict that. Fix: revert those three texts (the executor has the exact old strings) until row 39 lands, or land
row 39 per D1.

### D3 — broken fallback command in the new silent-studio/COMMANDS.md

`marketing/silent-studio/COMMANDS.md`, section "Scaffolding and direct fallback": the `npx.cmd hyperframes preview`
and `npx.cmd hyperframes render` blocks `cd` to `…\marketing\silent-studio` (the studio root, which is not a
HyperFrames project). The archived version cd'd into `…\silent-studio\<folder-name>`, and the brief said "as in the
archived version". Should be `cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio\teaser-full"`.
(`init <name>` from the root is correct.)

## Nits (no action required for sign-off)

- **N1** `cycles/23_piano-sync-leadin-cut-and-kit-rename/OPEN-ITEMS.md` got the "some paths below moved" banner, but
  its only real path hits are `audio-studio/teaser/arrangements/…`, which did not move — the banner is now misleading
  on exactly the cycle Nathan is working through. `cycles/02_…/OPEN-ITEMS.md`'s banner is triggered only by prose
  ("gates-saving/ranking" sector verdicts), a false positive.
- **N2** EXECUTOR-REPORT V1 says "the `brandmark` base README" changed size — it did not (base README unchanged;
  the changed ones are `opening/`/`closing/` READMEs, i.e. two of the five scene READMEs).
- **N3** `build_teaser_full.py` SCENES rows: column padding now uneven after the literal edits (cosmetic; required by
  "change exactly these literals").
- **N4** New `silent-studio/COMMANDS.md` dropped the archived `checkpoint.ps1` section and the "why double-clicking
  `index.html` doesn't work" note (brief didn't require them, but `checkpoint.ps1` is listed as a kept file with no
  documented command now); it also says "because P4 confirmed…" (internal jargon in a Nathan-facing doc).
- **N5** Stale references in out-of-scope folders that V8 hit but OPEN-ITEMS §3 doesn't itemise:
  `audio-studio/ride/README.md` (links to `../start-ride/`, `../gates-saving/`, `../../silent-studio/teaser/…` — now
  broken), `audio-studio/ride/soundv2/concat.txt` (an ffmpeg input list pointing at `silent-studio/all-renders/start-ride_v4.mp4`
  and `silent-studio/gates-saving/rounds/v8/…` — now archived; functional, not just a comment),
  `audio-studio/piano/projects/interstellar/NOTES.md` + `fluid_soundtrack.py`, `piano/named-keys.html`,
  `piano/piano-cycles/01-…/NOTES.md`, `silent-studio/teaser-full/README.md:25,29` (scene table says `brandmark/opening`
  / `brandmark/closing`), and the `teaser-full/.hyperframes/preview/` cache.
- **N6** `render.ps1` `.PARAMETER Theme` still says "all seven tokenised compositions" (not in the edit list; stale).
- **N7** V3 extra empty dir `audio-studio/teaser-full/` — correctly attributed to the escalation by the executor.

## What I did not verify

- On-device HyperFrames preview of `-Name scenes\start-ride` / `teaser-full` (Windows-only; same limit as the executor).
- The actual cause of the Windows "Permission denied" (no visibility into Windows handles from the VM).
