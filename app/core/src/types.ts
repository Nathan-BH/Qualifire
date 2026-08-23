/** Qualifire core types. Platform-free: no Node, no React Native imports anywhere in src/. */

/** A recorded ride: parallel arrays, one entry per GPS fix. Timestamps are epoch seconds (UTC). */
export interface RidePoints {
  name: string;
  t: Float64Array;
  lat: Float64Array;
  lon: Float64Array;
  ele: Float64Array;
}

/** Local planar coordinates (metres) of a ride, equirectangular about (lat0, lon0). */
export interface XY {
  x: Float64Array;
  y: Float64Array;
}

/** Reference polyline for a track, resampled at 5 m, with cumulative chainage. */
export interface RefLine {
  rx: Float64Array;
  ry: Float64Array;
  /** cumulative chainage at each vertex, metres; ch[0] = 0 */
  ch: Float64Array;
  lat0: number;
  lon0: number;
  /** total length, metres (= ch[ch.length-1]) */
  length: number;
}

export interface Gate {
  name: string;           // "START" | "G1" | "G2" | "G3" | "FINISH"
  chainage: number;       // metres along the track's reference polyline
  lat: number;
  lon: number;
}

/** Cycle 024 (WP-D2): widened from the four legacy commute tracks to any
 * catalog route id — every one of the 20 ratified routes now runs as a live
 * candidate (app/src/live/tracks.ts's catalogTrackSpecs()), not just the
 * four. Kept as a distinct name (rather than using `string` directly at
 * every call site) purely for readability at usage sites. */
export type TrackId = string;

export type SectorFlag = 'clean' | 'interrupted' | 'excluded_nocross' | 'excluded_offroute';

export interface SectorResult {
  sector: number;              // 1-based
  tA: number | null;           // interpolated entry-gate crossing, epoch s
  tB: number | null;           // interpolated exit-gate crossing, epoch s
  rawS: number | null;
  stoppedS: number | null;
  movingS: number | null;      // rawS - stoppedS; the D-008 colouring quantity
  flag: SectorFlag;
}

/** A gate firing produced by the live detector. */
export interface GateEvent {
  gateIndex: number;           // index into the gates array
  time: number;                // epoch s, interpolated between bracketing fixes
  /** true when fired by the D-016(b) arming rule (late GPS lock), not a real observed crossing */
  estimated: boolean;
}
