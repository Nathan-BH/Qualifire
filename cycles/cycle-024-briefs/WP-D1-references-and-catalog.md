# WP-D1 — Reference lines for every catalog route + two ratified promotions

**Executor model: Sonnet. You see ONLY this brief. STOP AND ESCALATE on any judgment call this brief does not pre-resolve — never guess.**

## Goal, in Nathan's words

"All my routes should lock and score live, not just the four commute tracks" — and two specific promotions he ratified on 2026-08-20 (conditional on GPX verification, which the analyst has DONE — verdicts below): (1) his 2026-08-19 morning ride becomes the new reference line for the home>work route B track (he calls it "h>>w-w" — the rain/asphalt route; the current line is literally an evening ride reversed and sits ~10 m off the road he actually rides); (2) his 2026-08-19 evening station→home ride in the rain becomes a NEW second route on the station>home way (he calls it "s>>h-w") — it is genuinely a different road from the ratified "preferred" line (median ~200 m apart).

This brief is the DATA half: build a runtime reference polyline for every catalog route and land both promotions. WP-D2 (a separate brief) then makes the engine consume them.

## Environment & rules (binding)

- Repo root on Nathan's PC: `C:\Users\natha\Claude personal projects\Qualifire\`, mounted in the Cowork device workspace at `$HOME/mnt/Qualifire/`. The cloud sandbox has NO npm/PyPI/tile access. Do not run git anywhere.
- **Do not write any repo file until the coordinator confirms cycle 023 has landed.** Analysis/dry-runs in `/home/claude` are fine meanwhile.
- Tests: `cd app && node --experimental-strip-types tests/run.ts` runs pure (no node_modules) in the sandbox AND on the PC via device_bash (`bash -c 'cd $HOME/mnt/Qualifire/app && node --experimental-strip-types tests/run.ts'`). TypeScript: device_bash `bash -c 'cd $HOME/mnt/Qualifire/app && npx.cmd tsc --noEmit'` (needs the PC; sandbox has no node_modules). Re-baseline the suite BEFORE touching anything (last known 145 tests, 142 pass / 0 fail / 3 benign skips — cycle 023 may have moved this; record what you find).
- D-023: raw ride JSONL/GPX files are never rewritten. Never delete a file — move superseded things to `safe_to_delete/`. Dates absolute. No bare B-NN/D-NN IDs in anything Nathan reads without plain language first.

## Current state (verified in code 2026-08-20)

- **Live references**: `app/tests/fixtures/refs.json` holds exactly 4 tracks — Morning (5651.3 m), EveningA (5556.5 m), EveningB (5837.9 m) built as medoids by `app/tests/build_fixtures.ts` (parity-anchored — NEVER touch these three), and MorningB (5860.8 m) built by `app/tests/build_track_ref.ts` from ride `20260520-2317-work2home-18587698478.gpx` **reversed** (cycle 020 cold-start stand-in).
- **`app/tests/build_track_ref.ts`** (84 lines): single-ride reference builder — `parseGpx → meanOrigin → buildReference` (box-smooth k=5 + 5 m resample, `app/core/src/reference.ts`), rounds rx/ry to mm, recomputes chainage, upserts `refsFile.tracks[trackId]` and appends a `builderChecks` entry. Usage: `node --experimental-strip-types app/tests/build_track_ref.ts <gpx path> <trackId> [--reverse]`.
- **Catalog**: `app/src/store/catalog.seed.json` — 6 landmarks, 13 ways, **19 routes**, 19 gate sets. The 15 non-commute routes have cold-start equal-chainage placeholder gate sets (notes say "COLD-START.md §3/B-33 substitute … from a demos/ways trace <date time>"). Gate placeholders follow the pattern START≈3% of length, FINISH≈97%, middles equal (e.g. WorkStationA `[106.2, 917.0, 1833.8, 2739.3, 3531.9]` of 3642.7 m).
- **Drawn-map manifest**: `app/assets/routes/routes.json` — all 19 routes with `path` ([lat,lon], ~150 pts), `gates` (lat/lon + px/py), `gateIdx`, and Web-Mercator transform fields `w,h,x0,y1,scale,offx,offy` (canvas 900×1400, 60 px margin). Each entry's `sourceRide` names the source trace, e.g. `"demos/ways trace 2026-04-28 18:02 (work → Leuven station), status=keep"` → the archive file `data/activities/20260428-1802-*.gpx`.
- **Gate duplication hazard**: MorningB's gates exist in BOTH `app/core/src/gates.ts` (`PROPOSED_GATES.MorningB`, lines 34–40: `[163, 1802, 3027, 4352, 5677]`) and `catalog.seed.json` (gateSet v1). Keep them in sync in this pass; after WP-D2 the catalog is the engine's source and `core/gates.ts` remains only for the QA fixture harness (`app/tests/lib.ts` `gateChainages`).
- **Ride curation registry**: `data/analysis/ride_curation.json` maps trace timestamps to archive filenames (`ways` → entries with `file` and `when`). `data/analysis/way-curation.md` ("On smoothing it out") already prescribes the stationary-run collapse used below.
- The two promotion GPX files: `data/activities/TEST in app rides/qualifire-20260819/qualifire-20260819-1155.gpx` and `...-2025.gpx`.

