**Status: EXECUTION-READY — RUNS FIRST in this cycle, before WP-1 and WP-2 (Nathan's ruling, Q3, 2026-09-05: "run WP-3 first!"). All 5 open questions answered (§10); revised in the night of 2026-09-05/06 to fold the answers in.** Two phases, strictly sequential (A → B). Phase A is one Sonnet Execute dispatch and ONE commit: the identifier swap, the schema bump + read-side migration and the seed rewrite are never allowed to land separately (§9, failure mode 1). Phase B is a second dispatch (prose + docs), low risk.
**Open item:** new ask, Nathan 2026-09-05 ("a big reworking package … the way/routes naming … should be inverted in the app and in the code that produces it. It makes more sense for ways to be a subdivision of routes. Multiple ways to take the same routes sounds logic. Multiple routes to take a same way does not. So every mention of either should be swapped accordingly. This is WP-3"). Size: **large** — ~245 identifier occurrences across 13 named files plus every consumer, a schema-version bump with a small read-side key-rename migration of three file kinds, two bundled seed files rewritten, 6 test suites renamed, ~30 UI/store strings, then a comment/docs pass. Not in `OPEN-ITEMS.md` yet — the coordinator adds it under the "virgin-cycle3" block when this brief is accepted.
**Written by:** Plan tier (Fable) — an architecture decision with on-disk-schema stakes; not a fix the coordinator should rule on. **Revision 2 (this text):** same Plan tier, after Nathan's answers. What changed and why: Nathan will *probably* reset his phone to a virgin build after this lands (Q1), so the elaborate lossless migration of revision 1 (sibling backup file, v1/v2 structural shape assertions, write-back at init, cross-array id rule, append-only read shims) is cut to the minimum that is still SAFE if he does NOT reset: a `schemaVersion` gate, a straight key rename on read, no writes at init, and writes disarmed on any refused file. Nothing in this design can corrupt or overwrite his data; the worst case for an un-reset phone is stated in §3.5.
**Verified against the device tree 2026-09-05 (night), at commit `befb6b0` = branch `legacy-virgin`.** Every `file:line` below was read on the device, and — because WP-3 now runs FIRST — that tree is exactly the tree the executor will see (the only commits since touch `cycles/` docs). Anchors are reliable; still, treat the mapping table (§3.2) and exception list (§3.1) as the contract and re-grep before editing.
**`legacy-virgin` branch = the historical record.** The coordinator created branch `legacy-virgin` at `befb6b0`, the last pre-WP-3 commit. It snapshots the old naming, the old `…/gpx/1` export format and the v1 seeds. Because it exists, this brief carries NO dual-emission or backward-compat reading of old formats (Q4) — anyone who ever needs the old shape checks out that branch.
**WP-1 / WP-2 interplay (executor: read this once, then ignore those two briefs).** `WP-1-multi-sport-support.md` and `WP-2-results-tab.md` in this folder are NOT yet executed and are written in TODAY's (pre-swap) vocabulary. Two separate Plan-tier passes are re-issuing them right now to reference the NEW (post-swap) identifiers; they execute AFTER this WP. The executor of THIS brief does not read, touch, or reconcile those two files, and does not add anything to the codebase on their behalf. There is nothing of WP-1/WP-2 in the tree to swap.

---

# WP-3 — Way/Route inversion: a *route* is the from→to path, a *way* is one way of riding it

## 1. What it is

Today's schema has the two words backwards relative to how Nathan thinks and talks (his WP-2 message already used the inverted words, and WP-2's author had to translate). Today:

- **Way** = the base from→to path between two landmarks (`{id, startLandmarkId, endLandmarkId, loopDiscriminator?, routeIds}`), the PARENT.
- **Route** = one named variant of a Way — the thing that carries `specs` ("Dry", "Fast"), a `refLineId`, a `gateSetVersion`, a `referenceRideId`, and that rides, gate sets and results are keyed by (`routeId`) — the CHILD, FK `wayId`.

After WP-3 the *relationship* is untouched and the *names* are swapped: **Route** is the from→to path, **Way** is a named variant of it ("multiple ways to take the same route"). Every identifier, type, FK field, filename, UI string and comment that names the entity swaps. Every id VALUE stays byte-identical. On-disk files get a `schemaVersion` bump (1 → 2) and a read-side key rename (§3.5): a v1 file is understood, never silently reinterpreted, and never rewritten at init; it reaches v2 through the app's existing routine write paths, or vanishes when Nathan resets to virgin.

## 2. Current state (re-verified — the facts that bind the design)

### 2.1 The two types and everything keyed by them

| Where | Today | Notes |
|---|---|---|
| `src/store/types.ts:36-43` | `Way {id, startLandmarkId, endLandmarkId, loopDiscriminator?, routeIds: string[]}` | base path |
| `types.ts:45-66` | `Route {id, wayId, refLineId, gateSetVersion, seeded, referenceRideId?, specs?}` | variant |
| `types.ts:68-80` | `GateSet.routeId` | keyed by variant |
| `types.ts:102-131` | `RideResult.routeId: string \| null`, `ResultsIndexEntry.routeId` | keyed by variant |
| `types.ts:15-16` | `CATALOG_SCHEMA_VERSION = 1`, `RESULT_SCHEMA_VERSION = 1` | both bump to 2 |
| `store/freeRides.ts:33-40` | `FreeRideRecord {schemaVersion: 1; crossings[].routeId; sectors[].routeId}` | keyed by variant |
| `storage/types.ts:127-138` | pick event `routeId?: string \| null; routeIds?: string[] \| null` | written into `.events.jsonl` (append-only) |
| `location/session.ts:30,59` | `ActiveSession.routeIds` in `qualifire-active-ride.json` | transient crash marker |
| `live/engine.ts:234,325,329` | `EngineStartOptions.routeIds`, `freeCrossings[].routeId`, `freeSectors[].routeId` | in-memory; flows into freeRides cache |
| `storage/gpxPlusExport.ts:228-230,544` | emits `routeId="…" routeIds="…"` on the pick element, `xmlns:qf="https://qualifire.local/gpx/1"` | export format |
| `ui/tabNav.tsx:19,46` | `Tab = … \| 'routes' \| …`; `CatalogDetailRequest = {kind:'place'} \| {kind:'way'}` | tab id vs entity discriminator — different fates (§3.1) |
| `store/defaultRoute.ts:14,37-39` | `ROUTE_DISPLAY_ID` overlay; `isUserMintedRouteId = id.startsWith('route:')` | id prefix is load-bearing for labels |
| `store/wayCreation.ts:314,361`, `wayFromRide.ts:217` | mints `route:<rideId>` (variant, = its `refLineId`) and `way:<rideId>` (base path) | the only two mint sites |
| `store/seed.ts`, `store/catalog.seed.json` (13 ways / 20 routes / 1-space indent), `store/results.seed.json` (`routeId`, `derivedBy.resultSchemaVersion: 1`) | bundled v1 data, Nathan's build only (virgin seed is empty) | rewritten in-repo |
| `assets/routes/routes.json` + 3 PNGs, imported at `ui/routeMapView.tsx:86,159-161` | per-variant drawn assets | directory renamed |

### 2.2 Read/write posture that decides the migration design

