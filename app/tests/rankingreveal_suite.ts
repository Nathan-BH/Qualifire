/**
 * QA — virgin-cycle11: the ranking reveal's pure model (src/ui/rankingRevealModel.ts).
 *
 * buildRankingReveal() is the provider seam between the finished live state
 * and TimingTower's real-data reveal. Locked here headless: the R4 null
 * cases (no way, no lap, estimated, unscored, empty window — ride 1), the
 * R5 exclusion trap (today must not be its own history once rememberRide
 * has already stored it), the R5 pool-size ceiling (never "of 11"), that
 * the board really is buildTowerModel's own output, and climbMsFor's clamp.
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { assert, test } from './lib.ts';
import type { RideResult } from '../src/store/types.ts';
import type { LiveEngineState } from '../src/live/engine.ts';

// Same JSON-import hook as live_colour_suite/towermodel_suite: the modules
// under test pull tierFor/fmt/shippedResults from colourModel, whose module
// body imports the bare-.json seed.
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const { buildRankingReveal, climbMsFor, CLIMB_MIN_MS, CLIMB_PER_ROW_MS, CLIMB_MAX_MS } =
  await import('../src/ui/rankingRevealModel.ts');
const { ghostsFor, WINDOW_N, fmt, rankedCountFor } = await import('../src/ui/colourModel.ts');
const { rememberRide, resetRecordedForTests } = await import('../src/ui/lastRide.ts');

/** Minimal synthetic RideResult — shape copied from towermodel_suite.ts's own helper. */
function ride(movingS: number, startedAtMs: number, rideId: string, source: 'app' | 'archive' = 'app'): RideResult {
  return {
    kind: 'rideResult',
    schemaVersion: 1,
    rideId,
    startedAtMs,
    wayId: 'Morning',
    source,
    lap: { rawS: movingS, movingS, quality: 'clean' },
    sectors: [],
    derivedBy: { engineVersion: 'test', gateSetVersion: 1, resultSchemaVersion: 1 },
  };
}

// Copied from live_colour_suite.ts's stateWith() — a complete, finished
// LiveEngineState literal for rememberRide() calls (that function reads the
// whole state, not just track/lap).
function stateWith(over: Partial<LiveEngineState>): LiveEngineState {
  return {
    phase: 'finished', track: 'Morning', sectors: [], currentSector: null, lastDone: 4,
    lap: { rawS: 900, stoppedS: 20, movingS: 880, estimated: false },
    gateFires: 5, fixesFed: 900, onWay: true, anyAnchored: false,
    startGateT: null,
    chainageM: null,
    ...over,
  } as LiveEngineState;
}

/** A clean, finished, 4-sector ride for rememberRide() — copied from
 * live_colour_suite.ts's doneSector(), since rememberRide() reads real
 * 'done' sectors, not the bare stateWith() default of []. */
function doneSector(movingS: number) {
  return { kind: 'done' as const, rawS: movingS, stoppedS: 0, movingS, interrupted: false, estimated: false };
}

const T0 = 1785486893000; // arbitrary but fixed; exact value irrelevant
const DAY = 86_400_000;
const TODAY_MS = T0 + 20 * DAY;

// ---------------------------------------------------------- R4: no reveal

test('rankingReveal: no reveal with no way locked (track null)', () => {
  const st = { track: null, lap: { rawS: 600, stoppedS: 0, movingS: 600, estimated: false } };
  assert(buildRankingReveal(st, 'test:a', TODAY_MS, [], null) === null, 'track null must yield no reveal');
});

test('rankingReveal: no reveal with no lap yet', () => {
  const st = { track: 'Morning', lap: null };
  assert(buildRankingReveal(st, 'test:b', TODAY_MS, [], null) === null, 'lap null must yield no reveal');
});

test('rankingReveal: no reveal for an estimated lap', () => {
  const st = { track: 'Morning', lap: { rawS: 600, stoppedS: 0, movingS: 600, estimated: true } };
  assert(buildRankingReveal(st, 'test:c', TODAY_MS, [], null) === null, 'an estimated lap must never reveal (D-028)');
});

test('rankingReveal: no reveal when movingS is null (scoredS marker), raw mode too', () => {
  const st = { track: 'Morning', lap: { rawS: 700, stoppedS: 0, movingS: null, estimated: false } };
  assert(
    buildRankingReveal(st, 'test:d', TODAY_MS, [], null) === null,
    'movingS===null is the store-wide "no real time" marker and must be honoured in raw mode too',
  );
});

test('rankingReveal: ride 1 of a way (empty window) gets no reveal', () => {
  const st = { track: 'Morning', lap: { rawS: 600, stoppedS: 0, movingS: 600, estimated: false } };
  assert(
    buildRankingReveal(st, 'test:e', TODAY_MS, [], null) === null,
    "a way's very first ride has nothing to climb past — no ceremony, even though it earns a rank once stored",
  );
});

