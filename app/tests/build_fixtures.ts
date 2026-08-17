/** Fixture library builder — converts selected REAL rides from data/activities/
 * into small, self-contained fix-stream fixtures under app/tests/fixtures/,
 * plus two synthetic cases (mid-ride kill, first-ever ride).
 *
 * Every fixture embeds an `expected` snapshot computed HERE, by app/core itself,
 * from exactly the numbers stored in the fixture (refs rounded first, then
 * expectations computed) — so the regression suite detects any future change in
 * engine behaviour. Where the cycle-004 Python parity dump is available, the
 * matching rows are embedded as `pyReference` — an anchor independent of the
 * TS engine — and verified at build time.
 *
 * Usage:
 *   node --experimental-strip-types app/tests/build_fixtures.ts [dataDir] [pyCsv]
 * Defaults: dataDir = ../../data, pyCsv = /tmp/parity/py_sector_times.csv.
 *
 * Fixture choices are deterministic (first sorted candidate matching the rule),
 * so a rebuild against the same archive reproduces the library byte-for-byte.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  parseGpx, toXY, meanOrigin, medoidIndex, buildReference, cumdist, projectRideOffline,
  type RidePoints, type RefLine, type TrackId,
} from '../core/src/index.ts';
import {
  FIXTURES_DIR, analyzeOffline, runLive, r6,
  type FixtureFixes, type Fixture, type SectorRow, type RefsFile,
} from './lib.ts';

const DATA = process.argv[2] ?? path.resolve(import.meta.dirname, '../../data');
const PY_CSV = process.argv[3] ?? '/tmp/parity/py_sector_times.csv';

const TRACKS: Record<TrackId, [string, string]> = {
  Morning: ['home2work', 'main'],
  EveningA: ['work2home', 'A'],
  EveningB: ['work2home', 'B'],
};

/** PARITY.md ground truth — the builder refuses to emit refs that disagree. */
const PARITY_REFS: Record<TrackId, { medoid: string; length: number }> = {
  Morning: { medoid: '20260430-1208-home2work-18317063653', length: 5651.278 },
  EveningA: { medoid: '20260724-1838-work2home-19448004625', length: 5556.478 },
  EveningB: { medoid: '20260612-2223-work2home-18895067518', length: 5837.910 },
};

// ---------------------------------------------------------------- inputs

