# BRIEF C — DEMO tab: the self dots race alongside in SECOND RIDE and TENTH RIDE

**Written 2026-09-19 UTC (Plan tier, fable). Brief 3 of 3 for the DEMO tab overhaul —
build order A → B → C.** Depends on `BRIEF-demo-fullscreen-run.md` (A) and
`BRIEF-demo-tenth-ride-reveal.md` (B) both being committed: this brief reuses B's
nine-column `DEMO_HISTORY`, `DEMO_PRIOR_LAPS`, `demoPriorResults` ids and the `'tenth'` mode,
and A's full-screen run render. Do not start until B's commit hash is in hand.

Nathan's ask (item 4, unedited): *"i also think for the SECOND RIDE/ TENTH RIDE demos i want
to see the self dots racing alongside so i can see how that works visually as well."*

Anchors were read from the live `virgin` tree at HEAD `411aba9` (pre-A) on 2026-09-19:
`ui/selfRaceModel.ts` (`SelfTrack` `:80–92`, `selfPositionAt` `:148`, `selfDotsAt` `:185`,
`selfLivePosition` `:355–360`, `DECIMATE_MIN_GAP_MS = 2000` `:236`), `ui/wayMapView.tsx`
(`selfs?: readonly SelfDot[]` `:276`, `selfsFeatureCollection(props.selfs ?? [])` `:532`),
`ui/wayMapMath.ts` (`positionAtTime`, pure, no imports), `ui/demoWayFixture.ts`
(`DEMO_WAY_ASSET`, `gateIdx` of length 5), `ui/RecordScreen.tsx` (`livePos` memo `:952–956`,
the `selfs=` prop `:1224`), `ui/liveView.tsx` (`livePos?` `:111`), `STATE.md` (the cycle6
bullet with "DEMO tab … untouched by design (R9)"). After A and B, `demoModel.ts` /
`DemoScreen.tsx` numbers are theirs — anchor against the committed files. Executor: Sonnet,
stop-on-ambiguity — any mismatch, any open call: STOP, report file/line/what is there. Never
guess; it goes to a fresh Fable.

---

## 0. Rulings (the part Nathan should read)

### R1 — This deliberately reverses cycle6's R9 for the DEMO tab, at Nathan's request

`cycles/virgin-cycle6/BRIEF-live-self-racing.md` R9 put "DEMO-tab selfs" out of scope, and
STATE.md records it: "PNG rung, DEMO tab and free mode untouched by design (R9)". That was
the right call then — cycle6 was building the real feature and the demo had no full-screen
run to put dots on. Nathan has now asked for exactly this in his own words (above). Ruling:
**the DEMO-tab half of cycle6 R9 is reversed, on purpose, by this brief; the PNG-rung and
free-mode halves stand.** Task 4 rewrites the STATE.md sentence so a future reader sees a
deliberate, dated, Nathan-directed reversal — not a coordinator who forgot the rule (the same
honesty discipline cycle9 used when it corrected an earlier misreading).

### R2 — Synthetic `SelfTrack`s, never ride files; positions from the same path as the rider

