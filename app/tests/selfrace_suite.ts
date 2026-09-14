/**
 * QA — virgin-cycle6: live self-racing (selfRaceModel.ts + the loader's
 * sibling in derive.ts + engine.ts's startGateT). Headless; no React, no
 * expo.
 *
 * selfRaceModel.ts imports colourModel.ts, which imports results.seed.json
 * (via store/seed.ts) as a bare `.json` — Metro bundles that directly, Node
 * needs an import attribute it cannot get without changing app code. Same
 * shim, same reason, as sectortrail_suite.ts/live_colour_suite.ts: every
 * app-side module under test is pulled in DYNAMICALLY, after the loader hook
 * exists (a static import is linked before any module body — including this
 * hook — runs). live/tracks.ts and live/engine.ts go through the same
 * treatment as live_colour_suite.ts already establishes (both transitively
 * reach the catalog seed JSON via store/catalogStore.ts).
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { assert, fixtureSpecs, loadFixture, numEq, test } from './lib.ts';
import { xyToLatLon, type RefLine } from '../core/src/index.ts';
import { RESULT_SCHEMA_VERSION, type RideResult, type SectorQuality } from '../src/store/types.ts';
import type { FsAdapter } from '../src/storage/fsAdapter.ts';
import type { SelfDot, SelfTrack } from '../src/ui/selfRaceModel.ts';

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const {
  loadSelfTracks, selfDotsAt, selfPositionAt, selfTierFor, selfsFeatureCollection, selfLivePosition,
} = await import('../src/ui/selfRaceModel.ts');
const { ghostsFor } = await import('../src/ui/colourModel.ts');
const { replaceRecorded, resetRecordedForTests } = await import('../src/ui/lastRide.ts');
const { deriveGateCrossings } = await import('../src/store/derive.ts');
const { catalogTrackSpecs } = await import('../src/live/tracks.ts');
const { LiveEngine } = await import('../src/live/engine.ts');
const { createMemoryFsAdapter } = await import('../src/storage/fsAdapter.ts');
const { setTimingMode } = await import('../src/store/timing.ts');

// ------------------------------------------------------------------ helpers

/** A window-ranking timestamp (RideResult.startedAtMs) guaranteed to be more
 * recent than anything the shipped archive seed carries, so a synthetic test
 * entry for a real catalog way (e.g. 'Morning') always wins colourModel's
 * "9 most recent" slice regardless of the seed's actual dates. */
const FAR_FUTURE_MS = Date.UTC(2099, 0, 1);

function makeResult(
  rideId: string, wayId: string | null, startedAtMs: number,
  lap: { movingS: number | null; rawS: number; quality: SectorQuality },
): RideResult {
  return {
    kind: 'rideResult',
    schemaVersion: RESULT_SCHEMA_VERSION,
    rideId,
    startedAtMs,
    wayId,
    source: 'app',
    lap,
    sectors: [],
    derivedBy: { engineVersion: 'test', gateSetVersion: 1, resultSchemaVersion: RESULT_SCHEMA_VERSION },
  };
}

/** The point on `ref`'s polyline at chainage `ch` (linear interpolation
 * between the two bracketing resampled vertices; extrapolates along the
 * boundary segment if `ch` is outside [ch[0], ch[last]]). Lets a test place
 * a fix at an EXACT chosen chainage without hand-deriving real GPS points. */
function pointAtChainage(ref: RefLine, ch: number): { lat: number; lon: number } {
  const chs = ref.ch;
  let i = 0;
  while (i < chs.length - 2 && chs[i + 1] < ch) i++;
  const c0 = chs[i];
  const c1 = chs[i + 1];
  const f = c1 !== c0 ? (ch - c0) / (c1 - c0) : 0;
  const x = ref.rx[i] + f * (ref.rx[i + 1] - ref.rx[i]);
  const y = ref.ry[i] + f * (ref.ry[i + 1] - ref.ry[i]);
  const [lat, lon] = xyToLatLon(x, y, ref.lat0, ref.lon0);
  return { lat, lon };
}

function fixLine(tUnixMs: number, lat: number, lon: number): string {
  return JSON.stringify({ kind: 'fix', tUnixMs, lat, lon });
}

