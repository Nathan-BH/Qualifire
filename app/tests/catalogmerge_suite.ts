/**
 * virgin-cycle18 brief 05: store/catalogMerge.ts — renameLandmark and
 * mergeLandmarks (Nathan's two "Work" places). Pure, JSON-free import chain:
 * no registerHooks shim needed.
 */
import { assert, test } from './lib.ts';
import { emptyCatalog, mergeCatalogs, metresBetween, validateCatalog } from '../src/store/catalog.ts';
import { mergeLandmarks, renameLandmark } from '../src/store/catalogMerge.ts';
import type { Catalog, GateSet, Landmark, Route, Way } from '../src/store/types.ts';

function lm(id: string, lat: number, lon: number, radiusM = 120): Landmark {
  return { id, label: id, lat, lon, radiusM, activeFromMs: 0, activeUntilMs: null, offerAtStart: true };
}
function rt(id: string, s: string, e: string, wayIds: string[], extra: Partial<Route> = {}): Route {
  return { id, startLandmarkId: s, endLandmarkId: e, wayIds, ...extra };
}
function wy(id: string, routeId: string, n: number, specs?: string[]): Way {
  const w: Way = { id, routeId, refLineId: id, gateSetVersion: 1, seeded: false, referenceRideId: `ride-${n}` };
  if (specs) w.specs = specs;
  return w;
}
function gs(wayId: string): GateSet {
  return { wayId, version: 1, chainageM: [10, 500], createdAtMs: 0 };
}
function twoWorks(): Catalog {
  const c = emptyCatalog();
  c.landmarks = [lm('home', 50.87, 4.70), lm('work1', 50.90, 4.70), lm('work2', 50.9025, 4.70), lm('store', 50.95, 4.75)];
  c.routes = [
    rt('r1', 'home', 'work1', ['w1']),
    rt('r2', 'work2', 'store', ['w2']),
    rt('r3', 'work1', 'store', ['w3']),
    rt('r4', 'store', 'work2', ['w4']),
  ];
  c.ways = [wy('w1', 'r1', 1), wy('w2', 'r2', 2), wy('w3', 'r3', 3, ['Dry']), wy('w4', 'r4', 4)];
  c.gateSets = c.ways.map((w) => gs(w.id));
  return c;
}
const EMPTY = emptyCatalog();
const valid = (c: Catalog, seed: Catalog = EMPTY) => validateCatalog(mergeCatalogs(seed, c));

test('c18-05 m0 (setup): the twoWorks fixture validates and the two Works are >= 240 m apart', () => {
  const c = twoWorks();
  const errs = valid(c);
  assert(errs.length === 0, `fixture must validate, got ${errs.join('; ')}`);
  const d = metresBetween(c.landmarks[1], c.landmarks[2]);
  assert(d >= 240, `work1/work2 must be >= 240 m apart, got ${d}`);
});

test('c18-05 m1: rename — trims, refuses empty, refuses a taken name case-insensitively, refuses a seed place, keeps own name', () => {
  const cat = twoWorks();
  const seed = emptyCatalog();
  const ok = renameLandmark(cat, seed, 'work2', '  Work B ');
  assert(ok.ok, 'rename must succeed');
  if (ok.ok) {
    const l = ok.next.landmarks.find((x) => x.id === 'work2')!;
    assert(l.label === 'Work B', `label trimmed, got "${l.label}"`);
    assert(JSON.stringify({ ...l, label: 'work2' }) === JSON.stringify(cat.landmarks[2]), 'every other field byte-equal');
    assert(ok.next.routes === cat.routes && ok.next.ways === cat.ways, 'routes/ways untouched');
  }
  assert(!renameLandmark(cat, seed, 'work2', '').ok, 'empty refused');
  const clash = renameLandmark(cat, seed, 'work2', 'HOME');
  assert(!clash.ok && clash.errors.join(' ').includes('"home"'), 'taken name refused, mentions "home"');
  assert(renameLandmark(cat, seed, 'work2', 'work2').ok, 'own name allowed');
  const seedCat = emptyCatalog();
  seedCat.landmarks = [lm('sw', 51.0, 4.8)];
  assert(!renameLandmark(cat, seedCat, 'sw', 'X').ok, 'a seed place is not in the user catalog');
  assert(!renameLandmark(cat, seedCat, 'work2', seedCat.landmarks[0].label).ok, 'a seed label is taken');
});

