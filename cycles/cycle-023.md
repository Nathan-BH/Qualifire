# Cycle 023 — 2026-08-20

## Agenda
Implement 5 high/medium-priority fixes from GPS+ test-ride review (rides 1–3, 2026-08-20). Review findings: day-mode rendering bug, route-match sensitivity to poor GPS accuracy, elevation outliers, missing route-distance field, missing route-match diagnostics.

## What happened

**Tier 1 (Triage):** Sonnet subagent reviewed 3 GPX+ rides (180 KB / 47 KB / 45 KB, 921 / 233 / 226 points). Findings: route/sector backend works; UI rendering layer missing visuals (day mode). Off-route detection correct. Route lock failed on poor initial accuracy (97.7 m). Elevation outliers in all rides (+10.7 m, −13.5 m, +4.9 m spikes in 1s). No per-point route-distance field. No route-match diagnostics logged.

**Tier 2 (Plan):** Fable stage skipped per Nathan; brief written directly.

**Tier 3 (Execute):** Sonnet subagent implemented 5 fixes across 4 files:
- `app/src/live/engine.ts`: post-settle route-match retry (Issue 2) + diagnostic event emission (Issue 5a)
- `app/src/location/index.ts`: elevation outlier clamp (Issue 3) + accuracy feed to engine
- `app/src/ui/routeMapView.tsx`: MapLibre style-swap remount (Issue 1)
- `app/src/storage/gpxPlusExport.ts`: route-distance summary (Issue 4) + match-attempt render path (Issue 5b)

**Tier 4 (Inspect):** Fresh-context Fable subagent verified all changes. Findings:

| Issue | Verdict | Status | Notes |
|-------|---------|--------|-------|
| 1 (day-mode rendering) | PLAUSIBLE | Mergeable | Correct diagnosis (MapLibre style-swap race); needs device retest |
| 2 (route-match retry) | CONFIRMED | Mergeable | Correct logic; calibration note (good-accuracy rides also retry) |
| 3 (elevation outliers) | STOP | Blocker | Mutates raw JSONL, violates D-023 "raw forever" invariant. Fix: flag-don't-mutate via sidecar events (Option B), or explicit Nathan ratification |
| 4 (route-distance field) | CONFIRMED | Mergeable | Correct; minor follow-up guard on `refFor(track)` |
| 5a (diagnostics emit) | CONFIRMED | Mergeable | Correct logic; separate subscribe channel justified |
| 5b (diagnostics persist) | INCOMPLETE | Deferred | Scaffolded; not wired (needs `storage/types.ts` RideEvent union + location-index hookup) |

## Open questions

1. **Issue 3 rework or ratification?** Current implementation writes clamped elevation to raw JSONL, destroying barometer baseline — violates D-023. Inspector recommends flag-don't-mutate (raw `ele` untouched, outlier events in sidecar, clamp at export). Alternative: Nathan's explicit ratification that destructive clamping is acceptable. Decision pending.

2. **Issue 1 diagnosis confirmed on device?** Fix is plausible (remount on style-swap); matches symptom signature exactly. Day-vs-night timing asymmetry is inferred but unverified. Device ride in day mode will confirm.

3. **POOR_ACCURACY_M = 50 calibrated?** New constant, uncalibrated. Functionally safe (diagnostics only). Calibrate once Issue 5b's persisted attempts exist to calibrate against.

4. **Tests run before merge?** `node --experimental-strip-types tests/run.ts` and `npx tsc --noEmit` must be rerun in the real repo (could not run in inspection environment). Mandatory before commit.

## Deferred / fast-follow

- **Issue 5b wiring** — log as B-NN (route-match diagnostics persist). Small job: one RideEvent kind, one `subscribeDiagnostics` hookup in location-index, JSONL decode pass-through.
- **Issue 4 follow-up** — guard `refFor(track)` against unknown persisted track strings (currently throws, killing export).
- **Issue 2 calibration** — guard post-settle retry with `detectStartAccuracyM > POOR_ACCURACY_M` to avoid late-improvement false retries.

## Files touched

