/**
 * Route-asset suite — the "fake it" map (no native module, no tiles).
 *
 * The load-bearing check is cross-language: the PNG is drawn by a Python
 * renderer, the dot is placed by TypeScript at runtime. If those two ever
 * disagree about where a lat/lon lands, the dot drifts off the road and
 * nothing else in the app notices. So every gate's stored pixel — written by
 * the renderer — must be reproduced by projectToPixel() to sub-pixel accuracy.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, loadJson, test, TESTS_DIR } from './lib.ts';
import {
  cropFor, gateTickPx, metresPerPixel, offRouteM, projectToPixel,
  type RouteAsset,
} from '../src/ui/routeMapMath.ts';

interface Manifest { schemaVersion: number; projection: string; routes: Record<string, RouteAsset> }

const manifest = loadJson<Manifest>(
  path.join(TESTS_DIR, '..', 'assets', 'routes', 'routes.json'));

test('routemap: every ratified route has an asset with its five gates', () => {
  const catalog = loadJson<{ routes: { refLineId: string }[] }>(
    path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  const catalogRefIds = new Set(catalog.routes.map((r) => r.refLineId));
  const assetIds = new Set(Object.keys(manifest.routes));
  for (const refId of catalogRefIds) {
    assert(assetIds.has(refId), `catalog route refLineId ${refId} has no asset in routes.json`);
  }
  for (const assetId of assetIds) {
    assert(catalogRefIds.has(assetId), `routes.json asset ${assetId} is not referenced by any catalog route`);
  }
  assert(manifest.projection === 'web-mercator',
    'the projection must stay Web Mercator so a real basemap could line up later');
  for (const [id, a] of Object.entries(manifest.routes)) {
    assert(a.gates.length === 5, `${id}: expected START+G1..G3+FINISH, got ${a.gates.length}`);
    assert(a.w > 0 && a.h > 0 && a.scale > 0, `${id}: broken asset dimensions`);
  }
});

test('routemap: TS projection reproduces the Python renderer to sub-pixel', () => {
  for (const [id, a] of Object.entries(manifest.routes)) {
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
  const a = manifest.routes.Morning;
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
  const a = manifest.routes.Morning;
  // WP-E (offRouteM now follows the real road/path, not the straight
  // gate-to-gate chord): a chord midpoint may legitimately read >60m once
  // the road bends, so the on-route probe is a mid-sector PATH vertex
  // instead of the old gate1/gate2 chord midpoint. Strengthens the check —
  // does not weaken the detour assertion below, which is unchanged.
  assert(!!a.path && a.path.length > 4, 'fixture expected a path for this check');
  const pathMid = a.path![Math.floor(a.path!.length / 2)];
  assert(offRouteM(a, pathMid[0], pathMid[1]) < 30,
    'a point on the drawn path must read as on-route');

  const g1 = a.gates[1];
  const g2 = a.gates[2];
  const mid = { lat: (g1.lat + g2.lat) / 2, lon: (g1.lon + g2.lon) / 2 };
  // ~600 m sideways (0.0085° of longitude at this latitude)
  const off = offRouteM(a, mid.lat, mid.lon + 0.0085);
  assert(off > 300, `a detour must read far off-route, got ${off.toFixed(0)} m`);
});

// ================================================================ WP-E (race-map render fixes)

test('routemap: gateTickPx — midpoint is the gate px/py, length ~30m in px, perpendicular to the path direction', () => {
  for (const [id, a] of Object.entries(manifest.routes)) {
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
  const a = manifest.routes.Morning;
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
    const reads = offRouteM(a, probe[0], probe[1]);
    assert(reads < 30,
      `a path vertex >60m from the gate chord must read <30m via the drawn-path offRouteM, got ${reads.toFixed(0)}m`);
  } else {
    // No bend on this route strays >60m from its own chord — fall back to
    // asserting the path-following behaviour on an interior vertex anyway
    // (still proves offRouteM is measuring the drawn path).
    const [lat, lon] = a.path![Math.floor(a.path!.length / 2)];
    const reads = offRouteM(a, lat, lon);
    assert(reads < 30, `a path vertex must read <30m via the drawn-path offRouteM, got ${reads.toFixed(0)}m`);
  }

  // the existing ~600m detour must still read far off-route
  const g1 = a.gates[1];
  const g2 = a.gates[2];
  const mid = { lat: (g1.lat + g2.lat) / 2, lon: (g1.lon + g2.lon) / 2 };
  const off = offRouteM(a, mid.lat, mid.lon + 0.0085);
  assert(off > 300, `a detour must read far off-route, got ${off.toFixed(0)} m`);
});

test('routemap: the crop centres the rider and never pulls off the image edge', () => {
  const a = manifest.routes.Morning;
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
    path.join(TESTS_DIR, '..', 'src', 'ui', 'routeMapView.tsx'), 'utf8');
  const mapStart = src.indexOf('<M.Map');
  assert(mapStart >= 0, '<M.Map> element not found — has the MapLibre rung moved/been renamed?');
  const nextChild = src.indexOf('<M.Camera', mapStart);
  assert(nextChild > mapStart, '<M.Camera> (first child) not found after <M.Map>');
  const openTag = src.slice(mapStart, nextChild);
  assert(/\bkey=\{styleUrl\}/.test(openTag),
    '<M.Map> must be keyed on styleUrl so a day<->night theme flip fully remounts the native view ' +
    'instead of a prop-only style update (the cycle 023 day-mode rendering bug)');
  assert(/\bmapStyle=\{/.test(openTag), 'mapStyle prop no longer present on <M.Map> — sanity check of the slice');
});

test('routemap: every MapLibre GeoJSONSource carries key === id (frozen-id crash guard, cycle 025)', () => {
  // Same static-guard doctrine as the cycle 023 test above (the component
  // cannot be rendered headlessly). MapLibre freezes a child's `id` prop on
  // first render (useFrozenId) and throws "`id` cannot be changed" if a
  // later render hands the same mounted element a different id — which is
  // exactly what the gatesOnly ternary did when a free (new-landmark) ride
  // ended: id="gates" reconciled in place into id="gate-ticks" and the whole
  // map tree crashed. key === id on EVERY source makes React unmount/remount
  // across any such swap instead of rebinding the id.
  const src = fs.readFileSync(
    path.join(TESTS_DIR, '..', 'src', 'ui', 'routeMapView.tsx'), 'utf8');
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
