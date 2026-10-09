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

/** virgin-cycle27 brief 01 (Nathan 2026-10-08): per-DESTINATION usage from one
 *  start, derived on demand — ride → wayId → route → route.endLandmarkId. A
 *  loop route (start === end) counts under the start id itself. `countForWay`
 *  returns the ride count and the latest start time of a way's stored results
 *  (resultsStore.storedResultsForWay by default). Nothing is persisted. */
export interface DestinationUsage { count: number; lastMs: number }
export function destinationUsageFrom(
  c: Pick<Catalog, 'routes'>,
  fromId: string,
  statsForWay: (wayId: string) => DestinationUsage = (id) => {
    const rs = storedResultsForWay(id);
    return { count: rs.length, lastMs: rs.length ? rs[rs.length - 1].startedAtMs : 0 };
  },
): Map<string, DestinationUsage> {
  const out = new Map<string, DestinationUsage>();
  for (const r of c.routes) {
    if (r.startLandmarkId !== fromId) continue;
    let count = 0, lastMs = 0;
    for (const w of r.wayIds) {
      const s = statsForWay(w);
      count += s.count;
      if (s.lastMs > lastMs) lastMs = s.lastMs;
    }
    if (count === 0) continue;
    const prev = out.get(r.endLandmarkId) ?? { count: 0, lastMs: 0 };
    out.set(r.endLandmarkId, { count: prev.count + count, lastMs: Math.max(prev.lastMs, lastMs) });
  }
  return out;
}

/** The destination to pre-select for `fromId`: most rides first, then the most
 *  recently ridden, then catalog order (`landmarks` is the catalog's own order).
 *  Returns the landmark id — equal to `fromId` for a loop — or null when the
 *  rider has never ridden from this start (the caller then changes nothing). */
export function suggestedDestination(
  c: Pick<Catalog, 'routes' | 'landmarks'>,
  fromId: string,
  statsForWay?: (wayId: string) => DestinationUsage,
): string | null {
  const usage = destinationUsageFrom(c, fromId, statsForWay);
  let best: string | null = null;
  let bestStat: DestinationUsage = { count: 0, lastMs: 0 };
  for (const l of c.landmarks) {
    const s = usage.get(l.id);
    if (!s) continue;
    if (s.count > bestStat.count || (s.count === bestStat.count && s.lastMs > bestStat.lastMs)) {
      best = l.id;
      bestStat = s;
    }
  }
  return best;
}
