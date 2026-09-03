**Status: Brief written 2026-09-03 (Digest+Plan pass). Map half READY TO EXECUTE — Nathan's Q1 answer clearly wants the gates moving on the real ride line, not today's straight render ("it should still move the gates on a real ride line. Not the straight render I have now"). Scrub half is DESIGNED but NOT AUTHORIZED — Nathan's Q1 answer settled keeping the ± pad but did not clearly confirm adding a new finger-scrub gesture; see Open Question 1 (§7) — do not execute §3.5 until he answers it. Map-half core design: the card keeps its own bespoke widget (as it is today) but upgrades it from a flat bar to the ride's real decimated path — `buildRuntimeRouteAsset(refLine, …)` re-fitted into the card's own box, path drawn as rotated `View` segments exactly like `routeMapView.tsx`'s existing `imgFailed` rung, each gate placed with `pointAtChainage()` on every nudge — zero new dependencies, zero changes to `RouteMapView`/`routeAssetRuntime.ts`, all geometry in a new pure module with a headless suite.**
**Review doc item: 9. Size: medium.**
**Verified against the mount as read 2026-09-03.**

---

# WP-I — Gate card map + finger scrub

## 1. Goal

Two halves with DIFFERENT scope status in this Execute pass:

1. **Map half — IN SCOPE, unconditionally.** The gate-adjustment card (`app/src/ui/gateAdjustCard.tsx`, shown in RecordScreen's `'ending'` phase after CREATE WAY seeded a route's gates) currently draws the route as a flat 2 px horizontal `View` with gate ticks at `left: (chainage / refLengthM) %`. Replace that with the ride's REAL geometry: the reference line the ride just became (`builtRef.ref`, a `RefLine`, already in scope at the `setAdjust` call site), drawn as the actual curved path, north-up, fitted to the card; each gate a tick perpendicular to the road at its chainage, re-placed on the real line on every ± tap. Nathan's words are unambiguous on this half: "it should still move the gates on a real ride line. Not the straight render I have now." The ± pad, tap-to-select, clamping, KEEP/SAVE, dirty-tracking and persistence (`onAdjustSave` → `addGateSet` v2) stay exactly as they are.

2. **Scrub half — DESIGNED (§3.5), NOT AUTHORIZED for this pass.** "Tap a gate, then slide a finger left/right anywhere to scrub it earlier/later." Nathan was asked (Q1) whether to add this on top of the ± pad or replace the pad with it. His answer — "alright lets keep the +- pad, but it should still move the gates on a real ride line. Not the straight render I have now." — settles that the pad STAYS, but the substantive sentence is about the map half. It does not say "yes, add the scrub." Reading a yes into it would be defaulting a product decision that STATE.md:103-104 currently forbids ("never finger-dragging"). So: the gesture is fully designed here so an Execute pass can land it the moment Nathan confirms, but §3.5 carries an explicit precondition and the question is put to him plainly in §7 Open Question 1. Neither built nor dropped.

Out of scope for both halves: basemap tiles on the card, pan/zoom on the card, unlocking START/FINISH (B-20 machinery), touching `RouteMapView`'s prop contract.

## 2. Current state (verified)

### 2.1 The card and its host

| What | Where | Verified detail |
|---|---|---|
| The "plain line" | `app/src/ui/gateAdjustCard.tsx:67-92` | `st.bar` (58 px tall) containing `st.barLine` (absolute, 2 px high, `t.cardBorder`) and one `Pressable` per gate at `left: \`${(c / props.refLengthM) * 100}%\`` (line 77). Tick = 4×30 `View`, selected = 8×38 (`st.tickSelected`). Label = `gateName(i, n)`. |
| Local unsaved state | `gateAdjustCard.tsx:33-36` | `const [chainageM, setChainageM] = useState<number[]>(props.initialChainageM)`; `selected: number \| null`; `dirty` = any entry differs from `props.initialChainageM` by > 1e-6. |
| Nudge | `gateAdjustCard.tsx:38-45` | `setChainageM(prev => prev.map((v,i) => i === selected ? clampNudge(prev, selected, deltaM, props.refLengthM) : v))`. |
| Props | `gateAdjustCard.tsx:23-29` | `refLengthM: number; initialChainageM: number[]; busy: boolean; onKeep; onSave(chainageM)`. **No geometry reaches the card today.** |
| Header comment | `gateAdjustCard.tsx:11-13` | "No map yet — the route IS drawable since WP-C; the map-mirror itself is a separate item (needs a live-chainage override into `buildRuntimeRouteAsset`)." — to be rewritten by this WP. |
| Host | `app/src/ui/RecordScreen.tsx:996-1003` | `<GateAdjustCard refLengthM={adjust.refLengthM} initialChainageM={adjust.chainageM} busy={busy} onKeep={onAdjustKeep} onSave={onAdjustSave} />` inside the `'ending'` phase `raceColumn` (a plain flex column, not a ScrollView). |
| Draft type | `RecordScreen.tsx:116-121` | `interface GateAdjustDraft { routeId: string; refLengthM: number; chainageM: number[] }`. |
| Where the draft is made | `RecordScreen.tsx:576-612` (`onNamingSave`) | `const builtRef = fixes ? buildRefFromRideFixes(fixes) : null;` (line 581) — `builtRef.ref` is the `RefLine` (its `.length` already feeds `refLengthM` at line 607). `setAdjust({ routeId: \`route:${draft.rideId}\`, refLengthM: builtRef.ref.length, chainageM: seed.chainageM })` at lines 605-609, inside `if (builtRef && seed)`. **The real geometry is right there — it just is not put on the draft.** |
| Save path | `RecordScreen.tsx:629-661` (`onAdjustSave`) | Reads `adjustRef.current`, mints gate-set v2 via `addGateSet` with the card's whole `chainageM`. Untouched by this WP. |
| `RefLine` import in RecordScreen | `RecordScreen.tsx:17-63` | **Not imported** today (only `buildRefFromRideFixes`/`saveUserRef` from `../live/userRefs`). The draft type needs `import type { RefLine } from '../../core/src/index.ts'` (the path `routeAssetRuntime.ts:14` uses from the same directory). |

