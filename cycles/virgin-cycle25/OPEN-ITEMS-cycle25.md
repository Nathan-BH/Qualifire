# virgin-cycle25: open items (coordinator, 2026-10-08)
- Detail page -> MAP trend panel link DEFERRED: needs a TabNav focus channel (TabNav only has go(tab); MAP focus is local state at RoutesScreen.tsx). Panel is reachable from the MAP tab itself.
- Feed card still shows the window-relative rank text "P3/10" (activityCard.tsx:81). Nathan said "no badge" = add nothing; existing text left untouched. Review against the rolling-window philosophy if wanted (it is window-relative).
- Tuning (on-device): WAY_ROWS_MAX_H 108 vs ~38 dp rows (suggest 116); sheet max 380; plot height 140; camera pad 400 applies even with no plot.
- Selection caption (plotSel) is never cleared when switching ways / reopening a route.
- 4 mutations uncaught by tests (way-keyed selection, sheetRoute max height, borderless inline frame, height prop): one-line pins each (inspect-report-02.md).
- Stale comments: resultsPlotModel.ts:8-11, demoModel.ts:322, resultsmodel_suite.ts:16, DemoScreen.tsx:264 and :778-780, routeFromRide.ts:406.
- TENTH demo test: prior-4 is slower by only 0.2 s, so the pinned 5-slower count is fragile.
- Tab bar with 5 tabs still scrolls sideways on a phone (460 dp at minWidth 92); could now fit by shrinking minWidth.
- Removed files are in safe_to_delete/virgin-cycle25-results-tab/ (ResultsScreen, ResultsDetailScreen, ResultsWayList, resultsListModel).
