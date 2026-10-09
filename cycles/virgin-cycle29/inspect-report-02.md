# inspect-report-02 — virgin-cycle29 brief 02 (snapshot probe) — INSPECT tier (fresh-context Opus), 2026-10-10

## Verdict
**PASS WITH NOTES. Safe to ship OTA (JS only): YES.** When the probe is off (the default), runtime behaviour is unchanged. The extraction is byte-equivalent. Nothing native or config changed. However, two MAJOR findings mean the ON-DEVICE PROBE can give a false FAIL, or a FAIL with no clear cause. Fix M1 and M2 before Nathan runs the probe (cheap, JS only), or hand him the caveats below with the OPEN-ITEMS line. M1 is a hard prerequisite for brief 04.

## Checks rerun (by me, on the real tree)
- `node --experimental-strip-types tests/run.ts`: **990 tests: 987 pass, 0 fail, 3 skip**.
- `./node_modules/.bin/tsc --noEmit`: **exit 0**, no output. `exec-02-tsc.log` is 0 bytes.
- `git status --short`: brief-02 files = wayMapView.tsx, activityCard.tsx, RidesScreen.tsx, storage/fsAdapter.ts, storage/expoFsAdapter.ts, tests/{run,waymap_suite,storage_suite,replay_suite,selfrace_suite}.ts, tests/ui-strings.allow.json; new wayMapLayers.ts, cardSnapshotModel.ts, cardSnapshotQueue.ts, tests/cardsnapshot_suite.ts. All other modified files belong to brief 01: catalogMapView.tsx, mapCover.tsx, mapCoverModel.ts, feedmodel_suite.ts, mapcover_suite.ts, and these hunks: wayMapView `setStyleFailed(false)`, `cachedPatchedStyles(styleUrl)` rung, first-frame wiring; RidesScreen threshold 40 / windowSize 3 / initialNumToRender 2; activityCard MAP_MOUNT_RADIUS 0; waymap_suite:425. No file outside the amended list.
- Native/config: no hunk under app/modules, app.json, app.config.js, package.json, eas.json. App.tsx and GateAdjustScreen.tsx untouched.
- Allow-list: `git diff --numstat` = 72 added, 0 removed. These are exactly the 9 ruled entries, all `kind: literal`, since 2026-10-10, by "Sonnet execute, virgin-cycle29 brief 02":
  - src/ui/cardSnapshotQueue.ts "mapsnaps/index.json" ("...relative path of the snapshot cache index under the storage root, never shown as text")
  - src/ui/wayMapLayers.ts "gate-ticks", "gate-ticks-casing", "route-casing", "route-core", "sector-spans", "sector-spans-core", "trail-casing", "trail-core" ("...MapLibre layer/source id of the card layer stack (same id as wayMapView.tsx), never shown as text")
  The whole file is still sorted by (file, kind, text) (python check: True, 442 entries). No existing entry was changed. No rider-visible string was added. The title `Activities` is unchanged; it is only wrapped in a Pressable. The probe logs use single words only.
- expo-file-system importers under src/: storage/expoFsAdapter.ts and ui/themeContext.tsx. The second one is pre-existing and was ruled out of scope. None of the 3 new modules imports it.

## Substance
1. **Extraction parity — OK.** I diffed against HEAD wayMapView.tsx. Every one of the 7 paints and all layouts are key-for-key and value-for-value the old inline literals:
   - casing 7/5 with CASING `#14120C`, cores 4 with colors.neutral
   - sector `['case',['has','colour'],['get','colour'],'rgba(0,0,0,0)']`
   - ticks colour/white and width 3/2
   - faint `['case',['has','faint'],FAINT_OPACITY,1]` on route-casing, route-core, sector-spans-core, gate-ticks-casing, gate-ticks
   - trail paints have no opacity, as before
   - ROUND_LINE on route/trail/spans, ROUND_CAP on both tick layers

   The JSX layer ids and source ids are unchanged. `cardLayerSpecs()` order and source mapping equal the view's mount order. `as const` and `as never` are type-only, so runtime is identical. I checked MLRN 11.3.6 `Layer.tsx`/`StyleValue.transformStyle`: it builds a new native object and never mutates `paint`, so sharing one constant object across every mounted map, and JSON-stringifying it for the snapshotter, is safe.
