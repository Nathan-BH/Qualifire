/** LIVE gate detection: forward-only chainage projection with the two D-016
 * amendments, plus an in-order gate latch with interpolated crossing times.
 *
 * This is the module the 1 Hz foreground-service loop will call. It is
 * incremental (one fix at a time, O(window) per fix, no allocation) and
 * platform-free.
 *
 * D-011 base semantics: windowed projection [sp-30, sp+240], monotonic
 * (sp never moves backward), gates fire in order exactly once (the hysteresis
 * latch is implied: a fired gate can never re-fire because chainage is
 * monotonic and the gate index only advances).
 *
 * D-016 amendments (measured failure modes, RESULTS.md section 6):
 *  (a) bounded FORWARD-only re-acquisition: after >= 5 consecutive
 *      off-corridor fixes, search vertices ahead of sp only — never backward,
 *      preserving the latch. The forward bound is time-aware:
 *      max(reacqForwardM, vMaxReacq * seconds since the last on-route fix).
 *      Cycle-004 measurement: the one clean ride that froze the window
 *      (20260521-1056) was not a lateral excursion but a 237 s recording gap
 *      rejoining 1462 m downstream — a fixed 400 m bound cannot recover it,
 *      elapsed-time * plausible-speed can, and stays physically bounded;
 *  (b) START-gate arming for late GPS lock: if the FIRST on-route fix lands
 *      less than ~50 m past an uncrossed gate, fire it 'estimated'; gates
 *      further behind are reported as skipped (their sector -> 'estimated',
 *      never coloured, per D-013).
 */
import type { RefLine, GateEvent } from './types.ts';
import { searchsortedLeft } from './geo.ts';
import { CORRIDOR_M, nearestOnSegments, nearestVertex } from './projection.ts';

export interface LiveOptions {
  corridor: number;        // m cross-track (D-011)
  windowBack: number;      // m of backward slack in the search window
  windowFwd: number;       // m of forward search window
  lostBeforeReacq: number; // consecutive off-corridor fixes before re-acq
  reacqForwardM: number;   // D-016(a) minimum forward bound; 0 disables re-acquisition
  vMaxReacq: number;       // m/s cap for the time-aware bound (0 = fixed bound only)
  armWithinM: number;      // D-016(b) arming distance
}

export const DEFAULT_LIVE_OPTIONS: LiveOptions = {
  corridor: CORRIDOR_M,
  windowBack: 30,
  windowFwd: 240,
  lostBeforeReacq: 5,
  reacqForwardM: 400,
  vMaxReacq: 15,           // 54 km/h — generous for an e-bike; bounds any gap-jump
  armWithinM: 50,
};

export interface LiveFix {
  /** monotonic chainage estimate, m */
  s: number;
  /** cross-track distance of this fix, m (999 if the window was empty) */
  xtd: number;
  /** fix accepted within the corridor */
  onRoute: boolean;
}

export class LiveProjector {
  private readonly ref: RefLine;
  private readonly opt: LiveOptions;
  private sp = 0;
  private lost = 0;
  private started = false;
  private tLastOnRoute: number | null = null;

  constructor(ref: RefLine, opt: Partial<LiveOptions> = {}) {
    this.ref = ref;
    this.opt = { ...DEFAULT_LIVE_OPTIONS, ...opt };
  }

  /** Current monotonic chainage. */
  get chainage(): number {
    return this.sp;
  }

  /** Feed one planar fix (metres in the track frame); returns the projection.
   * Pass t (epoch s) to enable the time-aware re-acquisition bound. */
  update(x: number, y: number, t?: number): LiveFix {
    const { ch } = this.ref;
    const nseg = ch.length - 1;
    const o = this.opt;
    if (!this.started) {
      this.sp = ch[nearestVertex(x, y, this.ref).index];
      this.started = true;
    }
    let lo = searchsortedLeft(ch, this.sp - o.windowBack);
    let hi = searchsortedLeft(ch, this.sp + o.windowFwd);
    lo = Math.max(0, lo - 1);
    hi = Math.min(nseg, hi);
    if (hi <= lo) return { s: this.sp, xtd: 999, onRoute: false };
    const hit = nearestOnSegments(x, y, this.ref, lo, hi);
    if (hit.dist <= o.corridor) {
      this.sp = Math.max(this.sp, hit.s);   // forward-only
      this.lost = 0;
      if (t !== undefined) this.tLastOnRoute = t;
      return { s: this.sp, xtd: hit.dist, onRoute: true };
    }
    this.lost += 1;
    if (o.reacqForwardM > 0 && this.lost >= o.lostBeforeReacq) {
      // D-016(a): bounded forward-only re-acquisition (time-aware bound)
      let bound = o.reacqForwardM;
      if (t !== undefined && this.tLastOnRoute !== null && o.vMaxReacq > 0) {
        bound = Math.max(bound, o.vMaxReacq * (t - this.tLastOnRoute));
      }
      const nv = nearestVertex(x, y, this.ref, this.sp, this.sp + bound);
      if (nv.index >= 0 && nv.dist <= o.corridor) {
        this.sp = ch[nv.index];
        this.lost = 0;
        if (t !== undefined) this.tLastOnRoute = t;
        return { s: this.sp, xtd: nv.dist, onRoute: true };
      }
    }
    return { s: this.sp, xtd: hit.dist, onRoute: false };
  }
}

/** A crossing whose bracketing fixes are further apart than this (time or
 * chainage) is fired 'estimated' — D-011: signal loss -> interpolate, mark
 * estimated. D-013 then keeps estimated sectors uncoloured and earcon-free. */
export const EST_GAP_S = 10;
export const EST_JUMP_M = 100;

export class GateDetector {
  private readonly gates: number[];
  private readonly armWithinM: number;
  private next = 0;
  private prevT: number | null = null;
  private prevS = 0;
  /** gate indices never fired because the first fix was already > armWithinM past them (D-016(b)) */
  readonly skippedGates: number[] = [];

  constructor(gates: number[], armWithinM = DEFAULT_LIVE_OPTIONS.armWithinM) {
    this.gates = gates;
    this.armWithinM = armWithinM;
  }

  get nextGateIndex(): number {
    return this.next;
  }

  /** Feed one projected fix (t epoch s, s monotonic chainage). Returns fired gates. */
  update(t: number, s: number): GateEvent[] {
    const events: GateEvent[] = [];
    if (this.prevT === null) {
      // D-016(b) arming: resolve gates the first fix already lies past
      while (this.next < this.gates.length && s >= this.gates[this.next]) {
        if (s - this.gates[this.next] < this.armWithinM) {
          events.push({ gateIndex: this.next, time: t, estimated: true });
        } else {
          this.skippedGates.push(this.next);
        }
        this.next += 1;
      }
    } else {
      const shaky = t - this.prevT > EST_GAP_S || s - this.prevS > EST_JUMP_M;
      while (this.next < this.gates.length) {
        const g = this.gates[this.next];
        if (!(this.prevS < g && s >= g)) break;
        const f = (g - this.prevS) / Math.max(s - this.prevS, 1e-9);
        events.push({ gateIndex: this.next, time: this.prevT + f * (t - this.prevT), estimated: shaky });
        this.next += 1;
      }
    }
    this.prevT = t;
    this.prevS = s;
    return events;
  }
}
