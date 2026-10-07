# MapLibre on Activity Cards & SPORT Handling — Digest

**Date:** 2026-10-06  
**Scope:** Feasibility of rendering live MapLibre maps on every card of a long scrolling activities feed (~140-200dp each, non-interactive, tap→detail)

---

## 1. WayMapView Component Specification

**File:** `app/src/ui/wayMapView.tsx` (1038 lines)

### Component Signature & Export
- **Export:** Default export function `WayMapView(props: WayMapProps)` (line 291)
- **Native wrapper:** Conditionally returns inner component `<MapLibreWayMap>` or fallback "map unavailable" badge if native module not loaded (lines 287–290)
- **Fallback height:** `props.height ?? 190` (line 288)

### WayMapProps Type (all props with types)
**Lines 205–275:**

| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `wayId` | `string \| null` | **required** | Route/way to draw; null = rider-only (no route line) |
| `asset?` | `WayAsset` | undefined | Caller-owned drawable (bypasses id→asset lookup); DemoScreen-only |
| `lat` | `number \| null` | **required** | Current/replay rider latitude |
| `lon` | `number \| null` | **required** | Current/replay rider longitude |
| `zoom?` | `number` | 4 (whole route) | Zoom level; 1=whole route, 4=tight live crop |
| `height?` | `number` | 190 | Fixed container height (dp) |
| `fill?` | `boolean` | false | Fill parent (race mode); takes precedence over `height` |
| `gateColours?` | `(string \| null)[]` | undefined | Colour per crossed gate (index 0=START); gates ahead stay dark |
| `sectorColours?` | `(string \| null)[]` | undefined | Gate-indexed sector verdict colours; index i colours sector ending at gate i |
| `leadColour?` | `string` | undefined | Colour for untimed lead-in/lead-out stretches; only honoured with `sectorColours` |
| `variant?` | `'live' \| 'browse'` | 'live' | Map personality: locked ribbon vs free pan/zoom |
| `liveState?` | `'prestart' \| 'moving' \| 'stopped' \| 'finished'` | 'moving' | Only meaningful for variant='live'; affects lock/dim state |
| `showRider?` | `boolean` | true | Show rider dot/source and waiting-for-GPS badge |
| `place?` | `{ lat: number; lon: number; radiusM: number } \| null` | null | Place surface (landmark detail): draws arrival radius disc; MapLibre-only |
| `trail?` | `readonly TrailPoint[]` | undefined | Rider's own ridden line (decimated GPS fixes); MapLibre-only |
| `rideTrace?` | `readonly TrailPoint[]` | undefined | Ride's recorded fixes (replay drift); MapLibre-only |
| `selfs?` | `readonly SelfDot[]` | undefined | Past rides replayed as dots; MapLibre-only |
| `gateSelect?` | `{ selected: number \| null; onPress: (gateIndex: number) => void }` | undefined | Gate selection on browse map (gate-adjust card); MapLibre-only |

### Native MapLibre Component
- **Package:** `@maplibre/maplibre-react-native`
- **Version:** `^11.3.6` (`app/package.json` line 12)
- **Native component wrapper:** `ML.Map` (where `ML = require('@maplibre/maplibre-react-native')` with try/catch, lines 130–139)
- **Key binding:** `mapStyleKey` (changes force remount on theme/style swap; virgin-cycle22 09 fix for day↔night crash, line 728)
- **Camera ref:** `CameraRef` (imperative for compass reset, fit, ME toggle)

### Non-Interactive Mode Support
**Lines 363–378 (event handlers):**

| Control | Mapped to Prop | Setting |
|---------|---|---------|
| Drag pan | `dragPan={true}` | Line 737 — always on |
| Pinch zoom | `touchZoom={true}` | Line 738 — always on |
| Double-tap zoom | `doubleTapZoom={true}` | Line 739 — always on |
| Double-tap-hold zoom | `doubleTapHoldZoom={true}` | Line 740 — always on |
| Two-finger rotation | `touchRotate={rotateEnabled}` | Line 742 — gated by `rotateEnabledFor()` (WP-M; browse/prestart/finished on, moving/stopped off) |
| Touch pitch | `touchPitch={false}` | Line 743 — always off |
| Attribution | `attribution={false}` | Line 735 — native attribution disabled; custom credit overlay renders instead (Credit component, lines 349–390) |
| Logo | `logo={false}` | Line 736 — MapLibre logo hidden |
| Compass | `compass={false}` | Line 737 — native compass hidden; custom compass in zoom bar |
| Scrolling zoom | **Not exposed** | Gesture-only; no scroll-wheel alternative on mobile |
| Zoom bar | **Always mounted** — zoom ±/fit/me/compass buttons in corner (lines 802–820) | Visible; dim when locked (`creditLocked` and `dimmed` gates visibility) |

