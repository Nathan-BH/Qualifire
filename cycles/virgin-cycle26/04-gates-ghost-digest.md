# virgin-cycle26 — Digest 04: gates, gate editor, projection callers, ghosts/selfs, routeCreation

Date: 2026-10-08. Role: Haiku DIGEST (read-only on code; this file is the only write). Facts only, line-anchored. Paths are relative to the repo root `Qualifire/`. "unclear" = not determined from the code read. Context read only: `00-nathan-ideas.md`, `01-loop-and-overlap-digest.md`, `02-record-picker-digest.md`.

## TL;DR

- Gate seeding (`app/src/store/gateSeeding.ts`) works purely on chainage (metres along the reference). It never projects a lat/lon and has no notion of retraced ground. Its only geometric input is the reference ride's stop chainages.
- Gate positions are never re-projected by the gate editor. A tap selects a gate by the GeoJSON feature name under the finger (`wayMapView.tsx:901-905`, takes `features[0]` only). Nudges move chainage arithmetically (`gateAdjustModel.ts:52-64`). Gate lat/lon is derived from chainage by interpolation (`wayAssetRuntime.ts:39-41`).
- There are three projectors, and they differ:
  - live: `LiveProjector.update` (`app/core/src/live.ts:80-116`). Monotonic forward-only, window back 30 m / forward 240 m, first-fix anchor is a GLOBAL nearest vertex (`live.ts:85`), re-acquisition is windowed forward (`live.ts:107`).
  - offline: `projectRideOffline` (`app/core/src/projection.ts:79-122`). Non-monotonic, window back 60 m / forward 240 m (`projection.ts:90-91`), anchor GLOBAL (`projection.ts:87`), re-acquisition GLOBAL after 5 misses (`projection.ts:109-118`).
  - display-only: `displayProjection` (`app/src/live/engine.ts:223-233`), windowed, never fed back.
- Every saved-ride consumer uses the OFFLINE projector: results (`resultsStore.ts:290-292`, call at `:506`), ride derive (`derive.ts:62`, `:163`), engine sector rows (`engine.ts:515-518`), self dots and replay (`derive.ts:155-172`, `selfRaceModel.ts:341`). So the live and saved paths can disagree on a retrace.
- Only the live engine's gate events are monotonic. Sector rows shown in the live UI come from the offline recompute (`engine.ts:502-518`).
- Nothing in routeCreation or reference building handles retrace or self-intersection. `buildReference` keeps both passes (`app/core/src/reference.ts:65-94`).
- routeCreation shrinks start/end discs so that an end within about 150 m of the start folds into a loop (`routeCreation.ts:115-125`, `:259-260`).
- Tests: no test covers an out-and-back or retrace path for gates, projection or selfs. Loop tests exist only for route identity and naming (`routecreation_suite.ts:102`, `:189`, `:538`, `:590`).
- OPEN-ITEMS citation check: digest 01 cites "OPEN-ITEMS.md line ~21". The actual entries are at `OPEN-ITEMS.md:52` (checklist, "overlapping gate tap-targets on an out-and-back ride") and `OPEN-ITEMS.md:248-251` (the full bullet "Overlapping gate hit-areas on an out-and-back ride").
- Correction to digest 01's context line: "30 m back" is the LIVE window only. Offline uses 60 m back (`projection.ts:90`).

---

## 1. Gate seeding (`app/src/store/gateSeeding.ts`)

Constants (grep-verified line numbers):
- `START_FRAC = 0.01` (`:20`), `FINISH_FRAC = 0.99` (`:21`), `SECTOR_FRACS = [0.25, 0.5, 0.75]` (`:22`).
- `SIGNAL_CLEAR_M = 150` (`:24`), `SNAP_WINDOW_M = 250` (`:26`), `SNAP_STEP_M = 10` (`:27`).
- `MIN_GATE_GAP_M = 50` (`:31`), `MIN_SNAP_LENGTH_M = 600` (`:33`).

