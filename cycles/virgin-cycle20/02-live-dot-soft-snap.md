# 02 — Live rider dot: soft snap to the reference line (display only)

**Source: Nathan, 2026-09-30** — while riding, the LIVE rider dot on the RECORD map should sit
*on* the route's reference line when the rider is on it, ease off the line smoothly as the rider
drifts away, and become the raw GPS point once clearly off-route — so a real detour shows at
once. General rule for every route and every user; **nothing recorded changes**: fixes, timing,
gate detection, chainage and everything on disk stay exactly as they are. Only the DRAWN dot
position moves.

> ## Ruling + re-anchor (Plan tier, 2026-10-03 — read this first)
> The first executor stopped (correctly) on §2(h): brief 06 of this cycle introduced the
> **display candidate** (`displayCand()` = the lock, else the pick's own candidate before the
> lock; `LiveEngineState.displayTrack`), and `chainageM` now reads `disp`, not `this.locked`.
> **Ruling: option (b) — `riderSnap: this.riderSnapOf(disp)`**, i.e. the rider dot snaps to the
> DISPLAY candidate's reference, exactly like `chainageM`/`startGateT`/`currentSector` do.
> Why: under a RECORD-tab pick the running map already draws the picked way's line from START
> (`liveMapOverlayFor({ track: live.track, wayHint: rideWayHint })` — the START-frozen pick is
> the `wayHint`), and the pick's candidate has that very reference (`cands.find(c.track ===
> pick)`), so snapping to it pre-lock puts the dot on the line that is on screen — Nathan's
> goal ("a visually correct dot on the route during a ride"). Option (a) would leave the dot
> wobbling beside a drawn line for the first ~400 m of every picked ride (the exact lag brief
> 06 removed). With no pick, `displayCand()` is `locked` → identical to (a). After `finalize()`
> leaves the ride unmatched (`ended`) → null → raw. `riderSnapOf` only reads `c.ref` and
> `c.lastSnap`, both on the Candidate `displayCand()` returns — no lock/corridor data needed.
> Decision 2, §2(b)/(h), §3 comments, §4's engine test and the checklist are rewritten below.
> Every anchor was re-read against the CURRENT tree (briefs 04, 01, 03, 05, 08, 06, 07, 10, 11
> applied, uncommitted). Measured on this tree: **812 tests / 809 pass / 0 fail / 3 skip, `tsc
> --noEmit` exit 0** = the new "before" baseline. Expected after: **820 / 817 / 0 / 3** (+8).
> The whole brief as written below was dry-run by the Plan tier on a scratch copy of `app/`:
> 820/817/0/3, `tsc` exit 0, the "failed-before" check fails exactly one test when §2(g) is
> commented out. Two defects in the original text were fixed in that dry run and are already
> corrected below — do not re-derive them: (1) `riderdot_suite.ts` must import the engine with
> the repo's **dynamic** `await import('../src/live/engine.ts')` (live_suite.ts 30-40,
> catalogstore_suite.ts 37): the engine pulls in `refs.json` via `src/live/refs.ts`, which plain
> Node only loads once live_suite's `registerHooks` JSON shim is installed; a static import
> hoists past the hook → `ERR_IMPORT_ATTRIBUTE_MISSING`. (2) the purity test greps the module
> source for `Date\.now`, so the module header must not contain that literal (it now says
> "no clock reads"). All files touched are **LF**; keep them LF.

**Status: brief only. Nothing below is in the app.** Written 2026-09-30 by the Plan tier
(Fable) against the working tree (branch `virgin`, HEAD `ae911bb`); **re-anchored 2026-10-03**
against the tree with briefs 04/01/03/05/08/06/07/10/11 applied (measured: **812 tests / 809
pass / 0 fail / 3 skip**). Line numbers in the Evidence section are the re-read 2026-10-03
numbers. Executor: Sonnet, cold, this file only.

## What this changes on the phone — and what it does not

- **Stays exactly as today:** the raw JSONL (every fix, verbatim), `status.lastLat/lastLon`
  themselves, engine chainage / gate fires / sector and lap times, the GPX+ sidecar, the
  breadcrumb trail (`trail`, raw fixes), the stationary ("stopped") detection (`lastFixRef`, raw
  fixes), the self/ghost replay dots (`selfDots`), the pre-start map (rack) and the finished-map
  behaviour, the rider dot's off-route inversion rule (`OFF_WAY_M = 120` in `wayMapView.tsx` —
  the drawn point is never further than 30 m from the raw one, so that rule sees the same
  distances it sees today beyond 30 m and strictly smaller ones below).
- **Changes (RECORD, running phase only):** the dot passed to `WayMapView` is the *drawn*
  position: on the reference line when cross-track distance `xtd <= 12 m`, blended linearly
  towards the raw fix between the fade start and 30 m, and *exactly* the raw fix at `>= 30 m`.
  With hysteresis: once glued, the dot stays glued up to 20 m before it starts easing off.
  Before the engine has a display candidate (`live.displayTrack === null`: no pick and no
  lock yet, or the ride ended unmatched), or when the projector's search window is empty, the
  dot is raw — as today. Under a RECORD-tab pick the display candidate exists from START
  (brief 06), so the dot is on the picked line — which the map already draws — from the first
  fed fix; with no pick it starts snapping at the lock. Because the map's
  course-up bearing and follow camera read the same `lat/lon` props, they follow the drawn point
  too (on-route: the heading follows the line instead of GPS wobble — a side benefit, not a
  separate change).
- **JS only → shippable OTA** via `scripts/publish-preview.ps1` (no native module, no
  `app.json` / `app.config.js` / plugin / `res/` change → the `@expo/fingerprint` hash does not
  move). No new settings toggle (Decision 7).

## Evidence (read 2026-09-30, line numbers re-read 2026-10-03)

- **Rider dot source.** `app/src/location/index.ts` lines 64-68 (`TrackerStatus`):
  ```ts
    lastFixMs: number | null;
    /** last fix position — display only (the live map's dot); never persisted
     * here, the raw JSONL remains the only record (D-023). */
    lastLat: number | null;
    lastLon: number | null;
  ```
  set at lines 244-246 (`lastFixMs = loc.timestamp; lastLat = …; lastLon = …;`) right after the
  raw append and BEFORE the engine is fed (comment at line 271-272: "Live sectors (cycle 006):
  display-only derived state, fed AFTER the raw append"). So for any one fix, `status.lastLat/
  lastLon` and the engine's snapshot describe the same fix.
- **Where RECORD draws it.** `app/src/ui/RecordScreen.tsx`:
  - line 35 `import { liveEngine, type LiveEngineState } from '../live/engine';`
  - line 43 `import { appendTrailPoint, type TrailPoint } from './trailModel';`
  - line 239 `const [live, setLive] = useState<LiveEngineState>(liveEngine.getState());`
  - line 368 `useEffect(() => liveEngine.subscribe(setLive), []);`
  - lines 376-385 — `lastFixRef` / `lastMovedRef` stationary detection on raw
    `status.lastLat/lastLon` (**untouched**).
  - lines 392-397 — the trail effect:
    ```ts
      useEffect(() => {
        if (!session) return;
        if (status.lastLat === null || status.lastLon === null) return;
        if (status.lastFixMs === null || status.lastFixMs < session.startedAtMs) return;
        setTrail((prev) => appendTrailPoint(prev, status.lastLat as number, status.lastLon as number));
      }, [status.lastLat, status.lastLon, status.lastFixMs, session]);
    ```
  - lines 618-621 (inside `onStart`):
    ```ts
        lastMovedRef.current = null;
        lastFixRef.current = null;
        // WP-J: a fresh ride must not inherit the previous one's trail either.
        setTrail([]);
    ```
  - line 1020 `const mapOverlay = liveMapOverlayFor({ track: live.track, wayHint: rideWayHint });`
    (`recordFlow.ts` 82-88: `wayId = track ?? wayHint` — under a pick the picked way's line is
    drawn from START, before any lock).
  - lines 1346-1359 — the RUNNING-phase map (the only one this brief changes; brief 08 removed
    the `settings.liveMap ?` wrapper — the map is unconditional now):
    ```tsx
            <View style={{ flex: 1, minHeight: 220, alignSelf: 'stretch' }}>
              <WayMapView
                wayId={mapOverlay.wayId}
                lat={status.lastLat}
                lon={status.lastLon}
                zoom={4}
                gateColours={undefined}
                sectorColours={sectorColours}
                trail={mapOverlay.showTrail ? trail : undefined}
                selfs={settings.selfDots ? selfDots : undefined}
                variant="live"
                liveState={live.phase === 'finished' ? 'finished' : (stationary ? 'stopped' : 'moving')}
                fill
              />
    ```
  - Two other `WayMapView`s pass `lat={status.lastLat} lon={status.lastLon}`: lines 1200-1202
    (armed, `zoom={1}`) and 1468-1470 (the rack, `zoom={1}`). **Both untouched** — no
    reference is projected before a ride. `zoom={4}` occurs exactly once in the file.
- **Map consumer.** `app/src/ui/wayMapView.tsx` line 177-178 `const OFF_WAY_M = 120;`
  ("Beyond this the rider is drawn as off-route rather than on the line"); line 195
  `const BEARING_MIN_MOVE_M = 8;`; lines 212-213 `lat: number | null; lon: number | null;`;
  line 881 `<M.GeoJSONSource key="rider" id="rider" data={riderFeature(props.lat as number, props.lon as number)}>`;
  the bearing effect at lines 413-425 reads `props.lat/lon`. Not edited.
- **Engine.** `app/src/live/engine.ts`:
  - lines 101-113 import block:
    ```ts
    import {
      DEFAULT_LIVE_OPTIONS,
      GateDetector,
      LiveProjector,
      computeKinematics,
      projectRideOffline,
      sectorTimes,
      stoppedTimeBetween,
      toXY,
      type GateEvent,
      type RefLine,
      type TrackId,
    } from '../../core/src/index.ts';
    ```
  - lines 315-327 (end of `LiveEngineState`) — brief 06 appended `displayTrack` after `chainageM`:
    ```ts
      chainageM: number | null;
      /** virgin-cycle20 06: the candidate whose live progress is on screen — `track`
       …
      displayTrack: TrackId | null;
    }
    ```
    (line 318 `  chainageM: number | null;`, line 326 `  displayTrack: TrackId | null;`, line 327 `}`).
  - lines 347-350 (end of `interface Candidate`):
    ```ts
      /** WP-G Part 2 gap-fill: this candidate's own cross-track deviation (m) at
       * its most recent fed fix (LiveFix.xtd verbatim) — surfaced in diagnostics. */
      lastXtd: number;
    }
    ```
  - lines 410-423 `start()` builds each candidate literal ending `      lastXtd: 999,` (line 422) / `    }));` (line 423)
  - line 503 (cycle-023 re-anchor block) `          c.lastXtd = 999; // fresh candidate: nothing fed yet this instant`
  - lines 653-696 `getState()`: line 656 `const disp = this.displayCand();` (brief 06); the
    return literal (679-695) ends
    `      chainageM: disp ? disp.proj.chainage : null,\n    };` (694-695); line 698 `subscribe(fn: …`.
  - lines 743-747 `displayCand()`: `if (this.locked) return this.locked; if (this.pick === null
    || this.ended) return null; return this.cands.find((c) => c.track === this.pick) ?? null;`
    — returns a full `Candidate` (ref, proj, det, events, lastXtd …), so anything stored on the
    candidate is readable for the display candidate.
  - lines 867-876 `feedCandidate`:
    ```ts
      private feedCandidate(c: Candidate, lat: number, lon: number, tSec: number): GateEvent[] {
        // Per-fix planar transform in this candidate's track frame (same toXY as
        // the parity pipeline; two tiny arrays per call — negligible at 1 Hz).
        const xy = toXY([lat], [lon], c.ref.lat0, c.ref.lon0);
        const sBefore = c.proj.chainage;
        // WP-D (cycle 2): the PREVIOUS fix's verdict — c.onRoute is only rewritten
        // below, but read it here explicitly so the ordering is not load-bearing.
        const wasOnWay = c.onWay;
        const fix = c.proj.update(xy.x[0], xy.y[0], tSec);
        c.lastXtd = fix.xtd; // WP-G Part 2 gap-fill: per-candidate deviation for diagnostics
    ```
  - `this.locked` (line 365) is the lock; `track: this.locked ? this.locked.track : null` (line 680)
    and `displayTrack: disp ? disp.track : null` (line 681). Since brief 06 the positional state
    (`currentSector`, `lastDone`, `startGateT`, `chainageM`) reads the DISPLAY candidate; `track`
    and `gateFires` keep the lock rule. There are no mid-ride switches of the lock.
