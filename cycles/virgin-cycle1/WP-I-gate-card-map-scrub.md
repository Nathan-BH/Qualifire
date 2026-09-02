**Status: NOT STARTED. Map half blocked on WP-C. Scrub half blocked on Q1 (re-opening the settled tap-then-nudge STATE.md rule) — see QUESTIONS-FOR-NATHAN.md.**
**Review doc item: 9. Size: medium.**

## What it is

Two independent halves:
1. **Map half** (T — already scoped in `gateAdjustCard.tsx`'s own header comment, "the map-mirror joins when user routes become drawable"): show the route trace + gates on the gate-adjustment card's map instead of "a plain line." Needs a chainage-override prop on `RouteMapView` (WP-C's brief already flags this and designs the builder signature to support it) since the card's un-saved nudges live in local state until SAVE.
2. **Scrub half** (N): Nathan's ask — tap a gate to select it, then slide a finger left/right anywhere to scrub the gate earlier/later along the ride. STATE.md's settled ground rule is "adjustment UI is tap-then-nudge with ± buttons, never finger-dragging (thumb covers the line)." The review's read: this may not actually be the thing the rule was written against (your finger isn't on the line, it's a horizontal scrub with the gate riding the path) — but it still needs an explicit re-opening of that rule before anyone plans it, since STATE.md is binding.

## Why it's blocked

Map half: needs WP-C's runtime `RouteAsset` builder to exist first. Scrub half: needs Q1 answered — review's own recommendation is "keep the existing ± pad (built, glove-friendly), add the scrub as an alternative input on top of the same selection model — both are select-first-then-move, so they coexist," but that's a recommendation, not a ruling.

## Once answered

Map half can be planned and executed as soon as WP-C lands, independent of the scrub question. Don't block the map half on Q1 — they're genuinely separable.
