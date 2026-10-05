# virgin-cycle21 INSPECTION (Opus inspect tier, fresh context, 2026-10-04)

All checks rerun by the inspector on the live tree; HEAD (38002ff) extracted via `git archive` to a scratch copy outside the repo for baseline / failed-before / GPX+ differential runs (no repo file touched, no stash/checkout).

| # | check | result |
|---|-------|--------|
| 1 | tests 844 / 841 pass / 0 fail / 3 skip; tsc --noEmit exit 0 | PASS |
| 1b | baseline at HEAD 852 tests (849 pass after supplying repo-root .easignore to the scratch copy; the 1 residual fail is scratch-copy env) | PASS (executor baseline confirmed) |
| 2 | brief 01 grep on engine.ts: no hits; brief 02 grep: hits only storage/types.ts, eventsJsonl.ts, gpxPlusExport.ts (legacy); brief 03: live.track in RecordScreen only at 1074/1094/1098 (colours) and 1158 (selfWayId) | PASS |
| 3 | engine invariants (one candidate = pick filtered by wayIds first; no pick => 0 candidates, track null; gate-only EngineEvent; finalize unmatched iff events.length===0, idempotent; re-seed gated on events.length===0; pickId persisted + restored; liveMapOverlayFor({wayHint}); wayMapView sources always mounted, order unchanged, rider last) | PASS |
| 4 | deleted tests | PASS WITH NOTES |
| 5 | GPX+ old-sidecar byte identity: differential run old vs new buildGpxPlus over 10 sidecar shapes x refFor on/off = 20 cases, 0 diffs | PASS |
| 6 | sessionMarker split identical to old parse + pickId; app/core, IDEAS.md, process/ untouched; no D in git status; spot_wayids*.ts intact in safe_to_delete/app_safe_to_delete_cycle21/ (1715 B, 6124 B) | PASS |
| 7 | failed-before: new live/recordflow/waymap suites on HEAD source: L1-L6, L8, L9, both 03 tests and the pick-restored relaunch test all FAIL; session suite cannot load on HEAD (sessionMarker.ts absent) | PASS |

## Findings
- MAJOR — relaunch recovery loses the route line. `RecordScreen.tsx:443-475` (recovery branch, `rec.tracking`) never restores `rideWayHint` (only set at START :679). After a JS relaunch mid-ride, the engine gets its pick back (`location/index.ts:192`), but `liveMapOverlayFor({ wayHint: rideWayHint })` (:1058) gets null, so the live map shows only the trail: no route line, no gate ticks, no sector spans. Before cycle 21 the lock redrew the line after ~400 m. Brief 03 did not anticipate this path. Minimal fix: in the recovery branch, map `rec.session.pickId` to its way's `refLineId` and call `setRideWayHint`. Add a test for it.
- MINOR — retry-related tests were deleted without the OPEN-ITEMS log that brief 01 invariant 6 requires: `live: late anchor …` and `live cycle20-06 E5 …`. Both scenarios needed a re-seed after gate 0 had fired, which the new rule now forbids. That is consistent with the ruling, and L6 pins the new rule.
- MINOR — the executor's counts are slightly off. 22 tests were really deleted (20 live_suite, 1 live_colour, plus `liveMapOverlayFor: a lock outranks the pick hint` in recordflow, replaced by the 03 test). 14 were really added (L1-L6, L2b, L8, L9, 2 gpx+, session, 2 cycle-21 03 tests), not 12. 852 - 22 + 14 = 844, which matches.
- MINOR — stale comments: `RecordScreen.tsx:1060-1061` ("LOCKED route only: before the lock"), `RecordScreen.tsx:249,296-300,706,723,753,778` (lock wording), `wayMapView.tsx:~697` ("route source is conditional").
- MINOR — `engine.ts:258` `ended` is now write-only (dead field).
- NOTE — gpxPlusExport behaviour change, by design: a sidecar with gate events but no lock event now exports distance/fidelity instead of `<qf:wayLock>none</qf:wayLock>`. The old engine never wrote such a sidecar, so old rides are unaffected (the 20 differential cases cover every lock-bearing shape).

Verdict: needs one fix (the MAJOR relaunch overlay) before publish. Everything else is ready. JS only, so it can ship OTA, no build 8 needed.
