# virgin-cycle3 — README (start here, especially in a fresh chat)

**Goal of this cycle:** Nathan is handing over work-package tasks one by one; each becomes
an execution-ready brief here, same shape as `virgin-cycle1`/`virgin-cycle2`. Nothing in this
cycle has been executed yet.

## Status at a glance (updated 2026-09-05)

| WP | What | Size | Status | Brief |
|---|---|---|---|---|
| 1 | Multi-sport support — user-defined sports, one active sport (tag-and-filter over the existing single stores), switch from SETTINGS or a RECORD-screen pill row | large (3 phases: A data-model, B settings/browse UI, C record-flow wiring) | **BRIEF WRITTEN, NOT YET EXECUTED.** Phase A must land first; B and C are file-disjoint and can follow in either order. Nathan answered Q1/Q2/Q3/Q4/Q5 (2026-09-05) — re-brief pending his WP-2 answers too (his own request: batch both before re-briefing). **Runs BEFORE WP-3** per WP-3's own execution-order call — lands in today's vocabulary, WP-3's identifier pass covers it for free. | `WP-1-multi-sport-support.md` |
| 2 | Re-introduce a results/rankings tab — per-route board (ride count desc) → detail screen with map preview + all-time tower + a Strava-style time-vs-date scatterplot | large (3 phases: A pure models+tests, B tab/list/Shell/detail, C scatterplot component) | **BRIEF WRITTEN, NOT YET EXECUTED.** Resolves the STATE.md 9+1 ranking-window rule as scoped to scoring, not this history view; no react-native-svg (native module, avoided). 3 open questions for Nathan (Q1 is a veto-check on the STATE.md scoping) — awaiting his answers. **Runs BEFORE WP-3** — lands in today's vocabulary (its brief already explains the mapping in §1.2), WP-3's identifier pass covers it for free; no separate reconciliation pass needed. | `WP-2-results-tab.md` |
| 3 | Way/Route terminology + structure inversion — Route becomes the base from→to path, Way becomes a named variant/subdivision of it (today's schema has this backwards); full field-mapping table + versioned on-disk migration for Nathan's real catalog/results data | large, one indivisible Phase A (types+store+migration+tests, single commit) + a comments-only Phase B | **BRIEF WRITTEN, NOT YET EXECUTED — BLOCKED: runs LAST, after WP-1 and WP-2 both fully land** (Plan's own call: WP-1/WP-2's briefs are anchor-verified in today's vocabulary; WP-3's tree-wide identifier-node swap then covers their landed code for free — re-issuing WP-1/WP-2 post-swap would mean re-verifying every anchor). Highest-risk item in this cycle: on-disk `catalog.user.json`/results files on Nathan's real phone must migrate, never silently misread. 5 open questions for Nathan, Q3 is a veto on the run-last ordering itself. | `WP-3-way-route-inversion.md` |

**Read next:** `CONTEXT.md` for the framing (fill in as WPs land), then
`QUESTIONS-FOR-NATHAN.md` for anything still needing Nathan's input.

## How to resume this cycle (in this chat or a fresh one)

1. Read this README, then `CONTEXT.md`, then `QUESTIONS-FOR-NATHAN.md`.
2. Pick any WP not yet executed. Once more than one WP exists, check each brief's own
   collision notes before starting — cycle2's WP-I/WP-K `RoutesScreen.tsx` overlap is the
   model for how to flag and order these.
3. Dispatch a Sonnet **Execute** agent against that WP's brief file, exactly as written —
   including any "Inspect findings" section, which may have corrected the original design.
4. Run the verification commands the brief specifies (test suite + `tsc --noEmit`).
5. Commit the changed files straight to the device so Nathan can build/test same-day.
6. Update this README's status table and the relevant WP file's status line as work lands.
7. If Execute hits a genuine ambiguity, don't guess — forward it to a fresh Fable ruling pass
   and, if it's a real open product question, log it in `QUESTIONS-FOR-NATHAN.md`.

## What's deliberately not in this cycle

_(fill in once WPs are added — mirror `CONTEXT.md`'s "covers vs. deliberately left out"
section)_
