/**
 * WP-J (breadcrumb trail) suite — trailModel.ts is pure, no native module.
 * Per the brief's §4 Test plan: first-point-always-accepted, the <5m
 * same-reference-array rule, >=5m appends, non-finite input is ignored, the
 * FIFO cap drops the oldest and preserves order, and trailLineFeature's null
 * rule / [lon,lat] swap / tail dedupe / tail-null behaviour.
 */
import { assert, test } from './lib.ts';
import { appendTrailPoint, trailLineFeature, TRAIL_MIN_STEP_M, type TrailPoint } from '../src/ui/trailModel.ts';

// A point exactly this far north of a given point is just over 5 m away
// (111320 m per degree of latitude) — used to build well-separated fixtures
// without depending on metresBetween's own internals.
const STEP_DEG = 0.0001; // ~11.1 m at these latitudes — comfortably >= 5 m

test('trailModel: appendTrailPoint always accepts the first point', () => {
  const out = appendTrailPoint([], 50.85, 4.68);
  assert(out.length === 1, `expected 1 point, got ${out.length}`);
  assert(out[0].lat === 50.85 && out[0].lon === 4.68, 'first point not stored verbatim');
});

test('trailModel: appendTrailPoint rejects a point < minStepM away and returns the SAME array reference', () => {
  const base: readonly TrailPoint[] = [{ lat: 50.85, lon: 4.68 }];
  // ~1.1 m north — well under the 5 m default step.
  const out = appendTrailPoint(base, 50.85 + STEP_DEG / 10, 4.68);
  assert(out === base, 'a rejected fix must return the exact same array reference (no useMemo churn)');
});

test('trailModel: appendTrailPoint accepts a point >= minStepM away', () => {
  const base: readonly TrailPoint[] = [{ lat: 50.85, lon: 4.68 }];
  const out = appendTrailPoint(base, 50.85 + STEP_DEG, 4.68);
  assert(out.length === 2, `expected 2 points, got ${out.length}`);
  assert(out !== base, 'an accepted fix must return a new array');
  assert(out[0] === base[0], 'the existing point must be preserved, not copied');
});

test('trailModel: appendTrailPoint ignores non-finite input', () => {
  const base: readonly TrailPoint[] = [{ lat: 50.85, lon: 4.68 }];
  assert(appendTrailPoint(base, NaN, 4.68) === base, 'NaN lat must be a no-op');
  assert(appendTrailPoint(base, 50.85, Infinity) === base, 'Infinity lon must be a no-op');
  assert(appendTrailPoint(base, 50.85, -Infinity) === base, '-Infinity lon must be a no-op');
});

test('trailModel: appendTrailPoint honours a custom minStepM', () => {
  const base: readonly TrailPoint[] = [{ lat: 50.85, lon: 4.68 }];
  // ~1.1 m away — rejected at the 5 m default, accepted at a 1 m minimum.
  const near = 50.85 + STEP_DEG / 10;
  assert(appendTrailPoint(base, near, 4.68, TRAIL_MIN_STEP_M) === base, 'default step should reject a ~1m fix');
  const out = appendTrailPoint(base, near, 4.68, 1);
  assert(out.length === 2, 'a 1m minStepM should accept a ~1.1m fix');
});

test('trailModel: appendTrailPoint FIFO cap drops the oldest and preserves order', () => {
  let trail: readonly TrailPoint[] = [];
  const maxPoints = 5;
  // Push 8 well-separated points through a 5-point cap.
  for (let i = 0; i < 8; i++) {
    trail = appendTrailPoint(trail, 50.85 + i * STEP_DEG, 4.68, TRAIL_MIN_STEP_M, maxPoints);
  }
  assert(trail.length === maxPoints, `expected ${maxPoints} points, got ${trail.length}`);
  // The oldest 3 (i=0,1,2) should be gone; the newest 5 (i=3..7) remain, in order.
  for (let k = 0; k < maxPoints; k++) {
    const expectedI = 8 - maxPoints + k;
    const expectedLat = 50.85 + expectedI * STEP_DEG;
    assert(Math.abs(trail[k].lat - expectedLat) < 1e-9,
      `slot ${k}: expected lat ${expectedLat}, got ${trail[k].lat}`);
  }
});

