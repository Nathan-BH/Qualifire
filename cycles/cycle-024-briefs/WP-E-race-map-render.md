# WP-E — Race-map render fixes (gate ticks, rider dot, dotted-ahead line)

**Executor model:** Sonnet, no other context. **Stop-on-ambiguity:** if anything below does not match the live repo when you open it, STOP and escalate — do not guess. Cycle 023 is landing changes to these same files; every line anchor in this brief is from the 2026-08-20 snapshot and MUST be re-verified against the live file before editing (see "Conflict with 023" below).

## Goal in Nathan's words
From the 19 Aug ride review (§3) and 20 Aug notes: (1) the gate circles are invisible in night mode — "uncoloured" was implemented as transparent fill + near-black ring on a near-black basemap; replace circles with "a short tick perpendicular to the route, centred on the gate", in a dim theme-aware colour until the sector scores (honesty rule intact: never a verdict colour a gate hasn't earned, but VISIBLE). (2) "A yellow dot on a yellow route line is poor contrast" — give the rider dot its own colour in both themes, keep off-route as an outline/badge change, and finally TELL the rider what the off-route state means (nobody ever explained the old grey dot). (3) "Dotted-ahead / solid-behind — genuinely new… a dotted line ahead reads as suggestion": route line dotted ahead of the rider, solid behind.

## Current state (snapshot 2026-08-20, verify against live repo)

- `app/src/ui/routeMapView.tsx` (590 lines in snapshot)
  - Line 78: `const OFF_ROUTE_M = 120;` — stays.
  - Lines 81–82: `CASING = '#14120C'`, `GROUND_FILL = '#E8E4DA'` (D-031 light-PNG palette).
  - MapLibre rung: route line layers `route-casing`/`route-core` lines 342–351 (solid, `colors.neutral` core, `CASING` casing); gate circles layer `gate-rings` lines 352–359 (`circle-color` from per-feature `colour` else transparent, `circle-stroke-color: CASING` — the night-invisibility bug); rider dot layer `rider-dot` lines 360–369 (`circle-color: off ? t.textDim : colors.neutral` — yellow-on-yellow bug); OFF ROUTE badge lines 394–396.
  - PNG rung: gate circle Views lines 500–512 (`backgroundColor: col ?? GROUND_FILL, borderColor: CASING` — fine on the light PNG, unchanged complaint-wise but shape changes to tick); rider dot View lines 513–520 (same yellow); badge 545–547; `imgFailed` segment-line fallback renderer lines 478–499 (absolute Views rotated — reuse this pattern for ticks); styles `st.gate` 560, `st.dot` 561.
- `app/src/ui/routeMapGeo.ts` (141 lines): pure GeoJSON builders — `routeLineFeature` 43–53, `gatesFeatureCollection` 65–86 (KEEP it, see change 1), `riderFeature` 88–94, `metresBetween` 121–128, `bearingBetween` 132–141. CRITICAL house rule (file header): RouteAsset stores `[lat,lon]`; GeoJSON wants `[lon,lat]`.
- `app/src/ui/routeMapMath.ts` (163 lines): `RouteAsset` has `path?: [lat,lon][]` (line 35) and `gateIdx?: number[]` (line 37 — index into `path` of each gate). `projectToPixel` 57–62, `metresPerPixel` 66–68. **`offRouteM` 76–92 measures distance to the straight GATE-TO-GATE chords, not the drawn path** — a road bend >120 m from the chord reads falsely off-route (almost certainly Nathan's 20 Aug ride-4 "off-route while perfectly on course"; CHECK-023-FIRST E-B below).
- `app/src/ui/theme.ts`: `colors` block lines 11–27 (`neutral '#F5C542'` = route yellow; `grey '#6f6e6a'` NO-DATA only; NO RED anywhere, D-013; green/purple are verdict-only — the map may never wear them unearned). `daylight` 64–76 (`textDim '#8A8577'`), `night` 78–90 (`textDim` = `#9a978f`).
- Gate colours arrive from RecordScreen (`gateColours` memo, RecordScreen.tsx 310–319) as `chipColors(tier, t).text` per scored sector, `null` for unscored — that contract is unchanged.
- Tests: `app/tests/routemap_suite.ts` (5 tests, px maths), `routemapgeo_suite.ts` (10 tests, GeoJSON builders), `routemapstyle_suite.ts` (9 tests, untouched by this WP). **NOTE: these three suite files and theme.ts were MISSING from the analysis snapshot and were staged from Nathan's PC on 2026-08-20 — treat the live repo as truth.**

## Changes

### 1. `routeMapGeo.ts` — three new pure builders (additive; keep every existing export)
Keep `gatesFeatureCollection` exported and its tests intact (the route workbench, WP-C, will want point features; removing it churns tests and invites 023 conflicts). Add:

a) `nearestOnPath(path: [number, number][], lat: number, lon: number): { seg: number; t: number; distM: number } | null`
   - Returns null if `path.length < 2`. Planar equirectangular frame (same constants as `metresBetween`): for each segment, project the point, clamp t to [0,1], keep the best. `seg` = index of the segment's first vertex.

b) `gateTicksFeatureCollection(a: RouteAsset, gateColours?: (string | null)[], halfLenM = 15): GeoFeatureCollection<LineStringGeometry, GateProperties>`
   - One 2-point LineString per gate, centred on the gate, perpendicular to the route heading there, total ground length `2*halfLenM` (30 m).
   - Heading at gate i: if `a.path && a.gateIdx && a.gateIdx.length === a.gates.length`: `j = a.gateIdx[i]`, heading = `bearingBetween(path[max(j-1,0)], path[min(j+1, path.length-1)])` (lat/lon order per path storage). Fallback (no path/gateIdx): heading from gate `max(i-1,0)` to gate `min(i+1, n-1)` lat/lon.
   - Perpendicular endpoints: `perp = (heading + 90) * π/180`; `dLat = halfLenM * cos(perp) / 111320`; `dLon = halfLenM * sin(perp) / (111320 * cos(lat*π/180))`; endpoints `[g.lon ± dLon, g.lat ± dLat]` (GeoJSON [lon,lat] — do the swap exactly as the existing builders do).
   - `colour` property: identical contract to `gatesFeatureCollection` (omit when null, treat `''` as null — B-50 hardening).

