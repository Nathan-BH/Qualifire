/**
 * MOVED (cycle 024, WP-A1): this suite locked B-40's disposable
 * results-cache.json round-trip, superseded by the persistent results/ store
 * (store/resultsStore.ts). No longer imported by tests/run.ts. Its full
 * original content lives at safe_to_delete/results_cache_suite.ts (never
 * deleted, per repo convention) — this stub stands in only because the
 * execution sandbox's device_bash blocks `rm`/`mv` on the mounted repo (the
 * same restriction the coordinator's git-lock note already flags), so the
 * original file path could not actually be removed; it is left empty and
 * out of the import graph instead.
 *
 * Every guarantee this suite locked has a successor case in
 * tests/resultsstore_suite.ts:
 *   - persist/rehydrate round-trip           -> "save -> simulated restart..."
 *   - missing cache file -> empty, no throw  -> "corrupt result file and
 *                                                corrupt index.json..." (covers
 *                                                missing/corrupt uniformly)
 *   - corrupt/misshapen cache -> empty       -> same case above
 *   - an estimated ride is never persisted   -> "an estimated-lap RideResult
 *                                                saves to the store but never
 *                                                enters recordedResults()"
 *     (note: the *rule* changed on purpose — estimated results ARE now
 *     stored, for RIDES/A3's sake; what is preserved is D-028's window
 *     invariant, that they never rank/ghost)
 */
