/**
 * WP-I (map half) suite — gateAdjustMapModel.ts is pure, no react-native, no
 * JSON imports (same discipline as routeasset_runtime_suite.ts). 12 tests per
 * the brief's §4 test plan:
 *  1. refit is a tight, inset fit.
 *  2. refit preserves shape (a pure similarity transform).
 *  3. refit re-projects gates.
 *  4. frame is per-ref, decimated, and ignores its own gates.
 *  5. segments chain end-to-end and sum to the polyline length.
 *  6. straight route: marks slide along the line, ticks perpendicular.
 *  7. the regression test for "not the straight render" — a nudge turns the corner.
 *  8. tick heading follows the road, no NaN.
 *  9. ends and out-of-range chainages are safe (clamped).
 *  10. min tick length (screen-pixel floor + selected factor + short-route case).
 *  11. the pad and the map agree — one chainage, one point.
 *  12. a degenerate (zero-length) ref is safe.
 *
 * Scrub-gesture tests (§3.5, S1-S4) are NOT included — that half is designed
 * but not authorized for this Execute pass (Nathan's Q2 answer,
 * QUESTIONS-FOR-NATHAN2.md: "keep just the +-pad for now").
 */
import { assert, test } from './lib.ts';
import type { RefLine } from '../core/src/index.ts';
import { buildRuntimeRouteAsset, pointAtChainage } from '../src/ui/routeAssetRuntime.ts';
import { metresPerPixel, projectToPixel, type RouteAsset } from '../src/ui/routeMapMath.ts';
import { clampNudge } from '../src/ui/gateAdjustModel.ts';
import {
  CARD_TICK_MIN_PX, CARD_TICK_SELECTED_FACTOR,
  buildCardMapFrame, gateMarkPx, pathSegmentsPx, refitAssetToBox,
} from '../src/ui/gateAdjustMapModel.ts';

// --------------------------------------------------------------- fixtures

/** Same fixture as routeasset_runtime_suite.ts: a degenerate "straight
 * north" reference line — rx constant (0), ry increasing. nVerts vertices,
 * stepM apart. Suites do not share fixtures today (§4 of the brief). */
function straightNorthRef(nVerts: number, stepM: number, lat0 = 50.85, lon0 = 4.68): RefLine {
  const rx = new Float64Array(nVerts);
  const ry = new Float64Array(nVerts);
  const ch = new Float64Array(nVerts);
  for (let i = 0; i < nVerts; i++) {
    rx[i] = 0;
    ry[i] = i * stepM;
    ch[i] = i * stepM;
  }
  return { rx, ry, ch, lat0, lon0, length: ch[nVerts - 1] };
}

/** An "L": 2000 m due east (rx 0->2000, ry 0), then 1000 m due north
 * (rx 2000, ry 0->1000), 5 m steps — 601 vertices, length 3000. The
 * regression fixture for "not the straight render" (test 7). */
function lShapedRef(lat0 = 50.85, lon0 = 4.68): RefLine {
  const step = 5;
  const eastN = 401; // chainage 0..2000, inclusive, step 5
  const northN = 200; // additional chainage 2005..3000, step 5
  const total = eastN + northN; // 601
  const rx = new Float64Array(total);
  const ry = new Float64Array(total);
  const ch = new Float64Array(total);
  for (let i = 0; i < eastN; i++) {
    rx[i] = i * step;
    ry[i] = 0;
    ch[i] = i * step;
  }
  for (let j = 1; j <= northN; j++) {
    const i = eastN - 1 + j;
    rx[i] = 2000;
    ry[i] = j * step;
    ch[i] = 2000 + j * step;
  }
  return { rx, ry, ch, lat0, lon0, length: ch[total - 1] };
}

const W = 320;
const H = 200;
const PAD = 22;

// ---------------------------------------------------------- 1. refit fit

test('gateAdjustMap: refit is a tight, inset fit', () => {
  const ref = lShapedRef();
  const frame = buildCardMapFrame(ref, W, H);
  let minPx = Infinity, maxPx = -Infinity, minPy = Infinity, maxPy = -Infinity;
  for (const [lat, lon] of frame.path ?? []) {
    const { px, py } = projectToPixel(frame, lat, lon);
    minPx = Math.min(minPx, px); maxPx = Math.max(maxPx, px);
    minPy = Math.min(minPy, py); maxPy = Math.max(maxPy, py);
  }
  assert(minPx >= PAD - 1e-6 && maxPx <= W - PAD + 1e-6, `x out of inset bounds: [${minPx}, ${maxPx}]`);
  assert(minPy >= PAD - 1e-6 && maxPy <= H - PAD + 1e-6, `y out of inset bounds: [${minPy}, ${maxPy}]`);
  // the L is 2 km wide x 1 km tall, wider (relative to the 320x200-22pad box)
  // than it is tall — x is the constraining axis and should touch both insets.
  assert(Math.abs(minPx - PAD) < 1e-6 && Math.abs(maxPx - (W - PAD)) < 1e-6,
    `x should be the constraining axis for this L shape, got [${minPx}, ${maxPx}]`);
  // the non-constraining axis is centred: min+max ≈ the box dimension
  assert(Math.abs((minPy + maxPy) - H) < 1e-6, `y should be centred (min+max≈H), got ${minPy + maxPy}`);
});

