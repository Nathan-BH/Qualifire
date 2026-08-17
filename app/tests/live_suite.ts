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
  test, assert, loadFixture, refFor, numEq, FIXTURES_DIR,
  type Fixture, type SectorRow,
} from './lib.ts';
import { LiveProjector, toXY, parseGpx, type TrackId } from '../core/src/index.ts';
import type { LiveEngineState, LiveSector } from '../src/live/engine.ts';

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
const { LiveEngine, LOCK_MIN_ADVANCE_M, LOCK_MARGIN_M } = await import('../src/live/engine.ts');

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

function drive(f: Fixture, fromIndex = 0): DriveResult {
  const engine = new LiveEngine();
  let lockAt: number | null = null;
  let emits = 0;
  let lastEmitted: LiveEngineState | null = null;
  const unsub = engine.subscribe((s) => {
    emits += 1;
    lastEmitted = s;
    if (lockAt === null && s.track !== null) lockAt = s.fixesFed;
  });
  for (let i = fromIndex; i < f.fixes.t.length; i++) {
    engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  }
  unsub();
  return { engine, final: engine.getState(), lockAt, emits, lastEmitted };
}

/** Candidate-advance replica: same LiveProjector + same refs the engine uses,
 * measured from the first fed fix — mirrors Candidate.adv exactly. */
function advanceAt(f: Fixture, track: TrackId, nFixes: number, fromIndex = 0): number {
  const ref = refFor(track);
  const proj = new LiveProjector(ref);
  let base: number | null = null;
  let adv = 0;
  for (let i = fromIndex; i < fromIndex + nFixes; i++) {
    const xy = toXY([f.fixes.lat[i]], [f.fixes.lon[i]], ref.lat0, ref.lon0);
    const fix = proj.update(xy.x[0], xy.y[0], f.fixes.t[i]);
    if (base === null) base = fix.s;
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
  const engine = new LiveEngine();
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
