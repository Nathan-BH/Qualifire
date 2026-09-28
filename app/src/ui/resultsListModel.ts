/**
 * Pure view-model for the RESULTS tab (WP-2 Phase A): the way-list (§3.8)
 * and the per-way all-time history board (§3.2). No React, no store reads —
 * everything the caller knows is passed in, so this runs headless.
 */
import type { Catalog, RideResult, Route } from '../store/types.ts';
import { wayLabelIn } from '../store/defaultWay.ts';
import { tower } from '../store/results.ts';
import { towerDate } from './towerModel.ts';
import { fmt } from './colourModel.ts';

// -------------------------------------------------------------- the list

export interface ResultsListRow {
  wayId: string;
  label: string;
  rides: number;
  bestLabel: string | null;
  lastLabel: string | null;
}

export interface ResultsListModel {
  rows: ResultsListRow[];
  unriddenWays: number;
}

/** §3.8: every way in the catalog with >=1 stored result, most-ridden
 * first; ties broken by the most recent ride, then by label. A way with
 * zero results is not a row — it is only counted in `unriddenWays`. */
export function buildResultsList(
  catalog: Catalog,
  resultsFor: (wayId: string) => RideResult[],
  bestS: (wayId: string) => number | null,
): ResultsListModel {
  interface Internal extends ResultsListRow { lastMs: number }
  const internal: Internal[] = [];
  let unriddenWays = 0;

  for (const w of catalog.ways) {
    const results = resultsFor(w.id);
    if (results.length === 0) {
      unriddenWays++;
      continue;
    }
    let lastMs = -Infinity;
    for (const r of results) if (r.startedAtMs > lastMs) lastMs = r.startedAtMs;
    const best = bestS(w.id);
    internal.push({
      wayId: w.id,
      label: wayLabelIn(catalog, w.id),
      rides: results.length,
      bestLabel: best !== null ? fmt(best) : null,
      lastLabel: towerDate(lastMs),
      lastMs,
    });
  }

  internal.sort((a, b) => {
    if (b.rides !== a.rides) return b.rides - a.rides;
    if (b.lastMs !== a.lastMs) return b.lastMs - a.lastMs;
    return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
  });

  const rows: ResultsListRow[] = internal.map(({ wayId, label, rides, bestLabel, lastLabel }) => (
    { wayId, label, rides, bestLabel, lastLabel }
  ));
  return { rows, unriddenWays };
}

// ------------------------------------------------------------- the routes

/**
 * virgin-cycle15 brief 13 / Fable ruling 2026-09-28: RESULTS is grouped by
 * route, then way. Only ridden things are listed at either level. Both
 * levels sort most-used first, ties -> most recent -> label. Counts are
 * derived on demand from resultsFor (the codebase convention -- no cache).
 * Built on top of buildResultsList's rows (not a re-implementation of the
 * way-level sort) -- a route's ridden ways are that function's rows
 * filtered onto route.wayIds; `lastRiddenAtMs` is recomputed directly from
 * resultsFor since ResultsListRow does not expose its internal lastMs.
 */
export interface ResultsWayRow {
  wayId: string;
  label: string;          // the way's display label as the flat list showed it today
  rideCount: number;
  lastRiddenAtMs: number; // max start time over its rides
  bestLapS: number | null;
}

export interface ResultsRoute {
  routeId: string;
  label: string;          // `From → To`, same helper as RoutesScreen
  rideCount: number;      // sum over ridden ways
  lastRiddenAtMs: number; // max over ridden ways
  ways: ResultsWayRow[];  // ridden ways only, sorted (rides desc, recent desc, label asc)
}

/** `From → To`, lifted from RoutesScreen.tsx's inline JSX (decision 10) --
 * RoutesScreen.tsx itself is left untouched. A missing landmark (should not
 * happen in a valid catalog) renders as '?' for that side, never a raw id. */
export function routeLabel(route: Route, catalog: Catalog): string {
  const from = catalog.landmarks.find((l) => l.id === route.startLandmarkId);
  const to = catalog.landmarks.find((l) => l.id === route.endLandmarkId);
  return `${from?.label ?? '?'} → ${to?.label ?? '?'}`;
}

/** Sum of ridden-way ride counts over exactly this route's `wayIds` -- a
 * stray result on a way not listed under the route (should not happen) does
 * not count. */
export function rideCountForRoute(route: Route, resultsFor: (wayId: string) => readonly RideResult[]): number {
  let total = 0;
  for (const wayId of route.wayIds) total += resultsFor(wayId).length;
  return total;
}

/** §2/§3: group `buildResultsList`'s ridden ways by route, drop routes with
 * zero ridden ways, sort routes most-used first (ties -> most recent ->
 * label). Mirrors `buildResultsList`'s own parameter shape so both read the
 * same store accessors. */
