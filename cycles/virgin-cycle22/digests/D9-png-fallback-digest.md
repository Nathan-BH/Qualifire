# D9 — Retire the PNG fallback map rung entirely

## 1. Everything PNG-rung in wayMapView.tsx

**Line 292–310 (WayMapView default export):** Route selection logic. `ML === null` (line ~142–150: native module missing) or `mapFailed` sticky flag (line ~656: `onDidFailLoadingMap` callback) → returns `<PngWayMap>` instead of `<MapLibreWayMap>`. Once `mapFailed` is set, no reset path exists (sticky until remount).

**Lines 950–1165 (PngWayMap component):** The full PNG rung. Props: `wayId`, `asset`, `lat`, `lon`, `zoom` (defaults to 4, from props.zoom), `liveState`, `variant`, `showRider`, `fill`, `height`. State: `[imgFailed, setImgFailed]` (line 958), `[zoom, setZoom]` (line 952). Asset resolution (line 961): `props.asset ?? assetFor(id) ?? undefined`; bundled manifest lookup via `IMAGES[id]` (line 962). Badge strings (lines 1016–1020, 1022, 1024–1026, 1149–1151): "place map needs the tile map", "map needs the tile map", "MAP IMAGE FAILED — drawing the line", "OFF ROUTE · >120 m from the route line". Place-unsupported guard (line 1016); riderOnly no-asset guard (line 1025) returns degraded frame for `showRider` true only; browse with no asset returns nothing (null). Zoom bar (lines 1132–1150): `+`/`−` adjust zoom, FIT button sets `zoom(1)`, no ME/follow button (PNG rung stateless). Credit rung="png" (lines 1154–1156) conditional on `!imgFailed && img`.

**Lines 57–88 (wayMapView top-level):** Imports: `cropFor, gateTickPx, offWayM, projectToPixel` from wayMapMath.ts (line 87); `SEED_MODE, bundledForSeedMode` from store/seed.ts (line 89). Line 151–152: `ASSETS: Record<string, WayAsset> = bundledForSeedMode(SEED_MODE, {Morning: ..., EveningA: ..., EveningB: ...})`. Line 166–169: `assetFor(id)` resolver: catalog-only via `resolveWayAsset(id, {manifest: bundledForSeedMode(...), ...})` (lines 167–170, not shown but called). Line 171–172: `IMAGES: Record<string, number> = bundledForSeedMode(SEED_MODE, {Morning: require(...), EveningA, EveningB})` — Metro bundle hashes.

**MapLibreWayMap props vs PngWayMap degradation:** Lines 639–662 show `<MapLibreWayMap>` accepts `trail` (line 639), `selfs` (line 641), `rideTrace` (line 642), `sectorColours` (line 643), `place` (line 650), `gateSelect.onPress` (line 651). PngWayMap docs (comment line 47–54) acknowledge these are MapLibre-only; PngWayMap does not accept or render them.

**MapLibreWayMap onMapFailed (line 656):** `onDidFailLoadingMap={onMapFailed}` callback (defined as `onMapFailed={() => setMapFailed(true)}` on line 293); sets the sticky flag that triggers PNG rung on remount. No retry or recovery logic.

## 2. Exported symbols in related files used ONLY by PNG rung

**wayMapMath.ts:**
- Line 57: `export function projectToPixel(a: WayAsset, lat: number, lon: number): Px` — maps lat/lon to pixel coordinates on the asset (used line 1022, 1071–1072 PngWayMap only).
- Line 81: `export function offWayM(a: WayAsset, lat: number, lon: lon): number` — distance in metres off the route (used nowhere in app/src, imported as line 87 but never called in wayMapView.tsx).
- Line 214: `export function cropFor(asset: WayAsset, here: Px, w: number, h: number, zoom: number)` — viewport bounds within the asset (used line 1042 PngWayMap only).

**Importers across app/src and app/tests:** `cropFor`, `projectToPixel` used only in wayMapView.tsx (lines 1022, 1042, 1071–1072). `offWayM` imported but never called. wayAssetRuntime.ts line 19 imports `projectToPixel` and uses it line 98 (inside `buildRuntimeWayAsset`), which builds the asset prep for the route-line vertices — shared with MapLibre rung (not PNG-only).

**wayMapMath.ts also exports:** `gateTickPx` (line 87 imported, never used in wayMapView), `type WayAsset` (used by both rungs).

