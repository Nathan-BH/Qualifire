# BRIEF B — DEMO tab: TENTH RIDE, and the ranking reveal after the demo's STOP

**Written 2026-09-19 UTC (Plan tier, fable). Brief 2 of 3 for the DEMO tab overhaul —
build order A → B → C.** Depends on `BRIEF-demo-fullscreen-run.md` (A) being committed:
this brief edits the `DemoPhase` / `enterEnding` / 'ending'-render shapes A creates and the
`demoLiveViewModel` it moved into `demoModel.ts`. `BRIEF-demo-self-dots.md` (C) depends on
the nine-column fixture and the `'tenth'` mode this brief adds. Do not start B until A's
commit hash is in hand; record it in the header of your report.

Nathan's ask (his items 2 and 3, unedited): *"for SECOND RIDE or TENTH RIDE option, let me
see the end ranking animation like it would normally be"* — *"3) add a third DEMO option
which is TENTH ride, so i can see the ranking tower animation properly."*

Anchors were read from the live `virgin` tree at HEAD `411aba9` (pre-A) on 2026-09-19:
`ui/demoModel.ts` (73 lines), `ui/rankingRevealModel.ts` (98), `ui/towerModel.ts` (122),
`ui/tower.tsx` (`MAX_VISIBLE`, pre-scroll block `:130–144`), `ui/colourModel.ts` (`tierFor`
`:158–164`, `MIN_HISTORY = 1` `:53`), `store/types.ts` (`RideResult` `:115–138`),
`store/timing.ts` (`scoredS` `:36–40`), `live/engine.ts` (`LiveLap` `:193–198`),
`tests/rankingreveal_suite.ts` (its `ride()` helper `:34–47`), `tests/demo_suite.ts`. After A
lands, `DemoScreen.tsx`'s line numbers are A's; anchor against A's committed file, not the
numbers in the digest. Executor: Sonnet, stop-on-ambiguity — any anchor mismatch, any call
this brief leaves open, any place where the data turns out shaped differently: STOP and
report file, line, and what is actually there. Never guess; it goes to a fresh Fable.

---

## 0. Rulings (the part Nathan should read)

### R1 — The demo's reveal is the real `buildRankingReveal`, fed a synthetic window

The digest assumed `buildRankingReveal` needs the store. It does not: its `window` and
`allTimeBestS` parameters are **injectable** (`rankingRevealModel.ts:71–77`; the store reads
are only the *defaults*, and a default-parameter expression is never evaluated when the
argument is passed). The tower model comes from `buildTowerModel(window, todayS, false,
startedAtMs, allTimeBestS)` (`towerModel.ts:50–56`), which is pure and takes plain
`RideResult` values. So the demo does **not** get a shape-mirroring copy of the reveal
builder. It builds nine synthetic `RideResult`s from its own pinned fixture and calls the
real thing:

```ts
buildRankingReveal(
  { track: DEMO_WAY_ID, lap: { rawS: script.lap, stoppedS: 0, movingS: script.lap, estimated: false } },
  DEMO_TODAY_RIDE_ID, nowMs, demoPriorResults(priorLaps, nowMs), allTimeBest,
)
```

Every ranking, tier, gap, PB ● and `climbMs` Nathan sees in the demo is therefore computed by
the same code that computes it after a real ride — cycle11 R2's "if two surfaces disagree,
that is a bug" holds for the demo too. `TimingTower` is mounted with the same props the real
'ending' screen passes (`justFinished`, `reveal`, `climbMs={reveal.climbMs}`,
`startDelayMs={REVEAL_START_DELAY_MS}`, `onPlayed`) and the same `REVEAL_HOLD_MS` hold —
those constants are imported from `rankingRevealModel.ts`, never copied, so a tuning edit
there is what the demo shows next time. Nothing touches the store: `rawS === movingS` on
every synthetic result, so `scoredS` (which reads the timing-mode register) gives the same
number in both modes.

### R2 — Three modes, and each mode's history depth is honest

