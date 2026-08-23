/**
 * Elevation-outlier suite (cycle 023 fix 3) — pure-maths suite for
 * elevationOutlier.ts. No expo/location involved: this is the exact function
 * location/index.ts calls per fix, so a regression here IS a regression in
 * what gets flagged (never mutated — D-023) on-device.
 */
import { assert, test } from './lib.ts';
import { ELEVATION_OUTLIER_RATE_MPS, checkElevationOutlier } from '../src/location/elevationOutlier.ts';

test('elevationOutlier: the three cycle-023-observed single-second spikes are all flagged', () => {
  for (const deltaM of [10.7, -13.5, 4.9]) {
    const r = checkElevationOutlier(100, 1000, 100 + deltaM, 2000);
    assert(r !== null, `deltaM=${deltaM}: no result`);
    assert(r!.isOutlier, `deltaM=${deltaM}: not flagged as an outlier (rate ${r!.rateMps} m/s)`);
    assert(Math.abs(r!.rateMps - Math.abs(deltaM)) < 1e-9, `deltaM=${deltaM}: rate ${r!.rateMps} != |delta| for a 1 s gap`);
  }
});

test('elevationOutlier: the "must catch 10+ m/s" floor holds regardless of the exact constant chosen', () => {
  assert(ELEVATION_OUTLIER_RATE_MPS < 10, `threshold ${ELEVATION_OUTLIER_RATE_MPS} m/s would miss a 10 m/s spike`);
  const r = checkElevationOutlier(0, 0, 10, 1000);
  assert(r !== null && r.isOutlier, 'a 10 m/s single-second spike was not flagged');
});

test('elevationOutlier: a plausible short climb at speed is never flagged', () => {
  // ~1.4 m/s vertical: 25 km/h (6.9 m/s) up a 20% grade over 3 s
  const r = checkElevationOutlier(50, 0, 50 + 1.4 * 3, 3000);
  assert(r !== null && !r.isOutlier, `plausible climb flagged: rate ${r?.rateMps} m/s`);
});

test('elevationOutlier: rate is delta over elapsed time — a big change over a long gap is not flagged', () => {
  // 30 m change but over a 60 s GPS outage: 0.5 m/s, not noise
  const r = checkElevationOutlier(100, 0, 130, 60000);
  assert(r !== null && !r.isOutlier, `long-gap elevation change wrongly flagged: rate ${r?.rateMps} m/s`);
});

test('elevationOutlier: non-positive or non-finite elapsed time yields no verdict (never divide-by-zero garbage)', () => {
  assert(checkElevationOutlier(10, 1000, 20, 1000) === null, 'zero dt must return null, not Infinity');
  assert(checkElevationOutlier(10, 2000, 20, 1000) === null, 'negative dt (out-of-order fixes) must return null');
});

test('elevationOutlier: non-finite elevation inputs yield no verdict', () => {
  assert(checkElevationOutlier(NaN, 0, 10, 1000) === null, 'NaN prevEle must return null');
  assert(checkElevationOutlier(10, 0, Infinity, 1000) === null, 'non-finite ele must return null');
});

test('elevationOutlier: a custom threshold is honoured', () => {
  const r = checkElevationOutlier(0, 0, 3, 1000, 2);
  assert(r !== null && r.isOutlier, 'a 3 m/s rate against a threshold of 2 must be flagged');
  const r2 = checkElevationOutlier(0, 0, 3, 1000, 5);
  assert(r2 !== null && !r2.isOutlier, 'a 3 m/s rate against a threshold of 5 must not be flagged');
});
