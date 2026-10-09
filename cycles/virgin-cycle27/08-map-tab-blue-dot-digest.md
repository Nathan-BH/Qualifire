# MAP tab: why no blue dot (digest)

Date: 2026-10-08. Read-only digest. No fixes proposed. Line anchors are from the working tree at read time; wayMapView.tsx is being edited by another session, so its lines may drift.

## TL;DR
- The MAP tab (RoutesScreen.tsx + catalogMapView.tsx) has no location code at all: no permission request, no position read, no subscription, no user-location layer, no ME button. It is built that way by brief 03.
- Brief 03 passes `here: null` into the camera and specifies a zoom bar of `+ / − / FIT` only, "no ME, no compass" (03-brief-map-tab.md:164).
- Every other map that shows the rider (RECORD armed/running, Replay, DEMO) draws the dot with WayMapView's `rider-dot` layer, fed by props `lat`/`lon` from the shared location store (location/index.ts) or from replay or demo data.
- Location permission is requested only at RECORD (RecordScreen.tsx:664 ensurePermissions). The MAP tab can never trigger that prompt today.
- The non-prompting quiet read `refreshPositionIfPermitted()` (location/index.ts:510) exists and is already used by RECORD on mount. Nothing in the MAP tab calls it, which is the only reason no dot appears. This is a code fact, not a fix.

## 1. MAP tab today
1. RoutesScreen.tsx (174 lines) imports no location module. It renders `<CatalogMapView` at line 89 with catalog-derived focus and bounds only.
2. catalogMapView.tsx:
   - Imports (lines 18-34) include `cameraTargetFor` and the style helpers. No `expo-location`, no `location/`, no `WayMapView` rider props.
   - Line 165: `cameraTargetFor({ mode, here: null, bounds, zoom: 14, bearing: 0 })`. `here` is hard-coded null.
   - Lines 241-335: the MapLibre `M.Map` has sources catalogLines, catalogWays, catalogGates, catalogPins. There is no `rider` source or layer. `colors.riderBlue` does not appear in this file.
   - Lines 338-350: zoom bar with `+` (zoomBy 1), `−` (zoomBy -1), and `⤢` (setMode 'fit'). No ME, no compass.
3. Grep for `riderBlue`, `UserLocation`, `showUserLocation`, `LocationPuck`, `watchPosition` in catalogMapView.tsx and RoutesScreen.tsx: no matches (text search, not a compile check).

