# MAP-TILES — cycle 014, Backend Dev

All UNBUILT. Corridor bbox for extract command: lon 4.60–4.72, lat 50.81–50.89 (routes.json bounds 50.8348–50.8638 / 4.6382–4.6883 + ~2 km margin per brief).

## 1. Online basemap, no key

| Style | URL | Notes |
|---|---|---|
| Liberty | `https://tiles.openfreemap.org/styles/liberty` | verified, style JSON |
| Bright | `https://tiles.openfreemap.org/styles/bright` | verified |
| Positron (light) | `https://tiles.openfreemap.org/styles/positron` | verified |
| Dark | https://tiles.openfreemap.org/styles/dark | verified by inspector 2026-08-17 (also `fiord`) |

Attribution (required, quoted): "[OpenFreeMap](https://openfreemap.org) [© OpenMapTiles](https://www.openmaptiles.org/) Data from [OpenStreetMap](https://www.openstreetmap.org/copyright)" — https://openfreemap.org/quick_start/

ToS (quoted, prohibited-conduct clause): "Attempt to collect data from the service in automated ways without permission" — https://openfreemap.org/tos/. No published request/bandwidth caps found on quick_start.

OpenFreeMap's homepage states explicitly: no limits on map views or requests, no API keys (openfreemap.org, verified 2026-08-17).

**Keyed-but-free alternatives:**

| Provider | Free tier | Card required | Offline/caching |
|---|---|---|---|
| MapTiler | 5,000 map sessions/mo, 100k API req/mo (maptiler.com/cloud/pricing) | No — "FREE plans do not require billing information" | Offline-pack rights [UNVERIFIED] |
| Stadia Maps | free tier "for development, evaluation, and non-commercial use" (docs.stadiamaps.com/limits) | [UNVERIFIED] | Explicitly barred: "proxying and bulk downloading/caching … are prohibited" (few exceptions) |
| Protomaps hosted API | "free for non-commercial use" (protomaps.com/api) — no request quota published on the page I fetched | [UNVERIFIED] | [UNVERIFIED] |

Verdict: OpenFreeMap liberty/bright/positron, no key, attribution shown, matches Nathan's "free options only." Dark style exists (`/styles/dark`), so B-32's light-vs-dark choice is a style-URL swap, not custom work.

## 2. Graceful degradation offline

MapLibre React Native's `OfflineManager` doc (maplibre.org/maplibre-react-native/docs/modules/offline-manager/) confirms: `setMaximumAmbientCacheSize(bytes)` exists — "may be computationally expensive because it will erase resources from the ambient cache if its size is decreased" — but the page as fetched does **not** state a default byte size, and does not explicitly confirm ambient-cached tiles redraw automatically without a pack. [UNVERIFIED] — mark this a gap; cycle 011's spike (MAPLIBRE-SPIKE.md §3) already cites the same doc for `OfflineManager.createPack({bounds,minZoom,maxZoom})` as the explicit-pack path — that part is solid.

**Reading (interpretation, not fact):** the ambient cache is MapLibre Native's normal browser-style "recently seen tiles" cache — it exists to make panning smooth, is bounded and evictable, and isn't a bulk "collect data automated" act; it's what any client necessarily does to render at all. Riding the same 4×6 km corridor daily means the same handful of tiles keep re-entering that cache from ordinary online map loads — this reads to me as normal usage, not automated collection, under OpenFreeMap's ToS. An explicit `OfflineManager.createPack(...)` call that pre-fetches the whole corridor in one shot, unprompted by any on-screen pan/zoom, is a closer fit to "collect data … in automated ways" and is the part I'd flag before shipping. **This is my reading, not a ruling** — Nathan or Principal should sign off before an OfflineManager pack targets OpenFreeMap specifically (a PMTiles pack, §3, sidesteps the question entirely since it's locally built, not fetched in bulk from OpenFreeMap's servers).

