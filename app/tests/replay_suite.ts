/**
 * QA — virgin-cycle14 brief 02: post-ride REPLAY (replayModel.ts + the
 * additive slices of derive.ts/colourModel.ts/selfRaceModel.ts it reuses).
 * Headless; no React, no expo. Same JSON-loader shim as selfrace_suite.ts
 * (colourModel.ts pulls in results.seed.json via store/seed.ts).
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { assert, fixtureSpecs, loadFixture, numEq, test } from './lib.ts';
import { xyToLatLon, type RefLine } from '../core/src/index.ts';
import { RESULT_SCHEMA_VERSION, type RideResult, type SectorQuality } from '../src/store/types.ts';
import type { FsAdapter } from '../src/storage/fsAdapter.ts';
import type { ReplayRider } from '../src/ui/replayModel.ts';

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
  buildReplayRider, replayEndS, replayClockS, replayTimebase, riderPositionAt,
  replayGatesDone, replaySectorColours, replayLiveViewModel, loadReplayRider,
  REPLAY_RATE_DEFAULT, REPLAY_RATES, REPLAY_TICK_MS, REPLAY_ROLL_OUT_S, REPLAY_EDGE_PAD_MS,
} = await import('../src/ui/replayModel.ts');
const { deriveGateCrossings } = await import('../src/store/derive.ts');
const { priorWindowFor } = await import('../src/ui/colourModel.ts');
const { loadSelfTracksFor, loadSelfTracks } = await import('../src/ui/selfRaceModel.ts');
const { catalogTrackSpecs } = await import('../src/live/tracks.ts');
const { createMemoryFsAdapter } = await import('../src/storage/fsAdapter.ts');
const { replaceRecorded, resetRecordedForTests } = await import('../src/ui/lastRide.ts');

// ------------------------------------------------------------------ helpers (by value from selfrace_suite.ts)

const FAR_FUTURE_MS = Date.UTC(2099, 0, 1);

function makeResult(
  rideId: string, wayId: string | null, startedAtMs: number,
  lap: { movingS: number | null; rawS: number; quality: SectorQuality },
  extra?: Partial<RideResult>,
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
    ...extra,
  };
}

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

/** Builds a ramp of raw fixes {tUnixMs, lat, lon} from chainage `from` to `to`
 * along `ref`, `steps` intervals, 1 s apart starting at `baseT` (unix seconds). */
function ramp(ref: RefLine, from: number, to: number, baseT: number, steps = 20) {
  const out: { tUnixMs: number; lat: number; lon: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const ch = from + ((to - from) * i) / steps;
    const p = pointAtChainage(ref, ch);
    out.push({ tUnixMs: (baseT + i) * 1000, lat: p.lat, lon: p.lon });
  }
  return out;
}

// ============================================================ constants

test('replay: constants are within the documented bands', () => {
  assert(REPLAY_RATE_DEFAULT === 10, `expected REPLAY_RATE_DEFAULT 10, got ${REPLAY_RATE_DEFAULT}`);
  assert(REPLAY_RATES.includes(REPLAY_RATE_DEFAULT), 'REPLAY_RATES must include the default rate');
  assert(REPLAY_TICK_MS >= 33 && REPLAY_TICK_MS <= 100, `REPLAY_TICK_MS out of band: ${REPLAY_TICK_MS}`);
});

// ============================================================ buildReplayRider on a real fixture

