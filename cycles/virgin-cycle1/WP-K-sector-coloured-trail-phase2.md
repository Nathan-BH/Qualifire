**Status: NOT STARTED. Blocked on WP-C (won't be visible on the virgin build until user routes are drawable) and on Q7 — but Q7 just needs a yes/no, nothing else.**
**Review doc item: 11 (T — parked in OPEN-ITEMS, "Nathan's call to unpause"). Size: medium.**

## What it is

Extend the already-built Result-screen sector-coloured trail (`routeMapView.tsx`'s `sectorSpansFeatureCollection`, already wired up for Result) to the live/racing map too. Already scoped, nothing to design — genuinely just needs "unpause" plus WP-C for it to actually be visible on a virgin/user-created route.

## Why it's "blocked"

Only in the sense that: (a) it needs WP-C to be seen on the virgin build (the only route in scope for this cycle's actual test rides is user-created), and (b) review open question 7 is literally just "unpause? yes/no" — this is the cheapest question in the whole list to answer. Once Nathan says yes, this can be planned same-day.

## Note from the review, worth restating

Nathan reacted to "gates coloured" on the live screen, but that's actually the live rung's separate `gateColours` tick-marks feature, not the sector-trail. His own clarification: "the gates should not change colour like they do now because it does not make sense, they are gates. Just the sector segments changing colour is enough." — so unpausing this item is specifically "colour the segments between gates," not "colour the gate ticks themselves." Keep that distinction in whatever brief eventually gets written.
