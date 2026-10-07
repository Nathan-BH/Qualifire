# Loop and Overlapping Path Handling — Digest

> **CORRECTION 2026-10-07 (Nathan):** the TL;DR below says loops are supported. That is true only for the store/naming/results side. On the RECORD screen the rider cannot choose the same landmark as start and finish. See 00-nathan-ideas.md rulings and 02-record-picker-digest.md.

**Date:** 2026-10-07

## TL;DR

**Loops (start == end landmark)** are a supported category with explicit machinery:
- `loopDiscriminator` field (`loop:{rideId}` format) required on Routes when `startLandmarkId === endLandmarkId`
- Route naming card shows single-place UI when a loop is drafted
- Results display uses `"{start} → {end}"` format, which renders as same place on both sides for loops (e.g., "Home → Home")
- Tests confirm loops work end-to-end (routeCreation_suite.ts lines 102–199)

**Overlapping/out-and-back paths** (start ≠ end, but path retraces itself):
- **Not explicitly modelled or restricted**
- Live engine uses monotonic forward-only chainage projection (windowBack:30m, windowFwd:240m)
- No special gate detection logic for self-intersecting reference lines
- Gates fire in order exactly once (hysteresis latch via monotonic chainage, no backward movement)
- Gate placement seeding assumes non-overlapping reference lines (25/50/75% quantiles + snapping)
- **Known testing gap:** overlapping gate tap-targets on out-and-back rides (OPEN-ITEMS.md line ~21)

The app **does not prevent or special-case self-overlapping paths today**. A ride that retraces its own route would be projected forward-monotonically; if the rider retraces the same ground, the chainage simply advances again (not backward to the earlier occurrence). Gates on that second-traversal section would fire if they haven't already.

---

## 1. loopDiscriminator Definition and Use

**Defined:** `app/src/store/types.ts` lines 8–11
```
export interface Route {
  ...
  /** required iff start === end (loops are a real category: 78 archived rides) */
  loopDiscriminator?: string;
  ...
}
```
Comment explicitly flags loops as a real, designed category: "78 archived rides" in the seed.

**Set:** `app/src/store/routeCreation.ts` line 652
```
...(draft.loop ? { loopDiscriminator: `loop:${draft.rideId}` } : {}),
```
Set to `loop:{rideId}` format when building catalog; used as tiebreaker to distinguish multiple routes on the same landmark pair.

**Read:** `app/tests/routecreation_suite.ts` lines 196–197 (test assertion)
- Checked to exist (typeof === 'string', length > 0) when validating a loop route

No other consumers found; the field is write-once, used by the data model only to track loop category membership.

---

## 2. Route Creation — Loop Handling

**Draft detection:** `app/src/store/routeCreation.ts` lines 350–355
- `RouteCreationDraft.loop` boolean set when `start.landmarkId === end.landmarkId`
- `loop` marked as "end resolved to the same landmark as start (way needs a discriminator)"

**Endpoint shrinking:** `app/src/store/routeCreation.ts` lines 78–84
- A new landmark born from a single visit starts at `NEW_LANDMARK_RADIUS_M` = 120 m
- Two endpoints can resolve to the same landmark if the ride ends within that shrinking radius
- `fittedRadius()` (lines 117–127) ensures new disc doesn't overlap existing ones

**Naming card UI:** `app/src/ui/routeNamingCard.tsx` lines 130–141
- Single text input for loops: `needEnd = !loop && ...` (line 142)
- Loop UI text: "This activity looped from and back to [place]" (line 170)
- `applyEndpointChoices()` (routeCreation.ts lines 413–430) ensures loop property is re-checked after rider's endpoint choices

**Building:** `app/src/store/routeCreation.ts` lines 637–665
- Loops birth ONE landmark, not two (line 659: `if (!draft.loop && draft.end.kind === 'new'...`)
- All three of loop, landmark, way, route, and gate set are built; loopDiscriminator set to mark the route

---

## 3. Live Engine — START/FINISH and Loop Handling

**START pick (absolute reference):** `app/src/live/engine.ts` lines 23–30, 81–82
- Virgin-cycle21 ruling: "the START pick is the ONE reference"
- `engine.start(opts)` builds exactly one candidate from `opts.pickId`
- No detection, no route locking, no switching
- A rider who leaves the picked road is scored as missed sectors on that pick

**FINISH detection:** `app/src/live/engine.ts` lines 165–167, 571–583
- FINISH is the last gate (gateIndex === gates.length - 1)
- Lap scored once when FINISH gate fires (D-022 handover)
- Time from gate-0 (START) to FINISH gate event time

**Monotonic chainage (forward-only):** `app/core/src/live.ts` lines 85–110
- LiveProjector.update() enforces `this.sp = Math.max(this.sp, hit.s)` (line 96)
- Chainage never moves backward, only stalls or advances
- Initial anchor via GLOBAL nearest-vertex search (one-time, line 76); then windowed search [sp-30, sp+240] (lines 88–89)

