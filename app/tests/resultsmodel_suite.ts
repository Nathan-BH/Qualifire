/**
 * QA — WP-2 Phase A: `resultsListModel.ts` (buildResultsList,
 * buildHistoryBoard, boardCaption, windowCaption) and `resultsPlotModel.ts`
 * (plotWindow, fitDomain, toneFor, buildPlotModel). Pure; a small inline
 * catalog (two routes, three ways — one seeded id, one legacy `route:`-
 * prefixed way, one new `way:`-prefixed way) plus hand-built RideResults,
 * same fixture style as `catalogdetail_suite.ts`.
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { assert, test } from './lib.ts';
import type { Catalog, Landmark, Route, RideResult, SectorQuality, Way } from '../src/store/types.ts';

// Same JSON-import hook as live_colour_suite/towermodel_suite: both models
// pull fmt/WINDOW_PREV/towerDate from colourModel.ts / towerModel.ts, whose
// module bodies import the bare-.json seed — so these must be dynamically
// imported AFTER the hook is registered, not via a static top-level import.
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
  buildResultsList, buildHistoryBoard, boardCaption, windowCaption,
} = await import('../src/ui/resultsListModel.ts');
const {
  plotWindow, fitDomain, toneFor, buildPlotModel, mean,
  PAD_L, PAD_R, MAX_Y_TICKS, MAX_X_TICKS, LABEL_COLLISION_PX,
} = await import('../src/ui/resultsPlotModel.ts');
const { WINDOW_PREV } = await import('../src/ui/colourModel.ts');

// ------------------------------------------------------------------ fixture

const lmA: Landmark = { id: 'lm:a', label: 'Home', lat: 50.87, lon: 4.70, radiusM: 180, activeFromMs: 0, activeUntilMs: null, offerAtStart: true };
const lmB: Landmark = { id: 'lm:b', label: 'Work', lat: 50.85, lon: 4.72, radiusM: 150, activeFromMs: 0, activeUntilMs: null, offerAtStart: true };
const lmC: Landmark = { id: 'lm:c', label: 'Station', lat: 50.90, lon: 4.68, radiusM: 150, activeFromMs: 0, activeUntilMs: null, offerAtStart: true };

// route ids are plain (not way/route-prefixed on purpose — WP-3 prefixes
// only ever apply to WAY ids); wayIds below cover a seeded id (no prefix),
// a legacy pre-WP-3 way id ('route:' prefix), and a new one ('way:' prefix).
const routeAB: Route = { id: 'rt:AB', startLandmarkId: 'lm:a', endLandmarkId: 'lm:b', wayIds: ['Morning', 'route:abc'] };
const routeAC: Route = { id: 'rt:AC', startLandmarkId: 'lm:a', endLandmarkId: 'lm:c', wayIds: ['way:def'] };

const wayMorning: Way = { id: 'Morning', routeId: 'rt:AB', refLineId: 'ref:morning', gateSetVersion: 1, seeded: true };
const wayLegacy: Way = { id: 'route:abc', routeId: 'rt:AB', refLineId: 'ref:legacy', gateSetVersion: 1, seeded: false, specs: ['Alt'] };
const wayDef: Way = { id: 'way:def', routeId: 'rt:AC', refLineId: 'ref:def', gateSetVersion: 1, seeded: false, specs: ['Fast'] };

const CATALOG: Catalog = {
  schemaVersion: 2,
  landmarks: [lmA, lmB, lmC],
  routes: [routeAB, routeAC],
  ways: [wayMorning, wayLegacy, wayDef],
  gateSets: [],
};

/** Hand-built RideResult; defaults to wayId 'Morning', quality 'clean'. */
function mk(
  rideId: string,
  startedAtMs: number,
  rawS: number,
  quality: SectorQuality = 'clean',
  extra: Partial<RideResult> = {},
): RideResult {
  const movingS = quality === 'estimated' || quality === 'missed' ? null : rawS;
  return {
    kind: 'rideResult',
    schemaVersion: 2,
    rideId,
    startedAtMs,
    wayId: 'Morning',
    source: 'app',
    lap: { rawS, movingS, quality },
    sectors: [],
    derivedBy: { engineVersion: 'test', gateSetVersion: 1, resultSchemaVersion: 2 },
    ...extra,
  };
}

/** n rides `days`-days apart in TOTAL span, via setDate (DST-safe), off a
 * fixed local reference so tests are deterministic regardless of machine TZ. */
function ridesOverDays(days: number, n: number): RideResult[] {
  const base = new Date(2025, 5, 1); // Sun 01 Jun 2025, local
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + Math.round((days * i) / (n - 1)));
    return mk(`d${i}`, d.getTime(), 600 + i);
  });
}

