import type { Catalog, Landmark } from './types.ts';
import { storedResultsForWay } from './resultsStore.ts';

/** Rides that started OR ended at each landmark, derived on demand (no cache):
 *  ride → wayId → parent route → route.start/endLandmarkId. A loop route counts
 *  each ride once. Free rides (no way) contribute nothing.
 *  cycle15 brief 14, Nathan 2026-09-27: "most used places shown as the first options". */
export function landmarkUsageCounts(
  c: Pick<Catalog, 'routes'>,
  countForWay: (wayId: string) => number = (id) => storedResultsForWay(id).length,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of c.routes) {
    let n = 0;
    for (const w of r.wayIds) n += countForWay(w);
    if (n === 0) continue;
    counts.set(r.startLandmarkId, (counts.get(r.startLandmarkId) ?? 0) + n);
    if (r.endLandmarkId !== r.startLandmarkId) {
      counts.set(r.endLandmarkId, (counts.get(r.endLandmarkId) ?? 0) + n);
    }
  }
  return counts;
}

/** Most-used first; ties keep the input order (stable sort) so an unused
 *  catalog is returned in exactly the order it came in. Returns a new array. */
export function sortLandmarksByUsage(landmarks: Landmark[], counts: Map<string, number>): Landmark[] {
  return [...landmarks].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));
}
