**Status: BRIEF WRITTEN, NOT YET EXECUTED. BLOCKED until WP-1 and WP-2 have fully landed (every phase) — WP-3 runs LAST in this cycle (§3.7 says why).** Two phases, strictly sequential (A → B). Phase A is one Sonnet Execute dispatch and ONE commit: the identifier swap, the on-disk migration and the seed rewrite are never allowed to land separately (§8, failure mode 1). Phase B is a second dispatch (prose + docs), low risk.
**Open item:** new ask, Nathan 2026-09-05 ("a big reworking package … the way/routes naming … should be inverted in the app and in the code that produces it. It makes more sense for ways to be a subdivision of routes. Multiple ways to take the same routes sounds logic. Multiple routes to take a same way does not. So every mention of either should be swapped accordingly. This is WP-3"). Size: **large** — ~245 identifier occurrences across 13 named files plus every consumer, a versioned on-disk migration of three file kinds with two more read-compat shims, two bundled seed files rewritten, 6 test suites renamed, ~30 UI/store strings, then a comment/docs pass. Not in `OPEN-ITEMS.md` yet — the coordinator adds it under the "virgin-cycle3" block when this brief is accepted.
**Written by:** Plan tier (Fable) — an architecture decision with data-migration stakes (Nathan's phone holds a real `catalog.user.json`, `results/`, `free-rides-cache.json` and append-only ride recordings in today's field names); not a fix the coordinator should rule on.
**Verified against the device tree 2026-09-05 (night).** Every `file:line` below was read on the device. This brief is deliberately anchor-LIGHT: it prescribes a token policy and an exception list, not a line-by-line edit list, because WP-1 and WP-2 land first and will move every line number — re-grep before editing, and treat the mapping table (§3.2) and exception list (§3.1) as the contract.
**WP-1 / WP-2 interplay:** both briefs are written in TODAY's vocabulary (WP-2 §1.2 even says so: "Nathan's 'way' here is the code's *route*"). They execute as written; WP-3's identifier swap (§3.6) then covers their code mechanically. Neither brief is rewritten. After WP-3 lands, the coordinator adds a one-line vocabulary note to `CONTEXT.md` (§5 B4).

---

# WP-3 — Way/Route inversion: a *route* is the from→to path, a *way* is one way of riding it

## 1. What it is

Today's schema has the two words backwards relative to how Nathan thinks and talks (his WP-2 message already used the inverted words, and WP-2's author had to translate). Today:

- **Way** = the base from→to path between two landmarks (`{id, startLandmarkId, endLandmarkId, loopDiscriminator?, routeIds}`), the PARENT.
- **Route** = one named variant of a Way — the thing that carries `specs` ("Dry", "Fast"), a `refLineId`, a `gateSetVersion`, a `referenceRideId`, and that rides, gate sets and results are keyed by (`routeId`) — the CHILD, FK `wayId`.

After WP-3 the *relationship* is untouched and the *names* are swapped: **Route** is the from→to path, **Way** is a named variant of it ("multiple ways to take the same route"). Every identifier, type, FK field, filename, UI string and comment that names the entity swaps. Every id VALUE stays byte-identical. Every file already on Nathan's phone is either migrated once (versioned, backed up) or read through a compat shim (append-only files) — nothing becomes unreadable and nothing is silently reinterpreted.

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

