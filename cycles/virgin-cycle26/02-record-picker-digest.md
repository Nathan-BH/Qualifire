# RECORD picker: same landmark as START and FINISH — Digest

**Date:** 2026-10-07
**Scope:** `app/src/ui/RecordScreen.tsx`, `app/src/ui/recordFlow.ts`, `app/src/store/routeCreation.ts`, `app/src/live/engine.ts`, `app/core/src/live.ts`, `app/src/store/gateSeeding.ts`, `app/tests/`. Read-only digest. Line numbers are from the working tree on 2026-10-07. "Traced" means read from code, not executed.

## TL;DR

The RECORD picker blocks the same landmark as start and finish in exactly one place: the GOING TO pill row filters out the current START landmark (`RecordScreen.tsx:1598`, `startable.filter((l) => l.id !== fromId)`). Nothing else checks for equality: there is no disabled state, no validation in `onRecord` or `onStart`, and `pickFrom` does not touch `to`. Two consequences follow from tracing the code. (a) A loop Route can still be selected through a hidden state: if `to` is set to X and then START is set to X, the GOING TO row hides X but `to` stays X, and the route lookup at `RecordScreen.tsx:1155-1157` matches a loop Route. The pick then runs with no visible selection. (b) Loop Routes are created only at STOP (draft `loop` at `routeCreation.ts:273`, `loopDiscriminator` at `routeCreation.ts:452`), so the catalog can hold them, but the normal picker never offers them. For the live engine, the finish is a reference-line chainage gate (FINISH_FRAC 0.99, `store/gateSeeding.ts:21`), not a landmark disc. A loop reference therefore has a specific failure mode: if the first fix anchors on the reference's end vertex, the FINISH gate can fire at t=0 (`core/src/live.ts:146-155`). Whether real loop reference lines have coincident ends within GPS noise is unclear and was not checked. The free-ride path at STOP already handles start and end within one radius by producing a loop on a single new landmark (`routeCreation.ts:259-260`).

---

## 1. RECORD start/finish picker: UI, state, handlers

**State**
- `RecordScreen.tsx:278-279`: `const [from, setFrom] = useState(() => defaultEndpoints(activeCatalog()).from ?? NEW_ID);` and the same for `to`. `NEW_ID = '~new'` (`RecordScreen.tsx:133`).
- `RecordScreen.tsx:283-284`: `const [fromExplicit, setFromExplicit] = useState(false); const pickFrom = (id: string) => { setFrom(id); setFromExplicit(true); };`. `pickFrom` does NOT reset or check `to`.
- `RecordScreen.tsx:291-299` (`pickSport`): resets `from` and `to` from `afterSportSwitch(activeCatalog())`. Defaults come from `defaultWay.ts:145-147` (`defaultEndpoints`: first two `offerAtStart` landmarks, so distinct by construction).
- `RecordScreen.tsx:1135-1138`: `startable` = catalog landmarks with `offerAtStart`, sorted by usage in setup.

**Derived start**
- `RecordScreen.tsx:1143-1151`: `detected` from last fix via `landmarkAt`; `fromId = effectiveFromId({...})`.
- `recordFlow.ts:63-71` (`effectiveFromId`): in `startMode === 'auto'` with no tap (`fromExplicit` false), returns the detected landmark (or `from` if none). Otherwise returns `from`.

**Rendering (the picker itself)**
- `RecordScreen.tsx:1569-1578`: label `DETECTED START` / `STARTING FROM` / `START NOT DETECTED`.
- `RecordScreen.tsx:1580-1587`: START pills, `startable.map(...)`. **No filter against `to`.** Each `onPress={() => pickFrom(l.id)}`.
- `RecordScreen.tsx:1591-1594`: START `new` pill, `pickFrom(NEW_ID)`. Not filtered.
- `RecordScreen.tsx:1596`: label `GOING TO`.
- `RecordScreen.tsx:1597-1603`: **`{startable.filter((l) => l.id !== fromId).map((l) => (<Pressable ... onPress={() => setTo(l.id)} ...`**. This is the only equality exclusion in the picker. `to === l.id` drives the highlight (`:1600`), so a `to` equal to `fromId` is not shown as selected.
- `RecordScreen.tsx:1605-1609`: GOING TO `new` pill, `setTo(NEW_ID)`. Not filtered, so `new` to `new` is allowed.
- `RecordScreen.tsx:1612`: `WHICH WAY TODAY?` shown only when `route && routeWays.length > 1`.

