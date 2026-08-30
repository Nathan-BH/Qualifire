# BRIEF — Sector-coloured trail, Phase 1: the Result / VIEW TRACE map (cycle 025 · WP-sector-coloured-trail P1 · D-039 execution tier)

Written 2026-08-30 by the Fable planning pass, from the code at HEAD (every anchor below
verified against the actual file bytes tonight). You are the Sonnet executor. This brief is
your ONLY input — execute exactly what is written here.
**Stop-on-ambiguity rule:** if any anchor string below does not match the file, if a test
fails for a reason this brief does not predict, or if you need to make ANY decision this
brief does not already make — STOP, change nothing further, and report the exact discrepancy
verbatim to the coordinator. Never rule on ambiguity yourself.

## Environment

- Repo is mounted at `$HOME/mnt/Qualifire`. Access it ONLY via `device_bash`. Every call is
  a fresh shell (no cwd/env carryover) — start every command with
  `cd "$HOME/mnt/Qualifire" && …` (or `…/Qualifire/app`).
- The mount is SLOW tonight. The test suite (`node --experimental-strip-types tests/run.ts`)
  finishes in well under 45 s, but `tsc --noEmit` took ~48 s on the planning pass's run.
  Run tsc as `./node_modules/.bin/tsc --noEmit` (NOT `npx tsc` — npx's resolution overhead
  alone blows the budget) with `timeout_ms` around 170000 and NO `timeout 40` prefix.
  Backgrounding (nohup/disown) does not survive across device_bash calls — never try it.
- Do NOT run any git write command (add/commit/checkout/reset/clean) — the coordinator
  commits. Read-only `git diff --stat` is fine.
- Never delete a file. Do NOT run `data/analysis/08_build_route_assets.py` under any
  circumstances. Do NOT run `data/analysis/07_build_mockup.py` (stale template — it would
  clobber the hand-evolved `demos/mockup.html`; same standing rule as the route-naming brief).
- Node v22 and `app/node_modules/.bin/tsc` are present.

## Mandate

Nathan ruled (2026-08-26, `WP-sector-coloured-trail.md` NEEDS-NATHAN §1 — final, not open):
on the finished-ride Result / "VIEW TRACE ›" map, **the sector line segments carry the
verdict colour and the gate ticks stop carrying verdict colours** — "the gates should not
change colours like they do now because it does not make sense, they are gates. Just the
sector segments changing colour is enough." Gate ticks remain as neutral, static boundary
markers.

**Scope is Phase 1 ONLY — the Result screen's VIEW TRACE map.** Phase 2 (the LIVE map while
riding — `RecordScreen.tsx`, and `DemoScreen.tsx` which mirrors it) is deliberately deferred:
it needs on-device visual verification (the 2026-08-24 `line-dasharray` device-only rendering
bug is the precedent) that this pipeline cannot do. RecordScreen and DemoScreen keep passing
`gateColours` exactly as today; you do not touch them.

Acceptance: a finished ride's VIEW TRACE map shows each sector's stretch of the route line
rendered in that sector's earned colour (purple `#A667F0` / green `#3ED598` / yellow
`#F5C542`, the existing `theme.ts` tier constants — identical in both themes, same as the
route line today), and every gate tick on that map renders in the existing neutral/unscored
tick style.

## Baseline at HEAD (measured tonight by the planning pass)

- `cd app && node --experimental-strip-types tests/run.ts` → **252 tests: 249 pass, 0 fail, 3 skip**.
- `cd app && ./node_modules/.bin/tsc --noEmit` → clean, exit 0 (~48 s tonight).

## How the VIEW TRACE map works today (verified, with line numbers)

- `app/src/ui/ResultScreen.tsx` line 241–242 renders the trace behind the "VIEW TRACE ›"
  toggle as `<RouteMapView variant="browse" routeId={ride.routeId} lat={null} lon={null}
  zoom={1} height={300} showRider={false} gateColours={resultGateColours} />`. It is the
  SAME shared `routeMapView.tsx` component RecordScreen uses (MapLibre rung with a PNG
  fallback rung), in its `browse` personality.
