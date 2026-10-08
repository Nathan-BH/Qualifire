# virgin-cycle26 — 03 live map digest (LIVE / RACE / DEMO / REPLAY)

Date: 2026-10-08. Role: Haiku DIGEST, read-only on code. Facts with file:line anchors only. Where unsure: "unclear".
Context read: 00-nathan-ideas.md (ruling: no warnings, no blocks; idea: dim the return pass's line and gates while the rider is still on the way out, driven by the engine's forward-only chainage; same in DEMO and REPLAY). 01/02 digests not re-read in this pass.

## TL;DR
- There is no component named RouteMapView or file demoRouteFixture.ts in this repo. The map is `app/src/ui/wayMapView.tsx` (`WayMapView`, MapLibre rung `MapLibreWayMap`, line 387). The demo geometry is `app/src/ui/demoWayFixture.ts` (`DEMO_WAY_ASSET`, line 21). Core is `app/core/src/` (no `core/src` at repo root).
- Every map layer is an always-mounted GeoJSON source with data built per render/memo. Styling is per-layer static paint. Only `selfs` (`self-dot`) uses a per-feature state expression, and that is state "finished" vs not, not progress. No layer is currently styled by chainage, and no gate feature carries an index, chainage or passed/next/future state.
- The engine already exposes everything needed to decide "which pass am I on": `LiveProjector.chainage` (forward-only), `GateDetector.nextGateIndex`, `LiveEngineState.chainageM`, `currentSector`, `lastDone`. The UI (`RecordScreen`) subscribes to it (`RecordScreen.tsx:384`) but passes only `sectorColours`, `trail`, `selfs` and `lat/lon` into the map. It does NOT pass `chainageM` or `nextGateIndex` to the map.
- Gate features carry only `{name, colour?}` (`wayMapGeo.ts:55-58`). Gate geometry is a perpendicular tick at `asset.gates[i]` lat/lon (`wayMapGeo.ts:336-380`). Two gates at the same lat/lon are not distinguishable in the render data, and the tap handler maps back to a gate by `name` (`wayMapView.tsx:901-904`).
- The route line is ONE polyline (`wayLineFeature`, `wayMapGeo.ts:43-53`). A retraced stretch is the same coordinates drawn twice. Dimming "the return pass" needs the stretch split by path index (as `sectorSpansFeatureCollection` does via `gateIdx`, `wayMapGeo.ts:519-560`), or a per-feature opacity property. Neither exists today.
- DEMO does NOT use the engine. It drives the map from a scripted clock (`demoChainage`, `demoModel.ts:235`; `positionAtTime`, `DemoScreen.tsx:319`) and `demoSectorColours` (`demoModel.ts:112`). REPLAY uses the recorded fixes with `sM` (`replayModel.ts:52`, `121`) and `replayGatesDone` (`replayModel.ts:127`), not the engine. So the engine's chainage is not available to DEMO or REPLAY; each would need its own chainage source for the same behaviour.
- Rider-facing strings for gate, sector and lap are almost absent from `tests/ui-strings.allow.json`. The live-screen LAP/sector labels in `liveView.tsx` are not literal entries in the allow list (unclear whether they are generated; no match found).

## 1. LIVE and RACE map rendering (wayMapView.tsx, MapLibre rung)

Surfaces that mount WayMapView in live or race mode (RecordScreen.tsx):
- Prestart preview, `variant="live" liveState="prestart"`: `RecordScreen.tsx:1267-1275` (no trail, no sectorColours).
- Race/live ribbon, `variant="live"`, `zoom={4}`, `sectorColours`, `trail` (if `mapOverlay.showTrail`), `selfs` (if `settings.selfDots`): `RecordScreen.tsx:1416-1427`. `gateColours={undefined}` at 1421. `liveState` = `'finished' | 'stopped' | 'moving'` at 1425.
- Recording screen, `showRider`, `height={330}`: `RecordScreen.tsx:1535-1543` (no sector colours, no trail).

Layer inventory (render order = JSX order, which is also mount order; comments say mount order is what sets z-stacking):

