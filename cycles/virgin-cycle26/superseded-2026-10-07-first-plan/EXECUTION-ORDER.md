# virgin-cycle26 — execution order

Written by the Plan tier (Fable) 2026-10-07 night from `00-nathan-ideas.md` (rulings 1-3), digests 01/02 and `03-plan.md`. Three briefs, all JS-only (OTA-publishable; no native change, no new dependency), each verifiable alone with the headless suite (`cd app && node --experimental-strip-types tests/run.ts` zero FAIL; `cd app && ./node_modules/.bin/tsc --noEmit` exit 0). Baseline at plan time: `923 tests: 920 pass, 0 fail, 3 skip`.

| # | brief | depends on | what lands | visible to Nathan? | new strings |
|---|---|---|---|---|---|
| 1 | `04-brief-01-record-picker-loops.md` | — | GOING TO offers the START place (Home → Home pickable); `recordFlow.routeForEndpoints` (pure, tested); 2 tests | YES (one more pill on RECORD) | 0 |
| 2 | `04-brief-02-engine-pass-aware-anchor.md` | — | `core/projection.ts` `PASS_GAP_M` + `passVertex`; live anchor + re-acq and offline anchor + re-acq go pass-aware; LOOP / OUT-AND-BACK synthetic fixtures; 7 tests | YES (loops and out-and-backs score; no t = 0 FINISH) | 0 |
| 3 | `04-brief-03-gates-on-retraced-ground.md` | **2** (appends to the same `projection.ts`, uses `PASS_GAP_M`) | `overlapChainages`; `seedGateChainages` 3rd argument + `OVERLAP_CLEAR_M`; `BuiltRideRef.overlapChainageM`; `routeFromRide.ts` ×2; `nextGateOnTap` + `wayMapView.tsx` tap handler; 5 tests | YES (gate positions on NEW retraced routes; editor tap) | 0 |

## Parallelism

Briefs 1 and 2 share no file and may run in parallel (two Sonnet executors on the same tree — each runs `git status --short` first and last and attributes hunks; `tests/run.ts` is edited by neither). Brief 3 starts only after brief 2's Inspect is PASS (or PASS WITH NOTES the coordinator accepts). Recommended: 1 ∥ 2 → inspect both → 3 → inspect.

## Pipeline per brief

Execute (Sonnet, `EXECUTOR-RULES.md`) → Inspect (fresh Opus, `INSPECTOR-RULES.md`) → coordinator forwards any escalation verbatim to a fresh Fable → next brief. The coordinator — never the executor — updates `STATE.md` / `OPEN-ITEMS.md` (the lines each brief's report hands over; see `03-plan.md` §7) and commits.

## What the Inspect pass must rerun, per brief

- **Brief 01:** suite (+2, zero FAIL) + tsc; `git diff --stat` = `RecordScreen.tsx`, `recordFlow.ts`, `recordflow_suite.ts` only; `RecordScreen.tsx` has exactly three hunks (import, lookup, filter); `grep "filter((l) => l.id !== fromId)"` → none; `ui-strings.allow.json` unchanged; `routeForEndpoints` predicate identical to the removed inline `find`; the source-pin test fails if the filter is restored.
- **Brief 02:** suite (+7, zero FAIL) + tsc; `engine_suite.ts` and every pre-existing `live_suite.ts` test UNEDITED (a diff inside an existing test is a finding); `git diff -- app/core/src/live.ts` = import + 2 call sites + 1 comment bullet; `projection.ts` = inserted block + 2 hunks in `projectRideOffline`, `nearestOnSegments`/`nearestVertex`/`CORRIDOR_M` byte-identical; `engine.ts` = 2 comment lines; `grep -n nearestVertex app/core/src app/src/live` hits only `projection.ts`; mutate-check (copy under `safe_to_delete/`): with `passVertex` → `nearestVertex` the five FAIL-before tests of brief 02 §5 fail; reason about ties (strict `<`, earlier pass wins; single pass ⇒ same index as `nearestVertex`).
- **Brief 03:** suite (+5, zero FAIL) + tsc; `demo_suite.ts:638` pin and the five pre-existing `gateseeding_suite.ts` tests unedited; `git diff -- app/src/ui/wayMapView.tsx` = import line + handler only, `gateSelect` prop type unchanged; `demoModel.ts` unchanged; `gateSeeding.ts` still import-free; `seedGateChainages(` call sites: `routeFromRide.ts` ×2 three-arg, `demoModel.ts` ×1 two-arg; mutate-check: `clear` without the overlap clause ⇒ `[16, 400, 800, 1200, 1584]`; `overlapChainages` skips `|Δch| ≤ gapM` before the distance test; `nextGateOnTap` semantics per its 9 assertions; no new string.

## Risks that could not be settled in the sandbox (→ OPEN-ITEMS when the briefs land; text in `03-plan.md` §7)

1. `[UNVERIFIED]` parity of `projectRideOffline` after `passVertex` (identical for single-pass references by construction; archive not on this branch).
2. Window ambiguity for passes < 240 m apart in chainage (tiny loops).
3. A second loop Route on one place (merge-made) is not reachable from RECORD.
4. Stacked ticks still draw on one pixel on the live/browse map (cosmetic).
5. On-device: the one-more-pill GOING TO row wraps one pill earlier on narrow phones — Nathan to eyeball.