**Validation and disabled state**
- `onRecord` (`RecordScreen.tsx:651-679`): checks sport count and permissions only. No from/to check.
- `onStart` (`RecordScreen.tsx:681-734`): checks permissions and sport only. No from/to check. It passes `startContext: startContextRef.current` (`:720`).
- No `disabled` prop depends on from/to. `disabled={busy}` only (`:1279`, `:1369`, `:1465-1490`, `:1659`).
- No Alert, flash or banner about same-place endpoints was found (grep for `same`, `=== to`, `=== from`, `!== to` in RecordScreen.tsx: no endpoint checks).

**Hidden-state path (traced, not run)**
1. Rider sets `to = home` (GOING TO pill), with `from = work`.
2. Rider taps START `home`. `pickFrom('home')` sets `from = home`, `fromExplicit = true`. `to` is still `home`.
3. GOING TO filter `:1598` removes `home`. No pill is highlighted.
4. `route` lookup `:1155-1157` finds `start === home && end === home`, i.e., a loop Route if one exists in the catalog.
5. The armed title `:1263` renders `Home → Home`. `onStart` passes `to: 'home'` in `startContext` (`:1250-1252`) and `wayPick` via `pickedWayRef` (`:718`).
Same path in auto mode: a detected landmark equal to `to` is hidden in GOING TO but still used in `route` (`:1151`, `:1155-1157`).

**`new` on both ends**
- `from = NEW_ID`, `to = NEW_ID` is allowed (`:1591`, `:1606`). `route` lookup can never match `'~new'` (no catalog landmark has that id), so `pickedWay` is null (`:1160-1164`). This is the free-ride path (section 4). The handling comment at `:709-712` says `new` at either end is an ordinary first ride.

---

## 2. What the start+finish pair drives downstream

**2a. Route/way lookup**
- `RecordScreen.tsx:1155-1157`: `CATALOG.routes.find((w) => w.startLandmarkId === fromId && w.endLandmarkId === to)`. Direction-specific, no equality assumption, so a loop Route matches when `fromId === to`.
- `:1158`: `routeWays = sortWaysForDisplay(CATALOG.ways.filter((r) => r.routeId === route.id))`.
- `:1159`: `ghostCount` from `ghostsFor(r.id)` per way.
- `:1160-1164`: `pickedWay` = `wayPick` if it belongs to this route, else `defaultWayFor(routeWays)`. Null when no route.
- `:1169-1173`: `pickSource` = `'picked' | 'default' | 'none'`.

**2b. Reference line and engine config (for a matched loop route)**
- `onStart` `:713`: `setRideWayHint(pickedWayRef.current?.refLineId ?? null)`. The live map overlay uses this (`recordFlow.ts:81-83`).
- `onStart` `:717-722`: `startTracking({ wayPick: pickedWayRef.current?.id ?? null, wayIds: wayIdsOfSport(...), startContext, sportId })`.
- `location/index.ts:464-474`: logs the one `pick` event with `from`, `to`, `pickSource`, `wayId`. No equality logic.
- `live/engine.ts:270-296` (`start`): candidates = the one spec whose `id === pickId`, built from `catalogTrackSpecs()` (`live/tracks.ts:23-43`, spec `{ id: way.id, ref, gates: gateSet.chainageM }`). If the pick is not in scope, `cands = []`, `phase = 'detecting'`.
- Self dots / selfWayId: `RecordScreen.tsx:1188-1190` (`live.track ?? pickedWay?.id`), gate set via `gateSetFor`.
- Ghosts: `ghostsFor(selfWayId)` `:1190`. Ghost choice in `colourModel.ts` is by way; not traced further.

