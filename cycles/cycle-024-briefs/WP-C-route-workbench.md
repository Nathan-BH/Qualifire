# WP-C — Route workbench browser page (demos/workbench.html)

**Executor model:** Sonnet, no other context. Everything you need is in this brief. If a judgment call
arises that this brief does not pre-resolve, **STOP and escalate** — do not guess.

**Phase gate:** Cycle 023 is still landing on the same repo. Do NOT write any repo file until the
coordinator confirms 023 has landed. Build and verify everything in the sandbox first; the repo write
is the last step, on the coordinator's go.

---

## 1. Goal, in Nathan's words

From his 19 Aug ride notes (`data/activities/TEST in app rides/qualifire-20260819/qualifire-20260819-notes.md`):

> "I should also ASAP be able to pick a single ride as reference rides for every route I want …
> then I should be able to have a preview of the route + where the gates are + handles to drag each
> gate. Each gate position should be expressed as a percentage of the completed route … I should be
> able to drag each handle and save their end percentage position, for example:
> G1-5%;G2-34%;G3-67%;G4-95%. This looks like a simple way to agree on where to place the handles."
> "…if i have an easy percentage slider on the routes i can drag it and then talk to claude about a
> specific percentage point."

The 19 Aug review (`…/qualifire-20260819-review.md`, §2 end, lines 63 and 84) turned this into one build:
a **route workbench page in the browser** — one page covering, per route: the reference line on a real
map, each gate as a draggable line with a live `% + metres + Google Maps link` readout, a
"promote this ride to reference" picker, a percentage slider for naming points, and a Save button that
writes a file the team reads next cycle. It **absorbs B-31** (the gate-eyeball upgrade: perpendicular
gate lines at true half-width, crossing-point clouds from the cached rides, the 50 m arming window,
σ_s + median-speed/stop-fraction labels, a Google Maps link per gate — spec in `product/BACKLOG.md`,
the B-31 row) and **B-42's promotion mechanism**.

