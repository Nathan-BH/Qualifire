**Status: NOT STARTED. Blocked on WP-C (drawable user routes — trace-on-map needs it) AND on Q4 + a navigation-model decision (see QUESTIONS-FOR-NATHAN.md).**
**Review doc item: 8. Size: medium (large if a real navigation stack is needed).**

## What it is

RIDES tab is an in-list accordion with export/delete demoted into the expanded row — nothing full-screen, no trace, no set-as-reference, no ignore-from-ranking. The ask: a proper full-screen "ride detail" view, reachable both from RIDES (tap) and as the post-stop destination (replacing/augmenting Result).

## Why it's blocked

1. Trace-on-map inside it needs WP-C.
2. Review open question 4: does RESULTS survive as a stats tab, or does 4-tab layout drop it in favour of this new screen absorbing its job?
3. A genuine design decision, not just an answer: does this need the tab navigator to grow a real navigation stack (the app currently only has tab-switching plus in-tab "phases," e.g. RECORD's armed/running states), or can it reuse that same in-tab-phase idiom? This affects the size estimate a lot and should be decided together with, not before, WP-F's follow-on hook (§8 of that brief) since they'll likely share code.

## Once answered

Plan this together with WP-F's follow-on hook and WP-I's map-half (both want to embed inside whatever this screen ends up being).
