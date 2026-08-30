/**
 * Stale-first-fix / warm-up classifier suite (cycle 025 WP-stale-first-fix
 * P1) — pure suite for location/fixFlags.ts, the exact function
 * location/index.ts calls per fix before appending it (same pattern as
 * elevation_suite.ts). The flag is record-side ADDITIVE metadata only
 * (D-023); these tests pin the classification rules themselves.
 */
import { assert, test } from './lib.ts';
import { WARMUP_ACC_M, WARMUP_MAX_S, classifyFix, newWarmupState } from '../src/location/fixFlags.ts';

test('fixFlags: a fix timestamped before the START press is preStart-flagged regardless of accuracy, and never ends warm-up', () => {
  const st = newWarmupState();
  const t0 = 1755167000000;
  const stale = classifyFix(t0 - 9000, 5, t0, st); // the 2026-08-25 shape: stale fix, seconds old, "good" claimed accuracy
  assert(stale.preStart === true && stale.warmup === undefined, `stale fix flags: ${JSON.stringify(stale)}`);
  assert(st.goodFixSeen === false, "a stale fix's (untrustworthy) good accuracy must not end warm-up");
  const next = classifyFix(t0 + 1000, 45, t0, st);
  assert(next.warmup === true, 'coarse post-stale fix not warmup-flagged');
});

test('fixFlags: warm-up — poor/unknown accuracy flagged until the first good fix; later noise is never re-flagged', () => {
  const st = newWarmupState();
  const t0 = 1755167000000;
  assert(classifyFix(t0 + 1000, 45, t0, st).warmup === true, 'acc 45 during warm-up not flagged');
  assert(classifyFix(t0 + 2000, undefined, t0, st).warmup === true, 'unknown accuracy during warm-up not flagged');
  assert(classifyFix(t0 + 3000, 90, t0, st).warmup === true, 'acc 90 during warm-up not flagged');
  const good = classifyFix(t0 + 4000, 8, t0, st);
  assert(good.warmup === undefined && good.preStart === undefined, 'the first good fix itself must not be flagged');
  assert(st.goodFixSeen === true, 'good fix did not end warm-up');
  assert(classifyFix(t0 + 5000, 45, t0, st).warmup === undefined,
    'mid-ride accuracy noise re-flagged after warm-up ended');
});

test('fixFlags: WARMUP_MAX_S safety cap — a bad-GPS day never flags a whole ride, and the threshold catches the observed 23–90 m points', () => {
  const st = newWarmupState();
  const t0 = 1755167000000;
  assert(classifyFix(t0 + WARMUP_MAX_S * 1000, 45, t0, st).warmup === true,
    'poor fix AT the cap boundary should still be flagged');
  assert(classifyFix(t0 + WARMUP_MAX_S * 1000 + 1000, 45, t0, st).warmup === undefined,
    'poor fix past the cap must not be flagged (bounded blast radius)');
  assert(WARMUP_ACC_M < 23, `WARMUP_ACC_M ${WARMUP_ACC_M} would miss the observed 23–90 m warm-up points`);
});