Net effect for "never blank/never error": online-first + ambient cache gives cached tiles on the last-ridden corridor when signal drops; if a tile was never seen, MapLibre draws its fallback (no tile) — the route-line-on-plain-ground fallback described by Nathan must be an app-level `<View>`/GeoJSON layer with a solid background colour behind the map, not something MapLibre does natively. [ESTIMATE — needs a build to confirm MapLibre's own empty-tile visual].

## 3. True offline layer — PMTiles corridor extract

CLI syntax verified (docs.protomaps.com/pmtiles/cli):
```
pmtiles extract INPUT.pmtiles OUTPUT.pmtiles --bbox=MIN_LON,MIN_LAT,MAX_LON,MAX_LAT [--maxzoom=N]
```
Daily basemap build source: `https://build.protomaps.com` (docs.protomaps.com/basemaps/downloads); the browser listing UI is maps.protomaps.com/builds.

Commands for the requested box, maxzoom 15:
```
pmtiles extract https://build.protomaps.com/YYYYMMDD.pmtiles leuven-z15.pmtiles \
  --bbox=4.60,50.81,4.72,50.89 --maxzoom=15
```
(e.g. `20260817.pmtiles`, listed in build metadata 2026-08-17; the browser listing UI is maps.protomaps.com/builds.)

Planet builds contain **z0–15 only**; MapLibre overzooms z15 for display, so no z16 extract exists.

Licence: ODbL Produced Work, "OpenStreetMap attribution required" (docs.protomaps.com/basemaps/downloads).

Known trap (confirmed by MAPLIBRE-SPIKE.md §3, consistent with the brief): MapLibre Android cannot read `pmtiles://asset://` (no byte-range reads on `AssetManagerFileSource`) — the .pmtiles file must be copied to `filesDir` on first run. UNBUILT.

**Size [ESTIMATE], unmeasured (sandbox cannot download):** box is ~8.6 km (lon) × ~8.9 km (lat) at this latitude — roughly 2–3× the area of the ~4×6 km corridor MAPLIBRE-SPIKE.md §3 already sized. That spike's own arithmetic: ~15 tiles z14, 54 z15, 187 z16, ~260 tiles z0–16, ~10–30 MB [ESTIMATE] for the smaller corridor. Scaling area linearly for this wider bbox: z0–15 ≈ 15–45 MB [ESTIMATE], typical vector tile 15–60 KB each at these zooms (basemap, not imagery). Not measured — no downloadable tile source in this sandbox.

## 4. Satellite + terrain (Strava look)

**Satellite:** No keyless free option found. Esri World Imagery now requires an API key for non-ArcGIS-platform apps: "Open-source developers using Leaflet, OpenLayers, Mapbox, or similar libraries must migrate … and include an API key" — free ArcGIS Developer account gives "2,000,000 basemap tiles for free" monthly (esri.com/arcgis-blog, "Time to upgrade to the new ArcGIS basemap layer service"; deadline cited was 2022). Card requirement for that free account: [UNVERIFIED] — not stated on the page fetched. I could not reach the specific licence clause in Esri's Master Agreement PDF (full-master-agreement page is an index, not the text) — [UNVERIFIED]. Tile URL template not confirmed for the keyed service in this pass — [UNVERIFIED].
**Verdict: not worth it for a Leuven commute app** — needs a key + signup, contradicts "free options only, flag if key needed," and satellite imagery adds nothing for sector-tracking on a fixed commute.

**Terrain:** AWS Terrain Tiles (Mapzen/Tilezen terrarium) is free and keyless: `aws s3 ls --no-sign-request s3://elevation-tiles-prod/` works with no account (registry.opendata.aws/terrain-tiles). URL template (madewithmaplibre.com/basemaps/styles/aws-terrarium): `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`. Licence not shown on that page — points back to registry/GitHub attribution, [UNVERIFIED] exact text.
3D terrain in MapLibre Native: roadmap page (maplibre.org/roadmap/maplibre-native/terrain3d/) lists "Terrain3D" as a **roadmap item**, not confirmed shipped; Android-specific status [UNVERIFIED] from the pages fetched.
**Verdict: not worth it** — Leuven is flat (this is a commute in Belgium, not mountain riding), and terrain support on MapLibre Native Android is unconfirmed/roadmap, not a ship-today feature.

## 5. Palette firewall in style JSON — UNBUILT proposal

(a) MapLibre React Native v11 is **declarative** — there is no GL-JS-style runtime `map.setPaintProperty`/`setLayoutProperty` API. Style overrides are done by editing the style JSON itself: fetch the OpenFreeMap positron (or dark) style JSON at build time, patch `layers[].paint` for the layers below, and either host the patched JSON as a bundled asset or pass it as a `mapStyle` object to the map component. Layer ids below are the **real** OpenFreeMap positron ids, verified by inspector (not the standard-OpenMapTiles-naming guesses this section previously used):

| Layer id (verified by inspector) | Paint property | Value | Note |
|---|---|---|---|
| `landuse_residential` | `fill-color` | `#EDEAE0` | desaturated beige residential ground |
| `landcover_wood` | `fill-color` | `#D8D8CE` | (previously modelled as `wood`) |
| `park` | `fill-color` | `#DCDCD2` | grey, NOT hue 130-165 (D-030) |
| `water` | `fill-color` | `#B9C4CC` | muted blue, low sat |
| `highway_major_inner` | `line-color` | `#C9C6BC` | neutral, not yellow/purple (previously `road_major`) |
| `highway_minor` | `line-color` | `#D6D3C9` | (previously `road_minor`) |

Hide while moving: layers matching `highway-name-*` and `label_*` via `layout.visibility: "none"` in the patched style JSON.

(b) Route line + gates as app-owned overlay, unaffected by basemap style — declarative JSX, not `map.addSource`/`map.addLayer`:
```jsx
<GeoJSONSource id="route" shape={routeGeoJSON}>
  <Layer id="route-casing" type="line" paint={{ 'line-color': '#14120C', 'line-width': 7 }} />
  <Layer id="route-line" type="line" paint={{ 'line-color': '#F5C542', 'line-width': 4 }} />
</GeoJSONSource>
<GeoJSONSource id="gates" shape={gatesGeoJSON}>
  <Layer id="gate-circles" type="circle" paint={{ 'circle-radius': 8, 'circle-color': '#E8E4DA', 'circle-stroke-color': '#14120C', 'circle-stroke-width': 2 }} />
</GeoJSONSource>
```
`GeoJSONSource`/`Layer` component names [UNVERIFIED — check v11 export names before use].
Both match `08_build_route_assets.py`'s constants exactly: CASING `#14120C` (RGB 20,18,12), route yellow `#F5C542` (RGB 245,197,66).

## 6. Attribution — exact strings, placement

| Source | String | Where |
|---|---|---|
| OpenFreeMap/OpenMapTiles/OSM | "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" (openfreemap.org/quick_start/) | MapLibre `AttributionControl`, always visible per style convention |
| Protomaps PMTiles | ODbL Produced Work; "OpenStreetMap attribution required" (docs.protomaps.com/basemaps/downloads) | AttributionControl (offline: app's own credit line, since no live control fetch needed) |
| Esri imagery (if ever used, keyed) | not confirmed in this pass — [UNVERIFIED], existing D-038 string "Esri, HERE, Garmin, © OpenStreetMap contributors" is what's shipped today for the PNG crop | App's own credit line (current PNG has no live control) |

---
_Member report block moved to the cycle record (`cycles/cycle-014.md`); the body above was corrected by the cycle-014 inspector on 2026-08-17 (dark style confirmed, build.protomaps.com host + z0–15 limit, v11 declarative API, real positron layer ids)._
