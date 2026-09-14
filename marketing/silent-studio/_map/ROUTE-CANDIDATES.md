# Route candidates (2026-09-10)

Looked through every ride in `data/activities/TEST in virgin-app rides`. There are 5 GPX
files, but they are **not 5 different routes** — 4 of them trace the same home&harr;work
commute (same road, just recorded in each direction / at different times of day). Only one
ride actually diverges onto a different path.

| Ride | Date/time | Distance | Shape |
|---|---|---|---|
| `qualifire-20260901-0917.gpx` | Mon 09:17 | 5.75 km | same commute, home&rarr;work |
| `qualifire-20260901-1917.gpx` | Mon 19:17 | 5.76 km | same commute, work&rarr;home |
| `qualifire-20260903-1828.gpx` | Wed 18:28 | 5.80 km | same commute, work&rarr;home — **this is the route already used in the v2 renders** |
| `qualifire-20260904-0916.gpx` | Thu 09:16 | 5.74 km | same commute, home&rarr;work |
| `qualifire-20260904-2144.gpx` | Thu 21:44 | 5.91 km | **different** — per Nathan's own notes for that day, he deleted the old WorkHome route and re-recorded it that evening ("Wet"); it follows a different loop for roughly the back half of the ride |

So within this dataset there are really only **two visually distinct shapes** to choose
between, not five. Both are previewable now:

- `route-current_0903-1828.html` — the route already in production (start-ride / gates-saving
  / ranking v2 today).
- `route-alt-wet-loop_0904-2144.html` — the one genuinely different shape available, with an
  extra loop.

Both files are just a plain pannable/zoomable MapLibre view of the route at the same
bearing:180 framing the real scenes use — open either in Chrome to look at it. They are
**preview-only** (no map.png capture button, no gates/sectors tuned) — just for picking a
shape. `_map/map-capture.html` is still the actual capture tool for whichever route wins.

If neither shape is what you want for marketing (e.g. something more scenic, more turns, a
loop that returns to the start), this dataset won't give you that — all 5 recordings are the
same commute. Options at that point: record a new reference ride, or point me at a public GPX
trace / different city to build the projection from instead.

Once you pick one, say so and I'll fold its `MAP_CENTER` / `MAP_ZOOM` / `ROUTE` into
`_map/map-capture.html` and the three scene `index.html` files (gates/sector placement would
need re-tuning for whichever route wins, same as was done for the current one).