// ---------------------------------------------------------- 2. refit preserves shape

test('gateAdjustMap: refit preserves shape (a pure similarity transform)', () => {
  const ref = lShapedRef();
  const big = buildRuntimeRouteAsset(ref, [0, ref.length], 'gate-card');
  const frame = refitAssetToBox(big, W, H);
  const n = big.path?.length ?? 0;
  assert(n > 200, `need at least 201 decimated vertices for this test, got ${n}`);
  const dist = (asset: RouteAsset, i: number, j: number) => {
    const [lat1, lon1] = asset.path![i];
    const [lat2, lon2] = asset.path![j];
    const p1 = projectToPixel(asset, lat1, lon1);
    const p2 = projectToPixel(asset, lat2, lon2);
    return Math.hypot(p2.px - p1.px, p2.py - p1.py);
  };
  const ratioBig = dist(big, 0, 100) / dist(big, 100, 200);
  const ratioFrame = dist(frame, 0, 100) / dist(frame, 100, 200);
  assert(Math.abs(ratioBig - ratioFrame) < 1e-9, `ratio mismatch: ${ratioBig} (900x1400) vs ${ratioFrame} (refit)`);
});

// ---------------------------------------------------------- 3. refit re-projects gates

test('gateAdjustMap: refitAssetToBox re-projects gates using the refit frame', () => {
  const ref = lShapedRef();
  const big = buildRuntimeRouteAsset(ref, [0, 1500, 3000], 'gate-card');
  const refit = refitAssetToBox(big, W, H);
  assert(refit.gates.length === 3, `expected 3 gates, got ${refit.gates.length}`);
  for (const g of refit.gates) {
    const { px, py } = projectToPixel(refit, g.lat, g.lon);
    assert(Math.abs(g.px - px) < 1e-9 && Math.abs(g.py - py) < 1e-9,
      `gate ${g.name} px/py must match projectToPixel under the refit frame`);
  }
});

// ---------------------------------------------------------- 4. per-ref, decimated, ignores own gates

test('gateAdjustMap: buildCardMapFrame decimates the path and only carries START/FINISH gates', () => {
  const ref = straightNorthRef(1000, 5); // 4995 m
  const frame = buildCardMapFrame(ref, W, H);
  const len = frame.path?.length ?? 0;
  assert(len >= 150 && len <= 200, `path length ${len} out of the expected ~180-vertex range`);
  assert(frame.gates.length === 2, `expected 2 gates (START/FINISH only), got ${frame.gates.length}`);
});

// ---------------------------------------------------------- 5. segments chain

test('gateAdjustMap: pathSegmentsPx chains end-to-end and sums to the polyline length', () => {
  const ref = lShapedRef();
  const frame = buildCardMapFrame(ref, W, H);
  const segs = pathSegmentsPx(frame);
  const n = frame.path?.length ?? 0;
  assert(segs.length === n - 1, `expected ${n - 1} segments, got ${segs.length}`);
  let sumLen = 0;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    sumLen += s.len;
    if (i + 1 < segs.length) {
      const rad = (s.angDeg * Math.PI) / 180;
      const ex = s.x0 + s.len * Math.cos(rad);
      const ey = s.y0 + s.len * Math.sin(rad);
      const next = segs[i + 1];
      assert(Math.abs(ex - next.x0) < 1e-6 && Math.abs(ey - next.y0) < 1e-6,
        `segment ${i} end must equal segment ${i + 1} start, got [${ex},${ey}] vs [${next.x0},${next.y0}]`);
    }
  }
  let polylineLen = 0;
  for (let i = 0; i + 1 < n; i++) {
    const a = projectToPixel(frame, frame.path![i][0], frame.path![i][1]);
    const b = projectToPixel(frame, frame.path![i + 1][0], frame.path![i + 1][1]);
    polylineLen += Math.hypot(b.px - a.px, b.py - a.py);
  }
  assert(Math.abs(sumLen - polylineLen) < 1e-6, `sum of segment lengths ${sumLen} must equal polyline length ${polylineLen}`);
});

