# 06 — Gates and FIT from a previous ride leak onto a fresh NEW>>NEW ride (bug fix)

**Source:** Nathan, 2026-09-27, verbatim:

> "i did in the morning a HomeChurch ride and saved it. when i later did a WorkHome ride (also fresh so it was started as a NewNew ride), i saw on the live map while racing black circles corresponding to the previous HomeChurch ride gates; this is a big mistake and absolutely should be removed, also investigates why its still the case and make sure it does not happen again. During that, when pressing the 'fit' button on the openmap >> it also focused it on the previous HomeChurch ride, instead of fitting to the current portion of the ride i had already done which is what you would expect!"

**Status:** parked — do not execute until Nathan asks for it. This is a real correctness bug on the live preview build (data from ride A rendered during ride B), so it is briefed with more rigour than the cosmetic items in this cycle, but it still waits its turn.

**Written by:** Plan tier (Fable), 2026-09-27, from a Digest of `RecordScreen.tsx` / `wayMapView.tsx` / `wayMapGeo.ts` plus one direct spot-check of the anchors below. The spot-check **corrected** the Digest's root-cause chain — see "Root cause" §2. Nothing was implemented.

## Executor rules

- **Stop on ambiguity.** If any anchor below has moved by more than a few lines, or if the mandatory confirmation step (§ "Files to touch", step 0) does not reproduce one of the two hypotheses, stop and write up what you found instead of guessing. Do not "fix both just in case" without recording which path you confirmed.
- **No commit.** Leave changes in the working tree on branch `virgin`; Nathan commits.
- **No delete.** Never remove a file; never request delete permission. Anything to discard goes to `_to_delete/`.
- Do not touch the other briefs in `cycles/virgin-cycle15/` (01–05); some are being revised in parallel.
- Every PowerShell command in this doc that Nathan will paste uses full paths and `powershell -ExecutionPolicy Bypass -File …`.

## Goal

On a ride whose setup is NEW>>NEW (no known start, no known end), the live map must show **only this ride**: the rider dot, the trail already ridden, and nothing belonging to any other way in the catalog. The FIT button on the open map must frame **the trail ridden so far**, not the gates of some other saved way. Add a regression test so that a way saved earlier in the day can never again paint its gates onto an unrelated NEW>>NEW ride.

## Root cause — plain English first

### 1. What Nathan saw, decoded

- Ride A (morning): started NEW>>NEW, ridden, **saved as HomeChurch**. Saving created a way (with gates) in the catalog. Before that save the catalog on this virgin build had no ways at all, which is why this never showed up earlier.
- Ride B (later): started NEW>>NEW again. On the live map: black circles at HomeChurch's gate positions. FIT framed those circles.
- Two details in the report are diagnostic:
  - **"black circles"** — the free-ride ("gates only") overlay draws gates as circles in `colors.neutral`; route mode draws gates as **ticks** (short lines) coloured per gate. Circles mean the map was in the free-ride overlay, not in route mode.
  - **"started as a NewNew ride"** — the setup pills read NEW>>NEW at START. With both endpoints = `NEW_ID`, `CATALOG.routes.find(...)` matches no route, so the ride went down the free-ride branch of `onStart`, not the route branch.

### 2. The Digest's chain vs. what the spot-check shows — read this before touching code

The Digest proposed: `onEnd()` never resets `from`/`to`/`wayPick` → ride B inherits ride A's `from`/`to` → `route` lookup finds ride A's route → stale `rideWayHint` → `WayMapView` draws the old way's gate ticks and FITs to `wayBounds(oldAsset)`.

The spot-check (2026-09-27, `app/src/ui/RecordScreen.tsx` and `app/src/ui/wayMapView.tsx` on `virgin`) shows that chain **cannot be the operative one for the ride Nathan describes**:

- Ride A was itself NEW>>NEW (it was named HomeChurch only at save time). So even if `from`/`to` are never reset, the "stale" values carried into ride B are `NEW_ID`/`NEW_ID` — which is exactly what a fresh NEW>>NEW ride has. A `NEW_ID` pair matches no `CATALOG.routes` entry, so no stale route match occurs, `route` is `undefined`, `pickedWay` is `null`, and `onStart` takes the free branch: `setRideWayHint(null); setRideFreeWayIds(freeWayIdsRef.current)`. The route-mode stale-asset path (gate **ticks** + `wayBounds(asset)`) is not reached.
- `onEnd()` *does* already reset the one setup-scoped flag it owns for this purpose: `setFromExplicit(false)` with the comment "a finished ride's explicit FROM tap must not carry into the next ride's setup — the next setup gets a fresh suggestion." So `from`/`to` are deliberately persistent setup state governed by the fresh-suggestion mechanism; they are not the leak.

