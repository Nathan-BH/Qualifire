# Digest 01: gate chips do not pan the map (gate-adjust screen)

Date: 2026-10-09
Scope: read-only digest of the gates-saving / gate-adjust screen. Question: when a rider selects a gate with the chip buttons below the map, the map does not move to that gate. Map taps on a gate tick do the same selection and also do not move the map. Code only, no edits. Anything not read directly is marked (inferred).

## TL;DR
1. The screen is `GateAdjustScreen.tsx`, which embeds `GateAdjustCard` (`gateAdjustCard.tsx`), which embeds `WayMapView` (`wayMapView.tsx`, MapLibre rung). The same card is also used by RecordScreen, RideDetailScreen and DemoScreen.
2. Selection is one piece of local state, `selected: number | null` in `gateAdjustCard.tsx:72`. Both a chip tap (`:167`) and a map gate-tick tap (`:155`, via `nextGateOnTap` in `wayMapView.tsx:920-928`) only call `setSelected`.
3. No code moves, animates or fits the camera on selection. The only `M.Camera` push is `cameraProps` (`wayMapView.tsx:715-725`, `:794`), and that depends only on `mode`, the rider fix, bounds and zoom, never on the selected gate. The imperative `cameraRef` is used only for the north-up reset (`:504`). Neither path differs in camera behaviour.
4. Reusable pieces exist: `cameraTargetFor` (`wayMapGeo.ts:422`), `wayBounds` (`:105`), `placeBounds` (`:169`), and an imperative `cameraRef.setStop` / `zoomTo` pattern (`wayMapView.tsx:504`, `catalogMapView.tsx:237`). But `WayMapView` exposes no ref and no focus prop, so a fix needs a new input (for example a `focusGateIdx` prop) plus a camera target for a single gate.
5. Each gate exposes `name`, `lat`, `lon`, `px`, `py` (`wayMapMath.ts:24-30`). Chainage is not on the gate object. It lives in the card's `chainageM` array (`gateAdjustCard.tsx:71`).
6. Tests: none assert camera movement on selection. Coverage is `gateseeding_suite.ts` (clamp, nextGateOnTap), `waymapgeo_suite.ts` (cameraTargetFor), `waymap_suite.ts` (source-shape asserts), `recordflow_suite.ts:314-317` (strings), and `demo_suite.ts:614-656`.

## 1. Files and map component

- `app/src/ui/GateAdjustScreen.tsx` (137 lines). Full-screen host, mounted by `app/App.tsx:211` when `gateAdjust` is set (`App.tsx:89`). It opens from `CatalogDetailScreen.tsx:165` (`tabNav.openGateAdjust({ wayId })`).
  - `draft` from `gateEditDraftFor(request.wayId)` at `:39`.
  - `mapHeight = Math.max(280, Math.round(winH * 0.5))` at `:49`, passed at `:119`.
  - Card rendered at `:112-125` with `subtitle="Tap a gate to move it"` (`:121`), `onKeep` (`:123`), `onSave` (`:124`).
- `app/src/ui/gateAdjustCard.tsx` (235 lines). Props at `:42-63`. Component at `:69`. Builds the asset with `buildRuntimeWayAsset(props.refLine, chainageM, 'gate-card')` at `:80-83` (rebuilt on every nudge). Renders `WayMapView` at `:147-156`, a chip row at `:159-178`, a nudge pad at `:180-194`, and the save/keep button at `:196-204`.
- `app/src/ui/gateAdjustModel.ts` (95 lines). Pure helpers: `isAdjustable` (`:35`), `gateName` (`:39`, START / G<n> / FINISH), `clampNudge` (`:52`), `fmtChainage` (`:68`), `fmtPct` (`:77`), `nextGateOnTap` (`:90`).
- Other hosts of the same card: `RecordScreen.tsx:1335`, `RideDetailScreen.tsx:617`, `DemoScreen.tsx:727`. A change to the card affects all four.
- Map: `app/src/ui/wayMapView.tsx` (1088 lines). Exports `default function WayMapView` (`:319`). It renders `MapLibreWayMap` (`:397`) on the `@maplibre/maplibre-react-native` `M.Map` and `M.Camera`. The PNG rung is retired (header, `:1-9`), and an offline style falls back to `offlineMapStyle`.
- Props relevant here: `wayId` (`:222`), `asset` (`:228`, caller-owned drawable, used by DemoScreen only), `variant` (`:264`), `showRider` (`:271`), `gateSelect` (`:306`), `gestures` (`:316`). There is no `ref` prop and no focus / center prop.
- The card calls `WayMapView` with `variant="browse"`, `showRider={false}`, `lat={null}`, `lon={null}`, and `gateSelect={{ selected, onPress }}` (`gateAdjustCard.tsx:147-156`).

