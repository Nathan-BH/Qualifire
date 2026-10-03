# Cycle 20 — execution log (coordinator-owned)

Started 2026-10-02 23:15 (Brussels). Nathan is away until the morning: no questions, ambiguity is logged here and execution continues.
Resume reminder (scheduled 2026-10-03 03:35 Brussels): trigger id `trig_01WuxztjrufFRFV2MVf1Uccq` — cancel with delete_trigger when everything is executed AND inspected.
Rules: no commits, no OTA/EAS publish, never delete (mv to safe_to_delete/), Sonnet executes one brief at a time in order, one fresh-context Opus Inspect per group reruns every check; executor escalations go verbatim to a fresh Fable.

## Plan (order matters: shared files)
| Step | Brief(s) | Group | Notes |
|---|---|---|---|
| E1 | 04 pause label | G1 | JS |
| E2 | 01 notification plain look | G1 | native -> build 8 |
| E3 | 03 notification body/timer | G1 | native -> build 8 |
| E4 | 05 ride -> activity (visible text) | G1 | JS + app.json iOS string (build 8) |
| I1 | Opus Inspect G1 (04,01,03,05) | | |
| E5 | 08 remove clutter | G2 | JS |
| E6 | 06 start-gate lag | G3 | JS (engine display-only) |
| E7 | 07 finish lap colour | G3 | JS |
| E8 | 10 second-ride sector strip colours | G3 | JS |
| E9 | 11 auto-detect start place | G3 | JS |
| E10 | 02 live dot soft snap | G3 | JS |
| E11 | 09 clutter guardrails (generate allowlist last) | G2 | tests/docs |
| I2 | Opus Inspect G2 (08, 09) | | |
| I3 | Opus Inspect G3 (06,07,10,11,02) | | |

