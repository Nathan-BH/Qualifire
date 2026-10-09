/**
 * QA — WP-H: the ride-detail view model (rideDetailFor, rankLineFor,
 * sectorColoursFor) and the free-ride tolerance match (freeRideNear). Pure;
 * fixtures built inline, same style as ridehistory_suite.ts.
 *
 * rideDetailModel.ts imports colourModel.ts, which imports store/seed.ts,
 * which imports the bare catalog.seed.json — same reason (and same shim) as
 * resultsstore_suite.ts/catalogstore_suite.ts: those two must be pulled in
 * DYNAMICALLY, after the loader hook exists, since a static import is linked
 * before any module body (this hook included) runs.
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { assert, test } from './lib.ts';
import { colors, daylight, night, tierHex, type PaddockTheme } from '../src/ui/theme.ts';
import { tierTextColour, tierLineColour, YELLOW_TIER, PURPLE_TEXT_NIGHT, GREEN_TEXT_DAY, YELLOW_TEXT_DAY } from '../src/ui/tierColour.ts';
const PURPLE_INK = '#FFFFFF'; // chips.tsx PURPLE_INK (= colors.white since cycle27 FINAL), mirrored — chips.tsx is JSX and not loadable here
import { freeRideNear, type FreeRideRecord } from '../src/store/freeRides.ts';
import { RESULT_SCHEMA_VERSION, type RideResult, type Way } from '../src/store/types.ts';
import type { RideDetailDeps } from '../src/ui/rideDetailModel.ts';

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const { rankLineFor, rideDetailFor, sectorColoursFor, sectorHighlightColours, sectorTimeCell } = await import('../src/ui/rideDetailModel.ts');
const { MIN_HISTORY } = await import('../src/ui/colourModel.ts');

function mkResult(o: Partial<RideResult> & { rideId: string; startedAtMs: number }): RideResult {
  return {
    kind: 'rideResult',
    schemaVersion: RESULT_SCHEMA_VERSION,
    wayId: 'RouteA',
    source: 'app',
    lap: { rawS: 900, movingS: 880, quality: 'clean' },
    sectors: [
      { index: 1, fromChainageM: 0, toChainageM: 1000, rawS: 440, movingS: 430, quality: 'clean' },
      { index: 2, fromChainageM: 1000, toChainageM: 2000, rawS: 460, movingS: 450, quality: 'clean' },
    ],
    derivedBy: { engineVersion: 'e1', gateSetVersion: 1, resultSchemaVersion: RESULT_SCHEMA_VERSION },
    ...o,
  };
}

function mkWay(o: Partial<Way> & { id: string }): Way {
  return { routeId: 'way:x', refLineId: o.id, gateSetVersion: 1, seeded: false, ...o };
}

const NOOP_DEPS: RideDetailDeps = {
  result: null, free: null, ways: [], userWays: [],
  laps: () => [], sectors: () => [], barred: () => false,
};

test('ridedetail: rideDetailFor — no result, no free → kind none, empty rows, canToggleIgnore false', () => {
  const m = rideDetailFor('r1', 1000, NOOP_DEPS);
  assert(m.kind === 'none', `expected kind none, got ${m.kind}`);
  assert(m.sectorRows.length === 0 && m.sectorColours.length === 0, 'no result -> no rows');
  assert(!m.canToggleIgnore, 'nothing stored -> nothing to toggle');
  assert(m.wayId === null && m.promoteTarget === null, 'no route, no promote target');
});

test('ridedetail: rideDetailFor — result with routeId null but a free record → kind free, free carried through', () => {
  const free: FreeRideRecord = { kind: 'freeRide', schemaVersion: 3, rideId: 'free:1000', startedAtMs: 1000, durationS: null, sportId: null };
  const m = rideDetailFor('free:1000', 1000, { ...NOOP_DEPS, result: mkResult({ rideId: 'free:1000', startedAtMs: 1000, wayId: null }), free });
  assert(m.kind === 'free', `expected kind free, got ${m.kind}`);
  assert(m.free === free, 'free record carried through unchanged');
  assert(m.wayId === null, 'a free result carries no routeId');
});

test('ridedetail: rideDetailFor — clean ranked lap, >=MIN_HISTORY → rank line, lapTier from tierFor, rows sized right', () => {
  const hist = Array.from({ length: MIN_HISTORY }, (_, i) => 905 + i * 5); // all slower than the raw lap (900) -> today is purple (WP-C: raw is the scored default)
  const res = mkResult({ rideId: 'r1', startedAtMs: 5000, lap: { rawS: 900, movingS: 850, quality: 'clean' } });
  const m = rideDetailFor('r1', 5000, {
    ...NOOP_DEPS, result: res,
    laps: () => hist, sectors: () => [], barred: () => false,
  });
  assert(m.kind === 'route', `expected route, got ${m.kind}`);
  assert(/^P\d+ of \d+ on this way$/.test(m.rankLine), `expected "P_ of _ on this way", got "${m.rankLine}"`);
  assert(m.lapTier === 'purple', `expected purple (raw 900 < min of hist), got ${m.lapTier}`);
  assert(m.sectorRows.length === res.sectors.length, `sectorRows length ${m.sectorRows.length} != ${res.sectors.length}`);
  assert(m.sectorColours[0] === null, 'index 0 (START) is always null');
  assert(m.sectorColours.length === res.sectors.length + 1, `sectorColours length ${m.sectorColours.length} != sectors+1`);
});

test('ridedetail: rideDetailFor — ignoredFromRanking true → ignored, neutral tiers/colours, canToggleIgnore true', () => {
  const res = mkResult({ rideId: 'r2', startedAtMs: 6000, ignoredFromRanking: true });
  const m = rideDetailFor('r2', 6000, { ...NOOP_DEPS, result: res, laps: () => [1, 2, 3, 4, 5], sectors: () => [1, 2, 3] });
  assert(m.ignored, 'must read as ignored');
  assert(m.rankLine === 'ignored in ranking', `unexpected rank line: "${m.rankLine}"`);
  assert(m.unranked === true, 'ignored → unranked (brief 05)');
  assert(m.lapTier === 'neutral', `expected neutral lapTier, got ${m.lapTier}`);
  assert(m.sectorRows.every((r) => r.tier === 'neutral' || r.tier === 'est'), 'every sector row must read neutral/est while ignored');
  assert(m.sectorColours.every((c) => c === null), 'every sector colour must be null while ignored');
  assert(m.canToggleIgnore, 'an ignored, otherwise-rankable lap can still be toggled back');
});

test('ridedetail: rideDetailFor — estimated lap → canToggleIgnore false, unranked, reason line says what happened', () => {
  const res = mkResult({
    rideId: 'r3', startedAtMs: 7000,
    lap: { rawS: 900, movingS: null, quality: 'estimated' },
    sectors: [{ index: 1, fromChainageM: 0, toChainageM: 1000, rawS: 900, movingS: null, quality: 'estimated' }],
  });
  const m = rideDetailFor('r3', 7000, { ...NOOP_DEPS, result: res });
  assert(!m.canToggleIgnore, 'nothing to ignore on a lap that never ranked in the first place');
  assert(m.rankLine === 'Not ranked', `unexpected rank line: "${m.rankLine}"`);
  assert(m.unranked === true && m.lapLabel === '', 'estimated → unranked, no label (no ~)');
});

test('ridedetail: rideDetailFor — tripwireDemoted → barred → excluded-from-comparison line, canToggleIgnore false', () => {
  const res = mkResult({ rideId: 'r4', startedAtMs: 8000, tripwireDemoted: true });
  const m = rideDetailFor('r4', 8000, { ...NOOP_DEPS, result: res, laps: () => [1, 2, 3, 4, 5], barred: () => true });
  assert(m.rankLine === 'no rank', `unexpected rank line: "${m.rankLine}"`);
  assert(m.unranked === false, 'a real time without a position is NOT unranked (brief 05)');
  assert(!m.canToggleIgnore, 'a tripwire-demoted lap never ranks either way — nothing to toggle');
});

test('ridedetail: rideDetailFor — referenceOf resolves the route whose referenceRideId === rideId, null otherwise', () => {
  const ways = [mkWay({ id: 'RouteA', referenceRideId: 'r5' }), mkWay({ id: 'RouteB', referenceRideId: 'other' })];
  const res = mkResult({ rideId: 'r5', startedAtMs: 9000, wayId: 'RouteA' });
  const withRef = rideDetailFor('r5', 9000, { ...NOOP_DEPS, result: res, ways });
  assert(withRef.referenceOf?.id === 'RouteA', `expected referenceOf RouteA, got ${withRef.referenceOf?.id}`);
  const res2 = mkResult({ rideId: 'r6', startedAtMs: 9500, wayId: 'RouteB' });
  const withoutRef = rideDetailFor('r6', 9500, { ...NOOP_DEPS, result: res2, ways });
  assert(withoutRef.referenceOf === null, 'r6 is not any route\'s reference');
});

test('ridedetail: rankLineFor — ignored wins over every other branch', () => {
  const line = rankLineFor(
    { lapS: 850, estimated: false, ignored: true },
    Array.from({ length: MIN_HISTORY }, () => 900),
    true, // barred too
  );
  assert(line === 'ignored in ranking', `expected the ignored line, got "${line}"`);
});

test('brief 05: rideDetailFor.unranked follows feedModel.unrankedForDisplay — missed/estimated/ignored true, clean/interrupted/free/none false; missed reason line', () => {
  const hist = Array.from({ length: MIN_HISTORY }, () => 900);
  const mk = (quality: 'clean' | 'interrupted' | 'estimated' | 'missed', ignored = false) => rideDetailFor('x', 1, {
    ...NOOP_DEPS, laps: () => hist,
    result: mkResult({ rideId: 'x', startedAtMs: 1, ignoredFromRanking: ignored, lap: { rawS: 900, movingS: quality === 'estimated' || quality === 'missed' ? null : 850, quality } }),
  });
  assert(mk('clean').unranked === false && mk('interrupted').unranked === false, 'real time → ranked');
  assert(mk('estimated').unranked === true && mk('missed').unranked === true, 'no real time → unranked');
  assert(mk('clean', true).unranked === true && mk('interrupted', true).unranked === true, 'ignored → unranked');
  assert(mk('missed').rankLine === 'Not ranked' && mk('estimated').rankLine === 'Not ranked', 'no reason line, one neutral verdict (virgin-cycle27 10)');
  assert(mk('missed').lapLabel === '' && mk('estimated').lapLabel === '', 'no label without a real time');
  assert(rideDetailFor('n', 1, NOOP_DEPS).unranked === false, 'kind none → false');
  for (const m of [mk('estimated'), mk('missed'), mk('clean', true)]) {
    for (const v of [m.lapLabel, m.rankLine]) assert(!/~|no lap|no time|estimated/.test(v), `detail string "${v}" leaks an estimate or the old wording`);
  }
});

test('brief 05: sectorTimeCell — tier est (no real time) shows nothing; every other row its own time label', () => {
  assert(sectorTimeCell({ tier: 'est', timeLabel: '~1:30' }) === '', 'estimated row → blank');
  assert(sectorTimeCell({ tier: 'est', timeLabel: '– did not traverse –' }) === '', 'missed row → blank');
  for (const tier of ['purple', 'green', 'yellow', 'neutral'] as const) assert(sectorTimeCell({ tier, timeLabel: '1:41.0' }) === '1:41.0', `${tier} keeps its time`);
});

test('ridedetail: sectorColoursFor — mirrors ResultScreen (clean+movingS coloured, interrupted/estimated/missed null; own ride excluded by rideId in hist, not by value — WP-K)', () => {
  const res = mkResult({
    rideId: 'r7', startedAtMs: 1_000_000,
    sectors: [
      { index: 1, fromChainageM: 0, toChainageM: 1000, rawS: 100, movingS: 90, quality: 'clean' },
      { index: 2, fromChainageM: 1000, toChainageM: 2000, rawS: 110, movingS: 100, quality: 'interrupted' },
      { index: 3, fromChainageM: 2000, toChainageM: 3000, rawS: 120, movingS: null, quality: 'estimated' },
      { index: 4, fromChainageM: 3000, toChainageM: 4000, rawS: 0, movingS: null, quality: 'missed' },
    ],
  });
  const hist = (i: number) => (i === 1 ? Array.from({ length: MIN_HISTORY }, (_, k) => 101 + k) : []); // all above the raw sector time (100) (WP-C: raw is the scored default)
  const colours = sectorColoursFor(res, hist);
  assert(colours.length === 5, `expected 5 (4 sectors + null head), got ${colours.length}`);
  assert(colours[0] === null, 'index 0 always null');
  assert(colours[1] === colors.purple, `S1 (clean, best of hist) expected purple line colour, got ${colours[1]}`);
  assert(colours[2] === null, 'S2 interrupted -> null (not coloured)');
  assert(colours[3] === null, 'S3 estimated -> null');
  assert(colours[4] === null, 'S4 missed -> null');
});

// ---------------------------------------------------- §3.3b promoteTarget

test('ridedetail: rideDetailFor — promoteTarget: user-owned unreferenced route, null when own reference, null when seed-owned, null for free/none', () => {
  const userA = mkWay({ id: 'RouteA', referenceRideId: 'someOtherRide' });
  const resA = mkResult({ rideId: 'r8', startedAtMs: 10_000, wayId: 'RouteA' });
  const withTarget = rideDetailFor('r8', 10_000, { ...NOOP_DEPS, result: resA, ways: [userA], userWays: [userA] });
  assert(withTarget.promoteTarget?.id === 'RouteA', `expected promoteTarget RouteA, got ${withTarget.promoteTarget?.id}`);

  const userSelfRef = mkWay({ id: 'RouteA', referenceRideId: 'r9' });
  const resSelf = mkResult({ rideId: 'r9', startedAtMs: 10_100, wayId: 'RouteA' });
  const withSelfRef = rideDetailFor('r9', 10_100, { ...NOOP_DEPS, result: resSelf, ways: [userSelfRef], userWays: [userSelfRef] });
  assert(withSelfRef.promoteTarget === null, 'a ride that is already the reference must not be its own promote target');

  // Seed-owned: the SAME route object is present in `routes` (currentCatalog)
  // but absent from `userRoutes` (userCatalog) — the seed-ownership rule.
  const seedWay = mkWay({ id: 'SeedRoute', referenceRideId: 'someRide' });
  const resSeed = mkResult({ rideId: 'r10', startedAtMs: 10_200, wayId: 'SeedRoute' });
  const seedCase = rideDetailFor('r10', 10_200, { ...NOOP_DEPS, result: resSeed, ways: [seedWay], userWays: [] });
  assert(seedCase.promoteTarget === null, 'a seed-owned route (absent from userRoutes) must never be a promote target');

  const freeCase = rideDetailFor('r11', 10_300, {
    ...NOOP_DEPS,
    result: mkResult({ rideId: 'r11', startedAtMs: 10_300, wayId: null }),
    free: { kind: 'freeRide', schemaVersion: 3, rideId: 'r11', startedAtMs: 10_300, durationS: null, sportId: null },
    ways: [userA], userWays: [userA],
  });
  assert(freeCase.promoteTarget === null, 'a free ride (no routeId) has no promote target');

  const noneCase = rideDetailFor('r12', 10_400, { ...NOOP_DEPS, ways: [userA], userWays: [userA] });
  assert(noneCase.promoteTarget === null, 'no result at all -> no promote target');
});

// ---------------------------------------------------- §5.5 free-ride match

test('freerides: freeRideNear — exact id hit wins; nearest-within-tolerance otherwise; null beyond tolerance; null on empty', () => {
  const mk = (startedAtMs: number): FreeRideRecord =>
    ({ kind: 'freeRide', schemaVersion: 3, rideId: `free:${startedAtMs}`, startedAtMs, durationS: null, sportId: null });
  const records = [mk(1_000_000), mk(1_000_050), mk(2_000_000)];
  assert(freeRideNear(records, 1_000_050)?.rideId === 'free:1000050', 'exact id hit must win');
  assert(freeRideNear(records, 1_000_045)?.rideId === 'free:1000050', 'nearest within tolerance');
  assert(freeRideNear(records, 1_000_045, 2)?.rideId === undefined && freeRideNear(records, 1_000_045, 2) === null,
    'beyond a tight tolerance -> null');
  assert(freeRideNear([], 1_000_000) === null, 'empty records -> null');
});

// ===================================================== tierTextColour (virgin-cycle22 03)
function relLum(hex: string): number {
  const c = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(1) + 0.7152 * c(3) + 0.0722 * c(5);
}
function contrast(a: string, b: string): number {
  const [x, y] = [relLum(a), relLum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const TIERS = ['none', 'neutral', 'yellow', 'green', 'purple', 'est'] as const;
/** virgin-cycle27 02 FINAL (Nathan 2026-10-09): scored-tier text must clear WCAG 4.5:1 on its ground
 * EXCEPT the pairs Nathan accepted as an on-device trial after seeing them. Each exemption pins the
 * ratio it had when accepted (rounded DOWN to 0.05) so a silent drift still fails. Key: tier/theme/ground.
 * Remove a line here only when Nathan changes the palette or revokes the trial. */
