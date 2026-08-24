# Build & Deployment Pipeline

**Status: UNBUILT — plan only.** Written by the Mobile Developer, cycle 002 (2026-08-14), for B-08. Nothing below exists yet; every named tool has been checked against 2026 sources where marked, otherwise flagged `[UNVERIFIED]`.

Answers Nathan's question directly: *how do you practically build an app on a PC, and how does it get onto the phone?* Short version: you write code on the PC, the phone runs a live preview over WiFi while developing, and the finished app is a single `.apk` file you copy onto the phone and install — no app store involved, no money involved.

---

## 1. Stack decision (confirms and sharpens the provisional position)

**Chosen: React Native + Expo (development-build workflow, NOT Expo Go), TypeScript, `expo-location` + `expo-task-manager` for GPS, MapLibre for the map.**

What changed from my dormant-era position after checking 2026 state:

- **`expo-location` background tracking on Android is real and current.** The Expo SDK 56 docs (updated May 2026) confirm it runs a foreground service and auto-adds the `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_LOCATION` permissions; `ACCESS_BACKGROUND_LOCATION` is added when background mode is enabled. My role file's `[UNVERIFIED]` flag on this is now resolved: **verified, supported.**
- **But it does not work in Expo Go.** Foreground/background services are unavailable in the Expo Go preview app on Android — a development build is required. This kills the softest version of my old position ("just use Expo Go") but not Expo itself: the dev-build workflow keeps everything good about Expo (fast refresh, managed config, no native code to write) and adds one build step.
- **Known 2026 wart:** an open Expo issue (July 2026, #47595) reports the background-location foreground service can freeze/ANR after an *app update* while tracking is active. At one user who updates his own app deliberately (not mid-ride), this is a nuisance, not a blocker — noted so nobody is surprised.
- **MapLibre React Native** explicitly supports Expo + Android and was actively maintained as of May 2026. Confirmed. Map stays cosmetic per D-002, so this remains a low-stakes, reversible pick.
- **Fallback demoted, with a cost caveat:** `react-native-background-geolocation` (Transistorsoft) remains the heavy-duty option if `expo-location`'s trace quality disappoints on real rides, but its Android *release* builds require a paid license `[UNVERIFIED — check current terms before ever adopting]`. It would break the $0 pipeline. Only reach for it with evidence in hand.

**Alternatives, honestly:**

- **Flutter** — equally capable (free background-location plugins exist), equally agent-writable. Rejected on tie-break: TypeScript lets the Phase-0 PC validation code and the app share one language and potentially the actual sectoring module, which Dart cannot offer as cleanly.
- **Native Kotlin** — the most direct control over the foreground service and battery behaviour, and zero framework risk. Rejected for now: slower edit-test loop (full Gradle rebuilds vs. sub-second fast refresh), more boilerplate per screen, and the D-006 live-timing UI iterates faster in RN. If the foreground service proves unreliable through Expo's abstraction, a bare RN eject or a small native module is the escape hatch — cheaper than starting in Kotlin.

D-006 (live feedback) is exactly why the dev-build/foreground-service question had to be settled *before* writing code: the phone will be in a pocket or mount with the screen possibly off, so tracking must survive backgrounding from day one. It does, in this stack.

## 2. The dev loop on the Windows PC

**One-time setup:**
1. Install **Node.js LTS** and **Git** (free).
2. `npx create-expo-app` — creates the project. All app code is TypeScript files; this is what the agents edit.
3. Create a free Expo account; build a **development build APK** once via EAS cloud build (see §3 — no Android Studio needed for this path). Install that APK on Nathan's phone once. It is a shell that hosts the live-reloading app.
4. Optional, later: **Android Studio** (free) for unlimited local builds. Not required to start.

**Daily edit-test cycle (the part that answers "how do you practically build"):**
1. On the PC: `npx expo start`. This runs Metro, a local server that serves the app's JavaScript.
2. On the phone (same WiFi): open the installed dev-build app; it connects to the PC and loads the current code.
3. Edit a file on the PC → the phone updates in ~1 second (Fast Refresh). No cable, no rebuild, no reinstall.
4. A rebuild of the APK is only needed when *native* dependencies change (e.g. adding MapLibre) — expected a handful of times over the whole project, not daily.

GPS logic can't be fully tested at a desk; that is what the Phase-0 replay harness (§6) and real test rides are for.

## 3. Getting it onto the phone permanently (no Play Store — D-001)

The deliverable is an **APK file**, installed by sideloading:

- **Cloud build (recommended first):** `eas build --platform android --profile <preview|production>` builds the APK on Expo's servers. **Free tier: 15 Android builds/month** (Expo billing docs, 2026) — ample for this project. Download the APK from a link.
- **Local build (backup, unlimited, fully offline):** install Android Studio + JDK, run `npx expo run:android` or `eas build --local`. Free forever, ~10–20 min per build on a typical PC `[UNVERIFIED — machine-dependent]`.
- **Sideloading:** copy the APK to the phone (USB, or open the EAS download link on the phone), tap it, and allow "install from unknown sources" for that one app when Android asks. That's the entire distribution pipeline. Updates = install the new APK over the old one; app data survives.

Bonus of skipping the Play Store: Google's review process for apps requesting foreground-service/background-location permissions (a real hurdle for published apps) **does not apply** to a sideloaded personal app.

## 4. Foreground-service GPS in this stack (summary level)

- `expo-location` + `expo-task-manager`: define a background location task; starting it launches an Android **foreground service** with a **persistent notification** ("Qualifire is tracking your ride") — mandatory on Android, and honest UX anyway.
- Permissions, requested in-app in two steps as Android requires: fine location (while-in-use) first, then background location. Manifest entries (`FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`) are added automatically by the Expo config plugin.
- Per my working rules: expect OEM battery-saver interference (ask Android to exempt the app from battery optimisation), capture raw fixes at ~1 s interval, store everything, process later. The trace will be imperfect; D-008/D-011 already assume that.

## 5. Cost: $0, confirmed

| Item | Cost |
|---|---|
| Node, Git, Expo tooling, TypeScript | $0 |
| EAS cloud builds | $0 (15 Android builds/mo free tier — verified 2026) |
| Local builds (Android Studio) | $0, unlimited |
| `expo-location` / `expo-task-manager` / MapLibre | $0, open source |
| Map tiles (OSM-based free providers) | $0 at one user `[UNVERIFIED — pick provider and check terms at map time; deferrable per D-002]` |
| Distribution (sideloading) | $0 |
| **Total** | **$0** — with one landmine: the Transistorsoft fallback library is paid on Android release builds. Avoid unless evidence forces it. |

## 6. Phased build order

- **Phase 0 — PC-only validation harness (no app).** Blocked on **B-17** (Nathan's GPX traces). Plain TypeScript scripts on the PC: parse GPX, implement D-011 chainage/gate projection, replay traces, measure σ_s and the noise floor for D-008, test sector placements for **B-02**. This is where the timing model gets proven or broken, at zero mobile complexity. *This module is written to be imported unchanged by the app later.*
- **Phase 1 — minimal tracker.** Expo dev build on Nathan's phone: start/stop button, foreground-service GPS, store raw trace, export GPX. No sectors, no colours, no map. Success = clean continuous traces of real commutes, which also feeds B-17 forward. First battery measurements here.
- **Phase 2 — post-ride sectors.** Run the Phase-0 module over each finished ride on-device: sector times, colours per D-007/D-008, per-direction boards per D-010. Timing-board screen (**B-07**).
- **Phase 3 — live sectors.** The D-006 experience: gate detection in the location task, colour on sector completion, audio/haptic cues (Designer's pending proposal), live display (**B-15**). Only after Phase 2 shows the offline numbers are trustworthy.
- **Phase 4 — comforts.** Map view (MapLibre), reference-lap automation (D-009), history browsing.

Each phase ends on a real phone on a real ride, or it isn't done.

---

*Sources checked 2026-08-14: Expo SDK 56 location docs (docs.expo.dev), Expo billing/plans docs, expo/expo issues #47595, maplibre-react-native repo + docs (maplibre.org). Full links in team/mobile-dev.md log.*

---

## Build 3 readiness — 2026-08-16

**The D-029 gate is cleared by Nathan, on device, without waiting for the Monday commute.** He tested the live v2 surface against a route he already had recorded and signed off the three things the gate named: the lap clock ticks smoothly, the ~2.5 s flash hold reads right, and the slim STOP bar is better than the old slab. D-029 held build 3 until "a version reads as good on-device"; that condition is now met, so the D-026 slate is releasable on his word.

**Ready:**

- Live v2 surface — signed off on device (clock, flash hold, STOP).
- IDEAS §24 — rotating status slot with a 20 s pin on any line that just changed, so the route lock cannot be carouselled away before it is seen. Pure JS, already on the dev client.
- **Metro-specifier normalization — DONE.** `src/live/engine.ts` and `src/live/refs.ts` now use the repo's `.ts`-extension convention, and the QA suite's resolver shim is deleted. Only the bare `.json` import in `refs.ts` still needs a load hook. This mattered before a build because the store (`src/store/`) uses `.ts` specifiers throughout, and the first UI file to import it would otherwise have straddled two conventions.
- Store — catalog, derived results, ranking, derive pipeline, seeded catalog. 82 tests, 79 pass / 0 fail / 3 skip; `tsc` clean. Not imported by any screen, so it cannot affect this build's runtime behaviour.

**Decide before pressing build, because each one costs a whole extra build if deferred:**

1. **MapLibre (IDEAS §25)** — the only native dependency on the slate that is still optional. Adding it later means a fourth build; adding it now costs bundle size and a permissions surface for a map that is cosmetic by D-002.
2. **Standalone preview-profile APK** (D-026) with its own `applicationId`, so it installs alongside the dev client rather than replacing it.
3. Launcher icon, `expo-audio` earcons, `safe-area-context` — uncontroversial, all native, all need this build.

**Still untestable headless, and not gating:** FGS survival on a long screen-off ride, background-permission grant/revoke mid-ride, battery drain. These want a real commute but do not block the build — they are what the build is *for*.

**Note on the archive seeds.** Skipping the commute leaves D-024's cruise-σ tripwire unratified: it was armed pending "the first real commute GPX". Until some app-recorded commute lands, seeded archive laps should stay marked as ghosts and no seed should be allowed to mint a pole. The store already carries `tripwireDemoted` for exactly this.
