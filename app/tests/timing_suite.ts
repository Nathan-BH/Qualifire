/**
 * QA — WP-C: store/timing.ts's scoredS()/setTimingMode()/timingMode() and the
 * mode-dependent behaviour of every call site this WP rewired (results.ts's
 * ranks()/tower()/sectorHistory(), colourModel.ts's lapValues()/sectorValues()/
 * allTimeBestLapS(), sectorTrailModel.ts's storedSectorColours()/
 * liveSectorColours(), rideDetailModel.ts's rideDetailFor(), rideHistoryModel.ts's
 * buildPbDetail()).
 *
 * The timing register is process-global across suites (one module instance
 * for the whole run), so every test here sets its own mode at the start and
 * restores DEFAULT_TIMING at the end — never leaving the register in
 * 'moving' for a suite that runs after this one and never calls
 * setTimingMode() itself.
 *
 * store/timing.ts and store/results.ts are shim-free (no seed.json in their
 * import chain) and are imported statically. colourModel.ts (and everything
 * that imports it — sectorTrailModel.ts, rideDetailModel.ts,
 * rideHistoryModel.ts, lastRide.ts) pulls in store/seed.ts's bare
 * catalog/results seed JSON, so those are pulled in DYNAMICALLY, after the
 * loader hook exists — same shim as ridedetail_suite.ts/sectortrail_suite.ts/
 * live_colour_suite.ts (a static import is linked before any module body,
 * this hook included, runs).
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { assert, test } from './lib.ts';
import { DEFAULT_TIMING, scoredS, setTimingMode, timingMode } from '../src/store/timing.ts';
import { ranks, sectorHistory, tower } from '../src/store/results.ts';
import { RESULT_SCHEMA_VERSION, type RideResult } from '../src/store/types.ts';
import type { LiveEngineState } from '../src/live/engine.ts';
import type { RideDetailDeps } from '../src/ui/rideDetailModel.ts';

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const { lapValues, sectorValues, allTimeBestLapS, MIN_HISTORY } = await import('../src/ui/colourModel.ts');
const { resetRecordedForTests, rememberRide, getLastRide } = await import('../src/ui/lastRide.ts');
const { storedSectorColours, liveSectorColours } = await import('../src/ui/sectorTrailModel.ts');
const { rideDetailFor } = await import('../src/ui/rideDetailModel.ts');
const { buildPbDetail } = await import('../src/ui/rideHistoryModel.ts');

// ------------------------------------------------------------------ fixtures

/** Copy of store_suite.ts's mkResult — suites stay independent, never import
 * each other's fixtures. */
function mkResult(o: Partial<RideResult> & { rideId: string; startedAtMs: number }): RideResult {
  return {
    kind: 'rideResult',
    schemaVersion: RESULT_SCHEMA_VERSION,
    routeId: 'MorningA',
    source: 'app',
    lap: { rawS: 900, movingS: 880, quality: 'clean' },
    sectors: [
      { index: 1, fromChainageM: 160, toChainageM: 1500, rawS: 220, movingS: 210, quality: 'clean' },
      { index: 2, fromChainageM: 1500, toChainageM: 3000, rawS: 240, movingS: 235, quality: 'clean' },
    ],
    derivedBy: { engineVersion: 'e1', gateSetVersion: 1, resultSchemaVersion: RESULT_SCHEMA_VERSION },
    ...o,
  };
}

/** Copy of live_colour_suite.ts's stateWith/doneSector — suites stay
 * independent, never import each other's fixtures. */
function stateWith(over: Partial<LiveEngineState>): LiveEngineState {
  return {
    phase: 'finished', track: 'Morning', sectors: [], currentSector: null, lastDone: 4,
    lap: { rawS: 900, stoppedS: 20, movingS: 880, estimated: false },
    gateFires: 5, fixesFed: 900, onRoute: true, anyAnchored: false,
    ...over,
  } as LiveEngineState;
}

function doneSector(rawS: number, movingS: number) {
  return { kind: 'done' as const, rawS, stoppedS: rawS - movingS, movingS, interrupted: false, estimated: false };
}