2. **Reachability — OK.** `probe` starts false. The only setter is the title long-press (RidesScreen.tsx:260, 600 ms). When probe is off the effect sets `probeUri` null. Cards with index > 0 get `null`, and the `snapshotUri` prop is optional (undefined). `typeof … === 'string'` is false for both, so the card renders exactly today's tree (activityCard.tsx:87-105).
3. **One createImage in flight — OK.** There is a promise chain (cardSnapshotQueue.ts:88/98), a rejection does not break the chain, and requests are deduplicated by key. A rejected request leaves `probeUri` null, so the live map stays and nothing crashes. **But see M1: a native error never rejects.**
4. **cardSnapshotModel — OK.**
   - Key = the brief formula. Every field changes the key, and colours are ignored when the toggle is off.
   - File name = two FNV-1a32 hashes, 8 hex each.
   - I recomputed the four zoom values by hand in python: 13.40397 / 12.75190 / 12.91697 / 13.04260. All match.
   - `paddedBoundsFor` expands in Mercator px at the fit zoom, symmetrically. The limiting axis therefore spans exactly the slot, and the centre equals the live fitBounds centre.
   - Output is `[w,s,e,n]` flat, which matches the native `LatLngBounds.from(arr[3],arr[2],arr[1],arr[0])` = (N,E,S,W).
   - Style builder: deep copy, the 4 sources always present (empty when null), the 7 layers appended last.
   - Theme: styleUrl comes from `mode === 'night'`, the same rule as wayMapView.tsx:410. Sector toggle: colours/ALL_YELLOW and lead grey mirror activityCard.
   - Draw parity with the live card: `routeRunsFeatureCollection(asset,null)`, ticks with gateColours undefined and faint undefined, spans with faint undefined, and the trail with no tail.
5. **StaticMapImageManager API — OK, with M1.**
   - `createImage({mapStyle,width,height,bounds,output})`: JS stringifies an object style, and native uses `Style.Builder().fromJson`, so inline GeoJSON sources are accepted.
   - width/height are read as `getDouble(...).toInt()` and pixelRatio = density, so the values are dp.
   - The result is a `file://` cache-dir PNG.
   - The module is `TurboModuleRegistry.getEnforcing` and is exported from index.ts:160, so it is in the installed build (the library would not load at all otherwise).
6. **FsAdapter — OK.**
   - Expo `importFile`: ensureRoot, create the parent dir, delete dest if present, then `await new File(src).move(dest)`. `move` is async in expo-file-system 56.0.9.
   - Expo `fileUri` = `fileAt(rel).uri`.
   - Memory adapter as briefed.
   - The `throwingFs` stubs in replay/selfrace are unreachable.
7. **Mutate-reasoning.**
   - Key test fails if any field is dropped from the key.
   - File-name test fails if the hash shape changes.
   - fitZoom test fails on any formula change (hand constants).
   - paddedBounds test fails if the padding is not applied (110 px ≠ 150).
   - Style test fails if the deep copy, source order or layer order is lost.
   - Parity test fails if an id is reordered or a paint is inlined again.
   - Wiring pins fail if the Image ternary or the long-press is reverted.
   - Storage case fails if the memory importFile is reverted.
   - Weak pins: see m4.

## Findings

### MAJOR
- **M1 — a snapshotter error hangs the queue forever.** Location: `node_modules/@maplibre/maplibre-react-native/android/.../MLRNStaticMapModule.kt:71-74` together with `app/src/ui/cardSnapshotQueue.ts:68-74,88`.
  - What the native code does: its error callback only calls `Log.w` and removes the snapshotter. It **never rejects the promise**. Examples of errors: style or glyph or sprite load failure, a bad style JSON, or `fromUri(json)` when `isJSONValid` is false.
  - Effect on the queue: the `createImage` await never settles, and `[snap] failed` is never logged. Because the queue is a single chain with key dedup, every later request blocks behind it until the app is killed. That includes the other theme or toggle states and re-presses of the same key.
  - What the probe then shows: on device it reads as "nothing happens", with no log. Nathan cannot tell "snapshotter broken" from "slow" from "queue stuck". After one hang, the remaining states give false FAILs.
  - Minimal fix: in `make()`, `Promise.race` the `createImage` call against a JS timeout (e.g. 8 s → `Error('timeout')`), so that the chain advances and the failure is logged.
  - **Hard requirement for brief 04.** A hung key would otherwise freeze every card on its placeholder, because only *failure* falls back to the live map.