// ============================================================ R2: unlock progression

test('selfrace: ghostsFor unlock progression — 0,1,2 ... capped at 9 (R2, D-045 WINDOW_PREV)', () => {
  resetRecordedForTests();
  const wayId = 'SelfRaceTest:unlock';
  const checkpoints = new Map<number, number>();
  for (let n = 1; n <= 12; n++) {
    replaceRecorded(makeResult(`u${n}`, wayId, 1_000 * n, { movingS: 500 + n, rawS: 500 + n, quality: 'clean' }));
    if ([1, 2, 9, 10, 12].includes(n)) checkpoints.set(n, ghostsFor(wayId).length);
  }
  const before = ghostsFor(wayId + ':never-used').length; // ride 1 on a brand-new way: zero selfs
  assert(before === 0, `a way with no rides yet must have zero selfs, got ${before}`);
  const got = [1, 2, 9, 10, 12].map((n) => checkpoints.get(n));
  assert(JSON.stringify(got) === JSON.stringify([1, 2, 9, 9, 9]),
    `expected window sizes [1,2,9,9,9] at rides [1,2,9,10,12], got ${JSON.stringify(got)}`);
});

test('selfrace: ghostsFor excludes an ignoredFromRanking ride and an estimated-quality ride (R2)', () => {
  resetRecordedForTests();
  const wayId = 'SelfRaceTest:excl';
  replaceRecorded(makeResult('e1', wayId, 1000, { movingS: 500, rawS: 500, quality: 'clean' }));
  replaceRecorded({
    ...makeResult('e2', wayId, 2000, { movingS: 500, rawS: 500, quality: 'clean' }),
    ignoredFromRanking: true,
  });
  replaceRecorded(makeResult('e3', wayId, 3000, { movingS: null, rawS: 500, quality: 'estimated' }));
  replaceRecorded(makeResult('e4', wayId, 4000, { movingS: 500, rawS: 500, quality: 'clean' }));
  const window = ghostsFor(wayId);
  const ids = window.map((r) => r.rideId).sort();
  assert(JSON.stringify(ids) === JSON.stringify(['e1', 'e4']),
    `expected only e1,e4 in the window (e2 ignored, e3 estimated), got ${JSON.stringify(ids)}`);
});

// ============================================================ R3: archive excluded

test('selfrace: loader — an all-archive window never reads a ride file (R3)', async () => {
  resetRecordedForTests();
  const throwingFs: FsAdapter = {
    ensureDir: async () => {},
    writeText: async () => {},
    appendText: async () => {},
    readText: async () => { throw new Error('must not be called for an archive-sourced entry'); },
    exists: async () => false,
    listDir: async () => [],
    deleteFile: async () => {},
  };
  const window = ghostsFor('Morning');
  assert(window.length > 0, 'expected the shipped seed to give Morning some archive ghosts to test against');
  assert(window.every((r) => r.source === 'archive'),
    `this test assumes a freshly-reset recorded[] leaves only archive entries for Morning, got sources ${JSON.stringify(window.map((r) => r.source))}`);
  const tracks = await loadSelfTracks('Morning', 1, throwingFs);
  assert(tracks.length === 0, `expected zero self tracks from an all-archive window, got ${tracks.length}`);
});

// ============================================================ interpolation

