# Brief 06 — Fix inspect finding N1: the first-fix anchor band is the whole corridor, re-acquisition keeps the 15 m band

Written by the Plan tier (Fable) 2026-10-08 from `inspect-report-01-02-05.md` (fresh-context Opus, PASS WITH NOTES; finding N1 MAJOR and its probe `p4.ts`), `06-brief-02-engine-pass-aware.md`, `06-brief-05-fix-inspect-01-02.md`, `RULINGS.md`, `EXECUTOR-RULES.md` and a line-by-line read of `app/core/src/projection.ts` and `app/core/src/live.ts` in the working tree with briefs 01 + 02 + 05 applied, uncommitted (suite `940 tests: 937 pass, 0 fail, 3 skip`, tsc exit 0). Every edit and every test below was prototyped on a scratch copy of that tree (outside the repo): the 3 new tests FAIL before the edit with exactly the messages in §5, PASS after; the whole suite is zero FAIL; `tsc --noEmit` exits 0; each §9 mutation is caught. Executor: Sonnet, alone. Read `EXECUTOR-RULES.md` first, then all of this. Nathan's rulings bind: **no warnings, blocks, banners, alerts, sub-labels or disabled states; zero new rider-facing strings; `git diff -- app/tests/ui-strings.allow.json` stays exactly brief 01's one entry.**

## 0. Rules

- **STOP-ON-AMBIGUITY.** A quoted anchor not at its line or within ±15 lines with no other plausible match, a python replacement matching 0 or 2+ times, a §5 test not behaving as predicted BEFORE or AFTER (different FAIL set, or a different message where §5 quotes one), any check failing for a reason not anticipated here → STOP, write what you found verbatim into `cycles/virgin-cycle26/06-brief-06-executor-report.md` under `## STOPPED`, return. Never rule on it yourself.
- **Parity discipline (`app/core`):** edit exactly the lines quoted in §4.1. `nearestOnSegments`, `nearestVertex`, `CORRIDOR_M`, `PASS_GAP_M`, `PASS_AMBIGUITY_M` (stays `15`), the `within` cap line (`const dMax = …`), the tie rule `score < bestScore`, `GateDetector`, `DEFAULT_LIVE_OPTIONS`, the windows (`sp - 60` / `sp + 240`, `windowBack` / `windowFwd`), `crossTime`, `live.ts` (all of it) are NOT modified. Every pre-existing test (incl. brief 02's 8 and brief 05's 9) must pass UNEDITED. Editing an existing test is forbidden.
- Do NOT touch `live.ts`, `engine.ts`, `RecordScreen.tsx`, any `src/ui` or `src/store` file, any other brief, `run.ts`, `IDEAS.md`, `STATE.md`, `OPEN-ITEMS.md`, `EXECUTION-ORDER.md`.
- Never delete; no commit; no publish; no dependency; `GIT_OPTIONAL_LOCKS=0`. Strip-only TS (RULINGS R1). **Const-literal comparisons (RULINGS 2026-10-08):** TS2367 fires on `===`/`!==` between two literal-typed consts; the supplied test code has none (every comparison is a `number`/`string` variable against a literal). Do not add any.
- Large heredocs crash device_bash: write the appended test block with python in chunks (EXECUTOR-RULES), from this file's §4.2 text, verbatim.

## 1. Purpose and the ruling

