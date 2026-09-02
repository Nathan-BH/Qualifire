**Status: DONE — landed on the device 2026-09-02.** Section 3 (§3.1 `routeAssetRuntime.ts`,
§3.2 `routeMapView.tsx` wiring, §3.3 stale comments) all landed exactly as written. §4's new
suite (`tests/routeasset_runtime_suite.ts`) landed as 12 tests covering all 8 described
categories: 345 tests, 342 pass, 0 fail, 3 skip (up from the 333/330/0/3 baseline). Files
touched matched §6 exactly — `routeMapGeo.ts`/`routeMapMath.ts` needed no changes, and
`RecordScreen.tsx`/`engine.ts` were not touched. WP-D's `riderOnly` guard and WP-J's
always-mounted trail source (both landed in `routeMapView.tsx` since this brief was written)
turned out to be a straightforward slot-in: both are downstream of the `asset` variable this
WP resolves differently, and neither needed re-litigating. The new builder was additionally
validated against real Morning refs+gates (not just the synthetic fixtures in the test
suite) and reproduced the Python-rendered manifest within the tolerances §3.1 itself claims
(gates 0.1–0.4 m, scale ~0.26%, offx exact, offy ~0.09 px) — **note (fresh inspection,
2026-09-02): this manifest-match is Morning-specific, EveningA/B's manifest was fit to a
different source and differs 1.9–2.9% in scale, harmless since the runtime transform only
needs internal self-consistency.** The inspector's stronger, general-purpose check: a gate
drawn by the new builder, pushed back through the engine's own scoring math, rescores to
within 7e-7 m of where it was requested, on a ref built from real ride fixes — i.e. gates
draw exactly where they score, independent of any manifest comparison. §5's verification
commands ran in
the cloud container (`device_bash` down this session) — `tsc --noEmit` fails on unrelated
missing-node_modules/no-`--jsx` grounds across the whole app, same as every other WP this
session; zero errors in the two new pure files. The §5 on-device visual check (both themes)
is still owed — genuinely unfakable headless, exactly as flagged. Unblocks WP-H (map half),
WP-I (map half), WP-K.
**Review doc item: 3. Size: large.**
**Verified against the mirror at commit `447c2ba`.**

---

# WP-C — Drawable user-created routes

*Cycle: 2026-09-01 virgin-ride review, item 3 ("the biggest lever in this whole review"). Size: large. Decision needed from Nathan: none to start. Owed after landing: a mandatory both-themes on-device visual check (Nathan looks at his phone — cannot be faked headless).*

## 1. Goal

Make `RouteMapView` draw any route the runtime catalog knows about — not only the 20 routes baked into `assets/routes/routes.json`. A route born on the phone (`route:<rideId>`, created by the RECORD save/naming flow) has a real reference line in `refs.user.json` and a real gate set in `catalog.user.json`; the engine races against it already (`refFor()` falls back to the user registry). After this WP the map resolves `id → RouteAsset` through one function that checks the bundled manifest FIRST and builds a `RouteAsset` at runtime from `RefLine + gate chainages` SECOND — the same seed-wins shape as `refFor()` / `mergeCatalogs()`.

Unblocks review items 4, 6, 7, 9, 11 (rider-only map, ROUTES trace, gate-card map, Result "VIEW TRACE" + sector-coloured trail for user routes). Those items are NOT built here; this WP only makes the geometry exist and resolve.

## 2. Current state (verified against the mirror at commit `447c2ba`)

All paths relative to `/home/claude/qualifire-mirror/app/` in that session — re-verify against wherever the app tree actually is when this is executed (the device directly, ideally).

### 2.1 The map renders exclusively from the bundled manifest

`src/ui/routeMapView.tsx`:

