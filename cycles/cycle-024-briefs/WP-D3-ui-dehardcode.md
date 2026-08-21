# WP-D3 — De-hardcode route identity in the UI (B-39 remainder)

**Executor model: Sonnet. You see ONLY this brief. STOP AND ESCALATE on anything it does not pre-resolve. Requires WP-D1 + WP-D2 landed (catalog has 20 routes with refs; engine is catalog-driven).**

## Goal, in Nathan's words

No screen may silently assume his original three commute tracks exist — "Morning" as a baked-in fallback is false now that he has 20 routes, and it blocks every user-created way. After this brief, route identity everywhere flows from the catalog and the ride history, never from a literal string.

## Environment & rules (binding)

- Repo on Nathan's PC `C:\Users\natha\Claude personal projects\Qualifire\` = `$HOME/mnt/Qualifire/`. Cloud sandbox has NO npm/PyPI. No git. No repo writes until the coordinator green-lights (cycle 023 + WP-D1/D2 landed).
- Tests pure: `cd app && node --experimental-strip-types tests/run.ts` (sandbox + PC); `npx.cmd tsc --noEmit` via device_bash on the PC. Re-baseline before editing.
- UI screens are not headless-testable; everything testable here lives in pure helpers — put the new fallback logic in a pure module so it CAN be tested.

## Current state (verified in code 2026-08-20)

The remaining hardcodes after WP-D2 (which already fixed `refs.ts` TRACK_IDS, engine candidates, and `lastRide.ts`'s `gateSetVersion: 1`):

1. `app/src/ui/ResultScreen.tsx` line 23: `const FALLBACK_ROUTE = 'Morning'; // only used when no ride has finished yet` — line 46 `const ROUTE = ride?.routeId ?? FALLBACK_ROUTE;`. With no finished ride the board shows the most recent **Morning** ghost regardless of what Nathan actually rides.
2. `app/src/ui/routeMapView.tsx` lines 191 and 423: `const id = props.routeId ?? 'Morning';` (both map rungs). Also lines 71–75: `IMAGES` maps only Morning/EveningA/EveningB PNG requires — this one STAYS (Metro `require` must be static; imageless routes already fall through to the drawn-line rung via `!img`).
3. `app/src/store/results.seed.json` is already data (28 archive results for the three original tracks) and `ghostsFor()` (app/src/ui/colourModel.ts line 42) already returns `[]` for unseeded routes — nothing to change there; the "empty-seed install path" is proven by a test instead (below).
4. `app/src/ui/DemoScreen.tsx` line 24 `const ROUTE = 'Morning';` — the Demo tab is a scripted replay of an archived Morning lap by design; NOT a hardcode bug. Leave it (add a one-line comment saying so).

## Changes

### 1. NEW pure module `app/src/store/defaultRoute.ts`

```ts
/** Data-driven fallbacks that replace the last literal route ids (B-39).
 * Pure — headless-testable. */
import type { Catalog, RideResult } from './types.ts';

/** The route of the most recent ranking result (seed or session); catalog
 * order breaks ties; null only when the catalog is empty. */
export function fallbackRouteId(c: Catalog, results: RideResult[]): string | null;
```
Implementation: filter results to `routeId !== null` with a real `lap.movingS ?? lap.rawS`, take max `startedAtMs`, return its routeId if it exists in `c.routes`; else `c.routes[0]?.id ?? null`.

### 2. `ResultScreen.tsx`

- Delete `FALLBACK_ROUTE`. Compute inside the component: `const ROUTE = ride?.routeId ?? fallbackRouteId(CATALOG, [...GHOSTS-equivalent…])` — concretely: import the catalog seed (as RecordScreen does, line 40–42) and call `fallbackRouteId(CATALOG, [...(seed as RideResult[]), ...recordedResults()])`. If null (empty catalog — cannot happen today), render the existing "No ride history for this route yet." empty state.
- The explanatory footer (line 186–188) already names `${ROUTE}` — verify it reads sensibly for any route id (`routeLabel`-style spacing is NOT applied here today; apply the same `routeLabel()` helper — move `routeLabel` out of RecordScreen into `app/src/store/defaultRoute.ts` (export it) so both screens share one copy; RecordScreen imports it from there).

### 3. `routeMapView.tsx`

- Replace both `props.routeId ?? 'Morning'` with `props.routeId ?? DEFAULT_ROUTE_ID` where `const DEFAULT_ROUTE_ID = Object.keys(ASSETS)[0] ?? null;` computed once at module scope from the manifest (line 70); if `id` is null or `!asset`, both rungs already `return null` — keep that.
- Do not touch anything else in this file (HIGH 023 conflict surface — see below).

### 4. Tests (`app/tests/store_suite.ts` or a small new `defaultroute` block in it; +3)

1. `fallbackRouteId: most recent ranking result wins` — synthetic catalog of 2 routes + results with differing startedAtMs.
2. `fallbackRouteId: empty results → first catalog route; empty catalog → null` (the empty-seed install path, B-39's acceptance).
3. `fallbackRouteId on the real seed = the newest seeded archive ride's route` — load `results.seed.json` + `catalog.seed.json`, assert the returned id equals the max-startedAtMs entry's routeId (compute both sides in the test — no literal route string in the assertion).

Expected: +3 tests, 0 FAIL, no new skips. No existing test changes.

## Verification

1. `cd app && node --experimental-strip-types tests/run.ts` — zero FAIL, baseline+3.
2. device_bash on PC: same + `npx.cmd tsc --noEmit` clean.
3. Grep gate: `grep -rn "'Morning'" app/src/` must return ONLY `DemoScreen.tsx` (scripted demo, commented) and `IMAGES`/preview-data occurrences (`app/src/ui/preview/` is the frozen demo dataset — out of scope). Report the grep output in your handover.

## Files touched

- `app/src/store/defaultRoute.ts` (NEW)
- `app/src/ui/ResultScreen.tsx`
- `app/src/ui/RecordScreen.tsx` (only the `routeLabel` import swap)
- `app/src/ui/routeMapView.tsx` (two fallback lines)
- `app/src/ui/DemoScreen.tsx` (one comment line)
- `app/tests/store_suite.ts` (+3)

## Conflicts with cycle 023

**HIGH on `routeMapView.tsx`** (023's day-mode rendering fix lives there) and **MEDIUM on `RecordScreen.tsx`** (023 auto-pause work). Coordinator must hand you the post-023 files; make the minimal edits stated and nothing more.

## Pre-resolved ambiguities

- Fallback semantics = "route of the most recent ranking result", not "first catalog route" (matches what the board's stand-in ghost text promises: the most recent ride's context). Catalog order only as the empty-history tiebreak.
- `IMAGES` static requires stay (Metro constraint); imageless routes use the drawn-line rung — existing, correct behaviour.
- `preview/` and `DemoScreen` literals are frozen demo datasets, not product hardcodes — exempt, documented in-line.

## NEEDS-NATHAN

None.

## Rollback

Pure display-layer edits; revert the five files and the literal fallbacks return. No data or schema changes.
