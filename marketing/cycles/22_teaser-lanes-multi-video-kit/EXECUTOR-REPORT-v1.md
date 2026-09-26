# EXECUTOR-REPORT-v1.md — cycle 22 (teaser-lanes: multi-video kit picker)

Executor: Sonnet, 2026-09-26. Brief: `BRIEF-v1.md`. Two open calls pre-resolved by the coordinator and implemented
as directed: §12 item 3 (re-stamp cycle 20's two rides-options JSON files' `kit`/`video` header fields) — DONE;
§12 items 1/2/4 — implemented exactly as the brief's stated defaults (see "Open calls" below).

## RESUMED after RULING-v1 — both stops resolved, full checklist now passing
A fresh-context Fable ruling (`RULING-v1.md`) confirmed both items below as genuine brief-internal contradictions
and gave exact, verified resolutions. Applied both to the real `teaser-lanes.html`, wrote `tests/e2e-served.mjs`
per §7.3 + Ruling 1's two amendments, and re-ran the full §8 checklist end to end (not assumed):

| check | result |
|---|---|
| `node teaser-lanes.test.mjs` (device VM) | `ALL PASS: 231/231` |
| `node teaser-lanes.test.mjs` (cloud) | `ALL PASS: 231/231` |
| `node tests/synthetic-kit.mjs out/synkit && node tests/e2e.mjs out/synkit out/e2e` | `ALL PASS: 390/390` (was 389/390 before Ruling 2) |
| `node tests/mutants-open.mjs . tests/out/mut tests/out/synkit` | 20/20 mutants killed |
| `node tests/synthetic-kit.mjs out/synkit && node tests/e2e-served.mjs out/synkit out/served` (NEW, §8 row 8) | `ALL PASS: 18/18` |
| `node tests/e2e-real.mjs /tmp/kit-v9 out/real-v9` | `ALL PASS: 86/86` (unchanged) |
| `node tests/e2e-real.mjs /tmp/kit-full out/real-full` | `ALL PASS: 69/69` (unchanged) |

