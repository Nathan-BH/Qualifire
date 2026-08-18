# Cycle 019 — 2026-08-18

Trigger: Nathan — build the home>work A/B alt from last cycle plus "other
routes with confirmed alternatives"; ruled mid-cycle: any demos/ways ride not
"ignore" is usable. Also: RECORD map preview "still not showing" on pick.

## What shipped

**Map-preview report — no code bug.** Traced pick→routeId→GeoJSONSource
`data`: reacts correctly (checked installed maplibre-react-native source).
Real causes instead: home>work had only one route until this cycle (no pill
row existed there to test), and cycle 018's new hooks can make Fast Refresh
remount rather than patch a stale bundle. Told Nathan to hard-reload; home>work
now also has pills to test against.

**Catalog 3→19 routes, 2→13 ways**, built from Nathan's own `demos/ways/*.html`
tags. New pill (multi-route) ways: home>work (+MorningB, the rain/asphalt
seed), work>station/station>work (route A/B), home>station (preferred/
via-fosh). New single-route ways: station>home, home>church, church>home,
home>fosh, fosh>home, work>fosh, church>fosh. Gates are COLD-START.md's own
documented equal-chainage cold-start substitute, explicitly unratified.
`puttestraat` excluded — dormant landmark, unreachable in START/GOING TO
regardless of catalog content (verified in code, not assumed). Projection
math matches `08_build_route_assets.py` exactly (sub-pixel verified).
`routeMapView.tsx` PNG-fallback hardened (`!asset` only) so PNG-less new
routes draw from `path` instead of blanking on that rung. Updated
`routemap_suite.ts`/`store_suite.ts`/`routemapgeo_suite.ts` for the new data.

**Must reach Nathan:** the live engine (`refs.ts` TRACK_IDS) is still
hardcoded to Morning/EveningA/EveningB. All 16 new routes preview and show
pills but never lock or score live — that's B-39, separate work.

## Inspector findings

Fresh Fable reran tsc/tests/validateCatalog independently (clean),
recomputed all 16 routes' endpoint/gate math from scratch, grep-verified
source rides against raw html, traced the PNG fallback for crash risk (none).
PASS. 3 cosmetic notes: a stray scratch file (moved to safe_to_delete/), a
misleading "ratified" word in a test message (fixed), demos/mockup.html
regen deferred to next design pass (this cycle is catalog data, not new UI).

## Process notes

Full D-039 tiers, two coupled threads. Fable planner's own math-check of the
coordinator's pre-built geometry caught real bugs (zeroed projection fields
would've broken offRouteM + a test). Sonnet executor correctly stopped on an
out-of-scope failing test rather than patch around it; coordinator fixed that
(stale hardcoded bounding box) and the message wording directly, <10 lines
each. Fresh Fable inspector PASS. No new BACKLOG item (covered by B-39).
