# Brief 02 — snapshot probe: one ACTIVITIES card drawn by the headless MapLibre snapshotter (virgin-cycle29)

Written 2026-10-09 by the Plan tier (Fable). Tree expected: brief 01 applied and inspected (uncommitted or committed),
otherwise HEAD `c93f406`. Baseline after 01: 972 tests, 0 fail, tsc clean. Read `EXECUTOR-RULES.md`, `/CLAUDE.md`,
then this brief. Ruling: `03-fable-ruling.md` Q2 (a, b, d) and §3 corrections.

> **Amendment (inspect-02), 2026-10-10, Fable — ruled in `ruling-02-inspect-fixes.md`, applied before Nathan's probe.**
> M1: `createImage` is wrapped in `withTimeout(…, SNAPSHOT_TIMEOUT_MS = 10 s)` (pure helper in cardSnapshotModel.ts) because
> Android's native module never rejects on a snapshotter error; a timeout is an ordinary `[snap] failed … timeout`, no retry.
> M2: the snapshot branch of activityCard.tsx also renders `<Credit rung="maplibre" locked={false} />` (the existing licence
> control from wayMapView.tsx) over the picture. Minors fixed in 02: `[snap] hit` log on a cache hit; `setProbeUri(null)` at
> the start of each probe run; `widthDp = Math.floor(winW)`; stronger gate pin. §7 count: +8 (→ 991 with the new withTimeout
> test), §8.2 reads 991, §8.4 reads "allow-list differs from HEAD by exactly the 9 entries of ruling-02-escalation.md". §9
> below is the amended probe text (the one the coordinator hands over).

## 0. Rules (binding)
- JS-only, OTA-safe: no change under `app/modules/`, `app.json`, `app.config.js`, `package.json`, `eas.json`; no new
  dependency. `@maplibre/maplibre-react-native` 11.3.6 and `expo-file-system` ~56 are already installed.
- No git add/commit/push, no EAS, no OTA. Delete nothing in the repo (`mv` to `safe_to_delete/`). The app deleting its
  OWN derived snapshot files on the phone is allowed (D-023: a derived cache).
- STOP-ON-AMBIGUITY -> `cycles/virgin-cycle29/exec-report-02.md`, verbatim question, stop.
- Rider-facing text: NO new visible string. The probe is an image swap behind a long-press on the EXISTING "Activities"
  title. Allow-list byte-identical. Code literals single-word only (`'file'`, `'geojson'`, `'line'` are fine).
- Nothing negative shown; no spinner, no text while a snapshot is pending.
- Strip-only TypeScript. Pure modules import nothing from react/react-native/expo/maplibre.
- Do NOT touch: `GateAdjustScreen.tsx`, `App.tsx`, `colourModel.ts`, any store file except `storage/fsAdapter.ts` and
  `storage/expoFsAdapter.ts`, `feedModel.ts` heights.
- This brief is a PROBE. Its result decides whether brief 04 runs. It must leave every existing behaviour intact when the
  probe is off (default).

## 1. Verified facts the executor relies on (do not re-verify, do not deviate)
- `StaticMapImageManager` is exported from `@maplibre/maplibre-react-native` (`src/index.ts:160`); `createImage({ mapStyle:
  object|string, width, height, bounds: [west, south, east, north], output: 'file' | 'base64', logo?: boolean })` returns a
  `file://` URI (output 'file') of a PNG in Android `cacheDir` (`MLRNStaticMapModule.kt` + `BitmapUtils.createTempFile`).
  `bounds` is the FLAT 4-tuple (`types/LngLatBounds.ts`); the JSDoc example's nested pairs are stale, do not use them.
  `width`/`height` are dp; pixel ratio = device density, so the image is `width*density` px wide. `logo` defaults false.
  A style JSON (object) is accepted: `StaticMapManager.ts` stringifies it; native `Style.Builder().fromJson`.
