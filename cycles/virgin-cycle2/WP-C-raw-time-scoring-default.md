**Status: BRIEF WRITTEN, NOT YET EXECUTED.**
**Open item:** OPEN-ITEMS.md "Parked" (lines 72-74) — raw-time scoring default, implementation half. Size: **medium** — one new 40-line store module, one new Settings field + row, ~16 mechanical call-site swaps across 9 source files, 2 type/param renames, 3 memo-dep additions, one new test suite, a handful of existing-test expectation updates. No stored data changes, no migration.
**Verified against the mount as read 2026-09-04 (`5ae4c30`, branch `virgin`). Every line number below was re-read by the Plan tier; if any anchor does not match on the day of execution, STOP (see §7).**

---

# WP-C (cycle 2) — Raw wall-clock time is what scores a ride

## 1. What it is

`STATE.md:106-107` (ground rule, settled by Nathan, not up for relitigation):

> **Timing default is raw wall-clock time** (luck counts) — moving-time is opt-in. (The scoring/UI implementation of this default is still pending — see Open items.)

The *rule* is decided; the *code* still does the opposite. Every verdict the app hands out — the purple/green/yellow tier of a lap or a sector, the `P3 of 10` rank, the PB ● and the Personal-Bests list, the live handover chip, the sector-coloured trail, and the time figures printed next to those verdicts — reads `lap.movingS` / `sector.movingS` (raw minus detected stopped time). There is no setting; moving time is hard-wired as the only clock.

This WP makes raw wall-clock time the default clock for every one of those verdicts and adds the opt-in switch for moving time. The principle Nathan's rule encodes: a red light is part of your lap, the same way it is in a real race — you do not get to subtract your bad luck.

**Two things this WP deliberately does NOT do:**

- It does not change anything stored. `rawS` and `movingS` are both already on file for every lap and every sector (§2.1) — the switch only decides which one a verdict *reads*. No schema bump, no migration, no re-derivation of `results/*.json`.
- It does not change *which* rides or sectors are eligible to be scored (clean/interrupted rank, estimated/missed never do, tripwire-demoted and rider-ignored never do, sector history is clean-only). Eligibility is identical under both modes; only the number differs. §7 flags the one eligibility question this raises for Nathan, out of scope here.

## 2. Current state (all re-verified 2026-09-04)

### 2.1 Raw time is already captured and stored everywhere — nothing new to record

`app/src/store/types.ts`:

```ts
// :92-99
export interface SectorResult {
  index: number;
  fromChainageM: number;
  toChainageM: number;
  rawS: number;                       // :96
  /** null unless clean|interrupted — estimated sectors never get moving time */
  movingS: number | null;             // :98
  quality: SectorQuality;
}
// :110
  lap: { rawS: number; movingS: number | null; quality: SectorQuality };
```

Both fields are populated by the one derivation pipeline, `app/src/store/derive.ts:74-77` (sector: `rawS: raw`, `movingS: quality === 'estimated' || quality === 'missed' ? null : (r.movingS ?? null)`) and `:111-115` (lap: `rawS: lapRaw`, `movingS: lapQuality === 'clean' || lapQuality === 'interrupted' ? lapRaw - lapStopped : null`). The in-session path `app/src/ui/lastRide.ts:86-87` (`lapMovingS = st.lap.movingS; lapRawS = st.lap.rawS`), `:99-104` (sectors) and `:160-164` (the stored `lap`) does the same. The live engine carries both too: `app/src/live/engine.ts:172-181` (`LiveSector` 'done': `rawS: number; stoppedS; movingS: number | null; interrupted; estimated`), `:185-190` (`LiveLap { rawS: number | null; stoppedS; movingS: number | null; estimated }`), computed at `:1011-1018` (`movingS = rawS - stoppedS`).

**Invariant to preserve:** `movingS === null` is the store's own "there is no real time here" marker — it is null exactly for estimated/missed laps and sectors (`derive.ts:77/:113`, `lastRide.ts:102/:162`). About a dozen call sites use `x.movingS === null` / `!== null` as their eligibility gate. The helper in §3.1 keeps that marker meaningful in both modes.

### 2.2 The Settings pattern to follow — `app/src/ui/settings.tsx`

```ts
// :23-33
export type RedLight = 'auto' | 'button' | 'off';
export interface Settings {
  redLight: RedLight;
  startMode: 'auto' | 'pick';
  tower: boolean;
  liveMap: boolean;
  earcons: boolean;
  /** WP-K: paint each sector of the route line in the tier it earned ... */
  sectorColours: boolean;
}
// :35-42
const DEFAULTS: Settings = { redLight: 'auto', startMode: 'auto', tower: true, liveMap: true, earcons: true, sectorColours: true };
```

Persisted as one JSON (`:50`, `settings.json`), loaded with `setS((prev) => ({ ...prev, ...saved }))` (`:66`) — so a saved file that predates a new field silently gets that field's DEFAULT. A corrupt/missing file falls back to DEFAULTS (`:47-49` doc). The provider already pushes one setting into a non-React module by side effect, which is the precedent this WP copies:

```ts
// :73-74
  // The tracker is the only buzzer; keep it in step with the preference.
  useEffect(() => { setEarconsEnabled(s.earcons); }, [s.earcons]);
```

The screen: SCORING card at `:294-304`, currently one row ("Rankings", `s.tower`). `Seg` (`:97-116`) renders a segmented picker from `[value, label][]`; the "Red lights" row at `:266-271` shows its use. `Row` takes `label`, `hint`, `t`, children.

Consumers read settings via `const { s } = useSettings()` (`RideDetailScreen.tsx:124`, `RecordScreen.tsx:136` as `{ s: settings }`, `RidesScreen.tsx` does NOT currently import it).

