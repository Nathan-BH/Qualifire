/**
 * QA — B-40: the comparison window (`recorded` in lastRide.ts) must survive an
 * app restart. lastRide.ts persists it as a disposable JSON cache through the
 * FsAdapter seam (D-023: the raw JSONL stays the only truth — losing or
 * corrupting this cache must cost nothing but one restart's comparison
 * history). This suite exercises the persist/rehydrate round-trip and the
 * defensive decode entirely headless, against the memory FsAdapter.
 */
import { assert, test } from './lib.ts';
import { createMemoryFsAdapter } from '../src/storage/fsAdapter.ts';
import type { LiveEngineState } from '../src/live/engine.ts';
import {
  RECORDED_CACHE_FILE, decodeRecordedCache, flushRecordedCacheWrites,
  getLastRide, initRecordedPersistence, recordedResults, rememberRide,
  resetRecordedForTests,
} from '../src/ui/lastRide.ts';

function doneSector(movingS: number) {
  return { kind: 'done' as const, rawS: movingS, stoppedS: 0, movingS, interrupted: false, estimated: false };
}
function finishedState(movingS: number): LiveEngineState {
  return {
    phase: 'finished', track: 'Morning', sectors:
      [doneSector(100), doneSector(100), doneSector(100), doneSector(100)],
    currentSector: null, lastDone: 4,
    lap: { rawS: movingS, stoppedS: 0, movingS, estimated: false },
    gateFires: 5, fixesFed: 900, onRoute: true,
  } as LiveEngineState;
}

test('B-40: the comparison window survives a restart (persist -> rehydrate round-trip)', async () => {
  resetRecordedForTests();
  const fs = createMemoryFsAdapter();

  await initRecordedPersistence(fs); // no file yet
  assert(recordedResults().length === 0, 'arming on an empty disk must not change the window');

  rememberRide(finishedState(850));
  const lastRide = getLastRide();
  assert(lastRide !== null, 'rememberRide() should have recorded a finished ride');
  const atMs = lastRide!.atMs;

  await flushRecordedCacheWrites();
  assert(fs.files.has(RECORDED_CACHE_FILE), 'expected the cache write to land on disk');

  // Simulate the restart.
  resetRecordedForTests();
  assert(recordedResults().length === 0, 'reset must clear the in-memory window');

  await initRecordedPersistence(fs); // same adapter instance = same "disk"
  const results = recordedResults();
  assert(results.length === 1, `expected the cached ride to rehydrate, got ${results.length}`);
  assert(results[0].rideId === `session:${atMs}`, `expected rideId session:${atMs}, got ${results[0].rideId}`);
  assert(results[0].lap.movingS === 850, `expected movingS 850, got ${results[0].lap.movingS}`);
  assert(results[0].routeId === 'Morning', `expected routeId Morning, got ${results[0].routeId}`);

  // Idempotence: a second init on the same "disk" must not duplicate.
  await initRecordedPersistence(fs);
  assert(recordedResults().length === 1, 'a second init must dedupe by rideId, not duplicate');

  resetRecordedForTests();
});

test('B-40: missing cache file -> empty window, no throw', async () => {
  resetRecordedForTests();
  const fs = createMemoryFsAdapter();
  await initRecordedPersistence(fs);
  assert(recordedResults().length === 0, 'a missing cache file must leave the window empty');
  resetRecordedForTests();
});

test('B-40: corrupt or misshapen cache -> empty window, no throw', async () => {
  const badCaches = [
    '{nope', // JSON.parse throws
    '42', // not an object
    '{"results": 42}', // results not an array
    '{"schemaVersion":1,"results":[null,{"kind":"other"},{"kind":"rideResult","rideId":7}]}', // every entry invalid
  ];
  for (const text of badCaches) {
    resetRecordedForTests();
    const fs = createMemoryFsAdapter();
    fs.files.set(RECORDED_CACHE_FILE, text);
    await initRecordedPersistence(fs);
    assert(recordedResults().length === 0, `corrupt cache ${JSON.stringify(text)} must yield an empty window`);
    resetRecordedForTests();
  }

  assert(decodeRecordedCache('{nope') === null, 'decodeRecordedCache must return null on a JSON.parse throw');
  const empty = decodeRecordedCache('{"results":[]}');
  assert(empty !== null && empty.length === 0, 'decodeRecordedCache must return an empty array for an empty results list');
});

test('B-40: an estimated ride is never persisted (guard writes nothing)', async () => {
  resetRecordedForTests();
  const fs = createMemoryFsAdapter();
  await initRecordedPersistence(fs);

  const state = {
    ...finishedState(700),
    lap: { rawS: 700, stoppedS: null, movingS: null, estimated: true },
  } as LiveEngineState;
  rememberRide(state);

  await flushRecordedCacheWrites();
  assert(!fs.files.has(RECORDED_CACHE_FILE), 'an estimated ride must never trigger a cache write');
  assert(recordedResults().length === 0, 'an estimated ride must never join the comparison window');

  resetRecordedForTests();
});