test('selfrace: selfPositionAt — interpolation, waiting/racing/finished, negative elapsed (clock skew)', () => {
  const track: SelfTrack = {
    rideId: 'synthetic',
    startMs: 0,
    finishMs: 20000,
    lapS: 20,
    fixes: [
      { tUnixMs: 0, lat: 0, lon: 0 },
      { tUnixMs: 10000, lat: 0, lon: 0.001 },
      { tUnixMs: 20000, lat: 0, lon: 0.002 },
    ],
  };

  const mid = selfPositionAt(track, 5000);
  assert(mid.state === 'racing', `expected racing at elapsed 5000, got ${mid.state}`);
  assert(numEq(mid.lon, 0.0005, 1e-9), `expected the midpoint of the first pair (lon 0.0005), got ${mid.lon}`);
  assert(mid.lat === 0, `expected lat 0, got ${mid.lat}`);

  const waiting = selfPositionAt(track, null);
  assert(waiting.state === 'waiting' && waiting.lat === 0 && waiting.lon === 0,
    `elapsedMs===null must read 'waiting' at the startMs fix, got ${JSON.stringify(waiting)}`);

  const finished = selfPositionAt(track, 25000); // beyond finishMs - startMs
  assert(finished.state === 'finished' && finished.lon === 0.002,
    `elapsed past the lap length must read 'finished' at the finishMs fix, got ${JSON.stringify(finished)}`);

  const atFinishBoundary = selfPositionAt(track, 20000); // exactly finishMs - startMs
  assert(atFinishBoundary.state === 'finished', `elapsed === lap length must already read 'finished', got ${atFinishBoundary.state}`);

  const skew = selfPositionAt(track, -500);
  assert(skew.state === 'waiting', `a negative elapsed (clock skew) must read 'waiting', got ${skew.state}`);
});

// ============================================================ best flag

test('selfrace: selfDotsAt — best is the lowest lapS; a tie keeps the earlier array entry', () => {
  const mk = (id: string, lapS: number): SelfTrack => ({
    rideId: id, startMs: 0, finishMs: 1000, lapS,
    fixes: [{ tUnixMs: 0, lat: 0, lon: 0 }, { tUnixMs: 1000, lat: 0, lon: 0 }],
  });
  const dots = selfDotsAt([mk('a', 600), mk('b', 580), mk('c', 610)], 0);
  assert(dots.filter((d) => d.best).length === 1, 'exactly one dot must be best');
  assert(dots.find((d) => d.rideId === 'b')!.best, 'b (lapS 580, the fastest) must be best');

  const tied = selfDotsAt([mk('x', 500), mk('y', 500)], 0);
  assert(tied.filter((d) => d.best).length === 1, 'a tie must still pick exactly one best');
  assert(tied.find((d) => d.rideId === 'x')!.best, 'a tie must keep the earlier entry in the input array (x)');

  const dropped = selfDotsAt([
    { rideId: 'short', startMs: 0, finishMs: 1000, lapS: 500, fixes: [{ tUnixMs: 0, lat: 0, lon: 0 }] },
    { rideId: 'inverted', startMs: 1000, finishMs: 500, lapS: 400, fixes: [{ tUnixMs: 0, lat: 0, lon: 0 }, { tUnixMs: 1000, lat: 0, lon: 0 }] },
  ], 0);
  assert(dropped.length === 0, `tracks with < 2 fixes or finishMs <= startMs must never be drawn, got ${JSON.stringify(dropped)}`);
});

// ============================================================ R5′: tiers

const mkTrack = (id: string, lapS: number): SelfTrack => ({
  rideId: id, startMs: 0, finishMs: 1000, lapS,
  fixes: [{ tUnixMs: 0, lat: 0, lon: 0 }, { tUnixMs: 1000, lat: 0, lon: 0 }],
});

test('selfrace: selfTierFor / selfDotsAt — tiers computed against the actual mean (R5′), never a hardcoded expectation', () => {
  const lapSs = [600, 580, 610];
  const mean = lapSs.reduce((a, b) => a + b, 0) / lapSs.length;
  const bestIdx = lapSs.indexOf(Math.min(...lapSs));
  const dots = selfDotsAt(lapSs.map((v, i) => mkTrack(`t${i}`, v)), 0);
  for (let i = 0; i < lapSs.length; i++) {
    const expected = i === bestIdx ? 'purple' : lapSs[i] < mean ? 'green' : 'yellow';
    assert(dots[i].tier === expected, `dot ${i} (lapS ${lapSs[i]}, mean ${mean}): expected ${expected}, got ${dots[i].tier}`);
    assert(selfTierFor(lapSs[i], i, lapSs, bestIdx) === expected,
      `selfTierFor(${lapSs[i]}, ${i}, ..., ${bestIdx}): expected ${expected}, got ${selfTierFor(lapSs[i], i, lapSs, bestIdx)}`);
  }
});

