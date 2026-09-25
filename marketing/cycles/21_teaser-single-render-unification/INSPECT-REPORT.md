# Inspector report — teaser-full build (Opus, fresh context, 2026-09-26)

## Verdict: PASS WITH FINDINGS (minor)

None of the findings blocked the build. Every check below was re-derived from the real
files (read in full via device_bash) plus scripted diffs and a stubbed JS run — the
executor's self-report was not trusted, only used as a pointer to what to re-check.
Runtime GSAP behaviour and the rendered output were out of scope (no browser/npm here).

### Findings
1. **The `gsap.context` guard could not fire first.** It sat at the top of the master
   script, after all 5 scene IIFEs, which each call `gsap.context(...)` themselves. On an
   old GSAP, scene 0 would throw a generic `TypeError: gsap.context is not a function`
   before the friendly message ever ran. Low severity (it still fails loudly), and the
   mistake traced to the brief's own script ordering, not an executor error.
   **Fixed post-inspection** (coordinator, direct 2-line edit): moved the guard into its
   own `<script>` tag right after the GSAP CDN tag, before any scene script runs.
   `index.html` is now 1014 lines, md5 `c6ab21e685965c2b7af8fbef428f4cbd`.
2. Two globals leak from the master script: `T` and `master` (both top-level `var`s in
   the brief's own master snippet). No scene reads them — harmless, left as-is.
3. Brief 3.2's clip table says "data-track-index 0-8 in DOM order" but there are only 8
   clips total (1+2+2+2+1); the executor correctly used 0-7. Brief wording imprecision,
   not an executor error.
4. Opening's clip attribute is now `data-start="0.0"` (was `"0"`) — equivalent, no action.
5. Not verifiable here: real `gsap.context` scoping in a browser, HyperFrames'
   StaticGuard/lint behaviour with absolute clip `data-start`s, and the visual frames.
   Brief step 3.6 on Nathan's PC is still the gate for all of this.

### 1. Script bodies byte-for-byte
Extracted each source's inline `<script>` body and the text inside each scene's
`gsap.context(function () {...}, root)` in the output, compared as exact strings:
opening (2044 chars), start-ride (9125), gates-saving (13679), ranking (8756), closing
(910) — all IDENTICAL. Covers every tween, every number, every comment, the indentation,
start-ride's `shiftChildren(1.0, true)` and blackout tween, and each
`window.__timelines.<name> = tl` line. The five wrappers are uniform and each root id
matches the body it wraps.

### 2. CSS scoping
Parsed every rule in all 5 sources (comments stripped, whitespace normalised). Shared
block (7 rules) identical across all 5 sources, appears once. Every other rule appears
prefixed `#scene-<name> ` + selector, declarations unchanged, order preserved: opening
8/8, start-ride 34/34, gates-saving 35/35, ranking 27/27, closing 4/4 match. Nothing
unscoped besides `.scene{visibility:hidden}` and `#scene-opening{visibility:visible}` as
specified. No source uses `visibility`/`autoAlpha` itself, so no child can override a
hidden scene root.

Collision cases confirmed correctly isolated: caption height (990px gates-saving vs 920px
start-ride/ranking, each scoped to its own root); `#start-btn` flex-direction variant
(gates-saving/ranking copies match no element in those scenes); `#tower .rows` 600px
(ranking only); SVG stroke-width/color presentation attributes per scene (start-ride 7/4/9,
yellow `.gk`, rider r7; gates-saving/ranking 10/6/6, ink `.gk`, rider r11) — carried over
unchanged.

**Cascade trace for the purple-row risk:** the only `.trow.today...{color:#9000C8}` rules
are under `#scene-startride` and `#scene-gatessaving`. Ranking's Today row's `.who`/`.time`
sit under `#scene-ranking` only, which those rules cannot match; the matching rule there is
`#scene-ranking .trow .who/.time { color: var(--ink) }` — white, turning `#00D000` only when
ranking's own inline `tl.set` fires at 5.4s scene time (37.9s teaser time). Confirmed not
purple. Prefixing added one id evenly to every scene rule, so intra-scene specificity order
is unchanged and no scene rule competes with the shared block.

### 3. JS scoping
Every script parses. Ran all 6 inline scripts in a node vm with a stub GSAP
(`context` sets current scope) and a stub document logging any non-`scene-*`
`getElementById` call: only new global after each scene script is `__timelines`; after
the master, also `T`/`master` (finding 2). `GATES`, `ride`, `camAt`, `L`, `at`, `tl`, etc.
stay inside their IIFEs. Zero `getElementById` calls reached the global document — each
product scene's 15 lookups (`#basemap`, `#route-casing/#route-core/#sec1-4`,
`#route-core`, `#sec1-4`, `#gate1-3`) went through its own scoped root, day theme
`src=map-day.png` applied to each scene's own `#basemap`. All 803 `tl` calls and 20
`gsap.set` calls ran inside their scene's context (opening 8, start-ride 499,
gates-saving 265, ranking 27, closing 4); only the master's 8 `set`s ran outside any
context, correctly.

