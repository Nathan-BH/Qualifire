/**
 * RECORD three-phase flow (Cycle 024, WP-A2) — pure suite for recordFlow.ts.
 * No RN involved: these are the exact rules RecordScreen.tsx's phase state
 * machine and status line are built from.
 */
import { assert, test } from './lib.ts';
import {
  canTransition, effectiveFromId, endingSlotFor, isFullscreen, liveMapOverlayFor, namingOfferMode, recordPressAction, statusItemsFor, type RecordPhase,
} from '../src/ui/recordFlow.ts';
import { addSport, emptySports } from '../src/store/sports.ts';

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
  const wayLine = 'Morning · route locked';

  const calm = statusItemsFor({ gpsTrouble: false, gpsLine, wayLine });
  assert(calm.length > 0, 'statusItemsFor must return non-empty items');
  assert(calm.every((s) => typeof s === 'string' && s.length > 0), 'every item must be a non-empty string');
  assert(!calm.some((s) => fixesCountPattern.test(s)), `no calm item may carry a raw fixes count: ${JSON.stringify(calm)}`);
  assert(calm[0] === wayLine, 'calm order must lead with the route line');

  const trouble = statusItemsFor({ gpsTrouble: true, gpsLine: troubleLine, wayLine });
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

test('liveMapOverlayFor: route mode, nothing picked, nothing locked -> no route line, trail shown (writing history)', () => {
  const r = liveMapOverlayFor({ track: null, wayHint: null });
  assert(r.wayId === null && r.showTrail === true, `expected {routeId:null, showTrail:true}, got ${JSON.stringify(r)}`);
});

test('liveMapOverlayFor: a picked known route shows its line and hides the trail from the first frame', () => {
  const r = liveMapOverlayFor({ track: null, wayHint: 'HomeWork' });
  assert(r.wayId === 'HomeWork' && r.showTrail === false, `expected {routeId:'HomeWork', showTrail:false}, got ${JSON.stringify(r)}`);
});

test('liveMapOverlayFor: a lock outranks the pick hint and hides the trail', () => {
  const r = liveMapOverlayFor({ track: 'HomeWork', wayHint: null });
  assert(r.wayId === 'HomeWork' && r.showTrail === false, `expected {routeId:'HomeWork', showTrail:false}, got ${JSON.stringify(r)}`);
  // documents existing precedence (track wins over hint) — the engine's hard-pick
  // rule never actually produces a differing pair, but the derivation must be total
  const r2 = liveMapOverlayFor({ track: 'EveningA', wayHint: 'HomeWork' });
  assert(r2.wayId === 'EveningA', `track must outrank routeHint, got ${JSON.stringify(r2)}`);
});

test('liveMapOverlayFor: trail and route line are mutually exclusive in every reachable state', () => {
  const tracks: Array<string | null> = [null, 'A'];
  const hints: Array<string | null> = [null, 'B'];
  for (const track of tracks) {
    for (const wayHint of hints) {
      const r = liveMapOverlayFor({ track, wayHint });
      assert(
        r.showTrail === (r.wayId === null),
        `mutual exclusivity violated for track=${track} routeHint=${wayHint}: ${JSON.stringify(r)}`,
      );
    }
  }
});

test('recordPressAction: fresh install — the first RECORD press opens the first-sport prompt, never navigates', () => {
  assert(
    recordPressAction({ sportCount: 0, firstSportPrompt: false }) === 'open-first-sport',
    'zero sports, prompt closed must open the first-sport prompt',
  );
});

test('recordPressAction: press 2 saves the typed sport and arms', () => {
  assert(
    recordPressAction({ sportCount: 0, firstSportPrompt: true }) === 'add-first-sport',
    'zero sports, prompt open must save and arm',
  );
});

test('recordPressAction: at least one sport always arms', () => {
  assert(recordPressAction({ sportCount: 1, firstSportPrompt: false }) === 'arm', '1 sport must arm');
  assert(recordPressAction({ sportCount: 3, firstSportPrompt: false }) === 'arm', '3 sports must arm');
});

test('recordPressAction: a stale prompt flag is ignored once a sport exists', () => {
  assert(
    recordPressAction({ sportCount: 1, firstSportPrompt: true }) === 'arm',
    'a stale prompt flag (sport added in SETTINGS meanwhile) must not block arming',
  );
});