test('selfrace: selfDotsAt — a 9-track outlier pulls the mean up so most selfs are non-yellow', () => {
  const lapSs = [500, 505, 510, 515, 520, 525, 530, 535, 5000]; // one huge outlier
  const dots = selfDotsAt(lapSs.map((v, i) => mkTrack(`t${i}`, v)), 0);
  const nonYellow = dots.filter((d) => d.tier !== 'yellow').length;
  assert(nonYellow > dots.length / 2,
    `expected most selfs non-yellow once the outlier pulls the mean up, got ${nonYellow} of ${dots.length} (${JSON.stringify(dots.map((d) => d.tier))})`);
});

test('selfrace: selfDotsAt — n=1 is always purple', () => {
  const dots = selfDotsAt([mkTrack('solo', 600)], 0);
  assert(dots.length === 1 && dots[0].tier === 'purple', `n=1 must be purple, got ${JSON.stringify(dots)}`);
});

test('selfrace: selfDotsAt — n=2 is always purple + yellow (green unreachable when mean == the slower value)', () => {
  const dots = selfDotsAt([mkTrack('fast', 500), mkTrack('slow', 600)], 0);
  const tiers = dots.map((d) => d.tier).sort();
  assert(JSON.stringify(tiers) === JSON.stringify(['purple', 'yellow']),
    `n=2 must be exactly purple+yellow, got ${JSON.stringify(tiers)}`);
});

test('selfrace: selfDotsAt — a tie for best keeps exactly one purple; best === (tier===\'purple\') for every dot', () => {
  const dots = selfDotsAt([mkTrack('x', 500), mkTrack('y', 500), mkTrack('z', 700)], 0);
  assert(dots.filter((d) => d.tier === 'purple').length === 1, `expected exactly one purple on a tie, got ${JSON.stringify(dots)}`);
  for (const d of dots) {
    assert(d.best === (d.tier === 'purple'), `invariant best===(tier==='purple') broken for ${d.rideId}: best=${d.best} tier=${d.tier}`);
  }
});

// ============================================================ R5‴: rank / sortKey

test('selfrace: selfDotsAt — rank is 1..n ascending by lapS, ties broken by array order', () => {
  const dots = selfDotsAt([mkTrack('a', 600), mkTrack('b', 500), mkTrack('c', 500), mkTrack('d', 700)], 0);
  const byId = new Map(dots.map((d) => [d.rideId, d.rank]));
  // b and c tie at 500 (fastest); b comes first in the input array, so b=1,c=2; a=3; d=4.
  assert(byId.get('b') === 1 && byId.get('c') === 2 && byId.get('a') === 3 && byId.get('d') === 4,
    `expected ranks b=1,c=2,a=3,d=4, got ${JSON.stringify([...byId])}`);
  const ranks = dots.map((d) => d.rank).sort((x, y) => x - y);
  assert(JSON.stringify(ranks) === JSON.stringify([1, 2, 3, 4]), `ranks must be exactly 1..n, got ${JSON.stringify(ranks)}`);
});

test('selfrace: selfsFeatureCollection — emits sortKey = 100 - rank and tier', () => {
  const dots = selfDotsAt([mkTrack('a', 600), mkTrack('b', 580), mkTrack('c', 610)], 0);
  const fc = selfsFeatureCollection(dots);
  for (let i = 0; i < dots.length; i++) {
    const props = fc.features[i].properties;
    assert(props.sortKey === 100 - dots[i].rank, `feature ${i}: expected sortKey ${100 - dots[i].rank}, got ${props.sortKey}`);
    assert(props.tier === dots[i].tier, `feature ${i}: expected tier ${dots[i].tier}, got ${props.tier}`);
  }
});

// ============================================================ engine field (startGateT)

