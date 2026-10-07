/**
 * virgin-cycle23 brief 01: feedModel.ts, the pure ACTIVITIES-feed view-model.
 * Headless: no React, no expo.
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { assert, test } from './lib.ts';
import type { RideMeta } from '../src/storage/types.ts';
import type { RideRowModel, SectorRowModel } from '../src/ui/rideHistoryModel.ts';
import type { RideDetailModel } from '../src/ui/rideDetailModel.ts';

// Same JSON shim as ridehistory_suite.ts: feedModel imports colourModel.ts
// (results.seed.json), so the module under test is imported dynamically.
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const {
  buildFeedCard, buildFeedCards, feedItemLayout, liveMapIndices, sameIndexSet, sectorGapLabel,
  durationLabel, sectorChipLabel, CARD_HEIGHT_ROUTE, CARD_HEIGHT_PLAIN,
} = await import('../src/ui/feedModel.ts');

// ------------------------------------------------------------------ fixtures

function row(over: Partial<RideRowModel> = {}): RideRowModel {
  return {
    rideId: 'r1', startMs: 1000, dateLabel: '2026-10-06 08:00', wayId: 'w1', wayName: 'Morning',
    lapS: 303, lapLabel: '5:03.0', quality: null, rank: { pos: 1, of: 10 }, ...over,
  };
}
function sec(index: number, timeLabel: string, tier: SectorRowModel['tier']): SectorRowModel {
  return { index, label: `S${index}`, timeLabel, tier, avgLabel: '', gapS: null };
}
function detail(over: Partial<RideDetailModel> = {}): RideDetailModel {
  return {
    kind: 'route', rideId: 'r1', startedAtMs: 1000, wayId: 'w1', lapLabel: '5:03.0', lapTier: 'purple',
    rankLine: '', ignored: false, canToggleIgnore: true, referenceOf: null, promoteTarget: null,
    sectorRows: [sec(1, '1:41.0', 'green'), sec(2, '– did not traverse –', 'est')],
    sectorColours: [null, '#00D000', null], free: null, ...over,
  } as unknown as RideDetailModel;
}
const q = (i: number): string => (i === 2 ? 'missed' : 'clean');

// --------------------------------------------------------------------- tests

test('feedmodel: buildFeedCard route — hero is the lap label in the detail\'s tier, rank P<pos>/<of>, sub = non-clean quality, strip = one chip per sector row', () => {
  const c = buildFeedCard(row(), detail(), null, q);
  assert(c.variant === 'route', 'variant route');
  assert(c.heroLabel === '5:03.0', 'heroLabel');
  assert(c.heroTier === 'purple', 'heroTier');
  assert(c.rankLabel === 'P1/10', 'rankLabel');
  assert(c.subLabel === null, 'subLabel null');
  assert(c.wayId === 'w1', 'wayId');
  assert(c.sectors.length === 2, 'two chips');
  assert(c.sectors[0].timeLabel === '1:41.0', 'chip 0 time');
  assert(c.sectors[1].timeLabel === '–', 'chip 1 dash');
  assert(c.needsTrail === false, 'needsTrail false');
  assert(c.ignoreToggle === 'ignore', 'ignoreToggle');
});

test('feedmodel: buildFeedCard route — ignored ride: neutral tier, no rank, sub \'ignored\', toggle \'count\'', () => {
  const c = buildFeedCard(row({ rank: null, quality: null }), detail({ ignored: true, lapTier: 'neutral', canToggleIgnore: true }), null, q);
  assert(c.heroTier === 'neutral', 'neutral');
  assert(c.rankLabel === null, 'no rank');
  assert(c.subLabel === 'ignored', 'sub ignored');
  assert(c.ignored === true, 'ignored');
  assert(c.ignoreToggle === 'count', 'count');
});

test('feedmodel: buildFeedCard route — a non-clean quality wins over \'ignored\' in the sub label', () => {
  const c = buildFeedCard(row({ quality: 'estimated' }), detail({ ignored: true }), null, q);
  assert(c.subLabel === 'estimated', 'estimated wins');
});

test('feedmodel: buildFeedCard plain (free) — duration from meta, neutral tier, no rank/sectors, needsTrail, no toggle', () => {
  const meta: RideMeta = { rideId: 'r1', startMs: 1000, endMs: 1000 + (42 * 60 + 10) * 1000, nFixes: 10 };
  const r = row({ wayId: null, wayName: 'Free activity', rank: null });
  const c = buildFeedCard(r, detail({ kind: 'free', canToggleIgnore: false, wayId: null, sectorRows: [] }), meta, q);
  assert(c.variant === 'plain', 'plain');
  assert(c.heroLabel === '42:10', `heroLabel ${c.heroLabel}`);
  assert(c.heroTier === 'neutral', 'neutral');
  assert(c.rankLabel === null, 'no rank');
  assert(c.sectors.length === 0, 'no sectors');
  assert(c.wayId === null, 'no wayId');
  assert(c.needsTrail === true, 'needsTrail');
  assert(c.ignoreToggle === null, 'no toggle');
  assert(c.title === r.wayName, 'title');
});

test('feedmodel: durationLabel — \'\' when meta is null or endMs <= startMs (never invented)', () => {
  assert(durationLabel(null) === '', 'null');
  assert(durationLabel({ rideId: 'a', startMs: 5, endMs: 5, nFixes: 0 }) === '', 'equal');
  assert(durationLabel({ rideId: 'a', startMs: 5, endMs: 4, nFixes: 0 }) === '', 'reversed');
});

test('feedmodel: buildFeedCards keeps the rows\' order and calls detailFor with (rideId, startMs)', () => {
  const rows = [row({ rideId: 'a', startMs: 3 }), row({ rideId: 'b', startMs: 2 }), row({ rideId: 'c', startMs: 1 })];
  const calls: string[] = [];
  const cards = buildFeedCards(rows, (id, ms) => { calls.push(`${id}:${ms}`); return detail({ rideId: id }); }, () => null, () => 'clean');
  assert(cards.map((c) => c.rideId).join() === 'a,b,c', 'order');
  assert(calls.join() === 'a:3,b:2,c:1', `calls ${calls.join()}`);
});

test('feedmodel: feedItemLayout — offsets are the running sum of fixed heights, route 290 / plain 256', () => {
  assert(CARD_HEIGHT_ROUTE === 290 && CARD_HEIGHT_PLAIN === 256, 'constants');
  const r = buildFeedCard(row(), detail(), null, q);
  const p = buildFeedCard(row(), detail({ kind: 'free' }), null, q);
  const cards = [r, p, r];
  const l0 = feedItemLayout(cards, 0);
  const l1 = feedItemLayout(cards, 1);
  const l2 = feedItemLayout(cards, 2);
  const l3 = feedItemLayout(cards, 3);
  assert(l0.offset === 0 && l0.length === 290, 'index 0');
  assert(l1.offset === 290 && l1.length === 256, 'index 1');
  assert(l2.offset === 546 && l2.length === 290, 'index 2');
  assert(l3.length === 0 && l3.offset === 836, 'past the end');
});

test('feedmodel: liveMapIndices — viewable plus radius neighbours, clamped; empty in = empty out', () => {
  const set = (s: Set<number>) => [...s].sort((a, b) => a - b).join();
  assert(set(liveMapIndices([2, 3], 10, 1)) === '1,2,3,4', 'mid');
  assert(set(liveMapIndices([0], 10, 1)) === '0,1', 'low clamp');
  assert(set(liveMapIndices([9], 10, 2)) === '7,8,9', 'high clamp');
  assert(liveMapIndices([], 10, 1).size === 0, 'empty');
  assert(set(liveMapIndices([5], 10, 0)) === '5', 'radius 0');
});

test('feedmodel: sameIndexSet', () => {
  assert(sameIndexSet(new Set([1, 2]), new Set([2, 1])) === true, 'same');
  assert(sameIndexSet(new Set([1]), new Set([1, 2])) === false, 'size differs');
  assert(sameIndexSet(new Set([1, 2]), new Set([1, 3])) === false, 'member differs');
});

test('feedmodel: sectorGapLabel — +3s / -2s / 0s / \'\' and rounding', () => {
  const outs = [sectorGapLabel(3.4), sectorGapLabel(-1.6), sectorGapLabel(0.3), sectorGapLabel(null)];
  assert(outs[0] === '+3s', outs[0]);
  assert(outs[1] === '-2s', outs[1]);
  assert(outs[2] === '0s', outs[2]);
  assert(outs[3] === '', 'null');
  for (const o of outs) assert(!o.includes('−') && !o.includes('—'), 'no dash glyphs');
});

test('feedmodel: sectorChipLabel — missed shows a bare dash, anything else the row\'s time label', () => {
  assert(sectorChipLabel(sec(1, '– did not traverse –', 'est'), 'missed') === '–', 'missed');
  assert(sectorChipLabel(sec(1, '~1:30', 'est'), 'estimated') === '~1:30', 'estimated');
});
