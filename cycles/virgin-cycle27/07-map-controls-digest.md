# Map controls digest (cycle27 idea 8)

Date: 2026-10-08. Digest only: no code, test or doc was edited, nothing was run. Source: `app/` on the device, read as-is. Anchors are current-tree line numbers; `wayMapView.tsx` line numbers were checked against grep and sed output in this session.

## TL;DR
1. The MAP tab map (`catalogMapView.tsx`) shows only `+`, `−` and `⤢` (FIT). It has no ME, no north arrow and no rider.
2. Two-finger rotate is off there because of one explicit prop, `touchRotate={false}` (`catalogMapView.tsx:263`). No decision doc explains it. The MapLibre default is on.
3. The "arrows" Nathan saw are most likely the `⤢` glyph (inference). No other arrow controls exist in `src/ui`.
4. Every other map uses `WayMapView`, with `+`, `−`, `FIT`/`ME`, and `↑` (north reset) only when rotation is enabled (browse, prestart, finished).
5. Code fact: `FIT` and `ME` keep a rider's two-finger rotation (`userBearing`); only `↑` clears it (`wayMapView.tsx:489-498`). The premise "ME/FIT already rotates the map properly" holds only if the map was never rotated.
6. Cycle24 brief 03 specifies the MAP tab zoom bar as "+ / − / FIT only ... no ME, no compass" (`cycles/virgin-cycle24/03-brief-map-tab.md:164`). Nathan's cycle27 idea 8 asks to change this.

## Table: map inventory

| map | buttons (top to bottom) | rotate gesture enabled? | file:line |
|---|---|---|---|
| RECORD armed/prestart (`WayMapView` variant live, liveState prestart; two mounts) | `+`, `−`, `FIT`/`ME`, `↑` | yes (prestart) | `RecordScreen.tsx:1267-1275`, `:1535-1543`; `wayMapView.tsx:412`, `:979-1015` |
| RECORD live ride (`WayMapView` variant live, zoom 4) | `+`, `−`, `FIT`/`ME`; no `↑` while moving/stopped | no while moving/stopped | `RecordScreen.tsx:1416-1425` (liveState not in excerpt, see Unverified) |
| REPLAY (`WayMapView` variant live, zoom 4) | depends on liveState passed (not in excerpt) | depends | `ReplayScreen.tsx:232-245` |
| DEMO (`WayMapView` variant live; running = moving, finished = finished) | running: `+`, `−`, `FIT`/`ME`; finished: all four | running no; finished yes | `DemoScreen.tsx:663-667` |
| RIDE DETAIL map (browse, showRider false) | `+`, `−`, `FIT` (label always FIT), `↑` when rotated-enabled | yes | `RideDetailScreen.tsx:450-460`; browse maps `:499`, `:511`, `:527` |
| CATALOG DETAIL way map and place mini-map (browse, showRider false) | `+`, `−`, `FIT`, `↑` | yes | `CatalogDetailScreen.tsx:236-245`, `:408` |
| GATE ADJUST card map (browse, showRider false, tap-to-select gates) | `+`, `−`, `FIT`, `↑` | yes | `gateAdjustCard.tsx:147-156` |
| ACTIVITIES card map (`gestures="readonly"`) | none (zoom bar hidden, drag and pinch off) | no | `activityCard.tsx:38`, `:87-97`; `wayMapView.tsx:979` (`oneFingerOn ?`), `:731` (pointerEvents none) |
| MAP tab (`CatalogMapView`, RoutesScreen) | `+`, `−`, `⤢` (sets FIT); no ME, no `↑`, no rider | NO (`touchRotate={false}`) | `RoutesScreen.tsx:89-99`; `catalogMapView.tsx:255-264`, `:338-351` |
| Place picker | none found: no separate map component besides those above | n/a | grep of `src/ui` |

Both components render the zoom bar with `st.zoomBar` at top-right (`top: 6, right: 6`). Each zoom button is 30 pt (`wayMapView` `st.zoomBtn`; `catalogMapView.tsx:365-370`). The "i" credit button (`Credit`, `wayMapView.tsx:342`; `catalogMapView.tsx:352`) is a separate control, bottom-right, not in the zoom bar.

## 1. Button inventory and the component that renders each