**2c. Labels**
- `RecordScreen.tsx:1244-1245` (`landmarkLabel`), `:1251`, `:1263`: armed title `{landmarkLabel(fromId)} → {landmarkLabel(to)}`. For loops this renders `Home → Home`.
- `defaultWay.ts:81` (`wayLabelIn`): `${lab(w.startLandmarkId)} → ${lab(w.endLandmarkId)}`. Same for loops.
- `routeFromRide.ts:196`: `label: \`${lab(w.startLandmarkId)} → ${lab(w.endLandmarkId)}\``.

**2d. For start == end, per consumer (today)**
- Route lookup: finds a loop Route if one exists; otherwise `route` undefined, `pickedWay` null, engine has no reference, free ride.
- Reference line: the loop Route's way `refLineId` is loaded through `catalogTrackSpecs()` (`tracks.ts:23-43`). Drop-out if no ref asset (`tracks.ts` warns and skips). Not traced further.
- Live engine: runs as a single candidate with gates from the way's gate set (see section 3).
- Ghost choice: keyed by `pickedWay`/`selfWayId` (`:1159`, `:1190`). Loop ways are keyed the same way; no special case found.
- Gate set: `gateSetFor(currentCatalog(), selfWayId)` `:1189`. No loop special case.
- Naming at STOP: `routeNamingCard.tsx:128-143` handles loop as a separate state. Not reached from RECORD's picker because the picker never selects an existing loop as a new pair.

---

## 3. Live engine: how FINISH is decided

**Finish is a chainage gate on the reference line, not a landmark disc.** The landmark radius is not read by the engine (grep: no radius use in `engine.ts`, `core/src/live.ts`).

- Gate placement: `store/gateSeeding.ts:20` `START_FRAC = 0.01`, `:21` `FINISH_FRAC = 0.99`, `:22` `SECTOR_FRACS = [0.25, 0.5, 0.75]`. Sanity floor (degenerate sector) `:28-30`.
- Engine candidate: `live/engine.ts:281` `gates: pickSpec.gates`; `:283` `det: new GateDetector(pickSpec.gates)`.
- Projector: `core/src/live.ts:60-116` (`LiveProjector.update`):
  - `:84-87` first fix anchors via global `nearestVertex(x, y, this.ref)` → `sp = ch[index]`.
  - `:88-89` search window `[sp - windowBack, sp + windowFwd]` = `[sp - 30, sp + 240]` (`DEFAULT_LIVE_OPTIONS` `:41-49`).
  - `:94-96` on corridor (`hit.dist <= o.corridor`): `this.sp = Math.max(this.sp, hit.s)`. Forward-only.
  - `:100-113` off-corridor: `lostBeforeReacq = 5`, bounded forward re-acq `reacqForwardM = 400`, time-aware `vMaxReacq = 15`.
- Gate detector: `core/src/live.ts:144-169` (`GateDetector.update`):
  - `:146-155` first fix (arming, D-016(b)): for each gate with `s >= g`: if `s - g < armWithinM (50)` fire `estimated: true` at `t`; else push to `skippedGates`; advance `next`.
  - `:157-164` later fixes: fire gate `g` when `prevS < g && s >= g`, time interpolated, `estimated = shaky` (gap > 10 s or jump > 100 m).
- Engine finish: `live/engine.ts:573-574` `evStart = ev[0]`, `evFin = ev[nSec]`; `:576` `if (evFin && this.lap === null)`; `:593-594` `this.lap = {...}; this.phase = 'finished'`. Once only.
- `engine.ts:391` `finalize()`: only settles an unmatched pick (never fired a gate) per header `:24-28`.
- Start-gate-to-finish-gate lap: `:586` `rawS = evFin.time - evStart.time`.

**Instant FINISH at t = 0 (possible, not verified on real data)**
- Loop reference line: start and end vertices both sit at the landmark. The first fix anchors via `nearestVertex`, which takes the lowest index on exact ties (`core/src/projection.ts:56-70`, strict `<`). With GPS noise the nearest vertex can be at the end (chainage ≈ L).
- If `sp ≈ L` at the first fix: `GateDetector` arming (`core/src/live.ts:146-155`) walks gates in order. Gates 0 … n-2 have `s - g ≥ 50` so they are skipped (`:152`). The FINISH gate (`0.99 L`) has `s - g < 50` only if `L - 0.99L < 50` (i.e., L under 5 km) and `s ≥ g`, so it fires `estimated` at `t0`. Result: `evFin` set, `evStart` null, lap estimated, `phase = 'finished'` at `t0` (`engine.ts:576-594`).
- Whether a real loop reference's start and end vertices coincide within GPS noise is **unclear** (not checked on a real ref asset).

