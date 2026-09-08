# Questions for Nathan 2 — virgin-cycle5 (follow-ups on your answers)

Your answers in `QUESTIONS-FOR-NATHAN.md` are in and mostly decisive — they're being applied to
the three briefs now. One of them (Q1) opened a real technical fork that's worth your eyes before
NW-1 gets built, because it contradicts something already sitting in the code as the *planned*
future behaviour. Same format as file 1: answer inline, save, whoever executes reads from here.

---

## Blocks `BRIEF-product-docs-cleanup.md` §12 NW-1 (the colour-model code change)

### Q1′ — Does the reference ride itself show a colour, or does it stay unscored?

**Your Q1 answer, restated:** the first ride on a way (the one that becomes the way's reference —
`Way.referenceRideId`, `routeCreation.ts`) isn't a scored lap. Ride 2 compares against that one
reference point: faster → purple, slower → yellow, no green yet. Ride 3+ compares against the
growing average and green becomes possible.

**Why this needs another look:** that's internally consistent with the colour model already in
the code (`colourModel.ts`: purple = fastest of the window, green = above the recent average,
yellow = below it) — with only one comparison point, "fastest" and "above average" are the same
number, so purple/yellow-only falls out naturally once there are two rides on file (reference +
ride 1) and green appears once there are three. Good — it means the fix is likely small: lower
`MIN_HISTORY` from 5 down to something like 1, and let the existing model do the rest, rather than
writing new special-case logic.

**But it conflicts with something already written into the code as the intended future state.**
`routeCreation.ts:24` says, in a comment: *"route.referenceRideId records the ride-1-as-reference
designation. Deriving that ride into the route's first scored all-purple lap is STILL deferred —
a later package."* That comment — and `STATE.md`'s current wording, and the original brief's
premise — all assume the reference ride (ride 1) itself gets shown as an all-purple lap, a small
ceremony ("purple by definition," `GLOSSARY.md`), not a blank/neutral entry. Your answer describes
ride 2 as the first ride that gets a colour at all, which means the reference ride's *own* row —
in RIDES, in its history — would need to show as neutral/unscored instead of purple.

**The actual question:** when someone finishes the ride that becomes a way's reference (ride 1),
what should its own entry show?
- **(a) Neutral / unscored** — "reference" is a role, not a result; no colour, no rank, matches
  the model in your Q1 answer exactly as written. (This is what I'd build unless you say otherwise.)
- **(b) All-purple, as ceremony** — matches the existing code comment and `GLOSSARY.md`'s "purple
  by definition" framing; ride 2 would then be the *second* purple/yellow comparison, not the first
  (i.e. ride 1 = purple by ceremony, ride 2 = compared against it, ride 3+ = full model — functionally
  close to what's already written in `STATE.md` today, just with the reference ride explicitly
  carrying the purple rather than being invisible).
- **(c) Something else** (say what).

Your answer:


### Q1″ — One-line confirmation, so NW-1 isn't built on a guess
"Reference route" in your Q1 answer = the way's `referenceRideId` (the ride that names the
landmarks and seeds the gates, `routeCreation.ts` / `GLOSSARY.md`'s "Reference ride" entry) —
not a separate manually-entered route. Right?

Your answer (yes / no, and if no, what you meant):


---

## Not blocking anything — just flagging so it doesn't get missed later

- **`LAYOUT.md`/`CONCEPT.md`'s "ideal-lap line"** and the **brand-vs-drafts palette reconciliation
  sentence** (`OPEN-ITEMS.md`/`product/brand/README.md`) are still sitting as open, undecided items
  from the original review — neither was in round 1's questions, so neither is answered yet. Not
  urgent; they'll keep showing up in future audits until someone rules on them, whenever that's
  convenient for you.
- Everything else from round 1 (Q2–Q8) reads as decisive as given — no extra opinion needed, and
  the relevant briefs are being updated to match.
