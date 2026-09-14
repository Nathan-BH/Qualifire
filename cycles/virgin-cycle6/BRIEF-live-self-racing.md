# BRIEF — Live self-racing: past rides as dots on the live map

**Written 2026-09-14 UTC (Plan tier, fable).** Anchors below were read from the live
`virgin` working tree on 2026-09-14 (staged copies of `colourModel.ts`, `results.ts`,
`store/types.ts`, `storage/types.ts`, `live/engine.ts`, `live/towerSource.ts`,
`ui/liveView.tsx`, `ui/sectorTrailModel.ts`, `ui/wayMapView.tsx`, `ui/RecordScreen.tsx`,
`ui/lastRide.ts`, `STATE.md`). The executor records `git rev-parse HEAD` at start and
re-reads every anchored line before touching it. Executor: Sonnet, stop-on-ambiguity — any
anchor that does not match, any call this brief leaves open, any place where the stored
data turns out to be shaped differently than described here: STOP, report the file, the
line, and what is actually there. Never guess, never rule on it from the coordinator's
chat — it goes to a fresh Fable.

---

## 0. Rulings (the part Nathan should read)

### R1 — What a "self" is

A self is **one specific past ride of this exact way**, replayed as a moving dot along the
route. Its position at any moment is read from that ride's own stored GPS fixes
(`rides/<rideId>.jsonl`, `Fix {lat, lon, tUnixMs}` — append-only, verbatim, D-023) at the
instant `selfStartT + liveElapsed`, where `selfStartT` is the epoch time that ride crossed
the way's START gate and `liveElapsed` is how long ago the live rider crossed the same
gate. Between two fixes the position is linearly interpolated.

**Time, not distance, and START-gate-anchored, not recording-start-anchored.** Reasons:
- A dot ahead of you must mean "that day's me was faster to this point". Only a time
  anchor gives that reading; a distance anchor would put every self on top of you.
- The lap is scored from the START gate (1 % chainage), not from the START button. How
  long you fiddled before the gate is not part of any race. Note this differs from the
  big lap clock, which is anchored at recording start (`realTimebase(session.startedAtMs)`,
  `RecordScreen.tsx:1109`) — that clock is a "whole-ride elapsed" ruling of Nathan's and is
  NOT changed by this brief. The two anchors coexist; only the self dots use the gate.
- Raw fixes, not a projection onto the reference line: D-025's honesty rule already
  places the live rider from the TRUE position (`wayMapView.tsx` header). A self is placed
  the same way. A self that took a detour shows the detour.

Before the live rider crosses START, every self sits parked at its own START-gate crossing
position (state `waiting`). Once the live elapsed exceeds a self's own lap time, that self
freezes at its FINISH-gate crossing position (state `finished`). A self never runs past
its own finish and never appears anywhere its ride was not.

### R2 — Which rides are selfs: exactly the existing window, cap 9

The set of selfs for a live ride on way `W` is **`ghostsFor(W)` from
`app/src/ui/colourModel.ts` (lines 77–79), unchanged**, minus any entry whose ride file
cannot be read (see R3). That function is already "the 9 most recent previous ranked rides
of this way" (`WINDOW_PREV = WINDOW_N - 1 = 9`, D-045 ruling 2), already applies the store's
own `ranks()` filter (estimated/missed laps, tripwire-demoted seeds and rider-ignored rides
never enter), and a live lap not yet stored needs no exclusion (its own doc comment). It is
the same window that colours every sector and ranks every lap. **No new counter, no new
selection rule, no second notion of "recent".** If two surfaces ever disagree on which
rides you are racing, that is a bug by definition.

Consequences on a blank install, which are exactly Nathan's spec:
- Ride 1 on a new way (the reference ride, `Way.referenceRideId`): `ghostsFor` is `[]`
  → **zero selfs**.
- Ride 2: the window is `[ride 1]` → **one self** (necessarily the window-best, so it
  renders purple — see R5).
- Ride k (k ≤ 10): k − 1 selfs. Ride 11 onward: always **nine**.