- `catalog.ts:31-40` `decodeCatalog` = raw `JSON.parse` + "four arrays exist"; it does **not** look at `schemaVersion`. `catalogStore.ts:79-112` `initCatalogStore`: an undecodable file is "ignored for this session, never written" — but **writes stay armed** (`armedFs` is set at `:80` and never cleared), so the next `saveUserCatalog` would overwrite the only copy of the rider's catalog with `empty + additions`. Today that is a latent hazard; under a schema change it is the catastrophic path (§8). WP-3 closes it.
- `resultsStore.ts:72-89` `isValidRideResult` requires `v.routeId === null || typeof v.routeId === 'string'`; an invalid file is silently skipped (`:185`). After a blind rename every existing result would be skipped, the index self-heals to empty, and the next `backfillMissingResults` re-derives every ride from raw — **losing every `ignoredFromRanking` flag** (WP-H; a rider decision that lives ONLY in the result file, `types.ts:114-119`). So results are NOT purely re-derivable and must be migrated, not dropped.
- `results.ts:76-86` `isStale()` compares `derivedBy.resultSchemaVersion !== RESULT_SCHEMA_VERSION` (no production caller today — `grep` finds only the definition — but the contract exists). A migrated record must therefore carry `derivedBy.resultSchemaVersion: 2` too, or it reads as stale forever.
- Raw ride recordings (`rides/<id>.jsonl`, `.events.jsonl`) are **append-only** (D-023, `STATE.md`): never rewritten. `index.json` carries only `mode` — no route field — untouched.
- **Never delete** (`CLAUDE.md` 5): the pre-migration `catalog.user.json` is kept as a sibling backup, not overwritten in place.

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
| `Way.sportId?` (only if WP-1 landed) | `Route.sportId?` | carried through verbatim by the migration's generic key handling |
| `interface Route` (variant) | `interface Way` | type name |
| `Route.id` | `Way.id` | value unchanged; legacy `route:<rideId>` and seed ids (`Morning`) stay; NEW mints `way:<rideId>` |
| `Route.wayId` | `Way.routeId` | **key rename** (FK to the from→to path) |
| `Route.refLineId` / `.gateSetVersion` / `.seeded` / `.referenceRideId?` / `.specs?` | `Way.refLineId` / `.gateSetVersion` / `.seeded` / `.referenceRideId?` / `.specs?` | unchanged |
| `GateSet.routeId` | `GateSet.wayId` | **key rename** |
| `Catalog.ways: Way[]` (held base paths) | `Catalog.ways: Way[]` (holds VARIANTS) | same JSON label, swapped contents |
| `Catalog.routes: Route[]` (held variants) | `Catalog.routes: Route[]` (holds BASE PATHS) | same JSON label, swapped contents |
| `Catalog.schemaVersion: 1` | `2` | migration gate |
| `RideResult.routeId: string \| null`, `.schemaVersion: 1`, `.derivedBy.resultSchemaVersion: 1` | `RideResult.wayId`, `2`, `2` | key rename + both version fields; `ignoredFromRanking`, `tripwireDemoted`, `sectors`, `lap`, `source` byte-identical |
| `ResultsIndexEntry.routeId` | `.wayId` | rebuilt from results at init |
| `FreeRideRecord.schemaVersion: 1`, `crossings[].routeId`, `sectors[].routeId` | `2`, `.wayId`, `.wayId` | one-file migration |
| pick event `routeId` / `routeIds` (`.events.jsonl`) | `wayId` / `wayIds` written from now on; old keys still ACCEPTED on read | append-only — never rewritten |
| `ActiveSession.routeIds` (`qualifire-active-ride.json`) | `.wayIds` written; old key read | transient |
| `EngineStartOptions.routeIds`, `freeCrossings[].routeId`, `freeSectors[].routeId`, `TrackSpec` consumers | `wayIds`, `wayId`, `wayId` | in-memory |
| `CatalogDetailRequest.kind: 'place' \| 'way'` (`tabNav.tsx:46`; used `CatalogDetailScreen.tsx:75,91,109`, `RoutesScreen.tsx:78`) | `'place' \| 'route'` | in-memory nav; all 5 sites |
| GPX+ pick attributes `routeId=` / `routeIds=`, `xmlns:qf=…/gpx/1` | `wayId=` / `wayIds=`, `…/gpx/2` | export format bump (Q4) |
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

**Decision: (c).** Cost: on Nathan's phone the `ways` array will hold both `route:…` (pre-WP-3) and `way:…` (post) ids; on every other install prefixes read correctly from day one. Ride ids mint at most once, so a legacy `way:R` (base) and a new `way:R` (variant) can only collide if ride R minted twice, which no code path does — but `validateCatalog` today checks id uniqueness only WITHIN each array (`catalog.ts:75-93`); Phase A adds a cross-array uniqueness rule so any such collision is a refused save, never a silent one. Nathan Q1 is the veto: if he prefers (a), drop the two mint edits and keep the single-prefix predicate.

### 3.4 The browse tab keeps its name

Today the ROUTES tab shows "YOUR PLACES" then a section headed "WAYS" (`RoutesScreen.tsx:70`), each row `from → to · N route(s)`. Post-inversion the same screen shows "YOUR PLACES" then "ROUTES", each row `from → to · N way(s)`, tap → `{kind:'route', id}` → detail titled `ROUTE` with a "WAYS" list. The tab is named after its main list, which is now literally routes — so `RoutesScreen.tsx`, `Tab 'routes'`, the label and `"BACK TO ROUTES"` all stay. The executor must NOT let the identifier script rename `RoutesScreen` (it is the one identifier on the exception list) and must not touch the `'routes'` string literal.

### 3.5 The migration: versioned, structurally asserted, backed up, refuse-and-disarm

New pure module **`src/store/migrations.ts`** (no expo/Node imports, like `types.ts`). All functions take `unknown` and return the v2 shape or `null`; none throws.

