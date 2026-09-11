# gates-saving — soundv1

**Render:** gates-saving_v4_with_sound_v1.mp4 — the picked render (`gates-saving_v4.mp4`
from `../../all-renders/`) with this round's soundtrack muxed on, audio+video together.
**Also here:** `soundtrack_v1.wav` — the soundtrack alone, for judging the audio without
re-watching the video.
**Source video:** ../../all-renders/gates-saving_v4.mp4 (12.3s, 1920x1080, no audio)
**Built:** 2026-09-11

## What this is

First pass: prove the pipeline works end to end (Python synthesis → ffmpeg mux) before
worrying about musicality. A cue-sheet approach — one sound per thing happening on
screen, timed by eye from the render's frames:

| Time | Visual beat | Sound |
|---|---|---|
| 0.0–3.0s | full route sits static | quiet ambient pad hold |
| 3.0s | "Save your route as reference" appears | soft two-note UI chime |
| 4.85s | caption swaps to the CTA line | whoosh transition |
| 5.0–11.8s | runner dot moves, trail lights up | rhythmic pulse, speeding 100→128bpm |
| 7.0s | trail turns green | bright rising ping |
| 9.3s | trail turns purple (personal best) | richer "level-up" chime |
| 11.7s | clip ends | resolving chord/hit |

Sound source: plain sine-wave notes (two detuned oscillators per note for a bit of
warmth) plus filtered noise for the whoosh — no chords, no melody, just isolated cues
and a mechanical pulse under the run.

## What to listen for
- Whether the cue-sheet approach (a sound per event) is enough, or it needs to feel
  like one continuous piece of music underneath — this is the question soundv2 answers
  differently.
- Whether the save-chime (3.0s), green-ping (7.0s) and purple "level-up" (9.3s) land at
  the right moments, independent of the musicality question.
- Whether the tempo ramp (100→128bpm) under the run feels motivating or just busy.

## Nathan's feedback
Reaction (paraphrased from chat): usable, but comes across as "just a pulse or a single
chord" rather than actual soft music — wanted to know if something more musical was
possible. Led directly to soundv2.
