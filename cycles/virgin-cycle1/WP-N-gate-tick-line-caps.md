**Status: NOT STARTED. Chore — under the ~10-mechanical-line threshold, skip the full pipeline, just do it directly next time someone's in `routeMapView.tsx` for another WP.**
**Review doc item: 15 (notes5 N7). Size: chore.**

## What it is

`gate-ticks-casing`/`gate-ticks` layers use `'line-cap': 'butt'`; the route line itself uses `'round'`. Round the tick ends to match. Two one-word style-prop changes.

## Note

Possibly moot depending on how WP-K (unpausing sector-coloured trail) lands — if colouring the segments makes gate ticks visually recede/neutral, the cap style may matter less. Nathan's own call, noted in the review. Worth doing anyway since it's essentially free — bundle it into whichever WP next touches `routeMapView.tsx`'s gate-tick layers (WP-C, WP-D, and WP-J all touch that file).
