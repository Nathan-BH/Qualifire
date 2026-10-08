/**
 * Live sector engine — the session-side wrapper that feeds the recording
 * loop's 1 Hz GPS fixes into app/core's parity-proven detector. [UNTESTED ON
 * DEVICE — headless-replayable: pure TS, no expo/RN imports.]
 *
 * Division of labour (working rule: adapt the session side, never the engine):
 *  - core/live.ts   LiveProjector + GateDetector — gate firing, D-016(a)/(b),
 *                   'estimated' marks. Used verbatim, one instance per candidate.
 *  - core/timing.ts + kinematics.ts — once a gate fires, the completed
 *                   sectors' numbers (raw/stopped/moving, interrupted/offroute
 *                   flags) are recomputed by the OFFLINE pipeline over the
 *                   fixes recorded so far: the exact code that is
 *                   parity-proven at 1 µs, run on-demand (~5 times per ride,
 *                   ~1e5 ops — negligible). Live events supply the instant of
 *                   firing and the 'estimated' mark; offline supplies the
 *                   times shown.
 *  - this file      sector/lap state assembly and a subscribe() feed for the UI.
 *
 * The START pick is the ONE reference (virgin-cycle21, Nathan 2026-10-03:
 * "never lock any ways into the ride; the absolute reference is the user pick
 * at the start"). start({pickId}) builds exactly one candidate, the pick's, and
 * it is the reference from the first call; a ride with no pick (or a pick
 * outside the wayIds-scoped set) has NO reference for the whole ride. There is
 * no route detection, no lock, no switching, and finalize() never recovers
 * another way: a rider who leaves the picked road is scored as missed sectors
 * on the pick (rule since 2026-08-29). The only ride-end verdict: a reference
 * whose candidate never fired a single gate is unmatched. History: README.md
 * of cycles/virgin-cycle21.
 *
 * Honesty rules surfaced to the UI (D-013 / D-016(b) / D-021):
 *  - a sector whose bounding events include an 'estimated' fire shows ~raw
 *    time only, never a moving time, never a colour;
 *  - gates skipped by late GPS lock => sector 'missed';
 *  - an off-corridor excursion inside a sector => 'missed' (detour, D-015);
 *  - no benchmark store exists yet, so every clean sector is NEUTRAL and
 *    deltas are blank (D-008 warm-up / D-021 no-reference rule) — tiers and
 *    deltas arrive with the benchmark work, not fake numbers here.
 *
 * Buzz (D-019): unchanged mechanism (gateFires delta, src/location/index.ts).
 *
 * D-023 (raw forever): everything here is DERIVED and in-memory only; nothing
 * is persisted. The ride JSONL stays untouched.
 *
 * FREE MODE — retired (virgin-cycle16 04, Nathan 2026-09-28): a "free ride" is
 * a post-ride label (store/freeRides.ts), never an engine mode.
 */
import {
  DEFAULT_LIVE_OPTIONS,
  GateDetector,
  LiveProjector,
  computeKinematics,
  interp1,
  nearestOnSegments,
  projectRideOffline,
  searchsortedLeft,
  sectorTimes,
  stoppedTimeBetween,
  toXY,
  xyToLatLon,
  type GateEvent,
  type RefLine,
  type TrackId,
} from '../../core/src/index.ts';
import { catalogTrackSpecs } from './tracks.ts';

/** Memory guard: 4 h at 1 Hz. Past this the engine stops (recording doesn't). */
const MAX_BUFFERED_FIXES = 14400;
/** Cycle 023 fix 2: a candidate's very first fix seeds LiveProjector's
 * chainage via a GLOBAL pass-aware vertex search (no window yet) — a fix this
 * inaccurate can seed the wrong point on the polyline entirely, and because
 * projection is forward-only-monotonic there is no way back. Above this
 * accuracy (metres) that anchor is untrustworthy enough to warrant a retry
 * once a better fix arrives. */
export const POOR_ACCURACY_M = 50;

export type LiveSector =
  | { kind: 'pending' }
  | { kind: 'current' }
  | {
      kind: 'done';
      rawS: number;
      stoppedS: number | null;
      movingS: number | null;
      interrupted: boolean;
      /** gap-derived timing (D-013): show ~raw, no moving time, no colour */
      estimated: boolean;
    }
  | { kind: 'missed'; reason: 'skipped' | 'offroute' };

export interface LiveLap {
  rawS: number | null;
  stoppedS: number | null;
  movingS: number | null;
  estimated: boolean;
}

