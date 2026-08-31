/** Reference-polyline construction (medoid ride -> smoothed 5 m-resampled line).
 * Port of build_ref / medoid in data/analysis/02_analysis.py. */
import type { RidePoints, RefLine, XY } from './types.ts';
import { M_PER_DEG_LAT, M_PER_DEG_LON, toXY, cumdist, resample } from './geo.ts';

/** Track-local origin: mean of per-ride mean lat/lon (Python: np.mean of r.lat.mean()). */
export function meanOrigin(rides: RidePoints[]): { lat0: number; lon0: number } {
  let sla = 0;
  let slo = 0;
  for (const r of rides) {
    let a = 0;
    let o = 0;
    for (let i = 0; i < r.lat.length; i++) {
      a += r.lat[i];
      o += r.lon[i];
    }
    sla += a / r.lat.length;
    slo += o / r.lon.length;
  }
  return { lat0: sla / rides.length, lon0: slo / rides.length };
}

/** Symmetric mean-nearest-point distance between two 25 m-resampled rides. */
function rideDistance(a: XY, b: XY): number {
  const meanMin = (p: XY, q: XY): number => {
    let sum = 0;
    for (let i = 0; i < p.x.length; i++) {
      let best = Infinity;
      const px = p.x[i];
      const py = p.y[i];
      for (let j = 0; j < q.x.length; j++) {
        const dx = px - q.x[j];
        const dy = py - q.y[j];
        const d2 = dx * dx + dy * dy;
        if (d2 < best) best = d2;
      }
      sum += Math.sqrt(best);
    }
    return sum / p.x.length;
  };
  return (meanMin(a, b) + meanMin(b, a)) / 2;
}

/** Index of the medoid ride (minimum summed distance to all others). */
export function medoidIndex(rides: RidePoints[], lat0: number, lon0: number): number {
  const pts = rides.map((r) => {
    const xy = toXY(r.lat, r.lon, lat0, lon0);
    return resample(xy.x, xy.y, 25.0);
  });
  const n = rides.length;
  const sums = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = rideDistance(pts[i], pts[j]);
      sums[i] += d;
      sums[j] += d;
    }
  }
  let best = 0;
  for (let i = 1; i < n; i++) if (sums[i] < sums[best]) best = i;
  return best;
}

/** Light box-smooth (k=5, ends kept raw) then 5 m resample; chainage = cumulative distance. */
export function buildReference(ride: RidePoints, lat0: number, lon0: number): RefLine {
  const { x, y } = toXY(ride.lat, ride.lon, lat0, lon0);
  const n = x.length;
  const k = 5;
  const half = 2; // (k-1)/2
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    // centred zero-padded box average — np.convolve(..., 'same') semantics
    let sx = 0;
    let sy = 0;
    for (let j = i - half; j <= i + half; j++) {
      if (j >= 0 && j < n) {
        sx += x[j];
        sy += y[j];
      }
    }
    xs[i] = sx / k;
    ys[i] = sy / k;
  }
  for (let i = 0; i < k; i++) {
    xs[i] = x[i];
    ys[i] = y[i];
    xs[n - k + i] = x[n - k + i];
    ys[n - k + i] = y[n - k + i];
  }
  const rs = resample(xs, ys, 5.0);
  const ch = cumdist(rs.x, rs.y);
  return { rx: rs.x, ry: rs.y, ch, lat0, lon0, length: ch[ch.length - 1] };
}

/** One collapsed stationary run (parked bike / red light / junction wait):
 * its centroid, time span, and how many raw points it swallowed. Chainage is
 * NOT computed here — the caller projects the centroid onto whatever
 * reference line it builds. */
export interface StationaryRun {
  lat: number;
  lon: number;
  tFromS: number;
  tToS: number;
  nPoints: number;
}

export interface CollapsedRide {
  ride: RidePoints;
  runs: StationaryRun[];
}

/** Planar distance (metres) between two lat/lon points, equirectangular about
 * their own midpoint latitude — accurate enough for a 15 m threshold check.
 * (Moved verbatim from tests/build_track_ref.ts, cycle 024.) */
function pointDistM(alat: number, alon: number, blat: number, blon: number): number {
  const latMidRad = ((alat + blat) / 2) * (Math.PI / 180);
  const dy = (alat - blat) * M_PER_DEG_LAT;
  const dx = (alon - blon) * M_PER_DEG_LON * Math.cos(latMidRad);
  return Math.hypot(dx, dy);
}

/** Stationary-run collapse (data/analysis/way-curation.md, "On smoothing it
 * out"): where consecutive fixes stay within `radiusM` of the run's first fix
 * for more than `minDurationS`, replace the whole run with ONE centroid point
 * (mean lat/lon/ele, first t). Pure; operates on the point order as given.
 * Moved here from tests/build_track_ref.ts (cycle 024) so the on-phone
 * reference builder (app/src/live/userRefs.ts) and the QA script share ONE
 * implementation. Numeric behaviour is IDENTICAL to the original; only the
 * console.log moved to the caller, and the collapsed runs are now returned
 * alongside the ride. */
export function collapseStationaryRuns(
  ride: RidePoints, radiusM = 15, minDurationS = 20,
): CollapsedRide {
  const n = ride.lat.length;
  const outT: number[] = [];
  const outLat: number[] = [];
  const outLon: number[] = [];
  const outEle: number[] = [];
  const runs: StationaryRun[] = [];

  let i = 0;
  while (i < n) {
    let j = i;
    while (
      j + 1 < n &&
      pointDistM(ride.lat[i], ride.lon[i], ride.lat[j + 1], ride.lon[j + 1]) <= radiusM
    ) {
      j += 1;
    }
    const duration = ride.t[j] - ride.t[i];
    if (j > i && duration > minDurationS) {
      let sla = 0, slo = 0, sel = 0;
      for (let k = i; k <= j; k++) {
        sla += ride.lat[k];
        slo += ride.lon[k];
        sel += ride.ele[k];
      }
      const count = j - i + 1;
      outT.push(ride.t[i]);
      outLat.push(sla / count);
      outLon.push(slo / count);
      outEle.push(sel / count);
      runs.push({ lat: sla / count, lon: slo / count, tFromS: ride.t[i], tToS: ride.t[j], nPoints: count });
      i = j + 1;
    } else {
      outT.push(ride.t[i]);
      outLat.push(ride.lat[i]);
      outLon.push(ride.lon[i]);
      outEle.push(ride.ele[i]);
      i += 1;
    }
  }

  return {
    ride: {
      name: ride.name,
      t: Float64Array.from(outT),
      lat: Float64Array.from(outLat),
      lon: Float64Array.from(outLon),
      ele: Float64Array.from(outEle),
    },
    runs,
  };
}
