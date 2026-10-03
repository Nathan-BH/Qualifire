/**
 * virgin-cycle20 brief 02 (Nathan 2026-09-30): where the LIVE rider dot is
 * DRAWN — softly snapped to the route's reference line when close, blended
 * towards the raw GPS fix as the rider drifts, exactly the raw fix once
 * clearly off-route. PURE: no react / react-native / expo imports, no clock
 * reads, no randomness — tests/riderdot_suite.ts drives it under plain Node.
 *
 * Display only. Nothing here feeds chainage, gates, timing, the trail, the
 * stationary rule or the raw JSONL (D-023): the engine exposes the projected
 * point as a read-only mirror (LiveEngineState.riderSnap) and this module
 * decides what to draw from it.
 *
 * Thresholds (metres of cross-track distance, `xtdM`):
 *  - SNAP_ENGAGE_M  12: from 'free', at or under this the dot glues to the line
 *                       (same road, either lane; well under armWithinM /
 *                       POOR_ACCURACY_M = 50 so a poor fix never glues by accident);
 *  - SNAP_RELEASE_M 20: while glued, the dot stays exactly on the line up to
 *                       here (hysteresis — no flicker on a wide road);
 *  - SNAP_RAW_M     30: at or beyond this the dot IS the raw fix (= windowBack,
 *                       below CORRIDOR_M = 40 so a detour shows before the engine
 *                       even stops counting the fix as on-route).
 * The two ramps ([ENGAGE, RAW] when free, [RELEASE, RAW] when glued) both give
 * 0 at the engage point and 1 at the raw point, so a mode change never jumps.
 */

export const SNAP_ENGAGE_M = 12;
export const SNAP_RELEASE_M = 20;
export const SNAP_RAW_M = 30;

/** The engine's display-only projection of the last fix (LiveEngineState.riderSnap). */
export interface RiderSnapInput {
  lat: number;
  lon: number;
  /** cross-track distance of the raw fix from the reference line, metres */
  xtdM: number;
}

export type RiderDotMode = 'free' | 'snapped';

export interface RiderDotState {
  mode: RiderDotMode;
}

export interface RiderDotResult {
  state: RiderDotState;
  /** the position to DRAW */
  lat: number;
  lon: number;
  /** 0 = exactly the projected point, 1 = exactly the raw fix, else the blend factor */
  weight: number;
}

export function initialRiderDotState(): RiderDotState {
  return { mode: 'free' };
}

/** Blend weight for a given deviation in a given mode (0 = on the line, 1 = raw). */
export function snapWeight(xtdM: number, mode: RiderDotMode): number {
  const lo = mode === 'snapped' ? SNAP_RELEASE_M : SNAP_ENGAGE_M;
  if (xtdM <= lo) return 0;
  if (xtdM >= SNAP_RAW_M) return 1;
  return (xtdM - lo) / (SNAP_RAW_M - lo);
}

function usable(snap: RiderSnapInput | null): snap is RiderSnapInput {
  return snap !== null
    && Number.isFinite(snap.lat) && Number.isFinite(snap.lon)
    && Number.isFinite(snap.xtdM) && snap.xtdM >= 0;
}

/** One fix in, one drawn position out. Deterministic and idempotent: the same
 * (prev, raw, snap) always yields the same result, and feeding a result's
 * state back with the same input yields it again. */
export function riderDotStep(
  prev: RiderDotState,
  rawLat: number,
  rawLon: number,
  snap: RiderSnapInput | null,
): RiderDotResult {
  if (!usable(snap)) {
    return { state: { mode: 'free' }, lat: rawLat, lon: rawLon, weight: 1 };
  }
  let mode = prev.mode;
  if (mode === 'free' && snap.xtdM <= SNAP_ENGAGE_M) mode = 'snapped';
  else if (mode === 'snapped' && snap.xtdM >= SNAP_RAW_M) mode = 'free';
  const weight = snapWeight(snap.xtdM, mode);
  if (weight >= 1) return { state: { mode }, lat: rawLat, lon: rawLon, weight: 1 };
  if (weight <= 0) return { state: { mode }, lat: snap.lat, lon: snap.lon, weight: 0 };
  return {
    state: { mode },
    lat: snap.lat + weight * (rawLat - snap.lat),
    lon: snap.lon + weight * (rawLon - snap.lon),
    weight,
  };
}