/** One live candidate's route: id + reference polyline + gate chainages.
 * catalogTrackSpecs() (tracks.ts) builds one per ratified catalog route;
 * tests inject a smaller legacy set (tests/lib.ts's fixtureSpecs()). */
export interface TrackSpec {
  id: string;
  ref: RefLine;
  gates: number[];
}


export interface EngineStartOptions {
  /** the RECORD-tab pick (a TrackSpec id), or null/omitted for a ride with no
   * reference. The pick is the one and only reference from START (see the
   * file header); it is never changed. */
  pickId?: string | null;
  /** WP-B coordinator addendum: restricts the spec set to specs whose id is in
   * this list. `undefined`/`null` = every spec. A pick outside the filtered
   * set is "no reference". */
  wayIds?: string[] | null;
}

/** Raw engine events for the GPX+ sidecar: gate fires of the pick's candidate
 * (virgin-cycle21: the old 'lock' / 'lockChange' members are retired; saved
 * rides still carry them, storage/types.ts keeps reading them). */
export type EngineEvent =
  { type: 'gate'; track: TrackId; gateIndex: number; t: number; estimated: boolean };

/** Route-match diagnostics (cycle 023 fix 5a) — a DISTINCT channel from both
 * the live-state feed (subscribe) and the ride-record events (subscribeEvents):
 * diagnostics are a different consumer (troubleshooting, not display or the
 * ride record) at a different cadence (once per anchor/retry of the pick's
 * candidate), and forcing every live-state listener to filter this noise
 * out would be the wrong coupling. */
export type DiagnosticEvent = {
  type: 'wayMatchAttempt';
  track: TrackId;
  /** 'anchor' = the candidate's first fix (or its post-retry re-anchor) seeded
   * its chainage; 'retry' = the single post-settle re-anchor itself (fired
   * alongside the 'anchor' that follows it, same tick). ('lock' existed
   * before virgin-cycle21; the engine no longer emits it.) */
  phase: 'anchor' | 'retry';
  /** accuracy (metres) of the fix that triggered this attempt; null if unknown */
  accuracyM: number | null;
  thresholdM: number;
  poorAccuracy: boolean;
  /** WP-G Part 2 gap-fill: this candidate's own cross-track deviation (m) at
   * the triggering fix (from LiveFix.xtd) — the "per-candidate deviation"
   * ride-3-style diagnostics needed but cycle 023 fix 5a did not yet capture.
   * null for the 'retry' phase itself: the fresh candidate hasn't processed
   * a fix yet at that instant (the 'anchor' fired the same tick right after
   * carries the real value). */
  xtdM: number | null;
  atT: number;
};

export interface LiveEngineState {
  /** 'locked' = running with the START pick as the reference; 'detecting' =
   * running with NO reference (virgin-cycle21: no detection happens, the name
   * is kept for the union's sake); 'finished' once the pick's FINISH fires. */
  phase: 'idle' | 'detecting' | 'locked' | 'finished';
  /** the START pick (the reference for the whole ride), or null when the ride
   * has none (or finalize() found the pick never fired a gate) */
  track: TrackId | null;
  /** one entry per sector of the reference track (or the default four, pending) */
  sectors: LiveSector[];
  /** 1-based sector currently being ridden; null pre-start / post-finish */
  currentSector: number | null;
  /** 1-based sector of the most recent gate fire (>= gate 1); null before */
  lastDone: number | null;
  /** set once when the FINISH gate fires (D-022 handover) */
  lap: LiveLap | null;
  /** total gate events fired so far — the buzz counter (one buzz per fire) */
  gateFires: number;
  fixesFed: number;
  /** last fix was within the corridor of the reference track */
  onWay: boolean;
  /** the RECORD-tab pick this ride started with, or null (logged) */
  pick: string | null;
  /** virgin-cycle6 (self racing): epoch SECONDS the reference candidate
   * (`track`) crossed gate 0, estimated crossings included; null before
   * that crossing, and whenever `track` is null. Read-only
   * mirror of that candidate's own gate-0 event — never feeds any timing
   * arithmetic. */
  startGateT: number | null;
  /** follow-up (live PX): the reference candidate's current monotonic chainage in metres
   *  (its LiveProjector.chainage), null whenever `track` is null. Display-only mirror —
   *  never feeds gate logic or timing. */
  chainageM: number | null;
  /** virgin-cycle20 brief 02: DISPLAY-ONLY nearest point on the reference
   *  candidate's reference line for the live rider dot — degrees of the
   *  projection of the last fed fix plus that fix's cross-track distance (m).
   *  null whenever `track` is null, or the projector's search window was empty
   *  for that fix. A read-only mirror like chainageM: never feeds chainage,
   *  gates or timing. ui/riderDotModel.ts decides what to draw from it. */
  riderSnap: { lat: number; lon: number; xtdM: number } | null;
}

