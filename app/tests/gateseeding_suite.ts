/** QA suite for app/src/store/gateSeeding.ts and app/src/ui/gateAdjustModel.ts
 * (OPEN-ITEMS item 3, save-flow package, Part B). Both are pure — no fs, no
 * Date.now() — so this suite is plain assertions, no fixtures. */
import { assert, test } from './lib.ts';
import { OVERLAP_CLEAR_M, seedGateChainages } from '../src/store/gateSeeding.ts';
import { cumdist, overlapChainages, resample, type RefLine } from '../core/src/index.ts';
import { clampNudge, gateName, isAdjustable, fmtChainage, fmtPct, fmtMoved, nudgeDeltaM, nextGateOnTap } from '../src/ui/gateAdjustModel.ts';

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test('gateSeeding: no stops seeds pure quantiles at 1/25/50/75/99%', () => {
  const g = seedGateChainages(4000, []);
  const expected = [40, 1000, 2000, 3000, 3960];
  assert(g.length === 5, 'exactly 5 gates');
  assert(g.every((v, i) => near(v, expected[i])), `got ${g}, want ${expected}`);
  for (let i = 1; i < g.length; i++) assert(g[i] > g[i - 1], 'strictly increasing');
});

test('gateSeeding: a stop on a quantile nudges that gate 150 m clear inside the window', () => {
  const g = seedGateChainages(4000, [2000]);
  const expected = [40, 1000, 1850, 3000, 3960];
  assert(g.every((v, i) => near(v, expected[i])), `got ${g}, want ${expected}`);
});

test('gateSeeding: a fully blocked window falls back to the exact quantile (R&S §3 step 6)', () => {
  const stops: number[] = [];
  for (let s = 1600; s <= 2400; s += 100) stops.push(s);
  const g = seedGateChainages(4000, stops);
  assert(near(g[2], 2000), `blocked window keeps the quantile, got ${g[2]}`);
  assert(near(g[1], 1000) && near(g[3], 3000), 'neighbouring gates unaffected');
});

test('gateSeeding: short routes (<600 m) seed pure quantiles, no snapping', () => {
  const g = seedGateChainages(500, [125]);
  const expected = [5, 125, 250, 375, 495];
  assert(g.every((v, i) => near(v, expected[i])), `got ${g}, want ${expected}`);
});

test('gateSeeding: converging snaps revert to pure quantiles and stay strictly increasing', () => {
  const g = seedGateChainages(700, [175, 350]);
  const expected = [7, 175, 350, 525, 693];
  assert(g.every((v, i) => near(v, expected[i])), `got ${g}, want ${expected}`);
  for (let i = 1; i < g.length; i++) assert(g[i] > g[i - 1], 'strictly increasing');
});

test('gateAdjust: clampNudge moves by ±10/±50 and clamps 50 m off both neighbours', () => {
  const base = [40, 1000, 2000, 3000, 3960];
  assert(clampNudge(base, 2, 50, 4000) === 2050, 'gate index 2 +50');
  assert(clampNudge(base, 2, -10, 4000) === 1990, 'gate index 2 -10');
  assert(clampNudge(base, 1, -5000, 4000) === 90, 'clamped to lo = neighbour + 50');
  assert(clampNudge(base, 1, 5000, 4000) === 1950, 'clamped to hi = neighbour - 50');
});

test('gateAdjust: START and FINISH nudge like any gate, clamped to the line ends and the 50 m gap', () => {
  const base = [40, 1000, 2000, 3000, 3960];
  assert(isAdjustable(0, 5) === true, 'START is adjustable');
  assert(isAdjustable(4, 5) === true, 'FINISH is adjustable');
  assert(isAdjustable(5, 5) === false, 'out-of-range index is not adjustable');
  assert(clampNudge(base, 0, 500, 4000) === 40 + 500, 'START nudges up, clear of the line start');
  assert(clampNudge(base, 0, -500, 4000) === 0, 'START clamps at chainage 0');
  assert(clampNudge(base, 0, 5000, 4000) === 950, 'START clamps 50 m clear of G1 (1000 - 50)');
  assert(clampNudge(base, 4, 500, 4000) === 4000, 'FINISH clamps at the route length');
  assert(clampNudge(base, 4, -5000, 4000) === 3050, 'FINISH clamps 50 m clear of G3 (3000 + 50)');
});

test('gateAdjust: gateName maps START/G1/G2/G3/FINISH, fmtChainage groups thousands, fmtPct reads percent of route', () => {
  assert(gateName(0, 5) === 'START', 'index 0 is START');
  assert(gateName(1, 5) === 'G1', 'index 1 is G1');
  assert(gateName(3, 5) === 'G3', 'index 3 is G3');
  assert(gateName(4, 5) === 'FINISH', 'index 4 is FINISH');
  assert(fmtChainage(1842) === '1 842 m', `got ${fmtChainage(1842)}`);
  assert(fmtChainage(75) === '75 m', `got ${fmtChainage(75)}`);
  assert(fmtPct(1488, 4000) === '37.2 %', `got ${fmtPct(1488, 4000)}`);
  assert(fmtPct(0, 4000) === '0.0 %', `got ${fmtPct(0, 4000)}`);
});

test('gateAdjust: nudgeDeltaM turns a route-length percentage into metres (WP-I §3.3b, Q2)', () => {
  assert(near(nudgeDeltaM(0.01, 4000), 40), '1% of a 4000 m route is 40 m');
  assert(near(nudgeDeltaM(0.001, 4000), 4), '0.1% of a 4000 m route is 4 m');
});

