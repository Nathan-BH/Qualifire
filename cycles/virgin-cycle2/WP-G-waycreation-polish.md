**Status: BRIEF WRITTEN, NOT YET EXECUTED.**
**Open item:** OPEN-ITEMS.md "Parked" — "Two small polish items from the way-creation inspection." Size: chore (a copy-string condition + two new regression tests, no new logic).
**Written by:** coordinator directly (Sonnet chat) — both items were already fully diagnosed by the original way-creation inspection pass; this brief just re-verifies the exact anchors against the current repo and states the fix precisely enough to execute.
**Corrected 2026-09-04** after a fresh-context Inspect pass found the original G2 test spec targeted the wrong branch/duplicated existing coverage — see the G2 section for the re-derived version (Fable Plan, re-derived from the real files: `wayCreation.ts` is 393 lines, `waycreation_suite.ts` is 882 lines / 37 `test(` calls).

## What it is

Two small, independently-fixable leftovers from the retroactive-way-creation inspection (STATE.md's "Known stubs / footguns" + OPEN-ITEMS.md's "Parked" section):

**G1 — the way-naming card's loop copy always says "one new place."** When a ride loops (starts and ends at the same spot), the STOP-step naming card's sub-copy unconditionally says "This ride looped from and back to one new place" — even when that shared point is actually an EXISTING landmark the rider already has (e.g. looping out from and back to Home). The copy is misleading in that case: nothing new is being named, an existing landmark is just being reused as both ends of a loop.

**G2 — two `wayCreation.ts` paths are correct but not directly test-covered.** (a) The END-side sub-MIN sliver that reuses a pre-existing catalog landmark (the start-side twin IS tested; the end side has its own ternary and is not). (b) A loop ridden from and back to an EXISTING landmark that has NO loop way yet — the brand-new-way build path with zero landmarks pushed. (b) is exactly the store-level shape behind G1's copy bug. Neither is pinned by any test in `waycreation_suite.ts`; see the G2 section for what IS already covered and why the original spec was wrong.

## Current state (re-verified 2026-09-04, exact repo)

### G1 — `app/src/ui/wayNamingCard.tsx`

Props (lines 27-45): `startExistingLabel: string | null` ("label of the matched existing start landmark, or null => name input"), `endExistingLabel: string | null` (same, for end), `loop: boolean` ("start === end: one place, one input").

Derived state (line 59): `const needStart = props.startExistingLabel === null;` — i.e. `props.startExistingLabel !== null` means the loop's shared point IS an existing landmark.

The copy (lines 91-100, inside the sub-title `<Text>`):
```typescript
{existingWay
  ? props.matchedRouteLabel
    ? `Scored as ${props.matchedRouteLabel}. Was this a different route? ...`
    : `${existingWay.label} is a way you have, but this ride did not follow any of its routes. ...`
  : props.loop
    ? 'This ride looped from and back to one new place.'
    : props.matchedRouteLabel
      ? `Scored as ${props.matchedRouteLabel}, but no way of yours runs between these two places. ...`
      : 'This ride does not match any way you have. ...'}
```
The `props.loop ? '...one new place.' : ...` branch (line 98) never checks `props.startExistingLabel` — it always renders the "new place" wording, even when `props.startExistingLabel !== null` (the loop point already exists as a landmark).

### G2 — `app/src/store/wayCreation.ts` (393 lines; anchors re-derived 2026-09-04)

**Why the original G2 spec was wrong (so Execute does not re-derive it).** The original brief read the `draft.end.draft` guard at `buildWayCreationCatalog` (now lines 366-368) as "the sliver-reuse case". It is not. In `draftWayCreation`, an end-side sub-MIN sliver resolves at lines 229-235:
```typescript
const squeezer = nearestByEdge(last, obstacles)!;
end =
  start.kind === 'new' && squeezer === start.draft
    ? { kind: 'new', landmarkId: start.landmarkId } // loop onto the start draft
    : { kind: 'existing', landmarkId: (squeezer as Landmark).id };
```
So `end.kind === 'new'` WITHOUT a `draft` only ever arises for loop-onto-the-start-draft (line 233) — already built and validated by the test at `waycreation_suite.ts:152` ("a loop build needs (and gets) a loopDiscriminator and validates"). A genuine sliver reuse of a catalog landmark yields `kind: 'existing'` (line 234), and the build guard at 366 skips it because of the `kind`, not because `draft` is missing. The original test 1 therefore described an unreachable shape. The original test 2 (both endpoints existing, same landmark, an existing loop way in the catalog → `existingWayId` set) is already covered end-to-end by `WP-G 8` (`waycreation_suite.ts:500-524`), which asserts both `start.kind`/`end.kind === 'existing'`, `loop === true`, `existingWayId === 'loop:existing'`, and that the build mints no second way.

