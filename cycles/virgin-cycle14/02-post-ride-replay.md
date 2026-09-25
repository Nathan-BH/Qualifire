# 02 — Post-ride REPLAY of a recorded ride

**Source: testuser LBH, idea #2** — "I don't plan to watch the app live while riding. Add a
live REPLAY of the race, like the DEMO tab looks, for each recorded ride, so a rider can
always review the race post-ride. The demo's 25× is too fast and not smooth — try 10× as the
default first (tweak later)."

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-25 by the Plan
tier (Fable) from a Haiku digest + anchor checks against the working tree. Executor: Sonnet,
cold, this file only.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-25. If a quoted
  line is not where the brief says, or a name/signature differs, **stop and report the
  mismatch verbatim** (file, line, expected, found). Never guess, never patch around it,
  never rule on it yourself.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `safe_to_delete/` is the bin.
- No new dependency, native or JS. JS-only, ships OTA.
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`.
- **The DEMO tab is untouched.** `DemoScreen.tsx:104 const RATE = 25;` and `:105 const TICK_MS = 33;`
  stay exactly as they are. The replay has its own constants.

## Goal

A **Replay** button on the ride-detail screen (every ride matched to a way, plus a way's own
reference ride). It opens a full-screen replay that looks like the DEMO's SECOND/TENTH RIDE
run: live-variant map with the way's line, the rider's dot moving along its OWN recorded
fixes, the prior rides of that way racing as self dots, the shared `LiveSectorPane` (ticking
lap clock, sector strip filling in with the ride's real sector tiers, live `P`), a status
line, and controls: PAUSE/PLAY, RESTART, a speed pill (5× / **10×** / 25×), BACK. Default
10×. Auto-plays on open, auto-pauses a few ride-seconds after the finish line.

## Decisions (already made — do not reopen)

1. **Rider position comes from the ride's own raw fixes, not from sector times.** Same path
   the self dots already use for past rides: `chronologicalFixes(decodeRideFile(...))` →
   `deriveGateCrossings` against the way's CURRENT gate set (`catalogTrackSpecs`), positions
   linearly interpolated between bracketing fixes (`interpAt`, `selfRaceModel.ts:117`). The
   live engine (`live/engine.ts`, `feedCandidate`) is NOT re-run: it is real-time-coupled and
   `deriveGateCrossings` (`store/derive.ts:152`) is already the offline sibling built for
   exactly this replay. The rider is, in effect, one more self track with all gates.
2. **Replay clock 0 = this ride's own START-gate crossing** (`startS` from
   `deriveGateCrossings`), exactly the DEMO's R3 and the live screen's `startGateT`. The
   pre-START approach is not replayed. The clock runs to the FINISH crossing +
   `REPLAY_ROLL_OUT_S`, then pauses. A ride that crossed START but never FINISH replays to its
   last fix and pauses there (no roll-out); a ride that never crossed START gets a one-line
   "no replay" screen, never a guess.
3. **Selfs = the rides that existed when this ride was ridden** — the ranked rides of the way
   with `startedAtMs` before this ride, last `WINDOW_PREV`, this ride excluded by id
   (`priorWindowFor`, new in `colourModel.ts`). Same-race framing: the replay shows the race
   the rider actually rode, ride k against k−1 (capped at 9), identical in count to what the
   live screen showed that day. Rides ridden later never appear.
4. **Sector chip times and tiers are the stored result's** (`rideDetailFor(...).sectorRows`,
   what the ride-detail screen already shows), revealed as the replay clock passes each gate's
   crossing moment. Gate crossing MOMENTS are re-derived against the current gate set (decision
   1). Lap chip: neutral, the detail's `lapLabel`, once every gate is crossed — no ranking
   tower/reveal in the replay (the detail screen underneath already shows the rank).
5. **Smoothness strategy** (the tester's "25× is not smooth"; `OPEN-ITEMS.md` item 7 already
   suspected the demo's 30 fps full-screen re-render): `REPLAY_RATE_DEFAULT = 10`,
   `REPLAY_TICK_MS = 50` (20 redraws/s). At 10× a frame advances 0.5 ride-seconds ≈ 3–4 m at
   commuting speed, every position interpolated between the 1 Hz fixes, so there is no fix
   stepping; per tick the ONLY state write is one number (`clockS`) and everything else
   (rider position, self dots, pane model, span colours) is `useMemo`'d off it; no growing
   trail and no per-tick array building beyond the dots; the big lap clock is driven by a
   RUNNING `Timebase` with `rate = REPLAY_RATE` (`liveView.tsx:46-54` — built for this, "~70
   in the demo") so its digits tick inside `LiveClock`'s own 100 ms interval without our
   re-render. Quantising to 250 ms (item 7's one-liner) is deliberately NOT done: at 10× that
   would be 2.5 ride-second, ~17 m hops — worse. The 5×/10×/25× pill exists so Nathan can
   compare on the phone; 10× is one named constant.
6. **Entry point: `RideDetailScreen.tsx` only.** It is already reachable from post-STOP, RIDES,
   ROUTES and RESULTS (`tabNav.tsx:32-36`, `source`) and already hides the tab bar, so a replay mounted
   INSIDE it (a `replaying` state that swaps the ScrollView for `ReplayScreen`) needs no
   `App.tsx`/`tabNav.tsx` change and BACK from the replay lands on the same detail screen,
   whose own `source`-routed primary button is untouched. No RIDES-row shortcut.
7. **Controls, minimal:** PAUSE/PLAY (one button), RESTART, speed pill, ‹ BACK. No scrubbing
   (out of scope). No gate buzz, no earcons (couch, not bike). Map pannable while paused
   (`liveState 'finished'`), locked/following while playing (`'moving'`) — the DEMO's own
   `running ? 'moving' : 'finished'` rule (`DemoScreen.tsx:388`).
8. **Pure model first.** All logic in a new `app/src/ui/replayModel.ts` (no React/RN/expo
   imports) with a headless suite; `ReplayScreen.tsx` is wiring only.

## Files to touch

### 1. `app/src/store/derive.ts` — every gate's crossing (additive)

Anchors: line 142 `export interface GateCrossings {`, line 149 `  chainageM: ArrayLike<number>;`,
lines 163-167:

```ts
  return {
    startS: crossTime(inp.t, s, g0),
    finishS: crossTime(inp.t, s, gLast),
    chainageM: s,
  };
```

Change: add to `GateCrossings` after line 149
```ts
  /** virgin-cycle14 brief 02 (replay): crossTime per gate, same order as `gates`;
   *  gateS[0] === startS, gateS[last] === finishS; null = never crossed. */
  gateS: (number | null)[];
```
and in the return add `gateS: inp.gates.map((g) => crossTime(inp.t, s, g)),` after `chainageM: s,`.
`startS`/`finishS` stay as they are (existing tests read them). `crossTime` is already
imported (line 30).

### 2. `app/src/ui/colourModel.ts` — the as-ridden window (additive)

Anchor: line 77 `export function ghostsFor(wayId: string, excludeRideId?: string): RideResult[] {`
(body: `return rankedFor(wayId).filter((r) => r.rideId !== excludeRideId).slice(-WINDOW_PREV);`).

Insert directly after that function:

```ts
/** virgin-cycle14 brief 02 (replay): the comparison window AS IT STOOD when `rideId`
 * was ridden — ranked rides of the way started before `beforeMs`, this ride excluded
 * by id, last WINDOW_PREV. Ride k replays against k-1 (capped at 9), exactly what
 * the live screen showed that day; rides ridden later never appear. */
export function priorWindowFor(wayId: string, rideId: string, beforeMs: number): RideResult[] {
  return rankedFor(wayId)
    .filter((r) => r.rideId !== rideId && r.startedAtMs < beforeMs)
    .slice(-WINDOW_PREV);
}
```

### 3. `app/src/ui/selfRaceModel.ts` — export `interpAt`, split the loader (behaviour unchanged)

Anchors: line 117 `function interpAt(` → make it `export function interpAt(` (add one line to
its doc comment: "Exported for replayModel.ts (virgin-cycle14 brief 02)."). Lines 269-275:

```ts
export async function loadSelfTracks(
  wayId: string, gateSetVersion: number, fs: FsAdapter,
): Promise<SelfTrack[]> {
  const spec = catalogTrackSpecs().find((s) => s.id === wayId);
  if (!spec) return [];

  const window = ghostsFor(wayId);
```

Change: `loadSelfTracks` becomes a two-line wrapper and the body moves, verbatim, into a new
exported sibling that takes the window as a parameter:

```ts
export async function loadSelfTracks(
  wayId: string, gateSetVersion: number, fs: FsAdapter,
): Promise<SelfTrack[]> {
  return loadSelfTracksFor(wayId, gateSetVersion, fs, ghostsFor(wayId));
}

/** virgin-cycle14 brief 02 (replay): loadSelfTracks over an EXPLICIT window (the replay
 * passes colourModel.priorWindowFor's as-ridden window). Same cache, same skips, same
 * logging; loadSelfTracks is now this with ghostsFor(wayId). */
export async function loadSelfTracksFor(
  wayId: string, gateSetVersion: number, fs: FsAdapter, window: readonly RideResult[],
): Promise<SelfTrack[]> {
  const spec = catalogTrackSpecs().find((s) => s.id === wayId);
  if (!spec) return [];
  const out: SelfTrack[] = [];
  ... // lines 277-346 as they are, minus the `const window = ghostsFor(wayId);` line
```

Add `import type { RideResult } from '../store/types.ts';` next to the existing imports
(after line 44 `import type { FsAdapter } from '../storage/fsAdapter.ts';`). Nothing else in the body changes; the
`console.log` at 343-345 keeps reading `window.length`.

### 4. NEW `app/src/ui/replayModel.ts` — the pure model

No `react`, `react-native`, `expo` imports. Imports: `interpAt`, `type SelfTrack` from
`./selfRaceModel.ts`; `deriveGateCrossings` from `../store/derive.ts`; `chronologicalFixes`,
`decodeRideFile` from `../storage/jsonl.ts`; `catalogTrackSpecs` from `../live/tracks.ts`;
`type FsAdapter` from `../storage/fsAdapter.ts`; `type RefLine` from
`../../core/src/index.ts`; `type LiveViewModel, type Timebase` from `./liveView.tsx`
(type-only, house precedent `demoModel.ts:20`); `type SectorRowModel` from
`./rideHistoryModel.ts`; `type Tier` from `./chips.tsx` (type-only).

```ts
/** Ride-seconds per real second. Nathan/LBH: 10 first, tweak later. ONE constant. */
export const REPLAY_RATE_DEFAULT = 10;
export const REPLAY_RATES: readonly number[] = [5, 10, 25];
/** Redraw cadence — 20 fps; see brief decision 5. */
export const REPLAY_TICK_MS = 50;
/** Ride-seconds the clock keeps running past the FINISH crossing before auto-pause (1 real s at 10×). */
export const REPLAY_ROLL_OUT_S = 10;
/** Raw fixes kept this far either side of [startMs, endMs] so the ends interpolate (selfRaceModel's EDGE_PAD_MS). */
export const REPLAY_EDGE_PAD_MS = 5000;

export interface ReplayFix { tUnixMs: number; lat: number; lon: number; sM: number }

export interface ReplayRider {
  rideId: string;
  /** epoch ms of the START-gate crossing (clock 0) */
  startMs: number;
  /** epoch ms of the FINISH-gate crossing; null = never crossed */
  finishMs: number | null;
  /** finishMs, or the last kept fix when finish was never crossed — the replay stops here */
  endMs: number;
  /** epoch ms per gate (same order as the gate set); null = never crossed. gateMs[0] === startMs. */
  gateMs: (number | null)[];
  /** ascending by tUnixMs, >= 2 entries, every fix carries chainage sM (metres along ref) */
  fixes: readonly ReplayFix[];
}

/** Pure: raw fixes (any order; preStart/warmup dropped) + a way's spec -> the rider, or null
 * when < 2 usable fixes or START never crossed. No decimation (one track, binary search). */
export function buildReplayRider(
  rideId: string,
  raw: readonly { tUnixMs: number; lat: number; lon: number; preStart?: boolean; warmup?: boolean }[],
  spec: { ref: RefLine; gates: number[] },
): ReplayRider | null;
// body: inOrder = chronologicalFixes(raw).filter(!preStart && !warmup); < 2 -> null;
// t = tUnixMs/1000 arrays; deriveGateCrossings -> startS null -> null;
// gateMs = gateS.map(x => x === null ? null : x * 1000); startMs = startS*1000;
// finishMs = finishS === null ? null : finishS*1000; endMs = finishMs ?? inOrder[last].tUnixMs;
// fixes = inOrder.map((f,i) => ({tUnixMs, lat, lon, sM: chainageM[i]})).filter(t in [startMs-PAD, endMs+PAD]);
// fixes.length < 2 -> null.

/** Ride-seconds at which the replay auto-pauses. */
export function replayEndS(r: ReplayRider): number;
// (r.endMs - r.startMs)/1000 + (r.finishMs === null ? 0 : REPLAY_ROLL_OUT_S)

/** Wall-clock anchor of the replay clock (the Timebase idea, in ride-seconds). */
export interface ReplayAnchor { clockS: number; realMs: number; rate: number; playing: boolean }

/** Ride-seconds now: clockS + (nowMs - realMs)/1000 * rate while playing, clockS otherwise. Never below 0. */
export function replayClockS(a: ReplayAnchor, nowMs: number): number;

/** The pane's Timebase for this anchor: {anchorRealMs: realMs, anchorClockMs: clockS*1000, rate, running: playing}. */
export function replayTimebase(a: ReplayAnchor): Timebase;

/** Rider position at ride-second clockS: interpAt(r.fixes, r.startMs + clockS*1000). */
export function riderPositionAt(r: ReplayRider, clockS: number): { lat: number; lon: number; sM: number | null };

/** Highest gate index i >= 1 whose crossing is known and at/before clockS; 0 before any.
 * A missed (null) gate is skipped, a later crossed gate still counts. */
export function replayGatesDone(r: ReplayRider, clockS: number): number;

/** Gate-indexed sector colours with the unearned ones blanked: index i kept iff 1 <= i <= gatesDone, else null. */
export function replaySectorColours(all: readonly (string | null)[], gatesDone: number): (string | null)[];

/** The LiveSectorPane model (DemoScreen's demoLiveViewModel, but from real stored rows):
 * strip[k] = sectorRows[k] tier/timeLabel once k+1 <= gatesDone ('none', no time, current
 * = k === gatesDone otherwise); contextLabel 'S<gatesDone+1>' until all done then '';
 * lap = every gate done AND r.finishMs !== null ? {tier: 'neutral', time: lapLabel, delta: ''} : null;
 * flash null, flashKey 0, posChip null, livePos passed through, clock = tb. */
export function replayLiveViewModel(
  r: ReplayRider, sectorRows: readonly SectorRowModel[], lapLabel: string,
  clockS: number, tb: Timebase, livePos: string | null,
): LiveViewModel;

/** Async loader: rides/<rideId>.jsonl through fs, spec via catalogTrackSpecs(); null when
 * the file is absent/unreadable, the way has no spec, or buildReplayRider says null. Never throws. */
export async function loadReplayRider(rideId: string, wayId: string, fs: FsAdapter): Promise<ReplayRider | null>;
```

`SectorRowModel.tier` is a `UiTier` (`rideHistoryModel.ts:170-176`), a subset of chips'
`Tier` (`chips.tsx:17`) — assignable without a cast. Strip slot count = `sectorRows.length`
when it is > 0, else `r.gateMs.length - 1` with tier 'none' throughout (the reference-ride
case: no stored sectors, strip still shows S1..S4 filling as neutral, no times).

### 5. NEW `app/src/ui/ReplayScreen.tsx` — wiring only

Props: `{ rideId: string; wayId: string; startedAtMs: number; detail: RideDetailModel; onClose: () => void }`
(`RideDetailModel` from `./rideDetailModel.ts`, type-only).

State: `rider: ReplayRider | null | 'loading'` (init `'loading'`), `selfTracks: SelfTrack[]`,
`anchor: ReplayAnchor` (init `{ clockS: 0, realMs: Date.now(), rate: REPLAY_RATE_DEFAULT, playing: false }`),
`clockS: number` (0). `timer` ref like `DemoScreen.tsx:128`.

Load effect (deps `[rideId, wayId, startedAtMs, settings.timing]`): `const fs = createExpoFsAdapter();`
`const gsv = gateSetFor(currentCatalog(), wayId)?.version ?? 1;` (`RecordScreen.tsx:912`'s
exact lookup; imports `gateSetFor` from `../store/catalog.ts`, `currentCatalog` from
`../store/catalogStore.ts`); `Promise.all([loadReplayRider(rideId, wayId, fs), settings.selfDots ? loadSelfTracksFor(wayId, gsv, fs, priorWindowFor(wayId, rideId, startedAtMs)) : Promise.resolve([])])`
→ if not cancelled: `setRider(r); setSelfTracks(tracks); if (r !== null) { setClockS(0); setAnchor({ clockS: 0, realMs: Date.now(), rate: anchorRef.current.rate, playing: true }); }`
(keep the chosen rate across a reload; `anchorRef` mirrors `anchor` — or read it via the
functional `setAnchor((a) => ...)` form, executor's choice, no third option).

Tick effect (deps `[anchor, rider]`): if `!anchor.playing || rider === null || rider === 'loading'` return;
`const endS = replayEndS(rider);` `setInterval(() => { const next = replayClockS(anchor, Date.now()); if (next >= endS) { setClockS(endS); setAnchor({ clockS: endS, realMs: Date.now(), rate: anchor.rate, playing: false }); } else setClockS(next); }, REPLAY_TICK_MS)`,
cleared on cleanup and on unmount.

Handlers:
- `togglePlay`: playing → `setAnchor({ clockS, realMs: now, rate, playing: false })`; paused and
  `clockS >= endS` → restart; paused otherwise → `setAnchor({ clockS, realMs: now, rate, playing: true })`.
- `restart`: `setClockS(0); setAnchor({ clockS: 0, realMs: now, rate, playing: true })`.
- `setRate(r)`: `setAnchor({ clockS, realMs: now, rate: r, playing: anchor.playing })`.
- Hardware back: `BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; })`
  in an effect with deps `[onClose]` — registered after Shell's (`App.tsx:107-135` only
  re-registers on tab/overlay change, none of which happens during a replay), so it runs
  first, same reliance as `DemoScreen.tsx:309-315`.

Derived (all `useMemo` on `[rider, clockS, ...]`): `pos = riderPositionAt`, `elapsedMs = clockS * 1000`,
`selfDots = selfDotsAt(selfTracks, elapsedMs)`, `gatesDone = replayGatesDone`,
`livePos = settings.selfDots && gatesDone < sectorCount ? (selfLivePosition(selfDots, pos.sM) → 'P<n>' | null) : null`,
`vm = replayLiveViewModel(rider, detail.sectorRows, detail.lapLabel, clockS, replayTimebase(anchor), livePos)`,
`sectorColours = settings.sectorColours ? replaySectorColours(detail.sectorColours, gatesDone) : ALL_YELLOW`.

Render (copy `raceColumn`, `trackLine`, `stopSlim*` styles by value from `DemoScreen.tsx:530-556`,
as DemoScreen copied them from RecordScreen):
- `rider === 'loading'`: `raceColumn` with one `trackLine` "loading replay…" and a BACK pill.
- `rider === null`: `trackLine` "no replay — this ride never crossed START on this way" + BACK.
- else, top to bottom: `settings.liveMap ? <View style={{ flex: 1, minHeight: 220, alignSelf: 'stretch' }}><WayMapView key={`replay-${rideId}`} wayId={wayId} lat={pos.lat} lon={pos.lon} zoom={4} sectorColours={sectorColours} leadColour={settings.sectorColours ? colors.grey : undefined} selfs={settings.selfDots ? selfDots : undefined} variant="live" liveState={anchor.playing ? 'moving' : 'finished'} fill /></View> : <View style={{ flex: 1 }} />`
  (the DEMO's map block at `DemoScreen.tsx:379-389` (the non-first branch, 384-388) minus `asset`; `leadColour` follows
  `RideDetailScreen.tsx:444-445`'s rule); `<LiveSectorPane vm={vm} showLap />`;
  status `trackLine`: `replay · ${anchor.rate}× · ${wayLabelIn(currentCatalog(), wayId)}` while
  not over, `replay over · ${detail.rankLine || detail.lapLabel}` once `clockS >= endS`;
  a speed row of three pills (`REPLAY_RATES`, selected = `anchor.rate`, DemoScreen's
  `pill`/`pillSelected`/`pillOutline`/`pillText`/`pillTextSelected` styles by value (`DemoScreen.tsx:515-522`)); a control row: `stopSlim`-styled
  PAUSE / PLAY (label `anchor.playing ? 'PAUSE' : clockS >= endS ? 'REPLAY AGAIN' : 'PLAY'`),
  a RESTART pill, and a ‹ BACK pill (`RideDetailScreen.tsx:413-415`'s ‹ BACK look).

### 6. `app/src/ui/RideDetailScreen.tsx` (678 lines) — the button and the swap

Anchors: line 21 `import { useEffect, useMemo, useState } from 'react';`; line 35
`import { rideDetailFor } from './rideDetailModel.ts';`; line 132
`  const [fixes, setFixes] = useState<TrailPoint[] | null>(null);`; line 187 `  const model = useMemo(`;
line 408 `  const primaryLabel = request.source === 'post-stop' ? ...`; lines 552-556:

```tsx
      <View style={{ marginTop: 16 }}>
        <Text style={[st.h2, { color: t.textDim }]}>ACTIONS</Text>
        <View style={styles.pillRow}>
          <Pressable
            style={[styles.exportBtn, exporting && styles.busy]}
```

Change:
- Import `ReplayScreen` from `./ReplayScreen.tsx` after line 35.
- After line 132: `  const [replaying, setReplaying] = useState(false); // virgin-cycle14 brief 02`.
- After the `model` useMemo's closing (`  );` — the one ending the block that starts at 187):
  `  const replayWayId = model.wayId ?? model.referenceOf?.id ?? null; // a matched ride, or a way's own reference ride`.
- Directly after line 408 (all hooks are above it — this early return must stay below every hook):
  ```tsx
  if (replaying && replayWayId !== null) {
    return (
      <ReplayScreen rideId={request.rideId} wayId={replayWayId} startedAtMs={request.startedAtMs}
        detail={model} onClose={() => setReplaying(false)} />
    );
  }
  ```
- Inside the ACTIONS `pillRow` (line 554), as its FIRST child, before the Export button:
  ```tsx
          {replayWayId !== null ? (
            <Pressable style={styles.exportBtn} onPress={() => setReplaying(true)}>
              <Text style={styles.exportText}>Replay</Text>
            </Pressable>
          ) : null}
  ```
Free rides and unmatched rides (`replayWayId === null`) show no button. Header comment: add
one line "virgin-cycle14 brief 02 (testuser LBH #2): REPLAY — `ReplayScreen.tsx` mounted in
place of this scroll view while `replaying`."

### 7. NEW `app/tests/replay_suite.ts` + registration

Register in `app/tests/run.ts`: `import './replay_suite.ts';` directly after line 51
`import './virginmanifest_suite.ts';` (before `import { runAll } from './lib.ts';`).

Style: `tests/selfrace_suite.ts:16-42` — the `registerHooks` JSON shim, then DYNAMIC imports
of `../src/ui/replayModel.ts`, `../src/ui/colourModel.ts`, `../src/ui/selfRaceModel.ts`,
`../src/ui/lastRide.ts`, `../src/store/derive.ts`, `../src/live/tracks.ts`,
`../src/storage/fsAdapter.ts`. Copy `makeResult`, `pointAtChainage`, `fixLine` and
`FAR_FUTURE_MS` from that suite by value (lines 49-89). Cases:

1. `REPLAY_RATE_DEFAULT === 10` and `REPLAY_RATES.includes(REPLAY_RATE_DEFAULT)`; `REPLAY_TICK_MS >= 33 && <= 100`.
2. `buildReplayRider` on `loadFixture('clean_morning')` (zip its `fixes.t/lat/lon` into
   `{tUnixMs: t*1000, lat, lon}`) vs `fixtureSpecs()` Morning: non-null; `startMs`/`finishMs`
   equal `deriveGateCrossings`'s `startS*1000`/`finishS*1000`; `gateMs.length === spec.gates.length`;
   `gateMs[0] === startMs`, `gateMs[last] === finishMs`; the non-null `gateMs` strictly ascend;
   `fixes` ascend; every fix has a finite `sM`; `fixes[0].tUnixMs >= startMs - REPLAY_EDGE_PAD_MS`.
3. `deriveGateCrossings(...).gateS` on the same fixture: `gateS[0] === startS`, `gateS[last] === finishS`, length = gates.
4. Synthetic ramp (pointAtChainage on Morning's ref) from `g0 - 500` to `g0 - 100` (never reaches START) → `buildReplayRider` null.
5. Ramp from `g0 - 5` to `gates[1] + 50` (START crossed, FINISH not): `finishMs === null`,
   `endMs === last fix tUnixMs`, `replayEndS === (endMs - startMs) / 1000` (no roll-out);
   `replayGatesDone(r, replayEndS(r)) === 1`.
6. Ramp `g0 - 5` → `gLast + 5` (both crossed): `replayEndS === (finishMs - startMs)/1000 + REPLAY_ROLL_OUT_S`.
7. One fix → null; all fixes `preStart: true` → null; fixes given in REVERSE order produce the
   same rider as in order (chronologicalFixes).
8. `riderPositionAt`: hand-built rider, fixes at t=0/10000/20000 lon 0/0.001/0.002, sM 0/100/200:
   clockS 5 → lon 0.0005, sM 50; clockS −1 → clamped first; clockS 30 → clamped last.
9. `replayClockS`: `{clockS: 100, realMs: 1000, rate: 10, playing: true}` at now 2000 → 110;
   playing false → 100; rate 25 at +1 s → 125; never below 0.
10. `replayTimebase`: fields map 1:1 (`anchorClockMs === clockS*1000`, `running === playing`).
11. `replayGatesDone` on `gateMs [0, 100000, null, 300000, 400000]`, startMs 0: clockS 50 → 0,
    150 → 1, 250 → 1, 350 → 3, 400 → 4.
12. `replaySectorColours([null,'a','b','c','d'], 2) → [null,'a','b',null,null]`; `(…, 0)` → all null.
13. `replayLiveViewModel` with four sectorRows (tiers purple/green/yellow/neutral, labels
    'S1'..'S4', timeLabels '3:05' etc.): clockS before gate 1 → all 'none', `current` only on
    strip[0], contextLabel 'S1', lap null; after gate 2 → strip[0..1] carry their tier +
    timeLabel, strip[2].current, contextLabel 'S3'; after gate 4 with finishMs set → lap
    `{tier: 'neutral', time: lapLabel, delta: ''}`, contextLabel ''; with `finishMs: null`
    lap stays null; `livePos` passes through; `clock === tb` (same object).
14. `priorWindowFor`: `resetRecordedForTests()`, `replaceRecorded` u1..u12 on one way at
    `startedAtMs 1000*n`: `('u1', 1000)` → []; `('u2', 2000)` → ['u1']; `('u12', 12000)` →
    u3..u11 (9, ascending); `('u6', 6000)` → u1..u5 (later rides absent); an
    `ignoredFromRanking` ride is absent.
15. `loadSelfTracksFor` with an explicit one-entry window (memory fs, ramp ride file, Morning):
    returns that one track; with an empty window returns [] without reading the fs (throwing
    fs adapter as in `selfrace_suite.ts:128-136`); `loadSelfTracks('Morning', …)` still returns
    what it did (existing selfrace tests cover it — just run them).
16. `loadReplayRider`: memory fs + ramp ride on Morning → non-null with the same `startMs` as a
    direct `buildReplayRider`; missing file → null; unknown wayId → null; a corrupt file
    (`'not json\n'`) → null, no throw.

`ReplayScreen.tsx` and the RideDetail swap are RN — not headless-testable, as every screen
here; the on-device checklist is their test.

## Verification (executor runs all; report the actual numbers)

```
cd app && node --experimental-strip-types tests/run.ts     # 0 FAIL; count goes up by the new tests
cd app && ./node_modules/.bin/tsc --noEmit                  # clean, exit 0
```

Baseline (cycle13, 2026-09-24): 638 tests, 635 pass, 0 fail, 3 skip. Record before/after
counts. If `tsc` blows the call budget on this mount, retry once with a longer timeout, then
report — never substitute a syntax-only check without saying so.

## On-device checklist (Nathan, after OTA — not the executor)

1. RIDES → any ride matched to a way → ACTIONS shows **Replay** first. A free/unmatched ride
   shows no Replay. A way's reference ride (the "— ref" card) shows it.
2. Tap Replay: full-screen, the way's line + gates, the dot starts at START and moves along
   where you actually rode; prior rides race as dots (ride 1 of a way: no dots, no `P`);
   the lap clock ticks 10× real time; the strip fills with the same sector colours/times the
   detail screen shows, at the moments you crossed each gate; `P<n>` under the map while
   self dots are on.
3. Smoothness at 10× vs 25× (speed pill) — the whole point of the brief. Say which is smooth
   enough; 5× exists as the other reference point.
4. PAUSE freezes everything and the map becomes pannable; PLAY resumes from the same spot
   with the camera following again. RESTART goes back to START.
5. After the finish the clock runs ~10 ride-seconds more, then pauses; the lap chip shows the
   ride's lap; the status line reads "replay over · P<n> of <m> on this way". PLAY now says
   REPLAY AGAIN.
6. ‹ BACK and the hardware back both return to the SAME ride detail, whose bottom button still
   reads RECORD ANOTHER / BACK TO RIDES / BACK TO ROUTE / BACK TO RESULTS as before.
7. Right after STOP (post-stop detail): Replay is there and replays the ride just recorded
   against the rides that existed before it.
8. SETTINGS toggles honoured: Live map off → no map, pane still plays; Self dots off → no dots,
   no `P`; sector colours off → plain line.
9. DEMO tab: unchanged (still 25×).

## Out of scope

- Scrubbing/seeking, a progress bar, frame stepping.
- Ranking reveal / timing tower inside the replay (the detail underneath has the rank).
- A growing trail behind the rider (the way's line + sector spans tell the story; keeps the
  per-tick work down — decision 5). The ride's full trace stays on the detail screen's map.
- Gate buzz/earcons, red-light dimming (`'stopped'`), heading-up bearing tuning.
- Replaying a free ride (no way, nothing to replay against) or the pre-START approach.
- Any `App.tsx` / `tabNav.tsx` overlay, a RIDES-row shortcut, a RESULTS-board shortcut.
- Changing the DEMO's 25×/33 ms (`OPEN-ITEMS.md` item 7 stays open; the phone check in
  step 3 above is the evidence it wants).
- `STATE.md` / `OPEN-ITEMS.md` / this folder's `README.md` — the coordinator's.

## What this changes on Nathan's phone

Nothing yet — this is a parked brief. Once executed: JS-only (two new `src/ui` files, one
new suite, additive edits to `derive.ts`, `colourModel.ts`, `selfRaceModel.ts`,
`RideDetailScreen.tsx`; no `package.json` change), so it ships to the Preview APK over EAS
Update via `scripts/publish-preview.cmd` — no new numbered build, no reinstall. Nothing
looks different until a ride detail's ACTIONS row gains its Replay button; the DEMO tab and
the live screen are untouched.

## Open questions / assumptions (logged, not blocking)

- **Gate-set drift.** Sector chip times/tiers are the stored result's (derived at that ride's
  `derivedBy.gateSetVersion`); gate crossing MOMENTS are re-derived against the CURRENT gate
  set, the same R4 rule the self dots follow. After a gate edit the chip can flip a moment
  before/after the dot passes the new gate line. Accepted; the alternative (re-deriving the
  sectors too) would show numbers the detail screen doesn't.
- **Window timestamp.** `priorWindowFor` filters on `request.startedAtMs`; from RIDES that is
  the raw index's startMs, a few ms before the session start (`tabNav.tsx:28-31`). Rides are
  minutes apart and the ride itself is excluded by id, so the ms never matter.
- **Ignored/estimated rides.** The as-ridden window uses today's `ranks()` (a ride ignored
  since then is gone; one un-ignored appears). "What existed then" by time, "what ranks" by
  now — same as the live screen would show if the ride were re-ridden today. Not persisted.
- **Auto-play on open** assumed wanted (the tester taps Replay to watch, not to set up).
- **Reference-ride replay** (no stored sectors) shows a neutral strip with no times: honest,
  a little bare. Fine for a first cut.
- **Back-handler ordering** relies on registration order (decision-7 note in file 5). If the
  hardware back ever closes the whole detail instead of the replay, the fix is an
  `onReplayBack` ref checked first in `App.tsx`'s handler — not done here.
- **Roll-out 10 ride-seconds** (1 real second at 10×) is a guess like the demo's 60; one constant.
