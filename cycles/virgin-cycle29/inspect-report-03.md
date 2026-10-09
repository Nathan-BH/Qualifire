# inspect-report-03 — brief 03 freeze rule (INSPECT tier, fresh-context Opus, 2026-10-10)

## Verdict: FAIL — NOT safe to ship OTA as is (JS-only, so safe once B1 is fixed; the fix is one line + one test)

The freeze mechanism itself (rankedAsOf, ignoredAtMs, store union, restart) is correct and well pinned. One regression on the
detail page's "ON THIS WAY" list makes it show a false ranking row to the rider.

## Checks rerun (by me, on the real tree)
| check | result |
|---|---|
| `node --experimental-strip-types tests/run.ts` | **1001 tests: 998 pass, 0 fail, 3 skip** (matches the exec report) |
| `tsc --noEmit` | exit 0, empty output (`safe_to_delete/insp03-tsc.log`) |
| allow-list md5 | `e69dff5cfb8fe15def0d2534466e4708` = post-brief-02 state; no entry added/edited/removed by brief 03 |
| `git diff --stat` lastRide.ts, GateAdjustScreen.tsx, ReplayScreen.tsx, migrations.ts, derive.ts, routeFromRide.ts, trendPanelModel.ts, selfRaceModel.ts, live/, modules/, app.json, app.config.js, package.json, eas.json | all empty |
| `ranks()` body | unchanged (results.ts:92-97) |
| `rankedAsOf` code readers | results.ts:103 (def), colourModel.ts:19 (import), colourModel.ts:102 (only call, in priorWindowFor). types.ts/colourModel doc mentions only |
| `storedResultsForWay` in colourModel | 2 lines (import :23, call :78). `resultsFor(` = def + calls in priorWindowFor:98 and priorPoolFor:116 |
| RidesScreen/RideDetailScreen | no `lapValues(`/`sectorValues(`/`rankingPoolFor(` call; PbDetail uses `priorPoolFor(wayId, lastRideId ?? '', startedAtMs)` |
| replay_suite 364-391 | untouched and green (the only replay_suite hunk, +importFile/fileUri at ~416, is brief 02's fsAdapter change) |
| RESULT_SCHEMA_VERSION | still 2; migrations.ts untouched; upgradeResult passes v2 records through as-is so `ignoredAtMs` survives load |
| Hunk attribution | RidesScreen.tsx: import line 25, rows lambda 172, detailFor laps/sectors 188-189 are brief 03; all other RidesScreen hunks are briefs 01/02. RideDetailScreen.tsx: all 4 hunks are brief 03 |

## Findings

### BLOCKER
**B1. `priorPoolFor` puts the judged ride into the "ON THIS WAY" list even when it cannot rank — estimated/missed/tripwire rides
show as "P1 0:00 today"; an ignored ride shows ranked while its header says "Not ranked".**
`app/src/ui/colourModel.ts:115-118` adds `own` unconditionally; `rankingPoolFor` (which it replaces at
`RideDetailScreen.tsx:84`) only took `own` from `rankedFor` (ranks()-filtered), so before this brief an unrankable ride had no
"today" row. `PbDetail` is rendered for every `kind === 'route'` ride (`RideDetailScreen.tsx:563-565`), including estimated ones.
Reproduced headless (`safe_to_delete/insp03/probe.ts`, real store + lastRide):
- own u6 `estimated` -> `buildPbDetail(priorPoolFor(w,'u6',6000))` = `[["P1","0:00",today], ["P2","8:21"], ...]` (scoredS null sorts as 0).
- own u4 ignored -> list `[P1 u1, P2 u2, P3 u3, P4 u4 today]` while `rideDetailFor` gives rankLine "Not ranked"/neutral —
  violates "A's OWN ignore applies at once to its own card" and "the P-rank line and the list agree" (brief §6 check 4).
Minimal fix: in `priorPoolFor`, `return (own && ranks(own) ? [...pool, own] : pool)...` (own ignore = NOW predicate, as Q4c rules),
plus a test: estimated own and ignored own -> pool has no own row (would fail on today's code).

### MAJOR
None.

### MINOR
- **m1. Same ride, two `beforeMs` sources.** Feed P-rank uses `result.startedAtMs` (`rideHistoryModel.ts:178`); feed colours
  (`RidesScreen.tsx:188-189`) and the detail page (`card.startMs` via `RidesScreen.tsx:239`) use the ride-index `meta.startMs`;
  ROUTES opens the detail with the result's start (`CatalogDetailScreen.tsx:164`). For live rides both are the session start and
  for backfilled rides both are the first fix, so no divergence found; only a ride/ignore stamp falling between the two values
  could split card vs detail. Suggest one source (the stored result's `startedAtMs`) in a later cleanup.
- **m2. Session-vs-store quality mismatch now visible on cards.** `lastRide.pushRecorded` forces `quality: 'clean'` and only
  rejects estimated/null-moving laps, while the stored result can be `missed` (a missed sector, `lastRide.ts:146-160`). Store
  wins in `resultsFor`, so in the same session the live ghosts counted ride A but ride B's frozen card does not. Pre-existing
  data inconsistency (post-restart NOW pools drop A too); store-wins is the more stable choice. Note only.
- **m3. Performance.** `resultsFor` copies + sorts the whole store per call (`storedResultsForWay` -> `storedResults()`), and
  every card calls it 1 (P-rank) + 1 (lap tier) + one per sector. Measured on the PC: 100 cards x 6 calls with 400 stored results
  = 21.7 ms; a phone is maybe 5-10x slower (~100-200 ms) on each `resultsTick`/`rides` change (memoised: `RidesScreen.tsx:178,195`,
  not per scroll render). `PbDetail` recomputes on every RideDetailScreen render, calling `resultsFor` twice (priorPoolFor + inside
  priorWindowFor). Acceptable now; if the feed stutters after an ignore toggle, cache `resultsFor(wayId)` per tick.
- **m4. Test gaps.** No test for priorPoolFor with an unrankable own (would have caught B1). The "count again" live_colour test
  is non-vacuous for `rankedCountFor 11/12` (11 needs `replaceRecorded` to drop u3, 12 needs it re-added — reverting either
  call fails it), but its frozen-window asserts pass via `recorded` alone, i.e. they do not exercise the store path; the
  setIgnoredFromRanking-drops-both case is covered in resultsstore_suite instead. The hydration test is solid.
- **m5. Doc drift.** `MIN_HISTORY` comment (`colourModel.ts:49-50`) "the reference ride stays neutral / P1 of 1 for good" is only
  true when the reference is the way's first ride (a later ride promoted to reference has a non-empty window).

### Out of scope, for Nathan's attention (not brief 03 defects)
- Gate edit (`routeFromRide.ts:536` path) deletes and re-derives every result; re-derived results carry neither
  `ignoredFromRanking` nor `ignoredAtMs` (no reader in routeFromRide.ts) — the ignore and the freeze are both lost on a gate
  edit. Pre-existing; belongs to brief 05.
- Deleting a ride (`removeStoredResult` + `dropRecorded`) removes it from frozen pools too, so cards ridden after it change.
  Product rule is silent on delete.
- Ties: list sort (`buildPbDetail`, stable by start) can place a tied own ride one slot below `positionAmong`'s shared position.
  Pre-existing, same as with rankingPoolFor.

## Substance verified (no defect)
1. Window: strictly `startedAtMs < beforeMs`, own excluded by id, `slice(-WINDOW_PREV)` (9) after filtering, ascending; ride 1
   -> [] -> tierFor neutral (MIN_HISTORY 1). Orderings: ignored before B (stamp <= B.start) -> out; after B -> in; never -> in;
   count again -> both fields dropped (resultsStore.ts:272-273), back everywhere; re-ignore -> new stamp (last wins, accepted);
   legacy ignore without stamp -> out for every judged; estimated/missed/tripwire -> out exactly as ranks().
2. resultsFor union: Map keyed by rideId, store inserted last (wins). No double count: production `recorded` entries carry the
   same real rideId as the store (`rememberRide` meta path); `session:` ids exist only without meta and never reach the store.
   The judged ride is excluded by id. Readers: resultsFor -> priorWindowFor/priorPoolFor only; priorWindowFor -> ReplayScreen:64,
   priorLapValues, priorSectorValues, priorPoolFor; NOW readers (rankedFor, ghostsFor, rankingPoolFor, lapValues, sectorValues,
   rankedCountFor, ownLapBarredFromRanking, allTimeBestLapS, liveTierFor, towerSource, selfRaceModel, RecordScreen,
   trendPanelModel's own unrelated `resultsFor` param) are byte-identical — no leak into live ghosts/selfs/trend/results.
3. Persistence: `ignoredAtMs` written/cleared in setIgnoredFromRanking; validator rejects non-finite; initResultsStore hydrates
   every valid result with no ranks() filter (resultsStore.ts:184-190), so the freeze survives restart (pinned by the new
   hydration test, which goes through flush -> reset -> initRideHistory). Old stored results without the field load unchanged.
5. Own ignore: rideDetailModel reads the own flag (neutral tier, empty sector history, "Not ranked"); menu toggles bump
   `resultsTick` and both memos recompute. Except for B1's list row.
7. Mutate-reason: dropping `ignoredAtMs > judged.startedAtMs` fails "u6 still has u3" and the hydration "b2 still counts b1";
   dropping the store loop in resultsFor fails the same two; making the clause `>=` fails the rankedAsOf strict case.

## Cannot be verified off-device
Rendering of the detail list and cards, real feed recompute time on the phone after an ignore toggle, and the restart case on
real disk (only the memory fs adapter was exercised). Brief §6 on-device checks (1)-(5) remain for Nathan after B1 is fixed.
