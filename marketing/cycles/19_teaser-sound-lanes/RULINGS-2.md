# RULINGS-2 — cycle 19, teaser sound lanes (Plan tier, Fable, 2026-09-24)

Scope: the 20 defects of INSPECT-REPORT.md (PASS with fixes). Read: INSPECT-REPORT, REQUIREMENTS-from-nathan, RULINGS-1, BRIEF §§4, 6.2–6.7, 7, 8, 9, 10, 12, 13; spot-checked in `teaser-lanes.html`: `parseTimeEntry` (254), `audible` (311), `validateClip` (316), `formatClipList` (371), `pausePlay` (597), `startClip` (606), `scrubPlay` (683), `stepTo` (707), waveform bins (768), in/out tags (791), ruler (828), `applyField`/`addClip` (949–985); `tests/e2e.mjs` 28–36, `tests/e2e-real.mjs` 118–122; `prep_kit.py` 158–161, 328–329. Measured in the VM: a GOP-10 h264 proxy of `kit/teaser_v9.mp4` (command in ruling 3) encodes in 26 s, is 15.5 MB, has 1428 frames, 143 keyframes and per-frame timestamps identical to the source. The inspector's mutation harness survives in the session scratchpad (`scratchpad/mut/run.py`, `muts.json`, 36 mutants) and is landed as `tests/mutants/` (step 11).

Nothing here contradicts RULINGS-1. Ruling 1.5 there ("the copy list needs NO change" for overlaps) stands; the list format changes below are for mute/solo and the video end only.

## Rulings

### 1. Major — copy list says `muted` for lanes silenced by a solo; `muted` undefined — FIX (format rule)

How Nathan uses it: he mutes to avoid cacophony (bed on, splits off; or a split on, bed off) and what he hears with the mutes IS what he wants built — the default list must not make Claude build bed + strings A + other A + the four B stems on top of each other. So `muted` is placement intent and stays in the list. Solo is listening only (audition one lane) and must never reach the list.

Rule, exact:
- The `muted` part is appended when `lane.muted` is true (the M button). `audible()` is NOT used by `formatClipList` any more; solo has no effect on the list.
- The header defines the word. Header line (one line, exact):
  `teaser-lanes · <video.name or video.file> · <fps> fps · <fmtSeconds(duration_s)> s · times in seconds; source = that sound's own clock, render = the video's; muted = leave that clip out`
- Per-clip parts, in this order, comma-joined inside the parentheses: `gain <fmtNum>` (always), `fade in <n> s` (> 0), `fade out <n> s` (> 0), `muted` (lane.muted), `file missing` (lane status missing/failed), `cut by the video end at <fmtSeconds(duration_s)> s` (when `clipEnd(c) > duration_s + 1e-9`; ruling 5).
- The Copy panel shows one fixed line of text above the textarea: `muted = leave that clip out (M). Solo (S) is only for listening and is not in the list.`
- How-to line 3 becomes: `Each lane on the right is one sound. M mutes it (its clips are listed as muted = leave them out), S solos it for listening only. Two clocks: the render clock (under the video) and each lane's own source clock (src, in its header).`
- README Use step 6: `**Copy list** gives one line per clip; paste it into chat. A muted lane's clips say muted (= leave them out); solo is only for listening and is not in the list. Nothing is written to disk. ...`

Default-state list: still 17 lines; the 12 stem lines keep `muted` (they ARE muted with M); the header gains the definition. Nathan's example after ruling 4: `a-strings: source 0.000-10.000 s -> render 44.000-54.000 s (gain 0.45, cut by the video end at 47.600 s)`.

### 2. Major — suites do not cover the engine, the seek, or `in > 0` — FIX (tests in step 9, mutation battery in step 11)

