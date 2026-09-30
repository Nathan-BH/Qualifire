# 06b — fixer: Group B inspection findings (briefs 05 + 06)

Rulings by the Plan tier (Fable, 2026-09-30) on the fresh-context Opus inspection of briefs
05/05b/06 (`OVERNIGHT-REPORT.md` → "Group B inspection"). Every claim was re-verified against
the working tree (branch `virgin`, uncommitted, 02/04/04b/05/05b/06 landed). Self-contained.
Execute-tier (Sonnet), cold, **stop-on-ambiguity**: every anchor below is quoted text with
the line number it sat at when this brief was written; match by CONTENT (lines may shift by
a few). If a quoted line is not there, or a name/signature differs, **stop and report the
mismatch verbatim** (file, expected, found). Never guess, never patch around it, never rule.

## Rulings

| # | Inspector finding | Ruling | Why (one line) |
|---|---|---|---|
| 1 | brief 06 truncated, its three tests missing | **FIX** (§A) | 06's own text requires tests for the existing→existing cases and the one-home belt; the inspector's ps5/rc6/rc7 are correct against the helpers in the suites (rc7 fails without the §2 belt). |
| 2 | scored ride can end with two homes via SAVE AS FREE RIDE | **FIX, option (b)** (§B) | Nathan's two principles both hold: the rider may still say "free" (06: post-ride is editable) and the ride keeps exactly one home (04). Option (a) would silently rewrite 04 decision 1 and 06 decision 5 (the `keep it as <way>` exit stays where 04 put it). |
| 3 | wrong sport scope in `applyEndpointChoices`/`routeForPair` | **FIX** (§C) | The draft is scoped to the RIDE's sport (`routeFromRide.ts:172`); a global-sport lookup can add a way to another sport's route. 4 call sites + the 2 `findWayWithSpecs` belts next to them, same catalog. |
| 4 | next settle can re-store a dropped stale result | **DEFER** → OPEN-ITEMS | Needs `timeReferenceAt` to disown the ride on a line built from its OWN fixes while another way accepts it clean — rare; the honest fix touches both settle and the boot backfill (`initRideHistory`), out of scope for a fixer. |
| 5 | loop copy reads the drafted label | **FIX** (§D) | One identifier. |
| 6 | an end choice that made a loop can't be undone | **FIX** (§D) | `hideEnd` as proposed; only the render guard changes, `needEnd` keeps `!loop`. |
| 7 | merge picker still open on the kept place | **FIX** (§E) | `key={request.id}` on `<PlaceBody>`; one token. |

Not changed: `DemoScreen.tsx`, `store/routeCreation.ts`, `store/routeFromRide.ts`,
`placePicker.tsx`, `placeSearch.ts`, `rideHomes.ts`, anything under `src/location/`,
`app.json`, any `NN-*.md` brief, `STATE.md`, `OPEN-ITEMS.md`, `README.md`, `IDEAS.md`.

## Executor rules (binding)

- **Allowed files (exactly these):** `app/src/ui/RecordScreen.tsx`, `app/src/ui/RideDetailScreen.tsx`,
  `app/src/ui/routeNamingCard.tsx`, `app/src/ui/CatalogDetailScreen.tsx`,
  `app/tests/placesearch_suite.ts`, `app/tests/routecreation_suite.ts`.
- **No commit, no build, no publish, no delete.** Nothing goes to `safe_to_delete/` either —
  this brief only edits.
- **Shell hygiene on this mount:** a shell call with a huge payload can fail with `E2BIG` —
  make each edit its own small python read-modify-write (`open(p).read()` → `str.replace`
  with an exact-once assertion → `open(p,'w').write()`), never one giant command. Background
  processes are killed between shell calls: run tests and tsc **in the foreground**, one per
  call, with a generous timeout (tsc takes ~20–45 s here). Use `GIT_OPTIONAL_LOCKS=0` if you
  run any `git` read command.
- Every replacement below must match **exactly once**; if `count != 1`, stop and report.
- Preserve the files' existing import style (RecordScreen imports without `.ts`, RideDetail
  with `.ts`).

## §A. The three missing tests (finding 1)

### A1. `app/tests/placesearch_suite.ts`