**For activity card static (non-interactive) variant:** pass `variant="browse"`, `liveState="finished"` (or "prestart"), disable gestures via logic that isn't a prop (gesture handler returns early), or render separately.
**Current implementation does NOT provide a built-in "static/read-only" mode** — all gesture control is active/inactive by liveState rule, not a single prop.

### Trail & Reference Line Drawing
**Lines 750–835 (GeoJSON sources and layers mounted in order):**

1. **Ride trace** (`rideTrace` prop, virgin-cycle15 07): First source after camera
   - `<M.GeoJSONSource key="ride-trace" id="ride-trace" data={rideTraceFC}>`
   - Layer `ride-trace-core`: line-color `colors.riderBlue` (#2196F3), line-width 2, line-opacity 0.85
   - Shows only replay drift (replay dot always sits on it)
   - MapLibre-only; PNG rung ignored

2. **Route line**: Yellow core + dark casing
   - `<M.GeoJSONSource key="route" id="route" data={wayFC ?? EMPTY_FC}>`
   - Layer `route-casing`: line-color `CASING` (#14120C), line-width 7
   - Layer `route-core`: line-color `colors.neutral` (#FFDD00), line-width 4
   - MapLibre-only

3. **Trail (breadcrumb)** (`trail` prop, WP-J): Rider's ridden line
   - `<M.GeoJSONSource key="trail" id="trail" data={trailFC}>`
   - Casing+core styled identically to route (CASING #14120C, colors.neutral #FFDD00)
   - Decimated by RecordScreen (trailModel.ts)
   - MapLibre-only; PNG rung ignored

4. **Sector spans** (`sectorColours` prop, WP-K): Verdict colour overlay per sector
   - `<M.GeoJSONSource key="sector-spans" id="sector-spans" data={sectorSpansFC ?? EMPTY_FC}>`
   - Layer `sector-spans-core`: width 4, data-driven colours from properties
   - Paints over trail at same width as core (cycle9 fix, 2026-09-16, to avoid yellow-on-yellow invisibility)
   - MapLibre-only; PNG rung ignored

5. **Place disc** (`place` prop, virgin-cycle15 brief 12): Landmark arrival radius
   - `<M.GeoJSONSource key="place" id="place" data={placeFC ?? EMPTY_FC}>`
   - Layers: fill (opacity 0.18) + outline (width 2) + centre dot
   - All using `colors.neutral` (#FFDD00, yellow)
   - MapLibre-only

6. **Gate ticks** (`gateColours` prop): Sector start/end markers
   - `<M.GeoJSONSource key="gates" id="gates" data={gateTicksFC ?? EMPTY_FC}>`
   - Layer `gate-ticks`: line + circle (point), dashed ahead, solid when scored
   - Colour per gate from `gateColours` array
   - Data-driven `['has', 'colour']` expression hides unsed ticks

7. **Self-race dots** (`selfs` prop, virgin-cycle6): Past ride replays
   - `<M.GeoJSONSource key="selfs" id="selfs" data={selfsFC}>`
   - Layer `self-dots`: circles, tinted per tier (P1/P2/P3)
   - Mounted below rider dot
   - MapLibre-only; PNG rung ignored

8. **Rider dot** (last source): Always mounted last (mount order = z-order)
   - `showRider={true}` renders `<M.GeoJSONSource key="rider" id="rider" data={riderFeature}>`
   - Circle: blue (`colors.riderBlue`) when on-route, inverted (white fill, blue stroke) when off-route (D-025 honesty)

### Lifecycle & Callbacks

**Mount/Unmount:**
- Component remounts when `mapStyleKey` changes (theme swap or style fetch retry); child sources re-mount in JSX order (virgin-cycle22 09)
- No explicit cleanup in useEffect (MapLibre native module handles cleanup on unmount)

**Style & Loading:**
- `onDidFinishLoadingStyle={() => { styleLoadedRef.current = true; }}` (line 729): Fires when fetched style is fully applied
- `onDidFailLoadingMap={() => { if (!styleLoadedRef.current) setStyleFailed(true); }}` (line 730): Triggers offline fallback
- **Style retry logic** (lines 205–209): Retries at 5s, 15s, 45s if initial fetch fails (virgin-cycle22 05)

**Region/Gesture Events:**
- `onRegionWillChange`: Fires when gesture/animation begins; sets `mode='free'` to prevent GPS-fix camera yank (Cycle 020)
- `onRegionDidChange`: Reads `bearing` (rotation) and `zoom` when gesture/animation ends; gated on `userInteraction` to skip programmatic camera pushes

**No explicit `onLoad` callback** beyond style loading.

### Variants
- **'live'** (default): Locked ribbon while recording (moving/stopped). liveState gates visibility/dimming/rotation.
- **'browse'**: Free pan/zoom/rotate on Routes, Result screens, ride detail, gate-adjust card. Unlocked = full gestures + labels.
- **'rider-only'** (WP-D, implicit): No route asset, but showRider=true → basemap + dot + trail, no line.

---

## 2. Tile Source & Caching

**Tile URLs:** `app/src/ui/wayMapView.tsx` lines 188–189

| Time of Day | Style URL |
|---|---|
| Day | `https://tiles.openfreemap.org/styles/positron` (light grey basemap) |
| Night | `https://tiles.openfreemap.org/styles/dark` (dark basemap, yellow line branding) |

**Tile provider:** OpenFreeMap (OpenMapTiles schema, OSM data)  
**Credit:** `app/src/ui/mapCreditModel.ts` line 16: `'OpenFreeMap © OpenMapTiles Data from OpenStreetMap'`

**Offline Fallback:**
- **Function:** `offlineMapStyle(backgroundColor: string)` (app/src/ui/wayMapStyle.ts lines 249–255)
- **Build:** One background layer (version 8 MapLibre style) in frame colour, no sources/glyphs/sprites
- **Triggered:** When online style fetch fails and `styleFailed=true` (line 730 handler)
- **Result:** Instant offline load; route/gates/trail/rider GeoJSON sources draw on empty grey background (Google Maps/Waze offline look)
- **Fallback adoption:** virgin-cycle22 05 (2026-10-05); PNG compositor rung retired

**Tile Caching:**
- **MapLibre native module caching:** Built-in; retains tiles offline once fetched
- **Bundled offline pack:** NOT present; no explicit tile pre-download
- **Prefetch logic:** NONE documented; maps fetch tiles on-demand from network or native cache

---

## 3. Multiple MapLibre Instances — Simultaneous Mounts

### RideDetailScreen Simultaneous Maps
**File:** `app/src/ui/RideDetailScreen.tsx` (763 lines)

Conditional rendering mounts up to **4 WayMapView instances** at once, all in a ScrollView:

1. **Reference route card** (lines 496–511): `kind === 'route' && model.wayId`
   - Variant: `'browse'`, height 300, showRider false, sectorColours (optional)

2. **Reference ride card** (lines 554–567): `kind === 'route' && model.referenceOf !== null`
   - Variant: `'browse'`, height 300, showRider false, trail (fixes)

3. **Free activity card** (lines 573–585): `kind === 'free' && model.free`
   - Variant: `'browse'`, height 300, showRider false, trail (fixes)

4. **Unmatched ride card** (lines 593–603): `kind === 'none'` (all else)
   - Variant: `'browse'`, height 300, showRider false, trail (fixes)

**Only one card renders per detail screen** (mutually exclusive `if/else if`), so **max 1 map per RideDetailScreen instance**.

### Tabs & Simultaneous Instances
- **RECORD tab:** WayMapView mounts with live state (variant='live', actual rider dot)
- **ROUTES tab:** Each browse map (CatalogDetailScreen, possibly one per route detail)
- **RESULTS tab:** No WayMapView instances documented (chart-only layout, virgin-cycle20 08)
- **ACTIVITIES tab (RidesScreen):** No maps in collapsed rows; maps mount only when a detail screen opens

**Confirmed simultaneous scenarios:**
1. User recording a ride + tap to open detail screen → **2 maps** (live record + detail browse)
2. Detail screen opened from RESULTS or ROUTES → **1 map** (detail only)
3. User opening detail from ACTIVITIES while recording → **2 maps**

**No "one map at a time" rule found** in codebase or STATE.md/cycles docs.

### Memory, GL Context, & Performance Notes
**Searched:** cycles/, process/, STATE.md for "memory", "crash", "GL", "context", "jank", "unmount"

**Findings:**
- Virgin-cycle1 README.md line 176: "Watch for jank after ~20 minutes of recording — the 5 m/4000-point constants are [related to trail decimation]"
- No documented GL context limits, crashes, or "one map at a time" constraint
- Virgin-cycle22 05 (STATE.md): PNG rung retired; offline fallback is now bundled background-only style (no GL issues noted)
- Virgin-cycle1 README.md & WP-C notes: MapLibre rung behaviour documented; no multi-map memory warnings

**Conclusion:** No explicit constraint on multiple simultaneous MapLibre instances found; performance under many scrolling maps untested.

---

## 4. RideDetailScreen Map Data Flow

**File:** `app/src/ui/RideDetailScreen.tsx` (763 lines)

### readRideFixes Function
**Location:** `app/src/store/routeFromRide.ts` lines 48–59

```typescript
export async function readRideFixes(rideId: string, fs: FsAdapter) {
  try {
    const text = await fs.readText(`rides/${rideId}.jsonl`);
    if (text === null) return null;
    return chronologicalFixes(decodeRideFile(text).fixes);
  } catch { return null; }
}
```

- **Input:** `rideId` (string), `fs` (FsAdapter — must be passed explicitly, no default)
- **Output:** `TrailPoint[]` (chronological) or `null` (file missing/error)
- **Cost:** Reads entire `.jsonl` file from disk, decodes all fixes, sorts by timestamp
- **Sync/Async:** `async` (file I/O)
- **Called per activity:** YES — RideDetailScreen line 142:
  ```typescript
  const fixes = useMemo(() => {
    if (!meta) return null;
    (async () => { const f = await readRideFixes(meta.rideId, createExpoFsAdapter()); })();
  }, [meta]);
  ```
  **Pattern:** Fire-and-forget async inside useMemo; `fixes` state updated by effect (lines 167–176).

**Decimation:** No decimation in readRideFixes itself; trail passed to WayMapView is raw fixes, rendered by trailLineFeature() (app/src/ui/trailModel.ts).

### Map Feeding in Detail Screen
**Lines 496–603 (conditional card renders):**

Each WayMapView receives:
- `wayId`: from `model.wayId` (nullable; null → rider-only or trail-only)
- `trail`: from `fixes` (TrailPoint[] raw ride fixes, line 600, 568, 575)
- **Never live updates:** all maps are static (`lat={null}, lon={null}` on browse surfaces)

---

## 5. SPORT Handling in Activities Tab (RidesScreen)

**File:** `app/src/ui/RidesScreen.tsx` (250 lines)

### Sport Filtering & Storage
**Active sport:** Stored in `sportStore.ts` line 42: `activeSportId(): string | null`

**Filtering logic** (lines 46–54):
```typescript
const f = currentSports();
const active = activeSportId();
const scoped = list.filter((r) => effectiveRideSportId(r.sportId, f) === active);
```

- `effectiveRideSportId()` (app/src/store/sports.ts): Normalizes ride sportId to active sport
- If zero sports: all rides pass (both null)
- If 1+ sports: only rides matching active sport shown

**Data model:** `RideMeta.sportId?: string` (optional; absent = default/no sport)

### Sport Selector Component
**Location:** RecordScreen.tsx pill row (virgin-cycle20 spec) — NOT in RidesScreen itself

**RidesScreen sport display** (lines 128–130):
```typescript
const sportLabel = currentSports().sports.find((sp) => sp.id === activeSportId())?.label ?? null;
<Text style={styles.sub}>
  {sportLabel !== null ? sportLabel.toUpperCase() : 'NO SPORT YET · ADD ONE IN SETTINGS'}
</Text>
```

- Displays active sport name in uppercase badge (RUNNING, WALKING, etc.)
- Falls back to `'NO SPORT YET · ADD ONE IN SETTINGS'` when `activeSportId()` is null
- Read-only in ACTIVITIES tab; switch lives in RECORD or SETTINGS

### Sport Switching
**Settings location:** app/src/ui/settings.tsx (line 45 comment): sport pill row togglable via `s.showSportSelector` toggle in SETTINGS

**Switching mechanism** (RecordScreen.tsx lines 285–291):
- Tapping a sport pill calls state update
- `sportSwitchTick` forces re-render after sport change (line 265)
- afterSportSwitch() (store/sportSwitch.ts line 3) applies side effects (e.g., catalog refresh)

### sportId in Free Activities
**Free activities carry sportId:** app/src/store/freeRides.ts interface FreeRideRecord:
```typescript
{
  rideId: string;
  startedAtMs: number;
  durationS: number | null;
  sportId?: string;  // ← Stored; filtered same as route rides
}
```

**Filtering:** freeRideNear() call in rideHistoryModel buildRideRows() respects sportId filtering.

### "NO SPORT YET" Badge  
- **When shown:** Only when `activeSportId() === null` (zero sports added)
- **Text:** Literal `'NO SPORT YET · ADD ONE IN SETTINGS'` (app/src/ui/RidesScreen.tsx line 128)
- **Location:** sport subtitle row below "Activities" header (line 128, style `sub`)
- **Appearance:** Grey text, no interaction (read-only in ACTIVITIES tab)

---

## 6. Target Device Facts

**File:** `app/app.json`

| Property | Value |
|---|---|
| **Platforms** | Android only (line 9: `"platforms": ["android"]`) |
| **Min Android version** | Not specified in app.json; inferred from Expo 56 baseline (~Android 8.0 / API 26+) |
| **Orientation** | Portrait only (line 5: `"orientation": "portrait"`) |
| **React Native version** | 0.85.3 (app/package.json line 20) |
| **Expo version** | ~56.0.0 (app/package.json line 11) |
| **New Architecture** | Not enabled; no `enableNewArchitecture` in app.json |
| **Package name (debug)** | `com.nathanbonher.qualifire` (app.json line 12) |
| **Package name (preview)** | `com.nathanbonher.qualifire.preview` (generated by build3) |
| **Package name (virgin)** | `com.nathanbonher.qualifire.virgin` (generated by build3) |

**Runtime version policy:** `"fingerprint"` (app.json line 42: uses EAS fingerprint for OTA updates)

**Performance notes:** No explicit perf targets or device tier minimums documented; MapLibre native module requires Android NDK toolchain (installed in EAS build).

---

## 7. List/Virtualization Settings — Activities Tab

**File:** `app/src/ui/RidesScreen.tsx` lines 88–107 (SectionList usage)

| Setting | Value | Lines |
|---|---|---|
| **List type** | `SectionList` (React Native) | 88 |
| `sections` | Computed two-section array (main + free) | 90 |
| `keyExtractor` | `(r) => r.rideId` | 91 |
| `stickySectionHeadersEnabled` | `false` | 92 |
| `windowSize` | Not set (default ~10) | N/A |
| `removeClippedSubviews` | Not set (default true) | N/A |
| `initialNumToRender` | Not set (default ~10) | N/A |
| `maxToRenderPerBatch` | Not set (default varies) | N/A |
| `updateCellsBatchingPeriod` | Not set (default varies) | N/A |

**FlashList:** No FlashList dependency; native SectionList only.

**Virtualization:** SectionList virtualizes by default; exact settings rely on React Native defaults. No tuning for high-cardinality lists documented.

**Render cost per row:** Minimal (text + pressable); no maps, no SVGs in collapsed rows.

---

## Summary: Feasibility of Maps on Every Activity Card

### Current State
- **Collapsed rows:** No maps (text-only); SectionList virtualizes efficiently
- **Expanded detail:** One map per ride detail (browse variant, height 300)
- **Simultaneous instances:** Max 2–4 confirmed (live + detail, or detail's conditional cards); no documented limit or crashes

### For Pre-Expanded Feed (Maps on Every Card)
1. **Native MapLibre component:** Stable, supports 1+ concurrent instances; no "one map at a time" rule
2. **Tile caching:** Online only (no bundled prefetch); offline fallback is bundled background style
3. **Gesture control:** Always active/disabled by liveState rule; no "static" mode prop
4. **Memory/GL:** No documented constraints; untested at scale (100+ concurrent maps)
5. **List virtualization:** SectionList defaults may need tuning for many maps; consider FlashList for better perf
6. **Trail/reference data:** Synchronous file read (`readRideFixes`) per card needed; fires async, updates state

### Risk Factors
- **Per-card I/O:** readRideFixes is async file read; queuing/caching strategy needed to avoid thread exhaustion
- **Gesture conflicts:** Many concurrent gesture responders could compete; test interaction feel
- **Tile fetch contention:** Dozens of maps requesting tiles simultaneously may exceed network/cache limits
- **GL context load:** Android GL context per map instance; total limit unknown (test on mid-range device)
- **Scroll performance:** Many native Map views in a SectionList may cause jank; profile before/after

---

**Generated:** 2026-10-06  
**Scout:** Haiku DIGEST agent, Qualifire project
