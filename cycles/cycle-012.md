# Cycle 012 — 2026-08-17

Trigger: Nathan, on the pre-rendered route asset — *"can we have someone from the design team work out how to make the 'fake map' look real. real maps shows roads, colors, forest and everything, since we cannot render it for now, can we at least get as background like a crop of the real map layout on which the trajects sit on?"*

Two members ran in parallel — **Art Director** (colour treatment, honesty, failure mode) and **Designer** (framing, zoom, ghosts, attribution). Nathan answered three framing questions up front: full-colour standard OSM, everywhere the route map is drawn, capture driven through his own Chrome.

**This cycle overlaps cycle 010/011, which were running in another session at the same time.** Cycle 010 recorded **D-031** retroactively off this session's uncommitted script header — so D-031 already describes this work, with the *first* set of constants. What follows is the amendment. `product/DECISIONS.md`, `STATE.md` and `BACKLOG.md` were being written by that session while this one finished (mtimes 03:13–03:14), so **nothing here has been merged into them** — the Principal must fold D-038 in on the next pass.

## What shipped

**Real streets are under all three routes.** `app/assets/routes/{Morning,EveningA,EveningB}.png` regenerated 03:10 from a real basemap: named streets, woodland green, water, motorway shields, road hierarchy. The yellow trace sits on the actual roads — verified in pixels at 2× on the Korbeek-Dijle stretch. `routes.json` is **byte-identical** (`diff -q` clean), so the cross-language pixel test still holds. Tests **94: 91 pass / 0 fail / 3 skip**, `tsc --noEmit` clean.

## The finding: openstreetmap.org blocked us, and returned HTTP 200 while doing it

The first capture ran against `tile.openstreetmap.org`, completed cleanly, reported *63 tiles, 0 missing*, and produced three PNGs of the words **"Access blocked — App is not following the tile usage policy of OpenStreetMap's volunteer-run servers"**. Their policy forbids scripted/bulk fetching and they are right to enforce it; the failure is that a refusal arrives as a valid 200-with-image, so a missing-tile check cannot see it.

Fixed structurally, not by retrying: `demos/basemap-capture.html` now SHA-1s every tile body and **aborts if more than 3 tiles are byte-identical**. A server that is refusing you repeats itself; a real map never does. Working around the block was not on the table.

