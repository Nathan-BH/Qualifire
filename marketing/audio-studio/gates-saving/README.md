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

## soundv4 (2026-09-19) — Interstellar melody idea, not yet built

A different direction, not a refinement of the chord progression above: Nathan's idea to
put the Interstellar "Time" theme's melody pulse under this scene, timed to the gate
crossings. Analysis + a plain preview clip (melody at its own pace, no retiming) are in
`soundv4/FEEDBACK.md` — a single uniform video-speed change can't land all three gates on
the beat exactly (they're unevenly spaced; the melody pulse is almost perfectly even), so
this is waiting on Nathan's call between the options laid out there before any video gets
retimed.

**Update:** soundv4 landed 2026-09-19 — bass + E5 gate-chimes (triggered at the real
gate-crossing times, not the melody's own clock) layered onto this existing soundtrack,
video untouched. See `soundv4/FEEDBACK.md`.

**Update:** soundv5 (2026-09-19) — corrected per Nathan: the chord progression above is
removed entirely for this direction, not layered under it. Bass + E5 gate-chimes only,
scoped to just the second ride (4.4-11.7s), silent the rest of the render. See
`soundv5/FEEDBACK.md`.


**Update:** soundv6 (2026-09-19) -- two fixes on top of soundv5: (1) `voice_a`
(A4,A4,B4,B4,C5,C5,D5,D5 -- the line start-ride uses) had a spurious MIDI note around
t=10s that the Klangio PDF doesn't back up; corrected (see
`../piano/projects/interstellar/NOTES.md`) and regenerated. (2) Nathan asked for all
three components together here, not just bass + E5 chimes -- soundv6 layers bass +
voice_a + E5 gate-chimes, same ride-only window (4.4-11.7s) as soundv5. See
`soundv6/FEEDBACK.md`.

**Update:** soundv7 (2026-09-19) -- Nathan approved the FluidSynth trial; adopted as
production. Same mix as soundv6 (bass + voice_a + E5 gate-chimes, same 4.4-11.7s
window), rendered with real piano samples instead of pluck()/pad(). **Current.** See
`soundv7/FEEDBACK.md`.