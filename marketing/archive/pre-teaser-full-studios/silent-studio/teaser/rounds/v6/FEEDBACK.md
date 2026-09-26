# Teaser — Round v6

**Render file:** teaser_v6.mp4 — not assembled yet (needs the three changed
ingredient renders from this cycle to exist first; none are rendered this
session — device_bash was unreachable).
**Duration (planned):** 47.600s, 1428 frames at 30fps, 1920x1080, no audio
(gates-saving_v5's 12.3s is now confirmed by an actual render; ranking_v5 and
closing_v3 are still estimates).
**Source:** ffmpeg concat of five standalone renders (concat.txt), same recipe as v5.

## Why a v6
Cycle 06 implements Nathan's recorded feedback on three of the five ingredients:
gates-saving -> `../../../gates-saving/rounds/v5/FEEDBACK.md`, ranking ->
`../../../ranking/rounds/v5/FEEDBACK.md`, brandmark/closing ->
`../../../brandmark/closing/rounds/v3/FEEDBACK.md`. The other two ingredients
(opening, start-ride) are unchanged this cycle and are re-used from v5's cut
(`opening_v3.mp4`, `start-ride_v4.mp4`).

## Cut sheet (planned — confirm every duration once the three new renders exist; if any ffprobe'd duration differs from planned, update this table and concat.txt's expected total before assembling)
| # | Ingredient | Source render | Length | Plays at |
|---|---|---|---|---|
| 1 | brandmark/opening | opening_v3.mp4 (unchanged) | 6.500s | 0:00.000-0:06.500 |
| 2 | start-ride | start-ride_v4.mp4 (unchanged) | 14.000s | 0:06.500-0:20.500 |
| 3 | gates-saving | gates-saving_v5.mp4 (new) | **12.300s (confirmed)** | 0:20.500-0:32.800 |
| 4 | ranking | ranking_v5.mp4 (new) | 10.800s (estimate) | 0:32.800-0:43.600 |
| 5 | brandmark/closing | closing_v3.mp4 (new) | 4.000s (estimate) | 0:43.600-0:47.600 |

Total: **47.600s** (1428 frames at 30fps) — gates-saving confirmed by an actual
render; ranking and closing still planned, not yet confirmed.

## What changed since v5
- gates-saving, ranking, brandmark/closing each replaced by their next round (see each composition's own FEEDBACK.md).
- opening and start-ride unchanged this cycle.
- Total duration 46.900s -> 47.600s (net +0.7s: +0.8s from ranking's climb mechanic
  needing more screen time, -0.1s because gates-saving's actual render came out
  12.3s rather than the 12.4s this doc originally (mistakenly) planned — closing's
  duration is unchanged).

## Recipe
`rounds/v6/concat.txt` (paths relative to this file's own folder) — see file in this same folder.

## Render on the PC (PowerShell, once all three new ingredient renders exist in their v-folders — run from teaser\rounds\v6\)
```powershell
ffmpeg -y -f concat -safe 0 -i concat.txt -vf "fps=30,scale=1920:1080,format=yuv420p" -c:v libx264 -crf 18 -preset medium -an teaser_v6.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 teaser_v6.mp4
```
(Same flags v5 used — see `../v5/FEEDBACK.md` or `../../README.md`'s v5 section if these ever need to change.)

## Nathan's feedback
<!-- write your notes below, overall or beat-by-beat -->
