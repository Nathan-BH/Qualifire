**Status: DONE — landed on the device 2026-09-04, independently inspected (fresh Fable pass, clean; 2 doc/comment fixes). 468 tests, 465 pass, 0 fail, 3 skip (17 new); `tsc --noEmit` exit 0. `sectorTrailModel.ts` feeds `sectorColours` from all three surfaces (live map, RIDES tap / post-STOP ride-detail — both now the same `RideDetailScreen.tsx` post-WP-H), gated by `Settings.sectorColours` (default on). Fixed the WP-J casing-hides-spans bug by moving the sector-spans map source below the trail. Gate ticks untouched, per Nathan's rule. Inspection confirmed the z-order fix matters even more than expected — `RideDetailScreen.tsx`'s ride trace was already affected, not just the live map. 2 follow-ups filed in OPEN-ITEMS.md (a hand-synced colour-mapping duplicate; whether to also retire gate-tick recolouring now that spans exist everywhere).**
**Review doc item: 11 (T — parked in OPEN-ITEMS, "Nathan's call to unpause"). Size: medium.**
**Verified against the mount as read 2026-09-03 (`a03b84e`, branch `virgin`; last recorded suite 380 tests / 377 pass / 0 fail / 3 skip after WP-L).**

---

# WP-K — Sector-coloured trail, phase 2

## 1. Goal

Nathan's Q7 ruling (recorded, not open): *"agree, should be in the live racing map + when you popup a ride later in the RIDES tab it should be like that as well. (and maybe add a toggle in the options so people can choose if they rather keep the ride all yellow or have sectors colouring)"*.

Three deliverables, one shared mechanism:

1. **Live/racing map** — while a route ride is running, each sector's stretch of the route line takes the colour that sector earned the moment it is scored (purple / green / yellow via `tierLineColour`), exactly as the Result trace already does. Segments between gates only. Gate ticks are untouched (Nathan: *"the gates should not change colour ... they are gates. Just the sector segments changing colour is enough."*).
2. **RIDES tab "popup"** — the expanded accordion row (there is no other popup surface; WP-H's full-screen ride detail is still a stub) gains a small `variant="browse"` `RouteMapView` with the same sector-coloured spans, computed from the stored `RideResult`.
3. **Settings toggle** — `Settings.sectorColours: boolean`, default **ON**. OFF = "all yellow": every span transparent, lead-in/out uncoloured, i.e. pixel-identical to today's plain map on all three surfaces. One toggle, honoured at all three call sites through the same two-line pattern.

Non-goals: `gateColours` / `gateTicksFeatureCollection` (WP-E) are not touched; `sectorSpansFeatureCollection`'s own logic and its tests are not touched; no engine change (tier is derived on the fly, never stored — unchanged); no PNG-rung change (it never drew spans).

## 2. Current state (verified against `a03b84e`)

### 2.1 `RouteMapView` is already generic — only the caller is missing

`app/src/ui/routeMapView.tsx:184-192` (props) and `:453-454`:

```ts
const sectorSpansFC = !gatesOnly && asset && props.sectorColours
  ? sectorSpansFeatureCollection(asset, props.sectorColours, props.leadColour)
  : null;
```

Gated purely on `props.sectorColours` being truthy — no variant check. The layer (`:544-552`) paints `['case', ['has','colour'], ['get','colour'], 'rgba(0,0,0,0)']` at width 6 over the width-4 `colors.neutral` route core (`:524`). `sectorSpansFeatureCollection` (`routeMapGeo.ts:451-506`) returns null when the asset has no `path` or no matching `gateIdx`, reads `sectorColours?.[i] ?? null`, and treats `''` as null. So an **empty array `[]` is a valid "no colours" input** (truthy prop, every span transparent) and an array shorter than the gate count is safe (missing indices read as null).

### 2.2 Live call site — `RecordScreen.tsx:1055-1071`

```tsx
<RouteMapView
  routeId={live.mode === 'free' ? null : (live.track ?? rideRouteHint)}
  lat={status.lastLat} lon={status.lastLon} zoom={4}
  gateColours={gateColours}
  gatesOnly={live.mode === 'free'}
  crossedGates={live.freeCrossings}
  gateRouteIds={rideFreeRouteIds}
  trail={trail}
  variant="live"
  liveState={live.phase === 'finished' ? 'finished' : (stationary ? 'stopped' : 'moving')}
  fill
/>
```

No `sectorColours`, no `leadColour`. `settings` is `const { s: settings } = useSettings();` (`:171`).

### 2.3 `tierOf` vs `tierFor` — RESOLVED: same classifier, same window

`RecordScreen.tsx:807-812`:

```ts
const tierOf = (sectorIndex: number, movingS: number | null): Tier => {
  if (live.track === null || movingS === null) return 'neutral';
  const history = sectorIndex === 0 ? lapValues(live.track) : sectorValues(live.track, sectorIndex);
  const tier = tierFor(movingS, history);
  return tier === 'est' ? 'est' : (tier as Tier);
};
```

`tierOf` is a thin closure over `colourModel.tierFor` (`colourModel.ts:137-143`, windowed: `'neutral'` below `MIN_HISTORY`, `'purple'` below best, `'green'` below mean, else `'yellow'`) fed by the **same** `sectorValues(routeId, i)` window Result uses. The only differences from Result's call are (a) no `excludeRideId` — irrelevant mid-ride because the ride is not stored yet (`ghostsFor`'s doc at `colourModel.ts:56-61`: *"A live lap not yet stored needs no exclusion and gets the same 9"*), and (b) `'neutral'` before the route lock (D-025). **Consequence: live span colours can and will be identical to the colours the same ride shows later on Result and in RIDES.** There is no live-only approximation. The digest's worry that `sectorValues` might need a finalised ride is unfounded: it reads whatever is ranked on file, which mid-ride is exactly the comparison set.

