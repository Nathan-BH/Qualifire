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
  buildResultsList, buildHistoryBoard, boardCaption,
  buildResultsRoutes, rideCountForRoute, routeLabel,
} = await import('../src/ui/resultsListModel.ts');
const {
  plotWindow, fitDomain, toneFor, buildPlotModel, mean,
  PAD_L, PAD_R, MAX_Y_TICKS, LABEL_COLLISION_PX,
  xAtSlot, slotIndex, PLOT_N, X_TICK_MIN_GAP_PX, windowCaption,
} = await import('../src/ui/resultsPlotModel.ts');
const { WINDOW_N } = await import('../src/ui/colourModel.ts');
const { towerDate } = await import('../src/ui/towerModel.ts');

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

// buildResultsRoutes / rideCountForRoute / routeLabel — virgin-cycle15 brief
// 13 / Fable ruling 2026-09-28. routeAB (rt:AB) has two ways in this
// fixture (Morning, route:abc); routeAC (rt:AC) has exactly one (way:def) —
// so routeAC doubles as the "single ridden way" case the ruling's §5 cares
// about, with no separate fixture needed.

test('resultsmodel: buildResultsRoutes — most-used route first, single-ridden-way route keeps ways.length === 1', () => {
  const resultsFor = (wayId: string): RideResult[] => {
    if (wayId === 'Morning') return [1, 2].map((i) => mk(`m${i}`, i * 1000, 600 + i));
    if (wayId === 'route:abc') return [3, 4].map((i) => mk(`a${i}`, i * 1000, 700 + i, 'clean', { wayId: 'route:abc' }));
    if (wayId === 'way:def') return [1, 2, 3].map((i) => mk(`d${i}`, i * 1000, 500 + i, 'clean', { wayId: 'way:def' }));
    return [];
  };
  const routes = buildResultsRoutes(CATALOG, resultsFor, () => null);
  assert(routes.length === 2, `expected 2 routes, got ${routes.length}`);
  assert(routes[0].routeId === 'rt:AB', `expected rt:AB first (4 rides > 3), got ${routes[0].routeId}`);
  assert(routes[0].rideCount === 4, `expected rt:AB rideCount 4, got ${routes[0].rideCount}`);
  assert(routes[0].ways.length === 2, `expected rt:AB to have 2 ridden ways, got ${routes[0].ways.length}`);
  assert(routes[1].routeId === 'rt:AC', `expected rt:AC second (3 rides), got ${routes[1].routeId}`);
  assert(routes[1].ways.length === 1, `expected rt:AC to have exactly 1 ridden way, got ${routes[1].ways.length}`);
  assert(routes[1].rideCount === 3, `expected rt:AC rideCount 3, got ${routes[1].rideCount}`);
  assert(routes[0].label === 'Home → Work', `expected 'Home → Work', got '${routes[0].label}'`);
  assert(routes[1].label === 'Home → Station', `expected 'Home → Station', got '${routes[1].label}'`);
});

test('resultsmodel: buildResultsRoutes — tie on total rides broken by most recent ride across the route', () => {
  const resultsFor = (wayId: string): RideResult[] => {
    if (wayId === 'Morning') return [mk('m1', 100, 600), mk('m2', 200, 610)];
    if (wayId === 'route:abc') return [];
    if (wayId === 'way:def') return [mk('d1', 400, 500), mk('d2', 500, 510)];
    return [];
  };
  const routes = buildResultsRoutes(CATALOG, resultsFor, () => null);
  assert(routes.length === 2, `expected 2 routes, got ${routes.length}`);
  assert(routes[0].rideCount === 2 && routes[1].rideCount === 2, 'expected both routes tied at 2 rides');
  assert(routes[0].routeId === 'rt:AC', `expected rt:AC first (last ride at 500 > 200), got ${routes[0].routeId}`);
});

test('resultsmodel: buildResultsRoutes — tie on total rides AND last-ridden broken by label asc', () => {
  const resultsFor = (wayId: string): RideResult[] => {
    if (wayId === 'Morning') return [mk('m1', 100, 600)];
    if (wayId === 'route:abc') return [];
    if (wayId === 'way:def') return [mk('d1', 100, 500)];
    return [];
  };
  const routes = buildResultsRoutes(CATALOG, resultsFor, () => null);
  assert(routes.length === 2, `expected 2 routes, got ${routes.length}`);
  assert(routes[0].label < routes[1].label, `expected label-asc order, got ${routes[0].label}, ${routes[1].label}`);
  // 'Home → Station' < 'Home → Work' ('S' < 'W') — rt:AC sorts first.
  assert(routes[0].routeId === 'rt:AC', `expected rt:AC first ('Home → Station' < 'Home → Work'), got ${routes[0].routeId}`);
});