### 2.2 The geometry we can reuse (no new code needed for any of it)

| Function | Where | Signature / behaviour |
|---|---|---|
| `pointAtChainage` | `app/src/ui/routeAssetRuntime.ts:30-32` | `(ref: RefLine, s: number): [lat, lon]` — `xyToLatLon(interp1(s, ref.ch, ref.rx), interp1(s, ref.ch, ref.ry), ref.lat0, ref.lon0)`. Exported. No clamping of `s` inside (callers clamp; `buildRuntimeRouteAsset` clamps to `[0, ref.length]` at line 46). |
| `buildRuntimeRouteAsset` | `routeAssetRuntime.ts:34-93` | `(ref: RefLine, gateChainageM: readonly number[], sourceRide = ''): RouteAsset`. Pure, catalog-free: decimates `ref` to ~180 vertices (`RUNTIME_PATH_TARGET_VERTICES`), splices one vertex per gate, then Web-Mercator-fits into the renderer's 900×1400 / 60 px frame (`x0, y1, scale, offx, offy`). **Confirmed: no "override" parameter exists and none is needed — the card's live `chainageM` is simply what you hand it.** The Mercator constants `mercX`/`mercY` are module-private (lines 27-28), duplicated from `routeMapMath.ts:53-55` (also private). |
| `resolveRouteAsset` / cache | `routeAssetRuntime.ts:104-121` | Catalog-driven, cached by `id` + gate key. The card must NOT go through this (the nudged chainages are not in the catalog until SAVE, and its cache is keyed by route id). |
| `projectToPixel` | `app/src/ui/routeMapMath.ts:57-62` | `(a: RouteAsset, lat, lon): {px, py}` — `offx + (mercX(lon) - x0) * scale`, `offy + (y1 - mercY(lat)) * scale`. Works for ANY asset whose `x0/y1/scale/offx/offy` describe a Mercator fit — including one re-fitted to the card's box (§3.1). |
| `metresPerPixel` | `routeMapMath.ts:66-68` | `6378137 · cos(lat) / a.scale`. |
| `gateTickPx` | `routeMapMath.ts:124-160` | Perpendicular tick from path neighbours (`gateIdx`). Not reused directly (it needs the gate spliced into `path`, which would mean rebuilding the asset per nudge); §3.1 defines a chainage-probe sibling that does the same thing from `pointAtChainage`. Its convention (15 m half-length, min 10 px in the PNG rung) is kept. |
| Segment drawing precedent | `app/src/ui/routeMapView.tsx:800-825` (PNG rung, `imgFailed` fallback) | The ridden line as rotated `View`s: `position:'absolute', left:x0, top:y0-1.5, width:len, height:3, transform:[{rotate:\`${ang}deg\`}], transformOrigin:'left center'`. Gate ticks the same way at lines 826-848. **This is the exact rendering technique the card will use — proven in this codebase, no `react-native-svg`, no MapLibre.** |
| `RefLine` shape | `app/core/src/index.ts`; fixture helper `app/tests/routeasset_runtime_suite.ts:46-56` | `{ rx: Float64Array; ry: Float64Array; ch: Float64Array; lat0; lon0; length }` — local metres east/north + chainage per vertex. `straightNorthRef(nVerts, stepM)` is the existing test fixture builder. |

### 2.3 Dependencies and gesture precedent

- `app/package.json`: `@maplibre/maplibre-react-native ^11.3.6`, `expo ~56`, `react-native 0.85.3`. **No `react-native-svg`, no `react-native-gesture-handler`.** Nothing new is added by this WP.
- `PanResponder` (React Native built-in) is already used in `app/src/ui/preview/PreviewScreen.tsx:679-691` — `onStartShouldSetPanResponder`, `onMoveShouldSetPanResponder`, `onPanResponderGrant` capturing a start value into a ref, `onPanResponderMove` reading `gs.dx` and mapping pixels → metres via a `propsRef` pattern. §3.5's design follows it.

### 2.4 The binding rule and the ruling

- `STATE.md:103-104` (verbatim): "Adjustment UI is tap-then-nudge with ± buttons, never finger-dragging (thumb covers the line)."
- `cycles/virgin-cycle1/QUESTIONS-FOR-NATHAN.md:42-53` — Q1 as asked, and the answer at line 53: **"alright lets keep the +- pad, but it should still move the gates on a real ride line. Not the straight render I have now."**
- Reading (see §1 and §7): pad stays — settled. Real-line map — explicitly and emphatically wanted. New scrub gesture — not addressed by the words; STATE.md's line stands unamended until he says otherwise.

### 2.5 Import-cycle hazard (design constraint)

`routeAssetRuntime.ts:18` imports `gateName` from `gateAdjustModel.ts`. Therefore the map geometry must NOT go into `gateAdjustModel.ts` (it would import `routeAssetRuntime.ts` → cycle). It goes in a new sibling module, `gateAdjustMapModel.ts`, which imports both.

## 3. Proposed changes

### 3.0 The central design decision — bespoke widget, not a `RouteMapView` prop

Three options were weighed:

| Option | What it costs | What it gives |
|---|---|---|
| **(a) Bespoke in-card widget, upgraded** — build a `RouteAsset` from `refLine` + the card's live `chainageM`-independent path, re-fit it into the card's own box, draw the path as rotated `View` segments (the `imgFailed` technique) and each gate via `pointAtChainage` | New pure module (~90 lines) + card rewrite of lines 67-92 + one prop plumbed from RecordScreen. No changes to `RouteMapView`, `routeAssetRuntime.ts` or any dependency. | The real curved line, north-up, whole route fitted; gate tap-to-select via ordinary `Pressable`s (glove-sized hit areas, exactly as today); synchronous redraw on every nudge; all placement math headless-testable; no tiles → no network, no attribution credit, no native-module rung split. |
| (b) New `assetOverride?: RouteAsset` prop on `RouteMapView`, card builds the asset per nudge and passes it | Threading a bypass through `assetFor()` in BOTH rungs (935-line file, variant matrix), the MapLibre rung's `key === id` source-freeze rule (`routeMapView.tsx:567`) means a per-nudge geometry change under one id needs a key-bump scheme, gate tap-to-select would have to be MapLibre feature hit-testing (nothing like it exists today, untestable headlessly, `[UNTESTED ON DEVICE]` risk on the one card Nathan is specifically complaining about), plus the PNG fallback rung and the `Credit` overlay inside a 200 px card. | Real basemap tiles and pan/zoom under the gates. |
| (c) A second, smaller MapLibre component just for this card | Everything in (b) minus the variant matrix, plus a second MapLibre wiring to keep in sync with the first. | Same as (b). |

**Decision: (a).** Nathan's complaint is about the SHAPE ("a real ride line, not the straight render") — the real ridden geometry answers it; tiles do not. The card is already a bespoke widget (it never was a `RouteMapView` instance), so (a) is the architecture-consistent step, the only one that keeps gate selection on plain `Pressable`s, and the only one whose entire geometry is unit-testable. If Nathan later wants tiles under the gates, (b) is the upgrade path and the pure module from §3.1 already produces the `RouteAsset` it would need — nothing here is thrown away.

### 3.1 New pure module — `app/src/ui/gateAdjustMapModel.ts`

Headless, no react-native import, same discipline as `routeMapMath.ts` / `gateAdjustModel.ts`. Near-literal:

```ts
/**
 * Pure geometry for the gate-adjustment card's map (WP-I, map half). The
 * card draws the ride's REAL reference line (not a straight bar) and places
 * each gate on it by chainage on every nudge. Reuses routeAssetRuntime's
 * decimation + Mercator fit and routeMapMath's projection unchanged; the
 * only new maths is re-fitting the asset into the card's own box and a
 * chainage-probe tick (a sibling of gateTickPx that needs no gateIdx, so
 * the asset is built ONCE per ref, not once per nudge).
 *
 * Lives beside gateAdjustModel.ts rather than inside it: routeAssetRuntime
 * imports gateName from gateAdjustModel, so the map maths importing
 * routeAssetRuntime from there would be a cycle.
 */
import type { RefLine } from '../../core/src/index.ts';
import { buildRuntimeRouteAsset, pointAtChainage } from './routeAssetRuntime.ts';
import { metresPerPixel, projectToPixel, type RouteAsset } from './routeMapMath.ts';

/** Inset between the card box edge and the fitted path (room for ticks + labels). */
export const CARD_MAP_PAD_PX = 22;
/** Tick half-length in METRES — same as gateTickPx's default. */
export const CARD_TICK_HALF_M = 15;
/** ...but never shorter than this on screen (a 4 km route in a 320 px box
 * would make 30 m ≈ 2 px). PNG rung clamps to 10; the card's ticks are the
 * tap targets' visual anchor, so slightly larger. */
export const CARD_TICK_MIN_PX = 14;
/** Selected gate: tick drawn this many times longer/thicker. */
export const CARD_TICK_SELECTED_FACTOR = 1.6;
/** Heading probe either side of the gate chainage, metres. */
export const HEADING_PROBE_M = 10;

// Same Web-Mercator helpers routeAssetRuntime.ts / routeMapMath.ts keep private.
const mercX = (lon: number): number => (lon * Math.PI) / 180;
const mercY = (lat: number): number => Math.log(Math.tan(Math.PI / 4 + ((lat * Math.PI) / 180) / 2));

/**
 * Re-fit an asset's path into a w×h box with padPx inset: the same fit
 * buildRuntimeRouteAsset does for 900×1400/60, re-run for the card's box, so
 * projectToPixel()/metresPerPixel() answer directly in CARD pixels (no
 * cropFor, no <Image> transform). Gates are re-projected too. Pure.
 */
export function refitAssetToBox(asset: RouteAsset, w: number, h: number, padPx = CARD_MAP_PAD_PX): RouteAsset {
  const path = asset.path ?? [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [lat, lon] of path) {
    const x = mercX(lon), y = mercY(lat);
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (path.length === 0) { minX = maxX = 0; minY = maxY = 0; }
  const dx = Math.max(maxX - minX, 1e-12);
  const dy = Math.max(maxY - minY, 1e-12);
  const scale = Math.min((w - 2 * padPx) / dx, (h - 2 * padPx) / dy);
  const out: RouteAsset = {
    ...asset,
    w, h,
    x0: minX, y1: maxY, scale,
    offx: (w - dx * scale) / 2,
    offy: (h - dy * scale) / 2,
  };
  out.gates = asset.gates.map((g) => ({ ...g, ...projectToPixel(out, g.lat, g.lon) }));
  return out;
}

/**
 * The card's frame for one reference line: built ONCE per (ref, box) — the
 * path does not move when a gate is nudged, only the gate marks do (see
 * gateMarkPx). Only START/FINISH are handed to the builder; the card ignores
 * the returned `gates` and places its own from live chainages.
 */
export function buildCardMapFrame(ref: RefLine, w: number, h: number, padPx = CARD_MAP_PAD_PX): RouteAsset {
  return refitAssetToBox(buildRuntimeRouteAsset(ref, [0, ref.length], 'gate-card'), w, h, padPx);
}

/** One rotated-View segment, left-anchored — the routeMapView.tsx imgFailed convention. */
export interface SegPx { x0: number; y0: number; len: number; angDeg: number }

export function pathSegmentsPx(frame: RouteAsset): SegPx[] {
  const path = frame.path ?? [];
  const out: SegPx[] = [];
  for (let i = 0; i + 1 < path.length; i++) {
    const a = projectToPixel(frame, path[i][0], path[i][1]);
    const b = projectToPixel(frame, path[i + 1][0], path[i + 1][1]);
    const ddx = b.px - a.px, ddy = b.py - a.py;
    out.push({ x0: a.px, y0: a.py, len: Math.hypot(ddx, ddy), angDeg: (Math.atan2(ddy, ddx) * 180) / Math.PI });
  }
  return out;
}

/** A gate mark: centre (hit-area anchor) + its tick as a left-anchored segment. */
export interface GateMarkPx extends SegPx { cx: number; cy: number }

/**
 * Where a gate at chainage `s` sits on the card, and the perpendicular tick
 * through it. Heading is probed ±HEADING_PROBE_M along the ref (clamped to
 * [0, length]) so it turns corners with the road and never needs the gate to
 * be a path vertex. `s` outside [0, length] is clamped (same as the builder).
 */
export function gateMarkPx(
  ref: RefLine, frame: RouteAsset, s: number,
  opts: { halfLenM?: number; minLenPx?: number; probeM?: number; factor?: number } = {},
): GateMarkPx {
  const halfLenM = opts.halfLenM ?? CARD_TICK_HALF_M;
  const minLenPx = opts.minLenPx ?? CARD_TICK_MIN_PX;
  const probeM = opts.probeM ?? HEADING_PROBE_M;
  const factor = opts.factor ?? 1;
  const L = ref.length;
  const sc = Math.min(Math.max(s, 0), L);
  const [lat, lon] = pointAtChainage(ref, sc);
  const c = projectToPixel(frame, lat, lon);
  const sA = Math.max(sc - probeM, 0);
  const sB = Math.min(sc + probeM, L);
  const [la, lo] = pointAtChainage(ref, sA);
  const [lb, lob] = pointAtChainage(ref, sB);
  const a = projectToPixel(frame, la, lo);
  const b = projectToPixel(frame, lb, lob);
  const hx = b.px - a.px, hy = b.py - a.py;
  const hl = Math.hypot(hx, hy);
  // degenerate (zero-length ref / identical probes): heading east, tick vertical
  const ux = hl > 0 ? hx / hl : 1;
  const uy = hl > 0 ? hy / hl : 0;
  const perpX = -uy, perpY = ux;
  const halfPx = Math.max(halfLenM / metresPerPixel(frame, lat), minLenPx / 2) * factor;
  const x0 = c.px - perpX * halfPx, y0 = c.py - perpY * halfPx;
  const x1 = c.px + perpX * halfPx, y1 = c.py + perpY * halfPx;
  return {
    cx: c.px, cy: c.py, x0, y0,
    len: Math.hypot(x1 - x0, y1 - y0),
    angDeg: (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI,
  };
}
```

