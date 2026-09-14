# BRIEF — Self-racing follow-up: three tiers, stacking, opacity, live PX (amends R5; answers QUESTIONS.md Q1–Q3)

**Written 2026-09-14 UTC (Plan tier, fable).** Amends `BRIEF-live-self-racing.md` after
Nathan answered `QUESTIONS.md`. Anchors were read from staged copies of the live working tree
on 2026-09-14 (uncommitted virgin-cycle6 work included). Executor: Sonnet, stop-on-ambiguity.
`device_bash` is down: the executor stages files (`device_stage_files`), edits the staged
copy, commits it back (`device_commit_files`, honour the mtime guard), and hands Nathan the
PowerShell for tsc/tests/commit. Any anchor that does not match → STOP and report the file,
line and what is actually there. Never rule on an open call from the coordinator's chat.

## 0. Rulings

### R5′ — Three tiers, same rule as everything else
Every self dot is coloured by the app's ONE tier rule (`colourModel.ts:158–164` `tierFor`,
mean from `stats()` `:120`): the window-best self (lowest `lapS`, ties → earliest array
entry, unchanged from `selfDotsAt`) is **purple**; any other self whose `lapS` is below the
arithmetic **mean** of all loaded selfs' `lapS` is **green**; the rest are **yellow**. Not
median, not rank bands. Leave-one-out and full-window means give identical colours (sign
argument in the Report Back), so the full-window mean is used. n=1 → purple. n=2 → purple +
yellow. Tokens via `tierLineColour()` (`tierColour.ts:31–38`).

### R5″ — Opacity and stroke
Fill opacity by STATE only: 0.70 waiting/racing, 0.35 finished — for all three tiers. Rider
stays 1.0 (never below any self). Stroke: `CASING` (`wayMapView.tsx:172`), width 1.5,
`circle-stroke-opacity` equal to the fill expression. Radius 5 unchanged. Starting point;
Nathan adjusts by eye.

### R5‴ — Stacking
`SelfDot.rank` (1 = best) and a feature property `sortKey = 100 − rank`; the layer sets
layout `'circle-sort-key': ['get','sortKey']` (style spec `layout_circle`, typed in
`@maplibre/maplibre-gl-style-spec/src/types.g.ts:1871`). P1 paints above P2 … P9. The rider
paints above all selfs by the existing mount-order rule (source at `wayMapView.tsx:809`
before `:828`) — untouched. Never rely on feature order in the FeatureCollection.

### R10 — Live position "PX"
`P = 1 + count(selfs whose current chainage > rider's chainage)`, from
`LiveEngineState.chainageM` (new additive mirror of the displayed candidate's projector
chainage) and a per-fix `sM` carried on self tracks (from `projectRideOffline`'s `s`, which
`deriveGateCrossings` already computes). Null before `startGateT` is set and once
`live.lap !== null` (the handover PosChip then owns the fact). Rendered as `S3 · P4` on
`LiveSectorPane`'s context row, P in `t.text` ink, never tier-coloured (D-028, `chips.tsx:138`).
Ruled NOT a benchmark/delta: no time, no gap — same fact class as the existing PosChip.

### R11 — Q3: no change
PAUSE is a UI guard, not a pause (`RecordScreen.tsx:194–198`, `location/index.ts:512–519`);
rides with PAUSE pressed are indistinguishable from physical stops; `ranks()`
(`results.ts:92–97`) already bars estimated/missed laps. R7 stands. Nothing is built; the
docs say so (Task 8).

### Out of scope
"of N" on the live P; an edge marker; per-self labels; changing radius; the PNG rung;
anything in `IDEAS.md`/`CLAUDE.md`/`app/core/`.

## 1. Rules
As the original brief §1, plus: touch only `app/src/ui/selfRaceModel.ts`,
`app/src/store/derive.ts`, `app/src/live/engine.ts`, `app/src/ui/wayMapView.tsx`,
`app/src/ui/liveView.tsx`, `app/src/ui/RecordScreen.tsx`, `app/src/ui/settings.tsx` (hint text
only), `app/tests/selfrace_suite.ts`, `app/tests/live_colour_suite.ts` (one literal),
`STATE.md`, `GLOSSARY.md`, `OPEN-ITEMS.md`, `cycles/virgin-cycle6/README.md`,
`cycles/virgin-cycle6/QUESTIONS.md`. Every new field optional-with-default except where a
required field is stated and its literals are enumerated. Footprint estimate: ~170 lines of
app code, ~110 of tests, ~30 of docs.