**Anchor (line 8):**
```ts
import { matchingPlaces, newPlaceNameError, placeByLabel, placeOptions, type PlaceOption } from '../src/store/placeSearch.ts';
```
Replace with:
```ts
import {
  effectiveEndpointId, endpointOptions, matchingPlaces, newPlaceNameError, placeByLabel, placeOptions, type PlaceOption,
} from '../src/store/placeSearch.ts';
```

**Append at the very end of the file** (after the closing `});` of `c18-05 ps4`, currently the
last test, file is 65 lines):
```ts

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
```

### A2. `app/tests/routecreation_suite.ts`

Preconditions (verify, do not edit): `applyEndpointChoices` and `type RouteCreationDraft` are
imported from `../src/store/routeCreation.ts` (lines 23–38); `type Catalog` from
`../src/store/types.ts` (line 39); the WP-H helpers `wphSetup`, `wphWriteRideFile`, `wphFixes`,
`wphRouteFromRide`, `wphResultsStore` exist (lines ~697–780). The file's last test is
`c18-04 follow-up (settleRideHomes / timeMissingReference) …` and the file ends with its `});`
(line 1386).

**Append at the very end of the file:**
```ts

test('c18-06 rc6: applyEndpointChoices — existing → existing re-point: pair flips variant, loop breaks, matchedWayId carried', () => {
  const cat = { routes: [
    { id: 'SH', startLandmarkId: 'S', endLandmarkId: 'H', wayIds: ['wSH'] },
    { id: 'XX', startLandmarkId: 'X', endLandmarkId: 'X', loopDiscriminator: 'loop:x', wayIds: ['wXX'] },
  ] } as unknown as Catalog;
  const d = {
    rideId: 'r6', startedAtMs: 0, trackLengthM: 1000, sportId: null, matchedWayId: 'wM',
    start: { kind: 'existing', landmarkId: 'S' }, end: { kind: 'existing', landmarkId: 'W' },
    loop: false, existingRouteId: null,
  } as unknown as RouteCreationDraft;
  const a = applyEndpointChoices(cat, d, { start: { kind: 'proposed' }, end: { kind: 'existing', landmarkId: 'H' } });
  assert(a.start.kind === 'existing' && a.start.landmarkId === 'S' && a.end.kind === 'existing' && a.end.landmarkId === 'H', 'end re-pointed S → H');
  assert(a.loop === false && a.existingRouteId === 'SH', `onto a pair with a route → variant, got ${a.existingRouteId}`);
  assert(a.matchedWayId === 'wM', 'matchedWayId is a fact about the ride — carried');
  const dl = { ...d, start: { kind: 'existing', landmarkId: 'X' }, end: { kind: 'existing', landmarkId: 'X' }, loop: true, existingRouteId: 'XX' } as unknown as RouteCreationDraft;
  const b = applyEndpointChoices(cat, dl, { start: { kind: 'existing', landmarkId: 'Y' }, end: { kind: 'proposed' } });
  assert(b.start.kind === 'existing' && b.start.landmarkId === 'Y' && b.end.kind === 'existing' && b.end.landmarkId === 'X' && b.loop === false && b.existingRouteId === null,
    `existing loop X→X with start → Y becomes Y→X, no route: ${JSON.stringify(b)}`);
});

test('c18-06 rc7 (createRouteFromDraft): an untimeable founding ride drops its stale result on another way — one home', async () => {
  const { fs } = await wphSetup();
  await wphWriteRideFile(fs, 'onehome1', wphFixes(200, 0.0002, 1_700_600_000));
  const d = await wphRouteFromRide.draftRouteFromRide('onehome1', 1_700_600_000_000, null, fs);
  const first = await wphRouteFromRide.createRouteFromDraft(d!, { start: '', end: 'Far' }, fs);
  assert(first.ok && first.referenceTimed === true, `precondition: a timed route, got ${JSON.stringify(first)}`);
  const own = wphResultsStore.getStoredResult('onehome1');
  assert(own !== null, 'precondition: founding result stored');
  // 'stale1' holds a result on way:onehome1 but has NO recording -> referenceTimed false on its own new way
  await wphResultsStore.saveResult({ ...own!, rideId: 'stale1' });
  assert(wphResultsStore.getStoredResult('stale1')?.wayId === 'way:onehome1', 'precondition: stale result on another way');
  const d2 = await wphRouteFromRide.draftRouteFromRide('onehome1', 1_700_600_000_000, null, fs);
  const out = await wphRouteFromRide.createRouteFromDraft({ ...d2!, rideId: 'stale1' }, { start: '', end: '', specs: ['Alt'] }, fs);
  assert(out.ok && out.referenceTimed === false, `untimed creation, got ${JSON.stringify(out)}`);
  assert(wphResultsStore.getStoredResult('stale1') === null, 'the stale result on way:onehome1 must be dropped (brief 06 decision 6)');
  assert(wphResultsStore.getStoredResult('onehome1')?.wayId === 'way:onehome1', 'other rides untouched');
});
```
(rc6's assertions narrow `start`/`end` with `.kind === 'existing' &&` before reading
`.landmarkId` — `EndpointResolution` is a union; if tsc still complains about `.landmarkId`,
stop and report the exact error, do not cast.)

