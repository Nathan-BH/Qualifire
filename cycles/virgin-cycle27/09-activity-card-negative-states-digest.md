# Activity card negative states: "no lap", "missed", "interrupted" (digest)

Date: 2026-10-08. Read-only digest. Repo HEAD 7f638ba. Key commit: c1f46ad (2026-10-07, "vcycle23 feed + detail redesign, not ranked, no estimates"). Line anchors refer to the current working tree unless marked "pre-c1f46ad".

## TL;DR
- The tester's screenshot matches the PRE-c1f46ad build. There, the hero slot printed "no lap" (rideHistoryModel.ts:46, :166) and the feed card carried a quality sub-label "estimated | missed | interrupted" (feedModel.ts:28 pre-c1f46ad). Current tree removed both (c1f46ad; allow-list now has "Not ranked", not "no lap").
- "no lap" / "missed" = a lap with a missed sector (store/derive.ts:91-92: any sector quality 'missed' makes the lap 'missed'). Missed sector = gate never crossed or detour off-route (derive.ts:14, :68).
- "interrupted" = a stop inside the sector or lap (derive.ts:68, :95-96). Interrupted is a RANKED lap with real moving time; it does not hide the time.
- Current tree shows "Not ranked" (feedModel.ts:57) for quality missed/estimated or rider-ignored (feedModel.ts:66-67). No "interrupted" word appears on any current card.
- Position "P x/y" is absent when unranked, when ranks() refuses the lap, or when fewer than MIN_HISTORY rides exist (rideHistoryModel.ts:176-188; feedModel.ts:92).
- Total lap raw time is stored even for missed laps (derive.ts:103-106, lap.rawS), but the card hides it (feedModel.ts:83-90).

## Table: state | string | trigger | file:line

| State | Rider string | Trigger (current tree) | file:line |
|---|---|---|---|
| Unranked (missed or estimated lap, or ignored ride) | "Not ranked" (hero slot, feed + detail big slot) | unrankedForDisplay = ignored OR quality estimated OR missed | src/ui/feedModel.ts:57, :66-67; src/ui/activityCard.tsx:77-78; src/ui/rideDetailModel.ts:29-30 |
| Tower ceremony today row | "TODAY · Not ranked" | tower model time = NOT_RANKED_LABEL | src/ui/tower.tsx:181; src/ui/tower.tsx:53; tower model (asserted at tests/recordflow_suite.ts:626-627) |
| Detail reason line, missed gate | "a gate was missed" | rankLineFor: lapS null and not estimated | src/ui/rideDetailModel.ts:91 |
| Detail reason line, estimated | "GPS gap at a gate" | rankLineFor: lapS null and estimated | src/ui/rideDetailModel.ts:91 |
| Detail reason line, rider excluded | "ignored in ranking" | r.ignored | src/ui/rideDetailModel.ts:70 |
| Detail reason line, barred | "no rank" | lapS set, barred (tripwire / store exclusion) | src/ui/rideDetailModel.ts:73 |
| Detail reason line, too little history | "too few to rank" | lapS set, hist.length + 1 < MIN_HISTORY | src/ui/rideDetailModel.ts:84-86 |
| Replay end line | "replay over · <rankLine or lapLabel>" | ReplayScreen | src/ui/ReplayScreen.tsx:223 |
| Sector chip, missed | "–" (bare dash) | sectorChipLabel, quality missed | src/ui/feedModel.ts:77 |
| Sector row, missed | timeLabel '' (empty) | buildSectorRows, quality missed | src/ui/rideHistoryModel.ts:228-231 |
| Sector row, estimated | timeLabel '' | quality estimated or v null | src/ui/rideHistoryModel.ts:235-238 |
| Lap time cell, missed/estimated | '' (empty, not "no lap") | lapCellLabel: lapS null | src/ui/rideHistoryModel.ts:40-43 |
| Live flash, missed gate | nothing (empty grey slot) | liveView case 'missed' | src/ui/liveView.tsx:142, :170 |
| Live RECORD notice, interrupted recording | "Interrupted · saved as free activity" | app killed, under 30 fixes: discard; 30+: free activity | src/ui/RecordScreen.tsx:117; src/ui/recordFlow.ts:98-100; allow-list :778 |
| Rank position, feed | "P<pos>/<of>" (e.g. P1/1) | row.rank non-null and not unranked | src/ui/feedModel.ts:92; src/ui/activityCard.tsx:81 |
| Detail rank line, ranked | "P<pos> of <of> on this way" | ranked, MIN_HISTORY reached | src/ui/rideDetailModel.ts:80-81; allow-list :2570 |
| Preview only | "NO TIME", "estimated sector — not ranked" | src/ui/preview/data.ts:385, :456 (not a rider screen) | allow-list :2080, :2200 |