| # | Source id | Layer id(s) | Type | Data (built where) | Paint | Updated when |
|---|---|---|---|---|---|---|
| 1 | ride-trace | ride-trace-core | line | `rideTraceFC` memo from `props.rideTrace` (wayMapView.tsx:612-616) | colors.riderBlue, width 2, opacity 0.85 (781-785) | replay only |
| 2 | route | route-casing, route-core | line | `wayFC` memo from `asset` via `wayLineFeature` (589-595) | casing CASING w7; core colors.neutral w4 (791-798) | asset change |
| 3 | trail | trail-casing, trail-core | line | `trailFC` memo from `props.trail` + tail at lat/lon (603-608) | casing w7; core neutral w4 (805-812) | every fix (lat/lon dep) |
| 4 | sector-spans | sector-spans-core | line | `sectorSpansFC` (inline, not memo) from `sectorSpansFeatureCollection(asset, props.sectorColours, props.leadColour)` (676-680) | `['case',['has','colour'],['get','colour'],'rgba(0,0,0,0)']`, width 4 (855-862) | each render; colours from `RecordScreen` memo `sectorColours` (1120-1130) |
| 5 | place | place-disc-fill, place-disc-line, place-centre | fill/line/circle | `placeFC` (683) | filtered by `part` | place only |
| 6 | gate-ticks | gate-ticks-casing, gate-ticks | line | `gateTicksFC` inline from `gateTicksFeatureCollection(asset, props.gateColours, gateHalfLen)` (669-671) | casing CASING w5; gate-ticks white (colors.white) w2, or colour w3 if `has colour`; opacity fixed 1 (908-916) | each render; `gateHalfLen` depends on zoom (`gateHalfLenM`, wayMapGeo.ts:331) |
| 7 | gate-selected | gate-selected-ring | circle | `gateSelectedFC` memo (631-638) | radius 15, stroke riderBlue w3, no fill (925-931) | gateSelect prop only |
| 8 | selfs | self-dot | circle | `selfsFC` memo from `props.selfs` (622-624) | radius 6; colour via `match` on `tier`; opacity `['case',['==',['get','state'],'finished'],0.35,0.7]`; stroke same pattern (942-958) | selfs prop |
| 9 | rider | rider-dot | circle | `riderFeature(props.lat,props.lon)` inline (960-962) | radius 7, opacity 0.85, fill white if off-route else riderBlue, stroke inverse (966-972) | each fix; mounted only if `showRider && here` (959) |

Notes:
- Per-GPS-fix update path: `RecordScreen` `live` state (subscribe at `RecordScreen.tsx:384`) plus `status` (`RecordScreen.tsx:323`) -> `riderDot` via `riderDotStep(...live.riderSnap)` (`RecordScreen.tsx:417-428`, `riderDotModel.ts`) -> `WayMapView lat/lon` (`RecordScreen.tsx:1418-1419`).
- `off` (off-route) is computed from `offWayM(asset, lat, lon) > OFF_WAY_M` (wayMapView.tsx:657-659). It is distance-based, not chainage-based.
- Already styled by progress or per-gate state: none of the line/tick layers. Two exceptions only:
  (a) `self-dot` opacity keys off `state === 'finished'` (wayMapView.tsx:953, 956), which is a self-run state, not progress on the live ride.
  (b) `sector-spans` and `gate-ticks` colour-by-data, where the data is "scored or not" from `liveSectorColours` (sectorTrailModel.ts:81-99): `sec.kind !== 'done' || sec.interrupted || sec.estimated` -> null. This is sector verdict colour, not pass/chainage state.
- `liveState` (prop, wayMapView.tsx:266) only controls gesture unlock and dim (`dimmedFrame`, line 1038, and `opacity: 0.4` on the frame). It is not applied to the GL layers.

## 2. Live engine state available to the UI each fix (names and types)

core/src/live.ts (platform-free, no React):
- `LiveFix` (51): `{ s: number; xtd: number; onRoute: boolean }`. `s` = monotonic chainage (m).
- `LiveProjector` (60): `chainage` getter (74) -> number. `update(x, y, t?)` (80) returns `LiveFix`. Forward-only: `this.sp = Math.max(this.sp, hit.s)` (line ~92).
- `GateDetector` (125): `nextGateIndex` getter (139) -> number. `update(t, s)` (144) returns `GateEvent[]` (`{gateIndex, time, estimated}`, types.ts). `skippedGates: number[]` (readonly, 134). Gates fire once, in order (latch by index).

