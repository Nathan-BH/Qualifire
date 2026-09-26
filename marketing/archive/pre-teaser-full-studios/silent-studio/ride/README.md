# ride — the two product-scene rides as one deliverable (assembled)

`ride` is `start-ride` followed by `gates-saving`, back to back: the piece the ride soundtrack
is written against. Added 2026-09-23 (cycle 17) at Nathan's request — "the ride render should also
live in silent studio as it is now part of the project".

It is not an `index.html` render: it is an ffmpeg stream-copy concat of two ingredient renders,
like the teaser. There is no `index.html`, no `renders/`, no `theme.js` here (nothing to render).

## Cut sheet (v1 — rounds/v1/ride_v1.mp4, 26.3s)

| # | Ingredient | Source render | Length | Plays at |
|---|---|---|---|---|
| 1 | start-ride | start-ride_v4.mp4 | 14.000s | 0:00.000–0:14.000 |
| 2 | gates-saving | gates-saving_v9.mp4 | 12.300s | 0:14.000–0:26.300 |

Total: **26.300s** (789 frames at 30fps), built and confirmed by ffprobe. Recipe:
`rounds/v1/concat.txt` (relative paths, `ffmpeg -f concat -safe 0 -c copy`).

## Sound

The sound side lives in `../../audio-studio/ride/` (soundv2 = Tunetank bed on the older
gates-saving_v8 picture; soundv3 = the same master on this v1 picture, cycle 17 item C).

## Feedback rounds
| Round | Render | Date | Status |
|---|---|---|---|
| [v1](rounds/v1/FEEDBACK.md) | ride_v1.mp4 | 2026-09-23 | Built, 26.3s confirmed — start-ride v4 + gates-saving v9 (inverted gate easing) — current |