// ---------------------------------------------------------- ride 2 (window of one)

test('rankingReveal: ride 2 faster than the only prior lands P1 of 2, purple', () => {
  const window = [ride(600, T0, 'seed:1')];
  const st = { track: 'Morning', lap: { rawS: 580, stoppedS: 0, movingS: 580, estimated: false } };
  const rev = buildRankingReveal(st, 'test:f', TODAY_MS, window, null);
  assert(rev !== null, 'expected a reveal');
  assert(rev.pos === 1, `pos expected 1, got ${rev.pos}`);
  assert(rev.of === 2, `of expected 2, got ${rev.of}`);
  assert(rev.tier === 'purple', `tier expected purple (beats the only prior), got ${rev.tier}`);
  assert(rev.rowsPassed === 1, `rowsPassed expected 1, got ${rev.rowsPassed}`);
  assert(rev.climbMs === 800, `climbMs expected 800, got ${rev.climbMs}`);
  assert(rev.of <= WINDOW_N, `of must never exceed WINDOW_N, got ${rev.of}`);
});

test('rankingReveal: ride 2 slower than the only prior lands P2 of 2, yellow — never green (n=1)', () => {
  const window = [ride(600, T0, 'seed:2')];
  const st = { track: 'Morning', lap: { rawS: 620, stoppedS: 0, movingS: 620, estimated: false } };
  const rev = buildRankingReveal(st, 'test:g', TODAY_MS, window, null);
  assert(rev !== null, 'expected a reveal');
  assert(rev.pos === 2, `pos expected 2, got ${rev.pos}`);
  assert(rev.of === 2, `of expected 2, got ${rev.of}`);
  assert(rev.tier === 'yellow', `tier expected yellow (n=1 can only be purple or yellow), got ${rev.tier}`);
  assert(rev.rowsPassed === 0, `rowsPassed expected 0, got ${rev.rowsPassed}`);
  assert(rev.climbMs === 600, `climbMs expected 600 (zero travel), got ${rev.climbMs}`);
  assert(rev.of <= WINDOW_N, `of must never exceed WINDOW_N, got ${rev.of}`);
});

// ---------------------------------------------------------- full window: never "of 11"

const NINE = [700, 710, 720, 730, 740, 750, 760, 770, 780].map((v, i) => ride(v, T0 + i * DAY, `seed:${i}`));

test('rankingReveal: full nine-row window — today fastest lands P1 of 10, max climb', () => {
  const st = { track: 'Morning', lap: { rawS: 690, stoppedS: 0, movingS: 690, estimated: false } };
  const rev = buildRankingReveal(st, 'test:h', TODAY_MS, NINE, null);
  assert(rev !== null, 'expected a reveal');
  assert(rev.of === 10, `of expected 10 (window of 9 + today), got ${rev.of}`);
  assert(rev.of <= WINDOW_N, `of must never be 11, got ${rev.of}`);
  assert(rev.pos === 1, `pos expected 1, got ${rev.pos}`);
  assert(rev.rowsPassed === 9, `rowsPassed expected 9, got ${rev.rowsPassed}`);
  assert(rev.climbMs === CLIMB_MAX_MS, `climbMs expected the clamp ${CLIMB_MAX_MS}, got ${rev.climbMs}`);
});

test('rankingReveal: full nine-row window — today slowest lands P10 of 10, zero climb', () => {
  const st = { track: 'Morning', lap: { rawS: 800, stoppedS: 0, movingS: 800, estimated: false } };
  const rev = buildRankingReveal(st, 'test:i', TODAY_MS, NINE, null);
  assert(rev !== null, 'expected a reveal');
  assert(rev.of === 10, `of expected 10, got ${rev.of}`);
  assert(rev.of <= WINDOW_N, `of must never be 11, got ${rev.of}`);
  assert(rev.pos === 10, `pos expected 10, got ${rev.pos}`);
  assert(rev.rowsPassed === 0, `rowsPassed expected 0, got ${rev.rowsPassed}`);
  assert(rev.climbMs === CLIMB_MIN_MS, `climbMs expected the floor ${CLIMB_MIN_MS}, got ${rev.climbMs}`);
});