## Analyst's GPX verification (already done — you do NOT need to re-derive; a re-run sanity check is welcome)

**Ride 1 (`qualifire-20260819-1155.gpx`, home→work route B in the rain) — PROMOTE.**
- 1364 pts, 41.1 min elapsed, 6.044 km path. Starts 10 m from the home landmark centre (https://www.google.com/maps?q=50.836590,4.638223), ends 10 m from work (https://www.google.com/maps?q=50.863420,4.688244).
- The known 18.4-min recording hole (11:55:30 → 12:13:53) spans only **6.9 m on the ground** — first point is a stale cached Android fix; the line is geometrically complete. Only other >5 s gap: none. Max raw point spacing after the hole: 31.8 m (one 2.1 s sprint fix), second-largest 9.7 m — all far under the 40 m corridor.
- Two real mid-ride stops (1.6 min at https://www.google.com/maps?q=50.837351,4.658095 and 4.5 min at https://www.google.com/maps?q=50.837376,4.658313) add only ~15–20 m of jitter knot after smoothing/resampling (measured) — and the collapse step below removes even that.
- Built as a reference (analyst's exact port of `buildReference`): 5962 m line; vs the current reversed-evening MorningB ref: **median offset 7.9 m, p90 13.0 m** — same road, the ~10 m offset Nathan reported, cured by promotion. The only >40 m deviations are the final ~20 m at the work end (the old ref stopped short). Median 601 m from the Morning (route A) ref — this is unambiguously route B.
- Re-projecting the existing MorningB gate coordinates (physical positions kept) onto the new line lands at ≈ `[215, 1850, 3120, 4450, 5785]` m (lateral offsets 0.4–9.1 m).

**Ride 3 (`qualifire-20260819-2025.gpx`, station→home in the rain) — PROMOTE as a NEW route.**
- 1566 pts, 26.2 min, 8.810 km, flawless 1 Hz (single 7.7 s warm-up gap, 3.3 m), zero spatial jumps. Starts 59 m from the station landmark centre (inside its 251 m radius; https://www.google.com/maps?q=50.881625,4.714601), ends 1 m from home (https://www.google.com/maps?q=50.836497,4.638218). One 1.3-min stop (https://www.google.com/maps?q=50.857900,4.679699).
- vs the ratified StationHomePreferred line: **median 211 m, 60% of points >40 m away** — a genuinely different road, a second route on the way, NOT a replacement.
- The trace passes 54 m from the work landmark at ~2865 m (33%) and then runs the evening-route-B road home (66% of the line within 40 m of the EveningB ref) — Nathan was told the reference is the FULL station→home trace, work passage included. Built line ≈ 8741 m.

## Changes

### 1. `app/tests/build_track_ref.ts` — stationary-run collapse (pre-resolved)

Before `meanOrigin`/`buildReference`, collapse stationary runs per `data/analysis/way-curation.md`: where consecutive fixes stay within **15 m** of the run's first fix for more than **20 s**, replace the whole run with ONE centroid point (mean lat/lon/ele, first t). Implement as a pure helper `collapseStationaryRuns(ride: RidePoints): RidePoints` in this file, applied always (no flag). This kills parked-bike jitter knots AND ride 1's stale-fix stub (its 2-point 18.4-min "run" collapses to one centroid ~3.5 m off the true start — negligible). Update the file header comment. Log the collapsed point count to console.

### 2. Build references for the 15 seed routes + rebuild MorningB + add StationHomeWet

For each route below, locate its archive GPX under `data/activities/` by timestamp glob (`YYYYMMDD-HHMM-*.gpx`; cross-check against `data/analysis/ride_curation.json` `file` fields), then run on Nathan's PC via device_bash (one call per route, each well under the 45 s cap):

```
cd $HOME/mnt/Qualifire && node --experimental-strip-types app/tests/build_track_ref.ts "<gpx>" <RouteId>
```

| RouteId | source trace |
|---|---|
| WorkStationA | 2026-04-28 18:02 |
| WorkStationB | 2026-08-08 09:58 |
| StationWorkAlt | 2026-05-01 20:49 |
| StationWorkStd | 2026-08-08 18:41 |
| HomeStationPreferred | 2026-07-21 11:32 |
| HomeStationViaFosh | 2026-07-17 16:16 |
| StationHomePreferred | 2026-07-21 20:48 |
| WorkChurchA | 2026-06-07 10:21 |
| WorkChurchB | 2026-08-09 10:11 |
| HomeChurch | 2026-05-24 10:12 |
| ChurchHome | 2026-06-07 12:13 |
| HomeFosh | 2026-04-21 17:57 |
| FoshHome | 2026-06-14 14:25 |
| WorkFosh | 2025-10-08 15:26 |
| ChurchFosh | 2026-06-14 12:21 |
| **MorningB** (REBUILD — the h>>w-w promotion) | `data/activities/TEST in app rides/qualifire-20260819/qualifire-20260819-1155.gpx` (NOT reversed) |
| **StationHomeWet** (NEW — the s>>h-w promotion) | `data/activities/TEST in app rides/qualifire-20260819/qualifire-20260819-2025.gpx` (NOT reversed) |

Never touch Morning/EveningA/EveningB (medoid, parity-anchored). Sanity-check each built length against the catalog gate-set note's "total ~X m" (must agree within ~5%; MorningB ≈ 5960±40 m, StationHomeWet ≈ 8740±60 m — the collapse step may trim a few metres). `refs.json` grows to 21 tracks (~600–700 KB — Metro bundles it once; acceptable, note it in the refs.ts header comment when WP-D2 touches it). If any source GPX cannot be located unambiguously, STOP and escalate with the glob results.

### 3. Gate sets

- **MorningB v2** (`catalog.seed.json` + `app/core/src/gates.ts` in sync): re-project the five existing MorningB gate lat/lons (`PROPOSED_GATES.MorningB`) onto the NEW ref with a throwaway node script using `app/core/src/projection.ts` `nearestOnSegments` over all segments (write it under `/home/claude/`, not the repo). Expected ≈ `[215, 1850, 3120, 4450, 5785]` ±15 m — if outside those bounds, STOP and escalate. In `catalog.seed.json`: append a new gateSet `{routeId:"MorningB", version:2, chainageM:[…], createdAtMs:<now>, note:"2026-08-20: reference promoted to Nathan's 2026-08-19 morning ride (h>>w-w, the rain/asphalt route); same physical gate positions re-projected; still cold-start, unratified (D-036)"}` and bump the MorningB route's `gateSetVersion` to 2. Keep v1 (history is never deleted). Update `core/gates.ts` MorningB chainages to the same v2 numbers + comment. Lap/sector comparability: MorningB has zero seeded results and cold-start unratified gates, so nothing real breaks (pre-resolved — no Nathan question needed).
- **StationHomeWet v1**: equal-chainage cold-start placeholder from the built length L: `[0.03L, 0.03L+(0.94L)/4·1, …, 0.97L]` rounded to 0.1 m, note `"cold-start equal-chainage placeholder (not measured, not ratified) from Nathan's 2026-08-19 ride 3 (s>>h-w, station→home wet route) — replace once ≥10 rides exist"`.

### 4. `app/src/store/catalog.seed.json` — the new route

- Way `station>home`: `routeIds` becomes `["StationHomePreferred","StationHomeWet"]` (the way now asks WHICH ROUTE TODAY? at START — that is §8a working as designed).
- New route object `{id:"StationHomeWet", wayId:"station>home", refLineId:"StationHomeWet", gateSetVersion:1, seeded:false}` (placed after StationHomePreferred).

### 5. `app/assets/routes/routes.json` — drawn lines

Rebuild the **MorningB** entry and add a **StationHomeWet** entry with a throwaway node script (keep in `/home/claude/`), mirroring the existing convention exactly (verified against the shipped file):
- `path`: the built ref line downsampled to ~150 points (take every 8th 5-m vertex + the last), as `[lat, lon]` (convert ref-frame x/y back: `lat = lat0 + (y/R)/rad`, `lon = lon0 + x/(R·cos(lat0·rad))/rad`, R=6378137).
- Transform: canvas `w=900,h=1400`, margin 60; over the path's Web-Mercator bbox (`mercX = lon·π/180`, `mercY = ln(tan(π/4 + lat·π/360))`): `scale = min(780/dx, 1280/dy)`; `offx=(900−scale·dx)/2`; `offy=(1400−scale·dy)/2`; `x0 = minMercX`, `y1 = maxMercY`. (Check: recomputing an existing entry's gate px/py from its lat/lon with these formulas reproduces the stored values — the analyst verified this on Morning/MorningB/StationHomePreferred.)
- `gates`: name + lat/lon at each v-current gate chainage on the ref (interpolate along the line), px/py via the transform. `gateIdx`: nearest path index per gate. `image:""` (no PNG — the PNG fallback rung draws the path segments; that is the existing behaviour for all 16 imageless routes). `sourceRide`: `"qualifire-20260819-1155.gpx (h>>w-w promotion, 2026-08-20)"` / `"qualifire-20260819-2025.gpx (s>>h-w promotion, 2026-08-20)"`.
- MorningB's old entry content goes to `safe_to_delete/routes-morningb-pre-promotion-20260820.json` (never delete).

### 6. Tests (add to `app/tests/store_suite.ts` — it already imports the catalog)

1. `catalog: every route's refLineId resolves in tests/fixtures/refs.json and every gate set fits its ref` — for each of the 20 routes: refs.json has the track; last gate chainage < ref length; first > 0; `validateCatalog` still returns `[]`.
2. `catalog: station>home offers two routes (s>>h-w promotion, 2026-08-20)` — way routeIds contains StationHomeWet; `needsRoutePick` true for `station>home`.
3. `refs: MorningB is the promoted 2026-08-19 ride` — `tracks.MorningB.medoid` contains `qualifire-20260819-1155`; length within [5900, 6000]; MorningB gateSet v2 exists, route points at v2, v1 retained; `core/gates.ts` MorningB chainages equal catalog v2 (import both, compare).
4. `refs: StationHomeWet line sanity` — length within [8650, 8800]; 5 placeholder gates strictly increasing, first ≈3% ±0.5%, last ≈97% ±0.5%.
5. `routes.json: MorningB and StationHomeWet entries project consistently` — for each: `projectToPixel` of gate lat/lon reproduces stored px/py within 0.5 px; path endpoints within 150 m of the way's start/end landmark centres (`catalog.seed.json` coords).

Expected count: +5 tests, 0 new skips, 0 FAIL. Do not modify any existing test.

## Verification

1. Sandbox-pure: `cd app && node --experimental-strip-types tests/run.ts` → zero FAIL, count = baseline+5.
2. On the PC (authoritative): device_bash test run + `npx.cmd tsc --noEmit` clean.
3. Spot-check by eye: print MorningB v2 gate lat/lons with Google Maps links in your handover summary (Nathan's standing rule: every coordinate cited to him carries a maps link).

## Files touched

- `app/tests/build_track_ref.ts` (collapse helper)
- `app/tests/fixtures/refs.json` (17 tracks added/rebuilt; 3 medoid tracks byte-untouched)
- `app/src/store/catalog.seed.json` (way station>home, route StationHomeWet, gateSets MorningB v2 + StationHomeWet v1)
- `app/core/src/gates.ts` (MorningB chainages → v2 + comment)
- `app/assets/routes/routes.json` (MorningB rebuilt, StationHomeWet added)
- `app/tests/store_suite.ts` (+5 tests)
- `safe_to_delete/routes-morningb-pre-promotion-20260820.json` (new)

## Conflicts with cycle 023

LOW. 023's scope (race-map day-mode rendering, auto-pause/paused-time toggle, off-route investigation) does not touch these files, EXCEPT possibly `routes.json`/fixtures if its off-route investigation regenerated anything — coordinator must diff-check `app/tests/fixtures/refs.json` and `app/assets/routes/routes.json` against 023's diff before you start.

## Pre-resolved ambiguities

- New route's catalog id is **`StationHomeWet`** (PascalCase like every existing id); Nathan's shortname "s>>h-w" is a display/naming concern deferred to the route-workbench work. `routeLabel()` renders it "Station Home Wet".
- The promoted MorningB reference uses the FULL ride-1 file including the stale first fix — the collapse step neutralises it; no hand-editing of the GPX (raw is sacred, D-023).
- Ride 3's reference is the FULL trace including the work passage (Nathan's explicit instruction).
- Stationary-collapse constants 15 m / 20 s verbatim from `data/analysis/way-curation.md`.
- MorningB gate re-projection preserves physical gate positions (lat/lon), not chainage fractions.
- Medoid refs and their parity checks are untouchable; only `build_track_ref` routes change.

## NEEDS-NATHAN

- None blocking. FYI items for the coordinator's cycle notes: (a) display shortnames ("h>>w-w"/"s>>h-w") await the workbench naming feature; (b) MorningB's v1→v2 gate move resets its (empty) comparability history — recorded, no action.

## Rollback

Every change is additive or versioned: revert = restore `refs.json`/`routes.json`/`catalog.seed.json`/`gates.ts` from git (Nathan's job) or from `safe_to_delete/`; gateSet v1 entries remain in place, so pointing MorningB's `gateSetVersion` back to 1 restores the old world without data loss.