interface Candidate {
  track: TrackId;
  ref: RefLine;
  gates: number[];
  proj: LiveProjector;
  det: GateDetector;
  events: GateEvent[];
  /** chainage at the first fix (null until one is fed) — see the retry rule */
  baseS: number | null;
  onWay: boolean;
  /** accuracy (metres) of the fix that set baseS; null if unknown at the time */
  baseAccuracyM: number | null;
  /** cycle 023 fix 2: at most one post-settle re-anchor per candidate */
  retried: boolean;
  /** WP-G Part 2 gap-fill: this candidate's own cross-track deviation (m) at
   * its most recent fed fix (LiveFix.xtd verbatim) — surfaced in diagnostics. */
  lastXtd: number;
  /** virgin-cycle20 brief 02: display-only nearest point of the last fed fix
   * on this candidate's reference — chainage of the hit (NOT the monotonic
   * projector chainage) and its distance. null = no fix yet / empty window. */
  lastSnap: { s: number; xtdM: number } | null;
}

/** virgin-cycle20 brief 02: the rider-dot projection. Re-runs the projector's
 * own windowed nearest-segment search — window [sp - windowBack, sp + windowFwd]
 * around the candidate's CURRENT (post-update) chainage, same lo/hi arithmetic
 * as core/live.ts LiveProjector.update — and returns the hit's TRUE chainage
 * and distance, unclamped by monotonicity. Never fed back into the projector,
 * the gate detector or recompute(): a display mirror only. */
function displayProjection(ref: RefLine, sp: number, x: number, y: number): { s: number; xtdM: number } | null {
  const { ch } = ref;
  const nseg = ch.length - 1;
  let lo = searchsortedLeft(ch, sp - DEFAULT_LIVE_OPTIONS.windowBack);
  let hi = searchsortedLeft(ch, sp + DEFAULT_LIVE_OPTIONS.windowFwd);
  lo = Math.max(0, lo - 1);
  hi = Math.min(nseg, hi);
  if (hi <= lo) return null;
  const hit = nearestOnSegments(x, y, ref, lo, hi);
  return { s: hit.s, xtdM: hit.dist };
}

const N_SECTORS_DEFAULT = 4; // the legacy four commute tracks all have 4 sectors

function pendingSectors(n: number): LiveSector[] {
  return Array.from({ length: n }, () => ({ kind: 'pending' as const }));
}

export class LiveEngine {
  /** Injected by tests; null = resolve catalogTrackSpecs() at every start()
   * (B-39: the runtime catalog can be empty at boot and grow later, so the
   * module-scope singleton must never snapshot it at construction). */
  private readonly specs: TrackSpec[] | null;
  private phase: LiveEngineState['phase'] = 'idle';
  /** zero or one candidate: the START pick's */
  private cands: Candidate[] = [];
  /** the reference candidate (the START pick's); null = no reference. Name kept
   * from the lock era to limit churn. */
  private locked: Candidate | null = null;
  private pick: string | null = null;
  private sectors: LiveSector[] = pendingSectors(N_SECTORS_DEFAULT);
  private lap: LiveLap | null = null;
  private fixesFed = 0;
  private onWay = false;
  private tBuf: number[] = [];
  private latBuf: number[] = [];
  private lonBuf: number[] = [];
  private listeners = new Set<(s: LiveEngineState) => void>();
  private evListeners = new Set<(e: EngineEvent) => void>();
  private diagListeners = new Set<(e: DiagnosticEvent) => void>();

  /** Default: specs from catalogTrackSpecs() (tracks.ts), of which only the
   * pick's becomes a candidate. Tests inject a smaller/legacy set explicitly. */
  constructor(specs?: TrackSpec[]) {
    this.specs = specs ?? null;
  }

