/** Planar geometry + numpy-compatible primitives.
 *
 * The projection is equirectangular about a track-local origin with the SAME
 * constants as the validated Python pipeline (data/analysis/02_analysis.py):
 * 111320 m/deg lon at the equator, 110540 m/deg lat. Over a ~6 km commute the
 * planar error is negligible, and bit-level agreement with the Python reference
 * is what makes the parity proof (PARITY.md) meaningful.
 */
import type { XY } from './types.ts';

export const M_PER_DEG_LAT = 110540.0;
export const M_PER_DEG_LON = 111320.0;

export function toXY(
  lat: ArrayLike<number>, lon: ArrayLike<number>, lat0: number, lon0: number,
): XY {
  const n = lat.length;
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const clat = Math.cos((lat0 * Math.PI) / 180) * M_PER_DEG_LON;
  for (let i = 0; i < n; i++) {
    x[i] = (lon[i] - lon0) * clat;
    y[i] = (lat[i] - lat0) * M_PER_DEG_LAT;
  }
  return { x, y };
}

export function xyToLatLon(x: number, y: number, lat0: number, lon0: number): [number, number] {
  return [
    lat0 + y / M_PER_DEG_LAT,
    lon0 + x / (M_PER_DEG_LON * Math.cos((lat0 * Math.PI) / 180)),
  ];
}

/** np.searchsorted(a, v, side='left'): first index i with a[i] >= v. */
export function searchsortedLeft(a: ArrayLike<number>, v: number): number {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (a[mid] < v) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** np.interp for a single query on increasing xp. */
export function interp1(q: number, xp: ArrayLike<number>, fp: ArrayLike<number>): number {
  const n = xp.length;
  if (q <= xp[0]) return fp[0];
  if (q >= xp[n - 1]) return fp[n - 1];
  let i = searchsortedLeft(xp, q);            // xp[i] >= q, i >= 1
  if (xp[i] === q) return fp[i];
  i -= 1;
  const dx = xp[i + 1] - xp[i];
  if (dx === 0) return fp[i];
  return fp[i] + ((q - xp[i]) / dx) * (fp[i + 1] - fp[i]);
}

/** Cumulative planar distance along a point sequence; out[0] = 0. */
export function cumdist(x: ArrayLike<number>, y: ArrayLike<number>): Float64Array {
  const n = x.length;
  const d = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    d[i] = d[i - 1] + Math.hypot(x[i] - x[i - 1], y[i] - y[i - 1]);
  }
  return d;
}

/** Resample a polyline at fixed arc-length steps (np.arange(0, total, step) semantics). */
export function resample(x: ArrayLike<number>, y: ArrayLike<number>, step: number): XY {
  const d = cumdist(x, y);
  const total = d[d.length - 1];
  const n = Math.ceil(total / step);          // np.arange excludes the stop value
  const rx = new Float64Array(n);
  const ry = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const s = i * step;
    rx[i] = interp1(s, d, x);
    ry[i] = interp1(s, d, y);
  }
  return { x: rx, y: ry };
}