## 2. Stored state and handlers

- State: `const [selected, setSelected] = useState<number | null>(null)` at `gateAdjustCard.tsx:72`. Gate positions are `chainageM` (`:71`).
- Map tap:
  - `gate-ticks` GeoJSONSource `onPress` at `wayMapView.tsx:920-929`. It maps every hit feature name to a gate index via `asset.gates.findIndex` (`:923-925`), then calls `nextGateOnTap(hits, selected)` (`:927`) and `props.gateSelect.onPress(idx)` (`:928`).
  - Card callback at `gateAdjustCard.tsx:155`: `onPress: (i) => setSelected((cur) => (cur === i ? null : i))`. A second tap on the same gate deselects it.
  - Hit box is 24 px on each side (`wayMapView.tsx:930`). Gate ticks use `hitbox`, and the MapLibre rung only (PNG rung retired, see header).
- Button tap:
  - Chip `Pressable` at `gateAdjustCard.tsx:163-168`: `onPress={() => setSelected((cur) => (cur === i ? null : i))}`. Disabled while `props.busy`.
  - Chip label is `gateName(i, n)` (`:173`).
- Neither handler touches the map camera or the `WayMapView` ref.
- Ring for the selected gate: `gateSelectedFC` at `wayMapView.tsx:647-654` (uses `asset.gates[sel]`, `riderFeature`), drawn by the `gate-selected` source / `gate-selected-ring` layer at `:941-957`. This is the only visual result of selection.
- Nudge pad (only visible when `selected !== null`, `gateAdjustCard.tsx:180-190`) calls `nudge` (`:88-95`), which uses functional `setChainageM`. A nudge changes `chainageM`, which rebuilds `asset` (`:80-83`) and re-places the ring and ticks. The camera is still not moved.

## 3. Does any code move the camera on selection?

None found.

- The only camera-driving code for `WayMapView` is `cameraTargetFor(...)` at `wayMapView.tsx:715-725`, spread into `<M.Camera ref={cameraRef} {...cameraProps} />` at `:794`. Its inputs are `mode`, `here` (rider fix; null on browse), `bounds`, `zoom: camZoom`, `bearing`, and `userBearing`. Selection is not among them.
- `cameraTargetFor` (`wayMapGeo.ts:422-454`):
  - `free` returns `{}` (`:436`).
  - `fit` with bounds returns the whole-route bounds with padding 20 (`:437-443`).
  - Otherwise it centres on `here` (`:444-446`) or on the bounds midpoint (`:447-451`).
- Browse maps start in `mode = 'fit'` (`wayMapView.tsx:426-427`). The bounds are `wayBounds(asset)` (`wayMapGeo.ts:105-118`), i.e. the whole path, not the gate.
- `mode` changes only via: the mode-reset effect on `[props.zoom, variant, phaseKey, props.wayId]` (`:437-440`); the remount effect on `[mapStyleKey]` (`:577-580`); `onRegionWillChange` with `userInteraction` sets `'free'` (`:760-762`); the zoom-bar `+`, `-`, FIT/ME buttons (`:1006-1024`). Gate selection is absent from all of these.
- `cameraRef` is used only for the north-up compass reset: `cameraRef.current?.setStop({ bearing: 0, duration: 400, easing: 'ease' })` at `:504`.
- Difference between the two paths: none for the camera. Both only set `selected`.
- Side note (inferred): in `fit` mode (before any drag) every re-render re-pushes the whole-route bounds, so a chip tap or nudge does not move anything visible. After a drag, `mode` is `'free'` and no push occurs, so a dragged view is preserved across chip taps.

## 4. Reusable camera helpers and gate coordinates

Helpers that exist:
- `cameraTargetFor` (`app/src/ui/wayMapGeo.ts:422`). Modes are `fit`, `follow` and `free`. A gate-centred view could reuse the `here` branch (`:444-446`), which emits `center`, `zoom`, `pitch: 0`, `duration: 500` (inferred: only if passed the gate point as `here`, which would mislabel it as the rider).
- `wayBounds` (`wayMapGeo.ts:105`) and `trailBounds` (`:122`) return `LonLatBoundsBox`.
- `placeBounds(lat, lon, radiusM, pad = 1.6)` (`wayMapGeo.ts:169`) builds a padded box around one point. Its doc says it is for a place disc, but the geometry is generic (inferred).
- `fitMeNextMode` (`wayMapGeo.ts:488`) is zoom-bar state logic, not a pan helper.
- Imperative camera calls elsewhere: `cameraRef.current?.setStop(...)` at `wayMapView.tsx:504`; `cameraRef.current?.zoomTo(level, { duration: 300 })` at `app/src/ui/catalogMapView.tsx:237`. `catalogMapView.tsx:158` declares its own `cameraRef`, and `:160-169` sets its camera props from `cameraTargetFor` with `mode: 'fit'` and padding.
- `WayMapView` has no `ref` forwarding and no focus prop. `cameraRef` is local to `MapLibreWayMap` (`wayMapView.tsx:484`). A fix would need a new input (for example `focusGate?: number | null` in `WayMapProps`) and a `useEffect` that pushes a camera stop via `cameraRef.current?.setStop(...)`. This is a suggestion only, not a design.

