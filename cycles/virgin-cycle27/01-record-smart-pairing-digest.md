# RECORD picker: how pill order and the default GOING TO are chosen today — Digest

**Date:** 2026-10-08
**Scope:** `app/src/ui/RecordScreen.tsx`, `app/src/store/landmarkUsage.ts`, `app/src/store/defaultWay.ts`, `app/src/store/sportSwitch.ts`, `app/src/ui/colourModel.ts`, `app/tests/`. Read-only. Line numbers from the working tree on 2026-10-08. "Traced" = read from code, not run on device.

## TL;DR

1. Both pill rows (STARTING FROM and GOING TO) draw from ONE list, `startable`, sorted by per-LANDMARK ride count (`RecordScreen.tsx:1135-1138`, `landmarkUsage.ts:27-29`). The GOING TO order does not depend on the chosen start.
2. Tapping a START pill only sets `from` and `fromExplicit` (`RecordScreen.tsx:284`). It never sets `to`. No code selects a GOING TO pill in response to a START tap.
3. `to` is set in only three places: the mount default, a sport switch, and a GOING TO tap (`RecordScreen.tsx:279`, `:298`, `:1599`, `:1606`). The mount and sport-switch defaults are the first two offerable landmarks in CATALOG order, not usage order (`defaultWay.ts:145-148`).
4. So the "random" highlight is most likely a stale `to` from mount or the last tap, possibly hidden by the same-place filter at `:1598`. This is inferred from code, not reproduced on the PC.
5. Pair frequency is not computed anywhere today. The data to derive it exists (ride result to way to route to start/end landmark), but no code does it.

---

## 1. Where the picker lives

- State: `RecordScreen.tsx:278-279` (`from`, `to`, defaults via `defaultEndpoints(activeCatalog())`). `NEW_ID = '~new'` at `:133`.
- `fromExplicit` and `pickFrom`: `RecordScreen.tsx:283-284`. `pickFrom` sets `from` and `fromExplicit` only.
- `CATALOG = activeCatalog()`: `RecordScreen.tsx:269`.
- Sport switch reset: `RecordScreen.tsx:291-299` calls `afterSportSwitch(activeCatalog())` (`sportSwitch.ts:19`), which returns `defaultEndpoints` plus a null `wayPick`.
- Derived START: `RecordScreen.tsx:1143-1151`. `effectiveFromId` at `recordFlow.ts:63-71`: in auto mode with no explicit tap, the detected landmark stands in for `from`.
- Pill rows: STARTING FROM `RecordScreen.tsx:1569-1587` (plus `new` pill at `:1591-1594`); GOING TO `:1596-1609`.
- Route lookup: `RecordScreen.tsx:1155-1157` (`startLandmarkId === fromId && endLandmarkId === to`). Way choice: `:1158-1164`.

## 2. How the pill ORDER is computed

**The list.** `RecordScreen.tsx:1135` `startableUnsorted = CATALOG.landmarks.filter(l => l.offerAtStart)`. `:1136-1138`: if `phase === 'setup'`, sort by usage; otherwise keep catalog order.

**The sort.** `landmarkUsage.ts:27-29` `sortLandmarksByUsage`: descending by count. Ties keep input order (stable sort, `Array.prototype.sort`). Empty counts return a new equal array.

**The counts.** `landmarkUsage.ts:8-22` `landmarkUsageCounts(c, countForWay)`:
- For each Route `r`: `n = sum over r.wayIds of countForWay(wayId)`. `countForWay` defaults to `storedResultsForWay(id).length` (`resultsStore.ts:224-226`).
- Add `n` to `startLandmarkId`. Add `n` to `endLandmarkId` only if it differs (a loop counts once).
- Routes with `n === 0` contribute nothing.
- What is counted: every stored RideResult whose `wayId` belongs to a route touching the landmark. This includes archive rides (`source: 'archive'`) and rides the rider ignored from ranking (`ignoredFromRanking`), because `storedResultsForWay` does not filter them (`resultsStore.ts:224-226`, `types.ts` RideResult). Free rides (`wayId: null`) contribute nothing.
- Counts are per LANDMARK (start plus end), not per PAIR. Nothing in the counts depends on the other end of a ride.