  start(opts?: EngineStartOptions): void {
    this.pick = opts?.pickId ?? null;
    const allSpecs = this.specs ?? catalogTrackSpecs();
    // WP-B coordinator addendum: wayIds (undefined/null => every spec) scopes
    // the spec set FIRST, so a pick outside the scoped set is "no reference".
    const specs = opts?.wayIds ? allSpecs.filter((s) => opts.wayIds!.includes(s.id)) : allSpecs;
    const pickSpec = this.pick !== null ? specs.find((s) => s.id === this.pick) : undefined;
    this.cands = pickSpec
      ? [{
          track: pickSpec.id,
          ref: pickSpec.ref,
          gates: pickSpec.gates,
          proj: new LiveProjector(pickSpec.ref),
          det: new GateDetector(pickSpec.gates),
          events: [],
          baseS: null,
          onWay: false,
          baseAccuracyM: null,
          retried: false,
          lastXtd: 999,
          lastSnap: null,
        }]
      : [];
    this.locked = this.cands[0] ?? null;
    this.phase = this.locked ? 'locked' : 'detecting';
    this.sectors = pendingSectors(pickSpec ? pickSpec.gates.length - 1 : N_SECTORS_DEFAULT);
    this.lap = null;
    this.fixesFed = 0;
    this.onWay = false;
    this.tBuf = [];
    this.latBuf = [];
    this.lonBuf = [];
    this.emit();
  }

  stop(): void {
    this.phase = 'idle';
    this.cands = [];
    this.locked = null;
    this.pick = null;
    this.emit();
  }

  /** Feed one raw GPS fix (degrees, epoch ms). `accuracyM` (metres, per the
   * fix's reported horizontal accuracy) is optional — undefined is treated as
   * "unknown", never as poor. `flagged` (cycle 025 WP-stale-first-fix P1,
   * record-but-flag) marks a pre-START / warm-up fix the recording loop
   * already classified: it contributes NOTHING derived — not buffered, no
   * candidate anchoring, not even the idle auto-start below. The
   * raw JSONL still records it (location/index.ts appends before feeding).
   * Never throws into the caller's recording loop — display state is worth
   * strictly less than the raw ride. */
  feed(lat: number, lon: number, tUnixMs: number, accuracyM?: number, flagged?: boolean): void {
    if (flagged === true) return;
    // Defensive: a feed with no start() (should not happen since virgin-cycle21 04 —
    // an interrupted ride is never fed) auto-starts with NO options = no reference.
    if (this.phase === 'idle') this.start();
    if (this.fixesFed >= MAX_BUFFERED_FIXES) return;
    const tSec = tUnixMs / 1000;
    this.tBuf.push(tSec);
    this.latBuf.push(lat);
    this.lonBuf.push(lon);
    this.fixesFed += 1;

    const c = this.locked;
    if (c === null) {
      // No reference: only the buffers advance.
      this.emit();
      return;
    }
    let dirty = false;
    const poorNow = accuracyM !== undefined && accuracyM > POOR_ACCURACY_M;
    // Cycle 023 fix 2: the FIRST fix anchors the candidate's chainage via a
    // global pass-aware vertex search (core/live.ts LiveProjector) — if that
    // fix's accuracy was poor, the anchor can land on the wrong part of the
    // polyline entirely, and forward-only projection can never correct it
    // afterwards. Guarded to fire at most once, only when the ORIGINAL anchor
    // was actually poor, and (virgin-cycle21) only while no gate has fired:
    // a re-seed discards c.events, and the one candidate lives the whole ride.
    if (
      c.baseS !== null && !c.retried &&
      c.baseAccuracyM !== null && c.baseAccuracyM > POOR_ACCURACY_M &&
      !poorNow && c.events.length === 0
    ) {
      c.proj = new LiveProjector(c.ref);
      c.det = new GateDetector(c.gates);
      c.events = [];
      c.baseS = null;
      c.retried = true;
      c.lastXtd = 999; // fresh candidate: nothing fed yet this instant
      c.lastSnap = null;
      dirty = true;
      this.emitDiagnostic({
        type: 'wayMatchAttempt', track: c.track, phase: 'retry',
        accuracyM: accuracyM ?? null, thresholdM: POOR_ACCURACY_M, poorAccuracy: false,
        xtdM: null, atT: tSec,
      });
    }
    const wasAnchored = c.baseS !== null;
    const evs = this.feedCandidate(c, lat, lon, tSec);
    for (const e of evs) {
      this.emitEvent({
        type: 'gate', track: c.track, gateIndex: e.gateIndex, t: e.time, estimated: e.estimated,
      });
    }
    if (!wasAnchored && c.baseS !== null) {
      c.baseAccuracyM = accuracyM ?? null;
      this.emitDiagnostic({
        type: 'wayMatchAttempt', track: c.track, phase: 'anchor',
        accuracyM: accuracyM ?? null, thresholdM: POOR_ACCURACY_M, poorAccuracy: poorNow,
        xtdM: c.lastXtd, atT: tSec,
      });
    }
    this.onWay = c.onWay;
    if (evs.length > 0 || dirty) this.recompute();
    this.emit();
  }

