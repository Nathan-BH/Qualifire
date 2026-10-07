# Inspect report: brief 06 (no estimates on flashes, no "lap" in gate alert, RESULTS "Not ranked")

Inspector: fresh-context Opus, 2026-10-07. Read-only on app code. Executor report not trusted: every check rerun.

## Verdict: SHIP-TO-DEVICE (JS only, OTA-safe; no native change)

0 BLOCKER, 0 MAJOR, 2 MINOR, 3 INFO.

## Checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1a | Suite | PASS | `923 tests: 920 pass, 0 fail, 3 skip`, 0 FAIL lines (`run-inspect-brief06.log`) |
| 1b | tsc --noEmit | PASS | EXIT=0, empty `tsc-inspect-brief06.log` (no safe_to_delete noise) |
| 2 | Brief §5 greps 4-7, 9-11 | PASS | §5.4 0 hits; §5.5 0 hits; §5.6 NOT_RANKED_LABEL added in resultsListModel.ts:11/206/249 and towerModel.ts:26/120, `'Not ranked'` literal only feedModel.ts:57 (+ comments resultsListModel.ts:206, tower.tsx:53); §5.7 1 / 0; routeFromRide diff = exactly the 4 edits; replayModel diff = :166 + 1 comment + :170 comment + doc fragments, :171-173 byte-identical |
| 3a | LIVE/RECORD clean ride unchanged | PASS | liveView.tsx diff: done-flash expression `{ tier: tierOf(k, scoredS(sec)), time: fmtSec(scoredS(sec) ?? sec.rawS, 1) }` identical; lap tier/time expressions identical; strip clean branch untouched; LiveSectorPane/LiveFlash/LapClock/consts no hunk. New lap guard `scoredS(st.lap) !== null` cannot drop a clean lap: engine.ts:589-591 sets movingS whenever !estimated && evStart && `stopped`, and `stopped` is null only when tBuf < 2 (engine.ts:512-517), impossible at a finish |
| 3a | LIVE est/missed gate | PASS | bigFromSector returns null for non-done or estimated; `flash` already typed `FlashModel \| null`; pane renders `flashOn && vm.flash ? LiveFlash : LapClock` so a null flash with a fresh flashKey shows the running clock; flash timer still cleared on its own; `lapScored=false` -> no handover timer, no stuck state. Interrupted sector = kind done, estimated false -> still flashes. Missed/current/pending -> null (was "– –") |
| 3a | DEMO | PASS | demoModel.ts no hunk, no `~` template |
| 3b | REPLAY | PASS | unranked ride (lapLabel '') -> lap null -> no blank clock; ranked/ignored-clean rides keep a real lapLabel -> flash unchanged; est/missed rows timeLabel '' -> `/\d/` rule skips them; detail `sectorTimeCell` blanks tier est (already); feed chips only on ranked cards (derive.ts:87-96: a clean/interrupted lap has no missed/estimated sector); replay strip `time` not rendered. buildSectorRows has one caller (rideDetailModel.ts:139) |
| 3c | Gate alert | PASS | body `the reference activity cannot be timed on these gates · move that gate where the activity passed` = 17 words (16 + "·"), no "lap", no em dash; :101/:483 dashes -> " · "; `.reason` read only at routeFromRide.ts:513; `cannot be timed` kept for c18-02 2 |
| 3d | RESULTS wording | PASS | only the two labels + JSX text + doc comments changed; grey colour (`noTime`), tier est, order untouched; no import cycle: feedModel.ts value imports only colourModel.ts, which imports seed/results/timing/types/lastRide, none of which reaches resultsListModel/towerModel |
| 4 | Forbidden paths | PASS | `git diff --stat` on src/live, derive, results, timing, storage, ResultsDetailScreen, ReplayScreen, chips, demoModel, rankingRevealModel, RecordScreen, GateAdjustScreen: empty |
| 5 | Allow-list | PASS | 452 entries, legacyCount 32, sorted, no dup keys, header keys unchanged. Set diff vs scratch/allow-pre-brief06.json: removed `rideHistoryModel.ts\|literal\|– did not traverse –`, `resultsListModel.ts\|literal\|NO TIME`, `towerModel.ts\|literal\|NO TIME`; in-place text edit `tower.tsx\|text\|TODAY · unranked` -> `TODAY · Not ranked` (reason/since/by unchanged: bootstrap, 2026-10-02). No new em dash, no new >40 entry. `preview/data.ts\|literal\|NO TIME` still present |
| 6 | New tests bite | PASS (live: source pin only, see M1) | replay 06: reverting :166 makes `done.lap` `{tier:'est',time:''}` -> fails; ui_strings 06: any "lap"/em dash back in routeFromRide.ts -> fails; c18-02 2 new assertion fails on the old 24-word body; ridehistory / resultsmodel / towermodel assert the new values. recordflow 06 + updated cycle22-04 lines are `includes` pins on liveView source |
| 7 | Rider-facing leftovers | see I1 | no `~` time template, `NO TIME`, `'no lap'`, `did not traverse`, `'– –'` in src/ui strings (only RecordScreen.tsx:133 `'~new'` internal id); brief-05 lap scan passes. Remaining em dashes in store errors that reach alerts: catalogMerge.ts:21,54 (+ routeCreation.ts:342,346 per brief §6) |

