**Status: BRIEF WRITTEN, NOT YET EXECUTED.**
**Open item:** OPEN-ITEMS.md "Parked" (lines 70-71) — residual GPS re-acquisition hole. Size: **small** — one local const + one condition change + one doc-comment rewrite in `app/src/live/engine.ts`; a 2-line mirror update in the test replica and two new synthetic tests (~70 lines) in `app/tests/live_suite.ts`. **No change to `core/src/live.ts`** (the parity-proven projector is untouched). Nathan's "one field + one line" estimate is about right — the "field" turns out to be a local, not a new `Candidate` member.
**Verified against the mount as read 2026-09-04 (`5ae4c30`, branch `virgin`). Every line number below was re-read by the Plan tier; if any anchor does not match on the day of execution, STOP (see §7).**

---

# WP-D (cycle 2) — Close the sub-245 m re-acquisition hole in the lock-evidence rule

## 1. What it is

The live engine races every catalog route as a candidate; a route wins the lock by accumulating **advance** (`Candidate.adv`, metres of its own line the rider was observed riding) — `LOCK_MIN_ADVANCE_M = 400` with a `LOCK_MARGIN_M = 200` lead over every rival. Cycle 024 (WP-D1) established the principle at `engine.ts:57-59`:

> Advance is CORRIDOR-VERIFIED travel only: a D-016(a) re-acquisition jump moves a candidate's chainage but earns it no lock evidence.

The implementation of that principle is a **flat size threshold**: a chainage jump of more than `REACQ_JUMP_M = 245 m` in one fix is discounted; a jump of 245 m or less is counted in full. The threshold was chosen because ordinary windowed projection can advance at most ~245 m in one fix, so anything larger *must* be a re-acquisition. The converse does not hold: a re-acquisition hop can be **any** size from ~0 m up to the projector's bound, so every re-acquisition hop that happens to land within 245 m of the frozen chainage is counted as if the rider had been seen riding it. The engine's own doc comment (`engine.ts:144-151`) records this as a known residual ("measured up to ~138 m in this app's own ride corpus") and defers it.

This WP closes the residual with a rule that discounts by **cause** (was the ground observed?) instead of by **size**.

**What this WP deliberately does NOT do:** it does not touch gate firing, chainage, displayed times, `core/src/live.ts`, `LiveFix`, or the projector's own re-acquisition bound (`reacqForwardM` / `vMaxReacq`). It is a lock-race evidence rule only, exactly like the rule it extends.

## 2. Current state (all re-verified 2026-09-04)

### 2.1 The projector (`app/core/src/live.ts`) — how chainage moves

`LiveProjector.update(x, y, t?)` (`:80-121`) returns `LiveFix { s, xtd, onRoute }` and advances the private monotonic chainage `sp` in exactly two places:

- **Windowed hit** (`:88-98`): nearest point on the segments within `[sp - windowBack, sp + windowFwd]` = `[sp-30, sp+240]`, one segment of slack past the window edge, accepted if `dist <= corridor` (`CORRIDOR_M = 40`, `core/src/projection.ts:12`). `sp = max(sp, hit.s)`. `lost = 0`. Returns `onRoute: true`. Maximum advance per fix ≈ 245 m.
- **D-016(a) re-acquisition** (`:100-114`): only reached after the windowed lookup missed AND `lost >= lostBeforeReacq` (5 consecutive off-corridor fixes, `lost` is incremented before the check). Global-ahead nearest vertex within `[sp, sp + bound]`, `bound = max(reacqForwardM = 400, vMaxReacq = 15 m/s * (t - tLastOnRoute))`. If found within the corridor: `sp = ch[nv.index]`, `lost = 0`, returns `onRoute: true`. **Hop size is anything from 0 to `bound`.**

Every other return path (`:91` empty window, `:115` miss) leaves `sp` unchanged and returns `onRoute: false`. Consequences used by the fix:

- (P1) **Chainage only ever moves on a fix whose `onRoute` is `true`.** An off-route fix always has `jump = 0`.
- (P2) **A re-acquisition hit is always immediately preceded by ≥ 4 off-route fixes** (it needs `lost >= 5` counting the current fix, and `lost` resets to 0 on any on-route fix). So the fix *before* a re-acquisition hit is always `onRoute: false`.
- (P3) A windowed hit whose predecessor was off-route (rider left the 40 m corridor for 1-4 fixes and came back within the 240 m window) also lands all of the intervening advance on the rejoin fix — same "unobserved ground" shape as a re-acquisition, just smaller and rarer.

`vMaxReacq: 15 // 54 km/h — generous for an e-bike; bounds any gap-jump` (`:47`) is the only speed-plausibility constant in the codebase (`grep -rn "km/h\|maxSpeed\|plausib\|MPS\|speed"` over `core/src` and `src/live` finds nothing else). It is private to the projector's re-acquisition *bound*; the engine cannot see `tLastOnRoute`.

### 2.2 The engine rule (`app/src/live/engine.ts`)

```ts
// :154
export const REACQ_JUMP_M = DEFAULT_LIVE_OPTIONS.windowFwd + 5;   // 245

// :901-918  (feedCandidate)
  private feedCandidate(c: Candidate, lat: number, lon: number, tSec: number): GateEvent[] {
    const xy = toXY([lat], [lon], c.ref.lat0, c.ref.lon0);
    const sBefore = c.proj.chainage;                                   // :905
    const fix = c.proj.update(xy.x[0], xy.y[0], tSec);                 // :906
    c.lastXtd = fix.xtd;
    if (c.baseS === null) {                                            // :908
      c.baseS = fix.s;
    } else {
      // REACQ_JUMP_M: discount a D-016(a) re-acquisition teleport from the
      // lock evidence by carrying baseS forward with it (see the constant).
      const jump = c.proj.chainage - sBefore;                          // :913
      if (jump > REACQ_JUMP_M) c.baseS += jump;                        // :914
    }
    c.adv = c.proj.chainage - c.baseS;                                 // :916
    c.onRoute = fix.onRoute;                                           // :917
    if (!c.anchored && fix.onRoute && fix.s <= ANCHOR_M) c.anchored = true;
```