- **M2 — the probe's PASS criterion is unachievable as written: the live card has a visible "i" credit button, the picture does not.** Location: `wayMapView.tsx:1072` (`<Credit rung="maplibre" …/>`, always rendered; its doc at :359-360 says MapLibre attribution is off, so this is the *only* map-data credit) versus `activityCard.tsx:87-89` (the Image replaces the whole WayMapView, credit included).
  - Probe impact: Nathan will see a difference in all four states, which is a false FAIL against "you cannot tell them apart".
  - Brief 04 impact: snapshot cards would drop the licence credit for OSM/OpenFreeMap data.
  - Fix for the probe: tell Nathan in the OPEN-ITEMS line to ignore the "i" button.
  - Fix for brief 04 (Plan tier): render the Credit overlay on top of the snapshot Image. This is a design call.

### MINOR
- **m1 — measured delay can come from a cache hit, not a real make.** Location: cardSnapshotQueue.ts:62-63 and :79. A cache hit (memory or `mapsnaps/index.json`, which persists across launches) returns at once, with no `[snap] made` log. Only the FIRST long-press per state on a given install measures make-time. If Nathan ever re-tests, the felt delay is the cache, which risks a false PASS on the ≤1.5 s criterion. Fix: add this to the OPEN-ITEMS line, or log `[snap] hit`.
- **m2 — a stale picture can show while a new one is pending or after a failure.** Location: RidesScreen.tsx:204-236. The effect does not clear `probeUri` when it re-runs for a new input (theme flip by schedule while on ACTIVITIES, Refresh making a new card 0, or a rotation-free width change). The OLD picture stays on card 0 while the new one is pending, and stays indefinitely if the new one fails or is gated. Manual theme or toggle changes go through SETTINGS, which unmounts RidesScreen (App.tsx tab swap) and resets the probe, so Nathan's normal flow is not affected. Fix: `setProbeUri(null)` at the top of each probe run.
- **m3 — fractional width is truncated natively.** Location: RidesScreen.tsx:231 + MLRNStaticMapModule.kt:81. `widthDp: winW` can be fractional (e.g. 392.73) and native does `.toInt()`. The image is then ≤1 dp narrower than `paddedBoundsFor` assumed, and `resizeMode="cover"` rescales it by ~0.2%. This is sub-pixel softness or framing, not visible in practice. Fix for brief 04: `Math.floor(winW)` in both the bounds maths and the request.
- **m4 — weak pins.** Location: cardsnapshot_suite.ts:95-117.
  - The parity test pins ids, order and constant usage in the view, but not each spec's `source`/`layout` against the view. If `cardLayerSpecs()` gave gate-ticks ROUND_LINE, or trail-casing the source `route`, no test would fail. I verified by hand that they match today.
  - The gate pin `q.includes('getStatus().session === null')` still passes if the `throw` on line 67 is deleted.
  - Queue serialisation and dedup are pinned only by strings, not by behaviour.
  - Brief 04 should add a behavioural queue test with an injected createImage/fs.
- **m5 — swapping to the picture can flash the placeholder colour.** Location: activityCard.tsx:87-89. The WayMapView unmounts in the same render that the Image mounts, and Fresco decodes the file asynchronously. One or more frames of the frame-colour placeholder may show on the swap. This does not matter for the A/B probe. Brief 04's fade-in design covers it.
- **m6 — small native leak (no JS impact).** On the native `result == null` path the snapshotter is never removed from `snapshotterMap`.

