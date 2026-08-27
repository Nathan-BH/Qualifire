/** Data-driven fallbacks that replace the last literal route ids (B-39).
 * Pure — headless-testable. */
import type { Catalog, RideResult } from './types.ts';
import { ranks } from './results.ts';

/** Display-name overlay (Nathan, 2026-08-26 — WP-route-naming-migration):
 * the four legacy time-of-day ids plus StationHomePreferred render under
 * FromToVariant-style names. The ids themselves never change (no raw-data
 * rewrite — D-023): this maps id -> display-style id only, and routeLabel()
 * then applies the same split-on-capitals every native FromToVariant id
 * gets, so overlaid and native routes render identically. Any id absent
 * here (including future routes) keeps its derived label byte-for-byte. */
export const ROUTE_DISPLAY_ID: Record<string, string> = {
  Morning: 'HomeWorkDry',
  MorningB: 'HomeWorkWet',
  EveningA: 'WorkHomeDry',
  EveningB: 'WorkHomeWet',
  StationHomePreferred: 'StationHomeDry',
};

/** Presentational label for a route id — the Route type has no label field
 * (schema untouched): "Morning" -> "Home Work Dry" (overlay), "EveningA" ->
 * "Work Home Dry" (overlay), "WorkStationA" -> "Work Station A" (derived).
 * Shared by RecordScreen and ResultScreen (previously duplicated). */
export function routeLabel(id: string): string {
  return (ROUTE_DISPLAY_ID[id] ?? id).replace(/([a-z0-9])([A-Z])/g, '$1 $2');
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
