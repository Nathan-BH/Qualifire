# Brief 12 — map white flash on tab switch (virgin-cycle27)

Written 2026-10-09 by the Plan tier (Fable) from the code as it stands in the working tree
(all cycle27 briefs 01-11 applied, uncommitted; `git status --short` shows only
`?? cycles/virgin-cycle28/`). Baseline: `967 tests: 964 pass, 0 fail, 3 skip`, tsc clean.
Read `cycles/virgin-cycle27/EXECUTOR-RULES.md` first, then `/CLAUDE.md`, then this brief.

## 0. Rules for this brief (binding)

- JS-only. No change under `app/modules/`, `app.json`, `app.config.js`, `package.json`, `eas.json`.
  No native code, no new dependency. OTA-safe.
- No `git add/commit/push`, no EAS build, no OTA publish. Delete nothing: `mv` into `safe_to_delete/`
  (or `_to_delete/`). Never call `device_request_delete_permission`.
- STOP-ON-AMBIGUITY: any anchor that does not match by content, any undecided call, any check failing
  for a reason not anticipated here -> write the question verbatim to
  `cycles/virgin-cycle27/exec-report-map-white-flash.md` and stop. Never guess. Never ask Nathan.
- Rider-facing text: this brief adds NO visible string. `app/tests/ui-strings.allow.json` must stay
  byte-identical. The scanner flags any string literal matching `/[A-Za-z]{2,}[^A-Za-z]+[A-Za-z]{2,}/`
  (two "words"), so every new literal in the new code is a single word (`'none'`, `'offline'`, ...).
  If the suite reports UNLISTED/STALE anything -> STOP and report it (do not add an entry).
- Nothing negative is ever shown to a rider: the cover is a blank themed rectangle, no text, no spinner.
- Strip-only TypeScript: no `enum`, no parameter properties, no decorators (the suite runs under
  `node --experimental-strip-types`).
- Final report to `cycles/virgin-cycle27/exec-report-map-white-flash.md` (see §9).

## 1. The bug and the verified diagnosis

Nathan (on device, since ~2026-10-08, not caused by the colour update): switching tabs between
RECORD, ACTIVITIES and ROUTES (now MAP) shows a bright WHITE rectangle where each map is, then the
map appears. At night it is blinding.

Verified in code (2026-10-09):

1. `app/App.tsx` lines ~215-218 render the tabs conditionally
   (`tab === 'record' ? <RecordScreen .../> : tab === 'rides' ? <RidesScreen /> : tab === 'routes' ?
   <RoutesScreen /> ...`). Every tab switch unmounts one screen and mounts another, so every map on
   the new tab is a brand-new native MapLibre view. (Keeping screens mounted is NOT in scope: it
   changes GPS/fullscreen/effect lifecycles in RecordScreen; rejected.)
2. `app/src/ui/wayMapView.tsx` (`MapLibreWayMap`, lines ~511-581): `patchedStyles` state starts
   `null`; a `useEffect([styleUrl])` does `fetch(styleUrl)` and stores the two `patchMapStyle` copies;
   `mapStyleFor` (`app/src/ui/wayMapStyle.ts`) therefore picks rung `url` first and rung
   `labels`/`nolabels` when the fetch lands; `<M.Map key={mapStyleKey}>` is keyed on the rung+URL, so
   the native view REMOUNTS on that change (virgin-cycle22 09, deliberate, keep). Result: two native
   map starts per mount of every WayMapView, each one painting the native load colour until its first
   fully rendered frame. `app/src/ui/catalogMapView.tsx` (`CatalogMapInner`, lines ~119-158,
   252-257) copies the same fetch + key pattern.
3. The white itself is the native MapLibre Android view's own load foreground (MapLibre Android
   `foregroundLoadColor`, white by default, removed by the SDK on its first fully rendered frame).
   `@maplibre/maplibre-react-native` 11.3.6 does not expose it (grep of
   `node_modules/@maplibre/maplibre-react-native/android` finds no `foregroundLoadColor`), so it
   cannot be changed without a native change -> out of scope. This paint happens INSIDE the native
   view, on top of any `backgroundColor` on the JS frame, which is why WayMapView's
   `backgroundColor: t.race.bg` on the frame does not help. (Not verifiable headlessly; consistent
   with the symptom "white, then the map appears".)