## 2. Task A — `store/derive.ts`: expose per-fix chainage (additive)
Anchor: `GateCrossings` at `:142–147`, `deriveGateCrossings` at `:149–164` (`const { s } =
projectRideOffline(x, y, inp.ref);` at `:157`). Add to `GateCrossings`:
```ts
  /** follow-up (live PX): chainage in metres along `ref` per input fix — projectRideOffline's
   *  own `s`, unchanged. Same array length as `t`. */
  chainageM: ArrayLike<number>;
```
and return `chainageM: s` from `deriveGateCrossings`. `deriveRideResult` untouched.
Check: `tests/selfrace_suite.ts:226–228` still compiles (it destructures `startS` only).

## 3. Task B — `ui/selfRaceModel.ts`: tiers, rank, chainage, live position
Anchors: `SelfProperties` `:57–61`; `SelfTrack.fixes` `:87`; `SelfDot` `:92–98`; `interpAt`
`:103–123`; `selfPositionAt` `:133–147`; `selfDotsAt` `:152–165`; `selfsFeatureCollection`
`:171–180`; loader replay `:253–256`; track literal `:271–279`. **Re-read every one of these
line numbers against the file as it currently exists on disk (post virgin-cycle6 landing and
Inspect fixes) before editing — this brief's anchors were read from a staged copy and may have
drifted.**
1. `export type SelfTier = 'purple' | 'green' | 'yellow';`
2. `SelfTrack.fixes` element type gains `sM?: number` (optional — existing test literals build
   fixes without it and must keep compiling).
3. `SelfDot` gains `tier: SelfTier; rank: number; sM: number | null;` (keep `best`; invariant
   `best === (tier === 'purple')`).
4. `interpAt` also interpolates `sM` when BOTH bracketing fixes carry it (else null); clamped
   ends return that fix's `sM ?? null`. `selfPositionAt` returns `sM` alongside lat/lon.
5. New pure `export function selfTierFor(lapS: number, index: number, all: readonly number[],
   bestIdx: number): SelfTier` — purple iff `index === bestIdx`; else green iff
   `lapS < mean(all)`; else yellow. `selfDotsAt` computes `bestIdx` as today, `rank` by
   ascending `lapS` with ties broken by array order (stable sort on index), and fills
   `tier`/`rank`/`sM`. The model stays colour-token-free; the map layer maps tier → colour.
6. `selfsFeatureCollection` properties become `{ rideId, state, best, tier, sortKey }` with
   `sortKey = 100 - rank`. Update `SelfProperties`.
7. Loader: use `chainageM` from `deriveGateCrossings` — keep `sM` per fix (`inOrder[i]` ↔
   `chainageM[i]`, same index) through the window filter and decimation, and write it into the
   track literal's `fixes`.
8. New pure `export function selfLivePosition(dots: readonly SelfDot[], riderChainageM:
   number | null): number | null` — null if `riderChainageM === null` or `dots.length === 0`;
   else `1 + dots.filter((d) => d.sM !== null && d.sM > riderChainageM).length`.
Header comment: replace the "purple = best" sentence with the R5′ rule and cite
`colourModel.ts:158–164`.

