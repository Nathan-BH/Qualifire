# start-ride — sound design

Source video: `../all-renders/start-ride_v4.mp4` (14.0s, 1920x1080, silent).

Source code: `soundtrack.py` here — canonical, edited in place each round. Draws on
the shared `../synth.py` toolkit.

## Rounds
| Round | Render | Status |
|---|---|---|
| [soundv1](soundv1/FEEDBACK.md) | start-ride_v4_with_sound_v1.mp4 | Built |
| [soundv2](soundv2/FEEDBACK.md) | start-ride_v4_with_sound_v2.mp4 | Built |
| [soundv3](soundv3/FEEDBACK.md) | start-ride_v4_with_sound_v3.mp4 | Superseded -- misread the brief, see soundv4 |
| [soundv4](soundv4/FEEDBACK.md) | start-ride_v4_with_sound_v4.mp4 | Superseded -- played the whole 14.0s, see soundv5 |
| [soundv5](soundv5/FEEDBACK.md) | start-ride_v4_with_sound_v5.mp4 | Superseded -- voice_a carried a spurious MIDI note, see soundv6 |
| [soundv6](soundv6/FEEDBACK.md) | start-ride_v4_with_sound_v6.mp4 | Superseded -- Nathan approved the FluidSynth piano engine, see soundv7 |
| [soundv7](soundv7/FEEDBACK.md) | start-ride_v4_with_sound_v7.mp4 | Superseded by v8. 2026-09-19 -- same mix/window as soundv6, rendered with real piano samples (FluidSynth) instead of pluck()/pad() |
| [soundv8](soundv8/FEEDBACK.md) | start-ride_v4_with_sound_v8.mp4 | Earlier round, kept on disk (cycle 16 changed direction). 2026-09-20 -- built and muxed, confirmed 14.000000s via ffprobe, replaced in `all-renders/` by soundv9 (cycle 16) and kept in its round folder for reference. Slice [0-14.0s] of `../ride/soundv1/ride_master_v1.wav`, same mix/window as soundv7, engine swapped to Salamander (cycle 14, no A/B) as part of the continuous "ride" master |
| [soundv9](soundv9/FEEDBACK.md) | start-ride_v4_with_sound_v9.mp4 | **Latest** 2026-09-23 -- built and muxed, confirmed 14.000000s via ffprobe, in `all-renders/`. Slice [0-14.0s] of `../ride/soundv2/ride_master_v2.wav` (stereo): Nathan's Tunetank track from 3.80 s (play pressed while the START box fades out), no synthesised layers, its own tail carries into gates-saving (cycle 16) |

## Sonic direction so far
Deliberately held-back: near-silence while the map sits on the start point, a
plain marker tone (not a "win" chime — nothing's been judged yet) as the route
starts drawing, then a gentle build (Cmaj9 → Am7) that stops short of a resolve,
since the story continues into gates-saving. Full rationale in
`soundv1/FEEDBACK.md`.
