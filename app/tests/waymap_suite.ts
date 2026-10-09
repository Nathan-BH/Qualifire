/**
 * Route-asset suite — the "fake it" map (no native module, no tiles).
 *
 * The projection checks are cross-language history: the seed assets' px/py were written by a
 * Python renderer and must still be reproduced by projectToPixel() (wayAssetRuntime.ts builds
 * runtime assets in the same frame). The PNG fallback rung itself was retired in virgin-cycle22 05;
 * the static guards below pin the one remaining (MapLibre) rung.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, loadJson, test, TESTS_DIR } from './lib.ts';
import {
  cropFor, gateTickPx, metresPerPixel, offWayM, projectToPixel,
  type WayAsset,
} from '../src/ui/wayMapMath.ts';

interface Manifest { schemaVersion: number; projection: string; ways: Record<string, WayAsset> }

const manifest = loadJson<Manifest>(
  path.join(TESTS_DIR, '..', 'assets', 'ways', 'ways.json'));

test('routemap: every ratified route has an asset with its five gates', () => {
  const catalog = loadJson<{ ways: { refLineId: string }[] }>(
    path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  const catalogRefIds = new Set(catalog.ways.map((r) => r.refLineId));
  const assetIds = new Set(Object.keys(manifest.ways));
  for (const refId of catalogRefIds) {
    assert(assetIds.has(refId), `catalog route refLineId ${refId} has no asset in routes.json`);
  }
  for (const assetId of assetIds) {
    assert(catalogRefIds.has(assetId), `routes.json asset ${assetId} is not referenced by any catalog route`);
  }
  assert(manifest.projection === 'web-mercator',
    'the projection must stay Web Mercator so a real basemap could line up later');
  for (const [id, a] of Object.entries(manifest.ways)) {
    assert(a.gates.length === 5, `${id}: expected START+G1..G3+FINISH, got ${a.gates.length}`);
    assert(a.w > 0 && a.h > 0 && a.scale > 0, `${id}: broken asset dimensions`);
  }
});

test('routemap: every gate sits on its own drawn path (cycle 025 EveningA map-line fix)', () => {
  // The visual invariant the live map depends on: the vector line drawn from
  // `path` must pass through the route's own gates. EveningA's path was built
  // from a ride whose start deviates ~183 m from the START gate, so the
  // RECORD/armed and running maps drew a line off the first gate while GPS
  // timing (which reads tests/fixtures/refs.json, never this file) stayed
  // correct (Nathan, 2026-08-27). Distance is to the nearest path VERTEX
  // (~37 m spacing); worst healthy gate today reads 19.7 m, the bug 182.8 m —
  // 60 m splits them with 3x margin each way.
  for (const [id, a] of Object.entries(manifest.ways)) {
    assert(!!a.path && a.path.length >= 2, `${id}: asset has no drawable path`);
    for (const g of a.gates) {
      let best = Infinity;
      for (const [lat, lon] of a.path!) {
        const dm = Math.hypot(
          (lat - g.lat) * 111320,
          (lon - g.lon) * 111320 * Math.cos((g.lat * Math.PI) / 180));
        if (dm < best) best = dm;
      }
      assert(best < 60, `${id}/${g.name}: drawn path misses the gate by ${best.toFixed(1)} m`);
    }
  }
});

test('routemap: TS projection reproduces the Python renderer to sub-pixel', () => {
  for (const [id, a] of Object.entries(manifest.ways)) {
    for (const g of a.gates) {
      const p = projectToPixel(a, g.lat, g.lon);
      const err = Math.hypot(p.px - g.px, p.py - g.py);
      assert(err < 0.5, `${id}/${g.name}: renderer and runtime disagree by ${err.toFixed(2)} px`);
      assert(p.px >= 0 && p.px <= a.w && p.py >= 0 && p.py <= a.h,
        `${id}/${g.name}: gate falls outside the image`);
    }
  }
});

test('routemap: gates sit in ride order down the image, and the scale is sane', () => {
  const a = manifest.ways.Morning;
  // consecutive gates are real distances apart — 1.1–1.6 km on this track
  for (let i = 1; i < a.gates.length; i++) {
    const d = Math.hypot(a.gates[i].px - a.gates[i - 1].px, a.gates[i].py - a.gates[i - 1].py)
      * metresPerPixel(a, a.gates[i].lat);
    assert(d > 400 && d < 3000, `gate ${i}: ${d.toFixed(0)} m apart is implausible`);
  }
  const mpp = metresPerPixel(a, 50.85);
  assert(mpp > 1 && mpp < 20, `${mpp.toFixed(1)} m/px — the crop would be unusable`);
});

test('routemap: a rider ON the drawn path reads near zero; a detour reads far', () => {
  const a = manifest.ways.Morning;
  // WP-E (offRouteM now follows the real road/path, not the straight
  // gate-to-gate chord): a chord midpoint may legitimately read >60m once
  // the road bends, so the on-route probe is a mid-sector PATH vertex
  // instead of the old gate1/gate2 chord midpoint. Strengthens the check —
  // does not weaken the detour assertion below, which is unchanged.
  assert(!!a.path && a.path.length > 4, 'fixture expected a path for this check');
  const pathMid = a.path![Math.floor(a.path!.length / 2)];
  assert(offWayM(a, pathMid[0], pathMid[1]) < 30,
    'a point on the drawn path must read as on-route');

  const g1 = a.gates[1];
  const g2 = a.gates[2];
  const mid = { lat: (g1.lat + g2.lat) / 2, lon: (g1.lon + g2.lon) / 2 };
  // ~600 m sideways (0.0085° of longitude at this latitude)
  const off = offWayM(a, mid.lat, mid.lon + 0.0085);
  assert(off > 300, `a detour must read far off-route, got ${off.toFixed(0)} m`);
});

// ================================================================ WP-E (race-map render fixes)

test('routemap: gateTickPx — midpoint is the gate px/py, length ~30m in px, perpendicular to the path direction', () => {
  for (const [id, a] of Object.entries(manifest.ways)) {
    for (let i = 0; i < a.gates.length; i++) {
      const g = a.gates[i];
      const tick = gateTickPx(a, i);
      const midX = (tick.x0 + tick.x1) / 2;
      const midY = (tick.y0 + tick.y1) / 2;
      assert(Math.abs(midX - g.px) < 0.01 && Math.abs(midY - g.py) < 0.01,
        `${id}/${g.name}: tick midpoint (${midX},${midY}) != gate px/py (${g.px},${g.py})`);

      const lenPx = Math.hypot(tick.x1 - tick.x0, tick.y1 - tick.y0);
      const expectedLenPx = 30 / metresPerPixel(a, g.lat);
      const relErr = Math.abs(lenPx - expectedLenPx) / expectedLenPx;
      assert(relErr < 0.05,
        `${id}/${g.name}: tick length ${lenPx.toFixed(2)}px vs expected ${expectedLenPx.toFixed(2)}px (${(relErr * 100).toFixed(1)}% off)`);

      // perpendicular to the path direction — dot product of the tick
      // vector with the heading vector should be ~0
      let dirX: number, dirY: number;
      if (a.path && a.gateIdx && a.gateIdx.length === a.gates.length) {
        const j = a.gateIdx[i];
        const jPrev = Math.max(j - 1, 0);
        const jNext = Math.min(j + 1, a.path.length - 1);
        const p0 = projectToPixel(a, a.path[jPrev][0], a.path[jPrev][1]);
        const p1 = projectToPixel(a, a.path[jNext][0], a.path[jNext][1]);
        dirX = p1.px - p0.px; dirY = p1.py - p0.py;
      } else {
        const iPrev = Math.max(i - 1, 0);
        const iNext = Math.min(i + 1, a.gates.length - 1);
        dirX = a.gates[iNext].px - a.gates[iPrev].px;
        dirY = a.gates[iNext].py - a.gates[iPrev].py;
      }
      const tickX = tick.x1 - tick.x0;
      const tickY = tick.y1 - tick.y0;
      const dirLen = Math.hypot(dirX, dirY) || 1;
      const tickLen = Math.hypot(tickX, tickY) || 1;
      const cosAngle = (dirX * tickX + dirY * tickY) / (dirLen * tickLen);
      assert(Math.abs(cosAngle) < 0.05,
        `${id}/${g.name}: tick not perpendicular to the path direction (cos=${cosAngle.toFixed(3)})`);
    }
  }
});

test('routemap: offRouteM measures against the drawn path, not the gate-to-gate chord', () => {
  const a = manifest.ways.Morning;
  assert(!!a.path && a.path.length > 2, 'fixture expected a path for this check');

  // the OLD gate-chord-only distance, to find a path vertex the chord-based
  // measure would have called far off-route (proving the fix actually
  // switched reference lines, not just changed a number)
  const chordDist = (lat: number, lon: number): number => {
    const p = projectToPixel(a, lat, lon);
    let best = Infinity;
    for (let i = 1; i < a.gates.length; i++) {
      const g0 = a.gates[i - 1];
      const g1 = a.gates[i];
      const vx = g1.px - g0.px;
      const vy = g1.py - g0.py;
      const len2 = vx * vx + vy * vy || 1;
      let t = ((p.px - g0.px) * vx + (p.py - g0.py) * vy) / len2;
      t = Math.max(0, Math.min(1, t));
      const dx = p.px - (g0.px + t * vx);
      const dy = p.py - (g0.py + t * vy);
      best = Math.min(best, Math.hypot(dx, dy));
    }
    return best * metresPerPixel(a, lat);
  };

  let probe: [number, number] | null = null;
  for (const [lat, lon] of a.path!) {
    if (chordDist(lat, lon) > 60) { probe = [lat, lon]; break; }
  }
  if (probe) {
    const reads = offWayM(a, probe[0], probe[1]);
    assert(reads < 30,
      `a path vertex >60m from the gate chord must read <30m via the drawn-path offRouteM, got ${reads.toFixed(0)}m`);
  } else {
    // No bend on this route strays >60m from its own chord — fall back to
    // asserting the path-following behaviour on an interior vertex anyway
    // (still proves offRouteM is measuring the drawn path).
    const [lat, lon] = a.path![Math.floor(a.path!.length / 2)];
    const reads = offWayM(a, lat, lon);
    assert(reads < 30, `a path vertex must read <30m via the drawn-path offRouteM, got ${reads.toFixed(0)}m`);
  }

  // the existing ~600m detour must still read far off-route
  const g1 = a.gates[1];
  const g2 = a.gates[2];
  const mid = { lat: (g1.lat + g2.lat) / 2, lon: (g1.lon + g2.lon) / 2 };
  const off = offWayM(a, mid.lat, mid.lon + 0.0085);
  assert(off > 300, `a detour must read far off-route, got ${off.toFixed(0)} m`);
});

test('routemap: the crop centres the rider and never pulls off the image edge', () => {
  const a = manifest.ways.Morning;
  const VW = 360, VH = 190;
  const mid = projectToPixel(a, a.gates[2].lat, a.gates[2].lon);
  const c = cropFor(a, mid, VW, VH, 4);
  const onScreenX = mid.px * c.scale + c.translateX;
  const onScreenY = mid.py * c.scale + c.translateY;
  assert(onScreenX > 0 && onScreenX < VW && onScreenY > 0 && onScreenY < VH,
    'the rider must be inside the viewport');
  assert(Math.abs(onScreenX - VW / 2) < 1 && Math.abs(onScreenY - VH / 2) < 1,
    'and centred when the image is big enough to allow it');

  // at the START gate the clamp should kick in rather than showing blank space
  const start = projectToPixel(a, a.gates[0].lat, a.gates[0].lon);
  const cs = cropFor(a, start, VW, VH, 4);
  assert(cs.translateX <= 0 && cs.translateY <= 0, 'no gap at the left/top edge');
  assert(a.w * cs.scale + cs.translateX >= VW - 0.001, 'no gap at the right edge');
  assert(a.h * cs.scale + cs.translateY >= VH - 0.001, 'no gap at the bottom edge');

  // zoom 1 shows the whole route
  const whole = cropFor(a, mid, VW, VH, 1);
  assert(a.w * whole.scale <= VW + 0.001 && a.h * whole.scale <= VH + 0.001,
    'zoom 1 must fit the entire route in the viewport');
});

// --------------------------------------------------------- MapLibre rung
//
// The MapLibre rung (routeMapView.tsx's <M.Map>) imports react-native and
// @maplibre/maplibre-react-native — it cannot be mounted/rendered in this
// headless Node suite (same reason launchAnimation.tsx's Animated-driven
// choreography is proven only via its pure launchChoreo.ts sibling, not by
// rendering the component). This is therefore a STATIC source guard, not a
// behavioural one: it locks in that the fix for cycle 023's day-mode
// style-swap race (keying <M.Map> on the theme-driven style URL, forcing a
// full remount instead of a prop-only style update) stays wired, so a future
// edit can't silently drop the key and regress the race. Flagged in the
// executor report: a real render-level regression test would need an RN
// testing harness this repo does not have.

test('routemap: MapLibre <M.Map> remounts on a style-URL change (cycle 023 fix 1 day-mode race)', () => {
  const src = fs.readFileSync(
    path.join(TESTS_DIR, '..', 'src', 'ui', 'wayMapView.tsx'), 'utf8');
  const mapStart = src.indexOf('<M.Map');
  assert(mapStart >= 0, '<M.Map> element not found — has the MapLibre rung moved/been renamed?');
  const nextChild = src.indexOf('<M.Camera', mapStart);
  assert(nextChild > mapStart, '<M.Camera> (first child) not found after <M.Map>');
  const openTag = src.slice(mapStart, nextChild);
  // virgin-cycle22 09: the key is the style RUNG + URL (mapStyleFor), which still changes on a
  // day<->night flip — the cycle-023 guarantee holds through the pure helper (waymapstyle_suite).
  assert(/\bkey=\{mapStyleKey\}/.test(openTag),
    '<M.Map> must be keyed on mapStyleKey (mapStyleFor: rung + styleUrl) so a day<->night theme flip ' +
    'AND every style-rung change fully remount the native view instead of a prop-only style update');
  assert(/\bmapStyle=\{/.test(openTag), 'mapStyle prop no longer present on <M.Map> — sanity check of the slice');
});

test('routemap: every MapLibre GeoJSONSource carries key === id (frozen-id crash guard, cycle 025)', () => {
  // Same static-guard doctrine as the cycle 023 test above (the component
  // cannot be rendered headlessly). MapLibre freezes a child's `id` prop on
  // first render (useFrozenId) and throws "`id` cannot be changed" if a
  // later render hands the same mounted element a different id — which is
  // exactly what happened when a free (new-landmark) ride ended and the
  // map's id assignment flipped between frames: id="gates" reconciled in
  // place into id="gate-ticks" and the whole map tree crashed. key === id on
  // EVERY source makes React unmount/remount across any such swap instead of
  // rebinding the id.
  const src = fs.readFileSync(
    path.join(TESTS_DIR, '..', 'src', 'ui', 'wayMapView.tsx'), 'utf8');
  const tags = src.match(/<M\.GeoJSONSource[^>]*>/g) ?? [];
  assert(tags.length >= 4,
    `expected at least 4 <M.GeoJSONSource> tags (route, gates, gate-ticks, rider), got ${tags.length}`);
  for (const tag of tags) {
    const id = /\bid="([^"]+)"/.exec(tag)?.[1];
    const key = /\bkey="([^"]+)"/.exec(tag)?.[1];
    assert(id !== undefined, `GeoJSONSource without a literal id: ${tag}`);
    assert(key === id,
      `GeoJSONSource id="${id}" must carry key="${id}" so React never rebinds a mounted source's frozen id: ${tag}`);
  }
});

test('routemap: routeId={null} draws NO route — the catalog-wide defaultRouteId() fallback is gone (cycle-2 WP-A)', () => {
  // Same static-guard doctrine as the two tests above (the component cannot
  // be rendered headlessly): this locks the wiring, not the pixels.
  const src = fs.readFileSync(
    path.join(TESTS_DIR, '..', 'src', 'ui', 'wayMapView.tsx'), 'utf8');
  assert(!src.includes('defaultRouteId'),
    'defaultRouteId() must be gone from routeMapView.tsx — routeId={null} must mean "no route line", full stop');
  assert(!src.includes('defaultMapRouteId'),
    'defaultMapRouteId (the store/defaultRoute.ts helper it wrapped) must no longer be imported/consumed here');
  const idAssignments = src.match(/const id = props\.wayId;/g) ?? [];
  assert(idAssignments.length === 1,
    `expected exactly 1 occurrence of "const id = props.wayId;" (one rung since virgin-cycle22 05), got ${idAssignments.length}`);
  assert(!src.includes('props.wayId ??'),
    'no rung may fall back off props.wayId with ?? any more');
});

// ------------------------------------------------------------------- WP-M

test('routemap: <M.Map> carries touchRotate={rotateEnabled} (not a literal false), touchPitch={false}, and an onRegionDidChange handler', () => {
  // Same static-guard doctrine as the cycle 023 test above (the component
  // cannot be rendered headlessly).
  const src = fs.readFileSync(
    path.join(TESTS_DIR, '..', 'src', 'ui', 'wayMapView.tsx'), 'utf8');
  const mapStart = src.indexOf('<M.Map');
  assert(mapStart >= 0, '<M.Map> element not found — has the MapLibre rung moved/been renamed?');
  const nextChild = src.indexOf('<M.Camera', mapStart);
  assert(nextChild > mapStart, '<M.Camera> (first child) not found after <M.Map>');
  const openTag = src.slice(mapStart, nextChild);
  assert(/touchRotate=\{rotateEnabled\}/.test(openTag),
    'touchRotate must be wired to rotateEnabled (WP-M) — a literal touchRotate={false} would mean the ' +
    'rotation gesture is never on anywhere');
  assert(/touchPitch=\{false\}/.test(openTag), 'touchPitch must stay false — WP-M is rotation only, not tilt');
  assert(/onRegionDidChange=/.test(openTag),
    'onRegionDidChange handler not found on <M.Map> — WP-M reads the rider\'s rotation back through it');
});

test('routemap: exactly one zoom bar (MapLibre), no compass button — FIT resets north (virgin-cycle27 08)', () => {
  // Same static-guard doctrine as the tests above.
  const src = fs.readFileSync(
    path.join(TESTS_DIR, '..', 'src', 'ui', 'wayMapView.tsx'), 'utf8');
  const bars = src.match(/st\.zoomBar\b/g) ?? [];
  assert(bars.length === 1, `st.zoomBar must appear exactly once (the MapLibre bar; the style definition is the bare key zoomBar:), got ${bars.length}`);
  const firstZoomBar = src.indexOf('<View style={st.zoomBar}>');
  assert(firstZoomBar >= 0, 'the MapLibre zoom bar <View style={st.zoomBar}> not found');
  const creditTag = src.indexOf('<Credit rung="maplibre"', firstZoomBar);
  assert(creditTag > firstZoomBar, '<Credit rung="maplibre" ...> not found after the zoom bar');
  const mapLibreResets = src.slice(firstZoomBar, creditTag).match(/onPress=\{resetNorth\}/g) ?? [];
  assert(mapLibreResets.length === 0, 'no onPress={resetNorth} button left in the bar (FIT calls resetNorth())');
  assert(!src.includes('accessibilityLabel="Reset map to north up"') && !src.includes('>↑<'), '↑ button retired');
  assert(src.slice(firstZoomBar, creditTag).includes("if (fitMeNext === 'fit' && rotateEnabled) resetNorth();"), 'FIT resets north');
  // Code tokens only (history comments may still say "PNG rung", see the file header).
  // (the asset path is concatenated so easignore_suite's relative-require scanner does not read this line as a require).
  for (const gone of ['PngWayMap', 'setImgFailed', 'setMapFailed', 'onMapFailed', 'const IMAGES', 'MAP IMAGE FAILED', 'needs the tile map', "require('" + '../../assets/ways/', 'rung="png"', 'cropFor(', 'gateTickPx(', 'nearestOnPath(', 'LayoutChangeEvent']) {
    assert(!src.includes(gone), `PNG rung remnant in wayMapView.tsx: ${gone}`);
  }
  assert((src.match(/bundledForSeedMode\(\s*SEED_MODE\b/g) ?? []).length === 1, 'ASSETS is the one remaining bundledForSeedMode(SEED_MODE, ...) site');
  assert(src.includes('offlineMapStyle(t.race.bg)'), 'style-load failure must fall back to offlineMapStyle(t.race.bg)');
  assert(src.includes('onDidFinishLoadingStyle=') && src.includes('onDidFailLoadingMap='), 'both style load callbacks wired on <M.Map>');
  assert(src.includes('>map unavailable<'), 'the ML === null frame carries the map unavailable badge');
});

test('routemap: map credits are an "i" button, never an always-visible label, and the native attribution stays off (virgin-cycle14 brief 05)', () => {
  const src = fs.readFileSync(
    path.join(TESTS_DIR, '..', 'src', 'ui', 'wayMapView.tsx'), 'utf8');
  assert(!src.includes('numberOfLines={1}>{label}'), 'the old always-visible credit label is back');
  assert(!src.includes('st.creditText') && !src.includes("'#2B2B2B'"), 'old credit pill style is back');
  assert(!src.includes('<Modal'), 'the credit card must be in-frame — no Modal in wayMapView.tsx');
  assert(src.includes('accessibilityLabel={`Map data sources: ${label}`}'), 'the "i" button must carry the full credit as its accessibility label');
  assert(src.includes('CREDIT_AUTO_HIDE_MS'), 'the opened card must auto-hide');
  assert((src.match(/<Credit rung="maplibre"/g) ?? []).length === 1, 'MapLibre rung must mount exactly one <Credit>');
  assert((src.match(/<Credit rung="png"/g) ?? []).length === 0, 'no PNG-rung credit may remain (virgin-cycle22 05)');
  const mapStart = src.indexOf('<M.Map');
  const openTag = src.slice(mapStart, src.indexOf('<M.Camera', mapStart));
  assert(/attribution=\{false\}/.test(openTag) && /logo=\{false\}/.test(openTag),
    'native attribution/logo must stay off — the JS <Credit> is the only credit, so both halves of this test guard the licence together');
});

// -------------------------------------------------- virgin-cycle21 03

test('virgin-cycle21 03: the rider source is the last <M.GeoJSONSource> in wayMapView.tsx and no other source is conditionally mounted', () => {
  // MapLibre paints sources in MOUNT order. A source that mounts after the
  // rider source (a late-appearing route, sector spans, gate ticks) paints
  // over the dot, so every source except the rider is mounted from the first
  // render (empty collection when there is nothing to draw) and the rider is last.
  const src = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'wayMapView.tsx'), 'utf8');
  const found: { key: string; idx: number }[] = [];
  const re = /<M\.GeoJSONSource\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const key = /\bkey="([^"]+)"/.exec(src.slice(m.index, m.index + 300))?.[1];
    assert(key !== undefined, `a GeoJSONSource at ${m.index} has no literal key within 300 chars`);
    found.push({ key: key!, idx: m.index });
  }
  assert(found.length >= 6, `only ${found.length} GeoJSONSource elements found`);
  assert(found[found.length - 1].key === 'rider', `the last source is "${found[found.length - 1].key}", want "rider"`);
  for (const f of found) {
    if (f.key === 'rider') continue;
    const before = src.slice(Math.max(0, f.idx - 120), f.idx);
    assert(!/\?\s*\(\s*$/.test(before) && !/&&\s*\(\s*$/.test(before),
      `source "${f.key}" is conditionally mounted (${JSON.stringify(before.slice(-60))}) — it would mount after the rider and paint over the dot`);
  }
  const emptyRefs = src.match(/\bEMPTY_FC\b/g) ?? [];
  assert(emptyRefs.length >= 5, `EMPTY_FC referenced ${emptyRefs.length} times, want >= 5`);
});

test('virgin-cycle22 06: the MapLibre zoom bar has ONE FIT/ME toggle (fitMeNextMode) and no separate ME button', () => {
  const src = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'wayMapView.tsx'), 'utf8');
  const barStart = src.indexOf('<View style={st.zoomBar}>');
  const barEnd = src.indexOf('<Credit rung="maplibre"', barStart);
  assert(barStart >= 0 && barEnd > barStart, 'MapLibre zoom bar not found');
  const bar = src.slice(barStart, barEnd);
  assert((bar.match(/setMode\(fitMeNext\)/g) ?? []).length === 1, 'exactly one toggle press sets fitMeNext');
  assert(!bar.includes("setMode('fit')"), 'no standalone FIT button left');
  assert(!/onPress=\{\(\) => setMode\('follow'\)\}/.test(bar), 'no standalone ME button left');
  assert((bar.match(/setMode\('follow'\)/g) ?? []).length === 2, "+ and − still set 'follow' (and nothing else does)");
  assert((bar.match(/>FIT</g) ?? []).length === 1 && (bar.match(/>ME</g) ?? []).length === 1,
    'FIT and ME each appear once, as literal JSX text (ui-strings entries stay valid)');
  assert(bar.includes("fitMeNext === 'fit'"), 'the label branches on fitMeNext');
  assert(/fitMeNext === 'fit'\s*\?\s*<Text[^>]*>FIT<\/Text>\s*:\s*<Text[^>]*>ME<\/Text>/.test(bar), "label = the NEXT action: fitMeNext 'fit' shows FIT, otherwise ME");
  assert((bar.match(/onPress=\{resetNorth\}/g) ?? []).length === 0, 'compass gone (virgin-cycle27 08)');
  assert(src.includes('const fitMeNext = fitMeNextMode(mode, showRider);'), 'fitMeNext comes from the pure helper');
  assert(src.includes('fitMeNextMode') && src.includes("from './wayMapGeo.ts'"), 'helper imported from wayMapGeo.ts');
  const pressables = (bar.match(/<Pressable/g) ?? []).length;
  assert(pressables === 3, `three Pressables in the bar (+, −, FIT/ME), got ${pressables}`);
});

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

test('virgin-cycle22 09: a patched style is only used for the theme URL it was fetched for (no in-place style swap after a day/night flip)', () => {
  const src = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'wayMapView.tsx'), 'utf8');
  assert(src.includes('url: styleUrl,'), 'the fetched patch is stored with its URL');
  assert(src.includes('patched: patchedStyles?.url === styleUrl ? patchedStyles : null'), 'a stale-theme patch is never handed to mapStyleFor');
});

test('virgin-cycle26 04: wayMapView draws the pass the rider is not on at FAINT_OPACITY (progressM prop, faint paint on route / spans / ticks), cycles stacked gates on tap; the three live surfaces pass progressM', () => {
  const src = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'wayMapView.tsx'), 'utf8');
  assert(src.includes('progressM?: number | null;'), 'progressM prop');
  assert((src.match(/\['case', \['has', 'faint'\], FAINT_OPACITY, 1\]/g) ?? []).length === 5, `faint opacity expression on route-casing, route-core, sector-spans-core, gate-ticks-casing, gate-ticks (want 5), got ${(src.match(/\['has', 'faint'\]/g) ?? []).length}`);
  assert(!src.includes("'line-opacity': 1,"), 'the fixed gate-ticks opacity is gone');
  assert(src.includes('routeRunsFeatureCollection(asset, faintVerts)') && src.includes('buildPassModel(asset)'), 'route FC built from the pass model');
  assert(src.includes('gateTicksFeatureCollection(asset, props.gateColours, gateHalfLen, faintGates)') && src.includes('sectorSpansFeatureCollection(asset, props.sectorColours, props.leadColour, faintGates)'), 'faint gates reach ticks and spans');
  assert(src.includes('nextGateOnTap(hits, props.gateSelect!.selected)') && !src.includes('features?.[0]?.properties?.name'), 'tap handler cycles stacked gates');
  assert(!/['"]line-(dasharray|gradient)['"]/.test(src), 'no dasharray / gradient paint property (2026-08-24 device bug class; comments may name them)');
  const rec = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'RecordScreen.tsx'), 'utf8');
  const demo = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'DemoScreen.tsx'), 'utf8');
  const rep = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'ReplayScreen.tsx'), 'utf8');
  assert(rec.includes('progressM={live.chainageM}'), 'LIVE: engine chainage');
  assert(demo.includes('progressM={progressAtTime(ASSET, script.gateAt, clockS)}'), 'DEMO: progressAtTime');
  assert(rep.includes('progressM={pos ? pos.sM : null}'), 'REPLAY: recorded chainage');
});
