# 05 — Retire the PNG fallback map rung: one map (MapLibre), empty basemap + local layers when offline

**Source: Nathan, 2026-10-05 22:50 (README "Decision from Nathan (2026-10-05 22:50) — item 5"; intake
digests/I5-png-fallback-retire-intake.md; Haiku digest D9).** The route map has two rungs: MapLibre +
real tiles, and a pre-rendered PNG per seed way (`PngWayMap`) that takes over when the native module
is missing or `onDidFailLoadingMap` fires (sticky `mapFailed`). The PNG rung draws none of the live
layers (trail, selfs, sector spans, place, ride trace, gate taps), has its own three-button zoom bar,
three badges and its own Esri/HERE/Garmin credit, and on the virgin build its images are empty stubs
anyway. Decision: retire it ENTIRELY. Offline the map behaves like Google Maps / Waze: an empty
basemap (the frame colour) with the route line, gates, trail, selfs and rider dot still drawn on top.
Written by the Plan tier (Fable) on 2026-10-05 after reading wayMapView.tsx, wayMapStyle.ts,
mapCreditModel.ts, metro.seedRedirect.js, store/seed.ts and every test that names the rung; every
anchor below was re-verified against the current tree (D9 is not trusted blindly — see § D9 errata).
Nothing is executed yet.

**Tier:** Execute = Sonnet, alone. STOP-ON-AMBIGUITY (EXECUTOR-RULES.md): any quoted anchor not found,
any test failing for a reason this brief does not name, any extra tsc error -> stop and report verbatim.
Never rule yourself.

**Run order:** after 01 -> 02 -> 03 (they do not touch wayMapView.tsx; this brief does not touch their
files). **05 MUST land before 06** (06 edits the MapLibre zoom bar in the same file and anchors on
text that this brief leaves exactly as it is; 06's "exactly one `st.zoomBar`" test assumes the PNG bar
is gone). 07 is independent of this brief.

## 0. What the code does today (verified 2026-10-05; line numbers = current tree)

- `app/src/ui/wayMapView.tsx` (1201 lines):
  - `:140-147` lazy `require('@maplibre/maplibre-react-native')` in try/catch -> `ML` (null when the
    native module is missing — a pre-build-4 dev client; every build since build 4 has it).
  - `:292-296` `export default function WayMapView(props)`: `const [mapFailed, setMapFailed] =
    useState(false); if (ML === null || mapFailed) return <PngWayMap {...props} />; return
    <MapLibreWayMap {...props} maplibre={ML} onMapFailed={() => setMapFailed(true)} />;`. `mapFailed`
    is sticky (never reset).
  - `:171-175` `const IMAGES: Record<string, number> = bundledForSeedMode(SEED_MODE, { Morning:
    require('../../assets/ways/Morning.png'), EveningA: ..., EveningB: ... });` — PNG rung only.
    `ASSETS` (:151-153, the `ways.json` manifest) is NOT PNG-only: `assetFor()` (:166-168) feeds the
    MapLibre rung's route line/gates on a shipped build and stays.
  - `:357-361` `function MapLibreWayMap(props: WayMapProps & { maplibre: NonNullable<typeof ML>;
    onMapFailed: () => void; }) { const { maplibre: M, onMapFailed } = props;`
  - `:471-497` style effect: `fetch(styleUrl)` once per `styleUrl`, `patchMapStyle` -> `patchedStyles`;
    on a fetch failure nothing happens ("acceptable rung — plain online style, unpatched"); `const
    mapStyle = patchedStyles ? (hideLabels ? patchedStyles.labelsOff : patchedStyles.labelsOn) :
    styleUrl;`. So on first render the NATIVE view is handed the URL string and loads it itself;
    offline with nothing in MapLibre's own cache that fails -> `:656 onDidFailLoadingMap={onMapFailed}`
    -> PNG rung for the rest of the mount.
  - Every drawable layer of the MapLibre rung is a `<M.GeoJSONSource>` child of `<M.Map>` with
    inline `paint` (route :710-717, trail :724-731, sector-spans :774-781, place :782-798, gate-ticks
    :814-834, gate-selected :842-849, selfs :859-876, rider :877-890). None of them references a
    style layer, source, sprite or glyph of the fetched style: **they are style-independent** and
    render on ANY loaded style, including a style with zero sources (verified: no `sourceLayerID`,
    no `text-field`/symbol layer, no `icon-image` in the file).
  - `:897-931` MapLibre zoom bar (`+`, `−`, FIT, compass, ME); `:932 <Credit rung="maplibre" .../>`;
    `:934-941` OFF ROUTE + `waiting for GPS` badges (`st.badge`, bottom-left).
  - `:945-1165` the PNG rung: `// ----...---- PNG rung` comment (:945), a 2-line comment (:947-948),
    `function PngWayMap(props: WayMapProps) {` (:950) ... closing `}` (:1165), followed by a blank
    line and `const st = StyleSheet.create({` (:1167). Inside: `imgFailed` sub-rung, badges
    `place map needs the tile map` (:986), `map needs the tile map` (:1010), `MAP IMAGE FAILED —
    drawing the line` (:1151), `OFF ROUTE · >120 m from the route line` (:1157), `waiting for GPS`
    (:1161), its own `st.zoomBar` (:1135), `<Credit rung="png"` twice (:988, :1154).
  - `:1175 dot: { position: 'absolute', width: 14, height: 14, borderRadius: 14, borderWidth: 2 },`
    (PNG rider dot style; `st.dot` is used nowhere else — grep).
  - Imports PNG-only: `Image, LayoutChangeEvent` (:85, from react-native); `cropFor, gateTickPx,
    projectToPixel` (:87, wayMapMath); `nearestOnPath` (:94, wayMapGeo). `offWayM` (:87) is NOT
    PNG-only: MapLibreWayMap calls it at :585. `SEED_MODE, bundledForSeedMode` (:89) stay for ASSETS.
