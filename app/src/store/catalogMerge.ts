/**
 * virgin-cycle18 brief 05 (Nathan 2026-09-29): rename a place, or merge one
 * place into another — the recovery for the two "Work" landmarks his phone
 * already holds. Pure, USER catalog in/out (catalogStore.userCatalog()), the
 * caller runs saveUserCatalog (which validates the seed+user merge). Never
 * throws. Landmark ids live in Route.start/endLandmarkId ONLY (brief 05's
 * enumeration): ways, gate sets, user refs, stored results and the recorded
 * window are all keyed by way id and are untouched by construction.
 */
import { mergeCatalogs } from './catalog.ts';
import { placeByLabel } from './placeSearch.ts';
import { sameSpecs } from './routeCreation.ts';
import type { Catalog, Route, Way } from './types.ts';

export type RenameOutcome = { ok: true; next: Catalog } | { ok: false; errors: string[] };

/** Trimmed, non-empty, not another place's name (case-insensitive, seed
 * included); a shipped place cannot be renamed (seed wins every id). */
export function renameLandmark(userCat: Catalog, seedCat: Catalog, id: string, label: string): RenameOutcome {
  const l = userCat.landmarks.find((x) => x.id === id);
  if (!l) return { ok: false, errors: [`"${id}" is not one of your own places — a shipped place cannot be renamed`] };
  const next = label.trim();
  if (next.length === 0) return { ok: false, errors: ['a place needs a name'] };
  const clash = placeByLabel(mergeCatalogs(seedCat, userCat), next, id);
  if (clash) return { ok: false, errors: [`A place called "${clash.label}" already exists`] };
  return { ok: true, next: { ...userCat, landmarks: userCat.landmarks.map((x) => (x.id === id ? { ...x, label: next } : x)) } };
}

export interface FoldedRoute { droppedRouteId: string; intoRouteId: string; movedWayIds: string[] }
export type MergeOutcome =
  | {
      ok: true; next: Catalog;
      /** routes whose start and/or end now reads keepId */
      repointedRouteIds: string[];
      /** routes that became X → X and received a loopDiscriminator */
      loopedRouteIds: string[];
      /** re-pointed twin routes folded into the route that already pointed at
       * keepId (their ways moved); both re-pointed → the earlier one survives (05b) */
      folded: FoldedRoute[];
    }
  | { ok: false; errors: string[] };

function routeKey(r: Route): string {
  return `${r.startLandmarkId}|${r.endLandmarkId}|${r.sportId ?? ''}`;
}

/** Merge `dropId` into `keepId` (decision 6). */
export function mergeLandmarks(userCat: Catalog, seedCat: Catalog, keepId: string, dropId: string): MergeOutcome {
  if (keepId === dropId) return { ok: false, errors: ['pick a different place to merge into'] };
  const merged = mergeCatalogs(seedCat, userCat);
  const keep = merged.landmarks.find((l) => l.id === keepId);
  if (!keep) return { ok: false, errors: [`unknown place "${keepId}"`] };
  const drop = userCat.landmarks.find((l) => l.id === dropId);
  if (!drop) return { ok: false, errors: [`"${dropId}" is not one of your own places — a shipped place cannot be merged away`] };
  const lab = (id: string) => merged.landmarks.find((l) => l.id === id)?.label ?? id;

  // 1. re-point
  const repointedRouteIds: string[] = [];
  const loopedRouteIds: string[] = [];
  let routes: Route[] = userCat.routes.map((r) => {
    if (r.startLandmarkId !== dropId && r.endLandmarkId !== dropId) return r;
    repointedRouteIds.push(r.id);
    const next: Route = {
      ...r,
      startLandmarkId: r.startLandmarkId === dropId ? keepId : r.startLandmarkId,
      endLandmarkId: r.endLandmarkId === dropId ? keepId : r.endLandmarkId,
    };
    if (next.startLandmarkId === next.endLandmarkId && !next.loopDiscriminator) {
      loopedRouteIds.push(r.id);
      return { ...next, loopDiscriminator: `loop:merged:${dropId}` };
    }
    return next;
  });
  const repointed = new Set(repointedRouteIds);

  // 2. fold twins (non-loop, same start/end/sportId, at least one re-pointed).
  // 05b: the route that ALREADY pointed at keepId survives and the re-pointed
  // twin folds into it; when both were re-pointed (pre-existing twins on the
  // dropped place) the earlier one in catalog order survives. `first` is the
  // earlier route of the pair as it stands now (it may already have absorbed
  // a twin); the survivor keeps `first`'s position in the catalog.
  let ways: Way[] = userCat.ways;
  const folded: FoldedRoute[] = [];
  const firstByKey = new Map<string, Route>();
  const out: Route[] = [];
  for (const r of routes) {
    const isLoop = r.startLandmarkId === r.endLandmarkId;
    const first = isLoop ? undefined : firstByKey.get(routeKey(r));
    if (!first || (!repointed.has(first.id) && !repointed.has(r.id))) {
      if (!isLoop && !first) firstByKey.set(routeKey(r), r);
      out.push(r);
      continue;
    }
    const survivor: Route = repointed.has(first.id) && !repointed.has(r.id) ? r : first;
    const loser: Route = survivor === r ? first : r;
    const survivorWays = ways.filter((w) => w.routeId === survivor.id);
    const loserWays = ways.filter((w) => w.routeId === loser.id);
    for (const a of loserWays) {
      if (!a.specs || a.specs.length === 0) continue;
      const twin = survivorWays.find((b) => b.specs && b.specs.length > 0 && sameSpecs(b.specs, a.specs!));
      if (twin) {
        return {
          ok: false,
          errors: [
            `ways "${a.specs.join(' · ')}" on ${lab(r.startLandmarkId)} → ${lab(r.endLandmarkId)} would exist twice after the merge ` +
              `(${twin.id} and ${a.id}) — rename or delete one of them first`,
          ],
        };
      }
    }
    const movedWayIds = loserWays.map((w) => w.id);
    ways = ways.map((w) => (w.routeId === loser.id ? { ...w, routeId: survivor.id } : w));
    const idx = out.findIndex((x) => x.id === first.id);
    const grown: Route = { ...survivor, wayIds: [...survivor.wayIds, ...loser.wayIds] };
    out[idx] = grown;
    firstByKey.set(routeKey(grown), grown);
    folded.push({ droppedRouteId: loser.id, intoRouteId: survivor.id, movedWayIds });
  }
  routes = out;

  // 3. drop the loser
  const landmarks = userCat.landmarks.filter((l) => l.id !== dropId);
  const next: Catalog = { schemaVersion: userCat.schemaVersion, landmarks, routes, ways, gateSets: userCat.gateSets };
  return { ok: true, next, repointedRouteIds, loopedRouteIds, folded };
}
