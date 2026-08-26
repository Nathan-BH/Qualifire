# WP — Virgin/cold-start build epic: the record-first blank-app flow (cycle 025)

**Status: PROPOSAL ONLY — UNBUILT. Nothing below has been implemented; no app code was touched
in producing it.** Prepared 2026-08-25 from the notes4 review
(`Nathan/Nathan's_notes4_review.md` §1, lines 9–28, and summary line 115), which verified the
ask against `product/proposals/COLD-START.md`, the backlog, and STATE. Per this repo's
convention the brief is written now so the work is sized and sequenced; it is an **epic** —
much bigger than one work package — and must be sequenced against the ten cycle-025 briefs
already written, not jumped ahead of them.

**Confidence:** HIGH that the design already exists — Nathan's notes4 flow independently
reproduces the cycle-011 cold-start design almost exactly (review lines 11–16: *"These are the
same design"*). **Size: LARGE** (an epic spanning at least: the B-39 remainder, then
B-35/36/37/42/43, plus the save-flow UI spec below). Not a design task; a promotion of an
existing unbuilt design to a build epic.

## The ask, in Nathan's words (2026-08-25, notes4)

> "We should also try as soon as possible to have a 'virgin' app build … if I want other
> people to use this they should be able to start from a blank state and not need any computer
> and code updates to add routes and edit them."

His flow: record rides first (live blue dot, yellow trail, no landmarks/gates yet) → save at
the end → give it a name → define begin and endpoint as landmarks → auto-annotate gates
(start/end within 1% of ride, gates at 25/50/75%, adjustable percentages) → reusable from the
RECORD tab.

## Why this is a promotion, not a design (review lines 11–16)

`product/proposals/COLD-START.md` (cycle 011) already specifies this flow: *"setup is
retroactive, not prospective … ride 1 must be ride first, name after"*; naming start + end at
STOP is "the only true onboarding step"; landmarks *"born from visited endpoints"*; the way
created automatically from the (start, end) pair; ride 1 the reference by default. It was
decomposed long ago into backlog items, **all still OPEN**: B-35 (cold-start ladder), B-36
(retroactive way creation), B-37 (provisional gates), B-42 (ride-1 reference default), B-43
(empty-state pass).

## Sequencing — where the epic starts (review line 18)

**The one technical prerequisite is the unfinished half of B-39.** Cycle 024's WP-D3
de-hardcoded the UI screens, but per B-39 and STATE ("Known stubs/flags") **the empty-seed
install path is still untouched** — the backlog's own words: *"Blocks every user-created
way."* Nothing else in the flow can exist before it. Proposed order:

1. B-39 remainder — empty-seed install path.
2. B-36 + B-42 — retroactive way creation + ride-1-as-reference (the save flow's skeleton).
3. The save-flow UI per Nathan's spec (below) + B-37 provisional gates.
4. B-35 — the "ride n of 5" countdown ladder (see NEEDS-NATHAN 2).
5. B-43 — the empty-state pass across every screen.

## The save-flow gate spec — Nathan's scheme plus what's already designed (review lines 20–26)

- **Seed at Nathan's percentages** (25/50/75 for 4 sectors — the equal-chainage split
  COLD-START step 8 already proposes), then **snap per `ROUTING-AND-SEGMENTATION.md` §3**:
  each gate moves to the middle of the longest traffic-signal-free stretch nearby, and no gate
  lands within 150 m of a controlled intersection (a gate at a red light corrupts that
  sector's times — D-011, the project's oldest measured lesson). Keep Nathan's
  "adjust the percentage" option on top.
- **Adjustment UI is pre-answered:** `SETUP-UX.md` argues against finger-dragging gates
  (thumb covers the line) and proposes tap-then-nudge with ± buttons. Cite it; don't redesign.
- ~~Fold in B-38 (sector count scales with route length)~~ — **struck by Nathan's 2026-08-26
  ruling: always exactly 4 sectors (gates at 25/50/75%), never length-scaled** — the F1 model
  (every track has 4 sectors) is the product identity. The `n = clamp(L/1400 m, 3, 6)`
  proposal is dead for gate seeding; keep only the adjust-the-percentages option on top.
- **Gates at the save step of ride 1** is Nathan's genuine addition over COLD-START (which
  waited for ride 2 to confirm the corridor, B-37). The review endorses it (line 26): the
  ride-1 trace is the reference line anyway, and the honesty machinery holds — gates from one
  ride are a starting grid, not a benchmark; colours never fire before 5 clean rides
  (MIN_HISTORY, D-008), regardless.

## BLOCKING / NEEDS-NATHAN

1. **The direction ruling — RULED 2026-08-26: "This is an actual goal that is a top
   priority."** Other-people-can-use-this is now official; Nathan wants the virgin build ASAP
   so he can test it himself first. Principal: record as a decision (it supersedes the
   design-lens-only reading in D-001/D-012/COLD-START's header). Follow-ups he asked in the
   same answer — to be ANSWERED to him, not decided: how "expo dev" works; whether updating
   his standalone "qualifire preview" app (and later the virgin app) needs a full build each
   time or whether a QR-code/OTA update suffices, with a build required only for new native
   capability (e.g. an actual map component).
2. **Does the countdown ladder (B-35) ship inside the epic? — STILL OPEN 2026-08-26:** Nathan:
   "I have no idea what this countdown ladder idea is. Explain it further." The re-ask must
   first explain B-35: on a freshly created route, colours/verdicts stay silent until 5 clean
   rides exist (MIN_HISTORY, D-008), so a blank app looks broken; the ladder is UI copy like
   "ride 2 of 5 — 3 more before colours unlock", making the app read as loading, not broken.
   Then re-ask: ship inside this epic, or later as its own item?
3. ~~Confirm the "within 1%" reading~~ — **CONFIRMED 2026-08-26: "Yes exactly."** Start gate
   at exactly 1% and end gate at exactly 99% of route distance as the defaults.
4. ~~Fixed 25/50/75 vs length-scaled sector count~~ — **RULED 2026-08-26: fixed 4 sectors,
   always; do NOT scale with length.** Nathan, rejecting the review's B-38 recommendation:
   scaling "would break the whole app and drift away from my original idea (in F1 sector
   times are different based on tracks, but you always have 4 sectors)". Product Owner note:
   B-38 should be closed/won't-fix or re-scoped to record this.

## Already tracked — cite, don't duplicate

- `product/proposals/COLD-START.md` — the design itself (unbuilt).
- B-35, B-36, B-37, B-38, B-42, B-43 (all OPEN); B-39 (PART-DONE — empty-seed path remains).
- `ROUTING-AND-SEGMENTATION.md` §3 (gate-seeding snap rule); `SETUP-UX.md` (tap-then-nudge).
- D-008 / MIN_HISTORY; D-011 (gates vs traffic lights).
- Complement, not substitute: whole-app export/import (`WP-whole-app-export-import.md`) solves
  *your phone → new phone* and *you → a friend wanting your routes*; only this epic solves the
  stranger-in-another-city case (review line 67).

## What this document is not

Not a backlog edit, not a decision, not an implementation, and not a request to start work
ahead of the existing cycle-025 queue. An explicitly UNBUILT proposal per `process/CYCLE.md`.
