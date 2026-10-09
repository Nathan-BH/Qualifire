# Brief 04 executor report (virgin-cycle28) — PASS

All steps 1-5 done in order; every anchor matched exactly once (python assert count == 1). No stops.

## Files changed (mine)
- app/src/store/waySpecs.ts: added ORIGINAL_SPEC_LABEL = 'Original'.
- app/src/store/routeCreation.ts: import + relabel of sole plain own way in existingRouteId branch.
- app/src/ui/recordFlow.ts: showWhichWay, toggleNewWay, newWayOn.
- app/src/ui/RecordScreen.tsx: steps 4a-4l (state, 3 resets, newOn/pickedWay, newWayPill, block condition, spec rows, flat row, pill in both layouts). NEW_ID/Pressable/Text/styles in scope; newOn declared before newWayPill.
- app/tests/recordflow_suite.ts: import + 1 test. app/tests/routecreation_suite.ts: import, 1 assertion, 1 new test.

## Results
- Baseline: 978 tests, 975 pass, 0 fail, 3 skip; tsc exit 0.
- After: 980 tests, 977 pass (baseline + 2), 0 fail, 3 skip; tsc exit 0 (log 12-brief-04-tsc.log; tests log 12-brief-04-tests.log; before log 12-brief-04-tsc-before.log).
- No UNLISTED/STALE ui-strings lines. ui-strings.allow.json untouched by me (its pre-existing diff, 8 lines, is brief 03's entry).
- git diff empty for app/src/live, app/src/location, routeNamingCard.tsx, routeFromRide.ts, app/modules, app.json, app.config.js, package.json, eas.json.
- Static checks only; native code not rendered.

## Deviations
- Report named 11-... per dispatch (rules said 12-...); logs named per brief (12-...).

## Allow-list entries: none added/edited/removed.

## Inspector focus
As in brief: newOn before use, only the pill sets newWayRouteId non-null, one-way route renders flat `<way> | new`, picked way still reaches startTracking unchanged.

## OPEN-ITEMS line
"'Original' is provisional (Nathan 4e): revisit after device use; constant ORIGINAL_SPEC_LABEL in app/src/store/waySpecs.ts."