`loadSelfTracks` reads `rides/<rideId>.jsonl` (`selfRaceModel.ts:332–407`) — the demo has no
ride files and must not manufacture any ("Nothing here writes to storage"). Ruling: the demo
builds `SelfTrack` values by hand, one per pinned prior lap, with fixes sampled from the same
`positionAtTime(asset, gateAt_k, t)` the live rider dot already uses (`DemoScreen.tsx`, via
`wayMapMath.ts`) — where `gateAt_k` is *that prior lap's own* gate-crossing times, i.e. its
column of `DEMO_HISTORY`. So a self that was faster through S1 pulls ahead in S1, the one
that lost time in S3 drops back there, and the self that finishes fastest (830 s, column 2)
is visibly ahead at the line — consistent with its P1 in the tower, its purple dot colour,
and the `+6s` gap today lands on. No invented paces, no second notion of who is racing whom:
the window is `DEMO_PRIOR_LAPS[mode]` (B's R2), the same slice that feeds the strip and the
board.

Fixes every `DEMO_SELF_FIX_STEP_S = 2` simulated seconds (the loader's own
`DECIMATE_MIN_GAP_MS`), first fix at the START crossing, last fix exactly at the lap. Nine
tracks × ~430 fixes ≈ 3.9k points held for the run — the real loader's budget for nine
30-minute rides is the same order. Between fixes `selfPositionAt` interpolates linearly, as
it does for real fixes.

### R3 — Time anchor: the demo clock IS the START-gate clock

Cycle6 R1 times every self from the live rider's START-gate crossing. In the demo the rider
crosses START at `clockS = 0` (`script.gateAt[0] === 0`), so `elapsedMs = clockS × 1000`
exactly — no `startGateT`, no offset. Before RUN (`clockS === 0`, not running) `elapsedMs`
is `null` → every self `'waiting'`, parked on START (all dots stacked on the rider, exactly
as on the kerb). During the roll-out (A's R3, 60 sim-s) the clock keeps running so every
slower self reaches its FINISH and freezes there (`'finished'`, 35 % opacity per cycle6 R5)
— the slowest, 865 s, finishes 29 s after the rider, inside the roll-out (A's test pins
`DEMO_ROLL_OUT_S >= 30`).

The dots are recomputed on the demo's own 33 ms tick (they are derived from `clockS`, which
already re-renders the screen at that rate). The real screen ticks the dots at 250 ms
(cycle6 Task 5 step 3) because its rider only moves per GPS fix; the demo rider moves every
tick, and nine dots stuttering at 4 Hz next to a smooth rider would misrepresent the feature.
If the phone stutters, quantising `elapsedMs` to 250 ms is one line (named in the report).

### R4 — Colours, size, layering: whatever the real screen does, via the real prop

The demo passes its dots to `WayMapView`'s existing `selfs` prop (`wayMapView.tsx:276`,
typed `readonly SelfDot[]`, additive, "undefined/[] = the source still mounts, empty").
Confirmed by reading: **no change to `WayMapView` is needed** — `selfDotsAt` already
assigns `tier` / `rank` / `best`, the layer already paints purple / green / yellow by tier,
sorts P1 on top by `sortKey`, and dims finished dots. The demo obeys the same
`settings.selfDots` toggle as the real screen (`RecordScreen.tsx:1224`), so Nathan can flip
it in SETTINGS and watch the dots vanish in the demo too. FIRST RIDE never gets dots (0
priors — ride 1 races nobody, cycle6 R2).

### R5 — The live `P` on the context row comes along, by a demo chainage in sector units

Cycle6's follow-up R10 shows `P<n>` on the pane's context row: `1 + count(selfs whose
chainage > rider's)` (`selfLivePosition`, `selfRaceModel.ts:355–360`), null before START and
once the lap lands. Real chainage is metres along the reference line; the demo has no
`RefLine`. Ruling: the demo uses a **sector-unit chainage** `demoChainage(gateAt, t) = k +
(t − gateAt[k]) / (gateAt[k+1] − gateAt[k])` ∈ [0, 4], linear in time within a sector. This
is monotone along the route and, because `positionAtTime` is also linear-in-time within a
sector, two riders with the same `demoChainage` are at the same place on the path — so
"ahead" means ahead. Every self fix carries it as `sM`, the rider's is computed live, and
`selfLivePosition` is called unchanged. Nathan sees `S3 · P2` on the context row exactly as
he would on the bike. The `P` disappears when the lap lands (`gatesDone >= 4`), as the real
one does (`live.lap !== null`).

### R6 — Naming

