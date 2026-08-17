/**
 * QA — B-28 wiring: the pure tower builder (src/ui/towerModel.ts).
 *
 * The tower component owns anatomy + motion only; every ranking/gap/flag
 * decision on the post-run board comes from buildTowerModel, so it is locked
 * here headless: ordering, 1-based positions, today placement, gap strings,
 * the D-028 unranked "NO TIME" row, D-018 ghost markers, the D-007 PB dot,
 * per-row tiers, and the hand-rolled date format.
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { assert, test } from './lib.ts';
import type { RideResult } from '../src/store/types.ts';

// Same JSON-import hook as live_colour_suite: towerModel pulls tierFor/fmt
// from colourModel, whose module body imports the bare-.json seed.
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const { buildTowerModel, towerDate } = await import('../src/ui/towerModel.ts');

/** Minimal synthetic RideResult — shape copied from results.seed.json. */
function ride(movingS: number, startedAtMs: number, source: 'app' | 'archive' = 'archive'): RideResult {
  return {
    kind: 'rideResult',
    schemaVersion: 1,
    rideId: `test:${startedAtMs}`,
    startedAtMs,
    routeId: 'Morning',
    source,
    lap: { rawS: movingS, movingS, quality: 'clean' },
    sectors: [],
    derivedBy: { engineVersion: 'test', gateSetVersion: 1, resultSchemaVersion: 1 },
  };
}

const T0 = 1785486893000; // seed epoch-ish; exact value irrelevant except dates
const DAY = 86_400_000;
const TODAY_MS = T0 + 20 * DAY;

test('towerModel: rows sort ascending, pos is 1-based, today slots by rank', () => {
  const win = [ride(900, T0), ride(850, T0 + DAY), ride(875, T0 + 2 * DAY)];
  const m = buildTowerModel(win, 860, false, TODAY_MS, null);
  assert(m.rows.length === 4, `expected 4 rows, got ${m.rows.length}`);
  const values = ['850', '860', '875', '900'];
  m.rows.forEach((r, i) => {
    assert(r.pos === i + 1, `row ${i} pos: got ${r.pos}, want ${i + 1}`);
    const secs = r.time.split(':').reduce((a, b) => a * 60 + Number(b), 0);
    assert(String(secs) === values[i], `row ${i} time ${r.time} != ${values[i]}s`);
  });
  assert(m.rows[1].today === true, 'the 860 lap is today and must carry the flag');
  assert(m.rows.filter((r) => r.today).length === 1, 'exactly one today row');
  // Only 2 other laps in each row's history (< MIN_HISTORY): no verdict at all.
  assert(m.rows.every((r) => r.tier === 'neutral'), 'thin history must stay neutral, never coloured');
});

test('towerModel: gap is em-dash for P1, whole rounded seconds elsewhere', () => {
  const win = [ride(850, T0), ride(900, T0 + DAY)];
  const m = buildTowerModel(win, 857.4, false, TODAY_MS, null);
  assert(m.rows[0].gap === '—', `P1 gap: got "${m.rows[0].gap}"`);
  assert(m.rows[1].gap === '+7s', `today gap: got "${m.rows[1].gap}" (7.4 rounds to 7)`);
  assert(m.rows[2].gap === '+50s', `slow row gap: got "${m.rows[2].gap}"`);
});

test('towerModel: estimated today is unranked NO TIME, sits last (D-028)', () => {
  const win = [ride(900, T0), ride(850, T0 + DAY), ride(875, T0 + 2 * DAY)];
  for (const [lap, est] of [[700, true], [null, false]] as const) {
    const m = buildTowerModel(win, lap, est, TODAY_MS, null);
    assert(m.rows.length === 4, 'unranked today still occupies a row');
    const last = m.rows[m.rows.length - 1];
    assert(last.today === true, 'the unranked row is today');
    assert(last.pos === null, `unranked pos must be null, got ${last.pos}`);
    assert(last.time === 'NO TIME', `got "${last.time}"`);
    assert(last.tier === 'est', `got tier ${last.tier}`);
    assert(last.gap === '', `unranked gap must be empty, got "${last.gap}"`);
    // and it stole no rank: past rows are still P1..P3 in order
    assert(m.rows.slice(0, 3).every((r, i) => r.pos === i + 1 && !r.today), 'past rows keep their ranks');
  }
});

