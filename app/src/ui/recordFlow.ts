/**
 * RECORD three-phase flow — pure, headless-testable rules (Cycle 024, WP-A2,
 * Nathan 2026-08-19): "the START button should be replaced with a record
 * button. When clicked, it should show the nice animation and then take you
 * to the RACE screen but still not started. There the selected route should
 * be shown with your location and everything set but not started. Then on
 * that screen you can actually press start and start moving."
 *
 * Three real phases (RecordScreen owns the state machine; this module owns
 * only the pure transition/derivation rules so they can be tested without
 * React Native):
 *   setup   — pick from/to/route, press RECORD (arms; nothing starts).
 *   armed   — route + location shown, engine/clock NOT running (D-042: the
 *             clock anchor is startTracking()'s startedAtMs, untouched by
 *             this brief). Press START to actually begin.
 *   running — recording + the live engine's clock, exactly as before this
 *             brief.
 * `ending` is transient: END has been pressed, the ride is saved and
 * stopTracking() has run, and the reversed launch mark is playing before the
 * screen folds back to setup and hands off to Result.
 *
 * D-042 (untouched by this brief): PAUSE is an accidental-stop guard, never
 * a real pause — recording and the clock start at START and never stop
 * until END. The armed phase records nothing and starts nothing.
 */

export type RecordPhase = 'setup' | 'armed' | 'running' | 'ending';

const LEGAL_TRANSITIONS: Record<RecordPhase, ReadonlySet<RecordPhase>> = {
  setup: new Set<RecordPhase>(['armed', 'running']), // running: relaunch recovery restores a session directly
  armed: new Set<RecordPhase>(['setup', 'running']),
  running: new Set<RecordPhase>(['ending', 'setup']), // setup: recovery declined / stop failure fallback
  ending: new Set<RecordPhase>(['setup']),
};

/** Is `to` a legal move from `from`? Table mirrors RecordScreen's own phase
 * transitions exactly — see the module doc comment for what drives each one:
 *   setup -> armed    RECORD pressed (permissions ok)
 *   armed -> setup    back/cancel
 *   armed -> running  START pressed
 *   running -> ending END pressed, save done, reverse anim now playing
 *   ending -> setup   reverse anim finished
 *   setup -> running  relaunch recovery: a live session was found on mount
 *   running -> setup  recovery declined, or stopTracking() threw on END
 * Everything else (including same-phase "transitions") is illegal. */
export function canTransition(from: RecordPhase, to: RecordPhase): boolean {
  return LEGAL_TRANSITIONS[from].has(to);
}

/** armed/running/ending all hide the tab bar (mockup L734: "armed + running
 * are 'full screen'" — ending is the reversed launch mark playing over the
 * running screen's own fullscreen state, so it stays fullscreen too; the tab
 * bar only returns once `ending` folds back to `setup`). */
export function isFullscreen(phase: RecordPhase): boolean {
  return phase === 'armed' || phase === 'running' || phase === 'ending';
}

/** The rotating status-line items (IDEAS §24) while running — WITHOUT any
 * fixes count ("I don't know what 'fixes' are" — Nathan 2026-08-19; the raw
 * count stays in the GPX+ sidecar for diagnostics, never a user-facing
 * line). Trouble jumps the queue via ordering only — content stays honest,
 * nothing hidden (mirrors mockup L484: route + 'gps live' only). */
export function statusItemsFor(input: {
  gpsTrouble: boolean;
  gpsLine: string;
  routeLine: string;
}): string[] {
  return input.gpsTrouble
    ? [input.gpsLine, input.routeLine]
    : [input.routeLine, input.gpsLine];
}
