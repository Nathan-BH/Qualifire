/**
 * virgin-cycle24 brief 03 (Nathan 2026-10-06): the MAP tab's pure model. The
 * ROUTES tab became one full-bleed catalog map with three levels (OVERVIEW,
 * PLACE focus, ROUTE focus). This file holds everything decidable without a
 * device: which pins, which ONE line per route pair, which way is the usual
 * way, what a place/route sheet lists, which stretches of a non-highlighted
 * way differ from the highlighted one, and the camera bounds per level.
 *
 * Same contract as `catalogDetailModel.ts`: pure, every store read injected
 * through `CatalogMapDeps`, no React, no expo, no MapLibre. Its static import
 * chain (`store/types.ts`, `store/defaultWay.ts`, `ui/wayMapGeo.ts`) is
 * JSON-free, so `tests/catalogmap_suite.ts` needs no loader hook.
 *
 * Coordinates: `LatLon` is [lat, lon] like `WayAsset.path`; the view flips to
 * GeoJSON [lon, lat] at the edge.
 */
import type { Catalog, Route } from '../store/types.ts';
import { nearestOnPath, placeBounds, type LonLatBoundsBox } from './wayMapGeo.ts';
import { wayVariantLabel } from '../store/defaultWay.ts';

export type LatLon = [number, number];

export interface CatalogMapDeps {
  catalog: Catalog;                                        // activeCatalog()
  pathFor: (wayId: string) => LatLon[] | null;            // assetFor(id)?.path ?? null (null = not drawable)
  ridesFor: (wayId: string) => number;                     // storedResultsForWay(id).length
}

export const MIN_SPAN_M = 800;
export const PAD_FRAC = 0.15;
export const DIFF_THRESHOLD_M = 30;
export const DIFF_GUARD = 6e6;

const M_PER_DEG = 111320;

const drawable = (p: LatLon[] | null): p is LatLon[] => p !== null && p.length >= 2;

function landmarkLabel(c: Catalog, id: string): string {
  return c.landmarks.find((l) => l.id === id)?.label ?? id;
}

function routeLabel(c: Catalog, r: Route): string {
  return `${landmarkLabel(c, r.startLandmarkId)} → ${landmarkLabel(c, r.endLandmarkId)}`;
}

/** D4: the way with the most stored results, tie -> first in `route.wayIds`
 * order; null only for an unknown route or a route with zero ways. */
export function usualWayId(c: Catalog, routeId: string, ridesFor: (wayId: string) => number): string | null {
  const route = c.routes.find((r) => r.id === routeId);
  if (!route || route.wayIds.length === 0) return null;
  let best = route.wayIds[0];
  let bestN = ridesFor(best);
  for (let i = 1; i < route.wayIds.length; i++) {
    const n = ridesFor(route.wayIds[i]);
    if (n > bestN) { best = route.wayIds[i]; bestN = n; }
  }
  return best;
}

/** D5: A->B and B->A share a key; a loop is its own key (its route id). */
export function pairKey(r: Route): string {
  if (r.startLandmarkId === r.endLandmarkId) return r.id;
  const a = r.startLandmarkId < r.endLandmarkId ? r.startLandmarkId : r.endLandmarkId;
  const b = r.startLandmarkId < r.endLandmarkId ? r.endLandmarkId : r.startLandmarkId;
  return `${a}|${b}`;
}

export interface PinModel { id: string; label: string; lat: number; lon: number; radiusM: number }
export interface RouteLineModel {
  key: string;            // pairKey
  routeId: string;        // primary route (D5)
  routeIds: string[];     // every route of the pair (1 or 2)
  wayId: string;          // the way whose path is drawn
  placeIds: string[];     // [start, end] of the primary route
  path: LatLon[];
}
export interface OverviewModel { pins: PinModel[]; lines: RouteLineModel[]; bounds: LonLatBoundsBox | null }

/** Usual way first, then the rest in `route.wayIds` order (ways that exist in the catalog only). */
function orderedWayIds(c: Catalog, route: Route, ridesFor: (wayId: string) => number): string[] {
  const known = route.wayIds.filter((id) => c.ways.some((w) => w.id === id));
  const usual = usualWayId(c, route.id, ridesFor);
  if (usual === null) return known;
  return [usual, ...known.filter((id) => id !== usual)].filter((id, i, a) => a.indexOf(id) === i);
}

