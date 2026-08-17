# Build 3 — PowerShell runbook

Answering the question directly: **the build costs you no Claude tokens.** It runs on Expo's servers (EAS), you drive it from PowerShell, and the free tier is 15 Android builds a month. What it costs is ~10–20 minutes of waiting per build.

## Do this — the two scripts

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
.\build3-prepare.ps1 -DryRun     # 1. see what it would change, change nothing
.\build3-prepare.ps1             # 2. checks, packages, preview app id
.\build3-build.ps1               # 3. spend the build
```

**If PowerShell refuses with "running scripts is disabled on this system"** — that is Windows' default execution policy, not a problem with these files. Either run them without changing anything:

```powershell
powershell -ExecutionPolicy Bypass -File ".\build3-prepare.ps1" -DryRun
powershell -ExecutionPolicy Bypass -File ".\build3-prepare.ps1"
powershell -ExecutionPolicy Bypass -File ".\build3-build.ps1"
```

or allow local scripts for your user once (no admin needed): `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. That still blocks unsigned scripts downloaded from the internet, and only trusts locally-created ones like these.

**That is the whole procedure.** Sections 1–6 below explain what those scripts do and how to do it by hand if one of them misbehaves — they are the reference, not a second path to follow. Sections 8 and 9 (device checklist, troubleshooting) are still worth reading, because no script can do them for you.

Every manual command below runs from `C:\Users\natha\Claude personal projects\Qualifire\app` unless it says otherwise.

---

## 0. Before you start — the one decision

**MapLibre: DECIDED — out of build 3** (Nathan, 2026-08-16). The map is faked instead: each ratified route is pre-rendered once to a PNG with its gates (`app/assets/routes/`), and the rider's dot is placed on top by `src/ui/routeMapMath.ts`. That is an `<Image>` and a positioned `<View>` — **no native module at all**, so the whole map ships over Fast Refresh and needs no build, ever.

The option stays open deliberately: the projection is Web Mercator, the same one tiles use, and the ride screen's entire contract is `projectToPixel()` + `cropFor()`. Swapping in a real basemap later is a component change plus one build, with nothing else disturbed. Verified 2026-08-16: MapLibre React Native is actively maintained and ships an Expo config plugin (Android needs only customizations), so that door is open whenever battery data says a live street map is worth it.

Also confirm: the store code (`src/store/`) is **not** imported by any screen yet. It ships in the bundle as dead code, which is intentional — this build is about native modules, not about switching the app to the new store mid-flight.

---

## 1. Open PowerShell in the app folder *(manual equivalent of the scripts, from here down)*

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\app"
```

## 2. Sanity-check before spending a build

```powershell
npx tsc --noEmit
node --experimental-strip-types tests/run.ts
```

Expect `88 tests: 85 pass, 0 fail, 3 skip` and no TypeScript output. If either complains, stop — a failed cloud build costs 15 minutes and one of your monthly builds.

## 3. Add the native pieces (D-026 slate)

```powershell
npx expo install expo-audio react-native-safe-area-context
```

With MapLibre out, this is the entire native slate — two packages.

`expo install` (not `npm install`) picks the versions matching your Expo SDK, which is the usual cause of a build that compiles but crashes on launch.

### 3b. Only if you later reverse the map decision

```powershell
npx expo install @maplibre/maplibre-react-native
```

Then add it to `app.json` → `expo.plugins`, and rerun step 2. Not needed for build 3.

## 4. Launcher icon

Drop a 1024×1024 PNG at `app/assets/icon.png` (and the same image as `adaptive-icon.png`), then in `app.json` under `"expo"`:

```json
"icon": "./assets/icon.png",
"android": { "adaptiveIcon": { "foregroundImage": "./assets/adaptive-icon.png", "backgroundColor": "#101014" } }
```

The brand mark — white lap ring crossed by the yellow gate slash — is already drawn in `RecordScreen.tsx`; exporting it at 1024 px is the whole job.

## 5. Give the preview build its own app id (D-026)

So it installs *alongside* the dev client instead of replacing it. `build3-prepare.ps1` does this in two moves, and the manual version is the same two:

1. add `"env": { "APP_VARIANT": "preview" }` to `build.preview` in `eas.json`;
2. create `app/app.config.js` that renames the app and appends `.preview` to `android.package` when that variable is set.

(An earlier draft of this file suggested `applicationIdSuffix` in `eas.json` instead. The `app.config.js` route is what the script uses and what is supported across EAS CLI versions — prefer it.) Either way the check is the same: two Qualifire icons on the phone afterwards.

## 6. Log in and build

```powershell
npx eas-cli login          # first time only
npx eas-cli build --platform android --profile preview
```

It uploads the project, queues on Expo's servers, and prints a build URL. You can close PowerShell — the build continues. `npx eas-cli build:list` shows status later.

## 7. Install on the phone

Open the build URL on the phone and tap the APK, or download on the PC and copy it over. Android will ask once about installing from unknown sources. **App data survives** an install over the top.

## 8. Verify on device — the checklist headless tests cannot cover

1. Both icons present (dev client + preview), each opens its own app.
2. START → "GPS live" → ride a few minutes with the screen off → the trace is continuous, no gap at the lock screen.
3. Gates fire: one buzz, checkpoint time flashes ~2.5 s, strip fills.
4. Earcons audible through the phone speaker at ~25 km/h — that is B-27, still open, and the wind is the test.
5. Rides tab → Export GPX → the file lands in Downloads.
6. Battery: note the percentage before and after a full commute.

## 9. If it fails

- **Build fails in the cloud:** the log link points at the failing Gradle step. Nine times out of ten it is a version mismatch from installing with `npm` instead of `expo install`.
- **Builds but crashes on launch:** almost always a native module in the JS bundle that is not in the binary. Check the plugin list in `app.json`.
- **Dev client stops connecting after this:** it is a *different* app now (new id). Run `npx expo start` and scan with the dev client, not the preview build.

---

## What is NOT in this build, deliberately

- The store is not wired to any screen. `towerSource.ts` still returns null, so the live position chip does not render — the archive ghosts exist in `results.seed.json` and are proven by tests, but nothing on the phone reads them yet.
- The colour model is unratified. You lean average (16 Aug); until it is ruled on, the app's live surface stays NEUTRAL from the real engine.
- D-024's cruise-σ tripwire is unratified, so seeded laps stay demotable ghosts.

None of these need a build to change — they are pure JS and arrive over Fast Refresh.
