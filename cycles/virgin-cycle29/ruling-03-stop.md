# ruling-03-stop — brief 03 freeze rule, stop on "u6 still has u3" (Plan tier, Fable, 2026-10-10)

Read: exec-report-03.md, 04-brief-03-freeze-rule.md, 03-fable-ruling.md Q4, EXECUTOR-RULES.md, and the code at the
uncommitted tree (ui/lastRide.ts, store/results.ts, store/resultsStore.ts, ui/colourModel.ts, every reader below).
Pre-amendment brief preserved as `04-brief-03-freeze-rule-v1.md`; the brief itself carries an "Amendment (stop-03)" block.

## 1. Diagnosis (confirmed, executor was right)
`recorded` (ui/lastRide.ts:45) is by contract the NOW comparison window: `pushRecorded` (:218) refuses estimated laps,
`initRideHistory` (:258, :289) hydrates only `ranks(r)`, `replaceRecorded` (:313-316) re-adds only `ranks(r)`. Three
existing tests PIN that an ignored ride is absent from `recordedResults()` (resultsstore_suite.ts:645, :649, :665) and
two more pin that a free ride never enters it (live_colour_suite.ts:406, :432). The brief's `resultsFor` read
`[...GHOSTS, ...recordedResults()]`, so a later-ignored ride could never reach `rankedAsOf`. Brief error, not executor error.

## 2. Ruling: option (c) — a separate read path for the frozen pool only
`colourModel.resultsFor(wayId)` becomes the de-duplicated union of GHOSTS + `recordedResults()` +
`resultsStore.storedResultsForWay(wayId)`, keyed by rideId, STORE object winning (it carries `ignoredFromRanking`/
`ignoredAtMs`). Only `priorWindowFor`/`priorPoolFor` read it. `lastRide.ts` is NOT touched. No NOW reader changes.
- Why not (a) (keep ignored rides in `recorded`): breaks the pinned contract of `recorded` and forces a semantic audit of
  every NOW reader (ledger §4) for a benefit the store already provides.
- Why not (b) (store only): loses this session's headless results (`rememberRide(state)` without meta -> `session:` ids,
  live_colour_suite relies on them) and the shipped GHOSTS; also a ride finished milliseconds ago is in both anyway.
- Hydration at boot: `resultsStore.initResultsStore` (resultsStore.ts:184-189) puts EVERY valid stored result into its
  map with NO ranks() filter — ignored results included; `initRideHistory` calls it first thing. The freeze therefore
  survives a restart with ZERO new boot code (pinned by the new hydration test, §5.3).
- Mutation path: `rideActions.toggleIgnoreRide` -> `setIgnoredFromRanking` -> `saveResult` -> `store.set` (resultsStore.ts:237)
  BEFORE the async file write, then `replaceRecorded`. The frozen path sees the timestamp synchronously, same tick as the NOW
  window drops the ride. Delete: `removeStoredResult` + `dropRecorded` remove from both sources -> the ride leaves every pool.
- No import cycle: resultsStore imports nothing from ui/; lastRide.ts (which colourModel already imports) imports resultsStore.
- Memory: none (the map already exists). Perf: `storedResultsForWay` copies+sorts the whole store per call (O(M log M),
  M = all stored results); `buildRideRows` calls `priorLapValues` once per ride, so the feed costs O(N·M log M) per
  render — for N=M=500 that is ~2.5M comparisons, sub-10 ms on a phone, and it is memoised in RidesScreen (`useMemo`).
  `priorWindowFor` must call `resultsFor` ONCE (not twice as in the brief text). Accepted; revisit only if measured.

## 3. Semantics check against Nathan's Q4
- A ignored at T_ig: ride B with B.start < T_ig keeps A (A in store with ignoredAtMs > B.start -> rankedAsOf true). OK.
- Ride C with C.start > T_ig loses A. Live ghosts/selfs/trend/results use ranks() -> lose A at once. A's own card:
  rideDetailModel reads A's own flag (:120/:136) -> neutral at once. OK.
- "Count in ranking": both fields dropped in the store, A re-enters `recorded` -> every pool has A again. OK.
- Pre-brief ignored rides (no timestamp): rankedAsOf false for every judged -> replay pin `uIgnored` holds. OK.

