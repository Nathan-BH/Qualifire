# RECORD: starting a new way on an already-known route. Digest

**Date:** 2026-10-09
**Scope:** `app/src/ui/RecordScreen.tsx`, `ui/recordFlow.ts`, `ui/RideDetailScreen.tsx`, `live/engine.ts`, `location/index.ts`, `store/routeFromRide.ts`, `store/routeCreation.ts`, `ui/routeNamingCard.tsx`, `app/tests/`, `app/tests/ui-strings.allow.json`. Read-only. Line numbers are from this read; "inferred" marks anything not read directly.

## TL;DR
1. A known (from,to) pair resolves to the FIRST Route with those two landmarks (`routeForEndpoints`). Its default Way is the most-ridden one (`defaultWayFor`). The "WHICH WAY TODAY?" selector shows only when that Route has more than one Way, and has no "new" option.
2. A ride with no picked Way (any 'new' endpoint, or a pair with no Route) is a free ride at START: no engine candidate, the live map shows the trail ("writing history"), and no off-route logic runs.
3. A ride on a picked Way has exactly one reference, fixed at START. The engine scores only that Way and marks a rider who leaves it as missed sectors. The reference line is drawn and the trail is hidden from the first frame.
4. "Save as a new way" exists only after the ride ends: the naming card (RECORD) or the ride-detail offer. Both are fed by `draftRouteFromRide`, which already detects an existing Route for the pair and sets `existingRouteId`.
5. Nathan's idea maps to a small UI change in the WHICH WAY block (RecordScreen 1623-1660). Adding a "new" option means a wayPick sentinel that yields a null reference (inferred). The rest of the pipeline already exists.
6. Tests cover the overlay rule (recordflow_suite) and the variant save (routecreation_suite). No test covers a RECORD "new way" START.

## 1. How RECORD picks the way for a (from,to) pair

- **Endpoint pills.** `from`/`to` state at RecordScreen.tsx:278-279, initialised to `defaultEndpoints(...)` or `NEW_ID`. `NEW_ID = '~new'` is a module constant at RecordScreen.tsx:133 and mirrored in recordFlow.ts:183. STARTING FROM pills at RecordScreen.tsx:1595-1598 (the `new` pill). GOING TO pills at 1617-1620. `LOOP_ID = '~loop'` is recordFlow.ts:150, and `resolveGoingTo` (recordFlow.ts:160-164) turns it into the START place.
- **Pair to Route.** `const route = routeForEndpoints(CATALOG.routes, fromId, toId)` at RecordScreen.tsx ~1161 (inferred from the 1155-1200 read). `routeForEndpoints` (recordFlow.ts:172-175) is the first Route whose start and end match. A `~new` or `~loop` never matches.
- **Ways of the Route.** `routeWays = sortWaysForDisplay(CATALOG.ways.filter(routeId))` at RecordScreen.tsx:1161 (the line numbers are from the 1155-1200 window).
- **Default Way.** `pickedWay` (RecordScreen.tsx:1163-1168) is the explicit `wayPick` if it belongs to this Route, else `defaultWayFor(routeWays)` (RecordScreen.tsx:153-165, most ghost rides, then most recent, then catalog order). If there is no Route, `pickedWay` is null.
- **Explicit pick state.** `wayPick: {routeId, wayId} | null` at RecordScreen.tsx:308. Cleared on sport switch (RecordScreen.tsx:287-299, via store/sportSwitch.ts:13-21).
- **WHICH WAY TODAY? selector.** Condition at RecordScreen.tsx:1623: `route && routeWays.length > 1`. Two renderings: `specPickRows` when specs exist (1626-1638), otherwise plain pills by `wayVariantLabel` (1639-1644). Label at 1625. The code comment at 1622 says "hidden by construction" for 'new' endpoints. **There is no "new" pill in this block.**
- **pickSource.** `'picked' | 'default' | 'none'` at RecordScreen.tsx:1172-1176. Logged in the ride's pick event (location/index.ts ~468-472).
- **Armed (pre-START) map.** Line `wayId={pickedWay?.refLineId ?? null}` at RecordScreen.tsx:1270-1276, and in the setup map at 1539-1545.

## 2. Free ride vs chosen Way during recording

