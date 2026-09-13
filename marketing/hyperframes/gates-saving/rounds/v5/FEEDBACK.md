# 03 — Gates & Saving — Round v5

**Render file:** gates-saving_v5.mp4.
**Duration:** 12.300s (369 frames at 30fps, 1920x1080, no audio — unchanged from v4; this
FEEDBACK.md previously said 12.4s, that was a doc typo, not a real duration change — the
soundv3 audio already built for this scene was authored at 12.3s and already matches).
**Source:** ../../index.html.

## What changed since v4
- Gate ticks are now off-white (#F4F2EC, matching the file's existing landmark-ring white) instead of yellow-at-0.6-opacity, and stroke-width 4 instead of 3.
- Each gate now **draws across** the route (stroke-dashoffset reveal, same technique as the brand mark's ring draw in brandmark/opening) instead of scale-popping in with a bounce ease. Same three stagger points (1.9/2.2/2.5s), 0.4s draw each, power2.out.
- Nothing else changed — same 12.4s duration, same ride/caption/camera timings, same recolor-on-cross behaviour (gates still swap to green/yellow/purple when the second ride crosses them).

## What you'll see, in order
1. 0.0-1.0 — Zoom-out lead-in from start-ride's finishing frame (unchanged).
2. 1.05-1.55 — Start/end landmark rings pop in (unchanged).
3. 1.6 — Caption "Save your route as reference." fades in (unchanged).
4. 1.9 / 2.2 / 2.5 — Each gate draws itself across the route as a single off-white stroke (casing + tick together), like the logo's ring being drawn, instead of popping in.
5. 4.4-11.7 — Second ride runs; gates recolor to green/yellow/purple as crossed (unchanged).
6. 5.2-12.3 — Caption "Next time. Start racing yourself." (unchanged).
7. Ends 12.4s.

## Things to check in the render
- Gate tick legibility at width 4 / full opacity white against the basemap — bump to 5 if it still reads thin in places (judgment call, not yet verified against an actual render).
- Draw direction (which end of the 44px tick draws first) — currently x1→x2 of each perpendicular tick, same direction for all three; flag if it should read the other way.
- Whether the draw-on speed (0.4s, power2.out) feels right next to the ring-draw it's meant to echo (that one runs 1.3s, much slower, but a road gate crossing the whole scene shouldn't take that long — flag if 0.4s reads as too quick or too slow).

## Render on the PC (PowerShell, from marketing\hyperframes\)
```
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gates-saving -Render
```
then copy the newest `gates-saving\renders\gates-saving_*.mp4` to
`gates-saving\rounds\v5\gates-saving_v5.mp4` (note: render.ps1 writes into the
composition's own `renders\` subfolder, not a top-level one) and confirm 12.3s:
```
ffprobe -v error -show_entries format=duration -of csv=p=0 gates-saving\rounds\v5\gates-saving_v5.mp4
```

## Nathan's feedback
<!-- write your notes below, overall or beat-by-beat -->
