# Nathan's observations and decisions (2026-10-09, chat)

## Observations (on device, after commit c93f406)
- White flash is gone in day and night mode. Solved.
- Maps are slow to load on every tab. Ranking, fastest to slowest:
  1. ROUTES map: fastest, least disturbing.
  2. RECORD map: a bit slower, a visible black screen for a split second.
  3. ACTIVITIES maps: slowest, visibly black for an uncomfortable amount of time.
- When the ACTIVITIES scrollable maps and the full-screen ROUTES map first launched (cycle23/24, 2026-10-07)
  he had no slow loading and no flashes.
- He expected the last commit's "cache" to preload maps once so they are ready when he is in the app.

## Decisions / preferences
- ACTIVITIES card maps are not scrollable or zoomable (a picture). Nothing outside the visible cards needs a map.
  He agrees with mounting only visible cards (see ruling question 1).
- He does NOT want: staggered mounting, or a static placeholder/trail-shape shown while the live card map loads
  (ideas 2 and 3 from the chat). Do not propose them again.
- He is interested in keeping tab screens mounted while the app is open so switching is instant (ruling question 3);
  wants the drawbacks weighed honestly.
- ACTIVITIES card maps: he asked whether a real live map is needed at all. The way line never changes; the only
  variation is night/day and the SETTINGS sector-colours toggle. He accepts a snapshot-image approach IF it looks
  identical to the real map ("same renderer draws it" is why it appeals).
- FREEZE RULE (his gut feeling, confirmed in chat): an activity reflects the ranking state at the moment it was ridden.
  Sector colours must NOT be recoloured retroactively when later rides change the tiers, when gates are edited, or
  when other rides are ignored/counted. He agreed this must apply to BOTH the card and the ride detail page, and to
  the "P3/10" rank text, so card and detail never disagree. The ride's OWN ignore state still applies (ignored ride = neutral / not ranked).
- Standing rules still apply: rider-facing strings budget (CLAUDE.md #9), never delete (move to safe_to_delete/),
  JS-only/OTA preferred, nothing declared done without a checkable artifact.
