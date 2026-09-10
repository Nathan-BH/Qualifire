# colours — Why purple is rare (HyperFrames composition)

> Renamed 2026-09-10 from `purple/` (which is now legacy). Same `index.html`, same render, same v1 round. The timeline id inside `index.html` is still `purple` (`window.__timelines.purple`) — cosmetic, listed under cleanup in `../structure.md`.

**v2 (2026-09-10):** gate intro, rolling window and endcard removed — rolling window
to become its own composition.

19-second explainer of the tier logic — no product shot, no footage,
invented visuals only. 1920x1080, id `purple`, one paused GSAP timeline
(`window.__timelines.purple`); only external asset is the GSAP CDN script.

Beats:
- **0-4s** — the chart builds: your last ten rides through this sector stack in,
  with the average line drawn alongside them.
- **4-9s** — a new ride lands slower than average: yellow. "Yellow is slower than
  your average."
- **9-14s** — a new ride beats the average: green. "Faster than your average."
- **14-19s** — a new ride beats every one of the last ten: purple. "Faster than
  every one of your last ten." Purple stays on the chart; everything fades to
  black from 18.6s.

On your PC, from `marketing/hyperframes/`:
```powershell
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name colours            # preview
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name colours -Render    # render to MP4
```

v1 was built and rendered 2026-09-09 (`renders/colours_2026-09-09_18-09-50.mp4`); Nathan's
v1 feedback (see `rounds/v1/FEEDBACK.md`) drove the v2 rewrite above. v2 is source-edited
but not yet rendered — see `rounds/v2/FEEDBACK.md` for the render command.

**Use in the teaser:** position 5 of `../teaser/`. The v1 cut (0:00–0:55 of a 60s render,
its own endcard dropped) is superseded — v2 is 19.0s and has no endcard to drop, so the
teaser will use it in full once rendered. Cut sheet: `../teaser/README.md`. The earlier
per-part feedback sheet at `../teaser/parts/05-colours/rounds/v1/FEEDBACK.md` is legacy;
give feedback in this folder's `rounds/vN/FEEDBACK.md`.

## Feedback rounds
| Round | Render | Date | Status |
|---|---|---|---|
| [v1](rounds/v1/FEEDBACK.md) | colours_v1.mp4 | 2026-09-09 | Feedback received, see v2 |
| [v2](rounds/v2/FEEDBACK.md) | colours_v2.mp4 | 2026-09-10 | Not rendered yet |