4. `catalogMapView.tsx` `st.frame` (line ~393: `frame: { flex: 1, alignSelf: 'stretch' }`) has NO
   background at all, so the MAP tab shows the screen behind it for the one frame before the
   wrapper's `onLayout` mounts the native view (maplibre-react-native `Map.tsx` mounts the native
   view only after its wrapper View has laid out).
5. All other maps (activity cards `activityCard.tsx`, `RideDetailScreen.tsx` x4, the gate editor
   `gateAdjustCard.tsx`, RECORD, Demo, Replay) go through `WayMapView`, so fixing `wayMapView.tsx`
   fixes them all; the MAP tab is the only `CatalogMapView` user.

Installed maplibre-react-native 11.3.6 (checked `node_modules/@maplibre/maplibre-react-native/
lib/typescript/module/components/map/Map.d.ts` lines 393-433 and `android/.../MLRNMapView.kt`
lines 700-745): `onDidFinishLoadingStyle`, `onDidFailLoadingMap`, `onDidFinishRenderingFrame`,
`onDidFinishRenderingFrameFully`, `onDidFinishRenderingMapFully` are all typed props on `<M.Map>`
and all dispatched unconditionally by the Android view. `onDidFinishRenderingFrameFully` fires on
EVERY fully rendered frame (many times), so its handler must be idempotent.

## 2. Decision: BOTH (A) and (B), plus the frame background

- **(A) session cache of the fetched patched styles** (module scope, keyed by style URL): the second
  and every later mount of a map on the same theme URL starts directly on rung `labels`/`nolabels`
  -> ONE native mount per map instead of two, and no key change. The first mount per URL per app
  session still goes url -> patched (that is where the fetch happens). A theme flip fetches the other
  URL once. Failure is never cached; the retry ladder is untouched.
