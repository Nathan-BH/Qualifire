/**
 * GeoJSON builder suite for the MapLibre route map (B-50) — pure functions,
 * no native module. The load-bearing check is the lon/lat swap: RouteAsset
 * stores [lat, lon], GeoJSON wants [lon, lat]. Get it backwards and the
 * route silently draws in the wrong hemisphere.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, loadJson, test, TESTS_DIR } from './lib.ts';
import {
  allGatesBounds, allGatesFeatureCollection, bearingBetween, cameraTargetFor, gatesFeatureCollection,
  gateTicksFeatureCollection, metresBetween, riderFeature, routeBounds, routeLineFeature,
  routeSplitFeatures, sectorSpansFeatureCollection,
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
      // Widened cycle 019 (station/church/fosh ways extend east/north of the
      // original 3-route window): 4.6–4.7 -> 4.6–4.73, still tight enough to
      // catch a real lat/lon swap (which would land coordinates in West Africa).
      assert(lon > 4.6 && lon < 4.73, `${id}: lon ${lon} out of expected Leuven range — swap regression?`);
      assert(lat > 50.8 && lat < 50.89, `${id}: lat ${lat} out of expected Leuven range — swap regression?`);
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

test("routemapgeo: gatesFeatureCollection treats an empty-string colour as no colour (B-50 hardening)", () => {
  const a = manifest.routes.Morning;
  const withEmpty = gatesFeatureCollection(a, [null, '', '#123456', null, null]);
  assert(withEmpty.features.length === 5, 'expected 5 gate features with an empty-string colour in the mix');
  withEmpty.features.forEach((feat, i) => {
    if (i === 2) {
      assert(feat.properties.colour === '#123456', `gate 2 expected colour #123456, got ${feat.properties.colour}`);
    } else {
      assert(!('colour' in feat.properties), `gate ${i} should have no colour property (index 1 was '' -> treated as null)`);
    }
  });
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

// ================================================================ WP-B (free ride gates-only map)

test('routemapgeo: allGatesFeatureCollection — unfiltered draws every route\'s gates, tagged with routeId', () => {
  const routeIds = Object.keys(manifest.routes);
  const fc = allGatesFeatureCollection(manifest.routes, undefined, '#ffea00');
  const expectedTotal = routeIds.reduce((n, id) => n + manifest.routes[id].gates.length, 0);
  assert(fc.features.length === expectedTotal,
    `expected ${expectedTotal} total gate features unfiltered, got ${fc.features.length}`);
  for (const feat of fc.features) {
    assert(typeof feat.properties.routeId === 'string' && routeIds.includes(feat.properties.routeId),
      `feature routeId "${feat.properties.routeId}" is not a real catalog route id`);
    assert(!('colour' in feat.properties), 'no crossed list given -> nothing should carry a colour');
  }
});

test('routemapgeo: allGatesFeatureCollection — routeIds restricts to only those routes\' gates', () => {
  const fc = allGatesFeatureCollection(manifest.routes, undefined, '#ffea00', ['Morning', 'MorningB']);
  const expected = manifest.routes.Morning.gates.length + manifest.routes.MorningB.gates.length;
  assert(fc.features.length === expected, `filtered to 2 routes: expected ${expected}, got ${fc.features.length}`);
  assert(fc.features.every((f) => f.properties.routeId === 'Morning' || f.properties.routeId === 'MorningB'),
    'a filtered call must never draw a gate from an excluded route');
});

test('routemapgeo: allGatesFeatureCollection — an empty routeIds filter yields zero features (a genuinely empty direction)', () => {
  const fc = allGatesFeatureCollection(manifest.routes, undefined, '#ffea00', []);
  assert(fc.features.length === 0, `expected 0 features for an empty routeIds filter, got ${fc.features.length}`);
});

test('routemapgeo: allGatesFeatureCollection — only crossed gates get crossedColour', () => {
  const fc = allGatesFeatureCollection(
    manifest.routes, [{ routeId: 'Morning', gateIndex: 1 }], '#ffea00', ['Morning'],
  );
  fc.features.forEach((feat, i) => {
    if (i === 1) {
      assert(feat.properties.colour === '#ffea00', `crossed gate 1 expected colour #ffea00, got ${feat.properties.colour}`);
    } else {
      assert(!('colour' in feat.properties), `gate ${i} should have no colour — it was never crossed`);
    }
  });
});

test('routemapgeo: allGatesBounds — unfiltered spans at least as much as a single-route filter, and contains its gates', () => {
  const full = allGatesBounds(manifest.routes);
  const filtered = allGatesBounds(manifest.routes, ['Morning']);
  assert(full !== null && filtered !== null, 'both should produce bounds');
  const fullArea = (full!.maxLon - full!.minLon) * (full!.maxLat - full!.minLat);
  const filteredArea = (filtered!.maxLon - filtered!.minLon) * (filtered!.maxLat - filtered!.minLat);
  assert(filteredArea <= fullArea + 1e-9, 'a single-route filter must never exceed the full-catalog bounds');
  for (const g of manifest.routes.Morning.gates) {
    assert(g.lon >= filtered!.minLon && g.lon <= filtered!.maxLon, 'Morning gate outside its own filtered bounds');
    assert(g.lat >= filtered!.minLat && g.lat <= filtered!.maxLat, 'Morning gate outside its own filtered bounds');
  }
  assert(allGatesBounds(manifest.routes, []) === null, 'an empty routeIds filter must yield null bounds');
});

test('routemapgeo: metresBetween — zero for an identical fix, ~111km per degree of latitude', () => {
  const lat = 50.85, lon = 4.65;
  assert(metresBetween(lat, lon, lat, lon) === 0, 'identical fix must read 0 m');
  const oneDegLat = metresBetween(lat, lon, lat + 1, lon);
  assert(oneDegLat > 110_000 && oneDegLat < 112_000, `1 degree of latitude should be ~111km, got ${oneDegLat}`);
});

// ================================================================ WP-E (race-map render fixes)

test('routemapgeo: gate ticks — 5 per manifest route, each a 2-point LineString, coords in the Leuven window', () => {
  for (const [id, a] of Object.entries(manifest.routes)) {
    const fc = gateTicksFeatureCollection(a);
    assert(fc.features.length === 5, `${id}: expected 5 gate tick features, got ${fc.features.length}`);
    for (const feat of fc.features) {
      assert(feat.geometry.type === 'LineString', `${id}: expected LineString geometry for a tick`);
      assert(feat.geometry.coordinates.length === 2,
        `${id}: expected a 2-point tick, got ${feat.geometry.coordinates.length}`);
      for (const [lon, lat] of feat.geometry.coordinates) {
        assert(lon > 4.6 && lon < 4.73, `${id}: tick lon ${lon} out of expected Leuven range — swap regression?`);
        assert(lat > 50.8 && lat < 50.89, `${id}: tick lat ${lat} out of expected Leuven range — swap regression?`);
      }
    }
  }
});

test('routemapgeo: gate ticks — 30 m ground length, perpendicular to the local path heading at gateIdx[i]', () => {
  const a = manifest.routes.Morning;
  assert(!!a.path && !!a.gateIdx, 'fixture expected path+gateIdx for this check');
  const fc = gateTicksFeatureCollection(a);
  fc.features.forEach((feat, i) => {
    const [[lon0, lat0], [lon1, lat1]] = feat.geometry.coordinates;
    const lenM = metresBetween(lat0, lon0, lat1, lon1);
    assert(lenM > 29 && lenM < 31, `gate ${i}: tick length ${lenM.toFixed(1)} m expected ~30 m`);

    const j = a.gateIdx![i];
    const jPrev = Math.max(j - 1, 0);
    const jNext = Math.min(j + 1, a.path!.length - 1);
    const p0 = a.path![jPrev];
    const p1 = a.path![jNext];
    const heading = bearingBetween(p0[0], p0[1], p1[0], p1[1]);
    const tickBearing = bearingBetween(lat0, lon0, lat1, lon1);
    let diff = (tickBearing - heading) % 360;
    if (diff < 0) diff += 360;
    if (diff > 180) diff = 360 - diff; // angular distance in [0,180], line has no inherent direction
    assert(Math.abs(diff - 90) < 5,
      `gate ${i}: tick bearing ${tickBearing.toFixed(1)} not ~90° off local heading ${heading.toFixed(1)} (diff ${diff.toFixed(1)})`);
  });
});

test('routemapgeo: gate ticks — colour omitted when unscored, empty string treated as null, supplied colour lands on exactly its gate', () => {
  const a = manifest.routes.Morning;
  const noColours = gateTicksFeatureCollection(a);
  for (const feat of noColours.features) {
    assert(!('colour' in feat.properties), 'no gateColours given but a tick has colour');
  }
  const withColours = gateTicksFeatureCollection(a, [null, '#123456', null, null, null]);
  withColours.features.forEach((feat, i) => {
    if (i === 1) {
      assert(feat.properties.colour === '#123456', `gate 1 expected colour #123456, got ${feat.properties.colour}`);
    } else {
      assert(!('colour' in feat.properties), `gate ${i} should have no colour property`);
    }
  });
  const withEmpty = gateTicksFeatureCollection(a, [null, '', '#123456', null, null]);
  withEmpty.features.forEach((feat, i) => {
    if (i === 2) {
      assert(feat.properties.colour === '#123456', `gate 2 expected colour #123456, got ${feat.properties.colour}`);
    } else {
      assert(!('colour' in feat.properties), `gate ${i} should have no colour (index 1 was '' -> treated as null)`);
    }
  });
});

test('routemapgeo: gate ticks — asset with path/gateIdx stripped still yields 5 ticks (chord-heading fallback)', () => {
  const a = manifest.routes.Morning;
  const stripped: RouteAsset = { ...a, path: undefined, gateIdx: undefined };
  const fc = gateTicksFeatureCollection(stripped);
  assert(fc.features.length === 5, `expected 5 ticks via the chord fallback, got ${fc.features.length}`);
  for (const feat of fc.features) {
    assert(feat.geometry.coordinates.length === 2, 'fallback tick must still be a 2-point LineString');
  }
});

test('routemapgeo: routeSplitFeatures — rider on a mid-path vertex splits into behind/ahead sharing the split coordinate', () => {
  const a = manifest.routes.Morning;
  assert(!!a.path && a.path.length > 4, 'fixture expected a longer path for this check');
  const k = Math.floor(a.path!.length / 2);
  const [lat, lon] = a.path![k];
  const fc = routeSplitFeatures(a, { lat, lon }, { active: true, offRoute: false });
  assert(fc !== null, 'expected a FeatureCollection, got null');
  const behind = fc!.features.find((f) => f.properties.seg === 'behind');
  const ahead = fc!.features.find((f) => f.properties.seg === 'ahead');
  assert(!!behind && !!ahead, 'expected both a behind and an ahead feature');

  const behindLast = behind!.geometry.coordinates[behind!.geometry.coordinates.length - 1];
  const aheadFirst = ahead!.geometry.coordinates[0];
  assert(Math.abs(behindLast[0] - aheadFirst[0]) < 1e-9 && Math.abs(behindLast[1] - aheadFirst[1]) < 1e-9,
    'behind and ahead must share the split coordinate');

  const behindFirst = behind!.geometry.coordinates[0];
  assert(behindFirst[0] === a.path![0][1] && behindFirst[1] === a.path![0][0],
    'behind must start at the swapped path[0]');

  const aheadLast = ahead!.geometry.coordinates[ahead!.geometry.coordinates.length - 1];
  const lastPath = a.path![a.path!.length - 1];
  assert(aheadLast[0] === lastPath[1] && aheadLast[1] === lastPath[0],
    'ahead must end at the swapped last vertex');
});

test('routemapgeo: routeSplitFeatures — active:false is single behind; no/off-route rider is single ahead; pathless asset is null', () => {
  const a = manifest.routes.Morning;
  const rider = { lat: a.path![2][0], lon: a.path![2][1] };

  const notActive = routeSplitFeatures(a, rider, { active: false, offRoute: false });
  assert(notActive !== null && notActive!.features.length === 1 && notActive!.features[0].properties.seg === 'behind',
    'active:false must yield a single whole-line behind feature');

  const noRider = routeSplitFeatures(a, null, { active: true, offRoute: false });
  assert(noRider !== null && noRider!.features.length === 1 && noRider!.features[0].properties.seg === 'ahead',
    'rider:null while active must yield a single whole-line ahead feature');

  const offRouteFC = routeSplitFeatures(a, rider, { active: true, offRoute: true });
  assert(offRouteFC !== null && offRouteFC!.features.length === 1 && offRouteFC!.features[0].properties.seg === 'ahead',
    'offRoute:true while active must yield a single whole-line ahead feature');

  const pathless: RouteAsset = { ...a, path: undefined };
  assert(routeSplitFeatures(pathless, rider, { active: true, offRoute: false }) === null,
    'a pathless asset must yield null, same rule as routeLineFeature');
});

// ================================================================ WP-sector-coloured-trail P1 (Result trace spans)

test('routemapgeo: sector spans — 4 per manifest route, adjacent spans share the gate vertex, ends anchored at gateIdx[0]/gateIdx[last]', () => {
  for (const [id, a] of Object.entries(manifest.routes)) {
    const fc = sectorSpansFeatureCollection(a);
    assert(fc !== null, `${id}: expected a FeatureCollection, got null`);
    assert(fc!.features.length === 4, `${id}: expected 4 sector spans, got ${fc!.features.length}`);
    fc!.features.forEach((feat, k) => {
      assert(feat.geometry.type === 'LineString', `${id}: span ${k} is not a LineString`);
      assert(feat.properties.sector === k + 1, `${id}: span ${k} expected sector ${k + 1}, got ${feat.properties.sector}`);
      assert(feat.geometry.coordinates.length >= 2, `${id}: span ${k} has <2 coordinates`);
      for (const [lon, lat] of feat.geometry.coordinates) {
        assert(lon > 4.6 && lon < 4.73, `${id}: span lon ${lon} out of expected Leuven range — swap regression?`);
        assert(lat > 50.8 && lat < 50.89, `${id}: span lat ${lat} out of expected Leuven range — swap regression?`);
      }
    });
    for (let k = 0; k + 1 < fc!.features.length; k++) {
      const cs = fc!.features[k].geometry.coordinates;
      const endK = cs[cs.length - 1];
      const startNext = fc!.features[k + 1].geometry.coordinates[0];
      assert(endK[0] === startNext[0] && endK[1] === startNext[1],
        `${id}: span ${k} does not end where span ${k + 1} begins`);
      const g = a.path![a.gateIdx![k + 1]];
      assert(endK[0] === g[1] && endK[1] === g[0],
        `${id}: span ${k}/${k + 1} boundary is not the swapped path[gateIdx[${k + 1}]]`);
    }
    const first = fc!.features[0].geometry.coordinates[0];
    const p0 = a.path![a.gateIdx![0]];
    assert(first[0] === p0[1] && first[1] === p0[0], `${id}: first span must start at the swapped path[gateIdx[0]]`);
    const lastCs = fc!.features[fc!.features.length - 1].geometry.coordinates;
    const last = lastCs[lastCs.length - 1];
    const pn = a.path![a.gateIdx![a.gateIdx!.length - 1]];
    assert(last[0] === pn[1] && last[1] === pn[0], `${id}: last span must end at the swapped path[gateIdx[last]]`);
  }
});

test('routemapgeo: sector spans — gate-indexed colour lands on the span ENDING at that gate, \'\' treated as null, none given -> none carried', () => {
  const a = manifest.routes.Morning;
  const none = sectorSpansFeatureCollection(a);
  assert(none !== null, 'expected spans with no colours arg');
  for (const feat of none!.features) {
    assert(!('colour' in feat.properties), 'no sectorColours given but a span carries colour');
  }
  const withColours = sectorSpansFeatureCollection(a, [null, '#A667F0', null, '#3ED598', null]);
  withColours!.features.forEach((feat, k) => {
    const sector = k + 1;
    if (sector === 1) {
      assert(feat.properties.colour === '#A667F0', `sector 1 expected #A667F0, got ${feat.properties.colour}`);
    } else if (sector === 3) {
      assert(feat.properties.colour === '#3ED598', `sector 3 expected #3ED598, got ${feat.properties.colour}`);
    } else {
      assert(!('colour' in feat.properties), `sector ${sector} should carry no colour property`);
    }
  });
  const withEmpty = sectorSpansFeatureCollection(a, [null, '', '#123456', null, null]);
  withEmpty!.features.forEach((feat, k) => {
    if (k + 1 === 2) {
      assert(feat.properties.colour === '#123456', `sector 2 expected #123456, got ${feat.properties.colour}`);
    } else {
      assert(!('colour' in feat.properties), `sector ${k + 1} should carry no colour ('' -> null, B-50 hardening)`);
    }
  });
});

test('routemapgeo: sector spans — null without a path, without gateIdx, or with a gateIdx/gates length mismatch', () => {
  const a = manifest.routes.Morning;
  const pathless: RouteAsset = { ...a, path: undefined };
  assert(sectorSpansFeatureCollection(pathless) === null, 'no path must yield null (fall back to the plain line)');
  const noIdx: RouteAsset = { ...a, gateIdx: undefined };
  assert(sectorSpansFeatureCollection(noIdx) === null, 'no gateIdx must yield null');
  const mismatch: RouteAsset = { ...a, gateIdx: a.gateIdx!.slice(0, 3) };
  assert(sectorSpansFeatureCollection(mismatch) === null, 'gateIdx/gates length mismatch must yield null');
});

test('routemapgeo: sector spans — leadColour appends grey lead-in/lead-out AFTER the 4 sectors; absent -> exactly 4', () => {
  const GREY = '#6f6e6a';
  for (const [id, a] of Object.entries(manifest.routes)) {
    const bare = sectorSpansFeatureCollection(a, undefined, undefined);
    assert(bare !== null && bare!.features.length === 4, `${id}: no leadColour must still yield exactly 4 spans`);
    assert(sectorSpansFeatureCollection(a, undefined, '')!.features.length === 4, `${id}: '' leadColour must be treated as none`);

    const fc = sectorSpansFeatureCollection(a, undefined, GREY)!;
    const path = a.path!, gi = a.gateIdx!;
    const expectIn = gi[0] >= 1;
    const expectOut = gi[gi.length - 1] <= path.length - 2;
    const expected = 4 + (expectIn ? 1 : 0) + (expectOut ? 1 : 0);
    assert(fc.features.length === expected, `${id}: expected ${expected} features with leadColour, got ${fc.features.length}`);
    fc.features.slice(0, 4).forEach((feat, k) => {
      assert(feat.properties.sector === k + 1 && !('lead' in feat.properties), `${id}: features[${k}] must still be sector ${k + 1}`);
      assert(!('colour' in feat.properties), `${id}: sector ${k + 1} must not inherit leadColour`);
    });
    const leads = fc.features.slice(4);
    for (const feat of leads) {
      assert(feat.properties.colour === GREY, `${id}: lead span must carry leadColour`);
      assert(feat.properties.sector < 1 || feat.properties.sector > 4, `${id}: lead sector index ${feat.properties.sector} collides with a real sector`);
    }
    const leadIn = leads.find((f) => f.properties.lead === 'in');
    const leadOut = leads.find((f) => f.properties.lead === 'out');
    assert(!!leadIn === expectIn, `${id}: lead-in presence mismatch (gateIdx[0]=${gi[0]})`);
    assert(!!leadOut === expectOut, `${id}: lead-out presence mismatch`);
    if (leadIn) {
      const cs = leadIn.geometry.coordinates, end = cs[cs.length - 1], g0 = path[gi[0]];
      assert(cs[0][0] === path[0][1] && cs[0][1] === path[0][0], `${id}: lead-in must start at swapped path[0]`);
      assert(end[0] === g0[1] && end[1] === g0[0], `${id}: lead-in must end at swapped path[gateIdx[0]]`);
      assert(leadIn.properties.sector === 0, `${id}: lead-in sector must be 0`);
    }
    if (leadOut) {
      const cs = leadOut.geometry.coordinates, end = cs[cs.length - 1], gN = path[gi[gi.length - 1]], pEnd = path[path.length - 1];
      assert(cs[0][0] === gN[1] && cs[0][1] === gN[0], `${id}: lead-out must start at swapped path[gateIdx[last]]`);
      assert(end[0] === pEnd[1] && end[1] === pEnd[0], `${id}: lead-out must end at swapped path[last]`);
      assert(leadOut.properties.sector === gi.length, `${id}: lead-out sector must be gateIdx.length`);
    }
  }
});

// ============================================================ WP-D (rider-only map camera)

test('routemapgeo: cameraTargetFor — free mode is always {}, regardless of fix/bounds', () => {
  const here = { lat: 50.86, lon: 4.68 };
  const bounds = { minLon: 4.6, minLat: 50.8, maxLon: 4.7, maxLat: 50.85 };
  const got = cameraTargetFor({ mode: 'free', here, bounds, zoom: 16, bearing: 90 });
  assert(Object.keys(got).length === 0, `free mode expected {}, got ${JSON.stringify(got)}`);
  const got2 = cameraTargetFor({ mode: 'free', here: null, bounds: null, zoom: 16, bearing: 0 });
  assert(Object.keys(got2).length === 0, `free mode (no fix/bounds) expected {}, got ${JSON.stringify(got2)}`);
});

test('routemapgeo: cameraTargetFor — fit+bounds returns the bounds tuple, bearing pinned 0, padding 20', () => {
  const bounds = { minLon: 4.6, minLat: 50.8, maxLon: 4.7, maxLat: 50.85 };
  const got = cameraTargetFor({ mode: 'fit', here: { lat: 50.86, lon: 4.68 }, bounds, zoom: 16, bearing: 90 });
  assert(JSON.stringify(got.bounds) === JSON.stringify([4.6, 50.8, 4.7, 50.85]),
    `expected the bounds tuple, got ${JSON.stringify(got.bounds)}`);
  assert(got.bearing === 0, `fit must pin bearing to 0, got ${got.bearing}`);
  assert(JSON.stringify(got.padding) === JSON.stringify({ top: 20, right: 20, bottom: 20, left: 20 }),
    `expected 20px padding on every side, got ${JSON.stringify(got.padding)}`);
  assert(got.center === undefined, 'fit+bounds must not also set center');
});

test('routemapgeo: cameraTargetFor — fit with null bounds degrades to follow (fix if present, else bounds midpoint, else {})', () => {
  const here = { lat: 50.86, lon: 4.68 };
  const withFix = cameraTargetFor({ mode: 'fit', here, bounds: null, zoom: 16, bearing: 45 });
  assert(withFix.bounds === undefined, 'fit+null-bounds must not set bounds');
  assert(JSON.stringify(withFix.center) === JSON.stringify([4.68, 50.86]),
    `fit+null-bounds with a fix expected to follow the fix, got ${JSON.stringify(withFix.center)}`);
  assert(withFix.bearing === 45, `fit+null-bounds with a fix expected the live bearing, got ${withFix.bearing}`);

  const nothing = cameraTargetFor({ mode: 'fit', here: null, bounds: null, zoom: 16, bearing: 0 });
  assert(Object.keys(nothing).length === 0, `fit+null-bounds+no fix expected {}, got ${JSON.stringify(nothing)}`);
});

test('routemapgeo: cameraTargetFor — follow centres on the fix as [lon, lat]', () => {
  const here = { lat: 50.8712, lon: 4.7001 };
  const got = cameraTargetFor({ mode: 'follow', here, bounds: null, zoom: 16, bearing: 30 });
  assert(JSON.stringify(got.center) === JSON.stringify([4.7001, 50.8712]),
    `expected [lon,lat] = [4.7001,50.8712], got ${JSON.stringify(got.center)}`);
  assert(got.zoom === 16 && got.bearing === 30 && got.pitch === 0 && got.duration === 500,
    `expected zoom/bearing/pitch/duration wired through, got ${JSON.stringify(got)}`);
  assert(got.bounds === undefined, 'follow-with-fix must not set bounds');
});

test('routemapgeo: cameraTargetFor — follow with no fix but bounds centres on the bounds midpoint', () => {
  const bounds = { minLon: 4.6, minLat: 50.8, maxLon: 4.8, maxLat: 50.9 };
  const got = cameraTargetFor({ mode: 'follow', here: null, bounds, zoom: 12, bearing: 0 });
  assert(got.center !== undefined
    && Math.abs(got.center[0] - 4.7) < 1e-9 && Math.abs(got.center[1] - 50.85) < 1e-9,
    `expected the bounds midpoint ~[4.7,50.85], got ${JSON.stringify(got.center)}`);
  assert(got.zoom === 12, `expected zoom wired through, got ${got.zoom}`);
});

test('routemapgeo: cameraTargetFor — no fix, no bounds, not free/fit -> {} (no hardcoded real-world fallback)', () => {
  const got = cameraTargetFor({ mode: 'follow', here: null, bounds: null, zoom: 16, bearing: 0 });
  assert(Object.keys(got).length === 0, `expected {}, got ${JSON.stringify(got)}`);
});

test('routemapgeo/routeMapView: no hardcoded Leuven literal (4.68/50.85) survives anywhere in the camera path', () => {
  const geoSrc = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'routeMapGeo.ts'), 'utf8');
  const viewSrc = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'routeMapView.tsx'), 'utf8');
  for (const [name, src] of [['routeMapGeo.ts', geoSrc], ['routeMapView.tsx', viewSrc]] as const) {
    assert(!src.includes('4.68'), `${name}: found the old Leuven-fallback longitude literal (4.68)`);
    assert(!src.includes('50.85'), `${name}: found the old Leuven-fallback latitude literal (50.85)`);
  }
});
