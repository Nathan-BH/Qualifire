# WP — Live position vs. your ghosts: a two-stage feature (chip now, moving dots later) (cycle 025)

**Status: PROPOSAL. Stage 1 (P1) unchanged except the toggle default (now ON — ruled
2026-08-26). Stage 2 (P2)'s mechanism was ruled by Nathan in chat 2026-08-25 — see below —
resolving the pause/resume problem the original brief only posed as a question. Sequencing
re-ruled 2026-08-26: Nathan wants both stages built now so they can be debugged early ("I dont
report any battery issues so lets just do it"); the B-47 battery gate is lifted and B-59 stays
a disclosure line, not a blocker.
Every item below stays labelled UNBUILT — nothing has been implemented, and no app code was
touched in producing this document or its update.** Prepared 2026-08-25 from the notes3 review
(`Nathan/Nathan's_notes3_review.md`, closing italics, line 141).

**Confidence:** that this is new and untracked — HIGH (checked against IDEAS.md and the full
backlog by the source review; independently re-checked against `product/BACKLOG.md` B-01–B-152
for this brief). Feasibility of stage 1 from existing data — HIGH per the review's data-path
argument. Stage 2's mechanism, per Nathan's ruling below — HIGH confidence it's soundly
specified for the "clean ride" case; the pause/hiccup case is explicitly and deliberately out of
scope for v1, not solved. **Size: stage 1 cheap-to-medium; stage 2 medium-to-large and
deliberately sequenced later.**

## The idea, in Nathan's words (2026-08-22, notes3)

Live ghost dots and a live "where am I versus my previous selves right now" during the ride,
removable via a toggle (his own instinct) — reviewed in `Nathan/Nathan's_notes3_review.md` §1
(lines 7–20). The review's key structural finding: **two features hide in the idea, at very
different prices** (line 11), and they should be staged, not bundled.

## Proposals — all UNBUILT

**P1 — UNBUILT — Stage 1: live position readout at gate crossings, behind a toggle, default
ON (ruled 2026-08-26; this brief originally proposed OFF).** (Cheap-to-medium.) Per review lines 13 and 115: each ghost's per-sector times are
already in the results store, so at gate *k* the rider's cumulative time ranks against each
ghost's cumulative time at the same gate — a live "P4 of 11" updating at each gate crossing.
No new data, no new pipeline; a position-chip UI component already exists on the Result board.
Constraints the executor must carry:
- **D-006 / D-027 (live-display safety):** the race screen is glanceable, audio/haptic-first.
  A position chip that updates only at gate crossings (a handful of times per ride, not
  ticking) fits the settled reconciliation, but the brief-writer should say so explicitly and
  the Designer should place it within the existing race-screen layout, not add a new region.
- **Settings toggle, default ON — Nathan's ruling 2026-08-26** (the review had recommended
  OFF; the toggle itself stands, over Nathan's separate-app musing — line 18: a separate app
  "forks the engine, the storage, the map stack, and the catalog"; the settings screen exists
  for exactly this kind of switch). Nathan notes flipping a default is trivial later and he
  may one day run a cycle defining every toggle's default.
- **Time-base honesty (the trap):** D-042 ruled raw wall-clock time the scoring default but
  B-59 (its implementation) is still OPEN — colours and ranks today still compare moving time.
  The live chip MUST use the same time base as the colours/ranks it sits beside, whatever that
  is at ship time, or one screen will tell two stories. State the chosen base in the code and
  the brief.
- Optional design note, not required for acceptance: earcons could carry position *changes*
  (gain/lose a place) so the information arrives without eyes leaving the road (line 18).

**P2 — UNBUILT — Stage 2: moving ghost dots on the live map — mechanism ruled; build now per
Nathan's 2026-08-26 ruling (was: LATER).** (Medium-to-large.) Needs each ghost's position-as-a-function-of-time:
the raw material exists (125 archive rides cached at 1 s resolution on the PC; in-app rides
keep full traces) but the catalog ships splits, not traces — so this means resampled
time-distance curves per ghost in the seed/results pipeline, shipped to the phone, and up to
10 animated markers on the live MapLibre map.

### Nathan's mechanism ruling (2026-08-25, in chat)

> "I think resolving paused and resumed rides would be impossible with ghosts. I think indeed at
> red lights, the unstopped ghosts should sail by you. I think we should use only the first and
> last gate reference which would start kind of like an autopilot program for each of the ghosts
> that will continue until the end gate. So as you cross the first gate, it is a start reference
> so all your ghosts get launched with you and you can see the race live. If there is some very
> minor inaccuracy I think at each gate crossing we can apply a small correction as it is a new
> 'reference' for where you are and where the ghosts should be at that time? [...] so for now it
> would only work on 'perfect' ride with no hiccups where you pause yourself, if a hiccup
> happens, its fine but we can just say that the live position might not be representative of
> the real end position?"

