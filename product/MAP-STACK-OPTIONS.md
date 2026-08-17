# Map stack options — including the live ride screen

**Status: UNBUILT — proposal only.** Mobile Developer, cycle 014 (2026-08-17), per Nathan's rulings today (map on every screen incl. live; free-tier-with-account OK; online-first OK; one rebuild OK). Compared against this exact project: Expo ~56, RN 0.85.3, React 19.2.3, new-arch-only, Android only, dev client, `react-native-webview` not installed. Grounding: `product/MAPLIBRE-SPIKE.md` (cycle 011), `product/BUILD-PIPELINE.md`, `app/package.json`, `app/app.json`, `app/src/ui/routeMapView.tsx`, `app/src/ui/routeMapMath.ts`.

## 1. Option matrix

| | rebuild? | account/key/card? | cost @1 user | offline | heading-up + bearing | satellite | 3D terrain | Fast Refresh survives? | risk/maturity | verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| **1. `@maplibre/maplibre-react-native`** v11.3.6 | **Yes, once** (native module) | **No account/key.** Tile *source* choice decides this — a local PMTiles file (from D-034) needs none | **€0** always (OSS engine; tiles are our own extract) | **Best of the group**: `OfflineManager.createPack` off a hosted style, or a bundled PMTiles file at `pmtiles://file://` (not `asset://` — copy to `filesDir` first), plus an ambient cache | Yes — v11 `<Camera bearing/pitch/>` + `trackUserLocation="course"|"heading"` (v11 names; the v10 `heading`/`followUserLocation` props no longer exist) | Yes, if the *style* has a raster/hybrid satellite source (Esri, MapTiler sat — separate tile cost/ToS per source) | **No** — MapLibre Native Terrain3D is a roadmap item (Partially Funded, not released); 2D hillshade only | **No, once installed** — any prop/plugin change under the native module still hot-reloads (it's still JS), but adding/removing/upgrading the native package itself costs a build | Low — devDeps pin our exact expo/RN/React combo (verified npm registry read, 2026-08-17); MIT; actively maintained | **#1 pick** |
| **2. `expo-maps`** (official, alpha) | **Yes, once** (native module, Google Maps SDK on Android) | **Yes — Google Cloud project + API key required**, `android.config.googleMaps.apiKey` in app.json ([Expo docs](https://docs.expo.dev/versions/latest/sdk/maps/)). Google Cloud requires a **billing card on file** even inside the free monthly credit [UNVERIFIED — confirm current Maps Platform sign-up flow] | Free tier: Google Maps Platform has a monthly free usage credit `[UNVERIFIED — $ amount not confirmed in this pass]`, so **€0 at 1 user is likely but not proven** | **Not documented** in the SDK page fetched; Google Maps' own tile cache is not exposed as an explicit offline API here — treat as **none/unclear** until checked further `[UNVERIFIED]` | Yes — `CameraMoveEvent`/camera position includes `bearing` ([Expo docs](https://docs.expo.dev/versions/latest/sdk/maps/)) | Yes — Google's satellite/hybrid map type is standard on Android Google Maps | Yes — Google Maps supports 3D buildings/tilt on Android natively `[UNVERIFIED — not confirmed in the fetched page]` | No, once installed — same story as MapLibre | **Alpha, explicitly**: "will frequently experience breaking changes" ([Expo docs](https://docs.expo.dev/versions/latest/sdk/maps/)). Official, but young | Backup pick, gated on the billing-card question |
| **3. `@rnmapbox/maps`** (what Strava uses) | **Yes, once** (native module) | **Yes — Mapbox account + access token required** ([rnmapbox/maps README](https://github.com/rnmapbox/maps)); historically Mapbox also required a second **secret "downloads" token** just to install the SDK `[UNVERIFIED — confirm current install flow still needs it]` — that is a second credential to manage even before any map renders | **€0 at 1 user** — Mapbox's published mobile MAU free allowance is **25,000/month**, well above 1 ([Mapbox pricing](https://www.mapbox.com/pricing)); scales $4/1,000 MAU past 25k, irrelevant here | Yes — `OfflineManager`/offline packs, mature and widely used | Yes — native camera bearing/heading, same pattern as MapLibre (same upstream lineage) | Yes — Mapbox Satellite Streets style, this is literally Strava's stack | Yes — Mapbox terrain-DEM + 3D terrain is a first-class feature (again, literally Strava's stack) | No, once installed | Mature, heavily used (Strava, Snapchat), but v10.3.1 lists **RN 0.79+** support with **new-arch alignment not explicitly confirmed** in the repo page read `[UNVERIFIED — verify against 0.85.3/new-arch before committing]` | Closest to Nathan's inspiration, but adds an account **and** a token-management step MapLibre avoids for no functional gain at 1 user |
| **4. `react-native-webview` + MapLibre GL JS/Leaflet in HTML** | **Yes, once** (native module, even though the map itself is "just JS/HTML") | No account/key needed if the HTML uses the same local-tile approach | €0 | Whatever the HTML/JS map library supports against a locally-served tile source — plumbing is on us, nothing native to lean on | Possible via the JS map library's own bearing API, but the *screen* itself doesn't rotate — CSS transform tricks needed for true heading-up chrome | Possible if the style has a satellite source | Possible with MapLibre GL JS's own terrain support, but doubly indirect (JS library inside a WebView inside RN) | **Yes for the HTML/CSS/JS itself** once the WebView shell exists — that content can be served from an asset or embedded string and edited freely; only the WebView *native module* costs a rebuild, not iteration on the map inside it | Package data is **inconsistent between reads this session** — one fetch reported **14.0.1**, a GitHub-releases fetch reported **13.16.1 (2026-02-27)**; both had `codegenConfig` / new-arch signals, but the exact current version is **[UNVERIFIED — reads disagreed, recheck at install time]** | Interesting for iterate-fast-on-the-map-itself, but doubles the moving parts (RN↔WebView bridge, a second map engine, a second render loop) for no capability MapLibre native doesn't already give directly |
| **5. Status-quo PNG (`routeMapView.tsx`) + pinch/pan** | **No rebuild** — pure JS, ships over Fast Refresh today | None | €0 | Perfect — it's a bundled asset, no network ever | **No** — a raster `<Image>` has no camera; "rotation" would mean pre-rendering N rotated PNGs per route (expensive, ugly at seams) or rotating the whole `<View>` including gate labels (text goes upside-down) | **No** — whatever basemap is baked at render time is what ships; no live raster/vector swap | **No** — flat image, no elevation data | **Yes, always** — this is the baseline | None — it's what's shipped | Cheapest, but **cannot** ever show a route outside its own cropped/baked window (the §29 "typed destination" problem from cycle 011), cannot do satellite/terrain/heading-up. Pinch/pan on top doesn't fix any of that — it's UI sugar on a fundamentally static asset |

## 2. Ranked recommendation

1. **MapLibre React Native.** It is the only option with **zero new account/key/billing surface** (D-032/D-034's concern, now merely "flag it" rather than "hard no" — and MapLibre is the one option that doesn't even need flagging), it already has a proven feasibility spike against this exact repo (cycle 011), it does everything Nathan's Strava inspiration needs (satellite via an Esri/MapTiler raster source in the style JSON, hillshade only, terrain is a NON-GOAL anyway, heading-up via `<Camera heading/>`), and offline story is strongest (local PMTiles, already the D-034 plan). Reasoning for the ranking below Mapbox on "closest to Strava": MapLibre + a satellite raster source + a terrain-RGB source gets the same visual outcome without a second credential to manage for one user.
2. **expo-maps** as the backup **only if** the Google Cloud billing-card requirement turns out to be a soft ask (a card on file, never charged, inside free credit) — Nathan said accounts/keys are fine, but a **billing card** is a step up from a key and worth flagging explicitly per rule (b) below. It is officially Expo's own library, which is attractive for support burden, but "alpha, frequent breaking changes" is a real cost against a project that already treats MapLibre as armed-not-fired.
3. **@rnmapbox/maps** — functionally excellent, literally what Strava runs, but adds an account **and** a token (possibly two tokens) for zero capability gain over #1 at 1 user. Worth revisiting only if MapLibre's satellite/terrain style JSON proves fussy to hand-roll and Mapbox's managed styles save real time.
4. **WebView + JS map** — the fast-iteration story is real but it trades one native module (MapLibre itself) for two moving parts (WebView native module + a JS map engine bridged through it) without buying any capability MapLibre doesn't have natively. Not worth it unless MapLibre's install spike (part B) fails.
5. **Status-quo PNG** — keep as the offline/failure-fallback rung (already the design in `routeMapView.tsx`'s `imgFailed` path), but it cannot serve the live-ride heading-up requirement Nathan ruled in today, so it's not a real contender for the primary surface anymore.

## 3. Exact change-set — #1 pick (MapLibre)

`app/package.json` (`dependencies`, via `npx expo install @maplibre/maplibre-react-native`):
```
"@maplibre/maplibre-react-native": "~11.3.6"
```

`app/app.json` → `expo.plugins` (string form, matches cycle-011 spike):
```json
"plugins": [
  [ "expo-location", { /* unchanged */ } ],
  "expo-status-bar",
  "expo-audio",
  "@maplibre/maplibre-react-native"
]
```

Permissions: **none new to add by hand.** `INTERNET` is expected to merge automatically into the manifest `[UNVERIFIED — confirm by grepping the prebuilt AndroidManifest.xml, which is exactly what the spike script in part B does]`; all location permissions already present in `app.json` cover the map's own-position dot.

## 4. Exact change-set — #2 pick (expo-maps)

`app/package.json`:
```
"expo-maps": "<version matching Expo 56/57 — confirm via `npx expo install expo-maps`>"
```

`app/app.json` → `expo.android`:
```json
"config": {
  "googleMaps": { "apiKey": "<GOOGLE_MAPS_API_KEY>" }
}
```
Requires: a Google Cloud project, Maps SDK for Android enabled, an API key restricted to the app's package/SHA-1, and — per rule (b) of this brief — **flagged clearly**: this is the one option in this matrix that plausibly asks Nathan to put a billing card on a cloud console, even if never charged. No permission changes beyond what's already present.

## 5. What changes on the phone after the rebuild, and what doesn't

Per `BUILD-PIPELINE.md` §2 and `BUILD-4-RUNBOOK.md`'s dev-client vs preview-APK split:
- **Dev client** (Fast Refresh, `npx expo start`): once MapLibre/expo-maps is installed and the dev client is **rebuilt once** (native module now linked), every *subsequent* JS/TSX change to the map screens — camera props, gate colours, layer JSON, UI chrome — reaches the phone over Fast Refresh exactly like today. Only a further native-dependency change (upgrading the map package's native version, adding another native module) costs a second rebuild.
- **Preview APK** (`scripts/build4.ps1`-style, `eas build --profile preview`): does **not** auto-update. It is a frozen snapshot; the map only appears in it once a build is deliberately spent after the native module lands, same as build 4 froze in the JS that had accumulated since build 3.
- **What does NOT change**: keystore, `applicationId`, Gradle files, EAS profiles — cycle 011's spike already confirmed this for MapLibre; expo-maps should be checked the same way but is expected to be equally clean (both are ordinary Expo config-plugin installs, no manual native edits).

## 6. Battery at 1 Hz on the live ride screen, honestly

**No option here is proven battery-safe by measurement; all are [ESTIMATE] pending an on-device A/B.**

- **MapLibre**: MapLibre Native redraws on state change (camera move, source update), not a free-running animation loop — so a stationary camera with a marker moving once/second is not driving continuous frames between updates. Cycle 011's own estimate: **+2 to +5 percentage points of battery over a 25-min commute** vs the current `<Image>`, unmeasured, "I would not bet the project on that number" (`MAPLIBRE-SPIKE.md` §4). That estimate predates today's ruling that the map now also runs on the live screen (previously it would only have run post-ride), so the live-screen case is the one that most needs the real Battery Historian A/B before shipping — same method the spike already specifies.
- **expo-maps / rnmapbox**: same underlying claim (native map view, event-driven redraw, not a game loop) is plausible by the same reasoning but **not verified against either library specifically in this pass** — [ESTIMATE], not fetched.
- **WebView**: worse case by construction — a JS map engine inside a WebView typically *does* run its own render/compositing loop even when idle (browser engines commonly repaint on a timer for cursor blink, CSS animations, etc.), and the RN↔WebView bridge adds message-passing overhead per position update. **[ESTIMATE], leaning worse than the two native options**, not measured.
- **Status-quo PNG**: known-good baseline, effectively free — a `<View>` reposition at 1 Hz, no map engine at all.

None of this replaces the measured two-commute A/B that cycle 011 already specifies as the real gate; today's ruling makes that A/B more urgent, not less, since the live screen is now in scope for whichever engine ships.

## 7. v10 vs v11 prop names

Note: `product/MAPLIBRE-SPIKE.md` §5 uses v10 prop names (`centerCoordinate`, `zoomLevel`); v11 uses `initialViewState`, `bearing`, `pitch`, `zoom`, ref `flyTo`/`easeTo`/`fitBounds`.

---

*Sources fetched 2026-08-17: [npm registry — @maplibre/maplibre-react-native](https://registry.npmjs.org/@maplibre/maplibre-react-native/latest), [MapLibre React Native Expo setup](https://maplibre.org/maplibre-react-native/docs/setup/expo/), [MapLibre OfflineManager docs](https://maplibre.org/maplibre-react-native/docs/modules/offline-manager/), [Expo Maps SDK docs](https://docs.expo.dev/versions/latest/sdk/maps/), [Mapbox pricing](https://www.mapbox.com/pricing), [rnmapbox/maps README](https://github.com/rnmapbox/maps), [react-native-webview npm registry](https://registry.npmjs.org/react-native-webview) (conflicting version reads, see table), [react-native-webview GitHub releases](https://github.com/react-native-webview/react-native-webview/releases), [Expo CLI prebuild flags](https://expo-expo.mintlify.app/cli/commands/prebuild). Plus this project's own `product/MAPLIBRE-SPIKE.md` (cycle 011) and `product/BUILD-PIPELINE.md`.*
