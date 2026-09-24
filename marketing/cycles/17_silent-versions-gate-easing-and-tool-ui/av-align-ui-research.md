# av-align UI research and recommended design

Target: `marketing/audio-studio/tools/av-align/av-align.html` on Nathan's PC (`C:\Users\natha\Claude personal projects\Qualifire\marketing\audio-studio\tools\av-align\`). Single offline HTML file, no CDN, no build step, double-click in Chrome/Edge on Windows over file://.
Nathan's brief: "improve the UI of the alignment tool to make it more professional and user friendly. Have a look at how current tools look like and let's copy a working design."

Nothing in the repo was edited by this research. A staged copy of the file is at `/mnt/user-data/uploads/Qualifire/marketing/audio-studio/tools/av-align/av-align.html` (40,766 bytes, 793 lines; the brief said 774).

## Screenshots (absolute paths)

Taken with Playwright Chromium (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`) from a synthetic 6 s 30 fps testsrc webm plus a wav with 3 clicks (1.0 s, 2.5 s, 4.25 s), loaded via `setInputFiles`, then 20 presses of ArrowRight (frame 20).

- `/tmp/claude-0/-home-claude/b47f5923-7096-57a8-bae0-7a37a7dedcaf/scratchpad/shots/empty_1440.png` (nothing loaded, 1440x900 viewport)
- `/tmp/claude-0/-home-claude/b47f5923-7096-57a8-bae0-7a37a7dedcaf/scratchpad/shots/empty_1440_full.png`
- `/tmp/claude-0/-home-claude/b47f5923-7096-57a8-bae0-7a37a7dedcaf/scratchpad/shots/empty_1920.png`
- `/tmp/claude-0/-home-claude/b47f5923-7096-57a8-bae0-7a37a7dedcaf/scratchpad/shots/empty_1920_full.png`
- `/tmp/claude-0/-home-claude/b47f5923-7096-57a8-bae0-7a37a7dedcaf/scratchpad/shots/default_1440.png` (files loaded, viewport, 1440x900)
- `/tmp/claude-0/-home-claude/b47f5923-7096-57a8-bae0-7a37a7dedcaf/scratchpad/shots/default_1440_full.png` (full page, 1440x2990)
- `/tmp/claude-0/-home-claude/b47f5923-7096-57a8-bae0-7a37a7dedcaf/scratchpad/shots/default_1920.png` (viewport, 1920x1080)
- `/tmp/claude-0/-home-claude/b47f5923-7096-57a8-bae0-7a37a7dedcaf/scratchpad/shots/default_1920_full.png`
- `/tmp/claude-0/-home-claude/b47f5923-7096-57a8-bae0-7a37a7dedcaf/scratchpad/shots/preset_1440.png` (preset "opening" selected, full page)
- `/tmp/claude-0/-home-claude/b47f5923-7096-57a8-bae0-7a37a7dedcaf/scratchpad/shots/preset_1920.png`
- `/tmp/claude-0/-home-claude/b47f5923-7096-57a8-bae0-7a37a7dedcaf/scratchpad/shots/dark_1440_full.png` (prefers-color-scheme: dark, full page)
- `/tmp/claude-0/-home-claude/b47f5923-7096-57a8-bae0-7a37a7dedcaf/scratchpad/shots/light_1100.png` (1100 px wide window, full page)

Test media: `/tmp/claude-0/-home-claude/b47f5923-7096-57a8-bae0-7a37a7dedcaf/scratchpad/test.webm`, `/tmp/claude-0/-home-claude/b47f5923-7096-57a8-bae0-7a37a7dedcaf/scratchpad/clicks.wav`. Script: `/tmp/claude-0/-home-claude/b47f5923-7096-57a8-bae0-7a37a7dedcaf/scratchpad/shoot.py`.

---

## (a) Current-UI audit

### Layout (top to bottom, one column, `max-width: 1000px`, centred)

Full page is 2990 px tall at 1440 wide (2681 px with the 7-row opening preset). Order:

1. `h1` "av-align: audio to video alignment" (20 px).
2. `<details id="about" open>` "What this tool will and will not do": about 620 px of bullet prose, open by default.
3. `#status`: 12 px mono strip, light blue, joins video info, audio info, resync counter and messages with " | ".
4. `#drop`: dashed drop strip, one line of text.
5. Row of native `<input type=file>` for Video and Audio, `#preset` select, `#fps` number input.
6. `<video id="video">` (max 960 px wide, black background).
7. `#transport` row: buttons `-10f`, `-1f`, "Play / pause", `+1f`, `+10f`, "Stop", then `#time` (15 px bold mono: `0.667 s · frame 20 / 180`) and `#shown-frame` (12 px grey mono).
8. Row: "Go to time (s)", "Go to frame", checkbox "play this frame's audio when stepping" (`#scrub`, checked), checkbox "repeat the frame's audio 3x" (`#loop-frame`).
9. h2 "Waveform (video clock)", zoom select (`all` / `+/- 2 s around the playhead`), `<canvas id="wave">` (100% wide, 160 px tall, white).
10. h2 "Placements": one `.prow` per placement (radio "nudge this one", label input, `at (s)` number, `NNN.NN f` text, gain number, note text input, Remove button), then a separate `#nudges` row of buttons: `-1f`, `-100 ms`, `-10 ms`, `+10 ms`, `+100 ms`, `+1f`, "Add placement".
11. h2 "Markers": one `.prow` per marker (label input, `t (s)` number, `f N`, Go, Remove), 14 rows for ride, 7 for opening; "Add marker at playhead".
12. h2 "Detected attacks (onsets)": sliders Floor (-60..-20 dBFS) and Jump (3..12 dB), `#onset-msg`, `#onset-table` (audio t, dB, and one "video t / frame (Tn)" column per placement with a "go" button per cell; first row highlighted `.attack`).
13. h2 "Config (what Save copy writes)": `<textarea id="config-out" readonly>` 14 em tall, "Save copy" and "Copy config" buttons.
14. Footer sentence.

### States present today

- Nothing loaded: status reads "load a video and an audio file"; `wave` draws only a grey zero line; buttons are enabled but inert; onset message "Load an audio file to detect attacks."
- Files loaded: status shows `video NAME: WxH, D s = N frames at F fps | audio NAME: SR Hz, C ch, D s, peak X dBFS`.
- Preset change: config replaced, status appends "config replaced from 'opening' (earlier edits discarded); load opening_v3.mp4 and ...". This warning is only shown in the tiny status strip.
- Playing: status adds "resyncs: N"; `#shown-frame` compares the frame on screen with the clock ("shown: n, clock says m").
- No `requestVideoFrameCallback`: "no requestVideoFrameCallback: coarser clock" and "shown frame: n/a".
- Errors: "video failed to load (codec not supported?)", "audio load failed: ...", "play failed: ...", "Save copy failed: ...", "clipboard unavailable: text selected, press Ctrl+C". All go to the status strip.
- Save copy success: "saved av-align.<scene>.<YYYYMMDD-HHMM>.html (Downloads folder)".
- Drag over: `#drop.over` (blue border, light blue fill).

### CSS approach

- One inline `<style>` of about 40 lines in `<head>`. No external URLs, no `<link>`.
- `body`: `14px/1.45 system-ui, "Segoe UI", sans-serif`, `#1b1b1b` on `#fafafa`; mono elements use `ui-monospace, Consolas, monospace`.
- Native buttons, inputs and selects with a thin border.
- Light/dark: `:root { color-scheme: light }` plus one `@media (prefers-color-scheme: dark)` block that patches `body`, `details`, `#status`, `button`, `th/td`, `tr.attack td`, `canvas` border. It does not touch the canvas fill.
- The waveform is drawn in JS with hard-coded colours: fill `#fff`, grid `#e4e4e4`/`#ddd`, T1 wave `#1a6b8a`, other placements `#86bdd0`, markers `#c4463c` with labels `#a22`, playhead `#d00`, axis text `#555`, onset ticks `#1a6b8a`/`#5aa3bd`. Canvas height fixed at 160 CSS px (`H = Math.round(160 * dpr)`).

### What looks amateur (honest read of the screenshots)

- The video is below the fold: at 1440x900 and 1920x1080 only about 100 px of the video is visible after the prose block, status, drop strip and pickers. Waveform, nudge buttons and video are never visible together, so you cannot nudge and watch the result in the same view.
- About 620 px of open explanatory prose pushes everything down; it is documentation, not interface.
- Default browser controls throughout: grey rounded buttons, native "Choose File" widgets with "No file chosen", text-only "Play / pause" and "Stop" with no icons, no visual hierarchy between primary and secondary actions.
- Timecode is a 15 px bold line, not a large readout; time in seconds and frame are fused in one string; no HH:MM:SS:FF.
- The nudge buttons sit under the placement rows, disconnected from the waveform. The radio labelled "nudge this one" on every row is unclear; the selected placement is not visually emphasised beyond the radio.
- The waveform is a small white slab (also in dark mode, where it glares), the trace is thin, marker labels overlap each other ("START click / START box fade begins / camera push-in begins" stack on top of one another), there is no time ruler, the playhead is a hairline, placements have no region shape.
- Markers are 14 full-width rows of inputs, taking about 400 px of scroll.
- Config is an unlabelled textarea; there is no view of "what changed versus the shipped file", so the user cannot see whether Save copy will carry anything.
- Status line is a 12 px mono strip that carries both info and errors; errors and warnings look identical to info.
- Empty state is a dashed line of text plus native pickers.
- Dark mode is a patch: white canvas, low-contrast dashed drop text (`#555` on dark), default form controls.
- At 1100 px wide nothing changes (`light_1100.png`): same single column, same length.

---

## (b) Reference table

Research caveat: WebFetch returns model-summarised pages. Several were thin: Blender's manual gave only a table of contents; Adobe's default-shortcuts page gave navigation only; Audacity manual pages `audacity_screenshot.html` and `audacity_interface.html` returned 404; `soundlatencytest.com` was blocked (robots.txt timeout); Descript's "editor interface" page timed out; Reaper's theme page did not describe the default layout; the Frame.io player page and the jordicenzano frame-accurate player page did not describe UI layout. Nothing was bypassed. Colours in section (c) are my own synthesis of dark-suite conventions, not measured from screenshots of these tools.

| Tool | What to copy | Source |
|---|---|---|
| DaVinci Resolve (Edit page) | Layout: Viewer top centre, Inspector top right, timeline full width underneath, Index panel. Viewer transport is a compact five-button row (Jump to first frame, Play reverse, Stop, Play forward, Jump to last frame). Timecode sits top right of the viewer and can be switched between timecode / frame / keykode by right-click. Jog bar under the viewer. Timeline ruler shows program timecode; zoom menu has "Fit" or percentages. Comma and period nudge a selection left/right. | https://ltbits.github.io/davinci-resolve-manuals/DR12/DR12-RM-13.pdf ; https://cursa.app/en/page/davinci-resolve-edit-page-essentials-interface-navigation-and-playback-control |
| DaVinci Resolve (Fairlight) | "Sync scrollers": a scrolling filmstrip and audio waveforms at the bottom of the screen "so you can perfectly align" audio to picture; double-click a frame in the filmstrip to move the playhead. Clip and waveform editing in one view; zoom from overview down to samples; index panel for markers. Page supports many tracks. | https://www.blackmagicdesign.com/products/davinciresolve/fairlight ; https://www.steakunderwater.com/VFXPedia/__man/Resolve18-6/DaVinciResolve18_Manual_files/part3470.htm |
| Adobe Premiere Pro | Keys: J reverse, K stop, L play; Left/Right arrow one frame; Shift+arrow 5 frames; Up/Down previous/next edit point; `/` toggles zoom; numpad timecode typing ("3" = 3 frames, "3." = 3 seconds); Alt+arrow nudges a selected clip one frame. | https://www.premiumbeat.com/blog/premiere-pro-interface-and-navigation-shortcuts/ ; https://blog.frame.io/2021/10/18/edit-faster-premiere-pro-keyboard-shortcuts/ |
| Kdenlive | Ruler in hh:mm:ss:ff (or frames). Monitor has a typeable timecode field (type, Enter, playhead jumps), frame-step buttons and Left/Right keys, position caret. I/O set a zone shown as a coloured bar on the timeline and under the monitor. Monitor info overlay shows timecode, fps and markers, toggled by right-click. "Fixed centered playhead" option. Ruler zone colours (red/yellow/green). Audio waveform can be normalised to -3 dB. Track header has lock/mute/hide icons. | https://docs.kdenlive.org/en/user_interface/monitors/project_monitor.html ; https://docs.kdenlive.org/en/user_interface/timeline.html ; https://docs.kdenlive.org/en/user_interface/monitors.html |
| Frame.io player | Shortcuts: Space play/pause; J/K/L with 1x, 2x, 4x, 8x stepping; Left/Right skip one frame; Shift+Left/Right skip 10 frames (the same +/-1, +/-10 as av-align); C comment; I/O range in/out; D clip info; R loop range; F fullscreen; Shift+drag precision scrubbing. Playback-rate menu (0.25x to 1.75x), gear icon bottom right. | https://help.frame.io/en/articles/7785-keyboard-shortcuts-legacy ; https://help.frame.io/en/articles/9105311-player-page-features |
| wavesurfer.js | Plugins: Regions (visual overlays with drag/resize), Timeline (notches and time labels), Minimap (small overview as scrollbar), Hover (vertical line with timestamp), Envelope, Spectrogram, Record. Style options: waveColor, progressColor, cursorColor, barWidth, height; `::part()` CSS hooks. | https://github.com/katspaugh/wavesurfer.js |
| Waveform Playlist | Multi-track canvas waveforms, clips with move/trim/split, timeline ruler, playhead with 60 fps updates, zoom via samplesPerPixel, annotations with keyboard navigation, full dark/light theming, frozen ruler while lanes scroll. | https://github.com/naomiaro/waveform-playlist |
| peaks.js (BBC) | Two waveform views: zoomview (scrollable detail) and overview (whole file); point markers and segment markers; configurable playhead colour, axis label colour, waveform colours; keyboard nudge of markers. | https://github.com/bbc/peaks.js |
| Audacity | Timeline ruler adapts its tick spacing to zoom; playback cursor is a green triangle (pinned mode keeps it centred); optional grey scrub strip under the ruler; Time toolbar is a read-only large display (default double height) with switchable format (hh:mm:ss default). | https://drmukul.github.io/Audacity3.0.0_English_Manual/man/timeline.html ; https://manual.audacityteam.org/man/time_toolbar.html |
| Reaper | Transport docked top and centred; coloured bar on the selected item and active take to distinguish selection at a glance; grid line colours adjustable. | https://reaper.blog/2017/05/6-theme-tweaks/ |
| Descript | Timeline ruler carries timecode, markers, comments and audio levels; "Fit scene" / "Fit composition" zoom buttons top right of the timeline; a collapsed timeline by default. | https://help.descript.com/hc/en-us/articles/10249275208717-Timeline-overview |
| Browser sync/frame-step tools | The A/V sync calibrator (toolkitgen) presents one big "Estimated Delay ~0.00 ms" readout and one primary action button. jordicenzano's frame-accurate player claims SMPTE timecode on every frame and broadcast-editor UX but its docs did not describe the UI. | https://toolkitgen.com/tool/av_sync_flash_tool ; https://jordicenzano.github.io/frame-accurate-scrubbing/ |

Conventions common to all of them: viewer on top, timeline across the bottom, inspector at the side; dark neutral grey UI with one saturated accent and a red/orange playhead; mono, tabular timecode; hh:mm:ss:ff; arrows step one frame, Shift+arrow steps a larger amount; a typeable timecode field; a ruler whose ticks adapt to zoom; a whole-file overview strip above the zoomed view.

---

## (c) Recommended design: "Resolve Edit-page layout with a Fairlight-style sync strip"

### Wireframe (1440x900)

```
+------------------------------------------------------------------------------------------+
| av-align  [ride v] fps[30]  video: ride_v2_silent.mp4  audio: tunetank-...mp3   ● 1 change  [Save copy]  [?] |  44 px
+---------------------------------------------------------------+--------------------------+
|                                                               | INSPECTOR       360 px   |
|                VIDEO  (16:9, letterboxed on #000)             | PLACEMENTS               |
|                about 820 x 460                                |  (T1) at 3.8000 s        |
|                                                               |       114.00 f  gain .45 |
|---------------------------------------------------------------|  [-1f][-100][-10]|[+10][+100][+1f] |
| |<  -10f  -1f  [ > ]  +1f  +10f  >|   00:00:03:24            |  ( T2) 16.5400 s ...     |
|                                       3.800 s  f 114 / 789    |  [+ add]                 |
|  [x] play frame audio   [ ] repeat 3x   go: [time] [frame]    | ------------------------ |
|                                                               | Markers | Onsets | Config|
|                                                               |  START click   3.2000 f96|
|                                                               |  ...                     |
+---------------------------------------------------------------+--------------------------+
| ruler |0s        |1s        |2s        |3s   ...   (frame ticks when zoomed)             |  260 px
| overview strip (whole file, draggable window)                                             |  timeline
| T1 [ region tinted blue  ▁▂█▂▁ ]      T2 [ region tinted violet ▁▂█▂▁ ]                    |  dock
| onsets: amber ticks, first = "attack"      markers: flags on the ruler                    |
| playhead: red line full height    zoom [all | ±2 s | frame]   snap frame [x]               |
+------------------------------------------------------------------------------------------+
| video 1280x720 · 180 f @30 · audio 44.1 kHz mono · peak -2.2 dBFS · resyncs 0             |  24 px
+------------------------------------------------------------------------------------------+
```

### Regions and proportions at 1440x900

- Top bar: 44 px. Status bar: 24 px. Timeline dock: 260 px fixed (ruler 24, overview strip 20, one 72 px lane per placement with 2 placements = 144, onset lane 20, zoom/scroll controls about 24, remainder padding).
- Upper area: about 572 px. A 56 px transport strip sits under the viewer, leaving about 516 px; the video letterboxes at 16:9 to about 820x460 with breathing room.
- Columns: `grid-template-columns: minmax(0, 1fr) 360px` (viewer column about 1080 px, inspector 360 px). Layout uses `height: 100vh` grid with `overflow: hidden` on the shell and internal scroll only in the inspector tab body.
- The nudge buttons live in the inspector directly beside the timeline dock, so nudging and watching the waveform and video are visible at once. That is the main functional fix.
- 1920x1080: same grid; inspector grows to 420 px, timeline dock to 300 px.

### Collapse at 1100 px and below

- Single column, page scrolls: top bar (wraps to two rows), viewer (height about 40vh, letterboxed), transport, timeline dock (260 px), then the inspector as a full-width tabbed panel (Placements | Markers | Onsets | Config) under the timeline.
- Placement nudge group stays on one row (six buttons, 44 px touch targets allowed to wrap into 3+3).
- Marker flags on the canvas drop their labels and show them on hover or click; the Markers tab is the list.

### Palette (dark editing suite; contrast computed with the WCAG 2.x relative-luminance formula)

| Role | Hex | Contrast |
|---|---|---|
| App background | `#15171a` | |
| Panel | `#1d2024` | |
| Raised / hover surface | `#262a30` | |
| Control (button/input) | `#2d3239` | |
| Waveform well | `#101215` | |
| Text | `#e6e8eb` | 14.6:1 on app, 13.3:1 on panel, 11.75:1 on raised, 10.5:1 on control, 15.3:1 on wave |
| Muted text | `#9aa3ad` | 7.0:1 on app, 6.4:1 on panel, 5.6:1 on raised, 5.05:1 on control |
| Dim text (labels of at least 14 px bold or 18 px; never on controls) | `#8a939d` | 5.2:1 on panel, 4.1:1 on control |
| Accent / T1 waveform | `#4db3d6` | 6.8:1 on panel, 7.5:1 on app, 7.8:1 on wave |
| T2 waveform | `#8fa2ff` | 6.8:1 on panel, 7.8:1 on wave |
| Playhead | `#ff5a4d` | 5.3:1 on panel, 6.1:1 on wave |
| Marker flags | `#f2b84b` | 9.1:1 on panel, 10.5:1 on wave |
| Onset ticks | `#ffd166` | 11.3:1 on panel, 13.0:1 on wave |
| OK | `#5cc98a` | 7.9:1 on panel |
| Error text | `#ff6b6b` | 5.9:1 on panel; `#ff8a8a` on `#2f1b1d` banner = 7.1:1 |
| Warning text | `#f2b84b` on `#2b2413` banner | 8.6:1 |
| Focus ring (2 px) | `#7cc4ff` | 8.7:1 on panel, 9.6:1 on app |
| Control border | `#7b8794` | 4.5:1 on panel, 4.9:1 on app (meets 3:1 non-text contrast on panel; 3.5:1 on control) |
| Dark label on accent button | `#06141a` | 7.8:1 on `#4db3d6` |

Notes:
- Ratios computed with a script in the scratchpad; every text pairing above meets 4.5:1 except "dim text on control" (4.1:1), which is why dim text is restricted to large text on panels.
- The waveform canvas colours are hard-coded in `drawWave()` and must be replaced by values read from CSS variables (`getComputedStyle(document.documentElement).getPropertyValue("--wave-t1")` etc.) so palette and canvas stay in sync.
- Light theme: optional. Either keep `prefers-color-scheme` and define a second variable set, or go dark-only like every reference tool. Recommendation: dark-only for the editing surface (fewer states to test), with `color-scheme: dark` so native scrollbars and form controls match.

### Fonts (system stacks only)

- UI: `system-ui, "Segoe UI Variable", "Segoe UI", Roboto, sans-serif`, 13 px base, 12 px for secondary labels.
- Numbers and timecodes: `ui-monospace, "Cascadia Mono", Consolas, monospace`, with `font-variant-numeric: tabular-nums` so digits do not jitter while stepping.
- Big readout: 28 px mono `HH:MM:SS:FF` (for 30 fps, frame field 00 to 29) in accent-white, with `3.800 s` and `f 114 / 789` at 13 px mono beside it. Seconds matter because a placement's `at` is in seconds; the frame counter matters because frame n covers [n/fps, (n+1)/fps) and is 0-based.

### Transport bar

- Buttons, left to right: first frame `|<`, `-10f`, `-1f`, Play/Pause (40 px round accent-coloured toggle), `+1f`, `+10f`, last frame `>|`. Stop is merged into Pause (Pause plus `|<` covers it). The other buttons are 32 px square.
- Icons are inline SVG, `viewBox="0 0 24 24"`, `fill="currentColor"`, `aria-hidden="true"`, each button with `aria-label` and `title` including the shortcut (for example "Step back 1 frame (Left)"). No `xmlns` attribute (see risks: the test forbids `http://` anywhere in the file, and inline SVG in HTML does not need it). No icon fonts.
- Next to the transport: a typeable timecode field (like Kdenlive) plus a "Go to frame" field; scrub mode as a switch labelled "Play frame audio when stepping"; "Repeat 3x" as a small toggle.
- Playing state: the Play button shows the pause glyph and gets an accent ring.

### Timecode readouts

- Large mono TC (as above), updated in `refresh()`. `#time` is currently written as one text string; split into child spans (TC, seconds, frame) while keeping the `#time` id on the container.
- `#shown-frame` mismatch ("shown: n, clock says m") becomes a small amber warning chip on the readout, hidden when they agree.

### Timeline and waveform styling

- Ruler (24 px, panel-raised, mono labels): tick step picked from the current zoom span: whole seconds at "all", 0.5 s or 0.1 s at mid zoom, every frame at the +/-2 s zoom with labels every 5 or 10 frames (label as `3:24` or `f114`). Major and minor ticks, labels right of the tick, not centred.
- Overview strip (Peaks.js/Descript/Minimap idea): whole file at 20 px tall with a draggable window showing the current zoom range. Optional but cheap.
- Playhead: 1.5 px `#ff5a4d` line across ruler and lanes, with a small downward flag on the ruler; click or drag on the ruler or lanes seeks (existing click handler).
- Placement lanes: each placement is a rounded rectangle "region" from `at` to `at + audio duration`, tinted 10 to 15% of its lane colour on `#101215`, with the label (T1, T2) as a pill top left of the region. The selected placement has a bright 1.5 px outline and a coloured bar on its left edge (Reaper's coloured selection bar); unselected placements are dimmed to about 60%. Waveform as filled min/max envelope, not hairline strokes; amplitude normalised per file (existing `S.norm`).
- Onset lane: amber ticks 10 px tall; the first onset ("attack") is taller and labelled.
- Marker flags: vertical dashed lines with a flag on the ruler; labels in up to 3 staggered rows, truncated with ellipsis and full text on hover, so they no longer overlap. Colour `#f2b84b`.
- Zoom control: segmented `[all | ±2 s | frame]`; "frame" zoom (about 15 frames across) is an optional addition that makes frame-level nudging visible.
- Optional Fairlight-style sync strip: 9 to 11 video frames around the playhead drawn to a canvas above the waveform, so a click in the audio can be seen against the pictures. Low priority; it needs the video element drawn to canvas and may not be frame-accurate in every browser.

### Inspector panel

- Placements list: one card per placement with the label (pill in the lane colour), large mono `at` value with four decimals and frames (`3.8000 s · 114.00 f`), gain, and note. The selected card is highlighted; clicking a card selects it (replaces the "nudge this one" radio; keep a real `<input type=radio name="nudge">` visually hidden inside if minimal JS change is wanted).
- Nudge group under the selected card: segmented control `[-1f][-100 ms][-10 ms] | [+10 ms][+100 ms][+1f]`, all six ids retained (`n-1f-`, `n-100-`, `n-10-`, `n-10p`, `n-100p`, `n-1fp`). Show the last applied delta next to it (for example "-1 f = -33.3 ms").
- Add placement and Remove go in a small overflow menu on the card header (ids `add-placement` kept; Remove buttons are created per row in JS).
- Tabs below: Markers (compact rows: label, time, frame, Go, x), Onsets (table plus a gear popover holding the Floor and Jump sliders), Config (read-only pane).
- Placement T2 in the ride preset is "derived, do not nudge": show it with a "derived" chip and a muted style, and warn once if the user nudges it.

### Status bar (24 px)

- Left: video info, audio info. Middle: warnings with an icon (no requestVideoFrameCallback fallback; resync count while playing). Right: the transient message (`S.msg`), with severity colouring (info: muted, warn: amber, error: red). Errors also appear as a banner under the top bar so they cannot be missed.

### Shortcut cheat-sheet overlay

- Opened by `?` or the `?` button; modal, focus-trapped, Esc closes. Two columns:
  - Existing keys: Left/Right step 1 frame; Shift+Left/Right step 10 frames; Space play/pause; `,` and `.` nudge the selected placement one frame earlier/later.
  - Suggested additions (keep them optional and cheap): `[` and `]` select previous/next placement; `M` add marker at playhead; `Home`/`End` first/last frame; `Ctrl+S` Save copy; `L`/`K` play/pause as a familiar pair; `?` help. J/K/L shuttle is not needed because the tool has no variable-speed playback.
- The "will / will not" prose, the meaning of `at`, and the accuracy statement move into this overlay (or an "About" tab), replacing the 620 px open details block. The accuracy warning ("real-time playback right to about 1 frame; trust scrub and onset markers") also appears as a one-line hint in the status bar while playing.

### Empty state and onboarding

- Before any file is loaded, the viewer area shows two large drop cards side by side: "Drop video (mp4)" and "Drop audio (wav or mp3)", each with a Browse button that triggers a hidden `<input type=file>` (keep ids `video-file`, `audio-file`), a one-line hint of the expected file for the current preset (from `cfg.video_name` / `cfg.audio_name`), and a check mark once loaded.
- The whole window is also a drop target (existing `#drop` handler moved to the viewer region; keep `#drop` and `.over`).
- Timeline dock shows "Load audio to see the waveform" in the wave well; inspector still shows the shipped placements, so values can be read before loading files.
- File names loaded show as chips in the top bar with an x (clears the file).

### Errors and warnings

- Three styles: info (muted text), warning (amber `#f2b84b` on `#2b2413`), error (`#ff8a8a` on `#2f1b1d`). Each with an inline-SVG icon and text, never colour alone.
- Preset-change warning ("config replaced ... earlier edits discarded") becomes a confirm-style banner with the lines "Load opening_v3.mp4 and tunetank-piano-logo-484286.mp3", and appears in the dirty badge as "preset replaced". If there are unsaved changes when switching preset, ask before discarding (a small inline confirm is enough).

### Save copy affordance and dirty/diff

- Top bar right: primary "Save copy" button (accent fill when dirty, secondary style when clean) and a badge to its left: "● 2 changes" (dot in amber) when `cfg` differs from `SHIPPED`, nothing when clean.
- Clicking the badge opens a popover listing changed values against the shipped config in mono, for example:
  - `T1 at  3.8000 → 3.7667 s   (-1 f, -33.3 ms)`
  - `marker "rider moves" 5.3000 → 5.3333`
  - `audio_name  tunetank-... → clicks.wav`
- Diff is computed in JS by comparing `cfg` with `SHIPPED` field by field (placements matched by label, markers by index).
- Copy config and the read-only config text move to the Config tab of the inspector; "Copy config" stays there and in the popover.
- After a successful save, show a green confirmation with the file name ("Saved av-align.ride.20260923-1405.html to Downloads").

### Focus, keyboard, accessibility

- Visible `:focus-visible` ring: 2 px `#7cc4ff`, 2 px offset, on every interactive element.
- Note the existing behaviour: the page blurs buttons after a click (so Space/arrows keep controlling the transport) and blurs radios, checkboxes and ranges after change. Keep it; keyboard users still get focus rings when tabbing.
- Keys are ignored while an INPUT, TEXTAREA or SELECT is focused, and with Ctrl/Alt/Meta held. New shortcuts must follow the same guard.
- Every icon-only button gets `aria-label`; groups use `role="group"` with `aria-label` ("Nudge selected placement"); the timecode readout has `role="timer"` off and `aria-live="off"` (it updates every frame; do not announce it), while the status message region uses `aria-live="polite"`.
- Canvas gets `role="img"` and an `aria-label` summarising ("Waveform of audio placed at T1 3.8 s, 3 onsets"), because the same information is available in the Onsets table.
- `@media (prefers-reduced-motion: reduce)`: no transitions or smooth scroll; the playhead itself is not animated by CSS.
- Text sizes not below 12 px; hit targets at least 32 px (36 px for nudge buttons); do not use colour alone for T1/T2 (labels on regions).
- Modal overlay uses `<dialog>` or `role="dialog" aria-modal="true"` with Esc and focus return.

### UI to drop or simplify

- Drop: the 620 px always-open prose block (move to the `?` overlay); the separate Stop button (Pause plus first-frame button); the footer sentence (merge into the overlay); the native "Choose File" widgets (replace with drop cards and Browse buttons); the 14-row marker list on the main scroll (move to a tab).
- Simplify: onset Floor/Jump sliders into a gear popover; "Add placement/Remove" into an overflow menu; the config textarea into a Config tab; fps input into the top bar (keep the id `fps`); go-to time/frame fields collapse next to the timecode as one typeable field plus a small frame field (keep both ids).

### What a single offline file cannot do, and how to work around it

- No icon fonts and no web fonts: use inline SVG icons (no `xmlns`, see risks) and system font stacks; `Segoe UI Variable` and `Cascadia Mono` exist on current Windows.
- Canvas cannot inherit CSS: read colours once from CSS variables with `getComputedStyle` and redraw on load and on `resize`.
- No resizable split panes without writing pointer-drag JS: use a fixed CSS grid at the proportions above; a draggable divider is an optional extra.
- No frame thumbnails unless drawn from the loaded `<video>` via canvas `drawImage` (works over file:// with blob URLs; accuracy depends on seek timing).
- No external images: any logo or icon is inline SVG or omitted.
- No frameworks: plain DOM as today; keep the file under the 120 KB test cap (currently 40.7 KB).
- Browser can only expose file names, not paths, so the top-bar file chips show names only.
- Firefox lacks `requestVideoFrameCallback`; the fallback message stays.

---

## (d) Must-survive feature list (from the code)

Transport and readout:
- Frame step -1/+1 (buttons `step-back`, `step-fwd`; Left/Right) and -10/+10 (`step-back10`, `step-fwd10`; Shift+Left/Right), clamped to 0..total-1, seeking to the middle of the frame (`(n+0.5)/fps`).
- Time in seconds (3 decimals) plus frame number, 0-based, `frame n / total` (`#time`); "shown frame" cross-check from `requestVideoFrameCallback` (`#shown-frame`), with "n/a" when unsupported.
- Go to time (`goto-time`, seconds) and go to frame (`goto-frame`), which are not overwritten while focused.
- Play/pause toggle (`play`, Space), Stop (`stop`), restart from 0 if ended; real-time audio through Web Audio with resync when drift exceeds 25 ms and a resync counter in the status; `ended` handling.
- fps input (`fps`, 1..240) and preset select (`preset`: "as loaded: <scene>" plus "preset: opening").

Scrub:
- "Play this frame's audio when stepping" (`scrub`, default on): plays exactly the 1/fps audio slice of the frame on screen, per placement, with 2 ms fades.
- "Repeat the frame's audio 3x" (`loop-frame`).

Waveform and timeline:
- Waveform drawn on the video clock, shifted by each placement's `at`, one trace per placement (selected drawn at full opacity), zero line, click-to-seek (`canvas` click -> `stepTo`), `zoom` select with "all" and "+/- 2 s around the playhead", frame ticks only in the zoomed view, start/end time labels, playhead, marker lines with labels, onset ticks per placement.
- Peak cache invalidation when placements change (`S.cache`).

Onsets:
- Detection (`AVCore.detectOnsets`) with Floor (`onset-floor`, -60..-20 dBFS) and Jump (`onset-jump`, 3..12 dB) sliders and their value labels (`onset-floor-v`, `onset-jump-v`); message line (`onset-msg`); table (`onset-table`) capped at 100 rows, first row is the "attack", per placement a "video t / frame" column with a "go" button (disabled if t < 0 or no video).

Placements:
- N placements each with `label`, `at` (seconds, 4 decimals, editable), frame equivalent (`N.NN f`), `gain`, `note`; "nudge target" = selected placement (`cfg.nudge_target`); add placement (duplicates the selected one as P2, P3...; `add-placement`), remove (disabled when only one).
- Nudges on the selected placement: -1f, -100 ms, -10 ms, +10 ms, +100 ms, +1f (`n-1f-`, `n-100-`, `n-10-`, `n-10p`, `n-100p`, `n-1fp`); frame nudges snap to the frame grid to avoid drift; all values rounded to 0.1 ms.
- Keyboard: `,` and `.` = nudge selected placement one frame earlier/later.

Markers:
- Editable label and time (4 decimals), frame readout (`f N`), Go button (seek to the marker's frame), Remove, and "Add marker at playhead" (`add-marker`), snapped to the current frame time.

Presets:
- "as loaded" (shipped ride config) and "preset: opening" (T0 at 0.0, gain 0.85, its own markers); selecting a preset replaces scene, fps, file names, nudge target, placements and markers (earlier edits discarded) and tells the user which files to load.

Config and Save copy:
- The config block between `/* AV-ALIGN CONFIG BEGIN */` and `/* AV-ALIGN CONFIG END */` is serialised by `AVCore.serializeConfig` (byte-exact layout) and shown live (`config-out`); Save copy (`save-copy`) downloads `av-align.<scene>.<YYYYMMDD-HHMM>.html` with only that block replaced (via `PRISTINE`); "Copy config" (`copy-config`) uses the clipboard API with a select-text fallback.

Loading:
- Video and audio pickers (`video-file`, `audio-file`), drag-and-drop of mp4/audio onto `#drop` (`.over` styling), audio decode with sample-rate, channels, duration and peak dBFS in the status, video info `WxH, D s = N frames at F fps`.
- Status line (`status`) as the single message channel.

Keyboard shortcuts (all ignored while an INPUT/TEXTAREA/SELECT is focused or Ctrl/Alt/Meta is held): Left/Right step 1 frame, Shift+Left/Right step 10, Space play/pause, `,` `.` nudge. Buttons and radios/checkboxes/ranges blur after activation so the shortcuts keep working.

Non-functional: single offline file, no network, no CDN, no `<link>`, no external script; works in Chrome and Edge on Windows over file://; `av-align.test.mjs` passes; file under 120 KB.

---

## (e) Risks and the ids/classes the JS relies on

### What the test suite covers (and does not)

`av-align.test.mjs` (node 18+, no deps) reads `av-align.html` and:
- Extracts `<script id="av-core">` with the regex `/<script id="av-core">([\s\S]*?)<\/script>/` and runs it in a `vm` sandbox. The script must keep exactly that opening tag, must stay pure (no `document`/`window` access), and must keep the `AVCore` export shape.
- Extracts the config block with `/\/\* AV-ALIGN CONFIG BEGIN \*\/\n([\s\S]*?)\/\* AV-ALIGN CONFIG END \*\//`; the two delimiter strings must each occur exactly once in the whole file; `serializeConfig(parseConfig(block))` must equal the block byte-for-byte; `applyConfig` must change only the intended line.
- Static file checks: no `http://` or `https://` anywhere in the file (an inline SVG `xmlns="http://www.w3.org/2000/svg"` fails this); no `<link` tags; no `<script src=`; file under 120 KB (currently 40,766 bytes); no `<!--` outside `<script>` blocks.
- It does NOT reference any UI element id or class. UI breakage from a restyle will not be caught by it. Frame maths tests assume `AVCore` function signatures (`frameOf`, `timeOfFrame`, `seekTimeOfFrame`, `nudge`, `nudgeFrames`, `fmtSeconds`, `fmtFrames`, `videoTimeOfAudio`, `audioTimeOfVideo`, `scrubWindow`, `detectOnsets`, `peakBins`, `parseConfig`, `serializeConfig`, `applyConfig`, `formatCopyName`).

### Save-copy round-trip risk (the most likely silent break)

- The first statement of `<script id="av-app">` is `const PRISTINE = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;`. Save copy writes `PRISTINE` with only the config block replaced.
- The shipped file is already in browser-serialised form (for example `<details id="about" open="">`, `<video ... muted="" playsinline="">`, `<input ... checked="">`, quoted attributes, no self-closing slashes on void elements, `<html lang="en"><head>` on one line). If the restyled file is hand-written in a different form, or any script mutates the DOM before `av-app` runs, then the saved copy will differ from the shipped file by more than the config block, which violates the README rule that a whole-file diff shows only the config block.
- Mitigation: after the restyle, load the page in Chrome, press Save copy, and `diff` the saved file against the shipped file; only the config block may differ. If they differ only by serialisation, normalise the shipped file once by saving the page's own `outerHTML` (a "normalise" step) and commit that.
- The `av-app` script must remain the last script and no DOM-building script may precede it. Anything rendered by JS after `PRISTINE` is fine.
- Line endings: the file must stay LF (README: `.gitattributes` pins it; CRLF breaks the tests and the Save-copy diff).

### Ids the JS looks up (via `$()`), grouped by role

- Inputs and selects: `video-file`, `audio-file`, `preset`, `fps`, `goto-time`, `goto-frame`, `scrub` (checkbox), `loop-frame` (checkbox), `zoom` (select with values `all` and `zoom`), `onset-floor` (range), `onset-jump` (range).
- Readouts and containers: `status`, `time`, `shown-frame`, `onset-floor-v`, `onset-jump-v`, `onset-msg`, `placements`, `markers`, `onset-table` (needs a `<thead>` and a `<tbody>`; JS uses `.tHead` and `.tBodies[0]`), `config-out` (textarea), `drop`, `video` (the `<video>`), `wave` (the `<canvas>`).
- Buttons: `step-back10`, `step-back`, `play`, `step-fwd`, `step-fwd10`, `stop`, `n-1f-`, `n-100-`, `n-10-`, `n-10p`, `n-100p`, `n-1fp`, `add-placement`, `add-marker`, `save-copy`, `copy-config`.
- Other ids present in the markup (not looked up by JS, but referenced by CSS or docs): `about`, `transport`, `nudges`, `onsets`, `config`, `av-config`, `av-core`, `av-app`.

### Classes and other markup the JS creates or toggles

- Created by JS: `.prow` (each placement and marker row), `.frames` (frame readout span), `.wide` (wide text inputs), `.attack` (first onset row), and `.over` (added to `#drop` on dragover). Bare `<div class="row">` wrappers exist only in static markup.
- Radio: `renderPlacements` creates `<input type=radio name="nudge">` per placement; the `change` handler sets `sel` and `cfg.nudge_target`.
- Global handlers: `document` click blurs any `BUTTON` target; `document` change blurs radio/checkbox/range targets; the keydown handler checks `e.target.tagName` for INPUT/TEXTAREA/SELECT. If the restyle replaces `<button>` with `role="button"` divs or wraps buttons in other elements, these handlers stop working as intended.
- `#time` text is written with `textContent` as one string (`"3.800 s · frame 114 / 789"`); a big HH:MM:SS:FF readout needs `refresh()` edited.
- `drawWave()` hard-codes canvas height 160 CSS px, colours, marker label rows `(idx % 3) * 12`, onset tick rows at `H - 16*dpr`, and uses `canvas.clientWidth`; changing the dock height or theme requires editing that function, and the canvas must have a non-zero `clientWidth` (a hidden tab or `display:none` container gives width 0; JS clamps to 200 px).
- `window.addEventListener("resize", ...)` redraws the waveform; a CSS-grid layout that changes the canvas width without a window resize (for example collapsing a panel) needs an explicit `drawWave()` call or a `ResizeObserver`.
- `video` element: attributes `muted`, `playsinline`, `preload="auto"`; JS uses `video.src`, `duration`, `currentTime`, and `requestVideoFrameCallback`. It must not gain `controls` or be hidden with `display:none` (seeking and frame callbacks may stop in some browsers).
- The file inputs' `accept` attributes (`video/mp4`, `audio/*`) do not block programmatic `setInputFiles`; drag-and-drop accepts `video/*`, `.mp4`, `audio/*`, `.wav`, `.mp3`.
- Keep `<meta charset="utf-8">` and `lang="en"`; the middle dot `·` in the readout is a UTF-8 character.

### Other risks

- Big refactor risk: the app JS is about 470 lines of tested-by-hand behaviour (real-time sync, scrub). Restyle by keeping ids and function names and swapping markup/CSS/canvas colours; do not rewrite the audio logic.
- Do not use any `http(s)://` string in comments, CSS or SVG (even in a comment) or the test fails; do not add HTML comments; do not add `<link rel=icon href=...>` (use a `data:` URI or nothing).
- Dark canvas: the waveform `fillStyle "#fff"` and stroke colours must change together with the CSS, otherwise the waveform stays a white slab.
- Real-time accuracy is about +/-1 frame on wired output and worse on Bluetooth; the design must not imply sample accuracy. Keep the "trust scrub and onset markers" wording (README "Accuracy").
- The "frame ticks when zoomed" and "onsets can read up to 5 ms early" behaviours are documented; a new adaptive ruler should not change `frameOf` / `seekTimeOfFrame` semantics (frame n covers [n/fps, (n+1)/fps); seek to (n+0.5)/fps).
- The dirty/diff feature needs a stable copy of `SHIPPED` (already `clone(window.AV_CONFIG)`); comparing `cfg` to it must ignore `presets` and run only on the fields Save copy writes.
- Playback-related handlers call `refresh()` every frame during play; a heavier canvas (overview strip, sync strip, filled envelopes) must stay cheap: reuse the existing peak cache for the "all" zoom, and keep the zoomed redraw under a few ms.
