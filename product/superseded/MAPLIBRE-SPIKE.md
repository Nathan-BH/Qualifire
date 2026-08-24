# MapLibre feasibility spike

**Status: SPIKE ONLY — nothing installed, nothing changed.** Mobile Developer, cycle 011 (2026-08-17), per Nathan's ruling "feasibility spike, then decide". `app/package.json`, `app/app.json` and `app/eas.json` are untouched. Everything proposed below is `UNBUILT`.

Grounding read: `app/package.json`, `app/app.json`, `app/eas.json`, `app/src/ui/routeMapMath.ts`, `app/src/ui/routeMapView.tsx`, `app/assets/routes/` (3 × 900×1400 RGB PNG, 56–58 KB each + 23 KB `routes.json` = **200 KB total**), `data/analysis/08_build_route_assets.py`.

---

## 1. Does MapLibre React Native install cleanly into this exact project?

**Version I would install: `@maplibre/maplibre-react-native@11.3.6`** (latest, MIT, published from the npm registry metadata read 2026-08-17).

| Requirement | Library says | We have | Verdict |
|---|---|---|---|
| `expo` | peer `>=54.0.0` ([npm metadata](https://registry.npmjs.org/@maplibre/maplibre-react-native/latest)) | `~56.0.0` | pass |
| `react-native` | peer `>=0.80.0`; devDep pinned **0.85.3** | **0.85.3** | pass — exact match |
| `react` | peer `>=19.1.0`; devDep pinned **19.2.3** | **19.2.3** | pass — exact match |
| Architecture | **new arch only from v11** ([docs](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/)) | SDK 55+ is new-arch-only and the flag is gone ([Expo](https://docs.expo.dev/guides/new-architecture/)) | pass |
| Android API | ≥ 23 ([docs](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/)) | Expo 56 default minSdk is higher `[UNVERIFIED]` | pass |
| Expo Go | unsupported ([docs](https://maplibre.org/maplibre-react-native/docs/setup/expo/)) | we use a dev client (D-026 / BUILD-PIPELINE §1) | irrelevant |

The library's own devDependencies are `expo 56.0.8`, `react-native 0.85.3`, `react 19.2.3` — i.e. it is developed against exactly our combination. That is the strongest signal available without installing.

**What cannot be settled without an install.** Whether it *resolves and bundles* under our repo's `.ts`-extension Metro convention and the package's dual ESM/CJS `exports` map; whether the native build actually links on EAS. **The spike would be:** on a branch, `npx expo install @maplibre/maplibre-react-native`, add the plugin, `npx expo prebuild --clean --platform android` locally, `npx tsc --noEmit`, `npx expo export --platform android` (bundles without a build), and read the generated `AndroidManifest.xml`. Cost: zero EAS builds. Only after that does a build get spent.

## 2. What build 5 has to do

| Change | Concrete diff |
|---|---|
| `app/package.json` | `+ "@maplibre/maplibre-react-native": "~11.3.6"` (via `npx expo install`) |
| `app/app.json` → `plugins` | `+ "@maplibre/maplibre-react-native"` — string form is enough; array form only for props ([Expo setup](https://maplibre.org/maplibre-react-native/docs/setup/expo/)) |
| Android permissions | **none new for the map itself.** `INTERNET` is expected to be merged automatically `[UNVERIFIED — read the prebuilt manifest in the spike]`. Location perms already present in `app.json` |
| Gradle | **none required.** Optional plugin props only: `nativeVersion`, `nativeVariant` (`opengl` default / `vulkan`), `locationEngine` (`default` / `google`) ([customizations](https://maplibre.org/maplibre-react-native/docs/setup/library-customizations/)) |
| Trap to avoid | `locationEngine: "google"` pulls in `play-services-location` and is not F-Droid compatible. Keep `default` — we already own our fixes via `expo-location` |
| Native SDK pulled in | MapLibre Native Android **13.2.0** ([docs](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/)) |
| Keystore / applicationId | **survives untouched.** Adding a dependency does not touch EAS credentials or `eas.json`; the `preview` profile's `APP_VARIANT=preview` / distinct-applicationId story (D-026) is unaffected |
| Build budget | 1 of 15 free EAS Android builds/month. The prebuild+export spike in §1 costs 0 |

## 3. Tiles — offline, mid-ride, in Belgium

| Option | €/mo @ 1 user | Licence / attribution | Works with no signal? |
|---|---|---|---|
| **Local PMTiles corridor extract** (Protomaps daily build, `pmtiles extract --bbox`) | **€0** | ODbL Produced Work, OSM attribution required ([downloads](https://docs.protomaps.com/basemaps/downloads)) | **Yes, fully** — `pmtiles://file://` supported since MapLibre Android 11.7.0; we'd get 13.2.0 ([example](https://maplibre.org/maplibre-native/android/examples/data/PMTiles/)) |
| MapLibre **offline pack** off a hosted style | €0 | provider's | Yes — `OfflineManager.createPack({bounds,minZoom,maxZoom})`, plus ambient cache controls and `mergeOfflineRegions` sideload ([OfflineManager](https://maplibre.org/maplibre-react-native/docs/modules/offline-manager/)) |
| **OpenFreeMap** hosted style | €0, no key, no limits ([quick start](https://openfreemap.org/quick_start/)) | OSM + OpenMapTiles | Online only. ToS bars "collect data from the service in automated ways without permission" ([ToS](https://openfreemap.org/tos/)) — I read that as *ask before bulk-downloading a pack* |
| **MapTiler** free | €0 (listed USD $0): 100k API requests + 5k sessions/mo ([pricing](https://www.maptiler.com/cloud/pricing/)) | non-commercial, MapTiler logo required | Online; offline-pack rights `[UNVERIFIED]` |
| **Stadia Maps** free | €0 (listed USD $0), non-commercial only | attribution required | **Ruled out for offline**: "proxying and bulk downloading/caching … are prohibited" ([limits](https://docs.stadiamaps.com/limits/)) |
| Self-hosted tile server | €0 only if it runs on Nathan's PC (which is off, and not on the bike) | — | No |

**Pick: the local PMTiles corridor extract.** It is the only option with zero provider, zero key, zero monthly ToS risk and guaranteed behaviour in a tunnel. Sizing, my own arithmetic from `routes.json` (asset scale 900967.8 px/rad at lat 50.84 → **4.47 m/px**, so the current corridor is **4.0 × 6.3 km**): ≈15 tiles at z14, 54 at z15, 187 at z16 — **~260 tiles for z0–16**, which is **~10–30 MB [ESTIMATE]**, not settled until a pack is actually cut. Known trap: `pmtiles://asset://` is **not** supported (no byte-range reads on `AssetManagerFileSource`), so the file must be copied to `filesDir` on first run — that is real `UNBUILT` work, not a config line.

## 4. What breaks

| Risk | My honest call |
|---|---|
| **Battery** (the open `STATE.md` question) | **[ESTIMATE]** MapLibre Native redraws on change, not on a free-running loop, so a locked-north map with a dot moving at 1 Hz is *not* a 60 fps game. I'd put the delta over the current `<Image>` at **+2 to +5 percentage points of battery across a 25-minute commute**, screen-on, and the GPU wake per redraw is the cost, not the tiles. I would not bet the project on that number |
| What settles it | Two back-to-back commutes on the same phone, same brightness, same route — one on the PNG, one on MapLibre — with `adb shell dumpsys batterystats --reset` before and a bugreport into [Battery Historian](https://developer.android.com/topic/performance/power/setup-battery-historian) after. Per-UID mAh is admitted to be a rough estimate by Google, so read the *difference*, not the absolute |
| **Fast Refresh is lost for the map** | Today the whole map is JS: `routeMapView.tsx` reaches the phone in ~1 s. Under MapLibre every map change still refreshes, but any plugin/prop change costs a build. This is the real cost, and it is permanent |
| **Bundle / APK size** | Grows by the MapLibre Native `.so` per ABI. Size unknown `[UNVERIFIED — measure in the spike's local prebuild]` |
| **D-002** | The map is cosmetic by decision. A native module for a cosmetic surface is exactly the trade Nathan already declined once (BUILD-3-RUNBOOK §0) |
| Sunlight legibility | A real basemap's beige and our F1 yellow sit at nearly the same *value* — `08_build_route_assets.py` already had to add a dark casing to stop the line dissolving. A live vector style needs the same treatment done in style JSON, not in Python |

## 5. The migration path

`routeMapMath.ts` is 5 exported functions. A MapLibre swap touches two of them:

| Function | Under MapLibre |
|---|---|
| `projectToPixel()` | **Replaced** — the camera does this. Kept only for the PNG fallback path |
| `cropFor()` | **Replaced** — becomes a `<Camera>` centerCoordinate + zoomLevel |
| `offRouteM()` | **Survives unchanged** — pure geometry on gate polylines, and D-025 honesty lives here |
| `positionAtTime()` | **Survives unchanged** — cycle-009 arc-length walk along `path`, demo-only |
| `metresPerPixel()` | Survives, but only the fallback still needs it |

Everything else the ride screen consumes — `RouteAsset.path`, `gates`, `gateIdx`, `gateColours` — becomes a GeoJSON source plus a LineLayer and a CircleLayer. The engine, `src/live/`, and the gate/tier logic are untouched.

**The PNG can stay as the offline fallback, and should.** `routeMapView.tsx` already has a degradation ladder (PNG → drawn segments on `imgFailed`); MapLibre becomes a third rung above it, and a missing/empty PMTiles file falls back to the PNG rather than to a black rectangle. That is the difference between degrading and failing.

**The cycle-009 grey context layer is already ruled redundant, and not by me.** `data/analysis/08_build_route_assets.py` (lines 44–49) records the Designer's ruling: with a real basemap the ghost rides are OUT, because "real streets already answer 'where are the roads', so a second grey network on top is a mis-registered duplicate". They are retained only as the no-basemap fallback (`base is None`, or `NOBASE=1`). Under MapLibre: **redundant, dropped** — not kept as an overlay. Note also, factually, that as of this read **no `*-base.png` crop exists in `app/assets/routes/`**, so the currently shipped PNGs are still the context-ride version; D-031's real-OSM substrate is written but not yet captured.

## 6. Verdict

**GO WITH CONDITIONS — and the conditions are not met today, so it does not go in the next build.**

1. **Battery measured first.** The two-commute A/B in §4 runs before a single line of MapLibre UI is written. If the delta is >5 pp, NO-GO stands.
2. **The install spike (§1) passes** — prebuild, typecheck and export all clean, on a branch, costing zero EAS builds. If it does not resolve under our Metro conventions, stop there.
3. **Tiles are the local PMTiles corridor file**, not a hosted style. No provider dependency goes on the bike.
4. **A use case exists that the PNG cannot serve.** Today there is exactly one candidate: a planned route to somewhere Nathan has never ridden (§ below). Cosmetic improvement alone does not justify losing Fast Refresh on the map.
5. It ships in a build that is already being spent for another reason — never a build of its own.

---

### Forward-looking: does the pre-rendered PNG survive a *planned* route?

**No, not in its current form.** Every asset in `app/assets/routes/` is rendered offline by a Python script from a ride Nathan has already ridden, with the Web-Mercator transform baked in and a fixed 900×1400 window covering 4.0 × 6.3 km at 4.47 m/px. A destination typed on the handlebars produces a corridor that is not in that window, at a resolution the asset cannot provide, for a line that no GPX contains. Two escape hatches exist short of MapLibre — render the PNG on-device from a route geometry (loses the OSM substrate; you get a line on a void), or pre-bake a wider, coarser regional asset (loses the detail exactly where a stranger route needs it most). Both are worse than a real basemap. **So: the "type a destination" idea is the first thing in this project that genuinely argues for MapLibre, and it is the condition I would watch.** The routing side is the Navigation Engineer's — I am not designing it here.
