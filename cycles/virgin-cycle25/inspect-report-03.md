# Inspect report — virgin-cycle25 brief 03 (remove the RESULTS tab)

Inspector: INSPECT tier (Opus, fresh context), 2026-10-08. Read-only; nothing in app/ changed, nothing committed.

## Verdict: PASS WITH NOTES

Safe to ship OTA (JS only)? **Yes** — no native file, app.json, plugin or dependency touched.

## Evidence per check

1. **Tree / moves.** HEAD = `a740b84` (briefs 01-02 committed). `git status --short` app/ hunks: `D` ResultsScreen.tsx, ResultsDetailScreen.tsx, resultsWayList.tsx, resultsListModel.ts; `M` App.tsx, DemoScreen.tsx, RideDetailScreen.tsx, demoModel.ts, tabNav.tsx, tests/recordflow_suite.ts, tests/resultsmodel_suite.ts, tests/ui-strings.allow.json. Nothing else in app/. Other changes: cycles/virgin-cycle25 (ESCALATIONS, brief-03 rulings, report, logs) and cycles/virgin-cycle26 (other session, ignored). `safe_to_delete/virgin-cycle25-results-tab/` holds the 4 files; each `cmp` against `git show HEAD:app/src/ui/<f>` is **byte-identical**. `ls app/src/ui | grep -i results` = `resultsPlot.tsx`, `resultsPlotModel.ts`.
2. **Edits vs brief, line by line.**
   - App.tsx: two imports, `type ResultsDetailRequest`, TAB_LABEL `results:` key, both state blocks (catalogDetail line before / `useTheme` after as specified), back-chain comment, both back `if` blocks, effect deps `[tab, rideDetail, gateAdjust, catalogDetail]`, `tabBarHidden` term, four nav members, two mount arms, tab-bar comment, tab array — all exactly as 1b.
   - tabNav.tsx: header comment per RULING wording (no `openResults*` names), history line appended, `Tab` union, RideDetailRequest doc + `source` union, `ResultsDetailRequest` removed (by content; was :53-57 not :51-57 — harmless), four members removed; `TabNav` now ends at `closeCatalog(): void;`.
   - RideDetailScreen.tsx: only :429, `BACK TO RESULTS` arm dropped. ON THIS WAY block has no hunk.
   - demoModel.ts: import → `tower` from `../store/results.ts`; `demoPlotPosLabel` rebuilt. Equivalence verified by reading the moved `buildHistoryBoard`: `pos = row.position` from the same `tower(results)`, `total = results.length` — identical output for every input. demo_suite unedited and passing.
   - DemoScreen.tsx: only the caption suffix removed; `<ResultsPlot` call unchanged.
   - recordflow_suite.ts: :309 list, :310 and :317-318 removed, em-dash list loses `ResultsScreen.tsx`, `rl` read + assert removed, pin test added verbatim, 2c RULING line applied verbatim. Pin test would fail on revert (five-tab array, Tab union, file existence, demo import all asserted).
   - resultsmodel_suite.ts: header, type import, resultsListModel import, fixture (lmA..CATALOG) removed; exactly 12 tests removed (3 buildResultsList, 6 buildResultsRoutes, rideCountForRoute, routeLabel, buildHistoryBoard); caption test replaced with the 3 windowCaption asserts.