- `resultGateColours` (ResultScreen lines 169–185) computes one colour per GATE: index 0
  (START) null, index i = sector i's verdict via `tierFor(sec.movingS, sectorValues(...))`
  pushed through `chipColors(tier, t).text` — sector i is the stretch ENDING at gate i.
- The MapLibre rung draws the route as ONE GeoJSON LineString (`routeFC`, from
  `routeLineFeature()`), styled once: black casing width 7 under a `colors.neutral` yellow
  core width 4 (`routeMapView.tsx` lines 419–428). Gate ticks are a separate source
  (`gateTicksFeatureCollection(asset, props.gateColours)`, line 346) drawn as short
  perpendicular LineStrings: black casing width 5, then a core whose paint is data-driven —
  `['case', ['has','colour'], ['get','colour'], colors.neutral]`, width 3/2 and opacity
  1/0.6 for scored/unscored (lines ~480–493). **The unscored style (thin translucent yellow
  over black casing) IS the neutral/static tick style the ruling asks for** — so on this
  screen we simply stop supplying `gateColours` and every tick renders neutral, with zero
  change to the tick-rendering code (which the live map shares).
- Geometry for splitting: every `RouteAsset` in `app/assets/routes/routes.json` has `path`
  ([lat,lon][], 125–220 points) and `gateIdx` (5 entries, index into `path` per gate) —
  verified for all 20 routes. All routes have exactly 5 gates = 4 sectors; sector i spans
  `path[gateIdx[i-1]] .. path[gateIdx[i]]`. The path has a lead-in before gateIdx[0] and a
  lead-out after gateIdx[4] — those stay base-coloured (outside the timed lap).
- Colour trap you must NOT fall into: `chipColors('purple', t).text` is `PURPLE_INK`
  (`#120521`, near-black ink for text ON a purple chip) — using `.text` for a LINE would
  paint purple sectors almost black. The correct line colours are the raw tier constants
  (`colors.purple`/`colors.green`/`colors.neutral`), the same mapping ResultScreen's own
  `tierColour()` (lines 42–50) uses for the big lap figure.
