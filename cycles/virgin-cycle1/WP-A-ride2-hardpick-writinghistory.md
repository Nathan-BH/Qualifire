# WP-A — Ride-2 engine fix + hard-pick lock + "writing history" status line

**Status: DONE. Landed on the device (`app/src/live/engine.ts`, `app/src/ui/RecordScreen.tsx`,
`app/tests/live_suite.ts`, `app/tests/live_colour_suite.ts`, `app/tests/resultsstore_suite.ts`)
on 2026-09-02. Test suite: 305 tests, 302 pass, 0 fail, 3 skip. `tsc --noEmit` NOT run anywhere
this session — see CONTEXT.md's environment notes; run it yourself if `device_bash` is still
down for the coordinating chat.**

Review doc items covered: **1** (recognize an unmatched/virgin ride), **1a** ("writing
history" status line), **12** (route pick enforcement, notes5 N4).

## What actually shipped (three rounds — read this before assuming the design is simpler than it is)

### Round 1 — the original three-piece brief

1. **`finalize()` anchored guard.** `GateDetector`'s D-016(b) arming resolves every gate a
   candidate's *first* fix already lies past. A ride that merely starts near a route's far
   end (2026-09-01 ride 2: Work→Home ridden against the only catalog route, Home→Work)
   therefore reaches `nextGateIndex === gates.length` before riding a single metre.
   `finalize()`'s old filter (`nextGateIndex >= gates.length` alone) treated that as "completed
   its own route." First fix: require `Candidate.anchored` (joined within `ANCHOR_M`=300m of
   its own start) too.
2. **RECORD-tab pick made a hard lock** (Nathan 2026-08-29, notes5: "what you pick should stay
   locked until the end"). Previously the engine could switch mid-ride to whatever route the
   rider actually rode, even against an explicit pick. Rewrote `evaluateLockState()` so, under
   a pick, only the pick's own candidate can ever lock (soft/verified/finalized) — no switches,
   ever. A wrong pick that never earns even a soft lock leaves the ride unmatched rather than
   silently reassigned.
3. **"Writing history" status line.** Added `anyAnchored` to `LiveEngineState`; `RecordScreen`'s
   rotating status carousel shows a "writing history" line instead of "detecting route…" once
   a few fixes have been fed and no candidate has anchored anywhere.

Three existing tests (`pick wrong…`, a prefix-stall sub-case, the "B1 regression" test) directly
asserted the OLD "ridden road wins over the pick" behaviour and were rewritten to the new
ruling, per an explicit Plan-tier brief (not guessed by Execute).

### Round 2 — a stop, forwarded to a fresh Plan pass

Execute found ONE more test (`tests/live_colour_suite.ts`'s cycle024 test) also encoding the
old "ridden road wins" rule, outside the three files the original brief scoped. Per the
stop-on-ambiguity rule this went to a fresh Fable, which rewrote that test to the hard-pick
ruling (a wrongly-picked ride that never locks records NOTHING — no ghost, no rank, under
either route) and fixed three stale RecordScreen.tsx comments/captions that still described
the superseded "the pick is intent" behaviour.

### Round 3 — a real defect caught by Inspect, fixed by a second Plan ruling

A fresh-context Inspect pass (adversarial re-check, no memory of the above) found that Round
1's `anchored` guard **over-excludes**: it also throws away *legitimate* finishes where GPS
accuracy is poor for the first ~400m and a cycle-023 retry re-seeds the projector — resetting
`anchored` to `false` *permanently*, since projection is forward-only and can never re-anchor
past `ANCHOR_M`. Confirmed with a concrete repro (a route ridden start-to-finish, real gate
fires and all, thrown away as "unmatched" under Round 1's guard).

**The actual, final guard** (a second fresh Plan ruling, verified against the code, NOT
guessed): completion evidence is `LOCK_MIN_ADVANCE_M` (400m) of corridor-verified advance
measured **before the candidate's own FINISH gate** (via `c.baseS`, the chainage the current
projector segment was seeded at) — not `anchored`. This correctly:
- excludes ride 2's artifact (advance before FINISH ≤ 0),
- excludes riding a route's polyline *tail past its own FINISH* (a bare `adv >= 400` would
  wrongly admit this — EveningB's reference line runs 601m past its own FINISH gate),
- and does NOT exclude a legitimate late-anchoring finish (500m of real advance before FINISH
  survives even though `anchored` itself never flips true again after the retry).

Two new tests lock in exactly this distinction (`live: late anchor — …`, `live: tail ride —…`),
alongside the original ride-2 regression test (renamed to reflect "completion-evidence guard"
rather than "anchored guard").

## Commits (cloud mirror, this session's container — see CONTEXT.md, likely gone in a fresh session)

- `0b27e23` — Round 1 (three pieces)
- `447c2ba` — Round 1 follow-on (cycle024 test + stale comments)
- `ec46906` — Round 3 (completion-evidence guard replaces `anchored`; six more stale-comment
  fixes; two new tests; `anyAnchored` assertions added to the cycle025 test)

## What to test on the phone

1. Ride the reverse direction of an existing route (like 2026-09-01's ride 2) — it should now
   come back **unmatched** at STOP: naming/save offer appears, exactly like a first-ever ride,
   instead of silently "matching" the existing route the wrong way.
2. Pick a specific route on the RECORD tab, then deliberately ride a *different* road for most
   of the ride — the app should never quietly re-label the ride as the road you actually took;
   it should stay on your pick (soft-locked/partial, or unmatched if you never got 400m onto
   it), even if that "wastes" the ride.
3. On a ride where nothing is being recognized (new road, or a wrong pick), the status line
   where "GPS-live"/"detecting route…" normally alternates should start showing a
   "writing history"-style line after the first few seconds.
4. General regression: your normal commute routes should lock/score exactly as before — this
   was the single biggest thing the test suite (305 tests) and the Inspect passes were
   protecting.

## Known follow-on, NOT done here (surfaced by the Round 3 Plan ruling, not blocking)

- **Live-lock tail hole (pre-existing, same class as ride 2, on the *live* lock path rather
  than `finalize()`):** `evaluateLockState()` has no gate condition, so — with the legacy
  4-route seed catalog specifically — a ride starting at an existing route's FINISH and riding
  its ~600m tail home can *verified-lock live* on that route with every sector missed and a
  near-null lap. Same root cause, different code path. Separate WP if Nathan wants it closed
  now rather than later.
- A retried candidate's `anchored` flag being stuck `false` also means it loses the
  "unanchored rival never blocks an anchored leader" privilege in the live-lock arbitration,
  and (no-pick case only) `anyAnchored` can stay false for a whole ride even while gates are
  firing for real, so "writing history" could show slightly longer than ideal in that specific
  edge case. Not touched — flagged for awareness.
