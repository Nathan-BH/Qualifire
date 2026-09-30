/**
 * virgin-cycle18 brief 03 — ride-running notification. The chronometer is
 * SystemUI's and only a phone can show it; what a headless suite CAN pin:
 * the label rule, the push planner's arithmetic (change / retry / re-assert /
 * back-off), and that config, Kotlin, wrapper and index.ts cannot drift apart.
 * The runtime wrapper imports `expo` (which plain Node cannot load), so it is
 * read here as TEXT only; the policy file is pure and imported for real.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, loadJson, test, TESTS_DIR } from './lib.ts';
import {
  MAX_CONSECUTIVE_MISSES,
  REASSERT_EVERY_N_TICKS,
  RIDE_NOTIFICATION_MODULE_NAME,
  forceReassert,
  initialPushState,
  noteResult,
  planTick,
  rideNotificationFor,
  type PushState,
} from '../src/location/rideNotificationPolicy.ts';

const APP_DIR = path.resolve(TESTS_DIR, '..');
const T0 = 1_759_100_000_000;

test('ridenotif: label rule — no session pushes nothing', () => {
  assert(rideNotificationFor(null, { phase: 'locked', currentSector: 2 }) === null, 'null session → null');
});

test('ridenotif: label rule — stopwatch only before START, on free rides, while detecting', () => {
  for (const phase of ['idle', 'detecting', 'locked'] as const) {
    const d = rideNotificationFor(T0, { phase, currentSector: null });
    assert(d !== null && d.whenMs === T0 && d.subText === null, `${phase}: stopwatch only`);
  }
});

test('ridenotif: label rule — S<n> while a sector is being ridden, "finished" after the last gate', () => {
  const s1 = rideNotificationFor(T0, { phase: 'locked', currentSector: 1 });
  const s4 = rideNotificationFor(T0, { phase: 'locked', currentSector: 4 });
  const fin = rideNotificationFor(T0, { phase: 'finished', currentSector: null });
  assert(s1?.subText === 'S1' && s4?.subText === 'S4', 'S-label format matches liveView');
  assert(fin?.subText === 'finished', 'post-finish label');
  assert(s1?.whenMs === T0 && fin?.whenMs === T0, 'chronometer zero never moves');
});

test('ridenotif: planner — first tick calls, unchanged ticks do not, change calls again', () => {
  const a = { whenMs: T0, subText: null };
  let st = initialPushState();
  let p = planTick(st, a);
  assert(p.call, 'first desired → call');
  st = noteResult(p.state, a, true);
  for (let i = 0; i < REASSERT_EVERY_N_TICKS - 2; i++) {
    p = planTick(st, a);
    assert(!p.call, `unchanged tick ${i + 1} must not call`);
    st = p.state;
  }
  const b = { whenMs: T0, subText: 'S1' };
  p = planTick(st, b);
  assert(p.call, 'sector change → call');
  st = noteResult(p.state, b, true);
  assert(st.applied?.subText === 'S1' && st.ticksSinceCall === 0, 'applied recorded, ticks reset');
});

test('ridenotif: planner — a false result retries next tick; back-off after MAX misses; re-assert still fires', () => {
  const a = { whenMs: T0, subText: null };
  let st: PushState = initialPushState();
  for (let i = 0; i < MAX_CONSECUTIVE_MISSES; i++) {
    const p = planTick(st, a);
    assert(p.call, `miss ${i}: still retrying`);
    st = noteResult(p.state, a, false);
  }
  assert(st.misses === MAX_CONSECUTIVE_MISSES && st.applied === null, 'misses counted');
  let calls = 0;
  for (let i = 0; i < REASSERT_EVERY_N_TICKS; i++) {
    const p = planTick(st, a);
    if (p.call) calls++;
    st = p.state;
  }
  assert(calls === 1, `backed off: exactly one re-assert call in ${REASSERT_EVERY_N_TICKS} ticks, got ${calls}`);
});

test('ridenotif: planner — re-assert every REASSERT_EVERY_N_TICKS, forceReassert makes the next tick call, null desired resets', () => {
  const a = { whenMs: T0, subText: 'S2' };
  let st = noteResult(initialPushState(), a, true);
  let calls = 0;
  for (let i = 0; i < REASSERT_EVERY_N_TICKS * 2; i++) {
    const p = planTick(st, a);
    st = p.state;
    if (p.call) {
      calls++;
      st = noteResult(st, a, true);
    }
  }
  assert(calls === 2, `two re-asserts in ${REASSERT_EVERY_N_TICKS * 2} unchanged ticks, got ${calls}`);
  st = forceReassert(st);
  assert(planTick(st, a).call, 'forced re-assert calls on the very next tick');
  const reset = planTick(st, null);
  assert(!reset.call && reset.state.applied === null && reset.state.misses === 0, 'null desired resets the planner');
});

test('ridenotif: local Expo module directory, config and Kotlin class agree with the JS name', () => {
  const modDir = path.join(APP_DIR, 'modules', 'qualifire-ride-notification');
  const cfg = loadJson<{ platforms: string[]; android: { modules: string[] } }>(
    path.join(modDir, 'expo-module.config.json'),
  );
  assert(cfg.platforms.length === 1 && cfg.platforms[0] === 'android', 'android-only module');
  assert(cfg.android.modules.length === 1, 'exactly one Kotlin module class');
  const cls = cfg.android.modules[0];
  const ktPath = path.join(modDir, 'android', 'src', 'main', 'java', ...cls.split('.')) + '.kt';
  assert(fs.existsSync(ktPath), `Kotlin file missing at ${ktPath}`);
  const kt = fs.readFileSync(ktPath, 'utf8');
  assert(kt.includes(`Name("${RIDE_NOTIFICATION_MODULE_NAME}")`), 'Kotlin Name(...) must equal RIDE_NOTIFICATION_MODULE_NAME');
  assert(kt.includes('AsyncFunction("apply")'), 'Kotlin must expose apply');
  assert(kt.includes('setUsesChronometer(true)'), 'timer must be a SystemUI chronometer');
  assert(kt.includes('Notification.Builder.recoverBuilder('), 'must clone expo-location\'s notification, not build a second one');
  assert(kt.includes('Notification.FLAG_FOREGROUND_SERVICE'), 'must find the foreground-service notification by flag (id is not constant)');
  assert(kt.includes('setOnlyAlertOnce(true)'), 'updates must be silent');
  assert(!/notify\(\s*\d/.test(kt), 'never a hard-coded notification id');
  assert(fs.existsSync(path.join(modDir, 'android', 'build.gradle')), 'build.gradle missing');
  assert(kt.includes('qualifire_flame_large') && kt.includes('setLargeIcon('), 'flame large icon must be set by the module');
  const resDir = path.join(modDir, 'android', 'src', 'main', 'res');
  for (const d of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
    assert(fs.existsSync(path.join(resDir, `drawable-${d}`, 'notification_icon.png')), `flame small icon missing for ${d} (expo-location looks up drawable/notification_icon by name)`);
  }
  assert(fs.existsSync(path.join(resDir, 'drawable-nodpi', 'qualifire_flame_large.png')), 'flame large icon missing');
  assert(fs.existsSync(path.join(resDir, 'raw', 'keep.xml')), 'res/raw/keep.xml missing (shrinker would strip name-looked-up drawables)');
  assert(!fs.existsSync(path.join(modDir, 'ios')), 'no ios/ directory (Android-only app)');
});

test('ridenotif: wrapper + index.ts wiring', () => {
  const wrapper = fs.readFileSync(path.join(APP_DIR, 'src', 'location', 'rideNotification.ts'), 'utf8');
  assert(wrapper.includes("from 'expo'") && wrapper.includes('requireOptionalNativeModule<'), 'wrapper must use the optional require');
  assert(wrapper.includes('RIDE_NOTIFICATION_MODULE_NAME'), 'wrapper must require by the pinned name');
  const src = fs.readFileSync(path.join(APP_DIR, 'src', 'location', 'index.ts'), 'utf8');
  assert(src.includes("import { pushRideNotification, forceRideNotificationReassert } from './rideNotification';"), 'wrapper import missing');
  assert(src.includes('pushRideNotification(rideNotificationFor(session ? session.startedAtMs : null, st));'), 'subscriber must key on session.startedAtMs');
  assert((src.match(/liveEngine\.subscribe\(/g) ?? []).length === 2, 'expected exactly two module-scope liveEngine.subscribe( calls (buzz + notification)');
  assert(src.includes('PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS'), 'POST_NOTIFICATIONS runtime request missing');
  assert(src.includes("if (next === 'active') forceRideNotificationReassert();"), 'AppState active re-assert missing');
  const fgOpts = src.slice(src.indexOf('foregroundService: {'), src.indexOf('killServiceOnDestroy'));
  assert(fgOpts.includes("notificationTitle: 'Qualifire — recording ride'"), 'expo-location options must be untouched');
});