// ---------------------------------------------------------- 6. straight route

test('gateAdjustMap: straight route — marks slide along the line, north is up, ticks are perpendicular', () => {
  const ref = straightNorthRef(1000, 5); // 4995 m
  const frame = buildCardMapFrame(ref, W, H);
  const chainages = [500, 1000, 2500, 4000];
  const marks = chainages.map((s) => gateMarkPx(ref, frame, s));
  for (const m of marks) {
    assert(Math.abs(m.cx - W / 2) < 1e-6, `degenerate x-axis should centre at w/2=${W / 2}, got ${m.cx}`);
  }
  for (let i = 1; i < marks.length; i++) {
    assert(marks[i].cy < marks[i - 1].cy, `cy must strictly decrease as chainage increases (north is up): ${marks[i - 1].cy} -> ${marks[i].cy}`);
  }
  for (const m of marks) {
    const a = ((m.angDeg % 180) + 180) % 180;
    assert(a < 1e-3 || Math.abs(a - 180) < 1e-3, `tick should be horizontal across a vertical road, got angDeg=${m.angDeg}`);
    const midx = m.x0 + (m.len / 2) * Math.cos((m.angDeg * Math.PI) / 180);
    const midy = m.y0 + (m.len / 2) * Math.sin((m.angDeg * Math.PI) / 180);
    assert(Math.abs(midx - m.cx) < 1e-6 && Math.abs(midy - m.cy) < 1e-6,
      `tick midpoint must equal the mark centre, got [${midx},${midy}] vs [${m.cx},${m.cy}]`);
  }
});

// ---------------------------------------------------------- 7. the corner regression test

test('gateAdjustMap: a nudge turns the corner — the regression test for "not the straight render"', () => {
  const ref = lShapedRef();
  const frame = buildCardMapFrame(ref, W, H);
  const s = [1900, 1950, 2000, 2050, 2100];
  const marks = s.map((c) => gateMarkPx(ref, frame, c));
  // east leg (1900 -> 2000): cx strictly increases, cy constant
  assert(marks[1].cx > marks[0].cx && marks[2].cx > marks[1].cx, 'cx must strictly increase along the east leg');
  assert(Math.abs(marks[0].cy - marks[1].cy) < 1e-6 && Math.abs(marks[1].cy - marks[2].cy) < 1e-6,
    'cy must stay constant along the east leg');
  // north leg (2000 -> 2100): cy strictly decreases (north is up), cx constant
  assert(marks[3].cy < marks[2].cy && marks[4].cy < marks[3].cy, 'cy must strictly decrease along the north leg');
  assert(Math.abs(marks[2].cx - marks[3].cx) < 1e-6 && Math.abs(marks[3].cx - marks[4].cx) < 1e-6,
    'cx must stay constant along the north leg');
});

// ---------------------------------------------------------- 8. tick heading follows the road

test('gateAdjustMap: tick heading follows the road, no NaN anywhere', () => {
  const ref = lShapedRef();
  const frame = buildCardMapFrame(ref, W, H);

  const east = gateMarkPx(ref, frame, 1000);
  assert(Math.abs(Math.abs(east.angDeg) - 90) < 1, `east-leg tick should be ~vertical (|angDeg|≈90), got ${east.angDeg}`);

  const north = gateMarkPx(ref, frame, 2500);
  const nA = ((north.angDeg % 180) + 180) % 180;
  assert(nA < 1 || Math.abs(nA - 180) < 1, `north-leg tick should be ~horizontal (angDeg≈0/180), got ${north.angDeg}`);

  const corner = gateMarkPx(ref, frame, 2000);
  const cA = ((corner.angDeg % 180) + 180) % 180;
  assert(Math.abs(cA - 45) < 2, `corner tick should be ~45° mod 180 (NE heading, perpendicular), got ${corner.angDeg}`);

  for (const m of [east, north, corner]) {
    assert(
      Number.isFinite(m.cx) && Number.isFinite(m.cy) && Number.isFinite(m.angDeg) && Number.isFinite(m.len),
      `no NaN allowed, got ${JSON.stringify(m)}`,
    );
  }
});

// ---------------------------------------------------------- 9. ends and out-of-range chainages

