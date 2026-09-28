# 12 — PLACE detail map: no gates, one yellow disc at the place's real radius

**Source: Nathan, 2026-09-27.** His words: "also on the ROUTES tab when you click on one of the
places it opens and there is an openmap shown that is quite useless: 1) on that openmap i see
again circles drawn representing gates from rides which is again forbidden and should be
removed asap 2) since this is a place not a ride/route or whatever; i am not sure what we want
to show on the map. The only thing that makes sense is a maybe a single yellow circle with a
certain radius showing the approximate location based on rides that start/end there?"

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-27 by the Plan
tier (Fable) from a Haiku digest plus anchor checks against the working tree (branch `virgin`,
HEAD `c3e92ef`). Executor: Sonnet, cold, this file only. Twelfth brief of `virgin-cycle15`.

**This is NOT the same bug as brief 06.** Brief 06 (`06-stale-route-gates-bugfix.md`) is
stale/leftover gate state on a route map. This one is a *deliberate but wrong design choice*:
the place-detail screen explicitly asks `WayMapView` for `gatesOnly` with every touching
way's id, so it draws every gate of every route that starts or ends at the place. The code does
exactly what it was told; what it was told is wrong for a PLACE. Different root cause,
different file lines. If brief 06 also edits `app/src/ui/wayMapView.tsx`, run the two
sequentially (either order) and re-read anchors after the first lands.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-27. If a quoted
  line is not where the brief says, or a name/signature differs, **stop and report the
  mismatch verbatim** (file, line, what you expected, what you found). Never guess, never
  patch around it, never rule on it yourself.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `safe_to_delete/` is the bin.
- No new dependency, native or JS. MapLibre `fill` / `line` / `circle` layers on a GeoJSON
  source are already what this file uses.
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`,
  any other `NN-*.md` in this folder, or anything under `cycles/virgin-cycle14/`.
- **Do not touch** `app/src/store/catalog.ts`, `app/src/store/routeCreation.ts`,
  `app/src/store/types.ts`, `app/src/ui/RoutesScreen.tsx`. The landmark's `radiusM` is
  read, never changed.

## Goal

Open ROUTES → tap a place. The card (label, coordinates, `radius N m`, offered-at-START) and
the ROUTES FROM HERE / TO HERE lists stay as they are. The map under them stops drawing gate
dots — for a place, **no gate, tick or route line renders, full stop** — and instead shows
**one yellow disc** centred on the landmark's `lat`/`lon` with a radius of `radiusM`
**real metres** (so it grows and shrinks with pinch-zoom like the roads do, and stays the same
patch of ground), a thin outline of the same yellow, and a small centre dot. The camera fits
the disc. The map now shows for every place, including one no route uses yet.

**Why `radiusM` and not something derived from ride history.** `radiusM` is not a display
number: it is the landmark's real arrival radius. `store/catalog.ts:141-157 landmarkAt()`
returns the landmark whose disc contains a fix (`if (d <= l.radiusM && d < bestD)`, line 151);
`store/routeCreation.ts` matches a new ride's first/last fix to a landmark by
`metresBetween(...) - o.radiusM` (lines 120, 134, 228, 259); `catalog.ts:57` rejects two
landmarks whose discs overlap and `:67` rejects a non-positive radius. So the disc on the
map is literally "a ride that starts or ends inside here belongs to this place" — the
approximate location Nathan asked for, with no new derivation, no history scan, and one
source of truth. Nathan's own suggestion (derive from rides) is superseded by this; log it
under Open questions rather than build it.

## Current state (verified 2026-09-27 against the tree)

- **Entry.** `app/src/ui/RoutesScreen.tsx:58`
  `onPress={() => tabNav.openCatalog({ kind: 'place', id: l.id })}` — unchanged.
- **Model.** `app/src/ui/catalogDetailModel.ts:27-31`:

  ```ts
  export interface PlaceDetailModel {                                                 // 27
    id: string; label: string; coordsLabel: string; radiusLabel: string;
    dormant: boolean; offerAtStart: boolean; seedOwned: boolean; deletable: boolean;
    routes: TouchingRouteModel[]; touchingWayIds: string[];
  }                                                                                   // 31
  ```

  `placeDetailFor` builds `touchingWayIds` at 113-118 and returns at 119-130, with
  `coordsLabel: \`${l.lat.toFixed(5)}, ${l.lon.toFixed(5)}\`,` (122) and
  `radiusLabel: \`radius ${l.radiusM} m\`,` (123). Raw `lat`/`lon`/`radiusM` are NOT on the
  model today — only their text forms.