test('resultsmodel: buildResultsRoutes — a route with zero ridden ways is absent', () => {
  const resultsFor = (wayId: string): RideResult[] => (wayId === 'Morning' ? [mk('m1', 100, 600)] : []);
  const routes = buildResultsRoutes(CATALOG, resultsFor, () => null);
  assert(routes.length === 1, `expected 1 route, got ${routes.length}`);
  assert(routes[0].routeId === 'rt:AB', `expected only rt:AB, got ${routes[0].routeId}`);
  assert(routes.every((r) => r.routeId !== 'rt:AC'), 'expected rt:AC (zero ridden ways) to be absent');
});

test('resultsmodel: buildResultsRoutes — empty catalog returns []', () => {
  const empty: Catalog = { schemaVersion: 2, landmarks: [], routes: [], ways: [], gateSets: [] };
  const routes = buildResultsRoutes(empty, () => [], () => null);
  assert(routes.length === 0, `expected [], got ${JSON.stringify(routes)}`);
});

test('resultsmodel: rideCountForRoute — sums over the ways whose routeId is this route, ignoring a stray way', () => {
  const resultsFor = (wayId: string): RideResult[] => {
    if (wayId === 'Morning') return [mk('m1', 100, 600), mk('m2', 200, 610)];
    if (wayId === 'route:abc') return [mk('a1', 300, 700)];
    if (wayId === 'way:def') return [mk('d1', 350, 500)];
    if (wayId === 'not-in-any-route') return [mk('x1', 400, 800), mk('x2', 500, 810)];
    return [];
  };
  const total = rideCountForRoute(routeAB, CATALOG, resultsFor);
  assert(total === 3, `expected 3 (2 + 1; way:def is rt:AC's, stray way is nobody's), got ${total}`);
});

// Group 5 Inspect fix-up (2026-09-28): membership is `way.routeId`, not
// `route.wayIds`. store/routeCreation.ts's existing-route path cannot update
// a SEED route's wayIds (seed wins in mergeCatalogs), so on a curated-seed
// build a user-recorded extra way on a seed route is linked ONLY by its own
// routeId -- and must still show under that route in RESULTS.
test('resultsmodel: buildResultsRoutes — a way linked only by way.routeId (not in route.wayIds) still groups under its route', () => {
  const wayOrphanLink: Way = { id: 'way:extra', routeId: 'rt:AB', refLineId: 'ref:extra', gateSetVersion: 1, seeded: false, specs: ['Extra'] };
  const catalog: Catalog = { ...CATALOG, ways: [...CATALOG.ways, wayOrphanLink] };
  assert(!routeAB.wayIds.includes('way:extra'), 'fixture precondition: rt:AB.wayIds must NOT list way:extra');
  const resultsFor = (wayId: string): RideResult[] => {
    if (wayId === 'Morning') return [mk('m1', 100, 600)];
    if (wayId === 'way:extra') return [mk('e1', 900, 650, 'clean', { wayId: 'way:extra' }), mk('e2', 950, 640, 'clean', { wayId: 'way:extra' })];
    return [];
  };
  const routes = buildResultsRoutes(catalog, resultsFor, () => null);
  assert(routes.length === 1 && routes[0].routeId === 'rt:AB', `expected only rt:AB, got ${JSON.stringify(routes.map((r) => r.routeId))}`);
  assert(routes[0].rideCount === 3, `expected rt:AB rideCount 3 (1 + 2 via way.routeId), got ${routes[0].rideCount}`);
  assert(routes[0].ways.length === 2, `expected 2 ridden ways under rt:AB, got ${routes[0].ways.length}`);
  // way-level order is the flat list's: way:extra (2 rides) before Morning (1).
  assert(routes[0].ways[0].wayId === 'way:extra' && routes[0].ways[1].wayId === 'Morning',
    `expected [way:extra, Morning], got ${JSON.stringify(routes[0].ways.map((w) => w.wayId))}`);
  assert(routes[0].lastRiddenAtMs === 950, `expected route lastRiddenAtMs 950, got ${routes[0].lastRiddenAtMs}`);
  // rideCountForRoute agrees with the grouped model.
  assert(rideCountForRoute(routeAB, catalog, resultsFor) === 3, 'rideCountForRoute must agree with buildResultsRoutes');
});

