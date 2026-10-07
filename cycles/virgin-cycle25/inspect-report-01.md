# Inspect report — brief-01 (plot cap 9 → 10) — INSPECT tier (Opus, fresh context)

**Verdict: PASS WITH NOTES** (no required fixes; notes are comment-only).
**Safe to ship OTA (JS only)?** Yes — 2 src files + 2 test files, all .ts, no native/config change.

## Checks

1. **Changed files** — `git status --short` (HEAD e7414a4): `M app/src/ui/demoModel.ts`, `M app/src/ui/resultsPlotModel.ts`, `M app/tests/demo_suite.ts`, `M app/tests/resultsmodel_suite.ts`; everything else untracked under `cycles/`. `git diff --stat`: 4 files, +67/−38. Exactly the brief's §5.7 list. `git diff HEAD --stat` on colourModel.ts, rankingRevealModel.ts, rankingreveal_suite.ts, live_colour_suite.ts: empty. resultsPlot.tsx, DemoScreen.tsx, ResultsDetailScreen.tsx, resultsListModel.ts, RoutesScreen.tsx untouched.
2. **Line-by-line vs brief** — every hunk matches §1a.1-5, §1b, §2a.1-4, §2b.1-3 verbatim (import WINDOW_N; `PLOT_N = WINDOW_N` with doc, line 24; header phrases; plotWindow doc; `yAt`/`buildYTicks`/`buildPlotModel` take `plotH`, default `PLOT_H`; empty branch and return use `plotH`; `windowCaption` appended byte-identical to resultsListModel.ts:267-269; demoModel imports/comment; test edits). No extra hunks. Only remaining caller `resultsPlot.tsx:74 buildPlotModel(results, plotW)` → default 220, behaviour unchanged.
   **Executor's deviation** (resultsPlotModel.ts:10 still says "it was WINDOW_PREV = 9 before"): confirmed harmless — it is inside the `/** */` header and is text the brief itself prescribed in §1a.3; acceptance §5.4's "grep → nothing" is self-contradictory in the brief. No code reference to WINDOW_PREV remains in the file (import is WINDOW_N only; tsc would fail otherwise).
3. **Tests / tsc (rerun by me)** — `node --experimental-strip-types tests/run.ts` → `925 tests: 922 pass, 0 fail, 3 skip` (skips = 3 parity-oracle fixtures, pre-existing) — `cycles/virgin-cycle25/run-inspect-01.log`. `tsc --noEmit` → exit 0, no output — `tsc-inspect-01.log`. No UNLISTED/STALE lines.
4. **Missed 9-assumptions** (grep of app/src, app/tests, App.tsx for PLOT_N, WINDOW_PREV, WINDOW_N, windowCaption, plotWindow, LAST 9, 0.875, /9, *9, [8]): no code that assumes a 9-dot plot remains. Remaining WINDOW_PREV uses are the ranking/ghost window (colourModel, DEMO_PRIOR_LAPS, selfRaceModel, tests pinning 9-previous) — correct per brief §4. resultsmodel_suite :285-291 `windowCaption(9)` is pure wording (input 9), fine; :507 "~1 year / 9 rides" now sits in slots 1-9 and still yields 2 x-ticks (passes). xAtSlot divides by `PLOT_N - 1` = 9 symbolically: slots at 300 px = 12.0 … 288.0, pitch 30.67 px.
   **TENTH arithmetic recomputed from DEMO_HISTORY by hand** (column sums 840, 830, 853, 844, 848, 835, 845, 865, 842; today DEMO_SECS 185+207+237+207 = 836): sum 8438, mean 843.8, old 9-dot sum 8438−840 = 7598 (matches the replaced literal). toneFor (min → fastest, < mean → faster, else slower): prior-2 fastest; 840/835/842/836 faster; 853/844/848/845/865 slower = **5**. Confirmed by running the real model (`safe_to_delete/inspect-c25-01/arith.ts`): 10 points, ids prior-1…prior-9 + demo:today, points[9] = demo:today at x = 288 = W − PAD_R, tone faster, caption `LAST 10 ACTIVITIES`; with plotH 110 all y in [16.9, 93.1].
   Mutation reasoning: reverting PLOT_N to WINDOW_PREV fails the 11-ride test (windowN 9 ≠ 10), the PLOT_N===WINDOW_N test and the 4 demo assertions; making yAt ignore plotH fails the new scaling test (short.y·2 ≠ tall.y). New tests are not vacuous.
5. **Ranking pool / live reveal unchanged** — colourModel.ts, rankingRevealModel.ts zero diff; WINDOW_N = 10 (:29), WINDOW_PREV = WINDOW_N − 1 (:36), ghostsFor/priorWindow slice(-WINDOW_PREV), rankingPoolFor unchanged. rankingreveal_suite.ts and live_colour_suite.ts unedited and pass.
6. **Rider-facing text** — `git diff -- app/tests/ui-strings.allow.json`: 0 bytes (no entry added/edited/removed). The new `windowCaption` copy produced no UNLISTED report. The only visible change is the DEMO caption value LAST 9 → LAST 10 ACTIVITIES via the same template (not a new string).

## Notes (MINOR, comment-only, no fix required for this brief)

- N1 `app/src/ui/resultsPlotModel.ts:8-11` header still says "The window is exactly `ghostsFor()`'s shape … so the two can never drift apart" — no longer true (ghostsFor = 9, plot = 10). Suggest rewording to "rankingPoolFor()'s pool size" in a later chore (brief 02/03 or a tidy pass).
- N2 `app/src/ui/demoModel.ts:322` doc still reads `'LAST 9 RIDES' / 'LAST 1 RIDE'` (pre-existing staleness, out of this brief's edit list).
- N3 `app/tests/resultsmodel_suite.ts:16` comment still mentions pulling WINDOW_PREV; file now imports WINDOW_N.
- N4 Executor deviation (WINDOW_PREV in the header, line 10) is brief-prescribed; acceptance §5.4 literal grep cannot pass by construction.
- N5 Informational: in the TENTH demo, prior-4 (844) is "slower" by only 0.2 s over the mean 843.8; any future edit to DEMO_HISTORY/DEMO_SECS can flip the pinned 5-slower count.
- Pre-existing, out of scope: `RecordScreen.tsx:151` comment claims "ghostsFor = last WINDOW_N" (it is WINDOW_PREV).

## Required fixes
None.

## For OPEN-ITEMS (from brief §7)
On-device check owed: 10 slots fit at phone width (pitch = (plotW − 24)/9; ≈ 30.7 px at 300, ≈ 33 dp at 320) on DEMO ending plot and RESULTS detail.
