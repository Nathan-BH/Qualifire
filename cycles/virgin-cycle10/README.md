# virgin-cycle10 — live-map gate ticks collapse to a dot when zoomed out (fit view)

**Status (2026-09-16): code change made, uncommitted.** tsc clean, full test suite passing
(see Tests below). Not yet visually verified on device/emulator — see "Not done / open
items".

## What was investigated

Nathan reported that ride "gates" (the perpendicular tick marks crossing the route path —
START/sector markers) render correctly as a visible short line across the ride path on the
live map when zoomed IN (e.g. centred on "me"), matching the reference marketing MP4/demo
render, but when the map is zoomed OUT — e.g. tapping "fit" to see the whole ride — the gate
lines collapse down to a single point/dot instead of staying a visible bar, unlike the
marketing render which keeps them visible at every zoom level shown.

## Root cause

The live map has two rendering rungs. The MapLibre rung draws each gate as a GeoJSON
`LineString` with a fixed +/-15-metre GEOGRAPHIC offset from the gate point
(`gateTicksFeatureCollection` in `app/src/ui/wayMapGeo.ts`, now lines 362-406, called from
`app/src/ui/wayMapView.tsx` at line 591). That LineString is drawn by two MapLibre `line`
layers (`app/src/ui/wayMapView.tsx` lines 809-815, `gate-ticks-casing` / `gate-ticks`) whose
`line-width` is a constant number of SCREEN PIXELS — this is normal MapLibre GL behaviour,
`line-width` does not auto-scale with zoom. Since the tick's real-world length is fixed at
30 m total but its on-screen pixel length shrinks as the map zooms out, at typical whole-ride
"fit" zoom levels (roughly zoom 12-13 depending on ride length) a 30 m tick is only a few
screen pixels long. With `line-cap: 'round'` on both layers, a near-zero-length line renders
as a filled circle -- i.e. a dot, not a line. The PNG fallback rung was never affected: its
own tick builder (`gateTickPx` in `app/src/ui/wayMapMath.ts`) computes tick length directly
in pixel space and the caller already applies a 10px floor (`wayMapView.tsx`, PNG-rung
drawing code), so it was left untouched.

## Fix applied

**`app/src/ui/wayMapGeo.ts`** -- new pure helper, `gateHalfLenM(lat, zoom, minHalfPx = 7,
floorM = 15)`, placed immediately above `gateTicksFeatureCollection` (around line 357):

```ts
export function gateHalfLenM(lat: number, zoom: number, minHalfPx = 7, floorM = 15): number {
  const metresPerPixelAtZoom = (78271.517 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  return Math.max(floorM, minHalfPx * metresPerPixelAtZoom);
}
```

