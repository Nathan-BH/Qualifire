# STATE — Qualifire (virgin branch)

**Single source of truth for current status.** Rewritten 2026-08-31 when this branch was
cut from `main`; last refreshed 2026-09-08 (virgin-cycle5) against everything landed through
virgin-cycle4. Keep this short; when it drifts from reality, rewrite it, don't patch around
the drift. Cycle-by-cycle narrative lives in `cycles/<name>/README.md`, not here.

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

## Vocabulary and data model (since virgin-cycle3, 2026-09-06)

- **Route = the from→to path between two landmarks (parent). Way = one named variant of
  riding that route (child).** Swapped by WP-3: `Route {id, startLandmarkId, endLandmarkId,
  loopDiscriminator?, wayIds, sportId?}`, `Way {id, routeId, refLineId, gateSetVersion,
  seeded, referenceRideId?, specs?}`. Gate sets, results, reference lines and the live
  engine's candidates are all keyed by **way**. `CATALOG_SCHEMA_VERSION` and
  `RESULT_SCHEMA_VERSION` are 2, with a read-side key rename for v1 files. Id VALUES never
  changed: ids minted before WP-3 keep their old prefixes (a `way:<rideId>` id may be a
  Route, a `route:<rideId>` id may be a Way); new mints use the correct prefix. Anything
  written before 2026-09-06 — briefs, comments, the `legacy-virgin` branch (frozen at
  `befb6b0`) — uses the old meanings. The browse tab is still called ROUTES.
- **Sports (WP-1):** user-named, zero seeded — a fresh install has no sport until the rider
  names one, and RECORD blocks with a message until then. One global "active sport"
  (`store/sports.ts`, `store/sportStore.ts`, `store/sportSwitch.ts`); landmarks, routes, ways,
  rides and results carry a `sportId` and are filtered by it (tag-and-filter over the single
  stores, not per-sport storage roots). Switch in SETTINGS → Sports, or the pill row at the
  top of RECORD (shown only with 2+ sports and the SETTINGS toggle on). Sports are fully
  separate: no way, ghost or best ever crosses a sport boundary.

## Where the app actually is

- **Code:** `app/core/` (timing engine — parity-proven on `main` against the 624-ride
  archive, measured 2026-08-14, `app/core/PARITY.md`; three small core commits since —
  `072830c` 08-19, `90f7f68` 08-23, `fa0e3aa` 08-31: MorningB gate data, `TrackId` widened
  to `string`, `collapseStationaryRuns` added to `reference.ts` — none touch the compared
  arithmetic, but parity is not re-measured and can't be from this branch: the archive's
  `activity-index.csv` and the Python side live on `main` only), `app/src/live/`
  (full-catalog pick-bias engine; candidates are ways), `app/src/store/` (sports + catalog +
  results + timing, empty-seed-capable — see below), `app/src/ui/` (six tabs:
  RECORD / RIDES / ROUTES / RESULTS / SETTINGS / DEMO). `app/tests/`: **560 tests, 557 pass,
  0 fail, 3 skip**. `tsc --noEmit`: clean, exit 0. Both verified 2026-09-08.
- **The empty-seed install path is built.** `store/seed.ts` + `store/catalogStore.ts`: the
  runtime catalog is the shipped seed merged read-side with an on-phone
  `catalog.user.json` (never copied to disk, so a seed edit still reaches every install).
  The empty seed is the **default** since 2026-09-08 (`seed.ts` resolves 'empty' unless
  `EXPO_PUBLIC_SEED_MODE=shipped`) — committed as `09a0aa0` (`seed.ts`,
  `tests/seedmode_pin.ts`, `tests/run.ts`, `app.config.js`, `README-dev.md`,
  `scripts/build7.ps1`, the `dev-virgin` retirement, the cycle4 docs). Plain
  `npx expo start` on the dev client and the
  `preview` / `virgin` EAS profiles (which still set `empty` explicitly) all ship a
  genuinely blank catalog: 0 sports, 0 landmarks, 0 routes, 0 ways, 0 ghosts. The Leuven seed is
  opt-in only — `$env:EXPO_PUBLIC_SEED_MODE = "shipped"` before `npx expo start` (the
  headless suite pins itself to it in `tests/seedmode_pin.ts`). `scripts/dev-virgin.ps1`
  / `.cmd` were retired to `safe_to_delete/` (redundant now). Everything that reads the
  catalog does so at call time
  (`currentCatalog()`/`shippedResults()`), not import time, so a stranger's blank install
  no longer leaks Nathan's home/work/Morning-route data.