c) `routeSplitFeatures(a: RouteAsset, rider: { lat: number; lon: number } | null, opts: { active: boolean; offRoute: boolean }): GeoFeatureCollection<LineStringGeometry, { seg: 'behind' | 'ahead' }> | null`
   - null when no drawable path (`!a.path || a.path.length < 2`), same rule as `routeLineFeature`.
   - `active === false` → single feature `seg:'behind'` with the whole line (today's solid render).
   - `active && (rider === null || opts.offRoute || nearestOnPath dist > 120)` → single feature `seg:'ahead'` (whole line dotted — all of it is still "suggestion"; when off-route we have not earned a "behind" claim).
   - Otherwise split at the nearest-on-path point P (from `nearestOnPath`): behind = `path[0..seg]` + P, ahead = P + `path[seg+1..]`; both features share P as their boundary coordinate. Degenerate splits (P at an endpoint) may emit a 1-coordinate part — drop any part with <2 coordinates and emit the other alone.

### 2. `routeMapMath.ts` — fix `offRouteM` to measure against the drawn path *(CHECK-023-FIRST E-B — skip if 023 already did this)*
Replace the gate-chord loop with: if `a.path && a.path.length >= 2`, iterate the projected `path` segments (projectToPixel per vertex — precompute once per call; path is decimated, this is O(hundreds) at 1 Hz, fine); else fall back to the existing gate-chord loop. Same return (metres via `metresPerPixel`). The 120 m paint threshold in routeMapView stays. Add `gateTickPx(a: RouteAsset, i: number, halfLenM = 15): { x0: number; y0: number; x1: number; y1: number }` — px-space twin of the tick builder: direction from `projectToPixel` of the two heading points (same selection rule as 1b), unit-perpendicular `(-dy, dx)`, `halfLenPx = halfLenM / metresPerPixel(a, gate.lat)`, endpoints `gate.px/py ± perp*halfLenPx`.

### 3. `theme.ts` — one new token
In `colors`: `riderBlue: '#2F7DE1', // rider dot — the universal "you are here" hue; never a tier colour (D-030), never red (D-013)`. Do not touch anything else.

### 4. `routeMapView.tsx` — wire it up (both rungs)
MapLibre rung:
- Replace the `gates` source + `gate-rings` circle layer (352–359) with a `gate-ticks` source fed by `gateTicksFeatureCollection(asset, props.gateColours)` and ONE line layer: `paint: { 'line-color': ['case', ['has','colour'], ['get','colour'], t.textDim], 'line-width': 3 }`, `layout: { 'line-cap': 'butt' }`. `t.textDim` is the dim theme-aware neutral: night `#9a978f` on the dark basemap, day `#8A8577` on positron — visible on both, no verdict hue. (Known, accepted: at whole-route FIT zoom a 30 m tick is only a few px long; riders at that zoom are browsing, and the live crop is zoom ~16 where 30 m ≈ 12 px.)
- Route source (342–351): feed `routeSplitFeatures(asset, here ? {lat, lon} : null, { active: variant === 'live' && liveState !== 'finished', offRoute: off })`; keep `route-casing` and `route-core` but filter both `['==', ['get','seg'], 'behind']`; add `route-ahead` line layer filtered `'ahead'`: `line-color: colors.neutral, line-width: 4, line-dasharray: [0.1, 1.8], line-cap: 'round'` — no casing on the ahead part (dotted must read dotted). Update cadence: the split is derived in render from `props.lat/lon` — recompute per fix (1 Hz) via `useMemo` keyed on `[asset, props.lat, props.lon, variant, liveState, off]`; no extra timers.
- Rider dot (360–369): `circle-color: off ? '#FFFFFF' : colors.riderBlue`, `circle-stroke-color: off ? colors.riderBlue : '#FFFFFF'`, radius/width unchanged. (On-route = solid blue/white ring; off-route = hollow: white fill/blue ring.)
- Badge (394–396): text becomes `OFF ROUTE · >120 m from the route line` — this is the one-line user-visible hint; same styling.

PNG rung:
- Gate Views (500–512): replace the 12×12 circles with rotated bars using `gateTickPx` + the crop transform, rendered exactly like the `imgFailed` segment pattern (478–498): `len = max(hypot(dx,dy), 10)` px (clamp keeps ticks visible at zoom 1), height 3, `backgroundColor: col ?? CASING` (the PNG is a light map in both themes — D-031 — so near-black is the visible dim neutral here, not textDim), rotate `atan2`, `transformOrigin: 'left center'`.
- Rider dot (513–520): `backgroundColor: off ? '#FFFFFF' : colors.riderBlue`, `borderColor: off ? colors.riderBlue : '#FFFFFF'`.
- Badge (545–547): same new text as above.
- Dotted-ahead on this rung: the route line is BAKED into the PNG — no split possible; document that in a comment (accepted rung degradation). In the `imgFailed` segment fallback only: compute `splitSeg` once per render via `nearestOnPath(asset.path, lat, lon)` (only when the live/active+on-route condition above holds) and render segments with index ≥ splitSeg at `opacity: 0.4` — dimmed-ahead as the poor man's dotted.
- Update `st.gate`/`st.dot` styles as needed; delete nothing that other code still references.

## Tests (expected: +8 over the re-baselined count; last known baseline 145 total / 142 pass / 3 skip — cycle 023 may have moved it, RE-BASELINE FIRST and record the numbers)
`routemapgeo_suite.ts` (+6):
1. gate ticks: 5 features per manifest route, each a 2-point LineString, all coords in the Leuven window (lon 4.6–4.73, lat 50.8–50.89 — swap regression guard, same bounds as the existing suite).
2. gate ticks: `metresBetween(end0, end1)` within 29–31 m; tick bearing within 90°±5° of the local path heading at `gateIdx[i]`.
3. gate ticks: colour omitted when unscored; `''` treated as null; a supplied colour lands on exactly its gate (mirror the existing gatesFeatureCollection colour tests).
4. gate ticks: asset with `path`/`gateIdx` stripped still yields 5 ticks (chord-heading fallback).
5. route split: a rider placed on a mid-path vertex → two features sharing the split coordinate; behind starts at the swapped `path[0]`, ahead ends at the swapped last vertex.
6. route split: `active:false` → single `behind`; `rider:null` or `offRoute:true` → single `ahead`; pathless asset → null.
`routemap_suite.ts` (+2, and one existing test modified):
7. `gateTickPx`: midpoint of endpoints equals the gate px/py (±0.01), length = 30/metresPerPixel (±5%), perpendicular to the path direction (dot product ≈ 0).
8. `offRouteM` uses the drawn path: pick a `path` vertex mid-sector on Morning whose distance to the gate chord exceeds ~60 m (find one programmatically; if none exceeds 60 m on any route, assert vertex-reads-<30 m anyway and note it) → reads < 30 m; the existing ~600 m detour still reads > 300 m.
   **Modify** the existing test at routemap_suite 65–75: the chord midpoint of gates 1–2 may legitimately read >60 m once offRouteM follows the real road — change its on-route probe to a mid-sector PATH vertex (keep the detour assertion). This strengthens the check; it does not weaken any assertion.

## Verification
- Sandbox-pure: `cd app && node --experimental-strip-types tests/run.ts` → zero FAIL, report exact counts.
- On Nathan's PC (device_bash, read-only mount rules apply — never git): `cd $HOME/mnt/Qualifire/app && npx.cmd tsc --noEmit` (confirm exact invocation against README-dev.md) → clean.
- No mockup regen: `demos/mockup.html` does not render the race map's MapLibre layers; if the coordinator rules this a "shipped design change" anyway, regenerate in the same pass per CLAUDE.md §6.
- Device-visual check is Nathan's (both themes, both rungs) — list it in the handoff notes, do not claim it done.

## Files touched
`app/src/ui/routeMapGeo.ts`, `app/src/ui/routeMapMath.ts`, `app/src/ui/routeMapView.tsx`, `app/src/ui/theme.ts`, `app/tests/routemapgeo_suite.ts`, `app/tests/routemap_suite.ts`.

## Conflict with 023 — CHECK-023-FIRST (coordinator diffs 023's landed changes against these before dispatch)
- **E-A (HIGH):** 023's day-mode fix (Ride 1: line/dot/gates not drawn on the day basemap) almost certainly edits `routeMapView.tsx` lines 342–369 (layer defs, possibly beforeId/ordering or style-patch interaction) and/or `routeMapStyle.ts`. This WP rewrites those exact JSX blocks. Rebase every change onto 023's landed version; if 023 restructured the layer stack, keep its structure and apply the tick/split/dot changes within it.
- **E-B (HIGH):** 023's off-route investigation may already have fixed `offRouteM` (gate-chord → path) or changed `OFF_ROUTE_M`/badge text. If landed, SKIP change 2's offRouteM rewrite (keep `gateTickPx`) and skip test 8's modify step; keep whatever threshold 023 set.
- **E-C (MED):** 023's map-dim/auto-pause work may touch `dimmedFrame`, `liveState` plumbing, or RecordScreen's stationary block — this WP does not edit those, but the `routeSplitFeatures` `active` condition reads `liveState`; re-check the enum if 023 extended it.

## Pre-resolved ambiguities
- Circles → ticks on BOTH rungs; `gatesFeatureCollection` retained (workbench use), no test deletions.
- Unscored tick colour: `t.textDim` on MapLibre, `CASING` on the light PNG. Scored: the earned `gateColours[i]` unchanged. Honesty rule intact (textDim/CASING carry no verdict hue).
- Rider dot: new `colors.riderBlue '#2F7DE1'`; off-route = inverted (hollow) + badge, threshold 120 m unchanged; hint = extended badge text.
- Ahead-line: dotted only when live and the rider's position on the line is earned (on-route fix); otherwise whole-line dotted; browse/finished stay solid. Split cadence = fix cadence (1 Hz), useMemo, no timers. PNG-with-image rung: no split (baked), commented; imgFailed rung: opacity 0.4 ahead.
- Tick ground length 30 m, constant; small at FIT zoom — accepted (live crop is what matters).

## NEEDS-NATHAN
- Ratify `riderBlue '#2F7DE1'` — a brand-new hue in the palette (universal you-are-here blue; not a tier colour, not red). Build proceeds; swapping the hex later is a one-token change.

## Rollback
All changes are additive or per-file revertible; no schema, no storage, no engine changes. Revert = restore the six files; no data migration.