- `app/src/ui/mapCreditModel.ts` (44 lines): `export type MapRung = 'maplibre' | 'png';`, `PNG_CREDIT`
  (:19), the `png` entry in `CREDITS` (:33-39, "Esri, HERE, Garmin" imagery row). The PNGs are the
  ONLY Esri/HERE/Garmin imagery in the app (grep `Esri` over app/src: mapCreditModel.ts only).
- `app/src/ui/wayMapStyle.ts` (162 lines): pure `patchMapStyle(style, { hideLabels })`; headless suite
  `tests/waymapstyle_suite.ts` (137 lines, last test `'routemapstyle: patching twice is idempotent'`).
- `app/src/ui/wayMapMath.ts`: `projectToPixel` is still used by `wayAssetRuntime.ts:98` (runtime
  assets carry px/py), `metresPerPixel` by `wayMapGeo.ts`, `positionAtTime` by demoModel/DemoScreen,
  `offWayM` by the MapLibre rung; `cropFor` and `gateTickPx` become unused by app code after this
  brief but are pure, tested (`waymap_suite.ts:112`, `:205`) and cheap — **left in place** (decision 6).
- Metro / seed stubs: `app/metro.seedRedirect.js` redirects six files (incl. the three PNGs) to stubs
  on non-shipped bundles; `tests/seedstubs_suite.ts` pins the six paths AND asserts the real files still
  exist (`'real seed files still exist at their real paths'`). **Untouched by this brief** (decision 3):
  once nothing `require()`s the PNGs, Metro does not bundle them on any build; the redirect entries
  become inert, the files stay on disk.
- Tests naming the rung (all verified): `tests/waymap_suite.ts` :282-297 (`idAssignments.length === 2`,
  "one per rung"), :318-338 (compass test, second half slices the PNG bar up to `'MAP IMAGE FAILED'`),
  :340-355 (`<Credit rung="png"` count `=== 2`); `tests/mapcredit_suite.ts` :7 import `PNG_CREDIT`,
  :21-27 the PNG wording test; `tests/virginmanifest_suite.ts` :279 `guardHits >= 2` ("at both
  definition sites" — ASSETS and IMAGES). `tests/seedstubs_suite.ts` and `tests/waymapgeo_suite.ts:575`
  reference wayMapView.tsx but nothing this brief changes.
- `app/tests/ui-strings.allow.json`: entries for `src/ui/wayMapView.tsx` kind `text`: `"MAP IMAGE FAILED
  — drawing the line"` (:3885-3896, **`"legacy": true`, violates em-dash**), `"map needs the tile map"`
  (:3921-3928), `"place map needs the tile map"` (:3929-3936). Header `"legacyCount": 33` (:6) must
  equal the number of legacy entries (ui_strings_extract.ts :281-286). `"FIT"`, `"OFF ROUTE · >120 m
  from the route line"`, `"waiting for GPS"`, `"ME"` stay (still in the MapLibre rung).
- Callers (RecordScreen ×3, CatalogDetailScreen ×2, RideDetailScreen ×4, ReplayScreen, gateAdjustCard,
  DemoScreen ×2) pass nothing rung-specific; DemoScreen's `asset` prop is honoured by the MapLibre rung
  (`props.asset ?? assetFor(id)` :364). No caller changes.

## Design (what the rider sees in each failure case — decided by Plan, see decisions 1-2)

| case | today | after this brief |
|---|---|---|
| native module missing (`ML === null`) | PNG rung | the map frame with one dim badge `map unavailable`; nothing else (no line: without MapLibre there is no renderer left). Dev-client-only case since build 4. |
| online, style loads | MapLibre, patched style | unchanged |
| offline, style in MapLibre's own cache (Nathan's trip: home region still detailed) | native loads the URL from its cache; JS fetch fails silently | unchanged (the URL is still handed to native first), plus the JS fetch now retries a few times so labels-off patching arrives when the signal returns |
| offline, first ever open / nothing cached (`onDidFailLoadingMap`) | PNG rung (stub image on virgin builds) | **MapLibre stays**, its style swapped to `offlineMapStyle(t.race.bg)` — a bundled, background-only style object (one `background` layer in the frame colour, no sources, no glyphs, no sprite). Route line, gates, trail, spans, selfs, rider all render on it (style-independent, § 0). No badge: an empty basemap with the line is the honest state, same as Google Maps / Waze. |
| connection returns while mounted | nothing (sticky `mapFailed`) | the retrying fetch succeeds -> `patchedStyles` wins over the offline style -> real tiles. Falls out of the design (decision 2). |

## Scope / non-scope