Searched and NOT found in current rider code: "no lap", "NO LAP", "dnf", "partial" (only as comment or test text), "interrupted" on any feed card, any notification body (rideNotification.ts has no match).

## 1. Every rider-visible occurrence (current tree)

1a. Feed card (ACTIVITIES, day mode): src/ui/activityCard.tsx
- :77-79 hero: "Not ranked" if card.unranked, else card.heroLabel (the time).
- :81 position: card.rankLabel "P<pos>/<of>" (only when rankLabel non-null).
- :103-113 strip: sector chips, empty for unranked (sectors: [] from feedModel.ts:97).
- Plain (free) cards: heroLabel = durationLabel(meta) (feedModel.ts:90, :72-75); no rank, no strip.

1b. Feed card model: src/ui/feedModel.ts
- :57 NOT_RANKED_LABEL = 'Not ranked'.
- :66-67 unrankedForDisplay(quality, ignored) = ignored || estimated || missed.
- :83 unranked = route && unrankedForDisplay(row.quality, detail.ignored).
- :86-93 heroLabel '' when unranked, else row.lapLabel; rankLabel null when unranked or no rank.

1c. Activity detail: src/ui/rideDetailModel.ts
- :29-30 unranked flag, same rule as feed.
- :69-91 rankLineFor (the four reason strings above).
- :116 free activity: lapLabel '–'.
- :121-133 estimated = quality === 'estimated'; lapLabel from lapCellLabel; rankLine from rankLineFor.

1d. History and results rows: src/ui/rideHistoryModel.ts
- :40-43 lapCellLabel returns '' when lapS null (no "no lap" any more).
- :170 lapLabel; :175 quality = null for clean else the raw quality (used for the sub-label, if any consumer reads it).
- :176-188 rank only if lapS non-null and ranks(result) and hist.length + 1 >= MIN_HISTORY.
- :228-231 missed sector: blank timeLabel, tier 'est'. :235-238 estimated: blank.

1e. Results tower / RESULTS: src/ui/tower.tsx:181 "TODAY · Not ranked"; :53 comment only.

1f. Live RECORD / engine: liveView.tsx:142-170 (missed gate = empty grey slot, no text; estimated = tier est, no time). RecordScreen.tsx:117 "Interrupted · saved as free activity" flash (5 s, RecordScreen.tsx:118).

1g. Replay: src/ui/ReplayScreen.tsx:223 uses detail.rankLine. Replay skips missed sectors (tests/replay_suite.ts:478-480).

1h. Notifications: src/location/rideNotification.ts and rideNotificationPolicy.ts contain no "missed", "interrupted", "no lap" string (grep, no match). Uncertain: not read line by line for other wording.

1i. Allow-list (app/tests/ui-strings.allow.json): "Not ranked" :1541-1542; "GPS gap at a gate" :2562; "P{…} of {…} on this way" :2570; "a gate was missed" :2578-2579; "ignored in ranking" :2586-2587; "no rank" :2594; "too few to rank" :2602; "TODAY · Not ranked" :3430; "Interrupted · saved as free activity" :778; "NO TIME" :2080 (preview data). No allow entries for "no lap", "no time", "missed" alone, "interrupted" alone.

1j. Tests asserting these words:
- tests/feedmodel_suite.ts:81-88 unranked card must not contain "no lap|estimated|missed|interrupted|ignored".
- tests/feedmodel_suite.ts:92-96 interrupted card is an ordinary ranked card with no "interrupted" word.
- tests/feedmodel_suite.ts:120-125 unrankedForDisplay truth table; NOT_RANKED_LABEL pinned.
- tests/feedmodel_suite.ts:185-186 sectorChipLabel missed = '–'.
- tests/recordflow_suite.ts:393-414 Not ranked, no "no lap"/"no time" in rideDetailModel/rideHistoryModel.
- tests/recordflow_suite.ts:611-627 tower Not ranked.
- tests/ridedetail_suite.ts:142-149 unranked follows the rule.
- tests/live_suite.ts:132-164 skipped START = missed:skipped.
- tests/replay_suite.ts:247-255, :478-480.

## 2. Data model: predicates