test('trailModel: appendTrailPoint at the cap still rejects a too-close fix (cap does not override the step rule)', () => {
  let trail: readonly TrailPoint[] = [];
  const maxPoints = 3;
  for (let i = 0; i < maxPoints; i++) {
    trail = appendTrailPoint(trail, 50.85 + i * STEP_DEG, 4.68, TRAIL_MIN_STEP_M, maxPoints);
  }
  assert(trail.length === maxPoints, 'setup: trail should be at the cap');
  const before = trail;
  const rejected = appendTrailPoint(trail, trail[maxPoints - 1].lat + STEP_DEG / 10, 4.68, TRAIL_MIN_STEP_M, maxPoints);
  assert(rejected === before, 'a too-close fix at the cap must still be rejected, not silently accepted');
});

test('trailModel: trailLineFeature is null for an empty trail with no tail', () => {
  assert(trailLineFeature([]) === null, 'empty trail, no tail must be null');
});

test('trailModel: trailLineFeature is null for a single-point trail with no tail', () => {
  assert(trailLineFeature([{ lat: 50.85, lon: 4.68 }]) === null, 'single point, no tail must be null');
});

test('trailModel: trailLineFeature is null for an empty trail with a tail (1 vertex is not a line)', () => {
  assert(trailLineFeature([], { lat: 50.85, lon: 4.68 }) === null, 'empty trail + tail (1 vertex) must be null');
});

test('trailModel: trailLineFeature swaps [lat,lon] -> [lon,lat]', () => {
  const trail: TrailPoint[] = [{ lat: 50.85, lon: 4.68 }, { lat: 50.851, lon: 4.681 }];
  const f = trailLineFeature(trail);
  assert(f !== null, 'expected a feature');
  assert(f!.geometry.type === 'LineString', 'expected a LineString geometry');
  assert(f!.geometry.coordinates.length === 2, `expected 2 coordinates, got ${f!.geometry.coordinates.length}`);
  const [lon0, lat0] = f!.geometry.coordinates[0];
  assert(lon0 === 4.68 && lat0 === 50.85, `first coordinate [${lon0},${lat0}] is not the swap of the first trail point`);
  const [lon1, lat1] = f!.geometry.coordinates[1];
  assert(lon1 === 4.681 && lat1 === 50.851, `second coordinate [${lon1},${lat1}] is not the swap of the second trail point`);
});

test('trailModel: trailLineFeature appends a tail that differs from the last kept point', () => {
  const trail: TrailPoint[] = [{ lat: 50.85, lon: 4.68 }];
  const f = trailLineFeature(trail, { lat: 50.8501, lon: 4.6801 });
  assert(f !== null, 'expected a feature (trail + tail = 2 vertices)');
  assert(f!.geometry.coordinates.length === 2, `expected 2 coordinates, got ${f!.geometry.coordinates.length}`);
  const [lon1, lat1] = f!.geometry.coordinates[1];
  assert(lon1 === 4.6801 && lat1 === 50.8501, 'tail vertex not appended/swapped correctly');
});

test('trailModel: trailLineFeature does NOT duplicate a tail equal to the last kept point', () => {
  const trail: TrailPoint[] = [{ lat: 50.85, lon: 4.68 }, { lat: 50.851, lon: 4.681 }];
  const f = trailLineFeature(trail, { lat: 50.851, lon: 4.681 }); // identical to the last point
  assert(f !== null, 'expected a feature');
  assert(f!.geometry.coordinates.length === 2, `tail equal to the last point must not add a vertex, got ${f!.geometry.coordinates.length}`);
});

test('trailModel: trailLineFeature with a null/undefined tail draws over the trail alone', () => {
  const trail: TrailPoint[] = [{ lat: 50.85, lon: 4.68 }, { lat: 50.851, lon: 4.681 }];
  const fNull = trailLineFeature(trail, null);
  const fUndef = trailLineFeature(trail);
  assert(fNull !== null && fNull!.geometry.coordinates.length === 2, 'null tail must draw the trail alone');
  assert(fUndef !== null && fUndef!.geometry.coordinates.length === 2, 'omitted tail must draw the trail alone');
});
