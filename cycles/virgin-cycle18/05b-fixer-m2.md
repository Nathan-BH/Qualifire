# 05b — fixer: which twin route survives a merge fold (`mergeLandmarks`, test m2)

Ruling by the Plan tier (Fable, 2026-09-30) on the executor's m2 flag for brief 05.
Self-contained. Execute-tier (Sonnet), stop-on-ambiguity: any anchor below that does not
match the working tree verbatim → stop and report the mismatch verbatim; never guess.

## Ruling

**REQUIRE a fix. The brief's m2 expectation was right; the brief's code (landed verbatim)
and the wording "later folds into earlier" in decision 6 were wrong.**

Decision 6 is amended to:

> When a re-pointed route becomes the twin of a route that already pointed at the kept
> place, **the route that already pointed at the kept place survives** and the re-pointed
> one folds into it (its ways move over, it is dropped). Only when BOTH twins were
> re-pointed (two pre-existing twins that both lived on the dropped place) does the
> earlier one in catalog order survive.

Why:
1. Explainable to Nathan: "the routes of the place you removed join the routes the kept
   place already had". Catalog order is invisible to him; "earlier in the file wins" is
   deterministic but arbitrary, and in the m2 scenario it makes the UNTOUCHED route
   (`r3: work1→store`) vanish into the one that was just re-pointed.
