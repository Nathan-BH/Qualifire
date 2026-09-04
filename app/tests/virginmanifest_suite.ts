/**
 * WP-E (virgin manifest gate-leak) suite — pins Nathan's Q6 ruling ("remove
 * everything that's bundled ... it should only use what is actually made on
 * the phone") in executable form: store/seed.ts's `bundledForSeedMode()` is
 * the single policy point that empties the bundled route manifest and the
 * three bundled route PNGs on an empty-seed (virgin) build, applied at their
 * two definition sites in ui/routeMapView.tsx; DemoScreen's SECOND RIDE is
 * decoupled from routes.json via its own frozen fixture (demoRouteFixture.ts)
 * drawn through RouteMapView's new `asset` prop.
 *
 * seed.ts statically imports bare `.json` (catalog.seed.json/results.seed.
 * json), so — same fix as demo_suite.ts/catalogstore_suite.ts — register the
 * JSON `registerHooks` shim first, then pull seed.ts and demoModel.ts in
 * DYNAMICALLY. Everything else under test here is pure with no bare-JSON
 * imports of its own, so it is imported statically.
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, loadJson, test, TESTS_DIR } from './lib.ts';
import type { RefLine } from '../core/src/index.ts';
import {
  allRouteAssets, resetRouteAssetCacheForTests, resolveRouteAsset, type RouteAssetDeps,
} from '../src/ui/routeAssetRuntime.ts';
import { allGatesBounds, allGatesFeatureCollection } from '../src/ui/routeMapGeo.ts';
import { positionAtTime, type RouteAsset } from '../src/ui/routeMapMath.ts';
import { emptyCatalog } from '../src/store/catalog.ts';
import { CATALOG_SCHEMA_VERSION } from '../src/store/types.ts';
import type { Catalog, GateSet, Route } from '../src/store/types.ts';
import { DEMO_ROUTE_ASSET, DEMO_ROUTE_ID } from '../src/ui/demoRouteFixture.ts';

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = fs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const { bundledForSeedMode } = await import('../src/store/seed.ts');
const { buildDemoScript } = await import('../src/ui/demoModel.ts');

// --------------------------------------------------------------- fixtures
// Copied verbatim from routeasset_runtime_suite.ts (not exported there —
// duplication is the established convention, per that suite's own header).

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

// ------------------------------------------------------------ real manifest

interface Manifest { schemaVersion: number; projection: string; routes: Record<string, RouteAsset> }
const manifest = loadJson<Manifest>(
  path.join(TESTS_DIR, '..', 'assets', 'routes', 'routes.json'));
const routes = manifest.routes;

// ---------------------------------------------------------------- 1

test('bundledForSeedMode: shipped returns the very same object; empty returns {}', () => {
  const m = { a: 1 };
  assert(bundledForSeedMode('shipped', m) === m, "'shipped' must hand back the identical object");
  const empty = bundledForSeedMode('empty', m);
  assert(Object.keys(empty).length === 0, "'empty' must return an object with no keys");
  const empty2 = bundledForSeedMode('empty', m);
  assert(empty !== empty2, "two 'empty' calls must not share a sentinel object (no shared-mutation risk)");
});

// ---------------------------------------------------------------- 2

test('bundledForSeedMode on the REAL manifest: 20 shipped routes, 0 virgin routes', () => {
  const shipped = bundledForSeedMode('shipped', routes);
  assert(Object.keys(shipped).length === 20, `expected 20 shipped routes, got ${Object.keys(shipped).length}`);
  assert('Morning' in shipped, "'Morning' must be present in the shipped manifest");
  const virgin = bundledForSeedMode('empty', routes);
  assert(Object.keys(virgin).length === 0, `expected 0 routes on a virgin build, got ${Object.keys(virgin).length}`);
});

// ---------------------------------------------------------------- 3

test('virgin resolver: no manifest key resolves, no catalog -> nothing drawable', () => {
  resetRouteAssetCacheForTests();
  const deps: RouteAssetDeps = {
    manifest: bundledForSeedMode('empty', routes),
    catalog: emptyCatalog(),
    refFor: () => null,
  };
  for (const id of Object.keys(routes)) {
    assert(resolveRouteAsset(id, deps) === null, `manifest id ${id} must not resolve on a virgin build`);
  }
  assert(Object.keys(allRouteAssets(deps)).length === 0, 'allRouteAssets() must be empty on a virgin build with no catalog');
});

// ---------------------------------------------------------------- 4

test('virgin gates-only field is empty on both builders, unfiltered and filtered', () => {
  resetRouteAssetCacheForTests();
  const deps: RouteAssetDeps = {
    manifest: bundledForSeedMode('empty', routes),
    catalog: emptyCatalog(),
    refFor: () => null,
  };
  const drawable = allRouteAssets(deps);
  assert(
    allGatesFeatureCollection(drawable, undefined, '#000', null).features.length === 0,
    'unfiltered gates-only field must have zero features on a virgin build',
  );
  assert(allGatesBounds(drawable, null) === null, 'unfiltered gates-only bounds must be null on a virgin build');
  assert(
    allGatesFeatureCollection(drawable, undefined, '#000', ['Morning']).features.length === 0,
    "filtered (routeIds=['Morning']) gates-only field must have zero features on a virgin build",
  );
  assert(allGatesBounds(drawable, ['Morning']) === null, 'filtered gates-only bounds must be null on a virgin build');
});

// ---------------------------------------------------------------- 5

test('the pre-WP-E hole, documented: raw shipped manifest handed unfiltered to the gates builders draws 20 routes’ gates', () => {
  const shippedFC = allGatesFeatureCollection(bundledForSeedMode('shipped', routes), undefined, '#000', null);
  assert(shippedFC.features.length > 0, 'the raw shipped manifest handed directly to allGatesFeatureCollection must draw gates');
  assert(allGatesBounds(bundledForSeedMode('shipped', routes), null) !== null, 'and must produce non-null bounds');

  resetRouteAssetCacheForTests();
  const catalogOnly = allRouteAssets({ manifest: routes, catalog: emptyCatalog(), refFor: () => null });
  assert(
    Object.keys(catalogOnly).length === 0,
    "WP-C's catalog-only allRouteAssets() must be {} even with the full manifest injected and an empty catalog " +
      '— the call site was already closed by WP-C; this WP closes the manifest itself',
  );
});

// ---------------------------------------------------------------- 6

test('virgin + one phone-made route: still drawable, built at runtime, never from the manifest', () => {
  resetRouteAssetCacheForTests();
  const catalog = catalogWith(
    [route('route:r1', 'route:r1', 1)],
    [gateSet('route:r1', 1, [0, 250, 495])],
  );
  const deps: RouteAssetDeps = {
    manifest: bundledForSeedMode('empty', routes),
    catalog,
    refFor: () => straightNorthRef(100, 5),
  };
  const asset = resolveRouteAsset('route:r1', deps);
  assert(asset !== null, 'a phone-made route with a ref + gate set must resolve');
  assert(asset!.sourceRide === 'runtime', `expected sourceRide 'runtime', got ${asset!.sourceRide}`);
  assert(asset!.gates.length === 3, `expected 3 gates, got ${asset!.gates.length}`);
  const all = allRouteAssets(deps);
  assert(
    Object.keys(all).length === 1 && Object.keys(all)[0] === 'route:r1',
    `expected allRouteAssets() to have exactly the key 'route:r1', got [${Object.keys(all)}]`,
  );
  assert(
    allGatesFeatureCollection(all, undefined, '#000', null).features.length === 3,
    'the phone-made route’s 3 gates must appear in the gates-only field',
  );
});

// ---------------------------------------------------------------- 7

test('shipped mode is byte-identical: assetDeps-shaped deps with the real manifest resolve Morning to the manifest object itself', () => {
  resetRouteAssetCacheForTests();
  const deps: RouteAssetDeps = {
    manifest: bundledForSeedMode('shipped', routes),
    catalog: emptyCatalog(),
    refFor: () => null,
  };
  assert(resolveRouteAsset('Morning', deps) === routes.Morning, "'Morning' must resolve to the identical manifest object on a shipped build");
});

// ---------------------------------------------------------------- 8

test('demoRouteFixture: self-consistent and replayable', () => {
  assert(DEMO_ROUTE_ID === 'demo:second-ride', `expected DEMO_ROUTE_ID 'demo:second-ride', got ${DEMO_ROUTE_ID}`);
  assert(!(DEMO_ROUTE_ID in routes), 'DEMO_ROUTE_ID must not be a manifest key');
  assert(DEMO_ROUTE_ASSET.image === '', 'demo fixture must carry no PNG (image === "")');
  const gates = DEMO_ROUTE_ASSET.gates;
  const gateIdx = DEMO_ROUTE_ASSET.gateIdx ?? [];
  const pathPts = DEMO_ROUTE_ASSET.path ?? [];
  assert(gates.length === 5, `expected 5 gates, got ${gates.length}`);
  assert(gateIdx.length === 5, `expected 5 gateIdx entries, got ${gateIdx.length}`);
  assert(pathPts.length === 163, `expected 163 path vertices, got ${pathPts.length}`);
  for (let i = 1; i < gateIdx.length; i++) {
    assert(gateIdx[i] > gateIdx[i - 1], `gateIdx must be strictly increasing at index ${i}`);
  }
  for (const idx of gateIdx) {
    assert(idx < pathPts.length, `gateIdx entry ${idx} must be < path.length (${pathPts.length})`);
  }
  for (const [lat, lon] of pathPts) {
    assert(Number.isFinite(lat) && Number.isFinite(lon), `every path vertex must have finite lat/lon, got [${lat}, ${lon}]`);
  }
  // equirectangular distance, own mean latitude — same approach as
  // routeMapGeo.ts's metresBetween / store/catalog.ts's distance helper.
  const distM = (lat0: number, lon0: number, lat1: number, lon1: number): number => {
    const R = 6371000;
    const meanLat = ((lat0 + lat1) / 2) * (Math.PI / 180);
    const dLat = (lat1 - lat0) * (Math.PI / 180);
    const dLon = (lon1 - lon0) * (Math.PI / 180);
    const x = dLon * Math.cos(meanLat);
    return Math.sqrt(x * x + dLat * dLat) * R;
  };
  for (let i = 0; i < gates.length; i++) {
    const [plat, plon] = pathPts[gateIdx[i]];
    const d = distM(plat, plon, gates[i].lat, gates[i].lon);
    assert(d < 25, `gate ${i} (${gates[i].name}) is ${d.toFixed(1)} m from path[gateIdx[${i}]], expected < 25 m`);
  }
  const script = buildDemoScript();
  const pos0 = positionAtTime(DEMO_ROUTE_ASSET, script.gateAt, 0);
  assert(pos0 !== null, 'positionAtTime at t=0 must resolve for the demo fixture');
  const posFinish = positionAtTime(DEMO_ROUTE_ASSET, script.gateAt, script.gateAt[4]);
  assert(posFinish !== null, 'positionAtTime at the FINISH gate time must resolve');
  const dFinish = distM(posFinish!.lat, posFinish!.lon, gates[4].lat, gates[4].lon);
  assert(dFinish < 25, `position at FINISH gate time is ${dFinish.toFixed(1)} m from the FINISH gate, expected < 25 m`);
});

// ---------------------------------------------------------------- 9

test('static guard: routes.json and the route PNGs are referenced only inside routeMapView.tsx, and only through bundledForSeedMode', () => {
  const srcDir = path.join(TESTS_DIR, '..', 'src');
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) files.push(full);
    }
  };
  walk(srcDir);

  const stripComments = (text: string): string =>
    text
      .split('\n')
      .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, '');

  const offenders: string[] = [];
  for (const f of files) {
    const rel = path.relative(srcDir, f).replace(/\\/g, '/');
    const raw = fs.readFileSync(f, 'utf8');
    const code = stripComments(raw);
    if (code.includes('routes.json') || code.includes('assets/routes/')) {
      if (rel !== 'ui/routeMapView.tsx') offenders.push(rel);
    }
  }
  assert(
    offenders.length === 0,
    `routes.json/assets/routes/ referenced (outside comments) in files other than ui/routeMapView.tsx: ${offenders.join(', ')}`,
  );

  const viewSrc = fs.readFileSync(path.join(srcDir, 'ui', 'routeMapView.tsx'), 'utf8');
  // Inspect tightening: the guard must be keyed on the live SEED_MODE constant
  // at both definition sites — a hardcoded mode argument would pass a bare
  // `bundledForSeedMode(` count and silently re-expose the manifest.
  const guardHits = (viewSrc.match(/bundledForSeedMode\(\s*SEED_MODE\b/g) ?? []).length;
  assert(guardHits >= 2, `expected bundledForSeedMode(SEED_MODE, ...) at least twice in routeMapView.tsx, got ${guardHits}`);
  assert(
    viewSrc.includes('import { SEED_MODE, bundledForSeedMode }'),
    'routeMapView.tsx must import SEED_MODE and bundledForSeedMode from store/seed.ts',
  );
  assert(!viewSrc.includes(': ASSETS;'), 'the dead raw-manifest branch (": ASSETS;") must be gone from routeMapView.tsx');

  const demoSrc = fs.readFileSync(path.join(srcDir, 'ui', 'DemoScreen.tsx'), 'utf8');
  assert(!demoSrc.includes('routes.json'), 'DemoScreen.tsx must not reference routes.json');
  assert(!demoSrc.includes("'Morning'"), "DemoScreen.tsx must not reference the 'Morning' literal");
});
