# 06 — Closing — Round v2

**Render file:** closing_v2.mp4 (not rendered yet — device_bash was unreachable this session).
**Duration (planned):** 4.000s (120 frames at 30fps, 1920x1080, no audio).
**Source:** ../../index.html — first HyperFrames render of this composition (v1 was an ffmpeg cut of the old teaser, not a standalone render).

## What changed since v1
- Standalone composition built (`brandmark/closing/index.html`) — closes structure.md's pending item to split closing out of the old teaser cut.
- The v1 "P2 leftover" stray frames are gone by construction (this timeline starts on nothing but the mark fading in on black).
- Tagline "Same road. New meaning." added beneath the QUALIFIRE wordmark, matching opening's styling.
- New end fade to black (0.5s) — v1 just held its last frame; judgment call, flagging for review.

## What you'll see, in order
1. 0.00-0.60 — Mark (ring + tail) fades in, slight scale-up.
2. 0.60-1.40 — QUALIFIRE wordmark fades in.
3. 1.20-1.90 — Tagline "Same road. New meaning." fades in (overlaps wordmark's tail).
4. 1.90-3.50 — Hold.
5. 3.50-4.00 — Fade to black.

## Things to check in the render
- Mark size (280px) and gaps (48px) between mark/wordmark/tagline — judgment call, sized to read well as a 4.0s endcard; adjust if it feels cramped or too spread out.
- 0.5s end-fade speed — first time this composition ends on a fade rather than a hard cut.
- Whether the closing composition should visually echo opening's mark-draw animation instead of a simple fade-in — kept it simpler here since this is an endcard, not an intro; flag if you'd rather it match.

## Render on the PC (PowerShell, from marketing\hyperframes\)
```
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name brandmark\closing -Render
```
then copy the newest `brandmark\closing\renders\*.mp4` to `brandmark\closing\rounds\v2\closing_v2.mp4` and confirm 4.0s:
```
ffprobe -v error -show_entries format=duration -of csv=p=0 brandmark\closing\rounds\v2\closing_v2.mp4
```

## Nathan's feedback
<!-- write your notes below, overall or beat-by-beat -->