Source quality: src/store/types.ts:103 SectorQuality = clean | interrupted | estimated | missed.

Offline derivation (src/store/derive.ts, pure, from raw fixes via core):
- derive.ts:66-69 per sector: flag clean → 'clean'; interrupted → 'interrupted'; anything else (excluded_offroute, excluded_nocross) → 'missed'. Then 'estimated' only if the LIVE layer passes that sector index (estimatedSectors; derive.ts:69). Offline never infers estimated (header comment derive.ts:18-21: a GPS gap offline lands as excluded_offroute, so it becomes 'missed').
- derive.ts:78 movingS null for estimated and missed; kept for clean and interrupted.
- derive.ts:84-100 lap quality, worst sector wins, in this order: any missed → 'missed'; else any estimated → 'estimated'; else any interrupted → 'interrupted'; else 'clean'.
- derive.ts:103-106 lap.rawS = last.tB - first.tA (stored even when missed, if bounds exist). lap.movingS = null unless clean or interrupted.
- derive.ts:110 wayId null when anyMissed && !haveBounds (no bounds = no way match).
- types.ts:157 TowerRow.position null = unranked.

Missed meaning (which gate / how counted):
- "missed" applies per SECTOR between two gates (gate k to gate k+1). A sector is missed when core's sectorTimes flags it excluded_nocross (gate never crossed) or excluded_offroute (rider left the corridor, a detour, D-015). The lap is then missed. Gates are chainage-indexed, derive.ts:17, :31.
- Live (src/live/engine.ts:82-89, :525-542): a START or FINISH gate skipped by arming / late GPS lock, or exit fired without entry, gives {missed, skipped}; an off-route sector gives {missed, offroute}. Live missed sectors also make the lap not scored (engine.ts:578, live_suite.ts:132-140).

Interrupted meaning:
- core flag 'interrupted' = a stop inside the sector (derive.ts:12). It is NOT a pause flag in the store; the stop time is subtracted for movingS only (derive.ts:114). Source of truth for "stop": kinematics stopped array (derive.ts:44; stoppedTimeBetween).
- Live: engine.ts:546-555 interrupted = row.flag === 'interrupted'; affects scoring only.
- App kill mid-ride: location/index.ts:94-96, :169-188; RecordScreen.tsx:444-480; recordFlow.ts:98-100 (under 30 fixes discarded, 30 or more filed as a FREE activity, never ranked, never matched to a way). This produces a free activity, not an "interrupted" lap label.
- GPS gap at a gate in live gives estimated (engine.ts:548-566, D-013), not interrupted.

Ranking predicate (src/store/results.ts:88-95):
- ranks(r) false if lap quality estimated or missed; tripwireDemoted; ignoredFromRanking; or scoredS(lap) null. Clean and interrupted both rank (results.ts:88 comment).

Rider exclusion: types.ts (ignoredFromRanking, RideResult) set by "Ignore in ranking" (WP-H).

## 3. What is still known per state

| State | Total lap time (raw) stored | Moving time | Sectors | Distance | Position |
|---|---|---|---|---|---|
| clean | yes (lap.rawS, derive.ts:103) | yes | all with times | not stored in result (no distance field in RideResult, types.ts:118-135) | yes if MIN_HISTORY met |
| interrupted | yes | yes (raw minus stop, derive.ts:114) | all sectors with times; interrupted ones carry movingS | no | yes (ranks) |
| missed (lap) | rawS stored if bounds exist (derive.ts:104-106); card hides it (feedModel.ts:83-90) | null (derive.ts:114) | completed sectors keep their own rawS/movingS (derive.ts:73-79); missed sector has rawS and movingS null | no | no (ranks refuses, results.ts:93) |
| estimated | rawS only (derive.ts:78 comment) | null | estimated sector raw only | no | no |
| ignored | unchanged | unchanged | unchanged | no | hidden (feedModel.ts:83-93) |
| free / no way | duration only (wall clock, feedModel.ts:72-75) | no | none | no | no |

Card slot where position normally appears: activityCard.tsx:80-82, a heroCol View to the right of the big time in the hero row (height 46). Layout: when rankLabel null the heroCol renders empty (no text); the big time stays left. When unranked the hero shows "Not ranked" in place of the time and heroCol is empty.

## 4. Feed card layout

