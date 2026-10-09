/**
 * virgin-cycle23: pure view-model for the ACTIVITIES feed (brief 02 renders
 * it). No React, no expo, no store reads — everything injected, like
 * rideHistoryModel.ts. One card per ride, newest first (the caller passes
 * buildRideRows' output, already ordered).
 */
import type { RideMeta } from '../storage/types.ts';
import type { RideRowModel, SectorRowModel } from './rideHistoryModel.ts';
import type { RideDetailModel } from './rideDetailModel.ts';
import type { UiTier } from './colourModel.ts';
import { fmt } from './colourModel.ts';   // NOTE: value import → the suite needs the JSON shim (see §2)

export type FeedCardVariant = 'route' | 'plain';

export interface FeedSectorChip { label: string; timeLabel: string; tier: UiTier }

export interface FeedCardModel {
  rideId: string;
  startMs: number;
  dateLabel: string;
  /** route/way name, "Free activity", "<from> → <to>", or null (header shows the date only) */
  title: string | null;
  variant: FeedCardVariant;
  /** 'route': the time (fmt m:ss.d) — or, unranked, the wall-clock duration (virgin-cycle27 10: the total activity time stays visible); 'plain': the duration, '' when endMs <= startMs */
  heroLabel: string;
  heroTier: UiTier;         // 'route': detail.lapTier (neutral while ignored); 'plain': 'neutral'
  rankLabel: string | null; // 'P3/10'; NOT_RANKED_LABEL when unranked (virgin-cycle27 10); null = nothing
  /** virgin-cycle27 10 (Nathan 2026-10-08, supersedes brief 05's "no time"): a route activity that cannot be ranked (unrankedForDisplay) keeps its total time (durationLabel) in neutral, shows NOT_RANKED_LABEL where the rank goes, no quality word, empty strip. Always false for 'plain'. */
  unranked: boolean;
  ignored: boolean;
  wayId: string | null;     // the map asset for 'route'; null for 'plain'
  sectorColours: (string | null)[]; // detail.sectorColours (gate-indexed)
  sectors: FeedSectorChip[];        // 'route' only; [] for 'plain'
  /** 'plain' cards draw the ride's own fixes (no reference line to draw) */
  needsTrail: boolean;
  /** which quick toggle the menu offers, or null when the ride cannot rank */
  ignoreToggle: 'ignore' | 'count' | null;
}

/** Feed block geometry (virgin-cycle23 brief 04, Nathan's 2026-10-07 phone feedback:
 * thicker divider, more air above/below). activityCard.tsx's StyleSheet uses
 * these; the card heights below are their sum and are pinned by feedmodel_suite. */
export const CARD_PAD_TOP = 22;
export const CARD_PAD_BOTTOM = 22;
export const FEED_DIVIDER_DP = 3;
export const CARD_MAP_HEIGHT = 150;
// route = CARD_PAD_TOP + head 24 + hero 46 + (6 + CARD_MAP_HEIGHT) + strip (10 + 24) + CARD_PAD_BOTTOM + FEED_DIVIDER_DP
export const CARD_HEIGHT_ROUTE = 307;
// plain = the same without the strip (34)
export const CARD_HEIGHT_PLAIN = 273;

/** The one rider-facing verdict for an activity that cannot be ranked (feed card hero slot and
 * the detail page's big slot). brief 05, Nathan 2026-10-07: "either a ride is good and ranked,
 * or it is not, gets no time, no rank". */
export const NOT_RANKED_LABEL = 'Not ranked';

/** brief 05: the ONE rule for "no time, no rank, 'Not ranked'" on the feed card and the detail
 * page. `quality` is the lap quality as stored (store/derive.ts: 'clean' | 'interrupted' |
 * 'estimated' | 'missed') or RideRowModel.quality (null for clean). Unranked ⇔ the rider
 * ignored it (ignoredFromRanking) OR the lap has no real time (estimated / missed: scoredS is
 * null by construction, results.ts ranks() refuses it). 'interrupted' has a real moving time
 * and is ranked like clean. A ranked time without a position ('too few to rank', tripwire
 * 'no rank') is NOT unranked: the time is real, only the rank line says there is no position. */
