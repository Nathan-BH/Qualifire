# Colours — Round v2

**Render file:** colours_v2.mp4 (not rendered yet)
**Duration planned:** 19.0 s (570 frames at 30 fps, 1920×1080, H.264)
**Composition source:** `../../index.html` (state as edited 2026-09-10)

## What changed since v1

- Removed the gate/route intro entirely (steps 1 & 2). The animation now starts
  directly on the chart building — beat 1 is 0–4 s instead of the old 0–5 s gate beat.
- Average is no longer added after the fact: the dashed avg line and its `avg` label
  now fade in at the same time the ten ride-lines stack in, during the chart build.
- Removed `best` entirely (both the dot and its label) — the dashed average line with
  its "avg" label is enough.
- Overall pacing tightened: each colour beat is now 5 s instead of 10 s, so nothing
  sits static for as long as it did in v1.
- Yellow caption is now exactly "Yellow is slower than your average." — the old
  second line ("Yellow just means the time was posted. Not a fail.") is gone.
- Green caption is now just "Faster than your average." (dropped "recent").
- Yellow now shows "Yellow." above "Yellow is slower than your average.", the same
  layout Nathan asked for on green — the coloured tier word sits above the
  explanatory line (new `.caption.tier` style, `top: 900px`), not below it as in v1.
- Green now shows "Green." above "Faster than your average." (previously the tier
  word sat below the explanatory text).
- Purple now shows "Purple." above "Faster than every one of your last ten." (same
  above/below fix as yellow and green; the explanatory text itself is unchanged).
- The rolling-window beat (v1's 45–55 s "the window rolls" caption + the best-dot/avg
  reshuffle animation) is removed from this composition entirely. It's a separate
  idea (the window resetting keeps things fun over time) and becomes its own
  standalone composition in a new folder — out of scope for this file. The v1 source
  with that code intact is snapshotted at `rounds/v1/index_v1-source.html` before
  this removal, so nothing is lost.
- The `#cap6` "Purple isn't a lifetime record. It's the new bar to beat." caption is
  removed entirely — it went with the rolling-window beat it belonged to.
- The end animation ("Purple is rare by design." + Q-mark + QUALIFIRE wordmark
  endcard) is removed entirely, along with its now-unused CSS (`.mark-wrap`,
  `.mark-wrap svg`, `.endword`, `.closing`). Purple now simply stays on the chart
  and the whole composition fades to black at the end.
- Fixed a latent v1 bug along the way: `.clip .inner { opacity: 0 }` applies to
  `#cap2 .inner`, and the v1 timeline never set `#cap2 .inner` to opacity 1 — so the
  "Your last ten rides through this sector." caption never actually showed on
  screen (the "8 s of dead air with no caption" v1 flagged). The v2 timeline now
  explicitly sets `#cap2 .inner` to opacity 1 at the start of beat 1.

## What you should see (four beats, 19.0 s total)

1. **0.0–4.0 s — Chart builds.** The ten ride-lines stack in from the bottom up,
   with the dashed average line and its "avg" label fading in alongside them. The
   caption "Your last ten rides through this sector." fades in and holds, then
   fades out by 4.0 s.
2. **4.0–9.0 s — Yellow.** A new ride's line rises from below into its slot below
   the average, turns yellow. "Yellow." appears above "Yellow is slower than your
   average.", holds, then the line and captions fade out.
3. **9.0–14.0 s — Green.** A new ride's line rises above the average, turns green;
   the dashed avg line blinks as the new line crosses it. "Green." appears above
   "Faster than your average.", holds, then fades out.
4. **14.0–19.0 s — Purple.** A new ride's line rises to the top of the chart, turns
   purple. "Purple." appears above "Faster than every one of your last ten." This
   time the purple line stays on the chart (no removal) — from 18.6 s the whole
   frame fades to black, ending at 19.0 s.

## Render

Not rendered yet. On the PC (PowerShell, from `marketing\hyperframes\`):
```
.\render.ps1 -Name colours -Render
```
then copy the newest `colours\renders\*.mp4` to `colours\rounds\v2\colours_v2.mp4` and confirm 19.0 s:
```
ffprobe -v error -show_entries format=duration -of csv=p=0 colours\rounds\v2\colours_v2.mp4
```

## Nathan's feedback
- 