- `catalog.ts:31-40` `decodeCatalog` = raw `JSON.parse` + "four arrays exist"; it does **not** look at `schemaVersion`. `catalogStore.ts:79-112` `initCatalogStore`: an undecodable file is "ignored for this session, never written" — but **writes stay armed** (`armedFs` is set at `:80` and never cleared), so the next `saveUserCatalog` would overwrite the only copy of the rider's catalog with `empty + additions`. Today that is a latent hazard; under a schema change it is the catastrophic path (§9). WP-3 closes it with two one-line `armedFs = null` additions.
- `resultsStore.ts:72-89` `isValidRideResult` requires `v.routeId === null || typeof v.routeId === 'string'`; an invalid file is silently skipped (`:185`). After a blind rename every existing result would be skipped, the index self-heals to empty, and the next `backfillMissingResults` re-derives every ride from raw and `saveResult`s it — **overwriting each v1 result file and losing every `ignoredFromRanking` flag** (WP-H; a rider decision that lives ONLY in the result file, `types.ts:114-119`). A three-line key rename on read avoids that, so it stays in (§3.5).
- `results.ts:76-86` `isStale()` compares `derivedBy.resultSchemaVersion !== RESULT_SCHEMA_VERSION` (no production caller today — `grep` finds only the definition — but the contract exists). A record upgraded on read must therefore carry `derivedBy.resultSchemaVersion: 2` too, or it reads as stale forever.
- Raw ride recordings (`rides/<id>.jsonl`, `.events.jsonl`) are **append-only** (D-023, `STATE.md`): never rewritten. `index.json` carries only `mode` — no route field — untouched. The pick event's `routeId`/`routeIds` keys inside `.events.jsonl` have exactly ONE consumer: the GPX+ export (`gpxPlusExport.ts:220-231`). Nothing else in `src/` reads them.
- `SETTINGS → DATA → "Reset to virgin"` (`settings.tsx:223-245`, `performReset`) moves the whole storage root aside (`archiveStorageRoot`) and re-inits every store on an empty root. This is what Nathan says he will "probably" do after WP-3 lands (Q1) — after it, no v1 file is reachable by the app at all, and every id minted from then on carries the new prefixes (§3.3).
- **Never delete** (`CLAUDE.md` 5) is satisfied by never writing at init (§3.5) and by the `legacy-virgin` branch for the in-repo seeds.

## 3. The design decisions

### 3.1 The policy: entity tokens swap; opaque ids, on-disk literals and the tab name do not

Nathan's "every mention of either should be swapped" is the rule, with exactly these exceptions — each is either an opaque id, an on-disk literal whose meaning survives the inversion, or a name for something other than the entity:

| Keep verbatim | Why |
|---|---|
| Every existing id VALUE (`Morning`, `way:<rideId>`, `route:<rideId>`, `HomeWork`, refLine ids, `refs.user.json` keys) | Opaque keys referenced from append-only history; D-023's "ids never change" (the `ROUTE_DISPLAY_ID` overlay exists precisely because ids stayed when names moved). New mints DO get the correct prefix — §3.3. |
| `mode: 'route' \| 'free'` (`storage/core.ts`, `location/index.ts:314,339,383,398`, `session.ts:29,58`, `engine.ts:230,322,379,405,453`) | On disk in `index.json`, the active-ride marker and the events file. It means "a ride against the catalog, not a free ride" — a ride *on a route* is still exactly what it is post-inversion. |
| Tab id `'routes'` (`tabNav.tsx:19,31`), tab label `ROUTES`, `RoutesScreen.tsx` (component + file), `"BACK TO ROUTES"` (`CatalogDetailScreen.tsx:136`) | Names the browse TAB. Post-inversion that tab lists YOUR PLACES then the from→to paths, which are now called routes — the name becomes *more* correct, not less (§3.4). |
| Historical identifiers in comments: `WP-route-naming-migration`, `ROUTING-AND-SEGMENTATION`, D-numbers, cycle names, dated verbatim quotes of Nathan | Records of what was said/decided; rewriting them falsifies history. |
| English idiom "way" in prose (`the way it always has`, `by the way`, `either way`, `a way to`, `no way`, `this/that/same way`, `way too`, `on the way`, `all the way`) and `en route` | Not the entity. Phase B's comment pass applies this list; nothing else in prose is exempt. |

Everything else that carries the token — type names, FK fields, id arrays, function names, parameters, locals, JSX props, component names, module/file names, the asset directory, UI copy, `validateCatalog`/`Alert`/`console.warn` message text, the `kind` discriminator — swaps.

### 3.2 The complete before/after mapping