- `renameKey(o, from, to)`: new object with the same key ORDER, `to` sitting where `from` sat; returns `null` if `to` is already present (a half-migrated object is never touched). Unknown extra keys (e.g. WP-1's `sportId`) pass through untouched.
- **`upgradeCatalog(raw): { catalog: Catalog; migrated: boolean } | null`**, line by line:
  1. `raw` must be an object with array `landmarks`, `ways`, `routes`, `gateSets` (today's `decodeCatalog` check) — else `null`.
  2. `sv = raw.schemaVersion`. **If `sv === 2`:** assert the v2 shape — every `ways[i]` has a string `routeId` and no `routeIds`/`wayId` key; every `routes[i]` has an array `wayIds` and no `routeIds`; every `gateSets[i]` has a string `wayId` and no `routeId`. Pass → `{catalog: raw, migrated: false}`. Fail → `null` (a v2 label on v1 keys is REFUSED, never interpreted).
  3. **If `sv === 1` or `sv === undefined`:** assert the v1 shape — every `routes[i]` has a string `wayId` and no `routeId`; every `ways[i]` has an array `routeIds` and no `wayIds`; every `gateSets[i]` has a string `routeId` and no `wayId`. Fail → `null` (never half-swap).
  4. `newRoutes = raw.ways.map(w => renameKey(w, 'routeIds', 'wayIds'))`; `newWays = raw.routes.map(r => renameKey(r, 'wayId', 'routeId'))`; `newGateSets = raw.gateSets.map(g => renameKey(g, 'routeId', 'wayId'))`; `landmarks` verbatim. Any `renameKey` returning `null` → whole result `null`.
  5. Return `{ catalog: { schemaVersion: 2, landmarks, ways: newWays, routes: newRoutes, gateSets: newGateSets }, migrated: true }` — top-level key order `schemaVersion, landmarks, ways, routes, gateSets`, same labels as v1, swapped contents.
  6. Any other `sv` → `null` (a future version is refused, not guessed at).
- **`upgradeResult(raw): { result: RideResult; migrated: boolean } | null`**: object with `kind === 'rideResult'`; if `schemaVersion === 2` → must have key `wayId` (string or null) and no `routeId` → as-is; if `schemaVersion === 1` (or undefined) → must have `routeId` and no `wayId` → `renameKey(raw,'routeId','wayId')`, `schemaVersion: 2`, and `derivedBy: {...derivedBy, resultSchemaVersion: 2}` when `derivedBy` is an object (so `isStale()` does not condemn every migrated record); everything else (`ignoredFromRanking`, `tripwireDemoted`, `lap`, `sectors`, `source`, `startedAtMs`, `rideId`, `engineVersion`, `gateSetVersion`) byte-identical. Other versions → `null`. Structural validity is still `isValidRideResult`'s job afterwards.
- **`upgradeFreeRidesCache(raw): { rides: FreeRideRecord[]; migrated: boolean } | null`**: file `{schemaVersion, rides}`; v1 → each record's `crossings[]`/`sectors[]` get `renameKey(…, 'routeId', 'wayId')`, record `schemaVersion: 2`; v2 → assert `wayId` keys; else `null`.

**Wiring — `catalogStore.ts` `initCatalogStore`** (replaces `:79-112`; posture otherwise unchanged):
1. `armedFs = fs; user = emptyCatalog(); let original: string | null = null;`
2. `text = await fs.readText(USER_CATALOG_FILE)` (catch → same as missing). If non-null: `up = upgradeCatalog(JSON.parse(text))` (parse failure → `up = null`). `up === null` → `console.warn` (existing wording + "refused") , `user = emptyCatalog()`, **`armedFs = null`** (NEW — a refused file can never be overwritten this session). Else `user = up.catalog`; if `up.migrated` → `original = text`.
3. `recompute()` in the existing try/catch; on throw: existing warn, `user = emptyCatalog()`, **`armedFs = null`** (NEW), `recompute()`.
4. If `original !== null && armedFs !== null`: `errs = validateCatalog(current)`; if `errs.length > 0` → `console.warn('initCatalogStore: migrated catalog does not validate — original left untouched: ' + errs.join('; '))`, `user = emptyCatalog()`, `armedFs = null`, `recompute()`. Else `enqueueWrite(async f => { const b = await f.readText(BACKUP_FILE); if (b === null) await f.writeText(BACKUP_FILE, original); else if (b !== original) { console.warn('…a different catalog.user.v1.json already exists — nothing written'); armedFs = null; return; } await f.writeText(USER_CATALOG_FILE, encodeCatalog(user)); })` with `export const BACKUP_FILE = 'catalog.user.v1.json'`. The backup is written FIRST and the migrated file only after it resolved; an existing identical backup (a previous boot that crashed between the two writes) is reused; a *different* existing backup disarms writes and reports.
5. Return `current`. `decodeCatalog(text)` becomes `upgradeCatalog(JSON.parse(text))?.catalog ?? null` so every other caller (tests, `catalogDelete`) sees v2.

**Wiring — `resultsStore.ts` `initResultsStore`** (`:185-189`): after `JSON.parse`, `up = upgradeResult(parsed)`; `null` → `continue` (as today's invalid path); `!isValidRideResult(up.result)` → `continue`; `store.set(...)`; `if (up.migrated) migratedIds.push(rideId)`. After the loop, if `neededDirScan || migratedIds.length > 0` → one `enqueueWrite` that writes each migrated `results/<id>.json` via `encodeResult`, then the rebuilt `index.json` (which now carries `wayId`). In-place rewrite is what `saveResult` already does routinely; a torn write of one file costs that one ride a re-derivation at the next backfill — stated, accepted. `isValidRideResult` checks `v.wayId`.

**Wiring — `freeRides.ts`**: `decodeFreeRidesCache(text)` (`:88`) runs `upgradeFreeRidesCache`; `initFreeRidePersistence` (`:182`) rewrites the cache file once when `migrated`. `isValidCrossing`/`isValidFreeSector` check `wayId`. Type literal `schemaVersion: 1` → `2`.

**Compat shims (append-only / transient — never rewritten):** `session.ts:59` reads `parsed.wayIds ?? parsed.routeIds` with the same array/null/undefined normalisation, writes `wayIds`; `storage/types.ts:127-138` pick event gets `wayId?`/`wayIds?` plus `/** pre-WP-3 recordings only — read, never written */ routeId?; routeIds?`; `eventsJsonl.ts:98-101` validator accepts either pair; `location/index.ts:399-401` writes `wayId`/`wayIds`; `gpxPlusExport.ts:228-230` emits `wayId`/`wayIds` from `pickEv.wayId ?? pickEv.routeId` (and the `Ids` twin), namespace `…/gpx/2` (`:544`).

**Seeds (in-repo, Nathan's build only):** `scripts/wp3-migrate-seeds.ts` (run with `node --experimental-strip-types`) imports `migrations.ts`, upgrades `src/store/catalog.seed.json` and every element of `src/store/results.seed.json`, writes them back with `JSON.stringify(x, null, 1) + '\n'` (the files' existing 1-space indent). The pre-WP-3 originals are copied VERBATIM to `tests/fixtures/catalog.seed.v1.json` and `tests/fixtures/results.seed.v1.json` first — they are the migration tests' real-data inputs and the never-delete copies. `assets/ways/ways.json` (ex `routes.json`) is keyed by refLine id; the executor checks it for way/route FIELD names (none expected — stop if found).

### 3.6 How the swap is executed: a TypeScript-parser identifier pass, then hand passes for strings and comments

A `sed` over 245 occurrences cannot tell `wayId` from `always`, or the entity "way" from "the way it always has" in a comment. So:

- **`scripts/wp3-swap-identifiers.ts`** (committed, run once, kept for audit): for every `src/**/*.{ts,tsx}` and `tests/**/*.ts`, `ts.createSourceFile(…, /*setParentNodes*/ true, TSX for .tsx)`, visit every `Identifier`/`PrivateIdentifier`, compute `swapToken(node.text)`, skip the exception list (`RoutesScreen`), collect `[node.getStart(sf), node.getEnd(), replacement]`, apply right-to-left, write. String literals, template literals, JSX text and comments are untouched by construction. `swapToken` is ONE regex pass (never two — a second pass would swap back):
  `/(?<![A-Za-z])(way|ways|route|routes)(?![a-z])|(?<![A-Z])(Way|Ways|Route|Routes)(?![a-z])|(?<![A-Za-z])(WAY|WAYS|ROUTE|ROUTES)(?![A-Za-z])/g` with a replacer mapping each token to its partner (`way↔route`, `ways↔routes`, `Way↔Route`, `Ways↔Routes`, `WAY↔ROUTE`, `WAYS↔ROUTES`). Check cases the guards must get right: `routeId→wayId`, `routesForWay→waysForRoute`, `WayNamingCard→RouteNamingCard`, `ROUTE_DISPLAY_ID→WAY_DISPLAY_ID`, `offRouteM→offWayM`, `wayRoutes→routeWays`; and must leave alone: `always`, `away`, `midway`, `anyway`, `gateway`, `waypoint`, `Waypoint`, `router`, `Router`, `routing`. The script prints every distinct `before → after` identifier pair, sorted; that list goes verbatim into the Execute report for Inspect.
- **Renames**: `git mv` per §3.2's file row (basename through `swapToken`, `RoutesScreen.tsx` excepted; `assets/routes/` → `assets/ways/`, `routes.json` → `ways.json`); then fix import/require specifiers (string literals — the identifier pass does not see them): for each rename, replace the exact old module path in `import … from '…'`, `export … from '…'`, `require('…')` across `src/`, `tests/` and `tests/run.ts`. `tsc --noEmit` is the check that none was missed.
- **Strings (Phase A, hand pass, include-list in §4 A5)** and **comments (Phase B)** follow §3.1's exception list.

### 3.7 Execution order: WP-1 → WP-2 → WP-3, and no brief gets rewritten

The coordinator's instinct was WP-3 before WP-2 "so WP-2 is built once, in final terminology". Weighed against the alternative:

| | WP-3 first | WP-3 last (this brief) |
|---|---|---|
| WP-1 and WP-2 briefs (85 KB, written in today's names, every anchor verified against today's tree) | both must be re-issued by a Plan pass before execution — a find-replace on a brief is exactly the half-swap this WP exists to prevent, and every `file:line` needs re-verifying against a swapped tree | execute exactly as written |
| Reconciling WP-1/WP-2 code to the new names | n/a | free — §3.6's identifier pass runs over the whole tree; their new identifiers (`Way.sportId`, `routeIdsOfSport`, `storedResultsForRoute`, RESULTS copy) swap with everything else; their UI strings are caught by A5's grep gate |
| Stop-on-ambiguity risk | high — an executor reading an un-rewritten brief against a swapped tree hits an anchor mismatch on nearly every line | low |
| Nathan sees the inverted words | weeks earlier | after WP-1/WP-2 — the coordinator translates in chat meanwhile (Nathan already speaks post-inversion; WP-2 §1.2 shows the translation is mechanical) |

**Decision: WP-3 executes last, after every phase of WP-1 and WP-2 has landed and passed Inspect.** README status table: row 2 (WP-2) and row 1 (WP-1) get "lands BEFORE WP-3 — no reconciliation pass needed; its brief stays in pre-WP-3 vocabulary"; row 3 (WP-3) reads "BLOCKED until WP-1 and WP-2 have fully landed". If Nathan overrules (Q3), the cost is one Plan re-issue of each earlier brief BEFORE its execution — never a find-replace.

## 4. The fix — Phase A: identifiers, fields, migration, seeds, strings, tests (ONE commit)

Order matters; run the suite after each step and record the FAIL count in the report. **Steps A1–A9 are one indivisible commit: the tree must never be committed with the swap but without the migration (§8, failure mode 1).**

**A0. Baseline.** `cd app && node --experimental-strip-types tests/run.ts` and `./node_modules/.bin/tsc --noEmit` — record the totals. Copy `src/store/catalog.seed.json` → `tests/fixtures/catalog.seed.v1.json` and `src/store/results.seed.json` → `tests/fixtures/results.seed.v1.json` (verbatim). `grep -l "routeId\|wayId\|routeIds" tests/fixtures/*.json` — any hit is a v1 input to a reader: leave it v1 if it flows through a reader that now upgrades, convert it with `upgradeCatalog`/`upgradeResult` if it is handed to a pure function typed as v2. Report which.

**A1. Identifier pass.** Write and run `scripts/wp3-swap-identifiers.ts` (§3.6). Expect `tsc` to fail ONLY on import paths (A2 fixes) — anything else is a stop.

**A2. Renames + import paths** (§3.2 file row, §3.6). `tsc --noEmit` clean. Run the suite: the ONLY expected failures are assertions on minted-id text (`` `route:${…}` `` in `routecreation_suite`) and on message text (`validateCatalog` errors, `Alert` copy) — A5 fixes them; anything else is a stop.

**A3. Types + versions.** `types.ts`: `CATALOG_SCHEMA_VERSION = 2`, `RESULT_SCHEMA_VERSION = 2`; `freeRides.ts` `SCHEMA_VERSION = 2` and the `schemaVersion: 2` literal type. Rewrite the doc comments on `Route` and `Way` in `types.ts` (this pair only — the rest of the prose is Phase B): *Route — the from→to path between two landmarks; the parent. Way — one named way of riding a route (its `specs`, its reference line, its gate set); rides, gate sets and results are keyed by way. WP-3 (2026-09-05) swapped these two names; ids minted before WP-3 carry the OLD prefixes (`way:<rideId>` on a Route, `route:<rideId>` on a Way) and never change — see `isUserMintedWayId`.*

**A4. Prefixes + predicate + cross-array rule** (§3.3). `routeCreation.ts` mint sites and `routeFromRide.ts`: variant → `way:<rideId>`, base path → `route:<rideId>`. `defaultWay.ts` `isUserMintedWayId`: both prefixes, commented. `catalog.ts` `validateCatalog`: after the two per-array duplicate checks, `if (wayIdSet.has(route.id))`-style cross check → `duplicate id ${id} used by both a way and a route`.

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

**A6. Migrations module + wiring + shims** exactly per §3.5: `src/store/migrations.ts`; `catalogStore.ts` (backup file, refuse-and-disarm in all three refusal branches, validate-before-write); `resultsStore.ts`; `freeRides.ts`; `session.ts`; `storage/types.ts` + `eventsJsonl.ts`; `location/index.ts`; `gpxPlusExport.ts` (+ update `gpxplus_suite` expectations for the attribute names and `…/gpx/2`).

**A7. Seeds.** `scripts/wp3-migrate-seeds.ts` (§3.5) → `catalog.seed.json` and `results.seed.json` at v2. `assets/ways/ways.json` checked for field names. Confirm `shippedCatalog()` validates and `tests/build_seed.ts`/`build_fixtures.ts`, if they emit these keys, now emit v2 (their object keys were swapped in A1) — do not run them unless they are already part of the suite.

**A8. Tests — new `tests/migrations_suite.ts`** (registered in `tests/run.ts`):
1. `upgradeCatalog(v1 seed fixture)` deep-equals the committed v2 `catalog.seed.json`; `migrated === true`; `validateCatalog` → `[]`.
2. Synthetic v1 user catalog (a loop with `loopDiscriminator`, a way with `specs` + `referenceRideId`, two gate-set versions on one route, one object carrying an unknown extra key `sportId`) → every id and value preserved field-by-field, `wayIds`/`routeId`/`wayId` in place of the old keys, extra key carried, key order preserved, `schemaVersion === 2`.
3. Idempotent: `upgradeCatalog(upgradeCatalog(x).catalog)` → same object, `migrated === false`.
4. Refusals: v2 label with v1 keys → `null`; v1 label with v2 keys → `null`; `schemaVersion: 3` → `null`; a v1 route already carrying `routeId` → `null`.
5. `initCatalogStore` on an in-memory fs holding the v1 text: `catalog.user.v1.json` bytes === original; `catalog.user.json` decodes as v2 and equals `currentCatalog()`'s user half; a second `initCatalogStore` writes nothing (compare fs write counts or bytes).
6. Refuse-and-disarm: v2-labelled/v1-keyed file → `currentCatalog()` is seed-only, then `saveUserCatalog(someValidCatalog)` returns `[]` but the file bytes are unchanged and no backup exists.
7. Migrated catalog that fails `validateCatalog` (e.g. dangling gate set) → nothing written, warn, seed-only, writes disarmed.
8. `upgradeResult` on the v1 results-seed fixture's first element and on a synthetic record with `ignoredFromRanking: true` + `tripwireDemoted: true`: `wayId === old routeId`, both flags kept, `schemaVersion === 2`, `derivedBy.resultSchemaVersion === 2`, other `derivedBy` fields untouched; `isStale(r, r.derivedBy.engineVersion, r.derivedBy.gateSetVersion) === false`; `isValidRideResult(result)`.
9. `initResultsStore` with one v1 and one v2 result file: both in `storedResults()`; only the v1 file's bytes changed; `results/index.json` entries carry `wayId`.
10. Free-rides cache v1 → v2 once; a v2 file is not rewritten.
11. `parseSession`/reader of `qualifire-active-ride.json` with `routeIds: ['x']` → `wayIds: ['x']`; with `wayIds` → same; with neither → `undefined`.
12. Events: a pick record with `routeId`/`routeIds` validates; GPX+ export emits `wayId="…" wayIds="…"` and `xmlns:qf="https://qualifire.local/gpx/2"` for both an old and a new pick record.
13. `isUserMintedWayId('route:x') && isUserMintedWayId('way:x') && !isUserMintedWayId('Morning')`; `wayVariantLabel('route:x', …, ['Dry'])` → `Dry`; `wayLabelIn` on a legacy `route:…` way with specs → `From → To · Dry`.
14. New mints: `buildRouteCreationCatalog` yields way id `way:<rideId>` (= refLineId) and route id `route:<rideId>`.
15. `validateCatalog` rejects a catalog where a way and a route share an id.
Existing suites: green with only the A5 assertion updates.

**A9. Full verification** (§7), then ONE commit: `WP-3 Phase A — way/route inversion: identifiers, schema v2 migration, seeds, strings`.

## 5. The fix — Phase B: comments, docs, cycle notes

**B1. Comment pass** over every `src/**/*.ts(x)` and `tests/**/*.ts`: for each comment containing a way/route token — backticked identifiers → `swapToken`; prose `route(s)`/`Route(s)` → swap, EXCEPT `en route`, WP/doc/decision names and "ROUTES" meaning the tab; prose `way(s)` → swap, EXCEPT the idiom list in §3.1; verbatim dated quotes of Nathan → untouched. Highest density: `types.ts`, `catalog.ts`, `catalogStore.ts`, `defaultWay.ts`, `routeCreation.ts`, `routeFromRide.ts`, `waySpecs.ts`, `tabNav.tsx`, `RecordScreen.tsx`, `catalogDetailModel.ts`, `engine.ts`. Work file by file; `grep -rn "[Ww]ays\?\b\|[Rr]outes\?\b" src tests | grep "^\S*:\s*\(//\|\*\|/\*\)"` before and after — the "after" list is pasted into the report; every remaining `way` there must be an idiom or a quote.
**B2. `product/DATA-MODEL.md`** (title, §2 Entities, §3 Schema, §4 On-disk layout, §8a "Route choice at START"): rewrite to v2 names and add a short "§5b — WP-3 inversion (2026-09-05)" with the §3.2 table's key-rename rows and the backup-file note. `app/tests/README.md` if it names the renamed suites.
**B3. Coordinator-owned (not Execute):** `STATE.md` — a "Vocabulary (since WP-3)" line (route = from→to path, way = variant; legacy id prefixes) and the catalog/result schema versions; `OPEN-ITEMS.md` — WP-3 entry closed. `IDEAS.md` untouched.
**B4. Coordinator-owned:** `cycles/virgin-cycle3/CONTEXT.md` gets: *"WP-1 and WP-2 briefs predate WP-3 and use the pre-inversion words — read their `way`↔`route` swapped."*

## 6. What "done" looks like for Nathan

He opens the app the morning after Phase A ships: ROUTES tab shows his places and his from→to routes (same rows as yesterday, now headed ROUTES, each `· N way(s)`); tapping one opens a ROUTE detail listing its WAYS; RECORD's third pill row is headed WHICH WAY TODAY?; every ride, every PB, every "Ignore in ranking" he ever set is exactly where it was; SETTINGS → DATA's debug export shows `catalog.user.json` at `schemaVersion: 2` with a `catalog.user.v1.json` beside it. Nothing else moved.

## 7. Acceptance criteria

Phase A
1. `migrations_suite.ts` passes all 15 tests; whole suite 0 FAIL; `tsc --noEmit` exit 0.
2. `scripts/wp3-swap-identifiers.ts`'s printed before→after list is in the report; it contains no identifier from the §3.1 keep-list and no false positive (`always`, `waypoint`, `router`, …).
3. `grep -rn "RoutesScreen" src` still finds the component and file; `grep -rn "'routes'" src/ui/tabNav.tsx` still finds the tab id; `grep -rn "BACK TO ROUTES" src` still hits; `grep -rn "'route'" src/live src/location src/storage` finds only `mode` literals.
4. `grep -rn "routeId" src` finds ONLY: `Way.routeId` (the FK), the migration module's string keys, the pick-event compat fields and their readers, and comments marked pre-WP-3 — nothing keyed to a result, gate set, index entry or free-ride crossing.
5. `catalog.seed.json` at `schemaVersion: 2` with 13 routes / 20 ways, `results.seed.json` every element `wayId` + `schemaVersion: 2` + `derivedBy.resultSchemaVersion: 2`; `upgradeCatalog(v1 fixture)` deep-equals the committed seed (test 1).
6. On an in-memory fs seeded with a v1 `catalog.user.json`, a v1 result, a v2 result and a v1 free-rides cache: after the three `init*` calls, `catalog.user.v1.json` exists byte-identical to the input, every file decodes at v2, the v2 result's bytes are unchanged, and a second boot writes nothing (tests 5, 9, 10).
7. A pick event written by today's build (`routeId`) still exports as a GPX+ pick (test 12); a new ride writes `wayId`.
8. The A5 grep-gate residual list is in the report and every line is on the keep-list.
9. Repo: the two `.v1.json` fixtures exist; nothing was deleted (`git status` shows renames as `R`, the old seed contents live on in `tests/fixtures/`).
10. One commit for all of Phase A.

Phase B
11. The B1 "after" grep list is in the report; every surviving prose `way` is an idiom or a dated quote; no comment describes `Catalog.ways` as from→to paths or `Catalog.routes` as variants.
12. `product/DATA-MODEL.md` reads in v2 vocabulary with the §5b note; `tsc` and the suite unaffected (comments only).
13. On-device (Nathan): §6 in full — and specifically `SETTINGS → DATA` export shows `catalog.user.json` `schemaVersion: 2` beside `catalog.user.v1.json`, and one ride he had set to "Ignore in ranking" is still ignored.

## 8. Verification

```
cd app && node --experimental-strip-types tests/run.ts      # zero FAIL; report before/after totals (A0 vs A9)
cd app && ./node_modules/.bin/tsc --noEmit                    # exit 0 (never bare `npx tsc` on this mount)
cd app && node --experimental-strip-types scripts/wp3-swap-identifiers.ts --dry-run   # re-run after A1 must print an EMPTY change list (proves idempotence of the tree, not the token map)
```
Migration proof on device: the debug export of `catalog.user.json` (SETTINGS → DATA) before Phase A ships is kept by the coordinator as the reference; after first boot Nathan re-exports, and `upgradeCatalog(before)` deep-equals `after` in a one-off node check.

## 9. Stop-on-ambiguity

If any anchor here does not match the file, or any call below is undecided, **STOP and report verbatim** — do not guess, do not rule on it from the coordinator's chat; the coordinator forwards it to a fresh Fable Plan pass.

**Failure mode 1 — the single highest risk, and the reason Phase A is one commit:** a v1 file read under v2 meaning. `Catalog.ways` in a v1 file holds from→to paths; v2 code treats `ways` as variants. If the swap ships without `upgradeCatalog` gating on `schemaVersion` AND the structural assertions, `catalog.user.json` is misread; `validateCatalog` then rejects the merge, `initCatalogStore` falls back to an EMPTY user catalog, and — because today's store leaves writes armed — the next `saveUserCatalog` overwrites the rider's only copy. Equivalent paths: `isValidRideResult` rejecting every `routeId` result → backfill re-derives → every `ignoredFromRanking` flag lost; `isValidCrossing` rejecting every free ride. A field that keeps its old NAME while its MEANING flips (a `routeId` on a result left un-renamed while `Catalog.routes` now holds base paths) is the same failure in slow motion: lookups silently miss, results show unmatched, and nothing errors. Hence: schemaVersion gate + v1/v2 shape assertions + refuse-and-disarm + backup-before-rewrite + validate-before-write + the seeds rewritten in the same commit. Any executor shortcut on any of these is a stop.

Specific stops:
- `results.ts:76-86` `isStale()` — if a production caller exists after WP-1/WP-2 landed (today: none), stop: the migration's `derivedBy.resultSchemaVersion: 2` decision must be re-confirmed against how that caller reacts.
- If `tests/fixtures/refs.json` or any ride fixture carries `routeId`/`wayId` keys read by a pure function (A0), stop and report which before converting.
- If the identifier script's printed list contains any pair you cannot classify as entity-denoting (e.g. a WP-1/WP-2 identifier where `route` might mean the TAB, or a helper whose `way` is the English word), stop with the pair.
- If `tsc` fails after A2 on anything other than a module path, stop.
- If `RoutesScreen.tsx` has, by the time WP-3 runs, gained sibling identifiers that name the tab (a `routesTab` helper, a `RoutesBadge`), stop — the exception list must be extended by a Plan pass, not by the executor.
- If `catalog.user.v1.json` already exists on the test fs with different content in test 5's flow, the store must disarm and warn; if the executor finds that behaviour impossible to implement inside `enqueueWrite` (e.g. `armedFs` not reachable), stop.
- If `assets/ways/ways.json` contains way/route FIELD names, stop.
- If any in-repo code READS GPX+ back (an importer/replayer keyed on `routeId=`), stop — Q4 also asks Nathan about external readers.
- If `freeRides.ts`'s init/decode shape differs from §3.5's description (`{schemaVersion, rides}`), stop.
- If any test compares a migrated seed or result byte-for-byte against a v1 fixture, stop (the v1 fixtures are INPUTS only).
- Any `writeText` call site (`grep -rn "writeText(" src`) writing a file kind not listed in §3.2 that carries `routeId`/`wayId`/`routeIds` — stop and report it.
- Executor's report states test totals before/after, the swap list, the grep-gate residual list, the exact files touched and renamed (`CLAUDE.md` rule 3).

## 10. Open questions for Nathan (also appended to `QUESTIONS-FOR-NATHAN.md`) — none block writing; Q3 decides WHEN this runs

- **Q1 — id prefixes.** New ways will be minted `way:<rideId>` and new routes `route:<rideId>` (correct under the new words). Ids already on your phone keep their old prefixes forever (a pre-WP-3 way is `route:…`, a pre-WP-3 route is `way:…`) — they are referenced from append-only history and D-023 forbids rewriting them. Fine, or freeze the OLD prefixes for new ids too so everything is at least consistent (§3.3 option a)?
- **Q2 — tab name.** The browse tab stays ROUTES; its sections read YOUR PLACES / ROUTES; the detail's list reads WAYS and ROUTES TO HERE. OK?
- **Q3 — order.** WP-3 runs after WP-1 and WP-2 have fully landed (§3.7): the app keeps today's words until then and the coordinator translates in chat. Or first, at the cost of re-issuing both briefs before their execution?
- **Q4 — GPX+ export.** The pick element's `routeId=`/`routeIds=` attributes become `wayId=`/`wayIds=` and the `qf` namespace goes to `/gpx/2`. Do you have any external script or tool reading GPX+ that keys on those attribute names? If yes, we emit both old and new for one cycle.
- **Q5 — RECORD copy.** The variant pill row's heading becomes WHICH WAY TODAY? (today WHICH ROUTE TODAY?). Good, or another wording?
