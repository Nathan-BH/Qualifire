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
import './routemap_suite.ts';
import './routemapgeo_suite.ts';
import './routemapstyle_suite.ts';
import './live_colour_suite.ts';
import './towermodel_suite.ts';
import './resultsstore_suite.ts';
import './catalogstore_suite.ts';
import './waycreation_suite.ts';
import './userrefs_suite.ts';
import './gateseeding_suite.ts';
import './launch_anim_suite.ts';
import './recordflow_suite.ts';
import './elevation_suite.ts';
import './fixflags_suite.ts';
import './ridehistory_suite.ts';
import './trail_suite.ts';
import './demo_suite.ts';
import './routeasset_runtime_suite.ts';
import { runAll } from './lib.ts';

const { fail } = await runAll();
process.exitCode = fail > 0 ? 1 : 0;
