/** Qualifire storage — the Principal's interface contract, implemented exactly.
 *
 *   startRide(): Promise<string>
 *   appendFix(rideId, fix): Promise<void>
 *   endRide(rideId): Promise<{rideId, nFixes, startMs, endMs}>
 *   listRides(): Promise<Array<{rideId, startMs, endMs, nFixes}>>
 *   exportGpx(rideId): Promise<string>   // GPX 1.1 document text
 *
 * Backed by expo-file-system (this import chain touches expo — headless tests
 * should import core.ts + fsAdapter.ts instead; see README.md).
 */
import type { Fix, RideMeta } from './types.ts';
import { createStorage, type RideStorage } from './core.ts';
import { createExpoFsAdapter } from './expoFsAdapter.ts';

let instance: RideStorage | null = null;
function storage(): RideStorage {
  return (instance ??= createStorage(createExpoFsAdapter()));
}

/** Creates the ride file (header line) and returns its rideId. */
export function startRide(): Promise<string> {
  return storage().startRide();
}

/** Appends one fix, flushed to disk before resolving. Stored verbatim. */
export function appendFix(
  rideId: string,
  fix: { lat: number; lon: number; ele?: number; tUnixMs: number; accuracyM?: number },
): Promise<void> {
  return storage().appendFix(rideId, fix);
}

/** Seals the ride (appends an end record) and returns meta derived from disk. */
export function endRide(
  rideId: string,
): Promise<{ rideId: string; nFixes: number; startMs: number; endMs: number }> {
  return storage().endRide(rideId);
}

/** All rides, oldest first. Crashed (never-ended) rides report honest derived numbers. */
export function listRides(): Promise<
  Array<{ rideId: string; startMs: number; endMs: number; nFixes: number }>
> {
  return storage().listRides();
}

/** GPX 1.1 text with per-point <ele> and <time>; parseable by @qualifire/core's parser. */
export function exportGpx(rideId: string): Promise<string> {
  return storage().exportGpx(rideId);
}

/** Permanently removes a ride (file + index entry). Refuses while recording. */
export function deleteRide(rideId: string): Promise<void> {
  return storage().deleteRide(rideId);
}

// Re-exports for tests and future callers (pure modules; no expo in their chains).
export type { Fix, RideMeta };
export { createStorage, type RideStorage, type StorageOptions } from './core.ts';
export { createMemoryFsAdapter, type FsAdapter } from './fsAdapter.ts';
export { SCHEMA_VERSION } from './types.ts';
