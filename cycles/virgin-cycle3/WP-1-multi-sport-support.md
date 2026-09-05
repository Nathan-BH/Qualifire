**Status: BRIEF WRITTEN, NOT YET EXECUTED.** Three phases (A → then B and C in either order, or in parallel — no file overlap between B and C). Each phase is its own Sonnet Execute dispatch with its own acceptance list; Phase A must land and pass before B or C starts.
**Open item:** new ask, Nathan 2026-09-05 ("lets first think about how to implement different 'sports' … keep things separate in terms of ways, routes and achievements between sports … people can just name 'sports' themselves … this should be the first work package of the virgin-cycle3"). Size: **large** — one new pure module + one new store module + tests (Phase A, medium); SETTINGS/ROUTES/RIDES edits (Phase B, small-medium); RECORD-flow + location-session + way-creation wiring (Phase C, medium). Not in `OPEN-ITEMS.md` yet — the coordinator adds it as the first line of a new "virgin-cycle3" block when this brief is accepted.
**Written by:** Plan tier (Fable) — this is an architecture decision (where a "sport" lives in a codebase whose every store is a single unscoped global), not a fix the coordinator should rule on; Nathan asked "what do you think?" and "once decided", so §3 decides.
**Verified against the device tree 2026-09-05 (evening).** Every `file:line` below was read on the device, not inferred from the digest. `RecordScreen.tsx` line numbers drift with every WP — re-grep before editing.

---

# WP-1 — Multi-sport support: user-defined sports, one active sport, everything scoped to it

## 1. What it is

Today the app has exactly one universe of places/ways/routes/rides. Nathan wants several — one per sport — so a run from Home to Work and a bike ride from Home to Work are different ways with different routes, gates, ghosts and personal bests, and the rider is never shown (or scored against) the other sport's data. He also wants the sports themselves to be **user-defined**: named by the rider (bike, e-bike, run, walk, fast-walk — his examples), addable/renameable/deletable later, seeded with sensible defaults on a fresh install. The GPS side is untouched: the engine already times raw fixes against gates and has no idea what is moving.

His two structural candidates, and the question he put to this brief:

- **A — a sport switch in SETTINGS** that "literally loads a different app" per sport, so ways/routes/rides are kept very separate and you switch sports to see a sport's data.
- **B — a sport picker as step 0 on RECORD**, defaulting to the last sport used, quick for the common case; his own worry is that ROUTES/RIDES then have no obvious "which sport am I looking at" unless the picker's choice also drives them — which collapses back into A's global active sport.