`demoChainage`, `demoSelfTracks`, `DEMO_SELF_FIX_STEP_S` in `demoModel.ts`; `selfTracks`,
`selfDots`, `elapsedMs`, `livePos` in `DemoScreen.tsx` (the real screen's names). Track ids
are B's `demo:prior-<k>` so a dot and a tower row are the same thing.

### R7 — Docs in the same commit

`STATE.md` (the cycle6 bullet's R9 sentence — R1's wording, the DEMO Known-stubs bullet,
test line, cycle pointer), `GLOSSARY.md` (**Self** entry, one clause), `OPEN-ITEMS.md`
(item 7 extended). Same commit as the code.

### R8 — Out of scope (do not build, do not ask)

Any change to `selfRaceModel.ts`, `wayMapView.tsx`, `RecordScreen.tsx`, `liveView.tsx`;
a metres-based chainage or a `RefLine` for the demo; dots in FIRST RIDE; a legend or labels
on dots; a demo-only dot style; the PNG rung; free mode; the 250 ms quantisation (R3 names
it, does not build it).

---

## 1. Rules

- Touch only: `app/src/ui/demoModel.ts`, `app/src/ui/DemoScreen.tsx`, `app/tests/demo_suite.ts`,
  `STATE.md`, `GLOSSARY.md`, `OPEN-ITEMS.md`, this cycle folder.
- Never edit `App.tsx`, `IDEAS.md`, `CLAUDE.md`, `Nathan/`, `cycles/virgin-cycle1..10/`,
  `app/core/`, `app/src/store/**`, `app/src/ui/RecordScreen.tsx`, `app/src/ui/selfRaceModel.ts`,
  `app/src/ui/wayMapView.tsx`, `app/src/ui/wayMapMath.ts`, `app/src/ui/liveView.tsx`,
  `app/src/ui/tower.tsx`, `app/src/ui/rankingRevealModel.ts`, `app/src/ui/demoWayFixture.ts`,
  `app/tests/run.ts`, `app/tests/selfrace_suite.ts`. If a task seems to need one → STOP.
- Never delete. `mv` to `safe_to_delete/`. `git add <path>` by name. `GIT_OPTIONAL_LOCKS=0`
  on every git command; a stray `.git/*.lock` gets `mv`'d aside.
- HEAD at start must be B's commit (subject "DEMO tab — TENTH RIDE and the ranking reveal
  …"); `git status --short` clean apart from the untracked cycle11 files. Otherwise STOP.
- `demoModel.ts` stays pure. It may `import type { SelfTrack } from './selfRaceModel.ts'`
  (type-only — the value module pulls in the store graph, which the pure model must not
  load), `positionAtTime` + `type WayAsset` from `./wayMapMath.ts` (pure), `DEMO_WAY_ASSET`
  from `./demoWayFixture.ts` (pure data).
- `DemoScreen.tsx` imports `selfDotsAt`, `selfLivePosition` from `./selfRaceModel.ts` at
  value level (as `RecordScreen.tsx` does) and still nothing from `../store/**` at value level.
- Stop-on-ambiguity on every "confirm" step. Nothing is done because it compiles.

Confirm before Task 1 and quote:

1. `app/src/ui/selfRaceModel.ts:80–92` is `SelfTrack { rideId; startMs; finishMs; lapS;
   fixes: readonly { tUnixMs; lat; lon; sM?: number }[] }`; `:185` opens `export function
   selfDotsAt(tracks, elapsedMs)`, which drops tracks with `< 2` fixes or `finishMs <=
   startMs` and ranks by ascending `lapS`; `:355–360` is `selfLivePosition(dots,
   riderChainageM)` returning `1 + count(d.sM !== null && d.sM > riderChainageM)`, null
   when `riderChainageM === null` or no dots.
2. `app/src/ui/wayMapView.tsx:276` is `selfs?: readonly SelfDot[];` and `:532` is `return
   selfsFeatureCollection(props.selfs ?? []);` inside a `useMemo`.
3. `app/src/ui/wayMapMath.ts` `positionAtTime(a, gateTimes, tSec)`: returns `null` only when
   `path`/`gateIdx` are missing or `idx.length !== gateTimes.length`; at `tSec <= 0` it
   returns `path[gateIdx[0]]` exactly; at `tSec >= gateTimes[last]` it clamps to the last
   gate. (Read the function; do not trust this summary.)
4. `app/src/ui/demoWayFixture.ts`: `DEMO_WAY_ASSET.gateIdx` has 5 entries and `path` ≥ 2
   points.
5. B's committed `demoModel.ts` exports `DEMO_PRIOR_LAPS`, `DEMO_PRIOR_DAYS_AGO`,
   `demoHistoryFor`, `demoPriorLapSeconds`, `demoPriorResults(priorLaps, nowMs)` with ids
   `demo:prior-<k>` and `startedAtMs = nowMs - DEMO_PRIOR_DAYS_AGO[k-1] * 86_400_000`, and
   `demoLiveViewModel(script, clockS, nowMs, livePos = null, priorLaps = …)`.
6. A's committed `DemoScreen.tsx` running-phase render passes `sectorColours={…}` and
   `leadColour={colors.grey}` on the SECOND/TENTH map and has no `selfs=` prop yet.

Any mismatch → STOP.

---

## 2. Task 1 — `demoModel.ts`: `demoChainage`, `demoSelfTracks`

```ts
import type { SelfTrack } from './selfRaceModel.ts';
import { positionAtTime, type WayAsset } from './wayMapMath.ts';
import { DEMO_WAY_ASSET } from './demoWayFixture.ts';

/** R2: sim-seconds between synthetic self fixes — the loader's DECIMATE_MIN_GAP_MS. */
export const DEMO_SELF_FIX_STEP_S = 2;

/** R5: chainage in SECTOR units, 0 at START, 4 at FINISH: k + fraction of sector k,
 *  linear in time (positionAtTime is linear-in-distance-in-time within a sector, so equal
 *  values mean the same spot on the path). Clamped to [0, gateAt.length - 1]. */
export function demoChainage(gateAt: readonly number[], tSec: number): number;

/** R2/R3: one SelfTrack per pinned prior lap (the LAST `priorLaps` columns, ids and
 *  startedAtMs identical to demoPriorResults'), fixes sampled every DEMO_SELF_FIX_STEP_S
 *  from t = 0 to t = lap inclusive along `asset`'s path at that lap's own gate times;
 *  startMs = the lap's startedAtMs, finishMs = startMs + lap*1000, lapS = lap, each fix
 *  carrying sM = demoChainage. Oldest first. [] for 0 priors. */
export function demoSelfTracks(priorLaps: number, nowMs: number, asset: WayAsset = DEMO_WAY_ASSET): SelfTrack[];
```

Implementation notes: for column `c` (0-based in `DEMO_HISTORY`), `secs = DEMO_HISTORY.map(
row => row[c])`, `gateAt = buildDemoScript(secs).gateAt`; the sample times are `0, 2, 4, …`
plus `lap` itself if it is not a multiple of the step (every pinned lap here happens to be
even — add `lap` unconditionally and dedupe the last point, so a future odd lap still gets a
fix at its finish). If `positionAtTime` returns `null` for any sample (it cannot with the
shipped fixture — belt-and-braces), skip that fix; a track that ends with `< 2` fixes is
dropped by `selfDotsAt` anyway. Reuse the same column→id/startedAtMs mapping
`demoPriorResults` uses — factor a tiny shared helper if that keeps the two in lockstep
rather than duplicating the arithmetic.

Check: `tsc` clean; `grep -nE "from 'react|expo" app/src/ui/demoModel.ts` prints nothing;
`grep -n "selfRaceModel" app/src/ui/demoModel.ts` shows only an `import type`.

## 3. Task 2 — `DemoScreen.tsx`: dots on the map, `P` on the context row

1. **Imports.** `selfDotsAt, selfLivePosition` from `'./selfRaceModel.ts'`;
   `demoChainage, demoSelfTracks` added to the `demoModel.ts` import.
2. **Tracks, once per mode.** Beside `script`:
   ```ts
   // virgin-cycle11 brief C: synthetic selfs for this mode's priors, built once per mode
   // (the absolute epoch only dates them; every position is relative to startMs).
   const builtAtMs = useRef(Date.now()).current;
   const selfTracks = useMemo(() => demoSelfTracks(DEMO_PRIOR_LAPS[mode], builtAtMs), [mode, builtAtMs]);
   ```
3. **Elapsed + dots + P.** After `gatesDone`:
   ```ts
   const elapsedMs = clockS > 0 ? clockS * 1000 : null;          // R3: START crossing is t = 0
   const selfDots = useMemo(() => selfDotsAt(selfTracks, elapsedMs), [selfTracks, elapsedMs]);
   const showSelfs = settings.selfDots && mode !== 'first';
   // R5: 'P2' on the context row while racing — null before START, once the lap lands,
   // or with self dots off (the real screen's livePos rule, RecordScreen.tsx:952-956).
   const livePos = showSelfs && elapsedMs !== null && gatesDone < script.secs.length
     ? (() => { const p = selfLivePosition(selfDots, demoChainage(script.gateAt, clockS)); return p === null ? null : `P${p}`; })()
     : null;
   const vm = demoLiveViewModel(script, clockS, Date.now(), livePos, DEMO_PRIOR_LAPS[mode]);
   ```
   (A/B already call `demoLiveViewModel` — this only fills the `livePos` argument.)
4. **Map.** On the SECOND/TENTH `WayMapView` in the running render add
   `selfs={showSelfs ? selfDots : undefined}` — undefined, not `[]`, when off, matching
   `RecordScreen.tsx:1224`. Nothing on the FIRST RIDE map.
5. `exitToIdle` needs no new work: `clockS` resets to 0 so `elapsedMs` goes null and every
   dot parks on START for the next run.

Checks: `tsc` clean. Read the running render once more: the `selfs` prop sits on the map
that has `asset={DEMO_WAY_ASSET}`, never on `DEMO_FIRST_RIDE_ID`'s. Confirm `livePos` is
`null` at `clockS === 0` and once `gatesDone === 4` by reading the expression.

## 4. Task 3 — Tests: extend `app/tests/demo_suite.ts`

Add to the dynamic imports: `demoChainage, demoSelfTracks, DEMO_SELF_FIX_STEP_S` from
`demoModel.ts`; `const { selfDotsAt, selfLivePosition } = await import(
'../src/ui/selfRaceModel.ts')` (it loads the store graph — the JSON hook is already
installed at the top of this suite, and `selfrace_suite.ts` proves the module imports
headless); `const { positionAtTime } = await import('../src/ui/wayMapMath.ts')`; `const {
DEMO_WAY_ASSET } = await import('../src/ui/demoWayFixture.ts')`. Cases:

- **Chainage: 0 at START, 1 at G1, 4 at FINISH, clamped.** With `gateAt = [0, 185, 392, 629,
  836]`: `demoChainage(gateAt, 0) === 0`, `(gateAt, 92.5) === 0.5`, `(gateAt, 185) === 1`,
  `(gateAt, 836) === 4`, `(gateAt, 900) === 4`, `(gateAt, -5) === 0`; monotone
  non-decreasing over `t = 0..900` step 1.
- **Nine tracks, same identities as the board.** `tracks = demoSelfTracks(9, T)`: length 9;
  `tracks.map(t => t.rideId)` deep-equals `demoPriorResults(9, T).map(r => r.rideId)`;
  `tracks[k].startMs === results[k].startedAtMs`; `tracks[k].lapS ===
  demoPriorLapSeconds(9)[k]`; `finishMs - startMs === lapS * 1000`.
- **Fixes: start at START, end at FINISH, 2 s apart, chainage 0 → 4.** For every track:
  `fixes[0].tUnixMs === startMs`, `fixes.at(-1).tUnixMs === finishMs`, every consecutive gap
  `=== DEMO_SELF_FIX_STEP_S * 1000` except possibly the last (`<=`), `fixes[0].sM === 0`,
  `fixes.at(-1).sM === 4`, `sM` non-decreasing; `fixes[0].lat/lon` equal
  `positionAtTime(DEMO_WAY_ASSET, gateAt_k, 0)` and the last fix equals
  `positionAtTime(DEMO_WAY_ASSET, gateAt_k, lapS)` (recompute `gateAt_k` from
  `demoHistoryFor(9)` column k in the test).
- **One track for SECOND RIDE, none for FIRST.** `demoSelfTracks(1, T)` → one track,
  `rideId 'demo:prior-9'`, `lapS 842`; `demoSelfTracks(0, T)` → `[]`.
- **Before RUN everyone waits on START.** `selfDotsAt(tracks, null)`: 9 dots, every `state
  === 'waiting'`, every `lat/lon` equal to `DEMO_WAY_ASSET.path[DEMO_WAY_ASSET.gateIdx[0]]`.
- **At the rider's line the two faster selfs have finished; the best is the 830.**
  `dots = selfDotsAt(tracks, 836_000)`: `demo:prior-2` (830) and `demo:prior-6` (835)
  `'finished'`, the other seven `'racing'`; `prior-2` has `best === true`, `rank 1`, `tier
  'purple'`; `prior-8` (865) `rank 9`, `tier 'yellow'`; `prior-4` (844) `tier 'green'`
  (below the nine-self mean 844.67 — pins the tier rule's boundary the way the real screen
  would show it).
- **The live P agrees with the tower.** `selfLivePosition(selfDotsAt(tracks, 100_000),
  demoChainage(gateAt, 100)) === 1` (nobody beat today's S1); `selfLivePosition(selfDotsAt(
  tracks, 820_000), demoChainage(gateAt, 820)) === 3` — the same P3 B's reveal lands on.
- **Everyone has finished by the end of the roll-out.** `selfDotsAt(tracks, (836 +
  DEMO_ROLL_OUT_S) * 1000).every(d => d.state === 'finished')`.

Zero FAIL on the whole suite.

## 5. Task 4 — Docs (same commit as the code)

- `STATE.md`
  - "Where the app actually is", the **Live self-racing is built (virgin-cycle6)** bullet:
    replace the sentence "PNG rung, DEMO tab and free mode untouched by design (R9)." with
    "PNG rung and free mode untouched by design (R9). **The DEMO-tab half of that R9 was
    deliberately reversed on 2026-09-19 (virgin-cycle11, `BRIEF-demo-self-dots.md`) at
    Nathan's explicit request** ('i want to see the self dots racing alongside so i can see
    how that works visually'): DEMO's SECOND / TENTH RIDE now replay *synthetic* selfs built
    from the demo's pinned laps (`demoModel.ts` `demoSelfTracks`, positions from the same
    path as the demo rider) through the same `WayMapView` `selfs` prop and `selfDots`
    toggle — never from ride files, never touching `loadSelfTracks`. The reversal is
    intentional, not a lapse of the old rule."
  - Known-stubs DEMO bullet: append "**Brief C:** synthetic self dots + the live `P` on the
    context row (sector-unit chainage) in SECOND / TENTH RIDE."
  - Test line refresh; cycle-history line: append ", brief C (`BRIEF-demo-self-dots.md`)".
- `GLOSSARY.md` **Self** entry: append one clause — "The DEMO tab replays made-up selves
  from its own pinned laps, so you can watch the race without riding."
- `OPEN-ITEMS.md` item 7: append "SECOND RIDE: one purple dot leaves START with you; you
  lead it through S1 and S2 (`P1` on the context row), it claws back 4 s in S3 (233 vs your
  237), you pull away again in S4 and finish 6 s ahead. TENTH RIDE: nine dots; you lead the
  whole field through S1 and S2 (`P1`), then the 830 s and 835 s selves come past in S3
  (they cross G3 at 625 s / 629 s to your 629 s) — the context row drops to `P3` and stays
  there to the line; the other seven fall away behind; finished dots dim and park at FINISH;
  SETTINGS → self dots OFF removes them from the demo too. Judge size / opacity / stacking
  here first (cycle6 R5 is a starting point); the real-ride check in item 5 still stands."

---

## 6. Verify, then commit

1. `cd app && node --experimental-strip-types tests/run.ts` → zero FAIL; totals before (B's)
   and after.
2. `cd app && ./node_modules/.bin/tsc --noEmit` → exit 0.
3. `git diff --stat`: only §1 files.
4. Commit by name (`git add app/src/ui/demoModel.ts app/src/ui/DemoScreen.tsx
   app/tests/demo_suite.ts STATE.md GLOSSARY.md OPEN-ITEMS.md cycles/virgin-cycle11/`).
   Message:

```
virgin-cycle11: DEMO tab — self dots race alongside in SECOND/TENTH RIDE (brief C)

