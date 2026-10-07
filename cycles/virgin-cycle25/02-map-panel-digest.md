# virgin-cycle25: map-panel digest (Haiku, 2026-10-07)

Factual digest for the planner. No design proposals. Paths are relative to `app/` unless they start with `cycles/` or `process/`. Line numbers were read on the device tree at the time of writing. The working tree is dirty (see section 0), so re-check anchors before a brief cites them.

## 0. Repo state and baseline (read first)

- HEAD is `592a44f vcycle23+24` (2026-10-07 08:33 +0200), branch `virgin`. It already contains cycle23 briefs 01-03 and all of cycle24 (`catalogMapModel.ts`, `catalogMapView.tsx`, `RoutesScreen.tsx` rewritten, `tests/catalogmap_suite.ts`). The cycle24 inspection report (`cycles/virgin-cycle24/04-inspection-report.md`) said "nothing committed" against `d03f5df`. That is out of date. The commit landed afterwards.
- Uncommitted in the working tree (`git status --short`): cycle23 briefs 04-06 and their edits to `routeFromRide.ts`, `RideDetailScreen.tsx`, `activityCard.tsx`, `feedModel.ts`, `liveView.tsx`, `replayModel.ts`, `resultsListModel.ts`, `rideDetailModel.ts`, `rideHistoryModel.ts`, `tower.tsx`, `towerModel.ts`, `wayMapView.tsx`, several tests, and `tests/ui-strings.allow.json`. Also untracked: `cycles/virgin-cycle23/brief-04..06`, `report-brief-04/05`, `inspect-report-brief-04/05`, `scratch/`, and `cycles/virgin-cycle25/`, `cycles/virgin-cycle26/`.
- Baseline run, now (this session):
  - `cd app && node --experimental-strip-types tests/run.ts`: `923 tests: 920 pass, 0 fail, 3 skip`. Zero FAIL lines. The 3 skips are the existing engine-vs-python parity fixtures. Full log on device at `$HOME/scratch-digest-tests.log`.
  - `cd app && ./node_modules/.bin/tsc --noEmit`: exit 0, no output.
  - Not a failing baseline. The cycle23 COMMANDS.md quoted 920 pass as the brief 05 figure, and the brief 06 expectation was `923 tests: 920 pass`. Current numbers match that.

## 1. MAP tab as landed (cycle24, now in HEAD)

### 1.1 Files and component tree
- Tab wiring: `App.tsx:61-63` `TAB_LABEL` maps tab id `routes` to label `map`. Tab id stays `'routes'`. `App.tsx:243` renders `<RoutesScreen />` for `tab === 'routes'`.
- `src/ui/RoutesScreen.tsx` (138 lines, replaced wholesale by cycle24 brief 03). Header comment `:1-17`.
  - Local state: `focus` (`CatalogMapFocus`) at `:35`, default `{level:'overview'}`.
  - Deps object `:37-41`: `catalog: CATALOG`, `pathFor: catalogAssetFor(id)?.path`, `ridesFor: storedResultsForWay(id).length`.
  - `overview` memo `:43` (deps `[CATALOG]`). `place` at `:44` from `placeFocusModel`. `route` at `:45` from `routeFocusModel`.
  - Fallback effect `:48-52`: a focused place/route that no longer resolves drops to overview.
  - `gateAsset` `:54-56`: for route focus, `highlightWayId ?? route.usualWayId`.
  - `onPressRoute` `:60-66`: in place focus, the first tap on a route sets `highlightRouteId`; a second tap (or a tap when already highlighted) sets route focus with `highlightWayId: null`. In any other level it goes straight to route focus.
  - `openDetail` `:69-72`: sheet title opens `tabNav.openCatalog({kind:'place'|'route', id})`.
  - Render `:74-129`: `<CatalogMapView>` at `:76-86` (props below), sport badge `:87-91` (`pointerEvents="none"`, top-left), bottom sheet `:92-126` when `place || route`.
  - Sheet: header row `:94-102` (title + `›` opens detail, `×` calls `toOverview`). Scroll body `:103-124`. Place rows `:104-113` (label + `row.rides`). Route ways rows `:114-123`: tap sets `{level:'route', routeId, highlightWayId: row.wayId}`. Highlighted row uses `t.accentText`.
  - Sheet styles `:134`: `position absolute`, `left/right 12`, `bottom 34`, `maxHeight 280`.
- `src/ui/catalogMapView.tsx` (369 lines). Header `:1-17` (sibling of `WayMapView`, not a mode of it; D1).
  - MapLibre require in try/catch `:36-42`. Asset manifest `:45-47` via `bundledForSeedMode`.
  - Focus type `:74-77`: `overview` | `place {placeId, highlightRouteId}` | `route {routeId, highlightWayId}`.
  - Props `:79-89`: `overview: OverviewModel`, `focus`, `place: PlaceFocusModel|null`, `route: RouteFocusModel|null`, `gateAsset: WayAsset|null`, `sheetOpen: boolean`, `onPressPin(placeId)`, `onPressLine(routeId)`, `onPressEmpty()`.
  - Opacity and width constants `:62-69`: `LINE_OVERVIEW {0.55, 4}`, `LINE_GHOST {0.12, 4}`, `LINE_CONNECTED {0.95, 4}`, `LINE_HIGHLIGHT {1.0, 6}`, `WAY_HIGHLIGHT {1.0, 5}`, `WAY_USUAL {0.55, 4}`, `WAY_DIFF {0.85, 3}`.
  - Camera padding `:163-165`: bottom padding is 300 when `sheetOpen`, otherwise 48.
  - `linesFC` memo `:172-185`: a line that touches the focused route is set to `opacity 0` at `:181` (kept as a feature so it still hit-tests, see 1.5).
  - `waysFC` memo `:187-205`: in route focus, the highlighted way is drawn at `WAY_HIGHLIGHT` `:194`. The usual way is drawn at `WAY_USUAL` `:196`. Any other way draws only its differing stretches at `WAY_DIFF` `:198-200`, via `differingStretches(base, w.path)`.
  - `gatesFC` `:207-209`: gates for `props.gateAsset` only (the highlighted way, or the usual way by default).
  - `pinsFC` memo `:211-`: pin opacity by focus (`PIN_FADED` for non-neighbours and non-route-ends).
  - Sources are always mounted, in paint order: lines `:266-280`, ways `:281-288`, gates `:289-298`, pins `:299-310`.
  - Zoom bar `:336-348` (`+`, `−`, `⤢` = refit via `setMode('fit')`). Credit `:350` (`Credit` imported from `wayMapView.tsx:342`).
  - `routeEndpointIds` `:356-` reads `currentCatalog()` (see 1.5).
- `src/ui/catalogMapModel.ts` (277 lines). Pure. Constants `:29-32`: `MIN_SPAN_M 800`, `PAD_FRAC 0.15`, `DIFF_THRESHOLD_M 30`, `DIFF_GUARD 6e6`.
  - `usualWayId(c, routeId, ridesFor)` `:48-58`: the way with the most stored results; tie goes to `route.wayIds` order.
  - `pairKey` `:61`: A to B and B to A share a key; loops are their own key.
  - `overviewModel` `:102`. `placeFocusModel` `:154`. `routeFocusModel` `:203-225`. `differingStretches` `:228`. `boundsOfPoints` `:256`.
  - `routeFocusModel` returns `{routeId, label, usualWayId, ways: RouteWayRow[], bounds}` (`:197-201`). `RouteWayRow` `:196` is `{wayId, label, rides, usual, path}`. Way label is `wayVariantLabel(id, route, way.specs)` `:213`. `rides = deps.ridesFor(id)` `:214`. Ways are ordered by `orderedWayIds` `:80`.
  - Dangling way id is unguarded: `c.ways.find(...)!` at `:209` (see brief-03 review L3).
- Tests: `tests/catalogmap_suite.ts` (237 lines, 20 tests, all `catalogmap:` prefixed). Registered in `tests/run.ts` (import line added by cycle24).

