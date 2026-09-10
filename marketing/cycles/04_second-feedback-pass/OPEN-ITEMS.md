# Cycle 04 — open items

## Blocker: nothing is rendered
`device_bash` reported "Workspace unavailable" the entire session (same failure mode as cycles 01/02). No `render.ps1` or `ffmpeg` command ran — every file this cycle touched went through the stage/commit fallback instead, with zero rejected writes.

### 1. Render the five updated compositions

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\hyperframes"
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name brandmark\closing -Render
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name brandmark\opening -Render
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name start-ride -Render
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gates-saving -Render
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name ranking -Render
```

Then copy each newest render into its `rounds/vN/` folder and confirm the duration:

```powershell
Copy-Item "brandmark\closing\renders\*.mp4"  "brandmark\closing\rounds\v2\closing_v2.mp4"
Copy-Item "brandmark\opening\renders\*.mp4"  "brandmark\opening\rounds\v3\opening_v3.mp4"
Copy-Item "start-ride\renders\*.mp4"          "start-ride\rounds\v4\start-ride_v4.mp4"
Copy-Item "gates-saving\renders\*.mp4"        "gates-saving\rounds\v4\gates-saving_v4.mp4"
Copy-Item "ranking\renders\*.mp4"             "ranking\rounds\v4\ranking_v4.mp4"

foreach ($f in @(
  "brandmark\closing\rounds\v2\closing_v2.mp4",
  "brandmark\opening\rounds\v3\opening_v3.mp4",
  "start-ride\rounds\v4\start-ride_v4.mp4",
  "gates-saving\rounds\v4\gates-saving_v4.mp4",
  "ranking\rounds\v4\ranking_v4.mp4"
)) { ffprobe -v error -show_entries format=duration -of csv=p=0 $f }
```

Expected durations: closing_v2 4.0s, opening_v3 6.5s, start-ride_v4 14.0s, gates-saving_v4
12.4s, ranking_v4 10.0s.

### 2. Build teaser_v5, once all five renders above exist

`concat.txt` already exists at `teaser\rounds\v5\concat.txt` — no need to create it. From
`marketing\hyperframes\`:

```powershell
cd teaser\rounds\v5
ffmpeg -y -f concat -safe 0 -i concat.txt -vf "fps=30,scale=1920:1080,format=yuv420p" -c:v libx264 -crf 18 -preset medium -an teaser_v5.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 teaser_v5.mp4
```

Total duration should equal the sum of the five parts (6.5 + 14.0 + 12.4 + 10.0 + 4.0 =
46.9s — re-measure the parts rather than trusting this estimate; if any individual render's
actual duration differs from its planned value above, update `concat.txt`'s implied total and
`teaser\rounds\v5\FEEDBACK.md`'s cut-sheet table before assembling, and update
`teaser\README.md`'s v5 section too). Once confirmed, leave feedback in
`teaser\rounds\v5\FEEDBACK.md`.

### 3. Leave feedback

For every rendered scene, drop notes in its `rounds/vN/FEEDBACK.md` the same way as before.

## Defects the fresh-context inspector found and the coordinator fixed directly (mechanical, <10 lines each)
1. **Sector recolour wasn't actually applied to the sectors.** Nathan asked for green-yellow-purple-green sectors; the executors updated the shared `SECTOR_COLORS` constant, which only drives the gate-tick colour, not the painted 9px sector overlay strokes (hard-coded in markup). Fixed by editing the `#sec1`/`#sec4` `stroke` attributes directly in `start-ride/index.html`, `gates-saving/index.html`, and `ranking/index.html` to `#3ED598` (green), matching the array.
2. **start-ride's black lead-in had no visible effect.** The `#blackout` div existed but had no CSS rule, so its opacity tween changed nothing on screen. Added `#blackout { position:absolute; left:0; top:0; width:1920px; height:1080px; background:#0A0A0A; opacity:1; pointer-events:none; }`.
3. **gates-saving's rider carry-over was silently cancelled.** The 4.4s rider fade-in (`tl.fromTo('#rider', {opacity:0}, {opacity:1,...}, 4.4)`) defaults to GSAP's `immediateRender:true`, which writes `opacity:0` to the rider at *build time* — overriding the intended "starts visible at the finish point" state before the timeline even plays, so the carried-over rider would have been invisible from frame 0 instead of fading out over the 1.0s lead-in. Added `immediateRender: false` to that tween. Also added matching rider radius/stroke-width continuity (7/2 like start-ride's 2x frame at the cut, restored to gates-saving's native 11/3 at 0.5s while still invisible) so it doesn't visibly resize at the join.

