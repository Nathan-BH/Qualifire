# STATE — Qualifire (virgin branch)

**Single source of truth for current status.** Rewritten 2026-08-31 when this branch was
cut from `main` — everything below is current as of that cut plus the work landed on it
since. Keep this short; when it drifts from reality, rewrite it, don't patch around the
drift.

---

## What this branch is

`virgin` is the primary line of work now (Nathan, 2026-08-31). `main` stays a frozen
snapshot of the original archive-powered personal app — its 624-ride GPX archive, its
`data/analysis/` tooling, its full decision/backlog history, and its team-of-named-roles
process all still live there untouched, just not carried onto this branch. See
`process/CONVENTIONS.md` for what actually changed about how work happens here.

## The goal

A working prototype Nathan can hand to someone else: install from nothing, record a ride,
have the app turn that ride into a real route (name the endpoints, get gates, get scored),
and — separately — export/import the whole app so it can move between phones. "Someone else
besides Nathan can use this app" is a top-priority goal, not just a design lens.

## Where the app actually is

- **Code:** `app/core/` (timing engine, parity-proven), `app/src/live/` (full-catalog
  pick-bias engine), `app/src/store/` (catalog + results, **now empty-seed-capable** — see
  below), `app/src/ui/` (six tabs: record/rides/routes/result/settings/demo).
  `app/tests/`: **302 tests, 299 pass, 0 fail, 3 skip**. `tsc --noEmit`: clean, exit 0.
  Both verified on this branch 2026-08-31 (nothing in `app/` changed by the branch cut
  itself).
- **The empty-seed install path is built.** `store/seed.ts` + `store/catalogStore.ts`: the
  runtime catalog is the shipped seed merged read-side with an on-phone
  `catalog.user.json` (never copied to disk, so a seed edit still reaches every install).
  `EXPO_PUBLIC_SEED_MODE=empty` (the `virgin` EAS profile, or `scripts/dev-virgin.ps1` for
  a dev-client peek) ships a genuinely blank catalog: 0 landmarks, 0 ways, 0 routes, 0
  ghosts. Everything that reads the catalog does so at call time
  (`currentCatalog()`/`shippedResults()`), not import time, so a stranger's blank install
  no longer leaks Nathan's home/work/Morning-route data.
- **Maps:** MapLibre + OpenFreeMap live on every screen including the live ride.
- **Sector-coloured trail (Result screen only) is built.** A finished ride's "VIEW TRACE"
  map paints each sector's line span in the colour that sector earned; gate ticks stay
  neutral markers. Extending this to the live/racing screen and the demo ride is scoped
  but **parked** — see Open items.
- **Retroactive way creation + ride-1-as-reference is built.** Record a ride whose start/end
  don't match any known landmark, and a naming card offers to name them at STOP; on save it
  creates the landmark(s) (reusing/shrinking around existing ones, handling loops), a `Way`,
  a `Route`, and marks that ride as the route's reference (`Route.referenceRideId`). Skipping
  the card writes nothing; the ride itself was already saved beforehand either way.
  `store/wayCreation.ts` (the pure draft/build logic) + `ui/wayNamingCard.tsx` (the card) +
  `RecordScreen.tsx`'s `onEnd` flow.
- **Save-flow gates + real reference line are built (2026-08-31).** The reference ride's raw
  GPS fixes now build a real `RefLine` (filtered, resampled, smoothed) persisted to a new
  `refs.user.json`; `live/refs.ts`'s `refFor()` falls back to it, so a freshly-created route
  is drawable/raceable, not just structurally present. Four sector gates seed at exact
  25/50/75% chainage quantiles, nudged (≤±250 m) toward the nearest point ≥150 m clear of
  wherever the reference ride itself sat stationary ≥20 s — a zero-network proxy for
  traffic-signal avoidance, since there's no real intersection data source wired in yet. Every
  seeded `GateSet` is honestly flagged `origin: 'geometric'` (never `'measured'` — see Known
  stubs). A tap-then-nudge adjustment card (`ui/gateAdjustCard.tsx`, per
  `product/proposals/SETUP-UX.md` §4) lets Nathan move any of the 3 sector gates before
  confirming; confirming mints `gateSetVersion` 2. `store/gateSeeding.ts` (pure seeding logic)
  + `live/userRefs.ts` (ref persistence) + `ui/gateAdjustModel.ts`/`gateAdjustCard.tsx` +
  `RecordScreen.tsx` wiring. Three briefs, independently inspected: PASS WITH FINDINGS, all
  non-blocking (see Known stubs).
- **A small debug-export mechanism is built (2026-08-31).** Settings has a new DATA section:
  share `catalog.user.json` or `refs.user.json` via the existing SAF/share-text mechanism (no
  new native dependency — the dev client's `expo-sharing` module isn't built in yet, see Known
  stubs). Per-ride GPX+ share already existed on the Rides screen and already carries rich
  session diagnostics (route locks, gate crossings, stops, outages, elevation outliers). This
  is deliberately smaller than the whole-app export/import in Open items — no zip, no import,
  just "get today's state and one ride's full trace off the phone" for feedback.
- **Delete and reset landed (2026-09-02, `cycles/virgin-cycle1/WP-Q-delete-and-reset.md`).**
  ROUTES tab can delete user-created routes/ways/orphan places (cascading, validated via
  `store/catalogDelete.ts`); SETTINGS → DATA has "Reset to virgin" (moves the storage root
  aside to a timestamped sibling, keeps settings/theme, refuses during an active recording,
  two-step confirm). Bundled-gate rings on a new>>new free ride were already closed by WP-C's catalog-only `allRouteAssets()`; WP-E then emptied the bundled manifest/PNGs on virgin builds outright (`store/seed.ts` `bundledForSeedMode`).
