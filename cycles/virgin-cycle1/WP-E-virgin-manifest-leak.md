**Status: NOT STARTED. Blocked on Q6 (see QUESTIONS-FOR-NATHAN.md) — needs Nathan's ruling before a Plan brief is written.**
**Review doc item: 5 (T — same class as OPEN-ITEMS' "bundled 'Morning' in DEMO"). Size: small.**

## What it is

On a new>>new free ride, the gates-only map rung draws gate rings for *every route in the bundled asset manifest* (`routeMapView.tsx`'s `allGatesFeatureCollection`/`allGatesBounds` calls, filter `null` = "unfiltered = all manifest routes"), not just routes in the *runtime catalog*. On a virgin/empty-catalog install this means Nathan's own Leuven routes' gates (baked into the shipped manifest) show up as black rings on a stranger's blank map — a data leak from the build, not from any saved state.

## Why it's blocked

Review open question 6: **"strip bundled route assets from the `virgin` EAS profile entirely, or keep them and filter every map rung by the runtime catalog?"** These are materially different fixes (a build-config change vs. a code change to every gates-only call site) — writing a Plan brief before knowing which one is wanted would waste a pass. Filtering also only resolves the related DEMO-route leak (OPEN-ITEMS) if DEMO is handled as a separate case.

## Once answered

If "filter by runtime catalog": likely folds naturally into WP-C's `allRouteAssets()` helper (already computes "every catalog route with an asset" — reuse directly as the gates-only filter's universe, replacing the raw manifest). Worth executing WP-E right after WP-C for exactly that reason. If "strip from the virgin EAS profile": this becomes a build-config/asset-bundling task, likely outside the model-tier pipeline's normal file-edit shape — flag that when planning it.
