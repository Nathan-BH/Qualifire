# BRIEF — teaser-full v2: rebuild as a HyperFrames ROOT + 5 SUB-COMPOSITIONS

Plan tier (Fable), 2026-09-26. Executor: Sonnet. Inspector afterwards: Opus (fresh context).
Supersedes `BRIEF-teaser-full.md` (v1, the manual `master.add()` merge — wrong mechanism).

## 0. Rules for the executor (read first)

1. **STOP on ambiguity.** If anything below cannot be carried out exactly as written — a
   scene's duration cannot be confirmed, a CSS rule does not fit the prefixing rule, a
   `document.` usage other than the two listed kinds turns up, a file is not where this
   brief says it is — do NOT guess or improvise. Stop, write what you found into
   `EXECUTOR-REPORT-v2.md` (section 9) under "STOPPED", and end. Chat rules on it.
2. **Never modify the five original scene files** — they are read-only sources:
   - `marketing/silent-studio/brandmark/opening/index.html`
   - `marketing/silent-studio/start-ride/index.html`
   - `marketing/silent-studio/gates-saving/index.html`
   - `marketing/silent-studio/ranking/index.html`
   - `marketing/silent-studio/brandmark/closing/index.html`
   Also do not touch their `theme.js`, `README.md`, `rounds/`, `renders/`, or anything else
   under those folders. Only read from them.
3. **Never delete.** Nothing is `rm`'d in this cycle. The one file this brief overwrites
   (`teaser-full/index.html`) is archived first (section 3, step 0).
4. **Tween fidelity is absolute.** Every GSAP line (`gsap.set`, `tl.to`, `tl.fromTo`,
   `tl.set`, `tl.shiftChildren`, every ease, every time, every value) is copied byte-for-byte.
   The ONLY permitted changes to script text are the mechanical ones in section 5.4. Build
   the new files with a script (python3 is available in the device VM) that reads the
   original files and transforms them — do not retype content by hand.
5. Paths. On the device bridge the repo is `$HOME/mnt/Qualifire/...`; on Nathan's PC the
   same path is `C:\Users\natha\Claude personal projects\Qualifire\...`. All PowerShell blocks
   in this brief and in anything you write for Nathan carry their own full `cd "C:\..."` line.
6. Do not run `npm`/`npx` install steps expecting them to work: the device VM cannot reach the
   npm registry. Section 8 says what to try once and what to hand to Nathan.

## 1. Why this brief exists (context, 1 minute)

v1 (`teaser-full/index.html`, 1014 lines, still on disk) merged all five scenes' markup into
one document and nested the five child GSAP timelines onto one master with
`master.add(child, absoluteStart)`. It is internally consistent (Opus-inspected), but
`npx.cmd hyperframes lint` on Nathan's PC returned 7 errors + 7 warnings:

| lint id | count | root cause | fate in v2 |
|---|---|---|---|
| `timeline_id_mismatch` | 5 | five `window.__timelines.<scene>` registered in a doc whose composition id is `teaser` | gone by design: each scene registers its own id in its own sub-composition |
| `nested_structure_needs_subcomposition` | 4 | `#scene-*` wrapper divs holding clips inside the root | gone by design: each scene IS a sub-composition file |
| `duplicate_media_id [basemap]` | 1 | three `<img id="basemap">` in one document | fixed in the NEW files only (section 6) |
| `duplicate_media_discovery_risk` (3 img) | 1 | same | same |
| `gsap_repeated_fromto_without_baseline` `#trow-today` | 1 | pre-existing in ranking's original | note only (section 7) |
| `svg_measure_before_path_d` `#route-core` | 1 | pre-existing in the map scenes' originals | note only (section 7) |

HyperFrames' own fix text: "Move `<div id="...">` and its contents into a sub-composition
file and mount it with `data-composition-src`." Docs: "Do not add a child timeline manually
to the parent GSAP timeline. HyperFrames seeks nested timelines independently."

The mechanism below was verified against HeyGen's own shipped 5-scene launch video
(`hyperframes-launches/claude-design-send-hyperframes-launch`, root `index.html` +
`compositions/s1..s5.html`). Facts established from that example that this brief relies on:

- **F1** Sub-composition files are `<template>`-wrapped fragments; the root has one EMPTY
  slot div per scene carrying `data-composition-src`; the root script registers only an
  empty paused timeline under the root's own composition id. No `master.add()` anywhere.
- **F2** Mounted sub-composition content lives in the ROOT DOCUMENT's light DOM (the
  example's scene scripts use plain `document.getElementById(...)` on their own mounted
  markup, and `document.currentScript.closest(...)`). Consequences: (a) `<html>` custom
  properties cascade into the scenes, so theme tokens are declared ONCE at the root;
  (b) ids are document-global, so selector strings in GSAP calls MUST be scoped
  (`gsap.context(fn, R)`), and media element ids must be unique across scenes.
