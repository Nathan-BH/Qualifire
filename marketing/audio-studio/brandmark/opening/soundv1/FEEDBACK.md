# brandmark/opening — soundv1

**Render:** opening_v3_with_sound_v1.mp4 — the picked render with this round's
soundtrack muxed on.
**Also here:** `soundtrack_v1.wav` — the soundtrack alone.
**Script that made it:** `../soundtrack.py` (canonical — edited in place for future
rounds, see `../../structure.md`; also draws on the shared `../../synth.py` toolkit).
**Source video:** `../../all-renders/opening_v3.mp4` (6.5s, 1920x1080, no audio)
**Built:** 2026-09-11
**Previous round:** none — first pass.

## What this is

The brand's opening moment: black → "QUALIFIRE" wordmark fades in alone (~3s) →
full mark (ring + slash icon) + wordmark + tagline "Same road. New meaning." settle
in at full brightness by 6s.

Because this is the one moment meant to become recognizable on its own, it uses a
dedicated **brand chime** (defined once in `synth.py` so brandmark/opening,
brandmark/closing, and the teaser's bookends all share it):
- a rising two-note figure (G4→C5) timed to the wordmark reading clearly (~3.0s)
- answered by a richer three-note landing chord (C4/G4/C5) as the full mark lands
  (~4.3s)
- a few soft high plucks trailing off like a shimmer as the tagline settles

Underneath: near-silence for the first ~3s (just a very faint low pad + a quiet
upward whoosh timed to the fade-in), then a sustained pad carries the landing chord
to the end of the clip.

## What to listen for
- Whether the brand chime itself feels distinctive enough to recognize later (it's
  meant to recur in brandmark/closing and the teaser).
- Whether 3s of near-silence before the chime feels right, or drags.
- Balance between the chime and the shimmer tail — currently the tail is quiet
  (amp 0.06 per pluck).
- Whether "Same road. New meaning." needs its own separate musical gesture, or
  whether the landing chord's sustain reads as covering the tagline too.

## Nathan's feedback
<!-- write notes below -->