Notes for the executor:
- `refitAssetToBox` spreads `asset` so `path`, `gateIdx`, `image`, `sourceRide` carry over; only the frame numbers and `w/h` change. `projectToPixel`/`metresPerPixel` need nothing else.
- `buildCardMapFrame` is called inside a `useMemo` keyed on `(refLine, boxW)` — it is the only per-ref cost (a ~180-vertex decimation of a several-thousand-vertex ref). Per nudge the card only calls `gateMarkPx` once per gate (5 calls, each two `interp1`s + a projection).
- Loops (START ≈ FINISH in space): both marks land on the same pixel; the labels overlap. Acceptable for this WP — those two gates are locked and unselectable anyway; §3.3 offsets the FINISH label 12 px lower when `n-1`'s centre is within 10 px of gate 0's.

### 3.2 `app/src/ui/RecordScreen.tsx` — put the real line on the draft (3 edits + 1 import)

```ts
// imports (near line 52, beside the userRefs import)
import type { RefLine } from '../../core/src/index.ts';

// 116-121
interface GateAdjustDraft {
  routeId: string;
  /** the ride's real reference line — the card draws gates ON it (WP-I) */
  ref: RefLine;
  refLengthM: number;
  chainageM: number[];
}

// 605-609 (inside `if (builtRef && seed)`)
setAdjust({
  routeId: `route:${draft.rideId}`,
  ref: builtRef.ref,
  refLengthM: builtRef.ref.length,
  chainageM: seed.chainageM,
});

// 997-1003
<GateAdjustCard
  refLine={adjust.ref}
  refLengthM={adjust.refLengthM}
  initialChainageM={adjust.chainageM}
  busy={busy}
  onKeep={onAdjustKeep}
  onSave={onAdjustSave}
/>
```

`refLengthM` is kept (it equals `ref.length`; `clampNudge` and the existing tests use it; smallest diff). **The prop is named `refLine`, not `ref` — `ref` is a reserved React prop and would silently never reach the component.** `onAdjustSave`/`adjustRef` are untouched.

### 3.3 `app/src/ui/gateAdjustCard.tsx` — the map replaces the bar

Props:

```ts
export interface GateAdjustCardProps {
  /** the ride's real reference line (WP-I): the map draws it and places gates on it */
  refLine: RefLine;
  refLengthM: number;
  initialChainageM: number[];
  busy: boolean;
  onKeep: () => void;
  onSave: (chainageM: number[]) => void;
}
```

Imports added: `useMemo` from react; `type LayoutChangeEvent` from react-native; `import type { RefLine } from '../../core/src/index.ts'`; `import { CARD_TICK_SELECTED_FACTOR, buildCardMapFrame, gateMarkPx, pathSegmentsPx, type GateMarkPx } from './gateAdjustMapModel'`.

State + derived, after line 36:

```ts
const [boxW, setBoxW] = useState(0);
const onMapLayout = (e: LayoutChangeEvent) => {
  const w = Math.round(e.nativeEvent.layout.width);
  if (w !== boxW) setBoxW(w);
};
// Built once per ref/box: the path never moves, only the gate marks do.
const frame = useMemo(
  () => (boxW > 0 ? buildCardMapFrame(props.refLine, boxW, MAP_H) : null),
  [props.refLine, boxW],
);
const segs = useMemo(() => (frame ? pathSegmentsPx(frame) : []), [frame]);
// Per render (i.e. per nudge): each gate re-placed ON the real line by chainage.
const marks: GateMarkPx[] = frame
  ? chainageM.map((s, i) => gateMarkPx(props.refLine, frame, s,
      { factor: selected === i ? CARD_TICK_SELECTED_FACTOR : 1 }))
  : [];
```

