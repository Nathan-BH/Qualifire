/**
 * virgin-cycle20 brief 02 — live rider dot soft-snap. Pins the pure rule
 * (ui/riderDotModel.ts) and the engine's additive display-only exposure
 * (LiveEngineState.riderSnap). Raw truth is pinned elsewhere: engine_suite /
 * live_suite replay the committed fixtures and would fail if chainage, gates
 * or timing moved.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, test, TESTS_DIR } from './lib.ts';
import {
  SNAP_ENGAGE_M, SNAP_RAW_M, SNAP_RELEASE_M,
  initialRiderDotState, riderDotStep, snapWeight, type RiderDotState,
} from '../src/ui/riderDotModel.ts';
import { CORRIDOR_M, DEFAULT_LIVE_OPTIONS, toXY, xyToLatLon, type RefLine } from '../core/src/index.ts';
// Repo idiom (live_suite.ts 30-40, catalogstore_suite.ts 37): the engine pulls
// in refs.json through src/live/refs.ts, which plain Node can only load once
// live_suite's registerHooks JSON shim is installed — so a DYNAMIC import after
// link time, never a static one (a static import hoists past the hook and fails
// with ERR_IMPORT_ATTRIBUTE_MISSING).
const { LiveEngine, LOCK_MIN_ADVANCE_M } = await import('../src/live/engine.ts');

const APP_DIR = path.resolve(TESTS_DIR, '..');
// A generic local frame — any origin works; nothing here is a real route.
const LAT0 = 45.0;
const LON0 = 10.0;
const RAW = { lat: 45.0010, lon: 10.0010 };
const SNAP = { lat: 45.0012, lon: 10.0008 };

function step(prev: RiderDotState, xtdM: number | null) {
  return riderDotStep(prev, RAW.lat, RAW.lon, xtdM === null ? null : { lat: SNAP.lat, lon: SNAP.lon, xtdM });
}

test('riderdot: thresholds are ordered and sit inside the corridor', () => {
  assert(SNAP_ENGAGE_M < SNAP_RELEASE_M && SNAP_RELEASE_M < SNAP_RAW_M, 'engage < release < raw');
  assert(SNAP_RAW_M <= DEFAULT_LIVE_OPTIONS.windowBack, 'raw point within the projector window slack');
  assert(SNAP_RAW_M < CORRIDOR_M, 'the dot goes raw before the engine stops calling the fix on-route');
});

test('riderdot: within engage range the dot is exactly the projected point', () => {
  for (const xtd of [0, 1, SNAP_ENGAGE_M / 2, SNAP_ENGAGE_M]) {
    const r = step(initialRiderDotState(), xtd);
    assert(r.lat === SNAP.lat && r.lon === SNAP.lon && r.weight === 0, `xtd ${xtd}: on the line`);
    assert(r.state.mode === 'snapped', `xtd ${xtd}: glued`);
  }
});

test('riderdot: fade zone blends monotonically from the line to the raw fix', () => {
  let prevW = -1;
  let prevOff = -1;
  for (let xtd = SNAP_ENGAGE_M; xtd <= SNAP_RAW_M; xtd += 0.5) {
    const w = snapWeight(xtd, 'free');
    assert(w >= prevW, `weight non-decreasing at ${xtd}`);
    prevW = w;
    const r = riderDotStep({ mode: 'free' }, RAW.lat, RAW.lon, { ...SNAP, xtdM: xtd });
    // drawn point lies on the segment snap -> raw, at fraction w
    const expLat = SNAP.lat + w * (RAW.lat - SNAP.lat);
    const expLon = SNAP.lon + w * (RAW.lon - SNAP.lon);
    assert(Math.abs(r.lat - expLat) < 1e-12 && Math.abs(r.lon - expLon) < 1e-12, `on the blend segment at ${xtd}`);
    const off = Math.hypot(r.lat - SNAP.lat, r.lon - SNAP.lon);
    assert(off >= prevOff - 1e-15, `distance from the line non-decreasing at ${xtd}`);
    prevOff = off;
  }
  assert(snapWeight(SNAP_ENGAGE_M, 'free') === 0 && snapWeight(SNAP_RAW_M, 'free') === 1, 'ramp ends');
  assert(snapWeight(SNAP_RELEASE_M, 'snapped') === 0 && snapWeight(SNAP_RAW_M, 'snapped') === 1, 'glued ramp ends');
  assert(snapWeight(SNAP_RELEASE_M, 'free') > 0, 'free ramp has already started at the release point');
});

test('riderdot: at or beyond the raw threshold the dot IS the raw fix', () => {
  for (const xtd of [SNAP_RAW_M, SNAP_RAW_M + 0.01, 45, 120, 999]) {
    for (const mode of ['free', 'snapped'] as const) {
      const r = step({ mode }, xtd);
      assert(r.lat === RAW.lat && r.lon === RAW.lon && r.weight === 1, `xtd ${xtd} from ${mode}: raw, same numbers`);
      assert(r.state.mode === 'free', `xtd ${xtd} from ${mode}: released`);
    }
  }
});

test('riderdot: hysteresis — glued through wobble, released only at raw, re-glued at engage', () => {
  // xtd sequence and the expected (mode, weight) after each step, from 'free'.
  const seq: [number, 'free' | 'snapped', number][] = [
    [5, 'snapped', 0],
    [15, 'snapped', 0],          // would be 0.17 without hysteresis — stays glued
    [19, 'snapped', 0],
    [15, 'snapped', 0],
    [22, 'snapped', (22 - SNAP_RELEASE_M) / (SNAP_RAW_M - SNAP_RELEASE_M)],
    [25, 'snapped', 0.5],
    [18, 'snapped', 0],          // back on the line without ever going raw
    [31, 'free', 1],             // clearly off: raw, released
    [25, 'free', (25 - SNAP_ENGAGE_M) / (SNAP_RAW_M - SNAP_ENGAGE_M)],
    [13, 'free', (13 - SNAP_ENGAGE_M) / (SNAP_RAW_M - SNAP_ENGAGE_M)],
    [11, 'snapped', 0],          // re-glued as soon as it is within engage range
  ];
  let st = initialRiderDotState();
  seq.forEach(([xtd, mode, w], i) => {
    const r = step(st, xtd);
    assert(r.state.mode === mode, `step ${i} (xtd ${xtd}): mode ${r.state.mode}, want ${mode}`);
    assert(Math.abs(r.weight - w) < 1e-12, `step ${i} (xtd ${xtd}): weight ${r.weight}, want ${w}`);
    st = r.state;
  });
  // No jump at either transition: the weight at the engage point is 0 in both
  // modes and at the raw point 1 in both modes.
  assert(snapWeight(SNAP_ENGAGE_M, 'free') === snapWeight(SNAP_ENGAGE_M, 'snapped'), 'continuous at engage');
  assert(snapWeight(SNAP_RAW_M, 'free') === snapWeight(SNAP_RAW_M, 'snapped'), 'continuous at raw');
});

test('riderdot: no reference → raw fix and the glue is dropped', () => {
  for (const prev of [initialRiderDotState(), { mode: 'snapped' } as RiderDotState]) {
    const r = step(prev, null);
    assert(r.lat === RAW.lat && r.lon === RAW.lon && r.weight === 1 && r.state.mode === 'free', 'null snap → raw, free');
    const bad = riderDotStep(prev, RAW.lat, RAW.lon, { lat: NaN, lon: SNAP.lon, xtdM: 3 });
    assert(bad.lat === RAW.lat && bad.lon === RAW.lon && bad.state.mode === 'free', 'non-finite snap → raw, free');
    const neg = riderDotStep(prev, RAW.lat, RAW.lon, { ...SNAP, xtdM: -1 });
    assert(neg.lat === RAW.lat && neg.lon === RAW.lon, 'negative xtd → raw');
  }
});

test('riderdot: deterministic and idempotent; the module is pure', () => {
  const a = step({ mode: 'free' }, 17);
  const b = step({ mode: 'free' }, 17);
  assert(JSON.stringify(a) === JSON.stringify(b), 'same input, same output');
  const c = step(a.state, 17);
  assert(JSON.stringify(c) === JSON.stringify(a), 'feeding the result state back is a fixed point');
  const src = fs.readFileSync(path.join(APP_DIR, 'src', 'ui', 'riderDotModel.ts'), 'utf8');
  assert(!/Date\.now|Math\.random|performance\.now/.test(src), 'no clock, no randomness');
  assert(!/from ['"](react|react-native|expo)/.test(src), 'no react / react-native / expo imports');
  assert(!/^import /m.test(src), 'no imports at all — self-contained');
});

/** Straight west→east reference, `lengthM` long, 5 m vertices, y = 0. */
function straightRef(lengthM: number): RefLine {
  const n = Math.floor(lengthM / 5) + 1;
  const rx = new Float64Array(n);
  const ry = new Float64Array(n);
  const ch = new Float64Array(n);
  for (let i = 0; i < n; i++) { rx[i] = i * 5; ch[i] = i * 5; }
  return { rx, ry, ch, lat0: LAT0, lon0: LON0, length: (n - 1) * 5 };
}