## §B. One home when the card says SAVE AS FREE RIDE (finding 2, option b)

The card can reach SAVE AS FREE RIDE on a ride the engine scored: the WP-F variant (scored
as X, pair has no route) and, since 06, the `not <way>?` card after an endpoint is changed
onto a pair with no route. `markRideFree` alone leaves the stored result on X → two homes.
Both free handlers drop that result (store + the RECORD comparison window) first. The
free record then keeps the next settle/boot backfill from re-deriving it (rideHomes step 1
skips free rides), so no marker is needed.

### B1. `app/src/ui/RecordScreen.tsx`

Preconditions (verify, do not edit): line 55 `import { dropRecorded, rememberRide, replaceRecorded } from './lastRide';`
and line 77 `import { getStoredResult, removeStoredResult } from '../store/resultsStore';` — both present.

**Anchor (lines 775–780):**
```ts
  const onNamingFree = useCallback(() => {
    const e = endedRef.current;
    if (e) markRideFree(e.rideId, e.startedAtMs, e.durationS, e.sportId);
    setNaming(null);
    setShowAnim('rev');
  }, []);
```
Replace with:
```ts
  const onNamingFree = useCallback(() => {
    const e = endedRef.current;
    if (e) {
      // virgin-cycle18 06b (one home): this card can offer SAVE AS FREE RIDE on
      // a ride the engine scored (WP-F, or `not <way>?` + an endpoint changed
      // onto a pair with no route). Its stored result would be a second home —
      // drop it, store and window, before filing the free record. The free
      // record keeps the settle/boot backfill from re-deriving it.
      if (getStoredResult(e.rideId) !== null) {
        void removeStoredResult(e.rideId);
        dropRecorded(e.rideId);
      }
      markRideFree(e.rideId, e.startedAtMs, e.durationS, e.sportId);
    }
    setNaming(null);
    setShowAnim('rev');
  }, []);
```

### B2. `app/src/ui/RideDetailScreen.tsx`

Preconditions (verify, do not edit): lines 45–47 import `getStoredResult, removeStoredResult`
from `../store/resultsStore.ts`; lines 49–51 import `dropRecorded` from `./lastRide.ts`.

**Anchor (lines 308–316):**
```ts
  function onSaveFree() {
    markRideFree(
      request.rideId,
      request.startedAtMs,
      meta ? Math.max(0, (meta.endMs - meta.startMs) / 1000) : null,
      effectiveRideSportId(meta?.sportId, currentSports()),
    );
    setNaming(false);
    setTick((v) => v + 1); // model re-reads: free = the new record → kind 'free'
  }
```
Replace with:
```ts
  function onSaveFree() {
    // virgin-cycle18 06b (one home): reached from the naming card on a ride
    // the engine scored (WP-F / an endpoint changed) — drop that result, store
    // and window, before filing the free record. From the plain "Save as free
    // ride" button (kind 'none') there is no result and this is a no-op.
    if (getStoredResult(request.rideId) !== null) {
      void removeStoredResult(request.rideId);
      dropRecorded(request.rideId);
    }
    markRideFree(
      request.rideId,
      request.startedAtMs,
      meta ? Math.max(0, (meta.endMs - meta.startMs) / 1000) : null,
      effectiveRideSportId(meta?.sportId, currentSports()),
    );
    setNaming(false);
    setTick((v) => v + 1); // model re-reads: free = the new record → kind 'free'
  }
```

## §C. The ride's sport, not the active sport (finding 3)

