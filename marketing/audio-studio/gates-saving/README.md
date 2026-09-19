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

**Update:** soundv8 (2026-09-20) -- direction change, not a bugfix. The soundv7
near-collision (gate-chime + voice_a's own A4 landing 80ms apart around 6s) turned out
to be real, not broken -- but Nathan's call was to remove the synthesized chime
entirely rather than avoid the collision: "the audio should be the real reference,
there should be no extra sound for the gates crossing." Audio is now just bass + the
untouched melody. The video's RIDE now varies speed instead (see
`../../silent-studio/gates-saving/index.html`'s `RIDE_WARP`) so the gates land on the
melody's own beats. Rendered and muxed 2026-09-20 --
`soundv8/gates-saving_v7_with_sound_v8.mp4` is **current**. Gate-crossing timing
verified two ways: frame extraction (rider dot sits exactly on each gate tick at
5.32/7.18/9.05s) and an onset scan of the audio (attacks land within ~20ms of target).
See `soundv8/FEEDBACK.md` for the full before/after table and the one open item (first
ride leg's ~3x speed-up hasn't been watched at full speed yet).