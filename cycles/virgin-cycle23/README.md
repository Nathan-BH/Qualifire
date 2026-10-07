# virgin-cycle23: ACTIVITIES tab redesign (dedicated cycle)

Scope (Nathan, 2026-10-06): this cycle is ENTIRELY about redesigning the Activities tab: the feed and the new full-screen detail page. No other quests belong here; anything else goes to another cycle.

## Status 2026-10-07
Executed + inspected. Briefs 01-03 landed 2026-10-06, feedback polish (brief 04) 2026-10-07. Start at COMMANDS.md.

## Files, in reading order
- `00-nathan-decisions.md`: binding design decisions (feed, live maps, two-finger gestures, borderless style, detail page redesign) + open questions for Fable. + § "Feedback 2026-10-07" (brief 04: read-only card maps, 3 dp divider, edge-to-edge feed maps).
- `01-activities-tab-digest.md`: Haiku digest of the current tab and detail page (code anchors).
- `02-map-and-sport-digest.md`: Haiku digest of WayMapView, tiles, multi-map risk, sport filtering, list virtualization.
- `03-preview-A-fullbleed.html`, `03-preview-B-inset.html`, `03-preview-C-tinted.html` + `preview-common.js`: clickable MOCKUPS of the feed and detail page. Open any .html from the folder. Fake maps and data; NOT in the app.
  First build = preview B (map in bordered rounded frame, see 00 decisions). A is deferred.
- `EXECUTION-ORDER.md`: the three briefs, their dependencies, what Inspect reruns per brief, the risks left for the phone. **Read before dispatching.**
- `EXECUTOR-RULES.md` / `INSPECTOR-RULES.md`: tier rules for this cycle (allow-list handling included).
- `brief-01-map-gestures-actions-feedmodel.md` (Fable, 2026-10-06): WayMapView `gestures` prop, shared `rideActions.ts`, pure `feedModel.ts` + `trailCache.ts` with tests, `SectorRowModel.gapS`. No visible change.
- `brief-02-activities-feed.md` (Fable, 2026-10-06): the feed itself (`RidesScreen.tsx`, new `activityCard.tsx` + `activityMenu.tsx`), windowed live maps, ⋯ menu, scroll restore.
- `brief-03-detail-page-redesign.md` (Fable, 2026-10-06): the flat full-screen detail, sector tap-to-highlight, ⋯ menu, suggestion rows.
- `brief-04-feedback-polish.md` (Fable, 2026-10-07): read-only card maps, 3 dp divider, edge-to-edge feed maps (landed + inspected).
- `brief-05-not-ranked-and-lap-wording.md` (Fable, 2026-10-07 night): 'Not ranked' instead of time/rank/quality words on unrankable activities (feed + detail), no rider-facing 'lap'. See 00 § Feedback 2.

## Status
Briefs written 2026-10-06 (night), NOT executed. Nothing here is in the app until the briefs land and Inspect passes.

## Naming plan for what comes next
- Further digests: `04-...-digest.md`, `05-...` (numbered, kebab-case).
- Inspect reports: `inspect-01.md`, `inspect-02.md`, `inspect-03.md`.
- Nathan's on-device findings: `ON-DEVICE-FINDINGS.md` (the coordinator opens it from the OPEN-ITEMS paragraphs in each brief's §7).