- **Decision point.** START calls `startTracking({ wayPick: pickedWayRef.current?.id ?? null, wayIds, startContext, sportId })` at RecordScreen.tsx ~716-720. The comment at 711 says a 'new' endpoint "starts exactly like a known pair with no route yet (wayPick null)". `setRideWayHint(pickedWayRef.current?.refLineId ?? null)` is at 713.
- **Engine.** `liveEngine.start({ pickId, wayIds })` at location/index.ts ~452-455. `live/engine.ts:265-292`: `this.pick = opts.pickId`. A candidate is built only if the pick is found in the sport-scoped spec set. Otherwise `this.cands = []`, so the ride has no reference for its whole length. The header (engine.ts:19-27) states this explicitly: no route detection, no lock, no switching, and an off-pick rider is "scored as missed sectors on the pick".
- **Map overlay.** `liveMapOverlayFor({ wayHint: rideWayHint })` at RecordScreen.tsx:1088. recordFlow.ts:81-83 returns `{ wayId: wayHint, showTrail: wayHint === null }`. So a free ride draws the trail ("writing history"), and a picked ride draws the reference line and hides the trail.
- **Trail.** Accumulated from the live fix feed (RecordScreen.tsx:314-320 state, ~403-419 accumulation, cleared at ~691 for a fresh ride). Rendered at 1426 as `trail={mapOverlay.showTrail ? trail : undefined}`.
- **Running map.** `WayMapView` at RecordScreen.tsx:1419-1430, `wayId={mapOverlay.wayId}`, `variant="live"`, `liveState` from `live.phase`/`stationary`.
- **Off-route display.** Drawn off-route when the rider is farther than `OFF_WAY_M = 120` (wayMapView.tsx:173). The same 120 m mirror is `OFF_ROUTE_M` in wayMapGeo.ts:244. The rider dot logic is in ui/riderDotModel.ts (header 1-12). With no reference there is no off-route state, and the free-ride dot is raw GPS (inferred from the overlay rule).
- **Recovery remount.** `setRideWayHint(wayHintForPick(currentCatalog().ways, rec.session.pickId))` at RecordScreen.tsx:455 restores the line after a UI remount (recordFlow.ts:88-93).
- **Colour.** Colour comes only from the reference's ghost history (comment near RecordScreen.tsx:1090-1100). A free ride is neutral.

## 3. Post-ride "save as a new way"

- **Draft.** After STOP, `draftRouteFromRide(s.rideId, s.startedAtMs, finalState.track, fs, sportId)` runs at RecordScreen.tsx ~806 (inferred from the 766-830 window). It is defined at store/routeFromRide.ts:157-181 and calls `draftRouteCreation` (store/routeCreation.ts:197). That function returns `existingRouteId` when both endpoints match an existing Route (`existingRouteFor`, routeCreation.ts:164-169). The offer is `namingOfferMode` (recordFlow.ts:122): 'card' for a new route or a new way on a route, 'quiet' when the ride was already scored as an existing Way (shown as a one-line `not <way>?` link).
- **Naming card.** `ui/routeNamingCard.tsx`. Props at lines 76-100 (`onSave`, `onSkip`, `onSaveFree`, `routeForPair`, `startProposedId`, `endProposedId`, `startPickedId`, `endPickedId`). Title at 189: "New way on <route>" when `existingRoute` is set, else "New route". Copy at 194.
- **Save.** RecordScreen `onNamingSave` (~RecordScreen.tsx 920-960): `findWayWithSpecs` belt (925), then `createRouteFromDraft(draft, names, fs)` (~935). Optional gate adjust (`setAdjust`) afterwards.
- **createRouteFromDraft** (store/routeFromRide.ts:230-281). Reads the ride's fixes, builds a reference (`buildRefFromRideFixes`) and seeds gates, calls `buildRouteCreationCatalog` and `saveUserCatalog`, then saves the ref under `wayId = 'way:' + rideId` (~line 248-250). Clears the unmatched marker and stores the founding result.
- **Linking the ride.** The founding ride's result is stored under the ride (`getStoredResult(draft.rideId)`, RecordScreen ~945) and the window is updated. The Way's `referenceRideId` is set by `buildRouteCreationCatalog` (test routecreation_suite.ts:980 asserts this).
- **Ride-detail path.** RideDetailScreen.tsx:258-265 shows the offer iff a draft exists and `model.referenceOf === null`. Its label is "Save as a new way on <route>" when `existingRouteId` is set (264), else "Make this the reference of a new route". `onNamingSave` at ~270-300 mirrors RecordScreen and also calls `unmarkRideFree`.
- **Terminology drift (inferred from reading).** Code names are "route" for what STATE.md calls a Way (`createRouteFromDraft`, `draftRouteFromRide`, `existingRouteId` used for the Route, while the card says "New way on"). Not a bug, but note it when writing specs.

