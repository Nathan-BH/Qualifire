# Fable ruling: virgin-cycle29 map loading speed (2026-10-09)

Plan tier (Fable). Read 00 (binding), 01, 02; verified every claim below against the code at HEAD
c93f406 (+ untracked cycles/). Anchors are `app/src/...` unless stated. Nothing but this file was written.

---

## 1. Verdict

Nathan's direction is right in its two big calls and wrong in one detail of the third.

- **Snapshot cards: yes, and the library already has the right tool, better than the one the digest found.**
  `@maplibre/maplibre-react-native` 11.3.6 ships `StaticMapImageManager.createImage(...)` (headless
  `MapSnapshotter`, `src/modules/static-map/StaticMapManager.ts`, native
  `android/.../modules/MLRNStaticMapModule.kt`): it takes a **style JSON**, width/height in dp, bounds, and
  returns a PNG rendered by the same MapLibre renderer, with no live view at all. Our route line, gates and
  sector spans are already literal style-spec layers (`wayMapView.tsx` 825-897, `paint={{'line-color': ...}}`),
  so they inline into that style JSON unchanged. "Same renderer draws it" holds; "identical" becomes a
  by-construction property, not a hope. The native module is provably in the installed build (§2.2d). OTA.
- **Freeze rule: yes, cheap, no migration.** The "as of then" window already exists: `colourModel.priorWindowFor`
  (line 85, cycle14 replay). Feed, detail page and the detail's "ON THIS ROUTE" list switch to it in three
  call sites. One sentence of the direction I will not follow blind: ignoring/counting ANOTHER ride. That toggle's
  whole purpose (WP-H: "a ride withdrawn from judging others") is to change what other rides are judged against;
  a true freeze would need a stored per-ride pool, a migration, and would leave a GPS-glitch ride poisoning every
  later verdict forever. Ruled below as "frozen against time, not against the rider's own corrections"; it is the
  one genuine product call for Nathan (§5).
- **Keep tabs mounted: no, not this cycle.** With snapshots ACTIVITIES has zero native maps and nothing to keep
  warm; ROUTES is already the fastest; RECORD gets most of its speed back from the cover fix. Hidden native GL
  views on Android are an unverifiable memory/battery bet. Revisit only if RECORD still feels slow after brief 01.
- **The coordinator's diagnosis is half right.** Several native maps at once is real, but the thing Nathan is
  LOOKING at is the cover itself: it is `t.race.bg`, which in night mode is `colors.bg` (`theme.ts` 115) - the
  "black screen" IS the cover - and it lifts only on `onDidFinishRenderingFrameFully` (every tile in view loaded)
  or the 5000 ms timeout. Before c93f406 the same load time was spent painting tiles progressively, which he never
  read as slow. The lift signal is wrong, not just the mount count. Fixing it (brief 01) is three lines and ships
  first.

---

## 2. Rulings per question

### Q1. Mount only visible ACTIVITIES cards
**RULING.** Yes, as brief 01 (with Q5), before snapshots, because it is tiny and gives Nathan a measurable data
point on the "N maps at once" half of the diagnosis. Exact values:
- `activityCard.tsx:40` `MAP_MOUNT_RADIUS = 0` (was 1).
- `RidesScreen.tsx:196` `viewabilityConfig = { itemVisiblePercentThreshold: 40, minimumViewTime: 0 }` (was 5).
- `RidesScreen.tsx:251-253` `windowSize={3}` (was 5), `initialNumToRender={2}` (was 3), `maxToRenderPerBatch` stays 3.
- `feedModel.liveMapIndices` unchanged (radius 0 is a legal input; pin it in `feedmodel_suite`).

**REASON.** Route cards are 307 dp; a phone shows two full cards plus a sliver. Today the sliver counts at 5 %,
plus radius 1 each side: 4-5 native maps on open. With 40 % + radius 0 it is exactly the 2 cards the rider can
see. Scroll-in effect: a card gets its live map when 40 % of it is on screen, and shows the existing frame-colour
placeholder until the map paints (~0.3-1 s). That is more visible than today, and it is the honest state of the
live-map design; brief 02 makes it moot (a snapshot card is drawn before it scrolls in).
After brief 02 lands, `liveIdx` / `MAP_MOUNT_RADIUS` survive only for the live-map fallback (Q2c).