## 4. Task C — `live/engine.ts`: `LiveEngineState.chainageM` (additive, required field)
Anchor: `startGateT` doc + field (re-read exact current line numbers), `getState()` and its
return. Add directly after `startGateT`:
```ts
  /** follow-up (live PX): the displayed candidate's current monotonic chainage in metres
   *  (its LiveProjector.chainage), null whenever `track` is null. Display-only mirror —
   *  never feeds gate logic or timing. */
  chainageM: number | null;
```
Populate in `getState()`: `chainageM: this.locked ? this.locked.proj.chainage : null`.
Then grep the whole `app/` tree for `startGateT: null` — every `LiveEngineState` literal
(known: `tests/live_colour_suite.ts`, the one out-of-brief-scope edit the Inspect pass made
landing this cycle's first brief) gets `chainageM: null` on the next line. List each edit in
the report. Any other tsc failure from this field → STOP.

## 5. Task D — `ui/wayMapView.tsx`: the layer
Anchor: the `selfs` source + `self-dot` layer as landed this cycle (re-read current line
numbers — the Inspect pass already edited this block once, using `t.text`/`colors.purple` and
opacity `1/0.55/0.35`; that is what you are replacing). Replace the layer with:
```tsx
<M.Layer id="self-dot" type="circle"
  layout={{ 'circle-sort-key': ['get', 'sortKey'] }}
  paint={{
    'circle-radius': 5,
    // R5′: the app's one tier rule, tokens from tierColour.ts (never chipColors().text).
    'circle-color': ['match', ['get', 'tier'],
      'purple', tierLineColour('purple') as string,
      'green', tierLineColour('green') as string,
      tierLineColour('yellow') as string],
    // R5″: state-only opacity; every self sits under the rider's 1.0.
    'circle-opacity': ['case', ['==', ['get', 'state'], 'finished'], 0.35, 0.7],
    'circle-stroke-color': CASING,
    'circle-stroke-width': 1.5,
    'circle-stroke-opacity': ['case', ['==', ['get', 'state'], 'finished'], 0.35, 0.7],
  }} />
```
Import `tierLineColour` from `'./tierColour.ts'` (pure module). Update the source's comment
block to mention `circle-sort-key` and R5‴. If tsc rejects `'circle-sort-key'` in `layout` for
`M.Layer` → STOP (do not fall back to feature ordering; that is a Fable call).

## 6. Task E — `ui/liveView.tsx`: `livePos` on the context row
Anchors: `LiveViewModel`, `viewModelFromEngine` signature + return, the context row, the
header comment (re-read current line numbers).
1. Add to `LiveViewModel` (after `posChip`): `/** live position among the selfs on the map
   ('P4'); null/undefined = render nothing (follow-up R10). A fact, never a benchmark. */
   livePos?: string | null;` — optional, so existing call-site literals (DemoScreen,
   PreviewScreen) are untouched.
2. `viewModelFromEngine` gains a 5th param `livePos: string | null = null`, returned as-is.
3. The context row renders, after the existing context label: if `vm.livePos` is set, append
   `' · ' + vm.livePos` (or just `vm.livePos` if the label is empty) in `t.text` ink, dim label
   unchanged otherwise.
4. Header: after the "no target/benchmark/delta anywhere near it" sentence add "(a live
   position `P4` on the context row is a fact under D-028, like the handover chip — not a
   benchmark; follow-up brief R10)".

## 7. Task F — `ui/RecordScreen.tsx`: wire it
Anchors: the self-dots tick effect and the running-phase `LiveSectorPane`/`viewModelFromEngine`
call site landed this cycle (re-read current line numbers), import block.
1. Import `selfLivePosition`.
2. After the tick effect:
```ts
const livePos = useMemo(() => {
  if (live.mode !== 'route' || !settings.selfDots || live.startGateT === null || live.lap !== null) return null;
  const p = selfLivePosition(selfDots, live.chainageM);
  return p === null ? null : `P${p}`;
}, [selfDots, live.chainageM, live.startGateT, live.lap, live.mode, settings.selfDots]);
```
3. Pass `livePos` as the 5th argument of `viewModelFromEngine(...)` at the running-phase call
   site.

## 8. Task G — SETTINGS hint
Replace the `selfDots` hint text with: "Your previous rides of this route move along the map
as small dots, timed from the START gate. Purple is your best of the last nine, green is
faster than their average, yellow slower. The P-number under the map is your position among
them right now."

## 9. Task H — Tests (`tests/selfrace_suite.ts`), then docs
Add (names read as sentences):
- **tiers:** lapS [600,580,610] → assert tiers per the rule computed against the actual mean
  in the test (don't hardcode a pre-computed expectation that could silently drift from the
  rule); also a 9-track case with one large outlier where most are non-yellow; n=1 → purple;
  n=2 → purple+yellow; tie for best → exactly one purple and `best === (tier==='purple')` for
  every dot.
- **rank/sortKey:** ranks are 1..n by lapS, ties by array order; `selfsFeatureCollection`
  emits `sortKey = 100 - rank` and `tier`.