Nothing left NOT RUN except the Windows-only `serve.ps1` and the "Only Nathan can verify" items (unchanged, still
require Nathan's own Chrome/Edge). One environment issue hit and fixed along the way: the first `device_commit_files`
write of the Ruling-1-fixed `teaser-lanes.html` (made in the prior turn, before this resumption) did not persist —
`device_stage_files` read back the pre-Ruling-1 86048-byte file when this resumption started. Re-committed from the
verified-correct scratch copy and re-verified via `device_stage_files` (md5 `e95a2e34a34bdbc0382afa7c31b50fc5`,
86414 bytes) and `device_bash` (matching md5, `grep` finding the new comment text) before relying on it. Updated
`README.md` (tool) and `OPEN-ITEMS.md` accordingly; see below for what those items originally documented.

## STOPPED — two anchor mismatches found (need a Fable ruling; details and evidence in `OPEN-ITEMS.md`)

1. **§5.4 `fetchKitEntries` (implemented verbatim) cannot pass §7.3's required test scenario.** `fetchKitEntries`
   throws on any non-ok fetch, including a single missing per-track file. §7.3 requires serving an unmodified copy
   of `tests/synthetic-kit.mjs`'s output (which deliberately omits `b-drums.wav` — verified by running it) and
   reaching `ready · 5 lanes` via auto-load. As specified, that 404 aborts the load before `openKit` ever runs, so
   it cannot reach "ready". The file:// path (`openKit`) already tolerates a missing per-track file gracefully;
   `fetchKitEntries` does not mirror that. Resolving this is a served-mode error-handling design decision, not
   something to guess. **`tests/e2e-served.mjs` was not written; §8 row 8 was not run.**
2. **The literal §5.3 `HOWTO[0]` text breaks the protected test `tests/e2e.mjs`** (§10: must not change; §0 rule 5:
   must still fully pass). Verified: `node tests/e2e.mjs tests/out/synkit tests/out/e2e` → 389/390 passed, one
   failure: `1440x900 how-to full text shown iff the viewport is at least 1440x900 [shown: false]`. Root cause
   (via `fitHowto()`): the new, much longer `HOWTO[0]` text overflows the how-to block's available height at
   1440x900, so the page falls back to the short hint even though the viewport meets the stated threshold.
   `HOWTO[0]` was implemented exactly as given and was not shortened, since fixing it either by trimming the text,
   changing CSS, or changing the protected test is a call outside the executor's authority.

Everything below this line is what WAS completed and verified. Nothing was deleted; nothing outside the new kit
folder / the two named exceptions (`kit/manifest.json`'s `made`/`video_key`, the two option files' header fields)
was touched, per §10.

## Section 8 checklist

| # | where | command | result |
|---|---|---|---|
| 1 | device VM | `md5sum all-renders/teaser-full_v1.mp4` | `3db40a137a9d879220879594af053d3f` ✓ |
| 2 | device VM | `python3 prep_kit.py teaser_v9` + §4.4 compare | `PREP OK`, `IDENTICAL` ✓ |
| 3 | device VM | `python3 verify_default_mix.py` | `MIX OK` ✓ |
| 4 | device VM | `python3 prep_kit.py teaser-full_v1` | `PREP OK`, 1419 frames / 142 keyframes / 47.300000 ✓ |
| 5 | device VM + cloud | `node teaser-lanes.test.mjs` | **`ALL PASS: 231/231`** (not 233/233 — see OPEN-ITEMS #3, a documentation-only count typo in §7.1, not a code issue) ✓ both places |
| 6 | cloud | `node tests/synthetic-kit.mjs out/synkit && node tests/e2e.mjs out/synkit out/e2e` | 389/390 at the time (1 FAIL, see STOPPED #2) — **now 390/390 after Ruling 2, see "RESUMED" above** |
| 7 | cloud | `node tests/mutants-open.mjs . tests/out/mut tests/out/synkit` | all 20 mutants caught ✓ |
| 8 | cloud | `node tests/e2e-served.mjs ...` | not run at the time (file not written, see STOPPED #1) — **now written and 18/18, see "RESUMED" above** |
| 9 | cloud | `node tests/e2e-real.mjs /tmp/kit-v9 out/real-v9` (old kit stand-in) | **86/86** ✓ |
| 10 | cloud | `node tests/e2e-real.mjs /tmp/kit-full out/real-full` (new kit stand-in) | **69/69** ✓ (86 − 17 fixture-block checks skipped: `manifest.kit === "teaser-full"` → `EXP.fixtures === false`) |
| 11 | device VM | `python3 -c "import json;json.load(open('kits.json'))"` + `GIT_OPTIONAL_LOCKS=0 git -c core.quotepath=off check-ignore kit-teaser-full/manifest.json` | valid JSON; prints `kit-teaser-full/manifest.json` (ignored) ✓ |

## §4.4 regression compare output
```
IDENTICAL
```
`kit/prep-report.txt` ends `PREP OK`; `python3 verify_default_mix.py` ends `MIX OK`.

## New kit (`kit-teaser-full/`) prep-report.txt, step 3, verbatim
```
== step 3: video (short-GOP proxy) ==
md5 source 3db40a137a9d879220879594af053d3f expected 3db40a137a9d879220879594af053d3f
proxy kept (checks pass)
proxy: 1419 frames, 142 keyframes (every 10), timestamps identical to the source (max diff 0.000000 s), 16.2 MB
ffprobe: codec_name=h264, width=1920, height=1080, r_frame_rate=30/1, nb_frames=1419, duration=47.300000
```
(First build: "proxy encoded in 72 s" instead of "proxy kept" — shown above is the regression-check rebuild after
a later, harmless prep_kit.py note-text fix, §12 item 3 follow-up below.) Full step-8 manifest check (by hand):
kit `teaser-full`; video file `teaser-full_v1-proxy.mp4`, name `teaser-full_v1.mp4`, fps 30, duration_s 47.3,
frames 1419, keyframes 142; clips: logo (0, 6.2), seven bed/stem pairs at (10.0, 15.0465) and (22.74, 9.76), e5
(24.0, 8.5) — all exactly as predicted in BRIEF-v1.md §4.5. `wrote manifest.json: 9 tracks, 16 clips`; `PREP OK`.

## Files created / modified (line counts are the file's current total, not a diff)
- `marketing/silent-studio/all-renders/teaser-full_v1.mp4` — new, copy of the night render (md5 confirmed)
- `marketing/silent-studio/teaser-full/rounds/v1/teaser-full_v1.mp4` — new, same copy
- `marketing/silent-studio/teaser-full/rounds/v1/FEEDBACK.md` — new, 10 lines, exact text from §3
- `marketing/silent-studio/teaser-full/README.md` — edited, 1 paragraph (52 lines total)
- `marketing/audio-studio/tools/teaser-lanes/prep_kit.py` — edited, 487 lines (VIDEOS table, per-video
  `proxy_check`/`main`, CLI arg, docstring)
- `marketing/audio-studio/tools/teaser-lanes/kit/` — rebuilt once, byte-identical except `manifest.json.made` and
  the new `video_key` field (confirmed `IDENTICAL`)
- `marketing/audio-studio/tools/teaser-lanes/kit-teaser-full/` — new, git-ignored, built by `prep_kit.py
  teaser-full_v1`
- `marketing/audio-studio/tools/teaser-lanes/kits.json` — new, 9 lines, committed
- `marketing/audio-studio/tools/teaser-lanes/serve.ps1` — new, 16 lines, committed (Windows-only, **NOT RUN**)
- `marketing/audio-studio/tools/teaser-lanes/teaser-lanes.html` — edited, 1621 lines (kitPick markup, 2 empty-card
  lines, HOWTO[0], `parseKitsList`/`kitFiles` in lanes-core + export, served-mode block, `initServed()` in `init()`)
- `marketing/audio-studio/tools/teaser-lanes/teaser-lanes.test.mjs` — edited, 577 lines (new section 20, 13 cases)
- `marketing/audio-studio/tools/teaser-lanes/tests/e2e-real.mjs` — edited, 193 lines (TABLE/EXP, all literals keyed
  off it, fixtures block gated by `EXP.fixtures`)
- `marketing/audio-studio/tools/teaser-lanes/tests/e2e-served.mjs` — new, 167 lines, written after `RULING-v1.md`
  (18 checks, all pass)
- `marketing/audio-studio/tools/teaser-lanes/.gitignore` — edited, +`kit-teaser-full/`
- `marketing/audio-studio/tools/teaser-lanes/README.md` — edited, all of §9.1's points including the e2e-served.mjs
  row (filled in after `RULING-v1.md`) and the served-mode missing-file note
- `marketing/audio-studio/teaser/arrangements/arrangement_v1/rides-options/option-A-piano-then-bed.json` — edited,
  header fields only (`kit`, `video.file`, `video.name`, `video.duration_s`, `video.frames`); clips/notes/muted
  untouched (coordinator-resolved §12 item 3)
- `marketing/audio-studio/teaser/arrangements/arrangement_v1/rides-options/option-B-piano-plus-stems.json` — same
- `marketing/cycles/22_teaser-lanes-multi-video-kit/kit-manifest-before.json` — new, pre-edit copy of `kit/manifest.json`
- `marketing/cycles/22_teaser-lanes-multi-video-kit/COMMANDS.md` — new
- `marketing/cycles/22_teaser-lanes-multi-video-kit/OPEN-ITEMS.md` — new
- `marketing/cycles/22_teaser-lanes-multi-video-kit/README.md` — status line updated
- `marketing/cycles/22_teaser-lanes-multi-video-kit/EXECUTOR-REPORT-v1.md` — this file

## Follow-up note on §12 item 3 (re-stamp)
After re-stamping the two option files, `prep_kit.py`'s own `extra_notes` text for `teaser-full_v1` (written
verbatim from §4.1) said opening them would show a "made for a different video" note — no longer true once
re-stamped (their `video.duration_s`/`fps` now match the kit exactly). Corrected that one sentence in
`prep_kit.py`'s `extra_notes` (not part of §4.1's literal text, a narrow factual follow-on to the coordinator's own
resolution) and rebuilt `kit-teaser-full/` so the shipped manifest note is accurate; re-ran the full §4.4 regression
and `verify_default_mix.py` afterward to confirm nothing else was affected (both still pass, see table above).

## NOT RUN (Windows only)
- `serve.ps1` — needs Nathan's Chrome/Edge and a local Python; cannot be exercised from either sandbox.
- Everything under "Only Nathan can verify" in `README.md` / `OPEN-ITEMS.md`.

## Environment note
`device_bash`'s mount of the Qualifire folder showed stale content once during this run (a `device_commit_files`
write reported success but `device_bash` kept reading the pre-write bytes for ~1-2 calls); confirmed via
`device_stage_files` (which reads the true current file) and a retry, consistent with the known Plan9-mount
flakiness already on file in project memory. No data was lost; the affected file (`prep_kit.py`) was re-verified
byte-for-byte before being relied on.