- Shared cluster: `src/ui/wayMapView.tsx`, `MapLibreWayMap`, zoom bar `:979-1015`.
  - `+`: `setCamZoom(z+1), setMode('follow')`, clamped to 18 (`:982-984`).
  - `−`: `setCamZoom(z-1), setMode('follow')`, clamped to 11 (`:986-988`).
  - `FIT`/`ME`: one button, `onPress={() => setMode(fitMeNext)}` (`:996-1000`). Label is literal JSX text `FIT` (`:998`) or `ME` (`:1000`), font 10.5 (`:999`, `:1001`), colour `textDim`.
  - `↑`: rendered only when `rotateEnabled` (`:1007`). `onPress={resetNorth}` (`:1009`), `accessibilityLabel="Reset map to north up"` (`:1010`), glyph `↑` (`:1014`), rotated by `-(userBearing ?? effectiveBearing)` deg and dimmed when that is 0 (`:1012-1013`).
- MAP tab: `src/ui/catalogMapView.tsx`, own zoom bar `:338-351`, not shared with `WayMapView`.
  - `+`: `zoomBy(1)` (`:339-342`). `−`: `zoomBy(-1)` (`:343-346`). `zoomBy` sets `mode` to `free` and calls `cameraRef.zoomTo(clamp 3..18 of liveZoom ?? 14)` (`:235-238`). So `+`/`−` do not re-centre on anything.
  - `⤢`: `onPress={() => setMode('fit')}` (`:347-350`). The glyph is U+2922 (no letters, no allow-list entry). No accessibilityLabel.
- Mapping of rider-visible text: `FIT` and `ME` (`tests/ui-strings.allow.json:3624`, `:3632`), accessibilityLabel "Reset map to north up" (`:3462`), "map unavailable" (`:3656`), "waiting for GPS" (`:3664`). No allow-list entries for `+`, `−`, `⤢`, `↑` glyphs (grep of the file). The catalog view has three allow-list entries, all technical literals: `Noto Sans Regular` (`:1447`) and two OpenFreeMap style URLs (`:1455`, `:1464`).

## 2. The MAP tab's controls in detail

- What `⤢` does: `setMode('fit')`. In `fit` the camera target is `cameraTargetFor({mode:'fit', bounds, bearing: 0})` with padding 48, bottom padding 300 while the sheet is open (`catalogMapView.tsx:163-169`). It fits bounds only. There is no follow mode and no rider on this map.
- Why no ME: `showRider` is not passed, and this component has no follow concept. The brief says so: "no ME, no compass" (`cycles/virgin-cycle24/03-brief-map-tab.md:164`). The brief also says the `FIT` text is replaced by the `⤢` glyph "so no letters" (same line), which avoids a new allow-list entry.
- Why "arrows": no pan arrows exist. The only arrow-like glyphs in `src/ui` are `↑` (`wayMapView.tsx:1014`) and `⤢` (`catalogMapView.tsx:349`). `↑` is absent from the MAP tab. The MAP tab's visible "arrow" is therefore most likely `⤢` (inference).
- Mode state: `mode` is `'fit' | 'free'` (`catalogMapView.tsx:156`). It resets to `fit` on every focus change and style remount (`:160-162`). `onRegionWillChange` with `userInteraction` sets `free` (`:248-250`). `onRegionDidChange` reads zoom only, not bearing (`:251-254`, `RegionDidChangeEvent` at `:94`).
- Cycle24 text on controls: brief 03 §4.2 (`cycles/virgin-cycle24/03-brief-map-tab.md:164`) "zoom bar with + / − / FIT only ... no ME, no compass". Decision D13 (`:40`) covers the camera (`bearing: 0`). `00-nathan-decisions.md` does not mention controls. No cycle24 doc mentions rotation or the MAP tab's touchRotate.

## 3. Gesture config of each map

MapLibre props, as written:

| map | dragPan | touchZoom | doubleTapZoom / HoldZoom | touchRotate | touchPitch | compass | file:line |
|---|---|---|---|---|---|---|---|
| WayMapView (all non-activity maps) | `oneFingerOn` (gestures full) | `pinchOn` (gestures != readonly) | `oneFingerOn` | `rotateEnabled` | false | false | `wayMapView.tsx:398-400`, `:766-775` |
| WayMapView gestures="readonly" (ACTIVITIES card) | off | off | off | off | false | false | `activityCard.tsx:38`; `wayMapView.tsx:731` (pointerEvents none) |
| MAP tab (CatalogMapView) | true | true | true / true | **false (literal)** | false | false | `catalogMapView.tsx:258-264` |

