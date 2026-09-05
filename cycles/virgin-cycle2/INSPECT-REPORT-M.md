# INSPECT report — WP-M (map two-finger rotation + compass reset)

**Inspected:** `cycles/virgin-cycle2/WP-M-map-two-finger-rotation.md` (brief only; nothing executed)
**Inspected by:** Inspect tier, 2026-09-05, against the mounted working tree
(`app/src/ui/routeMapView.tsx` 980 lines, `app/src/ui/routeMapGeo.ts` 519 lines,
`app/node_modules/@maplibre/maplibre-react-native` 11.3.6, `app/package.json` `^11.3.6`).

## Verdict: PASS WITH FINDINGS

The brief is factually accurate on every load-bearing claim and is implementable as written by an
Execute agent with no other context. One reasoning claim in §3.2 is wrong in a way that turns a
"belt-and-braces" guard into a load-bearing one (Finding 1) — the brief's own code already
handles it, but Execute should add a one-token hardening. Everything else is line-number drift or
informational.

## What was verified (claim → repo)

| # | Brief claim | Real repo | Status |
|---|---|---|---|
| 1 | L374 `const effectiveBearing = variant === 'browse' \|\| liveState === 'prestart' ? 0 : bearing;` | routeMapView.tsx:374, verbatim | confirmed |
| 1 | L355–371 course-up: `bearingLive = variant==='live' && (moving\|\|stopped)`, effect updates `bearing` via `bearingBetween()` only when `metresBetween >= BEARING_MIN_MOVE_M (8)`; `finished` holds | routeMapView.tsx:355–372 (`BEARING_MIN_MOVE_M = 8` at :173) | confirmed |
| 1 | browse always bearing 0; live course-up only moving/stopped; finished holds | follows directly from :357 + :374 | confirmed |
| 1 | L329 `unlocked` = browse ∨ prestart ∨ finished | routeMapView.tsx:329 verbatim | confirmed |
| 2 | `touchRotate={false}` at L541, `touchPitch={false}` L542, `<M.Camera {...cameraProps} />` L544, `<M.Map` opens L521, `onRegionWillChange` L531–533 | all at exactly those lines | confirmed |
| 2 | `touchRotate?: boolean`, default true, Map.tsx:360 | Map.tsx:355–360, `@defaultValue true` | confirmed |
| 2 | runtime-toggleable, not init-only | Android: `MLRNMapViewManager.kt:154 @ReactProp("touchRotate") → setReactRotateEnabled → updateUISettings()` sets `uiSettings.isRotateGesturesEnabled` and calls `rotateGestureDetector.interrupt()` when turning off (MLRNMapView.kt:845–848, 1222–1227). iOS: `MLRNMapViewComponentView.mm:335` diffs old/new prop → `setReactRotateEnabled` (MLRNMapView.m:431–434) | confirmed, both platforms |
| 3 | `onRegionDidChange?: (e: NativeSyntheticEvent<ViewStateChangeEvent>) => void` Map.tsx:484; `ViewStateChangeEvent = ViewState & {animated, userInteraction}`; `ViewState = {center, zoom, bearing, pitch, bounds}` Map.tsx:61–75 | exact | confirmed |
| 3 | native payload carries `bearing` + `userInteraction` | Android `MLRNMapView.kt:1392, 1415` (exact lines the brief cites); iOS `MLRNMapView.m:894, 897`. Codegen `NativeViewStateEvent` (MapViewNativeComponent.ts:33–46) declares `bearing: Double`. Event fires from `addOnCameraIdleListener → sendRegionDidChangeEvent` (:502) i.e. once per gesture/animation end; `userInteraction` reason is cleared only AFTER the did-change event (:1430) | confirmed |
| 3 | `CameraRef`, `ViewStateChangeEvent`, `CameraStop` exported from package root | `src/index.ts:9, 13, 20` | confirmed |
| 3 | `setStop` throws "NativeCameraComponent ref is null, wait for the map being initialized" before mount | Camera.tsx `setStop` (throws exactly that string when `findNodeHandle` is null) | confirmed |
| 3 | `CameraStop` with neither center nor bounds is legal; bounds+bearing legal | Camera.tsx:104–112 (`center?: never; bounds?: never` variant), `CameraBoundsStop = CameraOptions & CameraAnimationOptions & CameraBoundsOptions`; `CameraEasing` includes `"ease"` | confirmed |
| 3 | bearing-only stop keeps center/zoom | Android `CameraStop.kt:48–49` builds from `CameraPosition.Builder(currentCamera)`; iOS `CameraUpdateItem.m:63` copies `mapView.camera` — only `bearing` overwritten | confirmed |
| 4 | `cameraTargetFor` routeMapGeo.ts:403–429, pure, signature `{mode, here, bounds, zoom, bearing}`; free→`{}` at :411; fit+bounds pins `bearing: 0` at :415; follow branches use `bearing` | exact | confirmed |
| 4 | adding optional `userBearing?: number \| null` is a clean addition | only caller is routeMapView.tsx:493 (object literal); 7 existing tests in routemapgeo_suite.ts:450–505 all omit it → `?? null` → byte-identical; no restructuring needed | confirmed |
| 5 | two zoom-bar render sites: MapLibre :683–702 (+ − FIT ME-if-showRider), PNG :911–923 (+ − FIT) | exact; `st.zoomBar` occurs at :683 and :911 only; `<Credit rung="maplibre"` at :703; `MAP IMAGE FAILED` at :927 (the brief's test-slice anchors all resolve uniquely) | confirmed |
| 5 | PNG rung cannot rotate | PngRouteMap draws an `<Image>` through `cropFor()` scale/translate + absolutely-positioned overlays (:895–909); no rotation primitive, no camera. Not glossing anything | confirmed |
| 5 | callers table (RecordScreen 929/1036/1191, RideDetail 382/444/461, Routes 211, Demo 193/196) and their variant/liveState props | all nine sites at exactly those lines with the stated props; nothing else imports maplibre-react-native | confirmed |
| 6 | fit pins `bearing: 0` and would snap a held rotation away unless composed | :415 + the `+`/`−`/`FIT`/`ME` handlers at :685–699 each leave `'free'` → declarative re-push; mode-reset effect at :344–347 does the same | confirmed |
| 7 | tests | see below | meaningful |

## Findings

### 1. (Medium — hardening, not a blocker) §3.2's "today no mount goes rotate-on → rotate-off" is wrong; the guard effect is load-bearing

`RecordScreen.tsx` `armed` (:919) and `running` (:1015) both return `<View style={styles.raceColumn}>`
whose child at index 2 is `<View style={{ flex: 1, minHeight: 220, alignSelf: 'stretch' }}><RouteMapView …/></View>`
(armed: `[Text, problemStates, mapWrapper]`; running: `[problemStates, recovered && …, mapWrapper]`).
No keys → React reconciles the same `MapLibreRouteMap` instance in place when START flips
`phase` armed→running, i.e. `liveState` goes `'prestart'` → `'moving'` ON THE SAME MOUNT
(the existing mode-reset effect's `phaseKey` dependency at :347 exists for exactly this). So a
rider who rotated the armed map and then pressed START would, without the brief's
`useEffect(() => { if (!rotateEnabled) setUserBearing(null) }, [rotateEnabled])`, race with the
ribbon locked at their rotation. The brief's effect DOES cover it — but effects run after
commit, so there is one render in which `cameraTargetFor` is called with `mode='follow'`,
`bearing=courseUp` and a stale `userBearing=47`, pushing a 500 ms animation to 47° before the
next render pushes course-up. Also `touchRotate` genuinely flips true→false at runtime here,
which is why the runtime-toggle verification in row 2 matters (it holds: Android calls
`rotateGestureDetector.interrupt()` on the way off).

**Recommendation for Execute (one token):** pass `userBearing: rotateEnabled ? userBearing : null`
into `cameraTargetFor` (and use the same gated value in the compass glyph expression), keeping the
effect as the state-clearing step. Removes the transient entirely. And rewrite the §3.2 sentence:
the guard is required, not belt-and-braces.

### 2. (Low — good news) FIT-at-rotation is confirmable on Android, and the app is Android-only

Brief §5 says bounds+bearing fit is "the one native behaviour this brief could not confirm".
`CameraStop.kt:72–78`: with `bounds` set it calls
`map.getCameraForLatLngBounds(bounds, cameraPaddingClipped, bearing ?: currentCamera.bearing, tilt)`
— the bearing is part of the fit computation. `app/app.json`/`eas.json` target Android only
(`"android": { "buildType": "apk" }` on every profile). iOS (`CameraUpdateItem.m:82–92`) fits at
the current heading and applies `bearing` afterwards, which in practice is the same value since
`userBearing` was read back from the map. §6.3's fallback can stay as a note but is unlikely to
be needed.

### 3. (Low) Say explicitly: keep `compass={false}` (routeMapView.tsx:536)

MapLibre RN has its own native compass control (Map.tsx:407 `compass?: boolean`), which appears
when rotated and resets north on tap. The brief never mentions it. An Execute agent reading the
`<M.Map>` props could reasonably think "flip `compass` on" is the cheaper mechanism and end up
with two compasses, or with one outside Nathan's requested cluster. Add one line to §3.4:
"`compass={false}` stays — the cluster button is the compass". Optionally lock it in the
source-guard test alongside `touchPitch={false}`.

### 4. (Info) Line-number drift inside the brief (re-anchor by string, as it already says)

- mode-reset effect: brief says :337–340; actual :344–347.
- `cameraTargetFor` doc comment: brief says :383–394; actual :383–393.
- `cameraTargetFor` test block: brief says :450–475 ("after line ~475"); actual :450–505 (seven
  tests, last one ends ~:505). New tests should go after :505, not :475.
- `type RegionWillChangeEvent` :92–97, `import type { CameraStop }` :90, header :25–26 — correct.

### 5. (Info) §3.4 "compass keeps center/zoom" is exact only in `'free'` mode

After any rotation `mode` is `'free'`, so the common path is exactly as described. The one
reachable exception: rotate → FIT (mode `'fit'`, held at 47°) → compass: `setUserBearing(0)`
changes the declarative stop to `{bounds, bearing: 0, padding}` AND the imperative
`setStop({bearing: 0})` fires — the map re-fits to the bounds north-up. That is a sensible
outcome, just not "keeps center/zoom". Worth one sentence so Execute/Nathan don't file it as a bug.

### 6. (Info) `userInteraction` semantics on Android

`CameraChangeTracker.isUserInteraction` is `reason == USER_GESTURE || reason == DEVELOPER_ANIMATION`.
This is the same flag the existing `onRegionWillChange` at :531 already trusts to distinguish
gestures from the component's own camera pushes (Cycle 020, working on device), so reading it on
`onRegionDidChange` adds no new assumption. Noted only because the brief says "userInteraction is
true" as if it were gesture-only.

### 7. (Cosmetic) Compass dim test `(userBearing ?? effectiveBearing) === 0`

A hand-rotation back to "north" will read e.g. `0.3` or `359.7`, never exactly 0, so the glyph
stays bright. Suggest a tolerance (`Math.abs(((b % 360) + 360) % 360) < 1` or similar). Purely
cosmetic; the compass tap sets exactly 0 so the primary path is fine.

## Test sanity (item 7)

The six specified tests are meaningful, not tautological:
- `userBearing` overrides `bearing` in follow (here set, bearing 90, userBearing 47 → 47) —
  exercises the `??` composition on the follow branch.
- `userBearing` overrides the fit pin (47 → 47; 0 → 0; null/undefined → 0) — the null/undefined
  arm is the backward-compat proof and complements, not duplicates, the existing :459 test.
- free mode still `{}` with `userBearing` — guards the branch order (free must be checked before
  composition matters).
- `rotateEnabledFor` full 8-cell matrix — pins the scope rule including the §6.1 judgment
  (`live×finished → true`), one assertion to flip if Nathan overrules.
- Two source-grep guards follow the exact doctrine and slice anchors of routemap_suite.ts:244–275
  (`<M.Map` → `<M.Camera`), and the zoom-bar slice anchors (`st.zoomBar` ×2, `<Credit rung="maplibre"`,
  `MAP IMAGE FAILED`) all resolve uniquely in the current file.
One note: `MapLibreRouteMap` defaults `liveState` to `'moving'` (:322) — `rotateEnabledFor('browse','moving')`
must be `true`, which the matrix covers.

## Confidence

High. Every line number, prop name, type, native payload field and caller site in the brief was
read directly from the working tree and from the installed `@maplibre/maplibre-react-native@11.3.6`
sources (TS, Android Kotlin, iOS ObjC/ObjC++). Not verified: actual on-device gesture behaviour
(ScrollView vs rotate gesture on the ROUTES cards, animation queue ordering when the declarative
and imperative pushes coincide in Finding 5) — those remain on the brief's device checklist, which
is the right place for them. No files were edited other than writing this report.
