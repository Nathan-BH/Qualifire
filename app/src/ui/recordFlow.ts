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
  running: new Set<RecordPhase>(['ending', 'setup']), // setup: recovery declined / stop failure fallback / discard
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
 *   running -> setup  recovery declined, stopTracking() threw on END, or DISCARD (ride deleted, nothing saved)
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

/** STARTING FROM in the setup/armed phases (notes5 N5): in 'auto' start mode
 * the detected landmark is a SUGGESTION — it stands in for `from` only while
 * the rider has not tapped a START pill this ride. An explicit tap
 * (`fromExplicit`) wins and sticks, even if detection later changes or goes
 * null; 'pick' mode never consults detection at all.
 * virgin-cycle27 01 (Nathan 2026-10-08 ruling 1.2): no 'pick' mode any more — detection is always consulted until the rider taps a START pill. */
export function effectiveFromId(input: {
  detectedId: string | null;
  from: string;
  fromExplicit: boolean;
}): string {
  if (input.fromExplicit) return input.from;
  return input.detectedId ?? input.from;
}

/** Cycle-2 WP-A (Nathan 2026-09-04), rewritten virgin-cycle21 (Nathan 2026-10-03):
 * what the RUNNING map overlays. It is the way picked at START (frozen in
 * `rideWayHint`) and NOTHING the engine detects can change it. Two states:
 *  1. nothing picked (a 'new' end)   -> no route line, trail shown the whole ride
 *  2. a way picked                   -> that way's line, trail HIDDEN, from the first frame
 * The trail is shown exactly when no reference line is — never both (the
 * "two yellow lines overlap" bug), never neither. */
export type LiveMapOverlay = { wayId: string | null; showTrail: boolean };
export function liveMapOverlayFor(input: { wayHint: string | null }): LiveMapOverlay {
  return { wayId: input.wayHint, showTrail: input.wayHint === null };
}

/** virgin-cycle21 04: the running map's route line after a UI remount of a still-running
 * ride (RecordScreen state is gone, the engine is not). The pick is a TrackSpec/way id;
 * the map wants that way's refLineId (as rideWayHint does at START). Unknown/absent -> null. */
export function wayHintForPick(
  ways: readonly { id: string; refLineId: string }[], pickId: string | null | undefined,
): string | null {
  if (pickId === null || pickId === undefined) return null;
  return ways.find((w) => w.id === pickId)?.refLineId ?? null;
}

/** virgin-cycle21 04 (Nathan 2026-10-04): an interrupted ride is never resumed or scored.
 * What was recorded is saved as a free activity, unless it is too short to mean anything
 * (under INTERRUPTED_MIN_FIXES raw fixes, ~30 s at 1 Hz): then it is discarded. */
export const INTERRUPTED_MIN_FIXES = 30;
export function interruptedRideAction(nFixes: number): 'free' | 'discard' {
  return nFixes >= INTERRUPTED_MIN_FIXES ? 'free' : 'discard';
}

/** virgin-cycle20 brief 08 (Nathan, clutter review Q4): what the big RECORD
 * button does on press. 'no-sport' = zero sports → RecordScreen flashes
 * "No sport configured yet" and switches to SETTINGS (whose SPORTS card adds
 * the first sport); 'arm' = at least one sport → onRecord as always. The
 * inline first-sport prompt (virgin-cycle15 brief 02) is retired. */
export type RecordPressAction = 'no-sport' | 'arm';
export function recordPressAction(input: { sportCount: number }): RecordPressAction {
  return input.sportCount > 0 ? 'arm' : 'no-sport';
}

/** virgin-cycle15 brief 05 (Nathan 2026-09-26): how loud the STOP-time naming
 * offer is. 'none' = no draft (nothing to offer); 'quiet' = the ride is on a
 * route the rider has AND the engine scored it as one of that route's ways —
 * the ride is already saved as that way, so the screen proceeds by itself and
 * only a small "not <way>?" link is shown; 'card' = every other draft (new
 * route, or a route with no matching way): nothing to assume, full card as
 * before. Takes the two ids rather than the draft type so the rule has no
 * store import. */
export type NamingOfferMode = 'none' | 'quiet' | 'card';
export function namingOfferMode(draft: { existingRouteId?: string | null; matchedWayId?: string | null } | null): NamingOfferMode {
  if (draft === null) return 'none';
  return draft.existingRouteId && draft.matchedWayId ? 'quiet' : 'card';
}

