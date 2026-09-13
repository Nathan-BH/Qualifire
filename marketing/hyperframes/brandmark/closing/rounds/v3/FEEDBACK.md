# 06 — Closing — Round v3

**Render file:** closing_v3.mp4 (not rendered yet — device_bash was unreachable this session).
**Duration (planned):** 4.000s (120 frames at 30fps, 1920x1080, no audio — unchanged from v2).
**Source:** ../../index.html.

## What changed since v2
- Reveal tightened to feel "together," closer to v1: mark, wordmark, and tagline now all fade up within the first 0.75s (starts at 0 / 0.10 / 0.25s, 0.5s fades, overlapping) instead of v2's ~1.9s staggered sequence (0.6 / 0.6 / 1.2s starts).
- Hold extended from 1.6s to 2.75s (0.75-3.50) to absorb the time saved in the reveal, so total duration stays 4.0s.
- End fade-to-black (3.5-4.0s) kept as-is — Nathan's feedback was about the reveal's tightness, not the ending.

## What you'll see, in order
1. 0.00-0.50 — Mark fades/scales up (0.96 -> 1).
2. 0.10-0.60 — QUALIFIRE wordmark fades up, overlapping the mark.
3. 0.25-0.75 — Tagline "Same road. New meaning." fades up, overlapping both — everything on screen by 0.75s (v2 took 1.9s).
4. 0.75-3.50 — Hold.
5. 3.50-4.00 — Fade to black (unchanged).
6. Ends 4.0s.

## Things to check in the render
- Whether the overlapping fades read as "together" the way v1 did, or still feel like three separate beats — if it should be tighter still, the fix is starting all three at the same time (0s) with the same duration.
- Whether 0.5s per-element fade duration is fast enough given they now overlap so much.

## Render on the PC (PowerShell, from marketing\hyperframes\)
```
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name brandmark\closing -Render
```
then copy the newest `brandmark\closing\renders\*.mp4` to `brandmark\closing\rounds\v3\closing_v3.mp4` and confirm 4.0s:
```
ffprobe -v error -show_entries format=duration -of csv=p=0 brandmark\closing\rounds\v3\closing_v3.mp4
```

## Nathan's feedback
<!-- write your notes below, overall or beat-by-beat -->
