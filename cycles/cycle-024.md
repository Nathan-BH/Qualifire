# Cycle 024 — 2026-08-20 to 2026-08-24

## Agenda

The marathon cycle: land cycle 023's remediation as a phase gate, then run eleven work packages
(WP-A1–A3, WP-B, WP-C, WP-D1–D3, WP-E, WP-G, WP-H) plus a two-pass design work package (WP-J,
Nathan's editable SVG mirror of every screen) and this bookkeeping pass (WP-I). Two urgent
out-of-queue fixes landed mid-marathon on Nathan's own device reports. This is the biggest cycle
to date by work-package count and by subagent spend.

## What shipped

**Phase 0 — cycle 023 remediation (gate for cycle 024).** The 5 fixes cycle 023 had specified were
found never actually written to the live repo (still byte-identical to cycle 021). Landed for real
this session: day-mode MapLibre remount, post-settle route-match retry, elevation-outlier flagging
(flag-don't-mutate, D-023-compliant), route-distance export field, and route-match diagnostics
persistence. One blocker found and fixed (`routeDistanceM` included the START gate's ~162 m offset).
Recorded in full in `cycles/cycle-023.md`'s addendum — not restated here.

- **WP-H — gate-field replay** (`data/analysis/10_*`, `scripts/gatefield-replay.{ps1,cmd}`). An
  offline replay tool scoring every gate crossing across the archive independently of the route
  model. 482/499 (96.6%) own-route sector times recovered; cross-checked against the route model's
  499/499 and found no disagreement worth blocking on.
- **WP-J, first pass — `design/`** (new folder). Nathan's ask: an editable SVG mirror of every
  screen he can open in Inkscape. First pass drew routes/settings/demo (6 SVGs, day+night); found
  and fixed 2 blockers (fabricated landmark data, a screen shipped prematurely) before landing.
- **WP-C — route workbench** (`demos/workbench.html` + `data/analysis/09_build_workbench_data.py`).
  A browser tool for eyeballing gate placement and promoting candidate reference rides — the save-back
  convention this cycle's other route work builds on.
- **WP-D1 — references & catalog.** Built 15 new seed-route references and ratified two promotions
  (MorningB, StationHomeWet) that Nathan had called by eye. The executor correctly stopped on two
  escalations rather than guessing — see "Near-misses" below; both were real, and fixing the second
  meant a same-cycle rewrite of `engine.ts`'s re-acquisition logic (`REACQ_JUMP_M`), recorded as the
  2026-08-20 pick-bias ruling (D-044).
- **WP-D2 — engine lock & pick-bias** (`engine.ts` rewrite). Every one of the catalog's 20 routes is
  now a live candidate, with an anchored/pick/pickHonoured soft→verified→finalized lock state
  machine replacing the old 4-route hardcoded set. One blocker found and fixed — see "Near-misses".
- **WP-D3 — UI de-hardcode** (`defaultRoute.ts` new). Removed the last hardcoded route literals from
  `ResultScreen.tsx`/`RecordScreen.tsx`; the result-screen fallback now genuinely picks the most
  recent rankable result rather than a name baked into the code.
- **WP-A1 — ride-history store** (`resultsStore.ts` new). Replaced the old memory-only comparison
  cache with a real `results/index.json` + per-ride sidecar store, surviving restarts. Found and
  closed a severe blocker before it ever shipped — see "Near-misses".
- **WP-A2 — RECORD three-phase flow.** Built the setup→armed→running→ending state machine and the
  forward/reversed launch-mark animation from the cycle-022 mockup, plus fullscreen tab-bar hiding
  during a ride.
- **WP-A3 — RIDES/RESULT redesign.** Rebuilt both screens to the cycle-022 mockup: RIDES as
  expandable route+date+lap+rank rows, RESULT as a "your last ride" card plus a Personal Bests
  accordion over all 20 routes. Two real blockers found and fixed (a crashed-ride could permanently
  poison a result; two screens showed contradictory honesty treatment for the same missed-gate ride).
- **WP-G — GPX+ follow-ups.** Closed the diagnostics gaps cycle 023 had left open, added cross-track
  deviation and a new `qf:routeFidelity` field (up to 20 off-route segments, lock-gated). Two
  blockers found and fixed, including one that would have shipped a route-fidelity figure measured
  against the wrong (transiently soft-locked) route.
- **WP-B — free-ride "new" mode**, 3 rounds. Directional gate/candidate filtering when one endpoint
  is unknown, an isolated `freeRides.ts` store, a gates-only map. Took three full inspection rounds
  to close — see "Near-misses"; this is the most protracted item this cycle.
- **WP-E — race-map render fixes.** Path-based off-route measurement (fixing some of Nathan's
  20 Aug false off-route reports), gate circles replaced with theme-aware perpendicular ticks,
  route-line dotted-ahead/solid-behind driven by real ride progress, rider dot recoloured. One
  blocker found and fixed (the new route-ahead line had no casing layer — invisible on the daylight
  basemap).
- **WP-J, re-emit — RECORD/RIDES/RESULT SVGs.** Second design pass, run only after the above landed
  so the pictures show the real screens. Opus review found 5 blockers + nits (missing position chip
  on `record_finished`, stale route-line dashing, missing gate-tick casing, a clipped rides-row
  label, a wrong date format); the coordinator fixed all of them directly in `make_screens.py` after
  the dispatched fix-pass agent stalled at the relay step. Determinism and pass-1 byte-identity both
  reverified after every edit.
- **Out-of-queue — live record-screen footer overlap** (2026-08-24, Nathan's own device report).
  WP-A2's fullscreen-hiding change had left nothing absorbing the phone's bottom safe-area inset once
  the tab bar was gone. One-line root cause, one-line fix in `App.tsx`; verified alongside WP-A3's
  inspection pass.
- **Out-of-queue — WP-E map rendering** (2026-08-24, Nathan's own device report). The dotted-ahead
  route line rendered as oversized flickering blobs on real MapLibre (a `line-dasharray` zoom quirk)
  and unscored gate ticks were nearly invisible. Reverted to a solid route line, added
  yellow-with-black-outline unscored ticks, and — caught in the same pass, not by Nathan — fixed a
  genuine honesty regression where a real scored yellow-tier gate had become pixel-identical to an
  unscored one.
- **WP-I — this bookkeeping pass.** `product/` split into `live / proposals / superseded`;
  `STATE.md`, `BACKLOG.md`, `DECISIONS.md` regenerated/extended; `process/CONVENTIONS.md` gained the
  design-folder round-trip step; a new `NATHAN-STATUS.md` standing status page.

## Real production near-misses caught before landing

Three separate blockers this cycle would each, alone, have corrupted real ride data or a real
comparison history if they had shipped. A fourth (WP-D1's) was caught by the executor's own
stop-on-ambiguity discipline rather than by a later inspection pass, and is worth naming alongside
the other three because the underlying defect was just as real.

1. **WP-A1 — a 48% implausible-match rate in the backfill matcher.** The Opus inspector found that
   `backfillMissingResults` could accept a ride as a "clean" lap on a route it had never actually
   ridden — on a 125-ride real-archive sample, nearly half the matches were false, some 4–5 km off
   the route line, including a fabricated 60-second "EveningA" lap that would have become a
   permanent all-time-best PB. Root cause: offline chainage re-acquisition could jump
   non-monotonically across a gap and manufacture a near-zero-width "sector" no fix ever failed
   inside. Fixed with a corridor-coverage gate (≥50% of 100 m gate-to-gate bins must have an
   in-corridor, in-window fix); the implausible-match rate dropped from 47% to 0% on the sample with
   zero genuine matches lost.
2. **WP-D2 — a wrong route persisted as a clean personal best.** Stale `lap`/`phase` state could
   survive a display-target switch when the rider's pick was wrong and they rode past a prefix
   route's FINISH — on real catalog geometry (WorkFosh picked, WorkStationA ridden) this reported
   486 seconds instead of the real 686, and would have written that wrong number into the permanent
   ghost/comparison window. Fixed by nulling `lap`/`phase` on display-target change; regression-locked.
3. **WP-B — three rounds to close a free-ride mode-loss path.** A headless app relaunch mid-free-ride
   could lose the ride's `mode:'free'` marker entirely, letting the engine's idle-triggered auto-start
   reset to `mode:'route'` and write the free ride's time into the real fixed-route comparison
   history — exactly the corruption this work package existed to prevent. Round 1's fix closed the
   task-handler path; round 2's re-verification found a second path (reopening the app, not just a
   true OS relaunch) still leaking the same bug; round 3's fix moved the re-arm into `ensureSession()`
   behind a once-per-launch flag, closing both orderings plus a genuine concurrent-interleave case the
   simpler fix would have missed.
4. **WP-D1 — a re-acquisition teleport winning the live lock race.** Not caught by a later inspector;
   the WP-D1 executor stopped correctly when the brief's own expected gate numbers didn't match its
   measurements, and that stop surfaced a second, more serious problem: `engine.ts`'s re-acquisition
   logic could let a candidate jump ~578 m in a single GPS fix and have that jump counted as
   corridor-verified "advance," letting it out-race the honestly-ridden route and hard-lock wrong —
   demonstrated on real fixture data, and confirmed to still occur even under WP-D2's not-yet-built
   design. Fixed directly in `engine.ts` (`REACQ_JUMP_M` discount), documented in the 2026-08-20
   adjudication now recorded as decision **D-044**.

## Subagent token usage

Per Nathan's standing instruction: one row per distinct agent dispatch, each work package's rounds
counted separately. Figures are copied verbatim from the coordinator's running tracker
(`/tmp/cycle024_tracking.md`); nothing here is estimated or rounded unless the tracker itself only
had an estimate (marked below).

### Pre-execution planning (from `cycles/cycle-024-briefs/Token usage (for reference).txt`)

This is the triage + brief-writing phase that produced the cycle-024-briefs, before any executor
ran. Included for completeness since it is real spend belonging to this cycle; kept in its own
sub-table because the source file predates the main tracker and uses its own rounding.

| Tier | Model | Tokens | Outcome |
|---|---|---|---|
| Triage | Haiku | 49k | Order + conflict watchlist; 2 package splits |
| Analyst (app UI, WP-A) | Fable | 261k | 3 briefs; store design + RECORD/RIDES/RESULT port |
| Analyst (engine/routes, WP-D/B) | Fable | 335k | 5 briefs; both promotions verified; corridor-shadowing catch |
| Analyst (render + GPX+, WP-E/G) | Fable | 191k | 2 briefs; ride-3 lock failure root-caused in code |
| Analyst (workbench + replay, WP-C/H) | Fable | 182k | 2 briefs; save-back convention settled |
| Analyst (docs + SVG, WP-I/J) | Fable | 220k | 2 briefs; product-folder disposition table |
| Coordinator | Fable (chat) | — | Scope, 7 rulings captured, briefs committed to repo |

**Planning-phase subtotal ≈ 1.24M tokens.**

### Execution phase (from the coordinator's running tracker)

| Tier | Model | Tokens | Outcome |
|---|---|---|---|
| Execute — Phase 0 (cycle 023 remediation) | Sonnet | 296,327 | 5 fixes landed across 8 files, +15 tests (145→160) |
| Inspect — Phase 0 | Opus | 106,603 | 1 blocker found (`routeDistanceM` START-offset bug, fixed), 6 follow-ups filed |
| Execute — WP-H | Sonnet | 221,458 | Gate-field replay tool built; MERGEABLE |
| Inspect — WP-H | Opus | 119,018 | MERGEABLE, no blocking defects |
| Execute — WP-J (pass 1) | Sonnet | 245,773 | 6 initial SVGs built + fixes across a bridge outage (follow-on work not separately itemized by the tool) |
| Inspect — WP-J (pass 1) | Opus | 139,499 | 2 blockers found (fabricated landmark data; a screen shipped prematurely) + 8 follow-ups |
| Verify — WP-J (pass 1) | Opus | 97,850 | Confirmed both blockers fixed, follow-ups landed |
| Execute — WP-C | Sonnet | 250,052 | Route workbench built; COMPLETE, no blockers |
| Inspect — WP-C | Opus | 150,045 | CONFIRMED on every load-bearing claim; no blockers |
| Execute — WP-D1 | Sonnet | 288,045 | 15 references + 2 promotions built; correctly stopped on 2 escalations |
| Rule — WP-D1 (escalations) | Opus | 202,697 | Both escalations resolved with real fixes: MorningB v2 gate chainages; `REACQ_JUMP_M` engine fix |
| Inspect — WP-D1 (engine-fix re-check) | Opus | 162,818 | CORRECT and safe to build on; found + fixed 1 off-by-one-segment issue, filed 1 residual follow-up |
| Execute — WP-D2 | Sonnet | 386,054 | Full-catalog pick-bias engine rewrite; correctly re-read live files instead of trusting stale brief anchors |
| Inspect — WP-D2 | Opus | 179,495 | 1 real blocker found (B1: wrong route persisted as a clean PB); fix relayed to the same executor — that continuation's own token cost is not separately itemized in the tracker |
| Execute — WP-D3 | Sonnet | 147,490 | `defaultRoute.ts` + wiring built; grep gate passed |
| Inspect — WP-D3 | Opus | 111,207 | No blockers; 2 minor items found, fixed by coordinator chore |
| Execute — WP-A1 | Sonnet | 282,192 | Ride-history store built, replacing B-40's cache machinery |
| Inspect — WP-A1 | Opus | 150,634 | SEVERE BLOCKER found: 48% implausible-match rate in backfill (see Near-misses) |
| Fix — WP-A1 | Opus | 159,560 | Root-caused and landed the corridor-coverage gate; implausible-match rate 47% → 0% |
| Verify — WP-A1 | Opus | 89,203 | CONFIRMED correct and safe; independently re-derived the coverage numbers |
| Execute — WP-A2 | Sonnet | ~110,000 (tracker's own estimate — exact figure not recorded) | Setup/armed/running/ending phase flow + launch choreography built, +8 tests |
| Inspect — WP-A2 | Opus | 159,083 | 1 blocker (B1, fixed by coordinator chore) + 5 non-blocking follow-ups |
| Execute — WP-A3 | Sonnet | 270,027 | RIDES/RESULT redesigned to the cycle-022 mockup, +8 tests |
| Inspect — WP-A3 (+ footer-overlap hotfix review) | Opus | 159,083 | 2 real blockers found (F1/F2, see Near-misses text); also independently confirmed the same-day footer-overlap hotfix correct |
| Fix — WP-A3 | Sonnet (fresh context) | 151,477 | F1/F2 fixed, +2 tests |
| Execute — WP-G | Sonnet | 238,399 | Diagnostics closure + new `qf:routeFidelity` field built, +6 tests |
| Inspect — WP-G | Opus | 155,635 | 2 real blockers found (both fixed by coordinator chore), +2 regression tests |
| Execute — WP-B round 1 (attempt 1) | Sonnet | 0 — terminated by an API weekly-limit error mid-exploration, no files touched | Failed, safely redispatched |
| Execute — WP-B round 1 (attempt 2) | Sonnet | not recorded (connection dropped after 180 tool calls, no files touched) | Failed, safely redispatched |
| Execute — WP-B round 1 (succeeded) | Sonnet | 114,024 (tracker notes the session total across all 3 attempts is substantially higher) | Free mode engine/store/UI built, +14 tests |
| Inspect — WP-B round 1 | Opus | 168,751 | DO NOT SHIP — 2 HIGH blockers (mode-loss on relaunch; silent route-PB corruption on reboot) |
| Fix — WP-B round 2 | Sonnet | 163,039 | Prescribed relaunch/mode-persistence mechanism implemented, +2 tests |
| Inspect — WP-B round 2 | Opus | 111,263 | DO NOT SHIP, again — the same leak found on a second path |
| Verify — WP-B round 3 | Opus | 78,600 | SHIP — confirmed the fix closes both orderings plus a genuine concurrent-interleave case |
| Execute — WP-E | Sonnet | 185,208 | Off-route measurement, gate ticks, route-line split, rider-dot colour fixed, +8 tests |
| Inspect — WP-E | Opus | 147,402 | 1 blocker found (missing casing layer, fixed by coordinator chore) |
| Verify — map-rendering hotfix (2026-08-24) | Opus | 114,293 | DO-SHIP; flagged 1 real honesty regression (yellow-tier/unscored collision), fixed same pass |
| Inspect — WP-J re-emit | Opus | 164,880 | 5 blockers + nits found (missing position chip, stale dashing, missing tick casing, clipped label, wrong date format) |
| Execute — WP-I (completion pass) | Sonnet | 218,479 | Read the real brief in full and completed the ~half of scope the prior round had skipped: BRAND.md rewrite, LAYOUT.md/CONCEPT.md surgical edits, HOW-THE-APP-IS-BUILT.md + GLOSSARY.md + 12 per-folder READMEs, root README rewrite, CYCLE.md bullet, BUILD-3-RUNBOOK.md move, WorkFosh/WorkStationA name-swap fix, B-69 date fix |
| Inspect — WP-I (completion pass) | Opus | 141,445 | NEEDS-A-FIX-PASS: independently re-derived the WorkFosh/WorkStationA verdict (confirmed correct) and re-ran tests/tsc (matched); found 1 MAJOR (CONVENTIONS.md's Nathan-facing-docs rule contradicted the two files it governs, both created this same pass), 4 MEDIUM (D-042 relative-date reference, BRAND.md tagline dropped, missing STATE.md/NATHAN-STATUS.md "glance" flag for the BUILD-3 move, 3 stale pre-move file paths), 5 MINOR — all fixed directly by the coordinator (single-line edits, no app code touched) |

**Execution-phase subtotal ≈ 6.64M tokens** (sum of the numeric entries above; the two failed WP-B
attempts, the WP-J re-emit's own initial build dispatch, and everything below marked
"coordinator-direct" are not counted in this figure because no token number for them exists in the
tracker — see the note under "Not captured as rows" below).

**Combined total (planning + execution) ≈ 7.88M tokens.**

### Coordinator-direct work (not subagent dispatches — no token figure exists to report)

Per Nathan's model-tier rule, anything under ~10 mechanical lines or answerable by one read is done
directly by the coordinator rather than paying a subagent's ~30–80k-token overhead. These are listed
for completeness, not as table rows, because they were never subagent dispatches and the tool does
not report a token count for coordinator turns:

- `routeDistanceM` START-offset fix (Phase 0); B1 fullscreen-cleanup fix (WP-A2); B1 casing-layer fix
  and 2 nits (WP-E); Blocker-1/Blocker-2 mechanical fixes (WP-G); F1/F2 comment/`ranks()` fixes
  (WP-D3); the live record-screen footer-overlap hotfix (2026-08-24, diagnosed and fixed directly);
  the WP-E map-rendering hotfix itself plus its same-pass yellow-tier follow-up fix (2026-08-24); the
  WP-J re-emit fix pass (`make_screens.py`, 5 blockers + nits, done directly after the dispatched
  fix-pass agent stalled at the relay step); this WP-I bookkeeping pass itself; the WP-I completion
  pass's own fix-pass (1 MAJOR + 4 MEDIUM + 5 MINOR findings above, all single-line doc edits, done
  directly rather than paying a third executor round-trip for mechanical text fixes).

### Not captured as rows (flagged, not invented)

- **WP-B round 1's two failed attempts** burned real tokens (one API-limit termination, one
  180-tool-call connection drop) that the tracker does not quantify — the 114,024 figure for the
  successful attempt is explicitly a partial figure, not the round's true cost.
- **WP-J re-emit's initial build dispatch** — the Sonnet executor that produced the six SVGs the
  164,880-token Opus review above inspected is never logged with its own token figure in the tracker;
  only the review that followed it, and the (stalled) fix-pass attempt after that, are recorded.
- **WP-A2's executor figure** is the tracker's own "~110K (est.)" — not exact.

## Files touched (by work package — see each WP's landed-file list in `/tmp/cycle024_tracking.md`
for the full per-file detail; not repeated here)

Phase 0: `engine.ts`, `location/index.ts`, `location/elevationOutlier.ts` (new), `routeMapView.tsx`,
`storage/types.ts`, `storage/eventsJsonl.ts`, `storage/gpxPlusExport.ts`. WP-H:
`data/analysis/10_*`, `scripts/gatefield-replay.{ps1,cmd}`. WP-J (both passes): `design/` (new
folder — README, `make_screens.py`, 18 canonical SVGs, `edited/`). WP-C: `data/analysis/09_*`,
`demos/workbench.html`, `demos/workbench-data.js`, `demos/index.html`. WP-D1: `catalog.seed.json`,
`core/src/gates.ts`, `routes.json`, `store_suite.ts`, `live_suite.ts`. WP-D2: `engine.ts` (rewrite),
`tracks.ts` (new), `refs.ts`, `core/types.ts`, `location/index.ts`, `RecordScreen.tsx`, `lastRide.ts`
+ 4 test files. WP-D3: `defaultRoute.ts` (new), `ResultScreen.tsx`, `routeMapView.tsx`,
`RecordScreen.tsx`, `DemoScreen.tsx`. WP-A1: `resultsStore.ts` (new), `lastRide.ts` (rewrite),
`App.tsx`, `RecordScreen.tsx`, `RidesScreen.tsx`, `ResultScreen.tsx`. WP-A2: `launchChoreo.ts`,
`launchAnimation.tsx`, `recordFlow.ts` (new), `tabNav.tsx` (new), `App.tsx`, `RecordScreen.tsx`,
`location/index.ts`. WP-A3: `rideHistoryModel.ts` (new), `RidesScreen.tsx`, `ResultScreen.tsx`,
`settings.tsx`. WP-G: `gpxExport.ts`, `eventsJsonl.ts`, `types.ts`, `gpxPlusExport.ts`, `engine.ts`,
`location/index.ts`, `core.ts`, `storage/index.ts`. WP-B: `engine.ts`, `location/index.ts`,
`location/session.ts`, `store/catalog.ts`, `store/freeRides.ts` (new), `RecordScreen.tsx`,
`routeMapView.tsx`, `routeMapGeo.ts`, `ResultScreen.tsx`, `lastRide.ts`, `RidesScreen.tsx`,
`App.tsx`, `storage/types.ts`, `storage/core.ts`, `storage/index.ts`, `demos/mockup.html`. WP-E:
`routeMapView.tsx`, `routeMapGeo.ts`, `routeMapMath.ts`, `theme.ts`. Map hotfix (2026-08-24):
`routeMapView.tsx`. WP-I (this pass): `product/{proposals,superseded}/` (new), `STATE.md`,
`product/BACKLOG.md`, `product/DECISIONS.md`, `process/CONVENTIONS.md`, `README.md`,
`NATHAN-STATUS.md` (new), `cycles/cycle-024.md` (this file).

## Decisions recorded

- **D-044** — the 2026-08-20 pick-bias / re-acquisition ruling (both WP-D1 escalations: MorningB v2
  gate chainages; the `REACQ_JUMP_M` re-acquisition discount in `engine.ts`). See
  `product/DECISIONS.md` and the source record, `cycles/cycle-024-briefs/WP-D1-ADDENDUM-adjudication-2026-08-20.md`.

## Verification

`node --experimental-strip-types tests/run.ts` (device, 2026-08-24, re-run independently for this
bookkeeping pass): **239 tests, 236 pass, 0 fail, 3 skip.** `npx tsc --noEmit`: clean, exit 0. Both
figures match the last-recorded counts in `/tmp/cycle024_tracking.md` (WP-J re-emit's own final
verification) — no drift found between the tracker's record and the real device tree.

## Open items filed this pass

Every deferred follow-up mentioned across the cycle — including this session's own late findings
(a real contrast bug reproduced faithfully rather than silently "corrected" in the SVGs, a
MapLibre gate-tick sizing gap, a PNG-rung casing-parity gap, a stale settings-screen label in the
first-pass SVGs, and WP-B's explicitly deferred both-endpoints-unknown free-ride design task) — is
now in `product/BACKLOG.md` under "Cycle 024 follow-ups," starting at B-70. Nothing found in
`/tmp/cycle024_tracking.md` was left off that list; see that file's header note for the few items
that needed a judgement call on where they belong.
