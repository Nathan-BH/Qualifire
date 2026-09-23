# colours — sound design

Source video: `../../silent-studio/all-renders/colours_v4.mp4` (19.0s, 1920x1080, silent) since soundv2; soundv1 sat on v2.

Source code: `soundtrack.py` here built soundv1 on the shared `../synth.py` toolkit; not used from soundv2 on (cycle 16: no synthesised sound moves forward).

## Rounds
| Round | Render | Status |
|---|---|---|
| [soundv1](soundv1/FEEDBACK.md) | colours_v2_with_sound_v1.mp4 | Built 2026-09-11 (synthesised tier chimes) — earlier round, kept on disk for reference |
| [soundv2](soundv2/FEEDBACK.md) | colours_v4_no_sound_v2.mp4 | **Silent round** 2026-09-23, cycle 16 — synthesised tier chimes dropped with the rest; picture is now v4. In `../all-renders/`. |

## Sonic direction so far
A bar chart climbs through three labelled reveals — Yellow → Green → Purple —
each mapped to a chord (Fmaj7 → Am7 → Gadd9, resolving to Cmaj on Purple) plus the
same three tier tones gates-saving and ranking use (`YELLOW_TONE` / `GREEN_CHIME` /
`PURPLE_CHIME` in `../synth.py`), so all three scenes share one consistent
emotional coding for the colours. Full rationale and the chord-per-reveal table are
in `soundv1/FEEDBACK.md`.
