# 03 — Gates & Saving — Round v2

**Render file:** gates-saving_v2.mp4 — **not rendered yet.** Built 2026-09-10 without a shell on Nathan's PC;
Nathan renders it (`COMMANDS.md` → "The three product scenes") and copies the MP4 here.
**Duration (planned):** 14.8s at 30fps, 1920x1080, no audio. First HyperFrames render of this scene (v1 was a cut of the lost `tour` render).
**Source:** `../../index.html` (new, from scratch — `tour/index.html` no longer exists anywhere).

## What changed since v1
- Real map: OpenFreeMap dark basemap of the reference ride (Leuven, `qualifire-20260903-1828.gpx`, 5.8 km),
  captured once via `../../../_map/map-capture.html`, with the route/gates/rider drawn on top in the app's
  casing+core style and exact colours (route core #F5C542 / casing #14120C, rider #2F7DE1 — v1's #58B7FF was wrong).
- Gates are perpendicular ticks centred on the route (the app's real representation), computed from the path itself — this retires v1's "gates detach / jump 250-450px" bug outright rather than patching it.
- Crossing a gate is a static colour swap to the sector's tier colour, and the sector line paints that colour (app behaviour); there is no pulse because the app has none.
- Sector verdicts: purple, yellow, purple, purple (with one prior ride, green is impossible — faster than the only prior ride is purple by definition).

## What you should see, in order (planned — verify against the render)
1. 0.05-0.5 — Start/end landmark rings pop in.
2. 0.6-3.9 — Caption "Save the start and end — it splits into sectors automatically." + three gate ticks pop in (0.9/1.2/1.5).
3. 4.0-6.9 — Caption "Next time, you've got something to go for."
4. 7.0-14.3 — Second ride: rider fades in at the start (7.0), rides 7.4-14.3; gates swap colour at 9.06 / 11.75 / 13.20 and each sector paints; final sector at 14.3.
5. 14.3-14.8 — Hold.

## Nathan's feedback
*(blank — write your notes below, overall or beat-by-beat)*

-
