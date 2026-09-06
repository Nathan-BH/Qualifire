# virgin-cycle3 — README (start here, especially in a fresh chat)

**Goal of this cycle:** Nathan handed over three work-package tasks one by one; each became
an execution-ready brief here, same shape as `virgin-cycle1`/`virgin-cycle2`.

## Status at a glance (updated 2026-09-06 — ALL THREE WPs LANDED)

All three work packages are executed, tested, and independently inspected on branch
`virgin`. Nathan ran this cycle overnight, fully autonomously (explicit "don't ask
questions, keep going" instruction) — no outstanding approvals.

| WP | What | Status | Commits | Inspect findings |
|---|---|---|---|---|
| 3 | Way/Route terminology + structure inversion — `Route` is now the base from→to path (`Route.wayIds`), `Way` is a named variant/subdivision of it (`Way.routeId`, carries `specs`); on-disk schema bumped to v2 with a read-side migration; TS-compiler-API identifier-swap codemod applied tree-wide; `legacy-virgin` branch preserves the pre-swap naming for history. **Ran FIRST** (Nathan's final call, reversing the brief's original "run last" recommendation) so WP-1/WP-2 could be authored and executed directly in post-WP-3 vocabulary. | **LANDED** | `1773a03` (Phase A: identifiers, schema v2, seeds, strings) | 2 non-blocking: (1) a couple of event-literal renames outside brief scope affect old-ride GPX+ export; (2) a minor GPX+ v2 naming inconsistency in a few sub-attributes. Both flagged, deliberately left unfixed (out of brief scope, no product-decision needed to leave as-is). |
| 1 | Multi-sport support — user-defined sports (zero seeded by default), one global "active sport", tag-and-filter over the existing single Catalog/results/settings stores (not per-sport storage roots), switch from a new SETTINGS "Sports" section or a RECORD-screen pill row; RECORD blocks with a first-class message when no sport exists yet. | **LANDED** | `c597193` (Phase A: sports.ts/sportStore.ts, tag-and-filter scoping) · `dce0f83` (Phase B: SETTINGS Sports section, ROUTES/RIDES sport lens) · `66837b9` (Phase C: RECORD block + sport pill row, engine/session/naming scoping) | 1 non-blocking: `CatalogDetailScreen.tsx`'s `placeDetailFor` reads the unscoped catalog, so a place's detail can list another sport's routes/ways. Confirmed real, deliberately left unfixed — needs a product decision on splitting "list" scoping from "deletable" scoping, not a mechanical fix. |
| 2 | Re-introduce a RESULTS tab (SETTINGS' orphaned "Rankings" toggle now has somewhere to point) — per-way board (most-ridden first, full names), tap a way → all-time ranked history board (fastest first, no tier colours, provisional per Nathan's "build it, refine later") + a Strava-inspired last-9-rides scatterplot (faster=up, purple/green/yellow by window average, no panning, hand-rolled Views — no `react-native-svg`). | **LANDED** | `e527b6f` (Phase A: models+tests) · `9fb1365` (Phase B: tab/list/detail/Shell) · `e17f90d` (Phase C: scatterplot component) · `a8d5037` (fix pass: 3 blocking Inspect findings — missing avg-line label, tap-to-deselect not wired, caption missing "of N") · `ff2fb74` (polish: avg-label column width, flagged by the fix's own re-verification pass) | Initial Inspect pass found 3 blocking + 7 non-blocking issues in the Phase C scatterplot; all 3 blocking + all 7 non-blocking were fixed in `a8d5037`, then independently re-verified against the actual code (not the fix's own claims) — confirmed genuinely closed. Re-verification itself flagged one small cosmetic follow-up (avg-label truncation risk), fixed directly in `ff2fb74`. |

**Final test suite: 560 tests, 557 pass / 0 fail / 3 skip. `tsc --noEmit`: exit 0.** (verified
independently multiple times across the cycle, most recently after `ff2fb74`)

**Read next:** `CONTEXT.md` for the framing, `QUESTIONS-FOR-NATHAN.md` for the full Q&A record
(all answered), `TOKEN-USAGE.md` for the dispatch/token readout.

## How this cycle actually ran

1. Nathan handed over WP-1, WP-2, WP-3 one at a time; each got a Digest (Haiku) → Plan
   (Fable) pass producing a self-contained brief.
2. Nathan answered all open questions in `QUESTIONS-FOR-NATHAN.md`; briefs were revised to
   incorporate the answers, including flipping the execution order (WP-3 first, not last)
   on his explicit instruction.
3. Nathan then instructed fully autonomous execution overnight: "no more questions, no
   permission requests, move forward." Each WP was dispatched as a Sonnet Execute agent
   against its brief (phase by phase where the brief specified phases), verified against
   the brief's own acceptance criteria and the test suite + `tsc --noEmit`, then committed
   straight to the device.
4. Each landed WP got an independent, fresh-context Inspect pass (Fable, no memory of the
   execute work) re-verifying against the brief from scratch. Where Inspect found real
   (non-speculative) problems, a targeted fix pass was dispatched and then independently
   re-verified again before calling the WP done — this happened for WP-2's scatterplot.
5. A ~7-hour device-bridge outage (Nathan's PC asleep overnight, 2026-09-06 ~14:00–~21:30
   UTC) paused WP-2's Phase C mid-flight; the in-progress work was held safely (already-
   committed phases stayed committed, the not-yet-pushed Phase C code was kept
   base64-encoded in the coordinator's scratchpad) and resumed the moment the bridge
   reconnected, with no rework needed.

## What's deliberately not in this cycle

- Any lossless backward migration path for pre-WP-3 on-disk data beyond the `legacy-virgin`
  branch's historical snapshot — Nathan indicated tolerance for a possible virgin reset,
  so WP-3's migration is intentionally simplified (a straight schema-version bump, not a
  dual-emit compatibility layer).
- Fixing the two WP-1/WP-3 non-blocking Inspect findings above — both need a product
  decision, not a mechanical fix, and are logged for a future cycle rather than guessed at.
- On-device visual verification (screenshots on Nathan's phone) — everything above is
  verified by code reading, the automated test suite, and `tsc`; Nathan still gets a first
  look at the actual UI himself.
