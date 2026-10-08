# Report brief 01 (Sonnet execute) -- DONE after Fable ruling (RULINGS.md)

RESOLVED: recordflow_suite.ts:634 changed to `(LOOP_ID as string) !== NEW` per ruling. tsc --noEmit exit 0 (empty log); suite 931 tests: 928 pass, 0 fail, 3 skip.

(Original stop below, kept for history.)


## STOPPED
`cd app && ./node_modules/.bin/tsc --noEmit` exits 2 (log: cycles/virgin-cycle26/06-brief-01-tsc.log):
`tests/recordflow_suite.ts(634,33): error TS2367: This comparison appears to be unintentional because the types '"~loop"' and '"~new"' have no overlap.`
Cause: brief 4.3 test line `assert(LOOP_ID === '~loop' && LOOP_ID !== NEW, 'sentinels must differ');` -- LOOP_ID is a literal-typed const and NEW is `const NEW = '~new'`. Brief text defect, not anticipated; not ruled on by me. Fable should decide the fix (e.g. compare as `string`).

## Done (all else per brief)
- recordFlow.ts +31 (LOOP_ID, resolveGoingTo, routeForEndpoints), still no imports.
- RecordScreen.tsx: 6 hunks. defaultWay.ts (routeTitle + wayLabelIn + comment line), routeFromRide.ts, catalogDetailModel.ts, catalogMapModel.ts, RidesScreen.tsx, RideDetailScreen.tsx: import + body line each.
- Tests added: recordflow_suite (3: resolveGoingTo, routeForEndpoints, RECORD source pin), wayspec_suite (routeTitle), catalogdetail_suite (loop title).
- ui-strings.allow.json: one entry appended (src/ui/RecordScreen.tsx|text|loop, since 2026-10-08, by "Sonnet execute, virgin-cycle26 brief 01"); diff = 8 inserted lines (one multi-line JSON entry), nothing else.

## Evidence
- Baseline: 918 tests, 915 pass, 0 fail, 3 skip.
- BEFORE: recordflow tests only -> SyntaxError: module '../src/ui/recordFlow.ts' does not provide an export named 'LOOP_ID'. After 4.1/4.2 without allow entry: FAIL ui-strings UNLISTED RecordScreen.tsx:1612 [text] "loop" (only new non-brief-02 failure). catalogdetail test alone: FAIL "loop route label: Park Loop -> Park Loop".
- AFTER: 931 tests: 928 pass, 0 fail, 3 skip (brief 02's tests concurrently landed and pass by then; earlier intermediate runs showed brief 02 failures = concurrent noise).
- tsc: exit 2, single error above.
- grep for `} -> ${` leftovers: only catalogMerge:105, catalogDeleteActions x3, demoModel 188/329, defaultWay (inside routeTitle) -- as the brief allows. routeTitle( call sites: 7 as expected.

## Deviations
Output file name: wrote report-brief-01.md as the coordinator asked (brief says 06-brief-01-executor-report.md). Nothing else.
Note for brief 03: routeFromRide.ts gained one import line (anchors shift by +1).