### 2.3 Every place a verdict or a printed time reads `movingS` — the full call-site list

Pure scoring core:

| # | File:line | Today | Role |
|---|---|---|---|
| 1 | `app/src/store/results.ts:95` | `return r.lap.movingS !== null;` (inside `ranks()`) | eligibility gate |
| 2 | `results.ts:108` | `rankable.sort((a, b) => (a.lap.movingS as number) - (b.lap.movingS as number));` | `tower()` sort |
| 3 | `results.ts:111` | `movingS: r.lap.movingS as number,` | `tower()` ranked row value |
| 4 | `results.ts:120` | `movingS: r.lap.movingS ?? r.lap.rawS,` | `tower()` unranked row value |
| 5 | `results.ts:146,148` | `if (!s \|\| s.movingS === null) continue; ... out.push(s.movingS);` | `sectorHistory()` |
| 6 | `app/src/ui/colourModel.ts:112` | `return ghostsFor(routeId, excludeRideId).map((r) => r.lap.movingS as number);` | `lapValues()` — THE lap history every rank/tier compares against |
| 7 | `colourModel.ts:125` | `if (s && s.movingS !== null && s.quality === 'clean') out.push(s.movingS);` | `sectorValues()` — THE sector history |
| 8 | `colourModel.ts:152` | `const v = r.lap.movingS as number;` | `allTimeBestLapS()` — PB ● and Personal-Bests figure |

Live (RECORD tab):

| # | File:line | Today | Role |
|---|---|---|---|
| 9 | `app/src/live/towerSource.ts:31-34` | `// MOVING time only. ...` `const mine = st.lap.movingS;` | live `P3 of 10` handover chip |
| 10 | `app/src/ui/RecordScreen.tsx:758-763` | `tierOf(sectorIndex, movingS)` closure — takes whatever the view passes | tier source for the live pane |
| 11 | `RecordScreen.tsx:782` | `tierOf(i + 1, sec.movingS ?? null)` | gate-marker colours (`useMemo` deps `[live.sectors, live.track, t]` at `:787`) |
| 12 | `app/src/ui/liveView.tsx:124` | `export type TierSource = (sectorIndex: number, movingS: number | null) => Tier;` | param name only |
| 13 | `liveView.tsx:137,140` | `tier: tierOf(k, sec.movingS ?? null)` / `time: fmtSec(sec.movingS ?? sec.rawS, 1)` | big flash chip |
| 14 | `liveView.tsx:161,163` | `tier: tierOf(i + 1, sec.movingS ?? null)` / `time: fmtSec(sec.movingS ?? sec.rawS)` | strip slot |
| 15 | `liveView.tsx:190-191` | `tier: tierOf(0, st.lap.movingS ?? st.lap.rawS ?? null)` / `time: fmtSec(st.lap.movingS ?? st.lap.rawS ?? 0)` | lap chip |
| 16 | `app/src/ui/sectorTrailModel.ts:84-88` | `... \|\| sec.movingS === null) { null } ... earnedColour(sec.movingS, hist(k + 1), paint)` | live sector-coloured spans |

Stored-ride surfaces (RIDES list, ride detail / RESULT, Personal Bests, tower model):

| # | File:line | Today | Role |
|---|---|---|---|
| 17 | `app/src/ui/rideDetailModel.ts:82-96` | `rankLineFor(r: { lapMovingS: number \| null; ... })` reading `r.lapMovingS` at `:88,91` | rank line param name + value |
| 18 | `rideDetailModel.ts:135-137` | `lapCellLabel(res.lap.movingS, estimated, res.lap.rawS)` / `tierFor(res.lap.movingS, hist)` / `rankLineFor({ lapMovingS: res.lap.movingS, ... })` | headline figure, its colour, its rank line |
| 19 | `app/src/ui/rideHistoryModel.ts:114` | `const lapS = lap.movingS;` (then `:115` label, `:123-127` rank) | RIDES row |
| 20 | `rideHistoryModel.ts:171-180` | `if (sec.quality === 'estimated' \|\| sec.movingS === null) {~raw}` ... `tierFor(sec.movingS, h)` ... `timeLabel: fmt(sec.movingS, 1)` | sector rows on ride detail |
| 21 | `rideHistoryModel.ts:233-236` | `sort(... a.lap.movingS - b.lap.movingS)`, `p1 = sorted[0].lap.movingS`, `const v = r.lap.movingS` | Personal-Bests ranking list |
| 22 | `rideHistoryModel.ts:256-257` | `s.quality === 'clean' && s.movingS !== null && (best === null \|\| s.movingS < best)) { best = s.movingS; }` | PB sector split |
| 23 | `app/src/ui/sectorTrailModel.ts:42-45` | `earnedColour(movingS: number, ...)` | param name only |
| 24 | `sectorTrailModel.ts:49` | `export interface StoredSectorLike { index: number; movingS: number \| null; quality: string }` | needs `rawS` added |
| 25 | `sectorTrailModel.ts:63-64` | `... \|\| sec.movingS === null) continue; out[sec.index] = earnedColour(sec.movingS, ...)` | stored sector-coloured spans |
| 26 | `app/src/ui/towerModel.ts:59-61` | `.filter((r) => r.lap.movingS !== null).map((r) => ({ value: r.lap.movingS as number, ...` | tower model (headless; screen callers: none in `src/`, tests only) |
| 27 | `app/src/store/types.ts:142` | `TowerRow.movingS: number;` | field name is now a lie |

Memoised consumers whose deps do not include any timing setting today (a mode flip on the SETTINGS tab would leave them stale until something else changes):

