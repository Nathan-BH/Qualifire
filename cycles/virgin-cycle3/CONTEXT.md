# virgin-cycle3 — CONTEXT

## What this cycle is

This folder was prepped on 2026-09-05, ahead of content — Nathan's own framing: he hands
over work-package tasks one by one for briefs to be written here. Same shape as
`virgin-cycle1`/`virgin-cycle2`: a folder of status + execution-ready briefs. As of
2026-09-06, all three work packages Nathan handed over are fully executed, tested, and
independently inspected on branch `virgin`. See `README.md` for the final status table with
commit hashes.

## Primary source documents

- Nathan's own messages in this chat (2026-09-05) are the primary spec for all three WPs —
  each brief quotes his exact wording where a design decision hinges on it.
- `QUESTIONS-FOR-NATHAN.md` — his answers to all open questions from all three briefs,
  recorded before execution began.
- Strava's public help-center article on "My Segment Results" (web research, cited in
  `WP-2-results-tab.md` §1.1) — grounded the scatterplot design in an actual reference UI
  rather than an invented one, then documented exactly where Nathan's answers departed from it.
- `STATE.md` / `OPEN-ITEMS.md` (repo root) — the app's standing rules; WP-2 required a
  scoping amendment to STATE.md's "9+1 ranking window" rule (see below).

## What this cycle covers — final shape of each WP

- **WP-3 — Way/Route terminology + structure inversion (ran FIRST).** Nathan's own ruling
  (2026-09-05): "Route" now means the base from→to path (`Route.wayIds`); "Way" now means a
  named variant/subdivision of it (`Way.routeId`, carries `specs`/`refLineId` — the
  results-bearing thing). The brief originally recommended running this WP LAST (after WP-1/
  WP-2, so their code could be identifier-swapped for free rather than re-verified against
  new anchors); Nathan overrode that in his own instruction and it ran first instead — WP-1
  and WP-2's briefs were then revised to be written directly in post-WP-3 vocabulary, each
  with a §0 pre-flight gate confirming WP-3's identifiers were actually live before editing.
  Landed as `1773a03`: identifiers swapped tree-wide via a TS-compiler-API codemod
  (`scripts/wp3-swap-identifiers.ts`, an explicit involution — never run twice), on-disk
  schema bumped to v2 with a read-side migration (`store/migrations.ts`), seeds migrated in
  place, and the pre-swap naming/GPX+ format preserved on a `legacy-virgin` git branch
  instead of dual-emitting old/new formats going forward (Nathan's own suggestion, given his
  stated tolerance for a possible virgin reset).

- **WP-1 — multi-sport support.** Nathan's own ask: keep ways/routes/rides/achievements
  separate per user-defined sport (bike/e-bike/run/walk/... — his examples, not a fixed
  list). Plan (Fable) decided: one global "active sport", tag-and-filter over the existing
  single Catalog/results/settings stores (not separate per-sport storage roots), switchable
  from a new SETTINGS "Sports" section or a RECORD-screen pill row. Nathan's answers refined
  this further: zero sports seeded by default, RECORD shows a first-class blocking message
  when no sport exists, a new SETTINGS pill-visibility toggle, specific badge wording.
  Landed as `c597193`/`dce0f83`/`66837b9` (data model → settings/browse UI → record-flow
  wiring). `sportId?` lives on the post-WP-3 `Route` (base-path/parent level).

- **WP-2 — results/rankings tab.** Nathan's own ask: the RESULT tab was retired in an
  earlier cycle with no replacement; re-introduce it as a per-way board (most-ridden first,
  full names) → detail screen with a ranked all-time history board plus a Strava-inspired
  time-vs-date scatterplot. His answers refined the original design: no map on the detail
  screen (already shown on the ROUTE detail), plot above board, scatterplot shows only the
  last 9 rides (mirroring the scoring window) with a faster-up y-axis and purple/green/yellow
  points against the window's own average, no horizontal panning. `STATE.md`'s 9+1
  ranking-window rule is scoped to apply only to scoring/tier-colour logic, not to this
  history-browsing view (which intentionally shows an all-time board with no tier colours) —
  Nathan deferred final judgment on the all-time-vs-windowed board question itself ("not
  clear for me now, let's build it and refine later"). Landed as `e527b6f`/`9fb1365`/
  `e17f90d`, with a follow-up fix commit `a8d5037` (+ polish `ff2fb74`) closing out
  everything an independent Inspect pass found wrong in the scatterplot component.

## The model-tier pipeline as actually run this cycle

Followed `CLAUDE.md` / `process/CONVENTIONS.md`'s model-tier pipeline in full: Digest
(Haiku) → Plan (Fable, incl. web research for WP-2) → Execute (Sonnet, phase-by-phase per
each brief) → Inspect (fresh-context Fable, no memory of the execute work). Where Inspect
found genuine, non-speculative defects (WP-2's scatterplot: 3 blocking + 7 non-blocking), a
targeted Execute fix pass was dispatched against those findings specifically, then
independently re-verified a second time — reading the actual resulting code rather than
trusting the fix pass's own claims — before the WP was called done. One remaining cosmetic
issue the re-verification pass itself surfaced (an avg-label column too narrow to fit its
text without truncating) was small enough to fix directly as a chore rather than dispatching
another subagent (`ff2fb74`). Chore-sized, already-fully-specified fixes were written
directly by the coordinator throughout, per convention.

## Ground rules that constrained every brief in this folder

See repo-root `STATE.md` for the app's standing rules (raw-time-default, append-only ride
recordings, never-delete, gates-don't-change-colour, the ranking-window rule now scoped per
WP-2 above, etc.) and `OPEN-ITEMS.md` for anything already parked. Device-side operational
rules (git lock quirk, never request delete permission) are documented in the project's
persistent memory, not repeated per-brief.
