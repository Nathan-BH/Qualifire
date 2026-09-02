/**
 * QA — cycle 024 (WP-A1): the persistent per-ride results store (results/)
 * and its integration into lastRide.ts's comparison window. Supersedes
 * results_cache_suite.ts (moved to safe_to_delete/) — every guarantee that
 * suite locked has a successor case here (mapped in each test's comment),
 * plus the new store's own round-trip, corruption-tolerance, and backfill
 * behaviour.
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { assert, test, loadFixture, refFor as fixtureRefFor } from './lib.ts';
import { createMemoryFsAdapter, type FsAdapter } from '../src/storage/fsAdapter.ts';
import { encodeEnd, encodeFix, encodeHeader } from '../src/storage/jsonl.ts';
import { deriveRideResult } from '../src/store/derive.ts';
import { ranks } from '../src/store/results.ts';
import { RESULT_SCHEMA_VERSION, type RideResult } from '../src/store/types.ts';
import { gateChainages } from '../core/src/index.ts';
import type { LiveEngineState } from '../src/live/engine.ts';

// App code (resultsStore.ts, lastRide.ts) imports catalog.seed.json as a bare
// `.json` — Metro bundles that directly, Node needs a loader hook. Same shim,
// same reason, as live_colour_suite.ts/results_cache_suite.ts: the modules
// under test are pulled in DYNAMICALLY, after the hook exists, since static
// imports are linked before any module body (including this hook) runs.
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const resultsStore = await import('../src/store/resultsStore.ts');
const lastRide = await import('../src/ui/lastRide.ts');
// Same reason: live/tracks.ts reads catalog.seed.json as a bare .json import.
const { catalogTrackSpecs } = await import('../src/live/tracks.ts');

// ------------------------------------------------------------------ helpers

function doneSector(movingS: number) {
  return { kind: 'done' as const, rawS: movingS, stoppedS: 0, movingS, interrupted: false, estimated: false };
}

/** Mirrors results_cache_suite.ts's finishedState — a clean, 4-sector,
 * finished ride for rememberRide(). */
function finishedState(track: string, movingS: number): LiveEngineState {
  return {
    phase: 'finished', track, sectors:
      [doneSector(movingS / 4), doneSector(movingS / 4), doneSector(movingS / 4), doneSector(movingS / 4)],
    currentSector: null, lastDone: 4,
    lap: { rawS: movingS, stoppedS: 0, movingS, estimated: false },
    gateFires: 5, fixesFed: 900, onRoute: true, anyAnchored: false,
  } as LiveEngineState;
}

function makeResult(
  rideId: string, routeId: string, startedAtMs: number, movingS: number,
  quality: RideResult['lap']['quality'] = 'clean',
): RideResult {
  return {
    kind: 'rideResult',
    schemaVersion: RESULT_SCHEMA_VERSION,
    rideId,
    startedAtMs,
    routeId,
    source: 'app',
    lap: { rawS: movingS, movingS: quality === 'clean' || quality === 'interrupted' ? movingS : null, quality },
    sectors: [
      { index: 1, fromChainageM: 0, toChainageM: 1000, rawS: movingS, movingS: quality === 'estimated' ? null : movingS, quality: quality === 'estimated' ? 'estimated' : 'clean' },
    ],
    derivedBy: { engineVersion: 'live', gateSetVersion: 1, resultSchemaVersion: RESULT_SCHEMA_VERSION },
  };
}

async function writeRideFile(
  fs: FsAdapter, rideId: string, t: readonly number[], lat: readonly number[], lon: readonly number[],
): Promise<void> {
  let text = encodeHeader(rideId, t[0] * 1000);
  for (let i = 0; i < t.length; i++) {
    text += encodeFix({ tUnixMs: t[i] * 1000, lat: lat[i], lon: lon[i] });
  }
  text += encodeEnd(t[t.length - 1] * 1000, t.length);
  await fs.ensureDir('rides');
  await fs.writeText(`rides/${rideId}.jsonl`, text);
}

// ============================================================ resultsStore.ts

