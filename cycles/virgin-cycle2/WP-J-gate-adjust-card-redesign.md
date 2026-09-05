**Status: BRIEF WRITTEN, NOT YET EXECUTED.**
**Source:** `data/activities/TEST in virgin-app rides/qualifire-20260904/qualifire-20260904-notes.md`
(gate-selection-step feedback, 2026-09-04) + supersedes `WP-H-gate-adjust-pad-overflow.md`
(2026-09-04, OPEN-ITEMS.md's earlier "WP-I gate-adjust pad: button labels may overflow" item,
folded in — see §5). Also closes OPEN-ITEMS' parked "WP-I gate-adjust card: overlapping gate
hit-areas on an out-and-back ride" as a side effect (§4.3, the chip row). Size: **medium-large**
— 2 screen files touched by one prop each, `routeMapView.tsx` +~50 lines (a new gate-select
prop pair on both rungs), `gateAdjustCard.tsx` substantially rewritten (~200 lines net),
`gateAdjustModel.ts` ~20 lines changed, one pure module + its 12-test suite retired, ~8 tests
edited/added. A real interactive map inside the card is real work; do not budget it as a chore.
**Anchors verified against the mounted working tree on 2026-09-04 (Plan pass, Fable). Line
numbers below are from that read — Execute MUST re-verify every anchor before editing.**

---

# WP-J (cycle 2) — Gate-adjust card redesign: real zoomable map, hold-to-repeat nudge, START/FINISH adjustable, pad layout fix

## 1. What it is

### 1.1 Nathan's words (qualifire-20260904-notes.md, describing the gate step right after saving the new "WorkHomeWet" route)

> at the step of selecting the gates I was disappointed
> even though I had a proper route it was not an openmap render, so I could not zoom in on the
> route to see better where my gates were + landmark features they were close to. So this should
> be improved next.
> Another thing about the +/- buttons, we should also have the option that if you long press on
> them, it keeps it selected and increases/decreases the percentage continuously, this avoids
> having to tap a lot of times if youre making a big change!
> Also I could only change the middle gates, not the start and finish line

Three asks, one component (`app/src/ui/gateAdjustCard.tsx`), plus the folded-in WP-H layout
problem on the same card's nudge pad. Since the card's whole layout is being touched anyway,
ONE brief owns the redesign.

### 1.2 What this brief does NOT do

- Does not add "edit the gates of an existing route from the ROUTES tab" (Nathan's other
  2026-09-04 note about the bridge gate). That is a separate future WP: it needs an entry point
  on the Routes screen and B-20's laps-cost dialog (`store/catalog.ts` `lapsComparable`, lines
  237–243). The card redesigned here is reusable by that future WP unchanged.
