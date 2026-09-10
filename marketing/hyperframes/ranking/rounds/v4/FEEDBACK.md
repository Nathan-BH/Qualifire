# 04 — Ranking — Round v4

**Render file:** ranking_v4.mp4 (not rendered yet — device_bash was unreachable this session).
**Duration (planned):** 10.000s (300 frames at 30fps, 1920x1080, no audio — unchanged from v3).
**Source:** ../../index.html.

## What changed since v3
- Rank-card beat removed entirely — goes straight to the timing tower.
- Tower now opens showing the 10 rides BEFORE today (Mon...12 Aug, the last one synthesised: 19 Aug's time + 0:14.6, one week older), same row-fill-in animation style as before, just moved earlier (0.8-2.5s instead of 5.9-7.6s).
- At 3.0s, a new "Today" row slides into slot 2 (between Mon at P1 and Sat, now pushed to P3): old P10 (12 Aug) fades out and drops off; rows 2-9 shift down one slot. Today's displayed time (17:08.9) was synthesised as the midpoint between the old P1/P2 times specifically so it lands at P2, rather than reusing the old card's 16:41.3 (which was faster than everyone and would have ranked #1, not #2) — flagging this as a judgment call since Nathan's example data was never meant to be realistic.
- "P1 of 10" chip dropped along with the card — no replacement.
- Caption windows moved earlier (A: 4.6-6.8, B: 7.2-10.0) to fit after the earlier tower sequence.
- SECTOR_COLORS updated to green-yellow-purple-green (affects only this scene's small map gate ticks, not the tower).
- your/selfs emphasis swapped from v3: now "your" bold-not-italic, "selfs" italic-not-bold.

## Row-reorder mechanic — how it was actually built
The brief assumed the tower's `.trow` rows carried an inline rank number (`<span class="rk">`) and used
an 88px row pitch (carried over from `#rank-card`'s `.rrow`). Neither held once I checked the file:

- **Row pitch is 60px, not 88px.** `.trow { height: 60px }` with no margin/gap between rows — 88px was
  only ever the rank-card's `.rrow` height+gap, a different, taller row style used nowhere in the tower.
  All vertical tweens (the slot-in push, the drop-out, Today's entrance) use `y: 60`.
- **Rank numbers had to be decoupled from row content, not kept inline.** If the rank digit stays baked
  into each row's markup (as the brief's literal `<span class="rk">N</span>` suggested), then after the
  slide the "Sat" row — still carrying its original rk="2" — would end up sitting in slot 3 while Today's
  row also shows "2": two rows reading the same rank simultaneously mid-animation. This is exactly the
  bug `#rank-card` was already built to avoid (see its code comment: "Rank numbers are fixed to the row
  slots, so the two rows can never both read '1'"). So the tower now follows that same pattern: ten fixed
  `.tnum` numeral elements (1-10, absolutely positioned at their slot's `top:Npx`, never move, never
  change text) sit in a separate layer from ten `.trow` content elements (who + time only, no rk),
  each also absolutely positioned per slot and independently tweened. `.trow` rows are addressed by id
  (`trow-1`...`trow-10`, `trow-today`) rather than `:nth-child`, since `.tnum` and `.trow` are now
  siblings in the same `.rows` container and nth-child would otherwise miscount across the two element
  types.
- **Today's row (`trow-today`) is a real DOM element from page load, never inserted mid-timeline.** It
  sits absolutely positioned at slot 2's coordinates (`top:60px`) the whole time, at its default
  `.trow { opacity: 0 }`, and is only ever tweened (opacity/y), never moved via a callback — consistent
  with the file's existing "no callbacks, so a frame-seeking renderer always lands on the right point"
  discipline (see the `ride()` comment).

All three of these were verified against the actual CSS before writing the timeline, per the brief's own
instruction to check rather than assume.

## What you'll see, in order
1. 0.0-0.5 — Map dims. (Corrected from the brief's "0.0-0.3": the brief's own code used
   `duration: 0.5` starting at `0.0`, which ends at 0.5, not 0.3 as its narrative line said — this file
   follows the code, so the narrative here matches what's actually built.)
2. 0.3-0.7 — Tower fades in.
3. 0.8-2.5 — Ten rows (Mon...12 Aug) fill top-down.
4. 2.5-3.0 — Hold.
5. 3.0-3.5 — Today slides into slot 2; old P10 drops out; rows 2-9 shift down.
6. 3.5-4.6 — Hold on the finished tower.
7. 4.6-6.8 — Caption "Compare directly to your previous ride".
8. 7.2-10.0 — Caption "Compare against yourselfs" (your bold, selfs italic).

## Things to check in the render
- The slot-in mechanic (row reorder/push) — first time this exact interaction has been built, verify it reads cleanly and doesn't jump.
- Today's synthesised time (17:08.9) and its P2 placement — a fabricated example value, flag if you'd rather it show differently.
- Speed of the slot-in (0.5s) vs the old card's overtake speed (also 0.5s, matched intentionally).
- Whether dropping the "P1 of 10" chip without replacement reads fine or leaves the tower feeling incomplete.
- The rank-numeral decoupling (fixed `.tnum` column vs. row content) — a structural deviation from the
  brief's literal markup, made to keep rank numbers correct through the slide (see above). Flag if the
  visual result (numerals column separate from name/time column) doesn't read the way you pictured it.

## Render on the PC (PowerShell, from marketing\hyperframes\)
```
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name ranking -Render
```
then copy the newest `renders\ranking_*.mp4` to `rounds\v4\ranking_v4.mp4` and confirm 10.0s / 300 frames:
```
ffprobe -v error -show_entries format=duration -of csv=p=0 rounds\v4\ranking_v4.mp4
```

## Nathan's feedback
<!-- write your notes below, overall or beat-by-beat -->
