/**
 * LAUNCH ANIMATION (BRAND.md ratified motion, Nathan 2026-08-17) — pure-maths
 * suite for `launchChoreo.ts`. No RN/Animated involved: these are the exact
 * numbers `launchAnimation.tsx` drives its Animated.Values with, so a
 * regression here IS a regression in the on-device choreography.
 */
import { assert, test } from './lib.ts';
import {
  RING_MS, SLASH_DELAY_MS, SLASH_MS, FADE_MS, TOTAL_BEFORE_FADE_MS, TOTAL_MS,
  REDUCED_MOTION_HOLD_MS, RING_BEZIER, RING_THICKNESS_RATIO, SLASH_LEN_RATIO,
  SLASH_ANGLE_DEG, ringSweepDeg, hemisphereAngles, slashProgress, markGeometry,
} from '../src/ui/launchChoreo.ts';

test('launchChoreo: timing constants match the ratified storyboard', () => {
  assert(RING_MS === 1400, `RING_MS expected 1400, got ${RING_MS}`);
  assert(SLASH_DELAY_MS === 1150, `SLASH_DELAY_MS expected 1150, got ${SLASH_DELAY_MS}`);
  assert(SLASH_MS === 500, `SLASH_MS expected 500, got ${SLASH_MS}`);
  assert(FADE_MS === 250, `FADE_MS expected 250, got ${FADE_MS}`);
  assert(TOTAL_BEFORE_FADE_MS === 1650, `total-before-fade expected 1650, got ${TOTAL_BEFORE_FADE_MS}`);
  assert(TOTAL_MS === 1900, `TOTAL_MS expected 1900, got ${TOTAL_MS}`);
  assert(RING_BEZIER.length === 4, 'RING_BEZIER must be a 4-tuple');
  const [x1, y1, x2, y2] = RING_BEZIER;
  assert(x1 === 0.2 && y1 === 0.7 && x2 === 0.2 && y2 === 1, `RING_BEZIER mismatch: ${RING_BEZIER}`);
});

test('launchChoreo: ringSweepDeg is monotonic and covers 0 -> 360 clockwise', () => {
  let prev = -1;
  for (let i = 0; i <= 20; i++) {
    const p = i / 20;
    const deg = ringSweepDeg(p);
    assert(deg >= prev, `ringSweepDeg not monotonic at p=${p}: ${deg} < ${prev}`);
    assert(deg >= 0 && deg <= 360, `ringSweepDeg out of [0,360] at p=${p}: ${deg}`);
    prev = deg;
  }
  assert(ringSweepDeg(0) === 0, `ringSweepDeg(0) expected 0, got ${ringSweepDeg(0)}`);
  assert(ringSweepDeg(1) === 360, `ringSweepDeg(1) expected 360, got ${ringSweepDeg(1)}`);
  // clamps outside [0,1] rather than overshooting/undershooting the sweep
  assert(ringSweepDeg(-0.5) === 0, 'ringSweepDeg must clamp below 0');
  assert(ringSweepDeg(1.5) === 360, 'ringSweepDeg must clamp above 1');
});

test('launchChoreo: hemisphere handoff at p=0.5 has no gap or overlap', () => {
  const at0 = hemisphereAngles(0);
  assert(at0.rightDeg === -180, `right hemisphere must start hidden (-180) at p=0, got ${at0.rightDeg}`);
  const at5 = hemisphereAngles(0.5);
  assert(at5.rightDeg === 0, `right hemisphere must complete (0deg) exactly at p=0.5, got ${at5.rightDeg}`);
  assert(at5.leftDeg === -180, `left hemisphere must still be hidden (-180) exactly at p=0.5, got ${at5.leftDeg}`);
  const at1 = hemisphereAngles(1);
  assert(at1.leftDeg === 0, `left hemisphere must complete (0deg) at p=1, got ${at1.leftDeg}`);
  // right hemisphere is fully clamped for the whole second half — no double-draw
  const at75 = hemisphereAngles(0.75);
  assert(at75.rightDeg === 0, `right hemisphere must stay clamped at 0deg past p=0.5, got ${at75.rightDeg}`);
  // left hemisphere is fully clamped for the whole first half — no early draw
  const at25 = hemisphereAngles(0.25);
  assert(at25.leftDeg === -180, `left hemisphere must stay clamped at -180deg before p=0.5, got ${at25.leftDeg}`);
});

