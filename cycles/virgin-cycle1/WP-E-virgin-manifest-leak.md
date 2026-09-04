**Status: DONE — landed on the device 2026-09-04, independently inspected (fresh Fable pass, clean; one trivial test-guard tightening applied). 389 tests, 386 pass, 0 fail, 3 skip (9 new); `tsc --noEmit` exit 0. `bundledForSeedMode` in `store/seed.ts` guards both `ASSETS`/`IMAGES` definition sites in `routeMapView.tsx`; DEMO now runs on its own frozen `demoRouteFixture.ts` via a new `asset` prop, no manifest import. `STATE.md`/`OPEN-ITEMS.md`/Q6 all updated to reflect the landed fix.**
**Review doc item: 5 (T — same class as OPEN-ITEMS' "bundled 'Morning' in DEMO"). Size: small-medium (small guard + small fixture + one new pure suite).**
**Verified against the mount as read 2026-09-03 (HEAD `a03b84e`). Every file:line below was read directly via `device_bash` unless marked "(digest)".**

---

# WP-E — Virgin manifest gate-leak

## 1. Goal

1. On a virgin build (`EXPO_PUBLIC_SEED_MODE=empty`, the `virgin` EAS profile), the 20 routes baked into `app/assets/routes/routes.json` and the three pre-rendered route PNGs must be unreachable by **every** code path — not resolvable by id, not drawable on either map rung, not enumerable into a gates-only field, not a fallback for anything. Nathan's ruling: *"remove everything that's bundled to make the virgin app more realistic. It should only use what is actually made on the phone."*
2. Put that policy in **exactly one place**, in a pure module the headless suite can exercise for both seed modes without a device or an APK, and apply it at the *definition* of the bundled data (not at each consumer) so every present and future consumer inherits it.
3. Keep Nathan's own builds byte-identical in behaviour: `shipped` mode must hand out the same manifest object and the same PNG map as today.
4. Keep the DEMO tab working on every build. It currently reads `'Morning'` straight from the manifest (its own import, bypassing the map's resolver) — after (1) that would render a blank SECOND RIDE. WP-O's writers already anticipated this: DEMO gets its own small bundled fixture (Morning's path + gates + gateIdx + renderer transform, no PNG), decoupled from `routes.json`, and the map learns to draw a caller-supplied asset.
5. Leave the asset files themselves alone. This is a runtime code guard keyed on the existing `SEED_MODE` constant, not an EAS/Metro/asset-bundling change (§2.6 says why).

## 2. Current state (verified)

### 2.1 Verdict on the original complaint: the free-ride "black circles" leak is ALREADY closed by WP-C — structurally, not by luck, but only one edit away from reopening

`src/ui/routeMapView.tsx` (MapLibre rung, `MapLibreRouteMap`):

| Line | What | Why it matters |
|---|---|---|
| 69 | `import manifest from '../../assets/routes/routes.json';` | Static, unconditional. Metro resolves it for every profile; the bytes are in every bundle. |
| 108 | `const ASSETS = (manifest as unknown as { routes: Record<string, RouteAsset> }).routes;` | The ONE definition of the bundled manifest inside the map. |
| 113 | `const safeRefFor = ...` | unchanged |
| 114-116 | `function assetDeps(): RouteAssetDeps { return { manifest: ASSETS, catalog: currentCatalog(), refFor: safeRefFor }; }` | Every resolver call goes through here — `deps.manifest` **is** `ASSETS`. |
| 121-123 | `assetFor(id)` → `resolveRouteAsset(id, assetDeps())` | Single-route lookup for both rungs. |
| 131-133 | `defaultRouteId()` → `defaultMapRouteId(currentCatalog(), (ref) => assetFor(ref) !== null)` | Catalog-only iteration (B-39); `store/defaultRoute.ts:104-107` read and confirmed: `for (const r of c.routes) if (drawable(r.refLineId)) return r.refLineId; return null;`. |
| 134-138 | `const IMAGES: Record<string, number> = { Morning: require(...Morning.png), EveningA: ..., EveningB: ... };` | The ONE definition of the bundled PNGs. Only consumer: line 692 (PNG rung). |
| 293-295 | `const gatesOnly = props.gatesOnly ?? false; const id = props.routeId ?? defaultRouteId(); const asset = !gatesOnly ? assetFor(id) ?? undefined : undefined;` | Single-route path. |
| **444** | `const drawable = gatesOnly ? allRouteAssets(assetDeps()) : ASSETS;` | **The WP-C fix.** When `gatesOnly`, the gates field is enumerated from the CATALOG through the resolver, not from the raw manifest. The `: ASSETS` branch is a dead value (nothing reads `drawable` when `!gatesOnly` — lines 445-447 and 456 are both gated on `gatesOnly`). |
| 445-447 | `allGatesFeatureCollection(drawable, props.crossedGates, colors.neutral, props.gateRouteIds)` | |
| 456 | `allGatesBounds(drawable, props.gateRouteIds)` | |

`src/ui/routeAssetRuntime.ts:123-130` (read): `allRouteAssets()` iterates `for (const r of deps.catalog.routes)` only. `src/store/catalogStore.ts:67` `currentCatalog()` = `mergeCatalogs(shippedCatalog(), userCatalog())` (header line 10), and `src/store/seed.ts:34-49`: `SEED_MODE` is `'empty'` under the virgin profile, `shippedCatalog()` then returns `emptyCatalog()`.

So on a virgin new>>new free ride today: catalog = user routes only (empty on ride 1) → `drawable = {}` → `routeMapGeo.ts:112`/`:138` `ids = routeIds ?? Object.keys(assets)` = `[]` → zero gate features, `allGatesBounds` returns `null` (line 154, read). **No black rings.** `STATE.md:78` ("Bundled-gate rings on a new>>new free ride are unaffected — WP-E/Q6") was written for WP-Q before WP-C landed and is stale — it must be corrected as part of this WP (§3.6).

Why this WP still exists: the closure is *incidental to the call site*. `ASSETS` is still the full 20-route manifest, `deps.manifest[id]` still wins first in `resolveRouteAsset` (`routeAssetRuntime.ts:105`), and the `: ASSETS` branch on line 444 shows how one careless edit would reopen it. Nathan's ruling asks for the manifest itself to be gone on a virgin build, so the property holds regardless of what any consumer does.

### 2.2 Every reference to bundled route data in `app/src` — the complete list (grep, then read)

`grep -rn "routes.json\|assets/routes" app/src` returns exactly:

| File:line | Reference | Reachable on a virgin build today? |
|---|---|---|
| `routeMapView.tsx:69` + `:108` | manifest import → `ASSETS` | Yes — via `assetFor(id)` for any id that is a manifest key. Only caller that passes one: `DemoScreen.tsx:189` (`routeId={ROUTE}`, `ROUTE = 'Morning'`). `RecordScreen.tsx:958/1055/1209`, `ResultScreen.tsx:249` (`ride.routeId`), `RoutesScreen.tsx:211` (`r.refLineId`) all pass catalog/result ids; on a virgin build those are user routes, whose ids are `route:<rideId>` (`store/wayCreation.ts:277,296`) — they cannot collide with a manifest key. |
| `routeMapView.tsx:134-138` | three `require(...png)` → `IMAGES` | Only via PNG rung `:692` `IMAGES[id]`, same id set → same DEMO-only exposure. |
| `DemoScreen.tsx:30` + `:54` | its OWN manifest import → `ASSET = manifest.routes['Morning']`, used at `:88` `positionAtTime(ASSET, script.gateAt, clockS)` | Yes, unconditionally, both DEMO modes (the dot rides the Morning path even in FIRST RIDE — comment at `:84-86`). |
| `routeAssetRuntime.ts:2` | comment only | n/a |
| `tests/routemap_suite.ts:21`, `routemapgeo_suite.ts:20`, `store_suite.ts:544,656,785` | test-side `fs` reads of `routes.json` for manifest-integrity tests | Test-only; untouched by this WP. |

Conclusion: after §2.1, the **only** live paths from a virgin build into the bundled data are DEMO's two (`routeId='Morning'` into the map, and its own `ASSET` read). The guard in §3.1-3.2 removes the *possibility* everywhere; §3.3-3.4 rehome DEMO.

### 2.3 `store/seed.ts` is already the build-mode switch — the guard belongs next to it

`src/store/seed.ts` (read 1-60): header calls itself "the ONE place the app reads its bundled catalog and archive ghosts from"; `SEED_MODE` (34-35) is a bundle-time constant (`process.env.EXPO_PUBLIC_SEED_MODE === 'empty' ? 'empty' : 'shipped'`); the pure `catalogForSeedMode(mode)` / `resultsForSeedMode(mode)` (37-43) exist precisely so the suite can exercise the `'empty'` branch without touching the environment. The route manifest and PNGs are the two bundled data sets this file does not yet govern. Adding a generic `bundledForSeedMode()` there keeps "what does a virgin build ship without?" answerable by reading one file.

`seed.ts` imports bare `.json` (27-28) — so under Node it needs the `registerHooks` JSON shim; `catalogstore_suite.ts:13-30` and `demo_suite.ts:16-30` already establish that pattern (register the hook, then `await import(...)` the module under test).

### 2.4 How DEMO is coupled to the manifest, exactly

`src/ui/DemoScreen.tsx` (read 1-27, 41-100, 150-200):

| Line | What |
|---|---|
| 30 | `import manifest from '../../assets/routes/routes.json';` |
| 42-43 | `// Intentional literal (B-39): ...` + `const ROUTE = 'Morning';` |
| 47-51 | `DEMO_FIRST_RIDE_ID = 'demo:first-ride'` — a deliberately non-manifest id so the map takes WP-D's rider-only path |
| 54 | `const ASSET = (manifest as ...).routes[ROUTE];` |
| 88 | `const pos = positionAtTime(ASSET, script.gateAt, clockS);` — needs `path` + `gateIdx` (`routeMapMath.ts:168-173`: returns null unless `idx.length === gateTimes.length`; `buildDemoScript().gateAt` has 5 entries, Morning has 5 gates) |
| 160-161 | header copy: `` `A real archived ${routeLabel(ROUTE)} lap replayed at ${RATE}x — ...` `` (`routeLabel('Morning')` → "Home Work Dry" via `defaultRoute.ts:13`) |
| 189 | `<RouteMapView routeId={ROUTE} ... sectorColours={sectorColours} ... variant="browse" />` — SECOND RIDE draws the line + gate ticks by resolving `'Morning'` through the map's `assetFor` |
| 192 | `<RouteMapView routeId={DEMO_FIRST_RIDE_ID} ... trail={trail} .../>` — FIRST RIDE, no asset by design |

The Morning manifest entry (measured): 163 path vertices, 5 gates (START, G1, G2, G3, FINISH), `gateIdx [7,40,76,120,157]`, 3770 bytes as JSON; `path[gateIdx[i]]` lies 1.4-17.2 m from `gates[i]`; bbox lat 50.83611-50.86377, lon 4.63825-4.68763. Small enough for a literal TS fixture. `RouteAsset` (`routeMapMath.ts:32-48`): `image, w, h, x0, y1, scale, offx, offy, gates, sourceRide` required, `path`/`gateIdx` optional. `.image` and `.sourceRide` are not read anywhere in `src` (grep) — `image` can be `''`, `sourceRide` can be a demo tag.

`RouteMapView`'s PNG rung with no image for the id: `:692` `img = IMAGES[id]` undefined → `:790` `!imgFailed && img ? <Image .../> : (path polyline fallback, :801-804)` — so a route with no PNG already draws its `path` on the PNG rung. The MapLibre rung never uses PNGs. Both rungs therefore draw a fixture that has `path` + `gates` + `gateIdx` + the transform constants.

### 2.5 Test-layer conventions (unchanged from WP-C §2.5)

Pure modules are imported statically; anything that statically imports bare `.json` (`seed.ts`, `colourModel.ts`, `demoModel.ts` via `colourModel.ts`) is pulled in with `await import()` after a `registerHooks` JSON shim (`demo_suite.ts:16-30` is the template). Static-guard source scans of `routeMapView.tsx` are established doctrine (`routemap_suite.ts:244-289`, `routemapgeo_suite.ts:506-513`). `routemapgeo_suite.ts:506-513` asserts `routeMapGeo.ts`/`routeMapView.tsx` contain no `4.68`/`50.85` literal — the new fixture file MUST therefore be its own module, never inlined into either of those.

### 2.6 Why a runtime guard and not an EAS/Metro change

Nathan's literal wording could be read as "strip the bytes from the APK". That would be a `metro.config.js` `resolver.resolveRequest` alias (route `routes.json` → an empty stub when `EXPO_PUBLIC_SEED_MODE=empty`) plus something equivalent for the three `require(...png)`; `eas.json`'s `virgin` profile itself (read: lines 16-21, only `env`) has no asset-exclusion knob, and `app.json` has no `assetBundlePatterns`. None of that can be verified headlessly — only by building the virgin APK and inspecting it — and the Q6 stub already flagged that shape as outside this pipeline. The runtime guard gives the property that actually matters ("no code path can reach it"), is pinned by tests for both modes, and does not change how Nathan's own builds bundle. Stripping bytes remains available as a later build-config chore (§7.4); it is not needed for the behaviour Nathan asked for.

## 3. Proposed changes

### 3.1 `src/store/seed.ts` — the single policy point (≈15 lines)

Append after `shippedResults()` (line 51-53):

```ts
/** WP-E (Nathan's Q6 ruling, 2026-09-03: "remove everything that's bundled
 * ... it should only use what is actually made on the phone"): anything ELSE
 * baked into the JS bundle that an empty-seed (virgin) build must not be
 * able to reach — today the route asset manifest (assets/routes/routes.json)
 * and the three pre-rendered route PNGs, both defined in ui/routeMapView.tsx.
 * Static imports are resolved by Metro before any env logic runs, so the
 * bytes still ship; this makes them unreachable: every consumer sees `{}`.
 * 'shipped' hands the very same object back (identity preserved — the
 * resolver's manifest-wins-by-identity rule and Nathan's builds are
 * byte-identical). Pure, so the suite can pin both modes. */
export function bundledForSeedMode<T>(mode: SeedMode, bundled: Record<string, T>): Record<string, T> {
  return mode === 'empty' ? {} : bundled;
}
```

Also extend the header comment's `'empty'` bullet (lines 11-16): after "NO landmarks, ways, routes, gate sets or ghosts" add ", and (WP-E) no bundled route assets or route PNGs — see bundledForSeedMode()".

### 3.2 `src/ui/routeMapView.tsx` — apply the guard at both definitions, add the `asset` prop

**(a) Import.** After line 72 (`import { defaultMapRouteId } ...`), add:

```ts
import { SEED_MODE, bundledForSeedMode } from '../store/seed.ts';
```

(`seed.ts` is already in this module's graph via `catalogStore.ts`; no new bundle cost.)

**(b) Line 108** — before/after:

```ts
// before
const ASSETS = (manifest as unknown as { routes: Record<string, RouteAsset> }).routes;
// after
/** WP-E: the bundled manifest — `{}` on an empty-seed (virgin) build, so
 * resolveRouteAsset()/allRouteAssets() (via assetDeps()) and every other
 * reader see no shipped route at all. Policy lives in store/seed.ts. */
const ASSETS: Record<string, RouteAsset> = bundledForSeedMode(
  SEED_MODE, (manifest as unknown as { routes: Record<string, RouteAsset> }).routes,
);
```

**(c) Lines 134-138** — keep the three `require()` calls literally static (Metro needs static asset requires), wrap the object:

```ts
/** WP-E: same guard as ASSETS — a virgin build has no route PNGs either;
 * the PNG rung then draws `asset.path` (its existing no-image fallback). */
const IMAGES: Record<string, number> = bundledForSeedMode(SEED_MODE, {
  Morning: require('../../assets/routes/Morning.png'),
  EveningA: require('../../assets/routes/EveningA.png'),
  EveningB: require('../../assets/routes/EveningB.png'),
});
```

**(d) Line 444** — remove the dead raw-manifest branch so the manifest is never handed to the gates builders again, even hypothetically:

```ts
// before
const drawable = gatesOnly ? allRouteAssets(assetDeps()) : ASSETS;
// after
const drawable = gatesOnly ? allRouteAssets(assetDeps()) : null;
```

and guard the two consumers on `drawable` (no non-null assertions): line 445-447 `const gatesFC = gatesOnly && drawable ? allGatesFeatureCollection(drawable, ...) : null;` and line 456 `const bounds = gatesOnly && drawable ? allGatesBounds(drawable, props.gateRouteIds) : asset ? routeBounds(asset) : null;`. (Behaviour identical: `drawable` is non-null exactly when `gatesOnly`. Type: `Record<string, RouteAsset> | null`.)

**(e) New optional prop** in `RouteMapProps` (insert after `routeId` at line 165):

```ts
  /** WP-E: a caller-OWNED drawable. When set, both rungs draw THIS asset and
   * skip the id -> asset lookup entirely — neither the bundled manifest nor
   * the runtime resolver is consulted, and `routeId` is used only as the
   * zoom-reset/PNG key. Only DemoScreen passes it (its scripted fixture is
   * not a catalog route and must never be resolvable as one). Ignored when
   * `gatesOnly`. */
  asset?: RouteAsset;
```

Wire it at the two lookup sites:

```ts
// MapLibre rung, line 295 — before
const asset = !gatesOnly ? assetFor(id) ?? undefined : undefined;
// after
const asset = !gatesOnly ? props.asset ?? assetFor(id) ?? undefined : undefined;

// PNG rung, line 691 — before
const asset = assetFor(id) ?? undefined;
// after
const asset = props.asset ?? assetFor(id) ?? undefined;
```

Nothing else in either rung needs to change: `useMemo([asset, gatesOnly])` at ~396-402 keys on the asset object (DEMO passes a module constant, stable identity); `riderOnly`, `off`, `gateTicksFC`, `sectorSpansFC`, `bounds` all read `asset`.

**(f) Comments.** File header (after the WP-C paragraph ending line 66): add a short WP-E paragraph — "WP-E (2026-09-03): on an empty-seed build `ASSETS` and `IMAGES` are `{}` (store/seed.ts `bundledForSeedMode`), so the resolver's 'manifest FIRST' step finds nothing and only routes made on the phone are drawable; DemoScreen supplies its own fixture through the `asset` prop." `defaultRouteId()`'s comment (lines 126-128, "manifest still bundled") → "(manifest bytes still bundled but emptied by WP-E)". The WP-C comment at lines 441-443 ("seed routes included (manifest wins on those by identity)") stays true for shipped mode — append "; on a virgin build the manifest is `{}` (WP-E)".

### 3.3 `src/ui/DemoScreen.tsx` — drop the manifest, use the fixture

| Line | Before | After |
|---|---|---|
| 30 | `import manifest from '../../assets/routes/routes.json';` | delete |
| 35 | `import { positionAtTime, type RouteAsset } from './routeMapMath';` | `import { positionAtTime } from './routeMapMath';` (the type is no longer named here) |
| new, after 39 | — | `import { DEMO_ROUTE_ASSET, DEMO_ROUTE_ID } from './demoRouteFixture.ts';` |
| 40 | `import { routeLabel } from '../store/defaultRoute';` | delete (only used at 161) |
| 42-43 | `// Intentional literal (B-39)...` + `const ROUTE = 'Morning';` | delete both; replace the comment with: `// WP-E: the scripted lap is DemoScreen's own frozen fixture (demoRouteFixture.ts), not a manifest or catalog route — it renders identically on every build, virgin included, and never touches assets/routes/routes.json.` |
| 54 | `const ASSET = (manifest as ...).routes[ROUTE];` | `const ASSET = DEMO_ROUTE_ASSET;` (keeps the `:88` call site untouched) |
| 160-161 | `` `A real archived ${routeLabel(ROUTE)} lap replayed at ${RATE}x — ...` `` | `` `A real archived commute lap replayed at ${RATE}x — ...` `` (rest of the sentence unchanged) |
| 189 | `<RouteMapView routeId={ROUTE} lat=... sectorColours=... variant="browse" />` | `<RouteMapView routeId={DEMO_ROUTE_ID} asset={DEMO_ROUTE_ASSET} lat=... sectorColours=... variant="browse" />` |
| 192 | unchanged (`DEMO_FIRST_RIDE_ID`, no asset — WP-D rider-only path, as today) | |
| header 12-15 | "Needs a non-null, no-manifest-entry route id ..." | still accurate; add one line to the WP-O header: "WP-E: SECOND RIDE's line/gates come from `demoRouteFixture.ts` via the map's `asset` prop, not from the bundled manifest." |

`DEMO_ROUTE_ID = 'demo:second-ride'` (defined in the fixture module) mirrors `'demo:first-ride'`: it is not a manifest key, so on a shipped build the PNG rung takes the `path` fallback for DEMO rather than `Morning.png` — accepted (§7.3); the MapLibre rung, the one the phone actually runs, is pixel-identical to today because the geometry is identical.

### 3.4 NEW `src/ui/demoRouteFixture.ts` — generated once, committed as source (≈203 lines)

Do not hand-type 163 coordinate pairs. From `app/`, save the script below to the scratchpad (e.g. `gen_demo_fixture.mjs`) and run `node gen_demo_fixture.mjs` once; it writes `src/ui/demoRouteFixture.ts`. Dry-run on the mount produced a 203-line file with the header, transform constants, 5 gates and 163 path rows exactly as expected. Delete the script afterwards — it is not a repo artefact (provenance is in the file header and in this brief).

```js
// gen_demo_fixture.mjs — run from app/: node gen_demo_fixture.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const m = JSON.parse(readFileSync('./assets/routes/routes.json', 'utf8')).routes.Morning;
const n = (v) => JSON.stringify(v);
const gates = m.gates.map((g) => `    { name: ${n(g.name)}, lat: ${g.lat}, lon: ${g.lon}, px: ${g.px}, py: ${g.py} },`).join('\n');
const path = m.path.map(([a, b]) => `    [${a}, ${b}],`).join('\n');
const out = `/**
 * WP-E (2026-09-03): the DEMO tab's own scripted route — a frozen copy of the
 * geometry the demo has always replayed (the archived Morning lap: path,
 * gates, gateIdx, renderer transform), decoupled from assets/routes/
 * routes.json so the demo keeps working on a virgin build, where the bundled
 * manifest is emptied by store/seed.ts's bundledForSeedMode(). No PNG: the
 * PNG rung draws the path polyline. Not a catalog route, never resolvable by
 * id — DemoScreen hands it to RouteMapView through the \`asset\` prop.
 *
 * Generated once from routes.json (Morning) by the one-off snippet in
 * cycles/virgin-cycle1/WP-E-virgin-manifest-leak.md §3.4; edit by
 * re-running that snippet, not by hand. tests/virginmanifest_suite.ts pins
 * its shape (5 gates, gateIdx monotonic and on the path).
 */
import type { RouteAsset } from './routeMapMath.ts';

/** Not a manifest key and not a catalog id — mirrors DemoScreen's
 * 'demo:first-ride'. Used only as RouteMapView's zoom-reset/PNG key. */
export const DEMO_ROUTE_ID = 'demo:second-ride';

export const DEMO_ROUTE_ASSET: RouteAsset = {
  image: '',
  w: ${m.w},
  h: ${m.h},
  x0: ${m.x0},
  y1: ${m.y1},
  scale: ${m.scale},
  offx: ${m.offx},
  offy: ${m.offy},
  sourceRide: 'demo:second-ride',
  gateIdx: ${n(m.gateIdx)},
  gates: [
${gates}
  ],
  path: [
${path}
  ],
};
`;
writeFileSync('./src/ui/demoRouteFixture.ts', out);
console.log('wrote src/ui/demoRouteFixture.ts,', out.split('\n').length, 'lines');
```

Design notes: `image: ''` (no PNG, field unread anywhere), `sourceRide: 'demo:second-ride'` (the manifest's value is the GPX filename of Nathan's actual commute — a demo fixture should not carry it). Numbers are emitted by JS `Number` → string, which round-trips the JSON values exactly, so the geometry is bit-identical to what DEMO drew yesterday. The file is a pure module (type-only import) — statically importable by the suite with no shim.

### 3.5 Explicitly NOT changed

`routeAssetRuntime.ts` (its `deps.manifest[id]` first-step is correct — the guard makes the manifest empty rather than special-casing the resolver), `routeMapGeo.ts`, `routeMapMath.ts`, `catalog.ts`, `catalogStore.ts`, `defaultRoute.ts`, `RecordScreen.tsx`, `ResultScreen.tsx`, `RoutesScreen.tsx`, `demoModel.ts`, `eas.json`, `app.json`, `app.config.js`, `metro.config.js`, `assets/routes/*` (files stay; Nathan's shipped/dev/preview builds need them), the five test-side `routes.json` reads listed in §2.2.

### 3.6 Docs (same pass, small)

- `STATE.md:78`: replace "Bundled-gate rings on a new>>new free ride are unaffected — WP-E/Q6." with "Bundled-gate rings on a new>>new free ride were already closed by WP-C's catalog-only `allRouteAssets()`; WP-E then emptied the bundled manifest/PNGs on virgin builds outright (`store/seed.ts` `bundledForSeedMode`)."
- `STATE.md:146-149` (the "`DemoScreen.tsx`'s `'Morning'` literal is still hardcoded" bullet): replace with "DEMO replays its own frozen fixture (`src/ui/demoRouteFixture.ts`, Morning's geometry, no manifest import) via `RouteMapView`'s `asset` prop — the same on every build (WP-E, Nathan's Q6 ruling)."
- `OPEN-ITEMS.md:33-34` item 4 ("...whatever DEMO should say when a stranger sees the bundled 'Morning' ride..."): append "(WP-E: DEMO no longer reads the bundled manifest; its copy now says 'A real archived commute lap'.)"
- `cycles/virgin-cycle1/QUESTIONS-FOR-NATHAN.md` Q6: mark as answered + executed by WP-E (coordinator's call whether Execute or Inspect edits it).

## 4. Test plan — NEW `tests/virginmanifest_suite.ts` (+ one import line in `tests/run.ts`)

Header comment states the WP and the shim rule. Register the JSON `registerHooks` shim exactly as `demo_suite.ts:16-30`, then `await import('../src/store/seed.ts')` and `await import('../src/ui/demoModel.ts')`; import statically (pure): `routeAssetRuntime.ts` (`resolveRouteAsset`, `allRouteAssets`, `resetRouteAssetCacheForTests`, `RouteAssetDeps`), `routeMapGeo.ts` (`allGatesFeatureCollection`, `allGatesBounds`), `routeMapMath.ts` (`positionAtTime`, `RouteAsset`), `store/catalog.ts` (`emptyCatalog`), `store/types.ts` (`CATALOG_SCHEMA_VERSION`, `Catalog`, `Route`, `GateSet`), `ui/demoRouteFixture.ts`, and `lib.ts` (`assert`, `test`, `TESTS_DIR`, `loadJson`). Load the real manifest test-side with `fs`/`loadJson` from `path.join(TESTS_DIR, '..', 'assets', 'routes', 'routes.json')` (as `routemap_suite.ts:21` does). Copy `straightNorthRef`/`catalogWith`/`route`/`gateSet` from `routeasset_runtime_suite.ts:46-68` verbatim (they are not exported; a 25-line duplication is the existing convention rather than exporting fixtures). 9 tests:

1. **`bundledForSeedMode: 'shipped' returns the very same object; 'empty' returns {}`** — `const m = { a: 1 }; assert(bundledForSeedMode('shipped', m) === m)` (identity, not just equality — the resolver's manifest-wins-by-identity rule depends on it); `Object.keys(bundledForSeedMode('empty', m)).length === 0`; two `'empty'` calls do not return the same object (`!==`), so no consumer can mutate a shared sentinel.
2. **`bundledForSeedMode on the REAL manifest: 20 shipped routes, 0 virgin routes`** — `Object.keys(bundledForSeedMode('shipped', routes)).length === 20` and includes `'Morning'`; `Object.keys(bundledForSeedMode('empty', routes)).length === 0`.
3. **`virgin resolver: no manifest key resolves, no catalog -> nothing drawable`** — `deps = { manifest: bundledForSeedMode('empty', routes), catalog: emptyCatalog(), refFor: () => null }`; for every `id of Object.keys(routes)`: `resolveRouteAsset(id, deps) === null`; `Object.keys(allRouteAssets(deps)).length === 0`. (Call `resetRouteAssetCacheForTests()` first.)
4. **`virgin gates-only field is empty on BOTH builders, unfiltered (routeIds null) and filtered`** — `allGatesFeatureCollection(allRouteAssets(deps), undefined, '#000', null).features.length === 0`; `allGatesBounds(allRouteAssets(deps), null) === null`; same with `routeIds = ['Morning']`. This is the "black circles on ride 1" regression pin.
5. **`the pre-WP-E hole, documented: the raw shipped manifest handed unfiltered to the gates builders DOES draw 20 routes' gates`** — `allGatesFeatureCollection(bundledForSeedMode('shipped', routes), undefined, '#000', null).features.length > 0` and `allGatesBounds(..., null) !== null`; whereas `allRouteAssets({ manifest: routes, catalog: emptyCatalog(), refFor: () => null })` is `{}` (WP-C's catalog-only enumeration — records §2.1's verdict in executable form: the call site was closed by WP-C, the manifest is closed by WP-E).
6. **`virgin + one phone-made route: still drawable, built at runtime, never from the manifest`** — catalog with `route('route:r1', 'route:r1', 1)` + `gateSet('route:r1', 1, [0, 250, 495])`, `refFor: () => straightNorthRef(100, 5)`, `manifest: bundledForSeedMode('empty', routes)`; `resolveRouteAsset('route:r1', deps)` non-null with `sourceRide === 'runtime'`, `gates.length === 3`; `allRouteAssets(deps)` has exactly the key `route:r1`; `allGatesFeatureCollection(allRouteAssets(deps), undefined, '#000', null).features.length === 3`.
7. **`shipped mode is byte-identical: assetDeps-shaped deps with the real manifest resolve 'Morning' to the manifest object itself`** — `resolveRouteAsset('Morning', { manifest: bundledForSeedMode('shipped', routes), catalog: emptyCatalog(), refFor: () => null }) === routes.Morning` (identity).
8. **`demoRouteFixture: self-consistent and replayable`** — `DEMO_ROUTE_ID === 'demo:second-ride'` and is not a key of `routes`; `DEMO_ROUTE_ASSET.image === ''`; `gates.length === 5 && gateIdx.length === 5`; `gateIdx` strictly increasing, each `< path.length`; `path.length === 163`; for each i, `path[gateIdx[i]]` within 25 m of `gates[i]` (equirectangular; measured 1.4-17.2 m); every path vertex has finite lat/lon; `positionAtTime(DEMO_ROUTE_ASSET, buildDemoScript().gateAt, 0)` is non-null, and at `gateAt[4]` is within 25 m of `gates[4]` (FINISH). (`buildDemoScript` from the dynamically imported `demoModel.ts`.)
9. **`static guard: routes.json and the route PNGs are referenced only inside routeMapView.tsx, and only through bundledForSeedMode`** — walk `src/` recursively (`fs.readdirSync(..., { recursive: true })`, `.ts`/`.tsx` only); every file whose text contains `routes.json` or `assets/routes/` must be `ui/routeMapView.tsx` (comments count as false positives — strip `//` and `/* */` blocks before matching, or tolerate exactly `ui/routeAssetRuntime.ts`'s header line by exempting lines starting with ` *`); `DemoScreen.tsx` contains neither `routes.json` nor `'Morning'`; `routeMapView.tsx` contains `bundledForSeedMode(` at least twice and `import { SEED_MODE, bundledForSeedMode }`; and the string `: ASSETS;` does not appear (the dead raw-manifest branch is gone). Same static-guard doctrine as `routemap_suite.ts:244-289`.

`tests/run.ts`: add `import './virginmanifest_suite.ts';` after the `routeasset_runtime_suite.ts` line (34).

Expected count: baseline + 9 new, 0 fail, 3 skip (existing).

## 5. Verification commands

```bash
cd app
node --experimental-strip-types tests/run.ts          # all suites; expect +9 PASS, 0 FAIL
./node_modules/.bin/tsc --noEmit                      # on the device tree (node_modules present)
grep -rn "routes.json\|assets/routes" src              # expect: routeMapView.tsx:69 import, :135-137 requires, routeAssetRuntime.ts:2 comment — nothing in DemoScreen.tsx
grep -n "Morning" src/ui/DemoScreen.tsx                # expect: no output
```

On-device (the only part the pipeline cannot confirm — same as every WP this cycle): (a) Nathan's dev client / Preview: DEMO SECOND RIDE draws the same line + 5 gate ticks + sector colours as before; RECORD/ROUTES/RESULT unchanged. (b) The virgin APK (still unbuilt — STATE.md:80-81): RECORD new>>new free ride shows basemap + dot, no gate rings; DEMO SECOND RIDE still draws its line and gates; after saving one ride and naming a route, that route (and only it) appears on the map.

## 6. Files touched

`src/store/seed.ts` (+`bundledForSeedMode`, header note), `src/ui/routeMapView.tsx` (import, `ASSETS`, `IMAGES`, `drawable` null branch, `asset` prop + two lookup sites, comments), `src/ui/DemoScreen.tsx` (manifest import out, fixture in, copy), `src/ui/demoRouteFixture.ts` (NEW, generated), `tests/virginmanifest_suite.ts` (NEW), `tests/run.ts` (one line), `STATE.md` + `OPEN-ITEMS.md` (+ Q6 status in `QUESTIONS-FOR-NATHAN.md`, coordinator's call). NOT touched: everything in §3.5.

## 7. Open questions / risks (genuine, not silently assumed)

1. **DEMO keeps replaying the Morning geometry — pre-approved, recorded, not re-asked.** Nathan's Q6 ruling was given with the addendum in front of him that "the DEMO tab then needs its own small bundled fixture (Morning's path + gate indices, no PNG)", and he did not object; the DEMO tab is a fixed scripted replay by design (WP-O), so "only what is made on the phone" cannot literally apply to it — there is nothing on a virgin phone for a demo to replay. This brief therefore treats DEMO as the one canned exception and decouples it from the shipped manifest rather than removing it. What remains true: the fixture is a real Leuven road (Nathan's commute), drawn over real basemap tiles, visible to any stranger who opens DEMO on a virgin build. If Nathan ever wants a synthetic/anonymised demo route, that is a separate product call — flagged here for the record; default: keep Morning's geometry (his own stated expectation).
2. **`STATE.md:78` is stale and the free-ride leak was already closed** — Execute must correct it (§3.6) rather than "fix" a leak that no longer exists at the call site. The guard is still required by Nathan's ruling and for the DEMO/manifest paths; do not skip §3.1-3.2 on the grounds that the black-rings symptom is gone.
3. **PNG-rung DEMO loses `Morning.png` on shipped builds.** With `routeId={DEMO_ROUTE_ID}` the PNG rung's `IMAGES[id]` misses and it draws the `path` polyline. The phone runs MapLibre since build 4 (routeMapView.tsx:96-99, 706-710 — the PNG rung is "the fallback rung's fallback"), so this is invisible in practice. Alternative if anyone objects: pass `routeId="Morning"` alongside `asset={DEMO_ROUTE_ASSET}` — on shipped the PNG returns, on virgin `IMAGES` is `{}` anyway. Default: `DEMO_ROUTE_ID`, so the literal `'Morning'` leaves DemoScreen entirely (STATE.md's open item).
4. **Bytes still ship.** `routes.json` (all 20 routes' geometry, incl. gate names and Nathan's `sourceRide` GPX filenames) and the three PNGs remain inside the virgin APK's JS bundle/assets; they are simply unreachable. Anyone unpacking the APK can read them. If Nathan wants them physically absent, the follow-on is a `metro.config.js` `resolver.resolveRequest` alias (routes.json → `{ "routes": {} }` stub, PNGs → a 1x1 placeholder) keyed on `EXPO_PUBLIC_SEED_MODE`, verified by inspecting a virgin build — build-config work outside this pipeline. Not needed for the behaviour he asked for; not scheduled.
5. **OTA caveat inherited.** `SEED_MODE` is a bundle-time constant (STATE.md:119-121): an `eas update` to the `virgin` channel without `EXPO_PUBLIC_SEED_MODE=empty` would revert the seed AND re-expose the manifest/PNGs in one stroke. Same rule, one more reason to follow it. No code change.
6. **Test 9's source scan is intentionally narrow.** It pins "manifest referenced only in routeMapView.tsx, via the guard" with string checks, the same doctrine as the existing `<M.Map>`/`GeoJSONSource` scans; if a later WP legitimately moves the manifest import (e.g. into `seed.ts`), it updates this test in the same pass. Comment lines are exempted to keep `routeAssetRuntime.ts:2` from tripping it.
7. **`tsc` on the mount.** Previous passes report `tsc --noEmit` fails only on the pre-existing `expo/tsconfig.base` resolution gap when `node_modules` is absent (WP-O status line); on the device tree it should be clean. Nothing here adds a type surface beyond `asset?: RouteAsset` and one generic function.
