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
import type { Catalog, Landmark, Route, Way } from './types.ts';

export interface CatalogDeletion {
  next: Catalog;
  removedRouteIds: string[];
  removedWayIds: string[];
  removedLandmarkIds: string[];
  /** refLineIds whose refs.user.json entry should go (one per removed route). */
  removedRefLineIds: string[];
}

function unchanged(userCat: Catalog): CatalogDeletion {
  return {
    next: userCat,
    removedRouteIds: [],
    removedWayIds: [],
    removedLandmarkIds: [],
    removedRefLineIds: [],
  };
}

/** Which of these ids are seed-owned (undeletable). UI uses it to hide
 * delete buttons; the module itself never needs to check this (it only ever
 * touches userCat, so a seed id is simply never found there). */
export function isSeedOwned(seedCat: Catalog, kind: 'landmark' | 'way' | 'route', id: string): boolean {
  if (kind === 'landmark') return seedCat.landmarks.some((l) => l.id === id);
  if (kind === 'way') return seedCat.ways.some((w) => w.id === id);
  return seedCat.routes.some((r) => r.id === id);
}

function wayReferences(ways: readonly Way[], landmarkId: string): boolean {
  return ways.some((w) => w.startLandmarkId === landmarkId || w.endLandmarkId === landmarkId);
}

/** Landmarks that were endpoints of `droppedWays` and are, after the drop,
 * referenced by neither a remaining user way nor a seed way — in the
 * catalog's own landmark order (never the ways' start/end order), and each
 * id exactly once (a loop's single landmark is both endpoints of its way). */
function orphanedLandmarkIds(
  userLandmarks: readonly Landmark[],
  remainingUserWays: readonly Way[],
  seedWays: readonly Way[],
  droppedWays: readonly Way[],
): string[] {
  if (droppedWays.length === 0) return [];
  const candidates = new Set<string>();
  for (const w of droppedWays) {
    candidates.add(w.startLandmarkId);
    candidates.add(w.endLandmarkId);
  }
  const out: string[] = [];
  for (const l of userLandmarks) {
    if (!candidates.has(l.id)) continue;
    if (wayReferences(remainingUserWays, l.id)) continue;
    if (wayReferences(seedWays, l.id)) continue;
    out.push(l.id);
  }
  return out;
}

/** Removes one route. If it was its way's only route the way goes too, and
 * any landmark left unreferenced by every remaining user way AND every seed
 * way goes with it. All gate-set versions for the route are removed. */
export function removeRoute(userCat: Catalog, seedCat: Catalog, routeId: string): CatalogDeletion {
  const route = userCat.routes.find((r) => r.id === routeId);
  if (!route) return unchanged(userCat);

  const routes = userCat.routes.filter((r) => r.id !== routeId);
  const gateSets = userCat.gateSets.filter((g) => g.routeId !== routeId);

  const way = userCat.ways.find((w) => w.id === route.wayId);
  let ways = userCat.ways;
  const removedWayIds: string[] = [];
  const droppedWays: Way[] = [];
  if (way) {
    const prunedRouteIds = way.routeIds.filter((rid) => rid !== routeId);
    if (prunedRouteIds.length === 0) {
      ways = userCat.ways.filter((w) => w.id !== way.id);
      removedWayIds.push(way.id);
      droppedWays.push(way);
    } else {
      ways = userCat.ways.map((w) => (w.id === way.id ? { ...w, routeIds: prunedRouteIds } : w));
    }
  }

  const removedLandmarkIds = orphanedLandmarkIds(userCat.landmarks, ways, seedCat.ways, droppedWays);
  const landmarks =
    removedLandmarkIds.length === 0
      ? userCat.landmarks
      : userCat.landmarks.filter((l) => !removedLandmarkIds.includes(l.id));

  const next: Catalog = { schemaVersion: userCat.schemaVersion, landmarks, ways, routes, gateSets };
  return {
    next,
    removedRouteIds: [routeId],
    removedWayIds,
    removedLandmarkIds,
    removedRefLineIds: [route.refLineId],
  };
}

/** Removes a way and every route on it (same cascades as removeRoute,
 * applied to all, in the way's own routeIds order) — one cascade, not two:
 * the way and its landmarks come free on the last route removed. */
export function removeWay(userCat: Catalog, seedCat: Catalog, wayId: string): CatalogDeletion {
  const way = userCat.ways.find((w) => w.id === wayId);
  if (!way) return unchanged(userCat);

  let current = userCat;
  const removedRouteIds: string[] = [];
  const removedWayIds: string[] = [];
  const removedLandmarkIds: string[] = [];
  const removedRefLineIds: string[] = [];
  for (const routeId of way.routeIds) {
    const d = removeRoute(current, seedCat, routeId);
    current = d.next;
    removedRouteIds.push(...d.removedRouteIds);
    removedRefLineIds.push(...d.removedRefLineIds);
    for (const id of d.removedWayIds) if (!removedWayIds.includes(id)) removedWayIds.push(id);
    for (const id of d.removedLandmarkIds) if (!removedLandmarkIds.includes(id)) removedLandmarkIds.push(id);
  }
  return { next: current, removedRouteIds, removedWayIds, removedLandmarkIds, removedRefLineIds };
}

/** Removes a landmark ONLY if no user way and no seed way references it;
 * otherwise returns the input unchanged (report empty). The UI never offers
 * this on a referenced landmark, so this is belt-and-braces. */
export function removeLandmark(userCat: Catalog, seedCat: Catalog, landmarkId: string): CatalogDeletion {
  const landmark = userCat.landmarks.find((l) => l.id === landmarkId);
  if (!landmark) return unchanged(userCat);
  if (wayReferences(userCat.ways, landmarkId) || wayReferences(seedCat.ways, landmarkId)) {
    return unchanged(userCat);
  }
  const landmarks = userCat.landmarks.filter((l) => l.id !== landmarkId);
  const next: Catalog = { ...userCat, landmarks };
  return {
    next,
    removedRouteIds: [],
    removedWayIds: [],
    removedLandmarkIds: [landmarkId],
    removedRefLineIds: [],
  };
}

// Re-exported only so the QA suite can type its own fixtures without a
// second import line; never used by this module's own logic.
export type { Catalog, Landmark, Route, Way };
