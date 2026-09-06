/**
 * QA — WP-1 (2026-09-06): user-defined sports, pure module (store/sports.ts).
 * Locks the zero-seed design (Q1): emptySports() is the only starting state,
 * scopeCatalog is identity under a null sportId, and the §3.4 fallback rule
 * (unstamped/unknown-sport data belongs to sports[0]) holds everywhere.
 */
import { test, assert } from './lib.ts';
import { emptyCatalog } from '../src/store/catalog.ts';
import type { Catalog, GateSet, Landmark, Route, Way } from '../src/store/types.ts';
import {
  addSport, decodeSports, deleteSport, effectiveRideSportId, effectiveSportId,
  emptySports, encodeSports, renameSport, scopeCatalog, setActiveSport,
  showSportPillRow, sportUsage, validateSports, wayIdsOfSport,
  type SportsFile,
} from '../src/store/sports.ts';

function lm(id: string, lat: number, lon: number): Landmark {
  return { id, label: id, lat, lon, radiusM: 100, activeFromMs: 0, activeUntilMs: null, offerAtStart: true };
}

/** A minimal Home->Work route + one way + one gate set, optionally sport-stamped. */
function routeFixture(idSuffix: string, sportId?: string): { route: Route; way: Way; gateSet: GateSet } {
  const wayId = `way:${idSuffix}`;
  const routeId = `route:${idSuffix}`;
  const route: Route = {
    id: routeId, startLandmarkId: 'home', endLandmarkId: 'work', wayIds: [wayId],
    ...(sportId !== undefined ? { sportId } : {}),
  };
  const way: Way = { id: wayId, routeId, refLineId: wayId, gateSetVersion: 1, seeded: false };
  const gateSet: GateSet = { wayId, version: 1, chainageM: [10, 100, 500], createdAtMs: 0 };
  return { route, way, gateSet };
}

function catalogOf(entries: { route: Route; way: Way; gateSet: GateSet }[]): Catalog {
  const c = emptyCatalog();
  c.landmarks = [lm('home', 50.0, 4.0), lm('work', 50.1, 4.1)];
  c.routes = entries.map((e) => e.route);
  c.ways = entries.map((e) => e.way);
  c.gateSets = entries.map((e) => e.gateSet);
  return c;
}

function sportsOf(...labels: string[]): SportsFile {
  let f = emptySports();
  labels.forEach((label, i) => {
    const next = addSport(f, label, 1000 + i);
    assert(!Array.isArray(next), `addSport('${label}') failed: ${JSON.stringify(next)}`);
    f = next as SportsFile;
  });
  return f;
}

// -------------------------------------------------------------- 1. emptySports

test('WP-1 sports 1: emptySports() validates; zero sports; active null', () => {
  const f = emptySports();
  assert(f.sports.length === 0, 'zero sports on a fresh file');
  assert(f.activeSportId === null, 'active is null with zero sports');
  assert(validateSports(f).length === 0, `emptySports() must validate: ${validateSports(f).join('; ')}`);
});

// -------------------------------------------------------------- 2. encode/decode

test('WP-1 sports 2: encode/decode round-trip byte-stable; decodeSports null on garbage/missing arrays', () => {
  const f = sportsOf('Bike', 'Run');
  const text = encodeSports(f);
  assert(text.endsWith('\n'), 'encodeSports newline-terminated, like encodeCatalog');
  const decoded = decodeSports(text);
  assert(decoded !== null, 'a valid file decodes');
  assert(JSON.stringify(decoded) === JSON.stringify(f), 'round-trip is byte-stable (structurally)');
  assert(encodeSports(decoded!) === text, 're-encoding the decoded file reproduces the same text');

  assert(decodeSports('not json') === null, 'garbage text -> null');
  assert(decodeSports('{}') === null, 'missing sports array -> null');
  assert(decodeSports('{"schemaVersion":1,"sports":"nope","activeSportId":null}') === null,
    'non-array sports -> null');
  assert(decodeSports('{"schemaVersion":1,"sports":[{"id":1}],"activeSportId":null}') === null,
    'a malformed sport entry -> null');
});

// -------------------------------------------------------------- 3. validateSports

