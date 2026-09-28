# 13 — RESULTS tab overhaul: free rides in RIDES, RESULTS grouped by route, most-used first

**Source: Nathan, 2026-09-27.** His words, numbered by him:

> "I think i have also thought on what i want the RESULTS tab to be.
> 1) so for now i think rides fulfill its function; all rides are there in chronological order
> with most recent from top. I also am thinking we should have a 'free ride' option on the
> record screen, when you want to record you rode somewhere, so similar to a NewNew ride, where
> you would 'write history' as a yellow line draws behind you; but with the difference that you
> dont want to save it as anything; but it will still be in your rides and can count for example
> for global statistics about total rides if i ever decide to add them
> 2) on the results tab i think it should be different than rides; results should be grouped by
> routes right (a bit like how the ROUTES tab is now, with each route clickable, but with the
> difference that when you open it, it is subdivided further in the multiple ways for that
> route?) then when clicking the way it would give you info about it. Thats where the
> scatterplot should live in my opinion + maybe statistics about how much that ride was taken
> etc.?
> 3) lets also think about which routes to show first in the RESULTS tab; i would sort it by
> most used, with most used routes at the top? this way the most common routes are the most
> readily accessible? If theres a tie in usage we can pick the most recent one to be higher?"

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-27 by the Plan
tier (Fable) from a Haiku digest plus one anchor check against the working tree (branch
`virgin`; the check was a grep for every consumer of `store/freeRides.ts` — see §1). Executor:
Sonnet, cold, this file only. Thirteenth brief of `virgin-cycle15`.

**This is the largest brief in this cycle.** It touches navigation structure across three
screens (RIDES, RESULTS, and how RESULTS reaches the way-detail screen) and adds two new
files. The other briefs in this folder are mostly cosmetic and local; this one changes how
Nathan gets around the app. **Nathan should read the Decisions section carefully before
this runs** — in particular decisions 2 (single screen with an in-screen drill-down), 5
(single-way routes skip the way list) and 7 (free rides stay out of RESULTS). Each is
reversible, but each changes the feel.

**Relation to brief 04 (`04-results-screen-visual-cleanup.md`).** Brief 04 restyles the
*inside* of `ResultsDetailScreen.tsx` (board + scatterplot). This brief does **not** edit
that file; it only changes *what leads to it* (a route picker, then a way picker, then the
same screen). The two are additive, not conflicting. Recommended order: 04 first (or
independently, any time) — it is small and self-contained. If both are executed in one
session, 04 goes first so that this brief's on-device checklist is run against the cleaned
screen.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree or from the 2026-09-27
  digest. If a quoted line, name or signature is not where the brief says, **stop and report
  the mismatch verbatim** (file, line, what you expected, what you found). Never guess, never
  patch around it, never rule on it yourself. This brief has more "read first, then act"
  steps than most — each one names exactly what to grep and what result means what; a
  result that matches neither described outcome is a stop.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `safe_to_delete/` is the bin.
- No new dependency, native or JS. Everything is RN core (`View`, `Text`, `Pressable`,
  `ScrollView`/`FlatList`, `BackHandler`).
- **Do not edit `app/src/ui/ResultsDetailScreen.tsx`** (brief 04's file), `RoutesScreen.tsx`,
  `CatalogDetailScreen.tsx`, `RecordScreen.tsx`, `store/types.ts`, `store/resultsStore.ts`,
  `store/freeRides.ts`, `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`,
  `Nathan/`, any other `NN-*.md` brief, or anything under `cycles/virgin-cycle14/`.
- No schema change, no new persisted file, no migration. Everything here is derived at
  render time from the two stores that already exist.

## Goal

Three things, in Nathan's order:

**(1) Free rides — great news: this already exists.** The "free ride" Nathan describes (record
a ride that belongs to no route, watch the yellow line draw behind you, don't name it, but
keep it in RIDES) is the existing "NewNew" path, end to end: FROM = new and TO = new on the
RECORD screen (`RecordScreen.tsx`, `NEW_ID = '~new'`, `freeRide = (fromId === NEW_ID || to === NEW_ID)` ~line 974),
the live map draws gates-only with no route line, the engine runs `mode='free'`, and at ride
end `rememberFreeRide(finalState, { startedAtMs })` (~line 527) **always** saves the ride to
`free-rides-cache.json` as long as it crossed at least one gate — *before* any naming offer.
The naming card's SKIP (`onNamingSkip`, ~634-637) does not discard it. So "you dont want to
save it as anything; but it will still be in your rides" is the current behaviour, minus one
thing that is **not** confirmed: whether those free rides actually **show up in the RIDES
tab's chronological list**. They live in a different file from normal rides
(`FreeRideRecord[]` in `free-rides-cache.json`, vs `RideResult` in `results/<rideId>.json`),
and the anchor check found **no import of `store/freeRides.ts` in `RidesScreen.tsx`** — only
`RideDetailScreen.tsx` / `rideDetailModel.ts` (the detail view), `settings.tsx` (reset) and a
comment in `tabNav.tsx` reference it. That is the one real gap in (1): §1 below is a
confirm-then-wire step, not a new recording mode. The "global statistics" remark needs
nothing built now (no global-stats feature exists); once free rides are enumerated by RIDES
they are countable by anything that counts rides later — noted as forward-compatible.

**(2) RESULTS grouped by route, then by way.** Today RESULTS is a flat list of every *way*
with ≥1 ride; tapping a row opens the board + scatterplot (`ResultsDetailScreen`). After this
brief RESULTS opens on a list of **routes** (card per route, `From → To`, in the ROUTES tab's
visual register). Tapping a route reveals that route's **ways** (only those with ≥1 ride),
each with its ride count and best time; tapping a way opens the **same** `ResultsDetailScreen`
as today. The scatterplot does not move — it already lives exactly where Nathan wants it.

**(3) Most-used routes first.** The route list is sorted by total rides across the route's
ways, descending; ties go to the route ridden most recently; remaining ties by label. The
way list inside a route uses the same rule. This is the sort the flat way list already uses
(`buildResultsList`, ties → most-recent → label), lifted one level up.

## Current state (from the digest; anchors to be re-confirmed by the executor at each step)

### (1) Free rides and the RIDES tab

- `app/src/store/types.ts:109-129` — `RideResult` has `wayId: string | null`. (Kept as a
  fact about the schema; the free-ride path does **not** use it — see next bullet.)
- `app/src/store/freeRides.ts` (verified 2026-09-27 by grep): `FREE_RIDES_CACHE_FILE = 'free-rides-cache.json'` (31),
  `interface FreeRideRecord` (34-42), module-level `let rides: FreeRideRecord[] = []` (43),
  `rememberFreeRide(st: LiveEngineState, meta?: { startedAtMs: number }): void` (121),
  **`freeRideResults(): FreeRideRecord[]` (144)** — the enumerator this brief reads —,
  `lastFreeRide()` (151), `freeRideNear(records, …)` (~164-167), `initFreeRidePersistence(fs)` (182),
  `resetFreeRides()` (211). The record's id form is `free:${startedAtMs}` (freeRides.ts:127,
  as cited by the comment at `app/src/ui/tabNav.tsx:29`).
