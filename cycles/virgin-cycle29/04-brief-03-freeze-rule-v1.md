# Brief 03 — FREEZE RULE: a ride's colours, tier and rank are what they were when it was ridden (virgin-cycle29)

Written 2026-10-09 by the Plan tier (Fable) from Nathan's binding answer (amendment block in `03-fable-ruling.md`, Q4 a-e).
Tree expected: brief 01 applied (02 may or may not be). Baseline after 01: 972 tests, 0 fail, tsc clean (after 02: 979).
Read `EXECUTOR-RULES.md`, `/CLAUDE.md`, then this brief.

## 0. Rules (binding)
- JS-only, OTA-safe. No native, no config, no dependency. No git/EAS/OTA. Delete nothing.
- STOP-ON-AMBIGUITY -> `cycles/virgin-cycle29/exec-report-03.md`, verbatim, stop.
- Rider-facing text: NO visible string added/removed/moved. Allow-list byte-identical. (The strings "ignored in ranking",
  "Not ranked", "P.. of .. on this way", "Count in ranking" exist already and are untouched.)
- Nothing negative shown. Strip-only TypeScript.
- Do NOT touch: `GateAdjustScreen.tsx`, `routeFromRide.ts`, `derive.ts`, `migrations.ts`, `RESULT_SCHEMA_VERSION`,
  `ranks()`'s body, `ghostsFor`/`rankingPoolFor`/`lapValues`/`sectorValues`/`allTimeBestLapS` (they stay the NOW predicate for
  live/trend/results), `trendPanelModel.ts`, `resultsPlotModel.ts`, `towerModel.ts`, `rankingRevealModel.ts`, `selfRaceModel.ts`,
  `live/towerSource.ts`, `ReplayScreen.tsx` (it inherits the change through `priorWindowFor`).

## 1. The rule (Nathan, 2026-10-09)
A ride B reflects the ranking state at the moment it was ridden. New rides never recolour B. Ignoring/counting a ride A
later does not change B when A was in B's pool at B's start; A's own card changes at once; A leaves only FUTURE pools
(rides ridden after the ignore, live ghosts/selfs, trend plot, results). Gate edits: out of scope here (brief 05 scoping).

## 2. Verified today (do not re-verify)
- `rideDetailModel.ts:122-133`: `hist = d.laps(wayId)` = `lapValues(wayId, rideId)` = `ghostsFor` = last 9 `ranks()` rides
  of the way by start time, EXCLUDING only the ride itself, i.e. INCLUDING later rides. Feed cards (`RidesScreen.tsx:176-184`)
  and the detail page (`RideDetailScreen.tsx:150-158`) both inject that. `buildRideRows` (`rideHistoryModel.ts:178`) ranks with
  `laps(wayId, m.rideId)` = the same NOW window. The detail's "ON THIS ROUTE" list uses `rankingPoolFor(wayId, lastRideId)`
  (`RideDetailScreen.tsx:83`, NOW pool).
- `colourModel.ts:85-89` `priorWindowFor(wayId, rideId, beforeMs)`: `rankedFor(wayId)` (= `ranks()`-filtered, ascending)
  `.filter(r => r.rideId !== rideId && r.startedAtMs < beforeMs).slice(-WINDOW_PREV)`. Used by `ReplayScreen.tsx:64` only.
  `replay_suite.ts:364-391` pins it (incl. `uIgnored`, ignored with NO timestamp, excluded).
- `store/results.ts:93-98` `ranks(r)`; `store/types.ts:132` `ignoredFromRanking?: boolean`; `resultsStore.ts:267-273`
  `setIgnoredFromRanking` drops the field on count, sets `true` on ignore, saves through `saveResult` (validated by
  `isValidRideResult`, `resultsStore.ts:73-89`, which checks nothing about optional fields). `rideActions.ts:57-66`
  `toggleIgnoreRide` -> `setIgnoredFromRanking` -> `replaceRecorded(upd)` (in-memory mirror `lastRide.ts:313`).
- `sectorHistory(results, index)` (`results.ts:141`) builds a sector's values from any result list.

