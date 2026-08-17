/** QA harness plumbing: a dependency-free test registry (PASS/FAIL/SKIP) and
 * fixture-replay helpers built ON TOP of app/core (never re-implementing it).
 *
 * Run everything via:  node --experimental-strip-types app/tests/run.ts
 * Fixtures are built by build_fixtures.ts and committed under fixtures/.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  toXY, projectRideOffline, computeKinematics, sectorTimes, gateChainages,
  LiveProjector, GateDetector,
  type RefLine, type TrackId, type LiveOptions,
} from '../core/src/index.ts';

export const TESTS_DIR = import.meta.dirname;
export const FIXTURES_DIR = path.join(TESTS_DIR, 'fixtures');

// ---------------------------------------------------------------- registry

class SkipSignal extends Error {}

export function skip(note: string): never {
  throw new SkipSignal(note);
}

interface TestCase { name: string; fn: () => void | Promise<void> }
const tests: TestCase[] = [];

export function test(name: string, fn: () => void | Promise<void>): void {
  tests.push({ name, fn });
}

export function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

/** Numeric equality with tolerance; both-null counts as equal. */
export function numEq(a: number | null, b: number | null, tol: number): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) <= tol;
}

export const r6 = (v: number): number => Math.round(v * 1e6) / 1e6;

export async function runAll(): Promise<{ pass: number; fail: number; skipped: number }> {
  let pass = 0, fail = 0, skipped = 0;
  for (const tc of tests) {
    try {
      await tc.fn();
      pass++;
      console.log(`PASS  ${tc.name}`);
    } catch (e) {
      if (e instanceof SkipSignal) {
        skipped++;
        console.log(`SKIP  ${tc.name} — ${e.message}`);
      } else {
        fail++;
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`FAIL  ${tc.name} — ${msg}`);
      }
    }
  }
  console.log(`\n${tests.length} tests: ${pass} pass, ${fail} fail, ${skipped} skip`);
  return { pass, fail, skipped };
}

// ---------------------------------------------------------------- fixture IO

export interface FixtureFixes { t: number[]; lat: number[]; lon: number[]; ele: number[] }

export interface SectorRow {
  sector: number; flag: string;
  tA: number | null; tB: number | null;
  rawS: number | null; stoppedS: number | null; movingS: number | null;
}

export interface LiveSnapshot {
  events: { g: number; t: number; est: boolean }[];
  skipped: number[];
  finalS: number;
}

export interface Fixture {
  name: string;
  track: TrackId;
  source: string;
  note: string;
  downsample: number;
  pyReferenceMode: 'values' | 'flags' | null;
  pyReference: SectorRow[] | null;
  fixes: FixtureFixes;
  expected: {
    offline: SectorRow[];
    live: LiveSnapshot;
    liveNoReacq?: LiveSnapshot;
  };
}

export function loadJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
}

export function loadFixture(name: string): Fixture {
  const p = path.join(FIXTURES_DIR, `${name}.json`);
  assert(fs.existsSync(p), `fixture missing: ${p} (run build_fixtures.ts)`);
  return loadJson<Fixture>(p);
}

export interface RefsFile {
  generated: string;
  builderChecks: { name: string; pass: boolean; detail: string }[];
  tracks: Record<TrackId, {
    medoid: string; length: number; lat0: number; lon0: number;
    rx: number[]; ry: number[]; ch: number[];
  }>;
}

let refsCache: RefsFile | null = null;
export function loadRefs(): RefsFile {
  if (!refsCache) {
    const p = path.join(FIXTURES_DIR, 'refs.json');
    assert(fs.existsSync(p), `refs missing: ${p} (run build_fixtures.ts)`);
    refsCache = loadJson<RefsFile>(p);
  }
  return refsCache;
}

export function refFor(track: TrackId): RefLine {
  const r = loadRefs().tracks[track];
  const ch = Float64Array.from(r.ch);
  return {
    rx: Float64Array.from(r.rx), ry: Float64Array.from(r.ry), ch,
    lat0: r.lat0, lon0: r.lon0, length: ch[ch.length - 1],
  };
}

// ---------------------------------------------------------------- replay