Signature: `seedGateChainages(refLengthM: number, stopChainageM: readonly number[]): number[]` (`:40-43`). It has two parameters. There is NO overlap or retrace argument. (Plan D7 proposes a third optional argument; confirmed absent.)

Algorithm (`:44-74`):
1. `start = 0.01*L`, `finish = 0.99*L`, `quantiles = [0.25L, 0.5L, 0.75L]`.
2. If `L < 600` or there are no stops, return `[start, ...quantiles, finish]` (pure quantiles).
3. `clear(c)` is true when every stop chainage `s` has `|c - s| >= 150`.
4. For each quantile `g0`: if `clear(g0)`, keep it. Otherwise search `g0 ± k*10` for `k = 1..25`, first candidate first in order `-` then `+`, accepting only if `start + 50 < c < finish - 50` and `clear(c)`. If nothing is found, keep `g0` (R&S step 6).
5. If any neighbouring gap in `[start, snapped..., finish]` is < 50 m, revert all sector gates to pure quantiles (`:67-72`).

Projection: NONE. Everything is chainage arithmetic. Lat/lon is never read.

Retrace: not considered. Two stretches of the line that lie within 150 m of each other physically are seeded independently by chainage. The seeder cannot know they are the same road.

Stop input (where the retrace question re-enters): `buildRefFromRideFixes` maps each stationary-run centroid to chainage with a GLOBAL `nearestOnSegments(px, py, ref, 0, nseg).s` (`app/src/live/userRefs.ts:96-100`, call at `:99`). On an out-and-back, a stop on one pass maps to whichever segment is physically nearest over the whole line. `nearestOnSegments` uses strict `d < bestDist` (`projection.ts:47`), so ties go to the earliest segment index. Which pass wins for a real retrace is unclear from the code; it depends on sub-metre geometry. A mis-mapped stop mis-steers the SNAP rule.

Callers of `seedGateChainages`:
- `app/src/store/routeFromRide.ts:117` (`promoteRideToReference`), `:240` (`createRouteFromDraft`). Import at `:21`.
- `app/src/ui/demoModel.ts:34` (import), `:180` (call).

Other seed sources: `app/core/src/gates.ts:10-50` holds the hand-entered `PROPOSED_GATES` (not seeded). The comment at `gates.ts:40` says the MorningB positions were re-projected "nearestOnSegments over all segments" by hand (offline, not in code).

## 2. Gate editor and tap handling

Card: `app/src/ui/gateAdjustCard.tsx`.
- Title/sub copy: sub text `'Tap a gate to move it'` (`:143`). Hint when nothing selected: `'tap a gate on the map or below to nudge it'` (`:193`).
- Working list is local state `chainageM` (`:71`). The asset is rebuilt on every change: `buildRuntimeWayAsset(props.refLine, chainageM, 'gate-card')` (`:80-83`).
- Map selection callback (`:155`): `gateSelect={{ selected, onPress: (i) => setSelected(cur => cur === i ? null : i) }}`.
- Chip row (`:159-178`): one chip per gate, labelled by `gateName` (START / G1 / G2 / G3 / FINISH). This is the disambiguator where taps collide.
- Nudge: `nudge(deltaM)` (`:88-95`) calls `clampNudge(prev, selected, deltaM, refLengthM)` on the selected index only. Steps are `largeM = 0.01*L` and `smallM = 0.001*L` (`:85-86`, `nudgeDeltaM` at `gateAdjustModel.ts:17-19`). Hold-to-repeat every 120 ms after a 350 ms long press (`:66-67`, `:110-114`).
- Readout: `fmtChainage` and `fmtPct` (`:183`).
- Save: `dirty` is any change beyond 1e-6 (`:74`). Save emits the new chainage list (`:199`).

Model (`app/src/ui/gateAdjustModel.ts`):
- `isAdjustable(index, n)` (`:35-37`), `gateName` (`:39-43`).
- `clampNudge` (`:52-64`): `lo = index === 0 ? 0 : chainage[i-1] + 50`; `hi = index === n-1 ? L : min(chainage[i+1] - 50, L)`; result = clamp(chainage[i] + delta, lo, hi).
- START and FINISH are adjustable (`:25-33` comment).

