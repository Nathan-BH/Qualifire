# INSPECT-REPORT-v1 — cycle 22 (teaser-lanes multi-video kit)

Inspect tier (Opus, fresh context), 2026-09-26. Every result below is from a command I ran myself, either on the
device VM (`device_bash`: python3/numpy/ffmpeg/node) or in the cloud sandbox (Playwright 1.56 + Chromium 1194). Before
using the cloud copies I checked them against the device files by md5: `teaser-lanes.html` e95a2e34…,
`teaser-lanes.test.mjs` 284219fb…, `tests/e2e-real.mjs` 79b738a8…, `tests/e2e-served.mjs` ee500f16…, `kits.json`
ab3549ed…, plus the protected test files, the fixtures and both option files. All of them match.

## Verdict: PASS (after inspect fixes; F3 and F4 remain as documented low-priority test-coverage gaps)

First pass: PASS WITH FINDINGS. The coordinator then directed me to apply the F1, F2 and F5 fixes. They are applied
and re-verified (see "Follow-up" at the end). The shipped behaviour was correct from the start. The render, both kits,
the manifest numbers, the served mode, the re-stamp and §10 all check out.

## Findings (most severe first)

### F1 — MEDIUM — `tests/mutants-open.mjs` has been vacuous since cycle 22: every mutant is "killed (unit)" by a crash
- `mutants-open.mjs` copies only `teaser-lanes.html`, `teaser-lanes.test.mjs` and `tests/fixtures/` into each
  `oNN/` folder. The new section 20 of `teaser-lanes.test.mjs` runs `readFileSync(join(here, "kits.json"))`, and no
  `kits.json` is copied, so in every mutant folder the unit suite dies with
  `ENOENT … oNN/kits.json`, and that counts as "killed (unit)".
- Seen: `node tests/mutants-open.mjs . tests/out/mut tests/out/synkit` prints `ANCHOR MISSING: 0 SURVIVED: 0 total 20`.
  Every row reads `killed (unit)`, including O12–O18, which are only catchable by the e2e pass. Running
  `node teaser-lanes.test.mjs` inside `tests/out/mut/o12/` gives the ENOENT stack.
- The true result: a scratch copy of the script with one added line
  `cpSync(join(toolDir, "kits.json"), join(dir, "kits.json"))` gives **20/20 caught**. O1–O11, O19 and O20 are caught
  by the unit suite; O12–O18 are caught by e2e. So the code is fine, but the "20/20" figures in EXECUTOR-REPORT,
  RULING-v1 and the cycle README came out of the crash.
- **Coordinator decision**, because §10 protects `mutants-open.mjs`. The fix is either that one line, or a baseline
  step (the unmutated copy must pass the unit suite before the loop starts) so a missing input can't pass silently
  again.

### F2 — MEDIUM — `serve.ps1` never accepts plain `python`; it works only when the `py` launcher exists
- `$c[1..($c.Length-1)]` on the one-element candidate `@('python')` becomes `$c[1..0]`. PowerShell ranges count
  down, so this is `[1,0]`, and it returns `'python'`. The probe therefore runs `python python -c …`, which exits 2.
  The script then tries `py -3`. If there is no `py` launcher (for example an Anaconda-only install), it stops with
  "No Python 3 found". The launch line on the last row has the same bug.
- Reproduced with pwsh 7.4.6 (from the GitHub release) and shim executables. With only `python` on PATH:
  `extra args=[python]`, `exit=2`, picked nothing. The fixed form `@($c | Select-Object -Skip 1)` picks `python` when
  only `python` exists and `py -3` when only `py` exists. Windows PowerShell 5.1 uses the same range semantics.
- This came from the brief verbatim, and nobody can run it except Nathan. I did not patch it; it is a 2-line code
  change for the coordinator to dispatch.