Race and rotate rule in WayMapView:
- `rotateEnabledFor(variant, liveState)` = `browse || prestart || finished`; false for moving/stopped (`wayMapGeo.ts:460-465`). Called as `rotateEnabled = rotateEnabledFor(...) && oneFingerOn` (`wayMapView.tsx:412`).
- Cycle020 relaxed race-mode gestures for pan and zoom only; the comment says so (`wayMapView.tsx:49-53`). Rotation was explicitly kept off while racing (`:747-752`, `:774`).
- `userBearing` is cleared to null whenever `rotateEnabled` becomes false (`wayMapView.tsx:479`). So starting a ride drops any manual rotation.
- Camera bearing sources: `effectiveBearing` = 0 for browse/prestart, else `bearing` (course-up, updated from fixes once 8 m moved, `:191-193`, `:444-460`, `:463`). `cameraTargetFor` takes `userBearing ?? bearing` (`wayMapGeo.ts:427-428`).

Why rotate is off on the MAP tab (code shows, rationale not found):
- The only cause is the literal `touchRotate={false}` at `catalogMapView.tsx:263`.
- The bearing is not forced by the camera: `cameraTargetFor` gets `bearing: 0` (`catalogMapView.tsx:165`). `fit` pins 0 (`wayMapGeo.ts:433`). `free` returns `{}` (`:429`).
- No `userBearing` state, no `resetNorth`, no `↑` in this component. So even with rotation on, nothing could bring it back to north except `⤢` (which fits bounds with bearing 0 and would un-rotate the map). This last point is an inference from code, not a device test.
- MapLibre's own default for `touchRotate` is true (`app/node_modules/@maplibre/maplibre-react-native/lib/typescript/module/components/map/Map.d.ts:292-294`, "@defaultValue true").

## 4. ME/FIT and the north arrow

ME/FIT (`WayMapView` only):
- Label rule: `fitMeNextMode(mode, showRider)` returns `'follow'` (label ME) when `showRider && mode !== 'follow'`, else `'fit'` (label FIT). It depends only on `mode`, not on the GPS fix (`wayMapGeo.ts:481-483`; doc `:467-480`). On `showRider={false}` maps it is always FIT.
- `fit` target (`wayMapGeo.ts:430-436`): bounds fit, `bearing: userBearing ?? 0`, padding 20. So FIT gives north only when no manual rotation is held.
- `follow` target (`wayMapGeo.ts:437-441`): centred on the fix at `camZoom`, `bearing: userBearing ?? effectiveBearing`, duration 500. With no fix it centres the bounds midpoint, or returns `{}` when there are no bounds. So ME gives course-up while moving/stopped, north on browse/prestart (`effectiveBearing` = 0), and the held course-up bearing on finished (`wayMapView.tsx:463`).
- `free` target: `{}` (`wayMapGeo.ts:429`). Set by a drag, pinch or rotate (`wayMapView.tsx:754-756`).
- States the button toggles between: `follow` (label FIT), `fit` or `free` (label ME), except browse surfaces where it is always FIT.

North arrow `↑` (`wayMapView.tsx:1007-1015`):
- Shown only when `rotateEnabled` (browse, prestart, finished). Hidden during moving/stopped. The comment says it is shown even when already north-up, dimmed (`:1002-1006`).
- `resetNorth` (`:489-498`): `setUserBearing(0)`, then `cameraRef.setStop({bearing: 0, duration: 400})`. The declarative push then keeps 0.
- The only writers of `userBearing`: the gesture read-back (`:754-763`, gated on rotateEnabled and userInteraction), `resetNorth` (`:490`), and the rotate-off clear (`:479`).

What would be lost if `↑` were removed (facts from code):
1. After any two-finger rotate on a browse, prestart or finished map, nothing else returns the map to north. ME and FIT both keep the rotation (`wayMapGeo.ts:427-428` and `:433`). The rotation holds until the rider taps `↑` or the ride goes moving/stopped (clear at `wayMapView.tsx:479`).
2. Finished maps: ME shows the held course-up bearing, not north. FIT shows north only when no rotation is held. So `↑` is the only north reset there after a rotate.
3. On browse maps with no prior rotation, FIT already gives north (`wayMapGeo.ts:433`). This is the part of Nathan's premise that holds.
4. Maps without `↑` today: the MAP tab (no rotation at all) and the ACTIVITIES card (readonly, no buttons). Removing `↑` changes neither.
5. Inference, not device-tested: `onRegionDidChange` (`wayMapView.tsx:754-763`) sets `userBearing` from any user-driven region change while `rotateEnabled`, including a one-finger drag. On a finished map (course-up held, e.g. 73 deg) a drag would therefore freeze the held bearing as the rider's rotation, and ME/FIT would keep it.