| Line | What | Why it matters |
|---|---|---|
| 40 | `import manifest from '../../assets/routes/routes.json'` | Metro-bundled JSON; this is why routeMapView itself is not headless-testable. |
| 76 | `const ASSETS = (manifest as unknown as { routes: Record<string, RouteAsset> }).routes;` | The ONLY asset source. |
| 83-85 | `defaultRouteId()` → `defaultMapRouteId(currentCatalog(), (ref) => ASSETS[ref] !== undefined)` | The "nothing picked yet" fallback: first CATALOG route with a drawable asset. On a virgin install every catalog route is a user route → predicate is always false → `null` → both rungs render nothing. **This is the setup/armed blank-map bug.** |
| 86-90 | `IMAGES` — `require()` for only Morning/EveningA/EveningB PNGs | 17 of the 20 seed routes have `image: ""` and NO PNG today. |
| 232-233 | MapLibre rung: `const id = props.routeId ?? defaultRouteId(); const asset = !gatesOnly && id !== null ? ASSETS[id] : undefined;` | Lookup site 1. |
| 336-340 | `routeFC = useMemo(() => routeLineFeature(asset) …, [asset, gatesOnly])` | Depends on `asset` **identity** — a runtime-built asset must be referentially stable across renders or MapLibre re-uploads at every 1 Hz fix. |
| 344 | `if (!gatesOnly && !asset) return null;` | Rung returns null for an unknown id. |
| 351, 363, 368-370, 371, 382 | `offRouteM(asset!…)`, `gateTicksFeatureCollection(asset!…)`, `sectorSpansFeatureCollection(asset!…)`, `routeBounds(asset!)`, `asset!.gates[0]` | Everything downstream consumes a `RouteAsset`; nothing else needs to change if `asset` resolves. |
| 361, 371 | `allGatesFeatureCollection(ASSETS, …)` / `allGatesBounds(ASSETS, …)` | gatesOnly (free-ride) rung enumerates `ASSETS` — user routes never appear in the free-ride gate field either. |
| 596-598 | PNG rung: same double lookup | Lookup site 2. |
| 634 | `if (!asset) return null;` | PNG rung returns null for an unknown id. |
| 675-713 | `{!imgFailed && img ? <Image …/> : ( vector segments from asset.path )}` | **The vector fallback is already gated on `img` being falsy, not only on `imgFailed`.** 17 seed routes already exercise the "no PNG exists at all" branch — only a valid Web-Mercator transform is needed for a runtime asset. |

### 2.2 What a `RouteAsset` is — `src/ui/routeMapMath.ts:32-48`

```ts
export interface RouteGate  { name: string; lat: number; lon: number; px: number; py: number }
export interface RouteAsset {
  image: string;
  path?: [number, number][];     // [lat, lon] pairs, decimated (~37 m spacing in the seed)
  gateIdx?: number[];
  w: number; h: number;          // every seed asset: 900 x 1400
  x0: number; y1: number; scale: number; offx: number; offy: number;
  gates: RouteGate[];
  sourceRide: string;
}
```
`projectToPixel`: `px = offx + (mercX(lon) - x0) * scale; py = offy + (y1 - mercY(lat)) * scale`. A prototype of the same Web-Mercator-bbox-fit rule the Python renderer uses reproduces Morning's manifest to `scale` ±0.3%, `offx` exactly 60, `offy` within 0.2px.

### 2.3 What each rung needs from the asset

`routeMapGeo.ts` and `routeMapMath.ts` need **no changes** — they only assume the `RouteAsset` shape, never the manifest. `path`, `gates[].lat/lon`, and the transform fields are all a runtime builder needs to supply.

### 2.4 What a user route actually has today

- `route id === refLineId` for every user route (`wayCreation.ts`), and (after an earlier WP-D1) for every seed route too — so the resolver below can accept either key, matching every real call site.
- Gate set: **chainage-only**, no lat/lon.
- Reference line (`core/src/types.ts` `RefLine { rx, ry, ch, lat0, lon0, length }`): planar track-local metres, 5m resampled, no lat/lon per vertex.
- Chainage → lat/lon utilities exist in core: `interp1` and `xyToLatLon` (exact inverse of the `toXY` that built the ref). **Nothing in `app/src` calls `xyToLatLon` yet — this WP is its first consumer.**
- Save-flow ordering (`RecordScreen.tsx`): `saveUserCatalog` → `saveUserRef` (registers in memory synchronously) → naming/adjust UI. So both the route and its ref are resolvable in memory by the time any subsequent screen renders.
- Precedent to mirror: `refs.ts` (bundled first, then `userRefFor`), `tracks.ts`'s `catalogTrackSpecs()` (enumerate catalog routes, pair with `refFor`+`gateSetFor`, skip with a warn on failure).

### 2.5 Test-layer conventions

Pure modules are tested directly (no JSON-loader shim needed) by loading `routes.json`/`catalog.seed.json` via `loadJson` rather than importing them. **Design consequence: the new builder/resolver must be a pure module with the manifest, catalog and ref lookup injected**, tested without the shim; `routeMapView.tsx` does the real wiring.

## 3. Proposed changes