test('resultsstore: save -> simulated restart -> rehydrates, and feeds recordedResults() (supersedes B-40 round-trip)', async () => {
  lastRide.resetRecordedForTests();
  const fs = createMemoryFsAdapter();
  await resultsStore.initResultsStore(fs);
  const r = makeResult('realride1', 'Morning', 1000, 850);
  await resultsStore.saveResult(r);
  await resultsStore.flushResultWrites();
  assert(fs.files.has('results/realride1.json'), 'expected the result to land on disk');

  // Simulate a restart.
  resultsStore.resetResultsStoreForTests();
  assert(resultsStore.storedResults().length === 0, 'reset must clear the in-memory store');
  const rehydrated = await resultsStore.initResultsStore(fs);
  assert(rehydrated.length === 1, `expected 1 rehydrated result, got ${rehydrated.length}`);
  assert(rehydrated[0].rideId === 'realride1', `rideId ${rehydrated[0].rideId}`);
  assert(rehydrated[0].routeId === 'Morning', `routeId ${rehydrated[0].routeId}`);
  assert(rehydrated[0].lap.movingS === 850, `movingS ${rehydrated[0].lap.movingS}`);

  // initRideHistory puts a rankable stored result into recordedResults().
  lastRide.resetRecordedForTests();
  await lastRide.initRideHistory(fs);
  assert(
    lastRide.recordedResults().some((x) => x.rideId === 'realride1'),
    'initRideHistory must hydrate recordedResults() from the store',
  );
  lastRide.resetRecordedForTests();
});

test('resultsstore (WP-Q): storedResultsForRoute filters to one route, ascending startedAtMs, [] for an unknown route', async () => {
  const fs = createMemoryFsAdapter();
  await resultsStore.initResultsStore(fs);
  await resultsStore.saveResult(makeResult('m2', 'Morning', 2000, 800));
  await resultsStore.saveResult(makeResult('m1', 'Morning', 1000, 810));
  await resultsStore.saveResult(makeResult('e1', 'EveningA', 1500, 700));
  await resultsStore.flushResultWrites();

  const morning = resultsStore.storedResultsForRoute('Morning');
  assert(morning.length === 2, `expected 2 Morning results, got ${morning.length}`);
  assert(morning[0].rideId === 'm1' && morning[1].rideId === 'm2', `expected ascending startedAtMs order, got ${morning.map((r) => r.rideId)}`);
  assert(morning.every((r) => r.routeId === 'Morning'), 'every hit is really Morning');
  assert(resultsStore.storedResultsForRoute('NoSuchRoute').length === 0, 'unknown route: []');
});

test('resultsstore: corrupt result file and corrupt index.json each degrade silently; valid siblings survive (supersedes B-40 corrupt-cache case)', async () => {
  const fs = createMemoryFsAdapter();
  await resultsStore.initResultsStore(fs);
  await resultsStore.saveResult(makeResult('rideA', 'Morning', 1000, 800));
  await resultsStore.saveResult(makeResult('rideB', 'Morning', 2000, 810));
  await resultsStore.flushResultWrites();

  fs.files.set('results/rideA.json', '{not json');
  fs.files.set('results/index.json', '{also not json');

  resultsStore.resetResultsStoreForTests();
  const results = await resultsStore.initResultsStore(fs);
  assert(results.length === 1, `expected only the valid sibling to survive, got ${results.length}`);
  assert(results[0].rideId === 'rideB', `expected rideB to survive, got ${results[0].rideId}`);
  assert(resultsStore.getStoredResult('rideA') === null, 'corrupt result file must not rehydrate');
  assert(resultsStore.getStoredResult('rideB') !== null, 'valid sibling must still be readable');
});

test('resultsstore: an estimated-lap RideResult saves to the store but never enters recordedResults() (D-028)', async () => {
  lastRide.resetRecordedForTests();
  const fs = createMemoryFsAdapter();
  await resultsStore.initResultsStore(fs);
  const est = makeResult('estride1', 'Morning', 1000, 700, 'estimated');
  await resultsStore.saveResult(est);
  await resultsStore.flushResultWrites();
  assert(resultsStore.getStoredResult('estride1') !== null, 'the estimated result must still be stored');

  lastRide.resetRecordedForTests();
  await lastRide.initRideHistory(fs);
  assert(
    !lastRide.recordedResults().some((x) => x.rideId === 'estride1'),
    'an estimated lap must never join the comparison window, even after hydration',
  );
  lastRide.resetRecordedForTests();
});

