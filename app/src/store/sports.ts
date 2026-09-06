/**
 * User-defined sports (WP-1, 2026-09-06). Pure — no expo, no Node imports,
 * same header discipline as types.ts, so the QA suite runs it headless.
 *
 * Nathan's design (virgin-cycle3/WP-1-multi-sport-support.md §3.4): sports
 * are named by the rider, never seeded — a fresh install has zero sports
 * until one is added. `activeSportId === null` iff `sports.length === 0`.
 *
 * Scoping is tag-and-filter, not partitioned storage (§3.1 decision A2):
 * `sportId` lives on `Route` (the from→to base path — the parent, §3.3), and
 * everything else (Way, GateSet, RideResult) is scoped TRANSITIVELY through
 * the route it hangs off. `scopeCatalog` is the one derived read-side lens
 * every screen/helper reads through; writes always go through the full user
 * catalog untouched (catalogStore.saveUserCatalog).
 *
 * Fallback rule for unstamped data (§3.4): a route with no `sportId`, or one
 * whose `sportId` no longer names a live sport, belongs to `sports[0]` (the
 * first sport ever created, append order, never reordered) — or to no sport
 * at all when the list is empty. No file is ever rewritten to backfill this;
 * it is a pure read-time computation, every time.
 */
import type { Catalog, Route } from './types.ts';

export const SPORTS_SCHEMA_VERSION = 1;
export const MAX_SPORT_LABEL = 24;
export const SPORT_LABEL_PLACEHOLDER = 'e.g. Bike, Run, Walk, E-bike, Fast walk';

export interface Sport {
  id: string;
  label: string;
  createdAtMs: number;
}

export interface SportsFile {
  schemaVersion: number;
  sports: Sport[];
  activeSportId: string | null;
}

/** The zero-sports state — a fresh install, or the state right after a
 * Reset-to-virgin (sports.json lives under the storage root on purpose, so a
 * reset returns here too). Nothing is pre-created (Q1). */
export function emptySports(): SportsFile {
  return { schemaVersion: SPORTS_SCHEMA_VERSION, sports: [], activeSportId: null };
}

function isNonNullObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isSport(v: unknown): v is Sport {
  return (
    isNonNullObject(v) &&
    typeof v.id === 'string' &&
    typeof v.label === 'string' &&
    typeof v.createdAtMs === 'number'
  );
}

/** null on unrecognisable text so the caller falls back to emptySports()
 * rather than trusting it (mirrors catalog.ts's decodeCatalog posture). */
export function decodeSports(text: string): SportsFile | null {
  try {
    const raw = JSON.parse(text) as unknown;
    if (!isNonNullObject(raw)) return null;
    if (!Array.isArray(raw.sports)) return null;
    if (!raw.sports.every(isSport)) return null;
    if (!(raw.activeSportId === null || typeof raw.activeSportId === 'string')) return null;
    if (typeof raw.schemaVersion !== 'number') return null;
    return {
      schemaVersion: raw.schemaVersion,
      sports: raw.sports,
      activeSportId: raw.activeSportId,
    };
  } catch {
    return null;
  }
}

/** Matches catalog.ts's encodeCatalog convention: pretty-printed + trailing \n. */
export function encodeSports(f: SportsFile): string {
  return JSON.stringify(f, null, 1) + '\n';
}

/** Every structural problem, as human-readable strings. Empty = valid. */
export function validateSports(f: SportsFile): string[] {
  const errs: string[] = [];
  const ids = new Set<string>();
  const labelsLower = new Set<string>();
  for (const s of f.sports) {
    if (ids.has(s.id)) errs.push(`duplicate sport id: ${s.id}`);
    ids.add(s.id);
    const trimmed = s.label.trim();
    if (trimmed.length < 1 || trimmed.length > MAX_SPORT_LABEL) {
      errs.push(`sport "${s.id}" label must be 1-${MAX_SPORT_LABEL} chars: "${s.label}"`);
    }
    const lower = trimmed.toLowerCase();
    if (labelsLower.has(lower)) errs.push(`duplicate sport label (case-insensitive): "${trimmed}"`);
    labelsLower.add(lower);
  }
  if (f.sports.length === 0) {
    if (f.activeSportId !== null) errs.push('activeSportId must be null when there are no sports');
  } else {
    if (f.activeSportId === null) errs.push('activeSportId must be set when sports exist');
    else if (!ids.has(f.activeSportId)) errs.push(`activeSportId "${f.activeSportId}" is not a known sport`);
  }
  return errs;
}

/** §3.4 fallback rule for a route: its own sportId when that sport still
 * exists; otherwise (absent, or naming a sport that was deleted) the FIRST
 * sport ever created; null when there are no sports at all. */
export function effectiveSportId(route: Route, f: SportsFile): string | null {
  if (route.sportId && f.sports.some((s) => s.id === route.sportId)) return route.sportId;
  return f.sports[0]?.id ?? null;
}

/** Same fallback rule for a ride's own stamp (HeaderRecord/IndexEntry.sportId). */
export function effectiveRideSportId(sportId: string | undefined, f: SportsFile): string | null {
  if (sportId && f.sports.some((s) => s.id === sportId)) return sportId;
  return f.sports[0]?.id ?? null;
}