IN: `app/src/ui/wayMapView.tsx`, `app/src/ui/wayMapStyle.ts`, `app/src/ui/mapCreditModel.ts`,
`app/tests/waymap_suite.ts`, `app/tests/waymapstyle_suite.ts`, `app/tests/mapcredit_suite.ts`,
`app/tests/virginmanifest_suite.ts`, `app/tests/ui-strings.allow.json`.
OUT (do not touch): `app/assets/ways/*` (files stay on disk, see decision 3), `app/metro.config.js`,
`app/metro.seedRedirect.js`, `app/assets/seed-stubs/*`, `app/tests/seedstubs_suite.ts`,
`app/src/ui/wayMapMath.ts`, `app/src/ui/wayAssetRuntime.ts`, `app/src/ui/wayMapGeo.ts`,
`app/src/store/seed.ts`, every caller of WayMapView, `core/`, IDEAS.md, STATE.md, OPEN-ITEMS.md.

## Target invariants

1. `wayMapView.tsx` has ONE map component (`MapLibreWayMap`), no `PngWayMap`, no `IMAGES`, no
   `require('../../assets/ways/*.png')`, no `mapFailed`/`onMapFailed`, no `imgFailed`, exactly one
   `st.zoomBar`, exactly one `const id = props.wayId;`, exactly one `<Credit rung="maplibre"`, zero
   `<Credit rung="png"`.
2. `ML === null` renders a frame with the badge `map unavailable` and nothing else, on every surface.
3. Style-load failure keeps the MapLibre view and swaps in `offlineMapStyle(t.race.bg)`; the fetched
   patched style always wins once it arrives; the JS fetch retries 3 times (5 s, 15 s, 45 s) while
   mounted and stops.
4. `mapCreditModel.ts` knows one rung; the OSM/OpenMapTiles/OpenFreeMap wording is byte-identical;
   no `Esri`/`HERE`/`Garmin` string remains anywhere in app/src (the imagery is no longer shown).
5. Allow-list: three entries removed, `legacyCount` 33 -> 32, one entry added (`map unavailable`).
6. `ASSETS`/`assetFor` and the `ways.json` import are unchanged; `bundledForSeedMode(SEED_MODE, ...)`
   appears exactly once in the file.

## Steps (anchors by quoted content; line numbers are current-tree approximations)

**Pre-flight.** `cd $HOME/mnt/Qualifire && GIT_OPTIONAL_LOCKS=0 git status --short` (record it; 01-03
are applied, uncommitted). Baseline: `cd app && node --experimental-strip-types tests/run.ts` -> expect
**0 fail / 3 skip**, the total depending on which earlier briefs landed (848 with none, 856 after 01-03,
859 after the flash brief 04 — record what you measure; the deltas below are relative to it); `cd app && ./node_modules/.bin/tsc --noEmit` -> exit 0. Foreground,
`timeout_ms: 180000`. `grep -n "st.zoomBar\|const id = props.wayId;\|<Credit rung=" app/src/ui/wayMapView.tsx`
-> 2 / 2 / 3 hits (two zoom bars, two id assignments, one maplibre + two png credits). If not, STOP.

**Step 1 — tests first (failed-before).**

a. `app/tests/waymapstyle_suite.ts`: change the import line `import { patchMapStyle } from
'../src/ui/wayMapStyle.ts';` to `import { offlineMapStyle, patchMapStyle } from '../src/ui/wayMapStyle.ts';`
and append after the last test:
```ts
test('virgin-cycle22 05: offlineMapStyle is a self-contained background-only style (loads with no network, no sources, no glyphs, no sprite)', () => {
  // The PNG fallback rung is retired; when the online style cannot load this is what the
  // MapLibre view gets, and every local GeoJSON layer (route, gates, trail, rider) draws on it.
  const s = offlineMapStyle('#17171b') as Record<string, unknown>;
  assert(s.version === 8, 'MapLibre style spec version 8');
  assert(JSON.stringify(s.sources) === '{}', 'no sources: nothing to fetch when offline');
  assert(!('glyphs' in s) && !('sprite' in s) && !('name' in s), 'no glyphs/sprite URL, no prose name');
  const layers = s.layers as Array<Record<string, unknown>>;
  assert(Array.isArray(layers) && layers.length === 1, 'exactly one layer');
  assert(layers[0].type === 'background' && layers[0].id === 'background', 'the one layer is a background layer');
  assert((layers[0].paint as Record<string, unknown>)['background-color'] === '#17171b', 'background is the frame colour passed in');
  const other = offlineMapStyle('#FFFFFF') as { layers: Array<{ paint: Record<string, unknown> }> };
  assert(other.layers[0].paint['background-color'] === '#FFFFFF', 'day frame colour goes through unchanged');
});
```