**Never finishing (possible)**
- FINISH fires only when `sp` reaches `0.99 L` through fixes inside the corridor (`core/src/live.ts:94-96`). Fixes off-corridor for more than 5 in a row only re-acquire with the bounded forward search (`:101-113`). If the rider is lost, `sp` does not advance and FINISH does not fire. `finalize()` (`engine.ts:391`) does not score a fired-gate ride as missed.
- Window `[sp-30, sp+240]` (`:88-89`) excludes start-vertex segments once `sp > 270 m`, so a return to the landmark cannot snap back to chainage 0. Traced; not run.
- No minimum-distance or minimum-time guard on FINISH beyond the chainage gate and the arming rule.

---

## 4. Free-ride / no-route path at STOP (routeCreation.ts draft logic)

**At START with no route** (`RecordScreen.tsx:713-722`): `wayPick` null, `wayIds` = sport ways, `pickId` null → `engine.start` gives `cands = []`, `phase = 'detecting'` (`engine.ts:276-294`). No reference. Track null at STOP.

**At STOP** (`RecordScreen.tsx:736-794`):
- `:743` `liveEngine.finalize()`.
- `:758` `rememberRide(finalState, ...)`.
- `:784-786` `draftRouteFromRide(s.rideId, s.startedAtMs, finalState.track, ...)` → `draftRouteCreation` (`routeCreation.ts:197-293`).
- `:791-794`: `if (s && finalState.track === null && draft === null) markRideFree(...)`. Free only when there is no draft.

**`draftRouteCreation`** (`routeCreation.ts:197-293`):
- `:198-200` returns null for `fixes < 2` or track length `< MIN_TRACK_LENGTH_M` (200 m, `:50`).
- `:215-230` start: `landmarkAt(c, first)` (`:216`) → existing. Else `fittedRadius(first, c.landmarks)` (`:119-125`, `NEW_LANDMARK_RADIUS_M = 120`, floor `MIN_LANDMARK_RADIUS_M = 30`) → new draft `lm:{rideId}:start`. Else nearest existing disc.
- `:242-263` end: `landmarkAt(c, last)` (`:243`) → existing. Else `fittedRadius(last, [...c.landmarks, startDraft])` (`:247-249`). If that fails, `squeezer = nearestByEdge(...)`. **`:258-260`: if `start.kind === 'new' && squeezer === start.draft`, `end = { kind: 'new', landmarkId: start.landmarkId }` (loop onto the start draft).** Else end = existing squeezer.
- `:273` `loop = start.landmarkId === end.landmarkId`.
- `:280` `existingRouteFor(c, start, end)` (`:164-168`): only when both endpoints are `'existing'`. So a loop on a new draft never matches an existing loop Route.

**Cases**
- Start and end in the same existing landmark disc: both `existing`, same id → `loop = true` (`:273`), `existingRouteId` = first existing route `start===end` (`:164-166`, `:280`). Naming card loop text (`routeNamingCard.tsx:195-198`).
- Start and end within one new radius, no existing landmark: start draft at `r ≤ 120` (`:220-226`). End: `landmarkAt(c, last)` null (`:243`), `fittedRadius(last, [startDraft])` gives `d - r_start`; if `< 30` → `null` → squeezer is the start draft → loop onto `lm:{rideId}:start` (`:258-260`). Result: one new place, `loop = true`, `existingRouteId = null`.
- Start and end within 120 m of each other but track ≥ 200 m (out-and-back): same as above when the end is inside the start draft's shrunk disc.
- Track < 200 m, or fewer than 2 fixes: no draft → `markRideFree` if no track (`RecordScreen.tsx:791-793`).

**Landmark reuse / shrinking**: `:112-125` shrinks new discs to clear obstacles; `:128-142` `nearestByEdge` chooses the squeezer. `:197-200` for the minimum-track gate.

