# 01 — Opening — Round v3

**Render file:** opening_v3.mp4 (not rendered yet — device_bash was unreachable this session).
**Duration (planned):** 6.500s (195 frames at 30fps, 1920x1080, no audio).
**Source:** ../../index.html.

## What changed since v2
- Yellow tail draw slowed 0.35s -> 0.50s (now reads as drawn, not appearing).
- Wordmark fade-in slowed 0.5s -> 0.8s (was "too fast").
- Tagline fade-in slowed 0.5s -> 0.7s, still starts 0.4s after the wordmark begins.
- End fade slowed and eased: 0.4s power1.in hard-kill-at-clip-end -> 0.8s power1.inOut true fade to black, with 0.2s of black held after.
- Every beat from the mark fade-out onward shifted +0.15s later to absorb the slower tail; the empty spacing beat (liked in v2 feedback) kept its exact 0.35s length.
- Duration grows 5.5s -> 6.5s (+1.0s) to fit the slower fades without compressing the hold. Reflected in the teaser v5 cut sheet.

## What you'll see, in order
1. 0.00-1.30 — Ring draws clockwise (unchanged).
2. 1.30-1.80 — Yellow tail completes the mark, slower.
3. 1.80-2.15 — Mark holds.
4. 2.15-2.60 — Mark fades out completely, in place.
5. 2.60-2.95 — Empty frame (spacing, unchanged length).
6. 2.95-3.75 — QUALIFIRE wordmark fades in, slower.
7. 3.35-4.05 — Tagline fades in, slower.
8. 4.05-5.50 — Hold.
9. 5.50-6.30 — Slow fade to black.
10. 6.30-6.50 — Black hold.

## Things to check in the render
- Whether 0.5s for the tail draw reads right, or needs to go slower/faster still.
- Whether 0.8s for the wordmark fade is the right amount slower — Nathan said "too fast," this is a judgment call on how much slower.
- Whether the +1.0s total duration change is acceptable, or the hold (beat 8) should shrink to absorb some of it instead.

## Render on the PC (PowerShell, from marketing\hyperframes\)
```
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name brandmark\opening -Render
```
then copy the newest `brandmark\opening\renders\*.mp4` to `brandmark\opening\rounds\v3\opening_v3.mp4` and confirm 6.5s:
```
ffprobe -v error -show_entries format=duration -of csv=p=0 brandmark\opening\rounds\v3\opening_v3.mp4
```

## Nathan's feedback
<!-- write your notes below, overall or beat-by-beat -->
