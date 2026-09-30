/**
 * virgin-cycle18 brief 05: store/placeSearch.ts — the shared place-picker
 * model (placeOptions, matchingPlaces, newPlaceNameError, placeByLabel).
 * Pure, JSON-free import chain: no registerHooks shim needed.
 */
import { assert, test } from './lib.ts';
import { emptyCatalog } from '../src/store/catalog.ts';
import {
  effectiveEndpointId, endpointOptions, matchingPlaces, newPlaceNameError, placeByLabel, placeOptions, type PlaceOption,
} from '../src/store/placeSearch.ts';
import type { Catalog, Landmark, Route } from '../src/store/types.ts';

function place(id: string, label: string, lat = 50.87, lon = 4.7): Landmark {
  return { id, label, lat, lon, radiusM: 120, activeFromMs: 0, activeUntilMs: null, offerAtStart: true };
}
function route(id: string, s: string, e: string): Route {
  return { id, startLandmarkId: s, endLandmarkId: e, wayIds: [] };
}
function cat(landmarks: Landmark[], routes: Route[] = []): Catalog {
  const c = emptyCatalog();
  c.landmarks = landmarks;
  c.routes = routes;
  return c;
}
function opt(id: string, label: string): PlaceOption {
  return { id, label, detail: '', usage: 0 };
}

test('c18-05 ps1: placeOptions — most-used first, ties keep catalog order, detail counts touching routes', () => {
  const c = cat([place('A', 'A'), place('B', 'B'), place('C', 'C')], [route('r1', 'A', 'B'), route('r2', 'B', 'C')]);
  const opts = placeOptions(c, new Map([['B', 5], ['C', 1]]));
  assert(opts.map((o) => o.id).join(',') === 'B,C,A', `expected B,C,A got ${opts.map((o) => o.id).join(',')}`);
  assert(opts[0].detail === '2 routes' && opts[1].detail === '1 route' && opts[2].detail === '1 route',
    `details: ${opts.map((o) => o.detail).join(' | ')}`);
  const ex = placeOptions(c, new Map([['B', 5], ['C', 1]]), { exclude: ['B'] });
  assert(ex.map((o) => o.id).join(',') === 'C,A', `exclude B: got ${ex.map((o) => o.id).join(',')}`);
});

test('c18-05 ps2: two places with one label get their coordinates in detail', () => {
  const c = cat([place('w1', 'Work', 50.9, 4.7), place('w2', 'work ', 50.9025, 4.7), place('h', 'Home', 50.87, 4.7)]);
  const opts = placeOptions(c, new Map());
  const byId = (id: string) => opts.find((o) => o.id === id)!;
  assert(byId('w1').detail.endsWith(' · 50.90000, 4.70000'), `w1 detail: ${byId('w1').detail}`);
  assert(byId('w2').detail.endsWith(' · 50.90250, 4.70000'), `w2 detail: ${byId('w2').detail}`);
  assert(!byId('h').detail.includes('·'), `Home must not carry coordinates: ${byId('h').detail}`);
});

test('c18-05 ps3: matchingPlaces — empty → [], starts-with before contains, case-insensitive, capped', () => {
  const options = [opt('1', 'Work'), opt('2', 'Workshop'), opt('3', 'Homework'), opt('4', 'Home')];
  const labels = (xs: PlaceOption[]) => xs.map((o) => o.label).join(',');
  assert(labels(matchingPlaces(options, 'wo')) === 'Work,Workshop,Homework', labels(matchingPlaces(options, 'wo')));
  assert(labels(matchingPlaces(options, 'WORK')) === 'Work,Workshop,Homework', labels(matchingPlaces(options, 'WORK')));
  assert(matchingPlaces(options, '').length === 0, 'empty typed text proposes nothing');
  assert(labels(matchingPlaces(options, 'wo', 1)) === 'Work', labels(matchingPlaces(options, 'wo', 1)));
});

test('c18-05 ps4: newPlaceNameError — taken (any case/space), same as other new name, else null; placeByLabel', () => {
  const labels = ['Work', 'Home'];
  const e1 = newPlaceNameError(labels, ' work ', null);
  assert(e1 !== null && e1.includes('"Work"'), `taken name must be refused naming "Work", got ${e1}`);
  assert(newPlaceNameError(labels, 'Store', 'store') === 'start and end cannot share a name', 'shared new name');
  assert(newPlaceNameError(labels, 'Store', 'Home') === null, 'other endpoint own check reports Home');
  assert(newPlaceNameError(labels, '', null) === null, 'empty is the caller rule');
  const c = cat([place('w', 'Work'), place('h', 'Home')]);
  assert(placeByLabel(c, 'WORK')?.id === 'w', 'placeByLabel is case-insensitive');
  assert(placeByLabel(c, 'WORK', 'w') === null, 'exceptId lets a place keep its own name');
});

test('c18-06 ps5: endpointOptions puts the START pick first (copy, not the input); effectiveEndpointId = proposal until touched', () => {
  const o = (id: string) => ({ id, label: id, detail: '', usage: 0 });
  const opts = [o('a'), o('b'), o('c')];
  const same = endpointOptions(opts, null);
  assert(same.map((x) => x.id).join(',') === 'a,b,c' && same !== opts, 'null pick: same order, new array');
  assert(endpointOptions(opts, 'c').map((x) => x.id).join(',') === 'c,a,b', 'pick moved first');
  assert(endpointOptions(opts, 'zz').map((x) => x.id).join(',') === 'a,b,c', 'unknown pick ignored');
  assert(opts.map((x) => x.id).join(',') === 'a,b,c', 'input not mutated');
  assert(effectiveEndpointId('a', { kind: 'proposed' }) === 'a', 'proposal until touched');
  assert(effectiveEndpointId('a', { kind: 'existing', landmarkId: 'b' }) === 'b', 'a touch wins');
  assert(effectiveEndpointId(null, { kind: 'proposed' }) === null, 'new, unnamed place');
});
