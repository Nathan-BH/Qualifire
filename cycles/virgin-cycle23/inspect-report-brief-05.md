# Inspect report, brief 05 (Not ranked + no "lap" wording), virgin-cycle23

Inspector: fresh-context Opus, 2026-10-07. Read-only on app code. Logs: `run-inspect-brief05.log`, `tsc-inspect-brief05.log` (this folder). Scratch: `safe_to_delete/allow-head-b05.json` (HEAD copy of the allow-list, used for the set diff).

## Verdict: SHIP-TO-DEVICE (PASS WITH NOTES)

JS-only, display-only. No native change, no store/storage/engine/replay hunk. Safe to ship OTA (JS only): yes.

## Checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1a | Test suite | PASS | `920 tests: 917 pass, 0 fail, 3 skip` (skips = the 3 engine python-parity fixtures, unchanged); exit 0 |
| 1b | tsc --noEmit | PASS | EXIT=0, empty log. The `_tmp_scanlap.ts` stray is gone. `app/safe_to_delete/` still holds `_probe_lock_1790717431.ts` (imports `expo`, compiles today; see finding 5) |
| 2 | Brief § 6 acceptance, literally | PASS | C3: only comment hits (rankingRevealModel.ts:12, rideHistoryModel.ts:38,103,110). C4: one `~${` (rideHistoryModel.ts:237, buildSectorRows); `~` count feedModel 0, rideDetailModel 1 (doc comment :160). C5: 0 hits. C6: 8. C7: NOT_RANKED_LABEL in feedModel (export), activityCard (import + 1 use), RideDetailScreen (import + 1 use); `'Not ranked'` literal only feedModel.ts:57. C8: LAP 0 / TIME 1. C11: tower 1/1 line; RideDetailScreen +7/-5 = exactly the 5 brief edits. C12: hero 46, strip 10+24, 307/273 present |
| 2b | Deviation 1 (comment quotes) | ACCEPT | rideDetailModel.ts:68 and rideHistoryModel.ts:38 use `"no lap"` / `"no time"` in doc comments. The brief's own wording would have tripped its own `!model.includes("'no time'")` pin; meaning identical, comment only. |
| 2c | Deviation 2 (JSX indent 6 not 8) | ACCEPT | Matches the file's real indentation; pins match by content |
| 3 | Logic: one rule, two consumers | PASS | feedModel.ts:66 `ignored \|\| quality === 'estimated' \|\| quality === 'missed'`; feedModel.ts:83 `route && unrankedForDisplay(row.quality, detail.ignored)`; rideDetailModel.ts:134 `unrankedForDisplay(res.lap.quality, ignored)`. row.quality is `lap.quality` with clean->null (rideHistoryModel.ts:171) from the same result, so both agree. interrupted/clean ranked |
| 3b | Unranked card | PASS | title kept, `wayId`/`sectorColours` kept (map + colours drawn), variant stays 'route' (not free), heroLabel '' and not rendered, rankLabel null, sectors [] so the strip View renders empty at 10+24 |
| 3c | Geometry | PASS | route = 22 + 24 + 46 + (6+150) + (10+24) + 22 + 3 = 307; plain = 307 - 34 = 273. Hero row height 46 is fixed regardless of child (notRanked lineHeight 22 < 46). RidesScreen/getItemLayout not touched |
| 3d | Ranked card unchanged | PASS | Only diffs vs pre-brief-05: `qual` Text gone, `card.ignored && st.dim` gone (an ignored ride is now unranked anyway). interrupted -> normal hero + rank + strip (test feedmodel :569) |
| 4 | Ignore / Count in ranking | PASS | `ignoreToggle` line unchanged (feedModel.ts:99); RidesScreen.tsx:203-206 and RideDetailScreen.tsx:422-425 untouched; handlers bump resultsTick / tick, card and detail rebuild from the store |
| 5 | Detail page | PASS | RideDetailScreen.tsx:477-479 label vs big time, rankLine below unchanged; reason lines 'ignored in ranking' / 'GPS gap at a gate' / 'a gate was missed' (rideDetailModel.ts:74,91); tripwire 'no rank' and 'too few to rank' keep the time. Back labels (:430), menu items, Replay, entry points untouched. secTime style array byte-identical, child `sectorTimeCell(sec)`. `styles.dim` 0 uses. PbDetail fed by rankingPoolFor -> rankedFor, so an unranked ride never appears as "today" in ON THIS WAY |
| 5b | Untouched zones | PASS | `git diff --stat` on src/store, src/storage, src/live, ReplayScreen, replayModel, liveView, colourModel, RidesScreen, rideActions, activityMenu: empty. buildSectorRows unchanged (its `~`/`– did not traverse –` rows remain for replay; replay_suite pins pass) |
| 6 | Wording | PASS (brief scope) | New ui_strings_suite scan passes (0 rider strings with \blaps?\b outside preview). Manual grep of src/ui: every remaining `lap` is a comment or identifier. tower.tsx:179 `TIME`. No `~` in feedModel; the one in rideDetailModel is a comment. Remaining rider-visible lap / `~` outside the brief: findings 1-3 |
| 7 | Allow-list | PASS | Round-trips byte for byte; 455 entries before and after; sorted by (file,kind,text); 0 duplicates; no metadata change on any kept entry; header (legacyCount 32) unchanged. Set diff vs HEAD: REMOVED rideDetailModel `no lap`, `no time`, `not ranked`; rideHistoryModel `no lap`; tower `LAP`. ADDED feedModel `Not ranked` (10 ch); rideDetailModel `GPS gap at a gate` (17), `a gate was missed` (17), `ignored in ranking` (18); tower `TIME` (edited in place, same reason/since/by). Exactly the brief's § 4 table; no em dash, all <= 40 ch, no `long` |
| 8 | Parallel sessions | PASS | wayMapView.tsx hunks are all brief 04's `bleed` (already inspected); none from brief 05. tests/run.ts unmodified. waymap_suite unmodified. Cycle 25/26 work is untracked folders only |
| 9 | Pins | NOTE | recordflow `virgin-cycle20 08` kept-list (:320) and `virgin-cycle22 04` tower pin (:542-545) were edited; both edits are named in the brief (§ 3d) and assert the new strings, not weakened |