Tap pipeline (map):
- `WayMapView` props: `gateSelect` (`app/src/ui/wayMapView.tsx:304`).
- Ticks layer: `GeoJSONSource id="gate-ticks"` (`wayMapView.tsx:897-906`). The `onPress` handler is at `:901-905`:
  ```
  const name = String(e.nativeEvent.features?.[0]?.properties?.name ?? '');
  const idx = asset ? asset.gates.findIndex((g) => g.name === name) : -1;
  if (idx >= 0) props.gateSelect!.onPress(idx);
  ```
  Only `features[0]` is read (`:902`). If two ticks are hit, the one MapLibre returns first wins. The order is not set in this code, so it is unclear which gate wins.
- Hit area: `hitbox={{ top:24, right:24, bottom:24, left:24 }}` (`:906`). That is 24 px on each side around the tick layer. It is not per-feature.
- Selected ring: `gateSelectedFC` (`:631-638`), drawn from `props.gateSelect.selected`.
- Tick geometry: `gateTicksFeatureCollection` (`app/src/ui/wayMapGeo.ts:336-352`). Half-length from `gateHalfLenM(lat, zoom, minHalfPx=7, floorM=15)` (`wayMapGeo.ts:331-334`). Heading from the neighbouring path vertices via `gateIdx` (`:344-350`). Tick half-length is at least 7 px on screen (floor 15 m), so ticks grow with zoom; the hit area is a fixed 24 px regardless.
- Gate names come from `gateName(i, gateIdx.length)` (`app/src/ui/wayAssetRuntime.ts:99`). Names are unique per index, so the name lookup is index-safe.

What the OPEN-ITEMS gap refers to. Quoted from `OPEN-ITEMS.md:248-251`:
> "Overlapping gate hit-areas on an out-and-back ride. Two gates at mirrored chainages can render on the same pixel; only the later-rendered tap target wins. The card has since been redesigned with a zoomable map (cycle2 WP-J), which may already resolve it — on the item 2 checklist; fix only if it's still reproducible."

The checklist entry is `OPEN-ITEMS.md:52` ("overlapping gate tap-targets on an out-and-back ride"). The gap is untested on device. The code matches the description: the handler takes `features[0]` (`wayMapView.tsx:902`), and the chip row (`gateAdjustCard.tsx:159-178`) is the only fallback.

Edited gate chainage recomputation: none from the tap. The tap selects an index only. Chainage changes only through `clampNudge`. Positions are re-derived by `pointAtChainage` (`wayAssetRuntime.ts:39-41`, `interp1` along `ch`). That is an interpolation, not a projection, so an edit cannot snap onto the wrong pass. The consequence is the reverse: a gate placed by chainage on the second pass can only be reached by nudging through the chainage axis. The nudge size is 0.1% of L (about 5 m for a 5 km route) and 1% (about 50 m).

Persistence path for edits: `saveAdjustedGates` (`app/src/store/routeFromRide.ts:302`) and `editWayGates` (`:476-`). Validation at `:492-495` checks range `0 <= c <= L` and strictly increasing chainage. No projection is performed.

## 3. Projection helpers and every caller

Core (`app/core/src/`):

