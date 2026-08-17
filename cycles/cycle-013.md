# Cycle 013 — 2026-08-17

Trigger: Nathan — B-44 fix, run as a **model-tier experiment** (Haiku triage → Fable brief → Sonnet executes → fresh Fable inspects). Process trial and bug fix in one.

## What shipped

**B-44 fixed and regression-locked.** `ghostsFor(routeId, excludeRideId?)` (colourModel.ts) drops today's `session:` rideId **before** the `slice(-WINDOW_N)`, so the window is the last N *prior* rides; threaded through `lapValues`/`sectorValues`; `ResultScreen.tsx` passes `session:${ride.atMs}` at all three call sites (null-ride path unchanged); `lastRide.ts` gains test-only `resetRecordedForTests()`. Purple is now reachable, `positionAmong` counts today once, `ranked` fires at 5 *prior* rides.

Evidence: new tests in `tests/live_colour_suite.ts` shown to FAIL pre-fix (purple impossible) and pass post-fix. Suite **96: 93 pass / 0 fail / 3 skip** (skips pre-existing parity-oracle skips), `tsc --noEmit` clean — both rerun independently by the inspector. No hardcoded seed counts: priors captured at test time (Morning seed has **9**, not 10; WINDOW_N is a cap, not a promise).

## Inspector findings (non-blocking, logged so they don't vanish)

1. **Transient post-STOP self-comparison in the live chip.** `RecordScreen.onStop` calls `rememberRide()` before `await stopTracking()`; for one render the live tower chip ranks against a window already containing today. Sub-second, display-only. Candidate fix: exclude-or-reorder in onStop.
2. **Pre-existing, out of scope:** ResultScreen ranks `lapMovingS ?? lapRawS` — a raw time can rank against moving-time ghosts when moving is null but not estimated, contradicting towerSource's raw-never-ranks rule. Worth a backlog item (Product Owner's call).
3. Value-based sector stand-in filter can coincidentally drop a ghost sector equal to today's float — trivial, pre-existing.

## Process notes (the actual experiment)

- Tiering worked: Haiku confirmed the bug + located files (~28k tokens); Fable wrote the brief; Sonnet executed (~158k tokens over two sessions); fresh-Fable inspected (~57k) and found real issues the executor didn't.
- **The escalation rule earned its keep:** the brief claimed "10 Morning seed ghosts"; the seed has 9. Sonnet stopped instead of hardcoding wrong numbers — planner error, corrected by ruling "derive counts at test time".
- No git in this repo: the inspector could only verify change surface by mtime. A repo under git would make the inspect tier much stronger.

Status updates: BACKLOG B-44 → DONE; STATE.md item 1 rewritten.