b. `app/tests/waymap_suite.ts`:
   - In the test `'routemap: routeId={null} draws NO route — ...'` replace
     ```ts
       assert(idAssignments.length === 2,
         `expected exactly 2 occurrences of "const id = props.wayId;" (one per rung: MapLibre + PNG), got ${idAssignments.length}`);
     ```
     with
     ```ts
       assert(idAssignments.length === 1,
         `expected exactly 1 occurrence of "const id = props.wayId;" (one rung since virgin-cycle22 05), got ${idAssignments.length}`);
     ```
   - Replace the WHOLE test `'routemap: the MapLibre zoom bar has exactly one compass reset button; the PNG zoom bar has none'`
     (from its `test(` line to its closing `});`, ~:318-338) with:
     ```ts
     test('routemap: exactly one zoom bar (MapLibre) with exactly one compass reset button — the PNG rung is gone (virgin-cycle22 05)', () => {
       // Same static-guard doctrine as the tests above.
       const src = fs.readFileSync(
         path.join(TESTS_DIR, '..', 'src', 'ui', 'wayMapView.tsx'), 'utf8');
       const bars = src.match(/st\.zoomBar\b/g) ?? [];
       assert(bars.length === 2, `st.zoomBar must appear exactly twice (one use + the style definition), got ${bars.length}`);
       const firstZoomBar = src.indexOf('<View style={st.zoomBar}>');
       assert(firstZoomBar >= 0, 'the MapLibre zoom bar <View style={st.zoomBar}> not found');
       const creditTag = src.indexOf('<Credit rung="maplibre"', firstZoomBar);
       assert(creditTag > firstZoomBar, '<Credit rung="maplibre" ...> not found after the zoom bar');
       const mapLibreResets = src.slice(firstZoomBar, creditTag).match(/onPress=\{resetNorth\}/g) ?? [];
       assert(mapLibreResets.length === 1,
         `expected exactly one onPress={resetNorth} in the MapLibre zoom bar, got ${mapLibreResets.length}`);
       // Code tokens only (history comments may still say "PNG rung", see the file header).
       for (const gone of ['PngWayMap', 'setImgFailed', 'setMapFailed', 'onMapFailed', 'const IMAGES', 'MAP IMAGE FAILED', 'needs the tile map', "require('../../assets/ways/", 'rung="png"', 'cropFor(', 'gateTickPx(', 'nearestOnPath(', 'LayoutChangeEvent']) {
         assert(!src.includes(gone), `PNG rung remnant in wayMapView.tsx: ${gone}`);
       }
       assert((src.match(/bundledForSeedMode\(\s*SEED_MODE\b/g) ?? []).length === 1, 'ASSETS is the one remaining bundledForSeedMode(SEED_MODE, ...) site');
       assert(src.includes('offlineMapStyle(t.race.bg)'), 'style-load failure must fall back to offlineMapStyle(t.race.bg)');
       assert(src.includes('onDidFinishLoadingStyle=') && src.includes('onDidFailLoadingMap='), 'both style load callbacks wired on <M.Map>');
       assert(src.includes('>map unavailable<'), 'the ML === null frame carries the map unavailable badge');
     });
     ```
   - In the test `'routemap: map credits are an "i" button, ...'` replace
     ```ts
       assert((src.match(/<Credit rung="png"/g) ?? []).length === 2, 'PNG rung must mount <Credit> in its place frame (virgin-cycle15 brief 12) and its image frame');
     ```
     with
     ```ts
       assert((src.match(/<Credit rung="png"/g) ?? []).length === 0, 'no PNG-rung credit may remain (virgin-cycle22 05)');
     ```
   - Replace the file header lines 4-8 (`* The load-bearing check is cross-language: the PNG is drawn by a Python` ... `* the renderer — must be reproduced by projectToPixel() to sub-pixel accuracy.`) with:
     ```
      * The projection checks are cross-language history: the seed assets' px/py were written by a
      * Python renderer and must still be reproduced by projectToPixel() (wayAssetRuntime.ts builds
      * runtime assets in the same frame). The PNG fallback rung itself was retired in virgin-cycle22 05;
      * the static guards below pin the one remaining (MapLibre) rung.
     ```

c. `app/tests/mapcredit_suite.ts`: change the import to
   `import { creditFor, MAPLIBRE_CREDIT, CREDIT_AUTO_HIDE_MS } from '../src/ui/mapCreditModel.ts';`;
   replace the WHOLE test `'mapcredit: PNG-rung wording is byte-identical and still credits OpenStreetMap contributors'` (:21-27) with:
   ```ts
   test('mapcredit: one rung only — the Esri/HERE/Garmin imagery credit went with the PNG rung (virgin-cycle22 05)', () => {
     const src = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'mapCreditModel.ts'), 'utf8');
     for (const gone of ['Esri', 'HERE', 'Garmin', 'PNG_CREDIT', "'png'"]) {
       assert(!src.includes(gone), `${gone} must be gone from mapCreditModel.ts: nothing displays that imagery any more`);
     }
     assert(src.includes("export type MapRung = 'maplibre';"), 'MapRung is the single tile rung');
   });
   ```
   and add `import * as fs from 'node:fs'; import * as path from 'node:path';` after the doc comment and
   change `import { assert, test } from './lib.ts';` to `import { assert, test, TESTS_DIR } from './lib.ts';`.

d. `app/tests/virginmanifest_suite.ts` :279: replace
   ```ts
     assert(guardHits >= 2, `expected bundledForSeedMode(SEED_MODE, ...) at least twice in routeMapView.tsx, got ${guardHits}`);
   ```
   with
   ```ts
     assert(guardHits === 1, `expected bundledForSeedMode(SEED_MODE, ...) exactly once in wayMapView.tsx (ASSETS; the PNG IMAGES site went with the PNG rung, virgin-cycle22 05), got ${guardHits}`);
   ```
   Do not touch the rest of that test.