- Does not add two-finger map rotation (Nathan's separate general map note) — `touchRotate`
  stays `false` everywhere.
- Does not implement any scrub/drag gesture on the map (STATE.md line 104: "tap-then-nudge with
  ± buttons, never finger-dragging"; Nathan's cycle-1 Q2 answer "keep just the +-pad for now").
  Tapping a gate ON the map to SELECT it is not dragging and is in scope.

## 2. Current state (verified 2026-09-04)

### 2.1 `app/src/ui/gateAdjustCard.tsx` (195 lines) — what it draws today

- Lines 41, 99–144: a **custom View-based drawing, not a map**. `MAP_H = 200`; a bordered
  `<View style={st.map} onLayout>` box; the reference line is drawn as rotated 3-px `View`
  segments from `pathSegmentsPx(frame)` (line 100–107), gates as rotated tick `View`s with a
  44×44 `Pressable` hit box each (lines 109–143). No basemap tiles, no pan, no zoom — the file
  header (lines 13–17) says so explicitly: "no basemap, no pan/zoom — a proposal card, not a map
  surface". `frame` comes from `buildCardMapFrame()` in `gateAdjustMapModel.ts`.
- Line 46: `const [selected, setSelected] = useState<number | null>(null);`
- Line 113: `const adjustable = isAdjustable(i, n);` → line 133 `disabled={!adjustable || props.busy}`
  on the gate's Pressable. **This is the ONLY place START/FINISH are excluded in the UI**, and
  `isAdjustable` (see 2.2) is the only place in the model. Nothing structural excludes them:
  `chainageM` (line 45) is the full 5-element `[START, G1, G2, G3, FINISH]` array straight from
  `seedGateChainages()` (`store/gateSeeding.ts` lines 40–75, returns `[start, ...snapped, finish]`
  with start = 1 % L, finish = 99 % L), and `saveAdjustedGates()` (`store/wayFromRide.ts` lines
  228–242) writes the whole array as a v2 `GateSet`. `validateCatalog` (`store/catalog.ts` lines
  122–126) only requires ≥ 2 strictly-increasing chainages. So enabling the ends is a
  **model + UI change only — no store change**.
- Lines 67–68: `smallM = nudgeDeltaM(NUDGE_SMALL_PCT, refLengthM)`, `largeM = nudgeDeltaM(NUDGE_LARGE_PCT, …)`.
- Lines 70–77: `nudge(deltaM)` — functional `setChainageM` calling `clampNudge(prev, selected, deltaM, refLengthM)`.
- Lines 79–88: `pad(label, deltaM)` — a `Pressable` with `onPress={() => nudge(deltaM)}` only.
  **No `onLongPress`, no `onPressOut`, no repeat.**
- Lines 146–156: the pad row. Exactly as the cycle-2 Inspect pass found, it has **5 children**:
  ```
  147  <View style={st.padRow}>
  148    {pad('−1%', -largeM)}
  149    {pad('−0.1%', -smallM)}
  150    <Text style={[st.chainage, …]}>{fmtChainage(chainageM[selected])}</Text>
  151    {pad('+0.1%', smallM)}
  152    {pad('+1%', largeM)}
  153  </View>
  ```
  Line 155 hint when nothing is selected: `tap G1–G3 to nudge a gate`.
- Lines 185–188 (`StyleSheet.create`):
  ```
  padRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  padBtn:   { borderWidth: 1, borderRadius: radius.btn, paddingHorizontal: 12, paddingVertical: 12, minWidth: 52, alignItems: 'center' },
  padText:  { fontSize: 15, fontWeight: '700' },
  chainage: { fontSize: 16, fontWeight: '700', minWidth: 86, textAlign: 'center', fontVariant: ['tabular-nums'] },
  ```
  Width arithmetic on a 360-px phone (re-verified, not taken from WP-H): the card is rendered
  inside `RecordScreen`'s `raceColumn` (`paddingHorizontal: 12`, line 1347) or `RideDetailScreen`'s
  ScrollView (`contentContainerStyle={{ padding: 16 }}`, line 361); the card itself has
  `padding: 16` + 1-px borders. Worst case content width = 360 − 2·16 − 2·16 − 2 = **294 px**.
  Today's row needs 4·52 (minWidth) + 86 (chainage) + 4·8 (gaps) = **326 px** → overflows by
  ~32 px, and with the labels' real widths (`−0.1%` at 15 px bold ≈ 45 px + 24 px padding ≈ 69 px
  per small button) it is worse. WP-H's proposed `flex: 1, minWidth: 0` on the 4 buttons alone
  leaves (294 − 86 − 32)/4 ≈ **44 px** per button — the label does not fit. WP-H's fix was
  insufficient; the chainage readout must leave the row (§5).
- Props (lines 31–39): `refLine`, `refLengthM`, `initialChainageM`, `busy`, `onKeep`, `onSave`.
  No `routeId` today.

### 2.2 `app/src/ui/gateAdjustModel.ts` (59 lines)

- Lines 25–30:
  ```
  export function isAdjustable(index: number, nGates: number): boolean {
    return index > 0 && index < nGates - 1;
  }
  ```
  with the comment "START/FINISH are locked (their unlock + laps-cost dialog is B-20 machinery,
  deliberately unbuilt here — the ends simply do not select)".
- Lines 41–52 `clampNudge`: line 48 `if (!isAdjustable(index, chainageM.length)) return chainageM[index];`
  then `lo = chainageM[index - 1] + minGapM`, `hi = Math.min(chainageM[index + 1] - minGapM, refLengthM)`
  — indexes `index ± 1` unguarded, so it would read `undefined` at the ends once the guard is lifted.
- Lines 32–36 `gateName`: index 0 → `'START'`, last → `'FINISH'`, else `G${index}` (names are unique).
- Lines 56–59 `fmtChainage` → `'1 842 m'`.

