# scripts/ — build and replay tooling (PowerShell/cmd, run on Nathan's PC)

| File | What it is |
|---|---|
| `build3-prepare.ps1`, `build3-build.ps1` | Build 3 pipeline — superseded (build 3 failed; see `safe_to_delete/BUILD-3-RUNBOOK.md` and `cycles/cycle-008.md`). Kept for reference, not the current build path. |
| `build4.ps1` | Build 4 pipeline — the active riding-build runbook references this (`BUILD-4-RUNBOOK.md`). |
| `build5.ps1`, `build5.cmd` | Build 5 — the "Qualifire Preview" standalone-APK build (D-043). |
| `spike-maplibre.ps1` | One-off spike script for the MapLibre integration investigation (`product/superseded/MAPLIBRE-SPIKE.md`). |
| `gatefield-replay.ps1`, `gatefield-replay.cmd` | Runs the offline gate-field replay tool (`data/analysis/10_gatefield_replay.py`) from a double-clickable entry point. |

Read by: whoever is doing a build or a data-analysis replay pass — these are the
PC-side entry points the app's own `README-dev.md` and the runbooks point to.
