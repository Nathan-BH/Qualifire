# 04 — Ranking — Round v5

**Render file:** ranking_v5.mp4 (not rendered yet — device_bash was unreachable this session).
**Duration (planned):** 10.800s (324 frames at 30fps, 1920x1080, no audio — was 10.0s in v4).
**Source:** ../../index.html.

## What changed since v4
- "Today's ride" no longer slides in laterally at slot 2 — it now emerges from just below rank 10 and climbs continuously up through the tower (540px, 2.2s, power1.inOut) to settle at slot 2, passing each row it overtakes.
- Each row from 9 down to 2 steps down one slot as Today's climb reaches it (pre-computed crossing times, not callbacks — see the source comment for the derivation), same 60px/slot pitch as before. Old #10 (12 Aug) still fades and drops off first, same as v4.
- Duration extended 10.0s -> 10.8s to give the climb 2.2s of real screen time instead of the old instant 0.5s slot-in; captions shifted later by ~1.3s each but kept their own on-screen durations (not compressed).
- Rank numerals (.tnum, the fixed 1-10 column) are untouched — still never move, never change text.

## What you'll see, in order
1. 0.0-0.7 — Map dims, tower card fades in (unchanged).
2. 0.8-2.5 — Ten rows (Mon...12 Aug) fill top-down (unchanged).
3. 3.0-3.35 — Old #10 (12 Aug) fades and drops off the bottom.
4. 3.2-5.4 — "Today 17:08.9" (purple) rises from below the list and climbs the whole tower in one glide, slow-fast-slow; as it reaches each row that row steps down one slot to let it by (19 Aug ~3.8s, 21 Aug ~4.0s, 24 Aug ~4.2s, 26 Aug ~4.3s, 29 Aug ~4.4s, 31 Aug ~4.6s, 3 Sep ~4.8s, Sat ~5.0s), settling into slot 2 at 5.4s.
5. 5.4-5.9 — Hold.
6. 5.9-7.9 — Caption "Compare directly to your previous ride".
7. 8.2-10.8 — Caption "Compare against yourselfs", out at the end.
8. Ends 10.8s (was 10.0s).

## Things to check in the render
- The climb reads as "passing through/overtaking" rather than a glitchy overlap — Today is drawn on top (z-index 2) of the rows it passes since there's no opaque background pill behind it; a brief 1-2 frame text overlap with the row it's passing is expected by design, flag if it looks wrong rather than smooth.
- Whether 2.2s for the full climb feels right — first time this exact mechanic has been built.
- New total duration (10.8s vs the original ask's "keep it at 10s" note from v4) — this was a deliberate call to give the climb real screen time rather than rushing it; flag if 10.8s runs too long against the rest of the teaser.
- Whether the captions still land with enough breathing room now that they start ~1.3s later.

## Render on the PC (PowerShell, from marketing\hyperframes\)
```
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name ranking -Render
```
then copy the newest `ranking\renders\ranking_*.mp4` to
`ranking\rounds\v5\ranking_v5.mp4` (note: render.ps1 writes into the composition's
own `renders\` subfolder, not a top-level one) and confirm 10.8s:
```
ffprobe -v error -show_entries format=duration -of csv=p=0 ranking\rounds\v5\ranking_v5.mp4
```

## Nathan's feedback
<!-- write your notes below, overall or beat-by-beat -->
