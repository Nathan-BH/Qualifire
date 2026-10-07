# virgin-cycle25: RESULTS tab rethink, Nathan's decisions (2026-10-07)

Status: ideas agreed, no briefs yet. Fable only off-peak (night). Haiku/Sonnet make it concrete first.

## Decisions
1. **The RESULTS tab goes away.** Its trend job is folded into other tabs (merge into MAP, entry from ACTIVITIES).
2. **Home = MAP route focus.** Tap a route, get a "how am I doing" panel (bottom sheet). Way switcher when the route has several ways (the trend is per way).
3. **Panel content = the scatterplot alone.** Last-10 window (see 6), dots coloured vs window average, window-fastest dot highlighted. Tapping a dot shows date and time only.
4. **Dropped:** the "ALL X ACTIVITIES, FASTEST FIRST" board, rank/gap selection caption, PB line, free-activities section (already in the feed), route list and way-list drill-down, bordered cards.
5. **Philosophy (binding): no all-time PB, ever.** The rolling window is the point: every ~10 rides is a fresh chance at greatness, an exceptional PB gets pushed out, and after a break or injury the rider compares to recent self, not an idealized past self. Nothing in this redesign may compare to an absolute best. Older rides remain reachable in the ACTIVITIES feed.
6. **Window is 10, not 9.** Ranking/colour pool is WINDOW_N = 10 (today + 9 previous; app/src/ui/colourModel.ts:29). The plot currently shows PLOT_N = WINDOW_PREV = 9 dots (resultsPlotModel.ts:21), so it drops today's ride. Make the plot show up to 10, same window as the ranking. Plot slot grid, tests and the "LAST N RIDES" caption assume 9; the brief must list them.
7. **ACTIVITIES entry point: no badge on feed cards.** Keep cards clean and minimal. Entry into the MAP panel for a ride's way comes from the redesigned detail page (exact affordance still to design).
8. Tab bar after this: record, activities, map, settings, demo.

## Open (for the Haiku/Sonnet pass)
- How ways are shown in MAP route focus today (cycle24 left ways non-tappable), and where the way switcher fits.
- Detail-page affordance that jumps to the MAP panel for that ride's way.
- Does the cycle23 detail page show any trend itself, or only the link?
- Strings to remove/add in tests/ui-strings.allow.json.

## Source
Digest: 01-results-tab-digest.md (note: it says plot window 9, which is wrong vs decision 6).

## Corrections from 02-map-panel-digest.md (coordinator, 2026-10-07 night; these SUPERSEDE items 3, 6, 7 where they conflict)
- C1 (item 6): the plot's 9 dots INCLUDE today; what falls off is the oldest ride. Ranking pool is 10 (today + 9 previous), plot cap PLOT_N = WINDOW_PREV = 9 (resultsPlotModel.ts:21). Decision stands: plot shows up to 10 = the same pool as the ranking. Change PLOT_N to WINDOW_N and fix the 9-assumptions in tests (demo_suite etc.) and the caption.
- C2 (item 3): the plot as built draws grey dots with the newest in t.accent (resultsPlot.tsx:161-185); it does NOT colour vs average or draw a purple fastest dot. Nathan decided "the scatterplot alone", so: KEEP the plot's existing look; do NOT add new colouring. Only the cap changes (C1).
- C3 (item 7): the ACTIVITIES feed card ALREADY shows rank text "P3/10" and a tier-coloured hero (activityCard.tsx:81, feedModel.ts:92). Nathan's "no badge" = do not ADD anything. Leave the existing card untouched. Log in OPEN-ITEMS that Nathan may want that rank text reviewed against the rolling-window philosophy (it is window-relative, so it is consistent with it).
- C4: RideDetailScreen "ON THIS WAY" (10-ride window table) and rankLineFor are window-relative. Leave untouched.
- C5: DEMO tab uses ResultsPlot, plotWindow, windowCaption, buildHistoryBoard (DemoScreen.tsx:779-797, demoModel.ts). The plot component and model must survive; only the RESULTS tab UI goes.
- C6: no navigation channel exists from ride detail to the MAP focus (TabNav has only go(tab); MAP focus is local state in RoutesScreen.tsx:35). Entry from the detail page is therefore a design question for the planner; if it needs a new channel, keep it minimal, or defer it and log as a follow-up. Not blocking: the panel is reachable from the MAP tab itself.
- C7: MAP route focus already has a bottom sheet of way rows with ride counts (RoutesScreen.tsx:114-123). The new trend panel should extend that sheet, not add a second one.
