# Open items — Qualifire (virgin branch)

Short and curated toward one goal: a working prototype Nathan can hand to someone else.
Rewritten 2026-08-31 replacing the 152-item historical backlog (still on `main`'s
`product/BACKLOG.md`, unabridged, if something old ever needs a second look — nothing here
was deleted, just not carried forward). Keep this list current: strike items as they land,
add new ones as they surface, don't let it grow back into what it replaced.

---

## The virgin-prototype path, in order

1. ~~Empty-seed install path~~ — **DONE 2026-08-31.** The catalog/results store reads at
   call time, not import time; hardcoded fallbacks resolve to nothing on a blank install
   instead of leaking Nathan's data; a `virgin` EAS profile exists.
2. **Retroactive way creation + ride-1-as-reference — up next.** Record a ride with no
   matching landmark/way, name the start and end at STOP (the only manual onboarding step),
   auto-create the way from that pair, and the ride you just recorded becomes both the
   reference line and (per the all-purple-first-ride rule in `STATE.md`) your first scored
   lap. This is the actual "record → name → it's a real route" skeleton. Needs:
     - a landmark-naming UI at the STOP step (none exists today)
     - wiring through `catalogStore.ts`'s already-built-but-unused `saveUserCatalog()`
       write seam
     - a reference-ride concept in the data model (doesn't exist yet — `Route.refLineId`
       is a reference *line*, not a marked reference *ride*)
     - **fix the known stub while touching this code:** `initCatalogStore()`'s
       `recompute()` sits outside its try/catch and can throw on a malformed
       `catalog.user.json` (see `STATE.md` → "Known stubs/footguns")
   Design reference: `product/proposals/COLD-START.md` §3 (steps 5–9), specifically "setup
   is retroactive, not prospective."
3. **Save-flow gate UI + provisional gates.** Seed gates at 25/50/75%, snap away from
   traffic-signal intersections (≥150 m clear), tap-then-nudge adjustment. Design
   reference: `product/proposals/SETUP-UX.md` (the adjustment UI is pre-answered there —
   cite it, don't redesign) and `product/proposals/ROUTING-AND-SEGMENTATION.md` §3 (the
   snap rule).
4. **Empty-state pass.** "0 rides found", no route lock on ride 1, and whatever DEMO should
   say when a stranger sees the bundled 'Morning' ride on an otherwise-blank install.
5. **Whole-app export/import.** Zip the catalog, ride-history store, free-ride cache, and
   settings into one file; a checkbox for whether to include raw ride recordings (they're
   append-only, so this can grow large — get a real size estimate before promising it);
   import is overwrite, not merge, gated behind an explicit confirm listing what dies plus
   an automatic pre-import backup of current state. Version-stamp both directions — refuse
   or migrate an unknown schema, never guess. This is what makes a lost/replaced phone, or
   handing your exact setup to a friend, survivable — separate from item 2 above, which is
   what lets a total stranger start from nothing.

## Parked (scoped, not urgent)

- **Sector-coloured trail, phase 2** — extend the already-shipped Result-screen coloured
  spans to the live/racing screen and the demo ride. Fully scoped, needs a mandatory
  on-device both-themes check (the route-line rendering has produced one real device-only
  bug before). Nathan's call to unpause.
- **Free-ride "new>>new" design** — picking an unknown place at *both* ends of a ride has
  no ratified layout yet. Small-to-medium design pass.
- **A real contrast bug** — pale purple text on a bare background in the Rides screen's
  sector rows and the Record screen's gate-colour memo. Small, confirmed by inspection,
  just needs doing.
- **Residual GPS re-acquisition hole** — hops ≤245 m can still slip through the live
  engine's teleport guard uncounted, in theory. Cheap: one field + one line.
- **Raw-time scoring default, the implementation half** — the *rule* (raw wall-clock time
  is the default) is settled (see `STATE.md`); colours/ranks still compare moving time in
  code. Needs the actual switch.

## Needs Nathan, whenever he gets to it — not blocking

- On-device visual checks the app has been waiting on for a few cycles now (day-mode
  remount, footer-overlap fix, WP-E's prestart-dotted-preview, `riderBlue` ratification,
  full both-themes map check).
- A battery A/B (PNG map rung vs MapLibre, two back-to-back commutes) — needed before any
  standalone-APK map work leans on the answer either way.
- The §29 fork (type a destination, get a raceable track) and a handful of route-naming
  triage calls (station/church/fosh alternates vs detours) — his eye, not a coding task.
- A few small taste checks that have sat parked for a while: the REF badge, whether the
  quali-card auto-collapses, real (non-generic) sector names.