activityCard.tsx (current):
- Head row (title, date): :72-75.
- Hero row (height 46, horizontal): big time or "Not ranked" (:76-79, style lap fontSize 34, notRanked fontSize 17), then heroCol with rank (:80-82).
- Map slot (150 dp): :84-102.
- Strip row (sector chips: label + time): :103-113, empty when unranked.
- Menu dots: :114.
Fixed heights: feedModel.ts:39-45 (CARD_HEIGHT_ROUTE 307, CARD_HEIGHT_PLAIN 273).

Pre-c1f46ad (per git show): feedModel.ts sub-label line (parent :28) "non-clean quality ('estimated' | 'missed' | 'interrupted'), or 'ignored'", set at parent :56. The old card rendered this subLabel under the position (matches tester's "interrupted" under P1/1). Exact old JSX slot not re-read; label as inferred from the field name plus tester screenshot.

Current: no subLabel. The slot under the rank is empty. So "interrupted" can no longer appear on the card.

## 5. Existing rules and wording decisions

- src/ui/feedModel.ts:59-65 (comment): "either a ride is good and ranked, or it is not, gets no time, no rank". Interrupted is ranked like clean.
- src/ui/rideDetailModel.ts:68 comment: brief 05 (Nathan 2026-10-07): no "lap", no "no time", no "estimated" in reason lines.
- src/ui/rideHistoryModel.ts:37-39 comment: nothing shown as an estimate; "no lap" form removed.
- src/ui/liveView.tsx:158: no pause mark on interrupted sectors (virgin-cycle22 02).
- src/ui/feedModel.ts:24, 28-31: docs for unranked card.
- cycles/virgin-cycle20/08-remove-clutter-text.md:81 and :448: pre-cycle23 list of bare status words "not ranked, no rank, too few to rank, no time, no lap".
- cycles/virgin-cycle20/09-ALLOWLIST-REVIEW.md:249-255: "no lap" and "no time" were allow-listed at rideDetailModel.ts:86 and "no lap" at rideHistoryModel.ts:46 (cycle20).
- cycles/virgin-cycle20/05-ride-to-activity-visible-text.md:238 and 08:81: pre-cycle23 wording.
- STATE.md:290 (virgin-cycle11): "no rank and no lap tier" language (text read only in grep, not the full section).
- process/CONVENTIONS.md § Rider-facing text: rule that every rider string is in ui-strings.allow.json, no em dash, alert body 20 words max (CLAUDE.md item 9). Full section not re-read.
- "not ranked" existed as a string in the cycle20 code (rideDetailModel.ts:68 pre-cycle23) and now exists as "Not ranked" (feedModel.ts:57). Case differs.

## 6. Other consumers of the same states

- Tier colours: src/ui/colourModel.ts:142-145: clean AND interrupted sectors count toward sector history (scoredS, raw by default); estimated and missed do not. So an interrupted sector DOES colour and does count in history.
- Lap tier: derive/store/results.ts:149 and :503, routeFromRide.ts:372: clean or interrupted laps are used as the way reference and history.
- Tower: results.ts tower(): interrupted rows are included as ranked (results.ts:116-125 comment and code), flagged interrupted: true (types.ts:160). Consumers: tower.tsx (no interrupted text found).
- Live tower chip: towerSource.ts:9, :27 (interrupted laps rank; estimated laps never).
- Personal bests: rideHistoryModel.ts:265-275 pbLabel = fmt(best) from pb(wayId) (source of pb not traced; uncertain whether it excludes interrupted).
- Streaks: none found by grep.
- Replay: replay_suite.ts:478-480: a missed sector never flashes.

## Unverified / uncertain
- The tester's build number and whether it predates c1f46ad: inferred from the screenshot strings matching pre-c1f46ad code; no build ID or APK checked.
- Exact old JSX of the pre-c1f46ad sub-label slot (only the field and its values were read via git show).
- Whether pre-c1f46ad activityCard rendered "no lap" in the hero: pre-c1f46ad lapCellLabel/rideHistoryModel.ts:166 has lapLabel 'no lap' for a free/no-result ride, and rideDetailModel.ts:86 for missed. Whether the hero showed "no lap" for a missed lap via lapLabel was not traced end to end in the old card.
- Whether any other screen (RESULTS list, MAP, Notification) shows "missed" alone: not fully traced; grep found no rider-string match outside the files above.
- PB source (pb function) and whether it excludes interrupted laps: not read.
- Notification text: rideNotification.ts not read line by line.
- STATE.md and CONVENTIONS.md sections read only by grep hits, not in full.
- Core flag semantics (excluded_nocross vs offroute, interrupted threshold) live in app/core, not read; derived from comments in derive.ts.
