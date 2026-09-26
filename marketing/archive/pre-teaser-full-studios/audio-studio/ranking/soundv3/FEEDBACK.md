# ranking — soundv3

**Render:** `ranking_v6_with_sound_v3.mp4` — paired with the new silent
`../../../silent-studio/ranking/rounds/v6/ranking_v6.mp4` (10.8s, unchanged
duration).

## Why this round exists

The visual round (virgin-cycle9, 2026-09-16) changed three things in
`ranking/index.html`: the climb-to-position-2 easing (`power1.inOut` →
`power2.out`, same 3.2–5.4s window), one caption removed (only "Compare
against yourselfs" remains, 5.9–10.8s), and — the one that actually
required an audio change — **the "Today" row is now green, not purple**
(it's a P2 finish, not a personal best).

## What changed in `soundtrack.py`

Only one substantive edit: the settle chime at 5.4s swapped `PURPLE_CHIME`
→ `GREEN_CHIME`, so the sound now agrees with the visual about what kind of
result this is. Docstring/comments updated to match.

## What did NOT change, and why

- **Climb crescendo (`droplet_run`, t0=3.2, t1=5.25):** the new ease curve
  changes when Today passes each intermediate row, but the crescendo isn't
  tied to those intermediate crossings — it's one continuous glide from the
  climb's start to its settle, and both of those instants (3.2s, 5.4s) are
  unchanged by the ease swap. No retiming needed.
- **Caption-adjacent pads (5.9s Cmaj9 hold, 8.2s Cmaj resolve):** these were
  never keyed to two separate captions appearing — they're a two-stage
  settle that happens to start when the (now single) caption fades in.
  Since that fade-in is still at 5.9s, nothing needed to move.

## Things to check

- [ ] Green settle chime doesn't read as a downgrade/letdown — it's still
      a positive musical resolution, just not the "personal best" one.
- [ ] No audible gap or click at the 5.4s chime given the ease-curve change
      shifted nothing here, but worth a listen since it's the one edited beat.
