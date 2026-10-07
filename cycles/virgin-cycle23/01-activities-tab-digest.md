# Activities Tab Digest — Qualifire

## 1. Tab Navigation Structure

**File:** `app/App.tsx` (main shell component)  
**Tab definition:** Line 59 – `TAB_LABEL: Record<Tab, string>`  
**Tab type definition:** `app/src/ui/tabNav.tsx` line 22 – `type Tab = 'record' | 'rides' | 'routes' | 'results' | 'settings' | 'demo';`

**Tab labels (user-facing):**
- `record` → "record"
- `rides` → "activities" (virgin-cycle20 brief 05, line 57-58: "the app serves walking and running, so user sees 'activities'; tab ID stays 'rides'")
- `routes` → "routes"
- `results` → "results"
- `settings` → "settings"
- `demo` → "demo"

**Tab bar rendering:** `app/App.tsx` lines 251-269
- ScrollView with horizontal scroll, `showsHorizontalScrollIndicator={false}`
- Inline loop through tab array: `(['record', 'rides', 'routes', 'results', 'settings', 'demo'] as const)`
- Each tab is a Pressable with `onPress={() => setTab(tb)}`
- Tabs hidden when: `tabBarHidden = (tab === 'record' && recFullscreen) || (tab === 'demo' && demoFullscreen) || rideDetail !== null || gateAdjust !== null || catalogDetail !== null || resultsDetail !== null` (line 195)

**Tab bar styles:** `app/App.tsx` lines 304-326
- `tabBar`: borderTopWidth, minWidth per tab 92dp, flex row
- `tabText`: color t.textDim, fontSize 13, fontWeight 700, letterSpacing 2, uppercase
- `tabActive`: color t.text, borderTopColor t.accent (3dp border)

---

## 2. Activities Tab (RIDES) — Component & List Implementation

**Component file:** `app/src/ui/RidesScreen.tsx`  
**List type:** React Native `SectionList` with collapsible sections (line 88)

**Key props:**
- `sections={sections}` (line 90)
- `keyExtractor={(r) => r.rideId}` (line 91)
- `stickySectionHeadersEnabled={false}` (line 92)
- `renderSectionHeader` (lines 93-95): renders section title if not null
- `renderItem` (lines 96-107): renders individual ride row

**Sort order:** Newest first (line 50: `sort((a, b) => b.startMs - a.startMs)`)

**Empty state:** Lines 86-87
- If `rides == null`: renders nothing
- If `rides.length === 0`: renders `<Text>No activities yet</Text>` (line 87, style `sub` – color t.text2, fontSize 14)

**Expansion state:** No in-place expansion
- **Current implementation:** Tapping a row calls `tabNav.openRide({ rideId, source: 'rides', startedAtMs })` (line 104)
- This mount-swaps RideDetailScreen as a full-screen overlay (not a row expansion)
- No accordion/collapse toggle on rows themselves

**Section structure:** Lines 75-84
- Ride data divided into two sections:
  1. Main rides (wayName ≠ FREE_RIDE_ROW_NAME)
  2. "FREE ACTIVITIES" section (if any free rides exist)
- Empty sections not rendered

---

## 3. Collapsed Row — Elements & Styling

**File:** `app/src/ui/RidesScreen.tsx` lines 96-107 (renderItem), lines 130-170 (StyleSheet)

**Row container:**
- View, style `row`: backgroundColor t.card, borderWidth 1, borderColor t.cardBorder, **borderLeftWidth 3, borderLeftColor t.accent**, borderRadius, paddingHorizontal 14, marginBottom 10, overflow hidden

**Pressable head (rowHead):** Flexbox row, alignItems center, justifyContent space-between, paddingVertical 12

**Left section (rowInfo):** Flex 1, gap 2
1. **Route/way name** (conditional): Text, style `rowTitle` – color t.text, fontSize 17, fontWeight 800
2. **Date + lap + quality:** Text, style `sub` – color t.text2, fontSize 14
   - Format: `{dateLabel} · {lapLabel}{quality ? ` · ${quality}` : ''}`
   - Example: "Tue 05 Aug · 08:31 · 5m03s · missed"

**Right section (rowRight):** Flexbox row, alignItems center, gap 10
1. **Rank badge** (style `rank`): color t.textDim, fontSize 15, fontWeight 700, fontVariant tabular-nums
   - Format: `P1/10` or `–` (empty dash if no rank)