- **Landmark type.** `app/src/store/types.ts:27-29` — `lat: number`, `lon: number`,
  `radiusM: number` (28). Read-only for this brief.
- **The wrong map call.** `app/src/ui/CatalogDetailScreen.tsx:186-200`, inside
  `function PlaceBody({` (144), `WayMapView` imported at line 22:

  ```tsx
        {model.touchingWayIds.length > 0 ? (                                          // 186
          <View style={{ marginTop: 12 }}>
            <WayMapView                                                               // 188
              variant="browse"
              gatesOnly
              gateWayIds={model.touchingWayIds}
              wayId={null}
              lat={null}
              lon={null}
              showRider={false}
              zoom={1}
              height={260}
            />                                                                        // 198
          </View>
        ) : null}                                                                     // 200
  ```

- **How the gates get drawn.** `app/src/ui/wayMapView.tsx`: `const gatesOnly = props.gatesOnly ?? false;`
  (359) → `const drawable = gatesOnly ? allWayAssets(assetDeps()) : null;` (585) →
  `allGatesFeatureCollection(drawable, props.crossedGates, colors.neutral, props.gateWayIds)`
  (586-588) → bounds `allGatesBounds(drawable, props.gateWayIds)` (607-608) → the JSX
  (783-791):

  ```tsx
        {gatesOnly ? (                                                                // 783
          <M.GeoJSONSource key="gates" id="gates" data={gatesFC!}>
            <M.Layer id="gate-rings" type="circle" paint={{
              'circle-radius': 6,
  ```

  `circle-radius: 6` is **screen pixels** (MapLibre style-spec unit for `circle-radius`), which
  is why the gate dots never change size on zoom — and why a pixel circle is the wrong tool
  for a metres disc.
- **Why simply dropping `gatesOnly` is not enough.** `wayMapView.tsx:561-563`:

  ```tsx
    const hasTrail = !!props.trail && props.trail.length > 1;                          // 561
    const riderOnly = !gatesOnly && !asset;                                            // 562
    if (riderOnly && !showRider && !hasTrail) return null;                             // 563
  ```

  With `gatesOnly` gone, `wayId={null}` (so no asset), `showRider={false}` and no trail, the
  MapLibre rung returns `null` — the map vanishes. The PNG rung does the same at 1001-1002
  (`if (!asset) { if (!showRider) return null;`). The prop block's own doc (200-204) says a
  null `wayId` on a browse surface is "trail-only (WP-H)"; there is no existing "point +
  radius" mode. **So a new prop is needed** (decision 3) — not a new `variant` (the variant
  only governs lock/rotate/credit semantics, 364-386, and 'browse' is exactly right here).
- **Prop block.** `wayMapView.tsx:200 type WayMapProps = {` … last prop
  `gateSelect?: { selected: number | null; onPress: (gateIndex: number) => void };` (284),
  `};` (285). `gateWayIds?: string[] | null;` is at 266.
- **Camera.** `initialMode` (382-386) is `'fit'` for `variant === 'browse'`; `bounds` (607-610)
  feeds `cameraTargetFor({ mode, here, bounds, zoom, ... })` (617-627), whose `'fit'` branch
  (`wayMapGeo.ts:456-462`) does `bounds` + 20 px padding. A bounds box for the disc is all the
  camera needs.
