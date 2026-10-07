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
  /** 'route': lap label; 'plain': the ride's wall-clock duration, or '' when endMs <= startMs */
  heroLabel: string;
  heroTier: UiTier;         // 'route': detail.lapTier (neutral while ignored); 'plain': 'neutral'
  rankLabel: string | null; // 'P3/10' or null
  subLabel: string | null;  // non-clean quality ('estimated' | 'missed' | 'interrupted'), or 'ignored', else null
  ignored: boolean;
  wayId: string | null;     // the map asset for 'route'; null for 'plain'
  sectorColours: (string | null)[]; // detail.sectorColours (gate-indexed)
  sectors: FeedSectorChip[];        // 'route' only; [] for 'plain'
  /** 'plain' cards draw the ride's own fixes (no reference line to draw) */
  needsTrail: boolean;
  /** which quick toggle the menu offers, or null when the ride cannot rank */
  ignoreToggle: 'ignore' | 'count' | null;
}

export const CARD_HEIGHT_ROUTE = 290; // see brief 02 §1c layout table; includes the 1 dp divider
export const CARD_HEIGHT_PLAIN = 256;
export const CARD_MAP_HEIGHT = 150;

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
  const sub = row.quality ?? (detail.ignored ? 'ignored' : null);
  return {
    rideId: row.rideId,
    startMs: row.startMs,
    dateLabel: row.dateLabel,
    title: row.wayName,
    variant: route ? 'route' : 'plain',
    heroLabel: route ? row.lapLabel : durationLabel(meta),
    heroTier: route ? detail.lapTier : 'neutral',
    rankLabel: route ? (row.rank ? `P${row.rank.pos}/${row.rank.of}` : null) : null,
    subLabel: route ? sub : null,
    ignored: detail.ignored,
    wayId: route ? detail.wayId : null,
    sectorColours: detail.sectorColours,
    sectors: route ? detail.sectorRows.map((r) => ({ label: r.label, timeLabel: sectorChipLabel(r, sectorQuality(r.index)), tier: r.tier })) : [],
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
