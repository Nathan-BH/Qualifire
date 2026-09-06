/**
 * WP-Q Part A — per-item catalog delete. Pure (no fs, no React): operates on
 * the USER catalog only (what catalogStore.userCatalog() returns), never on
 * the merged runtime catalog and never on the seed itself — a seed item
 * cannot be deleted from the phone at all (mergeCatalogs' seed-wins rule
 * makes filtering it out of the user catalog a no-op — store/catalog.ts).
 *
 * Every function returns the NEXT user catalog plus a report the UI turns
 * into confirm-dialog text and cascade side-effects (refs.user.json entries,
 * stored results). Never throws; an unknown id returns the input catalog
 * UNCHANGED (same reference) with an empty report — callers can always call
 * saveUserCatalog(result.next) unconditionally.
 *
 * The single cascade (store/catalog.ts's validateCatalog is the contract
 * every case below satisfies):
 *   - removing a route drops it, drops every gate-set version for it (history
 *     is per-route; nothing else references it), then prunes its way's
 *     routeIds — dropping the way too when that was its last route (no
 *     "empty way" is ever valid, catalog.ts:84);
 *   - a way's landmark(s) are freed only once the way itself is dropped, and
 *     only for a landmark no REMAINING user way and no SEED way still
 *     references (a user way may start or end on a seed landmark — reusing
 *     an existing disc, wayCreation.ts — and a user landmark may be shared by
 *     two user ways, e.g. Home is both Home→Work's start and Work→Home's
 *     end);
 *   - removeWay is removeRoute applied over every one of the way's routes (in
 *     catalog order) — one cascade, not two; the way and its landmarks come
 *     free on the last route.
 */
import type { Catalog, Landmark, Way, Route } from './types.ts';

export interface CatalogDeletion {
  next: Catalog;
  removedWayIds: string[];
  removedRouteIds: string[];
  removedLandmarkIds: string[];
  /** refLineIds whose refs.user.json entry should go (one per removed route). */
  removedRefLineIds: string[];
}

function unchanged(userCat: Catalog): CatalogDeletion {
  return {
    next: userCat,
    removedWayIds: [],
    removedRouteIds: [],
    removedLandmarkIds: [],
    removedRefLineIds: [],
  };
}

/** Which of these ids are seed-owned (undeletable). UI uses it to hide
 * delete buttons; the module itself never needs to check this (it only ever
 * touches userCat, so a seed id is simply never found there). */
export function isSeedOwned(seedCat: Catalog, kind: 'landmark' | 'way' | 'route', id: string): boolean {
  if (kind === 'landmark') return seedCat.landmarks.some((l) => l.id === id);
  if (kind === 'route') return seedCat.routes.some((w) => w.id === id);
  return seedCat.ways.some((r) => r.id === id);
}

function routeReferences(routes: readonly Route[], landmarkId: string): boolean {
  return routes.some((w) => w.startLandmarkId === landmarkId || w.endLandmarkId === landmarkId);
}

/** Landmarks that were endpoints of `droppedWays` and are, after the drop,
 * referenced by neither a remaining user way nor a seed way — in the
 * catalog's own landmark order (never the ways' start/end order), and each
 * id exactly once (a loop's single landmark is both endpoints of its way). */
function orphanedLandmarkIds(
  userLandmarks: readonly Landmark[],
  remainingUserRoutes: readonly Route[],
  seedRoutes: readonly Route[],
  droppedRoutes: readonly Route[],
): string[] {
  if (droppedRoutes.length === 0) return [];
  const candidates = new Set<string>();
  for (const w of droppedRoutes) {
    candidates.add(w.startLandmarkId);
    candidates.add(w.endLandmarkId);
  }
  const out: string[] = [];
  for (const l of userLandmarks) {
    if (!candidates.has(l.id)) continue;
    if (routeReferences(remainingUserRoutes, l.id)) continue;
    if (routeReferences(seedRoutes, l.id)) continue;
    out.push(l.id);
  }
  return out;
}

