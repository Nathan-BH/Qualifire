# tour — Qualifire, a tour (HyperFrames composition)

50-second product tour, restructured 2026-09-09 per Nathan's direct feedback
into a 6-beat abstract narrative (no real site-scroll cut sequence). 1920x1080,
id `tour`, one paused GSAP timeline (`window.__timelines.tour`); only external
asset is the GSAP CDN script.

Beats:
1. **0-5s** — Gate mark draws, a single yellow "Start" button. No kicker, no
   paragraph — "universally understandable" per Nathan.
2. **5-22s** — First ride: a route draws itself as a blue dot travels it.
3. **15-22s** — Landmarks (start/end) and three automatic sector gates pop in.
4. **22-35s** — Second ride: the dot travels again, gates pulse as it crosses
   them; a rank fragment ("P1 of 2", purple) slots in over the dimming map.
5. **35-45s** — The full timing tower fills to 10 rows.
6. **45-50s** — Close: mark, "QUALIFIRE", "Same road. New meaning."

Colour/tier meaning, sport choice and day/night mode are deliberately left to
other videos (idea 4 covers colour).

On your PC, from `marketing/hyperframes/`:
```powershell
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name tour            # preview
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name tour -Render    # render to MP4
```

Built 2026-09-09.
