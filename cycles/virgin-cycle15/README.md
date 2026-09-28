# virgin-cycle15 — all 15 briefs landed (2026-09-28)

Nathan asked to execute every brief already sitting in this folder in one session, without
being present to answer questions ("I will probably not be there to attend... I will review
the landed changes tomorrow only"). Order: divided into 5 groups runnable/inspectable
together, sequenced easiest/fastest to largest so small changes could still land if usage
limits were hit mid-session. All 15 landed; every group verified by test suite + `tsc` at
every step and by one fresh-context Opus Inspect pass per group (bar Group 1, mechanical
chores under the pipeline's own skip-threshold).

## Brief index

| # | file | idea | group | status |
| --- | --- | --- | --- | --- |
| 09 | `09-earcons-rename.md` | "Earcons" setting renamed "Gate buzz" | 1 | **landed** (chore) |
| 10 | `10-data-export-rename.md` | "Share" wording renamed "export" in DATA section | 1 | **landed** (chore) |
| 11 | `11-sector-colours-hint-shorten.md` | Sector-colours setting hint shortened | 1 | **landed** (chore) |
| 06 | `06-stale-route-gates-bugfix.md` | Fix stale route gates + FIT leaking across rides | 2 | **landed** |
| 15 | `15-logo-forward-on-stop.md` | End-of-ride mark drawn forward, not reversed | 2 | **landed** |
| 14 | `14-record-place-usage-sort.md` | RECORD place pills ranked by usage | 2 | **landed** |
| 02 | `02-first-sport-on-record.md` | First sport added on RECORD press, not via SETTINGS | 2 | **landed** |
| 05 | `05-route-confirm-redesign.md` | Assume the scored way; offer a small "not this way?" correction | 2 | **landed** |
| 01 | `01-day-night-compact-time-input.md` | Compact "Day from ... until ..." time input | 3 | **landed** |
| 03 | `03-demo-speed-and-skip.md` | DEMO speed pills (5x/15x/25x) + SKIP to an ending screen | 3 | **landed** |
| 07 | `07-replay-position-drift.md` | Replay/live map corner-cutting — way line resolution + ride trace | 4 | **landed** |
| 08 | `08-replay-screen-redesign.md` | REPLAY screen redesign — bigger map, one control row | 4 | **landed** |
| 12 | `12-place-detail-map-fix.md` | PLACE detail map: no gates, one yellow disc | 5 | **landed** |
| 04 | `04-results-screen-visual-cleanup.md` | RESULTS plot/Timing Tower visual cleanup | 5 | **landed** |
| 13 | `13-results-tab-overhaul.md` | RESULTS tab overhaul — grouped by route -> way, most-used-first | 5 | **landed** |

## How it was run

1. **Group 1 — chores (09, 10, 11), done directly by the coordinator, no subagent.** Each
   was a handful of mechanical `settings.tsx` text-only edits with exact anchors already
   given — under the pipeline's own skip-threshold ("chores under ~10 mechanical lines skip
   the pipeline"). Committed together, `bab1631`.
2. **Group 2 — 06, 15, 14, 02, 05, each through Digest/Plan/Execute, one Opus Inspect pass
   over the whole group.** Landed as `e591fc8`, `8525e50`, `3db0b26`, `000b159`, `98ccbd6`.
   Inspect found two real defects: brief 05's "not this way?" correction link was dead code
   (rendered inside the same gate the full-screen end mark disables); brief 06's gate wiring
   used the live detected way instead of the frozen ride-start list, so gates could vanish
   mid-ride on a drifting detection. Both fixed via a fresh Fable ruling + Sonnet
   implementation, `40eb8ca`.
3. **Group 3 — 01, 03, one Opus Inspect pass.** Landed as `d0d4a9a`, `725246b`. Inspect
   found brief 03's SKIP button failed its own acceptance criteria: it navigated to the real
   RESULTS tab (which has nothing to show, since DEMO never writes a real ride) and the tab
   switch unmounted DemoScreen, discarding the just-built ending state. Fixed via a fresh
   Fable ruling (SKIP now stays on DEMO's own ending screen) + Sonnet implementation,
   `e0a5195`.
4. **Group 4 — 07 (Phase 0 investigation + the E+D fix), 08, one Opus Inspect pass.**
   Landed as `782f042` (Phase 0: measured the replay-drift chord error, found it an order of
   magnitude smaller than the drawn way line's own vertex spacing), `68fcc3a` (the E+D
   ruling: way line rendered at reference resolution, 4000-vertex cap instead of 180; the
   ride's own recorded fixes drawn as a thin trace beneath the route line), `abef903` (REPLAY
   screen redesign). No fix-up commit needed — Inspect found no blocking defects, only a
   non-blocking performance watch item (GeoJSON re-serialization on every render, pre-existing,
   somewhat heavier with the larger vertex count during REPLAY scrubbing specifically; logged
   in `OPEN-ITEMS.md`). Brief 07's ruling documented in the brief file itself, `e3b12a3`.
5. **Group 5 — 12, 04, 13 (largest/most structural, run last), one Opus Inspect pass.**
   Landed as `8e853f9` (brief 12), `d1ae13c` (brief 04), `3f0838c` (brief 13 §1 — free rides
   labeled in RIDES), `9627fcd` (brief 13 §2-§5 — RESULTS route -> way grouping). Two
   executor escalations mid-group were each routed to a fresh Fable ruling rather than
   guessed at (see below); Inspect then found two further real defects, fixed in `1e49343`.

Executors ran in sequence within each group (not parallel), since several briefs append a
new test-suite import to the shared `app/tests/run.ts` — concurrent runs would have risked
one batch's append clobbering another's, the same reasoning virgin-cycle14 documented.

## Executor escalations and Fable rulings, in full

- **Brief 04's own test-rewrite instructions never named two pre-existing tests** that
  asserted the calendar-grouped x-tick behaviour (month/week labels, "Jan 26") the brief's
  own D8 deliberately deleted in favour of fixed-slot ticks. The executor correctly stopped
  rather than guess at their fate. Ruling: replaced both with one consolidated span-
  independence test (200-day/20-day/2-day/~1-year spans, all now labelled by `towerDate()`),
  and retired `MAX_X_TICKS` per D8's own "remove once unreferenced" rule once its only
  referrers were gone. Documented in `04-results-screen-visual-cleanup.md`'s own ruling
  section.
- **Brief 13's decision 2 (in-screen `openRouteId` state) could not survive `App.tsx`'s
  single mount-swap ternary** between `ResultsScreen` and `ResultsDetailScreen` — opening a
  way's detail unmounts `ResultsScreen` entirely, so any local state is destroyed and Back
  always lands on the top-level route list, never the way list the brief's own checklist
  required. The brief had anticipated this exact failure class in its own "open question 2"
  and named a fallback direction. Ruling: Shell (`App.tsx`) owns `resultsRoute: string |
  null`; `tabNav` gained `openResultsRoute`/`closeResultsRoute`; `ResultsScreen` takes
  `openRouteId` as a prop with no local state or `BackHandler` of its own. The way-detail hop
  leaves `resultsRoute` untouched, so the remounted screen correctly shows the way list.
  Also ruled on the same pass: brief 13 §1's premise (free rides absent from RIDES, needing
  a merge module) was wrong — a free ride is an ordinary raw ride already in the list,
  falling through to a generic pick-label fallback; fixed with a small `freeFor` slot in the
  existing fallback chain instead of the prescribed merge module. Both documented in
  `13-results-tab-overhaul.md`'s ruling sections.

## Test counts, brief by brief (cumulative)

| stage | tests | pass | fail | skip |
| --- | --- | --- | --- | --- |
| baseline (before this cycle, end of cycle14) | 676 | 673 | 0 | 3 |
| Group 1 — chores 09+10+11 | 676 | 673 | 0 | 3 |
| after brief 06 | 680 | 677 | 0 | 3 |
| after brief 15 | 680 | 677 | 0 | 3 |
| after brief 14 | 684 | 681 | 0 | 3 |
| after brief 02 | 689 | 686 | 0 | 3 |
| after brief 05 | 695 | 692 | 0 | 3 |
| Group 2 Inspect fix-up | 698 | 695 | 0 | 3 |
| after brief 01 | 708 | 705 | 0 | 3 |
| after brief 03 | 715 | 712 | 0 | 3 |
| Group 3 Inspect fix-up | 715 | 712 | 0 | 3 |
| after brief 07 Phase 0 | 723 | 720 | 0 | 3 |
| after brief 07 (E+D fix) | 728 | 725 | 0 | 3 |
| after brief 08 | 731 | 728 | 0 | 3 |
| Group 4 Opus Inspect (no fix-up needed) | 731 | 728 | 0 | 3 |
| after brief 12 | 735 | 732 | 0 | 3 |
| after brief 04 (incl. Fable test-ruling) | 737 | 734 | 0 | 3 |
| after brief 13 §1 | 742 | 739 | 0 | 3 |
| after brief 13 §2-§5 | 749 | 746 | 0 | 3 |
| Group 5 Inspect fix-up | **750** | **747** | **0** | **3** |

`tsc --noEmit` was clean (exit 0) after every single stage above, independently confirmed
again after each group's Opus Inspect pass and again at the end of this bookkeeping pass.

## Inspect verdicts, by group

- **Group 2 (06, 15, 14, 02, 05): 2 real defects found and fixed** — see rulings above.
  Verdict after fix-up: PASS.
- **Group 3 (01, 03): 1 real defect found and fixed** — see rulings above. Verdict after
  fix-up: PASS.
- **Group 4 (07, 08): PASS, no blocking defects.** One non-blocking performance watch item
  (GeoJSON re-serialization cost during REPLAY scrubbing, larger with brief 07's bigger way-
  line vertex cap) logged in `OPEN-ITEMS.md`, not fixed — a one-line memoization if it
  stutters on-device.
- **Group 5 (12, 04, 13): PASS with 2 real defects found and fixed, plus 4 stale doc
  comments corrected.** Brief 12 and brief 13 §1 were clean on first Inspect. Brief 13
  §2-§5's navigation redesign was verified correct by construction (Back from a way's detail
  provably lands on the way list — traced through `App.tsx`'s back-handler listener,
  `tabNav.tsx`, and `ResultsScreen.tsx`'s prop-only design). Two real defects: (1) the new
  RESULTS route-card list had no `ScrollView`/`FlatList` — routes past the first screenful
  (the least-used ones, at the bottom of the most-used-first sort) were unreachable; (2)
  route -> way grouping used `route.wayIds`, which is not the authoritative link (adding a
  way to a SEED route never updates the seed's `wayIds` — the rest of the codebase already
  grouped by the reverse `way.routeId` instead), so a user-recorded extra way on a seed route
  would silently vanish from RESULTS on any curated-seed build (not the empty virgin Preview
  seed itself, but a real risk for any future non-empty build). Both fixed via a fresh Fable
  ruling, `1e49343`.

## On-device, still needed (Nathan, after the next OTA publish)

Nothing in this cycle has been seen on a phone. Each brief's own "On-device checklist"
section (where present) is the authoritative per-feature list. In short, worth checking:
the stale-gate + FIT-leak fix and the forward-drawn end mark (06, 15) on a real multi-way
route; RECORD's place-pill usage ordering and the first-sport-on-RECORD flow (14, 02); the
"not this way?" correction link actually being reachable now (05); the compact day/night
time input (01); DEMO's speed pills and SKIP landing on DEMO's own ending screen, not a
blank RESULTS tab (03); the way line no longer visibly cutting corners on tight bends, and
the thin ride-trace line beneath it (07) — also worth watching for scrub-stutter (Group 4's
performance note); the REPLAY screen's new bigger map and single control row (08); the PLACE
detail map showing one yellow disc, no gates (12); the RESULTS plot's fixed slots / single
dot style / tier-coloured TODAY bar (04); and RESULTS's new route -> way grouping — most-used
first, tapping into a multi-way route's way list, Back from a way's detail landing on the
way list (not the route list), and that the list actually scrolls past the first screenful
(13).

## Ships as

JS-only across all 15 briefs — no new native dependency, no `app.json`/`eas.json` change —
confirmed by grep across all 15 briefs before execution started. Ships to the Preview APK
via `scripts/publish-preview.cmd` (EAS Update), no numbered build, no reinstall.

## Commits, in landing order

`bab1631` (chores 09-11) -> `e591fc8` (06) -> `8525e50` (15) -> `3db0b26` (14) ->
`000b159` (02) -> `98ccbd6` (05) -> `40eb8ca` (Group 2 fix-up) -> `d0d4a9a` (01) ->
`725246b` (03) -> `e0a5195` (Group 3 fix-up) -> `782f042` (07 Phase 0) -> `68fcc3a` (07) ->
`abef903` (08) -> `e3b12a3` (07 ruling doc) -> `8e853f9` (12) -> `d1ae13c` (04) ->
`3f0838c` (13 §1) -> `9627fcd` (13 §2-§5) -> `1e49343` (Group 5 fix-up).
