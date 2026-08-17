/** Robust statistics used by benchmarks and the parity harness. */

export function median(a: ArrayLike<number>): number {
  const s = Array.from(a as ArrayLike<number>).sort((p, q) => p - q);
  const n = s.length;
  if (n === 0) return NaN;
  return n % 2 === 1 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

/** 1.4826 * MAD — the sigma estimator used throughout RESULTS.md / D-008. */
export function madSigma(a: ArrayLike<number>): number {
  const m = median(a);
  const dev = Array.from(a as ArrayLike<number>).map((v) => Math.abs(v - m));
  return 1.4826 * median(dev);
}

export function percentile(a: ArrayLike<number>, p: number): number {
  const s = Array.from(a as ArrayLike<number>).sort((x, y) => x - y);
  const n = s.length;
  if (n === 0) return NaN;
  const idx = (p / 100) * (n - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return s[lo] + (idx - lo) * (s[hi] - s[lo]);
}
