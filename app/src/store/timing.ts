/**
 * Which clock scores a ride (STATE.md ground rule, settled 2026-08): RAW
 * wall-clock time by default — every stop counts, a red light is the lap's
 * own luck, exactly as in a real race — with moving time (raw minus detected
 * stopped time) as the opt-in.
 *
 * ONE module-level register, set by SettingsProvider (ui/settings.tsx) the
 * same way setEarconsEnabled() is, read by every verdict through scoredS():
 * no pure model threads a mode parameter, and no call site reads `.movingS`
 * for a tier, rank, PB or printed time again. Nothing stored changes — rawS
 * and movingS both stay on file (store/derive.ts) — this only decides which
 * one a verdict reads.
 */
export type TimingMode = 'raw' | 'moving';
export const DEFAULT_TIMING: TimingMode = 'raw';

let mode: TimingMode = DEFAULT_TIMING;

export function setTimingMode(m: TimingMode): void { mode = m; }
export function timingMode(): TimingMode { return mode; }

/** Minimal shape shared by RideResult.lap, SectorResult, LiveLap and a 'done'
 * LiveSector — everything a verdict is ever taken from. */
export interface TimedLike { rawS: number | null; movingS: number | null }

/**
 * The seconds a verdict (tier, rank, PB, printed time) reads for a lap or a
 * sector under the current mode — or null when there is NO real time.
 *
 * `movingS === null` is the store's own "no real time" marker (derive.ts:77
 * / :113, lastRide.ts:102 / :162 — estimated and missed only), so it is
 * honoured in BOTH modes: raw mode never revives a lap or sector that moving
 * mode would refuse to score. The set of things that rank or colour is
 * therefore identical in the two modes; only the number differs.
 */
export function scoredS(t: TimedLike): number | null {
  if (t.movingS === null) return null;
  if (mode === 'moving') return t.movingS;
  return t.rawS ?? t.movingS;
}