const ACCEPTED_LOW_CONTRAST: Record<string, number> = {
  'purple/night/card': 2.35, // #7B3FA8 on #212127 = 2.38
  'purple/night/race.bg': 2.90, // on #0A0A0A = 2.94
  'green/night/card': 2.85, // #007A00 on #212127 = 2.89
  'green/night/race.bg': 3.55, // on #0A0A0A = 3.57
  'yellow/day/card': 1.60, // brand #F5C542 on #FFFFFF = 1.62 — Nathan: "the app yellow is better"
  'yellow/day/race.bg': 1.60, // on #FFFFFF = 1.62
  'neutral/day/race.bg': 1.60, // on #FFFFFF = 1.62 (same 2026-10-09 ruling)
  'neutral/day/card': 1.60, // 2026-10-09: no-verdict times (founding/reference ride) are the brand yellow too = 1.62 on #FFFFFF — Nathan's FINAL ruling, #B98A0A rejected
};
const themeName = (t: PaddockTheme) => (t.statusBar === 'light' ? 'night' : 'day');
function assertScoredContrast(tier: 'purple' | 'green' | 'yellow', t: PaddockTheme, ground: 'card' | 'race.bg'): void {
  const bg = ground === 'card' ? t.card : t.race.bg;
  const r = contrast(tierTextColour(tier, t), bg);
  const key = `${tier}/${themeName(t)}/${ground}`;
  const floor = ACCEPTED_LOW_CONTRAST[key] ?? 4.5;
  assert(r >= floor, `${key} ${bg}: ${r.toFixed(2)} < ${floor}${floor < 4.5 ? ' (accepted trial value drifted — palette changed?)' : ''}`);
}

