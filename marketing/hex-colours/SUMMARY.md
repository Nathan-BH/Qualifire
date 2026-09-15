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

## Round 2 — phone colour-wheel picks (screen-rendering mismatch)

Nathan compared the same `qualifire_colour_comparison.png` on phone vs. PC and the
colours read differently (yellow/green near-fluorescent on phone, purple/green softer
"baby"-pastel on PC) despite identical hex — this is screen rendering, not a hex bug:
`#9000C8`/`#00D000` are already at 100% HSL saturation, so there's no more-saturated hex
to move to. Sent `qualifire_colour_gradient.png` (9 numbered steps per hue, pastel ->
today's exact app hex) so he could pick a shade by eye on the phone.

Instead, Nathan used a colour wheel on his phone to manually match what he sees on the
PC screen, picking these as the "true" perceptual match:

| Component | Current PC/app hex | Phone colour-wheel match |
|---|---|---|
| Yellow | `#F5C542` | `#FFE99C` |
| Green | `#00D000` | `#7B9C4D` |
| Purple | `#9000C8` | `#6D4E9C` |

Notably the green/purple picks are much LESS saturated (S≈0.33 vs. 1.0) than the current
app hex — consistent with his phone rendering fully-saturated colours more intensely
than intended.

Built `qualifire_colour_gradient_v2.png`: three rows (purple/green/yellow), each a
9-step gradient centred on his phone pick (swatch 5, ringed = his pick exactly), fanning
paler/more washed-out to the left and deeper/more saturated to the right, with the
current PC/app hex shown as a reference chip alongside each row.

**Open / waiting on Nathan:** confirm a swatch number (1-9) per row from
`qualifire_colour_gradient_v2.png`, viewed on phone. Once confirmed, update
`app/src/ui/theme.ts`, marketing render sources, website CSS vars, and
`wayMapStyle.ts`'s D-030 hue-band firewall to the chosen hex codes, then re-render the
marketing videos.

## Round 3 — green pick revised

Nathan revised the green centre pick to `#9BCF5B` (up from `#7B9C4D` — lighter, more
saturated: L=0.584/S=0.547 vs. the round-2 pick's L=0.457/S=0.339). Rebuilt
`qualifire_colour_gradient_v3.png` with the green row re-centred on `#9BCF5B`; purple
(`#6D4E9C`) and yellow (`#FFE99C`) rows unchanged from round 2.

**Open / waiting on Nathan:** confirm a swatch number (1-9) per row from
`qualifire_colour_gradient_v3.png`.

## Round 4 — final picks confirmed, shipped (cycle8)

Nathan confirmed from `qualifire_colour_gradient_v3.png`: **yellow 7, green 6, purple 5**.

| Component | Final hex |
|---|---|
| Purple | `#6D4E9C` |
| Green | `#8BCD39` |
| Yellow | `#FFDE6D` |
| purpleDeep (derived, ×0.7 of purple) | `#4C376D` |

Shipped via `cycles/virgin-cycle8/` (full Digest→Plan→Execute→Inspect pipeline, PASS WITH
NOTES): `app/src/ui/theme.ts`, the D-030 hue-band firewall in `wayMapStyle.ts` (re-centred —
these picks land on different hues than the previous round, not just different
saturation/lightness), every marketing/product file the cycle7 colour commit touched, plus a
few yellow-only spots that round didn't need (brandmark HTML, the monogram/wordmark SVG), and
the launcher icon (`app/assets/icon.png`/`adaptive-icon.png`, recoloured via a new 3-colour
decomposition script so the icon's ring edge isn't tinted — reaches the phone only at the next
numbered build, not over Fast Refresh). Also added: `scripts/dev-phone.ps1`/`.cmd` to start
the Expo dev server for testing JS-only changes live on the phone's dev-client build.

Full detail: `cycles/virgin-cycle8/README.md`, `BRIEF-colours-round2.md`,
`DIGEST-colours-round2.md`.

**Closed** — nothing further open on the colour question itself.

## Round 5 — verdict: rejected on phone (2026-09-15)

Nathan tested `6da58a2` (cycle8's round-2 picks) live on his phone via `scripts/dev-phone.ps1`.
Verdict, quoted: "although they are closer to the pc colours, on the phone they are too
faint. So i would just keep the current colours we have." — i.e. he wants cycle7's
F1-broadcast hex back (`#9000C8` purple / `#00D000` green / `#F5C542` yellow, `purpleDeep`
`#65008C`), not cycle8's phone-matched picks.

He explicitly asked to only **log** this for now, not revert the code: "no change needed
for now, just log for now that i dont like the new colours and that i want to keep the
current ones." So the app still ships cycle8's hex as of this writing — the revert is an
open item (`OPEN-ITEMS.md`), not yet executed.

He also floated, unprompted, that there may be "a better way to use the colours" —
no specification given yet; not actioned, just noted for whenever he wants to pick it up.

**Status: colour question is now open again** (cycle8's picks rejected; revert to cycle7
pending; "better way to use colours" idea parked, unspecified).
