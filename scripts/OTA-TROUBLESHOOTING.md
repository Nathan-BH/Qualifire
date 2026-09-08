# OTA publish troubleshooting — "my update didn't land on the phone"

The normal loop: run `publish-preview.cmd` (or
`powershell -ExecutionPolicy Bypass -File .\publish-preview.ps1 -Message "what changed"`),
then on the phone close Qualifire Preview FULLY and open it **twice** —
launch 1 downloads the update, launch 2 applies it. Judge nothing before
the second launch.

If after two full launches the phone still shows old JS, the update was
almost certainly **silently skipped** (fingerprint policy never crashes,
it just ignores updates whose runtime doesn't match the installed build).
Diagnose in this order, from `app\`:

## 1. What runtime did the publish carry?

    powershell -ExecutionPolicy Bypass -Command "cd 'C:\Users\natha\Claude personal projects\Qualifire\app'; npx eas-cli update:list --limit 3"

Note the **Runtime Version** hash of the newest update on branch `preview`.

## 2. What fingerprint does the installed build have?

    powershell -ExecutionPolicy Bypass -Command "cd 'C:\Users\natha\Claude personal projects\Qualifire\app'; npx eas-cli build:list --limit 3 --platform android"

Note the **Fingerprint** of the newest finished `preview` build (the one
actually installed on the phone). If the two hashes match, the OTA side is
fine — recheck the two-launch dance and that the phone has network.

## 3. If they differ: what exactly moved?

    powershell -ExecutionPolicy Bypass -Command "cd 'C:\Users\natha\Claude personal projects\Qualifire\app'; npx eas-cli fingerprint:compare <BUILD_FINGERPRINT_HASH>"

The diff names the exact files/config keys that changed. Read it before
doing anything else:

- **Diff shows `name` / `package` flipping between "Qualifire" and
  "Qualifire Preview"** → APP_VARIANT wasn't set during the publish.
  This is the bug from 2026-08-27: `app.config.js` switches app identity
  on `APP_VARIANT=preview`; the build profile sets it but a local
  `eas update` doesn't (and `--environment preview` does NOT set it — that
  flag only pulls EAS server-side env vars). `publish-preview.ps1` sets
  `$env:APP_VARIANT = 'preview'` since that date; if publishing by hand,
  set it yourself first. **No rebuild needed** — fix the env var, publish
  again.

- **Diff shows a real native change** (new dependency in package.json, an
  app.json/app.config.js plugin or permission, SDK bump) → this is the
  fingerprint policy doing its job. Clone the highest-numbered
  `scripts/buildN.ps1` to `build(N+1).ps1` (as of 2026-09-08 that is
  `build7.ps1` → `build8.ps1`; build 7 was itself the build-6 → build-7
  fingerprint re-anchor), run it (costs one EAS build slot), install the
  new APK, then record the new fingerprint in the section below; OTA
  publishing then works against the new build.

## Known fingerprints by build

- **Build 6** — fingerprint `251ddb86909e5bf8a0ac4842436fdfe64ce8b599`.
  **Superseded** — do not use for `fingerprint:compare`. It drifted from
  the tree (package-lock.json expo-updates 56.0.24 → 56.0.25 plus
  virgin's app.config.js / eas.json additions), which silently blocked
  OTA publishing until build 7.
- **Build 7** (commit `03710eb`, the re-anchor build; the currently
  installed preview APK and the build `publish-preview.ps1` targets) —
  fingerprint `cc04b4582bf8d69ff768b7e897f786c7a1862e7f`. Confirmed
  2026-09-08 via `eas-cli build:list --platform android --build-profile
  preview --limit 1` (build id `223985de-67e1-4c28-99d1-a13b26765f49`);
  matches the app's Runtime Version, as expected under
  `runtimeVersion.policy: "fingerprint"`. This is the value to use for
  `fingerprint:compare` while build 7 remains the installed Preview APK.

## Other gotchas seen on this machine

- Bare `npx ...` in PowerShell fails with "running scripts is disabled" —
  always go through `powershell -ExecutionPolicy Bypass ...` or use the
  `.cmd` launchers.
- Only builds >= 6 carry the updater; the build-5 APK never receives
  updates.
- "No environment variables ... found for the preview environment on EAS"
  during publish is NORMAL here (we define no server-side env vars) — it
  is not an error and not related to APP_VARIANT.
