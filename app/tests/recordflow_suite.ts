/**
 * RECORD three-phase flow (Cycle 024, WP-A2) — pure suite for recordFlow.ts.
 * No RN involved: these are the exact rules RecordScreen.tsx's phase state
 * machine and status line are built from.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, test, TESTS_DIR } from './lib.ts';
import {
  canTransition, effectiveFromId, endingSlotFor, isFullscreen, liveMapOverlayFor, namingOfferMode, recordPressAction, type RecordPhase,
  wayHintForPick, interruptedRideAction, INTERRUPTED_MIN_FIXES,
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

test('liveMapOverlayFor: route mode, nothing picked -> no route line, trail shown (writing history)', () => {
  const r = liveMapOverlayFor({ wayHint: null });
  assert(r.wayId === null && r.showTrail === true, `expected {routeId:null, showTrail:true}, got ${JSON.stringify(r)}`);
});

test('liveMapOverlayFor: a picked known route shows its line and hides the trail from the first frame', () => {
  const r = liveMapOverlayFor({ wayHint: 'HomeWork' });
  assert(r.wayId === 'HomeWork' && r.showTrail === false, `expected {routeId:'HomeWork', showTrail:false}, got ${JSON.stringify(r)}`);
});

test('virgin-cycle21 03: the overlay is the pick whatever the engine does — there is no engine input', () => {
  assert(liveMapOverlayFor.length === 1, `liveMapOverlayFor takes ${liveMapOverlayFor.length} parameters, want exactly 1 (wayHint)`);
  assert(liveMapOverlayFor({ wayHint: 'HomeWork' }).wayId === 'HomeWork', 'the overlay is not the pick');
  // an extra engine-shaped field is ignored: the pick still decides
  const r = liveMapOverlayFor({ wayHint: 'HomeWork', track: 'EveningA' } as unknown as { wayHint: string | null });
  assert(r.wayId === 'HomeWork', `an engine track changed the overlay: ${JSON.stringify(r)}`);
  const src = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'RecordScreen.tsx'), 'utf8');
  assert(src.includes('liveMapOverlayFor({ wayHint: rideWayHint })'), 'RecordScreen no longer feeds the overlay the START-frozen pick alone');
  const calls = src.match(/liveMapOverlayFor\([^)]*\)/g) ?? [];
  assert(calls.length > 0 && calls.every((c) => !c.includes('live.track')), `a liveMapOverlayFor call reads live.track: ${calls.join(' | ')}`);
});

test('liveMapOverlayFor: trail and route line are mutually exclusive in every reachable state', () => {
  const hints: Array<string | null> = [null, 'B'];
  for (const wayHint of hints) {
    const r = liveMapOverlayFor({ wayHint });
    assert(
      r.showTrail === (r.wayId === null),
      `mutual exclusivity violated for routeHint=${wayHint}: ${JSON.stringify(r)}`,
    );
  }
});

test('recordPressAction (virgin-cycle20 08): zero sports → no-sport (flash + SETTINGS), otherwise arm', () => {
  assert(recordPressAction({ sportCount: 0 }) === 'no-sport', 'zero sports must not arm');
  assert(recordPressAction({ sportCount: 1 }) === 'arm', '1 sport must arm');
  assert(recordPressAction({ sportCount: 3 }) === 'arm', '3 sports must arm');
});

test('recordPressAction: the first sport added in SETTINGS becomes active, so the next RECORD press arms', () => {
  const result = addSport(emptySports(), 'Bike', 1_000);
  assert(!Array.isArray(result), `addSport must succeed for a fresh label, got ${JSON.stringify(result)}`);
  if (Array.isArray(result)) return;
  assert(result.activeSportId === result.sports[0].id, 'the first sport added must become the active sport');
  assert(recordPressAction({ sportCount: result.sports.length }) === 'arm', 'once a sport exists the press must arm');
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

test('virgin-cycle20 04: PAUSE bar is the bare word — no "recording continues" sub-text, no stopSlimSub style', () => {
  const src = fs.readFileSync(path.resolve(TESTS_DIR, '..', 'src', 'ui', 'RecordScreen.tsx'), 'utf8');
  assert(!src.includes('recording continues'), 'PAUSE sub-text copy must be gone (Nathan, 2026-09-30)');
  assert(!src.includes('resume or end'), 'PAUSE sub-text copy must be gone (Nathan, 2026-09-30)');
  assert(!src.includes('stopSlimSub'), 'unused stopSlimSub style removed');
  const pause = src.indexOf("noteButtonPress('pause')");
  assert(pause >= 0, 'PAUSE Pressable present');
  const block = src.slice(pause, src.indexOf('</Pressable>', pause));
  assert((block.match(/<Text\b/g) ?? []).length === 1 && block.includes('>PAUSE</Text>'), 'PAUSE Pressable has exactly one Text child: the word');
});

test('virgin-cycle20 05: no user-visible "ride" wording left in the UI sources (activity instead)', () => {
  // Visible = inside a quoted string or JSX text. Identifiers, ids, paths and comments are
  // allowed to keep "ride". The allowlist is deliberately narrow; extend it only for a new
  // identifier, never for a new string.
  const UI = path.resolve(TESTS_DIR, '..', 'src', 'ui');
  const files = [
    ...fs.readdirSync(UI).filter((f) => /\.tsx?$/.test(f)).map((f) => path.join(UI, f)),
    path.resolve(TESTS_DIR, '..', 'App.tsx'),
    path.resolve(TESTS_DIR, '..', 'src', 'store', 'sports.ts'),
    path.resolve(TESTS_DIR, '..', 'src', 'store', 'routeFromRide.ts'),
    path.resolve(TESTS_DIR, '..', 'src', 'location', 'index.ts'),
  ];
  const offenders: string[] = [];
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    let inBlockComment = false;
    lines.forEach((raw, i) => {
      let line = raw;
      // strip block comments (single- and multi-line) and line comments
      if (inBlockComment) { const e = line.indexOf('*/'); if (e < 0) return; line = line.slice(e + 2); inBlockComment = false; }
      line = line.replace(/\/\*[\s\S]*?\*\//g, '');
      const bs = line.indexOf('/*'); if (bs >= 0) { line = line.slice(0, bs); inBlockComment = true; }
      line = line.replace(/\{\/\*[\s\S]*$/, '');
      const ls = line.indexOf('// '); if (ls >= 0) line = line.slice(0, ls);
      // (1) quoted strings and template literals
      const strings = line.match(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g) ?? [];
      // (2) JSX text between > and < on one line
      const jsx = line.match(/>[^<>{}]*[A-Za-z][^<>{}]*</g) ?? [];
      // (3) bare JSX text lines (multi-line <Text> children): after dropping {…}
      // expressions, a line with two or more words and no code punctuation
      const bare = line.replace(/\{[^{}]*\}/g, '').trim();
      const bareText = /[A-Za-z]\s+[A-Za-z]/.test(bare) && !/[=;<>()[\]`'"]/.test(bare) ? [bare] : [];
      for (const raw of [...strings, ...jsx, ...bareText]) {
        // `${…}` bodies are code, not text (e.g. `${usage.rides}`): blank them so only the
        // literal characters of a template are tested (ruling 2026-10-03, executor escalation).
        const s = raw.replace(/\$\{[^{}]*\}/g, '${}');
        if (!/\b(ride|rides|Ride|Rides|RIDE|RIDES)\b/.test(s)) continue;
        // allowed: tab / source ids, MapLibre layer ids, storage paths and keys, id prefixes
        if (/^["'](rides|ride|rider|rider-dot|ride-trace|ride-trace-core)["']$/.test(s)) continue;
        if (/rides\//.test(s) || /demo:(first|second)-ride/.test(s) || /qualifire-(ride-tracking|active-ride)/.test(s)) continue;
        if (/free-rides-cache/.test(s) || /^`ride:/.test(s) || /lm:\$\{/.test(s)) continue;
        // allowed: GateSet `note` written by routeFromRide.ts — stored metadata, never rendered
        // (no `.note` read anywhere in src/ui; same carve-out the brief gives routeCreation.ts).
        // Anchored to the file and the literal's opening words so any other string still fails.
        if (path.basename(file) === 'routeFromRide.ts' && /^`re-seeded when ride \$\{\} became the reference/.test(s)) continue;
        offenders.push(`${path.basename(file)}:${i + 1}: ${s.trim()}`);
      }
    });
  }
  assert(offenders.length === 0, `visible "ride" wording remains:\n${offenders.join('\n')}`);
});

test('virgin-cycle20 08: clutter text is gone (CLUTTER-REVIEW §1 + Nathan\'s §2 answers)', () => {
  const read = (...p: string[]) => fs.readFileSync(path.resolve(TESTS_DIR, '..', ...p), 'utf8');
  const rec = read('src', 'ui', 'RecordScreen.tsx');
  for (const gone of [
    'the clock runs from here', 'with this sport', 'no sport yet', 'Ready to record.', 'your pick is locked',
    'SET UP A SPORT', 'FirstSportPrompt', 'firstSportPrompt', 'onFirstSport', 'back to setup', 'ready — not started', 'PICK ONE', 'Find it in',
    'waiting for first GPS fix', 'GPS struggling', 'writing history', 'detecting route', 'way locked',
    'Unfinished ', 'Discard for now', 'No sport set up', 'That way already exists', 'Recovered after relaunch', 'nothing was lost on disk', '— last:',
    'Location permission was denied', 'Background location', 'Open app settings', 'warnBox', 'problemStates',
    'statusItemsFor', 'PIN_MS', 'WRITING_HISTORY_AFTER_FIXES', 'gpsFlash', 'flashGpsOff', 'settings.liveMap',
  ]) assert(!rec.includes(gone), `RecordScreen still contains "${gone}"`);
  for (const kept of ["'GPS live'", 'PERM_DENIED_MSG', 'PERM_FOREGROUND_ONLY_MSG', 'PERM_FLASH_HOLD_MS = 5000', 'NO_SPORT_MSG', 'NO_SPORT_FLASH_HOLD_MS = 1000', 'GPS_FLASH_HOLD_MS = 2000', "tabNav.go('settings')", 'recoveryAutoSaveStarted', 'dropStaleSession', 'markRideFree(', 'Activity saved · '])
    assert(rec.includes(kept), `RecordScreen lacks "${kept}"`);
  assert(!fs.existsSync(path.resolve(TESTS_DIR, '..', 'src', 'ui', 'firstSportPrompt.tsx')), 'firstSportPrompt.tsx moved out');
  const flow = read('src', 'ui', 'recordFlow.ts');
  assert(!flow.includes('statusItemsFor') && !flow.includes('open-first-sport') && flow.includes("'no-sport'"), 'recordFlow trimmed');
  const set = read('src', 'ui', 'settings.tsx');
  // comment lines and the two on-load scrub lines (`delete (saved as Record<string, unknown>).liveMap/tower`) legitimately keep the retired key names
  const setCode = set.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l) && !/delete \(saved as Record<string, unknown>\)/.test(l)).join('\n');
  for (const gone of ['liveMap', 'tower', 'Live map', 'Rankings', 'SCORING', 'Sport picker on RECORD', 'Places & routes', 'shareStoreFile', 'Race your past', 'delete those first', 'two export buttons'])
    assert(!setCode.includes(gone), `settings still contains "${gone}"`);
  for (const kept of ['Choose sport at start', 'label="Sector colours"', 'hint="Colour sectors on live map"', 'Race yourself', 'Export app', 'shareAppExport', 'qualifire-export-'])
    assert(set.includes(kept), `settings lacks "${kept}"`);
  const det = read('src', 'ui', 'RideDetailScreen.tsx');
  for (const gone of ['personal best sectors', 'pbSectors', 'on file yet', 'not compared to anything', 'sector times not on file', 'recorded only', 's.tower', '— ref', 'no lap time on file'])
    assert(!det.includes(gone), `RideDetailScreen still contains "${gone}"`);
  assert(det.includes('loadReplayRider') && det.includes('canReplay') && det.includes('>ref</Text>'), 'Replay gated; ref marker kept');
  const hist = read('src', 'ui', 'rideHistoryModel.ts');
  assert(!hist.includes('pbSectors') && hist.includes('· ref`'), 'pbSectors gone; list row keeps its ref marker');
  const rides = read('src', 'ui', 'RidesScreen.tsx');
  for (const gone of ['matching ways', 'Loading…', 'recorded only', 'backfilling', 'Record one', 'NO SPORT YET —']) assert(!rides.includes(gone), `RidesScreen still contains "${gone}"`);
  for (const f of ['ResultsScreen.tsx', 'RoutesScreen.tsx', 'RidesScreen.tsx']) assert(read('src', 'ui', f).includes('NO SPORT YET · ADD ONE IN SETTINGS'), `${f} badge`);
  assert(!read('src', 'ui', 'ResultsScreen.tsx').includes('DO A ROUTE FIRST'), 'RESULTS empty state is the first clause only');
  const rep = read('src', 'ui', 'ReplayScreen.tsx');
  assert(!rep.includes('loading replay') && !rep.includes('never crossed START') && !rep.includes('settings.liveMap'), 'ReplayScreen texts removed');
  const gate = read('src', 'ui', 'GateAdjustScreen.tsx');
  assert(!gate.includes('cannot be edited') && !gate.includes('nudge it') && !gate.includes('Sector gates') && gate.includes('Tap a gate to move it') && gate.includes('discardLabel="discard nudges"'), 'GateAdjust screen strings');
  const card = read('src', 'ui', 'gateAdjustCard.tsx');
  assert(!card.includes('Sector gates') && !card.includes('Seeded at') && !card.includes('keep the proposal') && card.includes("'Tap a gate to move it'"), 'gate card defaults');
  const rd = read('src', 'ui', 'ResultsDetailScreen.tsx');
  assert(!rd.includes('not ranked') && !rd.includes('rankingsOn') && !rd.includes('useSettings'), 'ResultsDetail divider + rankings switch gone');
  const model = read('src', 'ui', 'rideDetailModel.ts');
  for (const kept of ["'not ranked'", "'no rank'", "'too few to rank'", "'no time'", "'no lap'"]) assert(model.includes(kept), `rankLine lacks ${kept}`);
  const naming = read('src', 'ui', 'routeNamingCard.tsx');
  assert(!naming.includes('becomes its reference') && !naming.includes('name where you rode') && !naming.includes('— e.g. Dry, Left') && !naming.includes('pick it on RECORD next time'), 'naming card tails removed');
  const demo = read('src', 'ui', 'DemoScreen.tsx');
  assert(demo.includes('Not part of the final app · use only') && demo.includes('demo · nothing is recorded') && !demo.includes('settings.liveMap') && !demo.includes('settings.tower'), 'Demo: only the settled dash + settings reads');
  // Alert.alert body continuation lines (dialog prose, Decision 10 — not screen text): exact literals, reported to the coordinator.
  const EM_DASH_ALERT_BODIES = [
    'against the new reference — old times and ranks do not survive.',
    'against the new gates — old times and ranks do not survive, the activities do.',
    'There was nothing on this phone to move — it was already at first launch.',
    'Nothing was moved — the reset did not start. Your data is untouched.',
  ];
  // Em dashes (Q7): none left in a visible string of these files (alerts excluded by file choice; '—' placeholders are not " — ")
  for (const f of ['RecordScreen.tsx', 'RideDetailScreen.tsx', 'rideDetailModel.ts', 'rideHistoryModel.ts', 'ResultsScreen.tsx', 'RoutesScreen.tsx', 'RidesScreen.tsx', 'ReplayScreen.tsx', 'GateAdjustScreen.tsx', 'gateAdjustCard.tsx', 'routeNamingCard.tsx', 'settings.tsx']) {
    const lines = read('src', 'ui', f).split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l) && !/Alert\.alert\(/.test(l));
    const hits = lines.filter((l) => /['"`>][^'"`<]*\S — \S[^'"`<]*/.test(l) && !/^\s*(['"`]|\$\{|\\n)/.test(l.trim()) && !EM_DASH_ALERT_BODIES.some((a) => l.includes(a)));
    assert(hits.length === 0, `${f} still has an em dash in a visible string:\n${hits.join('\n')}`);
  }
  assert(read('src', 'location', 'index.ts').includes("notificationTitle: 'Recording activity'"), 'notification title is the bare noun');
});

test('virgin-cycle21 04: wayHintForPick maps the pick to its refLineId; null/undefined/unknown -> null', () => {
  const ways = [{ id: 'A', refLineId: 'refA' }, { id: 'B', refLineId: 'B' }];
  assert(wayHintForPick(ways, 'A') === 'refA', 'A -> refA');
  assert(wayHintForPick(ways, 'B') === 'B', 'B -> B');
  assert(wayHintForPick(ways, null) === null, 'null -> null');
  assert(wayHintForPick(ways, undefined) === null, 'undefined -> null');
  assert(wayHintForPick(ways, 'Z') === null, 'unknown -> null');
});

test('virgin-cycle21 04: interruptedRideAction discards under 30 fixes, files free from 30', () => {
  assert(INTERRUPTED_MIN_FIXES === 30, 'threshold is 30');
  assert(interruptedRideAction(0) === 'discard' && interruptedRideAction(29) === 'discard', '0 and 29 discard');
  assert(interruptedRideAction(30) === 'free' && interruptedRideAction(5000) === 'free', '30 and 5000 free');
});

test('virgin-cycle21 04: RecordScreen only continues a remounted live ride; every other recovery is saved free and flashed', () => {
  const src = fs.readFileSync(path.resolve(TESTS_DIR, '..', 'src', 'ui', 'RecordScreen.tsx'), 'utf8');
  const head = "if (rec.tracking && rec.restoration === 'remount') {";
  const at = src.indexOf(head);
  assert(at > 0, 'remount-only continue branch missing');
  assert(!src.includes('if (rec.tracking) {'), 'the old unconditional resume branch must be gone');
  const guard = src.indexOf('recoveryAutoSaveStarted = true;', at);
  assert(guard > at, 'recovery guard missing');
  assert(src.slice(at, guard).includes('setRideWayHint(wayHintForPick(currentCatalog().ways, rec.session.pickId ?? null));'),
    'the remount branch must restore the route line from the pick');
  const end = src.indexOf('catch (e)', guard);
  assert(end > guard, 'catch (e) after the guard missing');
  const block = src.slice(guard, end);
  const order = ['await stopTracking();', 'interruptedRideAction(sum.nFixes) === \'discard\'', 'await deleteRide(sum.rideId);', 'markRideFree(\n', 'flashSub(INTERRUPTED_MSG, INTERRUPTED_FLASH_HOLD_MS);'];
  let last = -1;
  for (const o of order) {
    const i = block.indexOf(o, last + 1);
    assert(i > last, `missing or out of order in the interrupted path: ${o}`);
    last = i;
  }
  assert(src.includes("const INTERRUPTED_MSG = 'Interrupted · saved as free activity';"), 'INTERRUPTED_MSG constant');
});
