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
import * as path from 'node:path';
import { assert, test, loadFixture, TESTS_DIR } from './lib.ts';
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
const {
  fmt, ghostsFor, lapValues, liveTierFor, positionAmong, sectorValues, tierFor, MIN_HISTORY, WINDOW_N,
  WINDOW_PREV, rankingPoolFor, rankedCountFor,
} = await import('../src/ui/colourModel.ts');
const { buildRankingReveal } = await import('../src/ui/rankingRevealModel.ts');
const { getLiveTowerPosition } = await import('../src/live/towerSource.ts');
const { getLastRide, recordedResults, rememberRide, resetRecordedForTests } =
  await import('../src/ui/lastRide.ts');
const { LiveEngine } = await import('../src/live/engine.ts');
const { catalogTrackSpecs } = await import('../src/live/tracks.ts');
const {
  FREE_RIDES_CACHE_FILE, decodeFreeRidesCache, flushFreeRideWrites, freeRideResults,
  initFreeRidePersistence, lastFreeRide, markRideFree, unmarkRideFree, resetFreeRidesForTests,
} = await import('../src/store/freeRides.ts');
const { createMemoryFsAdapter } = await import('../src/storage/fsAdapter.ts');
// virgin-cycle20 brief 10: the founded-route → second-ride fixture needs the
// real catalog / results / user-ref stack and the ride-file encoder.
const b10CatalogStore = await import('../src/store/catalogStore.ts');
const b10ResultsStore = await import('../src/store/resultsStore.ts');
const b10UserRefs = await import('../src/live/userRefs.ts');
const b10RouteFromRide = await import('../src/store/routeFromRide.ts');
const { replaceRecorded: b10ReplaceRecorded, dropRecorded: b10DropRecorded } = await import('../src/ui/lastRide.ts');
const { liveSectorColours: b10LiveSectorColours } = await import('../src/ui/sectorTrailModel.ts');
const { tierLineColour: b10TierLineColour } = await import('../src/ui/tierColour.ts');
const { encodeEnd: b10EncodeEnd, encodeFix: b10EncodeFix, encodeHeader: b10EncodeHeader } = await import('../src/storage/jsonl.ts');
const { scoredS: b10ScoredS, setTimingMode: b10SetTimingMode, DEFAULT_TIMING: b10DefaultTiming } = await import('../src/store/timing.ts');
const { ranks: b10Ranks } = await import('../src/store/results.ts');
const { STOP_T_S: b10StopTS } = await import('../core/src/kinematics.ts');

function stateWith(over: Partial<LiveEngineState>): LiveEngineState {
  return {
    phase: 'finished', track: 'Morning', sectors: [], currentSector: null, lastDone: 4,
    lap: { rawS: 900, stoppedS: 20, movingS: 880, estimated: false },
    gateFires: 5, fixesFed: 900, onWay: true,
    // virgin-cycle6: additive, rememberRide() never reads it — added so this
    // helper's `as LiveEngineState` cast keeps describing a real, complete
    // state rather than silently omitting a required field.
    startGateT: null,
    chainageM: null,
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
  // D-045 ruling 1 / NW-1 (2026-09-08) dropped MIN_HISTORY from 5 to 1: only
  // n=0 — no prior rides at all, exactly a way's reference ride — stays
  // neutral now. Even a single prior ride (n=1) earns a real tier (purple
  // or yellow; see the n=1 test below for why green stays unreachable there).
  assert(tierFor(50, []) === 'neutral', 'must not colour on zero prior rides, however fast');
  assert(tierFor(null, [1, 2, 3, 4, 5, 6]) === 'est', 'no time ⇒ estimated, never a tier');
});

test('NW-1: n=1 prior ride can only be purple or yellow — green needs n>=2', () => {
  // A pool of exactly one prior ride has best === mean, so "beats the best"
  // and "beats the average" are the same test — there is no room between
  // them for green to live in.
  const onePrior = [500];
  assert(tierFor(499, onePrior) === 'purple', 'faster than the one prior ride ⇒ purple');
  assert(tierFor(500, onePrior) === 'yellow', 'tying the one prior ride is not "beating" it ⇒ yellow');
  assert(tierFor(501, onePrior) === 'yellow', 'slower than the one prior ride ⇒ yellow');
});

test('NW-1: n=2 prior rides unlocks green', () => {
  const twoPriors = [500, 520]; // best 500, mean 510
  assert(tierFor(499, twoPriors) === 'purple', 'beats the best ⇒ purple');
  assert(tierFor(505, twoPriors) === 'green', 'between best and mean ⇒ green, now reachable at n=2');
  assert(tierFor(515, twoPriors) === 'yellow', 'above the mean ⇒ yellow');
});

