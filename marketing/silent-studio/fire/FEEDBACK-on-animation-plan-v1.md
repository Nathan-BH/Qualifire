# Nathan's feedback on animation plan v1

Date: 2026-09-29 (23:13). Applies to **iteration 1**: `flame-animations.html` + `FLAME-ANIMATION-PLAN.md` (both unchanged, kept as the v1 record). The revised versions are `flame-animations_v2.html` + `FLAME-ANIMATION-PLAN_v2.md`.

## Verbatim
1. "i think any realistic shiver should change the shape of the flame spikes, like when a flame moves in the wind more. It would be like a transition where it changed then locks back in the fixed configuration"
2. "If there is a grow outwards aimation it should start with the smallest flame of the tree and grow like that in the correct order ?"
3. "Animation B is a no no as it is a different flame alltogether"

## What each point means for the work
| # | Feedback | Applies to v1 | Change made in v2 |
|---|---|---|---|
| 1 | Shiver must reshape the spikes (tips, left tongue, notch), like wind, then lock back to the fixed flame | D (tip whip), E (skew only), F | D, E, F rebuilt: the silhouette morphs through several "gust" shapes, then settles (small overshoot) and locks on the exact chosen flame. Old E (skew) does not change spike shape, so it is replaced. |
| 2 | Growth must begin with the smallest flame and go in the correct order (smallest to largest) | A (started with the yellow layer, core last: wrong order) | A rebuilt as two options, both starting from the smallest (core) flame: A2a seed that hollows out at the end, A2b core outline traced first. Then yellow, then outer. |
| 3 | B is rejected: it ends as a different flame | B ("ride by ride", 4 rings) | B removed from v2. Rule: **every animation must end on the exact chosen 3-layer flame.** The "ring count = rides" idea in plan v1 is parked for the same reason. |

C (breathe) had no comment and is kept unchanged.

## Standing rules taken from this feedback
- Animations start from and end on the canonical flame (`qualifire_flame_layered_*`), never a different shape.
- Realistic motion = shape change, not just moving/tilting the whole layer.
- Growth order = smallest (innermost) to largest.