### 1.2 The three map levels (as built)
- OVERVIEW (`focus.level === 'overview'`): one line per route pair (`pairKey`), the usual way only, `LINE_OVERVIEW`, no casing, no gates. Every place is a labelled pin. Fit to all pins (`overview.bounds`). Sheet closed.
- PLACE focus (`{level:'place'}`): the place's neighbour routes at `LINE_CONNECTED`, other lines ghosted at `LINE_GHOST` (still drawn), non-neighbour pins at 0.3. Sheet lists routes out of and into the place (`place.rows`, with `direction` from/to/loop).
- ROUTE focus (`{level:'route'}`): the highlighted way at `WAY_HIGHLIGHT` (5 px, 1.0), the usual way at `WAY_USUAL` (4 px, 0.55), other ways as differing stretches only (3 px, 0.85, ink). Gates for the highlighted way only. Overview line of this route is opacity 0 (`:181`). Sheet lists the route's ways with ride counts (`RoutesScreen.tsx:114-123`).
- What route focus renders as text: the sheet title (`route.label`, `:96`), a `›` and `×`, and one row per way (`row.label`, `row.rides`). No summary sentence. Map has no text except pin labels (native MapLibre symbols, see 1.5).

### 1.3 How a route or way is selected
- Pin tap: `catalogPins` `onPress` `:299-310` reads `placeId`, calls `e.stopPropagation?.()`, then `props.onPressPin(id)`. RoutesScreen sets `{level:'place', placeId, highlightRouteId:null}` (`:83`).
- Line tap: `catalogLines` `onPress` `:266-276` reads `routeId`, `stopPropagation`, then `props.onPressLine(id)`. RoutesScreen routes it through `onPressRoute` (`:84`, `:60-66`). Overview tap on a line goes straight to route focus.
- Way selection: only from the sheet. Sheet row `:117-118` sets `highlightWayId`. The map's `catalogWays` layer has NO `onPress` (`:281-288`). Map-tap on a drawn way does nothing. This is the "ways not tappable" status. Cycle24 open item OQ3 (twin-direction switch) was not built. Executor report `cycles/virgin-cycle24/03-executor-report.md` lists it as open.
- Empty map tap: `onPressEmpty` `:253` returns to overview.
- Inspection M1 (`cycles/virgin-cycle24/04-inspection-report.md`): in route focus, the opacity-0 overview line may still hit-test. A tap on the drawn way can fire `onPressLine(primaryRouteId)`, which resets the way highlight or flips direction. Device-verify item 2 in that report. Not yet verified on a phone.

### 1.4 Hardware back and tab-level behaviour
- `App.tsx:122-155`: back handler chain is gateAdjust, rideDetail, catalogDetail, resultsDetail, `(tab==='results' && resultsRoute)`, then any non-record tab goes to record, else returns false (app background).
- The MAP tab has no overlay of its own. Back on MAP goes to record. Route focus state lives in `RoutesScreen` local state. Leaving the tab or opening CatalogDetailScreen unmounts it, so the focus resets to overview (inspection L4). `BACK TO MAP` on CatalogDetailScreen remounts the tab at overview.
- Tab bar hidden when `catalogDetail !== null` (`App.tsx:204`). Catalog detail is opened via `tabNav.openCatalog` from the sheet header `›`.

### 1.5 Open items and unverified behaviour
- Device-only checks owed (from `cycles/virgin-cycle24/04-inspection-report.md` §"Only verifiable on the phone"): pin tap does not also fire `onPressEmpty` (needs `stopPropagation` to suppress `Map.onPress`); M1 (see 1.3); pin labels render with `Noto Sans Regular` (missing offline); line hit area at 4 px; sheet height on small phones; route-focus speed on longest route with 2+ ways (M2: `differingStretches` measured 512 ms at the 6e6 guard on PC); night vs day ink contrast; `BACK TO MAP` returns to overview (L4).
- `03-brief-open-questions.md` items touching route focus (Fable answers, 2026-10-06 night):
  - OQ1: usual way = most stored results, tie to catalog order (`usualWayId`).
  - OQ2: place sheet: first tap highlights the line, second tap opens route focus.
  - OQ3: a merged A-B line taps into the PRIMARY direction only. Reverse direction is reached from either endpoint's sheet. ROUTE focus never draws the twin. Twin-switch row not built.
  - OQ4: gates in route focus = highlighted way only; tapping another way row moves gates there.
  - OQ5: zero places = bare map, MapLibre world view.
  - OQ6: pin labels are native symbols with `Noto Sans Regular`; missing on the offline style.
  - OQ7: colours. Lines yellow (`colors.neutral` on lines), differing stretches ink (`t.text`), pins yellow, never tier colours. Opacity constants at top of `catalogMapView.tsx`.
  - OQ8: differing stretch = vertices farther than 30 m (`DIFF_THRESHOLD_M`).
  - OQ9: sheet is a fixed card (max 280 px), no drag handle; header opens the detail screen; × returns to overview.
  - OQ10: sport badge stays (`RoutesScreen.tsx:87-91`).
  - OQ11: `BACK TO ROUTES` became `BACK TO MAP`.
  - OQ12: file keeps name `RoutesScreen.tsx`, tab id `'routes'`.
  - OQ13: concurrency with cycle23 in the same tree.
  - OQ14: not built: edit mode, selection bars, delete UX, twin switching, recent activities in sheet, timing numbers beyond ride count.


## 2. Ways: identification, labels, and the data hooks for RideResult[] by wayId

### 2.1 Identity
- Way id: string on `Way` in the catalog (`store/catalog.ts`). Route id on `Route`, which holds `wayIds: string[]`, `startLandmarkId`, `endLandmarkId`. Catalog is read via `activeCatalog()` (sport-scoped) or `currentCatalog()` (unscoped, `store/catalogStore.ts`).
- Seed ways are mapped by `WAY_DISPLAY_ID` (`store/defaultWay.ts:14`). `isUserMintedWayId` (`:40`) separates user-made ways.
- `RideResult.wayId` (`store/types.ts:121`): `string | null`. `null` = matched no route, stays uncoloured (D-025).

### 2.2 Labels
- `wayLabel(id)` `store/defaultWay.ts:31`: seed-id label.
- `wayVariantLabel(id, route, specs?)` `:56-`: specs joined with ` · ` if present; else the plain spec label for user-minted ways; else the seed display id with the prefix stripped.
- `wayLabelIn(c, id)` `:76-83`: for a user-minted way, `"<start landmark label> → <end landmark label>"` plus ` · <specs>` if the way has specs. Seed ids return `wayLabel(id)` unchanged. This is the full name used in ResultsDetailScreen header (`ResultsDetailScreen.tsx:60`) and RideDetailScreen (`RideDetailScreen.tsx:475`).
- `routeLabel(c, route)` (in `catalogMapModel.ts:42`, and `resultsListModel.ts:115`): route display label.
- The usual way has no label of its own. It is just the way with the most results (`usualWayId`, `catalogMapModel.ts:48-58`). Sheet marks `on` by `focus.highlightWayId ?? route.usualWayId` (`RoutesScreen.tsx:115`).
- Multi-way routes: `route.wayIds` can hold several ways (variants). `orderedWayIds` `catalogMapModel.ts:80-85` orders them with usual first, then the rest. ResultsScreen groups by route then way (`resultsListModel.ts:142` `buildResultsRoutes`, `:96` `ResultsWayRow`, `:104` `ResultsRoute`).
- `sortWaysForDisplay` `defaultWay.ts:93` (generic sort used by pickers).
- `fallbackWayId(c, results)` `defaultWay.ts:111` and `defaultMapWayId` `:134`: legacy fallbacks, not used by the MAP tab.

### 2.3 Data hooks (store layer, keep for any replacement)
- `store/results.ts` (pure): `ranks(r)` `:92-97` (excludes `estimated`/`missed`, `tripwireDemoted`, `ignoredFromRanking`, and null `scoredS`). `tower(results)` `:108`. `positionLabel(rows, rideId)` `:133`. `sectorHistory` `:141`. `windowLastN`/`windowByDays` `:50-70`.
- `store/resultsStore.ts` (persistent, file-backed, `results/index.json`):
  - `storedResults()` `:211`
  - `getStoredResult(rideId)` `:215`
  - `storedResultsForWay(wayId)` `:224-226`: `storedResults().filter(r => r.wayId === wayId)`. Unsorted (store order).
  - `saveResult` `:234`, `removeStoredResult` `:250`, `setIgnoredFromRanking` `:267`, `backfillMissingResults` `:462`, `initResultsStore` `:139`.
  - Note: `storedResultsForWay` includes today's ride once stored. Callers that need "previous only" must exclude by id.