## 4. Existing paths that start a recording with no way

- **'new' endpoint.** Any 'new' end gives `route === undefined`, so `pickedWay === null` and `wayId === null`. This is the same branch as section 2: a free ride with trail, no engine candidate, and the naming offer afterwards. recordFlow.ts:156-160 says "new → new is the ordinary first ride, not a loop".
- **Known pair with no Way.** Not reachable from RECORD: a Route always has at least one Way in the pill path, so `routeWays` is non-empty (inferred from `sortWaysForDisplay` use at 1161 and `defaultWayFor`). The post-ride card is the only way to add a Way to that Route.
- **Recovery remount.** Keeps the pick, so no change.
- **DEMO.** DemoScreen.tsx:192 `FIRST_RIDE_STATUS = 'writing history · no known route here'`. demoModel.ts:335 "added as a new way · demo only, nothing saved". Demo only.
- **Difference between free-ride and naming-card paths.** Live map: identical (trail, no line). Saving: the free path is `markRideFree`, the naming path is `createRouteFromDraft`, which writes a Way and a ref.

## 5. Tests and rider-facing strings

Tests (app/tests):
- recordflow_suite.ts:114-117: `liveMapOverlayFor({wayHint:null})` gives trail and no line ("writing history").
- recordflow_suite.ts:119-122: a picked route shows its line and hides the trail.
- recordflow_suite.ts:128-133: source scan that RecordScreen feeds the overlay the START-frozen pick only.
- recordflow_suite.ts:136-140: trail and line are mutually exclusive.
- recordflow_suite.ts:285: phase status strings including 'writing history'.
- routecreation_suite.ts:225, 416-435, 556, 604-608, 980, 994-1007: post-stop offer, new way on a seed route, existing loop way offered as variant, variant add via `createWayFromDraft`, referenceRideId set.
- live_colour_suite.ts:121-148 (NW-1): a brand-new way walked ride by ride starts with zero history.
- catalogdelete_suite.ts:54: single ride drafted into a new way.
- No test covers: the WHICH WAY selector (no "new" option), a START with a "new" way sentinel, or the post-ride variant offer from a known pair through the RECORD UI (the RECORD UI is not unit-tested; coverage is by source scan).

Rider-facing strings (tests/ui-strings.allow.json, line numbers from grep):
- 962 "WHICH WAY TODAY?"; 978 "new" (pill)
- 331 "WAY ·"; 395 "way"; 379 "reference activity"
- 419 and 738 "This activity was a different way" (naming link `not <way>?`)
- 455 "writing history · no known route here" (DemoScreen)
- 1123 "Make this the reference of a new route"; 1139 "Save as a new way on {…}"; 1172 "this route"; 1228 "Make this the reference of this way"
- 1086 "That way already exists"; 1102 "BACK TO ROUTE"; 1268 "Save as free activity"; 1164 "saved as a free activity"
- 196 and 209 route fold / rename messages (not on this path); 1388-1423 delete-way copy (not on this path).
- Any new "new way" option label, or a new "which way today" help line, would need a new allow.json entry (CLAUDE.md rule 7; the 40-char rule applies).

## Open points for the Plan step (not decided here)
- A "new" option in WHICH WAY TODAY would need a non-Way sentinel in `wayPick` (inferred: `wayPick` holds `{routeId, wayId}`, so this needs a new shape or a special id).
- The selector is shown only with more than one Way. Nathan's proposal makes it the default for every known pair, so it would also appear for single-Way pairs (inferred UI change).
- Off-route scoring against the picked Way (engine.ts header) would still apply to a picked Way. Starting a new Way on the route would need the free branch (no candidate), so the live trail is drawn and the post-ride naming card still offers the variant (inferred).
