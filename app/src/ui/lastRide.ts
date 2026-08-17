/**
 * The ride the Result tab shows (cycle 008).
 *
 * Deliberately tiny and in-memory: STOP hands the finished live state here, the
 * Result tab reads it. It is DISPLAY state, not a record — the raw JSONL on
 * disk remains the only truth (D-023), and a proper Result screen will one day
 * read a RideResult derived from that file rather than this hand-off.
 *
 * Until a ride finishes in this session, `get()` returns null and Result falls
 * back to showing a ghost, clearly labelled as such. Never invent a lap.
 */
import type { LiveEngineState } from '../live/engine.ts';
import type { RideResult } from '../store/types.ts';
import { RESULT_SCHEMA_VERSION } from '../store/types.ts';
import type { FsAdapter } from '../storage/fsAdapter.ts';

export interface FinishedRide {
  routeId: string;
  atMs: number;
  lapMovingS: number | null;
  lapRawS: number | null;
  estimated: boolean;
  sectors: { index: number; movingS: number | null; rawS: number; quality: string }[];
}

let last: FinishedRide | null = null;
const recorded: RideResult[] = [];

/** Relative path of the cache under the storage root — sibling of index.json.
 * The root already holds rides/, index.json and settings.json; no collision. */
export const RECORDED_CACHE_FILE = 'results-cache.json';

// B-40: `recorded` is memory-only display state (see file header); this cache
// makes it survive a restart WITHOUT promoting it to a record. D-023 still
// holds — the raw JSONL is the only truth, so this cache must never throw,
// never block boot, and losing it must cost nothing but one restart's worth
// of comparison history.
let cacheFs: FsAdapter | null = null;          // null until initRecordedPersistence; null in tests by default
let writeTail: Promise<void> = Promise.resolve(); // serializes cache writes, last write wins

/** Rides finished in THIS session, shaped as store results so the colour
 * window can include them (cycle 009: the window used to be frozen). Backed
 * by a disposable JSON cache (B-40) so it also survives a restart — the raw
 * JSONL on disk remains the record (D-023). */
export function recordedResults(): RideResult[] {
  return recorded;
}

function encodeRecordedCache(results: RideResult[]): string {
  return JSON.stringify({ schemaVersion: RESULT_SCHEMA_VERSION, results }, null, 1) + '\n';
}

function isNonNullObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Structural guard for one cached entry: every field every downstream
 * consumer (ghostsFor/ranks/sectorValues) actually reads must be present and
 * of the right shape, or the entry is dropped. Mirrors decodeIndex's
 * defensive posture in storage/rideIndex.ts. */
function isValidCachedResult(v: unknown): v is RideResult {
  if (!isNonNullObject(v)) return false;
  if (v.kind !== 'rideResult') return false;
  if (typeof v.rideId !== 'string') return false;
  if (typeof v.startedAtMs !== 'number' || !Number.isFinite(v.startedAtMs)) return false;
  if (!(v.routeId === null || typeof v.routeId === 'string')) return false;
  const lap = v.lap;
  if (!isNonNullObject(lap)) return false;
  if (typeof lap.rawS !== 'number') return false;
  if (!(lap.movingS === null || typeof lap.movingS === 'number')) return false;
  if (typeof lap.quality !== 'string') return false;
  if (!Array.isArray(v.sectors)) return false;
  for (const s of v.sectors) {
    if (!isNonNullObject(s) || typeof s.index !== 'number') return false;
  }
  return true;
}

/** Returns null on corrupt/unrecognisable text so the caller degrades to an
 * empty cache (D-023: this file is a convenience, never trusted blindly). */
export function decodeRecordedCache(text: string): RideResult[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isNonNullObject(parsed) || !Array.isArray(parsed.results)) return null;
  return parsed.results.filter(isValidCachedResult);
}

/** Rehydrates `recorded` from the cache file once at boot. Never throws —
 * missing file, corrupt file, and adapter errors all silently degrade to
 * today's memory-only behavior (D-023). Dedupes by rideId so a second call
 * (e.g. a remount) is idempotent. */
export async function initRecordedPersistence(fs: FsAdapter): Promise<void> {
  cacheFs = fs;
  try {
    const text = await fs.readText(RECORDED_CACHE_FILE);
    if (text === null) return;
    const decoded = decodeRecordedCache(text);
    if (decoded === null) return;
    const have = new Set(recorded.map((r) => r.rideId));
    recorded.unshift(...decoded.filter((r) => !have.has(r.rideId)));
  } catch { /* the cache is a convenience (D-023) — boot never fails on it */ }
}

/** Test seam: resolves once every write scheduled so far has settled. */
export function flushRecordedCacheWrites(): Promise<void> {
  return writeTail;
}

function schedulePersist(): void {
  if (cacheFs === null) return;               // persistence never armed (headless default)
  const fs = cacheFs;
  const text = encodeRecordedCache(recorded); // snapshot synchronously, at call time
  writeTail = writeTail.then(() => fs.writeText(RECORDED_CACHE_FILE, text)).catch(() => {});
}

export function rememberRide(st: LiveEngineState): void {
  // An aborted ride must CLEAR the previous one, never leave a stale board
  // captioned "the ride you just finished" (cycle 009).
  if (st.track === null || st.lap === null) {
    last = null;
    return;
  }
  last = {
    routeId: st.track,
    atMs: Date.now(),
    lapMovingS: st.lap.movingS,
    lapRawS: st.lap.rawS,
    estimated: st.lap.estimated,
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
  pushRecorded(last);
}

export function getLastRide(): FinishedRide | null {
  return last;
}

/** Push the finished ride into the comparison window. Only a lap with a real
 * moving time joins: an estimated or gate-missing ride is not a benchmark. */
function pushRecorded(f: FinishedRide): void {
  if (f.estimated || f.lapMovingS === null) return;
  recorded.push({
    kind: 'rideResult',
    schemaVersion: RESULT_SCHEMA_VERSION,
    rideId: `session:${f.atMs}`,
    startedAtMs: f.atMs,
    routeId: f.routeId,
    source: 'app',
    lap: { rawS: f.lapRawS ?? f.lapMovingS, movingS: f.lapMovingS, quality: 'clean' },
    sectors: f.sectors.map((s) => ({
      index: s.index,
      fromChainageM: 0,
      toChainageM: 0,
      rawS: s.rawS,
      movingS: s.movingS,
      quality: (s.quality === 'clean' || s.quality === 'interrupted'
        ? s.quality
        : s.quality === 'estimated' ? 'estimated' : 'missed'),
    })),
    derivedBy: { engineVersion: 'live', gateSetVersion: 1, resultSchemaVersion: RESULT_SCHEMA_VERSION },
  });
  schedulePersist();
}

export function clearLastRide(): void {
  last = null;
}

/** Test-only: empties `recorded` and clears `last` so the headless suite can
 * start each case from a clean slate without leaking state between tests.
 * Also disarms persistence (B-40) so one suite cannot leak an armed adapter
 * or a pending write into the next. */
export function resetRecordedForTests(): void {
  recorded.length = 0;
  last = null;
  cacheFs = null;
  writeTail = Promise.resolve();
}
