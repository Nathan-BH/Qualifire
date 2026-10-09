# exec-report-03 - DONE (2026-10-10)

Applied: brief 03 v2 (amendment stop-03 + stop-03b). Count-again test now asserts rankedCountFor(w) === 12; freeze-by-ignore test also asserts rankedCountFor(w) === 11.
Tests: baseline 991/988/0/3 -> 1001 tests, 998 pass, 0 FAIL, 3 skip. tsc --noEmit exit 0, exec-03-tsc.log empty (0 bytes).
Allow-list md5 e69dff5cfb8fe15def0d2534466e4708 unchanged. lastRide.ts and GateAdjustScreen.tsx: git diff --stat empty.
Greps: storedResultsForWay in colourModel.ts = 2 lines (import, one call in resultsFor); resultsFor( = definition + 2 calls (priorWindowFor, priorPoolFor); rankedAsOf = results.ts (def), colourModel.ts (import + one call + doc comments), types.ts (doc).
Files changed by brief 03: store/types.ts, store/results.ts, store/resultsStore.ts, ui/colourModel.ts, ui/rideHistoryModel.ts, ui/RidesScreen.tsx, ui/RideDetailScreen.tsx, tests/live_colour_suite.ts, tests/resultsstore_suite.ts, tests/ridehistory_suite.ts. Native code not compiled/rendered (static checks only).
Inspector: (f) resultsFor read only by priorWindowFor/priorPoolFor; (g) lastRide.ts identical to HEAD; (h) WP-H pins resultsstore_suite 641-669 and replay pins pass untouched; (i) hydration test proves the freeze survives a restart.
OPEN-ITEMS line: "virgin-cycle29 03 freeze: (1) open an old activity; note its colours and P-rank; after the next new ride on that way the old card and page are unchanged. (2) Ignore an OLDER ride A from its card menu: A goes neutral/'Not ranked'; every card ridden BEFORE the ignore keeps its colours and rank; the RECORD start screen's ghost count drops by one. (3) 'Count in ranking' on A: everything as before the ignore. (4) On a ride's detail page the P-rank line and the 'ON THIS ROUTE' list agree on the pool size. (5) Kill and relaunch the app after step (2): the older cards still keep their colours and rank."

---- history below ----
# exec-report-03 - STOPPED AGAIN (2026-10-10, after ruling-03-stop)

Container restart check: device_bash sees the repo; all earlier hunks present. Ruling 5.1-5.3 is ALREADY APPLIED in the tree (found applied when I ran my edit script: colourModel resultsFor union + single call, live_colour tests 3-4 async rewrite, 2 extra source pins, resultsstore hydration test). My ed03d.py aborted on an anchor mismatch before writing anything because of that; nothing was applied twice (each test title occurs once).

Results: 1001 tests, 997 pass, 1 FAIL, 3 skip (count matches the expected 1001). tsc --noEmit: exit 0 (exec-03-tsc.log). Allow-list md5 e69dff5cfb8fe15def0d2534466e4708 unchanged. lastRide.ts: git diff --stat empty.

STOP (ruling text error): FAIL `virgin-cycle29 03: count again - dropping both fields restores u3 to both windows - NOW pool has u3 again`.
The ruled assertion `assert(ghostsFor(w).some((r) => r.rideId === 'u3'), ...)` cannot hold: fzSeed makes 12 rides and ghostsFor returns the last WINDOW_PREV=9 (u4..u12), so u3 (oldest) is outside the NOW window even when counted. The frozen-window assertions in that test pass. Likely fix (NOT applied, not mine to rule): assert via `rankedCountFor(w) === 12` or `rankingPoolFor`/`recordedResults().some(u3)` instead. Same ruling text otherwise verified.

Other checks not yet run because of the stop: grep counts (storedResultsForWay in colourModel: 2 lines expected; seen 2 incl. import+call).
Files changed by brief 03: store/types.ts, store/results.ts, store/resultsStore.ts, ui/colourModel.ts, ui/rideHistoryModel.ts, ui/RidesScreen.tsx, ui/RideDetailScreen.tsx, tests/live_colour_suite.ts, resultsstore_suite.ts, ridehistory_suite.ts.

---- history: first stop (ignored rides absent from recordedResults) was resolved by ruling-03-stop option (c). ----

# exec-report-03 - STOPPED (Sonnet execute, 2026-10-10)

Status: STOPPED on an undecided call. Brief 03 edits 3.1-3.7 and tests 4.2-4.5 were applied as written; one new test FAILS for a design reason the brief did not anticipate. tsc NOT run (stopped before).

## Stop reason (verbatim facts)
New test "virgin-cycle29 03: freeze by ignore" fails: `u6 (ridden before the ignore) still has u3`.
Cause: priorWindowFor/resultsFor read `[...GHOSTS, ...recordedResults()]`, and `recordedResults()` (lastRide.ts `recorded`) NEVER holds an ignored ride:
- `lastRide.ts:313-316` `replaceRecorded(r)`: `dropRecorded(r.rideId); if (ranks(r)) recorded.push(r);` - an ignored ride (ranks() false) is dropped from the in-memory list.
- `lastRide.ts:258` and `:289` (initRideHistory): only `ranks(r)` results are hydrated at boot.
So in production AND in the brief's own test 3, a ride ignored later (even with ignoredAtMs > B.start) is absent from resultsFor(), and rankedAsOf can never accept it. The freeze-by-ignore rule (Nathan Q4) cannot work through colourModel alone. Brief section 0 lists lastRide.ts neither as touchable nor as forbidden; section 5.1 "Nothing else" forbids touching it.
Needed ruling (for Fable): how should resultsFor() obtain ignored-but-once-counted rides? Options I see (NOT chosen): (a) change lastRide.replaceRecorded/initRideHistory to keep ignored rides in `recorded` and rely on every NOW reader using ranks() (rankedFor already filters with ranks(), but other readers of recordedResults() must be audited); (b) have resultsFor() also read resultsStore's stored results (store.get / all stored) instead of recordedResults(). Either touches a file outside the brief's list.

## Files changed (all uncommitted, by this brief)
app/src/store/types.ts (ignoredAtMs), app/src/store/results.ts (rankedAsOf), app/src/store/resultsStore.ts (validator + setIgnoredFromRanking nowMs), app/src/ui/colourModel.ts (import rankedAsOf, resultsFor, priorWindowFor rewrite, priorLapValues/priorSectorValues/priorPoolFor, MIN_HISTORY doc), app/src/ui/rideHistoryModel.ts (laps 3rd arg + doc), app/src/ui/RidesScreen.tsx, app/src/ui/RideDetailScreen.tsx (PbDetail startedAtMs, prior* calls), app/tests/live_colour_suite.ts (+8 tests: 6 freeze cases + 1 pins... see counts), app/tests/resultsstore_suite.ts (+1), app/tests/ridehistory_suite.ts (+1). Helper scripts in safe_to_delete/ed03a-c.py.
Hunks in shared files RidesScreen.tsx: import line, buildRideRows lambda, detailFor laps/sectors.

## Tests
Before: 991 tests, 988 pass, 0 fail, 3 skip. After: 1000 tests, 996 pass, 1 FAIL, 3 skip (+9 as the brief expects; the 1 fail is the stop reason).
Note: brief 4.2 case 1 (rankedAsOf) uses ESTIMATED lap built via extra {lap:{...}}; passes.
Allow-list md5: before e69dff5cfb8fe15def0d2534466e4708, after see below (unchanged expected).
rankedAsOf grep: results.ts (def), colourModel.ts (import + one call), types.ts doc comment.

## Inspector notes
If the coordinator wants the failing state reverted, the changes are exactly the files above. Other 8 new tests pass. replay_suite pins pass untouched (no fail there).
after md5 (see above)

## Post-inspect fix (coordinator, 2026-10-10): inspector BLOCKER (inspect-report-03.md)
priorPoolFor put the judged ride into its own "ON THIS ROUTE" list even when it cannot rank (estimated / missed / demoted / ignored): an
ignored ride showed P4 under a "Not ranked" header. Fixed in `app/src/ui/colourModel.ts` priorPoolFor: `(own && ranks(own) ? [...pool, own] : pool)`.
Test added to `app/tests/live_colour_suite.ts` (ignored own, estimated own, ranked own). Mutation-checked: reverting the fix makes it FAIL.
After: 1002 tests, 999 pass, 0 fail, 3 skip; tsc exit 0 (fix-03-blocker-tsc.log empty); allow-list md5 e69dff5cfb8fe15def0d2534466e4708 unchanged.
