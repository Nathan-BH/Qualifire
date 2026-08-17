/**
 * GeoJSON builder suite for the MapLibre route map (B-50) — pure functions,
 * no native module. The load-bearing check is the lon/lat swap: RouteAsset
 * stores [lat, lon], GeoJSON wants [lon, lat]. Get it backwards and the
 * route silently draws in the wrong hemisphere.
 */
import * as path from 'node:path';
import { assert, loadJson, test, TESTS_DIR } from './lib.ts';
import {
  bearingBetween, gatesFeatureCollection, riderFeature, routeBounds, routeLineFeature,
} from '../src/ui/routeMapGeo.ts';
import type { RouteAsset } from '../src/ui/routeMapMath.ts';

interface Manifest { schemaVersion: number; projection: string; routes: Record<string, RouteAsset> }

const manifest = loadJson<Manifest>(
  path.join(TESTS_DIR, '..', 'assets', 'routes', 'routes.json'));

test('routemapgeo: routeLineFeature swaps [lat,lon] -> [lon,lat] and keeps every point', () => {
  for (const [id, a] of Object.entries(manifest.routes)) {
    assert(!!a.path && a.path.length >= 2, `${id}: fixture expected to have a path`);
    const f = routeLineFeature(a);
    assert(f !== null, `${id}: routeLineFeature returned null despite a path`);
    const path0 = a.path!;
    assert(f!.geometry.coordinates.length === path0.length,
      `${id}: coordinate count ${f!.geometry.coordinates.length} != path length ${path0.length}`);
    const [lon0, lat0] = f!.geometry.coordinates[0];
    assert(lon0 === path0[0][1] && lat0 === path0[0][0],
      `${id}: first coordinate [${lon0},${lat0}] is not the swap of path[0] [${path0[0]}]`);
    for (const [lon, lat] of f!.geometry.coordinates) {
      assert(lon > 4.6 && lon < 4.7, `${id}: lon ${lon} out of expected Leuven range — swap regression?`);
      assert(lat > 50.8 && lat < 50.9, `${id}: lat ${lat} out of expected Leuven range — swap regression?`);
    }
  }
});

test('routemapgeo: routeLineFeature is null when the path is missing or too short', () => {
  const base = manifest.routes.Morning;
  const noPath: RouteAsset = { ...base, path: undefined };
  assert(routeLineFeature(noPath) === null, 'missing path must yield null');
  const shortPath: RouteAsset = { ...base, path: [base.path![0]] };
  assert(routeLineFeature(shortPath) === null, 'a single-point path must yield null');
});

test('routemapgeo: gatesFeatureCollection has 5 features and omits colour when absent', () => {
  for (const [id, a] of Object.entries(manifest.routes)) {
    const noColours = gatesFeatureCollection(a);
    assert(noColours.features.length === 5, `${id}: expected 5 gate features, got ${noColours.features.length}`);
    for (const feat of noColours.features) {
      assert(!('colour' in feat.properties), `${id}: no gateColours given but a feature has 'colour'`);
    }

    const withColours = gatesFeatureCollection(a, [null, '#123456', null, null, null]);
    assert(withColours.features.length === 5, `${id}: expected 5 gate features with colours arg`);
    withColours.features.forEach((feat, i) => {
      if (i === 1) {
        assert(feat.properties.colour === '#123456', `${id}: gate 1 expected colour #123456, got ${feat.properties.colour}`);
      } else {
        assert(!('colour' in feat.properties), `${id}: gate ${i} should have no colour property`);
      }
    });
  }
});

test('routemapgeo: gatesFeatureCollection swaps coordinates to [lon,lat]', () => {
  const a = manifest.routes.Morning;
  const fc = gatesFeatureCollection(a);
  fc.features.forEach((feat, i) => {
    const g = a.gates[i];
    assert(feat.geometry.coordinates[0] === g.lon && feat.geometry.coordinates[1] === g.lat,
      `gate ${i}: coordinates [${feat.geometry.coordinates}] do not match [lon,lat] of gate`);
  });
});

test('routemapgeo: riderFeature swaps [lat,lon] -> [lon,lat]', () => {
  const f = riderFeature(50.8360, 4.6400);
  assert(f.geometry.coordinates[0] === 4.6400 && f.geometry.coordinates[1] === 50.8360,
    `riderFeature coordinates [${f.geometry.coordinates}] are not the [lon,lat] swap`);
});

test('routemapgeo: routeBounds contains every gate and has min<max on both axes', () => {
  for (const [id, a] of Object.entries(manifest.routes)) {
    const b = routeBounds(a);
    assert(b !== null, `${id}: routeBounds returned null despite gates/path`);
    assert(b!.minLon < b!.maxLon, `${id}: minLon >= maxLon`);
    assert(b!.minLat < b!.maxLat, `${id}: minLat >= maxLat`);
    for (const g of a.gates) {
      assert(g.lon >= b!.minLon && g.lon <= b!.maxLon, `${id}: gate ${g.name} lon outside bounds`);
      assert(g.lat >= b!.minLat && g.lat <= b!.maxLat, `${id}: gate ${g.name} lat outside bounds`);
    }
  }
});

test('routemapgeo: routeBounds falls back to gates and is null with neither', () => {
  const a = manifest.routes.Morning;
  const noPath: RouteAsset = { ...a, path: undefined };
  const b = routeBounds(noPath);
  assert(b !== null, 'gates-only asset must still produce bounds');
  for (const g of a.gates) {
    assert(g.lon >= b!.minLon && g.lon <= b!.maxLon, 'gate lon outside gates-only bounds');
    assert(g.lat >= b!.minLat && g.lat <= b!.maxLat, 'gate lat outside gates-only bounds');
  }
  const empty: RouteAsset = { ...a, path: undefined, gates: [] };
  assert(routeBounds(empty) === null, 'no path and no gates must yield null');
});

test('routemapgeo: bearingBetween — cardinal directions and range', () => {
  const lat = 50.85;
  const dLat = 0.001;
  const dLon = 0.0016; // ~ same ground distance as dLat at this latitude

  const north = bearingBetween(lat, 4.65, lat + dLat, 4.65);
  assert(Math.abs(north - 0) < 1, `due north expected ~0, got ${north}`);

  const east = bearingBetween(lat, 4.65, lat, 4.65 + dLon);
  assert(Math.abs(east - 90) < 1, `due east expected ~90, got ${east}`);

  const south = bearingBetween(lat, 4.65, lat - dLat, 4.65);
  assert(Math.abs(south - 180) < 1, `due south expected ~180, got ${south}`);

  for (const [lat0, lon0, lat1, lon1] of [
    [50.83, 4.63, 50.87, 4.69], [50.87, 4.69, 50.83, 4.63], [50.85, 4.65, 50.85, 4.65],
  ] as [number, number, number, number][]) {
    const b = bearingBetween(lat0, lon0, lat1, lon1);
    assert(b >= 0 && b < 360, `bearing ${b} out of [0,360) range`);
  }
});
