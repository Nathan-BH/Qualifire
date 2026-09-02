/** QA suite for app/src/live/userRefs.ts (OPEN-ITEMS item 3, save-flow
 * package, Part A): building a route's reference line from its reference
 * ride's raw fixes, and the runtime registry + refs.user.json persistence.
 *
 * Fixture convention: a "north ride" of n fixes, 0.001 deg latitude steps
 * (~110.54 m each — app/core/src/geo.ts's M_PER_DEG_LAT, NOT M_PER_DEG_LON;
 * a pure-latitude fixture must use the latitude constant), 5 s apart,
 * starting at lat 50.87 / lon 4.70, longitude held constant.
 *
 * NEVER import ../src/live/refs.ts here — its bundled-JSON import does not
 * load under Node (storage/core.ts injects refFor instead, lines 46-52).
 */
import { test, assert } from './lib.ts';
import { createMemoryFsAdapter } from '../src/storage/fsAdapter.ts';
import { collapseStationaryRuns, M_PER_DEG_LAT } from '../core/src/index.ts';
import type { RidePoints } from '../core/src/index.ts';
import {
  buildRefFromRideFixes, initUserRefs, saveUserRef, userRefFor, flushUserRefWrites,
  removeUserRef, resetUserRefsForTests, USER_REFS_FILE, type RefFixInput,
} from '../src/live/userRefs.ts';

const LAT0 = 50.87;
const LON0 = 4.70;
const LAT_STEP = 0.001; // ~110.54 m (M_PER_DEG_LAT), 5 s apart

function northRide(n: number): RefFixInput[] {
  const out: RefFixInput[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ lat: LAT0 + i * LAT_STEP, lon: LON0, tUnixMs: i * 5000 });
  }
  return out;
}

test('userRefs: buildRefFromRideFixes builds a 5 m-resampled strictly-increasing line', () => {
  const fixes = northRide(20);
  const built = buildRefFromRideFixes(fixes);
  assert(built !== null, 'expected a built ref');
  const { ref } = built;
  assert(ref.ch[0] === 0, `ch[0] should be 0, got ${ref.ch[0]}`);
  for (let i = 1; i < ref.ch.length; i++) {
    assert(ref.ch[i] > ref.ch[i - 1], `ch not strictly increasing at ${i}: ${ref.ch[i - 1]} -> ${ref.ch[i]}`);
  }
  assert(
    Math.abs(ref.length - 19 * 110.54) < 12,
    `length ${ref.length} too far from 19*110.54=${19 * 110.54}`,
  );
  const interior = ref.ch[10] - ref.ch[9];
  assert(Math.abs(interior - 5) < 0.02, `interior spacing ${interior} not ~5 m`);
  const meanLat = fixes.reduce((a, f) => a + f.lat, 0) / fixes.length;
  assert(Math.abs(ref.lat0 - meanLat) < 1e-9, `lat0 ${ref.lat0} != mean lat ${meanLat}`);
});

test('userRefs: preStart and warmup fixes are excluded from the build', () => {
  const clean = northRide(20);
  const withFlags: RefFixInput[] = [
    { preStart: true, lat: LAT0 + 0.045, lon: LON0, tUnixMs: -10000 }, // ~5 km away
    { warmup: true, lat: LAT0 - 0.001, lon: LON0, tUnixMs: -5000 },
    ...clean,
  ];
  const cleanBuilt = buildRefFromRideFixes(clean);
  const flaggedBuilt = buildRefFromRideFixes(withFlags);
  assert(cleanBuilt !== null && flaggedBuilt !== null, 'both builds should succeed');
  const a = cleanBuilt.ref, b = flaggedBuilt.ref;
  assert(a.rx.length === b.rx.length, `rx length ${a.rx.length} != ${b.rx.length}`);
  for (let i = 0; i < a.rx.length; i++) {
    assert(a.rx[i] === b.rx[i], `rx[${i}] differs: ${a.rx[i]} != ${b.rx[i]}`);
    assert(a.ry[i] === b.ry[i], `ry[${i}] differs: ${a.ry[i]} != ${b.ry[i]}`);
    assert(a.ch[i] === b.ch[i], `ch[${i}] differs: ${a.ch[i]} != ${b.ch[i]}`);
  }
});