function routeRides(route: Route, ridesFor: (wayId: string) => number): number {
  let n = 0;
  for (const id of route.wayIds) n += ridesFor(id);
  return n;
}

/** First way of `route` (usual first) that has a drawable path. */
function drawableWayOf(c: Catalog, route: Route, deps: CatalogMapDeps): { wayId: string; path: LatLon[] } | null {
  for (const id of orderedWayIds(c, route, deps.ridesFor)) {
    const p = deps.pathFor(id);
    if (drawable(p)) return { wayId: id, path: p };
  }
  return null;
}

export function overviewModel(deps: CatalogMapDeps): OverviewModel {
  const c = deps.catalog;
  const pins: PinModel[] = c.landmarks.map((l) => ({
    id: l.id, label: l.label, lat: l.lat, lon: l.lon, radiusM: l.radiusM,
  }));

  const groups = new Map<string, Route[]>();
  for (const r of c.routes) {
    const k = pairKey(r);
    const g = groups.get(k);
    if (g) g.push(r); else groups.set(k, [r]);
  }
  const lines: RouteLineModel[] = [];
  for (const [key, routes] of groups) {
    let primary = routes[0];
    let primaryN = routeRides(primary, deps.ridesFor);
    for (let i = 1; i < routes.length; i++) {
      const n = routeRides(routes[i], deps.ridesFor);
      if (n > primaryN) { primary = routes[i]; primaryN = n; }
    }
    const candidates = [primary, ...routes.filter((r) => r !== primary)];
    let hit: { wayId: string; path: LatLon[] } | null = null;
    for (const r of candidates) {
      hit = drawableWayOf(c, r, deps);
      if (hit) break;
    }
    if (!hit) continue;
    lines.push({
      key,
      routeId: primary.id,
      routeIds: routes.map((r) => r.id),
      wayId: hit.wayId,
      placeIds: [primary.startLandmarkId, primary.endLandmarkId],
      path: hit.path,
    });
  }

  let bounds: LonLatBoundsBox | null;
  if (pins.length === 1) bounds = placeBounds(pins[0].lat, pins[0].lon, pins[0].radiusM);
  else bounds = boundsOfPoints(pins);
  return { pins, lines, bounds };
}

export interface PlaceRouteRow { routeId: string; label: string; direction: 'from' | 'to' | 'loop'; wayCount: number; rides: number }
export interface PlaceFocusModel {
  place: PinModel;
  neighbourIds: string[];
  connectedRouteIds: string[];
  rows: PlaceRouteRow[];
  bounds: LonLatBoundsBox;
}

export function placeFocusModel(placeId: string, deps: CatalogMapDeps): PlaceFocusModel | null {
  const c = deps.catalog;
  const l = c.landmarks.find((x) => x.id === placeId);
  if (!l) return null;
  const place: PinModel = { id: l.id, label: l.label, lat: l.lat, lon: l.lon, radiusM: l.radiusM };
  const touching = c.routes.filter((r) => r.startLandmarkId === placeId || r.endLandmarkId === placeId);
  const otherEnds = new Set<string>();
  for (const r of touching) {
    if (r.startLandmarkId !== placeId) otherEnds.add(r.startLandmarkId);
    if (r.endLandmarkId !== placeId) otherEnds.add(r.endLandmarkId);
  }
  const neighbours = c.landmarks.filter((x) => otherEnds.has(x.id));
  const rowFor = (r: Route): PlaceRouteRow => {
    const direction: PlaceRouteRow['direction'] =
      r.startLandmarkId === placeId && r.endLandmarkId === placeId ? 'loop'
        : r.startLandmarkId === placeId ? 'from' : 'to';
    return {
      routeId: r.id,
      label: routeLabel(c, r),
      direction,
      wayCount: c.ways.filter((w) => w.routeId === r.id).length,
      rides: routeRides(r, deps.ridesFor),
    };
  };
  const all = touching.map(rowFor);
  const rows = [
    ...all.filter((r) => r.direction === 'from'),
    ...all.filter((r) => r.direction === 'to'),
    ...all.filter((r) => r.direction === 'loop'),
  ];
  const bounds = neighbours.length === 0
    ? placeBounds(place.lat, place.lon, place.radiusM)
    : (boundsOfPoints([place, ...neighbours]) as LonLatBoundsBox);
  return {
    place,
    neighbourIds: neighbours.map((x) => x.id),
    connectedRouteIds: touching.map((r) => r.id),
    rows,
    bounds,
  };
}

