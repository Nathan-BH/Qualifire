# FIXER BRIEF — virgin-cycle18 brief 04 follow-up (Inspect findings 1 + 2)

**Executor: Sonnet, cold. Stop-on-ambiguity: every anchor below was read from the tree on 2026-09-30 with briefs 02 and 04 landed (uncommitted). If a quoted line is not at the stated line number, or a name/signature differs, STOP and report verbatim (file, line, expected, found). Never guess, never patch around it.** Do not commit. Never delete anything. Touch exactly these four source files and one test file: `app/src/store/routeFromRide.ts`, `app/src/ui/rideHomes.ts`, `app/src/ui/RecordScreen.tsx`, `app/src/ui/RideDetailScreen.tsx`, `app/tests/routecreation_suite.ts`. Do not touch `routeNamingCard.tsx`, `routeCreation.ts`, `resultsStore.ts`, `freeRides.ts`, `resultsListModel.ts`, any `cycles/` doc, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`.

**Precondition:** `grep -n "export async function timeReferenceAt" app/src/store/routeFromRide.ts` → line 375. `grep -n "referenceTimed\|settleRideHomes" app/src/ui/RecordScreen.tsx app/src/ui/RidesScreen.tsx` → hits. No hits = brief 04 not landed — stop.

## Edit A — `app/src/store/routeFromRide.ts`: new helper `timeMissingReference`

**Anchor:** line 389 is `}` (the closing brace of `timeReferenceAt`, whose last statement at line 388 is `  return result.wayId === wayId ? result : null;`), line 390 is blank, line 391 is `export type EditGatesOutcome =`.

Insert between line 389 and line 391 (keep one blank line on each side):

```ts

/** virgin-cycle18 brief 04 follow-up (Inspect finding 1, 2026-09-30): a way
 * whose reference ride has NO stored result never appears in RESULTS —
 * buildResultsList walks stored results only. That is every way created
 * retroactively from RIDES before brief 02 (its marker was never cleared,
 * so backfillMissingResults skips the reference forever) and every
 * reference whose v1 lap came out `missed` (the candidate loop refuses it
 * and marks it). Time the reference against its OWN way at the way's
 * CURRENT gate set, any lap quality (exactly what createRouteFromDraft does
 * at creation), store it, and only then drop the marker (a marker is only
 * dropped when a result replaces it, so an unreadable recording is not
 * re-run through the candidate loop on every mount). Returns true iff a
 * result was stored this call. false — and no write — when the way is not
 * user-owned, has no referenceRideId, already has a stored reference
 * result, has no resolvable ref line or gate set, or its recording is
 * absent/unreadable/too short/disowned by derive. Never throws. Called by
 * ui/rideHomes.ts settleRideHomes between its backfill and free-filing
 * steps. */
export async function timeMissingReference(wayId: string, fs: FsAdapter): Promise<boolean> {
  try {
    const user = userCatalog();
    const way = user.ways.find((w) => w.id === wayId);
    const refRideId = way?.referenceRideId ?? null;
    if (!way || refRideId === null || getStoredResult(refRideId) !== null) return false;
    const ref = userRefFor(way.refLineId);
    const gates = gateSetFor(user, wayId, way.gateSetVersion);
    if (!ref || !gates) return false;
    const own = await timeReferenceAt(refRideId, wayId, ref, gates.chainageM, gates.version, fs);
    if (own === null) return false;
    await saveResult(own);
    await clearUnmatched(refRideId);
    return true;
  } catch {
    return false;
  }
}
```

All names used (`userCatalog`, `userRefFor`, `gateSetFor`, `getStoredResult`, `saveResult`, `clearUnmatched`, `timeReferenceAt`, `FsAdapter`) are already imported/defined in this module (lines 18, 20, 22, 23, 27-28, 375). If any is not, stop.

## Edit B — `app/src/ui/rideHomes.ts`: call it between step 1 and step 2

**Anchor B1:** line 29 is exactly `import { currentCatalog } from '../store/catalogStore.ts';`. Replace with:
```ts
import { currentCatalog, userCatalog } from '../store/catalogStore.ts';
import { timeMissingReference } from '../store/routeFromRide.ts';
```

**Anchor B2 (header comment):** line 12 is exactly ` *     free mode; the way back is "Not a free ride" on the ride detail);` and line 13 is ` *  2. then every ended ride still without a home is filed as a free ride`. Insert between them:
```
 *  1b. (Inspect follow-up, 2026-09-30) every user way whose reference ride
 *     has no stored result gets one — timed on its own way at the current
 *     gates, any quality (store/routeFromRide.ts timeMissingReference) —
 *     because RESULTS lists stored results only, and a reference stuck
 *     behind a pre-brief-02 marker or a `missed` v1 lap was invisible there;