## Progress
(append below: step, time, executor result, test counts, files, deviations)
- E1 brief 04 DONE (Sonnet). Baseline 784 tests/781 pass/0 fail/3 skip; after 785/782/0/3, tsc 0. Files: app/src/ui/RecordScreen.tsx (2 lines removed), app/tests/recordflow_suite.ts (+test). Failed-before step confirmed. JS-only.
- E2 brief 01 DONE after escalation: executor stopped on a brief self-contradiction (comment vs assert); fresh Fable ruled (assert pins the KEY via regex, check 3 split code-only/pins); brief 01 edited accordingly. Tests now 786 total / 783 pass / 0 fail / 3 skip, tsc 0. Native (Kotlin/res) -> build 8. Files: index.ts, QualifireRideNotificationModule.kt, raw/keep.xml, ridenotification_suite.ts, flame_large.png moved to safe_to_delete/virgin-cycle20-01/.
- E3 brief 03 DONE after escalation: executor stopped (tsc TS2741 notificationBody required in expo types; same comment-vs-assert defect). Fresh Fable ruled: keep body OUT, `as Location.LocationTaskServiceOptions` cast on the foregroundService literal; assert -> key regex; brief 03 edited. Tests 790 / 787 pass / 0 fail / 3 skip, tsc 0. Native (Kotlin ticker, build 8 with 01). Inspector: cast, Kotlin ticker lifecycle, first-post blank <=1 s.
- E4 brief 05 DONE after escalation: executor stopped on 3 false positives of the brief's own regression test; fresh Fable ruled (blank ${..} bodies before matching; one narrow allowlist for routeFromRide.ts:120 stored note); brief 05 edited. 23 files, 103 literal replacements, TAB_LABEL in App.tsx, app.json iOS string (build 8). Tests 791 / 788 pass / 0 fail / 3 skip, tsc 0.
- NEXT: I1 Opus inspect of G1 (04,01,03,05).
- I1 Opus inspect G1 (04,01,03,05): PASS, no blockers/majors. 791/788/0/3, tsc 0. MINOR 1 fixed by coordinator (chore <10 lines): rideNotification.ts stopRideNotification() now guards `native.stop?.()` in try/catch so a build-7 module without stop() can't break END. Unfixed minors (noted for Nathan): stop() not awaited (ms gap), `as` cast disables excess-property checks, Kotlin OnDestroy writes `ticking` off-main-thread, storage error messages still say 'ride' (deliberate), pre-existing '1 routes · 1 activities' grammar at sports.ts:216. SHIPPING: G1 = build 8 as ONE unit (01+03+04+05 together incl. app.json); do not OTA-split.
- NEXT: E5 brief 08.
- E5 brief 08 DONE (executor completed all steps; 7 deviations taken conservatively WITHOUT stopping — to be reviewed by Opus I2): (1) 'unknown ride' match via includes('endRide: unknown'); (2) brief's own comments/scrub lines reworded/tests narrowed (settings setCode view); (3) RideDetailScreen kept useSettings (s.sectorColours still used); (4) app/safe_to_delete/ResultScreen.tsx (archived, broke tsc via pbSectors) moved to repo-root safe_to_delete/virgin-cycle20-08/; (5) routeNamingCard placeholder 'e.g. Dry, Left, Fast' kept, test narrowed; (6) EM_DASH_ALERT_BODIES allowlist of 4 Alert bodies; (7) duplicate-name hint tail fully removed. Tests 788 / 785 pass / 0 fail / 3 skip, tsc 0. Notification title is now 'Recording activity'. JS-only, OTA-able.
- NEXT: E6 06, E7 07, E8 10, E9 11, E10 02, E11 09, then I2 (08,09) and I3 (06,07,10,11,02).
- E6 brief 06 PARTIAL: executor applied §1 (engine.ts, all (a)-(i), tests green 788/785/0/3) then STOPPED on two anchor drifts (brief 03 API {whenMs,label}; two helper literals). Fresh Fable ruled + re-anchored the WHOLE brief to the post-08 tree (baseline 788 -> expected 797 after) and added a 'Resume point: §1 applied, continue with §2'. Container restart killed nothing important (work is on the PC). NEXT: fresh Sonnet continues 06 from §2.
- E6 brief 06 DONE (Sonnet a8bffd2d97b5f7658): §2-§7 verified, failed-before check ok (5 fail when reverted), tests 797/794/0/3, tsc 0. NEXT: E7+E8 (07+10, one executor), E9+E10 (11+02, one executor), E11 09, then Opus I2 (08,09) + I3 (06,07,10,11,02).
- E7 brief 07 DONE (Sonnet a0d68f5f71155fbbe + Fable aa2c7a50399439236): executor STOPPED on tsc TS2345 (new URL in test 4); Fable ruled repo idiom path.resolve(TESTS_DIR,...) (recordflow_suite:214), fixed test + brief 07, ran greps/porcelain. Tests 801/798/0/3, tsc 0. Brief 10 anchors refreshed by Fable (expects 805/802/0/3 after). NEXT: E8 brief 10 + E9 brief 11 (one executor), then E10 02, E11 09, I2, I3.
- E8 brief 10 + E9 brief 11 DONE (Sonnet a8e8b761c687cafa0, no stops): 10 -> 805/802/0/3; 11 -> 812/809/0/3, tsc 0. NEXT: E10 brief 02 (expect +8 => 820/817/0/3), E11 brief 09, then Opus I2 (08,09) + I3 (06,07,10,11,02).
- E10 brief 02 STOPPED (Sonnet abff6226013a39599): anchor drift (getState chainageM now uses displayCand `disp` after 06). Fable a56c2eef5d13f847e ruled (b) riderSnapOf(disp); re-anchored brief, dry-run 820/817/0/3 tsc 0 in scratch; 04/05/08 confirmed landed. NEXT: Sonnet re-run 02 then 09 (expect 820/817/0/3 after 02), then Opus I2/I3.
- E10 brief 02 DONE (Sonnet ad62e04bade8a9c69): 820/817/0/3. E11 brief 09 code+allowlist DONE (833/830/0/3, tsc 0, plant test ok; 09-ALLOWLIST-REVIEW.md); docs §6-10 NOT applied (bridge dropped; verified none present at 2026-10-03 resume). process/README.md DOES have a `BETA-TESTERS.md` row (last table row) - anchor fine. Resume retry trigger trig_01FRuV2dKqZBcho4jGKeFCf7 fired; 03:35 trigger trig_01WuxztjrufFRFV2MVf1Uccq still to cancel at end. NEXT: Sonnet finishes 09 docs, then Opus I2 (08,09) + I3 (06,07,10,11,02).
- E11 brief 09 DONE (docs §6-10 by Sonnet ac9feac13e7c24526): 833/830/0/3, tsc 0. ALL EXECUTION DONE. Dispatching Opus I2 (08,09) + I3 (06,07,10,11,02) in parallel.
- I2 Opus a5b47317852bb4849 (~295k): 08 BLOCKER B1 (silent recovery races App store loading: markRideFree lost/overwritten; RecordScreen ~470-500, App.tsx 174-186, freeRides.ts) + minors m1-m5; all 7 deviations ACCEPT; 09 PASS WITH MINORS n1-n5 (n2: CONVENTIONS cites flashGpsOff/~2s, now flashSub/5s).
- I3 Opus af8654534f911def3 (~278k): 06 MAJOR (engine.ts:632 second finalize() wipes soft-locked ride sectors; fix `else if (this.lockKind==='none')` + regression test); 07 PASS; 10 PASS (stale comment RecordScreen:1067); 11 PASS w/ minors (app-active quiet read during running: guard by phase; native stack bounded); 02 PASS (ruling sound).
- NEXT: Fable writes fix brief 12 (B1, 06-MAJOR, app-active guard, stale comments, CONVENTIONS text; allowlist entries if strings change), Sonnet executes, Opus re-inspects fixes.
- Fable ae0d44d61e00dd191 wrote brief 12-inspect-fixes.md (dry-run 838/835/0/3 tsc 0; B1 via store/bootstrap.ts whenStoresReady gate; 06 finalize guard; app-active phase guard; stale comments; CONVENTIONS text). NEXT: Sonnet executes 12, then Opus I4 re-inspect.
- E12 brief 12 DONE (Sonnet a652777bd75019480): 838/835/0/3 tsc 0, failed-before ok, no allowlist change. NEXT: Opus I4 re-inspect brief 12.
- I4 Opus ad989a15511b7ee30 (~148k): brief 12 PASS WITH MINORS (no blockers). Open minors for Nathan: (1) recovery wait widens a pre-existing START race (RECORD+START tapped before store chain finishes -> startTracking returns the dead session; fix = recoveryPending flag gating RECORD/START); (2) resultsPlot.tsx:59 stale 'rankings are off' comment; (3) rideHistoryModel.ts:113 comment says "Free ride"; (4) bootstrap.ts header overclaims; (5) theoretical backfill ordering. Earlier open minors: G1 (stop() not awaited; `as` cast; Kotlin OnDestroy ticking off-main-thread; storage errors say "ride"; sports.ts:216 grammar), 08 m1-m5 (m4: tsconfig exclude for app/safe_to_delete is Nathan's call), 09 n1-n5, 06 weak tests L1/L3, 07 map-line memo has no ride exclusion, 11 native request stacking bounded.
- ALL DONE 2026-10-03. Final tree: 838 tests / 835 pass / 0 fail / 3 skip, tsc 0. 03:35 resume trigger cancelled.