## 3. Bundled PNG files, manifest, seed-mode handling

**Files:** `app/assets/ways/` (3.9M total):
- Morning.png (1.3M, line 171 imported via IMAGES, assetmap.json hash bea1ca15..., 900×1400 px)
- EveningA.png (1.3M, hash bb63a1eb..., 900×1400 px)
- EveningB.png (1.3M, hash f29950c3..., 900×1400 px)
- ways.json (156K, manifest; schemaVersion 1, projection web-mercator, gates + path per way, line 88 required in PngWayMap import chain)

**Metro/app.json asset config:** app/dist/assetmap.json (generated) shows Metro's registered asset hashes. app/metro.config.js (virgin-cycle19 brief 01, 2026-10-03) line 12–15: redirects non-shipped imports of `catalog.seed.json`, `results.seed.json`, `ways.json`, `Morning.png`, `EveningA.png`, `EveningB.png` to `assets/seed-stubs/` (empty stubs), so empty-seed bundles don't include the PNGs (native bytes saved, security of virgin builds).

**Seed-mode handling:** app/src/store/seed.ts line 72–75 exports `bundledForSeedMode(mode, bundled)` — returns `{}` when mode === 'empty', else returns `bundled` unchanged. Lines 151–152 in wayMapView.tsx use this on both ASSETS and IMAGES, so empty builds see `{}` at runtime; shipped builds see the three PNGs. tests/seedstubs_suite.ts (lines 22–24, 53–113) locks this: verifies blank.png stub exists and is <200 bytes, verifies metro redirect hits all six seed files, and confirms icon.png is NOT redirected.

**Generator scripts:** No dedicated compositor/PNG-generation script found in repo. The ways.json and the three PNGs are static assets, checked in; no build-time regeneration logic.

## 4. Every WayMapView caller

**app/src/ui/RecordScreen.tsx:**
- Line 41: import WayMapView
- Line 1256: `<WayMapView wayId={...} lat={...} lon={...} zoom={...} liveState="prestart" variant="live" showRider={true} fill={true} />`
- Line 1405: same, `liveState={live.phase === 'finished' ? 'finished' : (stationary ? 'stopped' : 'moving')}`, `variant="live"`, `showRider={true}`
- Line 1524: same, `liveState="prestart"`, `variant="live"`, `showRider={true}`, `fill={true}`
Assumptions: RECORD passes `wayId`, `lat`/`lon` (rider position), `zoom` (tight live crop), `liveState` (prestart/moving/stopped/finished), `showRider={true}` (live ribbon), no `place`. No direct handling of "no map draws" — relies on MapLibre fallback or PNG rung downstream.

**app/src/ui/CatalogDetailScreen.tsx:**
- Line 22: import WayMapView
- Line 236: `<WayMapView variant="browse" wayId={r.id} lat={null} lon={null} zoom={1} height={260} showRider={false} />`
- Line 408: same, but `wayId={r.refLineId}` (route detail), `zoom={1}`, `height={260}`, `showRider={false}`
Assumptions: browse surface (no rider), `showRider={false}`, no `place`. PNG rung returns nothing (null, line 1025 guard).

**app/src/ui/RideDetailScreen.tsx:**
- Line 31: import WayMapView
- Line 496, 550, 569, 589: all with `variant="browse"`, `showRider={false}`, `lat={null}`, `lon={null}`, various `wayId`/`refLineId`, heights
Assumptions: browse surfaces only, `showRider={false}`. PNG rung returns nothing.

**app/src/ui/ReplayScreen.tsx:**
- Line 15: import WayMapView
- Line 232: `<WayMapView variant="live" wayId={...} lat={pos?.lat ?? null} lon={pos?.lon ?? null} liveState="moving" showRider={true} fill={true} />`
Assumptions: live surface, `showRider={true}`, rider position passed. No "no map draws" handling.

**app/src/ui/gateAdjustCard.tsx:**
- Line 40: import WayMapView
- Line 147: `<WayMapView variant="browse" wayId={wayId} lat={null} lon={null} zoom={3} showRider={false} />`
Assumptions: browse surface, `showRider={false}`, no rider position. PNG rung returns nothing.

