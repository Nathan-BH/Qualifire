# brief-01 — plot cap 9 → 10 (PLOT_N follows WINDOW_N), plot height as a parameter, windowCaption moves to the plot model

**Cycle:** virgin-cycle25. **Source:** `00-nathan-decisions.md` decision 6 + Correction C1 (binding: the plot shows up to 10 dots = the same pool as the ranking; keep the plot's existing look, C2), digest `02-map-panel-digest.md` §3. Written by the Plan tier (Fable) 2026-10-07 night; anchors re-read at commit `e7414a4` (`vcycle25+26 digests and notes`, clean tree).

**Tier:** Execute = Sonnet, alone, under `cycles/virgin-cycle25/EXECUTOR-RULES.md`. STOP-ON-AMBIGUITY.

**Run order: FIRST.** No dependency. Pre-flight: `GIT_OPTIONAL_LOCKS=0 git status --short` is empty (or shows only `cycles/` files), and `grep -n "export const PLOT_N = WINDOW_PREV;" app/src/ui/resultsPlotModel.ts` prints line 21; else STOP.

## Goal

Model-only change, no screen file touched. After this brief the scatterplot (`resultsPlotModel.ts` / `resultsPlot.tsx`, shown today on the RESULTS detail and the DEMO tab) draws up to **10** dots — the exact ranking pool `WINDOW_N` of `colourModel.ts` — instead of 9. Nothing else about the plot changes (dot colours, slot grid, ticks, caption text). Two small preparations for brief 02 land here because they are pure model work: `buildPlotModel` takes an optional plot height, and `windowCaption` gets a home in the plot model (its only non-RESULTS consumer is DEMO). Every hard-coded 9 in the plot tests moves to 10 with the arithmetic recomputed below.

## 0. What the code does today (verified anchors)

- `app/src/ui/resultsPlotModel.ts` (211 lines):
  - `:16` `import { WINDOW_PREV, fmt } from './colourModel.ts';`
  - `:21` `export const PLOT_N = WINDOW_PREV;`
  - `:24` `export const PLOT_H = 220;`
  - header `:1-12` says "the last WINDOW_PREV ranked rides" and "the same `WINDOW_PREV` constant, re-exported as PLOT_N".
  - `:81-91` `plotWindow(results)` = `results.filter(ranks).slice().sort(asc startedAtMs).slice(-PLOT_N)` — includes today's ride once stored (C1: what falls off is the OLDEST ride).
  - `:138-140`:
    ```ts
    function yAt(timeS: number, yMin: number, yMax: number): number {
      return ((timeS - yMin) / (yMax - yMin)) * PLOT_H;
    }
    ```
  - `:153` `function buildYTicks(yMin: number, yMax: number, meanY: number): PlotTick[] {` and inside it `:161` `    const at = yAt(v, yMin, yMax);`
  - `:183` `export function buildPlotModel(results: RideResult[], plotW: number): PlotModel {`
  - `:188` `      points: [], plotW, plotH: PLOT_H, yMin: 0, yMax: 0, meanS: null, meanY: null,`
  - `:203` `    y: yAt(times[i], yMin, yMax),`
  - `:207-208`:
    ```ts
      const meanY = yAt(meanS, yMin, yMax);
      const yTicks = buildYTicks(yMin, yMax, meanY);
    ```
  - `:210` `  return { points, plotW, plotH: PLOT_H, yMin, yMax, meanS, meanY, yTicks, xTicks, windowN, empty: 'none' };`
  - `PlotModel.plotH` (`:57`) already exists in the output type.
- `app/src/ui/colourModel.ts` `:29` `export const WINDOW_N = 10;` and `:36` `export const WINDOW_PREV = WINDOW_N - 1;` — NOT touched by this brief (the ranking pool, ghosts, priorWindowFor, DEMO's `DEMO_PRIOR_LAPS.tenth` all stay at 9 previous rides).
- `app/src/ui/resultsListModel.ts` `:267-269`:
  ```ts
  export function windowCaption(n: number): string {
    return `LAST ${n} ${n === 1 ? 'ACTIVITY' : 'ACTIVITIES'}`;
  }
  ```
  (this file is removed by brief 03; its copy stays until then — ResultsDetailScreen.tsx `:29-31` still imports it from here.)
- `app/src/ui/demoModel.ts` `:35` `import { buildHistoryBoard, windowCaption } from './resultsListModel.ts';   // pure over a results array (brief 08)` and `:36` `import { plotWindow } from './resultsPlotModel.ts';                          // the real plot's own window rule (brief 08)`. `:303` comment `*  its own plotWindow() keeps the last PLOT_N ranked (TENTH: priors 2-9 + today, 9 dots;`.
- `app/src/ui/resultsPlot.tsx` uses `PLOT_H` at `:101`, `:109`, `:126` — NOT touched here (brief 02).
- Tests (hard-coded 9 or symbolic WINDOW_PREV, all listed in digest §3.6):
  - `app/tests/resultsmodel_suite.ts` `:29-38` imports (`windowCaption` from resultsListModel, `WINDOW_PREV` from colourModel); `:305` `assert(window.length === WINDOW_PREV, ...)`; `:309` `const expectedIds = rankedRides.slice(-WINDOW_PREV).map((r) => r.rideId);`; `:457-464` the "10+ ranked rides" test builds 10 rides and asserts `WINDOW_PREV` twice.
  - `app/tests/demo_suite.ts` `:718-723` TENTH window test (`w.length === 9`, first id `demo:prior-2`); `:725-744` TENTH model arithmetic (9 points, `points[8]`, 4 slower, `7598 / 9`); `:779-783` caption `LAST 9 ACTIVITIES`. `:31` imports `WINDOW_N, WINDOW_PREV` already. `:49` imports `buildPlotModel, plotWindow, PLOT_N, PAD_R`.
  - `tests/rankingreveal_suite.ts :225/:243` and `tests/live_colour_suite.ts` pin the 9-previous / 10-pool split of colourModel — they do NOT reference PLOT_N and must pass UNEDITED.

Recomputed TENTH arithmetic with 10 dots (run on the device tree, `safe_to_delete/virgin-cycle25-plot10-arithmetic.ts`): window ids `demo:prior-1 … demo:prior-9, demo:today`; times `[840, 830, 853, 844, 848, 835, 845, 865, 842, 836]`, sum **8438**, mean **843.8**; tones `faster, fastest, slower, slower, slower, faster, slower, slower, faster, faster` → today (index 9) `'faster'`, exactly one `'fastest'` = `demo:prior-2`, **5** `'slower'`. Lopsided script (`[100,100,100,100]`): today 400 is `'fastest'`, position `P1 of 10` (unchanged).

## 1. Changes, file by file

### 1a. `app/src/ui/resultsPlotModel.ts`

1. Replace `:16` `import { WINDOW_PREV, fmt } from './colourModel.ts';` with `import { WINDOW_N, fmt } from './colourModel.ts';`
2. Replace `:21` `export const PLOT_N = WINDOW_PREV;` with:
   ```ts
   /** virgin-cycle25 brief 01 (Nathan decision 6 / C1): the plot shows the same
    * pool the ranking uses — WINDOW_N = today + 9 previous — so the dots and
    * the P-of-10 rank describe the same rides. What falls off is the oldest. */
   export const PLOT_N = WINDOW_N;
   ```
3. Header comment `:1-12`: replace the two phrases `the last WINDOW_PREV ranked rides on a way` → `the last WINDOW_N ranked rides on a way` and `the same \`WINDOW_PREV\` constant, re-exported as PLOT_N` → `the ranking pool's own \`WINDOW_N\` constant, re-exported as PLOT_N (virgin-cycle25 01; it was WINDOW_PREV = 9 before)`. Also in the `plotWindow` doc `:82` replace `` `WINDOW_PREV` constant `ghostsFor()` uses `` with `` `WINDOW_N` pool size `rankingPoolFor()` uses ``.
4. Plot height becomes a parameter (default = today's constant; no caller changes behaviour):
   - `:138-140` → 
     ```ts
     function yAt(timeS: number, yMin: number, yMax: number, plotH: number): number {
       return ((timeS - yMin) / (yMax - yMin)) * plotH;
     }
     ```
   - `:153` → `function buildYTicks(yMin: number, yMax: number, meanY: number, plotH: number): PlotTick[] {` and `:161` → `    const at = yAt(v, yMin, yMax, plotH);`
   - `:183` → `export function buildPlotModel(results: RideResult[], plotW: number, plotH: number = PLOT_H): PlotModel {`
   - `:188` → `      points: [], plotW, plotH, yMin: 0, yMax: 0, meanS: null, meanY: null,`
   - `:203` → `    y: yAt(times[i], yMin, yMax, plotH),`
   - `:207-208` → `  const meanY = yAt(meanS, yMin, yMax, plotH);` / `  const yTicks = buildYTicks(yMin, yMax, meanY, plotH);`
   - `:210` → `  return { points, plotW, plotH, yMin, yMax, meanS, meanY, yTicks, xTicks, windowN, empty: 'none' };`
   - add one line to the `buildPlotModel` doc comment (just above `:183`): ` * \`plotH\` (virgin-cycle25 01): the plot's pixel height; defaults to PLOT_H (220) for the DEMO card, brief 02's MAP panel passes a smaller one.`
5. Append at the end of the file:
   ```ts

   /** virgin-cycle25 brief 01: the plot's own caption — 'LAST 10 ACTIVITIES' /
    * 'LAST 1 ACTIVITY' over `plotWindow(...).length`. Moved here from
    * resultsListModel.ts (RESULTS tab, removed by brief 03); DEMO is its consumer. */
   export function windowCaption(n: number): string {
     return `LAST ${n} ${n === 1 ? 'ACTIVITY' : 'ACTIVITIES'}`;
   }
   ```
   (Byte-identical body to the resultsListModel.ts copy, so the ui-strings extractor sees the same shape; it produced NO entry for that copy. If the suite reports an UNLISTED string for `src/ui/resultsPlotModel.ts` whose text starts with `LAST `, append it: kind as reported, reason "cycle25 01: plot caption, moved from resultsListModel", since today, by "Sonnet execute, virgin-cycle25 brief 01" — this one case is pre-authorised, anything else STOP.)

### 1b. `app/src/ui/demoModel.ts`

- `:35` → `import { buildHistoryBoard } from './resultsListModel.ts';   // pure over a results array (brief 08); goes with brief 03`
- `:36` → `import { plotWindow, windowCaption } from './resultsPlotModel.ts';   // the real plot's own window rule + caption (brief 08, cycle25 01)`
- `:303` comment: `(TENTH: priors 2-9 + today, 9 dots;` → `(TENTH: priors 1-9 + today, 10 dots — virgin-cycle25 01;`

### 1c. `app/src/ui/DemoScreen.tsx`

Nothing. (Its comments say "RESULTS tab" — brief 03 handles the string; comments are not rider-facing.)

## 2. Tests

### 2a. `app/tests/resultsmodel_suite.ts`

1. Imports `:29-38`: remove `windowCaption,` from the resultsListModel destructuring (`:30` becomes `  buildResultsList, buildHistoryBoard, boardCaption,`) and add `windowCaption,` to the resultsPlotModel destructuring (`:36` becomes `  xAtSlot, slotIndex, PLOT_N, X_TICK_MIN_GAP_PX, windowCaption,`). Replace `:38` `const { WINDOW_PREV } = await import('../src/ui/colourModel.ts');` with `const { WINDOW_N } = await import('../src/ui/colourModel.ts');`
2. `:305` → `  assert(window.length === PLOT_N, \`expected ${PLOT_N}, got ${window.length}\`);` and `:309` → `  const expectedIds = rankedRides.slice(-PLOT_N).map((r) => r.rideId);` (12 ranked rides are built, so 10 fit).
3. `:457-464` becomes (title and body):
   ```ts
   test('resultsmodel: buildPlotModel — 11+ ranked rides: exactly PLOT_N (= WINDOW_N = 10) dots, oldest ranked ride excluded', () => {
     const eleven = Array.from({ length: 11 }, (_, i) => mk(`n${i}`, (i + 1) * 10_000, 600 - i));
     const model = buildPlotModel(eleven, 300);
     assert(model.windowN === WINDOW_N, `expected windowN ${WINDOW_N}, got ${model.windowN}`);
     assert(model.points.length === WINDOW_N, `expected ${WINDOW_N} points, got ${model.points.length}`);
     assert(!model.points.some((p) => p.rideId === 'n0'), 'the oldest ranked ride (n0) must be excluded from the plot');
     assert(model.points.some((p) => p.rideId === 'n1'), 'the 10th-newest ride (n1) is now on the plot');
   });
   ```
4. Add, right after that test, two new tests:
   ```ts
   test('virgin-cycle25 01: PLOT_N is the ranking pool WINDOW_N (10), not WINDOW_PREV', () => {
     assert(PLOT_N === WINDOW_N && WINDOW_N === 10, `PLOT_N ${PLOT_N} / WINDOW_N ${WINDOW_N}`);
     assert(windowCaption(10) === 'LAST 10 ACTIVITIES' && windowCaption(1) === 'LAST 1 ACTIVITY', 'caption moved with the plot model');
   });

   test('virgin-cycle25 01: buildPlotModel honours a custom plotH (y, meanY and ticks scale; default stays 220)', () => {
     const rides = [mk('h0', 1000, 600), mk('h1', 2000, 660), mk('h2', 3000, 630)];
     const tall = buildPlotModel(rides, 300);
     const short = buildPlotModel(rides, 300, 110);
     assert(tall.plotH === 220 && short.plotH === 110, `plotH ${tall.plotH} / ${short.plotH}`);
     for (let i = 0; i < 3; i++) assert(Math.abs(short.points[i].y * 2 - tall.points[i].y) < 1e-9, `point ${i} y does not scale`);
     assert(short.meanY !== null && tall.meanY !== null && Math.abs(short.meanY * 2 - tall.meanY) < 1e-9, 'meanY does not scale');
     assert(short.yTicks.length === tall.yTicks.length, 'tick count must not depend on height');
     for (let i = 0; i < short.yTicks.length; i++) assert(Math.abs(short.yTicks[i].at * 2 - tall.yTicks[i].at) < 1e-9, `tick ${i} at does not scale`);
     assert(short.points.every((p) => p.y >= 0 && p.y <= 110), 'short points inside the plot');
   });
   ```
   (The label-collision rule uses pixels, so a tick label may be null in one height and not the other — the test compares `at` only, never `label`.)
5. `:285-291` (`boardCaption / windowCaption wording`): leave the assertions as they are (`windowCaption(9)` is still 'LAST 9 ACTIVITIES' for input 9); only the import source changed.

### 2b. `app/tests/demo_suite.ts`

1. `:718-723` →
   ```ts
   test('demoModel: plot — TENTH window is priors 1-9 + today (the real slice(-10), cycle25 01)', () => {
     const w = plotWindow(demoPlotResults('tenth', T));
     assert(w.length === 10, `expected window length 10, got ${w.length}`);
     assert(w[0].rideId === 'demo:prior-1', `expected first id 'demo:prior-1', got ${w[0].rideId}`);
     assert(w[w.length - 1].rideId === DEMO_TODAY_RIDE_ID, `expected last id DEMO_TODAY_RIDE_ID, got ${w[w.length - 1].rideId}`);
   });
   ```
2. In `:725-744` change exactly these lines: `assert(m.points.length === 9, \`expected 9 points, got ${m.points.length}\`);` → `=== 10` / `expected 10 points`; `const today = m.points[8];` → `m.points[9]`; `expected points[8] to be today` → `points[9]`; `assert(slower.length === 4, \`expected 4 slower points, got ${slower.length}\`);` → `=== 5` / `expected 5 slower points`; `assert(Math.abs(m.meanS - 7598 / 9) < 1e-6, \`expected meanS ~${7598 / 9}, got ${m.meanS}\`);` → `8438 / 10` in both places. The `fastest` assertion (`demo:prior-2`) and today's tone `'faster'` stay (verified above).
3. `:779-783`: `'LAST 9 ACTIVITIES'` → `'LAST 10 ACTIVITIES'` (both occurrences on the line).
4. Everything else in demo_suite (incl. `:289` `DEMO_HISTORY[i].length === 9`, `DEMO_PRIOR_LAPS.tenth === WINDOW_PREV`, `:767` `P3 of 10`) stays UNEDITED.

Expected: `923 tests: 920 pass, 0 fail, 3 skip` → `925 tests: 922 pass, 0 fail, 3 skip`. If any other test than the ones listed fails after the edits, STOP and report it verbatim (do not edit it).

## 3. Visible text

None added or removed. `windowCaption`'s template is copied byte-for-byte (see 1a.5 for the one pre-authorised contingency). `git diff -- app/tests/ui-strings.allow.json` is expected to be EMPTY.

## 4. Decisions already made (Planner rulings)

- PLOT_N = WINDOW_N (not a new constant): the plot and the rank say the same thing; the two can never drift (same reason the old code aliased WINDOW_PREV).
- `WINDOW_PREV` and everything built on it (ghosts, reveal, DEMO priors = 9) are untouched: the comparison window for a ride is still "9 previous"; only the plot's cap changes.
- `plotH` is a defaulted parameter, not a second function: every existing caller (DEMO, RESULTS detail until brief 03, tests) keeps 220.
- `windowCaption` lives with the plot model; resultsListModel's copy dies with the file in brief 03.

## 5. Acceptance

1. Pre-flight passes.
2. `cd app && ./node_modules/.bin/tsc --noEmit` exit 0 (tee to `cycles/virgin-cycle25/tsc-brief01.log`, `timeout_ms: 180000`; an empty log = timeout, rerun).
3. `cd app && node --experimental-strip-types tests/run.ts` → `925 tests: 922 pass, 0 fail, 3 skip` (tee to `cycles/virgin-cycle25/run-brief01.log`; baseline log `run-brief01-baseline.log` before any edit).
4. `grep -n "WINDOW_PREV" app/src/ui/resultsPlotModel.ts` → nothing. `grep -n "export const PLOT_N = WINDOW_N;" app/src/ui/resultsPlotModel.ts` → one line. `grep -c "plotH" app/src/ui/resultsPlotModel.ts` ≥ 9.
5. `grep -n "windowCaption" app/src/ui/demoModel.ts` → only the resultsPlotModel import line and the `demoPlotCaption` body.
6. `git diff -- app/tests/ui-strings.allow.json` empty (or exactly the one pre-authorised entry, quoted in the report).
7. `git status --short` = `M app/src/ui/resultsPlotModel.ts`, `M app/src/ui/demoModel.ts`, `M app/tests/resultsmodel_suite.ts`, `M app/tests/demo_suite.ts` (+ `cycles/virgin-cycle25/` logs). Nothing else.

## 6. Out of scope — do NOT touch

`colourModel.ts`, `resultsPlot.tsx`, `DemoScreen.tsx`, `ResultsDetailScreen.tsx`, `ResultsScreen.tsx`, `resultsListModel.ts` (brief 03 removes it), `RoutesScreen.tsx` (brief 02), `rankingreveal_suite.ts`, `live_colour_suite.ts`, `recordflow_suite.ts`, any `legacy: true` allow entry.

## 7. For the coordinator (OPEN-ITEMS, not edited by you — put this in the report)

"virgin-cycle25 brief 01: plot now shows 10 dots (= ranking pool). The RESULTS detail (until brief 03) and the DEMO ending plot both show 10 dots; the DEMO caption reads LAST 10 ACTIVITIES. On-device check owed: 10 slots fit at phone width (slot pitch ≈ (plotW − 24)/9; at 320 dp plot width that is ≈ 33 dp between 10-dp dots)."

## 8. Stop-on-ambiguity / report

As `EXECUTOR-RULES.md`. Report: steps done; `git status --short`; test counts before/after (quote the summary lines); tsc result; `git diff --stat`; allow-list diff (expected empty); the §7 paragraph verbatim; anything that did not match this brief, verbatim, as a STOP.
