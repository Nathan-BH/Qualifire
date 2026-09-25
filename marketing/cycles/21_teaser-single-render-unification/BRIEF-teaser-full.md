# Teaser as one real HyperFrames render — DIGEST + FEASIBILITY + BRIEF

Written by: Fable (Plan tier), 2026-09-26. Read-only pass, all files read in full from
`$HOME/mnt/Qualifire/marketing/silent-studio/` via device_bash (mount reachable; nothing
fabricated). No files were written or edited by this pass.

Files read: `brandmark/opening/index.html` (119 lines), `start-ride/index.html` (283),
`gates-saving/index.html` (332), `ranking/index.html` (299), `brandmark/closing/index.html`
(87), `teaser/index.html` (253, legacy), `teaser/README.md`, `structure.md`,
`teaser/rounds/v9/concat.txt` + `FEEDBACK.md`, `render.ps1` (142), every scene's `theme.js`,
plus (for context) `gates-saving/README.md`, `start-ride/README.md`, `ride/README.md`,
`gates-saving/rounds/v5/FEEDBACK.md`, and the "Render investigation" section of
`marketing/audio-studio/teaser/arrangements/arrangement_v1/FEEDBACK-v1.md`.

---

## 0. Headline findings (read this first)

1. **Nesting is viable without editing any scene's tween code.** No scene reads a global
   clock: zero hits for `document.timeline`, `performance.now`, `Date(`,
   `requestAnimationFrame`, `setTimeout/Interval`, `onUpdate/onComplete/onStart`, `.play(`,
   `.seek(`, `ticker` across all five files. Every tween is positioned by a literal number
   (or a computed constant) relative to the scene's own `tl`. `masterTl.add(childTl,
   absStart)` preserves that math unchanged.
2. **CSS custom properties: zero conflicts.** All five files carry the byte-identical
   `:root` and `:root[data-theme="day"]` token blocks (values listed in section 1.0).
3. **Element ids DO collide** (37 distinct ids shared by two or more files, see section 2.1),
   and the three product scenes' JS targets them by literal string (`'#rider'`, `'#cam'`,
   `document.getElementById('route-core')`, ...). Renaming ids would mean editing ~40 tween
   lines per scene — exactly what we want to avoid. The way round it with zero edits to
   tween code is **GSAP selector scoping** (`gsap.context(fn, sceneRootEl)`) plus a one-line
   local `document` shim for the five `document.getElementById` calls that build the SVG
   geometry. Details and a fallback in sections 2.4/3.8.
4. **Three CSS class collisions have different values** and would cause real visual
   regressions if left unscoped — most importantly start-ride/gates-saving's stale
   `.trow.today ... { color: #9000C8 }` would turn ranking's "Today" row purple.
   Scene-prefixing each scene's CSS rules is mandatory (section 2.2).
5. **JS globals collide** (`tl`, `L`, `at`, `ride`, `GATES`, `ROUTE`, `camAt`, ... — full
   list section 2.3) — resolved entirely by wrapping each scene script in an IIFE, again
   zero edits inside.
6. **Render duration evidence:** gates-saving declares `data-duration="12.4"` on both its
   clips, yet every render measures exactly 12.300000 s, which equals its GSAP timeline's
   own length (last `tl.set('#capB', ..., 12.3)`). So HyperFrames evidently takes the
   render length from the exported GSAP timeline, not from `data-duration` (inference from
   this evidence, not from HyperFrames source). Consequence: the combined composition's
   length is whatever `master.duration()` is — 47.3 s with the scenes unchanged.
7. **GSAP gotcha that WILL bite:** each scene creates its timeline with `{ paused: true }`.
   A paused child does not advance when its parent plays. The master script must un-pause
   each child (`child.paused(false)`) before `master.add(child, pos)`. This is one line per
   scene in the new master script, not an edit to scene code.
8. **Open taste decisions for Nathan (not resolved here):** (a) start-ride's now-
   structurally-optional 1.0 s blackout/reveal beat — keep / shorten / remove; (b) the
   pre-existing gate-position jump at the gates-saving-to-ranking seam (`GATES` =
   0.25/0.50/0.75 vs 0.24/0.63/0.84); (c) where the combined composition should live (new
   sibling folder vs replacing `teaser/index.html`). Listed with numbers in section 3.7.

---

## 1. DIGEST — what is in each scene file

### 1.0 Shared across ALL five files (byte-identical)

CSS tokens:
```
:root {
  --bg: #0A0A0A; --bg-rgb: 10,10,10;
  --ink: #F4F2EC; --ink-dim: #9a978f;
  --card: #141414; --card-border: #232323;
  --route-casing: #14120C; --ring-fill: #14120C; --rider-stroke: #FFFFFF;
}
:root[data-theme="day"] {
  --bg: #FDFCF9; --bg-rgb: 253,252,249;
  --ink: #17171b; --ink-dim: #605e56;
  --card: #FFFFFF; --card-border: #E1DDD1;
  --route-casing: #14120C; --ring-fill: #FDFCF9; --rider-stroke: #17171b;
}
html, body { margin: 0; padding: 0; background: var(--bg); }
* { box-sizing: border-box; }
#stage { position: relative; width: 1920px; height: 1080px; background: var(--bg); overflow: hidden;
         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: var(--ink); }
.clip { position: absolute; }
.clip.full { top: 0; left: 0; width: 1920px; height: 1080px; }
```
Common head: `<html lang="en" data-theme="night">`, `<script src="theme.js"></script>` as
the FIRST thing in `<head>` (before `<meta charset>`), GSAP from
`https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js` loaded inside `#stage` just before
the scene `<script>`. Every scene ends its script with `window.__timelines =
window.__timelines || {}; window.__timelines.<name> = tl;` and exports exactly ONE key.

`theme.js` is one line in every folder,
`document.documentElement.setAttribute('data-theme','night');` (brandmark copies are 61
bytes with a trailing newline, the three product-scene copies 60 bytes without; render.ps1
rewrites it anyway).

Fonts: system stack only, no webfonts. No other external assets except those listed per
scene below.

### 1.1 `brandmark/opening/index.html` — scene 1, 6.2 s

- `#stage` attrs: `data-composition-id="opening" data-start="0" data-width="1920"
  data-height="1080"`.
- Clips: one, `#open` `class="clip full" data-start="0" data-duration="6.2"
  data-track-index="0"`.
- Element ids: `stage, open, mark, ring, slash, wordmark`. Classes: `.inner`, `.word`,
  `.tagline`.
- Scene-specific CSS: `#open .inner {opacity:1}`, `#mark` (400x400 centred), `#mark svg`,
  `#slash {opacity:0}`, `#wordmark` (top 50%, translateY(-40px)), `#wordmark .word`
  (96px/800/22px tracking, `var(--ink)`, opacity 0), `#wordmark .tagline` (34px/500,
  `var(--ink-dim)`, opacity 0), `#ring { stroke: var(--ink) }`.
- JS globals: `CIRC`, `tl`. Page-load set: `gsap.set('#ring', { strokeDasharray: CIRC })`.
- Timeline (`tl`, positions relative to scene): ring draw 0-1.3; slash 1.3-1.8; `#mark`
  fade out 2.15-2.60 (+hard set 2.60); wordmark 3.80 (0.80); tagline 4.20 (0.70); `#open
  .inner` fade to black 5.20-6.00; hard `tl.set('#open .inner',{opacity:0}, 6.20)`.
  `tl.duration()` = 6.2.
- Export: `window.__timelines.opening = tl`.
- External assets: none (SVG geometry inlined). No `map.png` in this folder.
- Note: this is the v4 edit (2026-09-25) already saved in the file; README/concat still
  reference the 6.5 s `opening_v3.mp4` render — the 6.2 s render has not been produced yet.

### 1.2 `start-ride/index.html` — scene 2, 14.0 s

- `#stage` attrs: `data-hf-id="hf-iu6j" data-composition-id="startride" data-start="0" ...`.
- Clips: `#map` (`data-start="0" data-duration="14.0" data-track-index="0"`) and `#ui`
  (`... data-duration="14.0" data-track-index="1"`), plus a bare `<div id="blackout">`
  directly under `#stage` (not a clip).
- Element ids: `stage, map, cam, basemap, tint, mapsvg, route-casing, route-core, sec1,
  sec2, sec3, sec4, gate1, gate2, gate3, ring-start, ring-end, rider, dim, attrib, ui,
  start-btn, cursor, cap1, blackout`.
- Classes used: `.inner, .full-svg, .sector, .gate, .gc, .gk, .caption, .label`. Stale CSS
  with no matching elements: `.card, .card .hdr, .card .lbl, .num, #rank-card, #rank-pos,
  .rnum, .rrow, .rrow.today, #tower, #tower .rows, .trow, .trow .rk/.who/.time,
  .trow.today ...{color:#9000C8}`.
- Scene-specific CSS values worth knowing: `#tint { background: rgba(var(--bg-rgb),0.25) }`;
  `#cursor` 44x66, opacity 0; `#dim` full-frame `var(--bg)` opacity 0; `#blackout`
  full-frame `var(--bg)` opacity 1, pointer-events none; `.caption { top: 920px; font-size:
  44px; ... }`; `#start-btn` 900x300 at (510,390), `#F5C542`, `display:flex` (NO
  flex-direction/gap); `#start-btn .label` 80px/800; SVG token rules
  `#route-casing{stroke:var(--route-casing)}`, `.gate .gc{stroke:var(--route-casing)}`,
  `#ring-start,#ring-end{fill:var(--ring-fill);stroke:var(--ink)}`,
  `#rider{stroke:var(--rider-stroke)}`.
- SVG presentation attrs (differ from the other two product scenes): `#route-casing
  stroke-width="7"`, `#route-core stroke-width="4"`, sectors `stroke-width="9"`, gate
  `.gk stroke="#F5C542" stroke-width="3" opacity="0.6"`, `#rider r="7" stroke-width="2"`.
- Data-hf-id attributes present on most elements (Studio bookkeeping). Shared with
  gates-saving: `hf-lm34, hf-25zy, hf-ze3x, hf-si8b, hf-ofvj, hf-f0p9, hf-4pe2, hf-eh3b,
  hf-6pf9, hf-fkgz, hf-bug8`.
- JS globals: `MAP_CENTER, MAP_ZOOM, ROUTE, GATES=[0.24,0.63,0.84], SECTOR_COLORS, pts,
  dAttr, core, L, at(), P0, P1, bounds, s, a, b, el, GATE_PT, CAM_S=2.0, CAM_MIN_X/MAX_X/
  MIN_Y/MAX_Y, clamp(), camAt(), camXY(), ride(), scoreGate() (defined, never called), tl,
  cam0`.
- `document.getElementById` call sites (must resolve within the scene): line 158
  (`'basemap'`, day theme only), 164 (loop over `route-casing, route-core, sec1..sec4`),
  165 (`'route-core'`), 173 (`'sec'+(s+1)`), 184 (`'gate'+(i+1)`).
- Page-load sets (outside tl): `#ring-start/#ring-end/#rider` cx/cy; `#rider {opacity:1}`;
  `#dim {opacity:0.6}`; `#cam {x:0,y:0,scale:1}`.
- Timeline (after the file's own `tl.shiftChildren(1.0, true)` at line 273; times below
  are the FINAL scene-relative times): blackout reveal `#blackout` opacity to 0 0.4-1.0
  (added after the shift, line 274); `#start-btn` in 1.2-1.7; cursor `set` at 1.0, fade in
  1.9, glide 2.0-2.9; press 3.2/3.35; button+cursor+dim out 3.55-4.0 (hard sets 4.0);
  camera push-in `#cam` 3.8-5.1; `#cap1` in 4.6; route draw + `ride()` 5.3-13.8 (240
  linear tweens on `#rider` AND `#cam`); `#cap1` out 13.6-14.0, hard set 14.0.
  `tl.duration()` = 14.0.
- Export: `window.__timelines.startride = tl`.
- External assets: `map.png` (2,379,000 B), `map-day.png` (3,057,619 B, swapped in by JS
  when `data-theme="day"`), `theme.js`, GSAP CDN.

### 1.3 `gates-saving/index.html` — scene 3, 12.3 s actual (declares 12.4)

- `#stage` attrs: `data-hf-id="hf-wi7b" data-composition-id="gatessaving" ...`.
- Clips: `#map` and `#ui`, both `data-start="0" data-duration="12.4"`, tracks 0/1. Known
  stale: renders are 12.300000 s (README, v5-v9 FEEDBACK all confirm; v5 calls 12.4 "a doc
  typo").
- Element ids: `stage, map, cam, basemap, mapsvg, route-casing, route-core, sec1..sec4,
  gate1..gate3, ring-start, ring-end, rider, scrim-bottom, dim, attrib, ui, capA, capB`.
- Classes: `.inner, .full-svg, .sector, .gate, .gc, .gk, .caption, .caption .em-i, .caption
  .em-b`. Same stale card/tower/`.trow` CSS block as start-ride (incl. `.trow.today ...
  {color:#9000C8}`), plus `#start-btn` CSS (with `flex-direction:column; gap:16px` and
  `.sub`) with no element.
- Distinct CSS values: `.caption { top: 990px }` (start-ride and ranking use 920px);
  `#scrim-bottom` gradient 780-1080 to `rgba(var(--bg-rgb),0.92)`.
- SVG attrs: casing `stroke-width="10"`, core `"6"`, sectors `"6"`, gate `.gk style="stroke:
  var(--ink)" stroke-width="4" opacity="1"`, `#rider r="11" stroke-width="3"`.
- JS globals: same map preamble as start-ride but `GATES=[0.25, 0.50, 0.75]`; plus
  `GATE_LEN=44, camStart, PULSE_T=[0,2.01,3.85,5.71,7.58], GATE_T, DIP_A=0.6, RIDE_PROFILE,
  rideFrac(), ride() (surge-profile version), RIDE_T0=3.80, RIDE_DUR`.
- `document.getElementById` sites: lines 157, 163, 164, 172, 183 (same five roles as
  start-ride).
- Page-load sets: `.gate line` dash seed; ring cx/cy; `#rider` at P1 with r 7 / sw 2,
  opacity 1 (carry-over from start-ride's last frame); `#cam` at 2x on the finish
  (`camStart`).
- Timeline: zoom-out lead-in 0-1.0 (`#cam` to scale 1; casing 7 to 10, core 4 to 6
  crossfade; rider fades out, snapped to P0 at 0.5 with r 11/sw 3); rings 1.05/1.15;
  `#capA` 1.6, out 4.5-4.9; gates draw 1.9/2.2/2.5; `#capB` in 5.2, out 11.9, hard set
  12.3; rider fade-in 3.4; `ride()` 3.80-11.38; sectors paint at 3.80+GATE_T[i] and 11.38.
  `tl.duration()` = 12.3.
- Export: `window.__timelines.gatessaving = tl`.
- Assets: `map.png`, `map-day.png` (same sizes as start-ride's), `theme.js`, GSAP CDN.

### 1.4 `ranking/index.html` — scene 4, 10.8 s

- `#stage` attrs: `data-composition-id="ranking" ...` (no data-hf-id anywhere in this
  file).
- Clips: `#map`, `#ui`, both `data-start="0" data-duration="10.8"`, tracks 0/1.
- Element ids: `stage, map, basemap, mapsvg, route-casing, route-core, sec1..sec4,
  gate1..gate3, ring-start, ring-end, rider, scrim-bottom, dim, attrib, ui, tower,
  trow-1 ... trow-10, trow-today, capB`. No `#cam` — `#basemap` and `#mapsvg` sit
  directly in `.inner`.
- Classes: `.inner, .full-svg, .sector, .gate, .gc, .gk, .caption, .em-b, .em-i, .card,
  .hdr, .lbl, .rows, .tnum, .trow, .trow.today, .who, .time, .num`.
- Distinct CSS values: `.caption { top: 920px }`; `.em-b/.em-i` defined at top level (not
  under `.caption`); `#tower .rows { height: 600px }`; `.tnum` absolute 70px wide; `.trow
  { position:absolute; left:70px; right:0; height:60px; ... opacity:0 }` and `.trow.today
  { z-index: 2 }` with NO colour rule (colour flips to `#00D000` via `tl.set` on landing).
- SVG attrs identical to gates-saving's (10/6/6, `.gk` var(--ink) sw4, rider r 11 sw 3).
- JS globals: map preamble with `GATES=[0.24, 0.63, 0.84]` (NOT gates-saving's quarters —
  see section 3.7 b); `ride()` (constant-speed version, defined, never called); `tl`;
  `TOWER_ROWS`; `r`; `CLIMB_T0=3.20, CLIMB_DUR=2.2`; `STEP_DOWN`.
- `document.getElementById` sites: lines 184, 190, 191, 199, 210.
- Page-load sets: rings/rider cx/cy; `.sector {opacity:1}`; `.gate {opacity:1}`; rings
  opacity 1; `#rider` opacity 1 at P1 (restates gates-saving's final frame).
- Timeline: `#dim` to 0.7 at 0; `#tower` in 0.3; rows 0.80+0.15r; `#trow-10` out 3.00;
  Today climb 3.20-5.40, colour set at 5.40; STEP_DOWN nudges 3.24-4.73; `#capB` in 5.90,
  out 10.40, hard set 10.8. `tl.duration()` = 10.8.
- Export: `window.__timelines.ranking = tl`.
- Assets: `map.png`, `map-day.png`, `theme.js`, GSAP CDN.

### 1.5 `brandmark/closing/index.html` — scene 5, 4.0 s

- `#stage` attrs: `data-composition-id="closing" ...`.
- Clips: one, `#close` `data-start="0" data-duration="4.0" data-track-index="0"`.
- Element ids: `stage, close, wordmark`. Classes `.inner, .word, .tagline`.
- CSS: `#close .inner {opacity:1}` and `#wordmark`, `#wordmark .word`, `#wordmark
  .tagline` byte-identical to opening's.
- JS globals: `tl` only. No page-load sets.
- Timeline: wordmark 0.15 (0.80); tagline 0.55 (0.70); `#close .inner` fade 3.20-4.00;
  hard set 4.00. `tl.duration()` = 4.0.
- Export: `window.__timelines.closing = tl`. Assets: `theme.js`, GSAP CDN only.

### 1.6 Legacy `teaser/index.html` (prior art only)

11.2 s brand teaser, `data-composition-id="teaser"`, five clips on five tracks with real
`data-start` offsets (`#mark` 0/12, `#wordmark` 2/3, `#sectors` 5/4, `#tower` 9/1.6,
`#endcard` 10.6/1.4), one flat `tl` with absolute positions, exports
`window.__timelines.teaser`. It hides each clip's content via `.inner { opacity: 0 }` in
CSS and `tl.set(..., {opacity:1}, start)` / fade + hard `tl.set(...,{opacity:0}, end)` —
the ".inner-wrapper + hard-kill" pattern that cleared HyperFrames'
`gsap_exit_missing_hard_kill` StaticGuard errors (README lines 160-164, cycles/01 README).
Two lessons carry over: (i) a multi-track single page works with plain absolute
`data-start`s; (ii) HyperFrames audits that clip content is hard-killed at clip
boundaries, so the master must explicitly hide each scene at its end.

### 1.7 Cut sheet / concat / render pipeline

- `teaser/rounds/v9/concat.txt` (verbatim):
  ```
  file '../../../all-renders/opening_v3.mp4'
  file '../../../all-renders/start-ride_v4.mp4'
  file '../../../all-renders/gates-saving_v9.mp4'
  file '../../../all-renders/ranking_v8.mp4'
  file '../../../all-renders/closing_v5.mp4'
  ```
  v9 = 6.5 + 14.0 + 12.3 + 10.8 + 4.0 = 47.6 s (1428 frames @30 fps), stream-copy concat.
  With the already-edited 6.2 s opening: 6.2 + 14.0 + 12.3 + 10.8 + 4.0 = 47.3 s.
- `teaser/README.md`: "Order and in/out points are a property of this file"; every
  ingredient plays in full (in = 0, out = its whole length). `ride/README.md`:
  `ride_v1.mp4` = start-ride_v4 + gates-saving_v9 concat (26.3 s), the deliverable the
  ride soundtrack is cut against — also concat-built, unaffected by this work but worth
  remembering.
- `structure.md` line 84-87 (verbatim): "The production method is still undecided —
  either split every ingredient into its own `index.html` and rebuild teaser as one real
  HyperFrames render, or keep ffmpeg-concat as the permanent method; ask Nathan." The
  per-ingredient split half is already done; this brief is the "rebuild teaser as one
  real render" half.
- `render.ps1` assumptions (lines 39-142): `-Name <folder>` is a path relative to
  `silent-studio/` (subpaths OK, default `'teaser'`); the folder must exist; it
  `Push-Location`s into it and runs `npx --yes hyperframes render` (or `preview`) with NO
  arguments — so HyperFrames must find `index.html` in that folder by itself; `-Theme
  day` requires `<folder>/theme.js` to exist and the script REWRITES that file
  (`document.documentElement.setAttribute('data-theme','day');`) then restores 'night' in
  `finally`; day renders are expected in `<folder>/renders/*.mp4` and renamed
  `*_day.mp4`. Nothing else is assumed (no manifest, no duration parameter, no multi-file
  support). Renders land in `<folder>/renders/` as timestamped MP4s; a reviewed copy is
  manually placed in `<folder>/rounds/vN/`.

---

## 2. FEASIBILITY

### 2.1 Element-id collisions (exact)

| id | opening | start-ride | gates-saving | ranking | closing | Role/styling match? |
|---|---|---|---|---|---|---|
| `stage` | Y | Y | Y | Y | Y | composition root — only ONE survives |
| `wordmark` | Y | | | | Y | identical CSS and markup |
| `map`, `ui` | | Y | Y | Y | | clip wrappers, identical CSS; `data-duration` differs (14.0 / 12.4 / 10.8) |
| `cam` | | Y | Y | — | | identical CSS; ranking has none |
| `basemap, mapsvg, route-casing, route-core, sec1-4, gate1-3, ring-start, ring-end, rider` | | Y | Y | Y | | same CSS rules; SVG presentation attrs differ: start-ride casing 7 / core 4 / sectors 9 / rider r7 sw2 / `.gk` yellow sw3 op.6 vs gates-saving and ranking 10 / 6 / 6 / r11 sw3 / `.gk` var(--ink) sw4 op1 |
| `dim`, `attrib` | | Y | Y | Y | | identical |
| `tint`, `cursor`, `start-btn`, `cap1`, `blackout` | | Y | | | | unique elements (but `#start-btn` CSS also exists in gates-saving and ranking with extra `flex-direction:column; gap:16px`) |
| `scrim-bottom` | | | Y | Y | | identical |
| `capA` | | | Y | | | unique |
| `capB` | | | Y | Y | | same id, different text ("Next time. Start racing yourself." vs "Compare against yourselfs") and different `.caption` top (990 vs 920) |
| `tower, trow-1...10, trow-today` | | | | Y | | unique elements; `#tower`/`.trow` CSS also exists (stale, different) in start-ride and gates-saving |
| `open, mark, ring, slash` | Y | | | | | unique |
| `close` | | | | | Y | unique |

Also duplicated: `data-hf-id` values across start-ride/gates-saving (list in section 1.2).
These are HyperFrames Studio bookkeeping; ranking, opening and closing have none and
render fine, so they are optional.

### 2.2 CSS collisions with DIFFERENT values (must be scoped; everything else is identical and harmless)

1. `.caption { top: 920px }` (start-ride, ranking) vs `top: 990px` (gates-saving).
   Unscoped -> last rule wins -> wrong caption height in two scenes.
2. `.trow` / `.trow.today`: start-ride and gates-saving define `.trow { display:flex;
   align-items:center; height:60px; opacity:0 }` (no `position`), `.trow .rk`, and
   `.trow.today .rk, .trow.today .who, .trow.today .time { color: #9000C8 }`; ranking
   defines `.trow { position:absolute; left:70px; right:0; ... }`, `.trow.today {
   z-index:2 }` and deliberately no colour. Unscoped -> ranking's Today row would be
   purple from frame one and, if start-ride's rule ordered last, lose
   `position:absolute`. Real regression.
3. `#tower .rows`: ranking adds `height: 600px`; others don't. Minor but scope it.
4. `#start-btn`: gates-saving/ranking add `flex-direction: column; gap: 16px` and
   `#start-btn .sub`. Only start-ride has the element (single child, so visually the
   same) — scope anyway.
5. `.em-i / .em-b` defined as `.caption .em-i` (gates-saving) vs `.em-b` (ranking) — same
   values, harmless.

Identical across files (no action beyond prefixing for tidiness): `#cam`, `#dim`,
`#attrib`, `#basemap`, `svg.full-svg`, `#scrim-bottom`, `.card*`, `.num`,
`#rank-card/#rank-pos/.rnum/.rrow` (stale, no elements anywhere), `#wordmark*`, SVG token
rules.

### 2.3 JS global collisions (all `var`/`function` at script top level)

Shared by the three product scenes: `MAP_CENTER, MAP_ZOOM, ROUTE, GATES, SECTOR_COLORS,
pts, dAttr, core, L, at, P0, P1, bounds, s, a, b, el, GATE_PT, ride, tl`. start-ride and
gates-saving also: `CAM_S, CAM_MIN_X, CAM_MAX_X, CAM_MIN_Y, CAM_MAX_Y, clamp, camAt,
camXY`. All five: `tl`. Unique: opening `CIRC`; start-ride `scoreGate, cam0`;
gates-saving `GATE_LEN, camStart, PULSE_T, GATE_T, DIP_A, RIDE_PROFILE, rideFrac,
RIDE_T0, RIDE_DUR`; ranking `TOWER_ROWS, r, CLIMB_T0, CLIMB_DUR, STEP_DOWN`. Note `GATES`
differs by scene (start-ride/ranking 0.24/0.63/0.84; gates-saving 0.25/0.50/0.75) and
`ride()` has three different bodies — so they MUST stay separate, which an IIFE per scene
gives for free.

### 2.4 Does the collision set force edits inside the scenes' timeline JS?

No, provided the selector strings are scoped rather than renamed. Every GSAP target in
all five scripts is either an id/class selector string (`'#rider'`, `'#gate' + k + '
.gk'`, `'.gate line'`, `['#route-casing', '#route-core']`, `'#trow-today .who,
#trow-today .time'`) or a computed one; none is an element reference. GSAP 3.11+ provides
`gsap.context(fn, scopeElement)`: "any selector text used in GSAP-related code inside the
function gets scoped to that element". Running each scene's script body verbatim inside
`gsap.context(function(){ ... }, sceneRoot)` makes every `gsap.set(...)` and
`tl.to/fromTo/set(...)` resolve within that scene's subtree, with zero edits to the tween
lines. The five non-GSAP `document.getElementById(...)` calls per product scene (geometry
build + day-theme basemap swap) are NOT covered by GSAP scoping and would otherwise return
the FIRST matching element in the document (start-ride's), leaving gates-saving's and
ranking's `<path>`s without a `d` attribute. Fix: one local shim line at the top of each
IIFE (`var document = { getElementById: id => root.querySelector('#' + id),
documentElement: window.document.documentElement }`) or a mechanical replace of
`document.getElementById(` -> `root.querySelector('#' +` at those five lines. Either is
mechanical; the shim leaves the scene body byte-identical.

Caveats, stated honestly: this could not be executed in a browser here, so
`gsap.context` scoping of timeline-method string targets is asserted from GSAP's
documented behaviour, not observed. The brief therefore includes a mandatory preview
verification and a fallback (sections 3.6, 3.8). Everything else in this section is
directly observed in the files.

Nested-timeline math: `master.add(childTl, pos)` sets `childTl.startTime = pos`; a
child's tweens keep their positions relative to the child's own zero, so start-ride's
`shiftChildren(1.0, true)` and the 240-tween `ride()` loops are untouched. Observed: no
scene depends on any clock but its own `tl` (grep in section 0.1). Frame-seeking
determinism is preserved: the scenes already avoid callbacks for exactly this reason
(comments at start-ride 211-212, gates-saving 257-259, ranking 243-247).

Real blockers found: none. Things that are NOT blockers but must be handled: paused
children (0.7), id/CSS/JS scoping (above), one-scene-visible-at-a-time layering (3.4),
and exporting exactly one `window.__timelines` key (3.5).

---

## 3. IMPLEMENTATION BRIEF (for a Sonnet executor; mechanical; stop on any ambiguity not covered here)

### 3.0 Scope and rules

- Build ONE new composition folder. Do NOT modify any of the five scene folders,
  `teaser/index.html`, `render.ps1`, `structure.md`, or `teaser/README.md`
  (documentation updates are a separate follow-up once Nathan has seen a render).
- Copy scene code VERBATIM; the only permitted changes to copied code are the
  wrapping/prefixing steps listed below. If a step requires editing a tween line
  (`tl.to/fromTo/set`, `gsap.set`) inside a scene, STOP and report — that means an
  assumption here is wrong.
- Every taste question in section 3.7 stays open; implement the "as-is" default noted
  there and flag.

### 3.1 Folder and files

- Working folder name: `marketing/silent-studio/teaser-full/` (sibling of the scenes;
  leaves `teaser/` and its legacy `index.html` untouched so the two can be rendered and
  frame-diffed side by side). Final home is Nathan's call — section 3.7 c.
- Files to create/copy into it: `index.html` (new, below); `theme.js` (copy of
  `start-ride/theme.js`, one line, needed for `render.ps1 -Theme day` and referenced by
  `<script src="theme.js">`); `map.png` and `map-day.png` (copy from `start-ride/`;
  verify md5 equals the copies in `gates-saving/` and `ranking/` first — all three
  folders show identical byte sizes 2,379,000 / 3,057,619; if md5s differ, STOP and
  report which); `renders/.gitkeep`; `README.md` (short: what this is, how built,
  pointer to this brief — no cut-sheet duplication).
- Do not copy any `data-hf-id` attributes into the new file (strip them all; they are
  Studio bookkeeping and duplicated across scenes). If unsure whether Studio needs them,
  note: ranking/opening/closing have none and render fine.

### 3.2 `index.html` skeleton

```
<!DOCTYPE html>
<html lang="en" data-theme="night">
<head>
<script src="theme.js"></script>
<meta charset="UTF-8">
<title>Qualifire — Teaser, full (HyperFrames)</title>
<style>
  /* (A) the shared block from 1.0, once: :root tokens, :root[data-theme=day], html/body, *, #stage, .clip, .clip.full */
  /* (B) scene roots */
  .scene { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; visibility: hidden; }
  #scene-opening { visibility: visible; }   /* frame 0 belongs to opening; avoids relying on a zero-duration set at t=0 */
  /* (C) each scene's OWN rules, every selector prefixed with its scene root id — see 3.3 */
</style>
</head>
<body>
<div id="stage" data-composition-id="teaser" data-start="0" data-width="1920" data-height="1080">
  <div id="scene-opening"     class="scene"> ...opening's #open clip subtree verbatim... </div>
  <div id="scene-startride"   class="scene"> ...start-ride's #map, #ui clips AND #blackout div verbatim... </div>
  <div id="scene-gatessaving" class="scene"> ...gates-saving's #map, #ui verbatim... </div>
  <div id="scene-ranking"     class="scene"> ...ranking's #map, #ui verbatim... </div>
  <div id="scene-closing"     class="scene"> ...closing's #close clip verbatim... </div>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
  <script> /* scene scripts, one IIFE each — 3.5 */ </script>
  <script> /* master — 3.5 */ </script>
</div>
</body>
</html>
```

Clip attributes inside each scene root: change each copied `.clip`'s `data-start` to the
scene's absolute start and `data-duration` to the scene's actual length, and give every
clip a unique `data-track-index` (0-8 in DOM order). Values (blackout beat kept as-is,
section 3.7 a):

| scene root | abs start | length | clips |
|---|---|---|---|
| `#scene-opening` | 0.0 | 6.2 | `#open` |
| `#scene-startride` | 6.2 | 14.0 | `#map`, `#ui` (+ `#blackout`, not a clip) |
| `#scene-gatessaving` | 20.2 | 12.3 (correct the stale 12.4) | `#map`, `#ui` |
| `#scene-ranking` | 32.5 | 10.8 | `#map`, `#ui` |
| `#scene-closing` | 43.3 | 4.0 | `#close` |
| total | | 47.3 | |

(These attributes are HyperFrames' declarative layer; the render length itself follows
the GSAP master, section 0.6. Keep them consistent regardless.)

### 3.3 CSS prefixing (block C)

For each scene, copy every rule that is NOT in the shared block (A), and prefix each
selector with the scene root id, e.g. gates-saving's `.caption { top: 990px; ... }` ->
`#scene-gatessaving .caption { top: 990px; ... }`; `#cam {...}` -> `#scene-startride #cam
{...}`; `svg.full-svg` -> `#scene-ranking svg.full-svg`; multi-selector rules get the
prefix on each part (`#scene-startride #ring-start, #scene-startride #ring-end {...}`).
Use manual prefixing, not CSS nesting (Chromium version of HyperFrames' renderer
unknown). Include the stale rules (`#rank-card`, `.rnum`, `.trow` variants in
start-ride/gates-saving) prefixed too — harmless, and keeps the copy a faithful superset;
do not "clean up" while porting. `#open .inner`/`#close .inner`/`.clip .inner` rules:
prefix likewise.

### 3.4 Scene visibility (master timeline, not scene code)

The master shows exactly one scene root at a time via zero-duration sets at the
boundaries (this is the `.inner`-wrapper/hard-kill pattern applied one level up):

```
master.set('#scene-opening',     { visibility: 'hidden'  }, 6.2);
master.set('#scene-startride',   { visibility: 'visible' }, 6.2);
master.set('#scene-startride',   { visibility: 'hidden'  }, 20.2);
master.set('#scene-gatessaving', { visibility: 'visible' }, 20.2);
master.set('#scene-gatessaving', { visibility: 'hidden'  }, 32.5);
master.set('#scene-ranking',     { visibility: 'visible' }, 32.5);
master.set('#scene-ranking',     { visibility: 'hidden'  }, 43.3);
master.set('#scene-closing',     { visibility: 'visible' }, 43.3);
```

Opening is visible from CSS (3.2 B), so no set at t=0 is needed. Insert these AFTER the
five `master.add(...)` calls so they sort after the children at equal times (GSAP renders
zero-duration sets at the same position in insertion order). Use `visibility`, not
`opacity`/`display`, so children's own opacities are untouched and layout is unaffected.

### 3.5 Scripts

One `<script>` per scene (after GSAP loads), each of this exact shape — the body between
the markers is the scene's original `<script>` content copied verbatim, including its
`window.__timelines...` lines:

```
(function () {
  var root = window.document.getElementById('scene-startride');
  // local shim: the scene's five document.getElementById() calls must resolve inside THIS scene's subtree
  var document = { getElementById: function (id) { return root.querySelector('#' + id); },
                   documentElement: window.document.documentElement };
  gsap.context(function () {
    /* ---- BEGIN verbatim start-ride/index.html script (lines 143-277) ---- */
    ...
    /* ---- END ---- */
  }, root);
})();
```

Opening and closing have no `document.getElementById` calls; give them the same wrapper
anyway for uniformity (the shim is unused there). Required: `gsap.context` exists (GSAP
>= 3.11; the CDN `gsap@3` resolves to latest 3.x). Add at the very top of the master
script: `if (!gsap.context) throw new Error('gsap.context missing — GSAP < 3.11');`.

Master script (last):

```
var T = window.__timelines;                       // {opening, startride, gatessaving, ranking, closing}
var master = gsap.timeline({ paused: true });
// children were created paused:true — a paused child never advances with its parent. Un-pause BEFORE add so add() owns the startTime.
[['opening',0.0],['startride',6.2],['gatessaving',20.2],['ranking',32.5],['closing',43.3]].forEach(function (p) {
  var child = T[p[0]]; child.paused(false); master.add(child, p[1]);
});
/* visibility sets from 3.4 here */
window.__timelines = { teaser: master };          // export exactly one timeline, like every other composition
console.log('teaser-full duration', master.duration(),
  Object.keys(T).map(function (k) { return k + '@' + T[k].startTime() + '/' + T[k].duration(); }).join(' '));
```

Expected console line: `teaser-full duration 47.3 opening@0/6.2 startride@6.2/14
gatessaving@20.2/12.3 ranking@32.5/10.8 closing@43.3/4`. Any other numbers -> STOP and
report.

### 3.6 Verification (on Nathan's PC; the sandboxes cannot reach npm)

1. `.\render.ps1 -Name teaser-full` (preview). Console must show the expected duration
   line, zero red errors, and zero `gsap_exit_missing_hard_kill`/StaticGuard messages.
   Then `npx hyperframes lint` and `npx hyperframes check` inside the folder.
2. `npx hyperframes snapshot --at 3.9,7.9,12.5,26.01,30.0,35.7,44.5` and compare
   (visually or by mean-abs-diff, as v9 FEEDBACK did) against the per-scene renders at
   scene-relative times 3.9 (opening), 1.7 and 6.3 (start-ride), 5.81 and 9.8
   (gates-saving — `gates-saving/rounds/v9/frame_5_81s.png` already exists), 3.2
   (ranking), 1.2 (closing). With the blackout beat kept, every frame should match its
   source render (except opening, whose 6.2 s edit has no render yet).
3. Scoping proof frames: 7.9 s must show start-ride's THIN route (casing 7) and NO gate
   ticks; 26.01 s must show gates-saving's gates at quarters with the rider on gate 1;
   35.7 s must show a WHITE "Today" row climbing (not purple) — this is the check that
   CSS scoping (section 2.2 item 2) and selector scoping both worked.
4. `.\render.ps1 -Name teaser-full -Render`; ffprobe duration must read 47.300000 (1419
   frames). Then `-Theme day -Render` once night is accepted.

### 3.7 OPEN DECISIONS — flag to Nathan, do NOT resolve in the build (implement the "as-is" default, note it in the README)

a. start-ride's 1.0 s blackout/reveal lead-in (`tl.shiftChildren(1.0, true)` + `#blackout`
   0.4-1.0, start-ride lines 269-274). It existed only because each clip had to be
   self-contained for concat; in one render the opening already fades to black
   5.20-6.00 and pads black to 6.2, so the beat is now optional. Options: keep as-is
   (default for the first build — keeps every downstream audio cue where it is),
   shorten, or remove. Arithmetic for Nathan: as-is, button-appear starts at teaser 7.4 s
   and the click lands at 9.4 s (matches FEEDBACK-v1's "0.3 s cascade" result); removing
   the whole 1.0 s shift would put them at 6.4 / 8.4 against the arrangement's 6.30 /
   8.70 targets and shorten the teaser to 46.3 s, moving every later cue -1.0 s
   (teaser-lanes option files, `prep_kit.py` kit, ranking/closing piano restart).
   Shortening by x s scales accordingly. If he removes it, the mechanical change is in
   the COPY only: delete the `#blackout` div, its CSS and lines 273-274, and no other
   line — but only on his say-so.
b. Gate positions jump at the gates-saving-to-ranking seam: gates-saving
   `GATES=[0.25,0.50,0.75]`, ranking `GATES=[0.24,0.63,0.84]` (ranking's frame 0
   otherwise restates gates-saving's last frame). Pre-existing in teaser v9, not
   introduced by this work; a one-constant change in ranking's copy would fix it, but
   whether ranking should match, or whether ranking should stop re-drawing the map at
   all and simply continue gates-saving's DOM (the design freedom Nathan asked for), is
   his call. Default: leave as-is.
c. Final home: keep `teaser-full/` as a sibling, or make it `teaser/index.html`
   (structure.md's "teaser is the full video"), moving the legacy 11.2 s file to a
   legacy/`safe_to_delete/` location (project rule: never delete; moving needs a shell
   on Nathan's PC). Default: build in `teaser-full/`.
d. Smaller now-optional seams he may want to revisit later, not to touch now: opening's
   0.2 s black pad (6.0-6.2), closing's 0.15 s "breath", gates-saving's zoom-out
   match-cut (already continuous), cross-scene overlaps/transitions.

### 3.8 Fallback if step 3.6.3 fails (selector scoping did not take)

Only then: mechanical id prefixing in the copies — prefix every id in a scene's markup
with a short scene token (`sr-`, `gs-`, `rk-`; brandmark scenes need only `wordmark` ->
`op-wordmark`/`cl-wordmark`) and apply the same prefix to every `'#...'` string literal
and `getElementById('...')`/`'sec' + ...`/`'gate' + ...`/`'#trow-' + ...` builder in that
scene's script and CSS. This DOES touch tween lines (~40 per product scene) and
therefore needs the fresh-context inspector to diff every changed line against the
original. Report before starting it.

---

## 4. What this does NOT resolve

- render.ps1 / pipeline changes: none required, none proposed here. Observed assumptions
  (`-Name` = existing folder under silent-studio containing `index.html`; `npx
  hyperframes render` run inside it with no args; optional `theme.js` rewritten for
  `-Theme day`; day renders picked up from `<folder>/renders/*.mp4`) are all satisfied by
  `teaser-full/` as specified in section 3.1. The only pipeline-adjacent item is cosmetic
  and out of scope: `render.ps1`'s default `-Name 'teaser'` and its help text still point
  at the legacy folder; and `structure.md`/`teaser/README.md`/`all-renders/` mirror
  conventions (one file per composition) would need a follow-up once a render exists.
  Any edit to `render.ps1` is explicitly out of scope for this brief.
- Whether HyperFrames uses clip `data-start/data-duration` for anything beyond Studio
  display and the StaticGuard hard-kill audit is not determinable from the repo; the
  brief keeps them consistent with the GSAP master so either reading is satisfied.
- `gsap.context` scoping of timeline-method targets is asserted from GSAP documentation,
  not executed here (no browser/npm in either sandbox); section 3.6.3 is the gate and
  section 3.8 the fallback.
- Audio/kit follow-ups (`tools/teaser-lanes/prep_kit.py`, option A/B JSONs, `ride/`
  deliverable) are unaffected while the blackout beat stays as-is and shift only if
  section 3.7 a changes timing — noted, not planned here.
- The 6.2 s opening has been edited but not yet rendered; `all-renders/opening_v3.mp4` is
  still 6.5 s. Irrelevant to the single render (it uses source, not MP4s) but relevant to
  any frame-diff against v9.