2. **Chevron** (style `chev`): color t.textDim, fontSize 16, text "›"

**Row data from model:** `RideRowModel` from `rideHistoryModel.ts` (lines 65-74):
- `rideId`: string
- `startMs`: number (ride start timestamp)
- `dateLabel`: formatted "Tue 05 Aug · 08:31" (from `dateTimeLabel()`, line 47 of rideHistoryModel)
- `wayId`: string | null
- `wayName`: string | null (route label, or "Free activity" for free rides, or null for "no way")
- `lapS`: number | null (lap time in seconds, clean only)
- `lapLabel`: string ("5m03s" or "~4m50s" for estimated or "no lap")
- `quality`: string | null ("clean" → null, otherwise "estimated"/"missed"/"interrupted")
- `rank`: { pos: number; of: number } | null (e.g., { pos: 1, of: 10 })

**Data flow:** `buildRideRows()` pure function (rideHistoryModel.ts lines 97-185) builds rows from:
- `metas: RideMeta[]` (from `listRides()`)
- `resultFor: (rideId) => RideResult | null` (from `getStoredResult()`)
- `laps: (wayId, excl) => number[]` (from `lapValues(wayId, rideId)`)
- `labelFor: (id) => string` (from `wayLabelIn(currentCatalog(), id)`)
- `referenceWayFor: (rideId) => { id } | null` (from catalog check)
- `pickLabelFor: (rideId) => string | null` (from events sidecar)
- `freeFor: (startMs) => FreeRideRecord | null` (from `freeRideNear(freeRideResults(), startMs)`)

---

## 4. Expanded Content — Full-Screen Ride Detail

**Component:** `app/src/ui/RideDetailScreen.tsx` (763 lines)  
**Opened as:** Mount-swapped full-screen overlay (app/App.tsx line 232)

**Header (lines 471-478):**
- Back button: Pressable, text "‹ BACK" (color t.textDim, fontSize 14, fontWeight 700), onPress `tabNav.closeRide()`
- Title: "ACTIVITY" (fontSize 15, fontWeight 800, letterSpacing 2)
- Date/time: from `dateTimeLabel(request.startedAtMs)` (color t.textDim, fontSize 12)

**Content by ride kind:**

### 4a. Kind = 'route' (Lines 481-516)
Card with:
- Way label (from `wayLabelIn(currentCatalog(), model.wayId)`)
- **Big lap time** (style `big`): fontSize 34, fontWeight 800, fontVariant tabular-nums, color `tierTextColour(model.lapTier, t)`
  - Format: "5m03s" or "~4m50s" (estimated)
- Rank line (fontSize 12.5, color t.textDim): e.g., "P1/10 · clean" or descriptive verdict
- Reference marker if applicable (fontSize 11.5): "reference activity of [way name]"
- **WayMapView** (height 300, showRider false, variant "browse"):
  - Draws reference route line with sector colors (optional, gated by s.sectorColours setting)
  - ALL_YELLOW (all nulls) when sectors disabled
  - leadColour (grey) when enabled
- **Sectors section** (lines 502-512):
  - Header: "SECTORS" (fontSize 12, color t.textDim, letterSpacing 2)
  - Per sector: S1, S2, etc. (label plain), time (color tierTextColour), avg (color t.textDim, fontSize 12)
- **On this way section** (lines 514-521):
  - Header: "ON THIS WAY" (fontSize 12, color t.textDim)
  - PbDetail component: last N rides on this way, sorted by time
    - Columns: Position (P1, P2…), date (or "today" highlighted with lapTier colour), time, gap
    - Max 9 rides shown (ghostsFor window)

### 4b. Kind = 'route' + referenceOf (Lines 523-547)
Card with:
- Way label + "ref" marker (fontSize 12.5, color t.textDim)
- WayMapView (height 300): shows ridden trail (fixes), no reference line
- No sectors, no on-this-way detail

### 4c. Kind = 'free' (Lines 549-568)
Card with:
- "FREE ACTIVITY" header (color t.textDim)
- Pick label or "saved as a free activity" (fontSize 12.5, color t.textDim)
- WayMapView (height 300): shows ridden trail (fixes)
- No sections, no ranking

