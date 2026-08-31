/**
 * Tier from a time, against the archive ghost set.
 *
 * RATIFIED 2026-08-16 (Nathan): ONE model, IDEAS §19's — purple beats the best
 * of the window, green is above the recent average, yellow is below it. The
 * 'best' and 'hybrid' candidates are gone; the comparison is settled, so the
 * app stops asking.
 *
 * The palette mimics F1 timing, which is where the whole idea comes from:
 * purple = fastest of all, green = a good one, yellow = an ordinary lap. Yellow
 * is NOT failure styling (D-013) — in F1 it is simply the default colour of a
 * time, and most times are ordinary.
 *
 * Reads the derived results store (D-023): no benchmark second is stored, the
 * window is computed here from ordered history. Which is exactly why switching
 * models costs nothing but this function.
 */
import { shippedResults } from '../store/seed.ts';
import { ranks, sectorHistory } from '../store/results.ts';
import type { RideResult } from '../store/types.ts';
import { recordedResults } from './lastRide.ts';

/** D-045 ruling 2 (Nathan, 2026-08-26): the RANKING POOL size — the judged
 * ride plus its WINDOW_PREV most recent previous rides, so a position always
 * reads "P_n of 10", never "of 11". (Historically IDEAS §21's last-N window;
 * a frozen file was the original bug — your own rides never entered it, so a
 * personal best could never raise the purple bar, cycle 009.) */
export const WINDOW_N = 10;

/** The previous-rides comparison window (D-045 ruling 2): the 9 most recent
 * rides a lap is judged against. Judged ride + this window = a pool of
 * exactly WINDOW_N. Sliced AFTER excluding the judged ride, so excluding can
 * no longer backfill an extra older ride into the field — the exact 2026-08-25
 * "P10 of 11 vs P9" bug (cycle 025). */
export const WINDOW_PREV = WINDOW_N - 1;

/** D-008's noise floor, shared by every verdict on screen: below this much
 * comparable history nothing is coloured and nothing is ranked. */
export const MIN_HISTORY = 5;

export type UiTier = 'purple' | 'green' | 'neutral' | 'yellow' | 'est';

/** The archive ghosts this build ships with — [] in a virgin build (B-39,
 * store/seed.ts): colours and ranks then run on the phone's own rides only. */
const GHOSTS: RideResult[] = shippedResults();

/** All rankable history for a route, ascending startedAtMs, unwindowed.
 * Filtered by the store's own `ranks()` — not a local lookalike — so an
 * estimated lap or a tripwire-demoted seed can never sneak in (D-024/D-028). */
function rankedFor(routeId: string): RideResult[] {
  return [...GHOSTS, ...recordedResults()]
    .filter((r) => r.routeId === routeId && ranks(r))
    .sort((a, b) => a.startedAtMs - b.startedAtMs);
}

/**
 * The previous-rides comparison window: the WINDOW_PREV most recent ranked
 * rides, minus the judged ride when it is already stored (B-44's exclusion
 * survives; the slice is now WINDOW_PREV, per D-045 ruling 2). A live lap not
 * yet stored needs no exclusion and gets the same 9. Judged ride + this
 * window = the pool of WINDOW_N.
 */
export function ghostsFor(routeId: string, excludeRideId?: string): RideResult[] {
  return rankedFor(routeId).filter((r) => r.rideId !== excludeRideId).slice(-WINDOW_PREV);
}

/** True count of rankable rides on file for a route — NOT windowed. The only
 * honest source for an "N rides on file" caption (cycle 025: the old caption
 * showed the window size capped at 10 and could contradict the header). */
export function rankedCountFor(routeId: string): number {
  return rankedFor(routeId).length;
}

/**
 * THE ranking pool (D-045 ruling 2): the judged ride plus its WINDOW_PREV most
 * recent other ranked rides — never more than WINDOW_N total, the judged ride
 * always the pool's own 10th slot, so nothing read off this pool can say
 * "of 11". When `currentRideId` is null or has no ranked result on this
 * route, there is no judged ride and the pool is simply the last WINDOW_N
 * ranked rides (pure display). The RESULT header's rank line and the PB
 * ranking list both derive from this one shape — they cannot disagree again.
 */