- MapLibre multi-colour approach (least new risk, chosen): ONE extra `<M.GeoJSONSource>`
  with 4 LineString features (one per sector) and ONE `<M.Layer>` whose `line-color` is the
  same `['case', ['has','colour'], ['get','colour'], …]` data-driven expression family the
  gate-ticks layer already uses in production. Solid lines only — no `line-dasharray`, no
  line-gradient (`lineMetrics` gradients are a new, riskier machinery and dasharray is the
  documented device-bug class). Uncoloured sectors paint transparent so the base yellow core
  shows through; coloured spans draw width 6 (bolder than the width-4 core, inside the
  width-7 casing) so an EARNED yellow sector is visibly bolder than an unscored stretch —
  the exact D-013/D-030 precedent the gate ticks already follow (see the WP-E "Opus
  verification catch" comment in routeMapView.tsx).

---

## Part A — app code (3 files)

### A1. `app/src/ui/routeMapGeo.ts` — new pure builder (append at END of file)

The file currently ends with the closing of `gateTicksFeatureCollection` (line 365):

```ts
        },
        properties,
      };
    }),
  };
}
```

Append after it (new code at end of file):

```ts

// ==================================================== WP-sector-coloured-trail P1 (2026-08-26 ruling)

export interface SectorSpanProperties {
  /** 1-based sector number — the span ENDING at gate `sector`. */
  sector: number;
  colour?: string;
}

/**
 * One LineString per SECTOR — the slice of `path` between consecutive gates
 * (path[gateIdx[i-1]] .. path[gateIdx[i]], inclusive both ends, so adjacent
 * spans share their boundary vertex) — so the finished-ride trace can paint
 * each sector's stretch of the route in the colour that sector earned
 * (ruled 2026-08-26: verdict colour lives on the line spans; gate ticks are
 * neutral markers). `sectorColours` is GATE-indexed, the same shape
 * ResultScreen already computes for B-57's gate colours: index i is the
 * colour of the sector ending at gate i (sector i, 1-based); index 0
 * (START — no sector ends there) is ignored. `colour` is OMITTED when a
 * sector has no earned colour, and '' is treated as null — the same
 * ['has','colour'] paint convention and B-50 hardening as the gate builders
 * above. The path's lead-in (before gateIdx[0]) and lead-out (after the
 * last gateIdx) are covered by NO span: they are outside the timed lap and
 * stay the base line colour. Returns null when the asset cannot honestly be
 * split — no/short path, or no gateIdx matching the gate count — so the
 * caller falls back to the plain single-colour line.
 */
export function sectorSpansFeatureCollection(
  a: RouteAsset, sectorColours?: (string | null)[],
): GeoFeatureCollection<LineStringGeometry, SectorSpanProperties> | null {
  if (!a.path || a.path.length < 2) return null;
  if (!a.gateIdx || a.gateIdx.length !== a.gates.length || a.gateIdx.length < 2) return null;
  const features: GeoFeature<LineStringGeometry, SectorSpanProperties>[] = [];
  for (let i = 1; i < a.gateIdx.length; i++) {
    const slice = a.path.slice(a.gateIdx[i - 1], a.gateIdx[i] + 1);
    if (slice.length < 2) continue; // degenerate span (duplicate gateIdx) — nothing drawable
    const raw = sectorColours?.[i] ?? null;
    const colour = raw === '' ? null : raw;
    const properties: SectorSpanProperties = colour !== null
      ? { sector: i, colour }
      : { sector: i };
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: slice.map(([lat, lon]) => [lon, lat] as GeoPosition),
      },
      properties,
    });
  }
  return { type: 'FeatureCollection', features };
}
```

### A2. `app/src/ui/routeMapView.tsx` — 4 edits

**A2a — import.** Anchor (lines 43–45):

```ts
import {
  allGatesBounds, allGatesFeatureCollection, bearingBetween,
  gateTicksFeatureCollection, metresBetween, nearestOnPath, riderFeature, routeBounds, routeLineFeature,
} from './routeMapGeo.ts';
```

Replace the third line of that block so it reads:

```ts
import {
  allGatesBounds, allGatesFeatureCollection, bearingBetween,
  gateTicksFeatureCollection, metresBetween, nearestOnPath, riderFeature, routeBounds, routeLineFeature,
  sectorSpansFeatureCollection,
} from './routeMapGeo.ts';
```

**A2b — new prop.** Anchor (lines 117–119, inside `RouteMapProps`):

```ts
  /** colour per crossed gate, index 0 = START. Gates ahead stay dark; a gate
   * only takes a colour once its sector has actually been scored. */
  gateColours?: (string | null)[];
```

Immediately AFTER those three lines, insert:

```ts
  /** WP-sector-coloured-trail P1 (ruled 2026-08-26): GATE-indexed sector
   * verdict colours — index i colours the SECTOR ending at gate i (the line
   * span between gates i-1 and i); index 0 (START) is ignored. When present
   * (the Result "view trace" map only, for now — the live map is Phase 2)
   * the MapLibre rung overlays one coloured span per earned sector on top of
   * the base line. The PNG rung cannot honour it (the line is baked into the
   * image) — accepted rung degradation, same as WP-E's dotted-ahead. */
  sectorColours?: (string | null)[];
```

**A2c — build the collection.** Anchor (line 346, inside `MapLibreRouteMap`, after the
early-return guard):

```ts
  const gateTicksFC = gatesOnly ? null : gateTicksFeatureCollection(asset!, props.gateColours);
```

Immediately AFTER that line, insert:

```ts
  // WP-sector-coloured-trail P1: null unless the caller supplied sector
  // colours AND the asset can honestly be split (path + matching gateIdx —
  // sectorSpansFeatureCollection's own null rule); the plain base line
  // alone then remains, exactly as today.
  const sectorSpansFC = gatesOnly || !props.sectorColours
    ? null
    : sectorSpansFeatureCollection(asset!, props.sectorColours);
```

**A2d — render the spans.** Anchor — the END of the base-route source block plus the FIRST
line of the comment that follows it (lines 426–429; this three-line sequence is unique in
the file):

```tsx
          </M.GeoJSONSource>
        ) : null}
        {/* Cycle 025: every source carries key === id. MapLibre freezes a child's
```

Insert BETWEEN `        ) : null}` and the `{/* Cycle 025:` comment line:

```tsx
        {/* WP-sector-coloured-trail P1 (ruled 2026-08-26): each sector's
            stretch of the line painted in the colour that sector earned,
            drawn OVER the base core — width 6 inside the width-7 casing,
            deliberately bolder than the width-4 core for the same reason
            WP-E's earned ticks are bolder: an earned-yellow sector
            (colors.neutral) must never be pixel-identical to an unscored
            stretch (D-013/D-030). Unearned sectors paint transparent, so the
            base yellow core shows through. Solid lines + the same
            data-driven ['has','colour'] expression family as the gate-ticks
            layer below — NO line-dasharray (the 2026-08-24 device-only
            dasharray bug class) and no line-gradient. Key === id per the
            cycle-025 frozen-id rule in the comment below. */}
        {sectorSpansFC ? (
          <M.GeoJSONSource key="sector-spans" id="sector-spans" data={sectorSpansFC}>
            <M.Layer id="sector-spans-core" type="line"
              paint={{
                'line-color': ['case', ['has', 'colour'], ['get', 'colour'], 'rgba(0,0,0,0)'],
                'line-width': 6,
              }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
          </M.GeoJSONSource>
        ) : null}
```

(Placement matters: sources render their layers in mount order, so this sits ABOVE the
route casing/core and BELOW the gate ticks and rider dot — ticks stay visible as boundary
markers on top of the coloured spans.)

Touch NOTHING else in this file — in particular the `PngRouteMap` component (the PNG rung
cannot recolour a baked line; its ticks go neutral automatically because ResultScreen stops
passing `gateColours` — `col ?? CASING` falls through to CASING for every tick), the
gate-ticks layers, and the `key`/`id` discipline comments.

### A3. `app/src/ui/ResultScreen.tsx` — 4 edits

**A3a — drop the now-unused import.** Anchor (line 30):

```ts
import { chipColors } from './chips.tsx';
```

Delete this line entirely (after A3c, `chipColors` has no remaining use in this file —
verified at HEAD; if your editor/grep finds another use, STOP and report).

**A3b — the span colour table.** Anchor — the whole `tierColour` function (lines 42–50):

```ts
function tierColour(tier: UiTier, t: PaddockTheme): string {
  switch (tier) {
    case 'purple': return colors.purple;
    case 'green': return colors.green;
    case 'yellow': return colors.neutral;
    case 'neutral': return t.accentText;
    default: return t.textDim;
  }
}
```

Immediately AFTER its closing `}`, insert:

```ts

/** WP-sector-coloured-trail P1 (ruled 2026-08-26): the LINE colour a sector
 * span earns per tier. Deliberately NOT chipColors(tier, t).text — the
 * purple chip's .text is PURPLE_INK (near-black ink for text ON a purple
 * chip), which would paint a purple sector's line almost black. And
 * deliberately NOT tierColour() above — that maps 'neutral'/'est' to
 * visible ink colours for TEXT, while an unearned verdict must leave the
 * line unpainted (D-013). Absent keys fall through to null at the use
 * site, so 'neutral' and 'est' sectors keep the base line colour. */
const SPAN_TIER_COLOUR: Partial<Record<UiTier, string>> = {
  purple: colors.purple,
  green: colors.green,
  yellow: colors.neutral,
};
```

**A3c — the per-sector colours.** Anchor — the whole `resultGateColours` block including its
comment (lines 169–185):

```ts
  // B-57: gate colours for the "view trace" browse map — mirrors
  // RecordScreen's gateColours memo, but keyed off the finished ride's OWN
  // sectors (there is no live engine on this screen). Only a clean sector
  // with a real moving time earns a colour; index 0 (START) never does.
  const resultGateColours: (string | null)[] = ride
    ? [
      null,
      ...[...ride.sectors].sort((a, b) => a.index - b.index).map((sec) =>
        sec.quality === 'clean' && sec.movingS !== null
          ? chipColors(
            tierFor(sec.movingS, sectorValues(ride.routeId, sec.index, ride.rideId).filter((v) => v !== sec.movingS)),
            t,
          ).text
          : null),
    ]
    : [];
```

Replace the whole block with:

```ts
  // Ruled 2026-08-26 (WP-sector-coloured-trail P1 — supersedes B-57's gate
  // colouring ON THIS SCREEN): all verdict colour lives on the sector LINE
  // SPANS; gate ticks are neutral static boundary markers ("they are gates"
  // — they mark boundaries, they don't score). Same per-sector verdict
  // computation the gate colours used (tierFor against the sector's own
  // window, excluding this ride's value from it), same array shape: index i
  // is the colour of sector i — the stretch of line ENDING at gate i; index
  // 0 (START — no sector ends there) stays null. Only a clean sector with a
  // real moving time and an EARNED tier paints its span; 'neutral'
  // (< MIN_HISTORY) and unscored sectors stay uncoloured, so the base line
  // shows through (D-013: nothing is judged on too little history).
  const resultSectorColours: (string | null)[] = ride
    ? [
      null,
      ...[...ride.sectors].sort((a, b) => a.index - b.index).map((sec) =>
        sec.quality === 'clean' && sec.movingS !== null
          ? SPAN_TIER_COLOUR[
            tierFor(sec.movingS, sectorValues(ride.routeId, sec.index, ride.rideId).filter((v) => v !== sec.movingS))
          ] ?? null
          : null),
    ]
    : [];
```

**A3d — the map call.** Anchor (lines 241–242):

```tsx
            <RouteMapView variant="browse" routeId={ride.routeId} lat={null} lon={null}
              zoom={1} height={300} showRider={false} gateColours={resultGateColours} />
```

Replace with:

```tsx
            <RouteMapView variant="browse" routeId={ride.routeId} lat={null} lon={null}
              zoom={1} height={300} showRider={false} sectorColours={resultSectorColours} />
```

(No `gateColours` any more: the ticks then all render in the existing unscored neutral
style — thin translucent yellow over black casing — which IS the ruled neutral/static
marker.)

**A3e — the stale JSX comment above that call.** Anchor (lines 239–240, directly above the
A3d anchor):

```tsx
            // Shows the ROUTE on real streets with today's gate colours; the
            // true ridden trace needs a JSONL reader (future work, D-023).
```

Replace with:

```tsx
            // Shows the ROUTE on real streets with sector-coloured spans; the
            // true ridden trace needs a JSONL reader (future work, D-023).
```

**Nothing else in `app/src`.** In particular do NOT touch: `RecordScreen.tsx`,
`DemoScreen.tsx`, `RoutesScreen.tsx` (its browse map passes no colours and is unaffected),
`chips.tsx`, `colourModel.ts`, `theme.ts`, `routeMapMath.ts`, `routeMapStyle.ts`,
`live/engine.ts`, anything in `store/` or `storage/`, and `ui/preview/`.

## Part B — tests (`app/tests/routemapgeo_suite.ts`)

**B1 — import.** Anchor (lines 9–13):

```ts
import {
  allGatesBounds, allGatesFeatureCollection, bearingBetween, gatesFeatureCollection,
  gateTicksFeatureCollection, metresBetween, riderFeature, routeBounds, routeLineFeature,
  routeSplitFeatures,
} from '../src/ui/routeMapGeo.ts';
```

Change the line `  routeSplitFeatures,` to `  routeSplitFeatures, sectorSpansFeatureCollection,`.

**B2 — three new tests.** The file (330 lines) ends with:

```ts
  const pathless: RouteAsset = { ...a, path: undefined };
  assert(routeSplitFeatures(pathless, rider, { active: true, offRoute: false }) === null,
    'a pathless asset must yield null, same rule as routeLineFeature');
});
```

Append at the END of the file:

```ts

// ================================================================ WP-sector-coloured-trail P1 (Result trace spans)

test('routemapgeo: sector spans — 4 per manifest route, adjacent spans share the gate vertex, ends anchored at gateIdx[0]/gateIdx[last]', () => {
  for (const [id, a] of Object.entries(manifest.routes)) {
    const fc = sectorSpansFeatureCollection(a);
    assert(fc !== null, `${id}: expected a FeatureCollection, got null`);
    assert(fc!.features.length === 4, `${id}: expected 4 sector spans, got ${fc!.features.length}`);
    fc!.features.forEach((feat, k) => {
      assert(feat.geometry.type === 'LineString', `${id}: span ${k} is not a LineString`);
      assert(feat.properties.sector === k + 1, `${id}: span ${k} expected sector ${k + 1}, got ${feat.properties.sector}`);
      assert(feat.geometry.coordinates.length >= 2, `${id}: span ${k} has <2 coordinates`);
      for (const [lon, lat] of feat.geometry.coordinates) {
        assert(lon > 4.6 && lon < 4.73, `${id}: span lon ${lon} out of expected Leuven range — swap regression?`);
        assert(lat > 50.8 && lat < 50.89, `${id}: span lat ${lat} out of expected Leuven range — swap regression?`);
      }
    });
    for (let k = 0; k + 1 < fc!.features.length; k++) {
      const cs = fc!.features[k].geometry.coordinates;
      const endK = cs[cs.length - 1];
      const startNext = fc!.features[k + 1].geometry.coordinates[0];
      assert(endK[0] === startNext[0] && endK[1] === startNext[1],
        `${id}: span ${k} does not end where span ${k + 1} begins`);
      const g = a.path![a.gateIdx![k + 1]];
      assert(endK[0] === g[1] && endK[1] === g[0],
        `${id}: span ${k}/${k + 1} boundary is not the swapped path[gateIdx[${k + 1}]]`);
    }
    const first = fc!.features[0].geometry.coordinates[0];
    const p0 = a.path![a.gateIdx![0]];
    assert(first[0] === p0[1] && first[1] === p0[0], `${id}: first span must start at the swapped path[gateIdx[0]]`);
    const lastCs = fc!.features[fc!.features.length - 1].geometry.coordinates;
    const last = lastCs[lastCs.length - 1];
    const pn = a.path![a.gateIdx![a.gateIdx!.length - 1]];
    assert(last[0] === pn[1] && last[1] === pn[0], `${id}: last span must end at the swapped path[gateIdx[last]]`);
  }
});

test('routemapgeo: sector spans — gate-indexed colour lands on the span ENDING at that gate, \'\' treated as null, none given -> none carried', () => {
  const a = manifest.routes.Morning;
  const none = sectorSpansFeatureCollection(a);
  assert(none !== null, 'expected spans with no colours arg');
  for (const feat of none!.features) {
    assert(!('colour' in feat.properties), 'no sectorColours given but a span carries colour');
  }
  const withColours = sectorSpansFeatureCollection(a, [null, '#A667F0', null, '#3ED598', null]);
  withColours!.features.forEach((feat, k) => {
    const sector = k + 1;
    if (sector === 1) {
      assert(feat.properties.colour === '#A667F0', `sector 1 expected #A667F0, got ${feat.properties.colour}`);
    } else if (sector === 3) {
      assert(feat.properties.colour === '#3ED598', `sector 3 expected #3ED598, got ${feat.properties.colour}`);
    } else {
      assert(!('colour' in feat.properties), `sector ${sector} should carry no colour property`);
    }
  });
  const withEmpty = sectorSpansFeatureCollection(a, [null, '', '#123456', null, null]);
  withEmpty!.features.forEach((feat, k) => {
    if (k + 1 === 2) {
      assert(feat.properties.colour === '#123456', `sector 2 expected #123456, got ${feat.properties.colour}`);
    } else {
      assert(!('colour' in feat.properties), `sector ${k + 1} should carry no colour ('' -> null, B-50 hardening)`);
    }
  });
});

