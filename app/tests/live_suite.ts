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
