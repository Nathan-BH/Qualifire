# Results scatterplot — demo preview (2026-09-26)

Design preview of the RESULTS-tab scatterplot (WP-2 Phase C) as it would look at the end of each
DEMO ride type (FIRST / SECOND / TENTH), in day and night. Made for brief
`cycles/virgin-cycle14/08-demo-results-scatterplot.md`. Nothing here is in the app.

**Image:** `results_scatterplot_demo_preview.png` — day left, night right, one row per ride type.

## What is real and what is drawn
- Real: every dot position, axis tick, average value, and tone (purple/green/yellow) is the output of
  the app's own `buildPlotModel` (`app/src/ui/resultsPlotModel.ts`) run on the demo data
  (`demoPriorResults` + today's scripted 836 s lap), for a 344 px-wide card. Theme colours are the
  `daylight` / `night` tokens from `app/src/ui/theme.ts`; tones are `colors.purple/green` and `YELLOW_TIER`.
- Approximated: the drawing itself (Liberation Sans instead of the phone's font, spacing) mimics
  `resultsPlot.tsx` — it is not a phone screenshot. Text can differ by a pixel or two.
- Derived by hand, not from the app: the all-time position in the caption (`P1 of 1`, `P1 of 2`,
  `P3 of 10`) from the demo lap sums. The real value would come from `buildHistoryBoard` (brief 08).
- Demo-only choice shown here: today's dot is pre-selected (ring + caption).
- Known quirk visible in the image: the right-most x label ("Sat 26 Sep") is centred on the newest
  dot and overhangs the card edge — the real component lays it out the same way.

## Files
| file | what |
| --- | --- |
| `plotdump.ts` | headless script: builds the plot model for first/second/tenth and prints JSON |
| `jsonhook.mjs` | tiny Node loader so the app's `.json` imports work outside the test runner |
| `plotdump.json` | the JSON `plotdump.ts` printed on 2026-09-26 (the input to the renderer) |
| `render_preview.py` | Pillow script: `plotdump.json` -> the PNG |
| `results_scatterplot_demo_preview.png` | the result |

## Regenerate
From the repo root (Node >= 22):

```
cd app
set TZ=Europe/Brussels
node --import ..\design\results-scatterplot-demo-preview\jsonhook.mjs --experimental-strip-types ..\design\results-scatterplot-demo-preview\plotdump.ts > ..\design\results-scatterplot-demo-preview\plotdump.json
```

then

```
python design\results-scatterplot-demo-preview\render_preview.py
```

(needs `pip install pillow`). The dates on the x axis depend on the fixed "now" in `plotdump.ts`
(2026-09-26 12:00 local); if the model or demo history changes, re-run both steps.
The `[MODULE_TYPELESS_PACKAGE_JSON]` warning Node prints is harmless.
