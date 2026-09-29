# Cycle 25 — Rides + Ranking arrangement v3

## What this cycle implements (round 1)

Built `audio-studio/teaser/arrangements/arrangement_v3/arrangement_v3.json` per
Nathan's answers in `questionsfornathan.md` (reviewed in `REVIEW.md`):

- **0-31.26s: `option-A-piano-then-bed.json`'s clips, byte-for-byte unchanged**
  (logo, b-piano, b-drums, b-bass, b-other, e5) - the part Nathan confirmed is
  exactly right, including the piano phrase landing on the 9.2s ride-start entrance.
- **31.26s onward: the piano continues as one unbroken 12.26s-trim loop** (same
  technique already used in `option-B-piano-plus-stems.json`/`arrangement_v2.json`,
  ~0.15s seam fades), straight through past the render's end. No restart, no
  onset-alignment engineering - per Nathan's Q1 answer: the render/animation side is
  flexible, so get the piano looping properly first, adapt the animation to the
  music later.
- **b-drums + b-bass resume at 33.9s, drop at 42.5s** (gain 0.3, matching the
  rides-section convention) - the ranking->closing scene cut, current-timeline
  equivalent of `FEEDBACK-v1.md`'s 43.60s. This is the documented answer to
  Nathan's item 3 ("drums keep playing during part of the ranking tower visual"):
  `FEEDBACK-v1.md`'s "Ranking + closing" section rules "keep drums+piano+bass
  going... drop drums (and bass) right around the scene cut into closing."
  `b-other` is not part of that ruling and is not resumed.
- **e5 (gate chimes) left exactly as option-A had it** (one clip, 23.2-31.7s, gain
  1.0) - Q2 (drop the chimes, land gates on piano notes instead) is still open and
  deliberately untouched this round.

This is round 1 of 2 Nathan asked for: hear the loop + the ranking drums
resumption on the real kit before deciding anything about re-timing the render
itself (round 2, not started).

## How to listen

1. On your PC: `cd` into `audio-studio/tools/videotrack-mapper` and run `serve.ps1`
   (or open `videotrack-mapper.html` directly / drop the kit folder on the page).
2. Switch to `kitv3` if it doesn't load by default.
3. **Open arrangement** -> `audio-studio/teaser/arrangements/arrangement_v3/arrangement_v3.json`.

## Model-tier readout

| tier | model | tokens | outcome |
|---|---|---|---|
| coordinator (direct) | Sonnet (chat) | - | Read `option-A-piano-then-bed.json` + `FEEDBACK-v1.md`'s "Ranking + closing" ruling directly (small, targeted reads, not a bulk codebase scan); built `arrangement_v3.json` as a mechanical JSON assembly (~15 clips, no design judgment beyond what Nathan's answers + the existing documented ruling already settled) - under the chore threshold, no Digest/Plan/Execute/Inspect dispatch |

No render/mux needed this round - the tool plays the kit's wavs live against the
arrangement JSON, nothing is written to disk beyond the JSON itself.

## Still open (round 2, not started)

Q2 from `questionsfornathan.md`/`REVIEW.md`: whether to drop e5 entirely and land
(middle) gate crossings on piano notes, which means re-pacing `gates-saving`'s own
route timing (silent-studio side) - waiting on how round 1 sounds first.