test('userRefs: a >=20 s stationary knot collapses and reports one stop chainage', () => {
  const clean = buildRefFromRideFixes(northRide(20));
  assert(clean !== null, 'clean build should succeed');
  const base = northRide(20);
  const knotSpot = base[10]; // the fix at chainage 10 * 110.54 m
  const extras: RefFixInput[] = [];
  for (let k = 0; k < 30; k++) {
    const offsetM = (k % 5) - 2; // -2..2 m, sums to 0 per 5-cycle -> centroid == spot
    extras.push({
      lat: knotSpot.lat + offsetM / M_PER_DEG_LAT,
      lon: knotSpot.lon,
      tUnixMs: knotSpot.tUnixMs + (k + 1) * 1000, // 1 s apart, ~30 s stationary
    });
  }
  const spliced = [...base.slice(0, 11), ...extras, ...base.slice(11)];
  const built = buildRefFromRideFixes(spliced);
  assert(built !== null, 'expected a built ref with a stationary knot');
  assert(
    built.stopChainageM.length === 1,
    `expected exactly one stop, got ${built.stopChainageM.length}`,
  );
  const target = 10 * 110.54;
  assert(
    Math.abs(built.stopChainageM[0] - target) < 30,
    `stop chainage ${built.stopChainageM[0]} too far from ${target}`,
  );
  assert(
    Math.abs(built.ref.length - clean.ref.length) < 15,
    `length ${built.ref.length} too far from clean ${clean.ref.length}`,
  );
});

test('userRefs: degenerate rides build nothing', () => {
  assert(buildRefFromRideFixes([]) === null, 'empty fixes should build nothing');
  assert(
    buildRefFromRideFixes([{ lat: LAT0, lon: LON0, tUnixMs: 0 }]) === null,
    'a single fix should build nothing',
  );
  const allPreStart = northRide(20).map((f) => ({ ...f, preStart: true }));
  assert(buildRefFromRideFixes(allPreStart) === null, 'all-preStart fixes should build nothing');
  const shortRide: RefFixInput[] = [
    { lat: LAT0, lon: LON0, tUnixMs: 0 },
    { lat: LAT0 + 0.0005, lon: LON0, tUnixMs: 5000 }, // ~55 m, under MIN_TRACK_LENGTH_M
  ];
  assert(buildRefFromRideFixes(shortRide) === null, 'a ~56 m ride should build nothing');
});

test('userRefs: save -> restart -> load round-trips the ref exactly', async () => {
  resetUserRefsForTests();
  const fs = createMemoryFsAdapter();
  await initUserRefs(fs);
  const built = buildRefFromRideFixes(northRide(20));
  assert(built !== null, 'setup build should succeed');
  const ref = built.ref;
  await saveUserRef('route:x', ref);
  await flushUserRefWrites();
  resetUserRefsForTests();
  await initUserRefs(fs);
  const reloaded = userRefFor('route:x');
  assert(reloaded !== null, 'expected the ref to reload');
  assert(reloaded.lat0 === ref.lat0, `lat0 ${reloaded.lat0} != ${ref.lat0}`);
  assert(reloaded.lon0 === ref.lon0, `lon0 ${reloaded.lon0} != ${ref.lon0}`);
  assert(reloaded.length === ref.length, `length ${reloaded.length} != ${ref.length}`);
  assert(reloaded.rx.length === ref.rx.length, `rx length ${reloaded.rx.length} != ${ref.rx.length}`);
  for (let i = 0; i < ref.rx.length; i++) {
    assert(reloaded.rx[i] === ref.rx[i], `rx[${i}] differs`);
    assert(reloaded.ry[i] === ref.ry[i], `ry[${i}] differs`);
    assert(reloaded.ch[i] === ref.ch[i], `ch[${i}] differs`);
  }
});

test('userRefs: a missing refs.user.json is just "nothing built yet"', async () => {
  resetUserRefsForTests();
  const fs = createMemoryFsAdapter();
  const n = await initUserRefs(fs);
  assert(n === 0, `expected 0 loaded, got ${n}`);
  assert(userRefFor('route:anything') === null, 'expected no ref for a fresh registry');
});

test('userRefs: an undecodable refs.user.json is ignored and left untouched', async () => {
  resetUserRefsForTests();
  const fs = createMemoryFsAdapter();
  await fs.writeText(USER_REFS_FILE, 'not json');
  const n = await initUserRefs(fs);
  assert(n === 0, `expected 0 loaded from an undecodable file, got ${n}`);
  const text = await fs.readText(USER_REFS_FILE);
  assert(text === 'not json', `file should be left untouched, got ${text}`);
});

