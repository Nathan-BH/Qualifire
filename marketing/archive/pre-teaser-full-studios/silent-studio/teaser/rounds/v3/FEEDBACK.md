# Teaser — Round v3

**Render file:** teaser_v3.mp4
**Duration:** 110.500s (3315 frames at 30fps, 1920x1080, H.264 crf 18, no audio)
**Source:** ffmpeg concat of six standalone ingredient renders (re-encoded for a clean concat, not `-c copy` — v2's copy-concat left a couple of harmless-but-avoidable non-monotonic-DTS warnings at one seam).

## Why a v3
v2 was a skeleton: its start-ride/gates-saving/ranking beats were cut from the old
`tour_2026-09-09_23-16-48.mp4` render — the pre-map version, before the real-map + 2x
START button rebuild. v3 replaces those three beats with the current, rotation-corrected
v2 renders of the now-standalone start-ride/gates-saving/ranking compositions. Everything
else (opening, colours, closing) is unchanged from v2.

## What you see, in order
| # | Ingredient | Source render | Length | Plays at |
|---|---|---|---|---|
| 1 | brandmark/opening | opening_v1.mp4 (own composition, full) | 5.0s | 0:00.0–0:05.0 |
| 2 | start-ride | start-ride_v2.mp4 (rotation-corrected, full) | 13.0s | 0:05.0–0:18.0 |
| 3 | gates-saving | gates-saving_v2.mp4 (rotation-corrected, full) | 14.8s | 0:18.0–0:32.8 |
| 4 | ranking | ranking_v2.mp4 (rotation-corrected, full) | 15.2s | 0:32.8–0:48.0 |
| 5 | colours | colours_v1.mp4 (own composition, full) | 60.0s | 0:48.0–1:48.0 |
| 6 | brandmark/closing | closing_v1.mp4 (own composition, full) | 2.5s | 1:48.0–1:50.5 |

Note the beat durations for #2-#4 happen to match v2's planned lengths for those beats
exactly (13.0s / 14.8s / 15.2s) — the standalone compositions were built to the same
timing, so this is a straight swap, not a re-cut.

One real change from v2's approach: v2 trimmed the colours beat to 55.0s (0-55.0s of the
purple render); v3 uses colours' own standalone v1 render in full (60.0s), since that's
now its own composition with its own in/out points. If 55.0s was a deliberate trim (not
just matching an old file boundary), say so and this can go back to a 55.0s cut.

## What's still not touched here
- `index.html` in this folder is still the old, unrelated 11.2s brand-teaser composition
  (ring/wordmark/sector-cards/tower/endcard) — it does not produce this assembled video
  and was not part of this round's scope.
- brandmark (opening/closing) and colours are still on v1 — only start-ride/gates-saving/
  ranking got the map/button rebuild. If those should also get another pass, that's a
  separate round.

## Nathan's feedback
*(blank — write your notes below, overall or beat-by-beat)*

-