- `store/timing.ts`: `scoredS(t)` `:36-39`: `movingS` null gives null; in `moving` mode returns `movingS`, else `rawS ?? movingS`. Plot uses `scoredS(r.lap)`.
- `ui/colourModel.ts` (the ranking/colour window, not the store):
  - `rankedFor(wayId)` `:64-68`: `[...GHOSTS, ...recordedResults()]` filtered by `ranks` and wayId, sorted ascending. Note: includes `GHOSTS = shippedResults()` (empty in virgin build, `:59`).
  - `ghostsFor(wayId, excludeRideId?)` `:77-79`: last `WINDOW_PREV` of `rankedFor` minus excluded id.
  - `priorWindowFor(wayId, rideId, beforeMs)` `:85-89`.
  - `rankedCountFor(wayId)` `:94-96`: true ranked count, not windowed.
  - `rankingPoolFor(wayId, currentRideId)` `:107-113`: judged ride plus WINDOW_PREV previous, so pool size is WINDOW_N.
  - `allTimeBestLapS(wayId)` `:205`: the all-time best. Used by ResultsDetailScreen board and ResultsScreen route cards. Excluded from the new panel by Nathan's decision 5 (no all-time PB).
- `ui/rideDetailModel.ts`: `rideDetailFor(rideId, startedAtMs, deps)` `:109`. `RideDetailModel` `:20`: carries `wayId`, `kind: 'route'|'free'|'none'`, `lapTier`, `sectorRows`, `referenceOf`, `promoteTarget`, `canToggleIgnore`, `ignored`.

### 2.4 Sport scoping
- `store/sportStore.ts`: `activeSportId()` `:44`, `activeCatalog()` `:110-112` = `scopeCatalog(currentCatalog(), activeSportId(), currentSports())`. `currentSports()` `:40`.
- Every results-tab and MAP screen reads `activeCatalog()` per render (B-39). `RoutesScreen.tsx:32`. ResultsScreen `:61`. ResultsDetailScreen `:45`.
- `scopeCatalog` (`store/sports.ts:129-136`) returns a NEW object on each call when a sport is active. This defeats `useMemo([CATALOG])` (inspection L2). Plain (no sport) identity is stable.
- `routeEndpointIds` in `catalogMapView.tsx:356-` uses `currentCatalog()` (unscoped). Route ids are global, so it finds the same route.

### 2.5 What a planner needs to get `RideResult[]` for a wayId
- Use `storedResultsForWay(wayId)` (store, all rides incl. today, unsorted), then `ranks` filter and sort ascending by `startedAtMs`. `buildPlotModel` already does this (see 3.4).
- For a window ending at a given ride, use `priorWindowFor` (colourModel) or `ghostsFor(wayId, rideId)`.

## 3. The scatterplot code to reuse

### 3.1 resultsPlotModel.ts (211 lines, pure, no React)
Constants `:21-33`:
- `PLOT_N = WINDOW_PREV` `:21` (= 9). This is the cap that makes the plot show 9, not 10 (Nathan decision 6).
- `PAD_L 12`, `PAD_R 12`, `PLOT_H 220`, `GUTTER_W 44`, `MIN_SPAN_S 30`, `MIN_SPAN_FRAC 0.05`, `PAD_FRAC 0.10`, `TICK_STEPS_S [5,10,15,20,30,60,120,300,600,900]`, `MAX_Y_TICKS 5`, `LABEL_COLLISION_PX 12`, `POINT_R 5`, `X_TICK_MIN_GAP_PX 84`.

Types:
- `PointTone = 'fastest'|'faster'|'slower'` `:35`.
- `PlotPoint {rideId, startedAtMs, timeS, x, y, tone}` `:37-44`.
- `PlotTick {at, label|null}` `:49-52`. `at` is a pixel coordinate, not a value.
- `PlotModel {points, plotW, plotH, yMin, yMax, meanS, meanY, yTicks, xTicks, windowN, empty: 'none'|'no-ranked'}` `:54-66`.

Functions:
- `mean`, `median` `:70-79`.
- `plotWindow(results)` `:85-91`: `results.filter(ranks)`, sort ascending by `startedAtMs`, `.slice(-PLOT_N)`. Note: no exclusion of today's ride, so today is included when stored.
- `fitDomain(times)` `:96-111`: window range widened to include the mean, floored to `max(30, 0.05*median)` span, padded 10% each side. No outlier fence.
- `toneFor(times, meanS)` `:117-124`: minimum time is `'fastest'` (first occurrence wins), others `'faster'` if below mean else `'slower'`. Tones are computed and exported but NOT rendered (see 3.3).
- `xAtSlot(k, plotW)` `:128-131`: fixed grid, slot 0 leftmost, last slot at `plotW - PAD_R`.
- `slotIndex(i, n)` `:134-136`: i-th of n rides fills the rightmost n slots (`PLOT_N - n + i`).
- `yAt(timeS, yMin, yMax)` `:138-140`: `((t - yMin)/(yMax - yMin)) * PLOT_H`. Faster is higher on screen because it is a pixel `y` measured from the top; faster seconds map to smaller `y`.
- `tickCountForStep` `:146-151`, `buildYTicks(yMin, yMax, meanY)` `:153-166`: step is the first `TICK_STEPS_S` entry with at most `MAX_Y_TICKS` ticks. A tick label is suppressed (null) when within `LABEL_COLLISION_PX` of the mean line.
- `buildSlotXTicks(points)` `:168-176`: newest tick always; oldest added if `newest.x - oldest.x >= 84`. Labels are `towerDate(startedAtMs)`.
- `buildPlotModel(results, plotW)` `:183-211`:
  - Empty branch `:186-191`: `empty: 'no-ranked'`, zero points.
  - Otherwise: `times = window.map(r => scoredS(r.lap))`, `fitDomain`, `toneFor`, points at `slotIndex` `x`, `yTicks`, `xTicks`. `windowN = window.length`.
  - `plotW` is passed in (caller subtracts GUTTER_W). No `nowMs`, no `allTimeBestS`.

### 3.2 resultsPlot.tsx (278 lines, React Native)
- Imports `:33-44`: `useMemo`, `useState`; RN `LayoutChangeEvent, Pressable, StyleSheet, Text, View`; `RideResult` type; `buildPlotModel, GUTTER_W, PLOT_H, POINT_R` from the model; `fmt` from colourModel; `towerDate` from towerModel; `PaddockTheme, radius` from theme; `useTheme`.
- Local constants `:46-51`: `DASH_W 2`, `DASH_GAP 4`, `X_AXIS_H 16`, `Y_TICK_LABEL_W 36`, `X_TICK_LABEL_W 80`, `RING_R 8`.
- Props `:53-63` (default export `ResultsPlot`):
  - `results: RideResult[]`
  - `selectedRideId: string|null`
  - `selectedPosLabel: string` (computed by the caller, `P3 of 27`; empty drops the segment)
  - `onSelect(rideId|null)`
  - `onOpenRide(rideId, startedAtMs)`
- State: `boxW` `:66` (from `onLayout` `:68-71`). `plotW = max(0, boxW - GUTTER_W)` `:73`. `model` memo `:74` (`buildPlotModel(results, plotW)`). `dashes` memo `:76-79`. `selectedPoint` `:83-85` (lookup by id in `model.points`). `xTicksToRender` dedupe `:93-95`.
- Render:
  - Before layout (`boxW === 0`) a spacer of `PLOT_H` `:100-101`.
  - `empty === 'no-ranked'`: text `no ranked activities yet` `:102-105`, height 120 wrapper.
  - Otherwise the y-gutter `:109-124` (labels absolutely positioned at `tick.at - 7`, null labels skipped). Plot area `:126-186` with fixed height `PLOT_H` (220) and `width plotW`.
  - Bottommost empty-space `Pressable` `:130-133` calls `onSelect(null)`.
  - Mean line: a row of 2 px dashes, `top: meanY - 1`, `pointerEvents="none"` `:134-144`. Colour `t.textDim`.
  - Selection ring: 16 px circle with `t.text` border `:145-160`, `pointerEvents="none"`.
  - Points `:161-185`: each a `Pressable` with `hitSlop 8`, `POINT_R` 5 radius (10 px dot). `onPress` calls `onSelect(p.rideId)`. Colour rule: the LAST point (newest, `i === points.length - 1`) is `t.accent`; all others `t.textDim`. Tone is NOT used for colour.
  - X axis `:190-221` below the plot: labels from `xTicksToRender`, 80 px boxes centred on tick; clamped to the right with `xTickLabelEnd` if they would overrun.
  - Caption row `:225-242`: `Pressable`, disabled when no selection. Text is `'tap a point for that activity'` `:234` when none selected, else the parts `[towerDate(startedAtMs), fmt(timeS), selectedPosLabel]` joined with ` · ` (empty parts dropped). `open ›` `:240` appears only with a selection. Press calls `onOpenRide`.
