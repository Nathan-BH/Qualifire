# Digest 03: place rename vs route/way naming

- **Date:** 2026-10-09
- **Scope:** read-only digest of `app/src` and `app/tests` on the `virgin` branch, to answer "why can places be renamed but routes/ways cannot?". No code changed. Line numbers are as read today. Items marked (inferred) come from reasoning over the code, not from a line that says so.

## TL;DR
1. Places are renamable: a Rename button on the place detail screen (CatalogDetailScreen.tsx:252) runs `renameLandmark` (catalogMerge.ts:19), then `saveUserCatalog`. Only user-owned places qualify; seed places are refused (catalogMerge.ts:21, catalogDetailModel.ts:105).
2. Routes and ways have no name field. Their names are derived at read time: "<start> → <end>" or "<place> loop" from landmark labels (defaultWay.ts:80-82), plus the way's `specs` joined by " · " (defaultWay.ts:61). The only user-typed name part is `Way.specs` (types.ts:78), set once at creation in routeNamingCard.tsx:376.
3. No edit path for `specs` exists after creation (none found in catalogDetailModel.ts, RoutesScreen.tsx, or the rename flow). That is the gap behind "I cannot rename a route".
4. Renaming a place already renames every route and way touching it on every screen, because labels are never stored on routes or rides. Rides store only `wayId` (types.ts:118-119).
5. A route/way rename would need a new editable field or an edit path for `specs`. The existing duplicate-spec guard (catalog.ts:93-113) would have to be re-run on that edit.
6. Terminology in code vs UI: `Route` = from-to pair, `Way` = named variant (types.ts:36-58). UI says "CREATE ROUTE" for a new pair and "ADD WAY" / "New way on X" for a variant (routeNamingCard.tsx:189, 378; allow-list lines 2650-2666).

## 1. Place rename, end to end
- **UI entry:** CatalogDetailScreen.tsx. Rename button at :251-253 (shown when `model.renamable && !renaming`). Inline TextInput at :257-262, `maxLength={40}` at :262, `autoFocus`. SAVE / cancel at :264-270. Comment at :6 says Alert.prompt is iOS-only, so inline input was chosen.
- **Caller:** CatalogDetailScreen.tsx:119-127. Calls `renameLandmark(userCatalog(), SEED, request.id, label)`; on failure `Alert.alert('Could not rename', ...)` (:121, :123); on success `saveUserCatalog(out.next)` (:120, :122-124), then `bump()`.
- **Pure function:** catalogMerge.ts:19-27 `renameLandmark(userCat, seedCat, id, label)`.
  - :21 id must be in the user catalog (seed places refused).
  - :22 `label.trim()`.
  - :23 empty refused ("a place needs a name").
  - :24-25 clash via `placeByLabel(mergeCatalogs(seed,user), next, id)`. Case-insensitive, normalized, includes seed, excludes the place itself (placeSearch.ts:26-31).
  - :26 returns a new catalog with only that landmark's `label` changed.
- **Persist:** catalogStore.ts:120-121 `saveUserCatalog` validates the merged catalog via `validateCatalog`, sets `user`, recomputes, and enqueues a write.
- **Validation:** trim, non-empty, unique across seed and user places (case-insensitive), max 40 chars (UI only, CatalogDetailScreen.tsx:262). `validateCatalog` (catalog.ts:48, :67-69) checks duplicate ids, radius, and activeUntil order. It does NOT check label emptiness or length (grep found none) (inferred absence).
- **References by id vs by name:**
  - By id: `Route.startLandmarkId` / `endLandmarkId` (types.ts:39-40); `landmarkUsage.ts` counts via route to landmark ids; `catalogMerge.ts` merge re-points ids (:57-73).
  - By name at read time: `landmarkLabel` (catalogDetailModel.ts:57-59) and `routeLabel` (:61-63), so renames propagate.
  - By name for uniqueness only: `placeByLabel` (placeSearch.ts:26), `newPlaceLabelErrors` (routeCreation.ts:335-349).
  - No stored label snapshot found on routes, ways, gate sets, or results.

## 2. How route and way names work today
- **Stored fields:**
  - `Landmark.label` (types.ts:23): the only stored human name in the catalog.
  - `Route` (types.ts:37-50): `id`, `startLandmarkId`, `endLandmarkId`, `loopDiscriminator?`, `wayIds`, `sportId?`. No label field. defaultWay.ts:27-28 says so explicitly ("the Route type has no label field").
  - `Way` (types.ts:58-79): `id`, `routeId`, `refLineId`, `gateSetVersion`, `seeded`, `referenceRideId?`, `specs?`. `specs` is the rider's ordered free-text segments after From/To (e.g. ['Dry','Fast']). Absent or [] = "plain".
