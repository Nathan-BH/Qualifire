/** Storage types. Pure — no expo, no Node imports (QA runs this headless). */

export const SCHEMA_VERSION = 1;

/** A GPS fix exactly as handed to appendFix. Stored verbatim, never rewritten. */
export interface Fix {
  lat: number;
  lon: number;
  ele?: number;
  tUnixMs: number;
  accuracyM?: number;
}

/** First line of every ride file. */
export interface HeaderRecord {
  kind: 'header';
  schemaVersion: number;
  rideId: string;
  startedAtMs: number;
  recorder: string;
}

/** One line per fix, append-only. Field values are the Fix verbatim. */
export interface FixRecord extends Fix {
  kind: 'fix';
}

/** Appended by endRide. Its absence means the ride never ended cleanly. */
export interface EndRecord {
  kind: 'end';
  endedAtMs: number;
  nFixes: number;
}

export type RideRecord = HeaderRecord | FixRecord | EndRecord;

/** What decodeRideFile recovers from a ride file (tolerant of a torn tail). */
export interface DecodedRide {
  header: HeaderRecord | null;
  fixes: FixRecord[];
  end: EndRecord | null;
  /** lines that failed to parse (a crash tears at most the last one) */
  nDropped: number;
}

/** The shape the interface contract returns for a ride. */
export interface RideMeta {
  rideId: string;
  startMs: number;
  endMs: number;
  nFixes: number;
}

export interface IndexEntry {
  rideId: string;
  file: string;
  startMs: number;
  /** null while recording (or after a crash, until recovered) */
  endMs: number | null;
  nFixes: number;
  status: 'recording' | 'ended';
}

/** index.json — a derived convenience; always rebuildable from the ride files. */
export interface RideIndex {
  schemaVersion: number;
  rides: IndexEntry[];
}
