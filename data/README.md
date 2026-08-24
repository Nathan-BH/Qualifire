# data/ — the ride archive and analysis pipeline

Not itemized per-ride below — see subfolder descriptions instead.

| Entry | What it is |
|---|---|
| `activities/` | The raw GPX archive — 624 exported rides (Aug 2024 → Aug 2026, all e-bike) plus `activities/TEST in app rides/`, the app's own recorded test rides (individual files and per-day subfolders). |
| `activity-index.csv` | One row per archive ride: filename, date, distance, and the metadata the analysis pipeline keys off. |
| `analysis/` | The numbered pipeline scripts (`01_parse.py` → `10_gatefield_replay.py`) that turn raw GPX into the app's catalog: parsing, gate detection, way/route mapping, mockup and route-asset generation, the route workbench data, and the gate-field replay tool. `analysis/cache/` holds 125 parsed archive rides as `.npz` (fast re-load, not re-parsed from GPX each time). `analysis/workbench/` backs `demos/workbench.html`. Output reports (`RESULTS.md`, `*_report.md`, `*.csv`) sit alongside the scripts that produced them. |
| `strava_export-20260814.zip` | The original raw Strava export the archive was built from — kept as the ground-truth source, not touched by the pipeline. |

Read by: whoever is doing route/gate work that cycle (usually the Navigation
Engineer or a data-analysis work package); the app itself never reads this folder
directly — it consumes the catalog files the pipeline produces into `app/src/store`.
