# EXECUTION BRIEF — RESULT/RIDES ranking integrity: pool = previous 9 + current (cycle 025)

**Written by the Plan tier (Fable), 2026-08-27, from code read at HEAD. You are the Sonnet
executor. This brief is your entire world: implement exactly what is written here. If ANY
instruction contradicts what you find in the code, or an edit target does not match, STOP and
escalate the exact discrepancy verbatim — do not guess, do not improvise a fix
(stop-on-ambiguity rule, D-039).**

## 0. Environment and ground rules

- Repo root: `$HOME/mnt/Qualifire`. Every shell call is a fresh shell (no cwd carryover) with a
  ~45 s timeout: always prefix `cd "$HOME/mnt/Qualifire" && ...`.
- **Do NOT run `git`** — the coordinator commits.
- **Never delete a file** (repo rule: move to `safe_to_delete/` — but this brief deletes nothing).
- **Do not edit**: `STATE.md`, `product/BACKLOG.md`, `product/DECISIONS.md`, `IDEAS.md`,
  anything under `cycles/` (including this brief), `demos/mockup.html` (explicitly ruled
  no-regeneration-needed, §8). Your writable surface is exactly the files named in §4–§6.
- Verification commands (§7): the test runner, and `npx tsc --noEmit` run SYNCHRONOUSLY in one
  call with a generous timeout (~45 s max per call; it typically finishes in 20–45 s).
  Backgrounding with nohup/disown does NOT survive across calls here.
- Dates in comments are absolute (e.g. "2026-08-26"), never "today".

## 1. The bug and the ruling (context — verified at HEAD by the planner)

On the RESULT tab, the last-ride card's rank line said **"P10 of 11 on this route"** while the
Personal Bests list directly below placed the same ride at **P9** with **"10 rides on file"**.
Self-contradictory on one screen.