test('resultsmodel: routeLabel — From → To via landmark lookup; missing landmark renders as \'?\'', () => {
  assert(routeLabel(routeAB, CATALOG) === 'Home → Work', `expected 'Home → Work', got '${routeLabel(routeAB, CATALOG)}'`);
  const brokenRoute: Route = { id: 'rt:broken', startLandmarkId: 'lm:missing', endLandmarkId: 'lm:b', wayIds: [] };
  assert(routeLabel(brokenRoute, CATALOG) === '? → Work', `expected '? → Work', got '${routeLabel(brokenRoute, CATALOG)}'`);
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
  assert(!ignoredRow.noTime && ignoredRow.timeLabel !== 'Not ranked', `ignored ride must keep its time, got '${ignoredRow.timeLabel}'`);
  assert(ignoredRow.gapLabel === '', `expected empty gapLabel for an unranked row, got '${ignoredRow.gapLabel}'`);
  const estRow = unranked.find((r) => r.rideId === 'r6')!;
  assert(estRow.noTime && estRow.timeLabel === 'Not ranked', `estimated ride must show Not ranked, got '${estRow.timeLabel}'`);

  const pbRows = board.rows.filter((r) => r.pb);
  assert(pbRows.length === 1 && pbRows[0].rideId === 'r3', `expected exactly one pb row (r3), got ${JSON.stringify(pbRows)}`);
});

