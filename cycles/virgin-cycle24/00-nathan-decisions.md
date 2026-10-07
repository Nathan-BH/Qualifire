# virgin-cycle24 — ROUTES tab change

Created 2026-10-06. Scope: this cycle is entirely for one specific app change concerning the ROUTES tab.

Status: folder created empty, awaiting Nathan's description of the change before any digest/brief/execution.

## Nathan's decisions

- 2026-10-06, first target: the "YOUR PLACES" section of the ROUTES tab is poor and unattractive; a places section that is not literally a map is a shame.
- Nathan's idea (not yet a decision): one big map with the places annotated on it; tapping a place shows more info about the routes and ways coming to / leaving it.

## Decisions (2026-10-06, conceptual round)
- DECIDED: places and routes are merged into one view; the ROUTES tab is renamed the MAP tab, and the map is its most central piece.
- Concept: places = nodes, routes = edges, ways = variants of an edge. Tab purpose: "this is my world", "these are my patterns" (usage frequency, usual way, timing), and a way into the related activities. Activities tab = chronological view; MAP tab = spatial view of the same rides.
- Idea accepted: a fresh install starts with an empty map that fills in as the rider rides (discovery feel).
- Idea accepted: line thickness = how often a route is ridden; tap a place = routes in/out; tap a route = its ways + recent activities.
- DECIDED: riders do NOT start activities from the MAP tab.
- DECIDED: managing (at least deleting a landmark or route) lives in this tab, but must stay discreet so the map experience is not cluttered. How: still to be designed.
- Standing rules still apply: minimal text, generic for every user's routes.

## Management + gates (2026-10-06, 23:03)
- Nathan leans to: a global EDIT MODE on the MAP tab (instead of per-sheet menu). In it, landmarks and routes are selectable; once selected, an edit icon opens a full-screen page to delete the landmark/route or edit gates. (Question open: does edit mode distinguish landmark vs route selection; answer proposed in chat.)
- Nathan's idea (not yet decided): gates NOT visible on the full map by default; maybe only when a route is selected, or only when editing a route.

## Map structure + go-ahead (2026-10-06, 23:13)
- AGREED "for now" (must be seen in the app before final): three-level MAP tab.
  1. Overview (nothing selected): full-bleed map; one line per route, merged across both directions; only the usual way drawn; consistent width, semi-transparent (overlaps darken naturally); NO line-thickness-by-frequency; place pins labelled.
  2. Tap a place = spider-web focus: fit to place + neighbours; connected routes full strength, everything else dimmed to a faint ghost (not hidden); sheet lists routes in/out, tapping a row highlights that line.
  3. Tap a route = ways focus: its ways drawn, usual one strongest; on long overlaps emphasise only the differing stretches; gates shown here (gates hidden in overview and place focus).
- Rejected: straight "desire line" spokes (must stay a real map).
- Nathan ordered: Fable plans, Sonnet executes straight away, so he can see it in the app on 2026-10-07. He went to sleep: run unattended, log ambiguity to files and continue.
- NOT decided, so NOT in this build: edit mode / delete UX / what delete does to activities (digest 02: delete removes a way's stored results today). Existing delete/rename/merge stay reachable from the existing CatalogDetailScreen only.

## Status 2026-10-06 night (end of unattended run)
- Built and inspected, UNCOMMITTED, NOT published: MAP tab (brief 03). Inspection verdict PASS WITH NOTES (04-inspection-report.md). Suite 907 tests, 0 fail; tsc exit 0.
- Known notes to fix after you have seen it on the phone: M1 tapping the highlighted way in route focus may reset/flip direction; M2 differing-stretches ~0.5 s on very long ways (and recomputed every render); L1-L4 minor.
- Open questions for Nathan: 03-brief-open-questions.md (14 items). Executor deviations judged sound by the inspector.
- Still undecided: edit mode / delete UX / what delete does to activities.
- To see it: run your usual publish-preview script yourself (cycle23 is also uncommitted in the same tree, so the build includes both).