- **Geo builders.** `app/src/ui/wayMapGeo.ts`: `PointGeometry` (26), `GeoFeature<G,P>` (31),
  `GeoFeatureCollection` (37), `riderFeature(lat, lon)` (155-161), `LonLatBoundsBox` (163),
  `trailBounds(pts)` (184-194), `metresBetween(lat0, lon0, lat1, lon1)` (202, "cheap
  equirectangular"). **No polygon geometry type and no circle/disc builder exist.**
- **Colours.** `app/src/ui/theme.ts` `colors`: `neutral: '#F5C542'` (the structural yellow —
  START surface, accent, and the "crossed gate" fill at 586), `white`, `riderBlue`, `amber`.
  `wayMapView.tsx` already imports `colors` (101) and has a `CASING` constant (used at 788).
- **PNG rung degraded frame** for `gatesOnly`: `wayMapView.tsx:977-993` (`gates map needs the
  tile map`). Pattern to mirror.
- **Tests.** `app/tests/waymapgeo_suite.ts` (38 tests; imports from `../src/ui/wayMapGeo.ts`
  at 10-14) and `app/tests/catalogdetail_suite.ts` (place model asserted at 74-75 and 88,
  including `touchingWayIds`). Runner: `node --experimental-strip-types app/tests/run.ts`.

## Decisions

1. **No gates on a place map, ever.** Remove `gatesOnly` and `gateWayIds` from the
   `PlaceBody` call. `touchingWayIds` stays on the model (two suite assertions lock it; the
   ROUTES lists do not use it either — leaving it is one fewer test to touch) but the screen
   no longer reads it for the map.
2. **Metres-accurate disc = a GeoJSON polygon, not a MapLibre circle layer.** MapLibre's
   `circle-radius` is pixels; the only way to fake metres with it is a zoom-interpolated
   expression that is latitude-dependent and gets tile-clipped once the circle is large on
   screen. A 64-point polygon ring at `radiusM` metres is exact at every zoom, draws with the
   `fill` + `line` layer types this file already uses, and is a pure builder testable headless
   in `waymapgeo_suite.ts` like every other builder there. Offsets use the same
   equirectangular approximation as `metresBetween` (`dLat = radiusM / 6371000 rad`,
   `dLon = dLat / cos(lat)`), which at 30-500 m radii is sub-decimetre.
3. **One new optional prop, no new variant:** `place?: { lat: number; lon: number; radiusM: number }`
   on `WayMapProps`. When set (and `gatesOnly` false, `wayId` null): the `riderOnly` null-guard
   is bypassed, `bounds` = the disc's padded box, and a `place` GeoJSON source is mounted
   below the gates/ticks block. `variant="browse"` stays. The PNG rung shows a degraded frame
   (`place map needs the tile map`) mirroring `gatesOnly`'s — it cannot draw tiles without a
   per-route PNG, same honesty rule as 977-993.
4. **Colour: `colors.neutral` (#F5C542)** — the structural yellow Nathan named, already the
   map's "crossed gate" fill and the START surface. Fill opacity 0.18, outline 2 px at
   opacity 0.9, centre dot 4 px `colors.neutral` with `CASING` 1.5 px stroke. It is a place
   marker, not a verdict: no tier colour, no rider blue (D-013/D-030 untouched).
5. **The map shows for every place** — drop the `touchingWayIds.length > 0` wrapper. A place
   with no routes still has a location and a radius.
6. **`zoom={1}` and `height={260}` stay.** `zoom<=1` on browse means 'fit' (382-386), which is
   what we want; the height matches today's frame.
7. **Model carries raw numbers.** `PlaceDetailModel` gains `lat: number; lon: number;
   radiusM: number;` next to the existing labels; the screen never re-parses text.

## Files to touch

### 1. `app/src/ui/wayMapGeo.ts` — two new exports (append after `trailBounds`, i.e. after line 194)

```ts
export interface PolygonGeometry { type: 'Polygon'; coordinates: GeoPosition[][] }

export interface PlaceProperties { part: 'disc' | 'centre' }

const EARTH_R_M = 6371000;

/** virgin-cycle15 brief 12: a landmark's arrival disc (catalog.ts landmarkAt's
 * `d <= radiusM`) as a closed polygon ring in REAL metres, plus its centre as a
 * point — so the disc scales with the map on zoom, which a pixel-radius circle
 * layer cannot do. Same equirectangular offsets as metresBetween; sub-decimetre
 * at the radii the catalog validates (catalog.ts:67 forbids <= 0). Ring is
 * [lon, lat] like every other builder here. */
export function placeFeatureCollection(
  lat: number, lon: number, radiusM: number, steps = 64,
): GeoFeatureCollection<PolygonGeometry | PointGeometry, PlaceProperties> {
  const dLat = (radiusM / EARTH_R_M) * (180 / Math.PI);
  const dLon = dLat / Math.cos((lat * Math.PI) / 180);
  const ring: GeoPosition[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (2 * Math.PI * i) / steps;
    ring.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  ring.push([ring[0][0], ring[0][1]]);
  return {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { part: 'disc' }, geometry: { type: 'Polygon', coordinates: [ring] } },
      { type: 'Feature', properties: { part: 'centre' }, geometry: { type: 'Point', coordinates: [lon, lat] } },
    ],
  };
}

/** Bounds for the camera 'fit': the disc's box widened by `pad` (1.6 = the
 * disc sits inside the frame with air around it, on top of cameraTargetFor's
 * own 20 px padding). */
export function placeBounds(lat: number, lon: number, radiusM: number, pad = 1.6): LonLatBoundsBox {
  const dLat = (radiusM / EARTH_R_M) * (180 / Math.PI) * pad;
  const dLon = (dLat / Math.cos((lat * Math.PI) / 180));
  return { minLon: lon - dLon, minLat: lat - dLat, maxLon: lon + dLon, maxLat: lat + dLat };
}
```

Match the exact `GeoFeature` / `GeoFeatureCollection` / `GeoPosition` shapes at 16-41 (if
`type: 'Feature'` / `type: 'FeatureCollection'` literals or the `properties` field are typed
differently there, follow the file, not this snippet — and stop if the two cannot be
reconciled without touching the existing interfaces).

### 2. `app/src/ui/wayMapView.tsx`

a. **Prop** — insert after `gateWayIds?: string[] | null;` (266):

```ts
  /** virgin-cycle15 brief 12 (Nathan 2026-09-27): a PLACE surface — the
   * ROUTES-tab place detail. Draws one yellow disc of `radiusM` real metres
   * (the landmark's arrival radius, catalog.ts landmarkAt) at lat/lon, an
   * outline and a centre dot; no route line, no gates, no rider. Camera fits
   * the disc. Only meaningful with `wayId` null and `gatesOnly` false — a
   * caller passing both is a bug. MapLibre rung only; the PNG rung shows a
   * degraded frame like gatesOnly. */
  place?: { lat: number; lon: number; radiusM: number } | null;
```

b. **Import** — add `placeFeatureCollection, placeBounds` to the `./wayMapGeo.ts` import
   list (92-96).

c. **Null-guard** (562-563) becomes:

```tsx
  const place = !gatesOnly ? props.place ?? null : null;
  const riderOnly = !gatesOnly && !asset;
  if (riderOnly && !showRider && !hasTrail && !place) return null;
```

d. **Feature collection** — directly after the `sectorSpansFC` block (ends 606), unmemoized
   (same Rules-of-Hooks reason as the comment at 597-603):

```tsx
  // brief 12: the place disc. Pure builder, one 64-point ring — cheap enough
  // per render, and a hook here would sit after the riderOnly early return.
  const placeFC = place ? placeFeatureCollection(place.lat, place.lon, place.radiusM) : null;
```

e. **Bounds** (607-610) becomes:

```tsx
  const bounds = gatesOnly && drawable
    ? allGatesBounds(drawable, props.gateWayIds)
    : asset ? wayBounds(asset)
    : place ? placeBounds(place.lat, place.lon, place.radiusM)
    : hasTrail ? trailBounds(props.trail!) : null;
```

f. **Layers** — insert immediately BEFORE line 783 `{gatesOnly ? (` so the disc renders under
   any later source (mount order = z-order in this file):

```tsx
        {placeFC ? (
          <M.GeoJSONSource key="place" id="place" data={placeFC}>
            <M.Layer id="place-disc-fill" type="fill"
              filter={['==', ['get', 'part'], 'disc']}
              paint={{ 'fill-color': colors.neutral, 'fill-opacity': 0.18 }} />
            <M.Layer id="place-disc-line" type="line"
              filter={['==', ['get', 'part'], 'disc']}
              paint={{ 'line-color': colors.neutral, 'line-width': 2, 'line-opacity': 0.9 }} />
            <M.Layer id="place-centre" type="circle"
              filter={['==', ['get', 'part'], 'centre']}
              paint={{
                'circle-radius': 4,
                'circle-color': colors.neutral,
                'circle-stroke-color': CASING,
                'circle-stroke-width': 1.5,
              }} />
          </M.GeoJSONSource>
        ) : null}
```

   Use the same `M.GeoJSONSource` / `M.Layer` element names and the same `filter` prop
   spelling the file already uses (check how `gate-rings` and the sector-span layers are
   declared; if this file expresses layer filters differently, follow the file).

g. **PNG rung** — insert before line 1001 `if (!asset) {`, mirroring 977-993 with the badge
   text `place map needs the tile map` and `<Credit rung="png" locked={locked} />`. Condition:
   `if (props.place && !gatesOnly)`.

### 3. `app/src/ui/catalogDetailModel.ts`

- 27-31: add `lat: number; lon: number; radiusM: number;` to `PlaceDetailModel` (keep
  `coordsLabel`/`radiusLabel`).
- 119-130 return: add `lat: l.lat, lon: l.lon, radiusM: l.radiusM,`.

### 4. `app/src/ui/CatalogDetailScreen.tsx` — replace 186-200 with

```tsx
      <View style={{ marginTop: 12 }}>
        <WayMapView
          variant="browse"
          place={{ lat: model.lat, lon: model.lon, radiusM: model.radiusM }}
          wayId={null}
          lat={null}
          lon={null}
          showRider={false}
          zoom={1}
          height={260}
        />
      </View>
```

No `gatesOnly`, no `gateWayIds`, no `touchingWayIds` condition.

### 5. `app/tests/waymapgeo_suite.ts` — add to the import list, then four tests

- `placeFeatureCollection` ring: `steps + 1` positions, first === last, every ring point is
  within 1 % of `radiusM` from the centre by `metresBetween` (use a Belgian-latitude centre,
  e.g. `50.88, 4.70`, `radiusM` 60 and 250).
- Lon/lat order: `ring[0][0]` is the *lon* side (`≈ lon + dLon`, `ring[0][1] === lat`) — the
  suite's load-bearing swap check, applied to the new builder.
- Centre feature: `part === 'centre'`, coordinates `[lon, lat]`.
- `placeBounds` contains every ring point strictly inside and is wider than the ring by the
  `pad` factor (compare `maxLat - lat` to `dLat * 1.6` within 1e-9).

### 6. `app/tests/catalogdetail_suite.ts` — at the existing place assertion (74-75), add

`p.lat`, `p.lon`, `p.radiusM` equal the fixture landmark's own fields (read the landmark from
the same catalog object the test already builds; if the test constructs the place without a
handle on the landmark, stop and report rather than hard-coding numbers).

## Verification plan

Executor, from `$HOME/mnt/Qualifire` in device_bash:

```
cd "$HOME/mnt/Qualifire/app" && npx tsc --noEmit
cd "$HOME/mnt/Qualifire" && node --experimental-strip-types app/tests/run.ts
```

Nathan, PowerShell:

```
cd "C:\Users\natha\Claude personal projects\Qualifire\app"; npx tsc --noEmit
cd "C:\Users\natha\Claude personal projects\Qualifire"; node --experimental-strip-types app/tests/run.ts
```

Pass = typecheck clean, suite count = previous + 5, 0 FAIL, same 3 SKIPs. Also grep-check:
`grep -n "gatesOnly\|gateWayIds\|touchingWayIds" app/src/ui/CatalogDetailScreen.tsx` must
return nothing.

## On-device checklist (after OTA)

- [ ] ROUTES → tap a place with routes: no gate dots anywhere on the map; one yellow disc,
      outline, centre dot; roads visible under the translucent fill.
- [ ] Pinch in/out: the disc grows/shrinks with the roads (stays on the same ground), the
      centre dot stays 4 px.
- [ ] Initial camera: whole disc in frame with margin, not touching the edges.
- [ ] Tap a place with **no** routes ("No route uses this place yet."): the map now shows,
      same disc.
- [ ] Compare disc size against the card's `radius N m` line by eye vs a known road width.
- [ ] Day and night theme: yellow readable on both basemaps.
- [ ] Route detail (ROUTE screen) and RECORD free-ride map unchanged — gates still draw there.

## Out of scope

- Deriving a radius from ride history (Nathan's alternative) — see Open question 1.
- Any change to `radiusM` itself, landmark editing, or the ROUTES list row.
- The route-detail map, the free-ride `gatesOnly` map, brief 06's stale-gates bug.
- Removing `touchingWayIds` from the model (two tests lock it; harmless to keep).
- A landmark label on the map (the card above already names it).
- iOS.
- `STATE.md`, `OPEN-ITEMS.md`, this folder's `README.md` — the coordinator's.

## What this changes on Nathan's phone

Nothing yet — this is a parked brief. Once executed: JS-only (four source files edited, two
suites extended; no new dependency, no `app.json`/`eas.json` change), so it ships to the
Preview APK over EAS Update via `scripts/publish-preview.cmd` — no new numbered build, no
reinstall. Visible only on the ROUTES-tab place detail screen: gate dots gone, one yellow
disc at the place's real arrival radius, map present for every place. Every other map is
untouched.

## Open questions / assumptions (logged, not blocking)

1. **`radiusM` instead of ride-derived.** Nathan suggested a radius "based on rides that
   start/end there". The catalog already has the number the app uses to decide that a ride
   starts/ends there; drawing anything else would show a circle the matcher does not use.
   If he wants the ride scatter as well, that is a separate brief (a second, dashed ring
   from the rides' first/last fixes).
2. **Yellow = `colors.neutral`.** Same hex as the START surface and the crossed-gate fill.
   If it reads as a tier verdict on the phone, swap the three `colors.neutral` uses in step
   2f for `colors.white` at the same opacities — one-line each, no other change.
3. **Fill opacity 0.18 / pad 1.6 / 64 steps** are the Plan tier's first guesses; all three are
   single literals.
4. **PNG rung shows a degraded frame** rather than nothing. The phone runs MapLibre since
   build 4, so this is unreachable in practice; documented for the same reason 977-993 is.
5. **Brief 06 sequencing.** If it touches `wayMapView.tsx` lines 550-800, whichever brief
   lands second must re-anchor before editing.
