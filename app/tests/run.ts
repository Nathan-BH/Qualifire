/** Qualifire headless test runner.
 *
 *   node --experimental-strip-types app/tests/run.ts
 *
 * Prints PASS/FAIL/SKIP per test and exits nonzero on any FAIL.
 * Fixtures under fixtures/ are committed; regenerate with build_fixtures.ts
 * against the ride archive (see README.md).
 */
import './engine_suite.ts';
import './storage_suite.ts';
import './gpxplus_suite.ts';
import './live_suite.ts';
import './store_suite.ts';
import './timing_suite.ts';
import './waymap_suite.ts';
import './waymapgeo_suite.ts';
import './waymapstyle_suite.ts';
import './live_colour_suite.ts';
import './towermodel_suite.ts';
import './resultsstore_suite.ts';
import './migrations_suite.ts';
import './catalogstore_suite.ts';
import './sports_suite.ts';
import './sportstore_suite.ts';
import './sportswitch_suite.ts';
import './catalogdelete_suite.ts';
import './routecreation_suite.ts';
import './wayspec_suite.ts';
import './userrefs_suite.ts';
import './gateseeding_suite.ts';
import './launch_anim_suite.ts';
import './recordflow_suite.ts';
import './elevation_suite.ts';
import './fixflags_suite.ts';
import './ridehistory_suite.ts';
import './ridedetail_suite.ts';
import './catalogdetail_suite.ts';
import './trail_suite.ts';
import './demo_suite.ts';
import './wayasset_runtime_suite.ts';
import './sectortrail_suite.ts';
import './virginmanifest_suite.ts';
import { runAll } from './lib.ts';

const { fail } = await runAll();
process.exitCode = fail > 0 ? 1 : 0;
