/**
 * QA — WP-G route specifications/variants: store/routeSpecs.ts (pure spec
 * grouping + suggestion helpers) and the defaultRoute.ts label functions
 * WP-G touched. Registered in tests/run.ts after waycreation_suite.ts.
 */
import { assert, test } from './lib.ts';
import {
  PLAIN_SPEC_LABEL,
  hasSpecs,
  specPickRows,
  specSuggestions,
  specVocabulary,
  type SpecPickRow,
} from '../src/store/routeSpecs.ts';
import { isUserMintedRouteId, routeLabel, routeLabelIn, routeVariantLabel } from '../src/store/defaultRoute.ts';
import { emptyCatalog } from '../src/store/catalog.ts';
import type { Catalog, Route, Way } from '../src/store/types.ts';

interface R { id: string; specs?: string[] }
const A: R = { id: 'A', specs: ['Dry', 'Fast'] };
const B: R = { id: 'B', specs: ['Dry', 'Slow'] };
const C: R = { id: 'C', specs: ['Wet'] };
const P: R = { id: 'P' }; // no specs
const D: R = { id: 'D', specs: ['Dry'] };
const first = <T,>(s: T[]): T | null => s[0] ?? null;

function depths(rows: SpecPickRow<R>[]): number[] {
  return rows.map((r) => r.depth);
}
function optIds(row: SpecPickRow<R> | undefined): { id: string; on: boolean }[] {
  return (row?.options ?? []).map((o) => ({ id: o.route.id, on: o.on }));
}

test('WP-G routespec 1: hasSpecs', () => {
  assert(hasSpecs([P]) === false, '[P] => false');
  assert(hasSpecs([P, C]) === true, '[P,C] => true (C has a spec)');
  assert(hasSpecs([]) === false, '[] => false');
});

test('WP-G routespec 2: flat two-way fork', () => {
  const E: R = { id: 'E', specs: ['Dry'] };
  const rows = specPickRows([C, E], 'C', first);
  assert(rows.length === 1 && rows[0].depth === 0, 'one row, depth 0');
  const opts = rows[0].options;
  assert(opts.length === 2, 'two options');
  assert(opts[0].label === 'Wet' && opts[0].route.id === 'C' && opts[0].on === true, 'Wet (C) on, first-appearance order');
  assert(opts[1].label === 'Dry' && opts[1].route.id === 'E' && opts[1].on === false, 'Dry (E) off');
  assert(!opts.some((o) => o.label === PLAIN_SPEC_LABEL), 'no plain option — both routes carry a spec');
});

test('WP-G routespec 3: two-level fork', () => {
  const pickedA = specPickRows([A, B, C], 'A', first);
  assert(JSON.stringify(depths(pickedA)) === JSON.stringify([0, 1]), 'picked A: rows at depth 0 and 1');
  assert(JSON.stringify(optIds(pickedA[0])) === JSON.stringify([{ id: 'A', on: true }, { id: 'C', on: false }]),
    'picked A, depth 0: Dry(on,A) Wet(C)');
  assert(JSON.stringify(optIds(pickedA[1])) === JSON.stringify([{ id: 'A', on: true }, { id: 'B', on: false }]),
    'picked A, depth 1: Fast(on,A) Slow(B)');

  const pickedC = specPickRows([A, B, C], 'C', first);
  assert(JSON.stringify(depths(pickedC)) === JSON.stringify([0]), 'picked C: ONLY depth 0 (C has no depth-1 segment)');
  assert(JSON.stringify(optIds(pickedC[0])) === JSON.stringify([{ id: 'A', on: false }, { id: 'C', on: true }]),
    'picked C, depth 0: Dry(->pickWithin([A,B])=A) Wet(on,C)');

  const pickedB = specPickRows([A, B, C], 'B', first);
  const row1 = pickedB.find((r) => r.depth === 1);
  assert(JSON.stringify(optIds(row1)) === JSON.stringify([{ id: 'A', on: false }, { id: 'B', on: true }]),
    'picked B, row 1: Fast(A) Slow(on,B)');
});