- Fixed-size assumptions: plot height is `PLOT_H = 220` (fixed, not from width); X axis `X_AXIS_H = 16`; caption `paddingVertical 10`. Width is measured by `onLayout`. Points and ring use absolute positions in pixel space. No ScrollView, no panning.
- Frame style `:248-254`: `borderWidth 1`, `borderRadius radius.card`, `paddingTop 12`, `paddingHorizontal 8`, `marginBottom 8`, card colours `t.card` and `t.cardBorder`.
- Header comment `:1-32` says the newest dot is `t.accent` (virgin-cycle16 brief 08) and the others `t.textDim`. Dots are NOT tone-coloured (virgin-cycle15 brief 04 retired the three-tone code).
- Nathan decision 3 asks for "dots coloured vs window average, window-fastest dot highlighted (purple)". Current code does NOT do that. It colours by recency (newest yellow, rest grey). Purple exists only as `colors.purple` in `tierColour.ts:34`, not in the plot. The planner must decide whether the tone rule comes back, and the brief must say so.

### 3.3 Where the colour and tone rules come from
- Tier model (for reference, not used by plot): `colourModel.ts:4-16` (purple beats the best of the window, green above recent average, yellow below). `tierFor(value, history)` `:172`. `UiTier` `:55`.
- `tierColour.ts`: `tierTextColour(tier, t)` and chip colours. `colors.purple` #9000C8 is the fill purple (`tierColour.ts:41-42`).

### 3.4 Window size constants, with every use
- `WINDOW_N = 10` `colourModel.ts:29`: the ranking pool size.
- `WINDOW_PREV = WINDOW_N - 1 = 9` `colourModel.ts:36`: previous rides. Used by `ghostsFor` `:78`, `priorWindowFor` `:88`, `rankingPoolFor` `:111`, `resultsPlotModel.ts:21` (via `PLOT_N`), `demoModel.ts:71` (`DEMO_PRIOR_LAPS.tenth`), `towerModel.ts` indirectly via `WINDOW_N` `:37`.
- `plotWindow` does NOT subtract today's ride. In ResultsDetailScreen the input is `storedResultsForWay(wayId)`, which includes today's ride once stored. So the plot shows the last 9 STORED ranked rides including today. The ranking pool is today plus 9 previous (10). Decision 6 says the plot "drops today's ride". That is not what the code does. Today is shown (newest, yellow). What is lost is the 9th-previous ride, so the plot is one ride short of the pool. Planner should confirm before writing the brief.
- X-axis label behaviour: 9 slots, newest at right.

### 3.5 Consumers of the plot
- `ResultsDetailScreen.tsx:87-93`: real consumer. Props: `results={results}` (storedResultsForWay), `selectedRideId`, `selectedPosLabel` (from the board row), `onSelect={setSelectedRideId}`, `onOpenRide` calls `tabNav.openRide({rideId, source:'results', startedAtMs})` `:92`.
- `ResultsDetailScreen.tsx:59`: `windowN = plotWindow(results).length`. `:86`: caption `windowCaption(windowN)` (`resultsListModel.ts:267-269`, `LAST N ACTIVITIES` / `LAST 1 ACTIVITY`).
- `DemoScreen.tsx:779-797`: second consumer, DEMO tab. Renders only after the reveal (`revealDone`), inside a `View` with caption `{demoPlotCaption(plotResults)} · AS ON THE RESULTS TAB` `:785-787`, then `<ResultsPlot ...>` `:788-794` with `onOpenRide` a no-op, then `demo only · nothing saved` `:795`. The DEMO tab depends on `ResultsPlot`, `plotWindow`, and `windowCaption` via `demoModel.ts`.
- `demoModel.ts`:
  - Imports `:23` (`WINDOW_PREV, fmt, tierFor, UiTier`), `:35` (`buildHistoryBoard, windowCaption` from resultsListModel), `:36` (`plotWindow` from resultsPlotModel).
  - `DEMO_PRIOR_LAPS.tenth = WINDOW_PREV` `:71`.
  - Comment `:302-303`: feed `demoPlotResults` straight to ResultsPlot; `plotWindow` keeps the last PLOT_N (TENTH: priors 2-9 plus today, 9 dots).
  - `demoPlotCaption(results)` `:324`: `windowCaption(plotWindow([...results]).length)`.
  - `demoPlotPosLabel(results, rideId)` (near `:311-323`): mirrors the real screen's `P<pos> of <total>`.
- Nothing else imports `resultsPlot.tsx`, `resultsPlotModel.ts`, or `plotWindow` (grep across `src` and `tests`).

### 3.6 Tests touching the plot (with the numbers they assert)

`tests/resultsmodel_suite.ts` (imports `resultsPlotModel.ts` at `:34-37` and `WINDOW_PREV` at `:38`):
- `:285` `resultsmodel: boardCaption / windowCaption wording`: asserts `LAST 9 ACTIVITIES` for `windowCaption(9)` and `LAST 1 ACTIVITY` for 1 (`:289-290`).
- `:295` `plotWindow — PLOT_N most recent ranked, ascending, excludes ignored/tripwire/estimated`: asserts `window.length === WINDOW_PREV` (9) and the ids are the last 9 ranked (`:305`, `:309`). Symbolic, so it follows the constant.
- `:313` `plotWindow — fewer than PLOT_N ranked returns all of them` (3 rides, length 3).
- `:318` `plotWindow — zero ranked returns []`.
- `:376` `buildPlotModel — x is the slot, newest at the right, gaps independent of time`: uses `xAtSlot(PLOT_N - 4, 300)` (`:387`), newest at `300 - PAD_R` (`:396`), `yTicks.length <= MAX_Y_TICKS`.
- `:407` `two rides one slot apart whatever their time gap`.
- `:421` `full window spans PAD_L to plotW - PAD_R`: builds `PLOT_N` rides, expects `PLOT_N` points (`:424`), first `x === PAD_L`, last `x === 300 - PAD_R`.
- `:429` `xTicks: one label for n=1, one for n=2 at 300px, two for a full window`: n=1 gives 1 tick; n=2 at 300 px gives 1 tick (gap below 84); full window (PLOT_N rides) gives 2 ticks.
- `:446` `single ranked ride: one fastest dot at the right edge, colliding tick label is null`.
- `:457` `10+ ranked rides: exactly PLOT_N dots, oldest ranked ride excluded`. Asserts `windowN === WINDOW_PREV` (9, `:460`), `points.length === WINDOW_PREV` (9, `:461`), and the oldest ride `n0` is absent (`:463`). Symbolic.
- `:465` `0 ranked results => empty "no-ranked", no points`.
- `:473` `xTicks ignore the calendar: 200-day, 20-day, 2-day and ~1-year spans ...`: asserts newest tick label is `towerDate(newest)`.
- Note: no test exists for `toneFor` colour rule in the plot (tones are computed but not rendered). `fitDomain` tests exist (`:322` region).

`tests/demo_suite.ts` (imports `buildPlotModel, plotWindow, PLOT_N, PAD_R` at `:49`; `WINDOW_PREV` at `:31`):
- `:289` `DEMO_PRIOR_LAPS.tenth === WINDOW_PREV === DEMO_HISTORY[0].length`.
- `:712-713`: `plotWindow(results).length === Math.min(results.length, PLOT_N)` for each mode (symbolic).
- `:718` `TENTH window is priors 2-9 + today (the real slice(-9))`: asserts `w.length === 9` (`:21`), first id `demo:prior-2`, last `DEMO_TODAY_RIDE_ID`. HARD-CODED 9.
- `:725` `TENTH model matches the pinned arithmetic`: `m.points.length === 9` (`:29`), `points[8]` is today, today tone `'faster'` (green), exactly one `'fastest'` (`demo:prior-2`), 4 `'slower'` (`:36`), `meanS ≈ 7598/9` (`:38`). HARD-CODED 9 and arithmetic over 9 values.
- `:746` `SECOND model is today (purple) vs the one prior (yellow)`: 2 points, meanS 839.
- `:756` `FIRST model is one purple dot`: 1 point, meanS 836.
- `:767` `demoPlotPosLabel mirrors the real screen's P<pos> of <total>`: expects `P3 of 10` for TENTH today (`:72`), `P1 of 10` for prior-2, `P1 of 2`, `P1 of 1`. The "of 10" is the pool, not the plot.
- `:779` `demoPlotCaption is the real windowCaption over plotWindow`: expects `LAST 9 ACTIVITIES` (`:81`), `LAST 2 ACTIVITIES`, `LAST 1 ACTIVITY`. HARD-CODED 9.
- `:785` `no throw pre-layout (width 0), and a lopsided lap is still honestly fastest`: symbolic `Math.min(results.length, PLOT_N)` (`:90`), `P1 of 10` (`:96`).

