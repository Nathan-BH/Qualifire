# STATE — Qualifire

**Single source of truth for *current status*.** Updated only by the Team Principal, at the end of a cycle. Keep under ~100 lines.

**On precedence.** This file is the authoritative snapshot of *where the project stands* — anyone wanting the current picture reads this and nothing else. It achieves that by **pointing at** the detailed records rather than copying them: decisions in `product/DECISIONS.md`, open work in `product/BACKLOG.md`, roster in `team/TEAM.md`.

So there is no conflict with D-004. A fact should never appear both here and there. Where a summary line here has drifted from its record, the drift is a bug in *this* file and the Principal regenerates it — the detailed record is never edited to match a stale summary.

Last updated: 2026-08-24 · After cycle 024 (full regen — this file was overdue since cycle 016, carrying five bolted-on correction paragraphs; all folded in below, none survive)

---

## Phase

**Phase 2 — the app is real, on the phone, and its live engine now scores every route in the catalog.** Cycle 024 was the largest cycle to date: eleven work packages (route references and catalog, the full-catalog pick-bias lock engine, UI de-hardcoding, the ride-history store, the RECORD three-phase flow, the RIDES/RESULT redesign, free-ride "new" mode, race-map render fixes, GPX+ diagnostics closure, a route workbench tool, and an offline gate-field replay tool) plus a two-pass editable-SVG design folder and two out-of-queue device hotfixes (a footer overlap, a map-rendering regression) landed in the same push. Full account: `cycles/cycle-024.md`.

## Settled

D-001 … D-044. **Cycle 024 highlights:** **D-044** (2026-08-20) — MorningB's ratified v2 gate chainages, and the `REACQ_JUMP_M` fix stopping a GPS re-acquisition teleport from winning the live lock race; this is what makes the full-catalog engine trustworthy. **D-043** (2026-08-19) — a rebuildable "Qualifire Preview" standalone APK is allowed beside the dev client. **D-042** (2026-08-17) — raw wall-clock time becomes the scoring default (luck counts); **implementation is still pending** (B-59, deliberately deferred past cycle 024 too — colours/ranks still compare moving time). **D-041** (2026-08-17) — MapLibre + OpenFreeMap on every screen incl. live; cycle 024's WP-E and its Aug-24 hotfix are corrections to this map's rendering, not to the decision itself.

## The dataset

`data/activities/`: **624 GPX rides** (Aug 2024 → Aug 2026, all e-bike) + `data/activity-index.csv`. Plus `data/activities/TEST in app rides/`: 6 individual app-recorded GPX files and 4 per-day subfolders (2026-08-19/20/22/23) of further app rides. `data/analysis/cache/` holds **125** parsed archive rides as `.npz`. Catalog (`app/src/store/catalog.seed.json`): **6 landmarks, 13 ways, 20 routes** — and as of WP-D2 (cycle 024) **all 20 are live engine candidates** (`app/src/live/refs.ts` `TRACK_IDS`, verified by direct read 2026-08-24), not just the 4 that scored through cycle 023.

## Open work