- `RecordScreen.tsx:777-787` `gateColours` deps `[live.sectors, live.track, t]`; `:797-806` `sectorColours` deps `[live.sectors, live.track, settings.sectorColours]`.
- `RidesScreen.tsx:93-99` `rows` deps `[rides, resultsTick]`.
- `RideDetailScreen.tsx:178-190` `model` deps `[request.rideId, request.startedAtMs, tick]`.

NOT to be touched (they *build* storage and genuinely mean moving time): `lastRide.ts:86-87, :99-104, :160-164, :191, :196, :223` (`FinishedRide.lapMovingS` keeps its name — it IS moving time), `derive.ts`, `resultsStore.ts:81` (shape validation), `engine.ts`, `demoModel.ts` (scripted tiers, no store), `store_suite.ts:346-411` moving/raw invariant tests.

### 2.4 Precedent for a module-level register read by pure code

`setEarconsEnabled()` in `src/location` (imported at `settings.tsx:10`, synced at `:74`). The pure models in `src/ui/*Model.ts` and `src/store/results.ts` have no React and no settings access; `colourModel.ts` already reads module-level stores (`recordedResults()`, `shippedResults()`), so a module-level timing register is in character. Threading a `mode` parameter through `ghostsFor → lapValues → buildRideRows → ...` (14+ signatures and every test that calls them) was considered and rejected: far more churn for no more correctness.

## 3. The fix

### 3.1 New module `app/src/store/timing.ts` (new file, ~40 lines)

```ts
/**
 * Which clock scores a ride (STATE.md ground rule, settled 2026-08): RAW
 * wall-clock time by default — every stop counts, a red light is the lap's
 * own luck, exactly as in a real race — with moving time (raw minus detected
 * stopped time) as the opt-in.
 *
 * ONE module-level register, set by SettingsProvider (ui/settings.tsx) the
 * same way setEarconsEnabled() is, read by every verdict through scoredS():
 * no pure model threads a mode parameter, and no call site reads `.movingS`
 * for a tier, rank, PB or printed time again. Nothing stored changes — rawS
 * and movingS both stay on file (store/derive.ts) — this only decides which
 * one a verdict reads.
 */
export type TimingMode = 'raw' | 'moving';
export const DEFAULT_TIMING: TimingMode = 'raw';

let mode: TimingMode = DEFAULT_TIMING;

export function setTimingMode(m: TimingMode): void { mode = m; }
export function timingMode(): TimingMode { return mode; }

/** Minimal shape shared by RideResult.lap, SectorResult, LiveLap and a 'done'
 * LiveSector — everything a verdict is ever taken from. */
export interface TimedLike { rawS: number | null; movingS: number | null }

/**
 * The seconds a verdict (tier, rank, PB, printed time) reads for a lap or a
 * sector under the current mode — or null when there is NO real time.
 *
 * `movingS === null` is the store's own "no real time" marker (derive.ts:77
 * / :113, lastRide.ts:102 / :162 — estimated and missed only), so it is
 * honoured in BOTH modes: raw mode never revives a lap or sector that moving
 * mode would refuse to score. The set of things that rank or colour is
 * therefore identical in the two modes; only the number differs.
 */
export function scoredS(t: TimedLike): number | null {
  if (t.movingS === null) return null;
  if (mode === 'moving') return t.movingS;
  return t.rawS ?? t.movingS;
}
```

Import style: the store layer uses explicit `.ts` extensions in imports inside `src/store/` and `src/ui/*Model.ts` / `colourModel.ts` (`import { ranks, sectorHistory } from '../store/results.ts';`), extensionless from `.tsx` screens (`import { useSettings } from './settings';`). Match whichever style the importing file already uses.

### 3.2 Settings field + row — `app/src/ui/settings.tsx`

- `:3` import (alongside the `setEarconsEnabled` import at `:10`): `import { DEFAULT_TIMING, setTimingMode, type TimingMode } from '../store/timing';`
- `Settings` interface (`:24-33`): add, after `sectorColours`:
  ```ts
  /** Which clock scores a ride (STATE.md ground rule): 'raw' = wall clock,
   * every stop counts (the default — luck counts); 'moving' = raw minus
   * detected stopped time, the opt-in. Read by store/timing.ts's scoredS(). */
  timing: TimingMode;
  ```
- `DEFAULTS` (`:35-42`): add `timing: DEFAULT_TIMING,`. A pre-existing `settings.json` without the key merges to `'raw'` via `:66` — that is the intended behaviour on upgrade (the rule is the default, not a per-phone opt-out), and the merge code needs no change.
- Push the value into the register **synchronously during render**, not in a `useEffect`. Reason: §3.5 makes the screens memoise on `s.timing`; a memo recomputes in the same render pass that `s` changes, and an effect would update the register only *after* that pass — one stale render per flip. Idempotent assignment of a module variable is harmless under StrictMode's double render. In `SettingsProvider` (`:59`), immediately after `const [s, setS] = useState<Settings>(DEFAULTS);`:
  ```ts
  // Sync, not an effect: RecordScreen/RidesScreen/RideDetailScreen memoise
  // their verdicts on s.timing and recompute in THIS render pass, so the
  // register must already hold the new mode when they do (an effect would
  // lag one render). Idempotent, so StrictMode's double render is harmless.
  setTimingMode(s.timing);
  ```
  Leave the earcons `useEffect` at `:73-74` exactly as it is.
