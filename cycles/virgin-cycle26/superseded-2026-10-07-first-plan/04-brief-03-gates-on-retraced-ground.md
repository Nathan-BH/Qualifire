# Brief 03 — Gates on retraced ground: seeding slides off it, the editor tap cycles stacked gates

Written by the Plan tier (Fable) 2026-10-07 ~22:35 UTC from `03-plan.md` (D7, D8, D11) and digests 01/02; every anchor below was read in the working tree at that time (suite baseline `923 tests: 920 pass, 0 fail, 3 skip`, clean `git status`). Executor: Sonnet, alone. **Runs AFTER brief 02 has landed and been inspected** (it appends to the same `core/src/projection.ts` and reuses `PASS_GAP_M`). Read `EXECUTOR-RULES.md` first, then all of this.

## 0. Rules

- **STOP-ON-AMBIGUITY.** Anchor not where quoted (±15 lines, no other plausible match — `projection.ts` line numbers have shifted by brief 02's insert, locate by text), a §5 test not behaving as predicted before or after, any unsettled call → STOP, write what you found verbatim into `cycles/virgin-cycle26/04-brief-03-executor-report.md` under `## STOPPED`, return.
- **No warnings, no blocks** (Nathan, ruling 1): no copy, no flag, no state about overlap reaches the rider. Gates just land in better places and the editor tap just works.
- **Rider-facing text: ZERO new strings**; `app/tests/ui-strings.allow.json` has no diff. (`wayMapView.tsx` is a scanned UI file; the handler edit adds no literal that is prose.)
- `wayMapView.tsx` is a 1 000-line mount-order-sensitive file: you change ONE event handler and ONE import line, nothing else — `git diff -- app/src/ui/wayMapView.tsx` must show exactly two hunks.
- Never delete; no commit; no publish; no dependency; no edits outside §3; `GIT_OPTIONAL_LOCKS=0`. Strip-only TS.

## 1. Purpose

On an out-and-back street the reference passes the same ground twice. A sector gate seeded at a 25/50/75 % quantile can land on that street, so one physical spot carries two gates (the engine copes: chainage, not position, fires a gate), the live/browse map draws two ticks on one pixel, and in the gate editor `wayMapView.tsx`'s tap handler takes `features[0]` only — the OPEN-ITEMS "Overlapping gate hit-areas" gap. Two fixes:

1. **Seeding** (`store/gateSeeding.ts`): a new optional third argument `overlapChainageM` lists the chainages of every reference vertex that lies on retraced ground; a sector gate within `OVERLAP_CLEAR_M = 60` m (chainage) of one slides in the existing ±250 m / 10 m-step search, exactly like the stop rule; a blocked window leaves the quantile (same honesty clause, same `origin: 'geometric'`). START and FINISH never move. The list comes from a new pure core helper `overlapChainages(ref)` (`core/src/projection.ts`), returned by `buildRefFromRideFixes` next to `stopChainageM`, and passed at `routeFromRide.ts`'s two seeding calls. `demoModel.ts` is NOT changed (`tests/demo_suite.ts:638` pins its seed to the two-argument call).
2. **Editor tap** (`ui/gateAdjustModel.ts` + `ui/wayMapView.tsx`): a pure `nextGateOnTap(hits, selected)` turns the full list of tapped gate features into a selection: first hit when none of them is selected, otherwise the next one cyclically; a single hit is exactly today's behaviour (the card's toggle still deselects it).

## 2. Verified anchors (working tree 2026-10-07 ~21:50 UTC; `projection.ts` numbers are PRE-brief-02 — locate by text)

