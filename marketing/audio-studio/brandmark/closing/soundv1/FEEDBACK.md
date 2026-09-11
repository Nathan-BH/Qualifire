# brandmark/closing — soundv1

**Render:** closing_v2_with_sound_v1.mp4 — the picked render with this round's
soundtrack muxed on.
**Also here:** `soundtrack_v1.wav` — the soundtrack alone.
**Script that made it:** `../soundtrack.py` (canonical, see `../../structure.md`;
draws on the shared `../../synth.py` toolkit).
**Source video:** `../../all-renders/closing_v2.mp4` (4.0s, 1920x1080, no audio)
**Built:** 2026-09-11
**Previous round:** none — first pass.

## What this is

The sign-off: near-black with the dim mark barely visible (0-1.5s), brightening
steadily to the full bright mark + wordmark + tagline "Same road. New meaning."
by 3.5-4.0s.

This deliberately doesn't replay brandmark/opening's full chime — it plays the
**same landing chord** from the shared brand chime (`BRAND_CHIME_LAND` in
`synth.py`) on its own, quieter and with a longer release, like an echo of the
opening rather than a second full statement. No separate "rise" gesture, since
there's no equivalent build-up moment in this 4-second clip.

## Known limitation
Same as every scene here: pure numpy/scipy synthesis, no real instrument
samples. See `../../APPROACH.md` for the soundfont/fluidsynth situation.

## What to listen for
- Whether reusing only the landing half of the brand chime (no rise) reads as
  "the same brand sound, quieter" or just as a different, weaker sound.
- Whether 4 seconds is too short for the chime to register at all — it's the
  shortest clip in the whole project.
- Whether this should end mid-ring (as it does now, into silence) or resolve
  more definitively for a "the end" feeling.

## Nathan's feedback
<!-- write notes below -->