**Loop Route creation** (`routeCreation.ts:445-452`): `if (!draft.loop && draft.end.kind === 'new' && draft.end.draft)` adds the end landmark only when not a loop. `loopDiscriminator: \`loop:${draft.rideId}\`` when `draft.loop`.

**applyEndpointChoices** (`routeCreation.ts:318-327`): `if (draft.loop && draft.end.kind === 'new' && !draft.end.draft) end = start;` and `loop` recomputed at `:326`.

---

## 5. Every place that assumes start != end (or handles start == end)

Grep for `startLandmarkId`/`endLandmarkId` equality, `loop`, `loopDiscriminator`. A Set/Map keyed by the pair was not searched exhaustively (flagged below).

**Picker (blocks start == end)**
- `RecordScreen.tsx:1598` `startable.filter((l) => l.id !== fromId)`: GOING TO hides the START landmark. Only blocking point.
- `RecordScreen.tsx:284` `pickFrom` does not reset `to`: allows the hidden state.

**Route and naming (handles start == end)**
- `routeCreation.ts:164-166` `existingRouteFor`: pair rule, first match, no equality assumption.
- `routeCreation.ts:273` `loop = start.landmarkId === end.landmarkId`.
- `routeCreation.ts:277-279` comment: only loops can have several ways on one pair.
- `routeCreation.ts:324` `end = start` for a loop on a new draft.
- `routeCreation.ts:326` `loop` recomputed.
- `routeCreation.ts:335-345` `newPlaceLabelErrors`: `const endNew = !draft.loop && ...` (no end name for loops).
- `routeCreation.ts:445-452` end landmark built only when `!draft.loop`; `loopDiscriminator` stamped.
- `routeCreation.ts:457-` (not read in full): way/route build for loops, verify before relying.

**Catalog validation and merge**
- `store/catalog.ts:79-80` `if (w.startLandmarkId === w.endLandmarkId && !w.loopDiscriminator) errs.push(...)`: loops require a discriminator.
- `store/catalogMerge.ts:35` (comment), `:61-70`: merge that makes a route X → X gets `loopDiscriminator: \`loop:merged:${dropId}\``. `:87` `isLoop`.
- `store/catalogDelete.ts:61`: `routes.some((w) => w.startLandmarkId === landmarkId || ...)`. Loop-safe, not special-cased.
- `store/landmarkUsage.ts:18`: `if (r.endLandmarkId !== r.startLandmarkId)`: loop counted once.
- `store/placeSearch.ts:51`: counts routes touching a landmark; loop counted once per route.

**Catalog UI**
- `ui/catalogMapModel.ts:62` `if (r.startLandmarkId === r.endLandmarkId) return r.id;` (pairKey: loop keyed by route id, not pair).
- `ui/catalogMapModel.ts:162-163` other-end set excludes self.
- `ui/catalogMapModel.ts:168` direction `'loop'`.
- `ui/catalogDetailModel.ts:109` direction `'loop'`; `:154-155` `loop` and `loopDiscriminator`.
- `ui/CatalogDetailScreen.tsx:336` `loop · {discriminator}`.
- `ui/routeNamingCard.tsx:128-143`: loop state, `hideEnd`, `needEnd`.
- `ui/routeNamingCard.tsx:195-198`: loop copy.

**Labels (no equality logic, but render `A → A`)**
- `store/defaultWay.ts:81` `wayLabelIn`; `store/routeFromRide.ts:196` label; `RecordScreen.tsx:1263` armed title.
- The results `"{start} → {end}"` display (per the prior digest) was not re-verified here.

**Direction / reverse**
- Ways are directional: `routeCreation.ts:164-166` and `existingRouteFor` match `start→end` only. Reverse pair is a different route (`routecreation_suite.ts`, "reverse direction still a different way", around line 633-647).
- `catalogMapModel.ts` pairKey merges A→B with B→A for display only (`catalogmap_suite.ts:78-82`).

**Engine**: no `startLandmarkId`/`endLandmarkId` use in `live/engine.ts` or `core/src/live.ts`. The engine is keyed by way id/refLineId.