test('replay: buildReplayRider on clean_morning matches deriveGateCrossings and carries chainage on every fix', () => {
  const f = loadFixture('clean_morning');
  const spec = fixtureSpecs().find((s) => s.id === f.track)!;
  const raw = f.fixes.t.map((t, i) => ({ tUnixMs: t * 1000, lat: f.fixes.lat[i], lon: f.fixes.lon[i] }));

  const r = buildReplayRider('clean_morning', raw, { ref: spec.ref, gates: spec.gates });
  assert(r !== null, 'expected a non-null rider for the clean_morning fixture');

  const { startS, finishS } = deriveGateCrossings({
    t: f.fixes.t, lat: f.fixes.lat, lon: f.fixes.lon, ref: spec.ref, gates: spec.gates,
  });
  assert(startS !== null && finishS !== null, 'fixture must cross both gates for this check to mean anything');
  assert(r!.startMs === startS! * 1000, `startMs ${r!.startMs} != startS*1000 ${startS! * 1000}`);
  assert(r!.finishMs === finishS! * 1000, `finishMs ${r!.finishMs} != finishS*1000 ${finishS! * 1000}`);

  assert(r!.gateMs.length === spec.gates.length, `gateMs.length ${r!.gateMs.length} != gates.length ${spec.gates.length}`);
  assert(r!.gateMs[0] === r!.startMs, 'gateMs[0] must equal startMs');
  assert(r!.gateMs[r!.gateMs.length - 1] === r!.finishMs, 'gateMs[last] must equal finishMs');
  const nonNull = r!.gateMs.filter((g): g is number => g !== null);
  for (let i = 1; i < nonNull.length; i++) {
    assert(nonNull[i] > nonNull[i - 1], 'non-null gateMs must strictly ascend');
  }
  for (let i = 1; i < r!.fixes.length; i++) {
    assert(r!.fixes[i].tUnixMs >= r!.fixes[i - 1].tUnixMs, 'fixes must ascend by tUnixMs');
  }
  for (const fx of r!.fixes) {
    assert(Number.isFinite(fx.sM), `every replay fix must carry a finite sM, got ${fx.sM}`);
  }
  assert(r!.fixes[0].tUnixMs >= r!.startMs - REPLAY_EDGE_PAD_MS,
    'the first kept fix must not precede startMs - REPLAY_EDGE_PAD_MS');
});

test('replay: deriveGateCrossings.gateS brackets startS/finishS and has one entry per gate', () => {
  const f = loadFixture('clean_morning');
  const spec = fixtureSpecs().find((s) => s.id === f.track)!;
  const { startS, finishS, gateS } = deriveGateCrossings({
    t: f.fixes.t, lat: f.fixes.lat, lon: f.fixes.lon, ref: spec.ref, gates: spec.gates,
  });
  assert(gateS.length === spec.gates.length, `gateS.length ${gateS.length} != gates.length ${spec.gates.length}`);
  assert(gateS[0] === startS, 'gateS[0] must equal startS');
  assert(gateS[gateS.length - 1] === finishS, 'gateS[last] must equal finishS');
});

// ============================================================ buildReplayRider — edge cases

test('replay: buildReplayRider is null when START is never reached', () => {
  const spec = fixtureSpecs().find((s) => s.id === 'Morning')!;
  const g0 = spec.gates[0];
  const raw = ramp(spec.ref, g0 - 500, g0 - 100, 1_700_000_000);
  const r = buildReplayRider('never-starts', raw, spec);
  assert(r === null, 'a ride that never reaches gate 0 must yield no replay rider');
});

test('replay: START crossed but FINISH not — endMs is the last fix, no roll-out, one gate done at replayEndS', () => {
  const spec = fixtureSpecs().find((s) => s.id === 'Morning')!;
  const g0 = spec.gates[0];
  const raw = ramp(spec.ref, g0 - 5, spec.gates[1] + 50, 1_700_100_000);
  const r = buildReplayRider('start-only', raw, spec);
  assert(r !== null, 'expected a rider — START is crossed on this ramp');
  assert(r!.finishMs === null, 'FINISH must not be crossed on this short ramp');
  assert(r!.endMs === raw[raw.length - 1].tUnixMs, 'endMs must be the last raw fix when FINISH was never crossed');
  const expectedEndS = (r!.endMs - r!.startMs) / 1000;
  assert(numEq(replayEndS(r!), expectedEndS, 1e-6), `replayEndS ${replayEndS(r!)} != ${expectedEndS} (no roll-out expected)`);
  assert(replayGatesDone(r!, replayEndS(r!)) === 1, `expected exactly gate 1 done, got ${replayGatesDone(r!, replayEndS(r!))}`);
});