## Cannot be verified off-device
- Whether MapSnapshotter renders (glyphs, sprite, tiles) and how long it takes. This includes whether it completes or errors when a tile is offline (M1 matters exactly here).
- Label placement and collision parity between the live viewport and the snapshot.
- That `Options(width,height)` × pixelRatio gives a bitmap as crisp as the live view.
- That Fresco shows a `file://` PNG from documentDirectory with no flicker.
- That `File.move` from cacheDir to documentDirectory succeeds on Nathan's phone.
- That the live fit zoom equals `fitZoomFor` to within tick-length tolerance.

## Re-inspect after fixes — 2026-10-10 (scope: ruling-02-inspect-fixes.md diff only)
**Verdict: PASS. Safe to ship OTA (JS only): YES.** M1 and M2 are closed. m1, m2, m3 and the gate half of m4 are closed. As ruled, the rest of m4 and all of m5 are deferred to brief 04, and m6 is native (nothing to do).

Rerun myself:
- **Tests:** `node --experimental-strip-types tests/run.ts` gives **991 tests: 988 pass, 0 fail, 3 skip**.
- **tsc:** `tsc --noEmit` exits 0.
- **Allow-list:** `git diff --numstat` is still 72 added / 0 removed, i.e. the same 9 ruled entries.
- **Touched files:** the same set as before. No new file, nothing native or config.

Checked against the ruling:
- **M1, the timeout:**
  - `withTimeout` (cardSnapshotModel.ts, end of file) clears its timer on settle. It rejects with `Error('timeout')` after `ms`.
  - A late result reaches a promise that has already rejected, so it has no effect. No `importFile`, no `known.set`, no index write, no log.
  - `SNAPSHOT_TIMEOUT_MS = 10000`.
  - cardSnapshotQueue.ts:68-74 wraps the single `createImage` call in it. A timeout then follows the existing rejection path: the pending key is deleted, `[snap] failed <key> timeout` is logged, and `chain = p.catch(...)` moves the queue on.
  - The new test would fail if `withTimeout` were removed or broke. The wiring pin now requires `withTimeout(ML.StaticMapImageManager.createImage(` and `SNAPSHOT_TIMEOUT_MS)`.
- **M2, the credit button:**
  - activityCard.tsx:87-93 renders `<Credit rung="maplibre" locked={false} />` after the Image, so it sits on top.
  - `locked={false}` equals the live browse card's `creditLocked`, because wayMapView.tsx:434 is false unless the variant is `live`.
  - Geometry: the `creditBtn` style is absolute `right: 6, bottom: 6`, 22×22 (wayMapView.tsx:1101-1103). Its positioning parent is `st.mapSlot` (150 dp tall, full card width). That matches the live `frameBleed` frame (stretch, `height: h`), so the "i" lands on the same pixels.
  - No new string: `Credit` carries its own text. The pin checks that the Credit comes after the Image.
- **m1:** `[snap] hit` is logged on a cache hit (queue line 63).
- **m2:** `setProbeUri(null)` now runs at the start of every probe run (RidesScreen.tsx:206).
- **m3:** `const widthDp = Math.floor(winW)` is used for `fitZoomFor`, for the request's `widthDp`, and for `paddedBoundsFor`. No raw `winW` is left in the maths. `winW` stays in the effect's dependencies.
- **m4 (gate half):** the pin now requires `if (!idle) throw new Error('gated')`.
- **Probe reachability:** unchanged. It is still reached only by the title long-press (`delayLongPress={600}`), card 0 only, with `snapshotUri` absent or null elsewhere.

New findings:
- **MINOR n1:** when the sources card is open, its geometry differs slightly between the picture and the live map.
  - `creditCard` is `bottom: 32` with `maxWidth: '85%'`.
  - Live, it sits inside `frameBleed`, which has `overflow: 'hidden'`. Over the picture, its parent is `st.mapSlot`, which has no `overflow: 'hidden'`.
  - With the 150 dp slot, the card would only spill above the map if its text ran past ~118 dp tall. That is unlikely with today's credit rows (mapCreditModel), so nothing is visible in practice.
  - Brief 04 can add `overflow: 'hidden'` to `mapSlot` if a snapshot card ever shows the open sources card clipped differently.
- No other new findings. Still not verifiable off-device: the snapshotter render itself, whether the 10 s budget is enough for a cold first make, and the Credit touch target sitting over an Image inside the block Pressable.
