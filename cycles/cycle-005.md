# Cycle 005 — 2026-08-14 (completed next session after a mid-cycle session-limit cutoff)

Trigger: Nathan, on demand. Members: Mobile Dev, Backend Dev (woken), QA (woken), Designer — parallel. QA + Designer were cut off by the session limit and relaunched to finish; both completed. Backend Dev ran twice (build, then F-1 fix).

## Agenda

1. B-24 — Phase-1 wiring (MD: UI + FGS location; BD: storage + GPX export, Principal-set interface contract)
2. QA harness — fixtures from real rides, headless suites
3. B-26 + B-25 — lap tier and Quali Day surfaces into LAYOUT + mockup (Designer)

## Decisions recorded

- **D-023** — storage v1 format (append-only JSONL, raw-forever, no cached benchmarks, no rebuild needed).

## Member summaries

- **Mobile Dev:** app/src/location + ui + App.tsx — FGS wiring, two-step permissions, relaunch recovery, SAF GPX export, battery-optimisation prompt. Rebuild verdict: NO. All untested-on-device by own rule; 8-step acceptance script written for Nathan.
- **Backend Dev:** app/src/storage to contract, expo-free pure layer, verified headless (crash recovery, GPX round-trip, tsc --strict clean). Fixed QA's F-1 (torn-tail heal) same cycle.
- **QA:** 9-fixture library from real rides; 44 tests, 41 pass / 0 fail / 3 benign skips; found F-1 (real bug, fixed, regression-locked); device-only checklist documented.
- **Designer:** repaired cutoff damage in mockup; lap chip at handover + board, two-part final-gate earcon, REFERENCE SET ceremony + defended/set choice, history rebalanced so demo margins clear the measured noise floor. Mechanically verified (node --check, tag balance, all handlers).

## Open after this cycle

- **Nathan's acceptance test** is the gate to calling B-24 DONE: `npx.cmd expo install expo-file-system` (JS-only sync), `npm.cmd run typecheck`, dev server, then the 8 steps on the phone — ideally including one real commute recording + GPX export.
- B-27 (new): on-bike earcon audibility — lap voice band flagged below wind-safe range.
- Designer question parked: should the quali choice card auto-collapse? (Current: waits forever.)

## Records check

All four role logs current; statuses flipped on the two woken roles. Every device-dependent claim labelled untested. app/err.log truncated to 0 by QA (deletion declined) — may be deleted by Nathan. Cycle file count: 5 — at the live cap; Librarian compacts cycle-001 into archive/ next cycle.