export function unrankedForDisplay(quality: string | null, ignored: boolean): boolean {
  return ignored || quality === 'estimated' || quality === 'missed';
}

export function durationLabel(meta: RideMeta | null): string {
  if (meta === null || meta.endMs <= meta.startMs) return '';
  return fmt((meta.endMs - meta.startMs) / 1000);
}

/** The strip shows a bare dash for a sector the ride did not traverse; otherwise the row's own time label. */
export function sectorChipLabel(row: SectorRowModel, quality: string): string {
  return quality === 'missed' ? '–' : row.timeLabel;
}

export function buildFeedCard(row: RideRowModel, detail: RideDetailModel, meta: RideMeta | null,
  sectorQuality: (index: number) => string): FeedCardModel {
  const route = detail.kind === 'route';
  const unranked = route && unrankedForDisplay(row.quality, detail.ignored);
  return {
    rideId: row.rideId,
    startMs: row.startMs,
    dateLabel: row.dateLabel,
    title: row.wayName,
    variant: route ? 'route' : 'plain',
    heroLabel: route ? (unranked ? durationLabel(meta) : row.lapLabel) : durationLabel(meta),
    heroTier: route && !unranked ? detail.lapTier : 'neutral',
    rankLabel: route ? (unranked ? NOT_RANKED_LABEL : row.rank ? `P${row.rank.pos}/${row.rank.of}` : null) : null,
    unranked,
    ignored: detail.ignored,
    wayId: route ? detail.wayId : null,
    sectorColours: detail.sectorColours,
    sectors: route && !unranked ? detail.sectorRows.map((r) => ({ label: r.label, timeLabel: sectorChipLabel(r, sectorQuality(r.index)), tier: r.tier })) : [],
    needsTrail: !route,
    ignoreToggle: detail.canToggleIgnore ? (detail.ignored ? 'count' : 'ignore') : null,
  };
}

export function buildFeedCards(rows: readonly RideRowModel[],
  detailFor: (rideId: string, startMs: number) => RideDetailModel,
  metaFor: (rideId: string) => RideMeta | null,
  sectorQualityFor: (rideId: string, index: number) => string): FeedCardModel[] {
  return rows.map((row) => buildFeedCard(row, detailFor(row.rideId, row.startMs), metaFor(row.rideId), (i) => sectorQualityFor(row.rideId, i)));
}

export function feedCardHeight(card: FeedCardModel): number {
  return card.variant === 'route' ? CARD_HEIGHT_ROUTE : CARD_HEIGHT_PLAIN;
}

/** FlatList getItemLayout: fixed heights make scroll restore and windowing exact. O(n) per call is fine (n = rides on file). */
export function feedItemLayout(cards: readonly FeedCardModel[], index: number): { length: number; offset: number; index: number } {
  let offset = 0;
  for (let i = 0; i < index && i < cards.length; i++) offset += feedCardHeight(cards[i]);
  const length = index < cards.length ? feedCardHeight(cards[index]) : 0;
  return { length, offset, index };
}

/** Which card indices carry a LIVE map: every viewable index plus `radius` neighbours each side, clamped to [0, count). Empty when nothing is viewable. */
export function liveMapIndices(viewable: readonly number[], count: number, radius: number): Set<number> {
  const out = new Set<number>();
  for (const v of viewable) {
    for (let i = v - radius; i <= v + radius; i++) if (i >= 0 && i < count) out.add(i);
  }
  return out;
}

export function sameIndexSet(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

/** '+3s' / '-2s' / '0s' / '' (null). ASCII hyphen-minus, no dash glyphs (CLAUDE.md rule 9). */
export function sectorGapLabel(gapS: number | null): string {
  if (gapS === null) return '';
  const r = Math.round(gapS);
  if (r === 0) return '0s';
  return `${r > 0 ? '+' : '-'}${Math.abs(r)}s`;
}