e. Run the suite: expect FAILs in exactly these tests (record them): the new waymapstyle test
   (offlineMapStyle not exported -> the suite file fails to load; if the whole runner aborts on the
   import error instead of reporting one FAIL, record that and continue — the import is restored by
   Step 2), `routeId={null} draws NO route`, the new zoom-bar test, the credits test, the new mapcredit
   test, the virginmanifest static guard. Everything else passes.

**Step 2 — `app/src/ui/wayMapStyle.ts`.** Append at the end of the file:
```ts

/** virgin-cycle22 05 (Nathan 2026-10-05, PNG fallback rung retired): the style the
 * tile rung falls back to when the online style cannot be loaded at all (first open
 * with no signal and nothing in MapLibre's own cache). One background layer in the
 * frame colour, no sources, no glyphs, no sprite — loads instantly and offline, and
 * every local GeoJSON source wayMapView.tsx mounts (route line, gates, trail, sector
 * spans, selfs, rider) renders on top of it: the Google Maps / Waze offline look, an
 * empty basemap with the line and the dot still there. No `name` on purpose (the
 * ui-strings scanner would read a hyphenated name as rider prose). Pure. */
export function offlineMapStyle(backgroundColor: string): unknown {
  return {
    version: 8,
    sources: {},
    layers: [{ id: 'background', type: 'background', paint: { 'background-color': backgroundColor } }],
  };
}
```

**Step 3 — `app/src/ui/mapCreditModel.ts`.**
- Header comment: replace `* (OpenStreetMap / OpenMapTiles /\n * OpenFreeMap on the tile rung, Esri/HERE/Garmin + OSM on the PNG rung)` with
  `* (OpenStreetMap / OpenMapTiles /\n * OpenFreeMap on the tile rung — the PNG rung and its Esri/HERE/Garmin credit were\n * retired in virgin-cycle22 05)`.
- `export type MapRung = 'maplibre' | 'png';` -> `export type MapRung = 'maplibre';`
- Delete the block `/** PNG fallback rung. Drawn as an overlay ... */\nexport const PNG_CREDIT = 'Esri, HERE, Garmin, © OpenStreetMap contributors';` (:16-19, four lines).
- Delete the `png: { ... },` entry of `CREDITS` (:33-39, seven lines). `MAPLIBRE_CREDIT`, the maplibre rows and `creditFor` stay byte-identical.

**Step 4 — `app/src/ui/wayMapView.tsx`.** In this order (top to bottom; re-grep each anchor):

4a. Header comment: replace lines 2-7 (`* The live route map (B-50, Nathan 2026-08-17). MapLibre + real tiles is the` through `* rung itself (`imgFailed`) for when even the bundled image is unavailable.`) with:
```
 * The live route map (B-50, Nathan 2026-08-17): MapLibre + real tiles. The
 * pre-rendered PNG compositor that used to be the fallback rung (and its
 * draw-the-line-as-segments sub-rung) was retired in virgin-cycle22 05 (Nathan
 * 2026-10-05): offline the map now behaves like Google Maps / Waze — the style
 * falls back to a bundled background-only style (wayMapStyle.ts
 * offlineMapStyle) and the route line, gates, trail and rider dot still draw
 * on it; a missing native module shows one `map unavailable` badge. Mentions
 * of "the PNG rung" further down this file are history, kept as written.
```
4b. Imports: `import { Image, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';`
-> `import { Pressable, StyleSheet, Text, View } from 'react-native';`
`import { cropFor, gateTickPx, offWayM, projectToPixel, type WayAsset } from './wayMapMath.ts';`
-> `import { offWayM, type WayAsset } from './wayMapMath.ts';`
In the wayMapGeo import block remove `nearestOnPath, ` from the line
`  gateHalfLenM, gateTicksFeatureCollection, metresBetween, nearestOnPath, riderFeature, rotateEnabledFor, wayBounds,`.
`import { patchMapStyle } from './wayMapStyle.ts';` -> `import { offlineMapStyle, patchMapStyle } from './wayMapStyle.ts';`

4c. The `ML` comment (:133-139): replace `// then falls back to the PNG rung, and Fast Refresh keeps working, never a` / `// red screen. Build 4 (the dev-client rebuild, 2026-08-17) makes ML real;` / `// once it's on the phone this try/catch (and the PNG rung) can eventually` / `// retire.` with
```
// then renders one `map unavailable` badge (virgin-cycle22 05; the PNG rung
// that used to take over is retired), and Fast Refresh keeps working, never a
// red screen. Build 4 (the dev-client rebuild, 2026-08-17) made ML real on
// every build since; this try/catch is the last guard for an old dev client.
```
4d. Delete the `IMAGES` block: the comment `/** WP-E: same guard as ASSETS — a virgin build has no route PNGs either;` / ` * the PNG rung then draws `asset.path` (its existing no-image fallback). */` and the five lines `const IMAGES: Record<string, number> = bundledForSeedMode(SEED_MODE, {` ... `});` (:169-175). Keep the blank line + `/** Beyond this the rider is drawn as off-route ... */ const OFF_WAY_M = 120;` after it.

4e. Add, right after `const BEARING_MIN_MOVE_M = 8;` (:199):
```ts

/** virgin-cycle22 05: the style fetch retries while this map is mounted, so a
 * map opened with no signal picks the real (patched) style up when the
 * connection returns. Three attempts after the first, then it stops; a
 * remount (next tab visit, next ride) starts over. */
const STYLE_RETRY_MS: readonly number[] = [5000, 15000, 45000];
```