**Root cause (confirmed in code, not hypothesis):** `app/src/ui/colourModel.ts`'s
`ghostsFor(routeId, excludeRideId?)` filters out `excludeRideId` **before** `.slice(-WINDOW_N)`
(`WINDOW_N = 10`). That exclude-before-slice shape was the cycle-013 fix for B-44 ("today's own
lap must not sit inside its own comparison history") — correct then, but it means:

- **Header path** (`ResultScreen.tsx` → `rankLineFor` ← `lapValues(routeId, ride.rideId)`):
  excluding the current ride lets the slice backfill an **extra, older** ride → 10 previous
  rides → `positionAmong` adds the current ride → a field of **11**.
- **List path** (`ResultScreen.tsx` `PbDetail` → `buildPbDetail(ghostsFor(routeId), ...)`, no
  exclude): last 10 **including** the current ride → a field of **10**, missing the older ride
  the header counted.

Two correct computations over two different populations. The "10 rides on file" caption
(`buildPbRows`'s `nOnFile` = `ghostsFor(r).length`) is additionally a mislabel: it is the
window size capped at 10, not the number of rides on file.

**Nathan's ruling (D-045 ruling 2, 2026-08-26, `product/DECISIONS.md` — already recorded, do
not edit it):** the ranking universe is a recency window, never a global ranking. The current
ride is compared against the **9 most recent PREVIOUS rides** — previous-9-plus-current, a pool
of exactly 10 in which the current ride is always the 10th slot. Position chips read "P4 of
10", never "of 11". A faster-but-older ride outside the 9-ride window does not count. This is a
real window change (last-10 → previous-9), not just labels, and it applies identically to
header and list so disagreement becomes impossible **by construction**.

**Related, in scope:** `product/BACKLOG.md` B-117 (OPEN): *"Both RIDES and RESULT gate ranking
on `movingS !== null` rather than the store's own `ranks()`, which also excludes
`tripwireDemoted` — exactly the 'local lookalike of `ranks()`' `colourModel.ts` warns against
by name. Not reachable today (nothing sets `tripwireDemoted` on app rides yet) but will
silently rank+colour a demoted lap the moment D-024's tripwire is ratified for app rides."*
The window logic itself is NOT duplicated (there is one implementation, in `colourModel.ts`,
and both screens use it) — the lookalike is the judged ride's own *eligibility gate*. This
brief closes both halves of B-117 (§4.3, §5.2). Report the closure; the Principal updates the
backlog status, not you.

**Explicitly OUT of scope (do not touch):** `MIN_HISTORY` and its "too few to rank" branches —
D-045 ruling 1 abolishes MIN_HISTORY, but that lands in a separate pass; leave every
`MIN_HISTORY` gate exactly as it is. `store/results.ts` (`windowLastN`/`windowByDays`/`tower`
are generic store helpers, unchanged). `live/towerSource.ts` (it inherits the fix through
`lapValues` with zero edits — you only add a test, §6.2). `RecordScreen.tsx`, `DemoScreen.tsx`
(inherit the new window through `ghostsFor`; no edits). `demos/mockup.html` (§8).

## 2. Verified code map (all paths relative to repo root; line numbers at HEAD 2026-08-27)

- `app/src/ui/colourModel.ts` — THE single window implementation. `WINDOW_N = 10` (line ~26),
  `MIN_HISTORY = 5` (line ~31), `ghostsFor` (line ~42), `lapValues` (~58), `sectorValues`
  (~66), `tierFor` (~86), `allTimeBestLapS` (~95), `positionAmong` (~106), `fmt` (~111).
- `app/src/ui/ResultScreen.tsx` — header rank line `rankLineFor` (lines ~53–70); `rideLaps =
  lapValues(ride.routeId, ride.rideId)` (~144); `PbDetail` component calls
  `buildPbDetail(ghostsFor(routeId), lastRideId)` (~93); `pbRows =
  buildPbRows(routeIdsInHistory(), allTimeBestLapS, (r) => ghostsFor(r).length)` (~170).
- `app/src/ui/rideHistoryModel.ts` — `buildRideRows` ranks each row via
  `if (lapS !== null) { const hist = laps(routeId, m.rideId); ... positionAmong(...) }`
  (lines ~111–116); `buildPbDetail` (~213) takes the window as a parameter (good — unchanged).
- `app/src/ui/RidesScreen.tsx` — line ~109 wires `buildRideRows(rides ?? [], getStoredResult,
  (routeId, excl) => lapValues(routeId, excl))`; renders `P${pos}/${of}` (~200). Inherits the
  window fix; NO edit in this file.
- `app/src/ui/RoutesScreen.tsx` — line ~78: `const n = ghostsFor(r.id).length;` feeding
  "N ghost lap(s) seeded". One-line edit (§4.4) so this count does not silently shrink to 9.
- `app/src/live/towerSource.ts` — `getLiveTowerPosition` uses `lapValues(st.track)` then
  `P${pos} of ${ghosts.length + 1}` (~35–39): inherits prev-9 → "of 10" automatically.
- `app/src/live/engine.ts` — lap scoring at ~907–921: `rawS = evFin.time - evStart.time`
  (gate-crossing event times), `movingS = rawS - stoppedS`. P3 comment goes here (§5.1).
- Tests: `app/tests/live_colour_suite.ts` (B-44 tests at ~136–200 need two assertion updates,
  §6.3; new tests §6.1–6.2), `app/tests/ridehistory_suite.ts` (new B-117 test §6.4),
  runner `app/tests/run.ts` (already imports both suites — no edit).

Seed facts you may rely on in tests: `app/src/store/results.seed.json` holds 30 results:
Morning 9 (all rank), EveningA 10 (all rank: 7 clean + 3 interrupted, all with real movingS;
fastest 810.004, slowest AND oldest `seed:20260728-1619-work2home-19501080034` at movingS 1253.97), EveningB 10, plus
one routeId:null. EveningA is the only seed route with a full 10 — the test fixture for
"exactly 9 previous + a 10th older ride excluded" (§6.1).

## 3. The design in one paragraph

`WINDOW_N` (10) becomes the POOL size; a new `WINDOW_PREV = WINDOW_N - 1` (9) is the
previous-rides comparison window. `ghostsFor` always slices to `WINDOW_PREV` — so whether the
judged ride is excluded by id (stored rides) or simply not present yet (live rides), the
comparison field is 9 previous rides and every `positionAmong(value, hist)` reads "P_n of ≤10".
A new `rankingPoolFor(routeId, currentRideId)` — built from the same ranked list — returns the
judged ride plus its 9 most recent other rides (or plain last-10 when there is no judged ride
on that route), and the RESULT screen's PB list reads THAT, so header and list share one pool
by construction. `rankedCountFor` gives the true uncapped count for "N rides on file". The
judged ride's own eligibility is checked against the store's `ranks()` (B-117), not
`movingS !== null` alone.

## 4. Source edits

### 4.1 `app/src/ui/colourModel.ts`

(a) Replace the `WINDOW_N` constant and its doc comment (currently lines ~24–26):

```ts
/** IDEAS §21: the comparison set is the last N rides on this route. A frozen
 * file was the bug — your own rides never entered it, so a personal best could
 * never raise the purple bar (cycle 009). */
export const WINDOW_N = 10;
```

with:

```ts
/** D-045 ruling 2 (Nathan, 2026-08-26): the RANKING POOL size — the judged
 * ride plus its WINDOW_PREV most recent previous rides, so a position always
 * reads "P_n of 10", never "of 11". (Historically IDEAS §21's last-N window;
 * a frozen file was the original bug — your own rides never entered it, so a
 * personal best could never raise the purple bar, cycle 009.) */
export const WINDOW_N = 10;

/** The previous-rides comparison window (D-045 ruling 2): the 9 most recent
 * rides a lap is judged against. Judged ride + this window = a pool of
 * exactly WINDOW_N. Sliced AFTER excluding the judged ride, so excluding can
 * no longer backfill an extra older ride into the field — the exact 2026-08-25
 * "P10 of 11 vs P9" bug (cycle 025). */
export const WINDOW_PREV = WINDOW_N - 1;
```

(b) Replace `ghostsFor` (currently lines ~36–47, including its doc comment) with:

```ts
/** All rankable history for a route, ascending startedAtMs, unwindowed.
 * Filtered by the store's own `ranks()` — not a local lookalike — so an
 * estimated lap or a tripwire-demoted seed can never sneak in (D-024/D-028). */
function rankedFor(routeId: string): RideResult[] {
  return [...GHOSTS, ...recordedResults()]
    .filter((r) => r.routeId === routeId && ranks(r))
    .sort((a, b) => a.startedAtMs - b.startedAtMs);
}

/**
 * The previous-rides comparison window: the WINDOW_PREV most recent ranked
 * rides, minus the judged ride when it is already stored (B-44's exclusion
 * survives; the slice is now WINDOW_PREV, per D-045 ruling 2). A live lap not
 * yet stored needs no exclusion and gets the same 9. Judged ride + this
 * window = the pool of WINDOW_N.
 */
export function ghostsFor(routeId: string, excludeRideId?: string): RideResult[] {
  return rankedFor(routeId).filter((r) => r.rideId !== excludeRideId).slice(-WINDOW_PREV);
}

/** True count of rankable rides on file for a route — NOT windowed. The only
 * honest source for an "N rides on file" caption (cycle 025: the old caption
 * showed the window size capped at 10 and could contradict the header). */
export function rankedCountFor(routeId: string): number {
  return rankedFor(routeId).length;
}

/**
 * THE ranking pool (D-045 ruling 2): the judged ride plus its WINDOW_PREV most
 * recent other ranked rides — never more than WINDOW_N total, the judged ride
 * always the pool's own 10th slot, so nothing read off this pool can say
 * "of 11". When `currentRideId` is null or has no ranked result on this
 * route, there is no judged ride and the pool is simply the last WINDOW_N
 * ranked rides (pure display). The RESULT header's rank line and the PB
 * ranking list both derive from this one shape — they cannot disagree again.
 */
export function rankingPoolFor(routeId: string, currentRideId: string | null): RideResult[] {
  const all = rankedFor(routeId);
  const current = currentRideId === null ? undefined : all.find((r) => r.rideId === currentRideId);
  if (current === undefined) return all.slice(-WINDOW_N);
  return [...all.filter((r) => r.rideId !== currentRideId).slice(-WINDOW_PREV), current]
    .sort((a, b) => a.startedAtMs - b.startedAtMs);
}

/** B-117 (RESULT half): true when the judged ride HAS a stored result on this
 * route but the store's own ranks() bars it (e.g. a tripwire-demoted lap) —
 * such a lap must not be ranked by a local movingS-only lookalike rule.
 * False when no stored result exists at all: an in-session lap that never
 * reached the store still ranks by its live numbers, as before. */
export function ownLapBarredFromRanking(routeId: string, rideId: string): boolean {
  const own = [...GHOSTS, ...recordedResults()]
    .find((r) => r.routeId === routeId && r.rideId === rideId);
  return own !== undefined && !ranks(own);
}
```

No other function in this file changes (`lapValues`, `sectorValues`, `tierFor`,
`allTimeBestLapS`, `positionAmong`, `fmt`, `stats` stay byte-identical — they inherit the new
window through `ghostsFor`). `ranks` is already imported at the top of the file.

### 4.2 `app/src/ui/ResultScreen.tsx`

(a) Extend the colourModel import (currently `MIN_HISTORY, allTimeBestLapS, fmt, ghostsFor,
lapValues, positionAmong, sectorValues, tierFor, type UiTier`) with `ownLapBarredFromRanking`,
`rankedCountFor`, `rankingPoolFor`. Keep `ghostsFor` imported only if still referenced after
your edits; if unreferenced, drop it from the import (tsc will tell you).

(b) Replace `rankLineFor` (currently lines ~51–70) with:

```ts
/** The rank line under the big lap figure — D-028's "an estimated lap never
 * ranks" and D-008's MIN_HISTORY floor, both stated in plain words. `hist` is
 * the previous-9 window (D-045 ruling 2), so the field is always "of ≤10" —
 * the same pool the PB list below renders. `barred` is the store-ranks() gate
 * (B-117): a stored lap the store refuses must not be ranked here either. */
function rankLineFor(ride: FinishedRide, hist: number[], barred: boolean): string {
  if (ride.lapMovingS !== null) {
    if (barred) return 'no rank — this lap is excluded from the comparison';
    if (hist.length >= MIN_HISTORY) {
      const { pos, of } = positionAmong(ride.lapMovingS, hist);
      return `P${pos} of ${of} on this route`;
    }
    return `${hist.length} rides of history — too few to rank`;
  }
  // Fix 2026-08-24 (WP-A3 review): the old 'ended early' copy here was wrong
  // for a lap that reached START and FINISH but lost a middle gate (quality
  // 'missed', ride.estimated false, lapMovingS null, lapRawS a real elapsed
  // time) — the rider did not end early. Mirrors the 'estimated' line's own
  // "never ranks" phrasing rather than inventing a new tone.
  return ride.estimated
    ? 'no time — an estimated lap never ranks'
    : 'no lap — a missed gate never ranks';
}
```

(c) Update the call site (currently `const rankLine = ride ? rankLineFor(ride, rideLaps) : '';`
at ~146) to:

```ts
  const rankLine = ride
    ? rankLineFor(ride, rideLaps, ownLapBarredFromRanking(ride.routeId, ride.rideId))
    : '';
```

(`rideLaps = lapValues(ride.routeId, ride.rideId)` just above stays exactly as is — it is now
the previous-9 window and also still feeds `tierFor`, which is correct: D-045 ruling 2 changes
the comparison window itself, colours included.)

(d) In the `PbDetail` component (~line 93), replace

```ts
  const detail = buildPbDetail(ghostsFor(routeId), lastRideId);
```

with

```ts
  // D-045 ruling 2: the SAME pool the header's rank line describes — the
  // judged ride + its 9 most recent previous rides — so list and header can
  // never disagree again (cycle 025's "P10 of 11 vs P9"). For a route the
  // last ride was not on, lastRideId matches nothing and this is the plain
  // last-WINDOW_N display window.
  const detail = buildPbDetail(rankingPoolFor(routeId, lastRideId), lastRideId);
```

(e) At `pbRows` (~line 170), replace

```ts
  const pbRows = buildPbRows(routeIdsInHistory(), allTimeBestLapS, (r) => ghostsFor(r).length);
```

with

```ts
  // rankedCountFor, not the window length: "N rides on file" must count what
  // is actually on file, never the window cap (cycle 025 — the old "10 rides
  // on file" caption was the window size and contradicted the header).
  const pbRows = buildPbRows(routeIdsInHistory(), allTimeBestLapS, rankedCountFor);
```

(f) P3 comment (doc-only, no behavior change): directly above the existing line
`const lapLabel = ride ? lapCellLabel(ride.lapMovingS, ride.estimated, ride.lapRawS) : '–';`
(~line 143) add:

```ts
  // HEADLINE-TIME DEFINITION (pinned 2026-08-27, cycle 025): this figure is the
  // GATED lap — START→FINISH gate-crossing times (moving time; live/engine.ts
  // scores rawS = FINISH event time − START event time, derive.ts identically
  // offline) — NEVER the button-to-button recording duration, which can differ
  // by minutes. Do not "simplify" this to the ride's start/stop timestamps.
```

Notes on what NOT to change in this file: `positionAmong` import stays (still used by
`rankLineFor`); `MIN_HISTORY` gate stays (§1, out of scope); the "personal best {pbLabel}"
value stays `allTimeBestLapS` (all-time, unwindowed) — that is a PB fact, not a ranking, and
Nathan's no-global-ranking ruling does not forbid it; the PbDetail caption
`last {detail.ranking.length} on this route` stays as-is (for the judged route the pool is the
last 10 by date whenever the judged ride is the newest, which it is on this screen).

### 4.3 `app/src/ui/rideHistoryModel.ts` (B-117, RIDES half)

(a) Add to the imports: `import { ranks } from '../store/results.ts';`

(b) In `buildRideRows`, replace (currently ~lines 111–116):

```ts
      let rank: { pos: number; of: number } | null = null;
      if (lapS !== null) {
        const hist = laps(routeId, m.rideId);
        // D-008/D-028: too little comparable history is NO verdict, not a
        // generous one — an estimated lap never reaches here at all (lapS is
        // null for 'estimated'/'missed' quality by construction).
        if (hist.length >= MIN_HISTORY) rank = positionAmong(lapS, hist);
      }
```

with:

```ts
      let rank: { pos: number; of: number } | null = null;
      // B-117 closed (cycle 025): the row's own eligibility is the store's
      // ranks(), not a movingS-only lookalike — a tripwire-demoted lap must
      // not take a position. The history side was already ranks()-filtered
      // via ghostsFor; this closes the judged-ride side.
      if (lapS !== null && ranks(result)) {
        const hist = laps(routeId, m.rideId);
        // D-008/D-028: too little comparable history is NO verdict, not a
        // generous one — an estimated lap never reaches here at all (lapS is
        // null for 'estimated'/'missed' quality by construction).
        if (hist.length >= MIN_HISTORY) rank = positionAmong(lapS, hist);
      }
```

(c) In the same function's doc comment, the sentence about `laps(routeId, excl)` may stay; do
not rewrite it.

### 4.4 `app/src/ui/RoutesScreen.tsx`

Line ~78: replace `const n = ghostsFor(r.id).length;` with
`const n = rankedCountFor(r.id);` and swap the import at line ~15 from
`import { ghostsFor } from './colourModel.ts';` to
`import { rankedCountFor } from './colourModel.ts';`
(Reason: this caption says "N ghost laps seeded" — a count of what exists, not a race window;
without this edit the new 9-slice would silently shrink "10 ghost laps seeded" to 9.)

## 5. Comment-only edits (P3)

### 5.1 `app/src/live/engine.ts`

At ~line 913, directly above `const rawS = evStart ? evFin.time - evStart.time : null;` add:

```ts
      // HEADLINE-TIME DEFINITION (pinned 2026-08-27, cycle 025): the lap is
      // GATED — START gate event time to FINISH gate event time — never the
      // button-to-button recording duration. ResultScreen's big figure and
      // store/derive.ts's offline lap both rest on this line.
```

(Planner verified at HEAD: `ev[0]`/`ev[nSec]` are the START/FINISH gate-crossing events, and
`derive.ts` computes the offline lap identically as `last.tB - first.tA` from `crossTime` at
gate chainages — the headline IS already gated time; this pin is documentation, not a fix.)

### 5.2 No other source files change.

`live/towerSource.ts` is deliberately untouched: `lapValues(st.track)` now returns the
previous-9 window, so its `P${pos} of ${ghosts.length + 1}` reads "of ≤10" automatically —
§6.2 locks that. `RidesScreen.tsx` untouched (inherits via `lapValues` + §4.3).

## 6. Tests

### 6.1 `app/tests/live_colour_suite.ts` — the ruling's core fixture

Add after the existing B-44 tests (after the `'B-44: window-inclusion guard ...'` test), using
the suite's existing `stateWith` and `doneSector` helpers. Also extend the suite's colourModel
import (line ~29) with `WINDOW_PREV`, `rankingPoolFor`, `rankedCountFor`.

```ts
test('D-045.2: ranking pool is previous-9 + current — a 10th-older previous ride is excluded', () => {
  // EveningA is the only seed route with a full 10 ranked rides; recording one
  // session ride makes 11 total — the exact shape of the 2026-08-25
  // "P10 of 11 vs P9" bug. Under D-045 ruling 2 the field must be 10.
  resetRecordedForTests();
  assert(rankedCountFor('EveningA') === 10,
    `this fixture needs EveningA's 10 ranked seed rides, got ${rankedCountFor('EveningA')} — seed curation changed, revisit this test`);

  const mine = 700; // faster than every seed EveningA lap (fastest is 810.0) => P1
  rememberRide(stateWith({
    track: 'EveningA',
    sectors: [doneSector(175), doneSector(175), doneSector(175), doneSector(175)],
    lap: { rawS: mine, stoppedS: 0, movingS: mine, estimated: false },
  }));
  const rideId = `session:${getLastRide()!.atMs}`;

  // Header path: previous window is 9, never 10 — pre-fix this was 10.
  const hist = lapValues('EveningA', rideId);
  assert(hist.length === WINDOW_PREV,
    `previous window must be WINDOW_PREV=${WINDOW_PREV}, got ${hist.length}`);
  const { pos, of } = positionAmong(mine, hist);
  assert(of === WINDOW_N, `the field is always exactly ${WINDOW_N} — pre-fix bug read 11, got ${of}`);
  assert(pos === 1, `700 s beats every seed lap, got P${pos}`);

  // The 10th-oldest previous ride (seed 20260728-1619, movingS ~1253.97 — both
  // the oldest and the slowest EveningA seed) is OUTSIDE the pool.
  const pool = rankingPoolFor('EveningA', rideId);
  assert(pool.length === WINDOW_N, `pool must be exactly ${WINDOW_N}, got ${pool.length}`);
  assert(pool.some((r) => r.rideId === rideId), "the judged ride is the pool's own 10th slot");
  assert(rankedCountFor('EveningA') === 11, 'route now holds 11 ranked rides in total');
  assert(!pool.some((r) => r.rideId === 'seed:20260728-1619-work2home-19501080034'),
    'the 10th-older previous ride (the oldest EveningA seed) must not be in the pool');

  // Header/list identity: the judged ride's position within the pool the PB
  // list renders equals the header's positionAmong answer.
  const byTime = [...pool].sort((a, b) => (a.lap.movingS as number) - (b.lap.movingS as number));
  assert(byTime.findIndex((r) => r.rideId === rideId) + 1 === pos,
    'header rank and PB-list rank must come from the same pool');

  // B-44 still holds: the judged ride never sits in its own previous window.
  assert(!hist.includes(mine), "B-44: today's lap must not be its own history");

  resetRecordedForTests();
});
```

### 6.2 Same file — the live chip inherits "of 10"

```ts
test('D-045.2: the live tower chip field is 10, not 11, on a route with 10 previous rides', () => {
  resetRecordedForTests();
  const chip = getLiveTowerPosition(stateWith({
    track: 'EveningA',
    lap: { rawS: 700, stoppedS: 0, movingS: 700, estimated: false },
  }));
  assert(chip === 'P1 of 10', `expected "P1 of 10" (previous-9 + the live lap), got "${chip}"`);
  resetRecordedForTests();
});
```

### 6.3 Same file — update the existing B-44 test's window arithmetic

In `'B-44: a just-recorded ride must not sit inside its own comparison history'`:

- Replace the assertion pair (currently ~lines 166–170):

```ts
  assert(
    hist.length === Math.min(priors, WINDOW_N),
    `expected ${Math.min(priors, WINDOW_N)} prior rides with today's excluded, got ${hist.length}`,
  );
