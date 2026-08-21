# WP-B — Free-ride "new" mode (Nathan's notes, 2026-08-20)

**Executor model: Sonnet. You see ONLY this brief. STOP AND ESCALATE on anything it does not pre-resolve. Requires WP-D1 + WP-D2 landed (catalog-driven engine candidates, `TrackSpec`/`EngineStartOptions` exist). Coordinator sequences this after WP-A's RECORD/RIDES/RESULT redesign if both run this cycle (shared files).**

## Goal, in Nathan's words (verbatim from his 2026-08-20 notes)

"Under the start (pick one) and going to options of the RECORD tab there should be new landmarks which are called 'new'. So I have the option to go from work>>new for example, or from new>>home. When this option is picked then the map should switch to a gates only version. So all the gates just on the map and gates will get auto picked up if I cross them. In this way I can still enjoy logging sectors when my ride overlaps with known routes. Whats important is in this mode the sectors can be logged during the ride and the sector times can be saved in a separate category called free rides. This way the sector times from fixed routes are not polluted by the free rides."

## Environment & rules (binding)

- Repo on Nathan's PC `C:\Users\natha\Claude personal projects\Qualifire\` = `$HOME/mnt/Qualifire/`. Cloud sandbox has NO npm/PyPI. No git. No repo writes until the coordinator green-lights.
- Tests pure: `cd app && node --experimental-strip-types tests/run.ts`; `npx.cmd tsc --noEmit` via device_bash on the PC. Re-baseline first.
- D-042: raw time is the truth by default — free-ride sector times are RAW, full stop. D-025 mode-consistency: a free-ride time must NEVER enter a fixed-route comparison set. D-013: no colour a time hasn't earned — free sectors are never coloured (there is no comparable history for a free ride by construction). D-023: nothing here touches the raw ride JSONL; the ride records exactly as today.
- Nathan-facing language: plain words, no bare B-NN/D-NN ids.

## Current state (verified in code 2026-08-20, post-WP-D2 expectations noted)

- `app/src/ui/RecordScreen.tsx`: idle screen builds `startable` landmark pills from `catalog.seed.json` (line 321, 535–553: STARTING FROM / GOING TO rows), way lookup line 333, §8a route pills 554–571, `onStart` calls `startTracking({routePick})` (WP-D2). When no way matches, sub text says "no route known for this pair yet — the ride records, but nothing is scored" (line 574).
- `app/src/live/engine.ts` (post-WP-D2): `LiveEngine(specs?: TrackSpec[])` defaults to `catalogTrackSpecs()` (all 20 routes); `start(opts?: EngineStartOptions)` with `pickId`; candidates run `LiveProjector` (forward-only, 40 m corridor) + `GateDetector(gates, armWithinM)`; pre-lock/losing candidates keep their gate events silently; only the locked candidate's fires are emitted (buzz + GPX+ sidecar hang off emitted events and the `gateFires` counter).
- `app/core/src/live.ts`: `GateDetector` constructor takes `armWithinM` (default 50) — with `armWithinM = 0` a first fix past a gate marks it skipped instead of firing it 'estimated' (D-016(b) arming disabled); mid-ride gap-recovered fires can still carry `estimated: true` via the shaky-bracket rule (EST_GAP_S/EST_JUMP_M).
- `app/src/ui/routeMapView.tsx`: `RouteMapView` renders one route's line + gates (MapLibre rung; PNG fallback rung); returns null when the asset is missing; `gateColours` colours crossed gates; OFF ROUTE badge from `offRouteM > 120`.
- `app/src/ui/routeMapGeo.ts`: pure GeoJSON builders (`gatesFeatureCollection` per asset; [lat,lon]→[lon,lat] swap is CRITICAL).
- `app/src/ui/lastRide.ts`: `rememberRide(state)` → `FinishedRide` + `pushRecorded` into the comparison window, persisted to `results-cache.json` (B-40 pattern: FsAdapter injection, `initRecordedPersistence`, write-tail serialization, tolerant decode, `resetRecordedForTests`). A state with `track === null || lap === null` just clears `last` — free rides will land in their own module instead.
- `app/src/ui/ResultScreen.tsx`: renders `getLastRide()` or a ghost stand-in.
- `app/App.tsx` line 87: `initRecordedPersistence(createExpoFsAdapter())` at boot.
- `app/src/location/index.ts`: `startTracking(opts)` → `liveEngine.start(...)`; module-scope buzz on `gateFires` increase; sidecar writes emitted `gate` events (kind allow-list in `app/src/storage/eventsJsonl.ts` includes 'gate').

