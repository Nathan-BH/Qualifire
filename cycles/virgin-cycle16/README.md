# virgin-cycle16 — all 8 briefs landed (2026-09-29)

Nathan fed 8 ideas one at a time over the course of a session, each run through
Digest -> Fable Plan to produce a parked, self-contained brief, then signed off for the
night ("After this last brief has landed, execute all the briefs in one pass (sonnet
executor). Make logical groups for briefs that can be executed together and verified by a
single opus agent. this minimizes agent spawning. Goodluck and see you tomorrow"). All 8
landed that same session, grouped by which files they touch so a Sonnet executor could run
each group in one pass and a single fresh-context Opus Inspect pass could verify it, per his
instruction to minimize agent spawning.

## Brief index

| # | file | idea | group | status |
| --- | --- | --- | --- | --- |
| 01 | `01-new-is-a-normal-ride.md` | "new" on RECORD's from/to is a normal ride, not a free ride | A | **landed** |
| 02 | `02-save-as-free-ride.md` | Free ride becomes a post-ride save choice, not a record-time mode | A | **landed** |
| 03 | `03-free-rides-sections.md` | RIDES and RESULTS each get a FREE RIDES section | A | **landed** |
| 04 | `04-retire-free-gate-machinery.md` | Retire the free-mode engine path, map gates-only rendering, catalog filter | A | **landed** |
| 05 | `05-gps-off-warning-in-button.md` | GPS-off warning moves into the button (2s flash), off the invisible banner | B | **landed** |
| 06 | `06-retire-record-q-mark.md` | Retire the big Q logo on RECORD; QUALIFIRE text only, bigger map | B | **landed** |
| 07 | `07-demo-screen-controls-redesign.md` | DEMO's controls redesigned to mirror REPLAY's dial/scrub/play-pause row | C | **landed** |
| 08 | `08-scatterplot-dot-colour-and-axis-fix.md` | Scatterplot: yellow "today" dot, lighter dots, drop avg label, fix clipped date | C | **landed** |

## How it was run

1. **Group A — 01, 02, 03, 04, one Opus Inspect pass.** The root cause of Nathan's
   black-circles-on-the-map bug: choosing "new" for RECORD's from/to used to trigger a
   free-mode engine path that scattered every other route's gates on the live map. Brief 01
   makes "new" take the normal start path; briefs 02-03 move "free ride" to a post-ride save
   choice (RIDES/RESULTS FREE RIDES sections, `markRideFree`/`unmarkRideFree`); brief 04
   deletes the whole free-mode engine path, map gates-only rendering and catalog filter as
   dead code (~10 pruned/rewritten test suites). Landed as `342db81`. One executor escalation
   mid-group, routed to a fresh Fable ruling rather than guessed at (see below). Inspect
   found one real defect (fixed) and one non-blocking design gap (logged), plus a handful of
   cosmetic stale-comment/unused-import cleanups (fixed).
2. **Group B — 05, 06, one Opus Inspect pass.** Both touch `RecordScreen.tsx`, so run
   together in one executor pass rather than two. Brief 05 replaces the invisible
   above-the-fold GPS-off banner with a 2s flash inside the button itself; brief 06 retires
   the big Q logo graphic in favour of the QUALIFIRE text header alone, growing the live map
   200->330 to reclaim the space. Landed as `0175398`. No executor escalation. Inspect found
   no blocking defects; fixed a one-frame opacity flicker and a missing animation-cleanup
   call directly, plus stale-comment nits; logged one non-blocking spacing observation.