test('replay: both START and FINISH crossed — replayEndS adds REPLAY_ROLL_OUT_S', () => {
  const spec = fixtureSpecs().find((s) => s.id === 'Morning')!;
  const g0 = spec.gates[0];
  const gLast = spec.gates[spec.gates.length - 1];
  const raw = ramp(spec.ref, g0 - 5, gLast + 5, 1_700_200_000, 40);
  const r = buildReplayRider('full-lap', raw, spec);
  assert(r !== null, 'expected a rider on a full ramp');
  assert(r!.finishMs !== null, 'FINISH must be crossed on this full ramp');
  const expected = (r!.finishMs! - r!.startMs) / 1000 + REPLAY_ROLL_OUT_S;
  assert(numEq(replayEndS(r!), expected, 1e-6), `replayEndS ${replayEndS(r!)} != ${expected}`);
});

test('replay: buildReplayRider null on <2 fixes, all-preStart fixes, or chronological order invariance', () => {
  const spec = fixtureSpecs().find((s) => s.id === 'Morning')!;
  const g0 = spec.gates[0];
  const gLast = spec.gates[spec.gates.length - 1];
  const p = pointAtChainage(spec.ref, g0);
  assert(buildReplayRider('one-fix', [{ tUnixMs: 0, lat: p.lat, lon: p.lon }], spec) === null,
    'a single fix must yield no rider');

  const raw = ramp(spec.ref, g0 - 5, gLast + 5, 1_700_300_000, 40);
  const allPreStart = raw.map((f) => ({ ...f, preStart: true }));
  assert(buildReplayRider('all-prestart', allPreStart, spec) === null,
    'a ride with every fix flagged preStart must yield no rider (none are usable)');

  const inOrder = buildReplayRider('order-forward', raw, spec);
  const reversed = buildReplayRider('order-reverse', [...raw].reverse(), spec);
  assert(inOrder !== null && reversed !== null, 'expected both orderings to yield a rider');
  assert(inOrder!.startMs === reversed!.startMs && inOrder!.finishMs === reversed!.finishMs,
    'chronologicalFixes must make fix order irrelevant to the derived crossings');
});

// ============================================================ riderPositionAt / replayClockS / replayTimebase

test('replay: riderPositionAt interpolates and clamps at both ends', () => {
  const r: ReplayRider = {
    rideId: 'hand-built', startMs: 0, finishMs: 20000, endMs: 20000,
    gateMs: [0, 20000],
    fixes: [
      { tUnixMs: 0, lat: 0, lon: 0, sM: 0 },
      { tUnixMs: 10000, lat: 0, lon: 0.001, sM: 100 },
      { tUnixMs: 20000, lat: 0, lon: 0.002, sM: 200 },
    ],
  };
  const mid = riderPositionAt(r, 5);
  assert(numEq(mid.lon, 0.0005, 1e-9), `expected lon 0.0005 at clockS 5, got ${mid.lon}`);
  assert(mid.sM !== null && numEq(mid.sM, 50, 1e-9), `expected sM 50 at clockS 5, got ${mid.sM}`);

  const before = riderPositionAt(r, -1);
  assert(numEq(before.lon, 0, 1e-9), `expected clamp to the first fix at clockS -1, got lon ${before.lon}`);

  const after = riderPositionAt(r, 30);
  assert(numEq(after.lon, 0.002, 1e-9), `expected clamp to the last fix at clockS 30, got lon ${after.lon}`);
});

