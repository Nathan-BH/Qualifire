/**
 * QA — `resultsPlotModel.ts` (plotWindow, fitDomain, toneFor, buildPlotModel,
 * windowCaption). Pure; hand-built RideResults. The RESULTS list/board model
 * tests that lived here went with the tab (virgin-cycle25 brief 03).
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { assert, test } from './lib.ts';
import type { RideResult, SectorQuality } from '../src/store/types.ts';

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
  plotWindow, fitDomain, toneFor, buildPlotModel, mean,
  PAD_L, PAD_R, MAX_Y_TICKS, LABEL_COLLISION_PX,
  xAtSlot, slotIndex, PLOT_N, X_TICK_MIN_GAP_PX, windowCaption,
} = await import('../src/ui/resultsPlotModel.ts');
const { WINDOW_N } = await import('../src/ui/colourModel.ts');
const { towerDate } = await import('../src/ui/towerModel.ts');

// ------------------------------------------------------------------ fixture

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
test('resultsmodel: windowCaption wording (plot model, cycle25)', () => {
  assert(windowCaption(10) === 'LAST 10 ACTIVITIES', windowCaption(10));
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
