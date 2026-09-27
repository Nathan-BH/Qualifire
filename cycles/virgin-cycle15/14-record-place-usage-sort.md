# 14 — RECORD: rank the START / GOING TO place pills by how often they are used

**Source: Nathan, 2026-09-27.** His words: "this actually makes me think about how to rank the
different places on the RECORD tab, it might be best to also apply a usage bias so most used
places are shown as the first options instead of just following like creation order or
whatever is used now?"

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-27 by the Plan
tier (Fable) from a Haiku digest plus one anchor check against the working tree (branch
`virgin`, HEAD `c3e92ef`). Executor: Sonnet, cold, this file only. Brief 14 of
`virgin-cycle15`; independent of every other brief in this folder. It shares
`app/src/ui/RecordScreen.tsx` with brief 15 (which edits the `LaunchAnimation` sites near
lines 606 / 669 / 1113 / 1164 and nothing near line 955 or the import block) — either order,
but whichever runs second must match on the **quoted text**, not the line numbers, because
the other brief will have shifted them by a few lines.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-27. If a quoted
  line is not where the brief says, or a name/signature differs, **stop and report the
  mismatch verbatim** (file, line, what you expected, what you found). Never guess, never
  patch around it, never rule on it yourself.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `safe_to_delete/` is the bin.