test('riderdot: engine exposes riderSnap for the display candidate only, display-only', () => {
  const ref = straightRef(1500);
  const engine = new LiveEngine([{ id: 'T', ref, gates: [50, 700, 1400] }]);
  engine.start();
  assert(engine.getState().riderSnap === null, 'nothing fed → null');
  // Ride along the line 3 m to the "north" (y = +3), 10 m per fix at 1 Hz.
  // No pick: the display candidate IS the lock (displayTrack === track), so
  // riderSnap is null until the 400 m lock and present from then on.
  let t = 1_700_000_000_000;
  let lockedAt: number | null = null;
  for (let s = 0; s <= 900; s += 10, t += 1000) {
    const [lat, lon] = xyToLatLon(s, 3, LAT0, LON0);
    engine.feed(lat, lon, t, 5);
    const st = engine.getState();
    if (st.displayTrack === null) {
      assert(st.track === null, `s=${s}: no pick → displayTrack follows track`);
      assert(st.riderSnap === null, `s=${s}: no display candidate → riderSnap null`);
    } else {
      if (lockedAt === null) lockedAt = s;
      assert(st.track === 'T', `s=${s}: no pick → display candidate is the lock`);
      assert(st.riderSnap !== null, `s=${s}: display candidate → riderSnap present`);
      assert(Math.abs(st.riderSnap.xtdM - 3) < 0.01, `s=${s}: xtd ≈ 3 m, got ${st.riderSnap.xtdM}`);
      const back = toXY([st.riderSnap.lat], [st.riderSnap.lon], LAT0, LON0);
      assert(Math.abs(back.x[0] - s) < 0.05 && Math.abs(back.y[0]) < 0.05, `s=${s}: projected point on the line at s`);
      assert(st.chainageM !== null && Math.abs(st.chainageM - s) < 0.05, `s=${s}: chainage untouched`);
    }
  }
  assert(lockedAt !== null && lockedAt >= LOCK_MIN_ADVANCE_M, `lock only after ${LOCK_MIN_ADVANCE_M} m (got ${lockedAt})`);
  // A clearly off-route fix: riderSnap still reports the nearest point and the
  // honest distance (the UI rule turns that into "raw"); chainage does not move.
  const before = engine.getState().chainageM;
  const [lat, lon] = xyToLatLon(905, 60, LAT0, LON0);
  engine.feed(lat, lon, t, 5);
  const st = engine.getState();
  assert(st.riderSnap !== null && Math.abs(st.riderSnap.xtdM - 60) < 0.01, `off-route xtd ≈ 60, got ${st.riderSnap?.xtdM}`);
  assert(st.chainageM === before, 'an off-route fix never moves chainage (projector unchanged)');
  engine.stop();
  assert(engine.getState().riderSnap === null, 'stopped → null');

  // Ruling 2026-10-03 (brief 06 display candidate): under a RECORD-tab pick the
  // dot snaps to the pick's own reference from START — the map already draws
  // that line (wayHint) before the lock — so riderSnap is present while `track`
  // is still null, exactly like chainageM. The lock verdict itself is untouched.
  const picked = new LiveEngine([{ id: 'T', ref, gates: [50, 700, 1400] }]);
  picked.start({ pickId: 'T' });
  assert(picked.getState().riderSnap === null, 'pick, nothing fed → null');
  let tp = 1_700_000_000_000;
  for (let s = 0; s <= 100; s += 10, tp += 1000) {
    const [plat, plon] = xyToLatLon(s, 3, LAT0, LON0);
    picked.feed(plat, plon, tp, 5);
    const ps = picked.getState();
    assert(ps.track === null && ps.displayTrack === 'T', `pick s=${s}: pre-lock (track ${ps.track}, displayTrack ${ps.displayTrack})`);
    assert(ps.riderSnap !== null && Math.abs(ps.riderSnap.xtdM - 3) < 0.01, `pick s=${s}: riderSnap from the pick's candidate before the lock`);
    const pb = toXY([ps.riderSnap.lat], [ps.riderSnap.lon], LAT0, LON0);
    assert(Math.abs(pb.x[0] - s) < 0.05 && Math.abs(pb.y[0]) < 0.05, `pick s=${s}: projected point on the line at s`);
  }
  picked.stop();
});