## 3. Edits
### 3.1 `app/src/store/types.ts` — after line 132 (`ignoredFromRanking?: boolean;`) add
```
  /** virgin-cycle29 03 (Nathan 2026-10-09, freeze rule): epoch ms of the LAST time the rider ignored this ride.
   * Set together with ignoredFromRanking by resultsStore.setIgnoredFromRanking; both are dropped on "Count in
   * ranking". A ride ignored BEFORE this field existed has none and counts as ignored since the beginning.
   * Read only by results.rankedAsOf (the as-of-then pool): a ride B keeps counting A when A.ignoredAtMs > B.startedAtMs.
   * Single value = "last ignore wins" (count-then-re-ignore cannot represent two intervals; accepted). */
  ignoredAtMs?: number;
```
### 3.2 `app/src/store/results.ts` — after `ranks()` (line 98) add
```
/** virgin-cycle29 03: ranks() AS OF the moment `judged` was ridden. The derivation facts (quality, scoredS, tripwire) are
 * read as stored: they only change on a re-derive. The rider's ignore is time-aware: an ignore stamped AFTER the judged
 * ride's start did not exist when it was ridden, so the ride still counts for `judged`. `judged.gateSetVersion` is
 * accepted and unread for now (brief 05, gate edits, adds the clause here without touching callers). */
export function rankedAsOf(r: RideResult, judged: { startedAtMs: number; gateSetVersion?: number }): boolean {
  if (r.lap.quality === 'estimated' || r.lap.quality === 'missed') return false;
  if (r.tripwireDemoted) return false;
  if (r.ignoredFromRanking === true && !(typeof r.ignoredAtMs === 'number' && r.ignoredAtMs > judged.startedAtMs)) return false;
  return scoredS(r.lap) !== null;
}
```
### 3.3 `app/src/store/resultsStore.ts`
- `isValidRideResult` (line 73-89): before `return true;` add
  `if (v.ignoredAtMs !== undefined && !(typeof v.ignoredAtMs === 'number' && Number.isFinite(v.ignoredAtMs))) return false;`
- `setIgnoredFromRanking` (267-273): signature `(rideId: string, ignored: boolean, nowMs: number = Date.now())`;
  `const { ignoredFromRanking: _drop, ignoredAtMs: _dropAt, ...rest } = cur;`
  `const next: RideResult = ignored ? { ...rest, ignoredFromRanking: true, ignoredAtMs: nowMs } : rest;`
  Doc comment: add the two sentences from 3.1 (timestamp stamped on ignore, both dropped on count).