The live builder therefore takes the comparison window as a `hist(i)` callback (the same shape `rideHistoryModel.buildSectorRows` already takes) rather than the `tierOf` closure itself — identical result, no closure over React state, headlessly testable.

### 2.4 Result's working computation — `ResultScreen.tsx:182-191`, `:249-250`

```ts
const resultSectorColours: (string | null)[] = ride
  ? [
    null,
    ...[...ride.sectors].sort((a, b) => a.index - b.index).map((sec) =>
      sec.quality === 'clean' && sec.movingS !== null
        ? tierLineColour(
          tierFor(sec.movingS, sectorValues(ride.routeId, sec.index, ride.rideId).filter((v) => v !== sec.movingS))
        )
        : null),
  ]
  : [];
...
<RouteMapView variant="browse" routeId={ride.routeId} lat={null} lon={null}
  zoom={1} height={300} showRider={false} sectorColours={resultSectorColours} leadColour={colors.grey} />
```

`ride` is a `FinishedRide` (`lastRide.ts:32-40`, sectors `{ index, movingS, rawS, quality: string }`), not a `RideResult`. Rule: clean + real moving time + earned tier only (`tierLineColour` returns null for `'neutral'`/`'est'`/`'none'`, `chips.tsx:36-43`). `ResultScreen` already has `const { s } = useSettings();` (`:143`).

### 2.5 Colour mapping — `tierLineColour` is authoritative for map lines; `chipColors().text` is not

`chips.tsx:21-43`: `tierLineColour(tier)` = purple → `colors.purple`, green → `colors.green`, yellow → `YELLOW_TIER` (= `colors.neutral`, the base line's own yellow — hence the width-6-over-width-4 bolding in §2.1), everything else → null. Its doc comment names it *"the single source of truth for every sector-coloured trail (ResultScreen, DemoScreen, any future live/race screen)"* and forbids `chipColors(tier, t).text` (purple's `.text` is `PURPLE_INK`, near-black — the 2026-09-02 DEMO-tab bug). `RecordScreen`'s `gateColours` (`:826-834`) uses `chipColors().text` with a purple override — an older, marker-specific path this WP does **not** copy. `chips.tsx` imports `react-native`, so a headless pure module cannot import it; `demoModel.ts:59-69` (`demoSectorColours(script, gatesDone, paint)`) already solves this by **injecting** the mapping — this brief follows that precedent.

### 2.6 RIDES accordion — `RidesScreen.tsx`

`:43` `const [expandedId, setExpandedId] = useState<string | null>(null);` → **exactly one row expanded at a time** (confirmed; `:189` toggles it). `:184` `const result = expanded ? getStoredResult(item.rideId) : null;` — a stored `RideResult` (or null). `:205-224` the expanded `styles.detail` view: `buildSectorRows(result, (i) => sectorValues(result.routeId as string, i, result.rideId))` text rows, else *"sector times not on file for this ride"*, then the Export/Delete pill row. No map of any kind. Imports (`:9-22`) have no `RouteMapView`, no `useSettings`, no `tierLineColour`, no `colors`.

### 2.7 Settings — `settings.tsx`

`:24-38` `Settings` has 5 fields (`redLight`, `startMode`, `tower`, `liveMap`, `earcons`) with `DEFAULTS`; load merges `{ ...prev, ...saved }` (`:63`) so a new field with a default is backward-compatible with an existing `settings.json` (missing key → default). `:280-285` the `Row`+`Switch` pattern under "ON THE BIKE".

### 2.8 Z-order hazard on the live map — the WP-J trail paints OVER sector spans (must fix, or the feature is invisible)

`routeMapView.tsx` JSX order: route (`:518`) → **sector-spans** (`:544`, conditional) → **trail** (`:559`, always-mounted, casing width 7 + `colors.neutral` core width 4) → gates/ticks → rider. maplibre-react-native layers by mount order (`:407-411`). On Result (browse) the trail is empty so this is moot — which is why P1 never hit it. On the live map the rider's breadcrumb follows the route within a few metres: the trail's **width-7 black casing sits on top of and fully covers the width-6 coloured span** wherever they coincide, and the yellow trail core is then drawn over that. Net effect: sector colours would show only as slivers where GPS drifts off the route line. §3.2 moves the sector-spans block below the trail source.