test('gateAdjustMap: end and out-of-range chainages are safe (clamped, finite, min tick length)', () => {
  const ref = straightNorthRef(1000, 5); // 4995 m
  const frame = buildCardMapFrame(ref, W, H);
  const L = ref.length;
  const atStart = gateMarkPx(ref, frame, 0);
  const atEnd = gateMarkPx(ref, frame, L);
  const belowStart = gateMarkPx(ref, frame, -50);
  const aboveEnd = gateMarkPx(ref, frame, L + 50);

  for (const m of [atStart, atEnd, belowStart, aboveEnd]) {
    assert(
      Number.isFinite(m.cx) && Number.isFinite(m.cy) && Number.isFinite(m.angDeg) && Number.isFinite(m.len),
      `all values must be finite, got ${JSON.stringify(m)}`,
    );
    assert(m.len >= CARD_TICK_MIN_PX - 1e-6, `tick length must be at least CARD_TICK_MIN_PX, got ${m.len}`);
  }
  assert(Math.abs(belowStart.cx - atStart.cx) < 1e-6 && Math.abs(belowStart.cy - atStart.cy) < 1e-6,
    'a negative chainage must clamp to the start mark');
  assert(Math.abs(aboveEnd.cx - atEnd.cx) < 1e-6 && Math.abs(aboveEnd.cy - atEnd.cy) < 1e-6,
    'a beyond-length chainage must clamp to the end mark');
});

// ---------------------------------------------------------- 10. min tick length

test('gateAdjustMap: tick length has a screen-pixel floor, the selected factor scales it, short routes exceed it', () => {
  const longRef = straightNorthRef(1000, 5); // 4995 m in a 200 px tall box
  const longFrame = buildCardMapFrame(longRef, W, H);
  const m = gateMarkPx(longRef, longFrame, 2000);
  const mSel = gateMarkPx(longRef, longFrame, 2000, { factor: CARD_TICK_SELECTED_FACTOR });
  assert(Math.abs(m.len - CARD_TICK_MIN_PX) < 1e-6, `a long route's tick should hit the min-px floor, got ${m.len}`);
  assert(Math.abs(mSel.len - CARD_TICK_MIN_PX * CARD_TICK_SELECTED_FACTOR) < 1e-6,
    `the selected factor should scale the floored tick exactly, got ${mSel.len}`);

  const shortRef = straightNorthRef(41, 5); // 200 m
  const shortFrame = buildCardMapFrame(shortRef, W, H);
  const sm = gateMarkPx(shortRef, shortFrame, 100);
  const [lat] = pointAtChainage(shortRef, 100);
  const expected = 30 / metresPerPixel(shortFrame, lat);
  assert(sm.len > CARD_TICK_MIN_PX, `a short route's tick should exceed the min-px floor, got ${sm.len}`);
  assert(Math.abs(sm.len - expected) < 1e-6, `expected len≈${expected}, got ${sm.len}`);
});

// ---------------------------------------------------------- 11. the pad and the map agree

test('gateAdjustMap: the pad and the map agree — one chainage, one point', () => {
  const ref = straightNorthRef(801, 5); // length exactly 4000
  assert(Math.abs(ref.length - 4000) < 1e-9, `fixture precondition: length must be exactly 4000, got ${ref.length}`);
  const frame = buildCardMapFrame(ref, W, H);
  const base = [40, 1000, 2000, 3000, 3960];
  const L = 4000;
  const next = clampNudge(base, 2, 50, L);
  assert(next === 2050, `expected the +50 nudge to land on 2050, got ${next}`);
  const mark = gateMarkPx(ref, frame, next);
  const [lat, lon] = pointAtChainage(ref, 2050);
  const p = projectToPixel(frame, lat, lon);
  assert(Math.abs(mark.cx - p.px) < 1e-6 && Math.abs(mark.cy - p.py) < 1e-6,
    `gateMarkPx centre must equal projectToPixel at the same chainage, got [${mark.cx},${mark.cy}] vs [${p.px},${p.py}]`);
});

// ---------------------------------------------------------- 12. degenerate ref

test('gateAdjustMap: a zero-length ref is safe (no throw, no NaN, heading falls back to east)', () => {
  const ref: RefLine = {
    rx: new Float64Array([0, 0]), ry: new Float64Array([0, 0]), ch: new Float64Array([0, 0]),
    lat0: 50.85, lon0: 4.68, length: 0,
  };
  let frame: RouteAsset | null = null;
  try {
    frame = buildCardMapFrame(ref, W, H);
  } catch (e) {
    assert(false, `buildCardMapFrame must not throw on a zero-length ref, got ${e}`);
  }
  assert(frame !== null, 'frame must be built');
  const segs = pathSegmentsPx(frame!);
  assert(segs.length === 0 || segs.every((sg) => sg.len < 1),
    'segments on a zero-length ref must be empty or effectively zero-length');
  const mark = gateMarkPx(ref, frame!, 0);
  assert(
    Number.isFinite(mark.cx) && Number.isFinite(mark.cy) && Number.isFinite(mark.angDeg) && Number.isFinite(mark.len),
    `all values must stay finite on a degenerate ref, got ${JSON.stringify(mark)}`,
  );
});
