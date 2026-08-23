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
  parseGpx, meanOrigin, buildReference, cumdist, M_PER_DEG_LAT, M_PER_DEG_LON,
  type RidePoints,
} from '../core/src/index.ts';

const FIXTURES_DIR = path.join(import.meta.dirname, 'fixtures');
const REFS_PATH = path.join(FIXTURES_DIR, 'refs.json');

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

/** Planar distance (metres) between two lat/lon points, equirectangular about
 * their own midpoint latitude — accurate enough for a 15 m threshold check. */
function pointDistM(alat: number, alon: number, blat: number, blon: number): number {
  const latMidRad = ((alat + blat) / 2) * (Math.PI / 180);
  const dy = (alat - blat) * M_PER_DEG_LAT;
  const dx = (alon - blon) * M_PER_DEG_LON * Math.cos(latMidRad);
  return Math.hypot(dx, dy);
}

/** Stationary-run collapse (data/analysis/way-curation.md, "On smoothing it
 * out"): where consecutive fixes stay within 15 m of the run's first fix for
 * more than 20 s, replace the whole run with ONE centroid point (mean
 * lat/lon/ele, first t). Pure; operates on the point order as given. */
export function collapseStationaryRuns(ride: RidePoints): RidePoints {
  const RADIUS_M = 15;
  const MIN_DURATION_S = 20;
  const n = ride.lat.length;
  const outT: number[] = [];
  const outLat: number[] = [];
  const outLon: number[] = [];
  const outEle: number[] = [];
  let collapsedPoints = 0;
  let runsCollapsed = 0;

  let i = 0;
  while (i < n) {
    let j = i;
    while (
      j + 1 < n &&
      pointDistM(ride.lat[i], ride.lon[i], ride.lat[j + 1], ride.lon[j + 1]) <= RADIUS_M
    ) {
      j += 1;
    }
    const duration = ride.t[j] - ride.t[i];
    if (j > i && duration > MIN_DURATION_S) {
      let sla = 0, slo = 0, sel = 0;
      for (let k = i; k <= j; k++) {
        sla += ride.lat[k];
        slo += ride.lon[k];
        sel += ride.ele[k];
      }
      const count = j - i + 1;
      outT.push(ride.t[i]);
      outLat.push(sla / count);
      outLon.push(slo / count);
      outEle.push(sel / count);
      collapsedPoints += count;
      runsCollapsed += 1;
      i = j + 1;
    } else {
      outT.push(ride.t[i]);
      outLat.push(ride.lat[i]);
      outLon.push(ride.lon[i]);
      outEle.push(ride.ele[i]);
      i += 1;
    }
  }

  console.log(
    `collapseStationaryRuns: ${runsCollapsed} run(s), ${collapsedPoints} raw points -> ` +
      `${runsCollapsed} centroid point(s); ${n} -> ${outT.length} points`,
  );

  return {
    name: ride.name,
    t: Float64Array.from(outT),
    lat: Float64Array.from(outLat),
    lon: Float64Array.from(outLon),
    ele: Float64Array.from(outEle),
  };
}

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
  ride = collapseStationaryRuns(ride);
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