Because the block stays *conditionally* mounted (it must mount in the same render as the route line, which is also conditional on `asset`), the live caller must pass a **truthy `sectorColours` from the first render regardless of the toggle** (`ALL_YELLOW = []` when OFF), otherwise flipping the toggle ON mid-ride would mount the source after the rider dot and paint over it.

### 2.9 "All yellow" is an accurate description of the OFF state

Route core `colors.neutral` (`:524`), trail core `colors.neutral` (`:564`), unscored gate ticks `colors.neutral` thin/translucent (`:614-616`), spans transparent when no `colour` property (`:547`), lead-in/out only drawn when `leadColour` is given (`routeMapGeo.ts` — *"appended AFTER the real sectors ... always leadColour"*). With `sectorColours=ALL_YELLOW` and no `leadColour`, the map is pixel-identical to a map with no `sectorColours` prop at all.

### 2.10 Tests / headless constraints

`tests/run.ts` imports 24 suites; the pure-model suites that reach `colourModel.ts` (`ridehistory_suite.ts:13-30`, `live_colour_suite.ts`, `resultsstore_suite.ts`) use the `registerHooks` JSON shim + dynamic `await import(...)` because `colourModel` imports `results.seed.json`. `routemapgeo_suite.ts:17-20` loads `assets/routes/routes.json` as `manifest` (`manifest.routes.Morning` is a drawable asset with 4 spans). `STATE.md:42-52` confirms no tests exist yet for "compute sectorColours from ride state". `sectorSpansFeatureCollection` itself is already covered (`routemapgeo_suite.ts:335-420`, `routeasset_runtime_suite.ts:~125`) — untouched.

## 3. Proposed change

### 3.1 NEW `app/src/ui/sectorTrailModel.ts` — pure, headless

```ts
/**
 * WP-K (phase 2): pure builders for RouteMapView's `sectorColours` prop — the
 * gate-indexed colour array behind the sector-coloured trail on all three
 * surfaces (live map, Result trace, RIDES expanded row). Index 0 is always
 * null (START — no sector ends there); index i is the colour of sector i,
 * the stretch of line ENDING at gate i; null = no earned colour, the span
 * paints transparent and the yellow base line shows through.
 *
 * No React, no expo, no chips.tsx (it imports react-native): the tier -> line
 * colour mapping is INJECTED as `paint`, exactly as demoModel.ts's
 * demoSectorColours() does — every screen passes chips.tsx's tierLineColour
 * (never chipColors().text: purple's .text is PURPLE_INK, the 2026-09-02
 * DEMO-tab bug class). Headless-testable, same discipline as
 * rideHistoryModel.ts / colourModel.ts; suite: tests/sectortrail_suite.ts.
 *
 * Honesty (unchanged from P1, ruled 2026-08-26): only a CLEAN sector with a
 * real moving time and an EARNED tier (purple/green/yellow) paints. 'neutral'
 * (< MIN_HISTORY comparable rides — D-008/D-013) and 'est' never paint,
 * whatever `paint` would return for them: that rule lives here, not in the
 * palette. Interrupted sectors do not paint (same as P1's Result rule; the
 * sector PANE and RIDES text rows keep an interrupted sector's tier — see the
 * brief's §7.1 for why the map line is stricter).
 */
import type { LiveSector } from '../live/engine';
import { tierFor, type UiTier } from './colourModel';

/** tier -> map-line colour, or null. Screens pass chips.tsx's tierLineColour. */
export type SpanPaint = (tier: UiTier) => string | null;
/** Comparison window for sector i (colourModel.sectorValues, in practice). */
export type SectorHistory = (sectorIndex: number) => number[];

/** WP-K: the "all yellow" array — what every surface passes when
 * Settings.sectorColours is OFF. Empty and never mutated:
 * sectorSpansFeatureCollection reads `sectorColours?.[i] ?? null`, so every
 * span paints transparent and the map is pixel-identical to a no-colours map,
 * while the prop stays TRUTHY so RouteMapView mounts the sector-spans source
 * in the same render as the route line whatever the setting (routeMapView's
 * mount-order rule: a source mounted later paints over the rider dot). */
export const ALL_YELLOW: (string | null)[] = [];

function earnedColour(movingS: number, history: number[], paint: SpanPaint): string | null {
  const tier = tierFor(movingS, history);
  return tier === 'purple' || tier === 'green' || tier === 'yellow' ? paint(tier) : null;
}

/** Minimal shape shared by store/types.ts's SectorResult (RIDES hands in a
 * RideResult) and lastRide.ts's FinishedRide.sectors (Result hands in that). */
export interface StoredSectorLike { index: number; movingS: number | null; quality: string }

/** WP-K: stored/finished ride -> sectorColours. Slots by `sec.index`, not
 * array position, so an unsorted `sectors` array still lands on the right
 * span; length = max index + 1, or [] for a ride with no sectors. `hist(i)`
 * is the caller's sectorValues(routeId, i, rideId) — the ride's own value
 * excluded by rideId (B-44), the same callback shape buildSectorRows takes. */
export function storedSectorColours(
  ride: { sectors: readonly StoredSectorLike[] }, hist: SectorHistory, paint: SpanPaint,
): (string | null)[] {
  const n = ride.sectors.reduce((m, s) => Math.max(m, s.index), 0);
  const out: (string | null)[] = new Array<string | null>(n + 1).fill(null);
  for (const sec of ride.sectors) {
    if (sec.index < 1 || sec.quality !== 'clean' || sec.movingS === null) continue;
    out[sec.index] = earnedColour(sec.movingS, hist(sec.index), paint);
  }
  return out;
}

/** WP-K: live engine sectors -> sectorColours, mid-ride. sectors[k] is sector
 * k+1 (the same k -> k+1 mapping RecordScreen's gateColours uses). Only
 * kind 'done' AND !interrupted AND !estimated with a moving time is "clean" —
 * the predicate that becomes quality 'clean' when the ride is stored, so a
 * span keeps the exact colour it earned live when it reappears on Result and
 * in RIDES. `hist(i)` mid-ride is sectorValues(live.track, i) with no
 * exclusion (the ride is not stored yet — colourModel.ghostsFor); before the
 * route lock the caller returns [] and everything stays null (D-025, the same
 * rule as RecordScreen's tierOf). Always length sectors.length + 1. */
export function liveSectorColours(
  sectors: readonly LiveSector[], hist: SectorHistory, paint: SpanPaint,
): (string | null)[] {
  const out: (string | null)[] = [null];
  for (let k = 0; k < sectors.length; k++) {
    const sec = sectors[k];
    if (sec.kind !== 'done' || sec.interrupted || sec.estimated || sec.movingS === null) {
      out.push(null);
      continue;
    }
    out.push(earnedColour(sec.movingS, hist(k + 1), paint));
  }
  return out;
}
```

