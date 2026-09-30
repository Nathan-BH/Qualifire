/**
 * virgin-cycle18 brief 04: ui/rideHomes.ts — every finished ride has a home
 * in RESULTS (a way result, a way's reference, or a free-ride record).
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { assert, test } from './lib.ts';
import { createMemoryFsAdapter } from '../src/storage/fsAdapter.ts';
import { emptyCatalog } from '../src/store/catalog.ts';
import { RESULT_SCHEMA_VERSION, type RideResult, type Landmark } from '../src/store/types.ts';
import { effectiveRideSportId } from '../src/store/sports.ts';

// Same JSON shim as resultsstore_suite.ts: app modules import catalog.seed.json
// as a bare .json; modules under test are imported DYNAMICALLY after the hook.
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const rideHomes = await import('../src/ui/rideHomes.ts');
const resultsStore = await import('../src/store/resultsStore.ts');
const freeRides = await import('../src/store/freeRides.ts');
const catalogStore = await import('../src/store/catalogStore.ts');
const sportStore = await import('../src/store/sportStore.ts');

function lm(id: string, lat: number, lon: number, radiusM: number): Landmark {
  return { id, label: id, lat, lon, radiusM, activeFromMs: 0, activeUntilMs: null, offerAtStart: true };
}

function makeResult(
  rideId: string, wayId: string, startedAtMs: number, movingS: number,
  quality: RideResult['lap']['quality'] = 'clean',
): RideResult {
  return {
    kind: 'rideResult',
    schemaVersion: RESULT_SCHEMA_VERSION,
    rideId,
    startedAtMs,
    wayId,
    source: 'app',
    lap: { rawS: movingS, movingS: quality === 'clean' || quality === 'interrupted' ? movingS : null, quality },
    sectors: [
      { index: 1, fromChainageM: 0, toChainageM: 1000, rawS: movingS, movingS: quality === 'estimated' ? null : movingS, quality: quality === 'estimated' ? 'estimated' : 'clean' },
    ],
    derivedBy: { engineVersion: 'live', gateSetVersion: 1, resultSchemaVersion: RESULT_SCHEMA_VERSION },
  };
}

test('ridehomes: backfillCandidates — ended, not free MODE, not free-labelled', () => {
  const e = (rideId: string, status: 'ended' | 'recording', mode?: 'route' | 'free') =>
    ({ rideId, startMs: 1000, endMs: status === 'ended' ? 2000 : null, status, mode });
  const out = rideHomes.backfillCandidates(
    [e('a', 'ended'), e('b', 'recording'), e('c', 'ended', 'free'), e('d', 'ended', 'route')],
    (id) => id === 'd',
  );
  assert(out.map((r) => r.rideId).join() === 'a', `expected only a, got ${out.map((r) => r.rideId).join()}`);
});

test('ridehomes: orphanRides — a home is a way result, a reference designation or a free record; a recording ride is not finished', () => {
  const e = (rideId: string, status: 'ended' | 'recording' = 'ended', mode?: 'route' | 'free') =>
    ({ rideId, startMs: 1000, endMs: status === 'ended' ? 2000 : null, status, mode });
  const out = rideHomes.orphanRides(
    [e('route'), e('ref'), e('free'), e('orphan'), e('legacyfree', 'ended', 'free'), e('rec', 'recording')],
    (id) => id === 'route', (id) => id === 'ref', (id) => id === 'free',
  );
  assert(out.map((r) => r.rideId).join() === 'orphan,legacyfree', `got ${out.map((r) => r.rideId).join()}`);
});

test('ridehomes: settleRideHomes files every homeless ended ride as a free ride, once, with its own identity', async () => {
  freeRides.resetFreeRidesForTests();
  resultsStore.resetResultsStoreForTests();
  catalogStore.resetCatalogStoreForTests();
  const fs = createMemoryFsAdapter();
  await sportStore.initSportStore(fs);
  await catalogStore.initCatalogStore(fs);
  const user = emptyCatalog();
  user.landmarks = [lm('rh-a', 51.30, 4.50, 150), lm('rh-b', 51.32, 4.50, 150)];
  user.routes = [{ id: 'rh-a>rh-b', startLandmarkId: 'rh-a', endLandmarkId: 'rh-b', wayIds: ['RhWay'] }];
  user.ways = [{ id: 'RhWay', routeId: 'rh-a>rh-b', refLineId: 'RhWay', gateSetVersion: 1, seeded: false, referenceRideId: 'r-ref' }];
  user.gateSets = [{ wayId: 'RhWay', version: 1, chainageM: [50, 500, 1000, 1500, 1950], createdAtMs: 0 }];
  const errs = await catalogStore.saveUserCatalog(user);
  assert(errs.length === 0, `catalog must save, got ${errs.join('; ')}`);
  await resultsStore.initResultsStore(fs);
  await freeRides.initFreeRidePersistence(fs);
  await resultsStore.saveResult(makeResult('r-route', 'RhWay', 100000, 500));
  assert(resultsStore.getStoredResult('r-route') !== null, 'precondition: the timed ride is stored');
  freeRides.markRideFree('r-free', 300000, 60, null);
  await fs.writeText('index.json', JSON.stringify({ schemaVersion: 1, rides: [
    { rideId: 'r-route', file: 'rides/r-route.jsonl', startMs: 100000, endMs: 101000, nFixes: 2, status: 'ended' },
    { rideId: 'r-ref', file: 'rides/r-ref.jsonl', startMs: 200000, endMs: 201000, nFixes: 2, status: 'ended' },
    { rideId: 'r-free', file: 'rides/r-free.jsonl', startMs: 300000, endMs: 301000, nFixes: 2, status: 'ended' },
    { rideId: 'r-orphan', file: 'rides/r-orphan.jsonl', startMs: 400000, endMs: 400900, nFixes: 2, status: 'ended', sportId: 'cycling' },
    { rideId: 'r-legacy', file: 'rides/r-legacy.jsonl', startMs: 500000, endMs: 500500, nFixes: 2, status: 'ended', mode: 'free' },
    { rideId: 'r-rec', file: 'rides/r-rec.jsonl', startMs: 600000, endMs: null, nFixes: 1, status: 'recording' },
  ] }));
  const filed = await rideHomes.settleRideHomes(fs);
  assert(filed.join() === 'r-orphan,r-legacy', `expected the two homeless rides filed, got ${filed.join()}`);
  const free = freeRides.freeRideResults();
  assert(free.length === 3, `r-free + 2 filed, got ${free.length}`);
  const o = free.find((r) => r.rideId === 'r-orphan')!;
  assert(o.startedAtMs === 400000 && o.durationS === 0.9 && o.sportId === effectiveRideSportId('cycling', sportStore.currentSports()),
    `filed with its own identity, got ${JSON.stringify(o)}`);
  assert(free.find((r) => r.rideId === 'r-legacy')!.durationS === 0.5, 'a legacy free-mode ride is filed too');
  assert(freeRides.freeRideNear(free, 100000) === null && freeRides.freeRideNear(free, 200000) === null && freeRides.freeRideNear(free, 600000) === null,
    'a timed ride, a reference ride and a still-recording ride are never filed');
  const again = await rideHomes.settleRideHomes(fs);
  assert(again.length === 0 && freeRides.freeRideResults().length === 3, 'idempotent');
  await freeRides.flushFreeRideWrites();
  assert((fs.files.get('free-rides-cache.json') ?? '').includes('r-orphan'), 'persisted');
});
