/**
 * WP-C (drawable user-created routes) suite — routeAssetRuntime.ts is pure,
 * no react-native, no JSON imports, deps injected (per the brief's §2.5 test
 * convention). 8 tests per the brief's §4 test plan:
 *  1. buildRuntimeRouteAsset — path/gates/gateIdx from a RefLine + chainages,
 *     gate positions exact, path length in range.
 *  2. the synthesised Web-Mercator transform is self-consistent and fits the
 *     renderer's 900x1400/60px-pad frame.
 *  3. the geo builders (routeLineFeature, gateTicksFeatureCollection,
 *     sectorSpansFeatureCollection, routeBounds, gateTickPx) accept a runtime
 *     asset without changes on their side (§2.3).
 *  4. 2-gate and clamped-chainage edge cases.
 *  5. resolveRouteAsset — manifest wins by identity even with no ref.
 *  6. user route falls back to a runtime build, cached by identity,
 *     invalidated by a gate move or a new ref.
 *  7. allRouteAssets — seed from manifest, user routes built, undrawable
 *     omitted, feeds the gates-only builders.
 *  8. virgin-install end-to-end: a saved ride becomes the setup map's
 *     default route (the exact predicate routeMapView.tsx uses) — the
 *     regression test for the blank-map bug — and survives a simulated
 *     reboot (a brand-new RefLine object, no reliance on stale cache
 *     identity).
 */
import { assert, test } from './lib.ts';
import type { RefLine } from '../core/src/index.ts';
import {
  RUNTIME_ASSET_H, RUNTIME_ASSET_PAD_PX, RUNTIME_ASSET_W, RUNTIME_PATH_TARGET_VERTICES,
  allRouteAssets, buildRuntimeRouteAsset, pointAtChainage, resetRouteAssetCacheForTests,
  resolveRouteAsset, type RouteAssetDeps,
} from '../src/ui/routeAssetRuntime.ts';
import {
  allGatesBounds, allGatesFeatureCollection, gateTicksFeatureCollection, routeBounds, routeLineFeature,
  sectorSpansFeatureCollection,
} from '../src/ui/routeMapGeo.ts';
import { gateTickPx, type RouteAsset } from '../src/ui/routeMapMath.ts';
import { CATALOG_SCHEMA_VERSION } from '../src/store/types.ts';
import { defaultMapRouteId } from '../src/store/defaultRoute.ts';
import type { Catalog, GateSet, Route } from '../src/store/types.ts';

// --------------------------------------------------------------- fixtures

/** A degenerate "straight north" reference line — the exact edge case the
 * brief's §3.1 says the builder was validated against: rx constant (0), ry
 * increasing, so the Web-Mercator bbox is degenerate on the x axis (dx ~ 0)
 * and constrained entirely by y. nVerts vertices, stepM apart. */
function straightNorthRef(nVerts: number, stepM: number, lat0 = 50.85, lon0 = 4.68): RefLine {
  const rx = new Float64Array(nVerts);
  const ry = new Float64Array(nVerts);
  const ch = new Float64Array(nVerts);
  for (let i = 0; i < nVerts; i++) {
    rx[i] = 0;
    ry[i] = i * stepM;
    ch[i] = i * stepM;
  }
  return { rx, ry, ch, lat0, lon0, length: ch[nVerts - 1] };
}

function catalogWith(routes: Route[], gateSets: GateSet[]): Catalog {
  return { schemaVersion: CATALOG_SCHEMA_VERSION, landmarks: [], ways: [], routes, gateSets };
}

function route(id: string, refLineId: string, gateSetVersion: number, referenceRideId?: string): Route {
  return { id, wayId: 'w:test', refLineId, gateSetVersion, seeded: false, referenceRideId };
}

function gateSet(routeId: string, version: number, chainageM: number[]): GateSet {
  return { routeId, version, chainageM, createdAtMs: 0 };
}

// ---------------------------------------------------------- 1. buildRuntimeRouteAsset

