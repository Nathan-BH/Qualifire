/**
 * virgin-cycle18 brief 01 — show-over-lock-screen wiring pin. The behaviour is
 * native (Activity.setShowWhenLocked) and only a phone can exercise it; what
 * a headless suite CAN check is that the three halves cannot drift apart:
 * the config plugin is registered and sets the manifest attribute, the local
 * Expo module exists under the name the JS wrapper asks for, and the Kotlin
 * side exposes the one function the wrapper calls.
 */
import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, loadJson, test, TESTS_DIR } from './lib.ts';
// ONLY the pure policy file — lockScreen.ts imports `expo`, which Node cannot load here.
import { LOCK_SCREEN_MODULE_NAME, showWhenLockedFor } from '../src/location/lockScreenPolicy.ts';

const APP_DIR = path.resolve(TESTS_DIR, '..');
const require = createRequire(import.meta.url);

test('lockscreen: app.json registers the local showWhenLocked plugin', () => {
  const appJson = loadJson<{ expo: { plugins: unknown[] } }>(path.join(APP_DIR, 'app.json'));
  const names = appJson.expo.plugins.map((p) => (Array.isArray(p) ? p[0] : p));
  assert(names.includes('./plugins/withShowWhenLocked.js'), 'plugin entry missing from app.json');
  assert(fs.existsSync(path.join(APP_DIR, 'plugins', 'withShowWhenLocked.js')), 'plugin file missing');
});

test('lockscreen: plugin sets android:showWhenLocked="true" on an activity node, idempotently', () => {
  const { applyShowWhenLocked } = require('../plugins/withShowWhenLocked.js');
  const activity: { $: Record<string, string> } = { $: { 'android:name': '.MainActivity' } };
  applyShowWhenLocked(activity);
  assert(activity.$['android:showWhenLocked'] === 'true', 'attribute not set');
  assert(activity.$['android:name'] === '.MainActivity', 'other attributes must survive');
  applyShowWhenLocked(activity);
  assert(Object.keys(activity.$).length === 2, 'second application must not add keys');
});

test('lockscreen: local Expo module directory, config and Kotlin class agree with the JS name', () => {
  const modDir = path.join(APP_DIR, 'modules', 'qualifire-lock-screen');
  const cfg = loadJson<{ platforms: string[]; android: { modules: string[] } }>(
    path.join(modDir, 'expo-module.config.json'),
  );
  assert(cfg.platforms.length === 1 && cfg.platforms[0] === 'android', 'android-only module');
  assert(cfg.android.modules.length === 1, 'exactly one Kotlin module class');
  const cls = cfg.android.modules[0];
  const ktPath = path.join(modDir, 'android', 'src', 'main', 'java', ...cls.split('.')) + '.kt';
  assert(fs.existsSync(ktPath), `Kotlin file missing at ${ktPath}`);
  const kt = fs.readFileSync(ktPath, 'utf8');
  assert(kt.includes(`Name("${LOCK_SCREEN_MODULE_NAME}")`), 'Kotlin Name(...) must equal LOCK_SCREEN_MODULE_NAME');
  assert(kt.includes('AsyncFunction("setShowWhenLocked")'), 'Kotlin must expose setShowWhenLocked');
  assert(kt.includes('setShowWhenLocked(enabled)'), 'Kotlin must call Activity.setShowWhenLocked');
  assert(fs.existsSync(path.join(modDir, 'android', 'build.gradle')), 'build.gradle missing');
  assert(!fs.existsSync(path.join(modDir, 'ios')), 'no ios/ directory (Android-only app)');
});

test('lockscreen: policy is ON iff a session exists; wrapper reuses the policy name (read as text)', () => {
  assert(showWhenLockedFor(true) === true && showWhenLockedFor(false) === false, 'policy must mirror session presence');
  const wrapper = fs.readFileSync(path.join(APP_DIR, 'src', 'location', 'lockScreen.ts'), 'utf8');
  assert(wrapper.includes("import { LOCK_SCREEN_MODULE_NAME } from './lockScreenPolicy';"), 'wrapper must import the name from the pure policy file');
  assert(wrapper.includes('requireOptionalNativeModule<LockScreenNative>(LOCK_SCREEN_MODULE_NAME)'), 'wrapper must resolve the module by that name');
  assert(!wrapper.includes("'QualifireLockScreen'"), 'the literal must live only in lockScreenPolicy.ts');
});

test('lockscreen: index.ts keys the flag on the session and never drops it inside stopTracking', () => {
  const src = fs.readFileSync(path.join(APP_DIR, 'src', 'location', 'index.ts'), 'utf8');
  assert(src.includes("import { setShowWhenLocked } from './lockScreen';"), 'wrapper import missing');
  assert(src.includes("import { showWhenLockedFor } from './lockScreenPolicy';"), 'policy import missing');
  assert(src.includes('void setShowWhenLocked(showWhenLockedFor(session != null));'), 'sync must key on session through the policy');
  assert(src.includes("AppState.addEventListener('change', syncShowWhenLocked);"), 'AppState listener missing');
  assert((src.match(/syncShowWhenLocked\(\);/g) ?? []).length === 2, 'expected exactly two direct sync calls (startTracking, getRecoveryState)');
  const stopBody = src.slice(src.indexOf('export async function stopTracking('), src.indexOf('// D-019 gate buzz'));
  assert(!stopBody.includes('syncShowWhenLocked'), 'stopTracking must not touch the flag (Decision 3)');
});
