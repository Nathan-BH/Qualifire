# scripts/ -- build, update and replay tooling (PowerShell/cmd, run on Nathan's PC)

| File | What it is |
|---|---|
| `build8.ps1`, `build8.cmd` | **The current native build** of "Qualifire Preview" (EAS profile `preview`, installs over the existing app, keeps its data). Its preflight describes the app as it is now: blank seed + the Metro seed redirect (`app/metro.config.js`), the native layer (background location, `app/modules/*`, `withShowWhenLocked`), the repo-root `.easignore` upload archive; then it hands over to `build4.ps1`. `build8.cmd dry` = `-DryRun`. Needed only when the native fingerprint changes; JS-only changes go out with `publish-preview.ps1`. |
| `build4.ps1` | The engine `build8.ps1` calls: node, tsc + tests, native slate, variant, icons, verdict, then `eas-cli` login + build. Not run on its own any more. |
| `publish-preview.ps1`, `publish-preview.cmd` | OTA update for JS-only changes (`eas-cli update --channel preview`); sets `APP_VARIANT=preview` + `EXPO_PUBLIC_SEED_MODE=empty` itself; reaches only an installed APK with the same fingerprint. |
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
