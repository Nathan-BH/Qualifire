/** Data-driven fallbacks that replace the last literal route ids (B-39).
 * Pure — headless-testable. */
import type { Catalog, RideResult } from './types.ts';
import { ranks } from './results.ts';

/** Presentational label for a route id — the Route type has no label field
 * (schema untouched): "EveningA" -> "Evening A", "Morning" -> "Morning".
 * Shared by RecordScreen and ResultScreen (previously duplicated). */
export function routeLabel(id: string): string {
  return id.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

/** The route of the most recent RANKING result (seed or session) — i.e. the
 * same `ranks()` gate the timing tower itself uses (D-024/D-028): an
 * estimated lap or a tripwire-demoted seed can never be picked as "most
 * recent" here either, matching `colourModel.ts`'s own rule against being a
 * local lookalike of `ranks()`. Catalog order breaks ties; null only when
 * the catalog is empty.
 *
 * Most-recent-first, not "first catalog route" — matches what the board's
 * stand-in ghost text promises: the most recent ride's context. Catalog
 * order is only the empty-history tiebreak. */
export function fallbackRouteId(c: Catalog, results: RideResult[]): string | null {
  let best: RideResult | null = null;
  for (const r of results) {
    if (r.routeId === null) continue;
    if (!ranks(r)) continue;
    if (best === null || r.startedAtMs > best.startedAtMs) best = r;
  }
  if (best !== null && c.routes.some((route) => route.id === best!.routeId)) {
    return best.routeId;
  }
  return c.routes[0]?.id ?? null;
}
