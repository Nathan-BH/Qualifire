/**
 * QA — WP-1 (2026-09-06): the runtime sport store (store/sportStore.ts) and
 * activeCatalog(). Mirrors catalogstore_suite.ts's refuse-and-disarm cases:
 * a missing sports.json is "nothing added yet" (no write); an undecodable
 * or structurally invalid one is ignored for the session and NEVER
 * overwritten (its ids are the partition keys every stamp points at).
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { assert, test } from './lib.ts';
import { createMemoryFsAdapter } from '../src/storage/fsAdapter.ts';
import { addSport, type SportsFile } from '../src/store/sports.ts';

// Same bare-.json loader shim as catalogstore_suite.ts, same reason:
// catalogStore.ts (pulled in transitively by sportStore.ts's activeCatalog)
// imports catalog.seed.json directly.
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const catalogStore = await import('../src/store/catalogStore.ts');
const seedMod = await import('../src/store/seed.ts');
const sportStore = await import('../src/store/sportStore.ts');

test('WP-1 sportStore: a fresh fs writes nothing; currentSports() is emptySports(); activeSportId() is null', async () => {
  sportStore.resetSportStoreForTests();
  try {
    const fs = createMemoryFsAdapter();
    const got = await sportStore.initSportStore(fs);
    assert(got.sports.length === 0 && got.activeSportId === null, 'boots to emptySports()');
    assert(fs.files.size === 0, `init must write nothing, wrote ${[...fs.files.keys()].join(',')}`);
    assert(sportStore.currentSports().sports.length === 0, 'currentSports() agrees');
    assert(sportStore.activeSportId() === null, 'activeSportId() is null');
    assert(sportStore.sportWritesArmed() === true, 'a fresh (missing) file leaves writes armed');
  } finally {
    sportStore.resetSportStoreForTests();
  }
});

test('WP-1 sportStore: saveSports(addSport(...)) on a fresh store writes sports.json with one active sport', async () => {
  sportStore.resetSportStoreForTests();
  try {
    const fs = createMemoryFsAdapter();
    await sportStore.initSportStore(fs);
    const candidate = addSport(sportStore.currentSports(), 'Bike', 9000);
    assert(!Array.isArray(candidate), `addSport failed: ${JSON.stringify(candidate)}`);
    const errs = await sportStore.saveSports(candidate as SportsFile);
    await sportStore.flushSportWrites();
    assert(errs.length === 0, `save must accept a valid file: ${errs.join('; ')}`);
    assert(sportStore.currentSports().sports.length === 1, 'one sport now in memory');
    assert(sportStore.activeSportId() === sportStore.currentSports().sports[0].id, 'active = the new sport');
    const text = fs.files.get(sportStore.SPORTS_FILE);
    assert(typeof text === 'string' && text.endsWith('\n'), 'sports.json written, newline-terminated');
    assert(JSON.parse(text!).sports.length === 1, 'the file itself holds the one sport');
  } finally {
    sportStore.resetSportStoreForTests();
  }
});

test('WP-1 sportStore: a garbage sports.json is ignored for the session and NEVER overwritten', async () => {
  sportStore.resetSportStoreForTests();
  const origWarn = console.warn;
  console.warn = () => {};
  try {
    const fs = createMemoryFsAdapter();
    fs.files.set(sportStore.SPORTS_FILE, '{"sports": "not an array"');
    const got = await sportStore.initSportStore(fs);
    assert(got.sports.length === 0 && got.activeSportId === null, 'garbage file => emptySports() in memory');
    assert(sportStore.sportWritesArmed() === false, 'writes disarmed for the session');
    const candidate = addSport(sportStore.currentSports(), 'Bike', 9000);
    assert(!Array.isArray(candidate), `addSport itself still succeeds (it is pure): ${JSON.stringify(candidate)}`);
    const errs = await sportStore.saveSports(candidate as SportsFile);
    await sportStore.flushSportWrites();
    assert(errs.length > 0, 'saveSports refuses while disarmed');
    assert(fs.files.get(sportStore.SPORTS_FILE) === '{"sports": "not an array"',
      'the corrupt file is left exactly as found — its bytes are unchanged');
    assert(sportStore.currentSports().sports.length === 0, 'in-memory state also unchanged by the refused save');
  } finally {
    console.warn = origWarn;
    sportStore.resetSportStoreForTests();
  }
});

test('WP-1 sportStore: a structurally-invalid (but decodable) sports.json is treated the same as undecodable', async () => {
  sportStore.resetSportStoreForTests();
  const origWarn = console.warn;
  console.warn = () => {};
  try {
    const fs = createMemoryFsAdapter();
    // Decodes fine as JSON, but activeSportId names no sport in the list.
    const invalid = '{"schemaVersion":1,"sports":[{"id":"s1","label":"Bike","createdAtMs":0}],"activeSportId":"nope"}';
    fs.files.set(sportStore.SPORTS_FILE, invalid);
    const got = await sportStore.initSportStore(fs);
    assert(got.sports.length === 0, 'structurally invalid => emptySports() in memory, not the half-trusted file');
    assert(sportStore.sportWritesArmed() === false, 'writes disarmed');
    assert(fs.files.get(sportStore.SPORTS_FILE) === invalid, 'left exactly as found');
  } finally {
    console.warn = origWarn;
    sportStore.resetSportStoreForTests();
  }
});

test('WP-1 sportStore: activeCatalog() follows setActiveSport(), and equals currentCatalog() under emptySports()', async () => {
  catalogStore.resetCatalogStoreForTests();
  sportStore.resetSportStoreForTests();
  try {
    const fs = createMemoryFsAdapter();
    await catalogStore.initCatalogStore(fs);
    assert(
      JSON.stringify(sportStore.activeCatalog()) === JSON.stringify(catalogStore.currentCatalog()),
      'zero sports: activeCatalog() is currentCatalog(), unscoped',
    );

    const { setActiveSport } = await import('../src/store/sports.ts');
    const fs2 = createMemoryFsAdapter();
    await sportStore.initSportStore(fs2);
    const bike = addSport(sportStore.currentSports(), 'Bike', 1000);
    assert(!Array.isArray(bike), `addSport(Bike) failed: ${JSON.stringify(bike)}`);
    await sportStore.saveSports(bike as SportsFile);
    const run = addSport(sportStore.currentSports(), 'Run', 1001);
    assert(!Array.isArray(run), `addSport(Run) failed: ${JSON.stringify(run)}`);
    await sportStore.saveSports(run as SportsFile);
    await sportStore.flushSportWrites();

    const runId = sportStore.currentSports().sports[1].id;
    // Neither sport owns any of the shipped seed's routes (nothing is
    // stamped), so both fall back — Bike (sports[0]) absorbs everything,
    // Run sees nothing.
    assert(sportStore.activeCatalog().routes.length === catalogStore.currentCatalog().routes.length,
      'Bike (sports[0]) is active by default and absorbs the whole unstamped seed');

    const switched = setActiveSport(sportStore.currentSports(), runId);
    assert(!Array.isArray(switched), `setActiveSport failed: ${JSON.stringify(switched)}`);
    await sportStore.saveSports(switched as SportsFile);
    assert(sportStore.activeSportId() === runId, 'active sport switched to Run');
    assert(sportStore.activeCatalog().routes.length === 0, 'Run owns none of the unstamped seed');
  } finally {
    sportStore.resetSportStoreForTests();
    catalogStore.resetCatalogStoreForTests();
    assert(seedMod.SEED_MODE === 'shipped', 'sanity: still on the shipped seed for later suites');
  }
});
