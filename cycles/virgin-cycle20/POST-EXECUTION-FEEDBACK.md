# Cycle 20 post-execution feedback: build 8 (2026-10-03)

Source: `scripts\build8.ps1` run on Nathan's PC, preview APK, build 880cd0d7-9159-414b-84f2-3cbf4bb960e0.
Kept here for future reference. Not a brief; nothing in this file is an instruction to execute.

## Outcome
- Build 8 succeeded: tsc clean, 852 tests (849 pass, 0 fail, 3 skip), blank seed, native layer and upload archive all OK.
- Upload 5.2 MB compressed (estimate was 8,0 MB uncompressed). Existing keystore reused (Build Credentials rGGsc_sDxY).
- Installs OVER the old Qualifire Preview (com.nathanbonher.qualifire.preview) and keeps its data.

## Things to be aware of
1. **Working tree was NOT clean at build time.** The APK froze all uncommitted changes. Commit what went into the build so the phone's code can be identified later.
2. **Record the new fingerprint** in `scripts\OTA-TROUBLESHOOTING.md` ("Known fingerprints by build"), taken from `eas-cli build:list --platform android --build-profile preview --limit 1`. runtimeVersion policy is fingerprint, so OTA reaches this APK only while the fingerprint matches (build 6 failed an OTA publish through fingerprint drift). After installing, publish a trivial OTA to confirm it arrives.
3. **Commit `package-lock.json`** if step A changed it (this run: "up to date", so probably unchanged).
4. **Existing data survives the install.** The blank seed (EXPO_PUBLIC_SEED_MODE=empty) only shows on a fresh install. To test the blank-catalog experience, use another device or uninstall first (this wipes the data).
5. **3 skipped tests** out of 852: confirm they are intentional skips.
6. **Login oddity:** log said "not logged in -- opening login", then "already logged in as nahtanhb". Harmless; login completed.
7. **EAS "preview" environment has no variables.** APP_VARIANT and EXPO_PUBLIC_SEED_MODE came from the eas.json build profile and loaded fine.
8. Emulator prompt answered no; install is via the build page link or QR on the phone.

## Checks that passed (for reference)
expo-updates ~56.0.24 installed; updates.url set; preview channel; seed redirect + stubs + pin tests present; expo-location / expo-task-manager; withShowWhenLocked plugin; qualifire-lock-screen and qualifire-ride-notification local modules; .easignore order (.git, /*, !/app) and no app\.easignore; MapLibre 11.3.6 with OpenFreeMap tiles; icons present; node v24.19.0.

## Fingerprint (added 2026-10-04)
From `eas-cli build:list --limit 3 --platform android`:
- Build ID: 880cd0d7-9159-414b-84f2-3cbf4bb960e0 (preview, internal, channel preview, finished)
- Fingerprint / Runtime Version: f52e438f6e11965500739e4371c4e020d8ec69e5
- Commit recorded by EAS: e50c773ad883254e60c94bd762ce042bc1970662 (the working tree was dirty, so the APK may contain more than this commit)
- SDK 56.0.0, version 0.1.0, version code 1
- Started 03/10/2026 22:38:36, finished 22:47:13
- Still to do: add this fingerprint to `scripts\OTA-TROUBLESHOOTING.md` (Known fingerprints by build, build 8).
