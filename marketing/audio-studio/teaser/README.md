# teaser — sound design

Source video: `../../silent-studio/all-renders/teaser_v8.mp4` (47.6s, 1920x1080, silent — the assembled full video) since soundv3; soundv2 sat on teaser_v6, soundv1 on teaser_v5.

Source code: `soundtrack.py` here built soundv1–2 on the shared `../synth.py` toolkit; not used from soundv3 on (cycle 16: no synthesised sound moves forward).

## Rounds
| Round | Render | Status |
|---|---|---|
| [soundv1](soundv1/FEEDBACK.md) | teaser_v5_with_sound_v1.mp4 | Earlier round, kept on disk for reference (synthesised). Built, awaiting Nathan's feedback |
| [soundv2](soundv2/FEEDBACK.md) | teaser_v6_with_sound_v2.mp4 | Earlier round, kept on disk for reference (synthesised). Built, awaiting Nathan's feedback |
| [soundv3](soundv3/FEEDBACK.md) | teaser_v8_no_sound_v3.mp4 | **Silent round** 2026-09-23, cycle 16 — the synthesised composition is dropped; the cut's scenes are being re-sounded in cycle 16 (ride, opening) and applying those to the teaser is a later follow-up. Picture is now v8 (was v6). In `../all-renders/`. |

## Sonic direction so far
Built as an **independent composition** (per Nathan's steer), not a concat of the
other scenes' soundtracks — resolves the open question `../APPROACH.md` used to
carry about this. Reuses the shared brand chime and tier chimes so it feels like
the same sonic world as the individual scenes, under one continuous chord arc.
Scene-by-scene timing (confirmed by reading extracted frames) and the one notable
finding — `colours_v2.mp4`'s bar-chart scene doesn't appear in this cut — are in
`soundv1/FEEDBACK.md`.

soundv2 (built after cycle 06's gates-saving/ranking/closing feedback round)
tightened this further: because `teaser_v6.mp4` is a literal concat of five
complete, unmodified scene renders, every section's internal timing now lines
up exactly 1:1 with that scene's own standalone soundtrack. Each section's
foreground motif was updated to echo its scene's *current* sound at the exact
right instant (the opening/closing two-beat BRAND_STINGER, gates-saving's
boosted C-G-Am-F loop, ranking's droplet crescendo) while keeping the same
one-continuous-arc identity — see `soundv2/FEEDBACK.md`.