- **F3** Relative asset URLs inside a sub-composition resolve against the ROOT folder
  (example: `compositions/s1-square.html` uses `src="assets/palette.png"`, and `assets/`
  is a sibling of the root `index.html`, not of `compositions/`). So `src="map.png"` inside
  `compositions/startride.html` correctly hits `teaser-full/map.png`.
- **F4** Inside a sub-composition, exactly one top-level clip div spans the whole
  composition at `data-track-index="0"`; further clips may be nested inside it on OTHER
  track indices (example: `#sq-main` track 0 contains a `<video class="clip">` at track 1).
- **F5** The example's own comments say the stitcher may rename a composition's root div
  to `<id>-slot`; so every scene keeps its "root-ish" id on an INNER div (`#<cid>-scene`),
  which is what scripts scope to. CSS uses the doubled prefix `#<cid> #<cid>-scene`.
- **F6** The scene `<script>` is the LAST child of the composition div (a sibling after the
  `#<cid>-scene` div), and locates its root via
  `(document.currentScript && document.currentScript.closest('#<cid>-scene')) || document.querySelector('#<cid>-scene')`.

## 2. Target layout and timing

```
marketing/silent-studio/teaser-full/
  index.html                 <- REWRITTEN: thin root, 5 empty slots (section 4, verbatim)
  compositions/              <- NEW folder
    opening.html             <- NEW (from brandmark/opening/index.html)
    startride.html           <- NEW (from start-ride/index.html)
    gatessaving.html         <- NEW (from gates-saving/index.html)
    ranking.html             <- NEW (from ranking/index.html)
    closing.html             <- NEW (from brandmark/closing/index.html)
  theme.js                   <- keep as is (60 bytes, sets data-theme=night; render.ps1 rewrites it)
  map.png, map-day.png       <- keep as is (already present, used by the three map scenes)
  README.md                  <- REWRITTEN (section 9)
  .hyperframes/ .thumbnails/ renders/   <- leave alone
```

Timing (root-absolute). Every number below is the scene's own `tl.duration()` as read from
its last `tl.set(..., <t>)`; gates-saving's clips declare a stale `12.4` but its timeline
ends at 12.3 and every render of it has measured 12.300000 s — use 12.3.

| order | composition id (`cid`) | source file | slot `data-start` | `data-duration` | slot `data-track-index` | inner scene id |
|---|---|---|---|---|---|---|
| 1 | `opening` | brandmark/opening/index.html | 0 | 6.2 | 0 | `opening-scene` |
| 2 | `startride` | start-ride/index.html | 6.2 | 14.0 | 1 | `startride-scene` |
| 3 | `gatessaving` | gates-saving/index.html | 20.2 | 12.3 | 2 | `gatessaving-scene` |
| 4 | `ranking` | ranking/index.html | 32.5 | 10.8 | 3 | `ranking-scene` |
| 5 | `closing` | brandmark/closing/index.html | 43.3 | 4.0 | 4 | `closing-scene` |

Total 47.3 s (0+6.2=6.2; +14.0=20.2; +12.3=32.5; +10.8=43.3; +4.0=47.3). If any original
file's last `tl.set` time disagrees with this table when you read it: STOP (rule 0.1).

## 3. Step 0 — archive v1 before touching anything

```bash
mkdir -p "$HOME/mnt/Qualifire/marketing/cycles/21_teaser-single-render-unification/v1-merged-timelines"
cp "$HOME/mnt/Qualifire/marketing/silent-studio/teaser-full/index.html" "$HOME/mnt/Qualifire/marketing/cycles/21_teaser-single-render-unification/v1-merged-timelines/index.html"
cp "$HOME/mnt/Qualifire/marketing/silent-studio/teaser-full/README.md"   "$HOME/mnt/Qualifire/marketing/cycles/21_teaser-single-render-unification/v1-merged-timelines/README.md"
md5sum "$HOME/mnt/Qualifire/marketing/silent-studio/teaser-full/index.html"
```
Expected md5 of the v1 file: `c6ab21e685965c2b7af8fbef428f4cbd` (per cycle README). If it
differs, still archive it, and record the actual md5 in your report (not a STOP).

## 4. Step 1 — the new root `teaser-full/index.html` (write VERBATIM)

The `:root` token blocks below are byte-identical to the shared block at the top of all five
original scenes (copy them from `brandmark/opening/index.html` lines 10-21 rather than from
here if you prefer — they must match). `data-theme="night"` on `<html>` and `<script
src="theme.js">` first in `<head>` are what `render.ps1 -Theme day` relies on — keep both.