**What is genuinely untested — two paths, both verified 2026-09-04 by running the real module against the fixture geometry below (both land in the intended branch and validate when merged):**

**(a) End-side sliver reuse of a PRE-EXISTING landmark** — line 234's `: { kind: 'existing', landmarkId: (squeezer as Landmark).id }` with the start side NEW. The start-side twin (line 201) is pinned by the `tight` case at `waycreation_suite.ts:82-96` (constant `0.0015272°` ≈ 170 m centre distance, 150 m radius → 20 m gap < `MIN_LANDMARK_RADIUS_M` 30). Every existing test whose END resolves to 'existing' gets there via a `landmarkAt` disc hit or the WP-F slack guard (lines 239-244), never via the sliver ternary — and on the end side the ternary must choose the catalog landmark over the start's own draft in `obstacles`, which is the thing a refactor could break.

**(b) Loop from and back to an EXISTING landmark with NO existing loop way** — `start.kind === 'existing' && end.kind === 'existing'`, same id, `loop === true`, the `existingWay` lookup at lines 252-257 finds nothing (`existingWayId === null`), so the build takes the brand-new-way path (lines 361-392) and pushes ZERO landmarks (both guards at 363/366 are false because the kinds are 'existing'), minting a loop way with `loopDiscriminator` on a landmark it does not own. Existing coverage: `:152` builds a loop on a NEW landmark (one landmark pushed); `WP-G 8` builds through the VARIANT path (line 336 branch); `WP-G 0`'s `unlinked` case is both-existing-no-way but non-loop and drafts only. None reaches "zero landmarks, new loop way, merged catalog validates". This is the exact draft shape G1's copy fix keys on (`startExistingLabel !== null` with `loop`), so pinning it makes the two G items coherent.

### Existing test file: `app/tests/waycreation_suite.ts` (882 lines, 37 `test(` calls as of 2026-09-04 — re-run `grep -c "^\s*test(" app/tests/waycreation_suite.ts` at execute time)

Helpers available in the pure section (lines 37-53): `LAT0`/`LON0`, `northRide(nFixes, stepLat = 0.001)` (due-north fixture, ~111.32 m per 0.001°), `lm(id, lat, lon, radiusM)` (label = id, active from 0), `catWith(landmarks, ways = [], routes = [])`, `RIDE = { rideId: 'ride-t1', startedAtMs: 1_700_000_000_000 }`. Imports already present: `emptyCatalog`, `mergeCatalogs`, `metresBetween`, `validateCatalog`, `MIN_LANDMARK_RADIUS_M`, `NEW_LANDMARK_RADIUS_M`, `buildWayCreationCatalog`, `draftWayCreation`. Tests directly relevant to G2: `:82` (start-side sliver), `:98` (loop-onto-start-draft draft), `:110` (WP-G 0), `:152` (loop-onto-start-draft build), `:500` (WP-G 8). The two new tests go in the pure section — after `WP-G 8` (ends line 524) and BEFORE the `// ===== WP-H §3.3b` banner at line 526, so they stay in the synchronous pure block and do not need the WP-H harness.

## The fix