§3 answers this. The short version: **one global "active sport" (A's model), implemented as tag-and-filter over the existing single stores (NOT separate per-sport storage), with the switcher exposed in BOTH places — a management section in SETTINGS and a one-row pill picker at the top of RECORD's setup that sets the same global.** B is not an alternative to A; it is A's most convenient front door, and the "remembers last choice" behaviour Nathan wants is free because the last choice *is* the persisted active sport.

## 2. Current state (re-verified against the real repo)

### 2.1 Every store is a single unscoped global — and nothing has a sport field

| Layer | Where | What it holds | Sport-aware? |
|---|---|---|---|
| Catalog types | `src/store/types.ts:21-87` | `Landmark`, `Way {id,startLandmarkId,endLandmarkId,loopDiscriminator?,routeIds}`, `Route {id,wayId,refLineId,gateSetVersion,seeded,referenceRideId?,specs?}`, `GateSet`, `Catalog` | **no** field anywhere |
| Catalog store | `src/store/catalogStore.ts:42-129` | `currentCatalog()` = `mergeCatalogs(shippedCatalog(), userCatalog())`; `userCatalog()` = `catalog.user.json`; `saveUserCatalog(next)` validates the MERGE then replaces the user file; `initCatalogStore(fs)` at boot | no — one merged catalog, seed never on disk (`:12-16`), seed wins on id collision |
| Catalog validation | `src/store/catalog.ts:47-131` | duplicate ids, overlapping landmark discs (`:52-60` — two discs that touch is an ERROR), way needs ≥1 route, dangling refs, WP-G per-way `specs` uniqueness | no |
| Ride recordings | `src/storage/core.ts:18-20,140-155` | `rides/<rideId>.jsonl` (header + fixes + end, **append-only, D-023**), `index.json` (rebuildable cache — `rebuildIndex()` `:107-131` re-derives entries from the raw files) | no. Precedent: WP-B put `mode?: 'route'\|'free'` on `IndexEntry` only (`storage/types.ts:75-79`), so it is **lost on rebuild** (accepted, documented there) and must be re-read from the old entry in `endRide` (`core.ts:208-220`) |
| Ride header | `src/storage/types.ts:28-34`, `jsonl.ts:18-27` | `{kind:'header', schemaVersion, rideId, startedAtMs, recorder}` | no |
| `listRides()` | `core.ts:227-247`, `storage/index.ts:48-52` | `RideMeta {rideId,startMs,endMs,nFixes}` from the index (ended) or derived from the file (recording/crashed) | no — `mode` is NOT carried, which is why `RidesScreen.tsx:73-80` re-reads `index.json` itself to filter free rides |
| Results | `src/store/resultsStore.ts:210-240,428-` | `results/<rideId>.json`, `results/index.json`, `results/unmatched.json`; `storedResults()`, `storedResultsForRoute(routeId)`, `saveResult()`; `backfillMissingResults(fs, rideIds)` matches every ride against **`catalogTrackSpecs()` = every route in the catalog** (`:429`) | no — scoping is by `routeId` only |
| Live matching | `src/live/tracks.ts:21-45`, `engine.ts:409,421-424` | `catalogTrackSpecs()` = one `TrackSpec` per catalog route; `LiveEngine.start(opts)` restricts candidates to `opts.routeIds` when given (WP-B seam), else ALL specs | seam exists (`routeIds`), nothing feeds it a sport |
| Start options / session | `src/location/index.ts:311-322,329-341,381-385`, `session.ts:18-30` | `startTracking({routePick?, mode?, routeIds?, startContext?})` → `startRide(mode)` → `ActiveSession {rideId, startedAtMs, lastAliveAtMs, mode?, routeIds?}` persisted to `qualifire-active-ride.json` for headless relaunch (`index.ts:157` re-arms the engine from it) | no |
| Settings | `src/ui/settings.tsx:25-48,56-101` | flat `Settings {redLight,startMode,tower,liveMap,earcons,sectorColours,timing}` at `<documentDirectory>settings.json` (OUTSIDE the `qualifire/` root — kept across Reset-to-virgin, `:215-235`); `Seg<T>` (`:108`) is the pick-one-of-N control | no |
| RECORD setup | `src/ui/RecordScreen.tsx:201-207,810-830,436-455` | `CATALOG = currentCatalog()` per render; from/to default to `defaultEndpoints(currentCatalog())`; `way = CATALOG.ways.find(start===fromId && end===to)`; free rides pass `freeRideRouteIds(CATALOG, …)` as `routeIds`, route rides pass **no** `routeIds` (hard pick restricts instead) | no |
| Way creation | `src/store/wayCreation.ts:170-274,308-394`, `wayFromRide.ts:149-160,206-216` | `draftWayCreation(c, ride)`: endpoints via `landmarkAt(c,…)`/`fittedRadius(…, c.landmarks)` (needs ALL discs to avoid minting an overlapping one), then `existingWay = c.ways.find(same start/end)` (`:257-262`) → WP-G variant path; `buildWayCreationCatalog(userCat, draft, names, seed)` mints `way:<rideId>` / `route:<rideId>`; `draftWayFromRide` passes `currentCatalog()` (`:155`) | no — a run Home→Work today would become a *variant route of the bike way* |
| Browse screens | `RoutesScreen.tsx:30` (`CATALOG = currentCatalog()`, lists all landmarks/ways/routes); `RidesScreen.tsx:36-41,73-80,96-98` (all rides, chronological; backfill over all ended non-free rides) | no |
| Boot | `App.tsx:135-137` | `initCatalogStore(fs).then(initUserRefs).then(initRideHistory)` then a state bump | — |
| Reset to virgin | `settings.tsx:215-235`, `expoFsAdapter.ts:86` `archiveStorageRoot` | moves `<docs>/qualifire/` aside wholesale; keeps `<docs>/settings.json` | anything under the root is reset; anything in settings.json survives |

### 2.2 Standing rules that constrain the design (`STATE.md`, `CLAUDE.md`)

- **Raw ride recordings are append-only** — a schema change is a migration, never a rewrite of history. So no existing ride file gets a sport stamped into it retroactively; old rides must *read* as belonging to some sport.
- **Never delete** (move aside instead). So "delete a sport" cannot cascade-destroy its ways/rides; and Reset-to-virgin already has the mv-aside pattern.
- **Scoring/ranking is per route** (`ranks()`, `lapValues(routeId)`, 9-most-recent window) — so "achievements" are partitioned by construction the moment routes are.
- **Landmark discs may not overlap** (`validateCatalog`). This single rule decides that landmarks must be SHARED across sports: two sports cannot each own a "Home" at the same spot.
- `catalog.user.json` is *not* in the append-only class — it is rewritten in full on every `saveUserCatalog`. The shipped seed (`catalog.seed.json`, 13 ways on Nathan's build, 0 on virgin) is bundled and can never be edited on the phone.
- Seed mode / APP_VARIANT are build-time constants — nothing runtime hangs off them.

## 3. The design decision

### 3.1 Two very different things hide inside option A

Nathan's "literally load a different app" can mean either:

- **A1 — storage partitioning:** a root per sport (`qualifire/<sport>/…`), every store re-initialised on switch.
- **A2 — one storage, tag-and-filter:** every way and every ride carries a `sportId`; one derived "active catalog" view; every reader reads the view.

A1 is what the phrase suggests and it is the wrong tool here:

| | A1 partitioned roots | A2 tag-and-filter |
|---|---|---|
| Landmarks | must be duplicated per sport (Home twice) — and cannot be shared across roots, so "start a bike way from a place I know from running" is impossible; each copy drifts independently | shared: one Home, reused by every sport's ways (the disc-fit logic in `draftWayCreation` already reuses any existing disc) |
| Switching sport | re-run `initCatalogStore`/`initUserRefs`/`initRideHistory`/`initResultsStore` against a new root mid-session; the background location task, the active-ride marker (`qualifire-active-ride.json`, document root), and the WP-Q reset all have to learn about roots | flip one id; readers already read at call time |
| Reset-to-virgin, debug export, backfill, GPX+ | every one becomes root-aware | untouched (one root, as today) |
| Existing installs (Nathan's phone) | a real file migration moving years of rides under `bike/` | zero on-disk change: unstamped = default sport (§3.4) |
| "Kept very separate" guarantee | by construction — but only for data that lives under the root; settings, theme, the recovery marker still leak across | by one pure function (`scopeCatalog`) + tests; a missed call site is a visible bug, not data corruption |
| Cost | large, risky, touches every store and the fs adapter | medium; one new pure module, one new small store, small edits at ~12 call sites |

The "separation by construction" argument for A1 is weaker than it looks: this is a single-user, offline app with no adversary; the failure mode of A2 is "I see a run route in bike mode", caught by a test and fixed at one call site. The failure mode of A1 is a half-migrated storage root. **Decision: A2.**

### 3.2 Where the switcher lives: A's global, B's front door — both

Nathan's option B is right about ergonomics and right about its own weakness. A per-ride sport choice that is *not* the global active sport would leave ROUTES/RIDES with nothing to filter by; making it the global collapses into A. So make it the global, on purpose, and stop treating A and B as rivals:

- **`activeSportId` is one persisted value.** RECORD's setup screen shows a pill row (step 0, above START/GOING TO) whose selected pill is the active sport; tapping another pill *sets the global*. SETTINGS → SPORTS shows the same choice plus the management list (add / rename / delete). ROUTES and RIDES read the global and show a small badge naming it ("BIKE"), so the rider always knows which universe they are looking at.
- "Default already set to the last sport selected" is automatic: the last selection *is* the stored value.
- A rider who does one sport never sees anything change: one row of pills with one selected pill (or, if Nathan prefers, hidden when there is only one sport — §10 Q3).
- A running ride is stamped with the sport it *started* under (`ActiveSession.sportId`, §6 C2); changing the global mid-ride (from SETTINGS, while RECORD is unmounted) does not retag it. The naming card at STOP uses the ride's sport, not the current global.

### 3.3 Where the tag lives: on `Way`, derived onto everything else

Options were: tag `Route`, tag `Way`, or tag both.

- Tag `Route` only, share ways: a Home→Work way would hold both a bike route and a run route. Then every "routes of this way" enumeration (`routesForWay`, WP-G's `specs` prefix grouping in `routeSpecs.ts`, `defaultRouteFor`, `needsRoutePick`, RoutesScreen's per-way lists, `validateCatalog`'s per-way specs-uniqueness rule) needs a sport filter threaded through, and "two plain routes on one way" — today a legal legacy-seed shape — becomes the *normal* shape with a new meaning. Fragile.
- **Tag `Way`** (`Way.sportId`): a way is "from A to B, by this sport". Routes belong to exactly one way, so a route's sport is `wayOf(route).sportId` — one source of truth, no denormalised copy to drift. Gate sets belong to routes, results belong to routes, refs belong to routes: all partitioned transitively. Two Home→Work ways (bike, run) already have distinct ids (`way:<rideId>`). `draftWayCreation`'s `existingWay` lookup becomes sport-correct simply by handing it a sport-scoped way list. **Decision: `Way.sportId`.**
- Landmarks: **unscoped, shared** (§2.2 forces it, and it is the better product too).

The one derived view everything reads: **`activeCatalog()`** — a real `Catalog` value = `scopeCatalog(currentCatalog(), activeSportId)` = *all* landmarks, the ways whose sport matches, the routes on those ways, the gate sets of those routes. Because it is a `Catalog`, every existing pure helper (`startableLandmarks`, `waysFrom`, `routesForWay`, `freeRideRouteIds`, `needsRoutePick`, `defaultEndpoints`, `draftWayCreation`, `routeLabelIn`…) works unchanged when handed `activeCatalog()` instead of `currentCatalog()`. **Writes** (`saveUserCatalog`, `catalogDelete.ts` cascades, gate-adjust saves) keep going through the FULL user catalog exactly as today — the scope is a read-side lens, never a write target. That is what keeps WP-Q's delete cascades correct for free: deleting the last run-way from Home while a bike way still uses Home leaves Home in place, because the cascade sees the whole catalog.

Rides are the one thing not reachable through a route (a free ride, an unmatched ride, a ride whose route was later deleted), so they carry their own stamp: `sportId` on the raw-file **header** (truth, append-only-compatible because only NEW rides get it) and on the `IndexEntry` (cache, mirrors WP-B's `mode`), carried out on `RideMeta` so RIDES can filter without re-reading the index. Header-not-just-index is deliberate: `mode` lives only on the index and is lost on `rebuildIndex()` — an accepted gap for a display flag, but sport is a *partition key*, and silently pouring a whole history into "Bike" after an index rebuild is not acceptable. `RideResult` gets **no** sport field: a result is derived and keyed by `routeId`, whose sport is derivable; adding a copy would be a second truth.

### 3.4 Legacy data, defaults, and the fallback rule

- `DEFAULT_SPORT_ID = 'sport:bike'`. **Anything without a stamp reads as the default sport**: every shipped-seed way (bundled, can never be stamped), every way in an existing `catalog.user.json`, every existing ride. No file is rewritten. On Nathan's phone, tomorrow, everything is under "Bike" and looks exactly as today. On a virgin install nothing is unstamped except the (empty) seed.
- A sport list file `sports.json` under the storage root: `{schemaVersion:1, sports:[{id,label,createdAtMs}], activeSportId}`. Lives under the root (not in `<docs>/settings.json`) on purpose: Reset-to-virgin moves the root aside, so a reset re-seeds the default sports — that IS what virgin means — and the active id can never point at a sport that was reset away. Read posture mirrors `catalogStore.ts:79-113`: missing ⇒ seed defaults and write them; undecodable ⇒ defaults in memory for the session, file never overwritten, writes disarmed for the session.
- Default seed list (Nathan to confirm, §10 Q1): **Bike** (`sport:bike`), **Run** (`sport:run`), **Walk** (`sport:walk`), active = Bike. Three, not five: e-bike / fast-walk are exactly the kind of personal distinction the add button is for. Ids are stable slugs for the seeded three and `sport:<startedAtMs-ish stamp>` for user-added ones; ids never change on rename.
- **Delete is refused while the sport owns anything** (ways by stamp-or-fallback, rides by stamp-or-fallback): the row shows "N routes · M rides — delete those first" and no destructive path exists. This is the never-delete rule applied to a partition: the only way to empty a sport is WP-Q's existing per-item deletes (which move nothing but catalog entries) and ride deletes. Consequence: `sport:bike` is undeletable on Nathan's dev/preview build forever (13 seed ways fall back to it) — correct, and irrelevant on virgin. The active sport is also undeletable (switch first); the last remaining sport is undeletable (the list is never empty).
- Rename: label only, trimmed, non-empty, unique case-insensitively, ≤ 24 chars.
- Defensive resolution for hand-edited files: `effectiveSportId(way, sports)` = `way.sportId` if that id exists in the list, else `DEFAULT_SPORT_ID` if it exists, else the first sport's id. Nothing can become unreachable.

### 3.5 What "switching sport" feels like

Rider does mostly bike, sometimes runs. Opens RECORD: pill row reads `[Bike] Run Walk`, START/GOING TO show bike places and bike ways as today. Taps `Run`: pills re-select, the START row still offers Home (shared landmark), GOING TO offers only run ways from Home (maybe none yet → free ride), the ghost count is run-only. Records, stops, names "Home → Work": a **new** run way is created even though a bike Home→Work way exists; Home and Work discs are reused, not re-minted. ROUTES now shows badge "RUN" and one way; RIDES shows badge "RUN" and one ride. Tomorrow the app opens on `Run` (last selected); one tap back to `Bike`. Nothing about bike PBs ever saw the run.

## 4. The fix — Phase A: data model, sport store, scoping, stamping (pure + storage; no UI)

All of Phase A is headless-testable. No file under `src/ui/` changes except the one-line boot hook in `App.tsx`.

**A1. Types (`src/store/types.ts`).** Add to `Way`: `sportId?: string` with a doc comment stating the fallback rule (§3.4) and that seed ways never carry it. `CATALOG_SCHEMA_VERSION` stays 1 (purely additive, optional field, no migration).

**A2. New pure module `src/store/sports.ts`** (no expo/Node imports; same header discipline as `types.ts`):
- `SPORTS_SCHEMA_VERSION = 1`, `DEFAULT_SPORT_ID = 'sport:bike'`, `MAX_SPORT_LABEL = 24`.
- `interface Sport { id: string; label: string; createdAtMs: number }`, `interface SportsFile { schemaVersion: number; sports: Sport[]; activeSportId: string }`.
- `defaultSports(nowMs): SportsFile` → Bike/Run/Walk per §3.4.
- `decodeSports(text): SportsFile | null`, `encodeSports(f): string` (`JSON.stringify(f, null, 1) + '\n'`, matching `encodeCatalog`), `validateSports(f): string[]` (non-empty, unique ids, unique trimmed case-insensitive labels, labels 1–24 chars, `activeSportId ∈ sports`).
- `effectiveSportId(way: Way, f: SportsFile): string` (§3.4 defensive rule), `effectiveRideSportId(sportId: string | undefined, f): string` (same rule for a ride's stamp).
- `scopeCatalog(c: Catalog, sportId: string, f: SportsFile): Catalog` — all landmarks; ways where `effectiveSportId(w,f) === sportId`; routes whose `wayId` is in those ways; gate sets whose `routeId` is in those routes; `schemaVersion` carried.
- `routeIdsOfSport(c, sportId, f): Set<string>`.
- `sportUsage(c: Catalog, rides: {sportId?: string}[], sportId, f): { ways: number; routes: number; rides: number }`.
- Pure edit helpers returning a new file or an error string: `addSport(f, label, nowMs)`, `renameSport(f, id, label)`, `deleteSport(f, id, usage)` (refuses when usage non-zero, when `id === f.activeSportId`, or when it is the last sport), `setActiveSport(f, id)`.

**A3. New store module `src/store/sportStore.ts`**, structurally a copy of `catalogStore.ts`: `SPORTS_FILE = 'sports.json'`; `initSportStore(fs)` (missing ⇒ `defaultSports(Date.now())` **and write it**; undecodable/invalid ⇒ defaults in memory, `console.warn`, writes disarmed for the session — mirror `:79-113`'s posture and wording); `currentSports(): SportsFile`; `activeSportId(): string`; `saveSports(next): Promise<string[]>` (validate → replace → serialized best-effort write, same `writeTail` shape); `flushSportWrites()`, `resetSportStoreForTests(override?)`. Plus **`activeCatalog(): Catalog`** — computed at call time as `scopeCatalog(currentCatalog(), activeSportId(), currentSports())`. Cheap enough per render for a catalog of this size; if a profiler ever disagrees, memoise on `(current, sports)` identity — not now.

**A4. Boot (`App.tsx:135-137`).** `initSportStore(fs).then(() => initCatalogStore(fs)).then(initUserRefs).then(initRideHistory)`. `initSportStore` never throws (same contract as `initCatalogStore`).

**A5. Ride stamping (`src/storage/`).**
- `types.ts:28-34` `HeaderRecord`: add `sportId?: string`. `IndexEntry` (`:67-79`): add `sportId?: string` with the same doc pattern as `mode`, minus the "cannot be recovered" clause — this one CAN be. `RideMeta` (`:60-65`): add `sportId?: string`. `SCHEMA_VERSION` stays 1 (optional field, old readers ignore it).
- `jsonl.ts:18-27` `encodeHeader(rideId, startedAtMs, sportId?)` — emit the field only when given (absent, not null, so existing fixtures/byte-comparisons stay identical). `deriveMeta(decoded, rideId)` (`:99`) carries `decoded.header?.sportId` onto `RideMeta.sportId` when present.
- `core.ts` `RideStorage.startRide(mode?, sportId?)` (`:23-28`, `:140-155`): pass `sportId` to `encodeHeader` and onto the index entry. `endRide` (`:208-220`): read `sportId` from the existing entry alongside `existingMode` and re-save it. `rebuildIndex()` (`:107-131`): set `sportId: decoded.header?.sportId` on each rebuilt entry. `listRides()` (`:227-247`): carry `entry.sportId` on the ended path (the derive path already flows through `deriveMeta`).
- `storage/index.ts:28-30` `startRide(mode?, sportId?)` pass-through; `:48-52` `listRides()` return type gains `sportId?: string`.

**A6. Backfill scoping (`src/store/resultsStore.ts:428-`).** `backfillMissingResults(fs, rideIds, routeIdsFor?: (rideId: string) => ReadonlySet<string> | null)`. When the callback returns a set, filter `specs` to it for that ride; `null`/omitted ⇒ today's unfiltered behaviour (keeps every existing test green). Both callers (`lastRide.ts:262-270`, `RidesScreen.tsx:73-81`) already hold the decoded index: build the callback as `rideId → routeIdsOfSport(currentCatalog(), effectiveRideSportId(entry.sportId, currentSports()), currentSports())`. **This is the load-bearing leak fix**: without it, a run that follows the bike commute gets backfilled as a bike PB at the next boot. (`RidesScreen.tsx` is a UI file but this edit is the callback only; leave its rendering to Phase B — flag the shared file in the dispatch so B's executor rebases.)

**A7. Way creation.** `WayCreationDraft` (`wayCreation.ts`) gains `sportId: string`; `draftWayCreation(c, ride)` takes it from a new `RideFacts.sportId` (`:42-51`) and copies it onto the draft; `buildWayCreationCatalog` (`:308-394`) stamps `sportId: draft.sportId` on the NEW way (`:373-378`); the `existingWayId` variant path (`:339-360`) stamps nothing — the way already has its sport. `wayFromRide.ts` `draftWayFromRide(rideId, startedAtMs, matchedRouteId, fs, sportId?)` (`:149-160` — current signature is `(rideId, startedAtMs, matchedRouteId: string | null, fs)`): pass `scopeCatalog(currentCatalog(), sportId, currentSports())` — NOT `currentCatalog()` (`:155`) — as `c` (all landmarks for disc fitting, only this sport's ways for the variant check), and `sportId` into `RideFacts`. Callers (`RecordScreen.tsx:502`, `RideDetailScreen.tsx:199`) are Phase C's job; until then the new trailing parameter defaults to `activeSportId()` so Phase A compiles standalone — put a `// Phase C replaces this default` marker on it.

**A8. Live specs helper (`src/live/tracks.ts`).** Add `sportTrackSpecs(sportId): TrackSpec[]` = `catalogTrackSpecs()` filtered by `routeIdsOfSport(...)`. Nothing calls it until Phase C; it exists so C has a pure, testable seam and so `catalogTrackSpecs()` (used by tests and by the engine's default) is untouched.

**A9. Tests.** New `tests/sports_suite.ts` (registered in `tests/run.ts` like the others):
1. `defaultSports` validates; three sports; active is `sport:bike`.
2. encode/decode round-trip byte-stable; `decodeSports` null on garbage / missing arrays.
3. `validateSports` rejects: empty list, duplicate id, labels differing only by case/whitespace, 25-char label, unknown `activeSportId`.
4. `scopeCatalog`: two ways Home→Work (one `sport:bike`, one `sport:run`) sharing both landmarks, each with one route + one gate set → bike scope has both landmarks, 1 way, 1 route, 1 gate set; run scope symmetric; an unstamped way lands in bike.
5. `effectiveSportId`: unknown id → default; default missing from list → first sport.
6. `deleteSport` refuses (used / active / last); `renameSport` keeps id, rejects duplicate label; `addSport` mints a unique id.
7. `sportUsage` counts fallback-unstamped ways and rides.
Additions: `storage_suite.ts` — `startRide('route','sport:run')` writes header `sportId` and entry `sportId`; `endRide` preserves both `mode` and `sportId`; `rebuildIndex` (delete `index.json`, `listRides()`) recovers `sportId` from the header; a header without the field yields `undefined` and the existing header byte-comparison test still passes. `waycreation_suite.ts` — with a bike Home→Work way present, drafting a `sport:run` ride between the same discs against the run-scoped catalog yields `existingWayId === null`, both endpoints `'existing'`, and the built way carries `sportId:'sport:run'`; the same ride drafted as `sport:bike` yields the variant path. `resultsstore_suite.ts` — backfill with a `routeIdsFor` that excludes the only matching route writes an unmatched marker, not a result; omitted callback matches as before. `catalogstore_suite.ts` (or the new suite) — `activeCatalog()` follows `setActiveSport`.

## 5. The fix — Phase B: SETTINGS → SPORTS, and the ROUTES / RIDES lens

**B1. `settings.tsx` — new section "SPORTS"**, placed above DATA. Contents: a `Seg`-style chip row of all sports (selected = active; tap → `saveSports(setActiveSport(...))`); a list of sports, each row: label, usage line (`N routes · M rides`, from `sportUsage` over `currentCatalog()` and the decoded ride index — read once on mount, same way the reset code reads files), a rename affordance (tap label → `Alert.prompt` on iOS is unavailable on Android; use the repo's existing text-input pattern from `wayNamingCard.tsx` — an inline `TextInput` in an expanded row is fine), and DELETE demoted into the expanded row with the repo's confirm idiom (`Alert.alert(title, body, [Cancel, {style:'destructive'}])` — `RideDetailScreen.tsx:296`, and WP-Q's ROUTES deletes), disabled with the "delete those first" hint whenever `deleteSport` would refuse. An "Add sport" row at the bottom: inline `TextInput` + confirm; errors from `validateSports` shown inline, never an `Alert`. No red anywhere (D-013 doctrine; use `t.textDim`).
- Renaming keeps the id; nothing else in the app stores labels.
- Because `SettingsScreen` is a different module from the store, subscribe by local state: read `currentSports()` into `useState` on mount and after every successful save (the same manual "tick" pattern `RidesScreen.tsx:34` uses for `resultsTick`).

**B2. `RoutesScreen.tsx:30`** `CATALOG = activeCatalog()`; add a one-line header badge above YOUR PLACES: the active sport's label upper-cased in `t.textDim` at the `st.h2` size, e.g. `RUN · switch on RECORD or in SETTINGS`. Places list: **all** landmarks (shared) — but a landmark that no way *in this sport* uses renders with the existing `· dormant`-style dim treatment plus `· not used by <sport>`; keep it tappable. Delete affordances (WP-Q) keep operating on `userCatalog()`/full cascades — do not touch `catalogDelete.ts`.

**B3. `RidesScreen.tsx`** filter `rides` to `effectiveRideSportId(r.sportId, currentSports()) === activeSportId()` before sorting (`:38-39`); the backfill effect keeps handing **all** ended non-free ids to `backfillMissingResults` (with Phase A's callback) — backfill is per-ride-sport, not per-active-sport, so switching sport never leaves another sport's rides un-derived. Add the same badge line as B2 above the list. Row labels keep `routeLabelIn(currentCatalog(), id)` (full catalog — a label lookup by id, not a listing).

**B4. Catalog-detail / ride-detail screens (WP-K/WP-H)**: no change — they open by id.

## 6. The fix — Phase C: RECORD step 0, engine scoping, session stamp, naming scope

**C1. `RecordScreen.tsx` setup phase.** Replace `currentCatalog()` at `:201,206,207,551,968,970` with `activeCatalog()` — `:551`'s `findRouteWithSpecs(activeCatalog(), …)` and `:970`'s `specVocabulary(activeCatalog().routes)` are deliberate: a variant-name clash and the spec vocabulary are per sport. Above the START pill row, render the sport pill row: one pill per sport in `currentSports().sports` order, selected = active; tap → `saveSports(setActiveSport(f,id))` then bump a local `useState` tick so `activeCatalog()` re-reads in the same render pass; also reset `from`/`to` to `defaultEndpoints(activeCatalog())` and clear `routePick` (a way id from another sport must never survive a switch). Rendered **only in the `setup` phase** — never armed/running/ending. Visual: reuse the existing START/GOING TO pill component/style; no new component.

**C2. Session + storage stamp.** `location/index.ts` `startTracking` options (`:311-322`) gain `sportId: string` (required — RecordScreen always knows it); `startRide(opts.mode, opts.sportId)` (`:328`); `ActiveSession` (`session.ts:18-30`) gains `sportId?: string`, persisted/parsed like `mode` (`:58-64`); the `pick` event (`index.ts:389-395`) gains `sportId` (GPX+ diagnostics — an additive optional field on a new event, no schema bump). Headless relaunch (`index.ts:157`) needs nothing extra: the ride was stamped at `startRide`.

**C3. Engine scoping.** Both `startTracking` calls (`RecordScreen.tsx:443-446,450-453`): free branch passes `routeIds: intersect(freeRouteIdsRef.current, routeIdsOfSport(...))` — `freeRouteIds` is already computed from `CATALOG` (= `activeCatalog()` after C1), so the intersection is the identity; pass the array as is but **also** pass `routeIds` on the route branch: `[...routeIdsOfSport(currentCatalog(), activeSportId(), currentSports())]`. Rationale: the hard pick restricts scoring, but a route ride *without* a pick (a way with one route still has `pickedRoute` set — check `:826-830` — so this is belt-and-braces, and it keeps the recovery path's `session.routeIds` honest). Behaviour when `routeIds` is an empty array: verify in `engine.ts:424` that `[]` yields zero candidates (free ride, no gates), not "all" — `opts.routeIds ? … : allSpecs` treats `[]` as truthy, so it filters to nothing, which is correct; add a `live_suite.ts` test pinning it.

**C4. Naming scope.** `draftWayFromRide(..., sportId)` call at `RecordScreen.tsx:502` passes `s.sportId ?? activeSportId()` (the session's sport — §3.2). The ride-detail retroactive offer (`wayFromRide.ts` shared path, `RideDetailScreen`) passes the ride's `RideMeta.sportId` resolved through `effectiveRideSportId`; if the detail screen does not have `RideMeta` in hand, read it via `listRides()` once — do not invent a new lookup module. Remove the Phase-A `// Phase C replaces this default` marker.

**C5. `recordFlow.ts`** — no state-machine change; the sport pill is a `setup`-phase control like the START pill, not a new state.

**C6. Tests.** `recordflow_suite.ts` unchanged. `live_suite.ts`: `start({routeIds: []})` arms zero candidates. A pure helper test if C1 extracts one (recommended: `store/sportSwitch.ts` `afterSportSwitch(catalog): {from,to,routePick:null}` = `defaultEndpoints` + null pick, so the reset rule is tested, not eyeballed).

## 7. Acceptance criteria

Phase A
1. `sports_suite.ts` passes with the seven tests in A9; total FAIL count 0; no previously-passing test changed except by adding an argument with a default.
2. A fresh in-memory fs: `initSportStore` writes `sports.json` with Bike/Run/Walk, active Bike; a second `initSportStore` on the same fs does not rewrite it.
3. Garbage `sports.json`: `initSportStore` resolves, `currentSports()` equals the defaults, the file's bytes are unchanged after a `saveSports` attempt (writes disarmed).
4. `activeCatalog()` on Nathan's shipped seed with no user file: 13 ways under `sport:bike`, 0 under `sport:run`; all seed landmarks present in both.
5. `startRide('route','sport:run')` → header line contains `"sportId":"sport:run"`; `endRide` → index entry still has `mode` and `sportId`; removing `index.json` and calling `listRides()` → `sportId` recovered.
6. `backfillMissingResults` with a scoping callback that excludes the matching route writes `unmatched` for that ride; the same call without the callback matches.
7. Drafting a `sport:run` ride between two discs that already bound a `sport:bike` way yields a new way (not a variant) carrying `sportId:'sport:run'` and reusing both landmark ids.
8. `tsc --noEmit` clean; `App.tsx` boot chain includes `initSportStore` first.

Phase B
9. SETTINGS shows SPORTS above DATA; switching the chip changes `sports.json`'s `activeSportId`; ROUTES and RIDES show the new sport's badge and only its ways/routes/rides after navigating to them.
10. Rename changes the label everywhere (badge, pills) and nothing else in any file but `sports.json`.
11. Delete is disabled (with the usage hint) for a sport with any way or ride, for the active sport, and for the last sport; enabled otherwise; deleting writes `sports.json` and touches no other file.
12. On Nathan's dev build (13 seed ways): Bike shows 13 ways, Run/Walk show none; Bike is undeletable with hint "13 routes · … rides".

Phase C
13. RECORD `setup` shows the sport pill row above START; tapping Run re-selects, START/GOING TO/ghost count re-read the run scope, `routePick` is null; the row is absent in armed/running/ending.
14. A ride started under Run: `rides/<id>.jsonl` header has `sport:run`; `index.json` entry has it; the `pick` event in `.events.jsonl` has it; the ride appears on RIDES only under Run.
15. A Run ride that traces the bike commute exactly: live engine arms no bike candidates (`routeIds` excludes them); at STOP the naming card offers a NEW way, not the bike variant; after save, ROUTES under Bike is unchanged and under Run shows the new way; Bike's PB list for that commute route has no new entry after the next boot's backfill.
16. Switching sport in SETTINGS while a ride records, then returning to RECORD and stopping: the naming card and the stamp use the ride's start sport.
17. `node --experimental-strip-types tests/run.ts`: 0 FAIL; `tsc --noEmit`: exit 0 — after each phase.

## 8. Verification

```
cd app && node --experimental-strip-types tests/run.ts      # zero FAIL; note the new total in the report
cd app && ./node_modules/.bin/tsc --noEmit                    # clean, exit 0 (never bare `npx tsc` on this mount)
```
On-device (Nathan, after Phase C): criteria 9–16 above are the checklist; the debug-export share of `catalog.user.json` (SETTINGS → DATA) is how to inspect the stamped `sportId` fields without adb.

## 9. Stop-on-ambiguity

If any anchor in this brief does not match the file (a line moved, a function signature differs, a helper named here does not exist), or any call below is undecided, **STOP and report verbatim** — do not guess, do not rule on it from the coordinator's chat; the coordinator forwards it to a fresh Fable Plan pass. Specific things that warrant stopping:

- `engine.ts:424` treats `routeIds: []` as "filter to nothing" — if on reading it turns out `[]` falls into the unfiltered branch, stop: C3's semantics depend on it.
- `deriveMeta`/`DecodedRide` (`jsonl.ts:64-99`) — if `decoded.header` is not typed as `HeaderRecord | null`, or `deriveMeta` is used somewhere that would object to a new optional field, stop.
- If any test compares an encoded header **with** a sportId against a fixture byte-for-byte, stop (A5 promises absent-when-omitted, so only new tests should see the field).
- `RidesScreen.tsx` is touched by both A6 (callback) and B3 (filter + badge): if Phase B's executor finds A6's edit not present, stop rather than re-implementing it.
- `store/freeRides.ts` consumers were checked (`RecordScreen`, `RideDetailScreen`/`rideDetailModel`, `settings` reset, `tabNav`): all per-ride or per-session, none lists crossings across rides, so no filter is needed there. If an executor finds one that does, stop and report it.
- Any place that enumerates `currentCatalog().ways` or `.routes` for **display or candidate selection** and is not listed in §5/§6 — report it; do not decide alone whether it should be scoped. (Label lookups by id, validation, delete cascades, and `saveUserCatalog` are correctly unscoped and are not such places.)
- If `Alert.prompt`-style text input is the only available pattern for rename/add on Android in this codebase (i.e. `wayNamingCard.tsx`'s `TextInput` pattern cannot be reused inside `settings.tsx`), stop — do not add a dependency.
- Executor's own report must state the test total before/after and the exact files touched, per `CLAUDE.md` rule 3.

## 10. Open questions for Nathan (also appended to `QUESTIONS-FOR-NATHAN.md`)

- **Q1 — default sport list.** Brief seeds **Bike, Run, Walk** (active Bike). Your examples were bike / e-bike / run / walk / fast-walk. Keep the three and let riders add the rest, or seed all five?
- **Q2 — e-bike vs bike.** Under this design they are fully separate universes (separate ways, routes, PBs) if they are separate sports. If you would rather e-bike rides *compare against* bike routes, that is a different feature ("sport aliases / shared routes") and is not in this WP — confirm separate is what you want.
- **Q3 — one-sport riders.** With exactly one sport the RECORD pill row is a single selected pill. Show it anyway (discoverable), or hide the row until a second sport exists?
- **Q4 — first-launch naming.** You said "people can just name sports themselves upon downloading the app for the first time". This brief seeds defaults silently and puts add/rename/delete in SETTINGS → SPORTS; there is no first-launch onboarding step anywhere in the app today (the empty-state pass, OPEN-ITEMS item 4, is unbuilt). Is SETTINGS enough for now, or do you want a first-launch "your sports" card as a follow-up WP?
- **Q5 — badge wording on ROUTES/RIDES.** Brief proposes a dim line `RUN · switch on RECORD or in SETTINGS`. Fine, or just the sport name?