- The module is in the installed build: `NativeStaticMapModule.ts` calls `TurboModuleRegistry.getEnforcing` at import and
  the library index imports it unconditionally; the app would already crash at `require('@maplibre/maplibre-react-native')`
  (`wayMapView.tsx:149`) if it were absent. Native deps are pinned by the fingerprint runtime policy (11.3.6).
- Our card layers are literal style-spec paint/layout objects (`wayMapView.tsx` 825-897, 933-962). A browse map is
  `unlocked` -> `hideLabels = false` -> the `labelsOn` patched copy (`wayMapView.tsx:564`, `mapStyleFor`).
- Camera on a card: `cameraTargetFor` 'fit' with `wayBounds(asset)` and padding 20 dp all sides (`wayMapGeo.ts:437-443`).
  `MapSnapshotter.withRegion` has no padding: it must be baked into the bounds (§3.2).
- Gate tick length: `gateHalfLenM(lat, zoom)` (`wayMapGeo.ts:336`); the live card renders ticks at the real fit zoom after
  `onRegionDidChange`. The snapshot computes that zoom once (§3.2).
- `expo-file-system` SDK 56: `new File(uri)`, `.exists`, `.uri`, `.move(destFile)` (async), `.delete()`;
  `storage/expoFsAdapter.ts` is the ONLY importer of expo-file-system in `storage/` (its header says so; keep it so).
- `activityCard.tsx` map slot: `<View style={st.mapSlot}>` with an absolute `placeholder` View then the optional
  `<WayMapView ...>` (lines 83-101). Card width = window width (bleed), map height = `CARD_MAP_HEIGHT` (150).

## 2. New pure module `app/src/ui/wayMapLayers.ts` (extraction; no behaviour change)
Move these paint/layout objects out of `wayMapView.tsx` verbatim into exported constants, and make `wayMapView.tsx` use them:
```
export const CASING = '#14120C';                       // moved from wayMapView.tsx:182 (keep a re-export or import there)
export const ROUND_LINE = { 'line-join': 'round', 'line-cap': 'round' } as const;
export const ROUND_CAP = { 'line-cap': 'round' } as const;
export const FAINT_OPACITY_EXPR = ['case', ['has', 'faint'], FAINT_OPACITY, 1];   // FAINT_OPACITY from wayMapGeo.ts
export const ROUTE_CASING_PAINT = { 'line-color': CASING, 'line-width': 7, 'line-opacity': FAINT_OPACITY_EXPR };
export const ROUTE_CORE_PAINT   = { 'line-color': colors.neutral, 'line-width': 4, 'line-opacity': FAINT_OPACITY_EXPR };
export const TRAIL_CASING_PAINT = { 'line-color': CASING, 'line-width': 7 };
export const TRAIL_CORE_PAINT   = { 'line-color': colors.neutral, 'line-width': 4 };
export const SECTOR_SPANS_PAINT = { 'line-color': ['case', ['has', 'colour'], ['get', 'colour'], 'rgba(0,0,0,0)'], 'line-width': 4, 'line-opacity': FAINT_OPACITY_EXPR };
export const GATE_TICKS_CASING_PAINT = { 'line-color': CASING, 'line-width': 5, 'line-opacity': FAINT_OPACITY_EXPR };
export const GATE_TICKS_PAINT = { 'line-color': ['case', ['has', 'colour'], ['get', 'colour'], colors.white], 'line-width': ['case', ['has', 'colour'], 3, 2], 'line-opacity': FAINT_OPACITY_EXPR };
/** The card's layer stack, in MOUNT order (= paint order), as style-spec layer objects. */
export function cardLayerSpecs(): { id: string; type: 'line'; source: string; paint: object; layout: object }[]  // route-casing, route-core, trail-casing, trail-core, sector-spans-core, gate-ticks-casing, gate-ticks
```
`colors` comes from `./theme.ts` (verified pure: `theme.ts` has no imports at all, and `tierColour.ts`, a pure
module, already imports it). `wayMapView.tsx` 825-962: replace each inline object with the constant
(`paint={ROUTE_CASING_PAINT}` etc.; cast `as never` only where the existing code already casts). The `waymap_suite.ts:431`
pin counts FIVE `['case', ['has', 'faint'], FAINT_OPACITY, 1]` occurrences in `wayMapView.tsx`; after extraction that
count is 0 in the view and 1 in `wayMapLayers.ts`: update the pin to read `wayMapLayers.ts` and assert the five paints
reference `FAINT_OPACITY_EXPR` (one regex count of `FAINT_OPACITY_EXPR` >= 6: definition + 5 uses). Also update
`waymap_suite.ts:432` if it reads the view for `'line-opacity': 1,` (keep the assertion against `wayMapLayers.ts`).