3. **Tests / tsc (rerun by me).** `918 tests: 915 pass, 0 fail, 3 skip` (skips = the 3 python-parity oracle fixtures) → `run-inspect-03.log`. `tsc --noEmit` exit 0, empty output → `tsc-inspect-03.log`.
4. **Allow-list.** 452 → 434; legacyCount 32 → 32; all other header keys unchanged; 0 added, 0 edited; surviving order preserved. Removed (all 18 match the brief's table, none legacy):
   - src/ui/DemoScreen.tsx | text | `· AS ON THE RESULTS TAB`
   - src/ui/ResultsDetailScreen.tsx | text | `BACK TO RESULTS` / `RESULTS` / `activit` / `‹ BACK`
   - src/ui/ResultsScreen.tsx | literal | `NO SPORT YET · ADD ONE IN SETTINGS`
   - src/ui/ResultsScreen.tsx | text | `FREE ACTIVITIES` / `NO RESULTS YET` / `Results` / `activit` / `way` / `· free activity`
   - src/ui/RideDetailScreen.tsx | literal | `BACK TO RESULTS`
   - src/ui/resultsListModel.ts | literal | `ALL {…} {…} · fastest first` / `ALL {…} {…} · rankings off in SETTINGS`
   - src/ui/resultsWayList.tsx | text | `activit` / `best` / `‹ ROUTES`
   Live-tree scan: 73 files, 434 strings, "every visible string is allowlisted" PASS; no STALE/UNLISTED.
5. **Dangling references.** grep of App.tsx/index.ts/src for every removed identifier, `'results'`, `"results"`, `BACK TO RESULTS`: only comments (DemoScreen.tsx:264, :778-780; resultsPlotModel.ts:219; routeFromRide.ts:406; tabNav.tsx:20) and the unrelated `resultsStore.ts:50 RESULTS_DIR = 'results'`. No `require(` of the moved files. **Persisted tab:** none — `App.tsx:74 useState<Tab>('record')`, never read from storage/settings, so a stale "last tab = results" cannot exist. Only other `go()` caller is `RecordScreen.tsx:636 go('settings')`. **Deep links / notification routes:** no Linking, no notification-response listener in App.tsx/src; `rideNotificationPolicy.ts` has no tab routing ("results" hits are the word "false results"). No `as Tab` casts. No rider-facing copy (onboarding, empty states, Settings) mentions a results tab. `allTimeBestLapS` still exported (colourModel.ts:205) and used by rankingRevealModel.ts:40,76; rankingreveal/live_colour suites pass. `settleRideHomes` still triggered from RidesScreen.tsx:104 (ResultsScreen's other mount effect only read stores — nothing else lost).
6. **Untouched.** `git diff --stat` empty for src/store/** (incl. derive/results/resultsStore), activityCard.tsx, feedModel.ts, rideDetailModel.ts, colourModel.ts, towerModel.ts, rankingRevealModel.ts, RoutesScreen.tsx, trendPanelModel.ts, resultsPlot.tsx, resultsPlotModel.ts, RidesScreen.tsx, settings.tsx, catalogMapView.tsx, CatalogDetailScreen.tsx, demo_suite / rankingreveal_suite / live_colour_suite / trendpanel_suite.
7. **Tab bar.** Order record · activities · map · settings · demo; labels from TAB_LABEL (Record<Tab,…> forces exactly the 5 keys); initial tab `record`. Layout: `tab` minWidth 92 → 5 × 92 = 460 dp, still wider than a ~392-412 dp phone, so the bar still scrolls (DEMO partly off-screen at rest, as SETTINGS/DEMO were before). `tabBarContent` has no `flexGrow: 1`, so on a screen wider than 460 dp the tabs would not stretch to fill — pre-existing, unchanged by this brief.

## Findings (none blocking)

- MINOR — stale comments naming the removed screen: `app/src/ui/DemoScreen.tsx:264` ("the real ResultsDetailScreen starts with nothing selected"), `:778-780` ("the RESULTS tab's scatterplot … what the RESULTS detail would draw"), `app/src/store/routeFromRide.ts:406` (`buildResultsList walks stored results`). Brief explicitly keeps DemoScreen comments; optional future comment tidy only.
- MINOR (pre-existing, not this brief) — `demoModel.ts` doc right below `demoPlotPosLabel` still says `'LAST 9 RIDES' / 'LAST 1 RIDE'` (caption is now `LAST 10 ACTIVITIES`).
- NOTE (UX, for Nathan on device) — with 5 tabs at minWidth 92 the bar still scrolls on a phone; if he wants all 5 visible, lowering `minWidth` to ~78 (5 × 78 = 390) or adding `flexGrow: 1` to `tabBarContent` would do it. Not in brief scope; no fix required.

## Required fixes

None.

## Coordinator paragraph (brief §7, still to do)

Update `cycles/virgin-cycle23/COMMANDS.md` on-device checklist item 12 (BACK TO ACTIVITIES, RECORD ANOTHER, BACK TO ROUTE); STATE.md tab list; OPEN-ITEMS note on the feed card's `P3/10` rank text (window-relative, consistent).
