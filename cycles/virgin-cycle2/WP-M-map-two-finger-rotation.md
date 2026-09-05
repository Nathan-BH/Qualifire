**Status: BRIEF WRITTEN, NOT YET EXECUTED.**
**Source:** `cycles/virgin-cycle2/QUESTIONS-FOR-NATHAN.md` Q3, answered 2026-09-05 — Nathan's own full
design spec (quoted in §1). Size: **small-medium** — one component file (`routeMapView.tsx`, ~+45
lines net: one state + one effect + one ref + one callback + one button + a prop flip), one pure
function extended by one optional field (`routeMapGeo.ts`, ~6 lines), one new pure helper (~8
lines), ~6 tests added across two existing suites. No screen file changes. No new dependency.
**Written by:** Plan tier (Fable), 2026-09-05, against the live repo — every line number below was
read from the mounted working tree on that date (`routeMapView.tsx` is 980 lines). Re-anchor by
string, not by number, at execute time: WP-J/WP-K/WP-L may have moved things.

## 1. What it is

Nathan (2026-09-04) noticed the map does not turn when you rotate two fingers on it, and asked
whether that was design or omission. His answer to Q3 (2026-09-05), verbatim:

> Lets try to implement it if its not too troublesome. It should be a switchable setting, but not
> in the settings, a single button that switches between two states. Add it to the openmap buttons
> (together with the zoom, "me" and "fit" buttons that are on the top right of the openmaps renders.
> - maybe a small question I have: what is the current openmaps orientation, is it just "north" on
>   the top? or is nothing specified. I think that's what's set because when I zoom out I see the
>   full world map with Europe on top a southern hemisphere on the bottom
> - if we implement the two fingers rotation feature, the map should turn accordingly and then you
>   can "reset" the view by pressing the new compass button we will add. pressing it will switch
>   between north on top like now. This is every openmap render except the race mode one. (so the
>   after pressing record yes, but once you press start not anymore) For all other openmaps such as
>   the ones in the record tab, rides, results or anywhere else they should have this feature.
> - in actual race mode we just keep it as it is now with the orientation matching the route's
>   direction. no change needed.

So, three things:

1. **Two-finger rotation ON** on every MapLibre map except the actual race ribbon.
2. **A compass button** in the existing top-right cluster (`+` `−` `FIT` `ME`) that resets the map to
   north-up. A direct action — not a menu, not a Settings row.
3. **Race mode untouched** — course-up (direction of travel) exactly as today.

### Nathan's sub-question, answered (read this straight from the brief, no need to check the code)

**Yes: today every non-race map is hard-pinned to true north up, and the race map is course-up.**
Precisely, from `app/src/ui/routeMapView.tsx`:

- Line 374: `const effectiveBearing = variant === 'browse' || liveState === 'prestart' ? 0 : bearing;`
  Every `variant="browse"` map (ROUTES tab cards, RIDES detail/trace, RESULT, DEMO) and the live
  map **before START** (`liveState === 'prestart'`) always get bearing 0 = north up. That is why a
  zoomed-out world shows Europe on top.
- Lines 355–371: once you press START (`liveState` `moving`/`stopped`) `bearing` is recomputed
  live from `bearingBetween()` on each GPS fix that moved ≥ 8 m — that is the course-up race view.
  `finished` stops updating it and HOLDS the last course-up value.
- Line 541: `touchRotate={false}` on `<M.Map>`. The rotate gesture is **explicitly switched off**,
  on every map, always — it is not merely unspecified. (QUESTIONS-FOR-NATHAN.md's line "no code was
  found gating two-finger rotation off on purpose" was wrong on that detail; the file header at
  lines 25–26 even says "pan/zoom/rotate-off gestures". The intent behind it, per the header, was
  D-006 "no controls while moving", later relaxed for pan/zoom only in Cycle 020.) So the honest
  answer to "design or omission" is: switched off deliberately as part of the locked-ribbon
  contract, then never revisited when pan/zoom were unlocked. Nothing else about orientation is
  specified anywhere — no compass, no heading-follow, no persisted orientation.

## 2. Current state (verified 2026-09-05, exact repo)

### 2.1 `app/src/ui/routeMapView.tsx` — the ONLY file that renders a MapLibre map

Two rungs, one exported component (line 249 `RouteMapView` → `MapLibreRouteMap` when the native
module loaded, else `PngRouteMap`). All screens render maps through it — nothing else in `src/ui`
touches `@maplibre/maplibre-react-native` (grep confirmed). WP-J, when it lands, feeds a
`variant="browse"` `RouteMapView` into the gate-adjust card, so it inherits this WP for free.

| Anchor | Line | What |
|---|---|---|
| Header doc "rotate-off" | 25–26 | update wording (§3.7) |
| `import type { CameraStop }` | 90 | add `CameraRef` here (§3.4) |
| `type RegionWillChangeEvent` | 92–97 | structural event type — `{ nativeEvent: { userInteraction: boolean } }`; extend with `bearing` (§3.3) |
| `type LiveMapState` | 175 | `'prestart' \| 'moving' \| 'stopped' \| 'finished'` |
| `const unlocked` | 329 | browse ∨ prestart ∨ finished — the existing "released back to browse" matrix; the new rotate rule mirrors it exactly |
| `const [bearing, …]` / `bearingLive` | 355–357 | course-up state, updates only moving/stopped — **DO NOT TOUCH** |
| `const effectiveBearing` | 374 | **DO NOT TOUCH** — composition happens downstream (§3.2) |
| `const cameraProps = cameraTargetFor({…})` | 493–499 | passes `bearing: effectiveBearing`; add `userBearing` (§3.2) |
| `<M.Map` open tag | 521–543 | `onRegionWillChange` at 531–533 flips `mode` to `'free'` on any user gesture; `touchRotate={false}` at **541**; `touchPitch={false}` at 542 (stays false) |
| `<M.Camera {...cameraProps} />` | 544 | needs a `ref` (§3.4) |
| MapLibre zoom bar | 683–702 | `+` `−` `FIT` `ME` (ME only when `showRider`). **Compass goes here** (§3.5) |
| PNG zoom bar | 911–923 | `+` `−` `FIT`. **NOT touched** — the PNG rung is a cropped bitmap, it cannot rotate, so a compass there would be a lie |
| `st.zoomBar` / `zoomBtn` / `zoomText` | 952–957 | reuse as-is; the compass is one more `zoomBtn` |

Confirmed: there ARE two button-cluster render sites, one per rung (683 MapLibre, 911 PNG), the
same per-rung split as gate ticks / credit / badges. Only the MapLibre one changes.

### 2.2 How a gesture flows today (important — half the feature already exists)

`onRegionWillChange` with `userInteraction === true` → `setMode('free')` → `cameraTargetFor` returns
`{}` (routeMapGeo.ts line 411) → the declarative `<M.Camera>` pushes nothing → the map stays where
the user left it. So **once `touchRotate` is true, a two-finger rotation already "holds"** — until
the next thing that leaves `'free'`: pressing `+`/`−` (→ `'follow'`), `FIT` (→ `'fit'`), `ME`
(→ `'follow'`), or the mode-reset effect at 337–340 (`props.zoom`/`variant`/`phaseKey`/`routeId`
change). Each of those re-pushes `bearing: effectiveBearing` (= 0 on browse/prestart) or, for
`'fit'`, the hard-pinned `bearing: 0` at routeMapGeo.ts line 415 — **snapping the rotation away**.
That snap-back is the one real wrinkle: Nathan wants the rotation held until the compass is
tapped, so the user's bearing must be remembered in React state and fed back into the camera
target, not just left to the native view.

### 2.3 `app/src/ui/routeMapGeo.ts` — `cameraTargetFor` (lines 403–429, pure, tested)

```ts
export function cameraTargetFor(input: { mode; here; bounds; zoom; bearing }): CameraTarget
  free → {}
  fit+bounds → { bounds, bearing: 0, padding }        // line 415 pins 0
  here → { center, zoom, bearing, pitch: 0, duration: 500 }
  bounds → { center: midpoint, zoom, bearing, pitch: 0, duration: 500 }
  else {}
```
Locked by `tests/routemapgeo_suite.ts` 450–475 (free → `{}`; fit pins bearing 0; fit+null bounds
degrades to follow). Those tests must keep passing unchanged.

### 2.4 MapLibre React Native `11.3.6` (installed, `app/node_modules/@maplibre/maplibre-react-native`)

Everything needed exists; nothing exotic:

- `Map` prop `touchRotate?: boolean` (default `true`) — `src/components/map/Map.tsx` line 360. Plain
  native prop; toggling it at runtime on a mounted map is supported (it is a setter, not
  init-only). Our file passes a literal `false`.
- `onRegionDidChange?: (e: NativeSyntheticEvent<ViewStateChangeEvent>) => void` — Map.tsx 484. Fires
  once when a gesture/animation ENDS. `ViewStateChangeEvent = ViewState & { animated: boolean;
  userInteraction: boolean }` and `ViewState = { center, zoom, bearing, pitch, bounds }` (Map.tsx
  61–75). Android side confirmed putting `bearing` and `userInteraction` in the payload
  (`MLRNMapView.kt` 1392, 1415). So **the user's bearing is read back from `e.nativeEvent.bearing`
  on `onRegionDidChange` when `userInteraction` is true** — no polling, no `getViewState()`.
- `CameraRef.setStop(stop: CameraStop)` — `src/components/camera/Camera.tsx` 137–200 & 296–330. A
  `CameraStop` with **neither `center` nor `bounds`** is a legal variant (Camera.tsx 104–112), so
  `cameraRef.current?.setStop({ bearing: 0, duration: 400, easing: 'ease' })` rotates to north
  while leaving center/zoom exactly where the user has them. `setStop` throws
  `"NativeCameraComponent ref is null, wait for the map being initialized"` if called before mount
  → wrap in try/catch. Both `CameraRef` and `ViewStateChangeEvent` are exported from the package
  root (`src/index.ts` 19–20, 88+).
- `CameraStop` with `bounds` + `bearing` together is also legal (`CameraBoundsStop = CameraOptions &
  CameraAnimationOptions & CameraBoundsOptions`), which is what lets FIT keep a user rotation (§3.2).

### 2.5 Callers and which rule each lands in

| Screen : line | Props | Rule after this WP |
|---|---|---|
| `RecordScreen.tsx:1191` (phase `idle`, the RECORD-tab preview) | `variant="live" liveState="prestart"` | rotate ON + compass |
| `RecordScreen.tsx:929` (phase `armed` — after RECORD, before START) | `variant="live" liveState="prestart" fill` | rotate ON + compass ("after pressing record yes") |
| `RecordScreen.tsx:1036` (phase `running`) | `liveState={phase==='finished' ? 'finished' : stationary ? 'stopped' : 'moving'}` | moving/stopped: rotate OFF, no compass, course-up unchanged ("once you press start not anymore"); **finished: rotate ON + compass (judgment call, §6)** |
| `RideDetailScreen.tsx:382, 444, 461` | `variant="browse"` | rotate ON + compass |
| `RoutesScreen.tsx:211` (one per route card, inside a ScrollView) | `variant="browse"` | rotate ON + compass |
| `DemoScreen.tsx:193, 196` | `variant="browse"` | rotate ON + compass |
| WP-J gate-adjust card (future) | `variant="browse" showRider={false}` | rotate ON + compass, automatically |

No screen file needs editing. Scope is entirely decided inside `routeMapView.tsx` from
`variant`/`liveState`.

## 3. The fix

### 3.1 Pure scope rule — `rotateEnabledFor()` in `routeMapGeo.ts`

Add next to `cameraTargetFor` (keeps the rule headlessly testable, same doctrine as WP-D §3.1c):

```ts
/** WP-M (Nathan Q3, 2026-09-05): two-finger rotation is on everywhere except the actual race
 * ribbon. Mirrors routeMapView's `unlocked` matrix: browse, prestart and finished are "released
 * to browse"; moving/stopped stay course-up with the gesture off. */
export function rotateEnabledFor(variant: 'live' | 'browse', liveState: 'prestart' | 'moving' | 'stopped' | 'finished'): boolean {
  return variant === 'browse' || liveState === 'prestart' || liveState === 'finished';
}
```
(`RouteMapVariant`/`LiveMapState` are local type aliases in routeMapView.tsx lines 174–175; either
move them to routeMapGeo.ts and re-export, or spell the unions inline as above — Execute's call,
inline is fine.) In `MapLibreRouteMap`, after line 329: `const rotateEnabled = rotateEnabledFor(variant, liveState);`
— deliberately NOT `= unlocked`, so the two rules can diverge later without a hidden coupling
(and so the finished-state decision in §6 is one edit in one place).

### 3.2 State model — `userBearing: number | null`, composed downstream of `effectiveBearing`

```ts
// WP-M: the bearing the rider turned the map to with two fingers, read back from
// onRegionDidChange. null = no rotation intent — the camera keeps using the existing
// effectiveBearing rule (north-up on browse/prestart, course-up while racing, held at the
// finish). A number = hold THIS bearing on every camera push (+/−/FIT/ME/mode resets) until
// the compass button sets it back to 0. Per map instance, never persisted (§3.6).
const [userBearing, setUserBearing] = useState<number | null>(null);
useEffect(() => { if (!rotateEnabled) setUserBearing(null); }, [rotateEnabled]);
```
The effect is a belt-and-braces guard: today no mount goes rotate-on → rotate-off (prestart and
running are different `<RouteMapView>` mounts in RecordScreen), but if that ever changes a stale
user bearing must not override the live course-up.

**Line 374 (`effectiveBearing`) is not edited.** Composition happens in `cameraTargetFor`, by one
new optional input:

```ts
// routeMapGeo.ts
export function cameraTargetFor(input: {
  mode: 'follow' | 'fit' | 'free';
  here: ...; bounds: ...; zoom: number; bearing: number;
  /** WP-M: a bearing the rider set by two-finger rotation. When non-null it overrides
   * `bearing` on EVERY push — including 'fit', which otherwise pins 0 — so the rotation is
   * held until the compass resets it. undefined/null = pre-WP-M behaviour, byte-identical. */
  userBearing?: number | null;
}): CameraTarget {
  const { mode, here, bounds, zoom } = input;
  const userBearing = input.userBearing ?? null;
  const bearing = userBearing ?? input.bearing;
  if (mode === 'free') return {};
  if (mode === 'fit' && bounds) return { bounds: [...], bearing: userBearing ?? 0, padding: {...} };
  ... // follow branches use `bearing` exactly as before
}
```
And at line 493–499: `cameraTargetFor({ mode, here, bounds, zoom: camZoom, bearing: effectiveBearing, userBearing })`.

Why 0-not-null on reset (§3.4): on a `finished` map `effectiveBearing` is the HELD course-up
value. If the compass merely cleared `userBearing` to null, the next `+`/`ME` press would push the
held course-up bearing back and un-reset the map. Setting `userBearing = 0` is an explicit
"north-up, and stay there" intent that survives every later camera push. On browse/prestart 0
and null are indistinguishable (the computed value is 0 anyway).

### 3.3 Read the gesture back — `onRegionDidChange`

Extend the structural type at line 97 and add a second handler on `<M.Map>` (keep the existing
`onRegionWillChange` at 531–533 untouched — it still owns the `'free'` flip):

```ts
type RegionWillChangeEvent = { nativeEvent: { userInteraction: boolean } };
/** WP-M: onRegionDidChange carries the full ViewState; we read only the bearing. */
type RegionDidChangeEvent = { nativeEvent: { userInteraction: boolean; bearing: number } };
...
onRegionDidChange={(e: RegionDidChangeEvent) => {
  if (!rotateEnabled) return;                  // race ribbon: a pan must never capture course-up as intent
  if (!e?.nativeEvent?.userInteraction) return; // our own camera pushes (course-up updates, +/−, FIT) are not intent
  setUserBearing(e.nativeEvent.bearing);
}}
```
The `rotateEnabled` guard is load-bearing, not cosmetic: while racing `touchRotate` is false but a
one-finger PAN still ends with `userInteraction: true` and `bearing` = the current course-up
value; capturing that would freeze the ribbon's heading. Capturing on a plain pan when rotation IS
enabled is harmless (it records the bearing the map already has).

Optional (Execute's call, low value): also listen to `onRegionIsChanging` to spin the compass
needle live during the gesture. It fires per frame → one `setState` per frame. Not needed for
correctness; the needle updating at gesture end is fine. Default: don't.

### 3.4 Enable the gesture + the reset action

- Line 541: `touchRotate={false}` → `touchRotate={rotateEnabled}`. `touchPitch` stays `false`
  (Nathan asked for rotation, not tilt; a pitched map would also break `pitch: 0` in the follow
  pushes).
- Line 544: `<M.Camera ref={cameraRef} {...cameraProps} />` with
  `const cameraRef = useRef<CameraRef>(null);` (import `CameraRef` as a type alongside `CameraStop`
  at line 90). The `key={styleUrl}` remount on a theme flip re-attaches the ref automatically.
- Reset handler:

```ts
const resetNorth = () => {
  setUserBearing(0);   // sticky north-up intent (§3.2)
  try { cameraRef.current?.setStop({ bearing: 0, duration: 400, easing: 'ease' }); }
  catch { /* map not initialised yet — the declarative push will apply userBearing=0 instead */ }
};
```
Why the imperative call: after a rotation `mode` is `'free'` and the declarative
`<M.Camera {...{}}/>` pushes nothing, so state alone would not turn the map. `setStop` with only
`bearing` keeps center and zoom where the rider is looking — exactly "reset the view" without
re-fitting or re-centering. `mode` is NOT changed by the compass (a rider who rotated and panned
away and taps the compass expects north-up where they are, not a jump to the rider/route).

### 3.5 The compass button (MapLibre zoom bar, lines 683–702 only)

Insert after the `FIT` button and before the `ME` one (order: `+` `−` `FIT` `N` `ME` — reset-
the-view actions grouped, `ME` still last as today):

```tsx
{rotateEnabled ? (
  <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
    onPress={resetNorth}
    accessibilityLabel="Reset map to north up">
    <Text style={[st.zoomText, {
      color: (userBearing ?? effectiveBearing) === 0 ? t.textDim : t.text,
      transform: [{ rotate: `${-(userBearing ?? effectiveBearing)}deg` }],
    }]}>↑</Text>
  </Pressable>
) : null}
```
- **Glyph:** a plain `↑` in the existing `zoomText` style (17pt, weight 700 — same as `+`/`−`),
  rotated by minus the current bearing so it always points at true north, like every phone map's
  compass needle. No icon font / SVG library exists in this project (checked: the app uses text
  glyphs everywhere — `‖`, `–`, `+`, `−`; chips.tsx/liveView.tsx carry a `glyph: string`), so a
  text glyph is the house convention, not a shortcut. If `↑` renders poorly on the device font,
  fallback is the label `N` at `fontSize: 10.5, color: t.textDim` matching `FIT`/`ME`, un-rotated.
- **Visibility:** shown whenever `rotateEnabled`, even when already north-up (then dim
  `t.textDim`, like `FIT`/`ME`); full `t.text` once rotated. Rationale: a button that appears only
  after a gesture the rider may not know exists is undiscoverable, and Nathan explicitly asked
  for it "together with the zoom, me and fit buttons". Absent entirely on moving/stopped (it would
  be a no-op there and D-006's spirit is "no controls while moving").
- **PNG rung:** no button, no change (§2.1).

### 3.6 Persistence — none, per map instance

`userBearing` is component state: it lives for one mount of one map and is gone when the screen
unmounts or the RecordScreen phase swaps the map. Not persisted, not shared between screens.
Reasons: (a) Nathan framed it as "reset the view", a per-view thing; (b) the ROUTES tab renders
one map per route card — a shared bearing would rotate every card at once, which is not what
turning one card means; (c) an app-restart-persisted rotation would surprise on the next ride's
prestart map. If he later wants "remember my last rotation", that is a Settings-level decision
and a separate WP.

### 3.7 Doc comments

- File header lines 25–26: "pan/zoom/rotate-off gestures on" → "pan/zoom/rotate gestures on (WP-M:
  two-finger rotation + compass reset everywhere except moving/stopped)".
- Header: add a short WP-M paragraph after the WP-E one, in the same voice as the others, stating
  the three-line rule and the userBearing/compass model.
- `cameraTargetFor` doc (routeMapGeo.ts 383–394): one sentence on `userBearing`.
- The `touchRotate` line itself: a comment pointing at `rotateEnabledFor`.

### 3.8 Ordering / collisions

- **WP-J** states "Does not add two-finger map rotation — `touchRotate` stays `false` everywhere"
  (WP-J line 41). That is a scope exclusion, not a requirement; WP-M is the WP that flips it. If
  WP-J executes AFTER WP-M, its executor must not re-pin `touchRotate={false}` — add a one-line note
  to WP-J's §"out of scope" when WP-M lands. If WP-J executes BEFORE, nothing to do: its map is a
  `variant="browse"` `RouteMapView` and inherits rotation.
- WP-K/WP-L touch screen files only; no overlap with this WP's two files.
- Both rungs' zoom bars are inside `routeMapView.tsx`; nothing else renders `st.zoomBar`.

## 4. Acceptance criteria

Nathan's three scope rules, as testable behaviour, plus one judgment call:

1. **Browse maps (ROUTES cards, RIDES detail/trace, RESULT, DEMO, WP-J card): rotation ON.** Two
   fingers rotate the map; it stays rotated after lifting, after `+`/`−`, after `FIT`, after a
   pan. The `↑` compass button is in the top-right cluster; tapping it animates the map back to
   north-up, keeping the current center and zoom, and the arrow returns to straight-up/dim.
2. **RECORD tab before START (`liveState='prestart'`, both the idle preview and the post-RECORD
   armed map): rotation ON**, same behaviour and same button as (1).
3. **Actual race (`liveState='moving'|'stopped'`): rotation OFF, no compass button, course-up
   exactly as before this WP.** Two fingers do NOT rotate. Pan/zoom still work (Cycle 020). The
   heading still follows travel direction, still holds through a red light (`stopped`), the frame
   still dims. A pan during the race does not freeze the heading (§3.3 guard).
4. **After the finish (`liveState='finished'`) — judgment call, see §6.1: rotation ON + compass.**
   The held course-up bearing is kept until the rider rotates or taps the compass; the compass
   then gives north-up and later `+`/`ME` presses do not bring the course-up bearing back.
5. The PNG fallback rung is unchanged (no compass, no rotation — it cannot).
6. Pre-existing behaviour is byte-identical when nobody rotates: `cameraTargetFor` without
   `userBearing` returns exactly what it returns today; all current tests pass unchanged.
7. `npm run typecheck` clean; `touchPitch` still `false`.

## 5. Verification

```
cd app && npm run typecheck
node --experimental-strip-types app/tests/run.ts        # from repo root; whole suite must stay green
```

**Tests to add (all headless, all pure):**

`tests/routemapgeo_suite.ts`, after the WP-D `cameraTargetFor` block (line ~475):
- `cameraTargetFor — userBearing overrides bearing in follow mode` (here set, bearing 90,
  userBearing 47 → `bearing === 47`).
- `cameraTargetFor — userBearing overrides the fit pin` (fit+bounds, userBearing 47 → `bearing
  === 47`; userBearing 0 → 0; userBearing null/undefined → 0, i.e. the existing test still holds).
- `cameraTargetFor — free mode is still {} even with userBearing`.
- `rotateEnabledFor — the WP-M scope matrix`: browse×{prestart,moving,stopped,finished} → true;
  live×prestart → true; live×moving → false; live×stopped → false; live×finished → true (the §6.1
  call — if Nathan overrules, this one assertion flips).

`tests/routemap_suite.ts`, next to the two existing source-grep guards (lines 244–275, same
"cannot render headlessly, lock the source" doctrine):
- `<M.Map>` open tag (slice between `<M.Map` and `<M.Camera`, as the cycle-023 test does) contains
  `touchRotate={rotateEnabled}` (not a literal `false`), `touchPitch={false}`, and an
  `onRegionDidChange=` handler.
- The MapLibre zoom bar (slice from the first `st.zoomBar` to `<Credit rung="maplibre"`) contains
  exactly one `onPress={resetNorth}`; the PNG zoom bar (slice from the second `st.zoomBar` to
  `MAP IMAGE FAILED`) contains none.

**What cannot be tested headless — Nathan's on-device check, and this WP is not done without it:**
- Two-finger rotate actually turns the map on a ROUTES card (inside the ScrollView — check the
  gesture is not eaten by the scroll), on a RIDES trace, on the RECORD-tab preview, and on the
  post-RECORD armed map.
- The rotation holds through `+`, `−`, `FIT` and a pan; the compass animates back to north
  keeping center/zoom; the `↑` needle points at north and dims when north-up.
- `FIT` on a rotated map fits the bounds AT the rotation (bounds+bearing camera stop — the one
  native behaviour this brief could not confirm from the JS types alone; if it fits north-up
  instead, fall back to §6.3's alternative).
- Press START, ride: no rotation possible, heading follows the route, no compass button, a pan
  does not freeze the heading; red-light dim unchanged. Finish: rotation and compass appear.
- Day/night theme flip on a rotated map: the `key={styleUrl}` remount resets the native view —
  the map may come back north-up (userBearing survives in React state and re-applies on the next
  non-free push). Acceptable; note it, don't fight it.
- Update `tests/README.md`'s device-only checklist with these bullets.

## 6. Stop-on-ambiguity

Standard clause: if an anchor in §2 is not where this brief says (WP-J/K/L may have moved it),
re-anchor by string; if the surrounding logic has changed shape (e.g. `effectiveBearing` or
`cameraTargetFor` no longer look like §2), STOP and report rather than improvise. Never touch
lines 355–374 (course-up state) beyond adding the downstream composition. Never change the PNG
rung. Never add a Settings row.

Judgment calls made in this brief — flag to Nathan, do not silently re-decide:

1. **`finished` state: rotation ON + compass (§3.1, criterion 4).** Nathan's answer names prestart
   ("after pressing record yes"), the race ("once you press start not anymore") and "every other
   openmap". He did not mention the map after the finish. It is no longer race mode, the code
   already treats it as "released back to browse" (`unlocked`, labels on), and his framing was
   "every render except the race mode one" — so ON is the consistent reading. If he wants the
   finished map to stay locked course-up, the whole change is `rotateEnabledFor` dropping the
   `finished` clause plus flipping one assertion. **Confirm with him.**
2. **"A single button that switches between two states."** This brief reads it as: state A = the
   map as the rider rotated it, state B = north-up; tapping goes to B; there is nothing to "toggle
   back" to (re-rotating to a remembered angle would be strange). Two-finger rotation is simply
   always available where the button is. The alternative reading — the button toggles the
   rotation GESTURE on/off (locked north vs free) — is not implemented; it adds a mode with no
   visible benefit over "just rotate it". Low stakes; mention it when reporting.
3. **FIT keeps the rotation** (bounds + userBearing). Alternative: FIT is also a reset (fit AND
   north-up). Chose "keep" because Nathan named the compass as THE reset; if the native
   bounds+bearing fit misbehaves on device, switch to the alternative (fit branch pins 0 as today,
   and FIT also calls `setUserBearing(0)`) — a 2-line change.
4. **Button glyph `↑` rotating with the map, always visible when enabled, dim when north-up**
   (§3.5). Fallback label `N`. Purely cosmetic; Nathan may prefer something else once he sees it.
5. **Compass keeps center/zoom** (imperative `setStop({bearing: 0})`, `mode` untouched) rather
   than re-following the rider/route. If Nathan expects "reset" to also re-center, add
   `setMode(showRider ? 'follow' : 'fit')` to `resetNorth` — one line.
6. **No persistence** (§3.6). If he wants the last rotation remembered across screens or restarts,
   that is a new Settings-level decision, not this WP.

---
## Inspect findings (2026-09-05, fresh-context Fable pass) — read before executing

**Verdict: PASS WITH FINDINGS.** Every load-bearing claim re-confirmed against the real repo and the installed `@maplibre/maplibre-react-native@11.3.6`: `effectiveBearing`/course-up logic verbatim as described; `touchRotate={false}` confirmed a genuine runtime-toggleable native prop; `onRegionDidChange` confirmed to carry `bearing`+`userInteraction` on both platforms; `cameraTargetFor` confirmed to have exactly one caller and seven existing tests that all omit the new field (clean additive change); both zoom-bar render sites confirmed; the PNG rung confirmed to genuinely have no rotation primitive (not a glossed-over ambiguity); the six new tests confirmed meaningful.

**One correction that matters:** §3.2's reasoning about resetting `userBearing` on the prestart→moving transition is understated as "belt-and-braces" — it's actually load-bearing. `RecordScreen.tsx`'s `armed` and `running` branches place `<RouteMapView>` at the same child index of an identical `<View style={styles.raceColumn}>`, so React reuses the SAME component instance across the prestart→moving transition (pressing START does not remount the map). The `useEffect` that nulls `userBearing` on this transition is therefore necessary, not optional — and even with it, there's a one-render window where the camera briefly animates back from the user's held rotation before the effect fires. **Execute should also pass `userBearing: rotateEnabled ? userBearing : null` directly into `cameraTargetFor`'s call** (not rely on the effect alone) to close that gap — belt-and-braces the OTHER way around from how the original brief framed it.

**Also confirmed (no action needed):** the "bounds+bearing FIT" combination the brief was unsure it could verify DOES work correctly on Android (the only platform this app ships to, per `eas.json`/`app.json`) — MapLibre's Android camera-for-bounds calculation accounts for bearing. Keep `compass={false}` (line ~536) — MapLibre has its own native compass widget an Execute agent might otherwise be tempted to enable instead of building the requested custom button; don't use it, Nathan asked for a button in the existing zoom-bar cluster, not MapLibre's built-in compass.

Minor: some of this brief's own internal line-number citations have drifted slightly (e.g. the mode-reset effect is closer to line 344-347 than originally cited) — re-verify anchors at execution time, standard practice.