test('replay: replayClockS advances by rate while playing, freezes when paused, never below 0', () => {
  const playing = { clockS: 100, realMs: 1000, rate: 10, playing: true };
  assert(numEq(replayClockS(playing, 2000), 110, 1e-9), `expected 110, got ${replayClockS(playing, 2000)}`);

  const paused = { ...playing, playing: false };
  assert(replayClockS(paused, 2000) === 100, `paused clock must not advance, got ${replayClockS(paused, 2000)}`);

  const fast = { clockS: 100, realMs: 1000, rate: 25, playing: true };
  assert(numEq(replayClockS(fast, 2000), 125, 1e-9), `expected 125 at rate 25, got ${replayClockS(fast, 2000)}`);

  const neverNegative = replayClockS({ clockS: 0, realMs: 5000, rate: 10, playing: true }, 4000);
  assert(neverNegative >= 0, `replayClockS must never go below 0, got ${neverNegative}`);
});

test('replay: replayTimebase maps the anchor 1:1 into a Timebase', () => {
  const a = { clockS: 42, realMs: 9000, rate: 10, playing: true };
  const tb = replayTimebase(a);
  assert(tb.anchorRealMs === a.realMs, 'anchorRealMs must equal realMs');
  assert(tb.anchorClockMs === a.clockS * 1000, 'anchorClockMs must equal clockS*1000');
  assert(tb.rate === a.rate, 'rate must pass through');
  assert(tb.running === a.playing, 'running must equal playing');
});

// ============================================================ replayGatesDone / replaySectorColours

test('replay: replayGatesDone — highest known crossed gate, a missed (null) gate skipped', () => {
  const r: ReplayRider = {
    rideId: 'gates-done', startMs: 0, finishMs: 400000, endMs: 400000,
    gateMs: [0, 100000, null, 300000, 400000],
    fixes: [{ tUnixMs: 0, lat: 0, lon: 0, sM: 0 }, { tUnixMs: 400000, lat: 0, lon: 0, sM: 0 }],
  };
  assert(replayGatesDone(r, 50) === 0, `expected 0 at clockS 50, got ${replayGatesDone(r, 50)}`);
  assert(replayGatesDone(r, 150) === 1, `expected 1 at clockS 150, got ${replayGatesDone(r, 150)}`);
  assert(replayGatesDone(r, 250) === 1, `expected 1 at clockS 250 (gate 2 missed), got ${replayGatesDone(r, 250)}`);
  assert(replayGatesDone(r, 350) === 3, `expected 3 at clockS 350, got ${replayGatesDone(r, 350)}`);
  assert(replayGatesDone(r, 400) === 4, `expected 4 at clockS 400, got ${replayGatesDone(r, 400)}`);
});

test('replay: replaySectorColours blanks every index beyond gatesDone, index 0 always null', () => {
  const got = replaySectorColours([null, 'a', 'b', 'c', 'd'], 2);
  assert(JSON.stringify(got) === JSON.stringify([null, 'a', 'b', null, null]),
    `expected [null,a,b,null,null], got ${JSON.stringify(got)}`);
  const none = replaySectorColours([null, 'a', 'b', 'c', 'd'], 0);
  assert(JSON.stringify(none) === JSON.stringify([null, null, null, null, null]),
    `expected all null at gatesDone 0, got ${JSON.stringify(none)}`);
});

// ============================================================ replayLiveViewModel

