# start-ride — soundv3

**Render:** start-ride_v4_with_sound_v3.mp4 — `../../../silent-studio/all-renders/start-ride_v4.mp4`
(14.0s) with this round's audio muxed on.
**Also here:** `soundtrack_v3.wav` — the audio alone.
**Source video:** `../../../silent-studio/all-renders/start-ride_v4.mp4` (14.0s, silent)
**Built:** 2026-09-19
**Previous round:** `../soundv2/FEEDBACK.md` (the original Cmaj9->Am7 chord-progression
direction — untouched, still there if this idea doesn't stick)

## What this is

A different direction, not a refinement of soundv2: Nathan's idea to use the piano
cover of Interstellar's "Time" theme he'd been transcribing (see
`../../piano/projects/interstellar/`) as source material — specifically, just its held
bass line (F2 -> G2 -> A2 -> G2, each ~3.2-3.8s) as an ambient swell under this scene's
establishing shot, instead of writing a new chord progression from scratch.

Source: `../../piano/projects/interstellar/soundtrack.py` re-synthesizes the bass notes
from the clean, cross-checked MIDI pitch/timing data (not extracted from the original
recording) using the shared `pad()` synth — same toolkit as every other scene, no new
dependency. Full pitch/timing verification is in that folder's `NOTES.md`.

`bass_only.wav` runs 15.04s (the real content — the transcription's spurious tail past
that point is excluded, see NOTES.md); trimmed to the video's 14.0s with a 0.5s fade-out
over the last held note, which is genuinely mid-sustain at the cut (G2, started 11.84s,
would naturally run to 15.04s) — the fade is there so it doesn't just stop hard.

## What to listen for

- Whether the swell (walking bass alone, no melody) reads as "ambient bed" the way
  Nathan pictured, or feels too bare without the melody on top.
- Whether the 0.5s fade-out at 14.0s is enough, or the loss of ~1s of the natural note
  length is noticeable.
- This is bass only, on purpose — the melody line (`melody_only.wav`, same source) is
  being tried separately against gates-saving instead (see `../../gates-saving/soundv4/`).

## Nathan's feedback
<!-- write your notes below -->
