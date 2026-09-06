/**
 * WP-3 (2026-09-05) — read-side schema migration, v1 -> v2. Pure — no expo,
 * no Node imports, like types.ts (§3.5).
 *
 * Principle: migrate on READ, in memory; never write at init. A v1 file is
 * upgraded every time it is loaded and is left byte-identical on disk. It
 * reaches v2 only through the write path that already rewrites that file
 * kind routinely (saveUserCatalog, saveResult, rememberFreeRide). No new
 * write path, no torn-write window, no backup file, nothing to delete — and
 * a reset (SETTINGS -> DATA -> "Reset to virgin") makes all of it moot.
 *
 * Every function takes `unknown` and returns the v2 shape or `null`; none
 * throws. Every function is gated on `schemaVersion` and does nothing else
 * clever — structural validity beyond that is still the caller's own
 * decode/validate function's job, exactly as before this migration existed.
 */

function isNonNullObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** `{ ...rest, [to]: o[from] }` when `from` is present, `o` unchanged
 * otherwise (object spread; key order is not a concern). Unknown extra keys
 * pass through untouched. */
export function renameKey(
  o: Record<string, unknown>,
  from: string,
  to: string,
): Record<string, unknown> {
  if (!(from in o)) return o;
  const { [from]: value, ...rest } = o;
  return { ...rest, [to]: value };
}

/** raw must be an object with array landmarks/ways/routes/gateSets (today's
 * decodeCatalog check) — else null. sv === 2 -> returned as-is (structure is
 * validateCatalog/mergeCatalogs's job, as today). sv === 1 or undefined ->
 * upgraded: same JSON labels, swapped contents (§3.2) — a v1 `routes` (held
 * variants) becomes v2 `ways`; a v1 `ways` (held base paths) becomes v2
 * `routes`. Anything else (a future version) -> null, refused, never
 * guessed at. */
export function upgradeCatalog(raw: unknown): Record<string, unknown> | null {
  if (!isNonNullObject(raw)) return null;
  if (!Array.isArray(raw.landmarks) || !Array.isArray(raw.ways) || !Array.isArray(raw.routes)) return null;
  if (!Array.isArray(raw.gateSets)) return null;

  const sv = raw.schemaVersion;
  if (sv === 2) return raw;
  if (sv === 1 || sv === undefined) {
    const v1Ways = raw.ways as unknown[];
    const v1Routes = raw.routes as unknown[];
    const v1GateSets = raw.gateSets as unknown[];
    return {
      schemaVersion: 2,
      landmarks: raw.landmarks,
      // v1 ways (base paths, routeIds[]) -> v2 routes (base paths, wayIds[])
      routes: v1Ways.map((w) => (isNonNullObject(w) ? renameKey(w, 'routeIds', 'wayIds') : w)),
      // v1 routes (variants, FK wayId) -> v2 ways (variants, FK routeId)
      ways: v1Routes.map((r) => (isNonNullObject(r) ? renameKey(r, 'wayId', 'routeId') : r)),
      gateSets: v1GateSets.map((g) => (isNonNullObject(g) ? renameKey(g, 'routeId', 'wayId') : g)),
    };
  }
  return null;
}

/** raw must be an object with kind === 'rideResult' — else null.
 * schemaVersion === 2 -> as-is. 1 or undefined -> renameKey(routeId, wayId)
 * with schemaVersion: 2 and, when derivedBy is an object,
 * derivedBy.resultSchemaVersion: 2 too (so isStale() never condemns an
 * upgraded record as forever-stale) — everything else (ignoredFromRanking,
 * tripwireDemoted, lap, sectors, source, startedAtMs, rideId, engineVersion,
 * gateSetVersion) untouched. Other versions -> null. Structural validity is
 * still isValidRideResult's job afterwards. */
export function upgradeResult(raw: unknown): Record<string, unknown> | null {
  if (!isNonNullObject(raw)) return null;
  if (raw.kind !== 'rideResult') return null;

  const sv = raw.schemaVersion;
  if (sv === 2) return raw;
  if (sv === 1 || sv === undefined) {
    const renamed = renameKey(raw, 'routeId', 'wayId');
    const derivedBy = renamed.derivedBy;
    return {
      ...renamed,
      schemaVersion: 2,
      ...(isNonNullObject(derivedBy) ? { derivedBy: { ...derivedBy, resultSchemaVersion: 2 } } : {}),
    };
  }
  return null;
}

/** raw must be an object with array `rides` — else null. File-level
 * schemaVersion === 2 -> raw.rides as-is. 1 or undefined -> each ride's
 * crossings[]/sectors[] mapped through renameKey(routeId, wayId) and the
 * ride's own schemaVersion set to 2. Other -> null. isValidFreeRideRecord
 * still filters afterwards, as today. */
export function upgradeFreeRidesCache(raw: unknown): unknown[] | null {
  if (!isNonNullObject(raw)) return null;
  if (!Array.isArray(raw.rides)) return null;

  const sv = raw.schemaVersion;
  if (sv === 2) return raw.rides;
  if (sv === 1 || sv === undefined) {
    return raw.rides.map((ride) => {
      if (!isNonNullObject(ride)) return ride;
      const crossings = Array.isArray(ride.crossings)
        ? ride.crossings.map((c) => (isNonNullObject(c) ? renameKey(c, 'routeId', 'wayId') : c))
        : ride.crossings;
      const sectors = Array.isArray(ride.sectors)
        ? ride.sectors.map((s) => (isNonNullObject(s) ? renameKey(s, 'routeId', 'wayId') : s))
        : ride.sectors;
      return { ...ride, schemaVersion: 2, crossings, sectors };
    });
  }
  return null;
}