test('resultsstore: rememberRide(state, meta) writes results/<realRideId>.json with real chainages, and recordedResults() carries the real id', async () => {
  lastRide.resetRecordedForTests();
  const fs = createMemoryFsAdapter();
  await resultsStore.initResultsStore(fs);

  const state = finishedState('Morning', 900);
  lastRide.rememberRide(state, { rideId: 'liveride1', startedAtMs: 5_000_000 });
  await resultsStore.flushResultWrites();

  assert(fs.files.has('results/liveride1.json'), 'expected a real-rideId result file');
  const stored = JSON.parse(fs.files.get('results/liveride1.json')!) as RideResult;
  assert(stored.rideId === 'liveride1', `stored rideId ${stored.rideId}`);
  assert(stored.startedAtMs === 5_000_000, `stored startedAtMs ${stored.startedAtMs}`);
  const gates = gateChainages('Morning');
  assert(stored.sectors[0].fromChainageM === gates[0], `S1 fromChainageM ${stored.sectors[0].fromChainageM} != ${gates[0]}`);
  assert(stored.sectors[0].toChainageM === gates[1], `S1 toChainageM ${stored.sectors[0].toChainageM} != ${gates[1]}`);
  assert(stored.sectors[3].toChainageM === gates[4], `S4 toChainageM ${stored.sectors[3].toChainageM} != ${gates[4]}`);

  assert(
    lastRide.recordedResults().some((x) => x.rideId === 'liveride1'),
    'recordedResults() must contain the real rideId, not a session: stand-in',
  );
  lastRide.resetRecordedForTests();
});

test('resultsstore: rememberRide(state) with NO meta writes nothing and stays session:-only (back-compat lock)', async () => {
  lastRide.resetRecordedForTests();
  const fs = createMemoryFsAdapter();
  await resultsStore.initResultsStore(fs);

  const state = finishedState('Morning', 900);
  lastRide.rememberRide(state);
  await resultsStore.flushResultWrites();

  assert(
    ![...fs.files.keys()].some((k) => k.startsWith('results/session:')),
    'a meta-less rememberRide() must never write a store file',
  );
  const rec = lastRide.getLastRide();
  assert(rec !== null && rec.rideId.startsWith('session:'), `expected a session: id, got ${rec?.rideId}`);
  assert(
    lastRide.recordedResults().some((x) => x.rideId === rec!.rideId),
    'the in-memory push must still happen with no meta',
  );
  lastRide.resetRecordedForTests();
});

test('resultsstore: backfill derives a result matching a direct deriveRideResult call on the same points', async () => {
  const fs = createMemoryFsAdapter();
  const fx = loadFixture('clean_morning');
  const rideId = 'backfillride1';
  await writeRideFile(fs, rideId, fx.fixes.t, fx.fixes.lat, fx.fixes.lon);

  resultsStore.resetResultsStoreForTests();
  await resultsStore.initResultsStore(fs);
  await resultsStore.backfillMissingResults(fs, [rideId]);

  const stored = resultsStore.getStoredResult(rideId);
  assert(stored !== null, 'expected the backfill to produce a stored result');
  assert(stored!.routeId === 'Morning', `routeId ${stored!.routeId}`);

  const direct = deriveRideResult({
    rideId, t: fx.fixes.t, lat: fx.fixes.lat, lon: fx.fixes.lon,
    ref: fixtureRefFor('Morning'), gates: gateChainages('Morning'),
    routeId: 'Morning', gateSetVersion: 1,
    engineVersion: resultsStore.BACKFILL_ENGINE_VERSION, source: 'app',
  });
  assert(stored!.lap.quality === direct.lap.quality, `lap quality ${stored!.lap.quality} != ${direct.lap.quality}`);
  assert(
    Math.abs((stored!.lap.movingS ?? 0) - (direct.lap.movingS ?? 0)) < 1e-6,
    `lap movingS ${stored!.lap.movingS} != ${direct.lap.movingS}`,
  );
  assert(
    Math.abs(stored!.lap.rawS - direct.lap.rawS) < 1e-6,
    `lap rawS ${stored!.lap.rawS} != ${direct.lap.rawS}`,
  );
});

