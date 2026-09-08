# data/ — app-recorded test rides (virgin branch)

On `virgin` this folder holds only what the app itself produced during test rounds. The
624-ride Strava archive, `activity-index.csv`, the `analysis/` Python pipeline and its
reports all stay on omain`. Nothing here is read by the app or by the headless test suite.

| Entry | What it is |
|---|---|
| `activities/TEST in app rides/` | Pre-branch test rounds on the old app (2026-08-19 → 08-29), one `qualifire-YYYYMMDD/` folder per day: Nathan's notes, reviews and post-review notes, plus a few screenshots. Notes only — no GPX. Kept for reference; vocabulary is pre-WP-3 (route/way not yet swapped). |
| `activities/TEST in virgin-app rides/` | Test rounds on this branch (2026-09-01, 09-03, 09-04), one `qualifire-YYYYMMDD/` folder per day: the app's GPX+ exports (`qualifire-YYYYMMDD-HHMM.gpx`), the debug exports `qualifire-catalog-*.json` / `qualifire-refs-*.json`, and the day's notes / review. New on-device findings go in a new folder here (OPEN-ITEMS.md item 2). |

Not on this branch, though still referenced by two offline builder scripts the suite never
imports ( app/tests/build_fixtures.ts`, `app/tests/build_seed.ts`) and by the scratch script
`app/tests/scratch_freeride_replay.ts`: `activity-index.csv`, the raw archive, `analysis/`.
`strava_export-20260814.zip` was moved to `safe_to_delete/` in virgin-cycle5. The `.gpx`
files here are the app's own exports, not Strava's.