- `app/core/src/projection.ts:12` `export const CORRIDOR_M = 40.0;`; brief 02 added `export const PASS_GAP_M = 120;` and `export function passVertex(…)` after `nearestVertex` — your insert goes AFTER `passVertex`'s closing `}` and BEFORE the `/**\n * Offline projection of a whole ride` doc comment. `RefLine` is imported at `:9`.
- `app/core/src/index.ts:10` `export * from './projection.ts';` (no edit).
- `app/src/store/gateSeeding.ts:17` ` * Pure — no fs, no Date, no imports beyond nothing at all.` (stays true: the new argument is data); `:20-33` constants (`SIGNAL_CLEAR_M = 150`, `SNAP_WINDOW_M = 250`, `SNAP_STEP_M = 10`, `MIN_GATE_GAP_M = 50`, `MIN_SNAP_LENGTH_M = 600`); `:40-43`:
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
- `app/src/live/userRefs.ts:25-27` `import {\n  buildReference, collapseStationaryRuns, cumdist, meanOrigin, nearestOnSegments,\n} from '../../core/src/index.ts';`; `:46-54` `export interface BuiltRideRef { ref: RefLine; /** … */ stopChainageM: number[]; }` (the `stopChainageM` doc comment spans `:48-53`); `:96-101`:
  ```
    const stopChainageM = collapsed.runs.map((r) => {
      const px = (r.lon - lon0) * clat;
      const py = (r.lat - lat0) * 110540;
      return nearestOnSegments(px, py, ref, 0, nseg).s;
    });
    return { ref, stopChainageM };
  ```
- `app/src/store/routeFromRide.ts:117` `    chainageM: seedGateChainages(built.ref.length, built.stopChainageM),` and `:240` `    ? { chainageM: seedGateChainages(builtRef.ref.length, builtRef.stopChainageM) }`.
- `app/src/ui/demoModel.ts:180` `    chainageM: seedGateChainages(built.ref.length, built.stopChainageM),` — **do not touch.**
- `app/src/ui/gateAdjustModel.ts` (80 lines, pure, no imports); ends with `fmtPct` (`:77-80`).
- `app/src/ui/wayMapView.tsx:89` `import { offWayM, type WayAsset } from './wayMapMath.ts';`; `:133` `type GatePressEvent = { nativeEvent: { features?: { properties?: Record<string, unknown> | null }[] } };`; `:304` `gateSelect?: { selected: number | null; onPress: (gateIndex: number) => void };`; `:901-905`:
  ```
            onPress={props.gateSelect ? (e: GatePressEvent) => {
              const name = String(e.nativeEvent.features?.[0]?.properties?.name ?? '');
              const idx = asset ? asset.gates.findIndex((g) => g.name === name) : -1;
              if (idx >= 0) props.gateSelect!.onPress(idx);
            } : undefined}
  ```
  Gate features carry `properties.name` = `gateName(i, n)` (`wayAssetRuntime.ts:99`, `wayMapGeo.ts:77-78, 366-367`), unique per gate.
