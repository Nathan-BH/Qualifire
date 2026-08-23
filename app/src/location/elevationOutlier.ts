/**
 * Elevation-outlier detection (cycle 023 fix 3). Pure — no expo, no Node
 * imports — so it is headless-testable, unlike location/index.ts itself.
 *
 * D-023 (raw-forever): this is a FLAG, never a mutation. The raw `ele` field
 * a fix carries is stored to the ride's JSONL exactly as received, always —
 * this module only decides whether a diagnostic event is worth logging
 * alongside it. Any smoothing/clamping for display or export happens
 * downstream, over a COPY of the numbers, never by touching what's stored
 * (see gpxPlusExport.ts's own doc comment on this ride's data being derived,
 * never rewritten).
 *
 * Threshold reasoning: single-second GPS/barometer noise on this app's rides
 * has shown +10.7 m, -13.5 m and +4.9 m one-second spikes — all physically
 * implausible for a bike (a sustained climb at speed, even on a short steep
 * pitch, tops out around 1-1.5 m/s of vertical rate; e.g. 25 km/h up a 20%
 * grade is ~1.4 m/s). ELEVATION_OUTLIER_RATE_MPS = 4 sits comfortably above
 * any real climbing rate a rider could sustain, comfortably below all three
 * observed spikes (so this catches every one of them), and clears the "must
 * catch 10+ m/s spikes" floor with margin to spare. Compared against a RATE
 * (delta / elapsed time), not a raw delta, so a genuinely large elevation
 * change across a long GPS gap is correctly never flagged.
 */

export const ELEVATION_OUTLIER_RATE_MPS = 4;

export interface ElevationOutlierCheck {
  isOutlier: boolean;
  deltaM: number;
  dtS: number;
  rateMps: number;
}

/** Compares one fix's elevation against the previous fix's. Returns null when
 * there is nothing to compare (first fix, or non-positive/non-finite elapsed
 * time — e.g. two fixes sharing a timestamp, or an out-of-order pair). */
export function checkElevationOutlier(
  prevEle: number,
  prevTUnixMs: number,
  ele: number,
  tUnixMs: number,
  thresholdMps: number = ELEVATION_OUTLIER_RATE_MPS,
): ElevationOutlierCheck | null {
  const dtS = (tUnixMs - prevTUnixMs) / 1000;
  if (!Number.isFinite(dtS) || dtS <= 0) return null;
  if (!Number.isFinite(prevEle) || !Number.isFinite(ele)) return null;
  const deltaM = ele - prevEle;
  const rateMps = Math.abs(deltaM) / dtS;
  return { isOutlier: rateMps > thresholdMps, deltaM, dtS, rateMps };
}
