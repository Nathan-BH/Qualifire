# website — standing rules and site-wide notes

This file is Nathan's. It holds rules that apply to every round of the site, so
they are read before any brief is written and never re-introduced by accident.
Round-specific notes go in `rounds/vN/FEEDBACK.md`.

## Standing rules (from Nathan, 2026-09-14)
1. **No em-dashes anywhere.** Not in visible copy, not in the `<title>`, meta
   description, aria-labels, CSS or HTML comments, or table placeholders. Use a
   period, a colon, a comma, "and", or parentheses instead. Acceptance test:
   `grep -c "—"` on the file prints 0.
2. **Never these phrases or framings:**
   - "time posted" (in any form, including "A slow lap is time posted.")
   - "failure" (do not plant the word at all, not even to negate it)
   - "Most laps are yellow. That's fine." and any similar consolation framing
3. **Colour taxonomy wording is plain:** purple = best, green = better than
   average, yellow = below average. Nothing more ornate.
4. **Register:** terse, concrete, formal. Mechanism over adjectives. No flourish
   taglines (the "Quali + fire" line is gone and stays gone).
5. **Day/night toggle mechanism stays as is.**
6. **Renders on the site are real:** real map, real route line, real gates, the
   same geometry as the silent-studio product scenes. No abstract schematics.

## Open preferences (not yet ruled by Nathan)
- Dark basemap in day mode: v2 ships the dark OpenFreeMap capture in both themes.
  A day (positron) capture needs Nathan to run `marketing/silent-studio/_map/map-capture.html`
  once with the positron style. Say the word and it becomes a round.

## Nathan's site-wide notes
<!-- anything that should apply to the whole site, any round, goes below -->