`DemoMode = 'first' | 'second' | 'tenth'`. The pinned history table `DEMO_HISTORY` grows from
six to **nine** laps per sector, and a mode uses the **last `DEMO_PRIOR_LAPS[mode]` columns**
— `first: 0`, `second: 1`, `tenth: 9` — mirroring `ghostsFor`'s `.slice(-WINDOW_PREV)`
(colourModel.ts:77–79, the 9 most recent). The same slice feeds the sector strip tiers, the
map spans, the tower window and (brief C) the self dots, so all four surfaces in one demo
mode agree on which rides today is racing.

Consequence Nathan should know: **SECOND RIDE changes.** Today it judges the scripted lap
against six laps and shows purple/green/yellow at once. A real second ride has *one* prior
lap, and `tierFor` at n = 1 can only say purple or yellow (`colourModel.ts:150–164`; STATE.md
Scoring: "one prior ride compares purple/yellow only"). Ruling: SECOND RIDE becomes the honest
ride-2 — one prior lap, a two-row board, purple/yellow sectors — because Nathan's words are
"like it would normally be", and because a green sector next to a two-row tower would
contradict STATE.md on the very screen meant to show him what ships. The three-colour
showcase the demo was built for (WP-O) does not go away: it moves to **TENTH RIDE, which
becomes the default pill.** If Nathan prefers SECOND RIDE to keep its old six-lap colouring,
it is one number in `DEMO_PRIOR_LAPS` (named in `QUESTIONSFORNATHAN.md`).

### R3 — The nine laps, and where today lands

Existing six columns kept verbatim (so the pinned tier tests keep their meaning); three
appended. Column = one prior lap, S1..S4 rows:

```
S1: [190, 195, 188, 200, 192, 197, 194, 198, 191]   best 188, mean 193.9
S2: [210, 205, 215, 208, 212, 206, 211, 216, 209]   best 205, mean 210.2
S3: [230, 225, 235, 228, 232, 226, 229, 238, 233]   best 225, mean 230.7
S4: [210, 205, 215, 208, 212, 206, 211, 213, 209]   best 205, mean 209.9
lap: 840  830  853  844  848  835  845  865  842    best 830, mean 844.7
```

