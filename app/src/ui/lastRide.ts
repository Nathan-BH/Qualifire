/**
 * The ride the Result tab shows (cycle 008).
 *
 * Deliberately tiny and in-memory: STOP hands the finished live state here, the
 * Result tab reads it. It is DISPLAY state, not a record — the raw JSONL on
 * disk remains the only truth (D-023).
 *
 * Cycle 024 (WP-A1): B-40's disposable results-cache.json is gone. Every
 * finished ride with a real session (meta present) is now ALSO handed to
 * store/resultsStore.ts as a full, real-rideId RideResult — a persistent
 * sidecar under results/ that survives a restart on its own, independent of
 * this file's in-memory `last`/`recorded`. results-cache.json itself is left
 * on disk untouched (never read, never written again; D-023 — deleting it
 * costs nothing but one restart's worth of comparison history, same as
 * always). `initRideHistory` (replacing B-40's initRecordedPersistence)
 * rehydrates `recorded` from that store instead, then backfills any ended
 * ride still missing a result by re-deriving from its raw JSONL.
 *
 * Until a ride finishes in this session, `get()` returns null and Result falls
 * back to showing a ghost, clearly labelled as such. Never invent a lap.
 */
import { gateSetFor } from '../store/catalog.ts';
import { currentCatalog } from '../store/catalogStore.ts';
import { ranks } from '../store/results.ts';
import * as resultsStore from '../store/resultsStore.ts';
import type { LiveEngineState } from '../live/engine.ts';
import type { RideResult, SectorQuality } from '../store/types.ts';
import { RESULT_SCHEMA_VERSION } from '../store/types.ts';
import type { FsAdapter } from '../storage/fsAdapter.ts';
import { decodeIndex } from '../storage/rideIndex.ts';

export interface FinishedRide {
  rideId: string;
  routeId: string;
  atMs: number;
  lapMovingS: number | null;
  lapRawS: number | null;
  estimated: boolean;
  sectors: { index: number; movingS: number | null; rawS: number; quality: string }[];
}

let last: FinishedRide | null = null;
const recorded: RideResult[] = [];

/** Rides finished in THIS session, shaped as store results so the colour
 * window can include them (cycle 009: the window used to be frozen). Persisted
 * beyond this session via store/resultsStore.ts (cycle 024, WP-A1) — the raw
 * JSONL on disk remains the record (D-023). */
export function recordedResults(): RideResult[] {
  return recorded;
}

function sectorsFor(
  f: FinishedRide,
  gates: number[] | null,
): RideResult['sectors'] {
  return f.sectors.map((s) => {
    const quality: SectorQuality =
      s.quality === 'clean' || s.quality === 'interrupted' || s.quality === 'estimated'
        ? s.quality
        : 'missed';
    return {
      index: s.index,
      fromChainageM: gates ? (gates[s.index - 1] ?? 0) : 0,
      toChainageM: gates ? (gates[s.index] ?? 0) : 0,
      rawS: s.rawS,
      movingS: s.movingS,
      quality,
    };
  });
}