export function rankingPoolFor(routeId: string, currentRideId: string | null): RideResult[] {
  const all = rankedFor(routeId);
  const current = currentRideId === null ? undefined : all.find((r) => r.rideId === currentRideId);
  if (current === undefined) return all.slice(-WINDOW_N);
  return [...all.filter((r) => r.rideId !== currentRideId).slice(-WINDOW_PREV), current]
    .sort((a, b) => a.startedAtMs - b.startedAtMs);
}

/** B-117 (RESULT half): true when the judged ride HAS a stored result on this
 * route but the store's own ranks() bars it (e.g. a tripwire-demoted lap) —
 * such a lap must not be ranked by a local movingS-only lookalike rule.
 * False when no stored result exists at all: an in-session lap that never
 * reached the store still ranks by its live numbers, as before. */
export function ownLapBarredFromRanking(routeId: string, rideId: string): boolean {
  const own = [...GHOSTS, ...recordedResults()]
    .find((r) => r.routeId === routeId && r.rideId === rideId);
  return own !== undefined && !ranks(own);
}

function stats(values: number[]) {
  const n = values.length;
  if (n === 0) return null;
  const best = Math.min(...values);
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  return { best, mean, sd, n };
}

export function lapValues(routeId: string, excludeRideId?: string): number[] {
  return ghostsFor(routeId, excludeRideId).map((r) => r.lap.movingS as number);
}

/**
 * Sector history for the window. CLEAN ONLY — an interrupted sector carries a
 * red light in it, and letting those into the mean made a sector 26% off the
 * best read green (EveningA S1: best 174.9 s, mean 226.7 s). They still RANK
 * as laps (D-028); they just do not define what "average" means.
 */
export function sectorValues(routeId: string, index: number, excludeRideId?: string): number[] {
  const out: number[] = [];
  for (const r of ghostsFor(routeId, excludeRideId)) {
    const s = r.sectors.find((x) => x.index === index);
    if (s && s.movingS !== null && s.quality === 'clean') out.push(s.movingS);
  }
  return out;
}

/**
 * `history` is the ordered window of comparable times; `value` is today's.
 *
 * D-008's <5-clean-rides rule survives the ruling: too little history means NO
 * verdict at all — 'neutral', which renders as plain ink rather than a colour.
 * Nothing is judged on two rides.
 */
export function tierFor(value: number | null, history: number[]): UiTier {
  if (value === null) return 'est';
  const st = stats(history);
  if (!st || st.n < MIN_HISTORY) return 'neutral';
  if (value < st.best) return 'purple';
  return value < st.mean ? 'green' : 'yellow';
}

/** All-time best moving lap for a route — NOT window-limited: every seed and
 * session result that passes ranks() counts. Feeds the tower's PB ● (D-007),
 * which marks the all-time best, not merely the best of the last N. */
export function allTimeBestLapS(routeId: string): number | null {
  let best: number | null = null;
  for (const r of [...GHOSTS, ...recordedResults()]) {
    if (r.routeId !== routeId || !ranks(r)) continue;
    const v = r.lap.movingS as number;
    if (best === null || v < best) best = v;
  }
  return best;
}

/** Where a lap would place among the ghosts (D-028: position is a fact). */
export function positionAmong(value: number, history: number[]): { pos: number; of: number } {
  const all = [...history, value].sort((a, b) => a - b);
  return { pos: all.indexOf(value) + 1, of: all.length };
}

export function fmt(s: number, decimals: 0 | 1 = 0): string {
  // Round BEFORE splitting minutes. Rounding after produced "9:60" (599.7 s)
  // and "1:010" (69.7 s) — found by the cycle-008 review.
  const whole = decimals === 1 ? Math.floor(s * 10) / 10 : Math.round(s);
  const m = Math.floor(whole / 60);
  const rest = whole - m * 60;
  const sec = decimals === 1 ? rest.toFixed(1) : String(Math.round(rest));
  return `${m}:${rest < 10 ? '0' : ''}${sec}`;
}