`tests/rankingreveal_suite.ts`:
- `:225` `expected a window of 9 before today (WINDOW_PREV)`, `:243` `of must be exactly 10 (WINDOW_N)`. Not plot tests, but they pin the 9-vs-10 split.

`tests/live_colour_suite.ts` `:176-187`, `:281-344`: window and pool assertions (`hist.length === WINDOW_PREV`, `pool.length === WINDOW_N`). Not plot tests.

`tests/recordflow_suite.ts`:
- `:309` asserts `NO SPORT YET · ADD ONE IN SETTINGS` in `ResultsScreen.tsx`, `RoutesScreen.tsx`, `RidesScreen.tsx`. Deleting `ResultsScreen.tsx` breaks this (`read` will throw) unless the list is edited.
- `:310` asserts `DO A ROUTE FIRST` is absent from `ResultsScreen.tsx`.
- `:317-318` reads `ResultsDetailScreen.tsx` and asserts `not ranked`, `rankingsOn` and `useSettings` are absent.
- `:333` loops a file list that includes `ResultsScreen.tsx` (em-dash scan). Deleting the file breaks this read.

`tests/resultsmodel_suite.ts` also covers `buildResultsList`, `buildHistoryBoard`, `boardCaption`, `buildResultsRoutes` (these are RESULTS UI model, see section 4).

`tests/demo_suite.ts` `:19` has the hard-coded `9` for TENTH window; if PLOT_N changes to 10 this test must change, or the demo's `WINDOW_PREV` mirror breaks. The demo fixtures (`DEMO_HISTORY`, `DEMO_PRIOR_LAPS.tenth = WINDOW_PREV`) are pinned to 9.

### 3.7 Things the plot code does NOT do (for the planner)
- No all-time PB. No `allTimeBestS` input (Nathan decision 5 is already satisfied in the model).
- No tone colour in the view. `PlotPoint.tone` is computed and exported (`toneFor`) but unused by the view.
- No rank line, no board. The selectedPosLabel is supplied by the caller.
- Empty-state text `no ranked activities yet` (`resultsPlot.tsx:104`) and caption `tap a point for that activity` (`:234`) and `open ›` (`:240`) are rider-facing strings listed in ui-strings (section 7).


## 4. RESULTS tab removal surface

Legend: KEEP = data layer, not UI. REMOVE = UI that exists only for the RESULTS tab. SHARED = UI still needed by DEMO or elsewhere.

### 4.1 App shell and navigation
- `App.tsx:34` import `ResultsScreen` (REMOVE). `App.tsx:35` import `ResultsDetailScreen` (REMOVE). `App.tsx:53` type import `ResultsDetailRequest` (REMOVE with tabNav type).
- `App.tsx:61-63` `TAB_LABEL`: `results: 'results'` entry (REMOVE). `routes: 'map'` stays.
- `App.tsx:99-103` `resultsDetail` state. `App.tsx:104-109` `resultsRoute` state (Shell-owned way-list drill-down, comment says it exists because ResultsDetailScreen mount-swaps ResultsScreen). REMOVE both.
- `App.tsx:117-155` system back handler. Lines `:140-143` (resultsDetail) and `:144-147` (tab results + resultsRoute), and the dep array `:155` entries `resultsDetail`, `resultsRoute`. REMOVE those lines. Comment `:117-118` names "results detail" and "results way list" in the chain.
- `App.tsx:158-160` comment about results store rehydrate (KEEP, data layer).
- `App.tsx:204` `tabBarHidden` includes `|| resultsDetail !== null` (REMOVE that term).
- `App.tsx:225-228` nav object members `openResults`, `closeResults`, `openResultsRoute`, `closeResultsRoute` (REMOVE).
- `App.tsx:240` render `ResultsDetailScreen` (REMOVE). `App.tsx:244` render `ResultsScreen openRouteId` (REMOVE, and the `tab === 'results'` arm).
- `App.tsx:258` tab list `['record','rides','routes','results','settings','demo']` (REMOVE `results`). Comment `:248-250` says "Six tabs ... RESULTS" (update).
- `src/ui/tabNav.tsx`:
  - `:9-11` header comment naming openResults and openResultsRoute (REMOVE).
  - `:19-22` comment on the Tab union (update).
  - `:23` `Tab` union includes `'results'` (REMOVE).
  - `:27-28` `RideDetailRequest` doc mentions `'results'` (update).
  - `:36` `RideDetailRequest.source` union includes `'results'` (REMOVE the member; its consumers are in 4.3 and 4.5).
  - `:53-57` `ResultsDetailRequest` interface (REMOVE).
  - `:81-87` `openResults`, `closeResults` on `TabNav` (REMOVE).
  - `:88-98` `openResultsRoute`, `closeResultsRoute` (REMOVE).
- Tab order after the change (decision 8): record, activities (`rides`), map (`routes`), settings, demo. Only App.tsx:258 and TAB_LABEL change.

### 4.2 RESULTS screens (all REMOVE; no other importers)
- `src/ui/ResultsScreen.tsx` (201 lines). Imports: `activeCatalog, activeSportId, currentSports` (`:23`), `getStoredResult, storedResultsForWay` (`:24`), `allTimeBestLapS, fmt` (`:25`), `buildResultsRoutes, ResultsRoute` (`:26`), `freeRideResults, FreeRideRecord` (`:27`), `dateTimeLabel` (`:28`), `ResultsWayList` (`:29`), `useTabNav` (`:30`), `createExpoFsAdapter` (`:33`), `settleRideHomes` (`:34`).
  - Mount-time `settleRideHomes` `:50-59`. This is the only UI-side trigger that the header comment (`:45-49`) describes for RESULTS. RidesScreen also calls it (`src/ui/RidesScreen.tsx:104`), so removal is safe. Ride-to-way filing on the MAP tab would have no trigger of its own.
  - Free activities section `:71-83` and `:144-169` (dropped by decision 4). Uses `freeRideResults` (store, KEEP).
  - Route card list `:120-141`; "NO RESULTS YET" `:115-117`; header `Results` `:110`; sport badge `:111-114` (`NO SPORT YET · ADD ONE IN SETTINGS` is also in RoutesScreen.tsx `:89`).
  - Navigation: `tabNav.openResults({wayId})` `:127`, `tabNav.openResultsRoute` `:128`, `tabNav.openRide({..., source:'results'})` `:156`.
- `src/ui/resultsWayList.tsx` (86 lines). Only importer: `ResultsScreen.tsx:29`, used `:96`. REMOVE.
- `src/ui/ResultsDetailScreen.tsx` (210 lines). Importers: `App.tsx:35`, `App.tsx:240`. Imports: `tabNav` types and `useTabNav` (`:21-22`), `activeCatalog` (`:25`), `storedResultsForWay` (`:26`), `wayLabelIn` (`:27`), `allTimeBestLapS` (`:28`), `buildHistoryBoard, boardCaption, windowCaption` (`:29-31`), `plotWindow` (`:32`), `ResultsPlot` (`:33`).
  - Closes itself when the way disappears: `:50-52` (calls `closeResults`).
  - Plot wiring `:87-93`, `openRide(source 'results')` `:92`, board rows `:95-101` (`openRide` `:100`), `BACK TO RESULTS` `:103-105`, title `RESULTS` `:80`, caption `:86`.
  - `HistoryBoard` and `HistoryRowView` `:112-` (REMOVE with the board; the board is dropped by decision 4).
  - Own copies of styles (comment `:173-174`: copied, not imported).
- `src/ui/RoutesScreen.tsx` is NOT a RESULTS screen (it is the MAP tab). It does not import any RESULTS file.

### 4.3 Ride detail (RideDetailScreen) dependency on the RESULTS source
- `src/ui/RideDetailScreen.tsx:429` `primaryLabel` maps `request.source === 'results'` to `BACK TO RESULTS`. Remove that arm when `'results'` leaves the union.
- `RideDetailScreen.tsx:441` and `:628`: close via `tabNav.closeRide()`. `closeRide` is not RESULTS-specific (KEEP).
- The string `BACK TO RESULTS` is in `tests/ui-strings.allow.json` for `RideDetailScreen.tsx` as a literal (section 7).
- Note `RideDetailScreen.tsx:21` (header doc) and cycle23 brief 03 mention the source branches.