/** virgin-cycle15 brief 05 follow-up (Inspect 2026-09-28): what the 'ending'
 * screen's slot under the tower shows. Before the reveal has landed
 * (`revealDone` false — tower climb + REVEAL_HOLD_MS hold) a quiet offer shows
 * the one-line "not <way>?" link, and nothing else is ever shown there. Once
 * landed: the gate-adjust card outranks everything; the naming card shows for
 * a full-card offer, or for a quiet offer the rider expanded via the link.
 * The card is never shown before the reveal has landed — the hold timer must
 * not be pending while a card exit could start the end mark (see
 * RecordScreen's onNotThisWay). */
export type EndingSlot = 'adjust' | 'card' | 'link' | 'none';
export function endingSlotFor(input: {
  revealDone: boolean; adjust: boolean; offer: NamingOfferMode; namingExpanded: boolean;
}): EndingSlot {
  if (!input.revealDone) return input.offer === 'quiet' && !input.namingExpanded ? 'link' : 'none';
  if (input.adjust) return 'adjust';
  if (input.offer === 'card' || (input.offer === 'quiet' && input.namingExpanded)) return 'card';
  return 'none';
}


/** virgin-cycle26 brief 01 (Nathan 2026-10-08): GOING TO offers a `loop` pill
 * meaning "finish where I start" instead of listing the START place twice.
 * A UI sentinel like RecordScreen's NEW_ID ('~new'): never a catalog id. */
export const LOOP_ID = '~loop';

/** What the START / GOING TO pair means right now. `to === LOOP_ID` resolves
 * to the START place at the moment of use, so a loop follows a START change
 * and auto-detection. A stale `to` equal to the START place (the rider picked
 * a destination, then made it the start) is the SAME selection — shown as the
 * loop pill being on, never as a hidden state. `newId` is the '~new' sentinel:
 * new → new is the ordinary first ride, not a loop (STOP's draft decides by
 * geometry what it becomes). `toId` is what the route lookup, the armed title
 * and the start context consume. */
export function resolveGoingTo(to: string, fromId: string, newId: string): { toId: string; loop: boolean } {
  if (to === LOOP_ID || (to === fromId && to !== newId)) return { toId: fromId, loop: true };
  return { toId: to, loop: false };
}

/** The Route a START / GOING TO pair resolves to: the FIRST route with exactly
 * this start and this end. `fromId === toId` is a loop and resolves like any
 * other pair — the same first-match rule STOP's existingRouteFor
 * (store/routeCreation.ts) uses, so RECORD finds the Route STOP would have
 * attached the ride to. A '~new' / '~loop' endpoint never matches (no route
 * has that id) and yields undefined = free ride. Generic over the two id
 * fields so this module stays import-free. */
export function routeForEndpoints<R extends { startLandmarkId: string; endLandmarkId: string }>(
  routes: readonly R[], fromId: string, toId: string,
): R | undefined {
  return routes.find((r) => r.startLandmarkId === fromId && r.endLandmarkId === toId);
}

/** virgin-cycle28 04 (Nathan 2026-10-09): WHICH WAY TODAY? shows for any known route, one way included,
 * because it carries the 'new' pill. */
export function showWhichWay(routeWayCount: number): boolean {
  return routeWayCount >= 1;
}

/** virgin-cycle28 04 (4b): the 'new' pill's state is the id of the route it was tapped on (null = off).
 * A tap toggles it; nothing else ever sets it, so it is never the default on any route. */
export function toggleNewWay(cur: string | null, routeId: string): string | null {
  return cur === routeId ? null : routeId;
}

/** On only for the route it was tapped on: an id left over from another pair reads as off. */
export function newWayOn(cur: string | null, routeId: string | null): boolean {
  return routeId !== null && cur === routeId;
}

/** virgin-cycle26 brief 05: the '~new' sentinel RecordScreen keeps as its
 * module-local NEW_ID ("no place picked" / the first ride from or to an
 * unknown place). Mirrored here, pure and testable, so a ride's logged pick
 * fact (PickEvent.from / .to, written verbatim from the start context) can be
 * read back without a UI import. A test pins the two literals together. */
export const NEW_ID = '~new';

/** Whether a ride's logged pick fact names a loop: the same REAL place at
 * both ends. `new → new` (both '~new', the blank-install first ride) is not a
 * loop -- its title stays "new → new" (resolveGoingTo's rule, applied to what
 * was logged). Missing fields (older sidecars) are never a loop. */
export function pickedLoop(from: string | null | undefined, to: string | null | undefined): boolean {
  return !!from && from !== NEW_ID && from === to;
}
