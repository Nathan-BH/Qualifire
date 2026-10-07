# Digest: ROUTES Tab, "YOUR PLACES", and Related Data Model

## 1. ROUTES Tab Structure and "YOUR PLACES" Section

**File:** `app/src/ui/RoutesScreen.tsx` (lines 1–152)

The ROUTES tab component renders two sections:

- **Sport Badge:** `Text` displaying sport name or "NO SPORT YET · ADD ONE IN SETTINGS" (line 43–46)
- **"YOUR PLACES" Section:** `Text` heading at line 51; renders `View` card (line 52) containing:
  - Mapped landmarks from `CATALOG.landmarks` (lines 53–75)
  - Each landmark renders a `Pressable` row (line 54) with:
    - Label, dormancy status ("dormant"), "not used" flag (line 61–64)
    - Coordinates: `lat.toFixed(5), lon.toFixed(5)` and radius in metres (line 65–67)
    - onPress: `tabNav.openCatalog({ kind: 'place', id: l.id })` (line 56)
  - Empty state: "No places yet." (line 76–78)
  
- **"ROUTES" Section:** `Text` heading at line 81; empty state "No routes yet." (line 82–84)
  - Maps routes from `CATALOG.routes` (lines 85–104)
  - Each route card shows: `from?.label → to?.label` and way count (lines 95–98)
  - onPress: `tabNav.openCatalog({ kind: 'route', id: w.id })` (line 88)

**Styling:** Card uses theme colors `t.card`, `t.cardBorder`, row flex layout; heading is 12px, all-caps, letter-spaced (lines 127–131).

---

## 2. Data Model of a "Place"

**File:** `app/src/store/types.ts` (lines 21–32)

Landmarks are places; interface `Landmark`:

```typescript
interface Landmark {
  id: string;                    // unique identifier
  label: string;                 // display name (e.g., "Home", "Work")
  lat: number;                   // latitude
  lon: number;                   // longitude
  radiusM: number;               // p90 endpoint spread + 30 m, capped at half gap to nearest (range 120–256 m)
  activeFromMs: number;          // availability window start (ms since epoch)
  activeUntilMs: number | null;  // availability window end; null = no end date
  offerAtStart: boolean;         // false ⇒ archive/dormant; never offered at RECORD START
}
```

**Presence determination:** `landmarkActiveAt(l: Landmark, atMs: number)` at `app/src/store/catalog.ts` line 130 checks `activeFromMs ≤ atMs` and `(activeUntilMs === null || activeUntilMs ≥ atMs)`.

**Usage query:** `landmarkUsageCounts()` at `app/src/store/landmarkUsage.ts` line 7 counts rides per landmark (sum of ride counts across all ways with that landmark as start or end).

---

## 3. Relationship Between Places and Routes/Ways

**Routes and Ways:**
- **Route:** `app/src/store/types.ts` lines 34–48. Connects two landmarks (parent).
  ```typescript
  interface Route {
    id: string;
    startLandmarkId: string;   // references Landmark.id
    endLandmarkId: string;     // references Landmark.id
    loopDiscriminator?: string;  // required iff start === end
    wayIds: string[];          // child ways on this route
    sportId?: string;          // WP-1: sport filter (optional, fallback to first sport)
  }
  ```

- **Way:** `app/src/store/types.ts` lines 50–79. Variant of riding a route (child).
  ```typescript
  interface Way {
    id: string;
    routeId: string;           // parent route
    refLineId: string;
    gateSetVersion: number;
    seeded: boolean;
    referenceRideId?: string;
    specs?: string[];          // free-text ordered segments after From/To
  }
  ```

**Enumeration of routes by place:**
- **Routes FROM a place:** `routesFrom(c: Catalog, landmarkId: string, atMs: number): Route[]` at `app/src/store/catalog.ts` line 160. Filters routes where `startLandmarkId === landmarkId && endLandmarkId is offerable`.
- **Routes TO a place:** **Function does not exist.** Current code supports only starting routes (one-way query). Code at `catalogDetailModel.ts` lines 26–27 shows `TouchingRouteModel` interface with direction field ('from' | 'to' | 'loop'), suggesting the model layer EXPECTS bidirectional querying, but the store function is unimplemented. Route-to-landmark lookup requires manual iteration: `routes.filter(r => r.endLandmarkId === landmarkId)`.

**Detail screen:**
- `CatalogDetailScreen.tsx` (line 1) opens for `kind: 'place'` or `kind: 'route'` via `tabNav.openCatalog()` (`tabNav.tsx` line 51, 77).
- Place detail model: `placeDetailFor(id: string, deps: CatalogDetailDeps)` in `catalogDetailModel.ts` (no line visible in head, but referenced line 74). Builds `PlaceDetailModel` (lines 28–38) with fields:
  - `routes: TouchingRouteModel[]` — routes starting from OR ending at this place (direction tracked)
  - `touchingWayIds: string[]` — ways on those routes
  - Supports merge/rename/delete actions

---

## 4. Existing Map Components

**Library:** MapLibre (native React Native binding).

**Files and functions:**

- **`app/src/ui/wayMapView.tsx`** (line 1): Main map component. Props include:
  - Dual personality: live ribbon (race mode, course-up bearing, locked) vs. browse mode (pan/zoom/rotate, bearing 0)
  - `variant`, `liveState`, `showRider` props control rendering (lines 23–51 of preamble)
  - Imports `placeFeatureCollection`, `placeBounds` from `wayMapGeo.ts` (line 79)