- No new dependency, native or JS. Plain TypeScript + the existing store exports.
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`,
  any other `NN-*.md` brief here, or anything under `cycles/virgin-cycle14/` (history).
- **Do not touch `app/src/ui/RoutesScreen.tsx`, `app/src/store/catalog.ts`,
  `app/src/store/resultsStore.ts`, `app/src/store/types.ts`.** No schema change: the
  `Landmark` type gets no new field. Usage is *derived* from stored ride results, never
  stored on the landmark.

## Goal

On the RECORD tab's setup flow, the **START** pill row and the **GOING TO** pill row list the
places the rider uses most **first**. "Used" = the number of stored ride results whose way
belongs to a route that starts *or* ends at that place. A place never ridden from/to keeps
its current position relative to the other never-ridden places (fresh install looks exactly
as today). Nothing else on the screen changes: same pills, same selection logic, same
DETECTED-start behaviour, same copy.

## Current state (verified 2026-09-27 against the tree)

All in `app/src/ui/RecordScreen.tsx` unless stated.

- **The list being ordered.** Line 955:

  ```tsx
    const startable = CATALOG.landmarks.filter((l) => l.offerAtStart);
  ```

  No sort. `CATALOG.landmarks` order = catalog seed order + user-added places appended
  (`store/catalog.ts` `mergeCatalogs()`), i.e. creation order — exactly the "creation order
  or whatever" Nathan describes.
- **Consumers of `startable`** — exactly three occurrences besides the declaration:
  - line 1408: `{startable.map((l) => (` — the START (from) pill row;
  - line 1418: a comment (`rather than to \`startable\`. */}`) — leave it;
  - line 1426: `{startable.filter((l) => l.id !== fromId).map((l) => (` — the GOING TO
    row, which is the same list minus the chosen start.

  Both rows are plain `.map` over the array, so **ordering the array orders both rows**; no
  per-row change is needed.
- **`Landmark`** (`app/src/store/types.ts` lines 21-35): `id, label, lat, lon, radiusM,
  activeFromMs, activeUntilMs, offerAtStart`. No usage field, and none is added.
- **`Route`** (`types.ts` from line 38): `id, startLandmarkId, endLandmarkId,
  loopDiscriminator?, wayIds: string[], …`. A route is the from→to parent; its `wayIds` are
  the ways ridden along it. Loops (`startLandmarkId === endLandmarkId`) are a real category.
- **Ride results are keyed by way, not by landmark.** `app/src/store/resultsStore.ts` line 224:

  ```ts
  export function storedResultsForWay(wayId: string): RideResult[] {
  ```

  This is the codebase's only "how many rides on X" aggregate and it is computed on demand,
  no cache (used the same way by `catalogDeleteActions.ts` 39/61 and `routeFromRide.ts`
  129/351). There is **no** landmark-level counterpart; this brief adds one, built on top of
  `storedResultsForWay` rather than on any private store internals.
- Import style in the store: relative with the `.ts` extension where the existing files do it
  (`routeFromRide.ts` line 26: `from './resultsStore.ts'`). Match whatever the neighbouring
  imports in the file you edit do.
- The screen already re-renders whenever `phase` changes; the pill rows are only rendered in
  the setup phase. `CATALOG` is whatever line 955 already reads — **Step 0 finds out what it
  is** (a module const, or a per-render `activeCatalog()` call) because it decides whether a
  memo is even possible.

## Decisions (pre-resolved — do not re-open)

1. **Derivation of a place's usage count.** For a landmark `L` in catalog `c`:
   `count(L) = Σ over routes r in c.routes with (r.startLandmarkId === L.id || r.endLandmarkId === L.id)
   of Σ over w in r.wayIds of storedResultsForWay(w).length`.
   A loop route (`start === end`) therefore counts each of its rides **once** (the `||`
   matches the route once; it is not counted twice). Rides that have no way / no route
   (free rides) contribute nothing. Start-usage and end-usage are **combined** into one
   number — Nathan said "most used places", not "most started-from".
2. **Computed on demand, one pass, no cache.** A single function builds a
   `Map<landmarkId, number>` by walking `c.routes` once and calling
   `storedResultsForWay` once per way id, adding the way's count to the route's start
   landmark and (if different) its end landmark. This matches the store's existing
   on-demand convention. It runs only when the pill rows are actually rendered (setup
   phase); outside setup, `startable` is returned unsorted (the rows are not shown then).
   No `useMemo` — see Open question 1 for why not, and what to do if it ever shows up in a
   profile.
3. **Ordering.** Most-used first (descending count). **Tie-break: today's order** — a stable
   sort over the existing filtered array, so two places with equal usage (including all
   places at 0) keep their current relative order. Consequence: a fresh install / virgin
   reset shows *exactly* the pills it shows today. Alphabetical was rejected because it
   would reorder the fresh-install experience for no reason Nathan asked for.
   `Array.prototype.sort` is stable on Hermes/V8 (ES2019), so the sort itself carries the
   tie-break; still, write the comparator as `countB - countA` only, never add an
   `id`/`label` tiebreak.
4. **No pinning / no "freeze while selecting" logic.** Usage counts only change when a ride
   result is stored, which happens at ride end, never while the rider is picking START /
   GOING TO. Within one setup session the order is therefore constant, and the GOING TO row
   only ever drops the chosen start (line 1426, unchanged). There is nothing to pin.
5. **Scope = the two RECORD pill rows only.** The ROUTES tab's own places list
   (`RoutesScreen.tsx`, "YOUR PLACES") keeps its order. Nathan said "on the RECORD tab";
   the ROUTES list is a natural follow-up and is logged in Open questions, not assumed.
6. **Testable without the store.** The counting function takes an injectable
   `countForWay` so the unit test needs no results-store seeding. Default argument =
   `(wayId) => storedResultsForWay(wayId).length`.

## Files to touch

### 1. New: `app/src/store/landmarkUsage.ts`

```ts
import type { Catalog, Landmark } from './types';   // adjust the path/extension to match neighbours
import { storedResultsForWay } from './resultsStore.ts'; // same extension style as routeFromRide.ts:26

/** Rides that started OR ended at each landmark, derived on demand (no cache):
 *  ride → wayId → parent route → route.start/endLandmarkId. A loop route counts
 *  each ride once. Free rides (no way) contribute nothing.
 *  cycle15 brief 14, Nathan 2026-09-27: "most used places shown as the first options". */
export function landmarkUsageCounts(
  c: Pick<Catalog, 'routes'>,
  countForWay: (wayId: string) => number = (id) => storedResultsForWay(id).length,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of c.routes) {
    let n = 0;
    for (const w of r.wayIds) n += countForWay(w);
    if (n === 0) continue;
    counts.set(r.startLandmarkId, (counts.get(r.startLandmarkId) ?? 0) + n);
    if (r.endLandmarkId !== r.startLandmarkId) {
      counts.set(r.endLandmarkId, (counts.get(r.endLandmarkId) ?? 0) + n);
    }
  }
  return counts;
}

/** Most-used first; ties keep the input order (stable sort) so an unused
 *  catalog is returned in exactly the order it came in. Returns a new array. */
export function sortLandmarksByUsage(landmarks: Landmark[], counts: Map<string, number>): Landmark[] {
  return [...landmarks].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));
}
```

If `Catalog` is not the exported name of the type that has `.routes` / `.landmarks`
(check `types.ts` and what `activeCatalog()` in `sportStore.ts` returns), use the correct
name — a name mismatch is a Step 0 stop, not a guess.

### 2. `app/src/ui/RecordScreen.tsx`

**Step 0 (read only, then decide):** find where `CATALOG` in line 955 comes from (grep
`CATALOG` in the file's first ~120 lines and the import block lines 17-80). Report which it
is in the readout. Either way the change below is the same; this is recorded so the
coordinator knows whether a future memo keyed on `CATALOG` would be stable.

**Edit A — import.** In the import block (lines 17-80, `../store/...` imports around
line 78-80) add, in alphabetical position with the other store imports:

```tsx
import { landmarkUsageCounts, sortLandmarksByUsage } from '../store/landmarkUsage';
```

(Use the same extension style as the neighbouring `../store/` imports on lines 78-80.)

**Edit B — line 955.** Replace

```tsx
  const startable = CATALOG.landmarks.filter((l) => l.offerAtStart);
```

with

```tsx
  // cycle15 brief 14 (Nathan 2026-09-27): most-used places first, ties keep
  // catalog order. Counted on demand from stored results (no cache); only
  // worth doing while the START / GOING TO pill rows are on screen.
  const startableUnsorted = CATALOG.landmarks.filter((l) => l.offerAtStart);
  const startable = phase === 'setup'
    ? sortLandmarksByUsage(startableUnsorted, landmarkUsageCounts(CATALOG))
    : startableUnsorted;
```

`phase` is the screen's `RecordPhase` state (brief 02 quotes it; it is the same `phase`
used on line 419 `isFullscreen(phase)`). If the setup-phase literal is not `'setup'` (check
`recordFlow.ts`'s `RecordPhase` union), stop and report.

Lines 1408 and 1426 are **unchanged** — they already map over `startable`.

### 3. New test: `app/src/store/__tests__/landmarkUsage.test.ts`

Place it where the existing `resultsStore` / `catalog` tests live (find them with
`grep -rl "storedResultsForWay\|mergeCatalogs" app/src --include=*.test.ts`); if that
folder is not `__tests__`, use the folder those tests use. Pure-function tests, no store:

- `landmarkUsageCounts` with routes `A→B` (ways w1,w2), `B→C` (way w3), loop `A→A` (way w4)
  and `countForWay = {w1:3, w2:1, w3:2, w4:5}` returns `A:9, B:6, C:2` (loop counted once,
  A gets 4 from A→B plus 5 from the loop; B gets 4 + 2).
- A route whose ways all count 0 leaves its landmarks **absent** from the map.
- `sortLandmarksByUsage([L1,L2,L3], counts{L2:2, L3:2})` → `[L2, L3, L1]` (ties keep input
  order, unused last).
- `sortLandmarksByUsage(list, new Map())` returns a **new array equal to** `list`
  (same order, `not.toBe`).

## Verification

From `app/`: the typecheck and unit-test scripts as `package.json` `scripts` defines them
(read that block first; `npm run typecheck` / `npm test` or whatever the project names
them). All previously green suites stay green; the new test file is green. Then
`grep -n "startable" app/src/ui/RecordScreen.tsx` must show the declaration pair plus
exactly the two `.map` sites (1408-ish and 1426-ish) and the comment — nothing new.

## On-device checklist (Nathan, after publish)

1. Phone with ride history (Nathan's own): RECORD tab, setup. The START row lists the
   home/work-type places he actually rides from first; a rarely used errand stop is at the
   end. Pick a START: the GOING TO row is the same order minus the chosen start.
2. Pick START, then change it: the GOING TO row re-derives (only the excluded pill changes,
   nothing else moves).
3. Finish a ride between two places that were *not* the top two; go back to setup. Their
   pills have moved up (or not, if the counts still trail the leaders) — order reflects the
   new totals.
4. Reset-to-virgin (or a fresh install): the seed places appear in exactly the order they
   did before this brief.
5. Both themes: nothing visual changed except order.

## Out of scope

- **`RoutesScreen.tsx` "YOUR PLACES" ordering** — untouched (Open question 3).
- Any change to `Landmark`, the catalog schema, `mergeCatalogs`, or a stored usage counter.
- Ranking the GOING TO row *conditionally* on the chosen START (Open question 2).
- The DETECTED-start logic below line 955 and the `fromId`/`toId` selection state.
- iOS (no iOS build; nothing platform-specific here anyway).
- `STATE.md`, `OPEN-ITEMS.md`, this folder's `README.md` — the coordinator's.

## What this changes on Nathan's phone

Nothing yet — this is a parked brief. Once executed: JS-only (one screen line replaced, one
import, one new store file, one new test; no dependency, no `app.json`/`eas.json` change),
so it ships to the Preview APK over EAS Update via `scripts/publish-preview.cmd` — no new
numbered build, no reinstall. Visible on RECORD → setup only: the START and GOING TO pills
are ordered by how often each place has been ridden from or to. A phone with no rides sees
no difference.

## Open questions / assumptions (logged, not blocking)

1. **No memoisation** (decision 2). Cost per setup-phase render = one
   `storedResultsForWay` call per way id in the catalog (each a scan of the in-memory
   results). For Nathan's data (tens of ways, hundreds of results) that is a few thousand
   comparisons per render, well under a frame. Setup does re-render on GPS fixes (the
   DETECTED-start block reads `status.lastLat`), which is why this is gated to setup rather
   than left to run during a live ride. If a profile ever shows it, wrap it in `useMemo`
   keyed on `[CATALOG, phase]` — valid only if Step 0 found `CATALOG` to be a stable
   reference; otherwise key on `[phase, sportSwitchTick]`.
2. **Tie-break = existing order, not "most recently used"** (decision 3). Nathan gave
   routes a "most recent" tie-break elsewhere; for places he gave none, and existing order
   preserves the fresh-install layout. If he wants recency: `landmarkUsageCounts` would
   also need a `lastUsedMs` per landmark (max over the same rides' end times), and the
   comparator a second term. Small follow-up, not done here.
3. **ROUTES tab "YOUR PLACES"** keeps creation order. Same helper would sort it in two
   lines if Nathan wants the ordering consistent across tabs.
4. **Conditional GOING TO ranking** — ordering the GOING TO row by rides *from the chosen
   START specifically* (count only routes with `startLandmarkId === fromId`) would rank
   destinations better for a rider with several homes. Nathan asked for a single usage
   bias; a per-start variant is a one-function extension.
5. **Combined start+end count** (decision 1). If Nathan would rather rank START by
   start-usage only and GOING TO by end-usage only, split the map into two — same walk,
   two accumulators.