## Findings

1. MINOR (out of scope, for coordinator): rider-visible "lap" remains in a GATE alert. `app/src/store/routeFromRide.ts:377` builds `its lap comes out '${result.lap.quality}'`, surfaced by `GateAdjustScreen.tsx:75` (`Alert.alert('Could not save the gates', out.errors.join('\n'))`) together with `:514`'s em-dash text. The string scanner does not see it (store file, template literal). It also leaks the raw quality word (`estimated` / `missed`). Minimal fix (next brief): `the reference activity is not fully timed on these gates` and replace the em dash at :514 with ` · `.
2. MINOR (out of scope, per brief § 7): live `~` estimate remains on the bike: `app/src/ui/liveView.tsx:193` flashes `~m:ss` (or `– –`) at the finish for an estimated lap, and REPLAY's per-sector flashes keep `~m:ss` from `buildSectorRows` (rideHistoryModel.ts:237). Nathan's "no estimates" principle may want these too; his call.
3. MINOR (accepted by brief § 1.7 / § 10.5, flag for phone): REPLAY of an estimated/missed ride now flashes an empty string at the finish: `replayModel.ts:166` passes `lapLabel` = '' into `LiveFlash` (liveView.tsx:245-257), which replaces the clock, so the big slot goes blank for FLASH_HOLD_MS. Possible fix if it looks broken: in replayModel, `lap = allDone && r.finishMs !== null && lapLabel !== '' ? {...} : null` (no finish flash for an unranked ride). The end line reads `replay over · GPS gap at a gate` / `· a gate was missed`, which is fine.
4. NOTE: RESULTS tab still shows `NO TIME` for estimated rides (tower.tsx:53, towerModel.ts:14, resultsListModel.ts:205) and `TODAY · unranked` (tower.tsx:181). Explicitly out of scope (cycle 25 files); listed so Nathan can judge consistency with "Not ranked".
5. MINOR (hygiene): `app/safe_to_delete/_probe_lock_1790717431.ts` sits inside tsc's scope again (another session's probe). It compiles today, but the same pattern broke tsc for the executor. Move it to the repo-root `safe_to_delete/` or exclude `safe_to_delete` in app/tsconfig.json.
6. NOTE: the recordflow source pin `!model.includes("'no lap'")` only rejects single-quoted forms; a future double-quoted literal would slip past it. The ui_strings_suite lap scan (ui_strings_suite.ts:238) is the real guard and it covers that. No action.
7. NOTE: `FeedCardModel.heroTier` is still computed for an unranked card but unused there; harmless.

No BLOCKER, no MAJOR.

## On the phone (checklist)

- An estimated or missed activity in ACTIVITIES: title and date, dim "Not ranked" where the time was, the map in sector colours, an empty row under the map. No time, no P-rank, no "~", no quality word.
- The card height looks the same as the others; scroll down, open one, go BACK: you land on the same card (scroll offsets exact).
- An ignored activity looks the same; its ⋯ menu says "Count in ranking", and tapping it brings back the time, rank and sector strip.
- An interrupted activity looks like any ordinary ranked card (time, rank, sector strip); the word "interrupted" appears nowhere.
- Open an unranked activity: "Not ranked" in dim grey under the date (same size as the name), the reason under it ("ignored in ranking" / "GPS gap at a gate" / "a gate was missed"); SECTORS rows with no real time show a blank time cell.
- A ranked activity's detail page looks exactly as before.
- Night theme: "Not ranked" is readable on both the feed and the detail page.
- REPLAY of an estimated/missed ride: at the finish the big clock goes blank for about 2.5 s (finding 3); decide whether that is acceptable.
- No "lap" and no "~" anywhere on ACTIVITIES, the detail page, or RECORD's end screen.
