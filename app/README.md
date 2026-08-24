# app/ — the React Native / Expo app

This is the real app that runs on Nathan's phone. For what's actually in here and how
it fits together, read:

- **`../HOW-THE-APP-IS-BUILT.md`** — the plain-language one-pager: engine, location,
  storage, the store, the UI, the live engine, dev client vs. build, mockup vs. app.
  Start here if you're not sure what a piece is called.
- **`README-dev.md`** — the developer setup and acceptance-test steps for working on
  this code from Nathan's PC: pipeline status, test suite, build/rebuild triggers.

Top-level layout, briefly: `core/` (the pure timing engine, see `core/PARITY.md`),
`src/location`, `src/storage`, `src/store`, `src/live`, `src/ui` (the six tabs),
`tests/` (the headless suite, run via `node --experimental-strip-types tests/run.ts`).

Read by: whoever is doing app-code work that cycle (Mobile/Backend Dev, Navigation
Engineer); Nathan, for the plain-language pointer above.
