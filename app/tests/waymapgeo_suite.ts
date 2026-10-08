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
  bearingBetween, cameraTargetFor, fitMeNextMode, gatesFeatureCollection,
  gateTicksFeatureCollection, metresBetween, riderFeature, rotateEnabledFor, wayBounds,
  wayLineFeature, waySplitFeatures, sectorSpansFeatureCollection, trailBounds,
  placeFeatureCollection, placeBounds,
  buildPassModel, faintVertices, gateFaint, routeRunsFeatureCollection, FADE_NEAR_M, FAINT_OPACITY,
} from '../src/ui/wayMapGeo.ts';
import { pathCumulativeM, progressAtTime } from '../src/ui/wayMapMath.ts';
import { xyToLatLon } from '../core/src/index.ts';
import { gateName } from '../src/ui/gateAdjustModel.ts';
import type { WayAsset } from '../src/ui/wayMapMath.ts';

interface Manifest { schemaVersion: number; projection: string; ways: Record<string, WayAsset> }

const manifest = loadJson<Manifest>(
  path.join(TESTS_DIR, '..', 'assets', 'ways', 'ways.json'));

test('routemapgeo: routeLineFeature swaps [lat,lon] -> [lon,lat] and keeps every point', () => {
  for (const [id, a] of Object.entries(manifest.ways)) {
    assert(!!a.path && a.path.length >= 2, `${id}: fixture expected to have a path`);
    const f = wayLineFeature(a);
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
  const base = manifest.ways.Morning;
  const noPath: WayAsset = { ...base, path: undefined };
  assert(wayLineFeature(noPath) === null, 'missing path must yield null');
  const shortPath: WayAsset = { ...base, path: [base.path![0]] };
  assert(wayLineFeature(shortPath) === null, 'a single-point path must yield null');
});

test('routemapgeo: gatesFeatureCollection has 5 features and omits colour when absent', () => {
  for (const [id, a] of Object.entries(manifest.ways)) {
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
  const a = manifest.ways.Morning;
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
  const a = manifest.ways.Morning;
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
  for (const [id, a] of Object.entries(manifest.ways)) {
    const b = wayBounds(a);
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
  const a = manifest.ways.Morning;
  const noPath: WayAsset = { ...a, path: undefined };
  const b = wayBounds(noPath);
  assert(b !== null, 'gates-only asset must still produce bounds');
  for (const g of a.gates) {
    assert(g.lon >= b!.minLon && g.lon <= b!.maxLon, 'gate lon outside gates-only bounds');
    assert(g.lat >= b!.minLat && g.lat <= b!.maxLat, 'gate lat outside gates-only bounds');
  }
  const empty: WayAsset = { ...a, path: undefined, gates: [] };
  assert(wayBounds(empty) === null, 'no path and no gates must yield null');
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

test('routemapgeo: metresBetween — zero for an identical fix, ~111km per degree of latitude', () => {
  const lat = 50.85, lon = 4.65;
  assert(metresBetween(lat, lon, lat, lon) === 0, 'identical fix must read 0 m');
  const oneDegLat = metresBetween(lat, lon, lat + 1, lon);
  assert(oneDegLat > 110_000 && oneDegLat < 112_000, `1 degree of latitude should be ~111km, got ${oneDegLat}`);
});

// ================================================================ WP-E (race-map render fixes)

test('routemapgeo: gate ticks — 5 per manifest route, each a 2-point LineString, coords in the Leuven window', () => {
  for (const [id, a] of Object.entries(manifest.ways)) {
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

// WP-J (gate-adjust card): the map-tap -> gate-index mapping in
// routeMapView.tsx relies on each tick's properties.name being unique and
// matching gateAdjustModel.ts's own gateName(i, n) — assert the contract
// holds for every manifest route, not just the card's runtime-built assets.
test('routemapgeo: gate ticks — properties.name is unique per route and matches gateName(i, n)', () => {
  for (const [id, a] of Object.entries(manifest.ways)) {
    const fc = gateTicksFeatureCollection(a);
    const names = fc.features.map((f) => f.properties.name);
    assert(new Set(names).size === names.length, `${id}: gate tick names must be unique, got ${names}`);
    const expected = names.map((_, i) => gateName(i, names.length));
    assert(names.every((n, i) => n === expected[i]),
      `${id}: expected ${expected}, got ${names}`);
  }
});

test('routemapgeo: gate ticks — 30 m ground length, perpendicular to the local path heading at gateIdx[i]', () => {
  const a = manifest.ways.Morning;
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
  const a = manifest.ways.Morning;
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
  const a = manifest.ways.Morning;
  const stripped: WayAsset = { ...a, path: undefined, gateIdx: undefined };
  const fc = gateTicksFeatureCollection(stripped);
  assert(fc.features.length === 5, `expected 5 ticks via the chord fallback, got ${fc.features.length}`);
  for (const feat of fc.features) {
    assert(feat.geometry.coordinates.length === 2, 'fallback tick must still be a 2-point LineString');
  }
});

test('routemapgeo: routeSplitFeatures — rider on a mid-path vertex splits into behind/ahead sharing the split coordinate', () => {
  const a = manifest.ways.Morning;
  assert(!!a.path && a.path.length > 4, 'fixture expected a longer path for this check');
  const k = Math.floor(a.path!.length / 2);
  const [lat, lon] = a.path![k];
  const fc = waySplitFeatures(a, { lat, lon }, { active: true, offWay: false });
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
  const a = manifest.ways.Morning;
  const rider = { lat: a.path![2][0], lon: a.path![2][1] };

  const notActive = waySplitFeatures(a, rider, { active: false, offWay: false });
  assert(notActive !== null && notActive!.features.length === 1 && notActive!.features[0].properties.seg === 'behind',
    'active:false must yield a single whole-line behind feature');

  const noRider = waySplitFeatures(a, null, { active: true, offWay: false });
  assert(noRider !== null && noRider!.features.length === 1 && noRider!.features[0].properties.seg === 'ahead',
    'rider:null while active must yield a single whole-line ahead feature');

  const offWayFC = waySplitFeatures(a, rider, { active: true, offWay: true });
  assert(offWayFC !== null && offWayFC!.features.length === 1 && offWayFC!.features[0].properties.seg === 'ahead',
    'offRoute:true while active must yield a single whole-line ahead feature');

  const pathless: WayAsset = { ...a, path: undefined };
  assert(waySplitFeatures(pathless, rider, { active: true, offWay: false }) === null,
    'a pathless asset must yield null, same rule as routeLineFeature');
});

// ================================================================ WP-sector-coloured-trail P1 (Result trace spans)

test('routemapgeo: sector spans — 4 per manifest route, adjacent spans share the gate vertex, ends anchored at gateIdx[0]/gateIdx[last]', () => {
  for (const [id, a] of Object.entries(manifest.ways)) {
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
  const a = manifest.ways.Morning;
  const none = sectorSpansFeatureCollection(a);
  assert(none !== null, 'expected spans with no colours arg');
  for (const feat of none!.features) {
    assert(!('colour' in feat.properties), 'no sectorColours given but a span carries colour');
  }
  const withColours = sectorSpansFeatureCollection(a, [null, '#9000C8', null, '#00D000', null]);
  withColours!.features.forEach((feat, k) => {
    const sector = k + 1;
    if (sector === 1) {
      assert(feat.properties.colour === '#9000C8', `sector 1 expected #9000C8, got ${feat.properties.colour}`);
    } else if (sector === 3) {
      assert(feat.properties.colour === '#00D000', `sector 3 expected #00D000, got ${feat.properties.colour}`);
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
  const a = manifest.ways.Morning;
  const pathless: WayAsset = { ...a, path: undefined };
  assert(sectorSpansFeatureCollection(pathless) === null, 'no path must yield null (fall back to the plain line)');
  const noIdx: WayAsset = { ...a, gateIdx: undefined };
  assert(sectorSpansFeatureCollection(noIdx) === null, 'no gateIdx must yield null');
  const mismatch: WayAsset = { ...a, gateIdx: a.gateIdx!.slice(0, 3) };
  assert(sectorSpansFeatureCollection(mismatch) === null, 'gateIdx/gates length mismatch must yield null');
});

test('routemapgeo: sector spans — leadColour appends grey lead-in/lead-out AFTER the 4 sectors; absent -> exactly 4', () => {
  const GREY = '#6f6e6a';
  for (const [id, a] of Object.entries(manifest.ways)) {
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

// ============================================================ WP-M (two-finger rotation + compass)

test('routemapgeo: cameraTargetFor — userBearing overrides bearing in follow mode', () => {
  const here = { lat: 50.85, lon: 4.65 };
  const got = cameraTargetFor({ mode: 'follow', here, bounds: null, zoom: 16, bearing: 90, userBearing: 47 });
  assert(got.bearing === 47, `expected the held userBearing (47) to override bearing (90), got ${got.bearing}`);
});

test('routemapgeo: cameraTargetFor — userBearing overrides the fit pin', () => {
  const bounds = { minLon: 4.6, minLat: 50.8, maxLon: 4.8, maxLat: 50.9 };
  const rotated = cameraTargetFor({ mode: 'fit', here: null, bounds, zoom: 16, bearing: 90, userBearing: 47 });
  assert(rotated.bearing === 47, `expected fit+userBearing to override the 0 pin, got ${rotated.bearing}`);
  const northUp = cameraTargetFor({ mode: 'fit', here: null, bounds, zoom: 16, bearing: 90, userBearing: 0 });
  assert(northUp.bearing === 0, `expected fit+userBearing:0 -> 0 (explicit north-up), got ${northUp.bearing}`);
  const nullish = cameraTargetFor({ mode: 'fit', here: null, bounds, zoom: 16, bearing: 90, userBearing: null });
  assert(nullish.bearing === 0, `expected fit+userBearing:null -> the existing 0 pin, got ${nullish.bearing}`);
  const omitted = cameraTargetFor({ mode: 'fit', here: null, bounds, zoom: 16, bearing: 90 });
  assert(omitted.bearing === 0, `expected fit with userBearing omitted -> the existing 0 pin (byte-identical), got ${omitted.bearing}`);
});

test('routemapgeo: cameraTargetFor — free mode is still {} even with userBearing', () => {
  const here = { lat: 50.85, lon: 4.65 };
  const bounds = { minLon: 4.6, minLat: 50.8, maxLon: 4.8, maxLat: 50.9 };
  const got = cameraTargetFor({ mode: 'free', here, bounds, zoom: 16, bearing: 90, userBearing: 47 });
  assert(Object.keys(got).length === 0, `expected {} regardless of userBearing, got ${JSON.stringify(got)}`);
});

test('routemapgeo: rotateEnabledFor — the WP-M scope matrix', () => {
  assert(rotateEnabledFor('browse', 'prestart') === true, 'browse x prestart -> true');
  assert(rotateEnabledFor('browse', 'moving') === true, 'browse x moving -> true');
  assert(rotateEnabledFor('browse', 'stopped') === true, 'browse x stopped -> true');
  assert(rotateEnabledFor('browse', 'finished') === true, 'browse x finished -> true');
  assert(rotateEnabledFor('live', 'prestart') === true, 'live x prestart -> true');
  assert(rotateEnabledFor('live', 'moving') === false, 'live x moving -> false (the race ribbon)');
  assert(rotateEnabledFor('live', 'stopped') === false, 'live x stopped -> false (a red light, still racing)');
  // The §6.1 judgment call — if Nathan overrules it, this one assertion flips.
  assert(rotateEnabledFor('live', 'finished') === true, 'live x finished -> true (released back to browse)');
});

// ============================================================ WP-H (ride-detail trace bounds)

test('routemapgeo: trailBounds — null for <2 points; min/max over a 3-point trail', () => {
  assert(trailBounds([]) === null, 'empty trail -> null');
  assert(trailBounds([{ lat: 50.85, lon: 4.65 }]) === null, 'a single point -> null (no bounds from one point)');
  const pts = [
    { lat: 50.85, lon: 4.65 },
    { lat: 50.86, lon: 4.60 },
    { lat: 50.80, lon: 4.70 },
  ];
  const b = trailBounds(pts);
  assert(b !== null, 'a 3-point trail must produce bounds');
  assert(b!.minLat === 50.80 && b!.maxLat === 50.86, `expected lat [50.80,50.86], got [${b!.minLat},${b!.maxLat}]`);
  assert(b!.minLon === 4.60 && b!.maxLon === 4.70, `expected lon [4.60,4.70], got [${b!.minLon},${b!.maxLon}]`);
});

test('wayMapGeo: placeFeatureCollection — ring has steps+1 positions closing on itself, each within 1% of radiusM', () => {
  const lat = 50.88, lon = 4.70;
  for (const radiusM of [60, 250]) {
    const fc = placeFeatureCollection(lat, lon, radiusM);
    const disc = fc.features.find((f) => f.properties.part === 'disc')!;
    assert(disc.geometry.type === 'Polygon', `expected Polygon, got ${disc.geometry.type}`);
    const ring = disc.geometry.coordinates[0];
    assert(ring.length === 65, `expected 64+1=65 ring positions, got ${ring.length}`);
    assert(ring[0][0] === ring[64][0] && ring[0][1] === ring[64][1], 'ring must close on itself (first === last)');
    for (const [plon, plat] of ring) {
      const d = metresBetween(lat, lon, plat, plon);
      const err = Math.abs(d - radiusM) / radiusM;
      assert(err < 0.01, `ring point ${d}m off by ${(err * 100).toFixed(2)}% from radiusM=${radiusM}`);
    }
  }
});

test('wayMapGeo: placeFeatureCollection — lon/lat order matches every other builder ([lon, lat])', () => {
  const lat = 50.88, lon = 4.70, radiusM = 100;
  const fc = placeFeatureCollection(lat, lon, radiusM);
  const disc = fc.features.find((f) => f.properties.part === 'disc')!;
  const ring = disc.geometry.coordinates[0] as [number, number][];
  // ring[0] is angle 0: cos(0)=1, sin(0)=0 -> lon offset only, lat unchanged.
  assert(ring[0][1] === lat, `expected ring[0][1] (lat slot) === lat, got ${ring[0][1]}`);
  assert(ring[0][0] > lon, `expected ring[0][0] (lon slot) > lon (angle-0 point is due east), got ${ring[0][0]}`);
});

test('wayMapGeo: placeFeatureCollection — centre feature is part="centre" at [lon, lat]', () => {
  const lat = 50.88, lon = 4.70;
  const fc = placeFeatureCollection(lat, lon, 100);
  const centre = fc.features.find((f) => f.properties.part === 'centre')!;
  assert(centre.geometry.type === 'Point', `expected Point, got ${centre.geometry.type}`);
  assert(centre.geometry.coordinates[0] === lon && centre.geometry.coordinates[1] === lat,
    `expected centre [${lon},${lat}], got ${JSON.stringify(centre.geometry.coordinates)}`);
});

test('wayMapGeo: placeBounds — contains every ring point strictly inside, widened by pad', () => {
  const lat = 50.88, lon = 4.70, radiusM = 250, pad = 1.6;
  const fc = placeFeatureCollection(lat, lon, radiusM);
  const disc = fc.features.find((f) => f.properties.part === 'disc')!;
  const ring = disc.geometry.coordinates[0] as [number, number][];
  const b = placeBounds(lat, lon, radiusM, pad);
  for (const [plon, plat] of ring) {
    assert(plon > b.minLon && plon < b.maxLon, `ring lon ${plon} not strictly inside [${b.minLon},${b.maxLon}]`);
    assert(plat > b.minLat && plat < b.maxLat, `ring lat ${plat} not strictly inside [${b.minLat},${b.maxLat}]`);
  }
  const dLatRing = (radiusM / 6371000) * (180 / Math.PI);
  const expectedHalfLat = dLatRing * pad;
  assert(Math.abs((b.maxLat - lat) - expectedHalfLat) < 1e-9,
    `expected maxLat-lat ${expectedHalfLat}, got ${b.maxLat - lat}`);
});

test('routemapgeo/routeMapView: no hardcoded Leuven literal (4.68/50.85) survives anywhere in the camera path', () => {
  const geoSrc = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'wayMapGeo.ts'), 'utf8');
  const viewSrc = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'wayMapView.tsx'), 'utf8');
  for (const [name, src] of [['wayMapGeo.ts', geoSrc], ['wayMapView.tsx', viewSrc]] as const) {
    assert(!src.includes('4.68'), `${name}: found the old Leuven-fallback longitude literal (4.68)`);
    assert(!src.includes('50.85'), `${name}: found the old Leuven-fallback latitude literal (50.85)`);
  }
});

test('virgin-cycle22 06: fitMeNextMode — the one FIT/ME button names the ACTION of the next tap, never the state', () => {
  // Nathan 2026-10-05: follow -> "FIT" (tap fits the way); fit or free (after a drag/pinch) -> "ME"
  // (tap follows the rider); browse surfaces have no rider, so always FIT.
  assert(fitMeNextMode('follow', true) === 'fit', 'following -> next tap fits (label FIT)');
  assert(fitMeNextMode('fit', true) === 'follow', 'fitted -> next tap follows (label ME)');
  assert(fitMeNextMode('free', true) === 'follow', 'after a gesture -> next tap follows (label ME)');
  for (const m of ['follow', 'fit', 'free'] as const) {
    assert(fitMeNextMode(m, false) === 'fit', `browse surface (${m}) -> plain FIT`);
  }
});

// ------------------------------------------------ virgin-cycle26 brief 04
/** A WayAsset from planar waypoints (metres about 50.87 N, 4.70 E), vertices every 5 m,
 * gates at the given path-metre positions. Pixel fields are dummies (never read here). */
function synAsset(waypoints: [number, number][], gateAtM: number[]): WayAsset {
  const pts: [number, number][] = [];
  const cum: number[] = [];
  let total = 0;
  for (let i = 0; i + 1 < waypoints.length; i++) {
    const [x0, y0] = waypoints[i]; const [x1, y1] = waypoints[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    for (let d = 0; d < len; d += 5) { pts.push([x0 + ((x1 - x0) * d) / len, y0 + ((y1 - y0) * d) / len]); cum.push(total + d); }
    total += len;
  }
  pts.push(waypoints[waypoints.length - 1]); cum.push(total);
  const path = pts.map(([x, y]) => xyToLatLon(x, y, 50.87, 4.70) as [number, number]);
  const gateIdx = gateAtM.map((m) => { let k = 0; while (k + 1 < cum.length && cum[k + 1] <= m) k++; return k; });
  return {
    image: '', path, gateIdx, w: 900, h: 1400, x0: 0, y1: 0, scale: 1, offx: 0, offy: 0, sourceRide: 'syn',
    gates: gateIdx.map((k, i) => ({ name: gateName(i, gateIdx.length), lat: path[k][0], lon: path[k][1], px: 0, py: 0 })),
  };
}
const OB_WP: [number, number][] = [[0, 0], [300, 0], [300, 400], [700, 400], [700, -4], [0, -4]];
const OB_GATES_M = [22, 551, 1102, 1653, 2160];

test('virgin-cycle26 04: buildPassModel marks only retraced ground; a straight line has no partners and never fades', () => {
  const straight = synAsset([[0, 0], [3000, 0]], [30, 750, 1500, 2250, 2970]);
  const m = buildPassModel(straight)!;
  assert(m !== null && m.partnerM.every((p) => p === null), 'no partner on a single-pass line');
  assert(faintVertices(m, 100) === null && faintVertices(m, 2900) === null && faintVertices(m, null) === null, 'nothing faint, ever');
  assert(Math.abs(m.cumM[m.cumM.length - 1] - 3000) < 3, `cumM end ${m.cumM[m.cumM.length - 1]}`);
  const ob = buildPassModel(synAsset(OB_WP, OB_GATES_M))!;
  for (let k = 0; k < ob.cumM.length; k++) {
    const c = ob.cumM[k]; const p = ob.partnerM[k];
    // the return copy mirrors the outbound one: x = c outbound, x = 2204 - chainage on the return, so the partner sits at ≈ 2204 - c either way
    if (c <= 290 || c >= 1915) assert(p !== null && Math.abs(Math.abs(p - c) - Math.abs(2204 - 2 * c)) < 40, `street vertex at ${c} must have a partner on the other copy (≈ ${2204 - c}), got ${p}`);
    if (c > 350 && c < 1850) assert(p === null, `block vertex at ${c} must have no partner, got ${p}`);
  }
});

test('virgin-cycle26 04: faintVertices — outbound: the return copy is faint; on the block near the return: nothing faint; on the return: the outbound copy is faint; never within FADE_NEAR_M', () => {
  const a = synAsset(OB_WP, OB_GATES_M);
  const m = buildPassModel(a)!;
  const out = faintVertices(m, 100)!;
  assert(out !== null, 'outbound: something is faint');
  for (let k = 0; k < m.cumM.length; k++) {
    const c = m.cumM[k];
    if (c >= 1915) assert(out[k], `return copy at ${c} must be faint while outbound at 100`);
    if (c <= 290 || (c > 350 && c < 1850)) assert(!out[k], `current pass / block at ${c} must stay bright`);
  }
  const back = faintVertices(m, 2000)!;
  assert(back !== null, 'return: something is faint');
  for (let k = 0; k < m.cumM.length; k++) {
    const c = m.cumM[k];
    if (c <= 290) assert(back[k], `outbound copy at ${c} must be faint while on the return at 2000`);
    if (c >= 1915) assert(!back[k], `current (return) pass at ${c} must be bright`);
  }
  // Nearing the return street from the block (s = 1700): return vertices within 240 m ahead
  // (cum ≤ 1940) are already bright; the far end of the street (cum 2150+) is bright too because
  // the rider's chainage is NOT nearer its outbound partner any more. The outbound copy fades.
  const near = faintVertices(m, 1700)!;
  assert(near !== null, 'approaching: the outbound copy fades');
  for (let k = 0; k < m.cumM.length; k++) {
    const c = m.cumM[k];
    if (c >= 1915) assert(!near[k], `return copy at ${c} must be bright when within reach or current`);
    if (c <= 290) assert(near[k], `outbound copy at ${c} must be faint at 1700`);
  }
  // FADE_NEAR_M: a vertex less than 240 m ahead of the rider is never faint.
  const s = 1950; const f = faintVertices(m, s);
  if (f) for (let k = 0; k < m.cumM.length; k++) if (Math.abs(m.cumM[k] - s) <= FADE_NEAR_M) assert(!f[k], `vertex at ${m.cumM[k]} within ${FADE_NEAR_M} m of ${s} must not be faint`);
  assert(FAINT_OPACITY > 0 && FAINT_OPACITY < 1, 'dim, never hidden');
});

test('virgin-cycle26 04: gateFaint and the feature builders — faint:1 exactly where flagged, omitted otherwise, old call shapes unchanged', () => {
  const a = synAsset(OB_WP, OB_GATES_M);
  const m = buildPassModel(a)!;
  const out = faintVertices(m, 100);
  const g = gateFaint(a, out);
  assert(g.join(',') === 'false,false,false,false,true', `outbound at 100: only FINISH (on the return copy) is faint, got ${g}`);
  const g2 = gateFaint(a, faintVertices(m, 2000));
  assert(g2.join(',') === 'true,false,false,false,false', `return at 2000: only START (outbound copy) is faint, got ${g2}`);
  assert(gateFaint(a, null).every((v) => !v), 'no flags: nothing faint');
  const ticks = gateTicksFeatureCollection(a, undefined, 15, g);
  assert(ticks.features.length === 5 && ticks.features[4].properties.faint === 1 && !('faint' in ticks.features[0].properties), 'tick faint property');
  const plain = gateTicksFeatureCollection(a, undefined, 15);
  assert(plain.features.every((f) => !('faint' in f.properties)), 'three-argument call: no faint key');
  const spans = sectorSpansFeatureCollection(a, [null, 'x', 'x', 'x', 'x'], undefined, g)!;
  assert(spans.features.length === 4 && spans.features[3].properties.faint === 1 && spans.features.slice(0, 3).every((f) => !('faint' in f.properties)), 'span ending at FINISH is faint');
  const spansLead = sectorSpansFeatureCollection(a, [null, 'x', 'x', 'x', 'x'], 'grey', g)!;
  assert(spansLead.features.slice(4).every((f) => f.properties.lead && !('faint' in f.properties)), 'lead-in/out never faint');
  const runs = routeRunsFeatureCollection(a, out)!;
  assert(runs.features.length >= 2, `runs: ${runs.features.length}`);
  const faintRuns = runs.features.filter((f) => f.properties.faint === 1);
  assert(faintRuns.length >= 1 && runs.features.some((f) => !('faint' in f.properties)), 'both faint and bright runs');
  const coords = runs.features.reduce((n, f) => n + f.geometry.coordinates.length, 0);
  assert(coords === a.path!.length + runs.features.length - 1, `runs share boundary vertices: ${coords} coords for ${a.path!.length} vertices in ${runs.features.length} runs`);
  const single = routeRunsFeatureCollection(a, null)!;
  const base = wayLineFeature(a)!;
  assert(single.features.length === 1 && !('faint' in single.features[0].properties) && single.features[0].geometry.coordinates.length === base.geometry.coordinates.length, 'null flags: today\'s single feature');
  assert(routeRunsFeatureCollection({ ...a, path: undefined }, null) === null, 'no path: null');
});

test('virgin-cycle26 04: progressAtTime walks the same k/f as positionAtTime and is monotonic over a demo-style clock', () => {
  const a = synAsset([[0, 0], [3000, 0]], [30, 750, 1500, 2250, 2970]);
  const cum = pathCumulativeM(a.path!);
  const gateAt = [0, 100, 200, 300, 400];
  assert(progressAtTime(a, gateAt, -5) !== null && Math.abs(progressAtTime(a, gateAt, -5)! - cum[a.gateIdx![0]]) < 1e-6, 'before START: at gate 0');
  for (let k = 0; k < gateAt.length; k++) assert(Math.abs(progressAtTime(a, gateAt, gateAt[k])! - cum[a.gateIdx![k]]) < 1e-6, `at gate time ${k}: progress at gate ${k}`);
  let prev = -1;
  for (let t = 0; t <= 450; t += 7) { const p = progressAtTime(a, gateAt, t)!; assert(p >= prev, `monotonic at t=${t}: ${p} < ${prev}`); prev = p; }
  assert(Math.abs(progressAtTime(a, gateAt, 150)! - (cum[a.gateIdx![1]] + cum[a.gateIdx![2]]) / 2) < 1e-6, 'midway in sector 2 by time = midway by metres');
  assert(progressAtTime({ ...a, gateIdx: undefined }, gateAt, 10) === null, 'no gateIdx: null');
});
