/** Live-engine wiring suite — drives app/src/live/engine.ts (the exact class
 * the phone's recording loop feeds) headless over the committed fixtures.
 * Where engine_suite.ts proves app/core, this suite proves the session-side
 * wrapper: route auto-lock, live gate events, the honesty rules (estimated =>
 * no moving time / no colour inputs; skipped/offroute => missed), and the
 * parity anchor — displayed sector times must equal the offline pipeline's
 * numbers on the same buffer.
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import * as path from 'node:path';
import {
  test, assert, loadFixture, refFor, numEq, FIXTURES_DIR, fixtureSpecs,
  type Fixture, type SectorRow,
} from './lib.ts';
import {
  LiveProjector, toXY, xyToLatLon, parseGpx, resample, cumdist,
  type TrackId, type RefLine,
} from '../core/src/index.ts';
import type { LiveEngineState, LiveSector, DiagnosticEvent, TrackSpec, EngineEvent } from '../src/live/engine.ts';

// --- JSON-import shim -------------------------------------------------------
// 2026-08-16: engine.ts and refs.ts were normalized to the repo's
// '.ts'-extension import convention, so the resolver half of this shim is GONE
// — Node resolves them natively now, and "headless-replayable by design" holds
// without a workaround. What remains is refs.ts's bare `.json` import, which
// Metro bundles directly but Node's loader will not read without either this
// hook or an import attribute Metro does not yet support. One hook, one file.
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const { LiveEngine, LOCK_MIN_ADVANCE_M, LOCK_MARGIN_M, POOR_ACCURACY_M, REACQ_JUMP_M } =
  await import('../src/live/engine.ts');
const { catalogTrackSpecs } = await import('../src/live/tracks.ts');

const TRACKS: readonly TrackId[] = ['Morning', 'EveningA', 'EveningB'];
/** slack on lock-advance bounds: one 1 Hz fix at e-bike speed + ref resampling */
const LOCK_SLACK_M = 80;

interface DriveResult {
  engine: InstanceType<typeof LiveEngine>;
  final: LiveEngineState;
  /** fixesFed at the first emit with a non-null track (the lock moment) */
  lockAt: number | null;
  emits: number;
  lastEmitted: LiveEngineState | null;
}

/** `specs` defaults to the legacy four-track set (the existing suites' whole
 * point is auto-lock mechanics, not the catalog); pass `catalogTrackSpecs()`
 * explicitly for the cycle-024 full-catalog regression tests. `pickId`
 * (cycle 024) pre-seeds the RECORD-tab pick via an explicit start() before
 * the feed loop — undefined leaves feed()'s own no-pick auto-start untouched
 * (byte-identical to pre-024 behaviour for every caller that omits it). */
function drive(
  f: Fixture, fromIndex = 0, specs?: TrackSpec[], pickId?: string | null,
): DriveResult {
  const engine = new LiveEngine(specs ?? fixtureSpecs());
  let lockAt: number | null = null;
  let emits = 0;
  let lastEmitted: LiveEngineState | null = null;
  const unsub = engine.subscribe((s) => {
    emits += 1;
    lastEmitted = s;
    if (lockAt === null && s.track !== null) lockAt = s.fixesFed;
  });
  if (pickId !== undefined) engine.start({ pickId });
  for (let i = fromIndex; i < f.fixes.t.length; i++) {
    engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  }
  unsub();
  return { engine, final: engine.getState(), lockAt, emits, lastEmitted };
}

/** Candidate-advance replica: same LiveProjector + same refs the engine uses,
 * measured from the first fed fix — mirrors Candidate.adv exactly.
 * `discount` mirrors cycle 024's REACQ_JUMP_M rule (a D-016(a) re-acquisition
 * teleport is not lock evidence); pass false to measure the RAW chainage delta
 * the pre-024 engine used, which is what the shadow-lock test below needs. */
function advanceAt(f: Fixture, track: TrackId, nFixes: number, fromIndex = 0, discount = true): number {
  const ref = refFor(track);
  const proj = new LiveProjector(ref);
  let base: number | null = null;
  let adv = 0;
  for (let i = fromIndex; i < fromIndex + nFixes; i++) {
    const before = proj.chainage;
    const xy = toXY([f.fixes.lat[i]], [f.fixes.lon[i]], ref.lat0, ref.lon0);
    const fix = proj.update(xy.x[0], xy.y[0], f.fixes.t[i]);
    if (base === null) base = fix.s;
    else if (discount && proj.chainage - before > REACQ_JUMP_M) base += proj.chainage - before;
    adv = proj.chainage - base;
  }
  return adv;
}

function assertDoneReal(ctx: string, s: LiveSector, row: SectorRow, tol = 2e-6): void {
  assert(s.kind === 'done', `${ctx}: kind ${s.kind}, want done`);
  assert(!s.estimated, `${ctx}: marked estimated on a real crossing`);
  assert(s.interrupted === (row.flag === 'interrupted'),
    `${ctx}: interrupted=${s.interrupted}, offline flag=${row.flag}`);
  assert(numEq(s.rawS, row.rawS, tol), `${ctx}: rawS ${s.rawS} != offline ${row.rawS}`);
  assert(numEq(s.stoppedS, row.stoppedS, tol), `${ctx}: stoppedS ${s.stoppedS} != offline ${row.stoppedS}`);
  assert(numEq(s.movingS, row.movingS, tol), `${ctx}: movingS ${s.movingS} != offline ${row.movingS}`);
}

test('live: engine importable headless (Metro shim) — lock constants as documented', () => {
  assert(typeof LiveEngine === 'function', 'LiveEngine not exported');
  assert(LOCK_MIN_ADVANCE_M === 400, `LOCK_MIN_ADVANCE_M ${LOCK_MIN_ADVANCE_M}, doc says 400`);
  assert(LOCK_MARGIN_M === 200, `LOCK_MARGIN_M ${LOCK_MARGIN_M}, doc says 200`);
});

// --------------------------------------------------------- route auto-lock

for (const name of ['clean_morning', 'clean_eveninga', 'clean_eveningb'] as const) {
  test(`live: ${name} auto-locks the right track within the documented advance bounds`, () => {
    const f = loadFixture(name);
    const { final, lockAt } = drive(f);
    assert(final.track === f.track, `locked ${final.track}, want ${f.track}`);
    assert(final.phase === 'finished', `phase ${final.phase}, want finished`);
    assert(lockAt !== null, 'never locked');
    const advOwn = advanceAt(f, f.track, lockAt);
    // ~400 m rule: lock as soon as the leader has LOCK_MIN_ADVANCE_M of route
    assert(advOwn >= LOCK_MIN_ADVANCE_M && advOwn <= LOCK_MIN_ADVANCE_M + LOCK_SLACK_M,
      `lock advance ${advOwn.toFixed(1)} m outside [${LOCK_MIN_ADVANCE_M}, ${LOCK_MIN_ADVANCE_M + LOCK_SLACK_M}]`);
    // margin rule vs every other candidate at the lock moment
    let maxSib = 0;
    for (const tr of TRACKS) {
      if (tr === f.track) continue;
      maxSib = Math.max(maxSib, advanceAt(f, tr, lockAt));
    }
    assert(advOwn - maxSib >= LOCK_MARGIN_M,
      `lock margin ${(advOwn - maxSib).toFixed(1)} m < ${LOCK_MARGIN_M}`);
    if (f.track === 'EveningA' || f.track === 'EveningB') {
      // post-split bound: the sibling evening candidate freezes at the physical
      // split; the lock must land within ~LOCK_MIN_ADVANCE_M past that point.
      const sibling: TrackId = f.track === 'EveningA' ? 'EveningB' : 'EveningA';
      const advSib = advanceAt(f, sibling, lockAt);
      assert(advOwn - advSib <= LOCK_MIN_ADVANCE_M + LOCK_SLACK_M,
        `locked ${(advOwn - advSib).toFixed(1)} m past the A/B split freeze — beyond the documented bound`);
    }
  });
}