- **What the projector exposes — and does not.** `app/core/src/live.ts` lines 51-58:
  `LiveFix = { s /* monotonic chainage */, xtd /* cross-track m, 999 if window empty */, onRoute }`.
  `s` is the *monotonic* `sp` (`this.sp = Math.max(this.sp, hit.s)` line 96), NOT the chainage of
  the nearest point — the nearest hit's chainage (`hit.s`) is never returned. Search window
  (lines 88-92): `lo = searchsortedLeft(ch, sp - windowBack)`, `hi = searchsortedLeft(ch, sp + windowFwd)`,
  `lo = max(0, lo-1)`, `hi = min(nseg, hi)`, empty → `{ s: sp, xtd: 999, onRoute: false }`.
  `DEFAULT_LIVE_OPTIONS` (lines 41-49): `corridor: CORRIDOR_M` (= 40, `projection.ts` line 12),
  `windowBack: 30`, `windowFwd: 240`. **Core is not edited** (parity-proven module; Decision 1).
- **Core helpers, all exported through `app/core/src/index.ts` (`export *` of geo/projection/live):**
  `nearestOnSegments(px, py, ref, lo, hi): { s, dist }` (`projection.ts` lines 29-52 — `s` is
  `ch[j] + t * seglen`, the true chainage of the nearest point); `searchsortedLeft` (`geo.ts` line 35);
  `interp1(q, xp, fp)` (`geo.ts` line 46, np.interp on increasing `xp`, handles `dx === 0`);
  `xyToLatLon(x, y, lat0, lon0): [lat, lon]` (`geo.ts` lines 28-33 — exact inverse of `toXY`).