- `tSec` IS available here (it is the fix's own epoch-seconds, passed into `c.proj.update`). There is no per-candidate "previous fix time"; the engine keeps a global `tBuf` but `feedCandidate` does not read it.
- `c.onRoute` (`Candidate` interface `:339`, initialised `false` at `:429`) is written at `:917` **after** the discount check at `:914` — so at `:914` it still holds the **previous** fix's `onRoute`. That is the ingredient the fix needs, and it is already in scope. Other readers of `c.onRoute` (`:502`, `:559`, `:591`) aggregate it into the engine's public `onRoute`; none are affected by reading it earlier in `feedCandidate`.
- The cycle-023 re-anchor path (`:515-525`) sets `c.baseS = null` and replaces `c.proj`; the next fix then takes the `:908` seed branch, so it never reaches the discount check — no interaction.
- Doc comment `:127-153` explains WP-D1 and, at `:144-151`, names the residual and the closure it had in mind (`LiveFix.reacquired`), deferred because it touches core. Header `:57-59` states the principle. Neither mentions rejoin-after-short-excursion.

### 2.3 The test replica (`app/tests/live_suite.ts`)

`advanceAt()` (`:87-101`) re-derives `Candidate.adv` with its own `LiveProjector` and mirrors the discount rule by hand at `:97`:

```ts
    else if (discount && proj.chainage - before > REACQ_JUMP_M) base += proj.chainage - before;
```

The cycle-024 test at `:223-256` uses it (and asserts `REACQ_JUMP_M > 240` at `:252` — that assertion stays valid and stays in place). Synthetic-route tooling for engine-level tests exists at `:801-826`: `buildSyntheticRef(waypoints)` (5 m resample, planar origin 0/0), `SYN_L` (a straight 3005 m line, gates `[100, 800, 1500, 2200, 2900]`), and the feed idiom `engine.feed(lat, lon, t * 1000)` with `xyToLatLon(x, y, 0, 0)` (`:840-845`).

### 2.4 Measured on the fixture corpus (Plan-tier probe, 2026-09-04)

Probe scripts (throwaway, gitignored, kept for Inspect to re-run): `safe_to_delete/plan_probe_reacq.ts` (legacy 4 tracks), `safe_to_delete/plan_probe_reacq2.ts` (full 20-route catalog, old rule vs proposed rule), `safe_to_delete/plan_probe_syn.ts` (the synthetic scenarios of §5.3). Run from `safe_to_delete/` with `node --experimental-strip-types <file>`.

Full catalog (`catalogTrackSpecs()`, 20 routes) × all 9 fixtures — every place the proposed rule changes a candidate's advance:

| fixture | candidate | winner? | hop | old adv | new adv |
|---|---|---|---|---|---|
| clean_morning / gap_20260521 / latelock_20260805 / wrongdir_eveninga | StationWorkAlt | no | re-acq 65 m | 65 | 0 |
| detour_eveningb | StationHomePreferred | no | re-acq 75 m | 903 | 828 |
| detour_eveningb | StationHomeWet | no | re-acq 90 m | 4553 | 4463 |
| detour_eveningb | FoshHome | no | re-acq 86 m | 4996 | 4911 |
| detour_eveningb | EveningB | **yes** | re-acq 7 m | 4524 | 4517 |
| clean_eveninga | EveningB | no | re-acq 5 m | 21 | 16 |

Everything else: identical. **Zero windowed rejoins after 1-4 lost fixes anywhere in the corpus** (P3 is real but did not occur once in 9 rides × 20 routes). Every hop > 245 m (578-5243 m) is already discounted today and stays discounted. The winning track's advance changes by at most 7 m (well inside the suites' `LOCK_SLACK_M = 80`). Ordinary consecutive on-route steps reach **62-70 m per 1 Hz fix** on real rides (`clean_eveninga`/EveningA, `latelock_20260805`/Morning) — relevant to the rejected design in §3.3.

## 3. The fix

### 3.1 The rule

Discount a candidate's chainage advance from its lock evidence when **either**