// ------------------------------------------- parity anchor: displayed times

test('live: clean rides — 5 real fires each; displayed sector + lap times equal the offline pipeline', () => {
  for (const name of ['clean_morning', 'clean_eveninga', 'clean_eveningb'] as const) {
    const f = loadFixture(name);
    const { final } = drive(f);
    assert(final.gateFires === f.expected.live.events.length,
      `${name}: ${final.gateFires} fires, snapshot has ${f.expected.live.events.length}`);
    assert(final.lastDone === 4, `${name}: lastDone ${final.lastDone}`);
    for (let i = 0; i < 4; i++) {
      assertDoneReal(`${name} S${i + 1}`, final.sectors[i], f.expected.offline[i]);
    }
    const ev = f.expected.live.events;
    assert(final.lap !== null && !final.lap.estimated, `${name}: lap missing or estimated`);
    assert(numEq(final.lap.rawS, ev[4].t - ev[0].t, 3e-6),
      `${name}: lap rawS ${final.lap.rawS} != FINISH-START ${ev[4].t - ev[0].t}`);
    assert(final.lap.movingS !== null && final.lap.stoppedS !== null
      && numEq(final.lap.movingS, final.lap.rawS! - final.lap.stoppedS, 1e-9),
      `${name}: lap moving/stopped inconsistent`);
  }
});

// ----------------------------------------------------------- honesty rules

test('live: gap_20260521 — gap-bounded sectors surface estimated: ~raw from live events, no moving time', () => {
  const f = loadFixture('gap_20260521');
  const { final } = drive(f);
  assert(final.track === 'Morning' && final.phase === 'finished', 'wrong track/phase');
  const ev = f.expected.live.events; // G3 and G4 fire estimated in the snapshot
  for (let i = 0; i < 2; i++) assertDoneReal(`S${i + 1}`, final.sectors[i], f.expected.offline[i]);
  for (const [i, tExp] of [[2, ev[3].t - ev[2].t], [3, ev[4].t - ev[3].t]] as const) {
    const s = final.sectors[i];
    assert(s.kind === 'done' && s.estimated, `S${i + 1} kind/estimated wrong: ${JSON.stringify(s)}`);
    assert(s.movingS === null && s.stoppedS === null, `S${i + 1}: estimated sector carries moving/stopped time`);
    assert(numEq(s.rawS, tExp, 3e-6), `S${i + 1}: ~raw ${s.rawS} != live-event span ${tExp}`);
  }
  assert(final.lap !== null && final.lap.estimated && final.lap.movingS === null,
    'lap with an estimated sector must itself be estimated and moving-time-free');
});

test('live: latelock_20260805 — START skipped => sector 1 missed, lap never scored real', () => {
  const f = loadFixture('latelock_20260805');
  const { final } = drive(f);
  assert(final.sectors[0].kind === 'missed' && final.sectors[0].reason === 'skipped',
    `S1 ${JSON.stringify(final.sectors[0])}, want missed:skipped`);
  for (let i = 1; i < 4; i++) assertDoneReal(`S${i + 1}`, final.sectors[i], f.expected.offline[i]);
  assert(final.gateFires === 4, `${final.gateFires} fires, want 4 (START never fired)`);
  assert(final.lap !== null && final.lap.rawS === null && final.lap.estimated,
    `lap ${JSON.stringify(final.lap)}: no START event, so no lap raw time and estimated`);
});

test('live: detour_eveningb — offroute/estimated sectors never show a real coloured time (D-015/D-013)', () => {
  const f = loadFixture('detour_eveningb');
  const { final } = drive(f);
  assert(final.track === 'EveningB', `locked ${final.track}`);
  // S1 offline flag 'interrupted' with real bounding fires: real numbers, interrupted set
  assertDoneReal('S1', final.sectors[0], f.expected.offline[0]);
  assert(final.sectors[0].kind === 'done' && final.sectors[0].interrupted, 'S1 interrupted flag lost');
  // every offline-excluded_offroute sector must NOT surface as a clean coloured time
  let offrouteSeen = 0;
  for (let i = 0; i < 4; i++) {
    if (f.expected.offline[i].flag !== 'excluded_offroute') continue;
    offrouteSeen += 1;
    const s = final.sectors[i];
    const dirty = s.kind === 'missed' || (s.kind === 'done' && s.estimated);
    assert(dirty, `S${i + 1} offline=excluded_offroute but engine shows ${JSON.stringify(s)}`);
  }
  assert(offrouteSeen > 0, 'fixture no longer contains an offroute sector');
  assert(final.lap !== null && final.lap.estimated && final.lap.movingS === null,
    'detour lap must be estimated with no moving time');
});

test('live: a re-acquisition jump is not lock evidence — the promoted MorningB line must not steal the Morning commute (cycle 024)', () => {
  // WP-D1 promoted MorningB's reference onto Nathan's real 2026-08-19
  // home>work route-B ride. That line leaves home on the same streets as
  // Morning, diverges after ~50 m, and passes back within the 40 m corridor
  // around 460 m of ground. D-016(a) then re-acquires MorningB hundreds of
  // metres downstream in a SINGLE fix. Before cycle 024 the lock race counted
  // that teleport as advance and locked MorningB on a Morning commute — the
  // daily ride, mis-scored. This test pins both halves: the pathology is real
  // in the data, and the engine is immune to it.
  const f = loadFixture('clean_morning');
  const { final, lockAt } = drive(f);
  assert(final.track === 'Morning', `locked ${final.track}, want Morning`);
  assert(lockAt !== null, 'never locked');

  const rawShadow = advanceAt(f, 'MorningB' as TrackId, lockAt!, 0, false);
  const honestOwn = advanceAt(f, 'Morning', lockAt!);
  assert(rawShadow - honestOwn >= LOCK_MARGIN_M && rawShadow >= LOCK_MIN_ADVANCE_M,
    `the shadow pathology has gone away (raw MorningB delta ${rawShadow.toFixed(1)} m vs Morning ` +
      `${honestOwn.toFixed(1)} m) — this test no longer proves anything; re-derive it`);

  const honestShadow = advanceAt(f, 'MorningB' as TrackId, lockAt!);
  assert(honestOwn - honestShadow >= LOCK_MARGIN_M,
    `corridor-verified margin ${(honestOwn - honestShadow).toFixed(1)} m < ${LOCK_MARGIN_M}: ` +
      `MorningB earned ${honestShadow.toFixed(1)} m of real advance on a Morning ride`);
  // The projector's forward search window is 240 m, but a windowed lookup can still land on
  // the reference vertex just past the window edge (this app's ~5 m resampling), so ordinary
  // projection can advance up to ~245 m in one fix — REACQ_JUMP_M must clear that, not just
  // the raw window, or a normal fast/sparse-fix advance gets misclassified as a re-acquisition
  // (adversarial review 2026-08-23: reproduced up to 245.0 m of ordinary windowed advance).
  assert(REACQ_JUMP_M > 240,
    `REACQ_JUMP_M ${REACQ_JUMP_M} must exceed the projector's 240 m forward window by a real ` +
      'margin (windowed projection can reach ~245 m in one fix), or ordinary projection would ' +
      'be discounted as a re-acquisition');
});

test('live: wrongdir_eveninga fixes (a real Morning ride) — auto-detect locks Morning, times it fully', () => {
  // engine_suite proves a single EveningA detector rejects this ride; the
  // wiring-level truth is stronger: with all three candidates running, the
  // engine simply recognizes the ride for what it is.
  const f = loadFixture('wrongdir_eveninga');
  const { final } = drive(f);
  assert(final.track === 'Morning', `locked ${final.track}, want Morning (auto-detect rescue)`);
  assert(final.phase === 'finished' && final.gateFires === 5, `phase ${final.phase}, fires ${final.gateFires}`);
  assert(final.sectors.every((s) => s.kind === 'done' && !s.estimated),
    `sectors [${final.sectors.map((s) => s.kind)}] not all real`);
  assert(final.lap !== null && !final.lap.estimated && final.lap.movingS !== null, 'lap not scored real');
});

