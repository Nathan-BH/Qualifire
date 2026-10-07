# Report brief 02 (Sonnet execute)
Done: all steps (1a activityMenu.tsx, 1b activityCard.tsx, 1c RidesScreen.tsx feed, §2 test, §3 allow-list).
Files: NEW app/src/ui/activityCard.tsx, app/src/ui/activityMenu.tsx; M app/src/ui/RidesScreen.tsx, app/tests/recordflow_suite.ts (1 test before 'virgin-cycle21 04'), app/tests/ui-strings.allow.json.
Allow-list: removed src/ui/RidesScreen.tsx|prop:title|FREE ACTIVITIES; inserted sorted src/ui/RidesScreen.tsx|prop:label|{Count in ranking, Delete, Ignore in ranking} (since 2026-10-06, by "Sonnet execute, virgin-cycle23 brief 02"). Entries 459 -> 461 (tree differs from brief's 463 because cycle 24 edits are in the tree).
Tests: baseline 907 tests: 904 pass, 0 fail, 3 skip; final 908: 905 pass, 0 fail, 3 skip (+1). tsc exit 0 (tsc-brief02.log).
Deviation: tsc first failed: activityCard.tsx TS2551 StyleSheet.absoluteFillObject does not exist in this RN typings. Replaced with position:'absolute', top/left/right/bottom: 0 (identical effect). Not in brief.
Acceptance 4,5,6 pass (numberOfLines count 8; all six height tokens present). Native render not checkable here.
Placeholder is frame colour only (no trail line), as brief §4 says.
OPEN-ITEMS line: virgin-cycle23 brief 02 (feed), on-device checks owed: (a) one-finger scroll and tap over a card MAP; if the native map swallows them flip CARD_MAP_GESTURES in app/src/ui/activityCard.tsx to 'readonly'; (b) two-finger pinch on a card map moves/zooms it; (c) scroll smoothness with 3-5 live maps (MAP_MOUNT_RADIUS/windowSize are the knobs); (d) BACK from the detail lands at the same feed offset; (e) day/night contrast of hero/strip colours on the bare page background; (f) the map 'i' credit button on a card still opens its card.