- Screen: in the SCORING card (`:294-304`), add a new `Row` ABOVE the existing "Rankings" row:
  ```tsx
  <Row label="Timing" t={t}
    hint="wall clock is the lap as the road gave it — every stop counts, a red light is your luck; moving drops the time you stood still">
    <Seg t={t} value={s.timing}
      options={[['raw', 'wall clock'], ['moving', 'moving']]}
      onPick={(v) => set('timing', v)} />
  </Row>
  ```
  `Seg` is generic over the option type; `set('timing', v)` type-checks because `v: TimingMode`.

### 3.3 Pure scoring core — exact before/after

`app/src/store/results.ts` — add `import { scoredS } from './timing.ts';`

| # | Before | After |
|---|---|---|
| 1 `:95` | `return r.lap.movingS !== null;` | `return scoredS(r.lap) !== null; // identical set in both modes — scoredS keeps the movingS-null marker` |
| 2 `:108` | `rankable.sort((a, b) => (a.lap.movingS as number) - (b.lap.movingS as number));` | `rankable.sort((a, b) => (scoredS(a.lap) as number) - (scoredS(b.lap) as number));` |
| 3 `:111` | `movingS: r.lap.movingS as number,` | `timeS: scoredS(r.lap) as number,` |
| 4 `:120` | `movingS: r.lap.movingS ?? r.lap.rawS,` | `timeS: scoredS(r.lap) ?? r.lap.rawS,` |
| 5 `:146,148` | `if (!s \|\| s.movingS === null) continue;` … `out.push(s.movingS);` | `const v = s ? scoredS(s) : null; if (v === null) continue;` … `out.push(v);` |

Doc comment at `:98-104` ("Ranked rows sort ascending by moving time") → "by scored time (store/timing.ts — wall clock by default, moving time opt-in)". `:88-89` "with a real moving time" → "with a real time".

`app/src/store/types.ts:140-148` `TowerRow`: rename `movingS: number;` → `timeS: number;` with doc `/** the lap's scored seconds under the current timing mode (store/timing.ts) */`. (`tower()` has no `src/` callers — `grep -rn "tower(" src` finds none outside its own definition — only `tests/store_suite.ts:284,426,439,443`, updated in §5.)

`app/src/ui/colourModel.ts` — add `import { scoredS } from '../store/timing.ts';`

| # | Before | After |
|---|---|---|
| 6 `:112` | `.map((r) => r.lap.movingS as number)` | `.map((r) => scoredS(r.lap) as number)` |
| 7 `:125` | `if (s && s.movingS !== null && s.quality === 'clean') out.push(s.movingS);` | `if (s && s.quality === 'clean') { const v = scoredS(s); if (v !== null) out.push(v); }` |
| 8 `:152` | `const v = r.lap.movingS as number;` | `const v = scoredS(r.lap) as number;` |

Doc comments: `:145-147` "All-time best moving lap" → "All-time best scored lap (store/timing.ts)"; `:93` "a local movingS-only lookalike rule" → "a local scored-time-only lookalike rule". Keep `sectorValues`' CLEAN-ONLY rule and its `:115-120` comment as they are (see §7 flag 1).

### 3.4 Live surfaces — exact before/after

`app/src/live/towerSource.ts` — add `import { scoredS } from '../store/timing.ts';`

| # | Before (`:31-34`) | After |
|---|---|---|
| 9 | `// MOVING time only. Falling back to raw ranked a stopped-time-inflated lap` `// against everyone else's moving times -- not the same quantity (cycle 009).` `const mine = st.lap.movingS;` | `// The SAME clock as the history it is ranked against (store/timing.ts):` `// scoredS on both sides, never raw-vs-moving (the cycle-009 bug was exactly` `// that mismatch). null = no real time = no chip.` `const mine = scoredS(st.lap);` |

Also `:8-10` header block still describes "moving-time laps rank" — change to "scored-time laps (store/timing.ts)".