### 4d. Kind = 'none' (Lines 570-581)
Card with:
- Pick label if available (color t.textDim) — e.g., "Tower Square → Home"
- WayMapView (height 300): shows ridden trail (fixes)
- No sections, no ranking

**Actions section (lines 583-654):**
Header: "ACTIONS" (fontSize 12, letterSpacing 2)

Buttons:
1. **Replay** (conditional): Pressable, style `exportBtn` (bg t.accent), text "Replay"
   - Only shown if `replayWayId !== null && canReplay` (line 592)
   - onPress: `setReplaying(true)` → mounts ReplayScreen (lines 654-657)

2. **Export GPX+** (conditional disabled if `!meta`): Pressable, style `exportBtn`, text "Export GPX+"
   - onPress: `onExport()` (lines 368-379)
   - Exports via `exportGpxPlus(meta.rideId)` and `saveGpx(base, gpx)`
   - Shows alert: "Exported" or "Shared" on success

3. **Delete** (conditional disabled if `!meta`): Pressable, style `deleteBtn`, text "Delete"
   - onPress: `onDelete()` (lines 381-405)
   - Confirm alert: "Delete activity?" with formatted date/duration
   - Destructive: removes ride file + result + free record
   - Closes detail on success

4. **Ignore in ranking / Count in ranking** (conditional): Pressable, style `deleteBtn`, text toggles
   - Only if `model.canToggleIgnore` (line 614)
   - onPress: `onToggleIgnore()` (lines 326-335)

5. **Make this the reference of this way** (conditional): Pressable, style `deleteBtn + promoteBtn`
   - Only if `model.promoteTarget !== null` (line 620)
   - Confirm alert before promoting
   - Destructive: clears other rides' results, re-derives

6. **Make this the reference of a new route / Save as a new way on [route]** (conditional): Pressable
   - Only if `offer !== null && !naming && adjust === null` (line 625)
   - Opens RouteNamingCard (lines 643-663)

7. **Save as free activity** (conditional): Pressable
   - Only if `model.kind === 'none' && model.referenceOf === null && !naming && adjust === null` (line 634)
   - onPress: `onSaveFree()` (lines 307-320)

8. **Not a free activity** (conditional): Pressable
   - Only if `model.kind === 'free'` (line 641)
   - onPress: `onUnsaveFree()` (lines 321-333)

**Modals:**
- **RouteNamingCard** (lines 643-663): Full route creation flow (start/end landmarks, specs, etc.)
- **GateAdjustCard** (lines 664-675): Gate timing adjustment

**Primary button (line 678):**
- Style `slimBtn` (bg t.accent)
- Label depends on `request.source`:
  - 'post-stop' → "RECORD ANOTHER"
  - 'routes' → "BACK TO ROUTE"
  - 'results' → "BACK TO RESULTS"
  - default → "BACK TO ACTIVITIES" (line 656)

---

## 5. Data Model — Ride & Activity Types

**File:** `app/src/storage/types.ts`

### RideMeta (interface, lines 60-76)
```typescript
interface RideMeta {
  rideId: string;
  startMs: number;
  endMs: number;
  nFixes: number;
  sportId?: string;  // WP-1: which sport this ride belongs to (absent = default)
}
```

### RideResult (from app/src/store/types.ts)
```typescript
interface RideResult {
  kind: 'rideResult';
  schemaVersion: number;
  rideId: string;
  startedAtMs: number;
  wayId: string | null;  // matched way, null if unmatched/"no way"
  source: 'app' | 'legacy' | 'bootstrap';
  lap: {
    movingS: number | null;  // scored lap time (null for estimated/missed)
    rawS: number;            // raw elapsed
    quality: 'clean' | 'estimated' | 'missed' | 'interrupted';
  };
  sectors: Array<{
    index: number;
    fromChainageM: number;
    toChainageM: number;
    movingS: number | null;
    rawS: number;
    quality: SectorQuality;
  }>;
  derivedBy: { engineVersion: string; gateSetVersion: number; resultSchemaVersion: number };
  ignoredFromRanking?: boolean;
}
```

### FreeRideRecord (from app/src/store/freeRides.ts)
```typescript
interface FreeRideRecord {
  rideId: string;
  startedAtMs: number;
  durationS: number | null;  // wall-clock duration, null if duration unknown
  sportId?: string;
}
```