## 4. Reader ledger (every reader of recordedResults() / resultsFor() / priorWindowFor at the current tree)
| file:line | reads | semantics | if ignored rides were present in `recorded` |
|---|---|---|---|
| ui/colourModel.ts:62 `rankedFor` | GHOSTS+recorded, `ranks()` | NOW | safe (filters) — feeds ghostsFor, rankedCountFor, rankingPoolFor, lapValues, sectorValues, liveTierFor |
| ui/colourModel.ts:69 `resultsFor` (brief 03) | GHOSTS+recorded, unfiltered | AS-OF (rankedAsOf per ride) | THIS is the one that needs ignored rides -> ruled: union with the store |
| ui/colourModel.ts:140 `ownLapBarredFromRanking` | find own, `!ranks(own)` | NOW | would flip: an ignored ride would read "barred" (today: absent -> false). Not changed; detail reads the flag itself |
| ui/colourModel.ts:226 `allTimeBestLapS` | `ranks()` | NOW | safe (filters) — tower PB dot, rankingRevealModel:76 |
| ui/colourModel.ts:87 `priorWindowFor` | resultsFor + rankedAsOf | AS-OF | callers: ReplayScreen.tsx:64 (selfs), priorLapValues (RidesScreen:172/188, RideDetailScreen:157), priorSectorValues (RidesScreen:189, RideDetailScreen:158), priorPoolFor (RideDetailScreen:84) |
| live/towerSource.ts:44 | lapValues -> ghostsFor | NOW | safe |
| ui/rankingRevealModel.ts:75-76 | ghostsFor, allTimeBestLapS | NOW | safe |
| ui/RecordScreen.tsx:158,1141,1185,1227 | ghostsFor / sectorValues (ghost count, live sector colours, self window key) | NOW | safe |
| ui/selfRaceModel.ts:293 | ghostsFor | NOW (live selfs) | safe |
| ui/CatalogDetailScreen.tsx:74 | rankedCountFor | NOW | safe |
| ui/rideHistoryModel.ts:177 | `ranks(result)` on the OWN stored result + `laps(...)` (now priorLapValues) | own=NOW flag, history=AS-OF | correct per Q4 (own card changes at once) |
| ui/rideDetailModel.ts:120-136 | own result flag | NOW on own | correct per Q4 |
| ui/trendPanelModel.ts:38 (own `resultsFor` PARAM, RoutesScreen.tsx:73 passes storedResultsForWay) | store, plotWindow -> ranks() | NOW | unrelated namesake; untouched |
| ui/resultsPlotModel.ts / towerModel.ts / demoModel.ts | tower()/plotWindow() over ranks() | NOW | untouched, safe |
| tests: resultsstore_suite.ts:113,164,189,211,394,461,641-665; live_colour_suite.ts:406,432; results_cache_suite.ts | pin `recorded` = ranks()-only | NOW | option (a) would break 645/649/665 — decisive against (a) |
Conclusion: exactly one reader (colourModel `resultsFor`) needs ignored rides; it gets them from the store. Everything else keeps byte-identical semantics.

## 5. Executor instructions (do in this order; STOP-ON-AMBIGUITY still applies; report to exec-report-03.md, overwrite)
Keep EVERY hunk already in the tree (types.ts, results.ts, resultsStore.ts, colourModel.ts, rideHistoryModel.ts, RidesScreen.tsx,
RideDetailScreen.tsx, the three test suites). Revert nothing. `safe_to_delete/ed03a-c.py` stay where they are.
### 5.1 `app/src/ui/colourModel.ts` (3 edits)
a. After line 22 `import { recordedResults } from './lastRide.ts';` add
   `import { storedResultsForWay } from '../store/resultsStore.ts';`
b. Replace the whole `resultsFor` function (doc comment + body, currently lines 67-70) with:
```
/** virgin-cycle29 03 (ruling-03-stop): every result of a way, ascending by start, UNFILTERED - rankedAsOf judges per
 * ride. Union of the shipped ghosts, this session's NOW window (`recorded`) and the persistent store, de-duplicated by
 * rideId with the STORE object winning: `recorded` (ui/lastRide.ts) only ever holds ranks()-passing results, so a ride
 * ignored later lives in the store alone, carrying its ignoredAtMs. resultsStore.initResultsStore hydrates ignored
 * results too, so a frozen pool survives a restart. Read ONLY by priorWindowFor/priorPoolFor; every NOW pool keeps
 * reading rankedFor. */
function resultsFor(wayId: string): RideResult[] {
  const byId = new Map<string, RideResult>();
  for (const r of GHOSTS) if (r.wayId === wayId) byId.set(r.rideId, r);
  for (const r of recordedResults()) if (r.wayId === wayId) byId.set(r.rideId, r);
  for (const r of storedResultsForWay(wayId)) byId.set(r.rideId, r);
  return [...byId.values()].sort((a, b) => a.startedAtMs - b.startedAtMs);
}
```
c. In `priorWindowFor` call `resultsFor` once: body becomes
```
  const all = resultsFor(wayId);
  const own = all.find((r) => r.rideId === rideId);
  const judged = { startedAtMs: beforeMs, gateSetVersion: own?.derivedBy.gateSetVersion };
  return all
    .filter((r) => r.rideId !== rideId && r.startedAtMs < beforeMs && rankedAsOf(r, judged))
    .slice(-WINDOW_PREV);
```
   `priorLapValues`, `priorSectorValues`, `priorPoolFor` unchanged.
