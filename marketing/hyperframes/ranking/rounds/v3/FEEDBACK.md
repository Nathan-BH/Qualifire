# 04 — Ranking — Round v3

**Render file:** ranking_v3.mp4 — **not rendered yet.** No shell available on Nathan's PC this
session (`device_bash` reported the isolated environment failed to start); Nathan renders it and
copies the MP4 here.
**Duration (planned):** 10.0s at 30fps, 1920x1080, no audio (shortened from v2's 15.2s per feedback).
**Source:** `../../index.html`.

Render on the PC (PowerShell, from marketing\hyperframes\):
```
.\render.ps1 -Name ranking -Render
```
then copy the newest `renders\ranking_*.mp4` to `rounds\v3\ranking_v3.mp4` and confirm 10.0 s / 300 frames:
```
ffprobe -v error -show_entries format=duration -of csv=p=0 rounds\v3\ranking_v3.mp4
```

## What changed since v2
- Caption A text: "Now you know how you did." → "Compare directly to your previous ride"
- Caption B text: "The more you ride it, the more you've got to race." → "Compare against your*selfs*"
  (rendered as one word "yourselfs" with only "selfs" italic, per Nathan's spelling)
- Composition shortened 15.2s → 10.0s (both `#map` and `#ui` clip durations); the end hold now
  stops at 10 seconds instead of 15.2, per Nathan's feedback.
- Judgment call: Beat 4's capB entrance was moved from 8.25 to 7.5 (its exit/hold timing scaled down
  from 14.8/15.2 to 9.6/10.0 accordingly). This was not explicitly specified — Nathan only said the
  hold could be shorter and stop at 10s. Moving the entrance earlier keeps capB fully readable for
  ~1.6s before the 10s cut (matching v2's ~1.6s readable window before its 14.8s fade start) instead
  of collapsing to ~0.9s if the entrance had stayed at 8.25. The tower-row fill animation itself
  (5.9-7.6) is untouched; capB now appears right as the last tower row lands (7.6) rather than ~0.65s
  after. Flagging this for Nathan's review — if he'd rather keep capB starting at 8.25 with a shorter
  hold, that's a one-line change.

## What you should see, in order (planned — verify against the render)
1. 0.3-2.75 — Map dims to ~30%; rank card slots in; Mon (17:02.8) at 1, Today (16:41.3, purple) slides
   in at 2 then overtakes (2.1-2.6); "P1 of 10" appears. (unchanged from v2)
2. 2.75-5.0 — Caption "Compare directly to your previous ride"
3. 5.0-7.6 — Rank card fades out, timing tower fades in; ten rows fill top-down (5.9-7.6).
4. 7.5-10.0 — Caption "Compare against your*selfs*" (only "selfs" italic) fades in as the last tower
   row lands, short hold, out at the 10.0s end.

## Nathan's feedback
- I would skip the rank card, and directly show the ranking tower. But I like how the new ride slots in the card. So I would keep this style for the tower. it would be like having 10 rides in the tower (same animation as now, rows filling top to down), and then the "tenth" new ride slides in at its spot. I would have it slide in at position P2. (this then pushes the current p10 out (just disapper to make space for the new one ?))
- here i would put at step 4: "your" in bold but not italic, and then "selfs" in italic but not bold as it is now already