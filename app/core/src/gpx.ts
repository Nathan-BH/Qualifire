/** GPX parsing — zero-dependency.
 *
 * Mirrors the reference Python parser (data/analysis/01_parse.py) exactly: a
 * <trkpt> counts only if it carries lat, lon, <ele> and <time>, in that
 * document order. Strava exports always satisfy this; mirroring the rule means
 * the TS and Python pipelines see byte-identical point sequences (see PARITY.md).
 *
 * Note: the cycle-003 library slate named @tmcw/togeojson for GPX -> GeoJSON.
 * The core intentionally does not depend on it: the app records its own fixes
 * (GPX import is a harness/archive concern), the parser below is ~30 lines, and
 * matching 01_parse.py's point-acceptance rule is load-bearing for parity.
 * togeojson remains fine for any future generic-import feature.
 */
import type { RidePoints } from './types.ts';

const TRKPT_RE =
  /<trkpt lat="([-\d.]+)" lon="([-\d.]+)">[\s\S]*?<ele>([-\d.]+)<\/ele>[\s\S]*?<time>([^<]+)<\/time>/g;

/** Parse ISO-8601 (with 'Z' or offset) to epoch seconds. */
export function parseIsoTime(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new Error(`unparseable GPX <time>: ${iso}`);
  return ms / 1000;
}

export function parseGpx(xml: string, name: string): RidePoints {
  const lat: number[] = [];
  const lon: number[] = [];
  const ele: number[] = [];
  const t: number[] = [];
  TRKPT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TRKPT_RE.exec(xml)) !== null) {
    lat.push(parseFloat(m[1]));
    lon.push(parseFloat(m[2]));
    ele.push(parseFloat(m[3]));
    t.push(parseIsoTime(m[4]));
  }
  return {
    name,
    t: Float64Array.from(t),
    lat: Float64Array.from(lat),
    lon: Float64Array.from(lon),
    ele: Float64Array.from(ele),
  };
}
