# Report brief 02 (Sonnet execute)
All steps done. Anchors matched; no stops, no deviations.
Files (brief 02 hunks): app/core/src/projection.ts (3 hunks: passVertex block, anchor, re-acq), app/core/src/live.ts (4 hunks: import, 2 call sites, header bullet), app/src/live/engine.ts (2 comment hunks), app/tests/live_suite.ts (2 hunks: import line, 190-line appended block). ui-strings.allow.json diff is brief 01's, not mine.
Tests added (8): passVertex equals nearestVertex single-pass/hairpin; earliest pass / nearS; loop t=0; out-and-back order; far-end anchor unchanged; offline anchor; offline re-acq; live vs offline crossTime agreement.
BEFORE (passVertex stubbed = nearestVertex): exactly the 6 predicted FAIL (earliest/nearS idx 438 ch 2189; loop first fix phase finished gateFires 1; OB first fix finished gateFires 1; offline anchor 2188.1; rejoin chainage 100; Loop: 1 live gate events); single-pass and far-end PASS. 918 baseline -> 929 tests: 919 pass, 7 fail (6 + 1 ui-strings from brief 01's RecordScreen "loop").
AFTER: 929 tests, 926 pass, 0 fail, 3 skip (918 + 8 mine + 3 brief 01).
tsc: not clean at the time of writing, only because of brief 01 in-flight file tests/recordflow_suite.ts(634,33) TS2367 ('~loop' vs '~new'); earlier also RecordScreen routeTitle import (since fixed by brief 01). No errors in my files. Log: 06-brief-02-tsc.log. Rerun after brief 01 lands.
grep nearestVertex in core/src and src/live: only projection.ts.
Inspector: mutate-check passVertex->nearestVertex; confirm tsc exit 0 once brief 01 done.
OPEN-ITEMS line: "[UNVERIFIED] parity: projectRideOffline anchor and global re-acquisition now use passVertex (virgin-cycle26 brief 02); identical for single-pass references by construction; archive parity not re-measurable on virgin."
