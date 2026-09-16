# 03 — Gates & Saving — Round v6

**Render file:** gates-saving_v6.mp4 (not rendered yet).
**Duration:** 12.300s (369 frames at 30fps, 1920x1080, no audio — unchanged from v5).
**Source:** ../../index.html.

## What changed since v5
- The sector-coloured overlays are now the core's own 6px instead of 9px, so a sector changes
  **colour** the instant its gate is crossed but the line never fattens (the same fix as the
  app's `eb8ad99`); gate ticks stay white for the whole scene — the old recolour-to-tier +
  4→5px fatten on crossing is removed (Nathan: never a wanted feature).
- Nothing else changed — same 12.3s, same ride/caption/camera timings; no strip UI added
  (Nathan: it would not read nice in video).

## What you'll see, in order
1. 0.0-1.0 — Zoom-out lead-in from start-ride's finishing frame (unchanged).
2. 1.05-1.55 — Start/end landmark rings pop in (unchanged).
3. 1.6 — Caption "Save your route as reference." fades in (unchanged).
4. 1.9 / 2.2 / 2.5 — Each gate draws itself across the route as a single off-white stroke (unchanged).
5. 4.4-11.7 — Second ride runs; each sector's stretch of route turns green / yellow / purple /
   green as its gate is crossed (6.46 / 9.15 / 10.60s, finish 11.7s), same width as before the
   crossing; the gate ticks stay white.
6. 5.2-12.3 — Caption "Next time. Start racing yourself." (unchanged).
7. Ends 12.4s.

## Things to check in the render
- With the overlay at exactly the core's width, the tier colour must fully replace the yellow
  along the whole sector, with no yellow fringe at the edges (both strokes are
  round-capped/joined on the same path, so none is expected — but this is the one thing a
  render, not a diff, proves).
- Sector 2 is the yellow tier, so with no thickening its "flip" is now invisible (yellow onto
  yellow) — this is inherent to Nathan's ruling and the app has the same property since
  `eb8ad99`; flag if the gap between gate 1 (6.46s) and gate 2 (9.15s) with nothing visibly
  changing reads as odd.
- White ticks over a painted purple/green sector still read.

## Render on the PC (PowerShell, from marketing\silent-studio\)
```
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gates-saving -Render
```
then copy the newest `gates-saving\renders\gates-saving_*.mp4` to
`gates-saving\rounds\v6\gates-saving_v6.mp4` (note: render.ps1 writes into the
composition's own `renders\` subfolder, not a top-level one) and confirm 12.3s:
```
ffprobe -v error -show_entries format=duration -of csv=p=0 gates-saving\rounds\v6\gates-saving_v6.mp4
```

## Nathan's feedback
<!-- write your notes below, overall or beat-by-beat -->