/** The one derived view every reader uses instead of currentCatalog(): all
 * landmarks (shared — §2.2/§3.3), routes whose effective sport matches, the
 * ways on those routes, the gate sets of those ways. `sportId === null`
 * (zero sports OR "no sport filter") returns `c` AS IS — the whole catalog,
 * one implicit universe, today's behaviour before WP-1 existed. */
export function scopeCatalog(c: Catalog, sportId: string | null, f: SportsFile): Catalog {
  if (sportId === null) return c;
  const routes = c.routes.filter((r) => effectiveSportId(r, f) === sportId);
  const routeIds = new Set(routes.map((r) => r.id));
  const ways = c.ways.filter((w) => routeIds.has(w.routeId));
  const wayIds = new Set(ways.map((w) => w.id));
  const gateSets = c.gateSets.filter((g) => wayIds.has(g.wayId));
  return { schemaVersion: c.schemaVersion, landmarks: c.landmarks, routes, ways, gateSets };
}

/** The way ids reachable from a sport's routes, or `null` for `sportId ===
 * null` — meaning "unfiltered", the shape backfillMissingResults' scoping
 * callback wants (omit filtering entirely) rather than "filter to nothing". */
export function wayIdsOfSport(c: Catalog, sportId: string | null, f: SportsFile): Set<string> | null {
  if (sportId === null) return null;
  const scoped = scopeCatalog(c, sportId, f);
  return new Set(scoped.ways.map((w) => w.id));
}

/** Route/way/ride counts for one sport, INCLUDING fallback-unstamped items
 * (§3.4 — the sport a rider's whole pre-WP-1 history absorbs is undeletable
 * for as long as that history exists). Used by SETTINGS' delete-guard and
 * usage hint. */
export function sportUsage(
  c: Catalog,
  rides: readonly { sportId?: string }[],
  sportId: string,
  f: SportsFile,
): { routes: number; ways: number; rides: number } {
  const routes = c.routes.filter((r) => effectiveSportId(r, f) === sportId);
  const routeIds = new Set(routes.map((r) => r.id));
  const ways = c.ways.filter((w) => routeIds.has(w.routeId));
  const rideCount = rides.filter((r) => effectiveRideSportId(r.sportId, f) === sportId).length;
  return { routes: routes.length, ways: ways.length, rides: rideCount };
}

function mintSportId(nowMs: number, taken: ReadonlySet<string>): { id: string; usedMs: number } {
  let ms = nowMs;
  let id = `sport:${ms}`;
  while (taken.has(id)) {
    ms += 1;
    id = `sport:${ms}`;
  }
  return { id, usedMs: ms };
}

/** Mints `sport:<nowMs>` (collision-bumped by +1 ms while taken). Sets
 * `activeSportId` to the new sport when the list was empty (the first sport
 * a rider creates becomes active automatically); leaves it alone otherwise.
 * Returns the new file, or an error list (unchanged file's caller should
 * keep the old one) when the resulting file would not validate. */
export function addSport(f: SportsFile, label: string, nowMs: number): SportsFile | string[] {
  const taken = new Set(f.sports.map((s) => s.id));
  const { id, usedMs } = mintSportId(nowMs, taken);
  const sport: Sport = { id, label, createdAtMs: usedMs };
  const next: SportsFile = {
    schemaVersion: f.schemaVersion,
    sports: [...f.sports, sport],
    activeSportId: f.activeSportId ?? id,
  };
  const errs = validateSports(next);
  return errs.length > 0 ? errs : next;
}

/** Label only; the id (and every stamp pointing at it) is untouched. */
export function renameSport(f: SportsFile, id: string, label: string): SportsFile | string[] {
  if (!f.sports.some((s) => s.id === id)) return [`unknown sport id: ${id}`];
  const next: SportsFile = {
    ...f,
    sports: f.sports.map((s) => (s.id === id ? { ...s, label } : s)),
  };
  const errs = validateSports(next);
  return errs.length > 0 ? errs : next;
}

/** Refuses (returns an error list, changes nothing) while the sport owns any
 * route/way/ride (by stamp or fallback) or is the active sport — the active
 * sport is undeletable so the last remaining sport can never be deleted
 * except via Reset-to-virgin (§3.4). */
export function deleteSport(
  f: SportsFile,
  id: string,
  usage: { routes: number; ways: number; rides: number },
): SportsFile | string[] {
  if (!f.sports.some((s) => s.id === id)) return [`unknown sport id: ${id}`];
  if (id === f.activeSportId) return ['cannot delete the active sport — switch to another sport first'];
  if (usage.routes > 0 || usage.rides > 0) {
    return [`sport "${id}" has ${usage.routes} routes · ${usage.rides} rides — delete those first`];
  }
  return { ...f, sports: f.sports.filter((s) => s.id !== id) };
}

/** Sets the global active sport. Refuses an unknown id. */
export function setActiveSport(f: SportsFile, id: string): SportsFile | string[] {
  if (!f.sports.some((s) => s.id === id)) return [`unknown sport id: ${id}`];
  const next: SportsFile = { ...f, activeSportId: id };
  const errs = validateSports(next);
  return errs.length > 0 ? errs : next;
}

/** Q3: the RECORD pill row shows only with 2+ sports AND the toggle on. */
export function showSportPillRow(sportCount: number, setting: boolean): boolean {
  return sportCount >= 2 && setting;
}