test('resultsmodel: boardCaption / windowCaption wording', () => {
  assert(boardCaption(27, true) === 'ALL 27 ACTIVITIES · fastest first', boardCaption(27, true));
  assert(boardCaption(1, true) === 'ALL 1 ACTIVITY · fastest first', boardCaption(1, true));
  assert(boardCaption(27, false) === 'ALL 27 ACTIVITIES · rankings off in SETTINGS', boardCaption(27, false));
  assert(windowCaption(9) === 'LAST 9 ACTIVITIES', windowCaption(9));
  assert(windowCaption(1) === 'LAST 1 ACTIVITY', windowCaption(1));
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

  assert(window.length === PLOT_N, `expected ${PLOT_N}, got ${window.length}`);
  for (let i = 1; i < window.length; i++) {
    assert(window[i].startedAtMs > window[i - 1].startedAtMs, 'window must be ascending by startedAtMs');
  }
  const expectedIds = rankedRides.slice(-PLOT_N).map((r) => r.rideId);
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

test('resultsmodel: buildPlotModel — x is the slot, newest at the right, gaps independent of time', () => {
  const results = [
    mk('q0', 0, 650), // slowest, oldest
    mk('q1', 100, 600), // fastest
    mk('q2', 200, 620),
    mk('q3', 300, 610), // newest
  ];
  const model = buildPlotModel(results, 300);
  const byId = new Map(model.points.map((p) => [p.rideId, p]));

  assert(Math.abs(byId.get('q3')!.x - (300 - PAD_R)) < 1e-9, `expected newest x===plotW-PAD_R, got ${byId.get('q3')!.x}`);
  assert(Math.abs(byId.get('q0')!.x - xAtSlot(PLOT_N - 4, 300)) < 1e-9, `expected oldest x===xAtSlot(PLOT_N-4,300), got ${byId.get('q0')!.x}`);
  const q0x = byId.get('q0')!.x;
  const q1x = byId.get('q1')!.x;
  const q2x = byId.get('q2')!.x;
  const q3x = byId.get('q3')!.x;
  assert(Math.abs((q1x - q0x) - (q2x - q1x)) < 1e-6, `expected equal slot spacing (q1-q0 vs q2-q1), got ${q1x - q0x} vs ${q2x - q1x}`);
  assert(Math.abs((q2x - q1x) - (q3x - q2x)) < 1e-6, `expected equal slot spacing (q2-q1 vs q3-q2), got ${q2x - q1x} vs ${q3x - q2x}`);

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

test('resultsmodel: buildPlotModel — two rides one slot apart whatever their time gap', () => {
  const DAY_MS = 86_400_000;
  const oneDayApart = [mk('a0', 0, 600), mk('a1', DAY_MS, 610)];
  const twoHundredDaysApart = [mk('b0', 0, 600), mk('b1', 200 * DAY_MS, 610)];
  const expectedGap = xAtSlot(1, 300) - xAtSlot(0, 300);
  for (const rides of [oneDayApart, twoHundredDaysApart]) {
    const model = buildPlotModel(rides, 300);
    assert(model.points.length === 2, `expected 2 points, got ${model.points.length}`);
    const gap = model.points[1].x - model.points[0].x;
    assert(Math.abs(gap - expectedGap) < 1e-6, `expected slot gap ${expectedGap}, got ${gap}`);
    assert(Math.abs(model.points[1].x - (300 - PAD_R)) < 1e-9, `expected newest x===plotW-PAD_R, got ${model.points[1].x}`);
  }
});

test('resultsmodel: buildPlotModel — full window spans PAD_L to plotW - PAD_R', () => {
  const rides = Array.from({ length: PLOT_N }, (_, i) => mk(`f${i}`, (i + 1) * 10_000, 600 + i));
  const model = buildPlotModel(rides, 300);
  assert(model.points.length === PLOT_N, `expected ${PLOT_N} points, got ${model.points.length}`);
  assert(Math.abs(model.points[0].x - PAD_L) < 1e-9, `expected first point x===PAD_L, got ${model.points[0].x}`);
  assert(Math.abs(model.points[PLOT_N - 1].x - (300 - PAD_R)) < 1e-9, `expected last point x===plotW-PAD_R, got ${model.points[PLOT_N - 1].x}`);
});

test('resultsmodel: buildPlotModel — xTicks: one label for n=1, one for n=2 at 300px, two for a full window', () => {
  const one = buildPlotModel([mk('o0', 1000, 600)], 300);
  assert(one.xTicks.length === 1, `expected 1 xTick for n=1, got ${one.xTicks.length}`);
  assert(Math.abs(one.xTicks[0].at - (300 - PAD_R)) < 1e-9, `expected the n=1 tick at plotW-PAD_R, got ${one.xTicks[0].at}`);

  const two = buildPlotModel([mk('t0', 0, 600), mk('t1', 1000, 610)], 300);
  assert(two.xTicks.length === 1, `expected 1 xTick for n=2 at 300px (gap below X_TICK_MIN_GAP_PX), got ${two.xTicks.length}`);

  const full = Array.from({ length: PLOT_N }, (_, i) => mk(`w${i}`, (i + 1) * 10_000, 600 + i));
  const model = buildPlotModel(full, 300);
  assert(model.xTicks.length === 2, `expected 2 xTicks for a full window, got ${model.xTicks.length}`);
  assert(Math.abs(model.xTicks[0].at - PAD_L) < 1e-9, `expected first tick at PAD_L, got ${model.xTicks[0].at}`);
  assert(Math.abs(model.xTicks[1].at - (300 - PAD_R)) < 1e-9, `expected second tick at plotW-PAD_R, got ${model.xTicks[1].at}`);
  assert(model.xTicks[0].label === towerDate(model.points[0].startedAtMs), `expected oldest label to be towerDate(oldest), got ${model.xTicks[0].label}`);
  assert(model.xTicks[1].label === towerDate(model.points[model.points.length - 1].startedAtMs), `expected newest label to be towerDate(newest), got ${model.xTicks[1].label}`);
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

test('resultsmodel: buildPlotModel — 11+ ranked rides: exactly PLOT_N (= WINDOW_N = 10) dots, oldest ranked ride excluded', () => {
  const eleven = Array.from({ length: 11 }, (_, i) => mk(`n${i}`, (i + 1) * 10_000, 600 - i));
  const model = buildPlotModel(eleven, 300);
  assert(model.windowN === WINDOW_N, `expected windowN ${WINDOW_N}, got ${model.windowN}`);
  assert(model.points.length === WINDOW_N, `expected ${WINDOW_N} points, got ${model.points.length}`);
  assert(!model.points.some((p) => p.rideId === 'n0'), 'the oldest ranked ride (n0) must be excluded from the plot');
  assert(model.points.some((p) => p.rideId === 'n1'), 'the 10th-newest ride (n1) is now on the plot');
});

test('virgin-cycle25 01: PLOT_N is the ranking pool WINDOW_N (10), not WINDOW_PREV', () => {
  assert(PLOT_N === WINDOW_N && WINDOW_N === 10, `PLOT_N ${PLOT_N} / WINDOW_N ${WINDOW_N}`);
  assert(windowCaption(10) === 'LAST 10 ACTIVITIES' && windowCaption(1) === 'LAST 1 ACTIVITY', 'caption moved with the plot model');
});

test('virgin-cycle25 01: buildPlotModel honours a custom plotH (y, meanY and ticks scale; default stays 220)', () => {
  const rides = [mk('h0', 1000, 600), mk('h1', 2000, 660), mk('h2', 3000, 630)];
  const tall = buildPlotModel(rides, 300);
  const short = buildPlotModel(rides, 300, 110);
  assert(tall.plotH === 220 && short.plotH === 110, `plotH ${tall.plotH} / ${short.plotH}`);
  for (let i = 0; i < 3; i++) assert(Math.abs(short.points[i].y * 2 - tall.points[i].y) < 1e-9, `point ${i} y does not scale`);
  assert(short.meanY !== null && tall.meanY !== null && Math.abs(short.meanY * 2 - tall.meanY) < 1e-9, 'meanY does not scale');
  assert(short.yTicks.length === tall.yTicks.length, 'tick count must not depend on height');
  for (let i = 0; i < short.yTicks.length; i++) assert(Math.abs(short.yTicks[i].at * 2 - tall.yTicks[i].at) < 1e-9, `tick ${i} at does not scale`);
  assert(short.points.every((p) => p.y >= 0 && p.y <= 110), 'short points inside the plot');
});

test('resultsmodel: buildPlotModel — 0 ranked results ⇒ empty "no-ranked", no points', () => {
  const none = [mk('e1', 1000, 0, 'estimated'), mk('e2', 2000, 700, 'clean', { ignoredFromRanking: true })];
  const model = buildPlotModel(none, 300);
  assert(model.empty === 'no-ranked', `expected 'no-ranked', got '${model.empty}'`);
  assert(model.points.length === 0, `expected 0 points, got ${model.points.length}`);
  assert(model.windowN === 0, `expected windowN 0, got ${model.windowN}`);
});

test('resultsmodel: buildPlotModel — xTicks ignore the calendar: 200-day, 20-day, 2-day and ~1-year spans all label the occupied end slots with towerDate()', () => {
  // D7/D8 (cycle15 brief 04): x is a slot index, so Monday / month-boundary
  // ticks are gone for good — whatever the span, the only ticks are
  // towerDate(oldest) / towerDate(newest) at the end slots (oldest dropped
  // under X_TICK_MIN_GAP_PX). These spans used to drive the weekly/monthly/
  // year-labelled tick paths; they must now all come out identical in shape.
  const yearDates = [
    new Date(2025, 0, 15), new Date(2025, 1, 15), new Date(2025, 2, 15), new Date(2025, 3, 15),
    new Date(2025, 4, 15), new Date(2025, 5, 15), new Date(2025, 6, 15), new Date(2025, 7, 15),
    new Date(2026, 0, 15),
  ];
  const spans: [string, RideResult[], number][] = [
    ['200 days / 7 rides', ridesOverDays(200, 7), 2],
    ['20 days / 7 rides', ridesOverDays(20, 7), 2],
    // Wed 04 Jun 2025 -> Fri 06 Jun 2025: two adjacent slots, 34.5px apart at 300px.
    ['2 days / 2 rides', [mk('sh0', new Date(2025, 5, 4).getTime(), 600), mk('sh1', new Date(2025, 5, 6).getTime(), 610)], 1],
    ['~1 year / 9 rides', yearDates.map((d, i) => mk(`y${i}`, d.getTime(), 600 + i)), 2],
  ];
  for (const [name, rides, expectedTicks] of spans) {
    const model = buildPlotModel(rides, 300);
    const oldest = model.points[0];
    const newest = model.points[model.points.length - 1];
    assert(model.xTicks.length === expectedTicks, `${name}: expected ${expectedTicks} xTicks, got ${JSON.stringify(model.xTicks)}`);
    const last = model.xTicks[model.xTicks.length - 1];
    assert(Math.abs(last.at - newest.x) < 1e-9, `${name}: expected the newest tick at ${newest.x}, got ${last.at}`);
    assert(last.label === towerDate(newest.startedAtMs), `${name}: expected newest label ${towerDate(newest.startedAtMs)}, got ${last.label}`);
    if (expectedTicks === 2) {
      const first = model.xTicks[0];
      assert(Math.abs(first.at - oldest.x) < 1e-9, `${name}: expected the oldest tick at ${oldest.x}, got ${first.at}`);
      assert(first.label === towerDate(oldest.startedAtMs), `${name}: expected oldest label ${towerDate(oldest.startedAtMs)}, got ${first.label}`);
      assert(first.at + X_TICK_MIN_GAP_PX <= last.at, `${name}: two ticks must be >= X_TICK_MIN_GAP_PX apart, got ${last.at - first.at}`);
    }
  }
});
