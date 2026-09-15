# Tier colours — investigation log (2026-09-15)

## Original question
Nathan changed the purple/green tier colours in `virgin-cycle7`, then noticed the
render `marketing/silent-studio/all-renders/gates-saving_v5.mp4` looked like it used
a different colour than the app now has. Asked: what hex did I originally have, what's
in the render, what did I just update to — side by side for purple, green, yellow.

## Findings

Source: commit `c9db5d5` — "cycle7: swap tier purple/green to F1 broadcast hex, re-centre
D-030 firewall" (`app/src/ui/theme.ts`, 2026-09-15 11:50 UTC).

| Colour | Original (pre-cycle7) | In `gates-saving_v5.mp4` | Current (post-cycle7) | Status |
|---|---|---|---|---|
| Purple | `#A667F0` | `#A667F0` | `#9000C8` | changed |
| Green | `#3ED598` | `#3ED598` | `#00D000` | changed |
| Yellow | `#F5C542` | `#F5C542` | `#F5C542` | unchanged |

- `purpleDeep` also moved `#7B3FD1` -> `#65008C` (each channel x0.7 of the new purple).
- Yellow was left unchanged per the commit's own message ("per Nathan's explicit call").
- `gates-saving_v5.mp4` was rendered **2026-09-14**, one day *before* the colour-swap
  commit (2026-09-15) — so it's simply stale, not a third/different colour.
- Confirmed by sampling actual pixels out of the video (not just trusting file dates):
  purple sampled `#A566F0` (matches old `#A667F0`), green sampled `~#43C694` (matches
  old `#3ED598`, softened by video compression/anti-aliasing).
- The render's HTML source (`marketing/silent-studio/gates-saving/index.html`) **was**
  already updated to the new hex in that same commit — only the already-exported `.mp4`
  is behind. A re-render on Nathan's PC will match current app colours.

Deliverable: `qualifire_colour_comparison.png` (3-column swatch: original / render / current).

## Follow-up: phone vs. PC screen rendering

Nathan held the same `qualifire_colour_comparison.png` up on phone vs. PC and the
colours read differently — yellow/green look near-fluorescent on the phone, softer/
pastel (baby-purple/baby-green vs. normal) on the PC — even though it's the exact same
file and hex values. This is display rendering (panel type, colour profile, brightness),
not a hex difference: `#9000C8` / `#00D000` are already at **100% HSL saturation** for
their hue, so there is no "more saturated" hex to move to — the perceived intensity gap
is the screens, not the values.

To let Nathan pick a shade by eye on the phone (the screen that matters), generated a
numbered gradient instead of a single swatch:

- `qualifire_colour_gradient.png` — 9 numbered steps per hue (1 = softest/pastel,
  9 = today's exact app hex, ringed — already the most saturated point on that hue, so
  the range only extends toward pastel on the left). Yellow shown alongside as a fixed
  reference (not a gradient — no complaint about yellow's hex, only about how it renders
  on-screen).
- Purple steps: `#E2CCEA, #D7B3E5, #CE98E2, #C57BE2, #BD5CE3, #B73AE7, #B117ED, #A208DD, #9000C8`
- Green steps: `#C7E6C7, #AFE1AF, #96DF96, #7BDF7B, #5DE15D, #3DE63D, #1BEC1B, #09E209, #00D000`

**Open / waiting on Nathan:** pick a purple number and a green number from
`qualifire_colour_gradient.png` (viewed on phone). Once picked, update
`app/src/ui/theme.ts`, the marketing render sources, website CSS vars, and
`wayMapStyle.ts`'s D-030 hue-band firewall to match (same set of files `c9db5d5`
touched), then re-render the marketing videos.
