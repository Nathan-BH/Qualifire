# Cycle 02 — real map + real Start button for the three product scenes

## Goal
Implement Nathan's feedback on `start-ride_v1.mp4` (real map instead of a line on a
background; a "way bigger" START button matching the real app's), and carry the same
fix to `gates-saving` and `ranking` since all three share the same visual language.

## What triggered it
Nathan's feedback in `hyperframes/start-ride/rounds/v1/FEEDBACK.md`:
> - it does not look like how the app is actually build. For the start button I would be
>   okay just showing a yellow button but "START" word should be way bigger inside the
>   button >>look at how the app sizes it
> - then instead of a line on a background, I want an actual map dont care which city or
>   country on which the ride is made (similar to how I have the openmap)
> - if you want to take a random location fine by me, if you want an actual ride as
>   reference you can look into "data/activities/TEST in virgin-app rides" and take a ride
>   from there

...plus his instruction in chat to implement it for all three product scenes at once,
since it affects gates-saving and ranking the same way.

## Discovery that changed the scope
The composition source that produced all three v1 renders (`tour/index.html`) turned out
to no longer exist anywhere — not on disk, not in `safe_to_delete/`/`_to_delete/`, and not
in git history (checked the public GitHub mirror: the file has zero commits and 404s at
every path tried). `structure.md` and the three scene READMEs were stale on this point
(they still described `tour/index.html` as the live source). So this cycle became a
from-scratch rebuild of three compositions, not an edit of existing ones — a materially
bigger job than "implement the feedback" sounded like at the start.

## Delivered
All three scenes now have their own `index.html` (previously none did — they only existed
as READMEs + rounds/v1 renders cut from the lost `tour` composition):
- **start-ride** (`hyperframes/start-ride/index.html`) — real OpenFreeMap-styled basemap
  with the route/rider drawn as SVG on top; START button rebuilt at exactly 2x the real
  app's `RecordScreen.tsx` button (300px tall, 80px "START", `#F5C542`/`#17171b`); adds the
  "Ride your normal route." caption Nathan asked for back in idea-3 feedback.
- **gates-saving** (`hyperframes/gates-saving/index.html`) — same map; gates rebuilt as
  perpendicular ticks centred on the route (the app's actual representation), which retires
  the v1 "gates detach by up to 450px" bug as a side effect of rebuilding correctly, not as
  extra scope. Crossing a gate is a static colour swap (the real app has no gate-pulse
  animation — v1's pulsing was never faithful to the app).
- **ranking** (`hyperframes/ranking/index.html`) — same map, dimmed; rank fragment and
  timing tower rebuilt with consistent numbers throughout (v1 had a continuity bug: 4:05.3
  in the fragment vs 3:58.4 in the tower 3s later — now 16:41.3 everywhere) and a fixed
  rank-slot layout so the fragment can't show both rows as rank 1 during the swap (a v1 bug).
- **`hyperframes/_map/`** (new) — `map-capture.html`, a one-time page Nathan runs in Chrome
  to render the real OpenFreeMap "dark" style (the app's own tile source) at the exact
  framing the three scenes use, and save it as `map.png`. This mirrors the app's own
  fallback rendering path (`PngWayMap`) for when live map tiles aren't available — the
  same idea, applied to a pre-rendered video.
- Reference ride: `data/activities/TEST in virgin-app rides/qualifire-20260903/qualifire-20260903-1828.gpx`
  (Leuven, 5.8 km) — Nathan said any real ride or even a random location was fine; this one
  was picked as the most complete track available.
- Visual style pulled directly from the app's own source (`app/src/ui/wayMapView.tsx`,
  `RecordScreen.tsx`, `theme.ts`) rather than invented: exact colour palette, the
  casing+core line convention used for the route/gates/trail, and the real START button
  dimensions — all with file:line citations in the build brief, not guessed.
- `README.md`/`structure.md`/`COMMANDS.md` updated to point at the new sources and correct
  the stale `tour/index.html` claims.

## How it was built (model-tier protocol)
Digest (3x Sonnet, parallel) → Fable (design + brief) → Sonnet executor (landed all files) →
fresh Fable inspector (independently re-derived every check against the actual files and the
app's real source, not the executor's notes). The inspector found two small doc/display nits
(the OSM attribution line was visually dimmed under the map's darkening overlay; a couple of
"feedback goes to v1" pointers and one structure.md self-contradiction were stale) — both were
mechanical (<10 lines) and fixed directly by the coordinator rather than another subagent round.
No blocking defects were found; the inspector's verdict was "safe for Nathan to render as-is."

## Changes made
- 3 new compositions (`start-ride/index.html`, `gates-saving/index.html`, `ranking/index.html`).
- 1 new capture tool (`_map/map-capture.html` + `_map/README.md`).
- 3 new `rounds/v2/FEEDBACK.md` (with the beat-by-beat plan and a "flag for review" list, see
  Open items).
- `structure.md`, `COMMANDS.md`, and the three scene `README.md` files updated to match.

## Open items
Nothing could be rendered or previewed this session — `device_bash` (the bridge to Nathan's
PC) was unreachable the whole run, same blocker as cycle 01. Exact commands and the judgment
calls made without interrupting Nathan are in `OPEN-ITEMS.md`.

## Next
Cycle 03 starts once Nathan has run `_map/map-capture.html`, rendered all three scenes, and
given feedback on the v2 renders (or asked for changes to the judgment calls flagged in
`OPEN-ITEMS.md`).