- `app/src/ui/RideDetailScreen.tsx:48` imports `freeRideNear, freeRideResults` and
  `app/src/ui/rideDetailModel.ts:43,48` carries `free: FreeRideRecord | null` — i.e. **the
  ride-detail view already knows how to show a free ride.** The list is the only missing link.
- `app/src/ui/RidesScreen.tsx` — the RIDES tab's chronological list (most recent on top). Its
  imports do **not** include anything from `store/freeRides.ts` (grep, 2026-09-27). What it
  enumerates, how it sorts, and how a row tap reaches `RideDetailScreen` (a `tabNav` call or
  local state) are **not** in the digest — Step 0 reads them.
- `app/src/live/engine.ts:95` comment: "Free-ride times are persisted by store/freeRides.ts, a
  module structurally …" (parallel to the results store).

### (2) RESULTS tab today

- `app/src/ui/ResultsScreen.tsx` ~30-70: builds a **flat** list of ways via
  `buildResultsList(CATALOG, storedResultsForWay, allTimeBestLapS)`; rows are ways with ≥1
  ride, sorted most-ridden first, ties → most-recent, then label. Row tap opens
  `ResultsDetailScreen(wayId)`.
- `app/src/ui/ResultsDetailScreen.tsx` — board + scatterplot for one way. **Brief 04's file;
  read-only here.** Its entry contract is "give me a `wayId`" and stays that.
- `app/src/ui/RoutesScreen.tsx` ~40-130 — the visual model: card per route, title `From → To`,
  subtitle `N ways`; tap → `CatalogDetailScreen(kind='route', id=routeId)` (configuration
  screen — **not** what RESULTS should open; RESULTS needs its own route → way drill-down).
  Ways are not expandable in that list; the nesting is new in this brief.
- `app/src/store/types.ts:35-58` — `Route { id, startLandmarkId, endLandmarkId, loopDiscriminator?, wayIds: string[], sportId? }`,
  `Way { id, routeId, refLineId, gateSetVersion, seeded, referenceRideId?, specs?: string[] }`.
  A route already lists its `wayIds`; grouping is a lookup, not a new relationship.
- `app/src/store/resultsStore.ts` ~186: `storedResultsForWay(wayId): RideResult[]`, computed
  on demand (no cache) everywhere "X rides" is shown. No route-level aggregate exists.

### (3) Sorting today

- The way-level sort inside `buildResultsList` (ResultsScreen.tsx ~30-70 or the pure model it
  imports — Step 2 locates it): rides desc → most recent desc → label asc. The route-level
  rule in this brief mirrors it exactly.

## Decisions (already made — do not reopen)

1. **§1 is confirm-then-wire, and the test is mechanical.** Step 0 greps `RidesScreen.tsx`
   (and any model file it imports) for `freeRides`. Empty ⇒ free rides are not listed ⇒ wire
   them in (Branch B). Non-empty ⇒ read how, confirm on the checklist, build nothing (Branch A).
   No judgement call: the grep result decides. The 2026-09-27 anchor check predicts Branch B.
