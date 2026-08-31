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
import { refFor } from './refs.ts';
import type { TrackSpec } from './engine.ts';

/** One spec per catalog route. A route whose refLineId has no entry in
 * refs.json, or no gate set at its current gateSetVersion, is skipped with a
 * console.warn — defensive only: after WP-D1 every one of the 20 catalog
 * routes resolves (see live_suite.ts's "none skipped" regression test). */
export function catalogTrackSpecs(): TrackSpec[] {
  const CATALOG = currentCatalog();
  const specs: TrackSpec[] = [];
  for (const route of CATALOG.routes) {
    let ref: TrackSpec['ref'];
    try {
      ref = refFor(route.refLineId);
    } catch {
      console.warn(
        `catalogTrackSpecs: no ref for route "${route.id}" (refLineId "${route.refLineId}") — skipped`,
      );
      continue;
    }
    const gateSet = gateSetFor(CATALOG, route.id, route.gateSetVersion);
    if (!gateSet) {
      console.warn(
        `catalogTrackSpecs: no gate set for route "${route.id}" at version ${route.gateSetVersion} — skipped`,
      );
      continue;
    }
    specs.push({ id: route.id, ref, gates: gateSet.chainageM });
  }
  return specs;
}
