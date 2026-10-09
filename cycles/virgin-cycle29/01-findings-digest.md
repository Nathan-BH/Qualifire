# Findings digest (coordinator, 2026-10-09). Anchors are file names under app/src/ui unless stated.

## A. What commit c93f406 (cycle27 brief 12) did
- mapStyleCache.ts: session cache of the fetched + patched style JSON per URL. Saves one small fetch and one
  native remount (url rung -> patched rung) per map mount. It does NOT cache tiles, the native view, or any render.
- mapCover.tsx / mapCoverModel.ts: themed opaque cover over each native map until onDidFinishLoadingStyle AND
  onDidFinishRenderingFrameFully, or styleFailed, or 5000 ms timeout. 200 ms fade. Applied in wayMapView.tsx and catalogMapView.tsx.
- Inspect report (cycle27/inspect-report-map-white-flash.md) flagged: native "fully rendered" signal not verifiable off-device.
  Minor 1: covered = goneKey !== key can miss a cover on A->B->A key flips.

## B. Structure that did NOT change since cycle23/24 (git diff bca4126..HEAD)
- App.tsx ~lines 215-218: one tab rendered at a time (`tab === 'record' ? <RecordScreen/> : tab === 'rides' ? <RidesScreen/> : tab === 'routes' ? <RoutesScreen/> ...`).
  Leaving a tab unmounts the screen and its native map(s). Every visit rebuilds them.
- Style/tiles: https://tiles.openfreemap.org/styles/{dark,positron}; no offline pack, no ambient cache tuning found in app code.
- Feed windowing in RidesScreen.tsx ~251-253: windowSize 5, initialNumToRender 3, maxToRenderPerBatch 3;
  viewability threshold itemVisiblePercentThreshold 5 (~line 196); live maps = viewable +/- MAP_MOUNT_RADIUS (activityCard.tsx line 40, value 1).
- Card height: route card 307 dp, CARD_MAP_HEIGHT 150 (feedModel.ts line 46), so ~2 cards fit on screen.

## C. What changed since cycle23/24 that adds map cost
- cycle26 brief 04 (wayMapView.tsx): buildPassModel, faintVertices recomputed per 10 m of progress, routeRunsFeatureCollection,
  data-driven line-opacity expressions on route, casing, gates, sector spans.
- cycle27 06: maps edge to edge (bleed) on RECORD, ride detail, ROUTES: wider maps, more tiles.
- cycle27 09 (RoutesScreen.tsx): on every ROUTES open: lastKnownPositionIfPermitted + refreshPositionIfPermitted; blue dot layer added after mount.
- cycle27 12: the cover (see A): hides the progressive tile paint that used to show, so load time is now fully visible.

## D. ACTIVITIES card map today (activityCard.tsx)
- Each card with `live` mounts <WayMapView variant="browse" bleed gestures="readonly" ...> (full native MapLibre + basemap).
- 'route' cards: draw the way reference line with sectorColours (SETTINGS toggle on) or ALL_YELLOW (off), leadColour grey when on.
- 'plain' cards: draw the ride's own fixes via trailCache.ts (capacity 30, read concurrency 2).
- Touches: card Pressable claims all touches; the map never receives a finger (CARD_MAP_GESTURES = 'readonly').
- Non-live cards show a placeholder View in the frame colour.

## E. Colour / rank are recomputed LIVE today (the freeze rule is a behaviour change)
- feedModel.ts lines 89-97: heroTier = detail.lapTier (neutral if unranked), sectorColours = detail.sectorColours,
  rankLabel = `P${row.rank.pos}/${row.rank.of}` from the current `row.rank`.
- rideDetailModel.ts line 105-106 sectorColoursFor(result, hist) -> storedSectorColours(result, hist, tierLineColour) (sectorTrailModel.ts);
  line 132 lapTier = ignored ? 'neutral' : tierFor(lapS, hist) (colourModel.ts). `hist` = the history of other rides as of NOW.
  So an old card can recolour when later rides are added/ignored, or gates change.
- unrankedForDisplay(quality, ignored) in feedModel.ts line 64: ignored OR estimated/missed -> "Not ranked", neutral.
- UNVERIFIED: whether per-ride results are stored with their gate set, so a frozen-as-of-then colour survives later gate edits.
- UNVERIFIED: whether `hist` can be rebuilt "as of ride start" from stored rides with no new persisted field, and how
  ties / MIN_HISTORY (colourModel.ts) behave for the earliest rides.

## F. Snapshot capability (library check)
- node_modules/@maplibre/maplibre-react-native (v11.3.6) src/components/map/Map.tsx line ~250:
  `createStaticMapImage(options: { output: "base64" | "file" }): Promise<string>`; native spec in NativeMapViewModule.ts lines 70-73.
  So no new native module should be needed (JS-only/OTA candidate), but this ships in the current native build only if the
  installed native code already includes it: UNVERIFIED on device (Android). UNVERIFIED: that the snapshot includes GeoJSON
  line layers drawn on top of the style; image dimensions/crispness vs live view.
- No react-native-svg, skia or expo-image in package.json (a vector fallback would need a new dependency + native build).

## G. Coordinator's tentative diagnosis (unprofiled, a hypothesis)
- ACTIVITIES opens ~3-5 native maps at once (initialNumToRender 3 + radius 1 + 5% threshold); they compete for CPU/GPU/network
  and each cover lifts only when its own map has fully rendered, so the last one sets the black duration.
- ROUTES = 1 light map; RECORD = 1 heavier map. Ranking matches the number/weight of simultaneous native maps.
