# WP — Whole-app export/import: backup and restore as one file (cycle 025)

**Status: PROPOSAL ONLY — UNBUILT, and awaiting two decisions from Nathan (see
NEEDS-NATHAN).** Prepared 2026-08-25 from the notes4 review
(`Nathan/Nathan's_notes4_review.md` §3, lines 57–69, and summary line 116), which verified
against the full backlog that **nothing in the 152 items covers this** — it is genuinely new.
No app code was touched in producing this brief.

**Confidence:** HIGH on feasibility (everything that makes the app Nathan's lives in a known,
enumerable set of on-phone stores). **Size: SMALL-TO-MEDIUM.** Fully consistent with
D-001/D-012 (single-user, no accounts, no sync — a file you move yourself violates no ruling).

## The ask, in Nathan's words (2026-08-25, notes4)

> "I also want to have an option where instead of just exporting your ride, you can export the
> 'whole app'. This way if I load a virgin app, but I already have routes and such saved from
> somewhere else, I could just upload it and it will overwrite my current app data with this
> new one? Is this feasible?"

## Why it matters beyond convenience (review line 59)

COLD-START §4 lists "one device, never reinstalled" as a load-bearing assumption that is
essentially unprotected today — a lost phone currently loses everything. This WP is the
protection.

## Scope of the export (review lines 59, 63)

Zip into one file: the catalog (landmarks/ways/routes/gates), the ride-history store
(`results/index.json` + per-ride files), the free-ride cache, settings — small (KBs–MBs) and
covering "load my routes onto a virgin app". Raw GPS recordings are the open question: raw is
append-only by design (D-023), so including them makes the file grow forever, but makes it a
true full backup. The review's recommendation: one export with a checkbox — "include raw ride
recordings" (NEEDS-NATHAN 1).

## Import semantics (review line 64)

**Overwrite, not merge** — Nathan said overwrite and the review agrees (merge semantics over
clashing route ids and two ride histories is a swamp). But overwrite is destructive, so two
safety steps are **non-negotiable** in this brief:

1. A confirm step that says exactly what dies.
2. An automatic export of the current state *before* the import lands, so a mistaken restore
   is reversible.

## Version stamping (review line 65 — not Nathan's to decide, just required)

The exporter must stamp schema versions and the importer must refuse or migrate, never guess.
This is the B-133 lesson (the free-ride cache's missing `schemaVersion` check) at file scale;
coordinate with B-133 and note B-128 (mode missing from the raw JSONL header) if header-level
fields are being touched anyway.

## Relationship to the virgin-build epic (review line 67)

Complementary, not a substitute: export/import solves *your phone → your new phone* and
*you → a friend who wants your exact routes*. A stranger in another city imports nothing —
they need the record-first flow (`WP-virgin-cold-start-epic.md`). The "other people" goal
depends on that epic, not on this WP.

## Acceptance sketch

- Export → wipe (or fresh install) → import → catalog, ride history, free rides and settings
  byte-equivalent (modulo the version stamp).
- Import over existing data leaves an automatic pre-import backup on disk.
- An import file with an unknown/older schema version is refused or migrated, with a test for
  the refusal path.
- Full suite green, `tsc` clean (repo rule 6).

## NEEDS-NATHAN (blocking the final spec, not the sizing)

1. ~~What's in the file~~ — **RULED 2026-08-26: the checkbox.** One export flow with an
   "include raw ride recordings: yes/no" option, as recommended. **Action item Nathan attached
   to the ruling: produce a size estimate for a full whole-app export (raw recordings
   included) so he can judge feasibility** — add to this brief's acceptance (estimate from the
   current on-phone stores: catalog + results + free-ride cache + settings, plus the raw rides
   directory).
2. ~~Confirm overwrite semantics~~ — **CONFIRMED 2026-08-26:** explicit confirmation listing
   exactly what dies, plus the automatic pre-import backup. **Two spec questions Nathan asked
   back — the planner answers them in the final spec (design choices, not Nathan-decisions)
   and tells him:** (a) where the pre-import backup lives (proposal: one fixed slot in the
   app's document directory, surfaced in settings); (b) whether backups accumulate or only one
   is kept (proposal: a single rolling pre-import backup, overwritten on each import — user-
   initiated exports are separate files and never touched).

## Already tracked — cite, don't duplicate

- D-001 / D-012 (single-user, no accounts, no sync) — unviolated.
- D-023 (raw is append-only/immutable) — why raw inclusion is a size decision.
- B-133 (schemaVersion check), B-128 (header-level mode field) — same lesson, coordinate.
- COLD-START §4 ("one device, never reinstalled" assumption).

## What this document is not

Not a backlog edit, not a decision, not an implementation — an explicitly UNBUILT proposal per
`process/CYCLE.md`, awaiting NEEDS-NATHAN 1–2 before the spec is final.