- **On the phone:** the dev client (Fast Refresh) and the rebuildable "Qualifire Preview"
  standalone APK; a `virgin` EAS build profile now exists but hasn't been built yet.

## Open items

See `OPEN-ITEMS.md` — short, curated toward the goal above. The full historical backlog
(152 items, most already resolved) is on `main`'s `product/BACKLOG.md` if something old
needs a second look.

## Ground rules (what's settled about how the app behaves)

Distilled from `main`'s decision log 2026-08-31 — only what still actually constrains the
virgin prototype. Full rationale/history for any of these is on `main` if ever needed.

- **Single-user personal app, no accounts, no social, no store distribution** — except
  "someone else can use it from a blank install" is now the top-priority goal above; that's
  a capability, not a multi-user/social pivot.
- **Scoring:** three colour tiers (purple/green/yellow), F1 palette. No noise floor: a
  route's first-ever ride logs all-purple sectors (you can't have lost to anyone yet); one
  prior ride compares purple/yellow; two or more run the full model on the average of rides
  on record. The ranking window is the 9 most recent previous rides plus the current one —
  never a global ranking, never "of 11".
- **Sectors:** every route has exactly 4, gates at 25/50/75% of route distance — never
  scaled by route length. Gates snap away from traffic-signal-controlled intersections
  (≥150 m clear) since a gate at a red light corrupts that sector's times. Adjustment UI is
  tap-then-nudge with ± buttons, never finger-dragging (thumb covers the line).
  Start/end gates sit at 1%/99% of route distance by default.
- **Timing default is raw wall-clock time** (luck counts) — moving-time is opt-in. (The
  scoring/UI implementation of this default is still pending — see Open items.)
- **Raw ride recordings are append-only** — never rewritten in place; a schema change gets
  a migration, not a silent mutation of history.
- **The live ride screen shows a real map** (MapLibre + OpenFreeMap), heading-up, locked
  zoom, no pan/zoom while moving, route line + own position only.

## Known stubs / footguns

- ~~`catalogStore.ts`'s `initCatalogStore()` can throw on a malformed `catalog.user.json`~~
  — **fixed** with the retroactive-way-creation work: `recompute()` now runs inside the
  try/catch, reproduced-and-verified by inspection (a malformed file no longer throws, and
  `initRideHistory` still runs afterward).
- The virgin app's empty-seed mode is a **bundle-time** env constant. Any future
  `eas update` to a virgin channel must set `EXPO_PUBLIC_SEED_MODE=empty` explicitly, or the
  OTA bundle silently reverts to Nathan's seed.
- ~~A new route's `refLineId` deliberately pointed at nothing resolvable~~ — **fixed**
  2026-08-31 by the save-flow-gates package: `refFor()` now falls back to a real `RefLine`
  built from the reference ride's own GPS track and persisted to `refs.user.json`.
- ~~`metresBetween` (`store/catalog.ts`) was a flat-earth approximation hardcoded at Leuven's
  latitude~~ — **fixed** 2026-08-31: uses the point pair's own mean latitude now, works
  anywhere on Earth (matches `ui/routeMapGeo.ts`'s `metresBetween`, which already did this
  correctly).
- **Gate placement is honestly `origin: 'geometric'`, never `'measured'`.** Sector gates snap
  away from where the *single* reference ride sat stationary — a real proxy, but a one-ride
  proxy, not real traffic-signal data. `product/proposals/ROUTING-AND-SEGMENTATION.md` §3's
  honesty clause reserves `'measured'` for a re-run on ≥5 real rides; that re-scoring isn't
  built. Also not built: §3's variable 3–6-sector-count algorithm — deliberately out of scope,
  the shipped ground rule (exactly 4 sectors, fixed 25/50/75%) is what's implemented.
- **`refs.user.json`'s boot-time read/write path is unit-tested (memory fs round-trip) but not
  yet verified on-device.** Same category as the retroactive-way-creation stubs below — owed
  an on-device pass.
- **No `expo-sharing` native module in the current dev client.** The new debug-export share
  buttons reuse the existing SAF/share-text mechanism instead of the native share sheet;
  works today, but is a slightly clunkier flow than a real "Share..." sheet would be. A future
  APK rebuild could add `expo-sharing` for the nicer flow.
- Two small, non-blocking findings from the same inspection: the way-naming card's loop
  copy always says "one new place" even when the loop starts at an existing landmark
  (cosmetic only); two matching-logic branches in `wayCreation.ts` (end-side sliver-reuse,
  both-endpoints-already-loop) are implemented correctly but not directly test-covered yet.
- DEMO replays its own frozen fixture (`src/ui/demoRouteFixture.ts`, Morning's geometry, no
  manifest import) via `RouteMapView`'s `asset` prop — the same on every build (WP-E,
  Nathan's Q6 ruling).
- Three empty directory shells survive from the branch cut (`cycles/`,
  `cycles/cycle-024-briefs/`, `cycles/cycle-025-briefs/`) — this mount denies `rmdir` on
  them the way it denies `unlink` on some files. Harmless; git doesn't track empty dirs.
  Clear them from Explorer whenever.

## Nathan's own files (unmanaged by any agent)

`IDEAS.md` (raw idea log) and `Nathan/` (his running notes and future plans — "the main
place i write all my comments and future plans") are read, never written, by any agent.