test('routemapgeo: sector spans — null without a path, without gateIdx, or with a gateIdx/gates length mismatch', () => {
  const a = manifest.routes.Morning;
  const pathless: RouteAsset = { ...a, path: undefined };
  assert(sectorSpansFeatureCollection(pathless) === null, 'no path must yield null (fall back to the plain line)');
  const noIdx: RouteAsset = { ...a, gateIdx: undefined };
  assert(sectorSpansFeatureCollection(noIdx) === null, 'no gateIdx must yield null');
  const mismatch: RouteAsset = { ...a, gateIdx: a.gateIdx!.slice(0, 3) };
  assert(sectorSpansFeatureCollection(mismatch) === null, 'gateIdx/gates length mismatch must yield null');
});
```

Expected suite result after Parts A+B: **255 tests: 252 pass, 0 fail, 3 skip** (+3 on the
baseline's 252/249/0/3).

## Part C — `demos/mockup.html` (mockup-mirror, one prose line)

The mockup does NOT model the trace map itself (it says so), so the mirror obligation
(process/CONVENTIONS.md, "The mockup tracks the app, always") reduces to keeping its one
descriptive sentence truthful. Anchor (lines 653–654):

```
      The shipped Result screen also has a "VIEW TRACE ›" link (B-57) that opens a route on a real-street
      browse map with the ride's gate colours — not modelled in this mockup.</div>`;