test('WP-1 sports 3: validateSports rejects the documented shapes', () => {
  const dup: SportsFile = {
    schemaVersion: 1,
    sports: [{ id: 's1', label: 'Bike', createdAtMs: 0 }, { id: 's1', label: 'Run', createdAtMs: 1 }],
    activeSportId: 's1',
  };
  assert(validateSports(dup).some((e) => e.includes('duplicate') && e.includes('id')), 'duplicate id rejected');

  const dupLabel: SportsFile = {
    schemaVersion: 1,
    sports: [{ id: 's1', label: 'Bike', createdAtMs: 0 }, { id: 's2', label: ' bike ', createdAtMs: 1 }],
    activeSportId: 's1',
  };
  assert(validateSports(dupLabel).some((e) => e.toLowerCase().includes('label')),
    'labels differing only by case/whitespace rejected');

  const tooLong: SportsFile = {
    schemaVersion: 1,
    sports: [{ id: 's1', label: 'x'.repeat(25), createdAtMs: 0 }],
    activeSportId: 's1',
  };
  assert(validateSports(tooLong).length > 0, 'a 25-char label is rejected (max 24)');

  const unknownActive: SportsFile = {
    schemaVersion: 1,
    sports: [{ id: 's1', label: 'Bike', createdAtMs: 0 }],
    activeSportId: 'nope',
  };
  assert(validateSports(unknownActive).some((e) => e.includes('nope')), 'unknown activeSportId rejected');

  const nonNullActiveEmpty: SportsFile = { schemaVersion: 1, sports: [], activeSportId: 's1' };
  assert(validateSports(nonNullActiveEmpty).length > 0, 'non-null active with an empty list rejected');

  const nullActiveNonEmpty: SportsFile = {
    schemaVersion: 1,
    sports: [{ id: 's1', label: 'Bike', createdAtMs: 0 }],
    activeSportId: null,
  };
  assert(validateSports(nullActiveNonEmpty).length > 0, 'null active with a non-empty list rejected');
});

// -------------------------------------------------------------- 4. scopeCatalog

test('WP-1 sports 4: scopeCatalog partitions routes/ways/gate sets by sport; shares landmarks; identity under null', () => {
  const f: SportsFile = {
    schemaVersion: 1,
    sports: [{ id: 'sport:1', label: 'Bike', createdAtMs: 1000 }, { id: 'sport:2', label: 'Run', createdAtMs: 1001 }],
    activeSportId: 'sport:1',
  };
  const bike = routeFixture('bike', 'sport:1');
  const run = routeFixture('run', 'sport:2');
  const c = catalogOf([bike, run]);

  assert(scopeCatalog(c, null, f) === c, 'null sportId is the identity — same object, not just equal');

  const bikeScope = scopeCatalog(c, 'sport:1', f);
  assert(bikeScope.landmarks.length === 2, 'landmarks are shared — both present under sport:1');
  assert(bikeScope.routes.length === 1 && bikeScope.routes[0].id === bike.route.id, 'sport:1 sees only its own route');
  assert(bikeScope.ways.length === 1 && bikeScope.ways[0].id === bike.way.id, 'sport:1 sees only its own way');
  assert(bikeScope.gateSets.length === 1 && bikeScope.gateSets[0].wayId === bike.way.id, 'sport:1 sees only its own gate set');

  const runScope = scopeCatalog(c, 'sport:2', f);
  assert(runScope.landmarks.length === 2, 'landmarks are shared — both present under sport:2 too');
  assert(runScope.routes.length === 1 && runScope.routes[0].id === run.route.id, 'sport:2 sees only its own route');
  assert(runScope.ways.length === 1 && runScope.ways[0].id === run.way.id, 'sport:2 sees only its own way');

  // An unstamped route falls back to sports[0] ('sport:1', Bike) — and does
  // NOT also show up under sport:2.
  const unstamped = routeFixture('legacy');
  const withLegacy = catalogOf([unstamped]);
  const legacyBikeScope = scopeCatalog(withLegacy, 'sport:1', f);
  assert(legacyBikeScope.routes.length === 1 && legacyBikeScope.routes[0].id === unstamped.route.id,
    'an unstamped route lands in sports[0] (the fallback rule)');
  const legacyRunScope = scopeCatalog(withLegacy, 'sport:2', f);
  assert(legacyRunScope.routes.length === 0, 'the unstamped route does NOT also show under sport:2');
});

// -------------------------------------------------------------- 5. effectiveSportId / wayIdsOfSport

test('WP-1 sports 5: effectiveSportId falls back to the first sport; wayIdsOfSport(null) is null (unfiltered)', () => {
  const f = sportsOf('Bike', 'Run');
  const bikeId = f.sports[0].id;
  const { route: stamped } = routeFixture('a', 'no-such-sport');
  assert(effectiveSportId(stamped, f) === bikeId, 'an unknown sportId falls back to the first sport');
  const { route: clean } = routeFixture('b');
  assert(effectiveSportId(clean, f) === bikeId, 'no sportId at all falls back to the first sport too');

  const empty = emptySports();
  assert(effectiveSportId(clean, empty) === null, 'with zero sports, the fallback is null');

  const c = catalogOf([routeFixture('c', bikeId)]);
  assert(wayIdsOfSport(c, null, f) === null, 'wayIdsOfSport(..., null, ...) is null — "unfiltered", not "empty"');
  const ids = wayIdsOfSport(c, bikeId, f);
  assert(ids !== null && ids.size === 1, 'wayIdsOfSport(..., bikeId, ...) returns the one way under that sport');
});

// -------------------------------------------------------------- 6. addSport / deleteSport / renameSport