- **Maps:** MapLibre + OpenFreeMap live on every screen including the live ride.
- **Sector-coloured trail is built everywhere (WP-K, 2026-09-04): live map, ride-detail
  screen, gated by one settings toggle (`sectorColours`, default on).** One shared pure
  module (`sectorTrailModel.ts`) feeds all surfaces; gate ticks stay neutral markers,
  untouched by this feature per Nathan's own rule.
- **Retroactive route creation + ride-1-as-reference is built.** Record a ride whose start/end
  don't match any known landmark, and a naming card offers to name them at STOP; on save it
  creates the landmark(s) (reusing/shrinking around existing ones, handling loops), a `Route`,
  a `Way`, and marks that ride as the way's reference (`Way.referenceRideId`). Skipping the
  card writes nothing; the ride itself was already saved beforehand either way.
  `store/routeCreation.ts` (the pure draft/build logic) + `ui/routeNamingCard.tsx` (the card)
  + `RecordScreen.tsx`'s `onEnd` flow. (Built 2026-08-31 as "way creation"; renamed by WP-3.)
- **Save-flow gates + real reference line are built (2026-08-31; card redesigned in cycle2).**
  The reference ride's raw GPS fixes build a real `RefLine` (filtered, resampled, smoothed)
  persisted to `refs.user.json`; `live/refs.ts`'s `refFor()` falls back to it, so a
  freshly-created way is drawable/raceable, not just structurally present. Four sector gates
  seed at exact 25/50/75% chainage quantiles, nudged (≤±250 m) toward the nearest point
  ≥150 m clear of wherever the reference ride itself sat stationary ≥20 s — a zero-network
  proxy for traffic-signal avoidance. Every seeded `GateSet` is honestly flagged
  `origin: 'geometric'` (never `'measured'` — see Known stubs). Gate adjustment is
  tap-then-nudge (per `product/proposals/SETUP-UX.md` §4) on a real zoomable map with
  long-press-to-repeat, start/finish gates adjustable too; the same full-screen surface edits
  the gates of an already-saved way from ROUTES (cycle2 WP-I/WP-J). Confirming mints a new
  `gateSetVersion`. `store/gateSeeding.ts` + `live/userRefs.ts` + the gate-adjust UI +
  `RecordScreen.tsx` wiring.
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
- **Cycle2 landed (2026-09-05, 13 WPs — `cycles/virgin-cycle2/README.md`):** RECORD
  trail/route-match 3-state rule (WP-A), gate-placement chronological-order fix (WP-B;
  prevention "Part C" deferred), raw-time scoring default implemented (WP-C,
  `store/timing.ts`, SETTINGS → Timing), GPS teleport-guard hole closed (WP-D), gate ticks no
  longer recolour (WP-E), tier-colour dedupe (WP-F), way-creation polish + tests (WP-G), gate
  editing on saved ways (WP-I), gate-adjust card on a real map (WP-J), ROUTES tap →
  full-screen place/route detail (WP-K, `CatalogDetailScreen.tsx`), "AI clutter" strings
  removed + SETTINGS tap-to-reveal "?" (WP-L), two-finger map rotation (WP-M).
- **Cycle3 landed (2026-09-06 — `cycles/virgin-cycle3/README.md`):** way/route inversion
  (WP-3, `1773a03`), multi-sport (WP-1, `c597193` / `dce0f83` / `66837b9`), **RESULTS tab**
  (WP-2, `e527b6f` … `ff2fb74`): per-way board (most-ridden first) → tap a way → all-time
  ranked history (fastest first, no tier colours, provisional per "build it, refine later") +
  a last-9-rides scatterplot (faster = up, purple/green/yellow vs the window average,
  hand-rolled Views, no `react-native-svg`). Replaces the old single-ride "Result" tab.
