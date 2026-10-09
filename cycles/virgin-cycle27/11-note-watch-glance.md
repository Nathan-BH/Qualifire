# Note — Idea 4: a smartwatch glance for runners (feasibility and options; NOT a brief)

Written by the Plan tier (Fable) 2026-10-08 ~02:20 UTC from `10-plan.md` §4 and digest 04 (stack facts verified against `app/package.json` / `app.json` by the digest; nothing here was run on a watch or a phone). Nathan: "probably not urgent but can be logged already". Status: **researched; nothing to execute.** Every claim about the outside world below is marked `[UNVERIFIED]` where it rests on general platform knowledge rather than this repo — a web check is owed before any brief.

## 1. What exists today (repo facts, verified by digest 04)
- Expo SDK ~56, React Native 0.85.3, **Android only**, managed Expo with two local Kotlin modules (`qualifire-ride-notification`, `qualifire-lock-screen`) and one config plugin. No iOS target. No watch code, no Wear/Garmin/WatchConnectivity references.
- The ride runs in an `expo-location` **foreground service** (1 Hz fixes) and the native ticker rewrites the service notification every second: body `m:ss · S2` (`rideNotificationPolicy.ts`), title `Recording activity`, plain look, small flame icon. The live `P` position is computed on the phone (`selfRaceModel.ts:393-398`) and is NOT in the notification.
- The sector strip is four `View` bars (`chips.tsx` `StripSlot`); there is no ring, no SVG library, no Reanimated. Idea 5 (this cycle, brief 5) adds the breathing current slot on the phone — the same cue Nathan wants on the watch.

## 2. The three roads

### A. Zero code: let the phone's notification reach the watch `[UNVERIFIED on device]`
Android forwards ("bridges") an app's notifications to a paired **Wear OS** watch (Samsung Galaxy Watch 4+, Pixel Watch, etc.) by default, text only, unless the app marks the notification local-only. Garmin watches paired through Garmin Connect also mirror phone notifications as text `[UNVERIFIED]`. Qualifire's ongoing-service notification already carries the clock and the current sector; a runner could glance at `12:34 · S2` on the wrist today, if bridging is on for this app.
- Cost: nothing to build; one test run with a paired watch.
- Limits: text only (no ring, no colours, no breathing); whether an **ongoing foreground-service** notification is bridged at all, and whether the 1 Hz rewrite re-alerts/vibrates the watch every second, is exactly what must be checked `[UNVERIFIED]`. `P` is not in the body — adding it is a small phone-side change (brief 5's Q5.2 kept the body as is).
- Recommended first step once Nathan names a watch.

### B. A real Wear OS companion app (what the sector ring needs)
- Watch side: a native Wear OS app (Kotlin, Compose for Wear OS / Canvas) drawing a ring of N sectors in the tier colours (idea 2's palette), the current sector breathing, `P` in the centre; no map.
- Phone side: a new local Expo module (Kotlin) that pushes `{sector tiers, current sector, P, clock}` through the **Wearable Data Layer** (`MessageClient` / `DataClient`) from the existing foreground service path (`location/index.ts` module-scope subscribers already push the notification — the same hook would feed the watch) `[UNVERIFIED API details]`.
- The hard part is not the UI but the **build**: a Wear app is a second Gradle application module with its own `applicationId`-compatible manifest, and the managed-Expo / EAS prebuild flow produces one app module. Options: a config plugin that injects a `wear/` module into the generated `android/` project at prebuild `[UNVERIFIED feasibility]`, or leaving the managed workflow for the Android project (a big step the project has avoided so far). Play distribution of a Wear app is a separate track/bundle `[UNVERIFIED]`. This is a research task of its own before any brief.
- Rough size: medium-large, native, a new build (OTA cannot carry it), a watch to test on.

### C. Other platforms
- **Garmin Connect IQ:** a separate Monkey C watch app + the Connect IQ Mobile SDK on the phone (Android) `[UNVERIFIED Expo compatibility]`; same build-system question as B plus a second toolchain. Only worth it if Nathan's runners are Garmin users.
- **Apple Watch:** needs an iOS app; Qualifire is Android-only by decision (2026-09-09). Out until that changes.
- **Wear OS Tiles / complications:** also watch-side code (road B), not a shortcut.

## 3. What Nathan must decide (menu)
- Q4.1 Which watch is the target? (a) Wear OS (Samsung Galaxy Watch, Pixel Watch); (b) Garmin; (c) Apple Watch (not possible, Android-only app); (d) none yet — park the idea. **No recommendation possible without knowing what he or his testers wear.**
- Q4.2 Try road A now? (a) **yes: one run with a paired watch, report what the wrist shows** [recommended, costs nothing]; (b) no, wait for B.
- Q4.3 If B: research first (a config-plugin spike that builds an empty Wear module via EAS) before any UI design. [recommended if and when B is chosen]

## 4. What needs web research / verification before a brief
1. Wear OS notification bridging rules for ongoing foreground-service notifications and the 1 Hz update behaviour.
2. Whether an Expo config plugin can add a second application module (Wear) to the prebuilt Android project, and whether EAS Build / Play Console accept it.
3. Wearable Data Layer API usage from a local Expo module; battery cost of per-second messages.
4. Garmin: Connect IQ Mobile SDK availability for an RN/Expo Android app.

## 5. Not decided here
Nothing. This note is the feasibility read Nathan asked for; no code, no build, no plan beyond "name the watch, test road A".
