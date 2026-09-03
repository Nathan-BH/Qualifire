**Status: Brief written 2026-09-03 (Digest+Plan pass). Ready to execute — Nathan's Q4 answer is incorporated (RESULTS tab drops entirely); the navigation-model question is resolved by this brief: no navigation library is added — a lifted `App.tsx` overlay state (`rideDetail`) mirrors the existing `recFullscreen` pattern, delivered to screens through the existing `tabNav` context (`openRide`/`closeRide`). Core design: ONE new full-screen `RideDetailScreen` is both the post-STOP landing (replacing `ResultScreen.tsx`, which moves to `safe_to_delete/`) and what a tap on a RIDES row opens (the in-list accordion goes away); it absorbs everything Result showed for the judged ride, adds the true ridden trace on the map, an honest "set as reference" (= the WP-F create-way seam, extracted into a shared module), and a rider-controlled "ignore in ranking" flag that is enforced at the ONE `ranks()` gate.**
**Review doc item: 8. Size: medium-large (≈ 9 files edited, 3 new, 1 retired; ~600 lines of app code, ~200 of tests). No new dependency.**
**Verified against the mount as read 2026-09-03 (HEAD `a03b84e`, branch `virgin`).**

---

# WP-H — Ride detail screen

## 1. Goal

One full-screen ride view, opened two ways:

1. **Post-STOP** — after the reversed launch mark, instead of `tabNav.go('result')` (RecordScreen.tsx:1022). It shows the ride the rider just finished.
2. **From RIDES** — tapping a row. The row's in-list accordion (sector rows + Export/Delete pills) is removed; those live in the detail now.

