# Brief 05 — SCOPING: a gate edit keeps old activities untouched; only future rides use the new gates (virgin-cycle29)

Written 2026-10-09 by the Plan tier (Fable) from Nathan's binding answer 2 (amendment block in `03-fable-ruling.md`).
THIS IS A SCOPING BRIEF: the executor writes ONE document, `cycles/virgin-cycle29/05-scoping-gate-edit-keeps-old-activities.md`,
and changes NO app code, NO test, NO allow-list. Runs after brief 01 (so line numbers are those of the real tree), independent of
02-04; may run alongside 03 because it writes nothing under `app/`. Read `EXECUTOR-RULES.md`, `/CLAUDE.md`, `03-fable-ruling.md`
Q4b, and brief 03 (`04-brief-03-freeze-rule.md`, the `rankedAsOf(r, judged)` hook it leaves for this work).

## 0. Rules (binding)
- READ-ONLY on `app/`. Output = the one scoping document. No git/EAS/OTA. Delete nothing.
- STOP-ON-AMBIGUITY applies to FACTS: if a claim below does not match the code, write the mismatch into the document's
  "Corrections" section instead of stopping (this brief is itself the place where ambiguity is written down).
- Rider-facing text: none. Do NOT propose or draft any alert/dialog text: the gate-edit alert and its themed dialog are cycle30.
- The document must end with ONE recommendation and a cost line (files, risk, OTA/native, migration yes/no).

## 1. Today (verified 2026-10-09; the executor re-reads each anchor and quotes the line)
- `store/types.ts`: `Way.gateSetVersion` (62), `GateSet { wayId, version, chainageM, createdAtMs, origin?, note? }` (81-93),
  `RideResult.derivedBy.gateSetVersion` (133-137). Old gate-set versions are KEPT in the catalog (`addGateSet`, `catalog.ts:~186`
  bumps `Way.gateSetVersion`; `gateSetFor(c, wayId, version?)` (174-181) returns the latest or an exact version).
- `store/routeFromRide.ts` `editWayGates` (~471-554): refuses non-user ways; mints version `current+1`; refuses when the reference
  would stop timing; `saveUserCatalog(addGateSet(...))`; then `clearedRideIds = storedResultsForWay(wayId)`, `removeStoredResult`
  for each, re-times the reference at the new version, `backfillMissingResults(fs, clearedRideIds)` (re-derives every cleared
  ride against the CURRENT gate set, `resultsStore.ts:491`), returns `{ clearedRideIds, retimed, referenceRetimed }`.
  `GateAdjustScreen.tsx:72-96` mirrors into `lastRide.ts` (`dropRecorded`/`replaceRecorded`).
- `store/results.ts` `isStale(r, engineVersion, gateSetVersion)` (76-86) exists but nothing calls it (grep: only a comment in
  `migrations.ts:69`). `ranks(r)` (93-98) does not look at versions. After brief 03, `rankedAsOf(r, judged)` accepts
  `judged.gateSetVersion` and ignores it.
- Pools: `colourModel.ts` `rankedFor`/`ghostsFor`/`rankingPoolFor`/`allTimeBestLapS` (NOW, `ranks()`), `priorWindowFor`
  (frozen, `rankedAsOf`). `live/tracks.ts:36` builds the live track specs from `way.gateSetVersion` (current gates for the
  recording). `selfRaceModel.ts:257/318` caches self tracks by `${rideId}:${gateSetVersion}` and `loadSelfTracksFor(wayId, gsv,
  fs, window)` re-derives each self's gate crossings at the GIVEN version from the raw fixes (`ReplayScreen.tsx:64`).
  `resultsPlotModel.plotWindow` (trend) and `towerModel` use `ranks()` over whatever results they are handed.
- Snapshot key (brief 02/04) already includes `gateSetVersion` of the WAY (current), not of the result.

## 2. What the document must decide (write each as DECISION + REASON; no "could")
1. **Storage.** Nothing new is needed to KEEP old results: stop deleting them. `derivedBy.gateSetVersion` already says which
   gates timed a ride; `GateSet` rows of every version are already kept. Decide whether `RideResult` also needs the chainages
   copied in (recommendation: no; `gateSetFor(c, wayId, r.derivedBy.gateSetVersion)` resolves them; note the one hole: a
   catalog reset/merge that drops old gate-set rows orphans old results' sector geometry (the TIMES stay valid); check
   `catalogMerge.ts` / `catalogDelete.ts` for whether old versions can be dropped today and say so).
2. **`editWayGates` new contract.** Mint the version; re-time the REFERENCE at the new version (keep today's refusal rule and
   `timeReferenceAt` fallback); do NOT clear or re-derive any other stored result. Return shape: `{ ok, moved, gateSetVersion,
   referenceRideId, referenceRetimed }`, `clearedRideIds` always `[]`, `retimed` = `[referenceRideId]` or `[]` (keep the
   fields so `GateAdjustScreen.tsx:72-96` compiles; its `dropRecorded` loop then does nothing). The reference ride is the ONE
   ride that exists at two versions: decide how (recommendation: a second result file per version is NOT allowed by the
   `results/<rideId>.json` layout; instead the reference's result is replaced by its new-version result and its OLD-version
   verdict is lost - acceptable because the reference is 'neutral'/P1 of 1 by construction (brief 03) - OR keep the old file
   and store the re-timed reference under `results/<rideId>@v<N>.json`; weigh both, recommend ONE).