test('lastRide: WP-B fix B2 — initRideHistory excludes mode:"free" index entries from backfill, even when status is "ended" (D-025)', async () => {
  lastRide.resetRecordedForTests();
  resultsStore.resetResultsStoreForTests();
  const fs = createMemoryFsAdapter();
  const fx = loadFixture('clean_morning');

  // Two ended rides with IDENTICAL fix data — a clean lap of Morning that
  // backfillMissingResults would happily derive a route PB from. The only
  // difference is the index entry's `mode`. If B2's filter is missing or
  // broken, BOTH rides get backfilled and freeRideId ends up with a
  // 'Morning' result — exactly the leak the inspector flagged as HIGH.
  const freeRideId = 'freeride-b2';
  const routeRideId = 'routeride-b2';
  await writeRideFile(fs, freeRideId, fx.fixes.t, fx.fixes.lat, fx.fixes.lon);
  await writeRideFile(fs, routeRideId, fx.fixes.t, fx.fixes.lat, fx.fixes.lon);
  await fs.writeText('index.json', JSON.stringify({
    schemaVersion: 1,
    rides: [
      { rideId: freeRideId, file: `${freeRideId}.jsonl`, startMs: fx.fixes.t[0] * 1000,
        endMs: fx.fixes.t[fx.fixes.t.length - 1] * 1000, nFixes: fx.fixes.t.length,
        status: 'ended', mode: 'free' },
      // No `mode` field at all — the back-compat case (every ride recorded
      // before B2, and B2's own rebuildIndex() recovery path) must still
      // backfill exactly as before.
      { rideId: routeRideId, file: `${routeRideId}.jsonl`, startMs: fx.fixes.t[0] * 1000,
        endMs: fx.fixes.t[fx.fixes.t.length - 1] * 1000, nFixes: fx.fixes.t.length,
        status: 'ended' },
    ],
  }));

  await resultsStore.initResultsStore(fs);
  await lastRide.initRideHistory(fs);
  // initRideHistory's own migration/recovery backfill runs fire-and-forget
  // (a `void (async () => {...})()` — see its doc comment: "never blocks
  // boot"). Every step in that chain (fs reads/writes, backfillMissingResults
  // itself) resolves on the microtask queue with the in-memory adapter (no
  // real I/O delay) — one macrotask tick drains it, same trick as flushing a
  // promise chain in any Node test. flushResultWrites() then catches any
  // still-pending result-file write.
  await new Promise<void>((resolve) => setImmediate(resolve));
  await resultsStore.flushResultWrites();

  assert(resultsStore.getStoredResult(freeRideId) === null,
    'a free-mode ended ride must never be backfilled into a stored (route) result');
  const routeStored = resultsStore.getStoredResult(routeRideId);
  assert(routeStored !== null, 'a mode-less (back-compat) ended ride must still backfill normally');
  assert(routeStored!.routeId === 'Morning', `routeId ${routeStored!.routeId}`);
  assert(!lastRide.recordedResults().some((x) => x.rideId === freeRideId),
    'a free ride must never enter the RECORD-tab comparison window (D-025)');

  lastRide.resetRecordedForTests();
  resultsStore.resetResultsStoreForTests();
});

/**
 * The real shape of the WP-A1 acceptance-rule defect (adversarial review
 * 2026-08-23). detour_eveningb is a REAL archived EveningB commute that
 * detoured off-route. Offline, projectRideOffline() re-acquires globally after
 * the detour and jumps chainage 0 -> 5112 m in one fix against EVENINGA's
 * reference; crossTime() reads that jump as an upward crossing of four of
 * EveningA's five gates, all inside the same inter-fix interval; the sectors so
 * manufactured span ~0 s, so sectorTimes() finds no off-corridor fix inside
 * them and flags them 'clean'. Result: a CLEAN 60.2 s lap on a 5,225 m route.
 * Under the brief's original quality-only acceptance rule that was stored, it
 * ranks, and it becomes EveningA's all-time best forever — every later genuine
 * ~820 s EveningA ride coloured against a fabricated 60 s benchmark.
 *
 * The first half of this test asserts the trap is still armed (quality alone
 * accepts it), so the second half proves the corridor-coverage gate is what
 * closes it — not some incidental change elsewhere. Deleting the gate fails
 * this test; weakening core's corridor rule fails its first half loudly.
 */