// -------------------------------------------------------------------- tests
// buildResultsList

test('resultsmodel: buildResultsList — count desc, unridden count, labels via wayLabelIn, null bestLabel', () => {
  const resultsFor = (wayId: string): RideResult[] => {
    if (wayId === 'Morning') return [1, 2, 3, 4, 5].map((i) => mk(`m${i}`, i * 1000, 600 + i));
    if (wayId === 'route:abc') return [1, 2].map((i) => mk(`a${i}`, i * 1000, 700 + i, 'clean', { wayId: 'route:abc' }));
    return []; // way:def has zero results
  };
  const bestS = (wayId: string): number | null => (wayId === 'Morning' ? 601 : null);
  const model = buildResultsList(CATALOG, resultsFor, bestS);

  assert(model.rows.length === 2, `expected 2 rows, got ${model.rows.length}`);
  assert(model.rows[0].wayId === 'Morning', `expected Morning first (5 rides), got ${model.rows[0].wayId}`);
  assert(model.rows[0].rides === 5, `expected 5 rides, got ${model.rows[0].rides}`);
  assert(model.rows[1].wayId === 'route:abc', `expected route:abc second (2 rides), got ${model.rows[1].wayId}`);
  assert(model.unriddenWays === 1, `expected 1 unridden way (way:def), got ${model.unriddenWays}`);
  assert(model.rows[0].label === 'Home Work Dry', `expected seeded label 'Home Work Dry', got '${model.rows[0].label}'`);
  assert(model.rows[1].label === 'Home → Work · Alt', `expected legacy label 'Home → Work · Alt', got '${model.rows[1].label}'`);
  assert(model.rows[0].bestLabel !== null, 'Morning bestLabel should not be null');
  assert(model.rows[1].bestLabel === null, 'route:abc bestLabel should be null when bestS returns null');
});

test('resultsmodel: buildResultsList — tie on count broken by most recent ride', () => {
  const resultsFor = (wayId: string): RideResult[] => {
    if (wayId === 'Morning') return [mk('m1', 1000, 600), mk('m2', 2000, 610), mk('m3', 5000, 620)];
    if (wayId === 'route:abc') {
      return [8000, 6000, 3000].map((ms, i) => mk(`a${i}`, ms, 700 + i, 'clean', { wayId: 'route:abc' }));
    }
    return [];
  };
  const model = buildResultsList(CATALOG, resultsFor, () => null);
  assert(model.rows.length === 2, `expected 2 rows, got ${model.rows.length}`);
  assert(model.rows[0].wayId === 'route:abc', `expected route:abc first (last ride at 8000 > 5000), got ${model.rows[0].wayId}`);
});

test('resultsmodel: buildResultsList — new way:def id labels via wayLabelIn too', () => {
  const resultsFor = (wayId: string): RideResult[] => (wayId === 'way:def' ? [mk('d1', 1000, 500, 'clean', { wayId: 'way:def' })] : []);
  const model = buildResultsList(CATALOG, resultsFor, () => null);
  assert(model.rows.length === 1 && model.rows[0].label === 'Home → Station · Fast',
    `expected 'Home → Station · Fast', got ${JSON.stringify(model.rows)}`);
});

// buildHistoryBoard

test('resultsmodel: buildHistoryBoard — ranked 1..4, ignored/estimated after, NO TIME, pb, gaps', () => {
  const results = [
    mk('r1', 1000, 600),
    mk('r2', 2000, 610),
    mk('r3', 3000, 590), // fastest overall — the all-time PB
    mk('r4', 4000, 620),
    mk('r5', 5000, 615, 'clean', { ignoredFromRanking: true }), // unranked, keeps its time
    mk('r6', 6000, 0, 'estimated'), // unranked, NO TIME
  ];
  const board = buildHistoryBoard(results, 590);

  assert(board.total === 6, `expected total 6, got ${board.total}`);
  assert(board.ranked === 4, `expected ranked 4, got ${board.ranked}`);
  const ranked = board.rows.filter((r) => r.pos !== null);
  assert(ranked.map((r) => r.pos).join(',') === '1,2,3,4', `expected positions 1..4, got ${ranked.map((r) => r.pos).join(',')}`);
  assert(ranked[0].rideId === 'r3', `expected r3 (590s) at P1, got ${ranked[0].rideId}`);
  assert(ranked[0].gapLabel === '—', `expected P1 gapLabel '—', got '${ranked[0].gapLabel}'`);
  assert(ranked[1].gapLabel.startsWith('+') && ranked[1].gapLabel.endsWith('s'), `expected a '+Xs' gap, got '${ranked[1].gapLabel}'`);

  const unranked = board.rows.filter((r) => r.pos === null);
  assert(unranked.length === 2, `expected 2 unranked rows, got ${unranked.length}`);
  const ignoredRow = unranked.find((r) => r.rideId === 'r5')!;
  assert(!ignoredRow.noTime && ignoredRow.timeLabel !== 'NO TIME', `ignored ride must keep its time, got '${ignoredRow.timeLabel}'`);
  assert(ignoredRow.gapLabel === '', `expected empty gapLabel for an unranked row, got '${ignoredRow.gapLabel}'`);
  const estRow = unranked.find((r) => r.rideId === 'r6')!;
  assert(estRow.noTime && estRow.timeLabel === 'NO TIME', `estimated ride must show NO TIME, got '${estRow.timeLabel}'`);

  const pbRows = board.rows.filter((r) => r.pb);
  assert(pbRows.length === 1 && pbRows[0].rideId === 'r3', `expected exactly one pb row (r3), got ${JSON.stringify(pbRows)}`);
});

