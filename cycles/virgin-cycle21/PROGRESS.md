# virgin-cycle21 PROGRESS (executor log)

## Baseline (2026-10-04, before any edit)
- git status --short: only untracked `cycles/virgin-cycle22/` (+ this folder's scratch). Tree otherwise clean (HEAD already contains cycle 20; README said uncommitted).
- tests: 852 tests: 849 pass, 0 fail, 3 skip (README expected 838/835/0/3; count differs, no failures).
- tsc --noEmit: exit 0.

## Brief 01 (engine) - done
- engine.ts rewritten (1064 -> 611 lines): one candidate (the pick, filtered by wayIds first) from start(); phase 'locked' with a reference, 'detecting' without; no lock race/soft/verified/finalize recovery; no lock/lockChange events; finalize = unmatched iff the reference fired no gate; re-seed restricted to events.length===0; removed LOCK_*, ANCHOR_M, REACQ_JUMP_M, adv/anchored/wasOnWay discounting, lockKind/pickHonoured/anyAnchored/displayTrack.
- tests: 852 -> 840 (21 deleted/retired, 9 added). Zero FAIL, 3 skip. L7: old engine restored from copy fails all 9 new tests; new engine restored byte-identical.
- tsc after 01 (expected): src/location/index.ts (14 errors, lock/lockChange branches), src/ui/RecordScreen.tsx:1157 (displayTrack); plus two gitignored scratch scripts app/safe_to_delete/spot_wayids*.ts (moved with mv to repo-root safe_to_delete/app_safe_to_delete_cycle21/ so tsc does not compile them).

## Brief 02 (persist pick, remove plumbing) - done
- NEW src/location/sessionMarker.ts (pure parseSession; session.ts imports expo-file-system and cannot load headless); session.ts: ActiveSession.pickId + loadSession uses parseSession.
- location/index.ts: startTracking stores pickId; relaunch re-arm uses session.pickId; subscribeEvents is gate-only; comments updated.
- gpxPlusExport.ts: gateEvs hoisted; rideTrack/settledTrack; wayLock none only when no lock and no gate; legacy loops untouched.
- RecordScreen.tsx selfWayId -> live.track; comment-only edits colourModel/rankingRevealModel/routeCreation; app/tests/README.md Live-suite sentence (dated).
- tests: +1 session_suite (registered in run.ts), +2 gpxplus; 843 total, 0 FAIL, 3 skip. tsc exit 0. grep verification: removed-field names remain only in storage/types.ts, eventsJsonl.ts, gpxPlusExport.ts (legacy).

## Brief 03 (overlay = pick, dot on top) - done
- recordFlow.liveMapOverlayFor({wayHint}) one-arg; RecordScreen call passes rideWayHint only (rideWayHint set only at START ~679, cleared ~787/~1017; verified by grep).
- wayMapView.tsx: route, sector-spans, place, gate-ticks, gate-selected always mounted (module-level EMPTY_FC); rider stays last and conditional; comments updated.
- tests: recordflow overlay tests rewritten (+ source check), waymap_suite source-order test (failed before on the old wayMapView, restored from copy). Total 844, 0 FAIL, 3 skip; tsc exit 0.
- No ui-strings.allow.json changes (no rider-facing strings touched).

## Brief 04 (interrupted ride no resume) - STOPPED (2026-10-04, execute tier)
- Baseline 844/841/0/3 confirmed. Step 1 failed-before: recordflow_suite load error "does not provide an export named 'INTERRUPTED_MIN_FIXES'".
- Steps 2-8 applied (index.ts, session.ts, recordFlow.ts, RecordScreen.tsx, engine.ts, wayMapView.tsx, tests, ui-strings entry appended). Steps 9 (docs) NOT done.
- Run after edits: 848 tests / 843 pass / 2 fail / 3 skip. STOPPED on two failures the brief does not name:
  1. session_suite new test: `(src.match(/liveEngine\.start\(/g)).length === 1` sees 2: the comment at location/index.ts ~637 ("liveEngine.start() in startTracking and ensureSession"). Brief's grep verification 4 would also show 2 hits.
  2. ui_strings_suite "allowlist hygiene": entries must be sorted by file, kind, text; the brief's "append at end" entry (src/ui/RecordScreen.tsx|literal) sits after src/ui/wayMapView.tsx entries.
- Rulings R1/R2 applied; step 9 docs done (OPEN-ITEMS, COMMANDS, README). Run: 848 / 844 pass / 1 fail / 3 skip. New unnamed failure: session_suite "check stops updates and returns": the 400-char window after `if (s.rideId === interruptedRideId) {` ends before `return;` (at offset 440; stopLocationUpdatesAsync at 330). STOPPED, awaiting ruling.