test('live: synthetic_truncated — mid-ride kill: locked but unfinished, S3 current, no lap, no fabricated gates', () => {
  const f = loadFixture('synthetic_truncated');
  const { final } = drive(f);
  assert(final.phase === 'locked' && final.track === 'Morning', `phase ${final.phase}/${final.track}`);
  assert(final.gateFires === 3 && final.lastDone === 2, `fires ${final.gateFires}, lastDone ${final.lastDone}`);
  assertDoneReal('S1', final.sectors[0], f.expected.offline[0]);
  assertDoneReal('S2', final.sectors[1], f.expected.offline[1]);
  assert(final.sectors[2].kind === 'current' && final.sectors[3].kind === 'pending',
    `S3/S4 ${final.sectors[2].kind}/${final.sectors[3].kind}, want current/pending`);
  assert(final.lap === null, 'lap scored without a FINISH fire');
  assert(final.currentSector === 3, `currentSector ${final.currentSector}, want 3`);
});

test('live: synthetic_firstride — full real sectors and lap with zero benchmark history', () => {
  const f = loadFixture('synthetic_firstride');
  const { final } = drive(f);
  assert(final.track === 'EveningB' && final.phase === 'finished', `${final.track}/${final.phase}`);
  for (let i = 0; i < 4; i++) assertDoneReal(`S${i + 1}`, final.sectors[i], f.expected.offline[i]);
  assert(final.lap !== null && !final.lap.estimated && final.lap.movingS !== null,
    'first-ever ride must still score a real lap (colour stays blank at the benchmark layer, D-008/D-021)');
});

test('live: mid-ride JS relaunch (feed while idle) — auto-start; sectors behind missed, sectors ahead at full parity', () => {
  const f = loadFixture('clean_morning');
  const ev = f.expected.live.events;
  const from = f.fixes.t.findIndex((t) => t >= (ev[2].t + ev[3].t) / 2); // between G2 and G3
  assert(from > 0, 'could not find a mid-sector-3 restart fix');
  const { final, lockAt } = drive(f, from);
  assert(final.phase === 'finished' && final.track === 'Morning', `${final.phase}/${final.track}`);
  assert(lockAt !== null, 'never re-locked after relaunch');
  for (let i = 0; i < 3; i++) {
    assert(final.sectors[i].kind === 'missed',
      `S${i + 1} after relaunch: ${JSON.stringify(final.sectors[i])}, want missed`);
  }
  // sector 4 is entirely post-relaunch: its displayed numbers must match the
  // full-ride offline pipeline (partial-buffer parity anchor)
  assertDoneReal('S4', final.sectors[3], f.expected.offline[3], 5e-3);
  assert(final.gateFires === 2, `${final.gateFires} fires, want 2 (G3 + FINISH)`);
  assert(final.lap !== null && final.lap.rawS === null && final.lap.estimated,
    'relaunched ride must not fabricate a lap time');
});

test('live: honesty invariants across all fixtures — estimated => no moving/stopped; excluded offline => never coloured real', () => {
  const names = ['clean_morning', 'clean_eveninga', 'clean_eveningb', 'gap_20260521',
    'latelock_20260805', 'detour_eveningb', 'synthetic_truncated', 'synthetic_firstride'] as const;
  for (const name of names) {
    const f = loadFixture(name);
    const { final } = drive(f);
    for (const [i, s] of final.sectors.entries()) {
      if (s.kind === 'done' && s.estimated) {
        assert(s.movingS === null && s.stoppedS === null,
          `${name} S${i + 1}: estimated sector carries moving/stopped time (colour input!)`);
      }
      // offline exclusion may never surface as a real coloured time
      // (skip wrongdir_eveninga here: its offline rows are vs the wrong track by design)
      if (f.expected.offline[i].flag.startsWith('excluded')) {
        assert(!(s.kind === 'done' && !s.estimated),
          `${name} S${i + 1}: offline ${f.expected.offline[i].flag} but engine shows a real time`);
      }
    }
    if (final.lap !== null && final.lap.estimated) {
      assert(final.lap.movingS === null && final.lap.stoppedS === null,
        `${name}: estimated lap carries moving/stopped time`);
    }
    const anyDirty = final.sectors.some((s) => s.kind === 'missed' || (s.kind === 'done' && s.estimated));
    if (final.lap !== null && anyDirty) {
      assert(final.lap.estimated, `${name}: dirty sectors but lap claims to be real`);
    }
  }
});

test('live: real export 20260815-0024 (stationary 94 s doorstep loop) — no lock, no fires, all pending', () => {
  const gpx = nodeFs.readFileSync(path.join(FIXTURES_DIR, 'qualifire-20260815-0024.gpx'), 'utf8');
  const p = parseGpx(gpx, 'qualifire-20260815-0024');
  assert(p.t.length === 92, `parsed ${p.t.length} points, want 92`);
  const order = Array.from(p.t.keys()).sort((a, b) => p.t[a] - p.t[b]); // F-2 sorted view
  const engine = new LiveEngine(fixtureSpecs());
  for (const i of order) engine.feed(p.lat[i], p.lon[i], p.t[i] * 1000);
  const st = engine.getState();
  assert(st.phase === 'detecting' && st.track === null,
    `a 20 m doorstep jiggle locked ${st.track} (phase ${st.phase})`);
  assert(st.gateFires === 0, `${st.gateFires} gate fires while standing still`);
  assert(st.sectors.every((s) => s.kind === 'pending'), 'sector state invented mid-detection');
  assert(st.lap === null && st.fixesFed === 92, 'lap/fix accounting wrong');
});

test('live: subscribe contract — one emit per feed (+start), snapshot equals getState, unsubscribe sticks', () => {
  const f = loadFixture('synthetic_firstride');
  const n = f.fixes.t.length;
  const { engine, final, emits, lastEmitted } = drive(f);
  assert(emits === n + 1, `${emits} emits for ${n} feeds, want ${n + 1} (auto-start + one per fix)`);
  assert(lastEmitted !== null, 'no snapshot delivered');
  const key = (s: LiveEngineState) =>
    JSON.stringify({ p: s.phase, tr: s.track, se: s.sectors, lap: s.lap, gf: s.gateFires, ff: s.fixesFed });
  assert(key(lastEmitted) === key(final), 'last emitted snapshot differs from getState()');
  // drive() already unsubscribed: feeding again must not re-emit but still buffers
  engine.feed(f.fixes.lat[n - 1], f.fixes.lon[n - 1], (f.fixes.t[n - 1] + 1) * 1000);
  assert(engine.getState().fixesFed === n + 1, 'post-unsubscribe feed not buffered');
});

// ------------------------------------------------------- GPX+ engine events

test('live: engine events (GPX+) — clean_morning emits exactly one lock + gate events matching the live snapshot', () => {
  const f = loadFixture('clean_morning');
  const engine = new LiveEngine(fixtureSpecs());
  const evts: { type: string; track: TrackId; atChainageM?: number; gateIndex?: number; t?: number; estimated?: boolean }[] = [];
  const unsub = engine.subscribeEvents((e) => evts.push(e));
  for (let i = 0; i < f.fixes.t.length; i++) {
    engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  }
  unsub();
  const locks = evts.filter((e) => e.type === 'lock');
  assert(locks.length === 1, `${locks.length} lock events, want exactly 1`);
  assert(locks[0].track === f.track, `lock track ${locks[0].track}, want ${f.track}`);
  assert(locks[0].atChainageM! >= LOCK_MIN_ADVANCE_M,
    `lock atChainageM ${locks[0].atChainageM} below the lock-advance threshold ${LOCK_MIN_ADVANCE_M}`);
  const gates = evts.filter((e) => e.type === 'gate');
  const expected = f.expected.live.events;
  assert(gates.length === expected.length, `${gates.length} gate events, want ${expected.length}`);
  for (let i = 0; i < expected.length; i++) {
    assert(gates[i].track === f.track, `gate ${i} track ${gates[i].track}, want ${f.track}`);
    assert(gates[i].gateIndex === expected[i].g, `gate ${i} gateIndex ${gates[i].gateIndex} != ${expected[i].g}`);
    assert(gates[i].estimated === expected[i].est, `gate ${i} estimated ${gates[i].estimated} != ${expected[i].est}`);
    assert(numEq(gates[i].t!, expected[i].t, 1e-6), `gate ${i} t ${gates[i].t} != ${expected[i].t}`);
  }
});

