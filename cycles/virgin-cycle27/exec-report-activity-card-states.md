# Exec report - activity card states (brief 11-brief-activity-card-states.md = "brief 10"), 2026-10-09

Done: all steps 3.1-3.5, tests 4.1-4.3, allow-list. No amendment section in the brief. Static checks only (no native render).

## Files changed by this brief
app/src/ui/feedModel.ts, activityCard.tsx, rideDetailModel.ts, RideDetailScreen.tsx (also removed the unused `notRanked` style + pin), RecordScreen.tsx (constant + comment only; file also holds earlier briefs' hunks),
app/tests/feedmodel_suite.ts, ridedetail_suite.ts, recordflow_suite.ts, ui-strings.allow.json.

## Counts
Before 957 tests: 954 pass, 0 fail, 3 skip. After: 957 tests: 954 pass, 0 fail, 3 skip. tsc --noEmit exit 0 (log exec-tsc-activity-card-states.log is empty = no errors).
numberOfLines count in activityCard.tsx: 8 -> 7; pin updated to 7.
Greps: `gate was missed|GPS gap at a gate|Interrupted ·` in app/src -> none. `rawS` in feedModel.ts/activityCard.tsx -> none.

## Allow-list (one python round-trip, re-sorted)
- REMOVED src/ui/rideDetailModel.ts | literal | `GPS gap at a gate`
- REMOVED src/ui/rideDetailModel.ts | literal | `a gate was missed`
- EDITED src/ui/RecordScreen.tsx | literal | `Interrupted · saved as free activity` -> `Saved as free activity` (reason "virgin-cycle27 10: no negative word; the fact is that it was saved", since 2026-10-08, by "Sonnet execute, virgin-cycle27 brief 10")
ui_strings suite clean.

## Deviation (one)
tests/feedmodel_suite.ts "ignored ride is unranked ..." (line ~69) asserted `rankLabel === null`; not listed in the brief but directly contradicted by it (section 7: ignored also shows `Not ranked`). Changed that one assert to `rankLabel === 'Not ranked'`. Inspector: confirm this reading.

## Inspector focus
ignored + null meta gives heroLabel '' and rank slot `Not ranked`; ridedetail ignored branch still says `ignored in ranking`; activityCard hero JSX.

## OPEN-ITEMS line
Unranked cards (cycle27 brief 10) - on-device with a missed-gate activity: duration + Not ranked on the card and the detail page; tester build id still unverified.
