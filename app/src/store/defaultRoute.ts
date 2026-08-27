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
  // Nathan 2026-08-27: work>>station mirrors station>>work's Std/Alt naming.
  // A=Alt, B=Std — verified against the route traces (A reverses
  // StationWorkAlt, B reverses StationWorkStd); ids unchanged as ever.
  WorkStationA: 'WorkStationAlt',
  WorkStationB: 'WorkStationStd',
};

/** Presentational label for a route id — the Route type has no label field
 * (schema untouched): "Morning" -> "Home Work Dry" (overlay), "EveningA" ->
 * "Work Home Dry" (overlay), "WorkStationA" -> "Work Station A" (derived).
 * Shared by RecordScreen and ResultScreen (previously duplicated). */
export function routeLabel(id: string): string {
  return (ROUTE_DISPLAY_ID[id] ?? id).replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

/** Variant-only label for a route shown inside its way's context (Nathan,
 * 2026-08-27): where "starting from" and "going to" are already their own
 * choices on the RECORD tab, the third choice names ONLY the variant —
 * "Dry", "Wet", "Std", "Alt", "Via Fosh" — never the full FromToVariant
 * concatenation. Derived: the display id (overlay applied) minus the way's
 * capitalized landmark-id pair, split on capitals. Any id that does not
 * follow the convention (or would strip to nothing) falls back to the full
 * routeLabel(), so no pill ever renders blank. */
export function routeVariantLabel(
  id: string,
  way: { startLandmarkId: string; endLandmarkId: string },
): string {
  const display = ROUTE_DISPLAY_ID[id] ?? id;
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const prefix = cap(way.startLandmarkId) + cap(way.endLandmarkId);
  if (display.startsWith(prefix) && display.length > prefix.length) {
    return display.slice(prefix.length).replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  }
  return routeLabel(id);
}

/** Display order for a way's routes (Nathan, 2026-08-27): "Std" always
 * lists before "Alt" — ruled for BOTH directions between station and work,
 * written as a general suffix rule so any future Std/Alt pair behaves the
 * same. Every other route keeps catalog order (the sort is stable —
 * ES2019+ guarantees it, Hermes included). RecordScreen feeds the sorted
 * list to defaultRouteFor, whose first-in-array tiebreak then makes Std
 * the empty-history §8a default too (Nathan's 2026-08-26 ruling: "Std is
 * the default selection"; previously flagged unimplemented). */
export function sortRoutesForDisplay<T extends { id: string }>(routes: T[]): T[] {
  const pri = (id: string): number => {
    const display = ROUTE_DISPLAY_ID[id] ?? id;
    return display.endsWith('Std') ? 0 : display.endsWith('Alt') ? 2 : 1;
  };
  return [...routes].sort((a, b) => pri(a.id) - pri(b.id));
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