- **RefLine** (`app/core/src/types.ts` lines 19-28): `{ rx, ry, ch: Float64Array; lat0; lon0; length }`
  — planar metres in the track-local equirectangular frame about `(lat0, lon0)`; `ch[k]` is the
  cumulative chainage at vertex `k`. Reference lines are 5 m-resampled (`reference.ts` line 64/91),
  so the point at chainage `s` is `(interp1(s, ch, rx), interp1(s, ch, ry))` and back to degrees via
  `xyToLatLon`. Same shape for catalog refs and user refs (`app/src/live/userRefs.ts` line 93
  `const ref: RefLine = { rx, ry, ch, lat0, lon0, length };`).
- **Pure-module precedent:** `app/src/location/rideNotificationPolicy.ts` (header: "PURE — no
  expo / react-native import, so tests/… can drive it under plain Node") and
  `app/src/ui/trailModel.ts` (header: "No react-native, no maplibre imports — headless-testable").
  Test harness: `app/tests/lib.ts` exports `test(name, fn)`, `assert(cond, msg)`, `TESTS_DIR`;
  suites are registered by import in `app/tests/run.ts` (last suite import: line 62
  `import './ridenotification_suite.ts';`, then line 63 `import { runAll } from './lib.ts';`).
  Suites reach core via a static `../core/src/index.ts` import but the engine ONLY via the
  dynamic `await import('../src/live/engine.ts')` after live_suite's JSON `registerHooks` shim
  (`tests/live_suite.ts` 30-40, `catalogstore_suite.ts` 37) — see the Ruling block.
  `TrackSpec = { id: string; ref: RefLine; gates: number[] }`; `new LiveEngine(specs)` injects
  them; `start({ pickId })` (`EngineStartOptions`, line 210-215) seeds the RECORD-tab pick.
- **Lock rule for the engine test** (`evaluateLockState`): with no pick and a single
  candidate, a `verified` lock commits the first fix at which that candidate's corridor-verified
  advance reaches `LOCK_MIN_ADVANCE_M = 400` (line 116; `export class LiveEngine` line 358).
  `getState().track` is null before that — and with no pick so is `displayTrack`.
- **Existing state-literal helpers** (`tests/live_colour_suite.ts`, `tests/rankingreveal_suite.ts`,
  `tests/resultsstore_suite.ts`, `tests/timing_suite.ts`) build `LiveEngineState` through an
  `as LiveEngineState` cast — adding a required field to the interface does NOT break `tsc` for
  them (a cast tolerates missing members; confirmed in the 2026-10-03 dry run). Left untouched
  (Open call B).
- **Snapshot pins already protect "raw truth":** `tests/engine_suite.ts` replays nine fixtures
  through core and compares gate sequences / sector times against committed snapshots ("Any
  behavioural change in core shows up here as a FAIL"); `tests/live_suite.ts` pins the engine's
  emits, lock events and `getState()` mirror. If this brief accidentally changed chainage, gates or
  timing, those suites fail — that is the regression net, not a new assertion.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor above was read from the tree on 2026-09-30. If a quoted
  line is not where the brief says, or a name differs, stop and report the mismatch verbatim
  (file, line, expected, found). Never guess, never patch around it.
- No commit unless told (`GIT_OPTIONAL_LOCKS=0 git …`; a leftover `.git/index.lock` is
  `mv`'d aside, never deleted). **Never delete** — `safe_to_delete/` is the bin; `mv`, never `rm`.
- No `npm install`, no `npx …`, no `eas …`. Verification is the headless suite + `tsc` only.
- **Files touched — exactly these, nothing else:**
  - NEW  `app/src/ui/riderDotModel.ts` (pure)
  - NEW  `app/tests/riderdot_suite.ts`
  - EDIT `app/tests/run.ts` (one import line)
  - EDIT `app/src/live/engine.ts` (additive, display-only exposure)
  - EDIT `app/src/ui/RecordScreen.tsx` (one import, one ref + one state, one effect, one reset
    line, two prop values on ONE `WayMapView`)
- Do **not** touch: anything under `app/core/` (parity module), `app/src/ui/wayMapView.tsx`,
  `wayMapGeo.ts`, `trailModel.ts`, `selfRaceModel.ts`, `liveView.tsx`, `app/src/location/*`,
  `userRefs.ts`, `tracks.ts`, any fixture under `app/tests/fixtures/`, any existing suite file,
  `settings.ts`, `app.json`, `app.config.js`, `eas.json`, `package.json`, `node_modules/`,
  `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, this folder's other files.

## Goal

While a ride is running and the engine has a display candidate (`displayTrack !== null`), the RECORD map's rider dot is
drawn from `riderDotStep(...)` — on the reference line within 12 m, blended between the fade
start and 30 m, exactly raw at ≥ 30 m, with the glued state held up to 20 m — and from the raw
fix otherwise. The headless suite pins the rule (snap / fade / raw / hysteresis / null /
determinism) and the engine's additive `riderSnap` exposure; every existing engine and live
snapshot test still passes unchanged (proof that timing and chainage did not move).

## Decisions

1. **Where the projected point comes from: the engine computes it, display-only, next to the
   projector — core is untouched.** `LiveFix.s` is the monotonic chainage, not the nearest
   point, and the nearest hit's chainage never leaves `LiveProjector.update()`. Rather than
   widen `LiveFix` (a parity-proven core type that `engine_suite` / `live_suite` replay against
   committed snapshots), `feedCandidate` re-runs `nearestOnSegments` over the projector's own
   window — centred on the *post-update* `c.proj.chainage`, width `[-windowBack, +windowFwd]`
   from `DEFAULT_LIVE_OPTIONS` — and stores `{ s: hit.s, xtdM: hit.dist }` on the candidate.
   Why post-update: for an on-route fix the projector's hit satisfies `sp_old - 30 <= hit.s <= sp_new`,
   so it lies inside the post-update window; for an off-route fix `sp` is unchanged (same
   window); after a D-016(a) re-acquisition the window is centred on the re-acquired vertex, so
   the display projection lands right where the projector just landed (with the pre-update
   `sBefore` it would lag one fix). Cost: one extra O(window ≈ 54 segments) scan per candidate
   per fix at 1 Hz — the projector already does the same scan; negligible. Nothing this computes
   is read by `update()`, `GateDetector`, `recompute()` or the lock race.
2. **Exposure: one additive field `riderSnap: { lat, lon, xtdM } | null` on `LiveEngineState`,
   for the DISPLAY candidate (`displayCand()`, brief 06) — ruled 2026-10-03.** `getState()`
   converts the stored `{ s, xtdM }` to degrees with `interp1(s, ch, rx)`, `interp1(s, ch, ry)`,
   `xyToLatLon(x, y, lat0, lon0)` — the exact inverse of the `toXY` the fix went through, so on
   a perfectly on-line fix the round trip is the raw fix to sub-mm. Null when `displayTrack` is
   null (no pick and no lock yet; or the ride ended unmatched), and when the projector's window
   was empty (`hi <= lo`). Under a pick it is present from the first fed fix — the same source
   `chainageM` reads, and the same line the map already draws (`wayHint`).
   The `xtdM` exposed is the display hit's distance (equal to `LiveFix.xtd` for a normal
   windowed fix; the diagnostics field `lastXtd` stays exactly `fix.xtd` as before).
3. **Thresholds (metres), pinned as exported constants of the pure module:**
   `SNAP_ENGAGE_M = 12`, `SNAP_RELEASE_M = 20`, `SNAP_RAW_M = 30`. Justification from the
   code's own constants: the reference is built from a ride's own fixes, smoothed and 5 m
   resampled (`reference.ts`), so a rider on the same road is a lane-width (~3.5 m) to a
   two-lane offset (~7-10 m) from it — 12 m covers "same road, either lane" and stays below
   `armWithinM = 50` / `POOR_ACCURACY_M = 50` so a poor fix is never glued by accident;
   `RAW = 30` equals `windowBack` and stays under `CORRIDOR_M = 40`, so the dot is already
   fully honest (raw) *before* the engine stops counting the fix as on-route — a detour is
   visible at once, never masked by the corridor; `RELEASE = 20` sits midway, leaving a 10 m
   ramp (20 → 30) on the way out. Nathan's "~10-15 / ~30" brackets are respected.
4. **The rule (pure, deterministic, two-state hysteresis with continuous output).**
   State is `mode: 'free' | 'snapped'`. Per fix:
   - no snap (`null`, non-finite, or negative `xtdM`) → drawn = raw, `mode = 'free'`, `weight = 1`;
   - `mode === 'free'` and `xtdM <= SNAP_ENGAGE_M` → `mode = 'snapped'`;
     `mode === 'snapped'` and `xtdM >= SNAP_RAW_M` → `mode = 'free'`;
   - fade start `lo = mode === 'snapped' ? SNAP_RELEASE_M : SNAP_ENGAGE_M`;
     `weight = 0` if `xtdM <= lo`, `1` if `xtdM >= SNAP_RAW_M`, else `(xtdM - lo) / (SNAP_RAW_M - lo)`;
   - drawn = `weight === 0` → the projected point exactly; `weight === 1` → the raw fix
     **exactly** (same numbers, no arithmetic); else `snap + weight * (raw - snap)` per
     coordinate (linear in degrees is fine over ≤ 30 m).
   Continuity at both transitions is by construction: free → snapped happens at
   `xtdM <= ENGAGE` where both ramps give 0; snapped → free at `xtdM >= RAW` where both give 1.
   So the dot never jumps at a mode change, and while glued it ignores wobble up to 20 m
   (no flicker between "on the line" and "just off"); approaching from off-route it eases in
   continuously and glues at 12 m. Re-running the step with the same input is idempotent
   (React StrictMode / memo re-runs are safe).
5. **Where it plugs in: `RecordScreen.tsx` only, running-phase map only.** A `useRef` holds the
   hysteresis state, a `useState` holds the drawn point, one effect on
   `[status.lastLat, status.lastLon, live.riderSnap]` runs the step (same shape as the trail
   effect right above it), `onStart` resets both (same spot as `lastFixRef`), and the running
   `WayMapView` gets `lat={riderDot?.lat ?? status.lastLat}` / `lon={riderDot?.lon ?? status.lastLon}`.
   Everything else that reads `status.lastLat/lastLon` (stationary detection, trail, `hasFix`,
   `detected`, the rack and armed maps) keeps reading raw.
6. **Self/ghost replay dots untouched** (`selfDots` prop unchanged; `selfRaceModel.ts` not opened).
7. **No settings toggle.** It would need `settings.ts`, the SETTINGS screen and a test — not
   "trivially cheap" — and the rule falls back to raw by itself whenever it has nothing honest
   to say. If Nathan wants to compare, the constants are one place.
8. **Tests: one new suite, eight tests, registered in `run.ts`** (Nathan's "unit tests under
   app/tests/"): 784 → 792 if nothing else landed first.

## Files to touch

### 1. NEW `app/src/ui/riderDotModel.ts`

```ts
/**
 * virgin-cycle20 brief 02 (Nathan 2026-09-30): where the LIVE rider dot is
 * DRAWN — softly snapped to the route's reference line when close, blended
 * towards the raw GPS fix as the rider drifts, exactly the raw fix once
 * clearly off-route. PURE: no react / react-native / expo imports, no clock
 * reads, no randomness — tests/riderdot_suite.ts drives it under plain Node.
 *
 * Display only. Nothing here feeds chainage, gates, timing, the trail, the
 * stationary rule or the raw JSONL (D-023): the engine exposes the projected
 * point as a read-only mirror (LiveEngineState.riderSnap) and this module
 * decides what to draw from it.
 *
 * Thresholds (metres of cross-track distance, `xtdM`):
 *  - SNAP_ENGAGE_M  12: from 'free', at or under this the dot glues to the line
 *                       (same road, either lane; well under armWithinM /
 *                       POOR_ACCURACY_M = 50 so a poor fix never glues by accident);
 *  - SNAP_RELEASE_M 20: while glued, the dot stays exactly on the line up to
 *                       here (hysteresis — no flicker on a wide road);
 *  - SNAP_RAW_M     30: at or beyond this the dot IS the raw fix (= windowBack,
 *                       below CORRIDOR_M = 40 so a detour shows before the engine
 *                       even stops counting the fix as on-route).
 * The two ramps ([ENGAGE, RAW] when free, [RELEASE, RAW] when glued) both give
 * 0 at the engage point and 1 at the raw point, so a mode change never jumps.
 */

export const SNAP_ENGAGE_M = 12;
export const SNAP_RELEASE_M = 20;
export const SNAP_RAW_M = 30;

/** The engine's display-only projection of the last fix (LiveEngineState.riderSnap). */
export interface RiderSnapInput {
  lat: number;
  lon: number;
  /** cross-track distance of the raw fix from the reference line, metres */
  xtdM: number;
}

export type RiderDotMode = 'free' | 'snapped';

export interface RiderDotState {
  mode: RiderDotMode;
}

export interface RiderDotResult {
  state: RiderDotState;
  /** the position to DRAW */
  lat: number;
  lon: number;
  /** 0 = exactly the projected point, 1 = exactly the raw fix, else the blend factor */
  weight: number;
}

export function initialRiderDotState(): RiderDotState {
  return { mode: 'free' };
}

/** Blend weight for a given deviation in a given mode (0 = on the line, 1 = raw). */
export function snapWeight(xtdM: number, mode: RiderDotMode): number {
  const lo = mode === 'snapped' ? SNAP_RELEASE_M : SNAP_ENGAGE_M;
  if (xtdM <= lo) return 0;
  if (xtdM >= SNAP_RAW_M) return 1;
  return (xtdM - lo) / (SNAP_RAW_M - lo);
}

function usable(snap: RiderSnapInput | null): snap is RiderSnapInput {
  return snap !== null
    && Number.isFinite(snap.lat) && Number.isFinite(snap.lon)
    && Number.isFinite(snap.xtdM) && snap.xtdM >= 0;
}

/** One fix in, one drawn position out. Deterministic and idempotent: the same
 * (prev, raw, snap) always yields the same result, and feeding a result's
 * state back with the same input yields it again. */
export function riderDotStep(
  prev: RiderDotState,
  rawLat: number,
  rawLon: number,
  snap: RiderSnapInput | null,
): RiderDotResult {
  if (!usable(snap)) {
    return { state: { mode: 'free' }, lat: rawLat, lon: rawLon, weight: 1 };
  }
  let mode = prev.mode;
  if (mode === 'free' && snap.xtdM <= SNAP_ENGAGE_M) mode = 'snapped';
  else if (mode === 'snapped' && snap.xtdM >= SNAP_RAW_M) mode = 'free';
  const weight = snapWeight(snap.xtdM, mode);
  if (weight >= 1) return { state: { mode }, lat: rawLat, lon: rawLon, weight: 1 };
  if (weight <= 0) return { state: { mode }, lat: snap.lat, lon: snap.lon, weight: 0 };
  return {
    state: { mode },
    lat: snap.lat + weight * (rawLat - snap.lat),
    lon: snap.lon + weight * (rawLon - snap.lon),
    weight,
  };
}
```

### 2. EDIT `app/src/live/engine.ts`

(a) Import block (lines 101-113) — add four names, keeping the alphabetical style. Replace
```ts
  computeKinematics,
  projectRideOffline,
  sectorTimes,
  stoppedTimeBetween,
  toXY,
```
with
```ts
  computeKinematics,
  interp1,
  nearestOnSegments,
  projectRideOffline,
  searchsortedLeft,
  sectorTimes,
  stoppedTimeBetween,
  toXY,
  xyToLatLon,
```

(b) `LiveEngineState` — after line 326 `  displayTrack: TrackId | null;` (the last member;
before the closing `}` on line 327) add:
```ts
  /** virgin-cycle20 brief 02: DISPLAY-ONLY nearest point on the DISPLAY
   *  candidate's reference (displayCand(): the lock, else the pick's own
   *  pre-lock candidate — the same candidate chainageM reads) for the live
   *  rider dot — degrees of the projection of the last fed fix plus that fix's
   *  cross-track distance (m). null whenever `displayTrack` is null, or the
   *  projector's search window was empty for that fix. A read-only mirror like
   *  chainageM: never feeds chainage, gates or timing (those read LiveProjector
   *  exactly as before). ui/riderDotModel.ts decides what to draw from it. */
  riderSnap: { lat: number; lon: number; xtdM: number } | null;
```

(c) `interface Candidate` — after line 349 `  lastXtd: number;` (before the closing `}`) add:
```ts
  /** virgin-cycle20 brief 02: display-only nearest point of the last fed fix
   * on this candidate's reference — chainage of the hit (NOT the monotonic
   * projector chainage) and its distance. null = no fix yet / empty window. */
  lastSnap: { s: number; xtdM: number } | null;
```

(d) Module-level helper — insert immediately BEFORE `const N_SECTORS_DEFAULT = 4;` (line 352):
```ts
/** virgin-cycle20 brief 02: the rider-dot projection. Re-runs the projector's
 * own windowed nearest-segment search — window [sp - windowBack, sp + windowFwd]
 * around the candidate's CURRENT (post-update) chainage, same lo/hi arithmetic
 * as core/live.ts LiveProjector.update — and returns the hit's TRUE chainage
 * and distance, unclamped by monotonicity. Never fed back into the projector,
 * the gate detector or recompute(): a display mirror only. */
function displayProjection(ref: RefLine, sp: number, x: number, y: number): { s: number; xtdM: number } | null {
  const { ch } = ref;
  const nseg = ch.length - 1;
  let lo = searchsortedLeft(ch, sp - DEFAULT_LIVE_OPTIONS.windowBack);
  let hi = searchsortedLeft(ch, sp + DEFAULT_LIVE_OPTIONS.windowFwd);
  lo = Math.max(0, lo - 1);
  hi = Math.min(nseg, hi);
  if (hi <= lo) return null;
  const hit = nearestOnSegments(x, y, ref, lo, hi);
  return { s: hit.s, xtdM: hit.dist };
}
```

(e) `start()` candidate literal — after `      lastXtd: 999,` (line 422) add `      lastSnap: null,`.

(f) Re-anchor block — after line 503 `          c.lastXtd = 999; // fresh candidate: nothing fed yet this instant`
add `          c.lastSnap = null;` (the same fix is fed right after and overwrites it; kept for
symmetry with `lastXtd`).

(g) `feedCandidate` — after line 876
`    c.lastXtd = fix.xtd; // WP-G Part 2 gap-fill: per-candidate deviation for diagnostics`
add:
```ts
    // virgin-cycle20 brief 02: display-only rider-dot projection around the
    // chainage the projector just settled on (see displayProjection).
    c.lastSnap = displayProjection(c.ref, c.proj.chainage, xy.x[0], xy.y[0]);
```
`fix`, `sBefore`, `wasOnWay` and every line after are unchanged.

(h) `getState()` — **ruled 2026-10-03 (option b): pass `disp`, the display candidate already
bound at line 656 `const disp = this.displayCand();`, not `this.locked`.** Replace (lines 694-695)
```ts
      chainageM: disp ? disp.proj.chainage : null,
    };
```
with
```ts
      chainageM: disp ? disp.proj.chainage : null,
      riderSnap: this.riderSnapOf(disp),
    };
```
and add this private method directly after `getState()` (i.e. before `  subscribe(fn: …`, line 698):
```ts
  /** virgin-cycle20 brief 02: the display candidate's last display projection
   * in degrees — interp1 over the 5 m-resampled reference gives the exact point
   * on the hit segment; xyToLatLon is the inverse of the toXY the fix went
   * through. Pure read of stored state; no projector call. */
  private riderSnapOf(c: Candidate | null): LiveEngineState['riderSnap'] {
    if (!c || c.lastSnap === null) return null;
    const { ref } = c;
    const x = interp1(c.lastSnap.s, ref.ch, ref.rx);
    const y = interp1(c.lastSnap.s, ref.ch, ref.ry);
    const [lat, lon] = xyToLatLon(x, y, ref.lat0, ref.lon0);
    return { lat, lon, xtdM: c.lastSnap.xtdM };
  }
```
Nothing else in `engine.ts` changes: `LiveProjector`, `GateDetector`, `recompute()`, the lock
race, `emit()` and every event are byte-identical.

### 3. EDIT `app/src/ui/RecordScreen.tsx`

(a) After line 43 `import { appendTrailPoint, type TrailPoint } from './trailModel';` add:
```ts
import { initialRiderDotState, riderDotStep, type RiderDotState } from './riderDotModel';
```

(b) After the trail effect (line 397 `  }, [status.lastLat, status.lastLon, status.lastFixMs, session]);`) add:
```tsx
  // virgin-cycle20 brief 02: where the live rider dot is DRAWN — softly
  // snapped to the display candidate's reference line (engine's read-only
  // riderSnap mirror) via the pure rule in riderDotModel.ts. Raw fix whenever
  // the engine has nothing to project (no display candidate yet, empty
  // window). Display only: the trail, the stationary rule, hasFix and the raw
  // JSONL above all keep reading status.lastLat/lastLon.
  const riderDotStateRef = useRef<RiderDotState>(initialRiderDotState());
  const [riderDot, setRiderDot] = useState<{ lat: number; lon: number } | null>(null);
  useEffect(() => {
    if (status.lastLat === null || status.lastLon === null) {
      setRiderDot(null);
      return;
    }
    const r = riderDotStep(riderDotStateRef.current, status.lastLat, status.lastLon, live.riderSnap);
    riderDotStateRef.current = r.state;
    setRiderDot({ lat: r.lat, lon: r.lon });
  }, [status.lastLat, status.lastLon, live.riderSnap]);
```
(`useRef`, `useState`, `useEffect` are already imported at line 17.)

(c) In `onStart`, after line 619 `    lastFixRef.current = null;` add:
```ts
    // virgin-cycle20 brief 02: a fresh ride starts un-glued.
    riderDotStateRef.current = initialRiderDotState();
    setRiderDot(null);
```

(d) The RUNNING-phase map only (lines 1347-1351) — replace
```tsx
            <WayMapView
              wayId={mapOverlay.wayId}
              lat={status.lastLat}
              lon={status.lastLon}
              zoom={4}
```
with
```tsx
            <WayMapView
              wayId={mapOverlay.wayId}
              lat={riderDot?.lat ?? status.lastLat}
              lon={riderDot?.lon ?? status.lastLon}
              zoom={4}
```
Confirm by the surrounding props (`zoom={4}`, `sectorColours={sectorColours}`,
`selfs={settings.selfDots ? selfDots : undefined}`) that this is the map with `zoom={4}` — the
two `zoom={1}` maps (armed, rack) are **not** edited. If more than one `WayMapView` in the
file has `zoom={4}`, stop and report.

### 4. NEW `app/tests/riderdot_suite.ts`

```ts
/**
 * virgin-cycle20 brief 02 — live rider dot soft-snap. Pins the pure rule
 * (ui/riderDotModel.ts) and the engine's additive display-only exposure
 * (LiveEngineState.riderSnap). Raw truth is pinned elsewhere: engine_suite /
 * live_suite replay the committed fixtures and would fail if chainage, gates
 * or timing moved.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, test, TESTS_DIR } from './lib.ts';
import {
  SNAP_ENGAGE_M, SNAP_RAW_M, SNAP_RELEASE_M,
  initialRiderDotState, riderDotStep, snapWeight, type RiderDotState,
} from '../src/ui/riderDotModel.ts';
import { CORRIDOR_M, DEFAULT_LIVE_OPTIONS, toXY, xyToLatLon, type RefLine } from '../core/src/index.ts';
// Repo idiom (live_suite.ts 30-40, catalogstore_suite.ts 37): the engine pulls
// in refs.json through src/live/refs.ts, which plain Node can only load once
// live_suite's registerHooks JSON shim is installed — so a DYNAMIC import after
// link time, never a static one (a static import hoists past the hook and fails
// with ERR_IMPORT_ATTRIBUTE_MISSING).
const { LiveEngine, LOCK_MIN_ADVANCE_M } = await import('../src/live/engine.ts');

const APP_DIR = path.resolve(TESTS_DIR, '..');
// A generic local frame — any origin works; nothing here is a real route.
const LAT0 = 45.0;
const LON0 = 10.0;
const RAW = { lat: 45.0010, lon: 10.0010 };
const SNAP = { lat: 45.0012, lon: 10.0008 };

function step(prev: RiderDotState, xtdM: number | null) {
  return riderDotStep(prev, RAW.lat, RAW.lon, xtdM === null ? null : { lat: SNAP.lat, lon: SNAP.lon, xtdM });
}

test('riderdot: thresholds are ordered and sit inside the corridor', () => {
  assert(SNAP_ENGAGE_M < SNAP_RELEASE_M && SNAP_RELEASE_M < SNAP_RAW_M, 'engage < release < raw');
  assert(SNAP_RAW_M <= DEFAULT_LIVE_OPTIONS.windowBack, 'raw point within the projector window slack');
  assert(SNAP_RAW_M < CORRIDOR_M, 'the dot goes raw before the engine stops calling the fix on-route');
});

test('riderdot: within engage range the dot is exactly the projected point', () => {
  for (const xtd of [0, 1, SNAP_ENGAGE_M / 2, SNAP_ENGAGE_M]) {
    const r = step(initialRiderDotState(), xtd);
    assert(r.lat === SNAP.lat && r.lon === SNAP.lon && r.weight === 0, `xtd ${xtd}: on the line`);
    assert(r.state.mode === 'snapped', `xtd ${xtd}: glued`);
  }
});

test('riderdot: fade zone blends monotonically from the line to the raw fix', () => {
  let prevW = -1;
  let prevOff = -1;
  for (let xtd = SNAP_ENGAGE_M; xtd <= SNAP_RAW_M; xtd += 0.5) {
    const w = snapWeight(xtd, 'free');
    assert(w >= prevW, `weight non-decreasing at ${xtd}`);
    prevW = w;
    const r = riderDotStep({ mode: 'free' }, RAW.lat, RAW.lon, { ...SNAP, xtdM: xtd });
    // drawn point lies on the segment snap -> raw, at fraction w
    const expLat = SNAP.lat + w * (RAW.lat - SNAP.lat);
    const expLon = SNAP.lon + w * (RAW.lon - SNAP.lon);
    assert(Math.abs(r.lat - expLat) < 1e-12 && Math.abs(r.lon - expLon) < 1e-12, `on the blend segment at ${xtd}`);
    const off = Math.hypot(r.lat - SNAP.lat, r.lon - SNAP.lon);
    assert(off >= prevOff - 1e-15, `distance from the line non-decreasing at ${xtd}`);
    prevOff = off;
  }
  assert(snapWeight(SNAP_ENGAGE_M, 'free') === 0 && snapWeight(SNAP_RAW_M, 'free') === 1, 'ramp ends');
  assert(snapWeight(SNAP_RELEASE_M, 'snapped') === 0 && snapWeight(SNAP_RAW_M, 'snapped') === 1, 'glued ramp ends');
  assert(snapWeight(SNAP_RELEASE_M, 'free') > 0, 'free ramp has already started at the release point');
});

test('riderdot: at or beyond the raw threshold the dot IS the raw fix', () => {
  for (const xtd of [SNAP_RAW_M, SNAP_RAW_M + 0.01, 45, 120, 999]) {
    for (const mode of ['free', 'snapped'] as const) {
      const r = step({ mode }, xtd);
      assert(r.lat === RAW.lat && r.lon === RAW.lon && r.weight === 1, `xtd ${xtd} from ${mode}: raw, same numbers`);
      assert(r.state.mode === 'free', `xtd ${xtd} from ${mode}: released`);
    }
  }
});

test('riderdot: hysteresis — glued through wobble, released only at raw, re-glued at engage', () => {
  // xtd sequence and the expected (mode, weight) after each step, from 'free'.
  const seq: [number, 'free' | 'snapped', number][] = [
    [5, 'snapped', 0],
    [15, 'snapped', 0],          // would be 0.17 without hysteresis — stays glued
    [19, 'snapped', 0],
    [15, 'snapped', 0],
    [22, 'snapped', (22 - SNAP_RELEASE_M) / (SNAP_RAW_M - SNAP_RELEASE_M)],
    [25, 'snapped', 0.5],
    [18, 'snapped', 0],          // back on the line without ever going raw
    [31, 'free', 1],             // clearly off: raw, released
    [25, 'free', (25 - SNAP_ENGAGE_M) / (SNAP_RAW_M - SNAP_ENGAGE_M)],
    [13, 'free', (13 - SNAP_ENGAGE_M) / (SNAP_RAW_M - SNAP_ENGAGE_M)],
    [11, 'snapped', 0],          // re-glued as soon as it is within engage range
  ];
  let st = initialRiderDotState();
  seq.forEach(([xtd, mode, w], i) => {
    const r = step(st, xtd);
    assert(r.state.mode === mode, `step ${i} (xtd ${xtd}): mode ${r.state.mode}, want ${mode}`);
    assert(Math.abs(r.weight - w) < 1e-12, `step ${i} (xtd ${xtd}): weight ${r.weight}, want ${w}`);
    st = r.state;
  });
  // No jump at either transition: the weight at the engage point is 0 in both
  // modes and at the raw point 1 in both modes.
  assert(snapWeight(SNAP_ENGAGE_M, 'free') === snapWeight(SNAP_ENGAGE_M, 'snapped'), 'continuous at engage');
  assert(snapWeight(SNAP_RAW_M, 'free') === snapWeight(SNAP_RAW_M, 'snapped'), 'continuous at raw');
});

test('riderdot: no reference → raw fix and the glue is dropped', () => {
  for (const prev of [initialRiderDotState(), { mode: 'snapped' } as RiderDotState]) {
    const r = step(prev, null);
    assert(r.lat === RAW.lat && r.lon === RAW.lon && r.weight === 1 && r.state.mode === 'free', 'null snap → raw, free');
    const bad = riderDotStep(prev, RAW.lat, RAW.lon, { lat: NaN, lon: SNAP.lon, xtdM: 3 });
    assert(bad.lat === RAW.lat && bad.lon === RAW.lon && bad.state.mode === 'free', 'non-finite snap → raw, free');
    const neg = riderDotStep(prev, RAW.lat, RAW.lon, { ...SNAP, xtdM: -1 });
    assert(neg.lat === RAW.lat && neg.lon === RAW.lon, 'negative xtd → raw');
  }
});

test('riderdot: deterministic and idempotent; the module is pure', () => {
  const a = step({ mode: 'free' }, 17);
  const b = step({ mode: 'free' }, 17);
  assert(JSON.stringify(a) === JSON.stringify(b), 'same input, same output');
  const c = step(a.state, 17);
  assert(JSON.stringify(c) === JSON.stringify(a), 'feeding the result state back is a fixed point');
  const src = fs.readFileSync(path.join(APP_DIR, 'src', 'ui', 'riderDotModel.ts'), 'utf8');
  assert(!/Date\.now|Math\.random|performance\.now/.test(src), 'no clock, no randomness');
  assert(!/from ['"](react|react-native|expo)/.test(src), 'no react / react-native / expo imports');
  assert(!/^import /m.test(src), 'no imports at all — self-contained');
});

/** Straight west→east reference, `lengthM` long, 5 m vertices, y = 0. */
function straightRef(lengthM: number): RefLine {
  const n = Math.floor(lengthM / 5) + 1;
  const rx = new Float64Array(n);
  const ry = new Float64Array(n);
  const ch = new Float64Array(n);
  for (let i = 0; i < n; i++) { rx[i] = i * 5; ch[i] = i * 5; }
  return { rx, ry, ch, lat0: LAT0, lon0: LON0, length: (n - 1) * 5 };
}

test('riderdot: engine exposes riderSnap for the display candidate only, display-only', () => {
  const ref = straightRef(1500);
  const engine = new LiveEngine([{ id: 'T', ref, gates: [50, 700, 1400] }]);
  engine.start();
  assert(engine.getState().riderSnap === null, 'nothing fed → null');
  // Ride along the line 3 m to the "north" (y = +3), 10 m per fix at 1 Hz.
  // No pick: the display candidate IS the lock (displayTrack === track), so
  // riderSnap is null until the 400 m lock and present from then on.
  let t = 1_700_000_000_000;
  let lockedAt: number | null = null;
  for (let s = 0; s <= 900; s += 10, t += 1000) {
    const [lat, lon] = xyToLatLon(s, 3, LAT0, LON0);
    engine.feed(lat, lon, t, 5);
    const st = engine.getState();
    if (st.displayTrack === null) {
      assert(st.track === null, `s=${s}: no pick → displayTrack follows track`);
      assert(st.riderSnap === null, `s=${s}: no display candidate → riderSnap null`);
    } else {
      if (lockedAt === null) lockedAt = s;
      assert(st.track === 'T', `s=${s}: no pick → display candidate is the lock`);
      assert(st.riderSnap !== null, `s=${s}: display candidate → riderSnap present`);
      assert(Math.abs(st.riderSnap.xtdM - 3) < 0.01, `s=${s}: xtd ≈ 3 m, got ${st.riderSnap.xtdM}`);
      const back = toXY([st.riderSnap.lat], [st.riderSnap.lon], LAT0, LON0);
      assert(Math.abs(back.x[0] - s) < 0.05 && Math.abs(back.y[0]) < 0.05, `s=${s}: projected point on the line at s`);
      assert(st.chainageM !== null && Math.abs(st.chainageM - s) < 0.05, `s=${s}: chainage untouched`);
    }
  }
  assert(lockedAt !== null && lockedAt >= LOCK_MIN_ADVANCE_M, `lock only after ${LOCK_MIN_ADVANCE_M} m (got ${lockedAt})`);
  // A clearly off-route fix: riderSnap still reports the nearest point and the
  // honest distance (the UI rule turns that into "raw"); chainage does not move.
  const before = engine.getState().chainageM;
  const [lat, lon] = xyToLatLon(905, 60, LAT0, LON0);
  engine.feed(lat, lon, t, 5);
  const st = engine.getState();
  assert(st.riderSnap !== null && Math.abs(st.riderSnap.xtdM - 60) < 0.01, `off-route xtd ≈ 60, got ${st.riderSnap?.xtdM}`);
  assert(st.chainageM === before, 'an off-route fix never moves chainage (projector unchanged)');
  engine.stop();
  assert(engine.getState().riderSnap === null, 'stopped → null');

  // Ruling 2026-10-03 (brief 06 display candidate): under a RECORD-tab pick the
  // dot snaps to the pick's own reference from START — the map already draws
  // that line (wayHint) before the lock — so riderSnap is present while `track`
  // is still null, exactly like chainageM. The lock verdict itself is untouched.
  const picked = new LiveEngine([{ id: 'T', ref, gates: [50, 700, 1400] }]);
  picked.start({ pickId: 'T' });
  assert(picked.getState().riderSnap === null, 'pick, nothing fed → null');
  let tp = 1_700_000_000_000;
  for (let s = 0; s <= 100; s += 10, tp += 1000) {
    const [plat, plon] = xyToLatLon(s, 3, LAT0, LON0);
    picked.feed(plat, plon, tp, 5);
    const ps = picked.getState();
    assert(ps.track === null && ps.displayTrack === 'T', `pick s=${s}: pre-lock (track ${ps.track}, displayTrack ${ps.displayTrack})`);
    assert(ps.riderSnap !== null && Math.abs(ps.riderSnap.xtdM - 3) < 0.01, `pick s=${s}: riderSnap from the pick's candidate before the lock`);
    const pb = toXY([ps.riderSnap.lat], [ps.riderSnap.lon], LAT0, LON0);
    assert(Math.abs(pb.x[0] - s) < 0.05 && Math.abs(pb.y[0]) < 0.05, `pick s=${s}: projected point on the line at s`);
  }
  picked.stop();
});
```
If `LOCK_MIN_ADVANCE_M` or `LiveEngine` are not exported exactly as named at
`engine.ts` lines 116 / 358, stop and report. Still eight tests (the pick check is inside the
engine test) → +8.

### 5. EDIT `app/tests/run.ts`

After line 62 `import './ridenotification_suite.ts';` add `import './riderdot_suite.ts';`
(before line 63 `import { runAll } from './lib.ts';`).

## Verification plan

1. **Baseline first:** `cd app && node --experimental-strip-types tests/run.ts` on the untouched
   tree — record the summary line (expected **812 tests: 809 pass, 0 fail, 3 skip** on the
   2026-10-03 tree; report whatever it is).
2. After the edits: same command — expect **baseline + 8 tests, +8 pass, 0 FAIL, skips
   unchanged** (**820 / 817 / 0 / 3** from the 812 baseline). Every pre-existing `engine:` and
   `live:` test still passes — that is the "timing and chainage unchanged" artifact. Report the
   exact summary line.
3. "Failed before, passes after": run the new suite once with step 2(g) of the engine edit
   temporarily commented out — exactly one test must FAIL: `riderdot: engine exposes riderSnap
   for the display candidate only, display-only — s=400: display candidate → riderSnap present`
   (820 tests: 816 pass, 1 fail, 3 skip) — then restore the line and rerun to green. Report
   both lines.
4. `cd app && ./node_modules/.bin/tsc --noEmit` — clean, exit 0.
5. `grep -n "riderSnap\|riderDot" app/src/ui/RecordScreen.tsx app/src/live/engine.ts` → hits only
   in the places this brief adds; `grep -rn "riderSnap" app/core` → **no output** (core untouched).
6. `GIT_OPTIONAL_LOCKS=0 git status --porcelain` — the tree is already heavily dirty from
   briefs 04/01/03/05/08/06/07/10/11 (uncommitted; `engine.ts`, `RecordScreen.tsx` and `run.ts`
   are ALREADY `M`). Diff the list before/after your edits: the only NEW entries must be
   `?? app/src/ui/riderDotModel.ts` and `?? app/tests/riderdot_suite.ts`; `git diff --stat`
   on `engine.ts` / `RecordScreen.tsx` / `run.ts` grows by your additive lines only.
7. `git diff app/src/live/engine.ts` (which also carries brief 06 §1's display-candidate work)
   gains no change inside `LiveProjector` usage, `recompute()`, `evaluateLockState`,
   `commitLock`, `finalize` from THIS brief — only the eight additive spots above (a copy of the
   pre-edit file diffed against the post-edit one shows additions only, zero removed lines).
8. Inspect (fresh Opus): reruns 1-7; reads `riderDotModel.ts` against Decision 4 (continuity at
   both transitions, exact raw at ≥ 30, exact snap at weight 0, null → free); confirms the
   armed/rack maps still pass raw `status.lastLat/lastLon`; confirms `trail`, `lastFixRef`,
   `hasFix`, `detected` still read `status.*`; confirms `app/core/` has no diff.

## Ship + on-device checklist — Nathan (OTA via `publish-preview.ps1`; no rebuild)

`powershell -ExecutionPolicy Bypass -File .\scripts\publish-preview.ps1` from the repo root
(same as any JS-only change; the fingerprint must print unchanged — if the script reports a
fingerprint drift, stop: something native moved and this brief did not do it).

Then one ride on any route with a stored reference (any user, any way):
1. **With a RECORD-tab pick:** from START the picked line is drawn and the dot sits on it as
   soon as you are within ~12 m — no 400 m wait (brief 06 + this ruling). **With no pick** (a
   from/to pair with no route): the dot is raw GPS, wobble and all, until the route locks.
2. **Once the route is displayed / locked:** the dot sits on the yellow line and slides along
   it; small GPS wobble no longer pushes it off the line.
3. **Take a deliberate side street / parallel lane ≥ 30 m away:** the dot eases off the line
   as you drift (no jump) and is plainly the raw GPS point once you are clearly off. If you go
   past 120 m the dot inverts (hollow) exactly as before.
4. **Come back:** the dot eases back and glues within ~12 m of the line — no blinking at the
   edge while riding near the release distance.
5. **Stop at a light on-route:** the dot stays on the line; the map still dims as "stopped".
6. **After STOP:** sector and lap times, the gates that fired, the ride's history entry and the
   trail line are the same as they would have been — nothing about the ride changed, only where
   the dot was drawn. Note anything odd in this folder's `PROGRESS.md` (create if absent).

## Out of scope

- The replay/self dots and their interpolation (`selfRaceModel.ts`), the trail, the PNG rung's
  `nearestOnPath`, any camera/bearing change beyond what follows from the drawn point, a
  settings toggle, any tuning of the projector's window/corridor, the ROUTES/browse maps.

## Open calls (default chosen — executor does NOT stop for these)

- **A. Post-update vs pre-update window centre for the display projection.** Chosen: post-update
  `c.proj.chainage` (Decision 1) — always contains the projector's own hit, and lands right after
  a re-acquisition instead of one fix late.
- **B. Adding `riderSnap: null` to the four `stateWith()` / `finishedState()` helpers in existing
  suites.** Chosen: leave them (cast-tolerant, `tsc` clean, five fewer files). The coordinator can
  add the line in a later chore if the "complete literal" convention is wanted there.
- **C. The one-off hop when the route first locks.** With `weight = 0` on the first glued fix,
  the dot moves from raw to the line by ≤ 12 m once. No time-based easing (would need a clock →
  non-deterministic); accepted.
- **D. Effect + state vs compute-in-render.** Chosen: `useEffect` on the fix keys + `useState`
  for the drawn point, matching the trail/stationary effects right above it; the drawn dot trails
  the raw status by one React commit (milliseconds at 1 Hz), never by a fix.

## Report back

- The baseline summary line, the step-3 FAIL line with 2(g) commented out, the final summary
  line (0 FAIL, +8), and the `tsc` exit code.
- The `git status --porcelain` list and the empty `grep -rn "riderSnap" app/core`.
- Any anchor mismatch, verbatim, with the line actually found — and stop there.
- A reminder line for the coordinator: "JS only — OTA via publish-preview.ps1; fingerprint
  expected unchanged".