- **chainage:** `deriveGateCrossings` on the existing engine fixture returns `chainageM` with
  the same length as its time array, non-decreasing at the gate-0 and last-gate crossing
  indices; the loader's track carries `sM` on every kept fix; `selfPositionAt` interpolates
  `sM` midway.
- **live position:** rider at 1000 m, dots at 900/1000/1100 (one with `sM: null`) → P2;
  rider null → null; empty dots → null.
- **engine:** on the existing fixture, `chainageM` is null while `track === null`, non-null
  and non-decreasing across emissions once locked; free mode keeps it null.
Docs (re-read each target line first, they may have shifted since this cycle's first landing):
`STATE.md` — add "three tiers by the colour model's rule, P1 on top, live `P` on the context
row" to the live-screen ground rule and the "where the app is" bullet; `GLOSSARY.md` — replace
the "fastest renders purple" self-entry sentence with the R5′ rule and mention the P-number;
`cycles/virgin-cycle6/README.md` — update the visual-rules bullet and the Q3 known-limit line
to "Q3 answered: no pause; PAUSE is not a pause — R11 in the follow-up brief";
`OPEN-ITEMS.md` — update the on-device checklist step about ride 3 to mention colours ("two
dots: one purple, one yellow or green depending on the mean; a `P1`/`P2` appears under the map
once you cross START"), add a step for "two dots overlapping: the faster one on top
(circle-sort-key), rider always on top", and replace the parked-questions bullet with
"answered 2026-09-14, folded in by BRIEF-self-racing-followup.md; only the on-device look
(yellow dot on the yellow line, P-number placement) remains Nathan's". `QUESTIONS.md`: use the
ruling text already written into this same cycle folder's QUESTIONS.md update.

## 10. Verify, commit, report
Hand Nathan: `cd app; node --experimental-strip-types tests/run.ts` (zero FAIL, record totals
vs the cycle6 baseline) and `cd app; ./node_modules/.bin/tsc --noEmit` (exit 0). Nothing is
committed yet on this cycle: extend the original commit message with one paragraph — "Follow-up
(Q1–Q3): selfs coloured by the colour model's own rule (purple best / green under the window
mean / yellow), stacked P1-on-top via circle-sort-key, all under the rider's opacity; live
position `P n` on the context row from the engine's new additive `chainageM` and per-fix self
chainage; Q3 needs nothing — PAUSE is not a pause." Report: every anchor confirmation, every
`chainageM: null` literal edit, the STOPs (expected: none), and the on-device checklist.

## Investigation record (for the executor's context, not re-derivation)

- **Tier rule** is `colourModel.ts`'s `tierFor`/`stats()`: purple = beats the pool's own best;
  green = beats the pool's arithmetic mean; yellow = at/above the mean. This is the SAME rule
  used for every sector/lap colour elsewhere in the app (`chips.tsx`, SETTINGS hint text) —
  selfs reuse it rather than inventing rank bands or a median split. Leave-one-out vs
  full-window mean give identical colours (algebraic identity: x − mean_all =
  (n−1)/n · (x − mean_others), same sign) — the full-window mean is used directly.
- **Stacking** uses MapLibre's `circle-sort-key` layout property (present in the installed
  `@maplibre/maplibre-gl-style-spec`, typed in `types.g.ts`) — a real per-feature z-order
  control, not an accident of FeatureCollection array order. High confidence it type-checks
  and is the right mechanism; on-device confirmation still needed that two overlapping dots
  actually stack faster-on-top as expected.
- **PX position** is derived from chainage (how far along the route, physically, right now),
  not from gate-crossing rank — chainage updates continuously with the rider's position,
  matching what the dots on the map are already showing, whereas a gate-based rank would only
  update at gates and could visibly disagree with the map between them.
- **PAUSE button investigation (Q3):** confirmed it is an "accidental-stop guard," not a real
  pause — recording and the lap clock keep running underneath regardless of whether it's
  pressed (`RecordScreen.tsx`, `location/index.ts`). A ride recorded with PAUSE pressed is
  indistinguishable, at the fixes level, from one where the rider just stopped. Combined with
  `ranks()` already barring estimated/missed laps from ever entering the window, there is no
  new "was this a paused self" case to guard against — R7's existing wall-clock assumption
  already covers every ride that can become a self.
