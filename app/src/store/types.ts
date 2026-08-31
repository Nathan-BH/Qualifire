/**
 * Catalog + results types (product/DATA-MODEL.md). Pure — no expo, no Node
 * imports, so the QA suite runs them headless.
 *
 * Two halves with different rules:
 *  - CATALOG (landmarks, ways, routes, gate sets): curated, small, ratified by
 *    Nathan. Places and routes enter because he agrees they exist, never
 *    because clustering proposed them.
 *  - RESULTS: derived from the raw JSONL (D-023). Deleting every result must
 *    lose nothing but CPU. **No tier, no colour, no rank is stored** — those
 *    are read-time functions, which is what keeps the store agnostic to the
 *    unsettled colour model (IDEAS §19 vs D-007/D-008).
 */

export const CATALOG_SCHEMA_VERSION = 1;
export const RESULT_SCHEMA_VERSION = 1;

/** A place, in a period of life. Identity — never a timing boundary: the
 * landmark marks where the ride truly ends, while the final gate sits a few
 * hundred metres before it (Nathan, 2026-08-16). */
export interface Landmark {
  id: string;
  label: string;
  lat: number;
  lon: number;
  /** p90 of the endpoint spread + 30 m, capped at half the gap to the nearest
   * landmark. Measured range 120–256 m; a flat 60–80 m loses 3/4 of the rides. */
  radiusM: number;
  activeFromMs: number;
  activeUntilMs: number | null;
  /** false ⇒ archive-only (dormant homes) or an errand stop — seeds history,
   * never offered at START. */
  offerAtStart: boolean;
}

export interface Way {
  id: string;
  startLandmarkId: string;
  endLandmarkId: string;
  /** required iff start === end (loops are a real category: 78 archived rides) */
  loopDiscriminator?: string;
  routeIds: string[];
}

export interface Route {
  id: string;
  wayId: string;
  refLineId: string;
  gateSetVersion: number;
  seeded: boolean;
  /** OPEN-ITEMS item 2 (COLD-START §3 step 9): the ride whose recorded track
   * is this route's benchmark — "ride 1 IS the reference by default";
   * promoting a later clean lap rewrites this field. Optional: seed routes
   * predate it (their reference is the archive-built refLine, not one ride). */
  referenceRideId?: string;
}

export interface GateSet {
  routeId: string;
  version: number;
  chainageM: number[];
  createdAtMs: number;
  note?: string;
}

export interface Catalog {
  schemaVersion: number;
  landmarks: Landmark[];
  ways: Way[];
  routes: Route[];
  gateSets: GateSet[];
}

export type SectorQuality = 'clean' | 'interrupted' | 'estimated' | 'missed';

export interface SectorResult {
  index: number;
  fromChainageM: number;
  toChainageM: number;
  rawS: number;
  /** null unless clean|interrupted — estimated sectors never get moving time */
  movingS: number | null;
  quality: SectorQuality;
}

export interface RideResult {
  kind: 'rideResult';
  schemaVersion: number;
  rideId: string;
  startedAtMs: number;
  /** null = matched no route; stays uncoloured (D-025) */
  routeId: string | null;
  source: 'app' | 'archive';
  lap: { rawS: number; movingS: number | null; quality: SectorQuality };
  sectors: SectorResult[];
  /** D-024 cruise-σ tripwire fired on a seed ⇒ demoted out of the ranking */
  tripwireDemoted?: boolean;
  derivedBy: {
    engineVersion: string;
    gateSetVersion: number;
    resultSchemaVersion: number;
  };
}

export interface ResultsIndexEntry {
  rideId: string;
  routeId: string;
  startedAtMs: number;
}

/** results/index.json — ordered by startedAtMs ascending, always rebuildable. */
export interface ResultsIndex {
  schemaVersion: number;
  entries: ResultsIndexEntry[];
}

/** One row of the timing tower (D-028). Rank is computed, never stored. */
export interface TowerRow {
  rideId: string;
  movingS: number;
  /** 1-based; null = present but unranked (estimated / tripwire-demoted) */
  position: number | null;
  ghost: boolean;
  interrupted: boolean;
}
