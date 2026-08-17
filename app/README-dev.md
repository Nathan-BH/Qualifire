# Qualifire app — developer setup (for Nathan's PC)

**Status (cycle 005): pipeline VERIFIED on the phone (dev build 944bcc6f +
dev-server loop, 2026-08-14). Phase-1 tracking code now written but UNTESTED
ON DEVICE.** Proven code in `app/`: `core/` (see `core/PARITY.md`) and the
PC→phone pipeline itself. New this cycle: `src/location/` (foreground-service
GPS → storage), `src/ui/` (Record + Rides screens), rewritten `App.tsx`.
Storage (`src/storage/`) is the Backend Dev's module — until it lands,
`npm run tsc` / bundling fails with "Cannot find module '../storage'"
(expected, two importers: `src/location/index.ts`, `src/ui/RidesScreen.tsx`).

## REBUILD REQUIRED? Yes — once (build 2, 2026-08-15).

**Superseding the verdict below.** First on-device START crashed the app:
Android refused expo-location's persisted background job because the manifest
lacked `android.permission.RECEIVE_BOOT_COMPLETED` (our explicit `permissions`
list in app.json omitted it). Manifest = native → new APK. The permission was
added to app.json; rebuild with `npx.cmd eas build -p android --profile
development` and install the new APK over the old one. The verdict below was
right about JS modules but couldn't see this device-OS manifest requirement.

## REBUILD REQUIRED? No. (cycle-005 verdict, superseded above)

Verdict, checked against `node_modules` on this PC: the new code uses only
`expo-location`, `expo-task-manager`, React Native built-ins (`Share`,
`Linking`), and `expo-file-system` — whose native code is **already inside
dev build 944bcc6f** because it is a direct dependency of the `expo` package
(expo@56.0.19 → expo-file-system ~56.0.9, hence autolinked into every build).
It was added to `package.json` as an explicit dependency; run
`npx expo install expo-file-system` once to sync the lockfile (JS-only — no
`eas build` needed). `expo-sharing` was deliberately NOT added (it would
require a rebuild); GPX export uses the Storage Access Framework + the RN
text-share fallback instead. If the Backend Dev's storage needs `expo-sqlite`
or any other new native module, THAT will force a rebuild — not this code.

## What to install on the PC (once, all free)

1. **Node.js LTS** — https://nodejs.org (v22 or newer). This also gives you
   `npm` and `npx`.
2. **Git** — https://git-scm.com (Expo tooling expects it).
3. That's it. No Android Studio needed for the cloud-build path.

## One-time project setup

```
cd "Claude personal projects\Qualifire\app"
npx expo install expo expo-location expo-task-manager expo-status-bar expo-file-system react react-native
```
(`expo install` rewrites the `*` placeholders in package.json to the versions
matching the current Expo SDK — do not pin these by hand.)

Then create a free account at https://expo.dev and build the **development
build APK** in the cloud (free tier: 15 Android builds/month):

```
npm install -g eas-cli
eas login
eas build --platform android --profile development
```

When it finishes, open the download link **on the phone**, install the APK
(Android will ask once to allow installs from that source). This app is a
shell that hosts live-reloading code — you install it rarely, only when
native dependencies change.

## Daily dev loop

1. PC: `npx expo start` (in `app/`).
2. Phone (same WiFi): open the installed Qualifire dev build — it connects to
   the PC and loads the current code.
3. Any file edit on the PC appears on the phone in ~1 s. No cable, no rebuild.

## What is already decided (do not re-litigate in code)