```html
<!DOCTYPE html>
<html lang="en" data-theme="night">
<head>
<script src="theme.js"></script>
<meta charset="UTF-8">
<meta name="viewport" content="width=1920, height=1080">
<title>Qualifire — Teaser, full (HyperFrames)</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
<style>
  /* ---- theme tokens: night = the app's native mood (default), day = the website's light theme.
          Selected by data-theme on <html>; render.ps1 -Theme day sets it via theme.js.
          This is the ONLY declaration of these tokens in teaser-full: the five sub-compositions
          in compositions/ are mounted into this document and inherit them from <html>. ---- */
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
  html, body { margin: 0; padding: 0; width: 1920px; height: 1080px; overflow: hidden; background: var(--bg); }
  * { box-sizing: border-box; }

  #stage { position: relative; width: 1920px; height: 1080px; background: var(--bg); overflow: hidden; }
  /* the five scene slots stack on the same 1920x1080 canvas; the HyperFrames runtime shows
     each one only inside its own data-start/data-duration window */
  #stage > .clip { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
</style>
</head>
<body>

<!-- teaser-full v2 (2026-09-26): one real HyperFrames render of the whole teaser. Each scene is a
     sub-composition in compositions/ mounted here via data-composition-src; data-start is root-absolute.
     Scene lengths: opening 6.2, start-ride 14.0, gates-saving 12.3, ranking 10.8, closing 4.0 = 47.3 s.
     The root registers ONLY an empty paused timeline — HyperFrames seeks each child timeline itself.
     v1 (manual master.add() merge, lint-rejected) is archived in
     ../../cycles/21_teaser-single-render-unification/v1-merged-timelines/. -->
<div id="stage" data-composition-id="teaser" data-start="0" data-duration="47.3" data-width="1920" data-height="1080">
  <div id="opening-slot"     class="clip" data-composition-id="opening"     data-composition-src="compositions/opening.html"     data-start="0"    data-duration="6.2"  data-track-index="0"></div>
  <div id="startride-slot"   class="clip" data-composition-id="startride"   data-composition-src="compositions/startride.html"   data-start="6.2"  data-duration="14.0" data-track-index="1"></div>
  <div id="gatessaving-slot" class="clip" data-composition-id="gatessaving" data-composition-src="compositions/gatessaving.html" data-start="20.2" data-duration="12.3" data-track-index="2"></div>
  <div id="ranking-slot"     class="clip" data-composition-id="ranking"     data-composition-src="compositions/ranking.html"     data-start="32.5" data-duration="10.8" data-track-index="3"></div>
  <div id="closing-slot"     class="clip" data-composition-id="closing"     data-composition-src="compositions/closing.html"     data-start="43.3" data-duration="4.0"  data-track-index="4"></div>
</div>

<script>
  window.__timelines = window.__timelines || {};
  window.__timelines.teaser = gsap.timeline({ paused: true });
</script>

</body>
</html>
```

Nothing else goes in this file: no scene markup, no scene CSS, no scene scripts, no
`master.add`, no `gsap.context` guard, no visibility toggles.

## 5. Step 2 — the five sub-composition files (one recipe, applied five times)

Each original scene file has the same shape: `<head>` = `theme.js` + `<style>`; `<body>` =
one `<div id="stage" data-composition-id="<cid>" ...>` containing an HTML comment, one or two
clip divs (`#open` / `#close` / `#map`+`#ui`), for start-ride a bare `<div id="blackout">`,
then `<script src=gsap>` and one inline `<script>`. The recipe maps those parts onto this
skeleton. `<cid>` is the composition id from the table in section 2; `<DUR>` its duration.

```html
<template>
  <div id="<cid>" data-composition-id="<cid>" data-start="0" data-duration="<DUR>" data-width="1920" data-height="1080" style="position: relative; width: 1920px; height: 1080px; overflow: hidden; background: var(--bg);">
    <style>
      ...5.2: the scene's own CSS, every selector prefixed "#<cid> #<cid>-scene "...
    </style>

    <div id="<cid>-scene" class="clip full" data-start="0" data-duration="<DUR>" data-track-index="0">
      ...5.3: the original scene markup (the children of the original #stage, minus the scripts)...
    </div>

    <script>
      ...5.4: the original inline script, wrapped and scoped...
    </script>
  </div>
</template>
```

Rules that apply to the whole file:
- Nothing before `<template>` and nothing after `</template>`. No `<!DOCTYPE>`, `<html>`,
  `<head>`, `<body>`, `<title>`, `<meta>`, no `<script src=...>` (GSAP and theme.js are
  loaded once by the root). The `<script src="theme.js">` and
  `<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js">` lines are dropped.
- `data-start="0"` on the composition div and on `#<cid>-scene` — always 0 (local time).
- **Strip every `data-hf-id="..."` attribute** from copied markup (regex
  ` data-hf-id="[^"]*"` → empty). These are Studio stamps; start-ride and gates-saving carry
  overlapping values (`hf-lm34`, `hf-25zy`, `hf-ze3x`, `hf-si8b`, `hf-ofvj`, `hf-f0p9`,
  `hf-4pe2`, `hf-eh3b`, `hf-bug8`, `hf-6pf9`, `hf-fkgz` appear in BOTH files) and would be
  duplicate stamps once both are mounted in one document. HyperFrames re-stamps on open.