**G1:** change line 98's condition from `props.loop ? '...' : ...` to branch on whether the loop point is existing or new, e.g.:
```typescript
: props.loop
  ? (props.startExistingLabel !== null
      ? `This ride looped from and back to ${props.startExistingLabel}.`
      : 'This ride looped from and back to one new place.')
  : ...
```
(Exact wording for the existing-landmark case is a judgment call for whoever executes this — the above is a reasonable default, not a mandate; keep it short and consistent with the surrounding copy's tone.)

**G2:** add two new test cases to `app/tests/waycreation_suite.ts`, placed after `WP-G 8` and before the WP-H banner (see above). Names are suggestions; keep the file's `'wayCreation: …'` / `'WP-G n: …'` prefix style.

1. **`'WP-G 9: an END-side sub-MIN sliver reuses the pre-existing landmark (not the start draft) and the build pushes only the start'`** — fixture (verified): `const tight = lm('tight', LAT0 + 0.019 + 0.0015272, LON0, 150);` `const cat = catWith([tight]);` `const d = draftWayCreation(cat, { ...RIDE, fixes: northRide(20) });` (start at `LAT0`, ~2285 m from `tight` → new at full radius; end at `LAT0 + 0.019`, 170 m from `tight`'s centre → 20 m gap < MIN → sliver). Assert on the draft: `d !== null`; `d.start.kind === 'new'` and `d.start.draft!.radiusM === NEW_LANDMARK_RADIUS_M` (the far-away disc did not squeeze the start); `d.end.kind === 'existing'` and `d.end.landmarkId === 'tight'`; `d.end.draft === undefined`; `d.loop === false`; `d.existingWayId === null`. Then `const built = buildWayCreationCatalog(cat, d, { start: 'Home', end: '' });` and assert: `built.landmarks.length === 2` (the pre-existing `tight` + exactly one new); `built.landmarks.some((l) => l.id === 'lm:ride-t1:start' && l.label === 'Home')`; `!built.landmarks.some((l) => l.id === 'lm:ride-t1:end')` (no end landmark minted); `built.ways[0].startLandmarkId === 'lm:ride-t1:start' && built.ways[0].endLandmarkId === 'tight'`; `built.ways[0].loopDiscriminator === undefined`; `validateCatalog(mergeCatalogs(emptyCatalog(), built)).length === 0`. Optionally assert the sanity `metresBetween({ lat: LAT0 + 0.019, lon: LON0 }, tight) - tight.radiusM < MIN_LANDMARK_RADIUS_M` so the fixture cannot silently drift out of the sliver band.

2. **`'WP-G 10: a loop from and back to an EXISTING landmark with no loop way yet builds a new loop way and mints no landmark'`** — fixture (verified): `const home = lm('home', LAT0, LON0, 150);` `const cat = catWith([home]);` `const out = northRide(6, 0.001); const fixes = [...out, ...[...out].reverse()];` (~1113 m; first and last fix both sit at `home`'s centre) `const d = draftWayCreation(cat, { ...RIDE, fixes });`. Assert on the draft: `d !== null`; `d.start.kind === 'existing' && d.start.landmarkId === 'home'`; `d.end.kind === 'existing' && d.end.landmarkId === 'home'`; `d.loop === true`; `d.existingWayId === null` (no loop way on `home` yet — this is what separates it from `WP-G 8`). Then `const built = buildWayCreationCatalog(cat, d, { start: '', end: '' });` and assert: `built.landmarks.length === cat.landmarks.length` (zero minted — the loop place already exists); `built.ways.length === 1`; `built.ways[0].startLandmarkId === 'home' && built.ways[0].endLandmarkId === 'home'`; `typeof built.ways[0].loopDiscriminator === 'string' && built.ways[0].loopDiscriminator!.length > 0`; `built.routes.length === 1 && built.routes[0].wayId === built.ways[0].id && built.routes[0].referenceRideId === 'ride-t1'`; `validateCatalog(mergeCatalogs(emptyCatalog(), built)).length === 0`.

Do NOT add the two tests the original brief described (an `end.kind === 'new'`-without-`draft` sliver test, or a both-existing-same-landmark-with-existing-loop-way test): the first is an unreachable shape and the second duplicates `WP-G 8`. If either new test's draft does not come out exactly as asserted above, that is a real finding, not a fixture problem — stop and report the actual draft JSON verbatim.

## Acceptance criteria

1. A loop ride ending at an existing landmark shows copy naming that landmark, not "one new place."
2. A loop ride ending at a genuinely new spot still shows "one new place" (unchanged behaviour for that case).
3. Both G2 test cases (`WP-G 9`, `WP-G 10`) exist in the pure section of `waycreation_suite.ts`, pass, and the suite's `test(` count goes 37 → 39. Neither duplicates existing coverage (`:82` is start-side only; `:152` is a loop on a NEW landmark; `WP-G 8` is the variant path with an existing loop way).

## Verification

```
cd app && node --experimental-strip-types tests/run.ts   # zero FAIL, plus the 2 new tests (WP-G 9, WP-G 10) passing
cd app && ./node_modules/.bin/tsc --noEmit                # exit 0
```

## Stop-on-ambiguity

If any ambiguity or surprise arises during execution, STOP and report back verbatim — never guess, never rule on it. Forward to a fresh Fable Plan pass via the coordinator.

Specifically flag: the exact wording for G1's existing-landmark copy is a coordinator suggestion, not a ratified string — if Execute is unsure whether the suggested wording fits the app's established tone, use it as a placeholder and note it in the execution report rather than agonizing over copywriting (this is cosmetic, per STATE.md's own description of the item).