```

**Anchor B3 (the code):** after Edit B1 the lines shift by +1. The block that was lines 76-79 now reads (lines 77-80):
```ts
      return wayIdsOfSport(currentCatalog(), effectiveRideSportId(sportByRideId.get(rideId), f), f);
    });

    // 2. Whatever still has no home is a free ride.
```
(after Edit B2 as well, add another +5: lines 82-85). Between the `    });` line and the `    // 2. Whatever still has no home is a free ride.` line insert (keeping one blank line above and below):
```ts
    // 1b. A way whose reference ride has no stored result is invisible in
    // RESULTS (it lists stored results only) — time the reference on its own
    // way now. Idempotent: a stored reference result short-circuits.
    for (const w of userCatalog().ways) await timeMissingReference(w.id, fs);
```
Verify the resulting order inside the `try`: step 1 (`backfillMissingResults`), then 1b, then `const ways = currentCatalog().ways;` / `orphanRides(...)`. If the surrounding text differs, stop.

## Edit C — `app/src/ui/RecordScreen.tsx`: drop the stale in-session copy

**Anchor:** lines 836-839 are exactly
```ts
      // virgin-cycle18 brief 04: the v2 re-time of the reference is what the
      // next ride races — mirror it (replaceRecorded drops it if it no longer ranks).
      const refRide = getStoredResult(a.wayId.startsWith('way:') ? a.wayId.slice('way:'.length) : a.wayId);
      if (refRide) replaceRecorded(refRide);
```
Replace with
```ts
      // virgin-cycle18 brief 04: the v2 re-time of the reference is what the
      // next ride races — mirror it (replaceRecorded drops it if it no longer
      // ranks). referenceRetimed:false = saveAdjustedGates REMOVED the v1
      // result: drop the in-session copy too (Inspect follow-up 2026-09-30),
      // or the next ride this session would race a dot timed at the old gates.
      const refRideId = a.wayId.startsWith('way:') ? a.wayId.slice('way:'.length) : a.wayId;
      const refRide = getStoredResult(refRideId);
      if (refRide) replaceRecorded(refRide);
      else dropRecorded(refRideId);
```
`dropRecorded` is already imported at line 55 (`import { dropRecorded, rememberRide, replaceRecorded } from './lastRide';`). If not, stop.

## Edit D — `app/src/ui/RideDetailScreen.tsx`: same

**Anchor:** lines 332-333 are exactly
```ts
      const refRide = getStoredResult(request.rideId); // virgin-cycle18 brief 04: the v2 re-time
      if (refRide) replaceRecorded(refRide);
```
Replace with
```ts
      const refRide = getStoredResult(request.rideId); // virgin-cycle18 brief 04: the v2 re-time
      if (refRide) replaceRecorded(refRide);
      else dropRecorded(request.rideId); // its v1 result was removed — no stale in-session copy (Inspect follow-up 2026-09-30)
```
`dropRecorded` is already imported at line 50. If not, stop.

## Edit E — test, `app/tests/routecreation_suite.ts`