### 4.4 Shared UI that must stay (DEMO depends on it)
- `src/ui/resultsPlot.tsx`, `src/ui/resultsPlotModel.ts`: used by `DemoScreen.tsx:118` (import) and `:779-797` (render). If the plot moves to MAP, DEMO still needs it. Either keep the file where it is, or update DemoScreen and demoModel together.
- `src/ui/demoModel.ts`: `:35` imports `buildHistoryBoard, windowCaption` from resultsListModel. `:36` imports `plotWindow` from resultsPlotModel. `demoPlotCaption` `:324` uses `windowCaption` (KEEP `windowCaption`).
- `src/ui/DemoScreen.tsx` comment `:50`, `:66` and `:264` mention "RESULTS-tab scatterplot" and "ResultsDetailScreen"; text only.

### 4.5 resultsListModel.ts (269 lines) (split: REMOVE some, KEEP some)
- `buildResultsList` `:31` (rows for RESULTS list). Used by `buildResultsRoutes` `:147`. Tests: `tests/resultsmodel_suite.ts:102, :122, :135`. REMOVE if RESULTS goes; the tests go with it.
- `ResultsListRow` `:15`, `ResultsListModel` `:23`, `ResultsWayRow` `:96`, `ResultsRoute` `:104`: types for RESULTS list (REMOVE with it).
- `routeLabel(route, catalog)` `:115`, `rideCountForRoute` `:126`, `buildResultsRoutes` `:142`: RESULTS route cards. Used only by ResultsScreen.tsx `:26`, `:65-69`. REMOVE.
- `HistoryRow` `:195`, `HistoryBoardModel` `:210`, `buildHistoryBoard(results, allTimeBestS)` `:221`: used by ResultsDetailScreen and by demoModel `:35`. Note the function takes `allTimeBestS` (all-time best, dropped per decision 4 and 5). It is still used by DEMO. Decide whether DEMO keeps the board.
- `boardCaption` `:260`: strings `ALL {n} {noun} · fastest first` and `· rankings off in SETTINGS`. Used only by ResultsDetailScreen `:123`. REMOVE (and its allow-list entries).
- `windowCaption(n)` `:267`: `LAST {n} ACTIVITIES` / `LAST 1 ACTIVITY`. Used by ResultsDetailScreen `:86` and demoModel `:324`. KEEP (plot caption).
- Imports `:6-11`: `wayLabelIn`, `tower` (store results), `towerDate`, `fmt`, `NOT_RANKED_LABEL` (feedModel `:11`).

### 4.6 Store and data layer (KEEP)
- `store/results.ts` (`ranks`, `tower`, `positionLabel`, `sectorHistory`, `windowLastN`, `windowByDays`, index helpers).
- `store/resultsStore.ts` (`storedResults`, `getStoredResult`, `storedResultsForWay`, `saveResult`, `removeStoredResult`, `setIgnoredFromRanking`, `backfillMissingResults`, `initResultsStore`, `RESULTS_DIR = 'results'` `:50`, `RESULTS_INDEX_FILE` `:51`, `UNMATCHED_FILE` `:52`, `BACKFILL_ENGINE_VERSION` `:56`).
- `store/results.seed.json`, `ui/colourModel.ts` (the ranking window and tiers), `ui/towerModel.ts`, `ui/rankingRevealModel.ts`, `ui/rideDetailModel.ts`, `ui/feedModel.ts`, `ui/activityCard.tsx`.
- Also used by RecordScreen (`RecordScreen.tsx:79` imports `getStoredResult, removeStoredResult`).
- The on-device `results/` folder is data (`results/index.json`, `results/unmatched.json`). Do not delete (CONVENTIONS "Never delete").

### 4.7 Other references
- `RidesScreen.tsx:51` `resultsTick` (state name only, not the tab). Not a dependency.
- `settings.tsx:395` comment mentions `resultsTick` (no dependency).
- Settings entries: grep of `src` for `RESULTS` and `results tab` found no settings UI entry for the RESULTS tab. None to remove.
- Deep links / linking config: none found in `App.tsx` or `src` (grep for `linking`, `deepLink`, `Linking.`, `scheme`).
- Onboarding or empty-state copy: `ResultsScreen.tsx:115-117` `NO RESULTS YET`, `ResultsScreen.tsx:110` `Results`. `tests/recordflow_suite.ts:310` asserts `DO A ROUTE FIRST` is absent from ResultsScreen.tsx (guard, not copy).
- `rideActions.ts`: no `source: 'results'` (grep). Shared actions are not affected.
- `ResultsScreen` and `ResultsDetailScreen` are not referenced by any test except the file reads listed in 4.8.

### 4.8 Tests that break when files are deleted or renamed
- `tests/recordflow_suite.ts:309` reads `ResultsScreen.tsx`, `RoutesScreen.tsx`, `RidesScreen.tsx` and asserts the `NO SPORT YET · ADD ONE IN SETTINGS` badge. Deleting `ResultsScreen.tsx` makes `read()` throw. Edit the list.
- `tests/recordflow_suite.ts:310` reads `ResultsScreen.tsx` (no `DO A ROUTE FIRST`).
- `tests/recordflow_suite.ts:317-318` reads `ResultsDetailScreen.tsx` (asserts no `not ranked`, `rankingsOn`, `useSettings`).
- `tests/recordflow_suite.ts:333` loops a file list including `ResultsScreen.tsx` (em-dash scan).
- `tests/resultsmodel_suite.ts:2-38` imports `resultsListModel.ts` (buildResultsList, buildHistoryBoard, boardCaption, windowCaption, buildResultsRoutes or the list types) and `resultsPlotModel.ts`. Tests `:100-140` (buildResultsList) and `:285-290` (boardCaption, windowCaption) cover RESULTS UI model.
- `tests/run.ts` imports `resultsmodel_suite.ts`. Keep the file if the plot model stays; trim its RESULTS tests otherwise.
- `tests/ui-strings.allow.json` (section 7). Any removed file leaves its entries STALE and the live-tree test fails.

## 5. Ride detail page (RideDetailScreen.tsx, 669 lines, cycle23 brief 03, modified again uncommitted by brief 05/06)

- Header doc `:1-25`: one flat scroll. Map first, text on page background, SECTORS / ON THIS WAY / suggestions as plain rows, quick actions in the menu.
- Props: `request: RideDetailRequest` `:104` (`rideId`, `source`, `startedAtMs`). Models via `rideDetailFor(rideId, startedAtMs, deps)` (`rideDetailModel.ts:109`). Deps supply `laps`, `sectors`, `barred` (`:155-157`).
- How the ride knows its wayId: `model.wayId` (from `rideDetailFor`, `RideDetailModel.wayId`, `rideDetailModel.ts:20-`). Reference rides: `model.referenceOf?.id` (`:191`). Used for replay `:191` and naming `:376-404`.
- Sections in render order (line numbers from `RideDetailScreen.tsx`):
  1. Header row with round back button calling `tabNav.closeRide()` `:441`. Title: `wayLabelIn(currentCatalog(), model.wayId)` `:475`.
  2. Map frame: `WayMapView variant="browse"` with `trail={fixes}` at `:499`, `:511`, `:527` (three branches: route, free, none). Trail built from `fixes` (`:163-190`).
  3. Replay button `:540` (only when a replay exists, `:192-194`). Opens `ReplayScreen` `:433`.
  4. SECTORS `:545-560` (route kind only). Each row is a Pressable that selects the sector on the map (`:552-554`). Columns: label, time (tier text colour), avg, gap (`sectorGapLabel`).
  5. ON THIS WAY `:561-562`: `PbDetail` (`:80-102`). `buildPbDetail(rankingPoolFor(wayId, lastRideId), lastRideId)`. Renders each pool row: position label, date, time, gap. This is a 10-ride ranking table, not a PB. Decision 4 does not mention it. Planner must decide whether it is kept.
  6. Suggestion rows `:566-` (promote to reference, naming card, save as free activity, not-a-free-activity).
  7. Rank line: `rankLineFor` in `rideDetailModel.ts:69-104` (`P3 of 10`-style text, `'ignored in ranking'`, `'no rank'`, `'too few to rank'`, `'GPS gap at a gate'`, `'a gate was missed'`, asserted by `recordflow_suite.ts:319-320`). Not in the decisions list. Planner must decide whether it stays.
  8. Bottom primary button `:628-630` `st.slimBtn`, label `primaryLabel` (`:429`). Label by source: post-stop RECORD ANOTHER, routes BACK TO ROUTE, results BACK TO RESULTS, else BACK TO ACTIVITIES.
