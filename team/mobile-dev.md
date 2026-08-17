# Mobile Developer

**Status:** ACTIVE — woken by Nathan, cycle 002
**Reports to:** Team Principal

---

## Character

Has shipped location-tracking apps and knows the gap between "getting a GPS fix" and "getting a clean continuous trace for a 25-minute ride with the phone in a jacket pocket". Unimpressed by architecture diagrams; impressed by things that survive a cold morning with battery saver on.

## Remit

- Tech stack choice and justification.
- The app itself: screens, state, navigation.
- Location capture: permissions, foreground and background tracking, battery behaviour.
- Map integration.
- On-device storage.

## Working rules

1. **Getting a location is easy; keeping one is hard.** The real work is background execution limits, OS battery optimisation killing the task, GPS drift, and urban canyons. Plan for the trace to be imperfect.
2. **Android needs a foreground service with a persistent notification** to track while backgrounded. iOS has its own background-location constraints. Neither is optional. `[UNVERIFIED — confirm against current SDK docs when activated]`
3. **Capture raw, process later.** Store the full trace as recorded. Never let a display decision destroy source data — the timing model will change many times, and old rides must be re-analysable under new rules.
4. **One user means no backend is needed on day one.** Resist building sync, accounts or a server until there is a reason. On-device storage plus an export is enough.
5. **Battery is a product feature.** An app that costs 20% of a phone's battery on the commute gets deleted, no matter how good the mechanic is.
6. **Nothing is done until it has run on a real phone on a real ride.**

## Provisional positions (unvalidated)

- React Native / Expo with `expo-location` + `expo-task-manager`; `react-native-background-geolocation` as the heavier-duty fallback if Expo's background reliability disappoints. `[UNVERIFIED]`
- MapLibre + OpenStreetMap for the map — free, open, no vendor lock-in. Mapbox and Google free tiers are also ample at one user, so this is reversible.
- Requires a real trace from Nathan's actual commute before committing to anything. That single artifact is worth more than a week of planning.

## Log

### Setup — 2026-08-14 (pre-cycle; not a numbered cycle)
- Role created, dormant. No work performed.

### Cycle 002 — 2026-08-14
- B-08: wrote `product/BUILD-PIPELINE.md` (UNBUILT plan) — stack confirmed as Expo *dev-build* workflow + expo-location/task-manager + MapLibre; Expo Go explicitly ruled out for GPS (no foreground services on Android).
- Resolved my working-rule 2 `[UNVERIFIED]` flag: Android foreground service + persistent notification for background GPS confirmed against Expo SDK 56 docs (May 2026); config plugin adds FOREGROUND_SERVICE/FOREGROUND_SERVICE_LOCATION/ACCESS_BACKGROUND_LOCATION. Known 2026 wart logged: expo/expo #47595 (FGS freeze after app update mid-tracking).
- Verified $0 pipeline: EAS free tier 15 Android builds/mo (Expo billing docs 2026); sideloaded APK, no Play Store, no FGS review. Transistorsoft fallback demoted — paid Android release license `[UNVERIFIED terms]` would break $0.
- Sources: docs.expo.dev/versions/latest/sdk/location, docs.expo.dev/billing/plans, github.com/expo/expo/issues/47595, github.com/maplibre/maplibre-react-native + maplibre.org/maplibre-react-native/docs/setup/expo.

