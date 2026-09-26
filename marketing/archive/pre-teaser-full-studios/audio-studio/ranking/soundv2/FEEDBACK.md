# ranking — soundv2

**Render:** ranking_v5_with_sound_v2.mp4 — **NOT YET BUILT.** ranking's visual
v5 (the "Today climbs the tower" redesign — see
`../../../silent-studio/ranking/rounds/v5/FEEDBACK.md`) hasn't been rendered by
Nathan yet (device_bash was unreachable this session). This round ships the
standalone `soundtrack_v2.wav` only, built against v5's exact planned timeline
(read directly from the new `index.html`, including the precise 3.2-5.4s climb
window). **Once Nathan renders `ranking_v5.mp4`** and it lands in
`../../all-renders/`, mux this wav onto it to finish this round.
**Also here:** `soundtrack_v2.wav` — the soundtrack alone.
**Script that made it:** `soundtrack.py` (canonical, see `../structure.md`;
draws on the shared `../synth.py` toolkit, which gained a new `droplet_run()`
function this round).
**Source:** v5's planned timeline (10.8s, 1920x1080 — was 10.0s in v4/soundv1).
**Built:** 2026-09-13
**Previous round:** `../soundv1/FEEDBACK.md`

## What this is

Nathan's soundv1 feedback: "Dont like this piano. I would want some kind of
'droplet crescendo'... since I want it going up in the ranking, some kind of
sound that goes from low to high pitch + goes up in speed (shorter
intervals)." The old quiet arpeggio-during-card-fade is gone. In its place:
a run of 9 short rising "droplet" plucks (`synth.py`'s new `droplet_run()`)
that starts low (A3) and slow, climbs to a bright high register, and
accelerates (the gap between drops shrinks geometrically) across **3.2-5.25s**
— exactly the same window the new visual "Today climbs the tower" animation
runs in (see the linked FEEDBACK.md), so the rising, speeding-up sound and
the rising, speeding-up row climb are the same event. It resolves into the
purple "personal best" chime the instant Today settles into slot 2 at 5.4s.

## What changed since v1
- 0.0-3.0s: unchanged calm hold while the rows fill in.
- 3.2-5.25s: quiet arpeggio-under-card-fade → the droplet crescendo (rising pitch + accelerating), synced to the new climb animation instead of the old instant slot-in.
- 5.4s: "Today" purple chime kept as the payoff moment, now landing exactly when the climb finishes rather than at an arbitrary ~6.0s.
- 5.9-10.8s (captions): kept deliberately understated, same idea as v1 — the payoff already happened during the climb.
- `synth.py` gained `droplet_run()` — a reusable rising/accelerating pluck-run, worth considering for any future "count up" or "level up" moment elsewhere in the project.

## What to listen for
- Whether the droplet run actually reads as "droplet crescendo" — 9 drops, A3→~G6, geometric interval shrink (ratio 0.82) — adjust the note count/range/shrink ratio if it doesn't match what Nathan pictured.
- Once Nathan's v5 render lands and this gets muxed on: whether the droplet run's pacing (which was built directly against the new HTML's climb timing, not a real render) actually lines up with what he sees.
- Whether the purple landing chime at 5.4s is a strong enough "arrival" moment, or needs more weight now that the whole climb builds toward it.

## Nathan's feedback
<!-- write your notes below -->
