/**
 * Sector-gate seeding for a route born on the phone (OPEN-ITEMS item 3,
 * Part B). STATE.md ground rule, binding: every route has exactly 4 sectors,
 * gates at fixed 25/50/75% of route distance, start/finish at 1%/99% — never
 * scaled by route length. From ROUTING-AND-SEGMENTATION §3 (an UNBUILT
 * proposal for a different, larger redesign) this takes ONLY the snap rule
 * (no gate within 150 m of a controlled stop, searched in a ±250 m window,
 * quantile stands when the window is blocked) and the honesty clause
 * (GateSet.origin) — NOT its variable n=3–6 count algorithm.
 *
 * Stop source: with no OSM/traffic-signal data wired into this app, the
 * reference ride's own >=20 s stationary runs (live/userRefs.ts's
 * stopChainageM) are the zero-network proxy — where the rider actually
 * stood still is where a gate would corrupt a sector's times. One ride is a
 * proxy, not a measurement, so the seeded set is ALWAYS origin:'geometric'.
 *
 * Pure — no fs, no Date, no imports beyond nothing at all.
 */

export const START_FRAC = 0.01;
export const FINISH_FRAC = 0.99;
export const SECTOR_FRACS = [0.25, 0.5, 0.75] as const;
/** R&S §3 step 5: no gate within 150 m of a (proxied) controlled stop. */
export const SIGNAL_CLEAR_M = 150;
/** R&S §3 step 3: how far a gate may slide from its quantile. */
export const SNAP_WINDOW_M = 250;
export const SNAP_STEP_M = 10;
/** Sanity floor between neighbouring gates; a violation reverts the seed to
 * pure quantiles (validateCatalog needs only strictly-increasing, but two
 * gates 3 m apart is a degenerate sector, not a placement). */
export const MIN_GATE_GAP_M = 50;
/** Below this there is no room to slide anything — quantiles only. */
export const MIN_SNAP_LENGTH_M = 600;

/**
 * The 5 seeded gate chainages (START, G1, G2, G3, FINISH) for a reference
 * line of `refLengthM` metres, given the reference ride's own stop
 * chainages. Always strictly increasing for any refLengthM > 0.
 */
export function seedGateChainages(
  refLengthM: number,
  stopChainageM: readonly number[],
): number[] {
  const L = refLengthM;
  const start = START_FRAC * L;
  const finish = FINISH_FRAC * L;
  const quantiles = SECTOR_FRACS.map((f) => f * L);
  if (L < MIN_SNAP_LENGTH_M || stopChainageM.length === 0) {
    return [start, ...quantiles, finish];
  }
  const clear = (c: number): boolean =>
    stopChainageM.every((s) => Math.abs(c - s) >= SIGNAL_CLEAR_M);
  const snapped = quantiles.map((g0) => {
    if (clear(g0)) return g0;
    for (let k = 1; k * SNAP_STEP_M <= SNAP_WINDOW_M; k++) {
      for (const c of [g0 - k * SNAP_STEP_M, g0 + k * SNAP_STEP_M]) {
        if (c > start + MIN_GATE_GAP_M && c < finish - MIN_GATE_GAP_M && clear(c)) {
          return c;
        }
      }
    }
    // R&S §3 step 6: window blocked — the quantile stands, and the set's
    // origin:'geometric' flag (not silence) carries the honesty.
    return g0;
  });
  const all = [start, ...snapped, finish];
  for (let i = 1; i < all.length; i++) {
    if (all[i] - all[i - 1] < MIN_GATE_GAP_M) {
      // Two snapped gates converged — revert every sector gate to its pure
      // quantile rather than shipping a degenerate sector.
      return [start, ...quantiles, finish];
    }
  }
  return all;
}
