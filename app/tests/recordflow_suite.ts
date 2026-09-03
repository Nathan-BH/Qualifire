/**
 * RECORD three-phase flow (Cycle 024, WP-A2) — pure suite for recordFlow.ts.
 * No RN involved: these are the exact rules RecordScreen.tsx's phase state
 * machine and status line are built from.
 */
import { assert, test } from './lib.ts';
import {
  canTransition, effectiveFromId, isFullscreen, statusItemsFor, type RecordPhase,
} from '../src/ui/recordFlow.ts';

const PHASES: RecordPhase[] = ['setup', 'armed', 'running', 'ending'];

test('recordFlow: legal transitions pass — every real user-facing move in the three-phase flow', () => {
  const legal: [RecordPhase, RecordPhase][] = [
    ['setup', 'armed'],   // RECORD pressed (permissions ok)
    ['armed', 'setup'],   // back/cancel
    ['armed', 'running'], // START pressed
    ['running', 'ending'],// END pressed, save done, reverse anim now playing
    ['ending', 'setup'],  // reverse anim finished
    ['setup', 'running'], // relaunch recovery: a live session was found on mount
    ['running', 'setup'], // recovery declined, or stopTracking() threw on END
  ];
  for (const [from, to] of legal) {
    assert(canTransition(from, to), `${from} -> ${to} must be legal`);
  }
});

test('recordFlow: illegal transitions fail — including same-phase and phase-skipping moves', () => {
  const illegal: [RecordPhase, RecordPhase][] = [
    ['setup', 'ending'],   // cannot skip straight to ending
    ['ending', 'running'], // cannot re-enter running from ending
    ['armed', 'ending'],   // armed never ends directly
    ['ending', 'armed'],
    ['running', 'armed'],  // running never re-arms
    ['setup', 'setup'],    // no-op "transitions" are not legal moves
    ['armed', 'armed'],
    ['running', 'running'],
    ['ending', 'ending'],
  ];
  for (const [from, to] of illegal) {
    assert(!canTransition(from, to), `${from} -> ${to} must be illegal`);
  }
});

test('recordFlow: isFullscreen is true exactly for armed/running/ending, false for setup', () => {
  for (const p of PHASES) {
    const expected = p !== 'setup';
    assert(isFullscreen(p) === expected, `isFullscreen(${p}) expected ${expected}, got ${isFullscreen(p)}`);
  }
});

test('recordFlow: statusItemsFor never mentions a raw fixes COUNT and orders trouble-first', () => {
  // NOTE: RecordScreen's real gpsLine copy legitimately contains the WORD
  // "fix" in its non-trouble and no-signal forms ("GPS live" aside, e.g.
  // "waiting for first GPS fix…") — that is a GPS term of art, not the
  // banned raw fixes COUNT ("N fixes", cycle 024 WP-A2: "I don't know what
  // 'fixes' are"). statusItemsFor is a pure reorder — it does not touch
  // content — so this checks for the actual banned pattern (a digit
  // immediately followed by "fixes"), not the bare substring "fix", which
  // would wrongly flag that legitimate copy.
  const fixesCountPattern = /\d+\s*fixes\b/i;
  const gpsLine = 'GPS live';
  const troubleLine = 'last fix 9s ago — GPS struggling?';
  const routeLine = 'Morning · route locked';

  const calm = statusItemsFor({ gpsTrouble: false, gpsLine, routeLine });
  assert(calm.length > 0, 'statusItemsFor must return non-empty items');
  assert(calm.every((s) => typeof s === 'string' && s.length > 0), 'every item must be a non-empty string');
  assert(!calm.some((s) => fixesCountPattern.test(s)), `no calm item may carry a raw fixes count: ${JSON.stringify(calm)}`);
  assert(calm[0] === routeLine, 'calm order must lead with the route line');

  const trouble = statusItemsFor({ gpsTrouble: true, gpsLine: troubleLine, routeLine });
  assert(trouble.length > 0, 'statusItemsFor must return non-empty items under trouble too');
  assert(!trouble.some((s) => fixesCountPattern.test(s)), `no trouble item may carry a raw fixes count: ${JSON.stringify(trouble)}`);
  assert(trouble[0] === troubleLine, 'trouble must jump the queue — GPS line leads');
});

test('effectiveFromId: pick mode always ignores detection, tapped or not', () => {
  assert(
    effectiveFromId({ startMode: 'pick', detectedId: 'work', from: 'home', fromExplicit: false }) === 'home',
    'pick mode + untapped must read `from`, never detection',
  );
  assert(
    effectiveFromId({ startMode: 'pick', detectedId: 'work', from: 'home', fromExplicit: true }) === 'home',
    'pick mode + tapped must still read `from` — detection is never consulted in pick mode',
  );
});

test('effectiveFromId: auto + untapped seeds from detection, falls back to `from` when nothing detected', () => {
  assert(
    effectiveFromId({ startMode: 'auto', detectedId: 'work', from: 'home', fromExplicit: false }) === 'work',
    'auto + untapped must seed from the detected landmark (untapped-case behaviour, byte-identical to pre-N5)',
  );
  assert(
    effectiveFromId({ startMode: 'auto', detectedId: null, from: 'home', fromExplicit: false }) === 'home',
    'auto + untapped + nothing detected must fall back to `from`',
  );
});

test('effectiveFromId: auto + tapped — the tap wins over a differing detection (the core N5 regression)', () => {
  assert(
    effectiveFromId({ startMode: 'auto', detectedId: 'work', from: 'home', fromExplicit: true }) === 'home',
    'a rider who tapped home while work was detected must get home, not have the tap silently ignored',
  );
});

test('effectiveFromId: a tap sticks after detection later changes or goes null', () => {
  const tapped = { startMode: 'auto' as const, from: 'home', fromExplicit: true };
  assert(effectiveFromId({ ...tapped, detectedId: 'depot' }) === 'home', 'tap must survive detection changing to a third landmark');
  assert(effectiveFromId({ ...tapped, detectedId: null }) === 'home', 'tap must survive detection going null entirely');
});

test('effectiveFromId: tapping the detected pill itself is a no-op that still "sticks"', () => {
  // Tapping the already-detected landmark sets fromExplicit=true with
  // from === detectedId — result is unchanged, but it must now be locked in
  // (a later detection change must not silently override it).
  assert(
    effectiveFromId({ startMode: 'auto', detectedId: 'work', from: 'work', fromExplicit: true }) === 'work',
    'tapping the detected pill must still read as work immediately after',
  );
  assert(
    effectiveFromId({ startMode: 'auto', detectedId: 'depot', from: 'work', fromExplicit: true }) === 'work',
    'and must stay work once detection moves on — the earlier tap-of-the-suggestion still sticks',
  );
});

test('effectiveFromId: tapping `new` in auto mode now takes hold (was previously silently ignored)', () => {
  assert(
    effectiveFromId({ startMode: 'auto', detectedId: 'work', from: '~new', fromExplicit: true }) === '~new',
    'tapping new while a landmark is detected must win, exactly like any other explicit tap',
  );
});