`draftRouteFromRide` scopes the draft with `scopeCatalog(currentCatalog(), sportId, currentSports())`
(routeFromRide.ts:172). The choice application must look up routes in the SAME catalog.
`RouteCreationDraft.sportId` is `string | null`; `scopeCatalog(c, null, f)` returns `c` unfiltered.

### C1. `app/src/ui/RecordScreen.tsx`

**Anchor (line 81):**
```ts
import { addSport, effectiveRideSportId, setActiveSport, showSportPillRow, wayIdsOfSport } from '../store/sports';
```
Replace with:
```ts
import { addSport, effectiveRideSportId, scopeCatalog, setActiveSport, showSportPillRow, wayIdsOfSport } from '../store/sports';
```

**Anchor (line 788, inside `onNamingSave`):**
```ts
    const draft = applyEndpointChoices(activeCatalog(), drafted, choices);
```
Replace with:
```ts
    // 06b (Inspect finding 3): the draft is scoped to the RIDE's sport
    // (draftRouteFromRide) — a choice must be resolved in that same catalog,
    // not the global active sport's.
    const rideCatalog = scopeCatalog(currentCatalog(), drafted.sportId, currentSports());
    const draft = applyEndpointChoices(rideCatalog, drafted, choices);
```

**Anchor (line 792):**
```ts
    if (draft.existingRouteId && findWayWithSpecs(activeCatalog(), draft.existingRouteId, names.specs ?? [])) {
```
Replace with:
```ts
    if (draft.existingRouteId && findWayWithSpecs(rideCatalog, draft.existingRouteId, names.specs ?? [])) {
```

