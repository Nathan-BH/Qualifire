/**
 * virgin-cycle20 brief 12 — the "stores ready" gate (src/store/bootstrap.ts)
 * and the two wiring facts a phone would otherwise be needed for, as source
 * pins: App.tsx opens the gate at the END of its launch chain (after the ride
 * history, on both paths) and RecordScreen's relaunch recovery awaits it
 * BEFORE stopTracking()/markRideFree() (Opus inspection of brief 08, B1).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, test, TESTS_DIR } from './lib.ts';
import { markStoresReady, resetStoresReadyForTests, storesReadySettled, whenStoresReady } from '../src/store/bootstrap.ts';

const SRC = (rel: string) => fs.readFileSync(path.resolve(TESTS_DIR, '..', rel), 'utf8');

test('bootstrap: the gate is pending until markStoresReady(), then resolves for every waiter (idempotent, re-armable)', async () => {
  resetStoresReadyForTests();
  assert(!storesReadySettled(), 'fresh gate must be pending');
  let hits = 0;
  const count = () => hits; // read through a closure: `assert(hits === 0)` would narrow `hits` to literal 0 for tsc
  const w1 = whenStoresReady().then(() => { hits += 1; });
  const w2 = whenStoresReady().then(() => { hits += 1; });
  await Promise.resolve(); await Promise.resolve();
  assert(count() === 0, `waiters ran before the gate opened (${count()})`);
  markStoresReady();
  markStoresReady(); // idempotent
  assert(storesReadySettled(), 'settled after markStoresReady()');
  await Promise.all([w1, w2]);
  assert(count() === 2, `both waiters ran once each, got ${count()}`);
  let late = false;
  await whenStoresReady().then(() => { late = true; });
  assert(late, 'a waiter attached AFTER the gate opened resolves at once');
  resetStoresReadyForTests();
  assert(!storesReadySettled(), 're-armed');
  let reran = false;
  void whenStoresReady().then(() => { reran = true; });
  await Promise.resolve(); await Promise.resolve();
  assert(!reran, 'after a reset the gate is pending again');
  markStoresReady();
});

test('bootstrap: App.tsx opens the gate at the end of the launch chain, after initRideHistory, on both paths', () => {
  const src = SRC('App.tsx');
  assert(src.includes("import { markStoresReady } from './src/store/bootstrap';"), 'App imports markStoresReady');
  const hist = src.indexOf('.then(() => initRideHistory(fs,');
  const open = src.indexOf('.then(markStoresReady, markStoresReady)');
  const hydrated = src.indexOf('() => setWindowHydrated(true)');
  assert(hist > 0 && open > 0 && hydrated > 0, `anchors: initRideHistory ${hist}, markStoresReady ${open}, setWindowHydrated ${hydrated}`);
  assert(hist < open && open < hydrated, 'the gate opens AFTER the ride history loads and before the hydration bump');
  assert((src.match(/markStoresReady/g) ?? []).length === 3, 'one import + the two-path .then only');
});

test('bootstrap: RecordScreen\'s relaunch recovery awaits the gate before stopTracking()/markRideFree()', () => {
  const src = SRC('src/ui/RecordScreen.tsx');
  assert(src.includes("import { whenStoresReady } from '../store/bootstrap';"), 'RecordScreen imports whenStoresReady');
  const guard = src.indexOf('recoveryAutoSaveStarted = true;');
  assert(guard > 0, 'recovery guard missing');
  const block = src.slice(guard, src.indexOf('setLastSummary(sum);', guard));
  const waitAt = block.indexOf('await whenStoresReady();');
  const stopAt = block.indexOf('const sum = await stopTracking();');
  const markAt = block.indexOf('markRideFree(\n'); // the call (the comment above it says markRideFree() inline)
  assert(waitAt > 0 && stopAt > 0 && markAt > 0, `anchors in the recovery block: wait ${waitAt}, stop ${stopAt}, mark ${markAt}`);
  assert(waitAt < stopAt && stopAt < markAt, 'order must be: await gate -> stopTracking -> markRideFree');
  assert((src.match(/whenStoresReady\(\)/g) ?? []).length === 1, 'exactly one await site (the recovery)');
  // the live-recovery branch (service survived) is NOT gated — it only resumes the UI
  const tracking = src.indexOf('if (rec.tracking) {');
  assert(tracking > 0 && src.slice(tracking, guard).includes('setSession(rec.session);') && !src.slice(tracking, guard).includes('whenStoresReady'),
    'the service-survived branch resumes the UI at once, ungated');
});
