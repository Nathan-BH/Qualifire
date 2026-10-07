# virgin-cycle25: COMMANDS.md (Nathan's copy-paste PowerShell)

Status 2026-10-08: briefs 01-03 EXECUTED, Opus-inspected (all PASS WITH NOTES, no fixes required) and COMMITTED locally on branch virgin
(cbc77c7, a740b84, bca4126). NOT pushed, NOT published. Tests 918 (915 pass, 0 fail, 3 skip), `tsc --noEmit` exit 0. JS only, so it rides as an OTA update.

IMPORTANT: `publish-preview.ps1` publishes WHATEVER is in the working tree. A parallel cycle 26 session has uncommitted edits in `cycles\virgin-cycle26\` (docs only, no app code at the time of writing), so check `git status` if you want a clean publish.

## 1. Dry run first (publishes nothing)
```
cd "C:\Users\natha\Claude personal projects\Qualifire"
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-preview.ps1" -DryRun
```

## 2. Publish
```
cd "C:\Users\natha\Claude personal projects\Qualifire"
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-preview.ps1"
```
Then fully close "Qualifire Preview" and reopen it twice (first launch downloads, second runs it).

## 3. On-device checklist
1. Tab bar: record, activities, map, settings, demo. No RESULTS tab.
2. MAP tab: tap a route. The bottom sheet shows the route title, a row per way (with ride count) and the scatterplot of the highlighted way underneath. No frame/box around the plot, just a thin top line.
3. The plot shows up to 10 dots (today + 9 previous), newest at the right edge. Tap a dot: a caption "date . time" appears, nothing else (no rank, gap, PB).
4. Tap another way row: the plot switches to that way. Switch back: check the old caption does NOT linger wrongly (known note: selection is never cleared).
5. A route with 3 ways: is the 3rd row clipped (known: ~6 dp, the list scrolls)? If it bothers you, WAY_ROWS_MAX_H 108 -> 116 in trendPanelModel.ts.
6. A route/way with no ranked activity: no plot, no text, sheet looks like before. A way with one ranked ride: one dot.
7. Is the sheet too tall on your phone (max 380 dp), does it cover too much of the map, does the map camera frame the route above it (camera pad 400)?
8. Place focus sheet looks as before (max 280 dp).
9. DEMO tab: the plot still shows, now 10 dots, caption without "AS ON THE RESULTS TAB".
10. Open an activity right after STOP / from ACTIVITIES / from a route: the bottom buttons are RECORD ANOTHER / BACK TO ACTIVITIES / BACK TO ROUTE and work. (BACK TO RESULTS no longer exists.)
11. Feed cards and the detail page's ON THIS WAY table are unchanged.

## 4. Known and left open on purpose
See `OPEN-ITEMS-cycle25.md` (detail page -> MAP trend link is deferred; feed card rank text kept; hardware back and sport scoping unchanged).
