**Status: DONE. Landed on the device (`app/src/ui/trailModel.ts` new, `app/src/ui/routeMapView.tsx`,
`app/src/ui/RecordScreen.tsx`, `app/tests/trail_suite.ts` new, `app/tests/run.ts`) on 2026-09-02.
Test suite: 326 tests, 323 pass, 0 fail, 3 skip (312/309/0/3 post-WP-D baseline + 14 new
`trailModel` tests). Steps 1, 2 and 4 built as written (5 m/4000-point FIFO trail model,
always-mounted trail source/layers behind the rider dot, RecordScreen accumulate/reset/pass,
plus the recommended relaunch-recovery hydration). **Step 3 was a no-op**, per
`WP-P-live-map-user-routes-homework.md` §3.2 point 1: WP-D (landed earlier the same day) had
already replaced the `!asset` guard with the `riderOnly` guard, made every `asset!` conditional,
and turned the gates/gate-ticks source into the three-way ternary Step 3 asked for — verified
directly against the current `routeMapView.tsx` (not against this brief's own pre-WP-D "current
state" section) before touching it; no second implementation of that guard was written. `tsc
--noEmit` against the real tsconfig: only the same known pre-existing environment failure WP-D
hit (tsconfig extends `expo/tsconfig.base`, unresolvable without `node_modules` — no module
resolution, no `--jsx`); no new errors reference `trailModel`/`TrailPoint`/`trail` on any
touched file. `trailModel.ts` additionally verified clean under a standalone strict tsconfig (no
expo dependency), same approach WP-D used for `cameraTargetFor`. On-device visual checks (§4's
second paragraph — trail growing behind the dot, no gap to the rider, standing-still/jank
behaviour, day/night remount, kill/relaunch hydration on a real device) NOT run — no device shell
this session; see CONTEXT.md's environment notes.**
**Review doc item: 10. Size: small-medium.**
**Verified against the device tree as staged 2026-09-02; `routeMapView.tsx`/`RecordScreen.tsx`
mtime 2026-09-02 (post-WP-D).**
**Fresh-context inspection (2026-09-02, same day) found one real minor defect and fixed it:**
`RecordScreen.tsx`'s trail-accumulate effect bailed on a stale pre-START fix only when
`lastFixMs !== null && lastFixMs < startedAtMs` — but WP-D's Piece A nulls `lastFixMs` (while
keeping the stale `lastLat`/`lastLon`) at `startTracking()`, so the `null` case slipped through
the guard instead of being caught by it, letting one stale armed-screen position become trail
point 0 on some starts. Fixed to `lastFixMs === null || lastFixMs < startedAtMs` (coordinator,
directly — a one-line chore, no re-dispatch). Not headlessly testable; folded into the
on-device visual checklist above. Everything else the inspector checked (5 m/4000-point FIFO
correctness, reset-on-discard/restart, relaunch-recovery replay, layer z-order, trail passed
only to the running map, the Step-3-no-op claim) held up under independent re-verification.

---

# WP-J — Breadcrumb trail behind the rider

## 1. Goal

While recording, draw the rider's own ridden line — a solid `colors.neutral` polyline with the same near-black casing and round caps/joins as the route reference line — from the recorded GPS fixes, ending at the rider dot. Must appear on free rides (today: dot only, no trail) and route rides (visible wherever the rider leaves the drawn route). Rendering only — no data-model/storage change; the raw JSONL stays the only record (D-023).

## 2. Current state (verified)

### 2.1 `routeMapView.tsx`

- `CASING = '#14120C'`. Route line: `GeoJSONSource key="route" id="route"` → `route-casing` (CASING, width 7) + `route-core` (`colors.neutral`, width 4), both `line-join`/`line-cap: round` — **this is the style the trail must match.**
- Cycle-025 frozen-id rule: every source `key === id`, never swap ids at one React position.
- Rider source `key="rider"`, mounted only when `showRider && here`.
- **Never use `line-dasharray`** (device-only blob bug, already reverted once).
- PNG rung: `if (!asset) return null`.

### 2.2 `RecordScreen.tsx`

- No fix-history buffer exists anywhere reachable (`TrackerStatus` only has `lastLat/lastLon/lastFixMs`; the engine's own `latBuf/lonBuf` are private and off-limits — other WPs are editing `engine.ts`). **RecordScreen must accumulate its own buffer.**
- Emit is per GPS batch, not per fix — fine at 1Hz foreground; only loses trail vertices while the screen is off.
- `readRideFixes(rideId)` already exists (used at END) — reusable for recovery hydration.
- `onStart` resets `lastMovedRef`/`lastFixRef`; `onDiscard` folds back to setup.
- Running map: `routeId={live.mode === 'free' ? null : (live.track ?? rideRouteHint)} gatesOnly={live.mode === 'free'} lat/lon={status.lastLat/lastLon} …`.

### 2.3 Decimation precedents

Manifest paths are pre-decimated to 125–220 vertices (12–57m spacing). `core/src/geo.ts`'s `resample`/`cumdist` are for reference lines (arc-length on planar XY) — overkill for an incremental live trail; a simple min-distance-between-kept-points rule is the right shape here.

## 3. Proposed changes

### Step 1 — new pure module `src/ui/trailModel.ts`

```ts
import { metresBetween, type GeoFeature, type GeoPosition, type LineStringGeometry } from './routeMapGeo.ts';

export interface TrailPoint { lat: number; lon: number }

export const TRAIL_MIN_STEP_M = 5;       // [ASSUMPTION — tune on device]
export const TRAIL_MAX_POINTS = 4000;    // ~20km at the minimum step; oldest dropped first

/** Returns the SAME array reference when the fix is rejected (no useMemo churn). */
export function appendTrailPoint(
  trail: readonly TrailPoint[], lat: number, lon: number,
  minStepM = TRAIL_MIN_STEP_M, maxPoints = TRAIL_MAX_POINTS,
): readonly TrailPoint[];

/** LineString [lon,lat] over `trail`, with `tail` (the live fix) appended as
 * the final vertex when it differs from the last kept point. Null when
 * fewer than 2 vertices result. */
export function trailLineFeature(
  trail: readonly TrailPoint[], tail?: TrailPoint | null,
): GeoFeature<LineStringGeometry> | null;
```
`appendTrailPoint`: first point always accepted; otherwise accept iff `metresBetween(last, new) >= minStepM`; at the cap, drop the oldest before pushing. Non-finite input → return unchanged.

### Step 2 — `routeMapView.tsx`: new `trail` prop + source/layers

New prop `trail?: readonly { lat: number; lon: number }[]`. New memo right after `routeFC` (same Rules-of-Hooks reason), computed unconditionally (always mounted, possibly-empty FeatureCollection — this matters, see below):
```ts
const trailFC = useMemo(() => {
  const tail = props.lat !== null && props.lon !== null ? { lat: props.lat, lon: props.lon } : null;
  const f = props.trail && props.trail.length > 0 ? trailLineFeature(props.trail, tail) : null;
  return { type: 'FeatureCollection' as const, features: f ? [f] : [] };
}, [props.trail, props.lat, props.lon]);
```
Render between the sector-spans block and the gates/gate-ticks block:
```tsx
<M.GeoJSONSource key="trail" id="trail" data={trailFC}>
  <M.Layer id="trail-casing" type="line" paint={{ 'line-color': CASING, 'line-width': 7 }} layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
  <M.Layer id="trail-core" type="line" paint={{ 'line-color': colors.neutral, 'line-width': 4 }} layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
</M.GeoJSONSource>
```
**Why always-mounted, not conditional:** maplibre-react-native adds layers in *mount* order, not JSX order. A conditionally-mounted trail would mount AFTER the rider source and paint over the dot. An always-mounted, possibly-empty source mounts at map-mount time, in JSX order, avoiding the z-stacking bug.

### Step 3 — render the map when the route has no drawable asset (recommended, ~8 one-line edits)

This is what makes the trail "the natural live-map fallback on user-created routes" until WP-C lands. Drop the `return null` guard for a non-null `routeId` with no manifest asset; make `off`/`gateTicksFC`/`sectorSpansFC`/`bounds`/`centre` conditional the same way WP-D does it (these two WPs overlap here — if WP-D lands first, this step is mostly already done; coordinate/diff carefully rather than doing both blindly). Gates JSX becomes a three-way `gatesOnly ? <gates> : asset ? <gate-ticks> : null`.

If the executor wants WP-J to stay strictly additive, Step 3 can be split off entirely — but without it the user-route case stays blank until WP-C or WP-D lands.

### Step 4 — `RecordScreen.tsx`: accumulate and pass the trail

1. `const [trail, setTrail] = useState<readonly TrailPoint[]>([]);`
2. Accumulate in an effect on `[status.lastLat, status.lastLon, status.lastFixMs, session]`: bail if no session, no fix, or the fix predates `session.startedAtMs` (stale cached fix, same rule `fixFlags.ts` uses for `preStart`); else `setTrail((prev) => appendTrailPoint(prev, lat, lon));`.
3. Reset `setTrail([])` in `onStart`, in `onDiscard`'s fold-back, and before `setPhase('ending')` in `onEnd`.
4. Recovery hydration (recommended): on relaunch recovery, `readRideFixes` the ride's own file, replay through `appendTrailPoint` skipping `preStart`/`warmup`-flagged fixes, seed `trail` with it (guarding against a race with fixes that landed during the read).
5. Pass `trail={trail}` to the **running** map only — not armed, not setup.

## 4. Test plan

New `tests/trail_suite.ts` (register in `tests/run.ts`): first point always accepted; a point <5m away returns the same array reference; ≥5m appends; non-finite input ignored; FIFO cap drops the oldest, preserves order; `trailLineFeature` null for empty/single-point-no-tail, correct `[lon,lat]` swap, tail not duplicated if equal to the last point, tail-null draws over `trail` alone.

Rendering itself (the source/layer JSX, z-order, Step 3's rendering) is not headlessly testable — on-device visual check required: trail grows behind the dot on a free ride with no gap to the dot; standing still adds no blob; detour on a route ride shows the detour while OFF ROUTE still behaves; user-created route now shows basemap+dot+trail instead of blank; zoom 11-18 stays crisp; day/night remount preserves the trail (it's RecordScreen state, not map state); kill/relaunch mid-ride hydrates and keeps growing; new ride starts with an empty trail; watch for jank after ~20 minutes (tune constants if so).

## 5. Verification

```
cd app && node --experimental-strip-types tests/run.ts   # expect baseline + new tests, 0 fail
./node_modules/.bin/tsc --noEmit
```

## 6. Files touched

`src/ui/trailModel.ts` (new), `src/ui/routeMapView.tsx`, `src/ui/RecordScreen.tsx`, `tests/trail_suite.ts` (new) + `tests/run.ts`. Not touched: `src/live/engine.ts`, `src/location/index.ts`, `routeMapGeo.ts` (only imported), storage, PNG rung.

## 7. Open questions (defaults chosen; none block execution)

1. Trail vs. route emphasis when on-route (identical styling = invisible against the route, which is honest — the detour case is what matters). If Nathan wants "ridden" to read bolder, bump `trail-core` width to 5-6 after seeing it on device.
2. Decimation: 5m + 4000-point FIFO chosen over no cap (every accepted fix re-ships the whole line across the bridge otherwise).
3. Warm-up fixes can't be filtered the same way as the pre-START rule (`TrackerStatus` has no accuracy field) — a few coarse points at the door are visually minor; exposing accuracy on `TrackerStatus` would be a 3-line change in `location/index.ts` but that file is being touched by other WPs this cycle.
4. Result "VIEW TRACE" could reuse this same trail concept from the stored JSONL — out of scope, noted for whoever does the drawable-user-routes follow-on work.