test('virgin-cycle22 03: tierTextColour — a #rrggbb for every tier in both themes, never the chip ink, never a map-line API', () => {
  for (const t of [night, daylight]) {
    for (const tier of TIERS) {
      const c = tierTextColour(tier, t);
      assert(/^#[0-9A-Fa-f]{6}$/.test(c), `${tier}/${t.statusBar}: not a #rrggbb: ${c}`);
      assert(c.toUpperCase() !== PURPLE_INK.toUpperCase(), `${tier}/${t.statusBar}: PURPLE_INK is text ON a chip, never text on a card`);
    }
  }
});

test('virgin-cycle22 03 → cycle27 FINAL: tierTextColour — WCAG contrast on the card: scored tiers >= 4.5 except the dated ACCEPTED_LOW_CONTRAST exemptions; verdict-less >= 3.0, both themes', () => {
  for (const t of [night, daylight]) {
    for (const tier of ['purple', 'green', 'yellow'] as const) {
      assertScoredContrast(tier, t, 'card');
    }
    for (const tier of ['neutral', 'est', 'none'] as const) {
      const r = contrast(tierTextColour(tier, t), t.card);
      const floor = ACCEPTED_LOW_CONTRAST[`${tier}/${themeName(t)}/card`] ?? 3.0;
      assert(r >= floor, `${tier} on ${t.card}: ${r.toFixed(2)} < ${floor}`);
    }
  }
  // virgin-cycle27 02 FINAL (Nathan 2026-10-09): the yellow tier IS the brand yellow again, in both themes — inverted from the 2026-10-08 brief.
  assert(tierTextColour('yellow', daylight) === colors.neutral && tierTextColour('yellow', night) === colors.neutral && YELLOW_TIER === colors.neutral, 'yellow tier = brand yellow');
});

test('virgin-cycle27 02 FINAL: the tier palette is EXACTLY Nathan\'s picks — #7B3FA8 / #007A00 / #F5C542 (one palette, both themes; change here on purpose)', () => {
  assert(tierHex.purple === '#7B3FA8' && tierHex.green === '#007A00' && tierHex.yellow === '#F5C542', `tierHex = ${tierHex.purple} / ${tierHex.green} / ${tierHex.yellow}`);
  assert(colors.neutral === '#F5C542', 'brand yellow unchanged');
  for (const t of [night, daylight]) {
    assert(tierTextColour('purple', t) === '#7B3FA8' && tierTextColour('green', t) === '#007A00' && tierTextColour('yellow', t) === '#F5C542', `text hexes (${t.statusBar})`);
  }
  assert(tierLineColour('purple') === '#7B3FA8' && tierLineColour('green') === '#007A00' && tierLineColour('yellow') === '#F5C542', 'line hexes');
});

test('virgin-cycle27 02: both themes return the ONE palette (tierHex) for scored tiers; neutral/est follow the theme tokens', () => {
  for (const t of [night, daylight]) {
    assert(tierTextColour('purple', t) === tierHex.purple && tierTextColour('green', t) === tierHex.green && tierTextColour('yellow', t) === tierHex.yellow, `scored tiers = tierHex (${t.statusBar})`);
    assert(tierTextColour('neutral', t) === tierHex.yellow && tierTextColour('neutral', t) === colors.neutral && tierTextColour('neutral', t) !== '#B98A0A', 'neutral = brand yellow in both themes (reference ride; not the rejected daylight gold)');
    assert(tierTextColour('est', t) === t.textDim && tierTextColour('none', t) === t.textDim, 'est/none = textDim');
  }
  assert(PURPLE_TEXT_NIGHT === tierHex.purple && GREEN_TEXT_DAY === tierHex.green && YELLOW_TEXT_DAY === tierHex.yellow, 'legacy names alias the palette');
});

test('virgin-cycle27 02: tierLineColour = the same palette as the text (map line and time can never disagree); null for verdict-less tiers', () => {
  assert(tierLineColour('purple') === tierHex.purple && tierLineColour('green') === tierHex.green && tierLineColour('yellow') === tierHex.yellow && tierLineColour('yellow') === colors.neutral, 'line colours (yellow = brand)');
  assert(tierLineColour('neutral') === null && tierLineColour('est') === null && tierLineColour('none') === null, 'no line colour without a verdict');
});

test('virgin-cycle22 04: the flash colour per tier x theme on the RACE ground (race.bg), pinned — what Nathan should see at each gate and at the finish', () => {
  // cycle27 FINAL: one palette both themes; the low night values are listed exemptions.
  for (const t of [night, daylight]) for (const tier of ['purple', 'green', 'yellow'] as const) assert(tierTextColour(tier, t) === tierHex[tier], `${tier} flash = tierHex`);
  for (const t of [night, daylight]) {
    for (const tier of ['purple', 'green', 'yellow'] as const) {
      assertScoredContrast(tier, t, 'race.bg');
    }
    for (const tier of ['neutral', 'est', 'none'] as const) {
      const r = contrast(tierTextColour(tier, t), t.race.bg);
      const fl = ACCEPTED_LOW_CONTRAST[`${tier}/${themeName(t)}/race.bg`] ?? 3.0;
      assert(r >= fl, `${tier} flash (92 px, large text) on ${t.race.bg}: ${r.toFixed(2)} < ${fl}`);
    }
    // a flash is always a shade off the clock's ink, never the same colour as the ticking digits
    for (const tier of TIERS) assert(tierTextColour(tier, t) !== t.text, `${tier} flash must not be the clock ink ${t.text}`);
  }
});

test('virgin-cycle27 02: the palette is single-source — colors.purple/green alias tierHex, no stray tier hex outside theme.ts', () => {
  assert(colors.purple === tierHex.purple && colors.green === tierHex.green, 'aliases');
  assert(colors.neutral === '#F5C542', 'brand yellow unchanged');
  const tc = nodeFs.readFileSync(fileURLToPath(new URL('../src/ui/tierColour.ts', import.meta.url).href), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  assert(!/#[0-9A-Fa-f]{6}/.test(tc), 'tierColour.ts carries no hex of its own');
  assert(tierHex.yellow === colors.neutral, 'tierHex.yellow and colors.neutral are the one BRAND_YELLOW literal');
});

test('virgin-cycle27 02 FINAL: filled purple chips take WHITE ink in both themes (chips.tsx PURPLE_INK = colors.white) — #120521 would be 2.92:1 on #7B3FA8', () => {
  const chips = nodeFs.readFileSync(fileURLToPath(new URL('../src/ui/chips.tsx', import.meta.url).href), 'utf8');
  assert(chips.includes('export const PURPLE_INK = colors.white;'), 'PURPLE_INK is colors.white');
  assert(!chips.includes("'#120521'"), 'the near-black ink literal is gone');
  assert(contrast('#FFFFFF', tierHex.purple) >= 4.5, `white on the purple fill: ${contrast('#FFFFFF', tierHex.purple).toFixed(2)}`);
  assert(contrast(PURPLE_INK, tierHex.purple) >= 4.5, 'the mirrored ink constant clears 4.5 on the fill');
});

test('virgin-cycle23 03: sectorHighlightColours — only the selected sector carries the colour, gate-indexed, slot 0 never', () => {
  const rows = [{ index: 1 }, { index: 2 }, { index: 3 }, { index: 4 }];
  assert(JSON.stringify(sectorHighlightColours(rows, 2, 'X')) === JSON.stringify([null, null, 'X', null, null]), 'sector 2 only');
  assert(sectorHighlightColours(rows, 2, 'X').length === 5, 'length = last index + 1');
  const last = sectorHighlightColours(rows, 4, 'X');
  assert(last.length === 5 && last[4] === 'X' && last.slice(0, 4).every((c) => c === null), 'sector 4 only');
  const zero = sectorHighlightColours(rows, 0, 'X');
  assert(zero.length === 5 && zero.every((c) => c === null), 'selected 0 highlights nothing');
  const out = sectorHighlightColours(rows, 9, 'X');
  assert(out.length === 5 && out.every((c) => c === null), 'selected out of range highlights nothing');
});

test('virgin-cycle23 03: sectorHighlightColours — null selection = [] so the caller falls back to the verdict colours', () => {
  assert(sectorHighlightColours([{ index: 1 }, { index: 2 }], null, 'X').length === 0, 'empty when nothing is selected');
});

test('virgin-cycle27 02 FINAL (neutral fix): a reference/no-verdict time is the brand yellow in BOTH themes; no time site reads accentText or #B98A0A', () => {
  for (const t of [night, daylight]) {
    assert(tierTextColour('neutral', t) === '#F5C542' && tierTextColour('neutral', t) !== '#B98A0A', `neutral = brand yellow (${themeName(t)})`);
  }
  const rd = nodeFs.readFileSync(fileURLToPath(new URL('../src/ui/RideDetailScreen.tsx', import.meta.url).href), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  assert(!rd.includes('accentText'), 'RideDetailScreen: no time reads accentText');
  assert((rd.match(/tierTextColour\('neutral', t\)/g) ?? []).length === 4, 'the four durationLabel sites use tierTextColour(neutral)');
  const ch = nodeFs.readFileSync(fileURLToPath(new URL('../src/ui/chips.tsx', import.meta.url).href), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  assert(!ch.includes('accentText'), 'chips: neutral chip text is no longer accentText');
});
