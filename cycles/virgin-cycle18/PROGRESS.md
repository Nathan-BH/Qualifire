# virgin-cycle18 execution PROGRESS (ledger; coordinator updates after every step)
Started 2026-09-30 00:06 local. Resume message scheduled 03:15 local in the same chat.
Rules: no commits/builds/publishes; never delete (mv to safe_to_delete/); stop-on-ambiguity -> fresh Fable; one Opus inspect per group.

## Groups (order)
- A: 02 -> 04 -> Opus inspect A   (JS)
- B: 05 -> 06 -> Opus inspect B   (JS; 06 needs 05; A first)
- C: 01 -> 03 -> Opus inspect C   (native, after JS chain)

## Status  (queued | in-progress | landed | stopped | inspected-PASS | findings-open)
| step | status | evidence (test line / tsc exit / files) |
| --- | --- | --- |
| 02 exec | landed (not yet inspected) | tests 743: 740 pass/0 fail/3 skip; tsc exit 0; files: resultsStore.ts, routeFromRide.ts, GateAdjustScreen.tsx, routecreation_suite.ts, resultsstore_suite.ts |
| 04 exec | landed (not yet inspected); Fable ruled both flags ACCEPT, no fixes (settings.tsx initRideHistory default OK; ridehomes fixture ms/s = brief erratum; 'plain ride' comments stay) | tests 747: 744 pass/0 fail/3 skip; tsc exit 0; new: rideHomes.ts, ridehomes_suite.ts; edited: routeNamingCard, RecordScreen, RideDetailScreen, DemoScreen, ResultsScreen, RidesScreen, lastRide, App.tsx, routeFromRide, routecreation_suite, run.ts |
| A inspect | inspected-PASS after 04b fix (Opus re-inspect: 748 tests/745 pass/0 fail/3 skip, tsc 0). Earlier findings: Opus PASS on tests (747/744/0 fail) + tsc 0, but F1 MEDIUM (reference rides w/o stored result invisible in RESULTS; rideHomes.ts settleRideHomes step 2) + F2 LOW (onAdjustSave handlers RecordScreen ~836 / RideDetailScreen ~332 stale lastRide.recorded). Fable ruled both FIX; fixer brief saved as 04b-fixer-inspect-findings.md; Sonnet fixer LANDED (tests 748: 745 pass/0 fail/3 skip; tsc 0; edited routeFromRide.ts, rideHomes.ts, RecordScreen.tsx, RideDetailScreen.tsx, routecreation_suite.ts) -> Opus re-inspect A dispatched | see OVERNIGHT-REPORT.md 'Group A inspection' |
| 05 exec | landed (not yet inspected); Fable ruled REQUIRE FIX: amended decision 6 = route that already pointed at kept place survives, re-pointed one folds into it; both-repointed -> earlier in catalog order survives; fixer 05b-fixer-m2.md LANDED (tests 768: 765 pass/0 fail/3 skip; tsc 0; catalogMerge.ts + catalogmerge_suite.ts) | tests 767: 764 pass/0 fail/3 skip; tsc 0; new: placeSearch.ts, catalogMerge.ts, placePicker.tsx, placesearch_suite.ts, catalogmerge_suite.ts; edited: routeCreation.ts, routeFromRide.ts, routeNamingCard.tsx, RecordScreen.tsx, RideDetailScreen.tsx, catalogDetailModel.ts, CatalogDetailScreen.tsx, routecreation_suite.ts, catalogdetail_suite.ts, run.ts |
| 06 exec | landed (not yet inspected) | tests 768: 765 pass/0 fail/3 skip (no new tests; brief specifies none); tsc 0; edited: placeSearch.ts, routeFromRide.ts, routeNamingCard.tsx, RecordScreen.tsx, RideDetailScreen.tsx |
| B inspect | findings-open: 05+05b PASS; 06 F1 MEDIUM (brief file truncated -> 3 intended tests missing: ps5, rc6, rc7), F2 MEDIUM (scored ride can end with two homes via 'not <way>?' -> SAVE AS FREE RIDE; needs design ruling), F3-F7 LOW (sport scope in applyEndpointChoices, settle step 1 vs reference rides, loop label, stuck end choice, PlaceBody key). Fable: FIX F1,F2(option b: drop stored result before markRideFree),F3,F5,F6,F7; DEFER F4 (-> OPEN-ITEMS: reference ride still step-1 backfill candidate in rideHomes.ts:48 + initRideHistory). Fixer 06b-fixer-group-b.md, Sonnet fixer LANDED (tests 771: 768 pass/0 fail/3 skip; tsc 0); Opus re-inspect B = PASS (771/768/0/3, tsc 0) | see OVERNIGHT-REPORT.md 'Group B inspection' |
| 01 exec | landed (not yet inspected; files pre-existed at executor start = earlier dispatch had applied them, executor verified by content) | tests 776: 773 pass/0 fail/3 skip; tsc 0; expo introspect exit 0; new: plugins/withShowWhenLocked.js, modules/qualifire-lock-screen/*, location/lockScreenPolicy.ts, lockScreen.ts, tests/lockscreen_suite.ts; edited: app.json, location/index.ts, tests/run.ts |
| 03 exec | landed (not yet inspected) | tests 784: 781 pass/0 fail/3 skip; tsc 0; new: modules/qualifire-ride-notification/* (+6 flame PNGs), location/rideNotificationPolicy.ts, rideNotification.ts, tests/ridenotification_suite.ts; edited: location/index.ts, tests/run.ts |
| C inspect | inspected-PASS (784/781/0/3, tsc 0, introspect clean) | see OVERNIGHT-REPORT.md |

## FINAL 2026-09-30: all 9 steps done. Nothing committed/built/published. Resume message cancelled (not needed).
