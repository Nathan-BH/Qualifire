/**
 * QA — cycle 024 (WP-A3): rideHistoryModel.ts, the pure view-model layer
 * behind the redesigned RIDES (ride history) and RESULT (last ride + personal
 * bests) screens. Headless: no React, no expo.
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { assert, test } from './lib.ts';
import { RESULT_SCHEMA_VERSION, type RideResult, type SectorQuality } from '../src/store/types.ts';
import type { RideMeta } from '../src/storage/types.ts';

// rideHistoryModel.ts imports colourModel.ts, which imports results.seed.json
// as a bare `.json` — Metro bundles that directly, Node needs an import
// attribute it cannot get without changing app code. Same shim, same reason,
// as live_colour_suite.ts/resultsstore_suite.ts: the module under test is
// pulled in DYNAMICALLY, after the hook exists (static imports are linked
// before any module body — including this hook — runs).
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
  buildRideRows, buildSectorRows, buildPbRows, buildPbDetail, dateTimeLabel, lapCellLabel,
} = await import('../src/ui/rideHistoryModel.ts');
const { fmt, MIN_HISTORY } = await import('../src/ui/colourModel.ts');

// ------------------------------------------------------------------ helpers

function makeResult(
  rideId: string, routeId: string | null, startedAtMs: number,
  lap: { movingS: number | null; rawS: number; quality: SectorQuality },
  sectors: { index: number; movingS: number | null; rawS: number; quality: SectorQuality }[] = [],
): RideResult {
  return {
    kind: 'rideResult',
    schemaVersion: RESULT_SCHEMA_VERSION,
    rideId,
    startedAtMs,
    routeId,
    source: 'app',
    lap,
    sectors: sectors.map((s) => ({ ...s, fromChainageM: 0, toChainageM: 1000 })),
    derivedBy: { engineVersion: 'test', gateSetVersion: 1, resultSchemaVersion: RESULT_SCHEMA_VERSION },
  };
}

// ============================================================ buildRideRows

test('ridehistory: buildRideRows orders newest-first; a result gets routeName/lap, no-result gets nulls', () => {
  const metas: RideMeta[] = [
    { rideId: 'r1', startMs: 1000, endMs: 2000, nFixes: 10 },
    { rideId: 'r2', startMs: 5000, endMs: 6000, nFixes: 10 },
    { rideId: 'r3', startMs: 3000, endMs: 4000, nFixes: 10 },
  ];
  const r2Result = makeResult('r2', 'Morning', 5000, { movingS: 900, rawS: 900, quality: 'clean' }, [
    { index: 1, movingS: 900, rawS: 900, quality: 'clean' },
  ]);
  const resultFor = (id: string) => (id === 'r2' ? r2Result : null);
  const rows = buildRideRows(metas, resultFor, () => []);

  assert(rows.map((r) => r.rideId).join(',') === 'r2,r3,r1',
    `expected newest-first order r2,r3,r1 — got ${rows.map((r) => r.rideId).join(',')}`);

  const withResult = rows.find((r) => r.rideId === 'r2')!;
  assert(withResult.routeName === 'Morning', `ride with a result must get a routeName, got ${withResult.routeName}`);
  assert(withResult.lapS === 900, `ride with a clean result must carry lapS, got ${withResult.lapS}`);

  const withoutResult = rows.find((r) => r.rideId === 'r1')!;
  assert(withoutResult.routeName === null && withoutResult.routeId === null,
    'a ride with no stored result must render null route fields');
  assert(withoutResult.lapS === null && withoutResult.rank === null && withoutResult.quality === null,
    'a ride with no stored result must render null lap/rank/quality');
});

test('ridehistory: buildRideRows rank excludes self — 5 others => "of" is 6, mockup in-place semantics', () => {
  const metas: RideMeta[] = [{ rideId: 'r1', startMs: 1000, endMs: 2000, nFixes: 10 }];
  const result = makeResult('r1', 'Morning', 1000, { movingS: 500, rawS: 500, quality: 'clean' }, []);
  const others = [510, 520, 530, 540, 550];
  const rows = buildRideRows(
    metas, () => result,
    (routeId, excl) => (routeId === 'Morning' && excl === 'r1' ? others : []),
  );
  assert(rows[0].rank !== null, 'rank must be present with 5 comparable others (>= MIN_HISTORY)');
  assert(rows[0].rank!.of === 6, `"of" must be 6 (5 others + self inserted) — got ${rows[0].rank!.of}`);
  assert(rows[0].rank!.pos === 1, `500 is fastest of all six — expected pos 1, got ${rows[0].rank!.pos}`);
});

test('ridehistory: buildRideRows rank is null below MIN_HISTORY (4 comparable others)', () => {
  const metas: RideMeta[] = [{ rideId: 'r1', startMs: 1000, endMs: 2000, nFixes: 10 }];
  const result = makeResult('r1', 'Morning', 1000, { movingS: 500, rawS: 500, quality: 'clean' }, []);
  const others = [510, 520, 530, 540];
  assert(others.length < MIN_HISTORY, 'test fixture must stay below MIN_HISTORY');
  const rows = buildRideRows(metas, () => result, () => others);
  assert(rows[0].rank === null,
    `rank must be null with only ${others.length} others (< MIN_HISTORY) — got ${JSON.stringify(rows[0].rank)}`);
});

test('B-117: a tripwire-demoted lap never takes a position in RIDES rows', () => {
  const metas: RideMeta[] = [{ rideId: 'demoted', startMs: 9000, endMs: 9500, nFixes: 10 }];
  const demoted: RideResult = {
    ...makeResult('demoted', 'Morning', 9000, { movingS: 100, rawS: 100, quality: 'clean' }),
    tripwireDemoted: true,
  };
  const others = [190, 195, 205, 210, 215]; // >= MIN_HISTORY, so only the gate can stop a rank
  const rows = buildRideRows(metas, () => demoted, () => others);
  assert(rows[0].rank === null,
    `a tripwireDemoted lap must not rank even with a real movingS — got ${JSON.stringify(rows[0].rank)}`);
  assert(rows[0].lapLabel === fmt(100, 1), 'the time itself still displays honestly');
});

test('ridehistory: buildRideRows — an estimated lap is ~-prefixed raw, never gets lapS or a rank', () => {
  const metas: RideMeta[] = [{ rideId: 'r1', startMs: 1000, endMs: 2000, nFixes: 10 }];
  const result = makeResult('r1', 'Morning', 1000, { movingS: null, rawS: 900, quality: 'estimated' }, []);
  const rows = buildRideRows(metas, () => result, () => [1, 2, 3, 4, 5, 6, 7, 8]);
  assert(rows[0].lapS === null, 'an estimated lap must never carry a moving lapS');
  assert(rows[0].lapLabel === `~${fmt(900)}`, `estimated lapLabel must be ~-prefixed raw, got ${rows[0].lapLabel}`);
  assert(rows[0].rank === null, 'an estimated lap must never rank, even with ample history on offer');
  assert(rows[0].quality === 'estimated', `non-clean quality must surface, got ${rows[0].quality}`);
});

test('ridehistory: buildRideRows — a missed-gate lap (quality missed) reads "no lap", never a bare raw number', () => {
  // WP-A3 review fix (2026-08-24): a ride that reached START and FINISH but
  // lost a middle gate stores lap.quality 'missed', movingS null, and a real
  // rawS (the full elapsed time) — distinct from 'estimated'. D-025: this
  // must never render as an unmarked, ordinary-looking time.
  const metas: RideMeta[] = [{ rideId: 'r1', startMs: 1000, endMs: 2000, nFixes: 10 }];
  const result = makeResult('r1', 'Morning', 1000, { movingS: null, rawS: 900, quality: 'missed' }, []);
  const rows = buildRideRows(metas, () => result, () => [1, 2, 3, 4, 5, 6, 7, 8]);
  assert(rows[0].lapS === null, 'a missed-gate lap must never carry a moving lapS');
  assert(rows[0].lapLabel === 'no lap', `missed-gate lapLabel must be "no lap", got ${rows[0].lapLabel}`);
  assert(rows[0].rank === null, 'a missed-gate lap must never rank, even with ample history on offer');
  assert(rows[0].quality === 'missed', `non-clean quality must surface, got ${rows[0].quality}`);
});

// ============================================================ lapCellLabel

test('ridehistory: lapCellLabel — the RIDES/RESULT shared rule: real time, ~raw when estimated, else "no lap"', () => {
  // Shared verbatim by ResultScreen.tsx (WP-A3 review fix, 2026-08-24) so the
  // two screens can never again disagree about the same ride.
  assert(lapCellLabel(500, false, 500) === fmt(500, 1),
    `a real moving time must format via fmt(_, 1), got ${lapCellLabel(500, false, 500)}`);
  assert(lapCellLabel(null, true, 900) === `~${fmt(900)}`,
    `estimated (movingS null) must be ~-prefixed raw, got ${lapCellLabel(null, true, 900)}`);
  // The missed-gate case: movingS null, NOT estimated, a real rawS on file —
  // this is exactly the shape that used to leak through ResultScreen.tsx's
  // old `lapMovingS ?? lapRawS` fallback as a bare, unearned-looking number.
  assert(lapCellLabel(null, false, 900) === 'no lap',
    `a missed-gate lap (movingS null, not estimated) must read "no lap", got ${lapCellLabel(null, false, 900)}`);
  assert(lapCellLabel(null, false, null) === 'no lap',
    'no result at all (movingS and rawS both null) must also read "no lap"');
});

// ========================================================== buildSectorRows

test('ridehistory: buildSectorRows — estimated ~raw, missed did-not-traverse, clean gets a real tier + avg', () => {
  const result = makeResult('r1', 'Morning', 1000, { movingS: null, rawS: 900, quality: 'estimated' }, [
    { index: 1, movingS: 200, rawS: 200, quality: 'clean' },
    { index: 2, movingS: null, rawS: 300, quality: 'estimated' },
    { index: 3, movingS: null, rawS: 0, quality: 'missed' },
  ]);
  const hist1 = [190, 195, 205, 210, 215]; // 5 => MIN_HISTORY reached, real tier expected
  const rows = buildSectorRows(result, (i) => (i === 1 ? hist1 : []));

  const s1 = rows.find((r) => r.index === 1)!;
  assert(s1.timeLabel === fmt(200, 1), `S1 (clean) must show a real moving time, got ${s1.timeLabel}`);
  assert(s1.tier !== 'est', `S1 has 5-ride history and must get a real tier, got ${s1.tier}`);
  assert(s1.avgLabel !== '', 'S1 has non-empty history so avgLabel must be present');

  const s2 = rows.find((r) => r.index === 2)!;
  assert(s2.timeLabel === `~${fmt(300)}`, `S2 (estimated) must show ~raw, got ${s2.timeLabel}`);
  assert(s2.tier === 'est', `S2 (estimated) must carry the est tier, got ${s2.tier}`);
  assert(s2.avgLabel === '', 'S2 has empty history so avgLabel must be blank');

  const s3 = rows.find((r) => r.index === 3)!;
  assert(s3.timeLabel === '– did not traverse –', `S3 (missed) wording wrong: ${s3.timeLabel}`);
  assert(s3.tier === 'est', `S3 (missed) must carry the est tier, got ${s3.tier}`);
});

// ============================================================= buildPbRows

test('ridehistory: buildPbRows omits zero-count routes and preserves the given order', () => {
  const rows = buildPbRows(
    ['Morning', 'EveningA', 'EveningB'],
    (r) => (r === 'Morning' ? 500 : r === 'EveningB' ? 600 : null),
    (r) => (r === 'Morning' ? 8 : r === 'EveningB' ? 3 : 0),
  );
  assert(rows.map((r) => r.routeId).join(',') === 'Morning,EveningB',
    `EveningA (count 0) must be omitted and the given order preserved — got ${rows.map((r) => r.routeId).join(',')}`);
});

// =========================================================== buildPbDetail

test('ridehistory: buildPbDetail — ascending sort, P1 gap blank, today marker, never leaks a raw rideId, PB sectors ignore interrupted', () => {
  const results = [
    makeResult('20260801-070000-aaaa', 'Morning', 1000, { movingS: 520, rawS: 520, quality: 'clean' }, [
      { index: 1, movingS: 100, rawS: 100, quality: 'clean' },
    ]),
    makeResult('20260805-070000-bbbb', 'Morning', 2000, { movingS: 500, rawS: 500, quality: 'clean' }, [
      // A faster S1 time exists here, but the sector is 'interrupted' (a red
      // light in it) — D-008's own rule: interrupted times never define
      // "best" (mirrors colourModel.ts's sectorValues, CLEAN ONLY).
      { index: 1, movingS: 80, rawS: 80, quality: 'interrupted' },
    ]),
    makeResult('20260810-070000-cccc', 'Morning', 3000, { movingS: 540, rawS: 540, quality: 'clean' }, [
      { index: 1, movingS: 110, rawS: 110, quality: 'clean' },
    ]),
  ];
  const lastRideId = '20260810-070000-cccc';
  const detail = buildPbDetail(results, lastRideId);

  assert(
    detail.ranking.map((r) => r.timeLabel).join(',') === [500, 520, 540].map((v) => fmt(v)).join(','),
    `ranking rows must sort ascending by lap time, got ${detail.ranking.map((r) => r.timeLabel).join(',')}`,
  );
  assert(detail.ranking[0].gapLabel === '', 'P1 gap must be blank');
  assert(detail.ranking[1].gapLabel === '+20s', `P2 gap should be +20s, got ${detail.ranking[1].gapLabel}`);

  const todayRows = detail.ranking.filter((r) => r.today);
  assert(todayRows.length === 1, `exactly one row must be marked today, got ${todayRows.length}`);
  assert(todayRows[0].timeLabel === fmt(540), 'the row marked today must be the lastRideId ride');
  assert(todayRows[0].dateLabel === 'today', `the today row's dateLabel must read "today", got ${todayRows[0].dateLabel}`);

  const s1 = detail.pbSectors.find((s) => s.label === 'S1')!;
  assert(s1.timeLabel === fmt(100, 1), `PB sector must ignore the interrupted 80s time, got ${s1.timeLabel}`);

  const blob = JSON.stringify(detail);
  for (const r of results) assert(!blob.includes(r.rideId), `a label leaked a raw rideId: ${r.rideId}`);
});

// ============================================================ dateTimeLabel

test('ridehistory: dateTimeLabel is absolute — month name + HH:MM, no relative forms', () => {
  const ms = Date.UTC(2026, 7, 5, 8, 31); // Aug 5 2026 (rendered in local time by design)
  const label = dateTimeLabel(ms);
  assert(/[A-Za-z]{3}/.test(label), `dateTimeLabel must contain a weekday/month name, got "${label}"`);
  assert(/\d{2}:\d{2}/.test(label), `dateTimeLabel must contain HH:MM, got "${label}"`);
  assert(!/today|yesterday/i.test(label), `dateTimeLabel must never use a relative form, got "${label}"`);
});