`product/BACKLOG.md` is authoritative — **152 items** (69 carried in, 83 filed at cycle 024's close — see `product/BACKLOG.md` → "Cycle 024 follow-ups"). Top of the list, in plain language:

1. **The free-ride "new>>new" design task (B-139)** — Nathan's own explicit deferral: picking an unknown place at *both* ends of a ride has no ratified layout yet. Small-to-medium design pass, not urgent.
2. **A real app contrast bug (B-149)** — pale purple text on a bare background in `RidesScreen.tsx`'s sector rows and `RecordScreen.tsx`'s gate-colour memo is hard to read; confirmed by inspection, deliberately left unfixed in this cycle's design mockups (which mirror what ships, bugs included) but still needs an actual code fix. Small.
3. **Residual re-acquisition hole (B-90)** — `REACQ_JUMP_M` (D-044) closes the large teleport case; hops ≤245 m can still slip through uncounted in theory (worst real-corpus case seen: 138 m, never alone enough to win a lock). Cheap, one field + one line in `core/src/live.ts`.
4. **On-device checks only Nathan can do** — B-74 (Issue-1 day-mode remount retest), B-116 (confirm the footer-overlap fix saw the real OS nav bar, not preview-harness chrome), B-141/B-145/B-146 (WP-E's prestart-dotted-preview eyeball, `riderBlue` ratification, and the full both-themes/both-rungs map visual check the brief always intended for him).
5. **Older, still open:** the §29 routing/typed-destination fork (unruled); B-47 battery A/B (needed before any further standalone-APK map work); the station/church/fosh route-triage items (B-61–B-64, Nathan's eye needed on which are real alternatives vs detours); B-59 (D-042's raw-time implementation, deliberately deferred again).

## Blockers

None in code. Nothing is git-blocked this cycle (unlike cycle 015's B-40). The map slate and the engine slate are both unblocked and landed. What remains waits on Nathan's eye (above) or on a future design pass (free-ride new>>new).

## Awaiting Nathan

1. **The `product/` re-split** (this cycle, WP-I) — `COLD-START.md`, `SETUP-UX.md`, `ROUTING-AND-SEGMENTATION.md`, `TRIAGE-ideas-18-27.md` moved to `product/proposals/`; `MAPLIBRE-SPIKE.md`, `MAP-STACK-OPTIONS.md`, `BUILD-PIPELINE.md`, `GPX-PLUS-proposal.md` moved to `product/superseded/`. Every move is reversible (`mv` back) — a glance, not an approval gate.
2. **`BUILD-3-RUNBOOK.md` moved to `safe_to_delete/`** (this cycle, WP-I) — reversible now, but the point of that folder is that its contents eventually get deleted for real, so worth a glance before that happens.
3. On-device checks listed under "Open work" #4.
4. §29 (type a destination, get a raceable track) — still his fork alone to call.
5. Parked taste checks, unchanged for several cycles: D-021's REF badge, quali-card auto-collapse, real sector names.

## Roster

`team/TEAM.md` is authoritative.

## Ground truth — what actually exists

- **Code:** `app/core/` (engine, parity-proven); `app/src/live/` (full-catalog pick-bias engine, `REACQ_JUMP_M`); `app/src/store/` (catalog + free-ride store); `app/src/ui/` (six tabs — record/rides/routes/result/settings/demo — RECORD now a setup→armed→running→ending flow, RIDES/RESULT redesigned to the cycle-022 mockup). `app/tests/` — **239 tests: 236 pass, 0 fail, 3 skip** (re-run 2026-08-24, device); `npx tsc --noEmit` — clean, exit 0 (re-run 2026-08-24, device). Both rerun independently for this bookkeeping pass, not carried forward from the tracker.
- **Maps:** MapLibre + OpenFreeMap live on every screen (D-041); cycle 024's WP-E fixed off-route measurement (path-based, not chord), replaced gate circles with theme-aware perpendicular ticks, and drove the route-line ahead/behind split off real ride progress — then a same-day device report (2026-08-24) reverted the dotted-ahead line to solid (a real MapLibre `line-dasharray` rendering quirk on-device) and added casing/outline to the unscored gate ticks. PNG stays the fallback rung; the free-ride ("new" mode) gates-only map still shows the pre-cycle-023 circle style — filed as B-140.
- **On the phone:** dev-client (Fast Refresh) and the rebuildable "Qualifire Preview" standalone APK (D-043) both current.
- **`design/`** (new, cycle 024, WP-J) — 18 canonical SVGs (day+night × 9 screens), regenerated from `design/make_screens.py`, plus `design/edited/` for Nathan's Inkscape round-trip. Round-trip cycle-start check now in `process/CONVENTIONS.md`.
- **`product/`** — now split `live / proposals / superseded` (this cycle, WP-I); disposition unchanged in substance from the plan the 2026-08-20 brief set out, just executed.
- **Known stubs/flags:** B-59 (D-042 raw-time default) still unimplemented — colours/ranks still compare moving time; the empty-seed install path (B-39's other half) still hardcodes route identity; `app/tests/results_cache_suite.ts` is a dead WP-A1-era stub, safe to delete (B-121).
- Brand: `product/brand/` incl. `make_brandboard.py`. Data analysis: `data/analysis/` (all measured, now including `09_build_workbench_data.py` and `10_gatefield_replay.py`). `safe_to_delete/` — Nathan empties periodically.
