# virgin-cycle20 — scripts to run (build 8 + updates)

Written 2026-10-03. Cycle 20 is committed on branch `virgin` (commit `5f31523`).
Every block below is self-contained: paste it as-is into PowerShell.

## Why a new build (build 8) is needed

Three briefs change compiled native code / native config, which an OTA update cannot carry:

| Brief | Native change |
|---|---|
| 01 notification colour/icon | `QualifireRideNotificationModule.kt` (no colorize, no large icon), `res/raw/keep.xml`, deleted `drawable-nodpi/qualifire_flame_large.png` |
| 03 notification body timer | `QualifireRideNotificationModule.kt`: native 1 Hz ticker + `stop()` |
| 05 ride -> activity wording | `app.json` iOS `locationAlwaysAndWhenInUsePermission` string |

All other briefs (02, 04, 06, 07, 08, 09, 10, 11, 12) are JS-only, but the tree now has a
different native fingerprint than build 7, so an OTA published from it will NOT reach build 7.
So: ship everything as ONE build 8. Do not publish an OTA before build 8 is installed.

## 1. Preflight (spends nothing)

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
powershell -ExecutionPolicy Bypass -File .\build8.ps1 -DryRun
```

(Double-click alternative: `build8.cmd dry`.) After cycle 19 landed (2026-10-03) `build8.ps1` was rewritten by cycle 19: the preflight now
checks steps A-G (update config, blank seed + Metro seed stubs, native layer incl. the two local
modules and `withShowWhenLocked`, `.easignore` upload archive ~8 MB, working tree, then the
`build4.ps1` engine). The commands below are unchanged. Builds 5-7 moved to `scripts/legacy/`.

## 2. Build the APK (npm install, tests, EAS build ~10-20 min, one EAS build slot)

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
powershell -ExecutionPolicy Bypass -File .\build8.ps1
```

Reuse the existing keystore when asked (same as build 7), so the APK installs over
Qualifire Preview. Install it on the phone(s); ride recordings and stored results are kept.

## 3. After the build

Find the new fingerprint (shown on the EAS build page), then:

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\app"
powershell -ExecutionPolicy Bypass -Command "npx.cmd eas-cli build:list --limit 3 --platform android"
```

Write that fingerprint into `scripts\OTA-TROUBLESHOOTING.md` ("Known fingerprints by build").
If `app\package-lock.json` changed during `npm install`, commit it:

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire"
git status --short
git add app/package-lock.json scripts/OTA-TROUBLESHOOTING.md
git commit -m "build 8 baseline: record fingerprint, lock file"
```

## 4. Later JS-only fixes: OTA (only AFTER build 8 is installed)

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
powershell -ExecutionPolicy Bypass -File .\publish-preview.ps1 -DryRun
```

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
powershell -ExecutionPolicy Bypass -File .\publish-preview.ps1 -Message "what changed"
```

Then on the phone: close Qualifire Preview fully and open it TWICE (launch 1 downloads,
launch 2 applies). Commit first — the publish bundles the working tree.

## 5. If an OTA does not land (diagnose in this order)

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\app"
powershell -ExecutionPolicy Bypass -Command "npx.cmd eas-cli update:list --limit 3"
```

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\app"
powershell -ExecutionPolicy Bypass -Command "npx.cmd eas-cli build:list --limit 3 --platform android"
```

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\app"
powershell -ExecutionPolicy Bypass -Command "npx.cmd eas-cli fingerprint:compare <BUILD_FINGERPRINT_HASH>"
```

Full guide: `scripts\OTA-TROUBLESHOOTING.md`.

## 6. Local checks (optional, same as the cycle's acceptance)

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\app"
node --experimental-strip-types tests/run.ts
```

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\app"
powershell -ExecutionPolicy Bypass -File .\node_modules\.bin\tsc.ps1 --noEmit
```

Expected: 838 tests, 835 pass, 0 fail, 3 skip; tsc exit 0.