app/src/live/engine.ts:
- `LiveSector` (76): `pending | current | done{rawS, stoppedS, movingS, interrupted, estimated} | missed{reason: 'skipped'|'offroute'}`.
- `LiveLap` (90): `{rawS, stoppedS, movingS, estimated}`.
- `LiveEngineState` (152-192):
  - `phase: 'idle'|'detecting'|'locked'|'finished'` (156)
  - `track: TrackId | null` (159)
  - `sectors: LiveSector[]` (161)
  - `currentSector: number | null` (163; 1-based; set in `getState` at 406-408 as `next` when `1 <= next < nGates`)
  - `lastDone: number | null` (≥1; 1-based sector of most recent gate, computed in getState)
  - `lap: LiveLap | null` (167)
  - `gateFires: number`, `fixesFed: number`, `onWay: boolean`, `pick: string | null`
  - `startGateT: number | null`
  - `chainageM: number | null` (184): reference candidate's `proj.chainage`, display-only.
  - `riderSnap: { lat; lon; xtdM } | null` (191): display projection, used by riderDotModel.
- Not in LiveEngineState: `nextGateIndex` (available only via `det.nextGateIndex` inside the engine), `skippedGates`, and any per-gate passed/next/future flag. The raw gate index for the next gate is therefore NOT exposed to the UI; UI can derive `currentSector` (=next) only.
- `getState()` at engine.ts:400-436. Subscribe at 452 (`subscribe(fn)`), gate events at 459 (`subscribeEvents`), diagnostics at 467 (`subscribeDiagnostics`).
- Note: `chainageM` is the monotonic chainage of the candidate ("reference"), which is per-pick. The engine runs one reference candidate (`this.locked`, engine.ts:401). For a retraced loop, forward-only chainage is what separates pass 1 and pass 2 on the path (as the idea assumes), but the path index for a given chainage is not exposed to the map. Mapping chainage to the path index for dimming would need the reference's `ch` array or `gateIdx`, both held in `wayMapMath` `WayAsset` (path, gateIdx, gates).
- Gate chainage list used by the engine: `specs.push({ id, ref, gates: gateSet.chainageM })` (src/live/tracks.ts:43). Gate chainage values are not on `WayAsset.gates` (gates carry lat/lon/name, wayMapView/wayMapMath `WayAsset`, wayMapMath.ts:37). Joining engine gate index to asset gate index is by array index only (no shared id) — unclear whether they are always aligned; `sectorSpansFeatureCollection` and `liveSectorColours` assume `sectors[k]` aligns with `gates[k+1]`.

## 3. Gate representation for drawing

- `WayAsset` (wayMapMath.ts:30-40): `gates: {name, lat, lon, ...}[]`, optional `path: [lat,lon][]`, optional `gateIdx: number[]` (path index per gate, length must equal gates).
- `gateTicksFeatureCollection` (wayMapGeo.ts:336-380): one LineString per gate, centred on `(g.lat, g.lon)`, perpendicular to heading. Heading: from path/gateIdx when present (344-351), else from neighbouring gates (355-358). Properties: `{name: g.name}` plus `colour` only if non-empty (`GateProperties`, 55-58; `colour` omitted when null, 361-365).
- No index, no chainage, no gate id in the feature properties. `name` is the only key.
- Two gates at nearly the same lat/lon but different chainage (e.g. a loop start/finish or a retraced junction): their ticks would be drawn at the same place. In the render data they are distinguishable only by `name` (unique? catalog.ts validation shows duplicate checks for landmark, route and way ids at catalog.ts:48,75,87, but no duplicate-gate-name check found in grep; unclear). Tap-to-select uses `findIndex(g => g.name === name)` (wayMapView.tsx:902-903), so duplicate names would select the first gate.
- Gate-tick heading at a retraced junction: taken from path index (gateIdx) when present, so the perpendicular follows the road the gate is on, which is correct per pass only if `gateIdx` differs per pass. Unclear for loops because a single path has one index per gate.
- Sector spans: `sectorSpansFeatureCollection` (wayMapGeo.ts:519-560) slices `path[gateIdx[i-1] .. gateIdx[i]]` per sector, with `properties {sector, colour?}` (487). This is the existing precedent for splitting the single polyline by path index. Lead-in/out (`lead: 'in'|'out'`, 540-560) are coloured with `leadColour`.
- Trail and ride-trace: `trailLineFeature` (trailModel.ts:62-79) builds one LineString from fixes with optional tail.

## 4. DEMO and REPLAY

