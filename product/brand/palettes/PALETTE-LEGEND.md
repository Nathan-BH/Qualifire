# `product/brand/palettes/` — brandboard-slug to lettered-candidate legend

Added 2026-09-08 (D5.0, Sonnet Execute) so "does `brandboard_golden.png` mean
candidate B?" doesn't have to be re-derived by eye every time this folder gets
opened.

## Short answer

The four `brandboard_{daylight,golden,navy,night}.png` boards (`make_palette_boards.py`,
"ROUND 2") are **not** a renamed 1:1 set of the six lettered `palette_A..F` composites
(`make_palette_trials.py`, "ROUND 1"). They are a later, separate exploration on a
different axis. Round 1 varied only the **yellow hue** on one fixed dark background;
round 2 (per its own docstring: *"varying only the yellow hue is invisible at board
scale"*) instead varies the **whole colour architecture** — background/card/ink tone —
and mostly keeps the same yellow. Only two of the four slugs actually correspond to a
lettered candidate's *yellow*, and none of the four match a candidate's full palette
(background included), because round 1 never varied the background.

| Brandboard slug | Yellow hex used | Matches candidate | Confidence | Why |
|---|---|---|---|---|
| `night` | `#F5C542` | **A — signal** | High | `night` is coded as `{}` (zero overrides) — it *is* the current shipped identity, byte-for-byte the same background/card/ink/yellow as `theme.ts` and as `palette_A_signal.png`'s yellow. Verified: pixel-exact `#F5C542` match at the same swatch position in both images. |
| `golden` | `#F1C40F` | **B — vibrant gold** | High (yellow only) | `make_palette_boards.py`'s `golden` override explicitly sets `YEL='#F1C40F'`, which is candidate B's exact hex (`make_palette_trials.py` line for `B_vibrant_gold`). Verified: pixel-exact `#F1C40F` match at the same swatch position in both images. **But** `golden`'s background/card/ink are a new warm brown-charcoal architecture (`#1B1508` / `#28200E` / cream ink) that round 1 never tested — so "golden = B" is only true for the yellow, not the whole look. |
| `daylight` | `#F5C542` (unchanged default) | No lettered candidate | N/A | Keeps A/`night`'s yellow but puts it on an all-new warm-white ground (`#FAF7EE`) with charcoal ink — the "flip to daylight" idea, which round 1 (all-dark composites) never explored at all. Closest available comparison is A's yellow, not a distinct candidate. |
| `navy` | `#F5C542` (unchanged default) | No lettered candidate | N/A | Same yellow as A/`night` again, on a deep-navy ground (`#131B2B`) — another new architecture with no round-1 counterpart. |

Candidates **C (two-tone gold, `#F9CA24`)** and **E (cool-gray, `#F4D03F`)** do not appear
in any of the four brandboards — checked by pixel search, not found in any board. They
were composited in round 1 (`palette_C_two_tone.png`, `palette_E_cool_gray.png`) but never
carried forward into a 12-panel board. Per `README.md`, "B vibrant gold, C two-tone and E
cool-gray were never reviewed" — this legend doesn't change that; it only clarifies that
`golden` is B's yellow wearing a new outfit, and that C/E have no board at all.
D (`palette_D_butter.png`) and F (`palette_F_teal_whisper.png`) were rejected at the
composite stage and likewise never got boards.

## How this was checked

1. Read `make_palette_trials.py` (round 1 `CANDS` list — the six lettered hexes) and
   `make_palette_boards.py` (round 2 `CANDS` dict — the four slug override dicts) and
   `make_brandboard.py` (the shared defaults `night`/`daylight`/`navy` inherit from).
2. Cross-checked the *coded* hex values above against the actual PNG pixels with PIL —
   sampled the background swatch (top-left panel interior) and searched each board for an
   exact-match pixel of `#F5C542` and `#F1C40F` (tolerance ±3). Every prediction from the
   source code matched the rendered pixels exactly; no other candidate hex (`#F9CA24`,
   `#F4D03F`, `#F7DC6F`) appears anywhere in any of the four boards.

## Bottom line for whoever picks a brand palette next

If the decision is "which colour architecture" (background/card/ink), compare the four
boards on their own terms — `night` (current), `daylight`, `navy`, `golden` — they're four
real options, not four codenames for A/B/C/E. If the decision is narrower — "which yellow
hue" — only A and B were ever actually rendered into a full board (as `night` and `golden`
respectively); C, D, E, F stayed single-composite trials and would need a new board run to
compare at this scale.