### Q2. Snapshot cards
**a. RULING: yes, with `StaticMapImageManager.createImage`, NOT with `createStaticMapImage` on a live view.**
The digest found the view method (`Map.tsx:250` -> `MLRNMapView.takeSnap` -> `MapLibreMap.snapshot`). That needs a
mounted, laid-out, fully rendered live map per card - the exact cost we are removing - and would need an
off-screen map queue. The headless snapshotter needs none of that: `StaticMapImageManager.createImage({ mapStyle:
<style JSON object>, width, height, bounds: [west, south, east, north], output: 'file' })`
(`StaticMapManager.ts`; `NativeStaticMapModule.ts`; `MLRNStaticMapModule.kt:getOptions`). It is exported from
`src/index.ts:160`. Note the JSDoc example's nested `bounds: [[..],[..]]` is stale; the type (`types/LngLatBounds.ts`)
and the native reader (`GeoJSONUtils.toLatLngBounds`, 4 doubles) want the FLAT `[w, s, e, n]`.
Pixel ratio is the device density (`withPixelRatio(applyDimension(DIP,1f))`), so a 150 dp request renders at
the screen's physical resolution: as crisp as the live view.
No better JS-only idea exists: a vector redraw (react-native-svg/skia) is a new native dependency and a different
renderer; an `<Image>` of a PNG the MapLibre renderer produced is the only thing that is "the same map".

**b. Where/how/key/store/evict.**
- New pure module `ui/cardSnapshotModel.ts` (headless, tested): `cardSnapshotStyle(patchedLabelsOn, asset | trail,
  sectorColours, leadColour, fitZoom)` returns the style JSON = the cached patched labels-on copy
  (`mapStyleCache.cachedPatchedStyles(url).labelsOn`; browse maps are `unlocked`, so labels ON, `wayMapView.tsx:564`)
  with sources `route`, `trail`, `sector-spans`, `gate-ticks` appended as inline `{type:'geojson', data}` and the
  layers appended in the live mount order (route-casing, route-core, trail-casing, trail-core, sector-spans-core,
  gate-ticks-casing, gate-ticks). `ride-trace`, `place`, `gate-selected`, `selfs`, `rider` are not on a card.
- **Parity rule (hard):** the paint/layout objects move out of `wayMapView.tsx` 825-962 into a new pure
  `ui/wayMapLayers.ts` (`ROUTE_CASING_PAINT`, `ROUTE_CORE_PAINT`, `SECTOR_SPANS_PAINT`, `GATE_TICKS_*`, `ROUND_JOIN`)
  and BOTH `wayMapView.tsx` and `cardSnapshotModel.ts` import them. A test pins that the snapshot style's layer
  list equals the live card's layer ids and paints. Visual identity is then a refactor invariant, not a review item.