2. **RESULTS stays one screen file with an in-screen drill-down, not two new navigation
   destinations.** `ResultsScreen.tsx` gains `openRouteId: string | null` state: `null` renders
   the route list; a route id renders that route's way list with a back affordance
   (`‹ ROUTES` label row at the top, plus hardware back). The way list itself is a new dumb
   component `app/src/ui/resultsWayList.tsx` so `ResultsScreen.tsx` does not double in size.
   Reasoning: the tab already has exactly one outward hop (way row → `ResultsDetailScreen`),
   and the brief keeps it as the only one. Adding a second `tabNav` destination for a
   ten-row intermediate list would mean new tab-nav plumbing, a second back-stack entry and a
   second place to lose state on tab switch, for a list that is visually a "zoomed-in" version
   of the one above it. In-screen state is also what Nathan described ("when you open it, it
   is subdivided further").
3. **`ResultsDetailScreen` is reused as-is** as the way's info destination. It already is the
   board + scatterplot Nathan says should live there. The way-row tap calls the **same**
   handler the current flat-list row calls (whatever mechanism that is — Step 2 copies it
   verbatim). Ride-count / "how much that ride was taken" statistics are shown on the way
   row (count + best) and the route card (total count); anything richer inside the detail
   screen is brief 04's territory or a later brief (open question 3).
4. **Route-level sort is a new pure function in a new model file** `app/src/ui/resultsModel.ts`
   (see Files §3) with the same tie-breaking as the way-level sort: total rides desc → most
   recent ride across the route desc → label asc. Ride counts are derived on demand
   (`storedResultsForWay(wayId).length` summed over `route.wayIds`), never cached — the
   codebase's convention.
5. **A route with exactly one ridden way skips the way list.** Tapping such a route card
   opens `ResultsDetailScreen` for that way directly. A one-item intermediate list is a dead
   tap; on a virgin phone with a single seeded route this would otherwise be *every* tap.
   The card's subtitle tells the rider which is which: `1 way · 7 rides` vs `3 ways · 21 rides`.
   Hardware/UI back from the detail returns to wherever it returns today (unchanged).
6. **Only ridden things are listed, at both levels.** A route appears only if at least one of
   its ways has ≥1 ride; inside a route, only ways with ≥1 ride appear (a zero-ride way has
   no scatterplot to open). This is the current flat list's rule ("every WAY with ≥1 ride")
   applied per level. The `N ways` figure on the route card counts **ridden** ways, so it
   matches what the tap reveals.
7. **Free rides are not in RESULTS, and are in RIDES.** A free ride belongs to no route and
   no way, so it cannot appear in a route → way hierarchy; nothing in RESULTS references
   `freeRides.ts`. It **is** in the RIDES chronological list (§1), interleaved by start time
   with normal rides, and opens the existing `RideDetailScreen` free-ride view. Stated here so
   nobody later "fixes" RESULTS to include them.
8. **Empty states.** No ridden route at all → RESULTS shows a single dim line
   `NO RESULTS YET — RIDE A ROUTE FIRST` (all-caps label register, no body copy, per Nathan
   2026-09-24). A route opened from the list can never be empty (decision 6), so the way
   list has no empty state.
9. **State is per-mount, not persisted.** `openRouteId` resets when the tab remounts, like
   every other transient screen state in the app. If tab switching keeps the screen mounted
   (Step 2 will see), the open route survives the switch — acceptable either way; not
   persisted to disk.
10. **Catalog source and labels are whatever the current screens use.** The route list reads
    the same catalog the current `ResultsScreen` passes to `buildResultsList` (`CATALOG` or
    `activeCatalog()` — Step 2 reads which and uses that), and the `From → To` label is built
    by the same helper `RoutesScreen.tsx` uses. If that helper is inline in `RoutesScreen.tsx`
    (not exported), the executor **lifts it** into `resultsModel.ts` as `routeLabel(route, catalog)`
    and leaves `RoutesScreen.tsx` untouched (a duplicate of a few lines is preferred over
    editing a file this brief is told not to edit — log it in the report).

## Files to touch

### 0. Step 0 — read before writing anything (RIDES + free rides)

```
grep -n "freeRides\|FreeRide" app/src/ui/RidesScreen.tsx
grep -n "^import" app/src/ui/RidesScreen.tsx
```

Then open every `../ui/*Model*` or `../store/*` file the imports name and grep those for
`freeRides` too. Read `app/src/store/freeRides.ts` lines 30-45 (the `FreeRideRecord` shape)
and 118-150 (`rememberFreeRide`, `freeRideResults`) and `app/src/ui/rideDetailModel.ts`
lines 35-55 (how the detail model takes a free ride). Read how `RidesScreen.tsx` (a) builds
its row array, (b) sorts it (the field it sorts on — expected: a start-time ms), (c) renders
a row (label, date, duration/what else), (d) what the row tap calls to open `RideDetailScreen`
and with which id.

- **Branch A — the grep hits and the row array already merges `freeRideResults()`:** report
  the lines, skip Files §1, and keep checklist item 1 as a confirmation.
- **Branch B — no hit anywhere:** do Files §1.
- **Anything else** (e.g. `freeRides` imported but never enumerated, or a `RidesScreen` that
  does not own its list): stop and report.

### 1. `app/src/ui/RidesScreen.tsx` (Branch B only) + `app/src/ui/ridesModel.ts` (new, pure)

Create `app/src/ui/ridesModel.ts`:

```ts
/**
 * virgin-cycle15 brief 13 §1 (Nathan 2026-09-27): the RIDES tab lists every
 * ride — normal RideResults (results/<id>.json, one per way) AND free rides
 * (free-rides-cache.json, no way, no route). The two stores are separate on
 * disk on purpose (freeRides.ts header); this model merges them for display
 * only. Newest first. Pure: no store import, both arrays are passed in.
 */
import type { RideResult } from '../store/types.ts';
import type { FreeRideRecord } from '../store/freeRides.ts';

export type RidesRow =
  | { kind: 'ride'; id: string; startedAtMs: number; ride: RideResult }
  | { kind: 'free'; id: string; startedAtMs: number; free: FreeRideRecord };

export function mergeRidesRows(rides: readonly RideResult[], free: readonly FreeRideRecord[]): RidesRow[] {
  const rows: RidesRow[] = [];
  for (const ride of rides) rows.push({ kind: 'ride', id: ride.id, startedAtMs: ride.startedAtMs, ride });
  for (const f of free) rows.push({ kind: 'free', id: `free:${f.startedAtMs}`, startedAtMs: f.startedAtMs, free: f });
  rows.sort((a, b) => b.startedAtMs - a.startedAtMs || a.id.localeCompare(b.id));
  return rows;
}
```

**Field names above are placeholders the executor must reconcile in Step 0:** `ride.id`,
`ride.startedAtMs` against `types.ts:109-129`, and `f.startedAtMs` against `freeRides.ts:34-42`.
If `FreeRideRecord` already carries an `id` field, use it instead of building
`free:${startedAtMs}`; if the name of the start-time field differs, use the real one. If
`RideResult` has no start-time field at all, stop and report (the current sort must be using
something — say what).

Then in `RidesScreen.tsx`: import `freeRideResults` from `'../store/freeRides.ts'` and
`mergeRidesRows` from `'./ridesModel.ts'`; replace the row-array construction with
`mergeRidesRows(<the RideResult[] it builds today>, freeRideResults())`; in the row renderer,
a `kind === 'free'` row shows the label **`Free ride`** where a normal row shows its
route/way label, the same date line, and whatever duration/summary the free record can
supply (if the normal row shows a lap time that a free ride has no equivalent of, show the
gate-crossing count `N gates` in that slot — `crossings.length`). Row tap for a free row
opens `RideDetailScreen` with the free id, using the exact same call the normal row uses
(`tabNav.tsx:29`'s comment is the evidence the detail screen accepts `free:${startedAtMs}`
ids — if the call in fact takes a `RideResult` object and not an id, stop and report).

Nothing else in `RidesScreen.tsx` changes. No sort logic stays in the screen (it moves to
the model).

### 2. `app/src/ui/ResultsScreen.tsx` — route list + in-screen drill-down

Read the whole file first (it is short, ~30-70 for the list logic). Identify: (a) the catalog
value passed to `buildResultsList`, (b) the row component/styles, (c) the row `onPress` that
opens `ResultsDetailScreen(wayId)` — **copy that mechanism verbatim; do not invent a new
one**, (d) whether the file already has a `BackHandler` subscription (RecordScreen.tsx:18
imports it; copy that pattern if ResultsScreen has none), (e) whether `buildResultsList`
lives in this file or in a model file (if a model file, that is where `resultsModel.ts`'s
new functions go instead of a new file — same name if it is already `resultsModel.ts`).

Then:

- State: `const [openRouteId, setOpenRouteId] = useState<string | null>(null);`
- `const routes = useMemo(() => buildResultsRoutes(catalog, storedResultsForWay, allTimeBestLapS), [...])`
  (Files §3 defines it), with the same deps/refresh trigger the current `buildResultsList`
  call uses (if the current list is rebuilt on focus or on a tick, the new one is too — same
  hook).
- `openRouteId === null` → render the **route list**: one card per `ResultsRoute`, in the
  ROUTES tab's card register (border, radius, padding from `RoutesScreen.tsx` ~40-130 — copy
  the style values, not the file's components). Title `route.label`; subtitle
  `${route.ways.length} way${route.ways.length === 1 ? '' : 's'} · ${route.rideCount} ride${…}`.
  `onPress`: if `route.ways.length === 1` → open detail for `route.ways[0].wayId` (the copied
  mechanism, decision 5); else `setOpenRouteId(route.routeId)`.
- `openRouteId !== null` → find the route (`routes.find(...)`; if it is gone because rides
  were deleted meanwhile, `setOpenRouteId(null)` in an effect and render the list) and render
  `<ResultsWayList route={route} onBack={() => setOpenRouteId(null)} onOpenWay={<the copied mechanism>} />`.
- `BackHandler`: while `openRouteId !== null`, a hardware back press calls
  `setOpenRouteId(null)` and returns `true`; otherwise the listener returns `false` (existing
  behaviour). Subscribe/unsubscribe in a `useEffect` keyed on `openRouteId !== null`.
- Empty state (decision 8) when `routes.length === 0`.
- The old flat list rendering and `buildResultsList` call are removed from this file. If
  `buildResultsList` is exported from a model file and has its own tests, **leave the function
  and its tests in place** (it is still the way-level sort; §3 reuses it). Only the screen
  stops calling it directly.

### 3. `app/src/ui/resultsModel.ts` — new pure grouping + sort (or appended to the existing model file, see §2(e))

```ts
/**
 * virgin-cycle15 brief 13 §2/§3 (Nathan 2026-09-27): RESULTS is grouped by
 * route, then way. Only ridden things are listed at either level. Both
 * levels sort most-used first, ties → most recent → label. Counts are derived
 * on demand from storedResultsForWay (the codebase convention — no cache).
 * Pure: the store accessors are passed in so the suite can stub them.
 */
export interface ResultsWayRow {
  wayId: string;
  label: string;          // the way's display label as the flat list showed it today
  rideCount: number;
  lastRiddenAtMs: number; // max start time over its rides
  bestLapS: number | null;
}
export interface ResultsRoute {
  routeId: string;
  label: string;          // `From → To`, same helper as RoutesScreen
  rideCount: number;      // sum over ridden ways
  lastRiddenAtMs: number; // max over ridden ways
  ways: ResultsWayRow[];  // ridden ways only, sorted (rides desc, recent desc, label asc)
}

export function rideCountForRoute(route: Route, resultsForWay: (wayId: string) => readonly RideResult[]): number
export function buildResultsRoutes(catalog: Catalog, resultsForWay: (wayId: string) => readonly RideResult[], bestLapS: (wayId: string) => number | null): ResultsRoute[]
```

`buildResultsRoutes`: for each route in the catalog, build the ridden `ResultsWayRow`s
(reuse the existing way-level row builder / sort where one exists — if `buildResultsList`
already returns rows with `rideCount`/`lastRiddenAtMs`, build the route's ways by filtering
its output on `route.wayIds`; do not re-implement the way sort); drop routes with zero
ridden ways; compute `rideCount` and `lastRiddenAtMs`; sort routes by
`rideCount desc → lastRiddenAtMs desc → label asc`. The parameter types (`Catalog`, the
accessor signatures, `bestLapS`) must be the ones the current `buildResultsList` takes —
mirror its signature, do not invent one.

### 4. `app/src/ui/resultsWayList.tsx` — new dumb component

```tsx
/**
 * virgin-cycle15 brief 13 (Nathan 2026-09-27): the second level of RESULTS —
 * one route's ridden ways. Dumb UI: ResultsScreen owns openRouteId and the
 * hop into ResultsDetailScreen. Rendered only for routes with 2+ ridden ways
 * (a single-way route opens its detail directly — decision 5).
 */
export interface ResultsWayListProps {
  route: ResultsRoute;
  onBack: () => void;
  onOpenWay: (wayId: string) => void;
}
```

Renders: a top row `‹ ROUTES` (dim, all-caps label style, `onPress={onBack}`), the route
label as a heading, then one row per `route.ways[i]`: way label, `N rides`, best time
(formatted with whatever formatter the current flat list uses for its best — reuse it, do not
add one), `onPress={() => onOpenWay(way.wayId)}`. Styles: copy the current flat-list row
style values so the way rows look like today's RESULTS rows (only the level above them is
new). `useTheme()` for colours, as `routeNamingCard.tsx` does.