### RideDetailModel (computed model, app/src/ui/rideDetailModel.ts)
```typescript
{
  kind: 'route' | 'free' | 'none' | 'route' (referenceOf);
  wayId: string | null;
  referenceOf: { id: string } | null;  // if this ride founded a way
  free: FreeRideRecord | null;
  lapLabel: string;
  lapTier: UiTier;  // 'p1'|'p2'|'p3'|'est'|'neutral'|'verdict'
  rankLine: string;  // e.g., "P1 of 10 · clean"
  sectorRows: SectorRowModel[];
  sectorColours: (number | null)[];  // colour model for map
  canToggleIgnore: boolean;
  ignored: boolean;
  promoteTarget: { id: string } | null;  // existing way that can be re-referenced
}
```

**Fields available but not displayed in collapsed row:**
- `wayId` (used only for ranking calculation)
- `source` (storage origin, not rider-facing)
- Individual sector times and qualities (only in expanded view)
- Sport ID (only for filtering, not displayed)
- GPS accuracy, elevation, fix timestamps (stored but not displayed)

---

## 6. Actions on Activities

**File:** `app/src/ui/RideDetailScreen.tsx`

| Action | Handler | Line | Behavior |
|--------|---------|------|----------|
| Tap row | `tabNav.openRide({...})` | 104 | Open full-screen RideDetailScreen |
| Replay | `setReplaying(true)` | 593 | Mount ReplayScreen over detail |
| Export GPX+ | `onExport()` | 368 | Call `exportGpxPlus()`, save/share via SAF or share sheet |
| Delete | `onDelete()` with confirm | 381 | Call `deleteRide()`, remove result, drop recorded, close detail |
| Ignore/Count | `onToggleIgnore()` | 326 | Call `setIgnoredFromRanking()`, update result |
| Promote reference | `confirmPromote()` → `onPromote()` | 412 | Call `promoteRideToReference()`, discard other rides' results |
| Make/Save route | `setNaming(true)` opens RouteNamingCard | 625 | Call `onNamingSave()` → `createRouteFromDraft()` |
| Save free | `onSaveFree()` | 307 | Call `markRideFree()`, drop result if exists |
| Unsave free | `onUnsaveFree()` | 321 | Call `unmarkRideFree()`, clear unmatched marker |
| Back button | `tabNav.closeRide()` | 471 | Unmount RideDetailScreen, back to RIDES tab or previous source |

**No long-press or swipe actions** on collapsed rows (current implementation).

---

## 7. Rider-Facing Strings — UI-Strings Allow.json Status

**File:** `app/tests/ui-strings.allow.json`

**RidesScreen.tsx entries:**
| Text | Kind | Reason | Status |
|------|------|--------|--------|
| "Activities" | text | Title | ✓ in allow.json (bootstrap) |
| "Refresh" | text | Button | ✓ in allow.json (bootstrap) |
| "No activities yet" | text | Empty state | ✓ in allow.json (bootstrap) |
| "FREE ACTIVITIES" | prop:title | Section header | ✓ in allow.json (bootstrap) |
| "NO SPORT YET · ADD ONE IN SETTINGS" | literal | Sport badge when empty | ✓ in allow.json (bootstrap) |
| "Could not load activities" | alert-title | Error loading rides | ✓ in allow.json (bootstrap) |

**RideDetailScreen.tsx entries (subset, all in allow.json as bootstrap):**
| Text | Kind |
|------|------|
| "ACTIVITY" | literal (header title) |
| "BACK TO ACTIVITIES" / "BACK TO ROUTE" / "BACK TO RESULTS" | literal |
| "SECTORS" | literal (section header) |
| "ON THIS WAY" | literal (section header) |
| "Replay" | literal (button) |
| "Export GPX+" | literal (button) |
| "Delete" | literal (button) |
| "Ignore in ranking" / "Count in ranking" | literal (button) |
| "Make this the reference of a new route" | literal (button) |
| "Save as a new way on {…}" | literal (button) |
| "Save as free activity" | literal (button) |
| "Not a free activity" | literal (button) |
| "Delete activity?" | alert-title |
| "Exported" / "Shared" | alert-title |
| "Could not delete" / "Could not save the gates" / etc. | alert-title |
| All alert bodies (20-word max) | alert-body |