### 3.4 `app/src/ui/colourModel.ts`
- Import `rankedAsOf` from `'../store/results.ts'` (line 19).
- Add after `rankedFor` (line 68):
```
/** virgin-cycle29 03: every result of a way, ascending by start, unfiltered - the input rankedAsOf judges per ride. */
function resultsFor(wayId: string): RideResult[] {
  return [...GHOSTS, ...recordedResults()].filter((r) => r.wayId === wayId).sort((a, b) => a.startedAtMs - b.startedAtMs);
}
```
- Replace `priorWindowFor` (85-89) body and doc:
```
/** The comparison window AS IT STOOD when `rideId` was ridden (cycle14 replay; virgin-cycle29 03 made it the ONE
 * frozen pool the feed card, the detail page, its "ON THIS ROUTE" list and REPLAY share): results of the way started
 * before `beforeMs`, this ride excluded by id, that rankedAsOf() accepts for a ride started at `beforeMs` - so a later
 * ride never appears and a later "Ignore in ranking" never removes a ride that counted on the day. Last WINDOW_PREV. */
export function priorWindowFor(wayId: string, rideId: string, beforeMs: number): RideResult[] {
  const own = resultsFor(wayId).find((r) => r.rideId === rideId);
  const judged = { startedAtMs: beforeMs, gateSetVersion: own?.derivedBy.gateSetVersion };
  return resultsFor(wayId)
    .filter((r) => r.rideId !== rideId && r.startedAtMs < beforeMs && rankedAsOf(r, judged))
    .slice(-WINDOW_PREV);
}
/** virgin-cycle29 03: lapValues over the frozen window. */
export function priorLapValues(wayId: string, rideId: string, beforeMs: number): number[] {
  return priorWindowFor(wayId, rideId, beforeMs).map((r) => scoredS(r.lap) as number);
}
/** virgin-cycle29 03: sectorValues over the frozen window (store's own sectorHistory, as sectorValues). */
export function priorSectorValues(wayId: string, index: number, rideId: string, beforeMs: number): number[] {
  return sectorHistory(priorWindowFor(wayId, rideId, beforeMs), index);
}
/** virgin-cycle29 03: the detail page's "ON THIS ROUTE" pool: the frozen window plus the ride itself (when stored),
 * ascending by start - the same shape rankingPoolFor gives, judged as of then, so the list and the P-rank agree. */
export function priorPoolFor(wayId: string, rideId: string, beforeMs: number): RideResult[] {
  const own = resultsFor(wayId).find((r) => r.rideId === rideId);
  const pool = priorWindowFor(wayId, rideId, beforeMs);
  return (own ? [...pool, own] : pool).sort((a, b) => a.startedAtMs - b.startedAtMs);
}
```
  (`rankedFor`/`ghostsFor`/`rankingPoolFor` etc. untouched; update the `MIN_HISTORY` doc comment lines 47-52: the
  sentence "once later rides exist, re-opening the reference ride's own RESULT judges it against the window ... CAN pick up a
  purple/green/yellow verdict then" is no longer true for stored surfaces: replace with "virgin-cycle29 03: stored
  surfaces judge against the frozen prior window, so the reference ride stays 'neutral' / P1 of 1 for good".)
### 3.5 `app/src/ui/rideHistoryModel.ts`
- `buildRideRows` param (line 127): `laps: (wayId: string, excl: string, beforeMs: number) => number[],`
- Line 178: `const hist = laps(wayId, m.rideId, result.startedAtMs);`
- Doc (114-116): "the caller passes priorLapValues(routeId, rideId, startedAtMs) (virgin-cycle29 03: frozen window)".
  Existing tests pass 0/1-arg lambdas: still type-correct.
### 3.6 `app/src/ui/RidesScreen.tsx`
- Line 25 import: `import { ownLapBarredFromRanking, priorLapValues, priorSectorValues } from './colourModel';`
  (drop `lapValues`, `sectorValues` if no other use remains in the file - grep).
- Line 165: `(wayId, excl, beforeMs) => priorLapValues(wayId, excl, beforeMs),`
- Lines 181-182: `laps: (wayId) => priorLapValues(wayId, rideId, startMs),` / `sectors: (wayId, i) => priorSectorValues(wayId, i, rideId, startMs),`
  (`startMs` is the `detailFor(rideId, startMs)` parameter already in scope at 177.)
### 3.7 `app/src/ui/RideDetailScreen.tsx`
- Line 37 import: replace `lapValues, ... rankingPoolFor, sectorValues` with `priorLapValues, priorPoolFor, priorSectorValues`
  (keep `ownLapBarredFromRanking`, `type UiTier`).
- `PbDetail` (78-83): add prop `startedAtMs: number`; line 83 ->
  `const detail = buildPbDetail(priorPoolFor(wayId, lastRideId ?? '', startedAtMs), lastRideId);` (when `lastRideId` is null
  the own ride is simply absent; `buildPbDetail` already handles a null today row). Update the doc comment: "virgin-cycle29 03:
  the pool is the ride's FROZEN window + itself (priorPoolFor), so this list and the P-rank above never disagree".
- Line 564: `<PbDetail wayId={...} lastRideId={request.rideId} startedAtMs={request.startedAtMs} todayTier={model.lapTier} t={t} />`
- Lines 156-157: `laps: (wayId) => priorLapValues(wayId, request.rideId, request.startedAtMs),` /
  `sectors: (wayId, i) => priorSectorValues(wayId, i, request.rideId, request.startedAtMs),`

## 4. Tests
### 4.1 `app/tests/replay_suite.ts` 364-391: must pass UNCHANGED (uIgnored has no timestamp -> excluded).
### 4.2 New cases in `app/tests/live_colour_suite.ts` (it already imports colourModel dynamically and has `replaceRecorded`/
`resetRecordedForTests` wiring; add the imports `priorWindowFor, priorLapValues, priorSectorValues, priorPoolFor` to its line
32-33 destructuring, and `rankedAsOf` from `../src/store/results.ts`). Use a local `makeResult` like `replay_suite.ts:43-60`
(copy it; sectors `[{ index: 1, fromChainageM: 0, toChainageM: 1, rawS: 100, movingS: 100, quality: 'clean' }]` where needed).
1. `rankedAsOf`: clean+time -> true; estimated/missed -> false; tripwireDemoted -> false; ignored without timestamp -> false
   for any judged; ignored at 5000 judged at 4000 -> true; judged at 5000 -> false (strict); judged at 6000 -> false.
