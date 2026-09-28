/**
 * QA — Phase 0 of virgin-cycle15 brief 07 (replay dot drifts off the yellow
 * line in bends). Synthetic-geometry only: isolates how much of the visible
 * gap between the replay dot and a reference line is pure chord-interpolation
 * artifact — `interpAt`'s straight line between two real 1 Hz GPS fixes —
 * independent of GPS noise or the rider genuinely taking a different line
 * through the corner. See `07-replay-position-drift.md` for the full
 * explanation; this file only pins the numbers in its table.
 *
 * Headless; no React, no expo. Distance is measured in the SAME local
 * equirectangular plane the rest of the codebase already uses for every
 * other on-map distance (core/src/geo.ts `toXY`/`xyToLatLon`, used by
 * chainage, cross-track distance and gate detection) rather than a spherical
 * great-circle formula — the two agree to well under a millimetre at the
 * few-tens-of-metres scale these tests run at, and using the app's own
 * projection keeps this test consistent with how "distance" means the same
 * thing everywhere else in the codebase.
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { test, assert } from './lib.ts';
import { toXY, xyToLatLon } from '../core/src/index.ts';

// selfRaceModel.ts -> store/derive.ts -> catalogStore.ts -> seed.ts does a
// bare `.json` import (catalog.seed.json) that Node cannot resolve without
// this hook - same shim, same reason, as resultsstore_suite.ts /
// catalogdelete_suite.ts / landmarkusage_suite.ts. Must be registered before
// the dynamic import below, and interpAt must NOT be a static top-level
// import (run.ts statically imports every suite, which would force the
// bare-json import to resolve before this hook is ever registered).
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const { interpAt } = await import('../src/ui/selfRaceModel.ts');

const LAT0 = 50.8798; // near Leuven, per the brief; only the local metric matters
const LON0 = 4.7005;
const KMH_TO_MS = 1 / 3.6;

/** Sagitta of a chord spanning `gapS` seconds at speed `vMs` m/s on a
 * radius-`r` circle: r - sqrt(r^2 - (v*gapS/2)^2) — the brief's own formula.
 * NaN when the half-chord exceeds r (the corner is tighter than a straight
 * 1 s hop can even span, e.g. 40 km/h through a 5 m radius) — the brief
 * calls that combination "not a real corner" and it is excluded below. */
function sagitta(r: number, vMs: number, gapS: number): number {
  const half = (vMs * gapS) / 2;
  return r - Math.sqrt(r * r - half * half);
}

/** True position at time `tS` (seconds) on a circle of radius `r`, constant
 * speed `vMs`, starting at local (0,0) heading +x and curving toward +y —
 * i.e. a quarter turn is reached at tS = (pi/2)*r/vMs. Converted to lat/lon
 * through the SAME `xyToLatLon` `riderPositionAt`'s callers eventually feed
 * a map, and back again by `distM` below through `toXY` with the identical
 * (LAT0, LON0) origin — that round trip is an exact affine map, so linear
 * interpolation of lat/lon (what `interpAt` does) is exactly linear
 * interpolation of these local x/y metres, and the classic sagitta formula
 * applies without approximation. */
function arcPoint(r: number, vMs: number, tS: number): { lat: number; lon: number } {
  const theta = (vMs * tS) / r;
  const x = r * Math.sin(theta);
  const y = r * (1 - Math.cos(theta));
  const [lat, lon] = xyToLatLon(x, y, LAT0, LON0);
  return { lat, lon };
}

/** Planar distance (metres) between two lat/lon points via the app's own
 * local projection (core/src/geo.ts) — not a spherical formula; see file
 * header for why that is the right choice here. */
function distM(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const { x, y } = toXY([a.lat, b.lat], [a.lon, b.lon], LAT0, LON0);
  return Math.hypot(x[0] - x[1], y[0] - y[1]);
}

/** (radius m, speed km/h) cells from the brief's table. (5 m, 40 km/h) is
 * omitted: the brief's own table marks it "more than a half-circle in 1 s —
 * not a real corner" (the sagitta formula is undefined there), so there is
 * nothing to assert. */
const COMBOS: readonly { r: number; vKmh: number }[] = [
  { r: 5, vKmh: 20 }, { r: 5, vKmh: 30 },
  { r: 10, vKmh: 20 }, { r: 10, vKmh: 30 }, { r: 10, vKmh: 40 },
  { r: 20, vKmh: 20 }, { r: 20, vKmh: 30 }, { r: 20, vKmh: 40 },
];

for (const { r, vKmh } of COMBOS) {
  test(`replayDrift: chord error r=${r}m v=${vKmh}km/h stays within sagitta + 0.05m`, () => {
    const vMs = vKmh * KMH_TO_MS;
    const expectedSag = sagitta(r, vMs, 1);
    assert(Number.isFinite(expectedSag), `sagitta(r=${r}, v=${vMs}) not finite — combo should have been excluded`);

    // Enough 1 Hz fixes to cover (about) the quarter turn — for the
    // tightest/fastest combos this is a single 1 s chord that lands a few
    // degrees past 90°, still the same constant-curvature circle, which is
    // all the sagitta formula needs (curvature, hence chord error, is
    // identical for every 1 s chord along a circle of fixed radius/speed).
    const quarterS = ((Math.PI / 2) * r) / vMs;
    const nFixes = Math.max(1, Math.round(quarterS));
    const t0Ms = 1_700_000_000_000; // arbitrary fixed epoch
    const fixes = Array.from({ length: nFixes + 1 }, (_, i) => {
      const p = arcPoint(r, vMs, i);
      return { tUnixMs: t0Ms + i * 1000, lat: p.lat, lon: p.lon };
    });

    let maxErr = 0;
    for (let i = 0; i < nFixes; i++) {
      const tS = i + 0.5; // half-second offset, midpoint of chord [i, i+1] — where chord error peaks
      const truth = arcPoint(r, vMs, tS);
      const got = interpAt(fixes, t0Ms + tS * 1000);
      const err = distM(truth, got);
      if (err > maxErr) maxErr = err;
    }
    // eslint-disable-next-line no-console -- Phase 0's whole point is to report the measured numbers
    console.log(
      `  [replayDrift] r=${r}m v=${vKmh}km/h: measured max chord error ${maxErr.toFixed(3)}m ` +
        `(sagitta formula: ${expectedSag.toFixed(3)}m)`,
    );
    assert(
      maxErr <= expectedSag + 0.05,
      `r=${r}m v=${vKmh}km/h: measured max chord error ${maxErr.toFixed(3)}m exceeds sagitta ` +
        `${expectedSag.toFixed(3)}m + 0.05m tolerance`,
    );
  });
}
