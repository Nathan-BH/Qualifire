# Build 4 -- PowerShell runbook

Build 4 rebuilds the Fast Refresh **dev client** to carry ONE new native
module: MapLibre (B-50/D-041). It is not a JS-freezing build the way build 3
was -- a dev client streams its JavaScript from Metro (`npx expo start`) at
runtime, on every launch, so everything that already exists in the codebase
as pure JS/TSX arrives the instant Metro connects. The only thing this build
actually bakes in is the native layer.

**Build 3, for the record, was completed and it FAILED.** Nathan installed
the resulting *preview* APK and found the old three-tab app -- none of his
changes since. The account is in `cycles/cycle-008.md`: *"The preview APK is
stale: it froze the JS at build time and shows none of this."* A standalone
APK bakes its JS bundle in at build time and never refreshes it; that is
exactly the failure class build 4 cannot repeat, because a dev client has no
baked-in bundle to go stale.

**Nathan's ruling, 2026-08-17 (binding): no standalone/preview APK until the
app is finalized.** Build 4 builds ONLY the development-profile dev client.
The MapLibre rebuild that used to be pencilled in as "build 5" is folded into
build 4 -- there is no separate build 5 for it.

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
.\build4.ps1 -DryRun     # every check, spends nothing
.\build4.ps1             # every check, then the build (development profile -- now the default)
```

Costs no Claude tokens; it runs on Expo's servers (EAS), 15 free Android builds
a month.

---

## 1. What this build changes on the phone

**Exactly one native delta: the MapLibre module.** Everything else below is
already pure JS/TSX in the codebase today and needs no build at all -- it
shows up in the CURRENT dev client the moment you reload against Metro,
before build 4 ever runs. Every item here was re-verified against the code
in this pass:

- **Six tabs**: RECORD, RIDES, ROUTES, RESULT, SETTINGS, DEMO
  (`App.tsx`, the `Tab` type and the tab bar). The bar scrolls sideways.
- **The live v2 surface with the lap clock** -- `RecordScreen.tsx` renders
  from the real `liveEngine` feed through the shared `LiveSectorPane`, a
  rate-1 timebase anchored at recording start.
- **The D-030 colour model, settled**: `colourModel.ts` -- `tierFor()`,
  `WINDOW_N = 10` (last 10 rides), `MIN_HISTORY = 5` (below that: no verdict,
  rendered as plain ink, never a colour).
- **The ghost tower + the live position chip.** The chip is real once a tower
  source exists, but `RecordScreen.tsx`'s own comment is explicit: *"posChip
  is null until the B-28 benchmark/ride-history store exists -- no chip
  renders, never a fake rank."* B-28 (the real store) is still open -- see
  section 2.
- **Persisted settings** -- `settings.tsx` writes to `settings.json` via
  `expo-file-system` and restores it on launch.
- **B-44's fix**: `ghostsFor(routeId, excludeRideId?)` in `colourModel.ts`
  drops today's own `session:` ride before the comparison window is sliced,
  so a just-recorded ride never sits inside its own ghost set. Regression-locked
  in the suite (`B-44: a just-recorded ride must not sit inside its own
  comparison history` -- PASS).
- **B-40's comparison-window persistence** -- `lastRide.ts` writes the
  session's recorded results to `results-cache.json` (`RECORDED_CACHE_FILE`)
  and `App.tsx` rehydrates it once at boot via `initRecordedPersistence()`,
  fire-and-forget, so the comparison window survives a restart. The raw JSONL
  on disk stays the only record (D-023); this cache is a convenience.
- **The B-50 real map** (`routeMapView.tsx`) -- MapLibre is the primary rung
  now:
  - Dark OpenFreeMap streets (`https://tiles.openfreemap.org/styles/dark`,
    no API key).
  - Course-up camera follow, with a jitter guard (bearing holds until a fix
    has moved ≥8 m).
  - Gates fill with their tier colour **only once that sector has actually
    been scored** -- ahead-of-you gates stay uncoloured (`gatesFeatureCollection`,
    built in `src/ui/routeMapGeo.ts` and consumed by `routeMapView.tsx`,
    omits the `colour` property entirely rather than setting it null, so the
    style's `['has','colour']` paint expression can tell "not scored" from
    "scored transparent").
  - The rider dot goes grey/theme-dim when more than 120 m off the drawn
    route (`OFF_ROUTE_M = 120`).
  - `OFF ROUTE` and `waiting for GPS` badges.
  - Credit string: `OpenFreeMap © OpenMapTiles Data from OpenStreetMap`.
  - **PNG fallback**: if the native module isn't present or the map fails to
    load, `RouteMapView` silently falls back to the old pre-rendered PNG
    compositor (Esri credit), and if even the bundled image fails, to drawn
    line segments. The lazy `require()` around the native module is exactly
    why the CURRENT dev client (no MapLibre yet) keeps working today on the
    PNG rung -- build 4 is what promotes MapLibre to the primary rung on your
    phone.

