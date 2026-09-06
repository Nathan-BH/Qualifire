/**
 * WP-K (cycle 2): the ROUTES-tab catalog detail view model — place detail
 * and way detail, the read side of `CatalogDetailScreen.tsx`. Same contract
 * as `rideDetailModel.ts`: pure, every store read injected, no JSX, no expo
 * imports — headless-testable (`tests/catalogdetail_suite.ts`). Its static
 * import chain (`store/types.ts`, `store/catalog.ts`, `store/defaultRoute.ts`,
 * `store/catalogDelete.ts`, `ui/gateAdjustModel.ts`) is JSON-free, so the
 * suite needs no `registerHooks` shim (verified 2026-09-05).
 */
import type { Catalog, Way, Route } from '../store/types.ts';
import { gateSetFor } from '../store/catalog.ts';
import { isSeedOwned } from '../store/catalogDelete.ts';
import { wayLabelIn, wayVariantLabel, sortWaysForDisplay } from '../store/defaultWay.ts';
import { gateName, fmtChainage } from './gateAdjustModel.ts';

export interface CatalogDetailDeps {
  catalog: Catalog;            // currentCatalog()
  seed: Catalog;               // shippedCatalog()
  nowMs: number;
  refLengthM: (refLineId: string) => number | null;   // safeRefFor(id)?.length ?? null
  resultsOnFile: (wayId: string) => number;         // storedResultsForRoute(id).length
  rankedCount: (wayId: string) => number;           // rankedCountFor(id)
  storedStartMs: (rideId: string) => number | null;   // getStoredResult(id)?.startedAtMs ?? null
}

export interface TouchingRouteModel { routeId: string; label: string; direction: 'from' | 'to' | 'loop'; wayCount: number }
export interface PlaceDetailModel {
  id: string; label: string; coordsLabel: string; radiusLabel: string;
  dormant: boolean; offerAtStart: boolean; seedOwned: boolean; deletable: boolean;
  routes: TouchingRouteModel[]; touchingWayIds: string[];
}
export interface GateRowModel { name: string; chainageLabel: string }
export interface WayDetailModel {
  id: string; refLineId: string; variantLabel: string; fullLabel: string;
  seedOwned: boolean; deletable: boolean;
  lengthLabel: string | null;                       // '5.8 km' (1 dp; '850 m' under 1 km)
  gatesLabel: string | null;                        // '5 · v2 · geometric' — null when no gate set
  gateRows: GateRowModel[];                         // [] when no gate set
  ridesOnFile: number; rankedCount: number;
  referenceRide: { rideId: string; startedAtMs: number } | null;   // only when a stored result exists
  referenceUnscored: boolean;                       // referenceRideId set but no stored result
}
export interface RouteDetailModel {
  id: string; label: string; loop: boolean; loopDiscriminator: string | null;
  from: { id: string; label: string } | null; to: { id: string; label: string } | null;
  seedOwned: boolean; deletable: boolean; asksAtStart: boolean; ways: WayDetailModel[];
}