| Helper | Anchor | Kind | Callers |
|---|---|---|---|
| `nearestOnSegments(px,py,ref,lo,hi)` | `projection.ts:29-53` | windowed by segment index range; `[lo,hi)` | `live.ts:93` (live windowed); `projection.ts:99` (offline windowed); `engine.ts:231` (displayProjection, windowed); `userRefs.ts:99` (GLOBAL, range `0..nseg`) |
| `nearestVertex(px,py,ref,sLo,sHi)` | `projection.ts:56-73` | optional chainage range; default global | `live.ts:85` (first-fix anchor, GLOBAL); `live.ts:107` (re-acq, windowed `[sp, sp+bound]`); `projection.ts:87` (offline anchor, GLOBAL); `projection.ts:111` (offline re-acq, GLOBAL) |
| `LiveProjector.update(x,y,t)` | `live.ts:80-116` | monotonic forward-only | constructed `engine.ts:282`, `:354`; fed `engine.ts:486` (`feedCandidate`) |
| `projectRideOffline(x,y,ref,corridor)` | `projection.ts:79-122` | non-monotonic; window -60/+240 | `engine.ts:515` (recompute); `derive.ts:62` (deriveRideResult); `derive.ts:163` (deriveGateCrossings); `resultsStore.ts:292` (via `projectAgainst`, called `:506`); `gpxPlusExport.ts:346` (xtd only) |
| `displayProjection(ref,sp,x,y)` | `engine.ts:223-233` | windowed by live options; display only | `engine.ts:490` (sets `c.lastSnap`) |
| `nearestOnPath(path,lat,lon)` | `app/src/ui/wayMapGeo.ts:208-237` | GLOBAL over every drawn-path segment; no chainage | `wayMapGeo.ts:273` (`waySplitFeatures`, rider behind/ahead split); `catalogMapModel.ts:232` |
| `pointAtChainage(ref,s)` | `app/src/ui/wayAssetRuntime.ts:39-41` | chainage to lat/lon (interpolation, not projection) | `wayAssetRuntime.ts:56` (gate placement) |

Notes:
- Only `live.ts:107` is windowed re-acquisition. `live.ts:85` and `projection.ts:87` both anchor GLOBALLY, so the anchor can land on the wrong pass if the first fix is poor. The engine's retry (`engine.ts:342-362`) fires at most once and only before any gate.
- `nearestOnPath` (`wayMapGeo.ts:208`) ignores chainage. On an out-and-back, the rider-dot behind/ahead split can flip to the other pass. Whether that is visible is unclear (not checked on device).
- No callers of a "snap to route" function exist beyond these. `waySplitFeatures` is the only rider-position consumer of `nearestOnPath` in the code read.

## 4. Ghost / self / sector timing and tier colours

Offline timing core (`app/core/src/timing.ts`):
- `crossTime(t, s, g)` (`:16-29`): FIRST upward crossing of chainage `g` in the offline series `s`, linear interpolation between bracketing fixes. Start rule: if `s[0] >= g`, it counts only when `s[0] - g < 20 m` (`:21`).
- `sectorTimes(ride, gates, corridor)` (`:45-73`): per sector, `tA`/`tB` from `crossTime`. Off-corridor fix in `[tA,tB]` (xtd > corridor) gives `excluded_offroute` (`:56-64`). A sustained stop (>= 1.0 s, `INTERRUPTED_STOP_S` at `:8`) gives `interrupted`. Else `clean`.
- Because crossings are first-upward, a retrace that revisits chainage `g` later is ignored by the timing. What is timed is the first arrival at `g` in the offline series, whatever pass it came from.

Engine (`app/src/live/engine.ts`):
- Live gate events come from `GateDetector.update` (`app/core/src/live.ts:144-169`): monotonic `next` index, one event per gate, `estimated` if the gap is over 10 s (`EST_GAP_S`, `live.ts:122`) or the jump is over 100 m (`EST_JUMP_M`, `live.ts:123`, check at `:157`).
- `recompute()` (`engine.ts:502-`) builds sector rows from the OFFLINE projection of the whole buffer (`engine.ts:515-518`). The live event times and the offline rows can disagree on a retrace, and the UI shows the offline rows.
- Keyed by sector index: `sectors: LiveSector[]` (`engine.ts:161`, `:253`, `:295`).

