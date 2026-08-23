/**
 * All-catalog route specs for LiveEngine (cycle 024, WP-D2 — Nathan's
 * 2026-08-20 B-65 ruling: "every route I ratified should lock and score
 * live"). One TrackSpec per catalog route, pairing its reference polyline
 * (refs.json, via refFor) with its current gate set (catalog.seed.json, via
 * gateSetFor). Pure — reads the SAME catalog seed the rest of the app reads,
 * so the phone and the test suite can never disagree about what "every
 * route" means.
 */
import catalogJson from '../store/catalog.seed.json';
import { gateSetFor } from '../store/catalog.ts';
import type { Catalog } from '../store/types.ts';
import { refFor } from './refs.ts';
import type { TrackSpec } from './engine.ts';

const CATALOG = catalogJson as unknown as Catalog;

/** One spec per catalog route. A route whose refLineId has no entry in
 * refs.json, or no gate set at its current gateSetVersion, is skipped with a
 * console.warn — defensive only: after WP-D1 every one of the 20 catalog
 * routes resolves (see live_suite.ts's "none skipped" regression test). */
export function catalogTrackSpecs(): TrackSpec[] {
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
