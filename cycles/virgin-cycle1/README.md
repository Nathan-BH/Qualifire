# virgin-cycle1 — README (start here, especially in a fresh chat)

**Goal of this cycle:** work through the 17-item implementation plan in
`data/activities/TEST in virgin-app rides/qualifire-20260901/qualifire-20260901-review.md`
(Nathan's review of his first two rides on the reset "virgin" build, 2026-09-01) plus the
still-live items from `Nathan/Nathan's_notes5/Nathan's_notes5.md`. That review document is
the primary source of truth for *what* each work package is and *why* — this cycle folder
tracks *status* and carries *execution-ready briefs* so any chat (this one resumed, or a
brand new one) can pick up any unblocked item without re-reading everything from scratch.

**Why this folder exists:** Nathan rode the virgin build again on 2026-09-02 (day 2) before
any fix from day 1's review had reached his phone — a process gap, not a code gap. This
folder is the fix for *that*: real progress lands here as briefs and status, one work
package at a time, so there's always something concrete either landed on the phone to test,
or ready to hand to an Execute pass, without losing a day to re-planning.

## Status at a glance (2026-09-02, evening pause point)

| WP | What | Status | Brief |
|---|---|---|---|
| A | Ride-2 engine bug (reverse-ride false "matched"), RECORD-tab pick made a hard lock, "writing history" status line | **DONE — landed on your phone's repo just now.** 305 tests, 302 pass, 0 fail, 3 skip. | `WP-A-ride2-hardpick-writinghistory.md` (record of what shipped) |
| B | GPX+ pick + lock-change logging | Brief written, ready to execute | `WP-B-gpxplus-pick-lock-logging.md` |
| C | Drawable user-created routes (the biggest lever — unblocks D, H, I, K) | **DONE — landed on the device 2026-09-02, independently inspected.** 345 tests, 342 pass, 0 fail, 3 skip (12 new). The proof that matters: a drawn gate, pushed back through the engine's own scoring math, rescores to within 7e-7 m of where it was requested — gates draw exactly where they score, verified on a real ride-derived ref, not just synthetic fixtures. (Matching the bundled manifest's exact scale/offset only holds for Morning — EveningA/B's Python-rendered manifest was fit to a different source and differs 1.9–2.9%; harmless, since the runtime transform only needs to agree with itself, but not a "matches the manifest" claim in general.) On-device visual check still outstanding (no device shell this session). | `WP-C-drawable-user-routes.md` |
| D | Rider-only map before START / on unmatched rides | **DONE — landed on the device 2026-09-02.** 312 tests, 309 pass, 0 fail, 3 skip (7 new). Pieces A + B taken; WP-N bundled in. On-device visual check still outstanding (no device shell this session). | `WP-D-rider-only-map.md` |
| F | Post-stop "save as new way" offer for any ride, not just unmatched ones | Brief written, ready to execute | `WP-F-post-stop-reference-offer.md` |
| J | Breadcrumb trail behind the rider | **DONE — landed on the device 2026-09-02.** 326 tests, 323 pass, 0 fail, 3 skip (14 new). Step 3 (route-map guard) was a no-op — WP-D already did it. Fresh inspection found + fixed one minor bug (a stale pre-START position could become trail point 0); everything else held up. On-device visual check still outstanding (no device shell this session). | `WP-J-breadcrumb-trail.md` |
| L | Start auto-detect as a suggestion, not an override (notes5 N5) | Brief written, ready to execute (small) | `WP-L-start-autodetect-suggestion.md` |
| E | Virgin manifest gate-leak (bundled gates drawn on new>>new free rides) | Not started — **blocked on Q6** | see `QUESTIONS-FOR-NATHAN.md` |
| G | Specifications / route variants on an existing Way | Not started — **blocked on Q2** | see `QUESTIONS-FOR-NATHAN.md` |
| H | Ride detail screen (RIDES tap + post-stop destination) | Not started — **blocked on C, plus Q4 + a nav-model call** | see `QUESTIONS-FOR-NATHAN.md` |
| I | Gate card on the map + finger scrub | Not started — map half blocked on C; scrub blocked on **Q1** | see `QUESTIONS-FOR-NATHAN.md` |
| K | Sector-coloured trail, phase 2 (live map) | Not started — blocked on C, plus **Q7** (just needs a yes) | see `QUESTIONS-FOR-NATHAN.md` |
| M | RECORD setup layout (tight-and-grows vs fixed) | Not started — **blocked on Q5** | see `QUESTIONS-FOR-NATHAN.md` |
| N | Round gate-tick line-cap ends | **DONE — bundled into WP-D's `routeMapView.tsx` edit, 2026-09-02.** | — |
| O | DEMO tab: selectable "first ride" (dot + trail being written, no route) / "second ride" (route + gates present, sectors colour as passed) modes | **DONE — both phases landed on the device 2026-09-02.** 333 tests, 330 pass, 0 fail, 3 skip (7 new). `demoModel.ts`'s pure fixture/tier functions plus the two-pill picker landed together (WP-D + WP-J were both already in). One test-harness-only wrinkle found and fixed: `demoModel.ts` statically imports `colourModel.ts`, which statically imports the bare-JSON seed — same Node ESM import-attribute wall `live_colour_suite.ts` already solved, so `demo_suite.ts` uses the same `registerHooks` + dynamic-import pattern; no app-code change. On-device visual check still outstanding (no device shell this session). | `WP-O-demo-tab-modes.md` |
| P | Live map + blue dot on RECORD / START / RACE for user-created routes (the "HomeWork" blank map) | **DONE via WP-D** (this brief's own fix, landed 2026-09-02). HomeWork's on-device acceptance script (§4) still outstanding — no device shell this session. | `WP-P-live-map-user-routes-homework.md` |
| Q | Delete user-created routes / ways / orphan places from ROUTES (cascading, validated) + "Reset to virgin" in SETTINGS → DATA (moves the storage root aside, keeps settings/theme) — Nathan 2026-09-02 "so I can try the real virgin app again from scratch" | **DONE — both Parts A and B landed on the device 2026-09-02.** 358 tests, 355 pass, 0 fail, 3 skip (12 new; independent inspection rerun confirmed 358, not 357 — a stale-baseline arithmetic slip in the executor's own count). Cascade rules (last-route-drops-way, orphan-landmark-only-when-unreferenced-by-any-way, all gate-set versions go, refs.user.json/results cleaned up) and the reset safety rails (move-not-delete to a timestamped sibling, refused during an active recording, two-step confirm, settings/theme kept) all landed exactly as specified. One real discrepancy found and resolved: the brief's `root.move(aside)` assumed a synchronous call, but the installed expo-file-system (56.0.9) has `move` as async (`Promise<void>`) — used `moveSync` instead (its synchronous twin, confirmed present), keeping `archiveStorageRoot`'s synchronous signature. **Does not and cannot remove the "black circles"** — that is WP-E/Q6, see WP-Q §2.6 and the Q6 addendum. On-device visual/confirm-dialog check still outstanding (no device shell this session). | `WP-Q-delete-and-reset.md` |
| 16 | Gate visibility at zoom, on-device re-check | Not code — on-device visual check, do after C + E land | — |
| 17 | Audio/TTS motivational library | **Explicitly parked** by Nathan 2026-09-01 — needs a new build anyway; do not pick up before the virgin path (A–N) is solid | — |

**Read next:** `CONTEXT.md` for the full framing (what "virgin build" means, the pipeline
rules this cycle follows, environment constraints hit this session). Then
`QUESTIONS-FOR-NATHAN.md` — answer inline there, the same way `cycle-025-briefs` on `main`
works, so answers stay attached to the exact question and any chat can read them back.

## How to resume this cycle (in this chat or a fresh one)

1. Read this README, then `CONTEXT.md`, then `QUESTIONS-FOR-NATHAN.md` (check for any
   answers Nathan has typed in since this was written — that unblocks E/G/H/I/K/M).
2. Pick an unblocked WP with status "brief written, ready to execute" — B, F, L, Q are all
   independent of each other and of anything still open (C, D, J, O are all landed now — see
   their rows). C landing also unblocks H's map half, I's map half, and K (see their rows for
   the remaining blockers — Q4/nav-model for H, Q1 for I's scrub half, Q7 for K); those rows
   haven't been re-edited by this pass, so check `QUESTIONS-FOR-NATHAN.md` before picking one
   up. B, F, L are small/quick wins if you want something to land same-day.
3. Dispatch a Sonnet **Execute** agent against that WP's brief file, exactly as written — the
   brief already did the Plan-tier thinking. Point it at the actual device app folder this
   time (`device_bash` was down all of 2026-09-02's session, forcing a cloud-side git mirror
   workaround — see `CONTEXT.md` §"Environment notes" for whether that's still true).
4. Run the verification commands the brief specifies (test suite + `tsc --noEmit`).
5. **Commit the changed files straight to the device** (`C:\Users\natha\Claude personal
   projects\Qualifire\app\...`) so Nathan can build/test same-day. Don't batch multiple WPs
   before committing — land one, let him test, then move to the next. That's the whole point
   of this folder existing.
6. Update this README's status table and the relevant WP file's status line. Small, honest,
   immediate — don't let it drift stale (same rule as `STATE.md`/`OPEN-ITEMS.md` project-wide).
7. If a WP's Execute pass hits a genuine ambiguity or a surprise, don't guess — write it into
   `QUESTIONS-FOR-NATHAN.md` (new question block, same format as the existing ones) rather
   than only mentioning it in chat, so it's tracked and answerable whenever Nathan has a
   moment, per his own standing instruction (also now in `process/CONVENTIONS.md`).

## Testing WP-A today (it's already on your phone's repo)

Files changed: `app/src/live/engine.ts`, `app/src/ui/RecordScreen.tsx`,
`app/tests/live_suite.ts`, `app/tests/live_colour_suite.ts`, `app/tests/resultsstore_suite.ts`.
Nothing else touched. Before building, it's worth running the two verification commands
yourself since this session's `device_bash` bridge was down the whole time and `tsc --noEmit`
was never confirmed on a real toolchain:

```
cd app
node --experimental-strip-types tests/run.ts   # expect: 305 tests: 302 pass, 0 fail, 3 skip
./node_modules/.bin/tsc --noEmit               # expect: exit 0, no output
```

If both come back clean, rebuild/reload the app and try to reproduce yesterday's ride 2
(ride the reverse direction of an existing route) — it should now come back **unmatched**
(naming/save offer appears, exactly like a first-ever ride) instead of silently "matching"
the wrong way. You should also see the RECORD-tab pick behave as a hard lock now (per your
2026-08-29 note), and — once a ride goes a little while without recognizing any known road —
the status line where "detecting route…" used to sit should start alternating in a
"writing history"-style line instead. See `WP-A-ride2-hardpick-writinghistory.md` for the
exact wording and every test that pins this behaviour.

## Testing WP-D / WP-N / WP-P today (WP-D is already on your phone's repo)

Files changed: `app/src/ui/routeMapView.tsx`, `app/src/ui/routeMapGeo.ts`,
`app/src/ui/RecordScreen.tsx`, `app/src/location/index.ts`, `app/tests/routemapgeo_suite.ts`.
Nothing else touched. `device_bash` was still down this session (see CONTEXT.md), so the test
suite and a strict standalone type-check of the new `cameraTargetFor` code ran in the cloud
container instead of on your machine — worth re-running yourself before trusting a build:

```
cd app
node --experimental-strip-types tests/run.ts   # 312 was the count right after WP-D landed;
                                                # WP-J/WP-O landed since, so today's real total
                                                # is 333 (309→330 pass, 0 fail, 3 skip) — see
                                                # "Testing WP-O today" below for the live number
./node_modules/.bin/tsc --noEmit               # not confirmed on a real toolchain this session
grep -n "4\.68\|50\.85" src/ui/routeMapView.tsx   # expect no output
grep -n "asset!" src/ui/routeMapView.tsx           # expect no output
```

If that comes back clean, rebuild/reload and check (per WP-D §4 / WP-P §4):
1. RECORD tab, cold launch, nothing picked — real tiles + your blue dot, not a blank space.
2. Pick Home→Work (or any user-created route) — map stays, still no line/ticks (expected until
   WP-C), dot centred. This is the "HomeWork" bug Nathan reported twice.
3. START → running — no "world at zoom 0" flash before the dot lands (Piece A).
4. A bundled route (Morning/EveningA/EveningB, if any exist on this build) still draws its
   line, ticks, and now has ROUND tick ends instead of flat/butt ones (WP-N).
5. Settings → live map OFF/ON still behaves as before on every phase.
6. Routes/Result screens (browse, no rider) unchanged — still blank when nothing is picked.

## Testing WP-J today (breadcrumb trail — already on your phone's repo)

Files changed: `app/src/ui/trailModel.ts` (new), `app/src/ui/routeMapView.tsx`,
`app/src/ui/RecordScreen.tsx`, `app/tests/trail_suite.ts` (new), `app/tests/run.ts`. Nothing
else touched — Step 3 of the brief (the route-map guard) turned out to be a no-op because WP-D
already landed that exact change earlier the same day (see WP-P §3.2 point 1 and WP-J's own
status line). `device_bash` was still down this session, so the test suite and a strict
standalone type-check of `trailModel.ts` ran in the cloud container instead of on your machine:

```
cd app
node --experimental-strip-types tests/run.ts   # 326 was the count right after WP-J landed; WP-O
                                                # landed since, so today's real total is 333 —
                                                # see "Testing WP-O today" below
./node_modules/.bin/tsc --noEmit               # not confirmed on a real toolchain this session
```

If that comes back clean, rebuild/reload and check (per WP-J §4):
1. Free ride, moving: a solid yellow-on-black-casing line grows behind you with no gap to the
   dot; standing still adds no blob.
2. Route ride: a detour off the drawn route still shows the ridden line while OFF ROUTE
   behaves as before.
3. HomeWork (or any user-created route with no drawable asset): basemap + dot + trail instead
   of dot-only — the natural fallback WP-P §3.2 point 1 described.
4. **Note (fixed 2026-09-02):** a stale position from the START/armed screen could become the
   trail's very first point on some starts. Fixed directly (1-line guard in `RecordScreen.tsx`,
   see WP-J's status line) — nothing to re-check here beyond the general trail behaviour above.

## Testing WP-O today (DEMO tab modes — already on your phone's repo)

Files changed: `app/src/ui/demoModel.ts` (new), `app/src/ui/DemoScreen.tsx`,
`app/tests/demo_suite.ts` (new), `app/tests/run.ts`. Nothing else touched.

```
cd app
node --experimental-strip-types tests/run.ts   # expect: 333 tests: 330 pass, 0 fail, 3 skip
./node_modules/.bin/tsc --noEmit               # not confirmed on a real toolchain this session
grep -n "gateColours" src/ui/DemoScreen.tsx        # expect no output
```

If that comes back clean, rebuild/reload, open DEMO, and check (per WP-O §4):
1. SECOND RIDE (default): reference line + neutral gate ticks visible before RUN; after RUN the
   dot moves, buzz at each gate, and the segment behind the gate just crossed paints its tier
   colour (purple/green/yellow/green on the pinned fixture); gate ticks themselves never change
   colour; strip colours match the map.
2. FIRST RIDE: basemap + dot only before RUN — no line, no ticks, no black circles; after RUN a
   solid yellow trail grows behind the dot with no gap to it; a "writing history…" status line
   with a running clock, no buzz.
3. Switching modes mid-run stops the run and resets cleanly in either direction.
4. Zoom 11–18 stays crisp; day/night remount preserves the trail (it's RecordScreen state, not
   map state); kill/relaunch mid-ride hydrates the trail from the ride file and keeps growing;
   a new ride starts with an empty trail (START, and after END/DISCARD).
5. Watch for jank after ~20 minutes of recording — the 5 m/4000-point constants are
   `[ASSUMPTION — tune on device]` if so.

## Testing WP-C today (drawable user-created routes — already on your phone's repo)

Files changed: `app/src/ui/routeAssetRuntime.ts` (new), `app/src/ui/routeMapView.tsx`,
`app/tests/routeasset_runtime_suite.ts` (new), `app/tests/run.ts`,
`app/src/store/wayCreation.ts` + `app/src/ui/gateAdjustCard.tsx` (comments only). Nothing
else touched — `routeMapGeo.ts`/`routeMapMath.ts` needed no changes, exactly as the brief
predicted (§2.3): they only assume the `RouteAsset` shape, never the manifest. WP-D's
`riderOnly` guard and WP-J's always-mounted trail source (both already landed in
`routeMapView.tsx`) are both downstream of the `asset` variable this WP now resolves
differently — neither needed touching. `device_bash` was still down this session, so the
test suite ran in the cloud container instead of on your machine, plus an extra check: the
new builder was run against real Morning refs (`tests/fixtures/refs.json`) and gate
chainages (`core/src/gates.ts`) and reproduced the Python-rendered manifest within the
brief's own claimed tolerance (gates 0.1–0.4 m, scale ~0.26%, offx exact, offy ~0.09 px):

```
cd app
node --experimental-strip-types tests/run.ts   # expect: 345 tests: 342 pass, 0 fail, 3 skip
./node_modules/.bin/tsc --noEmit               # not confirmed on a real toolchain this session
```

If that comes back clean, rebuild/reload and check (per WP-C §5):
1. Virgin profile: record a short ride, name it → SETUP shows the new route (was blank before
   WP-D/WP-C; WP-D alone only got you dot+basemap); ARMED shows it with the rider dot; a second
   ride on that route shows the live map with line + gate ticks; ROUTES tab shows its trace;
   RESULT → VIEW TRACE shows the sector-coloured spans.
2. Shipped build: the 20 seed routes still render byte-identically (manifest wins by identity,
   never rebuilt); the free-ride gate field now also contains any user route's gates.
3. The PNG rung may not be reachable on the current dev client (MapLibre native module present
   since build 4) — the brief flags this explicitly; note honestly rather than claiming it was
   seen if you can't reach it.

**This unblocks the map half of WP-H and WP-I, and all of WP-K** (their README rows still say
"blocked on C" as of this pass — not re-edited here per the coordinator's own instruction to
update those rows separately; see their rows for what else still blocks them).

## Testing WP-Q today (delete + reset to virgin — already on your phone's repo)

Files changed: `app/src/store/catalogDelete.ts` (new), `app/src/ui/RoutesScreen.tsx` (Part A
UI), `app/src/ui/settings.tsx` (Part B UI + stale header fix), `app/src/live/userRefs.ts`
(`removeUserRef`), `app/src/store/resultsStore.ts` (`storedResultsForRoute`),
`app/src/ui/lastRide.ts` + `app/src/store/freeRides.ts` (reset seams renamed to
`resetRecorded`/`resetFreeRides`, old `...ForTests` names kept as aliases so no test file
needed touching for that), `app/src/storage/expoFsAdapter.ts` (`archiveStorageRoot`, using
`moveSync` — see the README status row above for why), `app/src/store/catalogStore.ts`
(comment only), `app/tests/catalogdelete_suite.ts` (new), `app/tests/run.ts` (registers it),
`app/tests/userrefs_suite.ts`, `app/tests/resultsstore_suite.ts`, `app/tests/catalogstore_suite.ts`
(new cases each). `RecordScreen.tsx`, `routeMapView.tsx`, `routeMapGeo.ts` — untouched, exactly
as the brief specified (no overlap with WP-C's asset-runtime work, verified against the actual
files before editing). `device_bash` was still down this session, so the test suite ran in the
cloud container instead of on your machine; `tsc --noEmit` couldn't run at all there (no
`node_modules`, no network to fetch a standalone `typescript`) — every edited file got a manual
type-correctness pass instead (including confirming `Directory.moveSync`'s real signature
against the installed package's own `.ts` sources), but a real `tsc --noEmit` run on your
machine is worth doing before trusting a build:

```
cd app
node --experimental-strip-types tests/run.ts   # expect: 358 tests: 355 pass, 0 fail, 3 skip
./node_modules/.bin/tsc --noEmit               # not run this session — no node_modules in the cloud container
grep -n "deleteFile\|delete()" src/storage/expoFsAdapter.ts   # expect only the pre-existing deleteFile
grep -rn "ForTests()" src/ui/settings.tsx      # expect no output
```

If that comes back clean, rebuild/reload and check (per WP-Q §4.3):

**Part A**, on a build with at least one named ride:
1. ROUTES → expand a way → `delete route` on its only route → dialog names the route, says the
   way goes too, lists any now-orphaned places → Delete → card disappears; RIDES still lists the
   ride, now unmatched after the "matching routes…" pass.
2. Two ways sharing a place (ride A→B then B→A, name both): deleting one way keeps both places
   and the other way.
3. On the dev/preview build (shipped seed): no delete buttons anywhere on the 6/13/20 seed
   items; a user-created way on top of them shows them.

**Part B**:
4. SETTINGS → DATA → `reset…` while a ride is recording → refused with "stop it first".
5. Not recording → first dialog shows correct counts and "settings and theme stay" → Continue…
   → second dialog ("cannot be undone") → Reset → "Reset done" names the aside folder.
6. Without restarting: RIDES/ROUTES empty states, RESULT shows no last ride, RECORD opens
   new>>new; theme and the five preference toggles unchanged.
7. Kill and relaunch: launch animation, then exactly first-launch state; ride once → naming
   offer appears as on day 1.
8. **Expected, not a regression:** the black circles are still there on that first free ride —
   that's WP-E/Q6, not this WP (§2.6).
9. (Optional) confirm `qualifire.reset-<stamp>/` exists next to a fresh `qualifire/` with the
   old data intact.

Two small wording spots were my own judgment call, not given verbatim in the brief: the
"delete way" confirm body for a way with more than one route (the brief only wrote exact copy
for the route-delete flow), and the "reset…" button's text colour — the brief said "danger/dim",
but this repo's own D-013 rule is "no red anywhere" and `PaddockTheme` has no `danger` token, so
it uses `t.textDim` (matching RidesScreen's own delete button) with the destructive styling
living entirely in the Alert.alert confirm, same as everywhere else in the app.