test('selfrace: engine — startGateT is null before gate 0 fires and equals its crossing time once locked', () => {
  const f = loadFixture('clean_morning');
  const engine = new LiveEngine(fixtureSpecs());
  let sawPreLockNull = false;
  let badPreLock = false;
  const unsub = engine.subscribe((s) => {
    if (s.track === null) {
      sawPreLockNull = true;
      if (s.startGateT !== null) badPreLock = true;
    }
  });
  for (let i = 0; i < f.fixes.t.length; i++) {
    engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  }
  unsub();
  const final = engine.getState();
  assert(sawPreLockNull, 'expected at least one pre-lock state emission to check startGateT against');
  assert(!badPreLock, 'startGateT must stay null on every emission before the engine locks a candidate');
  assert(final.track === f.track, `expected the engine to lock ${f.track}, got ${final.track}`);
  assert(final.startGateT !== null, 'expected startGateT to be set once locked and past its own gate 0');

  const spec = fixtureSpecs().find((s) => s.id === f.track)!;
  const { startS } = deriveGateCrossings({
    t: f.fixes.t, lat: f.fixes.lat, lon: f.fixes.lon, ref: spec.ref, gates: spec.gates,
  });
  assert(startS !== null, 'fixture must actually cross gate 0 for this cross-check to mean anything');
  assert(numEq(final.startGateT, startS, 1e-3),
    `startGateT ${final.startGateT} != the offline-derived gate-0 crossing ${startS}`);
});

test('selfrace: engine — free mode never sets startGateT', () => {
  const f = loadFixture('clean_morning');
  const engine = new LiveEngine(fixtureSpecs());
  engine.start({ mode: 'free' });
  for (let i = 0; i < f.fixes.t.length; i++) {
    engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  }
  const final = engine.getState();
  assert(final.mode === 'free', `expected free mode, got ${final.mode}`);
  assert(final.startGateT === null, `free mode must never set startGateT (no lock ever settles), got ${final.startGateT}`);
});

// ============================================================ engine field (chainageM, follow-up)

test('selfrace: engine — chainageM is null exactly while track === null, non-decreasing once locked', () => {
  const f = loadFixture('clean_morning');
  const engine = new LiveEngine(fixtureSpecs());
  let sawPreLockNull = false;
  let badChainage = false;
  let badMonotonic = false;
  let lastChainage: number | null = null;
  const unsub = engine.subscribe((s) => {
    if (s.track === null) {
      sawPreLockNull = true;
      if (s.chainageM !== null) badChainage = true;
    } else {
      if (s.chainageM === null) badChainage = true;
      else {
        if (lastChainage !== null && s.chainageM < lastChainage) badMonotonic = true;
        lastChainage = s.chainageM;
      }
    }
  });
  for (let i = 0; i < f.fixes.t.length; i++) {
    engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  }
  unsub();
  assert(sawPreLockNull, 'expected at least one pre-lock state emission to check chainageM against');
  assert(!badChainage, 'chainageM must be null exactly while track is null, non-null once locked');
  assert(!badMonotonic, 'chainageM must never decrease across emissions once locked');
  const final = engine.getState();
  assert(final.chainageM !== null, 'expected a non-null chainageM in the final locked state');
});

test('selfrace: engine — free mode never sets chainageM', () => {
  const f = loadFixture('clean_morning');
  const engine = new LiveEngine(fixtureSpecs());
  engine.start({ mode: 'free' });
  for (let i = 0; i < f.fixes.t.length; i++) {
    engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  }
  const final = engine.getState();
  assert(final.mode === 'free', `expected free mode, got ${final.mode}`);
  assert(final.chainageM === null, `free mode must never set chainageM (no lock ever settles), got ${final.chainageM}`);
});

// ============================================================ chainageM (Task A/B.7)

test('selfrace: deriveGateCrossings — chainageM matches t.length and is non-decreasing across the gate-0 and last-gate crossings', () => {
  const f = loadFixture('clean_morning');
  const spec = fixtureSpecs().find((s) => s.id === f.track)!;
  const { startS, finishS, chainageM } = deriveGateCrossings({
    t: f.fixes.t, lat: f.fixes.lat, lon: f.fixes.lon, ref: spec.ref, gates: spec.gates,
  });
  assert(chainageM.length === f.fixes.t.length,
    `expected chainageM.length === t.length, got ${chainageM.length} vs ${f.fixes.t.length}`);
  assert(startS !== null && finishS !== null, 'fixture must actually cross both gates for this check to mean anything');

  // Bracketing fix index just before each crossing time.
  const bracketIdx = (target: number): number => {
    let i = 0;
    while (i < f.fixes.t.length - 2 && f.fixes.t[i + 1] <= target) i++;
    return i;
  };
  const i0 = bracketIdx(startS!);
  const iLast = bracketIdx(finishS!);
  assert(chainageM[i0 + 1] >= chainageM[i0],
    `expected non-decreasing chainageM across the gate-0 crossing, got ${chainageM[i0]} -> ${chainageM[i0 + 1]}`);
  assert(chainageM[iLast + 1] >= chainageM[iLast],
    `expected non-decreasing chainageM across the last-gate crossing, got ${chainageM[iLast]} -> ${chainageM[iLast + 1]}`);
});