- File encoding UTF-8, LF line endings (same as the originals).

### 5.1 The composition div

Exactly as in the skeleton. `background: var(--bg)` (not a literal colour) so day/night
still follow the root's `data-theme`.

### 5.2 CSS — mechanical transformation of the original `<style>` block

Take the original `<style>...</style>` contents. The first ~30 lines are the "shared block",
byte-identical in all five files; handle its rules as follows, in order:

| original rule (shared block) | what to do |
|---|---|
| the `/* ---- theme tokens ... ---- */` comment | drop |
| `:root { ... }` | **drop** — tokens live only in the root document (fact F2a). Do NOT redeclare them on `#<cid>`: a declaration on `#<cid>` would beat the root's `:root[data-theme="day"]` override for that subtree and silently break day renders. |
| `:root[data-theme="day"] { ... }` | **drop** (same reason) |
| `html, body { ... }` | drop (the root declares it) |
| `* { box-sizing: border-box; }` | keep, prefixed: `#<cid> #<cid>-scene * { box-sizing: border-box; }` |
| `#stage { position: relative; width: 1920px; height: 1080px; background: var(--bg); overflow: hidden; font-family: ...; color: var(--ink); }` | becomes the scene root's own rule: selector `#<cid> #<cid>-scene`, SAME declarations except `position: relative;` → `position: absolute; top: 0; left: 0;`. Everything else in the block (width, height, background, overflow, font-family, color) unchanged. |
| `.clip { position: absolute; }` | keep, prefixed: `#<cid> #<cid>-scene .clip { position: absolute; }` |
| `.clip.full { top: 0; left: 0; width: 1920px; height: 1080px; }` | keep, prefixed |

Every remaining rule (the scene-specific part) is kept with its declarations byte-for-byte
and its selector prefixed. Prefixing rule: split the selector on commas; prefix EACH
comma-separated selector with `#<cid> #<cid>-scene ` (note the trailing space); re-join
with `, `. Examples:

| original selector | prefixed |
|---|---|
| `#open .inner` | `#opening #opening-scene #open .inner` |
| `#wordmark .word` | `#opening #opening-scene #wordmark .word` |
| `svg.full-svg` | `#startride #startride-scene svg.full-svg` |
| `#ring-start, #ring-end` | `#startride #startride-scene #ring-start, #startride #startride-scene #ring-end` |
| `.rrow.today .who, .rrow.today .time` | `#startride #startride-scene .rrow.today .who, #startride #startride-scene .rrow.today .time` |
| `.trow.today .rk, .trow.today .who, .trow.today .time` | three prefixed selectors joined by `, ` |

CSS comments are kept where they are (harmless). There are NO `@media`, `@font-face`,
`@keyframes` or other at-rules in any of the five files, and NO `:root`/`html`/`body`
selectors outside the shared block — if you find one, STOP (rule 0.1).

Colliding ids across scenes (`#map`, `#ui`, `#basemap`, `#cam`, `#dim`, `#attrib`, `#rider`,
`#route-core`, `#capB`, `#wordmark`, ...) are NOT renamed in HTML or CSS. Once every rule is
prefixed with `#<cid> #<cid>-scene`, a rule can only match inside its own scene even though
the ids repeat elsewhere in the document. The single exception is the media id `#basemap`
(section 6).

### 5.3 Markup

Inside `#<cid>-scene` place, verbatim (minus `data-hf-id` attributes), everything that sat
inside the original `<div id="stage" ...>` EXCEPT the two `<script>` elements: the leading
HTML comment, the clip div(s), and for start-ride the trailing `<div id="blackout"></div>`
(it must be inside `#<cid>-scene` so the scoped CSS and `R.querySelector` reach it; keep it
after `#ui`, as in the original).

Per fact F4 the inner clips move to non-zero track indices so the wrapper `#<cid>-scene`
owns track 0 (this is the ONLY attribute edit on copied markup besides `data-hf-id`):

| scene | inner clip(s) | original track | new track | data-duration |
|---|---|---|---|---|
| opening | `#open` | 0 | 1 | 6.2 (unchanged) |
| startride | `#map`, `#ui` | 0, 1 | 1, 2 | 14.0 (unchanged) |
| gatessaving | `#map`, `#ui` | 0, 1 | 1, 2 | **12.4 → 12.3** on both (stale attribute, see section 2) |
| ranking | `#map`, `#ui` | 0, 1 | 1, 2 | 10.8 (unchanged) |
| closing | `#close` | 0 | 1 | 4.0 (unchanged) |

`data-start="0"` on inner clips stays 0.

### 5.4 Script — wrap, scope, and two token substitutions

