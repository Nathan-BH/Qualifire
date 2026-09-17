# Colours — Round v4

**Render file:** colours_v4.mp4 (rendered 2026-09-16, verified 19.000s/1920x1080/30fps via ffprobe)
**Duration planned:** 19.0 s (570 frames at 30 fps, 1920×1080, H.264)
**Composition source:** `../../index.html` (state as edited 2026-09-16)

## Nathan's feedback on v3

> The animation is good but the layout is not what i had in mind. I wanted to
> use the "actual ranking tower" from ranking_v7.mp4. With the dates and times
> associated. And that the "today" ride, is the one that goes through the
> three positions like the current colours_v3.mp4 does.

## What changed (v3 -> v4)

- The generic blank-rule tower (`#tn-N` numerals, `.trow .rule` bars, `#ride`)
  is replaced by the real ranking tower ported verbatim from `ranking/`: the
  card chrome (`.card`, rounded corners, border), the header row ("Last ten
  rides" / "this route"), the `.tnum`/`.trow`/`.who`/`.time`/`.today` markup
  and CSS, and card geometry (`#tower` left:560 top:110 width:800 height:700).
- The ten static rows now show ranking's real dates and times, verbatim and
  in the same order (Mon 17:02.8 through 12 Aug 18:48.1); 12 Aug fades out
  during the first climb (4.05-4.35s), same as v3's row-10 behaviour.
- "Today" is the climber, exactly as in v3: it enters hidden at slot 11
  (top:600px, opacity 0), fades in at t=4.0 while immediately climbing to
  rank 7 (yellow), then rank 3 (green) at t=9.0, then rank 1 (purple) at
  t=14.0 — same beat timings, same rise durations (0.7/0.7/0.9s), same
  colour-flip-on-landing mechanic (`tl.set` at t0+rise) as v3.
- Today's three times are now real mm:ss.d values chosen to land correctly
  at each new rank against the real row times: 18:01.3 (rank 7, between
  26 Aug 17:55.4 and 24 Aug 18:07.1), 17:19.4 (rank 3, between Sat 17:15.0
  and 3 Sep 17:24.6), 16:58.2 (rank 1, faster than Mon's previous-best
  17:02.8). Time text still swaps at each climb's departure (4.0 already
  shows t1; swap at 9.0 and 14.0), same `showTime` pattern as v3.
- Row displacement still uses absolute `top` tweens to explicit slot
  destinations (cumulative three-climb state) — this is unchanged from v3
  (v3 already tweened `top`, not `y`; corrected here after the inspector
  caught the wrong claim). Only the row markup/content changed, not the
  displacement mechanic.
- The avg marker is kept, recomputed for the real ten-ride mean (17:52.7,
  which falls between 29 Aug and 26 Aug, i.e. between slot 5 and slot 6 —
  same position as v3). The dashed line stays inside `.rows` (top:299px);
  the "avg" label is now placed just outside the card's right edge
  (`#tower`-relative left:824px, top:369px) since the real row content now
  fills the width the label used to sit in. Same 9.15s blink retained.
- Beat-1 build (0-4s) now fades in the whole card (0.3->0.7) plus all ten
  rows sliding in (opacity/x -24, 0.35s, staggered 0.80+r*0.15, last row
  finishing at 2.5s) and the avg line/label fading in 1.2s from 2.2s
  (finishing 3.4s, before Today enters at 4.0s) — restaged from v3's
  numeral+rule build to fit the real row markup, but the overall build
  envelope (card+rows+avg all settled before 4.0s) is unchanged in spirit.
- Captions, caption timing, caption CSS (`.caption`/`.caption.second`/
  `.caption.tier`), and the 19.0s total duration are byte-identical to v3
  (verified by diff against the pre-edit live file).
- Nothing from ranking's map/route/rider/start-button/day-basemap layers
  was ported — only the card/tower chrome and row markup.

## What to check

- Card fully replaces the old bare tower: chrome, header, and all ten real
  rows should be visible and legible before Today enters at 4.0s.
- Today's colour pop on landing should read clearly at 4.7s / 9.7s / 14.9s,
  same as v3.
- The avg label sitting just outside the card's right edge should look
  intentional, not like an overflow/clipping artifact.
- No overlap with the caption band (900-1010px) at any point — card bottom
  is at abs y 810, so there should be 90px clear (44px clear was the stated
  minimum).
- Final frame: Today (purple) at rank 1, the nine surviving real rows
  (Mon through 19 Aug) filling ranks 2-10 below it — 12 Aug has dropped off
  by then (it fades out during 4.05-4.35s, mid-climb on the first beat, not
  exactly "at" the landing instant).
- Day theme (`-Theme day`) should still be legible with the ranking card
  chrome tokens.

## Open questions

- None blocking. The avg label is placed outside the card's right edge
  (#tower-relative left:824px) rather than inside it, because the real row
  content (who/time text) now occupies the width v3's blank rule used to
  leave free for an inside label — confirm this looks right on render.

## Render

Rendered 2026-09-16 by Nathan (`render.ps1 -Name colours -Render`). Output
`colours_2026-09-17_00-01-35.mp4` copied into `colours\rounds\v4\colours_v4.mp4`
and `colours\all-renders\colours_v4.mp4` (superseding `colours_v3.mp4`, moved to
`Qualifire\_to_delete\colours_v3_superseded_by_v4.mp4`). ffprobe confirms
19.000s, 1920x1080, 30fps — matches plan exactly.