**The operative leak (hypothesis H1, strongly favoured):** the free-ride branch. A NEW>>NEW ride computes its candidate way set as `freeRideWayIds(CATALOG, null, null)` (both endpoints unknown). Once the catalog holds at least one saved way, that set is non-empty (it is very likely "every way in the catalog"), it is stored in `freeWayIdsRef` → `rideFreeWayIds` → the `mapOverlay` prop bundle → `WayMapView`'s `gateWayIds`. In `wayMapView.tsx` the `gatesOnly` overlay then draws `allGatesFeatureCollection(drawable, crossedGates, colors.neutral, gateWayIds)` — neutral **circles** for every gate of every candidate way — and FIT uses `allGatesBounds(drawable, gateWayIds)` — a frame around those same gates. That is exactly both symptoms from one source, and it explains why it "is still the case": nothing is stale; the overlay is faithfully drawing the catalog's candidate ways, and the catalog only stopped being empty this morning.

**The Digest's chain (hypothesis H2) survives only as a *different* bug**, one Nathan did not hit: a ride started as e.g. Home>>Church (route mode) followed by a ride whose setup is left on the same pills. That is arguably intended (the setup remembers where you ride), so H2 is not a bug at all in the form the Digest described; the genuinely ride-scoped pieces in it (`wayPick`, `pickedWayRef`, `rideWayHint`, `rideFreeWayIds`, `freeWayIdsRef`) are handled by the defensive reset in Decision D3.

Both hypotheses are recorded so the executor confirms rather than assumes (step 0 below). If H1 is confirmed, the fix is a policy change in what the live map is allowed to draw on a NEW>>NEW ride, not a missing reset.

### 3. Live anchors (verified 2026-09-27; line numbers ± a few)

`app/src/ui/RecordScreen.tsx`
- 239–240: `const [from, setFrom] = useState(() => defaultEndpoints(activeCatalog()).from ?? NEW_ID);` / same for `to`.
- 269: `const [wayPick, setWayPick] = useState<{ routeId: string; wayId: string } | null>(null);`
- ~505–520 (`onStart`, free branch then route branch):
  - free: `setRideWayHint(null); setRideFreeWayIds(freeWayIdsRef.current); s = await startTracking({ wayPick: null, mode: 'free', wayIds: freeWayIdsRef.current, … })`
  - route: `setRideWayHint(pickedWayRef.current?.refLineId ?? null); setRideFreeWayIds(null); s = await startTracking({ wayPick: pickedWayRef.current?.id ?? null, wayIds: [...wayIdsOfSport(...)], … })`
- 534: `const onEnd = useCallback(async () => {` … 596–616: `setFromExplicit(false); setReveal(…); setPhase('ending'); setNaming(draft); …` — no reset of `wayPick`, `pickedWayRef`, `rideWayHint`, `rideFreeWayIds`, `freeWayIdsRef`.
- ~980: `freeRideWayIds(CATALOG, fromId === NEW_ID ? null : fromId, to === NEW_ID ? null : to)` (assigned to the free-ride candidate list; confirm the variable name and that it feeds `freeWayIdsRef`).
- 985–994: `const route = CATALOG.routes.find((w) => w.startLandmarkId === fromId && w.endLandmarkId === to); … const pickedWay = route ? … : null;`
- ~1208–1214: `<WayMapView wayId={mapOverlay.wayId} lat={status.lastLat} lon={status.lastLon} zoom={4} gateColours={undefined} …` — the map is fed from a `mapOverlay` bundle (not `rideWayHint` directly). **Confirm** how `mapOverlay` derives `wayId`, `gatesOnly`, and `gateWayIds` from `rideWayHint` / `rideFreeWayIds`.

`app/src/ui/wayMapView.tsx`
- 585–588: `const drawable = gatesOnly ? allWayAssets(assetDeps()) : null; const gatesFC = gatesOnly && drawable ? allGatesFeatureCollection(drawable, props.crossedGates, colors.neutral, props.gateWayIds) : null;`
- 597–599: `const gateTicksFC = !gatesOnly && asset ? gateTicksFeatureCollection(asset, props.gateColours, gateHalfLen) : null;`
- 606–609: `const bounds = gatesOnly && drawable ? allGatesBounds(drawable, props.gateWayIds) : asset ? wayBounds(asset) : hasTrail ? trailBounds(props.trail!) : null;`
- 904: `onPress={() => setMode('fit')}`