DEMO (DemoScreen.tsx, demoModel.ts, demoWayFixture.ts):
- Map: `WayMapView` at DemoScreen.tsx:663 (first-ride, `wayId={DEMO_FIRST_RIDE_ID}`, no asset) and 666-669 (`asset={DEMO_WAY_ASSET}`, `sectorColours`, `leadColour={colors.grey}`, `liveState={running ? 'moving' : 'finished'}`). `key` includes `runSeq` so each run gets a fresh native map (DemoScreen.tsx:221-223).
- Clock: scripted `DEMO_SECS = [185, 207, 237, 207]` (demoModel.ts:62); `buildDemoScript` gives `gateAt` (93-98). `gatesDone` = count of `gateAt[i] <= clockS` (DemoScreen.tsx:280). Position: `positionAtTime(ASSET, script.gateAt, clockS)` (DemoScreen.tsx:319; wayMapMath.ts:168). Chainage: `demoChainage(gateAt, tSec)` (demoModel.ts:235), used by selfs (DemoScreen.tsx:292).
- Sector colours: `demoSectorColours(script, gatesDone, tierLineColour, priorLaps)` (DemoScreen.tsx:583; demoModel.ts:112). The engine is NOT used in DEMO (no `liveEngine` import in DemoScreen.tsx).
- Fixture: `DEMO_WAY_ASSET` (demoWayFixture.ts:21) with 5 gates `START, G1, G2, G3, FINISH` (33-37), `gateIdx: [7,40,76,120,157]` (31), `path` (39+). Frozen copy; comment at lines 2-14 says it is "not a catalog route".
- Stale comment: demoWayFixture.ts:8 mentions `RouteMapView` (the component no longer exists under that name).

REPLAY (ReplayScreen.tsx, replayModel.ts):
- Map: `WayMapView` at ReplayScreen.tsx:232-241. Passes `sectorColours` (143-144, from `replaySectorColours(detail.sectorColours, gatesDone)`, replayModel.ts:138), `leadColour` (239), `selfs` (240), `rideTrace={rider.fixes}` (241). No `trail` prop. `lat`/`lon` come from `pos`, which is `riderPositionAt(rider, clockS)` (ReplayScreen.tsx:115; lat/lon at 234-235; replayModel.ts:121-123), which interpolates the recorded fixes via `interpAt`. The `sM` field of that result is used only for the selfs position (ReplayScreen.tsx:129), not passed to the map.
- Gates done: `replayGatesDone(r, clockS)` (replayModel.ts:127-136) from recorded `gateMs` (crossing times), missed gates skipped.
- Replay fixes carry `sM` (recorded chainage per fix, replayModel.ts:52 `ReplayFix`, 94 built from `chainageM[i]`). So replay has per-fix chainage, but the map does not receive it.
- Engine not used in REPLAY.

Consequence for the idea: the "forward-only chainage" source differs by surface. LIVE: `liveEngine.getState().chainageM` (not wired to the map). DEMO: `demoChainage(gateAt, t)`. REPLAY: `riderPositionAt(...).sM` (returned, not passed to the map). A single prop on WayMapView (e.g. `passChainageM` or a per-gate `reached` array) would let all three feed the same layer.

## 5. MapLibre layer and style definitions (ids, paint props, expressions)

Layer ids (all in wayMapView.tsx unless noted):
- `ride-trace-core` (line) 782-784; paint `line-color` (colors.riderBlue), `line-width: 2`, `line-opacity: 0.85`.
- `route-casing` (line) 792-794: `line-color: CASING`, `line-width: 7`. `route-core` (line) 795-797: `line-color: colors.neutral`, `line-width: 4`.
- `trail-casing` 806-808 and `trail-core` 809-811: same as route.
- `sector-spans-core` (line) 856-861: `line-color: ['case',['has','colour'],['get','colour'],'rgba(0,0,0,0)']`, `line-width: 4`.
- `place-disc-fill` (fill, filter `part==disc`) 864-866; `place-disc-line` (line, filter) 867-869; `place-centre` (circle, filter `part==centre`) 870-877.
- `gate-ticks-casing` (line) 908-910: `line-color: CASING`, `line-width: 5`. `gate-ticks` (line) 911-915: `line-color: ['case',['has','colour'],['get','colour'],colors.white]`, `line-width: ['case',['has','colour'],3,2]`, `line-opacity: 1`.
- `gate-selected-ring` (circle) 925-930: radius 15, colour rgba(0,0,0,0), stroke riderBlue w3.
- `self-dot` (circle) 943-957: `circle-sort-key: ['get','sortKey']`; `circle-color: ['match',['get','tier'],'purple',...,'green',...,yellow]`; `circle-opacity` and `circle-stroke-opacity`: `['case',['==',['get','state'],'finished'],0.35,0.7]`.
- `rider-dot` (circle) 966-972: radius 7, opacity 0.85, colour `off ? '#FFFFFF' : colors.riderBlue`, stroke `off ? colors.riderBlue : '#FFFFFF'`, stroke width 2.