test('launchChoreo: slash stays at 0 until the ring is >=82% through its own duration', () => {
  const threshold = SLASH_DELAY_MS / RING_MS;
  assert(threshold >= 0.82, `SLASH_DELAY_MS/RING_MS expected >=0.82, got ${threshold}`);
  assert(slashProgress(0) === 0, 'slash must be 0 at t=0');
  assert(slashProgress(SLASH_DELAY_MS - 1) === 0, 'slash must be 0 just before SLASH_DELAY_MS');
  assert(slashProgress(SLASH_DELAY_MS) === 0, 'slash must still be 0 exactly at SLASH_DELAY_MS');
});

test('launchChoreo: slash draws over [1150,1650] and reaches exactly 1 at 1650ms', () => {
  assert(slashProgress(SLASH_DELAY_MS + 1) > 0, 'slash must start moving just after SLASH_DELAY_MS');
  let prev = 0;
  for (let t = SLASH_DELAY_MS; t <= SLASH_DELAY_MS + SLASH_MS; t += 25) {
    const v = slashProgress(t);
    assert(v >= prev - 1e-9, `slashProgress not monotonic at t=${t}: ${v} < ${prev}`);
    assert(v >= 0 && v <= 1, `slashProgress out of [0,1] at t=${t}: ${v}`);
    prev = v;
  }
  assert(slashProgress(1650) === 1, `slashProgress(1650) expected exactly 1, got ${slashProgress(1650)}`);
  assert(slashProgress(2000) === 1, 'slashProgress must stay clamped at 1 after 1650ms');
});

test('launchChoreo: mark geometry proportions match the SVG (ring 30/266, slash ~0.51, 45deg down-right)', () => {
  assert(Math.abs(RING_THICKNESS_RATIO - 30 / 266) < 1e-9, 'RING_THICKNESS_RATIO must equal 30/266 exactly');
  const size = 266; // = the SVG's own outer diameter, so ratios read back as raw SVG numbers
  const geo = markGeometry(size);
  assert(Math.abs(geo.ringThickness - 30) / 30 < 0.01, `ringThickness expected ~30 (+/-1%), got ${geo.ringThickness}`);
  assert(Math.abs(SLASH_LEN_RATIO - 0.52) < 0.02, `slash length ratio expected ~0.52, got ${SLASH_LEN_RATIO}`);
  assert(Math.abs(geo.slashLen - SLASH_LEN_RATIO * size) < 1e-9, 'slashLen must scale linearly with size');
  assert(geo.slashThickness === geo.ringThickness, 'slash thickness must equal ring thickness (design point 2)');
  assert(Math.abs(SLASH_ANGLE_DEG - 45) < 1e-6, `slash direction expected exactly 45deg, got ${SLASH_ANGLE_DEG}`);
  assert(geo.slashAngleDeg === SLASH_ANGLE_DEG, 'markGeometry must report the same slash angle as the SLASH_ANGLE_DEG constant');
});

test('launchChoreo: mark geometry scales proportionally to an arbitrary container size', () => {
  const small = markGeometry(150);
  const big = markGeometry(300);
  assert(Math.abs(big.ringThickness / small.ringThickness - 2) < 1e-9, 'ringThickness must scale linearly with size');
  assert(Math.abs(big.slashLen / small.slashLen - 2) < 1e-9, 'slashLen must scale linearly with size');
  assert(big.ringDiameter === 300 && small.ringDiameter === 150, 'ringDiameter must equal the requested size');
});

test('launchChoreo: reduced-motion path is a fixed, short constant hold', () => {
  assert(REDUCED_MOTION_HOLD_MS === 300, `REDUCED_MOTION_HOLD_MS expected 300, got ${REDUCED_MOTION_HOLD_MS}`);
  assert(REDUCED_MOTION_HOLD_MS < TOTAL_BEFORE_FADE_MS,
    'reduced-motion hold must be shorter than the full ring+slash choreography it replaces');
});
