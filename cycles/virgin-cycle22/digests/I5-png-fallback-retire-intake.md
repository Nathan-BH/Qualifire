# D9 — Retire the PNG fallback rung: intake (Nathan, 2026-10-05 22:50)

**Status: decision + context only. NO digest yet, nothing planned or executed.** Needs a Haiku Digest (mandate below), then Fable Plan.

## Decision (Nathan)
Retire the PNG fallback rung of the route map ENTIRELY. Reasoning: with no data, an empty basemap with the route line / gates / rider dot drawn on top
(what Google Maps / Waze do) is the behaviour he wants. He has seen exactly that on a trip (landed, no connection, map opened and panned, no roads or
landmarks, home region still detailed from MapLibre's ambient cache).

## Facts verified in code (coordinator, 2026-10-05; not yet Inspected)
- app/src/ui/wayMapView.tsx: `WayMapView` (line ~292) returns `<PngWayMap>` when `ML === null` (native module missing, require at ~143) or `mapFailed`
  (set by `<M.Map onDidFailLoadingMap>` at ~656). `mapFailed` is sticky: never reset, so a returning connection does not recover the real map until remount.
- PngWayMap (~950-1165): bundled PNG via `IMAGES` / `bundledForSeedMode`, crop by `cropFor`, dot by `projectToPixel`, third sub-rung `imgFailed` draws the line
  as Views; badges "map needs the tile map", "place map needs the tile map", "MAP IMAGE FAILED — drawing the line".
- Credit: `PNG_CREDIT` / 'png' rung in app/src/ui/mapCreditModel.ts ("Esri, HERE, Garmin, © OpenStreetMap contributors"); locked by tests/mapcredit_suite.ts.
- No offline pack / ambient-cache config anywhere in the repo (grep: offline, ambient, createPack, cacheSize → nothing relevant). Tiles are fetched as viewed.
- Props documented as MapLibre-rung-only (trail, selfs, rideTrace, sectorColours, place, gateSelect.onPress) already degrade on the PNG rung.

## Questions the Plan tier must answer (not decided by Nathan)
1. When the MapLibre module is missing (`ML === null`) or the STYLE fails to load, what does the rider see? (Style JSON comes from tiles.openfreemap.org;
   a first-ever open with no signal has no style at all, so no basemap AND possibly no MapLibre-drawn route line.) Options for Plan to price: blank frame with
   a status badge; a bundled minimal local style (background only) so route/gates/dot still render; auto-retry / recover when the network returns.
2. Fate of the bundled PNGs, their manifest, generator scripts, `cropFor`/`projectToPixel` (check other users first), seed-mode `bundledForSeedMode` handling.
3. Credit rows: drop the 'png' rung / Esri-HERE-Garmin wording only if nothing else shows that imagery; OSM/OpenMapTiles/OpenFreeMap wording must stay
   (licence obligation, mapCreditModel.ts header).
4. Rider-facing strings removed with the code -> app/tests/ui-strings.allow.json entries go too (CLAUDE.md rule 9); any NEW string (e.g. an offline badge)
   needs an entry with a one-line reason, budgeted and Nathan-owned.
5. Callers of WayMapView that assumed a PNG rung exists (DemoScreen passes its own `asset`; check all).
6. Optional, separate from the retirement: should a returning connection recover the real map automatically (reset `mapFailed`)? Not asked for by Nathan.

## Digest mandate (Haiku; write to cycles/virgin-cycle22/digests/D9-png-fallback-digest.md)
Factual, line-anchored, no opinions, no source edits. Cover: (1) everything PNG-rung in wayMapView.tsx incl. the ML/mapFailed switch and badges;
(2) every symbol in wayMapGeo.ts / wayMapMath.ts / wayAssetRuntime.ts / wayMapStyle.ts / mapCreditModel.ts used ONLY by the PNG rung, with all importers
across app/src and app/tests; (3) bundled PNG files + manifest + generator scripts + du -sh + seed-mode handling + metro/app.json asset config;
(4) every WayMapView caller, props passed, and what it assumes if no map draws; (5) tests + ui-strings.allow.json entries referencing the PNG rung / badge
strings / PNG_CREDIT; (6) docs mentioning the PNG rung (STATE.md, OPEN-ITEMS.md, HOW-THE-APP-IS-BUILT.md, GLOSSARY.md, process/, design/);
(7) any other style-load-failure handling (retry, offline pack, cache config).
