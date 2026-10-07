# Brief 03 — MAP tab (ROUTES tab becomes a full-bleed catalog map)

Written by the Plan tier (Fable) 2026-10-06 ~21:30 UTC from `00-nathan-decisions.md`, digests 01/02 and spot-reads of the files named below (every line anchor was verified against the working tree at that time). Executor: Sonnet, alone, overnight. Nathan is asleep and wants to SEE this in the app on 2026-10-07. Read everything before touching anything.

## 0. The rules you work under

- **STOP-ON-AMBIGUITY.** If any anchor in this brief does not match the file (the quoted text is not at that line, or not within ±15 lines with no other plausible match), or any call you need is not settled here, STOP: write what you found verbatim into `cycles/virgin-cycle24/03-executor-report.md` under `## STOPPED` and return. Never guess, never "fix" an unrelated thing, never rule on design.
- **Never delete.** No `rm`. Anything to retire goes to `app/safe_to_delete/` with `mv`. Nothing in this brief needs retiring.
- **No commit, no publish, no EAS, no `npm install`, no new dependency.** Git read-only (`GIT_OPTIONAL_LOCKS=0 git status/diff` only).
- **No edits outside the file list in §4.** Never touch `IDEAS.md`, `STATE.md`, `OPEN-ITEMS.md`.
- **Concurrent work in the tree (read this twice).** `git status` on 2026-10-06 21:22 UTC showed ANOTHER session (virgin-cycle23, briefs 01-03) mid-execution with uncommitted edits in `app/src/ui/wayMapView.tsx`, `RideDetailScreen.tsx`, `rideHistoryModel.ts`, `RidesScreen.tsx` (coming), new files `feedModel.ts`, `rideActions.ts`, `trailCache.ts`, `tests/feedmodel_suite.ts`, `tests/trailcache_suite.ts`, and edits to `tests/run.ts` and `tests/ui-strings.allow.json`. Rules: (a) never revert, stash, checkout or reformat anything; (b) you share exactly three files with that work: `wayMapView.tsx` (one word, §4.5), `tests/run.ts` (one import line, §4.7) and `tests/ui-strings.allow.json` (§6). Edit each of those three with a targeted in-place tool (`sed -i` for the one-word/one-line edits, a Python read-modify-write keyed on entry content for the JSON), do it in ONE short step as late as possible (§5 step 8), and re-read the file immediately before editing it; (c) at the time of writing the full suite CRASHES on `src/ui/trailCache.ts:15` ("TypeScript parameter property is not supported in strip-only mode") — a cycle23 file, not yours. If the suite still crashes or fails ONLY inside files you did not touch, that is FOREIGN: do not fix it, record it verbatim in your report, and verify your own work with the standalone commands in §7.2. Zero FAIL inside anything you touched is still mandatory.

## 1. Purpose

The ROUTES tab ("YOUR PLACES" list + route cards, `app/src/ui/RoutesScreen.tsx`) is replaced by the **MAP tab**: one full-bleed MapLibre map of the rider's catalog, with three levels.

1. **OVERVIEW** (nothing selected): every place of the active sport's catalog as a labelled pin; **one line per route pair** (A→B and B→A are ONE line); only the **usual way** of that route is drawn; constant width, semi-transparent (shared corridors darken naturally); NO thickness-by-frequency; no gates; camera fits all places. Zero places = the bare map, no text.
2. **PLACE FOCUS** (tap a pin): camera fits the place + its neighbours; routes touching the place at full strength, every other line a faint ghost (still drawn), untouched pins/labels faded; a bottom sheet lists the routes out of and into the place (direction-aware). Tap a row = that line is highlighted; tap the highlighted row again (or tap a highlighted line) = ROUTE FOCUS. Tap the empty map or the sheet's × = back to OVERVIEW.
3. **ROUTE FOCUS** (tap a line in OVERVIEW, or as above): that route's ways are drawn; the highlighted way (default: the usual way) strongest, with its **gates** (the only level that shows gates); every other way shows only the stretches where it differs from the highlighted way; sheet lists the ways (usual first), tap a row = highlight that way (and its gates). Tap the empty map or × = OVERVIEW.
- From the place sheet and the route sheet, the header row opens the EXISTING `CatalogDetailScreen` (`tabNav.openCatalog`), so rename/merge/delete/edit-gates stay reachable. Nothing else about management changes.

User-visible tab label: `map` (was `routes`). Internal ids (`Tab` 'routes', `RoutesScreen.tsx`, `openCatalog`) stay.

## 2. Settled design calls (do not re-decide)