- Menu `:420-427`: Export GPX+ (if meta), Ignore/Count in ranking (if `canToggleIgnore`), Delete (if meta). Shared handlers in `src/ui/rideActions.ts` (`confirmDeleteRide` `:31`, `toggleIgnoreRide` `:57`, `exportRideGpx` `:69`).
- Header and back: back is `tabNav.closeRide()`. The detail is mount-swapped over the active tab (`App.tsx:238`). Closing remounts the tab underneath (so RESULTS would remount at its list, not at the way).
- Where an "open this way's trend on the MAP" link could attach (no code exists yet):
  - Candidate anchors: the way name at `:475`; the ON THIS WAY heading `:561`; or a new row near the SECTORS block.
  - There is no navigation channel from ride detail to a MAP focus. `TabNav` has `go(tab)` only (`tabNav.tsx:59-60`). `openCatalog` opens CatalogDetailScreen, not MAP. MAP focus is local state inside `RoutesScreen` (`RoutesScreen.tsx:35`). A new API is needed: either a `TabNav` call that sets a requested focus in App state and passes it to RoutesScreen, or a route-level prop. Nothing like this exists today.
  - Ride detail is mount-swapped over the tab (`App.tsx:237-240`), so closing it returns to whichever tab was active. If MAP is opened from here, the back chain (`App.tsx:122-155`) must account for it.

## 6. ACTIVITIES feed card (activityCard.tsx, 152 lines; feedModel.ts, 143 lines)

- Correction to the brief premise: the card DOES carry rank and tier colour content. Facts:
  - `feedModel.ts:57` `NOT_RANKED_LABEL = 'Not ranked'`. `:66-` `unrankedForDisplay(quality, ignored)`.
  - `feedModel.ts:80-101` `buildFeedCard`: `rankLabel` = `` `P${pos}/${of}` `` (`:92`) when ranked and `row.rank` exists. `heroLabel` (`:90`) is the lap time or `''`. `sectors` (`:97`) = sector chips (label, time, tier).
  - `activityCard.tsx:68` hero colour from `card.heroTier` via `tierTextColour`. `:77-78` `Not ranked` hero when unranked. `:81` renders `card.rankLabel` (e.g. `P3/10`), in `st.rank` (`:136`). `:103-109` sector strip with tier-coloured time text.
- Navigation to detail: `activityCard.tsx:71` `Pressable onPress={() => props.onOpen(card)}` covers the block. `:114` the ⋯ `MenuButton` opens the menu (`onMenu`). The parent is `RidesScreen.tsx:192`: `tabNavRef.current.openRide({rideId, source:'rides', startedAtMs})`. So feed cards open the detail with source `'rides'`, not `'results'`.
- Card has no badge today and no tap target for RESULTS or MAP.
- Card heights: `feedModel.ts:50` `CARD_HEIGHT_ROUTE = 307`, `:52` `CARD_HEIGHT_PLAIN = 273`, `:48` `CARD_MAP_HEIGHT = 150`. Cycle23 brief 04 numbers. Keep in mind if a badge is added.
- Menu: `activityMenu.tsx` (58 lines), items per `RidesScreen.tsx:205-207`: Count/Ignore in ranking, Delete (with `refresh`). Export GPX+ is also in the detail menu.

## 7. ui-strings (tests/ui-strings.allow.json and tests/run.ts rules)

### 7.1 File shape
- Top-level keys: `owner`, `rule`, `generatedAt`, `generatedFrom`, `legacyCount`, `banners`, `entries`. Count is `452` entries (after cycle23 brief 06).
- Each entry: `file`, `kind`, `text`, `reason`, `since`, `by`, optional `long`, `legacy`, `violates`.
- Sorted by (file, kind, text) (`tests/ui_strings_suite.ts:213-233` hygiene test). Legacy entries are frozen by count `legacyCount` (suite `:142-162`).

### 7.2 Entries that belong to RESULTS screens or the plot
Exact strings with the file and kind (as they appear in the allow list):
- `src/ui/ResultsDetailScreen.tsx`:
  - `text` `BACK TO RESULTS` (bootstrap)
  - `text` `RESULTS` (title)
  - `text` `activit` (the `activit{y|ies}` fragment)
  - `text` `‹ BACK`
- `src/ui/RideDetailScreen.tsx`:
  - `literal` `BACK TO RESULTS` (line-level literal; the `primaryLabel` ternary at `:429`)
  - `text` `ON THIS WAY` (KEEP unless PbDetail goes)
  - `literal` `There are no past results on this way yet.` (long: true) (check whether PbDetail or the empty state uses it)
- `src/ui/ResultsScreen.tsx`:
  - `literal` `NO SPORT YET · ADD ONE IN SETTINGS`
  - `text` `FREE ACTIVITIES`
  - `text` `NO RESULTS YET`
  - `text` `Results`
  - `text` `activit`
  - `text` `way`
  - `text` `· free activity`
- `src/ui/resultsWayList.tsx`:
  - `text` `activit`
  - `text` `best`
- `src/ui/resultsListModel.ts`:
  - `literal` `ALL {…} {…} · fastest first`
  - `literal` `ALL {…} {…} · rankings off in SETTINGS`
- `src/ui/resultsPlot.tsx`:
  - `literal` `tap a point for that activity`
  - `text` `no ranked activities yet`
  - `text` `open ›`
- `src/ui/resultsPlotModel.ts`:
  - `prop:empty` `no-ranked`
  - `prop:empty` `none`
- `src/ui/DemoScreen.tsx`:
  - `text` `· AS ON THE RESULTS TAB` (DEMO, will need a new string if the plot moves to MAP)
- `src/ui/RoutesScreen.tsx`:
  - `literal` `NO SPORT YET · ADD ONE IN SETTINGS` (MAP tab, KEEP)
- `src/ui/CatalogDetailScreen.tsx`:
  - `text` `BACK TO MAP` (cycle24, `since 2026-10-07`, by sonnet-executor)
- `src/ui/catalogMapView.tsx` (cycle24 additions): `literal` `Noto Sans Regular`, `literal` `https://tiles.openfreemap.org/styles/dark` (long: true), `literal` `https://tiles.openfreemap.org/styles/positron` (long: true).
- `src/ui/feedModel.ts`: `literal` `Not ranked` (cycle23 brief 05).