Notes for the executor: `import type` from `../live/engine` is erased under `--experimental-strip-types`, so the suite never loads the engine; the module's only runtime import is `colourModel.ts` (hence the JSON shim in the suite, §4).

### 3.2 `routeMapView.tsx` — move the sector-spans source below the trail source

Cut the whole `{/* WP-sector-coloured-trail P1 ... */} {sectorSpansFC ? (<M.GeoJSONSource key="sector-spans" id="sector-spans" ...>) : null}` block (`:528-552`) and paste it **immediately after** the trail `</M.GeoJSONSource>` (`:566`), before the Cycle-025 `gatesOnly ? ... : gateTicksFC ? ...` ternary. Keep `key === id === "sector-spans"` (cycle-025 frozen-id rule), keep it conditional (§2.8 explains why it must not become always-mounted: it has to mount in the same render as the conditional route line, or the yellow route core would later paint over it). Replace the old comment's first paragraph opening with:

```
{/* WP-sector-coloured-trail P1 (ruled 2026-08-26), moved below the trail
    source by WP-K phase 2: the WP-J trail's width-7 casing + width-4 core
    fully covered a width-6 span wherever the rider's breadcrumb coincided
    with the route line (always, near enough, on the live map), so live
    sector colours were invisible; spans now paint over the trail — once a
    sector is scored its verdict outranks the breadcrumb on that stretch, and
    the trail still shows beside the line wherever the rider actually
    deviated. Browse surfaces (Result, RIDES) have an empty trail, so their
    look is unchanged. Still conditional (NOT always-mounted like the trail):
    it must mount in the SAME render as the conditional route source above,
    otherwise a late-resolving asset would put the yellow route core on top
    of the spans. Live callers therefore pass a truthy sectorColours
    (sectorTrailModel's ALL_YELLOW when the setting is off) from their first
    render, never a toggled undefined.
    Each sector's stretch ... [rest of the existing comment verbatim] */}
```

Also extend the `sectorColours?:` prop doc (`:176-184`) with one line: *"WP-K: also passed by the live rung (RecordScreen) and the RIDES row; see sectorTrailModel.ts for the builders and the ALL_YELLOW convention."* No paint/layout change, no new layer, no change to `sectorSpansFC`'s computation.

### 3.3 `settings.tsx` — the toggle

```ts
export interface Settings {
  redLight: RedLight;
  startMode: 'auto' | 'pick';
  tower: boolean;
  liveMap: boolean;
  earcons: boolean;
  /** WP-K: paint each sector of the route line in the tier it earned (live
   * map, Result trace, RIDES row) — off keeps the line all yellow. */
  sectorColours: boolean;
}

const DEFAULTS: Settings = {
  redLight: 'auto',
  startMode: 'auto',
  tower: true,
  liveMap: true,
  earcons: true,
  sectorColours: true,
};
```