test('resultsmodel: boardCaption / windowCaption wording', () => {
  assert(boardCaption(27, true) === 'ALL 27 RIDES · fastest first', boardCaption(27, true));
  assert(boardCaption(1, true) === 'ALL 1 RIDE · fastest first', boardCaption(1, true));
  assert(boardCaption(27, false) === 'ALL 27 RIDES · rankings off in SETTINGS', boardCaption(27, false));
  assert(windowCaption(9) === 'LAST 9 RIDES', windowCaption(9));
  assert(windowCaption(1) === 'LAST 1 RIDE', windowCaption(1));
});

// plotWindow

test('resultsmodel: plotWindow — PLOT_N most recent ranked, ascending, excludes ignored/tripwire/estimated', () => {
  const rankedRides = Array.from({ length: 12 }, (_, i) => mk(`p${i}`, (i + 1) * 1000, 600 + i));
  const excluded = [
    mk('ig1', 13000, 700, 'clean', { ignoredFromRanking: true }),
    mk('tw1', 14000, 710, 'clean', { tripwireDemoted: true }),
    mk('est1', 15000, 0, 'estimated'),
  ];
  const shuffled = [excluded[2], rankedRides[7], excluded[0], ...rankedRides.slice(0, 7), rankedRides[8], excluded[1], ...rankedRides.slice(9)];
  const window = plotWindow(shuffled);

  assert(window.length === WINDOW_PREV, `expected ${WINDOW_PREV}, got ${window.length}`);
  for (let i = 1; i < window.length; i++) {
    assert(window[i].startedAtMs > window[i - 1].startedAtMs, 'window must be ascending by startedAtMs');
  }
  const expectedIds = rankedRides.slice(-WINDOW_PREV).map((r) => r.rideId);
  assert(window.map((r) => r.rideId).join(',') === expectedIds.join(','), `expected [${expectedIds}], got [${window.map((r) => r.rideId)}]`);
});

test('resultsmodel: plotWindow — fewer than PLOT_N ranked returns all of them', () => {
  const three = [mk('t1', 1000, 600), mk('t2', 2000, 610), mk('t3', 3000, 590)];
  assert(plotWindow(three).length === 3, `expected 3, got ${plotWindow(three).length}`);
});

test('resultsmodel: plotWindow — zero ranked returns []', () => {
  const none = [mk('e1', 1000, 0, 'estimated'), mk('e2', 2000, 700, 'clean', { ignoredFromRanking: true })];
  assert(plotWindow(none).length === 0, `expected [], got ${plotWindow(none).length} entries`);
});

// fitDomain

test('resultsmodel: fitDomain — single value floors span to minSpan(30s)', () => {
  const { yMin, yMax, meanS } = fitDomain([1200]);
  assert(Math.abs(yMin - 1164) < 1e-9, `expected yMin≈1164, got ${yMin}`);
  assert(Math.abs(yMax - 1236) < 1e-9, `expected yMax≈1236, got ${yMax}`);
  assert(meanS === 1200, `expected meanS 1200, got ${meanS}`);
});

test('resultsmodel: fitDomain — three close values also floor', () => {
  const MIN_SPAN_S = 30;
  const { yMin, yMax } = fitDomain([1200, 1202, 1204]);
  assert(yMax - yMin >= MIN_SPAN_S, `expected a floored span, got ${yMax - yMin}`);
});

