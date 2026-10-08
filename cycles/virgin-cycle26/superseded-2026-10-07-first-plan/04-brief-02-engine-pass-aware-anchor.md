# Brief 02 — Engine: pass-aware anchoring on loops and retraced ground

Written by the Plan tier (Fable) 2026-10-07 ~22:20 UTC from `03-plan.md` (D4-D6, D10, D11) and digests 01/02; every anchor below was read in the working tree at that time (suite baseline `923 tests: 920 pass, 0 fail, 3 skip`, clean `git status`). Executor: Sonnet, alone. Read `EXECUTOR-RULES.md` first, then all of this. This brief touches `app/core` (the parity-proven engine): the edits are exactly the ones listed, nothing more.

## 0. Rules

- **STOP-ON-AMBIGUITY.** Anchor not where quoted (±15 lines, no other plausible match), a test of §5 not behaving as this brief predicts BEFORE or AFTER the edit, or any call not settled here → STOP, write what you found verbatim into `cycles/virgin-cycle26/04-brief-02-executor-report.md` under `## STOPPED`, return.
- **No warnings, no blocks** (Nathan, ruling 1). The engine gets no "loop detected" state, flag or diagnostic string.
- **Rider-facing text: ZERO new strings**; `app/tests/ui-strings.allow.json` must have no diff. (This brief has no UI file at all.)
- **Parity discipline:** `nearestOnSegments`, `GateDetector`, `DEFAULT_LIVE_OPTIONS`, the window arithmetic and `nearestVertex` itself are NOT modified. The five fixture tests in `tests/engine_suite.ts` (`:59-117`: clean / 237 s gap / late lock / detour / wrong direction / mid-ride kill / first-ever) and every existing `tests/live_suite.ts` test must pass UNEDITED. Editing an existing test is forbidden.
- Never delete; no commit; no publish; no dependency; no edits outside §3; `GIT_OPTIONAL_LOCKS=0`. Strip-only TS (no parameter properties, no enums).

## 1. Purpose

When the reference passes the rider's position more than once (a Home-to-Home loop whose end vertex is at the start; an out-and-back street), every place that picks a reference VERTEX without a chainage context chooses "geometrically nearest", which GPS noise turns into a coin toss between passes:

- `core/src/live.ts:84-87` first-fix anchor → on a loop, landing at chainage ≈ L makes `GateDetector` arming (`:146-155`) fire FINISH `estimated` at t = 0 and skip every other gate (digest 02 §3, confirmed by reading);
- `core/src/live.ts:107` D-016(a) forward re-acquisition → with a long time-aware bound both passes can be in range;
- `core/src/projection.ts:87` (offline anchor) and `:111` (offline global re-acquisition) → stored results, the engine's sector rows (`engine.ts:515`), self-dot timing and replay (`store/derive.ts:163`) inherit the same coin toss.

The rule (plan D4): **among the passes within reach, take the one whose chainage is closest to where the rider already is; with no "already" (the first fix) take the earliest.** Forward-only projection then self-corrects a too-early guess as the rider advances and could never undo a too-late one. For a reference that passes the fix once the new pick IS the nearest vertex, so single-pass behaviour is unchanged by construction.

## 2. Verified anchors (working tree 2026-10-07 ~21:50 UTC)

- `app/core/src/projection.ts:12` `export const CORRIDOR_M = 40.0;`; `:55-73` `nearestVertex(px, py, ref, sLo = -Infinity, sHi = Infinity): { index; dist }` (strict `<`, lowest index on ties; `{ index: -1, dist: Infinity }` when nothing in range); `:87` `  let sp = ch[nearestVertex(x[0], y[0], ref).index];`; `:109-112`:
  ```
        if (lost >= 5) {
          // offline re-acquisition: global nearest vertex
          const nv = nearestVertex(x[i], y[i], ref);
          if (nv.dist <= corridor) {
  ```