test('c18-05 m2: merge re-points every route, drops the loser, keeps ways/gates untouched, validates', () => {
  const cat = twoWorks();
  const out = mergeLandmarks(cat, EMPTY, 'work1', 'work2');
  assert(out.ok, 'merge must succeed');
  if (!out.ok) return;
  assert(out.next.landmarks.map((l) => l.id).join(',') === 'home,work1,store', 'work2 dropped');
  // r2 (work2→store) becomes work1→store, colliding with r3 (work1→store), which
  // already pointed at the kept place: the RE-POINTED route folds into the one
  // that was already there (decision 6 as amended by 05b). r3 keeps r2's slot.
  assert(JSON.stringify(out.folded) === JSON.stringify([{ droppedRouteId: 'r2', intoRouteId: 'r3', movedWayIds: ['w2'] }]),
    `folded: ${JSON.stringify(out.folded)}`);
  assert(out.next.routes.map((r) => r.id).join(',') === 'r1,r3,r4', `routes: ${out.next.routes.map((r) => r.id).join(',')}`);
  const r3 = out.next.routes.find((r) => r.id === 'r3')!;
  assert(r3.wayIds.join(',') === 'w3,w2', `r3.wayIds: ${r3.wayIds.join(',')}`);
  assert(out.next.ways.find((w) => w.id === 'w2')!.routeId === 'r3', 'w2 moved under r3');
  assert(out.next.ways.find((w) => w.id === 'w3')!.routeId === 'r3', 'w3 untouched');
  assert(out.next.routes.find((r) => r.id === 'r4')!.endLandmarkId === 'work1', 'r4 re-pointed');
  assert(out.repointedRouteIds.join(',') === 'r2,r4', `repointed: ${out.repointedRouteIds.join(',')}`);
  assert(JSON.stringify(out.next.gateSets) === JSON.stringify(cat.gateSets), 'gate sets untouched');
  for (const w of cat.ways) assert(out.next.ways.some((x) => x.id === w.id), `way ${w.id} must survive`);
  const errs = valid(out.next);
  assert(errs.length === 0, `merged catalog must validate, got ${errs.join('; ')}`);
});

test('c18-05 m3: a merge that makes a route X → X gets a loopDiscriminator and validates', () => {
  const cat = twoWorks();
  cat.routes.push(rt('r5', 'work2', 'work1', ['w5']));
  cat.ways.push(wy('w5', 'r5', 5));
  cat.gateSets.push(gs('w5'));
  const out = mergeLandmarks(cat, EMPTY, 'work1', 'work2');
  assert(out.ok, 'merge must succeed');
  if (!out.ok) return;
  const r5 = out.next.routes.find((r) => r.id === 'r5')!;
  assert(r5.loopDiscriminator === 'loop:merged:work2', `discriminator: ${r5.loopDiscriminator}`);
  assert(out.loopedRouteIds.join(',') === 'r5', `looped: ${out.loopedRouteIds.join(',')}`);
  const errs = valid(out.next);
  assert(errs.length === 0, `must validate, got ${errs.join('; ')}`);
});

test('c18-05 m4: two plain ways fold; equal non-empty specs refuse with no partial result', () => {
  const plain = mergeLandmarks(twoWorks(), EMPTY, 'work1', 'work2');
  assert(plain.ok && plain.folded.length === 1, 'plain w2 + specced w3 fold cleanly');
  const cat = twoWorks();
  cat.ways = cat.ways.map((w) => (w.id === 'w2' ? { ...w, specs: ['Dry'] } : w));
  const snapshot = JSON.stringify(cat);
  const out = mergeLandmarks(cat, EMPTY, 'work1', 'work2');
  assert(!out.ok, 'equal non-empty specs must refuse');
  if (!out.ok) assert(out.errors.join(' ').includes('w3') && out.errors.join(' ').includes('w2'), `error names both ways: ${out.errors.join(' ')}`);
  assert(JSON.stringify(cat) === snapshot, 'input catalog unchanged');
});

