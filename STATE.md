# STATE — Qualifire

**Single source of truth for *current status*.** Updated only by the Team Principal, at the end of a cycle. Keep under ~100 lines.

**On precedence.** This file is the authoritative snapshot of *where the project stands* — anyone wanting the current picture reads this and nothing else. It achieves that by **pointing at** the detailed records rather than copying them: decisions in `product/DECISIONS.md`, open work in `product/BACKLOG.md`, roster in `team/TEAM.md`.

So there is no conflict with D-004. A fact should never appear both here and there. Where a summary line here has drifted from its record, the drift is a bug in *this* file and the Principal regenerates it — the detailed record is never edited to match a stale summary.

Last updated: 2026-08-17 · After cycle 014

---

## Phase

**Phase 2 — the app is real and on the phone; the map is now settled and the next build carries it.** Cycles 006–009 built and debugged the live surface; cycle 010–012 faked a map well (pre-rendered Esri crop); cycle 013 proved the model-tier protocol on B-44; **cycle 014 (2026-08-17) settled the real map: D-041** — MapLibre + OpenFreeMap online-first on every screen including the live ride, after Nathan overruled D-033 and relaxed the no-network / no-provider rules ("I usually have 5G on"). Cycle 011's expansion questions (§28/§29) remain open behind it.

## Settled