test('live: engine events (GPX+) — stationary doorstep loop (real export) never locks, emits zero events', () => {
  const gpx = nodeFs.readFileSync(path.join(FIXTURES_DIR, 'qualifire-20260815-0024.gpx'), 'utf8');
  const p = parseGpx(gpx, 'qualifire-20260815-0024');
  const order = Array.from(p.t.keys()).sort((a, b) => p.t[a] - p.t[b]); // F-2 sorted view
  const engine = new LiveEngine(fixtureSpecs());
  const evts: unknown[] = [];
  const unsub = engine.subscribeEvents((e) => evts.push(e));
  for (const i of order) engine.feed(p.lat[i], p.lon[i], p.t[i] * 1000);
  unsub();
  assert(evts.length === 0, `${evts.length} engine events emitted while the engine never locked`);
});

// -------------------------------------- cycle 023 fix 2/5a: poor-accuracy
// anchor retry + route-match diagnostics channel
//
// LiveProjector (core/live.ts) seeds its chainage from a candidate's very
// FIRST fix via a global nearest-vertex search; if that fix's accuracy is
// poor, the anchor can land on the wrong part of the polyline and — because
// projection is forward-only-monotonic — never correct itself. These
// synthetic fixes are built directly from the Morning reference polyline
// (lat/lon derived from a chosen reference chainage via xyToLatLon, the exact
// inverse of the toXY the engine itself uses) so the ground truth is exact:
// fix 0 is deliberately placed near chainage 4000 m (as if a 97.7 m-accuracy
// GPS fix put the rider "near the end" of the route by mistake), then every
// subsequent fix is a real, accurate step along the route from chainage 0.

function morningLatLonAt(ref: RefLine, targetChM: number): [number, number] {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < ref.ch.length; i++) {
    const d = Math.abs(ref.ch[i] - targetChM);
    if (d < bestD) { bestD = d; best = i; }
  }
  return xyToLatLon(ref.rx[best], ref.ry[best], ref.lat0, ref.lon0);
}

test('live: cycle 023 fix 2 — a poor-accuracy first fix recovers via the single post-settle retry', () => {
  const ref = refFor('Morning');
  const engine = new LiveEngine(fixtureSpecs());
  const diag: DiagnosticEvent[] = [];
  engine.subscribeDiagnostics((e) => diag.push(e));

  let tMs = 1755167000000;
  // fix 0: bad anchor — geometrically near chainage 4000 m, poor accuracy
  const [badLat, badLon] = morningLatLonAt(ref, 4000);
  engine.feed(badLat, badLon, tMs, 97.7);
  tMs += 1000;
  // fixes 1..40: the real ride, progressing 0 -> 800 m, good accuracy
  for (let i = 0; i <= 40; i++) {
    const [lat, lon] = morningLatLonAt(ref, i * 20);
    engine.feed(lat, lon, tMs, 15);
    tMs += 1000;
  }

  const final = engine.getState();
  assert(final.track === 'Morning' && final.phase !== 'detecting',
    `never recovered the lock: phase=${final.phase} track=${final.track}`);

  const morningDiag = diag.filter((d) => d.track === 'Morning');
  const anchors = morningDiag.filter((d) => d.phase === 'anchor');
  const retries = morningDiag.filter((d) => d.phase === 'retry');
  assert(retries.length === 1, `${retries.length} retries for Morning, want exactly 1 (single retry, not a loop)`);
  assert(anchors.length === 2, `${anchors.length} anchor events for Morning, want 2 (initial + post-retry)`);
  assert(anchors[0].poorAccuracy && anchors[0].accuracyM === 97.7,
    `initial anchor diagnostic wrong: ${JSON.stringify(anchors[0])}`);
  assert(!anchors[1].poorAccuracy && anchors[1].accuracyM === 15,
    `post-retry anchor diagnostic wrong: ${JSON.stringify(anchors[1])}`);
  assert(retries[0].thresholdM === POOR_ACCURACY_M, 'retry diagnostic threshold does not match POOR_ACCURACY_M');
  // WP-G Part 2 gap-fill: per-candidate deviation. The 'retry' phase itself
  // has nothing meaningful to report yet (fresh candidate, no fix processed);
  // both anchors (initial bad one and the post-retry good one) carry a real
  // number — the whole point of the field is "how far off was this fix".
  assert(retries[0].xtdM === null, `retry xtdM should be null (nothing fed yet), got ${retries[0].xtdM}`);
  assert(typeof anchors[0].xtdM === 'number', `initial anchor xtdM should be a number, got ${anchors[0].xtdM}`);
  assert(typeof anchors[1].xtdM === 'number', `post-retry anchor xtdM should be a number, got ${anchors[1].xtdM}`);
});

test('live: cycle 023 fix 2 guard — a candidate anchored with GOOD accuracy is never retried on later noise', () => {
  const ref = refFor('Morning');
  const engine = new LiveEngine(fixtureSpecs());
  const diag: DiagnosticEvent[] = [];
  engine.subscribeDiagnostics((e) => diag.push(e));

  let tMs = 1755167000000;
  for (let i = 0; i <= 40; i++) {
    const [lat, lon] = morningLatLonAt(ref, i * 20);
    // good accuracy throughout except one noisy blip well after the anchor —
    // must NOT trigger a retry (the guard is on the INITIAL accuracy only).
    const acc = i === 10 ? 200 : 15;
    engine.feed(lat, lon, tMs, acc);
    tMs += 1000;
  }
  const final = engine.getState();
  assert(final.track === 'Morning' && final.phase !== 'detecting', `phase ${final.phase}/${final.track}`);
  const retries = diag.filter((d) => d.phase === 'retry');
  assert(retries.length === 0, `${retries.length} retries fired despite a good initial accuracy — guard broken`);
});

test('live: cycle 023 fix 5a — routeMatchAttempt diagnostics are a channel distinct from subscribe()/subscribeEvents()', () => {
  const f = loadFixture('clean_morning');
  const engine = new LiveEngine(fixtureSpecs());
  const stateEmits: unknown[] = [];
  const engineEvts: unknown[] = [];
  const diagEvts: DiagnosticEvent[] = [];
  const u1 = engine.subscribe((s) => stateEmits.push(s));
  const u2 = engine.subscribeEvents((e) => engineEvts.push(e));
  const u3 = engine.subscribeDiagnostics((e) => diagEvts.push(e));
  for (let i = 0; i < f.fixes.t.length; i++) {
    engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  }
  u1(); u2(); u3();
  assert(diagEvts.length > 0, 'no diagnostics emitted at all on a normal clean lock');
  const lockDiag = diagEvts.find((d) => d.phase === 'lock' && d.track === 'Morning');
  assert(lockDiag !== undefined, 'no lock-phase diagnostic emitted for the winning candidate');
  // WP-G Part 2 gap-fill: the winning candidate's own deviation is known at
  // lock time (it has just been fed), so xtdM must be a real number, not null.
  assert(typeof lockDiag!.xtdM === 'number', `lock diagnostic xtdM should be a number, got ${lockDiag!.xtdM}`);
  // all four candidates anchor (one 'anchor' diagnostic each) even though only
  // the winner ever reaches subscribeEvents()/the ride record — diagnostics
  // see every attempt, not just the one that wins (that's the whole point).
  const anchoredTracks = new Set(diagEvts.filter((d) => d.phase === 'anchor').map((d) => d.track));
  assert(anchoredTracks.size === 4, `${anchoredTracks.size} candidates anchored, want all 4`);
  // state emits once per feed (+1 for auto-start); diagnostics only fire on
  // anchor/retry/lock attempts, which is far fewer than one-per-fix — proof
  // the two channels run on genuinely different cadences, not just different
  // Sets carrying the same volume of traffic.
  assert(stateEmits.length === f.fixes.t.length + 1, `${stateEmits.length} state emits, want ${f.fixes.t.length + 1}`);
  assert(diagEvts.length < stateEmits.length,
    `${diagEvts.length} diagnostics >= ${stateEmits.length} state emits — diagnostics are not a lower-cadence channel`);
});

