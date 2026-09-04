/**
 * WP-K (phase 2): pure builders for RouteMapView's `sectorColours` prop — the
 * gate-indexed colour array behind the sector-coloured trail on all three
 * surfaces (live map, ride-detail trace, RIDES row). Index 0 is always
 * null (START — no sector ends there); index i is the colour of sector i,
 * the stretch of line ENDING at gate i; null = no earned colour, the span
 * paints transparent and the yellow base line shows through.
 *
 * No React, no expo, no chips.tsx (it imports react-native): the tier -> line
 * colour mapping is INJECTED as `paint`, exactly as demoModel.ts's
 * demoSectorColours() (and rideDetailModel.ts's local lineColourFor) does —
 * every screen passes chips.tsx's tierLineColour (never chipColors().text:
 * purple's .text is PURPLE_INK, the 2026-09-02 DEMO-tab bug class).
 * Headless-testable, same discipline as rideHistoryModel.ts / colourModel.ts;
 * suite: tests/sectortrail_suite.ts.
 *
 * Honesty (unchanged from P1, ruled 2026-08-26): only a CLEAN sector with a
 * real moving time and an EARNED tier (purple/green/yellow) paints. 'neutral'
 * (< MIN_HISTORY comparable rides — D-008/D-013) and 'est' never paint,
 * whatever `paint` would return for them: that rule lives here, not in the
 * palette. Interrupted sectors do not paint (same as P1's rule; the sector
 * PANE and RIDES text rows keep an interrupted sector's tier — see the
 * brief's §7.1 for why the map line is stricter).
 */
import type { LiveSector } from '../live/engine.ts';
import { tierFor, type UiTier } from './colourModel.ts';

/** tier -> map-line colour, or null. Screens pass chips.tsx's tierLineColour. */
export type SpanPaint = (tier: UiTier) => string | null;
/** Comparison window for sector i (colourModel.sectorValues, in practice). */
export type SectorHistory = (sectorIndex: number) => number[];

/** WP-K: the "all yellow" array — what every surface passes when
 * Settings.sectorColours is OFF. Empty and never mutated:
 * sectorSpansFeatureCollection reads `sectorColours?.[i] ?? null`, so every
 * span paints transparent and the map is pixel-identical to a no-colours map,
 * while the prop stays TRUTHY so RouteMapView mounts the sector-spans source
 * in the same render as the route line whatever the setting (routeMapView's
 * mount-order rule: a source mounted later paints over the rider dot). */
export const ALL_YELLOW: (string | null)[] = [];

function earnedColour(movingS: number, history: number[], paint: SpanPaint): string | null {
  const tier = tierFor(movingS, history);
  return tier === 'purple' || tier === 'green' || tier === 'yellow' ? paint(tier) : null;
}

/** Minimal shape shared by store/types.ts's SectorResult (ride-detail hands
 * in a RideResult) and any FinishedRide-shaped caller. */
export interface StoredSectorLike { index: number; movingS: number | null; quality: string }

/** WP-K: stored/finished ride -> sectorColours. Slots by `sec.index`, not
 * array position, so an unsorted `sectors` array still lands on the right
 * span; length = max index + 1 ([null] for a ride with no sectors — the
 * index-0 slot only, same as the pre-WP-K inline builders). `hist(i)`
 * is the caller's sectorValues(routeId, i, rideId) — the ride's own value
 * excluded by rideId (B-44), the same callback shape buildSectorRows takes. */
export function storedSectorColours(
  ride: { sectors: readonly StoredSectorLike[] }, hist: SectorHistory, paint: SpanPaint,
): (string | null)[] {
  const n = ride.sectors.reduce((m, s) => Math.max(m, s.index), 0);
  const out: (string | null)[] = new Array<string | null>(n + 1).fill(null);
  for (const sec of ride.sectors) {
    if (sec.index < 1 || sec.quality !== 'clean' || sec.movingS === null) continue;
    out[sec.index] = earnedColour(sec.movingS, hist(sec.index), paint);
  }
  return out;
}

/** WP-K: live engine sectors -> sectorColours, mid-ride. sectors[k] is sector
 * k+1 (the same k -> k+1 mapping RecordScreen's gateColours uses). Only
 * kind 'done' AND !interrupted AND !estimated with a moving time is "clean" —
 * the predicate that becomes quality 'clean' when the ride is stored, so a
 * span keeps the exact colour it earned live when it reappears on the ride
 * detail and in RIDES. `hist(i)` mid-ride is sectorValues(live.track, i) with
 * no exclusion (the ride is not stored yet — colourModel.ghostsFor); before
 * the route lock the caller returns [] and everything stays null (D-025, the
 * same rule as RecordScreen's tierOf). Always length sectors.length + 1. */
export function liveSectorColours(
  sectors: readonly LiveSector[], hist: SectorHistory, paint: SpanPaint,
): (string | null)[] {
  const out: (string | null)[] = [null];
  for (let k = 0; k < sectors.length; k++) {
    const sec = sectors[k];
    if (sec.kind !== 'done' || sec.interrupted || sec.estimated || sec.movingS === null) {
      out.push(null);
      continue;
    }
    out.push(earnedColour(sec.movingS, hist(k + 1), paint));
  }
  return out;
}
