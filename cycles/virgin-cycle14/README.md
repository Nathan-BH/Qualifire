# virgin-cycle14 — parked briefs (not yet executed)

Nathan feeds ideas one at a time in chat; each becomes a brief file in this folder
(`NN-short-name.md`), parked here for later execution. Nothing in this cycle is
implemented until Nathan says so.

## Brief index

| # | file | idea | source | status |
| --- | --- | --- | --- | --- |
| 01 | `01-auto-day-night-theme.md` | Settings option: day interval (e.g. 09:00-19:00), app auto-switches day/night theme | testuser LBH | parked |
| 02 | `02-post-ride-replay.md` | Post-ride live replay of any recorded ride (DEMO-style race view), default 10x speed (demo's 25x is not smooth) | testuser LBH | parked |
| 03 | `03-settings-group-order-and-naming.md` | SPORTS group moves to 2nd place under APPEARANCE; "ON THE BIKE" group renamed sport-neutral (WHILE RECORDING) | Nathan (tester feedback) | parked |
| 04 | `04-settings-cleanups-luck-reset-reflines.md` | Remove "luck factor" (= raw/moving timing switch, not dead); "Reset to virgin" -> "Reset app"; "reference lines" -> "reference rides" | Nathan (tester feedback) | parked |
| 05 | `05-map-credits-info-button.md` | Fold OpenFreeMap credits into a small "i" button in a map corner (Strava style) | Nathan (tester feedback) | parked |
| 06 | `06-demo-tab-text-cleanup.md` | DEMO tab: drop ride-type subtext; "Nothing is recorded." -> "Not part of the final app - use only for testing features" | Nathan (tester feedback) | parked |
| 07 | `07-record-button-slogan.md` | RECORD button: "arms the ride..." text -> "same ride · new meaning" | Nathan (tester feedback) | parked |
| 08 | `08-demo-results-scatterplot.md` | Show the RESULTS scatterplot at the end of each DEMO ride type, so it can be seen in action | Nathan (tester feedback) | parked |

## Brief template

Each brief: Goal / Context (files, current behaviour) / Change requested / Out of scope /
Acceptance checks / Open questions (logged, never blocking). Self-contained so an executor
can run it cold.

Commands for this cycle's work go in `COMMANDS.md` here (created when the first brief lands).

## Suggested execution order

03 -> 04 -> 01 in one executor session (all edit `settings.tsx`; match on quoted text, not line numbers).
05 before 02 (the replay map should inherit the "i" button). 06 before 08 (both edit DemoScreen; match on quoted text). 07 is independent.