The original inline `<script>` body (everything between `<script>` and `</script>`,
excluding the GSAP CDN `<script src>` tag, which is dropped) goes inside this wrapper,
placed as the LAST child of the composition div (after `</div>` of `#<cid>-scene`):

```html
    <script>
(function () {
  var R = (document.currentScript && document.currentScript.closest('#<cid>-scene')) || document.querySelector('#<cid>-scene');
  if (!R || !window.gsap) return;
  function byId(id) { return R.querySelector('#' + id); }
  gsap.context(function () {

    /* ---- original script body, verbatim, with only the substitutions listed below ---- */

  }, R);
})();
    </script>
```

Why both layers: `byId` scopes the geometry-building lookups; `gsap.context(fn, R)` makes
GSAP resolve every selector STRING inside (`'#rider'`, `'.gate line'`, `'#wordmark .word'`,
`['#route-casing', '#route-core']`, `'#trow-today .who, #trow-today .time'`, ...) as
descendants of `R` — required because the mounted scenes share one document (fact F2b) and
`'#rider'` would otherwise hit all three riders. This is the same scoping v1 used and Opus
verified; it needs GSAP ≥ 3.11 (the `gsap@3` CDN serves 3.13+).

Permitted substitutions inside the body — these and NOTHING else:

1. `document.getElementById(` → `byId(` (plain text replace, argument expressions untouched).
   Expected counts: opening 0, closing 0, startride 5, gatessaving 5, ranking 5.
2. Section 6's basemap rename: the string `'basemap'` → `'<cid>-basemap'` — exactly one
   occurrence per map scene, inside `byId('basemap').src = 'map-day.png';`.