### F3 — LOW — `tests/e2e-served.mjs` is a real test, but its "remembered pick" check can't tell remembered from default
- The good parts are real: a node:http server on an ephemeral port, true 404s, favicon 204, the allow-list scoped to
  the two exact URLs, the manifest-404 hard error, the track-404 soft "missing" lane with sample counts, and a
  separate file:// context. I ran it: `ALL PASS: 18/18`. I read the allowed-404 log and it contains only the
  b-drums.wav and kit-missing/manifest.json URLs.
- The gap: the remembered pick is `kit-syn`, which is also the default, so the reload check would pass even if
  remembering were broken. The video-404 row of Ruling 1 is not tested either. The brief asked for about 25–30 checks;
  the test has 18.
- I checked the behaviour myself by serving the **real** `kits.json` with stand-ins for both kits. First load gave
  `kit: teaser-full`, `ready · 9 lanes`, and a menu with both labels. Picking `kit` and reloading loads `kit`. There
  were 0 console errors. So the behaviour is correct; only the test is weak.

### F4 — LOW — no automated check of Save arrangement on kit-teaser-full
- In `e2e-real.mjs` the gating by `EXP.fixtures` is scoped correctly. Exactly 17 checks are skipped (2 × 4 open-file
  checks, 5 R4 checks, 4 save checks), all of which need the teaser_v9 fixtures, and 86 − 17 = 69. But the
  `save: video.duration_s EXP.durNum` check sits inside that block, so the value `durNum: 47.3` is never used.
- I checked it myself: Save on the new kit writes `kit: "teaser-full"` and a video block with `teaser-full_v1.mp4`,
  30 fps, 47.3 s, 1419 frames. It is correct, just not covered by a test.

### F5 — LOW — git bookkeeping (for the coordinator)
- Brief §0 rule 9 is factually wrong. `git ls-files marketing/silent-studio/all-renders` lists all 8 older mp4s,
  `teaser_v9.mp4` included, so they are tracked. `teaser-full_v1.mp4` (untracked) therefore breaks the repo's actual
  convention. Whether to add it is your call.
- These should be committed: `tools/teaser-lanes/{kits.json, serve.ps1, tests/e2e-served.mjs}`, the cycle-22 docs,
  and `teaser-full/rounds/v1/FEEDBACK.md`. The rounds mp4 is the same question as above.
- Working-tree changes that did NOT come from cycle 22:
  - the deleted `teaser-full/.hyperframes/preview/20183f7f….html` (preview churn from HyperFrames; its replacement
    `e7a1f409….html` is already committed in 89ab72b)
  - the untracked root-level `00-…07-*.ps1`, `POWERSHELL-SCRIPTS-README.md` and `SCRIPTS-QUICK-REFERENCE.txt`
  - their duplicates under `Claude outputs/`
  - `process/git-repair/`

  All of these are another session's work. I left them alone.
- `.gitignore` is correct. `git check-ignore -v` shows `kit-teaser-full/manifest.json` matched by `.gitignore:3` and
  `kit/manifest.json` matched by `.gitignore:1`.

### F6 — INFO — HOWTO[0] (Ruling 2 text)
The final string is: "Open a kit folder: kit-teaser-full (teaser-full v1, the default) or kit (teaser v9), both
made by prep_kit.py. With serve.ps1 the default loads by itself; the header menu switches kits."
- It keeps all three facts.
- There is one small ambiguity: "the header menu switches kits" reads as always true, but the menu exists only when
  the page is served.
- The fit was measured with DejaVu Sans (`fc-match system-ui`), which is wider than Segoe UI on Windows, so Nathan's
  machine should have more room than the test did. The loaded 1440x900 page shows the full how-to
  (scrollHeight 274 = clientHeight 274).

### Fixed directly (chore)
- The tool `README.md` "Default arrangement… (provisional)" paragraph and the "Only Nathan can verify" bullet, and
  step 3 of the cycle `COMMANDS.md`, all still said the option files show a "made for a different video" note. That
  was no longer true after the §12 #3 re-stamp, and it contradicted OPEN-ITEMS and the kit's own manifest note 7. I
  reworded all three to say no note should appear.