Pinned tests unedited: recordflow `virgin-cycle22 04` lines 512 and 514-519 unchanged (only 511/513 swapped as the brief's §3d table says); replay_suite :457-460 pin on `lastRow && /\d/.test(lastRow.timeLabel)` still matches.

## Findings

1. MINOR (test coverage) `app/tests/recordflow_suite.ts` (virgin-cycle23 06 test) / `virgin-cycle22 04`: the LIVE rule (est/missed gate -> flash null, estimated lap -> lap null, clean unchanged) is guarded only by `lv.includes(...)` source pins; no runtime test calls `viewModelFromEngine`. A rewrite that keeps the pinned lines but breaks behaviour elsewhere (e.g. the `flash` ternary) would pass. Minimal fix: one test feeding `viewModelFromEngine` a hand-built `LiveEngineState` (sectors [done clean, done estimated, missed], lastDone 2/3, lap {estimated:true} and a clean lap) and asserting flash null / lap null / clean flash time+tier.
2. MINOR (out of brief scope, rule 9) `app/src/store/catalogMerge.ts:21,54` and `app/src/store/routeCreation.ts:342,346`: em dashes in error strings that reach alerts; store is not scanned. Fix: same " · " swap plus extend the ui_strings 06 file pin to these files (chore).
3. INFO `app/src/ui/tower.tsx:181`: `TODAY · Not ranked` / tower today `Not ranked` at 40 sp would wrap in the 160 dp cell; unreachable today (rankingRevealModel never builds an unranked today). No change.
4. INFO `app/tests/ui-strings.allow.json`: the edited tower entry keeps reason "bootstrap: survived the cycle20 clutter audit" for a string that changed on 2026-10-07 (brief said keep). Cosmetic.
5. INFO `app/src/ui/rideDetailModel.ts:116`: free/none rides carry lapLabel '–'; replay is a route-ride feature so the new `lapLabel !== ''` guard does not cover it; not reachable as a finish flash today.

## On-device checklist (plain language)

1. RECORD a ride with a GPS gap or a skipped gate: at that gate nothing appears over the clock (no "~" time, no dashes); the clock just keeps running. Good gates still flash their time in colour. The bar under the clock says "S2", never "S2 ~".
2. RECORD finish of such a ride: no finish flash, the clock keeps running until STOP. A clean ride still flashes its finish time in colour, same as before.
3. REPLAY an activity that says "Not ranked": the big clock never goes blank, nothing flashes at the bad gate, the end line reads "replay over · GPS gap at a gate" (or "· a gate was missed").
4. REPLAY a ranked activity: gate flashes and finish flash exactly as before.
5. GATES: move a gate into a spot where the reference recording has no GPS: alert "Could not save the gates" with "the reference activity cannot be timed on these gates · move that gate where the activity passed" (no "lap", no long dash).
6. RESULTS -> a way -> history: an estimated/missed activity reads "Not ranked" in grey where it said "NO TIME"; the row does not wrap. An ignored but clean activity still shows its real time there (by design, brief §9.5).
7. DEMO: unchanged.