Today stays `DEMO_SECS = [185, 207, 237, 207]`, lap 836. Verified by hand (the executor
re-verifies in Task 4's tests, not by trusting this table):

- **TENTH RIDE (9 priors):** sectors S1 purple (185 < 188), S2 green (205 ≤ 207 < 210.2),
  S3 yellow (237 ≥ 230.7), S4 green — the existing pin, unchanged. Lap 836: **P3 of 10**
  (behind 830 and 835), tier **green**, gap `+6s`, `rowsPassed 7`, `climbMs 2000`. The P1
  row (830) carries the PB ●.
- **SECOND RIDE (1 prior = column 9, `[191, 209, 233, 209]` = 842):** S1 purple, S2 purple,
  S3 yellow, S4 purple. Lap 836: **P1 of 2**, tier **purple**, `rowsPassed 1`,
  `climbMs 800`; today's row carries the PB ● (it is the new all-time best — R4).

P3 rather than P1 for TENTH on purpose: a P1 landing passes every row and shows nothing
above today; P3 shows rows stepping down *and* two rows that stay put, i.e. the whole
mechanism. Nathan can move today anywhere on the board by editing one column; the tests in
Task 4 pin whatever he picks. Named in `QUESTIONSFORNATHAN.md`.

Dates: prior lap *k* (1-based, oldest first) started `DEMO_PRIOR_DAYS_AGO[k-1]` days before
`nowMs`, with `DEMO_PRIOR_DAYS_AGO = [16, 14, 13, 9, 8, 7, 6, 2, 1]` — weekday-commute
spacing, so the board's date column reads like a real fortnight. `nowMs` is a parameter
(Date.now() on the screen, fixed in tests).

### R4 — `allTimeBestS` = the best of the priors *and today*

`buildRankingReveal`'s real default is `allTimeBestLapS(track)`, which *does* see today's
stored lap (cycle11 R5: "a new PB is a fact about the time, not a ranking-window
question"). The demo passes `Math.min(...priorLaps, script.lap)` for the same reason. Hence
SECOND RIDE's today row gets the ●, TENTH RIDE's P1 row does.

### R5 — What TENTH RIDE will show, including the clipped climb — deliberately not "fixed"

`TimingTower` shows at most `MAX_VISIBLE = 8` rows (`tower.tsx:65`) and pre-scrolls so TODAY
is on screen (`:133–140`: with 10 rows and today at index 2, `start = 0`, rows 1–8 visible,
rows 9–10 clipped below). So in TENTH RIDE today's row starts its climb from the eighth
visible slot, passes **five** visible rows, and the climb lasts `climbMs = 2000` (scaled for
the **seven** rows it passes in the full model). That mismatch is the cycle11 Inspect note
this mode exists to let Nathan *see*. **Do not change `MAX_VISIBLE`, the pre-scroll, or
`climbMsFor` here** — whether the board should grow to ten rows, scale the duration to the
visible rows, or stay as is, is Nathan's call after seeing it, logged in
`QUESTIONSFORNATHAN.md`.

### R6 — The 'ending' sequence for SECOND / TENTH RIDE mirrors the real one exactly

`enterEnding()` (A) additionally builds the reveal (`buildDemoReveal(mode, Date.now())`) and
sets `revealDone = reveal === null`. The 'ending' render then shows, in order: headline
`Ride saved.` (the tower's TODAY row is the headline, cycle11 R2), the `TimingTower` in
reveal mode, and — **only after `onPlayed` + `REVEAL_HOLD_MS`** — the `DONE` bar A placed
there, in the slot the real screen gives the naming card. FIRST RIDE: `buildDemoReveal`
returns `null` (0 priors — ride 1 gets no reveal, cycle11 R4), so A's behaviour is unchanged:
headline with the time, card at once. The reveal hold timer is a ref cleared on exit and on
unmount, as `revealHoldRef` is in `RecordScreen.tsx`.

### R7 — Naming

`DEMO_TODAY_RIDE_ID = 'demo:today'`; `DEMO_PRIOR_LAPS`, `DEMO_PRIOR_DAYS_AGO`,
`demoHistoryFor`, `demoPriorResults`, `demoPriorLapSeconds`, `buildDemoReveal` in
`demoModel.ts`; `reveal` / `revealDone` / `revealHoldRef` in `DemoScreen.tsx` (the real
screen's names). Pill text `TENTH RIDE`.

### R8 — Docs in the same commit

`STATE.md` (the DEMO Known-stubs bullet, the reveal bullet's "not yet seen" note, cycle
pointer, test line), `GLOSSARY.md` (DEMO tab entry → three modes), `OPEN-ITEMS.md` (item 7
extended). Small anchored edits, same commit as the code.

### R9 — Out of scope (do not build, do not ask)

Self dots and `livePos` (brief C); any change to `tower.tsx`, `towerModel.ts`,
`rankingRevealModel.ts`, `colourModel.ts` (incl. `MAX_VISIBLE`, the pre-scroll, `climbMsFor`,
the constants — R5); a naming card after the reveal in SECOND/TENTH (the real WP-G "new
route on this way" card needs a catalog); an all-white past-row variant; a settings toggle;
a haptic at landing; `RecordScreen.tsx`; `app/src/store/**`.

---

## 1. Rules

- Touch only: `app/src/ui/demoModel.ts`, `app/src/ui/DemoScreen.tsx`, `app/tests/demo_suite.ts`,
  `STATE.md`, `GLOSSARY.md`, `OPEN-ITEMS.md`, this cycle folder.
- Never edit `App.tsx` (A already wired it), `IDEAS.md`, `CLAUDE.md`, `Nathan/`,
  `cycles/virgin-cycle1..10/`, `app/core/`, `app/src/store/**`, `app/src/ui/RecordScreen.tsx`,
  `app/src/ui/tower.tsx`, `app/src/ui/towerModel.ts`, `app/src/ui/rankingRevealModel.ts`,
  `app/src/ui/colourModel.ts`, `app/src/ui/selfRaceModel.ts`, `app/src/ui/wayMapView.tsx`,
  `app/src/ui/liveView.tsx`, `app/src/ui/demoWayFixture.ts`, `app/tests/run.ts`,
  `app/tests/rankingreveal_suite.ts`. If a task seems to need one → STOP and report why.
- Never delete. `mv` to `safe_to_delete/` only. `git add <path>` by name. Every git command
  with `GIT_OPTIONAL_LOCKS=0`; a stray `.git/*.lock` gets `mv`'d aside.
- `git status --short` at start must be clean apart from the untracked cycle11 files. HEAD
  must be A's commit — confirm its subject line reads "DEMO tab — RUN DEMO RIDE goes
  full-screen…"; if not, STOP.
- `demoModel.ts` stays pure (no react / expo / react-native imports). It may import
  `buildRankingReveal` and the `REVEAL_*` / `CLIMB_*` values from `./rankingRevealModel.ts`
  (pure), types from `../store/types.ts` (type-only) and `DEMO_WAY_ID` from
  `./demoWayFixture.ts` (pure data).
- `DemoScreen.tsx` still imports nothing from `app/src/store/**` at value level (A's grep).
- Stop-on-ambiguity on every "confirm" step. Nothing is done because it compiles.

Confirm before Task 1 and quote in the report:

1. `app/src/ui/rankingRevealModel.ts:71–77` is the `buildRankingReveal(st, rideId,
   startedAtMs, window = …, allTimeBestS = …)` signature with both defaults, and `:78–82`
   are the four null guards ending in `if (window.length === 0) return null;`.
2. `app/src/ui/towerModel.ts:59–66` filters `window` by `scoredS(r.lap) !== null` and reads
   only `r.lap`, `r.startedAtMs`, `r.source` from each `RideResult`.
3. `app/src/ui/tower.tsx:65` is `const MAX_VISIBLE = 8;` and `:133–140` is the pre-scroll
   block computing `start`/`rows`.
4. `app/tests/rankingreveal_suite.ts:34–47` is the `ride(movingS, startedAtMs, rideId,
   source)` literal helper with `lap: { rawS: movingS, movingS, quality: 'clean' }`,
   `sectors: []`, `derivedBy: { engineVersion: 'test', gateSetVersion: 1,
   resultSchemaVersion: 1 }`.
5. In A's committed `DemoScreen.tsx`: `enterEnding` exists as a `useCallback` with the
   "brief B adds the reveal build here" comment; the 'ending' render has the "brief B mounts
   the TimingTower here" comment above the `mode === 'first' ? … : <DONE bar>` block.
6. `app/src/ui/demoModel.ts` after A: `DemoMode = 'first' | 'second'` at its line 20 (or
   wherever A left it), `DEMO_HISTORY` with six columns, `demoTier(i, value)` reading
   `DEMO_HISTORY[i - 1]`, `demoSectorColours(script, gatesDone, paint)`, and A's additions
   (`demoLiveViewModel`, `demoStopOutcome`, …).

Any mismatch → STOP.

---

## 2. Task 1 — `demoModel.ts`: nine columns, mode depth, synthetic results, the reveal

1. `export type DemoMode = 'first' | 'second' | 'tenth';`
2. `DEMO_HISTORY` → the nine columns of R3 (append the three new values to each row; keep
   the per-row comments and update best/mean in them). Update the header paragraph that
   says "pins six laps per sector".
3. Add:
   ```ts
   /** R2: how many of the pinned laps a mode "has ridden before" — the LAST n columns of
    *  DEMO_HISTORY, mirroring ghostsFor's slice(-WINDOW_PREV). first: 0 (ride 1 races
    *  nobody and gets no reveal), second: 1, tenth: 9. */
   export const DEMO_PRIOR_LAPS: Readonly<Record<DemoMode, number>> = { first: 0, second: 1, tenth: 9 };
   /** Days before `nowMs` each prior lap (oldest first) was ridden — a plausible fortnight. */
   export const DEMO_PRIOR_DAYS_AGO: readonly number[] = [16, 14, 13, 9, 8, 7, 6, 2, 1];
   export const DEMO_TODAY_RIDE_ID = 'demo:today';

   /** The last `priorLaps` columns of DEMO_HISTORY, per sector. 0 → four empty rows. */
   export function demoHistoryFor(priorLaps: number): readonly (readonly number[])[];
   /** Per-lap sums of those columns (the lap's own comparison window). */
   export function demoPriorLapSeconds(priorLaps: number): number[];
   ```
   and re-plumb: `demoTier(i, value, priorLaps = DEMO_HISTORY[0].length)` (the lap history
   for `i === 0` is `demoPriorLapSeconds(priorLaps)`; the module-level `DEMO_LAP_HISTORY`
   constant goes away or becomes the 9-deep default), `demoSectorColours(script, gatesDone,
   paint, priorLaps = DEMO_HISTORY[0].length)`, `demoLiveViewModel(script, clockS, nowMs,
   livePos = null, priorLaps = DEMO_HISTORY[0].length)` — each passing `priorLaps` down.
   Defaults keep every existing call and test meaning "against all nine" (which is what the
   old six-deep default meant: "against all of them").
4. Synthetic window + reveal:
   ```ts
   import type { RideResult } from '../store/types.ts';
   import { buildRankingReveal, type RankingReveal } from './rankingRevealModel.ts';
   import { DEMO_WAY_ID } from './demoWayFixture.ts';

   /** R1: the last `priorLaps` pinned laps as RideResults — the shape buildTowerModel reads
    *  (lap, startedAtMs, source). Oldest first; rideId 'demo:prior-<k>' with k the 1-based
    *  column index in DEMO_HISTORY, so brief C's SelfTracks can share the ids. */
   export function demoPriorResults(priorLaps: number, nowMs: number): RideResult[];
   /** R1/R4: the real reveal builder over the synthetic window. null for 'first' (0 priors —
    *  ride 1 gets no reveal, cycle11 R4). */
   export function buildDemoReveal(mode: DemoMode, nowMs: number, script: DemoScript = buildDemoScript()): RankingReveal | null;
   ```
   `demoPriorResults` literal per result, copying `rankingreveal_suite.ts`'s `ride()` shape:
   `kind: 'rideResult'`, `schemaVersion: 2` (`RESULT_SCHEMA_VERSION` is 2 per STATE.md —
   the value is not read by the builder, but do not write a stale one), `rideId`,
   `startedAtMs: nowMs - DEMO_PRIOR_DAYS_AGO[col] * 86_400_000`, `wayId: DEMO_WAY_ID`,
   `source: 'app'`, `lap: { rawS: lapS, movingS: lapS, quality: 'clean' }`, `sectors: []`,
   `derivedBy: { engineVersion: 'demo', gateSetVersion: 1, resultSchemaVersion: 2 }`.
   `buildDemoReveal` is R1's call with `allTimeBest = Math.min(...demoPriorLapSeconds(n),
   script.lap)` (R4) and `priorLaps = DEMO_PRIOR_LAPS[mode]`.

Check: `tsc` clean; `grep -nE "from 'react|expo" app/src/ui/demoModel.ts` prints nothing;
the existing `demo_suite.ts` still passes unchanged before Task 4 touches it (the defaults
must preserve the old pins — if any existing demo test fails here, STOP: the nine columns
have moved a mean across a threshold, and R3's table is wrong).

## 3. Task 2 — `DemoScreen.tsx`: the third pill, the reveal, the gated DONE bar

Anchor against A's committed file.

1. **Imports.** `TimingTower` from `'./tower'`; `REVEAL_HOLD_MS, REVEAL_START_DELAY_MS, type
   RankingReveal` from `'./rankingRevealModel.ts'`; `buildDemoReveal, DEMO_PRIOR_LAPS` added
   to the `demoModel.ts` import.
2. **Default mode** `useState<DemoMode>('tenth')` (R2). **Pill row**: a third pill `TENTH
   RIDE` after SECOND RIDE, same styles; the three pills keep `flex: 1` (they will be
   narrower — if the text wraps on a phone-width preview, `fontSize: 12` on `pillText` is
   the allowed adjustment; report it). Idle description line for tenth: `'Your tenth ride:
   nine earlier rides to beat — the full timing tower climbs after STOP.'`
3. **State** beside A's `busy`/`saved`:
   ```ts
   const [reveal, setReveal] = useState<RankingReveal | null>(null);
   const [revealDone, setRevealDone] = useState(true);
   const revealHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   ```
   Cleared (timer) in `exitToIdle` and the unmount effect; `setReveal(null)` in `exitToIdle`.
4. **`enterEnding`** at A's comment:
   ```ts
   const next = buildDemoReveal(mode, Date.now());
   setReveal(next);
   setRevealDone(next === null);
   ```
   before `setPhase('ending')`. `mode` must be in the callback's deps (or read through a
   ref) — a stale `'second'` closure building a two-row board for TENTH RIDE is exactly the
   bug to avoid; confirm by reading.
5. **`onRevealPlayed`** — `RecordScreen.tsx`'s verbatim shape minus the card/rev branch:
   ```ts
   const onRevealPlayed = useCallback(() => {
     revealHoldRef.current = setTimeout(() => { revealHoldRef.current = null; setRevealDone(true); }, REVEAL_HOLD_MS);
   }, []);
   ```
6. **Ending render.** Replace A's comment line with
   ```tsx
   {reveal !== null && (
     <TimingTower model={reveal.model} justFinished reveal climbMs={reveal.climbMs}
       startDelayMs={REVEAL_START_DELAY_MS} onPlayed={onRevealPlayed} />
   )}
   ```
   and wrap A's `mode === 'first' ? … : <DONE bar>` block in `{revealDone ? ( … ) : null}`.
   The headline: `reveal !== null ? 'Ride saved.' : \`Ride saved — ${demoFmtMS(clockS)}.\``
   (the reveal, not the mode, decides — same expression as the real screen). `justFinished`
   is the constant `true` for the life of the 'ending' phase (cycle11 Task 3 step 6's note:
   never gate it on state that could be false at the first 'ending' render).
7. **Depth plumbing.** Every `demoTier` / `demoSectorColours` / `demoLiveViewModel` call in
   the screen passes `DEMO_PRIOR_LAPS[mode]` (R2). The buzz condition is already `mode !==
   'first'` (A).
8. `exitToIdle` also does `setRevealDone(true)` so the next FIRST RIDE ending is not gated.

Checks: `tsc` clean. Read the ending JSX top to bottom and confirm the order headline →
tower → (after hold) DONE bar / card; confirm `reveal` is rebuilt on every `enterEnding`
(never reused across runs — A's `exitToIdle` nulls it, and a skip never builds one).

## 4. Task 3 — Confirm `TimingTower` is happy with ten rows and no `todaySub`

Read `tower.tsx:130–160` and the today-row render. Confirm: `model.todaySub` undefined is
fine (`todayBlockH = TODAY_ROW_H + (model.todaySub ? SUB_H : 0)`); the P1 row's PB ● and the
past rows' dates render from `TowerRowModel` alone (no store lookups inside the component).
Report. If the component reads anything global → STOP.

## 5. Task 4 — Tests: extend `app/tests/demo_suite.ts`

Add to the dynamic import: `DEMO_PRIOR_LAPS, DEMO_PRIOR_DAYS_AGO, DEMO_TODAY_RIDE_ID,
demoHistoryFor, demoPriorLapSeconds, demoPriorResults, buildDemoReveal`; also
`const { WINDOW_N } = await import('../src/ui/colourModel.ts')` and `const { CLIMB_MAX_MS,
climbMsFor } = await import('../src/ui/rankingRevealModel.ts')`. Cases:

- **Nine pinned laps per sector, four sectors, nine dates.** Every `DEMO_HISTORY` row has
  length 9 and equals `DEMO_PRIOR_LAPS.tenth`; `DEMO_PRIOR_DAYS_AGO.length === 9` and is
  strictly decreasing (oldest first).
- **Lap seconds are the column sums.** `demoPriorLapSeconds(9)` deep-equals
  `[840, 830, 853, 844, 848, 835, 845, 865, 842]`; `demoPriorLapSeconds(1)` equals `[842]`;
  `demoHistoryFor(1)` is `[[191],[209],[233],[209]]`; `demoHistoryFor(0)` is four empty rows.
- **TENTH RIDE keeps the three-colour pin.** `demoTier(1..4, DEMO_SECS[i], 9)` →
  `purple, green, yellow, green`; `demoTier(0, 836, 9) === 'green'`. (Rewrite the existing
  "demoTier pins the fixture" test to pass `9` explicitly and keep the old default-arg
  assertions too — both must hold.)
- **SECOND RIDE is purple/yellow only.** `demoTier(1..4, DEMO_SECS[i], 1)` → `purple, purple,
  yellow, purple`; `demoTier(0, 836, 1) === 'purple'`; and no `i` yields `'green'` at depth 1.
- **FIRST RIDE is neutral everywhere.** `demoTier(i, DEMO_SECS[i-1], 0) === 'neutral'` for
  `i` 1..4 and `demoTier(0, 836, 0) === 'neutral'` (the MIN_HISTORY floor, honest ride 1).
- **Synthetic results have the store's shape.** `demoPriorResults(9, T)`: length 9, ids
  `demo:prior-1 … demo:prior-9`, every `source === 'app'`, `wayId === DEMO_WAY_ID`,
  `lap.rawS === lap.movingS`, `startedAtMs` strictly increasing and `=== T -
  DEMO_PRIOR_DAYS_AGO[k] * 86_400_000`; `demoPriorResults(1, T)` is exactly the last one.
- **No reveal on ride 1.** `buildDemoReveal('first', T) === null`.
- **SECOND RIDE: P1 of 2, purple, one row climbed, today is the PB.** `r = buildDemoReveal(
  'second', T)`: `pos 1, of 2, tier 'purple', rowsPassed 1, climbMs 800`; the today row has
  `pb === true`, `time '13:56'`, `gap '—'`; the other row `time '14:02'`, `gap '+6s'`.
- **TENTH RIDE: P3 of 10, green, seven rows climbed, P1 is the PB.** `r = buildDemoReveal(
  'tenth', T)`: `pos 3, of 10, tier 'green', rowsPassed 7, climbMs === climbMsFor(7) ===
  2000 < CLIMB_MAX_MS`; `of <= WINDOW_N`; rows ascending by parsed time; exactly one
  `today`; `rows[0].time === '13:50'` with `pb === true`; today's `gap === '+6s'` and
  `pb === false`.
- **Rows 9 and 10 exist (the clipped-climb fact, R5).** `r.model.rows.length === 10` and
  `rows[9].time === '14:25'` — pins that the board really has two rows below the tower's
  `MAX_VISIBLE`, so R5's observation stays true until Nathan rules on it.
- **Dates are the priors' dates.** `r.model.rows.find(x => x.time === '13:50').date ===
  towerDate(T - 14 * 86_400_000)` (import `towerDate` from `towerModel.ts`).

Zero FAIL on the whole suite.

## 6. Task 5 — Docs (same commit as the code)

- `STATE.md`
  - Known-stubs DEMO bullet (A's text): append "**Brief B:** a third mode, TENTH RIDE
    (default), nine pinned prior laps; SECOND RIDE is now an honest ride 2 (one prior lap,
    purple/yellow only). After the demo's STOP, SECOND/TENTH mount the real `TimingTower`
    with a board built by the real `buildRankingReveal` over synthetic `RideResult`s
    (`demoModel.ts` `buildDemoReveal`) — same window rule, constants and hold as the real
    'ending' screen; today lands P1 of 2 (purple) / P3 of 10 (green)."
  - "Ranking reveal is built" bullet, its last sentence "**Not yet seen on the phone** — a
    headless container can't render the real climb": append "; since brief B the DEMO tab
    (SECOND / TENTH RIDE) plays the same reveal over a synthetic board, so the animation can
    be eyeballed without riding — the real-ride check in OPEN-ITEMS item 6 still stands."
  - Test line refresh; cycle-history line: append ", brief B (`BRIEF-demo-tenth-ride-reveal.md`)".
- `GLOSSARY.md` **DEMO tab** entry: "Two modes: …" → "Three modes: FIRST RIDE (a stranger's
  first ride and the naming card), SECOND RIDE (one prior ride — a two-row tower) and TENTH
  RIDE (nine prior rides — the full tower climb)."
- `OPEN-ITEMS.md` item 7: append "SECOND RIDE / TENTH RIDE → after the roll-out: 'Ride
  saved.', the tower with today parked at the bottom in plain ink, ~0.5 s later the climb
  (0.8 s for SECOND, 2.0 s for TENTH), rows stepping down one by one, the hard colour + P<n>
  cut, ~1.5 s hold, then the DONE bar. TENTH RIDE: note that the board shows 8 of 10 rows and
  today visibly passes 5 while the duration is scaled for 7 — Nathan's call
  (`QUESTIONSFORNATHAN.md`)."

---

## 7. Verify, then commit

1. `cd app && node --experimental-strip-types tests/run.ts` → zero FAIL; totals before (A's
   numbers) and after.
2. `cd app && ./node_modules/.bin/tsc --noEmit` → exit 0.
3. `git diff --stat`: only §1 files.
4. Commit by name (`git add app/src/ui/demoModel.ts app/src/ui/DemoScreen.tsx
   app/tests/demo_suite.ts STATE.md GLOSSARY.md OPEN-ITEMS.md cycles/virgin-cycle11/`).
   Message:

```
virgin-cycle11: DEMO tab — TENTH RIDE and the ranking reveal after the demo's STOP (brief B)

Third demo mode, TENTH RIDE (now the default): the pinned history grows to
nine laps per sector and each mode judges today against the LAST n of them
(first 0, second 1, tenth 9) — the same slice rule as ghostsFor — so SECOND
RIDE becomes an honest ride 2 (purple/yellow only, two-row board) and the
three-colour showcase moves to TENTH. After the demo's STOP, SECOND/TENTH
mount the real TimingTower in reveal mode over a board built by the real
buildRankingReveal with an injected synthetic RideResult window (no store):
same constants, same hold, same P/gap/PB rules. Today lands P1 of 2 purple
and P3 of 10 green (climbs 7 rows over 2.0 s; the tower shows 8 of 10 —
left as-is for Nathan to see). FIRST RIDE unchanged (no reveal). Tests pin
every number. STATE/GLOSSARY/OPEN-ITEMS updated. tower.tsx,
rankingRevealModel.ts, RecordScreen untouched.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Ssts3UN9gbxYxTjHH8sEWW
```

Push is expected to fail from this device (403, cycle5/6/11 precedent) — say so, one retry
at most.

---

## 8. Report back

1. HEAD at start (must be A's commit — quote its subject), `git status --short`, the commit
   hash at end.
2. The six §1 anchor confirmations, quoted.
3. Task 1: the final `DEMO_HISTORY` literal and `buildDemoReveal` body as committed.
4. Task 2: `enterEnding` and the ending JSX as committed; whether `pillText` needed the
   size change.
5. Task 3's two confirmations.
6. Test totals before/after; `tsc`.
7. **Plain-language walk-through for Nathan:** SECOND RIDE and TENTH RIDE from RUN to DONE,
   with the numbers (P1 of 2 purple, 0.8 s climb; P3 of 10 green, 2.0 s climb, 8 of 10 rows
   visible, +6s gap, where the PB ● sits).
8. Tokens (this tier); the tier | model | tokens | outcome row.
9. Every STOP you hit and did not resolve.
