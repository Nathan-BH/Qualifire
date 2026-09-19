# gates-saving — soundv4

**Render:** gates-saving_v6_with_sound_v4.mp4 — `gates-saving_v6.mp4` (12.3s) **at its
native, unmodified speed** with this round's audio muxed on.
**Also here:** `soundtrack_v4.wav` — the audio alone. `bass_trimmed_12.3s.wav` — the bass
layer by itself, for reference. `melody_preview_12.3s.wav` — superseded leftover from
this round's first (wrong) attempt, kept rather than deleted (no delete permission on
this project's mount, per convention).
**Source video:** `../../../silent-studio/all-renders/gates-saving_v6.mp4` (12.3s, silent)
**Built:** 2026-09-19
**Previous round:** `../soundv3/FEEDBACK.md` (the chord progression — **kept, not
replaced**, see below)

## What this is (corrected twice by Nathan today)

First attempt in this round tried to solve "make the gates land on the beat" by
retiming the *video* to match the melody's own fixed pulse — found that impossible to
do exactly with a uniform speed change (writeup below, kept for the record). Nathan's
actual ask, once clarified: **don't touch the video's speed at all.** Instead:

- Keep gates-saving's existing soundv3 soundtrack (the Cmaj9->Am7->Fmaj7->Gadd9 chord
  progression + arpeggio) running underneath, unchanged — "use together like it is now."
- Add the melody's **E5 pulse** back in, but re-triggered *at the real gate-crossing
  times* (6.46s, 9.15s, 10.60s — from `../../../silent-studio/gates-saving/rounds/v6/FEEDBACK.md`,
  code-driven) instead of at its own original timing from the recording. So the video's
  actual gate-crossing moments each get an E5 pluck exactly on them, by construction —
  no speed math needed, no approximation.
- **The held bass (F2->G2->A2->G2) is always on**, per Nathan's follow-up — same bass
  layer as start-ride's soundv4, running underneath this too, at its own original timing,
  trimmed to 12.3s.

Three layers mixed together: soundv3's existing chords/arpeggio + the bass + three E5
gate-chimes. `../../piano/projects/interstellar/soundtrack.py`'s `gate_chimes()` builds
the E5 layer from a list of times rather than from the transcription's own clock — worth
knowing about for anywhere else a "hit exactly when X happens" cue is wanted later.

## Abandoned approach, kept for the record

The video-retiming idea from earlier today doesn't apply anymore, but the numbers behind
it are still real and might matter again: the 3 gate crossings are unevenly spaced
(2.69s, then 1.45s apart) while the melody's own pulse is almost perfectly even (every
interval ~1.9-2.1s) — so a uniform video-speed change could never have landed all three
on a beat exactly anyway. Triggering the chime by gate-time instead of by the melody's
clock sidesteps the whole problem.

## What to listen for

- Whether three E5 chimes plus the existing chord progression plus the bass is too much
  layered at once, or reads as one thing.
- Whether the E5 gate-chimes are distinct enough against the existing soundv3 material,
  or get buried in it — they share a mix now, nothing was ducked/sidechained for this
  first pass.
- Whether the bass (which was never composed with soundv3's C-major progression in mind)
  clashes or happens to sit fine under it.

## Nathan's feedback
<!-- write your notes below -->