Gate coordinates:
- `WayGate` (`app/src/ui/wayMapMath.ts:24-30`): `name: string; lat: number; lon: number; px: number; py: number`.
- `WayAsset.gates: WayGate[]` (`wayMapMath.ts:46`). Gates are in path order, with `name` from `gateName`.
- Gate chainage is not on `WayGate`. It is in `chainageM` in the card (`gateAdjustCard.tsx:71`), and the asset gets its lat/lon from `pointAtChainage(ref, sc)` in `buildRuntimeWayAsset` (`app/src/ui/wayAssetRuntime.ts:43-68`).
- `gateTicksFeatureCollection` and `riderFeature(lat, lon)` (`wayMapGeo.ts:93-99`) already turn a gate into a GeoJSON point. Note that `riderFeature` is reused for the ring (`wayMapView.tsx:652`).

## 5. Tests and rider-facing strings

Tests touching this screen or its map:
- `app/tests/gateseeding_suite.ts:46-139`: `clampNudge` (`:46-63`), `nudgeDeltaM` (`:77-79`), `gateName` / `fmtChainage` / `fmtPct` (`:66`), `nextGateOnTap` (`:130-139`). Registered in `app/tests/run.ts:38`.
- `app/tests/waymapgeo_suite.ts:413-494`: `cameraTargetFor` for free, fit, follow, bearing. Also `:178` (map-tap to gate-index mapping comment) and `:578` (no hardcoded Leuven literal in the camera path). Registered in `run.ts:21`.
- `app/tests/waymap_suite.ts:417` (source regex: mode resets on `mapStyleKey`), `:430-431` (faint opacity), `:434` (source includes `nextGateOnTap(hits, props.gateSelect!.selected)`). Registered in `run.ts:20`.
- `app/tests/recordflow_suite.ts:314-317`: source-string asserts on `GateAdjustScreen.tsx` and `gateAdjustCard.tsx` (requires `Tap a gate to move it`, `discardLabel="discard nudges"`, card default text).
- `app/tests/demo_suite.ts:614-656`: `demoGateAdjustDraft` (the DemoScreen draft).
- Gap: no test asserts the camera moves on chip or map selection, and no test covers a focus-to-gate behaviour (none exists to test).
- Note: `run.ts:70` registers `ui_strings_suite.ts`, which checks every rider string against the allowlist.

Rider-facing strings in this screen (all mirrored in `app/tests/ui-strings.allow.json`):
- `EDIT GATES` title: `GateAdjustScreen.tsx:108`.
- `‹ BACK`: `GateAdjustScreen.tsx:106`.
- Subtitle `Tap a gate to move it`: `GateAdjustScreen.tsx:121`, default in `gateAdjustCard.tsx:143`; allowlist entries at `ui-strings.allow.json:584` and `:1565`.
- Discard label `discard nudges`: `GateAdjustScreen.tsx:122`, `gateAdjustCard.tsx:207`; allowlist `:614` and `:1573`.
- Hint `tap a gate on the map or below to nudge it`: `gateAdjustCard.tsx:193`; allowlist `:1589`. This hint already promises that a chip press acts on the gate, so a silent non-move is the gap the rider sees.
- `KEEP GATES` / `SAVE GATES`: `gateAdjustCard.tsx:202`; allowlist `:1549`, `:1557`.
- Alert title `Move the gates of "{label}"?`, body text, and buttons `Cancel` / `Save & re-time`: `GateAdjustScreen.tsx:60-67`; allowlist `:576` and `:592`.
- Nudge labels `−1%`, `−0.1%`, `+0.1%`, `+1%`: `gateAdjustCard.tsx:186-189`. Readout line (`gateName · fmtChainage · fmtPct`): `:182-184`.
- Gate-ring ids `gate-selected`, `gate-selected-ring` are layer ids, not rider text (allowlist `:3478`, `:3486`).
- Any new copy for a focus change would need an allowlist entry, and any alert body is capped at 20 words (project CLAUDE.md item 9; enforced by `app/tests/run.ts`).
