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
  GateDetector, LiveProjector, toXY, xyToLatLon, parseGpx, resample, cumdist,
  nearestVertex, passVertex, projectRideOffline, PASS_GAP_M, crossTime, PASS_AMBIGUITY_M, CORRIDOR_M,
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
const { LiveEngine, POOR_ACCURACY_M } = await import('../src/live/engine.ts');
const { catalogTrackSpecs } = await import('../src/live/tracks.ts');

interface DriveResult {
  engine: InstanceType<typeof LiveEngine>;
  final: LiveEngineState;
  /** fixesFed at the first emit with a non-null track (0 = from start()) */
  lockAt: number | null;
  emits: number;
  lastEmitted: LiveEngineState | null;
}

/** `specs` defaults to the legacy four-track set; pass `catalogTrackSpecs()`
 * explicitly for the full-catalog tests. `pickId` pre-seeds the START pick via
 * an explicit start() before the feed loop (virgin-cycle21: the pick is the
 * engine's one reference) — undefined leaves feed()'s own no-pick auto-start
 * untouched, which yields NO reference. */
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

function assertDoneReal(ctx: string, s: LiveSector, row: SectorRow, tol = 2e-6): void {
  assert(s.kind === 'done', `${ctx}: kind ${s.kind}, want done`);
  assert(!s.estimated, `${ctx}: marked estimated on a real crossing`);
  assert(s.interrupted === (row.flag === 'interrupted'),
    `${ctx}: interrupted=${s.interrupted}, offline flag=${row.flag}`);
  assert(numEq(s.rawS, row.rawS, tol), `${ctx}: rawS ${s.rawS} != offline ${row.rawS}`);
  assert(numEq(s.stoppedS, row.stoppedS, tol), `${ctx}: stoppedS ${s.stoppedS} != offline ${row.stoppedS}`);
  assert(numEq(s.movingS, row.movingS, tol), `${ctx}: movingS ${s.movingS} != offline ${row.movingS}`);
}

test('live: engine importable headless (Metro shim) — the engine exports no lock constants', () => {
  assert(typeof LiveEngine === 'function', 'LiveEngine not exported');
  assert(POOR_ACCURACY_M === 50, `POOR_ACCURACY_M ${POOR_ACCURACY_M}, doc says 50`);
});

// ------------------------------------------- parity anchor: displayed times

