# Brief 11 (replay 1x) executor report
Switch: both (default). No STOP.
Files changed: app/src/ui/replayModel.ts (REPLAY_RATES [1,5,10,25] + comments), app/src/ui/demoModel.ts (DEMO_RATES [1,5,15,25]), app/src/ui/DemoScreen.tsx (2 comments), app/tests/replay_suite.ts (cycle test rewritten + 1 new test), app/tests/demo_suite.ts (rates test).
Allow-list: not touched by me (its git diff is non-empty only from earlier briefs 1-6).
Tests: before 963 (960 pass, 0 fail, 3 skip); after 964 (961 pass, 0 fail, 3 skip).
tsc --noEmit: exit 0 (12-brief-11-tsc.log, empty = clean).
grep "[5, 10, 25]|[5, 15, 25]" src tests: no hits.
Deviations: none (replayClockS anchor shape matched). Static checks only; native not rendered.
OPEN-ITEMS line: Replay/Demo 1x (cycle27 brief 11) — on-device: tap the dial through 1x on REPLAY and DEMO; at 1x the clock ticks once a second and the roll-out is 10 real s.