| Today (v1) | After WP-3 (v2) | Change |
|---|---|---|
| `interface Way` (base from→to path) | `interface Route` | type name |
| `Way.id` | `Route.id` | value unchanged; legacy ids keep `way:<rideId>`; NEW mints `route:<rideId>` (§3.3) |
| `Way.startLandmarkId` / `.endLandmarkId` / `.loopDiscriminator?` | `Route.startLandmarkId` / `.endLandmarkId` / `.loopDiscriminator?` | field names unchanged |
| `Way.routeIds: string[]` | `Route.wayIds: string[]` | **key rename** |
| `interface Route` (variant) | `interface Way` | type name |
| `Route.id` | `Way.id` | value unchanged; legacy `route:<rideId>` and seed ids (`Morning`) stay; NEW mints `way:<rideId>` |
| `Route.wayId` | `Way.routeId` | **key rename** (FK to the from→to path) |
| `Route.refLineId` / `.gateSetVersion` / `.seeded` / `.referenceRideId?` / `.specs?` | `Way.refLineId` / `.gateSetVersion` / `.seeded` / `.referenceRideId?` / `.specs?` | unchanged |
| `GateSet.routeId` | `GateSet.wayId` | **key rename** |
| `Catalog.ways: Way[]` (held base paths) | `Catalog.ways: Way[]` (holds VARIANTS) | same JSON label, swapped contents |
| `Catalog.routes: Route[]` (held variants) | `Catalog.routes: Route[]` (holds BASE PATHS) | same JSON label, swapped contents |
| `Catalog.schemaVersion: 1` | `2` | migration gate |
| `RideResult.routeId: string \| null`, `.schemaVersion: 1`, `.derivedBy.resultSchemaVersion: 1` | `RideResult.wayId`, `2`, `2` | key rename + both version fields on read; `ignoredFromRanking`, `tripwireDemoted`, `sectors`, `lap`, `source` untouched |
| `ResultsIndexEntry.routeId` | `.wayId` | rebuilt from results at init (as today) |
| `FreeRideRecord.schemaVersion: 1`, `crossings[].routeId`, `sectors[].routeId` | `2`, `.wayId`, `.wayId` | key rename on read |
| pick event `routeId` / `routeIds` (`.events.jsonl`) | `wayId` / `wayIds` — written AND read; the old keys are simply unknown extra keys on a pre-WP-3 record (the validator ignores unknown keys; no shim) | append-only — never rewritten; consequence in §3.5 |
| `ActiveSession.routeIds` (`qualifire-active-ride.json`) | `.wayIds` — written and read; no shim | transient crash marker; a marker written by a pre-WP-3 build reads as `wayIds: undefined` |
| `EngineStartOptions.routeIds`, `freeCrossings[].routeId`, `freeSectors[].routeId`, `TrackSpec` consumers | `wayIds`, `wayId`, `wayId` | in-memory |
| `CatalogDetailRequest.kind: 'place' \| 'way'` (`tabNav.tsx:46`; used `CatalogDetailScreen.tsx:75,91,109`, `RoutesScreen.tsx:78`) | `'place' \| 'route'` | in-memory nav; all 5 sites |
| GPX+ pick attributes `routeId=` / `routeIds=`, `xmlns:qf=…/gpx/1` | `wayId=` / `wayIds=`, `…/gpx/2` — new names ONLY, no dual emission | export format bump (Q4 answered: no external reader; `legacy-virgin` holds the old format) |
| `ROUTE_DISPLAY_ID`, `routeLabel`, `routeVariantLabel`, `routeLabelIn`, `sortRoutesForDisplay`, `fallbackRouteId`, `defaultMapRouteId`, `isUserMintedRouteId` | `WAY_DISPLAY_ID`, `wayLabel`, `wayVariantLabel`, `wayLabelIn`, `sortWaysForDisplay`, `fallbackWayId`, `defaultMapWayId`, `isUserMintedWayId` | identifier swap |
| `waysFrom`, `routesForWay`, `freeRideRouteIds`, `needsRoutePick`, `removeRoute`/`removeWay`, `storedResultsForRoute`, `WayCreationDraft`, `draftWayCreation`, `WayNames`, `findRouteWithSpecs`, `buildWayCreationCatalog`, `existingWayProps`, `CreateWayOutcome`, `onDeleteRoute`/`onDeleteWay`, `TouchingWayModel`, `RouteDetailModel`/`WayDetailModel`, `wayDetailFor`, `RouteAssetDeps`, `resolveRouteAsset`, `allRouteAssets`, `buildRuntimeRouteAsset`, `routeLineFeature`, `routeBounds`, `routeSplitFeatures`, `RouteGate`, `RouteAsset`, `offRouteM`, `WayNamingCardProps`, `WayNamingCard` | `routesFrom`, `waysForRoute`, `freeRideWayIds`, `needsWayPick`, `removeWay`/`removeRoute`, `storedResultsForWay`, `RouteCreationDraft`, `draftRouteCreation`, `RouteNames`, `findWayWithSpecs`, `buildRouteCreationCatalog`, `existingRouteProps`, `CreateRouteOutcome`, `onDeleteWay`/`onDeleteRoute`, `TouchingRouteModel`, `WayDetailModel`/`RouteDetailModel`, `routeDetailFor`, `WayAssetDeps`, `resolveWayAsset`, `allWayAssets`, `buildRuntimeWayAsset`, `wayLineFeature`, `wayBounds`, `waySplitFeatures`, `WayGate`, `WayAsset`, `offWayM`, `RouteNamingCardProps`, `RouteNamingCard` | identifier swap (representative; the script does all of them) |
| Files: `store/routeSpecs.ts`, `wayCreation.ts`, `wayFromRide.ts`, `defaultRoute.ts`; `ui/demoRouteFixture.ts`, `preview/routes.ts`, `routeAssetRuntime.ts`, `routeMapGeo.ts`, `routeMapMath.ts`, `routeMapStyle.ts`, `routeMapView.tsx`, `wayNamingCard.tsx`; `assets/routes/` (+ `routes.json`); tests `routeasset_runtime_suite`, `routemap_suite`, `routemapgeo_suite`, `routemapstyle_suite`, `routespec_suite`, `waycreation_suite` | `waySpecs.ts`, `routeCreation.ts`, `routeFromRide.ts`, `defaultWay.ts`; `demoWayFixture.ts`, `preview/ways.ts`, `wayAssetRuntime.ts`, `wayMapGeo.ts`, `wayMapMath.ts`, `wayMapStyle.ts`, `wayMapView.tsx`, `routeNamingCard.tsx`; `assets/ways/` (+ `ways.json`, PNG names unchanged); `wayasset_runtime_suite`, `waymap_suite`, `waymapgeo_suite`, `waymapstyle_suite`, `wayspec_suite`, `routecreation_suite` | `git mv` + import-path fix |
| `RoutesScreen.tsx`, tab `'routes'`, `ROUTES`, `"BACK TO ROUTES"` | **unchanged** | names the tab (§3.4) |
| `mode: 'route'` everywhere | **unchanged** | §3.1 |

The swap is an involution on identifier text (`swap(swap(x)) === x`) and a bijection on the identifier set — `routeId`↔`wayId` are a PAIR, so no two distinct identifiers can collide after the swap. That is what makes a scripted pass safe (§3.6).

### 3.3 Id prefixes: legacy ids never change; new mints get the correct prefix

Three options were weighed:

- **(a) Freeze prefixes forever** — new variants keep minting `route:<rideId>`, new base paths `way:<rideId>`. Zero migration, but every future stranger's `catalog.user.json` reads backwards (`ways: [{id:'route:…'}]`) — on the *virgin* branch, whose whole point is strangers with blank installs.
- **(b) Re-prefix existing ids** — touches `results/*.json`, `free-rides-cache.json`, `refs.user.json` keys AND the append-only `.events.jsonl`. Forbidden by D-023. Rejected outright.
- **(c) Legacy ids stable, new mints correct** — `routeCreation.ts` (ex `wayCreation.ts:314,361`) and `routeFromRide.ts` (ex `wayFromRide.ts:217`) mint `way:<rideId>` for the new variant (= its `refLineId`) and `route:<rideId>` for the new base path. `isUserMintedWayId(id)` becomes `id.startsWith('way:') || id.startsWith('route:')` with a comment naming the pre-WP-3 era; it is only ever applied to variant ids, and seed variant ids carry no colon, so the predicate stays exact.

**Decision: (c) — confirmed by Nathan (Q1): "no need to update the recorded data … I will probably try to reset the app to get a virgin build again. That data will then be all correct again with the updated naming."** Cost: on an un-reset phone the `ways` array holds both `route:…` (pre-WP-3) and `way:…` (post) ids; after a reset, and on every other install, prefixes read correctly from day one. Ride ids mint at most once, so a legacy `way:R` (base) and a new `way:R` (variant) could only collide if ride R minted twice, which no code path does. Revision 1 added a cross-array id-uniqueness rule to `validateCatalog` against that; **cut** — no code path produces it and the likely reset removes the legacy ids anyway. Only the two-prefix predicate stays (one `||`), so an un-reset phone still labels its pre-WP-3 ways correctly.

### 3.4 The browse tab keeps its name

Today the ROUTES tab shows "YOUR PLACES" then a section headed "WAYS" (`RoutesScreen.tsx:70`), each row `from → to · N route(s)`. Post-inversion the same screen shows "YOUR PLACES" then "ROUTES", each row `from → to · N way(s)`, tap → `{kind:'route', id}` → detail titled `ROUTE` with a "WAYS" list. The tab is named after its main list, which is now literally routes — so `RoutesScreen.tsx`, `Tab 'routes'`, the label and `"BACK TO ROUTES"` all stay. **Confirmed by Nathan (Q2: "OK").** The executor must NOT let the identifier script rename `RoutesScreen` (it is the one identifier on the exception list) and must not touch the `'routes'` string literal.