test('live: clean rides — 5 real fires each; displayed sector + lap times equal the offline pipeline', () => {
  for (const name of ['clean_morning', 'clean_eveninga', 'clean_eveningb'] as const) {
    const f = loadFixture(name);
    const { final } = drive(f, 0, undefined, f.track);
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
  const { final } = drive(f, 0, undefined, f.track);
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
  const { final } = drive(f, 0, undefined, f.track);
  assert(final.sectors[0].kind === 'missed' && final.sectors[0].reason === 'skipped',
    `S1 ${JSON.stringify(final.sectors[0])}, want missed:skipped`);
  for (let i = 1; i < 4; i++) assertDoneReal(`S${i + 1}`, final.sectors[i], f.expected.offline[i]);
  assert(final.gateFires === 4, `${final.gateFires} fires, want 4 (START never fired)`);
  assert(final.lap !== null && final.lap.rawS === null && final.lap.estimated,
    `lap ${JSON.stringify(final.lap)}: no START event, so no lap raw time and estimated`);
});

test('live: detour_eveningb — offroute/estimated sectors never show a real coloured time (D-015/D-013)', () => {
  const f = loadFixture('detour_eveningb');
  const { final } = drive(f, 0, undefined, f.track);
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

test('live: synthetic_truncated — mid-ride kill: locked but unfinished, S3 current, no lap, no fabricated gates', () => {
  const f = loadFixture('synthetic_truncated');
  const { final } = drive(f, 0, undefined, f.track);
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
  const { final } = drive(f, 0, undefined, f.track);
  assert(final.track === 'EveningB' && final.phase === 'finished', `${final.track}/${final.phase}`);
  for (let i = 0; i < 4; i++) assertDoneReal(`S${i + 1}`, final.sectors[i], f.expected.offline[i]);
  assert(final.lap !== null && !final.lap.estimated && final.lap.movingS !== null,
    'first-ever ride must still score a real lap (colour stays blank at the benchmark layer, D-008/D-021)');
});

test('live: engine started mid-ride on a pick (partial buffer) — sectors behind missed, sectors ahead at full parity', () => {
  const f = loadFixture('clean_morning');
  const ev = f.expected.live.events;
  const from = f.fixes.t.findIndex((t) => t >= (ev[2].t + ev[3].t) / 2); // between G2 and G3
  assert(from > 0, 'could not find a mid-sector-3 restart fix');
  const { final, lockAt } = drive(f, from, undefined, f.track);
  assert(final.phase === 'finished' && final.track === 'Morning', `${final.phase}/${final.track}`);
  assert(lockAt === 0, `reference not present from start() after relaunch (first track at fix ${lockAt})`);
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
    const { final } = drive(f, 0, undefined, f.track);
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

test('live: engine events (GPX+) — clean_morning (picked) emits gate events only, matching the live snapshot, and no lock event', () => {
  const f = loadFixture('clean_morning');
  const engine = new LiveEngine(fixtureSpecs());
  const evts: { type: string; track: TrackId; atChainageM?: number; gateIndex?: number; t?: number; estimated?: boolean }[] = [];
  const unsub = engine.subscribeEvents((e) => evts.push(e));
  engine.start({ pickId: f.track });
  for (let i = 0; i < f.fixes.t.length; i++) {
    engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  }
  unsub();
  assert(evts.every((e) => e.type === 'gate'), `non-gate engine events: ${JSON.stringify(evts.filter((e) => e.type !== 'gate'))}`);
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
  engine.start({ pickId: 'Morning' });

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
  engine.start({ pickId: 'Morning' });

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
  engine.start({ pickId: 'Morning' });
  for (let i = 0; i < f.fixes.t.length; i++) {
    engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  }
  u1(); u2(); u3();
  assert(diagEvts.length > 0, 'no diagnostics emitted at all on a normal clean ride');
  assert(!diagEvts.some((d) => (d.phase as string) === 'lock'), 'a lock-phase diagnostic was emitted — locking is retired');
  // virgin-cycle21: exactly one candidate (the pick's) exists, so exactly one anchor.
  const anchorDiags = diagEvts.filter((d) => d.phase === 'anchor');
  assert(anchorDiags.length === 1 && anchorDiags[0].track === 'Morning' && typeof anchorDiags[0].xtdM === 'number',
    `anchor diagnostics ${JSON.stringify(anchorDiags)}, want exactly one, on Morning, with a numeric xtdM`);
  // state emits once per feed (+1 for auto-start); diagnostics only fire on
  // anchor/retry attempts, which is far fewer than one-per-fix — proof
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

test('live (WP-1 C3): start({ wayIds: [] }) arms zero candidates — [] means "nothing", not "unfiltered"', () => {
  const f = loadFixture('clean_morning');
  const engine = new LiveEngine(fixtureSpecs());
  engine.start({ wayIds: [] });
  for (let i = 0; i < f.fixes.t.length; i += 10) {
    engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  }
  engine.finalize();
  const st = engine.getState();
  assert(st.track === null && st.lap === null, 'an empty wayIds array locks nothing, scores nothing — a real Morning ride included');
  assert(st.gateFires === 0, 'no candidate exists to fire a gate');
});

test('live: pick honoured — clean_eveningb with pick=EveningB is the reference from the first fix; only gate events are recorded', () => {
  const f = loadFixture('clean_eveningb');
  const picked = drive(f, 0, fixtureSpecs(), 'EveningB');
  assert(picked.lockAt === 0, `the pick was not the reference from start() (first track at fix ${picked.lockAt})`);
  assert(picked.final.track === 'EveningB' && picked.final.phase === 'finished',
    `track ${picked.final.track}, phase ${picked.final.phase}`);
  assert(picked.final.pick === 'EveningB', `pick ${picked.final.pick}`);

  const engine = new LiveEngine(fixtureSpecs());
  const evts: EngineEvent[] = [];
  const unsub = engine.subscribeEvents((e) => evts.push(e));
  engine.start({ pickId: 'EveningB' });
  for (let i = 0; i < f.fixes.t.length; i++) engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  unsub();
  assert(evts.length > 0 && evts.every((e) => e.type === 'gate' && e.track === 'EveningB'),
    `events ${JSON.stringify(evts)} — want only gate events on EveningB`);
});

test('live: pick wrong — clean_eveningb with pick=EveningA is a HARD pick: the ridden route (EveningB) is never locked, never displayed', () => {
  // Nathan 2026-08-29: what you pick stays locked until the end. A wrong pick
  // therefore never gets "rescued" onto the ridden road — the invariant is
  // that no gate event, and no final track, ever names EveningB.
  const f = loadFixture('clean_eveningb');
  const engine = new LiveEngine(fixtureSpecs());
  const evts: EngineEvent[] = [];
  const unsubEv = engine.subscribeEvents((e) => evts.push(e));
  engine.start({ pickId: 'EveningA' });
  for (let i = 0; i < f.fixes.t.length; i++) engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  engine.finalize();
  unsubEv();
  const final = engine.getState();
  assert(final.track !== 'EveningB', 'a hard pick of EveningA must never end up displaying EveningB');
  assert(final.track === null || final.track === 'EveningA', `final track ${final.track}, want null or EveningA`);
  assert(final.pick === 'EveningA', `pick ${final.pick}, track ${final.track}`);
  assert(evts.every((e) => e.track === 'EveningA'),
    `engine events name a route other than the pick: ${JSON.stringify(evts.filter((e) => e.track !== 'EveningA'))}`);
  console.log(`  (measured: pick=EveningA on clean_eveningb ends track=${final.track} events=${evts.length})`);
});

test('live: full-catalog — clean_morning + pick=Morning is the reference from START, finalize() keeps it', () => {
  // HomeStationPreferred is an anchored blocker the whole way (measured:
  // shares 98% of Morning's corridor); HomeChurch shares the first ~340 m.
  // The leader at any instant may be a different anchored candidate by
  // resampling noise (the two lines are the same road) — the soft lock keys
  // on the PICK's own candidate reaching adv >= 400 (hard pick, Nathan
  // 2026-08-29), not on the pick being leader or even inside the margin.
  // This is the guard that the daily commute still scores.
  const f = loadFixture('clean_morning');
  const engine = new LiveEngine(catalogTrackSpecs());
  engine.start({ pickId: 'Morning' });
  assert(engine.getState().track === 'Morning', 'the pick is not the reference before the first fix');
  for (let i = 0; i < f.fixes.t.length; i++) engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  engine.finalize();
  const final = engine.getState();
  assert(final.track === 'Morning', `track ${final.track}`);
  assert(final.phase === 'finished', `phase ${final.phase}, want finished`);
  for (let i = 0; i < 4; i++) assertDoneReal(`S${i + 1}`, final.sectors[i], f.expected.offline[i]);
  assert(final.lap !== null && !final.lap.estimated && final.lap.movingS !== null, 'lap not scored real after finalize');
});

test('live: full-catalog — clean_eveningb + pick=EveningB: the pick alone is a candidate, sectors and lap real', () => {
  // StationHomeWet is an UNANCHORED shadow (its corridor joins mid-line at
  // its own ~2900 m — must not block, per the anchored rule); WorkChurchB is
  // an ANCHORED partial blocker (shares EveningB's exit from work up to
  // EveningB chainage ~310 m).
  const f = loadFixture('clean_eveningb');
  const { final, lockAt } = drive(f, 0, catalogTrackSpecs(), 'EveningB');
  assert(final.track === 'EveningB', `track ${final.track}`);
  assert(lockAt === 0, `the pick was not the reference from start() (first track at fix ${lockAt})`);
  for (let i = 0; i < 4; i++) assertDoneReal(`S${i + 1}`, final.sectors[i], f.expected.offline[i]);
  assert(final.lap !== null && !final.lap.estimated && final.lap.movingS !== null, 'lap not scored real');
});

test('live: full-catalog — clean_eveninga + pick=EveningA: shadows cannot interfere, sectors real', () => {
  // StationHomePreferred shadows EveningA mid-line (unanchored) — must not
  // widen the margin needed to lock.
  const f = loadFixture('clean_eveninga');
  const { final, lockAt } = drive(f, 0, catalogTrackSpecs(), 'EveningA');
  assert(final.track === 'EveningA', `track ${final.track}`);
  assert(lockAt === 0, `the pick was not the reference from start() (first track at fix ${lockAt})`);
  for (let i = 0; i < 4; i++) assertDoneReal(`S${i + 1}`, final.sectors[i], f.expected.offline[i]);
});

/** The set of track ids the engine actually built candidates for: the
 * `wayMatchAttempt` 'anchor' diagnostic fires once per candidate on its first
 * fed fix (engine.ts feed(): baseS null -> set, unconditionally), for EVERY
 * candidate, never just the displayed one — so this is the candidate list
 * itself, observed through existing surface. */
function candidateTracks(diag: readonly DiagnosticEvent[]): string[] {
  return [...new Set(diag.filter((d) => d.phase === 'anchor').map((d) => d.track))].sort();
}

test('live: WP-B coordinator addendum — start({wayIds}) scopes the spec set: a pick outside it is no reference at all', () => {
  // A filter that excludes every route anywhere near a real Morning ride
  // (EveningA/EveningB run work<->home, nowhere near home<->work Morning
  // territory at these chainages) must leave the engine with exactly those
  // two candidates and nothing else: no Morning anchor, no lock, no fires —
  // proving routeIds restricts which TrackSpecs even become candidates, not
  // merely which of their fires get surfaced.
  const f = loadFixture('clean_morning');
  const engine = new LiveEngine(catalogTrackSpecs());
  const diag: DiagnosticEvent[] = [];
  const events: EngineEvent[] = [];
  engine.subscribeDiagnostics((e) => diag.push(e));
  engine.subscribeEvents((e) => events.push(e));
  engine.start({ pickId: 'Morning', wayIds: ['EveningA', 'EveningB'] });
  for (let i = 0; i < f.fixes.t.length; i++) engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  const final = engine.getState();
  const cands = candidateTracks(diag);
  assert(cands.length === 0,
    `candidates were [${cands.join(', ')}], want none — a pick outside the wayIds-scoped set is no reference`);
  assert(final.track === null && final.phase === 'detecting',
    `track ${final.track}, phase ${final.phase} — Morning must not be the reference when the filter excluded it`);
  assert(final.gateFires === 0, `${final.gateFires} gate fires against a routeIds filter excluding every nearby route`);
  assert(events.filter((e) => e.type === 'gate').length === 0, 'gate events emitted with no candidate near the ride');
});

test('live: WP-B coordinator addendum — start({routeIds}) filtered to the ridden route(s) still fires normally', () => {
  const f = loadFixture('clean_morning');
  const specs = catalogTrackSpecs();
  const nGates = specs.find((s) => s.id === 'Morning')!.gates.length;
  const engine = new LiveEngine(specs);
  const diag: DiagnosticEvent[] = [];
  const events: EngineEvent[] = [];
  engine.subscribeDiagnostics((e) => diag.push(e));
  engine.subscribeEvents((e) => events.push(e));
  engine.start({ pickId: 'Morning', wayIds: ['Morning', 'MorningB'] });
  for (let i = 0; i < f.fixes.t.length; i++) engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  const final = engine.getState();
  assert(candidateTracks(diag).join(',') === 'Morning', `candidates [${candidateTracks(diag)}], want exactly the pick`);
  assert(final.track === 'Morning', `track ${final.track} — the picked route inside the filter must be the reference`);
  assert(final.gateFires === nGates, `${final.gateFires} Morning gate fires under a routeIds filter that includes it, want ${nGates}`);
  const gateEvents = events.filter((e) => e.type === 'gate');
  assert(gateEvents.length === nGates && gateEvents.every((e) => e.track === 'Morning'),
    `${gateEvents.length} gate events (${[...new Set(gateEvents.map((e) => e.track))].join(', ')}), want ${nGates} all on Morning`);
});

test('live: WP-B coordinator addendum — wayIds omitted/undefined is unfiltered: the pick is found among the full catalog', () => {
  const f = loadFixture('clean_morning');
  const allIds = catalogTrackSpecs().map((s) => s.id).sort();
  const withUndefined = new LiveEngine(catalogTrackSpecs());
  const omitted = new LiveEngine(catalogTrackSpecs());
  const diagU: DiagnosticEvent[] = [];
  const diagO: DiagnosticEvent[] = [];
  withUndefined.subscribeDiagnostics((e) => diagU.push(e));
  omitted.subscribeDiagnostics((e) => diagO.push(e));
  withUndefined.start({ pickId: 'Morning', wayIds: undefined });
  omitted.start({ pickId: 'Morning' });
  for (let i = 0; i < f.fixes.t.length; i++) {
    withUndefined.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
    omitted.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  }
  const candsU = candidateTracks(diagU);
  const candsO = candidateTracks(diagO);
  assert(allIds.includes('Morning'), 'precondition: Morning is a catalog route');
  assert(candsU.join(',') === 'Morning', `wayIds:undefined built [${candsU}], want exactly the pick`);
  assert(candsO.join(',') === 'Morning', `omitted wayIds built [${candsO}], want exactly the pick`);
  const u = withUndefined.getState();
  const o = omitted.getState();
  assert(
    u.track === o.track && u.gateFires === o.gateFires && u.phase === o.phase,
    'passing routeIds:undefined and omitting it entirely must behave identically (both = unfiltered)',
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

test('live: 2026-09-01 ride 2 — a picked route ridden from its far end fires no gate, so finalize() leaves the ride unmatched (arming-skip artifact)', () => {
  // The artifact the guard exists for: D-016(b) arming on a first fix that
  // already lies past every gate resolves ALL of them as skipped in one call
  // — nextGateIndex === gates.length before a metre is ridden.
  const det = new GateDetector(SYN_L.gates);
  det.update(1755167000, 3000);
  assert(det.nextGateIndex === SYN_L.gates.length && det.skippedGates.length === SYN_L.gates.length,
    `arming precondition: next ${det.nextGateIndex}, skipped ${det.skippedGates.length}, want ${SYN_L.gates.length}/${SYN_L.gates.length}`);

  // Ride SyntheticL's road in REVERSE (3000 m -> 0) with SyntheticL picked:
  // the projector seeds at the far end and is forward-only, so the candidate
  // never advances. The arming skips above are not gate FIRES, so under
  // virgin-cycle21 finalize() leaves the ride unmatched.
  const engine = new LiveEngine([SYN_L]);
  const evts: EngineEvent[] = [];
  const unsub = engine.subscribeEvents((e) => evts.push(e));
  engine.start({ pickId: 'SyntheticL' });
  let t = 1755167000;
  for (let s = 3000; s >= 0; s -= 5) {
    const [lat, lon] = xyToLatLon(s, 0, 0, 0);
    engine.feed(lat, lon, t * 1000);
    t += 1;
  }
  unsub();
  const mid = engine.getState();
  assert(mid.track === 'SyntheticL' && mid.gateFires === 0,
    `pre-finalize: track ${mid.track}, gateFires ${mid.gateFires} — want SyntheticL/0`);
  engine.finalize();
  const final = engine.getState();
  assert(final.track === null,
    `finalize() kept ${final.track} — no gate fired on it (must be unmatched so the naming offer appears)`);
  assert(final.phase !== 'finished' && final.lap === null,
    `phase ${final.phase}, lap ${JSON.stringify(final.lap)} — want not finished / null`);
  assert(evts.length === 0, `${evts.length} engine events, want 0 (no gate fired)`);
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

test('live: hard pick at finalize — a picked prefix route (SyntheticP) stays the result even though the rider went on to finish SyntheticL', () => {
  const engine = new LiveEngine([SYN_P, SYN_L]);
  const evts: EngineEvent[] = [];
  const unsubEv = engine.subscribeEvents((e) => evts.push(e));
  engine.start({ pickId: 'SyntheticP' });
  let t = 1755167000;
  for (let s = 0; s <= 2905; s += 5) {
    const [lat, lon] = xyToLatLon(s, 0, 0, 0);
    engine.feed(lat, lon, t * 1000);
    t += 1;
  }

  const midState = engine.getState();
  assert(
    midState.track === 'SyntheticP' && midState.phase === 'finished',
    `pre-finalize state wrong: track ${midState.track}, phase ${midState.phase} — expected P still the reference and frozen at its own FINISH`,
  );
  assert(midState.lap !== null, 'P\'s own lap was never scored before finalize()');
  const ownRawS = midState.lap!.rawS;

  engine.finalize();
  unsubEv();
  const final = engine.getState();
  assert(final.track === 'SyntheticP',
    `finalize() reassigned the hard pick: track ${final.track}`);
  assert(final.lap !== null && !final.lap.estimated && final.lap.rawS === ownRawS,
    `final lap ${JSON.stringify(final.lap)} is not P's own (rawS ${ownRawS})`);
  assert(numEq(final.lap!.rawS!, 160, 2), `final lap ${final.lap!.rawS}s does not match P's own timing (~160s)`);
  assert(final.sectors.length === 4 && final.sectors.every((s) => s.kind === 'done' && !s.estimated),
    `sectors not all real after finalize: ${final.sectors.map((s) => s.kind)}`);
  assert(evts.length > 0 && evts.every((e) => e.type === 'gate'), 'a non-gate event was emitted');
  assert(evts.every((e) => e.track === 'SyntheticP'), 'an event names SyntheticL — a non-pick candidate leaked into the record');
});

// SyntheticT is SyntheticL's line with its FINISH gate pulled back to 2400 m
// — a 600 m polyline tail past FINISH, the shape EveningB really has (its
// reference runs 601 m past its FINISH gate; every other catalog route's
// tail is under 310 m).
const SYN_T: TrackSpec = {
  id: 'SyntheticT', ref: buildSyntheticRef([[0, 0], [3005, 0]]), gates: [100, 800, 1500, 2200, 2400],
};

// --------------------------------------------------------------------------
// cycle 025 (WP-stale-first-fix P1): flagged fixes are inert to the matcher
// --------------------------------------------------------------------------

test('live: cycle025 stale-fix — a flagged fix is inert (not buffered, no auto-start, no anchoring); the matcher anchors on the first REAL fix', () => {
  const ref = refFor('Morning');
  const engine = new LiveEngine(fixtureSpecs());
  const diag: DiagnosticEvent[] = [];
  engine.subscribeDiagnostics((e) => diag.push(e));
  engine.start({ pickId: 'Morning' });
  const t0Ms = 1755167000000;
  // the 2026-08-25 shape: a stale cached fix 9 s before the first real one,
  // geometrically far down the track, with GOOD claimed accuracy (so the
  // POOR_ACCURACY_M retry would never rescue a wrong anchor seeded from it)
  const [staleLat, staleLon] = morningLatLonAt(ref, 4000);
  engine.feed(staleLat, staleLon, t0Ms - 9000, 12, true);
  assert(engine.getState().fixesFed === 0, 'flagged fix entered the engine buffer');
  assert(diag.length === 0, `flagged fix produced ${diag.length} diagnostics`);
  assert(engine.getState().riderSnap === null, 'a flagged fix produced a rider snap');
  // the real ride: chainage 0 -> 800 m, good accuracy
  let tMs = t0Ms;
  for (let i = 0; i <= 40; i++) {
    const [lat, lon] = morningLatLonAt(ref, i * 20);
    engine.feed(lat, lon, tMs, 15);
    tMs += 1000;
    // the first REAL fix sits at Morning's own start: it must anchor and snap.
    if (i === 0) assert(engine.getState().riderSnap !== null, 'no rider snap after the first real on-route fix at chainage 0');
  }
  const anchors = diag.filter((d) => d.track === 'Morning' && d.phase === 'anchor');
  assert(anchors.length === 1, `${anchors.length} Morning anchor diagnostics, want 1`);
  assert(anchors[0].atT === t0Ms / 1000,
    `Morning anchored at ${anchors[0].atT}, want ${t0Ms / 1000} — anchored on the flagged pre-START fix?`);
  const final = engine.getState();
  assert(final.track === 'Morning' && final.phase !== 'detecting',
    `lock never reached from the real fixes: phase=${final.phase} track=${final.track}`);
});

// ============================================================ virgin-cycle20 06: pre-lock display candidate

/** SYN_L ridden from 0 at 5 m/s with a pick (or none); returns the engine plus
 * the events it emitted. `accuracy(s)` lets a test shape the cycle-023 retry. */
function rideSynL(toS: number, pickId: string | null, accuracy?: (s: number) => number) {
  const engine = new LiveEngine([SYN_L]);
  const evts: EngineEvent[] = [];
  const diag: DiagnosticEvent[] = [];
  engine.subscribeEvents((e) => evts.push(e));
  engine.subscribeDiagnostics((e) => diag.push(e));
  if (pickId !== null) engine.start({ pickId });
  let t = 1755167000;
  const tAt = new Map<number, number>();
  for (let s = 0; s <= toS; s += 5) {
    const [lat, lon] = xyToLatLon(s, 0, 0, 0);
    engine.feed(lat, lon, t * 1000, accuracy ? accuracy(s) : undefined);
    tAt.set(s, t);
    t += 1;
  }
  return { engine, evts, diag, tAt };
}

test('live cycle20-06 E1: under a pick the pick is the reference from start() — S1/startGateT on the START-crossing fix, one gate event (virgin-cycle21)', () => {
  // Before gate 0 (100 m): displayed but nothing crossed.
  const pre = rideSynL(95, 'SyntheticL');
  const s0 = pre.engine.getState();
  assert(s0.track === 'SyntheticL' && s0.phase === 'locked',
    `pre-gate: track ${s0.track}, phase ${s0.phase}`);
  assert(s0.currentSector === null && s0.startGateT === null && s0.lastDone === null,
    `pre-gate: currentSector ${s0.currentSector}, startGateT ${s0.startGateT}, lastDone ${s0.lastDone} — want all null`);
  assert(s0.sectors.length === 4 && s0.sectors.every((x) => x.kind === 'pending'), `pre-gate sectors ${s0.sectors.map((x) => x.kind)}`);
  assert(s0.chainageM !== null && numEq(s0.chainageM, 95, 6), `pre-gate chainageM ${s0.chainageM}, want ~95`);
  // On the crossing fix (s = 100): S1 immediately, still no lock, still no event.
  const at = rideSynL(100, 'SyntheticL');
  const s1 = at.engine.getState();
  assert(s1.track === 'SyntheticL' && s1.phase === 'locked', `at gate: track ${s1.track}, phase ${s1.phase}`);
  assert(s1.currentSector === 1, `at gate: currentSector ${s1.currentSector}, want 1`);
  assert(s1.startGateT !== null && numEq(s1.startGateT, at.tAt.get(100)!, 1.01), `at gate: startGateT ${s1.startGateT}, want ~${at.tAt.get(100)}`);
  assert(s1.sectors[0].kind === 'current' && s1.sectors.slice(1).every((x) => x.kind === 'pending'), `at gate sectors ${s1.sectors.map((x) => x.kind)}`);
  assert(s1.gateFires === 1, `gateFires ${s1.gateFires} (the buzz counter)`);
  assert(at.evts.length === 1 && at.evts[0].type === 'gate' && at.evts[0].gateIndex === 0,
    `${JSON.stringify(at.evts)} — want exactly the gate-0 event`);
});

test('live cycle20-06 E2: with NO pick there is no reference — every positional field stays null for the whole ride', () => {
  const r = rideSynL(395, null);
  const st = r.engine.getState();
  assert(st.track === null && st.currentSector === null && st.startGateT === null && st.chainageM === null,
    `no pick: track ${st.track}, currentSector ${st.currentSector}, startGateT ${st.startGateT}, chainageM ${st.chainageM} — want all null`);
  assert(st.sectors.every((x) => x.kind === 'pending'), `no-pick sectors ${st.sectors.map((x) => x.kind)}`);
  assert(st.gateFires === 0, `gateFires ${st.gateFires}: no candidate exists, nothing can fire`);
});

test('live cycle20-06 E6: stop() clears the reference and every positional field (virgin-cycle21)', () => {
  const r = rideSynL(300, 'SyntheticL');
  const st = r.engine.getState();
  assert(st.track === 'SyntheticL', `track ${st.track}`);
  r.engine.stop();
  const off = r.engine.getState();
  assert(off.track === null && off.currentSector === null && off.startGateT === null && off.chainageM === null,
    `after stop(): track ${off.track}, currentSector ${off.currentSector}, startGateT ${off.startGateT}, chainageM ${off.chainageM}`);
});

test('live cycle20-12: a ride with fired gates keeps its done sectors through the defensive SECOND finalize()', () => {
  // Opus inspection of brief 06 (I3): finalize()'s pending-reset ran for every
  // lockKind other than 'soft' — including 'finalized', the state the FIRST
  // finalize() leaves a soft lock in — so RecordScreen's onEnd finalize()
  // followed by stopTracking()'s own wiped the ride's sectors to pending.
  // Same two-ways-one-line layout as N9 L2: pick L, ride 1200 m straight —
  // S and L tie on the shared corridor, so the lock stays soft (never verified).
  const engine = new LiveEngine([SYN_S, SYN_L]);
  engine.start({ pickId: 'SyntheticL' });
  let t = 1755167000;
  for (let s = 0; s <= 1200; s += 5) {
    const [lat, lon] = xyToLatLon(s, 0, 0, 0);
    engine.feed(lat, lon, t * 1000);
    t += 1;
  }
  const mid = engine.getState();
  assert(mid.track === 'SyntheticL', `pre-finalize: track ${mid.track}`);
  assert(mid.sectors[0].kind === 'done' && mid.sectors[1].kind === 'current',
    `pre-finalize sectors ${mid.sectors.map((x) => x.kind)} — want S1 done (gates 100/800 crossed), S2 current`);
  engine.finalize();
  const once = engine.getState();
  assert(once.track === 'SyntheticL', `first finalize: track ${once.track}`);
  assert(once.sectors[0].kind === 'done', `first finalize sectors ${once.sectors.map((x) => x.kind)} — S1 must stay done`);
  const before = JSON.stringify(once.sectors);
  engine.finalize(); // the defensive second call (stopTracking after onEnd)
  const twice = engine.getState();
  assert(twice.sectors[0].kind === 'done', `second finalize sectors ${twice.sectors.map((x) => x.kind)} — S1 wiped to ${twice.sectors[0].kind}`);
  assert(JSON.stringify(twice.sectors) === before, `second finalize changed sectors: ${before} -> ${JSON.stringify(twice.sectors)}`);
  assert(twice.track === 'SyntheticL' && twice.currentSector === once.currentSector,
    `second finalize: track ${twice.track}, currentSector ${twice.currentSector} (was ${once.currentSector})`);
});

// ============================================================ virgin-cycle21 01: the START pick is the one reference
// (Nathan 2026-10-03: "never lock any ways into the ride; the absolute
// reference is the user pick at the start"). Synthetic corridor-subset specs
// only (SYN_S / SYN_L share their first 1200 m) — never a rider's real route.

/** Feed SYN positions s0..s1 step 5 m at 1 Hz; `onS` selects S's branch past 1200 m.
 * Returns the state after every fix. */
function ride21(
  engine: InstanceType<typeof LiveEngine>, s0: number, s1: number, onS = false,
  accuracy?: (s: number) => number,
): LiveEngineState[] {
  const states: LiveEngineState[] = [];
  let t = 1755167000 + s0;
  for (let s = s0; s <= s1; s += 5) {
    const [x, y] = synPos(onS, s);
    const [lat, lon] = xyToLatLon(x, y, 0, 0);
    engine.feed(lat, lon, t * 1000, accuracy ? accuracy(s) : undefined);
    states.push(engine.getState());
    t += 1;
  }
  return states;
}

test('virgin-cycle21 01: L1 the pick is the reference from the first call — before any fix and after one fix', () => {
  const engine = new LiveEngine([SYN_S, SYN_L]);
  engine.start({ pickId: 'SyntheticL' });
  const pre = engine.getState();
  assert(pre.track === 'SyntheticL' && pre.phase === 'locked', `before any fix: track ${pre.track}, phase ${pre.phase}`);
  assert(pre.pick === 'SyntheticL', `pick ${pre.pick}`);
  const st = ride21(engine, 0, 0)[0];
  assert(st.track === 'SyntheticL' && st.phase === 'locked', `after one fix: track ${st.track}, phase ${st.phase}`);
  assert(!('lockKind' in st) && !('pickHonoured' in st) && !('anyAnchored' in st) && !('displayTrack' in st),
    `retired fields still on the state: ${Object.keys(st).join(',')}`);
});

test('virgin-cycle21 01: L2 a rival that pulls ahead never takes over — pick S, rider rides L\'s divergent road for 1.8 km', () => {
  const engine = new LiveEngine([SYN_S, SYN_L]);
  const evts: EngineEvent[] = [];
  engine.subscribeEvents((e) => evts.push(e));
  engine.start({ pickId: 'SyntheticS' });
  const states = ride21(engine, 0, 3000, false);
  assert(states.every((x) => x.track === 'SyntheticS'), 'track left the pick at some fix');
  assert(evts.length > 0 && evts.every((e) => e.type === 'gate' && e.track === 'SyntheticS'),
    `events ${JSON.stringify(evts.filter((e) => e.type !== 'gate' || e.track !== 'SyntheticS'))} — want only gate events on the pick`);
  assert(!evts.some((e) => (e.type as string) === 'lock' || (e.type as string) === 'lockChange'), 'a lock/lockChange event was emitted');
  const fin = states[states.length - 1];
  assert(fin.gateFires === 4, `${fin.gateFires} fires, want 4 (S gates at 100/400/700/1000; 1300 is on the unridden branch)`);
  assert(fin.sectors[3].kind !== 'done' && fin.lap === null, `S4 ${JSON.stringify(fin.sectors[3])}, lap ${JSON.stringify(fin.lap)} — the unridden stretch must not be scored`);
});

test('virgin-cycle21 01: L2b pick=L while the rider takes S\'s branch — L stays, 2 fires, partial sectors, no lap, finalize keeps it', () => {
  const engine = new LiveEngine([SYN_S, SYN_L]);
  const evts: EngineEvent[] = [];
  engine.subscribeEvents((e) => evts.push(e));
  engine.start({ pickId: 'SyntheticL' });
  ride21(engine, 0, 1400, true);
  const mid = engine.getState();
  assert(mid.track === 'SyntheticL', `track ${mid.track}`);
  engine.finalize();
  const fin = engine.getState();
  assert(fin.track === 'SyntheticL' && fin.lap === null, `final track ${fin.track}, lap ${JSON.stringify(fin.lap)}`);
  assert(fin.gateFires === 2, `${fin.gateFires} fires on L, want 2 (100 and 800)`);
  assert(fin.sectors[0].kind === 'done' && fin.sectors[1].kind === 'current'
    && fin.sectors[2].kind === 'pending' && fin.sectors[3].kind === 'pending',
    `sectors [${fin.sectors.map((x) => x.kind)}], want done/current/pending/pending`);
  assert(evts.every((e) => e.type === 'gate' && e.track === 'SyntheticL'), 'an event names a non-pick route or is not a gate');
});

test('virgin-cycle21 01: L3 no pick = no reference — 2 km along A shows nothing, fires nothing, emits nothing', () => {
  const engine = new LiveEngine([SYN_S, SYN_L]);
  const evts: EngineEvent[] = [];
  engine.subscribeEvents((e) => evts.push(e));
  engine.start({ pickId: null });
  const states = ride21(engine, 0, 2000);
  for (const st of states) {
    assert(st.track === null && st.phase === 'detecting' && st.gateFires === 0 && st.riderSnap === null && st.chainageM === null,
      `fix ${st.fixesFed}: track ${st.track}, phase ${st.phase}, fires ${st.gateFires}`);
    assert(st.sectors.length === 4 && st.sectors.every((x) => x.kind === 'pending'), `sectors ${st.sectors.map((x) => x.kind)}`);
  }
  assert(evts.length === 0, `${evts.length} engine events with no reference`);
});

test('virgin-cycle21 01: L4 a pick outside the sport-scoped set (wayIds) behaves as no pick', () => {
  const engine = new LiveEngine([SYN_S, SYN_L]);
  const evts: EngineEvent[] = [];
  engine.subscribeEvents((e) => evts.push(e));
  engine.start({ pickId: 'SyntheticL', wayIds: ['SyntheticS'] });
  const states = ride21(engine, 0, 2000);
  for (const st of states) {
    assert(st.track === null && st.phase === 'detecting' && st.gateFires === 0 && st.riderSnap === null,
      `fix ${st.fixesFed}: track ${st.track}, phase ${st.phase}, fires ${st.gateFires}`);
    assert(st.sectors.length === 4 && st.sectors.every((x) => x.kind === 'pending'), `sectors ${st.sectors.map((x) => x.kind)}`);
  }
  assert(states[0].pick === 'SyntheticL', 'pick should still be logged');
  assert(evts.length === 0, `${evts.length} engine events`);
});

test('virgin-cycle21 01: L5 finalize — a pick that fired nothing is unmatched; a pick that fired keeps its sectors; a no-pick full ride is never recovered; all idempotent', () => {
  // (a) accidental START: pick L, rider stops before gate 0 (100 m)
  const a = new LiveEngine([SYN_S, SYN_L]);
  a.start({ pickId: 'SyntheticL' });
  ride21(a, 0, 95);
  assert(a.getState().track === 'SyntheticL', 'pick not the reference before finalize');
  a.finalize();
  const a1 = JSON.stringify(a.getState());
  const sa = a.getState();
  assert(sa.track === null && sa.sectors.every((x) => x.kind === 'pending'), `unfired pick: track ${sa.track}, sectors ${sa.sectors.map((x) => x.kind)}`);
  a.finalize();
  assert(JSON.stringify(a.getState()) === a1, 'second finalize changed the unmatched state');
  // (b) pick with >= 1 gate fired
  const b = new LiveEngine([SYN_S, SYN_L]);
  b.start({ pickId: 'SyntheticL' });
  ride21(b, 0, 1000);
  b.finalize();
  const b1 = JSON.stringify(b.getState());
  const sb = b.getState();
  assert(sb.track === 'SyntheticL' && sb.sectors[0].kind === 'done', `fired pick: track ${sb.track}, S1 ${sb.sectors[0].kind}`);
  b.finalize();
  assert(JSON.stringify(b.getState()) === b1, 'second finalize changed the matched state');
  // (c) no pick, rider completed L's whole route: nothing is recovered
  const c = new LiveEngine([SYN_S, SYN_L]);
  ride21(c, 0, 3000);
  c.finalize();
  const sc = c.getState();
  assert(sc.track === null && sc.lap === null && sc.phase !== 'finished', `no-pick full ride: track ${sc.track}, phase ${sc.phase}`);
});

test('virgin-cycle21 01: L6 the poor-accuracy re-seed never eats a real fire (only runs while no gate has fired)', () => {
  // (a) poor accuracy THROUGH gate 0 (100 m), good fix after: gate 0 genuinely fired -> no re-seed, fire kept
  const a = new LiveEngine([SYN_L]);
  const diagA: DiagnosticEvent[] = [];
  a.subscribeDiagnostics((e) => diagA.push(e));
  a.start({ pickId: 'SyntheticL' });
  ride21(a, 0, 150, false, (s) => (s <= 105 ? 60 : 10));
  const sa = a.getState();
  assert(diagA.filter((d) => d.phase === 'retry').length === 0, 'a re-seed ran after a gate had fired');
  assert(sa.gateFires === 1 && sa.startGateT !== null && sa.sectors[0].kind === 'current',
    `fires ${sa.gateFires}, startGateT ${sa.startGateT}, S1 ${sa.sectors[0].kind} — the fire was discarded`);
  // (b) poor first fix, good fix BEFORE any gate: the re-seed still happens (cycle 023 fix 2)
  const b = new LiveEngine([SYN_L]);
  const diagB: DiagnosticEvent[] = [];
  b.subscribeDiagnostics((e) => diagB.push(e));
  b.start({ pickId: 'SyntheticL' });
  ride21(b, 0, 150, false, (s) => (s === 0 ? 60 : 10));
  assert(diagB.filter((d) => d.phase === 'retry').length === 1, `${diagB.filter((d) => d.phase === 'retry').length} retries, want exactly 1`);
  assert(b.getState().gateFires === 1, `fires ${b.getState().gateFires}, want 1 (gate 0 after the re-seed)`);
});

test('virgin-cycle21 01: L8 idle auto-start (a headless relaunch feed with no start) has no reference', () => {
  const engine = new LiveEngine([SYN_S, SYN_L]);
  const states = ride21(engine, 0, 500);
  const st = states[states.length - 1];
  assert(st.track === null && st.phase === 'detecting' && st.gateFires === 0, `track ${st.track}, phase ${st.phase}, fires ${st.gateFires}`);
});

test('virgin-cycle21 01: L9 a picked short route scores its lap at its own FINISH — no 400 m evidence rule any more', () => {
  const SYN_SHORT: TrackSpec = {
    id: 'SyntheticShort', ref: buildSyntheticRef([[0, 0], [405, 0]]), gates: [50, 150, 250, 350],
  };
  const engine = new LiveEngine([SYN_SHORT]);
  engine.start({ pickId: 'SyntheticShort' });
  ride21(engine, 0, 360);
  const mid = engine.getState();
  assert(mid.track === 'SyntheticShort' && mid.phase === 'finished' && mid.lap !== null,
    `track ${mid.track}, phase ${mid.phase}, lap ${JSON.stringify(mid.lap)}`);
  assert(mid.sectors.length === 3 && mid.sectors.every((x) => x.kind === 'done'), `sectors ${mid.sectors.map((x) => x.kind)}`);
  engine.finalize();
  assert(engine.getState().track === 'SyntheticShort', 'finalize unmatched a finished ride');
});

// ------------------------------------------------ virgin-cycle26 brief 02
// Loops and retraced ground (plan 05 D15). LOOP: a closed 1000 x 600 m
// rectangle, start vertex = end vertex (Home to Home). OB (out-and-back):
// 300 m east along a street at y = 0, a 1400 m block, 700 m back west along
// the same street on the OTHER side (y = -4) — the realistic case where the
// return copy is a few metres beside the outbound copy and exact vertex ties
// no longer rescue a nearest-vertex pick. OB_LONG: a 600 m street and a 1000 m
// return, for the re-acquisition case (the rejoin must lie > 240 m ahead of
// the projector's window). Arc lengths are along the WAYPOINT polyline; stored
// chainages fall up to ~1.5 m short per corner between two 5 m samples.
const LOOP_REF = buildSyntheticRef([[0, 0], [1000, 0], [1000, 600], [0, 600], [0, 0]]);
const LOOP_GATES = [32, 800, 1600, 2400, 3168];
const LOOP_SPEC: TrackSpec = { id: 'Loop', ref: LOOP_REF, gates: LOOP_GATES };
function loopPos(s: number): [number, number] {
  if (s < 1000) return [s, 0];
  if (s < 1600) return [1000, s - 1000];
  if (s < 2600) return [1000 - (s - 1600), 600];
  return [0, 600 - (s - 2600)];
}
const OB_REF = buildSyntheticRef([[0, 0], [300, 0], [300, 400], [700, 400], [700, -4], [0, -4]]);
const OB_GATES = [22, 551, 1102, 1653, 2160];
const OB_SPEC: TrackSpec = { id: 'OutAndBack', ref: OB_REF, gates: OB_GATES };
function obPos(s: number): [number, number] {
  if (s < 300) return [s, 0];
  if (s < 700) return [300, s - 300];
  if (s < 1100) return [300 + (s - 700), 400];
  if (s < 1504) return [700, 400 - (s - 1100)];
  return [700 - (s - 1504), -4];
}
const OB_LONG_REF = buildSyntheticRef([[0, 0], [600, 0], [600, 400], [1000, 400], [1000, -4], [0, -4]]);
function obLongPos(s: number): [number, number] {
  if (s < 600) return [s, 0];
  if (s < 1000) return [600, s - 600];
  if (s < 1400) return [600 + (s - 1000), 400];
  if (s < 1804) return [1000, 400 - (s - 1400)];
  return [1000 - (s - 1804), -4];
}
function feedXY(engine: InstanceType<typeof LiveEngine>, x: number, y: number, tSec: number): void {
  const [lat, lon] = xyToLatLon(x, y, 0, 0);
  engine.feed(lat, lon, tSec * 1000);
}
/** The LOOP ride: first fix 4 m north of Home (1 m from the loop's LAST vertex (0, 5),
 * 4 m from its first), then 5 m/s around the loop. Returns planar xs/ys and seconds. */
function loopRide(t0: number): { xs: number[]; ys: number[]; ts: number[] } {
  const xs = [0]; const ys = [4]; const ts = [t0];
  for (let s = 5; s <= 3195; s += 5) { const [x, y] = loopPos(s); xs.push(x); ys.push(y); ts.push(t0 + s / 5); }
  return { xs, ys, ts };
}
/** The OB ride: first fix (15, -3) — 1.4 m from the return copy's (14, -4), 3 m from
 * the outbound (15, 0) — then 5 m/s out and back. */
function obRide(t0: number): { xs: number[]; ys: number[]; ts: number[] } {
  const xs = [15]; const ys = [-3]; const ts = [t0];
  for (let s = 20; s <= 2200; s += 5) { const [x, y] = obPos(s); xs.push(x); ys.push(y); ts.push(t0 + (s - 15) / 5); }
  return { xs, ys, ts };
}
type GateEvt = Extract<EngineEvent, { type: 'gate' }>;
function runEngine(spec: TrackSpec, ride: { xs: number[]; ys: number[]; ts: number[] }): { gates: GateEvt[]; first: LiveEngineState; final: LiveEngineState } {
  const engine = new LiveEngine([spec]);
  const evts: EngineEvent[] = [];
  const unsub = engine.subscribeEvents((e) => evts.push(e));
  engine.start({ pickId: spec.id });
  feedXY(engine, ride.xs[0], ride.ys[0], ride.ts[0]);
  const first = engine.getState();
  for (let i = 1; i < ride.xs.length; i++) feedXY(engine, ride.xs[i], ride.ys[i], ride.ts[i]);
  unsub();
  return { gates: evts.filter((e): e is GateEvt => e.type === 'gate'), first, final: engine.getState() };
}

test('virgin-cycle26 02: passVertex equals nearestVertex on a single-pass line and inside a short hairpin', () => {
  for (const [x, y] of [[1000, 10], [2990, -20], [-50, 0], [1500, 39]] as [number, number][]) {
    const a = passVertex(x, y, SYN_L.ref);
    const b = nearestVertex(x, y, SYN_L.ref);
    assert(a.index === b.index && numEq(a.dist, b.dist, 1e-9), `single pass at (${x},${y}): pass ${a.index} vs nearest ${b.index}`);
  }
  // 100 m legs 10 m apart joined by a 10 m connector: candidates 10 m apart in
  // chainage across the hairpin => one pass => nearest wins, as before.
  const hairpin = buildSyntheticRef([[0, 0], [100, 0], [100, 10], [0, 10]]);
  const a = passVertex(50, 8, hairpin);
  const b = nearestVertex(50, 8, hairpin);
  assert(a.index === b.index, `hairpin < PASS_GAP_M (${PASS_GAP_M}) must stay one pass: ${a.index} vs ${b.index}`);
  assert(hairpin.ch[a.index] > 100, `expected the return leg (ch > 100), got ch ${hairpin.ch[a.index]}`);
  const none = passVertex(50, 8, hairpin, 500, 600);
  assert(none.index === -1 && none.dist === Infinity, 'empty range must mirror nearestVertex');
});

test('virgin-cycle26 02: passVertex takes the earliest pass by default and the pass nearest `nearS` when given', () => {
  const near = nearestVertex(15, -3, OB_REF);
  assert(near.index === OB_REF.rx.length - 3 && OB_REF.ch[near.index] > 2100, `precondition: nearest is the return copy, got index ${near.index} (ch ${OB_REF.ch[near.index]}) of ${OB_REF.rx.length}`);
  const first = passVertex(15, -3, OB_REF);
  assert(first.index === 3 && numEq(OB_REF.ch[first.index], 15, 1e-6), `earliest pass expected index 3 (ch 15), got ${first.index} (ch ${OB_REF.ch[first.index]})`);
  assert(numEq(first.dist, 3, 1e-9), `dist to (15,0) must be 3, got ${first.dist}`);
  const ctx = passVertex(100, 1, OB_LONG_REF, -Infinity, Infinity, 2300);
  assert(OB_LONG_REF.ch[ctx.index] > 2600, `nearS=2300 must pick the return pass (ch > 2600), got ch ${OB_LONG_REF.ch[ctx.index]}`);
  const noCtx = passVertex(100, 1, OB_LONG_REF);
  assert(numEq(OB_LONG_REF.ch[noCtx.index], 100, 1e-6), `no context => earliest pass (ch 100), got ${OB_LONG_REF.ch[noCtx.index]}`);
  // Range restriction is honoured before the pass split (live re-acq shape):
  // within [2300, 2500] the return copy is 200+ m east of (100, 1), so the
  // pick is far outside the corridor (live re-acq rejects it, as today).
  const ahead = passVertex(100, 1, OB_LONG_REF, 2300, 2500, 2300);
  assert(ahead.index >= 0 && ahead.dist > 150, `within [2300, 2500] expected a far vertex (dist > 150), got index ${ahead.index} dist ${ahead.dist}`);
  const ahead2 = passVertex(100, 1, OB_LONG_REF, 2300, 2300 + 6000, 2300);
  assert(OB_LONG_REF.ch[ahead2.index] > 2600, `a wide forward range finds the return pass only, got ch ${OB_LONG_REF.ch[ahead2.index]}`);
});

test('virgin-cycle26 02: a Home-to-Home loop whose first fix sits nearer the END vertex does not FINISH at t = 0 and scores a full lap', () => {
  const t0 = 1759860000;
  const { gates, first, final } = runEngine(LOOP_SPEC, loopRide(t0));
  assert(first.phase === 'locked' && first.gateFires === 0 && first.lap === null,
    `first fix: phase ${first.phase}, gateFires ${first.gateFires}, lap ${JSON.stringify(first.lap)} — a FINISH at t=0 means the anchor landed on the end vertex`);
  assert(first.chainageM !== null && first.chainageM < 30, `anchor chainage ${first.chainageM}, want < 30 (earliest pass)`);
  assert(gates.length === 5 && gates.map((g) => g.gateIndex).join(',') === '0,1,2,3,4', `gate events ${JSON.stringify(gates.map((g) => [g.gateIndex, g.t - t0, g.estimated]))}`);
  assert(gates.every((g) => !g.estimated), `estimated gate events: ${JSON.stringify(gates.filter((g) => g.estimated))}`);
  assert(numEq(gates[0].t, t0 + 6.4, 0.05), `START at ${gates[0].t - t0} s, want 6.4`);
  assert(final.phase === 'finished' && final.lap !== null && final.lap.rawS !== null && numEq(final.lap.rawS, 627.2, 5),
    `phase ${final.phase}, lap ${JSON.stringify(final.lap)} — want finished, rawS ≈ 627 s`);
  assert(final.chainageM !== null && final.chainageM > 3168, `final chainage ${final.chainageM}, want past FINISH`);
});

test('virgin-cycle26 02: an out-and-back whose first fix sits nearer the RETURN copy anchors on the outbound pass and fires every gate once, in order', () => {
  const t0 = 1759860000;
  const { gates, first, final } = runEngine(OB_SPEC, obRide(t0));
  assert(first.phase === 'locked' && first.gateFires === 0,
    `first fix: phase ${first.phase}, gateFires ${first.gateFires} — a fire here means FINISH armed on the return copy`);
  assert(first.chainageM !== null && first.chainageM < 30, `anchor chainage ${first.chainageM}, want ≈ 15`);
  assert(gates.length === 5, `${gates.length} gate events, want 5: ${JSON.stringify(gates)}`);
  assert(gates.map((g) => g.gateIndex).join(',') === '0,1,2,3,4', `order ${gates.map((g) => g.gateIndex)}`);
  assert(gates.every((g) => !g.estimated), `estimated fires: ${JSON.stringify(gates.filter((g) => g.estimated))}`);
  assert(numEq(gates[0].t, t0 + 1.4, 0.05), `START at ${gates[0].t - t0} s, want 1.4`);
  for (let i = 1; i < gates.length; i++) assert(gates[i].t > gates[i - 1].t, 'gate times must increase');
  assert(final.phase === 'finished' && final.lap !== null && final.lap.rawS !== null && numEq(final.lap.rawS, 427.8, 5),
    `lap ${JSON.stringify(final.lap)} — want rawS ≈ 428 s`);
});

test('virgin-cycle26 02: a single-pass reference ridden from its far end still fires nothing (far-end anchor unchanged)', () => {
  // The existing far-end rule (live: 2026-09-01 ride 2) must survive: a rider
  // who starts at the far end of a single-pass line is still anchored there.
  const engine = new LiveEngine([SYN_L]);
  engine.start({ pickId: 'SyntheticL' });
  let t = 1759860000;
  for (let s = 3000; s >= 0; s -= 5) {
    feedXY(engine, s, 0, t);
    t += 1;
  }
  const st = engine.getState();
  assert(st.gateFires === 0 && st.chainageM !== null && st.chainageM >= 2995, `gateFires ${st.gateFires}, chainage ${st.chainageM}`);
});

test('virgin-cycle26 02: projectRideOffline anchors an out-and-back on the outbound pass and never runs backwards along the street', () => {
  const ride = obRide(0);
  const { s } = projectRideOffline(ride.xs, ride.ys, OB_REF);
  assert(s[0] < 30, `offline anchor at chainage ${s[0]}, want < 30 (earliest pass)`);
  let minStep = Infinity;
  for (let i = 1; i < s.length; i++) minStep = Math.min(minStep, s[i] - s[i - 1]);
  assert(minStep > -3, `offline chainage ran backwards by ${-minStep} m somewhere`);
  assert(s[s.length - 1] > 2150, `offline end chainage ${s[s.length - 1]}, want past FINISH`);
});

test('virgin-cycle26 02: offline re-acquisition after a detour rejoins the pass the rider was on, not the nearer copy', () => {
  // Out along a 600 m street, around the block, back on the other side to
  // x = 500 (arc 2304); then 8 fixes 66 m south of the street (off-corridor,
  // so re-acquisition is attempted from the 5th on and finds nothing within
  // 40 m), then a rejoin at (100, 1) — 1 m from the OUTBOUND copy, 5 m from
  // the return copy, and > 240 m ahead of the projector's window.
  const xs: number[] = [];
  const ys: number[] = [];
  for (let s = 15; s <= 2305; s += 5) { const [x, y] = obLongPos(s); xs.push(x); ys.push(y); }
  for (let x = 450; x >= 100; x -= 50) { xs.push(x); ys.push(-70); }
  const rejoin = xs.length;
  xs.push(100); ys.push(1);
  for (let x = 95; x >= 0; x -= 5) { xs.push(x); ys.push(-4); }
  const { s } = projectRideOffline(xs, ys, OB_LONG_REF);
  assert(s[rejoin - 1] > 2250 && s[rejoin - 1] < 2320, `pre-detour chainage ${s[rejoin - 1]}, want ≈ 2300`);
  assert(s[rejoin] > 2600, `rejoin chainage ${s[rejoin]}, want the return pass (> 2600) — ${s[rejoin] < 200 ? 'fell back onto the outbound copy' : 'unexpected'}`);
  assert(s[s.length - 1] > 2750, `end chainage ${s[s.length - 1]}, want ≈ 2794`);
});

test('virgin-cycle26 02: live gate events and offline crossTime agree on a loop and on an out-and-back (results, selfs and replay see the same pass as the live ride)', () => {
  const t0 = 1759860000;
  for (const [spec, ride, gatesM] of [[LOOP_SPEC, loopRide(t0), LOOP_GATES], [OB_SPEC, obRide(t0), OB_GATES]] as [TrackSpec, ReturnType<typeof loopRide>, number[]][]) {
    const live = runEngine(spec, ride).gates;
    const { s } = projectRideOffline(ride.xs, ride.ys, spec.ref);
    assert(live.length === gatesM.length, `${spec.id}: ${live.length} live gate events`);
    for (let i = 0; i < gatesM.length; i++) {
      const off = crossTime(ride.ts, s, gatesM[i]);
      assert(off !== null, `${spec.id}: offline never crossed gate ${i} (chainage ${gatesM[i]})`);
      assert(numEq(off, live[i].t, 2), `${spec.id} gate ${i}: offline ${off - t0} s vs live ${live[i].t - t0} s`);
    }
  }
});


// ------------------------------------------------ virgin-cycle26 brief 05
// Parallel streets one block apart (PAR: out along y = 0, back along y = 44,
// 44 m apart; WIDE: 72 m apart). Both passes of PAR lie inside one corridor
// (40 m) of a rider standing between them, so a pass pick that ignores how
// much nearer one of them is can hand the caller a vertex it then rejects
// as off-route, or project the return leg backwards along the outbound one.
const PAR_REF = buildSyntheticRef([[0, 0], [1000, 0], [1000, 44], [0, 44]]);
const PAR_L = PAR_REF.ch[PAR_REF.ch.length - 1];
const PAR_GATES = [20, 500, 1000, 1500, 2020];
const PAR_SPEC: TrackSpec = { id: 'Parallel', ref: PAR_REF, gates: PAR_GATES };
const WIDE_REF = buildSyntheticRef([[0, 0], [1000, 0], [1000, 72], [0, 72]]);
/** Anchor at (0, 0), a GPS gap, then the rider reappears on the RETURN street
 * at (600, yReturn) and rides it west to x = 0 at 5 m/s. */
function parRide(t0: number, yReturn: number): { xs: number[]; ys: number[]; ts: number[] } {
  const xs = [0]; const ys = [0]; const ts = [t0];
  for (let x = 600; x >= 0; x -= 5) { xs.push(x); ys.push(yReturn); ts.push(t0 + 100 + (600 - x) / 5); }
  return { xs, ys, ts };
}

test('virgin-cycle26 05: passVertex never prefers a pass the caller would reject over one it accepts, and a pass > PASS_AMBIGUITY_M further away than the nearest is not a candidate', () => {
  assert(PAR_L > 2030 && PAR_L < 2045, `PAR length ${PAR_L}`);
  // (500, 42): 2 m from the return street (ch ~1544), 42 m from the outbound one (ch 500).
  for (const [sLo, sHi, nearS] of [[0, 3000, 0], [-Infinity, Infinity, 0], [-Infinity, Infinity, -Infinity]] as [number, number, number][]) {
    const p = passVertex(500, 42, PAR_REF, sLo, sHi, nearS);
    assert(PAR_REF.ch[p.index] > 1500 && p.dist < 3, `(500,42) [${sLo},${sHi}] nearS ${nearS}: ch ${PAR_REF.ch[p.index]} dist ${p.dist} -- want the return street (ch ~1544, 2 m)`);
  }
  // (500, 30) and (500, 39): 14 / 9 m from the return street, 30 / 39 m from the
  // outbound one -- both inside the corridor, but one is clearly where the rider is.
  for (const y of [30, 39]) {
    const p = passVertex(500, y, PAR_REF, -Infinity, Infinity, 0);
    assert(PAR_REF.ch[p.index] > 1500, `(500,${y}) nearS 0: ch ${PAR_REF.ch[p.index]} -- want the return street`);
  }
  // Ambiguity band: 1 m vs 5 m IS ambiguous (the two sides of one street), so the
  // chainage context decides -- the brief 02 rule, unchanged.
  const ctx = passVertex(100, 1, OB_LONG_REF, -Infinity, Infinity, 2300);
  assert(OB_LONG_REF.ch[ctx.index] > 2600, `1 m vs 5 m stays ambiguous: nearS 2300 must pick the return pass, got ch ${OB_LONG_REF.ch[ctx.index]}`);
  assert(PASS_AMBIGUITY_M >= 10 && PASS_AMBIGUITY_M < 30, `PASS_AMBIGUITY_M ${PASS_AMBIGUITY_M}: wider than one street, narrower than a block`);
  // Cap at the caller's acceptance distance: (500, 30) on WIDE is 30 m from the
  // outbound street (ch 500) and 42 m from the return one (ch ~1572). Even with
  // the context on the return side, the pick must be the one the caller accepts.
  const cap = passVertex(500, 30, WIDE_REF, -Infinity, Infinity, 1572);
  assert(cap.dist <= CORRIDOR_M && WIDE_REF.ch[cap.index] < 600, `cap: ch ${WIDE_REF.ch[cap.index]} dist ${cap.dist} -- want the outbound street (30 m, inside the corridor)`);
  const capNarrow = passVertex(500, 30, WIDE_REF, -Infinity, Infinity, 1572, 60);
  assert(WIDE_REF.ch[capNarrow.index] > 1500, `with a 60 m acceptance both are acceptable and the context wins: got ch ${WIDE_REF.ch[capNarrow.index]}`);
  // Nothing acceptable: the nearest vertex comes back (the caller rejects it, as before).
  const far = passVertex(500, 200, PAR_REF, -Infinity, Infinity, 0);
  assert(far.index >= 0 && far.dist > 150, `far fix: dist ${far.dist}`);
  const single = passVertex(1500, 20, SYN_L.ref, -Infinity, Infinity, 0, 10);
  const singleN = nearestVertex(1500, 20, SYN_L.ref);
  assert(single.index === singleN.index && numEq(single.dist, singleN.dist, 1e-9), 'single pass, nearest outside a 10 m acceptance: still nearestVertex');
});

test('virgin-cycle26 05: equal pass scores keep the EARLIER pass (strict <), and a hand-built two-pass line resolves by chainage context', () => {
  // Hand-built reference (no resampling, exact chainages): outbound x = 0..100
  // along y = 0 (ch 0..100), a connector far away (ch 105..400), return
  // x = 100..0 along y = -4 (ch 405..505). Fix (50, -1): 1 m from ch 50, 3 m
  // from ch 455 -- ambiguous. nearS exactly midway (252.5) ties the scores.
  const xs: number[] = []; const ys: number[] = []; const chs: number[] = [];
  for (let x = 0; x <= 100; x += 5) { xs.push(x); ys.push(0); chs.push(x); }
  for (let c = 105; c <= 400; c += 5) { xs.push(1000 + c); ys.push(1000); chs.push(c); }
  for (let x = 100; x >= 0; x -= 5) { xs.push(x); ys.push(-4); chs.push(405 + (100 - x)); }
  const ref: RefLine = { rx: Float64Array.from(xs), ry: Float64Array.from(ys), ch: Float64Array.from(chs), lat0: 0, lon0: 0, length: 505 };
  const tie = passVertex(50, -1, ref, -Infinity, Infinity, 252.5);
  assert(ref.ch[tie.index] === 50 && tie.dist === 1, `tie: ch ${ref.ch[tie.index]} dist ${tie.dist} -- equal scores must keep the earlier pass`);
  const later = passVertex(50, -1, ref, -Infinity, Infinity, 252.6);
  assert(ref.ch[later.index] === 455 && tie.dist === 1 && later.dist === 3, `nearS 252.6: ch ${ref.ch[later.index]} -- the return pass`);
  const earlier = passVertex(50, -1, ref, -Infinity, Infinity, 252.4);
  assert(ref.ch[earlier.index] === 50, `nearS 252.4: ch ${ref.ch[earlier.index]}`);
  const none = passVertex(50, -1, ref);
  assert(ref.ch[none.index] === 50, 'no context: earliest');
  const nv = nearestVertex(50, -1, ref);
  assert(ref.ch[nv.index] === 50 && nv.dist === 1, 'precondition: nearestVertex is the outbound vertex');
});

test('virgin-cycle26 05: live re-acquisition after a GPS gap lands on the parallel return street the rider is on, offline too, and both finish the lap', () => {
  for (const y of [42, 30]) {
    // core LiveProjector directly (the live.ts re-acquisition call site)
    const lp = new LiveProjector(PAR_REF);
    const ride = parRide(0, y);
    let first = lp.update(ride.xs[0], ride.ys[0], ride.ts[0]);
    assert(first.onRoute && first.s < 5, `y=${y}: anchor s ${first.s} onRoute ${first.onRoute}`);
    let firstOnX = -1; let last = first;
    for (let i = 1; i < ride.xs.length; i++) {
      last = lp.update(ride.xs[i], ride.ys[i], ride.ts[i]);
      if (last.onRoute && firstOnX < 0) firstOnX = ride.xs[i];
    }
    assert(firstOnX >= 570, `y=${y}: first on-route fix at x = ${firstOnX} (want >= 570: re-acquired at the 5th fix after the gap, not never)`);
    assert(last.onRoute && last.s > PAR_L - 10, `y=${y}: live final s ${last.s} onRoute ${last.onRoute}, want ~${PAR_L}`);
    // offline projector: same ride, no backwards run along the outbound street
    const { s } = projectRideOffline(ride.xs, ride.ys, PAR_REF);
    assert(s[0] < 5, `y=${y}: offline anchor ${s[0]}`);
    let minStep = Infinity;
    for (let i = 2; i < s.length; i++) minStep = Math.min(minStep, s[i] - s[i - 1]);
    assert(minStep > -3, `y=${y}: offline ran backwards by ${-minStep} m along the return leg`);
    assert(s[s.length - 1] > PAR_L - 10, `y=${y}: offline end s ${s[s.length - 1]}, want ~${PAR_L}`);
  }
});

test('virgin-cycle26 05: the LiveEngine scores a parallel-street lap after a GPS gap -- gates fire in order and FINISH is real', () => {
  const t0 = 1759860000;
  const { gates, final } = runEngine(PAR_SPEC, parRide(t0, 42));
  assert(gates.map((g) => g.gateIndex).join(',') === '0,1,2,3,4', `gate events ${JSON.stringify(gates.map((g) => [g.gateIndex, g.t - t0, g.estimated]))}`);
  assert(gates[3].estimated === false && gates[4].estimated === false, `G3 / FINISH must be real crossings on the return street: ${JSON.stringify(gates.slice(3))}`);
  assert(final.phase === 'finished' && final.chainageM !== null && final.chainageM > PAR_L - 10, `phase ${final.phase}, chainage ${final.chainageM}`);
});


test('virgin-cycle26 05: live re-acquisition on a retraced street stays on the pass the rider was on when GPS puts them nearer the other side', () => {
  // OB_LONG street: outbound y = 0 (600 m), return y = -4. Out to x = 100
  // (sp ~ 100), then a 200 s GPS gap 70 m south (8 off-corridor fixes:
  // re-acquisition is tried from the 5th and finds nothing within 40 m; the
  // time-aware bound grows to 15 m/s x 200 s = 3000 m, so [sp, sp + bound]
  // spans BOTH passes), then the rider reappears at (450, -3): 1 m from the
  // RETURN copy (ch ~2354), 3 m from the outbound one (ch 450), and > 240 m
  // ahead of the window, so only re-acquisition can place it. Still outbound:
  // the pick must be ch 450 (the pass nearest the chainage the rider had).
  const xs: number[] = []; const ys: number[] = []; const ts: number[] = [];
  for (let x = 0; x <= 100; x += 5) { xs.push(x); ys.push(0); ts.push(x / 5); }
  for (let k = 1; k <= 8; k++) { xs.push(100 + 40 * k); ys.push(-70); ts.push(20 + k * 25); }
  const rejoin = xs.length;
  for (let x = 450; x <= 600; x += 5) { xs.push(x); ys.push(x === 450 ? -3 : 0); ts.push(220 + (x - 450) / 5); }
  const lp = new LiveProjector(OB_LONG_REF);
  const ss: number[] = [];
  for (let i = 0; i < xs.length; i++) ss.push(lp.update(xs[i], ys[i], ts[i]).s);
  assert(ss[rejoin - 1] > 95 && ss[rejoin - 1] < 105, `pre-gap chainage ${ss[rejoin - 1]}, want ~100`);
  assert(ss[rejoin] > 445 && ss[rejoin] < 455, `live rejoin chainage ${ss[rejoin]}, want ~450 (outbound) -- ${ss[rejoin] > 2000 ? 'jumped onto the return copy' : ss[rejoin] < 105 ? 'never re-acquired' : 'unexpected'}`);
  assert(ss[ss.length - 1] > 595 && ss[ss.length - 1] < 605, `end chainage ${ss[ss.length - 1]}, want ~600`);
  // offline: the same ride, the same answer
  const { s } = projectRideOffline(xs, ys, OB_LONG_REF);
  assert(s[rejoin] > 445 && s[rejoin] < 455, `offline rejoin chainage ${s[rejoin]}, want ~450`);
  assert(s[s.length - 1] > 595 && s[s.length - 1] < 605, `offline end chainage ${s[s.length - 1]}`);
});


// ------------------------------------------------ virgin-cycle26 brief 06
// A loop reference whose closing vertex is G m from its opening one (a ride
// whose first fixes settled 25 / 40 m from where it ended), and a wide road
// whose return copy is 22 m from the outbound one. The START pick is the
// rider's one reference (virgin-cycle21): the first fix is taken AT the start,
// so with no chainage context the EARLIEST pass inside the corridor is the
// anchor, however much nearer a later pass is (forward-only projection catches
// up from a too-early guess, never from a too-late one). The 15 m band of
// brief 05 is for re-acquisition, where the rider's last chainage is a guess.
function gapLoopRef(gapM: number): RefLine {
  return buildSyntheticRef([[0, 0], [1000, 0], [1000, 600], [0, 600], [0, gapM]]);
}
/** The gap loop ridden from its CLOSING point (0, gapM): first fix there, then
 * 5 m/s around the loop. */
function gapLoopRide(t0: number, gapM: number): { xs: number[]; ys: number[]; ts: number[] } {
  const xs = [0]; const ys = [gapM]; const ts = [t0];
  for (let s = 5; s <= 3195; s += 5) { const [x, y] = loopPos(s); xs.push(x); ys.push(y); ts.push(t0 + s / 5); }
  return { xs, ys, ts };
}
const WIDE_ROAD_REF = buildSyntheticRef([[0, 0], [600, 0], [600, 400], [1000, 400], [1000, -22], [0, -22]]);
const WIDE_ROAD_L = WIDE_ROAD_REF.ch[WIDE_ROAD_REF.ch.length - 1];
/** Out along y = 0, around the block, back along y = -22; the first fix is at
 * the START with a 20 m GPS error toward the return side: (5, -20) is 2 m
 * from the return copy and 20 m from the outbound one -- more than the 15 m
 * band, so only the no-context corridor band keeps the outbound copy. */
function wideRoadRide(t0: number): { xs: number[]; ys: number[]; ts: number[] } {
  const xs = [5]; const ys = [-20]; const ts = [t0];
  for (let s = 10; s <= 2822; s += 5) {
    const [x, y] = s < 600 ? [s, 0] : s < 1000 ? [600, s - 600] : s < 1400 ? [600 + (s - 1000), 400] : s < 1822 ? [1000, 400 - (s - 1400)] : [1000 - (s - 1822), -22];
    xs.push(x); ys.push(y); ts.push(t0 + s / 5);
  }
  return { xs, ys, ts };
}

test('virgin-cycle26 06: with no chainage context passVertex takes the earliest pass anywhere inside the corridor; with context the 15 m band still applies', () => {
  for (const gap of [25, 40]) {
    const ref = gapLoopRef(gap);
    const L = ref.ch[ref.ch.length - 1];
    const near = nearestVertex(0, gap, ref);
    assert(ref.ch[near.index] > L - 10 && near.dist < 6, `precondition G=${gap}: nearest is the closing vertex (within one 5 m sample), got ch ${ref.ch[near.index]} dist ${near.dist}`);
    const anchor = passVertex(0, gap, ref, -Infinity, Infinity, -Infinity, CORRIDOR_M);
    assert(anchor.index === 0 && numEq(anchor.dist, gap, 1e-6), `G=${gap} first fix at the closing point: ch ${ref.ch[anchor.index]} dist ${anchor.dist} -- want the opening vertex (ch 0, ${gap} m)`);
    const reacq = passVertex(0, gap, ref, -Infinity, Infinity, L - 100, CORRIDOR_M);
    assert(ref.ch[reacq.index] > L - 10, `G=${gap} re-acquisition near the end: ch ${ref.ch[reacq.index]} -- the 15 m band keeps the closing pass`);
    const reacqEarly = passVertex(0, gap, ref, -Infinity, Infinity, 100, CORRIDOR_M);
    assert(ref.ch[reacqEarly.index] > L - 10, `G=${gap} re-acquisition with an early context: ch ${ref.ch[reacqEarly.index]} -- ${gap} m further away is outside the 15 m band, context cannot override it`);
  }
  // The corridor is the limit: a closing vertex 45 m from the opening one is
  // not the same place by the app's own measure, so the nearest pass stands.
  const far = gapLoopRef(45);
  const farAnchor = passVertex(0, 45, far, -Infinity, Infinity, -Infinity, CORRIDOR_M);
  assert(far.ch[farAnchor.index] > far.ch[far.ch.length - 1] - 10, `G=45: ch ${far.ch[farAnchor.index]} -- outside the corridor the earliest pass is not a candidate`);
  // Wide road, first fix 20 m toward the return side (2 m from it): outbound.
  const wide = passVertex(5, -20, WIDE_ROAD_REF, -Infinity, Infinity, -Infinity, CORRIDOR_M);
  assert(WIDE_ROAD_REF.ch[wide.index] < 30 && numEq(wide.dist, 20, 1e-6), `wide road first fix: ch ${WIDE_ROAD_REF.ch[wide.index]} dist ${wide.dist} -- want the outbound copy (ch ~5, 20 m)`);
  // Parallel streets (brief 05 fixture), no context: (500, 30) is 30 m from the
  // outbound copy and 14 m from the return one -- both inside the corridor, so
  // the earliest pass is the anchor; (500, 42) leaves the outbound copy outside
  // the corridor cap and the return copy is the only candidate (brief 05).
  const between = passVertex(500, 30, PAR_REF, -Infinity, Infinity, -Infinity, CORRIDOR_M);
  assert(PAR_REF.ch[between.index] < 600 && numEq(between.dist, 30, 1e-6), `(500,30) no context: ch ${PAR_REF.ch[between.index]} dist ${between.dist} -- want the outbound copy`);
  const capped = passVertex(500, 42, PAR_REF, -Infinity, Infinity, -Infinity, CORRIDOR_M);
  assert(PAR_REF.ch[capped.index] > 1500, `(500,42) no context: ch ${PAR_REF.ch[capped.index]} -- the cap at the corridor still holds`);
  // A tighter acceptance caps the no-context band too.
  const narrow = passVertex(0, 25, gapLoopRef(25), -Infinity, Infinity, -Infinity, 20);
  assert(gapLoopRef(25).ch[narrow.index] > 3100, `within = 20: ch ${gapLoopRef(25).ch[narrow.index]} -- the opening vertex at 25 m is outside the acceptance`);
});

test('virgin-cycle26 06: a loop closing 25 / 40 m from its start, ridden from the closing point, anchors at the start live and offline and fires all five gates', () => {
  const t0 = 1759860000;
  for (const gap of [25, 40]) {
    const ref = gapLoopRef(gap);
    const L = ref.ch[ref.ch.length - 1];
    const gatesM = [32, 800, 1600, 2400, L - 27];
    const ride = gapLoopRide(t0, gap);
    const lp = new LiveProjector(ref);
    const first = lp.update(ride.xs[0], ride.ys[0], ride.ts[0]);
    assert(first.s < 1, `G=${gap}: LiveProjector anchor s ${first.s}, want 0 (the opening vertex)`);
    let last = first;
    for (let i = 1; i < ride.xs.length; i++) last = lp.update(ride.xs[i], ride.ys[i], ride.ts[i]);
    assert(last.onRoute && last.s > L - 10, `G=${gap}: live final s ${last.s}, want ~${L}`);
    const { s } = projectRideOffline(ride.xs, ride.ys, ref);
    assert(s[0] < 1, `G=${gap}: offline anchor s ${s[0]}, want 0`);
    assert(s[s.length - 1] > L - 10, `G=${gap}: offline end s ${s[s.length - 1]}, want ~${L}`);
    const spec: TrackSpec = { id: `GapLoop${gap}`, ref, gates: gatesM };
    const { gates, first: st0, final } = runEngine(spec, ride);
    assert(st0.chainageM !== null && st0.chainageM < 1, `G=${gap}: engine anchor chainage ${st0.chainageM}, want 0`);
    assert(gates.map((g) => g.gateIndex).join(',') === '0,1,2,3,4', `G=${gap}: gate events ${JSON.stringify(gates.map((g) => [g.gateIndex, g.t - t0, g.estimated]))} -- ${gates.length === 1 && gates[0].gateIndex === 4 ? 'FINISH fired at the first fix, gates 0-3 skipped' : 'unexpected'}`);
    assert(gates.every((g) => !g.estimated), `G=${gap}: estimated fires ${JSON.stringify(gates.filter((g) => g.estimated))}`);
    assert(final.phase === 'finished' && final.chainageM !== null && final.chainageM > L - 10, `G=${gap}: phase ${final.phase}, chainage ${final.chainageM}`);
    for (let i = 0; i < gatesM.length; i++) {
      const off = crossTime(ride.ts, s, gatesM[i]);
      assert(off !== null && numEq(off, gates[i].t, 2), `G=${gap} gate ${i}: offline ${off === null ? 'never' : off - t0} vs live ${gates[i].t - t0}`);
    }
  }
});

test('virgin-cycle26 06: a wide road (return copy 22 m away) started with a 20 m GPS error toward the return side anchors on the outbound copy live, offline and in the LiveEngine', () => {
  const t0 = 1759860000;
  const ride = wideRoadRide(t0);
  const lp = new LiveProjector(WIDE_ROAD_REF);
  const first = lp.update(ride.xs[0], ride.ys[0], ride.ts[0]);
  assert(first.s < 30, `LiveProjector anchor s ${first.s}, want ~5 (outbound)`);
  let last = first;
  for (let i = 1; i < ride.xs.length; i++) last = lp.update(ride.xs[i], ride.ys[i], ride.ts[i]);
  assert(last.onRoute && last.s > WIDE_ROAD_L - 10, `live final s ${last.s}, want ~${WIDE_ROAD_L}`);
  const { s } = projectRideOffline(ride.xs, ride.ys, WIDE_ROAD_REF);
  assert(s[0] < 30, `offline anchor s ${s[0]}, want ~5`);
  let minStep = Infinity;
  for (let i = 1; i < s.length; i++) minStep = Math.min(minStep, s[i] - s[i - 1]);
  assert(minStep > -3, `offline ran backwards by ${-minStep} m`);
  assert(s[s.length - 1] > WIDE_ROAD_L - 10, `offline end s ${s[s.length - 1]}`);
  const gatesM = [22, 700, 1400, 2100, WIDE_ROAD_L - 25];
  const spec: TrackSpec = { id: 'WideRoad', ref: WIDE_ROAD_REF, gates: gatesM };
  const { gates, first: st0, final } = runEngine(spec, ride);
  assert(st0.chainageM !== null && st0.chainageM < 30, `engine anchor chainage ${st0.chainageM}, want ~5`);
  assert(gates.map((g) => g.gateIndex).join(',') === '0,1,2,3,4' && gates.every((g) => !g.estimated), `gate events ${JSON.stringify(gates.map((g) => [g.gateIndex, g.t - t0, g.estimated]))}`);
  assert(final.phase === 'finished' && final.chainageM !== null && final.chainageM > WIDE_ROAD_L - 10, `phase ${final.phase}, chainage ${final.chainageM}`);
});
