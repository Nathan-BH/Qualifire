# Brief 05 — Fix the Opus inspect findings on briefs 01 + 02 (M1 "new loop" title, M2 pass pick vs the corridor, test gaps)

Written by the Plan tier (Fable) 2026-10-08 ~01:30 UTC from `inspect-report-01-02.md` (fresh-context Opus, VERDICT FAIL), `05-plan.md` (D4-D6, D13), `RULINGS.md`, briefs 01/02 and a spot-read of every source line anchored below in the working tree with briefs 01 and 02 applied, uncommitted (suite `931 tests: 928 pass, 0 fail, 3 skip`, tsc exit 0). Every edit and every test below was prototyped on a scratch copy of that tree: all 9 new tests PASS after the edits, each fails under the mutation it is meant to catch (§5), the whole suite is zero FAIL and `tsc --noEmit` exits 0. Executor: Sonnet, alone. Read `EXECUTOR-RULES.md` first, then all of this. Nathan's rulings bind: **no warnings, blocks, banners, alerts, sub-labels or disabled states; zero new rider-facing strings** (the cycle's only new word, `loop`, already landed with brief 01 and this brief adds no string and no allow-list entry).

## 0. Rules

- **STOP-ON-AMBIGUITY.** A quoted anchor not at its line or within ±15 lines with no other plausible match, a python replacement matching 0 or 2+ times, a §5 test not behaving as predicted BEFORE or AFTER, any check failing for a reason not anticipated here → STOP, write what you found verbatim into `cycles/virgin-cycle26/06-brief-05-executor-report.md` under `## STOPPED`, return.
- **Rider-facing text: ZERO new strings.** `git diff -- app/tests/ui-strings.allow.json` must be empty at the end. If the `ui_strings` suite reports anything, STOP.
- **Parity discipline (`app/core`):** edit exactly the lines quoted in §4.1-4.2; `nearestOnSegments`, `nearestVertex`, `CORRIDOR_M`, `PASS_GAP_M`, `GateDetector`, `DEFAULT_LIVE_OPTIONS`, the window arithmetic (`sp - 60` / `sp + 240`, `windowBack` / `windowFwd`) and `crossTime` are NOT modified. Every pre-existing test (incl. brief 01's 5 and brief 02's 8) must pass UNEDITED. Editing an existing test is forbidden.
- Do NOT touch `RecordScreen.tsx` (brief 01's six hunks are inspected as-is), `location/index.ts` (the PickEvent writer stays verbatim: rides already on the phone carry `'~new'`, so the fix has to be on the READ side), `catalogDeleteActions.ts`, any other brief, `run.ts`, `IDEAS.md`, `STATE.md`, `OPEN-ITEMS.md`.
- Never delete; no commit; no publish; no dependency; `GIT_OPTIONAL_LOCKS=0`. Strip-only TS (RULINGS R1). Const-literal comparisons (RULINGS 2026-10-08): the supplied test code already widens the one such operand (`(NEW_ID as string) !== LOOP_ID`); do not "simplify" it back.
- Large heredocs crash device_bash: write the appended blocks with python in chunks (EXECUTOR-RULES).

## 1. Purpose and the two decisions

**M1 (brief 01, MAJOR).** `RidesScreen.tsx:141` and `RideDetailScreen.tsx:226` decide "loop" from the logged PickEvent as `!!pick.from && pick.from === pick.to`. Brief 01 §2 assumed `'~new'` is never logged; that holds for `ridePickRef` but NOT for the persisted pick event, which `src/location/index.ts:469` writes verbatim from `startContext` (`from: ctx.from, to: ctx.to`), and `startContextRef` carries `fromId` / `toId`, which are both `'~new'` on a blank-install `new → new` free ride. Result: every such ride (new ones AND every past one on the phone) is titled **`new loop`** instead of `new → new`. Repro: `routeTitle('new', 'new', !!'~new' && '~new' === '~new')` → `"new loop"`.

*Decision M1:* the guard lives in ONE pure helper, not at the two call sites. `recordFlow.ts` (pure, import-free, already the home of the sentinel semantics: `LOOP_ID`, `resolveGoingTo`, `routeForEndpoints`) gains `export const NEW_ID = '~new'` (a mirror of RecordScreen's module-local const, pinned together by a test) and `pickedLoop(from, to)` = `!!from && from !== NEW_ID && from === to`. Both pick-event call sites use it. The other five `routeTitle` call sites derive `loop` from `Route.startLandmarkId === Route.endLandmarkId` (a Route never has a sentinel id) or, on RECORD, already guard `toId !== NEW_ID`; checked, no change. Real-landmark loops (`from = to = 'lm:home'`) still title `Home loop`; a stale pre-cycle26 ride whose pick had `to === from` on a real place is a loop by D2 and titles as one; older sidecars with missing `from`/`to` are never a loop (unchanged). RecordScreen is NOT edited (its `const NEW_ID = '~new';` at `:133` stays; importing it would add a seventh hunk to a file the re-inspect counts).

**M2 (brief 02, MAJOR design).** `passVertex` (`core/src/projection.ts:96-136`) takes as candidates every vertex within `nearest distance + CORRIDOR_M` (40 m) of the fix and then picks a PASS by chainage context. Both re-acquisition callers accept the result only if `dist <= corridor` (`live.ts:113`, `projection.ts:177`). So with two passes 30-45 m apart (parallel streets one block apart) the context can select a pass the caller then rejects — the rider is never re-acquired (Opus case A: live final chainage 0, offline end 0 instead of 2039) — or select a pass that IS within the corridor but is not where the rider is, so the offline projector runs the whole return leg backwards along the outbound street (case B). The brief 02 fixtures only ever had the second pass 1-5 m away.

*Decision M2 (Opus's options (a) and (b) combined, both needed):*
1. **Ambiguity band `PASS_AMBIGUITY_M = 15`** replaces `CORRIDOR_M` as the candidate radius around the nearest distance: two passes are only ambiguous when their nearest vertices are within 15 m of each other in distance to the fix — the two sides of one street (a few metres) plus GPS jitter. A pass 15+ m further away than the nearest is where the rider is NOT, whatever the chainage context says, so parallel streets ≥ 30 m apart are never confused (fixes case B, where both passes are inside the corridor). The brief 02 rule is otherwise unchanged: inside the band, the pass nearest `nearS` wins (earliest with no context) — a genuine retrace 1-5 m apart still anchors on the earliest pass and re-acquires on the pass the rider was on.
2. **Cap at the caller's acceptance distance:** a new last parameter `within = CORRIDOR_M`; when the nearest vertex is inside `within`, candidates are additionally capped at `within`, so a pass the caller would reject is never preferred over one it accepts (fixes case A and closes the only remaining inconsistency, nearest at 26-40 m with the other pass at 41-55 m). When the nearest vertex is outside `within` nothing is acceptable anyway: the band alone applies (the anchor callers never reject, and a far first fix on a loop must still anchor on the earliest pass — plan risk (a)). All four call sites pass their own corridor (`o.corridor` live, `corridor` offline) so the pick and the acceptance rule are the same number by construction.
3. Single-pass references stay byte-identical: the nearest vertex is always a candidate (`dMax >= near.dist`), one run = one pass, same strict `<` on `d2`, same iteration order ⇒ `passVertex` returns `nearestVertex`'s index. Verified by brief 02's equality test and by `engine_suite.ts` passing unedited. Performance: unchanged shape (one `nearestVertex` + one pass over the vertices), fewer candidates.

Rejected: (b) alone (leaves case A's rejected-pick inconsistency at the corridor edge); (a) alone (case B: both passes inside the corridor, the wrong one 30 m away still wins by context); making the live range `[sp, sp+bound]` smarter (the range already excludes earlier passes; in live, `nearS = sp` ≡ "earliest in range", see §9).

**Test gaps (Opus m3, m4).** This brief adds 9 tests: 5 in `live_suite.ts` (parallel-street fixture through `LiveProjector`, `projectRideOffline` AND the `LiveEngine`; the live re-acquisition call site; the tie rule on a hand-built two-pass line; the band and the cap as unit assertions), 2 in `recordflow_suite.ts` (`pickedLoop` + the exact logged `new → new` event; source pins for RidesScreen / RideDetailScreen), 1 in `catalogmap_suite.ts` (`catalogMapModel.ts:43`), 1 in `routecreation_suite.ts` (`routeFromRide.ts:197` `existingRouteProps`). Each fails under its mutation (§5).

**m5 (brief text, no change):** brief 01 §7 says `grep -n "LOOP_ID" RecordScreen.tsx` gives exactly 2 lines; it gives 3 because brief 01 §4.2(b) itself supplies the comment "`to` may be the LOOP_ID sentinel" at `:1153`. The code is right; the acceptance line was inconsistent. For the inspector: expect 3 (import, comment, pill).

## 2. Verified anchors (working tree 2026-10-08 ~01:20 UTC, briefs 01 + 02 applied)

- `app/core/src/projection.ts:12` `export const CORRIDOR_M = 40.0;`; `:82` `export const PASS_GAP_M = 120;` followed by a blank line and the `/**\n * Pass-aware vertex pick (virgin-cycle26 brief 02).` doc comment (`:84-95`), whose lines `:85-86` read exactly:
  ```
   * chainage in [sLo, sHi], take those within (nearest distance + CORRIDOR_M)
   * of the fix, split them into passes (consecutive candidates > PASS_GAP_M
  ```
  `:96-98`:
  ```
  export function passVertex(
    px: number, py: number, ref: RefLine, sLo = -Infinity, sHi = Infinity, nearS = -Infinity,
  ): { index: number; dist: number } {
  ```
  `:102` `  const dMax2 = (near.dist + CORRIDOR_M) * (near.dist + CORRIDOR_M);`; `:111` `    if (score < bestScore) {` (the tie rule, NOT edited); `passVertex`'s closing `}` at `:136`; `:150` `  let sp = ch[passVertex(x[0], y[0], ref).index];` (inside `projectRideOffline(x, y, ref, corridor = CORRIDOR_M)`, `:143-145`); `:176` `        const nv = passVertex(x[i], y[i], ref, -Infinity, Infinity, sp);`; `:177` `        if (nv.dist <= corridor) {`.
- `app/core/src/live.ts:34` `import { CORRIDOR_M, nearestOnSegments, passVertex } from './projection.ts';`; `:88` `    const o = this.opt;`; `:90` `      this.sp = ch[passVertex(x, y, this.ref).index];`; `:112` `      const nv = passVertex(x, y, this.ref, this.sp, this.sp + bound, this.sp);`; `:113` `      if (nv.index >= 0 && nv.dist <= o.corridor) {`. `DEFAULT_LIVE_OPTIONS` (`:46-53`): `corridor: CORRIDOR_M`, `windowBack: 30`, `windowFwd: 240`, `lostBeforeReacq: 5`, `reacqForwardM: 400`, `vMaxReacq: 15`.
- `app/src/ui/recordFlow.ts` — pure, NO `import` lines; 176 lines; ends with `routeForEndpoints` (`…  return routes.find((r) => r.startLandmarkId === fromId && r.endLandmarkId === toId);\n}\n`). `LOOP_ID` at `:150`.
- `app/src/ui/RidesScreen.tsx:19` `import { routeTitle, wayLabelIn } from '../store/defaultWay';` (no `.ts` extensions in this file); `:141` `              updates.set(m.rideId, routeTitle(pick.fromLabel, pick.toLabel, !!pick.from && pick.from === pick.to));`.
- `app/src/ui/RideDetailScreen.tsx:47` `import { routeTitle, wayLabelIn } from '../store/defaultWay.ts';` (`.ts` extensions in this file); `:226` `          setPickLabel(pick && pick.fromLabel && pick.toLabel ? routeTitle(pick.fromLabel, pick.toLabel, !!pick.from && pick.from === pick.to) : null);`.
- `app/src/ui/RecordScreen.tsx:133` `const NEW_ID = '~new';` — NOT edited, pinned by a test. `app/src/location/index.ts:469` `...(ctx ? { from: ctx.from, to: ctx.to, fromLabel: ctx.fromLabel, toLabel: ctx.toLabel, pickSource: ctx.pickSource } : {}),` — NOT edited.
- `app/src/ui/catalogMapModel.ts:42-44` `routeLabel` via `routeTitle(…, r.startLandmarkId === r.endLandmarkId)`; `app/src/store/routeFromRide.ts:197` `    label: routeTitle(lab(w.startLandmarkId), lab(w.endLandmarkId), w.startLandmarkId === w.endLandmarkId),` — both NOT edited, only tested.
- `app/tests/live_suite.ts:19` `  nearestVertex, passVertex, projectRideOffline, PASS_GAP_M, crossTime,` (inside the core import, brief 02's addition); `RefLine` is already imported as a type (`:18`); `LiveProjector`, `numEq`, `buildSyntheticRef`, `SYN_L`, `OB_REF`, `OB_LONG_REF`, `TrackSpec`, `runEngine` (brief 02 block) are in scope; the file (1225 lines) ends with brief 02's live-vs-offline test (`…  }\n});\n`).
- `app/tests/recordflow_suite.ts:9-13`:
  ```
  import {
    canTransition, effectiveFromId, endingSlotFor, isFullscreen, liveMapOverlayFor, namingOfferMode, recordPressAction, type RecordPhase,
    wayHintForPick, interruptedRideAction, INTERRUPTED_MIN_FIXES,
    LOOP_ID, resolveGoingTo, routeForEndpoints,
  } from '../src/ui/recordFlow.ts';
  ```
  `fs`, `path`, `TESTS_DIR` imported at `:6-8`; the file (680 lines) ends with brief 01's source-pin test (`…'no loop alert / flash on RECORD');\n});\n`).
- `app/tests/catalogmap_suite.ts` (237 lines): `fixture()` (`:50-66`) has `route('rLoop', 'H', 'H', ['w5'], 'x')`, `route('rWH', 'W', 'H', ['w3'])`, landmark `H` labelled `Home`, `W` labelled `Work`; `placeFocusModel`, `routeFocusModel` imported at `:10-13`; ends with the `Credit(` test.
- `app/tests/routecreation_suite.ts` (1426 lines): `wphSetup()` (`:770-786`), `wphUserCatalog()` (`:751-765`: landmarks `wph-a`, `wph-b` labelled by their ids, route `wph-a>wph-b`, way `WphRoute`, one gateSet), `wphCatalogStore` (`:697`), `wphRouteFromRide` (`:700`); `validateCatalog` requires a `loopDiscriminator` on a loop route and at least one way per route; ends with `…'other rides untouched');\n});\n`.
- `app/tests/run.ts` already imports all four suites. **Do not edit `run.ts`.**

## 3. Files (complete list)

1. `app/core/src/projection.ts` — `PASS_AMBIGUITY_M`; `passVertex` doc comment (2 lines), signature (+1 line), candidate radius (1 → 6 lines); two call sites in `projectRideOffline` gain the `corridor` argument.
2. `app/core/src/live.ts` — two call sites gain `o.corridor`.
3. `app/src/ui/recordFlow.ts` — `NEW_ID`, `pickedLoop` appended.
4. `app/src/ui/RidesScreen.tsx` — one import line + line 141.
5. `app/src/ui/RideDetailScreen.tsx` — one import line + line 226.
6. `app/tests/live_suite.ts` — import extended; five tests appended.
7. `app/tests/recordflow_suite.ts` — import extended + one import line; two tests appended.
8. `app/tests/catalogmap_suite.ts` — one test appended.
9. `app/tests/routecreation_suite.ts` — one test appended.

## 4. Edits (python read-modify-write on the exact quoted text; each old text must match exactly once)

### 4.1 `core/src/projection.ts`

(a) After `export const PASS_GAP_M = 120;\n` (`:82`) insert (keep the blank line that follows it in place, i.e. replace `export const PASS_GAP_M = 120;\n` with itself + the block):

```ts

/** virgin-cycle26 brief 05: two passes are AMBIGUOUS for a fix only when
 * their nearest vertices are within this many metres of each other in
 * distance to the fix -- the two sides of one street (a few metres apart)
 * plus GPS jitter. A pass this much further away than the nearest one is
 * where the rider is NOT: parallel streets one block apart (>= 30 m) are
 * never confused, whatever the chainage context says. */
export const PASS_AMBIGUITY_M = 15;
```

(b) Doc comment lines `:85-86` (quoted in §2) →
```
 * chainage in [sLo, sHi], take those within PASS_AMBIGUITY_M of the nearest
 * distance -- capped at `within`, the caller's own acceptance distance, when
 * the nearest vertex is inside it (brief 05) -- split them into passes
 * (consecutive candidates > PASS_GAP_M
```

(c) Signature: replace
```
  px: number, py: number, ref: RefLine, sLo = -Infinity, sHi = Infinity, nearS = -Infinity,
): { index: number; dist: number } {
```
with
```
  px: number, py: number, ref: RefLine, sLo = -Infinity, sHi = Infinity, nearS = -Infinity,
  within = CORRIDOR_M,
): { index: number; dist: number } {
```

(d) Replace `  const dMax2 = (near.dist + CORRIDOR_M) * (near.dist + CORRIDOR_M);` with
```ts
  // Candidates: the ambiguity band around the nearest vertex, capped at the
  // caller's own acceptance distance when the nearest vertex is inside it
  // (a pass the caller would reject is never preferred over one it accepts).
  const band = near.dist + PASS_AMBIGUITY_M;
  const dMax = near.dist <= within ? Math.min(band, within) : band;
  const dMax2 = dMax * dMax;
```

(e) `  let sp = ch[passVertex(x[0], y[0], ref).index];` → `  let sp = ch[passVertex(x[0], y[0], ref, -Infinity, Infinity, -Infinity, corridor).index];`

(f) `        const nv = passVertex(x[i], y[i], ref, -Infinity, Infinity, sp);` → `        const nv = passVertex(x[i], y[i], ref, -Infinity, Infinity, sp, corridor);`

After (a)-(f): `passVertex`'s closing `}` is at `:152`, the `Offline projection of a whole ride` doc comment at `:154-157` (brief 03's insert point moves accordingly, see EXECUTION-ORDER); `:111` `if (score < bestScore) {` is now `:129`, text unchanged; `nearestVertex` (`:55-73`) and `CORRIDOR_M` byte-identical.

### 4.2 `core/src/live.ts`

- `      this.sp = ch[passVertex(x, y, this.ref).index];` → `      this.sp = ch[passVertex(x, y, this.ref, -Infinity, Infinity, -Infinity, o.corridor).index];` (`o` is defined two lines above, `:88`.)
- `      const nv = passVertex(x, y, this.ref, this.sp, this.sp + bound, this.sp);` → `      const nv = passVertex(x, y, this.ref, this.sp, this.sp + bound, this.sp, o.corridor);`

Import line `:34` and the header comment: unchanged. `git diff -- app/core/src/live.ts` = exactly these two one-line hunks.

### 4.3 `src/ui/recordFlow.ts` — append at the END of the file (after `routeForEndpoints`'s closing `}`), preceded by one blank line:

```ts
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
```

`grep -n "^import" app/src/ui/recordFlow.ts` stays empty.

### 4.4 `src/ui/RidesScreen.tsx`

- After `import { routeTitle, wayLabelIn } from '../store/defaultWay';\n` insert the line `import { pickedLoop } from './recordFlow';`
- `              updates.set(m.rideId, routeTitle(pick.fromLabel, pick.toLabel, !!pick.from && pick.from === pick.to));` → `              updates.set(m.rideId, routeTitle(pick.fromLabel, pick.toLabel, pickedLoop(pick.from, pick.to)));`

### 4.5 `src/ui/RideDetailScreen.tsx`

- After `import { routeTitle, wayLabelIn } from '../store/defaultWay.ts';\n` insert the line `import { pickedLoop } from './recordFlow.ts';`
- `          setPickLabel(pick && pick.fromLabel && pick.toLabel ? routeTitle(pick.fromLabel, pick.toLabel, !!pick.from && pick.from === pick.to) : null);` → `          setPickLabel(pick && pick.fromLabel && pick.toLabel ? routeTitle(pick.fromLabel, pick.toLabel, pickedLoop(pick.from, pick.to)) : null);`

After 4.4-4.5: `grep -rn "pick.from === pick.to" app/src` → nothing; `grep -rn "pickedLoop(" app/src` → the definition + exactly two call sites.

### 4.6 `tests/live_suite.ts`

(a) Line 19 `  nearestVertex, passVertex, projectRideOffline, PASS_GAP_M, crossTime,` → `  nearestVertex, passVertex, projectRideOffline, PASS_GAP_M, crossTime, PASS_AMBIGUITY_M, CORRIDOR_M,` (if `CORRIDOR_M` is already imported anywhere in the file, STOP — it is not, as of this writing).

(b) Append at the END of the file, preceded by two blank lines:

```ts
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
```

### 4.7 `tests/recordflow_suite.ts`

(a) Replace
```
  LOOP_ID, resolveGoingTo, routeForEndpoints,
} from '../src/ui/recordFlow.ts';
```
with
```
  LOOP_ID, resolveGoingTo, routeForEndpoints, NEW_ID, pickedLoop,
} from '../src/ui/recordFlow.ts';
import { routeTitle } from '../src/store/defaultWay.ts';
```

(b) Append at the END of the file, preceded by two blank lines:

```ts
// ------------------------------------------------ virgin-cycle26 brief 05
test('virgin-cycle26 05: pickedLoop -- a logged new → new ride is not a loop; the same real place at both ends is; missing fields never are', () => {
  assert(NEW_ID === '~new', `recordFlow NEW_ID ${NEW_ID}`);
  assert((NEW_ID as string) !== LOOP_ID, 'sentinels differ');
  const rs = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'RecordScreen.tsx'), 'utf8');
  assert(rs.includes("const NEW_ID = '~new';"), "RecordScreen's module-local NEW_ID must stay the same literal as recordFlow's");
  assert(!pickedLoop('~new', '~new'), 'new → new (blank-install first ride, logged verbatim) is NOT a loop');
  assert(pickedLoop('home', 'home'), 'Home → Home is a loop');
  assert(!pickedLoop('home', 'work'), 'an ordinary pair');
  assert(!pickedLoop('home', '~new'), 'home → new');
  assert(!pickedLoop('~new', 'home'), 'new → home');
  assert(!pickedLoop(undefined, undefined) && !pickedLoop(null, null) && !pickedLoop('home', undefined), 'missing fields (older sidecars) are never a loop');
  // The exact PickEvent location/index.ts logs for a blank-install free ride
  // (from = to = '~new', labels 'new'): titled as before, not "new loop".
  const pick = { from: '~new', to: '~new', fromLabel: 'new', toLabel: 'new' };
  assert(routeTitle(pick.fromLabel, pick.toLabel, pickedLoop(pick.from, pick.to)) === 'new → new', `logged new → new ride: ${routeTitle(pick.fromLabel, pick.toLabel, pickedLoop(pick.from, pick.to))}`);
  const home = { from: 'lm:home', to: 'lm:home', fromLabel: 'Home', toLabel: 'Home' };
  assert(routeTitle(home.fromLabel, home.toLabel, pickedLoop(home.from, home.to)) === 'Home loop', 'a logged Home loop ride');
});

test('virgin-cycle26 05: RIDES and ride detail derive the pick-event title through pickedLoop, never from a raw from === to', () => {
  for (const [file, ext] of [['RidesScreen.tsx', ''], ['RideDetailScreen.tsx', '.ts']] as [string, string][]) {
    const src = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', file), 'utf8');
    assert((src.match(/routeTitle\(pick\.fromLabel, pick\.toLabel, pickedLoop\(pick\.from, pick\.to\)\)/g) ?? []).length === 1, `${file}: exactly one pick-event title through pickedLoop`);
    assert(!src.includes('pick.from === pick.to'), `${file}: no raw from === to loop test`);
    assert(!/\$\{pick\.fromLabel\} → \$\{pick\.toLabel\}/.test(src), `${file}: no hand-written arrow title`);
    assert(src.includes(`import { pickedLoop } from './recordFlow${ext}';`), `${file}: imports pickedLoop`);
  }
});
```

### 4.8 `tests/catalogmap_suite.ts` — append at the END, preceded by two blank lines:

```ts
// ------------------------------------------------ virgin-cycle26 brief 05
test('virgin-cycle26 05: MAP titles a loop route "<Place> loop" in the place focus rows and as the route focus label', () => {
  const d = fixture();
  const place = placeFocusModel('H', d)!;
  const loopRow = place.rows.find((r) => r.routeId === 'rLoop')!;
  assert(loopRow.label === 'Home loop', `place focus loop row: ${loopRow.label}`);
  assert(place.rows.find((r) => r.routeId === 'rWH')!.label === 'Work → Home', 'a pair row is unchanged');
  const focus = routeFocusModel('rLoop', d)!;
  assert(focus.label === 'Home loop', `route focus label: ${focus.label}`);
  assert(!focus.label.includes('→'), 'no arrow in a loop title');
});
```

### 4.9 `tests/routecreation_suite.ts` — append at the END, preceded by two blank lines:

```ts
// ------------------------------------------------ virgin-cycle26 brief 05
test('virgin-cycle26 05: existingRouteProps (naming card) titles a loop route "<Place> loop" and a pair "<From> → <To>"', async () => {
  await wphSetup();
  const c = wphUserCatalog();
  c.routes.push({ id: 'wph-a>wph-a', startLandmarkId: 'wph-a', endLandmarkId: 'wph-a', wayIds: ['WphLoop'], loopDiscriminator: 'loop:test' });
  c.ways.push({ id: 'WphLoop', routeId: 'wph-a>wph-a', refLineId: 'WphLoop', gateSetVersion: 1, seeded: false, specs: ['Dry'] });
  c.gateSets.push({ wayId: 'WphLoop', version: 1, chainageM: [50, 500, 1000, 1500, 1950], createdAtMs: 0 });
  const errs = await wphCatalogStore.saveUserCatalog(c);
  await wphCatalogStore.flushCatalogWrites();
  assert(errs.length === 0, `loop catalog must save clean, got ${errs.join('; ')}`);
  const loop = wphRouteFromRide.existingRouteProps('wph-a>wph-a');
  assert(loop !== null && loop.label === 'wph-a loop', `loop label: ${JSON.stringify(loop)}`);
  assert(loop!.knownSpecLists.length === 1 && loop!.knownSpecLists[0].join() === 'Dry', `loop spec lists: ${JSON.stringify(loop!.knownSpecLists)}`);
  const pair = wphRouteFromRide.existingRouteProps('wph-a>wph-b');
  assert(pair !== null && pair.label === 'wph-a → wph-b', `pair label: ${JSON.stringify(pair)}`);
});
```

## 5. Expected behaviour BEFORE and AFTER (verify both; a mismatch is a STOP)

BEFORE = all of §4.6-4.9 applied, §4.1-4.5 NOT yet applied. Two of the new tests cannot even import yet (`PASS_AMBIGUITY_M`, `NEW_ID`, `pickedLoop` are not exported): for the BEFORE run, stub them at the top of each appended block instead of importing them (`const PASS_AMBIGUITY_M = 15; const CORRIDOR_M = 40;` in live_suite — leave both out of the import for this run; `const NEW_ID = '~new'; const pickedLoop = (from: string | null | undefined, to: string | null | undefined) => !!from && from === to;` in recordflow_suite — leave both out of the import), run, record the FAIL lines verbatim, then remove the stubs and restore the real imports before applying §4.1-4.5.

| test | BEFORE (current tree + stubs) | AFTER |
|---|---|---|
| 05 passVertex never prefers a rejected pass… | FAIL `(500,42) [0,3000] nearS 0: ch 500 dist 42 -- want the return street` | PASS |
| 05 equal pass scores keep the EARLIER pass… | PASS (the tie rule was already right; this test pins it) | PASS |
| 05 live re-acquisition after a GPS gap lands on the parallel return street… | FAIL `y=42: first on-route fix at x = -1 (want >= 570 …)` | PASS |
| 05 the LiveEngine scores a parallel-street lap… | FAIL `gate events []` | PASS |
| 05 live re-acquisition on a retraced street stays on the pass the rider was on… | PASS (brief 02's `nearS = sp` already covers it; the test exists to catch a revert to `nearestVertex`, §9) | PASS |
| 05 pickedLoop — a logged new → new ride is not a loop… | FAIL `new → new (blank-install first ride, logged verbatim) is NOT a loop` | PASS |
| 05 RIDES and ride detail derive the pick-event title through pickedLoop… | FAIL `RidesScreen.tsx: exactly one pick-event title through pickedLoop` | PASS |
| 05 MAP titles a loop route "<Place> loop"… | PASS (brief 01 already changed `catalogMapModel.ts`; the test pins it — mutate-check in §9) | PASS |
| 05 existingRouteProps (naming card) titles a loop route… | PASS (same: pins brief 01's `routeFromRide.ts:197` — mutate-check in §9) | PASS |
| every pre-existing test (931) | PASS | PASS, unedited |

Suite count AFTER: `940 tests: 937 pass, 0 fail, 3 skip` (931 + 9). If any AFTER test fails, STOP and report the assertion text with the printed numbers verbatim.

## 6. Steps

1. `GIT_OPTIONAL_LOCKS=0 git status --short` (expect briefs 01/02's 16 app files modified); baseline `cd app && node --experimental-strip-types tests/run.ts | tail -1` → `931 tests: 928 pass, 0 fail, 3 skip`.
2. BEFORE: §4.6(b), 4.7(b), 4.8, 4.9 with the §5 stubs (NOT the import edits) → run → `940 tests: 928 pass, 5 fail, 3 skip`; record the five FAIL lines verbatim (they must be the five FAIL rows of §5, same messages). Remove the stubs; apply §4.6(a) and §4.7(a).
3. Apply §4.1 (a)-(f), §4.2, §4.3, §4.4, §4.5.
4. `cd app && node --experimental-strip-types tests/run.ts` → `940 tests: 937 pass, 0 fail, 3 skip`; grep the output for `FAIL` → none.
5. `cd app && ./node_modules/.bin/tsc --noEmit` (timeout_ms 180000, tee `cycles/virgin-cycle26/06-brief-05-tsc.log`) → exit 0, empty output.
6. `GIT_OPTIONAL_LOCKS=0 git diff --stat` → briefs 01/02's files plus exactly the nine of §3 (seven of which — `projection.ts`, `live.ts`, `recordFlow.ts`, `RidesScreen.tsx`, `RideDetailScreen.tsx`, `live_suite.ts`, `recordflow_suite.ts` — were already modified by briefs 01/02; `catalogmap_suite.ts` and `routecreation_suite.ts` are new in the list). `git diff -- app/tests/ui-strings.allow.json` = brief 01's one entry only (unchanged by you). Checks: `grep -rn "pick.from === pick.to" app/src` → none; `grep -rn "pickedLoop(" app/src` → 3 lines (definition `recordFlow.ts`, `RidesScreen.tsx`, `RideDetailScreen.tsx`); `grep -n "^import" app/src/ui/recordFlow.ts` → none; `grep -n "near.dist + CORRIDOR_M" app/core/src/projection.ts` → none; `grep -n "passVertex(" app/core/src/*.ts` → definition + 4 call sites, each ending in its corridor argument.
7. Report → `cycles/virgin-cycle26/06-brief-05-executor-report.md`: files touched (yours only, attributed), counts before/after, the BEFORE FAIL lines verbatim, tsc result, the grep outputs, deviations verbatim. Hand this line to the coordinator for OPEN-ITEMS (you do not edit OPEN-ITEMS): "Pass pick vs corridor (virgin-cycle26 brief 05): `passVertex` candidates are the nearest distance + 15 m (`PASS_AMBIGUITY_M`), capped at the caller's corridor; parallel streets ≥ 30 m apart are never confused. Still open: two passes within 15 m of each other in distance AND < 240 m apart in chainage stay ambiguous inside the window (plan D5)."

## 7. Acceptance

- Suite `940 tests: 937 pass, 0 fail, 3 skip`; tsc exit 0; every pre-existing test unedited (diffs of the four test files are pure appends + the two import edits).
- `git diff -- app/core/src/projection.ts` = the `PASS_AMBIGUITY_M` block, 2 doc-comment lines → 4, the signature line, the 1 → 6 line candidate radius, and the two `corridor` arguments; `nearestVertex`, `nearestOnSegments`, `CORRIDOR_M`, `PASS_GAP_M`, the window (`sp - 60`, `sp + 240`), the tie rule `score < bestScore` unchanged.
- `git diff -- app/core/src/live.ts` = two one-line hunks (`o.corridor` at the anchor and the re-acquisition).
- `git diff -- app/src/ui/RidesScreen.tsx` and `RideDetailScreen.tsx` (your part) = one import line + one body line each; `RecordScreen.tsx` untouched by you (still six hunks).
- `recordFlow.ts` import-free; `NEW_ID === '~new'` there and `const NEW_ID = '~new';` still at `RecordScreen.tsx:133`.
- No new string anywhere; `ui-strings.allow.json` not touched by this brief.

## 8. Non-goals

- No change to the PickEvent writer (`location/index.ts`), the PickEvent type, the sidecar decoder, `rideHistoryModel.ts`, `feedModel.ts`, `catalogDeleteActions.ts` (plan §8 deferral stands), `RecordScreen.tsx`.
- No change to `nearestOnSegments`, the windowed projection, `GateDetector`, `FINISH_FRAC`, `armWithinM`, `DEFAULT_LIVE_OPTIONS`; no monotonic offline projector; no FINISH guard; no heading-aware matching (plan §4).
- No "loop detected" flag, diagnostic, event, alert, sub-label or string (ruling 1).
- Briefs 03 and 04 are not started here (EXECUTION-ORDER).

## 9. For the Inspect pass (fresh Opus re-inspect of 01 + 02 + 05 together)

- Rerun §6-7. Mutate-checks on a COPY under `safe_to_delete/` (each alone; the expected new-test FAILs were observed on the Plan tier's scratch copy):
  | mutation | FAILs among the 05 tests |
  |---|---|
  | `const dMax = near.dist + CORRIDOR_M;` (brief 02 state) | passVertex-never-prefers (`(500,42)… ch 500 dist 42`), live re-acq parallel (`y=42: first on-route fix at x = -1`), LiveEngine parallel (`gate events []`) |
  | `PASS_AMBIGUITY_M = 40` | passVertex-never-prefers (`(500,30) nearS 0: ch 500`), live re-acq parallel (`y=30: offline ran backwards by 5 m`) |
  | `const dMax = band;` (no cap) | passVertex-never-prefers (`cap: ch 1568.6 dist 42.0`) |
  | `score < bestScore` → `<=` | tie test (`tie: ch 455 dist 3`) |
  | `live.ts` re-acq → `nearestVertex(x, y, this.ref, this.sp, this.sp + bound)` | retraced-street live re-acq (`live rejoin chainage 2354.1 … jumped onto the return copy`) |
  | offline re-acq → `nearestVertex(x[i], y[i], ref)` | brief 02's detour test + retraced-street test (`offline rejoin chainage 2354.1`) |
  | `pickedLoop` without `from !== NEW_ID` | pickedLoop test (`new → new … is NOT a loop`) |
  | RidesScreen / RideDetailScreen back to `!!pick.from && pick.from === pick.to` | source-pin test |
  | `catalogMapModel.ts:43` back to the arrow template | MAP test (`place focus loop row: Home → Home`) |
  | `routeFromRide.ts:197` back to the arrow template | existingRouteProps test (`loop label: {"label":"wph-a → wph-a",…}`) |
- Two mutations are behaviour-PRESERVING and therefore uncatchable by design, not test gaps: (1) dropping `nearS` at `live.ts:112` (the range starts at `sp`, so "nearest to sp" and "earliest in range" coincide — the argument documents intent); (2) dropping the `corridor` / `o.corridor` arguments at any call site while the option equals `CORRIDOR_M` (default-equivalent; the arguments keep pick and acceptance the same number if the option is ever changed; the `within = 60` assertion in the first 05 test covers the parameter itself).
- Reason about the band: `dMax >= near.dist` always, so the nearest vertex is a candidate and a single-pass reference returns `nearestVertex`'s index; the hairpin < `PASS_GAP_M` is still one pass; `closeRun()` still resets `runD2`; the split still happens before the current vertex is folded in. Confirm `engine_suite.ts` (8) and every brief 02 test pass unedited.
- M1: confirm `pickedLoop` is the only loop decision read from a PickEvent; the five Route-derived `routeTitle` call sites and RECORD's `loopOn && toId !== NEW_ID` need no guard; confirm no allow-list change and no new string; `grep -n "LOOP_ID" app/src/ui/RecordScreen.tsx` = 3 lines (import, brief 01's comment at `:1153`, pill) — brief 01 §7's "exactly 2" was the brief's own slip (m5).
- Brief 03/04 anchors after this brief: see `EXECUTION-ORDER.md` (updated 2026-10-08 with brief 05).