test('resultsmodel: fitDomain — an outlier widens the domain, no fence', () => {
  const { yMin, yMax } = fitDomain([1150, 1180, 1200, 1220, 2900]);
  assert(yMax >= 2900, `expected yMax to include the 2900 outlier, got ${yMax}`);
  assert(yMin <= 1150, `expected yMin at or below 1150, got ${yMin}`);
});

test('resultsmodel: fitDomain — mean is always inside [yMin, yMax]', () => {
  const cases = [[1200], [1150, 1180, 1200, 1220, 2900], [500, 505, 495]];
  for (const c of cases) {
    const { yMin, yMax, meanS } = fitDomain(c);
    assert(meanS >= yMin && meanS <= yMax, `mean ${meanS} not within [${yMin}, ${yMax}] for [${c}]`);
  }
});

// toneFor

test('resultsmodel: toneFor — exactly one fastest (the OLDER of a tie), faster/slower vs mean', () => {
  const times = [1200, 1190, 1250, 1190]; // mean = 1207.5
  const m = mean(times);
  const tones = toneFor(times, m);
  assert(tones.filter((t) => t === 'fastest').length === 1, `expected exactly one fastest, got ${JSON.stringify(tones)}`);
  assert(tones[1] === 'fastest', `expected index 1 (older of the 1190 tie) to be fastest, got '${tones[1]}'`);
  assert(tones[0] === 'faster', `expected index 0 (1200 < mean ${m}) faster, got '${tones[0]}'`);
  assert(tones[2] === 'slower', `expected index 2 (1250 > mean ${m}) slower, got '${tones[2]}'`);
});

test('resultsmodel: toneFor — a single time is fastest', () => {
  const tones = toneFor([1200], 1200);
  assert(tones.length === 1 && tones[0] === 'fastest', `expected ['fastest'], got ${JSON.stringify(tones)}`);
});

test('resultsmodel: toneFor — two times: exactly one fastest', () => {
  const tones = toneFor([1200, 1250], 1225);
  assert(tones.filter((t) => t === 'fastest').length === 1, `expected exactly one fastest, got ${JSON.stringify(tones)}`);
});

// buildPlotModel

test('resultsmodel: buildPlotModel — pixel positions proportional to time, tone extremes, meanY between them', () => {
  const results = [
    mk('q0', 0, 650), // slowest, oldest
    mk('q1', 100, 600), // fastest, at 1/3
    mk('q2', 200, 620), // at 2/3
    mk('q3', 300, 610), // newest
  ];
  const model = buildPlotModel(results, 300);
  const byId = new Map(model.points.map((p) => [p.rideId, p]));

  assert(Math.abs(byId.get('q0')!.x - PAD_L) < 1e-9, `expected oldest x===PAD_L, got ${byId.get('q0')!.x}`);
  assert(Math.abs(byId.get('q3')!.x - (300 - PAD_R)) < 1e-9, `expected newest x===plotW-PAD_R, got ${byId.get('q3')!.x}`);
  assert(Math.abs(byId.get('q1')!.x - 104) < 1e-6, `expected q1 (1/3) x≈104, got ${byId.get('q1')!.x}`);
  assert(Math.abs(byId.get('q2')!.x - 196) < 1e-6, `expected q2 (2/3) x≈196, got ${byId.get('q2')!.x}`);

  const fastest = model.points.find((p) => p.tone === 'fastest')!;
  assert(fastest.rideId === 'q1', `expected q1 (600s) to be fastest, got ${fastest.rideId}`);
  const slowest = model.points.reduce((a, b) => (b.timeS > a.timeS ? b : a));
  assert(fastest.y < slowest.y, `expected fastest.y < slowest.y (faster=up), got ${fastest.y} vs ${slowest.y}`);
  assert(model.meanY !== null && model.meanY > fastest.y && model.meanY < slowest.y, 'expected meanY strictly between fastest.y and slowest.y');

  assert(model.yTicks.length <= MAX_Y_TICKS, `expected ≤${MAX_Y_TICKS} y ticks, got ${model.yTicks.length}`);
  for (let i = 1; i < model.yTicks.length; i++) {
    assert(model.yTicks[i].at > model.yTicks[i - 1].at, 'yTicks must ascend (a slower time has a larger at)');
  }
});

