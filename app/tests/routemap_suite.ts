/**
 * Route-asset suite — the "fake it" map (no native module, no tiles).
 *
 * The load-bearing check is cross-language: the PNG is drawn by a Python
 * renderer, the dot is placed by TypeScript at runtime. If those two ever
 * disagree about where a lat/lon lands, the dot drifts off the road and
 * nothing else in the app notices. So every gate's stored pixel — written by
 * the renderer — must be reproduced by projectToPixel() to sub-pixel accuracy.
 */
import * as path from 'node:path';
import { assert, loadJson, test, TESTS_DIR } from './lib.ts';
import {
  cropFor, metresPerPixel, offRouteM, projectToPixel,
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

test('routemap: a rider ON the line reads near zero; a detour reads far', () => {
  const a = manifest.routes.Morning;
  const g1 = a.gates[1];
  const g2 = a.gates[2];
  const mid = { lat: (g1.lat + g2.lat) / 2, lon: (g1.lon + g2.lon) / 2 };
  assert(offRouteM(a, mid.lat, mid.lon) < 60,
    'a point on the gate-to-gate line must read as on-route');
  // ~600 m sideways (0.0055° of longitude at this latitude)
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