Row, directly under "Live map" (`:280-282`) so the two map preferences sit together:

```tsx
<Row label="Sector colours" t={t}
  hint="paint each stretch of the route line in the tier its sector earned (live map, Result trace, RIDES) — off keeps the ride all yellow">
  <Switch on={s.sectorColours} onToggle={() => set('sectorColours', !s.sectorColours)} t={t} />
</Row>
```

Default **ON**: Nathan asked for the colouring as the desired behaviour and framed the toggle as an escape hatch for people who "rather keep the ride all yellow"; the existing `{ ...prev, ...saved }` merge means an old `settings.json` without the key lands on `true` with no migration. The toggle is a pure display preference — it never touches engine state, storage, or ranking, so flipping it mid-ride is safe (and §2.8/§3.4 make the mid-ride flip render correctly).

### 3.4 `RecordScreen.tsx` — live wiring

Imports (`:45-46` region):

```ts
import { chipColors, tierLineColour, type Tier } from './chips';
import { ALL_YELLOW, liveSectorColours } from './sectorTrailModel';
```

New memo, placed directly after the `gateColours` memo (`:834`):

```ts
// WP-K (phase 2): sector spans on the live map — the segment BETWEEN gates,
// never the tick (Nathan: "they are gates"). Same comparison window tierOf()
// uses (sectorValues on the LOCKED track, [] before the lock — D-025), the
// same clean-only predicate the stored ride will carry as quality 'clean',
// painted through tierLineColour (the map-line source of truth, never
// chipColors().text). OFF passes ALL_YELLOW, not undefined: the sector-spans
// source has to be mounted from the same render as the route line whatever
// the setting, or a mid-ride flip would mount it above the rider dot
// (routeMapView.tsx mount-order rule). No leadColour here — see brief §3.7.
const sectorColours = useMemo(
  () => settings.sectorColours
    ? liveSectorColours(
        live.sectors,
        (i) => (live.track === null ? [] : sectorValues(live.track, i)),
        tierLineColour,
      )
    : ALL_YELLOW,
  [live.sectors, live.track, settings.sectorColours],
);
```

Call site (`:1055-1071`): add one prop line after `gateColours={gateColours}`:

```tsx
      gateColours={gateColours}
      sectorColours={sectorColours}
```