**Rule:** CLAUDE.md line 9 — every rider-facing string must be in allow.json. Agents may only append with one-line reason. No strings >40 chars without `long: true`. No alert bodies >20 words. No em dashes (use ' · '). Warnings flash in yellow button sub-label, never banner.

---

## 8. Expensive Renders — Virtualization & Performance

**Maps (WayMapView):**
- **Rendered per activity:**
  - Collapsed row: none
  - Expanded 'route' kind: one map (height 300) with reference route line + sector colors (lines 497-511)
  - Expanded 'free'/'none'/'referenceOf': one map (height 300) with ridden trail (fixes), no reference line (lines 555, 568, 575)
  - **Total:** 1 map per expanded activity
- **Virtualization:** None at the row level
  - SectionList virtualizes renders, but **no lazy load per activity detail**
  - Each expanded detail mount loads its own map tile layer (MapLibre style from OpenFreeMap)
  - **Cost:** One map tile fetch per detail open; offline fallback to bundled style (virgin-cycle22, STATE.md)

**SVGs & canvases:**
- Sector colours: computed as array of tier ints, passed to WayMapView's `sectorColours` prop
- No per-sector SVG overlay in detail (trail model uses native canvas in map)
- No charts (scatter plots only in RESULTS tab, not activities)

**Performance notes:**
- **No virtualization within expanded detail:** entire detail scroll view loaded at once
- **Trail rendering:** `readRideFixes()` decimates raw fixes per min-distance rule before map render (RecordScreen.tsx pattern, virgin-cycle22 01)
- **Free ride duration:** If no `meta.endMs`, free ride wall-clock duration stays unknown (no re-derive)

---

## 9. Existing Tests

**Test files directly testing Activities/RIDES tab:**

1. **app/tests/ridehistory_suite.ts** (378 lines)
   - Tests: `buildRideRows()`, `buildSectorRows()`, `buildPbRows()`, `buildPbDetail()`, `lapCellLabel()`, `dateTimeLabel()`
   - Key tests:
     - "buildRideRows orders newest-first" (line ~50)
     - "buildRideRows rank excludes self" (line ~70)
     - "buildRideRows still ranks a way's reference ride" (line ~85)
     - "free rides in FREE ACTIVITIES section" (virgin-cycle16 03 tests)
     - 4 tests pin FREE_RIDE_ROW_NAME text literal

2. **app/tests/ridedetail_suite.ts** (fixture tests)
   - Tests: `rideDetailFor()`, `rankLineFor()`, `sectorColoursFor()`, tier colouring
   - Tests mark which rides show tier coloring, which don't (clean vs estimated vs ignored)

3. **app/tests/resultsmodel_suite.ts**
   - Tests personal bests ranking (buildPbDetail)
   - Only shows top 9 rides (ghostsFor window)

4. **app/tests/storage_suite.ts**
   - Tests RideMeta parsing, ride file format (HeaderRecord, FixRecord, EndRecord)
   - Tests sport ID field (WP-1)

5. **app/tests/run.ts**
   - Master test runner: 863 passing, 3 skipped, 0 failing (virgin-cycle22 landed 2026-10-06)
   - Checks `tsc --noEmit` (TypeScript clean)
   - Validates all UI strings against allow.json

---

## Summary for Feed Redesign

**Current state:**
- Activities are shown in collapsed rows (one row per activity), most recent on top
- Tapping opens a full-screen modal detail view (RideDetailScreen), not in-place expansion
- No accordion/collapsible toggle on rows
- SectionList groups main rides + "FREE ACTIVITIES" section

**For pre-expanded feed layout:**
- Replace collapsed-row rendering with direct render of expanded cards (or a simpler summary card)
- Remove full-screen modal (RideDetailScreen); keep actions inline or in a bottom sheet
- WayMapView renders one map per visible activity → expensive if many expanded at once
  - Mitigation: lazy-load maps on scroll, or show maps only for top N activities
- Sector details and PbDetail (on-this-way ranking) are currently rendered only when detail opens
  - Feeding them pre-expanded requires either inline rendering or lazy load per activity
- Current test suite assumes row → detail modal flow; feed tests would be new

---

Generated: 2026-10-06  
Scout: Haiku DIGEST agent
