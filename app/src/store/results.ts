/**
 * The derived results store: an ordered lap/sector history per route, plus the
 * window and ranking queries built on it. Pure.
 *
 * Load-bearing property (product/DATA-MODEL.md §1): NOTHING here computes or
 * stores a colour tier. Every candidate colour model — D-007/D-008's rolling
 * 7/28-day bests, IDEAS §19's last-N average, the σ-deadband hybrid — is a
 * read-time function over `windowByDays` / `windowLastN`. That is why the
 * store can be built before the colour ruling lands, and why the ruling costs
 * no migration when it does.
 */
import type {
  ResultsIndex,
  ResultsIndexEntry,
  RideResult,
  TowerRow,
} from './types.ts';
import { RESULT_SCHEMA_VERSION } from './types.ts';

export function emptyResultsIndex(): ResultsIndex {
  return { schemaVersion: RESULT_SCHEMA_VERSION, entries: [] };
}

/** Replaces by rideId; keeps ascending startedAtMs (ties break on rideId). */
export function upsertResult(index: ResultsIndex, r: RideResult): ResultsIndex {
  if (r.routeId === null) return removeResult(index, r.rideId); // matched no route
  const entries = index.entries.filter((e) => e.rideId !== r.rideId);
  entries.push({ rideId: r.rideId, routeId: r.routeId, startedAtMs: r.startedAtMs });
  entries.sort((a, b) => a.startedAtMs - b.startedAtMs || (a.rideId < b.rideId ? -1 : 1));
  return { schemaVersion: RESULT_SCHEMA_VERSION, entries };
}

export function removeResult(index: ResultsIndex, rideId: string): ResultsIndex {
  return {
    schemaVersion: RESULT_SCHEMA_VERSION,
    entries: index.entries.filter((e) => e.rideId !== rideId),
  };
}

/** The whole index is a cache: rebuildable from the results themselves. A QA
 * case wipes it, rebuilds, and asserts equality — the cheapest guard against a
 * benchmark second quietly becoming authoritative (D-023). */
export function rebuildIndex(results: RideResult[]): ResultsIndex {
  return results.reduce(upsertResult, emptyResultsIndex());
}

/** Rolling time window — D-008's shape. `nowMs` exclusive-of-future, inclusive
 * of the boundary; rides are already ordered, so this is a slice. */
export function windowByDays(
  index: ResultsIndex,
  routeId: string,
  nowMs: number,
  days: number,
): ResultsIndexEntry[] {
  const from = nowMs - days * 86400_000;
  return index.entries.filter(
    (e) => e.routeId === routeId && e.startedAtMs >= from && e.startedAtMs <= nowMs,
  );
}

/** Rolling ride-count window — IDEAS §19/§21's shape. Fewer than N is fine and
 * returns what exists (Nathan: small comparison sets still compare). */
export function windowLastN(
  index: ResultsIndex,
  routeId: string,
  nowMs: number,
  n: number,
): ResultsIndexEntry[] {
  const upTo = index.entries.filter((e) => e.routeId === routeId && e.startedAtMs <= nowMs);
  return upTo.slice(Math.max(0, upTo.length - n));
}

/** Results whose derivation no longer matches the engine or gate set — they
 * must be recomputed from raw, never trusted or patched. */
export function isStale(
  r: RideResult,
  engineVersion: string,
  gateSetVersion: number,
): boolean {
  return (
    r.derivedBy.engineVersion !== engineVersion ||
    r.derivedBy.gateSetVersion !== gateSetVersion ||
    r.derivedBy.resultSchemaVersion !== RESULT_SCHEMA_VERSION
  );
}

/** A lap that may take a position (D-028): clean or interrupted, with a real
 * moving time. Estimated laps never rank; nor do tripwire-demoted seeds; nor
 * does a ride the RIDER excluded from ranking (WP-H "Ignore in ranking" —
 * ignoredFromRanking === true). */
export function ranks(r: RideResult): boolean {
  if (r.lap.quality === 'estimated' || r.lap.quality === 'missed') return false;
  if (r.tripwireDemoted) return false;
  if (r.ignoredFromRanking === true) return false; // WP-H: rider-set exclusion
  return r.lap.movingS !== null;
}

/**
 * The timing tower for one route (D-028) — B-28's whole seam.
 *
 * Ranked rows sort ascending by moving time and carry 1-based positions;
 * unrankable laps are still returned, with `position: null`, so the surface can
 * show today's "NO TIME" row without inventing a rank for it. Archive-seeded
 * laps rank as marked ghosts.
 */
export function tower(results: RideResult[]): TowerRow[] {
  const rankable = results.filter(ranks);
  rankable.sort((a, b) => (a.lap.movingS as number) - (b.lap.movingS as number));
  const rows: TowerRow[] = rankable.map((r, i) => ({
    rideId: r.rideId,
    movingS: r.lap.movingS as number,
    position: i + 1,
    ghost: r.source === 'archive',
    interrupted: r.lap.quality === 'interrupted',
  }));
  for (const r of results) {
    if (ranks(r)) continue;
    rows.push({
      rideId: r.rideId,
      movingS: r.lap.movingS ?? r.lap.rawS,
      position: null,
      ghost: r.source === 'archive',
      interrupted: r.lap.quality === 'interrupted',
    });
  }
  return rows;
}

/** 'P3' for the live handover chip, or null when the lap cannot rank — the
 * real screen renders NO chip rather than a fake rank (live/towerSource.ts). */
export function positionLabel(rows: TowerRow[], rideId: string): string | null {
  const row = rows.find((r) => r.rideId === rideId);
  return row && row.position !== null ? `P${row.position}` : null;
}

/** Ordered sector times for one sector index across a window — the input every
 * colour model consumes. Dirty sectors are dropped: an estimated sector has no
 * moving time and must never enter a benchmark (D-008/D-025). */
export function sectorHistory(
  results: RideResult[],
  sectorIndex: number,
): number[] {
  const out: number[] = [];
  for (const r of results) {
    const s = r.sectors.find((x) => x.index === sectorIndex);
    if (!s || s.movingS === null) continue;
    if (s.quality !== 'clean' && s.quality !== 'interrupted') continue;
    out.push(s.movingS);
  }
  return out;
}