test('c18-05 m5: refusals — same id, unknown keep, seed drop; keep may be a seed place', () => {
  const cat = twoWorks();
  const seed = emptyCatalog();
  seed.landmarks = [lm('sw', 51.0, 4.8)];
  assert(!mergeLandmarks(cat, EMPTY, 'work1', 'work1').ok, 'same id refused');
  assert(!mergeLandmarks(cat, EMPTY, 'nope', 'work2').ok, 'unknown keep refused');
  assert(!mergeLandmarks(cat, seed, 'work1', 'sw').ok, 'a shipped place cannot be dropped');
  const out = mergeLandmarks(cat, seed, 'sw', 'work2');
  assert(out.ok, 'a seed place may be kept');
  if (!out.ok) return;
  assert(out.next.routes.find((r) => r.id === 'r2')!.startLandmarkId === 'sw', 'r2 now starts at sw');
  const errs = validateCatalog(mergeCatalogs(seed, out.next));
  assert(errs.length === 0, `must validate, got ${errs.join('; ')}`);
});

test('c18-05 m6: pre-existing twins are NOT folded unless one of them was re-pointed', () => {
  const cat = twoWorks();
  cat.routes.push(rt('r6', 'home', 'store', ['w6']), rt('r7', 'home', 'store', ['w7']));
  cat.ways.push(wy('w6', 'r6', 6), wy('w7', 'r7', 7));
  cat.gateSets.push(gs('w6'), gs('w7'));
  const out = mergeLandmarks(cat, EMPTY, 'work1', 'work2');
  assert(out.ok, 'merge must succeed');
  if (!out.ok) return;
  const ids = out.next.routes.map((r) => r.id);
  assert(ids.includes('r6') && ids.includes('r7'), `both untouched twins stay, got ${ids.join(',')}`);
});

test('c18-05 m7: sportId separates twins', () => {
  const cat = twoWorks();
  cat.routes = cat.routes.map((r) => (r.id === 'r2' ? { ...r, sportId: 'sport:b' } : r));
  const out = mergeLandmarks(cat, EMPTY, 'work1', 'work2');
  assert(out.ok, 'merge must succeed');
  if (!out.ok) return;
  assert(out.next.routes.map((r) => r.id).join(',') === 'r1,r2,r3,r4', `routes: ${out.next.routes.map((r) => r.id).join(',')}`);
  assert(out.folded.length === 0, 'nothing folded');
  const errs = valid(out.next);
  assert(errs.length === 0, `must validate, got ${errs.join('; ')}`);
});

test('c18-05 m8: both twins re-pointed (pre-existing twins on the dropped place) — the earlier survives', () => {
  const cat = twoWorks();
  // no r3: work1→store does not exist yet; r2 and r8 are pre-existing twins on work2
  cat.routes = cat.routes.filter((r) => r.id !== 'r3');
  cat.ways = cat.ways.filter((w) => w.id !== 'w3');
  cat.gateSets = cat.gateSets.filter((g) => g.wayId !== 'w3');
  cat.routes.push(rt('r8', 'work2', 'store', ['w8']));
  cat.ways.push(wy('w8', 'r8', 8));
  cat.gateSets.push(gs('w8'));
  assert(valid(cat).length === 0, 'fixture with pre-existing twins must validate');
  const out = mergeLandmarks(cat, EMPTY, 'work1', 'work2');
  assert(out.ok, 'merge must succeed');
  if (!out.ok) return;
  assert(JSON.stringify(out.folded) === JSON.stringify([{ droppedRouteId: 'r8', intoRouteId: 'r2', movedWayIds: ['w8'] }]),
    `folded: ${JSON.stringify(out.folded)}`);
  assert(out.next.routes.map((r) => r.id).join(',') === 'r1,r2,r4', `routes: ${out.next.routes.map((r) => r.id).join(',')}`);
  assert(out.next.routes.find((r) => r.id === 'r2')!.wayIds.join(',') === 'w2,w8', 'w8 joined r2');
  assert(out.next.ways.find((w) => w.id === 'w8')!.routeId === 'r2', 'w8 moved under r2');
  assert(out.repointedRouteIds.join(',') === 'r2,r4,r8', `repointed: ${out.repointedRouteIds.join(',')}`);
  const errs = valid(out.next);
  assert(errs.length === 0, `must validate, got ${errs.join('; ')}`);
});
