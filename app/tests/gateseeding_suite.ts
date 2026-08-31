/** QA suite for app/src/store/gateSeeding.ts and app/src/ui/gateAdjustModel.ts
 * (OPEN-ITEMS item 3, save-flow package, Part B). Both are pure — no fs, no
 * Date.now() — so this suite is plain assertions, no fixtures. */
import { assert, test } from './lib.ts';
import { seedGateChainages } from '../src/store/gateSeeding.ts';
import { clampNudge, gateName, isAdjustable, fmtChainage } from '../src/ui/gateAdjustModel.ts';

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

test('gateAdjust: START and FINISH are locked', () => {
  const base = [40, 1000, 2000, 3000, 3960];
  assert(isAdjustable(0, 5) === false, 'START locked');
  assert(isAdjustable(4, 5) === false, 'FINISH locked');
  assert(clampNudge(base, 0, 500, 4000) === 40, 'START does not move');
  assert(clampNudge(base, 4, -500, 4000) === 3960, 'FINISH does not move');
  assert(isAdjustable(2, 5) === true, 'a middle gate is adjustable');
});

test('gateAdjust: gateName maps START/G1/G2/G3/FINISH and fmtChainage groups thousands', () => {
  assert(gateName(0, 5) === 'START', 'index 0 is START');
  assert(gateName(1, 5) === 'G1', 'index 1 is G1');
  assert(gateName(3, 5) === 'G3', 'index 3 is G3');
  assert(gateName(4, 5) === 'FINISH', 'index 4 is FINISH');
  assert(fmtChainage(1842) === '1 842 m', `got ${fmtChainage(1842)}`);
  assert(fmtChainage(75) === '75 m', `got ${fmtChainage(75)}`);
});