- A mistake of mine, now cleaned up: my first `git status` ran without `GIT_OPTIONAL_LOCKS=0` and left a 0-byte
  `.git/index.lock`, because the mount does not allow unlink. I moved it to `_to_delete/cycle22-inspect/` and ran
  every later git call with `GIT_OPTIONAL_LOCKS=0`. Lesson for the process: **a plain `git status` on this mount
  leaves a stale lock behind.**

## What I verified that passes (commands run, outputs seen)

| # | check | result |
|---|---|---|
| 1 | `md5sum` of `all-renders/teaser-full_v1.mp4`, `renders/…09-36-34.mp4` and `rounds/v1/teaser-full_v1.mp4` | all three are `3db40a137a9d879220879594af053d3f`; the day file `…09-39-29` is `c79fa639…` (not used) |
| 1b | luma of the frame at t=15 s | the v1 copy is 14.3/255 (night); `…09-39-29` is 234.8 (day) |
| 2 | `python3 prep_kit.py --help` / `bogus` | prints the usage line; exit 0 / exit 2 |
| 2b | `python3 prep_kit.py teaser_v9` (49.7 s) → leaf-by-leaf diff against `kit-manifest-before.json` | `PREP OK`; **only** `/made` and the new `/video_key: "teaser_v9"` differ (243 → 244 leaves, key order the same); the raw `diff` shows only those 2 lines; `kit-manifest-before.json` is byte-identical to the committed `tests/fixtures/manifest-real.json` (so it really is the pre-edit copy); all 9 kit WAVs and the proxy have the same md5 before and after |
| 2c | `python3 verify_default_mix.py` | `MIX OK` (a) max 1 LSB, (b) 0 LSB, (c) silent |
| 3 | `python3 prep_kit.py` (no argument → teaser-full_v1, 36.5 s) | `PREP OK`; `proxy kept (checks pass)`; `1419 frames, 142 keyframes (every 10) … max diff 0.000000 s, 16.2 MB`; `nb_frames=1419, duration=47.300000`; my own ffprobe of the proxy agrees (1419/1419, 47.300000) |
| 3b | the new manifest | kit `teaser-full`, `video_key teaser-full_v1`; video `teaser-full_v1-proxy.mp4` / `teaser-full_v1.mp4` / 30 / `47.3` / 1419 / 142; clips: logo 0→6.2 (fade 0.5); 7 × (10.0, 15.0465) and 7 × (22.74, 9.76, fade 1); e5 (24.0, 8.5); stems muted, bed/logo/e5 audible |
| 3c | scenes from `teaser-full/index.html` `data-start`/`data-duration` | 0+6.2, 6.2+14.0, 20.2+12.3, 32.5+10.8, 43.3+4.0 (= 47.3). The logo fills the opening; the bed starts T1 = 3.80 s into start-ride; bed 2 and e5 end at 32.5, exactly the gates-saving→ranking cut. Consistent. |
| 3d | provisional marking | manifest note 7 says "PROVISIONAL default … NOT the rides A/B pick … still open"; the tool README has a "(provisional)" section; OPEN-ITEMS keeps the A/B pick open |
| 4a | `node teaser-lanes.test.mjs` (cloud copy with the device `kits.json`) | `ALL PASS: 231/231`; section 20 has 13 asserts (1 ok + 7 throwsWith + 2 eq + 3 ok; the git diff also counts 13 added assert lines), and 218 + 13 = 231. The brief's "15 / 233" is a typo, as the executor said. |
| 4b | `synthetic-kit.mjs` + `e2e.mjs` | `ALL PASS: 390/390`, including `PASS 1440x900 how-to full text shown … [shown: true]` |
| 4c | `mutants-open.mjs` | 20/20 as shipped, **but vacuous (F1)**; 20/20 for real with the one-line scratch patch |
| 4d | `e2e-served.mjs` | `ALL PASS: 18/18` (see F3) |
| 4e | `e2e-real.mjs` with my own stand-ins (webm 1428/47.6 and 1419/47.3, checked with ffprobe) | old kit `ALL PASS: 86/86`; new kit `ALL PASS: 69/69` with the "fixture checks skipped" line |
| 4f | my own run: the two option files opened on the new-kit stand-in | `opened …: 12 clips (0 dropped)` with **no** note; on the old kit: `made for a different video (teaser-full_v1.mp4, 47.300 s)`, as expected; 0 console errors |
| 5 | §10 protected files | `tests/e2e.mjs`, `synthetic-kit.mjs`, `mutants-open.mjs` and `convert-arrangement.mjs` match `git show HEAD:` by md5; `git diff` is empty for those, `verify_default_mix.py` and `tests/fixtures/*`; `git status` shows nothing under `audio-studio/brandmark/` (soundv3 untouched); the only diff under `silent-studio/` is the §3 README paragraph (plus the HyperFrames preview churn that isn't from this cycle, F5); the `teaser-lanes.html` diff contains exactly the brief's §5.2/§5.3/§5.4 edits plus the Ruling 1 and Ruling 2 changes, with nothing else touching the file:// path |
| 7 | option A/B re-stamp | `git diff`: 5 lines each (`kit`, `video.file/name/duration_s/frames`); leaf compare against `HEAD`: 103 = 103 leaves, same key order, exactly those 5 differ; `clips`, `muted`, `note` and `created` are byte-identical |

Rebuild side effect: `kit/` and `kit-teaser-full/` now carry today's `made` stamps and fresh `prep-report.txt` files.
All WAVs and proxies are byte-identical to before.

## Follow-up — fixes applied (coordinator-directed, same day)
- **F1 fixed.** I added `cpSync(join(toolDir, "kits.json"), join(dir, "kits.json"))` to `tests/mutants-open.mjs` and
  added `kits.json` to its header comment (md5 `a86b571c…`). The real script, re-run with
  `node tests/mutants-open.mjs . tests/out/mut3 tests/out/synkit`, gives `ANCHOR MISSING: 0 SURVIVED: 0 total 20`:
  - O1–O11, O19 and O20 are "killed (unit)".
  - O12–O18 are "killed (e2e)", which means the unmutated unit suite now really passes inside the mutant folders.
  - To confirm the unit kills are genuine, I checked o1, o6, o19 and o20. Each has `kits.json` present, no ENOENT,
    and assertion failures (12, 1, 2 and 1 FAIL respectively). o11 fails its assertion and then throws the mutant's
    own error.
- **F2 fixed.** In `serve.ps1`, both slices are now `@($c | Select-Object -Skip 1)` and `@($py | Select-Object -Skip 1)`
  (md5 `1a073a93…`). I ran the real file in pwsh 7.4.6:
  - With only `python` on PATH (no `py`) and an `xdg-open` shim, it printed "Serving … 8799", opened the URL once,
    and `curl` got 200 for `teaser-lanes.html`, `kits.json` and `kit-teaser-full/manifest.json`.
  - With only a `py` shim on PATH, it also served (200).
- **F5 done.** I committed the cycle-22 files. `all-renders/teaser-full_v1.mp4` and `rounds/v1/teaser-full_v1.mp4`
  are now tracked, following the repo's real convention: `git ls-files` shows 8 tracked all-renders mp4s and 51
  tracked `rounds/*/*.mp4`. Left untouched as other sessions' work: the HyperFrames preview deletion, the root
  `00–07*.ps1` scripts, `POWERSHELL-SCRIPTS-README.md`, `SCRIPTS-QUICK-REFERENCE.txt`, `Claude outputs/` and
  `process/git-repair/`.
