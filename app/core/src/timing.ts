/** Gate-crossing detection (offline) and sector timing.
 * Port of cross_time / sector logic in 02_analysis.py + 03_gates.py. */
import type { SectorResult, SectorFlag } from './types.ts';
import { CORRIDOR_M } from './projection.ts';
import { stoppedTimeBetween } from './kinematics.ts';

/** Stopped time >= this many seconds inside a sector => 'interrupted' (RESULTS.md "clean" rule). */
export const INTERRUPTED_STOP_S = 1.0;

/**
 * First upward crossing of chainage g in the projected series s[], with the
 * crossing timestamp linearly interpolated between the bracketing fixes.
 * If the ride STARTS at/past g: counts only when it starts < 20 m past
 * (offline analogue of late-lock tolerance; the live rule is D-016(b) in live.ts).
 */
export function crossTime(
  t: ArrayLike<number>, s: ArrayLike<number>, g: number,
): number | null {
  const n = s.length;
  if (n === 0) return null;
  if (s[0] >= g) return s[0] - g < 20 ? t[0] : null;
  for (let i = 0; i < n - 1; i++) {
    if (s[i] < g && s[i + 1] >= g) {
      const f = (g - s[i]) / Math.max(s[i + 1] - s[i], 1e-9);
      return t[i] + f * (t[i + 1] - t[i]);
    }
  }
  return null;
}

export interface ProjectedRide {
  t: ArrayLike<number>;
  s: ArrayLike<number>;
  xtd: ArrayLike<number>;
  stopped: Uint8Array;
}

/**
 * Sector times for one ride against gate chainages [g0..gN] (N sectors).
 * Flags per RESULTS.md: excluded_nocross (a bounding gate never crossed),
 * excluded_offroute (an off-corridor fix inside the sector => detour, D-015),
 * interrupted (contains a sustained stop), else clean.
 * movingS = raw - stopped is the D-008 colouring quantity in every case.
 */
export function sectorTimes(ride: ProjectedRide, gates: number[], corridor = CORRIDOR_M): SectorResult[] {
  const cross = gates.map((g) => crossTime(ride.t, ride.s, g));
  const out: SectorResult[] = [];
  for (let k = 0; k < gates.length - 1; k++) {
    const tA = cross[k];
    const tB = cross[k + 1];
    if (tA === null || tB === null || tB <= tA) {
      out.push({ sector: k + 1, tA, tB, rawS: null, stoppedS: null, movingS: null, flag: 'excluded_nocross' });
      continue;
    }
    let off = false;
    for (let i = 0; i < ride.t.length; i++) {
      const ti = ride.t[i] as number;
      if (ti >= tA && ti <= tB && (ride.xtd[i] as number) > corridor) {
        off = true;
        break;
      }
    }
    if (off) {
      out.push({ sector: k + 1, tA, tB, rawS: null, stoppedS: null, movingS: null, flag: 'excluded_offroute' });
      continue;
    }
    const raw = tB - tA;
    const st = stoppedTimeBetween(ride.t, ride.stopped, tA, tB);
    const flag: SectorFlag = st >= INTERRUPTED_STOP_S ? 'interrupted' : 'clean';
    out.push({ sector: k + 1, tA, tB, rawS: raw, stoppedS: st, movingS: raw - st, flag });
  }
  return out;
}