function loadIndex(): Map<string, string[]> {
  const rows = fs.readFileSync(path.join(DATA, 'activity-index.csv'), 'utf8')
    .replace(/\r/g, '').trim().split('\n');
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

/** Python parity rows keyed track|ride|sector, or null if the dump is absent. */
function loadPyRows(): Map<string, SectorRow> | null {
  if (!fs.existsSync(PY_CSV)) return null;
  const rows = fs.readFileSync(PY_CSV, 'utf8').replace(/\r/g, '').trim().split('\n').slice(1);
  const m = new Map<string, SectorRow>();
  for (const row of rows) {
    const c = row.split(',');
    const num = (v: string) => (v === '' ? null : parseFloat(v));
    m.set(`${c[0]}|${c[1]}|${c[2]}`, {
      sector: parseInt(c[2], 10), flag: c[8],
      tA: num(c[3]), tB: num(c[4]), rawS: num(c[5]), stoppedS: num(c[6]), movingS: num(c[7]),
    });
  }
  return m;
}

// ---------------------------------------------------------------- helpers

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

/** Round ref coords to mm and RECOMPUTE chainage from the rounded coords, then
 * round chainage to 1e-6 m. What is stored is exactly what replay uses. */
function fixtureRef(ref: RefLine): RefLine {
  const rx = Float64Array.from(ref.rx, (v) => round(v, 3));
  const ry = Float64Array.from(ref.ry, (v) => round(v, 3));
  const ch = Float64Array.from(cumdist(rx, ry), (v) => round(v, 6));
  return { rx, ry, ch, lat0: ref.lat0, lon0: ref.lon0, length: ch[ch.length - 1] };
}

function toFixes(ride: RidePoints): FixtureFixes {
  return {
    t: Array.from(ride.t),
    lat: Array.from(ride.lat),
    lon: Array.from(ride.lon),
    ele: Array.from(ride.ele),
  };
}

/** Keep every `step`-th fix plus the last one. Harmless for semantic cases;
 * never applied to the parity-anchored full-resolution fixtures. */
function downsample(f: FixtureFixes, step: number): FixtureFixes {
  const pick = (a: number[]) => a.filter((_, i) => i % step === 0 || i === a.length - 1);
  return { t: pick(f.t), lat: pick(f.lat), lon: pick(f.lon), ele: pick(f.ele) };
}

const failures: string[] = [];
function check(cond: boolean, msg: string): void {
  if (!cond) failures.push(msg);
}

interface Analyzed { name: string; fixes: FixtureFixes; offline: SectorRow[] }

function buildFixture(
  name: string, track: TrackId, source: string, note: string,
  fixes: FixtureFixes, ref: RefLine, downsampleStep: number,
  py: Map<string, SectorRow> | null, srcRideName: string | null,
  extraModes = false,
): Fixture {
  const offline = analyzeOffline(fixes, ref, track);
  const live = runLive(fixes, ref, track);
  check(live.monotonic && live.inOrder, `${name}: live invariants violated at build time`);
  let pyReference: SectorRow[] | null = null;
  let pyReferenceMode: Fixture['pyReferenceMode'] = null;
  if (py && srcRideName) {
    const rows = [1, 2, 3, 4]
      .map((s) => py.get(`${track}|${srcRideName}|${s}`))
      .filter((r): r is SectorRow => r !== undefined);
    if (rows.length === 4) {
      pyReference = rows;
      pyReferenceMode = downsampleStep === 1 ? 'values' : 'flags';
      for (let i = 0; i < 4; i++) {
        check(offline[i].flag === rows[i].flag,
          `${name}: S${i + 1} flag ${offline[i].flag} != python ${rows[i].flag}`);
        if (pyReferenceMode === 'values') {
          for (const f of ['tA', 'tB', 'rawS', 'stoppedS', 'movingS'] as const) {
            const a = offline[i][f], b = rows[i][f];
            // The python dump leaves fields EMPTY on excluded rows even when a
            // partial crossing exists — empty means "not recorded", not "null".
            if (b === null) continue;
            check(a !== null && Math.abs(a - b) <= 0.05,
              `${name}: S${i + 1} ${f} ${a} vs python ${b}`);
          }
        }
      }
    }
  }
  const fixture: Fixture = {
    name, track, source, note, downsample: downsampleStep, pyReferenceMode, pyReference,
    fixes,
    expected: {
      offline,
      live: { events: live.events, skipped: live.skipped, finalS: live.finalS },
    },
  };
  if (extraModes) {
    // python-equivalent detector mode (no re-acq, 20 m arming) — PARITY.md row 1
    const nr = runLive(fixes, ref, track, { reacqForwardM: 0, vMaxReacq: 0, armWithinM: 20 });
    fixture.expected.liveNoReacq = { events: nr.events, skipped: nr.skipped, finalS: nr.finalS };
  }
  return fixture;
}

function writeFixture(f: Fixture): void {
  const p = path.join(FIXTURES_DIR, `${f.name}.json`);
  fs.writeFileSync(p, JSON.stringify(f) + '\n');
  const live = f.expected.live;
  const est = live.events.filter((e) => e.est).length;
  console.log(
    `${f.name}: ${f.fixes.t.length} fixes, offline [${f.expected.offline.map((r) => r.flag).join(', ')}], ` +
    `live fired ${live.events.length} (est ${est}) skipped [${live.skipped}]  <- ${f.source}`);
}

// ---------------------------------------------------------------- main

fs.mkdirSync(FIXTURES_DIR, { recursive: true });
const index = loadIndex();
const py = loadPyRows();
console.log(py ? `python parity dump found: ${PY_CSV}` : `NOTE: no python parity dump at ${PY_CSV} — fixtures will carry engine snapshots only`);

const refs: Partial<RefsFile['tracks']> = {};
const perTrack = new Map<TrackId, { ref: RefLine; rides: Analyzed[]; medoid: string }>();

for (const track of Object.keys(TRACKS) as TrackId[]) {
  const [route, variant] = TRACKS[track];
  const files = (index.get(`${route}|${variant}`) ?? []).slice().sort();
  const rides: RidePoints[] = files.map((f) =>
    parseGpx(fs.readFileSync(path.join(DATA, 'activities', f), 'utf8'), f.replace(/\.gpx$/, '')));
  const { lat0, lon0 } = meanOrigin(rides);
  const mi = medoidIndex(rides, lat0, lon0);
  const ref = fixtureRef(buildReference(rides[mi], lat0, lon0));
  const medoid = rides[mi].name;
  check(medoid === PARITY_REFS[track].medoid,
    `${track}: medoid ${medoid} != PARITY.md ${PARITY_REFS[track].medoid}`);
  check(Math.abs(ref.length - PARITY_REFS[track].length) <= 0.05,
    `${track}: ref length ${ref.length.toFixed(3)} != PARITY.md ${PARITY_REFS[track].length}`);
  console.log(`${track}: ${rides.length} rides, medoid ${medoid}, Lref ${ref.length.toFixed(3)} m`);
  refs[track] = {
    medoid, length: r6(ref.length), lat0, lon0,
    rx: Array.from(ref.rx), ry: Array.from(ref.ry), ch: Array.from(ref.ch),
  };
  const analyzed: Analyzed[] = rides.map((r) => {
    const fixes = toFixes(r);
    return { name: r.name, fixes, offline: analyzeOffline(fixes, ref, track) };
  });
  perTrack.set(track, { ref, rides: analyzed, medoid });
}

/** First sorted all-clean ride that the live detector also handles perfectly;
 * the medoid itself is excluded (projecting a ride onto itself is too easy). */
function pickClean(track: TrackId): Analyzed {
  const { ref, rides, medoid } = perTrack.get(track)!;
  for (const ra of rides) {
    if (ra.name === medoid) continue;
    if (!ra.offline.every((r) => r.flag === 'clean')) continue;
    const live = runLive(ra.fixes, ref, track);
    if (live.events.length === 5 && live.events.every((e) => !e.est) && live.skipped.length === 0) return ra;
  }
  throw new Error(`no clean candidate for ${track}`);
}

function pickByPrefix(track: TrackId, prefix: string): Analyzed {
  const ra = perTrack.get(track)!.rides.find((r) => r.name.startsWith(prefix));
  if (!ra) throw new Error(`no ride ${prefix} in ${track}`);
  return ra;
}

function pickDetour(track: TrackId): Analyzed {
  const ra = perTrack.get(track)!.rides.find((r) => r.offline.some((s) => s.flag === 'excluded_offroute'));
  if (!ra) throw new Error(`no detour candidate in ${track}`);
  return ra;
}

const fixtures: Fixture[] = [];
const ref = (t: TrackId) => perTrack.get(t)!.ref;

// 1-3: one clean ride per track (full resolution, python-anchored)
const cleanM = pickClean('Morning');
const cleanA = pickClean('EveningA');
const cleanB = pickClean('EveningB');
fixtures.push(buildFixture('clean_morning', 'Morning', `${cleanM.name}.gpx`,
  'clean commute, all sectors clean, all 5 gates fire real', cleanM.fixes, ref('Morning'), 1, py, cleanM.name));
fixtures.push(buildFixture('clean_eveninga', 'EveningA', `${cleanA.name}.gpx`,
  'clean commute, all sectors clean, all 5 gates fire real', cleanA.fixes, ref('EveningA'), 1, py, cleanA.name));
fixtures.push(buildFixture('clean_eveningb', 'EveningB', `${cleanB.name}.gpx`,
  'clean commute, all sectors clean, all 5 gates fire real', cleanB.fixes, ref('EveningB'), 1, py, cleanB.name));

// 4: the 237 s recording-gap ride (D-016(a) time-aware re-acquisition proof)
const gap = pickByPrefix('Morning', '20260521-1056');
let maxGap = 0;
for (let i = 1; i < gap.fixes.t.length; i++) maxGap = Math.max(maxGap, gap.fixes.t[i] - gap.fixes.t[i - 1]);
check(maxGap >= 200, `gap ride: expected a >=200 s recording gap, found ${maxGap.toFixed(0)} s`);
fixtures.push(buildFixture('gap_20260521', 'Morning', `${gap.name}.gpx`,
  `237 s recording gap rejoining ~1462 m downstream (PARITY.md); max dt in stream = ${maxGap.toFixed(0)} s`,
  gap.fixes, ref('Morning'), 1, py, gap.name, true));

// 5: late-GPS-lock ride — first fix 56 m past START -> D-016(b) skip
const late = pickByPrefix('Morning', '20260805-1034');
fixtures.push(buildFixture('latelock_20260805', 'Morning', `${late.name}.gpx`,
  'first fix ~56 m past START (beyond 50 m arming) -> START skipped, sector 1 estimated/excluded',
  late.fixes, ref('Morning'), 1, py, late.name));

// 6: detour ride (downsampled 2x — semantics, not microsecond parity)
const det = pickDetour('EveningB');
fixtures.push(buildFixture('detour_eveningb', 'EveningB', `${det.name}.gpx`,
  'real detour: at least one sector excluded_offroute (D-015)',
  downsample(det.fixes, 2), ref('EveningB'), 2, py, det.name));

// 7: wrong direction — the clean Morning ride replayed against the EveningA track
fixtures.push(buildFixture('wrongdir_eveninga', 'EveningA', `${cleanM.name}.gpx (as wrong-direction input)`,
  'home2work ride fed to the EveningA (work2home) detector: no clean sectors, no real gate fires',
  downsample(cleanM.fixes, 2), ref('EveningA'), 2, null, null));

// 8: synthetic mid-ride kill — clean Morning ride truncated between G2 and G3
{
  const full = analyzeOfflineS(cleanM.fixes, ref('Morning'));
  let cut = full.findIndex((s) => s >= 3400);
  if (cut < 0) throw new Error('truncation point not reached');
  const sl = (a: number[]) => a.slice(0, cut);
  const trunc: FixtureFixes = {
    t: sl(cleanM.fixes.t), lat: sl(cleanM.fixes.lat), lon: sl(cleanM.fixes.lon), ele: sl(cleanM.fixes.ele),
  };
  const fx = buildFixture('synthetic_truncated', 'Morning', `${cleanM.name}.gpx truncated at fix ${cut} (chainage ~3400 m)`,
    'mid-ride kill: stream ends between G2 and G3; gates 0-2 fired, no fabricated G3/FINISH, sectors 3-4 excluded_nocross',
    trunc, ref('Morning'), 1, null, null);
  check(fx.expected.live.events.length === 3, `synthetic_truncated: expected 3 fired gates, got ${fx.expected.live.events.length}`);
  fixtures.push(fx);
}

// 9: synthetic first-ever ride — clean stream, zero benchmark history
fixtures.push({
  ...buildFixture('synthetic_firstride', 'EveningB', `${cleanB.name}.gpx (as first-ever ride)`,
    'first-ever ride: engine must produce full sector results with NO benchmark context; empty-history stats return NaN -> app shows no colour (D-008/D-013)',
    downsample(cleanB.fixes, 2), ref('EveningB'), 2, null, null),
});

/** chainage series only, for picking the truncation index */
function analyzeOfflineS(fixes: FixtureFixes, refLine: RefLine): Float64Array {
  const { x, y } = toXY(fixes.lat, fixes.lon, refLine.lat0, refLine.lon0);
  return projectRideOffline(x, y, refLine).s;
}

for (const f of fixtures) writeFixture(f);

const refsOut: RefsFile = {
  generated: new Date().toISOString(),
  builderChecks: failures.length === 0
    ? [{ name: 'all build-time checks', pass: true, detail: 'medoids+lengths match PARITY.md; python rows verified where embedded' }]
    : failures.map((m) => ({ name: 'build-time check', pass: false, detail: m })),
  tracks: refs as RefsFile['tracks'],
};
fs.writeFileSync(path.join(FIXTURES_DIR, 'refs.json'), JSON.stringify(refsOut) + '\n');

if (failures.length) {
  console.error(`\nBUILD-TIME CHECK FAILURES (${failures.length}):`);
  for (const m of failures) console.error(`  ${m}`);
  process.exitCode = 1;
} else {
  console.log(`\nfixture library built: ${fixtures.length} fixtures + refs.json, all build-time checks passed`);
}
