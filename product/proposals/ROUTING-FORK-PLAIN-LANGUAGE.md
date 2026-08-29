# §29 routing fork — plain-language presentation

Updated: 2026-08-29 (cycle 025 execution pass)

## The question

Should Qualifire let a rider pick a new destination and get navigation, even though the app's core idea is racing known routes with honest timing?

## Short answer

Yes, technically possible, and still compatible with Qualifire's philosophy **if navigation is treated as a route factory, not a timing authority**.

## How it could work (plain language)

1. You choose a destination.
2. The app calculates a route offline on-device (no account, no cloud dependency).
3. You ride it.
4. At the end, the ridden trace can be offered as a candidate Qualifire route.
5. That candidate only becomes a normal race route after repeat rides + ratification.

So navigation helps create routes, but does not get to claim PBs or sector colours immediately.

## Cost and feasibility

### Is it possible?

Yes.

### Is it free?

Routing engine choice can stay free (offline stack). Hosted routing APIs are not preferred because of caps/terms and because they add service dependency.

### What needs to be built?

- A native routing module integration (the main engineering unknown).
- One-time routing data download for the region.
- A destination search UX (internet for geocoding lookups, ride itself can stay offline).

## Geography scope

Start with one region tile (Belgium coverage already sized in prior proposal work), then let users add more tiles later. No architecture rewrite needed for expansion.

## Philosophy guardrails (non-negotiable)

- The router may pick roads, but **never owns timing truth**.
- No ETA is stored, scored, or compared.
- Planned routes cannot enter PB/tower/sector-colour scoring until they become proven routes.
- If the rider deviates, the road wins; no punitive reroute behavior.

## De-risk before any full build commitment

1. **B-49** — price and de-risk the native module integration.
2. **B-48** — replay overlap/segmentation checks on the archive to confirm assumptions.

## Decision Nathan needs to make

Pick one:

- **A)** Stay known-routes-only (no navigation feature).
- **B)** Build navigation as a route-factory feature with the guardrails above.

No implementation should start before this ruling.