export interface RouteWayRow { wayId: string; label: string; rides: number; usual: boolean; path: LatLon[] | null }
export interface RouteFocusModel {
  routeId: string; label: string; usualWayId: string | null;
  ways: RouteWayRow[];
  bounds: LonLatBoundsBox | null;
}

export function routeFocusModel(routeId: string, deps: CatalogMapDeps): RouteFocusModel | null {
  const c = deps.catalog;
  const route = c.routes.find((r) => r.id === routeId);
  if (!route) return null;
  const usual = usualWayId(c, routeId, deps.ridesFor);
  const ways: RouteWayRow[] = orderedWayIds(c, route, deps.ridesFor).map((id) => {
    const way = c.ways.find((w) => w.id === id)!;
    const p = deps.pathFor(id);
    return {
      wayId: id,
      label: wayVariantLabel(id, route, way.specs),
      rides: deps.ridesFor(id),
      usual: id === usual,
      path: p,
    };
  });
  const pts: { lat: number; lon: number }[] = [];
  for (const w of ways) {
    if (!w.path) continue;
    for (const [lat, lon] of w.path) pts.push({ lat, lon });
  }
  return { routeId, label: routeLabel(c, route), usualWayId: usual, ways, bounds: boundsOfPoints(pts) };
}

/** D12: the stretches of `other` farther than `thresholdM` from `base`. */
export function differingStretches(base: LatLon[], other: LatLon[], thresholdM = DIFF_THRESHOLD_M): LatLon[][] {
  if (base.length < 2) return other.length >= 2 ? [other] : [];
  if (base.length * other.length > DIFF_GUARD) return [other];
  const far: boolean[] = other.map(([lat, lon]) => {
    const n = nearestOnPath(base, lat, lon);
    return n !== null && n.distM > thresholdM;
  });
  const runs: [number, number][] = [];
  let i = 0;
  while (i < far.length) {
    if (!far[i]) { i++; continue; }
    let j = i;
    while (j + 1 < far.length && far[j + 1]) j++;
    runs.push([Math.max(0, i - 1), Math.min(other.length - 1, j + 1)]);
    i = j + 1;
  }
  const merged: [number, number][] = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return merged
    .filter(([a, b]) => b - a + 1 >= 2)
    .map(([a, b]) => other.slice(a, b + 1));
}

/** Pad by `padFrac` of the span each side, then widen either axis to `minSpanM`. Null for 0 points. */
export function boundsOfPoints(
  points: readonly { lat: number; lon: number }[], padFrac = PAD_FRAC, minSpanM = MIN_SPAN_M,
): LonLatBoundsBox | null {
  if (points.length === 0) return null;
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
  }
  const padLat = (maxLat - minLat) * padFrac;
  const padLon = (maxLon - minLon) * padFrac;
  minLat -= padLat; maxLat += padLat; minLon -= padLon; maxLon += padLon;
  const cLat = (minLat + maxLat) / 2;
  const cLon = (minLon + maxLon) / 2;
  const minLatSpanDeg = minSpanM / M_PER_DEG;
  const minLonSpanDeg = minSpanM / (M_PER_DEG * Math.cos((cLat * Math.PI) / 180));
  if (maxLat - minLat < minLatSpanDeg) { minLat = cLat - minLatSpanDeg / 2; maxLat = cLat + minLatSpanDeg / 2; }
  if (maxLon - minLon < minLonSpanDeg) { minLon = cLon - minLonSpanDeg / 2; maxLon = cLon + minLonSpanDeg / 2; }
  return { minLon, minLat, maxLon, maxLat };
}