```

Replace with:

```
      The shipped Result screen also has a "VIEW TRACE ›" link (B-57) that opens a route on a real-street
      browse map with each sector's stretch of the line painted in the colour that sector earned, gate
      ticks as neutral boundary markers (ruled 2026-08-26) — not modelled in this mockup.</div>`;
```

Nothing else in the mockup — the map it draws is the LIVE screen sim (Phase 2, untouched).
Do NOT run `07_build_mockup.py`.

## Part D — `design/make_screens.py` / `design/canonical/*.svg`: **N/A, no edit**

Verified at HEAD: the design SVG mirror renders the RESULT screen with the trace COLLAPSED —
`make_screens.py` line ~1485 draws only the literal text "VIEW TRACE ›"
(`content_last_trace_link`); no map, no route line, no gate marks appear in any canonical
SVG. There is nothing to mirror, so do not edit `make_screens.py` and do not regenerate
`design/canonical/`. (If you find yourself wanting to change anything under `design/`,
STOP — that is out of scope.)

## Must-not-change list (byte-identical at the end of your pass)

`app/src/ui/RecordScreen.tsx` · `app/src/ui/DemoScreen.tsx` · `app/src/ui/RoutesScreen.tsx` ·
`app/src/ui/chips.tsx` · `app/src/ui/colourModel.ts` · `app/src/ui/theme.ts` ·
`app/src/ui/routeMapMath.ts` · `app/src/ui/routeMapStyle.ts` · `app/src/ui/preview/**` ·
`app/src/live/**` · `app/src/store/**` · `app/src/storage/**` · `app/assets/**` ·
`app/tests/fixtures/**` · every other test suite · `design/**` ·
`data/analysis/**` · `product/**` · `process/**` · `STATE.md` · `IDEAS.md`.