test('userRefs: saveUserRef with no armed fs registers in memory and resolves', async () => {
  resetUserRefsForTests();
  const built = buildRefFromRideFixes(northRide(20));
  assert(built !== null, 'setup build should succeed');
  await saveUserRef('route:y', built.ref);
  assert(userRefFor('route:y') !== null, 'expected the ref to be registered in memory');
});

test('userRefs (WP-Q): removeUserRef drops one entry and rewrites the file with only the rest', async () => {
  resetUserRefsForTests();
  const fs = createMemoryFsAdapter();
  await initUserRefs(fs);
  const a = buildRefFromRideFixes(northRide(20))!;
  const b = buildRefFromRideFixes(northRide(25))!;
  await saveUserRef('route:a', a.ref);
  await saveUserRef('route:b', b.ref);
  await flushUserRefWrites();

  await removeUserRef('route:a');
  await flushUserRefWrites();
  assert(userRefFor('route:a') === null, 'route:a is gone from the in-memory registry');
  assert(userRefFor('route:b') !== null, 'route:b is untouched');
  const text = fs.files.get(USER_REFS_FILE)!;
  const decoded = JSON.parse(text) as { tracks: Record<string, unknown> };
  assert(Object.keys(decoded.tracks).join(',') === 'route:b', `file holds only route:b, got ${JSON.stringify(Object.keys(decoded.tracks))}`);
});

test('userRefs (WP-Q): removeUserRef on an unknown id never throws and writes nothing new', async () => {
  resetUserRefsForTests();
  const fs = createMemoryFsAdapter();
  await initUserRefs(fs);
  const a = buildRefFromRideFixes(northRide(20))!;
  await saveUserRef('route:only', a.ref);
  await flushUserRefWrites();
  const before = fs.files.get(USER_REFS_FILE);

  await removeUserRef('route:nope');
  await flushUserRefWrites();
  assert(fs.files.get(USER_REFS_FILE) === before, 'file text unchanged for an unknown id');
  assert(userRefFor('route:only') !== null, 'the real entry is untouched');
});

test('core: collapseStationaryRuns collapses a run to its centroid and reports it', () => {
  const stepDeg = 30 / M_PER_DEG_LAT; // 30 m moving cadence
  const lat0 = 51.0;
  const lon0 = 4.0;
  const pts: { lat: number; lon: number; t: number }[] = [
    { lat: lat0, lon: lon0, t: 0 },
    { lat: lat0 + stepDeg, lon: lon0, t: 5 },
    { lat: lat0 + 2 * stepDeg, lon: lon0, t: 10 },
  ];
  const spotLat = lat0 + 3 * stepDeg; // 30 m past the last moving point
  for (let k = 0; k < 30; k++) {
    const offsetM = (k % 5) - 2; // within 2 m of the spot, sums to 0 per 5-cycle
    pts.push({ lat: spotLat + offsetM / M_PER_DEG_LAT, lon: lon0, t: 11 + k }); // 1 s apart
  }
  pts.push({ lat: spotLat + stepDeg, lon: lon0, t: 45 });
  pts.push({ lat: spotLat + 2 * stepDeg, lon: lon0, t: 50 });
  pts.push({ lat: spotLat + 3 * stepDeg, lon: lon0, t: 55 });

  const ride: RidePoints = {
    name: 'knot',
    t: Float64Array.from(pts, (p) => p.t),
    lat: Float64Array.from(pts, (p) => p.lat),
    lon: Float64Array.from(pts, (p) => p.lon),
    ele: Float64Array.from(pts, () => 0),
  };
  const collapsed = collapseStationaryRuns(ride);
  assert(collapsed.runs.length === 1, `expected 1 run, got ${collapsed.runs.length}`);
  assert(collapsed.runs[0].nPoints === 30, `expected 30 nPoints, got ${collapsed.runs[0].nPoints}`);
  assert(
    Math.abs(collapsed.runs[0].lat - spotLat) < 1e-7,
    `centroid lat ${collapsed.runs[0].lat} too far from knot mean ${spotLat}`,
  );
  assert(
    Math.abs(collapsed.runs[0].lon - lon0) < 1e-7,
    `centroid lon ${collapsed.runs[0].lon} too far from knot mean ${lon0}`,
  );
  assert(collapsed.ride.lat.length === 7, `expected 7 points after collapse, got ${collapsed.ride.lat.length}`);
  assert(collapsed.runs[0].tFromS === 11, `tFromS should be the run's first t (11), got ${collapsed.runs[0].tFromS}`);
});
