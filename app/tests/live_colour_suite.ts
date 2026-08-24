/**
 * QA — cycle 008: the live colour path and the tower position source.
 *
 * These are the two places where a wrong answer would be *invisible* on the
 * bike: a sector coloured green that was not, or a "P3" that ranks against
 * nothing. Both are pure functions over the ghost seed, so they can be locked
 * headless even though the screens cannot.
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { assert, test, loadFixture } from './lib.ts';
import type { LiveEngineState } from '../src/live/engine.ts';

// App code imports the seed as a bare `.json` — Metro bundles that directly,
// Node needs an import attribute it cannot get without changing app code. So
// the JSON is loaded through a hook and the modules under test are pulled in
// DYNAMICALLY, after the hook exists. (Static imports are linked before any
// module body runs, which is why this cannot be a plain import.)
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const { fmt, ghostsFor, lapValues, positionAmong, sectorValues, tierFor, MIN_HISTORY, WINDOW_N } =
  await import('../src/ui/colourModel.ts');
const { getLiveTowerPosition } = await import('../src/live/towerSource.ts');
const { getLastRide, recordedResults, rememberRide, resetRecordedForTests } =
  await import('../src/ui/lastRide.ts');
const { LiveEngine } = await import('../src/live/engine.ts');
const { catalogTrackSpecs } = await import('../src/live/tracks.ts');
const {
  FREE_RIDES_CACHE_FILE, decodeFreeRidesCache, flushFreeRideWrites, freeRideResults,
  initFreeRidePersistence, lastFreeRide, rememberFreeRide, resetFreeRidesForTests,
} = await import('../src/store/freeRides.ts');
const { createMemoryFsAdapter } = await import('../src/storage/fsAdapter.ts');

function stateWith(over: Partial<LiveEngineState>): LiveEngineState {
  return {
    phase: 'finished', track: 'Morning', sectors: [], currentSector: null, lastDone: 4,
    lap: { rawS: 900, stoppedS: 20, movingS: 880, estimated: false },
    gateFires: 5, fixesFed: 900, onRoute: true,
    ...over,
  } as LiveEngineState;
}

test('cycle008: the ghost seed feeds real sector and lap history', () => {
  const laps = lapValues('Morning');
  assert(laps.length >= 5, `Morning needs history to colour against, got ${laps.length}`);
  assert(laps.every((v) => v > 480 && v < 2400), 'implausible lap in the seed');
  for (let i = 1; i <= 4; i++) {
    assert(sectorValues('Morning', i).length >= 5, `sector ${i} has too little history`);
  }
  assert(lapValues('NoSuchRoute').length === 0, 'unknown route must yield no history');
});

test('cycle008: the ratified model — purple / green / yellow, F1 style', () => {
  const hist = [100, 102, 104, 106, 108, 110]; // mean 105, best 100
  assert(tierFor(99, hist) === 'purple', 'beating every ghost is purple');
  assert(tierFor(100, hist) === 'green', 'equalling the best is green, not purple');
  assert(tierFor(104, hist) === 'green', 'above the average is green');
  assert(tierFor(105, hist) === 'yellow', 'exactly average counts as ordinary');
  assert(tierFor(109, hist) === 'yellow', 'below the average is an ordinary yellow lap');
  // and there is no fourth outcome any more
  const seen = new Set([99, 104, 109].map((v) => tierFor(v, hist)));
  assert(seen.size === 3, 'three tiers, no hidden fourth state');
});

test('cycle008: too little history means NO verdict at all', () => {
  const thin = [100, 101, 102]; // < 5 clean rides (D-008)
  assert(tierFor(50, thin) === 'neutral', 'must not colour on 3 rides, however fast');
  assert(tierFor(null, [1, 2, 3, 4, 5, 6]) === 'est', 'no time ⇒ estimated, never a tier');
});

test('cycle008: the live position chip ranks, or renders nothing at all', () => {
  // cycle 009: the chip now states the field size too, so "P4 of 10" rather
  // than a bare "P4" -- a position with no denominator is half a fact.
  const p = getLiveTowerPosition(stateWith({}));
  assert(p !== null && /^P\d+ of \d+$/.test(p), `expected "Pn of N", got ${p}`);

  assert(getLiveTowerPosition(stateWith({ track: null })) === null, 'no lock ⇒ no chip');
  assert(getLiveTowerPosition(stateWith({ lap: null })) === null, 'no lap ⇒ no chip');
  assert(getLiveTowerPosition(stateWith({
    lap: { rawS: 700, stoppedS: null, movingS: null, estimated: true },
  })) === null, 'an estimated lap NEVER ranks (D-028), even when it looks fastest');

  // a very fast lap takes pole; a very slow one still gets a real place
  const n = lapValues('Morning').length;
  const fast = getLiveTowerPosition(stateWith({
    lap: { rawS: 600, stoppedS: 0, movingS: 600, estimated: false },
  }));
  assert(fast === `P1 of ${n + 1}`, `a 10-minute Morning lap should be pole, got ${fast}`);
  const slow = getLiveTowerPosition(stateWith({
    lap: { rawS: 2000, stoppedS: 0, movingS: 2000, estimated: false },
  }));
  assert(slow === `P${n + 1} of ${n + 1}`, `slow lap places last, got ${slow}`);

  // raw time must NEVER stand in for moving time (cycle 009)
  assert(getLiveTowerPosition(stateWith({
    lap: { rawS: 700, stoppedS: 200, movingS: null, estimated: false },
  })) === null, 'no moving time ⇒ no rank, never a raw-vs-moving comparison');
});

test('cycle008: positionAmong is stable and 1-based', () => {
  assert(positionAmong(5, [10, 20, 30]).pos === 1, 'fastest is P1');
  assert(positionAmong(25, [10, 20, 30]).of === 4, 'the field includes today');
  assert(positionAmong(35, [10, 20, 30]).pos === 4, 'slowest is last, not unranked');
});

test('cycle008: fmt never prints an impossible time (regression)', () => {
  // The bug: minutes were split before rounding, so 599.7 -> "9:60".
  const cases: [number, (0 | 1)][] = [[599.7, 0], [69.7, 0], [59.96, 1], [0, 0], [3599.6, 0]];
  for (const [v, d] of cases) {
    const out = fmt(v, d);
    assert(/^\d+:[0-5]\d(\.\d)?$/.test(out), `fmt(${v}, ${d}) = "${out}" is not a real time`);
  }
  // every value in the real seed, at both precisions
  for (const routeId of ['Morning', 'EveningA', 'EveningB']) {
    for (const v of lapValues(routeId)) {
      for (const d of [0, 1] as const) {
        assert(/^\d+:[0-5]\d(\.\d)?$/.test(fmt(v, d)), `seed value ${v} formats badly`);
      }
    }
  }
});

/** A clean, finished, 4-sector ride for rememberRide() — mirrors stateWith's
 * defaults but with real 'done' sectors, since rememberRide() reads them. */