It returns the larger of the existing fixed 15 m floor and whatever geographic half-length
currently projects to `minHalfPx` (7) screen pixels at the given MapLibre zoom, using the
standard Web Mercator metres-per-pixel-at-zoom-0-at-equator constant (78271.517, for 512px
tiles, matching MapLibre GL's own tile math) corrected for latitude via `cos(lat)`. At high
zoom (follow mode, e.g. zoom 16) the 15 m floor wins and nothing visually changes from
today. At low zoom (whole-ride fit) the half-length grows so the tick stays roughly 14px+
wide on screen regardless of how far out the map is zoomed. This is deliberately a
*different* formula from `wayMapMath.ts`'s `metresPerPixel()`, which scales the PNG rung's
own pre-rendered asset pixel grid and has nothing to do with live MapLibre zoom -- the two
were not conflated. No existing MapLibre-zoom-aware metres-per-pixel helper was found
elsewhere in the codebase to reuse.

**`app/src/ui/wayMapView.tsx`**:
- `RegionDidChangeEvent`'s local type (line 125) gained a `zoom: number` field. Confirmed
  against the installed `@maplibre/maplibre-react-native` version (11.3.6,
  `node_modules/@maplibre/maplibre-react-native/lib/typescript/commonjs/components/map/Map.d.ts`):
  `onRegionDidChange` fires `NativeSyntheticEvent<ViewStateChangeEvent>`, and
  `ViewStateChangeEvent = ViewState & { animated; userInteraction }` where
  `ViewState = { center; zoom; bearing; pitch; bounds }`. The field is **`zoom`** -- it sits
  directly alongside the `bearing` field this same handler already read, in the same object,
  so this is a confirmed field name, not a guess.
- New state `liveZoom` (`useState<number | null>(null)`, near `camZoom`, line 398), updated
  from the existing `onRegionDidChange` handler (line 663) unconditionally -- i.e. NOT gated
  on `rotateEnabled`/`userInteraction` the way the existing `setUserBearing` call is, because
  `onRegionDidChange` also fires for a *programmatic* camera push (a "fit" tap is
  programmatic, not a user gesture), and that is exactly the case this fix needs to observe.
  The pre-existing `camZoom` state was not reused for this because it only tracks the +/-
  follow-zoom buttons and is never updated by MapLibre's own bounds-fit zoom calculation.
- The `gateTicksFeatureCollection(...)` call site (was line 567, now ~591) now passes a
  computed `halfLenM`: `gateHalfLenM(asset.gates[0]?.lat ?? 0, liveZoom ?? camZoom)`, using
  the first gate's latitude as a representative latitude for the `cos(lat)` correction (the
  correction varies negligibly across one ride's extent) and falling back to `camZoom` (16)
  until the map has reported its first region change.
- Not wrapped in `useMemo`: this call sits after the component's `riderOnly` early return
  (`if (riderOnly && !showRider && !hasTrail) return null;`), so a hook there would violate
  the Rules of Hooks. It stays in the pre-existing unmemoized-per-render pattern that
  `gateTicksFC`, `gatesFC` and `drawable` already use just above it -- no new performance
  regression introduced, and none was fixed either (out of scope for this bug).

**Not touched**: `gateTickPx` / `metresPerPixel` in `app/src/ui/wayMapMath.ts` (the PNG
rung) -- already correct, unrelated to this bug.

## Tests

**Added**: `app/tests/wayasset_runtime_suite.ts`, new test `gateHalfLenM: floors at 15m at a
high (follow-mode) zoom, and grows well past it at a low (whole-ride fit) zoom` -- asserts
exactly `15` at zoom 16 (the floor), `> 15` and `< 500` (order-of-magnitude sanity, not a
brittle exact float) at zoom 12, and monotonic non-shrinking behaviour zoom 12 -> 10.

**Result after the change**: `node --experimental-strip-types tests/run.ts` ->
**587 tests: 584 pass, 0 fail, 3 skip** (the 3 skips are pre-existing and unrelated to this
change; the new `gateHalfLenM` test is among the 584 passes).

**tsc**: `node ./node_modules/typescript/bin/tsc --noEmit` -> clean, no output, no errors.

A "before" baseline run was not captured separately (the fix was made directly per the
brief's guidance); the fresh-context Fable Inspect pass this project's model-tier approach
calls for on anything landing code has not yet run against this diff -- see below.

## Status

**Uncommitted.** Native git (`git add`/`git commit`/`git push`) is explicitly Nathan's own
job per this session's constraints -- nothing here has been staged or committed. The three
changed files are `app/src/ui/wayMapGeo.ts`, `app/src/ui/wayMapView.tsx`,
`app/tests/wayasset_runtime_suite.ts`.

## Not done / open items

- **No visual verification.** This fix cannot be visually confirmed without actually
  running the app on a device or emulator -- a headless container can't render a real
  MapLibre map. Nathan should eyeball a whole-ride "fit" view on his phone/emulator once he
  pulls this in, to confirm gates now look like short visible bars instead of dots, at both
  a close-in follow zoom (should look unchanged) and a zoomed-all-the-way-out fit view.
- **Fresh-context Fable Inspect pass**: per this project's model-tier approach, anything
  that lands code should get a fresh-context Fable subagent re-reading the code and rerunning
  every check itself. That pass has not been run against this specific diff yet -- flagging
  so the coordinator can dispatch it before this is considered fully checked in the
  project's own process, separate from the mechanical tsc/test results above (which did
  pass).
- **PNG-rung / symbol-layer alternative, considered but not implemented**: an alternative
  approach was considered -- a MapLibre `symbol` layer with an `icon-size` zoom expression
  (baking the tick into a small pre-rendered icon whose size follows a zoom stop function)
  instead of raw `line` geometry with a widening geographic offset. This was not implemented
  because the geometry-widening approach (this fix) is simpler, keeps the existing
  `line`-layer casing/core colour logic untouched, and needed no new image asset. Noted here
  as a fallback idea if the geometry-widening approach still looks jumpy or produces visual
  artifacts (e.g. a visible "pop" in tick length) during a live pinch-zoom gesture, since
  `gateHalfLenM` is only recomputed when `onRegionDidChange` fires (gesture/animation end),
  not continuously during the gesture itself.
- **Representative latitude simplification**: `gateHalfLenM` is called once per render using
  `asset.gates[0]?.lat` rather than a true per-gate latitude or a route-bounds-centre
  latitude. For an unusually long or latitude-spanning route this could make the tick length
  marginally uneven across gates; not expected to be visually meaningful at any route length
  this app currently supports, but flagged for completeness.

See `COMMANDS.md` in this folder for the exact commands to rerun the checks above or to
build/run the app for the on-device look.