### 4. Master timeline
Each child's paused state was `false` at the moment of `add`. Adds at 0, 6.2, 20.2, 32.5,
43.3, in that order. The 8 visibility `master.set`s come after the adds, matching brief
3.4. `window.__timelines` ends with a single key, `teaser`, pointing at the master.
Durations re-derived independently from each source (matches the stub run):

| scene | duration | last event |
|---|---|---|
| opening | 6.2 | `tl.set('#open .inner',...,6.20)` |
| start-ride | 14.0 | `tl.set('#cap1',...,13.0)` + 1.0 shift; ride ends 4.3+8.5+1=13.8 |
| gates-saving | 12.3 | `tl.set('#capB',...,12.3)`; ride ends 3.80+7.58=11.38, sec4 to 11.63 |
| ranking | 10.8 | `tl.set('#capB',...,10.8)` and `to` at 10.40+0.4 |
| closing | 4.0 | `tl.set('#close .inner',...,4.00)` |

Cumulative: 0 -> 6.2 -> 20.2 -> 32.5 -> 43.3 -> 47.3. `master.duration()` should be 47.3.

### 5. Structure
HTML-parser-checked: no mismatched/unclosed tags, exactly 1 each of
`html`/`head`/`body`/`style`, 8 `<script>` tags, 59 `div`s (pre-fix count; the guard fix
added one script tag, now 9, still balanced). All 5 `#scene-*` roots direct children of
`#stage`; `#blackout` inside `#scene-startride`. `data-hf-id` count 0. `theme.js` loads
first in `<head>`; GSAP CDN tag loads before every scene script. Markup diff against each
source (after stripping `data-hf-id`): only clip `data-start`/`data-duration`/
`data-track-index` differ, exactly as the executor reported.

### 6. Side effects
All protected files older than the build (`teaser-full/index.html` newest); a
newer-than-build-time find under `marketing/` returns only this cycle's own files. No
source scene file, `teaser/index.html`, `render.ps1`, `structure.md`, or
`teaser/README.md` touched. `map.png`/`map-day.png` md5s identical across start-ride,
gates-saving, ranking and teaser-full. `theme.js` identical to start-ride's.
`renders/.gitkeep` exists. `README.md` accurate, states preview/render not yet run.

### 7. Other
No scene script targets `#stage` or anything outside its own subtree. The shim only
needs `getElementById`/`documentElement`, which is all the scenes use — stub run raised
no errors. Scene roots appear in the DOM before the scripts, so `root` is never null.

| tier | model | tokens | outcome |
|---|---|---|---|
| inspect | Opus (fresh context) | ~186k | PASS WITH FINDINGS (5 minor, 0 blocking); 1 finding fixed directly post-inspection (guard ordering) |
