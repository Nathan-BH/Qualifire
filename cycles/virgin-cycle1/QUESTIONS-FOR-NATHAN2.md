# virgin-cycle1 — questions that need your answer (batch 2)

Same convention as `QUESTIONS-FOR-NATHAN.md`: type your answer into the **Answer:** line
under each question, save the file, and whoever picks up this cycle next reads your answer
straight from it. These two are the only genuine open questions left from the 2026-09-03
Digest+Plan pass on WP-E/G/H/I/K/M — everything else in that pass shipped with its own
defaults and needs nothing from you.

## Ready to execute now — no answer needed

**WP-E** (virgin manifest gate-leak), **WP-G** (route specifications/variants), **WP-K**
(sector-coloured trail phase 2), **WP-M** (RECORD setup layout) — all four have
execution-ready briefs in this folder and don't need anything from you to start. **WP-H**
(ride detail screen) and **WP-I** (gate card map + finger scrub) are also ready to execute
for everything EXCEPT the one question each below — those two sections (WP-H §8.1, WP-I §3.5)
should wait for your answer.

## Questions — answer inline, one per block

### Q1 — `WP-H-ride-detail-screen.md` §8.1 (promote-to-reference for an existing route)

`Route.referenceRideId`'s own doc comment already anticipates "promoting a later clean lap"
as a route's reference ride, but no code does it today. WP-H's brief ships only ONE way to
use "set as reference" from the new ride-detail screen: creating a brand-new way/route from
a ride that doesn't match anything yet — exactly the same seam WP-F already built.

What it does NOT do: let you take a ride on a route you ALREADY have, and say "actually, use
THIS ride as the new reference line for that route instead of the one it has now." That's a
different, bigger feature — it would need to redo that route's gate chainages and every
already-scored ride's sector cut points, since they're all measured against the current
reference line. WP-I (gate card) will touch exactly this kind of chainage handling, so the
brief's default is to build promotion as its own follow-on WP after WP-I lands, not inside
WP-H.

Do you want "promote this ride to replace an existing route's reference line" as a feature at
all, and if so, is landing it after WP-I an acceptable order — or is this something you'd
want sooner?

**Answer:** Lets add the feature to set any ride as a new reference for a known route. But instead of recomputing the gates for previous ride, for know lets have it reset this ride's progress. So there should be a warning like "This route will be overwritten and past ghosts will be lost". And then you just start again from there.

### Q2 — `WP-I-gate-card-map-scrub.md` §3.5 (finger-scrub gesture)

Your Q1 answer in the first questions file settled that the ± nudge pad stays, and made clear
you want the gate-adjustment card to show gates moving along your REAL ride line instead of
today's straight bar (that part is built into WP-I's map half, ready to go regardless of this
answer). What your answer didn't clearly settle is the OTHER half of the original ask: adding
a new finger-scrub gesture — tap a gate to select it, then slide a finger left/right anywhere
on the card to move it — on top of the ± pad.

`STATE.md` currently has a binding rule: "adjustment UI is tap-then-nudge with ± buttons,
never finger-dragging (thumb covers the line)." Building the scrub would mean formally
amending that rule (to something like "select-then-move; never dragging the marker under the
thumb," since your version doesn't put a finger directly on the line) — not something to do
on an ambiguous reading of your last answer.

The gate card now draws your real ride line and the ± pad moves the gates along it (WP-I map
half, ready either way). Separately: do you also want the finger-scrub — tap a gate, then
slide left/right anywhere on the card to move it coarsely along the ride, with the ± pad kept
for fine adjustments? Yes / no / not now.

**Answer:** Lets keep just the +-pad for now and not implement the finger dragging. To make it easier lets have two + and two -buttons. Two buttons are big and move the gate +-1% of the ride. The smaller ones move it 0.1% of the ride. This way you can make both small and big changes easily.

## Not yet answerable — carried over from the first questions file, unrelated to this batch

See `QUESTIONS-FOR-NATHAN.md`'s own final section (the nav-model call) — that one was
resolved as part of planning WP-H (no navigation library added; see that brief's status line)
and does not need a separate answer here.
