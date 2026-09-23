# BRIEF — av-align: restyle and relayout as an editing-suite page (Resolve-style), same behaviour, same ids (cycle 17, item D)

**Status: ready to execute (2026-09-23, Plan tier, Fable).** Sonnet-executable: one file
rewritten in its markup and CSS (`marketing/audio-studio/tools/av-align/av-align.html`), a
bounded list of JS edits in `<script id="av-app">`, README edits, **no change to
`<script id="av-core">` and no change to `av-align.test.mjs`** (every id the JS looks up is
kept, so the 36 tests stay valid as they are). **Where it runs:** the file is edited and
verified in the **cloud container** (it has Playwright Chromium at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome` and the Read tool for PNGs; do not run
`playwright install`), then written back to Nathan's PC with `device_commit_files`; the
node tests are run in both places. **Independent of items A–C** except one config line (§7);
run it last by preference. **Stop-on-ambiguity applies**: a must-survive behaviour (§3) you
cannot keep, a test that fails, a Save-copy round-trip that is not byte-identical, a
screenshot that does not match §8's description → stop and report; never guess. Do not
commit.

## 0. What this will and will not change (Nathan reads this)

**Will:** the page looks and works like a small editing suite instead of a form: viewer top
left with a transport bar and a large `HH:MM:SS:FF` timecode, placements/markers/onsets/config
in a panel on the right, a dark timeline dock across the bottom with a time ruler, one lane per
placement, an onset lane and a red playhead, a status bar, a `?` shortcut sheet, drop cards
when nothing is loaded, and a "● N changes" badge that says whether **Save copy** will carry
anything. Video, waveform and the nudge buttons are visible at the same time at 1440×900 and
1920×1080; below 1100 px it stacks. Dark only.

**Will not:** change what the tool computes or writes. Frame stepping, scrub, real-time
play, onset detection, placements/markers, presets, `Save copy`/`Copy config` and every
keyboard shortcut behave exactly as in cycle 16 (the 36 tests prove the maths and the config
block; §8 proves the page). It stays one offline HTML file, no fonts, no icons from the web,
no `<link>`, under 120 KB, LF. It still cannot step frames in Firefox, still cannot know a
file's path, and still does not touch the repo — a saved copy is a proposal. Nathan's saved
copies from cycle 16 remain readable (the config block format is unchanged).

## 1. Research and the design decision (what is kept / adopted / dropped)

Source: the Plan-tier research note (current-UI audit with screenshots, reference tools,
palette with WCAG ratios, must-survive list, id list). Reference layout adopted: **DaVinci
Resolve Edit page** (viewer + inspector + timeline dock + status bar; transport under the
viewer; timecode top-right of the viewer), with a peaks.js/waveform-playlist-style timeline
(ruler, lanes, regions). Conventions every reference tool shares and this brief copies:
viewer on top, timeline across the bottom, inspector at the side; dark neutral UI, one accent,
red/orange playhead; mono tabular timecode `HH:MM:SS:FF`; arrows = 1 frame, Shift+arrows =
10; a typeable time field; a ruler whose ticks adapt to zoom.

| research item | decision |
|---|---|
| Resolve layout, palette table, type scale, inline-SVG icons, transport bar, big TC, ruler, lanes, onset lane, marker flags, inspector cards + tabs, status bar (3 severities), `?` overlay, drop cards, dirty badge + diff popover, focus rings, `prefers-reduced-motion`, 1100 px collapse | **adopt** (§4–§6) |
| Stop merged into Pause; first/last-frame buttons | **keep `#stop` as its own icon button** (JS binds it; removing it throws). Add `#step-first` / `#step-last` (two lines of JS). |
| Radio "nudge this one" replaced by clicking the card | **adopt via a hidden radio**: the radio stays (JS creates it), visually hidden, the whole card is its `<label>`; selected card gets `.sel`. |
| Overview strip, Fairlight sync strip, "frame" zoom level, draggable divider, file chips with ×, `[`/`]` placement keys, `M` marker key, `Ctrl+S` | **drop** (scope; optional extras add risk to the play loop and to `PRISTINE`). Keep zoom as the two existing options. |
| Light theme | **drop** — dark only, `color-scheme: dark` (every reference tool is dark; halves the states to verify). |
| onset Floor/Jump sliders into a popover | **simplify to a collapsible row** inside the Onsets tab (a `<details>`), not a popover. |
| Home/End keys, `?`/Esc | **adopt** (four lines in the keydown handler, same guard). |

## 2. Hard constraints (the test file and the Save-copy contract — read before writing a line)

1. `<script id="av-core">…</script>` is copied **byte-for-byte** from the current file (lines
   145–266). The regex in the test needs exactly that opening tag; the script stays pure.
2. The config block `/* AV-ALIGN CONFIG BEGIN */ … /* AV-ALIGN CONFIG END */` (lines 36–69,
   `<script id="av-config">`) is kept verbatim except the single change in §7; the two
   delimiters occur exactly once each in the whole file — so **never write those words
   anywhere else** (not in the help overlay, not in a comment).
3. No `http://` or `https://` anywhere (so inline `<svg>` carries **no `xmlns`**), no `<link`,
   no `<script … src=`, no `<!-- -->` outside `<script>`, file < 120 KB, LF, UTF-8 no BOM.
4. `<script id="av-app">` stays the **last** script and its first statement stays
   `const PRISTINE = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;`. **No script
   and no markup may mutate the DOM before it runs** (no inline `onload`, no earlier script
   that builds elements). Everything the app renders happens after `PRISTINE` is captured.
5. **Serialisation stability**: the shipped file must equal what Chromium serialises, or Save
   copy diffs will show noise. Author the file the way the serializer emits it: lowercase tags
   and attributes, every attribute double-quoted, boolean attributes as `attr=""` (`muted=""`,
   `checked=""`, `open=""`, `hidden=""`, `disabled=""`), void elements without `/`
   (`<input …>`, `<br>`), **every SVG child with an explicit end tag** (`<path d="…"></path>`,
   not `<path … />` — the HTML serializer writes end tags for foreign elements), `&lt;`/`&amp;`
   in text, `<html lang="en"><head><meta charset="utf-8">` as today. §8.2 is the proof; if it
   fails, run the normalise step there and re-test.
6. Every id the JS looks up **exists exactly once** with the same element type: inputs/selects
   `video-file` `audio-file` `preset` `fps` `goto-time` `goto-frame` `scrub` (checkbox)
   `loop-frame` (checkbox) `zoom` (select, options `all`/`zoom`) `onset-floor` (range)
   `onset-jump` (range); containers `status` `time` `shown-frame` `onset-floor-v`
   `onset-jump-v` `onset-msg` `placements` `markers` `onset-table` (with `<thead>` and
   `<tbody>`) `config-out` (textarea) `drop` `video` (the `<video muted="" playsinline=""
   preload="auto">`, never `controls`, never `display:none`) `wave` (canvas); buttons
   `step-back10` `step-back` `play` `step-fwd` `step-fwd10` `stop` `n-1f-` `n-100-` `n-10-`
   `n-10p` `n-100p` `n-1fp` `add-placement` `add-marker` `save-copy` `copy-config`. All
   buttons stay real `<button>` elements (the document click handler blurs `BUTTON` targets so
   Space/arrows keep working); no `role="button"` divs.
7. Keyboard guard unchanged: keys ignored while `INPUT`/`TEXTAREA`/`SELECT` is focused or
   Ctrl/Alt/Meta held. New keys follow it.
8. `drawWave()` keeps its cache logic and `C.peakBins`; the canvas must have non-zero
   `clientWidth` at all times (it is never inside a hidden tab) and any layout change that
   resizes it without a window resize calls `drawWave()` (use a `ResizeObserver` on the dock).

## 3. Must-survive behaviour (from the code; verify each in §8)

Frame step ±1/±10 (buttons + Left/Right, Shift+Left/Right), clamped, seeking to
`(n+0.5)/fps`; time readout seconds (3 decimals) + `frame n / total` (0-based); shown-frame
cross-check via `requestVideoFrameCallback` with "n/a" fallback; go-to time / go-to frame
fields not overwritten while focused; play/pause (button + Space), Stop, restart after
`ended`, Web Audio real-time sync with resync counter; fps input 1..240; preset select ("as
loaded: ride", "preset: opening") replacing scene/fps/names/nudge target/placements/markers
with a warning; scrub (frame-slice audio, 2 ms fades) and repeat-3×; waveform on the video
clock per placement, click-to-seek, zoom all / ±2 s, frame ticks when zoomed, markers with
labels, onset ticks per placement, playhead; onset detection with Floor/Jump and their value
labels, message, table (≤100 rows, first = attack, per-placement "go" cells disabled when
t < 0 or no video); placements (label, at 4 dp, frame equivalent, gain, note; add/remove,
remove disabled when only one; nudges −1f/−100/−10/+10/+100/+1f on the selected one, frame
nudges snapped, 0.1 ms rounding; `,`/`.` keys); markers (label, t, frame, Go, Remove, add at
playhead); config textarea live; Save copy (`av-align.<scene>.<YYYYMMDD-HHMM>.html`, only the
config block replaced); Copy config with select-text fallback; drag-and-drop of mp4/audio onto
`#drop` with `.over`; status as the message channel; buttons/radios/checkboxes/ranges blur
after use.

## 4. Layout (write it as a CSS grid; sizes are targets, not pixels to fight over)

```
┌ #topbar 44px ─────────────────────────────────────────────────────────────────────────┐
│ av-align   [preset ▾] fps [30]   video: <name>  audio: <name>      ● 1 change  [Save copy] [?] │
├ #viewer-col (minmax(0,1fr)) ─────────────────────────┬ #inspector 360px (420px ≥1900) ───┤
│ #drop = the whole viewer column (drop target)         │ PLACEMENTS (cards, .sel highlighted)│
│   <video> letterboxed on #000, 16:9, max-height       │   T1  3.8000 s · 114.00 f  gain 0.45 │
│   #empty (two drop cards) shown only when no video    │   note…                       [Remove]│
│ #transport 56px: |< -10f -1f (▶) +1f +10f >| ■  TC    │   nudge: [-1f][-100][-10]|[+10][+100][+1f]  [+ Add] │
│   under it: go-to time [ ] go-to frame [ ] ☐ scrub ☐ 3x│ tabs: Markers | Onsets | Config     │
├ #dock 260px (300px ≥1900) ────────────────────────────┴───────────────────────────────────┤
│ #dockbar 28px: "Timeline" · zoom [all|±2 s] · hint text                                    │
│ <canvas id="wave"> fills the rest: ruler 22px · lane per placement · onset lane 18px       │
├ #statusbar 24px ───────────────────────────────────────────────────────────────────────────┤
│ #status (info) · warnings · transient message (severity colour)                            │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- `body { margin:0; height:100vh; display:grid; grid-template-rows: 44px minmax(0,1fr) var(--dock-h) 24px; grid-template-columns: minmax(0,1fr) var(--insp-w); overflow:hidden }`;
  topbar, dock and statusbar span both columns. `--dock-h: 260px; --insp-w: 360px;` at
  `@media (min-width:1900px) { --dock-h: 300px; --insp-w: 420px }`.
- `@media (max-width:1100px)`: `body { display:block; height:auto; overflow:auto }`; topbar
  wraps to two rows; viewer height `40vh`; then transport, then the dock (260 px), then the
  inspector full width. Nothing is hidden; the page scrolls.
- The inspector's tab bodies scroll internally (`overflow:auto`); the viewer column never
  scrolls. Tabs: three `<button>`s with `aria-selected` + `hidden=""` on the inactive panels
  (a tiny JS toggle; the canvas is not inside a tab). Default tab: Markers.
- Video: `object-fit: contain; width:100%; height:100%; background:#000` inside a
  `#viewer` box that takes the column height minus the transport (`grid-template-rows:
  minmax(0,1fr) 56px 32px`).
- `#empty` (two cards side by side: "Drop video (mp4)" / "Drop audio (wav or mp3)", each with a
  Browse `<button>` that clicks the hidden `<input type="file">` (ids kept; inputs styled
  `position:absolute; width:1px; height:1px; opacity:0` — **not** `display:none`, Playwright's
  `setInputFiles` and Chrome's picker both work on that), a one-line hint "expected for the
  current preset: `<cfg.video_name>`", and a ✓ once loaded). Shown when `!video.src`;
  the audio card stays visible until audio is loaded (JS: toggle `hidden=""`).

## 5. Visual system (dark only)

Tokens on `:root` (from the research; every text pairing ≥ 4.5:1 except dim-on-control, which
is not used):
```
--bg:#15171a; --panel:#1d2024; --raised:#262a30; --ctrl:#2d3239; --well:#101215;
--text:#e6e8eb; --muted:#9aa3ad; --dim:#8a939d; --border:#7b8794; --hair:#2f353c;
--accent:#4db3d6; --accent-ink:#06141a; --t2:#8fa2ff; --play:#ff5a4d; --mark:#f2b84b;
--onset:#ffd166; --ok:#5cc98a; --err:#ff8a8a; --err-bg:#2f1b1d; --warn:#f2b84b; --warn-bg:#2b2413;
--focus:#7cc4ff;
--ui: system-ui, "Segoe UI Variable", "Segoe UI", Roboto, sans-serif;
--mono: ui-monospace, "Cascadia Mono", Consolas, monospace;
```
`:root { color-scheme: dark }`. Type: 13 px UI base, 12 px secondary, mono with
`font-variant-numeric: tabular-nums` for every number; big TC 28 px mono `--text`, beside it
`3.800 s` and `f 114 / 789` at 13 px `--muted`. Buttons: 32 px square icon buttons
(`background:var(--ctrl); border:1px solid var(--hair); border-radius:6px; color:var(--text)`),
hover `--raised`, active `translateY(1px)` + `--well`, focus-visible `outline:2px solid
var(--focus); outline-offset:2px`, disabled `opacity:.4; cursor:default`. Play button 40 px
round, accent fill, `--accent-ink` glyph; while playing it shows the pause glyph and an accent
ring (`box-shadow:0 0 0 3px rgba(77,179,214,.35)`). Primary "Save copy": accent fill when the
badge shows changes, `--ctrl` when clean. Nudge group: six 36 px buttons in two `role="group"`
halves with a 6 px gap between the halves. Inputs: `--well` background, `--hair` border,
`--text`; `input[type=number]` mono. Cards (`.prow` in `#placements`): `--panel` background,
`1px solid var(--hair)`, `border-radius:8px`, `padding:8px 10px`; `.prow.sel` gets
`border-color:var(--accent)` and a 3 px accent bar on the left (`box-shadow: inset 3px 0 0
var(--accent)`); the T2 card (any placement whose note contains "do not nudge") gets a small
muted "derived" chip (`<span class="chip">`, added in `renderPlacements`). Marker rows and
the onset table: compact 12 px mono rows, `--hair` row separators, no cell borders; the
`.attack` row `--warn-bg` background, `--warn` text. Status bar: 12 px mono; message
severity: `.info` `--muted`, `.warn` `--warn` on `--warn-bg`, `.err` `--err` on `--err-bg`,
each preceded by an inline-SVG icon (16 px) — never colour alone. Icons: inline SVG
`viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"`, 18 px, simple filled shapes
(skip-back, step-back, play, pause, step-fwd, skip-fwd, stop square, question mark, warning
triangle, error circle, info circle, check). Every icon-only button has `aria-label` and
`title` with the shortcut, e.g. `title="Step back 1 frame (Left)"`.
`@media (prefers-reduced-motion: reduce) { * { transition:none !important } }`.

**Canvas (`drawWave`) colours come from the tokens**, read once into an object at app start
and again on `resize`: `const TH = () => { const s = getComputedStyle(document.documentElement); const v = n => s.getPropertyValue(n).trim(); return { well:v('--well'), hair:v('--hair'), text:v('--muted'), t1:v('--accent'), t2:v('--t2'), play:v('--play'), mark:v('--mark'), onset:v('--onset'), ruler:v('--panel') }; }`.
Height: `H = Math.round(canvas.clientHeight * dpr)` (CSS gives the canvas `height:100%` of
the dock body; remove the hard-coded 160). Drawing, top to bottom:
- **Ruler** (22 px, `ruler` fill): ticks from a step chosen so labels are ≥ 60 px apart —
  candidates `[1/F, 5/F, 10/F, 0.5, 1, 2, 5, 10, 30]` s; major tick + label every step, minor
  at step/5 when the step is ≥ 0.5 s; labels mono 10 px, right of the tick, format `M:SS`
  (+ `:FF` when the step is below 0.5 s — computed from `frameOf` so it matches the readout).
  When zoomed, keep the existing per-frame vertical gridlines (`--hair`) in the lanes.
- **Lanes**: `n = cfg.placements.length` lanes share `H − 22 − 18`. In each lane draw a
  rounded region from `X(p.at)` to `X(p.at + S.buf.duration)` (clipped) filled with the lane
  colour at 12 % alpha, a 1 px outline at 60 % (100 % + 1.5 px for the selected placement), a
  label pill `p.label` at the region's top-left (lane colour background, `--accent-ink` text),
  the zero line (`--hair`) and the envelope as **filled** min/max bars (the existing `pb`
  loop, `fillRect(x, top, 1, bot-top)` in the lane colour; unselected lanes at 55 % alpha).
  Lane colour: index 0 `t1`, others `t2`. Empty audio: lane text "Load audio to see the
  waveform" in `--muted`.
- **Onset lane** (18 px): ticks in `onset`, the first one 14 px tall and labelled "attack",
  the rest 8 px; one row per placement offset by 4 px as today.
- **Markers**: dashed vertical line (`--mark`, 40 % alpha) full height, a 6 px flag in the
  ruler, the label in the ruler/top-lane area on three staggered rows (`(idx % 3) * 12`)
  with a `well`-coloured backing rect behind the text so labels stay legible; truncate a
  label to 18 chars + "…" when the next marker is closer than its width.
- **Playhead**: 1.5 px `play` line full height with a small downward triangle in the ruler.
- Start/end time labels stay (bottom corners, `--muted`).
Keep the per-frame cost low: no new per-frame allocations beyond today's; the ruler tick
loop is O(visible ticks).

## 6. JS edits in `<script id="av-app">` — the complete list (anything not listed stays as is)

1. `refresh()`: `$("time")` becomes a container with three spans created **in markup**
   (`<span id="tc"></span><span id="tsec"></span><span id="tframe"></span>`); write
   `tc.textContent = fmtTC(f)`, `tsec.textContent = C.fmtSeconds(t) + " s"`,
   `tframe.textContent = "frame " + f + " / " + tot` — so `$("time").textContent` still
   contains the old string's parts (§8.4 reads them). `fmtTC(f)`: `F = fps(); ff = f % F;
   s = Math.floor(f / F); HH:MM:SS = pad2(s/3600|0):pad2((s/60|0)%60):pad2(s%60)`, then
   `":" + pad2(ff)` (frames field 00–29 at 30 fps; at fps > 99 use three digits). Timecode is
   frame-based, so it is exact by construction and cannot disagree with the frame readout.
2. `#shown-frame`: same text as today, but when the mismatch branch fires add class `warn`
   (amber chip), else remove it.
3. `setStatus()`: writes the info parts into `#status` as today **and** sets `#status`'s class
   from `S.level` (`""`, `"warn"`, `"err"`); every place that sets `S.msg` to a failure string
   ("… failed …", "clipboard unavailable …", "config replaced …") also sets `S.level`
   (`"err"` for failed/unavailable, `"warn"` for "config replaced"); successes set `""`. The
   error/warn message is additionally mirrored into `#banner` (a div under the topbar,
   `hidden=""` when `S.level` is `""`), with the same text.
4. `renderPlacements()`: build the row as `<label class="prow">` (so clicking anywhere selects
   the hidden radio), add `sel` class when `i === sel`, render `at` as a large mono value
   (`3.8000 s` in 16 px) with the frames span beside it, keep the inputs (label, at, gain,
   note) and the Remove button; add the "derived" chip when `/do not nudge/i.test(p.note)`.
   The six nudge buttons and `#add-placement` are static markup directly under the list (as
   today, restyled). Show the last nudge as text in `#nudge-last` (a new span): set in
   `bump`/`bumpFrames` to e.g. `"-1 f = -33.3 ms"` / `"+10 ms"`.
5. Dirty badge: `function diffShipped()` compares `cfg` with `SHIPPED` on `scene, fps,
   video_name, audio_name, nudge_target`, placements matched by label (`at`, `gain`, `note`)
   and markers by index (`label`, `t`), returning an array of `{path, from, to}`; `changed()`
   calls it and writes `#dirty` (`"● N change(s)"`, `hidden=""` when 0) and toggles
   `#save-copy`'s `primary` class. Clicking `#dirty` toggles `#diffpop` (a `<div>` listing
   each entry in mono, `T1 at 3.8000 → 3.7667 s (−1 f, −33.3 ms)` for `at` changes — the
   frame delta from `Math.round((to−from)*fps())`). After a successful save `S.msg =
   "saved <name> (Downloads folder)"` as today, `S.level = ""`, and `#status` also gets class
   `ok` for that message (green).
6. Tabs: `document.querySelectorAll("#tabs button")` → on click set `aria-selected`, toggle
   `hidden` on the three panels `#tab-markers`, `#tab-onsets`, `#tab-config`. Four lines.
7. Empty state: in `loadVideo` (after `video.src = …`) and in `loadAudio` (after decode) set
   `hidden` on `#empty-video` / `#empty-audio`; `#empty` itself hides when both are loaded.
   Browse buttons: `$("browse-video").onclick = () => $("video-file").click()` (same for audio).
8. Keys (same guard): `Home` → `stepTo(0)`, `End` → `stepTo(Math.max(0,total()-1))`, `?` (i.e.
   `e.key === "?"`) → open `#help` (`showModal()`), `Escape` → close it if open. `#help` is a
   `<dialog>` with the "will / will not" text moved from the old `<details>`, the shortcut
   table (Left/Right, Shift+Left/Right, Space, `,`/`.`, Home/End, `?`, Esc) and the "accuracy"
   paragraph; opened also by `#help-btn`; `<dialog>` handles focus and Esc natively.
9. `#step-first` → `stepTo(0)`, `#step-last` → `stepTo(Math.max(0,total()-1))`.
10. `drawWave()` as §5 (colours from `TH()`, height from `clientHeight`, ruler, lanes, filled
    envelope, marker backing, playhead triangle). `viewRange()`, `X()`, cache key, click-to-seek
    unchanged. Add `new ResizeObserver(() => { S.cache = null; drawWave(); }).observe(canvas.parentElement)`.
11. Nothing else: audio engine (`ensureCtx`, `startPlacement`, `tick`, `onFrame`, `loop`,
    `scrubPlay`), `stepTo`, `loadVideo`/`readFile`/`loadAudio` logic, `computeOnsets`,
    `renderMarkers` (restyle via CSS only), `renderOnsets`, `renderPresetOptions`, preset
    handler, save/copy handlers keep their code.

## 7. The ride preset line (coordinate with items A and C)

In the config block, line 41 `  "video_name": "ride_v2_silent.mp4",` → `  "video_name": "ride_v1.mp4",`
(the silent-studio ride composition, `marketing/silent-studio/all-renders/ride_v1.mp4`, built by
item A §A2; the clock is identical — start-ride 0–14.0, gates-saving 14.0–26.3 — and the
browser only ever sees a file *name*, so the page works the same whichever of the two files
Nathan picks). This is the only change inside the delimiters; `serializeConfig(parseConfig)`
stays byte-exact because the format is untouched. If item A has not run yet, the name points
at a file that does not exist *yet* — say so in the report; nothing in the page depends on it.
README (`tools/av-align/README.md`) line 48's video cell → `marketing/silent-studio/all-renders/ride_v1.mp4` (cycle 17; `marketing/audio-studio/ride/soundv2/ride_v2_silent.mp4` is the same clock on the older gates-saving_v8 picture)`
— item A §4.5 makes the same edit; whichever runs second finds it done (`grep -c ride_v1 README.md` → ≥1) and leaves it.

## 8. Verification (executor — in the container unless stated; numbers and pictures, not adjectives)

Setup: `mkdir -p $SCRATCH/avui && cd $SCRATCH/avui` (the scratchpad), stage the current file
from Nathan's PC (`device_stage_files`) and keep a pristine copy `orig.html`; edit `av-align.html`
here. Test media (make them here; 30 fps so frame maths is the real thing):
```bash
ffmpeg -y -v error -f lavfi -i "testsrc2=size=640x360:rate=30:duration=2" -c:v libvpx-vp9 -b:v 300k test30.webm     # 60 frames
python3 - <<'EOF'
import numpy as np, wave
sr=44100; t=np.arange(int(sr*2.0))/sr; x=np.zeros_like(t)
for c in (0.5,1.0,1.5): i=int(c*sr); x[i:i+int(0.02*sr)]+=np.hanning(int(0.02*sr))*0.8*np.sign(np.sin(2*np.pi*1000*t[i:i+int(0.02*sr)]))
w=wave.open("clicks.wav","wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((x*32767).astype(np.int16).tobytes()); w.close()
EOF
```
(Chromium decodes VP9 webm; the shipped `accept="video/mp4"` does not block `setInputFiles`.)

### 8.1 Static + unit
```bash
cp <repo>/marketing/audio-studio/tools/av-align/av-align.test.mjs . && node av-align.test.mjs     # 36/36 passed, ALL PASS, exit 0 — paste it
wc -c av-align.html                                    # < 122880
grep -c $'\r' av-align.html; head -c 3 av-align.html | xxd | head -1   # 0; not efbbbf
grep -n "https\?://\|<link\|<script[^>]*src=\|xmlns" av-align.html      # no output
grep -c "AV-ALIGN CONFIG BEGIN" av-align.html; grep -c "AV-ALIGN CONFIG END" av-align.html   # 1, 1
node -e 'const h=require("fs").readFileSync("av-align.html","utf8");for(const m of h.matchAll(/<script id="([^"]+)">([\s\S]*?)<\/script>/g)){new Function(m[2]);console.log("ok",m[1])}'   # ok av-config, ok av-core, ok av-app (in that order; av-app last in the file)
diff <(sed -n '/<script id="av-core">/,/<\/script>/p' orig.html) <(sed -n '/<script id="av-core">/,/<\/script>/p' av-align.html)   # empty
diff <(sed -n '/CONFIG BEGIN/,/CONFIG END/p' orig.html) <(sed -n '/CONFIG BEGIN/,/CONFIG END/p' av-align.html)   # exactly the one video_name line
for id in video-file audio-file preset fps goto-time goto-frame scrub loop-frame zoom onset-floor onset-jump status time shown-frame onset-floor-v onset-jump-v onset-msg placements markers onset-table config-out drop video wave step-back10 step-back play step-fwd step-fwd10 stop n-1f- n-100- n-10- n-10p n-100p n-1fp add-placement add-marker save-copy copy-config; do printf "%s %s\n" $id $(grep -o "id=\"$id\"" av-align.html | wc -l); done   # every line ends in 1
```

### 8.2 Serialisation round-trip (Playwright, headless Chromium — the Save-copy contract)
Script `rt.py`: launch Chromium (`executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`,
args `['--autoplay-policy=no-user-gesture-required']`), `page.goto('file://…/av-align.html')`,
collect console errors (must be none), then `s = page.evaluate('"<!DOCTYPE html>\\n" + document.documentElement.outerHTML')`
**before any file is loaded** and compare to the file text: **must be byte-identical**. If not:
write `s` over `av-align.html` once (the normalise step), re-run 8.1, and re-run this check —
it must now pass; say in the report that normalisation was needed and what differed (`diff`).
Then: load `test30.webm` + `clicks.wav` via `set_input_files`, wait 1500 ms, click `#save-copy`
with `page.expect_download()`, save the download, `diff orig-of-this-run av-align.html` →
**empty** (nothing changed → identical file). Press `,` once (T1 −1 f), save again, diff →
**exactly one changed line**: `-  … "at": 3.8000, …` / `+  … "at": 3.7667, …` for T1. Paste
both diffs.

### 8.3 Screenshots (Playwright; then LOOK at each with the Read tool and describe it in the report in one line each)
Viewports 1440×900, 1920×1080, 1100×800. For each: (a) `empty_<w>.png` — nothing loaded:
topbar, two drop cards in the viewer, big TC `00:00:00:00`, inspector showing the shipped
placements, dock with "Load audio to see the waveform", status "load a video and an audio
file"; (b) load both files, press ArrowRight ×20 → `ride_<w>.png`: video visible with the
testsrc frame, TC `00:00:00:20`, `0.667 s`, `frame 20 / 60`, T1/T2 lanes with the three
clicks visible in each lane at different x (offset 3.8 s vs 16.54 s → with a 2 s file the T1
lane shows clicks at 4.3/4.8/5.3 s and T2 at 17.04/17.54/18.04 on the ruler), 14 marker flags
with staggered labels, red playhead near the left; (c) select preset "opening" (`select_option('#preset','0')`)
→ `opening_<w>.png`: one lane (T0), 7 markers, the amber "config replaced …" banner and
status; (d) back on the ride preset (reload + load files + 20 frames), press `.` twice and
click `#n-100p` → `dirty_<w>.png`: badge "● 1 change", Save copy in accent, `#nudge-last`
"+100 ms", T1 card `3.9667 s`; then click `#dirty` → `diffpop_<w>.png` showing
`T1 at 3.8000 → 3.9667 s (+5 f, +166.7 ms)`; (e) press `?` → `help_<w>.png` (the dialog
over a dimmed page; Esc closes it — assert `page.evaluate('!document.getElementById("help").open')`
after Escape). At 1100×800 assert `document.documentElement.scrollWidth <= 1100` (no
horizontal scroll) and that `#n-1fp` and `#wave` are both in the DOM with non-zero
`getBoundingClientRect()` sizes. At 1440×900 and 1920×1080 assert the page does **not** scroll
(`scrollHeight <= innerHeight`) and that `#video`, `#wave` and `#n-1fp` are all inside the
viewport (`rect.bottom <= innerHeight`, `rect.top >= 0`).
Also `contrast.py`: recompute the WCAG ratio of `--text`, `--muted` on `--bg`, `--panel`,
`--ctrl` and of `--accent-ink` on `--accent` from the tokens actually in the file (regex the
`:root` block) — each ≥ 4.5 — and print them.

### 8.4 Behaviour under Playwright (the parts the unit tests cannot see)
- **All 60 frames**: from frame 0 press ArrowRight 59 times; after each press read
  `$("time").textContent` and `S`-independent DOM: assert it contains `"frame " + n + " / 60"`
  and `fmtTC` shows `00:00:0` + `pad2(n//30)` + `:` + `pad2(n%30)`; and read
  `video.currentTime` → `abs(currentTime − (n+0.5)/30) < 0.002`. Then ArrowLeft 59 times back
  to 0. Shift+ArrowRight ×3 → frame 30; End → 59; Home → 0. (This is cycle 16's frame check,
  extended to the TC.)
- Space starts playback: after 400 ms `S.playing` is not readable from outside — assert
  instead that `#play`'s `aria-label` switched to "Pause" and the status shows `resyncs:`;
  Space again pauses; `#stop` pauses.
- `#goto-frame` = 45 + Enter/change → frame 45; `#goto-time` = 1.0 → frame 30.
- Scrub checkbox and loop checkbox toggle (state read back); `#zoom` = `zoom` redraws (no
  console error; canvas `width` unchanged, screenshot `zoom_1440.png` shows per-frame gridlines).
- Onsets: with clicks.wav loaded the table has 3 data rows, first row has class `attack`,
  `#onset-msg` "3 onset(s) found. The first one is the attack."; the T1 "go" button of row 1
  is **enabled** (the code's rule is `go.disabled = tv < 0 || !video.src`, line 669 today —
  keep it) and clicking it asks for `frameOf(0.5 + 3.8, 30)` = frame 129, which `stepTo`
  clamps to the last frame, 59 — assert frame 59; with the opening preset (T0 = 0) the row-1
  go button seeks to frame 15.
- Markers: `#add-marker` at frame 20 adds a row `t 0.6833`, `f 20`; its Go seeks there; Remove
  removes it; the badge counts it.
- Add placement duplicates the selected one as `P3`; Remove disabled state correct with one
  placement (opening preset).
- Copy config: `navigator.clipboard` is unavailable headless → the fallback selects the
  textarea and the status says "clipboard unavailable: text selected, press Ctrl+C" in `err`
  style.
- No console errors or warnings across all of the above (collect with `page.on("console")`
  and `page.on("pageerror")`; paste the count, must be 0).

### 8.5 Write-back and re-check on Nathan's PC
`device_commit_files` the edited `av-align.html` and `README.md` to
`C:\Users\natha\Claude personal projects\Qualifire\marketing\audio-studio\tools\av-align\`
(the mount path `~/mnt/Qualifire/marketing/audio-studio/tools/av-align/`). Then on the PC
(`device_bash`): `cd $HOME/mnt/Qualifire/marketing/audio-studio/tools/av-align && node av-align.test.mjs`
(36/36), `md5sum av-align.html` equal to the container's, `grep -c $'\r' av-align.html` → 0,
`GIT_OPTIONAL_LOCKS=0 git -C $HOME/mnt/Qualifire status --short marketing/audio-studio/tools`
→ modified `av-align.html`, `README.md`; nothing else. Do not commit.

## 9. README edits (`tools/av-align/README.md`, 79 lines)

Add a dated section `## The page since cycle 17 (2026-09-23)` after the intro: one paragraph
on the layout (viewer / inspector / timeline dock / status bar), the `?` overlay, the dirty
badge ("● N changes" = what Save copy will carry; clean = the saved copy equals this file),
dark only, and that nothing about the numbers changed; the shortcut list incl. Home/End/`?`.
The §7 line-48 edit. Keep the rest (accuracy, LF rule, how the coordinator reads a copy) as it
is.

## 10. Report format

Tier readout; §8.1 outputs verbatim; the §8.2 diffs (both) and whether normalisation was
needed; one line per screenshot (what you saw with the Read tool, honestly — a misaligned
panel is reported, not smoothed over); the §8.3 assertions and contrast numbers; the §8.4
counts (frames checked, console errors = 0, the actual onset-go disable rule); §8.5 outputs;
`wc -c`; one sentence per stop trigger. State that real-time audio sync and scrub *sound* were
not judged (headless) — Nathan's first use is that check.

## 11. For Inspect (fresh Opus)

Rerun §8.1, §8.2 and §8.4 from the file on Nathan's PC (stage it fresh — not the executor's
copy). Take your own screenshots at the three sizes for states (a), (b), (d), (e) and look at
them; check specifically: TC and frame agree on frame 20 and frame 59; the T1 and T2 lanes
show the same three clicks 12.74 s apart on the ruler; marker labels do not overlap; the nudge
buttons, the waveform and the video are simultaneously visible at 1440×900; nothing overflows
at 1100 px; the dirty badge is absent on a clean page and present after `,`; `Save copy` on a
clean page yields a byte-identical file. Diff `av-core` against `git show HEAD:…` (must be
empty) and the config block (one line). Confirm no `xmlns`, no `http`, LF, < 120 KB.