| # | Call | Reason (one line) |
|---|---|---|
| D1 | New sibling component `src/ui/catalogMapView.tsx`, NOT a new mode on `WayMapView` | `wayMapView.tsx` is 1038 lines of mount-order-sensitive live-ribbon code and another session is editing it tonight; a sibling reuses its pure helpers (`wayMapStyle.ts`, `wayMapGeo.ts`, `wayAssetRuntime.ts`) and copies ~40 lines of style-fetch wiring. |
| D2 | The only `wayMapView.tsx` edit: `function Credit(` becomes `export function Credit(` | the "i" credit is a licence obligation on every tile map; its styles live in that file's StyleSheet so the component must be exported, not copied. |
| D3 | Pure model in `src/ui/catalogMapModel.ts` with injected deps (`catalog`, `pathFor`, `ridesFor`); unit-tested in `tests/catalogmap_suite.ts`; its import chain is JSON-free (types + `wayMapGeo.ts` only) so the suite needs no loader hook | same contract as `catalogDetailModel.ts`; verifiable without a device. |
| D4 | **Usual way** of a route = the way with the most stored results (`storedResultsForWay(id).length`), tie → first in `route.wayIds` order, fallback → `route.wayIds[0]`; a way without a drawable path is skipped for DRAWING only (the next candidate draws) | the only usage signal the store has; catalog order is what RECORD already uses as the empty-history default (`sortWaysForDisplay` tiebreak). |
| D5 | **Route pair** key: for `start !== end` the unordered pair `[min(start,end), max(start,end)]`; a loop (`start === end`) is its own key (route id) | A→B and B→A become one line; different loops never merge. The **primary** route of a pair = more total rides (sum of `ridesFor` over its ways), tie → first in `catalog.routes` order; the line draws the primary's usual-way path, falling back to the twin's usual-way path when the primary has none. |
| D6 | Line tap in OVERVIEW focuses the PRIMARY route of the pair; the reverse direction is reached via an endpoint pin's sheet (both directions are listed there as separate rows) | keeps ROUTE FOCUS one route = one set of ways; no twin-switch UI tonight (open question OQ3). |
| D7 | Pins = MapLibre circle layer + symbol layer labels (`text-font: ['Noto Sans Regular']`, present in both OpenFreeMap styles, verified 2026-10-06; glyph URL is in the fetched style). Labels are therefore absent on the offline fallback style — accepted | native labels collide-resolve themselves with many places; RN `ViewAnnotation` snapshots on Android cannot be re-styled when focus changes. |
| D8 | Dimming via data-driven paint: every feature carries `opacity` (and lines `width`) properties set by the model/view per level; one source for lines, one for pins, one for way stretches, one for gates | no remounting of sources when focus changes (mount-order rule: sources mount once, in JSX order). |
| D9 | Colours: route lines and the usual/highlighted way = `colors.neutral` (the app's line yellow); differing stretches of other ways = `t.text` (ink); gates = the existing white-on-casing tick look; pins = `colors.neutral` with `CASING` stroke; labels `t.text` with `t.bg` halo. Never a tier colour (D-030) | yellow is the brand line colour; ink is the only neutral readable on both basemaps. |
| D10 | Opacities/widths (constants in the view): overview line 0.55 / 4 px; ghost line 0.12 / 4 px; connected line 0.95 / 4 px; highlighted line 1.0 / 6 px; route focus: highlighted way 1.0 / 5 px, usual way when not highlighted 0.55 / 4 px, differing stretches 0.85 / 3 px; pins 1.0 (faded 0.3), radius 6 (focused place 8); labels 12 px, offset below the pin | one place to tune; Nathan tunes on the device tomorrow. |
| D11 | Bottom sheet = a plain absolutely-positioned `View` (left/right 12, bottom 34 so the credit "i" stays visible, `maxHeight` 280, card colours, `ScrollView` inside), no drag, no Modal, no new dependency | nothing to install overnight; `src/ui` has no sheet precedent. |
| D12 | Differing stretches: for the non-highlighted ways, vertices farther than 30 m from the highlighted way's path (`nearestOnPath`), maximal runs extended by one vertex each side, ≥ 2 vertices; identical geometry = nothing extra drawn; guard: if `base.length * other.length > 6e6` draw the whole other way instead | "emphasise only the differing stretches, shared section drawn once" with the existing geo helper; the guard keeps a tap under ~100 ms on a phone. |
| D13 | Camera: `cameraTargetFor({ mode, here: null, bounds, zoom: 14, bearing: 0 })` with the padding overridden to `{top: 48, right: 48, bottom: sheetOpen ? 300 : 48, left: 48}`; mode = 'fit' on every level change and on every style remount, 'free' after a user gesture (`onRegionWillChange` with `userInteraction`) | same helper and the same remount rule `WayMapView` uses; the sheet must not cover the fitted content. |
| D14 | Bounds: OVERVIEW = all pins; PLACE = the place + its neighbours; ROUTE = union of the drawn way paths; all via `boundsOfPoints(points, padFrac 0.15, minSpanM 800)`; a lone place uses `placeBounds(lat, lon, radiusM)` | fits what the level is about, never degenerate. |
| D15 | Strings: the ONLY new rider-visible strings are `BACK TO MAP` (replacing `BACK TO ROUTES` in `CatalogDetailScreen.tsx`) and the technical literal `Noto Sans Regular`; the tab label `map` and all ids are single-word/camelCase (the scanner only lists prose: two letter-groups separated by a non-letter). The sport badge string `NO SPORT YET · ADD ONE IN SETTINGS` survives in `RoutesScreen.tsx` | Nathan's text budget; place/route/way names come from data. |
| D16 | Zero places: bare map, no empty-state text, camera untouched (MapLibre's default view) | Nathan accepted "an empty map that fills in as the rider rides"; any sentence here is clutter (OQ5). |
| D17 | Sport badge stays as a small chip overlaid top-left on the map (same text and convention as the other tabs) | tells which sport's catalog is drawn; the string already exists. |

## 3. Data you have (verified anchors, working tree 2026-10-06 21:20 UTC)

- `app/src/store/types.ts:21-32` `Landmark {id,label,lat,lon,radiusM,activeFromMs,activeUntilMs,offerAtStart}`; `:34-48` `Route {id,startLandmarkId,endLandmarkId,loopDiscriminator?,wayIds,sportId?}`; `:50-79` `Way {id,routeId,refLineId,gateSetVersion,seeded,referenceRideId?,specs?}`.
- `app/src/store/sportStore.ts:110` `export function activeCatalog(): Catalog` (sport-scoped; landmarks are the full shared set). `app/src/store/catalogStore.ts:67` `currentCatalog()`.
- `app/src/store/resultsStore.ts:224` `export function storedResultsForWay(wayId: string): RideResult[]`.
- `app/src/store/defaultWay.ts:56` `wayVariantLabel(id, route, specs?)` → "Std"/"Dry"/"plain"…; `:93` `sortWaysForDisplay`.
- `app/src/ui/catalogDetailModel.ts:26` `TouchingRouteModel`, `:97` `placeDetailFor` (direction logic at `:104-110`: loop if start===end===id, 'from' if start===id, else 'to') — copy the rule, do not import the function (it needs 7 deps).
- `app/src/ui/wayMapGeo.ts:96` `LonLatBoundsBox`; `:100` `wayBounds(a: WayAsset)`; `:164` `placeBounds(lat, lon, radiusM, pad=1.6)`; `:176` `metresBetween(lat0, lon0, lat1, lon1)`; `:208` `nearestOnPath(path: [number,number][], lat, lon): {seg,t,distM}|null` (path is **[lat, lon]**); `:331` `gateHalfLenM(lat, zoom)`; `:336` `gateTicksFeatureCollection(asset, gateColours?, halfLenM)`; `:415` `cameraTargetFor(...)` (fit padding is a fixed 20 — override it, D13); `:16-41` local GeoJSON types (`GeoFeature`, `GeoFeatureCollection`, `LineStringGeometry`, `PointGeometry`). **GeoJSON coordinates are [lon, lat]; `WayAsset.path` is [lat, lon]** (file header, `:5-9`).
- `app/src/ui/wayMapMath.ts:32` `WayAsset { path?: [number,number][]; gates: WayGate[]; … }`.
- `app/src/ui/wayAssetRuntime.ts:104` `WayAssetDeps {manifest, catalog, refFor}`; `:113` `resolveWayAsset(id, deps): WayAsset | null`.
- `app/src/ui/wayMapView.tsx` — **this file is being edited tonight by cycle23, so its line numbers drift; every anchor here is "locate by the quoted text" (grep), with the line it had at 21:30 UTC as a hint; a TEXT mismatch is a STOP, a line drift is not.** `let ML: typeof import(...) | null = null; try { ML = require('@maplibre/maplibre-react-native'); } catch { ML = null; }` (~:142-148); `const ASSETS: Record<string, WayAsset> = bundledForSeedMode(` (~:153); `const safeRefFor = (id: string) => { try { return refFor(id); } catch { return null; } };` + `function assetDeps(): WayAssetDeps {` + `function assetFor(id: string | null): WayAsset | null {` (~:160-170, module-private — copy these lines into `catalogMapView.tsx` as `catalogAssetFor`, do not export them); `const CASING = '#14120C';` (~:178); `const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] };` (~:182); `const MAP_STYLE_NIGHT = 'https://tiles.openfreemap.org/styles/dark';` / `const MAP_STYLE_DAY = 'https://tiles.openfreemap.org/styles/positron';` (~:188-189); `const STYLE_RETRY_MS: readonly number[] = [5000, 15000, 45000];` (~:199); `>map unavailable</Text>` (~:316, the no-module badge; you render an empty frame instead, §4.2 item 1); `function Credit(props: { rung: MapRung; locked: boolean }) {` (~:337) ← the one-word edit; the style effect starting `const [patchedStyles, setPatchedStyles] = useState<` through the `const { style: mapStyle, key: mapStyleKey } = mapStyleFor({ … });` call (~:509-560) — copy it; `<M.Map` (~:727) with its props down to `<M.Camera ref={cameraRef} {...cameraProps} />` (~:772) — the pattern (cycle23 is wrapping it in a `st.mapFill` View and gating gestures — ignore that, you always allow one-finger gestures); the gate-ticks source `key="gate-ticks"` with layers `id="gate-ticks-casing"` and `id="gate-ticks"` (~:893-910) — copy the two `paint` objects verbatim; `<View style={st.zoomBar}>` (~:975) with the + / − / FIT Pressables.
- `app/src/ui/wayMapStyle.ts:144` `patchMapStyle(style, {hideLabels})`, `:172` `offlineMapStyle(bg)`, `:200` `mapStyleFor({styleUrl, patched, styleFailed, hideLabels, offline})`.
- `app/src/ui/mapCreditModel.ts` exports `CREDIT_AUTO_HIDE_MS, creditFor, MapRung` (only needed by Credit, which stays where it is).
- `app/src/ui/theme.ts:11-30` `colors` (`neutral '#F5C542'`, `white`, `riderBlue`, `card`, `cardBorder`), `:119` `radius`; `useTheme()` from `themeContext.tsx` gives `t` (`bg, card, cardBorder, text, textDim, accentText, race.bg, race.card`).
- `app/src/ui/tabNav.tsx:23` `Tab` type (keep 'routes'); `:51` `CatalogDetailRequest = {kind:'place'|'route', id}`; `:77` `openCatalog`.
- `app/App.tsx:61-63` `const TAB_LABEL: Record<Tab, string> = { record: 'record', rides: 'activities', routes: 'routes', … }`; `:30` `import RoutesScreen from './src/ui/RoutesScreen'`; `:243` `: tab === 'routes' ? <RoutesScreen />`.
- `app/src/ui/RoutesScreen.tsx` (119 lines) is replaced wholesale (§4.3). `app/src/ui/CatalogDetailScreen.tsx:179` `<Text style={[st.slimBtnText, { color: t.onAccent }]}>BACK TO ROUTES</Text>`.
- MapLibre RN 11.3.6 (installed, `node_modules/@maplibre/maplibre-react-native/lib/typescript/module/`): `GeoJSONSource` props `onPress?(event: NativeSyntheticEvent<PressEventWithFeatures>)` (features at `event.nativeEvent.features`, bubbles to `Map.onPress` unless `event.stopPropagation()`), `hitbox?: {top,right,bottom,left}` (default 44 px); `Map.onPress(event)` fires on any press (used for "tap empty map"); `Layer` `type` 'line'|'circle'|'symbol' with `paint`/`layout`/`filter` — the same way `wayMapView.tsx`'s sources/layers use them.
- Test harness: `app/tests/lib.ts` `test(name, fn)`, `assert(cond, msg)`, `numEq(a,b,tol)`; `app/tests/run.ts:13-68` the suite import list (append yours after `import './catalogdetail_suite.ts';` at `:49`); `tests/waymapgeo_suite.ts` imports `../src/ui/wayMapGeo.ts` directly with no loader hook — your model suite does the same.
- Allow-list engine `app/tests/ui_strings_extract.ts`: scans `App.tsx`, `src/ui/**`, `src/location/*.ts`; lists JSX text, visible attrs (`label,title,sub,…`), `Alert.alert` args, and ANY other string literal that is prose (`/[A-Za-z]{2,}[^A-Za-z]+[A-Za-z]{2,}/`) unless it is a property NAME, a `key`/`style`/`testID`/`name` attr, a `===` operand, a `console.`/`Error`/`StyleSheet.create` arg or a type. So: `id="catalogLines"` is fine, `id="catalog-lines"` is NOT; `'Noto Sans Regular'` IS listed; `'×'`, `'›'`, `'→'` are not letters and are ignored; `${a} → ${b}` templates are ignored. Entry shape `{file, kind, text, reason (≥12 chars), since: 'YYYY-MM-DD', by}`; `kind` = 'text' for JSX text, 'literal' for a bare literal.
- Baseline numbers to derive yourself in step 0 (do not copy): the suite's PASS/FAIL/SKIP line and `tsc` exit code BEFORE your first edit, foreign crash included.

## 4. Files

### 4.1 CREATE `app/src/ui/catalogMapModel.ts` (pure; imports: `type { Catalog, Landmark, Route, Way } from '../store/types.ts'`, `{ nearestOnPath, placeBounds, type LonLatBoundsBox } from './wayMapGeo.ts'`, `{ wayVariantLabel } from '../store/defaultWay.ts'` — check that `defaultWay.ts` imports no JSON (it imports `waySpecs.ts`/types only; if it pulls a `.json`, STOP))

```ts
export type LatLon = [number, number];                     // [lat, lon] like WayAsset.path
export interface CatalogMapDeps {
  catalog: Catalog;                                        // activeCatalog()
  pathFor: (wayId: string) => LatLon[] | null;            // assetFor(id)?.path ?? null (null = not drawable)
  ridesFor: (wayId: string) => number;                     // storedResultsForWay(id).length
}
export const MIN_SPAN_M = 800;
export const PAD_FRAC = 0.15;
export const DIFF_THRESHOLD_M = 30;
export const DIFF_GUARD = 6e6;

export function usualWayId(c: Catalog, routeId: string, ridesFor: (wayId: string) => number): string | null;
// D4. null only for an unknown route or a route with zero ways.

export function pairKey(r: Route): string;                 // D5: loop -> r.id ; else `${min}|${max}` of the landmark ids

export interface PinModel { id: string; label: string; lat: number; lon: number; radiusM: number }
export interface RouteLineModel {
  key: string;            // pairKey
  routeId: string;        // primary route (D5)
  routeIds: string[];     // every route of the pair (1 or 2)
  wayId: string;          // the way whose path is drawn
  placeIds: string[];     // [start, end] of the primary route
  path: LatLon[];
}
export interface OverviewModel { pins: PinModel[]; lines: RouteLineModel[]; bounds: LonLatBoundsBox | null }
export function overviewModel(deps: CatalogMapDeps): OverviewModel;
// pins = every landmark in catalog order. lines = one per pair with a drawable path (D5 fallback to the twin; none -> no line). bounds = boundsOfPoints(pins) or null when no pins; one pin -> placeBounds(lat, lon, radiusM).

export interface PlaceRouteRow { routeId: string; label: string; direction: 'from' | 'to' | 'loop'; wayCount: number; rides: number }
export interface PlaceFocusModel {
  place: PinModel;
  neighbourIds: string[];       // other endpoints of touching routes, unique, catalog order, never the place itself (a loop adds nothing)
  connectedRouteIds: string[];  // every route whose start or end is the place
  rows: PlaceRouteRow[];        // 'from' rows first, then 'to', then 'loop'; within a group catalog order; label = `${startLabel} → ${endLabel}` (same as catalogDetailModel's routeLabel); rides = sum of ridesFor over the route's ways
  bounds: LonLatBoundsBox;      // boundsOfPoints(place + neighbours); no neighbours -> placeBounds(place)
}
export function placeFocusModel(placeId: string, deps: CatalogMapDeps): PlaceFocusModel | null;   // null = unknown place

export interface RouteWayRow { wayId: string; label: string; rides: number; usual: boolean; path: LatLon[] | null }
export interface RouteFocusModel {
  routeId: string; label: string; usualWayId: string | null;
  ways: RouteWayRow[];          // usual first, then the rest in route.wayIds order; label = wayVariantLabel(way.id, route, way.specs)
  bounds: LonLatBoundsBox | null;   // boundsOfPoints over every vertex of every non-null path; null when nothing is drawable
}
export function routeFocusModel(routeId: string, deps: CatalogMapDeps): RouteFocusModel | null;

export function differingStretches(base: LatLon[], other: LatLon[], thresholdM = DIFF_THRESHOLD_M): LatLon[][];
// D12. base.length < 2 -> other.length >= 2 ? [other] : []. Guard -> [other]. Mark far[i] = nearestOnPath(base, lat, lon)!.distM > thresholdM; runs of consecutive far vertices; extend each run by one index on each side (clamped); merge runs that touch/overlap after extension; drop runs shorter than 2; return the slices of `other`.

export function boundsOfPoints(points: readonly { lat: number; lon: number }[], padFrac = PAD_FRAC, minSpanM = MIN_SPAN_M): LonLatBoundsBox | null;
// null for 0 points. Raw min/max; then pad each side by padFrac of the span; then, if the padded span in metres (metresBetween across the centre) is below minSpanM in either axis, widen that axis symmetrically to minSpanM (convert metres to degrees: lat 1° = 111320 m, lon 1° = 111320·cos(centre lat) m).
```

Pure means: no React, no expo, no MapLibre, no store singletons; everything through `deps`.

### 4.2 CREATE `app/src/ui/catalogMapView.tsx` (the map; a sibling of `WayMapView`)

Props:
```ts
export type CatalogMapFocus =
  | { level: 'overview' }
  | { level: 'place'; placeId: string; highlightRouteId: string | null }
  | { level: 'route'; routeId: string; highlightWayId: string | null };
export interface CatalogMapViewProps {
  overview: OverviewModel;                 // computed by the screen (§4.3)
  focus: CatalogMapFocus;
  place: PlaceFocusModel | null;           // non-null iff focus.level === 'place'
  route: RouteFocusModel | null;           // non-null iff focus.level === 'route'
  gateAsset: WayAsset | null;              // the highlighted way's asset in route focus (gates), else null
  sheetOpen: boolean;                      // D13 padding
  onPressPin: (placeId: string) => void;
  onPressLine: (routeId: string) => void;
  onPressEmpty: () => void;
}
export default function CatalogMapView(props: CatalogMapViewProps): JSX.Element;
```
Structure (mirror `wayMapView.tsx`, same names where the thing is the same):
1. Module scope: the lazy `ML = require('@maplibre/maplibre-react-native')` try/catch (copy the quoted require block, §3); `MAP_STYLE_NIGHT/DAY`, `STYLE_RETRY_MS`, `CASING`, `EMPTY_FC` copied as local consts (same values); the D10 constants. If `ML === null` render the same `map unavailable` badge WayMapView renders (the `map unavailable` badge, §3) — that string is already listed for `wayMapView.tsx`; in YOUR file it is a new JSX text, so instead render an EMPTY frame (`<View style={st.frame}/>`), no text. (The module missing is a dev-client-from-2026-08 case only.)
2. Style: copy the `patchedStyles/styleFailed/styleLoadedRef` state + fetch/retry effect and the `mapStyleFor` call (§3, ~:509-560) with `hideLabels: false` (browse surface, labels on). `const { style: mapStyle, key: mapStyleKey } = …`.
3. Camera: `mode: 'fit' | 'free'` state; `useEffect(() => setMode('fit'), [focusKey, mapStyleKey])` where `focusKey = JSON.stringify(props.focus)`; `cameraRef`; `cameraProps = { ...cameraTargetFor({ mode: mode === 'fit' ? 'fit' : 'free', here: null, bounds, zoom: 14, bearing: 0 }), padding: … }` only when mode is 'fit' (D13); bounds = `props.route?.bounds ?? props.place?.bounds ?? props.overview.bounds`. `onRegionWillChange`: `userInteraction` → `setMode('free')`. `onRegionDidChange`: read `zoom` into `liveZoom` state (for `gateHalfLenM`).
4. Features (all `useMemo`, all always-mounted sources in this JSX order so mount order = paint order): 
   - `linesFC`: one LineString per `overview.lines` entry, coordinates `path.map(([lat,lon]) => [lon,lat])`, properties `{ routeId, key, opacity, width }` where opacity/width follow D10: overview → 0.55/4; place focus → connected (`place.connectedRouteIds` ∩ `line.routeIds` non-empty) ? (highlighted ? 1.0/6 : 0.95/4) : 0.12/4; route focus → the focused route's line gets opacity 0 (its ways are drawn by `waysFC` instead), every other line 0.12/4.
   - `waysFC` (route focus only, else empty): for each `route.ways` row with a path: the highlighted way (`focus.highlightWayId ?? route.usualWayId`) as its full path, `{ opacity: 1.0, width: 5, colour: colors.neutral }`; the usual way when it is not the highlighted one as its full path `{ 0.55, 4, colors.neutral }`; every other way: `differingStretches(highlightedPath, way.path)` each slice a feature `{ 0.85, 3, colour: t.text }`.
   - `gatesFC`: `props.gateAsset ? gateTicksFeatureCollection(props.gateAsset, undefined, gateHalfLenM(props.gateAsset.gates[0]?.lat ?? 0, liveZoom ?? 14)) : EMPTY_FC`.
   - `pinsFC`: one Point per `overview.pins`, properties `{ placeId, label, opacity, radius }`: overview → 1/6; place focus → the place 1/8, neighbours 1/6, others 0.3/6; route focus → the route's two endpoints 1/6, others 0.3/6.
5. JSX: `<View style={st.frame}>` (fill: `{ flex: 1, alignSelf: 'stretch' }`, no border radius — full bleed) → `<M.Map key={mapStyleKey} mapStyle={mapStyle as never} style={{flex:1}} onDidFinishLoadingStyle onDidFailLoadingMap onRegionWillChange onRegionDidChange onPress={() => props.onPressEmpty()} attribution={false} logo={false} compass={false} dragPan touchZoom doubleTapZoom doubleTapHoldZoom touchRotate={false} touchPitch={false}>` → `<M.Camera ref={cameraRef} {...cameraProps} />` → sources in this order, every one always mounted:
   - `catalogLines` (`onPress`: read `features[0].properties.routeId`, call `e.stopPropagation()`, `props.onPressLine(routeId)`): layer `catalogLinesCore` type line, paint `{ 'line-color': colors.neutral, 'line-opacity': ['get','opacity'], 'line-width': ['get','width'] }`, layout round join/cap. No casing (D10: overlaps must darken).
   - `catalogWays` (no onPress): layer `catalogWaysCasing` line `{ 'line-color': CASING, 'line-width': ['+', ['get','width'], 3], 'line-opacity': ['get','opacity'] }` then `catalogWaysCore` line `{ 'line-color': ['get','colour'], 'line-opacity': ['get','opacity'], 'line-width': ['get','width'] }`.
   - `catalogGates`: two layers with the gate-ticks paint copied from the `gate-ticks-casing` / `gate-ticks` layers (§3) (ids `catalogGatesCasing`, `catalogGatesCore`).
   - `catalogPins` (`onPress`: `features[0].properties.placeId`, `stopPropagation`, `props.onPressPin`; `hitbox={{top:24,right:24,bottom:24,left:24}}`): layer `catalogPinsDot` circle `{ 'circle-radius': ['get','radius'], 'circle-color': colors.neutral, 'circle-opacity': ['get','opacity'], 'circle-stroke-color': CASING, 'circle-stroke-width': 1.5, 'circle-stroke-opacity': ['get','opacity'] }`; layer `catalogPinsLabel` symbol, layout `{ 'text-field': ['get','label'], 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-anchor': 'top', 'text-offset': [0, 0.9], 'text-allow-overlap': false }`, paint `{ 'text-color': t.text, 'text-halo-color': t.bg, 'text-halo-width': 1.5, 'text-opacity': ['get','opacity'] }`.
   Then, outside `<M.Map>`: the zoom bar with + / − / FIT only (copy the three Pressables under `<View style={st.zoomBar}>` (§3), FIT sets `setMode('fit')`; no ME, no compass; `FIT` is JSX text already listed for `wayMapView.tsx` — in YOUR file it would be a new entry, so render the FIT button with the glyph `⤢` instead, no letters) and `<Credit rung="maplibre" locked={false} />` imported from `./wayMapView.tsx`.
   Keep the `Map.onPress` handler simple: it fires for empty taps only when the source handlers call `stopPropagation()`; if on the device a pin tap also triggers `onPressEmpty`, that is a report item, not a STOP (see §8).

### 4.3 REPLACE `app/src/ui/RoutesScreen.tsx` (whole file; keep the file name and default export name `RoutesScreen`)

Header comment: "MAP tab (virgin-cycle24 brief 03, Nathan 2026-10-06): …" summarising the three levels and that the file keeps its old name. Then:
- Reads per render (B-39 rule, like today's `:33-35`): `CATALOG = activeCatalog()`, `sportId`, `sportLabel`.
- `deps: CatalogMapDeps = { catalog: CATALOG, pathFor: (id) => assetFor(id)?.path ?? null, ridesFor: (id) => storedResultsForWay(id).length }` where `assetFor` is a local copy of `wayMapView.tsx`'s `safeRefFor` / `assetDeps` / `assetFor` (§3) plus the `ASSETS` manifest const — 10 lines, same imports (`manifest from '../../assets/ways/ways.json'`, `bundledForSeedMode, SEED_MODE`, `refFor`, `currentCatalog`, `resolveWayAsset`). Put these in `catalogMapView.tsx` as an exported helper `export function catalogAssetFor(id: string): WayAsset | null` and import it here, so the manifest is loaded once.
- State: `focus: CatalogMapFocus` (initial `{ level: 'overview' }`), `tick` (bump on nothing tonight — leave out).
- `overview = useMemo(() => overviewModel(deps), [CATALOG])`; `place = focus.level === 'place' ? placeFocusModel(focus.placeId, deps) : null`; `route = focus.level === 'route' ? routeFocusModel(focus.routeId, deps) : null`; if a focus resolves to null (place/route vanished), fall back to overview in an effect (same idiom as `CatalogDetailScreen.tsx:84-88`).
- `gateAsset = route ? catalogAssetFor(focus.highlightWayId ?? route.usualWayId ?? '') : null`.
- Handlers: `onPressPin(id)` → `{level:'place', placeId:id, highlightRouteId:null}`; `onPressLine(routeId)` → if place-focused and `highlightRouteId !== routeId` → set highlight; else `{level:'route', routeId, highlightWayId:null}`; `onPressEmpty` → overview; sheet row (place): same rule as line; sheet row (route): `highlightWayId = wayId`; sheet × → overview; sheet header → `tabNav.openCatalog({kind:'place'|'route', id})`.
- Render: `<View style={{flex:1}}>` → `<CatalogMapView …/>` → sport badge chip absolutely positioned top-left (`top: 8, left: 8`, `t.card` bg, `t.cardBorder` border, radius 8, padding 4/8; Text `st.h2`-like 11 px letterSpacing 2 `t.textDim`, text = `sportLabel.toUpperCase()` or the existing literal `'NO SPORT YET · ADD ONE IN SETTINGS'`) → the sheet when `focus.level !== 'overview'` (D11): header row = `Pressable` (flex 1, row: `Text` label 15 px `t.text` + `Text '›'` `t.textDim`) opening the detail, beside a `Pressable` `Text '×'` (18 px, `t.textDim`, hitSlop 10) closing; then a `ScrollView` of rows: place → `place.rows` (left `row.label` 14 px, colour `t.accentText` when `row.routeId === highlightRouteId` else `t.text`; right `String(row.rides)` 12.5 px `t.textDim`); route → `route.ways` (left `row.label`, highlighted the same way for the highlighted way; right rides). Rows have `borderTopWidth: 1, borderTopColor: t.cardBorder, paddingVertical: 9, paddingHorizontal: 13`. No headings, no captions, no other text.
- No `ScrollView` wrapper around the map, no padding: the map is the screen.

### 4.4 EDIT `app/App.tsx:62` — in `TAB_LABEL` change `routes: 'routes'` to `routes: 'map'`. Nothing else in App.tsx. (Single word: not scanned.)

### 4.5 EDIT `app/src/ui/wayMapView.tsx` (~:337) — `function Credit(` → `export function Credit(`. ONE word, via `sed -i 's/^function Credit(props: { rung: MapRung; locked: boolean }) {$/export function Credit(props: { rung: MapRung; locked: boolean }) {/'` after confirming with `grep -n "^function Credit(" src/ui/wayMapView.tsx` prints exactly one line. If it prints zero or two lines: STOP.

### 4.6 EDIT `app/src/ui/CatalogDetailScreen.tsx:179` — `BACK TO ROUTES` → `BACK TO MAP` (the one `<Text>`; grep shows exactly one occurrence in that file, otherwise STOP).

### 4.7 EDIT `app/tests/run.ts` — insert `import './catalogmap_suite.ts';` on the line after `import './catalogdetail_suite.ts';` (verify that line exists; cycle23 is also appending imports to this file — insert, never rewrite).

### 4.8 CREATE `app/tests/catalogmap_suite.ts` — §7.1.

### 4.9 EDIT `app/tests/ui-strings.allow.json` — §6, via the Python script in §6.

### 4.10 CREATE `cycles/virgin-cycle24/03-executor-report.md` — §9.

## 5. Order of work (each step ends with a check you can see)

0. Baseline: `cd app && GIT_OPTIONAL_LOCKS=0 git status --short > ../cycles/virgin-cycle24/03-baseline-status.txt`; `node --experimental-strip-types tests/run.ts 2>&1 | tail -5 | tee ../cycles/virgin-cycle24/03-baseline-run.txt`; `./node_modules/.bin/tsc --noEmit; echo EXIT $?` (record). Expect the foreign crash from §0(c); record it.
1. Write `catalogMapModel.ts` (§4.1). Check: `./node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep catalogMapModel` prints nothing.
2. Write `tests/catalogmap_suite.ts` (§7.1). Check with the standalone command in §7.2: all its tests PASS.
3. Write `catalogMapView.tsx` (§4.2) importing `Credit` from `./wayMapView.tsx` — it will not type-check until step 8; write it fully anyway.
4. Rewrite `RoutesScreen.tsx` (§4.3). 
5. `App.tsx` (§4.4), `CatalogDetailScreen.tsx` (§4.6).
6. `grep -rn "\"\|'" src/ui/catalogMapView.tsx src/ui/RoutesScreen.tsx | grep -E "id=\"[a-z]+-|'[A-Za-z]{2,}[^A-Za-z']+[A-Za-z]{2,}'"` — eyeball: the only prose literals must be `'Noto Sans Regular'` and `'NO SPORT YET · ADD ONE IN SETTINGS'`. Anything else: rename it (camelCase id) rather than list it.
7. Re-read `wayMapView.tsx`, `tests/run.ts`, `tests/ui-strings.allow.json` (`git diff --stat` on each — note whether cycle23 touched them since step 0).
8. The three shared edits in one go: §4.5, §4.7, §6 script. Immediately after: `GIT_OPTIONAL_LOCKS=0 git diff -- tests/ui-strings.allow.json | grep '^[-+] ' | grep -v '^[-+]  *"' ` should be empty (only entry lines changed) and `grep -c '"file"' tests/ui-strings.allow.json` = baseline − 8 + 2.
9. Verification (§7.2). Fix only what is inside your files. Any failure in a file you did not touch → report as foreign.
10. Write the report (§9). Done. Do not commit.

## 6. Allow-list (`app/tests/ui-strings.allow.json`) — exact changes

Remove these 8 entries (match on `file` + `text`): `src/ui/RoutesScreen.tsx` × 7: `· asks which one at START`, `· not used by {…}`, `No places yet.`, `No routes yet.`, `ROUTES`, `YOUR PLACES`, `way`; and `src/ui/CatalogDetailScreen.tsx` `BACK TO ROUTES` (kind text). Keep `src/ui/RoutesScreen.tsx` / `NO SPORT YET · ADD ONE IN SETTINGS` (still in code). Verify beforehand that none of the 8 carries `"legacy": true` (`legacyCount` must not change; on 2026-10-06 none did).

Append these 2 (after the last entry, same field order):
```json
{ "file": "src/ui/CatalogDetailScreen.tsx", "kind": "text", "text": "BACK TO MAP", "reason": "virgin-cycle24 03: the ROUTES tab is now the MAP tab; same button, renamed", "since": "2026-10-07", "by": "sonnet-executor" },
{ "file": "src/ui/catalogMapView.tsx", "kind": "literal", "text": "Noto Sans Regular", "reason": "virgin-cycle24 03: MapLibre font-stack name for pin labels, never shown as text", "since": "2026-10-07", "by": "sonnet-executor" }
```
Do it with a Python read-modify-write (`json.load`, filter `entries` by (file, text), append, `json.dump(..., indent=2, ensure_ascii=False)` + trailing newline) — check first that the file is `indent=2` with `ensure_ascii=False` style (look at the `…` characters: they are literal, so `ensure_ascii=False`). Compare `git diff --stat` afterwards: only the entry lines above may differ; if the dump reformats other lines, revert your change (re-run the script from a copy of the original kept under `app/safe_to_delete/ui-strings.allow.pre-brief03.json`) and edit with targeted text replacement instead.

## Added visible text (CONVENTIONS § Rider-facing text)

| file | kind | exact text | why it earns its place |
|---|---|---|---|
| src/ui/CatalogDetailScreen.tsx | text | BACK TO MAP | the existing primary back button; the tab it returns to is now called MAP |
| src/ui/catalogMapView.tsx | literal | Noto Sans Regular | MapLibre glyph font stack; technical, never rendered as a sentence |

Everything else a rider sees on the tab is data (place names, route names, way variant labels, counts) or a glyph (×, ›, +, −, ⤢).

## 7. Tests and verification

### 7.1 `app/tests/catalogmap_suite.ts` (pure; `import { assert, test } from './lib.ts'` + the model; build catalogs inline with helper functions `lm(id, lat, lon)`, `route(id, a, b, wayIds)`, `way(id, routeId, specs?)`, `cat({landmarks, routes, ways})` filling the other `Catalog` fields with `[]`/empty as `emptyCatalog()` in `store/catalog.ts:27` does — import `emptyCatalog` from `../src/store/catalog.ts` only if that file is JSON-free (it is: types + geometry); a `pathFor` map and a `ridesFor` map).

Fixture: H(50.88,4.70) W(50.90,4.72) P(50.87,4.75) Q(51.00,4.70, no routes). Routes: rHW H→W ways w1(3 rides),w2(5 rides); rWH W→H way w3(1 ride); rHP H→P way w4(0 rides, path null); rLoop H→H loopDiscriminator 'x' way w5(2 rides). Paths: straight 20-vertex lines between endpoints; w2 = w1's path with a 60 m lateral bump on vertices 8-11; w3 = reverse of w1; w5 = a 20-vertex out-and-back loop starting and ending at H (300 m east then back); w4 = null.

1. `usualWayId`: rHW → w2 (most rides); with equal rides → w1 (wayIds order); rHP → w4 even without a path; unknown → null.
2. `pairKey`: rHW and rWH share a key; rLoop's key is its own id; H→P ≠ H→W.
3. `overviewModel` pins: 4 pins in catalog order with labels; lines: exactly 2 (the HW pair, and the loop drawn from w5; NO line for rHP because w4 has no path and no twin) — assert the HW line has `routeId 'rHW'`, `routeIds ['rHW','rWH']`, `wayId 'w2'`, `placeIds ['H','W']`; bounds non-null and encloses all 4 pins.
4. `overviewModel` fallback: make w2 and w1 undrawable (pathFor null) → the HW line draws w3's path with `routeId` still 'rHW' and `wayId 'w3'`; make w3 undrawable too → no HW line.
5. `overviewModel` empty: empty catalog → `{pins: [], lines: [], bounds: null}`; one landmark, no routes → one pin, bounds equal `placeBounds(lat, lon, radiusM)`.
6. `placeFocusModel('H')`: neighbourIds `['W','P']` (unique, no H), connectedRouteIds `['rHW','rWH','rHP','rLoop']` (catalog order), rows order from/to/loop: `[rHW from, rHP from, rWH to, rLoop loop]`, `rows[0].label === 'H → W'` (use the landmark labels you gave), `rows[0].rides === 8`, `rows[0].wayCount === 2`; bounds encloses H, W, P and NOT necessarily Q. `placeFocusModel('Q')` → rows [], neighbourIds [], bounds = placeBounds(Q). Unknown → null.
7. `routeFocusModel('rHW')`: ways `[w2 (usual true), w1]`, labels from `wayVariantLabel` (give w1 specs `['Dry']` and assert `'Dry'`; w2 no specs → `'plain'` for a user-minted id — if your fixture ids are not user-minted ids (`isUserMintedWayId`), just assert the label is a non-empty string); rides 5 and 3; bounds encloses both paths; `routeFocusModel('rHP')` → one row, `path null`, bounds null; unknown → null.
8. `differingStretches`: identical → `[]`; w1 vs w2 → exactly 1 stretch, its first and last vertex are within 30 m of w1's path (`nearestOnPath`) and it contains the 4 bumped vertices; base shorter than 2 → `[other]`; other entirely 500 m away → `[other]` (one run covering all vertices); guard: `base` and `other` of 2500 vertices each → returns `[other]` quickly (assert length 1 and `=== other` by reference or deep equal).
9. `boundsOfPoints`: two points 100 m apart → span ≥ 800 m in both axes (convert with `metresBetween`); two points 5 km apart → padded by 15 % each side (±1 %); 0 points → null.
10. Source pins (`fs.readFileSync`, same idiom as `tests/recordflow_suite.ts:128`): `App.tsx` contains `routes: 'map'`; `src/ui/RoutesScreen.tsx` contains `<CatalogMapView` and does NOT contain `YOUR PLACES`; `src/ui/catalogMapView.tsx` contains `'text-font': ['Noto Sans Regular']` and `stopPropagation`; `src/ui/wayMapView.tsx` contains `export function Credit(`.

Name every test `catalogmap: <what>`. Expected: ≥ 20 `test()` calls.

### 7.2 Commands (from `app/`)
- Full suite: `node --experimental-strip-types tests/run.ts 2>&1 | tail -3` → the `PASS/FAIL/SKIP` line must show **0 FAIL** and the count must be baseline + your tests (≥ 20). 
- If the full suite still crashes in a foreign file (§0c): standalone your suite: `node --experimental-strip-types --input-type=module -e "import './tests/seedmode_pin.ts'; await import('./tests/catalogmap_suite.ts'); await import('./tests/ui_strings_suite.ts'); const { runAll } = await import('./tests/lib.ts'); const r = await runAll(); process.exitCode = r.fail > 0 ? 1 : 0;"` → 0 FAIL (this covers your model AND the allow-list guard). Also run `waymapgeo_suite.ts` and `catalogdetail_suite.ts` the same way (neighbours of what you touched).
- `./node_modules/.bin/tsc --noEmit; echo EXIT $?` → `EXIT 0`. If non-zero, every reported file must be foreign (not in §4) — list them verbatim; zero errors in your files is mandatory.
- `GIT_OPTIONAL_LOCKS=0 git status --short` and `git diff --stat` → only the §4 files beyond the baseline list from step 0.

## 8. DO NOT

- No edit mode, selection bars, delete/rename/merge UX, changes to what delete does, starting an activity from this tab, straight desire-line spokes, line thickness by frequency, gates outside route focus, accounts/social.
- No change to `WayMapView` beyond the one `export` word; no change to any screen other than `RoutesScreen.tsx`, `App.tsx` (one word), `CatalogDetailScreen.tsx` (one string).
- No new strings beyond §6; no helper captions, sub-labels, banners, empty-state sentences, headings in the sheet.
- No commit, no push, no EAS/OTA publish, no `npm`/`npx` install, no `git stash/checkout/restore`.
- No deleting; no touching `IDEAS.md`/`STATE.md`/`OPEN-ITEMS.md`; no edits to cycle23's files or briefs.
- Device-only behaviour you cannot verify (tap routing between source and map `onPress`, label rendering, sheet height on small phones) is REPORTED, not guessed at and not "fixed" by speculation.

## 9. Report — `cycles/virgin-cycle24/03-executor-report.md`

Sections, in order: `## Files changed` (path + one line each, created/edited); `## Tests` (baseline PASS/FAIL/SKIP line and crash note verbatim → after; your suite's count; the standalone command outputs if used); `## tsc` (exit code before/after, foreign errors verbatim); `## Allow-list diff` (`git diff -- tests/ui-strings.allow.json` pasted); `## Foreign` (anything failing in files you did not touch, verbatim); `## Could not verify on a device` (list); `## STOPPED` (only if you stopped: the exact mismatch, verbatim, and what you had already written to disk); `## Open for Nathan` (anything you noticed but did not act on).