D-001 … D-041. **Cycle 014 (2026-08-17) — maps, definitively:** **D-041** (real map on every screen incl. live ride; D-033 overruled by Nathan, its reserve rules now binding design; stack = `@maplibre/maplibre-react-native` 11.3.6 + OpenFreeMap `dark`/`positron` online + ambient cache, PMTiles z0–15 optional; satellite LATER, 3D terrain NON-GOAL; D-032/D-034/D-035 relaxed as recorded). Cycle 013: D-039 (model tiers), D-040 (scheduled-cycle trial). **Cycle 011 (2026-08-17) — expansion:** **D-034** (offline tiles are a local Protomaps **PMTiles** corridor extract, not a hosted style — amends D-032's tile source on ToS evidence; OpenFreeMap demoted to kitchen-table fallback), **D-035** (MapLibre's trigger is **ARMED, not fired**; four conditions gate the build, including a *measured* battery A/B), **D-036** (a planned route may keep time, never compare, until 5 clean rides; geometric gates are a starting grid, not a benchmark; no engine ETA is ever stored or compared), **D-037** (the comparison window is the last **10 rides**, not 28 days — D-028's wording was stale, the code was right; the depth strip gets ten slots for the same reason). **Cycle 010 — maps:** D-031, D-032, D-033. Before that: D-030 (colour model), D-026–D-029, D-024–D-025. B-24, B-12 DONE; B-07 superseded by B-29; B-15 resolved via D-027; B-34 closed NON-GOAL by D-033; B-45 closed by D-037.

## The map — settled, first act is Nathan's

**D-041.** Contracts: `product/MAP-STACK-OPTIONS.md` (why MapLibre over expo-maps / Mapbox / WebView / PNG), `product/MAP-TILES.md` (style URLs, ToS, degradation, PMTiles command, palette firewall with real positron layer ids, attribution strings), `product/MAP-CONTRACT.md` (per-surface behaviour, the four live states, Strava verdicts, acceptance test §4). Sequence: **B-46 spike** (`scripts/spike-maplibre.ps1`, Nathan's PC, zero EAS builds) → **B-50** MapLibre base + GeoJSON layers on the dev client (one rebuild) → **B-51** wire every screen → **B-47** battery A/B before the preview APK ships → B-52/B-53/B-57. Nothing else in the map thread is blocked on a ruling. The cloud sandbox cannot reach npm/PyPI/tile servers (403, found cycle 014) — install work is Nathan's PC or a scheduled task with network, never this sandbox.

## The other open question — IDEAS §29

**Does Nathan adopt §29 — type a destination, get a raceable track?** Cycle 011 found §28, §29 and MapLibre were one chain; D-041 has now cut MapLibre out of it (the map ships regardless), so §29 stands alone: routing engine (B-49) + segmentation (B-48) + the cold-start slate. If not adopted, §28's answer is the Designer's arrival card. The fork is still Nathan's.

## The dataset

`data/activities/`: **624 GPX rides** (Aug 2024 → Aug 2026, all e-bike); index at `data/activity-index.csv`; original ZIP in `data/`. Per D-014/D-015: Morning 64 / Evening A 32 / Evening B 29, +6 offroute, 493 other. `data/analysis/cache/` holds **125** parsed rides as `.npz`. Re-measured cycle 011: 1,304,592 fixes, median 2,358/ride, and **only 3 of 624 rides have an endpoint outside the Leuven box** (2 Bucharest, 1 Ardennes) — so a bbox prefilter is a correctness guard, not a performance win. Plus `qualifire-20260815-0024.gpx` (first app-recorded GPX; QA fixture; regression-locks F-2) and four untriaged app rides in `data/activities/TEST in app rides/`.

## Open work

`product/BACKLOG.md` is authoritative — **58 items**. Top of the list:

1. **B-44 — FIXED 2026-08-17 (cycle 013).** Today's lap no longer sits inside its own comparison history: `ghostsFor(routeId, excludeRideId?)` drops today's `session:` id before the window slice, threaded through lap and sector paths. Regression-locked in `tests/live_colour_suite.ts` (pre-fix FAIL verified; 93 pass / 0 fail). Two minor follow-ups logged in `cycles/cycle-013.md`.
2. **Monday's commute** — first ride with live v2 on the handlebars. Acceptance step 9 in `app/README-dev.md`; on-device checklist in `BUILD-4-RUNBOOK.md` §5. Launch on home WiFi and don't reload mid-ride, or use `npx.cmd expo start --tunnel`.
3. **Benchmark/ride-history store** — unlocks real tiers, real tower population (B-28's other half) and, per B-40, a comparison window that survives a restart. Pure TS, blocked by nothing.
4. **The §28 cold-start slate, B-35 … B-43** — verdict-free ride 1 with a "ride n of 5" countdown, retroactive way creation at STOP, provisional gates from 2 matched traces, sector count that scales with length, de-hardcoding route identity, the empty-state pass.
5. **The map slate, B-46, B-50 … B-58 (D-041)** — see "The map" above. **The §29 slate, B-48 … B-49** — gated on the §29 ruling: B-48 replay the 25 m / 800 m / 1400 m numbers on the archive, B-49 price a routing native module (no maintained Expo binding for BRouter, Valhalla or GraphHopper).
6. Older, still open: B-31 (gate eyeball → unblocks B-02, zero build), B-32 (basemap ground — now a style-URL swap, Nathan's eye after B-50), B-33 (OSM signal chainages → B-05), B-20 (gate-move semantics), B-27 (earcon audibility — Monday).

**Map work is live (D-041, cycle 014)** — B-46 → B-50 → B-51 → B-47, then B-52/B-53/B-57; B-54/B-55/B-56 LATER; B-34 SUPERSEDED. Unactioned §18–27 seeds: GPX+ export (§23), live-screen space fixes (§24), kill-the-Preview-tab (§26), red-light handling (§18). Triage in `product/TRIAGE-ideas-18-27.md`.

## Blockers

None in code. The map slate waits on Nathan running the spike script (5 minutes, zero builds); the §29 slate waits on his ruling; the rest waits on the commute or the store.

## Awaiting Nathan

1. **Run `scripts/spike-maplibre.ps1`** from the repo root on a clean tree (B-46). PASS → the team briefs B-50 and one dev-client build. FAIL → the report file in `safe_to_delete/` comes back to the Mobile Dev.
2. **The §29 ruling** — the fork above; no longer holds the map hostage.
3. **Monday commute** with the app recording; check acceptance step 9; export the GPX into the project root.
4. **B-32 — basemap ground**, after B-50: one render dark, one light, told which surface each is for.
5. **Which build is actually on the phone** — see the ground-truth note below.
6. Parked taste checks: D-021 flags, quali-card auto-collapse, real sector names, D-028's ghost-marking and REF-vs-pole split.

## Roster

`team/TEAM.md` is authoritative. **New seat: Navigation Engineer** (`team/navigation-engineer.md`), added by Nathan for §28–29 — owns routing, segmentation, overlap detection and map-matching; hands *candidate* sectors and *candidate* comparison sets to the Race Engineer, who alone rules on whether they may be coloured. Cycle 014 ran Mobile Dev, Backend Dev (tiles), Product Owner + Designer, plus a fresh Fable inspector and a Haiku fix-check. Cycle 011 ran Mobile Dev, Product Owner, Designer, Navigation Engineer. Cycle 010 ran Product Owner, Designer, Race Engineer, Mobile Dev, Art Director. **The Race Engineer is next up and has three questions waiting** — see `cycles/cycle-011.md`, "Disagreements". Backend Dev wakes for the store; QA for B-44.

## Ground truth — what actually exists

- **Code:** `app/core/` (engine, parity-proven 500/500); `app/src/live/`; `app/src/ui/` — liveView v2, `tower.tsx`, board v2, `colourModel.ts` (D-030's `tierFor()`, `WINDOW_N = 10`, `MIN_HISTORY = 5`). `app/tests/` last recorded at **94 tests, 91 pass / 0 fail / 3 benign skips**, `tsc` clean (cycle 009) — rerun before quoting it.
- **Maps — today still the PNG; D-041 replaces it.** A real basemap is on the phone, with no native module. `app/assets/routes/` now holds both the raw OSM crops `{Morning,EveningA,EveningB}-base.png` **and** the rendered PNGs + `routes.json`, all regenerated **2026-08-17 03:06–03:10**. Renderer: `data/analysis/08_build_route_assets.py` (canonical); crops captured by `demos/basemap-capture.html`. The seam a live map would slot into is `projectToPixel(asset, lat, lon)` in `routeMapMath.ts`. **Note for anyone reading cycle 011's spike:** `product/MAPLIBRE-SPIKE.md` §5 says no `-base.png` exists and that the assets total 200 KB — both were true when it was written and are now stale. The rendered PNGs are ~1.3 MB each; route assets total **~10.5 MB**, bundle impact unmeasured.
- **On the phone:** dev-client APK (build `944bcc6f…`); record→store→export proven. Live v2 UNTESTED ON DEVICE (clock jank, flash hold, slot-in feel — Monday). **Unresolved drift:** cycle 010 recorded build 3 as still held under D-029, while `BUILD-4-RUNBOOK.md` opens "Build 3 shipped the native slate" and `scripts/build4.ps1` is written and preflight-green. One of the two is stale and only Nathan's phone can say which.
- **Paper, not code — everything in these files is UNBUILT:** `product/MAPLIBRE-SPIKE.md` (cycle 011; its §5 uses v10 prop names — v11 differs, see `MAP-STACK-OPTIONS.md` §7), `product/MAP-STACK-OPTIONS.md`, `product/MAP-TILES.md`, `product/MAP-CONTRACT.md`, `scripts/spike-maplibre.ps1` (written, never run), `product/ROUTING-AND-SEGMENTATION.md`, `product/COLD-START.md`, `product/SETUP-UX.md`.
- **Browser demos:** `demos/` — `mockup.html` (regenerated with every shipped design change), `gates-check.html`, `routes-check.html`, `basemap-capture.html`, `earcons-audition.html`, `tower-ghosts.html`, `index.html`, `legacy-mockup-cycle007.html`, `ways/`.
- **Known stubs/flags:** real tower population UNBUILT (B-28); comparison window memory-only (B-40); route identity hardcoded — `FALLBACK_ROUTE`, literal IDs, `results.seed.json` (B-39); the start pick is cosmetic; stationary clock-dim UNBUILT.
- Brand: `product/brand/` incl. `make_brandboard.py` (canonical hexes). Data analysis: `data/analysis/` (all measured). `safe_to_delete/` — Nathan empties periodically.
