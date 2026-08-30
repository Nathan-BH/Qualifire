# Should Qualifire get a "route me somewhere new" button?

You asked for this after a few people who tried the app said the same thing: "can it just
take me somewhere I've never been?" That cuts against how Qualifire works today — every route
is a place you've ridden before, on purpose, so its sectors and colours mean something. This
is the plain-language version of what adding real navigation would actually take, so you can
rule on it.

## Is it even possible?

Yes — and it can run fully offline, with no server and no account. The engine is BRouter, the
same open-source routing engine inside OSMAnd. It's free (MIT licence), and once it has its
map data it calculates routes on the phone with zero signal required.

## What would it actually take?

Three real costs, no hidden ones:

1. **A custom native module.** There's no maintained Expo/React Native wrapper for BRouter
   today, so this is bespoke work — someone has to build the bridge. This is the one genuine
   unknown, and it's already tracked as backlog item **B-49** (open, needs a price).
2. **A 74.7 MB data file**, downloaded once — not bundled into the app. That single tile
   covers all of Belgium and a bit past it (roughly longitude 0–5°, latitude 50–55°). If you
   ever wanted the neighbouring region too, that's another 181 MB tile. Going worldwide just
   means downloading more tiles on demand — no rewrite, ever.
3. **Internet, but only for the search box.** Typing "somewhere new" needs geocoding (turning
   a place name into coordinates). The free option, Nominatim, allows 1 request per second and
   explicitly forbids autocomplete-while-typing. So the design would be: pick your destination
   at the kitchen table while you have signal, then ride with no connection needed at all.

## Is it free?

The routing itself: yes, forever, €0. Paid alternatives exist (GraphHopper, openrouteservice)
but they cap free usage and forbid commercial use — exactly why offline BRouter is the right
pick here instead.

## Does the philosophy have to bend?

No — the proposal builds your rules in as hard constraints, not as an afterthought:

- The router only ever picks the road. It never touches time — no ETA is stored, shown, or
  compared to anything.
- A newly-planned route can't claim a PB, colour a sector, or enter the tower until it's
  ridden 5 clean times and ratified, exactly like any other route earns its place today.
- If you go off the suggested road, the plan just loses — no reroute nagging, no fuss. At the
  end of the ride, whatever you actually rode is offered up as a candidate route, the same as
  now.
- Nothing is ever labelled "fastest." That word doesn't fit the data anyway — on your own
  rides, two-thirds of moving time sits at 22–26 km/h, below the assist cutoff, which means
  the time that matters lives in junctions and traffic lights, not road choice.

In short: navigation would be a **route factory**, not a shortcut around the rules. Its output
still has to earn tower/PB/colour status the exact same way every route does today.

## If you're leaning yes

Two small next steps would de-risk this before any build starts:

- **B-49** — get an actual price on the native BRouter module. This is the only real unknown
  in the whole plan.
- **B-48** — replay the overlap/segmentation numbers against your full 624-ride archive, to
  confirm the sector logic holds up once routes can be planned instead of only recorded.

## What this isn't

This document doesn't rule on the fork — that's still yours alone to call (it's item 4 on
STATE.md's "Awaiting Nathan" list, and the single biggest scope item on the project's books).
No build starts until you do. The full technical answer this is translated from lives in
`product/proposals/ROUTING-AND-SEGMENTATION.md` if you want the detail behind any of the above.