- **On the phone:** the dev client (Fast Refresh — blank by default since 2026-09-08,
  Nathan's Leuven seed only with `EXPO_PUBLIC_SEED_MODE=shipped`), and the rebuildable
  "Qualifire Preview" standalone APK. **Build7 (virgin-cycle4) rebuilt Preview in place as a
  permanently blank-seed install** (`EXPO_PUBLIC_SEED_MODE=empty` on the `preview` profile)
  and re-anchored its OTA fingerprint, which had drifted since build 6 and silently blocked
  `publish-preview.ps1`. A separate "Qualifire Virgin" app with its own package id was
  designed first and rejected by Nathan; the `virgin` EAS profile and `app.config.js` branch
  are dormant leftovers, deliberately untouched. Dry run clean 2026-09-06; **the real EAS
  build was run by Nathan and completed** (reached build4's post-success "Done." block).
  Whether build7 is installed on the phone and confirmed blank on first launch is not
  recorded anywhere — UNVERIFIED; see `OPEN-ITEMS.md` item 1. Details:
  `cycles/virgin-cycle4/BUILD7-PREVIEW-BLANK-SEED.md`.

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
- **Scoring:** three colour tiers (purple/green/yellow), F1 palette. No noise floor below
  a single ride (D-045 ruling 1, built as NW-1, 2026-09-08): a way's reference ride (ride 1)
  gets no colour verdict on the day it's ridden — it earns a rank once stored, but nothing to
  compare against yet — one prior ride compares purple/yellow only; two or more run the full
  model on the average of that way's rides on record. The ranking window is the 9 most recent
  previous rides plus the current one — never a global ranking, never "of 11".
- **Sectors:** every way has exactly 4, gates at 25/50/75% of the way's distance — never
  scaled by length. Gates snap away from traffic-signal-controlled intersections
  (≥150 m clear) since a gate at a red light corrupts that sector's times. Adjustment UI is
  tap-then-nudge with ± buttons (long-press repeats), never finger-dragging (thumb covers
  the line). Start/end gates sit at 1%/99% of the way's distance by default, adjustable.
- **Timing default is raw wall-clock time** (luck counts) — moving-time is opt-in via
  SETTINGS → Timing (`store/timing.ts`, `TimingMode = 'raw' | 'moving'`; colours, ranks and
  the tower all go through `scoredS()` — cycle2 WP-C).
- **Raw ride recordings are append-only** — never rewritten in place; a schema change gets
  a migration, not a silent mutation of history.
- **The live ride screen shows a real map** (MapLibre + OpenFreeMap), heading-up, locked
  zoom, no pan/zoom while moving, reference line + own position only.
- **Gate ticks never change colour** — sectors are coloured, gate markers stay neutral
  (Nathan's rule; cycle2 WP-E retired the last tier-coloured tick).
- **Sports are fully separate and none is pre-seeded** — the rider names them; a way, its
  ghosts and its bests never cross a sport boundary (Nathan's rulings, cycle3 WP-1).
- **A free ride ("new>>new", no known start/end) shows nothing and writes history** — no
  reference line, no comparison; the naming card at STOP can turn it into a route + way
  (Nathan 2026-09-04, cycle2 WP-A).

## Known stubs / footguns

- The seed mode is a **bundle-time** env constant (`EXPO_PUBLIC_SEED_MODE`). Since
  2026-09-08 the default is 'empty', so an `eas update` that forgets the variable ships blank
  (the safe direction); `eas.json`'s `preview` profile and `publish-preview.ps1` still set
  `empty` explicitly as belt-and-braces. Only `EXPO_PUBLIC_SEED_MODE=shipped` (dev client,
  and the headless test suite via `tests/seedmode_pin.ts`) brings the Leuven seed back.
  Build7's OTA-fingerprint re-anchor is what makes `publish-preview.ps1` usable again.
  Build 7's fingerprint is `cc04b4582bf8d69ff768b7e897f786c7a1862e7f` (confirmed
  2026-09-08 via `eas-cli build:list`; recorded in `scripts/OTA-TROUBLESHOOTING.md`).
- **Gate placement is honestly `origin: 'geometric'`, never `'measured'`.** Sector gates snap
  away from where the *single* reference ride sat stationary — a real proxy, but a one-ride
  proxy, not real traffic-signal data. `product/proposals/ROUTING-AND-SEGMENTATION.md` §3's
  honesty clause reserves `'measured'` for a re-run on ≥5 real rides; that re-scoring isn't
  built. Also not built: §3's variable 3–6-sector-count algorithm — deliberately out of scope,
  the shipped ground rule (exactly 4 sectors, fixed 25/50/75%) is what's implemented.
- **`refs.user.json`'s boot-time read/write path is unit-tested (memory fs round-trip) but not
  yet verified on-device.** Owed an on-device pass — see `OPEN-ITEMS.md` item 2.
- **No `expo-sharing` native module in the current dev client.** The debug-export share
  buttons reuse the existing SAF/share-text mechanism instead of the native share sheet;
  works today, but is a slightly clunkier flow than a real "Share..." sheet would be. Not
  part of build7's scope; a later APK rebuild could add it.
- DEMO replays its own frozen fixture (`src/ui/demoRouteFixture.ts` — the geometry of
  Nathan's "Morning" commute baked in as a fixture, not seed data; no manifest import) via
  `RouteMapView`'s `asset` prop — the same on every build, blank-seed Preview included
  (cycle1 WP-E, Nathan's Q6 ruling).
- **`CatalogDetailScreen.tsx`'s `placeDetailFor` reads the unscoped catalog**, so a place's
  detail can list another sport's routes/ways (cycle3 WP-1 Inspect, non-blocking, confirmed
  real). Needs a product decision — split "list" scoping from "deletable" scoping — not a
  mechanical fix.
- **GPX+ export after WP-3:** two event-literal renames outside WP-3's scope affect the
  export of pre-WP-3 rides, and a few sub-attributes carry a minor v2 naming inconsistency
  (cycle3 WP-3 Inspect, both non-blocking, deliberately left as-is).
- **Gate-placement prevention ("Part C" of cycle2 WP-B) is deferred.** The landed fix derives
  fixes/metadata in chronological (`tUnixMs`) order; nothing yet stops a future write path
  from reintroducing on-disk-order dependence. The on-device GPX+ check against the
  WorkHomeWet/281e ride is still owed.

## Cycle history (pointers only)

- `cycles/virgin-cycle1/README.md` — 2026-09-04: delete/reset, sector-coloured trail,
  gate-card map scrub, ride detail screen, virgin manifest leak, and more (WP-A … WP-Q).
- `cycles/virgin-cycle2/README.md` — 2026-09-05: 13 WPs from Nathan's 09-03/09-04 test
  rounds plus the Parked list (WP-A … WP-M).
- `cycles/virgin-cycle3/README.md` — 2026-09-06: way/route inversion (WP-3), multi-sport
  (WP-1), RESULTS tab (WP-2).
- `cycles/virgin-cycle4/README.md` — 2026-09-06/08: build7 (blank-seed Preview + OTA
  re-anchor) — inspected, dry run clean, real build run by Nathan; then (2026-09-08) the
  seed default flipped to 'empty' and the `dev-virgin` scripts were retired (`09a0aa0`).
- `cycles/virgin-cycle5/` — 2026-09-08: this root-doc cleanup (main-branch leftover vs.
  staleness); see its `CONTEXT.md` and `BRIEF-root-docs-cleanup.md`. Later cycles: add a
  line here when the cycle closes.

## Nathan's own files (unmanaged by any agent)

`IDEAS.md` (raw idea log) and `Nathan/` (his running notes and future plans — "the main
place i write all my comments and future plans") are read, never written, by any agent.