Acceptance (B-31's, extended): Nathan opens the file from disk on his PC and can say "move gate 2",
one gate at a time — and now can actually move it, save, and hand us the file.

## 2. Current state (all paths relative to repo root; snapshot at `/mnt/user-data/uploads/Qualifire/`)

- **`demos/gates-check.html`** — the page this absorbs. Leaflet 1.9.4 from unpkg CDN + raster tiles
  from `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (lines 2–3, 8). Three hardcoded route lines
  (Morning / EveningA / EveningB) with gates drawn as `L.circleMarker` **dots** (line 13) — exactly
  what B-31 says must become lines. Data is baked into the file; no clouds, no σ_s, no links, nothing
  draggable. Leave this file untouched (see §7 pre-resolutions).
- **Demos conventions** (`demos/mockup.html`, `demos/ways/*.html`, `demos/routemap-preview.html`,
  `demos/basemap-capture.html`): single-file HTML, inline CSS/JS, dark theme (`#111`/`#0d0d0f` bg,
  `#ffd400`/`#F5C542` accent, `system-ui` font), open straight from `file://` with **no build step**.
  Two load-bearing facts baked into existing pages:
  - A `file://` page **cannot `fetch()` a sibling file** (opaque origin) — data is delivered via
    `<script src="routes-data.js">` instead (see the comment at `data/analysis/08_build_route_assets.py`
    lines 358–361 and its consumer `demos/routemap-preview.html` line 80).
  - A browser **cannot write into the repo** — the existing convention for browser-produced files is a
    programmatic download (`a.download` + `a.click()`, see `demos/basemap-capture.html` lines 122–126)
    which lands in Downloads; Nathan then moves the file into the repo folder the page tells him to.
- **Map library ruling:** MapLibre/OpenFreeMap/PMTiles decisions (D-032/D-034, `product/DECISIONS.md`)
  are about the **app**. All interactive browser demos use **Leaflet + openstreetmap.org tiles**
  (fine for interactive per-user browsing; only *scripted bulk capture* is banned — see the comment
  block in `demos/basemap-capture.html` lines 27–30). **Match the Leaflet convention.**
- **Route/gate data sources:**
  - `app/assets/routes/routes.json` — all **19 ratified routes**, each with `path` (decimated ridden
    lat/lon line), `gates` (5 per route, `name`/`lat`/`lon` + px), `gateIdx` (each gate's index into
    `path`), `sourceRide`. Route ids: Morning, EveningA, EveningB, MorningB, WorkStationA,
    WorkStationB, StationWorkAlt, StationWorkStd, HomeStationPreferred, HomeStationViaFosh,
    StationHomePreferred, WorkChurchA, WorkChurchB, HomeChurch, ChurchHome, HomeFosh, FoshHome,
    WorkFosh, ChurchFosh.
  - `app/src/store/catalog.seed.json` — `landmarks` (6, with `radiusM`), `ways` (id → routeIds),
    `routes` (19), `gateSets` (19; per route `chainageM: [5 numbers]` in **metres along the engine
    reference** — e.g. Morning `[162, 1312, 2662, 4212, 5487]`).
  - `app/tests/fixtures/refs.json` — the **engine's true reference lines** for 4 tracks only
    (Morning, EveningA, EveningB, MorningB): `{medoid, length, lat0, lon0, rx[], ry[], ch[]}` in a
    local metres frame. Convert back to lat/lon with the inverse of `to_xy`:
    `lat = lat0 + ry/110540.0; lon = lon0 + rx/(111320.0*cos(radians(lat0)))`
    (this is exactly `latlon_at` in `data/analysis/03_gates.py` lines 60–62).
  - `data/analysis/gates_proposal.csv` — per gate (3 original tracks only):
    `track,gate,chainage_m,lat,lon,median_speed_kmh,stop_frac`.
  - Per-sector **σ_s** lives in `data/analysis/03_output.txt` (`sig_clean` column, seconds). Values
    (embed as a literal dict, provenance-commented — do not parse the txt):
    Morning S1–S4: 6.44, 3.83, 5.32, 7.07 · EveningA: 10.04, 5.04, 4.18, 6.21 ·
    EveningB: 6.47, 5.40, 4.72, 4.90.
  - `data/analysis/cache/*.npz` — ~127 cached archive rides (arrays `t, lat, lon, ele, track`;
    `track` ∈ {Morning, EveningA, EveningB}; ~125 usable, counts 64/32/29 per `03_output.txt`).
    **Not in the snapshot except one sample** — stage from the device, §6.
- **Engine constants the page must draw honestly:**
  - Corridor half-width **40 m** each side of the line: `CORRIDOR_M = 40.0`,
    `app/core/src/projection.ts` line 12. B-31's "gate line at its true half-width" = a perpendicular
    segment spanning ±40 m (80 m total).
  - Arming window **50 m**: `armWithinM: 50`, `app/core/src/live.ts` line 48 (D-016(b): a gate the
    first on-route fix already lies < 50 m past still fires, flagged "estimated").
- **Anti-drag ruling is phone-only:** `product/SETUP-UX.md` §4 (lines 94–98) bans dragging **on the
  phone** (thumb covers the line; 1 px ≈ 8 m). The 19 Aug review (line 61) explicitly rules: "On a
  browser page with a mouse, dragging is fine." Build the drag.
- **How references are minted today:** `app/tests/build_track_ref.ts` — CLI takes
  `<gpx path> <trackId> [--reverse]`, upserts a single-ride reference into `refs.json`. There is no
  UI; Nathan's promotions have been "his words in chat → a script run". The workbench's Save file is
  the new front door to that same script (the coordinator runs it next cycle from the saved JSON).
- `demos/index.html` — the card index of all demo pages; new pages get a card.

## 3. Change list (3 new files, 1 new folder, 1 small edit)

### 3a. NEW `data/analysis/09_build_workbench_data.py` (data builder; numbering: 09 is the next free
number; WP-H is taking 10 — do not use 10)

Python 3 + numpy only. **All paths derived from `__file__`** (repo root = two levels up), like
`08_build_route_assets.py` line 17 — never a hardcoded absolute path. Note: `02_analysis.py` has its
data paths hardcoded to a dead session mount (`/sessions/tender-clever-ride/…`, its line 7), so do
**not** import it — **copy** the four helpers you need (`to_xy`, `project_ride`, `cross_time`, and
resampling if needed) into 09 with a provenance comment
(`# copied from data/analysis/02_analysis.py (cycle 003); 02's paths point at a dead session mount`).

Reads: `app/assets/routes/routes.json`, `app/src/store/catalog.seed.json`,
`app/tests/fixtures/refs.json`, `data/analysis/gates_proposal.csv`, `data/analysis/cache/*.npz`.

Writes: `demos/workbench-data.js` —
`// GENERATED by data/analysis/09_build_workbench_data.py — do not edit.`
`window.WORKBENCH_DATA = {...};`

Schema:
```
{ generated: "<ISO date>", corridorM: 40, armWithinM: 50,
  landmarks: [ {id,label,lat,lon,radiusM} … from catalog ],
  routes: { <routeId>: {
     wayId, sourceRide, lengthM,
     lineSource: "engine reference (app/tests/fixtures/refs.json)"   // 4 tracks
              | "display path (app/assets/routes/routes.json)",      // other 15
     line: [[lat,lon],…],            // refs.json rx/ry→latlon for the 4; routes.json path otherwise
     chainage: [m per line vertex],  // refs.json ch for the 4; cumulative equirect dist otherwise
     gates: [ { name, chainageM,     // from catalog.seed.json gateSets (authoritative metres)
                pct,                 // chainageM / lengthM * 100, 1 decimal
                lat, lon,            // interpolated on line at chainageM
                perp: [[lat,lon],[lat,lon]],   // ±40 m perpendicular endpoints
                armEnd: [lat,lon],   // point on line at chainageM + 50
                sigmaS,              // incoming sector's sig_clean (s) or null
                medianSpeedKmh, stopFrac,      // gates_proposal.csv or null
                cloud: [[lat,lon],…] // crossing points, [] where no cached rides
              } × 5 ] } } }
```
Details, all pre-resolved:
- `lengthM` = refs.json `length` for the 4 tracks; last chainage value otherwise.
- Perpendicular: bearing from line points at chainage g−10 m and g+10 m (clamped); endpoints ±40 m
  at bearing±90°, computed in the equirect frame and converted back.
- Cross-check: for every route, distance between the interpolated gate lat/lon and routes.json's
  stored gate lat/lon; `print` a WARNING over 25 m (expected small — decimated path vs engine line).
  Warnings are informational, not fatal.
- σ_s mapping: a gate's label carries the σ of the sector that **ends** at it (S1 ends at G1, …,
  S4 ends at FINISH). START gets `sigmaS: null` (no incoming sector). Only the 3 original tracks
  have values; every other route (and MorningB) gets nulls.
- **Clouds** (3 cached tracks only): per npz ride of that track, `to_xy` into the ref's
  `lat0/lon0` frame, run the copied offline `project_ride` against the refs.json line, take
  `cross_time` of each gate's `chainageM`; interpolate the ride's lat/lon at that time; append.
  Rides that never cross a gate contribute nothing for it. MorningB and the 15 others: `cloud: []`.
- Round all lat/lon to 5 decimals (~1 m) to keep the file small.

### 3b. NEW `demos/workbench.html` (the page)

Single file, inline CSS/JS. `<script src="workbench-data.js">` for data;
Leaflet 1.9.4 CSS+JS from unpkg (same two lines as `gates-check.html` lines 2–3); tiles
`https://tile.openstreetmap.org/{z}/{x}/{y}.png`. Dark chrome matching the demos style; the map
itself is the standard OSM light raster (same as ways pages). Header + a short "how to use / how to
save" block **on the page itself** (see 3d). Nathan-facing text is plain language — no bare B-NN/D-NN
ids (parenthetical ids allowed).

Layout: left = map (~70% height); right/below = control panel: route selector (19 routes, grouped by
way, showing `routeId · wayId · length`), gate list, slider, promotion box, named-points list, Save.

Features (all must work; each is a checkable artifact):
1. **Route render:** reference line polyline; landmark circles (`radiusM`) at the way's endpoints;
   fit bounds. A caption states the line's source (`lineSource`) and length.
2. **Gates as perpendicular lines** (never dots): `L.polyline(perp)` per gate, ~3 px. **Arming
   window**: dashed polyline along the route from the gate to `armEnd`, with tooltip
   "arming window: a late GPS lock within 50 m past this gate still scores it (estimated)".
3. **Crossing clouds:** 2-px `circleMarker`s, semi-transparent, per gate (toggleable). Where
   `cloud` is empty show "no cached rides for this line" in the gate list instead.
4. **Gate labels/list:** per gate a list row: `G2 · 34.2% · 1,993 m · σ 3.8 s · 24.3 km/h ·
   stops 0% · [Google Maps]`. Google Maps link: `https://maps.google.com/?q=<lat>,<lon>`
   (`target="_blank"`). Null stats render as `—`. σ/speed/stop values are labelled "measured at the
   original position" once a gate has been moved.
5. **Drag:** each gate gets a draggable `L.marker` handle at its centre; on drag, project the
   handle onto the route polyline (nearest point on segments — implement in page JS), snap the
   handle + perpendicular line + arming dash to it, update `% / m / link` live. START and FINISH
   are draggable too but their rows carry a standing warning: "moving the start or finish gate
   breaks lap history (a middle-gate move keeps it)". No phone support needed — mouse only.
6. **Percentage slider:** range input 0–100 step 0.1 driving a probe marker along the line, with
   live readout `42.3% = 3,687 m` + Google Maps link, plus a text field + "name this point" button
   → appends to a named-points list (deletable before save).
7. **Promote-a-ride picker:** `<input type="file" accept=".gpx">` (+ drag-drop onto the map).
   Parse with `FileReader` + `DOMParser` (`trkpt` lat/lon + `<time>` of first/last point) — works on
   `file://`; never `fetch()`. Draw as a distinct-colour overlay polyline over the reference.
   Controls: "reverse point order" checkbox (a morning ref from an evening ride —
   `build_track_ref.ts --reverse` exists for exactly this), a shortname field (placeholder
   `h>>w-w`), and a "propose as THE reference for this route" checkbox.
8. **Save:** builds a JSON payload and downloads it as
   `workbench-<routeId>-<YYYYMMDD-HHMM>.json` (blob + `a.click()`, the `basemap-capture.html`
   convention). Payload:
```
{ schemaVersion: 1, savedAt: "<ISO>", routeId, lineSource, lengthM,
  gates: [ {name, pct, chainageM, lat, lon, moved: bool} × 5 ],
  gatesShort: "START-2.9%;G1-23.2%;G2-47.1%;G3-74.5%;FINISH-97.1%",   // Nathan's notation, all 5
  namedPoints: [ {label, pct, chainageM, lat, lon} … ],
  promotion: { gpxFileName, reverse, shortname, nPoints, firstPointTime, lastPointTime } | null,
  note: "<free-text field on the page>" }
```
   **lat/lon is the ground truth** in this file; pct/m are convenience (see §7). After save, show:
   "Move the downloaded file into `data/analysis/workbench/` — that folder is read at the start of
   every cycle."
9. **Graceful no-map degradation + testability:** all Leaflet usage guarded (`if (window.L)`);
   with the CDN or tiles unreachable the page shows "map unavailable — everything below still
   works" and **every non-map feature (list, slider readout, save) still functions**. Expose the
   pure helpers on `window.WB` — at minimum `WB.chainageToLatLon(routeId, m)`,
   `WB.pctToChainage(routeId, pct)`, `WB.projectToLine(routeId, lat, lon)` →
   `{chainageM, pct, lat, lon}`, `WB.buildSavePayload()` — so headless checks can drive them.

### 3c. NEW folder `data/analysis/workbench/` with `README.md` (≤15 lines): what lands here
(workbench saves + naming convention), who reads it (the coordinator, at cycle start), and that files
here are inputs — the catalog/gate-set/reference changes they describe only become real when a cycle
executes them (gate-set versioning keeps history honest). Git does not track empty dirs — the README
is what makes the folder exist.

### 3d. EDIT `demos/index.html`: one new card under "Where you ride" (current tag) for
`workbench.html` — link, two-sentence description, and a "try this" line ("pick a route, drag gate 2,
press Save"). In the existing `gates-check.html` card append one sentence: "For moving gates, use the
newer workbench.html — this page stays as the record of how the 2026-08-14 positions were measured."
Update the "Last updated" date (absolute date). Touch nothing else in the file.

## 4. Tests / checks (no app-tree files are touched — the TS suite must simply stay at its 023
baseline)

1. Re-baseline: `cd app && node --experimental-strip-types tests/run.ts` → record counts before and
   after your change; they must be identical (expect 0 FAIL; last known 145 tests / 142 pass /
   3 skips, cycle 023 may have moved it).
2. Builder run (sandbox): `python3 data/analysis/09_build_workbench_data.py` on the staged copy —
   exits 0; prints any >25 m warnings.
3. Data validation (sandbox, node one-off script — not a repo file): eval `demos/workbench-data.js`,
   assert: 19 routes; every `chainage` strictly non-decreasing; every gate `0 ≤ pct ≤ 100` and
   `|pct − chainageM/lengthM*100| < 0.1`; every `perp` endpoint 35–45 m (haversine) from the gate
   centre; `cloud` non-empty for ≥ 4 of 5 gates on Morning/EveningA/EveningB and empty elsewhere;
   Morning G2 `chainageM == 2662`.
4. Playwright DOM checks (sandbox; python `playwright` + chromium are preinstalled and launch
   offline — verified 2026-08-20). Open `file:///…/demos/workbench.html` (CDN unreachable in the
   sandbox — this **is** the no-map degradation test): no uncaught page errors; route selector has
   19 options; selecting `Morning` renders 5 gate rows; slider to 50.0 → readout metres ==
   `WB.pctToChainage('Morning',50)` rendered with thousands separator; `WB.buildSavePayload()`
   returns schema-valid JSON with `gatesShort` matching `/^START-\d+(\.\d+)?%;G1-…/`; the maps link
   href of G2 contains its lat/lon; the "map unavailable" notice is visible.
5. On Nathan's PC (after repo write): open the page from disk with network — map renders, tiles
   load, drag works. This is Nathan's acceptance moment, not a scripted check.

## 5. Files touched (union)

| File | Kind | 023 conflict risk |
|---|---|---|
| `data/analysis/09_build_workbench_data.py` | NEW | **None** — outside app tree; 023's scope (race-map day-mode fix, auto-pause, off-route) never touches `data/analysis/` |
| `demos/workbench.html` | NEW | **None** — new file; 023 may regenerate `demos/mockup.html`, a different file |
| `demos/workbench-data.js` | NEW (generated) | **None** — new file |
| `data/analysis/workbench/README.md` | NEW | **None** |
| `demos/index.html` | EDIT (one card + one sentence + date) | **Low** — not in 023's stated scope; still diff-check against 023's landed diff before writing; if 023 touched it, rebase the one-card edit by hand |

No app/, product/, process/, STATE.md, BACKLOG.md writes. (BACKLOG status updates for B-31/B-42 are
the Product Owner/Principal's job, not yours.)

## 6. Verification environment + data staging

- Sandbox has: node 22+ (`--experimental-strip-types` works), python3 + numpy 2.4.4, python
  `playwright` + chromium (offline-launchable). **No npm installs, no tile access** — the page is
  verified structurally/DOM-wise, never visually.
- The repo snapshot is at `/mnt/user-data/uploads/Qualifire/` but **lacks most of
  `data/analysis/cache/`**. Stage it read-only from the device (live repo:
  `C:\Users\natha\Claude personal projects\Qualifire\`): load tools via ToolSearch
  `"select:mcp__remote-devices__device_stage_files,mcp__remote-devices__device_list_dir,mcp__remote-devices__device_bash"`,
  `device_list_dir` on `…\Qualifire\data\analysis\cache`, then `device_stage_files` in 3 batches
  (~127 files, ≤50/call, ~13 KB each). Also re-stage any input file you are about to depend on if
  its snapshot copy might be stale (`gates_proposal.csv`, `refs.json`, `routes.json`,
  `catalog.seed.json`) — 023 may have moved app files.
- Repo write (only after the coordinator's 023-landed go): stage-back via the coordinator's normal
  mechanism (`device_commit_files` with the five paths above). Never run git; never delete anything —
  anything superseded moves to `safe_to_delete/`, but this WP supersedes nothing physically.

## 7. Pre-resolved ambiguities (do not re-open; do not ask)

1. **New file vs "upgrade gates-check.html, do not create a new file" (B-31):** the workbench is a
   NEW page. B-31's no-new-file clause predates Nathan's workbench ask; the 19 Aug review (line 63)
   merges B-31 *into* the workbench and Nathan's cycle-024 scope ruling adopts it. `gates-check.html`
   stays untouched as the historical record; only its index card gets the one-sentence pointer.
2. **Leaflet + OSM tiles**, not MapLibre/OpenFreeMap — matches every interactive demo page;
   MapLibre rulings are app-side.
3. **Half-width = 40 m each side** (CORRIDOR_M), **arming = 50 m** (armWithinM) — engine constants,
   drawn as stated, no invention.
4. **Metres vs percent vs lat/lon in the save file:** lat/lon is authoritative; pct and metres are
   communication sugar (a replaced reference line changes length and shifts every %, review line 85).
   The next-cycle consumer projects the saved lat/lon onto the then-current engine reference to get
   exact chainage.
5. **Chainage basis:** catalog `gateSets.chainageM` is authoritative for where gates sit today; the
   4 refs.json tracks display the engine line, the other 15 display the routes.json path (labelled
   as such on the page via `lineSource`). Small (<25 m) disagreement between the two is expected and
   surfaced as builder warnings, not fixed here.
6. **Save mechanism:** browser download + Nathan moves the file to `data/analysis/workbench/` —
   the only honest `file://` mechanism, and the existing convention (basemap-capture). No localStorage,
   no clipboard-only, no server.
7. **START/FINISH draggable** but permanently flagged with the breaks-lap-history warning.
8. **Promotion picker input** is a file-input/drag-drop of a GPX from disk (the page cannot list
   folders from `file://`); the saved payload records the file name + point count + first/last point
   times so the consumer can verify identity before running `build_track_ref.ts`.
9. **σ_s/speed/stop labels** exist only for Morning/EveningA/EveningB; all other routes show `—`.
   Never fabricate a number (honesty rule).
10. **Numbering:** this WP owns `09_`; WP-H owns `10_`.

## 8. NEEDS-NATHAN

None. (Whether he *likes* the workbench and what he moves is the point of the artifact, not a
blocker.)

## 9. Rollback

All-new files: move them to `safe_to_delete/` (never delete) and revert the one `demos/index.html`
card/sentence/date edit. No app code, no schema, no stored data is touched, so rollback cannot
affect the suite.
