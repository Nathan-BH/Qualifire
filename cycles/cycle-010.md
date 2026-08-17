# Cycle 010 — 2026-08-17

Trigger: Nathan, on `IDEAS.md` "25. Real maps", asked what "a provider account" meant and whether he would have to pay. He would not — and he then ruled the stack himself: **MapLibre + OpenFreeMap**. One question on the agenda: how do real maps get implemented under that ruling. Five members ran in one parallel batch — Product Owner, Designer, Race Engineer, Mobile Developer, Art Director.

## The finding: the map already exists

All five members proposed building a web map from scratch. **It already exists**, and no member could see it — their read paths are bounded, by design, and none of them included `demos/` or `data/analysis/`:

- `demos/gates-check.html` and `demos/routes-check.html` — Leaflet + OSM raster, predating this cycle. `routes-check.html` is what Nathan used to ratify the three routes of D-015.
- `demos/basemap-capture.html` + `data/analysis/08_build_route_assets.py` already bake a real, desaturated OSM basemap into `app/assets/routes/{Morning,EveningA,EveningB}.png` — regenerated 2026-08-17 02:40, consumed by `app/src/ui/RoutesScreen.tsx` and `app/src/ui/DemoScreen.tsx`.

A real map is already on the phone, offline, with no native module. That turns the question from "how do we build MapLibre" into "we already have the map; MapLibre buys pan/zoom and unratified routes, and costs a build." This is the cost of bounded read paths, paid knowingly: the Principal holds the wide view precisely so the members do not have to. **Second catch, same shape:** `08_build_route_assets.py` line 26 cited "D-031" in its header before any D-031 existed in `product/DECISIONS.md` — implemented work citing an unwritten decision, exactly what `process/CYCLE.md`'s anti-hallucination rule exists to catch. Closed by writing D-031 up retroactively and labelling it as such.

## Member deltas

| Role | Delta |
|---|---|
| Mobile Dev | Verified against the npm registry and maplibre.org: `@maplibre/maplibre-react-native` 11.3.6 pins `expo 56.0.8` / `react 19.2.3` / `react-native 0.85.3` in its own CI — an exact match to ours. Compatibility is **not** the blocker; two lines, no key, no `eas.json` change. Offline packs viable (~140 tiles, 12×8 km bbox, z0–14). Three structural risks to the recording loop: MapLibre ships its own `LocationManager` (a second GPS consumer), a map beside the 10 Hz lap clock commits shadow-tree updates at 10 Hz, and native tile caches enlarge the process footprint — an Android OOM kill takes the foreground service and the ride with it. |
| Race Engineer | Gate validation is the only real measurement gain. **Snapping/map-matching rejected on the numbers**: ≤0.5 s of gate timing error against σ_s of 4–10 s, ~10× below the noise floor it would have to beat. Rendered vector tiles are not a routing graph, so OSM ways need their own offline path. Proposed OSM traffic-signal chainages for the red-light confounder. |
| Designer | Rejected a live-screen map outright rather than deferring it. Ranked gate-eyeballing first, post-ride trace second, route thumbnails third. Flagged that a map is the first surface where the one-render-path rule cannot hold — GL JS in the browser vs a native module on the phone — and proposed both consume one view model. |
| Product Owner | No sequencing conflict: MapLibre needs a build, build 3 is held (D-029), the benchmark store is pure TS and blocked by nothing. Maps sit beside the store, never ahead of it. MVP is a read-only viewer; the live overlay is a non-goal candidate. Made the anti-map counter-argument at full strength and reported where it wins and where it loses. |
| Art Director | Unhedged position: near-monochrome, unconditional, because chroma is the app's scarcest resource and a basemap that spends any of it steals from purple. Full hex palette derived from hexes already in the repo, plus a testable colour-collision rule — nothing on the basemap in HSL hue 130–165, 30–55 at S>25%, or 260–290. |

## Recorded — decisions by the Principal, backlog by the Product Owner, same cycle

| ID | Content |
|---|---|
| D-031 | A real basemap goes under the route. **Retroactive** — the work shipped before the decision was written. |
| D-032 | Tile source settled: MapLibre + OpenFreeMap. Native module deferred until pan/zoom or an unratified route needs it. A provider account is now a **non-goal**, not a pending task. |
| D-033 | No map on the live ride screen; snapping rejected. |
| B-31 | Gate-eyeball upgrade to the existing `demos/gates-check.html` — unblocks B-02. |
| B-32 | Light wash vs near-monochrome dark basemap — Nathan's eye. |
| B-33 | OSM traffic-signal chainages — feeds B-05. |
| B-34 | Live-ride map overlay — **NON-GOAL** per D-033, recorded so it is not re-proposed. |

**Disagreement preserved:** the Art Director's cycle-010 dark spec contradicts D-031's already-shipped light ground. Both are defensible; both cannot be right. Not smoothed over — sent to Nathan as B-32.

**Awaiting Nathan:** the B-32 ground question, and whether B-31 runs before Monday's commute. Nothing in B-31 depends on the commute.
