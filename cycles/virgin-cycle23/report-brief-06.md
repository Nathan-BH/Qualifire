# Report brief 06 (Sonnet execute, virgin-cycle23)

All steps done. No stops, no deviations (all edits were the brief's exact anchors/wording; no mechanical deviations).

Counts: baseline 920 tests: 917 pass, 0 fail, 3 skip (tsc exit 0) -> final 923 tests: 920 pass, 0 fail, 3 skip; tsc --noEmit EXIT=0, empty log (no safe_to_delete noise).
Logs: cycles/virgin-cycle23/run-brief06-baseline.log, tsc-brief06-baseline.log, run-brief06.log, tsc-brief06.log. Pre-edit allow-list copy: scratch/allow-pre-brief06.json.

Files I changed: app/src/store/routeFromRide.ts, ui/rideHistoryModel.ts, ui/replayModel.ts, ui/liveView.tsx, ui/resultsListModel.ts, ui/towerModel.ts, ui/tower.tsx; tests: ui_strings_suite.ts, replay_suite.ts, recordflow_suite.ts, ridehistory_suite.ts, resultsmodel_suite.ts, towermodel_suite.ts, routecreation_suite.ts, ui-strings.allow.json. (rideHistoryModel, tower.tsx, recordflow, ridehistory, ui_strings suites and allow-list also carry brief 04/05 hunks.) Forbidden-path diff (live, derive, results, timing, storage, ResultsDetailScreen, ReplayScreen, chips, demoModel, rankingRevealModel) is empty.

Allow-list: 455 -> 452, legacyCount 32. Set diff vs pre-brief06 copy: removed (src/ui/rideHistoryModel.ts|literal|- did not traverse -), (src/ui/resultsListModel.ts|literal|NO TIME), (src/ui/towerModel.ts|literal|NO TIME); text edited in place (src/ui/tower.tsx|text) 'TODAY · unranked' -> 'TODAY · Not ranked'. preview/data.ts NO TIME still present. Round trip verified byte for byte before edit.

Mutation checks: (a) routeFromRide reason with 'lap' put back -> ui_strings 06 test, recordflow 06 test and c18-02 2 FAIL (3 fails); (b) dropping && lapLabel !== '' from replayModel:166 -> replay 06 test and recordflow 06 test FAIL. Both reverted; final suite 923/920/0/3.

Greps: 5.4 and 5.5 zero hits; 5.6 NOT_RANKED_LABEL added in resultsListModel (import, doc, use) and towerModel (import, use); 'Not ranked' quoted only in feedModel.ts const plus comments at resultsListModel.ts:206 and tower.tsx:53; 5.7 tower.tsx 'TODAY · Not ranked' = 1, 'TODAY · unranked' = 0.

Gate alert body: "the reference activity cannot be timed on these gates · move that gate where the activity passed" = 17 words.

Inspect should look at: bigFromSector + lap block in liveView, buildSectorRows two '' rows, replayModel:166, routeFromRide reason/suffix, two NOT_RANKED_LABEL imports, allow-list diff; LiveSectorPane/LiveFlash/ReplayScreen have no hunk. Native rendering not checkable here.

OPEN-ITEMS line for coordinator: virgin-cycle23 brief 06 (no estimates on flashes, no lap in gate alert, RESULTS 'Not ranked'), on-device checks owed: (a) RECORD with GPS gap/missed gate: no '~' or '- -' flash, clock keeps running, real sector still flashes, strip label 'S2' never 'S2 ~'; (b) RECORD finish of an estimated ride: no finish flash; clean ride still flashes; (c) REPLAY of unranked activity: big clock never blank, no '~' at any gate; (d) REPLAY ranked unchanged; (e) GATES: move a gate into the reference recording's GPS hole -> alert 'the reference activity cannot be timed on these gates · move that gate where the activity passed'; (f) RESULTS -> way -> history: estimated/missed activity reads 'Not ranked' in grey, no wrap; (g) DEMO unchanged.
