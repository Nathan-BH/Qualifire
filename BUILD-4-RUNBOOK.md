# Build 4 -- PowerShell runbook

Build 3 shipped the *native* slate. Build 4 ships the *JavaScript* that has
landed since. There is nothing new to install and nothing new to configure --
one script does the checks and spends the build.

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
.\build4.ps1 -DryRun     # every check, spends nothing
.\build4.ps1             # every check, then the build (~10-20 min)
```

Costs no Claude tokens; it runs on Expo's servers (EAS), 15 free Android builds
a month.

---

## 1. What this build changes on the phone

The preview APK froze its JS at build time, which is why the app you installed
after build 3 still shows the old three-tab surface. Everything below already
exists in the codebase and is proven by `tsc` and 93 tests -- build 4 only bakes
it into the standalone APK.

- **Six tabs** instead of three: RECORD, RIDES, ROUTES, RESULT, SETTINGS, DEMO.
  The bar scrolls sideways, because six labels do not fit at a readable size.
- **The live route map.** A pre-rendered PNG per ratified route with the five
  measured gates drawn on it and your dot placed on top. Each gate fills with
  the colour its sector earned as you cross it.
- **The D-030 colour model, settled.** Purple beats every ghost in the window,
  green is above the recent average, yellow is an ordinary lap. The old
  model-picker row in Settings is gone -- there is one model now.
- **The ghost tower and the live position chip.** The tower is populated from
  the seeded ghost archive and your live lap is ranked among those ghosts.
  Build 3's null stub is retired.
- **Settings persist.** Written to `settings.json` and restored on launch, so a
  restart no longer resets your toggles.
- **The corrected launcher icon** -- measured off the brand logo (ring 309 px
  of 512, 34 px stroke; the slash is a Q's tail, not a bar through the mark).
  The same corrected mark is on the Record screen.
- **Result tab from a real ride.** STOP hands the finished state to the Result
  tab; it falls back to a clearly labelled ghost if no ride has finished yet.
- **A buzz on every gate fire**, respecting the Settings toggle.
- **Landmark and destination pills** on the idle Record screen, from the
  ratified catalog, plus the ghost count for the locked route.
- **The DEMO tab** replays an archived Morning lap at 25x through the *same*
  pane and map the Record screen uses. This is the fastest way to see the
  colours, the buzz and the map without waiting for a commute.

## 2. What it does NOT change

- **No new native modules.** `expo-audio` and `react-native-safe-area-context`
  went in with build 3 and are unchanged. Nothing else was added.
- **No new permissions.** The Android permission list in `app.json` is
  identical to build 3.
- **Same app id** (`com.nathanbonher.qualifire.preview`), so this installs
  *over* the existing preview app and **its data survives**. You still end up
  with two icons: the dev client and the preview.
- **The dev client is untouched.** Fast Refresh against `npx expo start` keeps
  working exactly as before.
- **Still no tier tones.** `expo-audio` is installed but there are no audio
  assets, so gates buzz and stay silent rather than pretending. B-27 (audibility
  in wind) is untouched by this build.
- **The bottom nav-bar padding is still the hardcoded 48 dp stopgap.**
  `react-native-safe-area-context` is installed but `App.tsx` has not been
  switched to `useSafeAreaInsets()` yet, so edge-to-edge behaves as before.
- **The start pick is cosmetic.** Choosing a landmark or destination does not
  yet constrain route matching -- the ridden road still wins.
- **The tower shows seeded ghosts, not your own history yet.** Ranking is real,
  the archive behind it is the seed.

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
| `-DryRun` | Runs sections 1-6 and stops at the boundary. Never queues a build. |
| `-SkipTests` | Skips `tsc` and the suite. Only if you just ran them yourself. |
| `-NoWait` | Queues the build and hands the shell back; check with `npx eas-cli build:list`. |
| `-Force` | Builds despite preflight problems. Last resort. |
| `-BuildProfile development` | Rebuilds the **dev client** instead. Not what build 4 is for. |

**What a good preflight looks like:** `tsc` prints nothing, and the suite prints
`93 tests: 90 pass, 0 fail, 3 skip`. Then six OK lines for the native slate, the
preview variant, both icons, and the three routes (Morning, EveningA, EveningB).

The build itself streams to the console and prints a URL at the end. Ctrl-C in
PowerShell does **not** cancel a build that is already on Expo's servers.

## 4. The keystore prompt

EAS may ask about the Android signing key:

> Generate a new Android Keystore?

**Answer: no -- REUSE the existing keystore.** If it offers a list instead, pick
the keystore already associated with `com.nathanbonher.qualifire.preview`
(created for build 3).

Why it matters: Android refuses to install an APK over an existing app signed
with a different key. A fresh keystore means a `INSTALL_FAILED_UPDATE_INCOMPATIBLE`
signature-mismatch error, and the only way out is uninstalling the current
preview app -- which throws away every ride it has recorded.

If you have already generated a new one by mistake, do **not** uninstall in a
hurry: export your rides first from the RIDES tab (Export GPX) while the old app
is still installed.

## 5. On-device checklist -- what is NEW since build 3

Install: open the printed link on the phone, tap the APK, accept the
"unknown sources" prompt once. It replaces the previous *Qualifire Preview*
icon, not the dev client.

**Two minutes, no commute needed:**

1. The launcher icon is the corrected mark -- ring with a Q tail, not a bar
   straight through it. Both icons are still present (dev client + preview).
2. Six tabs at the bottom: RECORD, RIDES, ROUTES, RESULT, SETTINGS, DEMO. The
   bar scrolls sideways; every label is readable without squinting.
3. DEMO tab -> the archived Morning lap replays at 25x. Watch for: the ticking
   lap clock, gates on the map filling with colour as they pass, the tier flash
   holding ~2.5 s, the tower slotting in, and a buzz at each gate.
4. SETTINGS -> flip every toggle (start mode, tower, live map, earcons, red
   light). Force-stop the app from Android settings, reopen it: **the toggles
   must still be where you left them.** That is the persistence check, and a
   plain background/foreground does not test it.
5. SETTINGS has **no colour-model row** -- D-030 settled it to one model.
6. ROUTES tab -> each of the three routes draws with its five gates.
7. RECORD idle -> landmark and destination pills appear, with the ghost count
   for the locked route.

**On the commute:**

8. Route locks ~400 m in; the map switches to the right route and your dot
   tracks the line rather than drifting off it.
9. Gate crossings: one buzz, checkpoint time flashes, the gate on the map takes
   the colour that sector earned. Colours must be purple / green / yellow only.
10. The position chip shows a rank against the ghosts -- and shows **nothing**
    rather than a made-up number when the lap is estimated or the route unknown.
11. STOP -> the RESULT tab shows *that* ride, not a labelled ghost.
12. Screen off for a few minutes mid-ride: the trace stays continuous, and the
    live surface is still correct when you wake it.
13. Note battery percentage before and after -- still an open question.

## 6. If it goes wrong

- **Preflight fails.** Nothing was spent. Fix what it printed and rerun; it is
  read-only up to the verdict line.
- **Build fails in the cloud.** The log link points at the failing step. With no
  dependency change since build 3, a Gradle failure here is unusual -- suspect a
  stale `node_modules` and rerun `npx expo install --check` in `app/`.
- **Installs but crashes on launch.** Almost always a native module in the JS
  bundle that is not in the binary. Nothing new was added, so check that nothing
  crept into `package.json` since build 3.
- **"App not installed" / signature mismatch.** The keystore was regenerated.
  See section 4.
- **Still the old surface after installing.** You opened the dev client, not
  *Qualifire Preview*. They are two separate apps with two separate icons.