### Cycle 003 — 2026-08-14
- B-18: wrote `product/PRIOR-ART.md` (reuse-scoped survey, web-verified). Key finding: Strava's own docs admit segment endpoints snap to nearest GPS fix with no interpolation — D-011's gate interpolation is literally the fix users have begged Strava for; and Strava Live Segments' continuous ahead/behind chase-delta is the exact thing D-006 bans, so our differentiator is *withholding*, not adding.
- Library slate for Phase 0/app settled (pending Principal sign-off): @tmcw/togeojson (GPX→GeoJSON), turf 7.3.5 offline, cheap-ruler v4 (Jun 2026) in the 1 Hz live loop (~72× faster pointOnLine). Map-matching engines rejected — server-scale, violates D-002; D-011 projection replaces them.
- Audio stack correction caught in time: expo-av is REMOVED in SDK 55 — earcons must target expo-audio (+ staysActiveInBackground) with expo-haptics as reinforcement. Screen-off playback during FGS and audio ducking `[UNVERIFIED — Phase 3 real-ride test]`.
- Study-only repos flagged (Java/Elixir, not importable): OpenTracks (Apache-2.0, FGS recording pipeline + WGS84/EGM2008 elevation trap), FitoTrack (GPLv3, in-workout voice announcements), OpenPace (GPL-3.0, Strava archive ZIP ingestion — same artifact as our `data/` ZIP).

### Cycle 004 — 2026-08-14
- Phase 1 first code: `app/core/` — the TS timing engine (GPX parse, D-011 projection, gate crossing + interpolation, moving time, sector timing, live detector with D-016 amendments), zero runtime deps. **Parity PROVEN in `app/core/PARITY.md`: 500/500 ride-sector rows vs the Python pipeline, 0 flag mismatches, max |Δ| = 0 at 1 µs precision on all gate/raw/stopped/moving times**; live sim reproduces RESULTS §6 exactly (same 3 misses, 0 double-fires).
- Finding vs D-016(a): the "excursion+rejoin" ride 20260521-1056 is actually a **237 s recording gap rejoining 1462 m downstream** — a fixed 400 m re-acq bound provably fixes nothing (measured). Implemented time-aware bound `max(400 m, 15 m/s × outage duration)`, forward-only: 0 clean-ride hard misses, gap-crossed gates fire "estimated" per D-013. Needs RE/Principal ratification.
- Library slate revision: togeojson dropped from core (sandbox npm registry 403'd everything, and mirroring `01_parse.py`'s parser point-for-point is what makes parity byte-exact); cheap-ruler/turf unnecessary (O(window) segment search on an equirectangular frame, ~µs per fix). Core is dependency-free; slate items stay available for future import UI.
- `app/` scaffold (UNBUILT, config-only, never run): app.json with expo-location FGS plugin + full Android permission set, eas.json (dev/preview APK profiles), placeholder App.tsx, README-dev.md with Nathan's exact PC setup + dev loop. Version pins deliberately left to `npx expo install`.
- Untested/deferred: tsc typecheck (no npm in sandbox — run `npm run typecheck` on the PC), live-vs-offline stop-detection lag (documented in core/README.md, benign given zero-stop gate zones).