### 5. Tests — `app/tests/results_model_suite.ts` (new, or extend the existing suite if §2(e) found one) and `app/tests/rides_model_suite.ts` (new, Branch B only)

Register new suites in `app/tests/run.ts` next to the existing `results`/`rides` entries
(look at line ~37 where `recordflow_suite.ts` is registered for the shape). Same
`assert`/`test` style from `./lib.ts`. Cases:

- `buildResultsRoutes`: two routes, A with ways a1 (3 rides) + a2 (0 rides), B with b1
  (2 rides) + b2 (2 rides) → B first (4 > 3), A second with `ways.length === 1` (a2 dropped),
  B `ways.length === 2`.
- Tie: A total 4 (last ride t=100), B total 4 (last ride t=200) → B first.
- Tie on both: label asc.
- Route with zero ridden ways → absent.
- `rideCountForRoute` sums over `wayIds` only (a stray ride on a way not in the route does not
  count).
- Empty catalog → `[]`.
- `mergeRidesRows` (Branch B): one normal ride at t=10, one free at t=20, one normal at t=30 →
  order 30, 20, 10; the free row has `kind === 'free'` and id `free:20`; empty inputs → `[]`.

## Verification (executor runs all; report the actual numbers)

```
cd app && node --experimental-strip-types tests/run.ts     # 0 FAIL; count goes up by the new tests
cd app && ./node_modules/.bin/tsc --noEmit                  # clean, exit 0
grep -n "freeRides" app/src/ui/ResultsScreen.tsx app/src/ui/resultsModel.ts app/src/ui/resultsWayList.tsx   # → no matches (decision 7)
grep -n "freeRideResults" app/src/ui/RidesScreen.tsx app/src/ui/ridesModel.ts   # → Branch B: RidesScreen.tsx imports it, ridesModel.ts does not (pure)
grep -n "buildResultsList" app/src/ui/ResultsScreen.tsx     # → no matches (the screen calls buildResultsRoutes)
git status --short   # → M ResultsScreen.tsx, M RidesScreen.tsx (B), M tests/run.ts, ?? resultsModel.ts, ?? resultsWayList.tsx, ?? ridesModel.ts (B), ?? the new suite(s) — and NOTHING under ResultsDetailScreen.tsx, RoutesScreen.tsx, RecordScreen.tsx, store/
```