- **Generation:** routeCreation.ts:393 mints `way:<rideId>`, :440 mints `route:<rideId>` (matches the WP-3 note in types.ts:55-57). Names come from the rider: start and end landmark labels (routeCreation.ts:443-446), and `cleanSpecs(names.specs)` (:394). There is no auto-generated variant name for user routes.
- **Seed names:** seed ids are themselves the names, e.g. "Morning", "EveningA", "WorkStationA" (catalog.seed.json ids). Display overlay WAY_DISPLAY_ID (defaultWay.ts:14-25) maps them to FromTo-style ids. `wayLabel` (:31-33) splits on capitals. Seed ways do not carry `specs`.
- **Derived display helpers:**
  - `wayVariantLabel` (defaultWay.ts:56-70): specs joined " · "; user-minted without specs gives "plain"; seed ids strip the landmark prefix.
  - `routeTitle` (:80-82): "X loop" or "X → Y".
  - `wayLabelIn` (:89-94): routeTitle + specs, e.g. "Home → Work · Dry".
- **Where it is displayed (every screen found):**
  - MAP tab: catalogMapModel.ts:42-44, :172, :224 (route focus sheet); RoutesScreen.tsx header opens CatalogDetailScreen (:12).
  - Place/route detail: catalogDetailModel.ts:82 (fullLabel), :113, :153 (routeLabel), :81 (variantLabel).
  - RECORD: RecordScreen.tsx:1266 (routeTitle of picked from/to), :1350 and :1376 (matchedWayLabel, "not X?").
  - Ride detail: RideDetailScreen.tsx:227, :410, :476, :484, :503, :599.
  - Activities/feed: rideHistoryModel.ts:128, :154, :193 (labelFor), feedModel.ts:88 (title = wayName), RidesScreen.tsx:156.
  - Replay: ReplayScreen.tsx:224. Gate adjust: GateAdjustScreen.tsx:42, :61. Delete confirm: catalogDeleteActions.ts:70.
- **User-editable name field:** none found. The naming card (routeNamingCard.tsx) lets the rider type start/end and `specs` only when creating a route or way (:125, :163, :376). Lines 189 and 378 switch between "New route / CREATE ROUTE" and "New way on X / ADD WAY". No rename or edit control for a way or route's specs exists (inferred from absence in catalogDetailModel.ts, RoutesScreen.tsx and catalogDeleteActions.ts; RoutesScreen only deletes, per the catalogStore.ts:27-30 comment).

## 3. What keys off names, and seeded vs user-recorded
- **Keys by id, not name:** gate sets, results (`RideResult.wayId`, types.ts:118-119), reference lines, live candidates, landmark usage (landmarkUsage.ts:5-15), delete cascades (catalogDelete.ts:93-144). Renaming a place or a way's specs therefore cannot break results. Ride rows store no name snapshot.
- **Name lookups:** `placeByLabel` only (uniqueness). No lookup of a route or way by its name was found (grep for wayName/routeName/wayLabel usages shows display use only).
- **Seeded vs user:** seed places are never renamable (catalogMerge.ts:21). Seed ways carry `seeded: true` (types.ts:63) and are named by their id overlay. User ways (`way:`/`route:` prefix, defaultWay.ts:40-42) are named by landmarks + specs.
- **Specs uniqueness:** catalog.ts:93-113 rejects two ways on one route with the same non-empty specs (lowercased join). A future route/way rename would have to re-check this rule; a two-plain-route case stays legal (catalog.ts:93-94 comment).
- **Persisted rides:** `RideResult` stores `wayId` only (types.ts:118-119). Labels are recomputed on each render via labelFor (rideHistoryModel.ts:128).

## 4. Tests and rider-facing strings
- **Tests for place rename:** app/tests/catalogmerge_suite.ts:52-67 covers trim (:52), empty refused (:60), clash refused (:61), own name allowed (:63), seed place refused (:66-67). Also covers merge.
- **Tests for route naming:**
  - store_suite.ts:618-632 `wayLabel` for seed ids.
  - migrations_suite.ts:407-415 `wayVariantLabel` and `wayLabelIn` for a legacy route with specs.
  - recordflow_suite.ts:676-707 `routeTitle`, including the loop case.
  - No test found for a way/route name edit (none exists to test).
- **Stale references (noted, not fixed):** waySpecs.ts:7 cites tests/routespec_suite.ts, which does not exist. defaultWay.ts:9-10 and :27 cite defaultRoute.ts and "routeLabel" (renamed to defaultWay.ts / routeTitle).
- **ui-strings.allow.json entries near a rename UI** (line numbers below are in tests/ui-strings.allow.json):
  - "Rename" (CatalogDetailScreen.tsx, text), "Could not rename" (alert-title, same file).
  - "Merge into another place…" (:274); "Pick the place to keep. Every route from or to ..." (:298); "No route uses this place yet." (:282); "This place is no longer used by any route." (RoutesScreen.tsx, :1414).
  - "ROUTES FROM HERE" (:148) and "ROUTES TO HERE" (:307), "BACK TO MAP" (:250).
  - "rename" (settings.tsx, sports rename, :3337).
  - "ADD WAY" (:2650), "CREATE ROUTE" (:2658), "New route" (:2666), "New way on" (1 match).
  - Store-level rename errors "a place needs a name" (catalogMerge.ts:23) and "A place called ... already exists" (:25) are NOT in the allow list ("needs a name" count 0; "already exists" appears only in other entries). The ui_strings extractor scope for store files was not checked (inferred).
