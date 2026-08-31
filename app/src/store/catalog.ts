/**
 * Catalog decode, validation and queries. Pure.
 *
 * Validation is deliberately opinionated: it encodes the failures the archive
 * actually produced. The 88-visit cluster merged two real places 141 m apart,
 * so overlapping landmark discs are an ERROR, not a warning — the model must
 * be structurally incapable of repeating that.
 */
import type { Catalog, GateSet, Landmark, Route, Way } from './types.ts';
import { CATALOG_SCHEMA_VERSION } from './types.ts';

/** Metres between two lat/lon, equirectangular approximation using the pair's
 * own mean latitude (not a hardcoded constant) — good enough at
 * landmark/route scale anywhere on Earth. Same approach as
 * ui/routeMapGeo.ts's metresBetween; that one already did this correctly. */
export function metresBetween(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const dy = (a.lat - b.lat) * 111320;
  const meanLat = (a.lat + b.lat) / 2;
  const dx = (a.lon - b.lon) * 111320 * Math.cos((meanLat * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

export function emptyCatalog(): Catalog {
  return { schemaVersion: CATALOG_SCHEMA_VERSION, landmarks: [], ways: [], routes: [], gateSets: [] };
}

/** null on unrecognisable text so the caller rebuilds rather than trusting it. */
export function decodeCatalog(text: string): Catalog | null {
  try {
    const c = JSON.parse(text) as Catalog;
    if (!c || !Array.isArray(c.landmarks) || !Array.isArray(c.ways)) return null;
    if (!Array.isArray(c.routes) || !Array.isArray(c.gateSets)) return null;
    return c;
  } catch {
    return null;
  }
}

export function encodeCatalog(c: Catalog): string {
  return JSON.stringify(c, null, 1) + '\n';
}

/** Every structural problem, as human-readable strings. Empty = valid. */
export function validateCatalog(c: Catalog): string[] {
  const errs: string[] = [];
  const lm = new Map(c.landmarks.map((l) => [l.id, l]));
  if (lm.size !== c.landmarks.length) errs.push('duplicate landmark id');

  // Two landmarks whose discs touch would silently merge rides — the exact
  // failure the 88-visit cluster produced at 150 m.
  for (let i = 0; i < c.landmarks.length; i++) {
    for (let j = i + 1; j < c.landmarks.length; j++) {
      const a = c.landmarks[i];
      const b = c.landmarks[j];
      const d = metresBetween(a, b);
      if (d < a.radiusM + b.radiusM) {
        errs.push(
          `landmarks ${a.id} and ${b.id} overlap: ${d.toFixed(0)} m apart, ` +
            `radii ${a.radiusM} + ${b.radiusM} m`,
        );
      }
    }
  }

  for (const l of c.landmarks) {
    if (l.radiusM <= 0) errs.push(`landmark ${l.id}: radius must be positive`);
    if (l.activeUntilMs !== null && l.activeUntilMs < l.activeFromMs) {
      errs.push(`landmark ${l.id}: activeUntil precedes activeFrom`);
    }
  }

  const wayIds = new Set<string>();
  for (const w of c.ways) {
    if (wayIds.has(w.id)) errs.push(`duplicate way id ${w.id}`);
    wayIds.add(w.id);
    if (!lm.has(w.startLandmarkId)) errs.push(`way ${w.id}: unknown start ${w.startLandmarkId}`);
    if (!lm.has(w.endLandmarkId)) errs.push(`way ${w.id}: unknown end ${w.endLandmarkId}`);
    if (w.startLandmarkId === w.endLandmarkId && !w.loopDiscriminator) {
      errs.push(`way ${w.id}: loop needs a loopDiscriminator`);
    }
    if (w.routeIds.length === 0) errs.push(`way ${w.id}: no routes`);
  }

  const routeIds = new Set<string>();
  for (const r of c.routes) {
    if (routeIds.has(r.id)) errs.push(`duplicate route id ${r.id}`);
    routeIds.add(r.id);
    if (!wayIds.has(r.wayId)) errs.push(`route ${r.id}: unknown way ${r.wayId}`);
    if (!gateSetFor(c, r.id, r.gateSetVersion)) {
      errs.push(`route ${r.id}: no gate set at version ${r.gateSetVersion}`);
    }
  }
  for (const w of c.ways) {
    for (const rid of w.routeIds) {
      if (!routeIds.has(rid)) errs.push(`way ${w.id}: unknown route ${rid}`);
    }
  }

  for (const g of c.gateSets) {
    if (!routeIds.has(g.routeId)) errs.push(`gate set for unknown route ${g.routeId}`);
    if (g.chainageM.length < 2) errs.push(`gate set ${g.routeId} v${g.version}: needs ≥2 gates`);
    for (let i = 1; i < g.chainageM.length; i++) {
      if (g.chainageM[i] <= g.chainageM[i - 1]) {
        errs.push(`gate set ${g.routeId} v${g.version}: chainage not increasing at index ${i}`);
      }
    }
  }
  return errs;
}

export function landmarkActiveAt(l: Landmark, atMs: number): boolean {
  return atMs >= l.activeFromMs && (l.activeUntilMs === null || atMs <= l.activeUntilMs);
}

/** What the START picker may offer: active AND offerable. Dormant places
 * (old homes) keep seeding history but must never be offered. */
export function startableLandmarks(c: Catalog, atMs: number): Landmark[] {
  return c.landmarks.filter((l) => l.offerAtStart && landmarkActiveAt(l, atMs));
}

/** Nearest landmark containing the point, or null. Ties break on distance. */
export function landmarkAt(
  c: Catalog,
  p: { lat: number; lon: number },
  atMs: number | null = null,
): Landmark | null {
  let best: Landmark | null = null;
  let bestD = Infinity;
  for (const l of c.landmarks) {
    if (atMs !== null && !landmarkActiveAt(l, atMs)) continue;
    const d = metresBetween(p, l);
    if (d <= l.radiusM && d < bestD) {
      best = l;
      bestD = d;
    }
  }
  return best;
}

/** Ways startable from a landmark, whose destination is itself offerable. */
export function waysFrom(c: Catalog, landmarkId: string, atMs: number): Way[] {
  const offerable = new Set(startableLandmarks(c, atMs).map((l) => l.id));
  return c.ways.filter((w) => w.startLandmarkId === landmarkId && offerable.has(w.endLandmarkId));
}

export function routesForWay(c: Catalog, wayId: string): Route[] {
  return c.routes.filter((r) => r.wayId === wayId);
}

/**
 * WP-B coordinator addendum (Nathan, 2026-08-24): a free ride with exactly
 * one known endpoint should only watch/show gates from routes that actually
 * run in THAT direction — `ways` are strictly directional (`home>work` and
 * `work>home` are separate entries with independently measured gate sets;
 * so are every other landmark pair), so an unfiltered free ride from a known
 * origin would otherwise watch — and could spuriously fire — gates from
 * routes running the opposite way past the same pair of places.
 *
 * `from`/`to` are null for the unknown ('~new') end (a UI concept this pure
 * catalog module deliberately does not know the id of — the caller resolves
 * '~new' to null before calling). Exactly one non-null end returns the
 * matching ways' routeIds (outbound from a known origin when `from` is
 * given, inbound to a known destination when `to` is given). Both null
 * (both ends unknown) returns null — NO filtering, deliberately: Nathan
 * explicitly deferred that case for a future design pass, so it keeps the
 * brief's original full-catalog behaviour. Both non-null is not a free ride
 * at all (the caller only calls this with at least one end unknown); returns
 * null defensively rather than guessing a filter for a case that cannot
 * legitimately arise.
 */
export function freeRideRouteIds(c: Catalog, from: string | null, to: string | null): string[] | null {
  if (from !== null && to === null) {
    const ids: string[] = [];
    for (const w of c.ways) if (w.startLandmarkId === from) ids.push(...w.routeIds);
    return ids;
  }
  if (from === null && to !== null) {
    const ids: string[] = [];
    for (const w of c.ways) if (w.endLandmarkId === to) ids.push(...w.routeIds);
    return ids;
  }
  return null;
}

/** True when the way needs a route pick at START (Nathan, §8a). */
export function needsRoutePick(c: Catalog, wayId: string): boolean {
  return routesForWay(c, wayId).length > 1;
}

export function gateSetFor(c: Catalog, routeId: string, version?: number): GateSet | null {
  const forRoute = c.gateSets.filter((g) => g.routeId === routeId);
  if (forRoute.length === 0) return null;
  if (version === undefined) {
    return forRoute.reduce((a, b) => (b.version > a.version ? b : a));
  }
  return forRoute.find((g) => g.version === version) ?? null;
}

/** A gate move mints a new version; history is never deleted. */
export function addGateSet(c: Catalog, next: GateSet): Catalog {
  const routes = c.routes.map((r) =>
    r.id === next.routeId ? { ...r, gateSetVersion: next.version } : r,
  );
  return { ...c, routes, gateSets: [...c.gateSets, next] };
}

/**
 * What a gate move costs, precisely (B-20 / IDEAS §22).
 *
 * Sector times across versions measure different stretches of road and are
 * never comparable. LAP times survive a *middle*-gate move untouched — same
 * start gate, same finish gate, same road — and break only when an end gate
 * moves. That asymmetry is the argument for moving the start/finish gates
 * early: every week of delay costs more lap history at the cutover.
 */
export function lapsComparable(a: GateSet, b: GateSet): boolean {
  const eps = 1e-6;
  const firstSame = Math.abs(a.chainageM[0] - b.chainageM[0]) < eps;
  const lastSame =
    Math.abs(a.chainageM[a.chainageM.length - 1] - b.chainageM[b.chainageM.length - 1]) < eps;
  return firstSame && lastSame;
}

export function sectorsComparable(a: GateSet, b: GateSet): boolean {
  if (a.chainageM.length !== b.chainageM.length) return false;
  return a.chainageM.every((v, i) => Math.abs(v - b.chainageM[i]) < 1e-6);
}

/**
 * B-39 (empty-seed install path): the runtime catalog is the shipped seed
 * PLUS the rider's own additions (store/catalogStore.ts's user catalog file),
 * merged read-side on every boot. The seed is never copied onto the phone —
 * so a seed change (a new route, a moved gate) still reaches Nathan's phone
 * the way it always has — and a virgin build (empty seed) runs on the user
 * catalog alone. Seed entries win every id collision: a user entry whose id
 * already exists in the seed is dropped, never merged over it (gate sets
 * collide on routeId + version). Seed order first, user order after — every
 * "first in catalog order" rule keeps meaning what it meant. Pure;
 * validateCatalog() judges the result.
 */
export function mergeCatalogs(seed: Catalog, user: Catalog): Catalog {
  const lm = new Set(seed.landmarks.map((l) => l.id));
  const wy = new Set(seed.ways.map((w) => w.id));
  const rt = new Set(seed.routes.map((r) => r.id));
  const gs = new Set(seed.gateSets.map((g) => `${g.routeId}@${g.version}`));
  return {
    schemaVersion: seed.schemaVersion,
    landmarks: [...seed.landmarks, ...user.landmarks.filter((l) => !lm.has(l.id))],
    ways: [...seed.ways, ...user.ways.filter((w) => !wy.has(w.id))],
    routes: [...seed.routes, ...user.routes.filter((r) => !rt.has(r.id))],
    gateSets: [...seed.gateSets, ...user.gateSets.filter((g) => !gs.has(`${g.routeId}@${g.version}`))],
  };
}
