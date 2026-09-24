# INSPECT-REPORT: cycle 19, teaser sound lanes

Inspector: fresh-context Opus (INSPECT tier), 2026-09-24. Read-only on the tool; I wrote only this file (plus scratch outside the repo).
Nothing was listened to. "Verified" below means I measured it or looked at a screenshot, and each item says which.

## Verdict: PASS with fixes

The tool does what Nathan asked. It shows two clocks, lets him type clips (source in/out plus render start), loads everything with one folder pick, has mute and solo, and opens on today's teaser sound. The copy list is exact.

Everything I recomputed matched the claims:
- **Default mix:** the default state reproduces `ride_master_v2.wav` within 1 LSB and the opening within 0 LSB.
- **Alignment:** the stems line up with the original at lag 0.
- **Sync:** stepping keeps the video and all 9 lane readouts in sync at every frame I tested.
- **Hygiene:** clean.

There are no blockers. Three majors should be fixed or consciously accepted:
- the copy list mixes the listening state (solo) into the output;
- the test suites do not cover the audio engine or the video seek;
- the long-GOP h264 is likely to make frame stepping sluggish on Nathan's PC.

Defect counts: **blocker 0, major 3, minor 8, cosmetic 9.**

## Defects (numbered, most severe first)

### Major
1. **The copy list's "muted" flag comes from the solo state, and nothing says what "muted" means.** `formatClipList` appends `muted` whenever `audible()` is false. Soloing one lane to audition it therefore marks logo, bed and E5 as `muted` in the only output Nathan pastes to Claude. Measured: with S on a-strings and on e5, the list gives `logo: ... (gain 0.85, fade out 0.5 s, muted)`, `bed: ... (gain 0.45, muted)` twice, and every stem except a-strings muted. The header does not define `muted` ("leave out" or "keep but silent"), and 12 of the 17 default lines are `muted`. Suggested fix, for the Plan tier to rule: base the flag on M only, not on solo. Also either define it in the header ("muted = not in the mix, leave it out") or leave muted clips out of the list.
2. **The suites do not test the audio engine or the video seek.** I ran 35 mutations on copies in my scratchpad, each through the unit test, the synthetic e2e and the real-kit e2e.
   - **Caught:** 19 of 21 core-function mutations are caught by the unit test (for example +1 frame in render-to-source, wrong sign, mute does nothing in `audible`, solo ignored, in/out swapped in the list, fade direction, file offset sign). The e2e catches three app mutations: lane readout +1 frame, Duplicate keeps its old `at`, and `+` placed one frame late.
   - **Survived everything:**
     - M6 `clipEnd = at + out` and M7 `startParams` ignoring `in`: every unit case uses `in = 0`.
     - A1 scrub ignores mute.
     - A2 lane gain always 1 (mute does nothing during play).
     - A3 play starts every file at 0.
     - A4 scrub plays from file 0.
     - A5 scrub one frame late.
     - A6 video seeks one frame late (brief §12.7's `video.currentTime` check is not in the e2e).
     - A8 waveform drawn ignoring `in`.
     - A9 editing `len` sets `out = len`.
     - A10 fade-out ramp removed.
     - A11 one clip never started.
     - A12 resync disabled.

   The current code is correct: I checked every one of these behaviours independently with an audio-graph probe (defect list evidence E6). But a regression in any of them would pass all 142 + 322 + 69 checks. Fix: add `in > 0` unit cases for `clipEnd`/`startParams`/`frameSlice`. Also add an e2e probe that wraps `AudioBufferSourceNode.start`/`AudioNode.connect` (as in E6) and asserts scrub offsets, play offsets and the lane gain for muted lanes, plus `video.currentTime ∈ [n/30, (n+1)/30)` after each step.
3. **Frame stepping is likely to be slow on the real video (risk, only Nathan can confirm).** `kit/teaser_v9.mp4` is a verbatim copy with only 8 keyframes, at 0 / 6.5 / 14.83 / 20.5 / 28.83 / 32.8 / 41.13 / 43.6 s. GOPs are up to 250 frames, three of them inside or next to the ride. Each ArrowRight seek has to decode from the previous keyframe. On a 1080p VP9 stand-in with the same 250-frame GOP (headless, software decode), I measured one step taking 30 ms right after a keyframe and 244 / 385 / 700 / 645 ms at 60 / 120 / 240 / 249 frames after it.
   - The readout and lane readouts update at once, so the video visibly lags them.
   - After 400 ms the scrub slice fires before the frame is on screen (the `setTimeout(after, 400)` fallback).

   Hardware h264 decode on Windows will be faster, but by an unknown amount. Fix (a Plan call, because §4 step 3 mandates a verbatim copy): let `prep_kit.py` also write a short-GOP or all-intra proxy (for example `-g 1` or `-g 10`, 1080p or 720p) into the kit and point the manifest at it. Keep the md5 check on the original.

### Minor
4. **Nathan's own example gives a silent, "muted" clip by default.** All stems start muted, so `+` on strings A at 44 creates a clip he cannot hear, listed as `a-strings: source 0.000-10.000 s -> render 44.000-54.000 s (gain 1, muted)`. The how-to never says to unmute the lane first. `+` also defaults to gain 1, while every placement of the same stem in the ride uses 0.45 (2.2x louder). The README example shows `(gain 1)`. Suggest: `+` inherits the lane's usual gain (or 0.45 for bed-family lanes) and unmutes the lane, or at least says "lane is muted" in the status.
5. **Clips past the end of the video are accepted without a word.** Nathan's example ends at 54.000, and `+` at 44 makes 44.000–59.047, but the video ends at 47.600. The rule is per brief §10 ("end may exceed it"), yet neither the editor nor the list says that the last 6.4 s (or 11.4 s) lie beyond the video. Claude reading `render 44.000-54.000 s` has to infer the cut from the header. Suggest: `(…, cut at 47.600 by the video end)` in the list, or a status note.
6. **Number entry:** comma decimals (`0,45`, `24,3`, `1,5`) are refused with `"0,45" is not a number`, which is likely to trip a Belgian locale. Negative values are also reported as "is not a number" (`"-1" is not a number (seconds, or f + frame)`), not "must be ≥ 0". Measured in the UI.
7. **Seeking during play stops playback.** Clicking a lane or the ruler, or pressing an arrow, while playing pauses (`stepTo` calls `pausePlay`). Measured: clicking the bed lane at f300 during play gives paused at f714. A non-editor may expect play to continue from the new point. At least say so in the how-to.
8. **No undo.** The `Delete` key removes the selected clip at once, and the only way back is **Reset**, which discards every edit.
9. **Traceability.** `REQUIREMENTS-from-nathan.md` (binding) still says "a top big panel with the video … below the sound channels". The later "video left" quote Nathan gave appears only in the brief and the cycle README. Amend REQUIREMENTS (coordinator bookkeeping) so the binding file matches what was built.
10. **The e2e play checks depend on timing.** Under CPU load (4 runs in parallel) e2e-real failed `play 1.5 s … video advanced 1.04 s (>= 1.2)` on an unrelated mutation. They pass when run alone.
11. **README test table:** the e2e-real row says `<dir with the 9 wavs + manifest + a 47.6 s video.webm>` but does not say that `manifest.video.file` must be patched to the webm. Its header comment does, the README does not.

### Cosmetic (looked at in screenshots)
12. **Small text:** 9 px `in`/`out` canvas tags, 10 px ruler labels, 10.5 px lane labels, 11 px `src` and frame numbers. Readable in the headless screenshots; Windows ClearType at 100 % may not be.
13. **Editor frame hints read like frame indexes:** `f300` under a **len**, and fractional frames under source times (`f253.13` for out 8.438, `f1680.13` under end).
14. **Overlapping clips on one lane draw their waveforms on top of each other,** so you cannot tell which is which (bed lane at 12 s after `+`, insp-edgecases). Waveforms are normalised per lane, so a gain-1 clip and a gain-0.45 clip look the same.
15. **Editor labels `in / out / len / at / end`** are editor jargon. The how-to says "source in-out … render start"; `at` could read "render start".
16. **Stacked layout (1000x800):** the sticky status bar covers the frame hints under the editor fields (executor's own `main-1000x800.png`).
17. **0.5 s zoom:** the last frame label at the ruler's right edge is clipped (`f73…`).
18. **Empty state:** zoom buttons and the "sound when stepping" box look enabled while the transport is greyed. The right half is blank with no "lanes appear here".
19. **1920x1080:** about 140 px unused under the 9 lanes (lanes capped at 96 px), plus an empty strip under the how-to.
20. **Bed clip 1** (`out` 15.0465, the file's `source_len_s` rounded to 4 decimals) plays `round(15.0465*44100)` = 663,551 samples, one sample (23 µs) short of the file. Negligible, noted for completeness.

## Evidence (commands I ran, numbers I got)

**E1 Node tests.** In the VM (node v22.23.2), `cd …/teaser-lanes && node teaser-lanes.test.mjs` gives `ALL PASS: 142/142 passed`, rc 0, 0.34 s. The cloud (node v22.22.2) also gives 142/142. I read the test source: every expectation is a literal, and none is computed with the function under test. Gaps: no case with `in > 0` for `clipEnd`/`startParams`, and no two-solos case.

**E2 prep_kit.py re-run (idempotent).** `timeout 170 python3 prep_kit.py` gives `PREP OK` in 29.7 s.
- **md5s before and after are identical** for all 9 wavs and the video:
  - a-other `a6927b52…`, a-strings `321936c0…`, b-bass `c3df5190…`, b-drums `c9b9ec71…`
  - b-other `8bd24abb…`, b-piano `f32e9ee9…`, bed `24f986c4…`, e5 `89052834…`, logo `0555e5fc…`
  - `teaser_v9.mp4` `07f9c5b495519c97cdec3987decc027f`
- **manifest.json** differs only in `made` (18:15:23Z to 18:27:43Z).
- **prep-report.txt** differs only in its timestamp line. My re-run overwrote `kit/prep-report.txt` and `kit/manifest.json` (git-ignored, content identical apart from the timestamps). The cycle-folder copy is untouched.

**E3 Mix checks.**
- **verify_default_mix.py:** (a) max 1 LSB, rms 0.0031, 0 samples > 2 LSB; (b) max 0 LSB; (c) 0 non-zero samples; `MIX OK`, rc 0.
- **My own mix** (numpy, kit wavs read by my own RIFF reader, my own placement and fade code):
  - vs `ride_master_v2.wav` shifted 6.5 s: max 1 LSB, 0 > 2, rms 0.0031.
  - vs `soundtrack_v3.wav`: max 0.
  - Tail 32.8–47.6: 0 non-zero samples.
- **vs the shipped mp4s:**
  - `opening_v3_with_sound_v3.mp4` audio: lag 0, corr 0.999979.
  - `ride_v1_with_sound_v3.mp4` audio: lag 0, corr 0.998912. That is below the brief's 0.999 rule, but `ride_master_v2.wav` against the same mp4 also gives 0.9989121, identical to 6 decimals (AAC, gain fit 0.997). So the reference file is the limit, not the tool.

**E4 Stem alignment (sample level, from the mp3 sources, not the kit).** Fresh `ffmpeg -ac 2 -ar 44100 -f f32le` decodes all have 663,552 samples, and the kit wavs equal the fresh decode bit for bit (bed, a-strings, b-bass checked).

| sum vs original | lag | corr | residual rms at shift −2 / −1 / 0 / +1 / +2 samples | original rms |
|---|---|---|---|---|
| A (strings + other) | 0 | 0.99993 | 0.1009 / 0.0552 / **0.0040** / 0.0552 / 0.1009 | 0.2766 |
| B (piano + drums + bass + other) | 0 | 0.99976 | 0.1009 / 0.0554 / **0.0068** / 0.0554 / 0.101 | 0.2766 |

The residual is smallest at shift 0, so the stems are aligned to the sample.

**E5 E5 pulse times.**
- e5.wav onsets (first |x| > 0.01) at 0.0268 / 2.0368 / 3.8768 / 5.7368 / 7.6068 s. That is ride 17.80 / 19.81 / 21.65 / 23.51 / 25.38 plus a 26.8 ms instrument onset, i.e. teaser 24.30 / 26.31 / 28.15 / 30.01 / 31.88 plus 26.8 ms.
- The E5 part derived from the master (ride_master_v2 minus my own re-built bed layer) has its onsets at exactly tau + 0.0268 s for all five pulses, so the lane is where the master has it.

**E6 My Playwright probe** (real kit wavs and manifest, VP9 1428-frame stand-in, Chromium 1194). `ALL PASS: 35/35`, zero console or page errors.
- **Frame sync:** go-to frames 0, 1, 194, 195, 308, 309, 310, 729, 760–762, 983–985, 1319, 1320, 1426, 1427, and 12 successive ArrowRight steps from f720. After each: readout = `n/30 s fn`, `video.currentTime ∈ [n/30,(n+1)/30)`, and all 9 lane `src` readouts equal my own model (computed from the manifest, not the core). End gives f1427, a further ArrowRight stays at f1427, Home gives f0. 40 rapid ArrowRights from f100 land on f140 with the video inside f140.
- **Scrub at f729:** exactly three slices of 1/30 s: bed at source 14.000 and at 1.260, e5 at 0.000. None from the 6 muted stems. With bed muted at f728, no slice.
- **With `in > 0`** (strings A clip in 5, out 10, at 44): scrub at f1330 gives source 5.3333, the header shows 5.333, and play from 44 starts the node at 5.117.
- **Play from f729:** every clip under the playhead starts 0.117 s ahead in source time (lead plus first-frame latency, the same for all 15 nodes). Muted lanes' nodes sit behind a lane gain of 0, audible lanes behind 1.
- **Solo:** a solo overrides a mute. Two solos (a-strings, which is muted, and e5): both audible, the other 7 silent.
- **Other behaviour:**
  - Play into the end stops with the label back to Play at f1427; Space then restarts from 0.
  - Resizing during play switches between stacked and side with no errors.
  - Space during loading does nothing; Delete with nothing selected does nothing.
  - Space right after loading via the top "Open kit folder" button plays and does not reopen the picker.
  - JS heap is 50 MB after load and play (AudioBuffers are extra).
- **Layout:** no page scroll (side layout) at 1440x900, 1920x1080, 1100x800, 1366x768, 1280x720, 1536x864 and 2560x1440. 1099x800 is stacked with no horizontal scroll. No clipped text found (scrollWidth > clientWidth) in labels, buttons or readouts.
- **Edge cases in the editor** (status message; list line after):
  - `out 5`: ok, `source 0.000-5.000 s -> render 44.000-49.000 s`.
  - `out 0`, `len 0`, `in 12` (above out): refused with a red field and `out <= in`.
  - `out 20`: clamped with a message (`clamped to 15.047 s`).
  - `at 47.6`: refused (`at >= end of the video (47.6 s)`); `at 47.59` and `at f1427` accepted.
  - `fade out 40`: refused.
  - `gain -1` and comma values: refused as "not a number".
  - Go-to `abc` and `24,3`: refused with a message; go-to `999` clamps to f1427.
  - `+` at f1427: accepted (a 0.033 s part inside the video).
  - Overlapping clip on bed: accepted and hatched, and the list shows three `bed:` lines with their own render spans (unambiguous).
- **Nathan's exact example** (`+` on a-strings at 44, out 10, gain 0.45) gives, in the UI list: `a-strings: source 0.000-10.000 s -> render 44.000-54.000 s (gain 0.45, muted)`; once strings A is unmuted: `… (gain 0.45)`.

**E7 Suites re-run (cloud).**
- `node tests/synthetic-kit.mjs synkit && node tests/e2e.mjs synkit out`: `ALL PASS: 322/322 checks`, 19.6 s.
- `node tests/e2e-real.mjs realkit out` (9 real float wavs, manifest `video.file` patched to a 47.6 s / 1428-frame VP9): `ALL PASS: 69/69`. Load and decode takes 1002 / 656 / 671 / 741 ms.

**E8 Mutations.** 35 mutants in `<scratchpad>/mut/` (list and results in `mut.log`). Survivors are listed in defect 2; one mutant was a no-op and was dropped.

**E9 GOP.** `ffprobe -show_entries packet=pts_time,flags kit/teaser_v9.mp4 | grep K` gives 8 keyframes (listed in defect 3). The 1080p VP9 GOP-250 stand-in step timings are in defect 3.

**E10 Hygiene.**
- **av-align md5 unchanged:** `0e08fc6c4a3871ff70c55ff23b3b12f7` README.md, `a0faf5b80c72e418878dfb210a151eaf` av-align.html, `c0b5d4a579a67886ce7ead2eb076b57f` av-align.test.mjs. These equal EXECUTOR-REPORT's values and `git show HEAD:<path> | md5sum` for all three.
- **git status:** `GIT_OPTIONAL_LOCKS=0 git status --porcelain` (81 s) lists only `?? marketing/audio-studio/tools/teaser-lanes/` and `?? marketing/cycles/19_teaser-sound-lanes/`. There are no ` D ` lines. `.gitignore` = `kit/` and `tests/out/`. Nothing of this cycle is in `safe_to_delete/`. The other changes the executor saw at the start were committed by another session (aae50b4, 17:55Z, virgin-cycle13).
- **Line endings:** 0 CR and no BOM in all 9 tool files, the manifest, the 6 cycle .md files and the 4 .txt reports.
- **External references:** the page has no `http(s)://`, `<link`, `<script src`, `fetch(`, `@import` or `url(`. It is 69,794 bytes (< 160 KB).
- **Kit copied, not moved:** the source video is still at `silent-studio/all-renders/teaser_v9.mp4` with md5 = manifest md5 = kit md5. All 9 mp3/logo sources still exist, and their md5 equals the manifest's `source_md5`. The tracked mp3s are unchanged vs HEAD (git status clean). README is 42 lines (≤ 60).

**E11 Screenshots I looked at (Read tool).**
- **Executor's shots** (`shots/`): real-main-1440x900, main-1000x800, empty-1440x900. Mine (cloud scratchpad, not landed): insp-empty, insp-loading, insp-main at 1440x900 / 1920x1080 / 1100x800, insp-zoom05-1440x900, insp-edgecases-1440x900, insp-help, insp-copylist.
- **What they show:** video left and large, 9 lanes right at 91 / 96 / 80 px with real waveforms. There is one red playhead, and the bed overlap is hatched. The headers read `src 14.000 | 1.260` at f729 and E5 `src 0.000`. Muted stems are dimmed with orange M.
- **Other layouts:** the how-to is complete at 1440x900 and 1920x1080 and collapses to "press ? for the how-to" at 1100x800. The loading state shows clip outlines with `loading 1 / 10 · teaser_v9.webm` and a progress bar. At 0.5 s zoom each frame is about 47 px, labelled f722–f736.

## Brief §12 checklist
| # | item | result |
|---|---|---|
| 1 | anchors/md5/sample counts; node tests; no tautologies | PASS: 142/142, literals only (coverage gaps: defect 2) |
| 2 | prep_kit idempotent; independent master and sumA/sumB lags | PASS: md5 stable; master 1 LSB (my mix); lags 0/0, corr 0.99993/0.99976 |
| 3 | verify_default_mix and an independent mix vs ride master, ride mp4, opening wav, opening mp4 | PASS: 1 / 0 LSB. Ride mp4 corr 0.998912 < 0.999, identical to the master's own corr with that AAC (the reference is the limit, not the tool) |
| 4 | e2e rerun and break attempts | PASS: 322/322; every break attempt gave a visible message and no uncaught error |
| 5 | copy list, byte check, 17 lines | PASS: e2e-real's literal 17-line list matches, and my UI read of the default list matches it |
| 6 | two clocks (47.5 gives 3.5; bed clip 2 at 24.30 gives 1.260) | PASS: UI and core |
| 7a | layout at 5 sizes plus extra sizes | PASS: no overlap or scroll at wide sizes; ≥ 44 px per frame at 0.5 s |
| 7 | frame sync | PASS: E6 (18 frames plus 12 steps; video, readout and 9 lanes) |
| 8 | hygiene | PASS: E10 |
| 9 | taste decisions vs requirements | §13.5 layout contradicts REQUIREMENTS item 1 as written (defect 9). §13.7 "muted appended when not audible" makes solo leak into the output (defect 1). The rest is consistent |

## What I could not verify
- Real h264 playback, decode speed and seek speed of `teaser_v9.mp4` (the cloud Chromium has no h264; the VM has no browser).
- Anything audible: A/V feel in real time, whether the scrub sounds right, clicks when muting during play, Bluetooth.
- Folder drag-and-drop (Playwright cannot simulate it) and Chrome's folder-upload confirmation dialog.
- Whether the AudioContext starts `running` after a pure drop (no click) on Nathan's Chrome. The code resumes it on the next key or click, so the first step or Play should wake it.
- Windows font rendering (Cascadia/Consolas vs the Linux fallbacks in my screenshots).

## What only Nathan can verify in his own Chrome/Edge
- The page opens by double-click. **Open kit folder** takes `kit/`; Chrome asks "Upload 13 files to this site?", answer Upload, and nothing leaves the PC. Dropping the folder also works.
- `teaser_v9.mp4` plays, and ArrowRight stepping feels immediate inside the ride (6.5–32.8 s), not only right after a cut. If stepping lags by a noticeable fraction of a second around 12–14 s or 26–28 s, that is defect 3.
- Real-time video/audio sync feels right (within about a frame, wired). The one-frame scrub sound while stepping is useful, not annoying.
- The default state sounds like today's teaser. Muting `bed` and unmuting strings A and other A (or all four B lanes) sounds the same as the bed.
- Small text (lane labels, in/out tags, ruler, frame hints) is readable on his screens.

## Readout
| tier | model | tokens | outcome |
|---|---|---|---|
| Inspect | Opus 5.5 | not visible to the inspector | PASS with fixes: 0 blocker, 3 major, 8 minor, 9 cosmetic; all numeric claims reproduced |
