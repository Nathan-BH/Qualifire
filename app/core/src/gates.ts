/** The approved gate set (D-016; Nathan 2026-08-14 "fine for now, can still be
 * updated anytime"). Values verbatim from data/analysis/gates_proposal.csv.
 * Chainages are metres along each track's cycle-003 reference polyline
 * (Morning 5651 m, EveningA 5556 m, EveningB 5838 m medoid references;
 * MorningB 5861 m single-ride reference, cycle 020).
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
  // MorningB (cycle 020, Nathan 2026-08-19): home>work "route B" = route 5
  // (20260520-2317) reversed; gate positions = EveningB's gates reversed +
  // START at ~162 m; cold-start, unratified (B-20 owns moves).
  MorningB: [
    { name: 'START',  chainage: 163,  lat: 50.83779, lon: 4.63917 },
    { name: 'G1',     chainage: 1802, lat: 50.83719, lon: 4.65665 },
    { name: 'G2',     chainage: 3027, lat: 50.84241, lon: 4.66960 },
    { name: 'G3',     chainage: 4352, lat: 50.85318, lon: 4.67684 },
    { name: 'FINISH', chainage: 5677, lat: 50.86211, lon: 4.68696 },
  ],
};

export function gateChainages(track: TrackId): number[] {
  return PROPOSED_GATES[track].map((g) => g.chainage);
}
