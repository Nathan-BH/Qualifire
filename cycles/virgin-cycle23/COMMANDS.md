# virgin-cycle23: COMMANDS.md (Nathan's copy-paste PowerShell)

Status 2026-10-07: briefs 01-03 (feed + detail redesign) are EXECUTED and Opus-inspected in the working tree,
NOT committed, NOT published. Tests 912 (909 pass, 0 fail, 3 skip), `tsc --noEmit` exit 0 (rerun by the coordinator).
All changes are JS only (no native module, plugin, manifest or asset), so they ride as an OTA update on your current build.

IMPORTANT: the working tree ALSO holds the uncommitted work of a parallel cycle 24 session (catalog map on the ROUTES tab:
`catalogMapView.tsx` etc.) and cycle 22. `publish-preview.ps1` publishes WHATEVER is in the tree, so the update on your phone
will contain all of it, not only the Activities redesign.

## 1. Dry run first (checks node, tests, tsc, fingerprint; publishes nothing)
```
cd "C:\Users\natha\Claude personal projects\Qualifire"
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-preview.ps1" -DryRun
```
If it reports a fingerprint drift, stop and see `scripts\OTA-TROUBLESHOOTING.md`.

## 2. Publish
```
cd "C:\Users\natha\Claude personal projects\Qualifire"
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-preview.ps1"
```
Then on the phone: fully close "Qualifire Preview" and reopen it twice (first launch downloads, second runs it).

## 3. Update 2026-10-07 (brief 04, after your on-device test)
Feed maps are now read-only pictures BY DESIGN (`CARD_MAP_GESTURES = 'readonly'` in `app\src\ui\activityCard.tsx`), the feed maps run edge to edge,
and the divider is 3 dp with more padding (card heights 307 / 273). The detail page is unchanged. Tests 914 (911 pass, 0 fail, 3 skip), tsc exit 0, Opus-inspected.
Brief 05 (2026-10-07 night): unranked rides (estimated, missed, ignored) show "Not ranked" with no time and no rank, no quality words anywhere on the card,
"lap" wording removed from the real screens (tower LAP -> TIME). Tests 920 (917 pass, 0 fail, 3 skip), tsc exit 0, Opus-inspected: `inspect-report-brief-05.md`.
Brief 06 (2026-10-07 night): no "~" or "– –" estimate flashes on RECORD/REPLAY, no "lap" or em dash in the gate-save alert, RESULTS says "Not ranked". Tests 923 (920 pass, 0 fail, 3 skip), tsc exit 0, Opus-inspected: `inspect-report-brief-06.md`.
Publish again with the commands in 1 and 2 above. On-device checks owed: `inspect-report-brief-04.md`.

## 4. Known and left open on purpose
- F6: the feed's sector strip does not wrap; 4+ sectors may be cut at the right edge (wrapping would change the fixed card height).
- F1: cannot be tested without a phone (see 3).
- Free activities show duration only (distance not built).

## 5. On-device checklist (plain language)

ACTIVITIES feed:
1. Scroll the feed with one finger starting ON a map: the list must scroll. (If it does not: switch the card maps to "picture only", one line, F1.)
2. Tap a map with one finger: the activity opens.
3. Pinch a card map with two fingers: the map zooms/moves, and the activity must NOT open when you lift your fingers, and the list should not jump. (F1)
4. Tap the ⋯ on a card: only the small menu opens, not the activity. Tap the small "i" on a card map: the map-sources note opens, not the activity.
5. From the ⋯ menu: Ignore in ranking / Count in ranking flips the card (dimmed, "ignored") and other cards' ranks update; Delete asks first, then the card disappears.
6. Scroll fast through a long list: maps arrive a moment late (expected), but scrolling should not stutter badly; scrolling back up, maps should not stay blank. (F2, F7)
7. Open an activity far down, press BACK (button and phone back gesture): you land at the same place in the feed.
8. A route with 4 or more sectors: all sector times visible on the card, none cut off at the right edge. (F6)
9. Free activities appear in the same list, in date order, titled "Free activity"; a ride with no route shows its from-to or just the date.
10. Switch sport in Settings: the feed shows only that sport.
11. Day and night theme: lap time, rank, sector times and the grey "ignored"/"estimated" words are readable on the plain background.

Activity detail:
12. Open the same activity from ACTIVITIES, right after STOP, from a route page and from RESULTS: the bottom button reads BACK TO ACTIVITIES, RECORD ANOTHER, BACK TO ROUTE, BACK TO RESULTS respectively, and works.
13. ⋯ menu sits just under the ⋯ button (not shifted by the status bar), on both themes; it offers Export GPX+, Ignore/Count, Delete. Tap ⋯ immediately after opening a free activity: the menu should not be an empty box. (F4)
14. Export GPX+ from the menu: same save/share behaviour and messages as before. Delete from the detail: confirm, then you are back where you came from.
15. Tap a sector row: only that stretch turns blue on the map; tap it again: normal colours return.
16. Replay button appears only when a replay exists and opens the replay; back from replay returns to the detail.
17. Swipe from the left edge on the big map (Android back gesture): it should go back, not pan the map, or at least not get stuck.
18. Suggestion rows (Make this the reference..., Make this the reference of a new route / Save as a new way on..., Save as free activity, Not a free activity) appear in the same situations as before and still work, including the naming and gate cards.

