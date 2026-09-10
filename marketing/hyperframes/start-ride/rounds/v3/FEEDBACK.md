# 02 — Start Ride — Round v3

**Render file:** start-ride_v3.mp4 — not rendered yet. Built 2026-09-10 without a shell on Nathan's PC;
Nathan renders it and copies the MP4 here.
**Duration (planned):** 13.0s at 30fps, 1920x1080, no audio.
**Source:** `../../index.html`.

## What changed since v2
- **Virtual cursor.** A white pointer-arrow SVG in the `#ui` layer fades in at 0.9s, glides onto the
  START button from 1.0-1.9s, presses in sync with the button's existing press at 2.2s (scale 0.85 ->
  1), and fades out with the button at 2.55-3.0s. Nathan's note was that the button being pressed with
  no visible input looked odd — the cursor now supplies that input.
- **Uniform tint replacing the bottom scrim.** `#scrim-bottom` (a gradient to 92% black over y 780-1080)
  is gone. In its place, `#tint` — a flat `rgba(10,10,10,0.25)` layer sitting between the basemap and the
  SVG — tones the whole map evenly, so the route/rider are never dimmed differently at the ride's start
  than anywhere else on the map.
- **2x camera that follows the rider.** A `#cam` wrapper now holds the basemap + tint + SVG as one
  layer. It starts at scale 1 (full overview) during the START beat, pushes in to scale 2.0 (map.png's
  native pixelRatio:2 resolution, so no upsampling) from 2.8-4.1s as the START overlay clears, and during
  the ride (4.3-12.8s) its centre tracks a symmetric +/-5% moving average of the route around the rider's
  position — smooth, zero lag — clamped so the frame never shows past the basemap's edge. This is all a
  CSS transform on `#cam`; `map.png`, `MAP_CENTER`, `MAP_ZOOM`, `ROUTE`, `GATES`, and `SECTOR_COLORS` are
  byte-for-byte unchanged (still shared with gates-saving and ranking's v2 framing).
- **Stroke sizes reduced for the 2x frame.** `#route-casing` 10 -> 7, `#route-core` 6 -> 4, `#rider`
  r 11 -> 7 and stroke-width 3 -> 2, so at 2x zoom they read as "app x 2" (matching the START button's
  existing 2x treatment) rather than 3x oversized. Sectors/gates/rings are untouched (all opacity 0 in
  this scene).

## What you should see, in order (planned — verify against the render)
1. 0.0-3.0 — Overview map with the rider at the start under a dim; START button fades in, cursor glides
   onto it and presses in sync at 2.2s, both fade out with the dim.
2. 2.8-4.1 — Camera pushes in from overview to 2x on the start of the route.
3. 3.6 — Caption "Ride your normal route." fades in.
4. 4.3-12.8 — Route draws behind the rider at constant speed; camera follows the rider along the route.
5. 12.8-13.0 — Hold at the finish; caption fades.

## Nathan's feedback
- I would remove the "the clock runs from here" text on the yellow button. The START text can then also be more centered
- the rest I like for now.
- for the teaser I would again leave an empty frame before this animation starts(so after the "opening" ends), this way there is a blank between the previous fading out and this fading in

## Things to check in the render
- **Basemap crispness at 2x.** `map.png` is captured at `pixelRatio: 2` (3840x2160) so `#cam` scale 2.0
  is native resolution, not upsampled — but if the compositor rasterizes the frame below that
  resolution before the CSS transform is applied, the basemap could still look soft at full zoom. If it
  looks soft in the render, report it — it may need a higher compositor raster scale.
- **Tint strength.** `rgba(10,10,10,0.25)` on `#tint` is a judgment call for "uniform but still legible
  map" — turn it up or down if it reads too dark/too washed-out.
- **Cursor path/timing.** The cursor's start point (1290, 790), its glide path onto the button, and its
  timing (fade in 0.9s, glide 1.0-1.9s, press at 2.2s with the button) are a judgment call — adjust if
  the glide reads too fast/slow or the start position looks arbitrary.

## Render on the PC (if not rendered)
```
Render on the PC (PowerShell, from marketing\hyperframes\):
  .\render.ps1 -Name start-ride -Render
then copy the newest start-ride\renders\*.mp4 to start-ride\rounds\v3\start-ride_v3.mp4 and confirm 13.0 s:
  ffprobe -v error -show_entries format=duration -of csv=p=0 start-ride\rounds\v3\start-ride_v3.mp4
```
