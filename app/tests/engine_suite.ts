/** Engine regression suite: replays every committed fixture through app/core
 * (offline pipeline + live detector) and compares against the snapshots (and,
 * where embedded, the cycle-004 Python parity rows) stored in the fixture.
 * Any behavioural change in core shows up here as a FAIL.
 */
import { median, madSigma } from '../core/src/index.ts';
import {
  test, assert, skip, loadFixture, loadRefs, refFor,
  analyzeOffline, runLive, compareSectors, compareSectorsToPy, compareLive,
  type Fixture,
} from './lib.ts';

const FIXTURE_NAMES = [
  'clean_morning', 'clean_eveninga', 'clean_eveningb',
  'gap_20260521', 'latelock_20260805', 'detour_eveningb',
  'wrongdir_eveninga', 'synthetic_truncated', 'synthetic_firstride',
];

test('engine: fixture library present and builder checks green', () => {
  const refs = loadRefs();
  for (const c of refs.builderChecks) assert(c.pass, `builder check failed: ${c.detail}`);
  for (const n of FIXTURE_NAMES) loadFixture(n); // throws with a clear message if missing
});

function tryLoad(name: string): Fixture {
  try {
    return loadFixture(name);
  } catch (e) {
    skip(e instanceof Error ? e.message : String(e));
  }
}

for (const name of FIXTURE_NAMES) {
  test(`engine: ${name} offline sector times match snapshot`, () => {
    const f = tryLoad(name);
    compareSectors(analyzeOffline(f.fixes, refFor(f.track), f.track), f.expected.offline, 1e-6);
  });

  test(`engine: ${name} live gate sequence matches snapshot + invariants`, () => {
    const f = tryLoad(name);
    const live = runLive(f.fixes, refFor(f.track), f.track);
    assert(live.monotonic, 'live chainage went backward (monotonicity broken)');
    assert(live.inOrder, 'gates fired out of order or twice');
    compareLive(live, f.expected.live);
  });

  test(`engine: ${name} vs python parity oracle`, () => {
    const f = tryLoad(name);
    if (!f.pyReference) skip('no python rows embedded for this fixture (synthetic/derived input)');
    compareSectorsToPy(
      analyzeOffline(f.fixes, refFor(f.track), f.track),
      f.pyReference, 0.05, f.pyReferenceMode === 'flags',
    );
  });
}

// ------------------------------------------------- semantic assertions

test('engine: clean rides — all sectors clean, 5 real fires, none skipped', () => {
  for (const name of ['clean_morning', 'clean_eveninga', 'clean_eveningb']) {
    const f = tryLoad(name);
    assert(f.expected.offline.every((s) => s.flag === 'clean'), `${name}: non-clean sector`);
    const live = runLive(f.fixes, refFor(f.track), f.track);
    assert(live.events.length === 5, `${name}: ${live.events.length} fires, want 5`);
    assert(live.events.every((e) => !e.est), `${name}: estimated fire on a clean ride`);
    assert(live.skipped.length === 0, `${name}: skipped gates [${live.skipped}]`);
  }
});

test('engine: 237s-gap ride — time-aware re-acq recovers gates the fixed bound cannot', () => {
  const f = tryLoad('gap_20260521');
  assert(f.expected.liveNoReacq, 'fixture missing liveNoReacq snapshot');
  const ref = refFor(f.track);
  const timeAware = runLive(f.fixes, ref, f.track);
  const noReacq = runLive(f.fixes, ref, f.track, { reacqForwardM: 0, vMaxReacq: 0, armWithinM: 20 });
  compareLive(noReacq, f.expected.liveNoReacq);
  assert(timeAware.events.length > noReacq.events.length,
    `time-aware (${timeAware.events.length}) fired no more gates than no-reacq (${noReacq.events.length})`);
  // gates crossed inside the 237 s jump must be estimated, never silently "real" (D-013)
  const extra = timeAware.events.filter((e) => !noReacq.events.some((n) => n.g === e.g));
  assert(extra.length > 0 && extra.every((e) => e.est),
    'gap-recovered gates were not all marked estimated');
});

test('engine: late-GPS-lock ride — START skipped per D-016(b), sector 1 not timed', () => {
  const f = tryLoad('latelock_20260805');
  const live = runLive(f.fixes, refFor(f.track), f.track);
  assert(live.skipped.includes(0), `START not in skipped gates [${live.skipped}]`);
  assert(live.events.every((e) => e.g !== 0), 'START fired despite first fix beyond arming distance');
  assert(f.expected.offline[0].flag === 'excluded_nocross',
    `offline sector 1 flag ${f.expected.offline[0].flag}, want excluded_nocross`);
});

test('engine: detour ride — at least one sector excluded_offroute (D-015)', () => {
  const f = tryLoad('detour_eveningb');
  assert(f.expected.offline.some((s) => s.flag === 'excluded_offroute'),
    `flags [${f.expected.offline.map((s) => s.flag)}] contain no excluded_offroute`);
});

test('engine: wrong-direction ride — nothing clean, no real gate fires', () => {
  const f = tryLoad('wrongdir_eveninga');
  assert(f.expected.offline.every((s) => s.flag !== 'clean' && s.flag !== 'interrupted'),
    `a wrong-direction sector was timed: [${f.expected.offline.map((s) => s.flag)}]`);
  const live = runLive(f.fixes, refFor(f.track), f.track);
  assert(live.events.every((e) => e.est), 'wrong-direction ride produced a REAL gate fire');
});

test('engine: mid-ride kill — no fabricated gates past the truncation point', () => {
  const f = tryLoad('synthetic_truncated');
  const live = runLive(f.fixes, refFor(f.track), f.track);
  assert(live.events.length === 3, `${live.events.length} fires, want 3 (START,G1,G2)`);
  assert(live.events.every((e) => e.g <= 2), 'a gate beyond the kill point fired');
  assert(f.expected.offline[2].flag === 'excluded_nocross' && f.expected.offline[3].flag === 'excluded_nocross',
    'sectors 3-4 not excluded_nocross after truncation');
});

test('engine: first-ever ride — full sector results, empty-history stats give NaN not a colour', () => {
  const f = tryLoad('synthetic_firstride');
  for (const s of f.expected.offline) {
    assert(s.movingS !== null && s.rawS !== null, `S${s.sector} produced no time on the first ride`);
  }
  // No benchmark history: the D-008 colouring inputs must be NaN (app renders "no colour"),
  // never 0 or a fabricated sigma that would colour the first ride green/purple.
  assert(Number.isNaN(median([])), 'median of empty history is not NaN');
  assert(Number.isNaN(madSigma([])), 'madSigma of empty history is not NaN');
});