// ------------------------------------------------ virgin-cycle26 brief 03
function synRef(waypoints: [number, number][]): RefLine {
  const { x, y } = resample(waypoints.map((w) => w[0]), waypoints.map((w) => w[1]), 5);
  const ch = cumdist(x, y);
  return { rx: x, ry: y, ch, lat0: 0, lon0: 0, length: ch[ch.length - 1] };
}

test('virgin-cycle26 03: overlapChainages is empty on a single-pass line and marks both copies of a retraced street', () => {
  assert(overlapChainages(synRef([[0, 0], [3005, 0]])).length === 0, 'a straight line has no retraced ground');
  // Out 300 m along y = 0, around a block, back along y = -4 (the other side of the street).
  const ob = synRef([[0, 0], [300, 0], [300, 400], [700, 400], [700, -4], [0, -4]]);
  const ov = overlapChainages(ob);
  assert(ov.length > 0, 'an out-and-back must report retraced ground');
  assert(ov.every((v) => v <= 345 || v >= 1860), `every overlapped chainage must be on the street (≤ 345 or ≥ 1860), got ${ov.filter((v) => v > 345 && v < 1860)}`);
  assert(ov.some((v) => v <= 300) && ov.some((v) => v >= 1900), 'both the outbound and the return copy must be reported');
  for (let i = 1; i < ov.length; i++) assert(ov[i] > ov[i - 1], 'ascending');
  // A closed loop: only its closing metres count (start and end vertices meet).
  const loop = synRef([[0, 0], [1000, 0], [1000, 600], [0, 600], [0, 0]]);
  const lv = overlapChainages(loop);
  assert(lv.length > 0 && lv.every((v) => v <= 45 || v >= 3150), `loop closure only, got ${lv.filter((v) => v > 45 && v < 3150)}`);
});

test('virgin-cycle26 03: seedGateChainages slides sector gates off retraced ground within the window and keeps START/FINISH', () => {
  // 500 m street out, 600 m block, 500 m back: L = 1600, retraced [0, 500] and [1100, 1600].
  const ov: number[] = [];
  for (let c = 0; c <= 500; c += 5) ov.push(c);
  for (let c = 1100; c <= 1600; c += 5) ov.push(c);
  const g = seedGateChainages(1600, [], ov);
  const expected = [16, 560, 800, 1040, 1584];
  assert(g.every((v, i) => near(v, expected[i])), `got ${g}, want ${expected}`);
  for (let i = 1; i < g.length; i++) assert(g[i] > g[i - 1], 'strictly increasing');
  assert(near(g[0], 16) && near(g[4], 1584), 'START/FINISH never move');
  assert(g.slice(1, 4).every((v) => ov.every((o) => Math.abs(v - o) >= OVERLAP_CLEAR_M)), 'every sector gate is OVERLAP_CLEAR_M clear of retraced ground');
});

test('virgin-cycle26 03: a fully retraced line keeps the quantiles; two-argument calls are unchanged', () => {
  const all: number[] = [];
  for (let c = 0; c <= 2000; c += 5) all.push(c);
  const g = seedGateChainages(2000, [], all);
  const expected = [20, 500, 1000, 1500, 1980];
  assert(g.every((v, i) => near(v, expected[i])), `blocked window must keep the quantiles: got ${g}, want ${expected}`);
  const a = seedGateChainages(4000, [2000]);
  const b = seedGateChainages(4000, [2000], []);
  assert(a.every((v, i) => near(v, b[i])), 'an empty overlap list changes nothing');
  const c = seedGateChainages(4000, [], []);
  assert(c.every((v, i) => near(v, [40, 1000, 2000, 3000, 3960][i])), 'no stops, no overlap: pure quantiles');
});

test('virgin-cycle26 04: nextGateOnTap — single hit is the old behaviour, a stack cycles, unknown names are ignored', () => {
  assert(nextGateOnTap([2], null) === 2, 'single hit, nothing selected');
  assert(nextGateOnTap([2], 2) === 2, 'single hit, same selected (the card toggles it off)');
  assert(nextGateOnTap([2], 0) === 2, 'single hit, another selected');
  assert(nextGateOnTap([4, 0], null) === 0, 'stack, nothing selected: lowest index');
  assert(nextGateOnTap([4, 0], 0) === 4, 'stack, first selected: next');
  assert(nextGateOnTap([4, 0], 4) === 0, 'stack, last selected: wraps');
  assert(nextGateOnTap([4, 0], 2) === 0, 'stack, a gate outside the stack selected: first of the stack');
  assert(nextGateOnTap([-1, 3, 3, -1], null) === 3, 'duplicates and unknown names (-1) are dropped');
  assert(nextGateOnTap([-1], null) === null && nextGateOnTap([], 1) === null, 'nothing tappable: null');
});

test('virgin-cycle28 02: fmtMoved reads metres moved since the card opened', () => {
  assert(fmtMoved(1000, 1000) === '', 'unmoved: empty');
  assert(fmtMoved(1000.4, 1000) === '', 'rounds to 0: empty');
  assert(fmtMoved(1036, 1000) === '+36 m', `got ${fmtMoved(1036, 1000)}`);
  assert(fmtMoved(996, 1000) === '−4 m', `got ${fmtMoved(996, 1000)}`);
  assert(fmtMoved(3234, 2000) === '+1 234 m', `got ${fmtMoved(3234, 2000)}`);
});