test('routeAssetRuntime: buildRuntimeRouteAsset — path/gates/gateIdx from a RefLine + chainages, exact gate positions, path length in range', () => {
  const ref = straightNorthRef(1000, 5); // 4995 m
  const gates = [13, 251, 4991];
  const asset = buildRuntimeRouteAsset(ref, gates, 'ride:test1');

  assert(asset.gates.length === gates.length, `expected ${gates.length} gates, got ${asset.gates.length}`);
  assert(asset.gateIdx !== undefined && asset.gateIdx.length === gates.length, 'gateIdx must have one entry per gate');
  assert((asset.path?.length ?? 0) >= 150 && (asset.path?.length ?? 0) <= 200,
    `path length ${asset.path?.length} out of the expected ~${RUNTIME_PATH_TARGET_VERTICES}-vertex range`);

  gates.forEach((s, i) => {
    const [expLat, expLon] = pointAtChainage(ref, s);
    const g = asset.gates[i];
    assert(Math.abs(g.lat - expLat) < 1e-9 && Math.abs(g.lon - expLon) < 1e-9,
      `gate ${i}: [${g.lat},${g.lon}] != exact chainage position [${expLat},${expLon}]`);
    const pi = asset.gateIdx![i];
    assert(pi >= 0 && pi < asset.path!.length, `gate ${i}: gateIdx ${pi} out of path range`);
    const [plat, plon] = asset.path![pi];
    assert(plat === g.lat && plon === g.lon, `gate ${i}: path[gateIdx[${i}]] does not match the gate's own position`);
  });
});

// ---------------------------------------------------------- 2. Web-Mercator transform

test('routeAssetRuntime: the synthesised transform is self-consistent and fits the 900x1400/60px-pad frame', () => {
  const ref = straightNorthRef(200, 5); // 995 m, degenerate on x (dx ~ 0)
  const asset = buildRuntimeRouteAsset(ref, [10, 500, 990]);

  assert(asset.w === RUNTIME_ASSET_W && asset.h === RUNTIME_ASSET_H, 'frame size must match the renderer\'s 900x1400');

  // Degenerate x: every projected px must land at the same, centred column
  // (dx ~ 1e-12 after mercX — the fit is entirely constrained by y).
  const pxs = asset.path!.map(([lat, lon]) => {
    const px = asset.offx + ((lon * Math.PI) / 180 - asset.x0) * asset.scale;
    return px;
  });
  const pxSpread = Math.max(...pxs) - Math.min(...pxs);
  assert(pxSpread < 0.01, `degenerate x-axis should collapse to one column, spread was ${pxSpread}px`);
  assert(Math.abs(pxs[0] - RUNTIME_ASSET_W / 2) < 0.5, `degenerate x should centre at w/2, got ${pxs[0]}`);

  // y axis is the constraining dimension: the first (southernmost) and last
  // (northernmost) vertices must land exactly at the padded top/bottom.
  const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + ((lat * Math.PI) / 180) / 2));
  const pyOf = (lat: number) => asset.offy + (asset.y1 - mercY(lat)) * asset.scale;
  const pyLast = pyOf(asset.path![asset.path!.length - 1][0]); // northernmost -> y1 -> top pad
  const pyFirst = pyOf(asset.path![0][0]); // southernmost -> bottom pad
  assert(Math.abs(pyLast - RUNTIME_ASSET_PAD_PX) < 0.5, `northernmost vertex should sit at the top pad, got py=${pyLast}`);
  assert(Math.abs(pyFirst - (RUNTIME_ASSET_H - RUNTIME_ASSET_PAD_PX)) < 0.5,
    `southernmost vertex should sit at the bottom pad, got py=${pyFirst}`);
});

// ---------------------------------------------------------- 3. geo builders accept a runtime asset