2. It is what the confirm dialog already promises (`CatalogDetailScreen.tsx:136`:
   "N routes become the same as an existing one and fold into it") and what the brief's
   walkthrough says ("Every route now reads Work; if two routes became the same pair, they
   are one route with two ways").
3. It matches brief 06 / `applyEndpointChoices`: when a draft's endpoint is re-pointed onto a
   pair that already has a route, the EXISTING route survives and the newcomer becomes a way
   on it. Same principle, so the two places a twin can arise behave the same way.
4. Nothing is lost either way (results, gates, reference lines are keyed by way id; ways keep
   their ids) — this is purely which route id survives — so the explainable rule costs nothing.

Not changed: the confirm copy in `CatalogDetailScreen.tsx` (already correct), m1, m3–m7,
brief 05 itself (do not edit any `NN-*.md`), `STATE.md`/`OPEN-ITEMS.md`/`README.md`
(coordinator's).

## Allowed files

- `app/src/store/catalogMerge.ts`
- `app/tests/catalogmerge_suite.ts`

Nothing else. No commit, no build, no delete, no `safe_to_delete/` moves needed.

## §1 `app/src/store/catalogMerge.ts` (117 lines today)

### 1a. Doc comment — line 37, verbatim today:

```ts
      /** later twin routes folded into an earlier one (their ways moved) */
```

replace with:

```ts
      /** re-pointed twin routes folded into the route that already pointed at
       * keepId (their ways moved); both re-pointed → the earlier one survives (05b) */
```

### 1b. Fold loop — lines 75–111, verbatim today (anchor: line 75 is
`  // 2. fold twins (non-loop, same start/end/sportId, at least one re-pointed)` and
line 111 is `  routes = out;`):

```ts
  // 2. fold twins (non-loop, same start/end/sportId, at least one re-pointed)
  let ways: Way[] = userCat.ways;
  const folded: FoldedRoute[] = [];
  const firstByKey = new Map<string, Route>();
  const out: Route[] = [];
  for (const r of routes) {
    const isLoop = r.startLandmarkId === r.endLandmarkId;
    const first = isLoop ? undefined : firstByKey.get(routeKey(r));
    if (!first || (!repointed.has(first.id) && !repointed.has(r.id))) {
      if (!isLoop && !first) firstByKey.set(routeKey(r), r);
      out.push(r);
      continue;
    }
    const firstWays = ways.filter((w) => w.routeId === first.id);
    const laterWays = ways.filter((w) => w.routeId === r.id);
    for (const a of laterWays) {
      if (!a.specs || a.specs.length === 0) continue;
      const twin = firstWays.find((b) => b.specs && b.specs.length > 0 && sameSpecs(b.specs, a.specs!));
      if (twin) {
        return {
          ok: false,
          errors: [
            `ways "${a.specs.join(' · ')}" on ${lab(r.startLandmarkId)} → ${lab(r.endLandmarkId)} would exist twice after the merge ` +
              `(${twin.id} and ${a.id}) — rename or delete one of them first`,
          ],
        };
      }
    }
    const movedWayIds = laterWays.map((w) => w.id);
    ways = ways.map((w) => (w.routeId === r.id ? { ...w, routeId: first.id } : w));
    const idx = out.findIndex((x) => x.id === first.id);
    const grown: Route = { ...out[idx], wayIds: [...out[idx].wayIds, ...r.wayIds] };
    out[idx] = grown;
    firstByKey.set(routeKey(grown), grown);
    folded.push({ droppedRouteId: r.id, intoRouteId: first.id, movedWayIds });
  }
  routes = out;
```

Replace the whole block (lines 75–111 inclusive) with:

```ts
  // 2. fold twins (non-loop, same start/end/sportId, at least one re-pointed).
  // 05b: the route that ALREADY pointed at keepId survives and the re-pointed
  // twin folds into it; when both were re-pointed (pre-existing twins on the
  // dropped place) the earlier one in catalog order survives. `first` is the
  // earlier route of the pair as it stands now (it may already have absorbed
  // a twin); the survivor keeps `first`'s position in the catalog.
  let ways: Way[] = userCat.ways;
  const folded: FoldedRoute[] = [];
  const firstByKey = new Map<string, Route>();
  const out: Route[] = [];
  for (const r of routes) {
    const isLoop = r.startLandmarkId === r.endLandmarkId;
    const first = isLoop ? undefined : firstByKey.get(routeKey(r));
    if (!first || (!repointed.has(first.id) && !repointed.has(r.id))) {
      if (!isLoop && !first) firstByKey.set(routeKey(r), r);
      out.push(r);
      continue;
    }
    const survivor: Route = repointed.has(first.id) && !repointed.has(r.id) ? r : first;
    const loser: Route = survivor === r ? first : r;
    const survivorWays = ways.filter((w) => w.routeId === survivor.id);
    const loserWays = ways.filter((w) => w.routeId === loser.id);
    for (const a of loserWays) {
      if (!a.specs || a.specs.length === 0) continue;
      const twin = survivorWays.find((b) => b.specs && b.specs.length > 0 && sameSpecs(b.specs, a.specs!));
      if (twin) {
        return {
          ok: false,
          errors: [
            `ways "${a.specs.join(' · ')}" on ${lab(r.startLandmarkId)} → ${lab(r.endLandmarkId)} would exist twice after the merge ` +
              `(${twin.id} and ${a.id}) — rename or delete one of them first`,
          ],
        };
      }
    }
    const movedWayIds = loserWays.map((w) => w.id);
    ways = ways.map((w) => (w.routeId === loser.id ? { ...w, routeId: survivor.id } : w));
    const idx = out.findIndex((x) => x.id === first.id);
    const grown: Route = { ...survivor, wayIds: [...survivor.wayIds, ...loser.wayIds] };
    out[idx] = grown;
    firstByKey.set(routeKey(grown), grown);
    folded.push({ droppedRouteId: loser.id, intoRouteId: survivor.id, movedWayIds });
  }
  routes = out;
```

Notes for the executor (not decisions — facts to check against):
- `first` from `firstByKey` is always the CURRENT grown route (the map is updated after every
  fold), so `first.wayIds` is up to date; `out[idx]` and `first` are the same object.
- The `repointed` set is not modified. A later untouched route colliding with a survivor that
  was itself untouched hits the `!repointed.has(first.id) && !repointed.has(r.id)` branch and
  is left as a pre-existing twin (m6 unchanged).
- Nothing else in the file changes (lines 1–74 and 112–117 stay byte-identical).

## §2 `app/tests/catalogmerge_suite.ts` (156 lines today)

### 2a. Rewrite m2 — lines 70–92, verbatim today start with
`test('c18-05 m2: merge re-points every route, drops the loser, keeps ways/gates untouched, validates', () => {`
and end with the `});` on line 92 (the line before the blank line preceding `test('c18-05 m3`).
Replace the whole test with:

```ts
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
```

### 2b. Append a new test m8 after m7 (after the file's last `});`, line 156 today):

```ts

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
```

If the m8 fixture does NOT validate (the setup assert fails) → stop and report the
`validateCatalog` errors verbatim; do not adjust the fixture.

m4 is untouched: with `w2.specs = ['Dry']` the loser is r2 (re-pointed), the survivor r3
already holds `w3 ['Dry']` → refused, message names `w3` and `w2` in that order.

## Verification (run both, paste the tail of each)

```
cd app && node --experimental-strip-types tests/run.ts
```
Expected: 768 tests, 765 pass, 0 fail, 3 skip (baseline 767/764/0/3 + m8). m2 and m8 pass,
m1/m3–m7 unchanged.

```
cd app && ./node_modules/.bin/tsc --noEmit
```
Expected: clean, exit 0.

## Report back

Ruling applied (yes/no), the two test-runner totals, tsc exit code, and any anchor that
did not match verbatim (stop there — do not improvise).