test('WP-1 sports 6: addSport sets active only when the list was empty; unique ids at equal nowMs; delete/rename rules', () => {
  const first = addSport(emptySports(), 'Bike', 5000);
  assert(!Array.isArray(first), `first addSport failed: ${JSON.stringify(first)}`);
  const f1 = first as SportsFile;
  assert(f1.activeSportId === f1.sports[0].id, 'the first sport becomes active automatically');

  const second = addSport(f1, 'Run', 5000); // same nowMs as the first
  assert(!Array.isArray(second), `second addSport failed: ${JSON.stringify(second)}`);
  const f2 = second as SportsFile;
  assert(f2.activeSportId === f1.activeSportId, 'a second addSport leaves the active sport alone');
  assert(f2.sports[0].id !== f2.sports[1].id, 'equal nowMs still mints two distinct ids');
  assert(new Set(f2.sports.map((s) => s.id)).size === 2, 'ids are unique');

  // deleteSport: refuses when used, refuses when active, allows otherwise.
  const usedRefusal = deleteSport(f2, f2.sports[0].id, { routes: 1, ways: 1, rides: 0 });
  assert(Array.isArray(usedRefusal), 'deleteSport refuses a sport that owns a route');
  const activeRefusal = deleteSport(f2, f2.activeSportId!, { routes: 0, ways: 0, rides: 0 });
  assert(Array.isArray(activeRefusal), 'deleteSport refuses the active sport even when unused');
  const ok = deleteSport(f2, f2.sports[1].id, { routes: 0, ways: 0, rides: 0 });
  assert(!Array.isArray(ok), `deleteSport must allow an unused, non-active sport: ${JSON.stringify(ok)}`);
  assert((ok as SportsFile).sports.length === 1, 'the sport is actually gone');

  // renameSport: keeps the id, rejects a duplicate label.
  const renamed = renameSport(f2, f2.sports[1].id, 'E-bike');
  assert(!Array.isArray(renamed), `renameSport failed: ${JSON.stringify(renamed)}`);
  const rf = renamed as SportsFile;
  assert(rf.sports[1].id === f2.sports[1].id, 'rename keeps the id');
  assert(rf.sports[1].label === 'E-bike', 'rename changes the label');
  const dupRename = renameSport(f2, f2.sports[1].id, f2.sports[0].label);
  assert(Array.isArray(dupRename), 'renameSport rejects a duplicate (case-insensitive) label');

  // setActiveSport: refuses an unknown id, otherwise flips the global.
  const switched = setActiveSport(f2, f2.sports[1].id);
  assert(!Array.isArray(switched), `setActiveSport failed: ${JSON.stringify(switched)}`);
  assert((switched as SportsFile).activeSportId === f2.sports[1].id, 'active sport switched');
  assert(Array.isArray(setActiveSport(f2, 'no-such-id')), 'setActiveSport refuses an unknown id');
});

// -------------------------------------------------------------- 7. sportUsage

test('WP-1 sports 7: sportUsage counts fallback-unstamped routes and rides', () => {
  const f = sportsOf('Bike', 'Run');
  const bikeId = f.sports[0].id;
  const stamped = routeFixture('a', bikeId);
  const unstamped = routeFixture('b'); // falls back to sports[0] = Bike
  const c = catalogOf([stamped, unstamped]);
  const rides = [{ sportId: bikeId }, {}, { sportId: 'no-such-sport' }];
  const usage = sportUsage(c, rides, bikeId, f);
  assert(usage.routes === 2, `Bike absorbs both the stamped and the unstamped route: got ${usage.routes}`);
  assert(usage.ways === 2, `both routes' ways count too: got ${usage.ways}`);
  assert(usage.rides === 3, `all three rides fall back to Bike (stamped/absent/unknown): got ${usage.rides}`);

  const runId = f.sports[1].id;
  const runUsage = sportUsage(c, rides, runId, f);
  assert(runUsage.routes === 0 && runUsage.rides === 0, 'Run owns nothing — fallback never leaks to a non-first sport');
});

// -------------------------------------------------------------- 8. showSportPillRow (Q3)

test('WP-1 sports 8: showSportPillRow is 2+ sports AND the setting, nothing else', () => {
  assert(showSportPillRow(0, true) === false, '0 sports: never shown');
  assert(showSportPillRow(1, true) === false, '1 sport: never shown, even with the setting on');
  assert(showSportPillRow(2, false) === false, '2 sports, setting off: hidden');
  assert(showSportPillRow(2, true) === true, '2 sports, setting on: shown');
  assert(showSportPillRow(5, true) === true, '5 sports, setting on: shown');
});

// -------------------------------------------------------------- 9. effectiveRideSportId

test('WP-1 sports 9: effectiveRideSportId mirrors effectiveSportId\'s fallback for a ride stamp', () => {
  const f = sportsOf('Bike', 'Run');
  const bikeId = f.sports[0].id;
  assert(effectiveRideSportId(bikeId, f) === bikeId, 'a known sportId is itself');
  assert(effectiveRideSportId('no-such-sport', f) === bikeId, 'an unknown sportId falls back to sports[0]');
  assert(effectiveRideSportId(undefined, f) === bikeId, 'no stamp at all falls back to sports[0]');
  assert(effectiveRideSportId(undefined, emptySports()) === null, 'with zero sports, the fallback is null');
});