## 2. What it does NOT change / how far things are

Everything below was checked against the code in this pass, not carried over
from the old runbook (whose test counts and "no new native modules" line were
stale).

- **GPX export vs. GPX+ (IDEAS §23).** Plain GPX 1.1 export is real
  (`src/storage/gpxExport.ts`) and proven on device (STATE.md: "record→store→export
  proven"). **GPX+** -- the proposed diagnostic extension (gate-detection
  timing, START-to-first-fix latency, connection losses) -- is **UNSTARTED**:
  no `gpxplus`/extensions code exists anywhere in `src/`.
- **Earcons are buzz-only, and there's a loose end worth flagging.** The gate
  buzz is `Vibration.vibrate()`, gated by `settings.earcons`
  (`DemoScreen.tsx`, `src/location/index.ts`). `expo-audio` is installed but
  **no code anywhere calls it** -- no `useAudioPlayer`/`createAudioPlayer`
  usage exists in `src/`. **[Found this pass, not in the old runbook]:**
  seven `.wav` files already sit in `app/assets/earcons/` (`green.wav`,
  `lap_green.wav`, `lap_purple.wav`, `lap_purple_pb.wav`, `neutral.wav`,
  `purple.wav`, `purple_pb.wav`) but are not wired into any code path --
  dangling assets, not a shipped feature. B-27 (audibility in wind) is open.
- **Safe-area insets: still the hardcoded stopgap.** `App.tsx`'s
  `NAV_BAR_STOPGAP = 48` is unchanged and still in use; `react-native-safe-area-context`
  is installed (has been since build 3) but `useSafeAreaInsets()` is called
  nowhere in the app -- only referenced in the old TODO comment. Edge-to-edge
  behaves exactly as before.
- **Red-light handling (§18) is a cosmetic self-report, not a clock control.**
  `settings.redLight` has three values -- `auto` / `button` / `off` -- but
  only `button` has any other code behind it: it shows a
  "RED LIGHT - HOLD CLOCK" button on `RecordScreen` that flips a local
  `held` boolean (dims the button, changes its label). **That boolean is read
  nowhere else** -- it does not touch the engine, the lap clock, or any
  recorded time. The button's own subtitle is honest about this: *"self-reported
  stop - the measured clock keeps its own truth."* `auto` and `off` have no
  distinguishing code at all today.
- **Tower population is still seeded, not real.** `ResultScreen.tsx` /
  `colourModel.ts` read `results.seed.json` as the ghost archive; B-28 (a real
  benchmark/ride-history store) is open. The start pick (`startMode`) only
  changes which label the idle screen shows (`RecordScreen.tsx:249`) -- it
  does not constrain route matching. Route identity is still hardcoded:
  `ResultScreen.tsx`'s `FALLBACK_ROUTE = 'Morning'` and similar literal IDs
  elsewhere (B-39).