### Cycle 005 — 2026-08-14
- B-24 Phase-1 tracking code written (ALL UNTESTED ON DEVICE): `app/src/location/` (defineTask at module scope for headless relaunch, two-step permission flow, FGS watch at timeInterval 1000 / distanceInterval 0 per RE finding, per-fix funnel to the storage contract with error counting), `app/src/location/session.ts` marker file for relaunch recovery, `app/src/ui/` Record + Rides screens, App.tsx rewritten (side-effect import of the location module so the task exists in headless launches).
- **Rebuild verdict: NO rebuild needed.** Verified against Nathan's real node_modules (mounted): expo@56.0.19 directly depends on expo-file-system ~56.0.9, so its native code is already autolinked into dev build 944bcc6f; added it to package.json (`npx expo install expo-file-system` syncs the lockfile, JS-only). expo-sharing is NOT installed and was deliberately avoided — GPX export = SAF save-to-folder with RN `Share.share` text fallback (~1 MB intent cap noted; a commute is ~150 KB).
- API surfaces verified against installed typings, not memory: expo-location Location.d.ts/Location.types.d.ts (startLocationUpdatesAsync options, LocationObjectCoords nullability), expo-task-manager TaskManagerTaskBody, expo-file-system legacy SAF discriminated union (`granted:true → directoryUri`). Battery-optimisation screen opened via RN `Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS')` with openSettings fallback — no new module.
- Known honest gaps: tsc fails until Backend Dev lands `app/src/storage/index.ts` (two importers, per contract — not implemented by me); post-relaunch fix counter shows fixes-since-launch only (disk is complete; endRide reports truth); SAF file-extension behaviour and the whole FGS/kill/recovery path need the on-phone script now in README-dev.md ("Phase 1 acceptance test", 8 steps incl. battery exemption).
- Flag for Principal: if Backend storage picks expo-sqlite (or any native module beyond expo's transitive tree), THAT forces the rebuild my code avoided — decide before Nathan's next `eas build` spend (14 free builds left).

### Cycle 006 — 2026-08-15
- Live sectors wired end to end (ALL UNTESTED ON DEVICE, headless-verified): `app/src/live/engine.ts` (session-side wrapper over app/core — all-3-candidate route auto-lock at ≥400 m advance / ≥200 m margin, live gate events + offline parity recompute for displayed times, D-013/D-016(b) honesty, D-023 in-memory only) + `app/src/live/refs.ts` (runtime refs read from QA's `app/tests/fixtures/refs.json`); fixes fed from `app/src/location/index.ts` after the raw append, engine errors swallowed; module-scope subscriber fires the D-019 buzz (Vibration, 70 ms) per gate incl. estimated.
- UI: `app/src/ui/chips.tsx` (shared tier-chip language) + new `app/src/ui/liveView.tsx` (LiveEngineState → view model + `LiveSectorPane`); `RecordScreen.tsx` now renders the real engine feed while recording (big frozen chip, strip with current-sector cue, route-lock status line, LAP chip delayed ~1.1 s per LAYOUT §2a; elapsed demoted to a small clock). Preview tab renders its scripted demo states through the SAME pane — one render path, data-only scripts. No benchmark store yet ⇒ every clean sector/lap neutral, deltas blank (D-021).
- **F-2 root-caused and fixed** (real export qualifire-20260815-0024.gpx, 17-line scrambled block then order resumes): NOT a segment merge — `appendFix` in `app/src/storage/core.ts` is invoked concurrently by the burst of queued location events after a mid-ride JS relaunch; every call took the slow `!live.has` crash-recovery read-back branch and appends landed in promise-resolution order. Fix: per-ride append chain (file order == call order; endRide drains it) + `gpxExport.ts` now emits fixes stably sorted by tUnixMs (old scrambled ride re-exports clean). JSONL format untouched (D-023). Race reproduced and fix verified headless (17-wide concurrent burst → chronological).
- Verified: `npx tsc --noEmit` exit 0; QA suite 44 tests = 41 pass / 0 fail / 3 benign skips (unchanged). README-dev.md acceptance script gained step 9 (Monday live-sector checks: route lock, sectors fill, lap chip, neutral-by-design).

### Cycle 007 — 2026-08-15
- Live v2 + board v2 + timing tower per Nathan's rulings (B-29/B-30; ALL UNTESTED ON DEVICE). `src/ui/liveView.tsx` rewritten: big slot = ticking LAP clock (whole-ride elapsed, m:ss.d @ 10 Hz, ink, never tier-coloured) driven by a piecewise `Timebase` {anchorReal, anchorClock, rate} — real ride = one rate-1 segment anchored at recording start; gate flashes MASK the clock ~2.5 s in earned tier colour (estimated = grey/dashed, interrupted = tier + ‖), clock runs underneath and reappears honest; LAP result terminal at handover + static tower-position chip. Sector blocks now carry frozen m:ss times (`chips.tsx` StripSlot + new PosChip).
- Demo = accelerated emulation, one render path kept: `preview/data.ts` gains per-scenario `clockGatesS` (cumulative clock at each gate incl. start-offset/stops) + `demoClockAt()` — PreviewScreen re-anchors the SAME timebase at each scripted gate (~70×, 13 s ≈ 15-min lap); per-scenario tower rows + positions (mixed P2, ordinary P11/19 pre-scrolled past clipped-P1, purple P1 pole, scrappy unranked NO TIME, quiet green P4) + `posChip` + `todaySub`; `sotd`/`elapsed` fields deleted.
- New `src/ui/tower.tsx` (anatomy+motion only): P#·tier-coloured time·gap-to-P1·date rows, today ~1.5× + accent bar + sub-line, ghost ○ (D-018), PB ●, ≤8 visible with TODAY-always-on-screen windowing; slot-in = bottom→rank 700 ms ease-out + 200 ms arrival fade, plays exactly once (`justFinished` + internal ref + caller clears on manual nav). Board v2 in PreviewScreen: tower headline (LapBoardChip deleted) → sector rows → quarantined ideal lap → quali card LAST; SECTOR OF THE DAY removed; ceremony collapses tower to today's all-purple unranked row (§3a.3).
- Scope honesty: real tower population needs B-28 (benchmark/ride-history store — unbuilt). New `src/live/towerSource.ts` stub returns null, so the REAL RecordScreen renders no position chip (never a fake rank); RecordScreen now feeds the pane `realTimebase(session.startedAtMs)` and dropped its redundant small elapsed clock. `app/src/live/engine.ts` untouched; app/tests untouched. Verified: `npx tsc --noEmit` exit 0; suite 63 = 60 pass / 0 fail / 3 skip. Untested on device: 10 Hz clock jank/battery, flash hold feel, slot-in timing, sunlight legibility.

### Cycle 011 — 2026-08-17
- MapLibre feasibility spike written to `product/MAPLIBRE-SPIKE.md` — **nothing installed, `package.json`/`app.json`/`eas.json` untouched** per Nathan's ruling. Verdict **GO-WITH-CONDITIONS**, none met today, so it does not enter the next build. Version I'd install is `@maplibre/maplibre-react-native@11.3.6` (MIT); its own devDeps pin `expo 56.0.8` / `react-native 0.85.3` / `react 19.2.3` — our exact combination — and v11's new-arch-only requirement is satisfied because SDK 55+ removed the legacy arch. Build diff is one dep + one plugin string; **no new Android permissions, no Gradle edits, keystore/applicationId unaffected**.
- Tiles resolved against the offline-in-Belgium constraint: **local PMTiles corridor extract** (ODbL, €0, `pmtiles://file://`, supported since MapLibre Native Android 11.7.0 and we'd get 13.2.0). Stadia's free tier is ruled out for offline outright (ToS bars bulk caching); OpenFreeMap/MapTiler are online-only picks. Trap recorded: `pmtiles://asset://` is unsupported, so the archive must be copied to `filesDir` at first run — UNBUILT work, not a config line.
- Battery is the gating unknown, not a blocker I can settle headless: **+2 to +5 pp over a 25-min commute [ESTIMATE]**, settled only by two back-to-back commutes PNG-vs-MapLibre read as a *difference* through Battery Historian. Second real cost named: adding a native module permanently costs Fast Refresh on the map layer.
- Migration mapped precisely against `routeMapMath.ts`: `projectToPixel()` + `cropFor()` are replaced by the camera; `offRouteM()` and `positionAtTime()` survive unchanged; the PNG stays as a third rung on the existing degradation ladder. The cycle-009 grey context layer becomes **redundant, not an overlay** — already the Designer's ruling in `08_build_route_assets.py` (44–49). Noted factually: no `*-base.png` crop exists in `app/assets/routes/` yet, so the shipped PNGs are still the context-ride version. Also flagged: the pre-rendered PNG **cannot** serve a planned route to somewhere never ridden — that idea is the first genuine argument for MapLibre.
