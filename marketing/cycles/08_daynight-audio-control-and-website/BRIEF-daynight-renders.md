# BRIEF — day/night mode for silent-studio renders

**For:** Sonnet executor. Self-contained; read nothing outside this brief except the
files it names. Stop-on-ambiguity: any anchor below that does not match the file as it
is on disk → stop and report the mismatch verbatim; do not improvise.
**Status:** briefed, not executed.
**Owner of the ruling:** Fable (Plan tier), cycle 08.

## 0. Nathan's question and the ruling

> "I would like to also have a night/day mode for my silent-studio renders … separate day
> folder entirely with own structure and rounds logging? or keep the current night mode
> renders as the reference to work on, and only periodically make a 'day' render?"

**Ruling: neither as stated — a third option that keeps the best of the second.**

- **One `index.html` per composition, parameterised by a palette.** Compositions are
  code (HTML/CSS/JS + GSAP). The night/day difference is a colour palette; forking a
  folder would duplicate every timeline, every GPX-derived route constant, every future
  feedback fix, and would have to be kept in sync by hand — the same class of drift
  `structure.md` already documents for `all-renders/`. So the theme lives inside the
  composition as a CSS-custom-property block, exactly as the website does it
  (`website/index.html`, the app's own `:root[data-theme="light"]` override mechanism).
- **Night remains the reference that iterates.** Rounds (`rounds/vN/` + `FEEDBACK.md`)
  stay night-driven. A day render is a **variant of an approved night round**: it is
  rendered from the same `index.html` at the same round number and stored *inside* that
  round folder as `rounds/vN/<comp>_vN_day.mp4`. No second rounds tree, no
  `rounds-day/`, no separate feedback ladder.
- **Day renders are on request**, not automatic. Nathan asks for a day version of a
  composition once he is happy with its night round; the executor/coordinator renders
  it. Two pilots first (§3), then rollout (§4).
- **Rounds rule with day present:** any change to `index.html` is a new round vN+1
  (existing convention), and if that composition has a day variant, **both themes are
  re-rendered for vN+1**. Renders take seconds; the simplicity is worth more than the
  saved minute. Day-specific feedback ("day scrim too weak") goes in the same
  `rounds/vN/FEEDBACK.md` under a `## Day variant` heading — it is feedback on the same
  source file.
- **`all-renders/` rule:** the mirror holds at most one *night* file and at most one
  *day* file per composition, and they must carry the **same vN**. When a composition
  gets a new round, both are replaced (or the stale `_day` file is moved to
  `safe_to_delete/` if no day render was made for the new round). Never a
  `<comp>_v5.mp4` next to `<comp>_v4_day.mp4`. This is added to the checklist in
  `structure.md` (§5).
- **Why not "separate day folder"**: doubles the folder surface `structure.md` already
  calls fragile; every visual fix would have to be applied twice; the map scenes would
  carry two copies of a 2.4 MB basemap contract each.
- **Why not plain "periodic one-off day render" with no mechanism**: without
  tokenisation each day render is a hand-edit of colour literals (gates-saving alone
  has ~40 colour occurrences across CSS, SVG attributes and JS) — unrepeatable and
  guaranteed to drift. The mechanism below makes "periodic day render" a one-flag
  command, which is what Nathan actually wants.

**Audio-studio: not now.** Nathan: "not a priority as it is trivial to attach the same
audio to a 'day' render." Correct — §7 records the single ffmpeg line for when it is
wanted, and nothing else.

## 1. The mechanism

Three parts, all small:

1. **Palette tokens in each `index.html`**: a `:root{…}` block with the night values
   (the current literals, so night output is unchanged) and a
   `:root[data-theme="day"]{…}` override block with the day values (taken from the
   website's light theme). Every night-vs-day colour literal in CSS, SVG and JS is
   replaced by a token. Brand/tier colours (`#F5C542` yellow, `#3ED598` green,
   `#A667F0` purple, `#2F7DE1` rider blue, `#17171b` on-yellow ink) are **the same in
   both themes** and stay as literals.
2. **Theme selection**: `<html lang="en" data-theme="night">` as the default, plus
   `<script src="theme.js"></script>` as the first child of `<head>`. `theme.js` is a
   one-line sidecar `document.documentElement.setAttribute('data-theme','night');`
   committed in every tokenised composition folder. `render.ps1 -Theme day` rewrites it
   to `'day'` before running HyperFrames and restores `'night'` in a `finally`, so the
   canonical `index.html` is never touched by the tooling and a crashed render cannot
   leave a composition stuck in day.
3. **Day basemap for the three map scenes**: `map-capture.html?theme=day` captures the
   `positron` style (already named in its line-47 comment) and downloads `map-day.png`;
   the scene's JS swaps `#basemap` to `map-day.png` when `data-theme` is `day`.

Renders land as `renders/<comp>_<timestamp>_day.mp4` (render.ps1 renames the file
HyperFrames just produced) so a day dump is never mistaken for a night one.

## 2. Day palette (fixed here; Nathan can retune after seeing the pilot)

Source: the website's light theme (`:root[data-theme="light"]` block) plus derived
scrim/shadow values.

| Token | Night (= today's literal) | Day | Used for |
|---|---|---|---|
| `--bg` | `#0A0A0A` | `#FDFCF9` | page/stage background, `#dim` |
| `--bg-rgb` | `10,10,10` | `253,252,249` | scrim gradients, caption shadow (used inside `rgba(var(--bg-rgb), a)`) |
| `--ink` | `#F4F2EC` | `#17171b` | captions, card text, gate tick, ring stroke |
| `--ink-dim` | `#9a978f` | `#605e56` | attribution, card labels, tower rank |
| `--card` | `#141414` | `#FFFFFF` | ranking card / tower background |
| `--card-border` | `#232323` | `#E1DDD1` | card borders |
| `--route-casing` | `#14120C` | `#14120C` | route casing, gate casing (dark casing reads fine on positron; retune later if Nathan wants) |
| `--ring-fill` | `#14120C` | `#FDFCF9` | start/end landmark ring fill |
| `--rider-stroke` | `#FFFFFF` | `#17171b` | rider dot outline |

`--bg-rgb` exists because CSS cannot put alpha on a hex token; `rgba(var(--bg-rgb), 0.92)`
is the standard way.

## 3. Phase 1 — pilots: `gates-saving` and `brandmark/opening`

### 3a. `silent-studio/gates-saving/index.html` — anchors as of mtime 2026-09-14 (file is 268 lines)

Insert, replacing line 2 `<html lang="en">` → `<html lang="en" data-theme="night">`.

Insert as the first child of `<head>` (before line 4 `<meta charset="UTF-8">`):
```html
<script src="theme.js"></script>
```

Insert at the top of the `<style>` block (after line 6 `<style>`), verbatim:
```css
  /* ---- theme tokens: night = the app's native mood (default), day = the website's light theme.
          Selected by data-theme on <html>; render.ps1 -Theme day sets it via theme.js. ---- */
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
```

Then replace these literals (line numbers are pre-insertion; match on content):

| Line | Now | Becomes |
|---|---|---|
| 7 | `background: #0A0A0A; }` (html, body) | `background: var(--bg); }` |
| 14 | `background: #0A0A0A;` (#stage) | `background: var(--bg);` |
| 17 | `color: #F4F2EC;` (#stage) | `color: var(--ink);` |
| 30 | `linear-gradient(to bottom, rgba(10,10,10,0) 0%, rgba(10,10,10,0.92) 100%)` | `linear-gradient(to bottom, rgba(var(--bg-rgb),0) 0%, rgba(var(--bg-rgb),0.92) 100%)` |
| 34 | `color: #9a978f;` (#attrib) | `color: var(--ink-dim);` |
| 36 | `background: #0A0A0A;` (#dim) | `background: var(--bg);` |
| 40 | `color: #F4F2EC;` (.caption) | `color: var(--ink);` |
| 41 | `text-shadow: 0 2px 12px rgba(10,10,10,0.6);` | `text-shadow: 0 2px 12px rgba(var(--bg-rgb),0.6);` |
| 58 | `background: #141414; border: 2px solid #232323;` | `background: var(--card); border: 2px solid var(--card-border);` |
| 61 | `color: #9a978f;` (.card .lbl) | `color: var(--ink-dim);` |
| 66 | `color: #F4F2EC;` (.rnum) | `color: var(--ink);` |
| 68, 69 | `color: #F4F2EC;` (.rrow .who / .time) | `color: var(--ink);` |
| 75 | `color: #9a978f;` (.trow .rk) | `color: var(--ink-dim);` |
| 76, 77 | `color: #F4F2EC;` (.trow .who / .time) | `color: var(--ink);` |

Lines 49, 53, 54 (`#start-btn`, yellow + `#17171b`) are brand — **leave untouched**.
Lines 65, 70, 78 (`#A667F0` purple) are tier — **leave untouched**.

SVG elements (lines 92–103). Two different treatments, and this is the one place
that can silently break the animation if done wrong:

- Elements whose colour GSAP **never** changes → move colour from the presentation
  attribute to a CSS rule (CSS rules resolve `var()` reliably; presentation attributes
  do not). Delete the `stroke=`/`fill=` attribute named and add the rule to `<style>`:
  - line 92 `#route-casing`: delete `stroke="#14120C"`, add `#route-casing { stroke: var(--route-casing); }`
  - lines 98–100 `line.gc` (three occurrences): delete `stroke="#14120C"`, add `.gate .gc { stroke: var(--route-casing); }`
  - lines 101–102 `#ring-start`, `#ring-end`: delete `fill="#14120C" stroke="#F4F2EC"`, add `#ring-start, #ring-end { fill: var(--ring-fill); stroke: var(--ink); }`
  - line 103 `#rider`: delete `stroke="#FFFFFF"`, add `#rider { stroke: var(--rider-stroke); }` (keep `fill="#2F7DE1"` — brand blue, both themes)
- Elements whose colour GSAP **does** change later → a CSS rule would override GSAP's
  attribute write (CSS beats presentation attributes), so use an inline `style` and
  make GSAP write the CSS property instead of the attribute:
  - lines 98–100 `line.gk` (three occurrences): replace `stroke="#F4F2EC"` with
    `style="stroke: var(--ink)"`.
  - line 207 (`scoreGate`): change
    `tl.set('#gate' + k + ' .gk', { attr: { stroke: SECTOR_COLORS[k - 1], 'stroke-width': 5, opacity: 1 } }, t);`
    to
    `tl.set('#gate' + k + ' .gk', { stroke: SECTOR_COLORS[k - 1], attr: { 'stroke-width': 5, opacity: 1 } }, t);`
    (GSAP's non-`attr` `stroke` writes `element.style.stroke`, which overwrites the
    inline `var(--ink)`.)

Before editing, grep the file for every other `attr: {` that names `stroke` or
`fill`; the brief expects exactly the line-207 occurrence. If there are others → stop
and report.

Basemap swap — insert immediately after line 133 (`// ----…` closing the shared
constants block), before `var pts = …`:
```js
    // Day theme uses the positron basemap captured by ../_map/map-capture.html?theme=day (see _map/README.md).
    if (document.documentElement.getAttribute('data-theme') === 'day') {
      document.getElementById('basemap').src = 'map-day.png';
    }
```

Create `silent-studio/gates-saving/theme.js` (one line, LF, no BOM):
```js
document.documentElement.setAttribute('data-theme','night');
```

### 3b. `silent-studio/brandmark/opening/index.html` (4,234 bytes; non-map pilot)

Same pattern, smaller. Expected literals from the colour census: `#F4F2EC` ×3,
`#0A0A0A` ×2, `#9a978f` ×1, `#F5C542` ×1. Add the same token blocks (only `--bg`,
`--bg-rgb`, `--ink`, `--ink-dim` are needed; include the full block anyway for
uniformity), replace `#0A0A0A`→`var(--bg)`, `#F4F2EC`→`var(--ink)`,
`#9a978f`→`var(--ink-dim)`; leave `#F5C542`. Check whether any of those `#F4F2EC`
occurrences sit inside a GSAP tween (`gsap.to/fromTo/set` with a colour target — e.g.
the wordmark cross-fade to yellow). If a tween interpolates **from** a value that is
now `var(--ink)`, GSAP reads the computed style at tween start, which is fine; if a
tween's **target** is a night-only literal, that is a case this brief did not
anticipate → stop and report the line. Add `theme.js` and the `data-theme="night"`
attribute + `<script src="theme.js">` as in 3a. No basemap block.

### 3c. `silent-studio/render.ps1` (103 lines)

- Line 33–36 `param(...)`: add `[ValidateSet('night','day')][string]$Theme = 'night'`
  as a third parameter.
- After line 82 (the `$targetDir` existence check), add: if `$Theme -eq 'day'` and
  `$targetDir\theme.js` does not exist → `Write-Error "'$Name' is not theme-enabled yet (no theme.js). See marketing/cycles/08_*/BRIEF-daynight-renders.md."; exit 1`.
- Wrap the existing `Push-Location … finally { Pop-Location }` block (lines 84–102) so
  that, when `theme.js` exists: before Push-Location, write
  `document.documentElement.setAttribute('data-theme','$Theme');` to
  `$targetDir\theme.js` (ASCII, `-NoNewline`, `Set-Content -Encoding ASCII`); in the
  `finally`, write the `'night'` line back unconditionally. Record `$renderStart = Get-Date`
  before running.
- After a successful `-Render` with `-Theme day`: find the newest `*.mp4` in
  `$targetDir\renders` with `LastWriteTime -gt $renderStart`; if exactly one, rename it
  to `<basename>_day.mp4`; if zero or more than one, print a warning naming what was
  found and leave files as they are (do not guess).
- Update the comment-based help (lines 15–29): describe `-Theme`, and replace the stale
  examples `gate` / `purple` / `tour` with `gates-saving`, `colours`, `brandmark\opening`
  (these are the cycle-07 leftovers `structure.md` line 91 lists).

### 3d. `silent-studio/_map/map-capture.html` (77 lines)

- Replace line 47 (`var STYLE = 'https://tiles.openfreemap.org/styles/dark'; …`) with:
  ```js
  var THEME = (new URLSearchParams(location.search).get('theme') === 'day') ? 'day' : 'night';
  var STYLE = THEME === 'day' ? 'https://tiles.openfreemap.org/styles/positron'   // the website/day look
                              : 'https://tiles.openfreemap.org/styles/dark';       // the app's night style (default)
  ```
- Line 70: `a.download = 'map.png';` → `a.download = THEME === 'day' ? 'map-day.png' : 'map.png';`
- Line 72 status text: include the filename actually saved.
- Line 21 `<b>Qualifire map capture</b>` → append ` — ` + theme name via a small
  `document.getElementById(...)` after THEME is known, or simply set `document.title`.
  Cosmetic; either is fine.

### 3e. Docs touched in Phase 1

- `_map/README.md`: line 38 ("To switch to the day look, change `STYLE`…") → replace with
  the `?theme=day` instruction, the `map-day.png` filename, and a second copy loop
  (`Copy-Item $src (Join-Path $hf "$c\map-day.png")`). Note that
  `python -m http.server` fallback works with the query string unchanged.
- `COMMANDS.md`: (i) fix the cycle-07 leftovers — section "Any composition — teaser,
  gate, purple, tour" (lines 18–38): retitle to "Any composition" and use
  `gates-saving`, `colours`, `brandmark\opening` in the examples; line 64 "copy the
  finished MP4s to `<scene>\rounds\v2\`" → "to `<scene>\rounds\vN\` (next free N)".
  (ii) add a section "Day render of a composition" after the product-scenes section:
  the one-time `map-capture.html?theme=day` step, then
  `powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gates-saving -Theme day -Render`,
  where the file lands (`renders\gates-saving_<ts>_day.mp4`), and that day renders are
  copied to `rounds\vN\gates-saving_vN_day.mp4` next to the night file of the same N.
- `structure.md`: see §5.

### 3f. Nathan's PC steps for Phase 1 (go into cycle-08 `OPEN-ITEMS.md` at execution time)

1. `_map\map-capture.html?theme=day` in Chrome → `map-day.png` → copy into
   `gates-saving\` (and, ahead of Phase 2, `start-ride\`, `ranking\`).
2. Night regression render: `render.ps1 -Name gates-saving -Render` (no `-Theme`).
   Compare against the current round file:
   ```powershell
   ffmpeg -i .\gates-saving\rounds\v5\gates-saving_v5.mp4 -i .\gates-saving\renders\<new>.mp4 -lavfi psnr -f null - 2>&1 | Select-String "average"
   ```
   Expect `psnr_avg` ≥ 40 dB (encoder noise only). Anything lower = the tokenisation
   changed the night output → stop, report which frames (`-lavfi "psnr=stats_file=psnr.log"`).
3. Day render: `render.ps1 -Name gates-saving -Theme day -Render`; copy to
   `gates-saving\rounds\v5\gates-saving_v5_day.mp4`; also `all-renders\gates-saving_v5_day.mp4`.
4. Same for `brandmark\opening` (rounds/v3).
5. Nathan reviews both day files; feedback under a `## Day variant` heading in the
   respective `rounds/vN/FEEDBACK.md`.

## 4. Phase 2 — rollout (after Nathan has seen the pilots)

Same recipe for `start-ride/`, `ranking/` (map scenes — include the basemap block),
`colours/`, `brandmark/index.html` (root lockup), `brandmark/closing/`. Colour census
per file (from the 2026-09-14 grep; re-grep before editing):

| File | Night-vs-day literals to tokenise | GSAP colour writes to check |
|---|---|---|
| `start-ride/index.html` | same set as gates-saving (shared camera/map code) | grep `attr: {` for stroke/fill |
| `ranking/index.html` | as gates-saving + card/tower rules | same |
| `colours/index.html` | `#F4F2EC` ×18, `#9a978f` ×2, `#0A0A0A` ×2 | text-heavy; check tier-colour tweens are literals |
| `brandmark/index.html` | `#F4F2EC` ×2, `#0A0A0A` ×2 | wordmark colour tween |
| `brandmark/closing/index.html` | small | wordmark→yellow fade |

`teaser/index.html` is the legacy 11.2 s brand teaser (`structure.md` line 67) — **skip**.
The assembled teaser is an ffmpeg concat of ingredient renders; a day teaser is the same
`concat.txt` with `_day` filenames, only once every ingredient has a day render at the
current round. Not in this brief's scope; note only.

## 5. `structure.md` additions (Phase 1)

- In "How a composition is made" (lines 8–15): one sentence — `render.ps1 -Theme day`
  renders the day palette; day renders are variants of a night round and live at
  `rounds/vN/<comp>_vN_day.mp4`.
- In the all-renders section (lines 40–61) add to the checklist: "at most one night
  and one day file per composition, same vN; a new round replaces both or moves the
  stale `_day` to `safe_to_delete/`."
- New short section "Day/night" stating the ruling (§0) in five lines and pointing to
  this brief.
- Fix the table rows for `brandmark/opening` and `brandmark/closing` (lines 30–31): they
  now have their own `index.html` (files exist, 4,234 / 4,189 bytes).

## 6. Verification (executor, before reporting done)

- `git diff --stat` shows only the files named in §3.
- In each tokenised `index.html`: zero remaining occurrences of `#0A0A0A`, `#F4F2EC`,
  `#9a978f`, `#141414`, `#232323`, `rgba(10,10,10` outside the `:root` token blocks
  (grep). Brand/tier literals still present.
- `theme.js` present and byte-exact in each tokenised folder.
- `render.ps1` parses: `powershell -NoProfile -Command "[scriptblock]::Create((Get-Content -Raw .\render.ps1)) | Out-Null"` (or `Set-StrictMode` dry parse).
- The night PSNR check (§3f step 2) is Nathan's to run; the executor cannot render.
  Say so in the report rather than claiming night is unchanged.

## 7. Audio-studio day renders — deferred, recorded for later

When `<comp>_vN_day.mp4` exists and `audio-studio/<scene>/soundvM/soundtrack_vM.wav`
is the current audio for that same vN:
```
ffmpeg -i <comp>_vN_day.mp4 -i soundtrack_vM.wav -c:v copy -c:a aac -shortest <comp>_vN_day_with_sound_vM.mp4
```
Store next to the night with-sound file in `soundvM/` and mirror into
`audio-studio/all-renders/` under the same one-night-one-day-same-vN rule. Nothing
else changes on the audio side.