4f. `WayMapView` (:292-296): replace the whole function with
```tsx
export default function WayMapView(props: WayMapProps) {
  const { t } = useTheme();
  if (ML === null) {
    // virgin-cycle22 05: no native module = no map renderer at all (the PNG
    // rung that used to take over is retired). One honest badge, nothing drawn.
    const h = props.height ?? 190;
    return (
      <View style={[
        st.frame,
        props.fill ? { flex: 1, alignSelf: 'stretch' } : { height: h },
        { backgroundColor: t.race.bg, borderColor: t.cardBorder },
      ]}>
        <Text style={[st.badge, { color: t.textDim, backgroundColor: t.race.card }]}>map unavailable</Text>
      </View>
    );
  }
  return <MapLibreWayMap {...props} maplibre={ML} />;
}
```
4g. `Credit` doc comment: `/** Shared by both rungs. virgin-cycle14 brief 05 (Nathan #8, tester` -> `/** virgin-cycle14 brief 05 (Nathan #8, tester` (the rest of that comment unchanged).

4h. `MapLibreWayMap` signature (:357-361): replace
```ts
function MapLibreWayMap(props: WayMapProps & {
  maplibre: NonNullable<typeof ML>;
  onMapFailed: () => void;
}) {
  const { maplibre: M, onMapFailed } = props;
```
with
```ts
function MapLibreWayMap(props: WayMapProps & { maplibre: NonNullable<typeof ML> }) {
  const { maplibre: M } = props;
```
4i. Style effect (:471-497). Replace the comment + state + effect + `mapStyle` block, from the line
`  // Runtime style patch (design contract B): fetch the online style once,` down to and including
`    : styleUrl;` (the end of `const mapStyle = ...`), with:
```ts
  // Runtime style patch (design contract B): fetch the online style once,
  // memoize BOTH a labels-on and a labels-off copy. Until it arrives (or if
  // it never does) the native view is handed the plain styleUrl and loads it
  // itself — from MapLibre's own cache when offline, which is why a region
  // seen before stays detailed with no signal.
  // virgin-cycle22 05 (Nathan 2026-10-05, PNG rung retired): if the NATIVE
  // load fails too (onDidFailLoadingMap before any onDidFinishLoadingStyle —
  // first open with no signal, nothing cached) the view keeps running on
  // offlineMapStyle(): an empty basemap in the frame colour on which every
  // local source below (route, gates, trail, spans, selfs, rider) still draws.
  // The fetch retries (STYLE_RETRY_MS) so the real style takes over when the
  // connection returns; patchedStyles always wins once set.
  const [patchedStyles, setPatchedStyles] = useState<{ labelsOn: unknown; labelsOff: unknown } | null>(null);
  const [styleFailed, setStyleFailed] = useState(false);
  const styleLoadedRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    setStyleFailed(false);
    styleLoadedRef.current = false;
    const attempt = async (n: number) => {
      try {
        const res = await fetch(styleUrl);
        const json: unknown = await res.json();
        if (cancelled) return;
        setPatchedStyles({
          labelsOn: patchMapStyle(json, { hideLabels: false }),
          labelsOff: patchMapStyle(json, { hideLabels: true }),
        });
      } catch {
        // offline or the server is down: native keeps whatever it has; retry.
        if (cancelled || n >= STYLE_RETRY_MS.length) return;
        timer = setTimeout(() => { timer = null; void attempt(n + 1); }, STYLE_RETRY_MS[n]);
      }
    };
    void attempt(0);
    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, [styleUrl]);
  const hideLabels = !unlocked;
  const mapStyle = patchedStyles
    ? (hideLabels ? patchedStyles.labelsOff : patchedStyles.labelsOn)
    : styleFailed ? offlineMapStyle(t.race.bg) : styleUrl;
```
4j. `<M.Map>` props: replace the single line `        onDidFailLoadingMap={onMapFailed}` with
```tsx
        onDidFinishLoadingStyle={() => { styleLoadedRef.current = true; }}
        onDidFailLoadingMap={() => { if (!styleLoadedRef.current) setStyleFailed(true); }}
```
(`onDidFinishLoadingStyle` and `onDidFailLoadingMap` both exist on the installed
`@maplibre/maplibre-react-native` 11.3.6 `Map` props — verified in
`node_modules/@maplibre/maplibre-react-native/lib/typescript/commonjs/components/map/Map.d.ts:405,433`.)

4k. Delete the PNG rung: everything from the line `// ------------------------------------------------------------------ PNG rung`
(:945) down to and including the closing `}` of `PngWayMap` (:1165, the line before the blank line that
precedes `const st = StyleSheet.create({`). Leave exactly one blank line between the MapLibre rung's
closing `}` and `const st = StyleSheet.create({`.

4l. `st`: delete the line `  dot: { position: 'absolute', width: 14, height: 14, borderRadius: 14, borderWidth: 2 },` and the
three comment lines above it (`  // WP-E: gate ticks are drawn as inline-styled bars (rotation/length vary` / `  // per gate) rather than a shared style — st.gate (the old fixed 12x12` / `  // circle) is gone.`).

