# 05 — Colours — Round v1

**Render file:** colours_v1.mp4
**Duration:** 55.000s (1650 frames at 30fps, 1920x1080, H.264, no audio)
**Source cut:** purple_2026-09-09_18-09-50.mp4, frames 0-1649 (0.000-55.000s of the source); re-encoded with ffmpeg 6.1.1/libx264 crf 18. Not a HyperFrames render.
**Position in teaser v2:** 48.033-103.033s of the full skeleton

## What it's for
The full purple/colour-tier explainer (confirmed by Nathan: "in the teaser which is everything together i would include the colour explanation video") — why purple is rare, told entirely through the chart of your last ten rides through a sector.

## What you see, in order
(Reproduced verbatim from `hyperframes/purple/rounds/v1/FEEDBACK.md`, beats 1-8 — accurate for 0-55s of this source. Beat 9, the purple endcard, is not included in this cut.)

1. **0.0–1.5 s — Route draws, gate appears.** A single thin white horizontal line draws left-to-right across the centre of the frame (about a quarter of the frame wide, x ≈ 600–1320), starting as a dot at 0.0 s and fully drawn by ~1.0 s. At ~1.5 s a short vertical white tick pops in at the line's midpoint: the gate.
2. **2.0–4.8 s — Gate caption.** Caption line 1 fades in at ~2.0 s: *"Every sector has a gate. Gates never change colour."* Line 2, *"Only your time through them does."*, fades in ~2.5 s and is fully bright by 3.0 s. Route, gate and both caption lines hold, then fade together from ~4.7 s and are gone by 5.0 s. (Matches the planned 0–5 s beat.)
3. **5.0–7.5 s — Chart builds.** At 5.0 s the first thing to appear is a lone grey dashed horizontal line (the average) — nothing else on screen. From 5.5 s solid white lines stack in around it: 3 lines at 5.5 s, 7 at 6.0 s, all ten by 6.5 s. Each ride is an identical-length horizontal white line; vertical position encodes sector time (faster = higher). The `avg` label appears at the right end of the dashed line at ~7.0 s; a small white dot with the label `best` appears at the right end of the topmost line at ~7.5 s. At rest the pack is 10 white lines with the dashed avg sitting between the 5th and 6th line from the top. There are no axis values, no ride numbers, no dates — the lines are unlabelled.
4. **7.5–15.5 s — Chart holds, no caption.** The completed chart sits completely static for about 8 seconds with no text on screen at all. This is the plan's 5–15 s "the chart" beat, but nothing explains what the chart is — no caption, no voiceover cue — so it reads as dead air. (Flagging for you.)
5. **15.5–24.5 s — Yellow ride lands.** At 15.5 s a bold white numeral `42.7` appears to the left of the pack with a new white line at the bottom of the chart (below all ten); it slides up over ~0.5 s to settle as the 9th line from the top (well below the dashed avg). At ~16.5 s both the line and the numeral turn yellow — a warm amber (#f5c235) — and the caption *"Slower than your recent average."* fades in. At ~17.5–18.0 s a second, slightly dimmer caption line fades in: *"Yellow just means the time was posted. Not a fail."* This state holds to ~24.5 s, when the yellow line, its numeral and both caption lines fade out together; by 25.0 s the chart is back to the plain ten white lines. (Plan said 15–25 s: matches. Colour does turn yellow as planned.)
6. **25.5–34.5 s — Green ride lands.** At 25.5 s `39.4` appears in white with a line entering at about the avg level, rises and settles ~4th from the top by 26.0 s, comfortably above the dashed avg but three lines below `best`. At ~26.5 s the line and numeral turn a mint green (#37eaa8) and *"Faster than your recent average."* fades in. At ~27.5–28.0 s the word *"Green."* fades in beneath it, set in the same green. Holds to ~34.5 s, then everything for this ride fades out; back to ten white lines at 35.0 s. (Plan said 25–35 s: matches. Note that the yellow ride was already removed before the green one arrives — the pack never grows past 11, and no previous ride stays.)
7. **35.5–44.5 s — Purple ride lands.** At 35.5 s `37.1` appears in white with a line at about avg level; by 36.0 s it has risen *above* the top (`best`) line — it's now the highest line on the chart, sitting above the best dot, which stays on the old top line. At ~36.5 s the line and numeral turn purple (#ac60f8, a saturated violet). Caption *"Faster than every one of your last ten."* fades in at ~37.0 s; *"Purple."* in purple fades in beneath it at ~37.5–38.0 s. Holds to ~44.5 s, when the two caption lines fade out — but this time the purple line and numeral stay on the chart. (Plan said 35–45 s: matches. Again the green ride was removed before purple arrived.)
8. **46.0–54.5 s — Window rolls.** With the purple `37.1` line still at the top, the caption *"Next ride, the window rolls. Always your last ten."* fades in at 46.0 s. Then in quick succession: ~46.5 s the bottom line of the pack (the slowest, lowest one) starts dimming and is gone by 47.0 s; the `best` dot/label on the old top line blinks out at ~46.75 s and reappears at ~47.25 s at the right end of the purple `37.1` line; a second caption line fades in at ~47.25 s: *"Purple isn't a lifetime record. It's the new bar to beat."*; from ~47.5 s the dashed `avg` line eases upward (it climbs roughly 45 px, from between lines 5/6 to between lines 4/5), settling by ~49.5 s; and at ~48.5 s the purple line and the `37.1` numeral turn white, so the ride becomes visually just one of the ten. Final state: ten white lines with `37.1` now labelled at the top with the `best` dot, dashed avg higher than before. Holds static to ~54.5 s, then everything fades; blank by 55.0 s. (Plan said 45–55 s: essentially matches, starts ~1 s late. One thing to look at: the line that drops is the *bottom* one, i.e. the slowest time — because vertical position encodes time, not recency, there's no visual cue that it's the *oldest* ride that leaves.)

## Known issues carried over from the source
- 7.5-15.5s is a silent, static chart (dead air).
- The yellow and green example rides are each removed once the next one lands rather than accumulating.
- The ride that drops during the window-roll is the slowest one shown, not necessarily the oldest.

## What you hear
Nothing — no audio stream.

## Nathan's feedback
*(blank — write your notes below, overall or beat-by-beat)*

-
