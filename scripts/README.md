# scripts/ -- build, update and replay tooling (PowerShell/cmd, run on Nathan's PC)

| File | What it is |
|---|---|
| `build8.ps1`, `build8.cmd` | **The current native build** of "Qualifire Preview" (EAS profile `preview`, installs over the existing app, keeps its data). Its preflight describes the app as it is now: blank seed + the Metro seed redirect (`app/metro.config.js`), the native layer (background location, `app/modules/*`, `withShowWhenLocked`), the repo-root `.easignore` upload archive; then it hands over to `build4.ps1`. `build8.cmd dry` = `-DryRun`. Needed only when the native fingerprint changes; JS-only changes go out with `publish-preview.ps1`. |
| `build4.ps1` | The engine `build8.ps1` calls: node, tsc + tests, native slate, variant, icons, verdict, then `eas-cli` login + build. Not run on its own any more. |
| `publish-preview.ps1`, `publish-preview.cmd` | OTA update for JS-only changes (`eas-cli update --channel preview`); sets `APP_VARIANT=preview` + `EXPO_PUBLIC_SEED_MODE=empty` itself; reaches only an installed APK with the same fingerprint. |
| `publish-play.ps1` | OTA update for JS-only changes to the **Google Play line** (`eas-cli update --channel play --environment production`); clears `APP_VARIANT` (base identity `com.nathanbonher.qualifire`) and sets `EXPO_PUBLIC_SEED_MODE=empty` itself; same preflight as `publish-preview.ps1`. Reaches only Play installs built from the `play` profile (an `.aab`). **That profile is not in `app/eas.json` yet** (backed out 2026-10-05: `eas.json` is part of the fingerprint), so the script's step 0 stops until the native-build cycle restores it; nothing to land on until the first Play upload. Added 2026-10-05, `deployment/rounds/round2/`. No `-Promote` yet (needs `app/fingerprint.config.js`, deferred). |
| `OTA-TROUBLESHOOTING.md` | Fingerprint-mismatch playbook and the known fingerprint of each build. |
| `dev-phone.ps1`, `dev-phone.cmd` | Phone dev loop: starts the Metro/Expo dev server in `app/` for the installed dev-client (Fast Refresh, no build). `shipped` / `-Shipped` switches to the Leuven seed. |
| `gatefield-replay.ps1`, `gatefield-replay.cmd` | Runs the offline gate-field replay tool (`data/analysis/10_gatefield_replay.py`) from a double-clickable entry point. |
| `spike-maplibre.ps1` | One-off spike script for the MapLibre integration investigation (`product/superseded/MAPLIBRE-SPIKE.md`). |
| `recolour-icon.py` | Recolours the yellow gate-stroke of the two wired launcher PNGs (`app/assets/icon.png`, `adaptive-icon.png`) in place, three-colour barycentric decomposition so ring/ground edges stay clean. `--check` reports without writing. |
| `legacy/` | Builds 3, 5, 6, 7 -- history only, not runnable (see `legacy/README.md`). |

Copy-paste (full paths, as always on this PC):

```
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\build8.ps1" -DryRun
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\build8.ps1"
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-preview.ps1" -DryRun
```

Read by: whoever is doing a build, an OTA publish or a data-analysis replay pass -- these
are the PC-side entry points the app's own `README-dev.md` and the cycle runbooks point to.
Lineage: build3 -> build4 (engine) -> build5/6/7 wrappers (now `legacy/`) -> build8.
