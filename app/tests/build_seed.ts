/**
 * Builds src/store/results.seed.json — the archive ghosts (D-018 pre-seed).
 *
 *   node --experimental-strip-types app/tests/build_seed.ts [dataDir]
 *
 * Nathan, 2026-08-16: seed the last 10 rides per route, each direction, so the
 * timing tower can place a live lap from day one. Every number is recomputed by
 * OUR pipeline from raw lat/lon/t (B-21's condition — never Strava's figures),
 * through the same deriveRideResult the app will use on its own recordings.
 *
 * Rides Nathan curated as `ignore` in data/analysis/ride_curation.json are
 * excluded: a route taken during roadworks, or a trace with a 2.3 km GPS jump,
 * must not become a benchmark anyone has to beat.
 *
 * Seeds carry source:'archive' ⇒ they rank as marked ghosts (D-028) and remain
 * demotable via tripwireDemoted while D-024's cruise-σ tripwire is unratified.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseGpx } from '../core/src/index.ts';
import { deriveRideResult } from '../src/store/derive.ts';
import { gateSetFor } from '../src/store/catalog.ts';
import type { Catalog, RideResult } from '../src/store/types.ts';
import { loadRefs, refFor } from './lib.ts';

const DATA = process.argv[2] ?? path.resolve(import.meta.dirname, '../../data');
const STORE = path.resolve(import.meta.dirname, '../src/store');
const PER_ROUTE = 10;
const ENGINE_VERSION = 'core-2026-08-15';

const catalog = JSON.parse(fs.readFileSync(path.join(STORE, 'catalog.seed.json'), 'utf8')) as Catalog;

const ignored = new Set<string>();
const curPath = path.join(DATA, 'analysis', 'ride_curation.json');
if (fs.existsSync(curPath)) {
  const cur = JSON.parse(fs.readFileSync(curPath, 'utf8')) as {
    ways: Record<string, { file: string; status: string }[]>;
  };
  for (const rides of Object.values(cur.ways)) {
    for (const r of rides) if (r.status === 'ignore' || r.status === 'drop') ignored.add(r.file);
  }
}

// activity-index.csv → route id per D-014/D-015 (route column + variant column)
// The index is CRLF (written on Windows) — strip \r or every last-column value
// carries one and nothing ever matches 'main'/'A'/'B'.
const rows = fs.readFileSync(path.join(DATA, 'activity-index.csv'), 'utf8')
  .replace(/\r/g, '').trim().split('\n');
const head = rows[0].split(',');
const col = (name: string) => head.indexOf(name);
type Row = { file: string; route: string; variant: string; start: string };
const rides: Row[] = rows.slice(1).map((line) => {
  const c = line.split(',');
  return { file: c[col('filename')], route: c[col('route')], variant: c[col('variant')],
    start: c[col('local_start')] };
});

function routeIdOf(r: Row): string | null {
  if (r.route === 'home2work' && r.variant === 'main') return 'Morning';
  if (r.route === 'work2home' && r.variant === 'A') return 'EveningA';
  if (r.route === 'work2home' && r.variant === 'B') return 'EveningB';
  return null;
}

loadRefs(); // fail loudly here if the parity fixture is missing
const out: RideResult[] = [];
const summary: Record<string, number> = {};

for (const routeId of ['Morning', 'EveningA', 'EveningB'] as const) {
  const gates = gateSetFor(catalog, routeId)!.chainageM;
  const ref = refFor(routeId);
  const picked = rides
    .filter((r) => routeIdOf(r) === routeId && !ignored.has(r.file))
    .sort((a, b) => (a.start < b.start ? -1 : 1))
    .slice(-PER_ROUTE);

  for (const r of picked) {
    const gpx = parseGpx(fs.readFileSync(path.join(DATA, 'activities', r.file), 'utf8'), r.file);
    const res = deriveRideResult({
      rideId: `seed:${r.file.replace(/\.gpx$/, '')}`,
      t: gpx.t, lat: gpx.lat, lon: gpx.lon, ref, gates,
      routeId, gateSetVersion: 1, engineVersion: ENGINE_VERSION, source: 'archive',
    });
    out.push(res);
    summary[`${routeId}:${res.lap.quality}`] = (summary[`${routeId}:${res.lap.quality}`] ?? 0) + 1;
  }
}

fs.writeFileSync(path.join(STORE, 'results.seed.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${out.length} seeded results to src/store/results.seed.json`);
console.log(summary);
for (const routeId of ['Morning', 'EveningA', 'EveningB']) {
  const laps = out.filter((r) => r.routeId === routeId && r.lap.movingS !== null)
    .map((r) => r.lap.movingS as number).sort((a, b) => a - b);
  if (laps.length) {
    const f = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
    console.log(`  ${routeId}: ${laps.length} rankable, pole ${f(laps[0])}, ` +
      `median ${f(laps[Math.floor(laps.length / 2)])}, slowest ${f(laps[laps.length - 1])}`);
  }
}