## 2. How other maps draw the rider
- Shared drawing component: `WayMapView` (src/ui/wayMapView.tsx). Its rider is a single MapLibre `GeoJSONSource id="rider"` with layer `rider-dot` (wayMapView.tsx:959-975). Paint: radius 7, opacity 0.85, fill `colors.riderBlue` (#2F7DE1, theme.ts:22) when on route, hollow white/blue ring when off route (lines 963-970), white 2 px stroke. No heading arrow, no accuracy circle seen in this layer.
- Gating: `showRider` defaults to true (wayMapView.tsx:397). `here = props.lat !== null && props.lon !== null` (line 653). Dot only when `showRider && here` (line 959). If `showRider && !here` the badge "waiting for GPS" shows (line 1025-1026).
- Position source per screen:
  - RECORD armed (RecordScreen.tsx:1270-1280): `lat={status.lastLat}`, `lon={status.lastLon}`, `variant="live" liveState="prestart"`. `showRider` is not passed, so default true.
  - RECORD setup (RecordScreen.tsx:1538-1543): `lat`/`lon` from status, `showRider`.
  - RECORD running (RecordScreen.tsx:1419-1424): `riderDot?.lat ?? status.lastLat` (riderDot is a step-smoothed dot from `riderDotStep`, RecordScreen.tsx:420-431, fed by liveEngine.riderSnap).
  - Replay (ReplayScreen.tsx:114-117, 232-238): `pos` from `riderPositionAt(rider, clockS)`. It is a playback position from stored fixes, not the device GPS.
  - DEMO (DemoScreen.tsx:663-666): `pos` from demo simulation.
  - Activities cards (activityCard.tsx:87-94), RideDetail (RideDetailScreen.tsx:450-527), CatalogDetail (CatalogDetailScreen.tsx:236-242, 408), gate adjust (gateAdjustCard.tsx:147-153): all pass `lat={null} lon={null}` and/or `showRider={false}`. No device position on those screens by design.
- Shared store: location/index.ts module state (`lastLat`, `lastLon`, `lastFixMs`), exposed through `getStatus()` (line 148) and `subscribe()` (line 152). Only RecordScreen and autoThemeScheduler subscribe in src/ui (grep).
- Update cadence:
  - One-shot `refreshPositionOnce()` on RECORD armed press (RecordScreen.tsx:672; location/index.ts:483, accuracy Balanced).
  - Quiet read on mount, on app foreground, and a bounded poll while setup/armed and no fix: delays 2,2,2,3,3,5 s then 5 s steps, 60 s budget, max 15 reads (positionRetryPolicy.ts:31-35; positionretry_suite.ts:18-35).
  - During a ride: foreground-service updates, timeInterval 1000 ms, distanceInterval 0 (location/index.ts:1-14 header; call-site lines not re-read).
- Denied or services off: `refreshPositionIfPermitted()` returns 'no-permission' or 'no-services' without prompting (location/index.ts:510-520). The dot does not appear, and WayMapView shows "waiting for GPS" where showRider is on.
- Accuracy and heading: no accuracy or heading handling found in the rider layer. Uncertain for the ride feed (not inspected).

## 3. Location lifecycle
- Permission request: `ensurePermissions()` (location/index.ts:323-352). Two steps: foreground (while-in-use), then background ("Allow all the time"); POST_NOTIFICATIONS requested at START on Android 13+ (lines 337-344). Its only caller in src is RecordScreen (RecordScreen.tsx:664 on the armed press, 695 on the start path). Onboarding and Settings were not checked for permission requests; the grep timed out. Uncertain.
- Watch lifecycle: `startTracking()` (location/index.ts:363) starts the ride. The header (lines 1-14) describes a foreground-service background watch. STATE.md:241-243 confirms background location is requested via `Location.startLocationUpdatesAsync` and TaskManager. Whether anything watches while idle: no `watchPositionAsync` call was found in the partial search, and the RECORD-idle path uses only the one-shot and quiet-read calls above. Uncertain, see section 5.
- Battery decisions in code: positionRetryPolicy.ts:74 ("battery ceiling"), positionRetryPolicy.ts:31-35 (backoff and budget), and the test "battery ceiling: at most 15 quiet reads per 60 s budget" (positionretry_suite.ts:35). The phrase "no idle GPS" was not found in the source or the notes read.
- Docs on the MAP tab and position:
  - 03-brief-map-tab.md:40 (D13): camera uses `here: null`, mode fit/free.
  - 03-brief-map-tab.md:164: "Then, outside `<M.Map>`: the zoom bar with + / − / FIT only ... FIT sets setMode('fit'); no ME, no compass".
  - 03-brief-map-tab.md:3: written for Nathan's overnight run; the brief gives no reason for dropping ME.
  - 00-nathan-decisions.md:14, 17, 28, 39: concept (places as nodes), "riders do NOT start activities from the MAP tab", tap-to-focus. No line mentions blue dot, ME, or position.
  - cycles/virgin-cycle22/06-fit-me-single-toggle.md:4-12: ME exists only on live surfaces (`showRider` true). Browse surfaces keep plain FIT. The MAP tab was not listed as a live surface.
  - cycles/virgin-cycle22/05-retire-png-fallback-rung.md:114: "ME" stays in the MapLibre rung. Line 504 lists `FIT`, `ME` among strings to keep.
  - cycles/virgin-cycle21/03-overlay-is-the-pick-and-dot-on-top.md:1,42: "the blue rider dot is ALWAYS the topmost layer" (RECORD live map).
  - STATE.md:87: "the zoom bar has ONE FIT/ME toggle ... browse surfaces keep a plain FIT".
  - STATE.md:241-243: app requests background location.
- None of the cycle21 to 27 files found mention the MAP tab showing the rider position.

## 4. Tests and privacy constraints
- catalogmap_suite.ts:223-232: source-pin tests (RoutesScreen renders CatalogMapView; pin font stack; stopPropagation). No test asserts absence or presence of a rider or ME on the MAP tab.
- ui-strings.allow.json: `ME` and `FIT` are listed for wayMapView.tsx (cycle22 notes). A new MAP-tab ME label would need an allow-list entry under the text budget (CLAUDE.md item 9; brief 03 §6).
- positionretry_suite.ts:35: battery ceiling test.
- positionretry_suite.ts and recordflow_suite.ts: non-prompting rule for the setup screen. Tests on permission prompts are in recordflow and session suites (names only, not read in full).
- No privacy rule about displaying location on maps was found in STATE.md, process/*.md, or app/tests/README.md. The only location-privacy text found was about the GPX sidecar and storage (not read in this pass). Uncertain.
- theme.ts:22: riderBlue is "the universal you are here hue; never a tier colour (D-030), never red (D-013)". This is a constraint on the dot colour.

## Unverified / uncertain
- Whether any onboarding or Settings screen requests location permission (grep incomplete; a 120 s search timed out).
- The exact call sites of `startLocationUpdatesAsync` and whether any watch runs while idle. Only the header and STATE.md were read.
- Whether the rider layer shows any accuracy ring or heading (only the layer at wayMapView.tsx:959-975 was read).
- Whether `ensurePermissions` at RecordScreen.tsx:695 is the start path (inferred from context, not read).
- Whether the MAP tab ever mounts the location module indirectly (e.g. via tabNav). Grep showed no import.
- No "no idle GPS" text found anywhere searched. Treat as not present.
- Line numbers in wayMapView.tsx may have drifted (cycle23 edits).
