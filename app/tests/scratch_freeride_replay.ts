/**
 * SCRATCH (WP-B, 2026-08-24): used once, interactively, to satisfy the
 * brief's verification step 3 — replay
 * data/activities/TEST in app rides/qualifire-20260819/qualifire-20260819-2025.gpx
 * (station->home, overlapping EveningB's road for its second half) through
 * free mode and report which routes' gates fired and the free sector times
 * found. Not imported by tests/run.ts, not part of the test count.
 *
 * Result (for the record — see the WP-B dispatch report for the full table):
 * 23 total crossings across 5 routes (EveningB, StationHomePreferred,
 * StationHomeWet, StationWorkAlt, StationWorkStd — all plausible for a ride
 * starting at/near the station); 12 freeSectors derived; engine stayed
 * phase='detecting'/lockKind='none' the whole ride, as free mode requires.
 *
 * Left as an inert stub rather than deleted: the execution sandbox's
 * device_bash blocks rm/mv on the mounted repo (same restriction
 * tests/results_cache_suite.ts's own stub comment documents) — out of the
 * import graph is the closest available thing to "removed".
 */