// ============================================================ cycle 024 (WP-D2)
// All-catalog candidates + pick-biased lock-then-verify (B-65 ruling, Nathan
// 2026-08-20). The existing tests above keep proving auto-lock mechanics
// against the legacy four-track set (fixtureSpecs()); these prove the new
// anchored-rule / pick-bias / lock-then-verify machinery itself, against
// both the legacy set and the full 20-route catalog.

test('live: catalogTrackSpecs — 20 specs, every catalog route resolves ref+gates, none skipped', () => {
  const specs = catalogTrackSpecs();
  assert(specs.length === 20, `${specs.length} specs, want 20 (one per catalog route)`);
  const ids = new Set(specs.map((s) => s.id));
  assert(ids.size === specs.length, 'duplicate spec ids — some route was built twice');
  for (const s of specs) {
    assert(s.ref.ch.length >= 2, `${s.id}: ref has too few vertices`);
    assert(s.gates.length >= 2, `${s.id}: gate set has too few gates`);
  }
});

test('live: pick honoured — clean_eveningb with pick=EveningB matches the no-pick lock exactly', () => {
  const f = loadFixture('clean_eveningb');
  const noPick = drive(f);
  const picked = drive(f, 0, fixtureSpecs(), 'EveningB');
  assert(picked.lockAt === noPick.lockAt,
    `pick=EveningB locked at fix ${picked.lockAt}, no-pick locked at ${noPick.lockAt} — the pick must not change lock timing when it agrees with the ride`);
  assert(picked.final.track === 'EveningB' && picked.final.lockKind === 'verified',
    `track ${picked.final.track}, lockKind ${picked.final.lockKind}`);
  assert(picked.final.pick === 'EveningB' && picked.final.pickHonoured,
    `pick ${picked.final.pick}, pickHonoured ${picked.final.pickHonoured}`);

  const engine = new LiveEngine(fixtureSpecs());
  const evts: EngineEvent[] = [];
  const unsub = engine.subscribeEvents((e) => evts.push(e));
  engine.start({ pickId: 'EveningB' });
  for (let i = 0; i < f.fixes.t.length; i++) engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  unsub();
  const locks = evts.filter((e): e is Extract<EngineEvent, { type: 'lock' }> => e.type === 'lock');
  assert(locks.length === 1, `${locks.length} lock events, want exactly 1`);
  assert(locks[0].pick === 'EveningB', 'lock event does not carry the pick');
});

test('live: pick wrong — clean_eveningb with pick=EveningA still verified-locks the RIDDEN route (EveningB)', () => {
  // D-025 measured the EveningA sibling frozen at <=12 m by lock time on this
  // fixture, so at 400 m the margin is already clear and EveningA is NOT a
  // blocker: this is a single, direct, verified lock on the ridden route —
  // the soft-lock-then-switch path is covered separately (the synthetic
  // prefix-stall test below).
  const f = loadFixture('clean_eveningb');
  const noPick = drive(f);
  const engine = new LiveEngine(fixtureSpecs());
  const evts: EngineEvent[] = [];
  const unsubEv = engine.subscribeEvents((e) => evts.push(e));
  let lockAt: number | null = null;
  const unsubState = engine.subscribe((s) => { if (lockAt === null && s.track !== null) lockAt = s.fixesFed; });
  engine.start({ pickId: 'EveningA' });
  for (let i = 0; i < f.fixes.t.length; i++) engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  unsubEv(); unsubState();
  const final = engine.getState();
  assert(lockAt === noPick.lockAt, `pick=EveningA locked at fix ${lockAt}, no-pick locked at ${noPick.lockAt}`);
  assert(final.track === 'EveningB' && final.lockKind === 'verified', `track ${final.track}, lockKind ${final.lockKind}`);
  assert(final.pick === 'EveningA' && !final.pickHonoured,
    `pick ${final.pick}, pickHonoured ${final.pickHonoured} — a wrong pick must never read as honoured`);
  const locks = evts.filter((e): e is Extract<EngineEvent, { type: 'lock' }> => e.type === 'lock');
  assert(locks.length === 1, `${locks.length} lock events, want exactly 1 (the ridden route, never the wrong pick)`);
  assert(locks[0].track === 'EveningB', `the single lock event is for ${locks[0].track}, want the ridden route`);
  for (let i = 0; i < 4; i++) assertDoneReal(`S${i + 1}`, final.sectors[i], f.expected.offline[i]);
});

test('live: no pick — behaviour unchanged (auto-start still locks; pick/lockKind read null/verified honestly)', () => {
  const f = loadFixture('clean_morning');
  const engine = new LiveEngine(fixtureSpecs()); // no start() call: relies on feed()'s own auto-start, exactly as before cycle 024
  for (let i = 0; i < f.fixes.t.length; i++) engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  const final = engine.getState();
  const driven = drive(f).final;
  assert(final.track === driven.track && final.phase === driven.phase,
    'implicit auto-start differs from an explicit no-pick drive()');
  assert(numEq(final.lap?.rawS ?? null, driven.lap?.rawS ?? null, 1e-9), 'lap differs between auto-start and explicit drive()');
  assert(final.pick === null, `pick ${final.pick}, want null`);
  assert(final.lockKind === 'verified', `lockKind ${final.lockKind}, want verified`);
});

test('live: full-catalog shadow regression — clean_morning + pick=Morning soft-locks, finalize() settles it', () => {
  // HomeStationPreferred is an anchored blocker the whole way (measured:
  // shares 98% of Morning's corridor); HomeChurch shares the first ~340 m.
  // The leader at any instant may be a different anchored candidate by
  // resampling noise (the two lines are the same road) — the soft lock keys
  // on the PICK being in the TIED set with adv >= 400, not on the pick being
  // leader. This is the guard that the daily commute still scores.
  const f = loadFixture('clean_morning');
  const engine = new LiveEngine(catalogTrackSpecs());
  engine.start({ pickId: 'Morning' });
  let softAt: number | null = null;
  const unsub = engine.subscribe((s) => {
    if (softAt === null && s.lockKind === 'soft') softAt = s.fixesFed;
  });
  for (let i = 0; i < f.fixes.t.length; i++) engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  unsub();
  assert(softAt !== null, 'clean_morning + pick=Morning never soft-locked against the full catalog');
  const advAtSoft = advanceAt(f, 'Morning', softAt!);
  assert(advAtSoft >= LOCK_MIN_ADVANCE_M && advAtSoft <= 520,
    `soft-lock advance ${advAtSoft.toFixed(1)} m outside [${LOCK_MIN_ADVANCE_M}, 520]`);
  engine.finalize();
  const final = engine.getState();
  assert(final.lockKind === 'finalized' && final.track === 'Morning',
    `lockKind ${final.lockKind}, track ${final.track}`);
  assert(final.phase === 'finished', `phase ${final.phase}, want finished`);
  for (let i = 0; i < 4; i++) assertDoneReal(`S${i + 1}`, final.sectors[i], f.expected.offline[i]);
  assert(final.lap !== null && !final.lap.estimated && final.lap.movingS !== null, 'lap not scored real after finalize');
});