Self dots / ghosts (`app/src/ui/selfRaceModel.ts`; header `:1-40`):
- Window = `ghostsFor(wayId)` (`app/src/ui/colourModel.ts:77`), at most 9 rides (`selfrace_suite.ts:94` asserts the cap).
- Each self is timed from `deriveGateCrossings` (`derive.ts:155-172`): `startS` = crossing of gate 0, `finishS` = crossing of last gate, `chainageM` = offline `s` per fix.
- Per-fix chainage `sM` is assigned in the loader (`selfRaceModel.ts:341-350`), `inOrder[i] <-> chainageM[i]`.
- Cache key `${rideId}:${gateSetVersion}` (`selfRaceModel.ts:318`), bounded at `TRACK_CACHE_MAX = 90` (`:264`).
- Best self: lowest `lapS`; ties keep the earlier array entry (`selfRaceModel.ts:192-194`; test `selfrace_suite.ts:183`).
- Tier: `selfTierFor` (`:171-176`): purple if index === best, else compared with the mean (`colourModel.ts:172` `tierFor`).
- Position for a live rider: `selfLivePosition` (`selfRaceModel.ts:393-398`) = `1 + count(d.sM > riderChainageM)`. It compares chainage numbers, not positions. On an out-and-back, a self on the other pass with a larger chainage counts as "ahead" even if it is physically behind the rider.
- A ghost trace passing the same spot twice: its `sM` series comes from the OFFLINE projector and is not monotonic (`projection.ts:103` sets `s` to the hit, which can go backwards within the 60 m back window). Nothing in the loader enforces monotonicity. Test `selfrace_suite.ts:356` asserts non-decreasing chainage only at the gate-0 and last-gate crossings; test `:308` asserts non-decreasing chainage for the LIVE candidate under a pick.

Sector colours (`app/src/ui/sectorTrailModel.ts`):
- Header `:1-15`: index 0 is always null (START); index i colours the stretch ENDING at gate i. Only CLEAN, scored sectors with an earned tier paint.
- `storedSectorColours` (`:58`) and `liveSectorColours` (`:81`) take a per-sector-index history (`SectorHistory`, `:32`).
- Tier colour helper (`app/src/ui/tierColour.ts:54-57`) is shared by lap, sector and the ON THIS WAY "today" row.

Ride detail rows:
- `SECTORS` heading `app/src/ui/RideDetailScreen.tsx:547`; `ON THIS WAY` heading `:561`.
- "big lap": no match for the phrase in `app/src` (grep). Unclear where it is computed.

## 5. Saved-ride analysis after STOP (results, detail, replay)

- Results: `projectAgainst` (`app/src/store/resultsStore.ts:290-293`) calls `projectRideOffline` (GLOBAL anchor and re-acq, back 60 m). Called from `:506` for each candidate.
- Derive: `deriveRideResult` (`app/src/store/derive.ts:59-64`) and `deriveGateCrossings` (`:155-172`, projection at `:163`) also use the offline projector.
- Replay and self dots use `deriveGateCrossings` (see section 4).
- The file header comment at `resultsStore.ts:310-331` documents the divergence: offline re-acquires GLOBALLY and non-monotonically; LiveProjector re-acquires forward and bounded. It also documents that offline has no `estimated` flag (`:329-331`). `coverage` acceptance was added because of this (`:340-345`).

Divergences, live (`live.ts:80-116`) versus offline (`projection.ts:79-122`):

| Aspect | Live | Offline |
|---|---|---|
| Back window | 30 m (`live.ts:43`) | 60 m (`projection.ts:90`) |
| Forward window | 240 m (`live.ts:44`) | 240 m (`projection.ts:91`) |
| Anchor | GLOBAL nearest vertex (`live.ts:85`) | GLOBAL nearest vertex (`projection.ts:87`) |
| Monotonic | forward-only `max(sp, hit.s)` (`live.ts:95`) | none; `s = hit.s` can go backwards (`projection.ts:103`) |
| Re-acquisition | windowed forward `[sp, sp + max(400, 15 m/s * dt)]` (`live.ts:101-112`) | GLOBAL nearest vertex after 5 misses (`projection.ts:109-118`) |
| Estimated flag | yes (`live.ts:150-162`) | no (documented `resultsStore.ts:329-331`) |

Consequence for an out-and-back: an offline re-acquisition can jump chainage onto the other pass, and `crossTime` reads it as an upward crossing of every gate it leapt over (`resultsStore.ts:325-328`). The live path would have flagged the same jump as `estimated` (`live.ts:157`).