- `app/core/src/live.ts:29` `import { CORRIDOR_M, nearestOnSegments, nearestVertex } from './projection.ts';`; `:85` `      this.sp = ch[nearestVertex(x, y, this.ref).index];`; `:107` `      const nv = nearestVertex(x, y, this.ref, this.sp, this.sp + bound);`; header comment ends `:25` ` *      never coloured, per D-013).` then `:26` ` */`.
- `app/core/src/index.ts:10` `export * from './projection.ts';` (new exports are re-exported automatically; no edit).
- `app/src/live/engine.ts:68-70` comment `/** Cycle 023 fix 2: a candidate's very first fix seeds LiveProjector's\n * chainage via a GLOBAL nearest-vertex search (no window yet) — …`; `:342-343` comment `    // Cycle 023 fix 2: the FIRST fix anchors the candidate's chainage via a\n    // global nearest-vertex search (core/live.ts LiveProjector) — if that`. Comments only; no code in engine.ts changes.
- `app/tests/live_suite.ts:13-20` imports from `./lib.ts` (`test, assert, loadFixture, refFor, numEq, FIXTURES_DIR, fixtureSpecs, …`) and `:17-20` from `'../core/src/index.ts'`: `GateDetector, LiveProjector, toXY, xyToLatLon, parseGpx, resample, cumdist, type TrackId, type RefLine,`; `:38` `const { LiveEngine, POOR_ACCURACY_M } = await import('../src/live/engine.ts');`; `:620-626` `function buildSyntheticRef(waypoints: [number, number][]): RefLine` (5 m `resample` + `cumdist`, lat0 = lon0 = 0); `:637-642` `SYN_S` / `SYN_L` `TrackSpec`s; `:692` `test('live: hard pick at finalize — …` ; the file ends with a test whose last lines are `engine.finalize();\n  assert(engine.getState().track === 'SyntheticShort', 'finalize unmatched a finished ride');\n});`. `resample` semantics (`core/src/geo.ts:71-83`): `n = ceil(total/step)`, vertex i at arc length `i*step` along the WAYPOINT polyline, so a closed 3 200 m loop gets 640 vertices, the last at arc 3 195 m; **`cumdist` of the resampled points cuts corners, so a stored chainage can be SHORT of the arc length by up to ~1.5 m per 90° corner that falls BETWEEN two 5 m samples (a corner exactly on a sample loses nothing; in the fixtures below only the corners at arc 1 504 / 1 804 m lose ~0.9 m)** — the tolerances in §5 allow for that.
- `app/tests/run.ts:17` `import './live_suite.ts';` already present. **Do not edit `run.ts`.**
- `tests/lib.ts:39` `numEq(a, b, tol)`.

## 3. Files (complete list)

1. `app/core/src/projection.ts` — add `PASS_GAP_M`, `passVertex`; two call-site edits inside `projectRideOffline`.
2. `app/core/src/live.ts` — import line; two call-site edits; one header-comment bullet.
3. `app/src/live/engine.ts` — two comment edits (no code).
4. `app/tests/live_suite.ts` — imports; three synthetic fixtures; seven new tests appended.

## 4. Edits

### 4.1 `core/src/projection.ts` — insert directly AFTER `nearestVertex`'s closing `}` (line 73) and BEFORE the `/**\n * Offline projection of a whole ride` doc comment (line 75)

