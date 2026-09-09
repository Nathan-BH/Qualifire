# gate — The Gate (HyperFrames composition)

5-second branded bumper: ring draws, slash lands, QUALIFIRE fades in, cuts
to black. Reusable sting for the start/end of other videos. 1920x1080, id
`gate`, one paused GSAP timeline (`window.__timelines.gate`); only external
asset is the GSAP CDN script.

On your PC, from `marketing/hyperframes/`:
```powershell
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gate            # preview
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gate -Render    # render to MP4
```
Or, from this folder: `npx hyperframes preview` / `npx hyperframes render`.

Built 2026-09-09, not yet rendered.
