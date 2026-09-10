# 02 — Start Ride — Round v4

**Render file:** start-ride_v4.mp4 (not rendered yet — device_bash was unreachable this session).
**Duration (planned):** 14.000s (420 frames at 30fps, 1920x1080, no audio).
**Source:** ../../index.html.

## What changed since v3
- START button subtitle ("the clock runs from here") removed; START text centred in the (unchanged) button box.
- 1.0s black lead-in added (0.4s hold + 0.6s reveal) so there's a blank beat between opening's fade-out and this scene's fade-in; every v3 beat shifted +1.0s via a single shiftChildren call.
- SECTOR_COLORS updated to green-yellow-purple-green for consistency with gates-saving/ranking (invisible here — sectors stay opacity 0 in this scene).
- Duration 13.0s -> 14.0s.

## What you'll see, in order
1. 0.0-0.4 — Black hold.
2. 0.4-1.0 — Reveal from black.
3. 1.0-4.0 — Overview map, rider at start under a dim; START button (centred, no subtitle) fades in, cursor glides onto it and presses in sync at 3.2s, both fade out with the dim.
4. 3.8-5.1 — Camera pushes in from overview to 2x on the start of the route.
5. 4.6 — Caption "Ride your normal route." fades in.
6. 5.3-13.8 — Route draws behind the rider at constant speed; camera follows the rider along the route.
7. 13.8-14.0 — Hold at the finish; caption fades.

## Things to check in the render
- Basemap crispness at 2x (carried from v3, unverified — map.png is captured at pixelRatio:2 so 2x should be native resolution).
- Tint strength rgba(10,10,10,0.25) (carried judgment call from v3).
- Cursor path/timing, now landing its press at 3.2s instead of 2.2s (carried from v3, just shifted).
- Button box now looks a bit tall for one centred line since the subtitle's vertical space is empty — flag if it should shrink (kept it unchanged on purpose so the cursor's press point stays valid).
- 0.6s black-reveal speed — first time this composition opens on black.

## Render on the PC (PowerShell, from marketing\hyperframes\)
```
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name start-ride -Render
```
then copy the newest `start-ride\renders\*.mp4` to `start-ride\rounds\v4\start-ride_v4.mp4` and confirm 14.0s:
```
ffprobe -v error -show_entries format=duration -of csv=p=0 start-ride\rounds\v4\start-ride_v4.mp4
```

## Nathan's feedback
<!-- write your notes below, overall or beat-by-beat -->
