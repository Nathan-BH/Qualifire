# Inspect report, brief 02 (MAP trend panel), fresh Opus, 2026-10-08

**Verdict: PASS WITH NOTES.** Code matches the brief (incl. the post-escalation RULING) line by line; tests and tsc green on my own rerun; no blocker. Notes: three test gaps (mutations survive) and one height-arithmetic error in the brief that makes a 3-way route clip its third row slightly. Safe to ship OTA (JS only): yes (no native/config file touched).

## 1. Tree / scope
`git status --short` (app/): `M RoutesScreen.tsx, catalogMapView.tsx, resultsPlot.tsx, tests/run.ts`; `?? trendPanelModel.ts, tests/trendpanel_suite.ts`. Cycle docs: brief-02/brief-03/ESCALATIONS.md edited by the Fable ruling (doc-only), report-brief-02.md new. `cycles/virgin-cycle26/` ignored.
Out-of-scope files have NO diff (checked): DemoScreen.tsx, resultsPlotModel.ts, catalogMapModel.ts, colourModel.ts, activityCard.tsx, feedModel.ts, rideDetailModel.ts, RideDetailScreen.tsx, App.tsx, tabNav.tsx, store/**, catalogmap_suite.ts, recordflow_suite.ts.

## 2. Line-by-line vs brief
- trendPanelModel.ts: byte-for-byte the §1a text; constants 140 / 380 / 108 / 400; pure (type imports + plotWindow only).
- resultsPlot.tsx: props (optional onOpenRide, variant='card' default, height), `inline`/`plotH`, useMemo deps `[results, plotW, plotH]`, frame switch, 3x `height: plotH` (grep: 3; `height: PLOT_H`: 0), caption block, `inlineFrame`, `captionRowInline`, header line. Dot colours unchanged (newest t.accent, rest t.textDim). Three literals byte-identical.
- catalogMapView.tsx: `sheetPad?: number` + `props.sheetOpen ? (props.sheetPad ?? 300) : 48`. Default path unchanged.
- RoutesScreen.tsx: imports, `plotSel` keyed `{wayId, rideId}`, `trend` + derived `plotSelected` (no effect), `sheetPad`, `st.sheetRoute`, place branch moved into its own ScrollView (identical JSX), route rows identical inside `ScrollView maxHeight: WAY_ROWS_MAX_H`, plot only when `trend.hasPlot && trend.wayId !== null`, `selectedPosLabel=""`, no onOpenRide, styles. Title row = existing sheetHead (unchanged).
- No rank / gap / PB / all-time: grep `allTimeBest|rankingPoolFor` in RoutesScreen/trendPanelModel: nothing. Caption = towerDate · fmt (posLabel '' filtered out).
- DEMO `<ResultsPlot` (DemoScreen.tsx:788-794) unchanged: no variant, keeps no-op onOpenRide, so card frame + hint + `open ›` as before.

## 3. Reruns (mine)
- `node --experimental-strip-types tests/run.ts`: **929 tests: 926 pass, 0 fail, 3 skip** (run-inspect-02.log); the 4 trendpanel tests PASS.
- `tsc --noEmit`: **exit 0**, no output (tsc-inspect-02.log).

## 4. Mutation check of the new tests (scratch copy safe_to_delete/inspect-c25-02/, real tree untouched)
| mutation | result |
|---|---|
| M1 hasPlot = results.length>=1 (ignore ranking) | CAUGHT |
| M2 usual way beats highlighted | CAUGHT |
| M6 RoutesScreen passes onOpenRide | CAUGHT |
| M7 plot removed from sheet (revert) | CAUGHT |
| M3 plotSelected not keyed by way (`plotSel.wayId === trend.wayId` dropped) | **SURVIVED** |
| M4 `route ? st.sheetRoute : null` dropped (sheet stays 280, plot clipped by overflow:hidden) | **SURVIVED** |
| M5 inline ignored for the frame (card border drawn inside the sheet) | **SURVIVED** |
| M8 `height` prop ignored (plotH = PLOT_H, 220 tall in a 380 sheet) | **SURVIVED** |
The pins are presence-string pins; the four behaviours above (way-keyed selection, route sheet max height, borderless inline, height prop) are unguarded.

## 5. Behaviour review
- Hook order: one new unconditional useState in RoutesScreen next to `focus`; ResultsPlot hooks unconditional, the component mounts/unmounts as a whole. OK.
- Way switch: 0 ranked -> no plot, no text (cycle24 sheet). 1 ranked -> one dot (buildPlotModel windowN 1 path, x-tick dedup existing). All-unranked way -> hasPlot false (`plotWindow` filter) so the 'no ranked activities yet' text inside the plot is never reached from the MAP. Single-way route: one row + plot. Zero-way route: trend.wayId null, no plot. OK.
- Sport scoping: unchanged (activeCatalog per render; results by way id). Hardware back: unchanged (no BackHandler added).
- Phone width 360 dp: sheet inner 334, plotWrap pad 8 -> boxW 318, plotW 274 (GUTTER_W 44). OK.
- Height (computed from the styles, not the brief's estimate): sheet border 2 + header 10+10+~24 (the 18 pt `×` sets the line) = ~44 + rows (each 1 border + 9 + ~19 + 9 = ~38, NOT 36) capped at 108 + plotWrap 1+4+140+16(X_AXIS_H)+4 = 165 + caption 4+6+~17+6 = ~33 -> ~352 with caption, ~319 without, < 380. Fits.

## Findings
1. MINOR, RoutesScreen.tsx (`maxHeight: WAY_ROWS_MAX_H`) / trendPanelModel.ts `WAY_ROWS_MAX_H = 108`: a row is ~38 dp (borderTopWidth 1 + 2x9 + ~19 line), so 3 rows ~114 > 108: on a route with exactly 3 ways the third row is cut by ~6 dp and needs a scroll (worse with Android font scale). Fix: `WAY_ROWS_MAX_H = 116` (still fits: ~360 with caption), update the test pin and the "36 px each" comment. On-device check (a) should look at this.
2. MINOR, trendpanel_suite.ts: M3/M4/M5/M8 survive. Cheap pins: `rs.includes('plotSel.wayId === trend.wayId')`, `rs.includes('route ? st.sheetRoute : null')`, `plot.includes('style={inline ? styles.inlineFrame')`, `plot.includes('const plotH = height ?? PLOT_H')`.
3. NOTE, RoutesScreen.tsx plotSel: never cleared, only hidden. Way w1 dot -> switch to w2 -> back to w1 re-shows the old w1 caption; same after `×` to overview and re-opening the route. The brief's OPEN-ITEMS (c) "way-row tap clears the dot caption" is only true while you stay on the other way. Harmless, but the on-device tester should know.
4. NOTE, RoutesScreen.tsx `sheetPad`: camera bottom pad 400 applies in route focus even when there is no plot (sheet ~120 tall), pushing the fitted route into the top of the map for nothing. Optional: `trend?.hasPlot ? ROUTE_SHEET_CAMERA_PAD : undefined`. Also 400 + 48 top on a short phone map view (~520 dp) leaves ~70 dp for the fit; covered by OPEN-ITEMS (a).

## 6. Text / allow-list
`git diff -- app/tests/ui-strings.allow.json`: **empty** (0 bytes). No added line in app/src contains an em dash; no new quoted string or JSX text; no "ride" word in new strings. Executor's report claims all verified true.