/** Removes one route. If it was its way's only route the way goes too, and
 * any landmark left unreferenced by every remaining user way AND every seed
 * way goes with it. All gate-set versions for the route are removed. */
export function removeWay(userCat: Catalog, seedCat: Catalog, wayId: string): CatalogDeletion {
  const way = userCat.ways.find((r) => r.id === wayId);
  if (!way) return unchanged(userCat);

  const ways = userCat.ways.filter((r) => r.id !== wayId);
  const gateSets = userCat.gateSets.filter((g) => g.wayId !== wayId);

  const route = userCat.routes.find((w) => w.id === way.routeId);
  let routes = userCat.routes;
  const removedRouteIds: string[] = [];
  const droppedRoutes: Route[] = [];
  if (route) {
    const prunedWayIds = route.wayIds.filter((rid) => rid !== wayId);
    if (prunedWayIds.length === 0) {
      routes = userCat.routes.filter((w) => w.id !== route.id);
      removedRouteIds.push(route.id);
      droppedRoutes.push(route);
    } else {
      routes = userCat.routes.map((w) => (w.id === route.id ? { ...w, wayIds: prunedWayIds } : w));
    }
  }

  const removedLandmarkIds = orphanedLandmarkIds(userCat.landmarks, routes, seedCat.routes, droppedRoutes);
  const landmarks =
    removedLandmarkIds.length === 0
      ? userCat.landmarks
      : userCat.landmarks.filter((l) => !removedLandmarkIds.includes(l.id));

  const next: Catalog = { schemaVersion: userCat.schemaVersion, landmarks, routes, ways, gateSets };
  return {
    next,
    removedWayIds: [wayId],
    removedRouteIds,
    removedLandmarkIds,
    removedRefLineIds: [way.refLineId],
  };
}

/** Removes a way and every route on it (same cascades as removeRoute,
 * applied to all, in the way's own routeIds order) — one cascade, not two:
 * the way and its landmarks come free on the last route removed. */
export function removeRoute(userCat: Catalog, seedCat: Catalog, routeId: string): CatalogDeletion {
  const route = userCat.routes.find((w) => w.id === routeId);
  if (!route) return unchanged(userCat);

  let current = userCat;
  const removedWayIds: string[] = [];
  const removedRouteIds: string[] = [];
  const removedLandmarkIds: string[] = [];
  const removedRefLineIds: string[] = [];
  for (const wayId of route.wayIds) {
    const d = removeWay(current, seedCat, wayId);
    current = d.next;
    removedWayIds.push(...d.removedWayIds);
    removedRefLineIds.push(...d.removedRefLineIds);
    for (const id of d.removedRouteIds) if (!removedRouteIds.includes(id)) removedRouteIds.push(id);
    for (const id of d.removedLandmarkIds) if (!removedLandmarkIds.includes(id)) removedLandmarkIds.push(id);
  }
  return { next: current, removedWayIds, removedRouteIds, removedLandmarkIds, removedRefLineIds };
}

/** Removes a landmark ONLY if no user way and no seed way references it;
 * otherwise returns the input unchanged (report empty). The UI never offers
 * this on a referenced landmark, so this is belt-and-braces. */
export function removeLandmark(userCat: Catalog, seedCat: Catalog, landmarkId: string): CatalogDeletion {
  const landmark = userCat.landmarks.find((l) => l.id === landmarkId);
  if (!landmark) return unchanged(userCat);
  if (routeReferences(userCat.routes, landmarkId) || routeReferences(seedCat.routes, landmarkId)) {
    return unchanged(userCat);
  }
  const landmarks = userCat.landmarks.filter((l) => l.id !== landmarkId);
  const next: Catalog = { ...userCat, landmarks };
  return {
    next,
    removedWayIds: [],
    removedRouteIds: [],
    removedLandmarkIds: [landmarkId],
    removedRefLineIds: [],
  };
}

// Re-exported only so the QA suite can type its own fixtures without a
// second import line; never used by this module's own logic.
export type { Catalog, Landmark, Way, Route };