test("rankingReveal: the board is buildTowerModel's own output, not hand-built", () => {
  const st = { track: 'Morning', lap: { rawS: 690, stoppedS: 0, movingS: 690, estimated: false } };
  const rev = buildRankingReveal(st, 'test:j', TODAY_MS, NINE, null);
  assert(rev !== null, 'expected a reveal');
  assert(rev.model.rows.length === rev.of, `model.rows.length (${rev.model.rows.length}) must equal reveal.of (${rev.of})`);
  const todayRows = rev.model.rows.filter((r) => r.today);
  assert(todayRows.length === 1, `exactly one row must be today's, got ${todayRows.length}`);
  assert(todayRows[0].pos === rev.pos, `the today row's own pos (${todayRows[0].pos}) must equal reveal.pos (${rev.pos})`);
  for (let i = 1; i < rev.model.rows.length; i++) {
    const a = rev.model.rows[i - 1].time;
    const b = rev.model.rows[i].time;
    // times are formatted strings; compare the underlying pos instead, which
    // buildTowerModel guarantees is 1-based ascending by scored time.
    assert(
      (rev.model.rows[i - 1].pos ?? 0) < (rev.model.rows[i].pos ?? Infinity),
      `rows must be strictly ascending by rank: row ${i - 1} pos ${rev.model.rows[i - 1].pos}, row ${i} pos ${rev.model.rows[i].pos} (times ${a}/${b})`,
    );
  }
});

// ---------------------------------------------------------- climbMsFor

test('rankingReveal: climbMsFor clamps to [CLIMB_MIN_MS, CLIMB_MAX_MS]', () => {
  assert(climbMsFor(0) === 600, `climbMsFor(0) expected 600, got ${climbMsFor(0)}`);
  assert(climbMsFor(1) === 800, `climbMsFor(1) expected 800, got ${climbMsFor(1)}`);
  assert(climbMsFor(8) === 2200, `climbMsFor(8) expected 2200, got ${climbMsFor(8)}`);
  assert(climbMsFor(20) === 2200, `climbMsFor(20) expected the clamp 2200, got ${climbMsFor(20)}`);
  assert(
    climbMsFor(3) === CLIMB_MIN_MS + CLIMB_PER_ROW_MS * 3,
    'within range, climbMsFor must equal the raw constants arithmetic',
  );
});

// ---------------------------------------------------------- all-time best -> PB dot

test("rankingReveal: today's row carries the PB dot when it equals allTimeBestS, and only today's row does", () => {
  const window = [700, 710, 720, 730, 740, 750, 760, 770, 780].map((v, i) => ride(v, T0 + i * DAY, `pb:${i}`));
  const st = { track: 'Morning', lap: { rawS: 650, stoppedS: 0, movingS: 650, estimated: false } };
  const rev = buildRankingReveal(st, 'test:k', TODAY_MS, window, 650);
  assert(rev !== null, 'expected a reveal');
  const pbRows = rev.model.rows.filter((r) => r.pb);
  assert(pbRows.length === 1, `expected exactly one PB row, got ${pbRows.length}`);
  assert(pbRows[0].today === true, "the PB row must be today's row (today equals the injected all-time best)");
});

// ---------------------------------------------------------- R5: the exclusion trap

test('rankingReveal: self-exclusion after rememberRide — today must not be its own history (the R5 trap)', () => {
  resetRecordedForTests();
  const way = 'EveningA';
  assert(
    rankedCountFor(way) === 10,
    `this fixture needs EveningA's 10 ranked seed rides, got ${rankedCountFor(way)} — seed curation changed, revisit this test`,
  );
  const before = ghostsFor(way).length;
  assert(before === 9, `expected a window of 9 before today (WINDOW_PREV), got ${before}`);

  const mine = 601; // fmt -> '10:01' — distinct from every EveningA seed lap (fastest 810.0s)
  const startedAtMs = T0;
  const rideId = 'test:reveal-today';
  rememberRide(
    stateWith({
      track: way,
      sectors: [doneSector(150), doneSector(150), doneSector(150), doneSector(151)],
      lap: { rawS: mine, stoppedS: 0, movingS: mine, estimated: false },
    }),
    { rideId, startedAtMs },
  );

  // Real store path: default window/allTimeBestS, exactly what onEnd calls.
  const rev = buildRankingReveal({ track: way, lap: { rawS: mine, stoppedS: 0, movingS: mine, estimated: false } }, rideId, startedAtMs);
  assert(rev !== null, 'expected a reveal for ride 11 of a 10-deep way');
  assert(rev.of === before + 1, `of (${rev.of}) must equal before+1 (${before + 1})`);
  assert(rev.of === 10, `of must be exactly 10 (WINDOW_N), never 11, got ${rev.of}`);
  const printed = rev.model.rows.filter((r) => r.time === fmt(mine));
  assert(printed.length === 1, `expected exactly one row printing '${fmt(mine)}', got ${printed.length}`);
  assert(
    ghostsFor(way, rideId).every((r) => r.rideId !== rideId),
    "B-44's exclusion must survive: today's own stored ride must never sit in its own window",
  );

  resetRecordedForTests();
});
