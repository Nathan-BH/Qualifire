# teaser — soundv2

**Render:** teaser_v6_with_sound_v2.mp4 — the confirmed teaser_v6.mp4 (47.6s,
built 2026-09-14) with this round's soundtrack muxed on.
**Also here:** `soundtrack_v2.wav` — the soundtrack alone.
**Script that made it:** `soundtrack.py` (canonical, edited in place — see
`../structure.md`; draws on the shared `../synth.py` toolkit).
**Source video:** `../all-renders/teaser_v6.mp4` (47.6s, 1920x1080, no audio)
**Built:** 2026-09-14
**Previous round:** `../soundv1/FEEDBACK.md`

## What this is

Cycle 06 changed three of the five teaser ingredients (gates-saving, ranking,
brandmark/closing) and each got its own new soundtrack this cycle. This round
rebuilds the teaser's own independent composition to match: same overall
approach as soundv1 (one continuous C-major-family chord arc under the whole
thing, not a concat of the other scenes' audio — that was Nathan's original
steer and still holds), but every section's foreground motif now echoes its
scene's *current* sound, at the *exact* right instant.

That's possible with unusual precision this round because `teaser_v6.mp4` is a
literal back-to-back concat of five complete, unmodified scene renders — so
every section's internal timing lines up 1:1 with that scene's own standalone
soundtrack, just shifted by the section's start time. Confirmed section
boundaries (all durations from the actual render, not estimates):

| Time | Section | Echoes |
|---|---|---|
| 0.0-6.5s | brandmark/opening | opening/soundv2: ring-draw sweep, whoosh, two-beat BRAND_STINGER at 2.95s/3.35s |
| 6.5-20.5s | start-ride | start-ride/soundv2: hush, click at 9.7s, riser, C-G-Am-F loop at 155bpm |
| 20.5-32.8s | gates-saving | gates-saving/soundv3: whoosh, same C-G-Am-F loop boosted 165->210bpm, gate pings |
| 32.8-43.6s | ranking | ranking/soundv2: droplet crescendo (36.0-38.05s), purple landing chime |
| 43.6-47.6s | brandmark/closing | closing/soundv2: the same two-beat BRAND_STINGER reprised in full |

## What changed since v1
- Rebuilt for teaser_v6 (47.6s, was 46.9s) — same five ingredients, three new rounds.
- Opening/closing sections replaced the old BRAND_CHIME_RISE/LAND pair with the
  new two-beat BRAND_STINGER (matching both scenes' own soundv2), so the
  teaser's brand bookends now sound the same as the standalone scenes.
- start-ride section now has a real hush before a click (not silence to true
  zero — see judgment call below) instead of a calm building pad from the start.
- gates-saving section swapped its old FMAJ7/GADD9 climb arc for the same
  C-G-Am-F loop as start-ride, tempo-boosted — echoing the "same tune, faster
  and happier" idea from Nathan's gates-saving feedback.
- ranking section replaced the old plain arpeggio with the droplet crescendo,
  timed to land at exactly 36.0-38.05s (absolute), matching the new "Today
  climbs the tower" visual.

## What to listen for
- **The start-ride hush (6.6-9.7s) uses a very quiet trailing pad (rms ~0.0065)
  rather than true silence**, unlike the standalone scene's actual zero-amplitude
  hush — a deliberate compromise so the "one continuous piece" doesn't have a
  hard dropout in the middle. Flag if it should go all the way to silence
  instead, matching the standalone scene exactly.
- Whether reusing the boosted C-G-Am-F loop for gates-saving (right after
  start-ride's own use of it) reads as connected or repetitive back-to-back —
  same open question as gates-saving's own soundv3.
- Whether the two brand-stinger bookends (0.0-6.5s and 43.6-47.6s) feel
  connected across the full 47.6s runtime, now that they're the exact same
  motif rather than the old rise/land pair.
- General balance/levels across the whole piece — built and level-checked in
  isolation (peak 0.9, no clipping) but not yet heard back-to-back against the
  actual picture at full length.

## Nathan's feedback
<!-- write notes below -->
