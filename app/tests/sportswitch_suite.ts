/**
 * QA — WP-1 (2026-09-06, C1/C6): afterSportSwitch — RECORD's reset rule when
 * the rider taps a different sport pill, pinned rather than eyeballed.
 */
import { test, assert } from './lib.ts';
import { emptyCatalog } from '../src/store/catalog.ts';
import type { Landmark } from '../src/store/types.ts';
import { afterSportSwitch } from '../src/store/sportSwitch.ts';

function lm(id: string, offerAtStart = true): Landmark {
  return { id, label: id, lat: 0, lon: 0, radiusM: 100, activeFromMs: 0, activeUntilMs: null, offerAtStart };
}

test('WP-1 sportSwitch: afterSportSwitch mirrors defaultEndpoints and always clears the way pick', () => {
  const c = emptyCatalog();
  c.landmarks = [lm('a'), lm('b'), lm('c')];
  const reset = afterSportSwitch(c);
  assert(reset.from === 'a' && reset.to === 'b', `from/to must be the first two offerable landmarks, got ${reset.from}/${reset.to}`);
  assert(reset.wayPick === null, 'the way pick is always cleared on a sport switch');
});

test('WP-1 sportSwitch: an empty (new sport, no routes yet) scoped catalog resets to new>>new', () => {
  const reset = afterSportSwitch(emptyCatalog());
  assert(reset.from === null && reset.to === null, 'no landmarks at all => null/null, the free-ride default');
  assert(reset.wayPick === null, 'way pick cleared here too');
});