/** "5.8 km" / "850 m" — exported so the suite pins the format. */
export function fmtLengthM(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function landmarkLabel(c: Catalog, id: string): string {
  return c.landmarks.find((l) => l.id === id)?.label ?? id;
}

function routeLabel(c: Catalog, w: Route): string {
  return `${landmarkLabel(c, w.startLandmarkId)} → ${landmarkLabel(c, w.endLandmarkId)}`;
}

function wayDetailFor(r: Way, w: Route, deps: CatalogDetailDeps): WayDetailModel {
  const { catalog: c, seed, refLengthM, resultsOnFile, rankedCount, storedStartMs } = deps;
  const seedOwned = isSeedOwned(seed, 'way', r.id);
  const lengthM = refLengthM(r.refLineId);
  const gates = gateSetFor(c, r.id);
  const n = gates?.chainageM.length ?? 0;
  let referenceRide: { rideId: string; startedAtMs: number } | null = null;
  let referenceUnscored = false;
  if (r.referenceRideId !== undefined) {
    const startedAtMs = storedStartMs(r.referenceRideId);
    if (startedAtMs !== null) referenceRide = { rideId: r.referenceRideId, startedAtMs };
    else referenceUnscored = true;
  }
  return {
    id: r.id,
    refLineId: r.refLineId,
    variantLabel: wayVariantLabel(r.id, w, r.specs),
    fullLabel: wayLabelIn(c, r.id),
    seedOwned,
    deletable: !seedOwned,
    lengthLabel: lengthM !== null ? fmtLengthM(lengthM) : null,
    gatesLabel: gates ? `${n} · v${gates.version}${gates.origin ? ` · ${gates.origin}` : ''}` : null,
    gateRows: gates ? gates.chainageM.map((m, i) => ({ name: gateName(i, n), chainageLabel: fmtChainage(m) })) : [],
    ridesOnFile: resultsOnFile(r.id),
    rankedCount: rankedCount(r.id),
    referenceRide,
    referenceUnscored,
  };
}

/** null when `id` is not a landmark in `deps.catalog` — the screen closes on
 * it (§3.4). */
export function placeDetailFor(id: string, deps: CatalogDetailDeps): PlaceDetailModel | null {
  const { catalog: c, seed, nowMs } = deps;
  const l = c.landmarks.find((x) => x.id === id);
  if (!l) return null;
  const dormant = !l.offerAtStart || (l.activeUntilMs !== null && l.activeUntilMs < nowMs);
  const touchingRoutes = c.routes.filter((w) => w.startLandmarkId === id || w.endLandmarkId === id);
  const seedOwned = isSeedOwned(seed, 'landmark', id);
  const deletable = !seedOwned && touchingRoutes.length === 0;
  const routes: TouchingRouteModel[] = touchingRoutes.map((w) => {
    const direction: TouchingRouteModel['direction'] =
      w.startLandmarkId === id && w.endLandmarkId === id ? 'loop'
        : w.startLandmarkId === id ? 'from' : 'to';
    return {
      routeId: w.id,
      label: routeLabel(c, w),
      direction,
      wayCount: c.ways.filter((r) => r.routeId === w.id).length,
    };
  });
  const touchingWayIds: string[] = [];
  for (const w of touchingRoutes) {
    for (const r of c.ways) {
      if (r.routeId === w.id && !touchingWayIds.includes(r.id)) touchingWayIds.push(r.id);
    }
  }
  return {
    id: l.id,
    label: l.label,
    coordsLabel: `${l.lat.toFixed(5)}, ${l.lon.toFixed(5)}`,
    radiusLabel: `radius ${l.radiusM} m`,
    dormant,
    offerAtStart: l.offerAtStart,
    seedOwned,
    deletable,
    routes,
    touchingWayIds,
  };
}

/** null when `id` is not a way in `deps.catalog` — the screen closes on it
 * (§3.4). */
export function routeDetailFor(id: string, deps: CatalogDetailDeps): RouteDetailModel | null {
  const { catalog: c, seed } = deps;
  const w = c.routes.find((x) => x.id === id);
  if (!w) return null;
  const fromL = c.landmarks.find((l) => l.id === w.startLandmarkId);
  const toL = c.landmarks.find((l) => l.id === w.endLandmarkId);
  const ways = sortWaysForDisplay(c.ways.filter((r) => r.routeId === id));
  const seedOwned = isSeedOwned(seed, 'route', id);
  return {
    id: w.id,
    label: routeLabel(c, w),
    loop: w.startLandmarkId === w.endLandmarkId,
    loopDiscriminator: w.loopDiscriminator ?? null,
    from: fromL ? { id: fromL.id, label: fromL.label } : null,
    to: toL ? { id: toL.id, label: toL.label } : null,
    seedOwned,
    deletable: !seedOwned,
    asksAtStart: ways.length > 1,
    ways: ways.map((r) => wayDetailFor(r, w, deps)),
  };
}
