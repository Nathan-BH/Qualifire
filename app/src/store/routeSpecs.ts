/**
 * WP-G: spec-prefix grouping for a way's routes (Nathan, 2026-09-02: "if
 * everything before Spec2 is the same, group the rides together; only at the
 * Spec2 step the two options appear"). Pure, no React; RecordScreen feeds it
 * the way's routes and the current pick and renders one pill row per returned
 * row. Also the naming card's suggestion source. Headless-tested in
 * tests/routespec_suite.ts.
 */
import type { Route } from './types.ts';

type SpecRoute = Pick<Route, 'id' | 'specs'>;

/** Label of the "no further spec" option — a way's plain route (the one ride 1
 * made) sitting beside its variants, or ['Dry'] beside ['Dry','Fast']. */
export const PLAIN_SPEC_LABEL = 'plain';

/** True when at least one route carries a spec — RecordScreen's switch between
 * today's flat pill row (kept byte-identical) and the grouped rows. */
export function hasSpecs(routes: readonly SpecRoute[]): boolean {
  return routes.some((r) => (r.specs?.length ?? 0) > 0);
}

export interface SpecPickOption<T> { label: string; route: T; on: boolean }
export interface SpecPickRow<T> { depth: number; options: SpecPickOption<T>[] }

/**
 * One row per depth at which the routes that share the picked route's spec
 * prefix still disagree. Walk: subset = all routes; at depth d group the
 * subset by specs[d] ('' = the list ends here → PLAIN_SPEC_LABEL, listed
 * first, then first-appearance order); ≥2 groups ⇒ emit a row; descend into
 * the picked route's group; stop after the depth where the picked route's
 * list ends. Exactly one option per row is `on`. Tapping an option selects a
 * concrete route at once — the picked route itself when it is in that group,
 * else `pickWithin(group)` (RecordScreen passes its §8a defaultRouteFor) — so
 * `routePick` stays {wayId, routeId} and every downstream reader
 * (pickedRoute, pickSource, onStart) is untouched. [] for <2 routes or when
 * `pickWithin` yields nothing.
 */
export function specPickRows<T extends SpecRoute>(
  routes: readonly T[],
  pickedId: string | null,
  pickWithin: (subset: T[]) => T | null,
): SpecPickRow<T>[] {
  if (routes.length < 2) return [];
  const picked = routes.find((r) => r.id === pickedId) ?? pickWithin([...routes]);
  if (!picked) return [];
  const path = picked.specs ?? [];
  const rows: SpecPickRow<T>[] = [];
  let subset: T[] = [...routes];
  for (let d = 0; d <= path.length; d++) {
    const groups = new Map<string, T[]>();
    for (const r of subset) {
      const k = (r.specs ?? [])[d]?.toLowerCase() ?? '';
      groups.set(k, [...(groups.get(k) ?? []), r]);
    }
    const keys = [...groups.keys()].sort((a, b) => (a === '' ? -1 : b === '' ? 1 : 0)); // stable: plain first, else first appearance
    if (keys.length >= 2) {
      rows.push({
        depth: d,
        options: keys.map((k) => {
          const g = groups.get(k)!;
          const on = g.includes(picked);
          const label = k === '' ? PLAIN_SPEC_LABEL : (g[0].specs ?? [])[d]; // first-used casing
          return { label, route: on ? picked : (pickWithin(g) ?? g[0]), on };
        }),
      });
    }
    if (d === path.length) break;
    subset = groups.get(path[d].toLowerCase())!;
  }
  return rows;
}

/** Every distinct spec value in the catalog, first-used casing, catalog order. */
export function specVocabulary(routes: readonly SpecRoute[]): string[] {
  const seen = new Map<string, string>(); // lowercase -> first-used casing
  for (const r of routes) {
    for (const s of r.specs ?? []) {
      const k = s.toLowerCase();
      if (!seen.has(k)) seen.set(k, s);
    }
  }
  return [...seen.values()];
}

/**
 * Chips for the naming card's next spec input. Prefix-aware on THIS way
 * first (values used at position `typed.length` by routes whose earlier
 * segments equal `typed`, case-insensitive), then every spec used anywhere
 * in the catalog (`vocabulary`, e.g. 'Dry' from Work→Home offered on
 * Home→Work), deduped case-insensitively keeping first-used casing, minus
 * anything already in `typed`, capped at `max`.
 */
export function specSuggestions(
  wayLists: readonly (readonly string[])[],
  vocabulary: readonly string[],
  typed: readonly string[],
  max = 8,
): string[] {
  const typedLower = typed.map((s) => s.toLowerCase());
  const out: string[] = [];
  const seen = new Set<string>(typedLower);

  const add = (s: string) => {
    const k = s.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(s);
  };

  // This-way continuations first: routes whose earlier segments equal `typed`
  // (case-insensitive), offering the value at position typed.length.
  for (const list of wayLists) {
    if (list.length <= typed.length) continue;
    let matches = true;
    for (let i = 0; i < typedLower.length; i++) {
      if ((list[i] ?? '').toLowerCase() !== typedLower[i]) { matches = false; break; }
    }
    if (!matches) continue;
    add(list[typed.length]);
  }

  // Then every other value in the catalog's vocabulary.
  for (const v of vocabulary) add(v);

  return out.slice(0, max);
}