## 3. New pure module `app/src/ui/cardSnapshotModel.ts`
### 3.1 Key
```
export const SNAPSHOT_SCHEMA = 'v1';   // bump whenever wayMapLayers.ts paints or this builder change
export interface SnapshotKeyInput { variant: 'route'|'plain'; rideId: string; wayId: string|null; gateSetVersion: number|null;
  styleUrl: string; sectorColoursOn: boolean; sectorColours: readonly (string|null)[]; trailPoints: number; widthDp: number; heightDp: number; density: number }
export function snapshotKey(i: SnapshotKeyInput): string
  // `snap|v1|${variant}|${rideId}|${wayId ?? '-'}|${gateSetVersion ?? 0}|${styleUrl}|${sectorColoursOn ? sectorColours.map(c => c ?? '').join(',') : 'off'}|${trailPoints}|${widthDp}x${heightDp}|${density}`
export function snapshotFileName(key: string): string   // `${fnv1a32hex(key)}-${fnv1a32hex(reverse(key))}.png` (two 32-bit FNV-1a hashes, no crypto import)
```
### 3.2 Camera maths (Web-Mercator, pure; pin with tests against hand-computed values)
```
export function fitZoomFor(b: LonLatBoundsBox, widthDp: number, heightDp: number, padDp: number): number
  // MapLibre fitBounds: zoom such that the padded box fits; tile size 512; zoom = log2(min((w-2p)/dx, (h-2p)/dy)) where dx,dy are the box size in world px at zoom 0 (512 px world).
export function paddedBoundsFor(b: LonLatBoundsBox, widthDp: number, heightDp: number, padDp: number): [west, south, east, north]
  // the box MapSnapshotter.withRegion must receive so the ORIGINAL box lands exactly where the live fit puts it: expand in Mercator px at fitZoom by padDp on each side, then convert back. Degenerate box (dx or dy = 0): expand that axis to 1 m first.
```
### 3.3 Style builder
```
export function cardSnapshotStyle(patchedLabelsOn: unknown, draw: { route: FeatureCollection|null; trail: FeatureCollection; spans: FeatureCollection|null; ticks: FeatureCollection|null }): unknown
```
Deep-copies `patchedLabelsOn` (JSON round-trip), appends sources `route`, `trail`, `sector-spans`, `gate-ticks` as
`{ type: 'geojson', data }` (an EMPTY FeatureCollection when null, never omitted - mount parity), appends
`cardLayerSpecs()` at the END of `layers` (above every basemap layer, exactly as the live card). Does not touch `glyphs`,
`sprite`, `sources` of the basemap.
The caller (queue) builds `draw` with the SAME functions the live card uses: `routeRunsFeatureCollection(asset, null)`,
`trailLineFeature(trail)` (plain cards; `[]` features for route cards), `sectorSpansFeatureCollection(asset, colours,
leadColour, undefined)`, `gateTicksFeatureCollection(asset, undefined, gateHalfLenM(asset.gates[0]?.lat ?? 0, fitZoom),
undefined)`. Route cards pass `sectorColours` = `card.sectorColours` when the toggle is on else `ALL_YELLOW`, and
`leadColour` = `colors.grey` when on else undefined (mirror `activityCard.tsx:97-98`).

