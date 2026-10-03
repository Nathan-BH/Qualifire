# 03 — The live map draws only the START pick; the blue rider dot is ALWAYS the topmost layer

**Source: Nathan, 2026-10-03:** "the screen showed WorkZoo way locked AND mapped this WorkZoo overlay on
my live map ... my blue live dot was now shown below the WorkZoo yellow line so I could not even see it".
Two independent defects (README §1): (a) the overlay follows the lock (`live.track ?? wayHint`);
(b) the route source mounts after the rider source, so the line paints over the dot. (b) is NOT fixed
by removing the lock — any late-appearing source (route, sector spans, gate ticks) hits it, so it gets
its own fix. Depends on brief 01 (engine `track` = the pick or null). Execute = Sonnet; STOP-ON-AMBIGUITY.

## Scope
IN: `app/src/ui/recordFlow.ts` (`liveMapOverlayFor`), `app/src/ui/RecordScreen.tsx` (~1055-1057 and the
call at ~1386), `app/src/ui/wayMapView.tsx` (MapLibre rung only), tests `recordflow_suite.ts`,
`waymap_suite.ts` (source-order contract).
OUT: the PNG rung (~960-1165: the dot is a React `View` drawn over the image, it cannot be covered),
trail/selfs logic, colours, camera, the setup-phase map (`wayId={pickedWay?.refLineId}` at ~1237/1505).

## Part A — overlay = the pick only
1. `recordFlow.ts` ~73-88: change the signature to `liveMapOverlayFor(input: { wayHint: string | null })`
   returning `{ wayId: input.wayHint, showTrail: input.wayHint === null }`. Rewrite the doc comment:
   the running map overlays the way picked at START (frozen in `rideWayHint`) — nothing the engine
   detects can change it; no pick -> no line, trail shown for the whole ride.
2. `RecordScreen.tsx` ~1055-1057: `const mapOverlay = liveMapOverlayFor({ wayHint: rideWayHint });` and
   fix the comment above ("live.track (lock) outranks ..." -> "the START pick, frozen").
   `rideWayHint` is set at START (`setRideWayHint(pickedWayRef.current?.refLineId ?? null)` ~679) and
   cleared at ride end (~787, ~1017) — verify both with a targeted grep; STOP if the hint can be set
   mid-ride from anywhere else.
3. Confirm the id space: the setup/armed maps pass `pickedWay?.refLineId` as `wayId` (~1237, ~1505), so
   `refLineId` is what `WayMapView` resolves; the old `live.track` is a TrackId. They coincide for
   catalog ways; for a user-created way `refLineId` is the right one. If `WayMapView` cannot resolve a
   `refLineId` that the setup map can, STOP and report.
4. Tests (`recordflow_suite.ts`, lines ~111-140 are the current `liveMapOverlayFor` tests): rewrite to
   the one-argument form — keep "nothing picked -> no line, trail shown", "picked -> line, trail hidden
   from the first frame"; REPLACE "a lock outranks the pick hint" with `virgin-cycle21 03: the overlay
   is the pick whatever the engine does — there is no engine input` (assert the function takes only
   `wayHint`: `liveMapOverlayFor.length === 1` and that `liveMapOverlayFor({wayHint:'HomeWork'}).wayId
   === 'HomeWork'`), and keep the mutual-exclusion sweep over `wayHint` values only. Add a source
   check on `RecordScreen.tsx` (pattern: the file is read with `readFileSync(path.join(TESTS_DIR,'..',
   'src','ui','RecordScreen.tsx'),'utf8')` elsewhere in the suite): it must contain
   `liveMapOverlayFor({ wayHint: rideWayHint })` and must NOT contain `live.track` inside a
   `liveMapOverlayFor(` call.

## Part B — the rider dot is the last-mounted source, always
`wayMapView.tsx` paints MapLibre layers in MOUNT order (the file's own comments at ~518-523, ~542-553,
~854-861 already state this rule for `trail` and `selfs`: "always mounted ... or it would mount AFTER the
rider source and paint over the dot"). Today these sources are conditional and sit before the rider:
`route` (~704 `{wayFC ? (`), `sector-spans` (~769), `place` (~779), `gate-ticks` (~797),
`gate-selected` (~843 `{props.gateSelect ? (`); `rider` is `{showRider && here ? (` (~880).
1. Make every one of them **always mounted** in the same JSX position, with an empty
   `FeatureCollection` (`{ type: 'FeatureCollection', features: [] }`, module-level `const EMPTY_FC`)
   when its data is null/false: `data={wayFC ?? EMPTY_FC}`, `data={sectorSpansFC ?? EMPTY_FC}`,
   `data={placeFC ?? EMPTY_FC}`, `data={gateTicksFC ?? EMPTY_FC}` (keep its press handler / children as
   they are; `gate-ticks` is the only one with an `onPress` — an empty FC fires nothing),
   `gate-selected`: `data={props.gateSelect ? gateSelectedFC : EMPTY_FC}`. Keep `key === id` (the
   cycle-025 rule quoted at ~692) and every layer's `id`/paint exactly as is. Do not reorder sources.
   The `rider` source stays LAST in the `<M.Map>` children and keeps its own `showRider && here`
   condition (it is the only source allowed to be conditional, and it is last).
2. Check TypeScript: `data` prop types accept the empty collection (use the same type as `trailFC`).
3. Test (`waymap_suite.ts`, same `readFileSync` style as lines ~246-345): `virgin-cycle21 03: the rider
   source is the last <M.GeoJSONSource> in wayMapView.tsx and no other source is conditionally mounted`.
   Implementation: extract every `<M.GeoJSONSource` occurrence with its `key="..."` in file order; assert
   the last key is `rider`; for each non-rider source assert the 120 characters before its opening tag do
   not match `/\?\s*\(\s*$/` or `/&&\s*\(\s*$/` (i.e. not wrapped in a conditional expression); assert
   `EMPTY_FC` is referenced at least 5 times. Failed-before: the test must FAIL on the current file
   (copy the file aside, run, restore — no git stash).
4. Behavioural note in the brief report (not a test): a new MapLibre source with zero features adds no
   visible pixels; layer styling is unchanged, so the picture only differs by the dot now being on top.

## Verification
`cd app && node --experimental-strip-types tests/run.ts` zero FAIL (report before/after counts, deleted
and added test names); `./node_modules/.bin/tsc --noEmit` exit 0. Targeted grep:
`grep -n "live.track" app/src/ui/RecordScreen.tsx` -> remaining uses are colours / tier / notification
(`liveTierFor`, `sectorValues`), none in the overlay.

## What changes on the phone / what does not
Changes: the live map never draws a way you did not pick; a "new" ride shows only your own trail; the
blue dot is always above every line (route, sector colours, gate ticks). Does NOT change: map tiles,
zoom/follow, trail style, sector colours on the line, self dots, the setup/armed maps, the PNG fallback.
You can only check the dot-on-top fix on the phone after publish (COMMANDS.md): it was a layer-order
bug that depends on when the line appears, so test with a picked way AND a Work -> New ride.