test('selfrace: selfPositionAt — interpolates sM midway between two bracketing fixes', () => {
  const track: SelfTrack = {
    rideId: 'sm-mid', startMs: 0, finishMs: 20000, lapS: 20,
    fixes: [
      { tUnixMs: 0, lat: 0, lon: 0, sM: 100 },
      { tUnixMs: 10000, lat: 0, lon: 0.001, sM: 200 },
      { tUnixMs: 20000, lat: 0, lon: 0.002, sM: 300 },
    ],
  };
  const mid = selfPositionAt(track, 5000);
  assert(mid.sM !== null && numEq(mid.sM, 150, 1e-9), `expected sM interpolated to 150 midway, got ${mid.sM}`);
});

// ============================================================ loader: seconds->ms + decimation

test('selfrace: loader — seconds->ms conversion matches an independently-derived crossing time', async () => {
  resetRecordedForTests();
  const spec = catalogTrackSpecs().find((s) => s.id === 'Morning');
  assert(spec !== undefined, 'expected Morning to resolve a TrackSpec from the runtime catalog');
  const g0 = spec!.gates[0];
  const gLast = spec!.gates[spec!.gates.length - 1];
  const baseT = 1_700_000_000;
  const rideId = 'selftest-seconds-ms';

  // A smooth chainage ramp from just before gate 0 to just past the finish
  // gate, steps <= 150 m so projectRideOffline's forward search window
  // (+240 m) always finds the next fix. Times are 1 s apart — geometry, not
  // realism, is what this test needs.
  const from = g0 - 5;
  const to = gLast + 5;
  const span = to - from;
  const steps = Math.max(4, Math.ceil(span / 150));
  const fixesArr: { tUnixMs: number; lat: number; lon: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const ch = from + (span * i) / steps;
    const p = pointAtChainage(spec!.ref, ch);
    fixesArr.push({ tUnixMs: (baseT + i) * 1000, lat: p.lat, lon: p.lon });
  }

  const fs = createMemoryFsAdapter();
  await fs.writeText(`rides/${rideId}.jsonl`, fixesArr.map((f) => fixLine(f.tUnixMs, f.lat, f.lon)).join('\n') + '\n');
  // startedAtMs is the WINDOW-RANKING timestamp (colourModel.ghostsFor sorts
  // by it and keeps the 9 most recent) — deliberately unrelated to the ride
  // file's own fix times above, and far enough in the future that this
  // synthetic entry always wins a "most recent 9" slice against whatever
  // real dates the shipped archive seed carries for Morning.
  replaceRecorded(makeResult(rideId, 'Morning', FAR_FUTURE_MS, { movingS: 900, rawS: 900, quality: 'clean' }));

  // Independently reproduce exactly what the loader does internally with
  // these same fixes (already chronological; none preStart/warmup).
  const t = fixesArr.map((f) => f.tUnixMs / 1000);
  const lat = fixesArr.map((f) => f.lat);
  const lon = fixesArr.map((f) => f.lon);
  const { startS, finishS } = deriveGateCrossings({ t, lat, lon, ref: spec!.ref, gates: spec!.gates });
  assert(startS !== null && finishS !== null, 'expected both gate crossings on this synthetic ramp ride');

  const tracks = await loadSelfTracks('Morning', 1, fs);
  const track = tracks.find((tr) => tr.rideId === rideId);
  assert(track !== undefined, 'expected a self track for the synthetic ramp ride');
  assert(track!.startMs === startS! * 1000,
    `loader startMs ${track!.startMs} != independently-derived startS*1000 ${startS! * 1000} (seconds->ms conversion)`);
  assert(track!.finishMs === finishS! * 1000,
    `loader finishMs ${track!.finishMs} != independently-derived finishS*1000 ${finishS! * 1000}`);
});