Restated as the mechanism, and this **resolves NEEDS-NATHAN item 2 below**: ghosts run on their
own raw-time pace, launched ("autopilot") the moment the rider crosses the first gate, and
re-anchored to the rider's actual elapsed time at every subsequent gate crossing (not just the
last one) — small corrections at each real checkpoint, rather than one correction at the end or
a continuous re-time-warp between checkpoints. A ghost keeps moving through a red light or any
rider-side pause exactly as raw-time implies (consistent with D-042's answer, now confirmed to
apply to this surface too). Scope for v1: **explicitly limited to "clean" rides** — no
rider-initiated pause/resume. If a hiccup happens mid-ride, the spec is simply to disclose it
("live position may not be representative of the real end position") rather than to reconcile
it — the pause/resume-vs-ghost problem is treated as unsolved by design, not attempted.

**Assessment (does this make sense? — yes, with one open detail for the eventual executor):**
this sidesteps exactly the right problem. Continuously time-locking a ghost to a paused rider
has no honest answer (what is "correct" ghost behavior while you're stopped for a light?), and
Nathan's answer — don't try to reconcile it, just periodically re-anchor at real, unambiguous
reference points (gate crossings) — matches how the rest of the engine already treats gates as
the only ground truth (D-023, raw-is-truth). Correcting at *every* gate rather than only
first/last also bounds drift per-sector instead of letting it compound across a whole ride. One
detail this ruling doesn't need to settle now but the eventual build brief will: between two
gate crossings, does a ghost simply replay its own original pacing (time-shifted to match the
rider's actual arrival at the next gate), or interpolate smoothly toward the corrected position?
Either is consistent with what's ruled here — it's an implementation choice, not a design
question, and can be left to the Sonnet executor brief when P2 is actually scheduled.

Two sequencing gates from the original review (line 14) — **both downgraded 2026-08-26 by
Nathan's build-it-now ruling** (see Status); kept for the record with their new standing:
- **B-47** (battery/stability A/B) — was a hard gate; now lifted. Nathan reports no battery
  issues and wants the feature debuggable ASAP. The risk note stands (the one unexplained
  crash happened with the live map on screen; 10 animated markers is the same risk bucket) —
  keep the on-device stability eyeball in the build brief, but do not wait for B-47.
- **Ideally with/after B-59** (D-042 raw-time implementation) — Nathan's ruling puts ghosts on
  raw time deliberately (they "sail by" at a stop); until B-59 ships, colours/ranks elsewhere in
  the app still compare moving time, so the live map could show raw-time ghost behaviour next to
  moving-time verdicts. Nathan's ruling accepts this as correct ghost behaviour rather than a
  bug to avoid — but the discrepancy versus the rest of the UI is exactly what B-59 will
  resolve, so building P2 before B-59 ships means shipping a screen that's internally consistent
  but briefly inconsistent with the rest of the app. Worth one line in the future execution
  brief, not a blocker now.
- Plus: mandatory on-device eyeball, both themes — MapLibre rendering has bitten twice
  on-device already (dotted-ahead line revert; see also B-145/B-146's standing visual checks).

## Already tracked nearby — cite, don't duplicate

- **B-47, B-59, D-042, D-006/D-027** — sequencing gates and constraints, all cited above.
- **B-28 / D-037** — the timing tower window defines who "the ghosts" are; P1 reuses that
  window definition, it does not invent a new population. **Note (2026-08-26): the ranking
  universe WAS ruled in the RESULT ranking WP — current ride vs the 9 most recent previous
  rides, position out of 10. The live chip follows that ruling: "P4 of 10", never "of 11";
  D-037's last-10 window is amended accordingly.**
- **B-110** (OPEN) — duplicate-lap leak into the ghost window would corrupt the live chip too;
  cite as a pre-existing data-quality dependency, not this WP's work.

## NEEDS-NATHAN

1. ~~Ratify the staging~~ — **RULED 2026-08-26: build both stages now.** The B-47 gate is
   lifted (no battery issues reported; Nathan wants it debuggable ASAP); B-59 remains a
   disclosure line, not a blocker.
2. ~~The ghost-at-a-red-light ruling~~ — **RULED 2026-08-25** (see Nathan's mechanism ruling
   above): ghosts run on raw time and keep moving through a rider's stop.
3. ~~Toggle default~~ — **RULED 2026-08-26: default ON** (reversing this brief's proposed OFF).

## What this document is not

Not a backlog edit, not a decision, not an implementation. An explicitly UNBUILT proposal set
per `process/CYCLE.md`.