Tile source is now **Esri World Street Map** (Nathan's pick from a four-way render of the actual Morning frame: Esri Street / Esri Topo / Carto Voyager / Esri Imagery), free, no key, attribution required. 63 tiles per route at z15, one-off. **This amends D-031's "standard OpenStreetMap raster tiles" and is independent of D-032/D-034** — those govern what MapLibre would read *on the bike*; this governs a build-time crop that never touches the phone's network.

## Member rulings

| Role | Ruling |
|---|---|
| **Art Director** | Full-colour OSM approved as *substrate, not image*: the basemap is stripped of any hue the app uses for meaning, because raw OSM paints motorways pink-red and woodland bright green — untreated, it ships fake tiers. Route legibility comes from a dark casing, not from out-brightening beige. Honesty line: the basemap may imply *where the roads are*; it may never imply the app knows anything about them — no rubber-sheeting the trace onto OSM geometry, no sector auto-named from a street name. Named failure mode: **sunlight washout** (beige ~0.85 luminance vs F1 yellow ~0.80 — nearly the same *value*), mitigated by the casing plus a greyscale acceptance test. **Dissent, recorded:** keep the map off the live screen entirely. |
| **Designer** | Corrected the brief's arithmetic (4.47 m/px, effective zoom 14.43). Labels are mush at whole-route framing whatever the capture zoom, which is the real argument for a **moving window**. Ruled the 60 archived **ghost rides OUT** — real streets already answer "where are the roads", so a second grey network is a mis-registered duplicate costing 4 s of render. Ruled attribution **must not be baked into the asset**: a moving window crops a corner off and the credit vanishes with it. |

The Art Director's dissent and the Designer's framing ruling both point the same way as **D-033** (no map on the live ride screen), reached independently in cycle 010. Three roles, three premises, one answer — that is now the strongest-supported call in the product.

## Proposed D-038 — amends D-031

> **D-038 — The basemap crop: Esri, less desaturation, antialiased overlay, attribution in the app**
> Date: 2026-08-17 · Status: PROPOSED — cycle 012, pending the Principal folding it into `DECISIONS.md`
>
> Amends D-031 on four points, everything else unchanged:
> 1. **Source.** `<route>-base.png` is a crop of **Esri World Street Map**, not `tile.openstreetmap.org`, whose usage policy forbids scripted fetching and which blocks it with an HTTP 200 placeholder. Attribution "Esri, HERE, Garmin, © OpenStreetMap contributors". The capture page rejects >3 byte-identical tiles so a refusal can never again pass as a map.
> 2. **Treatment.** `BASE_SAT 0.45 → 0.80`, `BASE_BRIGHT 1.05 → 1.02`, `BASE_CONTRAST 0.88 → 0.94`, wash `22% → 8%`. The AD's numbers were written for raw OSM carto; Esri Street is already muted cartography and the same treatment washed it to paper — and "colours, forest and everything" was the request. Backed off to the least desaturation that still keeps every basemap fill clearly outside the tier palette, checked by eye against a rendered frame.
> 3. **Rendering.** Route, gates and landmark rings are drawn at **2× into an RGBA overlay and downscaled LANCZOS** (`SS = 2`). Pillow does not antialias wide polylines and bulges an ellipse at every vertex; on a 163-vertex GPS trace that read as a serrated edge. Geometry is unchanged — this is antialiasing, not smoothing, and the trace stays raw (D-023).
> 4. **Attribution lives in the app, not the asset** — `routeMapView.tsx`, bottom-right, 8.5 dp `#2B2B2B` on a 60% white plate, suppressed only in the MAP-IMAGE-FAILED state. Deliberately not a palette colour: a credit in a tier colour would read as a signal.
>
> Also shipped with it: gate rings and the rider dot switch from `#fff` to `CASING #14120C` in `routeMapView.tsx` — the asset is a light map in **both** themes now, and a white ring vanished into beige.
>
> Reversibility: cheap — re-capture and re-run; the transform and gate pixels are stable.

## Files touched

- `demos/basemap-capture.html` — rewritten: provider menu (Esri Street chosen / Esri Topo / Esri Imagery / Carto Voyager), tile-identity check, geometry derived from `routes.json` in-page.
- `data/analysis/08_build_route_assets.py` — `basemap()` loader, treatment constants, ghost layer skipped when a crop exists (`NOBASE=1` restores it), 2× supersampled overlay, light-ground palette.
- `app/src/ui/routeMapView.tsx` — attribution strip, dark gate rings and dot.
- `demos/mockup.html` — same treatment (casing + `#F5C542` core, dark gate rings, grey underlay dropped, `saturate(.80)`), and **attribution controls turned back on** — they were `false` on both Leaflet maps, which the tile licence does not allow.
- `demos/routemap-preview.html` + generated `demos/routes-data.js` — **new**. Draws the shipped asset through a verbatim port of `projectToPixel()`/`cropFor()` at 2×, so the live crop, the FIT view, the gate rings and the credit can be judged without a phone. `routes-data.js` exists because a `file://` page cannot `fetch()` a sibling `.json`; it is emitted from the same dict in the same run as `routes.json`, so it cannot drift.
- `app/assets/routes/*-base.png` (new inputs, 1.8 MB each) and `*.png` (regenerated).

## Open — for the Principal, and for Nathan

1. **Merge D-038** into `DECISIONS.md`; `STATE.md` (last written 03:06) predates both this cycle and cycle 011.
2. ~~The `-base.png` inputs are 5.5 MB of build-time material sitting in `app/assets/`.~~ **DONE, same cycle** (Nathan): moved to `safe_to_delete/`, so Metro no longer bundles 5.5 MB to the phone for nothing. The crops stay build-time inputs and are one click to re-capture. A missing crop is now **fatal**, not a silent fallback — otherwise a re-run would quietly regenerate the old dark ghost-ride asset over a shipped real map. `NOBASE=1` is the explicit opt-out.
3. **Designer's deferred proposals, unbuilt:** moving window at fixed scale with the dot anchored ~55% down; capture at native z16 into a ~2560×2304 WebP; remove the `+`/`−`/`FIT` buttons from the Record screen (the beta panel flagged them as the only touch targets beside STOP). All three are moot on the live screen under D-033, but live for Routes and post-ride.
4. **D-033 vs the request.** Nathan asked for this "on which the trajects sit"; D-033 (cycle 010, unanimous) keeps any map off the live ride screen. The real map is therefore delivered to Routes, the Demo tab and post-ride — not to the handlebars. Nathan's call whether that is what he meant.
