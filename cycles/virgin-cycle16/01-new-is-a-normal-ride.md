# 01 — "new" on RECORD is a normal first ride, not a free ride (black-circle fix)

**Source: Nathan, 2026-09-28.** His words: "i have finally found why there is an issue with
black circles drawn on the openmap, and it is caused by choosing the 'new' option for either
from/ or going to on the RECORD tab; previously choosing this option was considered a 'free
ride'; and the idea was once to have free gates then, but i want to retire this idea
entirely" — "since we have virgin app, the new option is needed for normal rides as well when
riding first time so that is not a free ride option anymore!" — "i had the issue today on a
HomeNew ride, which during the ride was crossing HomeChurch previously saved ride and gates
shown as black circles which i do not want at all. So this issue needs to be resolved
entirely".

**This brief reverses virgin-cycle1 WP-B (Nathan's 2026-08-20 notes) and the 2026-08-24
coordinator addendum (`freeRideWayIds` directional filter), and supersedes virgin-cycle15
brief 06 (`liveMapGateWayIds`, the NEW>>NEW map patch).** None of that was a bug at the time;
it is the "free gates on the map" idea that Nathan has now retired. Written down so nobody
later reads the removals as regressions.

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-28 by the Plan
tier (Fable) from two Haiku digests plus anchor checks against the working tree (branch
`virgin`, HEAD `2c21265`). Executor: Sonnet, cold, this file only. Brief 01 of
`virgin-cycle16`. **Order: this brief lands FIRST.** Briefs 02, 03 and 04 in this folder
depend on it (02 rewrites `app/src/store/freeRides.ts` and removes `rememberFreeRide`; 04
removes the engine/map machinery this brief stops calling). Do not run 02–04 before this
one is in the tree and green. **This brief touches exactly one file:
`app/src/ui/RecordScreen.tsx`.**

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-28. If a quoted
  line is not where the brief says, or a name/signature differs, **stop and report the
  mismatch verbatim** (file, line, what you expected, what you found). Never guess, never
  patch around it, never rule on it yourself.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `_to_delete/` is the bin (`mv`, never `rm`), and
  **never call `device_request_delete_permission`**, for any reason.
- No new dependency. No change to `app/src/live/engine.ts`, `app/src/store/catalog.ts`,
  `app/src/store/freeRides.ts`, `app/src/ui/wayMapGeo.ts`, `app/src/ui/wayMapView.tsx`,
  `app/src/location/index.ts`, `app/src/storage/*` — they keep their (now unreachable)
  free-mode code until briefs 02/04. `rememberFreeRide` in particular stays in the store
  (its `st.mode !== 'free'` guard makes it dead after this brief; `live_colour_suite.ts`
  still imports it, and that suite is brief 02's to rewrite).
- Do not edit `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`, any other `NN-*.md` brief
  here, or anything under `cycles/virgin-cycle15/` (history — brief 06 stays as written).
- **Do not touch the tests that exercise the machinery you are no longer calling**
  (`live_suite`, `live_colour_suite`, `waymapgeo_suite`, `selfrace_suite`,
  `catalogstore_suite`, `virginmanifest_suite`, `wayasset_runtime_suite`, `recordflow_suite`,
  `gpxplus_suite`, `migrations_suite`, `live_colour_suite`). The engine, store and map
  code they test is untouched by this brief, so they stay green as they are. **No test is
  edited by this brief.**

## Goal

Picking **new** for FROM or TO on RECORD starts an **ordinary ride** — the same start as
picking two known landmarks that have no route between them yet: route mode, no way pick,
sport-scoped candidates, the normal live map (trail, and a locked way's own line/ticks if
the engine locks onto one), and the normal post-ride flow (`rememberRide`, reveal,
`draftRouteFromRide` → naming offer on the ride-detail overlay). The live map **never**
draws gate circles for ways the rider is not locked onto. Free mode is no longer reachable
from the UI; `freeRideWayIds`, `rideFreeWayIds`, `gatesOnly`, `crossedGates`, `gateWayIds`
and the "gates crossed" counter are gone from `RecordScreen.tsx`, and it no longer calls
`rememberFreeRide` (nothing produces the record it needs any more).

## Current state (verified 2026-09-28 against the tree)

**Why the black circles happen (both digests agree, tree confirms):**
`RecordScreen.tsx:1064` `const freeRide = fromId === NEW_ID || to === NEW_ID;` puts the
engine into `mode: 'free'` (line 546). In free mode every candidate runs with `armWithinM=0`
and every candidate's gate fires land in `live.freeCrossings` (`engine.ts:597`). The map is
told `gatesOnly={live.mode === 'free'}` and `crossedGates={live.freeCrossings}` (lines
1324-1325); `wayMapGeo.ts:105-127` `allGatesFeatureCollection` gives every crossed gate a
`colour` (`colors.neutral`), and `wayMapView.tsx:855-859` draws any gate with a `colour`
as a filled ring — that is the black circle. Nathan's Home>>NEW ride today ran the
directional filter (`freeRideWayIds(CATALOG, 'Home', null)` → every way outbound from Home,
HomeChurch included), so cycle15 brief 06's NEW>>NEW-only patch (`liveMapGateWayIds`)
could not help: the bug is free mode itself, not the null filter.

**Why "the else branch" is the right target:** a ride between two known landmarks with no
route yet (the virgin app's other first-ride shape) already starts as
`wayPick: null, wayIds: [all ways of the sport]` (lines 549-561), route mode. That is
exactly the behaviour Nathan describes for "new".

### `app/src/ui/RecordScreen.tsx`

- Line 18: `import { Alert, BackHandler, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';`
  (`ScrollView` is still used at line 1208 after this brief — keep it.)
- Line 41: `import { liveMapGateWayIds, metresBetween } from './wayMapGeo';`
- Line 56: `import { rememberFreeRide } from '../store/freeRides';`
- Line 78: `import { freeRideWayIds, gateSetFor, landmarkAt } from '../store/catalog';`
- Line 113: `const NEW_ID = '~new';` — stays (the pill's id, the `'new'` label at 1108).
- Line 298: `const [rideFreeWayIds, setRideFreeWayIds] = useState<string[] | null>(null);`
- **START branch, lines 537-562:**

  ```tsx
        let s: ActiveSession;
        if (freeRideRef.current) {
          // WP-B: free ride — no route pick, gates-only map, the directional
          // filter (coordinator addendum) frozen for the whole ride. Already
          // sport-scoped (freeWayIds is computed from CATALOG = activeCatalog()).
          setRideWayHint(null);
          setRideFreeWayIds(freeWayIdsRef.current);
          s = await startTracking({
            wayPick: null, mode: 'free', wayIds: freeWayIdsRef.current,
            startContext: startContextRef.current ?? undefined,
            sportId,
          });
        } else {
          setRideWayHint(pickedWayRef.current?.refLineId ?? null);
          setRideFreeWayIds(null);
          // WP-1 (C3): belt-and-braces engine scoping — the hard pick already
          // restricts scoring to one way, but this keeps the recovery path's
          // session.wayIds honest for a sport-scoped re-arm too.
          s = await startTracking({
            wayPick: pickedWayRef.current?.id ?? null,
            wayIds: [...(wayIdsOfSport(currentCatalog(), sportId, currentSports()) ?? [])],
            startContext: startContextRef.current ?? undefined,
            sportId,
          });
        }
  ```

- **STOP, lines 597-599:**

  ```tsx
        // M1 fix: pass the ride's real startedAtMs (same value rememberRide got
        // above) so a free-ride record's start time isn't Date.now() at STOP.
        rememberFreeRide(finalState, s ? { startedAtMs: s.startedAtMs } : undefined); // WP-B: no-op unless this actually was a free ride with >=1 crossing
  ```

- **Two ride-scoped resets** — lines 646-649 (in `onEnd`):

  ```tsx
        setWayPick(null);
        pickedWayRef.current = null;
        setRideWayHint(null);
        setRideFreeWayIds(null);
        freeWayIdsRef.current = [];
  ```

  and lines 832-836 (the discard path), same five lines at deeper indentation, preceded by
  the comment `// virgin-cycle15 06 (D3): same ride-scoped reset as onEnd, and`.
- **The free-ride derivation, lines 1060-1071:**

  ```tsx
    // WP-B: 'new' at either end means free ride. Since WP-L, an explicit tap
    // of 'new' for FROM sticks the same as any other explicit pick (via
    // fromExplicit/pickFrom below) — auto start-mode only lets a real
    // DETECTED landmark override FROM when nothing was explicitly tapped.
    const freeRide = fromId === NEW_ID || to === NEW_ID;
    // Coordinator addendum (2026-08-24): with exactly one end known, restrict
    // to the ways that actually run that direction; both ends unknown (or, in
    // principle, both known — not reachable when freeRide is true) => null =
    // unfiltered, the brief's original full-catalog behaviour.
    const freeWayIds: string[] | null = freeRide
      ? freeRideWayIds(CATALOG, fromId === NEW_ID ? null : fromId, to === NEW_ID ? null : to)
      : null;
  ```

- Line 1089: `const pickSource: StartContext['pickSource'] = freeRide || !pickedWay`
  (`pickedWay` is `null` whenever `route` is undefined — lines 1075-1084 — and `route` is
  never found when either end is `'~new'`, so `!pickedWay` alone is already true for every
  ride `freeRide` was true for).
- Lines 1098-1101:

  ```tsx
    const freeRideRef = useRef(false);
    freeRideRef.current = freeRide;
    const freeWayIdsRef = useRef<string[] | null>(null);
    freeWayIdsRef.current = freeWayIds;
  ```

- Line 1111 (comment): `  // pickedRouteRef/freeRideRef/freeRouteIdsRef mirror above.`
- **Live map props, lines 1324-1336:**

  ```tsx
                gatesOnly={live.mode === 'free'}
                crossedGates={live.freeCrossings}
                // virgin-cycle15 06: rideFreeWayIds is `null` ("unfiltered" —
                ... (eight more comment lines) ...
                // freezes null here, but never reads gateWayIds (gatesOnly false).
                gateWayIds={liveMapGateWayIds(rideFreeWayIds)}
  ```

  followed on line 1337 by `trail={mapOverlay.showTrail ? trail : undefined}` and 1338 by
  `selfs={settings.selfDots && live.mode === 'route' ? selfDots : undefined}` (both stay).
- **Free-sector box, lines 1363-1381:** begins with the comment
  `{/* WP-B: free-ride sector list — most recent first, plain ink (no`, then
  `{live.mode === 'free' && (` on 1366, a `<View style={styles.freeSectorBox}>` holding a
  `<ScrollView style={{ maxHeight: 120 }}>` of `live.freeSectors` rows and
  `<Text style={styles.counter}>{live.freeCrossings.length} gates crossed</Text>` (1379),
  closing `</View>` (1380) and `)}` (1381). Line 1382 is
  `{status.storageErrors > 0 && (`.
- Pills, lines 1548-1570: the two `new` pills (`pickFrom(NEW_ID)` / `setTo(NEW_ID)`) stay
  untouched. Lines 1567-1570:

  ```tsx
                {/* WP-B: freeRide never has a `way` (NEW_ID matches no catalog
                    landmark), so this is already hidden by construction; !freeRide
                    ... */}
                {!freeRide && route && routeWays.length > 1 ? (
  ```

  (read 1567-1569 in full before editing — the comment is three lines.)
- Styles: `counter:` at 1755, `freeSectorRow:` at 1766; `freeSectorBox` is nearby (grep).

### `app/src/store/freeRides.ts` — read-only for this brief

Line 121 `export function rememberFreeRide(st: LiveEngineState, meta?: { startedAtMs: number }): void {`
is guarded by `if (st.mode !== 'free' || st.freeCrossings.length === 0) return;` — dead
once RECORD never starts free mode. It stays (with its `live_colour_suite.ts` tests) until
brief 02 rewrites the store.

## Decisions (pre-resolved — do not re-open)

1. **"new" takes the existing no-route start path verbatim** (`wayPick: null`, sport-scoped
   `wayIds`, no `mode`). No new engine option, no "record-only" special case. If the rider
   happens to ride a known way end to end, the engine may lock onto it and the ride becomes
   that way's ride — the same thing that happens today when you pick a known pair without a
   route and ride a different known way. That is a feature of route mode, not a leak: a
   locked way is a way the rider actually rode, and the map only ever draws the locked
   way's own line and ticks (`gatesOnly` false → `gateTicksFC`, `wayMapView.tsx:628`).
2. **The map never gets `gatesOnly`/`crossedGates`/`gateWayIds` from RECORD again.** The
   props stay on `WayMapView` until brief 04 removes them; unpassed, they default to
   `false`/`undefined` and the whole gates-only branch is dead.
3. **The `rememberFreeRide` CALL goes; the function stays until brief 02.** Its guard
   (`st.mode !== 'free'`) makes it a no-op after this brief anyway; removing the function
   would drag `live_colour_suite.ts` (which imports it) into this brief, and that suite is
   rewritten wholesale by 02 together with the new record shape and writer (`markRideFree`).
4. **`freeRide`, `freeWayIds`, `rideFreeWayIds`, `freeRideRef`, `freeWayIdsRef` and the
   `liveMapGateWayIds` call are removed from `RecordScreen.tsx`; the two consumers of
   `freeRide` (`pickSource`, the way-pill row) drop the term.** Both are logically
   unchanged (see Current state, line 1089).
5. **The `mode` field on the raw ride index and on the GPX+ pick event stays** (`'route' |
   'free'`, `storage/core.ts:28`, `location/index.ts:314`). Rides recorded before this
   brief carry `mode: 'free'` on disk; `RidesScreen.tsx:95` and `lastRide.ts:269` keep
   filtering them out of backfill. New rides are always `'route'` by omission. Brief 04
   decides what to do with the type.
6. **Free rides recorded before this brief** (records in `free-rides-cache.json`) keep
   showing as "Free ride" in RIDES and in the ride detail exactly as today — nothing here
   touches the readers. Brief 02 changes what they show.
7. **NEW>>NEW keeps working** as the virgin app's very first ride: `from`/`to` default to
   `NEW_ID` (lines 258-259) → route mode, `wayIds` = every way of the sport (an empty list
   in a virgin catalog → zero candidates, which the engine already handles: `wayIds: []`
   filters `allSpecs` to `[]` at `engine.ts:434`).

## Files to touch

### 1. `app/src/ui/RecordScreen.tsx`

**Edit A — imports.**

- Line 41: `import { liveMapGateWayIds, metresBetween } from './wayMapGeo';`
  → `import { metresBetween } from './wayMapGeo';`
- Line 56: delete `import { rememberFreeRide } from '../store/freeRides';` entirely.
- Line 78: `import { freeRideWayIds, gateSetFor, landmarkAt } from '../store/catalog';`
  → `import { gateSetFor, landmarkAt } from '../store/catalog';`

**Edit B — line 298.** Delete
`const [rideFreeWayIds, setRideFreeWayIds] = useState<string[] | null>(null);`. If a
comment line directly above it describes `rideFreeWayIds`, delete that comment too (read
294-298 first).

**Edit C — START branch, lines 537-562.** Replace the whole `let s` / `if (freeRideRef.current)
{ … } else { … }` block quoted in Current state with:

```tsx
      // virgin-cycle16 01 (Nathan 2026-09-28): 'new' at either end is an
      // ordinary first ride, not a free ride — it starts exactly like a known
      // pair with no route yet (wayPick null, sport-scoped candidates). What
      // it becomes is decided AFTER the ride, on the ride-detail overlay.
      setRideWayHint(pickedWayRef.current?.refLineId ?? null);
      // WP-1 (C3): belt-and-braces engine scoping — the hard pick already
      // restricts scoring to one way, but this keeps the recovery path's
      // session.wayIds honest for a sport-scoped re-arm too.
      const s: ActiveSession = await startTracking({
        wayPick: pickedWayRef.current?.id ?? null,
        wayIds: [...(wayIdsOfSport(currentCatalog(), sportId, currentSports()) ?? [])],
        startContext: startContextRef.current ?? undefined,
        sportId,
      });
```

Lines 563-564 (`setRecovered(false); setSession(s);`) stay.

**Edit D — STOP, lines 597-599.** Delete the two `// M1 fix` comment lines and the
`rememberFreeRide(...)` line. Line 596 (`const nextReveal = …`) and line 600
(`const sum = await stopTracking();`) become adjacent.

**Edit E — the two resets.** At 648-649 and again at 835-836 delete the pair

```tsx
      setRideFreeWayIds(null);
      freeWayIdsRef.current = [];
```

(`setWayPick(null); pickedWayRef.current = null; setRideWayHint(null);` stay at both sites.)

**Edit F — lines 1060-1071.** Delete the whole block quoted in Current state (both comments,
`const freeRide`, `const freeWayIds`). Then:

- Line 1089: `const pickSource: StartContext['pickSource'] = freeRide || !pickedWay`
  → `const pickSource: StartContext['pickSource'] = !pickedWay`. Update the comment
  directly above it (1085-1088) so `// A free ride (no \`way\`) or a way with no pickable
  route both say 'none'` reads `// A 'new' endpoint (no \`route\`, hence no \`way\`) or a way
  with no pickable route both say 'none'`.
- Lines 1098-1101: delete the four `freeRideRef` / `freeWayIdsRef` lines. Keep 1096-1097
  (`pickedWayRef`).
- Line 1111: `// pickedRouteRef/freeRideRef/freeRouteIdsRef mirror above.`
  → `// pickedWayRef mirrors above.`

**Edit G — live map props, lines 1324-1336.** Delete `gatesOnly={…}`, `crossedGates={…}`,
the ten-line `// virgin-cycle15 06:` … `// freezes null here …` comment, and
`gateWayIds={…}`. `trail=`, `selfs=`, `variant=`, `liveState=`, `fill` stay.

**Edit H — free-sector box, lines 1363-1381.** Delete from the `{/* WP-B: free-ride sector
list` comment through the closing `)}` on 1381. Line 1362 (`<Text style={styles.trackLine}>
{statusLine}</Text>`) and line 1382 (`{status.storageErrors > 0 && (`) become adjacent.
Then remove the `freeSectorBox` and `freeSectorRow` entries from the `StyleSheet.create`
block (grep both; if either has another reference, leave it and report). Leave `counter`
if anything else references it; remove it only if the grep shows it was the box's alone.

**Edit I — the way-pill row, lines 1567-1570.** `{!freeRide && route && routeWays.length > 1 ? (`
→ `{route && routeWays.length > 1 ? (`. Rewrite the three-line `{/* WP-B: freeRide never
has a `way` … */}` comment to one line:
`{/* A 'new' endpoint never resolves a route, so this is hidden by construction. */}`.

**Edit J — comments at 709 and 815** mention `rememberRide/rememberFreeRide`; change both
to `rememberRide` only (wording, no logic). If either is not found verbatim, skip it.

After all edits: `grep -n "freeRide\|freeWayIds\|FreeWayIds\|freeCrossings\|freeSectors\|
gatesOnly\|crossedGates\|gateWayIds\|liveMapGateWayIds\|mode: 'free'" app/src/ui/RecordScreen.tsx`
→ **no hits**. `grep -n "live.mode" app/src/ui/RecordScreen.tsx` → only the `selfs=` line
(1338) and `liveMapOverlayFor` (893) remain; both untouched.

That is the whole brief: one file. No test is edited (`live_colour_suite.ts`'s
`rememberFreeRide` tests still exercise the untouched store function directly).

## Verification

From `app/`: `node --experimental-strip-types tests/run.ts` → zero FAIL;
`./node_modules/.bin/tsc --noEmit` → exit 0 (watch for an unused-import error on
`useState`, `useRef`, `ScrollView` — all three are still used elsewhere in the file, so
none should fire; if one does, report it rather than removing the import). Then:

- the two greps at the end of Files to touch §1 (no hits / two `live.mode` sites).
- `grep -rn "rememberFreeRide" app/src` → `freeRides.ts` (definition) and the comment in
  `migrations.ts:8` only; **no hit in `RecordScreen.tsx`**.
- `grep -n "mode: 'free'" app/src/ui/*.tsx` → no hits.
- `git diff --stat` (with `GIT_OPTIONAL_LOCKS=0`) → exactly one file changed.
- `grep -n "NEW_ID" app/src/ui/RecordScreen.tsx` → the constant, the two defaults (258-259),
  the two resets (276, 278), the label helper (1108), the two pills (1548-1564) — all
  still there.

## On-device checklist (Nathan, after publish)

1. RECORD → FROM = **Home**, TO = **new** → START. The live map shows the trail and
   nothing else while no way is locked: **no gate circles, black or otherwise, anywhere**,
   including when you ride across HomeChurch's corridor. There is no "N gates crossed"
   counter under the status line.
2. Same ride, keep going: if you ride a known way end to end the engine may lock onto it
   (its line and ticks appear, as on any known ride). If you don't, it stays trail-only.
3. STOP → mark → the ride-detail overlay opens. For a ride that matched nothing: the card
   reads "Home → new" (the START pick), "sector times not on file for this ride", the trail
   map, and the **"Make this the reference of a new route"** button (naming card on tap) —
   exactly today's flow for a known pair without a route.
4. RECORD → FROM = **new**, TO = **new** (a fresh landmark at both ends) → same as 1-3.
5. RECORD → a known route (Home → Church) → START. Unchanged: line, ticks, lock, lap.
6. RIDES: the ride from step 1 is listed by its pick label ("Home → new · no lap") until
   brief 02/03 land. Old free rides (before this publish) still read "Free ride · N gates".
7. Settings → Reset to virgin → RECORD: FROM/TO both default to **new** → START works,
   trail-only map, no counter.

## Out of scope

- Removing free mode from the engine, `freeRideWayIds` from `catalog.ts`,
  `allGatesFeatureCollection`/`allGatesBounds`/`liveMapGateWayIds` from `wayMapGeo.ts`,
  `gatesOnly`/`crossedGates`/`gateWayIds` from `wayMapView.tsx`, and their tests — brief 04.
- "Save as free ride" after the ride, the new free-ride record shape — brief 02.
- A free-rides section on RIDES and RESULTS — brief 03.
- The `mode` field on index entries / pick events (decision 5).
- `STATE.md`, `OPEN-ITEMS.md`, this folder's `README.md` — the coordinator's.

## What this changes on Nathan's phone

Nothing yet — this is a parked brief. Once executed: JS-only, ships to the Preview APK over
EAS Update via `scripts/publish-preview.cmd` — no new numbered build. Visible: picking
**new** on RECORD starts a normal ride (trail-only map, no gate circles, no crossing counter)
and ends on the normal ride-detail overlay with the normal naming offer. Free rides are
no longer created at all until brief 02 adds the post-ride "Save as free ride" choice; old
free rides on the phone are untouched.

## Open questions / assumptions (logged, not blocking)

1. **A "new" ride that locks onto a known way** becomes that way's ride (decision 1). If
   Nathan would rather a ride he explicitly started as "new" never lock (record-only,
   `wayIds: []`), that is a one-line change to Edit C — but it would also stop the
   virgin app's first known-pair-without-route ride from locking, which is today's
   accepted behaviour, so this brief keeps them identical.
2. **`selfs={settings.selfDots && live.mode === 'route' …}`** (line 1338) is now always
   true on the mode side; left for brief 04 to simplify with the rest of `live.mode`.
3. **Old `mode: 'free'` rides on disk** stay excluded from backfill (decision 5). They were
   recorded with `armWithinM=0` and no lock; deriving route results from them would be
   wrong, so the exclusion is still correct, just historical.
