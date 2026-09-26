# 04 — Ranking — Round v6

**Render file:** ranking_v6.mp4 (not rendered yet).
**Duration:** 10.800s (324 frames at 30fps, 1920x1080, no audio — unchanged from v5).
**Source:** ../../index.html.

## What changed since v5
1. Today's row is green, not purple — it's a P2.
2. The climb now starts fast and decelerates into slot 2 (`power2.out`, still 2.2s, 3.2→5.4s);
   the rows step down at recomputed instants (19 Aug 3.39s, 21 Aug 3.53, 24 Aug 3.68, 26 Aug
   3.84, 29 Aug 4.03, 31 Aug 4.24, 3 Sep 4.50, Sat 4.88 — crossing times), Today's fade-in
   shortened to 0.25s so it's solid when it meets the first row.
3. The "Compare directly to your previous ride" caption is gone — "Compare against
   yourselfs" now comes in at 5.9s and holds to the 10.4/10.8 exit.
4. The map backdrop's painted route is the core's width (no 9px thickening) and the gate
   ticks are white — matching gates-saving v6's last frame.

## What you'll see, in order
1. 0.0-0.7 — Map dims, tower card fades in (unchanged).
2. 0.8-2.5 — Ten rows (Mon...12 Aug) fill top-down (unchanged).
3. 3.0-3.35 — Old #10 (12 Aug) fades and drops off the bottom.
4. 3.2-5.4 — "Today 17:08.9" (green) rises from below the list and climbs the whole tower,
   fast off the line, settling into slot 2 at 5.4s; as it reaches each row that row steps
   down one slot to let it by (19 Aug 3.39s, 21 Aug 3.53s, 24 Aug 3.68s, 26 Aug 3.84s, 29 Aug
   4.03s, 31 Aug 4.24s, 3 Sep 4.50s, Sat 4.88s).
5. 5.4-5.9 — Hold.
6. 5.9-10.8 — Caption "Compare against yourselfs", out at the end.
7. Ends 10.8s.

## Things to check in the render
- The fast start — the first three rows are overtaken within ~0.5s of Today appearing; flag
  if it reads as a jump rather than a launch (a `power1.out` would be a gentler version).
- Whether the last 0.5s of the climb (the final 30px into slot 2) reads as a settle or a
  stall.
- 4.5s on one caption (5.9-10.4) over a static tower — if it holds too long, the fix is a
  later start (e.g. 6.5), not a shorter scene (10.8s is in the teaser cut sheet and the
  soundtrack).
- Green "Today 17:08.9" legibility on the card at `#00D000`.
- The match-cut from gates-saving v6's last frame.

## Render on the PC (PowerShell, from marketing\silent-studio\)
```
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name ranking -Render
```
then copy the newest `ranking\renders\ranking_*.mp4` to
`ranking\rounds\v6\ranking_v6.mp4` (note: render.ps1 writes into the composition's
own `renders\` subfolder, not a top-level one) and confirm 10.8s:
```
ffprobe -v error -show_entries format=duration -of csv=p=0 ranking\rounds\v6\ranking_v6.mp4
```

## Nathan's feedback
<!-- write your notes below, overall or beat-by-beat -->