Mechanics:
- Per-feature data-driven styling exists only as `['has','colour']` / `['get','colour']` (gate-ticks, sector-spans), `['get','tier']` / `['get','state']` (self-dot), and `['get','sortKey']` for sort. Colours for gates and spans are per-feature properties set when the feature is built (wayMapGeo.ts:361-365, 528-532).
- No `line-opacity` or `circle-opacity` uses a feature property for progress. The only opacity expressions are on `self-dot`.
- Per-layer static: all route/trail/ride-trace/gate-ticks paint values are constants.
- `line-dasharray` is not used (sector-spans comment at wayMapView.tsx:~845 explicitly avoids it: "NO line-dasharray (the 2026-08-24 device-only dasharray bug class) and no line-gradient").
- Mount order is load-bearing: a source mounted later paints over earlier ones (comments at 782, 801, 829, 935). Adding a new source must keep `key === id` (wayMapView.tsx:266-273 comment; waymap_suite.ts:266-273 test).
- Basemap style: `app/src/ui/wayMapStyle.ts` (214 lines), not inspected in depth in this pass.
- Not MapLibre: the PNG rung (`WayMapView` PNG fallback) ignores trail, selfs, sector spans and rideTrace (per prop comments at wayMapView.tsx:278-300).

## 6. Tests touching map layer styling or live gate state

Map layers and GeoJSON builders:
- `app/tests/waymap_suite.ts:262-273` — source ids and mount order (`key === id`, "expected at least 4 <M.GeoJSONSource> tags (route, gates, gate-ticks, rider)").
- `app/tests/waymapgeo_suite.ts:161-241` — `gateTicksFeatureCollection` (heading, colour omission, `''` handling, stripped asset).
- `app/tests/waymapgeo_suite.ts:299-376` — `sectorSpansFeatureCollection` (slices, colours, lead-in/out, null rules at 362-366; leadColour at 372-376).
- `app/tests/waymapgeo_suite.ts:12-13` imports `waySplitFeatures` (exported; no src caller located in this pass — unclear if live).
- `app/tests/sectortrail_suite.ts:219-236` — `sectorSpansFeatureCollection` with ALL_YELLOW and storedSectorColours end-to-end.
- `app/tests/riderdot_suite.ts:34-48` — riderDotModel thresholds, engage/fade (dot vs raw fix).
- `app/tests/selfrace_suite.ts` — self dot model (not inspected in detail).
- `app/tests/live_colour_suite.ts` — live sector colours (`chainageM: null` fixture at line 68).
- `app/tests/demo_suite.ts:639-659` — demo gate chainage (`d.chainageM`, strictly increasing, deterministic across startMs). This is `demoChainage`/gate chainage, not the engine.

Live engine chainage and gate state:
- `app/tests/engine_suite.ts:42` — "live chainage went backward (monotonicity broken)".
- `app/tests/live_suite.ts:302-331` — LiveProjector seeding and bad anchor at ~4000 m.
- `app/tests/live_suite.ts:753-760` — riderSnap after first on-route fix.
- `app/tests/live_suite.ts:793-818` — E1 (pick is reference, S1 and startGateT on START fix, one gate event) and E2 (no pick, all positional fields null, including `chainageM`). Assertion at 802: pre-gate `chainageM` ~95.
- `app/tests/lib.ts:165` — helper: "chainage never decreased across the whole stream".
- `app/tests/build_fixtures.ts:88-89` — fixture chainage recomputation (replay).

Test names and exact `test(...)` labels for the layer tests were not all extracted; the line numbers above are the anchors.

## 7. Rider-facing strings on the live / race / demo screens (tests/ui-strings.allow.json)