Leave `document.documentElement.getAttribute('data-theme')` exactly as it is (it reads the
root document's `<html>`, which is correct). The registration line
`window.__timelines.<cid> = tl;` already exists in every original with the correct id
(`opening`, `startride`, `gatessaving`, `ranking`, `closing`) — keep it as is, inside the
context function. Do NOT add `paused(false)`, do NOT add any `master`, do NOT add a
`tl.to({}, ...)` pad (each timeline already ends exactly at its `<DUR>`).

Any other `document.` reference in a body (there should be none besides the two kinds
above) → STOP.

### 5.5 Worked example — `compositions/closing.html`, complete

```html
<template>
  <div id="closing" data-composition-id="closing" data-start="0" data-duration="4.0" data-width="1920" data-height="1080" style="position: relative; width: 1920px; height: 1080px; overflow: hidden; background: var(--bg);">
    <style>
      #closing #closing-scene * { box-sizing: border-box; }

      #closing #closing-scene {
        position: absolute; top: 0; left: 0;
        width: 1920px;
        height: 1080px;
        background: var(--bg);
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: var(--ink);
      }

      #closing #closing-scene .clip { position: absolute; }
      #closing #closing-scene .clip.full { top: 0; left: 0; width: 1920px; height: 1080px; }

      #closing #closing-scene #close .inner { opacity: 1; }

      /* wordmark + tagline, centred -- copied verbatim from ../opening/ (cycle 9: closing = opening's second part, no mark) */
      #closing #closing-scene #wordmark { position: absolute; top: 50%; left: 0; width: 1920px; text-align: center; transform: translateY(-40px); }
      #closing #closing-scene #wordmark .word    { font-size: 96px; font-weight: 800; letter-spacing: 22px; color: var(--ink); margin: 0 0 22px 0; opacity: 0; }
      #closing #closing-scene #wordmark .tagline { font-size: 34px; font-weight: 500; letter-spacing: 1px;  color: var(--ink-dim); margin: 0; opacity: 0; }
    </style>

    <div id="closing-scene" class="clip full" data-start="0" data-duration="4.0" data-track-index="0">

      <!-- Closing (4.0s, v4): opening's second part re-used as the outro, per Nathan (cycle 9): "not the logo drawing,
           but only the qualifier text + the slogan beneath it". No mark. A beat of black, the off-white QUALIFIRE
           wordmark fades in, then the tagline (opening's beat-3 tweens, 2.95/3.35 there -> 0.15/0.55 here), a longer
           hold than opening's (this is the end of the video), then opening's 0.8s fade to black, hard-killed at the
           clip end. Duration stays 4.0s so the teaser cut sheet and closing's soundtrack keep their timings.
           History: v1 = ffmpeg cut of the old teaser's ending (10.5-11.2s); v2 = first standalone composition
           (finished mark + yellow wordmark + tagline, staggered); v3 = the same reveal tightened to ~0.75s. -->
      <div id="close" class="clip full" data-start="0" data-duration="4.0" data-track-index="1">
        <div class="inner">
          <div id="wordmark">
            <p class="word">QUALIFIRE</p>
            <p class="tagline">Same road. New meaning.</p>
          </div>
        </div>
      </div>

    </div>

    <script>
(function () {
  var R = (document.currentScript && document.currentScript.closest('#closing-scene')) || document.querySelector('#closing-scene');
  if (!R || !window.gsap) return;
  function byId(id) { return R.querySelector('#' + id); }
  gsap.context(function () {
    var tl = gsap.timeline({ paused: true });

    // 0.00-0.15: black -- a breath after the hard cut from ranking's last frame (opening has the same empty
    // frame before its wordmark, 2.60-2.95).

    // Beat 1 (0.15-1.25): wordmark in, then tagline -- ../opening/'s beat 3 verbatim, shifted by -2.80s.
    tl.fromTo('#wordmark .word',    { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.80, ease: 'power2.out' }, 0.15);
    tl.fromTo('#wordmark .tagline', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.70, ease: 'power2.out' }, 0.55);

    // Beat 2 (1.25-3.20): hold -- no tween. Beat 3 (3.20-4.00): opening's 0.8s fade to black, hard-killed at the clip end.
    tl.to('#close .inner', { opacity: 0, duration: 0.80, ease: 'power1.inOut' }, 3.20);
    tl.set('#close .inner', { opacity: 0 }, 4.00);

    window.__timelines = window.__timelines || {};
    window.__timelines.closing = tl;
  }, R);
})();
    </script>
  </div>
</template>
```

(Indentation of the copied script body may differ from the original by a constant number of
leading spaces; that is the only allowed whitespace difference, and the fidelity check in
section 8.1 tolerates exactly that.)

### 5.6 Per-scene checklist (what is specific to each file)

**opening.html** (`cid=opening`, DUR 6.2; source 119 lines)
- Scene-specific CSS rules: `#open .inner`, `#mark`, `#mark svg`, `#slash`, `#wordmark`,
  `#wordmark .word`, `#wordmark .tagline`, `#ring` — 8 rules, all prefixed.
- Markup: the long "Opening (6.2s, v4)" comment + `#open` clip (track 0 → 1) with the inline
  SVG ring/slash and the wordmark block. No `data-hf-id` in this source.
- Script: `CIRC`, `gsap.set('#ring', ...)`, 7 timeline calls, registration
  `window.__timelines.opening = tl;`. 0 `getElementById`. Last set at 6.20 ✓.

**startride.html** (`cid=startride`, DUR 14.0; source 283 lines, 24 `data-hf-id` to strip)
- CSS: 30+ scene-specific rules from `#basemap` through `#rider` (includes the unused
  "cards (ranking scene)" block — keep it, prefixed; fidelity over tidiness). `#basemap` rule
  becomes `#startride #startride-scene #startride-basemap` (section 6).
- Markup: comment, `#map` clip (track 0 → 1; contains `#cam` > `#basemap` img + `#tint` +
  `#mapsvg`; then `#dim`, `#attrib`), `#ui` clip (track 1 → 2; `#start-btn`, `#cursor` svg,
  `#cap1`), then `<div id="blackout"></div>` — all inside `#startride-scene`.
- Script: 5 × `getElementById` → `byId`; `'basemap'` → `'startride-basemap'`; the
  `ride()` helper, camera helpers, `tl.shiftChildren(1.0, true)` and the blackout tween
  all untouched. Registration `window.__timelines.startride = tl;`. Last literal set at
  13.0 which `shiftChildren(1.0)` moves to 14.0 ✓ (the blackout tween is added after the
  shift and ends at 1.0).

**gatessaving.html** (`cid=gatessaving`, DUR 12.3; source 332 lines, 25 `data-hf-id`)
- CSS: same family as startride plus `#scrim-bottom`, `.caption .em-i`, `.caption .em-b`,
  `#start-btn .sub`. `#basemap` → `#gatessaving-basemap`.
- Markup: comment, `#map` (track 0 → 1, `data-duration` 12.4 → 12.3), `#ui` (track 1 → 2,
  12.4 → 12.3). Gate `.gk` lines carry inline `style="stroke: var(--ink)"` — keep.
- Script: 5 × `getElementById` → `byId`; `'basemap'` → `'gatessaving-basemap'`.
  `RIDE_PROFILE`, `rideFrac`, `ride()`, all `GATE_PT`/`GATE_LEN` logic untouched.
  Registration `window.__timelines.gatessaving = tl;`. Last set `'#capB'` at 12.3 ✓.

**ranking.html** (`cid=ranking`, DUR 10.8; source 299 lines, 0 `data-hf-id`)
- CSS: map family plus `.em-b`, `.em-i`, `#tower`, `#tower .rows`, `.tnum`, `.trow`,
  `.trow .who`, `.trow .time`, `.trow.today`. `#basemap` → `#ranking-basemap`. Note this
  scene's `#basemap` img is a direct child of `.inner` (no `#cam` wrapper) — copy as is.
- Markup: comment, `#map` (track 0 → 1), `#ui` (track 1 → 2) with the tower's 10 `.tnum`,
  11 `.trow` rows and `#capB`.
- Script: 5 × `getElementById` → `byId`; `'basemap'` → `'ranking-basemap'`. `gsap.set('.sector', ...)`,
  `gsap.set('.gate', ...)`, `TOWER_ROWS`, `STEP_DOWN` loops untouched. Registration
  `window.__timelines.ranking = tl;`. Last set `'#capB'` at 10.8 ✓.

**closing.html** (`cid=closing`, DUR 4.0; source 87 lines) — section 5.5 verbatim.

## 6. The `duplicate_media_id [basemap]` finding — cause and the fix (NEW files only)

Cause: each of start-ride, gates-saving and ranking has exactly ONE `<img id="basemap">`, so
this is not a pre-existing defect in any single original — it was created by putting three
scenes into one document, and v2 still puts them into one document (fact F2). HyperFrames
resolves MEDIA elements (`img`/`video`/`audio`) globally by id for discovery/proxying, which
is what `duplicate_media_discovery_risk (3 matching img entries)` warned about, and why the
HeyGen example gives every media element a scene-unique id (`s1-cursor`, `sq-cursor`, `s2-cur`).

Fix, applied in the three NEW composition files only (never in the originals) — three
edits per scene, none of them a tween:
1. HTML: `id="basemap"` → `id="<cid>-basemap"` on the `<img>`.
2. CSS: the rule `#basemap { position: absolute; ... }` → selector `#<cid> #<cid>-scene #<cid>-basemap`.
3. JS: `byId('basemap').src = 'map-day.png';` → `byId('<cid>-basemap').src = 'map-day.png';`
   (this line is inside the `if (document.documentElement.getAttribute('data-theme') === 'day')` block).
Nothing else references `basemap` in any scene (verify with grep; if you find another
reference, STOP).

Report in your executor report that the finding was merge-caused and fixed this way. All
other repeated ids (`#rider`, `#map`, ...) are non-media and stay as they are.

## 7. Two lint findings to NOTE, not fix

Check each in the ORIGINAL file and write one line per finding in your report:
- `gsap_repeated_fromto_without_baseline` on `#trow-today`: ranking's original has two
  `tl.fromTo('#trow-today', ...)` calls at `CLIMB_T0` (one for `y`, one for `opacity`).
  Pre-existing in `ranking/index.html`; not introduced by any merge. Leave it.
- `svg_measure_before_path_d` on `#route-core`: the three map scenes set `d` on the paths in
  a `forEach` and then call `core.getTotalLength()`; the linter's heuristic flags this
  pattern. Pre-existing in `start-ride/index.html` (and structurally identical in
  gates-saving and ranking). Leave it.
Both may reappear in the v2 lint — that is expected and is chat's to triage, not yours.

## 8. Step 3 — verification

### 8.1 Static self-check (run this; it must end with `ALL CHECKS PASSED`)

A checker is already written next to this brief:
`marketing/cycles/21_teaser-single-render-unification/check-teaser-full-v2.py`. It verifies
everything in sections 4-6 mechanically — root slot attributes and the 47.3 s sum, the
`<template>` wrapping, no forbidden tags/strings, every CSS selector carries the doubled
prefix, rule count = original − 3, inner clips off track 0, `byId(` counts, one
`window.__timelines.<cid>` registration, the basemap rename, every original element id
still present the same number of times, and **script-body fidelity**: the text inside
`gsap.context(function () { ... }, R);` must equal the original inline script after ONLY
the two permitted substitutions (compared line-by-line with leading/trailing whitespace
and blank lines ignored). It prints the first differing line when fidelity fails.

The checker was validated by the plan tier against a throwaway mechanical build of all five
files (257 checks, all passing) — so a FAIL means the new file, not the checker. Do not edit
the checker; if you believe it is wrong, STOP and say why.

```bash
python3 "$HOME/mnt/Qualifire/marketing/cycles/21_teaser-single-render-unification/check-teaser-full-v2.py"
```

Also syntax-check each extracted script with node (available in the device VM):

```bash
cd "$HOME/mnt/Qualifire/marketing/silent-studio/teaser-full/compositions" && for f in *.html; do python3 -c "
import re;b=re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>',open('$f').read(),re.S)[-1];open('/tmp/x.js','w').write(b)"; node --check /tmp/x.js && echo "$f js syntax ok"; done
```

### 8.2 HyperFrames lint / check — try once, then hand to Nathan

The device VM has `node`/`npx` but cannot reach the npm registry, so this will almost
certainly fail for network reasons. Try it exactly once (no retries, no workarounds):

```bash
cd "$HOME/mnt/Qualifire/marketing/silent-studio/teaser-full" && timeout 150 npx --yes hyperframes lint 2>&1 | tail -40
```

If it produces real lint output, paste it verbatim into your report. If it fails on the
network (403/ENOTFOUND/timeout), write "lint not runnable in VM (network)" in the report —
Nathan runs it. The blocks below are for Nathan and go verbatim into the cycle's
`OPEN-ITEMS.md` (append a dated "v2" section; keep the existing text) so every command he
needs is in one place:

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio\teaser-full"
npx.cmd hyperframes lint
```

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio\teaser-full"
npx.cmd hyperframes check
```

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio\teaser-full"
npx.cmd hyperframes snapshot --at 3.9,7.9,12.5,26.01,30.0,35.7,44.5
```

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name teaser-full -Render
```

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name teaser-full -Theme day -Render
```

What the results should show (write this into OPEN-ITEMS too, so Nathan knows what he is
looking at):
- lint: the 5 `timeline_id_mismatch`, 4 `nested_structure_needs_subcomposition`,
  `duplicate_media_id` and `duplicate_media_discovery_risk` findings must be gone. The two
  section-7 findings may remain. Anything NEW is for chat to triage.
- snapshots: 3.9 s = opening wordmark on; **7.9 s = start-ride's THIN route (7/4 px), no
  gate ticks, START button gone** (proves the route path got its `d` and a non-zero
  `getTotalLength()` inside the mounted template, and that startride's tweens did not leak
  into the other map scenes); 12.5 s = rider mid-ride at 2x camera; 26.01 s = gates-saving
  gate 1 just crossed, sector 1 green; 30.0 s = caption B; **35.7 s = ranking's "Today" row
  climbing in WHITE, not purple** (proves CSS scoping); 44.5 s = closing wordmark.
- render: ffprobe duration 47.300000 (1419 frames @ 30 fps).
- theme tokens: if any snapshot shows a black/transparent stage where `#0A0A0A` is
  expected, or the day render is not light, the root-only token decision (5.2) did not reach
  the mounted content — that is a STOP-and-report for chat, not something to patch ad hoc.

## 9. Step 4 — docs and report

### 9.1 Rewrite `teaser-full/README.md`

Replace the v1 README entirely (the v1 copy is archived in step 0). Content: what this
folder is (one real render of the 47.3 s teaser), the root/slot/sub-composition mechanism in
3-4 sentences (facts F1-F3 in plain words), the timing table from section 2, the two
deliberate deviations from the originals (gates-saving 12.4 → 12.3; `#basemap` renamed
per scene), the "not yet rendered — see cycle 21 OPEN-ITEMS.md" note, and a pointer to this
brief. No command blocks in the README (commands live in the cycle folder).

### 9.2 Append to `OPEN-ITEMS.md` (cycle folder) — the section 8.2 blocks + expectations,
under a heading `## v2 (2026-09-26) — root + sub-compositions`. Do not delete the v1 text
above it; add one line at the top of the v1 "Blocker" section: "v1 superseded by v2 below;
v1 index.html archived in v1-merged-timelines/".

### 9.3 Write `EXECUTOR-REPORT-v2.md` (cycle folder) with:
1. Files written/overwritten/archived, with line counts and md5s.
2. The checker's final summary line and the node syntax-check lines.
3. Result of the one `npx` attempt (8.2).
4. Section 6 finding: confirmed merge-caused (one `#basemap` per original), fixed in the new
   files as specified.
5. Section 7: the two pre-existing findings, one line each, with the original file/line.
6. Any deviation from this brief (there should be none) or, if you stopped, a "STOPPED"
   section quoting the exact ambiguity.
7. Token usage.

## 10. Summary of what is and is not allowed to change (for the inspector too)

| may change | must not change |
|---|---|
| `teaser-full/index.html` (full rewrite, section 4) | the five original scene files and everything in their folders |
| new `teaser-full/compositions/*.html` (5 files) | any GSAP call, time, ease, value, helper function, constant, comment in a script body |
| `teaser-full/README.md`; cycle `OPEN-ITEMS.md` (append); new `EXECUTOR-REPORT-v2.md`; new `v1-merged-timelines/` archive | `theme.js`, `map.png`, `map-day.png`, `render.ps1`, `silent-studio/COMMANDS.md`, `structure.md`, `.hyperframes/`, `renders/` |
| in copied markup: strip `data-hf-id`; inner clip `data-track-index` +1; gates-saving `data-duration` 12.4 → 12.3; `id="basemap"` → `id="<cid>-basemap"` | any other attribute, any text node, element order |
| in copied CSS: drop `:root`×2 and `html, body`; `#stage` → `#<cid> #<cid>-scene` with `position: absolute; top: 0; left: 0;`; prefix every other selector; `#basemap` → `#<cid>-basemap` | any declaration value |
| in copied JS: the IIFE/`gsap.context` wrapper; `document.getElementById(` → `byId(`; `'basemap'` → `'<cid>-basemap'` | anything else, including `document.documentElement.getAttribute('data-theme')` and the existing `window.__timelines.<cid> = tl;` line |