```

  with:

```ts
  assert(
    hist.length === Math.min(priors, WINDOW_PREV),
    `expected ${Math.min(priors, WINDOW_PREV)} prior rides with today's excluded (D-045.2 window), got ${hist.length}`,
  );
```

- Replace the trailing conditional block (currently ~lines 173–176):

```ts
  if (priors < WINDOW_N) {
    const { pos, of } = positionAmong(mine, hist);
    assert(pos === 1 && of === priors + 1, `expected P1 of ${priors + 1}, got P${pos} of ${of}`);
  }
```

  with (unconditional — under D-045.2 the field is capped at WINDOW_N regardless of priors):

```ts
  const { pos, of } = positionAmong(mine, hist);
  const wantOf = Math.min(priors, WINDOW_PREV) + 1;
  assert(pos === 1 && of === wantOf, `expected P1 of ${wantOf} (D-045.2), got P${pos} of ${of}`);
```

`priors` is read from `lapValues('Morning')` before recording; Morning has 9 seed rides so
both old and new arithmetic yield 9/10 here — the edit keeps the test's MEANING aligned with
the new constant, it does not change its pass/fail today. Note: `WINDOW_N` stays imported
(6.1 uses it); if tsc flags any now-unused import in this suite, remove that name only.

### 6.4 `app/tests/ridehistory_suite.ts` — B-117 RIDES half

Add after the existing `'ridehistory: buildRideRows rank is null below MIN_HISTORY ...'` test,
using the suite's existing `makeResult` helper:

```ts
test('B-117: a tripwire-demoted lap never takes a position in RIDES rows', () => {
  const metas: RideMeta[] = [{ rideId: 'demoted', startMs: 9000, endMs: 9500, nFixes: 10 }];
  const demoted: RideResult = {
    ...makeResult('demoted', 'Morning', 9000, { movingS: 100, rawS: 100, quality: 'clean' }),
    tripwireDemoted: true,
  };
  const others = [190, 195, 205, 210, 215]; // >= MIN_HISTORY, so only the gate can stop a rank
  const rows = buildRideRows(metas, () => demoted, () => others);
  assert(rows[0].rank === null,
    `a tripwireDemoted lap must not rank even with a real movingS — got ${JSON.stringify(rows[0].rank)}`);
  assert(rows[0].lapLabel === fmt(100, 1), 'the time itself still displays honestly');
});
```

(`RideResult` and `RideMeta` types are already imported at the top of this suite.)

## 7. Verification — run ALL of it, in this order

1. `cd "$HOME/mnt/Qualifire/app" && node --experimental-strip-types tests/run.ts` — **zero
   FAIL** required. Expected effects of your change on existing tests: none should fail. If a
   test fails and the failure is PURELY the 10→9 window arithmetic in an assertion this brief
   did not list, STOP and escalate it verbatim (do not silently rewrite expectations beyond
   §6.3's two listed edits).
2. `cd "$HOME/mnt/Qualifire/app" && npx tsc --noEmit` — clean. Run synchronously in ONE call
   with the timeout parameter near its maximum (typically finishes in 20–45 s). Do NOT
   background it.
3. Sanity-confirm the pre-fix failure mode is locked: temporarily reason (do not code) —
   §6.1's `of === WINDOW_N` assert and §6.2's `'P1 of 10'` assert would both have FAILED
   against the old `.slice(-WINDOW_N)` ghostsFor (they'd read 11). State this in your report;
   you do not need to actually revert to prove it.

## 8. Mockup ruling (already decided — no action)

`demos/mockup.html` needs NO regeneration for this change: the planner verified at HEAD that
it contains no "of 11" text (grep count 0), no hardcoded rank that becomes wrong, and its own
`rankInTower` already ranks in-place within a ≤10 tower ("last-up-to-10 archive rides —
'P4 of 10'"), which matches the ruling's presentation. This is a comparison-window logic
change with zero layout/format change, so CONVENTIONS' mockup rule is not triggered. Do not
touch the file; repeat this ruling in your report so the inspector re-checks it.

## 9. P4 — informational finding (already settled by the planner; put it in your report verbatim, no code)

The seed DOES contain the "hidden" PB ride: `seed:20260808-0848-home2work-19649577531`,
routeId Morning, startedAt 2026-08-08T06:48Z (pre-2026-08-10, from the initial Strava seed),
lap movingS 816.675 s — which `fmt(816.675, 1)` renders as exactly the card's **13:36.6**. So
the 2026-08-25 review's PRIMARY hypothesis (a real, older ride holds the PB; header and list
were two correct computations over two different populations) is TRUE, and the rival
"composite of sector PBs" theory is FALSE. Nuance vs. the original hypothesis: the ride the
list WINDOW dropped need not be the PB ride itself — the mechanism is `ghostsFor`'s
exclude-before-slice backfilling one extra older ride into the header's field (any older ride
does it); the PB card is `allTimeBestLapS` (all-time, unwindowed, correct and unchanged).

## 10. Report back (your final message to the coordinator)

- Per-file summary of edits actually made, with anything that deviated from this brief (there
  should be nothing — a needed deviation is an escalation instead).
- Full test-run tally (pass/fail/skip counts) and confirmation tsc is clean.
- The §7.3 statement, the §8 mockup ruling, and the §9 P4 finding, restated.
- For the Principal (not you) to action afterwards: B-117 can be marked DONE (both halves
  closed: §4.3 RIDES, §4.2(b,c) RESULT via `ownLapBarredFromRanking`); D-037's window reading
  is now implemented per D-045 ruling 2; `WINDOW_PREV` is the constant future briefs should
  cite. MIN_HISTORY remains untouched, awaiting D-045 ruling 1's own pass.
