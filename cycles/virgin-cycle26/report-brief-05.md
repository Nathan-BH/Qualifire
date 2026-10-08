# Report, brief 05 (Sonnet executor)

Status: DONE, no escalations, no STOP. Native code not applicable; static + suite checks only.

## Files touched by this brief (hunks, via git diff -U0)
- app/core/src/projection.ts: PASS_AMBIGUITY_M block, doc comment, `within` param, dMax band, 2 corridor args (brief 02 hunks also in file; 3 hunks total in file)
- app/core/src/live.ts: 2 one-line hunks (o.corridor at anchor and re-acq)
- app/src/ui/recordFlow.ts: NEW_ID + pickedLoop appended (still import-free)
- app/src/ui/RidesScreen.tsx: 1 import + 1 body line (2 hunks)
- app/src/ui/RideDetailScreen.tsx: 1 import + 1 body line (2 hunks)
- app/tests/live_suite.ts: import line edit + 5 tests appended
- app/tests/recordflow_suite.ts: import edit + routeTitle import + 2 tests
- app/tests/catalogmap_suite.ts: 1 test; app/tests/routecreation_suite.ts: 1 test
- Not touched: RecordScreen.tsx, location/index.ts, ui-strings.allow.json (no change by me), run.ts.

## Counts
Baseline 931 tests: 928 pass, 0 fail, 3 skip. BEFORE (new tests, stubs, no fixes): 940 tests: 932 pass, 5 fail, 3 skip (brief said "928 pass" there: arithmetic slip, 932 is right). AFTER: 940 tests: 937 pass, 0 fail, 3 skip. tsc --noEmit exit 0 (log 06-brief-05-tsc.log).

## BEFORE FAIL lines (cycles/virgin-cycle26/05-before.log), all 5 as predicted
- pickedLoop: `new → new (blank-install first ride, logged verbatim) is NOT a loop`
- RIDES/detail: `RidesScreen.tsx: exactly one pick-event title through pickedLoop`
- passVertex: `(500,42) [0,3000] nearS 0: ch 500 dist 42 -- want the return street (ch ~1544, 2 m)`
- live re-acq: `y=42: first on-route fix at x = -1 (want >= 570 ...)`
- LiveEngine: `gate events []`
The other 4 new tests pass before and after, as the brief predicts.

## Greps
`pick.from === pick.to` in app/src: none. `pickedLoop(`: definition + 2 call sites. recordFlow.ts imports: none. `near.dist + CORRIDOR_M`: none. passVertex: definition + 4 call sites each ending in corridor arg. `LOOP_ID` in RecordScreen: 3 lines.

## Deviations
None. Pre-fix backups of the 4 edited test files copied to safe_to_delete/ (gitignored).
