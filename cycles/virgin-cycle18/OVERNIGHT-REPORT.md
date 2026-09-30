# virgin-cycle18 execution report (2026-09-30, run in-chat, started 00:06 local)

**Result: all 6 briefs landed and inspected PASS by a fresh Opus, per group. Nothing is committed, built or published.**
Final verification (Opus, group C): `738 -> 784 tests: 781 pass, 0 fail, 3 skip` (3 = existing python-oracle skips), `tsc --noEmit` exit 0, `npx expo config --type introspect` clean, `app/android` absent.

## Per-brief status
| brief | group | status | follow-ups needed to get there |
| --- | --- | --- | --- |
| 02 gate edit keeps reference self | A (JS) | landed, inspected PASS | none |
| 04 every ride has a place in RESULTS | A (JS) | landed, inspected PASS | 04b fixer (Opus F1 medium: reference rides with no stored result invisible in RESULTS -> `timeMissingReference`; F2 low: stale in-session copy) |
| 05 no duplicate places | B (JS) | landed, inspected PASS | 05b fixer (Fable ruling: brief's merge fold direction was wrong; amended decision 6) |
| 06 post-ride places editable | B (JS) | landed, inspected PASS | 06b fixer (brief file was TRUNCATED after section 5, so 3 intended tests supplied; scored ride could end with two homes -> free-ride handlers drop the stored result; sport-scope fix; 3 small UI fixes) |
| 01 app over lock screen | C (native) | landed, inspected PASS | none (executor found its files already in the tree from an earlier dispatch; Opus re-verified all 16 files byte-for-byte against the brief) |
| 03 ride-running notification (+ flame icons) | C (native) | landed, inspected PASS | none |

## Rulings and errata (for the record)
- **Brief 04 test fixture erratum:** the brief's ridehomes settle test mixed ms and s (all rides within the 10 s free-ride tolerance); executor respaced start times 100 s apart. Fable: brief bug, not an implementation bug.
- **Brief 05 decision 6 amended (Fable):** when a re-pointed route becomes the twin of a route that already pointed at the kept place, the route that already pointed at the kept place survives and the re-pointed one folds into it. Only if both twins were re-pointed does the earlier one in catalog order survive. Nothing is lost either way (results key on way ids).
- **Brief 06 file is truncated** (no Verification / Stop conditions / Nathan's-calls sections). Tests came from 06b.
- **Brief 02 grep erratum:** its "past ghosts will be lost" check still hits RideDetailScreen (the unrelated reference-overwrite alert); left alone.
- Two `plain ride` comments remain deliberately (ResultsScreen, routeNamingCard header).

## Deferred (also in OPEN-ITEMS.md)
- A reference ride that timed on the engine-scored way (`referenceTimed === false`) is still a step-1 backfill candidate in `ui/rideHomes.ts` and the boot `initRideHistory`, so a later settle could re-store it there. Fix when next touched: exclude any user way's `referenceRideId` from step-1 candidates in both paths.
- Advisory (native): the ride-notification module picks the first foreground-service notification; if expo-audio lock-screen controls are ever used during a ride, also match the channel id ending `:qualifire-ride-tracking` (needs a rebuild).

## Readout table (Sonnet coordinator; no Digest tier needed, briefs pre-existed)
| tier | model | ~tokens | outcome |
| --- | --- | --- | --- |
| Execute 02 | Sonnet | 141k | landed |
| Execute 04 | Sonnet | 188k | landed, 2 flags |
| Plan ruling (04 flags) | Fable | 112k | both accepted |
| Inspect A | Opus | 198k | 2 findings |
| Plan ruling (A findings) + brief write | Fable | 165k | both FIX; 04b written |
| Execute 04b | Sonnet | 109k | landed |
| Re-inspect A | Opus | 131k | PASS |
| Execute 05 | Sonnet | 216k | landed, 1 flag |
| Plan ruling (05 m2) + brief write | Fable | 134k | FIX; 05b written |
| Execute 05b | Sonnet | 106k | landed |
| Execute 06 | Sonnet | 126k | landed (no tests: brief truncated) |
| Inspect B | Opus | 240k | 2 medium, 5 low |
| Plan ruling (B findings) + brief write | Fable | 186k | 6 FIX, 1 DEFER; 06b written |
| Execute 06b | Sonnet | 115k | landed |
| Re-inspect B | Opus | 157k | PASS |
| Execute 01 | Sonnet | 118k | already in tree; verified |
| Execute 03 | Sonnet | 132k | landed |
| Inspect C | Opus | 166k | PASS |

## Files changed, per group (all uncommitted on branch `virgin`)
- **A:** store/resultsStore.ts, store/routeFromRide.ts, ui/GateAdjustScreen.tsx, ui/routeNamingCard.tsx, ui/RecordScreen.tsx, ui/RideDetailScreen.tsx, ui/DemoScreen.tsx, ui/ResultsScreen.tsx, ui/RidesScreen.tsx, ui/lastRide.ts, ui/rideHomes.ts (new), App.tsx, tests (routecreation, resultsstore, ridehomes (new), run.ts).
- **B:** store/placeSearch.ts, store/catalogMerge.ts, ui/placePicker.tsx (all new), store/routeCreation.ts, ui/catalogDetailModel.ts, ui/CatalogDetailScreen.tsx, plus naming card / RecordScreen / RideDetailScreen / routeFromRide edits; tests placesearch, catalogmerge (new), catalogdetail, routecreation.
- **C:** app.json (plugin), plugins/withShowWhenLocked.js, modules/qualifire-lock-screen/*, modules/qualifire-ride-notification/* (+ flame PNGs), location/{lockScreen,lockScreenPolicy,rideNotification,rideNotificationPolicy}.ts, location/index.ts, tests lockscreen + ridenotification (new), run.ts.

## What Nathan must run
Nothing is committed. First `mv` the stale lock aside (it is 0 bytes, from 2026-09-29): in the repo, `mv .git/index.lock .git/index_lock_stale_$(date +%s)` (never delete). Then review the diff and commit when happy.

Order matters, because the native modules (briefs 01 + 03) move the OTA fingerprint and OTAs then stop reaching the current Preview APK:
1. **Publish the JS chain first (briefs 02, 04, 05, 06), preflight only:**
   `powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-preview.ps1" -DryRun`
   Then, if clean, the real publish. NOTE: the JS chain and the native modules are in the same working tree, so a publish from this tree will already carry the new fingerprint and never apply to the old APK. To OTA the JS chain onto the current Preview, publish from a tree without `app/modules/` and the app.json plugin line (e.g. commit the JS chain first, publish, then add the native files). Otherwise skip the OTA and do step 2 only.
2. **Rebuild the APK once (carries 01 + 03 and everything else):**
   `powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\build7.ps1"`
   (check its header for a dry-run flag first; build7 is the wrapper the fingerprint notes refer to).
Briefs 01 and 03 reach no phone until that rebuild. Nothing here is on your phone yet: the app you hold is unchanged.

Nathan's "call" decisions where each brief's default was used are listed at the end of each brief (01 full screen vs reduced lock-safe pane; 03 notification card colour; 05 merge in-brief; 02 block vs warn on an untimeable gate nudge).

---


## Brief 02 manifest

Edited (uncommitted, branch virgin): app/src/store/resultsStore.ts (clearUnmatched, isUnmatched), app/src/store/routeFromRide.ts (deriveReferenceAgainst, editWayGates precheck/re-time/outcome fields, clearUnmatched in promoteRideToReference + createRouteFromDraft), app/src/ui/GateAdjustScreen.tsx (copy, "Save & re-time", mirror retimed, unreadable-reference alert), app/tests/routecreation_suite.ts (+4 tests c18-02 1-4), app/tests/resultsstore_suite.ts (+1 test). No files created.
Tests: `743 tests: 740 pass, 0 fail, 3 skip` (3 pre-existing python-oracle SKIPs); all 5 new tests PASS.
tsc --noEmit: exit 0.
Stopped on: nothing. Notes: brief said routecreation_suite.ts WP-I 6 ends at line 1151; file has 1150 lines, appended at end of file. Verification grep for "past ghosts will be lost" still hits app/src/ui/RideDetailScreen.tsx:427 (a different alert, out of this brief's file list, left untouched). `grep clearUnmatched app/src` = 5 lines (definition, import, 3 calls).

## Brief 04 manifest

Implemented `04-every-ride-has-a-place-in-results.md` on top of brief 02's uncommitted edits (all preserved).

**Created:** `app/src/ui/rideHomes.ts`, `app/tests/ridehomes_suite.ts`.
**Edited:** `app/src/ui/routeNamingCard.tsx`, `RecordScreen.tsx`, `RideDetailScreen.tsx`, `DemoScreen.tsx`, `ResultsScreen.tsx`, `RidesScreen.tsx`, `lastRide.ts`, `app/App.tsx`, `app/src/store/routeFromRide.ts`, `app/tests/routecreation_suite.ts`, `app/tests/run.ts` (all per brief sections 1-10).

**Verification:**
- `node --experimental-strip-types tests/run.ts` -> `747 tests: 744 pass, 0 fail, 3 skip`
- `./node_modules/.bin/tsc --noEmit` -> exit 0
- `grep "<RouteNamingCard" app/src` -> 4 hits, 4 `onSaveFree=` lines. `backfillMissingResults(` not in RidesScreen. `timeReferenceAt` = def + createRouteFromDraft + saveAdjustedGates + editWayGates.

**Deviations / flags:**
1. Test fixture fix (ridehomes settle test): the brief's fixture put every ride's startMs within 10 s of the free record at 5000, so `freeRideNear` (10 s tolerance) treated all as free and nothing was filed. Spaced the startMs 100 s apart (100000, 200000, 300000, 400000, 500000, 600000, endMs +1000/+900/+500) and adjusted the matching literals (`startedAtMs === 400000`, `freeRideNear` probes, makeResult startedAtMs). Assertion logic unchanged.
2. Added `await sportStore.initSportStore(fs);` before `initCatalogStore` in that test (brief allowed it). It turned out not to be the cause of the failure, but is harmless.
3. STOP-CONDITION FLAG: `grep initRideHistory(` finds a caller outside App.tsx/tests: `app/src/ui/settings.tsx:317` (`await initRideHistory(fs);` in the data-reset flow, right after storage was moved aside, then `initFreeRidePersistence`). It relies on the new default `skipBackfill = () => false`, compiles and behaves as before; on a fresh store there are no free records anyway. Not edited (not in the brief's file list). Nathan/Plan should confirm this is acceptable.
4. `grep "plain ride" app/src` has 2 hits, both comments (ResultsScreen.tsx:47, routeNamingCard.tsx:18 header text); no UI copy remains. Brief expected zero hits.
5. Background processes are killed between device_bash calls, so tests/tsc were run in the foreground (tsc ~32 s, tests ~8 s).

Nothing committed, built or published. Nothing stopped on.

## Group A inspection (briefs 02 + 04)

Inspector: fresh-context Opus, 2026-09-30. All checks rerun independently on the uncommitted working tree (branch virgin).

**Verdict: PASS with one medium finding (needs a Plan ruling before this can be called "every ride has a home") and one low finding.**

Checks rerun:
- `node --experimental-strip-types tests/run.ts` -> `747 tests: 744 pass, 0 fail, 3 skip` (the 3 SKIPs are the pre-existing python-oracle ones). 7.3 s.
- `./node_modules/.bin/tsc --noEmit` -> exit 0 (33 s).
- `git status`: 14 modified + 2 new (rideHomes.ts, ridehomes_suite.ts) = exactly the union of both briefs' file lists. No stray files.
- Greps: `clearUnmatched(` -> 3 store calls (promote/create/edit) + RideDetail onUnsaveFree (04 decision 7). `timeReferenceAt(` -> create/saveAdjustedGates/editWayGates. `backfillMissingResults(` -> routeFromRide x2, lastRide boot, rideHomes; not RidesScreen. `<RouteNamingCard` -> 4 sites, each with `onSaveFree=`. `saveAdjustedGates(` -> RecordScreen + RideDetailScreen (+ WP-H 18). "Save & reset" / "history will be reset" -> none. "plain ride" -> the 2 ruled-intentional comments only.
- Diff read in full against every numbered edit of both briefs (02: 1A, 2A-2H, 3A-3D, tests; 04: 1A-1D, 2A-2G, 3A-3F, 4A, 5A-5E, 6-9, 10). All present and verbatim; 04's overwrites of 02's createRouteFromDraft block and `saveResult(refNext)` line are correct; the one `const version` in editWayGates is correct.
- Tests fail without the change (reasoned): c18-02 1/3 need `referenceRideId`/`referenceRetimed` and the marker clear; c18-02 2 needs the precheck refusal; c18-02 4 and resultsstore c18-02 need `clearUnmatched`/`isUnmatched`; WP-H 17/18 + c18-04 need the derive-at-creation / v2 re-time; ridehomes suite imports a module that did not exist.
- Ridehomes settle fixture (ruled erratum b): with rides 100 s apart and the 10 s `freeRideNear` tolerance the assertions still discriminate — r-route/r-ref/r-rec are checked NOT filed by their own startMs, and exactly `r-orphan,r-legacy` are filed with their own startMs/duration/sport; idempotency and persistence asserted. Meaningful.
- Race check: the tab bar is hidden during RECORD's 'ending' phase (`isFullscreen` includes 'ending'; App.tsx:190), and tabs mount-swap, so RIDES/RESULTS' settle cannot run while the naming card is up. `markRideFree` is idempotent per rideId.

Findings:

1. **MEDIUM — rideHomes.ts `settleRideHomes` step 2 (`isReference` predicate, ~line 83): a way's reference with NO stored result counts as "homed", but RESULTS can't show it.** `buildResultsRoutes` lists only ways that have stored results (resultsListModel.ts:141-176, "route not ridden at all" -> dropped). Existing ways whose reference is stuck behind an `unmatched` marker (brief 02 Path A — Nathan's Home -> Work way and any way created from a RIDES-visited ride before this build) stay invisible: step 1's backfill skips the marker, step 2 exempts it as a reference. So Nathan's "RESULTS should contain from the start the reference rides" is met only for NEW ways, or after he does an EDIT GATES save by hand (brief 02's recovery step). Evidence: a way with `referenceRideId` set, `getStoredResult(ref) === null`, a marker at BACKFILL_ENGINE_VERSION -> `settleRideHomes` returns `[]` and RESULTS has no route. **Fix (needs a Plan ruling; it widens 04's file list):** add `export async function timeMissingReference(wayId, fs)` to routeFromRide.ts: when the way has a `referenceRideId` and `getStoredResult(ref)` is null → `clearUnmatched(ref)`, then `timeReferenceAt(ref, wayId, userRefFor(way.refLineId), gateSetFor(userCatalog(), wayId, way.gateSetVersion).chainageM, way.gateSetVersion, fs)` and `saveResult` it if non-null (skip when there's no ref line or gate set). Call it for every catalog way in `settleRideHomes` between step 1 and step 2. Add a ridehomes test: a marked reference with a recording ends up with a result on its way after one settle.

2. **LOW — RecordScreen.tsx onAdjustSave (~l.836) and RideDetailScreen.tsx onAdjustSave (~l.332): stale in-session dot when the v2 re-time fails.** When `saveAdjustedGates` returns `referenceRetimed:false`, it has removed the stored v1 result (routeFromRide.ts ~l.310). But the v1 result that onNamingSave / RideDetail's creation mirrored into `lastRide.recorded` with `replaceRecorded` stays there, so the next ride in the same session races a dot timed at the v1 chainages. This only happens when derive disowns the way at v2 (a missed sector and no lap bounds), which is rare. **Fix:** in both callers, `if (refRide) replaceRecorded(refRide); else dropRecorded(<refRideId>);` (RecordScreen already imports `dropRecorded`; RideDetailScreen imports it from lastRide too, so check that before adding).

Info only, no action needed:
- RideDetailScreen.tsx:439 (the PROMOTE alert, "This way will be overwritten and past ghosts will be lost") is pre-existing HEAD copy in a file brief 02 did not list. So brief 02's own verification grep (`past ghosts will be lost` → "no hits") gets 1 hit. That is a brief erratum, not an executor miss. The copy still fits the promote flow well enough, so leave it unless Plan wants it reworded.
- After an EDIT GATES save, a non-reference ride that no longer times picks up the marker (pre-existing behaviour). The next RIDES/RESULTS visit now files it as a FREE ride; before this build it was RIDES-only. It can be recovered with "Not a free ride", which clears the marker, once the gates are fixed. This follows decision 4 ("no other home").
- "Not a free ride" on a legacy `mode:'free'` ride is undone by the next settle (legacy free rides are excluded from backfill and re-filed). This follows decision 5.
- "not <way>?" → ADD WAY on a locked ride now moves its stored result from the matched way to the new way (createRouteFromDraft's `saveResult` overwrites the result by rideId). That is consistent with what the rider meant ("not that way").

## Brief 04b fixer manifest
- Files edited: app/src/store/routeFromRide.ts (timeMissingReference added), app/src/ui/rideHomes.ts (import, header 1b, call between step 1 and 2), app/src/ui/RecordScreen.tsx (dropRecorded else-branch), app/src/ui/RideDetailScreen.tsx (same), app/tests/routecreation_suite.ts (E1 imports + new c18-04 follow-up test appended).
- Tests before: 747 tests / 744 pass / 0 fail / 3 skip (per brief). After: "748 tests: 745 pass, 0 fail, 3 skip".
- tsc --noEmit exit code: 0.
- grep timeMissingReference: definition routeFromRide.ts:408; call rideHomes.ts:88 (plus import/comment).
- Deviations: none. Anchors all matched. Stopped on nothing.

## Group A re-inspection (after 04b fixer)

Fresh-context Opus inspector, 2026-09-30. **Verdict: PASS.** No findings.

- Tests rerun: `748 tests: 745 pass, 0 fail, 3 skip`. `tsc --noEmit` exit 0.
- 04b edits confirmed against the brief text (checked programmatically): `timeMissingReference` in store/routeFromRide.ts matches the brief verbatim; rideHomes.ts has the import, the 1b header and the call between the backfill (step 1) and `currentCatalog().ways`/`orphanRides` (step 2), at rideHomes.ts:88; `else dropRecorded(refRideId)` is at RecordScreen.tsx onAdjustSave and `else dropRecorded(request.rideId)` is at RideDetailScreen.tsx onAdjustSave; the new test matches the brief verbatim and is the last test in routecreation_suite.ts.
- The new test fails without the helper. The marker makes the backfill skip `oldref1`, and `orphanRides` excludes it as a reference. So without 1b, `getStoredResult('oldref1')` stays null and the assertion fails. The test also calls `timeMissingReference` directly.
- Regressions checked, none found:
  - No repeated writes. After one success, the stored result short-circuits the call. A null derive writes nothing. Two settles running at once (RIDES + RESULTS) would at most write the same result twice.
  - No result lands on the wrong way. `timeReferenceAt` only returns a result whose `wayId` is the way's own.
  - The marker is cleared only after `saveResult`.
  - The helper uses `way.gateSetVersion`, which `addGateSet` bumps. After a failed v2 re-time it therefore derives at v2, never at the stale v1.
  - editWayGates, promoteRideToReference and createRouteFromDraft were not changed by 04b. After a promote whose new reference lap is `missed`, the next settle now gives that reference a home (intended).
  - routeNamingCard.tsx (mtime 22:21) and routeCreation.ts (21:45) are older than the 04b brief (22:51). No place-picker file exists. Only the 5 files named in the brief carry the 22:53 fixer mtime.
- Previously reviewed points still hold: all 4 `<RouteNamingCard` sites pass `onSaveFree`, and "plain ride" appears only in 2 comments (routeNamingCard.tsx:18, ResultsScreen.tsx:47).
- Note, not a finding: a way whose reference recording is unreadable, or which derive disowns, has its JSONL re-read on every RIDES/RESULTS mount, with no write. This is a small cost and only affects edge cases.

## Brief 05 manifest

Executor: Sonnet, brief `05-no-duplicate-places.md`. Uncommitted, nothing built or published.

**Created:** `app/src/store/placeSearch.ts`, `app/src/store/catalogMerge.ts`, `app/src/ui/placePicker.tsx`, `app/tests/placesearch_suite.ts` (4 tests), `app/tests/catalogmerge_suite.ts` (8 tests incl. setup m0).
**Edited:** `app/src/store/routeCreation.ts` (existingRouteFor, EndpointChoice(s), PROPOSED, applyEndpointChoices, newPlaceLabelErrors), `app/src/store/routeFromRide.ts` (taken-name refusal at top of createRouteFromDraft), `app/src/ui/routeNamingCard.tsx`, `app/src/ui/RecordScreen.tsx`, `app/src/ui/RideDetailScreen.tsx`, `app/src/ui/catalogDetailModel.ts`, `app/src/ui/CatalogDetailScreen.tsx`, `app/tests/routecreation_suite.ts` (rc1-rc5), `app/tests/catalogdetail_suite.ts` (place A assertion, cd1, cd2), `app/tests/run.ts`. DemoScreen.tsx not touched. 02/04/04b edits preserved.

**Tests:** `767 tests: 764 pass, 0 fail, 3 skip` (baseline 748/745/0/3, +19 new). **tsc --noEmit:** exit 0.

**Deviations / flags:**
1. BRIEF vs CODE CONFLICT (test m2 only, product code is verbatim from the brief): the brief's m2 expects `folded = [{droppedRouteId:'r2', intoRouteId:'r3', movedWayIds:['w2']}]`, routes `['r1','r3','r4']`, `r3.wayIds ['w3','w2']`. The brief's own `mergeLandmarks` code (and decision 6, "the later one's ways move to the earlier one") in a catalog ordered r1,r2,r3,r4 makes r2 (work2->store, re-pointed) the EARLIER route, so r3 folds INTO r2: `folded=[{droppedRouteId:'r3', intoRouteId:'r2', movedWayIds:['w3']}]`, routes `['r1','r2','r4']`, `r2.wayIds ['w2','w3']`. I wrote m2 to assert the code's behaviour (consistent with decision 6) and did NOT change the code. NEEDS A PLAN-TIER RULING: is "later into earlier" right (test wrong), or should the surviving route be the one that was NOT re-pointed (code wrong, would fold r2 into r3)? m4's expectation (error mentions w3 and w2) holds either way.
2. Precondition grep `grep -n "plain ride" app/src` was not empty: 2 hits, both comments written by brief 04 (routeNamingCard.tsx:18 header, ResultsScreen.tsx:47). No code affected; treated as satisfied.
3. Anchors shifted by 04 but matched by content (all unambiguous): routeNamingCard imports/props/state/JSX/styles, RecordScreen onNamingSave/card mount, RideDetailScreen onNamingSave/card mount. RideDetail: `offer.existingRouteId` replaced only inside onNamingSave (the two uses at the offerRoute/offerLabel lines outside it intentionally kept).
4. Test placement: rc1-rc4 inserted before the WP-H section comment block (after WP-G 10); rc5 before `WP-H 18`; place-A assertion added to the "place A — one touching way" test.
5. catalogdetail cd2 uses `{ ...DEPS, catalog: only, seed: { ...SEED, landmarks: [] } }` (one user landmark, no routes).
6. Verification greps: 4 `<RouteNamingCard` mounts; applyEndpointChoices in routeCreation/RecordScreen/RideDetailScreen; newPlaceLabelErrors in routeCreation/routeFromRide; PlacePicker in placePicker/routeNamingCard/CatalogDetailScreen. `git diff --stat` full listing not re-run beyond DemoScreen check (still shows only 04's earlier modification, none from 05).
7. Environment: first attempt to write all tests in one call failed with `spawn E2BIG` (nothing applied); redone in smaller calls.

No stops.

## Brief 05b fixer manifest
- Ruling applied: yes (survivor = route that already pointed at keepId; both re-pointed -> earlier survives).
- Files edited: app/src/store/catalogMerge.ts (doc comment + fold loop), app/tests/catalogmerge_suite.ts (m2 rewritten, m8 appended).
- Tests: `768 tests: 765 pass, 0 fail, 3 skip`
- tsc --noEmit: exit 0
- Deviations: none in content. Brief's line numbers for the test file were off by ~2 (m2 end); anchored by content (m2 start .. m3 start) instead. m8 fixture validated.
- Stopped on: nothing.

## Brief 06 manifest
- Edited: app/src/store/placeSearch.ts (endpointOptions, effectiveEndpointId), app/src/store/routeFromRide.ts (one-home stale-result belt), app/src/ui/routeNamingCard.tsx (props, change link + PlacePicker per proposed-existing end, loop derived from effective pair, header), app/src/ui/RecordScreen.tsx (ridePickRef, capture in onStart, dropRecorded else-branch, card id props), app/src/ui/RideDetailScreen.tsx (dropRecorded else-branch, card id props).
- Created: none.
- Tests: 768 tests: 765 pass, 0 fail, 3 skip. tsc --noEmit exit 0.
- Deviations: all anchors matched by content (line numbers shifted; routeFromRide import is multi-line, already had getStoredResult/removeStoredResult). The brief contains no test-edit section although it lists placesearch_suite.ts / routecreation_suite.ts and mentions "tests in section 4"; NO tests were added (no specified content, not guessed). Header line 12 ("endpoints render as fixed text" in the WP-G variant description) left untouched (not covered by brief).
- Stopped on: nothing.

## Group B inspection (briefs 05 + 06)

Fresh-context Opus inspector, 2026-09-30. **Verdict: PASS for 05 + 05b. 06 is implemented as written, but the brief file is truncated and its tests are missing (finding 1). One medium interaction needs a Plan ruling (finding 2). There are 5 LOW findings.**

Checks rerun:
- `node --experimental-strip-types tests/run.ts` -> `768 tests: 765 pass, 0 fail, 3 skip`. `./node_modules/.bin/tsc --noEmit` -> exit 0 (21 s).
- git status: 18 modified files and 7 new app files. That is the union of the A and B file lists. No stray files, and nothing is committed.
- Every numbered edit was read against the diff:
  - 05: §1 to §11, 3A to 3C, 4A/4B, 6A to 6H, 7A to 7C, 8A to 8C, 9A/9B, 10A to 10D. All tests are present (ps1 to ps4, m0 to m8, rc1 to rc5, cd1/cd2, and the place-A assertion).
  - 05b: the fold loop and doc comment match verbatim. m2 matches the amended decision 6, and m8 was added.
  - 06: §1, §2, 3A to 3H, 4A to 4D, 5A/5B. `props.loop` appears only in the `loop` definition.
- 05 tests would fail without the change: they import modules that did not exist before. m2 fails on the pre-05b code, which made r2 survive. rc5 fails without the store belt.
- Scratch checks, all run outside the repo:
  - `endpointOptions` and `effectiveEndpointId` behave as specified.
  - `applyEndpointChoices` handles existing->existing: S->W with the end changed to H gives variant SH, and matchedWayId is carried. For X->X with the start changed to Y, it gives Y->X with loop=false and no route.
  - The card's derived `loop` agrees with `applyEndpointChoices` for every choice combination reachable from the UI.
  - A 3-route merge chain (A and B re-pointed, C untouched, same key) folds everything into C: wa/wb/wc end up on C, and the catalog validates.
- Nathan's scenario works: ROUTES > the twin "Work" > Merge. The pills show coordinates for shared labels. Routes are re-pointed, twins fold into the route already on the kept place, work2->work1 becomes a loop with a discriminator, and every way id, gate set, ref line and result survives. The label is born at only one point (`buildRouteCreationCatalog`, via `createRouteFromDraft`), which the store belt guards. RecordScreen is mount-swapped (App.tsx:228), so its from/to state cannot hold a merged-away id. No persisted state is keyed by landmark id except the sidecar pick log (decision 7).
- The 06 one-home belt is correct: it only drops a result whose `wayId` differs from the new way, and only when the ride could not be timed. Both callers mirror it with `dropRecorded`, which is a no-op when the ride is absent.
- RouteNamingCard mounts: RecordScreen and RideDetailScreen get places, routeForPair and the proposed ids (RecordScreen also gets the picked ids). The two DemoScreen mounts get none, by design in both briefs.

Findings:

1. **MEDIUM — brief 06 is truncated, and the tests it intends are missing.** The file ends after §5, with no Verification, Stop conditions or tests section. Its own text references things that are not there: "this brief adds the existing-endpoint cases (§4)", "store/routeCreation.ts … this brief only adds tests for it", placesearch_suite.ts and routecreation_suite.ts in the touch list, and "Nathan's call 2/3". So tests were required, and the executor was right not to invent them. Add these three tests. I validated them in a scratch copy: all pass (771/768/0/3), and rc7 FAILS when the §2 belt is removed.
   - `placesearch_suite.ts`: add `endpointOptions, effectiveEndpointId` to the placeSearch import, and append:
     ```ts
     test('c18-06 ps5: endpointOptions puts the START pick first (copy, not the input); effectiveEndpointId = proposal until touched', () => {
       const o = (id: string) => ({ id, label: id, detail: '', usage: 0 });
       const opts = [o('a'), o('b'), o('c')];
       const same = endpointOptions(opts, null);
       assert(same.map((x) => x.id).join(',') === 'a,b,c' && same !== opts, 'null pick: same order, new array');
       assert(endpointOptions(opts, 'c').map((x) => x.id).join(',') === 'c,a,b', 'pick moved first');
       assert(endpointOptions(opts, 'zz').map((x) => x.id).join(',') === 'a,b,c', 'unknown pick ignored');
       assert(opts.map((x) => x.id).join(',') === 'a,b,c', 'input not mutated');
       assert(effectiveEndpointId('a', { kind: 'proposed' }) === 'a', 'proposal until touched');
       assert(effectiveEndpointId('a', { kind: 'existing', landmarkId: 'b' }) === 'b', 'a touch wins');
       assert(effectiveEndpointId(null, { kind: 'proposed' }) === null, 'new, unnamed place');
     });
     ```
   - `routecreation_suite.ts`: append at the end of the file (it uses the WP-H helpers):
     ```ts
     test('c18-06 rc6: applyEndpointChoices — existing → existing re-point: pair flips variant, loop breaks, matchedWayId carried', () => {
       const cat = { routes: [
         { id: 'SH', startLandmarkId: 'S', endLandmarkId: 'H', wayIds: ['wSH'] },
         { id: 'XX', startLandmarkId: 'X', endLandmarkId: 'X', loopDiscriminator: 'loop:x', wayIds: ['wXX'] },
       ] } as unknown as Catalog;
       const d = {
         rideId: 'r6', startedAtMs: 0, trackLengthM: 1000, sportId: null, matchedWayId: 'wM',
         start: { kind: 'existing', landmarkId: 'S' }, end: { kind: 'existing', landmarkId: 'W' },
         loop: false, existingRouteId: null,
       } as unknown as RouteCreationDraft;
       const a = applyEndpointChoices(cat, d, { start: { kind: 'proposed' }, end: { kind: 'existing', landmarkId: 'H' } });
       assert(a.start.landmarkId === 'S' && a.end.landmarkId === 'H', 'end re-pointed S → H');
       assert(a.loop === false && a.existingRouteId === 'SH', `onto a pair with a route → variant, got ${a.existingRouteId}`);
       assert(a.matchedWayId === 'wM', 'matchedWayId is a fact about the ride — carried');
       const dl = { ...d, start: { kind: 'existing', landmarkId: 'X' }, end: { kind: 'existing', landmarkId: 'X' }, loop: true, existingRouteId: 'XX' } as unknown as RouteCreationDraft;
       const b = applyEndpointChoices(cat, dl, { start: { kind: 'existing', landmarkId: 'Y' }, end: { kind: 'proposed' } });
       assert(b.start.landmarkId === 'Y' && b.end.landmarkId === 'X' && b.loop === false && b.existingRouteId === null,
         `existing loop X→X with start → Y becomes Y→X, no route: ${JSON.stringify(b)}`);
     });

     test('c18-06 rc7 (createRouteFromDraft): an untimeable founding ride drops its stale result on another way — one home', async () => {
       const { fs } = await wphSetup();
       await wphWriteRideFile(fs, 'onehome1', wphFixes(200, 0.0002, 1_700_600_000));
       const d = await wphRouteFromRide.draftRouteFromRide('onehome1', 1_700_600_000_000, null, fs);
       const first = await wphRouteFromRide.createRouteFromDraft(d!, { start: '', end: 'Far' }, fs);
       assert(first.ok && first.referenceTimed === true, `precondition: a timed route, got ${JSON.stringify(first)}`);
       const own = wphResultsStore.getStoredResult('onehome1');
       assert(own !== null, 'precondition: founding result stored');
       // 'stale1' holds a result on way:onehome1 but has NO recording -> referenceTimed false on its own new way
       await wphResultsStore.saveResult({ ...own!, rideId: 'stale1' });
       assert(wphResultsStore.getStoredResult('stale1')?.wayId === 'way:onehome1', 'precondition: stale result on another way');
       const d2 = await wphRouteFromRide.draftRouteFromRide('onehome1', 1_700_600_000_000, null, fs);
       const out = await wphRouteFromRide.createRouteFromDraft({ ...d2!, rideId: 'stale1' }, { start: '', end: '', specs: ['Alt'] }, fs);
       assert(out.ok && out.referenceTimed === false, `untimed creation, got ${JSON.stringify(out)}`);
       assert(wphResultsStore.getStoredResult('stale1') === null, 'the stale result on way:onehome1 must be dropped (brief 06 decision 6)');
       assert(wphResultsStore.getStoredResult('onehome1')?.wayId === 'way:onehome1', 'other rides untouched');
     });
     ```
   The coordinator should also note in the brief or README that 06 was truncated. Its "Nathan's call" and JS-only sections are also missing.

2. **MEDIUM (needs a Plan ruling) — a scored ride can end up with two homes through SAVE AS FREE RIDE; 06 makes this newly reachable from the quiet `not <way>?` card.** Scenario: the ride is scored as X and the rider taps `not X?`. The card opens as the variant (existingRoute + matchedWayLabel, so the `keep it as X` exit shows). The rider then changes an endpoint (06) onto a pair with no route. `existingRoute` becomes null, so routeNamingCard.tsx:376-390 swaps in SAVE AS FREE RIDE. `onNamingFree` (RecordScreen.tsx:775-780) or `onSaveFree` (RideDetailScreen.tsx:308) then calls `markRideFree`, but the stored result on X is kept. The ride is now in RESULTS as X and also listed as a free ride. This contradicts 06 decision 6 ("never both"). The same state already existed from brief 04's WP-F card (matchedWayLabel with no route), which Group A accepted as ruled. Fix, pick one:
   - (a) routeNamingCard.tsx:376: change the condition `existingRoute && props.matchedWayLabel` to `props.matchedWayLabel`, so a scored ride always gets `keep it as <way>` and never SAVE AS FREE RIDE.
   - (b) in both free handlers: `const r = getStoredResult(id); if (r) { await removeStoredResult(id); dropRecorded(id); }` before `markRideFree`.

3. **LOW — sport scope mismatch when applying choices.** The draft is scoped to the RIDE's sport (`draftRouteFromRide` -> `scopeCatalog(currentCatalog(), sportId, …)`, routeFromRide.ts:172). But `applyEndpointChoices` and `routeForPair` use `activeCatalog()`, i.e. the GLOBAL active sport: RecordScreen.tsx:788 and :1314, RideDetailScreen.tsx:275 and the routeForPair at ~:672. Scenario: on RideDetail, a ride from sport B viewed while sport A is active, with an endpoint changed. The variant check then looks at A's routes. It can add a way to another sport's route, or miss B's route and mint a twin. This only matters with 2+ sports and a choice made (both-proposed is identity). It is a brief-05 erratum (verbatim). Fix: in all four places pass `scopeCatalog(currentCatalog(), X.sportId, currentSports())` (X = drafted/naming/offer) instead of `activeCatalog()`.

4. **LOW — the next settle can undo 06's belt.** After the belt drops the stale X result, `clearUnmatched` has already run, and `backfillCandidates` (rideHomes.ts:48) includes reference rides. So the next RIDES/RESULTS mount re-derives the ride against every way and can store it back on X. This only happens when the ride's own-way derive fails but X's accepts, which is rare. Fix (Plan to rule): in `settleRideHomes` step 1, drop rides that are some way's `referenceRideId` from the backfill candidates. Step 1b (`timeMissingReference`) already times references on their own way.

5. **LOW — the loop copy uses the drafted label, not the effective one.** routeNamingCard.tsx:191-193 reads `props.startExistingLabel`. Two wrong cases once `loop` comes from choices:
   - Draft X->Y with the start changed to Y (Y->Y) reads "looped from and back to X".
   - A typeahead start pick Z with the end proposed as Z reads "one new place".
   Fix: `startLabel !== null ? \`This ride looped from and back to ${startLabel}.\` : 'This ride looped from and back to one new place.'`

6. **LOW — an end choice can get stuck.** When a choice turns the pair into a loop (the end picked equals the effective start), `{!loop && (` (line 255) hides ENDED AT, including its `change` link. The end can only be reverted by changing the start first. Fix: `const hideEnd = props.loop && (bothProposed || startProposedId === null);` and render ENDED AT with `{!hideEnd && (`. needEnd can keep `!loop`.

7. **LOW — the merge/rename UI state carries over to the kept place.** CatalogDetailScreen.tsx:109 `<PlaceBody` has no key. After a merge, `tabNav.openCatalog({kind:'place', id: keepId})` reuses the instance, so the kept place's page opens with its own "Merge into…" picker already expanded (and a stale `renameText` if a rename was open). A tap still goes through the confirm Alert. Fix: `<PlaceBody key={request.id} …`.

Info (no action):
- When a merge chains folds, `folded` can name an `intoRouteId` that was itself folded later. Verified: [{B->A},{A->C}]. The catalog is correct, and the dialog's count of routes folded is right.
- `normLabel` handles trim and case only, per decision 1. "Café" vs "Cafe" and inner double spaces are not treated as the same name.
- routeNamingCard.tsx header line 13 ("the endpoints render as fixed text") is stale after 06. The executor flagged it; it is only a comment.
- The seed catalog is empty on virgin, so merging a user place into a seed place cannot fold into seed routes (m5 covers the keep-seed path).

## Brief 06b fixer manifest

- Files edited: app/src/ui/RecordScreen.tsx, app/src/ui/RideDetailScreen.tsx, app/src/ui/routeNamingCard.tsx, app/src/ui/CatalogDetailScreen.tsx, app/tests/placesearch_suite.ts, app/tests/routecreation_suite.ts (no others).
- §A (ps5, rc6, rc7 tests): done. §B (one home on SAVE AS FREE RIDE, both handlers): done. §C (ride-sport scoped catalog, 4 call sites + 2 findWayWithSpecs belts): done. §D (loop copy startLabel, hideEnd): done. §E (key on PlaceBody): done.
- Tests: `771 tests: 768 pass, 0 fail, 3 skip`
- tsc --noEmit: exit 0, no output.
- Grep checks: `{!loop && (` 0; hideEnd 2 hits; scopeCatalog(currentCatalog() 2 per UI file; removeStoredResult free-handler hits present.
- Deviations: none. Stopped on: nothing. Finding 4 deferred per brief (for OPEN-ITEMS, not touched).

## Group B re-inspection (after 06b fixer)

Fresh-context Opus inspector, 2026-09-30. **Verdict: PASS.** No new findings. Finding 4 stays deferred, as ruled.

Checks rerun, in the foreground:
- `node --experimental-strip-types tests/run.ts` -> `771 tests: 768 pass, 0 fail, 3 skip`.
- `./node_modules/.bin/tsc --noEmit` -> exit 0 (22 s).
- Only the six allowed files have mtimes in the 06b window (23:27–23:28). Nothing under app.json, app/plugins, app/modules, app/src/location, app.config.js or package.json was touched.

Every 06b section was read against the code:
- §A: ps5, rc6 and rc7 are present verbatim, and the import was widened. Mutation runs were done in a scratch copy outside the repo:
  - Disabling the one-home belt in routeFromRide.ts fails **rc7** only.
  - Making `endpointOptions` ignore the pick fails **ps5**.
  - Making `applyEndpointChoices` keep `draft.loop` fails **rc6** (and rc1).
  - So all three tests are meaningful.
- §B, option (b), in both handlers:
  - RecordScreen.tsx:775-791 and RideDetailScreen.tsx:311-327 run `getStoredResult` -> `removeStoredResult` + `dropRecorded` before `markRideFree`. The in-memory removal is synchronous, so the model re-read and the RESULTS view see it at once.
  - Adversarial trace of the freed ride:
    - It has exactly one home, a free record (step 2 of `orphanRides` skips it as free).
    - Its stored result is gone.
    - It is out of `recorded`, so colourModel and self-race no longer offer it as a target.
    - Settle step 1 (`backfillCandidates`) and boot `initRideHistory` both skip free rides, so nothing re-derives it.
    - Step 1b cannot re-time it: RideDetail hides the offer for a reference ride (`model.referenceOf === null`), and a just-ended ride cannot be a reference.
    - It is listed under FREE RIDES, via `freeRideResults`.
    - The only way back is "Not a free ride": `clearUnmatched` then re-matches it, as intended.
    - The endedRef rideId is the same id the result was saved under.
    - `last` in lastRide.ts still holds the ride, but it is not read by any display surface.
- §C: `scopeCatalog(currentCatalog(), <draft>.sportId, currentSports())` is used at all 4 `applyEndpointChoices` sites (RecordScreen :803/:1329, RideDetail :277/:683). Both `findWayWithSpecs` belts (:807, :279) use the same `rideCatalog`. There are no other callers. `draft.sportId` is the same sportId that `draftRouteFromRide` scoped with. The `vocabulary=`/`places=` props still use `activeCatalog()`, as the brief directs; landmarks are unscoped either way.
- §D:
  - The loop copy uses `startLabel`.
  - `hideEnd = props.loop && (bothProposed || startProposedId === null)` is in place, `{!loop && (` count is 0, and `needEnd` keeps `!loop`.
  - Traced cases:
    - X->Y with the end changed to X: ENDED AT stays visible with `change`.
    - A drafted existing loop X->X with the start changed to Y: the end X is shown, which matches rc6.
    - A new-place loop with a typeahead start pick: the end stays hidden and the copy reads the picked label.
- §E: `<PlaceBody key={request.id} …>` is in place.
- RouteNamingCard mounts: there are still 4 (RecordScreen, RideDetail, and 2 in DemoScreen, which is unchanged).

Info (no action):
- A stale `.git/index.lock` exists (0 bytes, 2026-09-29 22:53, from before 06b). The coordinator should `mv` it aside before committing (CLAUDE.md §7). The inspector left it alone.
- The free handlers enqueue the result delete (resultsStore queue) and the free-record write (freeRides queue) on separate write queues in the same tick. A process kill between the two disk writes could, in theory, leave both on disk. The RIDES/RideDetail delete paths already work this way. This is negligible and needs no action.

## Brief 01 manifest
- Finding: on arrival every brief-01 file/edit was ALREADY present in the tree (module files, plugin, lockScreen.ts, lockScreenPolicy.ts, lockscreen_suite.ts stamped 2026-09-29 23:33; app.json plugin entry; index.ts edits A-F; run.ts import at line 60). Verified by content against the brief; nothing re-applied, no anchor mismatches, nothing stopped on.
- Files created: app/plugins/withShowWhenLocked.js; app/modules/qualifire-lock-screen/{expo-module.config.json, android/build.gradle, android/src/main/AndroidManifest.xml, android/src/main/java/expo/modules/qualifirelockscreen/QualifireLockScreenModule.kt}; app/src/location/lockScreenPolicy.ts; app/src/location/lockScreen.ts; app/tests/lockscreen_suite.ts
- Files edited: app/app.json, app/src/location/index.ts, app/tests/run.ts
- Tests: 776 tests: 773 pass, 0 fail, 3 skip (baseline 771/768/0/3, +5 lockscreen tests)
- tsc --noEmit exit code: 0
- expo config --type introspect: exit 0, grep -c showWhenLocked = 1; app/android does not exist
- Deviations: none (no edits made by this executor beyond this manifest)

## Brief 03 manifest
Created: app/modules/qualifire-ride-notification/{expo-module.config.json, android/build.gradle, android/src/main/AndroidManifest.xml, android/src/main/java/expo/modules/qualifireridenotification/QualifireRideNotificationModule.kt, android/src/main/res/drawable-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/notification_icon.png, res/drawable-nodpi/qualifire_flame_large.png, res/raw/keep.xml}; app/src/location/rideNotificationPolicy.ts; app/src/location/rideNotification.ts; app/tests/ridenotification_suite.ts.
Edited: app/src/location/index.ts (edits A-E, 01's edits preserved), app/tests/run.ts (one import, after lockscreen_suite).
Tests: "784 tests: 781 pass, 0 fail, 3 skip" (baseline 776 + 8 new). tsc --noEmit exit 0.
Checks: app/android absent; app.json untouched by this brief; grep hits only in the three location files, none in src/ui; icon PNGs cmp-identical to assets-03/res (6/6); 5 notification_icon.png found; autolinking search grep -c qualifire-ride-notification = 3.
Deviations: none (files extracted programmatically from the brief; anchors matched by content, line numbers shifted by 01 only). Brief's grep -l for "notification_icon" inside PNGs is meaningless (binary content); used find instead. Nothing stopped on.

## Group C inspection (briefs 01 + 03)

Inspector: fresh-context Opus, 2026-09-30. Read-only; nothing committed, built, published or deleted. Brief 01 inspected from scratch (manifests not relied on).

**Verdict: PASS.** No findings that need a fix.

Checks rerun:
- `node --experimental-strip-types tests/run.ts`: exit 0, **784 tests: 781 pass, 0 fail, 3 skip** (the 3 skips are the existing engine python-parity fixtures). All 5 `lockscreen:` and 8 `ridenotif:` tests PASS.
- `./node_modules/.bin/tsc --noEmit`: exit 0, no output.
- `npx expo config --type introspect`: exit 0 (only the usual expo-system-ui warnings). `.MainActivity` carries `'android:showWhenLocked': 'true'` (on MainActivity only); no `turnScreenOn` anywhere; POST_NOTIFICATIONS / FOREGROUND_SERVICE(_LOCATION) are still declared.
- `app/android` does not exist, before or after introspect.
- `npx expo-modules-autolinking search --platform android`: both `qualifire-lock-screen` and `qualifire-ride-notification` are found.
- Fingerprint: `runtimeVersion.policy = "fingerprint"`, and there is no fingerprint.config.js or .fingerprintignore. So the new `app/modules/**` plus the app.json plugin entry move the native fingerprint, and an OTA published from this tree is skipped by today's Preview. This is exactly what both briefs say: a new APK via build7.ps1 is required, and one build covers both.

By-content verification (the fenced blocks in each brief were extracted by script and compared with the tree files):
- 16/16 new files are **byte-identical** to their brief blocks. Brief 01: withShowWhenLocked.js, both module config/gradle/manifest files, QualifireLockScreenModule.kt, lockScreenPolicy.ts, lockScreen.ts, lockscreen_suite.ts. Brief 03: config, gradle, manifest, QualifireRideNotificationModule.kt, keep.xml, rideNotificationPolicy.ts, rideNotification.ts, ridenotification_suite.ts.
- Flame PNGs: all 5 `notification_icon.png` densities plus `drawable-nodpi/qualifire_flame_large.png` pass `cmp` against assets-03 with no output. `notification_icon` exists only in the module's 5 copies (none elsewhere in app/ or node_modules).
- `app.json`: only change is the MapLibre trailing comma plus `"./plugins/withShowWhenLocked.js"`.
- `index.ts`: 01 edits A-F and 03 edits A-E are all present exactly once and coherent. The header has 01's bullets then 03's. The single react-native import is the union `AppState, PermissionsAndroid, Platform, Vibration`. The four imports are in 01-then-03 order. `syncShowWhenLocked` and its AppState listener sit before `listeners`. `syncShowWhenLocked();` appears exactly twice (startTracking after `session = s`, getRecoveryState before `if (!s)`), and never in stopTracking. POST_NOTIFICATIONS sits between the fg and bg location steps, with the `typeof Platform.Version` guard. There are exactly two `liveEngine.subscribe(` calls, the new one after the gate buzz, plus the `'active'` re-assert listener. The foreground-service options are untouched.
- `run.ts`: `lockscreen_suite.ts` then `ridenotification_suite.ts`, placed right before `runAll`. The other added imports belong to groups A/B.
- Native review: package lines match the `java/` paths; config class entries, class names and file names agree. `Name("QualifireLockScreen")` and `Name("QualifireRideNotification")` match the policy constants used by `requireOptionalNativeModule`. The Kotlin signatures (`Boolean`; `Double, String?`) match the JS interfaces. There is an API-27 guard for setShowWhenLocked and an API-24 guard for recoverBuilder. Gradle namespaces are distinct, gradle project names are the distinct directory names, and both manifests are empty. There is no ios/, no duplicate module name, no duplicate manifest entry, and no settings.gradle edits.
- expo-location sources (installed version 56.0.23, the SDK-aligned numbering; the brief's "19.x" is only a label) confirm every anchor the briefs cite:
  - `mServiceId = sServiceId++` (22/146)
  - channel `appId:taskName` (38)
  - `stopForeground(true)` (51)
  - `setColorized` (79)
  - the `getIdentifier("notification_icon","drawable",packageName)` fallback (133)
  - the `isForegrounded` guard (181)
  - re-post on re-register (235)

  No manifest meta-data overrides the foreground-service icon key, so the module's `notification_icon` will be picked up.
- Pure policy files contain no expo/react-native import or require. Each new suite would fail without the code: it imports the policy for real, and pins file existence, Kotlin/wrapper/index.ts text and the planner arithmetic.
- No brief-C symbols appear in `src/ui/*`, `src/store/*` or App.tsx (their diffs are groups A/B only).
- No build or publish artifacts. `app/dist` (29 Sep 07:19 UTC) predates the cycle18 briefs and is gitignored.

Notes (advisory, no action needed now):
1. Info: `QualifireRideNotificationModule.kt` finds the notification with `firstOrNull` on `FLAG_FOREGROUND_SERVICE`. The expo-audio plugin declares `AudioControlsService` (mediaPlayback foreground service), but `src/` never imports expo-audio today, so the brief's "exactly one foreground service" still holds. If lock-screen audio controls are ever used during a ride, tighten the match to `it.notification.channelId?.endsWith(":qualifire-ride-tracking") == true` as well (a native change, so it needs a rebuild).
2. A stale `.git/index.lock` (0 bytes, 2026-09-29 22:53 UTC) is still present. It was left untouched, and per the rules it should be `mv`'d aside before any commit.
