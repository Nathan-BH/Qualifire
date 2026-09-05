# virgin-cycle2 — questions that need your answer

Same convention as `virgin-cycle1`'s `QUESTIONS-FOR-NATHAN.md`/`QUESTIONS-FOR-NATHAN2.md`:
type your answer into the **Answer:** line under each question, save the file, and whoever
picks up this cycle next reads your answer straight from it.

## All three questions answered (2026-09-05) — nothing left blocking

**WP-A through WP-M** (see README for the full list) all have execution-ready briefs.
Q1 folded a small note into `WP-B-gate-placement-scale-bug.md`; Q2 resolved
`WP-I-edit-existing-route-gates.md`'s one open product question (re-timing confirmed, no
follow-on needed); Q3 came with a full design spec and became **WP-M**
(`WP-M-map-two-finger-rotation.md`), inspected and ready like every other brief in this cycle.
Answers kept below for the record.

## Questions — answered inline

### Q1 — `WP-B-gate-placement-scale-bug.md` (which route to check, updated 2026-09-04) — ANSWERED, folded into the brief

The bunched-gates bug (gates landing near the middle/end of a route instead of spread along
it) is not a gate-math bug: the reference line the app builds is coming out much longer than
the real ride, because fixes are read off the phone's disk in the order they were WRITTEN,
not the order they were RECORDED — a stretch of GPS fixes got written interleaved (out of
time order), and the reference-line builder (unlike your GPX exporter, which already sorts by
time) just reads them in file order. The code fix (WP-B, this cycle) sorts everywhere.

**This was originally found on route 20260903-182911-3c34 (work>>home), but you deleted that
route before your 2026-09-04 evening ride — so it's gone.** A second route hit the exact same
bug though: your 2026-09-04 evening "WorkHomeWet" route (created after you re-picked WorkHome
and added the "Wet" specification) shows the identical pattern — a stored reference length of
~9.2 km for what should be a ~5.9 km ride, worse than 3c34's case (40 scrambled fix-order
reversals vs. 20). **That route is still on your phone and is the one to use for the checks
below.**

To help pin down WHY the file gets written out of order (most likely Android delivering GPS
in batches while the phone was in your pocket, two batches landing at once):

1. Once the fix is on your phone: on the RIDES tab, re-export the GPX+ of the WorkHomeWet ride
   (the ride file itself is never rewritten, so it still carries the scramble) and drop it in
   `data/activities/`. A new `<qf:fixOrder outOfOrder="..."/>` line in its session block is the
   proof. Then use "set as reference" on that same ride to rebuild the route (gates re-seed,
   old results cleared) — or delete it and re-record, your call.
2. During that evening ride, was the phone screen off / in a pocket or bag, or mounted with
   the RECORD screen visible? (If visible, the batching story is weaker and we look elsewhere.)

**Answer:** As I understdand I need to wait after this cycle's fixes are implemented so I will wait and then export the ride again. I dont believe my phone screen was ever off, but it is not something I can say with certainty. What could be the case is that I switched between apps during the ride, maybe that is an explanation. But in any cases it should be robust to these actions.

### Q2 — `WP-I-edit-existing-route-gates.md` (what "starting over" means when you move a gate) — ANSWERED, resolved

You said: "if I edit the gate, it should not recalculate, and just say that previous
recordings will be lost (starting over basically)." The brief built for this (WP-I) follows
the same convention the app already uses for "set this ride as the new reference" (cycle1's
WP-H, which you ratified): your old rides on that route get their RESULTS cleared, then
automatically re-timed against the new gate positions (since the app re-derives results at
boot anyway, doing it right away just makes what's shown match what's true).

That may not be exactly what you meant by "starting over" — it could also mean the old rides
should be gone from the route for good, not re-scored at all under the new gates. The brief
as written does the first (re-time), which is a smaller, already-proven pattern; making old
rides disappear entirely instead is a small, separate follow-on if that's what you actually
want.

After you move a gate, your old rides on that route come back re-timed against the new gates
(same as "make this the reference"). Is that "starting over" to you, or do you want them gone
from the route for good?

**Answer:** if its possible to re-recompute accurately then lets have the previous rides re-timed against the new gates position. I just thought it would be difficult to implement so I proposed to just start from "scratch" as if it was a new reference route set for the first time.

### Q3 — two-finger map rotation (your own open question from 2026-09-04) — ANSWERED, now WP-M

Your note: "Normally on phone maps if you touch the map with two fingers and rotate them
together (counter)clockwise, it turns the map, I see our map do not have this feature, is
this by design or omission? if we do decide to implement it, then we should have the option
to switch between: choosing the map orientation, so keep it as it was last turned with two
fingers, or what we have now in race mode where the map follows the ride direction, so you
are always riding 'up' following the path. I believe that's how most apps do it (either a
fixed orientation or dynamic)."

This is currently an omission, not a deliberate design choice (no code was found gating
two-finger rotation off on purpose) — but it's not in this cycle's brief list because it's a
genuine "do you want this at all, and if so which mode(s)" product question, not a bug with an
obvious fix. No brief has been written for it yet.

Do you want two-finger map rotation at all? If yes: just the "keep it where you last turned
it" mode, just the "always follow ride direction" mode (closer to what RACE already does), or
both as a switchable setting?

**Answer:** Lets try to implement it if its not too troublesome. It should be a switchable setting, but not in the settings, a single button that switches between two states. Add it to the openmap buttons (together with the zoom, "me" and "fit"  buttons that are on the top right of the openmaps renders.
- maybe a small question I have: what is the current openmaps orientation, is it just "north" on the  top ? or is nothing specified. I think that's what's set because when I zoom out I see the full world map with Europe on top a southern hemisphere on the bottom
- if we implement the two fingers rotation feature, the map should turn accordingly and then you can "reset" the view by pressing the new compass button we will add. pressing it will switch between north on top like now. This is every openmap render except the race mode one. (so the after pressing record yes, but once you press start not anymore) For all other openmaps such as the ones in the record tab, rides, results or anywhere else they should have this feature.
- in actual race mode we just keep it as it is now with the orientation matching the route's direction. no change needed.
Does it make sense ?