// ------------------------------------------------------------------- tests

test('timing: default is raw wall-clock (STATE.md ground rule)', () => {
  assert(DEFAULT_TIMING === 'raw', 'DEFAULT_TIMING must be raw');
  assert(timingMode() === 'raw', 'a fresh import must default to raw');
  assert(scoredS({ rawS: 900, movingS: 880 }) === 900, 'raw mode reads rawS');
});

test('timing: moving is the opt-in', () => {
  setTimingMode('moving');
  assert(scoredS({ rawS: 900, movingS: 880 }) === 880, 'moving mode reads movingS');
  setTimingMode(DEFAULT_TIMING);
});

test("timing: scoredS keeps the store's no-real-time marker in BOTH modes", () => {
  setTimingMode('raw');
  assert(scoredS({ rawS: 900, movingS: null }) === null, 'raw: movingS null -> null');
  assert(scoredS({ rawS: null, movingS: null }) === null, 'raw: both null -> null');
  setTimingMode('moving');
  assert(scoredS({ rawS: 900, movingS: null }) === null, 'moving: movingS null -> null');
  assert(scoredS({ rawS: null, movingS: null }) === null, 'moving: both null -> null');
  setTimingMode(DEFAULT_TIMING);
});

test('timing: a lap with a stop ranks differently under raw vs moving', () => {
  const a = mkResult({ rideId: 'ta', startedAtMs: 1, lap: { rawS: 900, movingS: 880, quality: 'clean' } });
  const b = mkResult({ rideId: 'tb', startedAtMs: 2, lap: { rawS: 890, movingS: 895, quality: 'clean' } });

  setTimingMode('raw');
  const rowsRaw = new Map(tower([a, b]).map((r) => [r.rideId, r]));
  assert(rowsRaw.get('tb')!.position === 1 && rowsRaw.get('tb')!.timeS === 890,
    `raw: B (890) must beat A (900), got ${JSON.stringify([...rowsRaw.values()])}`);

  setTimingMode('moving');
  const rowsMoving = new Map(tower([a, b]).map((r) => [r.rideId, r]));
  assert(rowsMoving.get('ta')!.position === 1 && rowsMoving.get('ta')!.timeS === 880,
    `moving: A (880) must beat B (895), got ${JSON.stringify([...rowsMoving.values()])}`);

  // Same contrast one layer down: two clean sectors with swapped raw/moving order.
  const s1 = mkResult({
    rideId: 'ts1', startedAtMs: 3,
    sectors: [{ index: 1, fromChainageM: 0, toChainageM: 1000, rawS: 300, movingS: 280, quality: 'clean' }],
  });
  const s2 = mkResult({
    rideId: 'ts2', startedAtMs: 4,
    sectors: [{ index: 1, fromChainageM: 0, toChainageM: 1000, rawS: 290, movingS: 295, quality: 'clean' }],
  });
  setTimingMode('raw');
  const histRaw = sectorHistory([s1, s2], 1);
  assert(histRaw.includes(300) && histRaw.includes(290), `raw sectorHistory expected [300,290]-ish, got ${histRaw}`);
  setTimingMode('moving');
  const histMoving = sectorHistory([s1, s2], 1);
  assert(histMoving.includes(280) && histMoving.includes(295), `moving sectorHistory expected [280,295]-ish, got ${histMoving}`);

  setTimingMode(DEFAULT_TIMING);
});

test('timing: ranks() is mode-invariant', () => {
  const cases: { name: string; extra: Partial<RideResult> }[] = [
    { name: 'clean', extra: { lap: { rawS: 900, movingS: 880, quality: 'clean' } } },
    { name: 'interrupted', extra: { lap: { rawS: 900, movingS: 880, quality: 'interrupted' } } },
    { name: 'estimated', extra: { lap: { rawS: 900, movingS: null, quality: 'estimated' } } },
    { name: 'missed', extra: { lap: { rawS: 0, movingS: null, quality: 'missed' } } },
    { name: 'tripwire-demoted clean', extra: { lap: { rawS: 900, movingS: 880, quality: 'clean' }, tripwireDemoted: true } },
  ];
  for (const c of cases) {
    const r = mkResult({ rideId: `mi-${c.name}`, startedAtMs: 1, ...c.extra });
    setTimingMode('raw');
    const raw = ranks(r);
    setTimingMode('moving');
    const moving = ranks(r);
    assert(raw === moving, `${c.name}: ranks() must agree across modes (raw=${raw}, moving=${moving})`);
  }
  setTimingMode(DEFAULT_TIMING);
});

