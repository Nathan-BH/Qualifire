# 04 - Watch glance: what the app has today (digest)

Date: 2026-10-08. Read-only digest of the repo at app/ (branch virgin, working tree). Paths are relative to the repo root. Line numbers are from the reads made today; treat them as anchors, not contracts.

## TL;DR
- Stack: Expo SDK ~56 (`expo ~56.0.0`), React Native 0.85.3, React 19.2.3, Android only (`app.json` platforms ["android"]). No ios/ or android/ folders, so it is a managed Expo project with local native modules under `app/modules/` and one config plugin.
- Zero watch code or docs in the repo: no Wear OS, Apple Watch, Garmin, WatchConnectivity, complication or tile references. The only mentions are in cycles/virgin-cycle27/00-nathan-ideas.md (the idea itself).
- The sector strip is four View-based slots (S1..S4) in liveView.tsx / chips.tsx, coloured by tier. There is no SVG and no ring; the only animation is a dim/flash opacity on text. Nothing pulses or breathes today.
- Position "P" is computed on the phone (`P = 1 + count of self dots ahead of rider chainage`), shown as text in the live context line, from a 250 ms self-dot tick and a per-fix chainage. It is not a chip (posChip stays null).
- The ride runs as an expo-location foreground service (1 Hz fixes, distanceInterval 0) with a native 1 Hz notification ticker ("12:34 · S2"), so the engine keeps going with the screen off. A watch glance would need a new phone-to-watch channel that does not exist yet.

## 1. Stack, platforms, native pieces
1. `app/package.json`: deps expo ~56.0.0, expo-audio ~56.0.13, expo-dev-client ~56.0.24, expo-file-system, expo-keep-awake, expo-location ~56.0.23, expo-task-manager ~56.0.25, expo-updates ~56.0.24, @maplibre/maplibre-react-native ^11.3.6, react-native-safe-area-context ~5.7.0. No react-native-reanimated, react-native-svg, react-native-gesture-handler or expo-haptics in package.json.
2. `app/app.json`: platforms ["android"]; package com.nathanbonher.qualifire; FOREGROUND_SERVICE, FOREGROUND_SERVICE_LOCATION, ACCESS_BACKGROUND_LOCATION, POST_NOTIFICATIONS, WAKE_LOCK, VIBRATE; plugins: expo-location (foreground service enabled), expo-status-bar, expo-audio, @maplibre/maplibre-react-native, ./plugins/withShowWhenLocked.js. runtimeVersion policy "fingerprint".
3. `app/app.config.js`: variant switch for APP_VARIANT preview/virgin (separate package suffixes). Dev/preview/virgin profiles in `app/eas.json` (development profile has developmentClient true, APK builds).
4. Local native modules (autolinked via expo-module.config.json): `app/modules/qualifire-ride-notification/` (Kotlin, 1 Hz notification ticker) and `app/modules/qualifire-lock-screen/` (Kotlin; not read in detail today). Both android-only.
5. No watch-related native module, config plugin or package exists.

