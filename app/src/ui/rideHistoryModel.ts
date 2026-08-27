/**
 * Pure view-model builders for RIDES (ride history) and RESULT (last ride +
 * personal bests) — Cycle 024, WP-A3. No React, no expo; headless-testable,
 * same discipline as colourModel.ts / towerModel.ts.
 *
 * Mirrors demos/mockup.html (cycle 022)'s ridesScreen() / resultScreen() /
 * resultDetail() / rankInTower() / shortDate() — the app is being changed TO
 * MATCH the mockup, not the other way around (CLAUDE.md rule 6).
 *
 * Honesty (D-008/D-013/D-025/D-028, unchanged by this brief): position is a
 * fact, colour is a judgement — rank is never coloured here; a lap only ranks
 * with MIN_HISTORY comparable rides; an estimated lap never ranks; no raw
 * B-NN/D-NN id or rideId is ever put in a label a rider sees.
 *
 * `routeLabel` used to be duplicated per-screen (RecordScreen had its own
 * copy) to dodge a cross-screen import; WP-D3 already moved the single real
 * copy to store/defaultRoute.ts (RecordScreen and ResultScreen both import it
 * from there today), so this module just re-exports that one copy rather than
 * re-duplicating a duplicate.
 */
import type { RideMeta } from '../storage/types.ts';
import type { RideResult } from '../store/types.ts';
import { routeLabel } from '../store/defaultRoute.ts';
import { MIN_HISTORY, fmt, positionAmong, tierFor, type UiTier } from './colourModel.ts';
import { towerDate } from './towerModel.ts';
import { ranks } from '../store/results.ts';

export { routeLabel };

/**
 * The lap-time cell rule, shared by RIDES (buildRideRows below) and RESULT
 * (ResultScreen.tsx's big lap figure) so the two screens can never again show
 * a contradictory verdict for the same ride (WP-A3 review fix, 2026-08-24 —
 * RESULT used to fall through to a bare `rawS` for a 'missed'-quality lap,
 * i.e. one that reached START and FINISH but lost a middle gate: not clean,
 * not 'estimated' either, so it slipped past both screens' own `estimated`
 * check and rendered as an ordinary, unearned-looking time). D-025: never
 * display an unearned lap as if it were genuine — a lap with no real moving
 * time is either the honestly-marked `~rawS` of an estimated crossing, or
 * 'no lap' for everything else (missed gate, or no result at all). */
export function lapCellLabel(movingS: number | null, estimated: boolean, rawS: number | null): string {
  if (movingS !== null) return fmt(movingS, 1);
  if (estimated && rawS !== null) return `~${fmt(rawS)}`;
  return 'no lap';
}

/** 'Tue 05 Aug · 08:31' — always absolute, local time (the rider's own day
 * and clock). Never a relative "today"/"yesterday" form outside the one
 * explicit `today` marker in a PB ranking row (buildPbDetail). */
