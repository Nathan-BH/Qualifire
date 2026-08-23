/** The approved gate set (D-016; Nathan 2026-08-14 "fine for now, can still be
 * updated anytime"). Values verbatim from data/analysis/gates_proposal.csv.
 * Chainages are metres along each track's cycle-003 reference polyline
 * (Morning 5651 m, EveningA 5556 m, EveningB 5838 m medoid references;
 * MorningB 5927 m single-ride reference — cycle 024's promoted 2026-08-19
 * ride, see the MorningB block below).
 * B-20 (gate-move invalidation semantics) owns what happens when these change. */
import type { Gate, TrackId } from './types.ts';

export const PROPOSED_GATES: Record<TrackId, Gate[]> = {
  Morning: [
    { name: 'START',  chainage: 162,  lat: 50.83636, lon: 4.64036 },
    { name: 'G1',     chainage: 1312, lat: 50.84342, lon: 4.65127 },
    { name: 'G2',     chainage: 2662, lat: 50.85111, lon: 4.66399 },
    { name: 'G3',     chainage: 4212, lat: 50.85875, lon: 4.67050 },
    { name: 'FINISH', chainage: 5487, lat: 50.86360, lon: 4.68614 },
  ],
  EveningA: [
    { name: 'START',  chainage: 162,  lat: 50.86329, lon: 4.68479 },
    { name: 'G1',     chainage: 1487, lat: 50.85802, lon: 4.66880 },
    { name: 'G2',     chainage: 2987, lat: 50.85146, lon: 4.66265 },
    { name: 'G3',     chainage: 4037, lat: 50.84481, lon: 4.65294 },
    { name: 'FINISH', chainage: 5387, lat: 50.83633, lon: 4.64031 },
  ],
  EveningB: [
    { name: 'START',  chainage: 162,  lat: 50.86211, lon: 4.68696 },
    { name: 'G1',     chainage: 1487, lat: 50.85318, lon: 4.67684 },
    { name: 'G2',     chainage: 2812, lat: 50.84241, lon: 4.66960 },
    { name: 'G3',     chainage: 4037, lat: 50.83719, lon: 4.65665 },
    { name: 'FINISH', chainage: 5237, lat: 50.83801, lon: 4.64333 },
  ],
  // MorningB (cycle 020, Nathan 2026-08-19): home>work "route B"; gate
  // positions = EveningB's gates reversed + START near home; cold-start,
  // unratified (B-20 owns moves).
  // v2 (cycle 024, 2026-08-20): the reference line was PROMOTED to Nathan's
  // 2026-08-19 morning ride (h>>w-w, the rain/asphalt route) — 5927.1 m,
  // replacing the 5860.8 m evening-ride-reversed stand-in that sat ~10 m off
  // the road he actually rides. The five PHYSICAL gate positions below are
  // unchanged; only their chainage moved, by re-projecting each lat/lon onto
  // the new line (nearestOnSegments over all segments; lateral offsets
  // 0.4-9.0 m). These MUST stay equal to catalog.seed.json's MorningB gate
  // set v2 — app/tests/store_suite.ts asserts it.
  MorningB: [
    { name: 'START',  chainage: 204,  lat: 50.83779, lon: 4.63917 },
    { name: 'G1',     chainage: 1835, lat: 50.83719, lon: 4.65665 },
    { name: 'G2',     chainage: 3081, lat: 50.84241, lon: 4.66960 },
    { name: 'G3',     chainage: 4403, lat: 50.85318, lon: 4.67684 },
    { name: 'FINISH', chainage: 5733, lat: 50.86211, lon: 4.68696 },
  ],
};

export function gateChainages(track: TrackId): number[] {
  return PROPOSED_GATES[track].map((g) => g.chainage);
}