test('resultsstore: a jump-manufactured lap is rejected — detour_eveningb must never become a 60 s EveningA PB', async () => {
  const fx = loadFixture('detour_eveningb');
  const specs = catalogTrackSpecs();
  const eveningA = specs.find((sp) => sp.id === 'EveningA');
  assert(eveningA !== undefined, 'expected EveningA among the catalog specs');

  // 1. The trap: quality alone (the brief's original rule) accepts this.
  const bait = deriveRideResult({
    rideId: 'detourbait', t: fx.fixes.t, lat: fx.fixes.lat, lon: fx.fixes.lon,
    ref: eveningA!.ref, gates: eveningA!.gates, routeId: 'EveningA', gateSetVersion: 1,
    engineVersion: resultsStore.BACKFILL_ENGINE_VERSION, source: 'app',
  });
  assert(
    bait.routeId !== null && (bait.lap.quality === 'clean' || bait.lap.quality === 'interrupted'),
    `the quality-only rule no longer accepts this ride (quality ${bait.lap.quality}) — ` +
    'the regression this test guards has moved; re-derive the fixture before relaxing the gate',
  );
  const span = eveningA!.gates[eveningA!.gates.length - 1] - eveningA!.gates[0];
  assert(
    bait.lap.rawS < 300 && span / bait.lap.rawS > 25,
    `expected a physically impossible lap, got ${bait.lap.rawS.toFixed(1)} s over ${span.toFixed(0)} m`,
  );
  assert(ranks(bait), 'the bait lap must be rankable — that is what makes it dangerous');

  // 2. The gate: backfill must refuse it. Its TRUE route (EveningB) is honestly
  // 'missed' here (the detour is a real off-corridor excursion, D-015), so the
  // whole ride is correctly left unmatched rather than matched to anything.
  const fs = createMemoryFsAdapter();
  const rideId = 'detoureveningb1';
  await writeRideFile(fs, rideId, fx.fixes.t, fx.fixes.lat, fx.fixes.lon);
  resultsStore.resetResultsStoreForTests();
  await resultsStore.initResultsStore(fs);
  await resultsStore.backfillMissingResults(fs, [rideId]);

  const stored = resultsStore.getStoredResult(rideId);
  assert(
    stored === null,
    `a detoured ride must not be stored against any route, got ${stored?.routeId} ` +
    `lap ${stored?.lap.rawS.toFixed(1)} s (${stored?.lap.quality})`,
  );
  assert(fs.files.has('results/unmatched.json'), 'expected an unmatched.json marker');
  assert(
    !lastRide.recordedResults().some((r) => r.rideId === rideId),
    'a rejected backfill candidate must never reach the comparison window',
  );
  lastRide.resetRecordedForTests();
});

/**
 * The other side of the gate: it must cost no real history. Both genuine
 * commute fixtures still match their own route, and the lap they store is
 * still bit-for-bit the lap deriveRideResult produces — the gate only ever
 * refuses a candidate, it never alters an accepted one.
 */
test('resultsstore: the corridor-coverage gate leaves genuine backfill matches untouched', async () => {
  const specs = catalogTrackSpecs();
  for (const [fixture, track] of [['clean_eveninga', 'EveningA'], ['clean_eveningb', 'EveningB']] as const) {
    const fx = loadFixture(fixture);
    const spec = specs.find((sp) => sp.id === track);
    assert(spec !== undefined, `expected ${track} among the catalog specs`);
    const fs = createMemoryFsAdapter();
    const rideId = `genuine-${fixture}`;
    await writeRideFile(fs, rideId, fx.fixes.t, fx.fixes.lat, fx.fixes.lon);

    resultsStore.resetResultsStoreForTests();
    await resultsStore.initResultsStore(fs);
    await resultsStore.backfillMissingResults(fs, [rideId]);

    const stored = resultsStore.getStoredResult(rideId);
    assert(stored !== null, `${fixture}: the coverage gate must not reject a genuine ride`);
    assert(stored!.routeId === track, `${fixture}: routeId ${stored!.routeId}, expected ${track}`);
    const direct = deriveRideResult({
      rideId, t: fx.fixes.t, lat: fx.fixes.lat, lon: fx.fixes.lon,
      ref: spec!.ref, gates: spec!.gates, routeId: track, gateSetVersion: 1,
      engineVersion: resultsStore.BACKFILL_ENGINE_VERSION, source: 'app',
    });
    assert(stored!.lap.quality === direct.lap.quality, `${fixture}: lap quality ${stored!.lap.quality}`);
    assert(
      Math.abs(stored!.lap.rawS - direct.lap.rawS) < 1e-6,
      `${fixture}: lap rawS ${stored!.lap.rawS} != ${direct.lap.rawS}`,
    );
    assert(ranks(stored!), `${fixture}: a genuine clean/interrupted lap must still rank`);
  }
});

