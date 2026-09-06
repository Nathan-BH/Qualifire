/**
 * All-catalog route specs for LiveEngine (cycle 024, WP-D2 — Nathan's
 * 2026-08-20 B-65 ruling: "every route I ratified should lock and score
 * live"). One TrackSpec per catalog route, pairing its reference polyline
 * (refs.json, via refFor) with its current gate set (the runtime catalog —
 * store/catalogStore.ts, seed + this phone's additions — via gateSetFor).
 * Pure — reads the SAME catalog the rest of the app reads, so the phone and
 * the test suite can never disagree about what "every route" means. Read at
 * CALL time, never captured at import (B-39: the catalog can be empty at
 * boot and grow later).
 */
import { gateSetFor } from '../store/catalog.ts';
import { currentCatalog } from '../store/catalogStore.ts';
import { wayIdsOfSport } from '../store/sports.ts';
import { currentSports } from '../store/sportStore.ts';
import { refFor } from './refs.ts';
import type { TrackSpec } from './engine.ts';

/** One spec per catalog route. A route whose refLineId has no entry in
 * refs.json, or no gate set at its current gateSetVersion, is skipped with a
 * console.warn — defensive only: after WP-D1 every one of the 20 catalog
 * routes resolves (see live_suite.ts's "none skipped" regression test). */
export function catalogTrackSpecs(): TrackSpec[] {
  const CATALOG = currentCatalog();
  const specs: TrackSpec[] = [];
  for (const way of CATALOG.ways) {
    let ref: TrackSpec['ref'];
    try {
      ref = refFor(way.refLineId);
    } catch {
      console.warn(
        `catalogTrackSpecs: no ref for way "${way.id}" (refLineId "${way.refLineId}") — skipped`,
      );
      continue;
    }
    const gateSet = gateSetFor(CATALOG, way.id, way.gateSetVersion);
    if (!gateSet) {
      console.warn(
        `catalogTrackSpecs: no gate set for way "${way.id}" at version ${way.gateSetVersion} — skipped`,
      );
      continue;
    }
    specs.push({ id: way.id, ref, gates: gateSet.chainageM });
  }
  return specs;
}

/** WP-1: catalogTrackSpecs() filtered to one sport's own ways — unfiltered
 * (identical to catalogTrackSpecs()) when `sportId` is null (no sport, or
 * zero sports total). Nothing calls this until Phase C wires up the engine;
 * it exists now so Phase C has a pure, testable seam and catalogTrackSpecs()
 * itself (used by tests and the engine's own default) stays untouched. */
export function sportTrackSpecs(sportId: string | null): TrackSpec[] {
  const wayIds = wayIdsOfSport(currentCatalog(), sportId, currentSports());
  if (wayIds === null) return catalogTrackSpecs();
  return catalogTrackSpecs().filter((s) => wayIds.has(s.id));
}