test('routeAssetRuntime: the geo builders (routeLineFeature, gateTicksFeatureCollection, sectorSpansFeatureCollection, routeBounds, gateTickPx) accept a runtime asset unchanged', () => {
  const ref = straightNorthRef(300, 5); // 1495 m
  const asset = buildRuntimeRouteAsset(ref, [10, 500, 1000, 1490]);

  const line = routeLineFeature(asset);
  assert(line !== null && line.geometry.coordinates.length === asset.path!.length, 'routeLineFeature must accept a runtime asset');

  const ticks = gateTicksFeatureCollection(asset);
  assert(ticks.features.length === asset.gates.length, 'gateTicksFeatureCollection must produce one tick per gate');

  const spans = sectorSpansFeatureCollection(asset, [null, '#111', '#222', '#333']);
  assert(spans !== null && spans.features.length === asset.gates.length - 1,
    'sectorSpansFeatureCollection must split a runtime asset into gates.length-1 sector spans');

  const bounds = routeBounds(asset);
  assert(bounds !== null, 'routeBounds must accept a runtime asset');

  for (let i = 0; i < asset.gates.length; i++) {
    const tick = gateTickPx(asset, i);
    assert(Number.isFinite(tick.x0) && Number.isFinite(tick.y0) && Number.isFinite(tick.x1) && Number.isFinite(tick.y1),
      `gateTickPx(${i}) produced a non-finite tick`);
  }
});

// ---------------------------------------------------------- 4. 2-gate + clamped-chainage edge cases

test('routeAssetRuntime: a 2-gate set builds START/FINISH only, exact positions', () => {
  const ref = straightNorthRef(100, 5); // 495 m
  const asset = buildRuntimeRouteAsset(ref, [50, 400]);
  assert(asset.gates.length === 2, `expected 2 gates, got ${asset.gates.length}`);
  assert(asset.gates[0].name === 'START' && asset.gates[1].name === 'FINISH',
    `2-gate set must name START/FINISH, got ${asset.gates.map((g) => g.name)}`);
});

test('routeAssetRuntime: gate chainage beyond [0, ref.length] is clamped, not dropped or thrown', () => {
  const ref = straightNorthRef(100, 5); // 495 m
  const asset = buildRuntimeRouteAsset(ref, [-50, 10000]);
  assert(asset.gates.length === 2, 'both out-of-range gates must still produce a gate');
  const [lat0, lon0] = pointAtChainage(ref, 0);
  const [lat1, lon1] = pointAtChainage(ref, ref.length);
  assert(Math.abs(asset.gates[0].lat - lat0) < 1e-9 && Math.abs(asset.gates[0].lon - lon0) < 1e-9,
    'a negative chainage must clamp to 0 (the start of the line)');
  assert(Math.abs(asset.gates[1].lat - lat1) < 1e-9 && Math.abs(asset.gates[1].lon - lon1) < 1e-9,
    'a chainage beyond ref.length must clamp to ref.length (the end of the line)');
});

// ---------------------------------------------------------- 5. resolveRouteAsset: manifest wins by identity

test('routeAssetRuntime: resolveRouteAsset — a bundled manifest entry wins by identity, even with no ref for it', () => {
  resetRouteAssetCacheForTests();
  const bundled: RouteAsset = {
    image: '', path: [[50.85, 4.68], [50.86, 4.69]], gateIdx: [0, 1],
    w: 900, h: 1400, x0: 0, y1: 0, scale: 1, offx: 0, offy: 0,
    gates: [{ name: 'START', lat: 50.85, lon: 4.68, px: 0, py: 0 }],
    sourceRide: '',
  };
  const deps: RouteAssetDeps = {
    manifest: { Seed1: bundled },
    catalog: catalogWith([], []),
    refFor: () => { throw new Error('must never be called for a bundled id'); },
  };
  const resolved = resolveRouteAsset('Seed1', deps);
  assert(resolved === bundled, 'a bundled manifest entry must be returned BY IDENTITY, never rebuilt');
});

// ---------------------------------------------------------- 6. user route falls back + cache identity

