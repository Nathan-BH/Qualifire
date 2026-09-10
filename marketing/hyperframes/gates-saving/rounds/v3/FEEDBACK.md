# 03 — Gates & Saving — Round v3

**Render file:** gates-saving_v3.mp4 — **not rendered yet.** Built 2026-09-10 without a shell on Nathan's PC.
**Duration (planned):** 14.8s at 30fps, 1920x1080, no audio.
**Source:** `../../index.html`.

Render on the PC (PowerShell, from marketing\hyperframes\):
  .\render.ps1 -Name gates-saving -Render
then copy the newest renders\gates-saving_*.mp4 to rounds\v3\gates-saving_v3.mp4 and confirm 14.8 s:
  ffprobe -v error -show_entries format=duration -of csv=p=0 rounds\v3\gates-saving_v3.mp4

## What changed since v2
- Caption text: fixed white text overlapping the route drawing — captions moved from `top: 920px` to
  `top: 990px` (text lower, per Nathan's first option; the basemap/route/gates are shared with two
  other scenes and were left untouched).
- capA text: "Save the start and end — it splits into sectors automatically." → "Save your route as reference."

## What you should see, in order (planned — verify against the render)
1. 0.05-0.5 — Start/end landmark rings pop in.
2. 0.6-3.9 — Caption "Save your route as reference." + three gate ticks pop in (0.9/1.2/1.5).
3. 4.0-6.9 — Caption "Next time, you've got something to go for."
4. 7.0-14.3 — Second ride: rider fades in at the start (7.0), rides 7.4-14.3; gates swap colour at 9.06 / 11.75 / 13.20 and each sector paints; final sector at 14.3.
5. 14.3-14.8 — Hold.

## Nathan's feedback
- since the previous animation is a zoomed in, we should have a transition "zoom out" to bring it to this frame before step1 starts, what do you think ?
- lets replace step 3 caption with "Next time. Start racing yourself (lets try "your" in italic not bold; and "self" in bold not italic)."
- for the sectors now I have now purple-yellow-purple-purple. Lets change the colouring so all the colours are used. So I would try green-yellow-purple-green for example as the 4 sectors. 
- I would start the second ride sooner, as well. and the step3 text can come in while the second ride is already ongoing, this way there is not a blank step.
