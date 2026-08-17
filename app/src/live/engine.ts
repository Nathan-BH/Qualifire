/**
 * Live sector engine — the session-side wrapper that feeds the recording
 * loop's 1 Hz GPS fixes into app/core's parity-proven detector. [UNTESTED ON
 * DEVICE — headless-replayable: pure TS, no expo/RN imports.]
 *
 * Division of labour (working rule: adapt the session side, never the engine):
 *  - core/live.ts   LiveProjector + GateDetector — gate firing, D-016(a)/(b),
 *                   'estimated' marks. Used verbatim, one instance per track
 *                   candidate.
 *  - core/timing.ts + kinematics.ts — once a gate fires, the completed
 *                   sectors' numbers (raw/stopped/moving, interrupted/offroute
 *                   flags) are recomputed by the OFFLINE pipeline over the
 *                   fixes recorded so far: the exact code that is
 *                   parity-proven at 1 µs, run on-demand (~5 times per ride,
 *                   ~1e5 ops — negligible). Live events supply the instant of
 *                   firing and the 'estimated' mark; offline supplies the
 *                   times shown.
 *  - this file      route auto-detection, sector/lap state assembly, and a
 *                   subscribe() feed for the UI.
 *
 * Route auto-detection: all three tracks run as candidates. A candidate whose
 * chainage ADVANCES is being ridden; a wrong-direction or diverged candidate
 * freezes (forward-only projection) or falls off-corridor. Lock when the
 * leader has advanced >= LOCK_MIN_ADVANCE_M and leads every other candidate
 * by >= LOCK_MARGIN_M. Morning vs Evening locks in the first ~400 m; Evening
 * A vs B (shared exit from work) locks ~200 m after their physical split.
 * Gate events fired before lock are kept per candidate, so nothing is lost.
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
 * D-023 (raw forever): everything here is DERIVED and in-memory only; nothing
 * is persisted. The ride JSONL stays untouched.
 */
import {
  GateDetector,
  LiveProjector,
  computeKinematics,
  gateChainages,
  projectRideOffline,
  sectorTimes,
  stoppedTimeBetween,
  toXY,
  type GateEvent,
  type RefLine,
  type TrackId,
} from '../../core/src/index.ts';
import { TRACK_IDS, refFor } from './refs.ts';

export const LOCK_MIN_ADVANCE_M = 400;
export const LOCK_MARGIN_M = 200;
/** Memory guard: 4 h at 1 Hz. Past this the engine stops (recording doesn't). */
const MAX_BUFFERED_FIXES = 14400;

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

export interface LiveEngineState {
  phase: 'idle' | 'detecting' | 'locked' | 'finished';
  track: TrackId | null;
  /** one entry per sector of the (locked or presumed) track */
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
  /** last fix was within the corridor of the locked / leading track */
  onRoute: boolean;
}

interface Candidate {
  track: TrackId;
  ref: RefLine;
  proj: LiveProjector;
  det: GateDetector;
  events: GateEvent[];
  /** chainage at the first fix — advance is measured from here */
  baseS: number | null;
  adv: number;
  onRoute: boolean;
}

const N_SECTORS_DEFAULT = 4; // all three tracks have 4 sectors (D-016 gates)

function pendingSectors(n: number): LiveSector[] {
  return Array.from({ length: n }, () => ({ kind: 'pending' as const }));
}

export class LiveEngine {
  private phase: LiveEngineState['phase'] = 'idle';
  private cands: Candidate[] = [];
  private locked: Candidate | null = null;
  private sectors: LiveSector[] = pendingSectors(N_SECTORS_DEFAULT);
  private lap: LiveLap | null = null;
  private fixesFed = 0;
  private onRoute = false;
  private tBuf: number[] = [];
  private latBuf: number[] = [];
  private lonBuf: number[] = [];
  private listeners = new Set<(s: LiveEngineState) => void>();

  start(): void {
    this.phase = 'detecting';
    this.locked = null;
    this.sectors = pendingSectors(N_SECTORS_DEFAULT);
    this.lap = null;
    this.fixesFed = 0;
    this.onRoute = false;
    this.tBuf = [];
    this.latBuf = [];
    this.lonBuf = [];
    this.cands = TRACK_IDS.map((track) => {
      const ref = refFor(track);
      return {
        track,
        ref,
        proj: new LiveProjector(ref),
        det: new GateDetector(gateChainages(track)),
        events: [],
        baseS: null,
        adv: 0,
        onRoute: false,
      };
    });
    this.emit();
  }

