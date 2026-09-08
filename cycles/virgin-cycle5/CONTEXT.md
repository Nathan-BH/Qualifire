# virgin-cycle5 — Root-doc cleanup (main-branch leftover vs staleness)

## Why this cycle exists

Nathan asked (chat, 2026-09-08) for the 7 top-level markdown files (CLAUDE.md, GLOSSARY.md,
HOW-THE-APP-IS-BUILT.md, IDEAS.md, OPEN-ITEMS.md, README.md, STATE.md) to be compared against
the actual current state of the `virgin` branch and updated. Two Fable analysis passes ran
before any execution:

1. **Pass 1 (staleness audit)**: a Haiku Digest condensed all 7 files + repo ground truth
   (cycles/, process/CONVENTIONS.md, git log, app/ structure, test status); a Fable Plan pass
   compared them and found most files lagging behind virgin-cycle2/3/4 (test count 302→560,
   RESULTS tab replacing "Result", WP-3's way/route vocabulary inversion, multi-sport model,
   build7 blank-seed decision — none reflected in the root docs).

2. **Pass 2 (main-branch-leftover audit)**: Nathan pushed back that some of this isn't just
   staleness — some content was never actually written for `virgin` at all, it's main-branch
   material sitting untouched. The same Fable agent read all 7 files in full and confirmed:
   GLOSSARY.md and HOW-THE-APP-IS-BUILT.md are dated 2026-08-24, a week *before* the virgin
   branch was even cut (2026-08-31) — they're the `main` versions, never adapted. Evidence:
   GLOSSARY.md defines "Mockup" as `demos/mockup.html`, which does not exist on this branch;
   both files reference old main-branch cycle numbers and "the team" (the pre-virgin named-
   role process). README.md's claim that "the full GPS archive stays on `main`" is also false
   in fact — `data/strava_export-20260814.zip` still physically sits on this branch.

   Distinction drawn: **artifact leftover** (a reference to something not on this branch —
   cut it) vs **rule leftover** (a decision inherited from `main` that virgin still runs under,
   e.g. 4 sectors/25-50-75%, 3 tiers, raw time, append-only — that's virgin's constitution,
   correctly kept as a pointer, not leftover at all).

## Scope of this cycle

- **GLOSSARY.md** — full rewrite as a virgin-native document (fix the way/route inversion,
  drop mockup/team/old-cycle references, add virgin-native terms: Sport, Results board,
  Timing mode, Reset to virgin, Preview build, legacy-virgin).
- **HOW-THE-APP-IS-BUILT.md** — full rewrite as a virgin-native document (fix tab list/vocab,
  drop mockup reference, rephrase the engine-validation claim as a pointer to `main`, add the
  permanently-blank-seed Preview distinction).
- **STATE.md** — targeted edit: refresh test count, tab list, add a "Vocabulary (since WP-3)"
  section, add multi-sport line, replace stale build-status paragraph, prune resolved stubs,
  cut the dead "three empty directory shells" line, add a cycle-history footer.
- **OPEN-ITEMS.md** — targeted edit: archive/strike cycle1-3 done items with pointers instead
  of re-narrating them, cut the main-backlog tail (WP-G shipped-seed item, stale battery A/B
  question, Nathan's-own-catalog route-naming triage, taste items that were main-backlog
  carryover), trim the empty-state item now that Preview ships no bundled ride.
- **README.md** — small edits: fix the `data/` description (list both test-ride folders,
  stop claiming the archive isn't on this branch), add `cycles/` and `briefs/` (legacy) to
  the tree, soften "no cycle ceremony" wording, add a cycles pointer to "where to start
  reading".
- **data/strava_export-20260814.zip** — move to `safe_to_delete/` (never delete directly,
  per CLAUDE.md rule 5). This is the one physical main-branch artifact actually on `virgin`.
- **CLAUDE.md, IDEAS.md** — no changes (confirmed clean / Nathan's own file respectively).

## How this cycle is being run

Nathan is away for this one and asked for it to run fully autonomously: no blocking questions,
no permission requests to delete (already covered — everything goes to `safe_to_delete/`).
Any ambiguity that would normally go to Nathan is instead ruled on by a fresh Fable subagent
using precedent from prior cycles, STATE.md's ground rules, and process/CONVENTIONS.md —
logged as an `[ASSUMPTION]` rather than left blocking. Standard pipeline: Fable Plan writes a
self-contained brief (with full replacement text for the two rewritten files) → Sonnet Execute
implements it → fresh Fable Inspect verifies adversarially, including rerunning tests/tsc
itself. Status table and token readout below are filled in as each tier completes.
