# report brief-01 (Sonnet execute)

Steps: all done (1a, 1b, 2a, 2b). 1c nothing.
Files changed: app/src/ui/resultsPlotModel.ts, app/src/ui/demoModel.ts, app/tests/resultsmodel_suite.ts, app/tests/demo_suite.ts (git status = exactly these 4 + cycles/ logs).
Tests: before `923 tests: 920 pass, 0 fail, 3 skip`; after `925 tests: 922 pass, 0 fail, 3 skip` (as expected). Logs: run-brief01-baseline.log, run-brief01.log.
tsc: exit 0 (log empty because tsc prints nothing on success; exit code checked directly).
Allow-list: `git diff -- app/tests/ui-strings.allow.json` empty; no entry added/edited/removed; no UNLISTED/STALE.
Greps: PLOT_N = WINDOW_N at line 24; plotH count 12; windowCaption in demoModel = import line 36 + demoPlotCaption body line 324.
Deviation (note, not a stop): acceptance 4 "grep WINDOW_PREV resultsPlotModel.ts -> nothing" does not hold literally: the brief-prescribed header text (1a.3) itself contains "it was WINDOW_PREV = 9 before" (line 10, comment only). No code reference remains.
Inspector: recheck TENTH arithmetic (10 dots, sum 8438, 5 slower), plotH test would fail if yAt used PLOT_H; diff of resultsPlotModel.ts only import/PLOT_N/plotH/windowCaption/comments.
OPEN-ITEMS line: "virgin-cycle25 brief 01: plot now shows 10 dots (= ranking pool). The RESULTS detail (until brief 03) and the DEMO ending plot both show 10 dots; the DEMO caption reads LAST 10 ACTIVITIES. On-device check owed: 10 slots fit at phone width (slot pitch ≈ (plotW − 24)/9; at 320 dp plot width that is ≈ 33 dp between 10-dp dots)."
Static checks only; native not rendered.
