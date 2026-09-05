# virgin-cycle3 — CONTEXT

## What this cycle is

This folder was prepped on 2026-09-05, ahead of content — Nathan's own framing: he hands
over work-package tasks one by one for briefs to be written here. Same shape as
`virgin-cycle1`/`virgin-cycle2`: a folder of status + execution-ready briefs, not a
replacement for whatever primary source documents each WP draws on.

## Primary source documents (read these, don't just trust this folder's summaries)

_(list added per WP as source material is identified)_

## What this cycle covers vs. deliberately left out

- **WP-1 — multi-sport support.** Nathan's own ask (2026-09-05): keep ways/routes/rides/
  achievements separate per user-defined sport (bike/e-bike/run/walk/... — his examples,
  not a fixed list). Plan (Fable) decided: one global "active sport", tag-and-filter over
  the existing single Catalog/results/settings stores (not separate per-sport storage
  roots), switchable from SETTINGS or a RECORD-screen pill row. See
  `WP-1-multi-sport-support.md` §3 for the full reasoning and the phase split (A data-
  model → B settings/browse UI, C record-flow wiring).

- **WP-2 — results/rankings tab.** Nathan's own ask (2026-09-05): the RESULT tab was retired
  in cycle1 with no replacement; re-introduce it as a per-route board (ride count desc) →
  detail screen (map preview + all-time tower + a Strava-inspired time-vs-date scatterplot).
  Plan (Fable) researched Strava's actual segment-history UI, scoped STATE.md's 9+1
  ranking-window rule to scoring only (not this history view), and avoided adding
  `react-native-svg` (native module). See `WP-2-results-tab.md`.

- **WP-3 — Way/Route terminology + structure inversion.** Nathan's own ruling (2026-09-05):
  "Route" should mean the base from→to path (today's `Way`); "Way" should mean a named
  variant/subdivision of it (today's `Route`, the specs-bearing thing) — today's schema has
  this backwards. Touches ~245 code sites across 13 files, the `kind:'place'|'way'`
  discriminator, UI copy, AND persisted on-disk data on Nathan's real phone (`catalog.user.json`,
  `results/*.json`) — a versioned migration is mandatory, not optional. **Execution order:
  WP-3 runs LAST**, after WP-1 and WP-2 both land — see `WP-3-way-route-inversion.md`'s own
  "Design decisions" section for the reasoning (re-issuing WP-1/WP-2 post-swap would mean
  re-verifying every anchor; the identifier-swap script covers their landed code for free
  instead). See `WP-3-way-route-inversion.md` for the full before/after field-mapping table.

## The model-tier pipeline as actually run this cycle

Follows `CLAUDE.md` / `process/CONVENTIONS.md`'s model-tier pipeline: Digest (Haiku) →
Plan (Fable) → Execute (Sonnet) → Inspect (fresh-context Fable). Chore-sized, already-fully-
specified fixes are written directly by the coordinator, no subagent dispatch (see each WP's
own "Written by" line once WPs exist).

## Ground rules that constrain every brief in this folder

See repo-root `STATE.md` for the app's standing rules (raw-time-default, append-only ride
recordings, never-delete, gates-don't-change-colour, etc.) and `OPEN-ITEMS.md` for anything
already parked that a WP might touch.