### 3.1 NEW pure module — `src/ui/routeAssetRuntime.ts`

No react-native, no JSON imports, no `catalogStore`/`userRefs` imports (deps injected). Validated in the sandbox against real `refs.json` + `catalog.seed.json` (Morning: gates within 0.1–0.4m, transform within 0.3%) and against a synthetic "north ride" fixture including the degenerate straight-north case, a 2-gate set, gates beyond `ref.length`, and gates landing exactly on a kept vertex.

```ts
/**
 * Runtime RouteAsset for routes with no entry in assets/routes/routes.json
 * (WP-C). Builds the SAME RouteAsset shape the Python renderer writes: a
 * decimated [lat,lon] path, gates resolved from chainage onto that line, a
 * gateIdx per gate, and a Web-Mercator fit into the renderer's 900x1400 /
 * 60px-pad frame — so the PNG rung's projectToPixel/cropFor/gateTickPx work
 * unchanged; image is '' (the same no-PNG convention 17 of the 20 seed
 * routes already use).
 *
 * Resolution order mirrors live/refs.ts refFor(): bundled manifest FIRST,
 * runtime build SECOND. Pure — manifest, catalog and ref lookup are
 * injected; routeMapView.tsx wires the real ones.
 */
import type { RefLine } from '../../core/src/index.ts';
import { interp1, xyToLatLon } from '../../core/src/index.ts';
import { gateSetFor } from '../store/catalog.ts';
import type { Catalog } from '../store/types.ts';
import { gateName } from './gateAdjustModel.ts';
import { projectToPixel, type RouteAsset, type RouteGate } from './routeMapMath.ts';

export const RUNTIME_ASSET_W = 900;
export const RUNTIME_ASSET_H = 1400;
export const RUNTIME_ASSET_PAD_PX = 60;
export const RUNTIME_PATH_TARGET_VERTICES = 180;
const DEDUPE_M = 0.5;

const mercX = (lon: number): number => (lon * Math.PI) / 180;
const mercY = (lat: number): number => Math.log(Math.tan(Math.PI / 4 + ((lat * Math.PI) / 180) / 2));

export function pointAtChainage(ref: RefLine, s: number): [number, number] {
  return xyToLatLon(interp1(s, ref.ch, ref.rx), interp1(s, ref.ch, ref.ry), ref.lat0, ref.lon0);
}

export function buildRuntimeRouteAsset(
  ref: RefLine, gateChainageM: readonly number[], sourceRide = '',
): RouteAsset {
  const n = ref.ch.length;
  const stride = Math.max(1, Math.round((n - 1) / RUNTIME_PATH_TARGET_VERTICES));
  interface Cand { s: number; ll: [number, number]; gate: number | null }
  const vertex = (i: number): Cand =>
    ({ s: ref.ch[i], ll: xyToLatLon(ref.rx[i], ref.ry[i], ref.lat0, ref.lon0), gate: null });
  const cands: Cand[] = [];
  for (let i = 0; i < n; i += stride) cands.push(vertex(i));
  if ((n - 1) % stride !== 0) cands.push(vertex(n - 1));
  gateChainageM.forEach((s, gi) => {
    const sc = Math.min(Math.max(s, 0), ref.length);
    cands.push({ s: sc, ll: pointAtChainage(ref, sc), gate: gi });
  });
  cands.sort((a, b) => a.s - b.s || (a.gate === null ? 1 : 0) - (b.gate === null ? 1 : 0));
  const path: [number, number][] = [];
  const gateIdx: number[] = gateChainageM.map(() => -1);
  let lastS = -Infinity;
  let lastWasGate = false;
  for (const c of cands) {
    const near = c.s - lastS < DEDUPE_M;
    if (near && c.gate === null) continue;
    if (near && c.gate !== null && !lastWasGate) {
      path[path.length - 1] = c.ll;
      gateIdx[c.gate] = path.length - 1;
      lastWasGate = true; lastS = c.s;
      continue;
    }
    path.push(c.ll);
    if (c.gate !== null) gateIdx[c.gate] = path.length - 1;
    lastWasGate = c.gate !== null; lastS = c.s;
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [lat, lon] of path) {
    const x = mercX(lon), y = mercY(lat);
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const dx = Math.max(maxX - minX, 1e-12);
  const dy = Math.max(maxY - minY, 1e-12);
  const scale = Math.min(
    (RUNTIME_ASSET_W - 2 * RUNTIME_ASSET_PAD_PX) / dx,
    (RUNTIME_ASSET_H - 2 * RUNTIME_ASSET_PAD_PX) / dy,
  );
  const asset: RouteAsset = {
    image: '', path, gateIdx,
    w: RUNTIME_ASSET_W, h: RUNTIME_ASSET_H,
    x0: minX, y1: maxY, scale,
    offx: (RUNTIME_ASSET_W - dx * scale) / 2,
    offy: (RUNTIME_ASSET_H - dy * scale) / 2,
    gates: [], sourceRide,
  };
  asset.gates = gateIdx.map((pi, i): RouteGate => {
    const [lat, lon] = path[pi];
    const { px, py } = projectToPixel(asset, lat, lon);
    return { name: gateName(i, gateIdx.length), lat, lon, px, py };
  });
  return asset;
}

export interface RouteAssetDeps {
  manifest: Record<string, RouteAsset>;
  catalog: Catalog;
  refFor: (refLineId: string) => RefLine | null;
}

interface CacheEntry { ref: RefLine; gateKey: string; asset: RouteAsset }
let cache = new Map<string, CacheEntry>();

export function resolveRouteAsset(id: string, deps: RouteAssetDeps): RouteAsset | null {
  const bundled = deps.manifest[id];
  if (bundled !== undefined) return bundled;
  const route = deps.catalog.routes.find((r) => r.id === id || r.refLineId === id);
  if (!route) return null;
  const ref = deps.refFor(route.refLineId);
  if (ref === null) return null;
  const gateSet = gateSetFor(deps.catalog, route.id, route.gateSetVersion);
  if (!gateSet || gateSet.chainageM.length < 2) return null;
  const gateKey = `${gateSet.version}|${gateSet.chainageM.join(',')}`;
  const hit = cache.get(id);
  if (hit && hit.ref === ref && hit.gateKey === gateKey) return hit.asset;
  const asset = buildRuntimeRouteAsset(
    ref, gateSet.chainageM, route.referenceRideId ? `ride:${route.referenceRideId}` : 'runtime',
  );
  cache.set(id, { ref, gateKey, asset });
  return asset;
}

export function allRouteAssets(deps: RouteAssetDeps): Record<string, RouteAsset> {
  const out: Record<string, RouteAsset> = {};
  for (const r of deps.catalog.routes) {
    const a = resolveRouteAsset(r.id, deps);
    if (a) out[r.id] = a;
  }
  return out;
}

export function resetRouteAssetCacheForTests(): void { cache = new Map(); }
```