test('replay: replayLiveViewModel fills the strip as gates are crossed and reveals the lap at the end', () => {
  const sectorRows = [
    { index: 0, label: 'S1', timeLabel: '3:05', tier: 'purple' as const, avgLabel: '3:10' },
    { index: 1, label: 'S2', timeLabel: '2:40', tier: 'green' as const, avgLabel: '2:50' },
    { index: 2, label: 'S3', timeLabel: '3:20', tier: 'yellow' as const, avgLabel: '3:00' },
    { index: 3, label: 'S4', timeLabel: '1:10', tier: 'neutral' as const, avgLabel: '1:15' },
  ];
  const r: ReplayRider = {
    rideId: 'vm-test', startMs: 0, finishMs: 400000, endMs: 400000,
    gateMs: [0, 100000, 200000, 300000, 400000],
    fixes: [{ tUnixMs: 0, lat: 0, lon: 0, sM: 0 }, { tUnixMs: 400000, lat: 0, lon: 0, sM: 0 }],
  };
  const tb = replayTimebase({ clockS: 0, realMs: 0, rate: 10, playing: true });

  const before = replayLiveViewModel(r, sectorRows, '10:15', 0, tb, null);
  assert(before.strip.every((s) => s.tier === 'none'), 'before gate 1, every slot must be tier none');
  assert(before.strip[0].current === true, 'strip[0] must be current before any gate');
  assert(before.contextLabel === 'S1', `expected contextLabel S1, got ${before.contextLabel}`);
  assert(before.lap === null, 'lap must be null before the ride is over');
  assert(before.clock === tb, 'clock must be the SAME Timebase object passed in');

  const mid = replayLiveViewModel(r, sectorRows, '10:15', 200, tb, 'P3');
  assert(mid.strip[0].tier === 'purple' && mid.strip[0].time === '3:05', 'strip[0] must carry its stored tier/time once done');
  assert(mid.strip[1].tier === 'green' && mid.strip[1].time === '2:40', 'strip[1] must carry its stored tier/time once done');
  assert(mid.strip[2].current === true, 'strip[2] must be current after gate 2');
  assert(mid.contextLabel === 'S3', `expected contextLabel S3, got ${mid.contextLabel}`);
  assert(mid.livePos === 'P3', 'livePos must pass through unchanged');

  const done = replayLiveViewModel(r, sectorRows, '10:15', 400, tb, null);
  assert(done.contextLabel === '', 'contextLabel must be empty once every gate is done');
  assert(done.lap !== null && done.lap.tier === 'neutral' && done.lap.time === '10:15' && done.lap.delta === '',
    `expected the lap chip once finished, got ${JSON.stringify(done.lap)}`);

  const noFinish: ReplayRider = { ...r, finishMs: null };
  const doneNoFinish = replayLiveViewModel(noFinish, sectorRows, '10:15', 400, tb, null);
  assert(doneNoFinish.lap === null, 'lap must stay null when the ride never crossed FINISH, even with every gate done');
});

// ============================================================ priorWindowFor

test('replay: priorWindowFor — the as-ridden window, later rides never appear, capped at 9', () => {
  resetRecordedForTests();
  const wayId = 'ReplayTest:priorWindow';
  for (let n = 1; n <= 12; n++) {
    replaceRecorded(makeResult(`u${n}`, wayId, 1000 * n, { movingS: 500, rawS: 500, quality: 'clean' }));
  }
  replaceRecorded(makeResult('uIgnored', wayId, 6500, { movingS: 500, rawS: 500, quality: 'clean' }, { ignoredFromRanking: true }));

  const w1 = priorWindowFor(wayId, 'u1', 1000).map((r) => r.rideId);
  assert(JSON.stringify(w1) === JSON.stringify([]), `('u1', 1000) expected [], got ${JSON.stringify(w1)}`);

  const w2 = priorWindowFor(wayId, 'u2', 2000).map((r) => r.rideId);
  assert(JSON.stringify(w2) === JSON.stringify(['u1']), `('u2', 2000) expected [u1], got ${JSON.stringify(w2)}`);

  const w12 = priorWindowFor(wayId, 'u12', 12000).map((r) => r.rideId);
  const expected12 = ['u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9', 'u10', 'u11'];
  assert(JSON.stringify(w12) === JSON.stringify(expected12),
    `('u12', 12000) expected ${JSON.stringify(expected12)}, got ${JSON.stringify(w12)}`);
  assert(!w12.includes('uIgnored'), 'an ignoredFromRanking ride must never appear in the window');

  const w6 = priorWindowFor(wayId, 'u6', 6000).map((r) => r.rideId);
  const expected6 = ['u1', 'u2', 'u3', 'u4', 'u5'];
  assert(JSON.stringify(w6) === JSON.stringify(expected6),
    `('u6', 6000) expected ${JSON.stringify(expected6)}, got ${JSON.stringify(w6)} (later rides must be absent)`);
});