Required new unit cases (`teaser-lanes.test.mjs`), literals only. Fixture `cx = {in: 5, out: 10, at: 44, gain: 0.45, fade_in: 0, fade_out: 0}`, `t = {file_offset_s: 0}`:
- `clipEnd(cx) === 49`; `clipLen(cx) === 5` (kills M6).
- `sourceTimeAt(cx, 47.5) === 8.5`; `sourceTimeAt(cx, 49) === null`.
- `startParams(cx, t, 44)` → `delay 0, fileOffset 5, dur 5, g0 0.45, tFadeOutStart 5, tEnd 5` (kills M7); `startParams(cx, t, 46)` → `delay 0, fileOffset 7, dur 3`; `startParams(cx, t, 43)` → `delay 1, fileOffset 5, dur 5`; `startParams(cx, {file_offset_s: 0.5}, 46)` → `fileOffset 7.5`.
- `frameSlice(cx, t, 1320, 30)` → `fileStart 5, len 1/30`; `n = 1330` → `fileStart 5.3333 (±1e-4)`; `n = 1469` → `fileStart 9.9667 (±1e-4), len 0.0333`; `n = 1470` → `null`.
- `gainAt({in: 5, out: 10, at: 44, gain: 0.45, fade_in: 0, fade_out: 1}, 48.5) === 0.225 (±1e-9)`.
- `audible`: two solos `[{a muted:true solo:true}, {b solo:true}, {c}]` → a true, b true, c false.
- `formatClipList` on a fixture with lane `x` soloed, lane `y` muted, lane `z` plain, one clip each (`z`'s clip ends past the video): the literal expected string has `muted` only on `y`'s line and the cut note only on `z`'s line; header with the new tail.
- `parseTimeEntry("24,3") === 24.3`, `("0,45") === 0.45`, `("-1") === -1`; `validateClip({in: -1, out: 5, at: 0}, t, video).errors` contains `"in < 0"`; gain `-1` → `"gain must be between 0 and 4"` (ruling 6).

Required browser checks (`tests/e2e.mjs`, synthetic kit; the probe also loaded by `tests/e2e-real.mjs`). New file `tests/audio-probe.js`, injected with `page.addInitScript` before navigation, wraps: `AudioBufferSourceNode.prototype.start` (records `{offset, dur, when, ctxTime, videoTime: video.currentTime, seeking: video.seeking, chain: gains}` where `chain` is the list of `GainNode.gain.value` walked from `this` to the destination via a wrapped `AudioNode.prototype.connect` that stores `__out` on the source), `AudioParam.prototype.setValueAtTime` and `linearRampToValueAtTime` (records `{value, time}` per param, keyed by the owning node via a wrapped `AudioContext.prototype.createGain`). Records live in `window.__audio`; a helper clears them. Synthetic clips: logo 0–1 at 0; bed 0–12 at 1.0 and 0–5 at 20 (fade out 1); a-strings same two, muted; e5 0–3 at 2.0. A scrub start is one with `dur === 1/30 ± 1e-6`; a play start is any other.
- **Seek exactness (kills A6):** after each of go-to f0, f1, f3 (ArrowRight ×3), f60, f1319, f1320, f1799: `video.currentTime ∈ [n/30, (n+1)/30)` and readout `fn`.
- **Scrub (kills A1, A4, A5; checks ruling 3b):** clear; go to f60 (2.000 s) with default mutes: exactly 2 scrub starts — bed `offset 1.0 ± 1e-6`, e5 `offset 0 ± 1e-6`, both `dur 1/30`, none for a-strings or logo; each has `seeking === false` and `|videoTime − 2.0| < 1/30`. Then click M on bed, ArrowRight (f61): exactly 1 scrub start (e5, offset 0.0333); unmute.
- **Play offsets, lane gain, all clips started (kills A2, A3, A11):** clear; go to f60; Space; wait 300 ms; Space. Play starts: exactly 5 (bed 1, bed 2, a-strings 1, a-strings 2, e5; logo not started because it ended at 1.0). bed 1 `offset ∈ [1.0, 1.25]` (1.0 + lead + latency); bed 2 `offset 0` and `when − ctxTime ∈ [17.9, 18.3]`; e5 `offset ∈ [0, 0.25]`; the a-strings starts have a lane gain of 0 in their chain, the bed and e5 starts have 1.
- **Mute during play (kills A2):** go to f60; Space; click M on bed → the bed lane GainNode value is 0 within 50 ms (read via the chain of its last start); click M again → 1; Space.
- **Fade-out ramp (kills A10):** clear; go to f690 (23.0 s); Space; wait 200 ms; Space. The bed-2 play start (`offset ∈ [3.0, 3.25]`) has on its clip gain param a `setValueAtTime(0.45, t1)` with `t1 − when ∈ [0.8, 1.0]` and a `linearRampToValueAtTime(0, t2)` with `t2 − when ∈ [1.8, 2.0]` (the lead + latency, 0.05–0.15 s, shortens both).
- **Resync (kills A12):** go to f60; Space; wait 300 ms; `video.playbackRate = 1.5`; wait 400 ms; `playbackRate = 1`; wait 200 ms; Space. `#status[data-resyncs] ≥ 1` and at least one new bed play start after the rate change.
- **Waveform honours `in` (kills A8):** on bed, `+` at f900 (30.0 s), set `in 4.5`, `out 5.5` (the synthetic click at file 5.0 s now sits at render 30.5); zoom 3 (2 s); read the bed canvas over the 3 columns around `xOfTime(30.5)` and around `xOfTime(30.2)` (`getImageData`, count pixels that differ from the lane background, playhead moved away first): the 30.5 columns have ≥ 3× the non-background pixels of the 30.2 columns, and the 30.2 columns have ≤ 15 % of the lane height each. Delete the clip afterwards.
- **`len` keeps `in` (kills A9):** on the a-strings clip of step 5 set `in 5` → Enter, then `len 3` → Enter: editor `src out` shows `8.000`, `render end` `47.000`.
- **Ruling 4:** after `+` on a-strings at f1320: lane has no class `muted`, editor gain `0.45`, status contains `lane unmuted`. The literal list line becomes `a-strings: source 0.000-10.000 s -> render 44.000-54.000 s (gain 0.45)` (synthetic video is 60 s: no cut note). Add: bed `+` at f1770 (59.0 s) → list line `bed: source 0.000-12.000 s -> render 59.000-71.000 s (gain 0.45, cut by the video end at 60.000 s)`; delete it.
- **Ruling 7 (seek during play):** go to f60; Space; wait 300 ms; click the ruler at `xOfTime(21.0)`; Play button still reads `Pause`; after 500 ms `video.currentTime ∈ (21.0, 22.5)`; a new bed-2 play start with `offset ∈ [1.0, 1.35]`; Space.
- **Ruling 8 (undo):** select a clip, Delete → `data-clips` down by 1, status has an `Undo` button; click it → count back, same clip id selected. Reset → status `Undo` → previous clip count and mutes back.
- **Rulings 16, 18:** `#status` joins the no-overlap element set at all five sizes; empty state: zoom buttons and `#scrub` disabled and `#lanes-empty` visible; after load: enabled, hidden.
- **Ruling 10:** e2e-real play check: `video advanced ≥ 0.5 s` (was 1.2) and `video.paused === false` sampled at 700 ms.

Expected counts after the additions: unit `142 + N` (state N), e2e `322 + N`, e2e-real `69 + N`; every expectation is a literal.

### 3. Major — frame stepping on the long-GOP h264 — FIX (kit proxy + scrub timing rule)

3a. **Proxy.** `prep_kit.py` step 3 no longer copies the video; it writes `kit/teaser_v9-proxy.mp4`:
`ffmpeg -v error -y -i <SRC> -an -c:v libx264 -preset veryfast -crf 20 -g 10 -keyint_min 10 -sc_threshold 0 -bf 0 -pix_fmt yuv420p -movflags +faststart -video_track_timescale 30000 <DST.tmp>` then rename to DST. Keep 1920x1080: the video is for looking at what lines up with what, and Nathan's video panel is 605–760 px wide, so 1080p costs nothing visible and a 720p proxy would only save decode time we no longer need (GOP 10 = at most 9 frames to decode per step; measured 30 ms per step right after a keyframe in the inspector's stand-in). Cost: 15.5 MB instead of 12.5 MB (kit ≈ 58 MB), 26 s encode in the VM. `-bf 0` keeps decode order = display order (cheap seeks), `-sc_threshold 0` keeps the keyframe grid regular, the timescale keeps the timestamps exactly n/30.
   - Checks in prep_kit (STOP on failure, numbers in the report): source md5 == `07f9c5b495519c97cdec3987decc027f`; ffprobe of the proxy: `codec_name h264, width 1920, height 1080, r_frame_rate 30/1, nb_frames 1428, duration 47.600 ± 0.001`; per-frame timestamps of source and proxy (`ffprobe -v error -select_streams v:0 -show_entries frame=pts_time,pkt_pts_time -of json`, take `pts_time` or `pkt_pts_time` per frame — ffmpeg 4.4 in the VM has only the latter, ffmpeg ≥ 5 on Windows only the former): 1428 each, `max |diff| ≤ 1e-5` s, first `0.000000`, last `47.566667`; keyframes (`-show_entries packet=flags`, count containing `K`) == 143; size < 40 MB. Report line: `proxy: 1428 frames, 143 keyframes (every 10), timestamps identical to the source (max diff 0.000000 s), 15.5 MB, encoded in 26 s` (numbers from the run).
   - Idempotence: if `kit/teaser_v9-proxy.mp4` exists, passes every check above, and the existing `kit/manifest.json` has `video.source_md5 == 07f9…`, keep it and print `proxy kept (checks pass)`; otherwise encode. A second run therefore leaves the proxy's md5 unchanged by construction (INSPECT §12.2 "identical md5 for the video" now means the proxy).
   - Manifest `video` block (order): `"file": "teaser_v9-proxy.mp4", "name": "teaser_v9.mp4", "fps": 30, "duration_s": 47.6, "frames": 1428, "source": "marketing/silent-studio/all-renders/teaser_v9.mp4", "source_md5": "07f9c5b495519c97cdec3987decc027f", "proxy": "re-encoded by prep_kit.py for frame stepping: libx264 crf 20, keyframe every 10 frames, same 1920x1080 30 fps and the same 1428 frame timestamps; for looking only, never mix from it", "keyframes": 143`. The old `md5` key is dropped (the proxy's md5 depends on the ffmpeg build). `notes` gets one more line: `"The kit video is a short-GOP proxy of teaser_v9.mp4 (Ruling 2, 2026-09-24); the original stays in silent-studio/all-renders."`
   - Page: `formatClipList` header uses `v.name || v.file` (the list keeps saying `teaser_v9.mp4`); the empty-state/loading text unchanged (`parseManifest` passes unknown keys through — RULINGS-1 step 6 covers it; add `name` and `proxy` to that case's fixture and assert `name` survives). The missing-video error text becomes `"Kit is missing " + v.file + " — run prep_kit.py again."`.
   - The stale verbatim copy `kit/teaser_v9.mp4` is MOVED (never deleted) to `<repo>/safe_to_delete/cycle19-kit-teaser_v9-verbatim.mp4` (root `safe_to_delete/` is git-ignored). Kit stays 13 entries.
   - `tests/e2e-real.mjs` keeps patching `video.file` to the webm; its literal header uses `teaser_v9.mp4` (from `name`).

3b. **Scrub timing rule (code).** In `stepTo`: the step sound plays only on a frame-presented signal — the `seeked` event or the token-checked `requestVideoFrameCallback` for this seek, whichever comes first; the timeout fallback (keep 400 ms) only refreshes the readout and never plays the sound. Implementation: `after(playSound)`; `seeked` → `after(true)`; the rVFC callback → `refresh(false); after(true)`; `setTimeout(() => after(false), 400)`. The probe check in ruling 2 (`seeking === false`, `|videoTime − n/30| < 1/30` at every scrub start) is the test.

### 4. Minor — `+` gives a silent, gain-1 clip — FIX
`+` on a lane: `{in 0, out source_len_s, at playhead, gain g, fades 0}` with `g` = the gain of the lane's clip with the largest `at` (before the add), else 1; and it sets `lane.muted = false` (solo untouched). Status: `added <laneId> clip at <fmtSeconds(at)> s (gain <fmtNum(g)>)` plus `; lane unmuted` when it was muted. Duplicate is unchanged (inherits from the clip). Brief §6.4 and README step 5 example updated (`(gain 0.45, cut by the video end at 47.600 s)`).

### 5. Minor — clips past the video end pass silently — FIX
List part `cut by the video end at 47.600 s` (ruling 1). Editor: after applying, when `clipEnd > duration_s + 1e-9`, the status says `ends past the video (47.600 s); it will be cut there` unless there is an error or a clamp warning (the warning wins; join with `; ` if both).

### 6. Minor — comma decimals and negatives — FIX
`parseTimeEntry`: for strings, `s = s.replace(",", ".")` first; the seconds regex allows a leading `-` (`^\s*(-?(?:\d+(?:\.\d*)?|\.\d+))\s*$`). `applyField` gain parser: `raw.replace(",", ".")` and allow `-?`. Then `validateClip` reports `in < 0` / `gain must be between 0 and 4`; go-to with a negative clamps to f0 (existing clamp). Unit cases in ruling 2.

### 7. Minor — seeking during play pauses — FIX
`stepTo` while playing: do not pause. Set `S.frame = n`, `S.token++`, `stopAll()`, `S.first = true`, assign `video.currentTime = seekTimeOfFrame(n)` and let the video keep playing; the next rVFC tick calls `startAll(m)` from the new position (the existing first-frame path). No scrub sound while playing. `resyncs` resets to 0 by that path (accepted). Test in ruling 2.

### 8. Minor — no undo — FIX (one level, Delete and Reset only)
`S.undo = {label, restore}`; Delete stores the clip and its index, status `deleted <laneId> <fmtSeconds(at)>-<fmtSeconds(end)> s · [Undo]`; Reset stores `serializeState(state)` before resetting, status `reset to today's teaser sound · [Undo]`. Undo re-inserts (same id, same index, selected) or `restoreState`, then `changed(true)` and clears `S.undo`. Any other change clears it (the button disappears). General undo: ACCEPT, listed in README "Known small things".

### 9. Minor — REQUIREMENTS traceability — FIXED by Plan now
Appended to `REQUIREMENTS-from-nathan.md` a dated addendum with Nathan's verbatim later note (video left/right, "long shaped … more square") and the resulting rule (video LEFT, lanes RIGHT; stacked below 1100 px). Nothing for the executor.

### 10. Minor — timing-dependent play checks — FIX
`tests/e2e-real.mjs` 118–121: threshold `≥ 0.5 s` and `video.paused === false` at 700 ms (ruling 2); `tests/e2e.mjs` step 9 already uses 0.5. Report resyncs, do not assert.

### 11. Minor — README test table — FIX
Row text: `` `node tests/e2e-real.mjs <dir with the 9 wavs + manifest.json whose video.file is patched to a 47.6 s / 1428-frame video.webm> [outDir]` ``.

### 12. Cosmetic — small text — FIX (floor 11 px)
Canvas: in/out tags 9 → 11 px (`out` x = `x1 − measureText("out").width − 3`), ruler 10 → 11 px, lane label 10.5 → 12 px, "missing:" 10 → 11 px; CSS: nothing under 11 px. Unit hygiene case: `!/\b(?:[5-9]|10|10\.5)px "/.test(html) && !/font(?:-size)?:\s*(?:[5-9]|10|10\.5)px/.test(html)`. The layout assertions decide the lane header; if the two-row header no longer fits at 1440x810, the lane label goes back to 11 px (state it).

### 13. Cosmetic — frame hints — FIX
`frText`: for `in`, `out`, `at`, `end`: `"f" + Math.floor(v * fps + 1e-6)` (the frame containing that time); for `len`: `Math.round(v * fps) + " frames"`.

### 14. Cosmetic — overlapping waveforms indistinguishable; per-lane normalisation hides gain — ACCEPT
The hatch marks the overlap and the list has one line per clip (RULINGS-1 §2.5). README "Known small things".

### 15. Cosmetic — editor jargon — FIX
Labels: `in` → `src in`, `out` → `src out`, `len` → `length`, `at` → `render start`, `end` → `render end`; `gain`, `fade in`, `fade out` unchanged. Field ids unchanged. If `render start`/`render end` overflow their cells at 1100 px (no-overlap assertion), use `start`/`end` with `title="render start"` and say so.

### 16. Cosmetic — stacked layout: sticky status covers the editor hints — FIX
Remove `body[data-layout="stacked"] #status { position: sticky; bottom: 0; }` (status sits at the page end; the page scrolls there anyway). `#status` joins the no-overlap set (ruling 2).

### 17. Cosmetic — clipped last ruler label at 0.5 s — FIX
Skip a ruler label when `x + 3 + measureText(label).width > w − 1`. Executor looks at `zoom05-1440x900.png`: no clipped label at the right edge.

### 18. Cosmetic — empty state — FIX
Zoom buttons and `#scrub` disabled until loaded (same as the transport); the right column shows `<p id="lanes-empty" class="muted">The lanes appear here once the kit is open.</p>`, hidden once lanes exist.

### 19. Cosmetic — 140 px unused at 1920x1080 — ACCEPT
`laneHeight` cap 96 is a tested rule; a 9-lane column at 96 px is already generous. README "Known small things".

### 20. Cosmetic — bed clip 1 one sample short — ACCEPT
23 µs, documented in README "Known small things".

## Fix instructions for the executor (ordered; self-contained; stop only on a failing expected output)

Rules unchanged: BRIEF §1 (no deletes; only the two folders plus the `safe_to_delete/` move in step 2; LF/no BOM; land via `device_commit_files`; md5 on the PC == md5 in the cloud, listed). Author in the cloud, land, run in the VM: `cd "$HOME/mnt/Qualifire/marketing/audio-studio/tools/teaser-lanes"`. Every mutant in step 11 must find its anchor after your edits: when you change a line that a mutant targets, update the mutant's `find`/`replace` strings in `tests/mutants/muts.json` in the same step and say which.

1. **prep_kit.py — proxy (ruling 3a).** Replace step 3 (`shutil.copyfile` + md5 of the copy, lines ≈ 150–165) by: md5 of the source == `VIDEO_MD5` else STOP; `proxy_ok(path)` implementing the checks of ruling 3a (ffprobe stream fields, per-frame timestamps vs the source from `-of json` with `pts_time`/`pkt_pts_time`, keyframe count 143, size < 40 MB); keep-or-encode logic; the ffmpeg command verbatim; report lines. Manifest `video` block and the new `notes` line exactly as ruling 3a. Header comment of the script: one line on the proxy. Run `timeout 170 python3 prep_kit.py`. Expected: `PREP OK`; `proxy encoded in ~26 s` (VM); `proxy: 1428 frames, 143 keyframes (every 10), timestamps identical to the source (max diff 0.000000 s), 15.x MB`; wav md5s unchanged (a6927b52…, 321936c0…, c3df5190…, c9b9ec71…, 8bd24abb…, f32e9ee9…, 24f986c4…, 89052834…, 0555e5fc…); step 6/7 numbers unchanged. Run a second time: `proxy kept (checks pass)`, all 10 kit md5s identical, manifest differs only in `made`, run time about 30 s. Copy `kit/prep-report.txt` to the cycle folder (overwrite).
2. **Kit tidy.** `mv kit/teaser_v9.mp4 "$HOME/mnt/Qualifire/safe_to_delete/cycle19-kit-teaser_v9-verbatim.mp4"` (a move, not a delete; `safe_to_delete/` is git-ignored). `ls -la kit` → 13 entries: 9 wavs, `teaser_v9-proxy.mp4`, `manifest.json`, `prep-report.txt`, `verify-default-mix.txt`. `python3 verify_default_mix.py` → `MIX OK` unchanged (it reads no video); if it reads `video.md5` anywhere, switch to `source_md5`.
3. **teaser-lanes.html — copy list and panel (rulings 1, 5).** `formatClipList`: header tail `; muted = leave that clip out`, `v.name || v.file`, `muted` from `lane.muted`, parts order gain / fade in / fade out / muted / file missing / `cut by the video end at <fmtSeconds(v.duration_s)> s`. Copy panel fixed line (ruling 1). How-to line 3 (ruling 1; the array at ≈ 512). Editor "ends past the video" status (ruling 5). Missing-video text uses `v.file`.
4. **teaser-lanes.html — `+`, numbers, editor (rulings 4, 6, 13, 15).** `addClip` gain inheritance + unmute + status; `parseTimeEntry` comma and `-?`; gain parser comma and `-?`; `frText` per ruling 13; editor labels per ruling 15.
5. **teaser-lanes.html — engine (rulings 3b, 7, 8).** `stepTo`: `after(playSound)` split as ruling 3b; while playing, the no-pause path of ruling 7 (no `pausePlay`, no scrub). Undo per ruling 8 (status button next to Reset; hidden when `S.undo` is null; cleared in `changed()`).
6. **teaser-lanes.html — cosmetics (rulings 12, 16, 17, 18).** Fonts to the 11 px floor; drop the stacked sticky rule; ruler label skip; empty-state disables and `#lanes-empty`.
7. **Unit tests.** Add every case of ruling 2 (unit), ruling 6, the hygiene font regex (ruling 12), and `name`/`proxy` in the `parseManifest` pass-through case. Update the `formatClipList` fixture literal for the new header tail. `node teaser-lanes.test.mjs` (cloud and VM) → `ALL PASS: <142 + N>/<142 + N>`; state N.
8. **tests/audio-probe.js + e2e.mjs.** Write the probe (ruling 2); add every browser check of ruling 2 to `tests/e2e.mjs`; update the literal list (`a-strings … (gain 0.45)`, header tail); add `#status` to the no-overlap set; the empty-state checks. `node tests/synthetic-kit.mjs <dir> && node tests/e2e.mjs <dir> <out>` → `ALL PASS: <322 + N>`, zero console/page errors. Look at `main-1440x900.png`, `main-1000x800.png`, `zoom05-1440x900.png`, `empty-1440x900.png` and state: labels `src in / src out / length / render start / render end` readable, no sticky bar over the editor at 1000x800, no clipped ruler label, the empty right column shows its line.
9. **tests/e2e-real.mjs.** Load the probe; header literal `teaser_v9.mp4`; play threshold 0.5 s + `paused === false`; add the scrub and play-offset checks on the real kit at f729 (expected exactly 3 scrub starts: bed offset 14.000, bed offset 1.260, e5 offset 0.000, each `dur 1/30`, none from the 6 muted stems; play from f729: 15 play starts (logo not started), bed-1 offset ∈ [14.0, 14.25], bed-2 ∈ [1.26, 1.51], e5 ∈ [0, 0.25], muted stems' chains at lane gain 0). Re-stage the 9 wavs + manifest (one call, ≈ 42.5 MB) with the manifest's `video.file` patched to the webm; run → `ALL PASS: <69 + N>`.
10. **Land.** `device_commit_files` every changed file (`teaser-lanes.html`, `teaser-lanes.test.mjs`, `prep_kit.py`, `verify_default_mix.py` if touched, `README.md`, `tests/e2e.mjs`, `tests/e2e-real.mjs`, `tests/audio-probe.js`, `tests/mutants/*`); md5 PC == cloud for each (table in the report). In the VM: `node teaser-lanes.test.mjs` → ALL PASS; LF/BOM check on every changed file; av-align md5s still `0e08fc6c…`, `a0faf5b8…`, `c0b5d4a5…`; `GIT_OPTIONAL_LOCKS=0 git status --porcelain` → only the two folders (the `safe_to_delete/` move is ignored).
11. **Mutation battery.** Land the inspector's harness as `tests/mutants/run.py` and `tests/mutants/muts.json` (copies are in the session scratchpad `mut/`; if unreachable, they are reproduced in this cycle folder as `mutants-run.py` / `mutants-muts.json`). Rewrite `run.py` to take `<toolDir> <synKit> <realKit> <outDir>` on the command line, work on copies under `<outDir>/mNN/`, and print `ANCHOR MISSING` and exit 1 for any mutant whose `find` string is absent (a no-op must never count as a survivor or a kill). Run the full battery (36 mutants; parallel 2, not 4 — ruling 10). Expected: the 13 former survivors `M6, M7, A1, A2, A3, A4, A5, A6, A8, A9, A10, A11, A12` are each killed by at least one suite, the 22 others stay killed, `ANCHOR MISSING` 0. Paste the result table into the report. Then add ≥ 10 fresh mutants of your own on the new code (at least: `+` does not unmute; `+` gain always 1; list flag from `audible`; cut note off by one (`>=`); comma not replaced; undo re-inserts at the end; scrub sound on the timeout path; `stepTo` while playing pauses; proxy check accepts 1427 frames — a prep_kit mutant run as a Python check on a copy) and report survivors with a test or an ACCEPT reason each.
12. **README.md.** Use step 3 (M/S wording), step 5 example `(gain 0.45, cut by the video end at 47.600 s)` and a note that `+` unmutes the lane and takes the lane's last gain, step 6 (ruling 1), Prepare-the-kit paragraph (`re-encodes the video into a short-keyframe proxy for instant stepping (about 15 MB, the original is untouched)`; kit ≈ 58 MB), test table counts and the e2e-real row (ruling 11), new section `## Known small things` with rulings 8 (one-level undo only), 14, 19, 20 in one line each. Nathan-only list: replace "The h264 teaser_v9.mp4 decodes and plays there" by "The proxy `teaser_v9-proxy.mp4` plays and ArrowRight stepping feels immediate everywhere (the cloud test used a VP9 webm stand-in)".
13. **EXECUTOR-REPORT.md.** Append `## Ruling 2 follow-up (2026-09-24)`: commands and numbers of steps 1, 2, 7, 8, 9, 10, 11; screenshots looked at; the mutation table; the updated readout row. Do not rewrite earlier sections.

## Decisions taken for Nathan (plain words)
- **Muted means "leave it out".** The list you paste into chat marks a clip `muted` only when you muted its lane with M, and the first line now says what that means. Solo (S) is for listening to one lane and never changes the list. What you hear with your mutes is what gets built.
- **+ gives you a clip you can hear.** Pressing + on a lane unmutes that lane and gives the new clip the same volume as the lane's last clip (0.45 for the music stems, as in the ride), instead of a silent clip at full volume.
- **Clips that run past the end of the video say so** in the list (`cut by the video end at 47.600 s`) and in the status line.
- **The kit video is a re-encoded proxy** with a keyframe every 10 frames, so stepping frame by frame is instant everywhere; same size, same 1428 frames, same timestamps; the original `teaser_v9.mp4` in silent-studio is untouched and the list still names it. The step sound now waits for the frame to be on screen.
- **Clicking somewhere while playing keeps playing** from there (it used to pause).
- **Undo for Delete and Reset** (one step back), shown as a button in the status line.
- **You can type `0,45` or `24,3`**; a negative number now says what is wrong instead of "not a number".
- **Bigger small text** (nothing under 11 px), plain editor labels (`src in`, `src out`, `length`, `render start`, `render end`), whole-frame hints (`f253`, `300 frames`), and the status bar no longer covers the editor on narrow screens.
- Left as is, noted in the README: overlapping clips draw over each other (the hatch and the list tell them apart); some spare space under the lanes on a 1920x1080 screen; no general undo.

## Brief edits made (tagged «Ruling 2, 2026-09-24» in BRIEF-teaser-sound-lanes.md)
§4 step 3 (proxy), §4.8 `video` block and `notes`, §6.3 scrub timing and seek-while-playing, §6.4 `+` defaults, labels and undo, §6.7 line 3, §7 header/parts/example, §9.E.5 kit entries, §10 rows "Gain printed always?" and "Clip beyond video end", §13.7 and §13.10.