`app/src/ui/wayMapGeo.ts`
- 441–459: `cameraTargetFor(...)` — consumes `bounds` above for the 'fit' mode (per Digest; not re-read in the spot-check).

State is pure React in-memory state; no AsyncStorage/file cache is involved on this path. `RecordScreen` does not unmount between rides (phase cycles setup → running → ending → setup).

## Decisions (do not reopen)

- **D1 — NEW>>NEW rides draw no foreign gates.** When both setup endpoints are `NEW_ID`, the live map's gate overlay is empty for the whole ride. The map shows rider dot + trail only. This holds even if the engine internally still receives a candidate `wayIds` list (see D2). Rationale: Nathan's ruling ("absolutely should be removed"); a ride the rider declared as starting and ending nowhere known has no business displaying another way's gates.
- **D2 — Engine candidate set is out of scope for this brief.** `startTracking({ mode: 'free', wayIds: freeWayIdsRef.current })` keeps receiving whatever `freeRideWayIds` returns today. This brief changes only what the **map** draws and frames. If the executor finds that the engine surfaces a "locked onto way X" state mid-ride that re-enables gate drawing, leave that behaviour alone and note it in Open questions — do not extend the fix into engine matching without a separate brief.
- **D3 — Defensive reset of ride-scoped state at ride end, explicitly listed.** In `onEnd()`, immediately before `setPhase('ending')` (next to the existing `setFromExplicit(false)`), reset: `setWayPick(null)`, `pickedWayRef.current = null`, `setRideWayHint(null)`, `setRideFreeWayIds(null)`, `freeWayIdsRef.current = []` (or the ref's documented empty value). Rationale: these five are ride-scoped by their own comments ("frozen at START", "the pre-lock candidate for the LIVE map") and none feeds the post-ride setup suggestion. Resetting at ride end (not at next-ride start) protects any future consumer that reads them between rides (results screen, ride detail hand-off, a future "last ride" panel), whereas resetting at `onStart` would protect only the path that happened to bite today. Both `onEnd` success and the discard path must reset them; the failed-stop `catch` branch must **not** (the ride is still live there).
- **D4 — `from` / `to` are NOT reset at ride end.** They are setup state governed by the existing `fromExplicit` fresh-suggestion mechanism (`onEnd` already does `setFromExplicit(false)`), and they are not the leak (§2). Resetting them would change what the setup shows after every ride, which is a UX decision for Nathan, not a bug fix. If a later ruling wants "setup always returns to NEW>>NEW after a ride", that is its own brief.
- **D5 — Generic "reset everything ride-scoped" refactor: not now, audit instead.** A blanket reset (e.g. keying the running-phase subtree so it remounts) would be the most future-proof but touches every ride-scoped hook and the WP-H ride-detail hand-off that reads state across the 'ending' flip. The executor instead produces a short audit list (see Files to touch, step 4) of every `useState`/`useRef` in `RecordScreen.tsx` whose comment says it is per-ride, marking each as "reset in onEnd: yes/no/n.a." and appending it to this file. Anything found un-reset beyond D3's five goes into Open questions for Nathan, not into this fix.
- **D6 — FIT on a NEW>>NEW ride frames the trail.** With no gates to frame, `bounds` must fall through to `trailBounds(props.trail)`; before any trail exists it falls to the rider position (existing `null` handling in `cameraTargetFor`). No new "fit to everything in the catalog" fallback.

## Files to touch

### Step 0 — mandatory confirmation (no edits yet)

Read, in this order, and record findings at the bottom of this file under "Executor confirmation":
1. `freeRideWayIds` (search `app/src` for its definition): what does it return for `(catalog, null, null)`? Expected under H1: all ways (or all ways of the current sport). If it returns `[]`, H1 is dead — stop and report.
2. `mapOverlay` in `RecordScreen.tsx`: how `wayId`, `gatesOnly` (or whatever prop enables the circles overlay) and `gateWayIds` are derived from `rideWayHint` / `rideFreeWayIds` / `pickedWay`.
3. `assetDeps()` / `allWayAssets` in `wayMapView.tsx`'s imports: confirm a way saved at the end of ride A is present in the drawable set during ride B without an app restart (it must be, given the symptom, but confirm the mechanism so the test in step 3 mirrors reality).
4. The save/naming flow that ran after ride A (`setNaming(draft)` → wherever a new way + landmarks are written): confirm it does **not** set `from`/`to` to the new landmarks. If it does, note it — that would mean ride B's NEW>>NEW was an explicit re-pick by Nathan and H2's route-match is still impossible (NEW>>NEW ≠ a route), so the conclusion stands, but the audit list in step 4 should mention it.

If findings match H1: proceed. If they match neither H1 nor H2: stop and report.

### Step 1 — `app/src/ui/RecordScreen.tsx` (the fix, H1)

Introduce one pure helper (exported, so it can be unit-tested without React):

```ts
// Which way ids the LIVE MAP may draw gates for on a free ride. A ride whose
// setup is NEW>>NEW has declared no known start and no known end — nothing in
// the catalog belongs on its map, whatever the engine is matching against
// (cycle virgin-cycle15 06: a way saved that morning painted its gates onto
// an unrelated NEW>>NEW ride; FIT framed those gates instead of the trail).
export function liveMapGateWayIds(
  fromId: string, toId: string, candidateWayIds: readonly string[],
): string[] {
  if (fromId === NEW_ID && toId === NEW_ID) return [];
  return [...candidateWayIds];
}
```

Wire it where `mapOverlay.gateWayIds` (or the equivalent prop) is built: the map gets `liveMapGateWayIds(fromId, to, rideFreeWayIds ?? [])`, **not** `rideFreeWayIds` directly. The engine's `startTracking({ wayIds })` call is left untouched (D2).

Also confirm the overlay's enabling flag: if `gatesOnly` is derived as `rideFreeWayIds !== null` (or similar), a NEW>>NEW ride still enters the `gatesOnly` branch with an empty `gateWayIds`, which is what we want — `allGatesFeatureCollection` yields zero features and `allGatesBounds` must then return `null` so `bounds` falls through. Check `allGatesBounds` on an empty id list: if it returns a degenerate bounds (e.g. `[Infinity, -Infinity]`) rather than `null`, fix it to return `null` for an empty selection and cover that in the test.

Where `from`/`to` are partially known (Home>>NEW, NEW>>Church), behaviour is unchanged: `freeRideWayIds` already narrows to ways touching the known endpoint, and those gates are legitimately this ride's candidates. Do not widen the rule beyond NEW>>NEW.

### Step 2 — `app/src/ui/RecordScreen.tsx` (D3 defensive reset)

In `onEnd()`, directly after `setFromExplicit(false)` and before `setPhase('ending')`, add the five resets from D3 with a one-line comment pointing at this brief. Mirror the same five in the discard path (search for where a discarded ride returns to 'setup'; the "Reset when a ride ends or is discarded" comment near line 242 marks the pattern). Leave the `catch` branch alone.

Check that nothing after `setPhase('ending')` in the same tick reads `pickedWayRef.current` or `rideWayHint` for the results/ride-detail hand-off (WP-H captures its identity from `sessionRef.current` *before* this point per its comment — verify that comment still holds, then proceed). If something does read them, move the reset to just after that read and say so in the confirmation notes; do not drop the reset.

### Step 3 — `app/tests/waymap_suite.ts` (regression coverage; new tests, no existing test edited)

Add a block titled `cross-ride isolation (virgin-cycle15 06)` with these cases, all pure-function, no React:

1. `liveMapGateWayIds(NEW_ID, NEW_ID, ['wayA'])` → `[]`.
2. `liveMapGateWayIds('home', NEW_ID, ['wayA','wayB'])` → `['wayA','wayB']` (partial endpoints unchanged).
3. `liveMapGateWayIds('home', 'church', ['wayA'])` → `['wayA']` (route mode never calls this in practice, but the helper is total).
4. Build a minimal drawable with one way asset carrying two gates (reuse the fixture helper the suite already uses for gate rendering tests). `allGatesFeatureCollection(drawable, crossed=[], colour, gateWayIds=[])` → `features.length === 0`.
5. Same drawable: `allGatesBounds(drawable, [])` → `null` (not a degenerate box).
6. End-to-end shape of the bug: `drawable` has way `homechurch` (saved from ride A). Ride B inputs: `fromId = NEW_ID`, `to = NEW_ID`, `candidates = freeRideWayIds(catalogWithHomeChurch, null, null)`. Assert `candidates.length > 0` (documents the H1 mechanism — if this assertion ever fails, `freeRideWayIds` changed and the test must be revisited, not silently pass) **and** `liveMapGateWayIds(NEW_ID, NEW_ID, candidates)` → `[]` **and** the resulting `bounds` selection (call the same expression as wayMapView 606–609 through whatever helper exists, or replicate the three-way ternary in the test with an explicit comment) equals `trailBounds(trail)` for a two-point trail.

If `waymap_suite.ts` cannot import from `RecordScreen.tsx` without pulling React Native into the test runner, put `liveMapGateWayIds` in `app/src/ui/wayMapGeo.ts` (next to `cameraTargetFor`) instead and import from there; note the placement in the confirmation notes.

### Step 4 — audit list (append to this file, no code)

List every `useState` / `useRef` in `RecordScreen.tsx` whose adjacent comment describes it as per-ride ("this ride", "frozen at START", "until the ride ends", etc.) with: name | reset in `onEnd` before this brief (yes/no) | reset after (yes/no/n.a.) | one-line why. Expected to include at least: `wayPick`, `pickedWayRef`, `rideWayHint`, `rideFreeWayIds`, `freeWayIdsRef`, `fromExplicit`, `reveal`/`revealDone`, `postRevealRef`, `naming`, `sessionRef`, `startContextRef`, `showAnim`. Anything per-ride and still un-reset after D3 goes into Open questions — not into code.

## Verification plan

1. **Baseline first.** Run the full suite before editing and record `pass/fail/total` in the confirmation notes. Use the same invocation the other cycle-15 briefs cite (see `02-first-sport-on-record.md` → Verification plan) so numbers are comparable. The Digest did not capture the current count; the last recorded figure in project memory is ~506 tests (cycle 3 preflight). Briefs 01–05 in this cycle are parked and may land in any order, so the baseline at execution time may differ from the number written here — always re-measure, never copy.
2. After Steps 1–3: full suite again. Expect baseline + 6 new passes, zero new failures. `tsc --noEmit` (or the repo's typecheck command) clean.
3. Publish a preview per the existing `publish-preview.ps1` flow **only when Nathan asks**; the on-device checklist below needs a real GPS ride.

## On-device checklist (Nathan's exact repro — both halves must pass)

Preconditions: preview build with this fix, catalog state as on 2026-09-27 (HomeChurch saved, optionally more).

1. Setup NEW>>NEW. START. Ride any road that is **not** HomeChurch for ~2 minutes. Open the live map.
   - Expect: rider dot + trail only. **No black circles anywhere**, in particular none at HomeChurch's gate positions. Pan to where HomeChurch runs to confirm.
2. Tap FIT while still riding.
   - Expect: camera frames the trail ridden so far (start of ride to current position), not HomeChurch, not the whole catalog.
3. STOP. Save the ride under a new name (e.g. WorkHome).
4. Immediately set up another NEW>>NEW ride and START.
   - Expect: still no circles from HomeChurch **or** from the WorkHome way just saved.
5. Regression guard for partial endpoints: setup Home>>NEW (or whichever landmark exists). START, open the map.
   - Expect: gates of ways starting at Home **are** shown (unchanged behaviour), FIT frames them (unchanged).
6. Regression guard for route mode: setup Home>>Church. START, open the map.
   - Expect: HomeChurch gate ticks (coloured, not circles), FIT frames that way (unchanged).
7. STOP and discard (don't save). Set up NEW>>NEW, START: no circles (D3 discard-path reset).

Report each line as pass/fail with a screenshot of step 1 and step 2.

## Out of scope

- Changing what the engine matches a free ride against (`freeRideWayIds`, `startTracking({ wayIds })`) — D2.
- Resetting `from`/`to` after a ride, or any change to the post-ride setup suggestion — D4.
- A generic remount/reset of all ride-scoped state — D5 (audit only).
- Gate styling (circle vs tick, colours), zoom levels, `gateHalfLenM`.
- Anything in briefs 01–05 of this cycle.

## What this changes on Nathan's phone

Only after a preview build/OTA that includes it — nothing changes until then. After it lands: a NEW>>NEW ride's live map shows just your dot and your trail; FIT frames the trail. Rides with a known start or end, and full route rides, look exactly as before. Saved ways, ride history, and results screens are untouched.

## Open questions (for Nathan; not blocking execution)

1. On a NEW>>NEW ride, if the engine recognises mid-ride that you are on a saved way (e.g. you actually ride HomeChurch again), should the map then start showing that way's gates? Current brief: **no** (D1 holds for the whole ride). Say so if you want the opposite.
2. Should the setup return to NEW>>NEW after every saved ride, rather than remembering the last pills? (D4 keeps today's behaviour.)
3. Anything the Step 4 audit surfaces as per-ride and never reset.

## Executor confirmation

**Filled in by the Sonnet Execute pass, 2026-09-27/28. H1 confirmed. Implemented, not stopped.**

### Step 0 findings

1. **`freeRideWayIds(catalog, null, null)`** (`app/src/store/catalog.ts:190-200`) does **not** return an array — it hits the final `return null;` (both-null branch), which is its own documented, already-tested contract: "Both null (both ends unknown) returns null — NO filtering, deliberately" (doc comment, and `store_suite.ts:188` already asserts `freeRideWayIds(c, null, null) === null`). This is not literally "all ways" as the brief's Step 0 anticipated, and not `[]` either — so neither of the brief's two literal expectations hit. But it is functionally equivalent to H1's claim: every consumer that receives this `null` downstream (`allGatesFeatureCollection`/`allGatesBounds` in `wayMapGeo.ts`, both `const ids = wayIds ?? Object.keys(assets);`) treats a missing/`null` id list as "every way in the drawable set" — i.e. `null` **is** the "unfiltered = all ways" case, just spelled as a sentinel instead of a literal array. H1 stands; only the exact value shape needed correcting, which is why Step 1 below wires `rideFreeWayIds ?? []` before calling the new helper rather than assuming `rideFreeWayIds` is already an array.
2. **`mapOverlay`** (`recordFlow.ts`'s `liveMapOverlayFor`) only derives `{ wayId, showTrail }` — it has no `gatesOnly` or `gateWayIds` field at all. The actual JSX (`RecordScreen.tsx` ~1216-1218) sets `gatesOnly={live.mode === 'free'}` and, before this fix, `gateWayIds={rideFreeWayIds}` directly — neither goes through `mapOverlay`. This is a description-level deviation from the brief's text, not a code mismatch: the brief's own Step 1 already hedges with "(or the equivalent prop)", and this is that equivalent prop. Confirmed `rideFreeWayIds === null` if and only if the ride is free-mode NEW>>NEW (both `freeRideWayIds` branches for a partial free ride always return an array, never null — see `catalog.ts:190-200`), so `rideFreeWayIds ?? []` in the new wiring is a safe, exact translation of "unfiltered" into "empty" for the one case (NEW>>NEW) `liveMapGateWayIds` is meant to zero out, without touching the partial-endpoint case.
3. **`assetDeps()`** (`wayMapView.tsx:159-161`) calls `currentCatalog()` at call time, not at import/mount time (matches STATE.md's own note). Confirmed a way saved at the end of ride A is present in `allWayAssets(assetDeps())` during ride B with no app restart — this is exactly the mechanism that makes the bug possible the same day a way is first saved.
4. **Save/naming flow** (`onEnd`'s `draftRouteFromRide` → `setNaming(draft)`, `RecordScreen.tsx` ~569-603) does not call `setFrom`/`setTo` anywhere in that path — the only writers of `from`/`to` are `pickFrom`, `pickSport`, and the initial `useState` default. Confirmed: ride B's NEW>>NEW was Nathan's own fresh setup, not a stale carryover from ride A's save, so H2 (stale route match) was correctly ruled out — it cannot even be reached, since NEW>>NEW matches no `CATALOG.routes` entry regardless of what `from`/`to` happen to hold.

**One additional finding beyond Step 0's checklist, load-bearing for D6:** the `bounds` computation in `wayMapView.tsx` (previously lines 606-609) is a strict ternary chain — `gatesOnly && drawable ? allGatesBounds(...) : asset ? wayBounds(asset) : hasTrail ? trailBounds(...) : null` — which does **not** fall through to `hasTrail`/`trailBounds` just because `allGatesBounds` returns `null`; in JS that ternary resolves to `allGatesBounds`'s result (including `null`) the moment `gatesOnly && drawable` is true, full stop. Since `gatesOnly` is true for the whole of any free ride once a way exists in the catalog, FIT would have kept resolving to `null` (not the trail) for a NEW>>NEW ride even after emptying `gateWayIds`, contradicting D6 ("FIT on a NEW>>NEW ride frames the trail"). `allGatesBounds` itself already returns `null` correctly for an empty id list (no fix needed there — confirmed against `waymapgeo_suite.ts:201`'s existing test). The brief's Step 1 anticipated needing a fix "in this area" (its `allGatesBounds` degenerate-bounds check) but pointed at the wrong function; the actual defect was one level up, in the ternary that doesn't cascade past a null gates-only result. Fixed by splitting the ternary so a null gates-only bounds explicitly falls through to `asset ? wayBounds(asset) : hasTrail ? trailBounds(...) : null` (see Files changed). I judged this within Step 1's own explicit scope and authorization ("fix it... and cover that in the test") rather than a stop-worthy ambiguity, since D6's intent is unambiguous and the fix is mechanical, not a product decision.

### Files changed

- **`app/src/ui/wayMapGeo.ts`** — added `liveMapGateWayIds(fromId, toId, candidateWayIds)`: returns `[]` when both endpoints are the NEW pseudo-id, otherwise passes `candidateWayIds` through unchanged. Uses a local `'~new'` literal (documented as mirroring `RecordScreen.tsx`'s private `NEW_ID`) rather than importing it, to stay headless-testable.
- **`app/src/ui/wayMapView.tsx`** — split the `bounds` computation into `gatesOnlyBounds` (unchanged logic) and `bounds = gatesOnlyBounds ?? (asset ? wayBounds(asset) : hasTrail ? trailBounds(...) : null)`, so an empty/null gates-only selection now correctly falls through to the trail (D6). This was necessary beyond the brief's literal Step 1 text — see finding above.
- **`app/src/ui/RecordScreen.tsx`** — (a) imported `liveMapGateWayIds`; (b) `WayMapView`'s `gateWayIds` prop is now `liveMapGateWayIds(fromId, to, rideFreeWayIds ?? [])` instead of raw `rideFreeWayIds` (D1); (c) `onEnd()`'s success path resets `wayPick`, `pickedWayRef.current`, `rideWayHint`, `rideFreeWayIds`, `freeWayIdsRef.current` immediately after the existing `setFromExplicit(false)` and before `setPhase('ending')` (D3); (d) the discard path (`onDiscard`) gets the identical five-line reset before `setPhase('setup')`, matching D3's discard requirement; the failed-stop `catch` branches in both `onEnd` and `onDiscard` are untouched, as required.
- **`app/tests/waymapgeo_suite.ts`** — added 4 new tests (see below), not `app/tests/waymap_suite.ts` as the brief names — see placement note.
- **No other file touched.** Briefs 01-05 of this cycle were not opened.

### Test placement note (deviation from brief text)

The brief names `app/tests/waymap_suite.ts` for the new tests, but that file's own header restricts it to `wayMapMath.ts` (pixel-projection) coverage, and it does not import `wayMapGeo.ts`. The functions this fix touches (`allGatesFeatureCollection`, `allGatesBounds`, the new `liveMapGateWayIds`) already have their own dedicated, already-importing suite: `app/tests/waymapgeo_suite.ts`. I put the new tests there instead, matching the project's existing one-suite-per-source-file convention, and I'm flagging it here per the brief's own fallback instruction ("note the placement in the confirmation notes"). `liveMapGateWayIds` itself lives in `wayMapGeo.ts` (the brief's own fallback location for exactly this reason — RecordScreen.tsx pulls in react-native).

### Tests added (4, not 6 — 2 of the brief's 6 already existed)

1. `liveMapGateWayIds(NEW_ID, NEW_ID, ['wayA'])` → `[]`.
2. `liveMapGateWayIds('home', NEW_ID, ['wayA','wayB'])` → `['wayA','wayB']` (partial endpoint unchanged).
3. `liveMapGateWayIds('home', 'church', ['wayA'])` → `['wayA']` (route mode never calls this; the helper is total).
4. End-to-end repro: a minimal `Catalog` with one saved way (`homechurch`), `freeRideWayIds(catalog, null, null)` asserted `=== null` (documents the real H1 mechanism, not the brief's literal `[]` guess), then `liveMapGateWayIds(NEW_ID, NEW_ID, candidates ?? [])` asserted `=== []`, then both the pre-fix leak (`allGatesFeatureCollection`/`allGatesBounds` fed the raw `null` draw every gate / a real box) and the post-fix result (zero features, `null` bounds) are asserted side by side, plus the corrected bounds-fallthrough-to-trail behaviour (D6).

Brief items 4 and 5 (an empty `routeIds` filter yields 0 features / `null` bounds) were **already covered** by pre-existing tests: `waymapgeo_suite.ts` "an empty routeIds filter yields zero features" and "...must yield null bounds" (line ~168 and ~201 respectively, both pre-dating this brief). Not duplicated.

### Test suite result

- **Baseline (before):** 676 tests: 673 pass, 0 fail, 3 skip.
- **After:** 680 tests: 677 pass, 0 fail, 3 skip. (+4 new, all passing; zero regressions.)

### `tsc --noEmit`

Clean, exit 0, no output.

### Step 4 — audit list (per-ride `useState`/`useRef` in `RecordScreen.tsx`)

| name | per-ride? | reset in `onEnd`/discard before this brief | reset after this brief | note |
|---|---|---|---|---|
| `wayPick` | yes | no | **yes** (D3) | real state, only ever set by `pickFrom`/`pickSport`/onStart-adjacent code — genuinely could carry over; now cleared. |
| `pickedWayRef` | yes (comment: "the pre-lock candidate") | no | yes (D3), **but functionally moot** | unconditionally re-synced every render (`pickedWayRef.current = pickedWay;`, line ~1026) from the currently-computed `pickedWay` — by the time any code could read it again (next render), it already holds the fresh value, not the reset. Harmless, not protective. |
| `rideWayHint` | yes ("frozen at START") | no | **yes** (D3) | real state, only set at `onStart`'s two branches — genuinely persisted between rides before this fix; now cleared. |
| `rideFreeWayIds` | yes ("frozen at START", WP-B) | no | **yes** (D3) | same as `rideWayHint` — this is the field this brief's D1 fix (`liveMapGateWayIds`) primarily guards, and D3 adds a second, independent clearing at ride-end. |
| `freeWayIdsRef` | yes (mirror, "same reason pickedRouteRef mirrors") | no | yes (D3), **but functionally moot** | same caveat as `pickedWayRef` — unconditionally re-synced every render from `freeWayIds`, so the onEnd/discard reset is overwritten before it could matter. |
| `fromExplicit` | yes (explicit comment: "Reset when a ride ends or is discarded") | **yes**, pre-existing | yes, unchanged | D4 — deliberately not touched further. |
| `reveal` / `revealDone` | yes (built fresh in `onEnd` from `buildRankingReveal`) | n.a. — always overwritten with a fresh value the same tick, never merely "reset" | n.a. | no leak risk: unconditionally reassigned every `onEnd`, never conditionally skipped. |
| `postRevealRef` | yes | n.a. — same as above, unconditionally reassigned in `onEnd` | n.a. | no leak risk. |
| `naming` | yes (OPEN-ITEMS item 2 / WP-F) | n.a. — `setNaming(draft)` unconditionally reassigned in `onEnd` (draft may itself be `null`); also explicitly `setNaming(null)` on the two dismissal paths | n.a. | no leak risk. |
| `sessionRef` | yes | yes — mirrors `session`, which `onEnd` sets to `null`, and the ref itself is unconditionally re-synced every render | n.a. | no leak risk; this is WP-H's own identity-capture source, read into `endedRef` *before* the null-out, exactly as the brief expected. |
| `startContextRef` | yes ("mirror... CURRENT RECORD-tab state") | no explicit onEnd reset | not added by this brief | **functionally moot in the same way as `pickedWayRef`/`freeWayIdsRef`** — unconditionally re-synced every render from the current `fromId`/`to`/etc., so a stale value cannot survive to the next ride's setup render. Only read inside `onStart`'s closure at the instant START is pressed, by which point it already reflects the current setup. Not added to D3's list; flagged here per the brief's own instruction that an unreset per-ride field goes to Open questions, not into code — but I judge it not to need one, for the reason just given. Nathan/coordinator may want a second opinion since it wasn't literally on D3's five. |
| `freeRideRef` | yes | no | not added by this brief | same "functionally moot" caveat as `pickedWayRef` — unconditionally re-synced every render. Same judgment as `startContextRef`. |
| `showAnim` | phase-transition state, not candidate-data-shaped | n.a. — driven by the animation lifecycle (`onDone` callbacks elsewhere set it back to `null`/other value), not a "which way's data" leak vector | n.a. | out of this bug's shape entirely (it never carries a way id or gate list) — included here only because it's per-ride and un-auditied elsewhere. |
| `trail` | yes | **yes**, pre-existing (`setTrail([])` in `onEnd`, in `onDiscard`, and at `onStart`) | unchanged | already fully handled before this brief; not touched. |

**Nothing found beyond D3's five that presents an actual leak risk.** The two "functionally moot" rows (`pickedWayRef`, `freeWayIdsRef`, and by the same logic `startContextRef`/`freeRideRef`) reset a value that gets overwritten on the very next render regardless — I implemented D3's literal five exactly as specified (harmless either way) but want this surfaced rather than silently letting the audit imply they're doing real work.

### Anything noticed but out of scope

- The two "reset is a no-op" refs above (`pickedWayRef`, `freeWayIdsRef`) suggest D3's ref-resets were modeled on `rideWayHint`/`rideFreeWayIds`'s genuinely-frozen behaviour without noticing that the two *ref* mirrors (as opposed to the two *state* values) don't actually freeze anything — they re-sync every render. Not a bug (no observed or reachable failure mode), just a documentation/mental-model mismatch worth a look if `RecordScreen.tsx`'s ref-mirror pattern is ever revisited.
- Nothing else observed while reading these three files that looked broken or worth flagging.
