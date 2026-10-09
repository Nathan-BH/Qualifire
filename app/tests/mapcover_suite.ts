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

test('virgin-cycle27 12: the cover lifts on failure, on timeout, or on style loaded + first frame rendered, never earlier', () => {
  const base = { styleFailed: false, styleLoaded: false, firstFrame: false, timedOut: false };
  assert(!mapCoverLifts(base), 'fresh mount stays covered');
  assert(!mapCoverLifts({ ...base, styleLoaded: true }), 'style alone is not enough');
  assert(!mapCoverLifts({ ...base, firstFrame: true }), 'a frame before the style is not enough');
  assert(mapCoverLifts({ ...base, styleLoaded: true, firstFrame: true }), 'style + first frame lifts');
  assert(mapCoverLifts({ ...base, styleFailed: true }), 'a failed style lifts at once (offline fallback stays visible)');
  assert(mapCoverLifts({ ...base, timedOut: true }), 'the safety timeout lifts');
  assert(MAP_COVER_FADE_MS >= 150 && MAP_COVER_FADE_MS <= 250, 'short fade');
  assert(MAP_COVER_TIMEOUT_MS >= 1500 && MAP_COVER_TIMEOUT_MS <= 3000, 'bounded timeout, a safety net only');
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
    assert(s.includes('patched: patchedStyles?.url === styleUrl ? patchedStyles : cachedPatchedStyles(styleUrl),'), `${f}: stale-theme guard intact, cached copies of the new URL used at once`);
    assert(/setPatchedStyles\(rememberPatchedStyles\(\{[\s\S]*?\}\)\);\s*setStyleFailed\(false\);/.test(s), `${f}: a recovered style clears styleFailed`);
  }
});

test('virgin-cycle27 12: both map views mount a themed, touch-transparent cover above the native map and below the controls, wired to the native style/frame events', () => {
  for (const f of ['wayMapView.tsx', 'catalogMapView.tsx']) {
    const s = src('src', 'ui', f);
    assert(s.includes("import { MapCover, useMapCover } from './mapCover.tsx';"), `${f}: cover imported`);
    assert(s.includes('const cover = useMapCover(mapStyleKey, styleFailed);'), `${f}: one cover per native mount (keyed), failure lifts it`);
    assert(s.includes('onDidFinishLoadingStyle={() => { styleLoadedRef.current = true; cover.onStyleLoaded(); }}'), `${f}: style loaded reaches the cover`);
    assert(s.includes('onDidFinishRenderingFrame={cover.onFirstFrame}'), `${f}: first rendered frame reaches the cover`);
    assert(s.includes('onDidFinishRenderingFrameFully={cover.onFirstFrame}'), `${f}: fully rendered frame reaches the cover`);
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

test('virgin-cycle29 01: the cover state is per key (A -> B -> A gets a fresh opaque cover): no goneKey, seen.gone lives in the keyed memo', () => {
  const mc = src('src', 'ui', 'mapCover.tsx');
  assert(!mc.includes('goneKey'), 'goneKey state is gone');
  assert(mc.includes('gone: false }'), 'gone starts false inside the useMemo([key]) object');
  assert(mc.includes('return { covered: !seen.gone,'), 'covered reads the per-key flag');
});

test('virgin-cycle29 01 (inspector M1): a frame reported before the style has loaded is ignored by the cover', () => {
  const mc = src('src', 'ui', 'mapCover.tsx');
  assert(mc.includes('if (!seen.styleLoaded) return; seen.firstFrame = true;'), 'onFirstFrame ignores frames until the style has loaded');
});
