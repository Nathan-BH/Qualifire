# Teaser — Round v5

**Render file:** teaser_v5.mp4 — not assembled yet (needs all five ingredient renders to exist first; none are rendered this session — device_bash was unreachable).
**Duration (planned):** 46.900s, 1407 frames at 30fps, 1920x1080, no audio.
**Source:** ffmpeg concat of five standalone renders (concat.txt), re-encoded (not -c copy, matching v4's approach).

## Why a v5
Round 04 second-feedback-pass applies Nathan's recorded feedback across all six FEEDBACK.md sheets from round 03. Five of the six ingredients get new renders (see each composition's own FEEDBACK.md for exactly what changed): opening -> brandmark/opening/rounds/v3/FEEDBACK.md, start-ride -> start-ride/rounds/v4/FEEDBACK.md, gates-saving -> gates-saving/rounds/v4/FEEDBACK.md, ranking -> ranking/rounds/v4/FEEDBACK.md, closing -> brandmark/closing/rounds/v2/FEEDBACK.md (first-ever standalone render of this composition). The sixth ingredient, colours, is DROPPED from this cut per Nathan's v4 feedback — the composition itself is untouched and still exists at colours/rounds/v2/, it simply no longer plays in the teaser.

## Cut sheet (planned — confirm every duration once the five renders exist; if any ffprobe'd duration differs from planned, update this table and concat.txt's expected total before assembling)
| # | Ingredient | Source render | Length | Plays at |
|---|---|---|---|---|
| 1 | brandmark/opening | opening_v3.mp4 | 6.500s | 0:00.000-0:06.500 |
| 2 | start-ride | start-ride_v4.mp4 | 14.000s | 0:06.500-0:20.500 |
| 3 | gates-saving | gates-saving_v4.mp4 | 12.400s | 0:20.500-0:32.900 |
| 4 | ranking | ranking_v4.mp4 | 10.000s | 0:32.900-0:42.900 |
| 5 | brandmark/closing | closing_v2.mp4 | 4.000s | 0:42.900-0:46.900 |

Total: **46.900s** (1407 frames at 30fps) — planned, not yet confirmed by an actual build.

## What changed since v4
- Colours section removed from the cut (was 19.0s, 0:43.3-1:02.3 in v4) — Nathan: "I feel like it does not belong in the teaser."
- Every other ingredient replaced by its next round (see each composition's own FEEDBACK.md).
- Total duration 64.8s -> 46.9s (-17.9s net: -19.0 colours, +1.0 opening, +1.0 start-ride, -2.4 gates-saving, +0 ranking, +1.5 closing).

## Recipe
`rounds/v5/concat.txt` (paths relative to this file's own folder) — see file in this same folder.

## Render on the PC (PowerShell, once all five ingredient renders exist in their v-folders — run from teaser\rounds\v5\)
```
ffmpeg -y -f concat -safe 0 -i concat.txt -vf "fps=30,scale=1920:1080,format=yuv420p" -c:v libx264 -crf 18 -preset medium -an teaser_v5.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 teaser_v5.mp4
```
(Mirror the exact ffmpeg flags v4 actually used — check `teaser/README.md`'s v4 section or v4's own FEEDBACK.md for the precise command Nathan ran, and use the same flags here; the block above is v4's recorded command as a starting point.)

## Nathan's feedback
<!-- write your notes below, overall or beat-by-beat -->
