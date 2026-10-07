/** Qualifire headless test runner.
 *
 *   node --experimental-strip-types app/tests/run.ts
 *
 * Prints PASS/FAIL/SKIP per test and exits nonzero on any FAIL.
 * Fixtures under fixtures/ are committed; regenerate with build_fixtures.ts
 * against the ride archive (see README.md).
 *
 * `./seedmode_pin.ts` must stay the FIRST import: it sets
 * EXPO_PUBLIC_SEED_MODE=shipped before any suite evaluates src/store/seed.ts
 * (whose default is 'empty' since 2026-09-08).
 */
import './seedmode_pin.ts';
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
import './landmarkusage_suite.ts';
import './placesearch_suite.ts';
import './catalogmerge_suite.ts';
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
import './ridehomes_suite.ts';
import './feedmodel_suite.ts';
import './trailcache_suite.ts';
import './catalogdetail_suite.ts';
import './catalogmap_suite.ts';
import './trendpanel_suite.ts';
import './resultsmodel_suite.ts';

import './trail_suite.ts';
import './demo_suite.ts';
import './wayasset_runtime_suite.ts';
import './sectortrail_suite.ts';
import './selfrace_suite.ts';
import './rankingreveal_suite.ts';
import './virginmanifest_suite.ts';
import './autotheme_suite.ts';
import './mapcredit_suite.ts';
import './replay_suite.ts';
import './replay_drift_suite.ts';
import './lockscreen_suite.ts';
import './positionretry_suite.ts';
import './bootstrap_suite.ts';
import './ridenotification_suite.ts';
import './session_suite.ts';
import './riderdot_suite.ts';
import './ui_strings_suite.ts';
import './easignore_suite.ts';
import './seedstubs_suite.ts';
import { runAll } from './lib.ts';

const { fail } = await runAll();
process.exitCode = fail > 0 ? 1 : 0;