  /** Called once when the ride ends (src/location/index.ts's stopTracking(),
   * and defensively again from RecordScreen's onEnd before it): a reference
   * that never fired a gate = unmatched. Idempotent. */
  finalize(): void {
    const c = this.locked;
    if (c !== null && c.events.length === 0) {
      this.locked = null;
      this.sectors = pendingSectors(this.sectors.length);
    }
    this.emit();
  }

  getState(): LiveEngineState {
    // Everything positional below reads the one reference candidate.
    const c = this.locked;
    const det = c?.det ?? null;
    const next = det ? det.nextGateIndex : 0;
    const nGates = c ? c.gates.length : this.sectors.length + 1;
    let currentSector: number | null = null;
    if (det && next >= 1 && next < nGates) currentSector = next;
    let lastDone: number | null = null;
    if (c) {
      for (const e of c.events) {
        if (e.gateIndex >= 1) lastDone = Math.max(lastDone ?? 0, e.gateIndex);
      }
    }
    // virgin-cycle6 (self racing): the reference candidate's own gate-0
    // event, if it has fired one yet.
    let startGateT: number | null = null;
    if (c) {
      const g0 = c.events.find((e) => e.gateIndex === 0);
      if (g0) startGateT = g0.time;
    }
    return {
      phase: this.phase,
      track: c ? c.track : null,
      sectors: [...this.sectors],
      currentSector,
      lastDone,
      lap: this.lap,
      gateFires: c ? c.events.length : 0,
      fixesFed: this.fixesFed,
      onWay: this.onWay,
      pick: this.pick,
      startGateT,
      chainageM: c ? c.proj.chainage : null,
      riderSnap: this.riderSnapOf(c),
    };
  }


  /** virgin-cycle20 brief 02: the reference candidate's last display projection
   * in degrees — interp1 over the 5 m-resampled reference gives the exact point
   * on the hit segment; xyToLatLon is the inverse of the toXY the fix went
   * through. Pure read of stored state; no projector call. */
  private riderSnapOf(c: Candidate | null): LiveEngineState['riderSnap'] {
    if (!c || c.lastSnap === null) return null;
    const { ref } = c;
    const x = interp1(c.lastSnap.s, ref.ch, ref.rx);
    const y = interp1(c.lastSnap.s, ref.ch, ref.ry);
    const [lat, lon] = xyToLatLon(x, y, ref.lat0, ref.lon0);
    return { lat, lon, xtdM: c.lastSnap.xtdM };
  }