## 4. `storage/fsAdapter.ts` + `storage/expoFsAdapter.ts`
Add to `FsAdapter`: `importFile(srcUri: string, relPath: string): Promise<void>` (move a `file://` URI into the root at
`relPath`, creating parents; overwrite if present) and `fileUri(relPath: string): string` (the `file://` URI of a root path,
for `<Image source={{ uri }}>`). Expo: `new File(srcUri).move(fileAt(relPath))` after `ensureDir`; memory adapter:
`files.set(relPath, 'moved:' + srcUri)` and `fileUri` returns `memory://` + relPath. `storage_suite.ts`: add one memory-adapter
case. Keep `expoFsAdapter.ts` the only expo-file-system importer.

## 5. New module `app/src/ui/cardSnapshotQueue.ts` (minimal for the probe; brief 04 extends it)
- Imports `StaticMapImageManager` via the same guarded `require` pattern as `wayMapView.tsx:146-152` (null when absent ->
  every request rejects with `Error('unavailable')`).
- `requestSnapshot(input: SnapshotRequest): Promise<string>`: `SnapshotRequest = SnapshotKeyInput & { styleJson: unknown;
  bounds: [w,s,e,n] }`. Serialised: one `createImage` in flight (promise chain), dedup by key (a pending key returns the
  same promise). On success: `fs.importFile(uri, 'mapsnaps/<file>')`, returns `fs.fileUri(...)`; records
  `{ key, file, madeAtMs }` in a module `Map` AND in `mapsnaps/index.json` (text via `writeText`).
- `peekSnapshot(key): string | null` (uri if known in memory). `loadSnapshotIndex(fs)` reads `index.json` once at first use.
- `console.log('[snap] made', key, Date.now() - t0, 'ms')` on success; `console.warn('[snap] failed', key, message)` on failure.
- Gates (both must hold or the request REJECTS with `Error('gated')`, no retry in this brief): `cachedPatchedStyles(styleUrl)
  !== null` and `getStatus().session === null` (`location/index.ts:148`).

## 6. The probe (RidesScreen.tsx + activityCard.tsx)
- `RidesScreen.tsx:214` `<Text style={styles.title}>Activities</Text>` -> wrap in `<Pressable onLongPress={() => setProbe((v) => !v)} delayLongPress={600}>`
  (same Text inside, unchanged string). `const [probe, setProbe] = useState(false); const [probeUri, setProbeUri] = useState<string | null>(null);`
- Effect on `[probe, cards, s.sectorColours, themeMode]`: when `probe` and `cards[0]` exists, build the request for card 0
  (asset via the same resolver the view uses: export `assetFor` from `wayMapView.tsx` (it is module-private at line 172;
  export it, no other change), `wayBounds(asset)`, `fitZoomFor`, `paddedBoundsFor`, `cardSnapshotStyle(cachedPatchedStyles(styleUrl)!.labelsOn, draw)`,
  width `useWindowDimensions().width`, height `CARD_MAP_HEIGHT`, density `PixelRatio.get()`), call `requestSnapshot`, set
  `probeUri`. `styleUrl` = the same two constants as the view (`MAP_STYLE_NIGHT/DAY`, `wayMapView.tsx:192-193`): export
  them too. When `probe` is false -> `probeUri = null`.
- `ActivityCard` gets an optional prop `snapshotUri?: string | null`. In the map slot, when `snapshotUri` is a string render
  `<Image source={{ uri: snapshotUri }} style={StyleSheet.absoluteFill} resizeMode="cover" fadeDuration={0} />` INSTEAD of
  `<WayMapView>`; otherwise exactly today's tree. `RidesScreen` passes `snapshotUri={index === 0 ? probeUri : null}`.
- Plain cards (needsTrail): the probe uses the trail from `rideTrails.peek(rideId)` if present, else skips (logs
  `[snap] skip trail`); the gate on the probe is route cards first - Nathan tests on a route card.

## 7. Tests (new `app/tests/cardsnapshot_suite.ts`, registered in `tests/run.ts` after `mapcover_suite`)
1. `snapshotKey`: every field changes the key; `sectorColoursOn=false` ignores the colours array; stable for equal input.
2. `snapshotFileName`: `[0-9a-f]{8}-[0-9a-f]{8}\.png`, differs for two keys differing in one char.
3. `fitZoomFor`: a 1 km x 0.5 km box at lat 50.9 in a 400x150 dp slot with pad 20 -> zoom within 0.01 of the hand value
   (write the value in the test with the formula shown in a comment); wider pad -> lower zoom; square box in a wide slot
   is height-limited.
