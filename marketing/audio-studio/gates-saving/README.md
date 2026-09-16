# gates-saving — sound design

Source video: `../all-renders/gates-saving_v4.mp4` (12.3s, 1920x1080, silent — the
picked HyperFrames render, position 3 of the teaser).

Source code: `soundtrack.py` here — the canonical synthesis script, edited in place
each round (mirrors how `index.html` works in `../../silent-studio/gates-saving/`).

## Rounds
| Round | Render | Status |
|---|---|---|
| [soundv1](soundv1/FEEDBACK.md) | gates-saving_v4_with_sound_v1.mp4 | Reviewed — "just a pulse or a single chord", led to soundv2 |
| [soundv2](soundv2/FEEDBACK.md) | gates-saving_v4_with_sound_v2.mp4 | Built, awaiting Nathan's feedback |

## soundv3 now also pairs with the v6 silent render

virgin-cycle9 (2026-09-16) re-rendered the silent video (line-thickening and
gate-tick recolouring removed; no gate-crossing timings changed) — `soundtrack.py`
needed no edit, so `soundv3/gates-saving_v6_with_sound_v3.mp4` is the same
`soundtrack_v3.wav` muxed onto the new video. `soundv3/gates-saving_v5_with_sound_v3.mp4`
is kept alongside it (not superseded, just paired with the older visual);
`../all-renders/gates-saving_v6_with_sound_v3.mp4` is the current pick.

## Sonic direction so far
A chord progression mapped directly to the visual's beats (static route → dot starts
moving → green trail → purple/personal-best → resolve), in C major, plus a plucked
melodic arpeggio that speeds up with the runner. Full rationale and the chord table are
in `soundv2/FEEDBACK.md`; the broader project thinking (why not an AI tool, the synthesis
toolkit) is in `../APPROACH.md`.
