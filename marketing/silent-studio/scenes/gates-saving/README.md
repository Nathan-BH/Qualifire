# gates-saving — product scene (HyperFrames composition)

> 2026-09-26 (marketing cycle 24): this folder now holds only this scene's canonical source. Its renders/
and rounds/ history (the links in the status table below) moved to
marketing/archive/pre-teaser-full-studios/silent-studio/gates-saving/. Edits here reach the teaser only via
../../build_teaser_full.py → ../../teaser-full/compositions/.

One of the three product scenes of the app preview; position 3 of ../teaser/.
Feedback for this scene goes in the most recent round's FEEDBACK.md here (currently v9).

Source code: `index.html` here (built 2026-09-10 from scratch — the legacy `tour/index.html`
no longer exists). Needs `map.png` next to it, captured once via `../_map/map-capture.html`
(see `../_map/README.md`). Render with `.\render.ps1 -Name gates-saving -Render` from
marketing/silent-studio/. v1 was a cut of tour's render — in/out points in ../teaser/README.md.

Duration: 12.3s.

## Feedback rounds
| Round | Render | Date | Status |
|---|---|---|---|
| [v1](rounds/v1/FEEDBACK.md) | gates-saving_v1.mp4 | 2026-09-10 | Awaiting feedback |
| [v2](rounds/v2/FEEDBACK.md) | gates-saving_v2.mp4 | 2026-09-10 | Built, awaiting Nathan's render |
| [v3](rounds/v3/FEEDBACK.md) | gates-saving_v3.mp4 | 2026-09-10 | Built, awaiting Nathan's render |
| [v6](rounds/v6/FEEDBACK.md) | gates-saving_v6.mp4 | 2026-09-16 | Built, awaiting Nathan's render — cycle 9 render-remake (no line thickening, white ticks) |
| [v7](rounds/v7/FEEDBACK.md) | gates-saving_v7.mp4 | 2026-09-20 | Rendered + muxed, verified — melody-synced ride pacing (RIDE_WARP), gate-chime retired from audio. Superseded by v8. |
| [v8](rounds/v8/FEEDBACK.md) | gates-saving_v8.mp4 | 2026-09-20 | Rendered — replaced by v9 (the surge direction was backwards) — duration confirmed via ffprobe at exactly 12.300000s. Surge pacing designed from the E5 interval, gates at exact quarters 0.25/0.50/0.75 on five pulses, caption "your" upright / "self" italic (cycle 14) |
| [v9](rounds/v9/FEEDBACK.md) | gates-saving_v9.mp4 | 2026-09-24 | Rendered, current — gate easing inverted (cycle 17): slow at every E5 pulse, fast mid-leg; gate times and positions unchanged, 12.300000 s confirmed, motion verified by `../../cycles/17_silent-versions-gate-easing-and-tool-ui/check_rider_motion.py` |