test('live: full-catalog shadow regression — clean_eveningb, no pick: an anchored partial blocker still verified-locks EveningB', () => {
  // StationHomeWet is an UNANCHORED shadow (its corridor joins mid-line at
  // its own ~2900 m — must not block, per the anchored rule); WorkChurchB is
  // an ANCHORED partial blocker (shares EveningB's exit from work up to
  // EveningB chainage ~310 m).
  const f = loadFixture('clean_eveningb');
  const { final, lockAt } = drive(f, 0, catalogTrackSpecs());
  assert(final.track === 'EveningB' && final.lockKind === 'verified',
    `track ${final.track}, lockKind ${final.lockKind}`);
  assert(lockAt !== null, 'never locked');
  const adv = advanceAt(f, 'EveningB', lockAt!);
  assert(adv >= LOCK_MIN_ADVANCE_M && adv <= 700,
    `lock advance ${adv.toFixed(1)} m outside [${LOCK_MIN_ADVANCE_M}, 700]`);
  // eslint-disable-next-line no-console
  console.log(`  (measured: clean_eveningb full-catalog verified-lock advance = ${adv.toFixed(1)} m)`);
  for (let i = 0; i < 4; i++) assertDoneReal(`S${i + 1}`, final.sectors[i], f.expected.offline[i]);
  assert(final.lap !== null && !final.lap.estimated && final.lap.movingS !== null, 'lap not scored real');
});

test('live: unanchored shadow never blocks — clean_eveninga, no pick, full catalog', () => {
  // StationHomePreferred shadows EveningA mid-line (unanchored) — must not
  // widen the margin needed to lock.
  const f = loadFixture('clean_eveninga');
  const { final, lockAt } = drive(f, 0, catalogTrackSpecs());
  assert(final.track === 'EveningA' && final.lockKind === 'verified',
    `track ${final.track}, lockKind ${final.lockKind}`);
  assert(lockAt !== null, 'never locked');
  const adv = advanceAt(f, 'EveningA', lockAt!);
  assert(adv >= LOCK_MIN_ADVANCE_M && adv <= LOCK_MIN_ADVANCE_M + LOCK_SLACK_M,
    `lock advance ${adv.toFixed(1)} m outside [${LOCK_MIN_ADVANCE_M}, ${LOCK_MIN_ADVANCE_M + LOCK_SLACK_M}] — an unanchored shadow must not have widened the margin needed`);
  for (let i = 0; i < 4; i++) assertDoneReal(`S${i + 1}`, final.sectors[i], f.expected.offline[i]);
});

// ================================================================ WP-B (free ride)

test('live: free mode: clean_morning fixes, full catalog — crossings, no lock, no arming fires', () => {
  const f = loadFixture('clean_morning');
  const engine = new LiveEngine(catalogTrackSpecs());
  const stateEmits: LiveEngineState[] = [];
  const evts: EngineEvent[] = [];
  const u1 = engine.subscribe((s) => stateEmits.push(s));
  const u2 = engine.subscribeEvents((e) => evts.push(e));
  engine.start({ mode: 'free' });
  for (let i = 0; i < f.fixes.t.length; i++) engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  u1(); u2();

  const final = engine.getState();
  assert(final.mode === 'free', `mode ${final.mode}, want free`);
  assert(stateEmits.every((s) => s.phase !== 'locked'), 'free mode must never reach phase "locked"');
  assert(final.phase === 'detecting', `final phase ${final.phase}, want detecting (free mode never locks)`);
  assert(final.lockKind === 'none', `lockKind ${final.lockKind}, want none`);
  const locks = evts.filter((e) => e.type === 'lock');
  assert(locks.length === 0, `${locks.length} lock events emitted in free mode, want 0`);

  const morningCrossings = final.freeCrossings.filter((c) => c.routeId === 'Morning');
  assert(morningCrossings.length === 5, `${morningCrossings.length} Morning crossings, want 5 (all gates, no arming skip)`);
  assert(morningCrossings.every((c) => !c.estimated),
    'armWithinM=0 must never arm-fire a gate as estimated at ride start (a free ride can start anywhere)');
  const hspCrossings = final.freeCrossings.filter((c) => c.routeId === 'HomeStationPreferred');
  assert(hspCrossings.length > 0,
    'HomeStationPreferred (measured 98% corridor overlap with Morning) should also fire gates in free mode');

  const morningSectors = final.freeSectors.filter((s) => s.routeId === 'Morning').sort((a, b) => a.index - b.index);
  assert(morningSectors.length === 4, `${morningSectors.length} Morning freeSectors, want 4 (S1..S4)`);
  const byGate = new Map(morningCrossings.map((c) => [c.gateIndex, c.t]));
  for (const sec of morningSectors) {
    const expected = byGate.get(sec.index)! - byGate.get(sec.index - 1)!;
    assert(numEq(sec.rawS, expected, 2e-6),
      `Morning S${sec.index} rawS ${sec.rawS} != crossing-time difference ${expected}`);
  }
  // No freeSectors entry anywhere is bounded by an estimated crossing.
  for (const sec of final.freeSectors) {
    const rcs = final.freeCrossings.filter((c) => c.routeId === sec.routeId);
    const a = rcs.find((c) => c.gateIndex === sec.index - 1);
    const b = rcs.find((c) => c.gateIndex === sec.index);
    assert(a !== undefined && !a.estimated && b !== undefined && !b.estimated,
      `freeSectors ${sec.routeId} S${sec.index} bounded by a missing or estimated crossing`);
  }
  assert(final.gateFires === final.freeCrossings.length,
    `gateFires ${final.gateFires} != freeCrossings.length ${final.freeCrossings.length}`);
});

test('live: free mode: stationary doorstep ride (real export) — zero crossings, zero events', () => {
  const gpx = nodeFs.readFileSync(path.join(FIXTURES_DIR, 'qualifire-20260815-0024.gpx'), 'utf8');
  const p = parseGpx(gpx, 'qualifire-20260815-0024');
  const order = Array.from(p.t.keys()).sort((a, b) => p.t[a] - p.t[b]); // F-2 sorted view
  const engine = new LiveEngine(fixtureSpecs());
  const evts: unknown[] = [];
  const unsub = engine.subscribeEvents((e) => evts.push(e));
  engine.start({ mode: 'free' });
  for (const i of order) engine.feed(p.lat[i], p.lon[i], p.t[i] * 1000);
  unsub();
  const final = engine.getState();
  assert(final.freeCrossings.length === 0, `${final.freeCrossings.length} free crossings on a stationary doorstep ride, want 0`);
  assert(evts.length === 0, `${evts.length} engine events emitted on a stationary doorstep ride, want 0`);
  assert(final.freeSectors.length === 0, `${final.freeSectors.length} freeSectors, want 0`);
});

test('live: free mode: sectors/lap stay idle the whole ride, finalize() is a complete no-op', () => {
  const f = loadFixture('clean_morning');
  const engine = new LiveEngine(catalogTrackSpecs());
  engine.start({ mode: 'free' });
  for (let i = 0; i < f.fixes.t.length; i++) engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  const before = engine.getState();
  assert(before.lap === null, `lap ${JSON.stringify(before.lap)}, want null`);
  assert(before.sectors.every((s) => s.kind === 'pending'), 'every sector must stay pending in free mode');
  assert(before.currentSector === null, `currentSector ${before.currentSector}, want null`);
  assert(before.track === null, `track ${before.track}, want null (free mode never locks a displayed track)`);
  engine.finalize();
  const after = engine.getState();
  assert(JSON.stringify(after) === JSON.stringify(before), 'finalize() must be a complete no-op in free mode');
});

test('live: WP-B coordinator addendum — start({routeIds}) restricts candidates, not just which fires get shown', () => {
  // A directional filter that excludes every route anywhere near a real
  // Morning ride (EveningA/EveningB run work<->home, nowhere near home<->work
  // Morning territory at these chainages) must produce zero crossings at all
  // — proving routeIds restricts which TrackSpecs even become candidates,
  // not merely which of their fires get surfaced.
  const f = loadFixture('clean_morning');
  const engine = new LiveEngine(catalogTrackSpecs());
  engine.start({ mode: 'free', routeIds: ['EveningA', 'EveningB'] });
  for (let i = 0; i < f.fixes.t.length; i++) engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  const final = engine.getState();
  assert(final.freeCrossings.length === 0,
    `${final.freeCrossings.length} crossings fired against a routeIds filter excluding every nearby route`);
  assert(final.freeSectors.length === 0, `${final.freeSectors.length} freeSectors derived, want 0`);
});

