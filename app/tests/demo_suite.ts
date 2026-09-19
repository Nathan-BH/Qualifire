/**
 * WP-O (DEMO tab modes) suite — demoModel.ts is pure, no React/manifest, but
 * it statically imports colourModel.ts, which (like live_colour_suite.ts's
 * subjects) statically imports the app's bare `.json` seed. Metro bundles
 * that directly; plain Node ESM needs an import attribute it cannot get
 * without changing app code. Same fix as live_colour_suite.ts: load JSON
 * through a hook and pull the modules under test in DYNAMICALLY, after the
 * hook exists (static imports are linked before any module body runs, which
 * is why this cannot be a plain top-level import).
 *
 * Per the brief's §4 Test plan: buildDemoScript's fixed gate/lap arithmetic,
 * the pinned fixture's tier verdicts (so the demo can never drift back to
 * all-neutral), the null passthrough to 'est', the MIN_HISTORY floor on
 * every DEMO_HISTORY sector, and demoSectorColours' gate-progression rule.
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { assert, test } from './lib.ts';

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const { MIN_HISTORY, WINDOW_N, WINDOW_PREV } = await import('../src/ui/colourModel.ts');
const { CLIMB_MAX_MS, climbMsFor } = await import('../src/ui/rankingRevealModel.ts');
const { TOWER_MAX_VISIBLE, towerDate } = await import('../src/ui/towerModel.ts');
const {
  buildDemoScript, demoTier, demoSectorColours, DEMO_HISTORY, DEMO_SECS,
  demoRunEndS, DEMO_ROLL_OUT_S, demoStopOutcome, demoLiveViewModel, demoSavedLine, demoFmtMS,
  DEMO_PRIOR_LAPS, DEMO_PRIOR_DAYS_AGO, DEMO_ROUTE_LABEL,
  demoHistoryFor, demoPriorLapSeconds, demoPriorResults, buildDemoReveal, demoAddedWayLine,
  demoChainage, demoSelfTracks, DEMO_SELF_FIX_STEP_S,
  demoRefFixes, demoGateAdjustDraft,
} = await import('../src/ui/demoModel.ts');
const { DEMO_WAY_ID, DEMO_WAY_ASSET } = await import('../src/ui/demoWayFixture.ts');
const { selfDotsAt, selfLivePosition } = await import('../src/ui/selfRaceModel.ts');
const { positionAtTime } = await import('../src/ui/wayMapMath.ts');
const { START_FRAC, FINISH_FRAC, SECTOR_FRACS, seedGateChainages } = await import('../src/store/gateSeeding.ts');
const { MIN_TRACK_LENGTH_M } = await import('../src/store/routeCreation.ts');

test('demoModel: buildDemoScript() with default secs computes gateAt/lap', () => {
  const s = buildDemoScript();
  assert(s.secs === DEMO_SECS, 'secs should be the default DEMO_SECS array');
  assert(
    s.gateAt.length === 5 && s.gateAt.every((v, i) => v === [0, 185, 392, 629, 836][i]),
    `expected gateAt [0,185,392,629,836], got [${s.gateAt}]`,
  );
  assert(s.lap === 836, `expected lap 836, got ${s.lap}`);
});

test('demoModel: demoTier pins the fixture — S1 purple, S2 green, S3 yellow, S4 green, lap green', () => {
  assert(demoTier(1, 185) === 'purple', `S1: expected purple, got ${demoTier(1, 185)}`);
  assert(demoTier(2, 207) === 'green', `S2: expected green, got ${demoTier(2, 207)}`);
  assert(demoTier(3, 237) === 'yellow', `S3: expected yellow, got ${demoTier(3, 237)}`);
  assert(demoTier(4, 207) === 'green', `S4: expected green, got ${demoTier(4, 207)}`);
  assert(demoTier(0, 836) === 'green', `lap: expected green, got ${demoTier(0, 836)}`);
});

test('demoModel: demoTier(i, null) is always est, regardless of sector', () => {
  for (let i = 0; i <= 4; i++) {
    assert(demoTier(i, null) === 'est', `demoTier(${i}, null) expected 'est', got ${demoTier(i, null)}`);
  }
});

test('demoModel: every DEMO_HISTORY sector clears MIN_HISTORY', () => {
  for (let i = 0; i < DEMO_HISTORY.length; i++) {
    assert(
      DEMO_HISTORY[i].length >= MIN_HISTORY,
      `DEMO_HISTORY[${i}] has ${DEMO_HISTORY[i].length} entries, needs >= MIN_HISTORY (${MIN_HISTORY})`,
    );
  }
});

test('demoModel: demoSectorColours before any gate is all null', () => {
  const script = buildDemoScript();
  const out = demoSectorColours(script, 0, () => 'X');
  assert(out.length === script.secs.length + 1, `expected length ${script.secs.length + 1}, got ${out.length}`);
  assert(out.every((c) => c === null), `expected all null, got [${out}]`);
});

test('demoModel: demoSectorColours at gatesDone=2 paints indices 1-2 only', () => {
  const script = buildDemoScript();
  const out = demoSectorColours(script, 2, (tier) => tier);
  assert(out.length === 5, `expected length 5, got ${out.length}`);
  assert(out[0] === null, `index 0 should stay null, got ${out[0]}`);
  assert(out[1] === demoTier(1, script.secs[0]), `index 1 mismatch: ${out[1]}`);
  assert(out[2] === demoTier(2, script.secs[1]), `index 2 mismatch: ${out[2]}`);
  assert(out[3] === null, `index 3 should be null at gatesDone=2, got ${out[3]}`);
  assert(out[4] === null, `index 4 should be null at gatesDone=2, got ${out[4]}`);
});

test('demoModel: demoSectorColours at gatesDone=4 paints indices 1-4, index 0 stays null', () => {
  const script = buildDemoScript();
  const out = demoSectorColours(script, 4, (tier) => tier);
  assert(out.length === 5, `expected length 5, got ${out.length}`);
  assert(out[0] === null, `index 0 should stay null, got ${out[0]}`);
  for (let i = 1; i <= 4; i++) {
    assert(out[i] !== null, `index ${i} should be painted at gatesDone=4, got null`);
  }
});

// virgin-cycle11 (DEMO overhaul, brief A) below.

test('demoModel: the run rolls out past the lap, then ends', () => {
  const script = buildDemoScript();
  assert(demoRunEndS(script) === 836 + DEMO_ROLL_OUT_S, `expected ${836 + DEMO_ROLL_OUT_S}, got ${demoRunEndS(script)}`);
  assert(DEMO_ROLL_OUT_S >= 30, `DEMO_ROLL_OUT_S must be >= 30 (brief C's slowest self), got ${DEMO_ROLL_OUT_S}`);
});

test('demoModel: STOP skips before the line, ends after it', () => {
  for (let g = 0; g <= 3; g++) {
    assert(demoStopOutcome(g) === 'skip', `demoStopOutcome(${g}) expected 'skip', got ${demoStopOutcome(g)}`);
  }
  assert(demoStopOutcome(4) === 'ending', `demoStopOutcome(4) expected 'ending', got ${demoStopOutcome(4)}`);
});

test('demoModel: the lap chip is neutral at the line (R5)', () => {
  const script = buildDemoScript();
  const T = 5000;
  const before = demoLiveViewModel(script, 835, T);
  assert(before.lap === null, `at 835 (before the line) expected lap === null, got ${JSON.stringify(before.lap)}`);

  const atLine = demoLiveViewModel(script, 836, T);
  assert(atLine.lap !== null, 'at 836 (the line) expected a lap chip');
  assert(atLine.lap!.tier === 'neutral', `expected tier 'neutral', got ${atLine.lap!.tier}`);
  assert(atLine.lap!.time === '13:56', `expected time '13:56', got ${atLine.lap!.time}`);
  assert(atLine.posChip === null, `expected posChip null, got ${atLine.posChip}`);
  assert(atLine.livePos === null, `expected livePos null, got ${atLine.livePos}`);

  const rollOut = demoLiveViewModel(script, 900, T);
  assert(rollOut.lap !== null && rollOut.lap.tier === 'neutral', 'roll-out (900) should keep the neutral lap chip');
});

test('demoModel: the strip is the pinned fixture', () => {
  const script = buildDemoScript();
  const atLine = demoLiveViewModel(script, 836, 0);
  const tiers = atLine.strip.map((s) => s.tier);
  const times = atLine.strip.map((s) => s.time);
  assert(
    tiers.join(',') === 'purple,green,yellow,green',
    `expected purple,green,yellow,green, got ${tiers.join(',')}`,
  );
  assert(
    times.join(',') === '3:05,3:27,3:57,3:27',
    `expected 3:05,3:27,3:57,3:27, got ${times.join(',')}`,
  );

  const mid = demoLiveViewModel(script, 400, 0);
  assert(mid.strip[0].tier !== 'none' && mid.strip[0].time !== undefined, 'slot 1 should have a tier/time at clockS=400');
  assert(mid.strip[1].tier !== 'none' && mid.strip[1].time !== undefined, 'slot 2 should have a tier/time at clockS=400');
  assert(mid.strip[2].tier === 'none' && mid.strip[2].time === undefined, 'slot 3 should be none/undefined at clockS=400');
  assert(mid.strip[2].current === true, 'slot 3 should be current at clockS=400');
  assert(mid.strip[3].tier === 'none' && mid.strip[3].time === undefined, 'slot 4 should be none/undefined at clockS=400');
});

test('demoModel: timebase anchor is the demo clock', () => {
  const script = buildDemoScript();
  const vm = demoLiveViewModel(script, 100, 5000);
  assert(
    vm.clock !== null
      && vm.clock.anchorRealMs === 5000
      && vm.clock.anchorClockMs === 100000
      && vm.clock.rate === 1
      && vm.clock.running === false,
    `unexpected clock: ${JSON.stringify(vm.clock)}`,
  );
});

test('demoModel: the fake-save line', () => {
  const line = demoSavedLine({ start: ' Home ', end: 'Work' });
  assert(
    line === 'Home → Work created · demo only, nothing saved',
    `unexpected line: ${line}`,
  );
});

test('demoModel: demoFmtMS matches the old DemoScreen fmtMS format', () => {
  assert(demoFmtMS(836) === '13:56', `expected '13:56', got ${demoFmtMS(836)}`);
  assert(demoFmtMS(65) === '1:05', `expected '1:05', got ${demoFmtMS(65)}`);
});

// virgin-cycle11 (DEMO overhaul, brief B) below.

test('demoModel: nine pinned laps per sector, four sectors, nine dates', () => {
  assert(DEMO_HISTORY.length === 4, `expected 4 sectors, got ${DEMO_HISTORY.length}`);
  for (let i = 0; i < DEMO_HISTORY.length; i++) {
    assert(DEMO_HISTORY[i].length === 9, `DEMO_HISTORY[${i}] has ${DEMO_HISTORY[i].length} laps, want 9`);
  }
  assert(
    DEMO_PRIOR_LAPS.tenth === WINDOW_PREV && DEMO_PRIOR_LAPS.tenth === DEMO_HISTORY[0].length,
    `DEMO_PRIOR_LAPS.tenth (${DEMO_PRIOR_LAPS.tenth}) must equal WINDOW_PREV (${WINDOW_PREV}) and DEMO_HISTORY[0].length (${DEMO_HISTORY[0].length})`,
  );
  assert(DEMO_PRIOR_DAYS_AGO.length === 9, `DEMO_PRIOR_DAYS_AGO has ${DEMO_PRIOR_DAYS_AGO.length} entries, want 9`);
  for (let i = 1; i < DEMO_PRIOR_DAYS_AGO.length; i++) {
    assert(
      DEMO_PRIOR_DAYS_AGO[i] < DEMO_PRIOR_DAYS_AGO[i - 1],
      `DEMO_PRIOR_DAYS_AGO must be strictly decreasing, broke at index ${i}: [${DEMO_PRIOR_DAYS_AGO}]`,
    );
  }
});

test('demoModel: lap seconds are the column sums', () => {
  const nine = demoPriorLapSeconds(9);
  assert(
    JSON.stringify(nine) === JSON.stringify([840, 830, 853, 844, 848, 835, 845, 865, 842]),
    `demoPriorLapSeconds(9) = [${nine}], want [840,830,853,844,848,835,845,865,842]`,
  );
  const one = demoPriorLapSeconds(1);
  assert(JSON.stringify(one) === JSON.stringify([842]), `demoPriorLapSeconds(1) = [${one}], want [842]`);
  const hist1 = demoHistoryFor(1);
  assert(
    JSON.stringify(hist1) === JSON.stringify([[191], [209], [233], [209]]),
    `demoHistoryFor(1) = ${JSON.stringify(hist1)}, want [[191],[209],[233],[209]]`,
  );
  const hist0 = demoHistoryFor(0);
  assert(
    hist0.length === 4 && hist0.every((row) => row.length === 0),
    `demoHistoryFor(0) should be four empty rows, got ${JSON.stringify(hist0)}`,
  );
});

test('demoModel: TENTH RIDE keeps the three-colour pin', () => {
  const secTiers = [1, 2, 3, 4].map((i) => demoTier(i, DEMO_SECS[i - 1], 9));
  assert(
    secTiers.join(',') === 'purple,green,yellow,green',
    `TENTH RIDE sector tiers = ${secTiers.join(',')}, want purple,green,yellow,green`,
  );
  assert(demoTier(0, 836, 9) === 'green', `TENTH RIDE lap tier = ${demoTier(0, 836, 9)}, want green`);
});

test('demoModel: SECOND RIDE is purple/yellow only', () => {
  const secTiers = [1, 2, 3, 4].map((i) => demoTier(i, DEMO_SECS[i - 1], 1));
  assert(
    secTiers.join(',') === 'purple,purple,yellow,purple',
    `SECOND RIDE sector tiers = ${secTiers.join(',')}, want purple,purple,yellow,purple`,
  );
  assert(demoTier(0, 836, 1) === 'purple', `SECOND RIDE lap tier = ${demoTier(0, 836, 1)}, want purple`);
  assert(!secTiers.includes('green'), `no sector should be green at depth 1, got ${secTiers.join(',')}`);
});

test('demoModel: FIRST RIDE is neutral everywhere', () => {
  for (let i = 1; i <= 4; i++) {
    assert(
      demoTier(i, DEMO_SECS[i - 1], 0) === 'neutral',
      `FIRST RIDE sector ${i} tier = ${demoTier(i, DEMO_SECS[i - 1], 0)}, want neutral`,
    );
  }
  assert(demoTier(0, 836, 0) === 'neutral', `FIRST RIDE lap tier = ${demoTier(0, 836, 0)}, want neutral`);
});

test('demoModel: synthetic results have the store\'s shape', () => {
  const T = 2_000_000_000_000;
  const nine = demoPriorResults(9, T);
  assert(nine.length === 9, `demoPriorResults(9, T) length = ${nine.length}, want 9`);
  assert(
    nine.every((r, i) => r.rideId === `demo:prior-${i + 1}`),
    `ids must be demo:prior-1..9, got ${nine.map((r) => r.rideId).join(',')}`,
  );
  assert(nine.every((r) => r.source === 'app'), 'every synthetic result must have source "app"');
  assert(nine.every((r) => r.wayId === DEMO_WAY_ID), 'every synthetic result must carry the demo way id');
  assert(nine.every((r) => r.lap.rawS === r.lap.movingS), 'rawS must equal movingS on every synthetic result');
  for (let i = 1; i < nine.length; i++) {
    assert(nine[i].startedAtMs > nine[i - 1].startedAtMs, `startedAtMs must be strictly increasing at index ${i}`);
  }
  nine.forEach((r, k) => {
    const want = T - DEMO_PRIOR_DAYS_AGO[k] * 86_400_000;
    assert(r.startedAtMs === want, `nine[${k}].startedAtMs = ${r.startedAtMs}, want ${want}`);
  });
  const one = demoPriorResults(1, T);
  assert(one.length === 1, `demoPriorResults(1, T) length = ${one.length}, want 1`);
  assert(
    JSON.stringify(one[0]) === JSON.stringify(nine[8]),
    `demoPriorResults(1, T) must be exactly the last of demoPriorResults(9, T)`,
  );
});

test('demoModel: no reveal on ride 1', () => {
  const T = 2_000_000_000_000;
  assert(buildDemoReveal('first', T) === null, 'buildDemoReveal("first", T) must be null');
});

test('demoModel: SECOND RIDE — P1 of 2, purple, one row climbed, today is the PB', () => {
  const T = 2_000_000_000_000;
  const r = buildDemoReveal('second', T);
  assert(r !== null, 'buildDemoReveal("second", T) must not be null');
  assert(r!.pos === 1 && r!.of === 2, `pos/of = ${r!.pos}/${r!.of}, want 1/2`);
  assert(r!.tier === 'purple', `tier = ${r!.tier}, want purple`);
  assert(r!.rowsPassed === 1, `rowsPassed = ${r!.rowsPassed}, want 1`);
  assert(r!.climbMs === 800, `climbMs = ${r!.climbMs}, want 800`);
  const today = r!.model.rows.find((row) => row.today)!;
  assert(today.pb === true, 'today must carry the PB');
  assert(today.time === '13:56', `today.time = ${today.time}, want 13:56`);
  assert(today.gap === '—', `today.gap = ${today.gap}, want —`);
  const other = r!.model.rows.find((row) => !row.today)!;
  assert(other.time === '14:02', `other.time = ${other.time}, want 14:02`);
  assert(other.gap === '+6s', `other.gap = ${other.gap}, want +6s`);
});

test('demoModel: TENTH RIDE — P3 of 10, green, seven rows climbed, P1 is the PB', () => {
  const T = 2_000_000_000_000;
  const r = buildDemoReveal('tenth', T);
  assert(r !== null, 'buildDemoReveal("tenth", T) must not be null');
  assert(r!.pos === 3, `pos = ${r!.pos}, want 3`);
  assert(r!.tier === 'green', `tier = ${r!.tier}, want green`);
  assert(r!.rowsPassed === 7, `rowsPassed = ${r!.rowsPassed}, want 7`);
  assert(r!.climbMs === climbMsFor(7) && r!.climbMs === 2000, `climbMs = ${r!.climbMs}, want ${climbMsFor(7)} (2000)`);
  assert(r!.climbMs < CLIMB_MAX_MS, `climbMs (${r!.climbMs}) must be < CLIMB_MAX_MS (${CLIMB_MAX_MS})`);
  for (let i = 1; i < r!.model.rows.length; i++) {
    const a = r!.model.rows[i - 1].time.split(':').reduce((acc, v) => acc * 60 + Number(v), 0);
    const b = r!.model.rows[i].time.split(':').reduce((acc, v) => acc * 60 + Number(v), 0);
    assert(a <= b, `rows must ascend by parsed time, broke at index ${i}: ${r!.model.rows.map((x) => x.time)}`);
  }
  assert(r!.model.rows.filter((row) => row.today).length === 1, 'exactly one row must be today');
  assert(r!.model.rows[0].time === '13:50' && r!.model.rows[0].pb === true, `rows[0] = ${JSON.stringify(r!.model.rows[0])}`);
  const today = r!.model.rows.find((row) => row.today)!;
  assert(today.gap === '+6s' && today.pb === false, `today = ${JSON.stringify(today)}`);
});

test('demoModel: TENTH RIDE\'s board is the whole pool, and the tower shows all of it (R2/R5)', () => {
  const T = 2_000_000_000_000;
  const r = buildDemoReveal('tenth', T)!;
  assert(r.of === WINDOW_N, `r.of = ${r.of}, want WINDOW_N (${WINDOW_N})`);
  assert(r.model.rows.length === WINDOW_N, `r.model.rows.length = ${r.model.rows.length}, want WINDOW_N (${WINDOW_N})`);
  assert(
    r.model.rows.length <= TOWER_MAX_VISIBLE,
    `r.model.rows.length (${r.model.rows.length}) must be <= TOWER_MAX_VISIBLE (${TOWER_MAX_VISIBLE})`,
  );
  assert(r.model.rows[9].time === '14:25', `rows[9].time = ${r.model.rows[9].time}, want 14:25`);
});

test('demoModel: dates are the priors\' dates', () => {
  const T = 2_000_000_000_000;
  const r = buildDemoReveal('tenth', T)!;
  const row = r.model.rows.find((x) => x.time === '13:50')!;
  const want = towerDate(T - 14 * 86_400_000);
  assert(row.date === want, `row.date = ${row.date}, want ${want}`);
});

test('demoModel: the ADD WAY line', () => {
  const withSpecs = demoAddedWayLine(DEMO_ROUTE_LABEL, ['Dry', ' Left ']);
  assert(
    withSpecs === 'Home → Work · Dry · Left added as a new way · demo only, nothing saved',
    `unexpected line: ${withSpecs}`,
  );
  const noSpecs = demoAddedWayLine(DEMO_ROUTE_LABEL, []);
  assert(
    noSpecs === 'Home → Work added as a new way · demo only, nothing saved',
    `unexpected line: ${noSpecs}`,
  );
});

// virgin-cycle11 (DEMO overhaul, brief C) below — synthetic self dots + live P.

test('demoModel: demoChainage — 0 at START, 1 at G1, 4 at FINISH, clamped, monotone', () => {
  const gateAt = [0, 185, 392, 629, 836];
  assert(demoChainage(gateAt, 0) === 0, `t=0 expected 0, got ${demoChainage(gateAt, 0)}`);
  assert(demoChainage(gateAt, 92.5) === 0.5, `t=92.5 expected 0.5, got ${demoChainage(gateAt, 92.5)}`);
  assert(demoChainage(gateAt, 185) === 1, `t=185 expected 1, got ${demoChainage(gateAt, 185)}`);
  assert(demoChainage(gateAt, 836) === 4, `t=836 expected 4, got ${demoChainage(gateAt, 836)}`);
  assert(demoChainage(gateAt, 900) === 4, `t=900 expected 4, got ${demoChainage(gateAt, 900)}`);
  assert(demoChainage(gateAt, -5) === 0, `t=-5 expected 0, got ${demoChainage(gateAt, -5)}`);
  let prev = -Infinity;
  for (let t = 0; t <= 900; t++) {
    const v = demoChainage(gateAt, t);
    assert(v >= prev, `demoChainage must be non-decreasing, broke at t=${t}: ${v} < ${prev}`);
    prev = v;
  }
});

test('demoModel: demoSelfTracks(9) shares ids/starts/laps with demoPriorResults(9)', () => {
  const T = 2_000_000_000_000;
  const tracks = demoSelfTracks(9, T);
  const results = demoPriorResults(9, T);
  assert(tracks.length === 9, `expected 9 tracks, got ${tracks.length}`);
  assert(
    JSON.stringify(tracks.map((t) => t.rideId)) === JSON.stringify(results.map((r) => r.rideId)),
    `ids mismatch: ${tracks.map((t) => t.rideId)} vs ${results.map((r) => r.rideId)}`,
  );
  const laps = demoPriorLapSeconds(9);
  tracks.forEach((t, k) => {
    assert(t.startMs === results[k].startedAtMs, `tracks[${k}].startMs = ${t.startMs}, want ${results[k].startedAtMs}`);
    assert(t.lapS === laps[k], `tracks[${k}].lapS = ${t.lapS}, want ${laps[k]}`);
    assert(t.finishMs - t.startMs === t.lapS * 1000, `tracks[${k}] finishMs-startMs must equal lapS*1000`);
  });
});

test('demoModel: demoSelfTracks fixes are 2s apart, start/end on the path, sM 0 -> 4', () => {
  const T = 2_000_000_000_000;
  const tracks = demoSelfTracks(9, T);
  const cols = demoHistoryFor(9);
  tracks.forEach((t, k) => {
    const secsForCol = cols.map((sector) => sector[k]);
    const gateAtK = buildDemoScript(secsForCol).gateAt;
    assert(t.fixes[0].tUnixMs === t.startMs, `track ${k}: fixes[0].tUnixMs = ${t.fixes[0].tUnixMs}, want ${t.startMs}`);
    assert(
      t.fixes[t.fixes.length - 1].tUnixMs === t.finishMs,
      `track ${k}: last fix tUnixMs = ${t.fixes[t.fixes.length - 1].tUnixMs}, want ${t.finishMs}`,
    );
    for (let i = 1; i < t.fixes.length; i++) {
      const gap = t.fixes[i].tUnixMs - t.fixes[i - 1].tUnixMs;
      const isLast = i === t.fixes.length - 1;
      assert(
        gap === DEMO_SELF_FIX_STEP_S * 1000 || (isLast && gap <= DEMO_SELF_FIX_STEP_S * 1000),
        `track ${k}: gap at ${i} = ${gap}, want ${DEMO_SELF_FIX_STEP_S * 1000} (or <= on the last)`,
      );
    }
    assert(t.fixes[0].sM === 0, `track ${k}: fixes[0].sM = ${t.fixes[0].sM}, want 0`);
    assert(
      t.fixes[t.fixes.length - 1].sM === 4,
      `track ${k}: last fix sM = ${t.fixes[t.fixes.length - 1].sM}, want 4`,
    );
    for (let i = 1; i < t.fixes.length; i++) {
      assert((t.fixes[i].sM ?? -1) >= (t.fixes[i - 1].sM ?? -1), `track ${k}: sM must be non-decreasing at ${i}`);
    }
    const first = positionAtTime(DEMO_WAY_ASSET, gateAtK, 0)!;
    const last = positionAtTime(DEMO_WAY_ASSET, gateAtK, t.lapS)!;
    assert(t.fixes[0].lat === first.lat && t.fixes[0].lon === first.lon, `track ${k}: first fix position mismatch`);
    assert(
      t.fixes[t.fixes.length - 1].lat === last.lat && t.fixes[t.fixes.length - 1].lon === last.lon,
      `track ${k}: last fix position mismatch`,
    );
  });
});

test('demoModel: demoSelfTracks(1) is prior-9 only; demoSelfTracks(0) is empty', () => {
  const T = 2_000_000_000_000;
  const one = demoSelfTracks(1, T);
  assert(one.length === 1, `demoSelfTracks(1, T) length = ${one.length}, want 1`);
  assert(one[0].rideId === 'demo:prior-9', `expected rideId demo:prior-9, got ${one[0].rideId}`);
  assert(one[0].lapS === 842, `expected lapS 842, got ${one[0].lapS}`);
  const zero = demoSelfTracks(0, T);
  assert(zero.length === 0, `demoSelfTracks(0, T) should be [], got length ${zero.length}`);
});

test('demoModel: before RUN every self waits parked on START', () => {
  const T = 2_000_000_000_000;
  const tracks = demoSelfTracks(9, T);
  const dots = selfDotsAt(tracks, null);
  assert(dots.length === 9, `expected 9 dots, got ${dots.length}`);
  const start = DEMO_WAY_ASSET.path![DEMO_WAY_ASSET.gateIdx![0]];
  assert(dots.every((d) => d.state === 'waiting'), `every dot should be 'waiting', got ${dots.map((d) => d.state)}`);
  assert(
    dots.every((d) => d.lat === start[0] && d.lon === start[1]),
    `every dot should be parked at START (${start}), got ${dots.map((d) => [d.lat, d.lon])}`,
  );
});

test('demoModel: at 836s the two fastest selfs have finished; prior-2 is best', () => {
  const T = 2_000_000_000_000;
  const tracks = demoSelfTracks(9, T);
  const dots = selfDotsAt(tracks, 836_000);
  const byId = new Map(dots.map((d) => [d.rideId, d]));
  assert(byId.get('demo:prior-2')!.state === 'finished', 'prior-2 should be finished at 836s');
  assert(byId.get('demo:prior-6')!.state === 'finished', 'prior-6 should be finished at 836s');
  const others = dots.filter((d) => d.rideId !== 'demo:prior-2' && d.rideId !== 'demo:prior-6');
  assert(
    others.every((d) => d.state === 'racing'),
    `the other 7 should still be racing, got ${others.map((d) => [d.rideId, d.state])}`,
  );
  assert(byId.get('demo:prior-2')!.best === true, 'prior-2 should be best');
  assert(byId.get('demo:prior-2')!.rank === 1, 'prior-2 should be rank 1');
  assert(byId.get('demo:prior-2')!.tier === 'purple', 'prior-2 should be purple');
  assert(byId.get('demo:prior-8')!.rank === 9, 'prior-8 should be rank 9');
  assert(byId.get('demo:prior-8')!.tier === 'yellow', 'prior-8 should be yellow');
  assert(byId.get('demo:prior-4')!.tier === 'green', 'prior-4 should be green (below the mean)');
});

test('demoModel: the live P via demoChainage agrees with the tower', () => {
  const T = 2_000_000_000_000;
  const tracks = demoSelfTracks(9, T);
  const gateAt = [0, 185, 392, 629, 836];
  const p1 = selfLivePosition(selfDotsAt(tracks, 100_000), demoChainage(gateAt, 100));
  assert(p1 === 1, `at 100s expected P1, got P${p1}`);
  const p3 = selfLivePosition(selfDotsAt(tracks, 820_000), demoChainage(gateAt, 820));
  assert(p3 === 3, `at 820s expected P3 (matching B's reveal), got P${p3}`);
});

test('demoModel: everyone has finished by the end of the roll-out', () => {
  const T = 2_000_000_000_000;
  const tracks = demoSelfTracks(9, T);
  const dots = selfDotsAt(tracks, (836 + DEMO_ROLL_OUT_S) * 1000);
  assert(
    dots.every((d) => d.state === 'finished'),
    `expected all finished, got ${dots.map((d) => [d.rideId, d.state])}`,
  );
});

// virgin-cycle11 (DEMO overhaul, brief D) below.

test('demoModel: demoRefFixes is the lap the dot rode, 1 Hz', () => {
  const f = demoRefFixes(DEMO_WAY_ASSET, 5000);
  const idx = DEMO_WAY_ASSET.gateIdx!;
  const path = DEMO_WAY_ASSET.path!;
  assert(
    f.length === idx[idx.length - 1] - idx[0] + 1,
    `expected ${idx[idx.length - 1] - idx[0] + 1} fixes, got ${f.length}`,
  );
  assert(f[0].lat === path[idx[0]][0] && f[0].lon === path[idx[0]][1], 'first fix should match path[gateIdx[0]]');
  const last = f[f.length - 1];
  assert(
    last.lat === path[idx[idx.length - 1]][0] && last.lon === path[idx[idx.length - 1]][1],
    'last fix should match path[gateIdx[last]]',
  );
  assert(f[0].tUnixMs === 5000, `expected first tUnixMs 5000, got ${f[0].tUnixMs}`);
  for (let i = 1; i < f.length; i++) {
    assert(f[i].tUnixMs === f[i - 1].tUnixMs + 1000, `fix ${i}: expected +1000ms step, got ${f[i].tUnixMs - f[i - 1].tUnixMs}`);
  }
  assert(f.every((x) => x.preStart === undefined && x.warmup === undefined), 'no fix should carry preStart/warmup');
});

test('demoModel: a fixture with no gateIdx yields no fixes, and no draft', () => {
  const noGates = { ...DEMO_WAY_ASSET, gateIdx: undefined };
  const f = demoRefFixes(noGates, 0);
  assert(f.length === 0, `expected [], got ${f.length} fixes`);
  const d = demoGateAdjustDraft(0, noGates);
  assert(d === null, `expected null draft, got ${JSON.stringify(d)}`);
});

test('demoModel: the draft is a real reference line over the demo path', () => {
  const T = 1_700_000_000_000;
  const d = demoGateAdjustDraft(T);
  assert(d !== null, 'expected a non-null draft from the shipped fixture');
  assert(d!.ref.ch[0] === 0, `expected ref.ch[0] === 0, got ${d!.ref.ch[0]}`);
  assert(d!.ref.length === d!.refLengthM, `expected ref.length === refLengthM, got ${d!.ref.length} vs ${d!.refLengthM}`);
  assert(d!.refLengthM > MIN_TRACK_LENGTH_M, `expected refLengthM > MIN_TRACK_LENGTH_M, got ${d!.refLengthM}`);
  assert(
    d!.refLengthM > 3000 && d!.refLengthM < 8000,
    `expected refLengthM in (3000, 8000) — a Leuven commute, got ${d!.refLengthM}`,
  );
  assert(d!.ref.rx.length === d!.ref.ch.length, 'ref.rx and ref.ch should be the same length');
  for (let i = 1; i < d!.ref.ch.length; i++) {
    assert(d!.ref.ch[i] >= d!.ref.ch[i - 1], `ref.ch should be non-decreasing at ${i}`);
  }
});

test('demoModel: no stops on the scripted lap, so the proposal is the pure quantiles (R3)', () => {
  const T = 1_700_000_000_000;
  const d = demoGateAdjustDraft(T)!;
  const expected = seedGateChainages(d.refLengthM, []);
  assert(d.chainageM.length === expected.length, `expected ${expected.length} gates, got ${d.chainageM.length}`);
  for (let i = 0; i < expected.length; i++) {
    assert(Math.abs(d.chainageM[i] - expected[i]) < 1e-6, `gate ${i}: expected ${expected[i]}, got ${d.chainageM[i]}`);
  }
  const fromFracs = [START_FRAC, ...SECTOR_FRACS, FINISH_FRAC].map((f) => f * d.refLengthM);
  for (let i = 0; i < fromFracs.length; i++) {
    assert(Math.abs(d.chainageM[i] - fromFracs[i]) < 1e-6, `gate ${i}: expected ${fromFracs[i]} from fracs, got ${d.chainageM[i]}`);
  }
  assert(d.chainageM.length === 5, `expected 5 gates, got ${d.chainageM.length}`);
  for (let i = 1; i < d.chainageM.length; i++) {
    assert(d.chainageM[i] > d.chainageM[i - 1], `chainageM should be strictly increasing at ${i}`);
  }
});

test('demoModel: the draft is deterministic in geometry, not in time', () => {
  const T = 1_700_000_000_000;
  const d1 = demoGateAdjustDraft(T)!;
  const d2 = demoGateAdjustDraft(T + 86_400_000)!;
  assert(d1.chainageM.length === d2.chainageM.length, 'chainageM lengths should match');
  for (let i = 0; i < d1.chainageM.length; i++) {
    assert(d1.chainageM[i] === d2.chainageM[i], `gate ${i}: expected equal chainageM across startMs, got ${d1.chainageM[i]} vs ${d2.chainageM[i]}`);
  }
  assert(d1.ref.length === d2.ref.length, `expected equal ref.length, got ${d1.ref.length} vs ${d2.ref.length}`);
});

test('demoModel: the line names the outcome (R4)', () => {
  const n = { start: ' Home ', end: 'Work' };
  assert(
    demoSavedLine(n) === 'Home → Work created · demo only, nothing saved',
    `unexpected default line: ${demoSavedLine(n)}`,
  );
  assert(
    demoSavedLine(n, 'kept') === 'Home → Work created · gates kept · demo only, nothing saved',
    `unexpected kept line: ${demoSavedLine(n, 'kept')}`,
  );
  assert(
    demoSavedLine(n, 'adjusted') === 'Home → Work created · gates adjusted · demo only, nothing saved',
    `unexpected adjusted line: ${demoSavedLine(n, 'adjusted')}`,
  );
});