export function buildResultsRoutes(
  catalog: Catalog,
  resultsFor: (wayId: string) => RideResult[],
  bestS: (wayId: string) => number | null,
): ResultsRoute[] {
  const { rows } = buildResultsList(catalog, resultsFor, bestS);
  const rowByWayId = new Map(rows.map((r) => [r.wayId, r]));

  interface Internal extends ResultsRoute { lastMs: number }
  const internal: Internal[] = [];

  for (const route of catalog.routes) {
    const ways: ResultsWayRow[] = [];
    let rideCount = 0;
    let lastRiddenAtMs = -Infinity;
    for (const wayId of route.wayIds) {
      const row = rowByWayId.get(wayId);
      if (row === undefined) continue; // unridden -- decision 6
      const results = resultsFor(wayId);
      let lastMs = -Infinity;
      for (const r of results) if (r.startedAtMs > lastMs) lastMs = r.startedAtMs;
      ways.push({
        wayId: row.wayId,
        label: row.label,
        rideCount: row.rides,
        lastRiddenAtMs: lastMs,
        bestLapS: bestS(wayId),
      });
      rideCount += row.rides;
      if (lastMs > lastRiddenAtMs) lastRiddenAtMs = lastMs;
    }
    if (ways.length === 0) continue; // decision 6 -- route not ridden at all
    ways.sort((a, b) => {
      if (b.rideCount !== a.rideCount) return b.rideCount - a.rideCount;
      if (b.lastRiddenAtMs !== a.lastRiddenAtMs) return b.lastRiddenAtMs - a.lastRiddenAtMs;
      return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
    });
    internal.push({
      routeId: route.id,
      label: routeLabel(route, catalog),
      rideCount,
      lastRiddenAtMs,
      ways,
      lastMs: lastRiddenAtMs,
    });
  }

  internal.sort((a, b) => {
    if (b.rideCount !== a.rideCount) return b.rideCount - a.rideCount;
    if (b.lastMs !== a.lastMs) return b.lastMs - a.lastMs;
    return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
  });

  return internal.map(({ routeId, label, rideCount, lastRiddenAtMs, ways }) => (
    { routeId, label, rideCount, lastRiddenAtMs, ways }
  ));
}

// ------------------------------------------------------------ the board

export interface HistoryRow {
  rideId: string;
  startedAtMs: number;
  /** 1-based all-time position; null = not ranked (rider-ignored,
   * tripwire-demoted, estimated/missed — same gate as results.ts's ranks()). */
  pos: number | null;
  timeLabel: string;
  gapLabel: string;
  dateLabel: string;
  /** the all-time PB — the first row whose time equals allTimeBestS. */
  pb: boolean;
  /** true for an estimated/missed lap (lap.quality) — timeLabel is 'NO TIME'. */
  noTime: boolean;
}

export interface HistoryBoardModel {
  rows: HistoryRow[];
  ranked: number;
  total: number;
}

/** §3.2: the ALL-TIME board — unbounded `tower()` over every stored result
 * on the way. Ranked rows keep tower()'s ascending positions; unranked rows
 * (rider-ignored, tripwire-demoted, estimated/missed) follow in tower()'s
 * own order, `pos: null`. NO TIME is decided by lap.quality, never by the
 * scored time being null — an ignored-but-clean ride keeps its real time. */
export function buildHistoryBoard(results: RideResult[], allTimeBestS: number | null): HistoryBoardModel {
  const byId = new Map(results.map((r) => [r.rideId, r]));
  const towerRows = tower(results);

  let p1TimeS: number | null = null;
  for (const row of towerRows) {
    if (row.position === 1) { p1TimeS = row.timeS; break; }
  }

  let ranked = 0;
  let pbAssigned = false;
  const rows: HistoryRow[] = towerRows.map((row) => {
    const src = byId.get(row.rideId);
    const startedAtMs = src?.startedAtMs ?? 0;
    const quality = src?.lap.quality;
    const noTime = quality === 'estimated' || quality === 'missed';
    if (row.position !== null) ranked++;
    const isPb = !pbAssigned && allTimeBestS !== null && row.timeS === allTimeBestS;
    if (isPb) pbAssigned = true;
    const gapLabel = row.position === null
      ? ''
      : row.position === 1
        ? '—'
        : `+${Math.round(row.timeS - (p1TimeS as number))}s`;
    return {
      rideId: row.rideId,
      startedAtMs,
      pos: row.position,
      timeLabel: noTime ? 'NO TIME' : fmt(row.timeS),
      gapLabel,
      dateLabel: towerDate(startedAtMs),
      pb: isPb,
      noTime,
    };
  });

  return { rows, ranked, total: results.length };
}

export function boardCaption(total: number, rankingsOn: boolean): string {
  const noun = total === 1 ? 'RIDE' : 'RIDES';
  return rankingsOn
    ? `ALL ${total} ${noun} · fastest first`
    : `ALL ${total} ${noun} · rankings off in SETTINGS`;
}

export function windowCaption(n: number): string {
  return `LAST ${n} ${n === 1 ? 'RIDE' : 'RIDES'}`;
}