**Anchor (line 1314, the card's `routeForPair`):**
```tsx
                const d = applyEndpointChoices(activeCatalog(), naming, ch);
```
Replace with:
```tsx
                const d = applyEndpointChoices(scopeCatalog(currentCatalog(), naming.sportId, currentSports()), naming, ch);
```

### C2. `app/src/ui/RideDetailScreen.tsx`

**Anchor (line 42):**
```ts
import { effectiveRideSportId } from '../store/sports.ts';
```
Replace with:
```ts
import { effectiveRideSportId, scopeCatalog } from '../store/sports.ts';
```

**Anchor (line 275, inside `onNamingSave`):**
```ts
    const draft = applyEndpointChoices(activeCatalog(), offer, choices); // brief 05
```
Replace with:
```ts
    // brief 05; 06b (Inspect finding 3): resolved in the RIDE's sport, as the draft was
    const rideCatalog = scopeCatalog(currentCatalog(), offer.sportId, currentSports());
    const draft = applyEndpointChoices(rideCatalog, offer, choices);
```

**Anchor (line 277):**
```ts
    if (draft.existingRouteId && findWayWithSpecs(activeCatalog(), draft.existingRouteId, names.specs ?? [])) {
```
Replace with:
```ts
    if (draft.existingRouteId && findWayWithSpecs(rideCatalog, draft.existingRouteId, names.specs ?? [])) {
```

**Anchor (line 673, the card's `routeForPair`):**
```tsx
              const d = applyEndpointChoices(activeCatalog(), offer, ch);
```
Replace with:
```tsx
              const d = applyEndpointChoices(scopeCatalog(currentCatalog(), offer.sportId, currentSports()), offer, ch);
```

After C1/C2: `grep -n "activeCatalog()" app/src/ui/RecordScreen.tsx app/src/ui/RideDetailScreen.tsx`
must still show the `vocabulary=`/`places=` props and RecordScreen's own RECORD-tab uses
(`CATALOG`, `defaultEndpoints`, `afterSportSwitch`) — those are correct as they are; do not
touch them. If `activeCatalog` becomes unused in RideDetailScreen, tsc will NOT complain
(no `noUnusedLocals` failure is expected — it is still used by `vocabulary=`/`places=`).

## §D. `app/src/ui/routeNamingCard.tsx` (findings 5 + 6)

**D1 — loop copy (lines 190–193). Anchor:**
```tsx
            : loop
              ? props.startExistingLabel !== null
                ? `This ride looped from and back to ${props.startExistingLabel}.`
                : 'This ride looped from and back to one new place.'
```
Replace with:
```tsx
            : loop
              ? startLabel !== null
                ? `This ride looped from and back to ${startLabel}.`
                : 'This ride looped from and back to one new place.'
```
(`startLabel` is defined at line 139, before the JSX — `string | null`.)

**D2 — `hideEnd`. Anchor (line 138):**
```ts
  const needEnd = props.endExistingLabel === null && !loop && endChoice.kind === 'proposed';
```
Replace with:
```ts
  const needEnd = props.endExistingLabel === null && !loop && endChoice.kind === 'proposed';
  // 06b (Inspect finding 6): ENDED AT stays visible when a CHOICE made the
  // pair a loop, so its `change` link can undo it. Hidden only for a drafted
  // loop nobody touched, or a loop on a NEW place (the end follows the
  // start — nothing to change).
  const hideEnd = props.loop && (bothProposed || startProposedId === null);
```

**D3 — render guard. Anchor (line 255):**
```tsx
      {!loop && (
```
Replace with:
```tsx
      {!hideEnd && (
```
This must be the ONLY `{!loop && (` in the file (verify: `grep -c "{!loop && (" app/src/ui/routeNamingCard.tsx`
→ 1 before, 0 after). `needEnd` keeps `!loop` — do not change it.

Read-only check after D2/D3: with a non-loop draft `X → Y` and the end changed to `X`,
`loop` is true (the copy says "looped from and back to X"), ENDED AT still renders the fixed
row `X` with its `change` link (`needEnd` false, `endProposedId !== null` → picker link), so
the choice can be reverted. With a drafted loop on a new place and a typeahead start pick,
ENDED AT stays hidden exactly as before.

## §E. `app/src/ui/CatalogDetailScreen.tsx` (finding 7)

**Anchor (line 109):**
```tsx
        <PlaceBody
          model={model as PlaceDetailModel}
```
Replace with:
```tsx
        <PlaceBody
          key={request.id} // 06b: a merge re-opens the kept place — fresh rename/merge state, not the dropped place's
          model={model as PlaceDetailModel}
```

## Verification (all in the foreground, one per shell call)

1. `cd app && node --experimental-strip-types tests/run.ts`
   — expected **771 tests: 768 pass, 0 fail, 3 skip** (baseline 768/765/0/3 + ps5, rc6, rc7).
   Any FAIL → stop and report the test name and its assertion message verbatim.
2. `cd app && ./node_modules/.bin/tsc --noEmit` — exit 0, no output. (Not bare `npx tsc`.)
3. `grep -c "{!loop && (" app/src/ui/routeNamingCard.tsx` → 0; `grep -n "hideEnd" app/src/ui/routeNamingCard.tsx` → 2 hits (definition + guard).
4. `grep -n "scopeCatalog(currentCatalog()" app/src/ui/RecordScreen.tsx app/src/ui/RideDetailScreen.tsx` → 4 hits (2 per file).
5. `grep -n "removeStoredResult(e.rideId)\|removeStoredResult(request.rideId)" app/src/ui/RecordScreen.tsx app/src/ui/RideDetailScreen.tsx` → RecordScreen 1 hit (onNamingFree); RideDetailScreen ≥ 2 hits (onSaveFree plus the pre-existing delete path at ~394).
6. `GIT_OPTIONAL_LOCKS=0 git status --short` — the six allowed files are the only NEW modifications relative to the pre-06b tree (the tree was already dirty with 02–06; do not stage or commit anything).

## Stop conditions

Any anchor not found exactly once; a tsc error; a test FAIL; a test count other than 771/768/0/3;
any edit that would need a file outside the allowed list. Report verbatim and stop.

## Report back (manifest)

Files edited; test/tsc lines verbatim; for each of §A–§E one line "done" or the exact
mismatch; nothing else.

## Deferred (for the coordinator's OPEN-ITEMS, not for the executor)

- **Finding 4 (LOW):** a reference ride whose own-way timing failed (`referenceTimed === false`)
  is still a step-1 backfill candidate (`ui/rideHomes.ts:48`, and the boot path
  `lastRide.initRideHistory`), so a later settle can re-store it on the way the engine scored
  it as, undoing 06's belt. Rare (own-line derive must fail while another way accepts clean).
  Fix when touched next: exclude rides that are some user way's `referenceRideId` from the
  step-1 candidates in BOTH paths (step 1b already times references on their own way).
