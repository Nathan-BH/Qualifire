**Status: Brief written 2026-09-02, ready to execute. Not yet built. No decision needed from Nathan. Independent of WP-C, but reads much better after it (every user-created route hits this rung until WP-C lands).**
**Review doc item: 4 (folds in ride-1 item 1). Size: small-medium.**
**Verified against the mirror at commit `447c2ba`.**

---

# WP-D — Rider-only map before START, and on unmatched rides

## 1. Goal

When `RouteMapView` has no route asset to draw (nothing picked, virgin/empty catalog, or a route-mode ride that never locks), the live-surface map must still render: **real basemap tiles + the rider's blue dot centred on the last GPS fix**, instead of returning `null`. The hardcoded Leuven fallback camera centre (`[4.68, 50.85]`) must go: **no fix and no bounds → no camera target at all**, never a real-world place unrelated to the user.

## 2. Current state (verified against commit `447c2ba`)

### 2.1 `routeMapView.tsx`

- `defaultRouteId()` → first catalog route with a drawable asset; null on a virgin/empty catalog.
- MapLibre rung: `const asset = !gatesOnly && id !== null ? ASSETS[id] : undefined;`
- `routeFC` memo is already null-safe and sits above the guard (Rules of Hooks).
- **The guard**: `if (!gatesOnly && !asset) return null;` — everything below uses `asset!` non-null assertions.
- `here = props.lat !== null && props.lon !== null` — **the rider fix is already a prop; nothing new to plumb.**
- `off`, `gateTicksFC`, `sectorSpansFC`, `bounds` all dereference `asset!` — must become conditional.
- **`centre`**: `here ? fix : bounds ? bounds-centre : gatesOnly ? [4.68, 50.85] : [asset!.gates[0]…]` — the Leuven fallback, reached by gatesOnly with an empty gate set (virgin free ride, or a landmark pair with no ways).
- `cameraProps`: free mode → `{}` (known-good, Cycle 020); `fit` with bounds → bounds; else `{ center: centre, zoom, bearing, pitch: 0, duration: 500 }`. Note `fit` with null bounds **already degrades to follow** — useful.
- Rider source is already gated on `showRider && here`, independent of `asset` — reuse this mechanism, don't reinvent it.
- "waiting for GPS" badge already correct for the new case (`showRider && !here`).
- PNG rung has its own `if (!asset) return null;` — no tiles, cannot draw a basemap without a per-route PNG.

Other callers of `RouteMapView` (must not regress): `RoutesScreen.tsx`/`ResultScreen.tsx` (browse variant, `showRider={false}`), `DemoScreen.tsx` (fixed asset). Browse surfaces with no asset and no rider keep returning `null` — see §3.1's rule.

### 2.2 `RecordScreen.tsx` — three live rungs (re-verify line numbers fresh; they shift as other WPs land)

- **setup**: `routeId={pickedRoute?.refLineId ?? null} lat={status.lastLat} lon={status.lastLon} zoom={1} showRider variant="live" liveState="prestart"`.
- **armed**: same shape, `fill` instead of `height`.
- **running**: `routeId={live.mode === 'free' ? null : (live.track ?? rideRouteHint)} lat/lon={status.lastLat/lastLon} gatesOnly={live.mode === 'free'} …`.

On a virgin catalog: `pickedRoute` null, `freeRide` true → setup/armed pass `routeId=null`, not gatesOnly → guard returns null: **no map at all before START.** Running passes `gatesOnly` → basemap renders, zero gates, bounds null → Leuven centre until the first fix. **All three rungs already pass the rider fix as `lat`/`lon` — no RecordScreen prop plumbing is required for the core change.**

### 2.3 Where the pre-START fix actually comes from (correcting the review's inference)

Not the location task (which only runs after `startTracking`). The real pre-START source is `refreshPositionOnce()` — a one-shot fix triggered by pressing RECORD, which writes `lastLat/lastLon/lastFixMs`. The review's `<qf:preStart/>` observation is almost certainly this same cached fix, replayed by the OS a few seconds later into the ride file. Two consequences: (1) on a cold launch, nothing populates the fix until RECORD is pressed — see the optional Piece B below; (2) `startTracking()` nulls `lastLat/lastLon` at START, so the running rung briefly (~1s) has no fix — see optional Piece A.

### 2.4 What "no camera target" means in MapLibre

`<M.Camera />` with nothing set shows MapLibre's default (world at zoom 0) unless the style JSON sets its own default — an explicit "we don't know where you are" view, with the existing "waiting for GPS" badge over it, lasting only until the first fix. This is the literal, smallest-change reading of the review's instruction.

## 3. Proposed changes

### 3.1 `routeMapView.tsx` — MapLibre rung