Why the ends are safe to unlock HERE: both hosts show this card only immediately after CREATE
WAY / promote-to-reference minted the route's v1 seed (`RecordScreen.tsx` line 967 `adjust !== null`,
`RideDetailScreen.tsx` line 529) — the route has **zero scored rides** at that moment, so the
B-20 "laps become incomparable" cost that justified the lock is nil by construction. The v2 set
written by `saveAdjustedGates` is the first set any ride is ever scored against.

### 2.3 `app/src/ui/gateAdjustMapModel.ts` (134 lines) + `app/tests/gateadjustmap_suite.ts` (12 tests)

The pure geometry behind the custom drawing (`refitAssetToBox`, `buildCardMapFrame`,
`pathSegmentsPx`, `gateMarkPx`). Its only consumer is `gateAdjustCard.tsx` (verified:
`grep -rn gateAdjustMapModel src tests`). Once the card renders a real `RouteMapView` it is dead
code → retired in §6 (moved, never deleted; `tests/run.ts` line 36 imports the suite).

### 2.4 `app/src/ui/routeMapView.tsx` (980 lines) — the map to reuse

- Line 249 `export default function RouteMapView(props)`: MapLibre rung when the native module
  loaded (`ML`, lines 106–112), else `PngRouteMap` (line 725) which, with no bundled image, draws
  `asset.path` as segments (lines 846–873) and gate ticks via `gateTickPx` (lines 880–898) — so
  the fallback rung already draws a user route + gates without any PNG.
