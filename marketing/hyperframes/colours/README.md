# colours — Why purple is rare (HyperFrames composition)

> Renamed 2026-09-10 from `purple/` (which is now legacy). Same `index.html`, same render, same v1 round. The timeline id inside `index.html` is still `purple` (`window.__timelines.purple`) — cosmetic, listed under cleanup in `../structure.md`.

60-second explainer of the tier/window logic — no product shot, no footage,
invented visuals only. 1920x1080, id `purple`, one paused GSAP timeline
(`window.__timelines.purple`); only external asset is the GSAP CDN script.

Beats:
- **0-5s** — a route and a gate line draw: "Every sector has a gate. Gates
  never change colour. Only your time through them does."
- **5-15s** — the chart: your last ten rides through this sector, an average
  line, a best-time dot.
- **15-25s** — a new ride lands slower than average: yellow. "Yellow just
  means the time was posted. Not a fail."
- **25-35s** — a new ride beats the average: green.
- **35-45s** — a new ride beats every one of the last ten: purple.
- **45-55s** — the window rolls: the oldest ride drops off, the purple ride
  settles back into the pack as just one of the ten.
- **55-60s** — close: "Purple is rare by design." + mark + endcard.

On your PC, from `marketing/hyperframes/`:
```powershell
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name colours            # preview
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name colours -Render    # render to MP4
```

Built and rendered 2026-09-09 (`renders/colours_2026-09-09_18-09-50.mp4`),
exactly as originally spec'd; awaiting Nathan's viewing/feedback.

**Use in the teaser:** position 5 of `../teaser/` uses this render from 0:00 to 0:55 (its own 55–60s endcard is dropped; the teaser has its own closing). Cut sheet: `../teaser/README.md`. The earlier per-part feedback sheet at `../teaser/parts/05-colours/rounds/v1/FEEDBACK.md` is legacy; give feedback in `rounds/v1/FEEDBACK.md` here.

## Feedback rounds
| Round | Render | Date | Status |
|---|---|---|---|
| [v1](rounds/v1/FEEDBACK.md) | colours_v1.mp4 | 2026-09-09 | Awaiting feedback |
