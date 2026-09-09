# purple — Why purple is rare (HyperFrames composition)

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
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name purple            # preview
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name purple -Render    # render to MP4
```

Built 2026-09-09, not yet rendered, exactly as originally spec'd; awaiting
Nathan's viewing/feedback.