function doneSector(movingS: number) {
  return { kind: 'done' as const, rawS: movingS, stoppedS: 0, movingS, interrupted: false, estimated: false };
}

test('B-44: a just-recorded ride must not sit inside its own comparison history', () => {
  // cycle 009 added your own rides to the ghost window (good); B-44 is the bug
  // that came with it -- rememberRide() pushes the finished ride into that same
  // window BEFORE the Result screen reads it, so today's lap could compare
  // against itself. The coordinator ruled: the seed has 9 Morning rides, not
  // the brief's assumed 10 -- WINDOW_N is a cap, not a promise, and curation
  // may drop rides. So nothing here hardcodes a seed count; the test reads it.
  resetRecordedForTests();
  const priorValues = lapValues('Morning');
  const priors = priorValues.length;
  assert(priors >= MIN_HISTORY, `Morning needs enough history for this test to mean anything, got ${priors}`);

  // Faster than every prior value, so an unfixed self-inclusion can never
  // accidentally still read 'purple' for the wrong reason.
  const mine = Math.min(...priorValues) - 50;
  const state = stateWith({
    sectors: [doneSector(100), doneSector(100), doneSector(100), doneSector(100)],
    lap: { rawS: mine, stoppedS: 0, movingS: mine, estimated: false },
  });
  rememberRide(state);

  const recorded = getLastRide();
  assert(recorded !== null, 'rememberRide() should have recorded a finished ride');
  const exclude = `session:${recorded!.atMs}`;

  const hist = lapValues('Morning', exclude);
  assert(
    tierFor(mine, hist) === 'purple',
    `today's own ride was not excluded from its own history (B-44) -- got tier for hist=[${hist.join(', ')}]`,
  );
  assert(
    hist.length === Math.min(priors, WINDOW_N),
    `expected ${Math.min(priors, WINDOW_N)} prior rides with today's excluded, got ${hist.length}`,
  );
  assert(!hist.includes(mine), 'the excluded history must not contain the just-recorded lap value');

  if (priors < WINDOW_N) {
    const { pos, of } = positionAmong(mine, hist);
    assert(pos === 1 && of === priors + 1, `expected P1 of ${priors + 1}, got P${pos} of ${of}`);
  }

  resetRecordedForTests();
});