The map area, replacing lines 67-92 verbatim:

```tsx
<View style={[st.map, { borderColor: t.cardBorder }]} onLayout={onMapLayout}>
  {segs.map((sg, i) => (
    <View key={`s${i}`} pointerEvents="none" style={{
      position: 'absolute', left: sg.x0, top: sg.y0 - 1.5,
      width: sg.len, height: 3, backgroundColor: t.textDim, opacity: 0.55,
      transform: [{ translateX: 0 }, { rotate: `${sg.angDeg}deg` }],
      transformOrigin: 'left center',
    }} />
  ))}
  {/* selected gate rendered last so its hit area and tick sit on top */}
  {marks
    .map((m, i) => ({ m, i }))
    .sort((a, b) => (a.i === selected ? 1 : 0) - (b.i === selected ? 1 : 0))
    .map(({ m, i }) => {
      const adjustable = isAdjustable(i, n);
      const sel = selected === i;
      const thick = sel ? 5 : 3;
      // loop routes: FINISH sits on START — drop its label a line so both read
      const overlapsStart = i === n - 1 && Math.hypot(m.cx - marks[0].cx, m.cy - marks[0].cy) < 10;
      return (
        <View key={`g${i}`} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View pointerEvents="none" style={{
            position: 'absolute', left: m.x0, top: m.y0 - thick / 2,
            width: m.len, height: thick, borderRadius: thick / 2,
            backgroundColor: adjustable ? t.accent : t.textDim,
            transform: [{ translateX: 0 }, { rotate: `${m.angDeg}deg` }],
            transformOrigin: 'left center',
          }} />
          {sel ? (
            <View pointerEvents="none" style={[st.halo, {
              left: m.cx - 16, top: m.cy - 16, borderColor: t.accent,
            }]} />
          ) : null}
          <Pressable
            disabled={!adjustable || props.busy}
            onPress={() => setSelected(sel ? null : i)}
            hitSlop={4}
            style={[st.hit, { left: m.cx - 22, top: m.cy - 22 }]}
          />
          <View pointerEvents="none" style={[st.labelBox, { left: m.cx - 22, top: m.cy + (overlapsStart ? 26 : 14) }]}>
            <Text style={[st.tickLabel, { color: sel ? t.text : t.textDim }]}>{gateName(i, n)}</Text>
          </View>
        </View>
      );
    })}
</View>
```

Styles: remove `bar`, `barLine`, `tickHit`, `tick`, `tickSelected`; add

```ts
const MAP_H = 200;
// in st:
map: { height: MAP_H, marginTop: 10, borderWidth: 1, borderRadius: radius.btn, overflow: 'hidden' },
hit: { position: 'absolute', width: 44, height: 44 },
halo: { position: 'absolute', width: 32, height: 32, borderRadius: 16, borderWidth: 2, opacity: 0.6 },
labelBox: { position: 'absolute', width: 44, alignItems: 'center' },
tickLabel: { fontSize: 10, letterSpacing: 1 },
```

(`MAP_H` is a module constant beside `st`; `radius` is already imported.) The subtitle copy (lines 61-65), the pad row, the readout, KEEP/SAVE and the discard link are unchanged; the hint at line 103 stays "tap G1–G3 to nudge a gate".

Header comment (lines 1-14): replace the last sentence ("No map yet — … `buildRuntimeRouteAsset`).") with: "WP-I (map half): the card draws the ride's REAL reference line (gateAdjustMapModel.ts — the WP-C builder re-fitted into the card's box, the imgFailed segment technique from routeMapView.tsx) and re-places every gate on it by chainage on each nudge; no basemap, no pan/zoom — a proposal card, not a map surface. Still `[UNTESTED ON DEVICE]` until the §4.1 checklist runs."

Behaviour to preserve (and check by reading): tap-to-select toggles exactly as before (`setSelected(sel ? null : i)`); START/FINISH still do not select; `busy` disables the hit areas; `dirty`/SAVE/KEEP logic untouched; the readout `fmtChainage(chainageM[selected])` still shows the number that moved.

### 3.4 `app/tests/run.ts` — register the new suite

Add `import './gateadjustmap_suite.ts';` after the `routeasset_runtime_suite.ts` line.

### 3.5 Scrub half — DESIGNED, **NOT AUTHORIZED FOR THIS EXECUTE PASS**

> **Precondition — do not execute this section until Nathan explicitly confirms he wants finger-scrub added on top of the ± pad.** His Q1 answer settled the ± pad staying, but did not clearly authorize adding this new gesture; see §7 Open Question 1. Executing it also requires the coordinator to amend `STATE.md:103-104` (§3.5.5) — a binding-rule change that must be written down, not implied. Everything below exists so that the moment he says yes, an Execute pass has a complete design; nothing in §3.1-3.4 depends on it.

#### 3.5.1 Interaction contract