test('live: WP-B coordinator addendum — start({routeIds}) filtered to the ridden route(s) still fires normally', () => {
  const f = loadFixture('clean_morning');
  const engine = new LiveEngine(catalogTrackSpecs());
  engine.start({ mode: 'free', routeIds: ['Morning', 'MorningB'] });
  for (let i = 0; i < f.fixes.t.length; i++) engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  const final = engine.getState();
  const routeIdsFired = new Set(final.freeCrossings.map((c) => c.routeId));
  for (const id of routeIdsFired) {
    assert(id === 'Morning' || id === 'MorningB', `crossing fired for ${id}, outside the routeIds filter`);
  }
  const morningCrossings = final.freeCrossings.filter((c) => c.routeId === 'Morning');
  assert(morningCrossings.length === 5, `${morningCrossings.length} Morning crossings under a routeIds filter that includes it, want 5`);
});

test('live: WP-B coordinator addendum — routeIds omitted/undefined is unfiltered, identical to the full catalog', () => {
  const f = loadFixture('clean_morning');
  const withUndefined = new LiveEngine(catalogTrackSpecs());
  withUndefined.start({ mode: 'free', routeIds: undefined });
  const omitted = new LiveEngine(catalogTrackSpecs());
  omitted.start({ mode: 'free' });
  for (let i = 0; i < f.fixes.t.length; i++) {
    withUndefined.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
    omitted.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  }
  assert(
    withUndefined.getState().freeCrossings.length === omitted.getState().freeCrossings.length,
    'passing routeIds:undefined and omitting it entirely must behave identically (both = unfiltered, every catalog route a candidate)',
  );
});

// ---------------------------------------- synthetic corridor-subset routes
// Two synthetic specs sharing the first 1200 m (straight west->east, 5 m
// vertex step), diverging at 90 deg: S turns north for 200 m more (total
// 1400 m), L continues east for 1800 m more (total 3000 m). Both share the
// SAME planar origin (lat0=lon0=0) so a fix's true (x, y) position converts
// to lat/lon once via xyToLatLon and feeds identically into both candidates'
// own toXY.

function buildSyntheticRef(waypoints: [number, number][]): RefLine {
  const wx = waypoints.map((w) => w[0]);
  const wy = waypoints.map((w) => w[1]);
  const { x, y } = resample(wx, wy, 5);
  const ch = cumdist(x, y);
  return { rx: x, ry: y, ch, lat0: 0, lon0: 0, length: ch[ch.length - 1] };
}

// Waypoints run 5 m past the nominal 1400 m / 3000 m route lengths:
// resample() uses np.arange(0, total, step) semantics (excludes the exact
// endpoint), so a waypoint ending EXACTLY at the nominal total leaves the
// stored reference's last vertex 5 m short — enough, at the margin
// boundaries these tests probe, to matter. The extra 5 m keeps a real vertex
// sitting at the nominal chainage.
const SYN_S: TrackSpec = {
  id: 'SyntheticS', ref: buildSyntheticRef([[0, 0], [1200, 0], [1200, 205]]), gates: [100, 400, 700, 1000, 1300],
};
const SYN_L: TrackSpec = {
  id: 'SyntheticL', ref: buildSyntheticRef([[0, 0], [3005, 0]]), gates: [100, 800, 1500, 2200, 2900],
};

function synPos(onS: boolean, s: number): [number, number] {
  if (!onS) return [s, 0]; // L is a straight line the whole way
  return s <= 1200 ? [s, 0] : [1200, s - 1200];
}

test('live: prefix stall + finalize — synthetic corridor-subset routes', () => {
  // (a) ride the shared road then S's own branch to 1400 m, then stand still
  // 30 s. No pick: both tied (anchored) on the shared corridor, so no lock
  // fires there; L freezes at the 1200 m split (off S's branch), so the
  // 200 m margin over L can only open near S's own 1400 m end — verified
  // lock necessarily lands there, not earlier.
  {
    const engine = new LiveEngine([SYN_S, SYN_L]);
    let lockAtFixesFed: number | null = null;
    const unsub = engine.subscribe((s) => {
      if (lockAtFixesFed === null && s.track !== null) lockAtFixesFed = s.fixesFed;
    });
    let t = 1755167000;
    for (let s = 0; s <= 1400; s += 5) {
      const [x, y] = synPos(true, s);
      const [lat, lon] = xyToLatLon(x, y, 0, 0);
      engine.feed(lat, lon, t * 1000);
      t += 1;
    }
    assert(lockAtFixesFed !== null, 'never locked riding S all the way to its own 1400 m end');
    const chainageAtLock = (lockAtFixesFed! - 1) * 5;
    assert(chainageAtLock >= 1200 && chainageAtLock <= 1400,
      `S locked at ride-chainage ~${chainageAtLock} m, want within [1200, 1400] (the margin cannot open before the 1200 m split)`);
    unsub();
    const [xEnd, yEnd] = synPos(true, 1400);
    const [latEnd, lonEnd] = xyToLatLon(xEnd, yEnd, 0, 0);
    for (let i = 0; i < 30; i++) { engine.feed(latEnd, lonEnd, t * 1000); t += 1; }
    const final = engine.getState();
    assert(final.track === 'SyntheticS' && final.lockKind === 'verified',
      `after standing still: track ${final.track}, lockKind ${final.lockKind} (a verified lock must never unlock)`);
  }

  // (a, second sub-case) stop exactly AT the 1200 m split: still tied, never
  // locks; neither candidate's own FINISH has fired either, so finalize()
  // correctly leaves the ride genuinely unmatched.
  {
    const engine2 = new LiveEngine([SYN_S, SYN_L]);
    let t = 1755167000;
    for (let s = 0; s <= 1200; s += 5) {
      const [lat, lon] = xyToLatLon(s, 0, 0, 0);
      engine2.feed(lat, lon, t * 1000);
      t += 1;
    }
    assert(engine2.getState().track === null, 'locked while S and L are still tied on the shared corridor');
    engine2.finalize();
    const final2 = engine2.getState();
    assert(final2.phase !== 'finished', `phase ${final2.phase}, want not finished (genuinely unmatched)`);
    assert(final2.lap === null, 'lap scored on a ride finalize() should have left unmatched');
  }

  // (b) same (a) ride, but pick=SyntheticL: soft lock on L while still tied
  // on the shared corridor; once the ride diverges onto S's branch and S
  // pulls >=200 m ahead of the now-frozen L, the engine SWITCHES to S — the
  // ridden road wins over the pick, never the reverse.
  {
    const engine3 = new LiveEngine([SYN_S, SYN_L]);
    const evts: EngineEvent[] = [];
    const unsubEv = engine3.subscribeEvents((e) => evts.push(e));
    engine3.start({ pickId: 'SyntheticL' });
    let t = 1755167000;
    for (let s = 0; s <= 1400; s += 5) {
      const [x, y] = synPos(true, s);
      const [lat, lon] = xyToLatLon(x, y, 0, 0);
      engine3.feed(lat, lon, t * 1000);
      t += 1;
    }
    unsubEv();
    const locks = evts.filter((e): e is Extract<EngineEvent, { type: 'lock' }> => e.type === 'lock');
    assert(locks.length === 2, `${locks.length} lock events, want exactly 2 (soft L, then verified S) — got ${JSON.stringify(locks)}`);
    assert(locks[0].track === 'SyntheticL' && locks[0].kind === 'soft' && locks[0].pick === 'SyntheticL',
      `first lock event wrong: ${JSON.stringify(locks[0])}`);
    assert(locks[1].track === 'SyntheticS' && locks[1].kind === 'verified',
      `second lock event wrong: ${JSON.stringify(locks[1])}`);
    const final3 = engine3.getState();
    assert(final3.track === 'SyntheticS' && final3.lockKind === 'verified',
      `final track ${final3.track}, lockKind ${final3.lockKind} — the ridden road must win over the pick`);
  }
});

