/**
 * virgin-cycle20 brief 11 — auto-detect START keeps trying after location
 * comes on late. The pure schedule (positionRetryPolicy.ts) is tested in full;
 * the two wiring facts a phone would otherwise be needed for are source pins:
 * the quiet read passes mayShowUserSettingsDialog:false and checks services
 * first, and RecordScreen wires AppState + the poll + the RECORD restart.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, test, TESTS_DIR } from './lib.ts';
import {
  maxReadsPerBudget, nextPollDelayMs, pollDelayFor, restartsBudget,
  POLL_BUDGET_MS, POLL_DELAYS_MS, QUIET_REFRESH_TIMEOUT_MS,
} from '../src/location/positionRetryPolicy.ts';

const SRC = (rel: string) => fs.readFileSync(path.resolve(TESTS_DIR, '..', 'src', rel), 'utf8');

test('positionretry: delays back off 2,2,2,3,3,5 then hold at 5 s', () => {
  assert(POLL_DELAYS_MS.join(',') === '2000,2000,2000,3000,3000,5000', `table changed: ${POLL_DELAYS_MS.join(',')}`);
  for (let i = 0; i < POLL_DELAYS_MS.length; i++) assert(pollDelayFor(i) === POLL_DELAYS_MS[i], `attempt ${i}`);
  assert(pollDelayFor(6) === 5000 && pollDelayFor(40) === 5000, 'past the table it holds the last entry');
  assert(pollDelayFor(-3) === 2000 && pollDelayFor(1.7) === 2000, 'defensive on odd attempt values');
});

test('positionretry: polls only in setup/armed, only without a fix, only inside the budget', () => {
  assert(nextPollDelayMs({ phase: 'setup', hasFix: false, elapsedMs: 0, attempt: 0 }) === 2000, 'setup, no fix → first delay');
  assert(nextPollDelayMs({ phase: 'armed', hasFix: false, elapsedMs: 10_000, attempt: 4 }) === 3000, 'armed polls too (the armed screen names the start place live)');
  assert(nextPollDelayMs({ phase: 'running', hasFix: false, elapsedMs: 0, attempt: 0 }) === null, 'running: the ride feed owns the position');
  assert(nextPollDelayMs({ phase: 'ending', hasFix: false, elapsedMs: 0, attempt: 0 }) === null, 'ending: nothing to detect');
  assert(nextPollDelayMs({ phase: 'setup', hasFix: true, elapsedMs: 0, attempt: 0 }) === null, 'a known position ends the poll');
  assert(nextPollDelayMs({ phase: 'setup', hasFix: false, elapsedMs: POLL_BUDGET_MS, attempt: 9 }) === null, 'budget spent → stop');
  assert(nextPollDelayMs({ phase: 'setup', hasFix: false, elapsedMs: POLL_BUDGET_MS - 1, attempt: 9 }) === 5000, 'one ms inside the budget still schedules');
});

test('positionretry: battery ceiling — at most 15 quiet reads per 60 s budget', () => {
  assert(POLL_BUDGET_MS === 60_000, `budget is ${POLL_BUDGET_MS}`);
  const n = maxReadsPerBudget();
  assert(n === 15, `expected 15 reads per budget (17 s for the first 6, then 5 s steps), got ${n}`);
  // and the simulated run really spans the budget rather than stopping early
  let t = 0, k = 0, d: number | null;
  while ((d = nextPollDelayMs({ phase: 'setup', hasFix: false, elapsedMs: t, attempt: k })) !== null) { t += d; k += 1; }
  assert(t >= POLL_BUDGET_MS && t < POLL_BUDGET_MS + 5000, `last read lands at ${t} ms`);
});

test('positionretry: a fix arriving mid-run stops the very next tick', () => {
  // the screen reads hasFix from the status subscription on every schedule()
  assert(nextPollDelayMs({ phase: 'setup', hasFix: false, elapsedMs: 4000, attempt: 2 }) === 2000, 'before the fix');
  assert(nextPollDelayMs({ phase: 'setup', hasFix: true, elapsedMs: 4000, attempt: 2 }) === null, 'after the fix');
});

test('positionretry: app-active and RECORD press restart the budget; the native wait is capped', () => {
  assert(restartsBudget('app-active'), 'returning from Settings restarts the budget');
  assert(restartsBudget('record-press'), 'RECORD restarts the budget');
  assert(restartsBudget('mount'), 'mount is its own fresh budget');
  assert(QUIET_REFRESH_TIMEOUT_MS === 20_000, `timeout ${QUIET_REFRESH_TIMEOUT_MS}`);
  assert(QUIET_REFRESH_TIMEOUT_MS < POLL_BUDGET_MS, 'one hung read can never eat the whole budget');
});

test('positionretry: location/index.ts quiet read never prompts (services check first, no settings dialog, shared in-flight)', () => {
  const src = SRC('location/index.ts');
  const start = src.indexOf('export async function refreshPositionIfPermitted');
  assert(start > 0, 'refreshPositionIfPermitted missing');
  const body = src.slice(start, src.indexOf('export async function stopTracking', start));
  assert(body.includes('Location.getForegroundPermissionsAsync()'), 'permission is CHECKED');
  assert(!body.includes('requestForegroundPermissionsAsync') && !body.includes('requestBackgroundPermissionsAsync'), 'never REQUESTED');
  assert(body.includes('Location.hasServicesEnabledAsync()'), 'services are checked before any fix request');
  assert(body.includes('mayShowUserSettingsDialog: false'), 'the Play Services settings dialog is suppressed (expo default is true)');
  assert(!body.includes('enableNetworkProviderAsync'), 'no network-provider prompt either');
  assert(body.includes('QUIET_REFRESH_TIMEOUT_MS'), 'the native wait is capped');
  assert(src.includes('let quietRefreshInFlight'), 'one shared in-flight promise');
  assert(body.includes("return 'no-services'") && body.includes("return 'no-permission'"), 'outcomes reported, not swallowed');
  // the old one-shot (onRecord's post-permission read) is untouched
  assert(src.includes('export async function refreshPositionOnce(): Promise<void>'), 'refreshPositionOnce unchanged');
});

test('positionretry: RecordScreen wires AppState active, the bounded poll and the RECORD restart', () => {
  const src = SRC('ui/RecordScreen.tsx');
  assert(/import \{[^}]*\bAppState\b[^}]*\} from 'react-native'/.test(src), 'AppState imported from react-native');
  assert(src.includes("from '../location/positionRetryPolicy'"), 'policy imported');
  assert(src.includes("AppState.addEventListener('change'"), 'foreground listener present');
  assert(src.includes("restartsBudget('app-active')"), 'app-active restarts the budget');
  assert(src.includes("restartsBudget('record-press')"), 'RECORD press restarts the budget');
  assert(src.includes('nextPollDelayMs({ phase, hasFix: false, elapsedMs: Date.now() - startedAtMs, attempt })'), 'the poll asks the policy');
  assert(src.includes('}, [phase, noFix, pollEpoch]);'), 'poll effect keyed on phase, fix presence and the epoch');
  assert(src.includes("if (phase !== 'setup' && phase !== 'armed') return;"), 'no poll outside setup/armed');
  assert(src.includes('useEffect(() => { void refreshPositionIfPermitted(); }, []);'), 'the mount read stays');
  assert(!src.includes("refreshPositionIfPermitted(); }, [phase"), 'the mount read is not itself re-keyed');
  // never a prompting call from the screen's retry paths
  const n = (src.match(/refreshPositionIfPermitted\(\)/g) ?? []).length;
  assert(n === 3, `expected exactly 3 quiet-read call sites (mount, app-active, poll), got ${n}`);
});

test('positionretry: the app-active quiet read is not wired while running/ending (brief 12 — the ride feed owns the position)', () => {
  const src = SRC('ui/RecordScreen.tsx');
  const start = src.indexOf("AppState.addEventListener('change'");
  assert(start > 0, 'foreground listener missing');
  const effectStart = src.lastIndexOf('useEffect(() => {', start);
  const effectEnd = src.indexOf('return () => sub.remove();', start);
  assert(effectStart > 0 && effectEnd > start, 'could not bracket the AppState effect');
  const body = src.slice(effectStart, effectEnd);
  assert(body.includes("if (phase === 'running' || phase === 'ending') return;"), 'the effect must bail out in running/ending BEFORE subscribing');
  assert(body.indexOf("if (phase === 'running'") < body.indexOf('AppState.addEventListener'), 'the phase guard precedes the subscription');
  const deps = src.slice(effectEnd, src.indexOf(';', src.indexOf('}, [', effectEnd)) + 1);
  assert(deps.endsWith('}, [phase]);'), `the AppState effect is keyed on phase, got: ${deps.slice(-40)}`);
});
