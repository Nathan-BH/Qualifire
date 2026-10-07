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
import type { FreeRideRecord } from '../store/freeRides.ts';
import { wayLabel } from '../store/defaultWay.ts';
import { MIN_HISTORY, fmt, positionAmong, tierFor, type UiTier } from './colourModel.ts';
import { towerDate } from './towerModel.ts';
import { ranks } from '../store/results.ts';
import { scoredS } from '../store/timing.ts';

export { wayLabel };

/**
 * The time-cell rule, shared by the ACTIVITIES feed (buildRideRows below) and the detail page
 * (rideDetailModel.ts) so the two can never show a contradictory verdict for the same ride.
 * D-025: never display an unearned time as if it were genuine. brief 05 (Nathan 2026-10-07):
 * nothing is ever shown as an estimate either — a lap with no real time (scoredS null:
 * estimated or missed) has NO label at all ('' — the surfaces show NOT_RANKED_LABEL instead,
 * feedModel.unrankedForDisplay); the old `~rawS` / "no lap" forms are gone. `estimated` and
 * `rawS` are kept in the signature (now unused) so the two callers stay as they are. */
export function lapCellLabel(lapS: number | null, estimated: boolean, rawS: number | null): string {
  if (lapS !== null) return fmt(lapS, 1);
  return '';
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

/** The `wayName` buildRideRows gives a free ride, and the ONLY way a row is
 * free (virgin-cycle16 03): RidesScreen partitions its FREE RIDES section on
 * this exact literal. Four ridehistory_suite tests pin the text. */
export const FREE_RIDE_ROW_NAME = 'Free activity';

export interface RideRowModel {
  rideId: string;
  startMs: number;
  dateLabel: string;
  wayId: string | null;
  wayName: string | null;
  lapS: number | null;
  lapLabel: string;
  /** null when the lap is clean (nothing worth flagging) or when there is no
   * result at all yet — surfaced only for a non-clean quality. */
  quality: string | null;
  rank: { pos: number; of: number } | null;
}

/**
 * One row per stored ride, newest first. A ride with no derived result yet
 * (not backfilled), or one whose result matched no way, falls through the
 * two overrides below before landing on `wayName: null` (the caller renders
 * no title at all — virgin-cycle20 08 removed the "no way" text):
 *
 * virgin-cycle13 (Nathan 2026-09-24): a "no way" ride was indistinguishable
 * from a free ride, AND a ride that later became a route's own reference
 * stayed "no way" forever — matching only ever runs against ways that
 * existed at backfill time, and a permanent unmatched marker
 * (resultsStore.ts) means it is never retried once the ride's own way is
 * minted from it. Both are display-only fixes; neither touches matching:
 *  1. `referenceWayFor(rideId)` — this ride founded a way (Way.referenceRideId)
 *     — wins outright: shown as "<way name> · ref" via the SAME `labelFor`
 *     already used for a matched wayId, `wayId` stays null (D-025: no real
 *     lap was ever derived for it, so nothing here pretends one was).
 *  2. `pickLabelFor(rideId)` — the START-time pick logged to the ride's own
 *     GPX+ events sidecar (N9's PickEvent) — "<fromLabel> → <toLabel>",
 *     covering both a free ride ("new → new") and a route-mode ride that
 *     genuinely matched nothing. Absent (pre-N9 ride, or no sidecar) falls
 *     through to plain `wayName: null`.
 * Both are optional and default to "nothing on file" so every existing
 * caller/test is unaffected.
 *
 * virgin-cycle15 brief 13 §1 (Nathan 2026-09-27, Fable ruling 2026-09-28):
 * a free ride is NOT a separate population to merge in — it is a raw ride
 * like any other (startRide('free'), same index.json, same listRides()),
 * so it was already in this list in its chronological place, just labelled
 * by fallback 2 as "new → new · no lap". `freeFor(startMs)` — the caller
 * passes freeRideNear(freeRideResults(), startMs), the SAME tolerance match
 * RideDetailScreen resolves the free view with, so row and detail agree by
 * construction — slots in between the two fallbacks above: a ride that
 * founded a way is still "<way name> · ref" (a named free ride became a
 * route's reference; that wins), an unnamed free ride with a record on
 * file is "Free ride" with the ride's own wall-clock duration in the lap
 * slot (virgin-cycle16 02 — a free ride carries no gates; D-025: no lap was ever derived),
 * and everything else falls through to the pick label as
 * before. Default "nothing on file", like the other two.
 *
 * `laps(routeId, excl)` must exclude the ride's own rideId from its history
 * (mockup's `rankInTower` in-place semantics, colourModel's own contract) —
 * the caller passes lapValues(routeId, rideId), which already does this.
 *
 * WP-G: `labelFor` defaults to the plain `routeLabel` re-export (unchanged
 * for every existing caller/test); RIDES passes
 * `(id) => routeLabelIn(currentCatalog(), id)` so a user-minted route shows
 * its way + specs instead of the raw `route:<rideId>` id. This module stays
 * catalog-less on purpose — the caller supplies the lookup.
 */
export function buildRideRows(
  metas: RideMeta[],
  resultFor: (rideId: string) => RideResult | null,
  laps: (wayId: string, excl: string) => number[],
  labelFor: (id: string) => string = wayLabel,
  referenceWayFor: (rideId: string) => { id: string } | null = () => null,
  pickLabelFor: (rideId: string) => string | null = () => null,
  freeFor: (startMs: number) => FreeRideRecord | null = () => null,
): RideRowModel[] {
  return [...metas]
    .sort((a, b) => b.startMs - a.startMs)
    .map((m): RideRowModel => {
      const dateLabel = dateTimeLabel(m.startMs);
      const result = resultFor(m.rideId);
      if (result === null || result.wayId === null) {
        const refWay = referenceWayFor(m.rideId);
        const free = refWay === null ? freeFor(m.startMs) : null;
        if (free !== null) {
          return {
            rideId: m.rideId,
            startMs: m.startMs,
            dateLabel,
            wayId: null,
            wayName: FREE_RIDE_ROW_NAME,
            lapS: null,
            lapLabel: fmt(Math.max(0, (m.endMs - m.startMs) / 1000)),
            quality: null,
            rank: null,
          };
        }
        const wayName = refWay !== null ? `${labelFor(refWay.id)} · ref` : pickLabelFor(m.rideId);
        return {
          rideId: m.rideId,
          startMs: m.startMs,
          dateLabel,
          wayId: null,
          wayName,
          lapS: null,
          lapLabel: '',
          quality: null,
          rank: null,
        };
      }
      const wayId = result.wayId;
      const { lap } = result;
      const lapS = scoredS(lap);
      const lapLabel = lapCellLabel(lapS, lap.quality === 'estimated', lap.rawS);
      const quality = lap.quality === 'clean' ? null : lap.quality;
      let rank: { pos: number; of: number } | null = null;
      // B-117 closed (cycle 025): the row's own eligibility is the store's
      // ranks(), not a movingS-only lookalike — a tripwire-demoted lap must
      // not take a position. The history side was already ranks()-filtered
      // via ghostsFor; this closes the judged-ride side.
      if (lapS !== null && ranks(result)) {
        const hist = laps(wayId, m.rideId);
        // D-008/D-028: too little comparable history is NO verdict, not a
        // generous one — an estimated lap never reaches here at all (lapS is
        // null for 'estimated'/'missed' quality by construction). Rank reads
        // MIN_HISTORY against the POOL (hist + this ride), not hist alone —
        // same divergence as rankLineFor (rideDetailModel.ts, NW-1
        // 2026-09-08): a way's reference ride (hist = []) still ranks
        // "P1 of 1" in this list even though its own tier stays neutral.
        if (hist.length + 1 >= MIN_HISTORY) rank = positionAmong(lapS, hist);
      }
      return {
        rideId: m.rideId,
        startMs: m.startMs,
        dateLabel,
        wayId,
        wayName: labelFor(wayId),
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
  /** virgin-cycle23: seconds vs the sector's average (positive = slower), null without a real time or without history */
  gapS: number | null;
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
      const mean = h.length ? h.reduce((a, b) => a + b, 0) / h.length : null;
      const avgLabel = mean !== null ? `avg ${fmt(mean)}` : '';
      // virgin-cycle23 brief 06 (Nathan 2026-10-07): a sector without a real time shows NO time anywhere (no ~raw, no dash prose).
      if (sec.quality === 'missed') {
        return {
          index: sec.index, label: `S${sec.index}`,
          timeLabel: '', tier: 'est', avgLabel, gapS: null,
        };
      }
      const v = scoredS(sec);
      if (sec.quality === 'estimated' || v === null) {
        return {
          index: sec.index, label: `S${sec.index}`,
          timeLabel: '', tier: 'est', avgLabel, gapS: null,
        };
      }
      // clean or interrupted, with a real time (store/timing.ts). virgin-cycle22 02
      // (Nathan 2026-10-04): no pause mark (U+2016) on an interrupted sector any more;
      // the flag still drives scoring (scoredS) and sector colours, the rider is not told.
      const tier = tierFor(v, h);
      return { index: sec.index, label: `S${sec.index}`, timeLabel: fmt(v, 1), tier, avgLabel, gapS: mean !== null ? v - mean : null };
    });
}

// ------------------------------------------------------------------- RESULT

export interface PbRowModel {
  wayId: string;
  wayName: string;
  pbLabel: string;
  nOnFile: number;
}

/** One row per route that actually has rankable history (`count(r) > 0`),
 * in the order `routeIds` was given — the caller owns ordering. WP-G:
 * `labelFor` defaults to the plain `routeLabel` re-export (unchanged for
 * every existing caller/test); RESULT passes
 * `(id) => routeLabelIn(currentCatalog(), id)`. */
export function buildPbRows(
  wayIds: string[],
  pb: (r: string) => number | null,
  count: (r: string) => number,
  labelFor: (id: string) => string = wayLabel,
): PbRowModel[] {
  return wayIds
    .map((wayId): PbRowModel => {
      const best = pb(wayId);
      return {
        wayId,
        wayName: labelFor(wayId),
        pbLabel: best !== null ? fmt(best, 1) : '–',
        nOnFile: count(wayId),
      };
    })
    .filter((r) => r.nOnFile > 0);
}

export interface PbDetailModel {
  ranking: { posLabel: string; dateLabel: string; timeLabel: string; gapLabel: string; today: boolean }[];
}

/**
 * The expanded detail under one Personal Bests row: the route's ranking
 * (dates, never rideIds — the `today` flag is how the caller's own last ride
 * is marked). virgin-cycle20 08: no sector bests — rolling comparison only (Nathan).
 *
 * `window` is the route's comparison window (caller passes ghostsFor(routeId),
 * unfiltered by excludeRideId — the point here IS to show where the rider's
 * own last ride sits, so it must stay in the window rather than be excluded
 * from it, unlike buildRideRows/the RESULT rank line).
 */
export function buildPbDetail(window: RideResult[], lastRideId: string | null): PbDetailModel {
  const sorted = [...window].sort((a, b) => (scoredS(a.lap) as number) - (scoredS(b.lap) as number));
  const p1 = sorted.length ? (scoredS(sorted[0].lap) as number) : null;
  const ranking = sorted.map((r, i) => {
    const v = scoredS(r.lap) as number;
    const today = r.rideId === lastRideId;
    return {
      posLabel: `P${i + 1}`,
      dateLabel: today ? 'today' : towerDate(r.startedAtMs),
      timeLabel: fmt(v),
      gapLabel: i === 0 ? '' : `+${Math.round(v - (p1 as number))}s`,
      today,
    };
  });

  return { ranking };
}