Nine is the cap because the live ride is the tenth slot of the `WINDOW_N = 10` pool; the
brief deliberately does not add a lower cap or an "N selfs" setting. Nathan's stated reason
for the incremental ramp — seeing 1, then 2, then 3 dots before ever seeing 9 — is
delivered by the window mechanics themselves, at zero extra code, which is precisely why
the feature must reuse the window rather than any new mechanism.

### R3 — A self needs a ride file; archive results are never selfs

`ghostsFor` can return `source: 'archive'` results on a shipped-seed build (Nathan's dev
client with `EXPO_PUBLIC_SEED_MODE=shipped`). Those have sector times but no fixes on this
branch (the GPX archive lives on `main` only). Rule: a window entry whose ride file is
absent or unreadable is **skipped silently** — never interpolated from sector times,
never invented. On `virgin`/Preview (blank seed) every window entry is an `'app'` ride
with a file, so nothing is lost there; the rule exists so the dev client degrades honestly
instead of crashing or fabricating.

### R4 — Gate crossings come from a replay against the CURRENT gate set

A self's `startT`/`finishT` are the epoch times its fixes crossed gate 0 and the last gate
of the way's **current** gate set. They are obtained by replaying the stored fixes through
the same offline derivation the results store already uses (`store/derive.ts`
`deriveRideResult` and/or `resultsStore.backfillMissingResults` — the executor confirms the
exact function, Task 2), with the way's current `TrackSpec` (`live/tracks.ts`). Not from
the GPX+events sidecar: the sidecar's `GateFireEvent`s were recorded against whatever gate
set existed that day, and gates can be re-adjusted since (`gateSetVersion`). Results are
already recomputed when stale by gate-set version (`results.ts` `isStale`); selfs follow the
same principle. Cache self tracks in memory keyed by `(rideId, gateSetVersion)`.

An `estimated` (gap-derived) START crossing is still a time and is used. A ride with no
START crossing at all cannot be in `ghostsFor` (its lap is `missed`), so the case does not
arise; if it somehow does, skip the self.

### R5 — Visual starting rule (Nathan adjusts by eye; not a hard spec)

- Self dot: circle radius **5** (rider is 7), fill = the theme's neutral ink at ~55 %
  opacity, 1 px white stroke. All selfs identical except:
- **The window-best self** (lowest `scoredS(lap)` among the selfs — the same lap that sets
  the purple bar) renders **purple** (`chips.tsx`'s `tierLineColour('purple')` or the
  equivalent token — executor anchors it), full opacity: the one to beat.
- `finished` selfs drop to ~35 % opacity. `waiting` selfs render like racing ones.
- No text labels, no rank numbers on dots, **no gap/delta text anywhere** — the live pane's
  standing rule ("no target/benchmark/delta anywhere near the clock", `liveView.tsx` header) is
  untouched. Nine labelled dots on a heading-up crop would be clutter.
- The rider dot is unchanged (riderBlue, radius 7, on/off-route inversion) and **always
  paints above the selfs** (mount-order rule, Task 4).

Every number above is a starting point. The Report Back must include a screenshot or a
description precise enough for Nathan to ask for changes; do not spend tokens polishing
before he has seen it.

### R6 — Naming: "self", never "ghost"