### 3.5 The migration: a `schemaVersion` gate, a key rename on read, no writes at init, refuse-and-disarm

**What revision 1 had, and what is cut (Nathan Q1: he will probably reset to virgin; the design only has to be SAFE if he does not).** Cut: the `catalog.user.v1.json` sibling backup and its write-ordering logic; the per-element v1/v2 structural shape assertions; write-back of migrated files at init (catalog, results, free-rides cache); the validate-before-write step at init; the cross-array id rule (§3.3); the read shims for the pick event and the active-ride marker; the `results.seed.v1.json` fixture. Kept: the `schemaVersion` gate, a straight key rename on read for the three file kinds, `derivedBy.resultSchemaVersion: 2` on an upgraded result (so `isStale` does not condemn it), and `armedFs = null` on a refused catalog file. The whole migration module is ~50 lines.

**Principle: migrate on READ, in memory; never write at init.** A v1 file is upgraded every time it is loaded and is left byte-identical on disk. It reaches v2 only through the write path that already rewrites that file kind routinely: `saveUserCatalog` (whole file, on the next catalog change), `saveResult` (per ride, e.g. the next "Ignore in ranking" toggle or the next backfill), `rememberFreeRide` (whole cache, on the next free ride). No new write path, no torn-write window, no backup file, nothing to delete — and a reset makes all of it moot.

New pure module **`src/store/migrations.ts`** (no expo/Node imports, like `types.ts`). All functions take `unknown` and return the v2 shape or `null`; none throws. Every function is gated on `schemaVersion` and does nothing else clever:

- `renameKey(o, from, to)`: `{ ...rest, [to]: o[from] }` when `from` is present, `o` unchanged otherwise (object spread; key order is not a concern). Unknown extra keys pass through.
- **`upgradeCatalog(raw): Catalog | null`:**
  1. `raw` must be an object with array `landmarks`, `ways`, `routes`, `gateSets` (today's `decodeCatalog` check) — else `null`.
  2. `sv = raw.schemaVersion`. **`sv === 2`** → return `raw` as-is (structure is `validateCatalog`/`mergeCatalogs`'s job, as today). **`sv === 1` or `undefined`** → return `{ schemaVersion: 2, landmarks: raw.landmarks, ways: raw.routes.map(r => renameKey(r,'wayId','routeId')), routes: raw.ways.map(w => renameKey(w,'routeIds','wayIds')), gateSets: raw.gateSets.map(g => renameKey(g,'routeId','wayId')) }` (same JSON labels, swapped contents — §3.2). **Anything else** → `null` (a future version is refused, not guessed at).
- **`upgradeResult(raw): RideResult | null`:** object with `kind === 'rideResult'` — else `null`. `schemaVersion === 2` → as-is. `schemaVersion === 1` or `undefined` → `renameKey(raw,'routeId','wayId')` with `schemaVersion: 2` and, when `derivedBy` is an object, `derivedBy: { ...derivedBy, resultSchemaVersion: 2 }`; everything else (`ignoredFromRanking`, `tripwireDemoted`, `lap`, `sectors`, `source`, `startedAtMs`, `rideId`, `engineVersion`, `gateSetVersion`) untouched. Other versions → `null`. Structural validity is still `isValidRideResult`'s job afterwards.
- **`upgradeFreeRidesCache(raw): unknown[] | null`:** object with array `rides` — else `null`. File-level `schemaVersion === 2` → `raw.rides` as-is. `1`/`undefined` → each ride's `crossings[]` and `sectors[]` mapped through `renameKey(…,'routeId','wayId')` and the ride's `schemaVersion: 2`. Other → `null`. `isValidFreeRideRecord` still filters afterwards, as today.

**Wiring — `catalog.ts` `decodeCatalog(text)`** (`:31-40`): body becomes `try { return upgradeCatalog(JSON.parse(text)); } catch { return null; }`. Every caller (`catalogStore.ts:85`, tests) therefore sees v2. `store_suite.ts:218`'s `decodeCatalog('{"schemaVersion":1}') === null` still holds (no arrays).

**Wiring — `catalogStore.ts` `initCatalogStore`** (`:79-112`): posture unchanged — v1 is decoded (now upgraded) into `user`, nothing is written. Two additions, both one line: in the `decoded === null` branch (`:89-92`) add **`armedFs = null;`**; in the `recompute()` catch (`:98-111`) add **`armedFs = null;`** before the `user = emptyCatalog()` line. Update both `console.warn` texts to say "…ignored for this session, left untouched, saving disabled". That closes the §2.2 hazard: a file this build refuses can never be overwritten by this session. (Verified: `enqueueWrite`, `:56-63`, captures `armedFs` at call time and returns without writing when it is `null`, so a disarmed `saveUserCatalog` still updates the in-memory catalog and returns `[]` but touches no file — exactly the wanted behaviour; no further change there.)

**Wiring — `resultsStore.ts` `initResultsStore`** (`:185-189`): `const parsed = JSON.parse(text)` → `const up = upgradeResult(parsed); if (up === null || !isValidRideResult(up)) continue; store.set(rideId, up);`. No write-back; `index.json` is rebuilt from the in-memory store exactly as today (`:196`), so it carries `wayId`. `isValidRideResult` (`:77`) checks `v.wayId`. If `initResultsStore` today writes `index.json` only when `neededDirScan` — keep that; a v1-on-disk result with a v2 index entry is fine, both are re-read through `upgradeResult`.

**Wiring — `freeRides.ts`**: `decodeFreeRidesCache` (`:88-96`) → `const rides = upgradeFreeRidesCache(JSON.parse(text)); return rides === null ? null : rides.filter(isValidFreeRideRecord);`. `isValidCrossing`/`isValidFreeSector` (`:52-64`) check `wayId`. `SCHEMA_VERSION = 2` (`:31`), the `schemaVersion: 2` literal type (`:35`) and the `schemaVersion: 1` literal in `rememberFreeRide` (`:126`). `initFreeRidePersistence` (`:182-200`) unchanged — no write.

**Pick event and active-ride marker — NO shims.** `storage/types.ts:127-138` `PickEvent` gets `wayId?: string | null` and `wayIds?: string[] | null` in place of `routeId?`/`routeIds?` (the identifier pass does this). `eventsJsonl.ts:98-101` validates `wayId`/`wayIds`; a pre-WP-3 pick record carries `routeId`/`routeIds` as unknown extra keys, which the validator ignores, so old ride recordings still load. `location/index.ts:399-401` writes `wayId`/`wayIds`. `session.ts:30,59` reads/writes `wayIds` only. **Stated consequence on an un-reset phone:** the GPX+ export of a ride recorded BEFORE WP-3 emits its `<qf:pick>` without `wayId`/`wayIds` (the raw JSONL and everything else in the export is complete); the `legacy-virgin` branch exports it with the old attributes if that ever matters. A crash-recovery marker written by a pre-WP-3 build reads as `wayIds: undefined` — the recovery path already handles `undefined` (`session.ts:59`).

**GPX+ export — straight bump, no dual emission (Q4).** `gpxPlusExport.ts:228` `a('wayId', pickEv.wayId)`, `:230` `wayIds="…"` from `pickEv.wayIds`, `:544` `xmlns:qf="https://qualifire.local/gpx/2"`. Update `tests/gpxplus_suite.ts` expectations (attribute names and namespace). No in-repo code reads GPX+ back (verified: `grep -rln "qf:pick\|gpx/1" src tests` finds only the exporter and its suite).

**Seeds (in-repo, Nathan's build only):** `scripts/wp3-migrate-seeds.ts` (run with `node --experimental-strip-types`) imports `migrations.ts`, upgrades `src/store/catalog.seed.json` (`upgradeCatalog`) and every element of `src/store/results.seed.json` (`upgradeResult`), writes them back with `JSON.stringify(x, null, 1) + '\n'` (the files' existing 1-space indent). Before that, the pre-WP-3 `catalog.seed.json` is copied VERBATIM to `tests/fixtures/catalog.seed.v1.json` — the migration test's real-data input (§4 A8 test 1). No results fixture: the test uses a small synthetic v1 result inline. The old seeds also live on in `legacy-virgin`. `assets/ways/ways.json` (ex `routes.json`) is keyed by refLine id; the executor checks it for way/route FIELD names (none expected — stop if found).

### 3.6 How the swap is executed: a TypeScript-parser identifier pass, then hand passes for strings and comments

A `sed` over 245 occurrences cannot tell `wayId` from `always`, or the entity "way" from "the way it always has" in a comment. So:

- **`scripts/wp3-swap-identifiers.ts`** (committed, run once, kept for audit): for every `src/**/*.{ts,tsx}` and `tests/**/*.ts`, `ts.createSourceFile(…, /*setParentNodes*/ true, TSX for .tsx)`, visit every `Identifier`/`PrivateIdentifier`, compute `swapToken(node.text)`, skip the exception list (`RoutesScreen`), collect `[node.getStart(sf), node.getEnd(), replacement]`, apply right-to-left, write. String literals, template literals, JSX text and comments are untouched by construction. `swapToken` is ONE regex pass (never two — a second pass would swap back):
  `/(?<![A-Za-z])(way|ways|route|routes)(?![a-z])|(?<![A-Z])(Way|Ways|Route|Routes)(?![a-z])|(?<![A-Za-z])(WAY|WAYS|ROUTE|ROUTES)(?![A-Za-z])/g` with a replacer mapping each token to its partner (`way↔route`, `ways↔routes`, `Way↔Route`, `Ways↔Routes`, `WAY↔ROUTE`, `WAYS↔ROUTES`). Check cases the guards must get right: `routeId→wayId`, `routesForWay→waysForRoute`, `WayNamingCard→RouteNamingCard`, `ROUTE_DISPLAY_ID→WAY_DISPLAY_ID`, `offRouteM→offWayM`, `wayRoutes→routeWays`; and must leave alone: `always`, `away`, `midway`, `anyway`, `gateway`, `waypoint`, `Waypoint`, `router`, `Router`, `routing`. The script prints every distinct `before → after` identifier pair, sorted; that list goes verbatim into the Execute report for Inspect.
- **Renames**: `git mv` per §3.2's file row (basename through `swapToken`, `RoutesScreen.tsx` excepted; `assets/routes/` → `assets/ways/`, `routes.json` → `ways.json`); then fix import/require specifiers (string literals — the identifier pass does not see them): for each rename, replace the exact old module path in `import … from '…'`, `export … from '…'`, `require('…')` across `src/`, `tests/` and `tests/run.ts`. `tsc --noEmit` is the check that none was missed.
- **Strings (Phase A, hand pass, include-list in §4 A5)** and **comments (Phase B)** follow §3.1's exception list.

### 3.7 Execution order: WP-3 FIRST, then WP-1 and WP-2 against the swapped tree

Revision 1 recommended running WP-3 last (so WP-1/WP-2's already-verified briefs could execute as written and the identifier pass would cover their code for free). **Nathan overruled (Q3: "run WP-3 first!")**, accepting the stated cost — one Plan re-issue of each earlier brief. What that means, concretely:

- **This WP executes against the tree as it is today** (`befb6b0` + cycle docs) — nothing of WP-1 or WP-2 exists in `src/` or `tests/`, so there is no reconciliation to do and every anchor in this brief is current.
- **WP-1 and WP-2 are being re-issued by two other Plan-tier passes in parallel with this revision**, to reference the post-swap identifiers (`Route.sportId`, `wayIdsOfSport`, `storedResultsForWay`, …). They execute only after this WP's Phase A has landed and passed Inspect. **Executor: do not open, edit or "help" those two brief files; do not add anything on their behalf.**
- The coordinator updates the README status table: row 3 (WP-3) → "EXECUTING FIRST"; rows 1 and 2 → "runs AFTER WP-3; brief re-issued in post-swap vocabulary".
- Nathan sees the inverted words on his phone as soon as Phase A ships, which is what he asked for.

## 4. The fix — Phase A: identifiers, fields, migration, seeds, strings, tests (ONE commit)

Order matters; run the suite after each step and record the FAIL count in the report. **Steps A1–A9 are one indivisible commit: the tree must never be committed with the swap but without the schema bump + read-side migration (§9, failure mode 1).** Work on branch `virgin`; `legacy-virgin` is never touched.

**A0. Baseline.** `git branch --list legacy-virgin` must print the branch (if it does not, stop — the historical record this brief relies on is missing). `cd app && node --experimental-strip-types tests/run.ts` and `./node_modules/.bin/tsc --noEmit` — record the totals. Copy `src/store/catalog.seed.json` → `tests/fixtures/catalog.seed.v1.json` (verbatim, `cp`, no edits). Verified 2026-09-05: no file in `tests/fixtures/` carries `routeId`/`wayId`/`routeIds` keys (`grep -l` is empty), so no fixture conversion is needed — re-run the grep and confirm; a hit is a stop.

**A1. Identifier pass.** Write and run `scripts/wp3-swap-identifiers.ts` (§3.6). Expect `tsc` to fail ONLY on import paths (A2 fixes) — anything else is a stop.

**A2. Renames + import paths** (§3.2 file row, §3.6). `tsc --noEmit` clean. Run the suite: the ONLY expected failures are assertions on minted-id text (`` `route:${…}` `` in `routecreation_suite`) and on message text (`validateCatalog` errors, `Alert` copy) — A5 fixes them; anything else is a stop.

**A3. Types + versions.** `types.ts`: `CATALOG_SCHEMA_VERSION = 2`, `RESULT_SCHEMA_VERSION = 2`; `freeRides.ts` `SCHEMA_VERSION = 2` and the `schemaVersion: 2` literal type. Rewrite the doc comments on `Route` and `Way` in `types.ts` (this pair only — the rest of the prose is Phase B): *Route — the from→to path between two landmarks; the parent. Way — one named way of riding a route (its `specs`, its reference line, its gate set); rides, gate sets and results are keyed by way. WP-3 (2026-09-05) swapped these two names; ids minted before WP-3 carry the OLD prefixes (`way:<rideId>` on a Route, `route:<rideId>` on a Way) and never change — see `isUserMintedWayId`.*

**A4. Prefixes + predicate** (§3.3). `routeCreation.ts` mint sites (ex `wayCreation.ts:314,361`) and `routeFromRide.ts` (ex `wayFromRide.ts:217`): variant → `way:<rideId>`, base path → `route:<rideId>`. `defaultWay.ts` `isUserMintedWayId`: `id.startsWith('way:') || id.startsWith('route:')` with a one-line comment naming the pre-WP-3 prefix. No `validateCatalog` change.

**A5. String pass (hand edits — include-list; then the grep gate).**
1. `tabNav.tsx:46` `kind: 'way'` → `'route'`; the same literal at `CatalogDetailScreen.tsx:75,91,109` and `RoutesScreen.tsx:78`.
2. `RoutesScreen.tsx`: `"WAYS"` → `"ROUTES"`; `"No ways yet."` → `"No routes yet."`; the count line `route(s)` → `way(s)` (the "asks which one at START if >1" clause stays).
3. `CatalogDetailScreen.tsx`: title `'WAY'` → `'ROUTE'`; `"WAYS"` (`:170`) → `"ROUTES"`; `"No way uses this place yet."` → `"No route uses this place yet."`; `"WAYS TO HERE"` → `"ROUTES TO HERE"`; count line `route(s)` → `way(s)`. **`"BACK TO ROUTES"` stays.**
4. `settings.tsx` Rankings hint: `"…on that route."` → `"…on that way."`
5. `RecordScreen.tsx`: `WHICH ROUTE TODAY?` → `WHICH WAY TODAY?`; `'That route already exists'` → `'That way already exists'`; `'Could not create the way'` (×2) → `'Could not create the route'`; the in-memory `pinned` literal `'route'` (`:743,746,757` today) → `'way'` so it matches the swapped `wayLine` identifier.
6. `routeNamingCard.tsx` (ex `wayNamingCard.tsx:88,93,94`): `New route on ${…}` → `New way on ${…}`; `'New way — name where you rode'` → `'New route — name where you rode'`; the two hint sentences with every way/route word swapped (`…Was this a different way? Add what made it different to save it as a new way on this route…`; `…is a route you have, but this ride did not follow any of its ways. Name what made it different to save it as a new way…`).
7. Store/engine message text: every `validateCatalog` error string, `catalogDelete`/`routeCreation`/`routeFromRide` error strings and `console.warn` texts whose words name the entity — swap the words so the message describes what the (now swapped) loop actually iterates.
8. **Grep gate:** `grep -rn "[Ww]ay\|WAY\|[Rr]oute\|ROUTE" src --include=*.ts --include=*.tsx | grep "['\"\`]" | grep -v "^\S*:\s*\(//\|\*\|/\*\)"` — every remaining hit is either on §3.1's keep-list (`'route'` mode, `'routes'` tab, `"BACK TO ROUTES"`, the two prefix literals from A4, WP names) or has been swapped. An undecided hit is a stop, not a guess. Paste the residual list into the report.
9. Update the test assertions A2 broke (minted ids → new prefixes; message texts).

**A6. Migrations module + wiring** exactly per §3.5: `src/store/migrations.ts` (`renameKey`, `upgradeCatalog`, `upgradeResult`, `upgradeFreeRidesCache`); `catalog.ts` `decodeCatalog` → `upgradeCatalog`; `catalogStore.ts` (the two `armedFs = null` lines + warn texts — nothing else); `resultsStore.ts` (`upgradeResult` before `isValidRideResult`; `isValidRideResult` on `wayId`; no write-back); `freeRides.ts` (`upgradeFreeRidesCache` in `decodeFreeRidesCache`; validators on `wayId`; version literals); `gpxPlusExport.ts` (`wayId`/`wayIds` attributes, `…/gpx/2`) + `tests/gpxplus_suite.ts` expectations. `session.ts`, `storage/types.ts`, `eventsJsonl.ts`, `location/index.ts` need NO edits beyond what the identifier pass already did in A1 — confirm by reading them, and confirm `eventsJsonl.ts`'s `pick` case does not reject unknown keys (it checks named fields only — `:93-104`).

**A7. Seeds.** `scripts/wp3-migrate-seeds.ts` (§3.5) → `catalog.seed.json` and `results.seed.json` at v2. Sanity numbers after the run: `catalog.seed.json` has `"schemaVersion": 2`, 13 objects in `routes` each with `wayIds`, 20 objects in `ways` each with `routeId`, 20 gate sets each with `wayId`, zero occurrences of `"routeIds"`; `results.seed.json` has 30 `"wayId"` and zero `"routeId"`, every element `"schemaVersion": 2` and `"resultSchemaVersion": 2`. `assets/ways/ways.json` checked for field names. Confirm `shippedCatalog()` validates (`validateCatalog(shippedCatalog())` → `[]` — `tests/store_suite.ts:319-321` and `:472` already assert it; keep them green) and that `tests/build_seed.ts`/`build_fixtures.ts`, if they emit these keys, now emit v2 (their object keys were swapped in A1) — do not run them unless they are already part of the suite.

**A8. Tests — new `tests/migrations_suite.ts`** (registered in `tests/run.ts`):
1. `upgradeCatalog(JSON.parse(catalog.seed.v1.json fixture))` deep-equals the committed v2 `catalog.seed.json` (as parsed JSON — key order is irrelevant, compare with a key-order-insensitive deep-equal or by re-`JSON.stringify` of sorted keys); `validateCatalog` on it → `[]`.
2. Synthetic v1 user catalog (a loop with `loopDiscriminator`, a way with `specs` + `referenceRideId`, two gate-set versions on one route, one object carrying an unknown extra key `extra: 1`) → every id and value preserved field-by-field, `wayIds`/`routeId`/`wayId` in place of the old keys, the extra key carried, `schemaVersion === 2`.
3. Idempotent: `upgradeCatalog(upgradeCatalog(x))` deep-equals `upgradeCatalog(x)`; a v2 input is returned unchanged (same reference is fine).
4. Refusals: `schemaVersion: 3` → `null`; missing arrays → `null`; `decodeCatalog('{"schemaVersion":1}') === null` (already in `store_suite.ts:218`, keep it).
5. `initCatalogStore` on an in-memory fs holding the v1 text: `currentCatalog()` contains the v1 file's routes/ways under the v2 keys; the file's bytes are UNCHANGED after init (no write at init); then `saveUserCatalog(userCatalog())` → `[]` and the file now decodes with `schemaVersion: 2` and `wayIds`/`routeId`/`wayId` keys.
6. Refuse-and-disarm: `catalog.user.json` = `{"schemaVersion":3,"landmarks":[],"ways":[],"routes":[],"gateSets":[]}` → `currentCatalog()` is seed-only; then `saveUserCatalog(someValidCatalog)` returns `[]` but the file bytes are unchanged (writes disarmed). Same for a decodable-but-unmergeable file (`{"landmarks":[null],…}`, the existing `:98` comment's example).
7. `upgradeResult` on a synthetic v1 record with `ignoredFromRanking: true` + `tripwireDemoted: true` and a full `derivedBy`: `wayId === old routeId`, both flags kept, `schemaVersion === 2`, `derivedBy.resultSchemaVersion === 2`, other `derivedBy` fields untouched; `isStale(r, r.derivedBy.engineVersion, r.derivedBy.gateSetVersion) === false`; `isValidRideResult(r)`. A v2 record is returned as-is; `schemaVersion: 3` → `null`.
8. `initResultsStore` with one v1 and one v2 result file: both in `storedResults()`; NEITHER file's bytes changed; `results/index.json` (if written) carries `wayId` entries only.
9. Free-rides cache: a v1 file decodes to records whose `crossings[].wayId`/`sectors[].wayId` equal the old `routeId`s and whose `schemaVersion === 2`; a v2 file decodes unchanged; the file is not rewritten by `initFreeRidePersistence`.
10. Events + GPX+: a pre-WP-3 pick record `{kind:'pick', mode:'route', routeId:'Morning', routeIds:['Morning'], tUnixMs:…}` still validates in `eventsJsonl.ts` (unknown keys ignored); a new pick record with `wayId`/`wayIds` validates; GPX+ export of the new record emits `wayId="…" wayIds="…"` and `xmlns:qf="https://qualifire.local/gpx/2"` and never the strings `routeId=` or `gpx/1`.
11. `isUserMintedWayId('route:x') && isUserMintedWayId('way:x') && !isUserMintedWayId('Morning')`; `wayVariantLabel('route:x', …, ['Dry'])` → `Dry`; `wayLabelIn` on a legacy `route:…` way with specs → `From → To · Dry`.
12. New mints: `buildRouteCreationCatalog` yields way id `way:<rideId>` (= refLineId) and route id `route:<rideId>`.
Existing suites: green with only the A5 assertion updates and the `gpxplus_suite` expectation updates.

**A9. Full verification** (§8), then ONE commit on `virgin`: `WP-3 Phase A — way/route inversion: identifiers, schema v2 (read-side migration), seeds, strings`.

## 5. The fix — Phase B: comments, docs, cycle notes

**B1. Comment pass** over every `src/**/*.ts(x)` and `tests/**/*.ts`: for each comment containing a way/route token — backticked identifiers → `swapToken`; prose `route(s)`/`Route(s)` → swap, EXCEPT `en route`, WP/doc/decision names and "ROUTES" meaning the tab; prose `way(s)` → swap, EXCEPT the idiom list in §3.1; verbatim dated quotes of Nathan → untouched. Highest density: `types.ts`, `catalog.ts`, `catalogStore.ts`, `defaultWay.ts`, `routeCreation.ts`, `routeFromRide.ts`, `waySpecs.ts`, `tabNav.tsx`, `RecordScreen.tsx`, `catalogDetailModel.ts`, `engine.ts`. Work file by file; `grep -rn "[Ww]ays\?\b\|[Rr]outes\?\b" src tests | grep "^\S*:\s*\(//\|\*\|/\*\)"` before and after — the "after" list is pasted into the report; every remaining `way` there must be an idiom or a quote.
**B2. `product/DATA-MODEL.md`** (title, §2 Entities, §3 Schema, §4 On-disk layout, §8a "Route choice at START"): rewrite to v2 names and add a short "§5b — WP-3 inversion (2026-09-05)" with the §3.2 table's key-rename rows, the read-side-migration rule (v1 files are upgraded on read, never rewritten at init; `legacy-virgin` holds the old format) and the legacy id-prefix note (§3.3). `app/tests/README.md` if it names the renamed suites.
**B3. Coordinator-owned (not Execute):** `STATE.md` — a "Vocabulary (since WP-3)" line (route = from→to path, way = variant; legacy id prefixes; `legacy-virgin` branch = pre-WP-3 snapshot) and the catalog/result schema versions; `OPEN-ITEMS.md` — WP-3 entry closed. `IDEAS.md` untouched.
**B4. Coordinator-owned:** `cycles/virgin-cycle3/CONTEXT.md` and `README.md` — WP-3's entry reads "landed first; WP-1 and WP-2 briefs re-issued in post-swap vocabulary and run after it". (Revision 1's "read WP-1/WP-2 swapped" note is obsolete: those briefs are being re-issued, not read swapped.)

## 6. What "done" looks like for Nathan

**If he does NOT reset (the design must hold here):** he opens the app the morning after Phase A ships: ROUTES tab shows his places and his from→to routes (same rows as yesterday, now headed ROUTES, each `· N way(s)`); tapping one opens a ROUTE detail listing its WAYS; RECORD's third pill row is headed WHICH WAY TODAY? (Q5: "good"); every ride, every PB, every "Ignore in ranking" he ever set is exactly where it was. Files on disk are byte-identical until he next changes something (a new way, an ignore toggle), at which point that file is rewritten at v2 — SETTINGS → DATA's debug export shows `schemaVersion: 2` on whichever files have been touched since. The only visible seam: a GPX+ export of a ride recorded before WP-3 has no `wayId` attribute on its `<qf:pick>` (§3.5).

**If he resets (what he said he will probably do):** SETTINGS → DATA → "Reset to virgin" moves everything aside; the app comes up with an empty catalog, "No routes yet.", and every route/way he creates from then on is minted with the new prefixes and written at v2 from the first byte. Nothing v1 is ever read again.

## 7. Acceptance criteria

Phase A
1. `migrations_suite.ts` passes all 12 tests; whole suite 0 FAIL; `tsc --noEmit` exit 0.
2. `scripts/wp3-swap-identifiers.ts`'s printed before→after list is in the report; it contains no identifier from the §3.1 keep-list and no false positive (`always`, `waypoint`, `router`, …).
3. `grep -rn "RoutesScreen" src` still finds the component and file; `grep -rn "'routes'" src/ui/tabNav.tsx` still finds the tab id; `grep -rn "BACK TO ROUTES" src` still hits; `grep -rn "'route'" src/live src/location src/storage` finds only `mode` literals.
4. `grep -rn "routeId" src` finds ONLY: `Way.routeId` (the FK) and its uses, the migration module's `'routeId'` string keys, and comments marked pre-WP-3 — nothing keyed to a result, gate set, index entry, free-ride crossing or pick event.
5. `grep -rn "routeIds\|gpx/1" src` finds ONLY the migration module's `'routeIds'` string key (and Phase-B-pending comments). No dual emission anywhere.
6. `catalog.seed.json` at `schemaVersion: 2` with 13 routes / 20 ways (A7's sanity numbers), `results.seed.json` every element `wayId` + `schemaVersion: 2` + `derivedBy.resultSchemaVersion: 2`; `upgradeCatalog(v1 fixture)` deep-equals the committed seed (test 1).
7. On an in-memory fs seeded with a v1 `catalog.user.json`, a v1 result, a v2 result and a v1 free-rides cache: after the three `init*` calls every file's bytes are UNCHANGED and every record is in memory at v2; a refused catalog file leaves `saveUserCatalog` a no-op on disk (tests 5, 6, 8, 9).
8. A new ride's pick event carries `wayId`/`wayIds`; GPX+ export emits them under `…/gpx/2`; a pre-WP-3 pick record still validates (test 10).
9. The A5 grep-gate residual list is in the report and every line is on the keep-list.
10. Repo: `tests/fixtures/catalog.seed.v1.json` exists byte-identical to `legacy-virgin`'s `app/src/store/catalog.seed.json` (`git show legacy-virgin:app/src/store/catalog.seed.json | diff - app/tests/fixtures/catalog.seed.v1.json` prints nothing); nothing was deleted (`git status` shows renames as `R`); branch `legacy-virgin` still points at `befb6b0`.
11. One commit for all of Phase A, on `virgin`.

Phase B
12. The B1 "after" grep list is in the report; every surviving prose `way` is an idiom or a dated quote; no comment describes `Catalog.ways` as from→to paths or `Catalog.routes` as variants.
13. `product/DATA-MODEL.md` reads in v2 vocabulary with the §5b note; `tsc` and the suite unaffected (comments only).
14. On-device (Nathan, whichever path he takes): §6 — if un-reset, his routes/ways/PBs are all present and one ride he had set to "Ignore in ranking" is still ignored; if reset, the virgin app shows "No routes yet." and the first route he creates exports at `schemaVersion: 2` with `route:`/`way:` prefixes on the right entities.

## 8. Verification

```
cd app && node --experimental-strip-types tests/run.ts      # zero FAIL; report before/after totals (A0 vs A9)
cd app && ./node_modules/.bin/tsc --noEmit                    # exit 0 (never bare `npx tsc` on this mount)
cd app && node --experimental-strip-types scripts/wp3-swap-identifiers.ts --dry-run   # after A9: prints the A1 list with every pair REVERSED (the swap is an involution, so a run over the swapped tree would swap it back) — any pair in one list but not the other is an identifier hand-added or hand-edited in A2–A8 (e.g. in migrations.ts) and must be listed and explained in the report
git show legacy-virgin:app/src/store/catalog.seed.json | diff - app/tests/fixtures/catalog.seed.v1.json && echo FIXTURE-OK
```
(Revision 1 said the dry-run "must print an EMPTY change list" — that was wrong for an involution; corrected above.) On-device proof is §7 item 14; no before/after export comparison is needed any more (nothing is rewritten at init, so there is nothing to compare).

## 9. Stop-on-ambiguity

If any anchor here does not match the file, or any call below is undecided, **STOP and report verbatim** — do not guess, do not rule on it from the coordinator's chat; the coordinator forwards it to a fresh Fable Plan pass.

**Failure mode 1 — the single highest risk, and the reason Phase A is one commit:** a v1 file read under v2 meaning. `Catalog.ways` in a v1 file holds from→to paths; v2 code treats `ways` as variants. If the swap ships without `upgradeCatalog` gating on `schemaVersion`, `catalog.user.json` is misread; `validateCatalog` then rejects the merge, `initCatalogStore` falls back to an EMPTY user catalog, and — because today's store leaves writes armed — the next `saveUserCatalog` overwrites the rider's only copy. Equivalent paths: `isValidRideResult` rejecting every `routeId` result → backfill re-derives and `saveResult`s → every `ignoredFromRanking` flag lost; `isValidCrossing` rejecting every free ride. A field that keeps its old NAME while its MEANING flips (a `routeId` on a result left un-renamed while `Catalog.routes` now holds base paths) is the same failure in slow motion: lookups silently miss, results show unmatched, and nothing errors. Hence the four things this revision keeps: the `schemaVersion` gate, the key rename on read, refuse-and-disarm, and the seeds rewritten in the same commit. Any executor shortcut on any of these is a stop. (What this revision deliberately does NOT do — write back at init, keep a backup file, assert per-element shapes — is not a shortcut; it is the design, per Nathan's Q1.)

Specific stops:
- `results.ts:76-86` `isStale()` has no production caller today (verified: `grep` finds only the definition). If the executor finds one, stop: the `derivedBy.resultSchemaVersion: 2` decision must be re-confirmed against how that caller reacts.
- If `grep -l "routeId\|wayId\|routeIds" tests/fixtures/*.json` is non-empty (A0; verified empty on 2026-09-05), stop and report which files before converting anything.
- If the identifier script's printed list contains any pair you cannot classify as entity-denoting (a helper whose `route` might mean the TAB, or whose `way` is the English word), stop with the pair.
- If `tsc` fails after A2 on anything other than a module path, stop.
- If `assets/ways/ways.json` contains way/route FIELD names, stop.
- If any in-repo code READS GPX+ back (an importer/replayer keyed on `routeId=`), stop (verified none on 2026-09-05: only the exporter and `gpxplus_suite` mention `qf:pick`).
- If `freeRides.ts`'s init/decode shape differs from §3.5's description (`{schemaVersion, rides}`), stop.
- If any test compares a migrated seed or result byte-for-byte against the v1 fixture, stop (the v1 fixture is an INPUT only).
- If `eventsJsonl.ts`'s `pick` validator (`:93-104`) turns out to reject unknown keys (so a pre-WP-3 pick record would fail to load after the rename), stop — that would need a decision on a read shim after all.
- Any `writeText` call site (`grep -rn "writeText(" src`) writing a file kind not listed in §3.2 that carries `routeId`/`wayId`/`routeIds` — stop and report it.
- If any step seems to require touching `WP-1-multi-sport-support.md`, `WP-2-results-tab.md`, or branch `legacy-virgin` — stop; none of them is in scope.
- Executor's report states test totals before/after, the swap list, the grep-gate residual list, the exact files touched and renamed (`CLAUDE.md` rule 3).

## 10. Open questions for Nathan — ALL FIVE ANSWERED (2026-09-05, in `QUESTIONS-FOR-NATHAN.md`), nothing left blocking

- **Q1 — id prefixes.** New ways `way:<rideId>`, new routes `route:<rideId>`; ids already on the phone keep their old prefixes; or freeze the old prefixes for new ids too (§3.3 option a)? — **ANSWERED, folded into §3.3 / §3.5:** "no need to update the recorded data as well as I will probably try to reset the app to get a virgin build again. That data will then be all correct again with the updated naming." → option (c) stands; the migration is cut to a read-side key rename with no writes at init (§3.5), and the cross-array id rule is dropped.
- **Q2 — tab name.** Browse tab stays ROUTES; sections YOUR PLACES / ROUTES; detail lists WAYS and ROUTES TO HERE. — **ANSWERED, confirmed:** "OK". No change (§3.4).
- **Q3 — order.** WP-3 last (revision 1's recommendation) or first? — **ANSWERED, reversed the brief's call:** "run WP-3 first!" → WP-3 executes now, against today's tree; WP-1 and WP-2 are re-issued by separate Plan passes and run after it (§3.7, header).
- **Q4 — GPX+ export.** `routeId=`/`routeIds=` → `wayId=`/`wayIds=`, namespace `/gpx/2`; any external reader that needs dual emission? — **ANSWERED, resolved by a branch:** "I dont have my own tool for reading gpx+ files. If we think this is an issue you can consider making a new branch, and calling the old branch something like 'legacy-virgin'." → branch `legacy-virgin` created at `befb6b0` by the coordinator; straight bump, no dual emission, no compat readers (§3.5).
- **Q5 — RECORD copy.** WHICH WAY TODAY? — **ANSWERED, confirmed:** "good." No change (§4 A5.5).
