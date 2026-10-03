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
 *
 * Built on top of buildResultsList's rows, NOT a re-implementation of the
 * way-level sort: that function's rows are already in the final order, so
 * they are walked once and bucketed per route -- each bucket keeps the flat
 * list's relative order, which IS the way-level order (same comparator).
 * `lastRiddenAtMs` is recomputed from resultsFor since ResultsListRow does
 * not expose its internal lastMs.
 *
 * Group 5 Inspect fix-up (2026-09-28): a way belongs to the route named by
 * `way.routeId`, never to the route whose `wayIds` lists it. The two can
 * disagree on a curated-seed build: store/routeCreation.ts's existing-route
 * path appends the new way to `userCat.routes` only, so a SEED route's
 * `wayIds` never learns about a user-recorded extra way (seed wins in
 * mergeCatalogs, validateCatalog never requires the inverse link). Every
 * other consumer (RoutesScreen, catalogDetailModel, routesForWay) already
 * resolves by `way.routeId`; this file was the odd one out and silently
 * dropped such a way from RESULTS.
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

/** Sum of ride counts over the ways whose `routeId` is this route (the
 * authoritative link -- see the header note), never over `route.wayIds`. A
 * result on a way that names no route, or another route, does not count.
 * Not used by the screen (buildResultsRoutes sums as it buckets); kept as
 * the one-liner definition of "rides on a route" the tests pin down. */
export function rideCountForRoute(
  route: Route,
  catalog: Catalog,
  resultsFor: (wayId: string) => readonly RideResult[],
): number {
  let total = 0;
  for (const w of catalog.ways) if (w.routeId === route.id) total += resultsFor(w.id).length;
  return total;
}

/** §2/§3: group `buildResultsList`'s ridden ways by route (via
 * `way.routeId`), drop routes with zero ridden ways, sort routes most-used
 * first (ties -> most recent -> label). Mirrors `buildResultsList`'s own
 * parameter shape so both read the same store accessors. A ridden way whose
 * routeId names no catalog route has nowhere to be shown and is dropped
 * (validateCatalog rejects that shape anyway). */
export function buildResultsRoutes(
  catalog: Catalog,
  resultsFor: (wayId: string) => RideResult[],
  bestS: (wayId: string) => number | null,
): ResultsRoute[] {
  const { rows } = buildResultsList(catalog, resultsFor, bestS);
  const routeIdByWayId = new Map(catalog.ways.map((w) => [w.id, w.routeId]));

  // rows are already in way-level order; bucketing preserves it per route.
  const waysByRouteId = new Map<string, ResultsWayRow[]>();
  for (const row of rows) {
    const routeId = routeIdByWayId.get(row.wayId);
    if (routeId === undefined) continue;
    const results = resultsFor(row.wayId);
    let lastMs = -Infinity;
    for (const r of results) if (r.startedAtMs > lastMs) lastMs = r.startedAtMs;
    let bucket = waysByRouteId.get(routeId);
    if (bucket === undefined) {
      bucket = [];
      waysByRouteId.set(routeId, bucket);
    }
    bucket.push({
      wayId: row.wayId,
      label: row.label,
      rideCount: row.rides,
      lastRiddenAtMs: lastMs,
      bestLapS: bestS(row.wayId),
    });
  }

  const out: ResultsRoute[] = [];
  for (const route of catalog.routes) {
    const ways = waysByRouteId.get(route.id);
    if (ways === undefined) continue; // decision 6 -- route not ridden at all
    let rideCount = 0;
    let lastRiddenAtMs = -Infinity;
    for (const w of ways) {
      rideCount += w.rideCount;
      if (w.lastRiddenAtMs > lastRiddenAtMs) lastRiddenAtMs = w.lastRiddenAtMs;
    }
    out.push({ routeId: route.id, label: routeLabel(route, catalog), rideCount, lastRiddenAtMs, ways });
  }

  out.sort((a, b) => {
    if (b.rideCount !== a.rideCount) return b.rideCount - a.rideCount;
    if (b.lastRiddenAtMs !== a.lastRiddenAtMs) return b.lastRiddenAtMs - a.lastRiddenAtMs;
    return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
  });
  return out;
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
  const noun = total === 1 ? 'ACTIVITY' : 'ACTIVITIES';
  return rankingsOn
    ? `ALL ${total} ${noun} · fastest first`
    : `ALL ${total} ${noun} · rankings off in SETTINGS`;
}

export function windowCaption(n: number): string {
  return `LAST ${n} ${n === 1 ? 'ACTIVITY' : 'ACTIVITIES'}`;
}
