# Open items — cycle 12

Nothing below has been built yet. This cycle only got as far as confirming the two
transcriptions agree and restructuring the folder — the bass/ride/gates idea needs these
answered first, in order.

## Questions for Nathan

1. **Resolve the MIDI timing drift before trusting any interval as "exact."** The
   Kyutai MIDI's own clock runs 19.86 s against the WAV's real 15.01 s — about 32% long.
   If this is uniform drift, scaling every MIDI time by 15.01/19.86 ~= 0.756 should line
   it back up with the real recording; that is a hypothesis, not yet checked against the
   audio itself. Since "adjust gates-saving's speed to match exactly" only means anything
   once the target times are the *real* ones, this needs settling before anything else.
2. **Which "regular interval" did you mean** — the melody's ~1.9 s (scaled ~1.4 s)
   returns-to-E5 pulse through the whole phrase, or the fast ~0.23 s (scaled ~0.17 s)
   G2+D5 ticking figure at the end? Or the ride uses one and the gates the other? Changes
   what gets built and how gates-saving's speed gets retimed.
3. **Confirm the source WAV is what this looks like** — 15.01 s, stereo, just the piano
   phrase, no tutorial narration — before it becomes the timing reference for anything.
   Worth a listen on your end since audio can't be played back from here.

## Once those are answered

Build order: (a) MIDI -> bass-only and melody-only synthesized tracks via a new
`audio-studio/piano/projects/interstellar/soundtrack.py`, mirroring `audio-studio/`'s
existing scene scripts and vocabulary (`synth.py`); (b) mux the bass track under
`start-ride_v4.mp4`; (c) read `gates-saving_v6.mp4`'s actual gate-pass timestamps (frame
read, same method cycle 05 used for visual beats) and compute the ffmpeg `setpts` speed
ratio against the chosen interval from item 2.

## Leave feedback

Once you've had a look at `audio-studio/piano/projects/interstellar/NOTES.md` and the
idea section in this cycle's `README.md`, answers to the three items above are all that's
needed to start round 1.

## Answered by Nathan (2026-09-19, from phone)

1. **No scaling — truncate.** Confirmed: the real WAV is ~15 s, and the MIDI's clock
   is 1:1 with real time through the actual melody (last real note ends 15.04 s). The
   ~20x fast pulse after that (raw t=15.05-19.85 s) is a Kyutai hallucination past the
   end of the audio, not a tempo drift. Dropped from the usable data. Also checked: the
   Klangio PDF has no equivalent pulse either — both transcribers stop at the same real
   ending, independently. Full detail in `../../audio-studio/piano/projects/interstellar/NOTES.md`.
2. **"Regular interval" = the melody's E5 return, confirmed** — not the end pulse, which
   Nathan also flagged as likely an error (now confirmed as one, see above).
3. **Target duration — check the render lengths first.** `start-ride_v4.mp4` is 14.0 s,
   `gates-saving_v6.mp4` is 12.3 s — both shorter than the ~15 s clean phrase, so neither
   needs the full thing. Nathan is checking the source YouTube video himself to see if
   even less is needed / where the "real" clean start is.

Still open: exactly how many bars/pulses of the clean ~15 s phrase each render should
use (whole phrase trimmed to length, vs. picking a shorter sub-phrase) — Nathan to
confirm once he's checked the source video.
