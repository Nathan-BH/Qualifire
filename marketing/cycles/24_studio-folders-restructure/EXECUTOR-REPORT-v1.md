# EXECUTOR-REPORT-v1 — cycle 24 (studio folders restructure)

Execute tier: Sonnet, direct `device_bash` execution per BRIEF-v1.md. No git commands run to modify
the repo (per the brief's "no git" rule). Step 0 (cycle-folder rename) was already done before this
run started, per the coordinator's note; confirmed present, not re-attempted.

## Pre-flight (§3)

- **P1 concurrency guard** — `find marketing/silent-studio marketing/audio-studio -newermt '-10
  minutes'` (excluding `teaser-full/`, `tools/teaser-lanes/`, `all-renders/teaser-full_v*`): **0 hits.**
  Clear to proceed.
- **P2 existence + expected contents** — all 5 scene folders (`brandmark/opening`, `brandmark/closing`,
  `start-ride`, `gates-saving`, `ranking`) had exactly the expected `ls -A` contents, no extras. All
  §4/§5 destinations confirmed not to exist beforehand.
- **P3 size manifests** — written to `verify/pre/*.tsv` (per-folder and per-file), plus
  `tree-before.tsv` (842 lines, 821,604,032 bytes across 645 files) and `empty-dirs.txt` (1 pre-existing
  empty dir: `silent-studio/brandmark/renders`).
- **P4 map check** — `teaser-full/map.png`, `start-ride/map.png`, `gates-saving/map.png`,
  `ranking/map.png` all md5 `34f23820af597ab54e966e36c622ba3e` — **identical**. `'teaser-full'` was
  therefore added to the map copy-loop in COMMANDS.md and `_map/README.md` (§6.1.4/.5).
- **P5 build-script baseline** — `grep -n TF build_teaser_v2.py`: only the two expected lines (def +
  one write use). Redirected copy run cleanly; the 5 output md5s matched the 5 live
  `teaser-full/compositions/*.html` md5s exactly — confirms the live compositions were already in sync
  with sources before this cycle.
- **P6 teaser-lanes tests baseline** — 229 pass / 2 FAIL of 231 (`kits.json ... defaults to
  kit-teaser-full`, `HOWTO entry 1 names both kits`) — pre-existing, unrelated to this cycle (kit-config
  state, mid-build by Nathan).
- **P7 verify_default_mix.py baseline** — exit 0, `MIX OK`.

## Moves — silent-studio (§4)

**§4.0** — mkdir -p for `scenes/{opening,start-ride,gates-saving,ranking,closing}`,
`archive/pre-teaser-full-studios/{silent-studio,audio-studio}/all-renders`, `audio-studio/teaser-full`:
done.

**§4.1 (rows 1-21, scene sources → `scenes/`)** — all 21 moved, rc=0 each. Confirmed via `ls -A` that
`start-ride/`, `gates-saving/`, `ranking/` then held only `renders/`+`rounds/` before §4.2.

**§4.2 (rows 22-28, whole folders → archive)** — all 7 moved, rc=0 each
(`brandmark/`, `start-ride/`, `gates-saving/`, `ranking/`, `colours/`, `ride/`, `teaser/`).

**§4.3 (rows 29-35, all-renders files → archive)** — all 7 moved, rc=0 each. Kept in place:
`teaser_v9.mp4`, `teaser-full_v1.mp4`, `teaser-full_v2.mp4` (confirmed still present, nothing else
found in the folder beyond the listed + kept set).

**§4.4 (rows 36-38, docs + build script)** — all 3 moved, rc=0 each
(`structure.md`, `COMMANDS.md` → archive, then rewritten; `build_teaser_v2.py` → `build_teaser_full.py`).
`check-teaser-full-v2.py` left in place per instruction.

## Moves — audio-studio (§5)

**Row 39 live-concurrency check** — `find marketing/audio-studio/teaser/arrangements -newermt '-2
minutes'`: 0 hits (newest file inside was ~2 hours old at check time). No live collision.

**Row 39 — FAILED (not a collision):** `mv marketing/audio-studio/teaser/arrangements
marketing/audio-studio/teaser-full/arrangements` → `mv: Permission denied`. Retried once, same error.
Left untouched (still at `marketing/audio-studio/teaser/arrangements/`). **Logged as an escalation** —
see `OPEN-ITEMS.md`.

**Row 40 — SKIPPED** (depends on row 39; `arrangements/` is still inside `marketing/audio-studio/teaser/`,
matching the brief's own skip condition). Logged alongside row 39.

**Rows 41-45 (whole folders → archive)** — all 5 moved, rc=0 each
(`brandmark/`, `colours/`, `gates-saving/`, `ranking/`, `start-ride/`).

**Rows 46-49 (all-renders files → archive)** — all 4 moved, rc=0 each. `audio-studio/all-renders/` is
now empty, as intended.

**Rows 50-52 (docs)** — all 3 moved, rc=0 each (`AUDIO-BRIEF.template.md`, `FEEDBACK.template.md` →
archive; `structure.md` → archive, then rewritten).

**Row count: 51 of 53 listed rows (0 + 1-52) moved/created successfully; rows 39-40 skipped (escalated).**

## Edits (§6)

All applied and spot-verified by re-reading the file after editing; each string/anchor matched exactly
once as the brief required (no anchor mismatches encountered).

| # | File | Status |
|---|---|---|
| 6.1.1 | `silent-studio/build_teaser_full.py` (5 SCENES paths, 1 comment string, TF-line comment insert) | done |
| 6.1.2 | `silent-studio/render.ps1` (4 changes: PARAMETER doc, default note, `.EXAMPLE` block, `$Name` default) | done |
| 6.1.3 | `silent-studio/structure.md` — new (69 lines) | done |
| 6.1.4 | `silent-studio/COMMANDS.md` — new (69 lines) | done |
| 6.1.5 | `silent-studio/_map/README.md` (line 5 wording + foreach block incl. `cd` + `'teaser-full'`) | done |
| 6.1.6 | `silent-studio/STUDIO-GUIDE.md` banner | done |
| 6.1.7 | 5× `silent-studio/scenes/<scene>/README.md` banners (concrete old path each) | done |
| 6.2.1 | `audio-studio/structure.md` — new (43 lines) | done |
| 6.2.2 | `audio-studio/APPROACH.md` banner | done |
| 6.2.3 | `audio-studio/tools/teaser-lanes/README.md` line 26 | done |
| 6.2.4 | `audio-studio/tools/teaser-lanes/teaser-lanes.html` line 1485 | done |
| 6.2.5 | `audio-studio/tools/teaser-lanes/verify_default_mix.py` lines 8 + 131 | done |
| 6.2.6 | `audio-studio/tools/av-align/README.md` banner | done |
| 6.3.1 | `marketing/archive/README.md` append | done |
| 6.3.2 | `marketing/README.md` banner | done |
| 6.3.3 | `marketing/cycles/README.md` item-4 indented line | done |
| 6.3.4 | 12× other cycles' `OPEN-ITEMS.md` top banner (02, 03, 04, 05, 06, 07, 10, 11, 20, 21, 22, 23) | done |

## Verification (§9)

- **V1 (sizes)** — every §4/§5 row's destination manifest diffed clean against its `pre/` manifest,
  except the intended banner-size increases in the 5 scene `README.md` files and the `brandmark` base
  README (all expected/intended edits, no unexplained deltas). Whole-folder moves with no edits
  (`colours`, `ride`(silent), `teaser`(silent), `audio-studio/{brandmark,colours,gates-saving,ranking,
  start-ride}`) diffed **byte-identical**. All 11 single-file rows (all-renders + templates) matched
  their pre-manifest sizes exactly. **PASS.**
- **V2 (sources gone)** — every listed source path confirmed gone (`[ ! -e ]`), except the two folders
  meant to remain (`silent-studio/all-renders/`, `audio-studio/all-renders/`, both correctly non-empty/
  empty as designed) and `audio-studio/teaser/` (still present — rows 39/40 escalation). **PASS**
  (given the logged escalation).
- **V3 (empty dirs)** — new empties found: `audio-studio/all-renders` (expected) and, **because of the
  row-39 escalation**, `audio-studio/teaser-full` (created by §4.0 mkdir, never filled since row 39
  failed). Also `archive/.../silent-studio/brandmark/renders` — this is the same pre-existing empty dir
  from `pre/empty-dirs.txt`, just relocated with its parent folder. No unexplained empties. **PASS**
  (one anomaly, fully attributable to the logged escalation).
- **V4 (tree diff)** — file count 645→649 (+4), bytes 821,604,032→821,622,580 (+18,548). The +4 is
  exactly: the 3 rewritten docs (`silent-studio/structure.md`, `silent-studio/COMMANDS.md`,
  `audio-studio/structure.md`, each archived-then-replaced = net +1 file each) plus
  `build_teaser_full.py` entering the scanned root (it moved in from `marketing/cycles/21_.../`, outside
  the silent-studio/audio-studio/archive scan roots, to `marketing/silent-studio/`, inside them) — no
  unexplained file-count change. The byte delta is fully attributable to the doc rewrites/banners
  listed in §6. **PASS.**
- **V5 (build check)** — moved `build_teaser_full.py` copied and redirected exactly as `build_before.py`
  was; `diff -r build-before/compositions build-after/compositions` → **empty, identical.** Proves the
  moved script reads the moved `scenes/` sources correctly. **PASS.**
- **V6 (lanes tests)** — reran `teaser-lanes.test.mjs`: same 229 pass / 2 FAIL of 231, same two
  pre-existing failures, zero new failures. **PASS.**
- **V7 (verify_default_mix)** — reran; `diff pre/vdm.log post/vdm.log` → empty. Proves the archived
  `soundtrack_v3.wav` path resolves correctly through the edited script. **PASS.**
- **V8 (stale-reference grep)** — ran the full pattern set over `silent-studio/`, `audio-studio/`
  (excl. `kitv*/`, `__pycache__/`, `tests/fixtures/` — none matched there anyway), `marketing/README.md`,
  `marketing/archive/README.md`, and every `marketing/cycles/*/OPEN-ITEMS.md`. 135 + 103 hits reviewed
  line by line; every one falls into: (a) this cycle's own new/intended text, (b) inside a file this
  cycle was told not to edit beyond an inserted banner (the 5 scene `README.md`s' bodies,
  `scenes/opening/index.html`, `teaser-full/**`), (c) one of the §8 known-stale items, (d) covered by a
  banner that already declares the whole doc historical (`marketing/README.md`, `audio-studio/
  APPROACH.md`, `audio-studio/tools/av-align/README.md`), (e) historical cycle `OPEN-ITEMS.md` content
  left untouched by design (§6.3.4's own instruction: "do not rewrite the paths themselves"), or (f) a
  direct, expected consequence of the row-39/40 escalation (`audio-studio/teaser/**` still exists and is
  self-consistent since it never moved). Two additional never-before-listed stale-reference nits were
  found and logged to OPEN-ITEMS §3: `synth.py` comments citing `brandmark/opening`/`brandmark/closing`,
  and the 5 scene `README.md`s' own bodies (old `render.ps1 -Name brandmark\...` commands and
  `../../teaser/` links) below the inserted banner. **PASS**, with findings logged rather than silently
  fixed (content edits beyond the specified banner/anchor edits were out of scope for this brief).

## Escalations logged

1 (row 39/40, Windows permission-denied `mv`) — see `OPEN-ITEMS.md` → `## Escalations`.

## Nits logged (not escalations, no ruling needed)

- `synth.py` comments still cite `brandmark/opening`/`brandmark/closing` (unedited, out of scope for
  this brief's §6 list).
- The 5 moved scene `README.md`s retain old `render.ps1 -Name brandmark\...` commands and `../../teaser/`
  links in their un-banner-ed body text (brief specified only the banner insert, not a content rewrite).
