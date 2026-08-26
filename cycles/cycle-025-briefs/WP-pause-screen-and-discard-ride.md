# WP — Pause screen: overflowing button row, missing discard-ride path, and the mystery yellow polyline (cycle 025)

**Status: PROPOSAL ONLY. Every item below is labelled UNBUILT — nothing in this document has
been implemented, and no app code was touched or read in producing it.** Prepared 2026-08-25
from the 2026-08-25 ride-day review (which verified Nathan's screenshot; the review itself did
not read app code — its layout mechanism is a hypothesis it marks as such,
`qualifire-20260825-review.md` line 108).

**Confidence:** the layout bug is CONFIRMED from the 15:37:49 screenshot (RESUME clipped off
the left screen edge). The inflating-microcopy mechanism is HIGH-confidence but unverified in
code. The discard-path gap is CONFIRMED by absence (no visible discard on the pause screen; no
backlog item found — see stop-on-ambiguity note below). The yellow polyline is UNEXPLAINED —
investigation, not fix. **Size: small-to-medium overall** (P1 small, P2 small-to-medium,
P3 small investigation).

## The bugs, in Nathan's words and the review's evidence

From `qualifire-20260825-notes.md` via the review: *"Pause screen layout is wrong … too much
text … the culprit is the extra grey small text."* Evidence in
`data/activities/TEST in app rides/qualifire-20260825/qualifire-20260825-review.md`:

- Screenshot section, 15:37:49 (lines 72–76): the left button reads "**ESUME** back to the rid"
  — the R of RESUME is off-screen; the *buttons themselves* overflow the display, which
  "usually means the row's width isn't constrained and the microcopy inflates each button past
  half a screen each."
- Anomaly 2 (line 12): the pause screenshot's timer reads 0:17.1 at 15:37 — a staged 17-second
  session with **no visible discard path**; END says "ends & saves", so a stub ride is likely
  now sitting in the RIDES tab.
- Anomaly 3 (line 13): the pause map shows a yellow polyline that does not pass through the
  blue dot, at 17 s in — pre-lock (400 m rule), too long to be a ridden trail. "Best guesses: a
  nearby catalogued route rendering unbidden, or leftover geometry from an earlier map state."

## Proposals — all UNBUILT

**P1 — UNBUILT — Fix the pause-menu layout, structurally.** (Small.) Two parts, per the
review's push-back (lines 76, 94):
(a) **Cap the button row at screen width** so no future copy change can push a button
off-screen again — the structural fix, regardless of what happens to the copy.
(b) Copy triage: drop "back to the ride" (RESUME explains itself — "can go with no mourners");
**remove "ends & saves" entirely — RULED by Nathan 2026-08-26: "Remove it. Just END is
enough."** The ruling was given in the context of a proper discard option existing (Q8's
premise), so ship the removal with (or after) P2. Superseded rationale kept for the record:
PAUSE is deliberately an accidental-stop guard (D-042-adjacent, cycle 020), this shared
PAUSE/END menu is where the 2026-08-19 chain incident lost data, and "ends & saves" was the
only destructiveness cue — once END and DISCARD are two distinct actions, the cue's job is
done by the menu structure itself.
Regression note: a shipped pause-layout change is a shipped design change — the
`demos/mockup.html` regen obligation (B-66 / CLAUDE.md §6) and the `design/make_screens.py`
mirror (cycle 024 WP-J convention) both apply.

**P2 — UNBUILT — A "discard ride" path.** (Small-to-medium; design + small code.) There is no
way to end a recording without saving it. Evidence this is a real recurring need, not a
one-off: the 2026-08-25 staged 17-second session (anomaly 2), and the 2026-08-19 chain-incident
stub the review cites as already having argued for it (line 12: "worth noting for the backlog
that a 'discard ride' path still doesn't exist, which the 19th's chain-incident stub already
argued for"). Design questions for the executor (stop-on-ambiguity — propose, don't guess
silently): where discard lives (third action on the pause menu vs. delete-from-RIDES-list vs.
both), whether a discarded ride's raw JSONL is deleted or retained-but-hidden — **RULED by Nathan
2026-08-26: really deleted** ("I only delete rides that I genuinely did not do or should not
count"). He floated, as an optional idea and not a requirement, a trash folder keeping
discarded rides for a week before permanent deletion — the executor may propose it, but plain
permanent delete satisfies the ruling. And confirmation friction (destructive action in the
same menu that already caused one data loss) remains a design question for the executor.
**Stop-on-ambiguity note on tracking status:** no discard/delete-ride item exists in
`product/BACKLOG.md` (checked B-01–B-152, 2026-08-24 snapshot) and none of the four current
review documents says one was filed. If the 2026-08-19 review's ask was captured somewhere else,
cite that item and fold this in rather than duplicating.

**P3 — UNBUILT — Identify the yellow polyline the pause map draws pre-lock.** (Small
investigation.) A code look at what the pause/race map renders before a route lock — which
sources/layers can produce a polyline not through the rider dot at t+17 s. The review's two
hypotheses (nearby catalogued route rendering unbidden; leftover geometry from an earlier map
state) are starting points, not conclusions. Note: this is NOT the behind-you ridden-trail
feature from the 2026-08-24 notes (review line 13 explicitly rules that out — unbuilt and the
line doesn't pass through the dot). Outcome is a diagnosis plus, if it's a real spurious
render, a follow-up fix item.

## Already tracked nearby — cite, don't duplicate

- **B-66** — mockup regen obligation, triggered by P1 if it ships.
- **B-149 / B-150** — other known UI/design-mirror defects; unrelated to this layout bug.
- The maplibre `useFrozenId` crash (separate WP, this folder) — same component territory as P3
  (`routeMapView`), different defect; sequence P3 after or alongside that code pass to share
  the reading cost.

## NEEDS-NATHAN

1. The fate of the 15:37 session — **answered 2026-08-26, inconclusive, with a NEW
   contradiction to resolve in code:** Nathan says such stubs "very well could be" there but
   that he "usually deletes them" (he sometimes opens the app to demo it without riding). This
   brief's P2 premise is that no delete/discard path exists — so either a delete already exists
   somewhere (RIDES list?) and P2's gap is narrower than stated, or Nathan is mistaken about
   deleting. P2 executor's first step: establish in code whether any delete path exists today.
   Nathan also stated the requirement behind the habit: every new ride must start fresh so
   measurements are never confounded by stub sessions.
2. For P3: where he was at 15:37 — **asked 2026-08-26, no answer:** Nathan wasn't on any logged
   ride then and doesn't know; the yellow-polyline identification proceeds from code alone
   (P3 stands as written).
3. ~~Ratify P1(b)~~ — **RULED 2026-08-26: remove "ends & saves"; "Just END is enough."**
4. ~~P2's raw-data ruling~~ — **RULED 2026-08-26: a user-initiated discard really deletes the
   raw JSONL** (optional week-long trash folder floated as a nice-to-have, not required).

## What this document is not

Not a backlog edit, not a decision, not an implementation. An explicitly UNBUILT proposal set
per `process/CYCLE.md`.
