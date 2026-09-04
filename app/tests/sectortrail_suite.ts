/**
 * QA — WP-K (phase 2): sectorTrailModel.ts's pure builders (storedSectorColours,
 * liveSectorColours, ALL_YELLOW) plus the end-to-end contract with
 * routeMapGeo.ts's sectorSpansFeatureCollection. Headless; no React, no expo.
 *
 * sectorTrailModel.ts imports colourModel.ts, which imports results.seed.json
 * (via store/seed.ts) as a bare `.json` — Metro bundles that directly, Node
 * needs an import attribute it cannot get without changing app code. Same
 * shim, same reason, as ridehistory_suite.ts/ridedetail_suite.ts: the module
 * under test is pulled in DYNAMICALLY, after the loader hook exists (a static
 * import is linked before any module body — including this hook — runs).
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import * as path from 'node:path';
import { assert, loadJson, test, TESTS_DIR } from './lib.ts';
import type { RouteAsset } from '../src/ui/routeMapMath.ts';
import { sectorSpansFeatureCollection } from '../src/ui/routeMapGeo.ts';
import type { LiveSector } from '../src/live/engine.ts';

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const {
  ALL_YELLOW, storedSectorColours, liveSectorColours,
} = await import('../src/ui/sectorTrailModel.ts');
const { MIN_HISTORY } = await import('../src/ui/colourModel.ts');

// ------------------------------------------------------------------ fixtures

interface Manifest { schemaVersion: number; projection: string; routes: Record<string, RouteAsset> }
const manifest = loadJson<Manifest>(path.join(TESTS_DIR, '..', 'assets', 'routes', 'routes.json'));

// n = MIN_HISTORY, best 100, mean 120 — enough comparable history to earn a tier.
const RICH = Array.from({ length: MIN_HISTORY }, (_, i) => 100 + i * 10);
// too little history — always 'neutral'.
const THIN = [100, 110];

// Paints EVERY tier (including neutral/est) to a distinct string, so a test
// that expects null proves the BUILDER withholds colour, not that the
// palette happened to return null.
const paintAll = (t: string): string => `P:${t}`;

type StoredLike = { index: number; movingS: number | null; quality: string };

function stored(sectors: StoredLike[]) {
  return { sectors };
}

// ------------------------------------------------------------- storedSectorColours

test('sectortrail: stored — no clean sector -> all null, length max-index+1', () => {
  const ride = stored([
    { index: 1, movingS: 90, quality: 'estimated' },
    { index: 2, movingS: 95, quality: 'missed' },
    { index: 3, movingS: 100, quality: 'interrupted' },
  ]);
  const out = storedSectorColours(ride, () => RICH, paintAll);
  assert(out.length === 4, `expected length 4, got ${out.length}`);
  assert(out.every((c) => c === null), `expected all null, got ${JSON.stringify(out)}`);
});

test('sectortrail: stored — tiers land on the span ending at that gate (purple/green/yellow)', () => {
  const ride = stored([
    { index: 1, movingS: 95, quality: 'clean' }, // < best(100) -> purple
    { index: 2, movingS: 115, quality: 'clean' }, // < mean(140) -> green
    { index: 3, movingS: 125, quality: 'clean' }, // < mean(140) -> green... need yellow case below
  ]);
  const out = storedSectorColours(ride, () => RICH, paintAll);
  assert(out[0] === null, 'index 0 always null');
  assert(out[1] === 'P:purple', `S1 expected P:purple, got ${out[1]}`);
});

test('sectortrail: stored — a value above the mean earns yellow', () => {
  // RICH = [100,110,120,130,140], best=100, mean=120
  const ride = stored([{ index: 1, movingS: 135, quality: 'clean' }]);
  const out = storedSectorColours(ride, () => RICH, paintAll);
  assert(out[1] === 'P:yellow', `expected P:yellow, got ${out[1]}`);
});

test('sectortrail: stored — a value between best and mean earns green', () => {
  const ride = stored([{ index: 1, movingS: 110, quality: 'clean' }]);
  const out = storedSectorColours(ride, () => RICH, paintAll);
  assert(out[1] === 'P:green', `expected P:green, got ${out[1]}`);
});

test('sectortrail: stored — neutral (< MIN_HISTORY) never paints even when paint would', () => {
  const ride = stored([{ index: 1, movingS: 95, quality: 'clean' }]);
  const out = storedSectorColours(ride, () => THIN, paintAll);
  assert(out.length === 2, `expected length 2, got ${out.length}`);
  assert(out[1] === null, `expected null on too-little history, got ${out[1]}`);
});

test('sectortrail: stored — interrupted / estimated / missed stay null with rich history', () => {
  const ride = stored([
    { index: 1, movingS: 95, quality: 'clean' },
    { index: 2, movingS: 95, quality: 'interrupted' },
    { index: 3, movingS: 95, quality: 'estimated' },
    { index: 4, movingS: null, quality: 'missed' },
  ]);
  const out = storedSectorColours(ride, () => RICH, paintAll);
  assert(out[1] === 'P:purple', `S1 clean expected coloured, got ${out[1]}`);
  assert(out[2] === null, 'S2 interrupted -> null');
  assert(out[3] === null, 'S3 estimated -> null');
  assert(out[4] === null, 'S4 missed -> null');
});

test('sectortrail: stored — unsorted sectors slot by index, not array position', () => {
  const ride = stored([
    { index: 3, movingS: 135, quality: 'clean' }, // yellow
    { index: 1, movingS: 95, quality: 'clean' }, // purple
    { index: 2, movingS: 110, quality: 'clean' }, // green
  ]);
  const out = storedSectorColours(ride, () => RICH, paintAll);
  assert(out.length === 4, `expected length 4, got ${out.length}`);
  assert(out[1] === 'P:purple', `index 1 expected P:purple, got ${out[1]}`);
  assert(out[2] === 'P:green', `index 2 expected P:green, got ${out[2]}`);
  assert(out[3] === 'P:yellow', `index 3 expected P:yellow, got ${out[3]}`);
});

test('sectortrail: stored — empty sectors -> [null] (index 0 slot only, reduce\'s 0-initial floor)', () => {
  // ride.sectors.reduce((m, s) => Math.max(m, s.index), 0) on [] yields 0, so
  // n+1 = 1 -> [null], matching the PRE-WP-K inline resultSectorColours/
  // sectorColoursFor behaviour for an empty sectors array ([null, ...[].map()]
  // = [null]) — not the empty [] a naive reading of "length = max index + 1"
  // might suggest. Documented here so the discrepancy is intentional, not lost.
  const out = storedSectorColours(stored([]), () => RICH, paintAll);
  assert(out.length === 1 && out[0] === null, `expected [null], got ${JSON.stringify(out)}`);
});

test('sectortrail: stored — hist is called with the sector index, once per clean sector', () => {
  const calls: number[] = [];
  const ride = stored([
    { index: 1, movingS: 95, quality: 'clean' },
    { index: 2, movingS: 95, quality: 'missed' },
    { index: 3, movingS: 95, quality: 'clean' },
  ]);
  storedSectorColours(ride, (i) => { calls.push(i); return RICH; }, paintAll);
  assert(JSON.stringify(calls) === JSON.stringify([1, 3]), `expected hist called for [1,3], got ${JSON.stringify(calls)}`);
});

// -------------------------------------------------------------- liveSectorColours

function done(movingS: number | null, opts: { interrupted?: boolean; estimated?: boolean } = {}): LiveSector {
  return {
    kind: 'done', rawS: movingS ?? 0, stoppedS: movingS, movingS,
    interrupted: opts.interrupted ?? false, estimated: opts.estimated ?? false,
  };
}

test('sectortrail: live — pending/current/missed -> all null, length sectors+1', () => {
  const sectors: LiveSector[] = [{ kind: 'pending' }, { kind: 'current' }, { kind: 'missed', reason: 'skipped' }];
  const out = liveSectorColours(sectors, () => RICH, paintAll);
  assert(out.length === 4, `expected length 4, got ${out.length}`);
  assert(out.every((c) => c === null), `expected all null, got ${JSON.stringify(out)}`);
});

test('sectortrail: live — done clean sectors paint by tier', () => {
  const sectors: LiveSector[] = [done(95), done(110), done(135)];
  const out = liveSectorColours(sectors, () => RICH, paintAll);
  assert(out[0] === null, 'index 0 always null');
  assert(out[1] === 'P:purple', `expected P:purple, got ${out[1]}`);
  assert(out[2] === 'P:green', `expected P:green, got ${out[2]}`);
  assert(out[3] === 'P:yellow', `expected P:yellow, got ${out[3]}`);
});

test('sectortrail: live — interrupted / estimated / movingS null done-sectors stay null', () => {
  const sectors: LiveSector[] = [
    done(95),
    done(95, { interrupted: true }),
    done(95, { estimated: true }),
    done(null),
  ];
  const out = liveSectorColours(sectors, () => RICH, paintAll);
  assert(out[1] === 'P:purple', `S1 clean expected coloured, got ${out[1]}`);
  assert(out[2] === null, 'S2 interrupted -> null');
  assert(out[3] === null, 'S3 estimated -> null');
  assert(out[4] === null, 'S4 movingS null -> null');
});

test('sectortrail: live — pre-lock (hist returns []) -> all null (D-025)', () => {
  const sectors: LiveSector[] = [done(95), done(110)];
  const out = liveSectorColours(sectors, () => [], paintAll);
  assert(out.every((c) => c === null), `expected all null pre-lock, got ${JSON.stringify(out)}`);
});

test('sectortrail: live/stored agreement — same moving times through both builders give identical arrays', () => {
  const times = [95, 110, 135];
  const liveOut = liveSectorColours(times.map((v) => done(v)), () => RICH, paintAll);
  const storedOut = storedSectorColours(
    stored(times.map((v, i) => ({ index: i + 1, movingS: v, quality: 'clean' }))),
    () => RICH,
    paintAll,
  );
  assert(JSON.stringify(liveOut) === JSON.stringify(storedOut),
    `live ${JSON.stringify(liveOut)} != stored ${JSON.stringify(storedOut)}`);
});

test('sectortrail: live — hist index is k+1', () => {
  const calls: number[] = [];
  const sectors: LiveSector[] = [done(95), done(110)];
  liveSectorColours(sectors, (i) => { calls.push(i); return RICH; }, paintAll);
  assert(JSON.stringify(calls) === JSON.stringify([1, 2]), `expected [1,2], got ${JSON.stringify(calls)}`);
});

// ------------------------------------------------------- sentinel + geo integration

test('sectortrail: ALL_YELLOW is a truthy no-op for the span builder, never mutated', () => {
  const fc = sectorSpansFeatureCollection(manifest.routes.Morning, ALL_YELLOW);
  assert(fc !== null, 'expected a non-null feature collection for Morning');
  assert(fc!.features.length === 4, `expected 4 features, got ${fc!.features.length}`);
  for (const f of fc!.features) {
    assert(!('colour' in f.properties), `expected no colour property, got ${JSON.stringify(f.properties)}`);
  }
  assert(ALL_YELLOW.length === 0, 'ALL_YELLOW must stay empty after use');
});

test('sectortrail: storedSectorColours output feeds sectorSpansFeatureCollection end-to-end', () => {
  const ride = stored([
    { index: 1, movingS: 95, quality: 'clean' }, // purple
    { index: 2, movingS: 110, quality: 'clean' }, // green
    { index: 3, movingS: 135, quality: 'clean' }, // yellow
    { index: 4, movingS: 95, quality: 'interrupted' }, // null
  ]);
  const out = storedSectorColours(ride, () => RICH, paintAll);
  const fc = sectorSpansFeatureCollection(manifest.routes.Morning, out);
  assert(fc !== null, 'expected a non-null feature collection');
  assert(fc!.features.length === 4, `expected 4 features, got ${fc!.features.length}`);
  for (const f of fc!.features) {
    const sector = f.properties.sector as number;
    const expected = out[sector] ?? null;
    if (expected === null) {
      assert(!('colour' in f.properties), `sector ${sector}: expected no colour, got ${JSON.stringify(f.properties)}`);
    } else {
      assert((f.properties as { colour?: string }).colour === expected,
        `sector ${sector}: expected colour ${expected}, got ${JSON.stringify(f.properties)}`);
    }
  }
});