**Consequence.** Both rows show the same order, and the GOING TO order is the same whatever START is. The filter `:1598` only removes the current start from GOING TO.

**Phase.** The sort runs only in `phase === 'setup'` (`:1136`). The rows are rendered at `:1580-1609`. I did not find a `phase` check in `:1540-1600`. Whether the rows render in the armed phase, and what order they show there, is unverified.

**Tie-break.** Equal counts keep CATALOG order (stable sort). For a fresh install (no rides) every count is 0, so the pills show catalog order.

**No recency or pair term.** Recency, the last-used pair and the chosen start do not enter the order.

## 3. What a START tap does

**Start tap** (`RecordScreen.tsx:1580-1587`, `onPress={() => pickFrom(l.id)}`):
- `pickFrom` (`:284`) sets `from = l.id` and `fromExplicit = true`.
- `to` is not read or written.
- GOING TO list recomputes its filter (`:1598`): `l.id !== fromId` now hides the new start.
- If `to` equals the new start, GOING TO shows no selected pill. `to` is still that value, so `route` (`:1155-1157`) matches a loop route if one exists. See the earlier digest at `cycles/virgin-cycle26/02-record-picker-digest.md` for this path.
- No code path selects a GOING TO pill when a START pill is tapped. Verified by grep: `setTo(` appears only at `:298`, `:1599`, `:1606` (plus the `useState` at `:279`).

**Mount default** (`RecordScreen.tsx:278-279`, `defaultWay.ts:145-148`): `from` = first `offerAtStart` landmark in CATALOG order, `to` = second. Not usage order, so the initial highlight can differ from the top two pills.

**Sport switch** (`RecordScreen.tsx:291-299`): same CATALOG-order defaults through `afterSportSwitch` (`sportSwitch.ts:19`).

**Ride end** (`RecordScreen.tsx:810` area, comment `:812-822`): `setFromExplicit(false)` and `wayPick` reset, but `from` and `to` are deliberately left alone ("D4" in the comment). So the last GOING TO survives into the next ride's setup.

**Ride discard** (`RecordScreen.tsx:1046`): `setFromExplicit(false)` and `wayPick` reset. `from` and `to` are again not reset.

**Route variant (Std/Alt).** Not usage-based. `pickedWay` (`:1160-1164`) is `wayPick` if it belongs to the route, else `defaultWayFor(routeWays)` (local function at `RecordScreen.tsx:153-163`). That function picks the way with the most ghosts (`ghostsFor`, ranked and window-capped, `colourModel.ts:77-79`, window `WINDOW_PREV` at `:36`), tie-broken by the latest ghost's start time, then by array order. `routeWays` is pre-sorted by `sortWaysForDisplay` (`defaultWay.ts:93-98`) so Std comes first.

## 4. Ride and route history data (what is stored, not what to build)

- **Rides and results:** one file per ride, `results/<rideId>.json`, holding a `RideResult` (`types.ts`, RideResult interface). Key fields: `rideId`, `startedAtMs`, `wayId` (null = unmatched), `source` ('app' | 'archive'), `lap`, `sectors`, `tripwireDemoted?`, `ignoredFromRanking?`, `derivedBy`.
- **Results index:** `results/index.json`, entries `{rideId, wayId, startedAtMs}` ordered by start time (`types.ts`, ResultsIndex; `resultsStore.ts:211-213`).
- **Way:** `{id, routeId, refLineId, gateSetVersion, seeded, referenceRideId?, specs?}` (`types.ts`, Way). Ways belong to a Route.
- **Route:** `{id, startLandmarkId, endLandmarkId, loopDiscriminator?, wayIds, sportId?}` (`types.ts`, Route). The pair (start, end) is on the Route; `wayIds` links to ways.
- **Landmark:** `{id, label, lat, lon, radiusM, activeFromMs, activeUntilMs, offerAtStart}` (`types.ts`, Landmark).
- **Pick log:** each START logs `{from, to, pickSource, wayId}` (`location/index.ts:464-474`, per section 3 of the earlier digest). I did not check whether this log file is read by any consumer.
- **Chain to a pair count:** RideResult.wayId -> Way.routeId -> Route (startLandmarkId, endLandmarkId). Ride counts per pair are therefore derivable from stored data. No code does this today.