It shows, for one ride: route + date, the headline GATED lap (same definition as today, ResultScreen.tsx:161-165), the rank line, the per-sector split table (tier-coloured, with window averages), the ridden trace on a real map (route line with sector-coloured spans where the ride matched a route, PLUS the ride's own decimated GPS line — the "true ridden trace" ResultScreen.tsx:247-248 called future work), the "last N on this route" ranking list with this ride highlighted + PB sectors (Result's per-route PbDetail, now scoped to the ride's own route), and four actions: **Export GPX+**, **Delete**, **Ignore in ranking / Count in ranking** (new), **Set as reference** (new — see §3.3 for exactly what it does and when it appears).

The RESULTS tab leaves the tab bar (Q4, Nathan: "Lets drop the results tab entirely"). No navigation library is added (§3.1).

Not in scope (§3.6): re-referencing an EXISTING route from a later ride (the `Route.referenceRideId` "promote" case), the gate-adjust card's map/scrub upgrade (WP-I), a cross-route Personal Bests overview (dropped with the tab; flagged §8.3).

## 2. Current state (verified against the mount at `a03b84e`)

### 2.1 Root navigation — `app/App.tsx`

| Line | What | Why it matters |
|---|---|---|
| 26 | `import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'` | The ONLY nav-adjacent dependency. `grep -nE "navigation\|react-native-screens" app/package.json` → only `react-native-safe-area-context ~5.7.0` (line 23). **No `@react-navigation/*`, no `react-native-screens`.** |
| 41 | `import { TabNavProvider, type Tab } from './src/ui/tabNav'` | The seam screens already use to drive Shell without importing it. |
| 55 | `const [tab, setTab] = useState<Tab>('record')` | Hand-rolled tab switcher: plain state, no library. |
| 59 | `const [recFullscreen, setRecFullscreen] = useState(false)` | **The precedent.** A boolean lifted to Shell that a screen sets via a callback prop. |
| 70-79 | `BackHandler` effect: any tab ≠ record → `setTab('record')`; on record → default | Ride detail must be handled here first (close overlay before tab fallback). |
| 112 | `const tabBarHidden = tab === 'record' && recFullscreen` | The single switch that removes tab chrome; also drives `content.paddingBottom` (line 189) so the OS gesture strip is still padded when the bar is gone. |
| 125 | `<TabNavProvider go={setTab}>` | Provider takes only `go` today. |
| 128-133 | Conditional render: exactly one screen mounted per `tab` value (`'result'` → `<ResultScreen />` at 131) | Mount-swap: switching tabs unmounts the old screen. Ride detail reuses this exact mount-swap (§3.1). |
| 137-154 | `{!tabBarHidden && <ScrollView horizontal …>` over `(['record','rides','routes','result','settings','demo'] as const)` (144) | The tab list to shrink to five. |
| 189 | `content: { flex: 1, paddingBottom: tabBarHidden ? bottomPad : 0 }` | Reused unchanged once `tabBarHidden` includes the overlay. |

### 2.2 The tab seam — `app/src/ui/tabNav.tsx` (34 lines)

| Line | What |
|---|---|
| 15 | `export type Tab = 'record' \| 'rides' \| 'routes' \| 'result' \| 'settings' \| 'demo'` — `'result'` must go. |
| 17-19 | `export interface TabNav { go(tab: Tab): void }` |
| 23-25 | `TabNavProvider({ go, children })` |
| 30-34 | `useTabNav()` — throws outside a provider. |

Consumers of `useTabNav`: `RecordScreen.tsx:40,172` and `ResultScreen.tsx:35,144` only. The only `'result'` string in `app/src` outside tabNav.tsx is `RecordScreen.tsx:1022` (`tabNav.go('result')`). No other file assumes the tab exists.

### 2.3 The `recFullscreen` mechanism (precedent to mirror exactly)

- `RecordScreen.tsx:166-168`: prop `onFullscreenChange?: (fs: boolean) => void`.
- `RecordScreen.tsx:399-406`: effect reports `isFullscreen(phase) || showAnim != null` (`recordFlow.ts:54-56`: armed/running/ending) and reports `false` on unmount (WP-A2 fix B1).
- `App.tsx:112` folds it with `tab === 'record'`; `App.tsx:137` hides the bar; `App.tsx:189` pads content instead.

Shape: **screen-owned intent, Shell-owned chrome.** The overlay follows the same split (§4.2).

### 2.4 Post-STOP handoff — `app/src/ui/RecordScreen.tsx` (1519 lines)

| Line | What | Why it matters |
|---|---|---|
| 495-559 | `onEnd`: `liveEngine.finalize()`; `s = sessionRef.current`; `finalState`; `rememberRide(finalState, {rideId, startedAtMs})` (511); `rememberFreeRide(finalState, {startedAtMs})` (514); `stopTracking()`; `namingDraftFor(s.rideId, s.startedAtMs, finalState.track)` (528); `setPhase('ending')`; `setNaming(draft)`; `if (draft === null) setShowAnim('rev')` | `s.rideId` / `s.startedAtMs` are in scope HERE but not at the animation's `onDone` — a ref must carry them (§4.11). `rememberRide` → `resultsStore.saveResult` (lastRide.ts:168) does `store.set` synchronously before its first await, so `getStoredResult(rideId)` is answerable the instant the detail opens. `rememberFreeRide` (freeRides.ts:121-137) likewise updates `rides` synchronously. |
| 563-566 | `onNamingSkip` → `setShowAnim('rev')` | Unchanged. |
| 571-618 | `onNamingSave`: `readRideFixes(draft.rideId)` → `buildRefFromRideFixes` → `seedGateChainages` → `buildWayCreationCatalog(userCatalog(), draft, names, seed)` → `saveUserCatalog` (errs → Alert, card stays) → `saveUserRef(\`route:${draft.rideId}\`, builtRef.ref)` → `setAdjust({...})` or `setShowAnim('rev')` | **This body is the WP-F §8 seam.** WP-H extracts it into `src/store/wayFromRide.ts` (§4.9) and calls it from both RecordScreen and the detail. |
| 624-663 | `onAdjustKeep` / `onAdjustSave` (`addGateSet(userCatalog(), { routeId, version: 2, chainageM, createdAtMs, origin: 'geometric', note })` → `saveUserCatalog`) | Also extracted (§4.9 `saveAdjustedGates`) so the detail's create-way flow offers the same tap-then-nudge step. |
| 76-88 | `readRideFixes(rideId)`: `fs.readText(\`rides/${rideId}.jsonl\`)` → `decodeRideFile(text).fixes`, null on failure | Moves to the shared module; ALSO what the detail uses to draw the true trace. |
| 90-107 | `namingDraftFor(rideId, startedAtMs, matchedRouteId)` → `draftWayCreation(currentCatalog(), { rideId, startedAtMs, fixes: …map lat/lon, matchedRouteId })` | Moves to the shared module as `draftWayFromRide`. |
| 109-114 | `existingLandmarkLabel(r)` | Moves to the shared module. |
| 990-1032 | `phase === 'ending'` render: "Ride saved — …", `GateAdjustCard` / `WayNamingCard` / null, then `<LaunchAnimation reverse onDone={() => { setShowAnim(null); setPhase('setup'); tabNav.go('result'); }} />` (1017-1023) | **The one line to replace**: `tabNav.go('result')` → `tabNav.openRide(...)`. |

### 2.5 `app/src/ui/ResultScreen.tsx` (322 lines) — full render inventory (what must not regress)

| Lines | Shows | Fate in WP-H |
|---|---|---|
| 152-154 | `free = lastFreeRide()`, `ride = getLastRideOrStored()`, `showFreeBoard = free && (ride === null \|\| free.startedAtMs > ride.atMs)` — "which of the two most recent rides" | Gone: the detail is opened FOR a specific rideId; no "most recent" arbitration. Free-vs-route is decided per ride (§4.8 `rideDetailFor`). |
| 155-169 | `lapValues(routeId, rideId)`, `tierFor` → `lapTier`; `lapCellLabel(lapMovingS, estimated, lapRawS)`; `rankLineFor(ride, hist, ownLapBarredFromRanking(...))` (59-76) | Kept verbatim in the pure model (§4.8). `rankLineFor` gains one branch for `ignoredFromRanking`. |
| 182-192 | `resultSectorColours`: `[null, ...sectors.sorted.map(clean && movingS!==null ? tierLineColour(tierFor(movingS, sectorValues(routeId, i, rideId).filter(v => v !== movingS))) : null)]` | Kept verbatim (§4.8 `sectorColoursFor`). |
| 205-230 | FREE RIDE board: date, "N gates crossed", per-sector `routeLabel(sec.routeId) S{i} — {fmt(rawS,1)} raw`, isolation copy, RECORD ANOTHER | Kept as the detail's free-ride variant (§4.10 render branch B). |
| 231-234 | "Record a ride to see it here." | Becomes the detail's "not on file" variant (result null, not free). |
| 236-256 | Route board: `routeLabel`, big `lapLabel` in `tierColour(lapTier)`, `rankLine`, VIEW TRACE toggle (241-245) → `<RouteMapView variant="browse" routeId lat={null} lon={null} zoom={1} height={300} showRider={false} sectorColours leadColour={colors.grey} />` (249-250), RECORD ANOTHER (253-255) | Kept; the map is always shown (no toggle) and gains `trail` (§4.10). RECORD ANOTHER → `closeRide()` + `go('record')`. |
| 259-287 | PERSONAL BESTS — `buildPbRows(routeIdsInHistory(), allTimeBestLapS, rankedCountFor)` accordion over EVERY route with history; open row → `PbDetail` (97-139): `buildPbDetail(rankingPoolFor(routeId, lastRideId), lastRideId)` → ranking list (gated by `s.tower`) + PB sectors | **Split**: the ride's-own-route `PbDetail` is kept inside the detail ("ON THIS ROUTE" section, §4.10). The cross-route accordion is dropped with the tab (§3.4, §8.3). `buildPbRows` stays in `rideHistoryModel.ts` (tested at ridehistory_suite.ts:188) — unused by UI after this WP; not deleted. |
| 289-292 | D-013 footer copy ("Position is a fact; colour is a judgement…") | Kept as the detail's footer. |
| 44-52 | `tierColour(tier, t)` | Moves into RideDetailScreen. |
| 83-95 | `routeIdsInHistory()` | Retired with the file. |

### 2.6 `app/src/ui/RidesScreen.tsx` (325 lines)

| Line | What | Fate |
|---|---|---|
| 43 | `const [expandedId, setExpandedId]` | Removed. |
| 108-113 | `rows = buildRideRows(rides, getStoredResult, (routeId, excl) => lapValues(routeId, excl))`, `metaById` | Kept (row header unchanged). |
| 115-144 | `onDelete(ride: RideMeta)`: Alert → `deleteRide` → `removeStoredResult` → `dropRecorded` → `refresh` | Moves to the detail (identical body; RidesScreen remounts on close and refreshes itself — §3.1). |
| 146-162 | `onExport(ride: RideMeta)`: `exportGpxPlus` → `saveGpx(gpxBaseName(startMs), gpx)` → Alerts | Moves to the detail (identical body). |
| 187-204 | Row head `Pressable` → `setExpandedId(...)`; chevron `expanded ? '▾' : '›'` | `onPress={() => tabNav.openRide({ rideId, source: 'rides', startMs })}`; chevron always `›`. |
| 205-243 | Expanded detail: `buildSectorRows(result, (i) => sectorValues(routeId, i, rideId))` rows + `pillRow` (Export GPX+ / Delete) | Removed from the list. |
| 302-325 | styles `detail`, `secRow`, `secPos`, `secTime`, `secAvg`, `pillRow`, `exportBtn`, `busy`, `exportText`, `deleteBtn`, `deleteText` | Move (copied) to RideDetailScreen; removed here. |

### 2.7 Data: results, ranking gate, consumers

- `app/src/store/types.ts:80-109`: `SectorQuality = 'clean' | 'interrupted' | 'estimated' | 'missed'`; `SectorResult { index; fromChainageM; toChainageM; rawS; movingS: number | null /* null unless clean|interrupted */; quality }`; `RideResult { kind; schemaVersion; rideId; startedAtMs; routeId: string|null; source: 'app'|'archive'; lap: {rawS; movingS; quality}; sectors; tripwireDemoted?; derivedBy }`. `RESULT_SCHEMA_VERSION = 1` (line 16).
- **`app/src/store/results.ts:89-93` — `ranks(r)`: THE single eligibility gate.** `estimated|missed → false; tripwireDemoted → false; else movingS !== null`. Every ranking/colour consumer routes through it:
  - `colourModel.ts:50-54 rankedFor()` (→ `ghostsFor` 63, `rankedCountFor` 70, `rankingPoolFor` 83, `lapValues` 111, `sectorValues` 121), `ownLapBarredFromRanking` 96-100, `allTimeBestLapS` 148-151;
  - `rideHistoryModel.ts:115` (`buildRideRows` own-side eligibility);
  - `lastRide.ts:248, 273` (`initRideHistory` only pushes `ranks(r)` results into `recorded`);
  - `store/defaultRoute.ts:85`; `store/results.ts:114` (`tower`); `towerModel.ts:56` (via `ghostsFor`).
  - `sectorHistory` (results.ts:136-149) takes an already-filtered array — no change needed.
  - **Adding one line to `ranks()` therefore makes the new flag effective everywhere at once.** No consumer has a local lookalike (B-117 closed that).
- `app/src/store/resultsStore.ts`: `isValidRideResult` 72-88 (structural guard; extra fields pass), `storedResults()` 210, `getStoredResult(rideId)` 214, `saveResult(r)` 233-246 (validates, `store.set`, index upsert, enqueued file write — **already the correct upsert path for a flag flip**), `removeStoredResult` 249-258, `flushResultWrites()` 260 (test seam).
- `app/src/ui/lastRide.ts`: `recorded: RideResult[]` 43 is a SEPARATE array of objects from the store map — `pushRecorded` 209-227 builds a fresh object at STOP; `initRideHistory` 240-283 pushes the store's objects at boot but ONLY if `ranks(r)`. Consequence: flipping the flag must update `recorded` too (replace the entry; and re-add it on un-ignore, since an ignored ride is never in `recorded` after a reboot). `dropRecorded` 285-288 is the model for that helper.

### 2.8 Free rides — `app/src/store/freeRides.ts`

`FreeRideRecord { kind:'freeRide'; schemaVersion:1; rideId: \`free:${startedAtMs}\`; startedAtMs; crossings[]; sectors: {routeId; index; rawS}[] }` (33-39, 121-137). `freeRideResults()` 144 (oldest first), `lastFreeRide()` 151. **Its `rideId` is NOT the raw ride's id**, and `startedAtMs` is the session's `Date.now()` taken AFTER `await startRide()` (location/index.ts:328-329) whereas the raw index entry's `startMs` is storage's own `now()` inside `startRide` (storage/core.ts:142-148) — a few ms earlier. So a RIDES-tab open of a free ride needs a tolerance match (§4.7); a post-STOP open has the exact `s.startedAtMs` in hand and passes it through the request (§4.1).

### 2.9 The create-way seam — `app/src/store/wayCreation.ts`

`draftWayCreation(c, ride: RideFacts): WayCreationDraft | null` (162-257). Returns null when: `< 2` fixes; track `< MIN_TRACK_LENGTH_M` (200 m); **both endpoints resolve to existing landmarks that a way already links in this direction (244)** — i.e. a repeat ride of a known way. `matchedRouteId` only feeds the WP-F endpoint guard; it never creates or vetoes an offer by itself (docblock 137-160). `buildWayCreationCatalog(userCat, draft, names, seed?)` (270) sets `referenceRideId: draft.rideId` (299). `Route.referenceRideId?` (types.ts:55) exists; its docblock says "promoting a later clean lap rewrites this field" — but no code does that today, and doing it would also mean replacing the route's `refLineId` geometry under existing gate chainages (WP-I territory). See §3.3.

### 2.10 Map — `app/src/ui/routeMapView.tsx`

Props at 157-219 (digest item 2). Relevant behaviour for a non-live detail view: `variant="browse"` → `initialMode 'fit'` (310-315); `bounds = asset ? routeBounds(asset) : null` (456); **`riderOnly = !gatesOnly && !asset; if (riderOnly && !showRider) return null;` (422-423)** — a browse map for a ride with NO route asset (unmatched / free ride) renders nothing today; `trail` (218-223, WP-J) draws the ridden line, always-mounted source (404-416), MapLibre rung only. `cameraTargetFor` (routeMapGeo.ts:389-414) fits `bounds` when given. `LonLatBoundsBox` / `routeBounds` at routeMapGeo.ts:163-167. **One small extension is needed** so the trace shows for unmatched/free rides too: a trail-derived bounds fallback and relaxing the 422-423 bail-out when a trail is supplied (§4.13).

### 2.11 Tests — `app/tests/`

`run.ts` imports 24 suites; `lib.ts` exports `test/assert/skip/numEq`. `resultsstore_suite.ts` shows the pattern for suites that need the `.json` loader hook + dynamic import of `resultsStore`/`lastRide`. `ridehistory_suite.ts:29` imports `buildRideRows, buildSectorRows, buildPbRows, buildPbDetail, …`. `waycreation_suite.ts` covers `draftWayCreation`. WP-F landed at 366 tests / 363 pass / 3 skip.

## 3. Design decisions (the design pass QUESTIONS-FOR-NATHAN.md parked)

### 3.1 Navigation model: NO navigation library — a second instance of the `recFullscreen` pattern

**Decision.** Do not add `@react-navigation/*` (or any stack). Add one piece of lifted state to Shell — `rideDetail: RideDetailRequest | null` — and render `RideDetailScreen` in place of the active tab's screen whenever it is non-null, with the tab bar hidden exactly as `recFullscreen` hides it. Screens open/close it through the existing `tabNav` context, which grows two methods (`openRide`, `closeRide`).

**Why, concretely.**
1. **Zero nav dependency today** (§2.1: `package.json` has only `react-native-safe-area-context`). A real stack means `@react-navigation/native` + `@react-navigation/native-stack` + `react-native-screens` + a `NavigationContainer` wrapping Shell, a rewrite of the six-tab bar as a tab navigator (or an awkward stack-over-hand-rolled-tabs hybrid), a new native module in the Expo build, and re-deriving the hardware-back semantics that `App.tsx:70-79` and `RecordScreen.tsx:408-430` currently own by hand. That is a build-and-architecture change for a single screen that has exactly one entry and one exit.
2. **The pattern already exists and is proven on device**: WP-A2's `recFullscreen` (§2.3) is "a screen temporarily owns the whole viewport regardless of tab chrome". The overlay is the same thing with a different trigger. Same `tabBarHidden` switch, same `content.paddingBottom` inset handling — no new layout code.
3. **RecordScreen's in-tab phase idiom does not fit** (it was the other candidate): the detail must be reachable from RIDES too, and RECORD's phases are RECORD's; forcing RIDES to grow phases would duplicate the screen or lift it anyway. Lifting to Shell is the minimal shared point.
4. **Mount-swap, not an absolutely-positioned overlay.** `App.tsx:128-133` already unmounts the previous screen on every tab change; doing the same for the detail (a) costs nothing new, (b) means RidesScreen remounts on close and its `refresh` effect (RidesScreen.tsx:59-61) re-reads the list after a Delete/Ignore performed inside the detail — no cross-screen invalidation plumbing, and (c) cannot be reached while RECORD is armed/running (both entry points happen when RecordScreen is in `'setup'` or unmounted), so no live-ride state is at risk. Trade-off accepted: RIDES' scroll position resets on close.
5. **Hardware back** is handled in Shell's existing effect, first branch: `rideDetail !== null → closeRide(); return true`. RecordScreen's own handler (registered later, runs first) is not mounted while the detail is up, so no ordering interaction.

What the request carries — and why it is a small object, not a bare id:

```ts
/** WP-H: who opened the ride detail, and for which ride. `source` decides
 * where CLOSE lands (post-stop → RECORD's idle setup, 'rides' → the RIDES
 * list) and what the primary button says. `startedAtMs` is the SESSION's
 * start (location/index.ts:329) when the opener has it — the exact key a
 * free-ride record is filed under (`free:${startedAtMs}`, freeRides.ts:127);
 * RIDES only knows the raw index's startMs (a few ms earlier), so it passes
 * that and rideDetailModel falls back to a tolerance match (§4.7). */
export interface RideDetailRequest {
  rideId: string;
  source: 'post-stop' | 'rides';
  startedAtMs: number;
}
```

### 3.2 RIDES: tap opens the detail; the accordion goes

Consistent with Q4's "drop it entirely" spirit and with the original ask ("export/delete demoted into the expanded row — nothing full-screen"): one interaction, one place for actions. The row header (route, date, lap, quality, rank) is unchanged and remains the quick-glance surface; the chevron becomes a plain `›`. Everything that was inside the expansion (sector rows, Export, Delete) is in the detail.

### 3.3 "Set as reference" — what it honestly is in this WP

The seam WP-F left (`draftWayCreation(... matchedRouteId ...)` + `WayNamingCard` + `onNamingSave`'s body) **creates a new way + route with this ride as its reference**. That is the retroactive version of the STOP-step offer: the rider skipped the card (or the offer never fired because the ride had not yet been backfilled) and now wants this ride to become a route. It is available precisely when `draftWayCreation` returns non-null — i.e. NOT for a repeat ride of an already-linked way (§2.9). So:

- Button label: **"MAKE THIS THE REFERENCE OF A NEW WAY"** — shown only when the draft is non-null; tapping it opens the same `WayNamingCard` inline (card copy already says "New way — name where you rode", wayNamingCard.tsx:49), then the same `GateAdjustCard` step when a reference line + seed were built. Post-save the detail re-reads its model (the ride now has a `referenceOf` route) and the button disappears.
- When the ride already IS a route's reference (`catalog.routes.some(r => r.referenceRideId === rideId)`), a passive line: **"reference ride of <route label>"** — no button.
- When the draft is null and the ride is not a reference (a repeat ride of a known way): nothing shown. **Promoting a later ride to REPLACE an existing route's reference** (types.ts:56 "promoting a later clean lap rewrites this field") is NOT built here: it requires swapping the route's `refLineId` geometry underneath existing gate chainages and re-projecting every stored result on that route — that is the chainage-override problem WP-I owns, and Nathan has not ruled that promotion is wanted at all. Flagged §8.1 with a default of "out of WP-H".

The three helper bodies (§2.4 lines 76-114, 571-618, 624-663) are extracted VERBATIM into `src/store/wayFromRide.ts` (§4.9) and RecordScreen becomes a thin caller — WP-F's "worth extracting into a small shared module then" is this WP.

### 3.4 What happens to Result's Personal Bests section

Two halves (§2.5 rows 259-287): (a) the per-route `PbDetail` (last-10 ranking with the judged ride highlighted + PB sectors) is **ride-relative** and moves into the detail as its "ON THIS ROUTE" section, scoped to the ride's own route — same `rankingPoolFor(routeId, rideId)` + `buildPbDetail`, same `s.tower` gate on the ranking list. (b) the **cross-route accordion** (every route with history, tap to open) has no per-ride meaning and goes with the tab. Its natural future home is the ROUTES tab (a PB line per route) — flagged §8.3, default: not in WP-H.

### 3.5 "Ignore in ranking" — semantics

- A rider-set boolean `ignoredFromRanking?: boolean` on `RideResult`. Absent/false = counts (every existing file is unchanged in meaning; no schema bump; `isValidRideResult` untouched — it tolerates extra fields and `ranks()` reads `=== true`, so a malformed value is simply "not ignored").
- **Enforced in exactly one place: `ranks()`** (results.ts:89). Because every consumer already goes through it (§2.7), an ignored ride immediately: leaves every other ride's comparison window (`ghostsFor`/`lapValues`/`sectorValues`), leaves `rankedCountFor`/`allTimeBestLapS`/`rankingPoolFor`, loses its own position in RIDES rows (`buildRideRows` 115) and in the detail's rank line (`ownLapBarredFromRanking` → true), is dropped from `initRideHistory`'s push at next boot, and is skipped by `defaultRoute.ts:85`. Nothing else needs to know the flag exists.
- Distinct from `tripwireDemoted` (automatic, D-024) and from Delete (Nathan: delete is for rides he "genuinely did not do or should not count" — RecordScreen.tsx:668-670): Ignore keeps the ride, its trace and its sector times on file and visible; it only withdraws it from judging others and being judged. Reversible from the same button.
- Persistence: `resultsStore.setIgnoredFromRanking(rideId, ignored)` rewrites the sidecar through the existing `saveResult` upsert (§2.7) and keeps `lastRide.recorded` coherent (§4.6). Backfill never overwrites an existing sidecar (resultsStore.ts:412 "skips anything already stored"), so the flag survives.
- UI honesty: while ignored, the detail's own sector tiers and trace spans render NEUTRAL (plain ink / uncoloured) — achieved without touching `buildSectorRows` by handing it an empty-history function; the rank line says so in words (§4.8 `rankLineFor`).

### 3.6 Scoping against WP-I (gate-adjust map/scrub)

`GateAdjustCard` is embedded in the detail ONLY as the post-create step of §3.3 — the same place RecordScreen shows it. When WP-I upgrades that card to a real `RouteMapView` + chainage override, the detail inherits it with no change here. The detail's own trace map is a plain `variant="browse"` view and takes no chainage override — WP-I's map-half embeds as the card, not by extending the detail's map. Finger-scrub is irrelevant to this screen.

## 4. Proposed changes

### 4.1 `app/src/ui/tabNav.tsx` — drop `'result'`, add the overlay methods

```ts
export type Tab = 'record' | 'rides' | 'routes' | 'settings' | 'demo';

/** WP-H: who opened the ride detail, and for which ride. … (docblock from §3.1) */
export interface RideDetailRequest {
  rideId: string;
  source: 'post-stop' | 'rides';
  startedAtMs: number;
}

export interface TabNav {
  go(tab: Tab): void;
  /** WP-H: show the full-screen ride detail over whatever tab is active
   * (Shell mount-swaps it in and hides the tab bar, same chrome rule as
   * WP-A2's recFullscreen). Idempotent: re-opening replaces the request. */
  openRide(req: RideDetailRequest): void;
  /** WP-H: dismiss the detail; the active tab's screen remounts underneath. */
  closeRide(): void;
}

export function TabNavProvider({ nav, children }: { nav: TabNav; children: ReactNode }) {
  return <TabNavContext.Provider value={nav}>{children}</TabNavContext.Provider>;
}
```

(Provider signature changes from `go` to `nav` — the only caller is `App.tsx:125`.) Update the header comment: "RecordScreen sending the rider to Result" → "…opening the ride detail".

### 4.2 `app/App.tsx`

| Where | Edit |
|---|---|
| 31 | delete `import ResultScreen from './src/ui/ResultScreen';` add `import RideDetailScreen from './src/ui/RideDetailScreen';` |
| 41 | `import { TabNavProvider, type RideDetailRequest, type Tab, type TabNav } from './src/ui/tabNav';` |
| after 59 | `/** WP-H: the full-screen ride detail, mount-swapped in place of the active tab's screen while non-null. Second instance of WP-A2's "screen owns intent, Shell owns chrome" split (recFullscreen above). */`<br>`const [rideDetail, setRideDetail] = useState<RideDetailRequest | null>(null);` |
| 70-79 | back handler becomes: `if (rideDetail !== null) { setRideDetail(null); return true; } if (tab !== 'record') { setTab('record'); return true; } return false;` deps `[tab, rideDetail]`. Comment: "System back: ride detail → close it; other tabs → Record; from Record, default behaviour." |
| 112 | `const tabBarHidden = (tab === 'record' && recFullscreen) \|\| rideDetail !== null;` (comment: WP-H — the ride detail hides the bar the same way) |
| before `return` | `const nav = useMemo<TabNav>(() => ({ go: setTab, openRide: setRideDetail, closeRide: () => setRideDetail(null) }), []);` |
| 125 | `<TabNavProvider nav={nav}>` |
| 128-133 | `{rideDetail !== null ? <RideDetailScreen request={rideDetail} />`<br>`  : tab === 'record' ? <RecordScreen onFullscreenChange={setRecFullscreen} />`<br>`  : tab === 'rides' ? <RidesScreen />`<br>`  : tab === 'routes' ? <RoutesScreen />`<br>`  : tab === 'settings' ? <SettingsScreen />`<br>`  : <DemoScreen />}` |
| 144 | `(['record', 'rides', 'routes', 'settings', 'demo'] as const)` |
| 135-136 comment | "Six tabs do not fit…" → "Five tabs (WP-H dropped RESULT) still scroll sideways rather than shrinking — unchanged bar." |

`closeRide()` from a `'post-stop'` request lands on whatever `tab` is underneath — RECORD, already in `'setup'` (RecordScreen.tsx:1020 sets it before the handoff). That IS the old "RECORD ANOTHER" destination, so the detail's primary button for that source just closes.

### 4.3 `app/src/store/types.ts` — the flag

After `tripwireDemoted?` (line 107):

```ts
  /** WP-H: the RIDER excluded this ride from ranking (detail screen's "Ignore
   * in ranking"). Distinct from tripwireDemoted (automatic, D-024) and from
   * deletion (the ride, trace and sector times all stay on file and visible).
   * Enforced at the ONE gate every consumer already uses — results.ts ranks()
   * — so no reader needs to know this field exists. Absent = counts. */
  ignoredFromRanking?: boolean;
```

No `RESULT_SCHEMA_VERSION` bump (optional, additive; old files unchanged in meaning).

### 4.4 `app/src/store/results.ts:89-93` — enforce it

```ts
export function ranks(r: RideResult): boolean {
  if (r.lap.quality === 'estimated' || r.lap.quality === 'missed') return false;
  if (r.tripwireDemoted) return false;
  if (r.ignoredFromRanking === true) return false; // WP-H: rider-set exclusion
  return r.lap.movingS !== null;
}
```

### 4.5 `app/src/store/resultsStore.ts` — the write

After `removeStoredResult` (258):

```ts
/** WP-H: flip the rider's ranking exclusion on a stored result. Goes through
 * saveResult (same validate + memory + file + index upsert path), so the
 * sidecar on disk always agrees with memory. Returns the updated result, or
 * null when no result is stored for the id (the caller then has nothing to
 * toggle — e.g. a free ride or an unmatched ride with no sidecar). `false`
 * is stored as an ABSENT field, so an un-ignored file is byte-identical in
 * meaning to one that was never ignored. */
export async function setIgnoredFromRanking(rideId: string, ignored: boolean): Promise<RideResult | null> {
  const cur = store.get(rideId);
  if (!cur) return null;
  const { ignoredFromRanking: _drop, ...rest } = cur;
  const next: RideResult = ignored ? { ...rest, ignoredFromRanking: true } : rest;
  await saveResult(next);
  return next;
}
```

### 4.6 `app/src/ui/lastRide.ts` — keep `recorded` coherent

After `dropRecorded` (288):

```ts
/** WP-H: mirror a stored result's change into this session's comparison
 * window. `recorded` holds its OWN objects (pushRecorded builds one at STOP;
 * initRideHistory pushes only ranks()-passing store objects at boot), so a
 * flag flip in the store is invisible here unless replayed. Drops any entry
 * for the id, then re-adds the new object iff ranks(r) — an un-ignored ride
 * that was absent since boot re-enters; an ignored one leaves. Order is
 * irrelevant (colourModel's rankedFor sorts by startedAtMs). */
export function replaceRecorded(r: RideResult): void {
  dropRecorded(r.rideId);
  if (ranks(r)) recorded.push(r);
}
```

The detail's toggle calls `setIgnoredFromRanking` then `replaceRecorded(updated)`.

### 4.7 `app/src/store/freeRides.ts` — find a free ride from a raw ride's start

After `lastFreeRide` (155):

```ts
/** WP-H: the free-ride record for a raw ride, by start time. The record's own
 * id is `free:${sessionStartedAtMs}`, and the session's start (location/
 * index.ts:329) is taken AFTER `await startRide()` stamped the raw index's
 * startMs (storage/core.ts:142) — a few ms apart, never equal. Exact id hit
 * first (post-stop passes the session's own value); else the nearest record
 * within `tolMs`, so RIDES (raw startMs) resolves the same ride. Pure. */
export const FREE_RIDE_MATCH_TOL_MS = 10_000;
export function freeRideNear(
  records: readonly FreeRideRecord[],
  startedAtMs: number,
  tolMs: number = FREE_RIDE_MATCH_TOL_MS,
): FreeRideRecord | null {
  const exact = records.find((r) => r.startedAtMs === startedAtMs);
  if (exact) return exact;
  let best: FreeRideRecord | null = null;
  for (const r of records) {
    const d = Math.abs(r.startedAtMs - startedAtMs);
    if (d <= tolMs && (best === null || d < Math.abs(best.startedAtMs - startedAtMs))) best = r;
  }
  return best;
}
```

### 4.8 NEW pure module — `app/src/ui/rideDetailModel.ts`

Everything the screen shows that is not JSX, headlessly testable. Takes functions, not module state, exactly like `buildRideRows`.

```ts
/**
 * WP-H: the ride-detail view model. Pure: every store read is injected so
 * tests can drive it without the results/free-ride stores (same contract as
 * rideHistoryModel.ts's buildRideRows). Absorbs ResultScreen.tsx's per-ride
 * logic verbatim (rankLineFor, lapTier, resultSectorColours) and adds the
 * WP-H facts (ignored, referenceOf, canOfferReference).
 */
import type { RideResult, Route } from '../store/types.ts';
import type { FreeRideRecord } from '../store/freeRides.ts';
import { ranks } from '../store/results.ts';
import { MIN_HISTORY, positionAmong, tierFor, type UiTier } from './colourModel.ts';
import { lapCellLabel, buildSectorRows, type SectorRowModel } from './rideHistoryModel.ts';
import { tierLineColour } from './chips.tsx';

export type RideDetailKind = 'route' | 'free' | 'none';

export interface RideDetailModel {
  kind: RideDetailKind;
  rideId: string;
  startedAtMs: number;
  /** null for 'free' and 'none' */
  routeId: string | null;
  lapLabel: string;
  lapTier: UiTier;
  rankLine: string;
  ignored: boolean;
  /** true when the Ignore/Count toggle is meaningful: a stored, route-matched
   * lap that ranks() would accept if the flag were off. */
  canToggleIgnore: boolean;
  /** the route this ride is the reference of, or null */
  referenceOf: Route | null;
  sectorRows: SectorRowModel[];
  /** gate-indexed, index 0 null — RouteMapView's sectorColours contract */
  sectorColours: (string | null)[];
  free: FreeRideRecord | null;
}

export interface RideDetailDeps {
  result: RideResult | null;
  free: FreeRideRecord | null;
  routes: readonly Route[];
  /** lapValues(routeId, rideId) — history EXCLUDING this ride */
  laps: (routeId: string) => number[];
  /** sectorValues(routeId, index, rideId) — history EXCLUDING this ride */
  sectors: (routeId: string, index: number) => number[];
  /** ownLapBarredFromRanking(routeId, rideId) */
  barred: (routeId: string) => boolean;
}

/** ResultScreen.tsx:59-76 verbatim, plus the WP-H 'ignored' branch FIRST —
 * a rider's own exclusion is the most specific reason and reads as such. */
export function rankLineFor(
  r: { lapMovingS: number | null; estimated: boolean; ignored: boolean },
  hist: number[],
  barred: boolean,
): string {
  if (r.ignored) return 'not ranked — you excluded this ride from ranking';
  if (r.lapMovingS !== null) {
    if (barred) return 'no rank — this lap is excluded from the comparison';
    if (hist.length >= MIN_HISTORY) {
      const { pos, of } = positionAmong(r.lapMovingS, hist);
      return `P${pos} of ${of} on this route`;
    }
    return `${hist.length} rides of history — too few to rank`;
  }
  return r.estimated ? 'no time — an estimated lap never ranks' : 'no lap — a missed gate never ranks';
}

/** ResultScreen.tsx:182-192 verbatim. Empty history (the ignored case passes
 * `() => []`) yields all-null: nothing is coloured on too little history. */
export function sectorColoursFor(result: RideResult, hist: (index: number) => number[]): (string | null)[] {
  return [
    null,
    ...[...result.sectors].sort((a, b) => a.index - b.index).map((sec) =>
      sec.quality === 'clean' && sec.movingS !== null
        ? tierLineColour(tierFor(sec.movingS, hist(sec.index).filter((v) => v !== sec.movingS)))
        : null),
  ];
}

export function rideDetailFor(rideId: string, startedAtMs: number, d: RideDetailDeps): RideDetailModel {
  const referenceOf = d.routes.find((r) => r.referenceRideId === rideId) ?? null;
  const base = { rideId, startedAtMs, referenceOf, free: d.free };
  const res = d.result;
  if (res === null || res.routeId === null) {
    // WP-B precedence: a free-ride record wins over "nothing on file".
    const kind: RideDetailKind = d.free ? 'free' : 'none';
    return { ...base, kind, routeId: null, lapLabel: '–', lapTier: 'neutral', rankLine: '',
      ignored: false, canToggleIgnore: false, sectorRows: [], sectorColours: [] };
  }
  const routeId = res.routeId;
  const ignored = res.ignoredFromRanking === true;
  const estimated = res.lap.quality === 'estimated';
  const hist = d.laps(routeId);
  // While ignored, the ride's OWN verdicts go neutral too (D-013 in spirit:
  // a ride withdrawn from judging others is not judged either).
  const secHist = ignored ? () => [] : (i: number) => d.sectors(routeId, i);
  return {
    ...base,
    kind: 'route',
    routeId,
    lapLabel: lapCellLabel(res.lap.movingS, estimated, res.lap.rawS),
    lapTier: ignored ? 'neutral' : tierFor(res.lap.movingS, hist),
    rankLine: rankLineFor({ lapMovingS: res.lap.movingS, estimated, ignored }, hist, d.barred(routeId)),
    ignored,
    canToggleIgnore: ranks({ ...res, ignoredFromRanking: false }),
    sectorRows: buildSectorRows(res, secHist),
    sectorColours: sectorColoursFor(res, secHist),
  };
}
```

Note `lapTier` for a rankable, non-ignored lap keeps ResultScreen's `tierFor(lapMovingS, lapValues(routeId, rideId))` exactly (line 156).

### 4.9 NEW shared module — `app/src/store/wayFromRide.ts` (the WP-F §8 extraction)

Moves RecordScreen.tsx:76-114 and the bodies of 571-618 / 636-663 out of the screen, **verbatim in logic**, with the fs adapter injectable for tests. RecordScreen keeps only state + Alerts + phase/animation choreography.

```ts
/**
 * WP-H (WP-F §8 follow-on): the "this ride becomes the reference of a new
 * way" flow, shared by RecordScreen's STOP-step offer and the ride detail's
 * retroactive offer. Pure-ish: I/O goes through the given FsAdapter (default
 * the Expo one) and the catalog/ref stores; no React, no Alerts — callers
 * turn `{ ok:false, errors }` into UI. Bodies lifted from RecordScreen.tsx
 * (readRideFixes, namingDraftFor, existingLandmarkLabel, onNamingSave,
 * onAdjustSave) unchanged in behaviour.
 */
import type { FsAdapter } from '../storage/fsAdapter.ts';
import { createExpoFsAdapter } from '../storage/expoFsAdapter.ts';
import { decodeRideFile } from '../storage/jsonl.ts';
import { buildRefFromRideFixes, saveUserRef } from '../live/userRefs.ts';
import { seedGateChainages } from '../store/gateSeeding.ts';
import { addGateSet } from './catalog.ts';
import { currentCatalog, saveUserCatalog, userCatalog } from './catalogStore.ts';
import { buildWayCreationCatalog, draftWayCreation, type WayCreationDraft } from './wayCreation.ts';

export type RideFix = { lat: number; lon: number; [k: string]: unknown };

/** RecordScreen.tsx:79-88 — raw fixes (flags included) or null on any failure. */
export async function readRideFixes(rideId: string, fs: FsAdapter = createExpoFsAdapter()) {
  try {
    const text = await fs.readText(`rides/${rideId}.jsonl`);
    if (text === null) return null;
    return decodeRideFile(text).fixes;
  } catch {
    return null;
  }
}

/** RecordScreen.tsx:90-107 — null = no offer (short ride, unreadable, or a
 * repeat of an existing way in this direction: wayCreation.ts:137-160). */
export async function draftWayFromRide(
  rideId: string, startedAtMs: number, matchedRouteId: string | null, fs?: FsAdapter,
): Promise<WayCreationDraft | null> {
  const fixes = await readRideFixes(rideId, fs);
  if (fixes === null) return null;
  try {
    return draftWayCreation(currentCatalog(), {
      rideId, startedAtMs, fixes: fixes.map((f) => ({ lat: f.lat, lon: f.lon })), matchedRouteId,
    });
  } catch {
    return null;
  }
}

/** RecordScreen.tsx:109-114. */
export function existingLandmarkLabel(r: WayCreationDraft['start']): string | null {
  if (r.kind !== 'existing') return null;
  return currentCatalog().landmarks.find((l) => l.id === r.landmarkId)?.label ?? r.landmarkId;
}

export interface GateAdjustDraft { routeId: string; refLengthM: number; chainageM: number[] }

export type CreateWayOutcome =
  | { ok: true; routeId: string; adjust: GateAdjustDraft | null }
  | { ok: false; errors: string[] };

/** RecordScreen.tsx:571-611 (onNamingSave's try-body). `adjust` is non-null
 * exactly when a reference line + seed were built — the caller then offers
 * GateAdjustCard, as RecordScreen does (SETUP-UX §4). */
export async function createWayFromDraft(
  draft: WayCreationDraft, names: { start: string; end: string }, fs?: FsAdapter,
): Promise<CreateWayOutcome> {
  const fixes = await readRideFixes(draft.rideId, fs);
  const builtRef = fixes ? buildRefFromRideFixes(fixes) : null;
  const seed = builtRef ? { chainageM: seedGateChainages(builtRef.ref.length, builtRef.stopChainageM) } : undefined;
  const built = buildWayCreationCatalog(userCatalog(), draft, names, seed);
  const errs = await saveUserCatalog(built);
  if (errs.length > 0) return { ok: false, errors: errs };
  const routeId = `route:${draft.rideId}`;
  if (builtRef) await saveUserRef(routeId, builtRef.ref);
  return {
    ok: true,
    routeId,
    adjust: builtRef && seed ? { routeId, refLengthM: builtRef.ref.length, chainageM: seed.chainageM } : null,
  };
}

export type AdjustOutcome = { ok: true; moved: boolean } | { ok: false; errors: string[] };

/** RecordScreen.tsx:636-663 (onAdjustSave's decision + try-body). */
export async function saveAdjustedGates(a: GateAdjustDraft, chainageM: number[]): Promise<AdjustOutcome> {
  const moved = chainageM.some((v, i) => Math.abs(v - a.chainageM[i]) > 1e-6);
  if (!moved) return { ok: true, moved: false };
  const errs = await saveUserCatalog(
    addGateSet(userCatalog(), {
      routeId: a.routeId, version: 2, chainageM, createdAtMs: Date.now(), origin: 'geometric',
      note: 'adjusted at save (tap-then-nudge) from the seeded proposal',
    }),
  );
  return errs.length > 0 ? { ok: false, errors: errs } : { ok: true, moved: true };
}
```

The `try/catch → Alert` wrappers stay in the callers (RecordScreen already has them; the detail gets equivalents). The `.ts` import-extension style follows the file it sits next to (`store/*.ts` use bare or `.ts` — match `wayCreation.ts`'s own imports when writing it).

### 4.10 NEW screen — `app/src/ui/RideDetailScreen.tsx`

Props: `{ request: RideDetailRequest }`. Reads `useTheme`, `useSettings` (for `s.tower`), `useTabNav`. Header docblock: `/** WP-H: … */` summarising §1 and citing the ResultScreen/RidesScreen lines it absorbs.

**State**
```ts
const [tick, setTick] = useState(0);              // bump after ignore/create so the model re-reads the stores
const [fixes, setFixes] = useState<TrailPoint[] | null>(null); // true ridden trace (null until read / on failure)
const [busy, setBusy] = useState(false);
const [exporting, setExporting] = useState(false);
const [draft, setDraft] = useState<WayCreationDraft | null | 'pending'>('pending'); // §3.3 offer
const [naming, setNaming] = useState(false);      // WayNamingCard open
const [adjust, setAdjust] = useState<GateAdjustDraft | null>(null);
```

**Model** (memo on `[request.rideId, tick]`):
```ts
const model = rideDetailFor(request.rideId, request.startedAtMs, {
  result: getStoredResult(request.rideId),
  free: freeRideNear(freeRideResults(), request.startedAtMs),
  routes: currentCatalog().routes,
  laps: (routeId) => lapValues(routeId, request.rideId),
  sectors: (routeId, i) => sectorValues(routeId, i, request.rideId),
  barred: (routeId) => ownLapBarredFromRanking(routeId, request.rideId),
});
```
`metaFor` (Export/Delete need a `RideMeta`): `listRides()` once on mount → find by rideId (RidesScreen's own source); until it resolves, Export/Delete are disabled exactly as RidesScreen disables them when `!meta` (227, 236).

**Effects**
- On mount: `readRideFixes(request.rideId)` → `setFixes(fixes.map(f => ({lat: f.lat, lon: f.lon})))` (null on failure — the map then shows the route alone, as today). Decimate through `appendTrailPoint` (trailModel.ts) in a loop so the trace obeys WP-J's spacing rule rather than pushing every raw fix into a GeoJSON line.
- On mount (and after a successful create): `draftWayFromRide(request.rideId, request.startedAtMs, model.routeId)` → `setDraft(...)`; while `'pending'` the reference row is blank.

**Render** — a `ScrollView` like ResultScreen (padding 16, paddingBottom 40):

1. **Top bar**: `‹ BACK` (left, `closeRide()`), title `RIDE`, and a small `dateTimeLabel(startedAtMs)` right. Hardware back does the same via Shell (§4.2).
2. **Branch A — `model.kind === 'route'`** (the Result route board, ResultScreen.tsx:236-256, minus the toggle):
   - `routeLabel(routeId)` dim; big `lapLabel` in `tierColour(lapTier)` (copy the 44-52 helper); `rankLine` dim 12.5; when `model.referenceOf` → a dim line "reference ride of {routeLabel(referenceOf.id)}".
   - **Trace map (always shown)**: `<RouteMapView variant="browse" routeId={routeId} lat={null} lon={null} zoom={1} height={300} showRider={false} sectorColours={model.sectorColours} leadColour={colors.grey} trail={fixes ?? undefined} />`.
   - **SECTORS card**: `model.sectorRows` rendered with RidesScreen's `secRow/secPos/secTime/secAvg` styles + `chipColors(sec.tier, t).text` (RidesScreen.tsx:211-219 verbatim).
   - **ON THIS ROUTE card**: ResultScreen's `PbDetail` (97-139) lifted in as a local component with `routeId={routeId} lastRideId={rideId} showRanking={s.tower}` — its "last N on this route" list highlights this ride via `row.today`, then "personal best sectors".
3. **Branch B — `model.kind === 'free'`** (ResultScreen.tsx:206-230 verbatim): "FREE RIDE", date, "{n} gates crossed", per-sector raw rows, the isolation copy. Map: `<RouteMapView variant="browse" routeId={null} … trail={fixes ?? undefined} />` — needs §4.13 to render at all.
4. **Branch C — `model.kind === 'none'`**: "no route — recorded only" + "sector times not on file for this ride" (RidesScreen.tsx:222 copy), same trail-only map as B.
5. **ACTIONS card** (all branches unless noted), `pillRow` layout:
   - `Export GPX+` — RidesScreen.tsx:146-162 body verbatim (needs meta).
   - `Delete` — RidesScreen.tsx:115-141 body verbatim, then `closeRide()` instead of `refresh()` (RidesScreen remounts and refreshes itself; from `'post-stop'` the rider lands back on RECORD setup — same as discard-after-the-fact). The Alert text stays.
   - `Ignore in ranking` / `Count in ranking` — shown iff `model.canToggleIgnore`; `onPress`: `setBusy; const upd = await setIgnoredFromRanking(rideId, !model.ignored); if (upd) replaceRecorded(upd); setTick(t => t + 1)`. Style: outlined like `deleteBtn`; while `model.ignored` the header rank line already states the exclusion.
   - `Make this the reference of a new way` — shown iff `draft` is a `WayCreationDraft` and `model.referenceOf === null`; sets `naming = true`.
6. **Inline create-way flow** (below ACTIONS, mirrors RecordScreen.tsx:1000-1015):
   - `naming` → `<WayNamingCard startExistingLabel={existingLandmarkLabel(draft.start)} endExistingLabel={existingLandmarkLabel(draft.end)} loop={draft.loop} busy={busy} matchedRouteLabel={draft.matchedRouteId ? routeLabel(draft.matchedRouteId) : null} onSave={onNamingSave} onSkip={() => setNaming(false)} />`.
   - `onNamingSave(names)`: `setBusy; try { const out = await createWayFromDraft(draft, names); if (!out.ok) { Alert.alert('Could not create the way', out.errors.join('\n')); return; } setNaming(false); setDraft(null); setTick(t => t+1); if (out.adjust) setAdjust(out.adjust); } catch (e) { Alert.alert('Could not create the way', …) } finally { setBusy(false) }`.
   - `adjust !== null` → `<GateAdjustCard refLengthM initialChainageM busy onKeep={() => setAdjust(null)} onSave={onAdjustSave} />`; `onAdjustSave(ch)`: `const out = await saveAdjustedGates(adjust, ch); if (!out.ok) { Alert.alert('Could not save the gates', out.errors.join('\n')); return; } setAdjust(null)` (+ try/catch/busy as RecordScreen 636-663).
7. **Primary button**: `request.source === 'post-stop'` → `RECORD ANOTHER` = `closeRide()`; `'rides'` → `BACK TO RIDES` = `closeRide()`. (Both are just close — the label tells the rider where they'll land.)
8. **Footer**: the D-013 copy (ResultScreen.tsx:289-292) verbatim.

Styles: union of ResultScreen's `st` (h2/card/big/slimBtn/slimBtnText/freeSectorRow/pbDetail/hint/pbRow/pbPos/pbNum) and RidesScreen's detail styles (secRow/secPos/secTime/secAvg/pillRow/exportBtn/busy/exportText/deleteBtn/deleteText). D-013 discipline unchanged: rank/position never coloured; tier colours only on times and spans.

### 4.11 `app/src/ui/RecordScreen.tsx` — thin caller + new handoff

| Where | Edit |
|---|---|
| 49-53, 56-59 imports | drop what moved (`buildWayCreationCatalog`, `decodeRideFile`, `buildRefFromRideFixes`, `saveUserRef`, `seedGateChainages`, `addGateSet`, `userCatalog`, `createExpoFsAdapter` if no other use remains — `grep` before removing each); add `import { createWayFromDraft, draftWayFromRide, existingLandmarkLabel, saveAdjustedGates, type GateAdjustDraft } from '../store/wayFromRide';` |
| 76-114 | delete `readRideFixes`, `namingDraftFor`, `existingLandmarkLabel`; delete the local `interface GateAdjustDraft` (116-120) — imported now. |
| after 210 | `/** WP-H: the finished ride's identity, carried from onEnd to the reversed mark's onDone (a [] closure) so the handoff can open the ride detail for THIS ride. */`<br>`const endedRef = useRef<{ rideId: string; startedAtMs: number } | null>(null);` |
| 528 | `const draft = s ? await draftWayFromRide(s.rideId, s.startedAtMs, finalState.track) : null;` |
| before 546 (`setPhase('ending')`) | `endedRef.current = s ? { rideId: s.rideId, startedAtMs: s.startedAtMs } : null;` |
| 571-618 `onNamingSave` | body becomes: `const draft = namingRef.current; if (!draft) return; setBusy(true); try { const out = await createWayFromDraft(draft, names); if (!out.ok) { Alert.alert('Could not create the way', out.errors.join('\n')); return; } setNaming(null); if (out.adjust) setAdjust(out.adjust); else setShowAnim('rev'); } catch (e) { Alert.alert('Could not create the way', …); } finally { setBusy(false); }` — keep the existing comments (Part A/Part B/SETUP-UX §4) above the call. |
| 636-663 `onAdjustSave` | body becomes: `const a = adjustRef.current; if (!a) return; setBusy(true); try { const out = await saveAdjustedGates(a, chainageM); if (!out.ok) { Alert.alert('Could not save the gates', out.errors.join('\n')); return; } setAdjust(null); setShowAnim('rev'); } catch … finally …` (the `!moved` early-return now lives inside `saveAdjustedGates` and comes back as `{ok:true, moved:false}` — same exits). |
| 1017-1023 | `onDone={() => { setShowAnim(null); setPhase('setup'); const ended = endedRef.current; endedRef.current = null; if (ended) tabNav.openRide({ rideId: ended.rideId, source: 'post-stop', startedAtMs: ended.startedAtMs }); }}` — with no session id (should not happen for a real ride) the screen simply stays on RECORD setup. Update the 986-989 comment ("handing off to Result" → "opening the ride detail (WP-H)"). |
| 498, 513, 694, 704 comments | "Result" → "the ride detail" where they describe the handoff (`grep -n "Result" src/ui/RecordScreen.tsx` — comment-only edits). |

### 4.12 `app/src/ui/RidesScreen.tsx` — list only

| Where | Edit |
|---|---|
| 9-22 imports | drop `Alert`? (no — keep, `refresh` still alerts), drop `deleteRide, exportGpxPlus` (keep `listRides`), `removeStoredResult`, `dropRecorded`, `buildSectorRows`, `sectorValues`, `chipColors`, `gpxBaseName, saveGpx`; add `import { useTabNav } from './tabNav';` |
| 24-36 | `fmtWhen`/`fmtDur` move to RideDetailScreen (Delete's Alert uses them). |
| 42-43 | drop `exporting`, `expandedId`. |
| 115-162 | delete `onDelete`, `onExport`. |
| 181-246 renderItem | row head `onPress={() => tabNav.openRide({ rideId: item.rideId, source: 'rides', startedAtMs: item.startMs })}`; chevron `›`; delete the `{expanded ? … : null}` block; `result`/`meta` lookups go. |
| 302-325 styles | delete `detail…deleteText`. |
| header comment (1-8) | "…expands into its own sector splits, with export/delete demoted into that expanded detail" → "…and opens the full-screen ride detail (WP-H) on tap — sector splits, trace, export/delete live there." |

### 4.13 `app/src/ui/routeMapView.tsx` + `routeMapGeo.ts` — trail-only browse

- `routeMapGeo.ts`, after `routeBounds` (167): `/** WP-H: bounds of a ridden trail, for a browse map with no route asset (unmatched or free ride). null for < 2 points. */ export function trailBounds(pts: readonly {lat:number;lon:number}[]): LonLatBoundsBox | null`.
- `routeMapView.tsx:422-423`: `const hasTrail = !!props.trail && props.trail.length > 1; const riderOnly = !gatesOnly && !asset; if (riderOnly && !showRider && !hasTrail) return null;` (comment: WP-H — a browse surface with a ridden trail but no asset is the ride-detail trace view, not "nothing to show").
- `routeMapView.tsx:456`: `const bounds = gatesOnly ? allGatesBounds(…) : asset ? routeBounds(asset) : hasTrail ? trailBounds(props.trail!) : null;`
- Everything else (trail source always mounted, sector spans null without an asset, OFF ROUTE badge suppressed for riderOnly) already behaves correctly for this case. PNG rung: untouched (no trail there today; falls back as before).

### 4.14 Retire `app/src/ui/ResultScreen.tsx`

`git mv app/src/ui/ResultScreen.tsx safe_to_delete/ResultScreen.tsx` (repo ground rule: never delete). Add a two-line note at its top: `// WP-H (2026-09-03): superseded by src/ui/RideDetailScreen.tsx + rideDetailModel.ts; RESULT tab dropped (Nathan, Q4).` Nothing imports it after §4.2.

`rideHistoryModel.ts`'s `buildPbRows`/`PbRowModel` stay (tested; §3.4 flags their future home).

## 5. Test plan

### 5.1 NEW `app/tests/ridedetail_suite.ts` (pure; add to `run.ts` after `ridehistory_suite`)

Build `RideResult` fixtures inline (as `ridehistory_suite.ts` does).

1. `ridedetail: rideDetailFor — no result, no free → kind 'none', empty rows, canToggleIgnore false`.
2. `ridedetail: rideDetailFor — result with routeId null but a free record → kind 'free', free carried through`.
3. `ridedetail: rideDetailFor — clean ranked lap, ≥MIN_HISTORY → rankLine "P_ of _ on this route", lapTier from tierFor, sectorRows length = sectors, sectorColours[0] === null and length = sectors+1`.
4. `ridedetail: rideDetailFor — ignoredFromRanking true → ignored, rankLine starts "not ranked — you excluded", lapTier 'neutral', every sectorRow.tier 'neutral' or 'est', every sectorColours entry null, canToggleIgnore true`.
5. `ridedetail: rideDetailFor — estimated lap → canToggleIgnore false (nothing to ignore), rankLine "no time — an estimated lap never ranks"`.
6. `ridedetail: rideDetailFor — tripwireDemoted → barred → "no rank — this lap is excluded from the comparison", canToggleIgnore false`.
7. `ridedetail: rideDetailFor — referenceOf resolves the route whose referenceRideId === rideId; null otherwise`.
8. `ridedetail: rankLineFor — ignored wins over every other branch (ignored + barred + ≥MIN_HISTORY → the "you excluded" line)`.
9. `ridedetail: sectorColoursFor — mirrors ResultScreen (clean+movingS coloured via tierLineColour, interrupted/estimated/missed null, own value filtered from its history)`.

### 5.2 Additions to `app/tests/resultsstore_suite.ts` (store + lastRide coherence)

10. `resultsstore: setIgnoredFromRanking(true) → getStoredResult has ignoredFromRanking true, ranks() false, file results/<id>.json re-written with the flag (read back through the memory fs after flushResultWrites)`.
11. `resultsstore: setIgnoredFromRanking(false) → the field is ABSENT (not false) in memory and on disk`.
12. `resultsstore: setIgnoredFromRanking on an unknown id → null, no write`.
13. `resultsstore: ignored ride leaves the comparison window — after ignore + replaceRecorded, lapValues(routeId) no longer contains its lap and rankedCountFor drops by one; after un-ignore + replaceRecorded, both restore` (drives `colourModel` through `recordedResults`; same dynamic-import pattern the suite already uses).
14. `resultsstore: initRideHistory skips an ignored sidecar (recorded does not contain it after boot), and replaceRecorded re-adds it on un-ignore`.

### 5.3 Additions to `app/tests/store_suite.ts` (or a small block in `ridedetail_suite`)

15. `results: ranks() — ignoredFromRanking true → false; undefined/false → unchanged verdicts for clean/interrupted/estimated/missed/tripwire` (table-driven, one assert per row).

### 5.4 Additions to `app/tests/waycreation_suite.ts` (the extraction)

16. `wayFromRide: draftWayFromRide returns null when the ride file is missing (memory fs), and equals draftWayCreation(currentCatalog(), …) when present` (write a small JSONL with `encodeHeader/encodeFix/encodeEnd` as resultsstore_suite does).
17. `wayFromRide: createWayFromDraft — happy path against a memory-fs catalog store: returns ok, routeId 'route:<rideId>', adjust non-null with 5 chainages, and userCatalog() contains the route with referenceRideId === rideId` (requires `initCatalogStore(memoryFs)` + `initUserRefs(memoryFs)` first — same seams `catalogstore_suite.ts` uses; if the seed-JSON loader hook is needed, copy the `registerHooks` shim).
18. `wayFromRide: saveAdjustedGates — unmoved → {ok:true, moved:false} and no new gate set; moved → version 2 gate set present`.

### 5.5 Free-ride match

19. `freerides: freeRideNear — exact id hit wins; nearest-within-tolerance otherwise; null beyond tolerance; null on empty` (pure; goes in `store_suite.ts` next to any existing freeRides cases, else `ridedetail_suite`).

### 5.6 Map geometry

20. `routemapgeo: trailBounds — null for <2 points; min/max over a 3-point trail` (in `routemapgeo_suite.ts`).

### 5.7 Not headlessly testable (say so)

The screen's layout, the mount-swap/overlay behaviour in Shell, hardware-back ordering, the post-STOP handoff timing, and the map rendering (MapLibre rung) are device checks. Manual checklist for the execution session's device pass: (a) STOP a route ride → reversed mark → detail opens with the big lap, trace on the map, sector rows; BACK → RECORD setup; (b) STOP a free ride → free board with the trail-only map; (c) RIDES → tap a row → detail; Delete → back on RIDES with the row gone; (d) Ignore → rank line changes, RIDES row rank becomes `–`, another ride on the same route shows a different "of N"; un-ignore restores; (e) a ride that never got the naming card → "Make this the reference…" → name → gate card → KEEP → button gone, "reference ride of …" shown, ROUTES lists the new way; (f) tab bar hidden while the detail is up, back on close; five tabs, no RESULT.

## 6. Verification commands

```bash
cd app
node --experimental-strip-types tests/run.ts      # expect: previous count + 20 new, 0 fail, 3 skip
./node_modules/.bin/tsc --noEmit                   # exit 0
grep -rn "'result'" src --include=*.ts --include=*.tsx   # expect: no hits
grep -rn "ResultScreen" src App.tsx                       # expect: no hits
grep -n "tabNav.go('result')" src/ui/RecordScreen.tsx     # expect: no hits
```

## 7. Files touched

**New**
- `app/src/ui/RideDetailScreen.tsx` (§4.10)
- `app/src/ui/rideDetailModel.ts` (§4.8)
- `app/src/store/wayFromRide.ts` (§4.9)
- `app/tests/ridedetail_suite.ts` (§5.1)

**Edited**
- `app/App.tsx` (§4.2), `app/src/ui/tabNav.tsx` (§4.1)
- `app/src/store/types.ts` (§4.3), `app/src/store/results.ts` (§4.4), `app/src/store/resultsStore.ts` (§4.5), `app/src/store/freeRides.ts` (§4.7)
- `app/src/ui/lastRide.ts` (§4.6), `app/src/ui/RecordScreen.tsx` (§4.11), `app/src/ui/RidesScreen.tsx` (§4.12)
- `app/src/ui/routeMapView.tsx`, `app/src/ui/routeMapGeo.ts` (§4.13)
- `app/tests/run.ts`, `app/tests/resultsstore_suite.ts`, `app/tests/waycreation_suite.ts`, `app/tests/store_suite.ts`, `app/tests/routemapgeo_suite.ts` (§5)

**Moved** — `app/src/ui/ResultScreen.tsx` → `safe_to_delete/ResultScreen.tsx` (§4.14)

**Not touched** — `wayCreation.ts` (seam already complete since WP-F), `rideHistoryModel.ts`, `colourModel.ts`, `derive.ts`, `gateAdjustCard.tsx`, `wayNamingCard.tsx`, `settings.tsx`, `package.json` (no new dependency), `core/`.

Docs after landing (not app source): `cycles/virgin-cycle1/QUESTIONS-FOR-NATHAN.md` (mark the nav-model item resolved by this brief), `README.md` status table; STATE.md/IDEAS.md mentions of the RESULT tab are left to the usual post-landing doc pass.

## 8. Open questions / risks

1. **Promote-to-reference for an EXISTING route.** `Route.referenceRideId`'s own docblock anticipates "promoting a later clean lap". WP-H ships only the create-a-new-way seam (§3.3). Is replacing an existing user route's reference with a later ride wanted? **Default: out of WP-H** — it is coupled to WP-I's chainage handling (a new reference line invalidates gate chainages and every stored result's fromChainageM/toChainageM on that route). If Nathan wants it, it is its own WP after WP-I. Genuinely his call; the button label in §3.3 is written so the shipped behaviour is not mistaken for promotion.
2. **Ignore semantics for the ride's OWN colours.** This brief makes an ignored ride's own sector tiers/spans neutral as well (§3.5). The alternative — keep colouring it against the others while it no longer counts for them — is defensible ("I still want to see how it did") but asymmetric. **Default: neutral**; one-line change in `rideDetailFor` (`secHist`) if reversed.
3. **Cross-route Personal Bests overview.** Dropped with the RESULT tab (§3.4). **Default: not rebuilt in WP-H**; candidate follow-on: one `pbLabel · nOnFile` line per route on ROUTES (`buildPbRows` is already there and tested).
4. **Free-ride tolerance match** (§4.7, 10 s). Two free rides started within 10 s of each other cannot happen (a session must end before another starts), so nearest-within-tolerance is unambiguous in practice; the constant exists only to bound clock skew. Low risk.
5. **RIDES scroll position resets on close** (mount-swap, §3.1 point 4). Accepted; if it annoys on a long history, RidesScreen can persist its FlatList offset in a module-level variable later — not now.
6. **Refactor risk in RecordScreen** (§4.11): behaviour must be identical (WP-F landed and device-verified two days ago). The extraction is line-for-line; the execution session should diff the old bodies against `wayFromRide.ts` before deleting them and re-run the §5.7(e) device check on RECORD's own STOP-step path as well.
7. **`useTabNav` inside RideDetailScreen while mounted by Shell** — fine (Shell provides it); but RideDetailScreen must NOT be rendered outside `TabNavProvider` (e.g. in a future Demo tab preview) without a provider, or `useTabNav` throws by design (tabNav.tsx:27-33).

## 9. Follow-on hooks (not in scope)

- **WP-I**: upgrades `GateAdjustCard` in place; the detail's inline create-way flow (§4.10 item 6) picks it up automatically. If WP-I wants a chainage override on the detail's OWN trace map, add it as a prop to `RouteMapView` then — the detail passes none today.
- **Promotion** (§8.1) would slot into the ACTIONS card next to the create-way button, reusing `readRideFixes` + `buildRefFromRideFixes` + `saveUserRef(route.refLineId, …)` plus whatever chainage migration WP-I settles.
- **ROUTES PB line** (§8.3): `buildPbRows(routeIds, allTimeBestLapS, rankedCountFor)` is ready to call.