```ts

/** virgin-cycle26 brief 02: two visits of one reference to the same ground
 * (a Home-to-Home loop closing where it opened, an out-and-back street) are
 * "passes". Candidate vertices further apart than this in chainage belong to
 * different passes; a hairpin shorter than this is one pass (nearest wins, as
 * before). 5 m-resampled vertices inside a ≤ ~85 m disc are ≤ 5 m apart in
 * chainage unless the line leaves and comes back. */
export const PASS_GAP_M = 120;

/**
 * Pass-aware vertex pick (virgin-cycle26 brief 02). Among the vertices with
 * chainage in [sLo, sHi], take those within (nearest distance + CORRIDOR_M)
 * of the fix, split them into passes (consecutive candidates > PASS_GAP_M
 * apart in chainage), and return the nearest vertex OF THE PASS whose
 * chainage is closest to `nearS` — `-Infinity` (the default) = the earliest
 * pass. For a reference that passes the fix once the candidates form one
 * pass and the result is exactly nearestVertex(). Used wherever a vertex is
 * chosen without a window: the live and offline first-fix anchors (earliest
 * pass — the START pick is ridden from its start; forward-only projection can
 * catch up from a too-early guess and never from a too-late one) and both
 * re-acquisitions (nearS = the last chainage: the pass the rider was on).
 */
export function passVertex(
  px: number, py: number, ref: RefLine, sLo = -Infinity, sHi = Infinity, nearS = -Infinity,
): { index: number; dist: number } {
  const near = nearestVertex(px, py, ref, sLo, sHi);
  if (near.index < 0) return near;
  const { rx, ry, ch } = ref;
  const dMax2 = (near.dist + CORRIDOR_M) * (near.dist + CORRIDOR_M);
  let bestIdx = -1;
  let bestScore = Infinity;
  let bestD2 = Infinity;
  let runIdx = -1;
  let runD2 = Infinity;
  let runLastCh = 0;
  const closeRun = (): void => {
    if (runIdx < 0) return;
    const sRun = ch[runIdx];
    const score = nearS === -Infinity ? sRun : Math.abs(sRun - nearS);
    if (score < bestScore) {
      bestScore = score;
      bestIdx = runIdx;
      bestD2 = runD2;
    }
    runIdx = -1;
    runD2 = Infinity;
  };
  for (let k = 0; k < rx.length; k++) {
    if (ch[k] < sLo || ch[k] > sHi) continue;
    const dx = rx[k] - px;
    const dy = ry[k] - py;
    const d2 = dx * dx + dy * dy;
    if (d2 > dMax2) continue;
    if (runIdx >= 0 && ch[k] - runLastCh > PASS_GAP_M) closeRun();
    if (d2 < runD2) {
      runD2 = d2;
      runIdx = k;
    }
    runLastCh = ch[k];
  }
  closeRun();
  return { index: bestIdx, dist: Math.sqrt(bestD2) };
}
```

Then, inside `projectRideOffline`:

- line 87 `  let sp = ch[nearestVertex(x[0], y[0], ref).index];` → `  let sp = ch[passVertex(x[0], y[0], ref).index];`
- lines 110-111:
  ```
          // offline re-acquisition: global nearest vertex
          const nv = nearestVertex(x[i], y[i], ref);
  ```
  →
  ```
          // offline re-acquisition: global, pass-aware (virgin-cycle26 brief 02:
          // the pass nearest the last chainage, so a retraced street does not
          // throw the projection back onto the outbound copy)
          const nv = passVertex(x[i], y[i], ref, -Infinity, Infinity, sp);
  ```

`nearestVertex` stays exported and unchanged (it is still called by `passVertex` and by nothing else in `core/src` after this brief — `grep -n nearestVertex core/src/*.ts` must show only `projection.ts`).

### 4.2 `core/src/live.ts`

- line 29 → `import { CORRIDOR_M, nearestOnSegments, passVertex } from './projection.ts';` (`nearestVertex` is no longer referenced in this file).
- line 85 → `      this.sp = ch[passVertex(x, y, this.ref).index];`
- line 107 → `      const nv = passVertex(x, y, this.ref, this.sp, this.sp + bound, this.sp);`
- header comment: insert after line 25 (` *      never coloured, per D-013).`) and before ` */`:
  ```
   *  (c) virgin-cycle26 brief 02: the first-fix anchor and the re-acquisition
   *      pick their vertex pass-aware (projection.ts passVertex) — on a loop
   *      or a retraced street the rider is anchored on the earliest pass and
   *      re-acquired on the pass nearest the chainage they were on; a
   *      single-pass reference behaves exactly as before.
  ```

