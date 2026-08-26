# WP — Plain-language presentation of the §29 routing fork to Nathan (cycle 025)

**Status: PROPOSAL ONLY — UNBUILT, and deliberately tiny: a doc-only work item, no app code
ever.** Prepared 2026-08-25 from the notes4 review (`Nathan/Nathan's_notes4_review.md` §4,
lines 73–83, and summary line 117). **The fork ruling itself stays Nathan's alone and blocks
any build** — this WP only produces the document he asked for so he can rule.

**Confidence:** HIGH — every question Nathan asked is already answered in
`product/proposals/ROUTING-AND-SEGMENTATION.md` (cycle 011), and the fork is item 4 of
STATE's "Awaiting Nathan" list. **Size: SMALL (doc-only, cheap).** The work is translation to
plain words plus pictures and a cost table — not invention.

## The ask, in Nathan's words (2026-08-25, notes4)

> "Present to me how we could do it and then I can think about it properly."

(Context: multiple people he showed the app wanted a navigation option — "go from my location
to somewhere new" — and he flagged that it cuts against his known-routes philosophy.)

## What the presentation must contain (all pre-answered; review lines 77–81)

The deliverable is a short plain-language document (the review's §4 bullet list is a working
first draft) covering, mapped to his exact questions:

- **Possible?** Yes, offline — BRouter (open-source, MIT, free, no account/key/server; the
  engine inside OSMAnd). Route calculation runs on the phone with no signal.
- **What's needed?** Three real costs: (a) a custom native module — no maintained Expo/RN
  binding exists; priced work, tracked as **B-49** (OPEN); (b) a **74.7 MB routing-data file**
  downloaded once, not bundled; (c) internet only for the search box (geocoding) — Nominatim
  is free at 1 req/s and forbids autocomplete, so the design is resolve-at-the-kitchen-table,
  ride offline.
- **Free?** The routing side is €0 forever; hosted alternatives (GraphHopper API,
  openrouteservice) have caps and non-commercial clauses — exactly why the proposal picks
  offline.
- **Leuven or the world?** A data question, not code: the single 74.7 MB tile covers
  lon 0–5° / lat 50–55° (all of Belgium and beyond); neighbouring tile 181 MB; world = tiles
  on demand. Start with one tile, expand by download, no rewrite.
- **The philosophy conflict** — the proposal built the philosophy in as hard rules: the
  router picks the road but never touches a time (no ETA stored, shown, or compared); a
  planned route cannot claim a PB, colour a sector, or enter the tower until 5 clean rides +
  ratification; if you ignore the plan, "the plan loses to the road" — no reroute nag, and at
  ride end the ridden trace is offered as the candidate route. Nothing is ever called
  "fastest" (measured reason: two-thirds of moving time sits at 22–26 km/h against the assist
  cutoff — the time lives in junctions and lights). Navigation as designed is a **route
  factory** whose output must earn its place like every other route.

Include the two named de-risking steps if Nathan leans yes: **B-49** (price the native
module — the one genuine unknown) and **B-48** (replay the overlap/segmentation numbers on
the 624-ride archive).

## NEEDS-NATHAN

None to *produce* the document. After delivery, one ruling — the §29 fork itself (STATE
"Awaiting Nathan" #4, "the single biggest scope item on the project's books"). No build
starts before that ruling; this WP does not change that.

## Already tracked — cite, don't duplicate

- `product/proposals/ROUTING-AND-SEGMENTATION.md` — the full answer (IDEAS §29).
- B-49 (OPEN, price the native module), B-48 (OPEN, replay the numbers).
- STATE.md "Awaiting Nathan" #4 — the fork remains his alone to call.

## What this document is not

Not the fork ruling, not a build plan, not a backlog edit — a brief for a small doc-only
deliverable, explicitly UNBUILT per `process/CYCLE.md`.