- **(B) a themed cover**: an absolutely positioned `Animated.View` in `t.race.bg` (white by day,
  `#0A0A0A` at night, in BOTH maps: it is already the colour `offlineMapStyle(t.race.bg)` uses in both
  files, and the closest to both basemaps' ground) above the native view and below the controls,
  `pointerEvents="none"`, that fades out over 200 ms (native driver; instant when reduce-motion is
  on) once the style has loaded AND a frame has fully rendered, with a 5 s safety timeout, and that is
  never shown when the style has failed (the offline fallback map must stay visible). It resets on
  every native remount (key change) because its state is keyed on `mapStyleKey`.
- **Belt and braces**: `CatalogMapView`'s frame gets `backgroundColor: t.race.bg`.

Why both: (A) alone leaves the first mount per session and every labels on/off remount (START,
finish) flashing; (B) alone hides the flash but still pays two native starts and two tile rounds per
tab switch. Together: one start, and whatever the native view paints before its first frame is
behind the theme colour.

Trade-off to state in the report: on a very slow network the native "fully rendered" frame can take
longer than 5 s (all tiles must arrive); the cover then lifts and the native white is visible as
today, bounded. That is accepted over a cover that could hide a stuck map forever.

## 3. New file `app/src/ui/mapStyleCache.ts` (pure, headless-testable)

```ts
/**
 * virgin-cycle27 12 (Nathan 2026-10-09, white flash on every tab switch): a session-level
 * cache of the fetched + patchMapStyle'd style copies, keyed by the style URL. Both map views
 * (wayMapView.tsx, catalogMapView.tsx) fetch the online style on every mount and only then
 * remount the native view on the patched copy (mapStyleFor, virgin-cycle22 09) — two native
 * starts per map per tab switch. With this cache the second and every later mount on the same
 * theme URL starts on the patched copy directly: one native start, no key change.
 * Only a successful fetch is remembered (a failure never is: the retry ladder stays as it was);
 * the copies for one URL are replaced whenever a newer fetch lands. Pure: no react, no native.
 */
export interface PatchedStyles { url: string; labelsOn: unknown; labelsOff: unknown }

const cache = new Map<string, PatchedStyles>();

/** The remembered copies for `url`, or null when this session has not fetched it yet. */
export function cachedPatchedStyles(url: string): PatchedStyles | null {
  return cache.get(url) ?? null;
}

/** Remembers `patched` under its own URL and returns it (so a caller can store what it cached). */
export function rememberPatchedStyles(patched: PatchedStyles): PatchedStyles {
  cache.set(patched.url, patched);
  return patched;
}

/** Tests only. */
export function clearPatchedStyleCache(): void {
  cache.clear();
}
```

## 4. New file `app/src/ui/mapCoverModel.ts` (pure, headless-testable)

```ts
/**
 * virgin-cycle27 12 (Nathan 2026-10-09): the pure decision behind the themed map cover
 * (mapCover.tsx). The native MapLibre view paints its own light load colour until its first
 * fully rendered frame, and a maplibre-react-native 11.3.6 app cannot change that colour from
 * JS, so each map sits under a cover in the theme map colour until it is safe to show.
 * The cover lifts when:
 *  - the style failed (the view is on, or about to remount on, the offline fallback, which must
 *    never be hidden), or
 *  - the style has loaded AND a frame has fully rendered (onDidFinishLoadingStyle +
 *    onDidFinishRenderingFrameFully), or
 *  - the safety timeout has elapsed (a cover may never hide a map forever).
 * Pure: no react, no native.
 */
export const MAP_COVER_FADE_MS = 200;
export const MAP_COVER_TIMEOUT_MS = 5000;

export interface MapCoverInput {
  styleFailed: boolean;
  styleLoaded: boolean;
  frameRendered: boolean;
  timedOut: boolean;
}

export function mapCoverLifts(i: MapCoverInput): boolean {
  return i.styleFailed || i.timedOut || (i.styleLoaded && i.frameRendered);
}
```

## 5. New file `app/src/ui/mapCover.tsx` (hook + element; source-pinned only, never imported by tests)

```tsx
/**
 * virgin-cycle27 12 (Nathan 2026-10-09, white flash on every tab switch): a themed cover over a
 * native MapLibre view. `useMapCover(key, styleFailed)` keeps one cover per native mount (the
 * caller passes its <M.Map> key: a key change is a native remount and gets a fresh, opaque
 * cover); the caller wires `onStyleLoaded` into onDidFinishLoadingStyle and `onFrameFully` into
 * onDidFinishRenderingFrameFully. The decision is mapCoverModel.ts (pure); this file only
 * animates it: a 200 ms opacity fade on the native driver, or an instant hide when the OS
 * reduce-motion setting is on (same AccessibilityInfo pattern as chips.tsx). The element is
 * pointerEvents none and must be rendered AFTER the map and BEFORE the zoom bar / credit, so it
 * sits above the map and below every control. Blank on purpose: no text, no spinner, nothing a
 * rider could read as a state.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet } from 'react-native';
import { MAP_COVER_FADE_MS, MAP_COVER_TIMEOUT_MS, mapCoverLifts } from './mapCoverModel.ts';

export interface MapCoverState {
  /** True while the cover element should be mounted (opaque or still fading). */
  covered: boolean;
  opacity: Animated.Value;
  onStyleLoaded: () => void;
  onFrameFully: () => void;
}

export function useMapCover(key: string, styleFailed: boolean): MapCoverState {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (live) setReduceMotion(v); })
      .catch(() => { /* default: animate */ });
    return () => { live = false; };
  }, []);
  // One opacity value and one set of signals per native mount (per key).
  const opacity = useMemo(() => new Animated.Value(1), [key]);
  const seen = useMemo(() => ({ styleLoaded: false, frameRendered: false, lifted: false }), [key]);
  const keyRef = useRef(key);
  keyRef.current = key;
  const [goneKey, setGoneKey] = useState<string | null>(null);

  const lift = useCallback(() => {
    if (seen.lifted) return;
    seen.lifted = true;
    if (reduceMotion) {
      opacity.setValue(0);
      setGoneKey(key);
      return;
    }
    Animated.timing(opacity, {
      toValue: 0, duration: MAP_COVER_FADE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start(() => { if (keyRef.current === key) setGoneKey(key); });
  }, [key, opacity, seen, reduceMotion]);

  const decide = useCallback((timedOut: boolean) => {
    if (mapCoverLifts({ styleFailed, styleLoaded: seen.styleLoaded, frameRendered: seen.frameRendered, timedOut })) lift();
  }, [styleFailed, seen, lift]);

  useEffect(() => {
    decide(false);
    const timer = setTimeout(() => decide(true), MAP_COVER_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [key, decide]);

  const onStyleLoaded = useCallback(() => { seen.styleLoaded = true; decide(false); }, [seen, decide]);
  const onFrameFully = useCallback(() => { seen.frameRendered = true; decide(false); }, [seen, decide]);

  return { covered: goneKey !== key, opacity, onStyleLoaded, onFrameFully };
}

/** The cover itself: absolute-fill, theme map colour, no touch. Null once gone. */
export function MapCover(props: { cover: MapCoverState; color: string }) {
  if (!props.cover.covered) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: props.color, opacity: props.cover.opacity }]}
    />
  );
}
```

Notes for the executor: `seen` is a per-key mutable object (not state) on purpose — the native
events arrive many times per second and must not re-render the map; only the final `setGoneKey`
re-renders. The `keyRef` guard keeps a stale fade callback (old key) from un-covering a newer
mount. `reduceMotion` changing re-creates `lift`/`decide` and restarts the 5 s timer once; harmless.

## 6. Edits to `app/src/ui/wayMapView.tsx` (anchors by content; each must be found exactly once)

6.1 Imports. After the line
```ts
import { mapStyleFor, offlineMapStyle, patchMapStyle } from './wayMapStyle.ts';
```
(do NOT modify that line: waymap_suite pins it verbatim) insert
```ts
import { cachedPatchedStyles, rememberPatchedStyles } from './mapStyleCache.ts';
import { MapCover, useMapCover } from './mapCover.tsx';
```

6.2 Cache as the initial state. Replace (exact line, inside `MapLibreWayMap`)
```ts
  const [patchedStyles, setPatchedStyles] = useState<{ url: string; labelsOn: unknown; labelsOff: unknown } | null>(null);
```
with
```ts
  // virgin-cycle27 12 (Nathan 2026-10-09, white flash on every tab switch): start on the copies
  // this session already fetched for this URL (mapStyleCache.ts), so a remounted map opens
  // directly on the patched rung — one native start instead of url -> patched.
  const [patchedStyles, setPatchedStyles] = useState<{ url: string; labelsOn: unknown; labelsOff: unknown } | null>(() => cachedPatchedStyles(styleUrl));
```

6.3 Skip the fetch when cached. Inside the `useEffect(() => { ... }, [styleUrl]);` that follows, after
the two lines
```ts
    setStyleFailed(false);
    styleLoadedRef.current = false;
```
insert
```ts
    const cached = cachedPatchedStyles(styleUrl);
    if (cached !== null) {
      setPatchedStyles(cached);
      return undefined;
    }
```
(Note: `styleLoadedRef` is reset here as before; the offline-failure guard is unchanged.)

6.4 Remember a successful fetch. In the same effect replace
```ts
        setPatchedStyles({
          url: styleUrl,
          labelsOn: patchMapStyle(json, { hideLabels: false }),
          labelsOff: patchMapStyle(json, { hideLabels: true }),
        });
```
with
```ts
        setPatchedStyles(rememberPatchedStyles({
          url: styleUrl,
          labelsOn: patchMapStyle(json, { hideLabels: false }),
          labelsOff: patchMapStyle(json, { hideLabels: true }),
        }));
```
(`url: styleUrl,` stays on its own line: pinned by waymap_suite.)

6.5 The cover hook. After the block
```ts
  useEffect(() => {
    setMode(initialMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyleKey]);
```
(this block is regex-pinned; leave it byte-identical) insert
```ts
  // virgin-cycle27 12: a cover in the frame colour sits over the native view from every (re)mount
  // until the style has loaded and a frame has fully rendered (mapCover.tsx / mapCoverModel.ts);
  // never when the style failed (the offline fallback stays visible). Keyed on mapStyleKey so a
  // native remount gets a fresh opaque cover. Hook order: above the asset guard below, like the
  // other hooks here.
  const cover = useMapCover(mapStyleKey, styleFailed);
```
This sits above `if (riderOnly && !showRider && !hasTrail && !place) return null;` (line ~667) —
verify, Rules of Hooks.

6.6 Wire the native events. Replace (the `<M.Map` open tag)
```tsx
        onDidFinishLoadingStyle={() => { styleLoadedRef.current = true; }}
        onDidFailLoadingMap={() => { if (!styleLoadedRef.current) setStyleFailed(true); }}
```
with
```tsx
        onDidFinishLoadingStyle={() => { styleLoadedRef.current = true; cover.onStyleLoaded(); }}
        onDidFinishRenderingFrameFully={cover.onFrameFully}
        onDidFailLoadingMap={() => { if (!styleLoadedRef.current) setStyleFailed(true); }}
```
(`onDidFinishRenderingFrameFully` is a typed prop in 11.3.6 `Map.d.ts` line 417; the extra
`event` argument is ignored by `onFrameFully: () => void` — fine for tsc.) The line in wayMapView
occurs once; the identical pair also exists in catalogMapView (edited in §7, separately).

6.7 Render the cover above the map, below the controls. Replace
```tsx
      </M.Map>
      </View>
      {/* Cycle 020: the zoom bar is always visible now, not gated on
```
with
```tsx
      </M.Map>
      </View>
      {/* virgin-cycle27 12: themed cover over the native view, under every control (JSX order). */}
      <MapCover cover={cover} color={t.race.bg} />
      {/* Cycle 020: the zoom bar is always visible now, not gated on
```

No change to `st` styles in this file (the frame already has `backgroundColor: t.race.bg`).

## 7. Edits to `app/src/ui/catalogMapView.tsx`

7.1 Imports. After
```ts
import { mapStyleFor, offlineMapStyle, patchMapStyle } from './wayMapStyle.ts';
```
insert
```ts
import { cachedPatchedStyles, rememberPatchedStyles } from './mapStyleCache.ts';
import { MapCover, useMapCover } from './mapCover.tsx';
```

7.2 Initial state: same replacement as 6.2 (the identical `useState<...>(null)` line, inside
`CatalogMapInner`); comment may be one line: `// virgin-cycle27 12: session cache first (mapStyleCache.ts).`

7.3 Skip the fetch when cached: same insertion as 6.3, after
```ts
    setStyleFailed(false);
    styleLoadedRef.current = false;
```

7.4 Remember a successful fetch: same replacement as 6.4 (the `setPatchedStyles({ url: styleUrl, ...})`
block in this file).

7.5 Hook. After
```ts
  useEffect(() => {
    setMode('fit');
  }, [focusKey, mapStyleKey]);
```
insert
```ts
  // virgin-cycle27 12: themed cover until the style has loaded and a frame has fully rendered.
  const cover = useMapCover(mapStyleKey, styleFailed);
```
(Hooks after it in this file are `useMemo`s; nothing returns early before line ~250 except the
`ML === null` branch in the OUTER `CatalogMapView`, not this component — verify.)

7.6 Events: same replacement as 6.6 on this file's `<M.Map` open tag.

7.7 Frame colour + cover. Replace
```tsx
    <View style={st.frame}>
      <M.Map
        key={mapStyleKey}
```
with
```tsx
    <View style={[st.frame, { backgroundColor: t.race.bg }]}>
      <M.Map
        key={mapStyleKey}
```
and replace
```tsx
      </M.Map>
      <View style={st.zoomBar}>
```
with
```tsx
      </M.Map>
      {/* virgin-cycle27 12: themed cover over the native view, under the controls. */}
      <MapCover cover={cover} color={t.race.bg} />
      <View style={st.zoomBar}>
```
Leave the outer `if (ML === null) return <View style={st.frame} />;` alone (no native view there,
no theme hook in that function).

## 8. Tests

8.1 New `app/tests/mapcover_suite.ts` (pure; add `import './mapcover_suite.ts';` to
`app/tests/run.ts` directly after the line `import './waymapstyle_suite.ts';`):

```ts
/**
 * virgin-cycle27 12 — the map cover decision (mapCoverModel.ts) and the session style cache
 * (mapStyleCache.ts), both pure; plus source pins on the wiring in the two map views.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, test, TESTS_DIR } from './lib.ts';
import { MAP_COVER_FADE_MS, MAP_COVER_TIMEOUT_MS, mapCoverLifts } from '../src/ui/mapCoverModel.ts';
import { cachedPatchedStyles, clearPatchedStyleCache, rememberPatchedStyles } from '../src/ui/mapStyleCache.ts';

const src = (...p: string[]) => fs.readFileSync(path.join(TESTS_DIR, '..', ...p), 'utf8');

test('virgin-cycle27 12: the cover lifts on failure, on timeout, or on style loaded + frame fully rendered, never earlier', () => {
  const base = { styleFailed: false, styleLoaded: false, frameRendered: false, timedOut: false };
  assert(!mapCoverLifts(base), 'fresh mount stays covered');
  assert(!mapCoverLifts({ ...base, styleLoaded: true }), 'style alone is not enough');
  assert(!mapCoverLifts({ ...base, frameRendered: true }), 'a frame before the style is not enough');
  assert(mapCoverLifts({ ...base, styleLoaded: true, frameRendered: true }), 'style + frame lifts');
  assert(mapCoverLifts({ ...base, styleFailed: true }), 'a failed style lifts at once (offline fallback stays visible)');
  assert(mapCoverLifts({ ...base, timedOut: true }), 'the safety timeout lifts');
  assert(MAP_COVER_FADE_MS >= 150 && MAP_COVER_FADE_MS <= 250, 'short fade');
  assert(MAP_COVER_TIMEOUT_MS >= 3000 && MAP_COVER_TIMEOUT_MS <= 8000, 'bounded timeout');
});

test('virgin-cycle27 12: the style cache is keyed by URL, remembers only what it is given, and is replaceable', () => {
  clearPatchedStyleCache();
  assert(cachedPatchedStyles('https://a') === null, 'empty at start');
  const a = rememberPatchedStyles({ url: 'https://a', labelsOn: { v: 1 }, labelsOff: { v: 2 } });
  assert(cachedPatchedStyles('https://a') === a, 'same object back');
  assert(cachedPatchedStyles('https://b') === null, 'another URL is not served the first one');
  const a2 = rememberPatchedStyles({ url: 'https://a', labelsOn: { v: 3 }, labelsOff: { v: 4 } });
  assert(cachedPatchedStyles('https://a') === a2, 'a newer fetch replaces the old copies');
  clearPatchedStyleCache();
  assert(cachedPatchedStyles('https://a') === null, 'clear empties it');
});

test('virgin-cycle27 12: both map views start on the cached style, remember a successful fetch only, and never cache a failure', () => {
  for (const f of ['wayMapView.tsx', 'catalogMapView.tsx']) {
    const s = src('src', 'ui', f);
    assert(s.includes("import { cachedPatchedStyles, rememberPatchedStyles } from './mapStyleCache.ts';"), `${f}: cache imported`);
    assert(s.includes('| null>(() => cachedPatchedStyles(styleUrl));'), `${f}: initial state from the cache`);
    assert(s.includes('const cached = cachedPatchedStyles(styleUrl);') && s.includes('setPatchedStyles(cached);'), `${f}: a cached style skips the fetch`);
    assert(s.includes('setPatchedStyles(rememberPatchedStyles({'), `${f}: a successful fetch is remembered`);
    const catchAt = s.indexOf('} catch {', s.indexOf('rememberPatchedStyles({'));
    const catchBody = s.slice(catchAt, s.indexOf('void attempt(0);', catchAt));
    assert(!catchBody.includes('rememberPatchedStyles'), `${f}: a failure is never cached`);
    assert(s.includes('patched: patchedStyles?.url === styleUrl ? patchedStyles : null'), `${f}: stale-theme guard intact`);
  }
});

test('virgin-cycle27 12: both map views mount a themed, touch-transparent cover above the native map and below the controls, wired to the native style/frame events', () => {
  for (const f of ['wayMapView.tsx', 'catalogMapView.tsx']) {
    const s = src('src', 'ui', f);
    assert(s.includes("import { MapCover, useMapCover } from './mapCover.tsx';"), `${f}: cover imported`);
    assert(s.includes('const cover = useMapCover(mapStyleKey, styleFailed);'), `${f}: one cover per native mount (keyed), failure lifts it`);
    assert(s.includes('onDidFinishLoadingStyle={() => { styleLoadedRef.current = true; cover.onStyleLoaded(); }}'), `${f}: style loaded reaches the cover`);
    assert(s.includes('onDidFinishRenderingFrameFully={cover.onFrameFully}'), `${f}: fully rendered frame reaches the cover`);
    const mapEnd = s.indexOf('</M.Map>');
    const coverAt = s.indexOf('<MapCover cover={cover} color={t.race.bg} />');
    const zoomAt = s.indexOf('style={st.zoomBar}');
    assert(mapEnd > 0 && coverAt > mapEnd && zoomAt > coverAt, `${f}: cover after the map and before the zoom bar`);
  }
  const mc = src('src', 'ui', 'mapCover.tsx');
  assert(mc.includes('pointerEvents="none"'), 'the cover never takes a touch');
  assert(mc.includes('useNativeDriver: true'), 'fade on the native driver');
  assert(mc.includes('AccessibilityInfo.isReduceMotionEnabled()') && mc.includes('opacity.setValue(0);'), 'reduce-motion hides it instantly');
  assert(mc.includes('MAP_COVER_TIMEOUT_MS'), 'safety timeout wired');
  assert(!/<Text/.test(mc), 'the cover carries no text');
  const cm = src('src', 'ui', 'catalogMapView.tsx');
  assert(cm.includes('<View style={[st.frame, { backgroundColor: t.race.bg }]}>'), 'MAP tab frame is themed');
});
```

8.2 Existing tests: NONE need to change. Checked pins that stay true:
- `waymap_suite.ts` lines ~409-419: the `wayMapStyle.ts` import line, `const { style: mapStyle, key:
  mapStyleKey } = mapStyleFor({` (do NOT add `rung` to that destructuring in wayMapView; this
  brief does not need it), `key={mapStyleKey}`, the `setMode(initialMode)` effect regex, exactly two
  `setMode(initialMode)` sites.
- `waymap_suite.ts` lines ~422-425: `url: styleUrl,` and the stale-theme `patched:` line.
- `waymap_suite.ts` line ~340: `onDidFinishLoadingStyle=` and `onDidFailLoadingMap=` present.
- `catalogmap_suite.ts` 08+09 test: rider source last, FIT/ME literals, no prompts.
- `ui_strings_suite`: no new two-word literal (the new files' literals are `'none'` and comments).
- `easignore_suite` relative-require scanner: the new imports are `./x.ts`/`./x.tsx` like the others.
If any of these fails after the edits, that is an unanticipated failure -> STOP and report.

## 9. Acceptance checks (all must pass; report each)

1. `git status --short` before and after; `git diff --stat` after. Expected touched: `app/src/ui/
   wayMapView.tsx`, `app/src/ui/catalogMapView.tsx`, `app/tests/run.ts`; new: `app/src/ui/
   mapStyleCache.ts`, `app/src/ui/mapCoverModel.ts`, `app/src/ui/mapCover.tsx`,
   `app/tests/mapcover_suite.ts`. Nothing else.
2. `cd app && node --experimental-strip-types tests/run.ts`: zero FAIL; expected `971 tests: 968
   pass, 0 fail, 3 skip` (baseline 967/964/0/3 + 4 new).
3. `cd app && ./node_modules/.bin/tsc --noEmit` exit 0, run with `timeout_ms: 180000`, tee to
   `cycles/virgin-cycle27/12-brief-12-tsc.log` (an empty log = timeout, rerun).
4. `app/tests/ui-strings.allow.json` byte-identical (`git diff --stat` must not list it).
5. Static: no change under `app/modules/`, `app.json`, `app.config.js`, `package.json`, `eas.json`.
6. Say explicitly that native rendering cannot be verified here (static checks only).

## 10. Visible text

None added, none removed, none moved. Allow-list byte-identical.

## 11. Report

`cycles/virgin-cycle27/exec-report-map-white-flash.md`: steps done/not done, files touched, test
counts before/after, each check's result, deviations verbatim, and for the Opus inspector: (a) hook
order in both views (the `useMapCover` call must precede any early return), (b) the cover's JSX
position (after `</View>`/`</M.Map>`, before the zoom bar), (c) `seen` is reset per key via
`useMemo([key])`, (d) no failure path calls `rememberPatchedStyles`. Hand the coordinator this
OPEN-ITEMS line: "virgin-cycle27 12 (map white flash): on-device check needed — tab switches
RECORD/ACTIVITIES/MAP at night show the dark frame colour, then the map fades in; START/finish
label flips and a day/night flip do the same; +/−/FIT/ME still tap through; offline (airplane
mode, nothing cached) shows the plain offline map with no cover."
