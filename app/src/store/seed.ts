/**
 * The shipped seed — the ONE place the app reads its bundled catalog and
 * archive ghosts from (cycle 025, B-39 remainder: the empty-seed install
 * path; D-045 ruling 3 — a stranger with a blank install must be able to use
 * this app).
 *
 * Two seed modes, fixed at bundle time:
 *  - 'empty' (the DEFAULT since 2026-09-08 — plain `npx expo start` on the
 *    dev client, and the `preview` / `virgin` EAS profiles, which also set
 *    EXPO_PUBLIC_SEED_MODE=empty explicitly): NO landmarks, ways, routes,
 *    gate sets or ghosts, and (WP-E) no bundled route assets or route PNGs
 *    — see bundledForSeedMode(). Everything the rider will ever race against
 *    is created on the phone and lives in store/catalogStore.ts's user
 *    catalog file.
 *  - 'shipped' (opt-in only: EXPO_PUBLIC_SEED_MODE=shipped, e.g.
 *    `$env:EXPO_PUBLIC_SEED_MODE = "shipped"` in the shell before
 *    `npx expo start`): the curated Leuven catalog (catalog.seed.json:
 *    6 landmarks, 13 ways, 20 routes) and the archive ghosts
 *    (results.seed.json), exactly as before this module existed.
 *
 * `process.env.EXPO_PUBLIC_*` is inlined by Expo's bundler at build time, so
 * the mode is a constant in the shipped bundle. Under Node the headless suite
 * pins EXPO_PUBLIC_SEED_MODE=shipped itself (tests/seedmode_pin.ts, the first
 * import of tests/run.ts) so it keeps exercising the shipped-catalog path; the
 * pure `...ForSeedMode` functions exist so the suite can exercise the 'empty'
 * branch without touching the environment.
 *
 * Nothing here is ever mutated: both JSON imports are handed out as-is —
 * every consumer treats a Catalog / RideResult[] as read-only, as before.
 */
import catalogJson from './catalog.seed.json';
import resultsJson from './results.seed.json';
import { emptyCatalog } from './catalog.ts';
import type { Catalog, RideResult } from './types.ts';

export type SeedMode = 'shipped' | 'empty';

export const SEED_MODE: SeedMode =
  process.env.EXPO_PUBLIC_SEED_MODE === 'shipped' ? 'shipped' : 'empty';

export function catalogForSeedMode(mode: SeedMode): Catalog {
  return mode === 'empty' ? emptyCatalog() : (catalogJson as unknown as Catalog);
}

export function resultsForSeedMode(mode: SeedMode): RideResult[] {
  return mode === 'empty' ? [] : (resultsJson as unknown as RideResult[]);
}

/** The catalog this build ships with. */
export function shippedCatalog(): Catalog {
  return catalogForSeedMode(SEED_MODE);
}

/** The archive ghosts this build ships with. */
export function shippedResults(): RideResult[] {
  return resultsForSeedMode(SEED_MODE);
}

/** WP-E (Nathan's Q6 ruling, 2026-09-03: "remove everything that's bundled
 * ... it should only use what is actually made on the phone"): anything ELSE
 * baked into the JS bundle that an empty-seed (virgin) build must not be
 * able to reach — today the route asset manifest (assets/ways/routes.json)
 * and the three pre-rendered route PNGs, both defined in ui/routeMapView.tsx.
 * Static imports are resolved by Metro before any env logic runs, so the
 * bytes still ship; this makes them unreachable: every consumer sees `{}`.
 * 'shipped' hands the very same object back (identity preserved — the
 * resolver's manifest-wins-by-identity rule and Nathan's builds are
 * byte-identical). Pure, so the suite can pin both modes. */
export function bundledForSeedMode<T>(mode: SeedMode, bundled: Record<string, T>): Record<string, T> {
  return mode === 'empty' ? {} : bundled;
}