test('WP-G routespec 4: shared first segment is skipped — single row at depth 1', () => {
  const rows = specPickRows([A, B], 'A', first);
  assert(JSON.stringify(depths(rows)) === JSON.stringify([1]), 'no depth-0 row (both share Dry): only depth 1');
  assert(JSON.stringify(optIds(rows[0])) === JSON.stringify([{ id: 'A', on: true }, { id: 'B', on: false }]),
    'Fast(on,A) Slow(B)');
});

test('WP-G routespec 5: plain beside variants', () => {
  const pickedP = specPickRows([P, C], 'P', first);
  assert(JSON.stringify(depths(pickedP)) === JSON.stringify([0]), 'one row at depth 0');
  assert(pickedP[0].options[0].label === PLAIN_SPEC_LABEL && pickedP[0].options[0].on === true, 'plain (P) on, listed first');
  assert(pickedP[0].options[1].label === 'Wet' && pickedP[0].options[1].route.id === 'C', 'Wet (C) second');

  const pickedD = specPickRows([D, A], 'D', first);
  assert(JSON.stringify(depths(pickedD)) === JSON.stringify([1]), 'no depth-0 row (single group "dry"), then depth 1');
  assert(JSON.stringify(optIds(pickedD[0])) === JSON.stringify([{ id: 'D', on: true }, { id: 'A', on: false }]),
    'depth 1: plain(on,D) Fast(A)');

  const pickedA2 = specPickRows([D, A], 'A', first);
  assert(JSON.stringify(optIds(pickedA2[0])) === JSON.stringify([{ id: 'D', on: false }, { id: 'A', on: true }]),
    'depth 1: plain(D) Fast(on,A)');
});

test('WP-G routespec 6: case-insensitive grouping keeps first-used casing', () => {
  const x: R = { id: 'x', specs: ['dry'] };
  const y: R = { id: 'y', specs: ['Dry', 'Fast'] };
  const pickedX = specPickRows([x, y], 'x', first);
  assert(JSON.stringify(depths(pickedX)) === JSON.stringify([1]), 'no depth-0 row: dry/Dry merge case-insensitively');
  assert(JSON.stringify(optIds(pickedX[0])) === JSON.stringify([{ id: 'x', on: true }, { id: 'y', on: false }]),
    'depth 1: plain(on,x) Fast(y)');
  // A merged group's label is the FIRST route's own casing (x is first in [x,y]).
  const pickedY = specPickRows([x, y], 'y', first);
  const merged = pickedY.find((r) => r.depth === 0);
  assert(merged === undefined, 'still no depth-0 row for picked y (same merged group)');
});

test('WP-G routespec 7: unknown pick falls back to pickWithin; pickWithin returning null => []', () => {
  const viaNope = specPickRows([A, B, C], 'nope', first);
  const viaA = specPickRows([A, B, C], 'A', first);
  assert(JSON.stringify(viaNope) === JSON.stringify(viaA), 'unknown id falls back to pickWithin(all) = first = A, same rows as picked A');
  const none = specPickRows([A, B, C], 'nope', () => null);
  assert(JSON.stringify(none) === JSON.stringify([]), 'pickWithin returning null => []');
});

test('WP-G routespec 8: degenerate — one route => []; pickWithin never called for the on group', () => {
  assert(JSON.stringify(specPickRows([A], 'A', first)) === JSON.stringify([]), 'one route: []');
  let calls = 0;
  const counting = (s: R[]): R | null => { calls++; return first(s); };
  specPickRows([A, B, C], 'A', counting);
  // Every emitted option group either contains the picked route (on: true,
  // route: picked — pickWithin not called) or does not (pickWithin called).
  // picked A: depth0 groups are [A,B] (on, no call) and [C] (off, 1 call);
  // depth1 groups are [A] (on, no call) and [B] (off, 1 call) => 2 calls.
  assert(calls === 2, `pickWithin must be called only for the OFF groups, got ${calls} calls`);
});

