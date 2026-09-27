/**
 * QA — cycle15 brief 14 (Nathan 2026-09-27): usage-biased ordering for the
 * RECORD tab's START / GOING TO place pills. Pure-function tests only —
 * landmarkUsageCounts() takes an injectable countForWay so no results-store
 * seeding is needed here.
 *
 * store/landmarkUsage.ts is imported dynamically, after the JSON loader hook
 * is registered, because it pulls in resultsStore.ts -> catalogStore.ts ->
 * seed.ts, which does a bare `.json` import (catalog.seed.json) that Node
 * cannot resolve without the hook — same shim, same reason, as
 * resultsstore_suite.ts / catalogdelete_suite.ts.
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { assert, test } from './lib.ts';
import type { Landmark, Route } from '../src/store/types.ts';

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const { landmarkUsageCounts, sortLandmarksByUsage } = await import('../src/store/landmarkUsage.ts');

// ------------------------------------------------------------------ helpers

function route(id: string, startLandmarkId: string, endLandmarkId: string, wayIds: string[]): Route {
  return { id, startLandmarkId, endLandmarkId, wayIds };
}

function landmark(id: string): Landmark {
  return {
    id,
    label: id,
    lat: 0,
    lon: 0,
    radiusM: 100,
    activeFromMs: 0,
    activeUntilMs: null,
    offerAtStart: true,
  };
}

// --------------------------------------------------------------------- tests

test('landmarkUsageCounts sums start+end usage, loop counted once', () => {
  const routes = [
    route('route:ab', 'A', 'B', ['w1', 'w2']),
    route('route:bc', 'B', 'C', ['w3']),
    route('route:aa', 'A', 'A', ['w4']),
  ];
  const counts = { w1: 3, w2: 1, w3: 2, w4: 5 } as Record<string, number>;
  const result = landmarkUsageCounts({ routes }, (wayId) => counts[wayId] ?? 0);
  assert(result.get('A') === 9, `expected A:9, got ${result.get('A')}`);
  assert(result.get('B') === 6, `expected B:6, got ${result.get('B')}`);
  assert(result.get('C') === 2, `expected C:2, got ${result.get('C')}`);
});

test('landmarkUsageCounts omits landmarks whose routes all count zero', () => {
  const routes = [route('route:ab', 'A', 'B', ['w1'])];
  const result = landmarkUsageCounts({ routes }, () => 0);
  assert(!result.has('A'), 'A should be absent, not zero');
  assert(!result.has('B'), 'B should be absent, not zero');
});

test('sortLandmarksByUsage ranks most-used first, ties keep input order', () => {
  const list = [landmark('L1'), landmark('L2'), landmark('L3')];
  const counts = new Map([['L2', 2], ['L3', 2]]);
  const sorted = sortLandmarksByUsage(list, counts);
  assert(
    sorted.map((l) => l.id).join(',') === 'L2,L3,L1',
    `expected L2,L3,L1, got ${sorted.map((l) => l.id).join(',')}`,
  );
});

test('sortLandmarksByUsage with an empty counts map returns an equal but new array', () => {
  const list = [landmark('L1'), landmark('L2'), landmark('L3')];
  const sorted = sortLandmarksByUsage(list, new Map());
  assert(sorted !== list, 'expected a new array, got the same reference');
  assert(sorted.length === list.length && sorted.every((l, i) => l === list[i]), 'expected same order/contents');
});