### 3.2 `src/ui/routeMapView.tsx` — wire the resolver into both rungs

1. Imports:
```ts
import { refFor } from '../live/refs.ts';
import { allRouteAssets, resolveRouteAsset, type RouteAssetDeps } from './routeAssetRuntime.ts';
```
2. Replace the `ASSETS`/`defaultRouteId` block with a resolver:
```ts
const ASSETS = (manifest as unknown as { routes: Record<string, RouteAsset> }).routes;
const safeRefFor = (id: string) => { try { return refFor(id); } catch { return null; } };
function assetDeps(): RouteAssetDeps {
  return { manifest: ASSETS, catalog: currentCatalog(), refFor: safeRefFor };
}
function assetFor(id: string | null): RouteAsset | null {
  return id === null ? null : resolveRouteAsset(id, assetDeps());
}
function defaultRouteId(): string | null {
  return defaultMapRouteId(currentCatalog(), (ref) => assetFor(ref) !== null);
}
```
3. MapLibre rung lookup: `const asset = !gatesOnly ? assetFor(id) ?? undefined : undefined;`
4. gatesOnly record: `const drawable = gatesOnly ? allRouteAssets(assetDeps()) : ASSETS;` then pass `drawable` to `allGatesFeatureCollection`/`allGatesBounds` instead of `ASSETS`.
5. PNG rung lookup: `const asset = assetFor(id) ?? undefined; const img = id !== null ? IMAGES[id] : undefined;` — nothing else changes; `img` undefined already selects the vector-segment branch.
6. Header comment: one short paragraph noting the new resolution order.

### 3.3 Stale comments to correct (one-liners, no behaviour change)

- `src/store/wayCreation.ts` — the "routeMapView draws no user routes" comment → "routeMapView builds a RouteAsset at runtime from that ref (ui/routeAssetRuntime.ts)".
- `src/ui/gateAdjustCard.tsx` — "No map: a user-created route has no RouteAsset yet…" → "No map yet — the route IS drawable since WP-C; the map-mirror itself is a separate item (needs a live-chainage override into `buildRuntimeRouteAsset`)".
- Do NOT touch `RecordScreen.tsx` or `engine.ts` — other WPs own those files this cycle.