Baseline: whatever `STATE.md` says at execution time (2026-09-26: 676 tests, 673 pass, 0
fail, 3 skip — briefs landing before this one will have moved it). Record before/after. If
`tsc` blows the call budget on this mount, retry once with a longer timeout, then report — do
not substitute a syntax-only check without saying so.

## On-device checklist (Nathan, after OTA — not the executor)

Needs a phone with a few rides on at least two routes, one of which has two ridden ways, plus
one free ride. If none: record a NewNew ride (FROM new, TO new), cross at least one gate,
SKIP the naming card.

1. **RIDES**: the free ride is in the list, in its chronological place (not at the bottom, not
   in a separate section), labelled `Free ride`. Tap it → the ride detail opens (the free-ride
   view it already had). Normal rides look exactly as before.
2. **RESULTS, first open**: a list of route cards, `From → To` on top, `N ways · M rides`
   below. The route you have ridden most is on top. No way rows, no scatterplot yet.
3. Two routes with the same number of rides: the one ridden more recently is higher.
4. Tap a route with 2+ ridden ways: the card list is replaced by `‹ ROUTES`, the route's name,
   and its ridden ways with `N rides` and best time; most-ridden way first. Tap `‹ ROUTES` →
   back to the route cards, same scroll position not required. Hardware back does the same.