2. Freeze by time: 12 clean rides at 1000..12000; `priorWindowFor(w,'u6',6000)` = u1..u5 (as replay); add u13 later ->
   `priorLapValues(w,'u6',6000)` unchanged.
3. Freeze by ignore: ignore u3 with `ignoredAtMs: 7000` (replaceRecorded a copy with both fields): `priorWindowFor(w,'u6',6000)`
   STILL contains u3; `priorWindowFor(w,'u9',9000)` does NOT; `ghostsFor(w)` does NOT (NOW pool unchanged behaviour);
   `rankingPoolFor(w, 'u12')` does NOT.
4. Count again: replace u3 without either field -> both windows contain u3.
5. `priorSectorValues(w, 1, 'u6', 6000)` has 5 values and ignores u7+; `priorPoolFor(w,'u6',6000)` = u1..u6 ascending;
   `priorPoolFor(w,'zz',6000)` (unknown ride) = u1..u5.
6. Ride 1: `priorWindowFor(w,'u1',1000)` = [] and `priorPoolFor(w,'u1',1000)` = [u1].
### 4.3 `app/tests/resultsstore_suite.ts`: one case: seed a result via `saveResult` (memory fs, see the suite's existing
setup), `setIgnoredFromRanking(id, true, 123456)` -> stored result has `ignoredFromRanking === true` and
`ignoredAtMs === 123456` and round-trips through `isValidRideResult`; `(id, false)` -> neither field present
(`'ignoredAtMs' in r === false`). Plus: `isValidRideResult({...valid, ignoredAtMs: 'x'})` is false, `{...valid, ignoredAtMs: 5}` true.
### 4.4 `app/tests/ridehistory_suite.ts`: one case: `buildRideRows` passes `result.startedAtMs` as the third `laps` argument
(record the args in the lambda and assert).
### 4.5 Source pins (add to 4.2's file or `ridedetail_suite.ts`): `RidesScreen.tsx` and `RideDetailScreen.tsx` contain no
`lapValues(` / `sectorValues(` / `rankingPoolFor(` call; `RideDetailScreen.tsx` contains `priorPoolFor(wayId, lastRideId ?? '', startedAtMs)`;
`ReplayScreen.tsx` still contains `priorWindowFor(wayId, rideId, startedAtMs)`.
Expected: +9 tests over the baseline you start from (972 -> 981, or 979 -> 988 after brief 02), 0 fail.

## 5. Acceptance
1. Touched: `store/types.ts`, `store/results.ts`, `store/resultsStore.ts`, `ui/colourModel.ts`, `ui/rideHistoryModel.ts`,
   `ui/RidesScreen.tsx`, `ui/RideDetailScreen.tsx`, `tests/live_colour_suite.ts`, `tests/resultsstore_suite.ts`,
   `tests/ridehistory_suite.ts` (+ `ridedetail_suite.ts` if used for pins). Nothing else.
2. Suite zero FAIL. 3. tsc exit 0 (`exec-03-tsc.log`). 4. Allow-list byte-identical. 5. `grep -n "rankedAsOf" app/src` shows
   exactly `results.ts` (definition) and `colourModel.ts` (one call). 6. `RESULT_SCHEMA_VERSION` still 2; `migrations.ts` untouched.

## 6. On-device check (Nathan; OPEN-ITEMS line)
"virgin-cycle29 03 freeze: (1) open an old activity; note its colours and P-rank; ride (or REPLAY-save nothing) - after the
next new ride on that way the old card and page are unchanged. (2) Ignore an OLDER ride A from its card menu: A goes
neutral/'Not ranked'; every card ridden BEFORE the ignore keeps its colours and rank; the RECORD start screen's ghost count
drops by one. (3) 'Count in ranking' on A: everything as before the ignore. (4) On a ride's detail page the P-rank line and
the 'ON THIS ROUTE' list agree on the pool size."

## 7. Visible text
None. Allow-list byte-identical.

## 8. Report
`cycles/virgin-cycle29/exec-report-03.md`. For the inspector: (a) `ranks()` body unchanged and still used by every NOW
pool; (b) `priorWindowFor` is the only caller of `rankedAsOf`; (c) `setIgnoredFromRanking(false)` drops both fields;
(d) no caller of `buildRideRows` outside RidesScreen; (e) the replay pins pass untouched.