test('towerModel: ghost ○ from source — archive yes, app no, absent yes (D-018)', () => {
  const win = [ride(850, T0, 'archive'), ride(875, T0 + DAY, 'app')];
  const noSource = ride(900, T0 + 2 * DAY);
  delete (noSource as Partial<RideResult>).source; // malformed entry: treat as ghost
  win.push(noSource);
  const m = buildTowerModel(win, 860, false, TODAY_MS, null);
  const by = (v: number) => m.rows.find((r) => Math.abs(v - r.time.split(':').reduce((a, b) => a * 60 + Number(b), 0)) < 1)!;
  assert(by(850).ghost === true, 'archive-seeded lap must be a ghost');
  assert(by(875).ghost === false, 'app-recorded lap is not a ghost');
  assert(by(900).ghost === true, 'source-less entry must default to ghost');
  assert(m.rows.find((r) => r.today)!.ghost === false, 'today is never a ghost');
});

test('towerModel: PB dot on the all-time best only, first occurrence only (D-007)', () => {
  const win = [ride(850, T0), ride(850, T0 + DAY), ride(900, T0 + 2 * DAY)];
  const m = buildTowerModel(win, 860, false, TODAY_MS, 850);
  assert(m.rows[0].pb === true, 'first 850 row carries the PB dot');
  assert(m.rows[1].pb === false, 'the tie does NOT get a second dot');
  assert(m.rows.filter((r) => r.pb).length === 1, 'exactly one PB dot');

  const none = buildTowerModel(win, 860, false, TODAY_MS, null);
  assert(none.rows.every((r) => !r.pb), 'no all-time best known ⇒ no dot');

  const fell = buildTowerModel(win, 860, false, TODAY_MS, 800); // best fell out of the window
  assert(fell.rows.every((r) => !r.pb), 'all-time best outside the window ⇒ nobody wears it');

  const mine = buildTowerModel([ride(900, T0)], 850, false, TODAY_MS, 850);
  const today = mine.rows.find((r) => r.today)!;
  assert(today.pb === true, "today's lap can itself be the all-time best");
});

test('towerModel: per-row tiers judge each lap against the OTHER laps', () => {
  // 6 laps: excluding any one still leaves >= MIN_HISTORY (5) to judge against.
  const vals = [100, 102, 104, 106, 108, 110];
  const win = vals.map((v, i) => ride(v, T0 + i * DAY));
  const m = buildTowerModel(win, 99, false, TODAY_MS, null);
  const at = (v: number) => m.rows.find((r) => r.time.split(':').reduce((a, b) => a * 60 + Number(b), 0) === v)!;
  assert(m.rows.find((r) => r.today)!.tier === 'purple', 'today 99 beats every window lap → purple');
  assert(at(100).tier === 'purple', '100 beats all OTHERS (102..110) → purple, itself excluded');
  assert(at(104).tier === 'green', '104 is under the others\' mean (105.2) → green');
  assert(at(110).tier === 'yellow', '110 is over the others\' mean (104) → yellow');
});

test('towerModel: dates hand-format as "Tue 05 Aug"', () => {
  const ms = 1785829491000; // seed ride 20260804-0944
  // The implementation renders the rider's LOCAL day; build the expectation
  // from the same Date APIs so the test holds in any timezone.
  const d = new Date(ms);
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  const mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  const expected = `${wd} ${String(d.getDate()).padStart(2, '0')} ${mo}`;
  assert(towerDate(ms) === expected, `towerDate(${ms}) = "${towerDate(ms)}", want "${expected}"`);
  assert(/^[A-Z][a-z]{2} \d{2} [A-Z][a-z]{2}$/.test(towerDate(ms)), 'shape must be "Www DD Mmm"');
  // and the rows carry it
  const m = buildTowerModel([ride(850, ms)], 900, false, TODAY_MS, null);
  assert(m.rows[0].date === expected, `row date "${m.rows[0].date}" != "${expected}"`);
});
