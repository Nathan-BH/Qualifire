/** Reference-polyline construction (medoid ride -> smoothed 5 m-resampled line).
 * Port of build_ref / medoid in data/analysis/02_analysis.py. */
import type { RidePoints, RefLine, XY } from './types.ts';
import { toXY, cumdist, resample } from './geo.ts';

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