- Selection is unchanged and tap-only: tap a G-gate's hit area to select it (§3.3). The scrub never selects.
- With a gate selected, a **horizontal** pan started **anywhere on the map area** (path, empty space, even over another gate's hit area once the move threshold is crossed) scrubs the selected gate: drag right = later along the ride (greater chainage), drag left = earlier. "Along the ride", not "across the screen": a route that runs right-to-left on the map still scrubs later on a rightward drag — that is what Nathan described ("slide a finger left/right … earlier/later along the ride"), and the readout + the mark riding the path make the direction obvious within the first centimetre.
- The finger is never on the gate: it can rest on the blank part of the card while the mark moves along the line — which is exactly why this is not the "thumb covers the line" case the STATE.md rule was written against. The mark and the chainage readout stay visible throughout.
- Coarse vs fine: the scrub is for coarse placement (a whole-width drag covers half the route — see §3.5.2), the ± pad remains the precision tool (10 m / 50 m). Both feed the same `chainageM` through the same `clampNudge`, so the scrub can never place a gate the pad could not.
- Continuous update, no separate commit: `chainageM` is local, unsaved state — SAVE is the commit. Updating it on every move event is what makes the mark visibly ride the path; there is nothing to roll back on release because nothing has been persisted. `dirty` flips as soon as the gate moves, exactly as with the pad.
- Vertical movement is ignored; a mostly-vertical gesture is not claimed at all (§3.5.3), so nothing changes for any future host that scrolls.
- `busy` disables the scrub like it disables the pad.

#### 3.5.2 Pure additions — `app/src/ui/gateAdjustMapModel.ts` (same module, so still cycle-free)

```ts
/** Full card width of horizontal drag = this fraction of the route. A gate
 * can never travel more than the span between its neighbours (~50% of the
 * route for a 25/50/75 seed), so half the route per width is the natural
 * coarse scale; the ± pad is the fine one. */
export const SCRUB_ROUTE_FRACTION_PER_WIDTH = 0.5;
export const SCRUB_MIN_M_PER_PX = 0.5;
export const SCRUB_MAX_M_PER_PX = 20;
/** Horizontal movement before a pan is claimed as a scrub (so taps still
 * reach the gate Pressables and diagonal/vertical gestures are left alone). */
export const SCRUB_CLAIM_PX = 8;

export function scrubMetresPerPx(refLengthM: number, boxW: number): number {
  if (boxW <= 0) return SCRUB_MAX_M_PER_PX;
  const raw = (refLengthM * SCRUB_ROUTE_FRACTION_PER_WIDTH) / boxW;
  return Math.min(Math.max(raw, SCRUB_MIN_M_PER_PX), SCRUB_MAX_M_PER_PX);
}

/** Chainage of gate `index` after a drag of dxPx from the gesture's grant,
 * computed from the chainages AS THEY WERE AT GRANT (absolute mapping, so
 * jitter cannot accumulate) and clamped by the same rule as the ± pad. */
export function scrubChainage(
  chainageAtGrant: readonly number[], index: number, dxPx: number, mPerPx: number, refLengthM: number,
): number {
  return clampNudge(chainageAtGrant, index, dxPx * mPerPx, refLengthM);
}

/** Whether a move event should be claimed as a scrub. */
export function shouldClaimScrub(dx: number, dy: number, hasSelection: boolean, busy: boolean): boolean {
  return hasSelection && !busy && Math.abs(dx) >= SCRUB_CLAIM_PX && Math.abs(dx) > Math.abs(dy);
}
```

(`clampNudge` imported from `./gateAdjustModel.ts` — allowed direction; `gateAdjustModel` imports nothing.)

#### 3.5.3 Card wiring — `gateAdjustCard.tsx` (PanResponder, the PreviewScreen pattern)

```ts
import { PanResponder, /* …existing */ } from 'react-native';

// latest values for the responder's stable callbacks (PreviewScreen.tsx:678 pattern)
const live = useRef({ selected, chainageM, boxW, busy: props.busy, refLengthM: props.refLengthM });
live.current = { selected, chainageM, boxW, busy: props.busy, refLengthM: props.refLengthM };
const grant = useRef<{ index: number; chainageM: number[]; mPerPx: number } | null>(null);

const pan = useRef(
  PanResponder.create({
    onStartShouldSetPanResponder: () => false,          // taps go to the gate Pressables
    onMoveShouldSetPanResponder: (_e, gs) =>
      shouldClaimScrub(gs.dx, gs.dy, live.current.selected !== null, live.current.busy),
    onMoveShouldSetPanResponderCapture: (_e, gs) =>     // …even when the move started on a Pressable
      shouldClaimScrub(gs.dx, gs.dy, live.current.selected !== null, live.current.busy),
    onPanResponderTerminationRequest: () => false,      // once scrubbing, keep it
    onPanResponderGrant: () => {
      const l = live.current;
      if (l.selected === null) return;
      grant.current = {
        index: l.selected,
        chainageM: l.chainageM.slice(),
        mPerPx: scrubMetresPerPx(l.refLengthM, l.boxW),
      };
    },
    onPanResponderMove: (_e, gs) => {
      const g = grant.current;
      if (!g) return;
      const next = scrubChainage(g.chainageM, g.index, gs.dx, g.mPerPx, live.current.refLengthM);
      setChainageM((prev) => (prev[g.index] === next ? prev : prev.map((v, i) => (i === g.index ? next : v))));
    },
    onPanResponderRelease: () => { grant.current = null; },
    onPanResponderTerminate: () => { grant.current = null; },
  }),
).current;

// on the map container from §3.3:
<View style={[st.map, { borderColor: t.cardBorder }]} onLayout={onMapLayout} {...pan.panHandlers}>
```

Why grant-time snapshot + `gs.dx` (not incremental `vx`/deltas): the mapping is absolute from where the finger went down, so lifting mid-drag and re-dragging always starts from the gate's current chainage, and clamping at a neighbour does not "bank" overshoot. The `prev[g.index] === next ? prev` guard skips re-renders while pinned at a clamp.

Hint copy when a gate is selected (new, below the pad row, `st.hint` style): "± to nudge · slide left/right on the map to scrub".

#### 3.5.4 Tests for the scrub half (in `gateadjustmap_suite.ts`, added only when §3.5 executes)

- S1 `scrubMetresPerPx(3000, 320)` = 4.6875; `(200, 320)` clamps to 0.5; `(100000, 320)` clamps to 20; `boxW = 0` returns the max (never divides by zero).
- S2 `scrubChainage([40, 1000, 2000, 3000, 3960], 2, +64, 4.6875, 4000)` = 2300; `dx = −64` → 1700; huge `dx` clamps to `3000 − 50 = 2950`; huge negative to `1000 + 50 = 1050`; index 0 / 4 return unchanged (locked).
- S3 absolute mapping: two successive calls with `dx = 30` then `dx = 60` from the same grant array give the same result as one call with `dx = 60` (no accumulation).
- S4 `shouldClaimScrub`: `(10, 2, true, false)` true; `(10, 12, true, false)` false (vertical wins); `(5, 0, true, false)` false (under threshold); `(30, 0, false, false)` false (nothing selected); `(30, 0, true, true)` false (busy).

#### 3.5.5 Bookkeeping that MUST accompany execution of §3.5 (coordinator, not executor)

- `STATE.md:103-104` currently reads "Adjustment UI is tap-then-nudge with ± buttons, never finger-dragging (thumb covers the line)." Shipping the scrub means Nathan's answer is being read as amending that line; the coordinator rewrites it, e.g.: "Adjustment UI is select-then-move: tap a gate, then the ± pad (fine, 10/50 m) or a horizontal finger-scrub anywhere on the card's map (coarse) — never dragging the gate marker itself under the thumb (the line stays visible)." Record the date and "Nathan, Q1 follow-up" beside it.
- The card's header comment cites "SETUP-UX §4, cited not redesigned" — the same amendment note goes wherever SETUP-UX §4 lives, or the citation is changed to "SETUP-UX §4 as amended <date>".
- `QUESTIONS-FOR-NATHAN.md` Q1 gets the follow-up answer appended under the existing one.

## 4. Test plan — map half (`app/tests/gateadjustmap_suite.ts`, new)

Fixtures: reuse the `straightNorthRef(nVerts, stepM)` shape from `routeasset_runtime_suite.ts:46-56` (copy the ~10-line helper; suites do not share fixtures today) and add `lShapedRef()`: 2000 m due east (rx 0→2000, ry 0) then 1000 m due north (rx 2000, ry 0→1000), 5 m steps, `lat0 50.85, lon0 4.68` — 601 vertices, `length 3000`. Box for all tests: `W = 320, H = 200` unless stated. Tolerance `1e-6` px unless stated.

1. **refit is a tight, inset fit.** `buildCardMapFrame(lShapedRef(), 320, 200)`: every `path` vertex projects into `[22, 298] × [22, 178]`; the constraining axis touches both insets — for the L (2 km wide × 1 km tall in Mercator) that is x: `min px ≈ 22`, `max px ≈ 298`; y is centred (`min py + max py ≈ 200`).
2. **refit preserves shape.** For the same path, the ratio (pixel distance vertex 0→100) / (pixel distance vertex 100→200) equals the same ratio computed in the 900×1400 asset (`buildRuntimeRouteAsset` un-refitted), within 1e-9 — the re-fit is a pure similarity transform.
3. **refit re-projects gates.** `refitAssetToBox` on an asset built with gates `[0, 1500, 3000]`: each returned gate's `px/py` equals `projectToPixel(refit, gate.lat, gate.lon)`.
4. **frame is per-ref, decimated, and ignores its own gates.** `buildCardMapFrame(straightNorthRef(1000, 5), …).path.length` is within `[150, 200]` (the builder's own rule); `gates.length === 2` (only START/FINISH were asked for).
5. **segments chain.** `pathSegmentsPx(frame)` has `path.length − 1` entries; reconstructing each end (`x0 + len·cos(ang)`, `y0 + len·sin(ang)`) equals the next segment's `(x0, y0)`; the sum of `len` equals the projected polyline length.
6. **straight route: marks slide along the line, ticks perpendicular.** `straightNorthRef(1000, 5)`; marks at `s = 500, 1000, 2500, 4000`: all `cx` equal (`= 160` — the degenerate-x fit centres the line); `cy` strictly decreases with `s` (north is up); `angDeg` ≈ 0 or ±180 (horizontal tick across a vertical road); the tick's midpoint `(x0 + len/2·cos, y0 + len/2·sin)` equals `(cx, cy)`.
7. **the regression test for "not the straight render" — a nudge turns the corner.** `lShapedRef()`; marks at `s = 1900, 1950, 2000, 2050, 2100` (a +50 pad step each): `cx` strictly increases across 1900→1950→2000 with `cy` constant, then `cy` strictly decreases across 2000→2050→2100 with `cx` constant. A linear bar could not produce this.
8. **tick heading follows the road.** On the L: `s = 1000` → `|angDeg| ≈ 90` (vertical tick on the east leg); `s = 2500` → `angDeg ≈ 0/180` (horizontal tick on the north leg); `s = 2000` (the corner, probes at 1990 on the east leg and 2010 on the north leg → heading north-east, which is up-right on screen) → `angDeg ≈ 45` or `−135` (≡ 45 mod 180) and no NaN anywhere.
9. **ends and out-of-range chainages are safe.** `s = 0`, `s = ref.length`, `s = −50`, `s = ref.length + 50`: finite numbers, out-of-range clamped to the end marks, `len ≥ CARD_TICK_MIN_PX`.
10. **min tick length.** `straightNorthRef(1000, 5)` (4 995 m in a 200 px tall box → `metresPerPixel` ≈ 32 m/px, so 30 m ≈ 0.9 px): `len === CARD_TICK_MIN_PX`; with `factor = CARD_TICK_SELECTED_FACTOR` it is exactly `1.6×` that. A short ref (`straightNorthRef(41, 5)`, 200 m; ≈ 1.3 m/px) gives `len ≈ 30 / 1.3 ≈ 23 px > CARD_TICK_MIN_PX` (assert `len > CARD_TICK_MIN_PX` and `numEq(len, 30 / metresPerPixel(frame, lat), 1e-6)`).
11. **the pad and the map agree.** `straightNorthRef(801, 5)` (length exactly 4000), `base = [40, 1000, 2000, 3000, 3960]`, `L = 4000`: `next = clampNudge(base, 2, +50, L)`; `gateMarkPx(ref, frame, next).cx/cy` equals `projectToPixel(frame, …pointAtChainage(ref, 2050))`. (Ties the existing model to the new map: one chainage, one point.)
12. **degenerate ref.** A 2-vertex ref of length 0 (`ch = [0, 0]`): `buildCardMapFrame` does not throw, `pathSegmentsPx` returns `[]` or a zero-length segment, `gateMarkPx(…, 0)` returns finite numbers (heading fallback east → vertical tick).

Not headless-testable, so listed as the on-device acceptance checklist (§4.1): the segments actually render as a curve, the tap targets select, the selected halo appears, the label offset on a loop.

### 4.1 On-device acceptance (post-execute, Nathan or a device session)

1. Record a ride with at least one clear bend → CREATE WAY → name it → the gate card shows the ridden shape (north-up), five ticks across the road, START/FINISH dim, G1-G3 in accent.
2. Tap G2: halo + thicker/longer tick; readout shows its chainage. Tap `+50` repeatedly through a bend: the tick follows the bend, its orientation rotating with the road; the readout increments by 50 until clamped 50 m short of G3.
3. `−50`/`−10` back; SAVE GATES → Routes/Result map shows the gates where the card showed them (the WP-C `RouteMapView` render of gate-set v2).
4. KEEP GATES with nothing moved exits as before; "discard nudges" reverts.
5. A loop ride: START and FINISH labels both legible (FINISH dropped a line).
6. Dark theme: path and locked ticks in `textDim`, adjustable in accent, nothing invisible.

## 5. Verification

```bash
cd app
node --experimental-strip-types tests/run.ts     # expect: +12 PASS in gateadjustmap_suite, 0 FAIL, existing counts unchanged
./node_modules/.bin/tsc --noEmit
```

Manual reads before declaring done: `grep -n "barLine\|tickHit\|tickSelected" app/src/ui/gateAdjustCard.tsx` returns nothing; `grep -n "refLine=" app/src/ui/RecordScreen.tsx` returns the one new prop; `grep -n "from './routeAssetRuntime'" app/src/ui/gateAdjustModel.ts` returns nothing (cycle guard, §2.5).

## 6. Files touched

**In scope now (map half):**
- NEW `app/src/ui/gateAdjustMapModel.ts` — §3.1 (pure).
- NEW `app/tests/gateadjustmap_suite.ts` — §4 (12 tests).
- EDIT `app/tests/run.ts` — one import line (§3.4).
- EDIT `app/src/ui/gateAdjustCard.tsx` — new `refLine` prop, map area replaces the bar (lines 67-92), styles, header comment (§3.3).
- EDIT `app/src/ui/RecordScreen.tsx` — `RefLine` type import, `GateAdjustDraft.ref`, `setAdjust` gains `ref`, `refLine` prop on the card (§3.2).
- EDIT `cycles/virgin-cycle1/README.md` — the usual "Testing WP-I today" entry (coordinator).

**Deliberately NOT touched:** `app/src/ui/routeMapView.tsx`, `app/src/ui/routeAssetRuntime.ts`, `app/src/ui/routeMapMath.ts`, `app/src/ui/gateAdjustModel.ts`, `app/package.json`, `STATE.md`, `app/src/store/*` (persistence path unchanged).

**Only if §3.5 is later authorized:** `gateAdjustMapModel.ts` (+§3.5.2), `gateAdjustCard.tsx` (+§3.5.3), `gateadjustmap_suite.ts` (+S1-S4), `STATE.md:103-104` and the SETUP-UX §4 citation (§3.5.5), `QUESTIONS-FOR-NATHAN.md` (answer appended).

## 7. Open questions

1. **Finger-scrub authorization — a genuine product decision for Nathan, not defaulted here (blocks §3.5 only; the map half does not wait on it).** Q1 asked two things at once: keep the pad or replace it, and whether to add the scrub at all. The answer — "alright lets keep the +- pad, but it should still move the gates on a real ride line. Not the straight render I have now." — clearly settles the first (pad stays) and is emphatic about the map (built by this WP), but never says "yes, add the scrub." It could equally mean "just make the pad move gates on the real line" (i.e. the scrub is not wanted, or not wanted yet). Because `STATE.md:103-104` is binding and currently says "never finger-dragging", building the scrub on this wording would be an unlogged amendment of a settled rule; dropping it silently would be discarding Nathan's own earlier ask. So the question goes back, plainly: *"The gate card now draws your real ride line and the ± pad moves the gates along it (WP-I map half). Separately: do you also want the finger-scrub — tap a gate, then slide left/right anywhere on the card to move it coarsely along the ride, with the ± pad kept for fine steps? Yes / no / not now. If yes, STATE.md's 'never finger-dragging' line gets amended to 'select-then-move; never dragging the marker under the thumb'."* Until answered: §3.5 is not executed, STATE.md is not edited, and the card's hint copy stays as today.
2. **Map height (not blocking; a taste call the executor may make).** §3.3 uses `MAP_H = 200`. The `'ending'` column has a flex spacer below the card, so 200 px fits on every phone the app targets; a very tall N-S route in a 320×200 box will be small (height-constrained), but every route stays whole, north-up, with 22 px insets. If it looks cramped on device, 240 is the next stop — nothing else changes.
3. **Loop label overlap (not blocking).** §3.3's 12 px FINISH drop is the minimum that keeps both end labels legible; a proper "loop" treatment (one combined "START/FINISH" label) is a one-line follow-up if Nathan rides loops often.
4. **Tiles under the gates (not this WP's question, noted for the record).** If Nathan, on seeing the real line, asks for the basemap too, the path is §3.0 option (b): an `assetOverride` prop on `RouteMapView` fed by `buildRuntimeRouteAsset(refLine, chainageM)` from the card — the pure module built here already produces that asset. Not proposed now: the complaint was the shape, not the tiles, and (b) forfeits headless-testable gate selection.
