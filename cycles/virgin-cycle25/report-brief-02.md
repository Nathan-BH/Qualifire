# report brief-02 (Sonnet execute) - DONE

Steps 1a-1d, 2a, 2b applied verbatim; after Fable's post-escalation ruling the last trendpanel pin was replaced by the ruling text exactly (DEMO pin now scoped to the <ResultsPlot ... /> element).
Files changed: app/src/ui/RoutesScreen.tsx, catalogMapView.tsx, resultsPlot.tsx, app/tests/run.ts (M); app/src/ui/trendPanelModel.ts, app/tests/trendpanel_suite.ts (new). ESCALATIONS.md appended (by me; ruling by Fable).
Tests: before 925 tests (brief 01 baseline) -> 929 tests: 926 pass, 0 fail, 3 skip (run-brief02.log). tsc exit 0 (tsc-brief02.log); import './resultsPlot.tsx' accepted.
Acceptance: allow-list diff empty; DemoScreen.tsx diff empty; grep "height: PLOT_H" = 0, "height: plotH" = 3; no " — " in RoutesScreen.tsx / trendPanelModel.ts.
Allow-list changes: none. Deviations: none beyond the ruled test replacement. Static checks only, nothing rendered.
Inspector: sheet height arithmetic, RoutesScreen place branch moved into its own ScrollView, derived plotSel keyed by way.

OPEN-ITEMS: virgin-cycle25 brief 02 (MAP trend panel), on-device checks owed: (a) the route sheet (max 380 dp) still leaves the route visible on a short phone - knobs ROUTE_SHEET_MAX_H, ROUTE_SHEET_CAMERA_PAD, PANEL_PLOT_H in app/src/ui/trendPanelModel.ts; (b) dot tap inside the sheet (hitSlop 8) vs the sheet's own scroll; (c) way-row tap re-plots and clears the dot caption; (d) night/day contrast of the grey dots on t.card. Follow-ups, not built: a link from the ride detail page into this panel (needs a focus-request channel in TabNav + App state - C6); hardware back in route focus going to overview before leaving the tab; open > from a dot to the ride page.