## 5. Tests, allow-list entries, docs

Tests (no test asserts the MAP tab's controls or `touchRotate`):
- `app/tests/waymap_suite.ts:301-316`: `touchRotate={rotateEnabled}` wiring, `touchPitch={false}`, `onRegionDidChange` present.
- `app/tests/waymap_suite.ts:319-331`: exactly one `onPress={resetNorth}` in the MapLibre zoom bar (virgin-cycle22 05).
- `app/tests/waymap_suite.ts:387-403`: one FIT/ME toggle, `fitMeNextMode` imported and used.
- `app/tests/waymapgeo_suite.ts:468-481`: `cameraTargetFor` with `userBearing` override and `userBearing: 0` pin.
- `app/tests/waymapgeo_suite.ts:495-504`: `rotateEnabledFor` matrix (browse/prestart/finished true, live moving/stopped false).
- `app/tests/waymapgeo_suite.ts:584-591`: `fitMeNextMode` table.
- `app/tests/catalogmap_suite.ts`: checks bounds, font stack (`:228`) and `stopPropagation` (`:232`). No test of the zoom bar, `touchRotate`, or `⤢`.

Allow-list entries (`app/tests/ui-strings.allow.json`):
- `wayMapView.tsx`: "Reset map to north up" (attr:accessibilityLabel, `:3462`), "FIT" (`:3624`), "ME" (`:3632`), "map unavailable" (`:3656`), "waiting for GPS" (`:3664`).
- `catalogMapView.tsx`: "Noto Sans Regular" (`:1447`), two OpenFreeMap URLs (`:1455`, `:1464`). Entries for `BACK TO MAP` are in `CatalogDetailScreen.tsx` (cycle24 03).

Docs:
- `cycles/virgin-cycle22/06-fit-me-single-toggle.md:62` describes the zoom-bar order as "+, −, FIT, ↑, ME". That is pre-change text. Current code is `+`, `−`, `FIT`/`ME`, `↑` (`wayMapView.tsx:979-1015`). Treat the doc as stale.
- `cycles/virgin-cycle22/05-retire-png-fallback-rung.md:77` lists the same bar as `+`, `−`, FIT, compass, ME.
- `STATE.md:151`: "two-finger map rotation (WP-M)" is listed as shipped.
- `cycles/virgin-cycle27/00-nathan-ideas.md:14` (row 8) and `:106-111` (Nathan's words, 2026-10-08 01:08): MAP tab has no free two-finger rotate, "arrows instead of ME/FIT", wants only `+`, `−`, ME/FIT, and retire `↑` on all maps because "pressing the ME/FIT button already rotates the map properly".
- No cycle doc records a decision on rotation for the MAP tab.

## Unverified / uncertain

- "Arrows" = `⤢`: inference from the glyph set. Nathan's screen was not checked. If he means the `↑` on other maps, the MAP tab would have to be a map that does show `↑`, which none does.
- Rationale for `touchRotate={false}` at `catalogMapView.tsx:263`: no comment, doc or test found. Not known whether it was deliberate for the overview, or copied.
- MapLibre native behaviour: the prop meanings are read from the TypeScript docs (`Map.d.ts:292-294`), not from the native source. A two-finger twist with `touchRotate={false}` is inferred to be disabled, not device-tested. The device cannot be reached from this digest.
- RECORD live map at `RecordScreen.tsx:1416` and the REPLAY map at `ReplayScreen.tsx:232`: `liveState` is not in the excerpt read, so their button sets for moving/stopped/finished were not checked.
- The drag-freezes-bearing effect on finished maps (section 4, item 5) is a code-read inference only.
- Whether the MapLibre zoom bar on browse maps' `+`/`−` (which set `follow`) re-centres on the way midpoint at `camZoom` (state starts at 16, not at the `zoom` prop) was read from code only.
- Whether the ui-strings scanner ignores symbol-only literals (`+`, `−`, `⤢`, `↑`) was not run. The allow-list has no entries for them.
- The test suite was not run; no test results are asserted here.
- cycle24 brief 03 §4.2 is a planning doc; whether the executor's shipped MAP tab matches it was checked only by the current code above.