test('B-44: window-inclusion guard -- a recorded ride still ghosts the NEXT ride', () => {
  // cycle-009's whole point: your own finished ride must re-enter the window
  // for the ride AFTER it. Excluding it from its own comparison (B-44) must
  // not turn into excluding it from history altogether.
  resetRecordedForTests();
  const state = stateWith({
    sectors: [doneSector(100), doneSector(100), doneSector(100), doneSector(100)],
    lap: { rawS: 850, stoppedS: 0, movingS: 850, estimated: false },
  });
  rememberRide(state);

  const recorded = getLastRide();
  assert(recorded !== null, 'rememberRide() should have recorded a finished ride');
  const rideId = `session:${recorded!.atMs}`;

  const ghosts = ghostsFor('Morning'); // no exclude -- this is the NEXT ride's view
  assert(
    ghosts.some((g) => g.rideId === rideId),
    'a recorded ride must still be a ghost for the next ride (cycle-009), unaffected by B-44\'s fix',
  );

  resetRecordedForTests();
});

// ============================================================ cycle 024 (WP-D2)

test('cycle024: pick wrong — a finished ride ranks against the RIDDEN route\'s ghosts, never the pick\'s', () => {
  resetRecordedForTests();
  const f = loadFixture('clean_eveningb');
  const engine = new LiveEngine(catalogTrackSpecs());
  engine.start({ pickId: 'EveningA' });
  for (let i = 0; i < f.fixes.t.length; i++) engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  engine.finalize();
  rememberRide(engine.getState());

  const recorded = getLastRide();
  assert(recorded !== null && recorded.routeId === 'EveningB',
    `getLastRide().routeId = ${recorded?.routeId}, want EveningB (the ridden route, not the EveningA pick)`);

  const rideId = `session:${recorded!.atMs}`;
  assert(
    !ghostsFor('EveningA').some((g) => g.rideId === rideId),
    'the wrongly-picked route ghosted a ride that was never actually ridden on it',
  );
  assert(
    ghostsFor('EveningB').some((g) => g.rideId === rideId),
    'the ridden route did not ghost its own just-recorded ride',
  );

  resetRecordedForTests();
});

test('cycle024: soft lock never colours before scoring — tiers for a soft-locked state match a verified one with identical sectors', () => {
  const soft = stateWith({ lockKind: 'soft', pick: 'Morning', pickHonoured: true } as Partial<LiveEngineState>);
  const verified = stateWith({ lockKind: 'verified', pick: 'Morning', pickHonoured: true } as Partial<LiveEngineState>);
  assert(soft.track === verified.track && soft.lap?.movingS === verified.lap?.movingS, 'test setup: states differ');
  const hist = lapValues(soft.track!);
  const tSoft = tierFor(soft.lap!.movingS, hist);
  const tVerified = tierFor(verified.lap!.movingS, hist);
  assert(tSoft === tVerified,
    `soft-lock tier "${tSoft}" != verified tier "${tVerified}" — colour must be keyed only to the displayed route/sectors, never to lockKind`);
});

// ================================================================ WP-B (free ride)