### 4.3 `src/live/engine.ts` — comments only

- `:68-69`: `chainage via a GLOBAL nearest-vertex search (no window yet) — a fix this` → `chainage via a GLOBAL pass-aware vertex search (no window yet) — a fix this`
- `:343`: `    // global nearest-vertex search (core/live.ts LiveProjector) — if that` → `    // global pass-aware vertex search (core/live.ts LiveProjector) — if that`

`git diff -- app/src/live/engine.ts` must show exactly these two one-line comment hunks.

### 4.4 `tests/live_suite.ts`

(a) Extend the core import (`:17-20`) with `nearestVertex, passVertex, projectRideOffline, PASS_GAP_M` (keep the existing names).

(b) Append at the END of the file (after the last `});`) the fixtures and tests below verbatim. `buildSyntheticRef` and `xyToLatLon` are already in scope. Positions are planar metres in the frame `lat0 = lon0 = 0`, fed via `xyToLatLon(x, y, 0, 0)`.

```ts

// ------------------------------------------------ virgin-cycle26 brief 02
// Loops and retraced ground. LOOP: a closed 1000 x 600 m rectangle, start
// vertex = end vertex (Home to Home). OB (out-and-back): 300 m east along a
// street at y = 0, a 1400 m block, 700 m back west along the same street on
// the OTHER side (y = -4) — the realistic case where the return copy is a few
// metres beside the outbound copy and exact vertex ties no longer rescue a
// nearest-vertex pick. OB_LONG: the same with a 600 m street and a 1000 m
// return, for the re-acquisition case (the rejoin must lie > 240 m ahead of
// the projector's window). Arc lengths below are along the WAYPOINT polyline;
// stored chainages fall up to ~1.5 m short per corner that lies between two
// 5 m samples (resample cuts corners), hence the ±2.5 s lap tolerances at 5 m/s.
const LOOP_REF = buildSyntheticRef([[0, 0], [1000, 0], [1000, 600], [0, 600], [0, 0]]);
const LOOP_SPEC: TrackSpec = { id: 'Loop', ref: LOOP_REF, gates: [32, 800, 1600, 2400, 3168] };
function loopPos(s: number): [number, number] {
  if (s < 1000) return [s, 0];
  if (s < 1600) return [1000, s - 1000];
  if (s < 2600) return [1000 - (s - 1600), 600];
  return [0, 600 - (s - 2600)];
}
const OB_REF = buildSyntheticRef([[0, 0], [300, 0], [300, 400], [700, 400], [700, -4], [0, -4]]);
const OB_SPEC: TrackSpec = { id: 'OutAndBack', ref: OB_REF, gates: [22, 551, 1102, 1653, 2160] };
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
  // (15, -3): the return copy's vertex (14, -4) is nearer than the outbound (15, 0).
  const near = nearestVertex(15, -3, OB_REF);
  assert(near.index === OB_REF.rx.length - 3, `precondition: nearest is the return copy, got index ${near.index} of ${OB_REF.rx.length}`);
  const first = passVertex(15, -3, OB_REF);
  assert(first.index === 3 && numEq(OB_REF.ch[first.index], 15, 1e-6), `earliest pass expected index 3 (ch 15), got ${first.index} (ch ${OB_REF.ch[first.index]})`);
  assert(numEq(first.dist, 3, 1e-9), `dist to (15,0) must be 3, got ${first.dist}`);
  // With a chainage context on the return leg, the return pass wins even though
  // (100, 1) is nearer the outbound copy.
  const ctx = passVertex(100, 1, OB_LONG_REF, -Infinity, Infinity, 2300);
  assert(OB_LONG_REF.ch[ctx.index] > 2600, `nearS=2300 must pick the return pass (ch > 2600), got ch ${OB_LONG_REF.ch[ctx.index]}`);
  const noCtx = passVertex(100, 1, OB_LONG_REF);
  assert(numEq(OB_LONG_REF.ch[noCtx.index], 100, 1e-6), `no context => earliest pass (ch 100), got ${OB_LONG_REF.ch[noCtx.index]}`);
  // Range restriction is honoured before the pass split (live re-acq shape):
  // within [2300, 2500] the return copy is 200+ m east of (100, 1), so the
  // pick is far outside the corridor (live re-acq would reject it, as today).
  const ahead = passVertex(100, 1, OB_LONG_REF, 2300, 2500, 2300);
  assert(ahead.index >= 0 && ahead.dist > 150, `within [2300, 2500] expected a far vertex (dist > 150), got index ${ahead.index} dist ${ahead.dist}`);
  const ahead2 = passVertex(100, 1, OB_LONG_REF, 2300, 2300 + 6000, 2300);
  assert(OB_LONG_REF.ch[ahead2.index] > 2600, `a wide forward range finds the return pass only, got ch ${OB_LONG_REF.ch[ahead2.index]}`);
});

test('virgin-cycle26 02: a Home-to-Home loop whose first fix sits nearer the END vertex does not FINISH at t = 0 and scores a full lap', () => {
  const engine = new LiveEngine([LOOP_SPEC]);
  const evts: EngineEvent[] = [];
  const unsub = engine.subscribeEvents((e) => evts.push(e));
  engine.start({ pickId: 'Loop' });
  const t0 = 1759860000;
  // First fix 4 m north of Home: 1 m from the loop's last vertex (0, 5), 4 m from its first (0, 0).
  feedXY(engine, 0, 4, t0);
  const after1 = engine.getState();
  assert(after1.phase === 'locked' && after1.gateFires === 0 && after1.lap === null,
    `first fix: phase ${after1.phase}, gateFires ${after1.gateFires}, lap ${JSON.stringify(after1.lap)} — a FINISH at t=0 means the anchor landed on the end vertex`);
  assert(after1.chainageM !== null && after1.chainageM < 30, `anchor chainage ${after1.chainageM}, want < 30 (earliest pass)`);
  for (let s = 5; s <= 3195; s += 5) {
    const [x, y] = loopPos(s);
    feedXY(engine, x, y, t0 + s / 5);
  }
  unsub();
  const final = engine.getState();
  assert(final.gateFires === 5, `gateFires ${final.gateFires}, want 5`);
  assert(evts.every((e) => e.type !== 'gate' || !e.estimated), `estimated gate events: ${JSON.stringify(evts.filter((e) => e.type === 'gate' && e.estimated))}`);
  const start = evts.find((e) => e.type === 'gate' && e.gateIndex === 0);
  assert(start && start.type === 'gate' && numEq(start.t, t0 + 6.4, 0.01), `START at ${start && start.type === 'gate' ? start.t - t0 : 'none'} s, want 6.4`);
  assert(final.phase === 'finished' && final.lap !== null && final.lap.rawS !== null && numEq(final.lap.rawS, 627.2, 2.5),
    `phase ${final.phase}, lap ${JSON.stringify(final.lap)} — want finished, rawS ≈ 627.2 s`);
  assert(final.chainageM !== null && final.chainageM > 3168, `final chainage ${final.chainageM}, want past FINISH`);
});

test('virgin-cycle26 02: an out-and-back whose first fix sits nearer the RETURN copy anchors on the outbound pass and fires every gate once, in order', () => {
  const engine = new LiveEngine([OB_SPEC]);
  const evts: EngineEvent[] = [];
  const unsub = engine.subscribeEvents((e) => evts.push(e));
  engine.start({ pickId: 'OutAndBack' });
  const t0 = 1759860000;
  // (15, -3): 1.4 m from the return copy's (14, -4), 3 m from the outbound (15, 0).
  feedXY(engine, 15, -3, t0);
  const after1 = engine.getState();
  assert(after1.phase === 'locked' && after1.gateFires === 0,
    `first fix: phase ${after1.phase}, gateFires ${after1.gateFires} — a fire here means FINISH armed on the return copy`);
  assert(after1.chainageM !== null && after1.chainageM < 30, `anchor chainage ${after1.chainageM}, want ≈ 15`);
  for (let s = 20; s <= 2200; s += 5) {
    const [x, y] = obPos(s);
    feedXY(engine, x, y, t0 + (s - 15) / 5);
  }
  unsub();
  const gates = evts.filter((e): e is Extract<EngineEvent, { type: 'gate' }> => e.type === 'gate');
  assert(gates.length === 5, `${gates.length} gate events, want 5: ${JSON.stringify(gates)}`);
  assert(gates.map((g) => g.gateIndex).join(',') === '0,1,2,3,4', `order ${gates.map((g) => g.gateIndex)}`);
  assert(gates.every((g) => !g.estimated), `estimated fires: ${JSON.stringify(gates.filter((g) => g.estimated))}`);
  assert(numEq(gates[0].t, t0 + 1.4, 0.01), `START at ${gates[0].t - t0} s, want 1.4`);
  for (let i = 1; i < gates.length; i++) assert(gates[i].t > gates[i - 1].t, 'gate times must increase');
  const final = engine.getState();
  assert(final.phase === 'finished' && final.lap !== null && final.lap.rawS !== null && numEq(final.lap.rawS, 427.6, 2.5),
    `lap ${JSON.stringify(final.lap)} — want rawS ≈ 427.6 s`);
});

test('virgin-cycle26 02: an out-and-back ridden against its own reference in the OTHER direction still fires nothing (far-end anchor unchanged)', () => {
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
  const xs: number[] = [15];
  const ys: number[] = [-3];
  for (let s = 20; s <= 2200; s += 5) {
    const [x, y] = obPos(s);
    xs.push(x);
    ys.push(y);
  }
  const { s } = projectRideOffline(xs, ys, OB_REF);
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
  for (let s = 15; s <= 2305; s += 5) {
    const [x, y] = obLongPos(s);
    xs.push(x);
    ys.push(y);
  }
  for (let x = 450; x >= 100; x -= 50) {
    xs.push(x);
    ys.push(-70);
  }
  const rejoin = xs.length;
  xs.push(100);
  ys.push(1);
  for (let x = 95; x >= 0; x -= 5) {
    xs.push(x);
    ys.push(-4);
  }
  const { s } = projectRideOffline(xs, ys, OB_LONG_REF);
  assert(s[rejoin - 1] > 2250 && s[rejoin - 1] < 2320, `pre-detour chainage ${s[rejoin - 1]}, want ≈ 2300`);
  assert(s[rejoin] > 2600, `rejoin chainage ${s[rejoin]}, want the return pass (> 2600) — ${s[rejoin] < 200 ? 'fell back onto the outbound copy' : 'unexpected'}`);
  assert(s[s.length - 1] > 2750, `end chainage ${s[s.length - 1]}, want ≈ 2794`);
});
```