- the jump exceeds `REACQ_JUMP_M` (existing rule, kept as belt-and-braces — it is provably subsumed by the next clause via P2, but keeping it costs nothing, keeps `:252`'s invariant test meaningful, and protects against a future projector change), **or**
- the **previous** fix for this candidate was off-route (`!wasOnRoute`). By P1 the current fix must then be on-route with `jump > 0` (or `jump = 0`, a no-op), and by P2/P3 the advance is ground covered while the rider was outside this candidate's corridor — never observed on its line.

The candidate keeps the new chainage (gates, times, display all unchanged); it simply earns no lock evidence for it. Identical in spirit and mechanism to WP-D1; only the trigger is widened from "size" to "cause".

### 3.2 `app/src/live/engine.ts` — the code (3 hunks)

**Hunk 1 — `feedCandidate`, `:905-914`.** Capture the previous verdict *before* `update()` and widen the condition. Net: +1 line, 1 line changed, comment updated.

```ts
    const sBefore = c.proj.chainage;
    // WP-D (cycle 2): the PREVIOUS fix's verdict — c.onRoute is only rewritten
    // below, but read it here explicitly so the ordering is not load-bearing.
    const wasOnRoute = c.onRoute;
    const fix = c.proj.update(xy.x[0], xy.y[0], tSec);
    c.lastXtd = fix.xtd; // WP-G Part 2 gap-fill: per-candidate deviation for diagnostics
    if (c.baseS === null) {
      c.baseS = fix.s;
    } else {
      // Discount unobserved ground from the lock evidence by carrying baseS
      // forward with it (see REACQ_JUMP_M's doc comment): a jump past the
      // projector's window (WP-D1, cycle 024) OR any advance landing on the
      // first on-route fix after an off-route one (WP-D, cycle 2) — the
      // projector only moves chainage on on-route fixes, so such a jump is
      // ground covered while the rider was outside this candidate's corridor.
      const jump = c.proj.chainage - sBefore;
      if (jump > REACQ_JUMP_M || !wasOnRoute) c.baseS += jump;
    }
```

Exact-match check before editing: `:905` must read `    const sBefore = c.proj.chainage;` and `:914` must read `      if (jump > REACQ_JUMP_M) c.baseS += jump;`. Do not move `:917` (`c.onRoute = fix.onRoute;`).

**Hunk 2 — doc comment `:144-151`.** Replace the paragraph that begins `Below that margin, a small re-acquisition hop can still slip` and ends `so it stays DEFERRED — a follow-up, not chased here.` with:

```
 * the new chainage; it simply earns no lock evidence for ground it never
 * showed). Below that margin a re-acquisition hop is indistinguishable by
 * size from ordinary windowed advance (cycle 024 measured up to ~138 m
 * slipping through; WP-D cycle 2 measured 65-90 m hops on four wrong
 * catalog routes across the fixture corpus), so WP-D (cycle 2) closes the
 * residual by CAUSE instead of size: the projector only moves chainage on an
 * on-route fix, and a D-016(a) hit is always preceded by >= 4 off-route
 * fixes, so any advance landing on the first on-route fix after an
 * off-route one is ground covered outside this candidate's corridor and is
 * discounted regardless of size (feedCandidate's `wasOnRoute`). That also
 * covers the smaller windowed rejoin after 1-4 off-corridor fixes. The size
 * threshold is kept as belt-and-braces; it is subsumed. A sparse-fix gap
 * with NO off-route fix in between (one fix, then the next 40 s later 200 m
 * down the same corridor) is still ordinary windowed advance and still
 * counts — that is the invariant the >240 m margin test protects.
```

Keep the sentence before it (`the candidate keeps` … must join cleanly — the replacement's first line completes the existing `(the candidate keeps` parenthesis; read `:141-144` and make the join grammatical) and keep `:152-153` (`This is a lock-race rule only: …`) verbatim.

**Hunk 3 — header `:57-59`.** Change `a D-016(a) re-acquisition jump` to `a D-016(a) re-acquisition jump, or any advance made while the rider was off this candidate's corridor,` and `(REACQ_JUMP_M, cycle 024 WP-D1 adjudication — see its doc comment below)` to `(REACQ_JUMP_M and feedCandidate's wasOnRoute — cycle 024 WP-D1 and cycle-2 WP-D; see REACQ_JUMP_M's doc comment)`.

### 3.3 Designs considered and rejected (so nobody re-derives them)

- **Time-aware plausibility (`jump > vMax * dt`)** — the design the task framing suggested. Rejected on three measured grounds. (i) Wrong criterion: lock evidence asks *"was the rider observed on this line?"*, not *"could they have ridden it?"*. The cycle-024 failure itself (MorningB re-acquired 138 m after ~60 s on another road) is time-plausible at 2.3 m/s and would sail through; the corpus' 65-90 m hops after 12-26 lost fixes likewise. (ii) With consecutive-fix `dt` (the only `dt` the engine can compute), real on-route riding steps reach 62-70 m per 1 Hz fix in the corpus — any bound low enough to catch a 90 m hop misfires on real rides on the correct route. (iii) `dt` since the last on-route fix lives in the projector (`tLastOnRoute`, private) — exposing it is the core change we are avoiding, for a weaker rule.
- **`LiveFix.reacquired: boolean`** (the closure the existing comment names). Correct but strictly weaker than §3.1 (misses P3 windowed rejoins), and it touches `core/src/live.ts`'s parity-proven `LiveFix` shape plus every literal that builds one. The `wasOnRoute` rule gets the same result from information the engine already holds. If Nathan prefers the explicit flag anyway, it is a separate small WP — do not add it here.

### 3.4 `app/tests/live_suite.ts` — mirror + two new tests

**Replica (`:87-101`).** Track the previous verdict and mirror the new condition, so `advanceAt` keeps meaning "exactly `Candidate.adv`":

```ts
function advanceAt(f: Fixture, track: TrackId, nFixes: number, fromIndex = 0, discount = true): number {
  const ref = refFor(track);
  const proj = new LiveProjector(ref);
  let base: number | null = null;
  let adv = 0;
  let wasOnRoute = false; // Candidate.onRoute starts false (engine.ts :429)
  for (let i = fromIndex; i < fromIndex + nFixes; i++) {
    const before = proj.chainage;
    const xy = toXY([f.fixes.lat[i]], [f.fixes.lon[i]], ref.lat0, ref.lon0);
    const fix = proj.update(xy.x[0], xy.y[0], f.fixes.t[i]);
    if (base === null) base = fix.s;
    else if (discount && (proj.chainage - before > REACQ_JUMP_M || !wasOnRoute)) base += proj.chainage - before;
    wasOnRoute = fix.onRoute;
    adv = proj.chainage - base;
  }
  return adv;
}
```

Update the doc comment above it (`:83-86`): `discount` now mirrors "cycle 024's REACQ_JUMP_M rule plus cycle-2 WP-D's off-route-rejoin rule". `discount = false` keeps its meaning (raw chainage delta).

**New tests.** Place them directly after the `SYN_L` / `synPos` block (`:818-826`), before `test('live: prefix stall + finalize …`, so they can use `SYN_L`, `LiveEngine`, `xyToLatLon`. Single-candidate engines lock as soon as `adv >= 400` (verified by probe: `[SYN_L]` alone locks `verified` at ride-chainage 400 on a plain ride). A helper keeps the three scenarios to a few lines each:

```ts
/** WP-D (cycle 2): feed [x, y, dtSec] steps along SYN_L's planar frame into a
 * single-candidate engine; returns the step's x at the first lock (or null). */
function lockXOnSynL(steps: [number, number, number][]): number | null {
  const engine = new LiveEngine([SYN_L]);
  let lockX: number | null = null;
  const unsub = engine.subscribe((s) => {
    if (lockX === null && s.track !== null) lockX = steps[s.fixesFed - 1][0];
  });
  let t = 1755167000;
  for (const [x, y, dt] of steps) {
    t += dt;
    const [lat, lon] = xyToLatLon(x, y, 0, 0);
    engine.feed(lat, lon, t * 1000);
  }
  unsub();
  return lockX;
}

test('live WP-D: a sub-245 m re-acquisition hop is not lock evidence (the cycle-024 residual)', () => {
  // Ride SYN_L on-corridor 0..150 m at 5 m/s, leave the corridor (y = 120 m,
  // 3x CORRIDOR_M) for 8 fixes, then re-acquire at x = 350 — a 200 m hop,
  // under REACQ_JUMP_M, after lost >= 5 — and ride on. Before WP-D the 200 m
  // counted and the lock fired at ride-chainage 400 (measured 2026-09-04);
  // the rider was never seen on the 150..350 m stretch, so the lock must
  // wait until 400 m of OBSERVED advance: 150 + (x - 350) >= 400 -> x = 600.
  const steps: [number, number, number][] = [];
  for (let x = 0; x <= 150; x += 5) steps.push([x, 0, 1]);
  for (let i = 1; i <= 8; i++) steps.push([150 + 5 * i, 120, 1]);
  for (let x = 350; x <= 700; x += 5) steps.push([x, 0, 1]);
  const lockX = lockXOnSynL(steps);
  assert(lockX !== null, 'never locked after re-acquisition');
  assert(lockX! >= 600 && lockX! <= 600 + 10,
    `locked at ride-chainage ${lockX} m: a 200 m re-acquisition hop must earn no lock evidence (want 600, pre-WP-D gave 400)`);
});

test('live WP-D: ordinary windowed advance across a sparse-fix gap, and fast real riding, still count in full', () => {
  // Control 1: on-corridor to 150 m, then NO fixes for 40 s, next fix 200 m
  // down the same corridor (a windowed hit, no off-route fix in between) —
  // this is the "normal fast/sparse-fix advance" the REACQ_JUMP_M > 240
  // invariant protects. It must still lock at ride-chainage 400.
  const gap: [number, number, number][] = [];
  for (let x = 0; x <= 150; x += 5) gap.push([x, 0, 1]);
  gap.push([350, 0, 40]);
  for (let x = 355; x <= 700; x += 5) gap.push([x, 0, 1]);
  const lockGap = lockXOnSynL(gap);
  assert(lockGap !== null && lockGap >= 400 && lockGap <= 410,
    `sparse-gap control locked at ${lockGap} m, want 400 (windowed advance is observed riding, never discounted)`);

  // Control 2: 25 m per 1 Hz fix (90 km/h — a hard descent), all on-corridor.
  // The rule never looks at speed; lock at the first fix with adv >= 400.
  const fast: [number, number, number][] = [];
  for (let x = 0; x <= 700; x += 25) fast.push([x, 0, 1]);
  const lockFast = lockXOnSynL(fast);
  assert(lockFast !== null && lockFast >= 400 && lockFast <= 425,
    `fast-descent control locked at ${lockFast} m, want 400 (speed is not evidence against a rider)`);

  // Control 3: the pre-WP-D rule still holds — a 300 m hop (> REACQ_JUMP_M)
  // after lost >= 5 was and is discounted: 150 + (x - 450) >= 400 -> x = 700.
  const big: [number, number, number][] = [];
  for (let x = 0; x <= 150; x += 5) big.push([x, 0, 1]);
  for (let i = 1; i <= 8; i++) big.push([150 + 5 * i, 120, 1]);
  for (let x = 450; x <= 900; x += 5) big.push([x, 0, 1]);
  const lockBig = lockXOnSynL(big);
  assert(lockBig !== null && lockBig >= 700 && lockBig <= 710,
    `>245 m hop control locked at ${lockBig} m, want 700 (unchanged from cycle 024)`);
});
```

Measured on 2026-09-04 with the Plan-tier probe (`safe_to_delete/plan_probe_syn.ts`), current engine vs engine with hunk 1 applied and then restored byte-identically:

| scenario | before WP-D | after WP-D | wanted |
|---|---|---|---|
| A — 200 m re-acq hop | lock at 400 | lock at **600** | 600 |
| B — 200 m sparse-gap windowed advance | 400 | 400 | 400 |
| C — 25 m/s continuous | 400 | 400 | 400 |
| A2 — 300 m re-acq hop | 700 | 700 | 700 |

So the first new test **fails before and passes after**; the control test passes both before and after (it pins the invariants, it is not the regression detector).

## 4. Acceptance criteria

1. `engine.ts` `feedCandidate` discounts advance from lock evidence when `jump > REACQ_JUMP_M || !wasOnRoute`, where `wasOnRoute` is the candidate's `onRoute` from the **previous** fix, captured before `c.proj.update()`. No other engine behaviour changes: gate events, chainage, `lastXtd`, `anchored`, the `:917` assignment order, the re-anchor path, `REACQ_JUMP_M`'s value and export are all untouched.
2. `core/src/live.ts` is not modified (`git diff --stat` shows no `core/` file).
3. `tests/live_suite.ts`: `advanceAt` mirrors the new rule; the new test "a sub-245 m re-acquisition hop is not lock evidence" exists and **fails on the pre-WP-D engine** (Execute must demonstrate this once — run it with hunk 1 temporarily reverted, or before applying hunk 1 — and quote the failing assertion text in the report), then passes; the control test passes.
4. Doc comment `:127-153` and header `:57-59` describe the widened rule (hunks 2-3); no sentence still claims the size threshold is the only rule or that the residual is deferred.
5. Full suite zero FAIL, `tsc --noEmit` clean.
6. OPEN-ITEMS.md / STATE.md updates are the coordinator's, not Execute's.

## 5. Verification

```
cd app && node --experimental-strip-types tests/run.ts          # zero FAIL (expect +2 tests vs baseline)
cd app && ./node_modules/.bin/tsc --noEmit                       # clean, exit 0
```

Plus, for Inspect (all optional, all read-only):

- Re-run `safe_to_delete/plan_probe_reacq2.ts` from `safe_to_delete/` — the "old vs new adv" table in §2.4 is what the rule *should* change and nothing else; after WP-D the probe's `advNew` column is what the engine now computes.
- Re-run `safe_to_delete/plan_probe_syn.ts` against the landed engine — expect `A lockX= 600`, `B 400`, `C 400`, `A2 700`.
- `grep -n "wasOnRoute" app/src/live/engine.ts` — exactly the capture line and the condition (and the doc comment), nothing else.
- The existing cycle-024 test (`:223`) still passes with its `REACQ_JUMP_M > 240` assertion intact.

## 6. Out of scope (do not do)

- No `LiveFix.reacquired` flag, no change to `LiveOptions`, `vMaxReacq`, `reacqForwardM`, `lostBeforeReacq`, `CORRIDOR_M`, or any `core/src` file.
- No speed / `dt` plausibility bound anywhere (§3.3).
- No change to `REACQ_JUMP_M`'s value or the `:252` invariant test.
- No new fixture JSON; the new tests are synthetic and self-contained.
- Do not delete the `safe_to_delete/plan_probe_*.ts` files or `safe_to_delete/engine.ts.plan_backup` (gitignored; Inspect uses the probes).

## 7. Stop-on-ambiguity

Standard clause: any anchor in §2-§3 that does not match the file on the day (line content, not just line number — if the number drifted but the quoted text is found once nearby, proceed and report the new number; if the text is absent or found twice, STOP), any test that fails for a reason not explained here, any `tsc` error, or any judgement call not settled above → stop and report verbatim. Never rule on it from the coordinator's chat; forward to a fresh Fable.

Specific flags:

- **If the new "sub-245 m hop" test does NOT fail on the pre-WP-D engine**, stop: the scenario has been misread or the engine changed since `5ae4c30`; the probe in §3.4 measured lock-at-400 on that commit.
- **If any existing test's lock position moves by more than 7 m** (§2.4's ceiling for a winning track), stop and report which fixture/track — that is a corpus case the Plan-tier probe did not see.
- **If `c.onRoute` is found to be written anywhere between `:905` and `:914`** (it is not, as read), the `wasOnRoute` capture is still correct (it is taken at `:905`) but report it.
- Single-candidate lock semantics: the probe confirmed `new LiveEngine([SYN_L])` locks `verified` at adv 400 with no rival. If the landed engine does not (e.g. a pick/anchor rule changed), the new tests need a rival candidate instead of assuming solo lock — stop rather than improvise one.
- `[ASSUMPTION]` none invented: no new numeric constant is introduced. The 62-70 m/fix and 65-90 m hop figures are measurements from the fixture corpus, not estimates.

---
## Inspect findings (2026-09-04, fresh-context Fable pass) — read before executing

**Verdict: PASS.** Independently re-ran all three throwaway probes this brief's Plan pass left in `safe_to_delete/` — they reproduce exactly (before-column A 400 / B 400 / C 400 / A2 700; after-column A 600, rest unchanged; full suite on the patched copy: 465 pass / 0 fail, matching baseline). `app/src/live/engine.ts` on the real device is confirmed git-clean and byte-identical to the probes' starting point — no leftover edits from the investigation. The rule was also re-checked against Nathan's four real virgin-app rides and stayed neutral (no behaviour change on legitimate riding).

One clarity note for Execute: the brief's described edit touches the same region as the existing line ~L143 comment block — when applying it, replace the comment + condition as one unit (don't leave a stale comment describing the old flat-threshold-only behaviour sitting above the new cause-based condition).