// ============================================================ loadSelfTracksFor / loadReplayRider

test('replay: loadSelfTracksFor over an explicit window returns exactly that window, and skips the fs entirely when empty', async () => {
  resetRecordedForTests();
  const spec = catalogTrackSpecs().find((s) => s.id === 'Morning');
  assert(spec !== undefined, 'expected Morning to resolve a TrackSpec from the runtime catalog');
  const g0 = spec!.gates[0];
  const gLast = spec!.gates[spec!.gates.length - 1];
  const raw = ramp(spec!.ref, g0 - 5, gLast + 5, 1_700_400_000, 40);
  const rideId = 'replaytest-window-entry';
  const fs = createMemoryFsAdapter();
  await fs.writeText(`rides/${rideId}.jsonl`, raw.map((f) => fixLine(f.tUnixMs, f.lat, f.lon)).join('\n') + '\n');
  const entry = makeResult(rideId, 'Morning', FAR_FUTURE_MS, { movingS: 900, rawS: 900, quality: 'clean' });

  const withEntry = await loadSelfTracksFor('Morning', 1, fs, [entry]);
  assert(withEntry.length === 1 && withEntry[0].rideId === rideId,
    `expected exactly one track for the explicit window, got ${JSON.stringify(withEntry.map((t) => t.rideId))}`);

  const throwingFs: FsAdapter = {
    ensureDir: async () => {},
    writeText: async () => {},
    appendText: async () => {},
    readText: async () => { throw new Error('must not be called for an empty window'); },
    exists: async () => false,
    listDir: async () => [],
    deleteFile: async () => {},
  };
  const empty = await loadSelfTracksFor('Morning', 1, throwingFs, []);
  assert(empty.length === 0, 'an empty window must return [] without reading the fs');

  // loadSelfTracks itself must still behave as selfrace_suite.ts already covers.
  const stillWorks = await loadSelfTracks('Morning', 1, fs);
  assert(Array.isArray(stillWorks), 'loadSelfTracks must still return an array after the split');
});

test('replay: loadReplayRider — memory fs round trip, and null on a missing/unknown/corrupt source', async () => {
  resetRecordedForTests();
  const spec = catalogTrackSpecs().find((s) => s.id === 'Morning');
  assert(spec !== undefined, 'expected Morning to resolve a TrackSpec from the runtime catalog');
  const g0 = spec!.gates[0];
  const gLast = spec!.gates[spec!.gates.length - 1];
  const raw = ramp(spec!.ref, g0 - 5, gLast + 5, 1_700_500_000, 40);
  const rideId = 'replaytest-loadreplayrider';
  const fs = createMemoryFsAdapter();
  await fs.writeText(`rides/${rideId}.jsonl`, raw.map((f) => fixLine(f.tUnixMs, f.lat, f.lon)).join('\n') + '\n');

  const viaLoader = await loadReplayRider(rideId, 'Morning', fs);
  const direct = buildReplayRider(rideId, raw, spec!);
  assert(viaLoader !== null && direct !== null, 'expected both the loader and the direct build to succeed');
  assert(viaLoader!.startMs === direct!.startMs, 'loader startMs must match a direct buildReplayRider call');

  const missing = await loadReplayRider('does-not-exist', 'Morning', fs);
  assert(missing === null, 'a missing ride file must yield null, not throw');

  const unknownWay = await loadReplayRider(rideId, 'NoSuchWay', fs);
  assert(unknownWay === null, 'an unknown wayId must yield null, not throw');

  const corruptFs = createMemoryFsAdapter();
  await corruptFs.writeText(`rides/${rideId}.jsonl`, 'not json\n');
  const corrupt = await loadReplayRider(rideId, 'Morning', corruptFs);
  assert(corrupt === null, 'a corrupt ride file must yield null, never throw');
});