3. **Group C — 07, 08, one Opus Inspect pass.** Independent files (`DemoScreen.tsx` and
   `resultsPlot.tsx`), grouped purely to minimize agent spawning per Nathan's instruction.
   Brief 07 makes DEMO's control row structurally identical to REPLAY's post-cycle15
   redesign (dial, scrub bar, single play/pause button — no skip, no stop; reaching the end
   of the run by drag or by play advances to the next animation through one shared path).
   Brief 08 gives the scatterplot's "today" dot the brand yellow, lightens the other dots,
   drops the "avg + time" label (keeping the dotted average line), and fixes the rightmost
   date label clipping against the card's rounded border. Landed as `63e3ad4`. No executor
   escalation — the one flagged risk (whether the brief's description of REPLAY's current
   control row still matched the real file) checked out exactly. Inspect found no blocking
   defects; fixed 7 stale comments directly; logged two non-blocking design tradeoffs
   (matches the briefs as written, but worth Nathan's on-device eye).

Executors ran the groups in sequence (not parallel), each writing to a shared working tree;
each group was committed before the next group's executor started, so no two agents ever had
uncommitted edits to the repo at the same time.

## Executor escalation and Fable ruling, in full

- **Group A: 3 tests in `app/tests/live_suite.ts` had no mechanical route-mode equivalent**
  for their old `mode:'free'`/`freeCrossings`/`freeSectors` assertions once brief 04 deleted
  those fields — the executor correctly stopped rather than guess at replacement semantics,
  and the coordinator (running on Sonnet) correctly did not rule on it either, forwarding to
  a fresh Fable per the binding protocol. Ruling: used the existing `wayMatchAttempt`
  `'anchor'` diagnostic (fires once per candidate on its first fed fix) to observe the
  candidate set directly, replacing the 3 tests with `engine.start({ wayIds: [...] })`
  filter-restriction assertions. Verified 3/3 pass, `tsc` clean, before being spliced in.
  Documented in `04-retire-free-gate-machinery.md`'s own ruling section (2026-09-29).

## Opus Inspect findings, in full

- **Group A, defect (fixed, `342db81`):** `RideDetailScreen.tsx`'s "Save as free ride"
  button was showing on a route's reference ride, which shares the unmatched ride's
  `kind:'none'` shape. Fixed by also checking `model.referenceOf === null`.
- **Group A, non-blocking (logged, `OPEN-ITEMS.md`):** the free-ride save choice isn't
  offered at the exact moment brief 02's Goal described (right on STOP) — RECORD's
  `RouteNamingCard` shows first for an unmatched ride, and the free-ride choice only appears
  after that's skipped. Works, just one extra tap from where Nathan will be looking.
- **Group A, cosmetic (fixed, `342db81`):** unused `fmt` imports in `RecordScreen.tsx` and
  `RideDetailScreen.tsx`; several stale "free ride"/"free mode" comments referencing the
  deleted engine path; one comment-cleanup replacement left unfixed (0 occurrences where 1
  was expected — likely whitespace drift, purely cosmetic, not investigated further).
- **Group B, defect (fixed, `0175398`):** the GPS-off flash's fade-finish callback called
  `gpsFlashOpacity.setValue(1)` after `setGpsFlash(false)`, which could snap the native-driven
  opacity back to full for a frame before React's re-render caught up — a visible flicker
  right where the on-device checklist asks Nathan to check for exactly that. Fixed by
  removing the redundant call (the next flash already resets opacity itself).
- **Group B, non-blocking (fixed, `0175398`):** unmount cleanup cleared the flash timer but
  not the in-flight animation; added `gpsFlashOpacity.stopAnimation()`.
- **Group B, non-blocking (logged, `OPEN-ITEMS.md`):** with the Q mark gone, the QUALIFIRE
  title now shares its row with the top-right theme pill with an estimated ~10-15dp of
  clearance on a 360dp screen — not provably broken, worth an on-device look.
- **Group B, cosmetic (fixed, `0175398`):** two stale comments ("above the logo" ->
  "above the title"; ASCII arrow -> proper arrow in a size comment).
- **Group C, non-blocking (logged, `OPEN-ITEMS.md`):** brief 07's scrub is a faithful
  relative-jog port of REPLAY's, not an absolute seek — at the 5x default rate one
  full-width drag covers roughly 650 of the run's ~896 sim-seconds, so "drag to the edge
  ends the run" takes two drags at low speed even though it's immediate at 25x. Matches the
  brief; worth Nathan's on-device feel-check.
- **Group C, non-blocking (logged, `OPEN-ITEMS.md`):** brief 08's dot-dimming applies to
  night mode too (nobody asked for that — the complaint was day-mode dots being too dark),
  and separately the brand yellow "today" dot has notably lower contrast on the white card
  than the grey dots it's meant to stand out from (theme.ts already flags this yellow's poor
  contrast elsewhere). Matches the brief as written.
- **Group C, cosmetic (fixed, `63e3ad4`):** 7 stale comments across `DemoScreen.tsx` and
  `resultsPlot.tsx` referencing removed concepts (speed pills, skip/stop buttons, "no
  arithmetic here" once label-clamp math was added).

## Test/type-check trend

Pre-cycle16 (end of cycle15): 750 tests. After Group A's free-gate-machinery deletion: 734
pass / 0 fail / 3 skip (net -16, entirely from pruning the free-gate machinery's own
dedicated tests — no coverage lost on surviving behaviour). Groups B and C added no new
tests (both UI/rendering changes with existing coverage) and held at 734 pass / 0 fail / 3
skip throughout. `tsc --noEmit` stayed clean (exit 0) after every group.
