# Brief 03 executor report (Sonnet, 2026-10-06/07)

## Files changed
- app/src/ui/catalogMapModel.ts: created (pure model, brief 4.1)
- app/src/ui/catalogMapView.tsx: created (map view, 4.2)
- app/src/ui/RoutesScreen.tsx: replaced wholesale (4.3); the old file is kept at /tmp only (not in repo)
- app/App.tsx: `routes: 'map'` (4.4)
- app/src/ui/wayMapView.tsx: `export function Credit(` only (4.5)
- app/src/ui/CatalogDetailScreen.tsx: BACK TO MAP (4.6)
- app/tests/run.ts: one import line (4.7)
- app/tests/catalogmap_suite.ts: created, 20 tests (4.8)
- app/tests/ui-strings.allow.json: 8 removed, 4 added (see deviations)
- app/safe_to_delete/ui-strings.allow.pre-brief03.json: copy of the allow-list before my edit

## Tests
Baseline (before edits): `887 tests: 883 pass, 1 fail, 3 skip` (the 1 fail was in a foreign file's area; no crash on trailCache at that time).
After: `907 tests: 904 pass, 0 fail, 3 skip` (+20 = my suite).
Standalone (catalogmap + ui_strings suites): `33 tests: 33 pass, 0 fail, 0 skip`.

## tsc
Baseline EXIT 2 (7 errors, all tests/replay_suite.ts, foreign). After: EXIT 0.

## Deviations (needs a ruling)
1. Allow-list ordering: the guard `ui-strings: allowlist hygiene` requires entries sorted by file, kind, text, so the new entries could not be appended at the end. I inserted them in sorted position; no other entry moved.
2. Two extra allow-list entries the brief did not foresee: `src/ui/catalogMapView.tsx` literal `https://tiles.openfreemap.org/styles/dark` and `.../positron` (long: true). The copied MAP_STYLE consts are prose-shaped literals to the scanner. Remedy used = the guard's own (append entry with reason). Alternative if Nathan prefers: export the consts from wayMapView.tsx and drop these two entries.
3. `routeEndpointIds` in catalogMapView.tsx reads `currentCatalog()` to find the focused route's two endpoint pins (the route model carries no endpoints, props are fixed by the brief).

## Allow-list diff
Removed 8 (RoutesScreen x7, CatalogDetailScreen BACK TO ROUTES). Added: BACK TO MAP, Noto Sans Regular, the two style URLs. Entry count 463 -> 459.

## Foreign
None remaining. tests/replay_suite.ts is modified by another session; tsc is clean now.

## Could not verify on a device
Tap routing (pin tap also firing onPressEmpty), label rendering and `Noto Sans Regular` glyphs, sheet height on small phones, camera padding with the sheet, +/- zoom (uses cameraRef.zoomTo, mode free), line hit area at 4 px width, performance of differingStretches on long real paths.

## Open for Nathan
OQ3 twin-direction switch in route focus is not built (D6). Zero-places map is bare (D16).
