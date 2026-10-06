# 09 — The map never swaps its style on a mounted native view: key `<M.Map>` on the style RUNG, not just the URL (gates under the line / no line on cold start)

**Source: Nathan, 2026-10-06, on the phone after the cycle-22 OTA (verbatim facts):** on the RECORD tab's
map ONLY the white gates draw BELOW the yellow route line; ROUTES / RESULTS / ACTIVITIES maps are right.
Pressing RECORD (bigger map, correct), then cancel: the idle map now draws gates on top — not a stuck
state. Clear the app, reopen: gates below the line again (first mount after launch). On the very first
launch after the update (cleared twice) the RECORD map showed NO yellow line at all until he visited
another tab with a map and came back. He is ONLINE (start-place auto-detect works). Goal: the RECORD map's
first render after launch is the same as after a remount — line present, gates above it.
Haiku digest D12 (`digests/D12-record-map-cold-start-digest.md`) was read and NOT trusted; its
"offlineMapStyle / no network" story is ruled out below. Written by the Plan tier (Fable) 2026-10-06;
every anchor verified on the committed tree (HEAD `dfbbff8` "vcycle022 execution" — cycle 22 IS
committed, `git status` shows only the D12 digest untracked). Nothing is executed yet.

**Tier:** Execute = Sonnet, alone. STOP-ON-AMBIGUITY (EXECUTOR-RULES.md). JS/TS only, no native change.

## 0. Diagnosis — verified vs inferred

### 0.1 What the code does today (VERIFIED, current tree)
- `app/src/ui/wayMapView.tsx` `MapLibreWayMap`:
  - `:373` `const styleUrl = themeMode === 'night' ? MAP_STYLE_NIGHT : MAP_STYLE_DAY;`
  - `:493-495` `const [patchedStyles, setPatchedStyles] = useState<...>(null); const [styleFailed,
    setStyleFailed] = useState(false); const styleLoadedRef = useRef(false);` then the effect `:496-521`
    (`fetch(styleUrl)` with retries `STYLE_RETRY_MS`, `setPatchedStyles({ labelsOn, labelsOff })`).
  - `:522-525`
    ```ts
      const hideLabels = !unlocked;
      const mapStyle = patchedStyles
        ? (hideLabels ? patchedStyles.labelsOff : patchedStyles.labelsOn)
        : styleFailed ? offlineMapStyle(t.race.bg) : styleUrl;
    ```
  - `:685-690` `<M.Map key={styleUrl} mapStyle={mapStyle as never} style={{ flex: 1 }}
    onDidFinishLoadingStyle={() => { styleLoadedRef.current = true; }}
    onDidFailLoadingMap={() => { if (!styleLoadedRef.current) setStyleFailed(true); }}`.
  - `:407-410` the mode-reset effect `setMode(initialMode)` on `[props.zoom, variant, phaseKey, props.wayId]`.
  - Sources (`:734-926`), in JSX = mount order: `ride-trace`, `route`, `trail`, `sector-spans`, `place`,
    `gate-ticks`, `gate-selected`, `selfs`, `rider` (last, the only conditional one — virgin-cycle21 03).