## Design (pre-resolved — implement exactly this)

### 1. Engine free mode (`app/src/live/engine.ts`)

- `EngineStartOptions` gains `mode?: 'route' | 'free'` (default 'route'). `LiveEngineState` gains `mode` and `freeCrossings: { routeId: string; gateIndex: number; t: number; estimated: boolean }[]` and `freeSectors: { routeId: string; index: number; rawS: number }[]` (both empty in route mode).
- `start({mode:'free'})`: candidates built as usual but every `GateDetector` constructed with `armWithinM = 0` (crossings only, no arming fires — a free ride can begin anywhere, so "you were already past this gate" must never invent a fire). Lock evaluation is SKIPPED entirely: phase stays `'detecting'`, `lockKind` stays `'none'`, no lock events, no `finalize()` arbitration (finalize is a no-op in free mode), no switch logic.
- On each fix, any candidate's returned events are appended to `freeCrossings` and EMITTED as `{type:'gate', track: candidate id, …}` (so the buzz and the GPX+ sidecar work unchanged — one buzz per state emit even if two overlapping routes' gates fire on the same fix, which is correct: one physical crossing). `gateFires` = `freeCrossings.length`.
- `freeSectors` derivation (in `recompute()`-free fashion, incremental): when a crossing arrives with `gateIndex k ≥ 1` and the SAME candidate's previous crossing in this ride was `k−1` and BOTH are `estimated === false`, append `{routeId, index: k, rawS: t_k − t_{k−1}}`. Estimated crossings never bound a free sector (honesty: interpolated numbers stay out). Raw only — no movingS, no stoppedS, no colour, ever (default timing is raw; a free ride has no comparable history by construction).
- `sectors`/`lap`/`currentSector` stay in their idle shapes (empty/пending/null) in free mode. Perf: all 20 candidates for the whole ride ≈ 10k flops/s (same arithmetic as the detection phase WP-D2 justified) — negligible; note it in the header comment.

### 2. RECORD tab (`app/src/ui/RecordScreen.tsx`)

