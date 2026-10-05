# D10 — Merge FIT and ME into one toggle, label with the action the next tap performs

## 1. MapLibre-rung zoom bar in wayMapView.tsx

**Lines 897–932:** The zoom bar (st.zoomBar style, st.zoomBtn per button, st.zoomText text style). Four buttons: `+`, `−`, `FIT`, and conditionally `ME`.

**Button breakdown:**
- **`+` button (line 899–902):** `onPress={() => { setCamZoom((z) => Math.min(18, z + 1)); setMode('follow'); }}` — increments zoom (capped at 18), sets mode to 'follow'.
- **`−` button (line 903–906):** `onPress={() => { setCamZoom((z) => Math.max(11, z - 1)); setMode('follow'); }}` — decrements zoom (floored at 11), sets mode to 'follow'.
- **`FIT` button (line 907–910):** `onPress={() => setMode('fit')}` — sets mode to 'fit' only.
- **ME button (line 920–927, conditional on `showRider`):** `onPress={() => setMode('follow')}` — sets mode to 'follow' only, rendered only when `showRider` is true (line 920 condition).

**Compass reset button (line 912–918):** Conditionally rendered when `rotateEnabled` is true; resets bearing to 0; text colour reflects current bearing (dim at 0, coloured otherwise).

**Styling:** All buttons use `st.zoomBtn` style (st. is the styles object), text colour varies (t.text for `+`/`−`, t.textDim for FIT/ME/compass). ME button uses `fontSize: 10.5` like FIT (line 925).

## 2. The `mode` state: declaration, every setMode call, defaults, effects

**Declaration:** Line 391 in MapLibreWayMap: `const [mode, setMode] = useState<'follow' | 'fit' | 'free'>(initialMode);`

**Initial value:** Line 390–391: `const initialMode: 'follow' | 'fit' | 'free' = mode ?? 'follow';` (`mode` prop default is 'follow' when omitted, line 376 in function signature).

**Every setMode call in MapLibreWayMap:**
- Line 399: `setMode(initialMode)` — on `mode` prop change (useEffect dependency, line 398)
- Line 663: `setMode('free')` — on `onRegionWillChange` with `userInteraction` (drag/pinch gesture)
- Line 899, 903: `setMode('follow')` — from `+`/`−` zoom buttons
- Line 907: `setMode('fit')` — from FIT button
- Line 927: `setMode('follow')` — from ME button

**Reads of mode:**
- Line 382: `const rotateEnabled = rotateEnabledFor(variant, liveState)` — doesn't read mode directly; rotateEnabledFor depends on variant/liveState only
- Line 620: `const cameraProps: Partial<CameraStop> = cameraTargetFor({mode, here, bounds, ...})` — passed to cameraTargetFor

**Effect that resets mode:**
- Line 398–399 useEffect: if the `mode` prop changes (from parent), reset `mode` state to match. No automatic resets on route/liveState changes.

**PNG rung has no mode state:** Line 952–953 in PngWayMap: `const [zoom, setZoom] = useState(props.zoom ?? 4)` — no mode, only zoom level.

## 3. cameraTargetFor and rotateEnabledFor in wayMapGeo.ts: behaviour per mode

**cameraTargetFor (lines 415–446):**
Receives `{mode, here, bounds, zoom, bearing, userBearing?}`.

- **mode === 'free':** Returns `{}` (no camera update, user controls fully)
- **mode === 'fit' && bounds exists:** Returns `{bounds: [minLon, minLat, maxLon, maxLat], bearing: userBearing ?? 0, padding: {20px all}, ...}` — fits the route bounds to screen, resets bearing to 0 unless userBearing is set
- **mode === 'fit' && no bounds:** Falls through to `if (here)` or `if (bounds)` below, but bounds is falsy, so returns `{}` (camera frozen)
- **mode === 'follow' && here (rider location) exists:** Returns `{center: [lon, lat], zoom, bearing, pitch: 0, duration: 500}` — centers on rider, applies the calculated bearing (userBearing or input.bearing), 500ms duration animation
- **mode === 'follow' && no here but bounds exists:** Returns center of bounds instead, same bearing/pitch/duration
- **mode === 'follow' && neither here nor bounds:** Returns `{}` (camera frozen)

**rotateEnabledFor (lines 460–474):**
Receives `(variant: 'live' | 'browse', liveState: 'prestart' | 'moving' | 'stopped' | 'finished')`.
Returns true if `variant === 'browse' || liveState === 'prestart' || liveState === 'finished'` (rotation on everywhere except moving/stopped races). Two-finger rotation is off during active race (moving/stopped).

**Bearing/course-up per mode:** Not mode-dependent. Line 457–461 in MapLibreWayMap computes `effectiveBearing` (course-up during moving/stopped, 0 otherwise), then passes `userBearing ?? effectiveBearing` to cameraTargetFor. userBearing overrides both (set by two-finger rotation), persisting until another gesture or mode change.

**GPS fix handling:** `cameraTargetFor` doesn't distinguish "no fix yet" from "fix exists but other constraints". Line 618–623 in MapLibreWayMap: `here` is null when `!showRider || liveState === 'prestart'` (line 614), so 'follow' mode with no fix falls through to bounds-center or returns `{}` (line 443).

## 4. PNG rung's own FIT/zoom bar (reference only)

