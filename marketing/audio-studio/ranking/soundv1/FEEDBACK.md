# ranking — soundv1

**Render:** ranking_v4_with_sound_v1.mp4 — the picked render with this round's
soundtrack muxed on.
**Also here:** `soundtrack_v1.wav` — the soundtrack alone.
**Script that made it:** `soundtrack.py` (canonical, see `../structure.md`; draws
on the shared `../synth.py` toolkit).
**Source video:** `../all-renders/ranking_v4.mp4` (10.1s, 1920x1080, no audio)
**Built:** 2026-09-11
**Previous round:** none — first pass.

## What this is

Holds on the finished coloured route (0-3s), a "LAST TEN RIDES / THIS ROUTE" card
fades in and the list settles (3-6s), the "Today" row lights up purple at ~6s
("17:08.9"), then the caption "Compare against yourselfs" appears and holds to
the end.

| Time | Chord | Visual beat |
|---|---|---|
| 0.0–3.0s | Cmaj9 | quiet hold on the route |
| 3.0–6.0s | Cmaj9 (arpeggio) | card fades in, list settles |
| ~6.0s | — | "Today" lights up purple — the payoff (reuses `PURPLE_CHIME`) |
| 7.5–10.1s | resolves to Cmaj | caption holds |

Purple is this project's "peak / personal best" colour (same `PURPLE_CHIME` used
in gates-saving and colours), so the one clear musical event in this scene is
built entirely around that moment rather than around the card fading in, which
stays deliberately understated.

## Known limitation
Pure numpy/scipy synthesis, no real instrument samples — see `../APPROACH.md`.

## What to listen for
- Whether the 3s opening hold (before the card even appears) needs more going on,
  or whether the quiet is right since the visual is quiet too.
- Whether the "Today" purple reveal lands with enough weight given it's the only
  real event in a 10s clip.
- Whether the ending resolve (7.5-10.1s) is too quick given the caption sits on
  screen for a while.

## Nathan's feedback
Dont like this piano. I would want some kind of "droplet crescendo" I dont know how to describe it. Since I want it going up in the ranking, some kind of sound that goes from low to high pitch + goes up in speed (shorter intervals)?
