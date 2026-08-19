/** Parity harness: run the TS core over the 125 archived commute rides and
 * compare per-ride sector times against the validated Python pipeline
 * (data/analysis/02_analysis.py + 03_gates.py, cycle 003).
 *
 * Usage:
 *   node --experimental-strip-types harness/parity.ts <data-dir> [py-csv]
 *
 * <data-dir> = Qualifire/data (activities/, activity-index.csv).
 * [py-csv] = per-ride sector times dumped from the Python pipeline by
 * harness/dump_py_sector_times.py. Writes ts_sector_times.csv and
 * parity_summary.txt next to [py-csv]. See PARITY.md for the recipe.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  parseGpx, toXY, meanOrigin, medoidIndex, buildReference,
  projectRideOffline, computeKinematics, sectorTimes, gateChainages,
  LiveProjector, GateDetector, CORRIDOR_M,
  type RidePoints, type RefLine, type TrackId, type SectorResult,
} from '../src/index.ts';

const DATA = process.argv[2] ?? path.resolve(import.meta.dirname, '../../../data');
const PY_CSV = process.argv[3] ?? '/tmp/parity/py_sector_times.csv';
const OUT_DIR = path.dirname(PY_CSV);

// Cycle 020: TrackId gained MorningB (a single-ride reference, not a
// medoid) — this parity harness still only handles the three
// parity-anchored, multi-ride tracks it always has.
const TRACKS: Record<Exclude<TrackId, 'MorningB'>, [string, string]> = {
  Morning: ['home2work', 'main'],
  EveningA: ['work2home', 'A'],
  EveningB: ['work2home', 'B'],
};

function loadIndex(): Map<string, string[]> {
  const rows = fs.readFileSync(path.join(DATA, 'activity-index.csv'), 'utf8').replace(/\r/g, '').trim().split('\n');
  const header = rows[0].split(',');
  const iFile = header.indexOf('filename');
  const iRoute = header.indexOf('route');
  const iVar = header.indexOf('variant');
  const m = new Map<string, string[]>();
  for (const row of rows.slice(1)) {
    const c = row.split(',');
    const key = `${c[iRoute]}|${(c[iVar] ?? '').trim()}`;
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push(c[iFile]);
  }
  return m;
}

interface RideAnalysis {
  name: string;
  t: Float64Array;
  x: Float64Array; y: Float64Array;
  s: Float64Array; xtd: Float64Array;
  stopped: Uint8Array;
  sectors: SectorResult[];
}

const lines: string[] = [];
const out = (s: string) => { console.log(s); lines.push(s); };

const t0 = Date.now();
const index = loadIndex();
const tsRows: string[] = ['track,ride,sector,t_a,t_b,raw_s,stopped_s,moving_s,flag'];
const perTrack = new Map<TrackId, { ref: RefLine; rides: RideAnalysis[] }>();

for (const track of Object.keys(TRACKS) as Exclude<TrackId, 'MorningB'>[]) {
  const [route, variant] = TRACKS[track];
  const files = (index.get(`${route}|${variant}`) ?? []).slice().sort();
  const rides: RidePoints[] = files.map((f) =>
    parseGpx(fs.readFileSync(path.join(DATA, 'activities', f), 'utf8'), f.replace(/\.gpx$/, '')));
  const { lat0, lon0 } = meanOrigin(rides);
  const mi = medoidIndex(rides, lat0, lon0);
  const ref = buildReference(rides[mi], lat0, lon0);
  out(`${track}: ${rides.length} rides, ref=${rides[mi].name} Lref=${ref.length.toFixed(3)}`);
  const gates = gateChainages(track);
  const analyses: RideAnalysis[] = [];
  for (const ride of rides) {
    const { x, y } = toXY(ride.lat, ride.lon, lat0, lon0);
    const { s, xtd } = projectRideOffline(x, y, ref);
    const { stopped } = computeKinematics(ride.t, x, y);
    const sectors = sectorTimes({ t: ride.t, s, xtd, stopped }, gates);
    analyses.push({ name: ride.name, t: ride.t, x, y, s, xtd, stopped, sectors });
    for (const r of sectors) {
      const f6 = (v: number | null) => (v === null ? '' : v.toFixed(6));
      tsRows.push([track, ride.name, r.sector, f6(r.tA), f6(r.tB), f6(r.rawS), f6(r.stoppedS), f6(r.movingS), r.flag].join(','));
    }
  }
  perTrack.set(track, { ref, rides: analyses });
}
fs.writeFileSync(path.join(OUT_DIR, 'ts_sector_times.csv'), tsRows.join('\n') + '\n');

// ---------------- offline parity vs Python ----------------
interface Row { tA: string; tB: string; raw: string; st: string; mov: string; flag: string }
function readCsv(p: string): Map<string, Row> {
  const rows = fs.readFileSync(p, 'utf8').replace(/\r/g, '').trim().split('\n').slice(1);
  const m = new Map<string, Row>();
  for (const row of rows) {
    const c = row.split(',');
    m.set(`${c[0]}|${c[1]}|${c[2]}`, { tA: c[3], tB: c[4], raw: c[5], st: c[6], mov: c[7], flag: c[8] });
  }
  return m;
}
const py = readCsv(PY_CSV);
const ts = readCsv(path.join(OUT_DIR, 'ts_sector_times.csv'));
out(`\n=== offline parity: ${py.size} Python rows vs ${ts.size} TS rows ===`);
let flagMismatch = 0;
let compared = 0;
const maxAbs: Record<string, number> = { tA: 0, tB: 0, raw: 0, st: 0, mov: 0 };
const perSectorMax = new Map<string, number>();
const mismatches: string[] = [];
for (const [key, p] of py) {
  const q = ts.get(key);
  if (!q) { mismatches.push(`MISSING in TS: ${key}`); continue; }
  if (p.flag !== q.flag) { flagMismatch++; mismatches.push(`FLAG ${key}: py=${p.flag} ts=${q.flag}`); continue; }
  for (const f of ['tA', 'tB', 'raw', 'st', 'mov'] as const) {
    if (p[f] === '' || q[f] === '') continue;
    const d = Math.abs(parseFloat(p[f]) - parseFloat(q[f]));
    if (d > maxAbs[f]) maxAbs[f] = d;
    if (f === 'mov') {
      const [trk, , sec] = key.split('|');
      const sk = `${trk} S${sec}`;
      perSectorMax.set(sk, Math.max(perSectorMax.get(sk) ?? 0, d));
    }
  }
  compared++;
}
out(`rows compared: ${compared}/${py.size}; flag mismatches: ${flagMismatch}`);
out(`max |delta| over all compared rows (seconds):`);
out(`  gate crossings  t_a ${maxAbs.tA.toExponential(2)}  t_b ${maxAbs.tB.toExponential(2)}`);
out(`  raw ${maxAbs.raw.toExponential(2)}  stopped ${maxAbs.st.toExponential(2)}  moving ${maxAbs.mov.toExponential(2)}`);
out(`max |delta moving| per track/sector:`);
for (const [k, v] of [...perSectorMax.entries()].sort()) out(`  ${k}: ${v.toExponential(2)} s`);
for (const m of mismatches.slice(0, 20)) out(`  ${m}`);

// ---------------- live gate-detection simulation ----------------
// Python detection_sim (03_gates.py): forward-only projection, no re-acq,
// first-fix arm tolerance 20 m -> measured 3 missed gates on clean rides.
// The D-016 amendments (400 m forward re-acq + 50 m arming) must fix those 3
// without introducing double-fires (impossible by construction: monotonic
// chainage + in-order latch).
out(`\n=== live gate-detection simulation ===`);
const modes = [
  { label: 'python-equivalent (no re-acq, arm<20m)         ', reacq: 0, vmax: 0, arm: 20 },
  { label: 'D-016(a) as written (fixed 400m re-acq, arm<50m)', reacq: 400, vmax: 0, arm: 50 },
  { label: 'D-016(a) time-aware (400m floor, vmax 15 m/s)   ', reacq: 400, vmax: 15, arm: 50 },
];
for (const mode of modes) {
  let total = 0, missClean = 0, missDetour = 0, est = 0, skipped = 0;
  const bad: string[] = [];
  for (const [track, { ref, rides }] of perTrack) {
    const gates = gateChainages(track);
    for (const ra of rides) {
      const proj = new LiveProjector(ref, { reacqForwardM: mode.reacq, vMaxReacq: mode.vmax });
      const det = new GateDetector(gates, mode.arm);
      let fired = 0;
      for (let i = 0; i < ra.t.length; i++) {
        const fix = proj.update(ra.x[i], ra.y[i], ra.t[i]);
        for (const ev of det.update(ra.t[i], fix.s)) {
          fired++;
          if (ev.estimated) est++;
        }
      }
      total += gates.length;
      skipped += det.skippedGates.length;
      const unresolved = gates.length - fired - det.skippedGates.length;
      if (unresolved > 0) {
        let offCount = 0;
        for (let i = 0; i < ra.xtd.length; i++) if (ra.xtd[i] > CORRIDOR_M) offCount++;
        const detour = offCount / ra.xtd.length > 0.01;
        if (detour) missDetour += unresolved;
        else { missClean += unresolved; bad.push(`${track}:${ra.name.slice(0, 13)} (-${unresolved})`); }
      }
    }
  }
  out(`${mode.label}: ${total} passages | clean-ride hard misses ${missClean} (${(100 * missClean / total).toFixed(1)}%) | detour misses ${missDetour} | fired-estimated ${est} | skipped->sector-estimated ${skipped}`);
  if (bad.length) out(`  clean rides with hard misses: ${bad.join(', ')}`);
}
out(`\ndone in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
fs.writeFileSync(path.join(OUT_DIR, 'parity_summary.txt'), lines.join('\n') + '\n');