test('resultsstore: backfill of a nonsense ride yields no result and one unmatched marker; a second call does not retry it', async () => {
  const fs = createMemoryFsAdapter();
  const fx = loadFixture('clean_morning');
  const rideId = 'nonsenseride1';
  const shiftedLat = fx.fixes.lat.map((v) => v + 0.1); // well off every corridor
  await writeRideFile(fs, rideId, fx.fixes.t, shiftedLat, fx.fixes.lon);

  resultsStore.resetResultsStoreForTests();
  await resultsStore.initResultsStore(fs);
  await resultsStore.backfillMissingResults(fs, [rideId]);
  assert(resultsStore.getStoredResult(rideId) === null, 'a nonsense ride must not match any route');
  assert(fs.files.has('results/unmatched.json'), 'expected an unmatched.json marker');
  const unmatched = JSON.parse(fs.files.get('results/unmatched.json')!) as
    { entries: { rideId: string; engineVersion: string }[] };
  const mine = unmatched.entries.filter((e) => e.rideId === rideId);
  assert(mine.length === 1, `expected exactly 1 unmatched entry, got ${mine.length}`);
  assert(mine[0].engineVersion === resultsStore.BACKFILL_ENGINE_VERSION, 'unmatched entry engineVersion mismatch');

  // Simulate a restart: the marker must be respected, not just remembered in-process.
  resultsStore.resetResultsStoreForTests();
  await resultsStore.initResultsStore(fs);
  await resultsStore.backfillMissingResults(fs, [rideId]);
  assert(resultsStore.getStoredResult(rideId) === null, 'still no result after a second backfill');
  const unmatchedAfter = JSON.parse(fs.files.get('results/unmatched.json')!) as
    { entries: { rideId: string; engineVersion: string }[] };
  assert(
    unmatchedAfter.entries.filter((e) => e.rideId === rideId).length === 1,
    'a re-marked ride must not duplicate its unmatched entry',
  );
});

test('resultsstore: removeStoredResult deletes the file, the index entry, and the in-memory entry', async () => {
  const fs = createMemoryFsAdapter();
  await resultsStore.initResultsStore(fs);
  await resultsStore.saveResult(makeResult('rideX', 'Morning', 1000, 800));
  await resultsStore.saveResult(makeResult('rideY', 'Morning', 2000, 810));
  await resultsStore.flushResultWrites();

  await resultsStore.removeStoredResult('rideX');
  await resultsStore.flushResultWrites();

  assert(!fs.files.has('results/rideX.json'), 'the result file must be deleted');
  assert(resultsStore.getStoredResult('rideX') === null, 'the in-memory entry must be gone');
  assert(resultsStore.storedResults().length === 1, 'the sibling must survive');
  const index = JSON.parse(fs.files.get('results/index.json')!) as { entries: { rideId: string }[] };
  assert(!index.entries.some((e) => e.rideId === 'rideX'), 'the index entry must be removed');
  assert(index.entries.some((e) => e.rideId === 'rideY'), 'the sibling index entry must survive');
});

test('resultsstore: saveResult for an existing rideId replaces, never duplicates (single index entry)', async () => {
  const fs = createMemoryFsAdapter();
  await resultsStore.initResultsStore(fs);
  await resultsStore.saveResult(makeResult('rideZ', 'Morning', 1000, 800));
  await resultsStore.saveResult(makeResult('rideZ', 'Morning', 1000, 777));
  await resultsStore.flushResultWrites();

  assert(resultsStore.storedResults().length === 1, `expected 1 stored result, got ${resultsStore.storedResults().length}`);
  assert(resultsStore.getStoredResult('rideZ')!.lap.movingS === 777, 'the second save must win');
  const index = JSON.parse(fs.files.get('results/index.json')!) as { entries: { rideId: string }[] };
  assert(index.entries.filter((e) => e.rideId === 'rideZ').length === 1, 'the index must not duplicate the entry');
});

