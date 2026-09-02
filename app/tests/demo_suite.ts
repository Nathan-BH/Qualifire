/**
 * WP-O (DEMO tab modes) suite — demoModel.ts is pure, no React/manifest, but
 * it statically imports colourModel.ts, which (like live_colour_suite.ts's
 * subjects) statically imports the app's bare `.json` seed. Metro bundles
 * that directly; plain Node ESM needs an import attribute it cannot get
 * without changing app code. Same fix as live_colour_suite.ts: load JSON
 * through a hook and pull the modules under test in DYNAMICALLY, after the
 * hook exists (static imports are linked before any module body runs, which
 * is why this cannot be a plain top-level import).
 *
 * Per the brief's §4 Test plan: buildDemoScript's fixed gate/lap arithmetic,
 * the pinned fixture's tier verdicts (so the demo can never drift back to
 * all-neutral), the null passthrough to 'est', the MIN_HISTORY floor on
 * every DEMO_HISTORY sector, and demoSectorColours' gate-progression rule.
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { assert, test } from './lib.ts';

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const { MIN_HISTORY } = await import('../src/ui/colourModel.ts');
const {
  buildDemoScript, demoTier, demoSectorColours, DEMO_HISTORY, DEMO_SECS,
} = await import('../src/ui/demoModel.ts');

test('demoModel: buildDemoScript() with default secs computes gateAt/lap', () => {
  const s = buildDemoScript();
  assert(s.secs === DEMO_SECS, 'secs should be the default DEMO_SECS array');
  assert(
    s.gateAt.length === 5 && s.gateAt.every((v, i) => v === [0, 185, 392, 629, 836][i]),
    `expected gateAt [0,185,392,629,836], got [${s.gateAt}]`,
  );
  assert(s.lap === 836, `expected lap 836, got ${s.lap}`);
});

test('demoModel: demoTier pins the fixture — S1 purple, S2 green, S3 yellow, S4 green, lap green', () => {
  assert(demoTier(1, 185) === 'purple', `S1: expected purple, got ${demoTier(1, 185)}`);
  assert(demoTier(2, 207) === 'green', `S2: expected green, got ${demoTier(2, 207)}`);
  assert(demoTier(3, 237) === 'yellow', `S3: expected yellow, got ${demoTier(3, 237)}`);
  assert(demoTier(4, 207) === 'green', `S4: expected green, got ${demoTier(4, 207)}`);
  assert(demoTier(0, 836) === 'green', `lap: expected green, got ${demoTier(0, 836)}`);
});

test('demoModel: demoTier(i, null) is always est, regardless of sector', () => {
  for (let i = 0; i <= 4; i++) {
    assert(demoTier(i, null) === 'est', `demoTier(${i}, null) expected 'est', got ${demoTier(i, null)}`);
  }
});

test('demoModel: every DEMO_HISTORY sector clears MIN_HISTORY', () => {
  for (let i = 0; i < DEMO_HISTORY.length; i++) {
    assert(
      DEMO_HISTORY[i].length >= MIN_HISTORY,
      `DEMO_HISTORY[${i}] has ${DEMO_HISTORY[i].length} entries, needs >= MIN_HISTORY (${MIN_HISTORY})`,
    );
  }
});

test('demoModel: demoSectorColours before any gate is all null', () => {
  const script = buildDemoScript();
  const out = demoSectorColours(script, 0, () => 'X');
  assert(out.length === script.secs.length + 1, `expected length ${script.secs.length + 1}, got ${out.length}`);
  assert(out.every((c) => c === null), `expected all null, got [${out}]`);
});

test('demoModel: demoSectorColours at gatesDone=2 paints indices 1-2 only', () => {
  const script = buildDemoScript();
  const out = demoSectorColours(script, 2, (tier) => tier);
  assert(out.length === 5, `expected length 5, got ${out.length}`);
  assert(out[0] === null, `index 0 should stay null, got ${out[0]}`);
  assert(out[1] === demoTier(1, script.secs[0]), `index 1 mismatch: ${out[1]}`);
  assert(out[2] === demoTier(2, script.secs[1]), `index 2 mismatch: ${out[2]}`);
  assert(out[3] === null, `index 3 should be null at gatesDone=2, got ${out[3]}`);
  assert(out[4] === null, `index 4 should be null at gatesDone=2, got ${out[4]}`);
});

test('demoModel: demoSectorColours at gatesDone=4 paints indices 1-4, index 0 stays null', () => {
  const script = buildDemoScript();
  const out = demoSectorColours(script, 4, (tier) => tier);
  assert(out.length === 5, `expected length 5, got ${out.length}`);
  assert(out[0] === null, `index 0 should stay null, got ${out[0]}`);
  for (let i = 1; i <= 4; i++) {
    assert(out[i] !== null, `index ${i} should be painted at gatesDone=4, got null`);
  }
});