3. **Pools: "comparison across versions = none".** Add to `rankedAsOf(r, judged)` the clause
   `r.derivedBy.gateSetVersion === judged.gateSetVersion` (brief 03 left the parameter). Spell out what every surface then shows:
   - old ride's card/page: frozen, judged among same-version rides only (unchanged by the edit);
   - first ride after the edit: window = same-version rides before it = the re-timed reference only -> `tierFor` with n=1
     (purple or yellow, never green), rank "P1/2" or "P2/2"; if the reference was NOT re-timed: n=0 -> neutral, "P1/1";
   - live RECORD (`ghostsFor` -> `rankedFor`): must ALSO filter to the way's current version or a rider races ghosts timed on
     other gates; recommend `rankedFor(wayId)` gains `.filter(r => r.derivedBy.gateSetVersion === currentVersion(wayId))`
     and list every consumer that inherits it (`ghostsFor`, `rankingPoolFor`, `rankedCountFor`, `lapValues`, `sectorValues`,
     `liveTierFor`, `towerSource`, `rankingRevealModel`, `selfRaceModel.loadSelfTracks`, RecordScreen `ghostCount` 1178);
   - `allTimeBestLapS` (PB dot): same version only, or all time? Decide (recommendation: same version; an all-time best on
     different gates is not comparable);
   - trend plot (`trendPanelFor`/`plotWindow`): same version only (`storedResultsForWay(id).filter(version)`), caption count
     follows;
   - REPLAY: `priorWindowFor` inherits the clause; `loadSelfTracksFor(wayId, gsv, ...)` must use the REPLAYED ride's
     `derivedBy.gateSetVersion`, not the way's current (check `ReplayScreen.tsx:60-66` for where `gsv` comes from and say).
   - ride detail "ON THIS ROUTE" (`priorPoolFor`): inherits.
   - rides on an OLD version are never re-ranked, never re-coloured, never deleted; their sector strip and detail sectors
     still resolve geometry through their own `GateSet` row.
4. **Reference line / asset.** `wayAssetRuntime.resolveWayAsset` (113-141) builds gates from `way.gateSetVersion` (current).
   An old ride's detail map must draw ITS gates: decide how `WayMapView`/`assetFor` gets a version (recommendation: an optional
   `gateSetVersion` prop on the detail/card maps, resolved through `gateSetFor(c, id, version)`; cache key `${id}@${version}`;
   list the call sites: `RideDetailScreen.tsx` route card, `activityCard.tsx`/`buildSnapshotRequest` (snapshot key then uses
   the RESULT's version, not the way's), REPLAY, gate editor (current)).
5. **Migration.** None for data (old results already carry their version). Decide the one-off behaviour for ways edited BEFORE
   this lands: their results are all at the latest version already (they were re-derived) - nothing to do. Say so.
6. **Backfill.** `backfillMissingResults` derives a ride with no result against the CURRENT gates (`resultsStore.ts:491`).
   After this change an OLD ride that has no result (e.g. imported, or its result file lost) would be timed on NEW gates and
   enter the new-version history. Decide: derive against the gate set that was current at the ride's `startedAtMs`
   (`GateSet.createdAtMs` makes that answerable: the newest version with `createdAtMs <= ride start`) - recommend yes and
   name the helper (`gateSetAsOf(c, wayId, atMs)` in `catalog.ts`).
7. **Snapshot key interaction (brief 04).** Key field 6 becomes the RESULT's `derivedBy.gateSetVersion`; the way's current
   version drops out. A gate edit then invalidates no old picture (correct by Nathan's rule) and the reference's picture only.
8. **Rider-facing consequences to list for Nathan (facts, no text drafting):** after an edit the next ride is "ride 1 or 2" of a
   fresh history; ghost dots during that ride: the reference only; the trend plot restarts; old activities keep everything.
9. **Risks.** Two versions on one way across every pool; selfs cache correctness; `catalogMerge` dropping gate rows; the
   reference-at-two-versions choice; test surface (list the suites that pin today's delete-and-re-derive:
   `routecreation_suite.ts` editWayGates cases, `resultsstore_suite.ts`, `selfrace_suite.ts`, `replay_suite.ts`).
10. **Cost line + order.** Files, estimated size per file, OTA (yes: all JS), migration (no), test changes, and the brief split
    you recommend for cycle30+ (recommendation: 05a store+pools, 05b maps-at-version, 05c backfill-as-of; each with an
    on-device check).

## 3. Format of the output document
Sections 1-10 above as headings, each DECISION / REASON / ANCHORS; a "Corrections to this brief" section (empty if none); the
recommendation and cost line last. No code beyond one-line signatures. Under 6 KB of prose per section.

## 4. Report
`cycles/virgin-cycle29/exec-report-05.md`: the anchors re-verified (quote), anything in §1 that was wrong, and the path of the
scoping document. The inspector checks facts against the tree, not style.