export function rememberRide(
  st: LiveEngineState,
  meta?: { rideId: string; startedAtMs: number },
): void {
  // An aborted ride must CLEAR the previous one, never leave a stale board
  // captioned "the ride you just finished" (cycle 009).
  if (st.track === null || st.lap === null) {
    last = null;
    return;
  }
  const atMs = Date.now();
  const rideId = meta?.rideId ?? `session:${atMs}`;
  const routeId = st.track;
  const lapMovingS = st.lap.movingS;
  const lapRawS = st.lap.rawS;
  const estimated = st.lap.estimated;
  last = {
    rideId,
    routeId,
    atMs,
    lapMovingS,
    lapRawS,
    estimated,
    sectors: st.sectors.map((s, i) => {
      if (s.kind !== 'done') {
        return { index: i + 1, movingS: null, rawS: 0, quality: 'missed' };
      }
      return {
        index: i + 1,
        movingS: s.estimated ? null : (s.movingS ?? null),
        rawS: s.rawS,
        quality: s.estimated ? 'estimated' : s.interrupted ? 'interrupted' : 'clean',
      };
    }),
  };

  // The ridden route's OWN current gate set (the runtime catalog,
  // store/catalogStore.ts — B-39) — resolved
  // unconditionally, same as before this brief (gateSetVersion has already
  // been real, not hardcoded, since cycle 024/WP-D2). NOT core/gates.ts's
  // gateChainages()/PROPOSED_GATES, which WP-D2 left covering only the four
  // legacy commute tracks, not every catalog route the live engine can now
  // lock. Real chainages (fromChainageM/toChainageM) are new in this brief
  // and only used when meta is present — session:-only pushes (no meta) keep
  // today's 0/0 back-compat shape. Falls back to 0/0 if a gate set is somehow
  // unresolvable — defensive only; the live engine only ever locks a track
  // catalogTrackSpecs() itself resolved a gate set for.
  const gateSet = gateSetFor(currentCatalog(), routeId);
  const gates = meta ? (gateSet ? gateSet.chainageM : null) : null;
  const derivedBy = {
    engineVersion: 'live',
    // Cycle 024 (WP-D2): the ridden route's OWN current gate set version —
    // hardcoding 1 broke the moment any route (e.g. MorningB) moved to v2.
    gateSetVersion: gateSet?.version ?? 1,
    resultSchemaVersion: RESULT_SCHEMA_VERSION,
  };
  const sectors = sectorsFor(last, gates);

  pushRecorded(last, meta, sectors, derivedBy);

  // Store write (cycle 024, WP-A1): only when this is a real session (meta
  // present) — a headless rememberRide(state) call (live_colour_suite.ts)
  // must keep behaving exactly as before, in-memory only. Writes even an
  // estimated/interrupted/missed-sector result: RIDES (A3) needs their
  // sectors, and D-028's "never ranks" rule is enforced at read time
  // (ranks()), not by refusing to store honest history.
  if (meta) {
    const anyMissed = sectors.some((s) => s.quality === 'missed');
    const anyEstimated = sectors.some((s) => s.quality === 'estimated');
    const anyInterrupted = sectors.some((s) => s.quality === 'interrupted');
    // Worst-sector lap rule — mirrors store/derive.ts's deriveRideResult
    // verbatim, so a live-scored result and an offline-backfilled one for the
    // same ride would carry the same honest quality.
    const lapQuality: SectorQuality = anyMissed
      ? 'missed'
      : anyEstimated
        ? 'estimated'
        : anyInterrupted
          ? 'interrupted'
          : 'clean';
    const storeResult: RideResult = {
      kind: 'rideResult',
      schemaVersion: RESULT_SCHEMA_VERSION,
      rideId: meta.rideId,
      startedAtMs: meta.startedAtMs,
      routeId,
      source: 'app',
      lap: {
        rawS: lapRawS ?? lapMovingS ?? 0,
        movingS: lapQuality === 'clean' || lapQuality === 'interrupted' ? lapMovingS : null,
        quality: lapQuality,
      },
      sectors,
      derivedBy,
    };
    void resultsStore.saveResult(storeResult);
  }
}

export function getLastRide(): FinishedRide | null {
  return last;
}

/** Beta finding #1 ("the post-ride board dies with the process"): when no
 * ride finished THIS session, fall back to the newest persisted store result
 * so Result still has something real to show after a restart. `last` always
 * wins when set — this is a fallback, not a replacement. */
export function getLastRideOrStored(): FinishedRide | null {
  if (last !== null) return last;
  const candidates = resultsStore
    .storedResults()
    .filter((r): r is RideResult & { routeId: string } => r.source === 'app' && r.routeId !== null);
  if (candidates.length === 0) return null;
  const newest = candidates.reduce((a, b) => (b.startedAtMs > a.startedAtMs ? b : a));
  return {
    rideId: newest.rideId,
    routeId: newest.routeId,
    atMs: newest.startedAtMs,
    lapMovingS: newest.lap.movingS,
    lapRawS: newest.lap.rawS,
    estimated: newest.lap.quality === 'estimated',
    sectors: newest.sectors.map((s) => ({
      index: s.index,
      movingS: s.movingS,
      rawS: s.rawS,
      quality: s.quality,
    })),
  };
}