## 2. Sector strip and live position
6. Strip slots: `app/src/ui/chips.tsx:62-80` (`StripSlot`): a View with a text label (S1..Sn) and a bar; bar and label colour from `tierLineColour(tier)`; 'none', 'neutral' and 'est' render grey. No time text in the slot. The `current` flag is accepted but does not change styling (comment at chips.tsx ~line 55-61).
7. Strip assembly: `app/src/ui/liveView.tsx:86-112` (StripSlotModel, LiveViewModel) and `:149-201` (`viewModelFromEngine`): maps `st.sectors` to slots; done = tier from `tierOf(i+1, scoredS)`, current = `{tier:'none', current:true}`, pending/missed = grey.
8. Render: `app/src/ui/liveView.tsx:268-332` (`LiveSectorPane`), strip row at `:325-327`, `paneStyles.strip` at `:345`. Used by RecordScreen at `app/src/ui/RecordScreen.tsx:1436-1442`. A similar 'strip' row also exists in the feed card: `app/src/ui/activityCard.tsx:103-106` (route cards, sectors from stored rides).
9. Data shape per slot: tier ('none'|'neutral'|'yellow'|'green'|'purple'|'est') + label + optional time. Source is `LiveEngineState.sectors` (`app/src/live/engine.ts:76-84`: pending | current | done{rawS, stoppedS, movingS, interrupted, estimated} | missed{reason}).
10. Sector count: default 4 (`engine.ts:235`, N_SECTORS_DEFAULT); with a reference track it is `gates.length - 1` (engine.ts ~line 290-300).
11. Tier source: `app/src/ui/colourModel.ts:194` (`liveTierFor`) using `sectorValues` / `ghostsFor` (last WINDOW_N=10 ranked rides, colourModel.ts:29, :157). With no history the tier is neutral (grey). Uncertain how often real history exists on Nathan's build (not checked on device).
12. Current sector index: `LiveEngineState.currentSector` (1-based, engine.ts ~line 160), set by the engine; `lastDone` gives the last gate.
13. Live position P: computed in `app/src/ui/RecordScreen.tsx:1234-1238` (`livePos` = `P${selfLivePosition(selfDots, live.chainageM)}`), gated on settings.selfDots, startGateT non-null, no lap yet. Pure function: `app/src/ui/selfRaceModel.ts:393-398` (`1 + count(dot.sM > riderChainageM)`).
14. Self dots: `RecordScreen.tsx:1210-1224` recompute every 250 ms via `selfDotsAt(selfTracks, elapsedMs)` (selfRaceModel.ts:187), using the rider's own past rides as "selfs" (the fastest lap sets the timeline). Elapsed is `Date.now() - live.startGateT*1000`.
15. Display of P: `liveView.tsx:268-300` renders it as text after the context label ("S2 · P3"). posChip (tower chip) is intentionally null during the ride (liveView.tsx:31-33 comment; RecordScreen.tsx:1432-1440).
16. Chainage: `LiveEngineState.chainageM` (engine.ts ~line 170-175), updated on each fix in `engine.ts` feed (emit at ~line 385-397). Data shape: sM per dot, number | null.

## 3. Live data flow and background running
17. Fixes: `app/src/location/index.ts:198` (TaskManager.defineTask at module scope), `:406-413` (`Location.startLocationUpdatesAsync`, accuracy BestForNavigation, timeInterval 1000 ms, distanceInterval 0, foregroundService with notificationTitle 'Recording activity'). Fixes flow into `liveEngine.feed` and storage (`appendFix`).
18. Engine: `app/src/live/engine.ts`, class LiveEngine (line ~241), singleton `liveEngine` (line 606). State via `subscribe(fn)` at engine.ts:452; events via subscribeEvents (459); diagnostics (467). `emit()` is called on every fed fix (~1 Hz, lines ~302-397), plus start/stop/finalize. No timer inside the engine.
19. UI subscription: `RecordScreen.tsx:251` (useState from liveEngine.getState()) and `:384` (`useEffect(() => liveEngine.subscribe(setLive), [])`). So the whole RecordScreen re-renders on each engine emit (about 1 Hz while fixes arrive).
20. Other UI clocks: LapClock `liveView.tsx:208-222` setInterval 100 ms (re-renders only the clock text); RecordScreen `:439` setInterval 1000 ms (now); self-dot tick 250 ms (see 14).
21. Foreground service: expo-location's own service (declared in app.json plugin block `isAndroidForegroundServiceEnabled: true`). `location/index.ts` header (lines 1-25) describes it as working with the screen off, but the header also says "[UNTESTED ON DEVICE]" in places.
22. Module-scope side effects (run even in headless relaunch): ride notification push (`location/index.ts:645`, `liveEngine.subscribe` -> `pushRideNotification`), gate buzz (`location/index.ts:~600-625`), show-over-lock-screen sync.
23. Keep-awake: RecordScreen holds an expo-keep-awake tag while a ride is on (RecordScreen.tsx:19, :134).