**app/src/ui/DemoScreen.tsx:**
- Line 126: import WayMapView
- Line 662: `<WayMapView key={...} wayId={DEMO_FIRST_RIDE_ID} ... lat={pos?.lat ?? null} lon={pos?.lon ?? null} liveState="moving" showRider={true} />`
- Line 665: `<WayMapView key={...} wayId={DEMO_WAY_ID} asset={DEMO_WAY_ASSET} ... liveState="moving" showRider={true} />`
Assumptions: live surfaces, `showRider={true}`, rider position. Line 665 passes its own `asset` (demo fixture, line 126 imports `DEMO_WAY_ASSET` from demoRouteFixture.ts). PNG rung would render the PNG; MapLibre rung respects the passed asset.

## 5. Tests + ui-strings entries for PNG rung

**Tests:**
- tests/waymap_suite.ts line 335–349: PngWayMap render test; checks for zoom bar presence, absence of resetNorth, and `<Credit rung="png"` mounts (2 expected: line 349 comment says "place frame and image frame").
- tests/mapcredit_suite.ts line 7, 21–23: `creditFor('png')` returns `PNG_CREDIT` (line 23 assertion).
- tests/virginmanifest_suite.ts lines 241–282: static guard test verifies `bundledForSeedMode(SEED_MODE, ...)` calls in wayMapView.tsx are guarding ASSETS and IMAGES; checks line 279 for at least 2 hits, imports (line 281–282).
- tests/seedstubs_suite.ts lines 22–24: lists the six seed files (including ways.json and the three PNGs); lines 53–80 verify stubs and redirects.

**ui-strings.allow.json entries:** (grep -n "map needs\|MAP IMAGE\|OFF ROUTE" $HOME/mnt/Qualifire/app/tests/ui-strings.allow.json):
- "map needs the tile map" (badge string, route card, line ~1024)
- "place map needs the tile map" (badge string, place card, line ~1022)
- "MAP IMAGE FAILED — drawing the line" (badge string, line ~1150)
- "OFF ROUTE · >120 m from the route line" (badge string, line ~1156)
- PNG_CREDIT = "Esri, HERE, Garmin, © OpenStreetMap contributors" (tests/mapcredit_suite.ts line 23, stored in mapCreditModel.ts)

## 6. Docs mentioning PNG rung, fallback, or Esri/HERE/Garmin

**STATE.md:** Line ~520–527 documents the PNG rung as the fallback ("pre-rendered PNG compositor... fallback rung for whenever the native module isn't there or the map fails to load. A third rung — the ridden line drawn as segments — lives inside the PNG rung itself (`imgFailed`) for when even the bundled image is unavailable").

**OPEN-ITEMS.md:** No explicit PNG rung mention (checked via I5 intake notes; not a blocking issue before this cycle).

**process/CONVENTIONS.md, design/, product/:** Checked via grep; no specific PNG rung docs found beyond STATE.md's existing summary.

## 7. Other style-load-failure handling

**MapLibre style fetch:** wayMapView.tsx line 656 `onDidFailLoadingMap` sets `mapFailed`, triggering PNG fallback. No retry logic, no timeout, no ambient cache config.

**Package.json / app.json / app.config:** grep for "offline", "cache", "ambient" → no offline pack, no cache size config, no keepAwake or background-fetch setup outside of location (expo-location already bundled).

**Unknowns / could not determine:**

- Whether `ways.json` is required at bundle time or if Metro can omit it from empty-seed builds (metro.config.js redirects imports, but ways.json is require() not import, line 88 wayMapView.tsx — may force inclusion). Needs a build test to verify stub actually blocks the bytes.
- Exact build-time asset compression/decompression; whether the 3×1.3M PNGs count toward the APK size budget.
- Whether a first-ever open with no signal has MapLibre style **object** (backgroundLayer only, no roads) or truly blank frame (style JSON fetch fails).
- Whether `offWayM` (exported, line 81 wayMapMath.ts, imported line 87 wayMapView.tsx) is dead code (searched, no call sites found; may be for future use or leftover from older code).


---
## COORDINATOR NOTE (2026-10-05)
- Not independently re-verified beyond a spot check (file exists, 111 lines). The Plan must confirm the "PNG-only" symbol claims (cropFor/projectToPixel/offWayM importers) with
  one grep each before the brief lists them for deletion, and must NOT rely on the digester's "no mention in design/" without a grep.
