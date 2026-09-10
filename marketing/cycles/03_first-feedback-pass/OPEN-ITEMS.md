# Open items — cycle 03 (2026-09-10)

Judgment calls made without interrupting Nathan. He reads this whenever; nothing here needs
a reply unless he wants something different from what was picked.

## Judgment calls

1. **colours_v2 versioning:** Nathan wrote "make colours_v1" in his request, but colours was
   already at v1 with feedback recorded against it (like every other scene, which all bumped
   a version). Confirmed with him directly before starting: it's `colours_v2` (a normal bump,
   not an overwrite of the existing v1 render/feedback history).
2. **opening_v2 duration:** grew from 5.0s to 5.5s. Nathan's feedback only asked for more
   spacing between the mark fading out and the wordmark fading in — the extra 0.5s is the
   space itself (0.35s empty frame + slightly later wordmark-in) plus keeping the hold at the
   end just as long as before. A smaller total (e.g. trimming the hold instead) is a one-line
   change to the timeline if preferred.
3. **start-ride_v3 camera tuning:** the 2× zoom level, the ±5%-of-route-length moving-average
   window (chosen for a smooth, lag-free follow), and the tint strength (25% black, replacing
   the old bottom gradient) are all judgment calls from the planning tier — reasonable defaults
   that will only really be checkable once rendered. Also worth watching in the render: whether
   the 2× basemap crop still looks crisp (the source PNG is captured at 2× resolution so it
   should be native, not upscaled, but only the actual render will confirm).
4. **ranking_v3 caption timing:** Nathan asked only for the hold to shorten to 10s; the planner
   also moved the second caption's entrance earlier (8.25s → 7.5s) so it stays readable for
   ~1.6s before the cut instead of ~0.9s. If Nathan would rather keep the caption in exactly
   the same relative position and let it show for less time, that's a one-line timeline edit.
5. **gates-saving_v3 caption position:** moved down (`top:920px` → `990px`) rather than moving
   the route drawing up, since the drawing/basemap is shared with start-ride and ranking and
   moving it would have required touching all three. Nathan's own first suggestion was "text
   lower or drawing higher" — lower was picked specifically to avoid the shared-asset risk he
   flagged.
6. **colours_v2 scope cut:** Nathan's feedback also asked to "make a new folder … and make a
   v1 render for it" for the rolling-window explainer. That's a separate composition, not an
   edit to colours — explicitly out of scope for this cycle. The removed rolling-window code
   (and the pre-edit colours source generally) is preserved at
   `colours/rounds/v1/index_v1-source.html` so nothing has to be reconstructed from git history.
   This is still an open, unscoped ask whenever Nathan wants it picked up.
7. **Map-scroll-fix approach:** fixed by converting the SVG-overlay route into a native
   MapLibre GeoJSON line layer (rather than adding a `move`/`zoom` listener that keeps
   rewriting the SVG's `points` attribute every frame) — the native layer is simpler, has no
   per-frame JS, and eliminates the second-coordinate-system bug class entirely rather than
   patching around it.

## Blockers this session

**`device_bash` (the remote-devices shell to Nathan's PC) was unavailable the entire
session** — every attempt returned "Workspace unavailable. The isolated Linux environment on
this device failed to start," the same failure mode cycles 01 and 02 hit. All file
read/write/edit for all six tasks (plus the coordinator's post-inspection fixes) went through
the `device_stage_files` / `device_commit_files` / `device_list_dir` fallback instead — that
worked throughout, with zero rejected writes.

**Consequence: nothing could be rendered, previewed, or checked with `npx hyperframes` this
session**, and `teaser_v4` could not be attempted at all (its precondition — five new renders
existing on disk — was never met). Everything below needs Nathan, or a future session once
`device_bash` is back.

### 1. Render the five updated compositions

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\hyperframes"
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name brandmark\opening -Render
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name start-ride -Render
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gates-saving -Render
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name ranking -Render
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name colours -Render
```

Then copy each newest render into its `rounds/vN/` folder and confirm the duration:

```powershell
Copy-Item "brandmark\opening\renders\*.mp4"  "brandmark\opening\rounds\v2\opening_v2.mp4"
Copy-Item "start-ride\renders\*.mp4"          "start-ride\rounds\v3\start-ride_v3.mp4"
Copy-Item "gates-saving\renders\*.mp4"        "gates-saving\rounds\v3\gates-saving_v3.mp4"
Copy-Item "ranking\renders\*.mp4"             "ranking\rounds\v3\ranking_v3.mp4"
Copy-Item "colours\renders\*.mp4"             "colours\rounds\v2\colours_v2.mp4"

foreach ($f in @(
  "brandmark\opening\rounds\v2\opening_v2.mp4",
  "start-ride\rounds\v3\start-ride_v3.mp4",
  "gates-saving\rounds\v3\gates-saving_v3.mp4",
  "ranking\rounds\v3\ranking_v3.mp4",
  "colours\rounds\v2\colours_v2.mp4"
)) { ffprobe -v error -show_entries format=duration -of csv=p=0 $f }
```

Expected durations: opening_v2 5.5s, start-ride_v3 13.0s, gates-saving_v3 14.8s, ranking_v3
10.0s, colours_v2 19.0s.

### 2. Confirm the map-scroll fix (needs Chrome, no rendering)

Double-click `marketing\hyperframes\_map\route-current_0903-1828.html` and
`route-alt-wet-loop_0904-2144.html` in Chrome; scroll/pan each. The yellow route should now
stay locked to the roads under it at every zoom level (it previously stayed fixed in place
while the map moved underneath).

### 3. Build teaser_v4, once all five renders above exist

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\hyperframes\teaser\rounds"
mkdir v4
cd v4
```

Create `concat.txt`:
```
file '../../../brandmark/opening/rounds/v2/opening_v2.mp4'
file '../../../start-ride/rounds/v3/start-ride_v3.mp4'
file '../../../gates-saving/rounds/v3/gates-saving_v3.mp4'
file '../../../ranking/rounds/v3/ranking_v3.mp4'
file '../../../colours/rounds/v2/colours_v2.mp4'
file '../../../brandmark/closing/rounds/v1/closing_v1.mp4'
```

Then:
```powershell
ffmpeg -y -f concat -safe 0 -i concat.txt -vf "fps=30,scale=1920:1080,format=yuv420p" -c:v libx264 -crf 18 -preset medium -an teaser_v4.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 teaser_v4.mp4
```

Total duration should equal the sum of the six parts (roughly 5.5 + 13.0 + 14.8 + 10.0 + 19.0
+ 2.5 ≈ 64.8s — re-measure the parts rather than trusting this estimate, since colours and
ranking especially changed length this cycle). Once confirmed, update `teaser\README.md`'s
cut sheet with the measured lengths (mark the old v3 table "superseded by v4") and leave
feedback in a new `teaser\rounds\v4\FEEDBACK.md`.

### 4. Leave feedback

For every rendered scene, drop notes in its `rounds/vN/FEEDBACK.md` the same way as before.
