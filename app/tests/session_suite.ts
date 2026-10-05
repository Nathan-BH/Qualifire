/** Session-marker parse suite (virgin-cycle21 02). session.ts itself imports
 * expo-file-system (not loadable headless), so the parse lives in the pure
 * sessionMarker.ts and is tested here. */
import { parseSession } from '../src/location/sessionMarker.ts';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test, assert, TESTS_DIR } from './lib.ts';

test('virgin-cycle21 02: session marker round-trips pickId (string, null) and a pre-cycle-21 marker without it loads as undefined', () => {
  const base = { rideId: 'r1', startedAtMs: 1755167000000, mode: 'route', wayIds: ['A', 'B'], sportId: 'bike', lastAliveAtMs: 1755167001000 };
  const withPick = parseSession(JSON.stringify({ ...base, pickId: 'EveningA' }));
  assert(withPick !== null && withPick.pickId === 'EveningA', `string pickId lost: ${JSON.stringify(withPick)}`);
  const nullPick = parseSession(JSON.stringify({ ...base, pickId: null }));
  assert(nullPick !== null && nullPick.pickId === null, `null pickId lost: ${JSON.stringify(nullPick)}`);
  const old = parseSession(JSON.stringify(base));
  assert(old !== null && old.pickId === undefined && old.rideId === 'r1' && old.wayIds?.length === 2,
    `pre-cycle-21 marker: ${JSON.stringify(old)}`);
  const junk = parseSession(JSON.stringify({ ...base, pickId: 42 }));
  assert(junk !== null && junk.pickId === undefined, 'a non-string, non-null pickId must load as undefined');
  assert(parseSession(JSON.stringify({ rideId: 'x' })) === null, 'a marker without startedAtMs must be rejected (corrupt)');
});

test('virgin-cycle21 04: a fresh-launch restore never re-arms the engine and the task drops an interrupted ride\'s fixes', () => {
  const src = fs.readFileSync(path.resolve(TESTS_DIR, '..', 'src', 'location', 'index.ts'), 'utf8');
  assert((src.match(/liveEngine\.start\(/g) ?? []).length === 1, 'exactly one liveEngine.start( (startTracking)');
  const e0 = src.indexOf('async function ensureSession');
  const e1 = src.indexOf('TaskManager.defineTask');
  assert(e0 > 0 && e1 > e0, `anchors: ensureSession ${e0}, defineTask ${e1}`);
  const ens = src.slice(e0, e1);
  assert(ens.includes('interruptedRideId = session.rideId;') && !ens.includes('liveEngine.start('), 'ensureSession marks, never re-arms');
  const t1 = src.indexOf('// Permissions', e1);
  assert(t1 > e1, 'Permissions anchor missing');
  const task = src.slice(e1, t1);
  const chk = task.indexOf('if (s.rideId === interruptedRideId) {');
  const app = task.indexOf('await appendFix(');
  assert(chk > 0 && app > 0 && chk < app, `check ${chk} must precede appendFix ${app}`);
  const blkEnd = task.indexOf('const locations = data?.locations', chk);
  assert(blkEnd > chk && blkEnd < app, `interrupted block must end before the fix loop (${blkEnd})`);
  const blk = task.slice(chk, blkEnd);
  const iNotif = blk.indexOf('stopRideNotification();');
  const iStop = blk.indexOf('Location.stopLocationUpdatesAsync(LOCATION_TASK)');
  const iRet = blk.lastIndexOf('return;');
  assert(iNotif > 0 && iStop > iNotif && iRet > iStop, `check stops notification ${iNotif}, updates ${iStop}, then returns ${iRet}`);
  assert(!blk.includes('appendFix(') && !blk.includes('liveEngine.feed('), 'interrupted block never appends or feeds');
  const s0 = src.indexOf('export async function stopTracking(');
  const s1 = src.indexOf('export async function dropStaleSession');
  assert(s0 > 0 && s1 > s0 && src.slice(s0, s1).includes('interruptedRideId = null;'), 'stopTracking resets interruptedRideId');
});
