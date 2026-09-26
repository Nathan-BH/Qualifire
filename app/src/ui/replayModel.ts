/**
 * Post-ride REPLAY — virgin-cycle14 brief 02 (testuser LBH #2). Pure model:
 * no react, react-native or expo imports, so tests/replay_suite.ts loads it
 * headless. `ReplayScreen.tsx` is wiring only.
 *
 * The rider's position comes from the ride's OWN raw fixes replayed against
 * the way's CURRENT gate set (deriveGateCrossings — the offline sibling of
 * the live engine, already built for the self dots). The live engine itself
 * is never re-run. Selfs are the as-ridden window (colourModel.priorWindowFor)
 * loaded via selfRaceModel's loadSelfTracksFor.
 */
import { interpAt, type SelfTrack } from './selfRaceModel.ts';
import { deriveGateCrossings } from '../store/derive.ts';
import { chronologicalFixes, decodeRideFile } from '../storage/jsonl.ts';
import { catalogTrackSpecs } from '../live/tracks.ts';
import type { FsAdapter } from '../storage/fsAdapter.ts';
import type { RefLine } from '../../core/src/index.ts';
import type { LiveViewModel, Timebase, StripSlotModel } from './liveView.tsx';
import type { SectorRowModel } from './rideHistoryModel.ts';
import type { Tier } from './chips.tsx';

/** Ride-seconds per real second. Nathan/LBH: 10 first, tweak later. ONE constant. */
export const REPLAY_RATE_DEFAULT = 10;
export const REPLAY_RATES: readonly number[] = [5, 10, 25];
/** Redraw cadence — 20 fps; see brief decision 5. */
export const REPLAY_TICK_MS = 50;
/** Ride-seconds the clock keeps running past the FINISH crossing before auto-pause (1 real s at 10x). */
export const REPLAY_ROLL_OUT_S = 10;
/** Raw fixes kept this far either side of [startMs, endMs] so the ends interpolate (selfRaceModel's EDGE_PAD_MS). */
export const REPLAY_EDGE_PAD_MS = 5000;

export interface ReplayFix { tUnixMs: number; lat: number; lon: number; sM: number }

export interface ReplayRider {
  rideId: string;
  /** epoch ms of the START-gate crossing (clock 0) */
  startMs: number;
  /** epoch ms of the FINISH-gate crossing; null = never crossed */
  finishMs: number | null;
  /** finishMs, or the last kept fix when finish was never crossed — the replay stops here */
  endMs: number;
  /** epoch ms per gate (same order as the gate set); null = never crossed. gateMs[0] === startMs. */
  gateMs: (number | null)[];
  /** ascending by tUnixMs, >= 2 entries, every fix carries chainage sM (metres along ref) */
  fixes: readonly ReplayFix[];
}

/** Pure: raw fixes (any order; preStart/warmup dropped) + a way's spec -> the rider, or null
 * when < 2 usable fixes or START never crossed. No decimation (one track, binary search). */
export function buildReplayRider(
  rideId: string,
  raw: readonly { tUnixMs: number; lat: number; lon: number; preStart?: boolean; warmup?: boolean }[],
  spec: { ref: RefLine; gates: number[] },
): ReplayRider | null {
  const inOrder = chronologicalFixes(raw).filter((f) => !f.preStart && !f.warmup);
  if (inOrder.length < 2) return null;

  const t = inOrder.map((f) => f.tUnixMs / 1000);
  const lat = inOrder.map((f) => f.lat);
  const lon = inOrder.map((f) => f.lon);
  const { startS, finishS, chainageM, gateS } = deriveGateCrossings({
    t, lat, lon, ref: spec.ref, gates: spec.gates,
  });
  if (startS === null) return null;

  const startMs = startS * 1000;
  const finishMs = finishS === null ? null : finishS * 1000;
  const gateMs = gateS.map((x) => (x === null ? null : x * 1000));
  const endMs = finishMs ?? inOrder[inOrder.length - 1].tUnixMs;

  const loMs = startMs - REPLAY_EDGE_PAD_MS;
  const hiMs = endMs + REPLAY_EDGE_PAD_MS;
  const fixes: ReplayFix[] = inOrder
    .map((f, i) => ({ tUnixMs: f.tUnixMs, lat: f.lat, lon: f.lon, sM: chainageM[i] as number }))
    .filter((f) => f.tUnixMs >= loMs && f.tUnixMs <= hiMs);
  if (fixes.length < 2) return null;

  return { rideId, startMs, finishMs, endMs, gateMs, fixes };
}

