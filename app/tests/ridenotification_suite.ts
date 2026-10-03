/**
 * virgin-cycle18 brief 03 → virgin-cycle20 briefs 01 + 03 — ride-running
 * notification. Only a phone can show the card; what a headless suite CAN
 * pin: the label rule, the body format (formatElapsed / rideNotificationBody
 * are the spec the Kotlin ticker mirrors), the push planner's arithmetic
 * (change / retry / re-assert / back-off), and that config, Kotlin, wrapper
 * and index.ts cannot drift apart. The runtime wrapper imports `expo` (which
 * plain Node cannot load), so it is read here as TEXT only; the policy file
 * is pure and imported for real.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, loadJson, test, TESTS_DIR } from './lib.ts';
import {
  MAX_CONSECUTIVE_MISSES,
  REASSERT_EVERY_N_TICKS,
  RIDE_NOTIFICATION_MODULE_NAME,
  RIDE_NOTIFICATION_SEPARATOR,
  forceReassert,
  formatElapsed,
  initialPushState,
  noteResult,
  planTick,
  rideNotificationBody,
  rideNotificationFor,
  rideNotificationLabel,
  type PushState,
} from '../src/location/rideNotificationPolicy.ts';

const APP_DIR = path.resolve(TESTS_DIR, '..');
const T0 = 1_759_100_000_000;
const MOD_DIR = path.join(APP_DIR, 'modules', 'qualifire-ride-notification');
const KT_PATH = path.join(
  MOD_DIR, 'android', 'src', 'main', 'java', 'expo', 'modules', 'qualifireridenotification',
  'QualifireRideNotificationModule.kt',
);

test('ridenotif: label rule — no session pushes nothing', () => {
  assert(rideNotificationFor(null, { phase: 'locked', currentSector: 2 }) === null, 'null session → null');
});

test('ridenotif: label rule — clock only before START, on free rides, while detecting', () => {
  for (const phase of ['idle', 'detecting', 'locked'] as const) {
    const d = rideNotificationFor(T0, { phase, currentSector: null });
    assert(d !== null && d.whenMs === T0 && d.label === null, `${phase}: clock only`);
    assert(rideNotificationLabel({ phase, currentSector: null }) === null, `${phase}: no label`);
  }
});

test('ridenotif: label rule — S<n> while a sector is being ridden, "finished" after the last gate — also while detecting under a pick', () => {
  const s1 = rideNotificationFor(T0, { phase: 'locked', currentSector: 1 });
  const s4 = rideNotificationFor(T0, { phase: 'locked', currentSector: 4 });
  // virgin-cycle20 06: a pre-lock display candidate's S1 reaches the notification too.
  const pre = rideNotificationFor(T0, { phase: 'detecting', currentSector: 1 });
  assert(pre?.label === 'S1', 'S1 must show while still detecting (pick presumed before the lock)');
  const fin = rideNotificationFor(T0, { phase: 'finished', currentSector: null });
  assert(s1?.label === 'S1' && s4?.label === 'S4', 'S-label format matches liveView');
  assert(fin?.label === 'finished', 'post-finish label');
  assert(s1?.whenMs === T0 && fin?.whenMs === T0, 'clock zero never moves');
  assert(rideNotificationLabel({ phase: 'finished', currentSector: 3 }) === 'finished', 'finished wins over a stale sector');
});

test('virgin-cycle20 03: formatElapsed — m:ss below an hour, h:mm:ss from an hour, floored, clamped', () => {
  const cases: [number, string][] = [
    [0, '0:00'], [999, '0:00'], [1000, '0:01'], [45_900, '0:45'], [59_999, '0:59'],
    [60_000, '1:00'], [754_000, '12:34'], [754_999, '12:34'], [3_599_999, '59:59'],
    [3_600_000, '1:00:00'], [3_754_000, '1:02:34'], [36_000_000, '10:00:00'],
    [-5_000, '0:00'], [Number.NaN, '0:00'], [Number.POSITIVE_INFINITY, '0:00'],
  ];
  for (const [ms, want] of cases) {
    const got = formatElapsed(ms);
    assert(got === want, `formatElapsed(${ms}) = ${got}, want ${want}`);
  }
});

test('virgin-cycle20 03: rideNotificationBody — clock, then " · label" only when there is one', () => {
  assert(RIDE_NOTIFICATION_SEPARATOR === ' · ', 'separator is space·space (U+00B7)');
  assert(rideNotificationBody({ whenMs: T0, label: null }, T0 + 754_000) === '12:34', 'no label → clock only');
  assert(rideNotificationBody({ whenMs: T0, label: 'S2' }, T0 + 754_000) === '12:34 · S2', 'sector label');
  assert(rideNotificationBody({ whenMs: T0, label: 'finished' }, T0 + 3_754_000) === '1:02:34 · finished', 'finished, over an hour');
  assert(rideNotificationBody({ whenMs: T0, label: 'S1' }, T0 - 1) === '0:00 · S1', 'clock before zero reads 0:00');
});

test('ridenotif: planner — first tick calls, unchanged ticks do not, change calls again', () => {
  const a = { whenMs: T0, label: null };
  let st = initialPushState();
  let p = planTick(st, a);
  assert(p.call, 'first desired → call');
  st = noteResult(p.state, a, true);
  for (let i = 0; i < REASSERT_EVERY_N_TICKS - 2; i++) {
    p = planTick(st, a);
    assert(!p.call, `unchanged tick ${i + 1} must not call`);
    st = p.state;
  }
  const b = { whenMs: T0, label: 'S1' };
  p = planTick(st, b);
  assert(p.call, 'sector change → call');
  st = noteResult(p.state, b, true);
  assert(st.applied?.label === 'S1' && st.ticksSinceCall === 0, 'applied recorded, ticks reset');
});

test('ridenotif: planner — a false result retries next tick; back-off after MAX misses; re-assert still fires', () => {
  const a = { whenMs: T0, label: null };
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
  const a = { whenMs: T0, label: 'S2' };
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
  const cfg = loadJson<{ platforms: string[]; android: { modules: string[] } }>(
    path.join(MOD_DIR, 'expo-module.config.json'),
  );
  assert(cfg.platforms.length === 1 && cfg.platforms[0] === 'android', 'android-only module');
  assert(cfg.android.modules.length === 1, 'exactly one Kotlin module class');
  const cls = cfg.android.modules[0];
  const ktPath = path.join(MOD_DIR, 'android', 'src', 'main', 'java', ...cls.split('.')) + '.kt';
  assert(ktPath === KT_PATH, `config class path ${ktPath} must be the pinned module file`);
  assert(fs.existsSync(ktPath), `Kotlin file missing at ${ktPath}`);
  const kt = fs.readFileSync(ktPath, 'utf8');
  assert(kt.includes(`Name("${RIDE_NOTIFICATION_MODULE_NAME}")`), 'Kotlin Name(...) must equal RIDE_NOTIFICATION_MODULE_NAME');
  assert(kt.includes('AsyncFunction("apply")'), 'Kotlin must expose apply');
  assert(kt.includes('AsyncFunction("stop")'), 'Kotlin must expose stop (virgin-cycle20 03)');
  assert(kt.includes('Notification.Builder.recoverBuilder('), 'must clone expo-location\'s notification, not build a second one');
  assert(kt.includes('Notification.FLAG_FOREGROUND_SERVICE'), 'must find the foreground-service notification by flag (id is not constant)');
  assert(kt.includes('setOnlyAlertOnce(true)'), 'updates must be silent');
  assert(!/notify\(\s*\d/.test(kt), 'never a hard-coded notification id');
  assert(fs.existsSync(path.join(MOD_DIR, 'android', 'build.gradle')), 'build.gradle missing');
  assert(!kt.includes('qualifire_flame_large') && !kt.includes('setLargeIcon('), 'no large icon (virgin-cycle20 01): the status-bar silhouette is the only flame');
  assert(kt.includes('setColorized(false)') && kt.includes('setColor(Notification.COLOR_DEFAULT)'), 'module must force the plain card on every OEM');
  assert(kt.includes('existing.color == Notification.COLOR_DEFAULT'), 'idempotence must not keep a coloured notification');
  const resDir = path.join(MOD_DIR, 'android', 'src', 'main', 'res');
  for (const d of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
    assert(fs.existsSync(path.join(resDir, `drawable-${d}`, 'notification_icon.png')), `flame small icon missing for ${d} (expo-location looks up drawable/notification_icon by name)`);
  }
  assert(fs.existsSync(path.join(resDir, 'raw', 'keep.xml')), 'res/raw/keep.xml missing (shrinker would strip name-looked-up drawables)');
  assert(!fs.existsSync(path.join(resDir, 'drawable-nodpi', 'qualifire_flame_large.png')), 'large flame PNG must be gone from module res (moved to safe_to_delete/)');
  const keep = fs.readFileSync(path.join(resDir, 'raw', 'keep.xml'), 'utf8');
  assert(keep.includes('@drawable/notification_icon') && !keep.includes('qualifire_flame_large'), 'keep.xml keeps only notification_icon');
  assert(!fs.existsSync(path.join(MOD_DIR, 'ios')), 'no ios/ directory (Android-only app)');
});

test('virgin-cycle20 03: Kotlin owns a 1 Hz body ticker; no chronometer, sub-text or header time', () => {
  const kt = fs.readFileSync(KT_PATH, 'utf8');
  assert(kt.includes('Handler(Looper.getMainLooper())'), 'main-looper Handler ticker');
  assert(kt.includes('handler.postDelayed(tick,'), 'ticker re-arms itself');
  assert(kt.includes('MAX_TICK_MISSES = 120'), 'ticker parks after 120 empty ticks');
  assert(kt.includes('OnDestroy'), 'ticker cleared on module destroy');
  assert(kt.includes('setContentText(body)') && kt.includes('Notification.EXTRA_TEXT'), 'body is written and compared for idempotence');
  assert(kt.includes('System.currentTimeMillis()'), 'elapsed is wall clock minus startedAtMs (same zero as the in-app clock)');
  assert(kt.includes('"%d:%02d:%02d"') && kt.includes('"%d:%02d"'), 'h:mm:ss / m:ss — same rule as formatElapsed');
  assert(kt.includes('" \\u00B7 "'), 'Kotlin separator mirrors RIDE_NOTIFICATION_SEPARATOR');
  assert(kt.includes('setShowWhen(false)') && kt.includes('setUsesChronometer(false)'), 'no header time of any kind');
  for (const gone of ['setUsesChronometer(true)', 'setSubText(', 'setWhen(', 'EXTRA_SUB_TEXT', 'EXTRA_SHOW_CHRONOMETER']) {
    assert(!kt.includes(gone), `${gone} must be gone (virgin-cycle20 03)`);
  }
});

test('ridenotif: wrapper + index.ts wiring', () => {
  const wrapper = fs.readFileSync(path.join(APP_DIR, 'src', 'location', 'rideNotification.ts'), 'utf8');
  assert(wrapper.includes("from 'expo'") && wrapper.includes('requireOptionalNativeModule<'), 'wrapper must use the optional require');
  assert(wrapper.includes('RIDE_NOTIFICATION_MODULE_NAME'), 'wrapper must require by the pinned name');
  assert(wrapper.includes('apply(startedAtMs: number, label: string | null): Promise<boolean>;'), 'native apply signature');
  assert(wrapper.includes('stop(): Promise<void>;') && wrapper.includes('export function stopRideNotification()'), 'wrapper exposes stop');
  const src = fs.readFileSync(path.join(APP_DIR, 'src', 'location', 'index.ts'), 'utf8');
  assert(src.includes("import { pushRideNotification, forceRideNotificationReassert, stopRideNotification } from './rideNotification';"), 'wrapper import missing');
  assert(src.includes('pushRideNotification(rideNotificationFor(session ? session.startedAtMs : null, st));'), 'subscriber must key on session.startedAtMs');
  assert((src.match(/liveEngine\.subscribe\(/g) ?? []).length === 2, 'expected exactly two module-scope liveEngine.subscribe( calls (buzz + notification)');
  assert(src.includes('PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS'), 'POST_NOTIFICATIONS runtime request missing');
  assert(src.includes("if (next === 'active') forceRideNotificationReassert();"), 'AppState active re-assert missing');
  const fgOpts = src.slice(src.indexOf('foregroundService: {'), src.indexOf('killServiceOnDestroy'));
  assert(fgOpts.includes("notificationTitle: 'Recording activity'"), 'expo-location title must be untouched');
  assert(!/notificationColor\s*:/.test(fgOpts), 'no notificationColor key: any value makes expo-location colorize the card (virgin-cycle20 01)');
});

test('virgin-cycle20 03: no static body anywhere; ticker stopped before the service is', () => {
  const src = fs.readFileSync(path.join(APP_DIR, 'src', 'location', 'index.ts'), 'utf8');
  assert(!/notificationBody\s*:/.test(src), 'index.ts must not pass notificationBody');
  assert(!src.includes('GPS tracking is active'), 'the static sentence is gone');
  const stopAt = src.indexOf('export async function stopTracking(');
  assert(stopAt >= 0, 'stopTracking present');
  const stopBody = src.slice(stopAt, src.indexOf('liveEngine.stop()', stopAt));
  const ticker = stopBody.indexOf('stopRideNotification();');
  const svc = stopBody.indexOf('Location.stopLocationUpdatesAsync(LOCATION_TASK)');
  assert(ticker >= 0 && svc >= 0 && ticker < svc, 'stopTracking must park the ticker BEFORE stopping the service (ghost guard)');
  const wrapper = fs.readFileSync(path.join(APP_DIR, 'src', 'location', 'rideNotification.ts'), 'utf8');
  assert(wrapper.includes('if (desired === null) {') && wrapper.includes('stopRideNotification();'), 'wrapper stops the ticker on a null desired too');
});

test('virgin-cycle20 01: ride notification has no colour anywhere (JS options, Kotlin, resources)', () => {
  const src = fs.readFileSync(path.join(APP_DIR, 'src', 'location', 'index.ts'), 'utf8');
  assert(!/notificationColor\s*:/.test(src), 'index.ts must not pass notificationColor');
  assert(!src.includes('#e10600'), 'the old red is gone from index.ts');
  const modDir = path.join(APP_DIR, 'modules', 'qualifire-ride-notification');
  const ktDir = path.join(modDir, 'android', 'src', 'main', 'java', 'expo', 'modules', 'qualifireridenotification');
  const kt = fs.readFileSync(path.join(ktDir, 'QualifireRideNotificationModule.kt'), 'utf8');
  assert(!kt.includes('import android.graphics.drawable.Icon'), 'Icon import removed with the large icon');
  assert(!fs.existsSync(path.join(modDir, 'android', 'src', 'main', 'res', 'drawable-nodpi', 'qualifire_flame_large.png')), 'no large icon resource');
  for (const d of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
    assert(fs.existsSync(path.join(modDir, 'android', 'src', 'main', 'res', `drawable-${d}`, 'notification_icon.png')), `small flame kept for ${d}`);
  }
});
