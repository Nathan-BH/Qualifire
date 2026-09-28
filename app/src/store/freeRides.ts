/**
 * Free-ride persistence (WP-B, Nathan's 2026-08-20 notes): "the sector times
 * can be saved in a separate category called free rides. This way the sector
 * times from fixed routes are not polluted by the free rides."
 *
 * STRUCTURAL ISOLATION IS THE RULE, not a filter flag: this module is the
 * ONLY writer/reader of free-ride times. Nothing in colourModel.ts,
 * lastRide.ts, results.ts, resultsStore.ts or the seed may import it — a free
 * ride simply never reaches ghostsFor()/recordedResults()/the results store,
 * so it structurally cannot enter a fixed-route comparison set (D-025
 * mode-consistency). RecordScreen/ResultScreen are the only other importers,
 * and they only ever call the functions below, never reach into the fixed
 * stores with free-ride data.
 *
 * virgin-cycle16 02 (Nathan 2026-09-28): a free ride is a POST-RIDE LABEL on
 * an ordinary recorded ride, chosen on the ride-detail overlay ("Save as free
 * ride"), never a live mode — free mode, freeCrossings/freeSectors and the
 * gates-only map are retired ("this idea needs complete removal"). The record
 * is identity only: rideId, startedAtMs, durationS, sportId. No crossings, no sectors.
 *
 * Persistence pattern: this brief's own "Current state" section (2026-08-20)
 * described mirroring B-40's disposable results-cache.json via lastRide.ts's
 * old FsAdapter/write-tail plumbing — that module was rewritten this session
 * (WP-A1) and B-40's cache is gone, superseded by store/resultsStore.ts's own
 * persistent-store shape. This module mirrors THAT module's actual pattern
 * instead (FsAdapter injection, a serialized write tail, tolerant decode that
 * drops malformed entries, init that never throws, a reset-for-tests seam) —
 * same guarantees the brief asked for, against the store that actually
 * exists. Free rides are lightweight (no ranking, no backfill, no per-route
 * index) so — like B-40's original results-cache.json — this is ONE flat
 * cache file holding every free ride, not one file per ride.
 */
import type { FsAdapter } from '../storage/fsAdapter.ts';
import { upgradeFreeRidesCache } from './migrations.ts';

export const FREE_RIDES_CACHE_FILE = 'free-rides-cache.json';
const SCHEMA_VERSION = 3;

export interface FreeRideRecord {
  kind: 'freeRide';
  schemaVersion: 3;
  /** The raw ride's own id (storage/index.json) — since v3. Migrated v1/v2
   * records keep their historical `free:<startedAtMs>` id. */
  rideId: string;
  startedAtMs: number;
  /** Wall-clock ride length in seconds from RideMeta (endMs - startMs), or
   * null when unknown (migrated record, or meta not loaded at save time). */
  durationS: number | null;
  /** The ride's own sport (RideMeta.sportId through effectiveRideSportId), or
   * null when unknown (migrated record). RESULTS scopes its free-ride section
   * by this; a null record shows under every sport. */
  sportId: string | null;
}

let rides: FreeRideRecord[] = [];
let armedFs: FsAdapter | null = null;
/** Serializes every write against FREE_RIDES_CACHE_FILE, last-write-wins,
 * mirroring resultsStore.ts's own writeTail. */
let writeTail: Promise<void> = Promise.resolve();

function isNonNullObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Structural guard for one stored free ride — every field a reader actually
 * uses must be present and of the right shape, or the entry is dropped
 * (mirrors resultsStore.ts's isValidRideResult). */
export function isValidFreeRideRecord(v: unknown): v is FreeRideRecord {
  if (!isNonNullObject(v)) return false;
  if (v.kind !== 'freeRide') return false;
  if (typeof v.rideId !== 'string') return false;
  if (typeof v.startedAtMs !== 'number' || !Number.isFinite(v.startedAtMs)) return false;
  if (!(v.durationS === null || (typeof v.durationS === 'number' && Number.isFinite(v.durationS)))) return false;
  if (!(v.sportId === null || typeof v.sportId === 'string')) return false;
  return true;
}

function encodeCache(rs: FreeRideRecord[]): string {
  return JSON.stringify({ schemaVersion: SCHEMA_VERSION, rides: rs }, null, 1) + '\n';
}

/** null on unrecognisable text, exactly like decodeCatalog/decodeIndex
 * elsewhere in this repo — the caller decides what "unreadable" means. Drops
 * individual malformed entries rather than failing the whole file (a torn or
 * partly-corrupt cache should not cost every OTHER free ride on it). */
export function decodeFreeRidesCache(text: string): FreeRideRecord[] | null {
  try {
    const rides = upgradeFreeRidesCache(JSON.parse(text) as unknown);
    return rides === null ? null : rides.filter(isValidFreeRideRecord);
  } catch {
    return null;
  }
}

/** Enqueues a write behind whatever is already pending and swallows any fs
 * error (no-throw — this cache is a convenience, D-023: the raw JSONL and the
 * GPX+ sidecar's own gate events remain the real record of a free ride). */
function enqueueWrite(fn: (fs: FsAdapter) => Promise<void>): Promise<void> {
  const fs = armedFs;
  const turn = writeTail.then(async () => {
    if (fs === null) return;
    await fn(fs);
  });
  writeTail = turn.catch(() => {});
  return turn.catch(() => {});
}

/** Labels an ordinary recorded ride a free ride (virgin-cycle16 02). Called
 * from RideDetailScreen's "Save as free ride"; idempotent by rideId. The raw
 * JSONL stays the real record of the ride (D-023) — this cache only says
 * "Nathan filed it as free". */
export function markRideFree(
  rideId: string, startedAtMs: number, durationS: number | null, sportId: string | null,
): void {
  if (rides.some((r) => r.rideId === rideId)) return;
  const record: FreeRideRecord = { kind: 'freeRide', schemaVersion: 3, rideId, startedAtMs, durationS, sportId };
  rides = [...rides, record];
  const text = encodeCache(rides);
  void enqueueWrite(async (fs) => {
    await fs.writeText(FREE_RIDES_CACHE_FILE, text);
  });
}

/** Undoes markRideFree ("Not a free ride"). Takes the record's own rideId
 * (RideDetailScreen passes `model.free.rideId`, which for a migrated v1/v2
 * record is the historical `free:<ms>` id, not the raw ride's). No-op when
 * absent. */
export function unmarkRideFree(rideId: string): void {
  if (!rides.some((r) => r.rideId === rideId)) return;
  rides = rides.filter((r) => r.rideId !== rideId);
  const text = encodeCache(rides);
  void enqueueWrite(async (fs) => {
    await fs.writeText(FREE_RIDES_CACHE_FILE, text);
  });
}

/** Every stored free ride, oldest first. RidesScreen.tsx (a separate WP this
 * cycle, not touched here — see WP-B's brief, section 6) can label a raw
 * stored ride "free ride" by matching this list's rideIds/timestamps against
 * its own; this module does not reach into RidesScreen or the raw ride index
 * itself. */
export function freeRideResults(): FreeRideRecord[] {
  return [...rides].sort((a, b) => a.startedAtMs - b.startedAtMs);
}

/** The most recently started free ride, or null. RESULT (WP-B section 5)
 * uses this to decide whether the FREE RIDE board should show instead of the
 * route board. */
export function lastFreeRide(): FreeRideRecord | null {
  if (rides.length === 0) return null;
  return rides.reduce((a, b) => (b.startedAtMs > a.startedAtMs ? b : a));
}

/** WP-H: the free-ride record for a raw ride, by start time. The record's own
 * id is `free:${sessionStartedAtMs}`, and the session's start (location/
 * index.ts:329) is taken AFTER `await startRide()` stamped the raw index's
 * startMs (storage/core.ts:142) — a few ms apart, never equal. Exact id hit
 * first (post-stop passes the session's own value); else the nearest record
 * within `tolMs`, so RIDES (raw startMs) resolves the same ride. Pure. Since
 * v3 the id is the raw ride's own, and the exact startedAtMs hit is the
 * normal case. */
export const FREE_RIDE_MATCH_TOL_MS = 10_000;
export function freeRideNear(
  records: readonly FreeRideRecord[],
  startedAtMs: number,
  tolMs: number = FREE_RIDE_MATCH_TOL_MS,
): FreeRideRecord | null {
  const exact = records.find((r) => r.startedAtMs === startedAtMs);
  if (exact) return exact;
  let best: FreeRideRecord | null = null;
  for (const r of records) {
    const d = Math.abs(r.startedAtMs - startedAtMs);
    if (d <= tolMs && (best === null || d < Math.abs(best.startedAtMs - startedAtMs))) best = r;
  }
  return best;
}

/** Rehydrates from disk once at boot. Never throws (D-023: a missing/corrupt
 * cache degrades to whatever was already in memory, never fatal). Idempotent
 * — a repeated call (or a call after some free rides are already in memory)
 * dedupes by rideId rather than duplicating. */
export async function initFreeRidePersistence(fs: FsAdapter): Promise<void> {
  armedFs = fs;
  try {
    const text = await fs.readText(FREE_RIDES_CACHE_FILE);
    if (text === null) return;
    const decoded = decodeFreeRidesCache(text);
    if (decoded === null) return;
    const have = new Set(rides.map((r) => r.rideId));
    for (const r of decoded) {
      if (!have.has(r.rideId)) {
        rides.push(r);
        have.add(r.rideId);
      }
    }
  } catch {
    /* corrupt/unreadable cache -> leave whatever was already in memory (D-023) */
  }
}

/** Test seam: resolves once every write scheduled so far has settled
 * (mirrors resultsStore.ts's flushResultWrites). */
export function flushFreeRideWrites(): Promise<void> {
  return writeTail;
}

/** Empties the in-memory store and disarms persistence, mirroring
 * resultsStore.ts's resetResultsStoreForTests / lastRide.ts's
 * resetRecorded. Originally test-only; WP-Q's "Reset to virgin"
 * (settings.tsx) is now a real production caller too. */
export function resetFreeRides(): void {
  rides = [];
  armedFs = null;
  writeTail = Promise.resolve();
}

/** Alias kept so the existing test suites need no changes. */
export const resetFreeRidesForTests = resetFreeRides;