Nothing else changes: `gatesOnly` (free ride) already nulls `sectorSpansFC` inside RouteMapView; `tierOf` and `gateColours` stay as they are (WP-E's ticks are out of scope — §7.2).

### 3.5 `ResultScreen.tsx` — switch to the shared builder + honour the toggle

Imports: add `import { ALL_YELLOW, storedSectorColours } from './sectorTrailModel.ts';` (`tierLineColour`, `sectorValues`, `colors`, `useSettings` are already imported).

Replace `:182-191` with (keep the ruling comment block above it, trimming its "Same per-sector verdict computation ..." sentence to *"Built by sectorTrailModel.storedSectorColours — the one builder Result, RIDES (WP-K) and any future ride-detail screen (WP-H) share."*):

```ts
const resultSectorColours: (string | null)[] = ride && s.sectorColours
  ? storedSectorColours(ride, (i) => sectorValues(ride.routeId, i, ride.rideId), tierLineColour)
  : ALL_YELLOW;
```

Call site `:249-250`:

```tsx
<RouteMapView variant="browse" routeId={ride.routeId} lat={null} lon={null}
  zoom={1} height={300} showRider={false}
  sectorColours={resultSectorColours}
  leadColour={s.sectorColours ? colors.grey : undefined} />
```

Two deliberate deltas from the inline version, both to note in the commit message: (a) the `.filter((v) => v !== sec.movingS)` is dropped — `sectorValues(..., ride.rideId)` already excludes the ride by id (B-44, `ghostsFor`), and filtering by *value* would also drop a genuine tie from another ride; `buildSectorRows` on RIDES never had the filter, and the two surfaces must agree. (b) `sort` + positional spread is replaced by slot-by-index (§3.1), which is equivalent for the contiguous 1..n indices every real ride has.

### 3.6 `RidesScreen.tsx` — embedded map in the expanded row

Imports:

```ts
import RouteMapView from './routeMapView';
import { chipColors, tierLineColour } from './chips';
import { useSettings } from './settings';
import { ALL_YELLOW, storedSectorColours } from './sectorTrailModel';
import { PaddockTheme, colors, radius } from './theme';
```

In the component body next to the other hooks: `const { s } = useSettings();`.

Inside `{expanded ? (<View style={styles.detail}> ... )}` (`:205-206`), **as the first child, above the sector rows** — the map is the summary, the rows are the detail, matching Result's "headline, trace, then breakdown" order:

```tsx
{result && result.routeId ? (
  // WP-K (phase 2): Nathan's "popup a ride in RIDES" — the same
  // sector-coloured trace Result shows, from the stored result. browse
  // variant, no rider. RouteMapView returns null on its own when the route
  // has no drawable asset (WP-D's riderOnly && !showRider guard), so a ride
  // on an undrawable/deleted route simply shows the rows below.
  <View style={styles.trace}>
    <RouteMapView variant="browse" routeId={result.routeId} lat={null} lon={null}
      zoom={1} height={220} showRider={false}
      sectorColours={s.sectorColours
        ? storedSectorColours(
            result, (i) => sectorValues(result.routeId as string, i, result.rideId), tierLineColour,
          )
        : ALL_YELLOW}
      leadColour={s.sectorColours ? colors.grey : undefined} />
  </View>
) : null}
```

Style: `trace: { marginBottom: 8, borderRadius: radius.md, overflow: 'hidden' }` added to the existing `StyleSheet` (use whichever `radius` key the `detail`/pill styles already use; `overflow: 'hidden'` clips the native map to the rounded card). Height 220 (Result uses 300 in a full-screen scroll; a list row wants less). Only one row is ever expanded (`expandedId`), collapsing unmounts the map, and FlatList virtualisation unmounts off-screen rows — at most one MapLibre view is ever alive on this screen. Pan/zoom gestures inside a vertical list behave the same as Result's map inside its `ScrollView` (browse variant, gestures on); `pointerEvents` is left alone.

The `sectorColours` array is rebuilt per render like the existing `buildSectorRows` call beside it (≤ ~10 sectors, and `sectorSpansFC` in RouteMapView is a plain const, not identity-memoised — nothing to gain from `useMemo` here).

### 3.7 Lead-in / lead-out on the live map — decided: NO `leadColour`

Result and RIDES pass `colors.grey` (permanently non-scorable stretches, LAYOUT §6 "grey = no-data only"). The live map does **not**, for three reasons:

1. **It would hide the first thing the rider looks for.** With §3.2 the spans now paint over the trail. The lead-in is ridden *first*; WP-J's breadcrumb on that stretch is the rider's visible proof that GPS is tracking before the START gate. A width-6 grey line drawn over it from the first frame would erase exactly that feedback.
2. **Mid-ride the base yellow already means "route, not yet judged".** Every unscored sector is transparent-over-yellow; painting the lead-out grey *ahead of the rider* would be the only stretch coloured before it is reached, reading as a verdict ("already scored: nothing") on ground not yet ridden. Post-hoc (Result/RIDES) that reading is correct; live it is premature.
3. **Gate ticks already mark where timing starts and stops**, so nothing is lost.

Because `leadColour` is simply omitted, `sectorSpansFeatureCollection` appends no lead features at all (`if (leadColour)` guard) — no transparent lead spans, no extra geometry.

### 3.8 Backward compatibility / degenerate cases (walked through)

| Case | What the builders return | What the map draws |
|---|---|---|
| Live, route locked, no sector done yet | `liveSectorColours` → `[null, null, …]` (length sectors+1) | route yellow; spans all transparent; identical to today |
| Live, before route lock (`live.track === null`) | `hist` returns `[]` → `tierFor` → `'neutral'` → all null | identical to today (D-025) |
| Live, free ride (`gatesOnly`) | array built but `sectorSpansFC` is null inside RouteMapView | unchanged free-ride gate map |
| Live, route with no drawable asset (WP-D rider-only) | array built; `asset` null → `sectorSpansFC` null | rider-only map, unchanged |
| Live, `live.sectors` longer/shorter than the asset's gate count | extra indices ignored / missing indices read as null | never throws (`sectorColours?.[i] ?? null`) |
| Live, interrupted or estimated sector | null | that span stays yellow; gate tick (WP-E) may still colour — pre-existing, §7.2 |
| Live, first ride on a route (< `MIN_HISTORY`) | all null | all yellow, correctly: nothing is judged on too little history |
| Toggle OFF (any surface) | `ALL_YELLOW` (`[]`) + no `leadColour` | pixel-identical to a map with no `sectorColours` prop (§2.9) |
| Toggle flipped ON mid-ride | array becomes populated; source was already mounted | colours appear in place, z-order intact (§2.8) |
| Result/RIDES, `ride.sectors` empty | `storedSectorColours` → `[]` | truthy `[]` → spans drawn transparent; lead grey still drawn (post-hoc, correct) |
| RIDES, `result === null` or `routeId === null` | map not rendered at all | existing "sector times not on file" text |
| RIDES, route asset undrawable | RouteMapView returns null (`riderOnly && !showRider`) | rows only |
| Old `settings.json` without `sectorColours` | `DEFAULTS` merge → `true` | colouring on, no migration |

## 4. Test plan — NEW `app/tests/sectortrail_suite.ts` (+ one import line in `tests/run.ts`)

Header + the `registerHooks` JSON shim and dynamic import, copied from `ridehistory_suite.ts:6-30` (the module under test imports `colourModel.ts` → `results.seed.json`). Load `MIN_HISTORY` from `colourModel.ts`, `sectorSpansFeatureCollection` from `routeMapGeo.ts` (statically — it has no JSON import) and `manifest.routes.Morning` the way `routemapgeo_suite.ts:17-20` does. Use a sentinel paint that maps **every** tier, including neutral/est, to a string (`const paintAll: SpanPaint = (t) => `P:${t}``) so tests 3/8 prove the builder, not the palette, withholds colour. Histories: `RICH = [100, 110, 120, 130, 140]` (n = `MIN_HISTORY`, best 100, mean 120); `THIN = [100, 110]`.

Stored (`storedSectorColours`):

1. **stored: no clean sector → all null, length max-index+1**: 3 sectors all `quality:'estimated'`/`'missed'`/`'interrupted'` with RICH hist → `[null, null, null, null]`.
2. **stored: tiers land on the span ending at that gate**: sectors 1..3 clean with movingS 95 / 115 / 125, RICH → `[null, 'P:purple', 'P:green', 'P:yellow']`.
3. **stored: neutral (< MIN_HISTORY) never paints even when paint would**: clean 95 with THIN hist + `paintAll` → `[null, null]`.
4. **stored: interrupted / estimated / missed stay null with rich history**: one of each plus one clean → only the clean slot painted.
5. **stored: unsorted sectors slot by index**: sectors given as `[3, 1, 2]` → colour of the 95-second sector is at index 1 wherever it sat in the array.
6. **stored: empty sectors → `[]`**; and `storedSectorColours` accepts a FinishedRide-shaped object (`quality: string`, no `rawS` needed) — a type-level check that compiles, plus the runtime result.
7. **stored: hist is called with the sector index, once per clean sector**: record calls; assert `[1, 2, 3]` for three clean sectors and no call for a missed one.

Live (`liveSectorColours`):

8. **live: pending/current/missed → all null, length sectors+1**: `[{kind:'pending'},{kind:'current'},{kind:'missed',reason:'skipped'}]` → `[null, null, null, null]`, even with `paintAll`.
9. **live: done clean sectors paint by tier**: three `done` (`interrupted:false, estimated:false`) with 95/115/125, RICH → `[null,'P:purple','P:green','P:yellow']`.
10. **live: interrupted / estimated / movingS null done-sectors stay null**: four `done` variants, only the clean one painted.
11. **live: pre-lock (`hist` returns `[]`) → all null** (D-025).
12. **live/stored agreement**: the same three moving times through `liveSectorColours` (as done-clean) and `storedSectorColours` (as `quality:'clean'`) with the same hist produce **identical arrays** — the cross-surface contract from §2.3.
13. **live: hist index is k+1**: record calls for two done sectors at positions 0 and 1 → `[1, 2]`.

Sentinel + geo integration:

14. **ALL_YELLOW is a truthy no-op for the span builder**: `sectorSpansFeatureCollection(manifest.routes.Morning, ALL_YELLOW)` is non-null, has 4 features, none carries a `colour` property; `ALL_YELLOW.length === 0` afterwards (never mutated).
15. **builder output feeds the span builder end-to-end**: `sectorSpansFeatureCollection(manifest.routes.Morning, storedSectorColours(...4 clean sectors..., RICH, paintAll))` → feature k carries `colour === out[k+1]` for painted sectors and no `colour` key where `out[k+1] === null`.

`tests/run.ts`: add `import './sectortrail_suite.ts';` after `import './routeasset_runtime_suite.ts';`.

Expected: 380 / 377 / 0 / 3 → **395 / 392 pass / 0 fail / 3 skip** (+15) if the baseline is still 380 at execution time; report the actual numbers in the status line. No existing test changes; `routemapgeo_suite.ts` and `routeasset_runtime_suite.ts` are not touched.

## 5. Verification

```bash
cd "$HOME/mnt/Qualifire/app"
node --experimental-strip-types tests/run.ts        # expect 0 FAIL, +15 PASS vs baseline
./node_modules/.bin/tsc --noEmit                    # clean
grep -n "sectorColours" src/ui/RecordScreen.tsx src/ui/ResultScreen.tsx src/ui/RidesScreen.tsx src/ui/settings.tsx
grep -n "leadColour" src/ui/RecordScreen.tsx        # expect NO match (§3.7)
grep -n "gateColours\|gateTicksFeatureCollection" src/ui/routeMapView.tsx src/ui/routeMapGeo.ts | wc -l   # unchanged count vs a03b84e
awk '/id="trail"/{t=NR} /id="sector-spans"/{s=NR} END{exit !(s>t)}' src/ui/routeMapView.tsx && echo "spans mounted after trail: OK"
git diff --stat   # expect exactly the files in §6
```

On-device (Nathan, after the executor lands it — this session cannot drive the UI):

1. Settings → "Sector colours" appears under "Live map", ON by default.
2. Ride a user-created (WP-C) route with ≥ `MIN_HISTORY` prior clean rides: after each gate the stretch *behind* it turns purple/green/yellow; the tick itself does not change beyond what it did yesterday; the breadcrumb is visible ahead of the START gate (no grey lead-in).
3. A route with < 5 rides: everything stays yellow live, on Result and in RIDES (nothing judged on too little history).
4. Stop → Result "VIEW TRACE": same colours as the live map showed. RIDES → tap the ride: a 220-px map above the sector rows with the same colours, grey lead-in/out. Only one row's map exists at a time.
5. Toggle OFF → all three surfaces are all-yellow (Result/RIDES lead-in/out included). Toggle ON again mid-ride → colours reappear without the rider dot disappearing under the line.

## 6. Files touched

New:
- `app/src/ui/sectorTrailModel.ts` (§3.1)
- `app/tests/sectortrail_suite.ts` (§4)

Edited:
- `app/src/ui/routeMapView.tsx` — sector-spans source block moved below the trail source; comment + prop doc (§3.2). No paint/layout/id change.
- `app/src/ui/settings.tsx` — `Settings.sectorColours`, default `true`, one Row+Switch (§3.3)
- `app/src/ui/RecordScreen.tsx` — two imports, one `useMemo`, one prop line (§3.4)
- `app/src/ui/ResultScreen.tsx` — one import, `resultSectorColours` via the shared builder, toggle-gated `leadColour` (§3.5)
- `app/src/ui/RidesScreen.tsx` — imports, `useSettings`, embedded `RouteMapView` + one style (§3.6)
- `app/tests/run.ts` — one import line
- `STATE.md` — replace the "Phase 2 (WP-K follow-up) will extend ..." sentence at `:42-52` with the landed state; `cycles/virgin-cycle1/README.md` / `TOKEN-USAGE.md` status rows per the cycle's convention.

Deliberately NOT touched:
- `app/src/ui/routeMapGeo.ts` (`sectorSpansFeatureCollection`, `gateTicksFeatureCollection`) and their tests
- `app/src/live/engine.ts` (tier is derived, never stored — no new state)
- `RecordScreen.tsx`'s `tierOf` / `gateColours` (WP-E gate ticks — §7.2)
- `app/src/ui/chips.tsx` (`tierLineColour` stays where it is; injected, not moved)
- `app/src/ui/demoModel.ts` / `DemoScreen.tsx` (already use the injected-paint pattern; the §3.2 z-order move only helps a Demo script that shows both a trail and spans)

## 7. Open questions (none block execution; defaults given)

1. **Interrupted sectors on the map line** — default: **stay uncoloured** (P1's Result rule, now enforced in one place for all three surfaces). The live sector PANE and RIDES text rows *do* keep an interrupted sector's earned tier (`liveView.tsx`, `buildSectorRows`), so the map is stricter than the text. If Nathan wants the line to match the text, it is a one-predicate change in `sectorTrailModel.ts` (`quality === 'clean' || quality === 'interrupted'` / drop `sec.interrupted`) plus flipping tests 4 and 10 — that single-point change is the point of the shared builder.
2. **Live gate ticks still recolour (WP-E)** — default: **untouched in this WP**, per the stub's own scoping ("colour the segments between gates, not the gate ticks") and the dispatch instruction. But Nathan's words were *"the gates should not change colour like they do now"*, and STATE.md phrases the P1 ruling as *"colour the SEGMENT line BETWEEN gates ... never the gate tick"*. Once the live spans exist, the coloured ticks are the redundant half. Cheapest follow-up if he confirms: in `RecordScreen.tsx` pass `gateColours={undefined}` (every tick falls to the thin translucent yellow "unscored" style — no geo/layer change) and retire the `gateColours` memo; it could even hang off the same toggle. Worth one line to Nathan when reporting this WP landed, not a blocker.
3. **Toggle default** — default **ON** (§3.3). Flip to `false` in `DEFAULTS` if Nathan prefers opt-in; nothing else changes.
4. **Grey lead-in/out on the live map** — default **no** (§3.7). If Nathan misses it live, pass `leadColour={settings.sectorColours ? colors.grey : undefined}` in §3.4 — but the lead-in would then cover the breadcrumb before START, see §3.7(1).
5. **RIDES map height / placement** — default **220 px, above the sector rows**. 300 to match Result exactly, or below the rows, are one-line changes.
6. **Spans over trail hides the breadcrumb on scored stretches** — default **accept** (§3.2): the verdict outranks the breadcrumb once a sector is scored, and the trail remains visible wherever the rider genuinely left the line. Alternative (narrower trail casing under spans) would mean restyling WP-J's line, which Nathan approved on device — not worth reopening for this.
7. **WP-H (full-screen ride detail)** — when/if it lands, it should call `storedSectorColours` with the same `(result, hist, tierLineColour)` triple and can lift the RIDES row's `RouteMapView` block verbatim; nothing here pre-empts its navigation-model decision.