- **Foreground service + persistent notification** for GPS while backgrounded
  — the `expo-location` plugin block in `app.json` adds all Android
  permissions (`FOREGROUND_SERVICE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, …).
  Permission *requests* happen in-app in two steps: while-in-use first, then
  background ("Allow all the time").
- Ask Android to **exempt Qualifire from battery optimisation** on first run;
  OEM battery savers are the main way tracking dies mid-ride.
- Capture raw 1 Hz fixes, store everything, process later (working rule 3).
  The processing is `core/` — imported directly, never reimplemented.
- Earcons (Phase 3) must use **expo-audio**, not expo-av (removed in SDK 55).

## Phase 1 acceptance test (for Nathan, on the phone)

Prereq: storage module landed (`app/src/storage/index.ts`), `npx expo install
expo-file-system` run once, `npx expo start` running on the PC, phone on the
same WiFi with the dev build open.

**First run only — permissions + battery:**
1. Tap **START**. Android asks for location → choose **While using the app**,
   **Precise**. A second screen sends you to app settings → set location to
   **Allow all the time** (this is the background grant; without it, tracking
   dies when the screen goes off).
2. On the Record screen, tap **"Open battery optimisation settings"** → find
   Qualifire → set **Don't optimise / Unrestricted**. One-time; this is the
   main way Android kills tracking mid-ride.

**Every-ride smoke test (do this once at home before a real commute):**
3. Tap **START**. Expect: persistent notification "Qualifire — recording
   ride" appears; elapsed timer runs; within ~5–30 s outdoors the fix counter
   starts climbing at ~1 per second ("GPS live").
4. Screen off, phone in pocket, walk around for 2 minutes. Screen on: the
   counter should have kept climbing (~120 more fixes, not frozen).
5. Swipe the app away from Recents while recording. Notification must stay.
   Reopen the app: it should say "Recovered after relaunch — still
   recording" and keep counting. (If it instead offers "Unfinished ride
   found → Save ride", the service was killed — battery settings from step 2,
   report it.)
6. Tap **STOP**. Expect "Ride saved: N fixes, M:SS" and the notification gone.
7. **Rides** tab → the ride is listed with date, duration, fix count. Tap
   **Export GPX** → pick a folder (Downloads) → "Exported". Copy the .gpx to
   the PC (USB/Drive) and open it — check points are ~1 s apart with no big
   holes, and it loads in the `core/` harness / any GPX viewer.
8. Note battery % before/after a full commute — first battery numbers are
   part of Phase-1 success.

**Live sectors (cycle 006 — check on Monday's real commute):**
9. While recording on a real commute, glance at the phone (mounted or at a
   stop — never in traffic):
   - **Route lock:** within the first ~400 m the dim line under the strip
     flips from "detecting route…" to the track name ("MORNING · route
     locked"; evening rides may take ~200 m past the A/B split).
   - **Sectors fill:** each gate crossing buzzes once (~70 ms) and the strip
     fills one slot; the big chip freezes with that sector's label and moving
     time. The sector being ridden has the accent-bordered slot. Expect
     **warm/neutral chips with NO delta and NO green/purple** — there is no
     benchmark store yet, so every clean sector is neutral by design (D-008
     warm-up / D-021). A dashed grey "~" chip means a GPS gap (estimated —
     recorded, not scored).
   - **Lap chip:** at the finish gate the big chip shows S4, then ~1.1 s
     later a LAP chip appears below it with the lap moving time (neutral, no
     delta). If any sector was estimated the lap chip is dashed "~" too.
   After STOP, export the GPX (step 7) — points must be strictly
   chronological (the F-2 scrambled-tail bug is fixed; a re-export of the
   old 20260815-0024 ride also comes out sorted).
10. **Real map (B-51):** at the rack the Record screen shows real pannable
    streets before START; while moving the map is heading-up, label-free,
    control-free and never larger than the ribbon; at a light it stays tight
    and dims; after FINISH it grows back and labels return; on the board
    VIEW TRACE opens real streets with a Map-data-sources sheet. If while
    moving you can pan, read a road name, or the map outgrows the ribbon —
    FAIL.

Phase 1 is DONE when a real commute produces a clean continuous GPX this way.
Nothing is done until it has run on a real phone on a real ride.

**Known rough edges (accepted for Phase 1):** fix counter shows fixes since
app launch, not since ride start, after a relaunch (disk has everything;
endRide reports the true total). SAF export file name may look odd on some
Android versions (extension handling) — the fallback "share as text" path
caps at ~1 MB (a commute is ~150 KB, fine). expo/expo#47595: don't install
an APK update while a ride is recording. **Dev-client shake menu on a
bike mount:** bar vibration can trip expo-dev-menu's shake gesture,
popping the dev overlay open/closed mid-ride. Before mounting for a ride,
open the dev-launcher's Settings and turn off "Motion Gesture" (shake) —
it's a per-device preference, no rebuild needed, but gets reset if the
dev-client APK is reinstalled. Not an issue on the future standalone
preview APK (D-026/D-029) — no dev menu there at all.

## Testing the timing core on the PC (works today, no install)

```
cd app\core
node --experimental-strip-types harness\parity.ts ..\..\data <path-to-py-csv>
```
See `core/PARITY.md` for the full parity recipe and results.
