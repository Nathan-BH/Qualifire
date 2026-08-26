# WP — The E40-underpass GPS dead spot: identified by Nathan, closed as a documented fixture (cycle 025)

**Status: RESOLVED — root cause confirmed by Nathan (ground truth), no build proposed. Kept in
this folder, repurposed as the reference record for this location and as a template for any
repeat elsewhere.**

**Confidence:** CAUSE CONFIRMED (Nathan, 2026-08-25) — the dead spot sits under the bridge
carrying the commute road across the E40 highway; signal loss under a highway overpass. No
further investigation needed; P1 below (testing the terrain hypothesis against the archive) is
withdrawn as unnecessary. **Impact: negligible** — gates before and after the spot fire
correctly every time; the only symptom is a few seconds of stale/frozen GPS mid-sector, cosmetic
to the live map, not to timekeeping. **Size: N/A — no code proposed.**

## Nathan's ruling (2026-08-25)

> "This location is exactly where I go under the bridge which crosses the E40 highway, so all
> connection is lost. So no need for investigation. And I also don't think we can do much about
> it + it does not matter for timekeeping, the gates before and after fire correctly, the only
> inconvenience is a small GPS stale live ride for a few seconds so no big deal. We can think
> about removing this work package I think? But we can log this specific location behaviour
> somewhere, so it is recorded and if it happens at other locations we can verify it as well."

Taken as: (1) no fix, no further investigation; (2) keep a record of this specific location so a
future occurrence elsewhere can be compared against it. This document is repurposed for exactly
that — closed as a work package, kept as the record.

## The evidence — one spot, three days (unchanged)

| date | outage | frozen position | source |
|---|---|---|---|
| 2026-08-25 | 6.0 s from 09:49:33 | 50.850997, 4.6658253 — [Google Maps](https://maps.google.com/?q=50.850997,4.6658253) | `qualifire-20260825-review.md` anomaly 5 (line 15) |
| 2026-08-24 | 5.0 s at 17:58:16 (ride 1) | 50.851211, 4.665836 — [Google Maps](https://maps.google.com/?q=50.851211,4.665836) — 24 m from the 25th's | `qualifire-20260824-review.md` anomaly 5 (line 15) |
| 2026-08-23 | 5.1 s + 5.9 s at 10:17:24–10:17:35 (ride 1) | 50.851709, 4.666172 — [Google Maps](https://maps.google.com/?q=50.851709,4.666172) — ~85 m from the 25th's | `qualifire-20260823-review.md`, ride-1 section (line 47) |

Cause: an E40 highway underpass crosses the road at this point (Nathan, ground-truthed). Sits
inside **sector 3 of the Morning route** (the route's slowest sector, which also contains the
climb) — so sector 3's times on this route permanently carry a small, now-explained,
outage-shaped bias. The post-outage catch-up spikes it produces (36–83 km/h across the three
days) all carry self-incriminating `qf:acc` values, so the accuracy/gap max-speed filter
(proposed as P3 of the companion `WP-stale-first-fix-cleanup.md`) catches them — cited here, not
re-proposed.

## What's closed, and why

- **P1 (test terrain hypothesis against the archive) — WITHDRAWN.** Nathan's ground truth makes
  the archive test moot; no ambiguity left to resolve.
- **P2 (record as known confounder) — DONE, by this document.** The table above plus this
  section *is* the record. A permanent home in `data/analysis/` (a small known-dead-zones file,
  sibling to B-33's eventual mechanism) is still a reasonable place to fold this into once B-33
  lands or a real cycle runs with the Product Owner able to touch `product/BACKLOG.md`; until
  then, this file is the record and should not be deleted.
- **P3 (a "known dead zone" UI marker) — DECLINED.** Nathan: doesn't matter for timekeeping, not
  worth the clutter. Not proposed.

## Reusable template — if this happens again elsewhere

If a future ride-day review finds another recurring outage/frozen-position fixture at a single
real-world location: check it against known infrastructure (bridges, underpasses, tunnels,
dense tree cover, tall buildings) the way this one was resolved, log the coordinates + Maps link
+ affected sector the same way as the table above, and either add it to this file as a second
entry or start a sibling file — Nathan's call at that point, cross-referenced here either way.

## Already tracked nearby — cite, don't duplicate

- **B-33** (OPEN) — signal-chainage confounder map; this record is deliberately shaped to fold
  into it eventually.
- **B-90** (OPEN) — re-acquisition hop discounting; the engine-side guard for the same
  post-outage jumps.
- `WP-stale-first-fix-cleanup.md` P3 (this folder) — the max-speed accuracy/gap filter that
  neutralizes this spot's catch-up spikes.

## What this document is not

Not a backlog edit, not a decision, not an implementation, and — as of 2026-08-25 — not an open
work package: Nathan closed it. It is a reference record, kept intentionally rather than
deleted, per his own request.
