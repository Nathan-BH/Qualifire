# WP — Startup stale-fix cleanup: one cached GPS point, five polluted statistics, 4-for-4 ride days (cycle 025)

**Status: PROPOSAL ONLY. Every item below is labelled UNBUILT — nothing in this document has
been implemented, and no app code was touched or read in producing it.** Prepared 2026-08-25
from the 2026-08-23/24/25 ride-day reviews. Code seams named below are proposals for the
executor to verify at HEAD, not verified anchors.

**Confidence:** the symptom set is CONFIRMED — present in every GPX+ ride day to date (4-for-4:
2026-08-22 per the relaunch brief's file, plus 23rd, 24th, 25th). The single-root-cause claim
("it all still reconciles to the same one fix") is the reviews' consistent finding across three
independent day-passes — HIGH confidence. The fix *shape* is a proposal. **Size: medium**
(the core fix touches the recording/export boundary and needs a D-023 ruling honoured
carefully; P2–P4 are small riders).

## The evidence trail — exact citations

- `qualifire-20260825-review.md` anomaly 4 (line 14), the worst outing yet:
  `firstFixDelayS` = **−9.1 s**, 22 s warm-up, six coarse points (accuracy 23–90 m) frozen at
  the door. Blast radius in one file: **four phantom outage-log entries** (of five total — only
  one real), **both** stop-log entries phantom (ride was nonstop), a ghost **52.7 km/h** sprint
  at 09:42:04 (82 m stale→real jump), ~90 m phantom distance, and a **new facet**: the route
  matcher anchored all 20 candidates on the stale pre-START fix — diagnostics anchor timestamps
  precede the START button by 9 seconds.
- `qualifire-20260824-review.md` anomaly 4 (line 14), 3-for-3 as of that day:
  `firstFixDelayS` = −10.54 / −7.23 / −6.30 across the three rides; each file's outage log and
  stop log opens with a phantom first-stale-fix→first-real-fix entry; fake **92 km/h** spike in
  ride 2. "One fix — drop or flag the pre-START point — cleans all three."
- `qualifire-20260823-review.md` anomaly 4 (line 14): first flagged — negative
  `firstFixDelayS` (−7.489, −11.052) is the stale cached Android fix predating the START press;
  the metric silently becomes "how stale was the cached fix". Anomaly 5 (line 15): the export
  keeps garbage points (a 500 m-accuracy point ~220 m off), so naive viewers/speed calcs read
  43–47 km/h moments never ridden.
- Related spike class, same hygiene family: `qualifire-20260824-review.md` anomaly 5 (line 15)
  — post-outage catch-up points read 50–83 km/h; "any max-speed figure Qualifire ever shows
  must filter on `qf:acc` and gap-adjacency." `qualifire-20260825-review.md` anomaly 5
  (line 15) confirms the filter would have caught every one of that day's spikes (all carry
  self-incriminating `qf:acc` 11–23 m).

## Proposals — all UNBUILT

**P1 — UNBUILT — Drop-or-flag pre-START and warm-up points at the session boundary.** (Medium;
the core.) One decision and one seam:
- *The rule:* a fix whose timestamp precedes the START press, and (separately decidable)
  fixes below an accuracy threshold during the initial warm-up, are excluded from everything
  *derived*: outage log, stop log, speed/max-speed, distance, `firstFixDelayS`, and route-match
  anchoring. The pre-START timestamp test alone would have caught the primary offender on all
  four days (every stale fix predates the button).
- *The D-023 constraint (non-negotiable):* raw ride JSONL is never rewritten. **Sub-choice
  RULED by Nathan 2026-08-26: option (b) — keep recording pre-START points for now (the app
  is still in development), but flag them and make every derived consumer (exporter stats,
  engine feed, matcher anchoring) honour the flag.** He explicitly left the door open to
  switching to (a) later ("if later we find that it is not relevant we can remove the tracking
  before START"). No Principal escalation needed; (a) is off the table for this pass.
- *Matcher note:* the engine already has a poor-accuracy retry (cycle 024 WP-G Part 2,
  `MATCH_RETRY_ACC_M = 30`) — that is downstream self-healing, not a substitute: on 2026-08-25
  the diagnostics still show all 20 candidates anchored 9 s before START. P1 is upstream of it.

**P2 — UNBUILT — Pin `firstFixDelayS` semantics.** (Small, spec + exporter.) The 23rd's
review's exact ask: clamp at 0 and log the stale fix separately, or rename the field's meaning.
Falls out nearly for free once P1 defines what the "first fix" is.

**P3 — UNBUILT — Accuracy/gap-adjacency filter on any displayed max speed.** (Small.) The
24th's rule, re-endorsed by the 25th (line 104, pick 4): max-speed figures filter out points
with poor `qf:acc` and points adjacent to a recording gap. Covers the outage catch-up spikes
that P1's pre-START rule alone does not (they happen mid-ride, e.g. at the dead spot — see the
companion WP-gps-dead-spot-fixture brief).

**P4 — UNBUILT — Confirm `elevationOutliers` omitted-when-empty is intentional.** (Tiny.)
`qualifire-20260825-review.md` line 27: the 25th's session block carries no `elevationOutliers`
element at all, consistent with only-written-when-non-empty — "worth confirming it's
intentional rather than a dropped feature." One code look, one sentence in the spec.

## Acceptance shape (for whoever briefs the executor)

A replay of the 2026-08-25 file's opening 25 seconds through the fixed pipeline yields: zero
phantom outages, zero phantom stops, no >50 km/h point, `firstFixDelayS` ≥ 0 (or renamed), and
matcher anchor timestamps ≥ the START press. The four existing ride-day files are the fixture
material — no new data needed.

## Already tracked nearby — cite, don't duplicate

- **B-75** — `POOR_ACCURACY_M = 50` calibration "once enough real route-match-diagnostic events
  accumulate": four ride days of warm-up diagnostics are exactly that evidence; an executor may
  close B-75 in the same pass, but P1 does not depend on it.
- **B-90** — re-acquisition hop discounting in `core/src/live.ts`: same junk-GPS family,
  different mechanism (mid-ride re-acquisition, not startup staleness). Cite, don't merge.
- Cycle 024 WP-G Part 2 (match retry) — landed; see P1's matcher note.
- The relaunch/crash counter thread is explicitly NOT this WP —
  `cycles/cycle-025-briefs/WP-relaunch-crash-recovery-investigation.md` owns it, and the 25th
  confirmed no new data for it (line 22).

## NEEDS-NATHAN

Nothing blocking. (The P1 record-vs-flag sub-choice was ruled directly by Nathan 2026-08-26:
record-but-flag — see P1. No escalation remains.)

## What this document is not

Not a backlog edit, not a decision, not an implementation. An explicitly UNBUILT proposal set
per `process/CYCLE.md`.
