**Status: Brief written 2026-09-02, ready to execute — the implementation IS `WP-D-rider-only-map.md`, unchanged; this WP is the root-cause record for Nathan's "HomeWork shows no map" report, the HomeWork-specific acceptance script, and the landing order it forces. It adds no second implementation of the same lines. No decision needed from Nathan.**
**Review doc item: 4 (the same item WP-D covers; re-asked by Nathan 2026-09-02: "just add back a live openmap to the record, start and racescreen ... Even if no ride is shown on the map, just the map and blue dot would be great. now if i select HomeWork i dont even see any map"). Size: small (the WP-D brief already exists).**
**Verified against the device tree as staged 2026-09-02; `routeMapView.tsx` mtime 2026-08-30, `RecordScreen.tsx` mtime 2026-09-02 (post-WP-A).**

---

# WP-P — Live map + blue dot on RECORD / START / RACE for user-created routes (the "HomeWork" blank map)

## 1. Goal

Whenever Nathan has picked his own Home→Work way (or any route born on the phone), all three RECORD phases — setup (RECORD tab), armed (START screen), running (race screen) — must show the real basemap with the blue rider dot centred on his position, even though the app cannot yet draw that route's line. Today all three render **nothing**. This is a hard product requirement (D-041: map on every screen incl. live), and it was already the #1 "add ASAP" item in Nathan's ride-1 notes of 2026-09-01.

## 2. Current state — root cause (verified)

### 2.1 What "HomeWork" is

Not a bundled route and not a renamed id. It is the way Nathan created on ride 1 (2026-09-01 09:17) through the post-stop naming flow — `data/activities/TEST in virgin-app rides/qualifire-20260901/qualifire-catalog-20260901.json`:

- landmarks `lm:20260901-091752-f6ca:start` "Home" / `…:end` "Work"
- way `way:20260901-091752-f6ca`
- route `route:20260901-091752-f6ca`, `refLineId: "route:20260901-091752-f6ca"`, `seeded: false`, one geometric gate set (5 gates, 5.6 km).

The RECORD tab shows it as "Home → Work"; Nathan calls it HomeWork.

### 2.2 The mechanism (all three phases, same guard)

| Where | Code | Effect for a user route |
|---|---|---|
| `RecordScreen.tsx:1087` (setup) | `routeId={pickedRoute?.refLineId ?? null}` | `'route:20260901-091752-f6ca'` |
| `RecordScreen.tsx:840` (armed) | same | same |
| `RecordScreen.tsx:936,941` (running) | `routeId={live.mode === 'free' ? null : (live.track ?? rideRouteHint)}`, `gatesOnly={live.mode === 'free'}` | a picked route is `mode: 'route'` (engine default, `engine.ts:352,378`) → non-null id, `gatesOnly` false |
| `routeMapView.tsx:76` | `ASSETS = manifest.routes` from `assets/routes/routes.json` | 20 bundled keys only (listed in §2.3); **no `route:*` key can ever exist there** — the manifest is built offline by the Python renderer |
| `routeMapView.tsx:233` | `asset = !gatesOnly && id !== null ? ASSETS[id] : undefined` | `undefined` |
| `routeMapView.tsx:344` | `if (!gatesOnly && !asset) return null;` | **whole component returns null — no tiles, no dot, no "waiting for GPS" badge** |
| `routeMapView.tsx:634` | PNG rung: `if (!asset) return null;` | same on the fallback rung |

The rider dot (`:526-540`) needs only `lat`/`lon` and is already mounted independently of the route layers — but it sits below the `:344` return, so it never gets a chance. `settings.liveMap` (`settings.tsx:32`, default `true`) is not the cause; it wraps all three rungs identically and would blank the demo tab too.

### 2.3 What it is NOT