  subscribe(fn: (s: LiveEngineState) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  subscribeEvents(fn: (e: EngineEvent) => void): () => void {
    this.evListeners.add(fn);
    return () => { this.evListeners.delete(fn); };
  }

  /** Cycle 023 fix 5a — route-match diagnostics, a channel distinct from both
   * subscribe() (live state) and subscribeEvents() (the ride's gate
   * record): see DiagnosticEvent's doc comment for why. */
  subscribeDiagnostics(fn: (e: DiagnosticEvent) => void): () => void {
    this.diagListeners.add(fn);
    return () => { this.diagListeners.delete(fn); };
  }

  // ------------------------------------------------------------------ private

  private emitEvent(e: EngineEvent): void {
    this.evListeners.forEach((fn) => { try { fn(e); } catch { /* diagnostics only */ } });
  }

  private emitDiagnostic(e: DiagnosticEvent): void {
    this.diagListeners.forEach((fn) => { try { fn(e); } catch { /* diagnostics only */ } });
  }

  private feedCandidate(c: Candidate, lat: number, lon: number, tSec: number): GateEvent[] {
    // Per-fix planar transform in this candidate's track frame (same toXY as
    // the parity pipeline; two tiny arrays per call — negligible at 1 Hz).
    const xy = toXY([lat], [lon], c.ref.lat0, c.ref.lon0);
    const fix = c.proj.update(xy.x[0], xy.y[0], tSec);
    c.lastXtd = fix.xtd; // WP-G Part 2 gap-fill: per-candidate deviation for diagnostics
    // virgin-cycle20 brief 02: display-only rider-dot projection around the
    // chainage the projector just settled on (see displayProjection).
    c.lastSnap = displayProjection(c.ref, c.proj.chainage, xy.x[0], xy.y[0]);
    if (c.baseS === null) c.baseS = fix.s;
    c.onWay = fix.onRoute;
    const events = c.det.update(tSec, fix.s);
    if (events.length === 0) return events;
    c.events.push(...events);
    return events;
  }

  /** Rebuild sector/lap state: live events say WHEN and whether estimated;
   * the offline parity pipeline over the buffer says HOW LONG (raw/stopped/
   * moving) and catches interrupted/offroute. */
  private recompute(): void {
    const cand = this.locked;
    if (!cand) return;
    const gates = cand.gates;
    const nSec = gates.length - 1;
    const ev: (GateEvent | null)[] = new Array<GateEvent | null>(gates.length).fill(null);
    for (const e of cand.events) ev[e.gateIndex] = e;
    const skipped = new Set(cand.det.skippedGates);

    let rows: ReturnType<typeof sectorTimes> | null = null;
    let stopped: Uint8Array | null = null;
    if (this.tBuf.length >= 2) {
      const { x, y } = toXY(this.latBuf, this.lonBuf, cand.ref.lat0, cand.ref.lon0);
      const { s, xtd } = projectRideOffline(x, y, cand.ref);
      const kin = computeKinematics(this.tBuf, x, y);
      stopped = kin.stopped;
      rows = sectorTimes({ t: this.tBuf, s, xtd, stopped: kin.stopped }, gates);
    }

    const next = cand.det.nextGateIndex;
    const out: LiveSector[] = [];
    for (let k = 1; k <= nSec; k++) {
      const a = ev[k - 1];
      const b = ev[k];
      if (skipped.has(k - 1) || skipped.has(k)) {
        out.push({ kind: 'missed', reason: 'skipped' });
        continue;
      }
      if (!b) {
        out.push(next === k ? { kind: 'current' } : { kind: 'pending' });
        continue;
      }
      if (!a) {
        // exit fired but entry never did and wasn't "skipped" — treat as missed
        out.push({ kind: 'missed', reason: 'skipped' });
        continue;
      }
      const est = a.estimated || b.estimated;
      const row = rows ? rows[k - 1] : null;
      if (!est && row && row.flag === 'excluded_offroute') {
        out.push({ kind: 'missed', reason: 'offroute' });
      } else if (
        !est &&
        row &&
        (row.flag === 'clean' || row.flag === 'interrupted') &&
        row.rawS !== null
      ) {
        out.push({
          kind: 'done',
          rawS: row.rawS,
          stoppedS: row.stoppedS,
          movingS: row.movingS,
          interrupted: row.flag === 'interrupted',
          estimated: false,
        });
      } else {
        // estimated fire, or offline saw no crossing (gap): ~raw from live
        // event times only — never a moving time on interpolated numbers.
        out.push({
          kind: 'done',
          rawS: b.time - a.time,
          stoppedS: null,
          movingS: null,
          interrupted: false,
          estimated: true,
        });
      }
    }
    this.sectors = out;

    // D-022 handover: FINISH gate fired => the lap is scored once.
    const evStart = ev[0];
    const evFin = ev[nSec];
    // D-022's handover: the reference candidate's FINISH scores the lap once.
    if (evFin && this.lap === null) {
      const anyDirty = out.some(
        (s) => s.kind === 'missed' || (s.kind === 'done' && s.estimated),
      );
      const estimated =
        anyDirty || evStart === null || evStart.estimated || evFin.estimated;
      // HEADLINE-TIME DEFINITION (pinned 2026-08-27, cycle 025): the lap is
      // GATED — START gate event time to FINISH gate event time — never the
      // button-to-button recording duration. ResultScreen's big figure and
      // store/derive.ts's offline lap both rest on this line.
      const rawS = evStart ? evFin.time - evStart.time : null;
      let stoppedS: number | null = null;
      let movingS: number | null = null;
      if (!estimated && rawS !== null && evStart && stopped) {
        stoppedS = stoppedTimeBetween(this.tBuf, stopped, evStart.time, evFin.time);
        movingS = rawS - stoppedS;
      }
      this.lap = { rawS, stoppedS, movingS, estimated };
      this.phase = 'finished';
    }
  }

  private emit(): void {
    const snap = this.getState();
    this.listeners.forEach((fn) => fn(snap));
  }
}

/** The recording singleton — fed by the foreground-service location task.
 * Demos/tests construct their own LiveEngine instances; this one is the ride. */
export const liveEngine = new LiveEngine();