test('resultsmodel: buildPlotModel — single ranked ride: one fastest dot at the right edge, colliding tick label is null', () => {
  const model = buildPlotModel([mk('s1', 5000, 1200)], 300);
  assert(model.points.length === 1, `expected 1 point, got ${model.points.length}`);
  assert(Math.abs(model.points[0].x - (300 - PAD_R)) < 1e-9, `single point must sit at plotW-PAD_R, got ${model.points[0].x}`);
  assert(model.points[0].tone === 'fastest', `single point must be 'fastest', got '${model.points[0].tone}'`);
  assert(model.empty === 'none', `expected empty 'none' for one ranked ride, got '${model.empty}'`);

  const collided = model.yTicks.find((tk) => Math.abs(tk.at - (model.meanY as number)) <= LABEL_COLLISION_PX);
  assert(collided !== undefined && collided.label === null, `expected a colliding tick with a null label, got ${JSON.stringify(model.yTicks)}`);
});

test('resultsmodel: buildPlotModel — 10+ ranked rides: exactly PLOT_N dots, oldest ranked ride excluded', () => {
  const ten = Array.from({ length: 10 }, (_, i) => mk(`n${i}`, (i + 1) * 10_000, 600 - i));
  const model = buildPlotModel(ten, 300);
  assert(model.windowN === WINDOW_PREV, `expected windowN ${WINDOW_PREV}, got ${model.windowN}`);
  assert(model.points.length === WINDOW_PREV, `expected ${WINDOW_PREV} points, got ${model.points.length}`);
  assert(!model.points.some((p) => p.rideId === 'n0'), 'the oldest ranked ride (n0) must be excluded from the plot');
});

test('resultsmodel: buildPlotModel — 0 ranked results ⇒ empty "no-ranked", no points', () => {
  const none = [mk('e1', 1000, 0, 'estimated'), mk('e2', 2000, 700, 'clean', { ignoredFromRanking: true })];
  const model = buildPlotModel(none, 300);
  assert(model.empty === 'no-ranked', `expected 'no-ranked', got '${model.empty}'`);
  assert(model.points.length === 0, `expected 0 points, got ${model.points.length}`);
  assert(model.windowN === 0, `expected windowN 0, got ${model.windowN}`);
});

test('resultsmodel: buildPlotModel — x-ticks: monthly for 200 days, weekly for 20 days, end-labelled under 7 days', () => {
  const monthly = buildPlotModel(ridesOverDays(200, 7), 300);
  assert(monthly.xTicks.length > 0 && monthly.xTicks.length <= MAX_X_TICKS, `expected 1..${MAX_X_TICKS} monthly x ticks, got ${monthly.xTicks.length}`);
  assert(monthly.xTicks.every((tk) => tk.label !== null && /^[A-Z][a-z]{2}( \d{2})?$/.test(tk.label)), `expected month-style labels, got ${JSON.stringify(monthly.xTicks)}`);

  const weekly = buildPlotModel(ridesOverDays(20, 7), 300);
  assert(weekly.xTicks.length > 0, 'expected at least one weekly tick for a 20-day span');
  assert(weekly.xTicks.every((tk) => tk.label !== null && /^\d{2} [A-Z][a-z]{2}$/.test(tk.label)), `expected 'dd Mon' labels, got ${JSON.stringify(weekly.xTicks)}`);

  // Wed 04 Jun 2025 -> Fri 06 Jun 2025: a 2-day span with no Monday in it.
  const short = buildPlotModel([mk('sh0', new Date(2025, 5, 4).getTime(), 600), mk('sh1', new Date(2025, 5, 6).getTime(), 610)], 300);
  assert(short.xTicks.length === 2, `expected end-labelled (2 ticks) for a span with no Monday, got ${short.xTicks.length}`);
});

test('resultsmodel: buildPlotModel — 9 rides spanning ~1 year: capped at MAX_X_TICKS, newest month boundary (Jan, year-labelled) present', () => {
  const dates = [
    new Date(2025, 0, 15), new Date(2025, 1, 15), new Date(2025, 2, 15), new Date(2025, 3, 15),
    new Date(2025, 4, 15), new Date(2025, 5, 15), new Date(2025, 6, 15), new Date(2025, 7, 15),
    new Date(2026, 0, 15),
  ];
  const results = dates.map((d, i) => mk(`y${i}`, d.getTime(), 600 + i));
  const model = buildPlotModel(results, 300);
  assert(model.windowN === 9, `expected windowN 9, got ${model.windowN}`);
  assert(model.xTicks.length > 0 && model.xTicks.length <= MAX_X_TICKS, `expected 1..${MAX_X_TICKS} x ticks, got ${model.xTicks.length}`);
  const last = model.xTicks[model.xTicks.length - 1];
  assert(last.label === 'Jan 26', `expected the newest month boundary labelled 'Jan 26', got ${JSON.stringify(model.xTicks)}`);
});