test('selfrace: loader — decimation keeps <= 31 of 60 1 Hz fixes, always the first and last', async () => {
  resetRecordedForTests();
  const spec = catalogTrackSpecs().find((s) => s.id === 'Morning');
  assert(spec !== undefined, 'expected Morning to resolve a TrackSpec from the runtime catalog');
  const g0 = spec!.gates[0];
  const gLast = spec!.gates[spec!.gates.length - 1];
  const baseT = 1_650_000_000;
  const rideId = 'selftest-decimation';
  const N = 60;
  const lines: string[] = [];
  const firstMs = baseT * 1000;
  const lastMs = (baseT + N - 1) * 1000;
  // Inspect fix (virgin-cycle6): the ramp runs from 5 m BEFORE gate 0 to 5 m
  // PAST the finish gate, same margin as the seconds->ms test above. Placing
  // the last fix exactly AT gLast made crossTime's `s[i+1] >= g` test hinge on
  // projection rounding noise (measured: s[59] - gLast = +7.5e-8 m — a pass by
  // luck; a refs.json rebuild or a gate nudge could flip it to a null finish).
  for (let i = 0; i < N; i++) {
    const ch = (g0 - 5) + ((gLast - g0 + 10) * i) / (N - 1);
    const p = pointAtChainage(spec!.ref, ch);
    lines.push(fixLine((baseT + i) * 1000, p.lat, p.lon));
  }
  const fs = createMemoryFsAdapter();
  await fs.writeText(`rides/${rideId}.jsonl`, lines.join('\n') + '\n');
  // See the seconds->ms test above for why startedAtMs (window ranking) is
  // deliberately decoupled from the ride file's own fix times.
  replaceRecorded(makeResult(rideId, 'Morning', FAR_FUTURE_MS, { movingS: 900, rawS: 900, quality: 'clean' }));

  const tracks = await loadSelfTracks('Morning', 1, fs);
  const track = tracks.find((tr) => tr.rideId === rideId);
  assert(track !== undefined, 'expected a self track for the synthetic 60-fix, 1 Hz ride');
  assert(track!.fixes.length <= 31, `expected <= 31 kept fixes after decimation, got ${track!.fixes.length}`);
  assert(track!.fixes[0].tUnixMs === firstMs, `decimation must always keep the first fix, got ${track!.fixes[0].tUnixMs}`);
  assert(track!.fixes[track!.fixes.length - 1].tUnixMs === lastMs,
    `decimation must always keep the last fix, got ${track!.fixes[track!.fixes.length - 1].tUnixMs}`);
});

test('selfrace: loader — every kept fix carries sM (chainage) from deriveGateCrossings, inOrder[i] <-> chainageM[i]', async () => {
  resetRecordedForTests();
  const spec = catalogTrackSpecs().find((s) => s.id === 'Morning');
  assert(spec !== undefined, 'expected Morning to resolve a TrackSpec from the runtime catalog');
  const g0 = spec!.gates[0];
  const gLast = spec!.gates[spec!.gates.length - 1];
  const baseT = 1_690_000_000;
  const rideId = 'selftest-sm-fixes';
  const from = g0 - 5;
  const to = gLast + 5;
  const span = to - from;
  const steps = Math.max(4, Math.ceil(span / 150));
  const lines: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const ch = from + (span * i) / steps;
    const p = pointAtChainage(spec!.ref, ch);
    lines.push(fixLine((baseT + i) * 1000, p.lat, p.lon));
  }
  const fs = createMemoryFsAdapter();
  await fs.writeText(`rides/${rideId}.jsonl`, lines.join('\n') + '\n');
  replaceRecorded(makeResult(rideId, 'Morning', FAR_FUTURE_MS, { movingS: 900, rawS: 900, quality: 'clean' }));

  const tracks = await loadSelfTracks('Morning', 1, fs);
  const track = tracks.find((tr) => tr.rideId === rideId);
  assert(track !== undefined, 'expected a self track for the synthetic sM ramp ride');
  assert(track!.fixes.every((fx) => typeof fx.sM === 'number'),
    `expected every kept fix to carry a numeric sM, got ${JSON.stringify(track!.fixes.map((fx) => fx.sM))}`);
  // Inspect (follow-up): ALIGNMENT, not just presence — each kept fix was
  // placed at a known chainage (ramp step i = its own tUnixMs offset), so its
  // sM must be THAT chainage, not a neighbour's. A reversed/shifted parallel
  // array passed the presence check above (mutation-tested 2026-09-14).
  for (const fx of track!.fixes) {
    const i = fx.tUnixMs / 1000 - baseT;
    const expected = from + (span * i) / steps;
    assert(numEq(fx.sM as number, expected, 0.5),
      `fix at step ${i}: expected sM ~${expected.toFixed(2)} (its own placed chainage), got ${fx.sM} — chainageM[i] misaligned with inOrder[i]?`);
  }
});