### 5.2 `app/tests/live_colour_suite.ts` — rewrite tests 3 and 4 (lines ~823-842) to seed the ignore the way production does
(store first via `saveResult`, then `replaceRecorded` — mirrors `rideActions.toggleIgnoreRide`). `b10ResultsStore` is already
imported at line 49; `saveResult` works with the store unarmed (the map is set, the file write is a no-op); `resetRecordedForTests`
already resets the store. Both tests become `async`.
```
test('virgin-cycle29 03: freeze by ignore — an ignore after the ride leaves its window alone, future pools lose it', async () => {
  const w = 'Freeze:ignore';
  fzSeed(w, 12);
  const ig = fzResult('u3', w, 3000, 503, { ignoredFromRanking: true, ignoredAtMs: 7000 });
  await b10ResultsStore.saveResult(ig);   // the store keeps the ignored ride (with its timestamp) ...
  b10ReplaceRecorded(ig);                 // ... the NOW window drops it (lastRide WP-H contract, unchanged)
  assert(!recordedResults().some((r) => r.rideId === 'u3'), 'NOW mirror `recorded` drops the ignored ride (lastRide pin holds)');
  assert(priorWindowFor(w, 'u6', 6000).some((r) => r.rideId === 'u3'), 'u6 (ridden before the ignore) still has u3');
  assert(!priorWindowFor(w, 'u9', 9000).some((r) => r.rideId === 'u3'), 'u9 (ridden after the ignore) does not have u3');
  assert(!ghostsFor(w).some((r) => r.rideId === 'u3'), 'NOW pool ghostsFor drops u3');
  assert(!rankingPoolFor(w, 'u12').some((r) => r.rideId === 'u3'), 'NOW pool rankingPoolFor drops u3');
  resetRecordedForTests();
});

test('virgin-cycle29 03: count again — dropping both fields restores u3 to both windows', async () => {
  const w = 'Freeze:count';
  fzSeed(w, 12);
  const ig = fzResult('u3', w, 3000, 503, { ignoredFromRanking: true, ignoredAtMs: 7000 });
  await b10ResultsStore.saveResult(ig);
  b10ReplaceRecorded(ig);
  const counted = fzResult('u3', w, 3000, 503);
  await b10ResultsStore.saveResult(counted);
  b10ReplaceRecorded(counted);
  assert(priorWindowFor(w, 'u6', 6000).some((r) => r.rideId === 'u3'), 'u6 window has u3');
  assert(priorWindowFor(w, 'u9', 9000).some((r) => r.rideId === 'u3'), 'u9 window has u3');
  assert(ghostsFor(w).some((r) => r.rideId === 'u3'), 'NOW pool has u3 again');
  resetRecordedForTests();
});
```
Also extend the source-pins test (line ~862): add
`assert(/import \{ storedResultsForWay \} from '\.\.\/store\/resultsStore\.ts';/.test(rd2('colourModel.ts')), 'colourModel reads the store for the frozen pool');`
and `assert(!rd2('lastRide.ts').includes('ignoredAtMs'), 'lastRide.ts untouched by brief 03');`.
### 5.3 `app/tests/resultsstore_suite.ts` — ONE new test, appended right after the brief-4.3 test (line ~671 block), the restart/hydration pin
(`priorWindowFor`/`ghostsFor` imported dynamically — the suite's JSON shim is already registered; `makeResult(id, way, startMs, movingS)` is the suite's own helper):
```
test('virgin-cycle29 03 (ruling-03-stop): the frozen window survives a restart — an ignored ride stays in the pools of rides ridden before the ignore', async () => {
  lastRide.resetRecordedForTests();
  const { priorWindowFor, ghostsFor } = await import('../src/ui/colourModel.ts');
  const w = 'FreezeBoot:w';
  const fs = createMemoryFsAdapter();
  await resultsStore.initResultsStore(fs);
  for (let i = 1; i <= 4; i++) await resultsStore.saveResult(makeResult(`b${i}`, w, 1000 * i, 500 + i));
  await resultsStore.setIgnoredFromRanking('b1', true, 2500);   // ignored between b2 (2000) and b3 (3000)
  await resultsStore.flushResultWrites();

  resultsStore.resetResultsStoreForTests();   // simulated app restart
  lastRide.resetRecordedForTests();
  await lastRide.initRideHistory(fs);
  assert(!lastRide.recordedResults().some((x) => x.rideId === 'b1'), 'NOW window never hydrates an ignored ride (WP-H pin)');
  assert(resultsStore.getStoredResult('b1')?.ignoredAtMs === 2500, 'the store rehydrates ignoredAtMs from disk');
  assert(priorWindowFor(w, 'b2', 2000).some((r) => r.rideId === 'b1'), 'b2 (ridden before the ignore) still counts b1 after a restart');
  assert(!priorWindowFor(w, 'b3', 3000).some((r) => r.rideId === 'b1'), 'b3 (ridden after the ignore) does not');
  assert(!ghostsFor(w).some((r) => r.rideId === 'b1'), 'the NOW pool does not');
  lastRide.resetRecordedForTests();
});
```
### 5.4 Run and check
- `cd app && node --experimental-strip-types tests/run.ts`: expected 1001 tests, 0 FAIL, 3 skip (executor's own baseline 991 + 9 brief + 1 hydration).
  A different total that is still zero FAIL is reported, not a stop.
- `./node_modules/.bin/tsc --noEmit` (timeout_ms 180000) -> `exec-03-tsc.log`, exit 0.
- `grep -n "storedResultsForWay" app/src/ui/colourModel.ts` -> exactly 2 lines (import, one call in resultsFor).
- `grep -n "resultsFor(" app/src/ui/colourModel.ts` -> definition + exactly 2 calls (priorWindowFor, priorPoolFor).
- `GIT_OPTIONAL_LOCKS=0 git diff --stat app/src/ui/lastRide.ts` -> empty (untouched).
- `grep -n "rankedAsOf" app/src` -> results.ts (def), colourModel.ts (import + one call), types.ts (doc comment) — the types.ts doc hit is accepted.
- Allow-list md5 unchanged (e69dff5cfb8fe15def0d2534466e4708). replay_suite 364-391 and resultsstore_suite 641-669 pass UNTOUCHED.
### 5.5 Report (`exec-report-03.md`, overwrite the STOPPED file; keep its stop section as history at the bottom)
Add for the inspector: (f) `resultsFor` is read only by `priorWindowFor`/`priorPoolFor`; (g) `lastRide.ts` byte-identical to HEAD;
(h) the WP-H pins (resultsstore_suite 641-669) pass unchanged; (i) the hydration test proves the freeze survives a restart with no boot change.
OPEN-ITEMS line for the coordinator: the brief's §6 text plus "(5) kill and relaunch the app after step (2): the older cards still keep their colours and rank".

## 6. Correction (stop-03b), 2026-10-10 — "count again" NOW-pool assertion
My line `assert(ghostsFor(w).some((r) => r.rideId === 'u3'), 'NOW pool has u3 again');` cannot hold: with 12 rides `ghostsFor` is the
last WINDOW_PREV = 9 (u4..u12), u3 is outside the NOW window even when counted. Executor was right. Exact replacement (line ~848 of
live_colour_suite.ts): `assert(rankedCountFor(w) === 12, \`NOW count back to 12, got ${rankedCountFor(w)}\`);`
`rankedCountFor` (colourModel.ts:113, `rankedFor(wayId).length`, GHOSTS + `recorded` under `ranks()`, UNWINDOWED, already in the suite's
import at line 32) is 11 while u3 is ignored (`replaceRecorded` drops it) and 12 once counted again — non-vacuous. For symmetry add to
the "freeze by ignore" test, right after the `ghostsFor` assert (line ~832):
`assert(rankedCountFor(w) === 11, \`NOW count drops to 11, got ${rankedCountFor(w)}\`);` Test total stays 1001.
