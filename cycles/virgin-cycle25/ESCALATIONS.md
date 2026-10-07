# virgin-cycle25 — escalations

Executors append here when they STOP (EXECUTOR-RULES.md, last bullet); a fresh Fable answers under `### Ruling`. Empty = no escalation so far.

## brief-02 / 2026-10-08 (Sonnet execute)
STOP at step 2a/acceptance: all brief edits applied verbatim (anchors all matched); tests = `929 tests: 925 pass, 1 fail, 3 skip` (expected 926 pass). tsc exit 0.
Failing test (from the brief's own trendpanel_suite.ts, last test, last assert):
  FAIL  trendpanel: RoutesScreen wires the inline plot under the way rows, date + time only, no open link, no new text — DEMO keeps the card variant and its no-op open
Assertion: `!demo.includes('variant=') && demo.includes('onOpenRide={() =>')`.
Expected: DemoScreen.tsx contains no `variant=`. Found: app/src/ui/DemoScreen.tsx:664 and :669 contain `variant="live"` (other components, MapView-like props); the ResultsPlot usage (:788-794) is unchanged and has no variant prop, and `onOpenRide={() =>` is present. So the pin is over-broad, not the code. Not self-ruled; test left as written by the brief. Suggested fix for Fable: pin on the ResultsPlot element only (e.g. regex `/<ResultsPlot[^>]*variant=/`).

### Ruling — RESOLVED (2026-10-08, fresh Fable)
Executor is right: the pin is over-broad, the code is correct. `variant="live"` at DemoScreen.tsx:664/:669 belongs to the live-map views; the `<ResultsPlot` element (:788-794) has no `variant` prop. The suggested regex `/<ResultsPlot[^>]*variant=/` is rejected: `[^>]*` stops at the `>` of `onOpenRide={() =>`, so a `variant` prop added after `onOpenRide` would slip through. Replacement (trendpanel_suite.ts, last test, replaces the `const demo` line and its assert):
```ts
  const demo = src('src', 'ui', 'DemoScreen.tsx');
  const demoPlotStart = demo.indexOf('<ResultsPlot');
  const demoPlotEnd = demo.indexOf('/>', demoPlotStart);
  assert(demoPlotStart !== -1 && demoPlotEnd > demoPlotStart, 'DEMO still mounts <ResultsPlot … />');
  const demoPlot = demo.slice(demoPlotStart, demoPlotEnd);
  assert(!demoPlot.includes('variant=') && demoPlot.includes('onOpenRide={() =>'), 'DEMO keeps the card variant and its no-op open');
```
Full text + reasoning in brief-02 § "RULING (post-escalation)". Expected: 929 tests, 926 pass, 0 fail, 3 skip. No app/ change. brief-03 got the same review: its tabNav replacement comment named `openResultsRoute` while its own pin forbids it — comment reworded (1c step 1) and acceptance 5 corrected, both marked RULING in brief-03.

## brief-03 / 2026-10-08 (night run, Sonnet execute)
STOP: check failed for a reason the brief did not anticipate. Everything else in brief-03 is applied (moves, App.tsx, tabNav.tsx, RideDetailScreen, demoModel, DemoScreen, recordflow edits + pin test, resultsmodel_suite edits, 18 allow-list removals). tsc exit 0. run.ts: `918 tests: 914 pass, 1 fail, 3 skip` (expected 915 pass, 0 fail).
Failing test (run-brief03.log:310): `virgin-cycle23 03: the activity detail is one flat scroll ... back labels per source kept — back label 'BACK TO RESULTS' kept`
Cause: app/tests/recordflow_suite.ts:421 (line numbers after my edits):
  `for (const l of ["'RECORD ANOTHER'", "'BACK TO ROUTE'", "'BACK TO RESULTS'", "'BACK TO ACTIVITIES'"]) assert(det.includes(l), \`back label ${l} kept\`);`
Brief 1d removes the 'BACK TO RESULTS' ternary arm from RideDetailScreen.tsx:429, so this pin fails. Brief section 2a does not list this line. Expected: no failure; found: this assert. Proposed fix (NOT applied, Fable to rule): drop `"'BACK TO RESULTS'", ` from that list. Test count stays 918 (the failing one is an existing test).

### Ruling — RESOLVED (2026-10-08 night, fresh Fable)
Executor is right. `recordflow_suite.ts:421` is a cycle23 "the redesign kept one back label per source" pin; brief 03 shrinks the source enum, so the list follows it. Drop `"'BACK TO RESULTS'", ` from that list (exact line in brief-03 § 2c "RULING (post-escalation 2)"). Not converted into an absence assert: `:346` of the brief-03 pin test already asserts `!includes('BACK TO RESULTS')`. Fable grepped App.tsx / src / tests for every RESULTS-tab identifier (BACK TO RESULTS, 'results', openResults, closeResults, ResultsDetail, ResultsScreen, resultsWayList, resultsListModel, resultsRoute, buildHistoryBoard, boardCaption, buildResultsList, AS ON THE RESULTS TAB): no further code hit; remaining ones are the pin test, comments (tabNav.tsx:20 expected by acceptance 5, DemoScreen.tsx:264, resultsPlotModel.ts:219, routeFromRide.ts:406) and unrelated `'results'` directory names. Expected: `918 tests: 915 pass, 0 fail, 3 skip`, tsc 0. No app/ change by Fable; executor applies the one-line edit and finishes the report.