// ============================================================ loader: cache vs timing mode (R7)

test('selfrace: loader — a cached track re-reads lapS under the current timing mode (R7: purple follows scoredS)', async () => {
  resetRecordedForTests();
  const spec = catalogTrackSpecs().find((s) => s.id === 'Morning');
  assert(spec !== undefined, 'expected Morning to resolve a TrackSpec from the runtime catalog');
  const g0 = spec!.gates[0];
  const gLast = spec!.gates[spec!.gates.length - 1];
  const baseT = 1_660_000_000;
  const rideId = 'selftest-timing-mode';
  const N = 40;
  const lines: string[] = [];
  for (let i = 0; i < N; i++) {
    const p = pointAtChainage(spec!.ref, (g0 - 5) + ((gLast - g0 + 10) * i) / (N - 1));
    lines.push(fixLine((baseT + i) * 1000, p.lat, p.lon));
  }
  const fs = createMemoryFsAdapter();
  await fs.writeText(`rides/${rideId}.jsonl`, lines.join('\n') + '\n');
  // rawS != movingS so the two modes are distinguishable through lapS.
  replaceRecorded(makeResult(rideId, 'Morning', FAR_FUTURE_MS, { movingS: 850, rawS: 900, quality: 'clean' }));

  try {
    setTimingMode('raw');
    const first = (await loadSelfTracks('Morning', 1, fs)).find((tr) => tr.rideId === rideId);
    assert(first !== undefined && first.lapS === 900, `raw mode: expected lapS 900, got ${first?.lapS}`);
    setTimingMode('moving');
    // Second load: the same (rideId, gateSetVersion) key is now cached — lapS must still follow the mode.
    const second = (await loadSelfTracks('Morning', 1, fs)).find((tr) => tr.rideId === rideId);
    assert(second !== undefined && second.lapS === 850,
      `moving mode on a cache hit: expected lapS 850, got ${second?.lapS} (stale cached raw value?)`);
  } finally {
    setTimingMode('raw');
  }
});

// ============================================================ R10: live position

test('selfrace: selfLivePosition — 1 + count(selfs ahead by chainage); a null sM never counts as ahead', () => {
  const mk = (id: string, sM: number | null): SelfDot => (
    { rideId: id, lat: 0, lon: 0, state: 'racing', best: false, tier: 'yellow', rank: 1, sM }
  );
  // dots at 900/1000/1100 — the middle (nominally-1000) one carries sM: null.
  const dots = [mk('a', 900), mk('b', null), mk('c', 1100)];
  assert(selfLivePosition(dots, 1000) === 2,
    `rider at 1000, dots at 900/null/1100: expected P2 (only 1100 ahead), got ${selfLivePosition(dots, 1000)}`);
  // Inspect (follow-up): R10 says strictly "> rider's chainage" — a self dead level with the rider is not ahead.
  const level = [mk('a', 900), mk('b', 1000), mk('c', 1100)];
  assert(selfLivePosition(level, 1000) === 2,
    `rider at 1000, dots at 900/1000/1100: a level self must not count as ahead (P2), got ${selfLivePosition(level, 1000)}`);
  assert(selfLivePosition(dots, null) === null, `rider chainage null must give null, got ${selfLivePosition(dots, null)}`);
  assert(selfLivePosition([], 1000) === null, `empty dots must give null, got ${selfLivePosition([], 1000)}`);
});