**Anchor E1:** line 639 is exactly `const wphRouteFromRide = await import('../src/store/routeFromRide.ts');`. After it insert:
```ts
const wphRideHomes = await import('../src/ui/rideHomes.ts');
const wphFreeRides = await import('../src/store/freeRides.ts');
```

**Anchor E2:** the file is 1278 lines; lines 1276-1278 are
```ts
    assert(wphResultsStore.getStoredResult('create9')?.wayId === 'way:create9', 'create derives its founding ride itself (c18-04 decision 8 supersedes 02 decision 4)');
  }
});
```
(the end of test `c18-02 4`; after Edit E1 these are lines 1278-1280). `c18Setup` (defined ~line 1185: `async function c18Setup(holeFrom?: number, holeTo?: number)`, establishes the WphRoute ref and writes ride `oldref1`, WphRoute's `referenceRideId`) must exist — if not, stop. Append at the end of the file:

```ts

test('c18-04 follow-up (settleRideHomes / timeMissingReference): a way whose reference ride sits behind an unmatched marker gets its reference result stored by one settle — it appears in RESULTS without a gate re-save', async () => {
  const { fs } = await c18Setup();
  await fs.ensureDir('results');
  await fs.writeText('results/unmatched.json', JSON.stringify({
    schemaVersion: 1, entries: [{ rideId: 'oldref1', engineVersion: wphResultsStore.BACKFILL_ENGINE_VERSION }],
  }));
  await wphResultsStore.initResultsStore(fs);
  wphFreeRides.resetFreeRidesForTests();
  await wphFreeRides.initFreeRidePersistence(fs);
  await fs.writeText('index.json', JSON.stringify({ schemaVersion: 1, rides: [
    { rideId: 'oldref1', file: 'rides/oldref1.jsonl', startMs: 1_700_100_000_000, endMs: 1_700_100_398_000, nFixes: 200, status: 'ended' },
  ] }));
  await wphResultsStore.backfillMissingResults(fs, ['oldref1']);
  assert(wphResultsStore.getStoredResult('oldref1') === null, 'precondition: the marker keeps the reference un-timed by the backfill');

  const filed = await wphRideHomes.settleRideHomes(fs);
  assert(filed.length === 0, `a reference ride is never filed free, got ${filed.join()}`);
  const r = wphResultsStore.getStoredResult('oldref1');
  assert(r !== null && r.wayId === 'WphRoute' && r.derivedBy.gateSetVersion === 1,
    `settle stored the reference on its own way at the current gates, got ${JSON.stringify(r && { wayId: r.wayId, v: r.derivedBy.gateSetVersion })}`);
  assert(wphResultsStore.storedResultsForWay('WphRoute').some((x) => x.rideId === 'oldref1'), 'RESULTS (storedResultsForWay) now lists it under WphRoute');
  assert(!wphResultsStore.isUnmatched('oldref1'), 'the marker is gone');
  assert(wphFreeRides.freeRideResults().length === 0, 'no free record was written');
  assert(await wphRouteFromRide.timeMissingReference('WphRoute', fs) === false, 'idempotent: a stored reference result short-circuits');
  await wphResultsStore.flushResultWrites();
  assert(!(fs.files.get('results/unmatched.json') ?? '').includes('oldref1'), 'and the marker is gone on disk');
});
```

## Verification (both must be clean; report the exact counts)

```
cd app && node --experimental-strip-types tests/run.ts
cd app && ./node_modules/.bin/tsc --noEmit
```
Expected: previously 747 tests / 744 pass / 0 FAIL → now 748 tests / 745 pass / 0 FAIL (the 3 pre-existing non-pass entries unchanged); tsc exit 0. Also confirm `grep -n "timeMissingReference" app/src` → the definition in routeFromRide.ts and one call in rideHomes.ts. Report: files changed, test counts before/after, any anchor mismatch verbatim.