## Design questions the inspector flagged, ruled by a fresh Fable (not decided in this chat), and applied
4. **ranking: the new "Today" row was sliding up through the row it displaces**, fully overlapping mid-transition instead of arriving cleanly. Ruling: enter from the side at its own resting slot (matching how the initial ten rows fill in), not by swapping physical positions with the displaced row. Changed `#trow-today`'s entrance from a `y:60→0` slide to `x:-24→0` fade-in, same timing (3.00s, 0.5s), eased `power2.out`.
5. **brandmark/closing: the wordmark colour had drifted from yellow to off-white.** The executor ported opening's `#F4F2EC` wordmark colour for visual consistency between the two bookends, but closing's own (untouched) README and the old v1 render both describe it as yellow, and Nathan's actual v1 feedback never asked for a colour change. Ruling: keep it yellow — `#F5C542`. Changed `#wordmark-text`'s `color` back to `#F5C542`.

## Other judgment calls made without interrupting Nathan (not defects — logged for his review)
- **gates-saving's 1.0s zoom-out lead-in** is a new beat answering Nathan's "what do you think?" — it's a genuine design addition, not something he explicitly specified. Review the match-cut quality once rendered; the camera formula is ported verbatim from start-ride so the framing should line up almost exactly, but the two scenes' basemap dimming differs (start-ride has a `#tint` layer at 0.25 opacity, gates-saving doesn't), so there may be a brightness step at the cut worth a look.
- **ranking's "Today" time was re-synthesised to 17:08.9** (was 16:41.3) specifically so it lands at display position 2, as Nathan asked — the old value was faster than every other row and would have ranked #1, not #2. All the ride times in this composition are placeholder example data, not live figures, so this was treated as free to adjust for internal consistency.
- **ranking needed a 10th "previous" row that doesn't exist in the data** (only 9 non-Today rows existed) — synthesised as "12 Aug", 18:48.1 (slowest existing time + 14.6s, one week older by label).
- **opening's duration grew 5.5s → 6.5s** (+1.0s) to fit the slower fades Nathan asked for without compressing the hold — flagged in its own `FEEDBACK.md` as reviewable if he'd rather the hold shrink instead.
- **start-ride's 1.0s blank lead-in and gates-saving's 1.0s zoom-out lead-in both land between scenes** — between them, the opening→start-ride cut now has ~1.2s of black/near-black (0.2s of opening's own end-hold + 1.0s of start-ride's blackout) before content resumes. Worth checking this doesn't feel like a dead pause once assembled.

## Doc-only nits not fixed this cycle (cosmetic, low priority)
- `brandmark/opening/index.html`'s inline `// Beat N (x.x-y.y)` comments still show v2's old timings; the code itself is correct (v3 timings), only the comments are stale.
- `brandmark/opening/README.md` still says "Duration: 5.5s (v2)" and its rounds table doesn't list v3 yet.
- `brandmark/closing/README.md`'s title line still reads "...then yellow wordmark" in a way that predates the tagline addition (harmless now that the colour ruling kept it yellow, but the sentence structure is stale).
- A couple of `FEEDBACK.md` beat-boundary numbers are off by ~0.05-0.1s from the literal code (e.g. gates-saving's ring-pop beat says "1.05-1.50" where the code's second ring actually ends 1.55) — cosmetic, doesn't affect the render.

None of these affect rendering or Nathan-visible behaviour — left for a future pass rather than spending more mechanical-edit budget on them now.