**a)** Replace the guard: a live surface (rider-only) still renders with an asset-less route; a browse surface (no rider) with no asset still returns null.
```ts
const riderOnly = !gatesOnly && !asset;
if (riderOnly && !showRider) return null;
```
**b)** Make every `asset!` conditional:
```ts
const off = !gatesOnly && here && asset ? offRouteM(asset, props.lat as number, props.lon as number) > OFF_ROUTE_M : false;
const gateTicksFC = !gatesOnly && asset ? gateTicksFeatureCollection(asset, props.gateColours) : null;
const sectorSpansFC = !gatesOnly && asset && props.sectorColours ? sectorSpansFeatureCollection(asset, props.sectorColours) : null;
const bounds = gatesOnly ? allGatesBounds(ASSETS, props.gateRouteIds) : asset ? routeBounds(asset) : null;
```
**c)** Replace `centre`/`cameraProps` with a pure helper (§3.2):
```ts
const cameraProps: Partial<CameraStop> = cameraTargetFor({
  mode, here: here ? { lat: props.lat as number, lon: props.lon as number } : null,
  bounds, zoom: camZoom, bearing: effectiveBearing,
});
```
Rule: free → `{}`; fit+bounds → bounds tuple; else here → follow on the fix; else bounds → follow on the bounds midpoint; **else → `{}`** (replaces the Leuven literal and the now-unreachable `asset!.gates[0]` arm).
**d)** The gates/gate-ticks source ternary becomes three-way: `gatesOnly ? <gates> : gateTicksFC ? <gate-ticks> : null` — keys unchanged, cycle-025 frozen-id rule untouched.
**e)** Update the file header with one paragraph on the new rider-only personality.

### 3.2 `routeMapGeo.ts` — new pure helper

```ts
export interface CameraTarget {
  center?: [number, number]; zoom?: number; bounds?: [number, number, number, number];
  bearing?: number; pitch?: number; duration?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
}
export function cameraTargetFor(input: {
  mode: 'follow' | 'fit' | 'free';
  here: { lat: number; lon: number } | null;
  bounds: LonLatBoundsBox | null;
  zoom: number; bearing: number;
}): CameraTarget
```
No MapLibre import — keep this file's headless-testable discipline; cast to `Partial<CameraStop>` at the single call site if `tsc` complains.

### 3.3 PNG rung (small, for completeness)

Mirror the gatesOnly degraded frame instead of `return null` when `showRider`; browse still returns null. No `Credit` (no image drawn).

### 3.4 `RecordScreen.tsx` — comments only

No prop changes needed on any of the three rungs (they already pass what the new rung needs) — just rewrite the stale comments describing the old "no map" behaviour.

### 3.5 Recommended companion pieces (small, separable — do unless something surprising turns up)

- **Piece A** — stop nulling `lastLat/lastLon` at `startTracking()` (keep nulling `lastFixMs`, which drives "waiting for first fix" for *this* ride). Effect: the running rung mounts already centred instead of a ~1s untargeted view.
- **Piece B** — a non-prompting `refreshPositionIfPermitted()` (checks permission first, never prompts) called once on RecordScreen mount, so a returning user sees the dot on the setup map without pressing RECORD first. `[UNTESTED ON DEVICE]` like the existing `refreshPositionOnce`.

### 3.6 Explicitly NOT in this WP

Retiring `defaultRouteId()`'s "first catalog route as candidate" fallback (see open question 1). Item 3/WP-C itself.

## 4. Test plan

Headless, add to `routemapgeo_suite.ts` (or a new file if that suite is dirty from concurrent work): `cameraTargetFor` — free always `{}`; fit+bounds returns the tuple with bearing 0/padding 20; fit+null-bounds falls through to follow; follow centres on the fix as `[lon, lat]`; follow-with-no-fix-but-bounds centres on the midpoint; **no-fix-no-bounds → `{}`, and assert the module source contains no `4.68`/`50.85` literal** (cheap insurance against the fallback creeping back).

The three-way source ternary, the riderOnly guard, and the PNG frame are JSX and not headlessly testable — on-device visual check required (setup cold launch, armed, START→running camera behaviour, free ride on a virgin catalog, mid-ride lock frozen-id check, Routes/Result regression, day/night flip).

## 5. Verification

```
cd app
git status --short
node --experimental-strip-types tests/run.ts
grep -n "4\.68\|50\.85" src/ui/routeMapView.tsx   # expect no output
grep -n "asset!" src/ui/routeMapView.tsx           # expect no output in the MapLibre rung
./node_modules/.bin/tsc --noEmit
```

## 6. Files touched

`src/ui/routeMapView.tsx`, `src/ui/routeMapGeo.ts`, `tests/routemapgeo_suite.ts` (or new file), `src/ui/RecordScreen.tsx` (comments + optional Piece A/B), `src/location/index.ts` (only if Piece A/B taken — re-check it's not mid-edit by another WP first).

## 7. Open questions (none blocking)

1. Should `defaultRouteId()`'s "first catalog route as stand-in" retire now that rider-only exists? Recommendation: leave for this WP, revisit alongside WP-C.
2. World-view vs. no-map while there's no fix/bounds — if odd on device, one branch change swaps it; Pieces A/B make the window short.
3. Whether the OpenFreeMap style JSON sets its own default center/zoom — unverifiable without a device; affects only the brief untargeted window's look.
