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
import type { LiveEngineState } from '../live/engine.ts';
import type { FsAdapter } from '../storage/fsAdapter.ts';

export const FREE_RIDES_CACHE_FILE = 'free-rides-cache.json';
const SCHEMA_VERSION = 1;

export interface FreeRideRecord {
  kind: 'freeRide';
  schemaVersion: 1;
  rideId: string;
  startedAtMs: number;
  crossings: { routeId: string; gateIndex: number; t: number; estimated: boolean }[];
  sectors: { routeId: string; index: number; rawS: number }[];
}

let rides: FreeRideRecord[] = [];
let armedFs: FsAdapter | null = null;
/** Serializes every write against FREE_RIDES_CACHE_FILE, last-write-wins,
 * mirroring resultsStore.ts's own writeTail. */
let writeTail: Promise<void> = Promise.resolve();

function isNonNullObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isValidCrossing(v: unknown): v is FreeRideRecord['crossings'][number] {
  return isNonNullObject(v)
    && typeof v.routeId === 'string'
    && typeof v.gateIndex === 'number'
    && typeof v.t === 'number'
    && typeof v.estimated === 'boolean';
}

function isValidFreeSector(v: unknown): v is FreeRideRecord['sectors'][number] {
  return isNonNullObject(v)
    && typeof v.routeId === 'string'
    && typeof v.index === 'number'
    && typeof v.rawS === 'number';
}

/** Structural guard for one stored free ride — every field a reader actually
 * uses must be present and of the right shape, or the entry is dropped
 * (mirrors resultsStore.ts's isValidRideResult). */
export function isValidFreeRideRecord(v: unknown): v is FreeRideRecord {
  if (!isNonNullObject(v)) return false;
  if (v.kind !== 'freeRide') return false;
  if (typeof v.rideId !== 'string') return false;
  if (typeof v.startedAtMs !== 'number' || !Number.isFinite(v.startedAtMs)) return false;
  if (!Array.isArray(v.crossings) || !v.crossings.every(isValidCrossing)) return false;
  if (!Array.isArray(v.sectors) || !v.sectors.every(isValidFreeSector)) return false;
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
    const parsed = JSON.parse(text) as unknown;
    if (!isNonNullObject(parsed) || !Array.isArray(parsed.rides)) return null;
    return parsed.rides.filter(isValidFreeRideRecord);
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

/** Hands a finished free ride to the store. No-op unless the ride actually
 * was a free ride that crossed at least one gate (an aborted free ride with
 * zero crossings has nothing honest to save — same "never invent a fire"
 * spirit as the engine's own armWithinM=0 rule).
 *
 * M1 fix: this is called from RecordScreen's onEnd, i.e. at ride-STOP, so
 * `Date.now()` alone would record the ride's END time as its start time.
 * `meta.startedAtMs` (the ride's real start, already in scope at the call
 * site — the same value passed to lastRide.ts's rememberRide) overrides it
 * when given; mirrors rememberRide(state, meta?)'s own shape. */
export function rememberFreeRide(st: LiveEngineState, meta?: { startedAtMs: number }): void {
  if (st.mode !== 'free' || st.freeCrossings.length === 0) return;
  const startedAtMs = meta?.startedAtMs ?? Date.now();
  const record: FreeRideRecord = {
    kind: 'freeRide',
    schemaVersion: 1,
    rideId: `free:${startedAtMs}`,
    startedAtMs,
    crossings: st.freeCrossings.map((c) => ({ ...c })),
    sectors: st.freeSectors.map((s) => ({ ...s })),
  };
  rides = [...rides, record];
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

/** Test-only: empties the in-memory store and disarms persistence, mirroring
 * resultsStore.ts's resetResultsStoreForTests / lastRide.ts's
 * resetRecordedForTests. */
export function resetFreeRidesForTests(): void {
  rides = [];
  armedFs = null;
  writeTail = Promise.resolve();
}