export function dateTimeLabel(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${towerDate(ms)} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ------------------------------------------------------------------- RIDES

export interface RideRowModel {
  rideId: string;
  startMs: number;
  dateLabel: string;
  routeId: string | null;
  routeName: string | null;
  lapS: number | null;
  lapLabel: string;
  /** null when the lap is clean (nothing worth flagging) or when there is no
   * result at all yet — surfaced only for a non-clean quality. */
  quality: string | null;
  rank: { pos: number; of: number } | null;
}

/**
 * One row per stored ride, newest first. A ride with no derived result yet
 * (not backfilled) — or one whose result matched no route — renders as "no
 * route — recorded only" (WP-B will later specialise this into a "free
 * rides" category; keeping it generic here is deliberate, per this brief).
 *
 * `laps(routeId, excl)` must exclude the ride's own rideId from its history
 * (mockup's `rankInTower` in-place semantics, colourModel's own contract) —
 * the caller passes lapValues(routeId, rideId), which already does this.
 */
export function buildRideRows(
  metas: RideMeta[],
  resultFor: (rideId: string) => RideResult | null,
  laps: (routeId: string, excl: string) => number[],
): RideRowModel[] {
  return [...metas]
    .sort((a, b) => b.startMs - a.startMs)
    .map((m): RideRowModel => {
      const dateLabel = dateTimeLabel(m.startMs);
      const result = resultFor(m.rideId);
      if (result === null || result.routeId === null) {
        return {
          rideId: m.rideId,
          startMs: m.startMs,
          dateLabel,
          routeId: null,
          routeName: null,
          lapS: null,
          lapLabel: 'no lap',
          quality: null,
          rank: null,
        };
      }
      const routeId = result.routeId;
      const { lap } = result;
      const lapS = lap.movingS;
      const lapLabel = lapCellLabel(lapS, lap.quality === 'estimated', lap.rawS);
      const quality = lap.quality === 'clean' ? null : lap.quality;
      let rank: { pos: number; of: number } | null = null;
      // B-117 closed (cycle 025): the row's own eligibility is the store's
      // ranks(), not a movingS-only lookalike — a tripwire-demoted lap must
      // not take a position. The history side was already ranks()-filtered
      // via ghostsFor; this closes the judged-ride side.
      if (lapS !== null && ranks(result)) {
        const hist = laps(routeId, m.rideId);
        // D-008/D-028: too little comparable history is NO verdict, not a
        // generous one — an estimated lap never reaches here at all (lapS is
        // null for 'estimated'/'missed' quality by construction).
        if (hist.length >= MIN_HISTORY) rank = positionAmong(lapS, hist);
      }
      return {
        rideId: m.rideId,
        startMs: m.startMs,
        dateLabel,
        routeId,
        routeName: routeLabel(routeId),
        lapS,
        lapLabel,
        quality,
        rank,
      };
    });
}

export interface SectorRowModel {
  index: number;
  label: string;
  timeLabel: string;
  tier: UiTier;
  avgLabel: string;
}

/**
 * One row per sector of a single ride, ascending index. `hist(index)` must
 * already exclude this ride from its own comparison (caller passes
 * sectorValues(routeId, index, rideId)).
 */
export function buildSectorRows(
  result: RideResult,
  hist: (index: number) => number[],
): SectorRowModel[] {
  return [...result.sectors]
    .sort((a, b) => a.index - b.index)
    .map((sec): SectorRowModel => {
      const h = hist(sec.index);
      const avgLabel = h.length ? `avg ${fmt(h.reduce((a, b) => a + b, 0) / h.length)}` : '';
      if (sec.quality === 'missed') {
        return {
          index: sec.index, label: `S${sec.index}`,
          timeLabel: '– did not traverse –', tier: 'est', avgLabel,
        };
      }
      if (sec.quality === 'estimated' || sec.movingS === null) {
        return {
          index: sec.index, label: `S${sec.index}`,
          timeLabel: `~${fmt(sec.rawS)}`, tier: 'est', avgLabel,
        };
      }
      // clean or interrupted, with a real moving time.
      const tier = tierFor(sec.movingS, h);
      const label = sec.quality === 'interrupted' ? `S${sec.index} ‖` : `S${sec.index}`;
      return { index: sec.index, label, timeLabel: fmt(sec.movingS, 1), tier, avgLabel };
    });
}

// ------------------------------------------------------------------- RESULT

export interface PbRowModel {
  routeId: string;
  routeName: string;
  pbLabel: string;
  nOnFile: number;
}

/** One row per route that actually has rankable history (`count(r) > 0`),
 * in the order `routeIds` was given — the caller owns ordering. */
export function buildPbRows(
  routeIds: string[],
  pb: (r: string) => number | null,
  count: (r: string) => number,
): PbRowModel[] {
  return routeIds
    .map((routeId): PbRowModel => {
      const best = pb(routeId);
      return {
        routeId,
        routeName: routeLabel(routeId),
        pbLabel: best !== null ? fmt(best, 1) : '–',
        nOnFile: count(routeId),
      };
    })
    .filter((r) => r.nOnFile > 0);
}

export interface PbDetailModel {
  ranking: { posLabel: string; dateLabel: string; timeLabel: string; gapLabel: string; today: boolean }[];
  pbSectors: { label: string; timeLabel: string }[];
}

/**
 * The expanded detail under one Personal Bests row: the route's ranking
 * (dates, never rideIds — the `today` flag is how the caller's own last ride
 * is marked) and its best-ever sector split.
 *
 * `window` is the route's comparison window (caller passes ghostsFor(routeId),
 * unfiltered by excludeRideId — the point here IS to show where the rider's
 * own last ride sits, so it must stay in the window rather than be excluded
 * from it, unlike buildRideRows/the RESULT rank line).
 */
export function buildPbDetail(window: RideResult[], lastRideId: string | null): PbDetailModel {
  const sorted = [...window].sort((a, b) => (a.lap.movingS as number) - (b.lap.movingS as number));
  const p1 = sorted.length ? (sorted[0].lap.movingS as number) : null;
  const ranking = sorted.map((r, i) => {
    const v = r.lap.movingS as number;
    const today = r.rideId === lastRideId;
    return {
      posLabel: `P${i + 1}`,
      dateLabel: today ? 'today' : towerDate(r.startedAtMs),
      timeLabel: fmt(v),
      gapLabel: i === 0 ? '' : `+${Math.round(v - (p1 as number))}s`,
      today,
    };
  });

  // Sector indices are read from the window itself rather than assumed
  // 1..N — different gate-set versions of the same route could in principle
  // carry different sector counts in the same window.
  const indices = new Set<number>();
  for (const r of window) for (const s of r.sectors) indices.add(s.index);
  const pbSectors = [...indices].sort((a, b) => a - b).map((i) => {
    let best: number | null = null;
    for (const r of window) {
      const s = r.sectors.find((x) => x.index === i);
      if (s && s.quality === 'clean' && s.movingS !== null && (best === null || s.movingS < best)) {
        best = s.movingS;
      }
    }
    return { label: `S${i}`, timeLabel: best !== null ? fmt(best, 1) : '–' };
  });

  return { ranking, pbSectors };
}