test('live: prefix ride-through + finalize by completed line — synthetic corridor-subset routes', () => {
  // (i) ride the shared road then L's own branch all the way to 3000 m, no
  // pick: S freezes at the 1200 m split; its FINISH gate (1300, on the
  // unridden branch) never fires, so it must never leak a gate event into
  // the ride record. L verified-locks once the margin opens past the split.
  {
    const engine = new LiveEngine([SYN_S, SYN_L]);
    const evts: EngineEvent[] = [];
    const unsub = engine.subscribeEvents((e) => evts.push(e));
    let t = 1755167000;
    for (let s = 0; s <= 3000; s += 5) {
      const [lat, lon] = xyToLatLon(s, 0, 0, 0);
      engine.feed(lat, lon, t * 1000);
      t += 1;
    }
    unsub();
    const final = engine.getState();
    assert(final.track === 'SyntheticL' && final.lockKind === 'verified',
      `track ${final.track}, lockKind ${final.lockKind}`);
    const sGateLeak = evts.some((e) => e.type === 'gate' && e.track === 'SyntheticS');
    assert(!sGateLeak, 'S (never the displayed candidate on this ride) leaked a gate event into the ride record');
  }

  // (ii) ride ONLY S's own branch to 1350 m — past its own FINISH (1300),
  // but the margin over the now-frozen L is only 150 m, never enough to lock
  // live. finalize() must recover S from its completed FINISH gate.
  {
    const engine2 = new LiveEngine([SYN_S, SYN_L]);
    let t = 1755167000;
    for (let s = 0; s <= 1350; s += 5) {
      const [x, y] = synPos(true, s);
      const [lat, lon] = xyToLatLon(x, y, 0, 0);
      engine2.feed(lat, lon, t * 1000);
      t += 1;
    }
    assert(engine2.getState().track === null, 'locked live despite only a 150 m margin');
    engine2.finalize();
    const final2 = engine2.getState();
    assert(final2.lockKind === 'finalized' && final2.track === 'SyntheticS',
      `lockKind ${final2.lockKind}, track ${final2.track} — finalize() must recover the only candidate whose FINISH fired`);
    assert(final2.sectors.length === 4 && final2.sectors.every((s) => s.kind === 'done' && !s.estimated),
      `sectors not all real: ${final2.sectors.map((s) => s.kind)}`);
    assert(final2.lap !== null && !final2.lap.estimated && final2.lap.movingS !== null,
      'lap not scored real after finalize recovers a completed-but-never-locked route');
  }
});

// SyntheticP is a literal spatial PREFIX of SyntheticL's corridor (same
// straight line, not a diverging branch like SyntheticS above) — its own
// FINISH gate (900 m) therefore fires WHILE the rider is still on the road
// SyntheticL also occupies, unlike every prefix/subset test above, where the
// shorter route's FINISH sits on its own unridden branch. This is the exact
// path the 2026-08-23 Opus inspection (B1) found untested.
const SYN_P: TrackSpec = {
  id: 'SyntheticP', ref: buildSyntheticRef([[0, 0], [905, 0]]), gates: [100, 300, 500, 700, 900],
};

test('live: B1 regression — a prefix soft lock\'s own FINISH must not leak its scored lap onto the route the rider actually finished on', () => {
  // pick=SyntheticP soft-locks it early (tied with SyntheticL on the shared
  // straight corridor). Ride straight through P's own FINISH (900 m, firing
  // and scoring P's lap, freezing phase='finished' — this is the moment B1's
  // stale `this.lap` gets set) and keep going all the way to L's own FINISH
  // (2900 m). Live re-evaluation is frozen once P's own FINISH fires (a
  // separate, non-blocking observation flagged to the coordinator), so only
  // finalize() ever sees that L — not P — is what the rider actually
  // finished riding.
  const engine = new LiveEngine([SYN_P, SYN_L]);
  engine.start({ pickId: 'SyntheticP' });
  let t = 1755167000;
  for (let s = 0; s <= 2905; s += 5) {
    const [lat, lon] = xyToLatLon(s, 0, 0, 0);
    engine.feed(lat, lon, t * 1000);
    t += 1;
  }

  const midState = engine.getState();
  assert(
    midState.track === 'SyntheticP' && midState.lockKind === 'soft' && midState.phase === 'finished',
    `pre-finalize state wrong: track ${midState.track}, lockKind ${midState.lockKind}, phase ${midState.phase} — expected P still soft-locked and frozen at its own FINISH`,
  );
  assert(midState.lap !== null, 'B1 setup: P\'s own lap was never scored before finalize() — test no longer exercises the bug');
  const staleRawS = midState.lap!.rawS;

  engine.finalize();
  const final = engine.getState();
  assert(final.track === 'SyntheticL' && final.lockKind === 'finalized',
    `finalize() did not recover the ridden route: track ${final.track}, lockKind ${final.lockKind}`);
  assert(final.lap !== null && !final.lap.estimated,
    `final lap not real after finalize: ${JSON.stringify(final.lap)}`);
  assert(final.lap!.rawS !== staleRawS,
    `B1 regression: final lap still carries P's stale ${staleRawS}s under SyntheticL's name — got ${JSON.stringify(final.lap)}`);
  // SyntheticL's own gates run 100 -> 2900 (2800 m) at 5 m/s => ~560 s.
  assert(numEq(final.lap!.rawS!, 560, 2),
    `final lap ${final.lap!.rawS}s does not match SyntheticL's own real timing (~560s) — got ${JSON.stringify(final.lap)}`);
  assert(final.sectors.length === 4 && final.sectors.every((s) => s.kind === 'done' && !s.estimated),
    `sectors not all real after finalize: ${final.sectors.map((s) => s.kind)}`);
});

// --------------------------------------------------------------------------
// cycle 025 (WP-stale-first-fix P1): flagged fixes are inert to the matcher
// --------------------------------------------------------------------------

test('live: cycle025 stale-fix — a flagged fix is inert (not buffered, no auto-start, no anchoring); the matcher anchors on the first REAL fix', () => {
  const ref = refFor('Morning');
  const engine = new LiveEngine(fixtureSpecs());
  const diag: DiagnosticEvent[] = [];
  engine.subscribeDiagnostics((e) => diag.push(e));
  const t0Ms = 1755167000000;
  // the 2026-08-25 shape: a stale cached fix 9 s before the first real one,
  // geometrically far down the track, with GOOD claimed accuracy (so the
  // POOR_ACCURACY_M retry would never rescue a wrong anchor seeded from it)
  const [staleLat, staleLon] = morningLatLonAt(ref, 4000);
  engine.feed(staleLat, staleLon, t0Ms - 9000, 12, true);
  assert(engine.getState().fixesFed === 0, 'flagged fix entered the engine buffer');
  assert(diag.length === 0, `flagged fix produced ${diag.length} diagnostics`);
  // the real ride: chainage 0 -> 800 m, good accuracy
  let tMs = t0Ms;
  for (let i = 0; i <= 40; i++) {
    const [lat, lon] = morningLatLonAt(ref, i * 20);
    engine.feed(lat, lon, tMs, 15);
    tMs += 1000;
  }
  const anchors = diag.filter((d) => d.track === 'Morning' && d.phase === 'anchor');
  assert(anchors.length === 1, `${anchors.length} Morning anchor diagnostics, want 1`);
  assert(anchors[0].atT === t0Ms / 1000,
    `Morning anchored at ${anchors[0].atT}, want ${t0Ms / 1000} — anchored on the flagged pre-START fix?`);
  const final = engine.getState();
  assert(final.track === 'Morning' && final.phase !== 'detecting',
    `lock never reached from the real fixes: phase=${final.phase} track=${final.track}`);
});
