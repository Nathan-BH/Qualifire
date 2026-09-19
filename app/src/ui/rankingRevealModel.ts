/**
 * virgin-cycle11: the ranking reveal.
 *
 * This module is the provider seam between the finished live state and
 * TimingTower for the post-STOP reveal — the "real data" TimingTower has
 * never had (tower.tsx's own header used to say the real app has no
 * provider; this is that provider). Pure, no React, no expo, no
 * react-native imports — same discipline as towerModel.ts / selfRaceModel.ts.
 *
 * R4 (no reveal): `buildRankingReveal` returns null — the 'ending' screen
 * then behaves exactly as it did before this cycle — whenever there is
 * nothing honest to climb: no way locked (`track === null`), no lap
 * (`lap === null`), an estimated lap (D-028: estimated never ranks), no
 * real scored time (`scoredS(lap) === null`, honoured in both timing
 * modes), or the comparison window is empty (ride 1 of a way — STATE.md's
 * own rule that the reference ride earns a rank once stored but has
 * nothing to compare against yet, so the *ceremony* is withheld even
 * though the rank itself is real).
 *
 * R5 (the exclusion trap): `onEnd` calls `rememberRide()` BEFORE the phase
 * flips to 'ending', and `rememberRide` synchronously stores today's result
 * into the same pool `ghostsFor`/`rankedFor` read. By the time this module
 * runs, today is already in the store — so the window must be built WITH
 * today's rideId as the exclusion, or today would appear twice and the
 * oldest real ride would be silently dropped. `window` and `allTimeBestS`
 * are injectable (headless tests); the defaults are the real store reads,
 * `ghostsFor(st.track, rideId)` WITH exclusion and `allTimeBestLapS(st.track)`
 * (which DOES see today's stored lap — a new PB is a fact about the time,
 * not a ranking-window question).
 *
 * Every constant below (R6) is a starting point for Nathan to eyeball on
 * the phone, not a spec — they all live here so the next round is a
 * constants edit.
 */
import type { LiveEngineState } from '../live/engine.ts';
import type { RideResult } from '../store/types.ts';
import type { Tier } from './chips.tsx';
import type { TowerModel } from './tower.tsx';
import { buildTowerModel } from './towerModel.ts';
import { allTimeBestLapS, ghostsFor } from './colourModel.ts';
import { scoredS } from '../store/timing.ts';

/** Settle time between the 'ending' screen appearing and the climb starting. */
export const REVEAL_START_DELAY_MS = 500;
/** How long the landed board holds before the naming card / reverse mark. */
export const REVEAL_HOLD_MS = 1500;
export const CLIMB_MIN_MS = 600;
export const CLIMB_PER_ROW_MS = 200;
export const CLIMB_MAX_MS = 2200;

export interface RankingReveal {
  model: TowerModel; // today's row in place, from buildTowerModel — never hand-built
  pos: number; // today's 1-based rank in the pool
  of: number; // pool size = window + 1, <= WINDOW_N
  tier: Tier; // today's earned tier (what the flip lands on)
  rowsPassed: number; // rows below today in the full model
  climbMs: number; // climbMsFor(rowsPassed)
}

/** clamp(CLIMB_MIN_MS + CLIMB_PER_ROW_MS * rowsPassed, CLIMB_MIN_MS, CLIMB_MAX_MS) */
export function climbMsFor(rowsPassed: number): number {
  return Math.min(CLIMB_MAX_MS, Math.max(CLIMB_MIN_MS, CLIMB_MIN_MS + CLIMB_PER_ROW_MS * rowsPassed));
}

/**
 * null (no reveal, R4) when: st.track === null, st.lap === null, st.lap.estimated,
 * scoredS(st.lap) === null, or the window is empty. Otherwise the board for
 * `window` + today. `window` and `allTimeBestS` are injectable for headless tests and
 * default to the store reads — ghostsFor(st.track, rideId) WITH the exclusion (R5).
 */
export function buildRankingReveal(
  st: Pick<LiveEngineState, 'track' | 'lap'>,
  rideId: string,
  startedAtMs: number,
  window: RideResult[] = st.track === null ? [] : ghostsFor(st.track, rideId),
  allTimeBestS: number | null = st.track === null ? null : allTimeBestLapS(st.track),
): RankingReveal | null {
  if (st.track === null || st.lap === null) return null;
  if (st.lap.estimated) return null;
  const todayS = scoredS(st.lap);
  if (todayS === null) return null;
  if (window.length === 0) return null;

  const model = buildTowerModel(window, todayS, false, startedAtMs, allTimeBestS);
  const todayIdx = model.rows.findIndex((r) => r.today);
  if (todayIdx < 0) return null;
  const today = model.rows[todayIdx];
  if (today.pos === null) return null;

  return {
    model,
    pos: today.pos,
    of: model.rows.length,
    tier: today.tier,
    rowsPassed: model.rows.length - 1 - todayIdx,
    climbMs: climbMsFor(model.rows.length - 1 - todayIdx),
  };
}