`app/src/ui/liveView.tsx` — add `import { scoredS } from '../store/timing';` (this file's existing imports are extensionless — check and match).

| # | Before | After |
|---|---|---|
| 12 `:124` | `export type TierSource = (sectorIndex: number, movingS: number \| null) => Tier;` | `export type TierSource = (sectorIndex: number, timeS: number \| null) => Tier;` (and `:121` doc "(sectorIndex, movingS)" → "(sectorIndex, timeS — scoredS() of the sector)") |
| 13 `:137` | `tier: tierOf(k, sec.movingS ?? null),` | `tier: tierOf(k, scoredS(sec)),` |
| 13 `:140` | `time: fmtSec(sec.movingS ?? sec.rawS, 1),` | `time: fmtSec(scoredS(sec) ?? sec.rawS, 1),` |
| 14 `:161` | `tier: tierOf(i + 1, sec.movingS ?? null),` | `tier: tierOf(i + 1, scoredS(sec)),` |
| 14 `:163` | `time: fmtSec(sec.movingS ?? sec.rawS), // frozen m:ss — ...` | `time: fmtSec(scoredS(sec) ?? sec.rawS), // frozen m:ss — ...` |
| 15 `:190` | `tier: tierOf(0, st.lap.movingS ?? st.lap.rawS ?? null),` | `tier: tierOf(0, scoredS(st.lap) ?? st.lap.rawS ?? null),` |
| 15 `:191` | `time: fmtSec(st.lap.movingS ?? st.lap.rawS ?? 0),` | `time: fmtSec(scoredS(st.lap) ?? st.lap.rawS ?? 0),` |

The `?? sec.rawS` / `?? st.lap.rawS` fallbacks are kept verbatim: they cover a non-estimated live sector/lap whose kinematics produced no moving time (engine `:938-944` — `stopped` stays null when fewer than 2 fixes are buffered), which today prints raw and colours neutral, and must keep doing exactly that. `sec` inside these branches is the `'done'` `LiveSector`, whose `rawS: number; movingS: number | null` satisfies `TimedLike`.

`app/src/ui/RecordScreen.tsx` — add `import { scoredS } from '../store/timing';`

| # | Before | After |
|---|---|---|
| 10 `:758-759` | `const tierOf = (sectorIndex: number, movingS: number \| null): Tier => {` `if (live.track === null \|\| movingS === null) return 'neutral';` … `tierFor(movingS, history)` | rename the param to `timeS` in all three places (no logic change — the view already passes the number in) |
| 11 `:782` | `const tier = sec.estimated ? 'est' : tierOf(i + 1, sec.movingS ?? null);` | `const tier = sec.estimated ? 'est' : tierOf(i + 1, scoredS(sec));` |
| 11 `:787` | `}, [live.sectors, live.track, t]);` | `}, [live.sectors, live.track, t, settings.timing]);` |
| — `:805` | `[live.sectors, live.track, settings.sectorColours],` | `[live.sectors, live.track, settings.sectorColours, settings.timing],` |

`tierOf` and `viewModelFromEngine(...)` at `:1061-1064` are not memoised — they re-run every render and need nothing.

`app/src/ui/sectorTrailModel.ts` — add `import { scoredS } from '../store/timing.ts';`

| # | Before | After |
|---|---|---|
| 23 `:42-43` | `function earnedColour(movingS: number, history: number[], paint: SpanPaint): string \| null {` `const tier = tierFor(movingS, history);` | param renamed `timeS` (two places) |
| 24 `:49` | `export interface StoredSectorLike { index: number; movingS: number \| null; quality: string }` | `export interface StoredSectorLike { index: number; rawS: number; movingS: number \| null; quality: string }` — `SectorResult` and `lastRide.ts:39`'s `FinishedRide.sectors` element both already carry `rawS: number`, so every existing caller still satisfies it |
| 25 `:63-64` | `if (sec.index < 1 \|\| sec.quality !== 'clean' \|\| sec.movingS === null) continue;` `out[sec.index] = earnedColour(sec.movingS, hist(sec.index), paint);` | `if (sec.index < 1 \|\| sec.quality !== 'clean') continue;` `const v = scoredS(sec); if (v === null) continue;` `out[sec.index] = earnedColour(v, hist(sec.index), paint);` |
| 16 `:84-88` | `if (sec.kind !== 'done' \|\| sec.interrupted \|\| sec.estimated \|\| sec.movingS === null) { out.push(null); continue; }` `out.push(earnedColour(sec.movingS, hist(k + 1), paint));` | `if (sec.kind !== 'done' \|\| sec.interrupted \|\| sec.estimated) { out.push(null); continue; }` `const v = scoredS(sec); if (v === null) { out.push(null); continue; }` `out.push(earnedColour(v, hist(k + 1), paint));` |

`:71` doc "with a moving time is 'clean'" → "with a real time (scoredS) is 'clean'".

### 3.5 Stored-ride surfaces — exact before/after

`app/src/ui/rideDetailModel.ts` — add `import { scoredS } from '../store/timing.ts';`

| # | Before | After |
|---|---|---|
| 17 `:83` | `r: { lapMovingS: number \| null; estimated: boolean; ignored: boolean },` | `r: { lapS: number \| null; estimated: boolean; ignored: boolean },` |
| 17 `:88` | `if (r.lapMovingS !== null) {` | `if (r.lapS !== null) {` |
| 17 `:91` | `const { pos, of } = positionAmong(r.lapMovingS, hist);` | `const { pos, of } = positionAmong(r.lapS, hist);` |
| 18 `:135-137` | `lapLabel: lapCellLabel(res.lap.movingS, estimated, res.lap.rawS),` `lapTier: ignored ? 'neutral' : tierFor(res.lap.movingS, hist),` `rankLine: rankLineFor({ lapMovingS: res.lap.movingS, estimated, ignored }, hist, d.barred(routeId)),` | insert `const lapS = scoredS(res.lap);` after `:130` (`const hist = d.laps(routeId);`), then: `lapLabel: lapCellLabel(lapS, estimated, res.lap.rawS),` `lapTier: ignored ? 'neutral' : tierFor(lapS, hist),` `rankLine: rankLineFor({ lapS, estimated, ignored }, hist, d.barred(routeId)),` |

`app/src/ui/rideHistoryModel.ts` — add `import { scoredS } from '../store/timing.ts';`

| # | Before | After |
|---|---|---|
| — `:41` | `export function lapCellLabel(movingS: number \| null, estimated: boolean, rawS: number \| null): string {` `if (movingS !== null) return fmt(movingS, 1);` | param renamed `lapS` (two places); doc at `:35-40` "a lap with no real moving time" → "a lap with no real time (scoredS null)". Behaviour unchanged: a real time prints to 0.1 s, an estimated lap prints `~raw`, anything else "no lap". |
| 19 `:114` | `const lapS = lap.movingS;` | `const lapS = scoredS(lap);` (`:115`, `:123-127` then read the right thing unchanged; `:124-126` comment "lapS is null for 'estimated'/'missed' quality by construction" stays true) |
| 20 `:171-180` | `if (sec.quality === 'estimated' \|\| sec.movingS === null) { ... ~raw ... }` `// clean or interrupted, with a real moving time.` `const tier = tierFor(sec.movingS, h);` … `timeLabel: fmt(sec.movingS, 1)` | insert `const v = scoredS(sec);` before the `if`; `if (sec.quality === 'estimated' \|\| v === null) { ...unchanged... }` `// clean or interrupted, with a real time (store/timing.ts).` `const tier = tierFor(v, h);` … `timeLabel: fmt(v, 1)` |
| 21 `:233-236` | `const sorted = [...window].sort((a, b) => (a.lap.movingS as number) - (b.lap.movingS as number));` `const p1 = sorted.length ? (sorted[0].lap.movingS as number) : null;` … `const v = r.lap.movingS as number;` | `scoredS(a.lap)`, `scoredS(b.lap)`, `scoredS(sorted[0].lap)`, `scoredS(r.lap)` — each `as number` kept (the window is `ranks()`-filtered upstream, so never null) |
| 22 `:256-257` | `if (s && s.quality === 'clean' && s.movingS !== null && (best === null \|\| s.movingS < best)) { best = s.movingS; }` | `const v = s && s.quality === 'clean' ? scoredS(s) : null;` `if (v !== null && (best === null \|\| v < best)) best = v;` |

`app/src/ui/towerModel.ts` — add `import { scoredS } from '../store/timing.ts';`

| # | Before (`:56-61`) | After |
|---|---|---|
| 26 | `// The window comes from ghostsFor(), whose ranks() filter already drops` `// null moving times — this filter is belt-and-braces, never semantics.` `const past = window` `.filter((r) => r.lap.movingS !== null)` `.map((r) => ({` `value: r.lap.movingS as number,` | `// ... already drops laps with no real time — ...` `const past = window` `.filter((r) => scoredS(r.lap) !== null)` `.map((r) => ({` `value: scoredS(r.lap) as number,` |

`buildTowerModel`'s `todayLapS` parameter is already mode-agnostic (the caller supplies it); no signature change.

Memo deps (mode flip on SETTINGS must not leave a mounted screen stale):

- `app/src/ui/RidesScreen.tsx`: add `import { useSettings } from './settings';`, `const { s } = useSettings();` inside the component (above the `useMemo` at `:93`), and change `:98` `[rides, resultsTick],` → `[rides, resultsTick, s.timing],`. Keep the `eslint-disable-next-line` comment.
- `app/src/ui/RideDetailScreen.tsx:189`: `[request.rideId, request.startedAtMs, tick],` → `[request.rideId, request.startedAtMs, tick, s.timing],` (`s` already in scope from `:124`). `PbDetail` (`:83-85`) is not memoised — nothing to do.
- `RecordScreen.tsx` — the two deps changes in §3.4.

### 3.6 Files touched — checklist

New: `app/src/store/timing.ts`, `app/tests/timing_suite.ts`. Edited: `store/types.ts`, `store/results.ts`, `ui/colourModel.ts`, `live/towerSource.ts`, `ui/liveView.tsx`, `ui/RecordScreen.tsx`, `ui/sectorTrailModel.ts`, `ui/rideDetailModel.ts`, `ui/rideHistoryModel.ts`, `ui/towerModel.ts`, `ui/settings.tsx`, `ui/RidesScreen.tsx`, `ui/RideDetailScreen.tsx`, `tests/run.ts`, `tests/store_suite.ts`, `tests/ridedetail_suite.ts` (+ any suite whose numeric expectation was pinned to a `movingS` that differs from `rawS` — §5.3). After this WP, `grep -rn "\.movingS" app/src --include=*.ts --include=*.tsx` should hit ONLY: `engine.ts`, `derive.ts`, `lastRide.ts`, `resultsStore.ts:81`, `timing.ts` (its own null check) and the `movingS` property *writes* in `results.ts`/`lastRide.ts` object literals. Any other hit is a missed call site.

## 4. Acceptance criteria

1. With no `settings.json` on the phone (virgin build) or a pre-existing one lacking the key, `Settings.timing === 'raw'` and `timingMode() === 'raw'`.
2. Under `'raw'`, every tier, rank, PB, Personal-Bests row, live handover chip, sector span colour and printed lap/sector time is computed from / prints `rawS`. Under `'moving'`, all of the same from `movingS`. No surface mixes the two (a number printed next to a colour is the same number the colour was judged on).
3. The set of laps/sectors that rank or colour is identical in both modes (estimated, missed, tripwire-demoted and rider-ignored never do; sector history stays clean-only).
4. Flipping the SETTINGS "Timing" segment re-renders RECORD (gate markers, sector spans), RIDES rows and the open ride detail with the other clock without any other interaction.
5. Nothing under `<documents>/qualifire/results/` or `ride*/` is rewritten by this change; `RESULT_SCHEMA_VERSION` is untouched; `store_suite.ts`'s moving≤raw and dirty-lap invariants still pass unmodified.
6. No `TowerRow.movingS`, no `rankLineFor({ lapMovingS })` remain (renamed, not aliased).
7. `tsc --noEmit` exit 0; test suite zero FAIL; the new `timing_suite.ts` passes and is registered in `run.ts`.

## 5. Verification

### 5.1 Commands (CLAUDE.md §6)

```
cd app && node --experimental-strip-types tests/run.ts      # zero FAIL
cd app && ./node_modules/.bin/tsc --noEmit                    # exit 0
```

### 5.2 New suite `app/tests/timing_suite.ts` (register in `tests/run.ts` after `'./store_suite.ts'`)

Use the `registerHooks` JSON shim + dynamic import pattern from `tests/sectortrail_suite.ts:1-33` for any module that transitively imports `colourModel.ts` (it pulls in `results.seed.json`); `store/timing.ts` and `store/results.ts` themselves are shim-free and may be imported statically. Build `RideResult`s with the `mkResult` helper shape from `tests/store_suite.ts:96-99` (copy it, do not import it — the suites are independent). Each test must `setTimingMode(...)` explicitly at its start and restore `DEFAULT_TIMING` at its end (the register is process-global across suites).

1. `timing: default is raw wall-clock (STATE.md ground rule)` — fresh import: `timingMode() === 'raw'`; `DEFAULT_TIMING === 'raw'`; for `{ rawS: 900, movingS: 880 }` `scoredS()` returns `900`.
2. `timing: moving is the opt-in` — after `setTimingMode('moving')`, the same object gives `880`.
3. `timing: scoredS keeps the store's no-real-time marker in BOTH modes` — `{ rawS: 900, movingS: null }` → `null` under `'raw'` and under `'moving'`; `{ rawS: null, movingS: null }` → `null`.
4. `timing: a lap with a stop ranks differently under raw vs moving` — window of clean rides where A = `{rawS: 900, movingS: 880}` and B = `{rawS: 890, movingS: 895}` (B stood still less but rolled slower) — under `'raw'` `tower([A,B])` puts B at position 1 with `timeS === 890`; under `'moving'` A is position 1 with `timeS === 880`. Same test with `sectorHistory(rs, 1)` on two sectors with swapped raw/moving order.
5. `timing: ranks() is mode-invariant` — the five `{clean, interrupted, estimated, missed, tripwire-demoted}` cases from `store_suite.ts:299-303` give the same boolean under both modes.
6. `timing: lapValues / sectorValues / allTimeBestLapS follow the mode` — via the dynamic-import path. `tests/live_colour_suite.ts:146-158` already has the injection mechanism: `resetRecordedForTests()`, then `rememberRide(stateWith({ sectors: [doneSector(...) x4], lap: { rawS, stoppedS, movingS, estimated: false } }))`. Copy `stateWith`/`doneSector` from that suite (do not import across suites) and build ONE ride on a route with ≥ `MIN_HISTORY` prior history whose lap has `rawS = movingS + 30` and whose sector 1 has `rawS = movingS + 10`; assert `lapValues(track)` contains the raw lap under `'raw'` and the moving lap under `'moving'`, same for `sectorValues(track, 1)` and `allTimeBestLapS(track)` when the ride is the fastest on file. Call `resetRecordedForTests()` at the end. If the seed route this suite relies on has too little history in the virgin build (`shippedResults()` is `[]` there — `colourModel.ts:45`), `skip()` with that note the way `live_colour_suite.ts` guards its own `priors >= MIN_HISTORY` at `:149`.
7. `timing: rideDetailFor / buildRideRows / buildSectorRows / buildPbDetail print and judge the scored clock` — a result with `lap {rawS: 900, movingS: 880}` and one clean sector `{rawS: 440, movingS: 430}`: under `'raw'` `lapLabel === '15:00.0'`, sector `timeLabel === '7:20.0'`; under `'moving'` `'14:40.0'` / `'7:10.0'`. `buildPbDetail` window of two rides with crossed raw/moving order lists them in the opposite order in the two modes, and `pbSectors` picks the opposite sector best.
8. `timing: storedSectorColours / liveSectorColours colour the scored clock` — history `[100,100,100,100,100]` (≥ `MIN_HISTORY`), sector `{rawS: 105, movingS: 95, quality: 'clean'}` → `'raw'` yields the yellow paint, `'moving'` yields purple. Same for a `'done'` `LiveSector` `{rawS: 105, stoppedS: 10, movingS: 95, interrupted: false, estimated: false}`.
9. `timing: an interrupted live sector never colours, an estimated one never scores — in either mode` — the §3.4 #16 guards unchanged.

### 5.3 Existing tests to update (mechanical, and ONLY these kinds of edits)

- `tests/store_suite.ts:430,433,436` — `.movingS` on `TowerRow` → `.timeS`. Re-read the expectations: `:438` builds `hot` with `rawS: pole - 5, movingS: pole - 10` — under the raw default `pole` is now the raw pole and `hot` still sits at P1 (`pole - 5 < pole`); `:442`'s `slow` is 9999 both ways. `:433`'s `> 480 && < 2400` bounds are on seed laps — if a seed's raw lap exceeds 2400 s the bound, not the code, is wrong; widen the bound and say so in the commit line rather than switching the test to `'moving'`.
- `tests/ridedetail_suite.ts:130` — `{ lapMovingS: 850, ... }` → `{ lapS: 850, ... }`.
- Any other suite whose fixture has `rawS ≠ movingS` AND whose assertion pins the moving number (candidates: `ridedetail_suite.ts:39-42` lap 900/880 and sectors 440/430, 460/450; `ridedetail_suite.ts:76` 900/850; `store_suite.ts:274-282` tower fixture; `ridehistory_suite.ts` uses equal values throughout; `towermodel_suite.ts:38` sets `rawS: movingS` so it is unaffected): update the expected value to the raw number — the default ships and is what the suites must exercise. **Never flip a whole suite to `setTimingMode('moving')` to keep old expectations.** Exception: `store_suite.ts:346-411`'s moving/raw invariant tests read the stored fields directly and are untouched.
- If an assertion's intent is genuinely about moving-time semantics rather than "the printed/ranked number", stop and report which (§7) rather than deciding.

### 5.4 On-device (Nathan, after Inspect — not Execute's to claim)

SETTINGS → SCORING shows "Timing · wall clock | moving", wall clock selected on a fresh install. A ride with a known red light shows a larger headline time and a worse tier/rank under wall clock than after flipping to moving, and RIDES/ride detail/RECORD gate colours follow the flip without leaving the tab. Coordinator then rewrites `STATE.md:106-107` (drop the parenthetical) and closes the OPEN-ITEMS.md `:72-74` entry.

## 6. Out of scope (do not do)

- Re-deriving stored results, bumping `RESULT_SCHEMA_VERSION`, touching `derive.ts`/`engine.ts`/`resultsStore.ts`/`lastRide.ts` storage writes.
- Changing eligibility (which laps rank, clean-only sector history, the interrupted-never-colours live rule).
- Renaming `FinishedRide.lapMovingS`/`.sectors[].movingS` in `lastRide.ts` (they genuinely are moving time).
- Any copy on the RECORD/RESULT surfaces explaining the mode (no "wall clock" badge on chips) — a follow-up if Nathan wants one.
- The DEMO tab (`demoModel.ts` scripts its own tiers, reads no store).

## 7. Stop-on-ambiguity

Standard clause (CLAUDE.md §2): any anchor in §2/§3 that does not match the file on the day — a line number off by more than a few lines with the quoted code not found nearby, a quoted "Before" that is not verbatim, a signature that differs — STOP, report the mismatch verbatim, do not guess, do not take a ruling from the coordinator's chat; the mismatch goes to a fresh Fable. Likewise any undecided call not covered above.

Things the Plan tier is flagging explicitly:

1. **Interrupted sectors in raw mode (design question for Nathan, NOT for Execute).** `sectorValues()` (`colourModel.ts:115-128`) is CLEAN-ONLY history and `liveSectorColours` (`sectorTrailModel.ts:84`) never colours an interrupted sector, while interrupted *laps* do rank. Under "luck counts" one could argue an interrupted sector should both colour and enter the benchmark by its raw time. This brief keeps eligibility identical in both modes (so the switch is a pure clock swap and the two modes stay comparable); the consequence is that an interrupted sector's row on ride detail (`rideHistoryModel.ts:171-180`, which DOES tier interrupted sectors) will read yellow against a clean-only benchmark in raw mode — which is arguably exactly "luck counts". Execute implements as written; the coordinator should surface the question to Nathan as a follow-up OPEN-ITEM.
2. **Existing recorded results need no migration.** `rawS` is already stored for every lap and sector (§2.1); the switch reads a different existing field. Historical rides were *ranked* under moving time in the past, but rank is never stored (`types.ts:140` "Rank is computed, never stored"; `colourModel.ts` header "no benchmark second is stored"), so nothing on disk encodes the old clock. If Execute finds any stored rank/tier/benchmark field anywhere (a `position`, `tier`, `pbS` persisted to JSON), STOP — that would need a migration this brief does not contain.
3. **`scoredS` returns null when `movingS` is null even in raw mode.** Deliberate (§3.1, acceptance 3) so eligibility is mode-invariant and every existing `=== null` gate keeps its meaning. The one observable consequence: a non-estimated *live* lap/sector whose kinematics produced no moving time (engine `:938-944`, `<2` buffered fixes — in practice never on a real ride) still prints raw and colours neutral under raw mode, exactly as today. If Execute finds a real-ride path where a clean/interrupted lap or sector is stored with `movingS === null`, STOP and report — that would make raw mode silently refuse to score a real lap.
4. **§5.2 test 6 depends on seed history.** `lapValues('Morning')` in `live_colour_suite.ts` needs ≥5 prior rides on file; in a virgin build `shippedResults()` is `[]`. If the existing suite gets its history from a test fixture that the new suite cannot reach the same way, `skip()` test 6 with a one-line note rather than inventing a test-only export in `colourModel.ts` — tests 4 and 7 cover the same seam one layer down.
5. **`Seg` typing.** `Seg<T extends string>` at `settings.tsx:97` infers `T` from `options`; if `set('timing', v)` fails to type-check because `v` infers as `string`, annotate `<Seg<TimingMode> ...>` — do not widen `Settings.timing` to `string`.
6. **Import extension style.** §3.1 last paragraph: match the importing file. If `tsc`/Metro disagree about `.ts` extensions in any of the touched files, copy exactly what that file's neighbouring imports do; do not "fix" the style file-wide.

---
## Inspect findings (2026-09-04, fresh-context Fable pass) — read before executing

**Verdict: PASS WITH FINDINGS.** All load-bearing claims re-confirmed independently: `rawS` really is already stored at every cited location (`types.ts:96/110`, `derive.ts:74-77/111-115`, `lastRide.ts:86-87/160-164`, `engine.ts:172-190`) — no schema change needed. The Settings module is exactly as described. A fresh `grep "\.movingS"` over `app/src` matched the brief's 27-site table exactly — nothing missed.

Two mechanical gaps Execute must handle (not in this brief's original §5.3 verification list):
1. `tests/sectortrail_suite.ts:51` has a local `StoredLike` type without a `rawS` field. Since `tsc --noEmit` type-checks `tests/` too (confirmed via `--listFilesOnly`), this brief's change (which threads `rawS` through call sites feeding `sectorHistory()`-adjacent code) will break `tsc` at this exact spot unless `StoredLike` also gains `rawS`. Add it.
2. The brief's §5 "After" snippet for `sectorHistory()` leaves the loop variable `s` un-narrowed before reading `s.quality`, which fails under this project's strict TS settings (TS2532, "object possibly undefined"). Add the same narrowing guard the surrounding code already uses elsewhere in this file.

Also confirmed: `#7`'s flag-4 concern (a Node-vs-app seed mismatch) is a non-issue — under Node the seed is `'shipped'`, so that skip-escape-hatch isn't needed; and the `store_suite.ts:433` raw-lap bound (480..2400) holds for seed data under the new mode.

**Sequencing note:** this brief and `WP-E-gate-tick-colour-retire.md` both touch `RecordScreen.tsx` lines ~769-787 (WP-E deletes the `gateColours` memo there; WP-C's call-site sweep passes through the same file for its `.movingS` replacements). Land WP-E first if both are being executed in the same session — smaller, cleaner diff, and removes a chunk of code WP-C would otherwise have to step around.
