/** Speed + stopped-state detection and moving time.
 * Port of kinematics / stopped_time_between in 02_analysis.py.
 * Stopped := speed < 1.0 m/s sustained for > 3.0 s (RESULTS.md definition). */

export const STOP_V_MS = 1.0;
export const STOP_T_S = 3.0;

export interface Kinematics {
  /** planar speed per fix, m/s; v[0] = 0 */
  v: Float64Array;
  /** 1 where the fix belongs to a sustained stop */
  stopped: Uint8Array;
}

export function computeKinematics(
  t: ArrayLike<number>, x: ArrayLike<number>, y: ArrayLike<number>,
  stopV = STOP_V_MS, stopT = STOP_T_S,
): Kinematics {
  const n = t.length;
  const v = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    const dt = Math.max(t[i] - t[i - 1], 0.1);
    v[i] = Math.hypot(x[i] - x[i - 1], y[i] - y[i - 1]) / dt;
  }
  const stopped = new Uint8Array(n);
  let i = 0;
  while (i < n) {
    if (v[i] < stopV) {
      let j = i;
      while (j + 1 < n && v[j + 1] < stopV) j++;
      if (t[j] - t[i] > stopT) stopped.fill(1, i, j + 1);
      i = j + 1;
    } else {
      i++;
    }
  }
  return { v, stopped };
}

/** Total stopped seconds inside [ta, tb] (gate-interpolated bounds). */
export function stoppedTimeBetween(
  t: ArrayLike<number>, stopped: Uint8Array, ta: number, tb: number,
): number {
  let sum = 0;
  let any = false;
  for (let i = 0; i < t.length; i++) {
    if (t[i] >= ta && t[i] <= tb && stopped[i]) {
      any = true;
      const prev = t[Math.max(i - 1, 0)];
      sum += Math.min(t[i], tb) - Math.max(prev, ta);
    }
  }
  if (!any) return 0;
  return Math.max(sum, 0);
}
