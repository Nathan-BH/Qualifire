/** index.json handling. Pure — no expo, no Node imports.
 *
 * The index is a convenience cache so listRides() does not scan every ride
 * file. It is always rebuildable from the ride files themselves; a corrupt or
 * missing index is recovered, never trusted over the JSONL.
 */
import type { IndexEntry, RideIndex } from './types.ts';
import { SCHEMA_VERSION } from './types.ts';

export function emptyIndex(): RideIndex {
  return { schemaVersion: SCHEMA_VERSION, rides: [] };
}

/** Returns null on corrupt/unrecognisable text so the caller triggers a rebuild. */
export function decodeIndex(text: string): RideIndex | null {
  try {
    const parsed = JSON.parse(text) as RideIndex;
    if (!parsed || !Array.isArray(parsed.rides)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function encodeIndex(index: RideIndex): string {
  return JSON.stringify(index, null, 1) + '\n';
}

/** Drops the entry for rideId; returns the index unchanged if absent. */
export function removeEntry(index: RideIndex, rideId: string): RideIndex {
  return {
    schemaVersion: SCHEMA_VERSION,
    rides: index.rides.filter((r) => r.rideId !== rideId),
  };
}

/** Replaces (by rideId) or inserts; keeps rides sorted by startMs ascending. */
export function upsertEntry(index: RideIndex, entry: IndexEntry): RideIndex {
  const rides = index.rides.filter((r) => r.rideId !== entry.rideId);
  rides.push(entry);
  rides.sort((a, b) => a.startMs - b.startMs || (a.rideId < b.rideId ? -1 : 1));
  return { schemaVersion: SCHEMA_VERSION, rides };
}