test('NW-1 (2026-09-08): a brand-new way walked ride-by-ride — n=0/1/2/10, end to end through the real store', () => {
  // Not a seeded track (Morning/EveningA/EveningB): a synthetic wayId starts
  // with truly zero history, exactly the "someone else's blank install"
  // case D-045 ruling 1 is about.
  resetRecordedForTests();
  const wayId = 'nw1-integration-way';
  const doneSector4 = (movingS: number) => [
    doneSector(movingS / 4), doneSector(movingS / 4), doneSector(movingS / 4), doneSector(movingS / 4),
  ];
  // rememberRide()'s session id is `session:${Date.now()}` when no `meta`
  // is supplied (headless in-memory path, deliberately unchanged by A1) —
  // a tight loop of calls can land in the same millisecond and collide on
  // that id. `tick()` forces real time to move on before the next call.
  const tick = (): void => {
    const t0 = Date.now();
    while (Date.now() === t0) { /* spin one tick */ }
  };
  const rideOn = (movingS: number) => {
    rememberRide(stateWith({
      track: wayId, sectors: doneSector4(movingS),
      lap: { rawS: movingS, stoppedS: 0, movingS, estimated: false },
    }));
    tick();
  };

  // n=0: the way's reference ride, about to be judged for the first time —
  // there is nothing on file yet at all.
  assert(lapValues(wayId).length === 0, 'a brand-new way must start with zero history');
  assert(tierFor(500, lapValues(wayId)) === 'neutral', 'the reference ride itself gets no colour verdict');

  rideOn(500); // ride 1 stored — this becomes the reference ride
  const ride1Id = `session:${getLastRide()!.atMs}`;
  // Even excluding itself, the reference ride still ranks "P1 of 1" once
  // stored (rank and colour are independent facts — colourModel.ts, NW-1).
  const selfHist = lapValues(wayId, ride1Id);
  assert(selfHist.length === 0, "the reference ride's own history (excluding itself) is empty");
  const selfRank = positionAmong(500, selfHist);
  assert(selfRank.pos === 1 && selfRank.of === 1, `expected P1 of 1 for the reference ride, got P${selfRank.pos} of ${selfRank.of}`);

  // n=1: ride 2 is judged against the one stored reference ride. Only
  // purple/yellow are reachable — best and mean coincide at a pool of one.
  const hist1 = lapValues(wayId);
  assert(hist1.length === 1, `ride 2 should see exactly 1 prior ride, got ${hist1.length}`);
  assert(tierFor(490, hist1) === 'purple', 'faster than the reference ride ⇒ purple');
  assert(tierFor(510, hist1) === 'yellow', 'slower than the reference ride ⇒ yellow, never green at n=1');

  rideOn(510); // ride 2 stored (yellow)

  // n=2: ride 3 is judged against the 2 stored rides — green is now reachable.
  const hist2 = lapValues(wayId);
  assert(hist2.length === 2, `ride 3 should see exactly 2 prior rides, got ${hist2.length}`);
  assert(tierFor(503, hist2) === 'green', `503 sits between best (500) and mean (505) ⇒ green, got ${tierFor(503, hist2)}`);

  rideOn(503); // ride 3 stored (green)

  // n=10: keep riding out to a full WINDOW_N pool — the D-045 ruling 2
  // window (unrelated to ruling 1, unaffected by MIN_HISTORY) must still
  // cap the comparison window at WINDOW_PREV=9 / pool WINDOW_N=10.
  for (let i = 0; i < 7; i++) rideOn(505 + i); // rides 4..10 → 10 stored total
  assert(rankedCountFor(wayId) === 10, `expected 10 rides on file, got ${rankedCountFor(wayId)}`);
  const hist10 = lapValues(wayId);
  assert(hist10.length === WINDOW_PREV, `the comparison window must still cap at WINDOW_PREV=${WINDOW_PREV}, got ${hist10.length}`);

  rideOn(506); // an 11th ride — the window must still not grow past WINDOW_N
  assert(rankedCountFor(wayId) === 11, 'true count keeps growing past the window');
  const pool = rankingPoolFor(wayId, `session:${getLastRide()!.atMs}`);
  assert(pool.length === WINDOW_N, `ranking pool must stay exactly WINDOW_N=${WINDOW_N}, got ${pool.length}`);

  resetRecordedForTests();
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
  for (const wayId of ['Morning', 'EveningA', 'EveningB']) {
    for (const v of lapValues(wayId)) {
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
    hist.length === Math.min(priors, WINDOW_PREV),
    `expected ${Math.min(priors, WINDOW_PREV)} prior rides with today's excluded (D-045.2 window), got ${hist.length}`,
  );
  assert(!hist.includes(mine), 'the excluded history must not contain the just-recorded lap value');

  const { pos, of } = positionAmong(mine, hist);
  const wantOf = Math.min(priors, WINDOW_PREV) + 1;
  assert(pos === 1 && of === wantOf, `expected P1 of ${wantOf} (D-045.2), got P${pos} of ${of}`);

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

test('D-045.2: ranking pool is previous-9 + current — a 10th-older previous ride is excluded', () => {
  // EveningA is the only seed route with a full 10 ranked rides; recording one
  // session ride makes 11 total — the exact shape of the 2026-08-25
  // "P10 of 11 vs P9" bug. Under D-045 ruling 2 the field must be 10.
  resetRecordedForTests();
  assert(rankedCountFor('EveningA') === 10,
    `this fixture needs EveningA's 10 ranked seed rides, got ${rankedCountFor('EveningA')} — seed curation changed, revisit this test`);

  const mine = 700; // faster than every seed EveningA lap (fastest is 810.0) => P1
  rememberRide(stateWith({
    track: 'EveningA',
    sectors: [doneSector(175), doneSector(175), doneSector(175), doneSector(175)],
    lap: { rawS: mine, stoppedS: 0, movingS: mine, estimated: false },
  }));
  const rideId = `session:${getLastRide()!.atMs}`;

  // Header path: previous window is 9, never 10 — pre-fix this was 10.
  const hist = lapValues('EveningA', rideId);
  assert(hist.length === WINDOW_PREV,
    `previous window must be WINDOW_PREV=${WINDOW_PREV}, got ${hist.length}`);
  const { pos, of } = positionAmong(mine, hist);
  assert(of === WINDOW_N, `the field is always exactly ${WINDOW_N} — pre-fix bug read 11, got ${of}`);
  assert(pos === 1, `700 s beats every seed lap, got P${pos}`);

  // The 10th-oldest previous ride (seed 20260728-1619, movingS ~1253.97 — both
  // the oldest and the slowest EveningA seed) is OUTSIDE the pool.
  const pool = rankingPoolFor('EveningA', rideId);
  assert(pool.length === WINDOW_N, `pool must be exactly ${WINDOW_N}, got ${pool.length}`);
  assert(pool.some((r) => r.rideId === rideId), "the judged ride is the pool's own 10th slot");
  assert(rankedCountFor('EveningA') === 11, 'route now holds 11 ranked rides in total');
  assert(!pool.some((r) => r.rideId === 'seed:20260728-1619-work2home-19501080034'),
    'the 10th-older previous ride (the oldest EveningA seed) must not be in the pool');

  // Header/list identity: the judged ride's position within the pool the PB
  // list renders equals the header's positionAmong answer.
  const byTime = [...pool].sort((a, b) => (a.lap.movingS as number) - (b.lap.movingS as number));
  assert(byTime.findIndex((r) => r.rideId === rideId) + 1 === pos,
    'header rank and PB-list rank must come from the same pool');

  // B-44 still holds: the judged ride never sits in its own previous window.
  assert(!hist.includes(mine), "B-44: today's lap must not be its own history");

  resetRecordedForTests();
});

test('D-045.2: the live tower chip field is 10, not 11, on a route with 10 previous rides', () => {
  resetRecordedForTests();
  const chip = getLiveTowerPosition(stateWith({
    track: 'EveningA',
    lap: { rawS: 700, stoppedS: 0, movingS: 700, estimated: false },
  }));
  assert(chip === 'P1 of 10', `expected "P1 of 10" (previous-9 + the live lap), got "${chip}"`);
  resetRecordedForTests();
});

// ============================================================ cycle 024 (WP-D2)

test('cycle024: pick wrong — a HARD pick that never locks records NOTHING: the ride joins neither the pick\'s nor the ridden route\'s history', () => {
  // Nathan 2026-08-29 ("what you pick stays locked until the end"; WP-A):
  // a wrong pick is never rescued onto the road actually ridden. This test
  // used to assert the opposite (cycle 024 pick-as-hint: the ride ranked
  // against EveningB's ghosts). Under the hard pick, clean_eveningb with
  // pick=EveningA ends UNMATCHED — EveningA was never ridden, so the pick's
  // own candidate never fires a gate (measured: track null after
  // finalize(), zero engine events; live_suite.ts's sibling test covers
  // the engine side). rememberRide() then treats the unmatched finish exactly
  // like an abort: `last` cleared, nothing pushed into the comparison window.
  // The cost of a wrong pick is that ride's history — NEVER a lap credited
  // to EveningB (D-025) and NEVER one invented for EveningA.
  resetRecordedForTests();
  const f = loadFixture('clean_eveningb');
  const engine = new LiveEngine(catalogTrackSpecs());
  engine.start({ pickId: 'EveningA' });
  const ghostsABefore = ghostsFor('EveningA').length;
  const ghostsBBefore = ghostsFor('EveningB').length;
  const lapsBBefore = JSON.stringify(lapValues('EveningB'));
  for (let i = 0; i < f.fixes.t.length; i++) engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  engine.finalize();
  const st = engine.getState();
  assert(st.track !== 'EveningB', 'a hard pick of EveningA must never end up displaying EveningB');
  assert(st.track === null,
    `final track ${st.track}, want null — if the pick's candidate now fires a gate on the shared EveningA/EveningB prefix, revisit this test together with live_suite.ts's "pick wrong" case`);
  assert(st.pick === 'EveningA', `pick ${st.pick}`);
  rememberRide(st);

  const last = getLastRide();
  assert(last === null,
    `getLastRide() = ${JSON.stringify(last)}, want null — an unmatched hard-pick ride is not a Result-tab lap`);
  assert(recordedResults().length === 0,
    `recordedResults().length = ${recordedResults().length}, want 0 — nothing rankable may be recorded under any route`);
  assert(ghostsFor('EveningA').length === ghostsABefore,
    'the wrongly-picked route ghosted a ride that was never actually ridden on it');
  assert(ghostsFor('EveningB').length === ghostsBBefore,
    'the ridden route ghosted a ride the hard pick says was never scored against it');
  assert(JSON.stringify(lapValues('EveningB')) === lapsBBefore,
    'EveningB\'s lap history changed — a wrong pick must not be silently reassigned to the ridden road');

  resetRecordedForTests();
});

// ================================================================ WP-B (free ride)

test('WP-B: free rides never pollute route history (D-025 mode-consistency)', () => {
  resetRecordedForTests();
  resetFreeRidesForTests();
  const priorGhostCount = ghostsFor('Morning').length;
  const priorLaps = lapValues('Morning');

  markRideFree('ride-free-1', 1000, 123, null);

  assert(ghostsFor('Morning').length === priorGhostCount,
    'a free ride must never enter Morning\'s ghost window');
  assert(JSON.stringify(lapValues('Morning')) === JSON.stringify(priorLaps),
    'a free ride must never change Morning\'s lap history');
  assert(recordedResults().length === 0, 'a free ride must never enter recordedResults()');
  assert(freeRideResults().length === 1, `freeRideResults().length = ${freeRideResults().length}, want 1`);
  const saved = freeRideResults()[0];
  assert(saved.rideId === 'ride-free-1' && saved.durationS === 123 && saved.sportId === null && saved.schemaVersion === 3,
    'the record is identity only: rideId, startedAtMs, durationS, sportId');

  resetRecordedForTests();
  resetFreeRidesForTests();
});

test('WP-B: free-ride cache round-trip — persist/rehydrate, corrupt-entry tolerance, idempotent init', async () => {
  resetFreeRidesForTests();
  const fs = createMemoryFsAdapter();
  await initFreeRidePersistence(fs); // no file yet
  assert(freeRideResults().length === 0, 'arming on an empty disk must not create rides');

  markRideFree('ride-free-2', 5000, 60, 'cycling');
  const saved = lastFreeRide();
  assert(saved !== null, 'markRideFree should have recorded a free ride');
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
  assert(decoded![0].schemaVersion === 3 && decoded![0].durationS === null && !('crossings' in decoded![0]),
    'a v1 entry migrates to the v3 identity shape');

  const fs2 = createMemoryFsAdapter();
  fs2.files.set(FREE_RIDES_CACHE_FILE, mixed);
  await initFreeRidePersistence(fs2);
  results = freeRideResults();
  assert(results.length === 1 && results[0].rideId === 'free:1',
    'a corrupt entry alongside a valid one on disk must drop only the corrupt one');
  resetFreeRidesForTests();
});

test('virgin-cycle16 02: unmarkRideFree removes exactly that record and persists the removal', async () => {
  resetFreeRidesForTests();
  const fs = createMemoryFsAdapter();
  await initFreeRidePersistence(fs);
  markRideFree('r-a', 1000, 10, null);
  markRideFree('r-b', 2000, 20, 'cycling');
  markRideFree('r-a', 1000, 10, null); // idempotent
  assert(freeRideResults().length === 2, 'two distinct records, no duplicate');
  unmarkRideFree('r-a');
  assert(freeRideResults().length === 1 && freeRideResults()[0].rideId === 'r-b', 'only r-b remains');
  unmarkRideFree('nope'); // no-op
  await flushFreeRideWrites();
  resetFreeRidesForTests();
  await initFreeRidePersistence(fs);
  assert(freeRideResults().length === 1 && freeRideResults()[0].rideId === 'r-b', 'the removal reached disk');
  resetFreeRidesForTests();
});

/** brief 07 helper: a clean 4-sector finished ride on `wayId` with a real
 * rideId/startedAtMs (the shape onEnd hands rememberRide), for the live-tier tests. */
function brief07Ride(wayId: string, lapS: number, rideId: string, startedAtMs: number) {
  const q = lapS / 4;
  rememberRide(
    stateWith({
      track: wayId,
      sectors: [doneSector(q), doneSector(q), doneSector(q), doneSector(q)],
      lap: { rawS: lapS, stoppedS: 0, movingS: lapS, estimated: false },
    }),
    { rideId, startedAtMs },
  );
}

test('virgin-cycle20 07: liveTierFor — the lap chip gets its real tier at the line (cycle11 R1 revert)', () => {
  resetRecordedForTests();
  const wayId = 'brief07-way-a';
  brief07Ride(wayId, 600, 'b07a-1', 1_000);
  brief07Ride(wayId, 620, 'b07a-2', 2_000);
  brief07Ride(wayId, 640, 'b07a-3', 3_000); // best 600, mean 620
  const today = 'b07a-today';
  assert(liveTierFor(wayId, 0, 590, today) === 'purple', 'beats every lap in the window ⇒ purple at the line');
  assert(liveTierFor(wayId, 0, 610, today) === 'green', 'between best and mean ⇒ green at the line');
  assert(liveTierFor(wayId, 0, 630, today) === 'yellow', 'slower than the mean ⇒ yellow at the line');
  // sector path: the refactor must not change the flash/strip rule (sector 1: 150/155/160 → best 150, mean 155)
  assert(liveTierFor(wayId, 1, 149, today) === 'purple', 'sector verdict unchanged by the refactor (purple)');
  assert(liveTierFor(wayId, 1, 152, today) === 'green', 'sector verdict unchanged by the refactor (green)');
  assert(liveTierFor(wayId, 1, 158, today) === 'yellow', 'sector verdict unchanged by the refactor (yellow)');
  // exact parity with the old RecordScreen.tierOf body
  assert(liveTierFor(wayId, 0, 610, today) === tierFor(610, lapValues(wayId, today)), 'lap: liveTierFor === tierFor over lapValues');
  assert(liveTierFor(wayId, 2, 152, today) === tierFor(152, sectorValues(wayId, 2, today)), 'sector: liveTierFor === tierFor over sectorValues');
  resetRecordedForTests();
});

test('virgin-cycle20 07: no lock / no time / no history ⇒ neutral, exactly as before', () => {
  resetRecordedForTests();
  assert(liveTierFor(null, 0, 600, 'x') === 'neutral', 'no locked way ⇒ neutral (D-025)');
  assert(liveTierFor('brief07-way-b', 0, null, 'x') === 'neutral', 'no real time ⇒ neutral, never est on the live surface');
  assert(liveTierFor('brief07-way-b', 0, 600, 'x') === 'neutral', 'ride 1 of a way (no history) ⇒ neutral (MIN_HISTORY floor), however fast');
  // n=1: only purple/yellow reachable (NW-1), unchanged
  brief07Ride('brief07-way-b', 600, 'b07b-1', 1_000);
  assert(liveTierFor('brief07-way-b', 0, 599, 'today') === 'purple', 'n=1 faster ⇒ purple');
  assert(liveTierFor('brief07-way-b', 0, 600, 'today') === 'yellow', 'n=1 tie ⇒ yellow (not green)');
  resetRecordedForTests();
});

test('virgin-cycle20 07: the lap tier does not flip when onEnd stores today (exclusion by session.rideId)', () => {
  resetRecordedForTests();
  const wayId = 'brief07-way-c';
  brief07Ride(wayId, 600, 'b07c-1', 1_000);
  brief07Ride(wayId, 620, 'b07c-2', 2_000);
  const today = 'b07c-today';
  const mine = 580; // a new best — the case a self-inclusion demotes
  // 1) at the FINISH gate (nothing stored yet): exclusion is a no-op
  const atLine = liveTierFor(wayId, 0, mine, today);
  assert(atLine === 'purple', `at the line a new best is purple, got ${atLine}`);
  assert(liveTierFor(wayId, 0, mine, today) === liveTierFor(wayId, 0, mine), 'before STOP, excluding an unstored id changes nothing');
  // 2) STOP: onEnd's rememberRide stores today under session.rideId while the 'running' tree still renders
  brief07Ride(wayId, mine, today, 3_000);
  assert(liveTierFor(wayId, 0, mine, today) === atLine, 'WITH the exclusion the lap chip keeps its colour after the store write (no flicker)');
  // the defect this brief removes: today's own unexcluded read is NOT purple any more
  const unexcluded = tierFor(mine, lapValues(wayId));
  assert(unexcluded !== 'purple', `without the exclusion the stored ride compares against itself and drops to ${unexcluded} — the flip Decision 2 prevents`);
  // 3) the tower reveal lands on the colour the rider already saw
  const reveal = buildRankingReveal(
    { track: wayId, lap: { rawS: mine, stoppedS: 0, movingS: mine, estimated: false } },
    today, 3_000,
  );
  assert(reveal !== null && reveal.tier === atLine, `reveal tier ${reveal?.tier} must equal the live chip's ${atLine}`);
  resetRecordedForTests();
});

test('virgin-cycle20 07: RecordScreen wires the real lap tier and the session exclusion', () => {
  const src = nodeFs.readFileSync(path.resolve(TESTS_DIR, '..', 'src', 'ui', 'RecordScreen.tsx'), 'utf8');
  assert(!src.includes('tierOfLive'), 'cycle11 R1 lap-neutral override must be gone (tierOfLive)');
  assert(src.includes('liveTierFor(live.track, sectorIndex, timeS, session?.rideId)'), 'tierOf delegates to liveTierFor with the session exclusion');
  assert(!src.includes('lapValues(live.track)') && !src.includes('sectorValues(live.track, sectorIndex)'), 'no unexcluded live tierOf history read survives');
  // the cut from the sector flash to the lap flash is unchanged (LAYOUT §2a) — since virgin-cycle22 04
  // the pane owns the 1.1 s (LAP_HANDOVER_MS in liveView.tsx), RecordScreen no longer times it
  const lv = nodeFs.readFileSync(path.resolve(TESTS_DIR, '..', 'src', 'ui', 'liveView.tsx'), 'utf8');
  assert(lv.includes('export const LAP_HANDOVER_MS = 1100;') && lv.includes('}, LAP_HANDOVER_MS);'), 'the ~1.1 s lap handover delay is untouched (pane-owned)');
});

// ------------------------------------------------- virgin-cycle20 brief 10 (2026-10-02)
// Nathan: second ride of a freshly founded route — no sector colour in the strip.
// Cause: the founding ride's sectors are 'interrupted' (a stop inside each) and
// sectorValues was clean-only, so ride 2's sector history was [] ⇒ 'neutral'.
// Fixture: a real founded route (createRouteFromDraft on a memory fs, mirrored into
// the live window exactly as RecordScreen.tsx 829-831 does), ride 2 through the
// LiveEngine with a hard pick, ride 3's window after rememberRide.

const B10_LAT0 = 51.30;
const B10_LON0 = 4.50;

/** A straight 1 Hz ride northwards at `vMs`, with a stationary run of `s`
 * seconds (same coordinates, 1 Hz) at each `frac` of `lengthM`. A run longer
 * than STOP_T_S is what core flags as a stop ⇒ the enclosing sector is
 * 'interrupted' (core/src/timing.ts INTERRUPTED_STOP_S). */
function b10Ride(lengthM: number, vMs: number, startS: number, stops: { frac: number; s: number }[]) {
  const t: number[] = []; const lat: number[] = []; const lon: number[] = [];
  const left = [...stops].sort((a, b) => a.frac - b.frac);
  let d = 0; let tt = startS;
  while (d <= lengthM) {
    t.push(tt); lat.push(B10_LAT0 + d / 110540); lon.push(B10_LON0);
    if (left.length > 0 && d / lengthM >= left[0].frac) {
      const st = left.shift()!;
      for (let k = 1; k <= st.s; k++) { tt += 1; t.push(tt); lat.push(B10_LAT0 + d / 110540); lon.push(B10_LON0); }
    }
    tt += 1; d += vMs;
  }
  return { t, lat, lon };
}

async function b10WriteRide(fs: ReturnType<typeof createMemoryFsAdapter>, rideId: string, f: { t: number[]; lat: number[]; lon: number[] }) {
  let text = b10EncodeHeader(rideId, f.t[0] * 1000);
  for (let i = 0; i < f.t.length; i++) text += b10EncodeFix({ tUnixMs: f.t[i] * 1000, lat: f.lat[i], lon: f.lon[i] });
  text += b10EncodeEnd(f.t[f.t.length - 1] * 1000, f.t.length);
  await fs.ensureDir('rides');
  await fs.writeText(`rides/${rideId}.jsonl`, text);
}

/** Founds a route from ride 'b10-ride1' (5 km at 5.5 m/s with `stops`) through the
 * real flow and mirrors the stored founding result into the live window the way
 * RecordScreen.tsx 829-831 does. Returns the way id and the stored founding result. */
async function b10Found(stops: { frac: number; s: number }[]) {
  b10CatalogStore.resetCatalogStoreForTests();
  resetRecordedForTests(); // also resets the results store
  b10UserRefs.resetUserRefsForTests();
  const fs = createMemoryFsAdapter();
  await b10CatalogStore.initCatalogStore(fs);
  await b10ResultsStore.initResultsStore(fs);
  await b10UserRefs.initUserRefs(fs);
  const r1 = b10Ride(5000, 5.5, 1_700_000_000, stops);
  await b10WriteRide(fs, 'b10-ride1', r1);
  const d = await b10RouteFromRide.draftRouteFromRide('b10-ride1', r1.t[0] * 1000, null, fs);
  assert(d !== null, 'b10: the founding ride drafts a route');
  const out = await b10RouteFromRide.createRouteFromDraft(d!, { start: 'B10 Home', end: 'B10 Work' }, fs);
  assert(out.ok && out.referenceTimed, `b10: createRouteFromDraft must store the founding result, got ${JSON.stringify(out)}`);
  if (!out.ok) throw new Error('unreachable');
  const founding = b10ResultsStore.getStoredResult('b10-ride1');
  if (founding) b10ReplaceRecorded(founding); else b10DropRecorded('b10-ride1');
  assert(founding !== null, 'b10: founding result stored');
  return { fs, wayId: out.wayId, founding: founding! };
}

/** Ride 2/3: the real LiveEngine over the real catalog specs, hard-picked on the way. */
function b10Drive(wayId: string, f: { t: number[]; lat: number[]; lon: number[] }): LiveEngineState {
  const engine = new LiveEngine(catalogTrackSpecs());
  engine.start({ pickId: wayId });
  for (let i = 0; i < f.t.length; i++) engine.feed(f.lat[i], f.lon[i], f.t[i] * 1000);
  return engine.getState();
}

function b10Teardown() {
  b10CatalogStore.resetCatalogStoreForTests();
  resetRecordedForTests();
  b10UserRefs.resetUserRefsForTests();
}

/** The strip chip's verdict for sector i, exactly RecordScreen.tierOf's body
 * (tierFor over sectorValues of the locked way; neutral with no lock / no time). */
function b10StripTier(st: LiveEngineState, i: number) {
  const sec = st.sectors[i - 1];
  const v = sec.kind === 'done' ? b10ScoredS(sec) : null;
  return st.track === null || v === null ? 'neutral' : tierFor(v, sectorValues(st.track, i));
}

const B10_STOPS = [{ frac: 0.15, s: 15 }, { frac: 0.4, s: 12 }, { frac: 0.6, s: 8 }, { frac: 0.9, s: 20 }];

test('virgin-cycle20 10: founded route, founding ride stopped in every sector — ride 2 STRIP chips earn purple, not neutral (map line follows)', async () => {
  const { wayId, founding } = await b10Found(B10_STOPS);
  try {
    // Preconditions (true before AND after the fix — if these fail, the stop
    // detection or the founding flow changed, not the colour rule).
    assert(B10_STOPS.every((s) => s.s > b10StopTS), 'every synthetic stop is longer than STOP_T_S');
    assert(founding.lap.quality === 'interrupted', `founding lap is interrupted (a stop in it), got ${founding.lap.quality}`);
    assert(founding.sectors.length === 4 && founding.sectors.every((s) => s.quality === 'interrupted'),
      `every founding sector is interrupted, got ${JSON.stringify(founding.sectors.map((s) => s.quality))}`);
    assert(b10Ranks(founding) && rankedCountFor(wayId) === 1, 'the founding ride ranks and is ride 2\'s whole window');
    assert(lapValues(wayId).length === 1, 'the LAP window already sees the founding ride (the lap chip was never the problem)');

    // Ride 2: clean, faster everywhere.
    const st = b10Drive(wayId, b10Ride(5000, 6.0, 1_700_100_000, []));
    assert(st.track === wayId && st.phase === 'finished' && st.sectors.every((s) => s.kind === 'done'),
      `ride 2 locks the pick and scores all four sectors, got track=${st.track} phase=${st.phase}`);
    assert(st.lap !== null && !st.lap.estimated && tierFor(b10ScoredS(st.lap), lapValues(wayId)) === 'purple', 'ride 2 lap verdict is purple (unchanged)');

    // THE SYMPTOM — fails on today's tree with four 'neutral's / four nulls.
    for (let i = 1; i <= 4; i++) {
      const hist = sectorValues(wayId, i);
      assert(hist.length === 1, `S${i}: the founding ride's interrupted sector IS ride 2's history, got ${JSON.stringify(hist)}`);
      const sec = st.sectors[i - 1];
      const v = sec.kind === 'done' ? b10ScoredS(sec) : null;
      assert(v !== null && v < hist[0], `S${i}: ride 2 (${v}) is faster than the founding sector (${hist[0]})`);
      assert(b10StripTier(st, i) === 'purple', `S${i}: strip chip must be purple (faster than the only earlier ride), got ${b10StripTier(st, i)}`);
    }
    // (secondary surface: map line) — same history, so it follows the strip for free; droppable.
    const spans = b10LiveSectorColours(st.sectors, (i) => (st.track === null ? [] : sectorValues(st.track, i)), b10TierLineColour);
    assert(spans.length === 5 && spans[0] === null, 'sector-colour array shape: [START, S1..S4]');
    assert(spans.slice(1).every((c) => c === b10TierLineColour('purple')), `map line paints all four sectors purple, got ${JSON.stringify(spans)}`);
  } finally {
    b10Teardown();
  }
});

test('virgin-cycle20 10: ride 3 still works — window holds the founding sector AND ride 2, green reachable, exclusion by id intact', async () => {
  const { wayId, founding } = await b10Found(B10_STOPS);
  try {
    const st2 = b10Drive(wayId, b10Ride(5000, 6.0, 1_700_100_000, []));
    rememberRide(st2, { rideId: 'b10-ride2', startedAtMs: 1_700_100_000_000 }); // onEnd's store write
    assert(rankedCountFor(wayId) === 2, 'two ranked rides on file');
    for (let i = 1; i <= 4; i++) {
      const hist = sectorValues(wayId, i, 'b10-ride3'); // ride 3, not yet stored: exclusion is a no-op
      const f = founding.sectors.find((s) => s.index === i)!;
      const own2 = st2.sectors[i - 1];
      const v2 = own2.kind === 'done' ? b10ScoredS(own2) : null;
      assert(hist.length === 2 && v2 !== null, `S${i}: ride 3 sees both earlier rides, got ${JSON.stringify(hist)}`);
      assert(hist.includes(b10ScoredS(f) as number) && hist.includes(v2), `S${i}: the window is [founding ${b10ScoredS(f)}, ride 2 ${v2}]`);
      const best = Math.min(...hist); const mean = (hist[0] + hist[1]) / 2;
      assert(tierFor(best - 1, hist) === 'purple', `S${i}: faster than both ⇒ purple`);
      assert(tierFor(mean - 1, hist) === 'green', `S${i}: between best and mean ⇒ green (n=2 unlocks green)`);
      assert(tierFor(mean + 1, hist) === 'yellow', `S${i}: slower than the mean ⇒ yellow`);
      // B-44 exclusion unchanged: ride 2 re-judged on its own detail sees only the founding sector
      const excl = sectorValues(wayId, i, 'b10-ride2');
      assert(excl.length === 1 && excl[0] === b10ScoredS(f), `S${i}: excluding ride 2 by id leaves the founding sector only, got ${JSON.stringify(excl)}`);
    }
  } finally {
    b10Teardown();
  }
});

test('virgin-cycle20 10: timing mode — raw reads the interrupted founding sector\'s stop-inclusive time, moving its raw − stop', async () => {
  const { wayId, founding } = await b10Found(B10_STOPS);
  try {
    const f1 = founding.sectors.find((s) => s.index === 1)!;
    assert(f1.movingS !== null && f1.rawS > f1.movingS + b10StopTS, `founding S1 carries a real moving time below its raw time (raw ${f1.rawS}, moving ${f1.movingS})`);
    assert(JSON.stringify(sectorValues(wayId, 1)) === JSON.stringify([f1.rawS]), 'raw mode (default): the sector\'s raw time');
    b10SetTimingMode('moving');
    try {
      assert(JSON.stringify(sectorValues(wayId, 1)) === JSON.stringify([f1.movingS]), 'moving mode: the sector\'s moving time');
    } finally {
      b10SetTimingMode(b10DefaultTiming);
    }
    assert(JSON.stringify(sectorValues(wayId, 1)) === JSON.stringify([f1.rawS]), 'mode restored to raw');
  } finally {
    b10Teardown();
  }
});

test('virgin-cycle20 10: a clean founding ride is unchanged — ride 2 slower ⇒ yellow everywhere (n=1: never green), faster ⇒ purple', async () => {
  const { wayId, founding } = await b10Found([]);
  try {
    assert(founding.lap.quality === 'clean' && founding.sectors.every((s) => s.quality === 'clean'), 'a no-stop founding ride is clean throughout');
    const slow = b10Drive(wayId, b10Ride(5000, 5.0, 1_700_100_000, []));
    for (let i = 1; i <= 4; i++) assert(b10StripTier(slow, i) === 'yellow', `S${i}: slower than the clean founding sector ⇒ yellow, got ${b10StripTier(slow, i)}`);
    // (secondary surface: map line) — droppable.
    const slowSpans = b10LiveSectorColours(slow.sectors, (i) => sectorValues(wayId, i), b10TierLineColour);
    assert(slowSpans.slice(1).every((c) => c === b10TierLineColour('yellow')), 'map line: four earned-yellow spans (H6: same hex as the base line — Decision 2)');
    const fast = b10Drive(wayId, b10Ride(5000, 6.0, 1_700_100_000, []));
    for (let i = 1; i <= 4; i++) assert(b10StripTier(fast, i) === 'purple', `S${i}: faster ⇒ purple, got ${b10StripTier(fast, i)}`);
    // estimated / missed sectors never enter a history: pinned on the store's own
    // sectorHistory by store_suite.ts 423-441, which this fix now delegates to.
  } finally {
    b10Teardown();
  }
});