Allow list has 434 entries (dict form). Relevant to gates, sectors, laps on live/race/demo surfaces:
- "START" (line 954 and 1787; file not extracted in this pass).
- "START NOT DETECTED" (810), "STARTING FROM" (818) — RecordScreen.tsx.
- "SECTORS" (1252) — file not extracted.
- "Gate buzz" (3031) — settings label, context not checked.
- "Gates saved — reference not re-timed" (564) and "Could not save the gates" (RecordScreen.tsx, plus GateAdjustScreen.tsx:556) — gate-adjust, not live map.
- "Tap a gate to move it" (584, GateAdjustScreen.tsx) — the only gate-tap prompt; gate-adjust card, not live.
- "DETECTED START" (RecordScreen.tsx) — present in allow list.
- "Interrupted · saved as free activity" (RecordScreen.tsx).
- DEMO: "RUN DEMO ACTIVITY", "demo only · nothing saved", "demo · nothing is recorded", "Demo speed {…}x", "FIRST", "SECOND", "TENTH".
- REPLAY: "replay speed", "replay over · {…}", "‹ BACK".

Not found as literal entries: LAP clock label, sector flash text, "estimated", "missed", gate-pass indicators in `liveView.tsx`. The file comment at liveView.tsx:3-28 describes the LAP clock and sector flashes, but the allow list has no matching string. Unclear whether they are formatted at runtime (e.g. m:ss.d) or absent from the allow list.
Implication for the idea: "no new strings" is satisfied if the change is purely paint opacity. Any "current pass" labelling would need an allow-list entry.

## 8. Other observations relevant to the idea (facts only)

- Forward-only chainage: `LiveProjector.update` (core/src/live.ts:80-120) only advances `sp`. Re-acquisition moves forward by at most `max(400, 15 m/s * dt)` (live.ts:~105-110). So on a retraced stretch the projector stays on the current pass once it has advanced past the first pass. The return-pass gates therefore have chainage larger than the rider's current `sp` until the rider reaches them. This is the mechanism the idea relies on; it is already in the engine.
- The `ride-trace` source (replay only) and `trail` (live) are both per-fix; they are not chainage-aware.
- `riderDotModel.ts` uses `riderSnap` (display projection), not chainage. Off-route badge uses true GPS distance (wayMapView.tsx:657-659).
- No `opacity` on the route or gate layers changes with any live state today, so "fainter return pass" would be the first progress-driven opacity on the line/ticks.
- Gate geometry for two passes over the same ground: the path is one polyline (wayLineFeature) and gate ticks sit at gate lat/lon. A per-pass dim on the shared stretch needs either (a) splitting `path` by `gateIdx` ranges with a per-slice property (as sector-spans already does, wayMapGeo.ts:519-560), or (b) a per-feature opacity expression on a new source. Both need path indices for the pass boundary, which the engine does not expose (unclear whether `WayAsset.gateIdx` covers a loop's second pass; it is one index per gate).
- DEMO and REPLAY would need the same pass-aware input; neither feeds the engine state to the map today.

## Open items the planner should resolve (not decided here)
1. Which chainage is the map input: engine `chainageM` (LIVE only), `demoChainage` (DEMO), `sM` from `riderPositionAt` (REPLAY). Each needs wiring into `WayMapView` props.
2. Gate pass identity: gate features have no index. Adding `index` to `GateProperties` (wayMapGeo.ts:55) would make per-gate state possible and avoid name collisions.
3. Path-range identity for a retraced stretch: `gateIdx` gives one index per gate. For a loop the return pass needs its own path range. Unclear how loop routes store this (not checked in store/catalog).
4. Engine gate index vs asset gate index alignment (both are array-index based; no shared id). Unclear whether they can diverge (e.g. skipped gates, `skippedGates` at live.ts:134).

## Files read (anchors above)
app/src/ui/wayMapView.tsx; app/src/ui/wayMapGeo.ts; app/src/ui/wayMapMath.ts (WayAsset 30-40, positionAtTime 168); app/src/ui/sectorTrailModel.ts; app/src/ui/trailModel.ts; app/src/ui/RecordScreen.tsx; app/src/ui/DemoScreen.tsx; app/src/ui/ReplayScreen.tsx; app/src/ui/demoModel.ts; app/src/ui/demoWayFixture.ts; app/src/ui/replayModel.ts; app/src/ui/liveView.tsx (header only); app/src/ui/riderDotModel.ts (name only); app/src/live/engine.ts; app/src/live/tracks.ts (43); app/core/src/live.ts; app/core/src/gates.ts (not read beyond exports); app/tests/*.ts (grep anchors); app/tests/ui-strings.allow.json (dict, 434 entries, filtered).
