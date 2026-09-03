/** Storage types. Pure — no expo, no Node imports (QA runs this headless). */

export const SCHEMA_VERSION = 1;

/** A GPS fix exactly as handed to appendFix. Stored verbatim, never rewritten. */
export interface Fix {
  lat: number;
  lon: number;
  ele?: number;
  tUnixMs: number;
  accuracyM?: number;
  /** Cycle 025 (WP-stale-first-fix P1, Nathan 2026-08-26 record-but-flag):
   * this fix's timestamp precedes the START press — a stale cached Android
   * fix delivered after the button (observed on all four ride days; worst:
   * −9.1 s). The fix is still recorded like any other (D-023 — this field is
   * ADDITIVE only, written only when true; nothing existing is renamed,
   * removed, or restructured); every DERIVED consumer (engine feed, export
   * stats, matcher anchoring) excludes it. */
  preStart?: boolean;
  /** Same pass: poor/unknown-accuracy fix during the initial GPS warm-up
   * window, before the first good fix (location/fixFlags.ts: accuracy >
   * WARMUP_ACC_M, capped at WARMUP_MAX_S so a bad-GPS day never flags a
   * whole ride). Written only when true. */
  warmup?: boolean;
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
  /** WP-B fix B2: which mode this ride was recorded in. Optional — absent
   * (an entry written before this fix, or one recovered by rebuildIndex,
   * which cannot read mode back out of the raw JSONL — D-023) is treated as
   * 'route' by omission, same back-compat precedent as `status` above. */
  mode?: 'route' | 'free';
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
/** N9 (2026-09-02, GPX+ pick/lock-change logging): a START-time fact — what
 * the RECORD tab was set to when START was pressed. Exactly one per ride,
 * logged by src/location/index.ts's startTracking(). Every field beyond
 * `mode` is optional so an older sidecar (or a minimal test fixture) still
 * decodes; `pickSource` is always present when the event was logged by real
 * RecordScreen code — 'picked'/'default'/'none' says out loud whether the
 * pick was an explicit tap, the §8a default, or no pick at all, rather than
 * leaving "no pick" to the absence of `routeId`. */
export interface PickEvent {
  kind: 'pick';
  tUnixMs: number;
  mode: 'route' | 'free';
  from?: string;
  to?: string;
  fromLabel?: string;
  toLabel?: string;
  routeId?: string | null;
  pickSource?: 'picked' | 'default' | 'none';
  routeIds?: string[] | null;
}
/** N9: one per `live/engine.ts` LockKind transition (LiveEngine.noteLockChange) —
 * closes the two transitions (soft->verified promotion, soft/none->finalized
 * ride-end settle) that used to leave no trace in the sidecar at all. `reason`
 * names the mechanism (engine.ts's LockChangeReason, mirrored here as the
 * persisted/replayable string union — same pattern as LockEvent.lockKind
 * above). */
export interface LockChangeEvent {
  kind: 'lockChange';
  tUnixMs: number;
  track: string;
  from: 'none' | 'soft' | 'verified' | 'finalized';
  to: 'soft' | 'verified' | 'finalized';
  atChainageM: number;
  atT: number;
  reason: 'pickAdvance' | 'unblockedLeader' | 'routeCompleted' | 'rideEndPromotion';
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
  /** Cycle 025 (P4): seconds between the session marker's last heartbeat
   * (ActiveSession.lastAliveAtMs, session.ts) and this relaunch recovery —
   * how long the process was actually dead, accurate to the ~30-fix
   * heartbeat cadence. Optional so a sidecar recorded before this field
   * existed, or a marker without a heartbeat, still decodes — omitted,
   * never fabricated. */
  downS?: number;
}

/** Cycle 025 (P5, Nathan's 2026-08-26 visibility-first ruling): a UI-only
 * restoration — RecordScreen mounted and found an in-progress, still-tracking
 * session while the JS process stayed alive (no process death). Logged so the
 * "recovered" banner ALWAYS has a matching sidecar record (one shared
 * predicate, location/index.ts's getRecoveryState), but a remount is NEVER a
 * relaunch: the GPX+ <qf:relaunches> count filters on kind === 'relaunch'
 * only, so this kind can never inflate the true process-death count. */
export interface RemountEvent {
  kind: 'remount';
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
  /** Cycle 024 (WP-G Part 2 gap-fill): this candidate's own cross-track
   * deviation (m) at the triggering fix — null when not yet meaningful (the
   * 'retry' phase itself, fired before the fresh candidate has processed any
   * fix). Optional so an older sidecar recorded before this field existed
   * still decodes (eventsJsonl.ts's decoder is field-tolerant on this one). */
  xtdM?: number | null;
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
  | RemountEvent
  | RouteMatchDiagnosticEvent | ElevationOutlierEvent
  | PickEvent | LockChangeEvent;

export interface DecodedEvents {
  events: RideEvent[];
  nDropped: number;
}