---

## 6. Relevant existing tests

**Loop creation and naming (store)**
- `tests/routecreation_suite.ts:102` `wayCreation: a ride ending back at its own new start landmark drafts a loop`: asserts `loop === true`, `start.kind === 'new'`, one landmark for both ends.
- `tests/routecreation_suite.ts:189` `wayCreation: a loop build needs (and gets) a loopDiscriminator and validates`.
- `tests/routecreation_suite.ts:538` `WP-G 8: an existing loop way drafts a variant, not a second loop way`.
- `tests/routecreation_suite.ts:590` `WP-G 10: a loop from and back to an EXISTING landmark with no loop way yet builds a new loop way and mints no landmark`.
- `tests/routecreation_suite.ts:616-657` `c18-05 rc1-rc4`: `applyEndpointChoices` loop cases (rc3 at `:648`: loop draft follows start's choice).
- `tests/routecreation_suite.ts:1390` `c18-06 rc6`: existing → existing re-point breaks the loop.

**Picker pure rules**
- `tests/recordflow_suite.ts:56-110` `effectiveFromId` cases: auto/pick/tap/detection. Covers the START rule only. No test for GOING TO filtering or for `to === fromId`.
- `tests/recordflow_suite.ts:145` `recordPressAction`.

**Catalog views**
- `tests/landmarkusage_suite.ts:51` `landmarkUsageCounts sums start+end usage, loop counted once`.
- `tests/catalogdetail_suite.ts:98-131` loop place direction and loop way `from === to` (`:131`).
- `tests/catalogmap_suite.ts:78-96` `pairKey` loop keyed by route id; loop line.
- `tests/catalogdelete_suite.ts:139-151` loop way delete drops landmark once.
- `tests/catalogmerge_suite.ts:94-104` merge making X → X gets discriminator.
- `tests/migrations_suite.ts:87-115` upgrade keeps loop discriminator.

**Record/pick logs**
- `tests/gpxplus_suite.ts:785` and `:807`: pick events with `from: '~new', to: '~new'` (new→new allowed in logging).

**Gaps**
- No test found that exercises the RECORD GOING TO filter or the `to`-left-behind state after `pickFrom`.
- No test found that drives `RecordScreen` `onStart` with `from === to`.
- No live-engine test with a loop reference (`live_suite.ts`, `engine_suite.ts` not checked for loop refs in detail).

---

## 7. Rider-facing strings (budgeted in `app/tests/ui-strings.allow.json`)

Picker-related:
- `DETECTED START` (line 778), `START NOT DETECTED` (line 818), `STARTING FROM` (line 826): START row label (`RecordScreen.tsx:1569-1577`).
- `GOING TO` (line 914): destination row label (`RecordScreen.tsx:1596`).
- `new` (line 978): `'new'` pill on both rows (`:1593`, `:1608`).
- `WHICH WAY TODAY?` (line 970): way picker under the route (`:1614`).
- `Start place` (line 3215): not traced to a picker site; **unclear**.

Loop naming card (STOP, not the picker):
- `This activity looped from and back to one new place.` (line 2852) and `This activity looped from and back to {…}.` (line 2861): `routeNamingCard.tsx:196-198`.

Adjacent, not picker:
- `same activity · new meaning` (line 866): RECORD sub-label (`RecordScreen.tsx:1671`).
- `No sport configured yet` (line 810): setup gate.
- `Pick it on RECORD next time instead of adding it again.` (line 1122): text about the picker, location not traced.

Armed-screen title `{from} → {to}` (`RecordScreen.tsx:1263`) is a template with no literal in the allow list that I found; **unclear** whether it is budgeted.

---

## Open questions (unclear from code alone)

1. Whether real loop reference lines (from `promoteRideToReference` / STOP naming) have start and end vertices close enough for the t=0 FINISH case in section 3. Needs a real ref asset.
2. Whether the hidden `to` state (section 1) has been reported on a device. Traced only.
3. Whether a Set/Map keyed on `startLandmarkId|endLandmarkId` pairs exists outside the files listed. Not exhaustively searched.
4. `routeCreation.ts:457-475` (way/route build body) was not read in full.
