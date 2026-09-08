/** Pins the headless suite to the SHIPPED seed (Leuven catalog + archive ghosts).
 *
 * Since 2026-09-08 `src/store/seed.ts` resolves SEED_MODE to 'empty' unless
 * EXPO_PUBLIC_SEED_MODE is exactly 'shipped' — so that plain `npx expo start`
 * launches the blank/virgin app. The suite still has to exercise the
 * shipped-catalog code path (catalogstore_suite, sportstore_suite, ...) and must
 * not drift with the interactive default, so tests/run.ts imports this module
 * FIRST: ES modules evaluate in import order, so this assignment lands before
 * any suite evaluates seed.ts. The 'empty' branch is covered through the pure
 * `...ForSeedMode(mode)` functions.
 */
process.env.EXPO_PUBLIC_SEED_MODE = 'shipped';

export {};