**N1 (Opus, MAJOR design).** Brief 05 made `passVertex`'s candidate set "every vertex within `PASS_AMBIGUITY_M = 15` m of the nearest distance", for ALL four call sites. That is right for re-acquisition (the rider's last chainage is a guess; a pass 15+ m further away than the nearest is where the rider is NOT, whatever the context says — the parallel-streets fix). It is wrong for the two FIRST-FIX anchors (`live.ts:90`, `projection.ts:166`, both `nearS = -Infinity`): on a loop reference whose closing vertex is G ≥ ~20 m from its opening one (a reference ride whose first fixes settled 25 m from where it ended), a rider starting at the closing point has the end pass nearer by more than 15 m, the opening pass drops out of the candidates although it is inside the 40 m corridor, the anchor lands at ch ≈ L, FINISH fires `estimated` at the first fix and gates 0-3 are skipped — exactly plan risk (a), which brief 02 fixed and brief 05 took back for G ≥ ~20 (Opus `p4.ts` (A): G = 25/30/40 → anchor 3170/3165/3155, gates `4e`). Same root cause on a wide road whose return copy is 20-25 m away with a GPS error ≥ (D + 15)/2 toward it (`p4.ts` (B)). Not a regression against HEAD (`nearestVertex` did the same and worse) — but brief 02's fix must hold.

**Ruling (Fable).** Adopt Opus's candidate: the band is the whole corridor when there is NO chainage context, and `PASS_AMBIGUITY_M` when there is one:

```ts
  const band = near.dist + (nearS === -Infinity ? CORRIDOR_M : PASS_AMBIGUITY_M);
```

The `within` cap (`const dMax = near.dist <= within ? Math.min(band, within) : band;`) is unchanged and still applies to both. Why this is the right asymmetry, not a tuning knob:

1. **The first fix is taken AT the START pick.** Since virgin-cycle21 the START pick is the ride's one and only reference, the engine is armed with it, and an interrupted ride is never resumed (no mid-route re-arm). So at the first fix the rider is, by the app's own contract, at chainage 0 — "earliest pass" is a FACT, not a guess, and it may override the position signal anywhere inside the corridor. Forward-only projection recovers from a too-early anchor and never from a too-late one (brief 02's doc comment), which is the same bet. A rider who starts recording mid-route on the return copy of a street whose outbound copy is < 40 m away is anchored on the outbound copy and lost until GPS carries them out of its corridor — that is NOT an app flow (there is no "join a route partway"), HEAD already lost that rider whenever the outbound copy was the nearer one (Opus `p1`/`p2`, our probe (C): y ≤ 22 lost at HEAD and after brief 05; y ≤ 39 after this brief), and brief 05's own hazard-(2) case `(500, 42)` (outbound copy 42 m away, outside the corridor) still anchors on the return copy because the `within` cap excludes it — verified (§5, the `capped` assertion).
2. **Re-acquisition has a GUESSED context** (`nearS = sp`, the last chainage, after ≥ 5 off-corridor fixes). There the position signal must win when it is clear: 15 m stays (brief 05's parallel-streets tests `(500,30) nearS 0` and `y=30` pin it; mutation `always 40` fails both). Residual, documented and accepted: on a wide road with the return copy D = 20-25 m away, a re-acquisition fix ≥ (D + 15)/2 m toward the far side (18 m for D = 20) still flips onto the return copy — the 15 m band cannot tell a 20 m-wide road from two streets, and widening it reopens brief 05's case B. Not fixed here; OPEN-ITEMS line in §6.7.
3. **The corridor is the limit for the anchor too.** A loop whose closing vertex is > `CORRIDOR_M` from its opening one is not closing on its start by the app's own measure (`CORRIDOR_M` is what "on the route" means); the `within` cap keeps the nearest pass there (G = 45 → end pass, pinned in §4.2 so a future "no cap for the anchor" change is a deliberate one). Likewise a first fix > 40 m from the opening pass (10 m past the closing point of a G = 38 loop) still anchors at the end — the rider is off-route at the start by more than the corridor; HEAD identical.
4. **Single-pass references are byte-identical** (`dMax >= near.dist`, one run, same `<` on `d2`, same order ⇒ `nearestVertex`'s index); `engine_suite.ts` passes unedited; probe (D): 0 mismatches over 200 fixes.

Rejected: a new explicit `firstFix` parameter (the `nearS === -Infinity` default already MEANS "no context" per brief 02's signature and doc comment; a second flag would have to be kept consistent with it at 4 call sites for nothing); lifting the `within` cap for the anchor (breaks brief 05's `(500,42) nearS -Infinity` row and point 3); 20/30 m no-context bands (G = 40 still anchors at the end; mutation rows in §9); widening re-acquisition (reopens brief 05 case B).

**Brief 03 / 04 impact (checked).** Brief 03's stop rule projects the reference ride in ride order through `projectRideOffline`: its first fix is the ride's own start vertex (dist 0), so both bands give the same anchor (prototyped: stop chainage 149.7 under both; the old global search gives 2035.1, the brief's "≈ 2050"). Brief 03's seeding tests are pure arithmetic. Brief 04 uses only `CORRIDOR_M` / `PASS_GAP_M`. Only `projection.ts` line numbers move (+7): brief 03's insert point "after `passVertex`'s closing `}`" is `:159` after this brief, the `Offline projection of a whole ride` doc comment `:161-164`; both briefs match on text. Amended in place by the Plan tier together with `EXECUTION-ORDER.md`.

## 2. Verified anchors (working tree 2026-10-08, briefs 01 + 02 + 05 applied)

- `app/core/src/projection.ts:12` `export const CORRIDOR_M = 40.0;`; `:81` `export const PASS_GAP_M = 120;`; `:89` `export const PASS_AMBIGUITY_M = 15;`; `:93-94` (inside `passVertex`'s doc comment) read exactly:
  ```
   * chainage in [sLo, sHi], take those within PASS_AMBIGUITY_M of the nearest
   * distance -- capped at `within`, the caller's own acceptance distance, when
  ```
  `:106-109` the signature (`export function passVertex(` … `within = CORRIDOR_M,` … `): { index: number; dist: number } {`); `:113-118` read exactly:
  ```
    // Candidates: the ambiguity band around the nearest vertex, capped at the
    // caller's own acceptance distance when the nearest vertex is inside it
    // (a pass the caller would reject is never preferred over one it accepts).
    const band = near.dist + PASS_AMBIGUITY_M;
    const dMax = near.dist <= within ? Math.min(band, within) : band;
    const dMax2 = dMax * dMax;
  ```
  `:129` `    if (score < bestScore) {` (NOT edited); `passVertex`'s closing `}` at `:152`; `:154-157` the `/**\n * Offline projection of a whole ride` doc comment; `:166` `  let sp = ch[passVertex(x[0], y[0], ref, -Infinity, Infinity, -Infinity, corridor).index];`; `:192` `        const nv = passVertex(x[i], y[i], ref, -Infinity, Infinity, sp, corridor);` (both NOT edited: the anchor passes `-Infinity`, re-acquisition passes `sp`, which is what the new rule keys on).
- `app/core/src/live.ts:90` `      this.sp = ch[passVertex(x, y, this.ref, -Infinity, Infinity, -Infinity, o.corridor).index];`; `:112` `      const nv = passVertex(x, y, this.ref, this.sp, this.sp + bound, this.sp, o.corridor);` — NOT edited, only read: `grep -n "passVertex(" app/core/src/live.ts` → exactly these two lines.
- `app/tests/live_suite.ts` (1359 lines): `:19` `  nearestVertex, passVertex, projectRideOffline, PASS_GAP_M, crossTime, PASS_AMBIGUITY_M, CORRIDOR_M,` (the core import already has everything §4.2 needs; `RefLine` is a type import at `:20`, `TrackSpec` at `:22`); in scope: `LiveProjector` (`:18`), `numEq` (`:14`), `buildSyntheticRef` (`:621`), `loopPos` (`:1050`), `runEngine` (`:1093`), `PAR_REF` (`:1234`). The file ends with brief 05's retraced-street test: `…  assert(s[s.length - 1] > 595 && s[s.length - 1] < 605, \`offline end chainage ${s[s.length - 1]}\`);\n});\n`.
- `app/tests/run.ts` already imports `live_suite.ts`. **Do not edit `run.ts`.**

## 3. Files (complete list)

1. `app/core/src/projection.ts` — `passVertex` doc comment (2 lines → 3), the candidate-band comment + line (4 lines → 10). Net +7 lines; nothing else.
2. `app/tests/live_suite.ts` — three tests + fixtures appended (no import change).

## 4. Edits (python read-modify-write on the exact quoted text; each old text must match exactly once)

### 4.1 `core/src/projection.ts`

(a) Doc comment, replace the two lines `:93-94` (quoted in §2)
```
 * chainage in [sLo, sHi], take those within PASS_AMBIGUITY_M of the nearest
 * distance -- capped at `within`, the caller's own acceptance distance, when
```
with these three lines:
```
 * chainage in [sLo, sHi], take those within a band of the nearest distance
 * (CORRIDOR_M with no `nearS`, PASS_AMBIGUITY_M with one; brief 06) -- capped
 * at `within`, the caller's own acceptance distance, when
```

(b) Replace the four lines
```ts
  // Candidates: the ambiguity band around the nearest vertex, capped at the
  // caller's own acceptance distance when the nearest vertex is inside it
  // (a pass the caller would reject is never preferred over one it accepts).
  const band = near.dist + PASS_AMBIGUITY_M;
```
with these ten lines:
```ts
  // Candidates: a band around the nearest vertex, capped at the caller's own
  // acceptance distance when the nearest vertex is inside it (a pass the
  // caller would reject is never preferred over one it accepts). With no
  // chainage context (the first-fix anchors: the START pick is where the ride
  // begins, so the earliest pass is a fact, not a guess) the band is the whole
  // corridor -- a loop closing up to CORRIDOR_M from its start, or a wide
  // road's return copy, must not capture the anchor (brief 06). With a
  // context (re-acquisition: the last chainage is a guess) it is
  // PASS_AMBIGUITY_M, so a clearly nearer pass is never overridden (brief 05).
  const band = near.dist + (nearS === -Infinity ? CORRIDOR_M : PASS_AMBIGUITY_M);
```
The two lines that follow (`  const dMax = near.dist <= within ? Math.min(band, within) : band;` and `  const dMax2 = dMax * dMax;`) are untouched.

After (a)+(b): `const band` at `:123`, `const dMax` at `:124`, `if (score < bestScore) {` at `:136` (text unchanged), `passVertex`'s closing `}` at `:159`, the `Offline projection of a whole ride` doc comment at `:161-164`, the two `projectRideOffline` call sites at `:173` / `:199`. `CORRIDOR_M :12`, `PASS_GAP_M :81`, `PASS_AMBIGUITY_M :89`, `nearestVertex` (`:55-73`) unchanged. `git diff -- app/core/src/projection.ts` (brief 02 + 05 + 06 together) shows, for this brief, exactly: 2 doc-comment lines → 3, and 4 lines → 10 at the candidate band.

### 4.2 `tests/live_suite.ts` — append at the END of the file (after brief 05's last `});`), verbatim (the block begins with two blank lines):

```ts

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
```

## 5. Expected behaviour BEFORE and AFTER (verify both; a mismatch is a STOP)

BEFORE = §4.2 applied, §4.1 NOT yet applied (the tests compile against the current exports; no stubs needed). Run the suite and record the FAIL lines verbatim.

| test | BEFORE (current tree) | AFTER |
|---|---|---|
| 06 with no chainage context passVertex takes the earliest pass anywhere inside the corridor… | FAIL `G=25 first fix at the closing point: ch 3170 dist 5 -- want the opening vertex (ch 0, 25 m)` | PASS |
| 06 a loop closing 25 / 40 m from its start, ridden from the closing point… | FAIL `G=25: LiveProjector anchor s 3170, want 0 (the opening vertex)` | PASS |
| 06 a wide road (return copy 22 m away) started with a 20 m GPS error… | FAIL `LiveProjector anchor s 2815.6055512754638, want ~5 (outbound)` | PASS |
| every pre-existing test (940) | PASS | PASS, unedited |

Counts: BEFORE `943 tests: 937 pass, 3 fail, 3 skip`; AFTER `943 tests: 940 pass, 0 fail, 3 skip`. If any AFTER test fails, or the BEFORE set differs, STOP and report the assertion text with the printed numbers verbatim.

Sanity on the AFTER numbers (observed on the prototype): G = 25/40 anchors at ch 0 live, offline and in the engine, five real gates, offline `crossTime` within 2 s of the live events; the wide road anchors at ch ≈ 5, five real gates, no backwards run; G = 45 still anchors at the end (corridor cap); `(500,30)` with no context → ch 500 at 30 m; `(500,42)` with no context → ch ≈ 1544 (cap); brief 05's `(500,30) nearS 0` → return copy (unchanged).

## 6. Steps

1. `GIT_OPTIONAL_LOCKS=0 git status --short` (expect the 18 app files of briefs 01/02/05 modified, nothing else under `app/`); baseline `cd app && node --experimental-strip-types tests/run.ts | tail -1` → `940 tests: 937 pass, 0 fail, 3 skip`.
2. BEFORE: apply §4.2 only → run → `943 tests: 937 pass, 3 fail, 3 skip`; the three FAIL lines must be the three rows of §5 with those messages. Record them verbatim.
3. Apply §4.1 (a) then (b).
4. `cd app && node --experimental-strip-types tests/run.ts` → `943 tests: 940 pass, 0 fail, 3 skip`; `grep -c FAIL` → 0.
5. `cd app && ./node_modules/.bin/tsc --noEmit` (timeout_ms 180000, tee `cycles/virgin-cycle26/06-brief-06-tsc.log`, then `echo "exit $?" >> …` so the log never reads empty-by-timeout) → exit 0, no output.
6. `GIT_OPTIONAL_LOCKS=0 git diff --stat` → the same 18 files (both of this brief's files were already modified by briefs 02/05; no new file). Checks: `grep -n "nearS === -Infinity ? CORRIDOR_M : PASS_AMBIGUITY_M" app/core/src/projection.ts` → exactly 1 line (`:123`); `grep -n "near.dist + PASS_AMBIGUITY_M" app/core/src/projection.ts` → none; `grep -n "export const PASS_AMBIGUITY_M = 15;" app/core/src/projection.ts` → 1; `grep -n "passVertex(" app/core/src/live.ts` → `:90` and `:112`, both unchanged; `git diff -- app/core/src/live.ts | grep -c "^[-+] "` is the same before and after your work (you did not touch it); `git diff -- app/tests/ui-strings.allow.json` = brief 01's one entry only; `git diff -- app/tests/live_suite.ts` = brief 02's + 05's hunks + your one appended block (no `-` lines added by you).
7. Report → `cycles/virgin-cycle26/06-brief-06-executor-report.md`: files touched (yours only), counts before/after, the BEFORE FAIL lines verbatim, tsc result, the grep outputs, deviations verbatim. Hand these lines to the coordinator for OPEN-ITEMS (you do not edit OPEN-ITEMS): "Pass pick (virgin-cycle26 briefs 02/05/06): the first-fix anchor takes the earliest pass anywhere inside the 40 m corridor (the START pick is the reference, cycle21); re-acquisition takes the pass nearest the last chainage among those within 15 m of the nearest distance (`PASS_AMBIGUITY_M`), both capped at the caller's corridor. Still open: (1) two passes within 15 m of each other in distance AND < 240 m apart in chainage stay ambiguous inside the window (plan D5); (2) on a 20-25 m wide road a RE-ACQUISITION fix ≥ (D + 15)/2 m toward the far side lands on the return copy (anchor is fine); (3) a loop whose closing vertex is > 40 m from its opening one anchors at the end when started from the closing point (not the same place by the app's own corridor)."

## 7. Acceptance

- Suite `943 tests: 940 pass, 0 fail, 3 skip`; tsc exit 0; every pre-existing test unedited (your `live_suite.ts` diff is a pure append).
- `projection.ts`: `PASS_AMBIGUITY_M = 15` unchanged; `within` cap line unchanged; tie rule unchanged; `passVertex` signature unchanged; only the two hunks of §4.1.
- `live.ts`, `engine.ts`, every `src/` file: untouched by you.
- No new string anywhere; `ui-strings.allow.json` not touched by this brief.

## 8. Non-goals

- No change to re-acquisition (`PASS_AMBIGUITY_M`, the `[sp, sp + bound]` range, `nearS = sp`), to the `within` cap, to `DEFAULT_LIVE_OPTIONS`, to `GateDetector`, `FINISH_FRAC`, `armWithinM`; no heading-aware matching; no monotonic offline projector; no FINISH guard.
- No new parameter on `passVertex` (the `nearS === -Infinity` default is the "no context" signal by brief 02's design).
- No "loop detected" flag, diagnostic, event, alert, sub-label or string (ruling 1).
- Briefs 03 and 04 are not started here (`EXECUTION-ORDER.md`: 06 → 03 → 04 → final Opus inspect of the whole cycle).

## 9. For the Inspect pass (final fresh-Opus inspect of the whole cycle; no separate re-inspect of 06)

- Rerun §6-7. Mutate-checks on a COPY (outside the repo or under `safe_to_delete/`), each alone; observed on the Plan tier's scratch copy (non-env FAILs; the 4 `virgin-cycle19 02` `.easignore` FAILs are the copy's missing repo root):
  | mutation | FAILs |
  |---|---|
  | `const band = near.dist + PASS_AMBIGUITY_M;` (brief 05 state) | 06 unit (`G=25 first fix at the closing point: ch 3170 dist 5`), 06 loop (`G=25: LiveProjector anchor s 3170`), 06 wide road (`LiveProjector anchor s 2815.6…, want ~5`) |
  | `const band = near.dist + CORRIDOR_M;` (brief 02 state) | 05 passVertex-never-prefers (`(500,30) nearS 0: ch 500`), 05 live re-acq parallel (`y=30: offline ran backwards by 5 m`), 06 unit (`G=25 re-acquisition with an early context: ch 0`) |
  | ternary inverted (`? PASS_AMBIGUITY_M : CORRIDOR_M`) | the two 05 tests above + all three 06 tests |
  | no-context band `30` or `20` instead of `CORRIDOR_M` | 06 unit (`G=40 first fix … ch 3155`), 06 loop (`G=40: LiveProjector anchor s 3155`) |
  | `const dMax = band;` (no cap) | 05 passVertex-never-prefers (`(500,42) [-Infinity,Infinity] nearS -Infinity: ch 500 dist 42`), 06 unit (`G=45: ch 0 -- outside the corridor…`) |
- Reason about the rule: `dMax >= near.dist` in both branches, so the nearest vertex is always a candidate and a single-pass reference still returns `nearestVertex`'s index (brief 02's equality test, `engine_suite.ts` unedited). `nearS` is `-Infinity` at exactly the two anchor call sites (`live.ts:90`, `projection.ts:173` after this brief) and finite (`sp`) at the two re-acquisition sites; `closeRun`'s `score` already keys on the same sentinel. Confirm `live.ts` has no diff from this brief.
- Brief 03 lands after this one: its `projection.ts` insert point is `passVertex`'s closing `}` at `:159` (text anchor); its stop test's offline projection starts at the reference ride's own first vertex, so this brief does not move its numbers (prototyped: 149.7 either way).
