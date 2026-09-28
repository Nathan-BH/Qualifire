# 04 — Retire the free-mode / free-gates machinery (engine, catalog, map, tests)

**Source: Nathan, 2026-09-28.** His words: "… the idea was once to have free gates then, but
i want to retire this idea entirely" — "never by having gates scattered on a map (this idea
needs complete removal)".

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-28 by the Plan
tier (Fable) from two Haiku digests plus anchor checks against the working tree (branch
`virgin`, HEAD `2c21265`). Executor: Sonnet, cold, this file only. Brief 04 of
`virgin-cycle16`. **Order: after brief 01** (which makes every path below unreachable) and
**after brief 02** (which removes the store's `LiveEngineState` dependency and rewrites
`live_colour_suite`'s free tests — this brief must not find `rememberFreeRide` anywhere).
Independent of brief 03. **This is dead-code removal: no behaviour on the phone changes.**
It is the largest brief in the folder (six source files, ten test suites); the coordinator
may run it as one Sonnet execution or split it at the §-boundaries below (each § is
self-contained and leaves the tree green if its tests are done with it).

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-28. Where
  this brief says "read X-Y and remove the block that …", the block's start and end are
  named; if the block is not shaped as described, or a `free`/`gatesOnly` reference turns
  up that is not on this brief's list, **stop and report it verbatim** (file, line, text).
  Never guess, never patch around it, never rule on it yourself.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete a FILE — `_to_delete/` is the bin (`mv`, never `rm`), and
  **never call `device_request_delete_permission`**, for any reason. Deleting LINES inside
  a file is what this brief is; that is fine.
- **Two "free"s that are NOT this brief's** — leave them alone:
  1. the map CAMERA mode `'follow' | 'fit' | 'free'` (`wayMapGeo.ts:483,496`,
     `wayMapView.tsx:36,81,405,409,658,704`, `waymapgeo_suite.ts` tests at 555/606/631
     "cameraTargetFor — free mode …"). "free" there means "the rider dragged the map".
  2. the on-disk DATA vocabulary `mode?: 'route' | 'free'` on index entries and GPX+ pick
     events (`storage/core.ts:28`, `storage/types.ts` `IndexEntry.mode`, the `PickEvent`
     type, `gpxplus_suite.ts:784,806,929`, `resultsstore_suite.ts:367`, the
     `r.mode !== 'free'` filters in `RidesScreen.tsx:95` and `lastRide.ts:269`). Rides
     recorded before brief 01 carry it; readers must keep tolerating it.
- No new dependency. No change to `app/src/store/freeRides.ts`, `migrations.ts`,
  `RideDetailScreen.tsx`, `RidesScreen.tsx`, `ResultsScreen.tsx`, `rideHistoryModel.ts`,
  `rideDetailModel.ts` (briefs 02/03 own them and they no longer reference anything here).
- Do not edit `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`, any other `NN-*.md` brief
  here, or anything under `cycles/virgin-cycle*/` history.
- Preconditions: `grep -rn "rememberFreeRide\|mode: 'free'" app/src/ui/RecordScreen.tsx app/src/store/freeRides.ts`
  → no hits. Otherwise stop: 01/02 have not landed.

## Goal

After this brief the words `freeCrossings`, `freeSectors`, `feedFree`, `freeRideWayIds`,
`allGatesFeatureCollection`, `allGatesBounds`, `liveMapGateWayIds`, `gatesOnly`,
`crossedGates`, `gateWayIds` and the engine's `mode` option/state do not exist in
`app/src` or `app/tests`. `LiveEngine` has one mode (the route machinery); every
`GateDetector` arms normally; `WayMapView` has no gates-only rendering path;
`liveMapOverlayFor` takes `{track, wayHint}`. Tests that existed only to pin the removed
behaviour are removed; tests that used a removed helper incidentally are re-expressed
without it. Zero FAIL, `tsc` clean, and the phone behaves exactly as after briefs 01-03.

## Current state (verified 2026-09-28 against the tree)

### § A — `app/src/live/engine.ts`

- Lines 84-~105 (file header): the `FREE MODE (WP-B, …)` paragraph(s) — starts at
  ` * FREE MODE (WP-B, Nathan's 2026-08-20 notes; cycle 024): \`start({mode:` and runs until
  the next ` *` heading; read it to find the end.
- Lines 227-230 (`EngineStartOptions`): `/** 'route' (default) = today's lock/verify
  machinery. 'free' (WP-B) = every …` + `mode?: 'route' | 'free';`. Line 234 `wayIds?:
  string[] | null;` **stays** (route mode's sport scoping uses it).
- Lines 320-329 (`LiveEngineState`): `mode: 'route' | 'free';` with its doc (320-322),
  `freeCrossings: { wayId; gateIndex; t; estimated }[];` with its doc (323-325),
  `freeSectors: { wayId; index; rawS }[];` with its doc (326-329). Line 337: a doc
  sentence containing `that crossing, in free mode, and whenever \`track\` is null.`
- Lines 389-395: `private mode: 'route' | 'free' = 'route';`, `private freeCrossings … = [];`,
  `private freeSectors … = [];`, then a comment (392-395) about the "last non-estimated
  crossing" used to derive `freeSectors` and, presumably, one more private field under
  it — read 386-400 and treat every field whose doc mentions freeSectors/free mode as
  this brief's.
- `start()`: line 415 `this.mode = opts?.mode ?? 'route';`; lines 423-424
  `this.freeCrossings = []; this.freeSectors = [];`; lines 440-443:

  ```ts
        // WP-B: free mode arms nothing (D-016(b) arming disabled) — a free
        // ride can begin anywhere, so "you were already past this gate" must
        // never invent a fire (see the file header's FREE MODE section).
        det: new GateDetector(spec.gates, this.mode === 'free' ? 0 : undefined),
  ```

- `stop()`: lines 463-465 `this.mode = 'route'; this.freeCrossings = []; this.freeSectors = [];`.
- `feed()`: lines 495-506 — the seven-line `// WP-B free mode: no lock state machine …`
  comment and

  ```ts
      if (this.mode === 'free') {
        this.feedFree(lat, lon, tSec);
        this.emit();
        return;
      }
  ```

- Lines 583-~612: `/** WP-B free mode's whole per-fix rule: …*/` + `private feedFree(lat,
  lon, tSec): void { … }` — ends before the `/** Called once when the ride ends` doc of
  `finalize()` (612).
- `finalize()`: doc lines 617-619 (`* WP-B: a no-op in free mode — …` through `… not a
  settled \`locked\` candidate. */`) and line 621 `if (this.mode === 'free') return; //
  nothing to do — see the file header`.
- Lines 729-740: the `gateFires` derivation — a comment block (`// WP-B: in free mode
  gateFires is the TOTAL count …`) and `const gateFires = this.mode === 'free' ? this.freeCrossings.length : <route expression>;`
  — read 728-745 for the route-mode operand.
- Lines 761-763 (`getState()`): `mode: this.mode,`, `freeCrossings: [...this.freeCrossings],`,
  `freeSectors: [...this.freeSectors],`.

### § B — consumers of `LiveEngineState.mode` / the start option

- `app/src/ui/recordFlow.ts:83-90`:

  ```ts
  export function liveMapOverlayFor(input: {
    mode: 'route' | 'free';
    track: string | null;
    wayHint: string | null;
  }): LiveMapOverlay {
    const wayId = input.mode === 'free' ? null : (input.track ?? input.wayHint);
    return { wayId, showTrail: wayId === null };
  }
  ```

  with doc lines 73-82 listing three states (state 1 = "free ride (new>>new)").
- `app/src/ui/RecordScreen.tsx` (after brief 01): line ~893
  `const mapOverlay = liveMapOverlayFor({ mode: live.mode, track: live.track, wayHint: rideWayHint });`
  and line ~1338 `selfs={settings.selfDots && live.mode === 'route' ? selfDots : undefined}`.
  (Brief 01 shifted line numbers; match on text.)
- `app/src/location/index.ts:312-314`: `/** WP-B: 'route' (default) or 'free' — threaded
  straight to …` + `mode?: 'route' | 'free';` in the start options; further down the
  option is passed to `engine.start({...})`, to `startRide(mode, sportId)` and into the
  GPX+ `pick` event's `mode` — `grep -n "mode" app/src/location/index.ts` lists every
  site; read each.
- `app/tests/recordflow_suite.ts:136,139`: `liveMapOverlayFor({ mode: 'free', track: null,
  wayHint: null })` / `({ mode: 'free', track: 'HomeWork', wayHint: 'HomeWork' })` inside
  one test (read 125-150 for its bounds); other calls in that suite pass `mode: 'route'`.

### § C — `app/src/store/catalog.ts`

- Lines ~178-204: doc comment (ends `… rather than guessing a filter for a case that cannot
  legitimately arise. */`) + `export function freeRideWayIds(c: Catalog, from: string |
  null, to: string | null): string[] | null { … }` ending at the `return null;\n}` before
  `/** True when the way needs a route pick at START (Nathan, §8a). */`.
- `app/tests/store_suite.ts:28` imports it; lines 178-195 are five assertions inside one
  test — read 170-200 for the test's `test('…', () => {` / `});` bounds.

### § D — `app/src/ui/wayMapGeo.ts` and `app/src/ui/wayMapView.tsx`

- `wayMapGeo.ts:105-127` `export function allGatesFeatureCollection(assets, crossed,
  crossedColour, wayIds?)`; its property type `AllGateProperties` (grep — remove if it has
  no other user); `allGatesBounds` (grep for `export function allGatesBounds`);
  lines 517-539 the `// ===== virgin-cycle15 06 (cross-ride gate leak)` banner, doc and
  `export function liveMapGateWayIds(rideFreeWayIds)`. Line 367 is a comment mentioning
  the old gate-circle rendering — leave.
- `wayMapView.tsx`: line 93 imports `allGatesBounds, allGatesFeatureCollection` (among
  others); prop docs/declarations 211, 257-266 (`gatesOnly?: boolean;`, `crossedGates?:
  …`, `gateWayIds?: string[] | null;`), 271-273 doc mentions; line 377 `const gatesOnly =
  props.gatesOnly ?? false;`; then every use: 379, 528-534, 581, 590-593, 598-601,
  605-618 (`drawable`, `gatesFC`), 628, 635, 644-651 (`gatesOnlyBounds`), 828 (comment),
  853-861 (`{gatesOnly ? (<M.GeoJSONSource key="gates" id="gates" data={gatesFC!}> …
  </M.GeoJSONSource>) : …}`), 1047-1048 (PNG rung: `const gatesOnly = props.gatesOnly ??
  false; if (gatesOnly) { … }` — its frame mounts a `<Credit rung="png" …>`), 1064-1067,
  1083 (comments).
- `app/tests/waymap_suite.ts:348` asserts the PNG rung source mounts `<Credit rung="png"`
  **3** times (`… in its gatesOnly frame, its place frame (virgin-cycle15 brief 12), and
  its image frame`); line 263 is a comment.
- `app/tests/waymapgeo_suite.ts`: tests at 154, 167, 175, 180 (`allGatesFeatureCollection`),
  193 (`allGatesBounds`), 222, 227 (`liveMapGateWayIds`).
- `app/tests/virginmanifest_suite.ts:26` imports `allGatesBounds, allGatesFeatureCollection`;
  uses at 127, 132, 141-142, 177 count gate FEATURES to check the seed manifest.
- `app/tests/wayasset_runtime_suite.ts:32` imports `allGatesBounds, allGatesFeatureCollection`;
  314-317 counts gate features over `allRouteAssets()`.

### § E — engine tests

- `app/tests/live_suite.ts`: tests at 686, 733, 749 are titled `live: free mode: …`; 764,
  780, 794 (`WP-B coordinator addendum — start({routeIds}) …`) test `wayIds` filtering,
  which **stays** — read each to see whether it passes `mode: 'free'` or reads
  `freeCrossings`; test 1378 `'live N9 L5: a ride that never locks, and a free ride, both
  emit zero lockChanges'` has a free half.
- `app/tests/selfrace_suite.ts:303-~360`: two tests `'selfrace: engine — free mode never
  sets startGateT'` and `'… never sets chainageM'` (`engine.start({ mode: 'free' })`).
- `app/tests/catalogstore_suite.ts:206`: `engine.start(mode === 'free' ? { mode: 'free',
  wayIds: null } : undefined);` inside a helper — read 195-215 for the helper and its
  callers.
- `app/tests/scratch_freeride_replay.ts`: a scratch replay script (header line 12 mentions
  `freeSectors`); `app/tests/run.ts` imports suites by name (lines 14-24+) — check it is
  **not** imported there.

## Decisions (pre-resolved — do not re-open)

1. **Remove, don't stub.** No `mode: 'route'` literal left on `LiveEngineState`, no
   always-false `gatesOnly` prop. Nathan asked for complete removal; a stub is the thing
   the next reader trips over.
2. **The data vocabulary stays** (Executor rules, "free" #2). `startRide('route', …)` keeps
   writing `mode: 'route'` to the index so old readers stay consistent; the type
   `'route' | 'free'` on `IndexEntry`/`PickEvent`/`startRide` is untouched.
3. **`GateDetector`'s optional `armWithinM` parameter stays** (only its `0` caller goes).
   Its own tests, if any, are not this brief's.
4. **`liveMapOverlayFor` loses `mode`**; state 1 in its doc is dropped; the RecordScreen
   caller and the `selfs=` line drop their `live.mode` reads.
5. **Tests that pinned free-mode behaviour are deleted; tests that used a removed helper
   as a counting convenience are re-expressed** with a local `gateCount(assets)` helper
   (`Object.values(assets).reduce((n, a) => n + a.gates.length, 0)`) so what they
   actually assert (manifest/asset gate counts) is preserved.
6. **`scratch_freeride_replay.ts` is `mv`'d to `_to_delete/`**, not edited — it is not a
   suite and its subject no longer exists.
7. **`waymap_suite.ts:348` becomes 2** (`its place frame … and its image frame`) — the
   gatesOnly PNG frame is gone, so the count drops by exactly one.

## Files to touch

Work § by § in this order; run the full verification after each §.

### § A — `app/src/live/engine.ts`

1. Header: replace the whole `FREE MODE …` paragraph(s) with:

   ```
    * FREE MODE — retired (virgin-cycle16 04, Nathan 2026-09-28). WP-B's
    * start({mode:'free'}) — every candidate armed at 0, every fire collected
    * into freeCrossings/freeSectors for a gates-only live map — is gone: a
    * "free ride" is now a post-ride label (store/freeRides.ts), never an
    * engine mode. One mode remains: the lock/verify machinery below.
   ```

2. Delete `EngineStartOptions.mode` and its doc (227-230).
3. Delete `LiveEngineState.mode`, `freeCrossings`, `freeSectors` and their docs (320-329);
   in the doc at 337 drop the words `, in free mode` (wording only).
4. Delete the private fields `mode`, `freeCrossings`, `freeSectors` (389-391) and the
   free-sector bookkeeping field(s) documented at 392-395 (read 386-400; anything used
   ONLY by `feedFree` goes; anything also used by route mode → stop and report).
5. `start()`: delete 415, 423-424; replace 440-443 with `det: new GateDetector(spec.gates),`.
6. `stop()`: delete 463-465.
7. `feed()`: delete 495-506 (comment + early branch).
8. Delete `feedFree` and its doc (583-~612).
9. `finalize()`: delete doc lines 617-619 and line 621.
10. `gateFires` (729-740): delete the WP-B comment and replace the ternary with its
    route-mode operand alone (`const gateFires = <route expression>;`).
11. `getState()`: delete 761-763.
12. `grep -n "free\|Free\|this\.mode\|opts?\.mode" app/src/live/engine.ts` → **no hits**.
    A hit you cannot place on the list above → stop and report.

### § B — consumers

1. `recordFlow.ts`: `liveMapOverlayFor` → input `{ track: string | null; wayHint: string |
   null }`, body `const wayId = input.track ?? input.wayHint;`. In its doc (73-82) delete
   the ` *  1. free ride (new>>new) -> …` line and renumber 2→1, 3→2; "Three states" →
   "Two states".
2. `RecordScreen.tsx`: `liveMapOverlayFor({ mode: live.mode, track: live.track, wayHint: rideWayHint })`
   → `liveMapOverlayFor({ track: live.track, wayHint: rideWayHint })`;
   `selfs={settings.selfDots && live.mode === 'route' ? selfDots : undefined}` →
   `selfs={settings.selfDots ? selfDots : undefined}`. Then `grep -n "live\.mode\|mode:"
   app/src/ui/RecordScreen.tsx` → no `live.mode` hits (other `mode:` hits, e.g. settings'
   `startMode`, are unrelated — leave).
3. `location/index.ts`: delete the `mode?: 'route' | 'free'` option and its doc (312-314);
   at each site `grep -n "mode" app/src/location/index.ts` lists: an `engine.start({ …,
   mode: … })` property → delete the property; `startRide(<mode expr>, sportId)` →
   `startRide('route', sportId)`; a `pick` event's `mode: <expr>` → `mode: 'route'`; a
   recovery/re-arm path reading a stored `session.mode` → treat the stored value as data
   and pass nothing to the engine (delete the engine-side use only). Any site not of
   these four shapes → stop and report.
4. `recordflow_suite.ts`: delete the test containing the two `mode: 'free'` calls (read
   125-150 for bounds); in every remaining `liveMapOverlayFor({ mode: 'route', … })` call
   drop `mode: 'route', `.

### § C — catalog

1. `catalog.ts`: delete `freeRideWayIds` with its doc comment (through `return null;\n}`).
2. `store_suite.ts`: drop `freeRideWayIds,` from the import (28); delete the test that
   holds lines 178-195 (read 170-200 for its bounds). If that test also asserts on
   something else (a different function), delete only the five `freeRideWayIds`
   assertions and keep the rest; if it becomes empty, delete it.
3. `grep -rn "freeRideWayIds" app/src app/tests` → no hits.

### § D — map

1. `wayMapGeo.ts`: delete `allGatesFeatureCollection` (105-127) and `AllGateProperties` if
   nothing else uses it; delete `allGatesBounds`; delete the `virgin-cycle15 06` banner,
   doc and `liveMapGateWayIds` (517-539). **Leave `cameraTargetFor` and its `'free'`
   camera mode.**
2. `wayMapView.tsx`: remove `allGatesBounds, allGatesFeatureCollection` from the import
   (93); delete the `gatesOnly`, `crossedGates`, `gateWayIds` props and their docs
   (211, 257-266) and the doc mentions at 271-273; delete line 377; then treat
   `gatesOnly` as the constant `false` at every remaining site and simplify —
   `!gatesOnly && X` → `X`, `gatesOnly ? A : B` → `B`, `gatesOnly || !asset` → `!asset`,
   `if (gatesOnly) { … }` → gone, `[asset, gatesOnly]` dep arrays → `[asset]`; delete
   `drawable`/`gatesFC`/`gatesOnlyBounds` (605-618, 644-651) and the `{gatesOnly ? (…gate
   rings…) : (` branch at 853-861 keeping its else; delete the PNG rung's gatesOnly frame
   (1047-1048's `if` block). Rewrite comments at 581, 590-606, 644-646, 828, 1064-1067,
   1083 to drop the gatesOnly mentions (wording; a comment that ONLY describes gatesOnly
   is deleted). `grep -n "gatesOnly\|crossedGates\|gateWayIds\|allGates" app/src/ui/wayMapView.tsx`
   → no hits. Camera-mode `'free'` hits (36, 81, 405, 409, 658, 704) remain.
3. `waymap_suite.ts:348`: `=== 3` → `=== 2`, message → `'PNG rung must mount <Credit> in
   its place frame (virgin-cycle15 brief 12) and its image frame'`. Line 263's comment:
   drop the gatesOnly clause (wording).
4. `waymapgeo_suite.ts`: delete the seven tests at 154, 167, 175, 180, 193, 222, 227
   (each `test(` … `});`), and prune `allGatesFeatureCollection`, `allGatesBounds`,
   `liveMapGateWayIds` from the import. Keep every `cameraTargetFor` test.
5. `virginmanifest_suite.ts` and `wayasset_runtime_suite.ts`: add at the top of each
   `const gateCount = (assets: Record<string, { gates: readonly unknown[] }>) => Object.values(assets).reduce((n, a) => n + a.gates.length, 0);`
   then: `allGatesFeatureCollection(X, undefined, '#000', null).features.length` →
   `gateCount(X)`; `allGatesFeatureCollection(drawable, undefined, '#000', ['Morning']).features.length === 0`
   → `(drawable['Morning']?.gates.length ?? 0) === 0`; `allGatesFeatureCollection(all,
   undefined, '#fff')` (wayasset 314) → `gateCount(all)` and adapt the following
   assertion (317) to compare that number to `expectedGateCount` with the same message
   minus "features". Prune the two imports. Any use of `allGatesBounds` in these two
   suites → read the assertion; if it only checks "bounds contain the gates", delete that
   assertion; otherwise stop and report.

### § E — engine tests

1. `live_suite.ts`: delete the three `live: free mode: …` tests (686-763). For 764/780/794
   read each: if it calls `start({ wayIds })` in route mode only, keep; if it passes
   `mode: 'free'`, change the call to route mode ONLY when the assertions are about
   candidate filtering (which they are, per the titles) — and if an assertion then reads
   `freeCrossings`, replace that read with the route-mode equivalent the test's own
   comments name, or stop and report. Test 1378: remove the free-ride half (its
   `start({ mode: 'free' })` engine, feed loop and assertions) and retitle
   `'live N9 L5: a ride that never locks emits zero lockChanges'`.
2. `selfrace_suite.ts`: delete the two `free mode never sets …` tests (303-~360).
3. `catalogstore_suite.ts:206`: read 195-215; the helper's `mode` parameter and the
   ternary go (`engine.start()` or `engine.start({ wayIds })` as the route branch had it);
   any caller passing `'free'` → that caller's test is deleted; if a caller's assertions
   depend on free-mode behaviour but its title does not say so → stop and report.
4. `mv app/tests/scratch_freeride_replay.ts _to_delete/scratch_freeride_replay.ts`
   (create `_to_delete/` at the repo root if absent). Confirm `run.ts` never imported it.
5. `live_colour_suite.ts`: after brief 02 it must contain no `mode: 'free'`,
   `freeCrossings`, `freeSectors` — `grep` to confirm; a hit means 02 did not land as
   briefed → stop and report.

## Verification

From `app/`: `node --experimental-strip-types tests/run.ts` → zero FAIL;
`./node_modules/.bin/tsc --noEmit` → exit 0. Then the final sweep:

- `grep -rn "freeCrossings\|freeSectors\|feedFree\|freeRideWayIds\|allGatesFeatureCollection\|allGatesBounds\|liveMapGateWayIds\|gatesOnly\|crossedGates\|gateWayIds\|AllGateProperties" app/src app/tests`
  → **no hits**.
- `grep -rn "mode: 'free'\|mode === 'free'\|mode !== 'free'" app/src app/tests` → only the
  DATA sites: `RidesScreen.tsx`, `lastRide.ts` (`r.mode !== 'free'`), `gpxplus_suite.ts`
  (784, 806, 929), `resultsstore_suite.ts` (367), plus the camera-mode sites in
  `wayMapGeo.ts:496` / `wayMapView.tsx` and their `waymapgeo_suite` tests. Anything else → report.
- `grep -rn "'route' | 'free'" app/src` → only `storage/core.ts`, `storage/types.ts`
  (`IndexEntry`, `PickEvent`) — not `engine.ts`, not `location/index.ts`, not `recordFlow.ts`.
- `ls _to_delete/scratch_freeride_replay.ts` → exists; `ls app/tests/scratch_freeride_replay.ts` → gone.
- `GIT_OPTIONAL_LOCKS=0 git diff --stat` → the files named in §A-§E and nothing else.

## On-device checklist (Nathan, after publish)

This brief changes no behaviour; the checklist is a regression pass:

1. Known route ride (Home → Church): line, ticks, lock, lap, reveal — as before.
2. Home → new ride: trail-only map, no gate circles, ride-detail with the naming offer and
   "Save as free ride" (brief 02) — as after 01/02.
3. Self-dots (SETTINGS → self dots ON) still draw during a route ride.
4. Drag the live map mid-ride: it stays where you dragged it (camera "free" mode untouched).
5. Replay a ride, browse a way on ROUTES, the place-detail map — all unchanged.
6. Old rides recorded in free mode before brief 01 (if any) still open from RIDES.

## Out of scope

- `GateDetector`'s `armWithinM` parameter itself (decision 3).
- The index/pick-event `mode` data field (decision 2).
- Anything in `freeRides.ts` / `migrations.ts` (brief 02's).
- `STATE.md`, `OPEN-ITEMS.md`, this folder's `README.md` — the coordinator's.

## What this changes on Nathan's phone

Nothing visible — dead code out, tests trimmed. Ships as JS over EAS Update with whatever
else is published next; no build.

## Open questions / assumptions (logged, not blocking)

1. **Split or not.** §A+§B+§E (engine and its tests) and §C, §D are independent; a
   single cold Sonnet run is the default, but if it stops on a `live_suite` shape it
   cannot resolve, the coordinator can land §C/§D first — they do not depend on §A.
2. **`live_suite` 764/780/794** may exercise `wayIds` filtering THROUGH free mode
   (counting `freeCrossings` per candidate is the easiest way to see which candidates
   existed). If so they need a route-mode equivalent (e.g. counting candidates' fires via
   the emitted gate events); the brief tells the executor to stop rather than invent one —
   expect at most one escalation here.
3. **Old free-mode rides on disk** keep their `mode: 'free'` index entries and stay
   excluded from backfill; the only reader that ever used their `freeCrossings` (the ride
   detail's sector list) is gone since brief 02. They open as trail-only rides.

## Fable ruling on Sonnet executor escalation (2026-09-29)

**Status:** ruling only — not yet applied. Plan tier (Fable), 2026-09-29, read against the
UNCOMMITTED working tree after the 01-04 executor run (`app/src/live/engine.ts` and
`app/tests/live_suite.ts` as they stand, not HEAD). This is the escalation "Open questions"
§2 above predicted. **Decision: convert, not delete** — exact bodies in §R4 below.

### R1 — The escalation (verbatim)

> While executing `04-retire-free-gate-machinery.md`, three tests in `app/tests/live_suite.ts`
> (around lines 692-725) were left deliberately unconverted and are now failing / causing tsc
> errors, because converting them requires a genuine design decision the brief didn't
> pre-resolve:
> `'live: WP-B coordinator addendum — start({routeIds}) restricts candidates, not just which fires get shown'`
> `'live: WP-B coordinator addendum — start({routeIds}) filtered to the ridden route(s) still fires normally'`
> `'live: WP-B coordinator addendum — routeIds omitted/undefined is unfiltered, identical to the full catalog'`
> These three tests previously exercised `mode: 'free'` starts with `freeCrossings`/`freeSectors`
> assertions (e.g. "want 5" Morning crossings) — both now DELETED from
> `EngineStartOptions`/`LiveEngineState` by brief 04. […] converting these to route-mode
> requires substituting freeCrossings/freeSectors reads with a route-mode equivalent (e.g.
> counting emitted gate events), and the exact numeric assertions (e.g. 'want 5' Morning
> crossings) may legitimately differ under route-mode's default GateDetector arming vs free
> mode's armWithinM=0.
>
> Current state: `tests/run.ts` → 731 pass / 3 fail (exactly these three) / 3 skip;
> `tsc --noEmit` → exit 2, 14 errors, all inside these three tests.

The stop was correct: the brief said "replace that read with the route-mode equivalent the
test's own comments name, or stop and report", and the tests' comments name none.

### R2 — Findings (current tree)

1. **The filter survives, unchanged.** `engine.ts:199-209` `EngineStartOptions` still has
   `wayIds?: string[] | null` (doc: "restricts `cands` to specs whose id is in this list.
   `undefined`/`null` = every spec"); `start()` at `engine.ts:383-386` still does
   `const specs = opts?.wayIds ? allSpecs.filter((s) => opts.wayIds!.includes(s.id)) : allSpecs;`
   and builds `this.cands` from it. So the property the three tests pin — the filter
   restricts which `TrackSpec`s become candidates at all — is live behaviour in the
   single-mode engine and deserves its tests. Deleting them would lose real coverage: no
   other test in `live_suite.ts` passes `wayIds` (grep), and `sportTrackSpecs()` /
   `location/index.ts` sport scoping rides on exactly this option.
2. **The executor's suggested probe (`gate` events) is the wrong one.** `subscribeEvents`
   `gate` events are emitted ONLY for the locked/displayed candidate (`engine.ts:445-451`,
   `465-471`), so they cannot show which candidates *exist* — the very thing test 1 is
   about (its title: "not just which fires get shown").
3. **The right probe already exists: `subscribeDiagnostics`.** `DiagnosticEvent`
   `wayMatchAttempt` with `phase: 'anchor'` is emitted for EVERY candidate on its first fed
   fix — `feedCandidate()` sets `baseS` unconditionally on the first fix (`engine.ts:827`),
   and `feed()` fires the 'anchor' diagnostic whenever `baseS` went null → set
   (`engine.ts:472-479`); the type's own doc says "Fired for EVERY candidate, not just the
   eventual winner". Hence after one fed fix, `{ d.track | d.phase === 'anchor' }` **is**
   the candidate set, byte-for-byte what `start()` built — no new engine surface needed.
   `live_suite.ts` already imports `DiagnosticEvent` and `EngineEvent` (line 21) and uses
   `subscribeDiagnostics` in three other tests (441, 482, 508).
4. **"Want 5" holds under route-mode arming — measured, not assumed.** Spot-run on the
   shipped 20-route catalog over `clean_morning` (scratch at
   `app/safe_to_delete/spot_wayids.ts`, gitignored):
   - `wayIds: ['EveningA','EveningB']` → anchor set exactly `[EveningA, EveningB]`;
     `track null`, `lockKind 'none'`, `gateFires 0`, `anyAnchored false`, 0 `gate` events.
     Default `armWithinM` invented no estimated first-fix fire on either candidate.
   - `wayIds: ['Morning','MorningB']` → anchor set exactly `[Morning, MorningB]`;
     `track 'Morning'`, `lockKind 'verified'`, `gateFires 5`, five `gate` events all
     `track: 'Morning'`. Morning's gate set has 5 gates, so 5 = every gate; the bodies
     below assert against `specs.find(Morning).gates.length` rather than a literal 5.
   - `wayIds: undefined` and omitted → identical: all 20 catalog ids anchor, same state
     (`track null`, `gateFires 5` — the full catalog does not verified-lock this fixture
     without a pick; existing behaviour, not this brief's; the test only asserts the two
     are identical and both unfiltered).
5. **Verified green in advance.** The exact bodies in §R4 were run verbatim through
   `tests/lib.ts`'s `test()`/`runAll()` from `app/safe_to_delete/spot_wayids2.ts`:
   3 pass / 0 fail; and type-checked with the app's `tsconfig.json` extended over that
   file: `tsc` exit 0. Both scratch files stay in `app/safe_to_delete/` (gitignored bin,
   per CLAUDE.md §5) — nothing in `app/tests` or `app/src` was touched by this ruling.

### R3 — Decision

**Convert all three to route mode** using the candidate set observed through
`subscribeDiagnostics` (the existing per-candidate channel) as the replacement for
`freeCrossings`, plus the route-mode outcomes (`track`/`lockKind`/`gateFires`/`anyAnchored`
from `getState()`, and `gate` events from `subscribeEvents` for the ridden-route case).
Titles unchanged (the "WP-B coordinator addendum" history is still what they pin; the
option is spelled `wayIds` in code and `routeIds` in the titles — that pre-exists this
brief; leave it). No engine change, no new export, no new helper beyond one 3-line local
function in the suite.

### R4 — Instruction for the follow-up Sonnet executor (chore-sized; stop-on-ambiguity still binding)

1. In `app/tests/live_suite.ts`, locate the three tests by their exact titles (currently
   lines 684-725: from the line
   `test('live: WP-B coordinator addendum — start({routeIds}) restricts candidates, not just which fires get shown', () => {`
   through the `});` that closes
   `test('live: WP-B coordinator addendum — routeIds omitted/undefined is unfiltered, identical to the full catalog', () => {`,
   i.e. the `});` immediately before the
   `// ---------------------------------------- synthetic corridor-subset routes` banner).
   If the three are not contiguous or not in that order → stop and report.
2. Replace that whole span (the three `test(...)` blocks and nothing else) with the text
   below, verbatim. No import changes: `DiagnosticEvent`, `EngineEvent`, `loadFixture`,
   `assert`, `test`, `LiveEngine`, `catalogTrackSpecs` are all already in scope in this
   file.
3. Verify from `app/`: `node --experimental-strip-types tests/run.ts` → expect
   **734 pass / 0 FAIL / 3 skip**; `./node_modules/.bin/tsc --noEmit` → exit 0. Then rerun
   brief 04's final sweep greps (Verification section above) — they must still be clean.
   Do not commit unless told.

```ts
/** The set of track ids the engine actually built candidates for: the
 * `wayMatchAttempt` 'anchor' diagnostic fires once per candidate on its first
 * fed fix (engine.ts feed(): baseS null -> set, unconditionally), for EVERY
 * candidate, never just the displayed one — so this is the candidate list
 * itself, observed through existing surface. */
function candidateTracks(diag: readonly DiagnosticEvent[]): string[] {
  return [...new Set(diag.filter((d) => d.phase === 'anchor').map((d) => d.track))].sort();
}

test('live: WP-B coordinator addendum — start({routeIds}) restricts candidates, not just which fires get shown', () => {
  // A filter that excludes every route anywhere near a real Morning ride
  // (EveningA/EveningB run work<->home, nowhere near home<->work Morning
  // territory at these chainages) must leave the engine with exactly those
  // two candidates and nothing else: no Morning anchor, no lock, no fires —
  // proving routeIds restricts which TrackSpecs even become candidates, not
  // merely which of their fires get surfaced.
  const f = loadFixture('clean_morning');
  const engine = new LiveEngine(catalogTrackSpecs());
  const diag: DiagnosticEvent[] = [];
  const events: EngineEvent[] = [];
  engine.subscribeDiagnostics((e) => diag.push(e));
  engine.subscribeEvents((e) => events.push(e));
  engine.start({ wayIds: ['EveningA', 'EveningB'] });
  for (let i = 0; i < f.fixes.t.length; i++) engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  const final = engine.getState();
  const cands = candidateTracks(diag);
  assert(cands.join(',') === 'EveningA,EveningB',
    `candidates were [${cands.join(', ')}], want exactly [EveningA, EveningB] — a routeIds filter must restrict the candidate set itself`);
  assert(final.track === null && final.lockKind === 'none',
    `track ${final.track}, lockKind ${final.lockKind} — Morning must not lock when the filter excluded it`);
  assert(!final.anyAnchored, 'a work<->home candidate anchored on a home->work ride');
  assert(final.gateFires === 0, `${final.gateFires} gate fires against a routeIds filter excluding every nearby route`);
  assert(events.filter((e) => e.type === 'gate').length === 0, 'gate events emitted with no candidate near the ride');
});

test('live: WP-B coordinator addendum — start({routeIds}) filtered to the ridden route(s) still fires normally', () => {
  const f = loadFixture('clean_morning');
  const specs = catalogTrackSpecs();
  const nGates = specs.find((s) => s.id === 'Morning')!.gates.length;
  const engine = new LiveEngine(specs);
  const diag: DiagnosticEvent[] = [];
  const events: EngineEvent[] = [];
  engine.subscribeDiagnostics((e) => diag.push(e));
  engine.subscribeEvents((e) => events.push(e));
  engine.start({ wayIds: ['Morning', 'MorningB'] });
  for (let i = 0; i < f.fixes.t.length; i++) engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  const final = engine.getState();
  for (const id of candidateTracks(diag)) {
    assert(id === 'Morning' || id === 'MorningB', `candidate ${id} built outside the routeIds filter`);
  }
  assert(final.track === 'Morning' && final.lockKind === 'verified',
    `track ${final.track}, lockKind ${final.lockKind} — the ridden route inside the filter must still verified-lock`);
  assert(final.gateFires === nGates, `${final.gateFires} Morning gate fires under a routeIds filter that includes it, want ${nGates}`);
  const gateEvents = events.filter((e) => e.type === 'gate');
  assert(gateEvents.length === nGates && gateEvents.every((e) => e.track === 'Morning'),
    `${gateEvents.length} gate events (${[...new Set(gateEvents.map((e) => e.track))].join(', ')}), want ${nGates} all on Morning`);
});

test('live: WP-B coordinator addendum — routeIds omitted/undefined is unfiltered, identical to the full catalog', () => {
  const f = loadFixture('clean_morning');
  const allIds = catalogTrackSpecs().map((s) => s.id).sort();
  const withUndefined = new LiveEngine(catalogTrackSpecs());
  const omitted = new LiveEngine(catalogTrackSpecs());
  const diagU: DiagnosticEvent[] = [];
  const diagO: DiagnosticEvent[] = [];
  withUndefined.subscribeDiagnostics((e) => diagU.push(e));
  omitted.subscribeDiagnostics((e) => diagO.push(e));
  withUndefined.start({ wayIds: undefined });
  omitted.start();
  for (let i = 0; i < f.fixes.t.length; i++) {
    withUndefined.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
    omitted.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
  }
  const candsU = candidateTracks(diagU);
  const candsO = candidateTracks(diagO);
  assert(candsU.join(',') === allIds.join(','),
    `routeIds:undefined built ${candsU.length} candidates, want every catalog route (${allIds.length})`);
  assert(candsO.join(',') === allIds.join(','),
    `omitted routeIds built ${candsO.length} candidates, want every catalog route (${allIds.length})`);
  const u = withUndefined.getState();
  const o = omitted.getState();
  assert(
    u.track === o.track && u.lockKind === o.lockKind && u.gateFires === o.gateFires && u.anyAnchored === o.anyAnchored,
    'passing routeIds:undefined and omitting it entirely must behave identically (both = unfiltered, every catalog route a candidate)',
  );
});
```

### R5 — Justification (one paragraph)

The three tests pin a behaviour that brief 04 deliberately kept (`wayIds` on
`EngineStartOptions`, decision: "Line 234 `wayIds` **stays**"), so deleting them would drop
the only coverage of candidate-set filtering. Their old probe (`freeCrossings`, one entry
per candidate fire) is gone, but the engine already exposes a strictly better one for this
purpose: the per-candidate `wayMatchAttempt` diagnostic, which fires for every candidate on
its first fix regardless of whether it ever locks or fires a gate — it observes the
candidate list directly rather than inferring it from fires. Test 1 becomes stronger than
before (it now asserts the candidate set is *exactly* the filter, plus that the excluded
ridden route neither anchors nor locks); test 2 keeps the "still fires normally" numeric
check in route-mode terms (verified lock on Morning, every Morning gate fired and emitted);
test 3 keeps the undefined-vs-omitted identity on both the candidate set and the resulting
state. Measured on the current tree: 3/3 pass, `tsc` clean, no engine or import changes.