4m. Check: `grep -n "LayoutChangeEvent\|cropFor(\|gateTickPx(\|nearestOnPath(\|const IMAGES\|PngWayMap\|setImgFailed\|setMapFailed\|onMapFailed\|st.dot\|rung=\"png\"" app/src/ui/wayMapView.tsx`
-> 0 hits. `grep -n "IMAGES\|projectToPixel\|PNG rung" app/src/ui/wayMapView.tsx` -> hits only inside the historical
comments (header lines ~10 and ~68, the props docs, the layer comments) — fine, per the header note; do not edit them.

**Step 5 — `app/tests/ui-strings.allow.json`.**
- Remove the three whole objects for `"file": "src/ui/wayMapView.tsx"` with `"text"`: `"MAP IMAGE FAILED — drawing the line"` (the one with `"legacy": true, "violates": ["em-dash"]`), `"map needs the tile map"`, `"place map needs the tile map"`. Keep the JSON valid (neighbouring commas).
- Header: `"legacyCount": 33` -> `"legacyCount": 32` (one legacy entry removed; the suite's legacy-count rule).
- Append ONE entry at the end of `"entries"` (after the last object, keep the array valid):
```json
    {
      "file": "src/ui/wayMapView.tsx",
      "kind": "text",
      "text": "map unavailable",
      "reason": "virgin-cycle22 05: the only thing shown when the MapLibre native module is missing (PNG rung retired); Nathan owns the wording",
      "since": "2026-10-05",
      "by": "virgin-cycle22 05"
    }
```
15 chars, no em dash, not a banner (it is the existing `st.badge` slot). Report in your final message:
"removed 3 entries (MAP IMAGE FAILED, map needs the tile map, place map needs the tile map), legacyCount
33->32, added 1 entry: wayMapView.tsx text 'map unavailable'".

**Step 6 — run everything.** Tests: every test from Step 1e now passes; totals = baseline **−1 (mapcredit
PNG test replaced 1:1 = 0) +1 (waymapstyle) = baseline + 1** (e.g. 860 / 857 / 0 / 3 on the post-04 tree; 857 / 854 / 0 / 3 if only 01-03 landed;
849 / 846 / 0 / 3 if none). The ui-strings suite is green (no UNLISTED, STALE,
LEGACY-COUNT). tsc exit 0. `git diff --stat`: exactly the 8 files in Scope IN beyond the pre-existing
modifications.

## Failed-before procedure (never git stash)
Step 1e is the failed-before record. To re-prove later: `cp app/src/ui/wayMapView.tsx
safe_to_delete/wayMapView.c22-05.bak`, re-insert a line `// const IMAGES = 1; PngWayMap` anywhere, run
(the zoom-bar test FAILs on the remnant check), restore with `cp` and `cmp`.

## Verification (the inspector reruns all of it)
- Tests 0 FAIL with counts; tsc exit 0.
- `grep -c "st.zoomBar" app/src/ui/wayMapView.tsx` -> 2 (one use, one style definition).
- `grep -n "const id = props.wayId;" app/src/ui/wayMapView.tsx` -> 1 hit.
- `grep -rn "Esri\|PNG_CREDIT\|'png'" app/src app/tests --include=*.ts --include=*.tsx` -> 0 hits
  (the only pre-brief hits were mapCreditModel.ts, wayMapView.tsx, mapcredit_suite.ts, waymap_suite.ts).
- `grep -rn "assets/ways/.*\.png\|Morning.png" app/src` -> 0 hits (the PNGs are no longer required by any
  module; `app/metro.seedRedirect.js` and `tests/seedstubs_suite.ts` still name them — expected, untouched).
- `ls app/assets/ways` -> the four files are still there (decision 3); `git status` shows none of them.
- `grep -n "offlineMapStyle" app/src/ui/wayMapView.tsx app/src/ui/wayMapStyle.ts` -> import + one call site + the export.
- `grep -n "legacyCount" app/tests/ui-strings.allow.json` -> 32; `grep -c '"legacy": true' app/tests/ui-strings.allow.json` -> 32.
- `git diff app/metro.config.js app/metro.seedRedirect.js app/tests/seedstubs_suite.ts app/src/ui/wayMapMath.ts app/src/ui/wayAssetRuntime.ts` -> empty.

## Added visible text
`map unavailable` (wayMapView.tsx, text, 15 chars — the ML === null frame). Removed: `MAP IMAGE FAILED —
drawing the line` (legacy, em-dash), `map needs the tile map`, `place map needs the tile map`. Unchanged:
`OFF ROUTE · >120 m from the route line`, `waiting for GPS`, `FIT`, `ME`, the credit strings.

## What changes on the phone / what does not
**OTA-safe, no new build:** this brief touches only JS/TS and removes three `require()`d PNG assets
from the JS bundle. Assets referenced from JS ship with the OTA bundle, not with the native fingerprint
(`runtimeVersion.policy: "fingerprint"` hashes native code, package.json dependencies and the app config —
none change here; the Preview build already shipped empty stub PNGs via the Metro seed redirect, so its
asset set shrinks by three 70-byte stubs). Publish with `publish-preview.ps1` as in COMMANDS.md § 1.
Changes: with no connection on a never-seen region (or a first open with no signal) the map frame shows
the empty basemap in the frame colour with the yellow route line, white gate ticks, your trail, selfs and
the blue dot — not a stub image, not a "MAP IMAGE FAILED" badge; when the signal returns within ~1 min
the real map tiles appear by themselves (today they do not until you leave the screen). Regions MapLibre
has cached still show their tiles offline exactly as before. If the app were ever run on a build without
the MapLibre module, the map card shows only `map unavailable`.
Does NOT change: anything online; zoom bar, FIT/ME, compass (06 is the bar change); the "i" credit (same
OSM/OpenMapTiles/OpenFreeMap wording); any stored data; ROUTES/ACTIVITIES maps online; DEMO.

## Out of scope (do not do)
- Moving/deleting `app/assets/ways/*.png`, editing `metro.seedRedirect.js`/`seedstubs_suite.ts` (decision 3).
- Removing `cropFor`/`gateTickPx`/`Crop` from wayMapMath.ts and their tests (decision 6).
- Any zoom-bar change (brief 06), any offline tile pack / ambient-cache configuration, any badge for the
  offline style (decision 1).
- IDEAS.md, STATE.md, OPEN-ITEMS.md, other briefs. The coordinator updates STATE.md:85 ("**Maps:** MapLibre
  + OpenFreeMap live on every screen including the live ride.") with one clause: "— the PNG fallback rung was
  retired in virgin-cycle22 05; offline = empty basemap + local layers (wayMapStyle.ts offlineMapStyle)".

## D9 digest errata found by Plan (for the record; the brief above uses the verified facts)
- D9 §2: "`offWayM` imported but never called" is WRONG — `MapLibreWayMap` calls it (:585) and the PNG rung did too (:1025). It stays.
- D9 §2: `gateTickPx` "imported, never used" is WRONG — the PNG rung used it (:1102). It becomes unused by app code after this brief (kept in wayMapMath.ts, decision 6).
- D9 §6: STATE.md has 474 lines; the PNG rung is not documented at "~520-527". The only live-doc line is STATE.md:85 ("Maps:"). `wayAssetRuntime.ts`/`gateAdjustCard.tsx`/`demoWayFixture.ts`/`resultsPlot.tsx`/`wayMapGeo.ts` mention the PNG rung in comments only (left as history).
- D9 §3: "No generator script found" is right for the live tree (`08_build_route_assets.py` only exists under `safe_to_delete/virgin-branch-cut-20260831/`).
- D9 §5 omitted that the `MAP IMAGE FAILED` allow-list entry is `legacy: true`, so `legacyCount` must drop to 32.
- D9 did not note that `virginmanifest_suite.ts`'s static guard filters `rel !== 'ui/routeMapView.tsx'` (an old filename) and that its comment stripper eats the file up to the first inline `{/* */}` — the offender check passes vacuously today. Not fixed here (unrelated); listed for the coordinator as a follow-up.

## Decisions taken by the Plan tier (logged, not asked)
1. Style-load failure -> a bundled background-only style object (`offlineMapStyle`), NOT a blank frame with
   a badge: the local GeoJSON layers are style-independent (verified § 0), so the line/gates/trail/rider
   render on it — exactly the Google Maps / Waze behaviour Nathan described. No "offline" badge: the
   `st.badge` slot is already shared by OFF ROUTE and `waiting for GPS`, and an empty basemap is the honest
   state in itself. Native module missing -> frame + `map unavailable` (one new string): without MapLibre
   nothing can be drawn, and a dev-client-only case does not justify a second renderer.
2. Recovery when the connection returns falls out of the design: `patchedStyles` always wins over the
   offline style, so the only thing needed is for the fetch to try again — three bounded retries
   (5/15/45 s) per mount, nothing periodic. The sticky `mapFailed` flag is removed with the rung;
   `styleFailed` lives inside the MapLibre component and resets on a theme (styleUrl) change. The
   `onDidFinishLoadingStyle` guard makes sure a late `onDidFailLoadingMap` (e.g. after the cached style
   already loaded offline) can never replace cached tiles with the empty style.
3. The three PNGs, `ways.json`, the Metro seed redirect, the stubs and `seedstubs_suite.ts` are untouched:
   `ways.json` still feeds `ASSETS` (shipped-build route geometry); the PNGs are simply no longer
   `require()`d, so Metro never bundles them, and the redirect entries become inert. Moving the files
   would mean editing the delicate virgin-cycle19 stub table and its suite for no byte saved on the
   Preview build. Follow-up (coordinator): drop the three PNG rows from `SEED_FILES`/`SIX` and move the
   files to `safe_to_delete/` in a later chore, with a build-size check.
4. Esri/HERE/Garmin credit removed: the PNGs were the only imagery from those providers (grep), and a
   credit for imagery that is never displayed would be as wrong as a missing one. OSM/OpenMapTiles/
   OpenFreeMap wording byte-identical (licence). `MapRung`/`creditFor` kept (single member) so `<Credit
   rung="maplibre">` and its test stay as they are.
5. The ML === null frame uses `useTheme()` in the wrapper (unconditional hook, then the branch) and
   renders on every surface, browse included — a blank card is less honest than a badge.
6. `cropFor`, `gateTickPx`, `Crop` stay in wayMapMath.ts with their tests: pure, cheap, and
   `wayAssetRuntime.ts` still builds runtime assets in the same px frame; deleting tested math to save
   40 lines is not worth an anchor risk in a file this brief otherwise never opens.
7. Historical comments elsewhere that say "the PNG rung ignores it / has no equivalent" are left as
   written, with one header sentence declaring them history — a 20-site comment sweep is where
   stop-on-ambiguity executors stall.