## Verification (MANDATORY — run all, report exact outputs)

1. `cd "$HOME/mnt/Qualifire/app" && node --experimental-strip-types tests/run.ts` →
   **255 tests: 252 pass, 0 fail, 3 skip** (baseline 252/249/0/3; +3 new). Report the exact
   final line.
2. `cd "$HOME/mnt/Qualifire/app" && ./node_modules/.bin/tsc --noEmit; echo "tsc exit: $?"` →
   `tsc exit: 0`, no diagnostics. Use `timeout_ms` ≈ 170000 and NO `timeout` prefix (~48 s
   tonight). Report the exit code.
3. `cd "$HOME/mnt/Qualifire/app" && grep -n "from './chips\|resultGateColours" src/ui/ResultScreen.tsx`
   → no output. (A prose mention of `chipColors` inside the SPAN_TIER_COLOUR doc comment is
   expected and correct — that is why this check greps for the import specifier, not the name.)
4. `cd "$HOME/mnt/Qualifire/app" && grep -c "sector-spans" src/ui/routeMapView.tsx` → `2`
   (the source line carrying key+id, and the layer id line).
5. `cd "$HOME/mnt/Qualifire/app" && grep -c "sectorSpansFeatureCollection" src/ui/routeMapGeo.ts src/ui/routeMapView.tsx tests/routemapgeo_suite.ts`
   → `src/ui/routeMapGeo.ts:1`, `src/ui/routeMapView.tsx:3`, `tests/routemapgeo_suite.ts:8`.