test('timing: lapValues / sectorValues / allTimeBestLapS follow the mode', () => {
  resetRecordedForTests();
  const priors = lapValues('Morning').length;
  assert(priors >= MIN_HISTORY, `Morning needs enough history for this test to mean anything, got ${priors}`);

  // Fastest on file under EITHER clock, so allTimeBestLapS picks it up regardless of mode.
  const movingLap = Math.min(...lapValues('Morning')) - 100;
  const rawLap = movingLap + 30;
  const movingSec = 50;
  const rawSec = movingSec + 10;

  rememberRide(stateWith({
    sectors: [doneSector(rawSec, movingSec), doneSector(100, 100), doneSector(100, 100), doneSector(100, 100)],
    lap: { rawS: rawLap, stoppedS: rawLap - movingLap, movingS: movingLap, estimated: false },
  }));
  const recorded = getLastRide();
  assert(recorded !== null, 'rememberRide() should have recorded a finished ride');

  setTimingMode('raw');
  assert(lapValues('Morning').includes(rawLap), 'raw: lapValues must contain the raw lap value');
  assert(!lapValues('Morning').includes(movingLap), 'raw: lapValues must not contain the moving lap value');
  assert(sectorValues('Morning', 1).includes(rawSec), 'raw: sectorValues must contain the raw sector value');
  assert(allTimeBestLapS('Morning') === rawLap, 'raw: allTimeBestLapS must be the raw lap (fastest on file)');

  setTimingMode('moving');
  assert(lapValues('Morning').includes(movingLap), 'moving: lapValues must contain the moving lap value');
  assert(!lapValues('Morning').includes(rawLap), 'moving: lapValues must not contain the raw lap value');
  assert(sectorValues('Morning', 1).includes(movingSec), 'moving: sectorValues must contain the moving sector value');
  assert(allTimeBestLapS('Morning') === movingLap, 'moving: allTimeBestLapS must be the moving lap (fastest on file)');

  setTimingMode(DEFAULT_TIMING);
  resetRecordedForTests();
});

test('timing: rideDetailFor prints and judges the scored clock', () => {
  const res: RideResult = {
    kind: 'rideResult', schemaVersion: RESULT_SCHEMA_VERSION, rideId: 'tr1', startedAtMs: 1,
    routeId: 'RouteA', source: 'app',
    lap: { rawS: 900, movingS: 880, quality: 'clean' },
    sectors: [{ index: 1, fromChainageM: 0, toChainageM: 1000, rawS: 440, movingS: 430, quality: 'clean' }],
    derivedBy: { engineVersion: 'e1', gateSetVersion: 1, resultSchemaVersion: RESULT_SCHEMA_VERSION },
  };
  const deps: RideDetailDeps = {
    result: res, free: null, routes: [], userRoutes: [],
    laps: () => [], sectors: () => [], barred: () => false,
  };

  setTimingMode('raw');
  const mRaw = rideDetailFor('tr1', 1, deps);
  assert(mRaw.lapLabel === '15:00.0', `raw lapLabel expected 15:00.0, got ${mRaw.lapLabel}`);
  assert(mRaw.sectorRows[0].timeLabel === '7:20.0', `raw sector timeLabel expected 7:20.0, got ${mRaw.sectorRows[0].timeLabel}`);

  setTimingMode('moving');
  const mMoving = rideDetailFor('tr1', 1, deps);
  assert(mMoving.lapLabel === '14:40.0', `moving lapLabel expected 14:40.0, got ${mMoving.lapLabel}`);
  assert(mMoving.sectorRows[0].timeLabel === '7:10.0', `moving sector timeLabel expected 7:10.0, got ${mMoving.sectorRows[0].timeLabel}`);

  setTimingMode(DEFAULT_TIMING);
});