Deliberately reverses the DEMO-tab half of cycle6's R9 at Nathan's request.
Each pinned prior lap becomes a synthetic SelfTrack (demoModel.demoSelfTracks):
fixes every 2 sim-s along the demo path at that lap's own gate times, so the
dots' relative pace matches their rank in the tower and the strip — the 830 s
self is the purple one ahead at the line, today lands P3 behind it and the
835. Rendered through WayMapView's existing `selfs` prop under the same
selfDots toggle; timed from the demo clock (START is t = 0); slower selfs
finish inside the 60 s roll-out. Live `P` on the context row via a
sector-unit demo chainage through the real selfLivePosition. FIRST RIDE
races nobody. Tests pin identities, fixes, states, tiers and the P.
STATE.md records the R9 reversal explicitly. selfRaceModel, WayMapView,
RecordScreen untouched.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Ssts3UN9gbxYxTjHH8sEWW
```

Push is expected to fail from this device (403, cycle precedent) — say so, one retry at most.

---

## 7. Report back

1. HEAD at start (B's commit — quote its subject), `git status --short`, commit hash at end.
2. The six §1 anchor confirmations, quoted.
3. Task 1: `demoChainage` and the fix-sampling loop as committed; the fix count per track.
4. Task 2: the `elapsedMs` / `selfDots` / `livePos` block and the `selfs=` prop as committed.
5. Test totals before/after; `tsc`.
6. **Plain-language walk-through for Nathan** of what the dots do in SECOND and TENTH RIDE
   (who leads where, when today passes whom, what the context row reads and when it
   disappears, what finished dots look like), so he can react before opening the app.
7. Tokens (this tier); the tier | model | tokens | outcome row.
8. Every STOP you hit and did not resolve; the R3 quantisation note if the executor saw any
   reason to expect stutter.
