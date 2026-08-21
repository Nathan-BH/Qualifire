# WP-A1 — Ride-history store (B-28's other half)

**Sequence:** WP-A is three sequential briefs. This is 1 of 3. Execute A1 → A2 → A3. A2 and A3 must not start until A1's verification passes.

**DO NOT WRITE ANY REPO FILE until the coordinator confirms cycle 023 has landed.** First step of execution: re-baseline — run the test suite and `git`-less diff-check the files listed under "Files touched" against the anchors below; if a listed file has changed beyond the anchors described (cycle 023 may have touched `RecordScreen.tsx`, `ResultScreen.tsx`, `lastRide.ts`), STOP and escalate. Do not guess.

## Goal (Nathan's words)

"My ghosts were some random rides instead of using the actual ride history which is fully loaded… a lack of previous rides and looking back features that are currently non-existent while all the data is literally there" (Nathan's_notes1.md). Beta finding #1: "the post-ride board dies with the process." This brief builds the persistent per-ride results store underneath the RIDES/RESULT redesign (A3): every recorded ride gets a derived result (route, lap, sectors) saved on the phone, surviving restarts, feeding the ghost window and the tower — with the raw ride JSONL never rewritten (D-023).

## Environment / hard constraints

- Repo lives at `C:\Users\natha\Claude personal projects\Qualifire\` on Nathan's PC (mounted). Cloud sandbox has NO npm/PyPI access — zero new packages, no react-native-svg, nothing installed.
- Tests run pure: `cd app && node --experimental-strip-types tests/run.ts` → must end with 0 FAIL. `npx tsc --noEmit` (from `app/`) must be clean — run it on Nathan's PC via device_bash (`cd "$HOME/mnt/Qualifire/app" && npx.cmd tsc --noEmit`; if `npx.cmd` is not found in that shell, try `npx`). Re-baseline the suite BEFORE touching anything (last known: 145 tests, 142 pass / 0 fail / 3 benign skips — cycle 023 may have moved this; record the new baseline).
- D-023: `rides/<rideId>.jsonl` is never rewritten. Everything this brief adds is a derived sidecar — deleting every result must cost nothing but CPU.
- D-042: raw time is the default. D-028: estimated laps never rank. D-030/D-037: colour model and last-10 window are settled — do not touch `tierFor`, `WINDOW_N`, `MIN_HISTORY`.
- Never delete a file — move it to `safe_to_delete/`.
- Stop-on-ambiguity: any judgment call not pre-resolved below → STOP and escalate.

## Current state (file/line anchors, snapshot of 2026-08-20)

- `app/src/ui/lastRide.ts` (192 lines) — the whole file matters. `last: FinishedRide|null` is the Result tab's display slot; `recorded: RideResult[]` is the in-memory comparison window; B-40 persists `recorded` to `results-cache.json` at the storage root (`RECORDED_CACHE_FILE` L31, `initRecordedPersistence` L96, `schedulePersist` L113, `rememberRide` L120, `pushRecorded` L154 — builds a `RideResult` with `rideId: 'session:'+atMs`, `fromChainageM: 0`, `derivedBy.engineVersion: 'live'`). `resetRecordedForTests` L187.
- `app/src/ui/colourModel.ts` — `ghostsFor(routeId, excludeRideId?)` L42-47 merges seed ghosts (`results.seed.json`, ids like `seed:20260731-1034-…`) + `recordedResults()`, filters `ranks()`, sorts, keeps last `WINDOW_N=10`. `allTimeBestLapS` L95. DO NOT MODIFY this file — the design below keeps `recordedResults()` as its feed.
- `app/App.tsx` L36, L85-91 — `initRecordedPersistence(createExpoFsAdapter())` fired once at boot, fire-and-forget, state bump on completion.
- `app/src/ui/RecordScreen.tsx` L227-241 — `onEnd` calls `rememberRide(liveEngine.getState())` then `stopTracking()`. `session: ActiveSession` has `{ rideId, startedAtMs }` (`src/location/session.ts`; `session` state at L100, set from `startTracking()` L218).
- `app/src/ui/ResultScreen.tsx` L47-50 — B-44 exclusion: `sessionId = ride ? 'session:'+ride.atMs : undefined` passed to `ghostsFor`/`lapValues`/`sectorValues` (also L101, L163).
- `app/src/storage/core.ts` — storage root layout: `rides/<rideId>.jsonl`, `rides/<rideId>.events.jsonl`, `index.json`. `deleteRide` L276-287. `listRides` L208.
- `app/src/storage/jsonl.ts` — `decodeRideFile(text): DecodedRide` L57 ({header, fixes: FixRecord[], end, nDropped}); `encodeHeader` L18 / `encodeFix` L31 / `encodeEnd` L43 (for test fixtures).
- `app/src/storage/fsAdapter.ts` — `FsAdapter` seam + `createMemoryFsAdapter()` (tests).
- `app/src/store/types.ts` — `RideResult` L81-98, `ResultsIndex` L107-110, `RESULT_SCHEMA_VERSION`.
- `app/src/store/results.ts` — pure index helpers: `emptyResultsIndex`, `upsertResult` (drops routeId-null), `removeResult`, `rebuildIndex`, `ranks`, `windowLastN`.
- `app/src/store/derive.ts` — `deriveRideResult(inp: DeriveInput): RideResult` L58: raw t/lat/lon + `ref: RefLine` + `gates: number[]` → full RideResult via app/core (offline never produces 'estimated'; a wrong-route candidate yields missed sectors / `routeId: null`).
- `app/src/live/refs.ts` — `TRACK_IDS = ['Morning','EveningA','EveningB','MorningB']` L19, `refFor(track): RefLine` L23.
- `app/core/src/gates.ts` L43 — `gateChainages(track: TrackId): number[]` (5 gates → 4 sectors, all four tracks). `TrackId` union: `core/src/types.ts` L37.
- `app/core/src/index.ts` re-exports `toXY`, `projectRideOffline` (returns `{s, xtd}`), etc.
- `app/tests/results_cache_suite.ts` (109 lines, 4 tests) — locks B-40's cache behaviour. Superseded by this brief (see change 6).
- `app/tests/live_colour_suite.ts` L32 — dynamically imports `getLastRide, rememberRide, resetRecordedForTests` from lastRide and calls `rememberRide(state)` with ONE argument. This suite must keep passing UNMODIFIED.
- `app/tests/run.ts` — suite imports; `results_cache_suite.ts` at L19.

## The design (pre-resolved)

One persistent store of derived `RideResult`s keyed by REAL rideIds, under the same storage root, sibling of `rides/`:

```
results/index.json        ResultsIndex (store/results.ts helpers; rebuildable)
results/<rideId>.json     one RideResult, pretty-printed JSON + trailing \n
results/unmatched.json    { schemaVersion: 1, entries: [{ rideId, engineVersion }] }
```

Results are derived two ways:
1. **At ride END (live path):** the live engine already locked the route; convert `LiveEngineState` → `RideResult` exactly as today's `pushRecorded` does, but with the REAL `rideId` and `startedAtMs` from the session, real sector chainages from `gateChainages(track)`, `source: 'app'`, `derivedBy.engineVersion: 'live'`. Cheap, and numerically identical to what the rider saw live.
2. **Backfill (offline path), for rides already on Nathan's phone** recorded before this lands: derive from the raw JSONL via `deriveRideResult` — this IS the migration. No import of the old `results-cache.json`: its entries carry synthetic `session:` ids and every real ride's raw JSONL is still on disk, so re-deriving with real ids is strictly better. `results-cache.json` simply stops being read or written; **leave the file on disk untouched** (never delete).

`recordedResults()` (lastRide) remains the single feed `colourModel.ghostsFor` consumes; boot hydration now fills it from the store instead of the cache. Only results passing `ranks()` enter that in-memory window (estimated/missed laps are stored — A3 shows their sectors — but never join the window; same D-028 invariant the old cache enforced by refusing to persist them).

## Change list

### 1. NEW `app/src/store/resultsStore.ts` (pure — no expo, no Node imports; all I/O via injected FsAdapter)

Module-level state mirroring lastRide's pattern (armed fs, serialized write tail). Exports:

- `const RESULTS_DIR = 'results'`, `RESULTS_INDEX_FILE = 'results/index.json'`, `UNMATCHED_FILE = 'results/unmatched.json'`, `BACKFILL_ENGINE_VERSION = 'core-2026-08-15'` (mirrors the seed builder's engineVersion — see `results.seed.json` `derivedBy`).
- `isValidRideResult(v: unknown): v is RideResult` — move the structural guard from lastRide L61-77 here verbatim (lastRide re-imports it or drops it; see change 3).
- `async initResultsStore(fs: FsAdapter): Promise<RideResult[]>` — arms persistence; reads `results/index.json` (tolerant: on missing/corrupt, rebuild by `listDir('results')` scanning `*.json` files except `index.json`/`unmatched.json`); loads each `results/<rideId>.json`, drops entries failing `isValidRideResult`; caches in a module map; never throws (D-023 posture: the store is derived; a bad file degrades to absent). Returns the loaded results.
- `storedResults(): RideResult[]` — in-memory list, ascending `startedAtMs`.
- `getStoredResult(rideId: string): RideResult | null`.
- `async saveResult(r: RideResult): Promise<void>` — validates, writes `results/<rideId>.json`, upserts `results/index.json` via `upsertResult`, updates the in-memory map. Serialized last-write-wins tail like lastRide's `writeTail`; `flushResultWrites()` test seam. No-throw to callers (catch + swallow; recording is worth more than the sidecar).
- `async removeStoredResult(rideId: string): Promise<void>` — deletes `results/<rideId>.json` (fs.deleteFile — an on-device derived cache entry, allowed; the never-delete rule is for repo files), removes from index + memory. Called when a ride is deleted (change 5).
- `async backfillMissingResults(fs: FsAdapter, rideIds: string[]): Promise<void>` — for each rideId with no stored result and no `unmatched.json` entry at `BACKFILL_ENGINE_VERSION`: read `rides/<rideId>.jsonl`, `decodeRideFile`; skip (no marker) if <2 fixes or no end record is fine to still try — derive on whatever fixes exist; run the candidate loop below; save the winner or append an unmatched marker. Sequential, awaited one at a time, never throws.
- `resetResultsStoreForTests(): void`.

**Candidate loop (route matching for backfill), pre-resolved rule:** for each `track` of `TRACK_IDS`: `deriveRideResult({ rideId, t, lat, lon, ref: refFor(track), gates: gateChainages(track), routeId: track, gateSetVersion: 1, engineVersion: BACKFILL_ENGINE_VERSION, source: 'app' })` where `t` is epoch SECONDS (`fix.tUnixMs / 1000` — derive.ts multiplies `t[0]*1000` back for startedAtMs; match `build_seed.ts`'s convention if it differs — check that file before coding, escalate if it uses ms). A candidate is **accepted** iff `result.routeId !== null && (result.lap.quality === 'clean' || result.lap.quality === 'interrupted')` — core's off-corridor exclusion already encodes "was this road actually ridden". If ≥2 candidates accepted (should be rare), tie-break by smallest mean |xtd| over the ride (`projectRideOffline(x, y, ref).xtd`, mean of absolute values, computed only for the tied candidates). Zero accepted → unmatched marker (the ride still lists in RIDES via storage index; A3 renders it "no route"). Partial rides (ended before the finish gate) will derive `missed` and stay unmatched — honest, expected.

`refs.ts` and `gates.ts` are imported by resultsStore — note `refs.ts` imports `tests/fixtures/refs.json`, which is already the app convention (live engine does the same). WP-D will widen `TRACK_IDS` to all 19 routes; backfill automatically benefits — do not de-hardcode anything here.

### 2. MOD `app/App.tsx`

L36/L85-91: replace `initRecordedPersistence(createExpoFsAdapter())` with `initRideHistory(createExpoFsAdapter())` (new export from lastRide, change 3). Same fire-and-forget shape, same state bump, comment updated: the store (results/) replaced results-cache.json in cycle 024; raw JSONL still the only truth (D-023).

### 3. MOD `app/src/ui/lastRide.ts` (rework)

- `FinishedRide` gains `rideId: string` (the REAL ride id, or `'session:'+atMs` fallback when no meta is supplied).
- `rememberRide(st: LiveEngineState, meta?: { rideId: string; startedAtMs: number })`:
  - unchanged abort behaviour (track/lap null → `last = null`, return);
  - builds `last` as today plus `rideId: meta?.rideId ?? 'session:'+atMs`;
  - `pushRecorded` builds the `RideResult` with: `rideId` as above; `startedAtMs: meta?.startedAtMs ?? atMs`; real `fromChainageM/toChainageM` from `gateChainages(st.track)` when `meta` is present (indexes k→gates[k], gates[k+1]); keeps the existing guard — only a real moving-time, non-estimated lap joins `recorded`;
  - **store write**: when `meta` is present, ALSO build a full RideResult (even for estimated/no-lap-quality rides? NO — pre-resolved: only when `st.lap !== null`, i.e. the finish gate fired; the lap carries its honest quality: estimated laps get `lap.quality:'estimated'`, `movingS: null` — mirror the quality mapping already in `rememberRide`'s sector loop and derive.ts's worst-sector lap rule) and call `resultsStore.saveResult`. A ride aborted before the finish gate (lap null) saves nothing here — backfill can derive it later if it actually completed the gates, otherwise it stays raw-only.
  - Without `meta` (live_colour_suite's calls): behaviour identical to today — in-memory push only, no persistence. **live_colour_suite must pass unmodified.**
- NEW `async initRideHistory(fs: FsAdapter): Promise<void>` — replaces `initRecordedPersistence`: `const results = await initResultsStore(fs)`; push into `recorded` every result passing `ranks()` (import from `store/results.ts`), dedupe by rideId; then fire-and-forget `backfillMissingResults(fs, ids)` where ids come from reading `index.json` at the storage root (`decodeIndex` from `storage/rideIndex.ts`, entries with `status==='ended'`); after backfill, merge newly stored rankable results into `recorded` (dedupe again). Never throws.
- NEW `getLastRideOrStored(): FinishedRide | null` — `last` if set, else adapt the newest `storedResults()` entry with `source==='app'` into a FinishedRide (`atMs: startedAtMs`, `lapMovingS: lap.movingS`, `lapRawS: lap.rawS`, `estimated: lap.quality==='estimated'`, sectors mapped index/movingS/rawS/quality). This fixes beta finding #1 (board dies with the process). Used by A3; harmless to add now.
- DELETE from this file: `RECORDED_CACHE_FILE`, `encodeRecordedCache`, `decodeRecordedCache`, `isValidCachedResult` (moved to resultsStore as `isValidRideResult`), `initRecordedPersistence`, `schedulePersist`, `flushRecordedCacheWrites`, `cacheFs`/`writeTail`. `resetRecordedForTests` stays and additionally calls `resetResultsStoreForTests()`.
- Keep `recordedResults()`, `getLastRide()`, `clearLastRide()` exported unchanged in signature — `colourModel.ts` is NOT modified by this brief.

### 4. MOD `app/src/ui/RecordScreen.tsx` (one line + closure fix)

L230: `rememberRide(liveEngine.getState())` → `rememberRide(liveEngine.getState(), session ? { rideId: session.rideId, startedAtMs: session.startedAtMs } : undefined)`. NOTE: `onEnd` is a `useCallback([], …)` — `session` from the closure would be stale. Use the same ref-mirror pattern the file already uses for `pickedRouteRef` (L344-345): add `sessionRef` mirroring `session`, read `sessionRef.current` inside `onEnd`. Touch nothing else in this file (A2 rebuilds it; keep this diff minimal).

### 5. MOD `app/src/ui/RidesScreen.tsx` (delete hook only)

In `onDelete`'s confirmed branch (L69-77): after `await deleteRide(ride.rideId)`, call `await removeStoredResult(ride.rideId)` (import from resultsStore) before `refresh()`. Also remove the ride's entry from `recorded` in lastRide — add and call `dropRecorded(rideId: string)` exported from lastRide (filters `recorded` in place). No other RidesScreen changes (A3 redesigns it).

### 6. MOD `app/src/ui/ResultScreen.tsx` (exclusion id only)

L49: `const sessionId = ride ? \`session:${ride.atMs}\` : undefined;` → `const sessionId = ride?.rideId;` (FinishedRide now carries it). The variable name may stay. B-44's exclusion must keep working for the just-finished ride whose store entry now has a real id. No other changes (A3 redesigns this screen).

### 7. Tests

- MOVE `app/tests/results_cache_suite.ts` → `safe_to_delete/results_cache_suite.ts` (never delete). Remove its import from `app/tests/run.ts` L19.
- NEW `app/tests/resultsstore_suite.ts`, imported from `run.ts` (add where the cache suite import was). Follow `results_cache_suite.ts`'s patterns (memory fs, dynamic-import trick NOT needed — resultsStore has no `.json` bare import... EXCEPTION: it imports `refs.ts` which imports `refs.json`. Mirror `live_colour_suite.ts` L15-31's `registerHooks` JSON-loader pattern, or import resultsStore dynamically after registering the hook — copy that suite's approach exactly). Cases (9):
  1. save → simulated restart (`resetResultsStoreForTests` + fresh `initResultsStore` on same memory fs) → result rehydrates with same rideId/routeId/movingS; `initRideHistory` puts it into `recordedResults()`.
  2. corrupt `results/<id>.json` and corrupt `results/index.json` each degrade silently to empty/rebuilt — no throw, valid siblings survive (index rebuilt from per-ride files).
  3. an estimated-lap RideResult saves to the store but never enters `recordedResults()` after hydration (D-028 window invariant — supersedes the old cache suite's "estimated never persisted").
  4. `rememberRide(state, meta)` with a finished clean state writes `results/<realRideId>.json` with real chainages (`fromChainageM === gateChainages(track)[0]` etc.) and `recordedResults()` contains the real rideId (not `session:`).
  5. `rememberRide(state)` with NO meta: no file written, in-memory push only with `session:` id (back-compat lock).
  6. backfill: build a `rides/<id>.jsonl` in memory fs (encodeHeader + encodeFix per point + encodeEnd) from a replay fixture of a known track (reuse `tests/lib.ts` fixture helpers — see `engine_suite.ts` for how fixtures load); `backfillMissingResults` produces a result whose routeId is that track and whose lap equals a direct `deriveRideResult` call on the same points.
  7. backfill of a nonsense ride (e.g. fixture points offset by +0.1° lat) yields no result and one `unmatched.json` entry; a second backfill call does not retry it (marker respected).
  8. `removeStoredResult` deletes file + index entry + memory.
  9. `saveResult` for an existing rideId replaces, not duplicates (index has one entry).
- Expected count: baseline − 4 (cache suite) + 9 = baseline + 5, 0 FAIL. Re-baseline first; report exact numbers.

## Verification

1. `cd app && node --experimental-strip-types tests/run.ts` → 0 FAIL (sandbox-pure).
2. device_bash on the PC: `cd "$HOME/mnt/Qualifire/app" && npx.cmd tsc --noEmit` → clean; rerun the suite there too.
3. Grep-check: no remaining reference to `RECORDED_CACHE_FILE`/`results-cache.json` outside `safe_to_delete/` and comments explaining the supersession.

## Files touched

`app/src/store/resultsStore.ts` (NEW) · `app/src/ui/lastRide.ts` · `app/App.tsx` · `app/src/ui/RecordScreen.tsx` (minimal) · `app/src/ui/RidesScreen.tsx` (minimal) · `app/src/ui/ResultScreen.tsx` (minimal) · `app/tests/resultsstore_suite.ts` (NEW) · `app/tests/run.ts` · `safe_to_delete/results_cache_suite.ts` (moved)

## Conflict-with-023 flags

- `RecordScreen.tsx` / `ResultScreen.tsx` / `lastRide.ts`: cycle 023's paused-time-in-result toggle and auto-pause work may touch all three. Re-baseline; if `rememberRide`'s shape or ResultScreen's exclusion line moved, adapt anchors — if the CHANGE ITSELF conflicts (e.g. 023 already persists something), STOP and escalate.
- `results-cache.json` consumers: none outside lastRide today; if 023 added one, STOP.

## Pre-resolved ambiguities (recap)

- Store supersedes B-40's `results-cache.json`; old file left on disk, unread. Old suite moved to `safe_to_delete/`, replaced by a superset suite (this is a mechanism replacement, not a weakened test — every old guarantee has a successor case, mapped in change 7).
- Migration = offline backfill from raw JSONL (D-023: results are always rebuildable); no cache import; `session:` ids never persist once meta exists.
- Backfill acceptance rule and tie-break as specified; unmatched marker keyed by engineVersion so future engine/route additions retry automatically.
- Estimated/interrupted results ARE stored (RIDES needs their sectors); `ranks()` keeps them honest everywhere that compares.
- Live-rank transient: for the ~2 s between `rememberRide` and leaving the screen, the just-saved ride is inside its own ghost set on the live surface; accepted (B-44 exclusion still protects Result via rideId).

## NEEDS-NATHAN

None.

## Rollback

Revert the nine touched repo files (restore `results_cache_suite.ts` from `safe_to_delete/`). On-device `results/` directory is inert once the code is reverted; raw JSONL was never touched (D-023) — rollback loses nothing.