test('timing: buildPbDetail orders rides and picks the sector best by the scored clock', () => {
  const ra: RideResult = {
    kind: 'rideResult', schemaVersion: RESULT_SCHEMA_VERSION, rideId: 'pa', startedAtMs: 1,
    routeId: 'RouteA', source: 'app',
    lap: { rawS: 900, movingS: 880, quality: 'clean' },
    sectors: [{ index: 1, fromChainageM: 0, toChainageM: 1000, rawS: 440, movingS: 430, quality: 'clean' }],
    derivedBy: { engineVersion: 'e1', gateSetVersion: 1, resultSchemaVersion: RESULT_SCHEMA_VERSION },
  };
  const rb: RideResult = {
    ...ra, rideId: 'pb', startedAtMs: 2,
    lap: { rawS: 890, movingS: 895, quality: 'clean' },
    sectors: [{ index: 1, fromChainageM: 0, toChainageM: 1000, rawS: 420, movingS: 450, quality: 'clean' }],
  };

  setTimingMode('raw');
  const rawDetail = buildPbDetail([ra, rb], null);
  assert(rawDetail.ranking[0].timeLabel === '14:50',
    `raw: pole should be B's raw time (890), got ${rawDetail.ranking[0].timeLabel}`);
  assert(rawDetail.pbSectors[0].timeLabel === '7:00.0',
    `raw: pbSectors should pick B's raw sector (420), got ${rawDetail.pbSectors[0].timeLabel}`);

  setTimingMode('moving');
  const movingDetail = buildPbDetail([ra, rb], null);
  assert(movingDetail.ranking[0].timeLabel === '14:40',
    `moving: pole should be A's moving time (880), got ${movingDetail.ranking[0].timeLabel}`);
  assert(movingDetail.pbSectors[0].timeLabel === '7:10.0',
    `moving: pbSectors should pick A's moving sector (430), got ${movingDetail.pbSectors[0].timeLabel}`);

  setTimingMode(DEFAULT_TIMING);
});

test('timing: storedSectorColours / liveSectorColours colour the scored clock', () => {
  const HIST5 = [100, 100, 100, 100, 100]; // best 100, mean 100 — only < best (purple) or not (yellow)
  const paint = (t: string): string => t;
  const storedRide = { sectors: [{ index: 1, rawS: 105, movingS: 95, quality: 'clean' }] };
  const liveSectors = [{ kind: 'done' as const, rawS: 105, stoppedS: 10, movingS: 95, interrupted: false, estimated: false }];

  setTimingMode('raw');
  assert(storedSectorColours(storedRide, () => HIST5, paint)[1] === 'yellow', 'raw stored: expected yellow (105)');
  assert(liveSectorColours(liveSectors, () => HIST5, paint)[1] === 'yellow', 'raw live: expected yellow (105)');

  setTimingMode('moving');
  assert(storedSectorColours(storedRide, () => HIST5, paint)[1] === 'purple', 'moving stored: expected purple (95)');
  assert(liveSectorColours(liveSectors, () => HIST5, paint)[1] === 'purple', 'moving live: expected purple (95)');

  setTimingMode(DEFAULT_TIMING);
});

test('timing: an interrupted live sector never colours, an estimated one never scores — in either mode', () => {
  const HIST5 = [100, 100, 100, 100, 100];
  const paint = (t: string): string => t;
  const sectors = [
    { kind: 'done' as const, rawS: 90, stoppedS: 0, movingS: 90, interrupted: true, estimated: false },
    { kind: 'done' as const, rawS: 90, stoppedS: 0, movingS: 90, interrupted: false, estimated: true },
  ];
  for (const m of ['raw', 'moving'] as const) {
    setTimingMode(m);
    const out = liveSectorColours(sectors, () => HIST5, paint);
    assert(out[1] === null, `${m}: interrupted must never colour, got ${out[1]}`);
    assert(out[2] === null, `${m}: estimated must never colour, got ${out[2]}`);
  }
  setTimingMode(DEFAULT_TIMING);
});