**Gate latch (in-order, no re-fire):** `app/core/src/live.ts` lines 116–156
- GateDetector.update() fires gates as chainage crosses thresholds (lines 152–156)
- `this.next` index only advances; a fired gate cannot re-fire because chainage is monotonic
- No check for self-overlapping reference lines; if chainage reaches gate-N a second time (impossible given monotonicity), it would not fire

**No loop-specific engine logic:** No search for "loop" in engine.ts; loop machinery is catalog/UI only, not live-timing.

---

## 4. Reference Line / Gates / Sectors — Overlap Assumptions

**Gate seeding:** `app/src/store/gateSeeding.ts` lines 23–63
- Fixed fractions: 1%, 25%, 50%, 75%, 99% of reference line length
- Snapping: no gate within 150 m of a rider's own stationary stop (SIGNAL_CLEAR_M)
- Search window: ±250 m (SNAP_WINDOW_M)
- **Assumption implicit:** fractions 0.25/0.5/0.75 give different chainages; no special handling for routes that double back

**Reference line structure:** `app/core/src/types.ts` (implied from usage)
- `RefLine { rx, ry, ch, lat0, lon0, length }`
- `ch` is cumulative chainage array (strictly increasing)
- Vertices projected to XY coordinates via XY frame (lat0/lon0 anchor)

**Projection—nearest-segment search:** `app/core/src/live.ts` lines 88–90, 217–231
- Windowed search [sp - windowBack, sp + windowFwd] = [sp-30, sp+240] metres
- Finds nearest point on segments in that window (no limit on how many times a point can match)
- Returns chainage `hit.s` (true position, not clamped by window) and distance

**Display projection (rider dot):** `app/src/live/engine.ts` lines 217–232
- Same windowed search; returns hit chainage and distance (display-only)
- If a path overlaps itself, the window could theoretically match both copies; nearest-segment returns the closest one in that window

**No uniqueness assumption:** No code that assumes "each point on the reference line is unique" or "no two segments overlap." The projection works point-to-point; overlaps would just be projected twice (once per traversal).

---

## 5. Results Grouping — Loop Route Display

**Route label:** `app/src/ui/resultsListModel.ts` lines 108–114
```typescript
export function routeLabel(route: Route, catalog: Catalog): string {
  const from = catalog.landmarks.find((l) => l.id === route.startLandmarkId);
  const to = catalog.landmarks.find((l) => l.id === route.endLandmarkId);
  return `${from?.label ?? '?'} → ${to?.label ?? '?'}`;
}
```
For a loop route (start === end landmark), renders as "Home → Home" (identical on both sides).

**Results tab grouping:** `app/src/ui/resultsListModel.ts` lines 140–177
- Routes grouped by route.id (not by loopDiscriminator)
- Each route appears once in the list, regardless of loopDiscriminator
- Rides grouped under their way's routeId

**No special display for loop routes:** Same "From → To" label and grouping as any other route. The duplicate landmark name is the only signal.

---

## 6. Tests and Fixtures

**Loop-specific tests:** `app/tests/routecreation_suite.ts`
- Line 102: `test('wayCreation: a ride ending back at its own new start landmark drafts a loop')`
  - Creates out-and-back fix pattern that ends within the start landmark's disc
  - Verifies `d.loop === true`
  - Verifies `existingRouteId` is offered as a variant when the place already exists
- Line 189: `test('wayCreation: a loop build needs (and gets) a loopDiscriminator and validates')`
  - Builds a loop route
  - Verifies one landmark is born (not two)
  - Asserts loopDiscriminator exists and is non-empty
  - Verifies no catalog validation errors
- Line 538: `test('WP-G 8: an existing loop way drafts a variant, not a second loop way')`
  - Existing loop route with an existing landmark
  - Ride that exactly retraces itself
  - Verifies the ride drafts as a variant (new route on the existing way) not a new loop way

**Out-and-back patterns in fixtures:** `app/tests/routecreation_suite.ts`
- Lines 107, 192, 550, 651: `const fixes = [...out, ...back]`
- Out ride: `northRide(6, 0.001)` (~0.6 km distance)
- Back ride: reversed, offset slightly (~55 m from start endpoint)
- No explicit test that verifies overlapping paths on the reference line; tests only check draft/catalog behavior

**No self-overlap reference-line tests found** in routecreation_suite, gateseeding_suite, live_suite, or engine_suite.

---

## 7. Known Limitations and TODOs

**From OPEN-ITEMS.md line ~21:** "overlapping gate tap-targets on an out-and-back ride"
- Listed under "Chores not yet automated" / "inspection-time checks"
- Never run formally; added 2026-09-08
- Implies gate UIhit-areas overlap visually on out-and-back routes, but mechanics not changed

**From STATE.md and OPEN-ITEMS.md:** No explicit "not supported" note for loops or overlaps. The existence of loopDiscriminator and loop tests suggests loops ARE supported.

**Design assumption (implicit, not stated):** Reference lines are assumed **non-self-overlapping** for gate seeding purposes (fixed quantile fractions don't account for doubled-back sections). However, the live engine does not enforce this; it simply projects forward-monotonically.

**No routing prevention:** An out-and-back route (same path traversed twice) is not prevented or warned against. If a user names such a route, the catalog accepts it; the live engine projects it with no special handling.

