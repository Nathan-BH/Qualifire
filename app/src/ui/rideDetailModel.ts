/**
 * WP-H: the ride-detail view model. Pure: every store read is injected so
 * tests can drive it without the results/free-ride stores (same contract as
 * rideHistoryModel.ts's buildRideRows). Absorbs ResultScreen.tsx's per-ride
 * logic verbatim (rankLineFor, lapTier, resultSectorColours) and adds the
 * WP-H facts (ignored, referenceOf, canOfferReference, promoteTarget).
 */
import type { RideResult, Route } from '../store/types.ts';
import type { FreeRideRecord } from '../store/freeRides.ts';
import { ranks } from '../store/results.ts';
import { MIN_HISTORY, positionAmong, tierFor, type UiTier } from './colourModel.ts';
import { lapCellLabel, buildSectorRows, type SectorRowModel } from './rideHistoryModel.ts';
import { colors } from './theme.ts';

// NOT `import { tierLineColour } from './chips.tsx'`: chips.tsx has real JSX
// (React Native components) alongside its pure helpers, and Node's headless
// test runner (--experimental-strip-types) cannot load a .tsx file AT ALL —
// "Unknown file extension .tsx" — even for a value import of a JSX-free
// export. Every prior consumer of chips.tsx's pure pieces (towerModel.ts,
// rideHistoryModel.ts) only ever did TYPE-only imports, which strip to
// nothing and never actually load the module — this is the first PURE model
// that needs the real colour string at runtime. Reproduced verbatim from
// chips.tsx's tierLineColour (chips.tsx:36-43) rather than touching that
// file, which this brief does not name. Keep the two in sync by hand if
// either changes — flagged in the execution report.
function lineColourFor(tier: UiTier): string | null {
  switch (tier) {
    case 'purple': return colors.purple;
    case 'green': return colors.green;
    case 'yellow': return colors.neutral; // chips.tsx's YELLOW_TIER = colors.neutral
    default: return null;
  }
}

export type RideDetailKind = 'route' | 'free' | 'none';

export interface RideDetailModel {
  kind: RideDetailKind;
  rideId: string;
  startedAtMs: number;
  /** null for 'free' and 'none' */
  routeId: string | null;
  lapLabel: string;
  lapTier: UiTier;
  rankLine: string;
  ignored: boolean;
  /** true when the Ignore/Count toggle is meaningful: a stored, route-matched
   * lap that ranks() would accept if the flag were off. */
  canToggleIgnore: boolean;
  /** the route this ride is the reference of, or null */
  referenceOf: Route | null;
  /** WP-H addendum 2026-09-04 (§3.3b): the USER route this ride is matched
   * to and could become the reference of — null when the ride is already
   * its reference, when the route is seed-owned (absent from userRoutes), or
   * when the ride has no route result. Drives the "make this the reference
   * of this route" button. */
  promoteTarget: Route | null;
  sectorRows: SectorRowModel[];
  /** gate-indexed, index 0 null — RouteMapView's sectorColours contract */
  sectorColours: (string | null)[];
  free: FreeRideRecord | null;
}

export interface RideDetailDeps {
  result: RideResult | null;
  free: FreeRideRecord | null;
  routes: readonly Route[];
  /** userCatalog().routes — seed routes are never in it (catalogDelete.ts:51-53's rule) */
  userRoutes: readonly Route[];
  /** lapValues(routeId, rideId) — history EXCLUDING this ride */
  laps: (routeId: string) => number[];
  /** sectorValues(routeId, index, rideId) — history EXCLUDING this ride */
  sectors: (routeId: string, index: number) => number[];
  /** ownLapBarredFromRanking(routeId, rideId) */
  barred: (routeId: string) => boolean;
}

/** ResultScreen.tsx's rankLineFor, verbatim, plus the WP-H 'ignored' branch
 * FIRST — a rider's own exclusion is the most specific reason and reads as
 * such. */
export function rankLineFor(
  r: { lapMovingS: number | null; estimated: boolean; ignored: boolean },
  hist: number[],
  barred: boolean,
): string {
  if (r.ignored) return 'not ranked — you excluded this ride from ranking';
  if (r.lapMovingS !== null) {
    if (barred) return 'no rank — this lap is excluded from the comparison';
    if (hist.length >= MIN_HISTORY) {
      const { pos, of } = positionAmong(r.lapMovingS, hist);
      return `P${pos} of ${of} on this route`;
    }
    return `${hist.length} rides of history — too few to rank`;
  }
  return r.estimated ? 'no time — an estimated lap never ranks' : 'no lap — a missed gate never ranks';
}

/** ResultScreen.tsx's resultSectorColours, verbatim. Empty history (the
 * ignored case passes `() => []`) yields all-null: nothing is coloured on too
 * little history. */
export function sectorColoursFor(result: RideResult, hist: (index: number) => number[]): (string | null)[] {
  return [
    null,
    ...[...result.sectors].sort((a, b) => a.index - b.index).map((sec) =>
      sec.quality === 'clean' && sec.movingS !== null
        ? lineColourFor(tierFor(sec.movingS, hist(sec.index).filter((v) => v !== sec.movingS)))
        : null),
  ];
}

export function rideDetailFor(rideId: string, startedAtMs: number, d: RideDetailDeps): RideDetailModel {
  const referenceOf = d.routes.find((r) => r.referenceRideId === rideId) ?? null;
  const base = { rideId, startedAtMs, referenceOf, free: d.free };
  const res = d.result;
  if (res === null || res.routeId === null) {
    // WP-B precedence: a free-ride record wins over "nothing on file".
    const kind: RideDetailKind = d.free ? 'free' : 'none';
    return { ...base, kind, routeId: null, lapLabel: '–', lapTier: 'neutral', rankLine: '',
      ignored: false, canToggleIgnore: false, promoteTarget: null, sectorRows: [], sectorColours: [] };
  }
  const routeId = res.routeId;
  const ignored = res.ignoredFromRanking === true;
  const estimated = res.lap.quality === 'estimated';
  const hist = d.laps(routeId);
  // While ignored, the ride's OWN verdicts go neutral too (D-013 in spirit:
  // a ride withdrawn from judging others is not judged either).
  const secHist = ignored ? () => [] : (i: number) => d.sectors(routeId, i);
  return {
    ...base,
    kind: 'route',
    routeId,
    lapLabel: lapCellLabel(res.lap.movingS, estimated, res.lap.rawS),
    lapTier: ignored ? 'neutral' : tierFor(res.lap.movingS, hist),
    rankLine: rankLineFor({ lapMovingS: res.lap.movingS, estimated, ignored }, hist, d.barred(routeId)),
    ignored,
    canToggleIgnore: ranks({ ...res, ignoredFromRanking: false }),
    // §3.3b: promotable iff matched to a user-owned route it is not already the reference of.
    promoteTarget: d.userRoutes.find((r) => r.id === routeId && r.referenceRideId !== rideId) ?? null,
    sectorRows: buildSectorRows(res, secHist),
    sectorColours: sectorColoursFor(res, secHist),
  };
}