## 5. Tests and string constraints

**Tests that cover this area**
- `app/tests/landmarkusage_suite.ts:51` `landmarkUsageCounts sums start+end usage, loop counted once`.
- `app/tests/landmarkusage_suite.ts:64` `landmarkUsageCounts omits landmarks whose routes all count zero`.
- `app/tests/landmarkusage_suite.ts:71` `sortLandmarksByUsage ranks most-used first, ties keep input order`.
- `app/tests/landmarkusage_suite.ts:81` `sortLandmarksByUsage with an empty counts map returns an equal but new array`.
- `app/tests/store_suite.ts:789` `defaultEndpoints: first two offerable landmarks in catalog order` (also asserts seed defaults `home`/`work`).
- `app/tests/sportswitch_suite.ts:14` and `:22` (`afterSportSwitch` defaults, null way pick).
- `app/tests/recordflow_suite.ts:56-110` `effectiveFromId` cases (START rule only).

**Gaps (not found by grep)**
- No test drives the GOING TO filter (`RecordScreen.tsx:1598`) or `pickFrom`.
- No test covers `defaultWayFor` (`RecordScreen.tsx:153-163`).
- No test checks that the rows' order matches usage order on screen.
- No test covers the `to`-left-behind state after a START tap.

**UI strings** (`app/tests/ui-strings.allow.json`)
- `STARTING FROM` at line 818 (budgeted, bootstrap entry).
- `GOING TO` at line 906 (budgeted, bootstrap entry).
- `new` at line 970 (used on both rows).
- Any new label or hint on these pills must be added to the allowlist and kept within the budget rules in `CLAUDE.md` item 9.

## 6. Surprises and inconsistencies

- **Two different orders for one screen.** Pills are sorted by usage (`:1136-1138`), but the initial `to` and `from` come from CATALOG order (`defaultWay.ts:145-148`). The highlighted default can therefore be a pill that is not at the top of the row.
- **Default is not sticky to usage.** Nothing re-selects `to` after the mount or sport switch. Ride end keeps `to` (`:812-822`).
- **Same order for both rows.** The START and GOING TO rows share one list. The GOING TO row has only the same-place filter.
- **The sort does not update within a setup session.** `startable` is recomputed on each render (`:1135-1138`) from the current `CATALOG` and results store, so new rides are reflected on the next render in setup, not on a timer.
- **Usage counts include archive and ignored rides.** `storedResultsForWay` (`resultsStore.ts:224-226`) does not filter `source` or `ignoredFromRanking`. Ghost ranking does filter (`colourModel.ts` `rankedFor`, not read in full), so the two notions of "usage" differ.
- **The earlier digest's line anchors still hold.** `RecordScreen.tsx:284`, `:1155-1157`, `:1598`, `:1580-1587` match the working tree.

## Unverified / uncertain

1. Whether the STARTING FROM and GOING TO rows render during the armed phase, and whether they then show catalog order (the sort is phase-gated at `:1136`). No phase condition was found in `:1540-1600`.
2. Whether the "auto-highlight" Nathan sees is the stale `to`, a hidden same-place `to`, or something else. Traced from code only; not reproduced on the PC.
3. `rankedFor` (`colourModel.ts:64`) and its filtering were not read in full, so the exact ghost set used by `defaultWayFor` is inferred from `ghostsFor`.
4. Whether any consumer reads the pick log (`location/index.ts:464-474`). Not searched.
5. Whether `storedResults()` is fully populated at the time `RecordScreen` renders (store load order not traced).
6. Whether the `RecordScreen.tsx:810` reset block is the `onEnd` path (inferred from the comment at `:812-822`, not read end to end).
