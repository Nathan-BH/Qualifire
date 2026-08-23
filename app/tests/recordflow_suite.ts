/**
 * RECORD three-phase flow (Cycle 024, WP-A2) — pure suite for recordFlow.ts.
 * No RN involved: these are the exact rules RecordScreen.tsx's phase state
 * machine and status line are built from.
 */
import { assert, test } from './lib.ts';
import {
  canTransition, isFullscreen, statusItemsFor, type RecordPhase,
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