## 5. Expected behaviour BEFORE and AFTER (verify both; a mismatch is a STOP)

Run these seven tests against the pre-edit tree first (step 2 below) by adding §4.4 BEFORE §4.1-4.3: the import of `passVertex`/`PASS_GAP_M` fails to resolve, so the whole `live_suite.ts` import crashes — that is expected and proves nothing. So instead, for the BEFORE check, temporarily add §4.4 with `passVertex`/`PASS_GAP_M` **stubbed** at the top of the appended block (`const passVertex = nearestVertex; const PASS_GAP_M = 120;` and drop them from the import) and expect:

| test | before (stub = nearestVertex) | after |
|---|---|---|
| single-pass / hairpin equality | PASS | PASS |
| earliest / nearS | FAIL (`first.index` is the return copy) | PASS |
| loop t = 0 | FAIL at `after1` (phase `finished`, gateFires 1) | PASS |
| out-and-back order | FAIL at `after1` (FINISH armed estimated) | PASS |
| far-end anchor unchanged | PASS | PASS |
| offline anchor | FAIL (`s[0]` ≈ 2184) | PASS |
| offline re-acq | FAIL (`s[rejoin]` ≈ 100) | PASS |

Then remove the stub, restore the import, apply §4.1-4.3. If any "after" test fails, STOP and report the assertion text verbatim with the printed numbers (the tolerances were derived by hand from the resample/corner-cut arithmetic; a failure means the plan's arithmetic, not the code, is wrong and Fable must look).

## 6. Steps

1. `GIT_OPTIONAL_LOCKS=0 git status --short`; baseline `cd app && node --experimental-strip-types tests/run.ts | tail -1`.
2. BEFORE check per §5 (stubbed). Record the FAIL lines verbatim in your report.
3. Apply §4.1, 4.2, 4.3; restore §4.4's real import.
4. `cd app && node --experimental-strip-types tests/run.ts` → zero FAIL, count = baseline + 7. Specifically confirm that `tests/engine_suite.ts`'s tests and every pre-existing `live_suite.ts` test still PASS (grep the output for `FAIL`; none).
5. `cd app && ./node_modules/.bin/tsc --noEmit` (timeout_ms 180000, tee to `cycles/virgin-cycle26/04-brief-02-tsc.log`) → exit 0.
6. `GIT_OPTIONAL_LOCKS=0 git diff --stat` → exactly the four files of §3; `git diff -- app/tests/ui-strings.allow.json` empty; `grep -n "nearestVertex" app/core/src/*.ts app/src/live/*.ts` → hits only in `core/src/projection.ts`.
7. Report → `cycles/virgin-cycle26/04-brief-02-executor-report.md`: files, counts, BEFORE table as observed, tsc, diffs, deviations verbatim, and this line for the coordinator's OPEN-ITEMS: "`[UNVERIFIED]` parity: `projectRideOffline` anchor and global re-acquisition now use `passVertex` (virgin-cycle26 brief 02); identical for single-pass references by construction; archive parity not re-measurable on `virgin`."

## 7. Acceptance

- Suite zero FAIL, +7; tsc exit 0; `engine_suite.ts` and pre-existing `live_suite.ts` tests unedited and passing.
- `git diff -- app/core/src/live.ts`: import line, two call sites, one comment bullet — nothing else.
- `git diff -- app/core/src/projection.ts`: the inserted block + the two call-site hunks in `projectRideOffline` — `nearestOnSegments`, `nearestVertex`, `CORRIDOR_M` unchanged.
- `git diff -- app/src/live/engine.ts`: two comment lines.
- No new string anywhere; `ui-strings.allow.json` unchanged.

## 8. Non-goals

- The windowed `nearestOnSegments` projection, `displayProjection` (`engine.ts:217-232`), `GateDetector`, `armWithinM`, window sizes, `FINISH_FRAC`: untouched (plan D5, D10).
- No FINISH minimum-distance guard; no "loop" flag in `LiveEngineState`; no diagnostic event type.
- Gate seeding and the editor: brief 03. The picker: brief 01.

## 9. For the Inspect pass

Rerun everything in §6-7. Mutate-check: with `passVertex` temporarily replaced by `nearestVertex` on a COPY under `safe_to_delete/`, the five "after" tests of §5 that are marked FAIL-before must fail. Reason about `passVertex` ties: equal scores keep the EARLIER pass (strict `<`), a single pass returns the SAME index `nearestVertex` returns (strict `<` on `d2`, same iteration order). Check that `closeRun()` resets `runD2` so the next pass starts fresh, and that the pass split happens BEFORE the current vertex is folded into the run. Confirm the time-aware live re-acq (`core/src/live.ts:101-113`) still passes `[sp, sp + bound]` and now `nearS = sp`.