test('WP-G routespec 9: specSuggestions', () => {
  const wayLists = [['Dry', 'Fast'], ['Dry', 'Slow'], ['Wet']];
  const vocabulary = ['Dry', 'Fast', 'Slow', 'Wet', 'Alt'];
  assert(JSON.stringify(specSuggestions(wayLists, vocabulary, [])) === JSON.stringify(['Dry', 'Wet', 'Fast', 'Slow', 'Alt']),
    'typed=[]: this-way position-0 values first (Dry, Wet), then the rest of the vocabulary, deduped');
  assert(JSON.stringify(specSuggestions(wayLists, vocabulary, ['Dry'])) === JSON.stringify(['Fast', 'Slow', 'Wet', 'Alt']),
    'typed=[Dry]: Dry excluded; Fast/Slow are the prefix-matching continuations, then the rest');
  assert(JSON.stringify(specSuggestions(wayLists, vocabulary, ['dry'])) === JSON.stringify(['Fast', 'Slow', 'Wet', 'Alt']),
    'typed matches case-insensitively');
  assert(JSON.stringify(specSuggestions(wayLists, vocabulary, [], 2)) === JSON.stringify(['Dry', 'Wet']),
    'max truncates');
});

test('WP-G routespec 10: specVocabulary', () => {
  const routes: R[] = [{ id: 'x', specs: ['Dry', 'Fast'] }, { id: 'y', specs: ['dry'] }, { id: 'z', specs: ['Wet'] }, P];
  assert(JSON.stringify(specVocabulary(routes)) === JSON.stringify(['Dry', 'Fast', 'Wet']),
    'first-used casing, catalog order, dedupe (Dry/dry collapse to Dry)');
});

test('WP-G routespec 11: labels — routeVariantLabel / routeLabelIn', () => {
  const way = { startLandmarkId: 'home', endLandmarkId: 'work' };
  assert(routeVariantLabel('route:x', way, ['Dry', 'Fast']) === 'Dry · Fast', 'specs join with the app separator');
  assert(routeVariantLabel('route:x', way) === PLAIN_SPEC_LABEL, 'no specs, user-minted id => plain');
  assert(routeVariantLabel('Morning', way) === 'Dry', 'a seed id keeps its existing derived label, unchanged');
  assert(isUserMintedRouteId('route:2026090109') === true, 'route: prefix is user-minted');
  assert(isUserMintedRouteId('Morning') === false, 'a seed id is not');

  const homeWorkWayId = 'home>work';
  const seedWay: Way = { id: homeWorkWayId, startLandmarkId: 'home', endLandmarkId: 'work', routeIds: ['Morning'] };
  const seedRoute: Route = { id: 'Morning', wayId: homeWorkWayId, refLineId: 'Morning', gateSetVersion: 1, seeded: true };
  const seedCat: Catalog = { ...emptyCatalog(), landmarks: [
    { id: 'home', label: 'Home', lat: 0, lon: 0, radiusM: 1, activeFromMs: 0, activeUntilMs: null, offerAtStart: true },
    { id: 'work', label: 'Work', lat: 0, lon: 0, radiusM: 1, activeFromMs: 0, activeUntilMs: null, offerAtStart: true },
  ], ways: [seedWay], routes: [seedRoute] };
  assert(routeLabelIn(seedCat, 'Morning') === routeLabel('Morning'), 'a seed id: routeLabelIn is byte-identical to routeLabel');

  const userRoute: Route = { id: 'route:x', wayId: homeWorkWayId, refLineId: 'route:x', gateSetVersion: 1, seeded: false, specs: ['Dry', 'Fast'] };
  const userRoutePlain: Route = { id: 'route:y', wayId: homeWorkWayId, refLineId: 'route:y', gateSetVersion: 1, seeded: false };
  const userCat: Catalog = { ...seedCat, routes: [...seedCat.routes, userRoute, userRoutePlain] };
  assert(routeLabelIn(userCat, 'route:x') === 'Home → Work · Dry · Fast', 'user-minted route with specs: way + specs');
  assert(routeLabelIn(userCat, 'route:y') === 'Home → Work', 'user-minted route without specs: just the way');
  assert(routeLabelIn(userCat, 'route:not-there') === routeLabel('route:not-there'), 'unknown id: falls back to routeLabel byte-identical');
});
