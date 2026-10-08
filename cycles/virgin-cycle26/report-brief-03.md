# Report: brief 03 (gates on retraced ground), Sonnet execute

Status: DONE, all acceptance checks passed. No escalation, no deviation.

## Files and hunks (brief 03 only)
- app/core/src/projection.ts: 1 inserted hunk (overlapChainages, after passVertex, before projectRideOffline doc). The other two hunks in the diff are briefs 02/05/06.
- app/src/store/gateSeeding.ts: 5 hunks (OVERLAP_CLEAR_M, doc line, signature, early return, clear).
- app/src/live/userRefs.ts: 3 hunks (import, BuiltRideRef.overlapChainageM, stop block + return).
- app/src/store/routeFromRide.ts: 4 diff hunks (2 are brief 03's call sites; the rest brief 01/etc.).
- app/tests/gateseeding_suite.ts: 1 import edit + 1 appended block (3 tests). Brief 04 appends after it.
- app/tests/userrefs_suite.ts: 1 inserted block (2 tests) before the degenerate-rides test.
demoModel.ts, run.ts, ui-strings.allow.json untouched by me (allow.json diff is brief 01's single entry).

## Tests: 943 baseline -> 948 (948 tests: 945 pass, 0 fail, 3 skip). +5.
## BEFORE/AFTER
- Seeding: with 3rd arg present but clear() ignoring it: FAIL "got 16,400,800,1200,1584, want 16,560,800,1040,1584"; after 4.2(c)(d)(e): PASS.
- Stop test with old nearestOnSegments block (overlap returned): FAIL "stop chainage 2035.13...: it was attributed to the RETURN copy"; after 4.3(c): PASS.
- overlapChainages, buildRefFromRideFixes-overlap, fully-retraced/2-arg tests: PASS; knot test (userrefs_suite) and demo_suite pin unedited, passing.
## tsc
cd app && ./node_modules/.bin/tsc --noEmit exit 0 (log 06-brief-03-tsc.log is empty = clean; exit code captured directly).
## Greps
seedGateChainages( sites: routeFromRide.ts x2 three-arg (:118, :241), demoModel.ts:180 two-arg, gateSeeding.ts definition. nearestOnSegments absent from userRefs.ts. gateSeeding.ts still import-free.
## Allow-list: no entries added/edited/removed. No new strings.
## For Inspect: mutate clear() without overlap clause -> [16,400,800,1200,1584]; old global stop search -> ~2035 (brief says ~2050); overlapChainages skip uses <= gapM before distance test; stop loop k only advances.
## OPEN-ITEMS: hand the coordinator the replacement text from 05-plan.md section 8 (not edited by me).