## 6. Route creation reference line and endpoints (`app/src/store/routeCreation.ts`, `app/core/src/reference.ts`, `app/src/live/userRefs.ts`)

Reference line build (`userRefs.ts:68-102`, `buildRefFromRideFixes`):
1. Drop `preStart` and `warmup` fixes; sort by `tUnixMs` (`:69-71`).
2. `collapseStationaryRuns` (`:80`) merges stationary runs into their centroid. The collapse is a stationary-only dedupe.
3. `buildReference` (`app/core/src/reference.ts:65-94`): centred box-average with k=5 (`:68-84`), ends kept raw (`:85-90`), then `resample(xs, ys, 5.0)` (`:91`), chainage = `cumdist` (`:92`).
4. Round rx/ry to mm and recompute chainage from the rounded coordinates (`userRefs.ts:88-93`).
5. Length floor `MIN_TRACK_LENGTH_M` (`:92`; the constant's definition site is unclear from the read).
6. Stop chainages: GLOBAL `nearestOnSegments` (`:96-100`).

Self-intersection, retrace, dedupe: none. `reference.ts` has no dedupe and no self-intersection check (grep of `reference.ts` for dedup/smooth/intersect found only the box smooth). `medoidIndex` (`reference.ts:45`) picks a medoid only for multi-ride builds, which this path does not use. `routeCreation.ts` has no simplification, dedupe or intersection code (grep confirmed).

Start and end landmark shrink (`routeCreation.ts`):
- `NEW_LANDMARK_RADIUS_M = 120` (`:45`), `MIN_LANDMARK_RADIUS_M = 30` (`:48`), `MIN_TRACK_LENGTH_M = 200` (`:50`), `MATCHED_ENDPOINT_SLACK_M = 300` (`:73`).
- `fittedRadius(p, obstacles)` (`:115-125`): `r = min(120, metresBetween(p,o) - o.radiusM over o)`; returns null if `r < 30`.
- `nearestByEdge` (`:128-142`).
- `draftRouteCreation` (`:197-275`):
  - Start (`:215-230`): `landmarkAt(c, first)` on CATALOG landmarks; else a new disc with `fittedRadius`; if that is null, use `nearestByEdge` as existing.
  - Matched-way guard (`:235-240`, `:266-271`): if the ride matched a way, a new endpoint within 300 m slack of the way's landmark is replaced by that landmark.
  - End (`:243-263`): `landmarkAt(c, last)` again on catalog landmarks only (the start draft is NOT a candidate here). Else `fittedRadius(last, [...c.landmarks, startDraftDisc])`. If that is null, the squeezer is `nearestByEdge` over the same obstacles; if the squeezer is the start draft, `end` becomes `{kind:'new', landmarkId: start.landmarkId}` (`:258-260`), which is a LOOP.
  - Effective loop threshold: the start disc radius is 120 m unless shrunk by an existing landmark, so an end whose centre is less than about 150 m from the start centre folds into a loop (`120 + 30`). Between about 150 and 240 m the end gets a shrunk disc. The `d` values are an inference from the formula, not measured.
- Loop identity is then `start.landmarkId === end.landmarkId` (`:273`).

Route/gate creation hand-off: `createRouteFromDraft` (`routeFromRide.ts:229-`) seeds gates with `seedGateChainages` (`:240`) and times the reference (`:259`).

## 7. Existing fixtures and tests (out-and-back, loop, retrace)

No test named or asserting out-and-back, retrace, or self-overlap was found for the projection, gate, or self paths. Grep (`out.and.back|retrac|overlap|loop|figure|same road|revisit`) over `app/tests` gave the list below.

Gate seeding and editing (`app/tests/gateseeding_suite.ts`, 79 lines):
- `:10` no stops, pure quantiles.
- `:18` stop on a quantile nudges that gate 150 m clear inside the window.
- `:24` fully blocked window falls back to exact quantile.
- `:32` routes under 600 m seed pure quantiles.
- `:38` converging snaps revert to quantiles, stay strictly increasing.
- `:45` name says "clampNudge moves by ±10/±50" (STALE: the nudge is now a percent of L, `gateAdjustModel.ts:7-19`; the test body is agnostic per the comment there, not re-read).
- `:53` START/FINISH nudge like any gate.
- `:65` gateName / fmtChainage / fmtPct.
- `:76` nudgeDeltaM.
- None covers overlap, retrace, or stop chainages mapped from a retraced line.

Route creation (`app/tests/routecreation_suite.ts`, 1426 lines):
- `:86` near-miss endpoint gets a shrunk radius; sub-MIN sliver reuses the place.
- `:102` ride ending at its own new start landmark drafts a loop (the out-and-back-to-start case in section 6).
- `:189` loop build needs and gets a loopDiscriminator.
- `:538` existing loop way drafts a variant, not a second loop way.
- `:564` END-side sliver reuses the pre-existing landmark.
- `:590` loop from and back to an existing landmark with no loop way yet.
- `:616`, `:648`, `:1390` applyEndpointChoices with loops.
- None asserts about the reference path itself (retrace in the polyline).

Live engine (`app/tests/live_suite.ts`):
- `:234` and `:287`: stationary doorstep loop (real export 20260815-0024). That is a STATIONARY loop, not a path retrace.
- `:486-500`: `clean_morning` with pick Morning; comment at `:489-491` says candidates "HomeStationPreferred" and "HomeChurch" share corridor with Morning ("the two lines are the same road"). This is the closest existing evidence of parallel/shared-corridor candidates, but it asserts only the pick is the reference and finalize keeps it.
- `:349`: retry count for Morning is exactly one.

Self race (`app/tests/selfrace_suite.ts`, 644 lines):
- `:94` cap at 9; `:183` tie keeps earlier entry; `:275` startGateT; `:308` chainage null while no pick, non-decreasing under a pick; `:356` deriveGateCrossings chainage non-decreasing across gate 0 and last gate; `:380` interpolation of sM; `:558` selfLivePosition counts chainage ahead.

Sector trail (`app/tests/sectortrail_suite.ts`, 249 lines): not read in detail.
Engine suite (`app/tests/engine_suite.ts`, 126 lines): not read in detail.
Replay drift (`app/tests/replay_drift_suite.ts`): not read.

Fixtures (`app/tests/fixtures/`): `clean_eveninga.json`, `clean_eveningb.json`, `clean_morning.json`, `detour_eveningb.json`, `gap_20260521.json`, `latelock_20260805.json`, `wrongdir_eveninga.json`, `synthetic_firstride.json`, `synthetic_truncated.json`, `qualifire-20260815-0024.gpx`, `refs.json`, `catalog.seed.v1.json`. None is labelled out-and-back or retrace. `detour_eveningb.json` is a real detour (cited at `resultsStore.ts:334-338`: chainage jump 0 to 5112 m in one fix).

Described but not verified: `cycles/virgin-cycle24/03-brief-map-tab.md:231` describes a synthetic fixture `w5`, "a 20-vertex out-and-back loop starting and ending at H". The catalog-map suite uses a `rLoop` with `w5` (`app/tests/catalogmap_suite.ts:57-59`). Whether the path geometry is out-and-back was not read.

## 8. Open items for the planner (facts, not decisions)

1. Offline projector back window (60 m) differs from live (30 m). Any shared constant change must touch both (`projection.ts:90`, `live.ts:43`).
2. Offline re-acquisition is global. Live is windowed. The offline sector rows (`engine.ts:515-518`) are what the UI shows.
3. Gate tap uses `features[0]` only (`wayMapView.tsx:902`); hitbox is 24 px (`:906`). No per-feature disambiguation exists in code.
4. Stop chainages (`userRefs.ts:99`) use GLOBAL projection.
5. `seedGateChainages` has no overlap input (`gateSeeding.ts:40`).
6. `selfLivePosition` compares chainage numbers (`selfRaceModel.ts:397`), not positions.
7. `gateseeding_suite.ts:45` test name is stale (percent nudges).
