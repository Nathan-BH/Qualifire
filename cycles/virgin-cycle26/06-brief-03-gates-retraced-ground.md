# Brief 03 — Gates on retraced ground: seeding slides off it, stops are located pass-aware

Written by the Plan tier (Fable) 2026-10-07 ~22:50 UTC from `05-plan.md` (D7, D8, D15) and digest 04; every anchor below was read in the working tree at that time (suite baseline `918 tests: 915 pass, 0 fail, 3 skip`). Executor: Sonnet, alone. **Runs AFTER brief 02 has landed and been inspected** (it appends to the same `core/src/projection.ts`, reuses `PASS_GAP_M`, and relies on the pass-aware `projectRideOffline`). Read `EXECUTOR-RULES.md` first, then all of this.

## 0. Rules

- **STOP-ON-AMBIGUITY.** Anchor not where quoted (±15 lines, no other plausible match — `projection.ts` line numbers have shifted by brief 02's insert, locate by text), a §5 test not behaving as predicted before or after, any unsettled call → STOP, write what you found verbatim into `cycles/virgin-cycle26/06-brief-03-executor-report.md` under `## STOPPED`, return.
- **No warnings, no blocks** (ruling 1): no copy, flag or state about overlap reaches the rider. Gates just land in better places.
- **Rider-facing text: ZERO new strings**; `app/tests/ui-strings.allow.json` has no diff (no UI file in this brief).
- Never delete; no commit; no publish; no dependency; no edits outside §3; `GIT_OPTIONAL_LOCKS=0`. Strip-only TS.

## 1. Purpose

Two blind spots when a reference passes the same ground twice:

1. **Seeding** (`store/gateSeeding.ts`) is pure chainage arithmetic: a 25/50/75 % quantile can land on the retraced street, so one physical spot carries two gates (the engine copes — chainage fires a gate — but two ticks on one pixel is the OPEN-ITEMS gap). New optional third argument `overlapChainageM` (chainages of every vertex on retraced ground, from a new core helper `overlapChainages(ref)`); a sector gate within `OVERLAP_CLEAR_M = 60` m (chainage) of one slides in the existing ±250 m / 10 m-step search, exactly like the stop rule; blocked window ⇒ quantile stands (same honesty clause, `origin: 'geometric'`). START/FINISH never move. `buildRefFromRideFixes` returns the list next to `stopChainageM`; `routeFromRide.ts`'s two seeding calls pass it. `demoModel.ts` is NOT changed (`tests/demo_suite.ts:638` pins its seed to the two-argument call).
2. **Stop chainages** (`live/userRefs.ts:96-100`) come from a GLOBAL nearest-segment search per stop centroid: a rider waiting on the left side of the outbound street (nearer the return copy) gets that stop attributed to the return pass, and the stop rule then slides the wrong gate. The collapsed reference ride is now projected IN RIDE ORDER through `projectRideOffline` (pass-aware since brief 02) and each stationary run's chainage is read at its own fix. For a single-pass ride this is the same point (the ride is on its own corridor) — the pre-existing knot test (`userrefs_suite.ts:72`, ±30 m) is the regression evidence and stays unedited.

## 2. Verified anchors (working tree 2026-10-07 ~22:25 UTC; `projection.ts` numbers are PRE-brief-02 — locate by text)

- `app/core/src/projection.ts:12` `export const CORRIDOR_M = 40.0;`; `RefLine` imported at `:9`. Brief 02 added `export const PASS_GAP_M = 120;` and `export function passVertex(…)` after `nearestVertex` — your insert goes AFTER `passVertex`'s closing `}` and BEFORE the `/**\n * Offline projection of a whole ride` doc comment. (2026-10-08 anchor update: with briefs 01, 02, 05 and 06 landed, `passVertex`'s closing `}` is at `:159` and that doc comment at `:161-164` (`:152` / `:154-157` before brief 06, which adds 7 comment lines inside `passVertex`); brief 05 added `PASS_AMBIGUITY_M` at `:89` and a `within` parameter to `passVertex`, brief 06 made the no-context band `CORRIDOR_M` — none of it is yours to touch. `PASS_GAP_M` is at `:81`. `routeFromRide.ts` anchors below sit at `:118` / `:241`. Brief 06 does not move this brief's numbers: the stop test's offline projection anchors at the reference ride's own first vertex under either band (re-prototyped 2026-10-08: stop chainage 149.7).)
- `app/core/src/index.ts` re-exports `./projection.ts`, `./geo.ts` (`toXY(lat, lon, lat0, lon0): { x: Float64Array; y: Float64Array }` at `geo.ts:14`) — no edit.
- `app/src/store/gateSeeding.ts:17` ` * Pure — no fs, no Date, no imports beyond nothing at all.` (stays true); `:33` `export const MIN_SNAP_LENGTH_M = 600;`; `:35-39` doc comment of `seedGateChainages` (`/**\n * The 5 seeded gate chainages (START, G1, G2, G3, FINISH) for a reference\n * line of \`refLengthM\` metres, given the reference ride's own stop\n * chainages. Always strictly increasing for any refLengthM > 0.\n */`); `:40-43`:
  ```
  export function seedGateChainages(
    refLengthM: number,
    stopChainageM: readonly number[],
  ): number[] {
  ```
  `:48-50`:
  ```
    if (L < MIN_SNAP_LENGTH_M || stopChainageM.length === 0) {
      return [start, ...quantiles, finish];
    }
  ```
  `:51-52`:
  ```
    const clear = (c: number): boolean =>
      stopChainageM.every((s) => Math.abs(c - s) >= SIGNAL_CLEAR_M);
  ```
- `app/src/live/userRefs.ts:25-27`:
  ```
  import {
    buildReference, collapseStationaryRuns, cumdist, meanOrigin, nearestOnSegments,
  } from '../../core/src/index.ts';
  ```
  `:46-54` `export interface BuiltRideRef { ref: RefLine; /** Chainage (m on \`ref\`) of each >=20 s stationary run's centroid — … */ stopChainageM: number[]; }`; `:94-101`:
  ```
    const nseg = ch.length - 1;
    const clat = Math.cos((lat0 * Math.PI) / 180) * 111320;
    const stopChainageM = collapsed.runs.map((r) => {
      const px = (r.lon - lon0) * clat;
      const py = (r.lat - lat0) * 110540;
      return nearestOnSegments(px, py, ref, 0, nseg).s;
    });
    return { ref, stopChainageM };
  ```
  `collapsed` is a `CollapsedRide` (`core/src/reference.ts:108-111`: `{ ride: RidePoints; runs: StationaryRun[] }`), `StationaryRun` (`:100-106`) has `lat, lon, tFromS, tToS, nPoints`; `collapseStationaryRuns` (`:132-172`) pushes each run as ONE collapsed point whose `t` is `ride.t[i]` = the run's `tFromS`.
- `app/src/store/routeFromRide.ts:117` `    chainageM: seedGateChainages(built.ref.length, built.stopChainageM),`; `:240` `    ? { chainageM: seedGateChainages(builtRef.ref.length, builtRef.stopChainageM) }`. (If brief 01 landed first it added one import line at `:22`, so these sit at `:118` / `:241` — match on the quoted text, not the number; its `:196`→`:197` `existingRouteProps` label line is NOT yours.)
- `app/src/ui/demoModel.ts:180` `    chainageM: seedGateChainages(built.ref.length, built.stopChainageM),` — **do not touch.**
- `app/tests/gateseeding_suite.ts:4-6` imports (`assert, test` from `./lib.ts`; `seedGateChainages`; six `gateAdjustModel` names); `:8` `const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;`; `:10-44` the five seeding tests (2-argument calls stay valid); the file ends with the `nudgeDeltaM` test.
- `app/tests/userrefs_suite.ts:15` `import { buildReference, collapseStationaryRuns, M_PER_DEG_LAT, meanOrigin, xyToLatLon } from '../core/src/index.ts';`; `:17-20` imports `buildRefFromRideFixes, …, type RefFixInput` from `'../src/live/userRefs.ts'`; `:22-23` `const LAT0 = 50.87; const LON0 = 4.70;`; `:26-32` `northRide(n)`; `:72` the knot test (unedited); `:114` `test('userRefs: degenerate rides build nothing'`.
- `app/tests/run.ts` already imports `userrefs_suite.ts` and `gateseeding_suite.ts`. **Do not edit `run.ts`.**

## 3. Files (complete list)

1. `app/core/src/projection.ts` — add `overlapChainages`.
2. `app/src/store/gateSeeding.ts` — `OVERLAP_CLEAR_M`; third argument; early return; `clear`; doc sentence.
3. `app/src/live/userRefs.ts` — import; `BuiltRideRef.overlapChainageM`; stop chainages via the offline projector; return value.
4. `app/src/store/routeFromRide.ts` — two call sites.
5. `app/tests/gateseeding_suite.ts`, `app/tests/userrefs_suite.ts` — new tests.

## 4. Edits

### 4.1 `core/src/projection.ts` — insert after `passVertex`'s closing `}`

```ts

/**
 * virgin-cycle26 brief 03: the chainages (ascending, one per vertex) of the
 * vertices that lie on RETRACED ground — another vertex of the same reference,
 * more than `gapM` (PASS_GAP_M) away in chainage, sits within `withinM`
 * (CORRIDOR_M) of them. Empty for a line that never comes back on itself; the
 * closing metres of a Home-to-Home loop and both copies of an out-and-back
 * street are what it reports. Gate seeding (store/gateSeeding.ts) keeps
 * sector gates clear of these so one physical spot never carries two gates
 * when the window allows. O(n²) over 5 m vertices, run once when a route is
 * born (a 20 km reference is 4 000 vertices).
 */
export function overlapChainages(ref: RefLine, withinM = CORRIDOR_M, gapM = PASS_GAP_M): number[] {
  const { rx, ry, ch } = ref;
  const n = rx.length;
  const w2 = withinM * withinM;
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    let hit = false;
    for (let j = 0; j < n && !hit; j++) {
      if (Math.abs(ch[j] - ch[k]) <= gapM) continue;
      const dx = rx[j] - rx[k];
      const dy = ry[j] - ry[k];
      if (dx * dx + dy * dy <= w2) hit = true;
    }
    if (hit) out.push(ch[k]);
  }
  return out;
}
```

### 4.2 `store/gateSeeding.ts`

(a) After `:33` (`export const MIN_SNAP_LENGTH_M = 600;`) add:

```ts
/** virgin-cycle26 brief 03: a sector gate stays this far (chainage) from any
 * vertex on retraced ground (core/src/projection.ts overlapChainages) — more
 * than the 40 m corridor, so the moved gate's tick sits outside the other
 * pass's corridor. Same ±SNAP_WINDOW_M search as the stop rule; a blocked
 * window leaves the quantile where it is (the engine fires by chainage, so a
 * doubled spot is a display nuisance, never a timing error). */
export const OVERLAP_CLEAR_M = 60;
```

(b) Signature `:40-43` →

```ts
export function seedGateChainages(
  refLengthM: number,
  stopChainageM: readonly number[],
  overlapChainageM: readonly number[] = [],
): number[] {
```

(c) `:48` `  if (L < MIN_SNAP_LENGTH_M || stopChainageM.length === 0) {` → `  if (L < MIN_SNAP_LENGTH_M || (stopChainageM.length === 0 && overlapChainageM.length === 0)) {`

(d) `:51-52` →

```ts
  const clear = (c: number): boolean =>
    stopChainageM.every((s) => Math.abs(c - s) >= SIGNAL_CLEAR_M) &&
    overlapChainageM.every((s) => Math.abs(c - s) >= OVERLAP_CLEAR_M);
```

(e) Doc comment `:35-39`: before the closing ` */` add the line ` * \`overlapChainageM\` (virgin-cycle26 brief 03) lists vertices on retraced ground; sector gates keep OVERLAP_CLEAR_M clear of them by the same slide.`

Nothing else in the function changes (slide loop, `MIN_GATE_GAP_M` check, fallbacks untouched).

### 4.3 `live/userRefs.ts`

(a) `:25-27` import → `  buildReference, collapseStationaryRuns, cumdist, meanOrigin, overlapChainages, projectRideOffline, toXY,` (`nearestOnSegments` is dropped: after (c) nothing in this file uses it — `grep -n nearestOnSegments src/live/userRefs.ts` must be empty).

(b) In `BuiltRideRef`, after the `stopChainageM: number[];` line and before the interface's closing `}`:

```ts
  /** virgin-cycle26 brief 03: chainages of the vertices that lie on retraced
   * ground (core/src/projection.ts overlapChainages) — gate seeding keeps
   * sector gates clear of them. Empty for a line that never doubles back. */
  overlapChainageM: number[];
```

(c) `:94-101` →

```ts
  // virgin-cycle26 brief 03 (plan D7): the reference ride's own stops are
  // located by projecting the collapsed ride IN RIDE ORDER through the offline
  // projector (pass-aware since brief 02) and reading each stationary run's
  // chainage at its own collapsed fix — never by a global nearest-segment
  // search, which on a retraced street could attribute a stop to the other
  // pass. A run's collapsed point carries t === tFromS (core/reference.ts
  // collapseStationaryRuns).
  const xy = toXY(collapsed.ride.lat, collapsed.ride.lon, lat0, lon0);
  const proj = projectRideOffline(xy.x, xy.y, ref);
  const stopChainageM: number[] = [];
  let k = 0;
  for (const r of collapsed.runs) {
    while (k < collapsed.ride.t.length - 1 && collapsed.ride.t[k] < r.tFromS) k++;
    stopChainageM.push(proj.s[k]);
  }
  return { ref, stopChainageM, overlapChainageM: overlapChainages(ref) };
```

### 4.4 `store/routeFromRide.ts`

- `:117` → `    chainageM: seedGateChainages(built.ref.length, built.stopChainageM, built.overlapChainageM),`
- `:240` → `    ? { chainageM: seedGateChainages(builtRef.ref.length, builtRef.stopChainageM, builtRef.overlapChainageM) }`

### 4.5 Tests

**`tests/gateseeding_suite.ts`** — change the import to `import { OVERLAP_CLEAR_M, seedGateChainages } from '../src/store/gateSeeding.ts';` and add `import { cumdist, overlapChainages, resample, type RefLine } from '../core/src/index.ts';`. Append at the end:

```ts

// ------------------------------------------------ virgin-cycle26 brief 03
function synRef(waypoints: [number, number][]): RefLine {
  const { x, y } = resample(waypoints.map((w) => w[0]), waypoints.map((w) => w[1]), 5);
  const ch = cumdist(x, y);
  return { rx: x, ry: y, ch, lat0: 0, lon0: 0, length: ch[ch.length - 1] };
}

test('virgin-cycle26 03: overlapChainages is empty on a single-pass line and marks both copies of a retraced street', () => {
  assert(overlapChainages(synRef([[0, 0], [3005, 0]])).length === 0, 'a straight line has no retraced ground');
  // Out 300 m along y = 0, around a block, back along y = -4 (the other side of the street).
  const ob = synRef([[0, 0], [300, 0], [300, 400], [700, 400], [700, -4], [0, -4]]);
  const ov = overlapChainages(ob);
  assert(ov.length > 0, 'an out-and-back must report retraced ground');
  assert(ov.every((v) => v <= 345 || v >= 1860), `every overlapped chainage must be on the street (≤ 345 or ≥ 1860), got ${ov.filter((v) => v > 345 && v < 1860)}`);
  assert(ov.some((v) => v <= 300) && ov.some((v) => v >= 1900), 'both the outbound and the return copy must be reported');
  for (let i = 1; i < ov.length; i++) assert(ov[i] > ov[i - 1], 'ascending');
  // A closed loop: only its closing metres count (start and end vertices meet).
  const loop = synRef([[0, 0], [1000, 0], [1000, 600], [0, 600], [0, 0]]);
  const lv = overlapChainages(loop);
  assert(lv.length > 0 && lv.every((v) => v <= 45 || v >= 3150), `loop closure only, got ${lv.filter((v) => v > 45 && v < 3150)}`);
});

test('virgin-cycle26 03: seedGateChainages slides sector gates off retraced ground within the window and keeps START/FINISH', () => {
  // 500 m street out, 600 m block, 500 m back: L = 1600, retraced [0, 500] and [1100, 1600].
  const ov: number[] = [];
  for (let c = 0; c <= 500; c += 5) ov.push(c);
  for (let c = 1100; c <= 1600; c += 5) ov.push(c);
  const g = seedGateChainages(1600, [], ov);
  const expected = [16, 560, 800, 1040, 1584];
  assert(g.every((v, i) => near(v, expected[i])), `got ${g}, want ${expected}`);
  for (let i = 1; i < g.length; i++) assert(g[i] > g[i - 1], 'strictly increasing');
  assert(near(g[0], 16) && near(g[4], 1584), 'START/FINISH never move');
  assert(g.slice(1, 4).every((v) => ov.every((o) => Math.abs(v - o) >= OVERLAP_CLEAR_M)), 'every sector gate is OVERLAP_CLEAR_M clear of retraced ground');
});

test('virgin-cycle26 03: a fully retraced line keeps the quantiles; two-argument calls are unchanged', () => {
  const all: number[] = [];
  for (let c = 0; c <= 2000; c += 5) all.push(c);
  const g = seedGateChainages(2000, [], all);
  const expected = [20, 500, 1000, 1500, 1980];
  assert(g.every((v, i) => near(v, expected[i])), `blocked window must keep the quantiles: got ${g}, want ${expected}`);
  const a = seedGateChainages(4000, [2000]);
  const b = seedGateChainages(4000, [2000], []);
  assert(a.every((v, i) => near(v, b[i])), 'an empty overlap list changes nothing');
  const c = seedGateChainages(4000, [], []);
  assert(c.every((v, i) => near(v, [40, 1000, 2000, 3000, 3960][i])), 'no stops, no overlap: pure quantiles');
});
```

**`tests/userrefs_suite.ts`** — insert directly BEFORE `test('userRefs: degenerate rides build nothing'` (`:114`):

```ts

// ------------------------------------------------ virgin-cycle26 brief 03
/** Out-and-back: 300 m east along y = 0, a block, 700 m back west along y = -4.
 * Planar metres about (LAT0, LON0); one fix per 5 m, 1 s apart. */
function obPosM(s: number): [number, number] {
  if (s < 300) return [s, 0];
  if (s < 700) return [300, s - 300];
  if (s < 1100) return [300 + (s - 700), 400];
  if (s < 1504) return [700, 400 - (s - 1100)];
  return [700 - (s - 1504), -4];
}
function obFixes(stopAtS: number | null): RefFixInput[] {
  const fixes: RefFixInput[] = [];
  let t = 0;
  for (let s = 0; s <= 2200; s += 5) {
    const [x, y] = obPosM(s);
    const [lat, lon] = xyToLatLon(x, y, LAT0, LON0);
    fixes.push({ lat, lon, tUnixMs: t * 1000 });
    t += 1;
    if (stopAtS !== null && s === stopAtS) {
      // A 30 s wait on the LEFT side of the outbound street (y = -3.5): 0.5 m from
      // the return copy (y = -4), 3.5 m from the outbound copy (y = 0). The run
      // also swallows the 5/10/15 m neighbours at y = 0, so its centroid sits
      // near y = -3.1: still nearer the return copy than the (smoothed) outbound.
      for (let k = 0; k < 30; k++) {
        const [sl, so] = xyToLatLon(x, -3.5, LAT0, LON0);
        fixes.push({ lat: sl, lon: so, tUnixMs: t * 1000 });
        t += 1;
      }
    }
  }
  return fixes;
}

test('virgin-cycle26 03: buildRefFromRideFixes reports retraced ground for an out-and-back and none for a straight ride', () => {
  const straight = buildRefFromRideFixes(northRide(20));
  assert(straight !== null && straight.overlapChainageM.length === 0, `a straight ride has no retraced ground, got ${straight?.overlapChainageM.length}`);
  const built = buildRefFromRideFixes(obFixes(null));
  assert(built !== null, 'expected a built ref');
  assert(built.overlapChainageM.length > 0, 'an out-and-back must report retraced ground');
  assert(built.overlapChainageM.some((v) => v < 300) && built.overlapChainageM.some((v) => v > built.ref.length - 300),
    `both copies of the street expected, got min ${built.overlapChainageM[0]} max ${built.overlapChainageM[built.overlapChainageM.length - 1]} of L=${built.ref.length}`);
  assert(built.overlapChainageM.every((v) => v <= 360 || v >= built.ref.length - 360), 'nothing on the block itself');
});

test('virgin-cycle26 03: a stop on the outbound street, nearer the return copy, is located on the OUTBOUND pass (ride order, not nearest segment)', () => {
  const built = buildRefFromRideFixes(obFixes(150));
  assert(built !== null, 'expected a built ref');
  assert(built.stopChainageM.length === 1, `expected one stop, got ${built.stopChainageM.length}`);
  assert(built.stopChainageM[0] > 100 && built.stopChainageM[0] < 200,
    `stop chainage ${built.stopChainageM[0]}: want ≈ 150 (outbound pass); ${built.stopChainageM[0] > 1800 ? 'it was attributed to the RETURN copy' : 'unexpected'}`);
});
```

(`buildRefFromRideFixes` smooths with a k = 5 box filter and re-resamples, so the built line's corners are rounded and its length differs slightly from 2 204 m — the assertions are relative to `built.ref.length` with 60 m of slack.)

## 5. Expected BEFORE / AFTER

| test | before | after |
|---|---|---|
| `overlapChainages` | cannot compile (no such export) → skip for the BEFORE run | PASS |
| slide off retraced ground | FAIL once the third argument exists but `clear` ignores it (`got 16,400,800,1200,1584`) — apply 4.2(b) alone first, run, then 4.2(c)(d) | PASS |
| fully retraced + 2-arg unchanged | PASS (quantiles stand either way) | PASS |
| `buildRefFromRideFixes` overlap | cannot compile (`overlapChainageM` missing) | PASS |
| stop on the outbound street | FAIL with the current `nearestOnSegments` code (stop chainage ≈ 2050, "attributed to the RETURN copy") — run it after 4.3(a)(b) but BEFORE 4.3(c) by temporarily leaving the old `stopChainageM` block in place and returning `overlapChainageM: overlapChainages(ref)` next to it | PASS |
| pre-existing knot test (`:72`) | PASS | PASS (unedited — the single-pass regression evidence for D7) |

Perform exactly those two-step checks and record both outputs.

## 6. Steps

1. `GIT_OPTIONAL_LOCKS=0 git status --short` (brief 01/02 edits present and inspected); baseline `cd app && node --experimental-strip-types tests/run.ts | tail -1`.
2. 4.1, then 4.2(a)(b) + 4.5's seeding tests → run → observe the FAIL of §5 → 4.2(c)(d)(e) → run → PASS.
3. 4.3(a)(b) + the userrefs tests with the OLD stop block still in place → run → observe the stop FAIL → 4.3(c) → run → PASS. Then 4.4.
4. `cd app && node --experimental-strip-types tests/run.ts` → zero FAIL, count = baseline + 5. `tests/demo_suite.ts` (`:638` pin), the five pre-existing `gateseeding_suite.ts` tests and `userrefs_suite.ts:72` pass unedited.
5. `cd app && ./node_modules/.bin/tsc --noEmit` (timeout_ms 180000, tee `cycles/virgin-cycle26/06-brief-03-tsc.log`) → exit 0.
6. `GIT_OPTIONAL_LOCKS=0 git diff --stat` → the six files of §3 (plus earlier briefs', attributed); `git diff -- app/tests/ui-strings.allow.json` empty; `grep -rn "seedGateChainages(" app/src` → `routeFromRide.ts` ×2 three-arg, `demoModel.ts` ×1 two-arg, `gateSeeding.ts` definition; `grep -n nearestOnSegments app/src/live/userRefs.ts` → none.
7. Report → `cycles/virgin-cycle26/06-brief-03-executor-report.md`: files, counts, the two-step BEFORE/AFTER outputs, tsc, diffs, deviations verbatim, and the OPEN-ITEMS replacement text from `05-plan.md` §8 for the coordinator.

## 7. Acceptance

- Suite zero FAIL, +5; tsc exit 0; `demo_suite`, pre-existing `gateseeding_suite` and `userrefs_suite` tests unedited and passing.
- `gateSeeding.ts:17` still true (no import added).
- `demoModel.ts` unchanged; `gateAdjustModel.ts`, `wayMapView.tsx` unchanged (brief 04's files).
- No new string; `ui-strings.allow.json` unchanged.

## 8. Non-goals

- No re-seeding of existing gate sets; no change to START/FINISH fractions, `SIGNAL_CLEAR_M`, `SNAP_WINDOW_M`.
- The editor tap and any map drawing: brief 04.
- `demoModel.ts`, `gateAdjustCard.tsx`, `GateAdjustScreen.tsx`, `catalogMapView.tsx` untouched.

## 9. For the Inspect pass

Rerun §6-7. Mutate-check the seeding test by reasoning: with `OVERLAP_CLEAR_M` ignored in `clear`, `[16, 560, 800, 1040, 1584]` becomes `[16, 400, 800, 1200, 1584]`. Check `overlapChainages`' inner loop skips `|Δch| ≤ gapM` BEFORE the distance test and compares with `<=`. Check the stop loop: `k` only advances, the `while` guard keeps `k` in range, and a run whose collapsed point is the LAST fix reads `proj.s[last]`. Reason about D7 on a single-pass ride: `projectRideOffline` of the ride against its own smoothed line is on-corridor everywhere, so every stop lands within the old ±30 m — the knot test is the evidence. Confirm `userRefs.ts` no longer imports `nearestOnSegments` and that `toXY`/`projectRideOffline` are real core exports (`core/src/index.ts`).