- **Map work still open beyond B-50 itself:**
  - **B-51 (per-state wiring on every screen) is genuinely incomplete, not
    just "not yet started" --** `RouteMapView` (the MapLibre/PNG/segments
    ladder) is wired into `RecordScreen.tsx` and `DemoScreen.tsx` only.
    `RoutesScreen.tsx` still `require()`s the raw PNGs directly
    (`ROUTE_IMAGES`) and never touches the ladder at all -- it will not show
    MapLibre tiles even after build 4 installs the module. Palette-firewall
    style patching and label hiding are also still B-51, not attempted here
    (the map style comment says so explicitly: "stock dark, deliberately
    unpatched").
  - **B-52 (ambient/offline tile cache verification) is unbuilt.** No
    offline-pack or tile-cache code exists in `src/` -- there is nothing to
    verify yet beyond "does the OS's own HTTP cache happen to still have the
    tiles."
  - **B-47 (battery A/B)** is open and, per Nathan's D-035, required *before
    any standalone APK ever ships* -- build 4 does not need it since it is a
    dev-client build, but it blocks the eventual preview build.
  - **B-32 (dark vs. light basemap ground, Nathan's eye)** is open --
    `routeMapView.tsx` currently ships the dark OpenFreeMap style
    unconditionally.
- **[UNVERIFIED]** Battery impact of the MapLibre tile rung vs. the old PNG
  rung -- not measurable from source; this is exactly what B-47 exists to
  measure.

## 3. The commands

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
.\build4.ps1 -DryRun
.\build4.ps1
```

If PowerShell refuses with *"running scripts is disabled on this system"* --
that is Windows' default execution policy, not a problem with the file:

```powershell
powershell -ExecutionPolicy Bypass -File ".\build4.ps1" -DryRun
powershell -ExecutionPolicy Bypass -File ".\build4.ps1"
```

or, once, for your user only (no admin needed):
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

**Switches**

| Switch | Effect |
|---|---|
| `-DryRun` | Runs the preflight sections and stops at the boundary. Never queues a build. |
| `-SkipTests` | Skips `tsc` and the suite. Only if you just ran them yourself. |
| `-NoWait` | Queues the build and hands the shell back; check with `npx eas-cli build:list`. |
| `-Force` | Builds despite preflight problems, AND is required to build `-BuildProfile preview` at all. |
| `-BuildProfile preview` | **Barred without `-Force`.** Prints a refusal citing Nathan's 2026-08-17 ruling and build 3's stale-JS failure as precedent. Not what build 4 is for -- no standalone/preview APK until the app is finalized. |
| `-BuildProfile development` | The **default** now. Rebuilds the dev client in place -- this IS build 4. |

**What a good preflight looks like:** `tsc` prints nothing, and the suite
prints a line like `108 tests: 105 pass, 0 fail, 3 skip` -- the exact numbers
will drift as the suite grows; what the script actually gates on is the exit
code and zero `FAIL` lines, not a hardcoded count. Then OK lines for the
native slate (including the MapLibre version and the OpenFreeMap style URL),
the dev-client path, both icons, and the three routes (Morning, EveningA,
EveningB).

The build itself streams to the console and prints a URL at the end. Ctrl-C in
PowerShell does **not** cancel a build that is already on Expo's servers.

## 4. The keystore prompt

EAS may ask about the Android signing key:

> Generate a new Android Keystore?

**Answer: no -- REUSE the existing keystore.** For the default (development)
profile this is the keystore already associated with the dev client's app id,
`com.nathanbonher.qualifire` (`app/app.json` -- `expo.android.package`; the
`.preview` suffix is only appended by `app.config.js` when `APP_VARIANT=preview`,
which the development build never sets). If you ever run `-BuildProfile preview
-Force`, the relevant keystore is instead the one for
`com.nathanbonher.qualifire.preview`.

Why it matters: Android refuses to install an APK over an existing app signed
with a different key. A fresh keystore means a `INSTALL_FAILED_UPDATE_INCOMPATIBLE`
signature-mismatch error, and the only way out is uninstalling the current
app -- which throws away every ride it has recorded.

If you have already generated a new one by mistake, do **not** uninstall in a
hurry: export your rides first from the RIDES tab (Export GPX) while the old app
is still installed.

## 5. On-device checklist -- first Fast Refresh session after build 4

Install: open the printed link on the phone, tap the APK, accept the
"unknown sources" prompt once. **It replaces the old dev client** (same app
id, `com.nathanbonher.qualifire`) -- there is still only the one dev-client
icon; this is not the preview app.

Then start Metro on home WiFi and open the app:

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\app"
npx expo start
```

(or `npx expo start --tunnel` if you're off home WiFi).

**The map, since that's the only thing that actually needed this build:**

1. Map ribbon under RECORD shows **real dark streets** with the route line,
   gates and your dot drawn over them -- not the old pre-rendered PNG.
2. Moving (or the DEMO tab at 25x replay): the camera **follows course-up**,
   and gates fill with their tier colour **only once actually scored** --
   gates ahead of you stay dark/uncoloured.
3. Turn WiFi and mobile data off *before* the map has loaded any tiles: you
   should get the **PNG fallback** (Esri credit) -- never a black screen.
   That's degradation-ladder rung 2 doing its job.
4. **B-52 spot-check (informal, the real verification is still open work):**
   view an area online once, then go offline and reload -- do the same tiles
   still draw from cache? Record yes/no; this is not yet automated or proven,
   just worth a look.
5. Credit string under the map reads exactly
   `OpenFreeMap © OpenMapTiles Data from OpenStreetMap`.
6. `OFF ROUTE` (>120 m from the line) and `waiting for GPS` (no fix yet)
   badges still appear/disappear correctly.

**Carried over from the old checklist, still not verified on hardware:**

7. SETTINGS -> flip every toggle (start mode, tower, live map, earcons, red
   light). Force-stop the app from Android settings, reopen it: the toggles
   must still be where you left them. A plain background/foreground does not
   test this -- it has to be a force-stop.
8. Live v2 on-device feel during an actual commute: the ticking lap clock,
   sector flashes, tier colours, the tower slotting in.
9. Note battery percentage before and after a ride -- still an open question
   (B-47 needs a real measurement, not a note, before any standalone build).

**Dropped from the old checklist** (only made sense for the preview APK,
which build 4 does not produce): the launcher-icon check, the "two icons"
note, and anything phrased as "since build 3" against the standalone app.

## 6. If it goes wrong

- **Preflight fails.** Nothing was spent. Fix what it printed and rerun; it is
  read-only up to the verdict line.
- **`-BuildProfile preview` refuses immediately.** That's intentional --
  pass `-Force` only if Nathan has explicitly lifted the 2026-08-17 bar for
  that run. Otherwise this is not a bug.
- **Build fails in the cloud.** The log link points at the failing step. This
  time there IS a real native dependency change (MapLibre), so a Gradle
  failure is plausible where it wasn't for the old build 4 -- check the
  MapLibre/Expo SDK version pairing in the log before assuming it's
  unrelated.
- **Installs but crashes on launch.** Now has a plausible, specific cause: a
  MapLibre native/JS version mismatch (the JS side and the native module
  built into the APK disagreeing). Try a clean rebuild
  (`.\build4.ps1 -Force` after confirming `node_modules` is current), and if
  you need the app working again immediately, the previous dev-client APK is
  still installable from `npx eas-cli build:list`.
- **Stale-JS freeze is NOT a failure mode here.** A dev client has no baked
  bundle to go stale -- if the app looks wrong, it's either not connected to
  Metro, or Metro is serving old code because you didn't reload; it is
  structurally not build 3's failure recurring.
- **"App not installed" / signature mismatch.** The keystore was regenerated.
  See section 4.

## 7. Standalone commute APK — "Qualifire Preview" (D-043, 2026-08-19)

Why: the dev client only holds its JS in memory. If Android evicts the app during the day and the PC/Metro is unreachable in the evening, it cannot reload — that is what happened on 2026-08-18. The preview profile bakes the JS into the APK: no PC, no Metro, no network needed, survives eviction.

Rule of thumb: **what is in `app/` at the moment you run the command is what rides.** Commit first (GitHub Desktop) so `git status` is clean and you know exactly which tree you froze; rebuild after any change you want on the bike.

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
powershell -ExecutionPolicy Bypass -File .\build5.ps1 -DryRun   # preflight only (wrapper = build4.ps1 -BuildProfile preview -Standalone)
powershell -ExecutionPolicy Bypass -File .\build5.ps1           # ~10–20 min on EAS; reuse the keystore
```
Nathan's PC needs the `-ExecutionPolicy Bypass` prefix every time — all build commands in this repo are written that way. Alternative: double-click `scripts\build5.cmd` (same thing, with a pause at the end); `build5.cmd dry` runs the dry run.

Which app it overwrites: `-BuildProfile preview` → `eas.json` preview profile → `APP_VARIANT=preview` → `app.config.js` renames the app "Qualifire Preview" with package `com.nathanbonher.qualifire.preview`. Android updates the installed app with that same package id + signing key (the old preview icon) and leaves the dev client (`com.nathanbonher.qualifire`) untouched. This is build 5; build 4 was the dev client.

Install over the existing "Qualifire Preview" icon (same package id, same keystore → in-place update; settings/rides of the OLD preview app are kept, the dev client is untouched). First open: grant location "Allow all the time" + notifications again if asked; Settings → battery → Unrestricted. Then the usual acceptance steps.

Phone-side hygiene that also helps the dev client: battery Unrestricted, lock the app in Recents, don't swipe it away.