  stop(): void {
    this.phase = 'idle';
    this.cands = [];
    this.locked = null;
    this.emit();
  }

  /** Feed one raw GPS fix (degrees, epoch ms). Never throws into the caller's
   * recording loop — display state is worth strictly less than the raw ride. */
  feed(lat: number, lon: number, tUnixMs: number): void {
    // Headless relaunch mid-ride: module state is fresh but fixes keep coming.
    // Auto-start; gates already behind resolve via D-016(b) arming/skip, so
    // earlier sectors surface honestly as estimated/missed.
    if (this.phase === 'idle') this.start();
    if (this.fixesFed >= MAX_BUFFERED_FIXES) return;
    const tSec = tUnixMs / 1000;
    this.tBuf.push(tSec);
    this.latBuf.push(lat);
    this.lonBuf.push(lon);
    this.fixesFed += 1;

    let fired = false;
    if (this.locked) {
      fired = this.feedCandidate(this.locked, lat, lon, tSec);
      this.onRoute = this.locked.onRoute;
    } else {
      for (const c of this.cands) {
        if (this.feedCandidate(c, lat, lon, tSec)) fired = true;
      }
      const lead = this.leader();
      this.onRoute = lead ? lead.onRoute : false;
      const second = this.cands.reduce(
        (m, c) => (c === lead ? m : Math.max(m, c.adv)),
        0,
      );
      if (lead && lead.adv >= LOCK_MIN_ADVANCE_M && lead.adv - second >= LOCK_MARGIN_M) {
        this.locked = lead;
        this.phase = 'locked';
        this.cands = [lead];
        fired = true; // force a recompute over the pre-lock event history
      }
    }
    if (fired && this.locked) this.recompute();
    this.emit();
  }

  getState(): LiveEngineState {
    const det = this.locked?.det ?? null;
    const next = det ? det.nextGateIndex : 0;
    const nGates = this.locked ? gateChainages(this.locked.track).length : N_SECTORS_DEFAULT + 1;
    let currentSector: number | null = null;
    if (det && next >= 1 && next < nGates) currentSector = next;
    let lastDone: number | null = null;
    if (this.locked) {
      for (const e of this.locked.events) {
        if (e.gateIndex >= 1) lastDone = Math.max(lastDone ?? 0, e.gateIndex);
      }
    }
    const gateFires = this.locked
      ? this.locked.events.length
      : this.cands.reduce((m, c) => Math.max(m, c.events.length), 0);
    return {
      phase: this.phase,
      track: this.locked ? this.locked.track : null,
      sectors: [...this.sectors],
      currentSector,
      lastDone,
      lap: this.lap,
      gateFires,
      fixesFed: this.fixesFed,
      onRoute: this.onRoute,
    };
  }

  subscribe(fn: (s: LiveEngineState) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  // ------------------------------------------------------------------ private

  private leader(): Candidate | null {
    let best: Candidate | null = null;
    for (const c of this.cands) if (!best || c.adv > best.adv) best = c;
    return best;
  }

  private feedCandidate(c: Candidate, lat: number, lon: number, tSec: number): boolean {
    // Per-fix planar transform in this candidate's track frame (same toXY as
    // the parity pipeline; two tiny arrays per call — negligible at 1 Hz).
    const xy = toXY([lat], [lon], c.ref.lat0, c.ref.lon0);
    const fix = c.proj.update(xy.x[0], xy.y[0], tSec);
    if (c.baseS === null) c.baseS = fix.s;
    c.adv = c.proj.chainage - c.baseS;
    c.onRoute = fix.onRoute;
    const events = c.det.update(tSec, fix.s);
    if (events.length === 0) return false;
    c.events.push(...events);
    return true;
  }

  /** Rebuild sector/lap state: live events say WHEN and whether estimated;
   * the offline parity pipeline over the buffer says HOW LONG (raw/stopped/
   * moving) and catches interrupted/offroute. */
  private recompute(): void {
    const cand = this.locked;
    if (!cand) return;
    const gates = gateChainages(cand.track);
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
    if (evFin && this.lap === null) {
      const anyDirty = out.some(
        (s) => s.kind === 'missed' || (s.kind === 'done' && s.estimated),
      );
      const estimated =
        anyDirty || evStart === null || evStart.estimated || evFin.estimated;
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
