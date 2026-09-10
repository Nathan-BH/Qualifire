# Teaser — Round v4

**Render file:** teaser_v4.mp4 — **built** (Nathan ran the commands below on his PC after
`device_bash` remained unreachable this session).
**Duration (confirmed):** 64.800000s, 1944 frames at 30fps, 1920x1080, H.264 crf 18, no
audio — ffprobe-confirmed, matches the planned total exactly.
**Source:** ffmpeg concat of six standalone renders, re-encoded (not `-c copy`).

## Why a v4
v3 already swapped in the standalone real-map renders for start-ride/gates-saving/ranking.
v4 is Nathan's first feedback pass applied to five of those six ingredients — opening,
start-ride, gates-saving, ranking, and colours all get new renders (see each
composition's own `rounds/vN/FEEDBACK.md` for exactly what changed: opening →
`brandmark/opening/rounds/v2/FEEDBACK.md`, start-ride → `start-ride/rounds/v3/FEEDBACK.md`,
gates-saving → `gates-saving/rounds/v3/FEEDBACK.md`, ranking → `ranking/rounds/v3/FEEDBACK.md`,
colours → `colours/rounds/v2/FEEDBACK.md`). `brandmark/closing` is unchanged — still v1.

v3's durations (5.0/13.0/14.8/15.2/60.0/2.5) did not all hold: opening grew to 5.5s,
ranking shrank to 10.0s, and colours shrank to 19.0s (gates-saving and closing unchanged).
The lengths below are Nathan's own ffprobe measurements, confirmed again by the built
`teaser_v4.mp4`'s total duration and frame count matching exactly.

## What you'll see, in order (confirmed)
| # | Ingredient | Source render | Length | Plays at |
|---|---|---|---|---|
| 1 | brandmark/opening | opening_v2.mp4 (own composition, full) | 5.5s | 0:00.0–0:05.5 |
| 2 | start-ride | start-ride_v3.mp4 (own composition, full) | 13.0s | 0:05.5–0:18.5 |
| 3 | gates-saving | gates-saving_v3.mp4 (own composition, full) | 14.8s | 0:18.5–0:33.3 |
| 4 | ranking | ranking_v3.mp4 (own composition, full) | 10.0s | 0:33.3–0:43.3 |
| 5 | colours | colours_v2.mp4 (own composition, full) | 19.0s | 0:43.3–1:02.3 |
| 6 | brandmark/closing | closing_v1.mp4 (own composition, full, unchanged from v3) | 2.5s | 1:02.3–1:04.8 |

Total: **64.8s** (1944 frames at 30fps) — ffprobe-confirmed on the built file.

## Recipe

`rounds/v4/concat.txt` (paths relative to this file's own folder):
```
file '../../../brandmark/opening/rounds/v2/opening_v2.mp4'
file '../../../start-ride/rounds/v3/start-ride_v3.mp4'
file '../../../gates-saving/rounds/v3/gates-saving_v3.mp4'
file '../../../ranking/rounds/v3/ranking_v3.mp4'
file '../../../colours/rounds/v2/colours_v2.mp4'
file '../../../brandmark/closing/rounds/v1/closing_v1.mp4'
```

Nathan ran this from `teaser\rounds\v4\`:
```
ffmpeg -y -f concat -safe 0 -i concat.txt -vf "fps=30,scale=1920:1080,format=yuv420p" -c:v libx264 -crf 18 -preset medium -an teaser_v4.mp4
```
Result: frame=1944, `time=00:01:04.73` (=64.73s of encoder-reported wall time; ffprobe's
`format=duration` on the finished file reads **64.800000s**, the authoritative figure —
matches the six-part sum exactly).

## Nathan's feedback

*(blank — write your notes below, overall or beat-by-beat)*

- remove the colours section of this render, I feel like it does not belong in the teaser.
