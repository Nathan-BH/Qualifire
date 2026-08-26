# WP — Comparable variants: a finer level below "route" with shared gates (cycle 025)

**Status: PROPOSAL ONLY — UNBUILT, AND BLOCKED ON THE NAMING RULING IN
`WP-route-naming-migration.md`.** This brief deliberately contains **no naming question of
its own**: what the new level is called (Nathan's proposed "way" collides with the schema's
existing `Way`) is ruled in that brief's NEEDS-NATHAN, in one sitting with its two existing
naming questions. This document uses the placeholder **"variant"** throughout, to be replaced
by whatever Nathan rules. Prepared 2026-08-25 from the notes4 review
(`Nathan/Nathan's_notes4_review.md` §2, lines 32–53, and summary lines 119, 123). No app code
was touched in producing it.

**Confidence:** HIGH on feasibility — DATA-MODEL §8 deliberately deferred sector-sharing
while keeping the door open ("sector identity is keyed to (route, chainage pair), which
leaves the door open without walking through it"); this is the walk through that door, using
Nathan's own stated mechanism. **Size: MEDIUM** (schema extension + save-flow check + a
"which variant was this?" grouping in results). **Spec only after the naming ruling** — the
whole vocabulary depends on it (review line 51).

## The ask, in Nathan's words (2026-08-25, notes4)

> "Then within routes I want to have 'ways' … comparable in terms of sectors. So this would
> be small differences which only occur between sectors, so the whole sector times are
> comparable between 'ways' of the same 'routes'. … I think you would still need to do a
> reference ride for each way, but you can save them to the same route so they are
> comparable. … we should match exactly all the 5 gates so those rides are comparable. Is
> that feasible?"

## Where it sits in the model (review lines 36–43)

The existing hierarchy: **Way** (ordered landmark pair, e.g. home→work) → **Route** (curated
path within a way; h>>w-w and h>>w-d are two routes, never colour-compared — D-010/D-015,
B-41; Nathan's notes4 "route" matches the existing "route" exactly). This WP adds a **third,
finer level below route**: small day-to-day line choices that share **all 5 gates**, whose
sector times are therefore genuinely comparable.

## The mechanism — feasible via Nathan's own instinct (review lines 45–49)

1. **Each variant carries its own reference line** (from its own reference ride), so route
   lock and the 40 m corridor work normally mid-variant. Without that, a deviation bigger
   than ~40 m would drop the lock and void the sector.
2. **The 5 gates become shared physical crossing lines** pinned to stretches of road common
   to all variants — which requires exactly Nathan's stated constraint: differences live
   strictly *between* gates, never at them.
3. **The honesty check:** when saving a second variant, the app verifies the new reference
   trace actually crosses all 5 existing gate lines (within corridor tolerance) and **refuses
   "comparable variant" status if it doesn't**. That check is what makes comparability honest
   rather than assumed.
4. Sector times then compare legitimately: same start gate, same end gate, different tarmac
   in between — line choice becomes part of what you're racing.

## Work sketch (post-ruling)

- Schema: a variant level under route, each with its own reference line, sharing the parent
  route's gate set (keyed compatibly with DATA-MODEL §8's (route, chainage pair) sector
  identity).
- Save flow: the gates-crossing verification above, with the refusal path tested.
- Results: comparison pools span variants of the same route; a "which variant was this?"
  grouping in ride results/history.
- Tests: fixture where variant B's trace misses one gate line → refused; fixture where all 5
  cross → sector times pool with variant A.

## BLOCKING — NEEDS-NATHAN (all ruled in `WP-route-naming-migration.md`, not here)

1. **The naming ruling** — rename the existing schema `Way` (landmark pair) or pick a new
   word for this level ("variant", "line", "trace" — his call). **Update 2026-08-26: Nathan
   answered "trace" (keeping `Way` as is), but the answer is held for one collision check —
   "trace" already means a ride's recorded GPS line in this very brief ("reference trace")
   and in the app's VIEW TRACE view. See `WP-route-naming-migration.md` NEEDS-NATHAN 3.** The word "way" is
   load-bearing in the schema (`Way`, `wayId`), the catalog, the Routes tab, and every
   analysis doc; adopting notes4's nomenclature as written means renaming the existing
   concept everywhere. One sitting with that brief's two existing questions; doing the rename
   migration *before* minting this third level is the cheap order — every week adds more data
   keyed to the current words (review line 43).
2. **Non-blocking letters check** (review lines 53, 127): h>>w-**w** / h>>w-**d** read as
   wet/dry (matching `StationHomeWet`); if the letters mean something else it changes the
   naming discussion, not this mechanism.

## Already tracked — cite, don't duplicate

- `WP-route-naming-migration.md` (cycle 025) — the single source of truth for the naming
  decision; extended 2026-08-25 with this third question.
- DATA-MODEL §8 — the deliberate deferral this WP walks through.
- D-010 / D-015 / B-41 — different routes stay grouped-never-colour-compared; untouched by
  this WP (variants are *below* route, and only they compare).
- Possible interaction, flagged not resolved: B-61/B-62/B-64 route-triage items ask whether
  certain ride clusters are "real alternatives vs detours" — after this mechanism exists,
  "comparable variant of one route" becomes a third possible answer for some of them. Noted
  so the triage doesn't hard-code a two-way choice; genuinely uncertain, not asserted.

## What this document is not

Not a naming decision (that lives in `WP-route-naming-migration.md`), not a schema change,
not a backlog edit — an explicitly UNBUILT proposal per `process/CYCLE.md`, blocked by design
until the naming ruling exists.
