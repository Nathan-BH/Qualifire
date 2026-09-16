# 06 — Closing — Round v4

**Render file:** closing_v4.mp4 (not rendered yet).
**Duration:** 4.000s (120 frames at 30fps, 1920x1080, no audio — unchanged from v3).
**Source:** ../../index.html.

## What changed since v3
- The mark is gone; the scene is now opening's second part — off-white QUALIFIRE wordmark
  fades in with a small rise at 0.15s, the tagline at 0.55s (opening's exact tweens), hold,
  0.8s fade to black from 3.2s.

## What you'll see, in order
1. 0.00-0.15 — Black.
2. 0.15-0.95 — Wordmark in.
3. 0.55-1.25 — Tagline in.
4. 1.25-3.20 — Hold.
5. 3.20-4.00 — Fade to black.
6. Ends 4.0s.

## Things to check in the render
- The wordmark is opening's off-white, not v3's yellow — Plan read "use the second part of
  the opening render" literally; if you want the closing's yellow back it's the one token
  `color: var(--ink)` → `#F5C542` on `#wordmark .word`.
- Whether 0.15s of black before the wordmark is the right breath after the cut from ranking,
  or should be 0.
- Whether the 1.95s hold + 0.8s fade is the right ending weight, or the fade should start
  later (shortening the hold).
- The vertical placement (`translateY(-40px)`, copied from opening, which had the mark's
  400px box to sit inside — here there is nothing else on screen, so "slightly above centre"
  is now a free choice).

## Render on the PC (PowerShell, from marketing\silent-studio\)
```
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name brandmark\closing -Render
```
then copy the newest `brandmark\closing\renders\*.mp4` to `brandmark\closing\rounds\v4\closing_v4.mp4` and confirm 4.0s:
```
ffprobe -v error -show_entries format=duration -of csv=p=0 brandmark\closing\rounds\v4\closing_v4.mp4
```

## Nathan's feedback
<!-- write your notes below, overall or beat-by-beat -->
