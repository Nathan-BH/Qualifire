# WP-H — Gate-field offline replay experiment (evidence document, zero app changes)

**Executor model:** Sonnet, no other context. Everything you need is in this brief. If a judgment
call arises that this brief does not pre-resolve, **STOP and escalate** — do not guess.

**Phase gate:** Cycle 023 is still landing on the same repo. Do NOT write any repo file until the
coordinator confirms 023 has landed. Build and verify everything in the sandbox first (this WP can be
verified end-to-end there — see §6); the repo write is the last step, on the coordinator's go.

## 1. Goal, in Nathan's words

`data/activities/TEST in app rides/qualifire-20260819/qualifire-20260819-notes.md`, point 4:

> "When ride3 picked up the w>>h-w route i was thinking about trying a new version of the app where
> instead of routes you have 'gates' scattered on the routes i take often, and they just get
> activated when i pass through them and compute section times like that … the idea is not to code
> over the existing frameworks but have a separate route design to try out. And they live side by
> side so we can test it all out before deciding on a single one."

The 19 Aug review (`…/qualifire-20260819-review.md`, §4, lines 73–80) scoped the honest first step:
**"replay the archive against a gate-field model offline and see what it would have produced — that
answers 'is this idea good?' with evidence before anyone builds live UI."** It also names the two
engineering doubts the replay must measure: a free-floating gate needs its own crossing line and
direction or it fires falsely (parallel streets, wrong direction), and a time between two gates is
only comparable when the road between them was the same. Related standing design context:
`product/ROUTING-AND-SEGMENTATION.md` §4 line 100 ("the comparison set is per sector, not per
route") and `product/DATA-MODEL.md` §8 line 173 (sector-sharing-across-ways: "tempting, and wrong to
build now" — the gate field is that thread's endpoint).

Deliverable: **a Python script + a filled plain-language evidence report + a PC launcher.** Zero app
changes. Decisions about what to build stay Nathan's.

## 2. Current state (snapshot at `/mnt/user-data/uploads/Qualifire/`, repo root paths)

- **The archive cache:** `data/analysis/cache/*.npz` — ~127 files named
  `YYYYMMDD-HHMM-{home2work|work2home}-<stravaId>.npz`; arrays `t` (epoch s, ~1 Hz), `lat`, `lon`,
  `ele`, `track` (str: `Morning` | `EveningA` | `EveningB`; load with `allow_pickle=True` as
  `02_analysis.py` line 20 does). Usable ride counts per `03_output.txt`: 64 / 32 / 29 ≈ 125 —
  "the 125 cached rides". Built by `data/analysis/01_parse.py` from `data/activity-index.csv`
  (625 lines, header `filename,strava_id,route,local_start,…,variant`). **All cached rides are on
  the home↔work corridor** — a known limitation the report must state.
- **The existing analysis machinery** (`data/analysis/02_analysis.py`): `to_xy` (line 13,
  equirectangular), `project_ride` (line 54 — D-011 windowed chainage projection, corridor 40 m),
  `kinematics` (line 90 — speed + stopped: <1.0 m/s sustained >3.0 s), `stopped_time_between`
  (line 105), `cross_time` (line 111 — first upward chainage crossing, interpolated), `mad_sigma`
  (line 121 — 1.4826·MAD). **Its data paths are hardcoded to a dead session mount**
  (`/sessions/tender-clever-ride/…`, line 7) — do not import it; copy the needed functions with a
  provenance comment.
- **The route model's own numbers to compare against** (`data/analysis/03_output.txt`): per-sector
  `med_mov_s` and `sig_clean` for the 3 tracks (e.g. Morning S1–S4 σ_clean 6.44 / 3.83 / 5.32 /
  7.07 s), plus the live-sim line ("missed on CLEAN rides: 3 (0.9%)" for Morning etc.).
- **The gate field's raw material:**
  - `app/assets/routes/routes.json` — all **19 ratified routes**; per route `path` ([[lat,lon]…],
    decimated ridden line), `gates` (5: `name`,`lat`,`lon`), `gateIdx` (gate's index into `path`).
  - `app/src/store/catalog.seed.json` — `gateSets` per route: `chainageM` (metres along the engine
    reference; Morning `[162,1312,2662,4212,5487]` — matches `gates_proposal.csv`).
  - `app/tests/fixtures/refs.json` — engine reference lines for Morning / EveningA / EveningB /
    MorningB: `{length, lat0, lon0, rx[], ry[], ch[]}` (local metres; back to lat/lon via
    `lat = lat0 + ry/110540.0`, `lon = lon0 + rx/(111320.0·cos(radians(lat0)))` — the inverse used
    at `03_gates.py` lines 60–62). All 3 cached tracks have refs — use them for the route-model side.
- **Engine constants:** corridor half-width 40 m (`CORRIDOR_M`, `app/core/src/projection.ts:12`);
  arming 50 m (`armWithinM`, `app/core/src/live.ts:48`) — offline replay has full traces, so arming
  is irrelevant here except as a report footnote.
- **Timing rulings:** D-042 — raw wall-clock time is the default truth (luck counts); moving time
  still exists for continuity with 03_output's tables. Report both (pre-resolved, §7).
- **Script/launcher conventions:** analysis scripts are numbered (`01…08` exist; **WP-C owns `09_`;
  this WP owns `10_`**). PC-side launchers live in `scripts/` as `.ps1` with a `.cmd` wrapper
  (existing: `build5.ps1` + `build5.cmd`); invocation convention
  `powershell -ExecutionPolicy Bypass -File .\x.ps1`.

## 3. The experiment (precise spec)

### 3a. NEW `data/analysis/10_gatefield_replay.py`

Python 3 + numpy only. All paths derived from `__file__` (repo root = `../..`) so it runs identically
in the sandbox, in the device VM, and on Nathan's Windows PC. Self-contained: copies of
`to_xy / project_ride / cross_time / kinematics / stopped_time_between / mad_sigma` from
`02_analysis.py` with provenance comments.

**Build the gate field.** From the 19 catalog routes: 95 gates. Per gate:
- `id = "<routeId>:<gateName>"` (e.g. `EveningB:G2`).
- Position: routes.json `gates[i]` lat/lon.
- **Direction (bearing):** the route `path` direction at the gate — bearing from
  `path[max(gateIdx-1,0)]` to `path[min(gateIdx+1,last)]` in the equirect frame.
- **Crossing line:** perpendicular segment through the gate position, ±40 m (corridor half-width).
- Everything is computed once in ONE shared equirect frame (origin = mean lat/lon over all gate
  positions; the whole field spans ~10 km — equirect error is negligible and this keeps every ride
  and every gate in the same coordinates).

**Dedup pass (reported, and used for section aggregation):** cluster gates within 30 m of each other
with bearing difference < 30° (transitive closure is fine at this size). Emit a cluster table:
`clusterId, memberGateIds, spread_m` — reversal pairs (e.g. a Morning gate vs an EveningA gate on the
same road, opposite bearings) must NOT merge (the 30° rule prevents it). Detection runs on all 95
raw gates; **section-time aggregation keys on clusterId** so five colocated copies of one physical
line don't fragment the statistics.

**Replay each cached ride (~125):** convert to the shared frame; for each consecutive fix pair
(segment), test segment-vs-gate-line intersection for every gate (vectorise over gates per segment,
or over segments per gate — either is fine; the whole job is ~18M cheap tests). At an intersection:
- crossing time `t` interpolated along the fix segment; crossing angle = angle between fix-segment
  direction and gate bearing.
- **valid hit** if angle ≤ 90°; else a **wrong-direction event** (recorded, never a hit).
- re-fire guard: the same gate cannot fire again within 60 s of its last valid hit on that ride
  (GPS jitter straddling the line); suppressed re-fires are counted separately.
Also record each fix's speed (from `kinematics`) at crossing.

**Outputs (written next to the script):**
1. `data/analysis/10_gatefield_hits.csv` — one row per event:
   `ride, track, gateId, clusterId, t_iso, kind(valid|wrong_direction|refire_suppressed),
   angle_deg, speed_kmh, own_route(bool)` (`own_route` = the gate belongs to the ride's own track:
   Morning ride ↔ Morning gates, etc.).
2. `data/analysis/10_gatefield_sections.csv` — per ride, consecutive **valid** hits (cluster-keyed):
   `ride, track, fromCluster, toCluster, raw_s, moving_s, n_between_fixes`.
3. `data/analysis/10_output.txt` — the console log (mirrors the `03_gates.py` pattern of `out()`
   to screen + file), containing at least:
   - field size: 95 gates → N clusters; cluster table summary;
   - per ride-track: valid hits per ride (median / min / max), wrong-direction events, suppressed
     re-fires, hits on **foreign** gates (`own_route == False`), split into "colocated with an
     own-route gate (same cluster)" vs "genuinely foreign" (the parallel-street/false-fire measure);
   - **section-time comparison:** for each track's own consecutive gate pairs (START→G1 … G3→FINISH,
     as clusters), the gate-field section stats (n, median raw_s, median moving_s, σ = mad_sigma of
     each) side by side with the route model on the SAME rides — route model computed in this run:
     project each ride onto its track's refs.json line (copied `project_ride`), `cross_time` at the
     catalog `chainageM` values, sector raw + moving times (this reproduces `03_output.txt`'s table
     on today's data — print both so drift is visible);
   - per-gate crossing-time agreement: for own-route gates, `Δt = t_gatefield − t_routemodel`
     distribution (median / p95 |Δt|);
   - gates never hit by any ride (expected: everything outside the home↔work corridor), listed;
   - a crossing-angle histogram (10° bins) so the 90° direction rule's headroom is inspectable;
   - **comparability check:** per section (cluster pair), the spread of ridden distance between the
     two hits across rides (median and p95 of per-ride point-to-point path length) — same road
     between gates ⇒ tight; a section whose distance spread exceeds ~10% of median is flagged
     "road between these gates varies — times not comparable" (the review's caveat, measured).
4. `data/analysis/10_gatefield_report.md` — the evidence document (see 3c).

CLI: `python3 10_gatefield_replay.py [--limit N]` (`--limit` = first N rides, for smoke tests).
Runtime target: full 125 rides in well under 5 minutes in the sandbox (it is numpy-cheap).

### 3b. NEW launcher `scripts/gatefield-replay.ps1` + `scripts/gatefield-replay.cmd`

So Nathan can reproduce on his PC where the live cache lives. `.cmd` is one line:
`powershell -ExecutionPolicy Bypass -File "%~dp0gatefield-replay.ps1"`.
`.ps1`: resolve repo root from `$PSScriptRoot`, check `python --version` and
`python -c "import numpy"` with a plain-language failure message ("this needs Python with numpy —
install from python.org, then `pip install numpy`"), then run
`python "$root\data\analysis\10_gatefield_replay.py"` and print where the four outputs landed.
(Python-on-Windows is unverified — the launcher's check message IS the mitigation; the canonical run
is the sandbox one, §6.)

### 3c. The report — `data/analysis/10_gatefield_report.md`

Written for Nathan standalone: plain language first, ids in parentheses, absolute dates, no
uncoloured claims — every number in it must come from `10_output.txt` of an actual run. Fixed
skeleton (write this structure; fill from the run):

1. **What we tested** — your gate-field idea (19 Aug notes, point 4) replayed against your own 125
   archived home↔work rides; no app was changed.
2. **The field we built** — 95 gates from the 19 ratified routes, each a 80 m crossing line with a
   direction; how many collapse into physical clusters.
3. **What fired** — hits per ride, wrong-direction and re-fire noise, false fires from other routes'
   gates: how often a parallel street or a crossing route would have beeped at you.
4. **Section times vs today's sectors** — the side-by-side table; whether free-gate sections are as
   tight (σ) as route sectors on the same rides; where they are worse and why (the road-between
   variance flags).
5. **What this suggests** — read strictly from the numbers; expected landing zone per the review:
   "gates shared across routes" rather than "no routes" — confirm or contradict with the data.
6. **What this did NOT test** — live 1 Hz phone GPS vs archive quality, GPS-arming/late-lock
   behaviour, only home↔work rides are cached (no station/church/fosh evidence), and free-ride
   recording (that is a separate build). One line: raw time is the default truth (luck counts,
   D-042); both raw and moving are reported.
7. **Provenance** — script name, run date, ride count, and the exact command to reproduce.

If (and only if) the full run cannot be completed before the repo write, ship the same file with the
skeleton and `[TO FILL — run scripts/gatefield-replay.cmd]` markers and say so in your handoff — a
half-filled report presented as complete is the one unforgivable outcome.

## 4. Tests / checks

No app-tree file is touched; the TS suite must simply hold its 023 baseline:
`cd app && node --experimental-strip-types tests/run.ts` before and after — identical counts, 0 FAIL.

Script self-checks (assertions inside `10_gatefield_replay.py`, cheap and always on):
- 19 routes × 5 gates loaded; every gate has a finite bearing; every cluster bearing-spread < 30°.
- Sanity anchor: for ≥ 90% of Morning rides, the Morning gates fire in catalog order
  (START→G1→G2→G3→FINISH) as valid hits — if not, the geometry frame or direction rule is wrong;
  abort with a message rather than emit garbage. (03's live sim: ≥ 99% of clean gate passages fire.)
- Route-model reproduction: recomputed per-sector medians within a few seconds of the
  `03_output.txt` values embedded as comments (print WARN not abort on drift — cache contents may
  legitimately differ from cycle 003).

## 5. Files touched (union)

| File | Kind | 023 conflict risk |
|---|---|---|
| `data/analysis/10_gatefield_replay.py` | NEW | **None** — 023's scope (race-map day-mode fix, auto-pause ideas, off-route investigation) is app-tree + product docs; it does not touch `data/analysis/` |
| `data/analysis/10_gatefield_hits.csv` | NEW (generated) | **None** |
| `data/analysis/10_gatefield_sections.csv` | NEW (generated) | **None** |
| `data/analysis/10_output.txt` | NEW (generated) | **None** |
| `data/analysis/10_gatefield_report.md` | NEW | **None** |
| `scripts/gatefield-replay.ps1` | NEW | **None** — `scripts/` holds build launchers only |
| `scripts/gatefield-replay.cmd` | NEW | **None** |

Inputs are read-only: `routes.json`, `catalog.seed.json`, `refs.json`, cache npz. D-023 note: raw
ride data is never rewritten — this WP only reads the cache and writes new sidecar outputs, which is
exactly the allowed shape.

## 6. Verification environment + data staging

**This WP verifies end-to-end in the sandbox** (verified 2026-08-20: sandbox python3 has numpy
2.4.4; the whole cache is ~1.7 MB). The snapshot at `/mnt/user-data/uploads/Qualifire/` lacks the
cache except one sample npz — stage it: load device tools via ToolSearch
`"select:mcp__remote-devices__device_stage_files,mcp__remote-devices__device_list_dir,mcp__remote-devices__device_bash"`,
`device_list_dir` on `C:\Users\natha\Claude personal projects\Qualifire\data\analysis\cache`, then
`device_stage_files` in 3 batches (~127 files, ≤50 paths/call). Also re-stage `refs.json`,
`routes.json`, `catalog.seed.json` if the coordinator says 023 moved them.

Run order: `--limit 5` smoke → full run → fill the report from `10_output.txt`. Fallback only if
sandbox staging fails: the device VM also has python3 + numpy 2.2.6 and the live mount
(`$HOME/mnt/Qualifire`), but `device_bash` calls cap at 45 s — use `--limit` chunks there, and
NEVER write into the mount this phase. Repo write happens once, after the coordinator's 023-landed
go, via the normal commit mechanism. Never run git.

## 7. Pre-resolved ambiguities (do not re-open)

1. **Design-only vs run:** the cycle scope calls WP-H an *evidence document* — so the executor DOES
   run the replay (in the sandbox, on staged read-only data) and ships a filled report; "don't run
   it" bound the brief-writer, not you. The launcher exists so Nathan can reproduce on his PC.
2. **Gate direction rule:** valid ≤ 90° from the route bearing at the gate; the angle histogram in
   the output makes the threshold inspectable. No second tunable pass.
3. **Re-fire guard 60 s**, cluster merge **30 m / 30°**, line half-width **40 m** (= CORRIDOR_M):
   fixed parameters, stated in the report; sensitivity analysis is out of scope.
4. **Raw AND moving section times** are both computed; raw is presented first (D-042: luck counts),
   moving is kept so the numbers line up with the historical `03_output.txt` tables.
5. **Route-model comparison basis:** recomputed in this run on the same rides with refs.json lines +
   catalog chainages — never copy 03's numbers as if they were this run's.
6. **Only 3 tracks have cached rides:** gates of the other 16 routes stay in the field (their false-
   fire behaviour on home↔work rides is precisely part of the evidence); their never-hit status is
   reported, not treated as failure.
7. **No GPX re-parsing:** the npz cache is the input (D-023: derive, never rewrite); do not touch
   `data/activities/`.
8. **Numbering:** this WP owns `10_`; WP-C owns `09_`. Report file is `10_gatefield_report.md`
   (numbered like its siblings), not a product/ doc — it is analysis evidence, and product/ files
   have owner restrictions.

## 8. NEEDS-NATHAN

None to start. The report ends with the decision that IS his (adopt gates-shared-across-routes /
prototype live / drop it) — listed as his call, no recommendation dressed as fact.

## 9. Rollback

All-new files; move to `safe_to_delete/` (never delete). No app code, no stored data, no schema
touched; the suite cannot be affected.