test('WP-B: free rides never pollute route history (D-025 mode-consistency)', () => {
  resetRecordedForTests();
  resetFreeRidesForTests();
  const priorGhostCount = ghostsFor('Morning').length;
  const priorLaps = lapValues('Morning');

  const freeState = stateWith({
    mode: 'free', track: null, lap: null, sectors: [], currentSector: null, lastDone: null,
    freeCrossings: [
      { routeId: 'Morning', gateIndex: 0, t: 1000, estimated: false },
      { routeId: 'Morning', gateIndex: 1, t: 1100, estimated: false },
    ],
    freeSectors: [{ routeId: 'Morning', index: 1, rawS: 100 }],
  } as Partial<LiveEngineState>);
  rememberFreeRide(freeState);

  assert(ghostsFor('Morning').length === priorGhostCount,
    'a free ride must never enter Morning\'s ghost window');
  assert(JSON.stringify(lapValues('Morning')) === JSON.stringify(priorLaps),
    'a free ride must never change Morning\'s lap history');
  assert(recordedResults().length === 0, 'a free ride must never enter recordedResults()');
  assert(freeRideResults().length === 1, `freeRideResults().length = ${freeRideResults().length}, want 1`);
  const saved = freeRideResults()[0];
  assert(saved.sectors.length === 1 && saved.sectors[0].routeId === 'Morning' && saved.sectors[0].rawS === 100,
    'the free ride\'s own sector must be stored verbatim');

  resetRecordedForTests();
  resetFreeRidesForTests();
});

test('WP-B: free-ride cache round-trip — persist/rehydrate, corrupt-entry tolerance, idempotent init', async () => {
  resetFreeRidesForTests();
  const fs = createMemoryFsAdapter();
  await initFreeRidePersistence(fs); // no file yet
  assert(freeRideResults().length === 0, 'arming on an empty disk must not create rides');

  const freeState = stateWith({
    mode: 'free', track: null, lap: null,
    freeCrossings: [
      { routeId: 'Morning', gateIndex: 0, t: 10, estimated: false },
      { routeId: 'Morning', gateIndex: 1, t: 130, estimated: false },
    ],
    freeSectors: [{ routeId: 'Morning', index: 1, rawS: 120 }],
  } as Partial<LiveEngineState>);
  rememberFreeRide(freeState);
  const saved = lastFreeRide();
  assert(saved !== null, 'rememberFreeRide should have recorded a free ride');
  const rideId = saved!.rideId;

  await flushFreeRideWrites();
  assert(fs.files.has(FREE_RIDES_CACHE_FILE), 'expected the cache write to land on disk');

  // Simulate the restart.
  resetFreeRidesForTests();
  assert(freeRideResults().length === 0, 'reset must clear the in-memory store');

  await initFreeRidePersistence(fs); // same adapter instance = same "disk"
  let results = freeRideResults();
  assert(results.length === 1, `expected the cached free ride to rehydrate, got ${results.length}`);
  assert(results[0].rideId === rideId, `expected rideId ${rideId}, got ${results[0].rideId}`);

  // Idempotence: a second init on the same "disk" must not duplicate.
  await initFreeRidePersistence(fs);
  assert(freeRideResults().length === 1, 'a second init must dedupe by rideId, not duplicate');
  resetFreeRidesForTests();

  // decodeFreeRidesCache: corrupt/misshapen entries dropped, valid kept.
  assert(decodeFreeRidesCache('{nope') === null, 'unparseable text must decode to null');
  assert(decodeFreeRidesCache('{"rides": 42}') === null, 'a non-array "rides" must decode to null');
  const goodEntry = {
    kind: 'freeRide', schemaVersion: 1, rideId: 'free:1', startedAtMs: 1, crossings: [], sectors: [],
  };
  const mixed = JSON.stringify({ schemaVersion: 1, rides: [null, { kind: 'other' }, goodEntry] });
  const decoded = decodeFreeRidesCache(mixed);
  assert(decoded !== null && decoded.length === 1 && decoded[0].rideId === 'free:1',
    `expected exactly the one valid entry to survive, got ${JSON.stringify(decoded)}`);

  const fs2 = createMemoryFsAdapter();
  fs2.files.set(FREE_RIDES_CACHE_FILE, mixed);
  await initFreeRidePersistence(fs2);
  results = freeRideResults();
  assert(results.length === 1 && results[0].rideId === 'free:1',
    'a corrupt entry alongside a valid one on disk must drop only the corrupt one');
  resetFreeRidesForTests();
});
