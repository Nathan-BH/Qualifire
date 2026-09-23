# BRIEF — `av-align.html`: Nathan's offline audio-to-video alignment tool (cycle 16, item C)

**Status: ready to execute (2026-09-23, Plan tier, Fable).** Sonnet-executable: three new
files under `marketing/audio-studio/tools/av-align/` (one self-contained HTML page, one
node test file, one README), one line appended to `marketing/audio-studio/structure.md`.
No Python, no WAV, no mp4, no render, nothing else in the repo touched. Can run in the
cloud sandbox *or* on Nathan's PC through `device_bash` (`$HOME/mnt/Qualifire`, node
v22.23.2 there); the tests need only `node`. **Stop-on-ambiguity applies**: any anchor
mismatch, any test that will not pass without a design decision, any place this brief is
silent on something the page needs → stop and report verbatim; never guess, never "improve".

## 0. What this is, in one paragraph

Nathan's media player cannot step frames ("does not allow for frame by frame analysis or
anything more detailed than a full second"), so he cannot judge where a music track should
start against the ride video to better than a second. He asked (Q1, 2026-09-23) for "our own
tool to properly be able to align the audio and the video (a file you can make, and then I
can save a copy of so you can see and compare the diffs before implementing it)". This brief
builds that: **one HTML file he double-clicks on Windows**, no server, no install, no
network. He picks a video (mp4) and an audio file (wav or mp3) from his disk, steps the video
frame by frame at 30 fps with the exact time and frame number shown, sees the audio's
waveform on the video's timeline with its detected attacks marked, nudges the audio offset
by ±1 frame / ±10 ms / ±100 ms, hears the audio at the chosen offset (in real time, and —
more reliably — one frame's worth at a time while stepping), and presses **Save copy**,
which downloads a copy of the same HTML with his numbers written into one delimited config
block at the top. The coordinator diffs his copy against the shipped file and reads the
numbers off (e.g. `T1 = 3.7667`) before any build is re-run. The tool changes nothing in
the repo by itself.

## 1. What this tool will and will not do (Nathan reads this too — it is copied into the README and the page header)

**Will:**
- Open any mp4 the browser can decode (all Qualifire renders: h264, yuv420p, 30 fps — checked
  with ffprobe on `start-ride_v4.mp4`, `gates-saving_v8.mp4`, `ride_v1.mp4`, `opening_v3.mp4`)
  and any wav or mp3.
- Step one frame forward/back (33.33 ms at 30 fps), ±10 frames, jump to a time or a frame, and
  show **time in seconds (3 decimals) and the frame number (0-based, frame 0 = 0.000 s)**.
- Draw the audio's waveform on the **video's** clock, shifted by the offset, with a playhead,
  frame ticks when zoomed in, and the audio's detected attacks ("onsets") marked and listed
  in both audio time and video time.
- Let him place the same audio file more than once (the ride uses two placements: `T1` and
  `T2`), nudge the selected placement's offset, and type an exact value.
- Play video + audio together at the chosen offset (real time, Web Audio clock), and
  **scrub**: while stepping frames, play exactly the 33.33 ms of audio that belongs to the
  frame on screen — this mode is exact by construction and is the one to trust.
- **Save copy**: download a copy of the whole page with the current offsets, markers and
  file names written into the config block; the rest of the file is unchanged.

**Will not:**
- Change any file in the repo, any render, any WAV, or any brief. It is a viewer. A number he
  settles on becomes a change only when the coordinator re-runs the relevant build with it
  (`ride_tunetank.py`'s `T1`, or `soundtrack.py`'s `T0`), which is a separate step he sees.
- Guarantee sample-exact real-time sync. Browser video and Web Audio run on different clocks;
  the page re-syncs whenever they drift more than ~25 ms, so **real-time playback is right to
  about ±1 frame (±33 ms) on a wired output, worse on Bluetooth (100–200 ms of latency the
  page cannot see)**. That is why the scrub mode and the onset markers exist: judge with
  those, use real-time playback for the feel.
- Mix, fade, apply gain curves, or reproduce the E5 pulse layer. To hear the *built* mix,
  load the built master WAV (e.g. `ride/soundv2/ride_master_v2.wav`) with one placement at
  0.0 — it is already on the video's clock.
- Know where his files are. Browsers only expose the file *name* of a picked file, so the
  saved copy records names, not paths.
- Work in Firefox as intended (no `requestVideoFrameCallback`; it falls back to a coarser
  clock and says so). Chrome and Edge on Windows are the targets.

## 2. Where it lives, and how the numbers map to the briefs

```
marketing/audio-studio/tools/av-align/
  av-align.html        the tool (single file, ≤ 120 KB, no external references)
  av-align.test.mjs    node test — extracts the pure functions from the HTML and checks them
  README.md            two paragraphs: what it is/is not (§1 verbatim), how to use it, how a saved copy is read
```
`audio-studio/` has no `tools/` folder yet (`piano/tools/` exists for the piano project's
scripts); creating `audio-studio/tools/` for cross-scene tooling fits `structure.md`'s "shared
things live once at this folder's root" rule. Windows path for Nathan:
`C:\Users\natha\Claude personal projects\Qualifire\marketing\audio-studio\tools\av-align\av-align.html`.

**The one definition every number rests on:** a placement's `at` is **the video time (seconds
on the video's own clock, 0 = first frame) at which the audio file's t = 0 is placed.** That
is exactly `T1` in `BRIEF-tunetank-ride-soundtrack.md` (`ride_tunetank.py` line 66,
`T1 = 3.80`) and `T0` in `BRIEF-tunetank-piano-logo-opening.md` (`soundtrack.py`, `T0 = 0.0`).
Positive `at` = the audio starts later than the video. The ffmpeg mux never sees this number:
the build script bakes the placement into the WAV (`window_mix.place(master, file, at)`), and
the mux starts both streams at 0. So "Nathan's copy says `T1: 3.7667`" → the coordinator sets
`T1 = 3.7667` in `ride_tunetank.py`, re-runs the ride brief's §4, and nothing else changes.

Frame numbering: 0-based, `frame = floor(t × fps + 1e-6)`; frame n covers
`[n/fps, (n+1)/fps)`; 3.80 s = frame 114 at 30 fps; the ride's 26.3 s = 789 frames (0–788),
the opening's 6.5 s = 195 frames. The page seeks to `(n + 0.5)/fps` to display frame n
(seeking exactly to a frame boundary can show the previous frame in Chromium).

## 3. The config block — verbatim, and its contract

Shipped at the top of `<body>` (before the app markup), byte-for-byte:

```html
<script id="av-config">
/* AV-ALIGN CONFIG BEGIN */
window.AV_CONFIG = {
  "scene": "ride",
  "fps": 30,
  "video_name": "ride_v2_silent.mp4",
  "audio_name": "tunetank-emotional-classical-484234.mp3",
  "nudge_target": "T1",
  "placements": [
    { "label": "T1", "at": 3.8000, "gain": 0.4500, "note": "ride 1: audio t=0 while the START box fades out (3.55-4.00); the value to nudge" },
    { "label": "T2", "at": 16.5400, "gain": 0.4500, "note": "ride 2: 17.80 - 1.26, attack on the start pulse; derived in ride_tunetank.py, do not nudge" }
  ],
  "markers": [
    { "label": "START click", "t": 3.2000 },
    { "label": "START box fade begins", "t": 3.5500 },
    { "label": "camera push-in begins", "t": 3.8000 },
    { "label": "START box gone", "t": 4.0000 },
    { "label": "rider moves", "t": 5.3000 },
    { "label": "rider stops", "t": 13.8000 },
    { "label": "scene cut / zoom-out begins", "t": 14.0000 },
    { "label": "zoom-out ends", "t": 15.0000 },
    { "label": "ride-2 start pulse (E5)", "t": 17.8000 },
    { "label": "gate 1 pulse", "t": 19.8100 },
    { "label": "gate 2 pulse", "t": 21.6500 },
    { "label": "gate 3 pulse", "t": 23.5100 },
    { "label": "finish pulse", "t": 25.3800 },
    { "label": "video ends", "t": 26.3000 }
  ],
  "presets": [
    { "scene": "opening", "fps": 30, "video_name": "opening_v3.mp4", "audio_name": "tunetank-piano-logo-484286.mp3", "nudge_target": "T0", "placements": [ { "label": "T0", "at": 0.0000, "gain": 0.8500, "note": "file t=0 on video t=0" } ], "markers": [ { "label": "ring halfway", "t": 0.6500 }, { "label": "slash in", "t": 1.3000 }, { "label": "mark fades", "t": 2.1500 }, { "label": "wordmark tween", "t": 2.9500 }, { "label": "tagline tween", "t": 3.3500 }, { "label": "fade to black", "t": 5.5000 }, { "label": "video ends", "t": 6.5000 } ] }
  ]
};
/* AV-ALIGN CONFIG END */
</script>
```

Contract (tested in §6):
- `parseConfig(blockText)` returns the object (evaluate the text with `new Function` in a
  scratch `window` object — never `eval` on the whole page).
- `serializeConfig(cfg)` is deterministic and **reproduces the shipped block byte-for-byte**:
  keys in the order above; 2-space indent; every non-integer number printed with exactly 4
  decimals (`3.8000`), `fps` as an integer; strings JSON-escaped with double quotes; each
  placement/marker object on one line with the spacing shown; `presets` entries on one line
  each; a trailing `;` after the object; `/* AV-ALIGN CONFIG BEGIN */` and
  `/* AV-ALIGN CONFIG END */` as the only delimiters. 4 decimals = 0.1 ms resolution, finer
  than a frame (33.3 ms) and than the 0.1 ms grid the nudge buttons snap to.
- `applyConfig(sourceHtml, cfg)` replaces exactly the text between the two delimiter lines
  (delimiters kept) and returns `{ html, replaced }` with `replaced === 1`; anything else is
  an error. Everything outside the block is byte-identical.
- The page's markers are annotations only (drawn as labelled ticks, jump buttons); they do
  not affect playback. Nathan may add/move markers in the page; they round-trip too.
- The `presets` list is what the "Load preset" dropdown offers (it replaces `scene`, `fps`,
  names, `nudge_target`, `placements`, `markers`; `presets` itself is kept).

## 4. The page — structure, behaviour, and the parts that must be exact

One file, hand-written HTML + CSS + JS, **no external references of any kind** (no `<link>`,
no `src=`/`href=` to http(s), no fonts, no CDN, no `import`), no build step, no framework.
Plain ES2020 in three `<script>` blocks, in this order:

1. `<script id="av-config">` — §3, verbatim.
2. `<script id="av-core">` — **pure functions only, no `document`/`window` access**, exposed as
   `const AVCore = { ... }` and, when `module.exports` exists, also assigned to it (the test
   harness evaluates this block's text with node's `vm`). Functions and their contracts:
   - `frameOf(t, fps)` → `Math.max(0, Math.floor(t * fps + 1e-6))`.
   - `timeOfFrame(n, fps)` → `n / fps`. `seekTimeOfFrame(n, fps)` → `(n + 0.5) / fps`.
   - `roundTenthMs(t)` → `Math.round(t * 1e4) / 1e4`. `nudge(at, deltaS)` → `roundTenthMs(at + deltaS)`.
     The buttons call it with `±1/fps`, `±0.010`, `±0.100`.
   - `fmtSeconds(t)` → `t.toFixed(3)`; `fmtFrames(t, fps)` → `(t * fps).toFixed(2)`.
   - `videoTimeOfAudio(tA, at)` → `tA + at`; `audioTimeOfVideo(tV, at)` → `tV - at`.
   - `scrubWindow(tV, at, fps)` → `[tV - at, tV - at + 1 / fps]` (audio-time interval belonging
     to the frame shown at video time `tV` for a placement at `at`; callers clip to the buffer).
   - `detectOnsets(mono, sr, opts)` — `mono` a Float32Array; defaults
     `{ win: 0.005, look: 4, jumpDb: 6, floorDb: -45, minGap: 0.06 }`. Algorithm (the same
     detector both cycle-16 briefs use in their check scripts): first-difference high-pass
     `hp[i] = mono[i] - mono[i-1]` (`hp[0] = mono[0]`); blocks of `w = Math.round(win · sr)`
     samples (221 at 44.1 kHz), the last partial block dropped; RMS per block → dB
     (`20·log10(max(rms, 1e-9))`); block `i` (from `i = look`) is an onset if
     `db[i] - max(db[i-look..i-1]) > jumpDb`, `db[i] > floorDb`, and `t − lastOnset > minGap`
     with `t = i·w / sr`. Returns `[{ t, db }]`, `t` rounded to 3 decimals, `db` to 1.
   - `peakBins(mono, i0, i1, bins)` → `Float32Array(2·bins)` of `[min, max]` per bin over
     samples `[i0, i1)`, for drawing.
   - `parseConfig`, `serializeConfig`, `applyConfig` — §3. `serializeConfig` returns the
     text that sits between the `BEGIN` delimiter line and the `END` delimiter line: from
     `window.AV_CONFIG = {` through `};`, every line LF-terminated, nothing before or after.
     Inside `av-core` the two delimiters must be assembled from parts (e.g.
     `const delim = w => "/* AV-ALIGN CONFIG " + w + " */";`) so that the exact text
     `/* AV-ALIGN CONFIG BEGIN */` occurs in the whole file **once** — in the config block —
     which the tests and the coordinator's grep rely on. `applyConfig` locates the block as
     `delim("BEGIN") + "\n" … delim("END")` and throws if it is not found exactly once.
   - `formatCopyName(scene, date)` → `av-align.<scene>.<YYYYMMDD-HHMM>.html` (local time).
3. `<script id="av-app">` — the UI. Its **first statement** captures
   `const PRISTINE = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;` before any DOM
   mutation, so Save copy works from the page as loaded, not as modified. No top-level
   `await` in any block (the §6.3 syntax check wraps each block in `new Function`); async
   work goes inside functions.

**Markup — element ids the tests and the README refer to** (layout is the executor's; keep
it plain: one column, system font, dark-on-light, nothing decorative):
- Header: title; the §1 "will / will not" text in a collapsible `<details id="about">`, open
  by default on first load; a one-line status `#status`.
- `#video-file`, `#audio-file` (`<input type="file">`, accept `video/mp4` / `audio/*`), a
  drop zone `#drop` accepting both, `#preset` (`<select>` from `presets` + the current
  scene), `#fps` (number input, from config; changing it re-labels every frame readout).
- `<video id="video" muted playsinline>` (the page never uses the video's own audio track,
  so silent renders and with-sound renders behave the same), max width 960 px.
- Transport `#transport`: `#step-back10`, `#step-back`, `#play`, `#step-fwd`, `#step-fwd10`,
  `#stop`; readout `#time` = `t.toFixed(3) s · frame N / total` (total from
  `Math.round(video.duration * fps)`), plus `#shown-frame` from `requestVideoFrameCallback`'s
  `mediaTime` (or "n/a" without rVFC); inputs `#goto-time`, `#goto-frame`; checkbox
  `#scrub` ("play this frame's audio when stepping", default on); checkbox `#loop-frame`
  ("repeat the frame's audio 3×", default off).
- Placements `#placements`: a row per placement — label, `at` as seconds (editable
  `input[type=number] step=0.0001`) and as frames (`fmtFrames`, read-only), gain (editable),
  note, a radio "nudge this one" (default: `nudge_target`), buttons `−1f −100ms −10ms +10ms
  +100ms +1f` acting on the selected placement, `Add placement` (duplicates the selected),
  `Remove`. Nudging updates the waveform and the onset list immediately; if audio is playing
  it restarts at the new offset.
- Waveform `<canvas id="wave">` (full width, ~160 px tall) on the **video clock**: 0 to
  `video.duration` (or the audio's extent if longer). Each placement draws the audio's peak
  envelope shifted by its `at` (second and later placements in a lighter shade), the
  playhead as a vertical line, markers as labelled ticks along the top, onsets as short
  ticks along the bottom. Two zooms via `#zoom`: "all" and "±2 s around the playhead"; in the
  zoomed view every frame boundary is a faint tick. Clicking the canvas seeks (snapped to a
  frame). Keyboard: `←`/`→` step, `Shift+←/→` ±10, `Space` play/pause, `,`/`.` nudge ∓/±1 frame.
- Onsets `#onsets`: threshold slider `#onset-floor` (−60…−20 dBFS, default −45) and jump
  `#onset-jump` (3…12 dB, default 6); a table: onset audio time, dB, and per placement the
  video time and frame (`videoTimeOfAudio` → `frameOf`) with a "go" button that seeks the
  video to that frame (scrub then plays that frame's audio if `#scrub` is on). The first
  onset is highlighted as "attack".
- Config `#config-out`: a read-only `<textarea>` always showing `serializeConfig(current)`,
  `#save-copy` button, `#copy-config` button (`navigator.clipboard.writeText`, with the
  textarea as the fallback when the API is unavailable).
- Footer: the one-line disclaimer "This page changes nothing in the repository. A saved copy
  is a proposal; the coordinator applies it by re-running the build."

**Playback — exact requirements:**
- Audio decoding: `FileReader` → `ArrayBuffer` → `AudioContext.decodeAudioData` (wav and mp3
  both decode in Chromium). Mono for analysis = mean of channels; playback uses the decoded
  buffer as is. Report `sampleRate`, channels, duration, peak (dBFS) in `#status`.
- Real-time play: on `#play`, `await video.play()`; on the **first** rVFC callback after that
  (fallback: the `playing` event), read the presented `mediaTime` (fallback `currentTime`),
  and for each placement whose window covers it start one `AudioBufferSourceNode` at
  `ctx.currentTime + 0.05` with `offset = mediaTime + 0.05 − at` (skip placements whose offset
  falls outside the buffer; those still to come are scheduled with `start(when)` at the right
  future context time). Subtract `ctx.outputLatency` (when the browser reports it) from the
  start time so the sound reaches the output with the frame. On every subsequent rVFC compare
  `mediaTime − at` with the audio position implied by the context clock; if `|drift| > 0.025`,
  stop and restart that placement's source at the corrected position and count it in
  `#status` ("resyncs: n"). `#stop` stops every source and pauses the video; `#play` toggles
  pause/resume (resume re-schedules from the current frame). Never use the `<audio>` element
  for playback.
- Scrub on step: stop any playing sources, seek the video to `seekTimeOfFrame(n)`, and once
  `seeked` fires play, for each placement, the audio slice `scrubWindow(timeOfFrame(n), at, fps)`
  (clipped to the buffer; silent if outside) through a short 2 ms fade-in/out (`GainNode`
  ramps) to avoid clicks; if `#loop-frame` is on, play it three times back to back. This is
  the mode the README tells Nathan to trust: what he hears is exactly the audio that the
  build would place under that frame.
- Frame readout: `frameOf(video.currentTime, fps)`; `#shown-frame` from rVFC's
  `metadata.mediaTime` → `shownFrameOf(mediaTime, fps)` = `round(mediaTime × fps)` (a displayed
  frame's mediaTime is a frame-START time, rounded to whole µs by Chromium, so `floor` misreads
  every frame n with n mod 3 = 1 as n−1 — found by Inspect 2026-09-23); if the two differ after a seek, show a
  small "(shown: N)" warning rather than hiding it.
- Loading a file resets playback, keeps the config; picking a new video re-reads `duration`
  and rescales the canvas; file names go into `video_name` / `audio_name`.
- Save copy: `applyConfig(PRISTINE, current)`; if `replaced !== 1` show an error and do
  nothing; else download via a Blob URL and an `<a download>` named
  `formatCopyName(scene, new Date())`. The README tells Nathan the file lands in his
  Downloads folder and to paste it (or its config block, from `#copy-config`) into chat or
  into `marketing/audio-studio/tools/av-align/copies/` (folder created on first use by him;
  the executor does not create it).

**Serialization stability** (so that a saved copy diffs cleanly against the original): author
the HTML the way Chromium's serializer emits it — lowercase tags and attribute names, every
attribute value double-quoted, no boolean-attribute values (`muted`, not `muted=""` — the
serializer prints `muted=""`; use `muted=""` in the source too), void elements without a
trailing slash (`<input ...>`, `<br>`), no `<` or `&` in text nodes outside `<script>`
(write `&lt;`/`&amp;` and expect them back the same), no `<!-- -->` comments outside scripts,
LF line endings, UTF-8 without BOM, `<html lang="en">`, `<meta charset="utf-8">` as the first
head child. This cannot be proven in node; §6 item 5 says how Inspect checks it when a
browser is available, and the coordinator's fallback is to diff config blocks (§7).

**Windows / OneDrive notes for the README:** double-click opens the default browser — Chrome
or Edge both work; if it opens in something else, right-click → Open with → Chrome/Edge.
The folder is under OneDrive-synced `Claude personal projects`: an mp4 that shows a cloud
icon (Files On-Demand) is downloaded by Windows when picked — first pick can take a moment.
Save copy writes to `Downloads`, not next to the original (browsers cannot write into the
folder they were opened from). Nothing is uploaded anywhere; the page has no network code.

## 5. Files — what to write

### 5.1 `av-align.html`
Per §3–§4. Size limit 120 KB. Keep the CSS to ~60 lines. No minification. No HTML comments
anywhere outside `<script>` blocks (§4 serialization rule); explanatory text for Nathan lives
in the `<details id="about">` element, explanatory text for developers in JS comments inside
the script blocks.

### 5.2 `av-align.test.mjs` — verbatim
```js
// av-align.test.mjs — node ≥ 18, no dependencies. Run: node av-align.test.mjs (from this folder).
// Extracts the <script id="av-core"> block from av-align.html and checks the pure functions.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "av-align.html"), "utf8");
const core = html.match(/<script id="av-core">([\s\S]*?)<\/script>/);
if (!core) throw new Error("av-core block not found");
const sandbox = { module: { exports: {} }, console };
vm.runInNewContext(core[1] + "\nmodule.exports = AVCore;", sandbox);
const C = sandbox.module.exports;

let fails = 0, n = 0;
const ok = (name, cond, detail = "") => { n++; if (!cond) { fails++; console.log("FAIL", name, detail); } else console.log("pass", name); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// 1. frame <-> time, 30 fps, every frame of the ride (789 frames) and the opening (195)
for (const total of [789, 195]) {
  let bad = 0;
  for (let f = 0; f < total; f++) {
    if (C.frameOf(C.timeOfFrame(f, 30), 30) !== f) bad++;
    if (C.frameOf(C.seekTimeOfFrame(f, 30), 30) !== f) bad++;
  }
  ok(`frame round-trip ${total} frames`, bad === 0, `bad=${bad}`);
}
ok("frameOf(3.80,30) = 114", C.frameOf(3.80, 30) === 114);
ok("frameOf(3.55,30) = 106", C.frameOf(3.55, 30) === 106);
ok("frameOf(4.00,30) = 120", C.frameOf(4.00, 30) === 120);
ok("frameOf(17.80,30) = 534", C.frameOf(17.80, 30) === 534);
ok("frameOf(-0.1) clamps to 0", C.frameOf(-0.1, 30) === 0);
ok("seekTimeOfFrame(114,30) = 3.81667", near(C.seekTimeOfFrame(114, 30), 3.816667, 1e-6));

// 2. offset arithmetic and nudges
ok("nudge +1 frame", C.nudge(3.8, 1 / 30) === 3.8333);
ok("nudge -1 frame", C.nudge(3.8, -1 / 30) === 3.7667);
ok("nudge +10 ms", C.nudge(3.8, 0.010) === 3.81);
ok("nudge -100 ms", C.nudge(3.8, -0.100) === 3.7);
ok("nudge snaps to 0.1 ms", C.nudge(3.80004, 0) === 3.8);
ok("videoTimeOfAudio(1.26, 3.8) = 5.06", near(C.videoTimeOfAudio(1.26, 3.8), 5.06, 1e-9));
ok("audioTimeOfVideo(17.8, 16.54) = 1.26", near(C.audioTimeOfVideo(17.8, 16.54), 1.26, 1e-9));
ok("fmtSeconds", C.fmtSeconds(3.8) === "3.800");
ok("fmtFrames", C.fmtFrames(3.8, 30) === "114.00");
const sw = C.scrubWindow(5.0, 3.8, 30);
ok("scrubWindow", near(sw[0], 1.2, 1e-9) && near(sw[1], 1.2 + 1 / 30, 1e-9), JSON.stringify(sw));

// 3. onset detection on a synthetic click track (44.1 kHz, 6 s, clicks at 1.000 / 2.500 / 4.250 s)
const sr = 44100, mono = new Float32Array(6 * sr);
for (const t of [1.0, 2.5, 4.25]) {
  const i0 = Math.round(t * sr);
  for (let k = 0; k < 2205; k++) mono[i0 + k] = 0.8 * Math.exp(-k / 400) * Math.sin(2 * Math.PI * 880 * k / sr);
}
for (let i = 0; i < mono.length; i++) mono[i] += 0.0005 * Math.sin(2 * Math.PI * 50 * i / sr); // faint hum, must not trigger
const on = C.detectOnsets(mono, sr);
ok("3 onsets found", on.length === 3, JSON.stringify(on));
ok("onset times within 6 ms", on.length === 3 && near(on[0].t, 1.0, 0.006) && near(on[1].t, 2.5, 0.006) && near(on[2].t, 4.25, 0.006), JSON.stringify(on));
ok("silence gives no onsets", C.detectOnsets(new Float32Array(sr), sr).length === 0);

// 4. peak bins
const ramp = new Float32Array(1000); for (let i = 0; i < 1000; i++) ramp[i] = i / 1000;
const pb = C.peakBins(ramp, 0, 1000, 10);
ok("peakBins length", pb.length === 20);
ok("peakBins first bin", near(pb[0], 0, 1e-6) && near(pb[1], 0.099, 1e-6), `${pb[0]} ${pb[1]}`);
ok("peakBins last bin", near(pb[18], 0.9, 1e-6) && near(pb[19], 0.999, 1e-6), `${pb[18]} ${pb[19]}`);

// 5. config block: parse, serialize (byte-exact), apply (block-only change)
const m = html.match(/\/\* AV-ALIGN CONFIG BEGIN \*\/\n([\s\S]*?)\/\* AV-ALIGN CONFIG END \*\//);
ok("config block present once", !!m && html.split("/* AV-ALIGN CONFIG BEGIN */").length === 2 && html.split("/* AV-ALIGN CONFIG END */").length === 2);
const cfg = C.parseConfig(m[1]);
ok("parsed scene/fps", cfg.scene === "ride" && cfg.fps === 30);
ok("parsed T1", cfg.placements[0].label === "T1" && cfg.placements[0].at === 3.8);
ok("serialize round-trips byte-exact", C.serializeConfig(cfg) === m[1], "serialized text differs from the shipped block");
const cfg2 = JSON.parse(JSON.stringify(cfg)); cfg2.placements[0].at = C.nudge(cfg2.placements[0].at, -1 / 30);
const applied = C.applyConfig(html, cfg2);
ok("applyConfig replaced exactly one block", applied.replaced === 1);
const before = html.split("\n"), after = applied.html.split("\n");
const changed = []; for (let i = 0; i < Math.max(before.length, after.length); i++) if (before[i] !== after[i]) changed.push(i + 1);
ok("only the T1 line changed", changed.length === 1 && after[changed[0] - 1].includes('"at": 3.7667'), `changed lines: ${changed.join(",")}`);
ok("applyConfig on text without a block errors", (() => { try { C.applyConfig("nothing here", cfg); return false; } catch (e) { return true; } })());
ok("copy name", /^av-align\.ride\.\d{8}-\d{4}\.html$/.test(C.formatCopyName("ride", new Date(2026, 8, 23, 14, 5))));

// 6. the shipped file has no external references
ok("no http(s) references", !/https?:\/\//.test(html));
ok("no <link> and no src= on scripts", !/<link\b/i.test(html) && !/<script[^>]*\bsrc=/i.test(html));
ok("file under 120 KB", Buffer.byteLength(html, "utf8") < 120 * 1024, `${Buffer.byteLength(html, "utf8")} bytes`);
ok("no comments outside scripts", !html.replace(/<script[\s\S]*?<\/script>/g, "").includes("<!--"));

console.log(`${n - fails}/${n} passed`);
console.log(fails ? "SOMETHING FAILED" : "ALL PASS");
process.exit(fails ? 1 : 0);
```
The peak-bin expectations assume bin `b` covers samples `[i0 + b·w, i0 + (b+1)·w)` with
`w = (i1 − i0) / bins` (here 100) and stores `[min, max]` of those samples. The click-track
expectation assumes the default detector parameters; with the §4 algorithm the expected
detections are 0.997 / 2.496 / 4.250 s (simulated at Plan time; block = 221 samples). If a
test cannot pass without changing a contract in §4, **stop** — do not edit the test.

### 5.3 `README.md` (in `tools/av-align/`)
Title; the §1 "will / will not" lists verbatim; "How to use" — six numbered steps (open the
file; pick the video; pick the audio; check the preset/fps; step with ← → and listen with
scrub on; nudge with the buttons; Save copy → Downloads → paste into chat or into
`copies/`); "What the numbers mean" (the `at` definition from §2, with `T1` / `T0` named);
"Which files to load" — a two-row table: ride = `marketing/audio-studio/ride/soundv2/ride_v2_silent.mp4`
(exists once the ride brief has run; before that, the two silent renders in
`marketing/silent-studio/all-renders/` one at a time) + the mp3
`marketing/audio-studio/piano/projects/tunetank-ride/sources/tunetank-emotional-classical-484234.mp3`
with the shipped placements, *or* `ride_master_v2.wav` with one placement at 0.0000 to hear
the built mix; opening = `marketing/silent-studio/all-renders/opening_v3.mp4` +
`marketing/audio-studio/piano/projects/tunetank/sources/tunetank-piano-logo-484286.mp3`,
preset "opening"; the Windows/OneDrive notes (§4); "Accuracy" (the ±1 frame statement from
§1, wired vs Bluetooth); "Testing" (`node av-align.test.mjs`). Under 90 lines.

### 5.4 `marketing/audio-studio/structure.md` — one line
Anchor: the line `Shared building blocks (envelopes, notes, chords, pluck/pad/reverb, plus the brand`
(the start of the paragraph about `synth.py`; verify it occurs once). **After that paragraph**
(the first blank line following the anchor's paragraph), insert:

`Cross-scene tooling lives in `tools/` — first entry `tools/av-align/av-align.html` (cycle 16), Nathan's offline frame-stepping audio/video alignment page; see its README.`

followed by a blank line. Nothing else in that file changes.

## 6. Verification (executor — numbers, not adjectives)

1. `cd marketing/audio-studio/tools/av-align && node av-align.test.mjs` → every line `pass`,
   last two lines `NN/NN passed` and `ALL PASS`, exit code 0. Paste the whole output.
2. `wc -c av-align.html` (< 122 880), `grep -cF '/* AV-ALIGN CONFIG BEGIN */' av-align.html` → 1,
   `grep -n "https\?://" av-align.html` → no output, `file av-align.html` → UTF-8 (no BOM:
   `head -c 3 av-align.html | xxd` must not be `efbbbf`), `grep -c $'\r' av-align.html` → 0.
3. Syntax: `node --check` cannot parse HTML — instead extract each script block and check
   it: `node -e 'const h=require("fs").readFileSync("av-align.html","utf8");for(const m of h.matchAll(/<script id="([^"]+)">([\s\S]*?)<\/script>/g)){new Function(m[2]);console.log("ok",m[1])}'`
   → `ok av-config`, `ok av-core`, `ok av-app`.
4. The structure.md anchor: `grep -c "Cross-scene tooling lives in" marketing/audio-studio/structure.md` → 1.
5. **Only where a Chromium is available** (Inspect's container may have Playwright; Nathan's
   PC VM does not — checked 2026-09-23; do not install anything to get one): open
   `file://…/av-align.html`, confirm no console errors on load, press `#save-copy` with the
   config untouched, and `diff` the download against the original: **expected empty diff**
   (proves the serialization rule in §4). Then nudge `T1` −1 frame, save, diff: exactly one
   changed line, `"at": 3.7667`. If no browser is available, say so in the report — that
   check then falls to Nathan's first use (§7).
6. `GIT_OPTIONAL_LOCKS=0 git status --short marketing/audio-studio` → untracked
   `tools/`, modified `structure.md` (and `APPROACH.md`, which already carries the
   coordinator's 2026-09-23 decision note — not this brief's edit), plus whatever the other
   cycle-16 briefs have changed if they ran first; nothing else from this brief. Do not commit.

**What the executor cannot verify, stated honestly:** that the page plays, seeks frame-exact,
or stays in sync in a browser. Those are checked by Nathan on first use (and by Inspect under
item 5 when it has a browser). The report must say this in one sentence, not imply it was
tested.

## 7. How the coordinator reads a saved copy (goes in the README too)

Nathan sends `av-align.<scene>.<stamp>.html` (or pastes the config block). Then:

```bash
python3 - <<'PY'
import re,sys
blk=lambda p: re.search(r"/\* AV-ALIGN CONFIG BEGIN \*/\n([\s\S]*?)/\* AV-ALIGN CONFIG END \*/", open(p,encoding="utf-8").read()).group(1)
a=blk("marketing/audio-studio/tools/av-align/av-align.html"); b=blk(sys.argv[1] if len(sys.argv)>1 else "copy.html")
import difflib; print("".join(difflib.unified_diff(a.splitlines(1), b.splitlines(1), "shipped", "nathan")))
PY
```
The changed `"at"` of the placement labelled `T1` is the new `T1` for `ride_tunetank.py` (one
constant, line 66; then the ride brief's §4 again and the `expect` strings in
`check_tunetank.py` re-derived from the run — a small Execute pass, no re-plan). A changed
`T2` is *not* applied (it is derived from the start pulse); a changed `T0` on the opening
preset maps to `soundtrack.py`'s `T0`. A whole-file `diff` should show only that block; if
it shows more, the serialization rule slipped somewhere — report it, it is a tool bug, not a
Nathan change.

## 8. Report format

Tier readout line (model, tokens, tool calls); `ls -la` of the new folder; the full §6.1 test
output; the §6.2–6.4 greps; whether §6.5 ran and its diffs; the one-sentence honesty line
from §6; any place this brief was ambiguous, quoted verbatim.

## 9. For Inspect (fresh Opus) — what to attack

1. Rerun §6.1–6.4 yourself from a fresh shell; do not trust the pasted output.
2. Read `av-core` for hidden DOM/global access (it must run under `vm` with only
   `module`/`console`), for `eval`, and for any `fetch`/`XMLHttpRequest`/`import` anywhere in
   the file.
3. Check the `at` semantics against `ride_tunetank.py`'s `wm.place(..., T1, ...)`: positive `at`
   delays the audio. Check `scrubWindow` gives the audio that `window_mix.place` would put
   under that frame (`tV − at`).
4. Check the seek target `(n + 0.5)/fps` is used for stepping and the readout uses `frameOf`
   on `currentTime`/`mediaTime` — not `Math.round`.
5. If a Chromium is available: §6.5 in full, plus load a 2 s synthetic mp4
   (`ffmpeg -f lavfi -i testsrc=duration=2:size=320x180:rate=30 -pix_fmt yuv420p -c:v libx264 t.mp4`)
   and a synthetic wav with clicks at 0.5 / 1.0 s, set `at = 0.2`, and confirm the onset table
   lists video times 0.700 / 1.200 and frames 21 / 36.
6. Read the page's "about" text and the README against §1: every "will" must be something
   the code does; every limit must be stated, none softened.
7. Confirm nothing outside `tools/av-align/` and the one `structure.md` line changed by
   this brief (the dated decision notes at the top of `structure.md` / `APPROACH.md` are the
   coordinator's, already present).