/** Offline pipeline (project -> kinematics -> sectors), rounded to 1e-6 s. */
export function analyzeOffline(fixes: FixtureFixes, ref: RefLine, track: TrackId): SectorRow[] {
  const { x, y } = toXY(fixes.lat, fixes.lon, ref.lat0, ref.lon0);
  const { s, xtd } = projectRideOffline(x, y, ref);
  const { stopped } = computeKinematics(fixes.t, x, y);
  const rows = sectorTimes({ t: fixes.t, s, xtd, stopped }, gateChainages(track));
  const rn = (v: number | null) => (v === null ? null : r6(v));
  return rows.map((r) => ({
    sector: r.sector, flag: r.flag,
    tA: rn(r.tA), tB: rn(r.tB), rawS: rn(r.rawS), stoppedS: rn(r.stoppedS), movingS: rn(r.movingS),
  }));
}

export interface LiveRun extends LiveSnapshot {
  /** chainage never decreased across the whole stream */
  monotonic: boolean;
  /** fired gate indices strictly increasing (=> no double fire, in order) */
  inOrder: boolean;
}

/** 1 Hz live replay through LiveProjector + GateDetector, rounded to 1e-6 s. */
export function runLive(
  fixes: FixtureFixes, ref: RefLine, track: TrackId, opts: Partial<LiveOptions> = {},
): LiveRun {
  const { x, y } = toXY(fixes.lat, fixes.lon, ref.lat0, ref.lon0);
  const proj = new LiveProjector(ref, opts);
  const det = new GateDetector(gateChainages(track), opts.armWithinM);
  const events: LiveSnapshot['events'] = [];
  let monotonic = true;
  let prevS = -Infinity;
  for (let i = 0; i < fixes.t.length; i++) {
    const fix = proj.update(x[i], y[i], fixes.t[i]);
    if (fix.s < prevS) monotonic = false;
    prevS = fix.s;
    for (const ev of det.update(fixes.t[i], fix.s)) {
      events.push({ g: ev.gateIndex, t: r6(ev.time), est: ev.estimated });
    }
  }
  let inOrder = true;
  for (let i = 1; i < events.length; i++) if (events[i].g <= events[i - 1].g) inOrder = false;
  return { events, skipped: [...det.skippedGates], finalS: r6(prevS), monotonic, inOrder };
}

/** Compare sector rows (actual vs expected) with a numeric tolerance. */
export function compareSectors(
  actual: SectorRow[], expected: SectorRow[], tol: number, flagsOnly = false,
): void {
  assert(actual.length === expected.length, `sector count ${actual.length} != ${expected.length}`);
  for (let i = 0; i < expected.length; i++) {
    const a = actual[i], e = expected[i];
    assert(a.flag === e.flag, `S${e.sector} flag: actual=${a.flag} expected=${e.flag}`);
    if (flagsOnly) continue;
    for (const f of ['tA', 'tB', 'rawS', 'stoppedS', 'movingS'] as const) {
      assert(numEq(a[f], e[f], tol), `S${e.sector} ${f}: actual=${a[f]} expected=${e[f]} (tol ${tol})`);
    }
  }
}

/** Compare against embedded python-dump rows: flags always; values only where
 * the dump recorded one (it leaves fields empty on excluded rows even when a
 * partial crossing exists — empty means "not recorded", never "engine null"). */
export function compareSectorsToPy(
  actual: SectorRow[], py: SectorRow[], tol: number, flagsOnly = false,
): void {
  assert(actual.length === py.length, `sector count ${actual.length} != ${py.length}`);
  for (let i = 0; i < py.length; i++) {
    const a = actual[i], e = py[i];
    assert(a.flag === e.flag, `S${e.sector} flag: actual=${a.flag} python=${e.flag}`);
    if (flagsOnly) continue;
    for (const f of ['tA', 'tB', 'rawS', 'stoppedS', 'movingS'] as const) {
      if (e[f] === null) continue;
      assert(a[f] !== null && numEq(a[f], e[f], tol),
        `S${e.sector} ${f}: actual=${a[f]} python=${e[f]} (tol ${tol})`);
    }
  }
}

export function compareLive(actual: LiveSnapshot, expected: LiveSnapshot): void {
  assert(actual.events.length === expected.events.length,
    `live events ${actual.events.length} != ${expected.events.length}`);
  for (let i = 0; i < expected.events.length; i++) {
    const a = actual.events[i], e = expected.events[i];
    assert(a.g === e.g && a.est === e.est && numEq(a.t, e.t, 1e-6),
      `live event ${i}: actual g=${a.g} t=${a.t} est=${a.est}; expected g=${e.g} t=${e.t} est=${e.est}`);
  }
  assert(actual.skipped.join(',') === expected.skipped.join(','),
    `skipped gates [${actual.skipped}] != [${expected.skipped}]`);
}