Entries that are not RESULTS-only but are on the RESULTS path: `ui/towerModel.ts`/`ui/tower.tsx` `NOT_RANKED_LABEL` (cycle23 brief 06, now uses constant, check allow list for `resultsListModel`'s old `NO TIME`, removed by brief 06).

### 7.3 Rules enforced by tests/run.ts (via tests/ui_strings_suite.ts and ui_strings_extract.ts)
- `tests/run.ts:69` imports `ui_strings_suite.ts`.
- Constants `tests/ui_strings_extract.ts`: `MAX_LEN = 40` (`:25`), `MAX_ALERT_BODY_WORDS = 20` (`:26`), `HARD_RULES = ['alert-words', 'em-dash']` (`:35`).
- Rules:
  - `too-long` (`:264-265`): any string other than `alert-body` over 40 chars needs `long: true`.
  - `alert-words` (`:217`, `:281-282`): `alert-body` over 20 words. Cannot be waived.
  - `em-dash` (`:218`, `:284`): any `—` in a string. Message says use ` · `. Cannot be waived.
  - `unlisted` and `stale` (suite `:114-125`): an extracted string not in the allow list fails; an entry with no occurrence in its file is STALE and fails.
  - `banner`, `banner-stale` (suite `:165-172`): box styles outside `banners[]`.
  - `legacy-scope` (suite `:162`): legacy entries must have a matching `violates`.
- Live-tree test: `ui-strings: live tree: every visible string is allowlisted and within budget` (suite `:198-210`). Prints at most 20 violations.
- Hygiene test `ui-strings: allowlist: header and entry hygiene` (suite `:213-233`): required fields and sort order.
- Source-level tests:
  - `:239-242` no rider-facing `lap` outside the preview mockup.
  - `:245-252` routeFromRide.ts error copy has no `lap` and no em dash.
- Cycle23 brief 06 tests (`ui_strings_suite` and `recordflow_suite`) check `NO TIME` removed from `resultsListModel.ts` and `towerModel.ts`, and the `NOT_RANKED_LABEL` use (`recordflow_suite.ts:606-620`).

### 7.4 Consequence for removal
- Deleting a file makes its allow-list entries STALE. The live-tree test then fails until the entries are removed. Remove entries in the same change as the code.
- `ResultsScreen.tsx` and `ResultsDetailScreen.tsx` have the most entries (about 20 combined). `resultsPlot*.tsx` has 6.

### 7.5 Baseline now (this session, working tree as found)
- `cd app && node --experimental-strip-types tests/run.ts`: `923 tests: 920 pass, 0 fail, 3 skip`, zero FAIL lines.
- `cd app && ./node_modules/.bin/tsc --noEmit`: exit 0, no output.

## 8. Process files (cycles/virgin-cycle23 and process/CONVENTIONS.md)

### 8.1 cycles/virgin-cycle23/EXECUTOR-RULES.md (execute tier, Sonnet)
- Implement exactly one brief. Read brief, then `CLAUDE.md`, then pre-flight. Follow steps in order.
- STOP-ON-AMBIGUITY: anchor mismatch or unanticipated check failure means STOP and report. Never rule on it.
- `GIT_OPTIONAL_LOCKS=0` prefix. No recursive greps over repo or node_modules. tsc takes 60-90 s, use `timeout_ms: 180000`.
- Large heredocs crash device_bash (E2BIG). Write in chunks.
- Never delete: `mv` to `safe_to_delete/`. No git add, commit or push. No EAS or OTA.
- Allow-list edits as one python read-modify-write, sorted by (file, kind, text), `json.dump(indent=2, ensure_ascii=False)` plus newline. Never regenerate the file. Never touch `legacy: true` entries.
- Strip-only TypeScript: no constructor parameter properties, `enum`, `namespace`, `import x = require()`, or decorators.
- Final report: steps, files changed, test counts before and after, each check, every allow entry quoted, deviations verbatim.

### 8.2 cycles/virgin-cycle23/INSPECTOR-RULES.md (inspect tier, fresh Opus)
- Do not trust any agent claim; rerun every check.
- Read-only on app code. Scratch only under `safe_to_delete/`. Do not fix.
- Quote every allow-list entry added, edited or removed (`git diff -- app/tests/ui-strings.allow.json`).
- Be adversarial: callers of changed functions, dead code, pinned strings elsewhere, type holes, behaviour changes in recording, timing, gates or ranking, stale tests that pass vacuously.
- Cycle-specific checks (WayMapView gestures, source-pin tests unedited, handler parity, no hex in UI files, no new text beyond tables, height arithmetic).
- Report per brief PASS, PASS WITH NOTES or FAIL with file:line evidence, ranked findings (BLOCKER, MAJOR, MINOR), and "safe to ship OTA (JS only)?".

### 8.3 cycles/virgin-cycle23/EXECUTION-ORDER.md
- Table of six briefs with dependencies and visible effect. Brief 01 no visible change. Briefs 02-06 visible.
- Pipeline: Execute (Sonnet) then Inspect (Opus) then coordinator fixes or forwards to Fable. Do not start brief N+1 before brief N passes Inspect.
- Per-brief Inspect reruns list. Brief 06 expected count `923 tests: 920 pass, 0 fail, 3 skip`; allow list 452 entries; brief 06 removes `NO TIME` from `resultsListModel` and `towerModel`.
- Risks left for the phone: one-finger touches over card maps, scroll smoothness with 3-5 live maps, Android edge swipe-back vs the detail map, night-theme contrast of tier text on the page background.

### 8.4 cycles/virgin-cycle23/COMMANDS.md (Nathan's copy-paste PowerShell)
- Dry run: `scripts\publish-preview.ps1 -DryRun` (checks node, tests, tsc, fingerprint; publishes nothing). Then publish with the same script without the flag.
- Fingerprint drift: stop and see `scripts\OTA-TROUBLESHOOTING.md`.
- Warning: the working tree also holds uncommitted cycle22 and cycle24 work. `publish-preview.ps1` publishes WHATEVER is in the tree. So an OTA update contains all of it.
- Update notes for briefs 04 and 05. Section 4 "known and left open": F6 (sector strip does not wrap, 4+ sectors can be cut), F1 (touch behaviour needs a phone), free activities duration only.
- Section 5: an 18-item on-device checklist in plain language (feed scrolling, ⋯ menu, detail button labels, sector tap, replay, suggestion rows). Item 12 lists the bottom button labels: BACK TO ACTIVITIES, RECORD ANOTHER, BACK TO ROUTE, BACK TO RESULTS. Item 12 must change once RESULTS is removed.

### 8.5 cycles/virgin-cycle23/README.md
- Scope: ACTIVITIES tab redesign only (Nathan, 2026-10-06). Reading order: decisions, digests 01-02, mockups 03-*, EXECUTION-ORDER, rules, briefs 01-06.
- Status: briefs 01-06 landed or landing; start at COMMANDS.md.
- Naming plan: digests `04-...`, `05-...`; inspect reports `inspect-01.md`...; device findings `ON-DEVICE-FINDINGS.md`.

### 8.6 process/CONVENTIONS.md, "Rider-facing text" (`:65-88`, added 2026-10-02, virgin-cycle20)
- Minimal text: a figure, a number or one word beats a sentence. No explanatory sub-label under a button, no restating hints, no machinery status lines.
- Warnings use the button sub-label flash (`flashSub(msg, holdMs)` in `RecordScreen.tsx`; 2 s for GPS, 5 s for permission), never a banner box or top-of-screen notice.
- Use ` · ` not `—`. The lone `—` is only for an empty-value placeholder.
- Budgets enforced by `app/tests/ui_strings_suite.ts`: every visible string listed in `app/tests/ui-strings.allow.json` (Nathan's file) with reason, since, by. Over 40 chars needs `long: true`. Alert bodies at most 20 words, no em dash, no banner box. These three cannot be waived. Legacy entries frozen by count.
- Agents append allow-list entries, never regenerate the file, and quote added entries in their report.
- Every brief that adds or changes visible text carries an `## Added visible text` table (`file | kind | exact text | why it earns its place`).
- Inspect runs the suite and quotes the allow-list diff. Before launch, the human audit `process/CLUTTER-AUDIT-HOWTO.md` is re-run.

## 9. Headline findings and surprises

1. HEAD `592a44f` already contains cycle24 (MAP tab) and cycle23 briefs 01-03. The cycle24 inspection report's "nothing committed" is stale. Cycle23 briefs 04-06 are uncommitted.
2. Test baseline is green: `923 tests: 920 pass, 0 fail, 3 skip`. `tsc --noEmit` exit 0.
3. The scatterplot does NOT colour by tone. Dots are grey, newest dot is `t.accent`. Decision 3's "coloured vs window average, window-fastest highlighted" is not in the code. Purple is only in the tier palette.
4. Decision 6's rationale is off. `plotWindow` does not exclude today's ride. The plot shows the last 9 stored rides including today. The pool of 10 minus the plot's 9 means the dropped ride is the 9th previous, not today.
5. The ACTIVITIES feed card has rank content (`P3/10` text, `activityCard.tsx:81`) and a tier-coloured hero (`:68`). The "no rank content" premise is false. Decision 7 (no badge) still stands, but the card already shows a rank.
6. The MAP route focus already has a bottom sheet with way rows and ride counts (`RoutesScreen.tsx:114-123`). The "way switcher" exists as sheet rows. Map ways are not tappable (`catalogMapView.tsx:281-288` has no onPress).
7. There is no navigation channel from ride detail to a MAP focus. `TabNav` has no focus request, and MAP focus is local state (`RoutesScreen.tsx:35`). A new API is needed for the detail-page affordance.
8. RideDetailScreen already has a 10-ride ranking table under ON THIS WAY (`:561-562`, `PbDetail` `:80-102`, `rankingPoolFor`) and a rank line (`rideDetailModel.ts:69-104`). Neither is in the decisions. Planner must decide.
9. Demo depends on the plot: `DemoScreen.tsx:779-797` renders `ResultsPlot`. `demoModel.ts` imports `plotWindow`, `windowCaption`, `buildHistoryBoard`. `demo_suite.ts` hard-codes 9 in at least 5 assertions (`:21`, `:29`, `:81`, `:718`, `:725`).
10. Tests that break on deletion: `recordflow_suite.ts:309-310, :317-318, :333` (read ResultsScreen.tsx and ResultsDetailScreen.tsx), `resultsmodel_suite.ts` (imports resultsListModel and resultsPlotModel).
11. Allow list: 452 entries. About 25 entries belong to RESULTS screens and plot, all listed in 7.2. Deleting a file without removing its entries fails the live-tree test.
12. `ResultsScreen.tsx:50-54` is one of two `settleRideHomes` triggers. RidesScreen `:104` is the other, so removal is safe.
13. `RideDetailScreen.tsx:429` and `RideDetailRequest.source` `'results'` (`tabNav.tsx:36`) carry the RESULTS back label and must be removed with the tab. Item 12 of the cycle23 on-device checklist names `BACK TO RESULTS`.
