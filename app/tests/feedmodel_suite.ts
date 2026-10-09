/**
 * virgin-cycle23 brief 01: feedModel.ts, the pure ACTIVITIES-feed view-model.
 * Headless: no React, no expo.
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import * as nodePath from 'node:path';
import { assert, test, TESTS_DIR } from './lib.ts';
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
  durationLabel, sectorChipLabel, unrankedForDisplay, NOT_RANKED_LABEL, CARD_HEIGHT_ROUTE, CARD_HEIGHT_PLAIN,
  CARD_PAD_TOP, CARD_PAD_BOTTOM, FEED_DIVIDER_DP, CARD_MAP_HEIGHT,
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

test('feedmodel: buildFeedCard route — hero is the time in the detail\'s tier, rank P<pos>/<of>, no quality word, strip = one chip per sector row', () => {
  const c = buildFeedCard(row(), detail(), null, q);
  assert(c.variant === 'route', 'variant route');
  assert(c.heroLabel === '5:03.0', 'heroLabel');
  assert(c.heroTier === 'purple', 'heroTier');
  assert(c.rankLabel === 'P1/10', 'rankLabel');
  assert(c.unranked === false, 'ranked');
  assert(!('subLabel' in c), 'no subLabel field at all (brief 05)');
  assert(c.wayId === 'w1', 'wayId');
  assert(c.sectors.length === 2, 'two chips');
  assert(c.sectors[0].timeLabel === '1:41.0', 'chip 0 time');
  assert(c.sectors[1].timeLabel === '–', 'chip 1 dash');
  assert(c.needsTrail === false, 'needsTrail false');
  assert(c.ignoreToggle === 'ignore', 'ignoreToggle');
});

test('feedmodel: buildFeedCard route — ignored ride is unranked: no time, no rank, no strip, toggle \'count\' is the way back', () => {
  const c = buildFeedCard(row({ rank: null, quality: null }), detail({ ignored: true, lapTier: 'neutral', canToggleIgnore: true }), null, q);
  assert(c.unranked === true, 'unranked');
  assert(c.heroLabel === '', `no time, got "${c.heroLabel}"`);
  assert(c.rankLabel === 'Not ranked', 'verdict in the rank slot (virgin-cycle27 10)');
  assert(c.sectors.length === 0, 'no strip');
  assert(c.title === 'Morning', 'title kept');
  assert(c.wayId === 'w1' && c.variant === 'route', 'still a route card (not a free activity)');
  assert(c.ignored === true, 'ignored');
  assert(c.ignoreToggle === 'count', 'count');
});

test('feedmodel: buildFeedCard route — estimated / missed lap is unranked: duration shown, neutral, "Not ranked" in the rank slot, no strip (virgin-cycle27 10)', () => {
  const umeta: RideMeta = { rideId: 'r1', startMs: 1000, endMs: 1000 + 1830 * 1000, nFixes: 10 };
  for (const quality of ['estimated', 'missed'] as const) {
    const c = buildFeedCard(row({ quality, lapS: null, lapLabel: '', rank: null }), detail({ lapTier: 'est', canToggleIgnore: false, sectorRows: [sec(1, '~1:30', 'est'), sec(2, '– did not traverse –', 'est')] }), umeta, q);
    assert(c.unranked === true, `${quality}: unranked`);
    assert(c.heroLabel === durationLabel(umeta) && c.heroLabel !== '', `${quality}: total time kept`);
    assert(c.heroTier === 'neutral' && c.rankLabel === 'Not ranked' && c.sectors.length === 0, `${quality}: neutral, label in the rank slot, no strip`);
    assert(buildFeedCard(row({ quality, lapS: null, lapLabel: '', rank: null }), detail({ lapTier: 'est', canToggleIgnore: false }), null, q).heroLabel === '', `${quality}: no meta -> never invented`);
    assert(c.title === 'Morning' && c.wayId === 'w1' && c.variant === 'route', `${quality}: title/map kept, still a route card`);
    assert(c.ignoreToggle === null, `${quality}: nothing to toggle (it never ranked)`);
    for (const v of Object.values(c)) assert(typeof v !== 'string' || !/~|no lap|estimated|missed|interrupted|ignored|gap/.test(v), `${quality}: card string "${v}" leaks a quality word or an estimate`);
  }
});

test('feedmodel: buildFeedCard route — an interrupted lap is an ordinary ranked card (real moving time): time, rank, strip', () => {
  const c = buildFeedCard(row({ quality: 'interrupted' }), detail(), null, q);
  assert(c.unranked === false, 'ranked');
  assert(c.heroLabel === '5:03.0' && c.rankLabel === 'P1/10' && c.sectors.length === 2, 'normal hero + strip');
  for (const v of Object.values(c)) assert(typeof v !== 'string' || !/interrupted/.test(v), `card string "${v}" says interrupted`);
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

test('feedmodel: unrankedForDisplay — the one rule: ignored OR estimated OR missed; clean/interrupted/null are ranked; NOT_RANKED_LABEL pinned', () => {
  assert(NOT_RANKED_LABEL === 'Not ranked', 'label text');
  const matrix: [string | null, boolean, boolean][] = [
    [null, false, false], ['clean', false, false], ['interrupted', false, false],
    ['estimated', false, true], ['missed', false, true],
    [null, true, true], ['clean', true, true], ['interrupted', true, true], ['estimated', true, true], ['missed', true, true],
  ];
  for (const [quality, ignored, want] of matrix) assert(unrankedForDisplay(quality, ignored) === want, `unrankedForDisplay(${quality}, ${ignored}) should be ${want}`);
});

test('feedmodel: buildFeedCards keeps the rows\' order and calls detailFor with (rideId, startMs)', () => {
  const rows = [row({ rideId: 'a', startMs: 3 }), row({ rideId: 'b', startMs: 2 }), row({ rideId: 'c', startMs: 1 })];
  const calls: string[] = [];
  const cards = buildFeedCards(rows, (id, ms) => { calls.push(`${id}:${ms}`); return detail({ rideId: id }); }, () => null, () => 'clean');
  assert(cards.map((c) => c.rideId).join() === 'a,b,c', 'order');
  assert(calls.join() === 'a:3,b:2,c:1', `calls ${calls.join()}`);
});

test('feedmodel: feedItemLayout — offsets are the running sum of fixed heights, route 307 / plain 273', () => {
  assert(CARD_HEIGHT_ROUTE === 307 && CARD_HEIGHT_PLAIN === 273, 'constants');
  const r = buildFeedCard(row(), detail(), null, q);
  const p = buildFeedCard(row(), detail({ kind: 'free' }), null, q);
  const cards = [r, p, r];
  const l0 = feedItemLayout(cards, 0);
  const l1 = feedItemLayout(cards, 1);
  const l2 = feedItemLayout(cards, 2);
  const l3 = feedItemLayout(cards, 3);
  assert(l0.offset === 0 && l0.length === 307, 'index 0');
  assert(l1.offset === 307 && l1.length === 273, 'index 1');
  assert(l2.offset === 580 && l2.length === 307, 'index 2');
  assert(l3.length === 0 && l3.offset === 887, 'past the end');
});

test('feedmodel: card heights are the sum of the block geometry (brief 04: 22/22 padding, 3 dp divider)', () => {
  assert(CARD_PAD_TOP === 22 && CARD_PAD_BOTTOM === 22 && FEED_DIVIDER_DP === 3 && CARD_MAP_HEIGHT === 150, 'geometry tokens');
  assert(FEED_DIVIDER_DP >= 2, 'divider at least twice the old 1 dp');
  const common = CARD_PAD_TOP + 24 + 46 + (6 + CARD_MAP_HEIGHT) + CARD_PAD_BOTTOM + FEED_DIVIDER_DP;
  assert(CARD_HEIGHT_PLAIN === common, `plain ${CARD_HEIGHT_PLAIN} != ${common}`);
  assert(CARD_HEIGHT_ROUTE === common + 10 + 24, `route ${CARD_HEIGHT_ROUTE} != ${common + 34}`);
});

test('feedmodel: liveMapIndices — viewable plus radius neighbours, clamped; empty in = empty out', () => {
  const set = (s: Set<number>) => [...s].sort((a, b) => a - b).join();
  assert(set(liveMapIndices([2, 3], 10, 1)) === '1,2,3,4', 'mid');
  assert(set(liveMapIndices([0], 10, 1)) === '0,1', 'low clamp');
  assert(set(liveMapIndices([9], 10, 2)) === '7,8,9', 'high clamp');
  assert(liveMapIndices([], 10, 1).size === 0, 'empty');
  assert(set(liveMapIndices([5], 10, 0)) === '5', 'radius 0');
  const ui = (f: string) => nodeFs.readFileSync(nodePath.join(TESTS_DIR, '..', 'src', 'ui', f), 'utf8');
  assert(ui('activityCard.tsx').includes('export const MAP_MOUNT_RADIUS = 0;'), 'virgin-cycle29 01: radius 0 in code');
  const rs = ui('RidesScreen.tsx');
  assert(rs.includes('itemVisiblePercentThreshold: 40') && rs.includes('windowSize={3}') && rs.includes('initialNumToRender={2}'), 'virgin-cycle29 01: feed visibility/window pins');
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
