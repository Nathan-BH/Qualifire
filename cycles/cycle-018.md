# Cycle 018 — 2026-08-18

Trigger: Nathan — RECORD has no way to declare a route upfront; last commute
on Evening B, the live map only corrected at gate 1. Also asked which of
this ships without a build.

## What shipped

**RecordScreen.tsx** — "WHICH ROUTE TODAY?" pills when a way has >1 route
(EveningA/EveningB), after GOING TO, defaulting to most-ridden-recent
(DATA-MODEL §8a, Nathan 2026-08-16, re-confirmed today — app had drifted to
auto-detect-only under a comment that mis-cited §8a). Prestart map preview
now follows the pick (was hardcoded to route 0). `rideRouteHint` shows the
pick as a live-map placeholder pre-lock — grep-verified presentation-only,
never touches tierOf/sectorValues/lapValues/gateColours/engine scoring.
Pure JS/TSX, ships on next Metro reload, no build. **routeMapView.tsx** —
camera-fit effect re-keys on `props.routeId` so a pick reframes the map.

## Inspector findings

Fresh Fable re-read both files, reran `tsc --noEmit` (clean) and the suite
(134 tests, 131 pass, 0 fail, 3 skip — unchanged). PASS.

## Out of scope

Seeding the engine's LOCK TIMING with the pick — the real gate-1 fix.
`engine.ts` has no unlock/re-detect once locked, and Evening A/B share their
first stretch, so biasing lock timing risks locking onto the wrong road on a
real deviation — violates §8a's own honesty rule. Filed as B-65, which also
surfaces B-41/COLD-START §10 contradicting §8a (unresolved).

## Process notes

Full D-039 tiers: Haiku triage → Fable planner → Sonnet executor (one
ambiguity, block ordering, escalated to Fable, resolved) → fresh Fable
inspector, PASS. Found this cycle: cloud sandbox CAN run tsc/tests via
`device_bash` on the mounted repo (node_modules present, no network needed)
— contradicts STATE.md's standing "verification needs Nathan's PC" note;
correct next Principal pass. No STATE.md change. BACKLOG.md: added B-65.