test('recordFlow: onFirstSport\'s save-then-arm sequence — after addSport, the very next press is a plain arm', () => {
  const result = addSport(emptySports(), 'Bike', 1_000);
  assert(!Array.isArray(result), `addSport must succeed for a fresh label, got ${JSON.stringify(result)}`);
  if (Array.isArray(result)) return;
  assert(
    result.activeSportId === result.sports[0].id,
    'the first sport added must become the active sport',
  );
  assert(
    recordPressAction({ sportCount: result.sports.length, firstSportPrompt: true }) === 'arm',
    'once the sport is saved, the next press must be a plain arm',
  );
});
test('namingOfferMode: no draft => none', () => {
  assert(namingOfferMode(null) === 'none', 'null draft must be none');
});

test('namingOfferMode: scored as an existing way of a route you have => quiet (default-assumed-correct case)', () => {
  assert(
    namingOfferMode({ existingRouteId: 'r1', matchedWayId: 'w1' }) === 'quiet',
    'existingRouteId + matchedWayId both set: the ride is already saved as that way, no card',
  );
});

test('namingOfferMode: route exists but no way matched => card (variant 3 — nothing to assume)', () => {
  assert(
    namingOfferMode({ existingRouteId: 'r1', matchedWayId: null }) === 'card',
    'route exists, no way matched: nothing to assume',
  );
});

test('namingOfferMode: scored, but no route between these places => card (variant 1b — still a new route)', () => {
  assert(
    namingOfferMode({ existingRouteId: null, matchedWayId: 'w1' }) === 'card',
    'scored, but no route between these places: still a new route',
  );
});

test('namingOfferMode: neither route nor way matched => card (variant 1c)', () => {
  assert(namingOfferMode({ existingRouteId: null, matchedWayId: null }) === 'card', 'variant 1c must be card');
});

test('namingOfferMode: both fields absent (undefined) => card', () => {
  assert(namingOfferMode({}) === 'card', 'both undefined must be card, same as both null');
});

test('endingSlotFor: quiet offer shows the link BEFORE the reveal lands (climb + hold), not after', () => {
  assert(endingSlotFor({ revealDone: false, adjust: false, offer: 'quiet', namingExpanded: false }) === 'link', 'during the hold the link must be up');
  assert(endingSlotFor({ revealDone: true, adjust: false, offer: 'quiet', namingExpanded: false }) === 'none', 'once landed with no tap, nothing — the end mark is playing');
});

test('endingSlotFor: a tapped quiet offer shows the card only once the reveal has landed', () => {
  assert(endingSlotFor({ revealDone: false, adjust: false, offer: 'quiet', namingExpanded: true }) === 'none', 'tapped mid-climb: link gone, card not yet (no card exit may run under a pending hold timer)');
  assert(endingSlotFor({ revealDone: true, adjust: false, offer: 'quiet', namingExpanded: true }) === 'card', 'tapped and landed: the full card');
});

test('endingSlotFor: a full-card offer never shows the link and shows the card once landed', () => {
  assert(endingSlotFor({ revealDone: false, adjust: false, offer: 'card', namingExpanded: false }) === 'none', 'card offers have no link');
  assert(endingSlotFor({ revealDone: true, adjust: false, offer: 'card', namingExpanded: false }) === 'card', 'card offer, landed');
});

test('endingSlotFor: no offer shows nothing in either state; the adjust card outranks a card once landed', () => {
  assert(endingSlotFor({ revealDone: false, adjust: false, offer: 'none', namingExpanded: false }) === 'none', 'no offer, climbing');
  assert(endingSlotFor({ revealDone: true, adjust: false, offer: 'none', namingExpanded: false }) === 'none', 'no offer, landed');
  assert(endingSlotFor({ revealDone: true, adjust: true, offer: 'none', namingExpanded: true }) === 'adjust', 'after ADD WAY the gate-adjust card is what shows');
  assert(endingSlotFor({ revealDone: false, adjust: true, offer: 'none', namingExpanded: true }) === 'none', 'adjust is a landed-only card too');
});
