# HyperFrames Studio — how to use the local web UI

The page at `http://localhost:3002/…` that opens after `npx hyperframes preview` is
**HyperFrames Studio**: a browser-based editor and viewer for the composition in
`hyperframes/<name>/index.html`. It looks like video-editing software because it is one,
but for us it is mainly a **scrubber to check the video** — the `index.html` file stays
the source of truth (see `guides/VIDEO-EDITING-GUIDE.md` Q1/Q3).

> Honesty note: everything here is taken from HeyGen's official Studio docs unless marked
> **[inferred]** — those parts are reasoned from the URL you saw, not documented anywhere.

## 1. The one thing to know first

Studio, Claude and the CLI all work on the **same file**. Studio can *write* to
`index.html` — its Code editor and its visual controls save automatically. So:

- Use Studio to **look**, not to edit. Edits are done by Claude (or you) in the file.
- Do **not** drag things around in Studio while Claude is editing the same file. The
  docs say to avoid editing the same file in Studio and another tool at the same time;
  if an outside change lands first, Studio rejects its own save and asks you to reload.
- If you accidentally moved something: `Ctrl+Z`. Studio keeps an undo history.
- Beware **auto-keyframe** — it starts switched ON. With it on, dragging an element at one
  frame does not fix its position; it creates an *animation* to that position. Another
  reason to leave editing to the file.

## 2. What you are looking at

The **Preview** workspace (what you land on):

| Where | What it is |
|---|---|
| Centre | The **canvas** — the live frame of the video at the playhead position. Click an element to select it. |
| Bottom | The **timeline** — every element as a clip on a track; the **playhead** (vertical line) is the moment shown on the canvas. This is your scrubber. |
| Left | Project tools: **Code** (the `index.html` source, editable, autosaves), **Comps** (compositions in the project), **Assets** (media files), **Catalog** (reusable blocks). |
| Right | The **Inspector**, with panels **Design**, **Layers**, **Variables**, **Renders**. |
| Top bar | **Export** (opens the Renders panel) and the **Storyboard** view. |

Inspector panels, in plain words:
- **Design** — properties of the selected element, grouped as Text, Layout, Style, Media,
  Grade, Motion, Effects. This is where you *read* what a thing's size/colour/timing is.
- **Layers** — the stacking order of elements; use it to select something hidden or
  overlapped. Selection is synced between canvas, Layers and timeline.
- **Variables** — template variables, if the composition uses any (ours don't yet).
- **Renders** — the render queue: formats (MP4/WebM/MOV), fps 24/30/60, resolution,
  progress, download finished files.
- **Storyboard** — the planned sequence with direction, voice-over and comments. Our
  compositions are hand-written, so this may be sparse.

## 3. Checking a specific moment (the main job)

- **Scrub:** drag the playhead along the timeline, or click on the time ruler.
- `Space` — play/pause. `J` / `K` / `L` — play backwards / stop / play forwards.
- `←` / `→` — step **one frame**. `Shift+←/→` — step ten frames. (At 30 fps, 30 steps = 1 s.)
- `I` / `O` — set an in/out point around the bit you care about; `Shift+L` loops it;
  `A` / `E` jump to the in/out point. `Shift+I` / `Shift+O` clear them.
- `F` — fullscreen the canvas. `G` — toggle a grid over the canvas. `M` — mute.
- Zoom the timeline in for frame-level detail, out to see the whole video.

Note: the frame/step keys nudge a **selected element** instead of the playhead when one
is selected. Click empty canvas (or press `Esc`) first if the arrows seem to move things.

**Faster than watching:** Claude can grab still frames without a full render —
`npx hyperframes snapshot --at 2.9,10.4` writes PNGs at those times, and
`npx hyperframes check` audits layout/contrast/runtime errors across the video.

## 4. The URL **[inferred]**

Your URL looked like `#project/teaser?v=1&t=12&tab=design&rc=0`. The docs do not describe
these. Reasonable reading: `project/teaser` = which composition folder is open;
`t=12` = playhead position (scrub and watch it change to confirm; seconds vs. frames is
unverified); `tab=design` = the Inspector's Design panel (the panel name is verified,
the mapping is not); `v` and `rc` unknown. Practical upshot: you can probably bookmark
or paste a URL to reopen the same composition at the same moment.

## 5. Live reload — how edits reach the screen

`npx hyperframes preview` starts "a live preview server with hot reload" on port 3002
(change with `--port`; `--no-open` stops it launching a browser). When Claude saves
`index.html`, the preview refreshes on its own — then play the affected moment. If it
does not refresh: make sure the file was actually saved, wait a moment, look at the
terminal where `preview` is running, reload the browser tab, and if the server died run
`npx hyperframes preview` again.

Workflow that keeps the file as the truth:
1. Leave Studio open on the composition.
2. Ask Claude for the change (or edit `index.html` yourself in a text editor).
3. Studio reloads → scrub to the moment → say what is right/wrong.
4. Repeat. Render (below) only when a round is done.

## 6. Rendering

Two routes to the same result:
- **Ours:** `render.ps1 -Name <comp> -Render` (see `COMMANDS.md`) — writes a timestamped
  mp4 into `hyperframes/<name>/renders/`. Use this; it keeps our naming and one-render rule.
- **Studio:** top-bar **Export** → Renders panel → format/fps/resolution → render →
  download. Fine for a quick look; do not let it scatter files. The CLI default output
  is `renders/<name>.mp4`; Studio's download location is not documented.

Before sharing a render, the docs' own checklist: open the file, watch start and end,
check cuts/captions/audio, confirm duration and dimensions.

## 7. Cheat sheet

| Key | Does |
|---|---|
| Space · J/K/L | play/pause · back/stop/forward |
| ← → · Shift+← → | 1 frame · 10 frames |
| I · O · Shift+L · A · E | in · out · loop · jump in · jump out |
| F · G · M | fullscreen · grid · mute |
| Ctrl+Z · Ctrl+Shift+Z | undo · redo (you will want this) |
| Ctrl+1 · Ctrl+2 | open Comps · open Assets |
| V · B · N | selection tool · razor tool · snapping (editing tools — avoid) |

## 8. When it looks wrong

- Preview stale → section 5. Save conflict message → do not keep editing; undo, reload.
- Render fails → keep the full error; run `npx hyperframes lint` then
  `npx hyperframes check`; confirm FFmpeg/Chrome with `npx hyperframes doctor`.
- Missing media → almost always a wrong path in `index.html`.

## Sources (verified)
- Studio overview: https://hyperframes.heygen.com/studio
- Edit the frame (canvas, Design, Layers): https://hyperframes.heygen.com/studio/canvas
- Timeline: https://hyperframes.heygen.com/studio/timeline
- Source & agent (autosave, conflicts, live reload): https://hyperframes.heygen.com/studio/source
- Shortcuts: https://hyperframes.heygen.com/studio/shortcuts
- Export/Renders: https://hyperframes.heygen.com/studio/export
- Troubleshooting: https://hyperframes.heygen.com/studio/troubleshooting
- CLI reference (preview port 3002, render/snapshot/check flags): https://hyperframes.heygen.com/packages/cli
- Repo: https://github.com/heygen-com/hyperframes
