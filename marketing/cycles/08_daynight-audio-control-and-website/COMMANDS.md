# COMMANDS.md — cycle 08: what to type on your PC

Every copy-paste command this cycle adds lives here, in one place (Nathan, 2026-09-14:
"keep all the commands in the cycle folder so it stays in one place"). The evergreen
night cheat-sheet is still `marketing/silent-studio/COMMANDS.md`; the day-render,
day-capture and audio-regen instructions were taken out of `silent-studio/`,
`audio-studio/` and `guides/` and live only here.

What is **not** here: the code that makes these commands work stays in its normal
place — `silent-studio/render.ps1` (the `-Theme day` flag), each composition's
`theme.js` and `:root[data-theme="day"]` token block, and
`silent-studio/_map/map-capture.html` (the `?theme=day` query). Only the human-facing
"here's what to type" documentation moved. Ruling and mechanism:
`BRIEF-daynight-renders.md` (day/night) and `BRIEF-audio-regen-local.md` (audio regen).

Unless a `cd` says otherwise, run everything from a PowerShell window on your PC in
`C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio`. The
`-ExecutionPolicy Bypass` prefix is the same one-time story as in
`silent-studio/COMMANDS.md` ("One-time thing you'll hit").

## 1. Day basemap — once, and only for the three map scenes

`start-ride`, `gates-saving` and `ranking` draw on a captured map; the day theme needs a
second capture, `map-day.png`, next to each existing `map.png`. The other four
compositions (`colours`, `brandmark`, `brandmark\opening`, `brandmark\closing`) skip
this section. The night capture is unchanged and documented in
`silent-studio/_map/README.md`.

1. Double-click `silent-studio\_map\map-capture.html` (opens in Chrome; needs internet).
   In the address bar, add `?theme=day` to the end of the URL and press Enter. Same
   file, nothing to edit — with that query it loads the `positron` (day) tiles itself.
2. Wait for **READY — tiles loaded**. Check the yellow route still follows the roads.
3. Click **Download map-day.png** → lands in `Downloads`.
4. Copy it into the three scene folders, next to (not replacing) each `map.png`:
   ```powershell
   $src = "$env:USERPROFILE\Downloads\map-day.png"
   $hf  = "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
   foreach ($c in 'start-ride','gates-saving','ranking') { Copy-Item $src (Join-Path $hf "$c\map-day.png") -Force }
   ```

If step 1 shows only a black square / an ERROR line (Chrome refusing the CDN or tiles
from a `file://` page), serve the folder instead — the query string is the same:
```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio\_map"
python -m http.server 8123
```
then open http://localhost:8123/map-capture.html?theme=day and continue from step 2.

## 2. Day render (or preview) of any composition

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gates-saving -Theme day            # live preview, day palette
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gates-saving -Theme day -Render    # render to MP4
```

`-Theme day` works for every composition that has a `theme.js` — all seven after this
cycle: `start-ride`, `gates-saving`, `ranking`, `colours`, `brandmark`,
`brandmark\opening`, `brandmark\closing`. (`teaser` is not tokenised: a day teaser
would be the same ffmpeg concat built from day ingredient renders — not in this cycle.)
A map scene without `map-day.png` renders its route on the night map — do section 1
first.

The file lands as `<comp>\renders\<comp>_<timestamp>_day.mp4` — `render.ps1` renames
it so a day dump is never mistaken for a night one. If it warns "Expected exactly one
new render…", rename the newest file by hand. Without `-Theme` nothing changes: night
stays the default, and `theme.js` is always put back to `'night'` afterwards, even if
the render crashes.

Filing: a day render is a variant of the current night round. Copy it to
`<comp>\rounds\vN\<comp>_vN_day.mp4` next to the night file with the same N, and to
`all-renders\<comp>_vN_day.mp4` (at most one night and one day file per composition
there, same N). Day feedback goes under a `## Day variant` heading in that round's
`FEEDBACK.md`.

## 3. Night regression check — once per composition, before trusting any day render

Every composition's `index.html` was tokenised in this cycle; its night output should
be identical to the current round apart from encoder noise. Render night (no `-Theme`)
and compare against the round file:

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gates-saving -Render
$new = Get-ChildItem .\gates-saving\renders\*.mp4 | Where-Object { $_.Name -notlike '*_day.mp4' } | Sort-Object LastWriteTime | Select-Object -Last 1
ffmpeg -i .\gates-saving\rounds\v5\gates-saving_v5.mp4 -i $new.FullName -lavfi psnr -f null - 2>&1 | Select-String "average"
```

Swap the `-Name`, the `renders\` folder and the reference file per row:

| `-Name` | reference (current round, as on disk 2026-09-14) |
|---|---|
| `gates-saving` | `gates-saving\rounds\v5\gates-saving_v5.mp4` |
| `ranking` | `ranking\rounds\v5\ranking_v5.mp4` |
| `start-ride` | `start-ride\rounds\v4\start-ride_v4.mp4` |
| `colours` | `colours\rounds\v2\colours_v2.mp4` |
| `brandmark` | `brandmark\rounds\v1\brandmark_v1.mp4` |
| `brandmark\opening` | `brandmark\opening\rounds\v3\opening_v3.mp4` |
| `brandmark\closing` | `brandmark\closing\rounds\v3\closing_v3.mp4` |

Expect `psnr_avg` of 40 dB or more. Lower means the tokenisation changed the night
output: do not make a day render of that composition, and tell Claude which one
(`-lavfi "psnr=stats_file=psnr.log"` writes per-frame numbers). Caveat for `brandmark`:
its only round (v1) is from 2026-09-09, before the cycle-07 restructure, so a low
number there may have an older cause — say so rather than assuming the tokenisation.
The throwaway night render can stay in `renders\` or go to `safe_to_delete\`; never
delete.

## 4. Sound on a day render — deferred, one line for when it is wanted

Not a priority (Nathan). When `<comp>_vN_day.mp4` exists and
`audio-studio\<scene>\soundvM\soundtrack_vM.wav` is the current audio for that same
night vN:
```powershell
ffmpeg -y -i <comp>_vN_day.mp4 -i soundtrack_vM.wav -c:v copy -c:a aac -b:a 192k -shortest <comp>_vN_day_with_sound_vM.mp4
```
Store it next to the night with-sound file in `soundvM\` and mirror it into
`audio-studio\all-renders\` under the same one-night-one-day-same-vN rule.

## 5. Audio regeneration on your PC (regen.ps1) — pending

Not built yet. `BRIEF-audio-regen-local.md` (this folder) creates
`marketing\audio-studio\regen.ps1` and, when it is executed, replaces this section
with the full setup-and-usage walkthrough (Python check, numpy/scipy, `-Check`, first
run, the nudge loop, `-Round`). Until then there is no `regen.ps1` to run.