5. Tap a way: the board + scatterplot screen — the same one as before this brief (with brief
   04's cleanup if that landed). Back from it returns to the way list, not to the route list.
6. Tap a route whose subtitle says `1 way`: the board + scatterplot opens **directly** (no
   one-item way list). Back returns to the route cards.
7. A route with a way you never rode: that way is absent from its way list; a route you never
   rode at all is absent from the route list.
8. The free ride is **not** in RESULTS anywhere.
9. Fresh/virgin phone: RESULTS shows `NO RESULTS YET — RIDE A ROUTE FIRST` and nothing else.
10. Both themes: cards, `‹ ROUTES`, way rows, empty-state line legible.

## Out of scope

- **Any new recording mode.** Free ride = the existing NewNew/`mode='free'` path; RECORD
  screen untouched. If Nathan wants a dedicated `FREE RIDE` button on RECORD instead of
  picking new/new (open question 1), that is a separate brief.
- **Global statistics** ("total rides"). Nothing exists and nothing is built; §1 only makes
  free rides enumerable so a future counter can include them.
- **`ResultsDetailScreen.tsx` internals** — brief 04. Richer per-way statistics inside it
  (frequency by weekday, trend) — open question 3, later brief.
- **ROUTES tab and `CatalogDetailScreen`** — unchanged; RESULTS gets its own drill-down.
- Persisting `openRouteId`, remembering scroll position, animations on the drill-down.
- Sports: the route list shows whatever the current catalog accessor returns (per-sport if it
  is per-sport today, all if not). No new sport filter.
- iOS.
- `STATE.md`, `OPEN-ITEMS.md`, this folder's `README.md` — the coordinator's.

## What this changes on Nathan's phone

Nothing yet — this is a parked brief. Once executed: JS-only (two screens edited, three or
four small files added, one or two suites added; no new dependency, no `app.json`/`eas.json`
change, no storage change), so it ships to the Preview APK over EAS Update via
`scripts/publish-preview.cmd` — no new numbered build, no reinstall. Existing rides and free
rides on the phone are untouched and need no migration. Visible changes: (1) free rides
appear in RIDES (if Step 0 confirms they were missing); (2) RESULTS opens on route cards
instead of way rows, one tap deeper to reach the same scatterplot for multi-way routes, the
same number of taps for single-way routes; (3) most-used routes first. RECORD, ROUTES,
SETTINGS: no difference.

## Open questions / assumptions (logged, not blocking)

1. **"Free ride option on the record screen."** Read as satisfied by FROM = new / TO = new
   (the NewNew path), since that is what draws the yellow line and skips naming. If Nathan
   meant a *dedicated* button labelled `FREE RIDE` that pre-selects new/new in one tap, that is
   a small RECORD-screen brief of its own — not started here so this brief keeps its hands off
   `RecordScreen.tsx`.
2. **In-screen drill-down vs a real second screen** (decision 2). If the app's tab navigator
   turns out to keep a back-stack that the in-screen state fights with (e.g. hardware back is
   already consumed by `tabNav` before the screen sees it), the executor stops at §2(d) and
   reports; the fallback is a `tabNav` destination `resultsWays(routeId)` — same component,
   different mount.
3. **"Maybe statistics about how much that ride was taken etc."** Answered at the list level
   (counts on cards and rows). Statistics *inside* the way detail (rides per week, first/last
   ridden, trend) are deliberately left to a later brief so this one does not touch brief 04's
   file.
4. **Single-way shortcut** (decision 5) means the route-list tap has two behaviours. The
   subtitle disambiguates; if it still feels inconsistent on the phone, the one-line change is
   to always open the way list.
5. **`N ways` counts ridden ways**, not catalog ways (decision 6), so it can read `1 way` for a
   route the ROUTES tab shows as `2 ways`. Chosen so the subtitle predicts the tap. If Nathan
   prefers the catalog count, swap `route.ways.length` for `route.wayIds.length` on the card.
6. **Copy**: `Free ride`, `‹ ROUTES`, `NO RESULTS YET — RIDE A ROUTE FIRST`, `N ways · M rides`
   are the Plan tier's shortest guesses in the existing register; all single string literals.
7. **Free-ride row summary** in RIDES (`N gates` where a normal row shows a lap time) is a
   guess at what a free record can honestly show; Step 0 may find a better field (distance,
   duration) on `FreeRideRecord` — if so, use it and say which.

## Ruling 2026-09-28 (Plan tier, Fable — executor escalation on §1 and decision 2)

The Sonnet executor stopped at Step 0 and §2(d) without editing anything and reported two
mismatches. Both are real; both were the right stop. Read from the tree myself (branch
`virgin`, after brief 04 landed as d1ae13c — so checklist 5 runs against the cleaned detail
screen). **Two rulings. §1 is DONE by this ruling (verified below). §2 changes shape: the
drilled-into route id moves from `ResultsScreen` state to Shell, via `tabNav`, and is handed
back to `ResultsScreen` as a prop.** Everything else in the brief (decisions 3–8, 10, §3, §4,
§5's `buildResultsRoutes` cases, the checklist) stands as written.

### Ruling A — §1 was built on a wrong premise; done as a 2-file label fix, not a merge module

**The premise.** §1 assumed free rides live *only* in `free-rides-cache.json` and are absent
from RIDES, so a merge of `RideResult[]` + `FreeRideRecord[]` was prescribed. Wrong on both
counts:

- A free ride is a **raw ride like any other**: `startRide('free')` (storage/core.ts:28)
  writes the same `rides/<rideId>.jsonl` and the same `index.json` entry (`mode: 'free'`), and
  `listRides()` (core.ts:235) returns it as a `RideMeta`. `RidesScreen.tsx` lists
  `RideMeta[]`, sorted `b.startMs - a.startMs` — so every free ride was **already in RIDES, in
  its chronological place**. `free-rides-cache.json` is the free ride's *derived* companion
  (gate crossings/sectors), parallel to `results/<rideId>.json` for a route ride — not a
  second population of rides. `mergeRidesRows` would have listed each free ride twice.
- What was actually missing was only the **label**: with no stored `RideResult` (free rides
  are deliberately kept out of the backfill, D-025), `buildRideRows` fell through
  virgin-cycle13's chain to the START-pick label, i.e. `new → new · no lap`, rank `–`.
  The tap already opened the free view (`tabNav.openRide({..., startedAtMs: item.startMs})`
  → `RideDetailScreen` resolves `freeRideNear(freeRideResults(), startedAtMs)`).

**What landed (this ruling, verified):**

- `app/src/ui/rideHistoryModel.ts` — `buildRideRows` gains a 7th optional parameter
  `freeFor: (startMs: number) => FreeRideRecord | null = () => null` (type-only import of
  `FreeRideRecord`). In the no-result branch the chain is now **reference way → free record →
  pick label**: a ride that founded a way still reads `<way> — ref` (a *named* free ride
  became a route's reference — that wins); an unnamed free ride with a record on file returns
  `wayName: 'Free ride'`, `lapLabel: '<N> gate(s)'` (`crossings.length` — open question 7's
  guess confirmed: it is the only honest figure a free record carries; `wayId`/`lapS`/`rank`
  stay null, D-025); everything else falls through to the pick label exactly as before.
- `app/src/ui/RidesScreen.tsx` — imports `freeRideNear, freeRideResults` from
  `'../store/freeRides'` and passes `(startMs) => freeRideNear(freeRideResults(), startMs)`.
  **The same tolerance match `RideDetailScreen.tsx:195` uses**, so the row's "Free ride" and
  the detail's free view agree by construction (a zero-gate free ride has no record — it stays
  `new → new` in the list AND `kind: 'none'` in the detail; consistent). Nothing else in the
  screen changed: same `listRides()`, same sort, same tap.
- `app/tests/ridehistory_suite.ts` — 5 new cases (label + gate count, singular `1 gate`,
  reference beats free, `freeFor` null keeps the cycle-13 fallback byte-for-byte, a matched
  ride never consults `freeFor`).
- **Not created, not to be created:** `app/src/ui/ridesModel.ts`, `app/tests/rides_model_suite.ts`.
  `tests/run.ts` untouched. Step 0, §1, the `mergeRidesRows` case in §5 and the
  `ridesModel.ts` lines of the Verification block are **superseded** by this section.

Verification run by the Plan tier on the mount: `node --experimental-strip-types tests/run.ts`
→ **742 tests: 739 pass, 0 fail, 3 skip** (baseline before: 737/734/0/3); `tsc --noEmit` →
exit 0. Decision 7 ("free rides are in RIDES, interleaved by start time") is therefore
satisfied; checklist item 1 is a plain confirmation.

### Ruling B — decision 2's `openRouteId` cannot live in `ResultsScreen`; it moves to Shell via `tabNav`

**The mismatch, confirmed.** `App.tsx` renders exactly one screen in one ternary:
`… : resultsDetail !== null ? <ResultsDetailScreen request={resultsDetail} /> : … : tab === 'results' ? <ResultsScreen /> : …`.
Opening a way's detail **unmounts** `ResultsScreen` (its `useState` is gone); `closeResults()`
sets `resultsDetail` to `null` and `ResultsScreen` **remounts fresh** (`tabNav.tsx`:
"dismiss the detail; the active tab's screen remounts underneath"). So with decision 2 as
written, BACK from a way's detail on a multi-way route always lands on the *route* list —
checklist item 5 ("Back from it returns to the way list") is unreachable. This is the
mount-swap the brief's open question 2 anticipated. (The *other* half of that question —
"hardware back consumed by tabNav before the screen sees it" — does **not** bite: a child's
`BackHandler` subscription re-registered on its own dep change is newer than Shell's and runs
first, which is what `RecordScreen`/`DemoScreen`/`ReplayScreen` already rely on. Moot anyway,
because the design below needs no in-screen `BackHandler` at all.)

**Options weighed.**

1. *Open question 2's literal fallback* — a new overlay `resultsWays(routeId)` mount-swapped
   like the other four. Rejected: every existing overlay hides the tab bar and renders over
   *any* tab; the way list is the RESULTS tab's own content (tab bar must stay, must not appear
   over RIDES). It would be a fifth overlay that breaks the overlay rule twice.
