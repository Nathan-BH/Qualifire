# Where things stand

**Updated 2026-08-24, after cycle 024.** Plain-language twin of `STATE.md` — no bare
IDs. Regenerated at the end of every cycle from now on.

## On your phone today

- Every one of your 20 routes now scores live, not just the 4 it used to (Morning,
  Evening A, Evening B, Morning B). Pick a route or let it auto-detect — the app locks
  onto whichever one you're actually riding, biased by your pick but never fooled by it.
- Free-ride ("new" destination) works too: pick "new" for either end on RECORD, get
  your own sector board on RESULT, kept separate from route PBs. Only "new" at *both*
  ends is still deferred.
- RECORD is a proper flow now: set up → armed → running → the finish moment,
  full-screen the whole time you're riding.
- RIDES and RESULT match the mockup you saw (cycle 020): expandable ride rows with
  sector splits, and a "your last ride" + Personal Bests view.
- The live map redraws faster and more honestly (route line solid, unscored gate ticks
  yellow-with-a-black-outline, not the near-invisible grey you reported).
- New folder `design/`: an editable SVG of every screen. Edit in Inkscape, save into
  `design/edited/`, it's picked up at the next cycle start.

## What just changed (this cycle)

- The live engine now candidates all 20 routes at once, with a fix for a GPS
  "re-acquisition" bug that could trick it into locking the wrong route.
- A new ride-history store that survives app restarts (the old one was memory-only).
- Two things you reported directly got same-day fixes: the live screen overlapping
  your phone's own nav bar, and a map-rendering regression.
- This bookkeeping pass: `product/` split into live / proposed-but-unbuilt /
  superseded; backlog and decision log caught up.

## What's next

- **A real contrast bug** — pale purple text, hard to read on Rides and Record. Small
  fix, not done yet.
- **Free-ride "both ends unknown"** — waiting on its own design pass, per your ask.
- **Raw-time scoring** (stops count against your lap) — decided 2026-08-17, still not
  built.

## What needs you

- On-device eyeball checks: the pre-start map preview (now fully dotted), the new blue
  rider dot at night near the canal, the footer-overlap fix on your actual phone.
- The `product/` folder reshuffle this cycle is reversible — a glance, not a real gate.
- One old runbook (`BUILD-3-RUNBOOK.md`) moved into `safe_to_delete/` — worth a glance
  before that folder is ever emptied, since that's the point it becomes permanent.

## Where to read more

- `STATE.md` — the fuller, technical version of this page.
- `GLOSSARY.md` / `HOW-THE-APP-IS-BUILT.md` — the words and the architecture.
- `product/BACKLOG.md` — everything open. `cycles/cycle-024.md` — the full record.