4. `paddedBoundsFor`: result contains the input box; its width in Mercator px at `fitZoomFor` = `widthDp` within 0.5 px.
5. `cardSnapshotStyle`: input style untouched (deep-copied); 4 sources appended; the last 7 layers are `cardLayerSpecs()`
   in order; each layer's `source` matches; `glyphs`/`sprite` unchanged; null FCs become empty FCs.
6. Parity: `wayMapLayers.cardLayerSpecs()` ids equal the `id=` of the 7 `<M.Layer>`s the card can draw in `wayMapView.tsx`
   (regex the view for `id="(route-casing|route-core|trail-casing|trail-core|sector-spans-core|gate-ticks-casing|gate-ticks)"`
   in order) and the view uses the constants (`paint={ROUTE_CASING_PAINT}` etc. present; no inline `'line-width': 7` left in the view).
7. Source pins: `activityCard.tsx` renders `<Image` only under `snapshotUri`; `RidesScreen.tsx` has `onLongPress` on the
   title and NO new string literal with two words; `cardSnapshotQueue.ts` contains `getStatus().session === null` and
   `cachedPatchedStyles(`; `expoFsAdapter.ts` has `.move(`; no other file imports `expo-file-system`
   (grep `from 'expo-file-system'` under `src/` = 1).
Expected: 972 + 7 = 979 tests, 0 fail.

## 8. Acceptance
1. `git status`/`diff --stat`: touched `wayMapView.tsx`, `activityCard.tsx`, `RidesScreen.tsx`, `storage/fsAdapter.ts`,
   `storage/expoFsAdapter.ts`, `tests/run.ts`, `tests/waymap_suite.ts`, `tests/storage_suite.ts`; new `wayMapLayers.ts`,
   `cardSnapshotModel.ts`, `cardSnapshotQueue.ts`, `tests/cardsnapshot_suite.ts`. Nothing else.
2. Suite zero FAIL (979). 3. tsc exit 0 (log `exec-02-tsc.log`). 4. Allow-list byte-identical. 5. No native/config change.
6. Say explicitly the snapshotter cannot run here.

## 9. On-device probe (Nathan; the GATE for brief 04; coordinator hands this as the OPEN-ITEMS line)
"virgin-cycle29 02 probe: ACTIVITIES, long-press the title 'Activities' (0.6 s): the FIRST card's map is replaced by a
snapshot picture of the same card; long-press again to go back. Compare both in night and day, with SETTINGS sector colours
on and off: line, casing, gate ticks, sector colours, framing, text labels, crispness. The small 'i' map-credit button sits
in the bottom-right corner on BOTH sides (it is drawn over the picture too, and tapping it opens the same sources card):
it is part of the comparison, not a difference. A single-frame flash of the frame colour at the moment of the swap is not a
difference. Timing: only the FIRST long-press per state on this install makes a picture (`[snap] made … ms` in the dev log);
a repeat shows the cached file (`[snap] hit`) and its speed does not count. If nothing appears within ~10 s the log shows
`[snap] failed … timeout`: report that as FAIL (snapshotter broken), not as slow. PASS = you cannot tell them apart in all
four states and the first picture per state appears within ~1.5 s. FAIL = report what differs (brief 04 is then not
executed; brief 01's fixes stand)."

## 10. Visible text
None added/removed/moved. Allow-list byte-identical.

## 11. Report
`cycles/virgin-cycle29/exec-report-02.md`. For the inspector: (a) extraction is byte-equivalent (diff the paint objects),
(b) the probe is unreachable without the long-press and `snapshotUri` defaults undefined, (c) one `createImage` in flight,
(d) `expoFsAdapter.ts` is still the only expo-file-system importer, (e) `assetFor`/style URL exports add no behaviour.