- **`app/src/ui/wayMapGeo.ts`** (lines 141–168):
  - `placeFeatureCollection(lat, lon, radiusM, steps=64): GeoFeatureCollection<PolygonGeometry | PointGeometry, PlaceProperties>` — builds a GeoJSON circle polygon around place coordinates (lines 141–160)
  - `placeBounds(lat, lon, radiusM, pad=1.6): LonLatBoundsBox` — calculates bounding box for a place (lines 164–168)

- **`app/src/ui/wayMapStyle.ts`**: Bundled offline map style (fallback when tiles unavailable).

- **Tile source:** OpenFreeMap (live on every screen per STATE.md).

- **Route drawing:** `wayLineFeature()`, `gateTicksFeatureCollection()`, `sectorSpansFeatureCollection()` in `wayMapGeo.ts` (imported line 80–82 of wayMapView.tsx).

- **Self-racing (live map):** `selfsFeatureCollection()` from `selfRaceModel.ts`; drawn as dots overlaid on live map (`WayMapView` `selfs` prop, `selfDots` toggle).

- **Trail drawing (ridden path):** `trailLineFeature()` from `trailModel.ts`; behind rider dot (WP-J, `trail` prop in wayMapView).

- **Rider position:** `riderFeature()` in wayMapGeo.ts; real position projected from lat/lon (honesty clause D-025: never chainage-based).

---

## 5. Typical Scale

**Seed data** (`app/src/store/catalog.seed.json`, 595 lines):
- **6 landmarks** (Leuven area, named: Home, Work, Park, etc.)
- **13 routes** (from/to pairs)
- **20 ways** (variants across routes)

**Virgin/empty seed:** 0 landmarks, 0 routes, 0 ways (EXPO_PUBLIC_SEED_MODE=empty, default since 2026-09-08).

---

## 6. Rider-Facing Strings and Allow-List Rules

**File:** `app/tests/ui-strings.allow.json`

**Strings from ROUTES tab and related** (from grep):

| String | File | Purpose |
|--------|------|---------|
| `YOUR PLACES` | RoutesScreen.tsx | Section heading |
| `ROUTES` | RoutesScreen.tsx | Section heading |
| `No places yet.` | RoutesScreen.tsx | Empty state |
| `No routes yet.` | RoutesScreen.tsx | Empty state |
| `ROUTES FROM HERE` | RoutesScreen.tsx (implied) | Detail screen heading (place: outbound routes) |
| `ROUTES TO HERE` | RoutesScreen.tsx (implied) | Detail screen heading (place: inbound routes) |
| `BACK TO ROUTES` | RoutesScreen.tsx (implied) | Close detail screen |
| `{…} {…} no longer used by any route and will be removed as places.` | CatalogDetailScreen.tsx | Delete confirmation |
| `Scored as {…}, but no route of yours runs between these two places. Name them to make this way of its own.` | RecordScreen.tsx (retroactive naming) | Orphan-way hint |
| `No places, routes or reference lines on this phone yet.` | (settings/demo?) | Virgin state hint |

**Allow-list rules** (`ui-strings.allow.json` preamble):
- Max **40 characters** (unless `long: true`)
- Alert body: **≤20 words**
- No em dash (use ' · ' instead)
- Warnings flash in yellow button's sub-label, never a banner
- Agents may append entries ONLY with a one-line justification; file is owned by Nathan

---

## 7. Existing Tests

- **`app/tests/catalogdetail_suite.ts`:** Tests `placeDetailFor()`, `routeDetailFor()`, `fmtLengthM()` pure functions; includes fixtures for landmarks with usage states (fixture landmarks lmA–lmSeed, line 22–25). Assertions cover detail model output.

- **`app/tests/catalogstore_suite.ts`:** Tests `initCatalogStore()`, `saveUserCatalog()`, merging seed + user catalog (persistence layer).

- **`app/tests/catalogmerge_suite.ts`:** Tests landmark merging, route/way cascade on landmark delete.

- **`app/tests/catalogdelete_suite.ts`:** Tests delete logic: orphan detection, cascade deletion.

- **`app/tests/routecreation_suite.ts`:** Tests retroactive route creation on RECORD save (landmark creation, route/way birth).

- **`app/tests/placesearch_suite.ts`:** Tests place search/proximity queries.

**Counts:** virgin-cycle22 landed 2026-10-06: **866 tests, 863 pass, 0 fail, 3 skip** (`app/tests/run.ts`).

---

## UNCLEAR / NOT FOUND

1. **routesTo() function:** Code references bidirectional route queries (PlaceDetailModel.routes with direction), but only `routesFrom()` exists in `catalog.ts`. Inverse lookup requires manual filter.

2. **PlaceDetailModel full construction:** Head of `catalogDetailModel.ts` shows interface but not `placeDetailFor()` implementation; assume it enumerates both directions via inline logic.

3. **Routes tab reusable widget:** No extracted `PlaceCard` or `RouteCard` component; rendering inline in RoutesScreen.tsx. Whether a new map-based design should refactor is architectural, not factual.

4. **Map surface integration:** wayMapView.tsx imports placeFeatureCollection but current code does not draw place circles. Feature exists (geo math) but not rendered in production (virgin-cycle22 changelist silent on places layer).

