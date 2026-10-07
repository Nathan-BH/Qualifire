# Report brief 05 (Sonnet execute, 2026-10-07)

Done: all of sections 2a-2f, 3a-3e, 4 (allow-list). Not done: nothing. Native rendering not checkable here.

Files changed (mine): app/src/ui/{feedModel,activityCard,rideHistoryModel,rideDetailModel,RideDetailScreen,tower}.ts(x); app/tests/{feedmodel,ridehistory,ridedetail,recordflow,ui_strings}_suite.ts; app/tests/ui-strings.allow.json. wayMapView.tsx modified by brief 04 only (no hunk of mine).

Counts: baseline 914 tests / 911 pass / 0 fail / 3 skip. Final 920 / 917 pass / 0 fail / 3 skip (+6). Logs: run-brief05-baseline.log, run-brief05.log, tsc-brief05-baseline.log, tsc-brief05.log.

tsc: EXIT=2 both BEFORE and AFTER, identical single error, not mine: app/safe_to_delete/_tmp_scanlap.ts(1,27): TS2307 Cannot find module './ui_strings_extract.ts' (stray scratch file from another session, created 20:41). No other tsc error. Brief assumed exit 0 baseline.

Allow-list (455 -> 455): removed rideHistoryModel.ts|literal|no lap; rideDetailModel.ts|literal|no lap, no time, not ranked; added feedModel.ts|literal|Not ranked; rideDetailModel.ts|literal|ignored in ranking, GPS gap at a gate, a gate was missed; edited tower.tsx|text|LAP -> TIME. Sorted via one python RMW, round-trip asserted.

Deviations (mechanical): (1) brief's doc comments contained the quoted strings 'no time' (rideDetailModel.ts rankLineFor comment) and 'no lap' (rideHistoryModel.ts lapCellLabel comment), which tripped the brief's own recordflow pin (model.includes("'no time'") etc.). Reworded the comments to use double quotes: `no "lap", no "no time", no "estimated"` and `"no lap" forms`. (2) activityCard.tsx JSX indentation is 6 spaces, not the brief's 8; anchors matched by content.

Checks: C3 only comment hits (rankingRevealModel.ts:12, rideHistoryModel.ts:38,103,110); C4 one `~${` (buildSectorRows:237), '~' count feedModel 0, rideDetailModel 1 (doc comment line 160 mentions `~m:ss`); C5 0 hits; C6 8; C7 ok; C8 0/1; C9 remaining 'lap' words are identifiers/comments (st.lap style, liveView.tsx:193 `~` live flash and :204 comment out of scope); C12 geometry intact.

Inspect: hero/strip JSX, both unrankedForDisplay call sites, allow-list diff, 3 reason strings, buildSectorRows/replay untouched, wayMapView no hunk of mine.

OPEN-ITEMS line for coordinator: "virgin-cycle23 brief 05 on-device checks owed: (a) estimated/missed card shows title, dim 'Not ranked' in hero slot, map, empty strip row, still 307 dp; (b) ignored activity same, 'Count in ranking' brings time/rank/strip back; (c) interrupted looks like any ranked card; (d) detail of unranked: 'Not ranked' 22 dp dim, reason line (ignored in ranking / GPS gap at a gate / a gate was missed), blank sector time where none; (e) no '~' and no 'lap' in ACTIVITIES, detail, RECORD end screen; (f) night theme readability of the dim label." Also: stray app/safe_to_delete/_tmp_scanlap.ts breaks tsc (exit 2) - owner should mv it out of tsc's include.