- Camera: `wayMapView` fits `wayBounds(asset)` with 20 dp padding (`wayMapGeo.ts:441`). `MapSnapshotter.withRegion`
  has no padding, so add pure `paddedBoundsFor(bounds, widthDp, heightDp, padDp=20)` in `wayMapMath.ts` that expands
  the box in Web-Mercator pixel space (that is how MapLibre's fitBounds computes the fit), and `fitZoomFor(bounds,
  w, h, pad)` for `gateHalfLenM(lat, zoom)` (`wayMapGeo.ts:336`; today the live card first renders ticks at
  `camZoom`, then re-renders at the real zoom from `onRegionDidChange`; the snapshot uses the real fit zoom once).
- Size: width = `useWindowDimensions().width` dp (bleed card), height = `CARD_MAP_HEIGHT` 150. Rotation is locked
  portrait, so one size; the width is in the key anyway.
- Key (pure function, tested): `snap|v1|${variant}|${rideId}|${wayId ?? '-'}|${gateSetVersion ?? 0}|${styleUrl}|
  ${sectorColoursOn ? colours.join(',') : 'off'}|${width}x${height}|${density}`. Plain cards key on `rideId` and the
  trail's point count. Because the key IS the drawn content, invalidation is automatic: a different theme, toggle,
  colour array, gate set or ride is a different file. `v1` is bumped by any change to `wayMapLayers.ts` paints.
- Store: PNG files under the app root, `mapsnaps/<sha1(key)>.png`, plus `mapsnaps/index.json` (key -> file,
  madeAtMs, lastUsedMs). `output:'file'` lands in Android `cacheDir` (`BitmapUtils.createTempFile`); move it with
  `expo-file-system` `File.move`. `storage/expoFsAdapter.ts` stays the ONLY expo-file-system importer: extend
  `FsAdapter` with `importFile(srcUri, relPath)` and `fileUri(relPath)` (memory adapter: record the move). The
  virgin reset (`expoFsAdapter.ts:87-89`) then carries snapshots aside with everything else for free.
- Queue: module singleton `ui/cardSnapshotQueue.ts`, strictly one `createImage` in flight (each is its own GL
  context), priority = visible cards first, then feed order, then the OTHER theme URL and the other toggle state
  for the visible cards (Nathan's "ready when I am in the app"). It runs only when: the style for that URL is in
  `mapStyleCache` (fetched this session - the snapshotter must never bake an offline, tile-less basemap into a
  file), AND `location.getStatus().session === null` (`location/index.ts:63/148`; no snapshotting while a ride is
  recorded). Kicked at RidesScreen mount, after `resultsTick` changes (ignore toggle, gate edit, delete, new ride)
  and on theme flip. Failure -> exponential backoff per key (1 s, 10 s, 60 s, then give up for the session).
- Evict: LRU by `lastUsedMs`, cap 80 files (~0.3 MB each at density 2.75; <= ~25 MB worst case); files whose
  `rideId` is no longer in `listRides()` are removed at queue start. Delete is the app deleting its own derived
  cache, not a repo file (D-023 spirit: losing `mapsnaps/` costs CPU only).

**c. Fallback and hand-off.**
- Snapshot on file -> `<Image source={{uri}}>` in the map slot, drawn on first render, no cover, no fade (it is a
  picture; it is simply there like the text).
- Not on file yet -> the existing frame-colour `placeholder` View (`activityCard.tsx:84`), the card requests the
  key at top priority; when the file lands the image fades in over `MAP_COVER_FADE_MS` (200 ms, reuse the constant).
  No spinner, no text, no trail-shape (Nathan rejected those).
- Snapshot FAILED for this key this session (promise rejected, retries exhausted) -> the live `<WayMapView>` exactly
  as today (same props, same `live` gating, same cover). Pending is never a reason to mount a live map; only failure
  is. This keeps one happy path and keeps the cover code reachable on cards only in the failure path.
- A snapshot being replaced (key changed under the same ride, e.g. toggle flip) crossfades old -> new; no
  placeholder in between.

**d. Android risks and the gating test.**
Risks: (1) `MapSnapshotter` with `Style.Builder().fromJson` + inline geojson - supported by MapLibre Android, but
untested in THIS app; (2) tile-less output when offline (mitigated by the style-cache gate above; residual risk
accepted and logged); (3) glyph/sprite load per snapshot (shared `FileSource` ambient cache; first one pays);
(4) snapshotter concurrent with a live `MapView` on a mid phone (serialised queue; still measure); (5) the Fabric
TurboModule path - `NativeStaticMapModule.ts` does `TurboModuleRegistry.getEnforcing('MLRNStaticMapModule')` at
import time and `src/index.ts:160` imports it unconditionally, so if it were missing from build 8 the whole
library import would already throw on launch. The installed native code is 11.3.6 (`package-lock.json:1738`, the
fingerprint runtime policy guarantees OTAs only reach a build with identical native deps,
`deployment/CURRENT-STATE.md` §3). Verdict: present, OTA-safe. Risk (1) and (4) are the ones the probe must kill.

**Minimal on-device probe (brief 02, before the feed is converted):** a hidden long-press on the "Activities"
title (`RidesScreen.tsx:214`) toggles the FIRST card's map slot between its live map and a freshly made snapshot
of the same card (same key inputs), `console.log` the make-time. No new rider-facing string (an image and an
existing title). Nathan judges: identical or not, in day and night, toggle on and off, and the time. Pass = he
cannot tell them apart and make-time < 1.5 s on his phone. Fail = stop; brief 03 is not written. The probe is
moved to `safe_to_delete/` by brief 03.

### Q3. Keep tab screens mounted
**RULING: against, this cycle.** No tab stays mounted; `App.tsx:215-218` unchanged. Not a "minimal version" either.
**REASON.** (i) After brief 02, ACTIVITIES has no native map: nothing to keep warm, and a hidden FlatList costs
memory for nothing. (ii) ROUTES is Nathan's fastest already; brief 01 removes its cover hold. (iii) RECORD is the
only candidate with a real win (back from a glance at ACTIVITIES mid-ride), but it is 1841 lines wired to the
tracker, the engine, keep-awake and fullscreen; `display:'none'` on Android sets the MapLibre SurfaceView GONE
(GL context retained, ~20-40 MB), and whether it stops its render loop and GPS-driven camera pushes is not
verifiable off-device. Resume semantics (RidesScreen `refresh`, RoutesScreen `refreshPositionIfPermitted`,
RecordScreen setup state) would all need "became visible" plumbing that does not exist. Cost/benefit is wrong
while the cheap fixes are unmeasured. If RECORD still reads slow after briefs 01+03 on device, open a cycle30 item:
"RECORD only, `display:'none'`, maps paused by `live=false`-style unmount of the map child, on-device memory read
via Android developer options", gated by its own probe.

### Q4. FREEZE RULE
**a. Definition (RULING).** A stored ride on way W with start time T0 is judged against
`priorWindowFor(W, rideId, T0)` (`colourModel.ts:85`): the rides of W that pass the store's `ranks()` TODAY
(`store/results.ts:ranks`: not estimated/missed, not tripwire-demoted, not currently ignored), started strictly
before T0 (`startedAtMs < beforeMs`), this ride excluded by id, last `WINDOW_PREV` = 9. Same-millisecond starts
cannot happen for one rider; strict `<` is correct. Lap tier = `tierFor(lapS, hist)`; sector colours =
`storedSectorColours(res, (i) => sectorHistory(priorWindow, i), tierLineColour)`; rank text = `positionAmong` over
the same `hist` (ties share the better position via `indexOf`, unchanged). `MIN_HISTORY` = 1: ride 1 of a way is
'neutral' with rank "P1/1" (pool = itself) - today's rule, now permanent instead of until ride 2 exists
(`colourModel.ts:47-52` documents exactly the drift Nathan dislikes). Ride 2 can only be purple or yellow.
**Derivable, no new persisted field, no migration**, because every result carries `startedAtMs` and
`priorWindowFor` already does this for REPLAY. Add to `colourModel.ts`: `priorLapValues(wayId, rideId, beforeMs)`
and `priorSectorValues(wayId, index, rideId, beforeMs)` (thin wrappers, same shape as lines 135/157), and
`priorPoolFor(wayId, rideId, beforeMs)` = `[...priorWindowFor(...), own].sort(startedAtMs)` for Q4d's list.
Digest E's UNVERIFIED #2 is settled: yes, from stored data.

**b. Gate edits (RULING).** The digest's UNVERIFIED #1 is moot. `editWayGates` (`store/routeFromRide.ts:~495-554`)
removes EVERY stored result on the way and re-derives the rides against the new gates; the rider is told so in
`GateAdjustScreen.tsx:57-59` ("old times and ranks do not survive, the activities do"). Sectors are redefined, so
there is nothing old to keep: a gate edit is a deliberate reset of the way's timing, after which every ride is
re-judged with rule (a) on its new times. Acceptable; it is what the existing alert promises. No code change.

**c. Ignore / count (RULING).** The ride's OWN toggle still applies to its own card and page: ignored ->
`lapTier 'neutral'`, `sectorColours` all null, "Not ranked", menu offers "Count in ranking" (`rideDetailModel.ts:120,
126, 132`; `feedModel.ts:81-97`; unchanged). Ignoring ride A DOES change later rides B, C: A leaves their prior
window (because the window is `ranks()`-filtered today, and ruled to stay so). Counting A again puts it back.
Nathan's sentence "not when other rides are ignored/counted" is therefore NOT implemented, deliberately: see §1 and
§5. Everything else in his freeze rule is: new rides never touch old cards; later gate edits are covered by (b).

**d. Surfaces reading the calculation (RULING per surface).**
| Surface | Today | Ruling |
|---|---|---|
| ACTIVITIES card: `RidesScreen.tsx:165` `buildRideRows` laps callback and `:176-184` `rideDetailFor` deps | `lapValues`/`sectorValues` = window as of NOW | switch to `priorLapValues`/`priorSectorValues` with `beforeMs` = the row's `startMs` (`buildRideRows` already has `m.startMs`; extend the `laps` callback signature with `beforeMs`, suite-pinned) |
| Ride detail page: `RideDetailScreen.tsx:150-158` | NOW | same switch, `beforeMs = request.startedAtMs` |
| Ride detail "ON THIS ROUTE" list: `RideDetailScreen.tsx:83` `rankingPoolFor(wayId, lastRideId)` | NOW (last 10 incl. later rides) | `priorPoolFor(wayId, rideId, startedAtMs)`, else the list contradicts the frozen "P3 of 10" one line above it |
| REPLAY: `ReplayScreen.tsx:64` `priorWindowFor` | already as-ridden | unchanged; now agrees with the card by construction |
| RECORD live (`liveTierFor`, `live/towerSource.ts`, `rankingRevealModel.ts`, `selfRaceModel.ts` via `ghostsFor`) | window as of now = as of the ride, for a ride in progress | unchanged; identical by definition |
| DEMO (`demoModel.ts`, own fixture history) | self-contained | unchanged |
| ROUTES route-focus trend panel (`trendPanelModel.ts`, `resultsPlotModel.plotWindow`/`toneFor`) | last 10 ranked, tone vs the current mean; tones are fastest/faster/slower, not tier verdicts | unchanged: it describes the WAY now, not a ride then. Note in the brief that a dot's tone and a card's tier are different questions |
| `allTimeBestLapS`, `rankedCountFor` | all-time | unchanged |
Tests: `ridedetail_suite`, `ridehistory_suite`, `feedmodel_suite` inject `laps`/`sectors`, so the models need no
change; add `colourModel` cases for `prior*` (mirror `replay_suite`'s `priorWindowFor` cases: later ride excluded,
own ride excluded, cap 9, ignored prior ride excluded, ride 1 -> []).

**e. Snapshot invalidation (RULING).** The key (Q2b) hashes the exact colour array and toggle, so a card's snapshot
changes only when its colours change, which after (a)-(c) happens on: its own ignore/count, an EARLIER ride's
ignore/count, a gate edit (new result, new `gateSetVersion`), a theme flip, the SETTINGS toggle. New rides never
invalidate anything. The queue re-runs on `resultsTick`; stale files age out by LRU. Order of briefs: freeze (03)
lands BEFORE the feed conversion (04) so the first batch of snapshots is already stable.

### Q5. Cover and cache from c93f406
**RULING.**
- Keep `mapStyleCache.ts` as is.
- Change the lift signal: `mapCoverModel.mapCoverLifts` lifts on `styleFailed || timedOut || (styleLoaded &&
  frameRendered)` where `frameRendered` is now set by the FIRST `onDidFinishRenderingFrame` OR `...Fully` (wire both
  in `wayMapView.tsx:769-770` and `catalogMapView.tsx:266-267`). Rename the input to `firstFrame` in the model so the
  suite reads true. The white flash came from the native view's default clear colour BEFORE the style's background
  layer painted; after `onDidFinishLoadingStyle` + one frame the background is the style's own, and tiles paint in
  progressively, which Nathan never experienced as slow. Covers lift in ~100-300 ms instead of "all tiles or 5 s".
- Timeout: 5000 -> 2500 ms (`MAP_COVER_TIMEOUT_MS`). With the first-frame signal it is a pure safety net.
- Fix the inspector's minor 1: in `useMapCover`, reset `goneKey` on key change (`useEffect(() => setGoneKey(null),
  [key])` is a re-render; cheaper: track `gone` inside the per-key `seen` object and derive `covered` from it).
  Pin A->B->A in `mapcover_suite`.
- Also fix minor 2 while there: when a retry lands, `setStyleFailed(false)` so the recovered patched rung gets a
  cover (`wayMapView.tsx:540-548`; same in catalogMapView).
- After brief 04 the cover is unreachable on ACTIVITIES cards except the live fallback (Q2c); it stays for RECORD,
  ROUTES, ride detail, gate adjust. Not redundant, do not remove.
**UNVERIFIED (device):** that `onDidFinishRenderingFrame` fires promptly on Android (MLRNMapView.kt:718-727 routes
both branches to events, so the plumbing exists). Brief 01's on-device check is the test.

### Q6. What is wrong or missing
1. The diagnosis misses that the cover's lift condition, not only the map count, is what Nathan sees (§1).
   Digest D's "Non-live cards show a placeholder" is right but the live cards' cover is the same colour, so he
   cannot tell "not mounted yet" from "mounted, waiting for all tiles"; both read as black.
2. Digest F anchors the wrong API (view snapshot). The headless `StaticMapImageManager` is the one to use (Q2a).
3. Digest E's two UNVERIFIEDs are settled (Q4a, Q4b). Correction: ride-detail `hist` is not just "other rides as of
   now", it is the last 9 ranked rides, which INCLUDES later rides; so today a 3-week-old card can flip from
   purple to yellow because of this morning's ride. That is the drift Nathan is reacting to.
4. Profiling: no instrumented profile before brief 01; Nathan's eyes on brief 01 (cover fix + visible-only) are the
   cheapest profile and separate the two causes: if ACTIVITIES still trails RECORD after 01, it is the map count
   (-> brief 02/04 are the fix); if all three tabs are now fine, 02/04 become a "preload once" nicety he still asked
   for. Brief 02's probe logs the one number that matters (snapshot make-time).
5. Not in the direction: on a theme flip with both styles cached, `wayMapView` still goes url-rung -> patched (two
   native mounts; inspector minor 3) because the lazy `useState` only runs at mount. One-line fix in brief 01:
   `useEffect` on `styleUrl` already calls `setPatchedStyles(cached)` - make `mapStyleFor` take
   `cachedPatchedStyles(styleUrl)` directly when `patchedStyles?.url !== styleUrl`. Include; it is the RECORD
   day/night case.

---

## 3. Corrections to the digest
- F: `createStaticMapImage` (`Map.tsx:250`) is a LIVE-VIEW snapshot (`MLRNMapView.kt:1086 takeSnap` ->
  `MapLibreMap.snapshot`, requires a rendered map). The right API is `StaticMapImageManager.createImage`
  (`src/modules/static-map/StaticMapManager.ts`, `MLRNStaticMapModule.kt`), headless, style-JSON in, PNG out.
  "Can it capture overlay layers": the live snapshot captures the GL frame, so yes, but the headless path makes
  the question irrelevant: our layers ARE the style. "In the installed native build": yes (Q2d (5)).
- F: `bounds` is flat `[west, south, east, north]`, not the nested pairs in the JSDoc example.
- E: `rideDetailModel.ts:122-126` `hist` is `d.laps(wayId)` = `lapValues(wayId, rideId)` = `ghostsFor` = last 9
  `ranks()` rides by start time EXCLUDING only the ride itself, i.e. later rides included. "Other rides as of NOW"
  undersells it.
- E UNVERIFIED 1: results store `derivedBy.gateSetVersion` (`store/types.ts:133-137`) but a gate edit deletes and
  re-derives them (`routeFromRide.ts:editWayGates`), so "survive later gate edits" is not a thing that can be asked.
- E UNVERIFIED 2: `priorWindowFor` (`colourModel.ts:85`) already rebuilds the as-of-then window; cycle14 shipped it.
- A: the cover colour is `t.race.bg` = `colors.bg` at night (`theme.ts:115`): the "black" Nathan sees is the cover.
- B: `App.tsx` tab switch is at lines 215-222 (not 215-218); correct in substance.
- G: ranking "number of simultaneous maps" is plausible but unproven; the cover's all-tiles lift condition and the
  5 s timeout (inspector minor 4) explain ACTIVITIES' long hold on their own when any one card's tiles are slow.

---

## 4. Ordered work plan

| # | Brief | Scope | Files | Risk | Ship | Gate |
|---|---|---|---|---|---|---|
| 01 | `cover-first-frame-and-visible-only` | Q5 lift signal + timeout 2500 + minor 1/2 fixes + theme-flip cached rung (Q6.5); Q1 values | `mapCoverModel.ts`, `mapCover.tsx`, `wayMapView.tsx`, `catalogMapView.tsx`, `activityCard.tsx`, `RidesScreen.tsx`, `tests/mapcover_suite.ts`, `tests/feedmodel_suite.ts` | low | OTA | Nathan on device, day+night: no white flash; black hold gone or short on all 3 tabs; report ranking again |
| 02 | `snapshot-probe` | `wayMapLayers.ts` extraction (parity test), `cardSnapshotModel.ts` (style JSON builder, key, padded bounds, fit zoom), `cardSnapshotQueue.ts` minimal (one at a time), `FsAdapter.importFile/fileUri`, hidden long-press A/B on card 1 | new files + `wayMapView.tsx` (imports only), `storage/fsAdapter.ts`, `storage/expoFsAdapter.ts`, `RidesScreen.tsx` (probe), suites | medium (native snapshotter behaviour) | OTA | Nathan: indistinguishable in 4 states, make-time < 1.5 s. FAIL = stop here; cover fix stands |
| 03 | `freeze-rule` | Q4: `prior*` in `colourModel.ts`, 3 call sites, `priorPoolFor` for the detail list, `buildRideRows` laps callback gets `beforeMs` | `colourModel.ts`, `rideHistoryModel.ts`, `RidesScreen.tsx`, `RideDetailScreen.tsx`, suites | low | OTA | suite green; Nathan opens an old ride: card, page and "ON THIS ROUTE" agree; today's ride did not recolour yesterday's |
| 04 | `snapshot-feed` | convert cards: image path, placeholder->fade, failure->live fallback, queue priorities + gates (style cache, no session), LRU 80, orphan sweep, pre-generate other theme/toggle; probe moved to `safe_to_delete/` | `activityCard.tsx`, `RidesScreen.tsx`, `cardSnapshotQueue.ts`, `cardSnapshotModel.ts`, suites | medium | OTA | Nathan: ACTIVITIES opens with pictures, no black; scroll never shows a black map; toggle flip crossfades; offline open shows cached pictures |
Dependencies: 02 needs 01 (shares `wayMapView.tsx`); 03 is independent of 02 but must land BEFORE 04; 04 needs 02
PASS and 03. Nothing native. No new rider strings in any brief (01 none; 02 an image + existing title; 03 none; 04 none).
Every brief: `node --experimental-strip-types tests/run.ts` zero FAIL, `tsc --noEmit` clean, fresh-Opus inspect.

---

## 5. Open questions only Nathan can answer
1. **Ignore propagation (Q4c).** Ruled: ignoring an earlier ride DOES re-judge later rides on that way (and
   counting it again restores them); nothing else ever recolours an old card. Alternative: a true freeze that
   also ignores the toggle, which needs a stored pool per ride at ride end + a one-off migration that invents pools
   for existing rides from today's data, and makes "Ignore in ranking" affect only the ignored ride itself. Say
   which; brief 03 is written for the ruling unless he objects.
2. **Probe pass criterion.** 1.5 s make-time on his phone is my number; if the pictures are identical but take
   3 s each, is a one-time background build (visible cards first, ~2 cards/5 s) acceptable? Default: yes, proceed.
