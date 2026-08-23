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

/** GPX+ events sidecar (rides/<rideId>.events.jsonl). Append-only, one JSON
 * object per line, same torn-tail discipline as the ride file. The ride JSONL
 * itself never changes (D-023); events are a separate, replayable record. */
export interface MetaEvent {
  kind: 'meta';
  tUnixMs: number;
  schemaVersion: number;
  appVersion?: string;
}
export interface ButtonEvent {
  kind: 'button';
  tUnixMs: number;
  button: 'start' | 'pause' | 'resume' | 'end';
}
export interface LockEvent {
  kind: 'lock';
  tUnixMs: number;
  track: string;
  atChainageM: number;
  /** epoch s of the fix that produced the lock */
  atT: number;
  /** Cycle 024 (WP-D2): which kind of lock this is (soft/verified/finalized —
   * engine.ts's LockKind, minus 'none'). Named `lockKind` rather than `kind`
   * because `kind: 'lock'` above is THIS interface's own RideEvent
   * discriminant — reusing the name would collide with it (and, worse, would
   * silently overwrite it in the persisted JSON, since encodeEvent spreads a
   * plain object literal). Optional so an older sidecar file without it still
   * decodes (eventsJsonl.ts's decoder is field-tolerant). */
  lockKind?: 'soft' | 'verified' | 'finalized';
  /** the RECORD-tab route pick in effect when this lock fired, or null/absent */
  pick?: string | null;
}
export interface GateFireEvent {
  kind: 'gate';
  tUnixMs: number;
  track: string;
  gateIndex: number;
  /** interpolated crossing time, epoch s (GateEvent.time verbatim) */
  t: number;
  estimated: boolean;
}
export interface StorageErrorEvent {
  kind: 'storageError';
  tUnixMs: number;
  message: string;
}
export interface RelaunchEvent {
  kind: 'relaunch';
  tUnixMs: number;
}
/** Cycle 023 fix 5a/5b: a route-lock attempt for one candidate track —
 * emitted for EVERY candidate (win or lose), not just the one that locks, so
 * a ride that never locks still leaves a diagnosable trail. Mirrors
 * live/engine.ts's DiagnosticEvent verbatim (track narrowed to string, same
 * as LockEvent/GateFireEvent above, since this is the persisted/replayable
 * shape rather than the in-memory TrackId-typed one). */
export interface RouteMatchDiagnosticEvent {
  kind: 'routeMatchDiagnostic';
  tUnixMs: number;
  track: string;
  /** 'anchor' = this candidate's chainage was (re-)seeded from this fix;
   * 'retry' = the single post-settle re-anchor (cycle 023 fix 2) itself;
   * 'lock' = this candidate just won the route lock. */
  phase: 'anchor' | 'retry' | 'lock';
  accuracyM: number | null;
  thresholdM: number;
  poorAccuracy: boolean;
}
/** Cycle 023 fix 3/5b: a single-fix elevation delta whose implied vertical
 * rate exceeds the noise threshold — flagged only, never mutated (D-023);
 * the ride's raw `ele` values are untouched on disk. */
export interface ElevationOutlierEvent {
  kind: 'elevationOutlier';
  tUnixMs: number;
  deltaM: number;
  dtS: number;
  thresholdMps: number;
}
export type RideEvent =
  | MetaEvent | ButtonEvent | LockEvent | GateFireEvent | StorageErrorEvent | RelaunchEvent
  | RouteMatchDiagnosticEvent | ElevationOutlierEvent;

export interface DecodedEvents {
  events: RideEvent[];
  nDropped: number;
}