/** Ride-seconds at which the replay auto-pauses. */
export function replayEndS(r: ReplayRider): number {
  return (r.endMs - r.startMs) / 1000 + (r.finishMs === null ? 0 : REPLAY_ROLL_OUT_S);
}

/** Wall-clock anchor of the replay clock (the Timebase idea, in ride-seconds). */
export interface ReplayAnchor { clockS: number; realMs: number; rate: number; playing: boolean }

/** Ride-seconds now: clockS + (nowMs - realMs)/1000 * rate while playing, clockS otherwise. Never below 0. */
export function replayClockS(a: ReplayAnchor, nowMs: number): number {
  const v = a.playing ? a.clockS + ((nowMs - a.realMs) / 1000) * a.rate : a.clockS;
  return Math.max(0, v);
}

/** The pane's Timebase for this anchor: {anchorRealMs: realMs, anchorClockMs: clockS*1000, rate, running: playing}. */
export function replayTimebase(a: ReplayAnchor): Timebase {
  return { anchorRealMs: a.realMs, anchorClockMs: a.clockS * 1000, rate: a.rate, running: a.playing };
}

/** Rider position at ride-second clockS: interpAt(r.fixes, r.startMs + clockS*1000). */
export function riderPositionAt(r: ReplayRider, clockS: number): { lat: number; lon: number; sM: number | null } {
  return interpAt(r.fixes, r.startMs + clockS * 1000);
}

/** Highest gate index i >= 1 whose crossing is known and at/before clockS; 0 before any.
 * A missed (null) gate is skipped, a later crossed gate still counts. */
export function replayGatesDone(r: ReplayRider, clockS: number): number {
  const nowMs = r.startMs + clockS * 1000;
  let done = 0;
  for (let i = 1; i < r.gateMs.length; i++) {
    const g = r.gateMs[i];
    if (g !== null && g <= nowMs) done = i;
  }
  return done;
}

/** Gate-indexed sector colours with the unearned ones blanked: index i kept iff 1 <= i <= gatesDone, else null. */
export function replaySectorColours(all: readonly (string | null)[], gatesDone: number): (string | null)[] {
  return all.map((c, i) => (i >= 1 && i <= gatesDone ? c : null));
}

/** The LiveSectorPane model (DemoScreen's demoLiveViewModel, but from real stored rows):
 * strip[k] = sectorRows[k] tier/timeLabel once k+1 <= gatesDone ('none', no time, current
 * = k === gatesDone otherwise); contextLabel 'S<gatesDone+1>' until all done then '';
 * lap = every gate done AND r.finishMs !== null ? {tier: 'neutral', time: lapLabel, delta: ''} : null;
 * flash null, flashKey 0, posChip null, livePos passed through, clock = tb. */
export function replayLiveViewModel(
  r: ReplayRider, sectorRows: readonly SectorRowModel[], lapLabel: string,
  clockS: number, tb: Timebase, livePos: string | null,
): LiveViewModel {
  const gatesDone = replayGatesDone(r, clockS);
  const totalSectors = sectorRows.length > 0 ? sectorRows.length : r.gateMs.length - 1;
  const strip: StripSlotModel[] = [];
  for (let k = 0; k < totalSectors; k++) {
    const row = sectorRows[k];
    if (k + 1 <= gatesDone && row) {
      strip.push({ tier: row.tier as Tier, label: row.label, time: row.timeLabel });
    } else {
      strip.push({ tier: 'none', label: row ? row.label : `S${k + 1}`, current: k === gatesDone });
    }
  }
  const allDone = gatesDone >= totalSectors;
  const contextLabel = allDone ? '' : `S${gatesDone + 1}`;
  const lap = allDone && r.finishMs !== null ? { tier: 'neutral' as Tier, time: lapLabel, delta: '' } : null;
  return {
    clock: tb,
    contextLabel,
    flash: null,
    flashKey: 0,
    lap,
    posChip: null,
    livePos,
    strip,
  };
}

/** Async loader: rides/<rideId>.jsonl through fs, spec via catalogTrackSpecs(); null when
 * the file is absent/unreadable, the way has no spec, or buildReplayRider says null. Never throws. */
export async function loadReplayRider(rideId: string, wayId: string, fs: FsAdapter): Promise<ReplayRider | null> {
  const spec = catalogTrackSpecs().find((s) => s.id === wayId);
  if (!spec) return null;
  try {
    const text = await fs.readText(`rides/${rideId}.jsonl`);
    if (text === null) return null;
    const decoded = decodeRideFile(text);
    return buildReplayRider(rideId, decoded.fixes, spec);
  } catch {
    return null;
  }
}

// Re-export type for callers that only need the self-track shape alongside a rider.
export type { SelfTrack };