## 4. Ride notification (cycle20 check)
24. Verified in code: `app/src/location/rideNotificationPolicy.ts` (pure): body = elapsed clock + optional label. Label rule (~line 46-50): 'finished' if phase finished, else `S${currentSector}`, else none. Format: "m:ss" under one hour, "h:mm:ss" from one hour; separator " · " (RIDE_NOTIFICATION_SEPARATOR).
25. Verified in code: `app/modules/qualifire-ride-notification/android/src/main/java/expo/modules/qualifireridenotification/QualifireRideNotificationModule.kt`: main-looper Handler ticker, once a second (aligned to the second + 20 ms slack); finds expo-location's foreground-service notification by FLAG_FOREGROUND_SERVICE via activeNotifications; rewrites the body with `Notification.Builder.recoverBuilder`; plain colour (COLOR_DEFAULT, setColorized(false)); no large icon; setShowWhen(false); parks after 120 misses. It does not create its own channel or notification; it reuses expo-location's.
26. JS side: `app/src/location/rideNotification.ts` (planner: apply on label change, re-assert every 30 engine ticks, force on foreground). Stop before service stop.
27. Cycle20 files: `cycles/virgin-cycle20/01-notification-consistent-plain-look.md` (plain look, small flame icon only) and `03-notification-body-timer-sector.md` (body = timer plus sector). Code matches both (Kotlin ticker, plain colour, `m:ss · Sn`). Note: the 03 brief still says "Status: brief only. Nothing below is in the app." That line is stale; the code has it. Code wins.
28. Notification content: title from expo-location ('Recording activity' at location/index.ts:412); body is the clock plus S-label or 'finished'. No pace, no position, no sector times, no P.
29. Update cadence: body ticks every 1 s from the native side regardless of fixes; label updates come from engine emits.

## 5. Animation in the live UI
30. Library: React Native core `Animated` only (`Animated.Value`, `timing`, `sequence`, `parallel`, `useNativeDriver: true`). No Reanimated, no Moti, no Lottie, no react-native-svg in package.json.
31. Live-screen uses: sector/lap flash is a state swap, not an animation (liveView.tsx:268-300; FLASH_HOLD_MS 2500 at :116, LAP_HANDOVER_MS 1100 at :121). Flash-message fade: RecordScreen.tsx:604-617 (`flashOpacity` timing, useNativeDriver true), used at :645 and :1448.
32. Launch animation (ring sweep, slash growth): `app/src/ui/launchAnimation.tsx:66-140` using Animated.Value and Animated.timing with Easing; choreography in `launchChoreo.ts`. This is the only ring-like animation in the app. Uncertain whether its ring is drawn with SVG or with View borders (no svg package is listed).
33. Tower climb animation: `app/src/ui/tower.tsx:133-168` (Animated timing, Easing.out cubic).
34. No loop, pulse, breathe or repeating fade exists. Animated.loop is not used in the live UI (grep found none in src).

## 6. Audio and haptics during a ride
35. Haptic: `Vibration.vibrate([0, 100, 70, 100])` once per gate fire (location/index.ts:~618-625, subscribed at module scope; toggle via setEarconsEnabled). Same pattern in DemoScreen.tsx:304 and preview/PreviewScreen.tsx:85.
36. Audio: no audio cue is played. expo-audio is in app.json plugins and package.json, but no import of expo-audio appears under app/src (grep). A comment at location/index.ts:600-601 says earcons are "build 3 (expo-audio); until then the buzz is the whole audio channel." Treat as not implemented.
37. No expo-haptics. No speech/TTS.

## Watch-related facts (none in repo)
38. Grep for wear, watch, garmin, watchconnectivity, complication, wearable, smartwatch, tile across app/, cycles/, STATE.md, IDEAS.md: no watch code or design. The only hits are the idea 4 entry (cycles/virgin-cycle27/00-nathan-ideas.md:65-78), which lists the open question "which watch(es): Wear OS, Apple Watch, Garmin?". Also note IDEAS.md has no watch entry (grep of headings).
39. Platform scope: android only in app.json, so any iOS watch target has no iOS build to hang off.

## Unverified / uncertain
- Whether the foreground service keeps GPS and the native ticker running with the screen off on Nathan's Honor and Samsung devices: the code declares it; not checked on device (location/index.ts header marks parts UNTESTED ON DEVICE).
- Whether the native notification ticker works on every OEM (it depends on expo-location's notification being found by flag); cycle20 says it was built for Honor and Samsung, but device results are not in the repo that I read.
- Whether real tiers (not neutral) show on the strip in practice (depends on ghostsFor history in shipped results); not checked against data.
- Launch ring drawing method (SVG vs View) unconfirmed; no svg dependency listed.
- qualifire-lock-screen module internals and dist/ bundle not read.
- Engine emit cadence assumed ~1 Hz from timeInterval 1000 ms; the OS may deliver fewer fixes.
- Expo / RN version numbers are taken from package.json; not checked against the installed node_modules.
- A grep result on app/ for watch terms also hit a few unrelated words ("wear" in comments about colour, "Garmin" as a map imagery credit in mapCreditModel). Those are not watch features.