- `app/src/live/engine.ts` — 119 lines added (Issues 2, 5a)
- `app/src/location/index.ts` — 52 lines added (Issue 3, accuracy feed)
- `app/src/ui/routeMapView.tsx` — 23 lines added (Issue 1)
- `app/src/storage/gpxPlusExport.ts` — 110 lines added (Issues 4, 5b scaffold)

## Verdict (superseded — see Addendum below)

~~Not ready to commit~~ pending:
1. ~~Issue 3 decision (rework or ratification)~~
2. ~~Test verification on Nathan's PC~~
3. ~~Issue 3 rework (if not ratified)~~

Issues 1, 2, 4, 5a are ready to merge once tests pass + Issue 3 is resolved. Issue 5b stays open (scaffolded, wiring deferred).

---

*Reviewed by: Sonnet executor (225k tokens) → Fable inspector (91k tokens). Stops recorded per model-tier protocol.*

## Addendum — 2026-08-22: LANDED

This session found the above had never actually been written to the live repo — the 4 files were still byte-identical to cycle 021, matching the "Not ready to commit" verdict exactly. Since cycle 024 was gated on 023 landing, this addendum lands it for real, resolving every open item above:

**Tier 3 (Execute, Sonnet, this session):** all 5 fixes implemented fresh across 8 files (`engine.ts` +84, `location/index.ts` +43, new `location/elevationOutlier.ts` +50, `routeMapView.tsx` +10, `storage/types.ts` +29, `storage/eventsJsonl.ts` +3, `storage/gpxPlusExport.ts` +47, plus 15 new regression tests across 4 test files). **Issue 3 resolved via flag-don't-mutate** (the inspector's recommended option, not ratification-of-mutation): raw `ele` is never touched on disk; outlier detection (`ELEVATION_OUTLIER_RATE_MPS = 4`) emits a sidecar diagnostic event only. Issue 2's calibration guard (retry keyed on *initial* accuracy only) landed as specified. Issue 5b fully wired (not just scaffolded): `RideEvent` union in `types.ts`, `subscribeDiagnostics()` channel, sidecar append, GPX+ export pass-through.

**Tier 4 (Inspect, Opus standing in for Fable — no Fable available this week):** fresh-context adversarial review, independently reran tests/tsc, traced the D-023 raw-`ele` path hop-by-hop (clean — confirmed no mutation anywhere), verified the retry guard with a constructed good→degrade→improve case (correctly never retries), and mutation-tested the poor-accuracy regression test by disabling the fix and confirming it fails (not tautological). Found **one blocker**: `routeDistanceM` emitted the FINISH gate's raw absolute chainage (includes the non-zero ~162 m START offset) instead of START→FINISH distance, and its own test asserted the buggy value, ratifying the bug. Four non-blocking follow-ups also filed (remount fix is narrower than its stated failure class; camera state lost on a free-mode theme flip; a diagnostic can reference a fix that never reached the JSONL if `appendFix` throws; no test coverage of the `location/index.ts` wiring itself, headless-untestable).

**Blocker fixed (coordinator chore, <10 mechanical lines, no tier needed):** `routeDistanceM` now returns `gates[last].chainage - gates[0].chainage`; test constant corrected 5487 → 5325 (Morning); doc comment clarified.

**Final verification (both independently, before and after the chore fix):** `node --experimental-strip-types tests/run.ts` → **160 tests, 157 pass, 0 fail, 3 skip** (same 3 pre-existing benign skips). `node ./node_modules/typescript/bin/tsc --noEmit` → clean, exit 0.

**Verdict: LANDED.** All 5 issues merged and verified. Deferred (non-blocking, candidates for BACKLOG at bookkeeping): the 4 follow-ups above, plus the pre-existing Issue-1-on-device-retest and Issue-2/POOR_ACCURACY_M-calibration notes (unchanged from the original review — still unverified on a real device, still functionally safe as diagnostics-only).

*Landed by: Sonnet executor (296k tokens) → Opus inspector (107k tokens) → coordinator chore fix. Cycle 024 phase gate now clear.*
