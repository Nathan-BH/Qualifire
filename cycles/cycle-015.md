# Cycle 015 — 2026-08-17

Trigger: Nathan — "run B-50 through the model-tier protocol (D-039)". Execution cycle, Fable chat as Principal.

## Rulings

Stock OpenFreeMap `dark` style; palette firewall + label hiding deferred to B-51. MapLibre lazy-loaded via require() with try/catch fallback to PNG; touch gestures disabled, existing +/−/FIT buttons kept. Course-up bearing from successive engine fixes (≥8 m guard), not trackUserLocation (D-025: dot renders TRUE fixes).

## What shipped

Branch `spike/maplibre` (uncommitted):
- `app/src/ui/routeMapView.tsx` 197→393 lines: RouteMapView picks MapLibreRouteMap vs PngRouteMap (byte-identical extraction). MapLibre path: v11 Map/Camera, OpenFreeMap dark, route LineString #F5C542 4pt / #14120C 7pt casing, gates circle layer transparent-until-scored, rider dot grey beyond 120 m, credit "OpenFreeMap © OpenMapTiles Data from OpenStreetMap". Fallback: PNG → drawn segments.
- NEW `app/src/ui/routeMapGeo.ts` 122 lines: routeLineFeature / gatesFeatureCollection / riderFeature / routeBounds / bearingBetween; [lat,lon]→[lon,lat] swap.
- NEW `app/tests/routemapgeo_suite.ts` 8 tests, registered in run.ts.
- Moved to safe_to_delete/: maplibreSmoke.ts, 6 executor probes, .git/index.lock + lock copies to git-locks/.

Verification: 108 tests (105 pass / 0 fail / 3 skip); `npx tsc --noEmit` clean. PngRouteMap byte-identical. RecordScreen/DemoScreen untouched.

## Inspector findings

Non-blocking, logged for B-51: '−' button doesn't leave FIT mode; empty-string gate colour would pass ['has'] check (harden to treat '' as null); B-51 owns palette firewall + label hiding. API corrections: GeoJSONSource prop is `data` not `shape`; Layer uses type/paint/layout; LngLat/LngLatBounds are [lon,lat] / [w,s,e,n] tuples.

## Process notes

STATE.md and repo locks touched 15:27 by unidentified process (D-040 or editor polling); no content damage. Tokens: Haiku triage ~29k, Fable planner, Sonnet executor ~122k, Fable inspector ~102k.

**Next:** Nathan commits, runs `.\build4.ps1 -BuildProfile development` (build 5), then on-device checklist.