- So on EVERY mount the `mapStyle` prop starts as the URL string and, when the fetch resolves, becomes
  the patched style OBJECT (JSON.stringified by MapLibre RN `src/components/map/Map.tsx:669-670`), with
  `key={styleUrl}` unchanged -> a PROP update on the mounted native view, not a remount. The same prop
  update happens when `hideLabels` flips (`labelsOn` <-> `labelsOff` are different objects): RECORD's
  `armed` (prestart, labels on) -> `running` (moving, labels off) -> `finished` (labels on) reuse ONE map
  instance (wayMapView.tsx `:459-467` "React REUSES the same component instance across the
  prestart->moving transition"). This string->object swap predates cycle 22 (B-51); cycle 22 05 only
  added the `offlineMapStyle` branch and the retry.

### 0.2 What the native side does with a `mapStyle` prop change (VERIFIED in
`app/node_modules/@maplibre/maplibre-react-native` 11.3.6, Android Kotlin — the phone's platform)
- `components/mapview/MLRNMapView.kt:762-784` `setReactMapStyle`: if the map object already exists
  (`mapLibreMap` is set in `onMapReady` `:416-417`) it calls `removeAllSourcesFromMap()`, then
  `map.setStyle(json-or-uri) { addAllSourcesToMap() }`.
- `:1433-1451`: both helpers iterate `sources.keys` — and `sources` is a plain `HashMap()` (`:129`,
  `:369`). A Java HashMap iterates by bucket, NOT insertion order. For this file's nine source ids,
  `String.hashCode` spread into the default 16-bucket table gives (computed, deterministic):
  `trail(1), ride-trace(2), gate-ticks(2), gate-selected(2), route(3), selfs(3), place(11), rider(13),
  sector-spans(14)`. Re-adding in that order puts **`route` ABOVE `gate-ticks`** (Nathan's symptom:
  white gates under the yellow line) and **`sector-spans` ABOVE `rider`** (the yellow sector spans at
  width 4 paint over the blue dot on the running map — the very picture Nathan reported on 2026-10-03,
  "my blue live dot was now shown below the WorkZoo yellow line", that virgin-cycle21 03 attributed to
  a late-mounting route source; the always-mount fix does not stop THIS re-ordering).
- `components/sources/MLRNSource.kt:75-98` `addToMap`: layers are re-added from `mLayers` (the
  "switching style url, but keeping layers on map" branch) with `style.addLayer(layer)` = top of the
  stack (`components/layer/MLRNLayer.kt:271`; no `aboveLayerID`/`belowLayerID` is set anywhere in this
  app). `removeFromMap` `:100-120` also **clears `mQueuedLayers`**.
- Window B (the "NO yellow line" case): if the swap arrives after `onMapReady` but BEFORE the first
  (URL) style has finished loading, `removeFromMap` clears each source's queued layers while the
  source itself was never added; when the new style loads, `addQueuedFeatures()` (`:545-565`) adds the
  sources but `mQueuedLayers` is now empty and `mLayers` too -> sources with **no layers at all**, and
  nothing re-adds them until a remount. That is symptom (b): no line, no gates, until a tab switch
  remounts the map.

### 0.3 Why RECORD only, why the first mount after launch (INFERRED timing, consistent with every symptom)
RECORD's setup-phase map (`RecordScreen.tsx:1535`) is the first map mounted after launch. Two requests
for the same style URL race: the native view's own load of `styleUrl` and this component's
`fetch(styleUrl)`. Cold (DNS + TLS + first download) the fetch resolves AFTER `onMapReady` — in window
A (style loaded: HashMap re-add, gates under the line) or window B (style still loading: no layers at
all). Every later mount (RECORD armed via `raceColumn` is a different tree position so it remounts;
ROUTES/RESULTS/ACTIVITIES; coming back to RECORD) gets a warm fetch that resolves before `onMapReady`
(`mapLibreMap` still null -> `setReactMapStyle` only stores the string -> ONE style load with children
added in mount order) — correct. Which window the cold start lands in is luck, which is why the first
launch after the update showed no line and later cold starts showed the wrong order. Online or offline
does not matter: the swap is the fetch SUCCEEDING late, not failing.

### 0.4 Ruled out
- D12's `offlineMapStyle` branch: it needs `onDidFailLoadingMap` before any `onDidFinishLoadingStyle`
  (a style-load failure); Nathan is online and the basemap tiles show. Same mechanism class (a prop
  swap), wrong trigger; the fix below covers it anyway.
- JSX order / cycle-21 03: unchanged between HEAD~1 and HEAD; the order is right on a fresh mount.
- Brief 06 (FIT/ME) and the PNG-rung removal: neither touches keys, sources, or the style props.
- Per-render `offlineMapStyle(...)` object identity: stringified, equal strings are not re-sent (the
  cycle-22 inspector checked this too).
- `aboveLayerID`/`belowLayerID` chains were considered and rejected: they do nothing for window B
  (no layers at all) and would have to be threaded through 14 layers across 9 sources.
- "Do not mount the map until the fetch settles": rejected — offline with a cached region the fetch can
  hang for the OS timeout and the rider would stare at an empty frame; brief 05's "native loads the URL
  from its own cache" path must stay first.

### 0.5 The fix (one rule)
**A mounted native map never receives a different `mapStyle`.** Key `<M.Map>` on the style RUNG —
`url` / `offline` / `labels` / `nolabels` — plus the URL (the cycle-023 day/night remount stays). Every
style change then remounts the native view, whose fresh mount adds children in JSX order (the path that
is right on every screen today). Cost: one extra native-view init per style change (cold start: URL
view, then the patched view; START: labels-off view; finish: labels-on view) — a short reload of the
basemap, which the current prop swap already causes (a full `setStyle`). A remount in `free` mode would
leave the camera at MapLibre's world default, so the mode resets to `initialMode` on every remount.
The rule lives in a pure helper (`wayMapStyle.ts`, headless-tested) so the precedence
patched > offline > url and the key are pinned by a test, and a source guard pins the wiring.

## Scope / non-scope
IN: `app/src/ui/wayMapStyle.ts` (one pure function + type), `app/src/ui/wayMapView.tsx` (the style
selection, the `<M.Map>` key, one reset effect, comments), `app/tests/waymapstyle_suite.ts` (one test),
`app/tests/waymap_suite.ts` (one test modified, one added).
OUT: sources/layers/paint, `cameraTargetFor`, `initialMode`, the retry effect, `offlineMapStyle` itself,
every WayMapView caller, `RecordScreen.tsx`, `core/`, `ui-strings.allow.json` (no change expected),
IDEAS.md, STATE.md, OPEN-ITEMS.md, native code (none needed).

## Target invariants
1. `mapStyle` and the `<M.Map>` `key` are both derived from ONE call `mapStyleFor({...})` (pure); the
   key changes whenever the chosen style changes (rung or URL) and only then.
2. Precedence unchanged: patched (labels on/off by `hideLabels`) > `offlineMapStyle(bg)` when
   `styleFailed` > the plain `styleUrl`.
3. The key still contains `styleUrl` (day<->night remount, cycle 023).
4. A key change resets `mode` to `initialMode`.
5. No new rider-facing string; no allow-list change.

## Steps (anchors by quoted content; line numbers are the current tree)

**Pre-flight.** `GIT_OPTIONAL_LOCKS=0 git status --short` (expect only `cycles/virgin-cycle22/digests/D12-...`
untracked, plus nothing in app/). `grep -c "key={styleUrl}" app/src/ui/wayMapView.tsx` -> 1.
`grep -n "const mapStyle = patchedStyles" app/src/ui/wayMapView.tsx` -> one hit (~:523). Baseline:
`cd app && node --experimental-strip-types tests/run.ts` -> **867 tests, 864 pass, 0 fail, 3 skip**
(record what you measure) and `./node_modules/.bin/tsc --noEmit` exit 0.

**Step 1 — tests first (failed-before).**

1a. `app/tests/waymapstyle_suite.ts`: change the import line
`import { offlineMapStyle, patchMapStyle } from '../src/ui/wayMapStyle.ts';` to
`import { mapStyleFor, offlineMapStyle, patchMapStyle } from '../src/ui/wayMapStyle.ts';`
and append after the last test:
```ts
test('virgin-cycle22 09: mapStyleFor — one rung per style, the key changes exactly when the style does', () => {
  // A mounted MapLibre view must never get a different mapStyle prop (the native side re-adds the
  // sources from a HashMap, in hash order: gates under the line, spans over the dot, or no layers at
  // all when the first style is still loading). The key therefore follows the chosen style.
  const day = 'https://tiles.example/day';
  const night = 'https://tiles.example/night';
  const patched = { labelsOn: { version: 8, layers: [{ id: 'on' }] }, labelsOff: { version: 8, layers: [{ id: 'off' }] } };
  const fallback = offlineMapStyle('#17171b');
  const url = mapStyleFor({ styleUrl: day, patched: null, styleFailed: false, hideLabels: false, offline: fallback });
  assert(url.style === day, 'nothing fetched, nothing failed: the native view loads the plain URL itself');
  assert(url.key.includes(day), 'the key carries the URL (cycle 023 day<->night remount)');
  const offline = mapStyleFor({ styleUrl: day, patched: null, styleFailed: true, hideLabels: false, offline: fallback });
  assert(offline.style === fallback, 'failed with nothing fetched: the bundled background-only style the caller built');
  assert(offline.key !== url.key, 'url -> offline is a different key (remount)');
  const on = mapStyleFor({ styleUrl: day, patched, styleFailed: true, hideLabels: false, offline: fallback });
  assert(on.style === patched.labelsOn, 'patched wins over failed');
  const off = mapStyleFor({ styleUrl: day, patched, styleFailed: false, hideLabels: true, offline: fallback });
  assert(off.style === patched.labelsOff, 'hideLabels picks the labels-off copy');
  const keys = [url.key, offline.key, on.key, off.key];
  assert(new Set(keys).size === 4, `four rungs, four distinct keys: ${keys.join(' | ')}`);
  const nightOn = mapStyleFor({ styleUrl: night, patched, styleFailed: false, hideLabels: false, offline: fallback });
  assert(nightOn.key !== on.key, 'same rung, other URL: different key');
  const again = mapStyleFor({ styleUrl: day, patched, styleFailed: false, hideLabels: false, offline: offlineMapStyle('#000000') });
  assert(again.key === on.key, 'same rung, same URL: same key — the fallback object (built per render) is never part of the key');
  for (const k of keys) assert(!/[A-Za-z]{2,}[^A-Za-z]+[A-Za-z]{2,}/.test(k.slice(day.length)), `rung suffix must not read as prose (ui-strings Tier B): ${k}`);
});
```
1b. `app/tests/waymap_suite.ts`: in the test
`'routemap: MapLibre <M.Map> remounts on a style-URL change (cycle 023 fix 1 day-mode race)'` replace
```ts
  assert(/\bkey=\{styleUrl\}/.test(openTag),
    '<M.Map> must be keyed on styleUrl so a day<->night theme flip fully remounts the native view ' +
    'instead of a prop-only style update (the cycle 023 day-mode rendering bug)');
```
with
```ts
  // virgin-cycle22 09: the key is the style RUNG + URL (mapStyleFor), which still changes on a
  // day<->night flip — the cycle-023 guarantee holds through the pure helper (waymapstyle_suite).
  assert(/\bkey=\{mapStyleKey\}/.test(openTag),
    '<M.Map> must be keyed on mapStyleKey (mapStyleFor: rung + styleUrl) so a day<->night theme flip ' +
    'AND every style-rung change fully remount the native view instead of a prop-only style update');
```
and append after the last test of the file:
```ts
test('virgin-cycle22 09: the native map is never handed a different mapStyle — key and style come from ONE mapStyleFor call, and a remount resets the mode', () => {
  const src = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'wayMapView.tsx'), 'utf8');
  assert(src.includes("import { mapStyleFor, offlineMapStyle, patchMapStyle } from './wayMapStyle.ts';"), 'helper imported next to the two it already used');
  assert(/const \{ style: mapStyle, key: mapStyleKey \} = mapStyleFor\(\{/.test(src), 'mapStyle and mapStyleKey are destructured from one mapStyleFor call');
  assert(!/const mapStyle = patchedStyles/.test(src), 'the old inline ternary is gone');
  assert(!/\bkey=\{styleUrl\}/.test(src), 'no element is keyed on styleUrl alone any more');
  const mapStart = src.indexOf('<M.Map');
  const openTag = src.slice(mapStart, src.indexOf('<M.Camera', mapStart));
  assert(/\bkey=\{mapStyleKey\}/.test(openTag) && /\bmapStyle=\{mapStyle as never\}/.test(openTag), '<M.Map> keyed on mapStyleKey, style from the same call');
  assert(/useEffect\(\(\) => \{\s*setMode\(initialMode\);[\s\S]{0,200}\}, \[mapStyleKey\]\);/.test(src), 'a key change (native remount) resets the mode to initialMode, so a free-dragged camera never lands on the world default');
  assert((src.match(/setMode\(initialMode\)/g) ?? []).length === 2, 'exactly two reset sites: the phase/zoom/way effect and the remount effect');
});
```
1c. Run the suite: the waymapstyle suite fails to load (`mapStyleFor` not exported; if the runner aborts on the
import instead of reporting one FAIL, record that — brief 06's step 1c saw exactly that) and, once it
loads, the two waymap tests FAIL (`key={styleUrl}` still there). Record it.

**Step 2 — `app/src/ui/wayMapStyle.ts`.** Append at the end of the file (after `offlineMapStyle`):
```ts

/** virgin-cycle22 09 (Nathan 2026-10-06, RECORD map on a cold start: white gates
 * under the yellow line, or no line at all, until a remount). Which style the
 * tile rung runs on, and a React key that changes whenever that choice changes:
 *  - `patched` (the fetched + patchMapStyle'd copies) always wins; `hideLabels`
 *    picks the labels-off copy ('nolabels') or the labels-on one ('labels');
 *  - else `styleFailed` -> the caller's `offline` fallback (offlineMapStyle(frame
 *    colour), built by wayMapView.tsx) ('offline');
 *  - else the plain `styleUrl` string, which the native view loads itself,
 *    from its own cache when there is no signal ('url').
 * The key exists because maplibre-react-native (11.3.6, Android) answers a
 * CHANGED mapStyle prop on a mounted view by removing every source and
 * re-adding them from a HashMap, in hash order, not mount order (route over
 * gate-ticks, sector-spans over the rider); and if the first style is still
 * loading, the queued layers are dropped and nothing draws at all. Keying
 * <M.Map> on this value remounts the native view instead, and a fresh mount
 * adds the children in JSX order. The key carries the URL too (day<->night,
 * cycle 023). Rung names are single words on purpose (the ui-strings scanner
 * reads two words as prose). Pure. */
export type MapStyleRung = 'url' | 'offline' | 'labels' | 'nolabels';

export function mapStyleFor(input: {
  styleUrl: string;
  patched: { labelsOn: unknown; labelsOff: unknown } | null;
  styleFailed: boolean;
  hideLabels: boolean;
  offline: unknown;
}): { style: unknown; key: string; rung: MapStyleRung } {
  const rung: MapStyleRung = input.patched
    ? (input.hideLabels ? 'nolabels' : 'labels')
    : input.styleFailed ? 'offline' : 'url';
  const style: unknown = input.patched
    ? (input.hideLabels ? input.patched.labelsOff : input.patched.labelsOn)
    : input.styleFailed ? input.offline : input.styleUrl;
  return { style, key: `${input.styleUrl}#${rung}`, rung };
}
```

**Step 3 — `app/src/ui/wayMapView.tsx`.**

3a. Import (`:102`): `import { offlineMapStyle, patchMapStyle } from './wayMapStyle.ts';` ->
`import { mapStyleFor, offlineMapStyle, patchMapStyle } from './wayMapStyle.ts';`
(`offlineMapStyle(t.race.bg)` is still called in this file after 3b — the older brief-05 test
`waymap_suite.ts:336` asserts that literal, and it stays true.)

3b. Replace `:522-525` (exact text)
```ts
  const hideLabels = !unlocked;
  const mapStyle = patchedStyles
    ? (hideLabels ? patchedStyles.labelsOff : patchedStyles.labelsOn)
    : styleFailed ? offlineMapStyle(t.race.bg) : styleUrl;
```
with
```ts
  const hideLabels = !unlocked;
  // virgin-cycle22 09 (Nathan 2026-10-06): the style AND the <M.Map> key come
  // from one pure call — see mapStyleFor's doc. A mounted native view must
  // never be handed a different mapStyle prop: on Android that re-adds the
  // sources in HashMap order (gates under the line, spans over the dot) or,
  // if the first style is still loading, drops the queued layers (no line at
  // all) — exactly the RECORD cold-start picture. Keyed, every rung change
  // (url -> patched, labels on <-> off at START/finish, url -> offline ->
  // patched) remounts the native view and a fresh mount adds the children in
  // JSX order, like every screen that was already right.
  const { style: mapStyle, key: mapStyleKey } = mapStyleFor({
    styleUrl,
    patched: patchedStyles,
    styleFailed,
    hideLabels,
    offline: offlineMapStyle(t.race.bg),
  });
  // A remount is a new camera: in 'free' mode cameraTargetFor pushes nothing
  // and the fresh view would open on MapLibre's world default, so every key
  // change restarts from initialMode (the phase/zoom/way effect above already
  // does this for START and the finish; this covers the fetch arriving).
  useEffect(() => {
    setMode(initialMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyleKey]);
```
(Rules of Hooks: this effect sits before the `riderOnly` early return at `:615`, after the state hooks —
unconditional, stable order. `initialMode` is a plain const computed above `:399`.)

3c. `<M.Map>` open tag `:685-687`: replace `        key={styleUrl}` with `        key={mapStyleKey}`
(`mapStyle={mapStyle as never}` unchanged).

3d. In the comment block right above `<M.Map` (`:675-684`, starts `{/* Cycle 023 fix 1 (day-mode
style-swap race):`) replace the sentence fragment
`Keying the element
          on styleUrl forces React to unmount/remount the native view itself
          whenever the underlying style URL changes, guaranteeing a full
          reload rather than a partial one.`
with
`Keying the element
          on mapStyleKey (virgin-cycle22 09: the style rung + the URL) forces
          React to unmount/remount the native view itself whenever the chosen
          style changes — URL, fetched copy, labels on/off, offline fallback —
          guaranteeing a full reload rather than a partial one.`
(Comment only. Do not touch `onDidFinishLoadingStyle` / `onDidFailLoadingMap`; the `styleLoadedRef`
guard still reads "no style has ever loaded on this component", which is the intended meaning across
remounts: once the URL style loaded once, a later abort of a view being torn down cannot flip the map
to offline, and patched wins in `mapStyleFor` anyway.)

3e. In the comment block `:486-492` (starts `// virgin-cycle22 05 (Nathan 2026-10-05, PNG rung retired): if the NATIVE`)
replace the last line `  // connection returns; patchedStyles always wins once set.` with
`  // connection returns; patchedStyles always wins once set. Each change of
  // the chosen style remounts the native view (mapStyleFor, virgin-cycle22 09).`

**Step 4 — run everything.** Both Step-1 tests pass, the modified cycle-023 test passes:
**869 tests, 866 pass, 0 fail, 3 skip** (+2 vs the measured baseline). tsc exit 0. ui-strings suite green
with NO allow-list change (`git diff app/tests/ui-strings.allow.json` -> empty). `git diff --stat` ->
exactly `app/src/ui/wayMapStyle.ts`, `app/src/ui/wayMapView.tsx`, `app/tests/waymapstyle_suite.ts`,
`app/tests/waymap_suite.ts`.

## Failed-before procedure (never git stash)
Step 1c is the record. To re-prove later: `cp app/src/ui/wayMapView.tsx safe_to_delete/wayMapView.c22-09.bak`;
change `key={mapStyleKey}` back to `key={styleUrl}` on the `<M.Map>` tag; run -> the cycle-023 test
("must be keyed on mapStyleKey") and the new waymap test ("no element is keyed on styleUrl alone") FAIL;
restore with `cp` and `cmp`. Second bite: in `wayMapStyle.ts` make `key` ignore the rung (`` `${input.styleUrl}` ``)
-> the waymapstyle test FAILs on "four rungs, four distinct keys"; restore.

## Verification (the inspector reruns all of it)
- Tests 0 FAIL with counts (869 / 866 / 0 / 3 expected); tsc exit 0.
- `grep -n "mapStyleFor\|mapStyleKey" app/src/ui/wayMapView.tsx` -> import, the destructuring call, the
  reset effect's dep array, the `<M.Map>` key, comments; nothing else.
- `grep -c "key={styleUrl}" app/src/ui/wayMapView.tsx` -> 0. `grep -c "offlineMapStyle(t.race.bg)" app/src/ui/wayMapView.tsx`
  -> 1 (the `offline:` argument; brief 05's test at waymap_suite.ts:336 still finds it).
- `grep -n "setMode(initialMode)" app/src/ui/wayMapView.tsx` -> exactly 2 (brief 06's "setMode( grep" list
  gains this one reset site; everything else in that list unchanged: 'free', +, −, toggle).
- `grep -n "'url'\|'offline'\|'labels'\|'nolabels'" app/src/ui/wayMapStyle.ts` -> only inside
  `MapStyleRung` / `mapStyleFor`; none in wayMapView.tsx.
- ui-strings: no new entry (the four rung literals are single words; the key template has no letters
  outside `${}`); `recordflow` "ride" scan: no new string contains the word ride.
- easignore relative-import scan: the new tests import only `'../src/ui/wayMapStyle.ts'` /
  read `src/ui/wayMapView.tsx` via `path.join(TESTS_DIR, '..', ...)` — same as the existing tests, no
  `require('../../` literal anywhere in the added text.
- `git diff app/src/ui/wayMapStyle.ts` -> one appended type + function only; `patchMapStyle`,
  `offlineMapStyle` byte-identical.
- No native/Kotlin change: `git status` shows nothing under `android/` or `ios/` (the directories are
  not even in the repo; `app/node_modules` is untouched — the Kotlin quoted above is READ ONLY).

## Added visible text
None. No allow-list change.

## Rider-facing strings impact (CLAUDE.md #9)
None added, none removed, none changed.

## JS-only / OTA safety
Pure TypeScript in `app/src/ui` + tests. No dependency, no native module, no `app.json`/`eas.json`
change -> the fingerprint is unchanged and `scripts/publish-preview.ps1` ships it as an OTA on build 8
(COMMANDS.md). Nathan runs the publish, not the executor.

## What changes on the phone / what does not
Changes (after OTA publish): on a cold start the RECORD map shows the yellow line with the white gates
ON TOP of it, every time — because the moment the real style arrives the map is rebuilt instead of
patched in place. The same rebuild now happens when labels switch off at START and back on at the finish:
expect a brief blank/reload of the basemap at those two moments (the line, gates and dot come back on
top of it in the right order), where today the basemap already reloads in place. During a ride the blue
dot stays ABOVE the yellow sector spans (today's in-place swap at START puts the spans over the dot —
the 2026-10-03 "dot under the yellow line" picture). Offline with a cached region: unchanged (native URL
load first); first-ever open with no signal: the empty-basemap fallback still appears, and when the
connection returns the map rebuilds onto the real style.
Does NOT change: any colour, width, zoom, camera rule, FIT/ME, the compass, gestures, the retry
timings, stored data, any string, ROUTES/RESULTS/ACTIVITIES maps (they already got one clean mount).

## What can't be verified headless — Nathan's checks (COMMANDS.md § on-device, coordinator adds)
Headless tests pin the wiring (one `mapStyleFor` call, the key, the reset effect) and the helper's
table; they CANNOT render MapLibre, so the on-device picture is the proof:
1. Cold start x2: clear the app (force stop + clear from recents), reopen on RECORD, wait for the tiles.
   Expect: yellow route line present, white gates drawn ON TOP of it. Repeat once more (the race is
   timing-dependent, two runs rule out luck). Also try once with the phone on mobile data instead of
   Wi-Fi (a slower first fetch widens the window the fix closes).
2. Press RECORD (armed map, bigger) -> same picture; cancel -> same picture.
3. A short real ride (or DEMO): at START the map reloads briefly, then the blue dot must sit ABOVE the
   yellow line/spans and the gates above the line; at the finish the labels come back after another
   brief reload.
4. Airplane mode, a region seen before: the map still shows streets (native cache) with the line.
If after the fix the cold start still shows gates under the line, the mechanism is not the style swap
and the next step is `adb logcat` filtered on `MLRNSource|MLRNLayer|Mbgl` around launch — say so rather
than guessing.

## Out of scope (do not do)
- `aboveLayerID`/`belowLayerID` on any layer; reordering sources; delaying the first mount until the
  fetch settles; changing `STYLE_RETRY_MS`; touching `onDidFailLoadingMap`/`onDidFinishLoadingStyle`.
- iOS: the iOS MLRN path was not read (Nathan's phone is Android); the keyed remount is platform-neutral.
- RecordScreen.tsx, CatalogDetail/RideDetail/Demo/Replay callers, `core/`, IDEAS.md, STATE.md,
  OPEN-ITEMS.md, other briefs. Coordinator: STATE.md "Maps:" line gets `; <M.Map> is keyed on the style
  rung + URL so a style change always remounts the native view (virgin-cycle22 09, the RECORD cold-start
  gates-under-line fix)`, and virgin-cycle21 03's "dot on top" claim should be re-checked on the next ride
  (its always-mount fix was right but not sufficient; 09 closes the remaining re-order path).

## D12 digest errata found by Plan
- D12 compares HEAD~1 with HEAD and the coordinator believed cycle 22 was uncommitted; the tree IS
  committed (`dfbbff8`), so D12's diff basis was right and its line numbers are the live ones.
- D12 §2/§6 "cold start with no network, cache empty" is not Nathan's case (he is online). The actual
  trigger is the SUCCESSFUL fetch of the patched style arriving after `onMapReady` — a swap that exists
  since B-51 and on every screen; it only bites where the fetch is cold.
- D12 §1 "MapLibre paints sources in the order they mount" is right for a fresh mount but misses the
  native re-add path (`setReactMapStyle` -> HashMap order) that makes the swap harmful, and the
  `mQueuedLayers.clear()` path that explains the missing line.
- D12 §3 claims the running map "inherits styleFailed" — it inherits nothing; and ROUTES etc. are not
  "immune", they simply mount with a warm fetch.
- D12 option A (key on `styleFailed`) would miss the online case entirely; option C (above/below ids)
  misses window B.

## Decisions taken by the Plan tier (logged, not asked)
1. Remount-on-rung-change over layer-id chains or delaying the mount (0.4): it is the only approach that
   covers both windows, it is the cycle-023 precedent, and the native cost equals today's in-place
   `setStyle`.
2. The mode reset on key change is included (invariant 4) rather than leaving a `free` camera to land on
   the world default; it only matters when the rider dragged within the first seconds after a cold mount.
3. `styleLoadedRef` is NOT reset per remount (its meaning stays "a style loaded once on this component").
4. Rung names are single words ('labels'/'nolabels', not 'labels-on') so the ui-strings Tier-B scanner
   cannot read them as prose; the key template `${styleUrl}#${rung}` has no letters of its own.
5. `mapStyleFor` takes the offline fallback as an OBJECT (`offline: offlineMapStyle(t.race.bg)`) rather
   than the colour, so wayMapView.tsx keeps the literal `offlineMapStyle(t.race.bg)` that brief 05's
   older test (`waymap_suite.ts:336`) asserts, and wayMapStyle.ts gains no dependency between its two
   exports. The per-render fallback object is never part of the key, so it cannot cause a remount.