2. *Module-level "last open route" singleton read by `ResultsScreen`'s initial state.* Rejected:
   smallest diff, but a UI-state singleton outside React is a new pattern in this codebase, it
   still needs the in-screen `BackHandler`, and it makes decision 9 silently false.
3. *Thread the route id through `ResultsDetailRequest`.* Rejected: `closeResults()` nulls the
   request, so nothing survives to restore from without Shell keeping it anyway — which is
   option 4 with extra steps.
4. **Shell owns the id; `ResultsScreen` receives it as a prop and changes it through `tabNav`.**
   Chosen. It is exactly the "screen owns intent, Shell owns chrome" split the four overlays
   use, minus the overlay: Shell holds `resultsRoute: string | null`, hands it to
   `<ResultsScreen openRouteId={resultsRoute} />`, and handles hardware back for it in the one
   place hardware back is already handled. The detail hop leaves `resultsRoute` untouched, so
   the remounted `ResultsScreen` renders the way list — checklist 5 holds. No in-screen
   `useState` for the route, no in-screen `BackHandler`, no reliance on listener order.

**Decision 2 amended to:** RESULTS is still one screen file plus the dumb `resultsWayList.tsx`
(§4) — but the drilled-into route id is Shell state, reached through two new `tabNav`
methods. **Decision 9 amended to:** the open route survives the detail hop (the point) and a
tab switch away and back (acceptable, per the original wording), resets when the route
disappears from the active catalog (rides deleted, sport switched — see the effect below), and
is never persisted to disk.

**Exact changes (executor: these replace §2's `useState`/`BackHandler` bullets; the rest of
§2 — route list rendering, decision-5 shortcut, empty state, removal of the flat list — is
unchanged).**

`app/src/ui/tabNav.tsx` — after the `closeResults(): void;` line inside `interface TabNav`,
add:

```ts
  /** virgin-cycle15 brief 13 (Fable ruling 2026-09-28): which route the
   * RESULTS tab has drilled into (its ridden-way list), or null for the
   * route list. Shell holds it — not ResultsScreen — because
   * ResultsDetailScreen is mount-swapped IN PLACE of ResultsScreen (the
   * ternary in App.tsx), so any in-screen state dies on the hop into a
   * way's detail and BACK would always land on the route list. NOT an
   * overlay: the tab bar stays and it only ever renders inside RESULTS
   * (App.tsx passes it to <ResultsScreen openRouteId=…/>). Idempotent. */
  openResultsRoute(routeId: string): void;
  /** virgin-cycle15 brief 13: back to the route list. */
  closeResultsRoute(): void;
```

`App.tsx` — four edits, all inside `Shell()`:

1. After the `const [resultsDetail, setResultsDetail] = useState<ResultsDetailRequest | null>(null);`
   line:
   ```ts
   // virgin-cycle15 brief 13: the RESULTS tab's drilled-into route (its way
   // list) — Shell state, not ResultsScreen state, because the results
   // detail below mount-swaps ResultsScreen away and BACK must land on the
   // way list (see tabNav.tsx's openResultsRoute doc). Not an overlay: does
   // not hide the tab bar, only rendered while `tab === 'results'`.
   const [resultsRoute, setResultsRoute] = useState<string | null>(null);
   ```
2. In the `hardwareBackPress` listener, **between** the `if (resultsDetail !== null) {…}`
   block and the `if (tab !== 'record') {…}` block:
   ```ts
   if (tab === 'results' && resultsRoute !== null) {
     setResultsRoute(null);
     return true;
   }
   ```
   and add `resultsRoute` to that effect's dependency array
   (`[tab, rideDetail, gateAdjust, catalogDetail, resultsDetail, resultsRoute]`). Update the
   comment above the effect to read "… → catalog detail → results detail → results way list →
   other tabs → Record".
3. In the `nav` memo, after `closeResults: () => setResultsDetail(null),`:
   ```ts
   openResultsRoute: setResultsRoute,
   closeResultsRoute: () => setResultsRoute(null),
   ```
