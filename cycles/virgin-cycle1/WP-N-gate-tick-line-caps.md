**Status: DONE. Bundled into WP-D's `routeMapView.tsx` edit, landed on the device 2026-09-02
(see WP-D's status line for the test-suite numbers) — the `gate-ticks-casing`/`gate-ticks`
layers' `line-cap` changed from `'butt'` to `'round'`, two one-word style props, no separate
files touched.**
**Review doc item: 15 (notes5 N7). Size: chore.**

## What it is

`gate-ticks-casing`/`gate-ticks` layers use `'line-cap': 'butt'`; the route line itself uses `'round'`. Round the tick ends to match. Two one-word style-prop changes.

## Note

Possibly moot depending on how WP-K (unpausing sector-coloured trail) lands — if colouring the segments makes gate ticks visually recede/neutral, the cap style may matter less. Nathan's own call, noted in the review. Worth doing anyway since it's essentially free — bundle it into whichever WP next touches `routeMapView.tsx`'s gate-tick layers (WP-C, WP-D, and WP-J all touch that file).