6. `cd "$HOME/mnt/Qualifire" && grep -c "painted in the colour that sector earned" demos/mockup.html` → `1`.
7. `cd "$HOME/mnt/Qualifire" && git diff --stat` → exactly 5 files changed (a
   `warning: unable to unlink '…/.git/index.lock'` line may appear on this mount — it is
   benign, ignore it; this brief file itself is untracked and will not appear in the diff):
   `app/src/ui/ResultScreen.tsx`, `app/src/ui/routeMapGeo.ts`, `app/src/ui/routeMapView.tsx`,
   `app/tests/routemapgeo_suite.ts`, `demos/mockup.html`. If ANY other file shows as
   changed, STOP and report.

Expected `git diff --stat` shape (measured on the planning pass's dry run): ResultScreen.tsx
~43 lines touched, routeMapGeo.ts +53, routeMapView.tsx +38, routemapgeo_suite.ts +77,
mockup.html 3 — ~200 insertions, ~14 deletions total. Small formatting drift is fine; a
sixth file or a wildly different shape is not.

**The planning pass DRY-RAN this entire edit set tonight against HEAD** (applied every Part
A/B/C edit above verbatim, ran verifications 1–7, then restored the tree): the suite came
back exactly **255 tests: 252 pass, 0 fail, 3 skip**, tsc exited 0, and the diff touched
exactly the five files listed. Every prediction above is measured, not estimated — so any
deviation you see is a real discrepancy: FLAG it in your report — do not fix, rationalise,
or re-run with variations beyond a single retry of a timed-out command.

## Include these findings in your report (informational — no code action)

1. **On-device check still owed (coordinator/Nathan):** the MapLibre pattern used (solid
   line layers + data-driven `['has','colour']` line-color, one extra keyed source) is the
   same family already proven on-device by the gate-ticks layers, and deliberately avoids
   the dasharray/gradient machinery that produced the 2026-08-24 device bug — but the
   standing cycle-024 discipline says a route-line rendering change gets an on-device
   both-themes look before it is called done. Phase 2 (live map) is untouched and remains
   its own WP.
2. **Pre-existing quirk left alone (P2 material):** the LIVE map's gate colours
   (RecordScreen line ~529, and DemoScreen) pass `chipColors(tier, t).text`, so a
   purple-tier gate tick renders PURPLE_INK (`#120521`, near-black) rather than purple.
   Under the 2026-08-26 ruling those ticks all go neutral in Phase 2 anyway, so it was not
   worth touching here — but the P2 brief should not copy `.text` for its line spans
   (this brief's `SPAN_TIER_COLOUR` is the correct mapping to reuse).
3. **PNG fallback rung degradation (accepted):** on a device without the MapLibre native
   module, the Result trace falls to the PNG rung, whose route line is baked into the
   image — sector spans cannot be painted there. Its gate ticks now all render CASING
   (neutral), consistent with the ruling. Same accepted-degradation precedent as WP-E's
   dotted-ahead.
4. **`routeSplitFeatures()` untouched:** still exported/tested but uncalled by the view
   (the 2026-08-24 revert note) — the new `sectorSpansFeatureCollection` sits beside it
   rather than reusing it (different split rule: gate boundaries, not rider position).