- Props (lines 177–247): `routeId`, `asset?` (a caller-owned drawable — "both rungs draw THIS
  asset and skip the id → asset lookup"; today only DemoScreen passes it), `lat`/`lon`,
  `height?`, `variant?: 'live' | 'browse'`, `showRider?`, `gateColours?`, `sectorColours?`, `trail?`, …
  **There is no gate-selection / gate-press prop.** `variant="browse"` + `showRider={false}` is
  exactly the free pan/pinch-zoom, labels-on, north-up personality Nathan wants (lines 190, 194–199,
  536–542: `dragPan`, `touchZoom`, `doubleTapZoom` all on; zoom bar with +/−/FIT at 683–702).
- Line 475: `const gateTicksFC = !gatesOnly && asset ? gateTicksFeatureCollection(asset, props.gateColours) : null;`
- Lines 654–663: the `gate-ticks` `M.GeoJSONSource` (casing + core line layers). No `onPress`.
- Lines 665–679: rider source — the last source in JSX; the mount-order rule (comment at 427–434:
  "maplibre-react-native adds layers in MOUNT order, not JSX order… an always-mounted source
  (empty features) mounts at map-mount time") governs where a new source may sit.
- Lines 880–898 (PNG rung): per-gate tick `View`, colour `col ?? CASING`, height 3.
- `routeId` matters even with `asset` given: the PNG rung reads `IMAGES[id]` (line 737) with
  `id = props.routeId ?? defaultRouteId()` — on a build with bundled PNGs a `null` routeId could
  paint a *different route's* PNG under our asset. The card must therefore pass the real routeId.
- Camera: `mode` starts `'fit'` for browse (line 194–195) on `routeBounds(asset)`; a user drag/pinch
  sets `'free'` (line 531–533) and `cameraTargetFor` then emits no target (routeMapGeo.ts 383–392),
  so re-rendering with a nudged asset never yanks the camera. The mode-reset effect (line 205–208)
  keys on `[props.zoom, variant, phaseKey, props.routeId]` — none change during a nudge.

MapLibre API available (`@maplibre/maplibre-react-native` **11.3.6**, verified in `app/node_modules`):
`GeoJSONSource` accepts `onPress?: (e: NativeSyntheticEvent<PressEventWithFeatures>) => void`
(`e.nativeEvent.features: GeoJSON.Feature[]`, the features of the child layers under the touch)
and `hitbox?: { top?, right?, bottom?, left? }` (default 44×44 px) — `src/types/PressableSourceProps.ts`.
`Map` has `onPress` too (features bubble up unless `stopPropagation()`).

### 2.5 `app/src/ui/routeAssetRuntime.ts`

`buildRuntimeRouteAsset(ref, gateChainageM, sourceRide)` (lines 34–93) builds a `RouteAsset`
(decimated ≤ ~185-vertex path with each gate inserted as a vertex, `gateIdx`, `gates[i] = { name: gateName(i, n), lat, lon, px, py }`)
from a `RefLine` + chainages — ~1 ms of work; this is what the card will feed `RouteMapView`
on every nudge. `pointAtChainage(ref, s)` (line 30) is the single chainage→lat/lon rule.

### 2.6 `app/src/ui/routeMapGeo.ts`

`gateTicksFeatureCollection(asset, gateColours?, halfLenM = 15)` (lines 333–379): one 2-point
LineString per gate, `properties: { name, colour? }` (`GateProperties`, lines 55–58). The tap
handler in §4.1 maps a pressed feature back to its gate by **`name`** (unique per gate) — no
schema change to `GateProperties`.

### 2.7 Hosts

- `RecordScreen.tsx` lines 967–975: `<GateAdjustCard refLine={adjust.ref} refLengthM={adjust.refLengthM} initialChainageM={adjust.chainageM} busy={busy} onKeep={onAdjustKeep} onSave={onAdjustSave} />`;
  `adjust: GateAdjustDraft` (line 180) carries `routeId` (`store/wayFromRide.ts` lines 180–186).
- `RideDetailScreen.tsx` lines 529–540: same shape, `adjust.routeId` also available.

### 2.8 Tests touching what changes

- `app/tests/gateseeding_suite.ts` lines 53–60 `'gateAdjust: START and FINISH are locked'` asserts
  `isAdjustable(0,5) === false`, `isAdjustable(4,5) === false`, `clampNudge(base,0,500,4000) === 40`,
  `clampNudge(base,4,-500,4000) === 3960` — **must be rewritten** (§4.2).
- `app/tests/gateadjustmap_suite.ts` line 290 uses `clampNudge(base, 2, 50, L)` (middle gate,
  unaffected) — but the whole suite retires with its module (§6).
- `app/tests/routemapgeo_suite.ts` / `routeasset_runtime_suite.ts` check tick `properties.colour`
  presence only; §4.1 adds no property, so they are unaffected.

## 3. The fix — overview

The card becomes: **title + one-line sub → a real `RouteMapView` (browse, no rider, ~280 px tall)
that draws the route from a per-nudge `buildRuntimeRouteAsset` and lets Nathan pinch/pan/zoom and
tap a gate tick → a 5-chip selector row `START · G1 · G2 · G3 · FINISH` (the always-works
selection path, and the disambiguator for loop/out-and-back routes where ticks overlap) → the
readout line `1 842 m · 37.2 %` → the 4-button pad `−1% −0.1% +0.1% +1%` (big/small, hold to
repeat) → KEEP/SAVE (unchanged)**. Four parts:

- **A. Real map** (§4.1): `RouteMapView` gains a small opt-in `gateSelect` prop honoured on both
  rungs; the card uses it. The custom drawing and `gateAdjustMapModel.ts` retire.
- **B. Hold-to-repeat** (§4.4): `Pressable` `onLongPress` starts a fixed-rate repeat, `onPressOut` stops it.
- **C. START/FINISH adjustable** (§4.2): `isAdjustable` → true for every index; `clampNudge` gets
  end-aware bounds `[0, chainage[1] − gap]` and `[chainage[n−2] + gap, refLengthM]`.
- **D. Pad layout** (§5, folded WP-H): readout leaves the button row; buttons `flex`, big pair
  visibly bigger, nothing wider than 294 px.

## 4. The fix — details

### 4.1 Part A — a real, zoomable map in the card

**4.1.1 `routeMapView.tsx`: add ONE optional prop (both rungs).** In the `RouteMapProps` type
(after `trail?`, line ~246) add:

```ts
  /** WP-J (gate-adjust card): gate selection on a browse map. `selected` is the
   * gate index to ring (null = none); `onPress` fires with the tapped gate's
   * index (MapLibre rung only — the PNG rung has no per-feature hit test, the
   * card's chip row covers selection there). Selection is UI state, not a
   * verdict: the ring is riderBlue, never a tier colour (D-013/D-030). */
  gateSelect?: { selected: number | null; onPress: (gateIndex: number) => void };
```

MapLibre rung (`MapLibreRouteMap`):
1. Compute, unconditionally (Rules of Hooks — same reason as `routeFC`/`trailFC` at lines
   421–439; put it beside them, BEFORE the `riderOnly` early return at line 449):
   ```ts
   // WP-J: the selected gate's ring — always-mounted when gateSelect is given
   // (empty when nothing is selected) so it takes a mount slot ABOVE the
   // gate-ticks source (mount order, see trailFC's comment).
   const gateSelectedFC = useMemo(() => {
     const sel = props.gateSelect?.selected ?? null;
     const g = sel !== null && asset ? asset.gates[sel] : undefined;
     return {
       type: 'FeatureCollection' as const,
       features: g ? [riderFeature(g.lat, g.lon)] : [],  // a Point feature; riderFeature is just lon/lat→Point
     };
   }, [asset, props.gateSelect?.selected]);
   ```
   (`riderFeature` — routeMapGeo.ts line 155 — is a plain Point builder; reusing it avoids a new
   builder. If Execute prefers, add a two-line `pointFeature(lat, lon)` alias in routeMapGeo.ts
   and use that; either is fine.)
2. On the existing `gate-ticks` source (line 654) add, only when `props.gateSelect` is set:
   ```tsx
   onPress={props.gateSelect ? (e) => {
     const name = e.nativeEvent.features?.[0]?.properties?.name;
     const idx = asset ? asset.gates.findIndex((g) => g.name === name) : -1;
     if (idx >= 0) props.gateSelect!.onPress(idx);
   } : undefined}
   hitbox={props.gateSelect ? { top: 24, right: 24, bottom: 24, left: 24 } : undefined}
   ```
   Type the event as `NativeSyntheticEvent<{ features?: { properties?: { name?: unknown } }[] }>`
   structurally (same approach as `RegionWillChangeEvent` at line 97) rather than importing
   MapLibre's `PressEventWithFeatures`; `String(name)` before the `findIndex` compare.
3. Directly AFTER the gate-ticks/gates ternary (after line 664) and BEFORE the rider source, mount
   the ring source **whenever `props.gateSelect` is defined** (not whenever something is selected):
   ```tsx
   {props.gateSelect ? (
     <M.GeoJSONSource key="gate-selected" id="gate-selected" data={gateSelectedFC}>
       <M.Layer id="gate-selected-ring" type="circle" paint={{
         'circle-radius': 15,
         'circle-color': 'rgba(0,0,0,0)',
         'circle-stroke-color': colors.riderBlue,
         'circle-stroke-width': 3,
       }} />
     </M.GeoJSONSource>
   ) : null}
   ```
   `key === id` (cycle-025 frozen-id rule, comment at lines 612–622). riderBlue is deliberately
   NOT the yellow line/tick colour and not a tier colour; there is no rider on this surface
   (`showRider={false}`), so it cannot be misread as the rider dot — say so in the comment.

PNG rung (`PngRouteMap`, gate ticks at lines 880–898): when `props.gateSelect?.selected === i`,
draw that tick with `backgroundColor: colors.riderBlue`, `height: 5`, `top: y0 - 2.5` (keep the
`col ?? CASING` / height 3 path for every other gate). No tap on this rung.

**4.1.2 `gateAdjustCard.tsx`: replace the custom drawing with `RouteMapView`.**
- Add a prop `routeId: string` to `GateAdjustCardProps` (see 2.4 for why it must be real).
- Build the drawable per nudge:
  ```ts
  const asset = useMemo(
    () => buildRuntimeRouteAsset(props.refLine, chainageM, 'gate-card'),
    [props.refLine, chainageM],
  );
  ```
  (`buildRuntimeRouteAsset` from `./routeAssetRuntime.ts` — direct import; the card no longer
  imports anything from `gateAdjustMapModel`.)
- Render:
  ```tsx
  <View style={st.mapWrap}>
    <RouteMapView
      routeId={props.routeId}
      asset={asset}
      lat={null} lon={null}
      variant="browse"
      showRider={false}
      height={MAP_H}
      gateSelect={{ selected, onPress: (i) => setSelected((cur) => (cur === i ? null : i)) }}
    />
  </View>
  ```
  `MAP_H = 280` (was 200 — a map you zoom into needs the room; the card sits in a ScrollView on
  RideDetail and in a flex column on Record, both already host a 300-px `RouteMapView`, lines
  382–388 of RideDetailScreen). `st.mapWrap: { marginTop: 10 }` only — `RouteMapView` brings its own
  frame/border/radius (`st.frame`, line 944), do not double-border it.
- Delete lines 51–65 (`onMapLayout`, `boxW`, `frame`, `segs`, `marks`) and 99–144 (the drawing),
  and the `gateAdjustMapModel` import (lines 27–29); `LayoutChangeEvent` import goes too.
- Update the file header (lines 1–18): the card now IS a map surface (browse variant), and record
  that "no basemap, no pan/zoom" is superseded by WP-J at Nathan's request.

**4.1.3 Selection chips (the always-works path).** Below the map, one row of `n` chips
(`chainageM.map((_, i) => …)`), label `gateName(i, n)`, `Pressable`, `onPress={() => setSelected(sel ? null : i)}`,
`disabled={props.busy}`. Selected chip: `backgroundColor: t.accent`, text `t.onAccent`; others:
`borderColor: t.cardBorder`, text `t.text`. Styles: `chipRow: { flexDirection: 'row', gap: 6, marginTop: 8 }`,
`chip: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: radius.btn, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center' }`,
`chipText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }`, and `numberOfLines={1}` on the
text. At 294 px: (294 − 4·6)/5 = 54 px per chip; `FINISH` at 11 px bold ≈ 42 px + 8 px padding
fits. This row replaces the old label-overlap hack (`overlapsStart`, lines 116–117, 138) and makes
the parked "overlapping hit-areas on an out-and-back" item moot: a tap on the map picks the first
feature under the finger, the chips pick exactly the gate you mean.

Hint text (line 155) becomes `tap a gate on the map or below to nudge it`. Sub text (lines 93–97):
`Seeded at 1/25/50/75/99 % of your ride, nudged clear of where you stopped. A proposal, not a
benchmark — pick a gate to nudge it (start and finish too), or keep it and refine after a few rides.`

### 4.2 Part C — START and FINISH adjustable (`gateAdjustModel.ts` + tests)

- `isAdjustable(index, nGates)` → `return nGates >= 2 && index >= 0 && index < nGates;` Rewrite
  its comment: SETUP-UX §4's end-lock existed for B-20's laps-cost; on THIS card (a route's first
  gate set, zero rides scored — see 2.2) the cost is nil, so the ends nudge like any gate (WP-J,
  Nathan 2026-09-04). The future "edit an existing route's gates" WP must reinstate a cost
  dialog, not this lock.
- `clampNudge`: keep the `isAdjustable` guard (now only rejects out-of-range/degenerate input), then
  ```ts
  const n = chainageM.length;
  const lo = index === 0 ? 0 : chainageM[index - 1] + minGapM;
  const hi = index === n - 1 ? refLengthM : Math.min(chainageM[index + 1] - minGapM, refLengthM);
  return Math.min(Math.max(chainageM[index] + deltaM, lo), hi);
  ```
  START may reach chainage 0 (the very first fix) and FINISH may reach `refLengthM`; a gate set
  `[0, …]` is valid (`validateCatalog` wants strictly increasing only; the live engine already
  scores from gate 0's chainage wherever it is — 1 % L today).
- Add `fmtPct(chainageM: number, refLengthM: number): string` → `'37.2 %'` (one decimal,
  `refLengthM <= 0` → `'— %'`) for the readout line.
- `app/tests/gateseeding_suite.ts` lines 53–60: replace the locked test with
  `'gateAdjust: START and FINISH nudge like any gate, clamped to the line ends and the 50 m gap'`:
  `isAdjustable(0,5) === true`, `isAdjustable(4,5) === true`, `isAdjustable(5,5) === false`,
  `clampNudge(base,0,500,4000) === 40+500` (base `[40,1000,2000,3000,3960]`),
  `clampNudge(base,0,-500,4000) === 0`, `clampNudge(base,0,5000,4000) === 950` (G1 − 50),
  `clampNudge(base,4,500,4000) === 4000`, `clampNudge(base,4,-5000,4000) === 3050` (G3 + 50).
  Add `fmtPct` cases to the line-62 test: `fmtPct(1488, 4000) === '37.2 %'`, `fmtPct(0, 4000) === '0.0 %'`.

### 4.3 (chip row — specified in 4.1.3; listed here so the four-part map in §3 stays honest)

### 4.4 Part B — hold-to-repeat on the nudge pad

RN `Pressable` supports `onLongPress` (fires after `delayLongPress`, default 500 ms; when it
fires, RN suppresses the release `onPress`) and `onPressOut` — no custom gesture wrapper needed.
In the card:

```ts
const REPEAT_MS = 120;          // ~8 nudges/s: ±1 % → 8 %/s, ±0.1 % → 0.8 %/s
const LONG_PRESS_MS = 350;
const repeat = useRef<ReturnType<typeof setInterval> | null>(null);
const nudgeRef = useRef(nudge); nudgeRef.current = nudge;   // always the latest closure
const stopRepeat = () => { if (repeat.current !== null) { clearInterval(repeat.current); repeat.current = null; } };
const startRepeat = (deltaM: number) => {
  stopRepeat();
  nudgeRef.current(deltaM);                                   // first step on hold-start
  repeat.current = setInterval(() => nudgeRef.current(deltaM), REPEAT_MS);
};
useEffect(() => stopRepeat, []);                              // unmount
useEffect(() => { if (props.busy || selected === null) stopRepeat(); }, [props.busy, selected]);
```
and on each pad button: `onPress={() => nudge(deltaM)}`, `onLongPress={() => startRepeat(deltaM)}`,
`delayLongPress={LONG_PRESS_MS}`, `onPressOut={stopRepeat}`. Constant rate, no acceleration —
`clampNudge` already stops the gate at its neighbour/ends so a long hold is harmless. Keep the
`nudge` function's functional `setChainageM` (line 72) — it is what makes the interval safe
against stale state.

### 4.5 Readout line

Between the chip row and the pad: `<Text style={st.readout}>{gateName(selected, n)} · {fmtChainage(v)} · {fmtPct(v, refLengthM)}</Text>`
(`readout: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 10, fontVariant: ['tabular-nums'] }`).
Shown only when `selected !== null` (the hint shows otherwise, as today). SETUP-UX §4's "chainage
always visible and never under the thumb" still holds — it is above the pad, not in it.

## 5. Part D — pad layout (WP-H folded in, re-verified)

WP-H's diagnosis (row can overflow; all four buttons identical) was right; its fix
(`flex: 1, minWidth: 0` on the four buttons, chainage left in the row) was **not enough** — see
the 294-px arithmetic in 2.1. With the readout moved out (§4.5) the row holds only the 4 buttons:

```
padRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
padBtn:     { borderWidth: 1, borderRadius: radius.btn, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
padBtnBig:  { flex: 1.25, paddingVertical: 16, paddingHorizontal: 6 },
padBtnSmall:{ flex: 0.75, paddingVertical: 10, paddingHorizontal: 4 },
padTextBig: { fontSize: 17, fontWeight: '800' },
padTextSmall:{ fontSize: 13, fontWeight: '700' },
```
Order stays `−1% · −0.1% · +0.1% · +1%` (big, small, small, big — the outer pair is the coarse
one). Widths at 294 px: usable 294 − 3·6 = 276; big = 276·1.25/4 ≈ 86 px, small ≈ 52 px.
`−0.1%` at 13 px bold ≈ 38 px + 8 px padding = 46 ≤ 52 ✓; `−1%` at 17 px ≈ 32 px ≪ 86 ✓. Put
`numberOfLines={1}` on every pad label as a belt (no `adjustsFontSizeToFit` — a shrinking label
would defeat the big/small distinction). Remove `st.chainage` (unused after §4.5).

`pad()` gains a `size: 'big' | 'small'` argument: `pad('−1%', -largeM, 'big')`, `pad('−0.1%', -smallM, 'small')`, ….

## 6. Retire `gateAdjustMapModel.ts` (last step, after everything else compiles and passes)

Per CLAUDE.md rule 5 (never delete): `mv app/src/ui/gateAdjustMapModel.ts safe_to_delete/`,
`mv app/tests/gateadjustmap_suite.ts safe_to_delete/`, remove the `import './gateadjustmap_suite.ts';`
line (`app/tests/run.ts` line 36). Re-run tsc + tests after the move. Expected test count drops by
12; say so in the execution report (it is not a regression). If `safe_to_delete/` refuses the move
(Windows-side lock), stop and report — do not leave a half-moved pair.

## 7. Acceptance criteria

1. On a freshly created route, the gate card shows a **real basemap** (OpenFreeMap tiles) with the
   route line and 5 gate ticks; pinch-zoom, drag-pan, double-tap zoom and the +/−/FIT bar all work
   inside the card, and a nudge does not move the camera once the user has panned/zoomed.
2. Tapping a gate tick on the map selects it (blue ring appears); tapping a chip selects it too;
   tapping the selected one again deselects. Both paths drive the same `selected` state.
3. START and FINISH are selectable and nudge; START clamps at 0 m and at G1 − 50 m; FINISH clamps
   at the route length and at G3 + 50 m. SAVE GATES writes the moved end chainages (v2 set).
4. A single tap on a pad button nudges once; holding it ≥ 350 ms nudges immediately and then every
   120 ms until release; release stops it within one interval; the readout and the map tick move together.
5. On a 360-px-wide phone nothing in the card overflows its border; the ±1 % buttons are visibly
   larger (taller, larger type, wider) than the ±0.1 % pair.
6. Readout reads `G2 · 1 842 m · 37.2 %` (name · chainage · percent of route).
7. Without the MapLibre native module (PNG rung) the card still works: line + ticks drawn, chips
   select, selected tick drawn blue/thick, pad nudges.
8. Nothing on the live ride map, Routes or Result maps changes (they do not pass `gateSelect`).

## 8. Verification

```
cd app && node --experimental-strip-types tests/run.ts    # zero FAIL (count drops by 12 after §6 — expected)
cd app && ./node_modules/.bin/tsc --noEmit                # exit 0
```
Automatable: §4.2's model tests (`isAdjustable`, `clampNudge` ends, `fmtPct`); optionally one
new test in `routemapgeo_suite.ts` that `gateTicksFeatureCollection` tick `properties.name` values
are unique and equal `gateName(i, n)` (this is what the map-tap → index mapping relies on).

**NOT automatable — Nathan's on-device check is the real acceptance:** the interactive map inside
the card (tiles load, gestures work inside RideDetail's ScrollView and Record's ending column),
tap-on-tick selection and its hitbox size, hold-to-repeat feel (rate/delay), the pad's look on
his actual phone width, and the loop-route case (START/FINISH ticks on the same spot — chips are
the disambiguator). The execution report must say these are unverified until he looks, not claim
them from code. Run 1: create a way, open the card, zoom to a gate, nudge START by holding −1 %
until it stops, SAVE, then open the route and confirm the v2 gate set's first chainage moved.

## 9. Coordinator follow-ups (not for Execute to edit — STATE.md/OPEN-ITEMS.md are the coordinator's)

- STATE.md line 105 "Start/end gates sit at 1%/99% of route distance by default" — still true as a
  default; append "and can be nudged on the adjustment card like the middle gates (WP-J)".
- STATE.md lines 61–64 / the card's description: no longer "no basemap"; it embeds `RouteMapView`.
- OPEN-ITEMS.md: close "WP-I gate-adjust pad: button labels may overflow" and "overlapping gate
  hit-areas on an out-and-back ride" when this lands; add the future WP "edit gates of an existing
  route from ROUTES (needs B-20 cost dialog)" from Nathan's same-day note.
- `cycles/virgin-cycle2/README.md` status table: add WP-J, mark WP-H superseded.

## 10. Stop-on-ambiguity

If any anchor above does not match, or any call below is undecided, STOP and report verbatim —
never guess, never rule on it from chat; forward to a fresh Fable Plan pass. Specifically:

- `M.GeoJSONSource`'s `onPress`/`hitbox` props do not type-check against the installed
  `@maplibre/maplibre-react-native` (expected 11.3.6, `src/types/PressableSourceProps.ts`) — report
  the exact tsc error rather than casting through `any`.
- `e.nativeEvent.features` arrives empty or without `properties.name` on device — that is a Nathan
  finding, not an Execute one; the chips still work. Note it, do not invent a fallback hit test.
- `RouteMapView` inside the RecordScreen `ending` column does not fit vertically on Nathan's phone
  with `MAP_H = 280` (the column is not a ScrollView — line 963 `raceColumn`): report; a smaller
  MAP_H or wrapping the ending step in a ScrollView is a Plan decision.
- The "mount-order" rule (routeMapView.tsx 427–434) makes the ring source paint UNDER the ticks or
  the rider on some render path — report with the observed JSX/mount sequence.
- `safe_to_delete/` move refused (§6).
- Anything that would require touching `store/`, `live/engine.ts`, the seed rule in `gateSeeding.ts`,
  or the `RouteMapProps` beyond the single `gateSelect` prop — out of scope; stop.
