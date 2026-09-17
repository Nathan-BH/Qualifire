# Colours — Round v3

**Render file:** colours_v3.mp4 (rendered 2026-09-16, verified 19.000s/1920x1080/30fps via ffprobe)
**Duration planned:** 19.0 s (570 frames at 30 fps, 1920×1080, H.264)
**Composition source:** `../../index.html` (state as edited 2026-09-16)

## What changed (v2 -> v3)

- The bar chart is replaced by a 10-slot rank tower: rank 1 sits on top, ranks
  step down every 60 px, each slot is a plain 4 px rule (no date/time text) with
  its rank numeral (1-10, `--ink-dim`, 36px/800) to its left.
- A single persistent ride token (`#ride`) replaces the old per-tier `#nb-y` /
  `#nb-g` / `#nb-p` groups. It never fades between beats — it keeps its previous
  colour while climbing and flips colour instantly on landing (`tl.set` at
  `t0 + rise`), the same mechanic `ranking/` uses. It enters from a hidden 11th
  slot below row 10.
- Slot mapping is Nathan's example: the ride climbs P7 (yellow) -> P3 (green) ->
  P1 (purple). Rise durations stay 0.7 / 0.7 / 0.9 s, so every caption timestamp
  is bit-identical to v2 (4.9/5.3/8.6/9.0; 9.9/10.3/13.6/14.0; 15.1/15.5/18.6/19.0).
- The illustrative time label (42.7 -> 39.4 -> 37.1) is kept from v2, now as three
  stacked `#ride .time` labels toggled by opacity, swapping at each beat's
  departure (t0), before the climb.
- Rows the ride overtakes step down one slot (`ranking/`'s displacement
  mechanic): row 10 steps into the hidden 11th slot and fades out on beat 2
  (the yellow climb); rows 9/8/7 step down under it. Rows 6/5/4/3 step down
  under the green climb, rows 2/1 step down under the purple climb. Final frame:
  slot 1 = purple ride, slots 2-10 = former rows 1-9.
- The dashed "avg" marker is kept, sitting between slot 5 and slot 6 as before;
  its blink is retimed to 9.15 s (when the green ride's step-downs put it level
  with the marker), from v2's 9.7 s.
- Captions, caption timing, and the 19.0 s total duration are unchanged. The
  `.caption`, `.caption.second`, `.caption.tier` CSS and the `#cap2`-`#cap5`
  markup are byte-identical to v2.
- Markup for the tower is plain HTML divs (`#tower`, `.tnum`, `.trow`, `#ride`),
  mirroring `ranking/`'s approach, instead of v2's inline SVG. The old
  `svg.full-svg`, `.bar`, and SVG-flavoured `#avg`/`#avg-label` CSS and markup,
  and all JS referencing `#b1`-`#b10` / `#nb-y` / `#nb-g` / `#nb-p`, are removed.
- No map/route/rider and no second caption track beyond this composition's own
  below-figure caption — those aren't part of this composition and weren't
  touched.

## What to check

- The ride enters cleanly from below: nothing should be visible under slot 10
  before 4.0 s (the entry slot at y 770-830 sits clear of the caption band,
  900-1010).
- The step-down cascade should read as "overtaking," not jitter — each row
  eases down 60 px over 0.3 s as the ride passes it.
- Row 10's drop-off (fading out as it steps into the hidden 11th slot on the
  first climb) shouldn't be distracting.
- The colour pop on landing should read clearly at 4.7 s / 9.7 s / 14.9 s.
- The time-label swap at 9.0 s and 14.0 s should read as "here's the new ride's
  time," not a glitch.
- Final frame: purple ride at slot 1, all ten slots filled below it.
- Day theme (`-Theme day`) should still be legible — numerals, rules, avg
  marker and ride all use theme tokens.
- No overlap with the caption band (900-1010 px) at any point.

## Render

Rendered 2026-09-16 by Nathan (`render.ps1 -Name colours -Render`). Output
`colours_2026-09-16_23-31-30.mp4` copied into `colours\rounds\v3\colours_v3.mp4`
and `colours\all-renders\colours_v3.mp4` (superseding `colours_v2.mp4`, moved to
`Qualifire\_to_delete\colours_v2_superseded_by_v3.mp4`). ffprobe confirms
19.000s, 1920x1080, 30fps — matches plan exactly.

## Nathan's feedback
*(blank — write your notes below, overall or beat-by-beat)*
