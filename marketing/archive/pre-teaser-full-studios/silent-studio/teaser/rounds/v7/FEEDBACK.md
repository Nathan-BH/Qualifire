# teaser — round v7

**Render:** `teaser_v7.mp4`, 47.6s (matches the five-part sum exactly, confirmed
by ffprobe), plain `ffmpeg -f concat -c copy` of the five current ingredient
renders (all h264/1920x1080/30fps, so a stream copy was safe — no re-encode).

## Cut sheet (v7 — current)

| # | Ingredient | Source render | Length | Plays at |
|---|---|---|---|---|
| 1 | brandmark/opening | opening_v3.mp4 | 6.500s | 0:00.000–0:06.500 |
| 2 | start-ride | start-ride_v4.mp4 | 14.000s | 0:06.500–0:20.500 |
| 3 | gates-saving | gates-saving_v6.mp4 | 12.300s | 0:20.500–0:32.800 |
| 4 | ranking | ranking_v6.mp4 | 10.800s | 0:32.800–0:43.600 |
| 5 | brandmark/closing | closing_v4.mp4 | 4.000s | 0:43.600–0:47.600 |

Total: **47.600s** (1428 frames at 30fps) — built and confirmed.

## What changed since v6

Only the visual fixes from virgin-cycle9: gates-saving and ranking no longer
thicken the route line on sector scoring and their gate ticks stay white; ranking's
climb eases fast-then-slow and shows only one caption, with its P2 finish coloured
green (was purple); closing now reuses opening's wordmark + tagline beat instead of
its own mark-draw. Opening and start-ride are byte-identical to v6 (v3/v4
respectively, untouched this cycle).

## Not yet done

- Ranking still needs one more visual change per Nathan's latest request (the
  climbing row should come up white and only turn green on landing in slot 2,
  not green throughout the climb) — that will mean a ranking v7 render and a
  teaser v8 concat once it lands. This v7 teaser is a real, current preview of
  everything else, just not that one last tweak.
- Audio: this concat is picture-only (no ingredient audio was carried over —
  `all-renders/`'s with-sound files are per-scene, not assembled into a
  with-sound teaser yet; that's a separate follow-up if/when Nathan wants one).
