/**
 * virgin-cycle18 brief 05 (Nathan 2026-09-29, "two 'Work' places"): the
 * place-picker model shared by the naming card (RecordScreen / RideDetail),
 * the place detail's merge picker, and brief 06's endpoint override. Pure.
 *
 * A place name is unique case-insensitively after trimming (decision 1);
 * the rule is enforced where a label is born or changed (routeCreation.ts
 * newPlaceLabelErrors, catalogMerge.ts), never in validateCatalog.
 */
import type { Catalog, Landmark } from './types.ts';

export interface PlaceOption {
  id: string;
  label: string;
  /** "2 routes" — plus " · lat, lon" (5 dp) when another option shares the label */
  detail: string;
  usage: number;
}

export function normLabel(s: string): string {
  return s.trim().toLowerCase();
}

/** The landmark whose label equals `label` (normLabel), or null. `exceptId`
 * excludes one landmark (rename: a place may keep its own name). */
export function placeByLabel(
  c: Pick<Catalog, 'landmarks'>, label: string, exceptId: string | null = null,
): Landmark | null {
  const want = normLabel(label);
  if (want.length === 0) return null;
  return c.landmarks.find((l) => l.id !== exceptId && normLabel(l.label) === want) ?? null;
}

/** Every landmark as a picker option, most-used first (ties keep catalog
 * order — a stable sort, same as sortLandmarksByUsage), minus `exclude`.
 * `detail` counts the routes touching the place; when two options share a
 * label (Nathan's two "Work"s) each gets its coordinates appended so they
 * can be told apart. `usage` comes from landmarkUsageCounts (injected — this
 * module has no results-store import). */
export function placeOptions(
  c: Pick<Catalog, 'landmarks' | 'routes'>,
  usage: Map<string, number>,
  opts: { exclude?: readonly string[] } = {},
): PlaceOption[] {
  const exclude = new Set(opts.exclude ?? []);
  const kept = c.landmarks.filter((l) => !exclude.has(l.id));
  const labelCount = new Map<string, number>();
  for (const l of kept) labelCount.set(normLabel(l.label), (labelCount.get(normLabel(l.label)) ?? 0) + 1);
  const sorted = [...kept].sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0));
  return sorted.map((l) => {
    const n = c.routes.filter((r) => r.startLandmarkId === l.id || r.endLandmarkId === l.id).length;
    let detail = `${n} route${n === 1 ? '' : 's'}`;
    if ((labelCount.get(normLabel(l.label)) ?? 0) > 1) detail += ` · ${l.lat.toFixed(5)}, ${l.lon.toFixed(5)}`;
    return { id: l.id, label: l.label, detail, usage: usage.get(l.id) ?? 0 };
  });
}

/** Proposals for a typed new-place name (decision 3): '' → []; else options
 * whose label starts with the text, then those containing it, each group in
 * the input's (usage) order, capped at `max`. Case-insensitive. */
export function matchingPlaces(options: readonly PlaceOption[], typed: string, max = 6): PlaceOption[] {
  const q = normLabel(typed);
  if (q.length === 0) return [];
  const starts = options.filter((o) => normLabel(o.label).startsWith(q));
  const contains = options.filter((o) => !normLabel(o.label).startsWith(q) && normLabel(o.label).includes(q));
  return [...starts, ...contains].slice(0, max);
}

/** Why `typed` cannot name a NEW place, or null when it can. '' is null here
 * (emptiness is the caller's own "name required" rule). `otherNewName` is the
 * other endpoint's typed name when that one is new too. */
export function newPlaceNameError(
  existingLabels: readonly string[], typed: string, otherNewName: string | null,
): string | null {
  const q = normLabel(typed);
  if (q.length === 0) return null;
  const taken = existingLabels.find((l) => normLabel(l) === q);
  if (taken !== undefined) return `A place called "${taken}" already exists — tap it above to use it`;
  if (otherNewName !== null && normLabel(otherNewName) === q) return 'start and end cannot share a name';
  return null;
}

/** virgin-cycle18 brief 06: the options for an endpoint's "change" picker —
 * every place, with the one picked at START (when it is a place and differs
 * from nothing in particular — the card marks it) moved to the front. Order
 * otherwise = the input's (usage). Returns a new array. */
export function endpointOptions(options: readonly PlaceOption[], pickedId: string | null): PlaceOption[] {
  if (pickedId === null) return [...options];
  const picked = options.find((o) => o.id === pickedId);
  if (!picked) return [...options];
  return [picked, ...options.filter((o) => o.id !== pickedId)];
}

/** brief 06: the landmark id an endpoint stands for on the card — the
 * proposal until the rider touched it, then the choice (effectiveFromId's
 * rule, recordFlow.ts). null = a new, still-unnamed place. */
export function effectiveEndpointId(
  proposedId: string | null, choice: { kind: 'proposed' } | { kind: 'existing'; landmarkId: string },
): string | null {
  return choice.kind === 'existing' ? choice.landmarkId : proposedId;
}
