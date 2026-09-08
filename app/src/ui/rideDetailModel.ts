/**
 * WP-H: the ride-detail view model. Pure: every store read is injected so
 * tests can drive it without the results/free-ride stores (same contract as
 * rideHistoryModel.ts's buildRideRows). Absorbs ResultScreen.tsx's per-ride
 * logic verbatim (rankLineFor, lapTier, resultSectorColours) and adds the
 * WP-H facts (ignored, referenceOf, canOfferReference, promoteTarget).
 */
import type { RideResult, Way } from '../store/types.ts';
import type { FreeRideRecord } from '../store/freeRides.ts';
import { ranks } from '../store/results.ts';
import { scoredS } from '../store/timing.ts';
import { MIN_HISTORY, positionAmong, tierFor, type UiTier } from './colourModel.ts';
import { lapCellLabel, buildSectorRows, type SectorRowModel } from './rideHistoryModel.ts';
import { storedSectorColours } from './sectorTrailModel.ts';
import { tierLineColour } from './tierColour.ts';

export type RideDetailKind = 'route' | 'free' | 'none';

export interface RideDetailModel {
  kind: RideDetailKind;
  rideId: string;
  startedAtMs: number;
  /** null for 'free' and 'none' */
  wayId: string | null;
  lapLabel: string;
  lapTier: UiTier;
  rankLine: string;
  ignored: boolean;
  /** true when the Ignore/Count toggle is meaningful: a stored, route-matched
   * lap that ranks() would accept if the flag were off. */
  canToggleIgnore: boolean;
  /** the route this ride is the reference of, or null */
  referenceOf: Way | null;
  /** WP-H addendum 2026-09-04 (§3.3b): the USER route this ride is matched
   * to and could become the reference of — null when the ride is already
   * its reference, when the route is seed-owned (absent from userRoutes), or
   * when the ride has no route result. Drives the "make this the reference
   * of this route" button. */
  promoteTarget: Way | null;
  sectorRows: SectorRowModel[];
  /** gate-indexed, index 0 null — RouteMapView's sectorColours contract */
  sectorColours: (string | null)[];
  free: FreeRideRecord | null;
}

export interface RideDetailDeps {
  result: RideResult | null;
  free: FreeRideRecord | null;
  ways: readonly Way[];
  /** userCatalog().routes — seed routes are never in it (catalogDelete.ts:51-53's rule) */
  userWays: readonly Way[];
  /** lapValues(routeId, rideId) — history EXCLUDING this ride */
  laps: (wayId: string) => number[];
  /** sectorValues(routeId, index, rideId) — history EXCLUDING this ride */
  sectors: (wayId: string, index: number) => number[];
  /** ownLapBarredFromRanking(routeId, rideId) */
  barred: (wayId: string) => boolean;
}

/** ResultScreen.tsx's rankLineFor, verbatim, plus the WP-H 'ignored' branch
 * FIRST — a rider's own exclusion is the most specific reason and reads as
 * such. */
export function rankLineFor(
  r: { lapS: number | null; estimated: boolean; ignored: boolean },
  hist: number[],
  barred: boolean,
): string {
  if (r.ignored) return 'not ranked — you excluded this ride from ranking';
  if (r.lapS !== null) {
    if (barred) return 'no rank — this lap is excluded from the comparison';
    // D-045 ruling 1 / NW-1 (2026-09-08): rank and colour read the same
    // MIN_HISTORY floor but against different pools. Colour (tierFor)
    // needs MIN_HISTORY PRIOR rides. Rank needs a pool of MIN_HISTORY
    // TOTAL, and this ride is already one member of its own pool — so the
    // reference ride (hist = [], the very first ride on a way) still
    // clears a floor of 1 and gets "P1 of 1", even though its tier is
    // neutral: it has a position among the rides on file, it just never
    // raced anyone for a verdict.
    if (hist.length + 1 >= MIN_HISTORY) {
      const { pos, of } = positionAmong(r.lapS, hist);
      return `P${pos} of ${of} on this way`;
    }
    return `${hist.length} rides of history — too few to rank`;
  }
  return r.estimated ? 'no time — an estimated lap never ranks' : 'no lap — a missed gate never ranks';
}

/** WP-K: thin wrapper over sectorTrailModel.storedSectorColours (the ONE
 * builder Result-equivalent screens, RIDES and any future ride-detail screen
 * share — see that module's header) — kept as a named export because
 * tests/ridedetail_suite.ts exercises it directly. Empty history (the
 * ignored case passes `() => []`) yields all-null: nothing is coloured on too
 * little history. One delta from the pre-WP-K inline version: no longer
 * filters the ride's own value out of `hist(sec.index)` — `hist` here is
 * always `sectorValues(routeId, i, rideId)`, which already excludes this
 * ride BY ID (B-44); filtering by value as well could also drop a genuine
 * tie set by a different ride, and RIDES's buildSectorRows never had that
 * filter — the two surfaces now agree. */
export function sectorColoursFor(result: RideResult, hist: (index: number) => number[]): (string | null)[] {
  return storedSectorColours(result, hist, tierLineColour);
}

export function rideDetailFor(rideId: string, startedAtMs: number, d: RideDetailDeps): RideDetailModel {
  const referenceOf = d.ways.find((r) => r.referenceRideId === rideId) ?? null;
  const base = { rideId, startedAtMs, referenceOf, free: d.free };
  const res = d.result;
  if (res === null || res.wayId === null) {
    // WP-B precedence: a free-ride record wins over "nothing on file".
    const kind: RideDetailKind = d.free ? 'free' : 'none';
    return { ...base, kind, wayId: null, lapLabel: '–', lapTier: 'neutral', rankLine: '',
      ignored: false, canToggleIgnore: false, promoteTarget: null, sectorRows: [], sectorColours: [] };
  }
  const wayId = res.wayId;
  const ignored = res.ignoredFromRanking === true;
  const estimated = res.lap.quality === 'estimated';
  const hist = d.laps(wayId);
  const lapS = scoredS(res.lap);
  // While ignored, the ride's OWN verdicts go neutral too (D-013 in spirit:
  // a ride withdrawn from judging others is not judged either).
  const secHist = ignored ? () => [] : (i: number) => d.sectors(wayId, i);
  return {
    ...base,
    kind: 'route',
    wayId,
    lapLabel: lapCellLabel(lapS, estimated, res.lap.rawS),
    lapTier: ignored ? 'neutral' : tierFor(lapS, hist),
    rankLine: rankLineFor({ lapS, estimated, ignored }, hist, d.barred(wayId)),
    ignored,
    canToggleIgnore: ranks({ ...res, ignoredFromRanking: false }),
    // §3.3b: promotable iff matched to a user-owned route it is not already the reference of.
    promoteTarget: d.userWays.find((r) => r.id === wayId && r.referenceRideId !== rideId) ?? null,
    sectorRows: buildSectorRows(res, secHist),
    sectorColours: sectorColoursFor(res, secHist),
  };
}
