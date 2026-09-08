# Data model — landmarks, ways, and the derived results store

> **Reading this on the `virgin` branch — note added 2026-09-08 (virgin-cycle5).** This is a dated
> design record from before the branch was cut (2026-08-31). `D-0xx` / `B-xx` ids and role names
> (Product Owner, Designer, Backend Dev, Race Engineer, Principal …) refer to `main`'s
> `product/DECISIONS.md`, `product/BACKLOG.md` and its named-role process — none of which exist on
> this branch. **Since 2026-09-06 (WP-3) the words "route" and "way" mean the opposite of what they
> mean below:** a *route* is now the from→to path between two landmarks (the parent) and a *way* is
> one variant of riding it (the child, which owns the line, gates, results and ghosts) — see
> `GLOSSARY.md`. Morning / Evening A / Evening B, the 624-ride archive and the Leuven landmarks are
> Nathan's own seed data; a fresh install ships none of it (empty-seed default since 2026-09-08).

**Backend Dev design proposal, 2026-08-16 — adopted; §2–§3 refreshed to the shipped v2 schema on 2026-09-08 (virgin-cycle5).** Originally covered B-10 (data model), its generalization to §20/§21 "ways" (B-33), and the store the timing tower waited on. The schema below is what `app/src/store/types.ts` implements (`CATALOG_SCHEMA_VERSION = 2`, `RESULT_SCHEMA_VERSION = 2` since WP-3's read-side key rename; v1 files are migrated on read). **When this file and `types.ts` disagree, `types.ts` wins** — this document explains the shape, it does not define it. Sections §4–§9 are the 2026-08-16 record: §5, §7 and §9 describe Nathan's archive seeding and are marked historical.

Inputs consumed: `data/analysis/landmarks_proposal.md` (83 clusters, 521/624 rides mapping to landmark pairs, way counts, the puttestraat↔work consistency run), `data/analysis/colour_backtest.md`, and the existing storage implementation in `app/src/storage/`.

---

## 1. The finding that changes the sequencing

My own triage pass this morning (`product/proposals/TRIAGE-ideas-18-27.md` §1) claimed the §19 colour ruling **blocks** the benchmark store, because the two colour models need different retention rules. **That claim is wrong, and D-023 is why.**

D-023 already settled that storage keeps raw fixes forever and caches no benchmark seconds — "everything is recomputed from raw, so timing-model changes reinterpret history for free." Applied here: the store is not a benchmark store at all. It is a **derived results cache** holding one ordered lap/sector-time history per route, from which *every* colour model is a read-time function:

- D-007/D-008 → "is this better than the min over the trailing 7 / 28 days, by more than max(k·σ, floor)?"
- §19 → "is this better than the mean of the last N, and is it the min of the last N?"
- the hybrid in `colour_backtest.md` → the same mean, with a ±σ deadband.

All three read the identical ordered history. None needs a different byte on disk. So **B-33 (this schema) does not wait on B-31 (the colour ruling)** — they can run in the same cycle, or this one first. What the ruling *does* determine is one pure function in the tier layer, plus whether D-028's tower window follows §19's N. That correction is noted at the head of the triage doc.

The one retention rule the store must honour regardless: keep enough ordered history to answer the *longest* window any candidate model asks for. Today that is max(28 days, N=20 rides) per route — and since raw rides are kept forever anyway (D-023), "enough" is trivially satisfied.

---

## 2. Entities

Four curated entities plus one derived one. Curated data is small, human-readable, hand-editable, and versioned; derived data is deletable without loss.

**Landmark** — a named place with a radius. From the archive mining: home, work, church, fosh, Leuven station, Puttestraat, plus the unnamed 88-visit cluster at 50.8703, 4.6919 that Nathan still has to identify. Radius is per-place, not global: `landmarks_proposal.md` found 150 m resolves ordinary places cleanly but smears fosh across two clusters (bike-parking jitter), so parkings want a bigger radius.

**Route** — the from→to path between two landmarks: an ordered (startLandmark, endLandmark) pair, directional by construction (D-010 held at the route level rather than re-derived). Loops (start == end) are a real category, not an edge case — 78 archived rides were loops — so a route is identified by (start, end, discriminator), where the discriminator is null for ordinary routes and a label for loops. A route is the **parent**: it lists its `wayIds` and, since WP-1 (2026-09-06), belongs to exactly one user-named `sportId`. *(In this document's original vocabulary this entity was called a "way"; WP-3 swapped the two names on 2026-09-06.)*

**Way** — one physical path realizing a route, with its own reference polyline (`refLineId`), versioned gate set (`gateSetVersion`), reference ride (`referenceRideId` — on a blank install, the first ride saved on the route) and optional `specs` (the rider's own ordered qualifiers, e.g. `['Dry','Fast']`). This is the level the live engine locks and scores at: every ride result, gate set, ghost, best and colour is keyed by way, and colours never compare two ways. A route has 1..n ways; the live auto-lock (D-025, now pick-biased) picks among the ways of all candidate routes. *(Originally called a "route" here. The archive measurement that justified keeping this level — puttestraat↔work at median 97 % path overlap, home↔work genuinely split into Evening A / Evening B — is `main`-only data, but the argument stands: some routes have one way, some several, and the model expresses both without special-casing.)*

**GateSet** — the ordered gate list for a **way**, **versioned**; since 2026-08-31 it also carries `origin: 'measured' | 'geometric'` (ROUTING-AND-SEGMENTATION §3's honesty clause — every gate set the app seeds today is `'geometric'`). Sector identity stays D-023's: (way, gate-pair chainage) — never GPS points.

**RideResult** *(derived)* — what the pipeline computes for one recorded ride: which **way** it matched (`wayId`, null for a free ride), lap time, per-sector times, and the honesty flags (`tripwireDemoted`, `ignoredFromRanking`). Recomputable from the raw JSONL at any time; deleting the whole derived tree costs only CPU. Persisted since main's cycle 024 (`app/src/store/resultsStore.ts`: `results/<rideId>.json` + `results/index.json`).

**Sport** *(WP-1, 2026-09-06 — not in the original proposal)* — a user-named category (`app/src/store/sports.ts`, `sports.json`). One global active sport; landmarks, routes, ways, rides and results carry a `sportId` and are filtered by it (tag-and-filter over the single stores, not per-sport storage roots). Sports never cross-compare and none is pre-seeded.

---

## 3. Schema

Written in the style of `app/src/storage/types.ts` (pure types, no expo, headless-testable).

```ts
export const CATALOG_SCHEMA_VERSION = 2;
export const RESULT_SCHEMA_VERSION = 2;

/** A place, in a period of life. Identity — never a timing boundary: the
 * landmark marks where the ride truly ends, while the final gate sits a few
 * hundred metres before it (Nathan, 2026-08-16). */
export interface Landmark {
  id: string;
  label: string;
  lat: number;
  lon: number;
  /** p90 of the endpoint spread + 30 m, capped at half the gap to the nearest
   * landmark. Measured range 120–256 m; a flat 60–80 m loses 3/4 of the rides. */
  radiusM: number;
  activeFromMs: number;
  activeUntilMs: number | null;
  /** false ⇒ archive-only (dormant homes) or an errand stop — seeds history,
   * never offered at START. */
  offerAtStart: boolean;
}

/** Route — the from→to path between two landmarks; the parent. */
export interface Route {
  id: string;
  startLandmarkId: string;
  endLandmarkId: string;
  /** required iff start === end (loops are a real category: 78 archived rides) */
  loopDiscriminator?: string;
  wayIds: string[];
  /** WP-1 (2026-09-06): which user-defined sport (store/sports.ts) this route
   * belongs to. Absent on every route that predates WP-1 (every shipped-seed
   * route, everything in an existing catalog.user.json) — NEVER backfilled;
   * such a route's effective sport is the FIRST sport in sports.json
   * (store/sports.ts's effectiveSportId — the fallback rule, §3.4). */
  sportId?: string;
}

/** Way — one named way of riding a route (its `specs`, its reference
 * line, its gate set); rides, gate sets and results are keyed by way.
 *
 * WP-3 (2026-09-05) swapped these two names; ids minted before WP-3 carry
 * the OLD prefixes (`way:<rideId>` on a Route, `route:<rideId>` on a Way)
 * and never change — see `isUserMintedWayId`. */
export interface Way {
  id: string;
  routeId: string;
  refLineId: string;
  gateSetVersion: number;
  seeded: boolean;
  /** OPEN-ITEMS item 2 (COLD-START §3 step 9): the ride whose recorded track
   * is this route's benchmark — "ride 1 IS the reference by default";
   * promoting a later clean lap rewrites this field. Optional: seed routes
   * predate it (their reference is the archive-built refLine, not one ride). */
  referenceRideId?: string;
  /** WP-G (Nathan 2026-09-02, Q2): the rider's own ordered free-text segments
   * AFTER the way's From/To — "Home → Work → Dry → Fast" stores ['Dry','Fast'].
   * Order matters (it is a path, not a tag set): RECORD groups a way's routes
   * by shared prefix and forks the pill row only where the lists diverge
   * (store/routeSpecs.ts). Absent or [] = the way's "plain" route. Trimmed,
   * non-empty strings; validateCatalog rejects two routes on one way with the
   * same NON-empty list (two plain routes stay legal — the seed's shape).
   * Seed routes never carry this; their variant names remain the
   * ROUTE_DISPLAY_ID overlay (defaultRoute.ts). Ids are untouched (D-023). */
  specs?: string[];
}

export interface GateSet {
  wayId: string;
  version: number;
  chainageM: number[];
  createdAtMs: number;
  /** ROUTING-AND-SEGMENTATION §3 honesty clause: 'geometric' = placed from
   * geometry/proxies (quantiles, the reference ride's own stops), a starting
   * grid, never to be described as good placement; 'measured' is reserved
   * for placement from real multi-ride stop data (unbuilt). Optional: sets
   * that predate this field (the shipped seed) carry neither claim. */
  origin?: 'measured' | 'geometric';
  note?: string;
}

export interface Catalog {
  schemaVersion: number;
  landmarks: Landmark[];
  routes: Route[];
  ways: Way[];
  gateSets: GateSet[];
}

export type SectorQuality = 'clean' | 'interrupted' | 'estimated' | 'missed';

export interface SectorResult {
  index: number;
  fromChainageM: number;
  toChainageM: number;
  rawS: number;
  /** null unless clean|interrupted — estimated sectors never get moving time */
  movingS: number | null;
  quality: SectorQuality;
}

export interface RideResult {
  kind: 'rideResult';
  schemaVersion: number;
  rideId: string;
  startedAtMs: number;
  /** null = matched no route; stays uncoloured (D-025) */
  wayId: string | null;
  source: 'app' | 'archive';
  lap: { rawS: number; movingS: number | null; quality: SectorQuality };
  sectors: SectorResult[];
  /** D-024 cruise-σ tripwire fired on a seed ⇒ demoted out of the ranking */
  tripwireDemoted?: boolean;
  /** WP-H: the RIDER excluded this ride from ranking (detail screen's "Ignore
   * in ranking"). Distinct from tripwireDemoted (automatic, D-024) and from
   * deletion (the ride, trace and sector times all stay on file and visible).
   * Enforced at the ONE gate every consumer already uses — results.ts ranks()
   * — so no reader needs to know this field exists. Absent = counts. */
  ignoredFromRanking?: boolean;
  derivedBy: {
    engineVersion: string;
    gateSetVersion: number;
    resultSchemaVersion: number;
  };
}

export interface ResultsIndexEntry {
  rideId: string;
  wayId: string;
  startedAtMs: number;
}

/** results/index.json — ordered by startedAtMs ascending, always rebuildable. */
export interface ResultsIndex {
  schemaVersion: number;
  entries: ResultsIndexEntry[];
}

/** One row of the timing tower (D-028). Rank is computed, never stored. */
export interface TowerRow {
  rideId: string;
  /** the lap's scored seconds under the current timing mode (store/timing.ts) */
  timeS: number;
  /** 1-based; null = present but unranked (estimated / tripwire-demoted) */
  position: number | null;
  ghost: boolean;
  interrupted: boolean;
}
```

**No tier, no colour, no rank is stored.** Those are read-time functions of the ordered history — which is exactly what keeps the store colour-model-agnostic (§1) and what lets the §19 ruling land later without a migration.

---

## 4. On-disk layout

```
rides/<rideId>.jsonl      raw, append-only, forever              (D-023 — unchanged)
index.json                ride index, rebuildable                (existing)
catalog.json              landmarks · ways · routes · gate sets  (curated)
results/<rideId>.json     one RideResult                         (derived, deletable)
results/index.json        routeId → [{rideId, startedAtMs}] ordered ascending
catalog.user.json · refs.user.json · sports.json · results/   ← the actual file names on `virgin` (store/catalogStore.ts, live/userRefs.ts, store/sports.ts, store/resultsStore.ts)
```

Invariant, inherited from D-023 and worth stating as a test: **deleting `results/` entirely must lose nothing but CPU.** A QA case that wipes the tree, rebuilds, and asserts byte-equality is the cheapest possible guard against a benchmark second quietly becoming authoritative.

`results/index.json` is the only structure the live path reads at ride start. It is ordered by `startedAtMs`, so both window shapes are cheap: a 28-day window is a binary search on time; a last-N window is a slice from the tail. D-008's "benchmarks frozen at ride start" then holds unchanged — the freeze is a slice taken once, before the wheels move, and live colouring stays O(1).

## 5. Migration from what exists today

*Historical (2026-08-16). Describes migrating `main`'s three hardcoded `TrackId`s and seeding 232 + 131 archive rides. On `virgin` a fresh install has no seed; the migration that actually ran here is WP-3's v1→v2 key rename (read-side, `app/src/store/`).*

`TrackId = 'Morning' | 'EveningA' | 'EveningB'` is hardcoded in `app/core` and read through `app/src/live/refs.ts` from the QA-owned parity fixture. The migration is deliberately boring: those three strings become **route ids** verbatim, `refLineId` points at the same fixture entries, and two ways (`home→work`, `work→home`) are minted over them. No reference polyline changes, no re-parity, no fixture rebuild — the parity-proven engine keeps comparing the same numbers to the same lines. `TrackId` narrows to a `RouteId` alias so `app/core` need not change at all in the first step.

Seeding, per D-018/D-024: archive rides replay through the same offline pipeline (never Strava's numbers), producing `RideResult`s with `source: 'archive'`, marked as ghosts in the tower per D-028 and demoted if the cruise-σ tripwire fires on the first real commute. The prize is already measured — puttestraat↔work seeds **232 rides** on day one, against home↔work's 131.

## 6. Gate moves — what a new version costs

§22 wants the start/finish gates moved closer to the true endpoints, and B-20 asks what a gate move does to history. The versioning above gives a precise, non-destructive answer, and it is finer-grained than "history is invalidated":

- **Sector times** from an older `gateSetVersion` measure different stretches of road. They are not comparable and must not enter a sector window. They are not deleted either — a gate move that gets reverted restores comparability for free.
- **Lap times** survive a *middle*-gate move untouched: same start gate, same finish gate, same road. Only a start/finish move breaks laps — which is exactly what §22 proposes, so §22's own change is the expensive one and should be made once, deliberately, before the history deepens.

That asymmetry is the argument for doing §22 early rather than later: every week of delay costs more lap history at the eventual cutover.

## 7. What the tower needs (D-028), as a query

*Historical. Built as `app/src/live/towerSource.ts` + `app/src/ui/colourModel.ts` over the last-10-rides window (D-045), not the 28-day window written here; ghosts are the rider's own previous rides on the way.*

B-28's `getLiveTowerPosition` stub replaces its body with roughly:

> take `results/index.json` for this route → slice the window (28 days today; §19's N if the ruling changes it) → drop `quality === 'estimated'` (never rank, per D-028) → keep clean and interrupted moving-time laps → sort ascending → mark `source: 'archive'` entries as ghosts, and demote any with `tripwireDemoted` → the position of today's lap is its index+1.

Nothing else in the live path changes; the render path is already shared with the demo (§17 obligation, LAYOUT §3.8), so the stub is genuinely the whole seam.

## 8. Deliberately not designed yet

- **Sector sharing across ways.** The station→home test ride overlaps the Morning corridor for its entire 5.65 km — 65% of its points within 40 m — so its sectors could in principle reuse Morning's gates and benchmarks. Tempting, and wrong to build now: it makes sector identity a graph rather than a key. The v1 concession is that sector identity is keyed to (route, chainage pair) rather than to the way, which leaves the door open without walking through it.
- **Way autodetection at START** (§21). This schema is what it will query; the detection itself is app-side and belongs with B-34.
- **Per-place radius tuning.** One number per landmark, measured from the cluster spread, not guessed — a small analysis task rather than a design one.
- **Colour tiers.** By construction (§1). The tier layer is a pure function over `RideResult[]`; whichever model wins B-31 is ~30 lines that touch no storage.

## 8a. Route choice at START (Nathan, 2026-08-16)

Nathan's amendment to §2: where a way genuinely has several routes, the app should **ask which one this time** — and the route set is *curated*, not auto-minted: "if there are genuinely multiple routes (I should agree on them)". Two consequences for the model, both cheap and both worth building in from the start:

- **Routes are ratified, not discovered.** Path clustering *proposes* a route; a route only enters `catalog.json` once Nathan agrees it is a real alternative rather than a detour. This is D-015's history repeating usefully — the Evening A/B split was proposed by clustering and confirmed by eye — and it is what keeps a one-off roadworks diversion from minting a permanent ghost route with two rides in it.
- **The pick is intent, not truth.** Declaring the route at START turns D-025's auto-lock from a *discovery* into a *confirmation*, which is strictly better: the detector starts with one strong prior instead of three equal candidates, so it should lock earlier and more confidently than the measured ~400 m. The honesty rule when they disagree is the important half — **the ridden route wins**. If Nathan picks Evening A and rides Evening B, the ride is scored as Evening B (with a quiet note that the pick was overridden), never as a bad Evening A. A declared intent must never be able to colour a lap against a road it did not use.
- **UI shape** (for B-34, not decided here): START → detected landmark (correctable) → destination → *if the way has >1 route*, a route pick defaulting to the most-ridden recent one; single-route ways skip the step entirely and nothing changes from today.

## 9. Open questions

*Historical. Q1 and Q4 are about Nathan's archive landmarks (not on this branch). Q2: loops carry a hand label (`loopDiscriminator`). Q3 ("does a way with 4 rides get colours?") was ruled YES by D-045 (2026-08-26) — colours from ride 1 — but the code still holds the 5-ride floor; see `OPEN-ITEMS.md`.*

1. ~~**The 88-visit cluster needs a name.**~~ **Answered — it was two places in two eras.** The 75-event mass is where the bike lived while Nathan commuted from his student accommodation (Sep 2024 → Oct 2025, now dormant); the 7-event minority is a still-active errand stop at the Carrefour 141 m away (Aug 2025 → now). Chasing it turned up a measurement error worth keeping: at a 150 m radius the cluster merges his old **student accommodation** (50.87031, 4.69189 — ~7 events) with an unidentified spot **141 m southwest** (50.86982, 4.69003) that absorbs ~75 events and holds the bike for a median 101.7 h between rides. Full working in `landmarks_proposal.md` → "Centroid drift". Two consequences: **(a)** radius is derived, not defaulted — p90 of the endpoint spread + 30 m, capped at half the gap to the nearest landmark (a flat 60–80 m, which I first proposed, drops the mapped-ride count from 435 to **115**: bikes park across a 100–230 m cloud); **(b)** landmark coordinates shown to a human must carry a map link — this error survived one round of analysis and died the moment Nathan looked at a link.

**Landmark set v1 is now ratified** (Nathan, 2026-08-16): home, work, puttestraat, station, fosh, church — his coordinates for the last two, four mined clusters struck as outdated. `data/analysis/landmarks_v1.json` is the machine-readable form and the seed for `catalog.json`. This is §8a's curation principle applied one level down: places, like routes, enter the catalog because Nathan agrees they are places.
2. **Loop discriminator**: label loops by hand (`putt-loop-north`) or hash the path? Hand-labelling is honest and cheap at 78 rides; hashing scales but names nothing a human recognizes. Recommend hand.
3. **Does a way with 4 rides get colours at all?** §21 says small sets are fine (compare to the mean anyway); D-008 says <5 clean rides stay neutral. These conflict, and the conflict is a *product* call rather than a schema one — it belongs in the B-31 ruling, not here.
4. **Do dormant landmarks get boards at all** — puttestraat (moved away April 2026) and the old student bike spot (dead Oct 2025)? Nathan has answered the START half — dormant places are never offered — so the remaining question is only whether their archived boards stay *visible* somewhere or merely seed the model. 232 rides of history is the deepest dataset in the archive and the best test bed for the whole model — but a board he will never ride again is a museum, not a game. Suggest: seed and keep it, surface it only when a ride actually starts there.
