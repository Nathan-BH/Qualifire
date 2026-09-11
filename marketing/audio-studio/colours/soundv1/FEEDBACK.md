# colours — soundv1

**Render:** colours_v2_with_sound_v1.mp4 — the picked render with this round's
soundtrack muxed on.
**Also here:** `soundtrack_v1.wav` — the soundtrack alone.
**Script that made it:** `soundtrack.py` (canonical, see `../structure.md`; draws
on the shared `../synth.py` toolkit).
**Source video:** `../all-renders/colours_v2.mp4` (19.0s, 1920x1080, no audio)
**Built:** 2026-09-11
**Previous round:** none — first pass.

## What this is

A bar chart builds in against an "avg" dashed line, then walks through three
reveals of the same tier system gates-saving uses:

| Time | Chord | Visual beat | Reveal |
|---|---|---|---|
| 0.0–5.0s | Fmaj7 | bars build in | neutral, tentative |
| ~5.0s | — | "Yellow." / "slower than your average" | plain single tone |
| 5.0–10.0s | Am7 | bar climbs | quiet lift |
| ~10.0s | — | "Green." / "Faster than your average." | bright two-note rise |
| 10.0–18.0s | Gadd9 | bar climbs further, transition | build, arpeggio speeds up |
| ~18.0s | resolves to Cmaj | "Purple." / "Faster than every one of your last ten." | peak: three-note chime + full resolve chord |

Yellow/Green/Purple reuse the same three tier tones defined once in `synth.py`
(`YELLOW_TONE`, `GREEN_CHIME`, `PURPLE_CHIME`) so this scene, gates-saving, and
ranking all share one consistent emotional coding for the three colours instead
of each inventing its own.

## Known limitation
Pure numpy/scipy synthesis, no real instrument samples — see `../APPROACH.md`.

## What to listen for
- Whether three separate plateaus (build → yellow → green → purple) read clearly
  as three distinct moments, or blur together.
- Whether the 14-18s "transition" stretch (before the Purple peak) feels like padding
  — it's the longest gap between reveals and currently just a faster, quieter
  arpeggio.
- Whether Purple's payoff is big enough relative to the other two — this is the
  scene's one clear climax.

## Nathan's feedback
<!-- write notes below -->