**Lines 1132–1150 in PngWayMap:** `+`/`−` buttons adjust the `zoom` state (line 952), FIT sets `zoom(1)`. No ME button (PNG rung has no 'follow' mode, no rider tracking). Three-button bar: `+`, `−`, `FIT`.

## 5. Tests and ui-strings.allow.json entries

**Tests touching buttons/modes:**
- tests/waymap_suite.ts (search for FIT, ME, zoomBar, mode, cameraTargetFor, rotateEnabledFor): line 335–349 checks PngWayMap's zoom bar (FIT presence, no resetNorth, Credit mounts); no explicit mode tests found in waymap_suite.
- grep -rn "setMode\|mode === 'follow'\|mode === 'fit'" app/tests/*.ts: No isolated mode-switching tests found; mode is tested implicitly through cameraTargetFor tests (if they exist).

**ui-strings.allow.json entries:**
- "FIT" — button label (line 910, short text, already in allow-list)
- "ME" — button label (line 925, short text, already in allow-list)
- "Reset map to north up" — accessibility label for compass button (line 916, already in allow-list as accessibilityLabel)

**Verify:** All three string entries already exist in allow-list (not new); no "action" descriptors like "FIT to route" vs current state needed yet.

## 6. Everywhere else "FIT"/"ME" appear

**app/src searches (grep -rn "FIT\|ME" app/src --include="*.tsx" --include="*.ts"):**
- wayMapView.tsx lines 907, 910, 925, 927 (zoom bar buttons, covered above)
- No other text-label uses of "FIT" or "ME" found outside wayMapView.tsx zoom bar

**Docs/design/product:** State.md, OPEN-ITEMS.md, design/ — no FIT/ME-specific docs beyond cycle 22's README decision.

## 7. Layout: zoomBar and overlays in the frame

**wayMapView.tsx Map/MapLibre container dimensions:**
- Line 347–348 in MapLibreWayMap: `{flex: 1}` or fixed height (240–400px depending on variant)
- Zoom bar: `position: 'absolute'` (implied by st.zoomBar; common pattern in react-native)

**Absolutely positioned overlays (all MapLibre rung):**
- **Credit button (line 936):** bottom-right corner (small "i" button, st.creditBtn implies `{position: 'absolute', right: 6, bottom: 6}` or similar, virgin-cycle14 brief 05)
- **Zoom bar (lines 897–932):** likely left side or bottom-left, `position: 'absolute'` (not shown in snippet, but standard)
- **Off-route badge (line 941):** `position: 'absolute'` (st.badge implies absolute), visible when off-route
- **GPS warning/other badges:** position varies

**PNG rung overlays (PngWayMap lines ~1132–1156):**
- Zoom bar (lines 1132–1150): similar positioning to MapLibre
- Badges (lines 1016–1026, 1149–1151): place-unsupported, map-failed, off-route
- Credit button (line 1154): conditional on `!imgFailed && img`

**Height budget:** Each zoom bar button is roughly 40–50pt (st.zoomBtn style not visible, assumed standard); full bar width ~200–250pt. No height saving from collapsing FIT+ME into one button at this resolution, but **state visibility changes** (label reflects next action vs. current state).

## Unknowns / could not determine:

- Exact px dimensions of st.zoomBar and st.zoomBtn (style definitions in a separate stylesheet, not in the file excerpt)
- Whether mode is ever set to 'fit' with no bounds (expected to be frozen, but no explicit test found)
- Current tests for `cameraTargetFor` with mode transitions (search found no explicit "expect mode 'follow' with no fix" tests; may be implicit in integration tests)
- How the compass button bearing text rotates (transform: [{ rotate: `${...}deg` }] implies CSS transforms, but exact rendering on React Native not verified)
- Whether the `initialMode` prop is ever passed from callers, or if all callers rely on the 'follow' default (search of all callers shows no mode prop passed; all default to 'follow' at startup)


---
## COORDINATOR ERRATA (2026-10-05, checked against code by the coordinator; supersedes anything above that conflicts)
- §7 Layout is GUESSED by the digester and WRONG. Real: `st.zoomBar = { position: 'absolute', right: 6, top: 6, gap: 5 }` (wayMapView.tsx:1176), a vertical stack at the
  TOP-RIGHT; `st.zoomBtn = { width: 30, height: 30, borderRadius: 8, borderWidth: 1 }` (1177-1180); `zoomText fontSize 17`, FIT/ME text is `fontSize: 10.5`.
  Merging FIT+ME frees 30 + 5 = 35 pt of bar height on live surfaces (browse surfaces have no ME). The "no height saving" sentence above is wrong.
- `cameraTargetFor` and `rotateEnabledFor` live in app/src/ui/wayMapGeo.ts (lines 415 and 460), not in wayMapView.tsx.
- INITIAL mode is not always 'follow': wayMapView.tsx ~389-391 sets `initialMode` = 'follow' in some case, else `(props.zoom ?? 4) <= 1 ? 'fit' : 'follow'`
  (zoom 1 = whole route -> starts in 'fit'; zoom 4 = live crop -> 'follow'). So the toggle label at first render depends on this (RECORD prestart starts in 'fit' -> label "ME").
- Anchors above in this digest may be off by a few lines; verify the exact line before quoting it in a brief.