4. In the render ternary: `: tab === 'results' ? <ResultsScreen openRouteId={resultsRoute} />`.
   **`tabBarHidden` is NOT changed** — the way list keeps the tab bar.

`app/src/ui/ResultsScreen.tsx`:

- Signature becomes `export default function ResultsScreen({ openRouteId }: { openRouteId: string | null })`.
- No `useState` for the route; no `BackHandler` import or effect. Wherever §2 says
  `setOpenRouteId(route.routeId)` call `tabNav.openResultsRoute(route.routeId)`; wherever it
  says `setOpenRouteId(null)` (the `‹ ROUTES` row's `onBack`) call `tabNav.closeResultsRoute()`.
- Resolve `const openRoute = openRouteId !== null ? routes.find((r) => r.routeId === openRouteId) ?? null : null;`
  Render `<ResultsWayList route={openRoute} … />` when `openRoute !== null`, else the route
  list (or the decision-8 empty line). Add
  `useEffect(() => { if (openRouteId !== null && openRoute === null) tabNav.closeResultsRoute(); }, [openRouteId, openRoute, tabNav]);`
  — this is §2's "if it is gone because rides were deleted meanwhile" bullet, and it also
  covers a sport switch (the id belongs to the previous sport's catalog).
- The existing `tick` effect, `activeCatalog()`, sport badge line and `tabNav.openResults({ wayId })`
  hop are the mechanisms §2(a)/(c) told you to copy — they are the ones quoted above; keep
  them verbatim.

**Anchors resolved for the executor (so §2(e)/§3/§5/decision 10 need no further stop):**

- `buildResultsList` lives in **`app/src/ui/resultsListModel.ts`** (exported, with
  `ResultsListRow { wayId, label, rides, bestLabel, lastLabel }`; the internal sort key
  `lastMs` is not exported). So per §2(e): **no new `resultsModel.ts`** — `ResultsWayRow`,
  `ResultsRoute`, `rideCountForRoute`, `buildResultsRoutes` and the lifted `routeLabel` go
  **into `resultsListModel.ts`**, and their tests go into the **existing
  `app/tests/resultsmodel_suite.ts`** (it already has `const CATALOG` with `routes: [routeAB, routeAC]`,
  three ways, and the `mk(...)` RideResult helper at ~:65 — reuse them). `tests/run.ts` is not edited. `buildResultsList`
  itself and its tests stay; since it does not expose `lastMs`, compute the route's
  `lastRiddenAtMs` directly from `resultsFor(wayId)` (max `startedAtMs`) rather than reading
  it off `ResultsListRow`. Its parameter types are the ones to mirror:
  `(catalog: Catalog, resultsFor: (wayId: string) => RideResult[], bestS: (wayId: string) => number | null)`.
- The `From → To` label is **inline** in `RoutesScreen.tsx` (`{from?.label} → {to?.label}`,
  landmarks looked up by `startLandmarkId`/`endLandmarkId` in `CATALOG.landmarks`). Decision
  10 applies: lift it as `routeLabel(route: Route, catalog: Catalog): string` in
  `resultsListModel.ts` (missing landmark → `'?'` for that side, never a raw id), leave
  `RoutesScreen.tsx` untouched.
- Route-card style values to copy from `RoutesScreen.tsx`'s `st`: `card: { borderWidth: 1, borderRadius: radius.card, paddingHorizontal: 13 }`,
  `row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 }`, title
  `fontSize: 15` in `t.text`, subtitle `fontSize: 11.5` in `t.textDim`, chevron `›` in
  `t.textDim`, `marginBottom: 10`, colours `t.card`/`t.cardBorder`. Way rows keep
  `ResultsScreen.tsx`'s current `row`/`rowInfo`/`rowTitle`/`rowRight`/`rides`/`chev` styles.
- The current empty string `no results yet — finish a ride on a way and it shows up here` is
  replaced by decision 8's `NO RESULTS YET — RIDE A ROUTE FIRST` (in the `sub`-style
  all-caps register, `t.textDim`). The current `ListFooterComponent` ("N more ways with no
  rides yet — see ROUTES") goes with the flat list, per §2's last bullet and decision 6; if
  Nathan misses it, it is a one-line re-add on the route list using
  `buildResultsList(...).unriddenWays`.

**Verification block, amended:** same two commands and numbers (baseline now
**742 / 739 / 0 / 3** after Ruling A); `grep -n "freeRides" app/src/ui/ResultsScreen.tsx app/src/ui/resultsListModel.ts app/src/ui/resultsWayList.tsx` → no match;
`grep -n "buildResultsList" app/src/ui/ResultsScreen.tsx` → no match;
`grep -n "openResultsRoute\|closeResultsRoute" App.tsx app/src/ui/tabNav.tsx app/src/ui/ResultsScreen.tsx` → hits in all three;
`grep -n "BackHandler" app/src/ui/ResultsScreen.tsx` → no match. Expected `git status --short`
(app/ only): `M App.tsx`, `M src/ui/tabNav.tsx`, `M src/ui/ResultsScreen.tsx`,
`M src/ui/resultsListModel.ts`, `M tests/resultsmodel_suite.ts`, `?? src/ui/resultsWayList.tsx`
— plus, already there from Ruling A: `M src/ui/RidesScreen.tsx`, `M src/ui/rideHistoryModel.ts`,
`M tests/ridehistory_suite.ts`. Nothing under `store/`, no `ResultsDetailScreen.tsx`,
`RoutesScreen.tsx`, `RecordScreen.tsx`, `tests/run.ts`.

**Checklist, amended:** item 1 is a confirmation (`Free ride · <date> · N gates`, tap opens the
free view). Item 4's "Hardware back does the same" now goes through Shell's handler. Item 5
holds by construction. Add **11.** open a route's way list, switch to RIDES, switch back to
RESULTS → the way list is still open (`‹ ROUTES` returns to the cards); and **12.** with a way
list open, switch sport in SETTINGS, return to RESULTS → the route list of the new sport, no
stale `‹ ROUTES` row.
