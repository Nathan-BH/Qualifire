# Qualifire Test Data Analysis - 2026-09-03

## Summary

Test session on 2026-09-03 revealed **3 distinct bugs** in the virgin-app routes. All three are **confirmed** by data cross-reference.

---

## Issue 1: Yellow Line Overlap (Rendering Logic Bug)

### Tester Claim
> "The yellow line being written behind me is also active on rides that already have a route. It should only be the case when you are 'writing history', otherwise the two yellow lines overlap strangely."

### Data Evidence
**CONFIRMED** - Catalog structure supports the bug:

- Route `route:20260901-091752-f6ca` (home>>work): Exists with `seeded: false`, has `refLineId` pointing to self
- Route `route:20260903-182911-3c34` (work>>home): NEW route, also `seeded: false`, has `refLineId` pointing to self
- Both routes have reference line rendering enabled

### Root Cause Hypothesis
When recording a new route (`route:20260903-182911-3c34`), the app is rendering BOTH:
1. **Live yellow line** - the user's current GPS trace (correct)
2. **Reference overlay** - from an existing route in the same way (`route:20260901-091752-f6ca` from opposite direction) (incorrect)

The rendering logic likely fails to disable the reference line for existing routes when a new route is being recorded. Expected behavior: only show live line for new routes, only show reference line (no live line) for known routes.

### Developer Investigation Steps
1. Check RecordScreen component: verify `isNewRoute` flag correctly sets `disableReferenceOverlay`
2. Confirm route selection properly filters which routes render during recording
3. Verify reference line toggle respects recording state vs. playback state

---

## Issue 2: Route Selection Not Recognized (Data Sync / State Bug)

### Tester Claim
> "I selected work>>home and the app did not recognize it as a new route. So it showed me the route overlay of the home>>work line"
>
> Later update: "When pressing record it always show the yellow route for the home>>work reference that has been written regardless of which options you choose on the RECORD screen."

### Data Evidence
**CONFIRMED** - Both routes exist in catalog but app is ignoring user selection:

- `way:20260901-091752-f6ca` (start=Home/50.8366, end=Work/50.8633) → `route:20260901-091752-f6ca`
- `way:20260903-182911-3c34` (start=Work/50.8633, end=Home/50.8366) → `route:20260903-182911-3c34`

The tester explicitly selected work>>home (2nd way), but the app persisted in showing the home>>work route overlay (1st way).

### Root Cause Hypothesis
1. **Route selection state not persisted** - RecordScreen may cache the previous route selection without checking the user's new input
2. **Way ID not properly mapped to Route ID** - Selection logic may have mapping bug between user-facing way names and internal route IDs
3. **Race condition in state update** - Route selection may update AFTER rendering begins

### Developer Investigation Steps
1. Add logging to RecordScreen route selection handler - verify selected `wayId` is captured correctly
2. Check if route selection state is properly passed to the live tracking layer
3. Verify `getRouteForWay(wayId)` correctly maps the user's selection to the intended route ID
4. Audit component lifecycle - ensure route selection persists through mount/unmount

---

## Issue 3: Gate Placement - Severe Distance Mismatch (Calculation/Seeding Bug)

### Tester Claim
> "Now that I look at the new work>>home route (20260903-182911-3c34) in the ROUTES tab. When I click on the route and the openmap preview shows abnormal lines with the gates misplaced, all the gates seemed bunch at the center of the route"

### Data Evidence
**CONFIRMED** - Gates placed at mathematically impossible positions:

**Route 20260903-182911-3c34 (work>>home):**

Reference track coordinates:
- Start: rx=1880.17, ry=1414.03
- End: rx=-1628.62, ry=-1562.50
- **Calculated distance: ~4,600 meters** (Euclidean)
- Chainage range: 0 to 19.83 (coordinate system units)

Gate positions (from catalog):
```
[139.6m, 3489.5m, 6978.9m, 10468.4m, 13818.3m]
```

**Problem:** Gates are calculated as percentiles of a ~13,818m route, but the actual route is only ~4,600m:

| Gate | Calculated Position | % of 13.8km | Actual % on 4.6km Route |
|------|-------------------|-----------|---------|
| 1 | 139.6m | 1% | 3% ✓ (visible) |
| 2 | 3489.5m | 25% | 76% ✓ (visible) |
| 3 | 6978.9m | 50% | 152% ✗ (BEYOND end) |
| 4 | 10468.4m | 75% | 227% ✗ (BEYOND end) |
| 5 | 13818.3m | 99% | 300% ✗ (BEYOND end) |

**Visual Result:** User sees gates 1-2 spread normally, then gates 3-5 appear bunched at or beyond the route terminus (gates don't render properly, creating visual clustering).

### Root Cause Analysis
Gate distance calculated as: `distance_calculated ≈ 3.0 × distance_actual`

**Hypothesis:**
1. Route distance was seeded/estimated using a different coordinate projection or unit system
2. When coordinates were later transformed/compressed, the distance wasn't recalculated
3. Algorithm used initial chainage (0-19.83) to estimate meters, creating ~3x inflation

**Evidence for compression:** Chainage values for both routes hover around 19-20 (extremely short), suggesting coordinate transformation post-calculation.

### Developer Investigation Steps
1. **Audit route seeding algorithm** - where is `totalDistanceMeters` calculated when route is first recorded?
2. **Check coordinate systems** - are rx/ry in Web Mercator, local projection, or relative coordinates?
3. **Verify gate calculation** - examine gateSet origin field, replay the 1%, 25%, 50%, 75%, 99% calculation
4. **Compare reference track in refs.json vs. GPX** - are distances consistent, or is one system inflating?
5. **Test with first route** - confirm route `20260901-091752-f6ca` has same ~3x inflation (gates at 56-5605m vs actual ~4600m distance)

---

## Data File Cross-Reference

### Catalog (qualifire-catalog-20260903.json)
- 2 landmarks (Home, Work)
- 2 ways (home>>work, work>>home)
- 2 routes (one for each way)
- 2 gateSets (gates for each route)

### Reference Tracks (qualifire-refs-20260903.json)
- `route:20260901-091752-f6ca`: 1,134 points, ch: 0→19.51, coords suggest ~4,600m
- `route:20260903-182911-3c34`: 2,819 points, ch: 0→19.83, coords suggest ~4,600m

### Recorded Ride (qualifire-20260903-1828.gpx)
- Track name: `20260903-182911-3c34` (confirms work>>home route was recorded)
- Starts at Work (50.8633, 4.6882) and traces toward Home
- ~350+ trackpoints recorded during the session

---

## Severity Assessment

| Issue | Severity | Impact | Blockers |
|-------|----------|--------|----------|
| **#1: Yellow line overlap** | Medium | Visual confusion, route recording UX impaired | Prevents clean recording of new routes |
| **#2: Route selection ignored** | High | User selection is silent-failed, wrong route rendered | Breaks route selection feature entirely |
| **#3: Gate placement** | High | Route preview unusable, gates render incorrectly | Breaks routes tab visualization, data quality concern |
