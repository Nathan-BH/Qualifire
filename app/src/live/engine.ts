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
 * Route auto-detection (cycle 024, WP-D2, Nathan's 2026-08-20 B-65 ruling):
 * EVERY ratified catalog route runs as a live candidate (catalogTrackSpecs(),
 * tracks.ts) — not just the four legacy commute tracks. Several of those 20
 * routes share almost their whole corridor with another (Morning inside
 * HomeStationPreferred's corridor; StationHomeWet/StationHomePreferred join
 * EveningB/EveningA mid-line), which breaks a flat "leader + 200 m margin"
 * rule outright — the shared-corridor sibling can never open a margin, or
 * only opens one hundreds of metres past the true split. Two mechanisms fix
 * this without ever weakening the underlying 400 m evidence rule:
 *
 *  - ANCHORED: a candidate is "anchored" once some fix lands on its own
 *    corridor within ANCHOR_M of ITS OWN start. An unanchored rival (a
 *    mid-line shadow that only joins the leader's corridor far downstream)
 *    never blocks an anchored leader — so EveningA/EveningB and Morning/
 *    MorningB still hard-lock at ~400 m exactly as before cycle 024, even
 *    with 16 more candidates running.
 *  - PICK-BIASED lock-then-verify: the RECORD-tab route pick (§8a) is a
 *    HINT, never a shortcut on the 400 m evidence rule. Once the leader has
 *    >=400 m of advance but a same-corridor rival still blocks a clean
 *    margin, the pick's own candidate — if it is the leader or a blocker
 *    that itself has >=400 m — gets a SOFT lock: it is displayed and scored
 *    like a real lock (LiveEngineState.lockKind='soft'), but every candidate
 *    keeps running underneath it. If the pick's candidate goes on to clear
 *    the margin, it's promoted to VERIFIED with no second lock event. If a
 *    DIFFERENT candidate instead pulls >=200 m ahead of the soft pick, the
 *    engine SWITCHES to it (re-evaluated fresh: verified if that candidate
 *    itself has no blockers, soft otherwise) — the ridden road always wins
 *    over the pick, never the reverse. finalize() (called once at ride end)
 *    recovers a route from the FINISH gate when neither a verified nor a
 *    soft lock ever settled, or promotes a still-soft lock to 'finalized'.
 *    A VERIFIED lock never unlocks or switches (today's invariant, unchanged).
 *
 * Advance is CORRIDOR-VERIFIED travel only: a D-016(a) re-acquisition jump
 * moves a candidate's chainage but earns it no lock evidence (REACQ_JUMP_M,
 * cycle 024 WP-D1 adjudication — see its doc comment below).
 *
 * Honesty rules surfaced to the UI (D-013 / D-016(b) / D-021):
 *  - a sector whose bounding events include an 'estimated' fire shows ~raw
 *    time only, never a moving time, never a colour;
 *  - gates skipped by late GPS lock => sector 'missed';
 *  - an off-corridor excursion inside a sector => 'missed' (detour, D-015);
 *  - a soft lock is NOT a colour input — the displayed route id is honest
 *    (it IS what's shown), so live.track's ordinary colour path is unaffected;
 *    a soft lock only changes what's on screen, never invents a verdict;
 *  - no benchmark store exists yet, so every clean sector is NEUTRAL and
 *    deltas are blank (D-008 warm-up / D-021 no-reference rule) — tiers and
 *    deltas arrive with the benchmark work, not fake numbers here.
 *
 * Buzz (D-019): unchanged mechanism (gateFires delta, src/location/index.ts).
 * Under a soft lock the buzzes are the soft candidate's own fires; a later
 * switch rebuilds sectors but past buzzes are never "taken back" — a gate WAS
 * physically crossed on the shared road, buzz or no eventual lock.
 *
 * D-023 (raw forever): everything here is DERIVED and in-memory only; nothing
 * is persisted. The ride JSONL stays untouched.
 *
 * FREE MODE (WP-B, Nathan's 2026-08-20 notes; cycle 024): `start({mode:
 * 'free'})` turns off the whole lock state machine — phase stays 'detecting'
 * for the entire ride, lockKind stays 'none', `locked` stays null, no lock
 * events, finalize() is a no-op. Instead EVERY candidate's gate fires are
 * appended to `freeCrossings` and emitted (not just the eventual winner's —
 * there is no winner), each `GateDetector` runs with `armWithinM=0` (a free
 * ride can start anywhere; "you were already past this gate" must never
 * invent a fire), and a same-candidate consecutive, both-non-estimated
 * crossing pair derives one `freeSectors` entry (raw only — D-013: a free
 * ride has no comparable history by construction, so it is never coloured).
 * `sectors`/`lap`/`currentSector` stay in their idle shapes the whole ride.
 * Free-ride times are persisted by store/freeRides.ts, a module structurally
 * isolated from every fixed-route comparison path (D-025 mode-consistency) —
 * this file never imports it and never needs to: free state lives entirely in
 * LiveEngineState for the UI to read and hand off at ride end.
 *
 * WP-B coordinator addendum (Nathan, 2026-08-24): `EngineStartOptions.routeIds`
 * restricts which TrackSpecs this ride builds candidates for at all (not just
 * a free-mode concept, but only ever populated by RecordScreen for a free
 * ride with exactly one known endpoint — see store/catalog.ts's
 * `freeRideRouteIds`). `undefined`/`null` = every spec (today's behaviour,
 * and the deliberately-unfiltered both-ends-unknown free ride); an array
 * (even empty) restricts `cands` to exactly those ids. This is the natural
 * generalisation of the existing pick-hint mechanism (`pickId`) to "which
 * routes are even in the race" rather than "which one is favoured" — no new
 * per-candidate machinery, `this.specs` is just filtered before the same
 * `cands` construction that already runs.
 */
import {
  DEFAULT_LIVE_OPTIONS,
  GateDetector,
  LiveProjector,
  computeKinematics,
  projectRideOffline,
  sectorTimes,
  stoppedTimeBetween,
  toXY,
  type GateEvent,
  type RefLine,
  type TrackId,
} from '../../core/src/index.ts';
import { catalogTrackSpecs } from './tracks.ts';

export const LOCK_MIN_ADVANCE_M = 400;
export const LOCK_MARGIN_M = 200;
/** Cycle 024 (WP-D1 adjudication, 2026-08-20): a candidate's `adv` must mean
 * CORRIDOR-VERIFIED travel — metres of this track the engine actually watched
 * the rider cover. D-016(a) re-acquisition can move a candidate's chainage
 * forward by hundreds of metres in ONE fix (that is its job: it recovers a
 * recording gap that rejoined the line downstream). Counting such a jump as
 * "advance" hands the lock race its strongest evidence for a road nobody was
 * observed riding. Measured failure: with MorningB's reference promoted onto
 * Nathan's real home>work route-B ride, a genuine Morning commute leaves
 * MorningB's corridor after ~50 m, rides 400 m of Morning's road, and then
 * passes back within 40 m of MorningB's line — re-acquisition jumps MorningB
 * from 45.9 m to 624.1 m in a single fix, and the 400 m/200 m rule locks
 * MorningB over Morning (which is sitting at a correct, honest 405.0 m).
 * A forward move much larger than the projector's own search window can only
 * be a re-acquisition — ordinary windowed projection reaches at most one
 * reference segment past windowFwd (a ~5 m margin at this app's resampling),
 * so jumps above windowFwd+5 are discounted from `adv` (the candidate keeps
 * the new chainage; it simply earns no lock evidence for ground it never
 * showed). Below that margin, a small re-acquisition hop can still slip
 * through uncounted (adversarial review 2026-08-23 measured up to ~138 m in
 * this app's own ride corpus, never enough alone to win a lock) — closing
 * that residual needs `LiveFix` to expose `reacquired: boolean` so every
 * re-acquisition discounts regardless of size. WP-D2 (cycle 024, 2026-08-23)
 * scoped this: touching core/live.ts's parity-proven LiveFix/LiveProjector
 * shape is not a small/natural extension of the anchored-rule + pick-bias
 * work this file does, so it stays DEFERRED — a follow-up, not chased here.
 * This is a lock-race rule only: gate firing, chainage and every displayed
 * time are untouched. */
export const REACQ_JUMP_M = DEFAULT_LIVE_OPTIONS.windowFwd + 5;
/** Memory guard: 4 h at 1 Hz. Past this the engine stops (recording doesn't). */
const MAX_BUFFERED_FIXES = 14400;
/** Cycle 023 fix 2: a candidate's very first fix seeds LiveProjector's
 * chainage via a GLOBAL nearest-vertex search (no window yet) — a fix this
 * inaccurate can seed the wrong point on the polyline entirely, and because
 * projection is forward-only-monotonic there is no way back. Above this
 * accuracy (metres) that anchor is untrustworthy enough to warrant a retry
 * once a better fix arrives. */
export const POOR_ACCURACY_M = 50;
/** Cycle 024 (WP-D2): "anchored" = this candidate was joined at its OWN
 * start, not picked up mid-line by re-acquisition far downstream. Covers
 * START gates (~160-290 m into each track) plus D-016(b)'s 50 m arming slack
 * plus resampling noise; far below the >=2500 m mid-line joins measured for
 * every corridor-subset shadow pair in the 20-route catalog. */
export const ANCHOR_M = 300;

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

/** none = never locked; soft = the RECORD-tab pick is displayed but not yet
 * corridor-confirmed (every candidate still running underneath); verified =
 * today's clean 400 m/200 m lock, never unlocks; finalized = settled by
 * finalize() at ride end (either promoted from a still-soft lock, or picked
 * fresh from whichever candidate(s) reached their own FINISH gate). */
export type LockKind = 'none' | 'soft' | 'verified' | 'finalized';

/** One live candidate's route: id + reference polyline + gate chainages.
 * catalogTrackSpecs() (tracks.ts) builds one per ratified catalog route;
 * tests inject a smaller legacy set (tests/lib.ts's fixtureSpecs()). */
export interface TrackSpec {
  id: string;
  ref: RefLine;
  gates: number[];
}

export interface EngineStartOptions {
  /** the RECORD-tab route pick (a TrackSpec id), or null/omitted for
   * auto-detect only — never a shortcut on the 400 m evidence rule, only a
   * tie-breaking hint once that evidence exists (see the file header). */
  pickId?: string | null;
  /** 'route' (default) = today's lock/verify machinery. 'free' (WP-B) = every
   * gate crossed by any candidate fires and counts, no lock ever settles —
   * see the file header's FREE MODE section. */
  mode?: 'route' | 'free';
  /** WP-B coordinator addendum: restricts `cands` to specs whose id is in
   * this list. `undefined`/`null` = every spec (today's behaviour). See the
   * file header. */
  routeIds?: string[] | null;
}

/** Raw engine events for the GPX+ sidecar: emitted only for the currently
 * displayed (soft or verified) candidate — at each lock/switch, that
 * candidate's pre-lock history is replayed. */
export type EngineEvent =
  | {
      type: 'lock';
      track: TrackId;
      atChainageM: number;
      atT: number;
      /** cycle 024: which kind of lock this is (never 'none' — a lock event
       * only ever fires when actually settling on soft/verified/finalized). */
      kind: Exclude<LockKind, 'none'>;
      /** the RECORD-tab pick in effect when this lock fired, or null */
      pick: string | null;
    }
  | { type: 'gate'; track: TrackId; gateIndex: number; t: number; estimated: boolean };

/** Route-match diagnostics (cycle 023 fix 5a) — a DISTINCT channel from both
 * the live-state feed (subscribe) and the ride-record events (subscribeEvents):
 * diagnostics are a different consumer (troubleshooting, not display or the
 * ride record) at a different cadence (once per candidate anchor/retry, plus
 * once on lock), and forcing every live-state listener to filter this noise
 * out would be the wrong coupling. Fired for EVERY candidate, not just the
 * eventual winner — the whole point is to see attempts that never lock. */
export type DiagnosticEvent = {
  type: 'routeMatchAttempt';
  track: TrackId;
  /** 'anchor' = a candidate's first fix (or its post-retry re-anchor) seeded
   * its chainage; 'retry' = the single post-settle re-anchor itself (fired
   * alongside the 'anchor' that follows it, same tick); 'lock' = this
   * candidate just settled a lock (soft, verified, or finalized). */
  phase: 'anchor' | 'retry' | 'lock';
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
  /** cycle 024 (WP-D2): see LockKind's doc comment */
  lockKind: LockKind;
  /** the RECORD-tab pick this ride started with, or null */
  pick: string | null;
  /** true once the locked candidate's track equals `pick` (the pick turned
   * out to be the ridden route); always false while pick is null */
  pickHonoured: boolean;
  /** WP-B: 'route' (default) = today's lock/verify ride. 'free' = every
   * candidate's gate fires count, no lock, sectors/lap stay idle forever. */
  mode: 'route' | 'free';
  /** WP-B, free mode only (empty in route mode): every gate any candidate
   * crossed, in the order fired. */
  freeCrossings: { routeId: string; gateIndex: number; t: number; estimated: boolean }[];
  /** WP-B, free mode only (empty in route mode): one entry per consecutive,
   * both-non-estimated crossing pair on the SAME candidate — raw only, never
   * coloured (D-013: no comparable history for a free ride by construction). */
  freeSectors: { routeId: string; index: number; rawS: number }[];
}

interface Candidate {
  track: TrackId;
  ref: RefLine;
  gates: number[];
  proj: LiveProjector;
  det: GateDetector;
  events: GateEvent[];
  /** chainage at the first fix — advance is measured from here */
  baseS: number | null;
  adv: number;
  onRoute: boolean;
  /** cycle 024: true once this candidate was joined at ITS OWN start
   * (see ANCHOR_M's doc comment) */
  anchored: boolean;
  /** accuracy (metres) of the fix that set baseS; null if unknown at the time */
  baseAccuracyM: number | null;
  /** cycle 023 fix 2: at most one post-settle re-anchor per candidate */
  retried: boolean;
  /** WP-G Part 2 gap-fill: this candidate's own cross-track deviation (m) at
   * its most recent fed fix (LiveFix.xtd verbatim) — surfaced in diagnostics. */
  lastXtd: number;
}

const N_SECTORS_DEFAULT = 4; // the legacy four commute tracks all have 4 sectors

function pendingSectors(n: number): LiveSector[] {
  return Array.from({ length: n }, () => ({ kind: 'pending' as const }));
}

export class LiveEngine {
  private readonly specs: TrackSpec[];
  private phase: LiveEngineState['phase'] = 'idle';
  private cands: Candidate[] = [];
  private locked: Candidate | null = null;
  private lockKind: LockKind = 'none';
  private pick: string | null = null;
  private pickHonoured = false;
  private sectors: LiveSector[] = pendingSectors(N_SECTORS_DEFAULT);
  private lap: LiveLap | null = null;
  private mode: 'route' | 'free' = 'route';
  private freeCrossings: LiveEngineState['freeCrossings'] = [];
  private freeSectors: LiveEngineState['freeSectors'] = [];
  /** WP-B free-sector derivation: the last crossing seen per candidate (by
   * track id) this ride, regardless of whether it ended up bounding a
   * freeSectors entry — an estimated crossing still updates this so the NEXT
   * pair correctly sees "previous was estimated" and refuses to bound. */
  private lastFreeCrossing = new Map<TrackId, { gateIndex: number; t: number; estimated: boolean }>();
  private fixesFed = 0;
  private onRoute = false;
  private tBuf: number[] = [];
  private latBuf: number[] = [];
  private lonBuf: number[] = [];
  private listeners = new Set<(s: LiveEngineState) => void>();
  private evListeners = new Set<(e: EngineEvent) => void>();
  private diagListeners = new Set<(e: DiagnosticEvent) => void>();

  /** Default: one candidate per ratified catalog route (catalogTrackSpecs(),
   * tracks.ts). Tests inject a smaller/legacy set explicitly. */
  constructor(specs?: TrackSpec[]) {
    this.specs = specs ?? catalogTrackSpecs();
  }

  start(opts?: EngineStartOptions): void {
    this.phase = 'detecting';
    this.pick = opts?.pickId ?? null;
    this.mode = opts?.mode ?? 'route';
    this.locked = null;
    this.lockKind = 'none';
    this.pickHonoured = false;
    const pickSpec = this.pick !== null ? this.specs.find((s) => s.id === this.pick) : undefined;
    this.sectors = pendingSectors(pickSpec ? pickSpec.gates.length - 1 : N_SECTORS_DEFAULT);
    this.lap = null;
    this.freeCrossings = [];
    this.freeSectors = [];
    this.lastFreeCrossing = new Map();
    this.fixesFed = 0;
    this.onRoute = false;
    this.tBuf = [];
    this.latBuf = [];
    this.lonBuf = [];
    // WP-B coordinator addendum: routeIds (undefined/null => every spec, the
    // unfiltered default) restricts which specs even get a candidate — see
    // the file header.
    const specs = opts?.routeIds ? this.specs.filter((s) => opts.routeIds!.includes(s.id)) : this.specs;
    this.cands = specs.map((spec) => ({
      track: spec.id,
      ref: spec.ref,
      gates: spec.gates,
      proj: new LiveProjector(spec.ref),
      // WP-B: free mode arms nothing (D-016(b) arming disabled) — a free
      // ride can begin anywhere, so "you were already past this gate" must
      // never invent a fire (see the file header's FREE MODE section).
      det: new GateDetector(spec.gates, this.mode === 'free' ? 0 : undefined),
      events: [],
      baseS: null,
      adv: 0,
      onRoute: false,
      anchored: false,
      baseAccuracyM: null,
      retried: false,
      lastXtd: 999,
    }));
    this.emit();
  }

  stop(): void {
    this.phase = 'idle';
    this.cands = [];
    this.locked = null;
    this.lockKind = 'none';
    this.pick = null;
    this.pickHonoured = false;
    this.mode = 'route';
    this.freeCrossings = [];
    this.freeSectors = [];
    this.lastFreeCrossing = new Map();
    this.emit();
  }

  /** Feed one raw GPS fix (degrees, epoch ms). `accuracyM` (metres, per the
   * fix's reported horizontal accuracy) is optional — undefined is treated as
   * "unknown", never as poor. Never throws into the caller's recording loop —
   * display state is worth strictly less than the raw ride. */
  feed(lat: number, lon: number, tUnixMs: number, accuracyM?: number): void {
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

    let lockedFired = false;

    // WP-B free mode: no lock state machine at all — every candidate keeps
    // running for the whole ride, every fire counts (see feedFree()). Kept as
    // an early branch rather than threaded through the route-mode machinery
    // below: 'verified'/'finalized' fast-path and the whole lock/switch
    // evaluation are concepts that free mode never enters (lockKind stays
    // 'none' the entire ride — start() never sets it otherwise), so folding
    // free mode into that branching would only obscure both.
    if (this.mode === 'free') {
      this.feedFree(lat, lon, tSec);
      this.emit();
      return;
    }

    if (this.lockKind === 'verified' || this.lockKind === 'finalized') {
      // Today's exact fast path: only the winner is fed once verified — and
      // finalize() is always immediately followed by stop() in the intended
      // wiring, but a stray post-finalize feed() must not re-open the lock
      // race either (a finalized ride is just as settled as a verified one).
      const evs = this.feedCandidate(this.locked!, lat, lon, tSec);
      lockedFired = evs.length > 0;
      for (const e of evs) {
        this.emitEvent({
          type: 'gate', track: this.locked!.track, gateIndex: e.gateIndex, t: e.time, estimated: e.estimated,
        });
      }
      this.onRoute = this.locked!.onRoute;
    } else {
      // Detecting, or soft-locked: every candidate keeps running (soft is a
      // display choice, not a narrowing of the evidence).
      const poorNow = accuracyM !== undefined && accuracyM > POOR_ACCURACY_M;
      for (const c of this.cands) {
        // Cycle 023 fix 2: the FIRST fix anchors this candidate's chainage via
        // a global nearest-vertex search (core/live.ts LiveProjector) — if
        // that fix's accuracy was poor, the anchor can land on the wrong part
        // of the polyline entirely, and forward-only projection can never
        // correct it afterwards. Guarded to fire at most once, and only when
        // the ORIGINAL anchor was actually poor (never for a candidate that
        // anchored well and merely sees noisy accuracy later).
        if (
          c.baseS !== null && !c.retried &&
          c.baseAccuracyM !== null && c.baseAccuracyM > POOR_ACCURACY_M &&
          !poorNow
        ) {
          c.proj = new LiveProjector(c.ref);
          c.det = new GateDetector(c.gates);
          c.events = [];
          c.baseS = null;
          c.anchored = false; // the re-seeded chainage needs its own fresh anchor check
          c.retried = true;
          c.lastXtd = 999; // fresh candidate: nothing fed yet this instant
          this.emitDiagnostic({
            type: 'routeMatchAttempt', track: c.track, phase: 'retry',
            accuracyM: accuracyM ?? null, thresholdM: POOR_ACCURACY_M, poorAccuracy: false,
            xtdM: null, atT: tSec,
          });
        }
        const wasAnchored = c.baseS !== null;
        // Speculative fires from a candidate that is not (yet) the displayed
        // one must not enter the record — only the currently locked (soft or
        // verified) candidate's fires are emitted/recomputed.
        const evs = this.feedCandidate(c, lat, lon, tSec);
        if (c === this.locked && evs.length > 0) {
          lockedFired = true;
          for (const e of evs) {
            this.emitEvent({
              type: 'gate', track: c.track, gateIndex: e.gateIndex, t: e.time, estimated: e.estimated,
            });
          }
        }
        if (!wasAnchored && c.baseS !== null) {
          c.baseAccuracyM = accuracyM ?? null;
          this.emitDiagnostic({
            type: 'routeMatchAttempt', track: c.track, phase: 'anchor',
            accuracyM: accuracyM ?? null, thresholdM: POOR_ACCURACY_M, poorAccuracy: poorNow,
            xtdM: c.lastXtd, atT: tSec,
          });
        }
      }
      // A verified lock never unlocks or switches; once FINISH has scored the
      // lap for the current candidate, stop re-evaluating entirely (a switch
      // after finish cannot happen).
      if (this.phase !== 'finished') this.evaluateLockState(tSec, accuracyM, poorNow);
      this.onRoute = this.locked ? this.locked.onRoute : (this.pickLeader()?.onRoute ?? false);
    }
    if (lockedFired && this.locked) this.recompute();
    this.emit();
  }

  /** WP-B free mode's whole per-fix rule: EVERY candidate keeps running for
   * the whole ride (no lock, so nothing is ever dropped from `this.cands`),
   * every gate any of them crosses fires and is emitted (a free ride's whole
   * point is "gates from your known routes fire as you cross them" — not
   * just the fires of whichever route would have won a race that never
   * happens here), and a same-candidate consecutive non-estimated crossing
   * pair derives one raw freeSectors entry. `onRoute` is true when ANY
   * candidate is currently on its own corridor (there is no single "the"
   * route to be on/off in free mode — routeMapView's gatesOnly rung has no
   * off-route badge for the same reason). */
  private feedFree(lat: number, lon: number, tSec: number): void {
    for (const c of this.cands) {
      const evs = this.feedCandidate(c, lat, lon, tSec);
      for (const e of evs) {
        this.freeCrossings.push({ routeId: c.track, gateIndex: e.gateIndex, t: e.time, estimated: e.estimated });
        this.emitEvent({ type: 'gate', track: c.track, gateIndex: e.gateIndex, t: e.time, estimated: e.estimated });
        const prev = this.lastFreeCrossing.get(c.track);
        if (
          e.gateIndex >= 1 && !e.estimated &&
          prev && prev.gateIndex === e.gateIndex - 1 && !prev.estimated
        ) {
          this.freeSectors.push({ routeId: c.track, index: e.gateIndex, rawS: e.time - prev.t });
        }
        this.lastFreeCrossing.set(c.track, { gateIndex: e.gateIndex, t: e.time, estimated: e.estimated });
      }
    }
    this.onRoute = this.cands.some((c) => c.onRoute);
  }

  /** Called once when the ride ends (src/location/index.ts's stopTracking(),
   * and defensively again from RecordScreen's onEnd before it). Recovers a
   * route from the FINISH gate for a ride that never cleared a verified (or
   * even soft) lock, and promotes a still-soft lock that never got the
   * chance to clear its margin. Idempotent — safe to call more than once.
   * WP-B: a no-op in free mode — there is no lock to recover or promote (see
   * the file header's FREE MODE section); free-ride persistence reads
   * getState() directly, not a settled `locked` candidate. */
  finalize(): void {
    if (this.mode === 'free') return; // nothing to do — see the file header
    if (this.lockKind === 'verified') return; // nothing to do
    const finished = this.cands.filter((c) => c.det.nextGateIndex >= c.gates.length);
    if (finished.length === 0) {
      // Nothing completed its own route. A still-soft lock's display already
      // stood — just relabel it as settled. No pick/never-anchored-anywhere
      // means the ride stays genuinely unmatched, exactly as today.
      if (this.lockKind === 'soft') this.lockKind = 'finalized';
      this.emit();
      return;
    }
    // Several completed candidates => the longest completed route subsumes
    // its prefix (a longer ride can fire a shorter corridor-subset route's
    // FINISH en route); exact-adv ties break toward the pick.
    let winner = finished[0];
    for (let i = 1; i < finished.length; i++) {
      const c = finished[i];
      if (c.adv > winner.adv) winner = c;
      else if (c.adv === winner.adv && c.track === this.pick && winner.track !== this.pick) winner = c;
    }
    const alreadyDisplayed = this.locked === winner;
    this.locked = winner;
    this.lockKind = 'finalized';
    this.pickHonoured = this.pick !== null && this.pick === winner.track;
    this.cands = [winner];
    if (!alreadyDisplayed) {
      // Establishing a NEW display target at ride end (nothing was locked
      // before, or a different candidate was soft-locked): same replay
      // sequence a live lock/switch uses.
      this.phase = 'locked';
      // Cycle 024 B1 fix: same stale-lap hazard as commitLock() above, and
      // the exact path the adversarial repro hit — a soft lock's OWN FINISH
      // firing mid-ride (recompute() scoring & freezing phase='finished' for
      // THAT candidate) is precisely what leaves `winner` different from
      // `this.locked` here. Without this reset, recompute() below silently
      // keeps the old candidate's already-scored lap under the new winner's
      // name (D-025/D-030: an uncaveated real number that was never earned).
      this.lap = null;
      const atT = this.tBuf.length > 0 ? this.tBuf[this.tBuf.length - 1] : 0;
      this.emitEvent({
        type: 'lock', track: winner.track, atChainageM: winner.proj.chainage, atT, kind: 'finalized', pick: this.pick,
      });
      this.emitDiagnostic({
        type: 'routeMatchAttempt', track: winner.track, phase: 'lock',
        accuracyM: null, thresholdM: POOR_ACCURACY_M, poorAccuracy: false,
        xtdM: winner.lastXtd, atT,
      });
      for (const e of winner.events) {
        this.emitEvent({ type: 'gate', track: winner.track, gateIndex: e.gateIndex, t: e.time, estimated: e.estimated });
      }
      this.recompute();
    }
    // else: already the displayed candidate (soft, its own FINISH already
    // fired mid-ride, phase already 'finished') — relabelling as finalized
    // changes nothing on screen, so no new event, no re-replay, no recompute.
    this.emit();
  }

  getState(): LiveEngineState {
    const det = this.locked?.det ?? null;
    const next = det ? det.nextGateIndex : 0;
    const nGates = this.locked ? this.locked.gates.length : this.sectors.length + 1;
    let currentSector: number | null = null;
    if (det && next >= 1 && next < nGates) currentSector = next;
    let lastDone: number | null = null;
    if (this.locked) {
      for (const e of this.locked.events) {
        if (e.gateIndex >= 1) lastDone = Math.max(lastDone ?? 0, e.gateIndex);
      }
    }
    // WP-B: in free mode gateFires is the TOTAL count of everything ever
    // fired by ANY candidate (freeCrossings.length) — the buzz's "one physical
    // crossing, one buzz" contract (see the file header) depends on this
    // number counting every fire, not (as route mode's unlocked case does)
    // the single busiest candidate's own count.
    const gateFires = this.mode === 'free'
      ? this.freeCrossings.length
      : this.locked
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
      lockKind: this.lockKind,
      pick: this.pick,
      pickHonoured: this.pickHonoured,
      mode: this.mode,
      freeCrossings: [...this.freeCrossings],
      freeSectors: [...this.freeSectors],
    };
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
   * subscribe() (live state) and subscribeEvents() (the ride's lock/gate
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

  /** The overall leader by corridor-verified advance. Exact ties (rare) break
   * anchored first, then toward the RECORD-tab pick, then by spec order
   * (the first-encountered candidate is kept unless a later one scores
   * strictly higher). */
  private pickLeader(): Candidate | null {
    let best: Candidate | null = null;
    for (const c of this.cands) {
      if (!best) { best = c; continue; }
      if (c.adv > best.adv) { best = c; continue; }
      if (c.adv < best.adv) continue;
      const cScore = (c.anchored ? 2 : 0) + (c.track === this.pick ? 1 : 0);
      const bestScore = (best.anchored ? 2 : 0) + (best.track === this.pick ? 1 : 0);
      if (cScore > bestScore) best = c;
    }
    return best;
  }

  /** Steps 2-5 of the anchored-rule / pick-bias lock algorithm (cycle 024
   * WP-D2, B-65 ruling — see the file header for the full design). Runs every
   * fix while lockKind !== 'verified'; owns the none -> soft -> verified
   * state machine and mid-ride switches. The 400 m evidence rule is never
   * shortcut: no lock of any kind fires before some candidate has >=400 m of
   * corridor-verified advance, and a soft lock can only ever be corrected
   * TOWARD the route with 200 m more measured advance. */
  private evaluateLockState(tSec: number, accuracyM: number | undefined, poorNow: boolean): void {
    const lead = this.pickLeader();
    if (!lead || lead.adv < LOCK_MIN_ADVANCE_M) return;

    // An unanchored rival never blocks an anchored leader — it is a mid-line
    // shadow (e.g. StationHomeWet under a true EveningB ride), not a genuine
    // competing route.
    const blockers = this.cands.filter((c) => {
      if (c === lead) return false;
      if (lead.adv - c.adv >= LOCK_MARGIN_M) return false;
      return c.anchored || !lead.anchored;
    });

    if (blockers.length === 0) {
      // Clear evidence at this instant: verified lock. This one branch covers
      // three cases uniformly — a fresh lock (today's exact behaviour), a
      // soft -> verified PROMOTION of the SAME candidate (rule 5a: commitLock
      // below emits no second lock event when the target hasn't changed), and
      // a SWITCH straight to verified on a different candidate (the ridden
      // route wins over a soft pick that turned out wrong).
      this.commitLock(lead, 'verified', tSec, accuracyM, poorNow);
      return;
    }

    if (this.lockKind === 'none') {
      // Never a shortcut: the pick only ever gets a SOFT lock, and only once
      // ITS OWN candidate — as leader, or as a blocker that itself cleared
      // 400 m — is part of the tied evidence.
      if (this.pick === null) return; // no pick: today's exact behaviour, wait for the margin
      const pickCand = this.cands.find((c) => c.track === this.pick);
      if (!pickCand) return;
      const eligible = pickCand === lead || (pickCand.adv >= LOCK_MIN_ADVANCE_M && blockers.includes(pickCand));
      if (eligible) this.commitLock(pickCand, 'soft', tSec, accuracyM, poorNow);
      return;
    }

    // lockKind === 'soft': promotion (5a) is already handled above via the
    // blockers-empty branch, so blockers is guaranteed non-empty here — any
    // switch from this branch can only land back in 'soft'. Switch whenever
    // ANY other candidate has pulled >=200 m ahead of the current soft pick,
    // regardless of whether the new leader happens to be the pick — once the
    // pick is provably behind, displaying it would no longer be honest.
    const cur = this.locked!;
    if (lead !== cur && lead.adv - cur.adv >= LOCK_MARGIN_M) {
      this.commitLock(lead, 'soft', tSec, accuracyM, poorNow);
    }
  }

  /** Settle on `cand` as the displayed candidate at kind `kind`. A no-op
   * target change (promotion of the already-displayed soft candidate) emits
   * no new lock event and replays nothing — its own fires have been emitted
   * and recomputed continuously since it became the soft pick. A NEW target
   * (a fresh lock, or a switch away from a different soft pick) emits one
   * lock event and replays that candidate's kept-but-not-yet-emitted events,
   * exactly as today's single lock path did. */
  private commitLock(
    cand: Candidate, kind: 'soft' | 'verified', tSec: number,
    accuracyM: number | undefined, poorNow: boolean,
  ): void {
    const isNewTarget = this.locked !== cand;
    this.locked = cand;
    this.lockKind = kind;
    this.phase = 'locked';
    this.pickHonoured = this.pick !== null && this.pick === cand.track;
    if (kind === 'verified') this.cands = [cand]; // drop the rest, exactly today's behaviour
    if (isNewTarget) {
      // Cycle 024 B1 fix: `this.lap` is written once by recompute() and never
      // cleared (D-022's "score once" rule for a SINGLE candidate's own
      // FINISH). Re-pointing the display at a DIFFERENT candidate must not
      // let that stale lap survive — otherwise a switch away from a
      // candidate whose own FINISH already fired (e.g. a soft lock on a
      // shorter prefix route, later switched off) would keep showing the
      // OLD candidate's scored time under the NEW candidate's name. phase is
      // already forced to 'locked' above (out of any prior 'finished'), so
      // recompute() below is free to re-score from the new candidate's own
      // events once (and only once) its own FINISH fires.
      this.lap = null;
      this.emitEvent({
        type: 'lock', track: cand.track, atChainageM: cand.proj.chainage, atT: tSec, kind, pick: this.pick,
      });
      this.emitDiagnostic({
        type: 'routeMatchAttempt', track: cand.track, phase: 'lock',
        accuracyM: accuracyM ?? null, thresholdM: POOR_ACCURACY_M, poorAccuracy: poorNow,
        xtdM: cand.lastXtd, atT: tSec,
      });
      for (const e of cand.events) {
        this.emitEvent({ type: 'gate', track: cand.track, gateIndex: e.gateIndex, t: e.time, estimated: e.estimated });
      }
      this.recompute();
    }
  }

  private feedCandidate(c: Candidate, lat: number, lon: number, tSec: number): GateEvent[] {
    // Per-fix planar transform in this candidate's track frame (same toXY as
    // the parity pipeline; two tiny arrays per call — negligible at 1 Hz).
    const xy = toXY([lat], [lon], c.ref.lat0, c.ref.lon0);
    const sBefore = c.proj.chainage;
    const fix = c.proj.update(xy.x[0], xy.y[0], tSec);
    c.lastXtd = fix.xtd; // WP-G Part 2 gap-fill: per-candidate deviation for diagnostics
    if (c.baseS === null) {
      c.baseS = fix.s;
    } else {
      // REACQ_JUMP_M: discount a D-016(a) re-acquisition teleport from the
      // lock evidence by carrying baseS forward with it (see the constant).
      const jump = c.proj.chainage - sBefore;
      if (jump > REACQ_JUMP_M) c.baseS += jump;
    }
    c.adv = c.proj.chainage - c.baseS;
    c.onRoute = fix.onRoute;
    if (!c.anchored && fix.onRoute && fix.s <= ANCHOR_M) c.anchored = true;
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