- **Not a catalog desync from cycle 025's renames.** `routes.json` keys (verified 2026-09-02): Morning, EveningA, EveningB, MorningB, WorkStationA, WorkStationB, StationWorkAlt, StationWorkStd, HomeStationPreferred, HomeStationViaFosh, StationHomePreferred, WorkChurchA, WorkChurchB, HomeChurch, ChurchHome, HomeFosh, FoshHome, WorkFosh, ChurchFosh, StationHomeWet — 20 keys, the same 20 track ids `refs.json` carries (`refs.ts:29-33`, post-WP-D1 "every route.refLineId === route.id"). Cycle 025 changed **display names only** (`defaultRoute.ts:13-23` `ROUTE_DISPLAY_ID`), never ids. Every bundled route still resolves.
- **Not a regression from a specific commit.** The map was never decoupled from asset resolution; on `main` the coupling was invisible because every catalog route had an asset and `defaultRouteId()` (`routeMapView.tsx:83-84`) always found one. The virgin build — empty catalog, every route user-created — is the first environment where `ASSETS[id]` misses, so "add back" is how it feels from the phone, but nothing was removed. (Digest 2's git-history check did not complete; this reading is from the code itself and from WP-C §2.1's independent verification of the same lines. A `git log` on `routeMapView.tsx` is welcome but would not change the fix.)
- **Why ride 1 did show a running map:** ride 1 was a *free* ride (`live.mode === 'free'` → `gatesOnly` → basemap + dot + every bundled route's gate rings — the "black circles" Nathan flagged, which is WP-E/Q6). Ride 2 and every ride since WP-A's hard pick take the `mode: 'route'` path and hit the guard.
- **`STATE.md:41`** ("MapLibre + OpenFreeMap live on every screen including the live ride") is true only for bundled routes. Correct it when this lands (§3.3).

### 2.4 Why the fix is already written

`WP-D-rider-only-map.md` §3.1 replaces the guard with `riderOnly = !gatesOnly && !asset; if (riderOnly && !showRider) return null;`, makes every `asset!` conditional, replaces the Leuven-literal camera fallback with `cameraTargetFor()` (fix → bounds → nothing), mirrors the degraded frame on the PNG rung, and leaves `RecordScreen`'s three rungs untouched (they already pass `lat`/`lon`). WP-D §2.2 already names the setup/armed blank as its target; §2.2's "running passes gatesOnly" sentence describes the *free-ride* case — for a **picked user route** the running rung is not gatesOnly and hits the same guard, so WP-D's guard change fixes all three phases at once. Executor: read WP-D §2.2 with that clarification; nothing in WP-D's §3 needs to change.

WP-D's optional Pieces A and B are what make the result match Nathan's ride-1 wording ("centered around it"): Piece B (non-prompting `refreshPositionIfPermitted()` on RecordScreen mount) puts the dot on the setup map on a cold launch without pressing RECORD; Piece A (stop nulling `lastLat/lastLon` at `startTracking()`) removes the ~1 s untargeted frame at START. **Take both.**

## 3. Proposed changes

### 3.1 Execute WP-D as written, first in the queue

Land `WP-D-rider-only-map.md` (all of §3.1-3.4 plus Pieces A and B) **before** B, C, F, J, L. Reasons: it is small; it is the only WP that fixes a "no map at all" state; Nathan has now asked for it twice (ride-1 notes 2026-09-01, chat 2026-09-02); and WP-O Phase 2 (demo "first ride") and WP-J both depend on its guard change landing once, cleanly. Bundle WP-N (round gate-tick line caps, two style words) into the same `routeMapView.tsx` edit — README already says "bundle into whichever WP next touches the gate-tick layers."

### 3.2 Then the follow-ons, in this order

1. **WP-J** (trail) — on the now-rendering rider-only map, HomeWork rides show the yellow line being written behind the dot (this is also what Nathan asked for in ride-1's "colour the line behind me solid yellow as I ride"). WP-J Step 3 becomes a no-op/diff check because WP-D has done it.
2. **WP-C** (drawable user routes) — the HomeWork reference line and its 5 gate ticks appear on setup/armed/running. Until then the map for HomeWork is deliberately basemap + dot (+ trail after WP-J) — exactly the "even if no ride is shown" fallback Nathan accepted.
3. **WP-K** wiring (after Q7's yes) — sector segments colour live on HomeWork.

### 3.3 Documentation corrections (coordinator, when WP-D lands)

- `STATE.md:41` → "MapLibre + OpenFreeMap live on every screen including the live ride; on a route the manifest cannot draw (user-created, until WP-C) the map is basemap + rider dot only."
- `RecordScreen.tsx:1079-1083` comment ("falls back to the first route in the asset manifest … acceptable as the candidate") is stale for the virgin build — WP-D §3.4 already covers rewriting it.
- `README.md` status rows for D and P.

### 3.4 Optional, cheap, honest pin (executor's call, ≤10 lines)

`tests/store_suite.ts` or `routemap_suite.ts`: assert that `assets/routes/routes.json` contains **no key starting with `route:`** and that `defaultMapRouteId()` over a catalog containing only a `route:*` route (WP-C §2.1's predicate `(ref) => ASSETS[ref] !== undefined`) returns `null`. This pins the root cause as a fact the suite knows, so a future "why is the map blank on a user route" starts from a failing assertion rather than a phone report. Skip if an equivalent assertion already exists in `store_suite.ts` (check with `grep -n "defaultMapRouteId" tests/*.ts`).

### 3.5 Explicitly NOT in this WP

Any second implementation of the guard/camera change (WP-D owns it). Drawing the HomeWork line (WP-C). The bundled-gates leak on free rides (WP-E/Q6). Persisting the RECORD-tab pick across relaunch (open note in QUESTIONS-FOR-NATHAN.md).

## 4. Test plan

Headless: WP-D's `cameraTargetFor` suite as written, plus §3.4 if taken.

**On-device acceptance, HomeWork specifically (Nathan, both themes) — this is the checkable artifact for this WP:**

1. Kill the app, cold launch, RECORD tab, nothing picked: basemap + blue dot centred on you within a few seconds (Piece B), "waiting for GPS" badge until then. No route line, no black circles.
2. Pick Home → Work: map stays; still no line/ticks (expected until WP-C); dot still centred.
3. Press RECORD → START screen: map fills the space above START, dot centred, pannable.
4. Press START → running: map with dot, no untargeted "world at zoom 0" flash (Piece A); dot follows as you move; OFF ROUTE badge never appears (nothing to be off).
5. Settings → live map OFF → all three phases show the spacer instead (unchanged behaviour); ON again → map back.
6. Regression: ROUTES and RESULT screens unchanged; a bundled-route pick (if any exists on the build) still draws its line and ticks; DEMO tab unchanged.

Expected before WP-D: steps 1-4 show no map at all. That before/after is the proof.

## 5. Verification

```
cd app
node --experimental-strip-types tests/run.ts
grep -n "4\.68\|50\.85" src/ui/routeMapView.tsx   # expect no output (WP-D)
grep -n "asset!" src/ui/routeMapView.tsx           # expect no output in the MapLibre rung (WP-D)
./node_modules/.bin/tsc --noEmit
```

## 6. Files touched

None beyond WP-D's own list (`src/ui/routeMapView.tsx`, `src/ui/routeMapGeo.ts`, `tests/routemapgeo_suite.ts`, `src/ui/RecordScreen.tsx` comments + Pieces A/B, `src/location/index.ts` for Piece A/B), plus `STATE.md` (§3.3) and optionally one test file (§3.4).

## 7. Open questions (none blocking)

1. WP-D §7.2 — world view vs. no-map during the no-fix/no-bounds window. Pieces A/B make the window short; decide on device.
2. Whether to also show the picked way's two landmark circles (Home/Work, radius 120 m — they exist in the catalog and need no asset) on the rider-only map before WP-C lands. It would give Nathan *some* route context on HomeWork immediately. Not designed here because it is a new map element and Nathan has not asked for it; if he wants it, it is a small follow-on (a `landmarks` prop + one circle source), not part of WP-D.
