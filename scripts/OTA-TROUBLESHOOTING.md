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
  fingerprint policy doing its job. Clone `build6.ps1` → `build7.ps1`,
  run it (costs one EAS build slot), install the new APK; OTA publishing
  then works against the new build.

## Other gotchas seen on this machine

- Bare `npx ...` in PowerShell fails with "running scripts is disabled" —
  always go through `powershell -ExecutionPolicy Bypass ...` or use the
  `.cmd` launchers.
- Only builds >= 6 carry the updater; the build-5 APK never receives
  updates.
- "No environment variables ... found for the preview environment on EAS"
  during publish is NORMAL here (we define no server-side env vars) — it
  is not an error and not related to APP_VARIANT.