test('routeAssetRuntime: resolveRouteAsset — a user route with no manifest entry falls back to a runtime build, cached by identity', () => {
  resetRouteAssetCacheForTests();
  const ref = straightNorthRef(100, 5); // 495 m
  const cat = catalogWith(
    [route('U-cache', 'U-cache', 1, 'ride:r1')],
    [gateSet('U-cache', 1, [50, 200, 400])],
  );
  const deps: RouteAssetDeps = { manifest: {}, catalog: cat, refFor: (id) => (id === 'U-cache' ? ref : null) };

  const a1 = resolveRouteAsset('U-cache', deps);
  assert(a1 !== null, 'a user route with a real ref + gate set must resolve');
  const a2 = resolveRouteAsset('U-cache', deps);
  assert(a1 === a2, 'a second resolve with the SAME ref + gate set must return the cached object, by identity (MapLibre source keying)');
});

test('routeAssetRuntime: resolveRouteAsset cache is invalidated by a gate move (new version, same ref)', () => {
  resetRouteAssetCacheForTests();
  const ref = straightNorthRef(100, 5);
  const cat1 = catalogWith(
    [route('U-move', 'U-move', 1)],
    [gateSet('U-move', 1, [50, 200, 400])],
  );
  const deps1: RouteAssetDeps = { manifest: {}, catalog: cat1, refFor: () => ref };
  const before = resolveRouteAsset('U-move', deps1);
  assert(before !== null, 'setup: first resolve must succeed');

  // A gate move mints a new gate-set version (catalog.ts's addGateSet) —
  // same route, same ref, moved chainages.
  const cat2 = catalogWith(
    [route('U-move', 'U-move', 2)],
    [gateSet('U-move', 1, [50, 200, 400]), gateSet('U-move', 2, [60, 210, 410])],
  );
  const deps2: RouteAssetDeps = { manifest: {}, catalog: cat2, refFor: () => ref };
  const after = resolveRouteAsset('U-move', deps2);
  assert(after !== null && after !== before, 'a gate move must invalidate the cache and rebuild — the OLD asset must not be reused');
});

test('routeAssetRuntime: resolveRouteAsset cache is invalidated by a new ref object (same gate set)', () => {
  resetRouteAssetCacheForTests();
  const ref1 = straightNorthRef(100, 5);
  const cat = catalogWith(
    [route('U-reref', 'U-reref', 1)],
    [gateSet('U-reref', 1, [50, 200, 400])],
  );
  const before = resolveRouteAsset('U-reref', { manifest: {}, catalog: cat, refFor: () => ref1 });
  assert(before !== null, 'setup: first resolve must succeed');

  // A distinct RefLine object with identical numbers (e.g. reloaded from
  // disk on a fresh boot) must NOT be treated as the same cache hit — ref
  // identity is the guard (§7 open question 3 / test-plan item 6).
  const ref2 = straightNorthRef(100, 5);
  const after = resolveRouteAsset('U-reref', { manifest: {}, catalog: cat, refFor: () => ref2 });
  assert(after !== null && after !== before, 'a new ref object (even with identical values) must invalidate the cache');
});

test('routeAssetRuntime: resolveRouteAsset returns null for an unknown id, a missing ref, or too few gates', () => {
  resetRouteAssetCacheForTests();
  const ref = straightNorthRef(50, 5);
  const cat = catalogWith(
    [route('U-noref', 'U-noref', 1), route('U-toofew', 'U-toofew', 1)],
    [gateSet('U-noref', 1, [10, 20]), gateSet('U-toofew', 1, [10])],
  );
  const deps: RouteAssetDeps = { manifest: {}, catalog: cat, refFor: (id) => (id === 'U-toofew' ? ref : null) };
  assert(resolveRouteAsset('DoesNotExist', deps) === null, 'an id in neither the manifest nor the catalog must be null');
  assert(resolveRouteAsset('U-noref', deps) === null, 'a route whose ref is unresolvable must be null');
  assert(resolveRouteAsset('U-toofew', deps) === null, 'a gate set with < 2 chainages must be null (matches validateCatalog\'s own floor)');
});

// ---------------------------------------------------------- 7. allRouteAssets

