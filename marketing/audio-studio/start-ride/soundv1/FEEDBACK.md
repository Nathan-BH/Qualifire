# start-ride — soundv1

**Render:** start-ride_v4_with_sound_v1.mp4 — the picked render with this round's
soundtrack muxed on.
**Also here:** `soundtrack_v1.wav` — the soundtrack alone.
**Script that made it:** `soundtrack.py` (canonical, see `../structure.md`; draws
on the shared `../synth.py` toolkit).
**Source video:** `../all-renders/start-ride_v4.mp4` (14.0s, 1920x1080, no audio)
**Built:** 2026-09-11
**Previous round:** none — first pass.

## What this is

Black fading in on a still map point with no route yet (0-4s), a brief hold on
the located dot (4-8s), then the caption "Ride your normal route." appears as a
plain yellow route starts drawing across the map (8-14s).

Nothing is judged yet at this point in the story — no tier colours, no result —
so this stays intentionally plain and held-back:

| Time | Chord | Visual beat | Feel |
|---|---|---|---|
| 0.0–4.0s | (bare low tone) | still map point, no route | held-back, sparse |
| 4.0–8.0s | Cmaj9 | hold on start point | quiet settling |
| ~8.0s | — | caption + route starts drawing | plain marker tone (`YELLOW_TONE`) |
| 8.0–14.0s | Am7 | route draws across the map | gentle build, no big resolve |

Deliberately uses the neutral `YELLOW_TONE` rather than any of the "win" chimes
(`GREEN_CHIME`/`PURPLE_CHIME`) — this is just the start of a normal ride, and the
payoff moments are saved for gates-saving/colours/ranking.

## Known limitation
Pure numpy/scipy synthesis, no real instrument samples — see `../APPROACH.md`.

## What to listen for
- Whether 4 seconds of near-silence at the very start feels intentional or just
  empty — it's the longest quiet stretch of any scene.
- Whether ending without a resolve (the arpeggio just stops at 14.0s) feels
  unfinished, or reads correctly as "the story continues" into the next scene.
- Whether the build from 8-14s is paced right against the route actually drawing
  on screen (timing was estimated from extracted frames, not frame-exact).

## Nathan's feedback
1)No sound before clicking the button.
2) upon clicking add a clicking sound
3) more upbeat music during the ride, not this mellow piano. More something like how a mario kart soundtracj would be during a race?