### 3.4 Explicitly out of scope (follow-ons this unblocks)

- The gate-card map mirror (review item 9) needs `RouteMapView` to accept a gate-chainage override (the card's nudges live in local state until SAVE) — the builder's pure signature already supports it.
- Live sector colouring (item 11), rider-only map (item 4 — WP-D), ROUTES caption text — separate WPs.

## 4. Test plan — NEW `tests/routeasset_runtime_suite.ts` (+ one import line in `tests/run.ts`)

Pure suite, no loader shim. 8 tests: (1) `buildRuntimeRouteAsset` — path/gates/gateIdx from a RefLine + chainages, gate positions exact, path length in range. (2) the synthesised Web-Mercator transform is self-consistent and fits the renderer's frame. (3) the geo builders (`routeLineFeature`, `gateTicksFeatureCollection`, `sectorSpansFeatureCollection`, `routeBounds`, `gateTickPx`) accept a runtime asset. (4) 2-gate and clamped-chainage edge cases. (5) `resolveRouteAsset` — manifest wins by identity even with no ref. (6) user route falls back to a runtime build, cached by identity, invalidated by a gate move or a new ref. (7) `allRouteAssets` — seed from manifest, user routes built, undrawable omitted, feeds the gates-only builders. (8) virgin-install end-to-end: a saved ride becomes the setup map's default route (the exact predicate `routeMapView` uses) — this is the regression test for the blank-map bug, and it must also survive a simulated reboot.

Full exact assertions for each are in the original Plan-tier output — copy them verbatim when executing rather than re-deriving.

## 5. Verification commands

```bash
cd app
node --experimental-strip-types tests/run.ts          # expect 0 fail
node --experimental-strip-types tests/run.ts 2>&1 | grep -E "WP-C|FAIL"
./node_modules/.bin/tsc --noEmit
git diff --stat   # only: routeAssetRuntime.ts (new), routeMapView.tsx, routeasset_runtime_suite.ts (new), tests/run.ts, wayCreation.ts / gateAdjustCard.tsx comments
```

**On-device visual check (owed, both themes):**
1. Virgin profile: record a short ride, name it → SETUP shows the new route (was blank); ARMED shows it with the rider dot; a second ride on that route shows the live map with line + gate ticks; ROUTES tab shows its trace; RESULT → VIEW TRACE shows sector-coloured spans.
2. Shipped build: the 20 seed routes render byte-identically; the free-ride gate field now also contains any user route's gates.
3. The PNG rung may not be reachable on the current dev client (MapLibre native module present since build 4) — note that honestly rather than claiming it was seen.

## 6. Files touched

`src/ui/routeAssetRuntime.ts` (new), `src/ui/routeMapView.tsx`, `tests/routeasset_runtime_suite.ts` (new), `tests/run.ts`, `src/store/wayCreation.ts` + `src/ui/gateAdjustCard.tsx` (comments only). NOT touched: `routeMapGeo.ts`, `routeMapMath.ts`, `userRefs.ts`, `refs.ts`, `tracks.ts`, `catalog.ts`, `defaultRoute.ts`, `RecordScreen.tsx`, `engine.ts`.

## 7. Open questions / risks (genuine, not silently assumed)

1. **Boot chain not verified** — could not confirm `initUserRefs(fs)` runs before the first render on a cold start (App.tsx wasn't in the reviewed set). If it resolves late, the setup map would briefly show null until the next re-render (self-heals on the first GPS fix) — confirm on device.
2. Gate positions for user routes sit exactly on the line (correct — they're defined by chainage), unlike some seed routes whose manifest gates have a lateral offset. Not a bug, just a visible difference.
3. Cache identity is load-bearing (MapLibre source keying) — guarded by test 6.
4. gatesOnly semantics shift from "every manifest asset" to "every catalog route with an asset" when the filter is null — identical today, intended on a virgin build.
5. Decimation is target-count (~180 vertices), not fixed spacing — a very long user route gets coarser spacing than the seed routes. One constant to change if Nathan dislikes it on device.
6. The PNG rung's on-device look for user routes may go unseen on the current dev client — say so rather than claiming it was checked.
7. Item 9 (gate-card map) needs a chainage-override prop on top of this — deliberately deferred.