In this codebase `ghost` already means an archive-seeded result (`TowerRow.ghost`,
`store/types.ts:159`; `tower()` in `results.ts:115`; `GHOSTS` in `colourModel.ts:59`;
STATE.md's "0 ghosts"). Reusing the word for a moving dot would make every grep ambiguous.
New code, props, types, settings keys and docs say **self / selfs / selfDots /
SelfTrack / selfRaceModel**. `ghostsFor` keeps its name (it is not this cycle's to rename).

### R7 — Timing mode: raw wall-clock elapsed, in both modes, for v1

SETTINGS → Timing (`store/timing.ts`, `'raw' | 'moving'`) changes how laps are *scored*.
Self positioning uses raw elapsed regardless. A dot is where past-you physically was at
that elapsed wall time; "moving-time selfs" would mean pausing nine dots whenever the live
rider stops, which is a different feature. Which self is purple still follows `scoredS`,
i.e. the active mode, so the purple dot always agrees with the colour model. Logged as a
known limit in the cycle README; `QUESTIONS.md` Q3.

### R8 — Ground rule and vocabulary updates are in scope

STATE.md's live-screen ground rule ("reference line + own position only") is overridden by
Nathan's request. Task 7 edits STATE.md, GLOSSARY.md and OPEN-ITEMS.md — small, anchored
edits, in the same commit as the code so the docs never describe an unbuilt feature or
omit a built one.

### R9 — Out of scope (do not build, do not ask)

DEMO-tab selfs; a GPS simulator; an off-screen "ahead/behind" edge indicator; per-self
labels or a legend; selfs on the ride-detail (post-ride) map; free-mode selfs (no single
way); anything on the PNG rung; renaming `ghostsFor`.

---

## 1. Rules

- Touch only: `app/src/live/engine.ts` (one additive state field), `app/src/ui/wayMapView.tsx`
  (one additive prop + one always-mounted source), `app/src/ui/RecordScreen.tsx` (wiring),
  `app/src/ui/settings.tsx` + wherever the settings model lives (one toggle — executor
  anchors it from the existing `sectorColours` toggle), `app/src/store/derive.ts` or a new
  sibling (self-track derivation), the new `app/src/ui/selfRaceModel.ts`, the new
  `app/tests/selfrace_suite.ts`, `app/tests/run.ts` (registration), `STATE.md`,
  `GLOSSARY.md`, `OPEN-ITEMS.md`, and this cycle folder.
- Never edit `IDEAS.md`, `CLAUDE.md`, `Nathan/`, anything under `cycles/virgin-cycle1..5/`,
  `app/core/` (the parity-proven engine arithmetic — R4's replay *calls* it, never changes
  it).
- Never delete. `mv` to `safe_to_delete/` only. `git add <path>` by name, never `-A`/`.`.
  Every git command with `GIT_OPTIONAL_LOCKS=0`; a stray `.git/*.lock` gets `mv`'d aside.
- New modules follow the house pattern of `sectorTrailModel.ts` / `colourModel.ts`: **pure,
  no React, no expo, no react-native imports**, headless-testable, `.ts` imports with
  explicit extensions where the neighbours use them.
- Every additive field/prop is optional with a documented default so nothing that exists
  today changes behaviour when the new thing is absent (D-023 discipline).
- Stop-on-ambiguity applies to every "confirm" and "find" step below. Report verbatim.
- Nothing is done because it compiles. Each task ends with the check that proves it.

---

## 2. Task 0 — Look for prior art before building (time-boxed)

Nathan remembers this idea from `main`. It may have been built, prototyped, or only
logged. Spend at most one focused pass:

```
GIT_OPTIONAL_LOCKS=0 git grep -n -i -E "ghost dot|self dot|selfs|race (against|your)|replay.*dot" main -- app/src app/core product IDEAS.md
GIT_OPTIONAL_LOCKS=0 git show main:product/BACKLOG.md | grep -n -i -E "ghost|self|replay|race"
GIT_OPTIONAL_LOCKS=0 git show main:product/DECISIONS.md | grep -n -i -E "ghost|self|replay|race"
GIT_OPTIONAL_LOCKS=0 git grep -n -i -E "ghost|self|replay|race" virgin -- app/src app/core/src IDEAS.md
```

Expected: hits for "ghost" in the archive-seed sense (R6) and possibly a backlog/idea
entry; possibly nothing else. Record what you found in the Report Back. **If you find an
actual implementation** (a moving-dot replay component, a self/ghost position model),
STOP and report its path and shape before writing any new code — porting is cheaper than
reinventing, and the decision to port is a Fable call. If you find only ideas/backlog
text, quote it in the report and proceed.

Also confirm the two facts this brief relies on and report them as found:

- `app/src/ui/colourModel.ts` lines 77–79 read:
  ```
  export function ghostsFor(wayId: string, excludeRideId?: string): RideResult[] {
    return rankedFor(wayId).filter((r) => r.rideId !== excludeRideId).slice(-WINDOW_PREV);
  }
  ```
- `app/src/ui/wayMapView.tsx` lines 787–801 are the `showRider && here` block mounting
  `<M.GeoJSONSource key="rider" id="rider" …>` with `<M.Layer id="rider-dot" type="circle" …>`
  at `'circle-radius': 7`, and the comment block at lines 489–496 states the mount-order rule
  ("maplibre-react-native adds layers in MOUNT order, not JSX order … an always-mounted
  source … avoiding that z-stacking bug").

Any mismatch → STOP.

## 3. Task 1 — `app/src/ui/selfRaceModel.ts` (pure model)

Create the module with this public surface (names are binding; internals are yours):

```ts
/** One past ride of a way, ready to replay. Fixes ascending by tUnixMs, preStart/warmup
 *  fixes already excluded, decimated (see loader). Times in epoch MILLISECONDS. */
export interface SelfTrack {
  rideId: string;
  /** epoch ms this ride crossed gate 0 of the way's CURRENT gate set */
  startMs: number;
  /** epoch ms it crossed the last gate; the dot freezes here */
  finishMs: number;
  /** scored lap seconds (store/timing.ts scoredS) — decides which self is "best" */
  lapS: number;
  fixes: readonly { tUnixMs: number; lat: number; lon: number }[];
}

export type SelfState = 'waiting' | 'racing' | 'finished';

export interface SelfDot { rideId: string; lat: number; lon: number; state: SelfState; best: boolean }

/** Position of one self at live elapsed `elapsedMs` since the live START crossing.
 *  elapsedMs === null (live rider not yet through START) → 'waiting' at the startMs fix.
 *  elapsedMs >= finishMs - startMs → 'finished' at the finishMs fix. Otherwise linear
 *  interpolation between the two fixes bracketing startMs + elapsedMs (binary search). */
export function selfPositionAt(track: SelfTrack, elapsedMs: number | null): { lat: number; lon: number; state: SelfState };

/** All dots for the frame. `best` = the track with the lowest lapS (ties: earliest rideId
 *  in the array). Tracks with < 2 fixes or finishMs <= startMs are dropped, never drawn. */
export function selfDotsAt(tracks: readonly SelfTrack[], elapsedMs: number | null): SelfDot[];

/** GeoJSON FeatureCollection of Point features, properties {rideId, state, best}. Same
 *  shape convention as wayMapGeo.ts's builders; consumed by WayMapView's selfs source. */
export function selfsFeatureCollection(dots: readonly SelfDot[]): GeoJSON.FeatureCollection;
```

Note the unit trap: `Fix.tUnixMs` is milliseconds, but engine `GateEvent.time`/`t` is epoch
**seconds** (`storage/types.ts:181`, `engine.ts:253`). Convert once, in the loader (Task 2),
and keep this module in ms throughout. A test must cover a gate time given in seconds
producing the right ms (Task 6).

## 4. Task 2 — Self-track loader (ride file → `SelfTrack`)

Find the offline derivation the results store uses for rides recorded before the store
existed: start at `app/src/ui/lastRide.ts:275` (`resultsStore.backfillMissingResults(fs,
endedIds, …)`) and follow it into `app/src/store/resultsStore.ts` / `app/src/store/derive.ts`.
Confirm and report:

1. The function that reads a ride file and replays its fixes through the engine to produce
   sector times (expected: `deriveRideResult` in `store/derive.ts`, or a caller of it).
2. Whether that replay exposes the per-gate crossing times (`GateEvent.time`, epoch s) or
   only the reduced `SectorResult`s. If only sectors: add a **sibling** pure function next
   to it (do not change `deriveRideResult`'s signature or output) that runs the same replay
   with the way's current `TrackSpec` and returns `{ startS: number | null; finishS: number
   | null }` for gate 0 and the last gate, `estimated` crossings included. Reuse the same
   engine/projector calls the existing derivation uses — no new geometry code.
3. How a ride file is read by id (`storage/index.ts` / `storage/core.ts` — `decodeRideFile`
   and the fs adapter; the executor anchors the exact call).

Then write `loadSelfTracks(wayId: string, gateSetVersion: number, fs): Promise<SelfTrack[]>`
(place it in `store/` beside the derivation, or in `selfRaceModel.ts` if it can stay pure
by taking the reader as a parameter — prefer the latter, injected reader, same pattern as
`initRideHistory(fs)`):

- Input set = `ghostsFor(wayId)` (R2). For each result with `source === 'app'`: read the
  ride file; if absent/unreadable/`fixes.length < 2` → skip (R3), count it in a debug log
  line, never throw.
- Drop fixes flagged `preStart` or `warmup` (`storage/types.ts:19,24`), sort ascending by
  `tUnixMs` (chronological, not on-disk order — cycle2 WP-B's rule).
- Replay → `startS`/`finishS`; either null → skip. Convert to ms.
- Keep only fixes with `startMs - 5000 <= tUnixMs <= finishMs + 5000`, then decimate so
  consecutive kept fixes are ≥ 2 s apart (keep first and last of the range). Nine
  30-minute rides at 1 Hz would otherwise be ~16k points held for the whole ride.
- `lapS = scoredS(result.lap)` (never null for a ranked result — `ranks()` guarantees it).
- Cache by `${rideId}:${gateSetVersion}` in a module-level Map; `loadSelfTracks` returns
  cached entries without re-reading.

Stop-on-ambiguity triggers here: the replay needs something not available offline; the
ride file's fix shape differs from `storage/types.ts`'s `Fix`; there is no way to get the
way's current `TrackSpec` outside the live engine. Report, don't improvise.

## 5. Task 3 — `LiveEngineState.startGateT` (additive)

The live engine state (`app/src/live/engine.ts:297–335`) exposes `sectors`, `lastDone`,
`lap`, `gateFires` but not *when* the displayed candidate crossed gate 0. Add exactly one
optional field:

```ts
  /** virgin-cycle6 (self racing): epoch SECONDS the displayed candidate (`track`) crossed
   *  gate 0, estimated crossings included; null before that crossing, in free mode, and
   *  whenever `track` is null. Read-only mirror of that candidate's own gate-0 event —
   *  never feeds any timing arithmetic. */
  startGateT: number | null;
```

Populate it wherever the state snapshot is built from the displayed candidate's `events:
GateEvent[]` (the same place `sectors`/`lastDone` are derived — find it; report the
function name and line). Value = the gate-0 event's time if present, else null. It must
change only when the displayed candidate changes or its gate-0 event appears. Every
existing test must still pass unchanged; any test that constructs a `LiveEngineState`
literal and now fails `tsc` gets the field added as `startGateT: null` — list each such
edit in the report.

If the displayed candidate's gate events are not reachable from the snapshot code
(e.g. only the sector reduction survives), STOP and report; the fallback (RecordScreen
subscribing to `EngineEvent`s and tracking gate 0 per track) is a Fable decision.

## 6. Task 4 — `WayMapView` `selfs` prop (MapLibre rung only)

In `app/src/ui/wayMapView.tsx`:

1. Add to `WayMapProps` (after `trail`, before `gateSelect`):
   ```ts
   /** virgin-cycle6: past rides of this way replayed as dots (selfRaceModel.ts). Drawn
    *  by the MapLibre rung only, BELOW the rider dot (mount order). undefined/[] = the
    *  source still mounts, empty. The PNG rung ignores it (accepted degradation, same as
    *  sectorColours). */
   selfs?: readonly SelfDot[];
   ```
2. Add an always-mounted, possibly-empty `selfsFC` `useMemo` next to `trailFC`
   (lines 497–501), computed unconditionally for the same Rules-of-Hooks reason its
   neighbours cite, and mount its `<M.GeoJSONSource key="selfs" id="selfs" …>` **in JSX
   before the `showRider && here` rider block at line 787** so it claims its mount slot
   under the rider dot. Do not make it conditional on `props.selfs` — the comment block at
   489–496 explains why a conditional source would paint over the rider.
3. One `<M.Layer id="self-dot" type="circle">` with data-driven paint per R5:
   `circle-radius` 5; `circle-color` = purple when `['get','best']` else the neutral ink
   token; `circle-opacity` 1 / 0.55 / 0.35 for best / racing-or-waiting / finished;
   `circle-stroke-color` `#FFFFFF`, `circle-stroke-width` 1. Take colour tokens from the
   same place the rider layer takes `colors.riderBlue`; report which token you used for
   purple and for neutral ink.
4. `PngWayMap`: no change beyond accepting the prop (TypeScript only).

Check: with `selfs` omitted every existing surface renders identically (the empty source
draws nothing). Confirm by reading, and by the suite.

## 7. Task 5 — `RecordScreen` wiring + `selfDots` setting

1. **Setting.** Find how `settings.sectorColours` (WP-K) is declared, defaulted, persisted
   and toggled in SETTINGS (`app/src/ui/settings.tsx` and the settings model it imports).
   Mirror it exactly for `selfDots: boolean`, default `true`, label "Race your past rides",
   tap-to-reveal "?" text: "Your previous rides of this route move along the map as small
   dots, timed from the START gate. The purple one is your best of the last nine." Place it
   directly under `sectorColours`.
2. **Load.** In the running-phase code of `RecordScreen.tsx`, when `live.track` becomes
   non-null and `live.mode === 'route'` and `settings.selfDots`, call `loadSelfTracks(
   live.track, <current gateSetVersion of that way>, fs)` fire-and-forget (same discipline as
   `initRideHistory`'s backfill: never blocks, never throws into the screen), store the
   result in state. Re-run if `live.track` changes (a soft lock can move — `LockKind` doc,
   `engine.ts:200–205`). Clear on ride end / unmount. Where the gate-set version comes from:
   the same lookup `sectorColours`'s history callback uses to find the way — anchor it.
3. **Tick.** A `setInterval` at **250 ms** while `phase === 'running'` computes
   `elapsedMs = live.startGateT === null ? null : Date.now() - live.startGateT * 1000`
   and `selfDotsAt(tracks, elapsedMs)` into state. Not 10 Hz — the rider dot itself only
   moves per GPS fix; four frames a second is smooth enough for a 5 px dot and keeps the
   map re-render cheap. Skip the interval entirely when `tracks.length === 0`.
4. **Render.** Pass `selfs={settings.selfDots ? selfDots : undefined}` to the running-phase
   `<WayMapView>` at lines 1082–1096 (the one with `sectorColours={sectorColours}` and
   `fill`). Not to the prestart map (line ~974) and not to the finished map (~1240): before
   the lock there is no way; after STOP the ride is over.
5. Free mode (`live.mode === 'free'`): never load, never pass (R9).

## 8. Task 6 — Tests: `app/tests/selfrace_suite.ts`

Register it in `app/tests/run.ts` the way `sectortrail_suite.ts` is registered (anchor the
exact list). Cases, each named so a failure reads as a sentence:

- **Unlock progression.** Using the results store API the colour-model tests already use
  (`resetRecorded`, `pushRecorded`/`rememberRide` or direct `RideResult` literals — mirror
  whatever `tests/colourmodel*` or `tests/sectortrail_suite.ts` does), store N = 0, 1, 2, 9,
  10, 12 ranked `'app'` results on one way and assert `ghostsFor(way).length` is
  0, 1, 2, 9, 9, 9. Then the same with one `ignoredFromRanking: true` ride and one
  `lap.quality: 'estimated'` ride among them → both excluded. This is the R2 contract;
  it also documents ride 1 → zero selfs.
- **Archive excluded.** A `source: 'archive'` entry in the window yields no track from
  the loader (inject a reader that would throw if called for it).
- **Interpolation.** A synthetic `SelfTrack` with fixes at t = 0, 10 s, 20 s along a
  straight line: `selfPositionAt(track, 5000)` is the midpoint of the first pair, state
  `racing`; `elapsedMs = null` → the `startMs` fix, `waiting`; `elapsedMs` beyond
  `finishMs - startMs` → the `finishMs` fix, `finished`; a negative elapsed (clock skew)
  → `waiting`.
- **Best flag.** Three tracks with `lapS` 600/580/610 → only the 580 one is `best`; a tie
  picks exactly one.
- **Seconds→ms.** The loader's conversion: a gate crossing at `1_700_000_000.5` s becomes
  `1_700_000_000_500` ms and the fix range filter uses ms.
- **Decimation.** 1 Hz fixes over 60 s → kept count ≤ 31 and includes first and last.
- **Engine field.** Feed the existing engine fixture (`tests/lib.ts`'s `fixtureSpecs()` and
  whichever suite already drives a lock + gate fires) and assert `startGateT` is null before
  the gate-0 fire and equals that fire's `t` after; in free mode it stays null.

Zero FAIL on the whole suite, not just this file.

## 9. Task 7 — Docs (same commit as the code)

Small anchored edits; re-read each target line first.

- `STATE.md`, ground rule "**The live ride screen shows a real map** (MapLibre +
  OpenFreeMap), heading-up, locked zoom, no pan/zoom while moving, reference line + own
  position only." → append: "**Since virgin-cycle6, plus self dots:** the way's
  comparison window (`ghostsFor`, ≤ 9 rides) replayed from their own fixes, timed from the
  START gate; toggle `selfDots`. The reference ride races nobody; ride k races k − 1, capped
  at 9." Also add one bullet under "Where the app actually is" naming the files, and a
  `cycles/virgin-cycle6/README.md` pointer line under "Cycle history".
- `GLOSSARY.md`: add **self** ("one of your own past rides of a way, replayed as a dot on
  the live map — not a *ghost*, which is an archive-seeded result") — insert in
  alphabetical position; if the glossary has a "ghost" entry, cross-reference it.
- `OPEN-ITEMS.md`: add the on-device progression check (Task 8) as an item that only a
  phone can close, and the three `QUESTIONS.md` items as parked-until-seen.

## 10. Task 8 — On-device plan (Nathan's, written into the report)

There is no GPS simulator in the app (checked: no `simulat|mock|fake` fix feeder under
`app/src`) and this cycle does not add one. The headless suite proves the model; the
progression is proven on a phone by riding. Put this checklist verbatim in the Report Back
and in OPEN-ITEMS.md:

1. Blank install (or SETTINGS → DATA → Reset to virgin). Name a sport. Ride a short loop
   or any route; at STOP name the endpoints → way created, ride 1 = reference.
   **Expect: no self dots at any point of ride 1.**
2. Ride 2 of the same way. **Expect: one purple dot** parked at the START gate until you
   cross it, then moving; it finishes where you finished last time.
3. Ride 3. **Expect: two dots, one purple.** Confirm the purple one is the faster of the
   two (RESULTS tab ranks them).
4. Keep going as convenient; at ride 11 **expect nine dots, never ten**.
5. Toggle `selfDots` off mid-ride → dots vanish next frame; on → back within a second.
6. Note anything about size/colour/opacity to adjust (R5 is a starting point).

---

## 11. Verify, then commit

1. `cd app && node --experimental-strip-types tests/run.ts` → zero FAIL; record the totals
   (baseline 560 / 557 / 0 / 3 per STATE.md; the new suite adds cases — report the delta).
2. `cd app && ./node_modules/.bin/tsc --noEmit` → exit 0. Not bare `npx tsc` (mount budget).
3. Re-read `git diff --stat`: only the files in §1 Rules. Anything else → STOP.
4. Commit by name. Message:

```
virgin-cycle6: live self-racing — past rides as dots on the live map

Every ride in the way's existing comparison window (colourModel.ghostsFor,
<= 9) is replayed from its own stored fixes as a small dot on the live map,
timed from the START gate against the live rider's START crossing. Ride 1 of
a way races nobody; ride k races k-1; capped at nine. Window-best self is
purple. New pure selfRaceModel.ts + loader + tests; additive
LiveEngineState.startGateT; WayMapView `selfs` source mounted under the
rider dot; SETTINGS selfDots toggle (default on). STATE/GLOSSARY/OPEN-ITEMS
updated. PNG rung, DEMO tab and free mode untouched by design.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011aysFvUNuo51UHmmGeHVyK
```

Push is expected to fail from this device (403 from the proxy, cycle5 precedent) — say so,
do not retry more than once.

---

## 12. Report back

In this order, verbatim where asked:

1. HEAD at start and the commit hash at end.
2. Task 0 findings: what `main` had (quoted), and the two anchor confirmations.
3. Task 2 findings: the derivation function name/line, whether gate times were already
   exposed, and the exact reader call used.
4. Task 3: the snapshot function that now sets `startGateT`, and every test literal edited.
5. Tokens used (this tier), the tier/model/tokens/outcome table for the coordinator.
6. Test totals before/after; `tsc` result.
7. The on-device checklist (Task 8) and a plain-language description of what the dots
   look like with the R5 defaults, so Nathan can react before riding.
8. Every STOP you hit and did not resolve (there should be none you resolved yourself).
