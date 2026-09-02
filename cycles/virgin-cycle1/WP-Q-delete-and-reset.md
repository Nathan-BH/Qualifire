**Status: DONE — both Part A and Part B landed on the device 2026-09-02 (Execute pass), independently inspected (fresh Fable context, highest-scrutiny pass of the cycle given this WP is destructive). 358 tests, 355 pass, 0 fail, 3 skip (12 new — 8 in the new `catalogdelete_suite.ts`, 2 in `userrefs_suite.ts`, 1 in `resultsstore_suite.ts`, 1 in `catalogstore_suite.ts`; the executor's own report said 357/354, a stale-baseline arithmetic slip caught and corrected by the inspector's independent rerun). Cascade correctness was hand-traced by the inspector against a scratch catalog (shared landmark, last-route-drops-way, seed-item protection, multi-gate-set cleanup) and held up; the `moveSync` filesystem call was independently confirmed to exist in the installed `expo-file-system@56.0.9` (not just trusted from the executor's claim) — see `TOKEN-USAGE.md` for the inspection details. One post-inspection fix applied directly by the coordinator (chore, <10 lines): the reset failure dialog claimed "data was moved aside" even when the move itself never ran; now conditional on whether the move actually happened. `tsc --noEmit` could not be run this session (cloud container has no `node_modules`, no network to fetch a standalone `typescript`) — every edited file got a careful manual type-correctness pass instead, including confirming `expo-file-system@56.0.9`'s actual `Directory` method signatures against its own `.ts` sources (see the `archiveStorageRoot` note below). Every cascade rule and safety rail in §3 landed as specified; see the README's "Testing WP-Q today" section for files touched, the verification commands, and the on-device acceptance checklist (§4.3) still outstanding — no device shell this session.**

**One real discrepancy from this brief's own assumption (§3.2): `root.move(aside)` was written assuming a synchronous call, but the installed `expo-file-system` has `Directory.prototype.move` as ASYNC (`Promise<void>`) — `moveSync` is its synchronous twin (confirmed present in the same version) and is what `archiveStorageRoot`'s synchronous `string | null` signature actually needs; used that instead of the copy+delete fallback this section anticipated, since move-not-delete could be kept exactly as specified.**

**Two minor wording spots were a judgment call, not given verbatim in this brief: the "delete way" confirm body when the way has more than one route (§3.3 gives exact copy only for the route-delete flow's two cases), and the reset button's "danger/dim colour" (§3.4) — this repo's own D-013 doctrine is "no red anywhere" and `PaddockTheme` has no `danger` token, so it uses `t.textDim` (RidesScreen's own delete-button colour), with the destructive styling living entirely in the Alert.alert confirm.**

---

**Original status line (superseded above): Brief written 2026-09-02 (evening). Ready to execute — independent of every other WP, needs no decision from Nathan. Two halves that can land separately: Part A (per-item delete on ROUTES) and Part B (Reset to virgin on SETTINGS → DATA). Recommended: land both in one Execute pass; if split, A first.**
**Review doc item: none — new ask, Nathan 2026-09-02 ("add a work package with the options to delete a routes and landmarks (+ maybe a reset button) so i can try the real virgin app again from scratch"). The "known gates (black circles on the map)" half of the same message is NOT this WP — it is WP-E, blocked on Q6; see §2.6 for why a reset cannot fix it. Size: medium (two new pure modules + tests, one new expo-only fs helper, edits to `RoutesScreen.tsx` and `settings.tsx`).**
**Verified against the device tree as staged 2026-09-02 evening (post-WP-D: `RecordScreen.tsx` / `routeMapView.tsx` / `routeMapGeo.ts` mtime 2026-09-02; `catalogStore.ts`, `settings.tsx`, `userRefs.ts`, `wayCreation.ts`, `catalog.ts` mtime 2026-09-01; `RoutesScreen.tsx`, `RidesScreen.tsx`, `freeRides.ts`, `core.ts`, `expoFsAdapter.ts` older). Every file:line below was read, not inferred from the digest. Line numbers in `RecordScreen.tsx` drift with every WP — re-grep before editing.**

---

# WP-Q — Delete routes / ways / places, and a "Reset to virgin" action

## 1. Goal

Give Nathan (and, later, any rider) two things the app has no way to do today:

- **Part A — per-item delete.** Remove a route he created by mistake, a whole way (both of its endpoints if nothing else uses them), or a stray place — from the ROUTES tab, where those things are already listed, with the same demoted-into-the-expanded-card + confirm-Alert pattern RIDES uses for deleting a ride. Cascades are explicit and honest: the catalog must still validate after every deletion, so deleting a way's last route deletes the way, and deleting a way frees its landmarks only when no other way still uses them.
- **Part B — Reset to virgin.** One deliberately hard-to-hit action in SETTINGS → DATA that returns the phone to the state of a fresh install of this build: no rides, no results, no places/ways/routes, no reference lines, no free-ride cache — so Nathan can re-run the first-launch, first-ride, "name your endpoints" flow from scratch as often as he likes. **Settings and theme are kept** (§3.7 — a judgment call, flagged as revisable). Nothing is destroyed: the old storage root is moved aside, never deleted (§3.5), matching the repo's own mv-not-rm doctrine.

Explicitly **not** this WP: the "black circles" (bundled gates on a new>>new free ride). That is `WP-E-virgin-manifest-leak.md`, blocked on **Q6**, and §2.6 explains why a reset — even a factory reset of the whole phone — cannot make them go away. Do not design a second fix for it here.

## 2. Current state (verified)

### 2.1 What is persisted, and where — the complete inventory a reset has to know about

Two different roots are in play, which is the single most important fact for Part B:

| # | File / dir | Root | Owner (writer) | What it is | Reset? |
|---|---|---|---|---|---|
| 1 | `catalog.user.json` | `<docs>/qualifire/` | `store/catalogStore.ts:40,116` `saveUserCatalog()` | this phone's landmarks, ways, routes, gate sets (seed is never copied to disk — `catalogStore.ts:14-16`) | **yes** |
| 2 | `refs.user.json` | `<docs>/qualifire/` | `live/userRefs.ts:31,170` `saveUserRef()` | reference polylines for phone-born routes, keyed by `route.refLineId` (= route id, `wayCreation.ts:235`) | **yes** |
| 3 | `rides/<rideId>.jsonl` + `rides/<rideId>.events.jsonl` | `<docs>/qualifire/` | `storage/core.ts:19,69-75` | raw trace + GPX+ diagnostics sidecar, append-only (D-023) | **yes** (moved aside, not deleted — §3.5) |
| 4 | `index.json` | `<docs>/qualifire/` (**root**, not `rides/`) | `storage/core.ts:20,101-132` | ride listing cache; auto-rebuilt from `rides/` when missing | **yes** |
| 5 | `results/<rideId>.json`, `results/index.json`, `results/unmatched.json` | `<docs>/qualifire/` | `store/resultsStore.ts:49-51,224,240,375` | derived per-ride scoring, its index, and the "backfill tried and found nothing" markers | **yes** |
| 6 | `free-rides-cache.json` | `<docs>/qualifire/` | `store/freeRides.ts:30,121-137` | every free ride's gate crossings/sectors, one flat file | **yes** |
| 7 | `results-cache.json` | `<docs>/qualifire/` | nobody since cycle 024 (`lastRide.ts:12-15`: "left on disk untouched, never read") | B-40 legacy | yes (goes with the root) |
| 8 | `settings.json` | `<docs>/qualifire/` | `ui/themeContext.tsx:13-15,30-40` | **theme mode only** (`{themeMode}`) | **kept** — read before the move, written back after (§3.5) |
| 9 | `settings.json` | `<docs>/` (**document root, outside `qualifire/`**) | `ui/settings.tsx:42` (legacy API `FileSystem.documentDirectory`) | the five preferences: redLight, startMode, tower, liveMap, earcons | **kept** (§3.7) |
| 10 | `qualifire-active-ride.json` | `<docs>/` (outside `qualifire/`) | `location/session.ts:44,47` | "a ride is being recorded" marker for headless relaunch | **not touched** — reset is refused while it exists (§3.6) |

Note for whoever reads the digest that led here: it placed the ride index at `rides/index.json` and called `ui/lastRide.ts` a "ride in progress recovery cache". Both are wrong — the index is `index.json` at the root (`core.ts:20`), and `lastRide.ts` is the Result tab's display state + the `recorded` comparison window; the recovery marker is `location/session.ts` (#10).

`settings.tsx:1-5`'s header ("In-memory only for now: nothing persists across a restart") is stale — `:42-74` persists to #9. Fix the comment while in the file (§3.8).

### 2.2 No catalog deletion exists; the seam does

- `saveUserCatalog(next: Catalog)` (`catalogStore.ts:116-126`) replaces the whole user catalog after validating the **merge** with the seed (`validateCatalog(mergeCatalogs(seed, next))`). Its doc comment `:27-28` ("Nothing calls saveUserCatalog() yet") is stale — `RecordScreen.tsx` calls it from the naming flow (`~:516`) and the gate-adjust save (`~:576`). Any deletion is "filter the user catalog, call `saveUserCatalog`"; validation then guards every cascade rule for free.
- The three delete functions that do exist — `deleteRide` (`core.ts:296`), `removeStoredResult` (`resultsStore.ts:240`), `dropRecorded` (`lastRide.ts:285`) — are ride-only. `RecordScreen.tsx:588-594` ("exactly ONE deletion mechanism") and `RidesScreen.tsx:115-144` are the idiom: `Alert.alert(title, body, [Cancel, {style:'destructive'}])`, delete demoted into the expanded row, never on the collapsed row.
- `userRefs.ts` has `saveUserRef` and a test-only `resetUserRefsForTests` (`:188`) but no per-id removal.
- `resultsStore.ts` has `removeStoredResult(rideId)` but nothing keyed by route.

### 2.3 The validation rules that dictate the cascades (`store/catalog.ts:47-112`)

| Rule | Line | Consequence for delete |
|---|---|---|
| `way ${w.id}: no routes` when `routeIds.length === 0` | `:84` | deleting a way's **last** route must delete the way too (or be refused) — there is no "empty way" |
| `way ${w.id}: unknown start/end` | `:79-80` | a landmark still referenced by any way can **never** be deleted on its own |
| `way ${w.id}: unknown route ${rid}` | `:96-99` | `way.routeIds` must be pruned when a route goes |
| `gate set for unknown route` | `:103` | **all** versions of the route's gate sets go with the route (history is per-route; nothing else references it) |
| `route ${r.id}: unknown way` | `:91` | deleting a way must delete every route on it |
| (no rule) | — | an **orphan landmark** (referenced by no way) is valid. Nothing creates one today; Part A's cascade removes them so they don't accumulate, and shows a delete button only on one that is already orphaned |

Seed entries win every id collision in `mergeCatalogs` (`catalog.ts:244-256`) and the seed is never on disk — so **a seed item cannot be deleted from the phone at all** (filtering it out of the user catalog is a no-op). On the `virgin` EAS profile (`eas.json:16-21`, `seed.ts:34-35` → `emptyCatalog()`) every item is user-created and therefore deletable; on Nathan's dev/preview build the 6/13/20 seed items must render with no delete affordance. Membership test: `userCatalog()` (`catalogStore.ts:70`).

A user way may reference a **seed** landmark (`draftWayCreation` reuses any existing disc — `wayCreation.ts:146-148,163-165`); deleting that way must simply not touch it (it isn't in the user catalog). A user landmark can be shared by two user ways (Home is the start of Home→Work and the end of Work→Home — `lm:<rideId>:start` / `:end` ids, `wayCreation.ts:153-155,173-174`), so landmark removal must be "orphaned by this deletion", never "belonged to this way".

### 2.4 What else points at a route, and what to do about each

| Referrer | Where | Decision |
|---|---|---|
| `results/<rideId>.json` with `routeId === deleted` | `resultsStore.ts`; rendered via `routeLabel(id)` which returns the raw id for an unknown route (`defaultRoute.ts:30-32` → "route:20260901-091752-f6ca" on the RIDES row) | **remove** those results (they are derived, D-023: "deleting every result must lose nothing but CPU" — `types.ts:9-10`). The rides themselves stay; `backfillMissingResults` (`resultsStore.ts:403`) then re-derives them against the remaining routes on the next RIDES visit / boot, and writes an `unmatched.json` marker if nothing matches — exactly what a ride that never matched looks like. |
| `lastRide.ts`'s in-memory `recorded[]` and `last` | `:42-43` | `dropRecorded(rideId)` per removed result; `clearLastRide()` if `last.routeId === deleted` |
| `refs.user.json` entry under `route.refLineId` | `userRefs.ts` registry | **remove** (new `removeUserRef`, §3.2) — otherwise `refFor()` keeps resolving a ghost line for a route that no longer exists |
| `free-rides-cache.json` crossings/sectors with that `routeId` | `freeRides.ts:38-39` | **leave** — they are a record of what a free ride actually crossed at the time; cosmetic raw-id label on the FREE RIDE board is acceptable and out of scope. Note in the confirm text? No — nobody will notice; keep the dialog short. |
| `rides/<referenceRideId>.jsonl` | `Route.referenceRideId` (`types.ts:50-54`) | **never** — raw rides are the truth; deleting a route is a catalog edit, not a ride deletion |
| RECORD tab's `routePick` / `from` / `to` | `RecordScreen.tsx:239` (`useState`) | nothing to do: `App.tsx:128-133` mounts one tab at a time, so RecordScreen remounts fresh when Nathan comes back from ROUTES/SETTINGS and re-reads `currentCatalog()` per render (`:~750`) |

### 2.5 Nothing in the app can "start over"

`resetCatalogStoreForTests` (`catalogStore.ts:137`), `resetResultsStoreForTests` (`resultsStore.ts:459`), `resetRecordedForTests` (`lastRide.ts:294`), `resetFreeRidesForTests` (`freeRides.ts:188`), `resetUserRefsForTests` (`userRefs.ts:188`) are test seams — none reachable from UI, and all of them **disarm** persistence (`armedFs = null`), so they cannot be called alone in production without re-running the init chain (`App.tsx:94-105`: `initCatalogStore → initUserRefs → initRideHistory`, plus `initFreeRidePersistence`). Two of the inits do **not** clear state on their own: `initRideHistory` only appends to `recorded` (`lastRide.ts:246-252`) and `initFreeRidePersistence` dedupes into the existing `rides` array (`freeRides.ts:167-172`). `initCatalogStore` (`:79`) and `initUserRefs` (`:148`) do reset theirs. This matters because `rememberFreeRide` (`freeRides.ts:132-136`) rewrites the **whole** in-memory list to disk on the next free ride — if the array is not cleared after a wipe, the wiped free rides come straight back.

The storage root is `<documentDirectory>/qualifire/` (`expoFsAdapter.ts:9-16`). `FsAdapter` (`fsAdapter.ts:7-22`) has `deleteFile` but no directory delete/move, and `listDir` returns **files only** (`expoFsAdapter.ts:54-62` filters `instanceof File`), so a root-level enumeration would silently miss `rides/` and `results/`. `SEED_MODE` is a build-time constant (`seed.ts:34-35`); "virgin" on disk simply means "the `qualifire/` root does not exist yet" — every init tolerates a missing file/dir (`catalogStore.ts:81-92`, `userRefs.ts:150-152`, `resultsStore.ts:170-180`, `core.ts:107,113`, `freeRides.ts:163-164`).

### 2.6 Why "Reset to virgin" does NOT remove the black circles — read this before promising Nathan anything

The rings Nathan sees on a new>>new free ride come from the **bundled asset manifest**, not from any file on the phone. Chain, verified:

1. Both endpoints 'new' → `freeRideRouteIds(CATALOG, null, null)` returns `null` (`catalog.ts:174-186`, "both null … NO filtering, deliberately") → `RecordScreen.tsx:766-768` `freeRouteIds = null` → running rung passes `gatesOnly={live.mode === 'free'}` `gateRouteIds={rideFreeRouteIds}` (`:949-951`).
2. `routeMapView.tsx:376-377,387` → `allGatesFeatureCollection(ASSETS, …, null)` / `allGatesBounds(ASSETS, null)`.
3. `routeMapGeo.ts:112` and `:138`: `const ids = routeIds ?? Object.keys(assets);` — with `null`, **every key of `assets/routes/routes.json`** (the 20 Leuven routes, listed in WP-P §2.3) is drawn. The runtime catalog is never consulted on this path.

So on a factory-fresh virgin install — empty catalog, no `qualifire/` directory at all — the very first free ride already shows all 20 routes' gates. A reset returns the phone to exactly that state and therefore **reproduces** the black circles rather than removing them. The only two fixes are the two Q6 options: strip the bundled assets from the `virgin` profile, or make every gates-only call site filter by the runtime catalog (WP-E's "fold into WP-C's `allRouteAssets()`" note). **Q6 is a hard, separate requirement for a clean virgin re-test**, and answering it has become more urgent because Part B otherwise hands Nathan a perfectly reset phone that still draws somebody else's gates on ride 1 — the first thing he will see. An addendum saying exactly this has been added under Q6 in `QUESTIONS-FOR-NATHAN.md`.

One nuance worth knowing: with **one** known end (e.g. Home known after ride 1, destination 'new'), `freeRideRouteIds` filters to that landmark's ways, and the resulting `route:*` ids have no asset → `routeMapGeo.ts:116` `if (!asset) continue` → no rings at all. The leak is specific to the both-ends-unknown case — i.e. precisely ride 1 on a virgin phone.

## 3. Proposed changes

### 3.1 New pure module `app/src/store/catalogDelete.ts` (headless-testable, no fs, no React)

Operates on the **user** catalog only (what `userCatalog()` returns), returns the next user catalog plus a report the UI uses for confirm text and cascades. Never throws; unknown ids return the input unchanged with an empty report.

```ts
export interface CatalogDeletion {
  next: Catalog;
  removedRouteIds: string[];
  removedWayIds: string[];
  removedLandmarkIds: string[];
  /** refLineIds whose refs.user.json entry should go (one per removed route) */
  removedRefLineIds: string[];
}

/** Removes one route. If it was its way's only route the way goes too, and any
 * landmark left unreferenced by every remaining user way AND every seed way
 * goes with it. All gate-set versions for the route are removed. */
export function removeRoute(userCat: Catalog, seedCat: Catalog, routeId: string): CatalogDeletion;

/** Removes a way and every route on it (same cascades as removeRoute, applied to all). */
export function removeWay(userCat: Catalog, seedCat: Catalog, wayId: string): CatalogDeletion;

/** Removes a landmark ONLY if no user way and no seed way references it;
 * otherwise returns the input unchanged (report empty). The UI never offers
 * this on a referenced landmark, so this is belt-and-braces. */
export function removeLandmark(userCat: Catalog, seedCat: Catalog, landmarkId: string): CatalogDeletion;

/** Which of these ids are seed-owned (undeletable). UI uses it to hide buttons. */
export function isSeedOwned(seedCat: Catalog, kind: 'landmark' | 'way' | 'route', id: string): boolean;
```

`seedCat` is passed in (not imported from `seed.ts`) so the suite can exercise both the empty-seed and shipped-seed cases without touching `process.env` — the same reason `catalogForSeedMode()` exists. Callers pass `shippedCatalog()`. The reason seed ways matter for the orphan check even though the user catalog cannot reference them the other way round: a *seed* way could in principle reference a user landmark only if ids collided, which `mergeCatalogs` forbids — so in practice `seedCat.ways` never references a user landmark; include the check anyway (one `some()`), it costs nothing and makes the function's contract total.

Cascade algorithm (removeRoute): drop the route; drop `gateSets.filter(g => g.routeId === routeId)`; find its way; prune `way.routeIds`; if now empty, drop the way; then for each landmark id of every dropped way, drop the landmark iff no remaining user way and no seed way references it. `removeWay` = `removeRoute` over `way.routeIds` (which also drops the way on the last one) — implement it that way so there is one cascade, not two. Preserve array order everywhere ("first in catalog order" rules — `catalog.ts:242`).

### 3.2 Small additions to existing stores (each ≤15 lines, mirrors a sibling)

- `live/userRefs.ts`: `export function removeUserRef(id: string): Promise<void>` — `registry.delete(id)` then the same `writeTail` re-encode-whole-registry write `saveUserRef` does (`:170-180`). No-op when absent.
- `store/resultsStore.ts`: `export function storedResultsForRoute(routeId: string): RideResult[]` (pure filter over `store`) — the UI then calls the existing `removeStoredResult(rideId)` + `dropRecorded(rideId)` per hit, so RIDES' "exactly ONE deletion mechanism" (`RecordScreen.tsx:590`) stays true. Do **not** add a bulk delete that bypasses `removeStoredResult`.
- `ui/lastRide.ts`: rename the doc comment on `resetRecordedForTests` — it is about to have a production caller — and export `resetRecorded` as the primary name with `resetRecordedForTests` kept as an alias (so no test file changes). Same for `freeRides.ts`: `resetFreeRides` + alias. `initCatalogStore`/`initUserRefs`/`initResultsStore` already clear their own state on call (§2.5), so nothing else changes.
- `storage/expoFsAdapter.ts`: one new **expo-only** export (this file is already the only expo importer in `storage/`):
  ```ts
  /** WP-Q reset: moves the whole storage root aside (never deletes — repo doctrine)
   * and returns the new sibling directory's name. Root does not exist => returns null. */
  export function archiveStorageRoot(rootName = 'qualifire', stamp: string): string | null
  ```
  Implementation: `const root = new Directory(Paths.document, rootName); if (!root.exists) return null; const aside = new Directory(Paths.document, \`${rootName}.reset-${stamp}\`); root.move(aside); return aside.name;`. **Verify `Directory.prototype.move` exists in the installed `expo-file-system` (SDK 56 modern API — `expoFsAdapter.ts:3-5`); if it does not, do `root.copy(aside); root.delete();` and say so in the status line.** Not headless-testable by design (like everything else in this file); the on-device acceptance in §4 is its test. Do not add a `moveDir` to `FsAdapter` — moving the adapter's own root is outside the "paths relative to root" contract (`fsAdapter.ts:5`), and nothing else needs it.

### 3.3 Part A — ROUTES tab UI (`app/src/ui/RoutesScreen.tsx`)

Mirror `RidesScreen.tsx:115-144,224-241` exactly in shape: destructive actions live only inside an expanded card, styled like `deleteBtn`/`deleteText` (dim outline, never the yellow accent), behind an `Alert.alert` with `Cancel` + `{style:'destructive'}`.

1. **Per-route delete** — inside the already-existing expanded way card (`:87-105`), under each route's `RouteMapView`, a `delete route` outline button. Hidden when `isSeedOwned(seed, 'route', r.id)`. Confirm body, built from the `CatalogDeletion` report (run the pure function *first*, then show the Alert, then persist on confirm):
   - routes remain on the way: `Delete "{routeVariantLabel}" on {from} → {to}?\nIts gates and reference line go with it. {n} scored ride{s} on this route will be re-matched against your other routes; the ride recordings themselves are kept.`
   - last route on the way: prepend `This is the only route on {from} → {to}, so the way is removed too.` and, if `removedLandmarkIds` is non-empty, `{labels} are no longer used by any way and will be removed as places.`
2. **Delete way** — one `delete way` outline button at the bottom of the expanded way card (below the routes). Hidden when `isSeedOwned(seed, 'way', w.id)`. Same body shape, always with the landmark clause when applicable.
3. **Places** — in the YOUR PLACES card (`:33-48`), a landmark row gets a `delete` outline button **only** when it is user-owned **and** no way in `currentCatalog()` references it (`removeLandmark` would otherwise be a no-op anyway). Referenced landmarks show nothing extra — no "used by N ways" text; the WAYS card already says it. This will render for nobody today (nothing creates orphans) and is there so a future orphan is not stuck.
4. **On confirm**, in this order, awaited: `const errs = await saveUserCatalog(deletion.next)` — if `errs.length`, `Alert.alert('Could not delete', errs.join('\n'))` and stop (nothing else has been touched yet); then `for (id of removedRefLineIds) await removeUserRef(id)`; then for every `storedResultsForRoute(rid)` hit: `await removeStoredResult(r.rideId); dropRecorded(r.rideId);` and `if (getLastRide()?.routeId === rid) clearLastRide()`; then a local state bump so the screen re-reads `currentCatalog()` (RoutesScreen reads it per render at `:27` — a `useState` tick is enough, like `RidesScreen`'s `resultsTick`). Order matters: the catalog write is the one that can refuse, so it goes first.
5. Do not touch `RecordScreen.tsx` for Part A (§2.4 last row).

### 3.4 Part B — SETTINGS → DATA UI (`app/src/ui/settings.tsx`)

Add a third row to the DATA card (`:208-228`), after the two share rows, visually separated (a top border or a small gap) so it does not read as a sibling of "share":

- Label `Reset to virgin`, hint `move every ride, result, place, way and route aside and start this build over from its first launch — settings and theme are kept`. Button text `reset…` (the ellipsis signals a confirmation follows), styled like `shareBtn` but with the text in the theme's danger/dim colour, never the accent.
- **Two-step confirm**, both `Alert.alert`:
  1. Precondition: `if (await loadSession()) { Alert.alert('A ride is being recorded', 'Stop it on the RECORD tab first.'); return; }` (`location/session.ts:51`). Then gather counts — `(await listRides()).length`, `currentCatalog()` minus seed for places/ways/routes (use `userCatalog()`), `freeRideResults().length` — and show: `Reset to virgin?` / `{r} ride{s}, {p} place{s}, {w} way{s}, {q} route{s} and every result will be moved out of the app. Your settings and theme stay. Export anything you want to keep first (RIDES → Export GPX+, or the two share buttons above).` Buttons: `Cancel`, `Continue…` (default style — not yet destructive).
  2. `Really reset?` / `This cannot be undone from inside the app.` Buttons: `Cancel`, `Reset` with `style: 'destructive'`.
- **On confirm**, in this order:
  1. `const fs = createExpoFsAdapter(); const theme = await fs.readText('settings.json');` (the theme file, #8 — read before the move).
  2. `archiveStorageRoot('qualifire', stampFor(Date.now()))` — stamp `YYYYMMDD-HHMMSS`, same shape as `makeRideId` (`core.ts:59-67`); reuse `dateStamp()` (`settings.tsx:152`) extended with a time part, or add a sibling. A `null` return (no root yet) is fine — continue.
  3. `if (theme !== null) await fs.writeText('settings.json', theme)` — recreates the root with only the theme in it (`writeText` calls `ensureRoot()`, `expoFsAdapter.ts:35`).
  4. In-memory: `resetRecorded(); resetFreeRides();` then re-run the boot chain exactly as `App.tsx:94-105` does: `await initCatalogStore(fs); await initUserRefs(fs); await initRideHistory(fs); await initFreeRidePersistence(fs);` — all against the now-empty root, all tolerant of missing files. `initRideHistory` internally calls `initResultsStore`, which clears and re-arms the results store (`resultsStore.ts:139-142`). `clearLastRide()` is covered by `resetRecorded()`.
  5. `Alert.alert('Reset done', 'This build is back at its first launch. Close Qualifire fully and reopen it to see the launch animation and a clean RECORD tab.\nYour old data is in <documents>/{asideName} on the phone.')`. Recommend the restart honestly; do not claim the running screens are pixel-identical to a cold start (the launch animation plays once per JS start — `App.tsx:162-168` — and `storage/index.ts:21-24`'s singleton keeps a stale `endedThisProcess` set, harmless but not "virgin").
- Wrap steps 1-4 in one try/catch → `Alert.alert('Reset failed', message)`. If step 2 succeeded and a later step throws, the phone is still in a consistent "empty root" state (every init tolerates it), so no rollback is needed — say so in the catch text: `…The data was moved aside; restart the app.`

### 3.5 Why move-aside and not delete

Repo ground rule (`CONTEXT.md` §"Ground rules"): never delete, `mv` to `safe_to_delete/`; raw ride recordings are append-only. `resultsStore.ts:237-239` carves out "on-device derived cache entries", and Nathan ratified per-ride deletion for rides he "genuinely did not do or should not count" (`RecordScreen.tsx:591-592`) — but a whole-history wipe is neither a cache nor a ride he didn't do. Moving `qualifire/` → `qualifire.reset-<stamp>/` costs one native rename, leaves every JSONL byte on the phone (recoverable with `adb` or a future restore chore — **out of scope**, do not build it), and makes the second Alert's "cannot be undone from inside the app" wording exactly true rather than a euphemism. Disk growth is bounded by how often Nathan resets (tens of MB each); a pruning chore can come later if it ever matters.

Rejected alternative: add `FsAdapter.deleteDir()` and delete #1-#7 by name. Testable with the memory adapter, but it destroys data and it is brittle — a future WP adding a new cache file under the root would silently survive every reset unless it remembered to add itself to the list. Moving the root catches everything, present and future.

### 3.6 Safety rails, summarised

- Refused while a ride is recording (session marker, §3.4 step 1). Belt-and-braces: `deleteRide` already refuses on a live ride (`core.ts:297-299`), but the reset does not go through it, hence the explicit check.
- Two confirmations, the second destructive-styled, counts shown up front, export path named.
- Nothing deleted; root moved aside.
- Settings (#9) and theme (#8) survive.
- Per-item delete: one confirm (like RIDES), cascade spelled out in the body text, catalog write validated before anything else is touched.
- No delete affordance on seed-owned items (they could not be deleted anyway — §2.3).

### 3.7 Judgment call: reset keeps settings.json and the theme — flagged as revisable

Arguments for wiping them too: a stranger's fresh install has `DEFAULTS` (`settings.tsx:28-34`) and daylight; if Nathan has flipped `startMode` to `pick` or `liveMap` off, his "virgin" re-test differs from a stranger's on those toggles.

Arguments for keeping them (chosen): (1) the payload of Nathan's request is *data* — "delete routes and landmarks … try the app again from scratch" — the six toggles are visible on the SETTINGS tab and re-defaulted by hand in ten seconds if he wants a stranger's exact experience, and the first Alert tells him they were kept; (2) the asymmetry — silently resetting his preferences on *every* reset is a recurring annoyance, while keeping them costs at most one glance at SETTINGS; (3) mechanically, #9 lives outside the storage root under the legacy API and #8 is owned by `ThemeProvider` (`themeContext.tsx`) which keeps the mode in memory and would re-save it on the next toggle anyway — so a wipe of either would be a separate code path that fights a mounted provider (`SettingsProvider` writes the file back on any state change, `settings.tsx:71-74`). If Nathan wants "also reset my settings", it is a one-line follow-on: also `deleteAsync` #9 and drop step 3.3's theme write-back, then re-read both providers — not a redesign. **Not** added to `QUESTIONS-FOR-NATHAN.md` as a question: the default is defensible and the switch is cheap; he can simply say so after using it once.

### 3.8 Documentation corrections in the same pass

- `settings.tsx:1-5` header: replace "In-memory only for now … until there is a settings store" with the truth (`<documentDirectory>/settings.json`, legacy API, `:42`).
- `catalogStore.ts:27-28` "Nothing calls saveUserCatalog() yet" → list its callers (RecordScreen naming flow, gate-adjust save, RoutesScreen deletion).
- `STATE.md` (coordinator, when this lands): add one line under data/storage: "ROUTES tab can delete user-created routes/ways/orphan places (cascading, validated); SETTINGS → DATA has Reset to virgin (moves the storage root aside, keeps settings/theme). Bundled-gate rings on a new>>new free ride are unaffected — WP-E/Q6."
- `README.md` status row Q.

## 4. Test plan

### 4.1 Headless (new `app/tests/catalogdelete_suite.ts`, register in `tests/run.ts` after `waycreation_suite.ts`)

Build fixtures with `buildWayCreationCatalog` (`wayCreation.ts:209`) so ids follow the real `lm:/way:/route:` scheme, seed = `emptyCatalog()` unless stated. After every case assert `validateCatalog(mergeCatalogs(seed, next)).length === 0` — this is the contract.

1. Way with two routes, `removeRoute(r1)`: way remains with `routeIds === [r2]`, r1's gate sets (add a v2 via `addGateSet` first — both versions must go) gone, both landmarks remain, `removedWayIds === []`, `removedRefLineIds === [r1.refLineId]`.
2. Way with one route, `removeRoute(r1)`: route, way, both landmarks gone (`removedLandmarkIds` has both, in catalog order).
3. Two ways sharing "Home" (Home→Work and Work→Home), `removeWay(homeWork)`: Home **and Work** both survive (Work is still Work→Home's start); `removedLandmarkIds === []`.
4. Loop way (`loopDiscriminator`, start === end), `removeWay`: the single landmark is removed once, not twice.
5. `removeLandmark` on a referenced landmark: input returned unchanged, report empty. On an orphan (construct by hand): removed.
6. Shipped seed (`catalogForSeedMode('shipped')`) + a user way whose start is the seed `home` landmark: `removeWay(userWay)` leaves the user catalog with no trace of the way and **does not** list `home` in `removedLandmarkIds`; `isSeedOwned(seed, 'route', 'Morning') === true`, `isSeedOwned(seed, 'route', userRoute.id) === false`.
7. Unknown id for each of the three functions: identical input back (deep-equal), empty report.
8. Order preservation: three user ways, remove the middle one — remaining arrays keep original relative order.

### 4.2 Headless additions to existing suites

- `userrefs_suite.ts`: `saveUserRef(a); saveUserRef(b); await removeUserRef(a); await flushUserRefWrites();` → `userRefFor(a) === null`, `userRefFor(b)` intact, the memory adapter's `refs.user.json` decodes to `{tracks: {b}}` only. `removeUserRef('nope')` never throws and writes nothing new (compare file text before/after).
- `resultsstore_suite.ts`: `storedResultsForRoute` returns exactly the results with that routeId, ascending `startedAtMs`, `[]` for unknown.
- `catalogstore_suite.ts` (or `store_suite.ts`): `saveUserCatalog(removeRoute(...).next)` end-to-end against a memory adapter — file text decodes to the pruned catalog; `currentCatalog()` no longer lists the route.

Expected: `node --experimental-strip-types tests/run.ts` → previous 312 tests / 309 pass / 3 skip becomes **≥ 324 / ≥ 321 pass / 0 fail / 3 skip** (8 + ≥4 new). Report the exact numbers in the status line.

### 4.3 On-device acceptance (Nathan — the checkable artifact for this WP)

Part A, on the virgin build after at least one named ride:
1. ROUTES → expand Home → Work → `delete route` → dialog names the route, says the way goes too (single-route way), lists Home and Work as places to be removed → Delete. Card disappears; YOUR PLACES shows "No places yet."; RECORD tab opens on new>>new again; RIDES still lists the ride, now as "no route — recorded only" after the "matching routes…" pass.
2. Repeat with two ways sharing a place (ride Home→Work, then Work→Home, name both): deleting one way keeps both places and the other way.
3. On the dev/preview build (shipped seed): no delete buttons anywhere on the 6/13/20 seed items; a user-created way on top of them shows them.

Part B:
4. SETTINGS → DATA → `reset…` while a ride is recording → refused with the "stop it first" message.
5. Not recording → first dialog shows correct counts and the "settings and theme stay" sentence → Continue… → second dialog → Reset → "Reset done" names the aside folder.
6. Without restarting: RIDES "No rides yet", ROUTES "No places yet" / "No ways yet", RESULT shows no last ride, RECORD opens new>>new. Night theme (if set) still night; the five preference toggles unchanged.
7. Kill and relaunch: launch animation, then exactly the state of the first-ever launch on that build. Ride once → naming offer appears as on 2026-09-01 ride 1.
8. **Expected and NOT a regression:** the black circles are still there on that first free ride. That is WP-E/Q6 (§2.6). If Nathan sees them, the reset worked — the leak is from the build, not from anything the reset touched.
9. (Optional) `adb shell ls` of the app's document dir shows `qualifire.reset-<stamp>/` with the old `rides/`, `results/`, `catalog.user.json` intact.

## 5. Verification

```
cd app
node --experimental-strip-types tests/run.ts          # expect 0 FAIL; ≥12 new PASS (see §4.2 for the exact floor)
./node_modules/.bin/tsc --noEmit                      # expect exit 0 (device_bash was down 2026-09-02 — see CONTEXT.md; Nathan may need to run this)
grep -n "In-memory only" src/ui/settings.tsx          # expect no output (§3.8)
grep -n "Nothing calls saveUserCatalog" src/store/catalogStore.ts   # expect no output (§3.8)
grep -n "deleteFile\|delete()" src/storage/expoFsAdapter.ts        # expect only the pre-existing deleteFile (line ~63-66) — archiveStorageRoot must MOVE, not delete (unless the §3.2 fallback was needed; then say so)
grep -rn "ForTests()" src/ui/settings.tsx             # expect no output — production code calls the un-suffixed names
```

## 6. Files touched

New: `app/src/store/catalogDelete.ts`, `app/tests/catalogdelete_suite.ts`.
Edited: `app/src/ui/RoutesScreen.tsx` (Part A UI), `app/src/ui/settings.tsx` (Part B UI + stale header), `app/src/live/userRefs.ts` (`removeUserRef`), `app/src/store/resultsStore.ts` (`storedResultsForRoute`), `app/src/ui/lastRide.ts` + `app/src/store/freeRides.ts` (rename reset seams, keep aliases), `app/src/storage/expoFsAdapter.ts` (`archiveStorageRoot`), `app/src/store/catalogStore.ts` (comment only), `app/tests/run.ts` (register suite), `app/tests/userrefs_suite.ts`, `app/tests/resultsstore_suite.ts`, `app/tests/catalogstore_suite.ts`.
Not touched: `RecordScreen.tsx`, `routeMapView.tsx`, `routeMapGeo.ts`, `engine.ts`, anything under `tests/fixtures/`, `IDEAS.md`, `Nathan/`.
Coordinator, after landing: `STATE.md` line (§3.8), `README.md` row Q.

## 7. Open questions (none blocking)

1. §3.7 — should reset also reset settings/theme? Default: no. Revisable in one line after Nathan has used it once.
2. Should the aside folders ever be pruned (keep the newest N)? Not now; revisit if Nathan resets more than a handful of times.
3. Free-ride cache entries referencing a deleted route keep a raw-id label on the FREE RIDE board (§2.4). Cosmetic; fold into whichever WP next touches `ResultScreen`'s free-ride board.
4. **Q6 (not this WP's question, but this WP makes it urgent):** until it is answered, every "reset to virgin" re-test will start with the bundled Leuven gates on ride 1. See §2.6 and the addendum under Q6.
