# Fable ruling: virgin-cycle29 map loading speed (2026-10-09)

> ## Amendment 2026-10-09 (Nathan's answers)
> The original ruling is kept verbatim as `03-fable-ruling-v1.md`. Nathan answered the two open questions; this file is
> amended in place (Q4 a/c/d/e, §4 work plan, §5). Where the amended text and the v1 text disagree, THIS file wins.
> 1. **Ignore propagation: TRUE FREEZE** of what a card shows. If ride A was in ride B's pool when B was ridden, B keeps
>    counting A (colours, lap tier, P-rank, detail page, "ON THIS ROUTE") even after A is ignored. A's OWN card goes
>    neutral / "Not ranked" at once. An ignored ride leaves FUTURE pools only (rides ridden after the ignore, live
>    ghosts/selfs, the trend plot, results). Mechanism: one optional stored field per result, `ignoredAtMs` (§Q4a below);
>    results already ignored today carry no timestamp and count as ignored since the beginning; no migration.
> 2. **Gate edits: old activities stay untouched** (times, ranks, colours as ridden); only future rides use the new
>    gates. Today `editWayGates` deletes and re-derives every stored result. NOT in the main chain: brief 05 is a
>    SCOPING brief (`04-brief-05-gate-edit-keeps-old-activities-SCOPING.md`), independent of 02-04, after 01; brief 03
>    is written so 05 extends it without rework (pool predicate takes the result, not just its id).
> 3. The gate-edit alert text / themed dialog moves to cycle30 (Nathan creates it). Nothing in cycle29 touches
>    `GateAdjustScreen.tsx` alert strings.
> Fable's view of the answers: (1) is a defensible product call and cheaper than I feared (one optional field, one
> predicate); the one real hole is count-then-re-ignore (a single timestamp cannot represent two intervals), ruled
> below as "last ignore wins" and accepted. (2) is right in principle and expensive in practice; the scoping brief
> exists to make that cost visible before anyone codes it. The one thing I would push back on: "comparison across
> versions = none" means a way whose gates were edited once starts its ranking history from zero for the rider's
> NEXT ride (ride 1 of v2 is neutral, P1/1). That is a consequence Nathan should see written down before brief 05
> is executed; it is in §Q4b and in brief 05's recommendation.

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
  (line 85, cycle14 replay). Feed, detail page and the detail's "ON THIS ROUTE" list switch to it in three call sites.
  *(Amended: v1 proposed letting a later "Ignore in ranking" propagate into old cards; Nathan ruled a true freeze,
  implemented with one optional `ignoredAtMs` field and an as-of-then predicate. See Q4a/c and the amendment block.)*
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
**a. Definition (RULING, amended).** A stored ride B on way W, start time T0, is judged against its FROZEN prior
window `priorWindowFor(W, B.rideId, T0)` (`colourModel.ts:85`, cycle14 replay; its predicate changes as follows):
the results of W, started strictly before T0 (`startedAtMs < T0`), B excluded by id, that pass
`rankedAsOf(r, T0)`, last `WINDOW_PREV` = 9, ascending by start. `rankedAsOf(r, T0)` (new, pure, `store/results.ts`
next to `ranks()`):
  - quality `clean` or `interrupted`, `scoredS(r.lap) !== null`, not `tripwireDemoted` (same as `ranks()`; these are
    properties of the stored derivation, which only a re-derive changes: stable, derived as-of-then, NOT frozen);
  - and the ignore clause: `r.ignoredFromRanking !== true` OR (`typeof r.ignoredAtMs === 'number'` AND
    `r.ignoredAtMs > T0`). An ignored result WITHOUT `ignoredAtMs` (every result ignored before this brief) counts as
    ignored since the beginning: excluded from every pool, exactly as today (so `replay_suite`'s `uIgnored` pin holds).
  - `ranks(r)` itself is unchanged and stays the predicate for every FUTURE/NOW pool (`ghostsFor`, `rankingPoolFor`,
    `allTimeBestLapS`, `plotWindow`, tower, backfill). Only `priorWindowFor` uses `rankedAsOf`.
New optional field `RideResult.ignoredAtMs?: number` (`store/types.ts` after `ignoredFromRanking`): epoch ms of the
LAST time the rider ignored this ride. `setIgnoredFromRanking(rideId, true)` sets `ignoredFromRanking: true,
ignoredAtMs: Date.now()`; `(rideId, false)` drops BOTH fields (today it already drops `ignoredFromRanking`;
"counted" = both absent, byte-identical in meaning to never ignored). Re-ignore after counting: a NEW timestamp
("last ignore wins"): rides ridden between the count and the re-ignore keep A (A.ignoredAtMs > their start), rides
ridden during the FIRST ignore interval lose their frozen state the moment A is counted and get A back when A is
re-ignored - a single field cannot represent two intervals. Accepted and documented; the realistic use is one ignore.
`isValidRideResult` (`resultsStore.ts:73`) stays permissive (optional field, no check needed beyond "absent or finite
number": add that one line). `RESULT_SCHEMA_VERSION` stays 2 (optional field; `migrations.ts` untouched). No
migration: old ignored results have no timestamp by construction.
Ordering vs B's start: strict `>`; A ignored in the same millisecond B started is ignored "before" B (irrelevant in
practice; pinned so no executor guesses). B's OWN ignore state is read from B directly (`rideDetailModel.ts:120`),
never from the pool.
Lap tier = `tierFor(lapS, hist)`; sector colours = `storedSectorColours(res, (i) => sectorHistory(priorWindow, i),
tierLineColour)`; rank text = `positionAmong(lapS, hist)` (ties share the better position). `MIN_HISTORY` = 1: ride 1
of a way is 'neutral' + "P1/1" forever. Add to `colourModel.ts`: `priorLapValues(wayId, rideId, beforeMs)`,
`priorSectorValues(wayId, index, rideId, beforeMs)`, `priorPoolFor(wayId, rideId, beforeMs)` =
`[...priorWindowFor(...), own]` sorted by start (own = the stored result; `[]`-safe when missing). For brief 05's
future extension every one of these takes the RESULT (`own`) as the thing being judged, so a gate-set clause can be
added to `rankedAsOf(r, own)` without changing call sites: define `rankedAsOf(r: RideResult, judged: { startedAtMs:
number; derivedBy: { gateSetVersion: number } })` from day one, reading only `judged.startedAtMs` for now.

**b. Gate edits (RULING, amended).** Today `editWayGates` (`store/routeFromRide.ts:~495-554`) removes EVERY stored
result on the way and re-derives the rides against the new gates; `GateAdjustScreen.tsx:57-59` tells the rider so.
Nathan now wants old activities UNTOUCHED and only future rides on the new gates. That is a store-model change
(results of two gate versions coexisting on one way; pools, ghosts, selfs, reference ride and the trend plot all
version-aware) and is NOT executed in cycle29: brief 05 scopes it. Two facts for that brief, verified: (i) every
result already stores `derivedBy.gateSetVersion` (`store/types.ts:133-137`) and `isStale()` (`results.ts:76`) already
knows how to detect a version mismatch - the data model is halfway there; (ii) "comparison across versions = none"
means the rider's first ride after an edit is ride 1 of a new history (neutral, P1/1) and the reference ride must be
re-timed at the new version to race as a dot (today `editWayGates` does exactly that for the reference). Until 05
lands, a gate edit keeps today's reset behaviour, and because brief 03's `rankedAsOf` takes the judged result,
adding `r.derivedBy.gateSetVersion === judged.derivedBy.gateSetVersion` later is one clause, no call-site change.
Alert text: untouched in cycle29 (cycle30).

**c. Ignore / count (RULING, amended).** The ride's OWN toggle applies at once to its own card and page: ignored ->
`lapTier 'neutral'`, `sectorColours` all null, "Not ranked", menu offers "Count in ranking" (`rideDetailModel.ts:120,
126, 132`; `feedModel.ts:81-97`; unchanged). Ignoring ride A at time Ti does NOT change any ride B with
`B.startedAtMs < Ti` (A stays in B's frozen pool via `ignoredAtMs > T0`); it removes A from the pool of every ride
ridden after Ti, from the live ghosts/selfs (`ghostsFor`, unchanged `ranks()`), from `rankingPoolFor`, the trend plot
and `allTimeBestLapS`. Counting A again removes the timestamp: A is back in every pool, past and future (the
count-then-re-ignore caveat in (a)). The v1 ruling's propagation is withdrawn.

**d. Surfaces reading the calculation (RULING per surface).**
| Surface | Today | Ruling |
|---|---|---|
| ACTIVITIES card: `RidesScreen.tsx:165` `buildRideRows` laps callback and `:176-184` `rideDetailFor` deps | `lapValues`/`sectorValues` = window as of NOW | switch to `priorLapValues`/`priorSectorValues` with `beforeMs` = the row's `startMs` (`buildRideRows` already has `m.startMs`; extend the `laps` callback signature with `beforeMs`, suite-pinned) |
| Ride detail page: `RideDetailScreen.tsx:150-158` | NOW | same switch, `beforeMs = request.startedAtMs` |
| Ride detail "ON THIS ROUTE" list: `RideDetailScreen.tsx:83` `rankingPoolFor(wayId, lastRideId)` | NOW (last 10 incl. later rides) | `priorPoolFor(wayId, rideId, startedAtMs)`, else the list contradicts the frozen "P3 of 10" one line above it |
| REPLAY: `ReplayScreen.tsx:64` `priorWindowFor` | as-ridden by time, but `ranks()`-filtered (a later ignore removes a self) | inherits `rankedAsOf` through `priorWindowFor` itself: a self ignored AFTER the replayed ride stays in the replay; no call-site change |
| RECORD live (`liveTierFor`, `live/towerSource.ts`, `rankingRevealModel.ts`, `selfRaceModel.ts` via `ghostsFor`) | window as of now = as of the ride, for a ride in progress | unchanged; identical by definition |
| DEMO (`demoModel.ts`, own fixture history) | self-contained | unchanged |
| ROUTES route-focus trend panel (`trendPanelModel.ts`, `resultsPlotModel.plotWindow`/`toneFor`) | last 10 ranked, tone vs the current mean; tones are fastest/faster/slower, not tier verdicts | unchanged: it describes the WAY now, not a ride then. Note in the brief that a dot's tone and a card's tier are different questions |
| `allTimeBestLapS`, `rankedCountFor` | all-time | unchanged |
Tests: `ridedetail_suite`, `ridehistory_suite`, `feedmodel_suite` inject `laps`/`sectors`, so the models need no
change beyond `buildRideRows`' `laps` callback gaining a third `beforeMs` argument; add `colourModel`/`results` cases
for `rankedAsOf` and `prior*` (later ride excluded; own ride excluded; cap 9; ignored-without-timestamp excluded;
ignored AFTER the judged ride's start included; ignored BEFORE it excluded; counted again included; ride 1 -> []),
plus a `resultsStore` case that `setIgnoredFromRanking(true)` writes a finite `ignoredAtMs` and `(false)` drops both
fields. `replay_suite:364-391` must stay green unchanged.

**e. Snapshot invalidation (RULING, amended).** The key (Q2b) hashes the exact colour array and toggle, so a card's
snapshot changes only when its colours change, which after (a)-(c) happens on: its OWN ignore/count; an EARLIER
ride being COUNTED AGAIN (its timestamp disappears, so it re-enters pools it had left) or ignored-then-counted
cycles; a gate edit (today: new result; after brief 05: never for old rides); a theme flip; the SETTINGS toggle. New
rides never invalidate anything; ignoring an earlier ride never invalidates anything. The queue re-runs on
`resultsTick`; stale files age out by LRU. Order: 03 lands BEFORE 04 so the first batch of snapshots is stable.

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

## 4. Ordered work plan (amended)

Briefs live in this folder as `04-brief-NN-*.md`; `EXECUTOR-RULES.md` / `INSPECTOR-RULES.md` are the cycle's tier rules.

| # | Brief file | Scope | Risk | Ship | Gate (on device unless stated) |
|---|---|---|---|---|---|
| 01 | `04-brief-01-cover-first-frame-and-visible-only.md` | Q5 lift on first frame, timeout 2500, minor 1/2, theme-flip cached rung; Q1 values | low | OTA | day+night: no white flash; black hold gone/short on all 3 tabs; Nathan re-ranks the tabs |
| 02 | `04-brief-02-snapshot-probe.md` | `wayMapLayers.ts` extraction + parity test; `cardSnapshotModel.ts` (style JSON, key, padded bounds, fit zoom); `cardSnapshotQueue.ts` minimal; `FsAdapter.importFile/fileUri`; hidden long-press A/B on card 1 | medium | OTA | indistinguishable in 4 states (day/night x toggle on/off); make-time logged < 1.5 s. FAIL = stop, 04 is not executed |
| 03 | `04-brief-03-freeze-rule.md` | Q4 amended: `ignoredAtMs`, `rankedAsOf`, `priorWindowFor` predicate, `prior*` helpers, 3 call sites + `priorPoolFor` list, `buildRideRows` `beforeMs` | low | OTA | suite; Nathan: ignore an OLD ride -> only its own card changes, later cards keep their colours; a NEW ride does not recolour yesterday's |
| 04 | `04-brief-04-snapshot-feed.md` | convert cards to images; placeholder->fade; failure->live fallback; queue priorities + gates; LRU 80; orphan sweep; pre-generate other theme/toggle; probe to `safe_to_delete/` | medium | OTA | ACTIVITIES opens with pictures, no black; scroll never shows a black map; toggle flip crossfades; offline shows cached pictures |
| 05 | `04-brief-05-gate-edit-keeps-old-activities-SCOPING.md` | SCOPING ONLY (no app code): what to store, how pools/ghosts/reference/trend treat versions, migration, snapshot key, recommendation + risks | n/a | doc | Nathan reads it; a cycle30+ brief follows |
Order: 01 -> 02 -> 03 -> 04 (03 may run before 02; 04 needs 02 PASS and 03). 05 after 01, independent of 02-04, may run
in parallel with 03 ONLY because it writes no code. Nothing native. No new rider strings in any brief (05 writes none).
Every code brief: `node --experimental-strip-types tests/run.ts` zero FAIL (baseline 971/968/0/3), `tsc --noEmit` clean,
fresh-Opus inspect before the next brief starts.

## 5. Open questions only Nathan can answer (amended)
Both v1 questions are answered (amendment block at the top). Remaining, genuine product calls - none block briefs 01-04:
1. **After a gate edit (brief 05 territory):** the rider's next ride is ride 1 of a new history (neutral, "P1/1"), and the
   way's ghost dots are only rides timed at the current version (initially the re-timed reference alone). Confirm that
   is what "only future rides use the new gates" means, or say that the reference's old-version time should seed the
   new history. Brief 05 recommends the former.
2. **Count-then-re-ignore:** one timestamp = "last ignore wins" (Q4a). If he ever wants exact intervals, that is a list
   field and a bigger brief; default is the single field.