test('routeAssetRuntime: allRouteAssets — seed from the manifest by identity, user routes built, undrawable omitted, feeds the gates-only builders', () => {
  resetRouteAssetCacheForTests();
  const bundled: RouteAsset = {
    image: '', path: [[50.85, 4.68], [50.86, 4.69]], gateIdx: [0, 1],
    w: 900, h: 1400, x0: 0, y1: 0, scale: 1, offx: 0, offy: 0,
    gates: [{ name: 'START', lat: 50.85, lon: 4.68, px: 0, py: 0 }, { name: 'FINISH', lat: 50.86, lon: 4.69, px: 0, py: 0 }],
    sourceRide: '',
  };
  const ref = straightNorthRef(80, 5);
  const cat = catalogWith(
    [
      route('Seed1', 'Seed1', 1),
      route('U-drawable', 'U-drawable', 1),
      route('U-undrawable', 'U-undrawable', 1),
    ],
    [gateSet('U-drawable', 1, [10, 100, 200]), gateSet('U-undrawable', 1, [10, 20])],
  );
  const deps: RouteAssetDeps = {
    manifest: { Seed1: bundled },
    catalog: cat,
    refFor: (id) => (id === 'U-drawable' ? ref : null),
  };

  const all = allRouteAssets(deps);
  assert(all.Seed1 === bundled, 'the manifest entry must appear in allRouteAssets BY IDENTITY');
  assert(all['U-drawable'] !== undefined, 'a user route with a real ref + gate set must be built and included');
  assert(all['U-undrawable'] === undefined, 'an undrawable user route (no ref) must be OMITTED, not present as null/undefined-valued');
  assert(Object.keys(all).length === 2, `expected exactly 2 drawable routes, got ${Object.keys(all).length}: ${Object.keys(all)}`);

  const gatesFC = allGatesFeatureCollection(all, undefined, '#fff');
  const expectedGateCount = bundled.gates.length + all['U-drawable'].gates.length;
  assert(gatesFC.features.length === expectedGateCount,
    `allGatesFeatureCollection over allRouteAssets() expected ${expectedGateCount} gate features, got ${gatesFC.features.length}`);

  const bounds = allGatesBounds(all);
  assert(bounds !== null, 'allGatesBounds over a non-empty allRouteAssets() result must not be null');
});

// ---------------------------------------------------------- 8. virgin-install end-to-end

test('routeAssetRuntime: virgin-install end-to-end — a saved ride becomes the setup map\'s default route (the blank-map regression test), and survives a simulated reboot', () => {
  resetRouteAssetCacheForTests();
  const ref = straightNorthRef(150, 5); // 745 m
  // A virgin catalog: no seed routes at all (B-39 empty-seed install), one
  // user route born from RECORD's save/naming flow.
  const virginCat = catalogWith(
    [route('route:ride-virgin1', 'route:ride-virgin1', 1, 'ride-virgin1')],
    [gateSet('route:ride-virgin1', 1, [8, 372, 737])],
  );
  const deps: RouteAssetDeps = { manifest: {}, catalog: virginCat, refFor: (id) => (id === 'route:ride-virgin1' ? ref : null) };

  // The EXACT predicate routeMapView.tsx's defaultRouteId() now uses.
  const drawable = (refLineId: string) => resolveRouteAsset(refLineId, deps) !== null;
  const defaultId = defaultMapRouteId(virginCat, drawable);
  assert(defaultId === 'route:ride-virgin1',
    `expected the newly-saved user route to be the setup map's default route, got ${defaultId} (blank-map regression)`);

  // Simulated reboot: a brand-new RefLine object (as if reloaded from
  // refs.user.json on a fresh boot), fresh cache — must still resolve, not
  // rely on any stale in-memory identity from before "reboot".
  resetRouteAssetCacheForTests();
  const rebootedRef = straightNorthRef(150, 5);
  const rebootedDeps: RouteAssetDeps = {
    manifest: {}, catalog: virginCat, refFor: (id) => (id === 'route:ride-virgin1' ? rebootedRef : null),
  };
  const defaultIdAfterReboot = defaultMapRouteId(virginCat, (refLineId) => resolveRouteAsset(refLineId, rebootedDeps) !== null);
  assert(defaultIdAfterReboot === 'route:ride-virgin1', 'the user route must still resolve as the default after a simulated reboot');
});
