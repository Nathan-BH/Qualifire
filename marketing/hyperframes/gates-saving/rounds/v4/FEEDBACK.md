# 03 — Gates & Saving — Round v4

**Render file:** gates-saving_v4.mp4 (not rendered yet — device_bash was unreachable this session).
**Duration (planned):** 12.400s (372 frames at 30fps, 1920x1080, no audio).
**Source:** ../../index.html.

## What changed since v3
- 1.0s zoom-out lead-in added at the start, continuing the camera from start-ride's finishing 2x frame down to this scene's normal framing (answers Nathan's "what do you think?" — judgment call, added a #cam wrapper matching start-ride's pattern, ported its exact camera-centring formula so the two frames line up almost exactly at the cut). Route strokes crossfade from start-ride's 2x-reduced widths (7/4) to gates-saving's normal widths (10/6) over the same 1.0s. Rider carried across the cut: appears at the finish point at full opacity, fades out over the lead-in.
- All existing beats shifted +1.0s for the lead-in, then the second ride pulled forward another 1.6s net (starts at 4.8s instead of what a flat +1.0 shift would give) per Nathan's "start the second ride sooner."
- Caption B now fades in at 5.2s, while the second ride is already running, instead of v3's blank beat before it started.
- Caption B text: "Next time, you've got something to go for." -> "Next time. Start racing yourself." ("your" italic-not-bold, "self" bold-not-italic).
- Sector colours: purple-yellow-purple-purple -> green-yellow-purple-green (SECTOR_COLORS, shared byte-for-byte with start-ride/ranking).
- Duration 14.8s -> 12.4s (net: +1.0 lead-in, −3.4 from pulling the ride forward).

## What you'll see, in order
1. 0.0-1.0 — Zoom-out from start-ride's finishing 2x frame to normal framing; route strokes thicken to match; rider (left over from start-ride) fades out.
2. 1.05-1.50 — Start/end landmark rings pop in.
3. 1.60-4.90 — Caption "Save your route as reference." + three gate ticks pop in (1.9/2.2/2.5).
4. 4.40 — Rider fades in for the second ride.
5. 4.80-11.70 — Second ride runs; gates swap colour at 6.46/9.15/10.60; each sector paints; final sector at 11.70.
6. 5.20-12.30 — Caption "Next time. Start racing yourself." (overlapping the ride, per Nathan).
7. 11.70-12.40 — Hold.

## Things to check in the render
- Match-cut quality at the start-ride -> gates-saving join: brightness step (start-ride has a #tint layer at 0.25 opacity dimming the map; gates-saving does not — the cut may show a brightness jump even though framing matches). Flag if visible.
- Rider carry-over — it fades out at the finish point (where start-ride left it), then reappears at the start point 3.9s later for the second ride. Note: the brief for this round only specified opacity continuity across that gap; while invisible I also snapped its position back to the start point (at 0.5s, before the 4.4s fade-in) so it doesn't visibly teleport across the map when it reappears — flagging this as an implementation fix, not something Nathan asked for explicitly.
- 1.0s zoom-out speed.
- Caption B arriving 0.4s into the ride rather than before it starts — check it doesn't feel rushed.
- Trailing period on caption B (kept for consistency with caption A's style) — judgment call.
- #scrim-bottom (the bottom vignette gradient) was kept outside #cam, i.e. it does NOT pan/zoom with the map during the lead-in — judgment call, since it's a fixed screen-space legibility aid (like #dim), not map content, and scaling it with the 2x-to-1x zoom would have distorted the gradient band at the bottom edge. Flag if it should track the camera instead.

## Render on the PC (PowerShell, from marketing\hyperframes\)
```
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gates-saving -Render
```
then copy the newest `renders\gates-saving_*.mp4` to `rounds\v4\gates-saving_v4.mp4` and confirm 12.4s:
```
ffprobe -v error -show_entries format=duration -of csv=p=0 rounds\v4\gates-saving_v4.mp4
```

## Nathan's feedback
<!-- write your notes below, overall or beat-by-beat -->