/** Push the finished ride into the comparison window. Only a lap with a real
 * moving time joins: an estimated or gate-missing ride is not a benchmark.
 * Unchanged guard (cycle 024, WP-A1) — real rideId/startedAtMs/chainages when
 * `meta` is present, `session:` id and 0/0 chainages otherwise (back-compat,
 * live_colour_suite.ts calls rememberRide with no meta and must keep working
 * unmodified). */
function pushRecorded(
  f: FinishedRide,
  meta: { rideId: string; startedAtMs: number } | undefined,
  sectors: RideResult['sectors'],
  derivedBy: RideResult['derivedBy'],
): void {
  if (f.estimated || f.lapMovingS === null) return;
  recorded.push({
    kind: 'rideResult',
    schemaVersion: RESULT_SCHEMA_VERSION,
    rideId: f.rideId,
    startedAtMs: meta?.startedAtMs ?? f.atMs,
    routeId: f.routeId,
    source: 'app',
    lap: { rawS: f.lapRawS ?? f.lapMovingS, movingS: f.lapMovingS, quality: 'clean' },
    sectors,
    derivedBy,
  });
}

export function clearLastRide(): void {
  last = null;
}

/** Rehydrates `recorded` from the persistent results store once at boot
 * (replaces B-40's initRecordedPersistence). Never throws — missing/corrupt
 * store state degrades to today's memory-only behaviour (D-023). After the
 * initial hydration, fires the offline backfill (migration for rides
 * recorded before this store existed, and recovery for anything that failed
 * to lock live) in the background — never blocks boot — then merges any
 * newly-stored rankable results into `recorded`. */
export async function initRideHistory(fs: FsAdapter): Promise<void> {
  let results: RideResult[] = [];
  try {
    results = await resultsStore.initResultsStore(fs);
  } catch { /* the store is a convenience (D-023); boot never fails on it */ }

  const have = new Set(recorded.map((r) => r.rideId));
  for (const r of results) {
    if (ranks(r) && !have.has(r.rideId)) {
      recorded.push(r);
      have.add(r.rideId);
    }
  }

  // Fire-and-forget: the migration/recovery backfill can take a while on a
  // phone with years of rides; it must never delay the tab from becoming
  // interactive.
  void (async () => {
    try {
      const text = await fs.readText('index.json');
      if (text === null) return;
      const rideIndex = decodeIndex(text);
      if (rideIndex === null) return;
      // WP-B fix B2: a free ride's index entry must never be handed to
      // backfillMissingResults — a free ride that happens to trace a clean
      // lap of a known route must not get silently derived and saved as a
      // real route PB (D-025). Mirrors RidesScreen.tsx's identical filter.
      const endedIds = rideIndex.rides
        .filter((r) => r.status === 'ended' && r.mode !== 'free')
        .map((r) => r.rideId);
      await resultsStore.backfillMissingResults(fs, endedIds);
      const have2 = new Set(recorded.map((r) => r.rideId));
      for (const r of resultsStore.storedResults()) {
        if (ranks(r) && !have2.has(r.rideId)) {
          recorded.push(r);
          have2.add(r.rideId);
        }
      }
    } catch { /* backfill is a convenience; never throws into the caller */ }
  })();
}

/** RidesScreen (A1 change 5): drop a deleted ride's entry from the in-memory
 * comparison window, mirroring removeStoredResult's removal from the
 * persistent store. */
export function dropRecorded(rideId: string): void {
  const i = recorded.findIndex((r) => r.rideId === rideId);
  if (i !== -1) recorded.splice(i, 1);
}

/** Empties `recorded` and clears `last`. Originally test-only (start each
 * headless case from a clean slate without leaking state between tests) —
 * WP-Q's "Reset to virgin" (settings.tsx) is now a real production caller
 * too, ahead of re-running the boot chain against the freshly-emptied
 * storage root. Also disarms the results store (cycle 024, WP-A1) so one
 * caller cannot leak an armed adapter or a pending write into the next. */
export function resetRecorded(): void {
  recorded.length = 0;
  last = null;
  resultsStore.resetResultsStoreForTests();
}

/** Alias kept so the existing test suites need no changes. */
export const resetRecordedForTests = resetRecorded;