- `app/src/ui/gateAdjustCard.tsx:155` `gateSelect={{ selected, onPress: (i) => setSelected((cur) => (cur === i ? null : i)) }}` — unchanged.
- `app/tests/gateseeding_suite.ts:4-8` imports (`assert, test` from `./lib.ts`; `seedGateChainages`; the six `gateAdjustModel` names) and `const near = (a, b) => Math.abs(a - b) < 1e-9;`; `:10-44` the five seeding tests (the 2-argument calls stay valid); file ends with the `nudgeDeltaM` test.
- `app/tests/userrefs_suite.ts:15` imports `xyToLatLon` (and others) from `'../core/src/index.ts'`; `:17-20` imports `buildRefFromRideFixes, …, type RefFixInput` from `'../src/live/userRefs.ts'`; `:22-23` `const LAT0 = 50.87; const LON0 = 4.70;`; `:26-32` `northRide(n)`; `:34` `test('userRefs: buildRefFromRideFixes builds a 5 m-resampled strictly-increasing line'`.
- `app/tests/run.ts:37-38` already import `userrefs_suite.ts` and `gateseeding_suite.ts`. **Do not edit `run.ts`.**
- `OPEN-ITEMS.md:248-251` the "Overlapping gate hit-areas on an out-and-back ride" entry (coordinator's file — you do not edit it; §6 step 7 hands the coordinator the replacement text).

## 3. Files (complete list)

1. `app/core/src/projection.ts` — add `overlapChainages`.
2. `app/src/store/gateSeeding.ts` — `OVERLAP_CLEAR_M`; third argument; early return; `clear`.
3. `app/src/live/userRefs.ts` — import; `BuiltRideRef.overlapChainageM`; return value.
4. `app/src/store/routeFromRide.ts` — two call sites.
5. `app/src/ui/gateAdjustModel.ts` — add `nextGateOnTap`.
6. `app/src/ui/wayMapView.tsx` — one import line, one handler.
7. `app/tests/gateseeding_suite.ts`, `app/tests/userrefs_suite.ts` — new tests.

## 4. Edits

### 4.1 `core/src/projection.ts` — insert after `passVertex`'s closing `}`

```ts

/**
 * virgin-cycle26 brief 03: the chainages (ascending, one per vertex) of the
 * vertices that lie on RETRACED ground — another vertex of the same reference,
 * more than `gapM` (PASS_GAP_M) away in chainage, sits within `withinM`
 * (CORRIDOR_M) of them. Empty for a line that never comes back on itself; the
 * closing 40 m of a Home-to-Home loop and both copies of an out-and-back
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

(a) After line 33 (`export const MIN_SNAP_LENGTH_M = 600;`) add:

```ts
/** virgin-cycle26 brief 03: a sector gate stays this far (chainage) from any
 * vertex on retraced ground (core/src/projection.ts overlapChainages) — more
 * than the 40 m corridor, so the moved gate's tick sits outside the other
 * pass's corridor. Same ±SNAP_WINDOW_M search as the stop rule; a blocked
 * window leaves the quantile where it is (the engine fires by chainage, so a
 * doubled spot is a display/editor nuisance, never a timing error). */
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

(e) Doc comment `:35-39` of `seedGateChainages`: append one sentence to the paragraph: ` \`overlapChainageM\` (virgin-cycle26 brief 03) lists vertices on retraced ground; sector gates keep OVERLAP_CLEAR_M clear of them by the same slide.`

Nothing else in the function changes (the slide loop, `MIN_GATE_GAP_M` check and fallbacks are untouched).

### 4.3 `live/userRefs.ts`

(a) `:25-27` import → add `overlapChainages`: `  buildReference, collapseStationaryRuns, cumdist, meanOrigin, nearestOnSegments, overlapChainages,`

(b) In `BuiltRideRef` (after the `stopChainageM: number[];` line, before the interface's closing `}`):

```ts
  /** virgin-cycle26 brief 03: chainages of the vertices that lie on retraced
   * ground (core/src/projection.ts overlapChainages) — gate seeding keeps
   * sector gates clear of them. Empty for a line that never doubles back. */
  overlapChainageM: number[];
```

(c) `:101` `  return { ref, stopChainageM };` → `  return { ref, stopChainageM, overlapChainageM: overlapChainages(ref) };`

### 4.4 `store/routeFromRide.ts`

- `:117` → `    chainageM: seedGateChainages(built.ref.length, built.stopChainageM, built.overlapChainageM),`
- `:240` → `    ? { chainageM: seedGateChainages(builtRef.ref.length, builtRef.stopChainageM, builtRef.overlapChainageM) }`

### 4.5 `ui/gateAdjustModel.ts` — append at the end

```ts

/** virgin-cycle26 brief 03: which gate a map tap selects when the tap hit
 * SEVERAL gate ticks at once (an out-and-back street puts two gates on one
 * pixel). `hits` = the gate indices of every feature under the tap, any
 * order, duplicates allowed, -1 for unknown names. None selected among them
 * => the first (lowest index); otherwise the next one cyclically, so repeated
 * taps walk through the stack. A single hit returns that hit — exactly the
 * pre-cycle26 behaviour, and the card's own toggle still deselects it. The
 * chip row keeps selecting any gate directly. */
export function nextGateOnTap(hits: readonly number[], selected: number | null): number | null {
  const sorted = [...new Set(hits)].filter((i) => i >= 0).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const at = selected === null ? -1 : sorted.indexOf(selected);
  return at < 0 ? sorted[0] : sorted[(at + 1) % sorted.length];
}
```

### 4.6 `ui/wayMapView.tsx`

(a) After `:89` `import { offWayM, type WayAsset } from './wayMapMath.ts';` add the line `import { nextGateOnTap } from './gateAdjustModel.ts';` (pure module, no imports of its own — safe here).

(b) `:901-905` →

```tsx
          onPress={props.gateSelect ? (e: GatePressEvent) => {
            // virgin-cycle26 brief 03: every feature under the tap, not just
            // the first — stacked gates on retraced ground cycle on each tap.
            const hits = (e.nativeEvent.features ?? []).map((f) => {
              const name = String(f.properties?.name ?? '');
              return asset ? asset.gates.findIndex((g) => g.name === name) : -1;
            });
            const idx = nextGateOnTap(hits, props.gateSelect!.selected);
            if (idx !== null) props.gateSelect!.onPress(idx);
          } : undefined}
```

Nothing else in the file.

### 4.7 Tests

**`tests/gateseeding_suite.ts`** — extend the imports: `import { OVERLAP_CLEAR_M, seedGateChainages } from '../src/store/gateSeeding.ts';`, add `nextGateOnTap` to the `gateAdjustModel` import, and add `import { cumdist, overlapChainages, resample, type RefLine } from '../core/src/index.ts';`. Append at the end of the file:

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

test('virgin-cycle26 03: fully retraced line (pure out-and-back) leaves the quantiles where they are; two-argument calls are unchanged', () => {
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

test('virgin-cycle26 03: nextGateOnTap — single hit is the old behaviour, a stack cycles, unknown names are ignored', () => {
  assert(nextGateOnTap([2], null) === 2, 'single hit, nothing selected');
  assert(nextGateOnTap([2], 2) === 2, 'single hit, same selected (the card toggles it off)');
  assert(nextGateOnTap([2], 0) === 2, 'single hit, another selected');
  assert(nextGateOnTap([4, 0], null) === 0, 'stack, nothing selected: lowest index');
  assert(nextGateOnTap([4, 0], 0) === 4, 'stack, first selected: next');
  assert(nextGateOnTap([4, 0], 4) === 0, 'stack, last selected: wraps');
  assert(nextGateOnTap([4, 0], 2) === 0, 'stack, a gate outside the stack selected: first of the stack');
  assert(nextGateOnTap([-1, 3, 3, -1], null) === 3, 'duplicates and unknown names (-1) are dropped');
  assert(nextGateOnTap([-1], null) === null && nextGateOnTap([], 1) === null, 'nothing tappable: null');
});
```

**`tests/userrefs_suite.ts`** — insert after the test at `:34` (`buildRefFromRideFixes builds a 5 m-resampled …`), i.e. after its closing `});`:

```ts

test('virgin-cycle26 03: buildRefFromRideFixes reports retraced ground for an out-and-back and none for a straight ride', () => {
  const straight = buildRefFromRideFixes(northRide(20));
  assert(straight !== null && straight.overlapChainageM.length === 0, `a straight ride has no retraced ground, got ${straight?.overlapChainageM.length}`);
  // 300 m east along y = 0, a block, 700 m back along y = -4; one fix per 5 m, 1 s apart.
  const pos = (s: number): [number, number] => {
    if (s < 300) return [s, 0];
    if (s < 700) return [300, s - 300];
    if (s < 1100) return [300 + (s - 700), 400];
    if (s < 1504) return [700, 400 - (s - 1100)];
    return [700 - (s - 1504), -4];
  };
  const fixes: RefFixInput[] = [];
  for (let s = 0; s <= 2200; s += 5) {
    const [x, y] = pos(s);
    const [lat, lon] = xyToLatLon(x, y, LAT0, LON0);
    fixes.push({ lat, lon, tUnixMs: (s / 5) * 1000 });
  }
  const built = buildRefFromRideFixes(fixes);
  assert(built !== null, 'expected a built ref');
  assert(built.overlapChainageM.length > 0, 'an out-and-back must report retraced ground');
  assert(built.overlapChainageM.some((v) => v < 300) && built.overlapChainageM.some((v) => v > built.ref.length - 300),
    `both copies of the street expected, got min ${built.overlapChainageM[0]} max ${built.overlapChainageM[built.overlapChainageM.length - 1]} of L=${built.ref.length}`);
  assert(built.overlapChainageM.every((v) => v <= 360 || v >= built.ref.length - 360), 'nothing on the block itself');
});
```

(`buildRefFromRideFixes` smooths with a k = 5 box filter and re-resamples, so the built line's corners are rounded and its length differs slightly from 2 204 m — the assertions are relative to `built.ref.length` and leave 60 m of slack for that.)

## 5. Expected BEFORE / AFTER

| test | before | after |
|---|---|---|
| `overlapChainages` | cannot compile (no such export) → do the BEFORE check for THIS test only by skipping it | PASS |
| slide off retraced ground | FAIL once the third argument exists but `clear` ignores it (`got 16,400,800,1200,1584`) — i.e. apply 4.2(b) alone first, run, then 4.2(c)(d) | PASS |
| fully retraced + 2-arg unchanged | PASS (quantiles stand either way) | PASS |
| `nextGateOnTap` | cannot compile | PASS |
| `buildRefFromRideFixes` overlap | cannot compile (`overlapChainageM` missing) | PASS |

The meaningful fail-before is the seeding one: perform exactly that two-step check (4.2(b) → run → 4.2(c)(d) → run) and record both outputs.

## 6. Steps

1. `GIT_OPTIONAL_LOCKS=0 git status --short` (brief 01/02 edits present and inspected); baseline `cd app && node --experimental-strip-types tests/run.ts | tail -1`.
2. 4.1, then 4.2(a)(b) + 4.7's seeding tests → run → observe the FAIL quoted in §5 → 4.2(c)(d)(e) → run → PASS.
3. 4.3, 4.4, 4.5, 4.6, remaining tests of 4.7.
4. `cd app && node --experimental-strip-types tests/run.ts` → zero FAIL, count = baseline + 5. `tests/demo_suite.ts` (`:638` pin) and the five pre-existing `gateseeding_suite.ts` tests pass unedited.
5. `cd app && ./node_modules/.bin/tsc --noEmit` (timeout_ms 180000, tee to `cycles/virgin-cycle26/04-brief-03-tsc.log`) → exit 0.
6. `GIT_OPTIONAL_LOCKS=0 git diff --stat` → the eight files of §3 (plus brief 01/02's); `git diff -- app/tests/ui-strings.allow.json` empty; `git diff -- app/src/ui/wayMapView.tsx` = import line + handler, two hunks; `grep -n "seedGateChainages(" app/src -r` → `routeFromRide.ts` ×2 with three arguments, `demoModel.ts` ×1 with two, `gateSeeding.ts` definition.
7. Report → `cycles/virgin-cycle26/04-brief-03-executor-report.md`: files, counts, the two-step BEFORE/AFTER output, tsc, diffs, deviations verbatim, and this replacement text for the coordinator's OPEN-ITEMS entry at `OPEN-ITEMS.md:248-251`: "**Stacked gate ticks on retraced ground.** Seeding now slides sector gates ≥ 60 m (chainage) off retraced ground when the ±250 m window allows (`seedGateChainages` 3rd argument, `overlapChainages`); the editor's map tap cycles through stacked gates (`nextGateOnTap`). Still open: two ticks on one pixel look like one on the live/browse map (cosmetic), and START/FINISH on a pure out-and-back always share a spot."

## 7. Acceptance

- Suite zero FAIL, +5; tsc exit 0; `demo_suite` and existing `gateseeding_suite` tests unedited and passing.
- `gateSeeding.ts` header line 17 still true (no import added).
- `git diff -- app/src/ui/wayMapView.tsx`: exactly the import line and the handler; `gateSelect` prop type (`:304`) unchanged; `gateAdjustCard.tsx` unchanged.
- `demoModel.ts` unchanged.
- No new string; `ui-strings.allow.json` unchanged.

## 8. Non-goals

- No re-seeding of existing gate sets; no change to START/FINISH fractions; no change to `stopChainageM`'s projection (`userRefs.ts:96-100`, plan §4).
- No drawing change for stacked ticks on the live/browse map.
- `demoModel.ts`, `gateAdjustCard.tsx`, `GateAdjustScreen.tsx`, `catalogMapView.tsx` untouched.

## 9. For the Inspect pass

Rerun §6-7. Mutate-check the seeding test by reasoning: with `OVERLAP_CLEAR_M` ignored in `clear`, the expected `[16, 560, 800, 1040, 1584]` becomes `[16, 400, 800, 1200, 1584]`. Check `overlapChainages`' inner loop skips `|Δch| ≤ gapM` BEFORE the distance test (so a vertex's own neighbours never count), and that the `w2` comparison is `<=`. Check that `nextGateOnTap` with `selected` not in the stack returns `sorted[0]` (not `sorted[1]`). Check the handler's `hits` map keeps `-1` for unknown names and that `nextGateOnTap` drops them. Confirm `wayMapView.tsx` has no other hunk and that `gateAdjustModel.ts` still has no import (the UI file now imports it; a cycle would be a finding).
