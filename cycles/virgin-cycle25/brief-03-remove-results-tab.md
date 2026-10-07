# brief-03 — remove the RESULTS tab (screens, list model, tabNav plumbing, tests, allow-list)

**Cycle:** virgin-cycle25. **Source:** `00-nathan-decisions.md` decisions 1, 4, 8 and Corrections C3, C4, C5 (binding: the tab, its screens, the all-time board, the `ALL X ACTIVITIES` caption and the way-list drill-down go; the data layer, the plot, `windowCaption`, the feed card, RideDetail's ON THIS WAY and rank line stay untouched), digest `02-map-panel-digest.md` §4, §7. Written by the Plan tier (Fable) 2026-10-07 night; anchors re-read at commit `e7414a4` and adjusted for briefs 01-02.

**Tier:** Execute = Sonnet, alone, under `cycles/virgin-cycle25/EXECUTOR-RULES.md`. STOP-ON-AMBIGUITY.

**Run order: AFTER brief 02** (the MAP panel must exist before the tab that showed the trend is removed; brief 01 moved `windowCaption`). Pre-flight: `grep -n "export function windowCaption" app/src/ui/resultsPlotModel.ts` prints one line, `ls app/src/ui/trendPanelModel.ts` exists, and `grep -n "import { buildHistoryBoard } from './resultsListModel.ts'" app/src/ui/demoModel.ts` prints one line; else STOP.

## Goal

Tab bar becomes record · activities · map · settings · demo (decision 8). `ResultsScreen.tsx`, `ResultsDetailScreen.tsx`, `resultsWayList.tsx`, `resultsListModel.ts` are moved to `safe_to_delete/` (never deleted). `App.tsx` and `tabNav.tsx` lose the `results` tab, the `resultsDetail` / `resultsRoute` state, the back-handler steps, the four nav members and the `ResultsDetailRequest` type. `RideDetailRequest.source` loses `'results'` and RideDetailScreen its `BACK TO RESULTS` label. DEMO keeps its plot, its `P<pos> of <total>` caption (rebuilt on `tower()` from the store, no board) and drops the `· AS ON THE RESULTS TAB` suffix. Tests that read the removed files are edited; the 12 RESULTS list/board model tests are removed; 18 allow-list entries are removed, none added. Everything DEMO, the feed, RideDetail and the live engine read (`store/results.ts`, `store/resultsStore.ts`, `colourModel.ts`, `towerModel.ts`, `rankingRevealModel.ts`, `rideDetailModel.ts`, `feedModel.ts`) is untouched.

## 0. What the code does today (verified anchors)

- `app/App.tsx`:
  - `:34` `import ResultsScreen from './src/ui/ResultsScreen';` `:35` `import ResultsDetailScreen from './src/ui/ResultsDetailScreen';`
  - `:53` `  type ResultsDetailRequest,` (inside the `./src/ui/tabNav` import list `:50-56`)
  - `:62` `  record: 'record', rides: 'activities', routes: 'map', results: 'results', settings: 'settings', demo: 'demo',`
  - `:99-103` the `resultsDetail` comment + state (`:103` `  const [resultsDetail, setResultsDetail] = useState<ResultsDetailRequest | null>(null);`); `:104-109` the `resultsRoute` comment + state (`:109` `  const [resultsRoute, setResultsRoute] = useState<string | null>(null);`)
  - `:117-118` comment `  // System back: gate editor → ride detail → catalog detail → results detail →` / `  // results way list → other tabs → Record; from Record, default behaviour`
  - `:140-147`:
    ```ts
          if (resultsDetail !== null) {
            setResultsDetail(null);
            return true;
          }
          if (tab === 'results' && resultsRoute !== null) {
            setResultsRoute(null);
            return true;
          }
    ```
  - `:155` `  }, [tab, rideDetail, gateAdjust, catalogDetail, resultsDetail, resultsRoute]);`
  - `:204` `    || rideDetail !== null || gateAdjust !== null || catalogDetail !== null || resultsDetail !== null;`
  - `:225-228`:
    ```ts
          openResults: setResultsDetail,
          closeResults: () => setResultsDetail(null),
          openResultsRoute: setResultsRoute,
          closeResultsRoute: () => setResultsRoute(null),
    ```
  - `:240` `            : resultsDetail !== null ? <ResultsDetailScreen request={resultsDetail} />`
  - `:244` `            : tab === 'results' ? <ResultsScreen openRouteId={resultsRoute} />`
  - `:248-250` comment `        {/* Six tabs (WP-2 re-added RESULTS, in RESULT's old slot) still` … `the original six. */}`
  - `:258` `            {(['record', 'rides', 'routes', 'results', 'settings', 'demo'] as const).map((tb) => (`
- `app/src/ui/tabNav.tsx`: `:9-11` header lines naming `openResults` … `closeResultsRoute`; `:18-22` comment ending `// the old RESULT screen.`; `:23` `export type Tab = 'record' | 'rides' | 'routes' | 'results' | 'settings' | 'demo';`; `:27-28` comment ` * ride row, 'results' → the RESULTS way detail underneath — WP-2) and what`; `:36` `  source: 'post-stop' | 'rides' | 'routes' | 'results';`; `:51-57`:
  ```ts
  /** WP-2: who to show the full-screen RESULTS detail for — one way's board
   * plus its last-9 scatterplot. A plain id, like GateAdjustRequest. */
  export interface ResultsDetailRequest {
    wayId: string;
  }
  ```
  `:81-98` the four members with their doc comments (`openResults`, `closeResults`, `openResultsRoute`, `closeResultsRoute`), ending `  closeResultsRoute(): void;` just before the closing `}` of `TabNav` at `:99`.
- `app/src/ui/RideDetailScreen.tsx` `:429` `  const primaryLabel = request.source === 'post-stop' ? 'RECORD ANOTHER' : request.source === 'routes' ? 'BACK TO ROUTE' : request.source === 'results' ? 'BACK TO RESULTS' : 'BACK TO ACTIVITIES';`
- `app/src/ui/demoModel.ts` `:35` (after brief 01) `import { buildHistoryBoard } from './resultsListModel.ts';   // pure over a results array (brief 08); goes with brief 03`; `:311-320`:
  ```ts
  /** brief 08: the plot caption's position segment, exactly as ResultsDetailScreen.tsx builds
   *  it (`P<pos> of <total>` from the real buildHistoryBoard over the same results; PB marker
   *  irrelevant here, so allTimeBestS is null). '' for no selection, an unknown id, or an
   *  unranked row — the screen blanks it itself when SETTINGS rankings are off. */
  export function demoPlotPosLabel(results: readonly RideResult[], rideId: string | null): string {
    if (rideId === null) return '';
    const board = buildHistoryBoard([...results], null);
    const row = board.rows.find((r) => r.rideId === rideId);
    return row !== undefined && row.pos !== null ? `P${row.pos} of ${board.total}` : '';
  }
  ```
  `buildHistoryBoard` = `tower(results)` rows with `pos = row.position`, `total = results.length` (`resultsListModel.ts:221-257`), so `tower()` from `app/src/store/results.ts:108` gives the same `P<pos> of <total>`. demoModel already imports from `../store/` (`:34` gateSeeding), so a store import is allowed here (the "no store imports" rule is DemoScreen's, `:37-38`).
- `app/src/ui/DemoScreen.tsx` `:785-787`:
  ```tsx
                <Text style={[styles.h2, { marginTop: 8, marginBottom: 10 }]}>
                  {demoPlotCaption(plotResults)} · AS ON THE RESULTS TAB
                </Text>
  ```
- Files with no other importer than the RESULTS screens / App.tsx (digest §4.2, §4.5, confirmed by grep): `src/ui/ResultsScreen.tsx`, `src/ui/ResultsDetailScreen.tsx`, `src/ui/resultsWayList.tsx`, `src/ui/resultsListModel.ts` (importers: ResultsScreen, ResultsDetailScreen, resultsWayList, demoModel `:35`, `tests/resultsmodel_suite.ts`, `tests/recordflow_suite.ts:610`).
- Tests:
  - `app/tests/recordflow_suite.ts` `:309` `  for (const f of ['ResultsScreen.tsx', 'RoutesScreen.tsx', 'RidesScreen.tsx']) assert(read('src', 'ui', f).includes('NO SPORT YET · ADD ONE IN SETTINGS'), \`${f} badge\`);`; `:310` `  assert(!read('src', 'ui', 'ResultsScreen.tsx').includes('DO A ROUTE FIRST'), 'RESULTS empty state is the first clause only');`; `:317-318` `  const rd = read('src', 'ui', 'ResultsDetailScreen.tsx');` / `  assert(!rd.includes('not ranked') && !rd.includes('rankingsOn') && !rd.includes('useSettings'), 'ResultsDetail divider + rankings switch gone');`; `:333` the em-dash file list containing `'ResultsScreen.tsx', `; `:610` `  const rl = read('src', 'ui', 'resultsListModel.ts');` and `:614` `  assert(!rl.includes("'NO TIME'") && rl.includes('timeLabel: noTime ? NOT_RANKED_LABEL : fmt(row.timeS),'), 'RESULTS history: Not ranked');`.
  - `app/tests/resultsmodel_suite.ts` (after brief 01): header `:1-8`; `:14` `import type { Catalog, Landmark, Route, RideResult, SectorQuality, Way } from '../src/store/types.ts';`; `:29-31` `const {\n  buildResultsList, buildHistoryBoard, boardCaption,\n  buildResultsRoutes, rideCountForRoute, routeLabel,\n} = await import('../src/ui/resultsListModel.ts');`; fixture `:42-62` (`lmA`…`CATALOG`); tests from the comment `// buildResultsList` (`:101`) through the end of `test('resultsmodel: buildHistoryBoard — ranked 1..4, ...` (its closing `});` at `:283`) = 12 tests; `:285-291` `test('resultsmodel: boardCaption / windowCaption wording', ...)` with three `boardCaption` asserts and two `windowCaption` asserts.
  - `tests/catalogmap_suite.ts:218` asserts `routes: 'map'` in App.tsx (stays true). `tests/ui_strings_suite.ts` live-tree test fails on STALE entries of moved files until the allow list is edited.
- Allow-list `app/tests/ui-strings.allow.json`: 452 entries, `legacyCount` 32. None of the 18 entries below carries `legacy: true`.

## 1. Changes, file by file

### 1a. Move (never delete)

```
mkdir -p safe_to_delete/virgin-cycle25-results-tab
GIT_OPTIONAL_LOCKS=0 git mv app/src/ui/ResultsScreen.tsx safe_to_delete/virgin-cycle25-results-tab/   # if git mv fails on this mount, plain mv is fine: git sees a deletion + an untracked file in a gitignored dir
GIT_OPTIONAL_LOCKS=0 git mv app/src/ui/ResultsDetailScreen.tsx safe_to_delete/virgin-cycle25-results-tab/
GIT_OPTIONAL_LOCKS=0 git mv app/src/ui/resultsWayList.tsx safe_to_delete/virgin-cycle25-results-tab/
GIT_OPTIONAL_LOCKS=0 git mv app/src/ui/resultsListModel.ts safe_to_delete/virgin-cycle25-results-tab/
```
Then `ls app/src/ui/ | grep -i results` must print exactly `resultsPlot.tsx` and `resultsPlotModel.ts`.

### 1b. `app/App.tsx`

1. Remove lines `:34-35` (the two imports).
2. Remove `:53` `  type ResultsDetailRequest,`.
3. `:62` → `  record: 'record', rides: 'activities', routes: 'map', settings: 'settings', demo: 'demo',`
4. Remove `:99-109` entirely (both comments and both `useState` lines). Verify the line before is `  const [catalogDetail, setCatalogDetail] = useState<CatalogDetailRequest | null>(null);` and the line after is `  const { t } = useTheme();`.
5. `:117-118` → `  // System back: gate editor → ride detail → catalog detail → other tabs →` / `  // Record; from Record, default behaviour`
6. Remove `:140-147` (the two `if` blocks quoted above).
7. `:155` → `  }, [tab, rideDetail, gateAdjust, catalogDetail]);`
8. `:204` → `    || rideDetail !== null || gateAdjust !== null || catalogDetail !== null;`
9. Remove `:225-228` (four nav members).
10. Remove `:240` and `:244`.
11. `:248-250` → `        {/* Five tabs since virgin-cycle25 (RESULTS removed, its trend lives in the` / `            MAP route sheet) still scroll sideways rather than shrinking — Nathan,` / `            2026-08-16, on the original six. */}`
12. `:258` → `            {(['record', 'rides', 'routes', 'settings', 'demo'] as const).map((tb) => (`

### 1c. `app/src/ui/tabNav.tsx`

1. `:9-11`: replace `` `closeCatalog`, `openResults: setResultsDetail`, `closeResults`,\n * `openResultsRoute: setResultsRoute`, `closeResultsRoute` — the last two\n * from virgin-cycle15 brief 13's RESULTS route -> way drill-down). `` with `` `closeCatalog`). virgin-cycle25 brief 03 removed the RESULTS tab and its\n * four nav members (open/close the results detail and the results route) with it. ``
   **RULING (post-escalation of brief 02, 2026-10-08, Fable):** this comment text was changed from the original wording (which literally named `openResults` / `openResultsRoute`) because the pin test in 2a asserts `!nav.includes('openResultsRoute')` over the WHOLE file — the original wording would have failed its own pin. Keep the names out of every comment in tabNav.tsx.
2. `:18-22` append one comment line after `// the old RESULT screen.`: `// virgin-cycle25 (2026-10-07) removed it again: its trend is the MAP route sheet.`
3. `:23` → `export type Tab = 'record' | 'rides' | 'routes' | 'settings' | 'demo';`
4. `:28` ` * ride row, 'results' → the RESULTS way detail underneath — WP-2) and what` → ` * ride row) and what`
5. `:36` → `  source: 'post-stop' | 'rides' | 'routes';`
6. Remove `:51-57` (the `ResultsDetailRequest` doc + interface) and the blank line that follows it if two blank lines result.
7. Remove `:81-98` (the four members with their doc comments). The `TabNav` interface then ends with `  closeCatalog(): void;` followed by `}`.

### 1d. `app/src/ui/RideDetailScreen.tsx`

`:429` → `  const primaryLabel = request.source === 'post-stop' ? 'RECORD ANOTHER' : request.source === 'routes' ? 'BACK TO ROUTE' : 'BACK TO ACTIVITIES';`

### 1e. `app/src/ui/demoModel.ts`

1. `:35` → `import { tower } from '../store/results.ts';   // the real ranking rows, for the demo plot's P<pos> of <total> (cycle25 03; the RESULTS board is gone)`
2. `:311-320` →
   ```ts
   /** brief 08 / cycle25 03: the plot caption's position segment, `P<pos> of <total>` from the
    *  real tower() over the same results (the RESULTS board that used to compute it is gone).
    *  '' for no selection, an unknown id, or an unranked row. */
   export function demoPlotPosLabel(results: readonly RideResult[], rideId: string | null): string {
     if (rideId === null) return '';
     const row = tower([...results]).find((r) => r.rideId === rideId);
     return row !== undefined && row.position !== null ? `P${row.position} of ${results.length}` : '';
   }
   ```
   (`tests/demo_suite.ts :767-776` and `:785-797` pin `P3 of 10`, `P1 of 10`, `P1 of 2`, `P1 of 1`, `''` — they must pass UNEDITED; they are the proof the rewrite is equivalent.)

### 1f. `app/src/ui/DemoScreen.tsx`

`:786` `                  {demoPlotCaption(plotResults)} · AS ON THE RESULTS TAB` → `                  {demoPlotCaption(plotResults)}`. Nothing else (comments naming "RESULTS" stay).

## 2. Tests

### 2a. `app/tests/recordflow_suite.ts`

- `:309` → `  for (const f of ['RoutesScreen.tsx', 'RidesScreen.tsx']) assert(read('src', 'ui', f).includes('NO SPORT YET · ADD ONE IN SETTINGS'), \`${f} badge\`);`
- Remove `:310`.
- Remove `:317-318`.
- `:333`: delete the list element `'ResultsScreen.tsx', ` (the list then reads `'rideHistoryModel.ts', 'RoutesScreen.tsx', 'RidesScreen.tsx', ...`).
- Remove `:610` and `:614` (the `rl` read and its assert). `tm` and `tw` lines stay.
- Add, right after the test that contains `:309` (find its closing `});`), ONE pin test:
  ```ts
  test('virgin-cycle25 03: the RESULTS tab is gone — five tabs, no results plumbing, the data layer and the plot stay', () => {
    const read = (...p: string[]) => fs.readFileSync(path.resolve(TESTS_DIR, '..', ...p), 'utf8');
    const app = read('App.tsx');
    assert(app.includes("['record', 'rides', 'routes', 'settings', 'demo'] as const"), 'five tabs');
    for (const gone of ['ResultsScreen', 'ResultsDetail', 'resultsRoute', 'openResults', "results: 'results'"]) assert(!app.includes(gone), `App.tsx still has ${gone}`);
    const nav = read('src', 'ui', 'tabNav.tsx');
    assert(nav.includes("export type Tab = 'record' | 'rides' | 'routes' | 'settings' | 'demo';"), 'Tab union');
    assert(nav.includes("source: 'post-stop' | 'rides' | 'routes';") && !nav.includes('ResultsDetailRequest') && !nav.includes('openResultsRoute'), 'tabNav plumbing gone');
    assert(!read('src', 'ui', 'RideDetailScreen.tsx').includes('BACK TO RESULTS'), 'no RESULTS back label');
    for (const f of ['ResultsScreen.tsx', 'ResultsDetailScreen.tsx', 'resultsWayList.tsx', 'resultsListModel.ts']) assert(!fs.existsSync(path.resolve(TESTS_DIR, '..', 'src', 'ui', f)), `${f} still in src/ui`);
    for (const f of ['resultsPlot.tsx', 'resultsPlotModel.ts', 'trendPanelModel.ts']) assert(fs.existsSync(path.resolve(TESTS_DIR, '..', 'src', 'ui', f)), `${f} must stay`);
    for (const f of [['store', 'results.ts'], ['store', 'resultsStore.ts'], ['ui', 'colourModel.ts'], ['ui', 'towerModel.ts'], ['ui', 'rideDetailModel.ts']]) assert(fs.existsSync(path.resolve(TESTS_DIR, '..', 'src', ...f)), `${f.join('/')} must stay`);
    const demo = read('src', 'ui', 'demoModel.ts');
    assert(!demo.includes('resultsListModel') && demo.includes("import { tower } from '../store/results.ts';"), 'demo pos label on tower()');
    assert(!read('src', 'ui', 'DemoScreen.tsx').includes('AS ON THE RESULTS TAB'), 'demo caption suffix gone');
  });
  ```
  (`fs`, `path`, `TESTS_DIR` are already imported at the top of this suite — verify with `grep -n "^import" app/tests/recordflow_suite.ts`; if `TESTS_DIR` is not imported there, use the same `read` helper shape the neighbouring tests use and STOP if none matches.)

### 2b. `app/tests/resultsmodel_suite.ts`

1. Header `:1-8` → 
   ```ts
   /**
    * QA — `resultsPlotModel.ts` (plotWindow, fitDomain, toneFor, buildPlotModel,
    * windowCaption). Pure; hand-built RideResults. The RESULTS list/board model
    * tests that lived here went with the tab (virgin-cycle25 brief 03).
    */
   ```
2. `:14` → `import type { RideResult, SectorQuality } from '../src/store/types.ts';`
3. Remove `:29-31` (the resultsListModel import statement, all four lines from `const {` to `} = await import('../src/ui/resultsListModel.ts');`).
4. Remove the fixture block from `const lmA: Landmark = ...` through the closing `};` of `const CATALOG: Catalog = {...}` (`:42-62` before any other edit; anchor by content) and the comment lines `// route ids are plain ...` that sit inside it. Keep `mk` and `ridesOverDays`.
5. Remove from the line `// buildResultsList` through the closing `});` of the `buildHistoryBoard` test (12 tests; `grep -c "^test('resultsmodel: buildResultsList\|^test('resultsmodel: buildResultsRoutes\|^test('resultsmodel: rideCountForRoute\|^test('resultsmodel: routeLabel\|^test('resultsmodel: buildHistoryBoard" app/tests/resultsmodel_suite.ts` must be 0 afterwards). Keep the `// -------- tests` separator line.
6. `boardCaption / windowCaption wording` test → 
   ```ts
   test('resultsmodel: windowCaption wording (plot model, cycle25)', () => {
     assert(windowCaption(10) === 'LAST 10 ACTIVITIES', windowCaption(10));
     assert(windowCaption(9) === 'LAST 9 ACTIVITIES', windowCaption(9));
     assert(windowCaption(1) === 'LAST 1 ACTIVITY', windowCaption(1));
   });
   ```

Expected: brief 02's `929 tests: 926 pass, 0 fail, 3 skip` → `918 tests: 915 pass, 0 fail, 3 skip` (−12 removed, +1 pin). `demo_suite`, `rankingreveal_suite`, `live_colour_suite`, `ridedetail_suite`, `feedmodel_suite`, `catalogmap_suite`, `trendpanel_suite` pass UNEDITED.

## 3. Visible text — allow-list edits (CLAUDE.md rule 9): 18 REMOVED, 0 added, 0 edited

Remove exactly these entries (file | kind | text), in ONE python read-modify-write (`json.load` → filter → `entries.sort(key=lambda e: (e['file'], e['kind'], e['text']))` → `json.dump(f, indent=2, ensure_ascii=False)` + `'\n'`); never touch a `legacy: true` entry; do not regenerate the file:

| file | kind | text | why |
|---|---|---|---|
| src/ui/DemoScreen.tsx | text | `· AS ON THE RESULTS TAB` | suffix dropped (1f) |
| src/ui/ResultsDetailScreen.tsx | text | `BACK TO RESULTS` | file moved |
| src/ui/ResultsDetailScreen.tsx | text | `RESULTS` | file moved |
| src/ui/ResultsDetailScreen.tsx | text | `activit` | file moved |
| src/ui/ResultsDetailScreen.tsx | text | `‹ BACK` | file moved |
| src/ui/ResultsScreen.tsx | literal | `NO SPORT YET · ADD ONE IN SETTINGS` | file moved (RoutesScreen/RidesScreen keep their own entries) |
| src/ui/ResultsScreen.tsx | text | `FREE ACTIVITIES` | file moved |
| src/ui/ResultsScreen.tsx | text | `NO RESULTS YET` | file moved |
| src/ui/ResultsScreen.tsx | text | `Results` | file moved |
| src/ui/ResultsScreen.tsx | text | `activit` | file moved |
| src/ui/ResultsScreen.tsx | text | `way` | file moved |
| src/ui/ResultsScreen.tsx | text | `· free activity` | file moved |
| src/ui/RideDetailScreen.tsx | literal | `BACK TO RESULTS` | ternary arm removed (1d) |
| src/ui/resultsListModel.ts | literal | `ALL {…} {…} · fastest first` | file moved |
| src/ui/resultsListModel.ts | literal | `ALL {…} {…} · rankings off in SETTINGS` | file moved |
| src/ui/resultsWayList.tsx | text | `activit` | file moved |
| src/ui/resultsWayList.tsx | text | `best` | file moved |
| src/ui/resultsWayList.tsx | text | `‹ ROUTES` | file moved |

Entry count 452 → 434. KEEP (still in code): `src/ui/RideDetailScreen.tsx | text | ON THIS WAY`, the three `src/ui/resultsPlot.tsx` entries, the two `src/ui/resultsPlotModel.ts | prop:empty` entries, `src/ui/RoutesScreen.tsx | literal | NO SPORT YET · ADD ONE IN SETTINGS`, every `src/ui/DemoScreen.tsx` entry other than the one above. If the live-tree test reports any STALE/UNLISTED string not in this table: STOP and quote it.

## 4. Decisions already made (Planner rulings)

- Files are moved under `safe_to_delete/virgin-cycle25-results-tab/`, not deleted (CLAUDE.md 5).
- `resultsListModel.ts` goes whole: `buildHistoryBoard` is the all-time board (decision 4/5), its only surviving consumer (DEMO's `P<pos> of <total>`) is rebuilt on `tower()` with the pinned demo tests as the equivalence proof. `windowCaption` already moved to the plot model in brief 01.
- DEMO keeps its rank caption (`P3 of 10`): the DEMO tab's point is the ranking reveal and the label is window-relative (consistent with decision 5). Only the `· AS ON THE RESULTS TAB` suffix goes (minimal text; the panel it would point to has no caption).
- `RideDetailRequest.source` drops `'results'` with the tab; `'routes'` (catalog detail's reference-ride row) stays.
- Feed card (`activityCard.tsx`, `feedModel.ts`), RideDetail ON THIS WAY / rank line, `colourModel.allTimeBestLapS` (used by `rankingRevealModel.ts:40,76` for the live reveal — not a RESULTS-only export; leave it) are untouched.
- `settleRideHomes` loses its RESULTS-screen trigger; `RidesScreen.tsx:104` still runs it (digest §4.2), so no replacement trigger.
- Hardware back: the two RESULTS steps are removed from the chain; nothing else in the chain changes.

## 5. Acceptance

1. Pre-flight passes; 1a listing shows only `resultsPlot.tsx` / `resultsPlotModel.ts`.
2. tsc exit 0 (`tsc-brief03.log`, `timeout_ms: 180000`) — the compiler is the main proof no importer of the moved files is left.
3. run.ts `918 tests: 915 pass, 0 fail, 3 skip` (`run-brief03.log`; baseline `run-brief03-baseline.log` = brief 02's counts).
4. `grep -rn "ResultsScreen\|ResultsDetail\|resultsWayList\|resultsListModel\|openResults\|resultsRoute\|ResultsDetailRequest" app/App.tsx app/src --include=*.ts --include=*.tsx` → only comment lines (lines containing `//` or ` * ` before the match) in `DemoScreen.tsx` / `demoModel.ts` / `tabNav.tsx` / `RideDetailScreen.tsx` header; no import, no JSX, no type.
5. `grep -n "'results'" app/App.tsx app/src/ui/tabNav.tsx app/src/ui/RideDetailScreen.tsx` → exactly one hit, the history comment `tabNav.tsx:21` (`// re-introduced it as 'results' — …`, kept by 1c step 2); nothing in App.tsx or RideDetailScreen.tsx. *(RULING post-escalation of brief 02: the original "→ nothing" contradicted 1c step 2, which keeps that comment.)*
6. `GIT_OPTIONAL_LOCKS=0 git diff -- app/tests/ui-strings.allow.json`: exactly 18 removed entries as in §3, 434 entries (`python3 -c "import json;print(len(json.load(open('app/tests/ui-strings.allow.json'))['entries']))"`), `legacyCount` unchanged.
7. `git diff -- app/src/ui/activityCard.tsx app/src/ui/feedModel.ts app/src/ui/rideDetailModel.ts app/src/ui/colourModel.ts app/src/store` → empty.
8. `git status --short`: `D app/src/ui/ResultsScreen.tsx`, `D app/src/ui/ResultsDetailScreen.tsx`, `D app/src/ui/resultsWayList.tsx`, `D app/src/ui/resultsListModel.ts` (or `R` if git mv worked), `M app/App.tsx`, `M app/src/ui/tabNav.tsx`, `M app/src/ui/RideDetailScreen.tsx`, `M app/src/ui/demoModel.ts`, `M app/src/ui/DemoScreen.tsx`, `M app/tests/recordflow_suite.ts`, `M app/tests/resultsmodel_suite.ts`, `M app/tests/ui-strings.allow.json`, plus briefs 01-02's files and cycle logs. Nothing else.

## 6. Out of scope — do NOT touch

`store/**`, `colourModel.ts`, `towerModel.ts`, `rankingRevealModel.ts`, `rideDetailModel.ts`, `feedModel.ts`, `activityCard.tsx`, `RidesScreen.tsx`, `RoutesScreen.tsx`, `trendPanelModel.ts`, `resultsPlot.tsx`, `resultsPlotModel.ts`, `catalogMapView.tsx`, `CatalogDetailScreen.tsx`, `settings.tsx`, `demo_suite.ts`, any `legacy: true` allow entry, `cycles/virgin-cycle23/COMMANDS.md` (the coordinator updates its checklist item 12).

## 7. For the coordinator (OPEN-ITEMS / STATE, not edited by you — put this in the report)

"virgin-cycle25 brief 03: RESULTS tab removed; tab bar = record · activities · map · settings · demo. The per-way trend now lives in the MAP route sheet (brief 02). Removed with it: the all-time board, `ALL X ACTIVITIES · fastest first`, the free-activities section, the route → way drill-down, `BACK TO RESULTS`. Coordinator to-dos: update `cycles/virgin-cycle23/COMMANDS.md` on-device checklist item 12 (bottom button labels: BACK TO ACTIVITIES, RECORD ANOTHER, BACK TO ROUTE); STATE.md tab list; OPEN-ITEMS: Nathan may want the feed card's `P3/10` rank text reviewed against the rolling-window philosophy (C3 — it is window-relative, so consistent)."

## 8. Stop-on-ambiguity / report

As `EXECUTOR-RULES.md`. Report: steps; `git status --short`; test counts before/after; tsc; `git diff --stat`; every removed allow-list entry quoted (18); the §7 paragraph verbatim; any mismatch verbatim as a STOP.
