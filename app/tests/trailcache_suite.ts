/**
 * virgin-cycle23 brief 01: trailCache.ts, the pure LRU + paced trail loader.
 * Headless: no React, no expo.
 */
import { assert, test } from './lib.ts';
import { LruCache, createTrailLoader, decimateFixes } from '../src/ui/trailCache.ts';

const LAT = 50;
const P0 = { lat: LAT, lon: 4 };
const FAR = { lat: LAT, lon: 4.001 };     // ~71 m east
const NEAR = { lat: LAT, lon: 4.00001 };  // ~0.7 m east

test('trailcache: LruCache evicts the least recently USED key, get refreshes recency, set on an existing key refreshes too', () => {
  const c = new LruCache<number>(2);
  c.set('a', 1); c.set('b', 2); c.get('a'); c.set('c', 3);
  assert(c.keys().join() === 'a,c', `keys ${c.keys().join()}`);
  c.set('a', 9);
  assert(c.keys().join() === 'c,a', `keys ${c.keys().join()}`);
  assert(c.size === 2, 'size 2');
});

test('trailcache: loader caches a decimated trail and reads each ride once', async () => {
  let calls = 0;
  const loader = createTrailLoader(async () => { calls++; return [P0, FAR]; }, 5, 2);
  const a = await loader.load('r1');
  const b = await loader.load('r1');
  assert(calls === 1, `calls ${calls}`);
  assert(a !== null && a.length === 2, 'length 2');
  assert(loader.peek('r1') === a && b === a, 'same array');
});

test('trailcache: loader caches null for a missing file (read once) and resolves null on a throwing reader', async () => {
  let calls = 0;
  const loader = createTrailLoader(async (id) => {
    if (id === 'bad') throw new Error('boom');
    calls++;
    return null;
  }, 5, 2);
  const a = await loader.load('gone');
  const b = await loader.load('gone');
  assert(calls === 1 && a === null && b === null, 'read once, null');
  assert(loader.peek('gone') === null, 'peek null');
  const bad = await loader.load('bad');
  assert(bad === null, 'throwing reader resolves null');
});

test('trailcache: loader runs at most concurrency reads at once, FIFO, and dedupes an in-flight id', async () => {
  const order: string[] = [];
  const resolvers = new Map<string, () => void>();
  const loader = createTrailLoader((id) => new Promise((resolve) => {
    order.push(id);
    resolvers.set(id, () => resolve([P0]));
  }), 10, 2);
  const pa = loader.load('a');
  const pb = loader.load('b');
  const pc = loader.load('c');
  const pd = loader.load('d');
  assert(loader.load('a') === pa, 'in-flight dedupe returns the same promise');
  assert(loader.inFlight() === 2, `inFlight ${loader.inFlight()}`);
  assert(order.join() === 'a,b', `order ${order.join()}`);
  resolvers.get('a')!();
  await pa;
  assert(order.join() === 'a,b,c', `order ${order.join()}`);
  assert(loader.inFlight() === 2, 'still 2');
  resolvers.get('b')!();
  await pb;
  resolvers.get('c')!();
  await pc;
  resolvers.get('d')!();
  await pd;
  assert(order.join() === 'a,b,c,d', `final order ${order.join()}`);
});

test('trailcache: a synchronously throwing reader does not leak a concurrency slot', async () => {
  const loader = createTrailLoader((id) => { if (id === 'bad') throw new Error('boom'); return Promise.resolve([P0]); }, 5, 1);
  const bad = await loader.load('bad');
  assert(bad === null, 'throwing reader resolves null');
  assert(loader.inFlight() === 0, `slot released, inFlight ${loader.inFlight()}`);
  const ok = await loader.load('good');
  assert(ok !== null && ok.length === 1, 'a later ride still loads');
});

test('trailcache: LRU capacity bounds the loader', async () => {
  const loader = createTrailLoader(async () => [P0], 2, 1);
  await loader.load('r1'); await loader.load('r2'); await loader.load('r3');
  assert(loader.peek('r1') === undefined, 'r1 evicted');
  assert(loader.peek('r2') !== undefined && loader.peek('r3') !== undefined, 'r2 r3 kept');
});

test('trailcache: decimateFixes applies the trail rule (points closer than TRAIL_MIN_STEP_M collapse)', () => {
  const t = decimateFixes([P0, NEAR, FAR]);
  assert(t.length === 2, `length ${t.length}`);
});