- A pseudo-landmark id `'~new'`, label `new`, appended as one extra pill to BOTH the STARTING FROM and GOING TO rows (it is NOT in the catalog — the catalog validator forbids overlapping/coordinate-less landmarks, and "new" is not a place; keep it a UI constant `const NEW_ID = '~new'`).
- `freeRide = fromId === NEW_ID || to === NEW_ID`. In auto start-mode the detected landmark still wins for FROM; tapping the `new` pill sets `from` manually (existing pill mechanics).
- When `freeRide`: hide the WHICH ROUTE TODAY? row; sub text: `free ride — gates from your known routes fire as you cross them; sector times are saved under "free rides", separate from your route history`; `onStart` → `startTracking({ routePick: null, mode: 'free' })` (thread `mode` through `startTracking` → `liveEngine.start` — one optional field, mirroring WP-D2's `routePick`).
- Race column when `live.mode === 'free'`: keep the map (see 3) and the big lap clock (`LiveSectorPane` with the engine state — its strip renders nothing because `sectors` is empty; verify `viewModelFromEngine` handles that; if it throws, guard with a minimal vm: clock only). Below the status line, render a compact scrollable list of `freeSectors` (most recent first): `«routeLabel(routeId)» S«index» — «fmt(rawS,1)»` in plain ink (no tier colours), plus a counter line `«freeCrossings.length» gates crossed`. Status line in free mode: replace the route line with `free ride · gates only`.

### 3. Gates-only map (`app/src/ui/routeMapView.tsx` + `app/src/ui/routeMapGeo.ts`)

- `routeMapGeo.ts`: new pure builder `allGatesFeatureCollection(assets: Record<string, RouteAsset>, crossed?: { routeId: string; gateIndex: number }[])` — one Point feature per gate of EVERY route, properties `{ name, routeId, colour? }` where `colour` (the existing `['has','colour']` paint convention) is set ONLY for crossed gates, to the neutral brand yellow (`colors.neutral` passed in by the caller as a string — keep this module colour-agnostic: accept `crossedColour: string`). Crossed = membership in the `crossed` list. Dedupe nothing — overlapping routes legitimately show two gates a few metres apart.
- `RouteMapView` new props: `gatesOnly?: boolean` and `crossedGates?: { routeId: string; gateIndex: number }[]`. When `gatesOnly` on the MapLibre rung: no route line source, gates source = `allGatesFeatureCollection(ASSETS, crossedGates, colors.neutral)`, rider dot always the normal colour, OFF ROUTE badge suppressed (there is no route to be off), camera follows the rider (`follow` default; FIT fits the bounds of ALL gates), labels/dim/bearing behaviour as the existing live variant. The `!asset → return null` guard must not fire in gatesOnly mode (skip the per-route asset lookup). PNG rung with `gatesOnly`: render the frame with the badge text `gates map needs the tile map` and the rider-less credit — the PNG compositor is per-route and cannot honestly draw a 20-route gate field (the phone runs MapLibre since build 4; this rung is the degraded fallback only).
- RecordScreen passes `gatesOnly={live.mode==='free'} crossedGates={live.freeCrossings}` in free mode (routeId prop null).

### 4. Free-ride storage (`app/src/store/freeRides.ts` — NEW, + `app/App.tsx` init)

Mirror `lastRide.ts`'s B-40 persistence pattern exactly (FsAdapter injection; serialized write tail; tolerant decode that drops malformed entries; init never throws; reset-for-tests):

```ts
export const FREE_RIDES_CACHE_FILE = 'free-rides-cache.json';
export interface FreeRideRecord {
  kind: 'freeRide'; schemaVersion: 1; rideId: string; startedAtMs: number;
  crossings: { routeId: string; gateIndex: number; t: number; estimated: boolean }[];
  sectors: { routeId: string; index: number; rawS: number }[];
}
export function rememberFreeRide(st: LiveEngineState): void;   // no-op unless st.mode==='free' && crossings.length>0
export function freeRideResults(): FreeRideRecord[];
export function lastFreeRide(): FreeRideRecord | null;
export function initFreeRidePersistence(fs: FsAdapter): Promise<void>;
export function resetFreeRidesForTests(): void;
```
`rideId = 'free:'+startedAtMs`. **This module is the ONLY writer/reader of free-ride times. Nothing in `colourModel.ts`, `lastRide.ts`, `results.ts` or the seed may import it** — that structural isolation IS the "separate category that never pollutes fixed-route comparison sets" (mode-consistency rule). Add that sentence to the header comment.
- `RecordScreen.onEnd`: in free mode call `rememberFreeRide(liveEngine.getState())` (and still `rememberRide(...)` — which harmlessly clears `last` since `track` is null; that is desired: the Result board must not show a stale route ride as "the ride you just finished").
- `App.tsx`: `initFreeRidePersistence(createExpoFsAdapter())` alongside the existing `initRecordedPersistence` (same fire-and-forget shape, line 87 area).

### 5. RESULT tab (`app/src/ui/ResultScreen.tsx`)

At the top of the component: `const free = lastFreeRide();` — if `free` exists and (`getLastRide()` is null or `free.startedAtMs > ride.atMs`), render the FREE RIDE board instead of the route board: heading `FREE RIDE`, the date, `«crossings.length» gates crossed`, then one plain-ink row per `sectors` entry (`«routeLabel(routeId)» S«index» — «fmt(rawS,1)» raw`), and the footer: `Free-ride sector times live in their own category — they never mix into a route's history, so your route comparisons stay clean.` No tower, no ranks, no colours (nothing here has comparable history, and free times must not be compared to route times).

### 6. RIDES tab — seam only

`RidesScreen.tsx` lists raw stored rides (date/duration/fix count) and is being redesigned by another work package this cycle. Do NOT edit it. Leave a one-line comment in `freeRides.ts`: the ride-history redesign labels a ride "free ride" by matching `freeRideResults()` rideIds/timestamps.

### 7. Mockup (CLAUDE.md rule: regenerate with any shipped design change)

`demos/mockup.html` must gain: the `new` pill in both pick rows and a scripted free-ride race state (gates-only map placeholder + free sector list). If the RECORD/RIDES/RESULT mockup redesign (the other work package) has not landed when you start, STOP and ask the coordinator for sequencing rather than editing the old mockup.

## Tests

`app/tests/live_suite.ts` (+3):
1. `free mode: clean_morning fixes, full catalog — crossings, no lock, no arming fires` — drive a default-spec engine with `start({mode:'free'})` over the clean_morning fixture: phase never 'locked', zero lock events; crossings include all 5 Morning gates with `estimated:false` AND HomeStationPreferred's first gates (shared road — measured 98% corridor overlap); `freeSectors` contains Morning S1..S4 with rawS equal (±2e-6) to the differences of the Morning crossing times; no `freeSectors` entry is bounded by an estimated crossing; `gateFires === freeCrossings.length`.
2. `free mode: stationary doorstep ride (real export qualifire-20260815-0024.gpx) — zero crossings, zero events` (mirror of the existing stationary test, in free mode).
3. `free mode: sectors/lap stay idle` — same drive as 1: `sectors` empty or all-pending, `lap === null`, `finalize()` is a no-op (state unchanged).

`app/tests/live_colour_suite.ts` (+2):
4. `free rides never pollute route history` — `resetRecordedForTests` + `resetFreeRidesForTests`; capture `ghostsFor('Morning').length` and `lapValues('Morning')`; `rememberFreeRide` a synthetic free state with Morning crossings; assert both are UNCHANGED and `recordedResults()` is empty; `freeRideResults().length === 1`.
5. `free-ride cache round-trip` — encode/decode a record through the module's persistence with a fake in-memory FsAdapter (pattern: `results_cache_suite.ts`); corrupt line dropped, valid kept; `initFreeRidePersistence` idempotent (dedupe by rideId).

Expected: +5 tests, 0 FAIL, no new skips, no existing test edits.

## Verification

1. `cd app && node --experimental-strip-types tests/run.ts` — zero FAIL, baseline+5.
2. device_bash on the PC: same run + `npx.cmd tsc --noEmit` clean.
3. Scratch replay (not committed): feed `data/activities/TEST in app rides/qualifire-20260819/qualifire-20260819-2025.gpx` (station→home — overlaps the evening-B road for its second half) through free mode; report which routes' gates fired and the free sector times found. Nathan's actual 2026-08-20 free rides are the on-phone acceptance case.

## Files touched

- `app/src/live/engine.ts` (mode 'free': detector armWithinM=0, crossings/sectors, no lock)
- `app/src/location/index.ts` (thread `mode` through startTracking)
- `app/src/ui/RecordScreen.tsx` (new pills, free-ride race surface)
- `app/src/ui/routeMapView.tsx`, `app/src/ui/routeMapGeo.ts` (gatesOnly + allGatesFeatureCollection)
- `app/src/store/freeRides.ts` (NEW), `app/App.tsx` (init)
- `app/src/ui/ResultScreen.tsx` (free board)
- `demos/mockup.html` (new pill + free state — post-WP-A only)
- `app/tests/live_suite.ts` (+3), `app/tests/live_colour_suite.ts` (+2)

## Conflicts with cycle 023 (and WP-A)

**HIGH: `RecordScreen.tsx`** (023 auto-pause + WP-A three-phase flow both edit it) and **`routeMapView.tsx`** (023 day-mode fix). **`ResultScreen.tsx`** is WP-A's redesign target — coordinator must sequence WP-B last among them and hand you the landed files; your edits are the minimal additions above.

## Pre-resolved ambiguities

- "new" is a UI pseudo-landmark (`'~new'`), never a catalog entry (the validator would rightly reject it).
- Free-ride sector times are RAW only, uncoloured, unranked, forever separate (module isolation, not a filter flag). Showing them beside route history colours would BE the pollution Nathan is banning.
- Arming fires disabled in free mode (armWithinM=0): a free ride starting mid-route must not invent gate crossings behind it; estimated (gap-recovered) crossings display in the crossing count but never bound a saved sector time.
- Overlapping routes double-report a shared physical crossing (e.g. a Morning gate and its home>station twin) — accepted and correct: sector times are per-route identities; the map shows both gates.
- Both-ends-'new' (`new>>new`) behaves identically to one-end-'new' — freeRide is a single mode.
- PNG rung shows a stated degraded message in gates-only mode rather than a dishonest single-route drawing.

## NEEDS-NATHAN

- None blocking. FYI: whether free-ride sector times should EVER graduate into a route's history (e.g. when a free ride turns out to be a full clean traversal of one route) is deliberately out of scope — that is a future ruling; today they never do.

## Rollback

New module + additive props + a mode flag. Reverting the touched files removes the mode entirely; `free-rides-cache.json` on the phone becomes an orphan file (harmless; never read by anything else) — note it for Nathan if rolled back.
