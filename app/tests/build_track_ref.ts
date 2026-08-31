/** Single-ride reference builder (Cycle 020, Nathan 2026-08-19).
 *
 * build_fixtures.ts builds the three parity-anchored references (Morning /
 * EveningA / EveningB) as the MEDOID of many curated rides on that track,
 * verified against PARITY.md. Some tracks the archive has no curated,
 * repeated-ride variant for at all (MorningB — home>work "route B" only
 * exists as an existing EveningB ride reversed) — there is nothing to take
 * a medoid OF. This script builds a reference from exactly one GPX instead,
 * optionally point-reversed, and upserts it into fixtures/refs.json.
 *
 * build_fixtures.ts remains the tool for the three parity-anchored tracks —
 * this script never touches Morning/EveningA/EveningB and is not run as
 * part of that pipeline.
 *
 * Cycle 024 (2026-08-20, WP-D1): before meanOrigin/buildReference, every ride
 * passes through collapseStationaryRuns() — data/analysis/way-curation.md's
 * "On smoothing it out" prescription. Parked-bike / red-light knots (and,
 * for the home>work route-B promotion specifically, a stale cached-GPS fix
 * that otherwise reads as an 18.4-minute stationary "run") collapse to one
 * centroid point each so they never pollute the reference polyline that
 * D-011 projects onto. Collapse runs on the ORIGINAL (time-increasing) point
 * order, before any --reverse, so the run-duration arithmetic (which assumes
 * increasing t) stays correct regardless of whether the caller reverses the
 * ride afterwards.
 *
 * Usage:
 *   node --experimental-strip-types app/tests/build_track_ref.ts <gpx path> <trackId> [--reverse]
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  parseGpx, meanOrigin, buildReference, collapseStationaryRuns, cumdist,
  type RidePoints,
} from '../core/src/index.ts';

const FIXTURES_DIR = path.join(import.meta.dirname, 'fixtures');
const REFS_PATH = path.join(FIXTURES_DIR, 'refs.json');

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

/** Same rounding build_fixtures.ts's `fixtureRef` applies: rx/ry to mm, then
 * chainage RECOMPUTED from the rounded coords and rounded to 1e-6 m — what
 * is stored is exactly what replay uses. */
function roundRef(
  rx: Float64Array, ry: Float64Array,
): { rx: Float64Array; ry: Float64Array; ch: Float64Array; length: number } {
  const rrx = Float64Array.from(rx, (v) => round(v, 3));
  const rry = Float64Array.from(ry, (v) => round(v, 3));
  const ch = Float64Array.from(cumdist(rrx, rry), (v) => round(v, 6));
  return { rx: rrx, ry: rry, ch, length: ch[ch.length - 1] };
}

/** Reverse point order — t/lat/lon/ele arrays all reversed together (t is
 * irrelevant for a reference but keeping the arrays aligned is cheap and
 * avoids surprises if this ride is ever used for anything else). */
function reversePoints(ride: RidePoints): RidePoints {
  return {
    name: ride.name,
    t: Float64Array.from(ride.t).reverse(),
    lat: Float64Array.from(ride.lat).reverse(),
    lon: Float64Array.from(ride.lon).reverse(),
    ele: Float64Array.from(ride.ele).reverse(),
  };
}

function main(): void {
  const [gpxPath, trackId, flag] = process.argv.slice(2);
  if (!gpxPath || !trackId) {
    console.error('usage: build_track_ref.ts <gpx path> <trackId> [--reverse]');
    process.exit(1);
  }
  const reversed = flag === '--reverse';
  const xml = fs.readFileSync(gpxPath, 'utf8');
  const base = path.basename(gpxPath).replace(/\.gpx$/, '');
  let ride = parseGpx(xml, base);
  const collapsed = collapseStationaryRuns(ride);
  const collapsedPoints = collapsed.runs.reduce((a, r) => a + r.nPoints, 0);
  console.log(
    `collapseStationaryRuns: ${collapsed.runs.length} run(s), ${collapsedPoints} raw points -> ` +
      `${collapsed.runs.length} centroid point(s); ${ride.t.length} -> ${collapsed.ride.t.length} points`,
  );
  ride = collapsed.ride;
  if (reversed) ride = reversePoints(ride);

  const { lat0, lon0 } = meanOrigin([ride]);
  const ref = buildReference(ride, lat0, lon0);
  const { rx, ry, ch, length } = roundRef(ref.rx, ref.ry);

  const refsFile = JSON.parse(fs.readFileSync(REFS_PATH, 'utf8'));
  refsFile.tracks[trackId] = {
    medoid: base + (reversed ? ' (reversed)' : ''),
    length, lat0, lon0,
    rx: Array.from(rx), ry: Array.from(ry), ch: Array.from(ch),
  };
  refsFile.builderChecks.push({
    name: `build_track_ref ${trackId}`,
    pass: true,
    detail: `single-ride reference (${base}${reversed ? ' reversed' : ''}), not a medoid; ` +
      `stationary-run collapse applied (cycle 024)`,
  });
  fs.writeFileSync(REFS_PATH, JSON.stringify(refsFile) + '\n');

  console.log(trackId, ride.lat.length, 'pts (post-collapse)', 'length', length.toFixed(3), 'm');
}

main();
