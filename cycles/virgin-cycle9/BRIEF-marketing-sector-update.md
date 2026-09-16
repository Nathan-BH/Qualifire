# BRIEF — Marketing scenes: render-remake pass (cycle 9, sub-task 2) — REVISED after Nathan's Q5 answer

**Anchors:** every line number below was read from the live files on 2026-09-16 at commit
`1ec4416` (repo mounted; all four `index.html` files read top to bottom). Execute must still
confirm each anchor against the real file before editing and STOP (per the closing clause) if
any doesn't match.

**Revision note (2026-09-16, later the same day):** the first version of this brief told
Execute to flatten the route to plain yellow and add the app's S1-S4 strip to `gates-saving`.
Nathan answered Q5 in `QUESTIONSFORNATHAN.md` and overruled that default: keep the painted
route, add no strip, only remove the line thickening — and make the gate ticks white
throughout. He also added four pieces of feedback for the same remake pass (ranking's P2
colour, ranking's climb easing, ranking's captions, and the closing render). This brief now
contains only what should actually happen; the superseded instructions are gone.

## Context — what Nathan asked and what it means here

Nathan's original ask (verbatim): *"can you also apply the new UI sector update to the
marketing files. Make new versions of each render with the new update, then update the
all-renders folder for both the silent/audio-studio renders."*

His Q5 answer (verbatim), which defines what "the update" means for the renders:

> *"for the renders I would actually keep the race line colouring when you cross it (so do not
> change it to yellow all along). And I would not add the strips, as for the video it would
> not read nice. So the only update really needed to the renders is removing the line
> thickening. And also remove the gates themselves being coloured, it was never a feature I
> wanted but I never corrected it. So I would just keep the gates white all along"*

And the four extra items (verbatim):

> *"for the ranking render. 1) the ride that gets added at position2 should be coloured green
> not purple since it is a P2 not a P1. 2) I would make go up fast and then slow down as it
> gets to its correct position (I think now it is constant speed) while the total time it
> takes should be the same as now."*
>
> *"I would remove the "compare directly against your previous ride". And just keep the
> "compare against yourselfs" line"*
>
> *"I would also update the current closing render. I would just use the second part of the
> opening render (so not the logo drawing, but only the qualifier text + the slogan beneath
> it)"*

So this pass is six small, fully-specified source edits across three compositions
(`gates-saving`, `ranking`, `brandmark/closing`), plus the round docs. Tier hex values in
every marketing file are already correct (`950a72e` restored them) — **no colour-value work
in this brief** beyond the one purple→green swap in Task 4.

### The hard constraint that shapes this brief

This session (coordinator or Execute) can edit `index.html` source files through the
device-bridge shell. It **cannot** run `render.ps1` / `npx hyperframes render` — HyperFrames
needs npm/Node-with-packages/Chrome/ffmpeg in Nathan's own PowerShell window
(`qualifire-cloud-sandbox-no-npm`; established, not up for re-litigation). So:

- Execute's job is the **source edits + the rounds' docs**, nothing else.
- Execute produces **no new `.mp4`**, touches **nothing in `all-renders/`** (either
  studio), and touches **nothing in `marketing/audio-studio/`**.
- Nathan then renders (section "What Nathan still has to do"), and a later, separate
  follow-up pass picks the renders into `rounds/`, both `all-renders/` mirrors, and
  remuxes/re-composes audio. That follow-up is described at the end but is **not** part of
  this brief's Execute task.
- Execute also cannot preview. The unverifiable judgment calls go into each round's
  `FEEDBACK.md` "Things to check in the render" — the project's existing mechanism for
  exactly this.

## What was actually found in each composition (read in full)

| Composition | What it shows today | What changes | Verdict |
|---|---|---|---|
| `gates-saving/index.html` (294 lines) | Second ride: rider crosses three gates; each gate tick recolours to the sector's tier and fattens 4→5px (`scoreGate`, line 232-234, called at line 280) AND the sector's stretch of route paints its tier colour via a **9px overlay (`sec1..4`, lines 115-118) over the 6px core** (`route-core`, line 114), revealed at lines 281-283. | Overlays → 6px (colour still flips, width never changes). Gate ticks stay white: `scoreGate` and its call go. | **EDIT** — Tasks 1, 2 |
| `ranking/index.html` (294 lines) | Frame 0 = "end of the second ride, everything scored": the same 9px overlays shown statically (line 239) under a 0.7 dim; gate ticks force-recoloured at frame 0 (line 241) from a base of yellow-at-0.6 (lines 118-120 — NOT the white base gates-saving has since its v5); `scoreGate` defined (231-234) but never called. "Today" row is purple (line 93). The climb is `power1.inOut` over 2.2s (line 267) with 8 pre-computed row step-downs derived from that ease (line 271). Two captions, capA 5.9-7.9 and capB 8.2-10.8 (lines 159-160, 278-285). | Overlays → 6px. Ticks white (base attributes matched to gates-saving's, frame-0 recolour and `scoreGate` removed). Today → green. Climb ease → `power2.out`, same 2.2s, step-downs recomputed. capA removed, capB spans 5.9-10.8. | **EDIT** — Tasks 1, 2, 4, 5, 6 |
| `brandmark/opening/index.html` (109 lines) | 6.5s: ring draws + yellow tail (0-1.8), mark fades out (2.15-2.6), empty frame, **wordmark "QUALIFIRE" (off-white `var(--ink)`, 96px/800/22px tracking) fades in with y 20→0 at 2.95 (0.8s), tagline "Same road. New meaning." (dim) at 3.35 (0.7s), hold, fade to black 5.5-6.3, hard kill 6.5.** The bold part is "the second part" Nathan means. | Nothing — it is the source being copied. | **No edit, no re-render.** |
| `brandmark/closing/index.html` (116 lines) | 4.0s: flex `#stack` of the finished mark (280px) + **yellow** wordmark + tagline, all fading in within 0.75s, hold to 3.5, `#fade` overlay to black 3.5-4.0. | Replaced by opening's post-mark beat (no mark, off-white wordmark + tagline, opening's own tweens), re-timed into 4.0s. | **EDIT** — Task 7 |
| `start-ride/index.html` | First ride: the route draws plain yellow behind the rider. `sec1..4` paths exist (lines 114-117, also 9px) but **no tween ever reveals them** and its gates never recolour (its own v4 FEEDBACK.md: "invisible here"). | None: the thickening and the tick colouring never show. Changing the dead 9px to 6px = churn that forces a pointless round bump + remux. | **No edit, no re-render.** |
| `colours/index.html` | The "Why purple is rare" chart. No map, no gates, no phone UI. | None. | **No edit, no re-render.** Not in the current teaser cut either (v5/v6 dropped it). |
| `teaser/index.html` | The old 11.2s brand teaser with four bordered sector boxes (lines 66-96). | None — stale by record: `teaser/README.md` line 76 and `structure.md` say the teaser is an ffmpeg concat of the ingredients (`rounds/v6/concat.txt`), not this file. Rendering it would drop an unrelated `teaser_*.mp4` into `teaser/renders/`. One sentence in `teaser/README.md` (Task 8) marks its box strip as pre-cycle-9 so nobody copies it. | **No edit, no render.** |
| `brandmark/index.html` (root lockup), `_map/**`, `marketing/website/**` | Reference lockup; basemap capture; website. | None. | Out of scope. |

## Design decisions (settled — do not re-open at Execute time)

| Question | Decision | Why |
|---|---|---|
| Route colouring in the renders | **Kept exactly as today**: each sector's stretch of route flips to its tier colour the instant its gate is crossed (gates-saving), and ranking opens on the fully painted route. | Nathan, Q5: "keep the race line colouring when you cross it". |
| Line thickening | The four `sec1..4` overlay paths go from `stroke-width="9"` to `"6"` in both files — the same width as `route-core`. Colour still flips; width never changes. Nothing else about the reveal (0.25s opacity tween, dash windows, timing) changes. | Nathan: "the only update really needed to the renders is removing the line thickening". Matches the app (`eb8ad99`: sector-spans core 6→4 = the base core's width). An overlay at exactly the core's width sits on the core and replaces its colour pixel-for-pixel; the 10px casing is untouched. |
| S1-S4 strip in the marketing scenes | **Not added, anywhere.** | Nathan: "I would not add the strips, as for the video it would not read nice." |
| Gate ticks | **White throughout** in both files: gates-saving's `.gk` base (`style="stroke: var(--ink)" stroke-width="4" opacity="1"`) is the target state; `scoreGate` (the recolour + 4→5px fatten on crossing) and every call/frame-0 equivalent are removed, and ranking's tick base attributes are changed to match gates-saving's so its frame 0 still equals gates-saving's last frame (the match-cut). `scoreGate` is deleted rather than left as dead code in both files. | Nathan: "it was never a feature I wanted but I never corrected it. So I would just keep the gates white all along". `var(--ink)` is `#F4F2EC` at night (the off-white gates-saving v5 already uses for the ticks; per its FEEDBACK.md) and `#17171b` on the day theme, so `-Theme day` still works. |
| `SECTOR_COLORS` | Stays in both files even though nothing reads it any more. | It is in the "shared constants (identical in ../_map/map-capture.html)" block and documents which tier each `secN` stroke carries; deleting it is churn outside the ask. |
| Ranking: Today's colour | `.trow.today .who, .trow.today .time { color: #9000C8; }` → `#00D000`. | Nathan: a P2 is green, not purple (the app's tiers: purple = best ever / P1, green = the next tier down). 17:08.9 is indeed second behind Mon 17:02.8. Only one rule carries the colour (line 93); the `.tnum` rank numerals stay dim grey. |
| Ranking: climb ease | `ease: 'power1.inOut'` → `ease: 'power2.out'`; `CLIMB_T0 = 3.20` and `CLIMB_DUR = 2.2` unchanged. | Nathan: fast up, slowing into its slot, same total time. `power2.out` starts at full speed and decelerates continuously to zero at slot 2 — half the 540px is covered by 3.84s (0.64s in), the last row (Sat, slot 2) is passed at 4.88s (coincidentally the same instant as today), and the final 30px settle takes the last 0.52s. `power3.out` was considered and rejected: it passes rows 9-7 in the first 0.33s and then spends 0.84s (38% of the tween) creeping the last 30px, which reads as a stall rather than a settle. |
| Ranking: row step-downs | The eight `STEP_DOWN` start times are **recomputed for the new ease** (values in Task 5); the 0.3s/`power2.inOut`/60px step tween itself is unchanged. | They are derived from the climb's easing ("start = crossing time − 0.15", see the source comment). With the old numbers left in place the rows would step down long after Today has already passed through them. Verified the derivation first: applying it to `power1.inOut` reproduces the file's current values exactly. |
| Ranking: Today's fade-in | Its 0.4s `power1.out` fade-in at `CLIMB_T0` is **shortened to 0.25s** (same start, same ease). | With a fast start Today meets row 9 at 3.39s; at a 0.4s fade it would be ~72% opaque while overtaking its first row. At 0.25s it is ~94% opaque there and fully solid by 3.45s. A coupled detail of the ease change, not new design; flagged in "Things to check". |
| Ranking: captions | `#capA` (element + its three tweens) removed. `#capB` keeps its id, text, tweens and exit (10.40 fade, 10.8 hard kill) and its fade-in moves from 8.20 to **5.90** — the instant capA used to appear. Scene stays 10.8s. | The minimal reading of "remove capA, keep capB": capB takes over the whole window both captions occupied (5.9→10.8), so the scene's length and the teaser cut sheet (`teaser/rounds/v6`), and the soundtrack's timing, do not move. capB is then on screen 4.5s (5.9-10.4); if that holds too long the fix is a later start (e.g. 6.5), not a shorter scene — in "Things to check". |
| Closing: what to copy | Opening's beat 3 + its hold and fade, verbatim: the `#wordmark` block (`.word` in `var(--ink)`, `.tagline` in `var(--ink-dim)`, same sizes, same `translateY(-40px)` placement), the same two `fromTo` tweens (0.80s / 0.70s, `power2.out`, y 20/14 → 0), and opening's 0.80s `power1.inOut` fade of `.inner` to black. The mark (ring + slash SVG), `#stack`, `#fade` and the `#ring` token rule are removed from closing. | Nathan: "just use the second part of the opening render (so not the logo drawing, but only the qualifier text + the slogan beneath it)". Copying opening's part means copying its look — so the wordmark is opening's **off-white**, not closing's current yellow. That is the one reading Plan is least sure of; it is a one-token switch (`color: var(--ink)` → `#F5C542`) and is listed in "Things to check". |
| Closing: timing | Duration **stays 4.0s** (`data-duration="4.0"`). Beats: 0.00-0.15 black; wordmark in at 0.15; tagline in at 0.55 (both done by 1.25); hold 1.25-3.20; fade to black 3.20-4.00 (0.80s); hard kill at 4.00. | 4.0s is baked into the teaser cut sheet (47.6s) and closing's own soundtrack; opening's copied section is 2.95→6.5 = 3.55s, so it fits with room to spare. The 0.15s black lead-in mirrors the empty frame opening has before its wordmark (2.60-2.95) and gives a breath after the hard cut from ranking's last frame (a dimmed tower, not black). The hold (1.95s) is longer than opening's (1.45s) because this is the end of the video; the fade is opening's 0.8s rather than v3's 0.5s for the same reason. Tweens are opening's shifted by exactly −2.80s. |
| Round numbering | gates-saving → `rounds/v6`, ranking → `rounds/v6` (both at v5), brandmark/closing → `rounds/v4` (at v3). Execute writes each round's `FEEDBACK.md` now, before the mp4 exists — the established pattern (v5 of gates-saving/ranking and v3 of closing were written the same way). | Convention in `structure.md`. |
| Day theme | Not requested; every edit is token-driven (`var(--ink)`, `var(--ink-dim)`) so `-Theme day` works unchanged if wanted later. Commands below are night only (all-renders currently holds night only). | |

## Tasks

### Task 1 — line thickening out: `sec1..4` overlays at the core's width (both files)

**`marketing/silent-studio/gates-saving/index.html`**, lines 115-118. Before:

```html
          <path data-hf-id="hf-l2w9" class="sector" id="sec1" fill="none" stroke="#00D000" stroke-width="9" stroke-linejoin="round" stroke-linecap="round" opacity="0" />
          <path data-hf-id="hf-si8b" class="sector" id="sec2" fill="none" stroke="#F5C542" stroke-width="9" stroke-linejoin="round" stroke-linecap="round" opacity="0" />
          <path data-hf-id="hf-ofvj" class="sector" id="sec3" fill="none" stroke="#9000C8" stroke-width="9" stroke-linejoin="round" stroke-linecap="round" opacity="0" />
          <path data-hf-id="hf-3itu" class="sector" id="sec4" fill="none" stroke="#00D000" stroke-width="9" stroke-linejoin="round" stroke-linecap="round" opacity="0" />
```
After — the only change on each line is `stroke-width="9"` → `stroke-width="6"`:

```html
          <path data-hf-id="hf-l2w9" class="sector" id="sec1" fill="none" stroke="#00D000" stroke-width="6" stroke-linejoin="round" stroke-linecap="round" opacity="0" />
          <path data-hf-id="hf-si8b" class="sector" id="sec2" fill="none" stroke="#F5C542" stroke-width="6" stroke-linejoin="round" stroke-linecap="round" opacity="0" />
          <path data-hf-id="hf-ofvj" class="sector" id="sec3" fill="none" stroke="#9000C8" stroke-width="6" stroke-linejoin="round" stroke-linecap="round" opacity="0" />
          <path data-hf-id="hf-3itu" class="sector" id="sec4" fill="none" stroke="#00D000" stroke-width="6" stroke-linejoin="round" stroke-linecap="round" opacity="0" />
```

**`marketing/silent-studio/ranking/index.html`**, lines 114-117 — same change, `stroke-width="9"` →
`stroke-width="6"` on each of the four `class="sector"` paths (these have no `data-hf-id`
attributes; otherwise identical).

Do not touch `route-core` (`stroke-width="6"`, gates-saving line 114 / ranking line 113) or
`route-casing` (10). Do not touch the `sec` reveal tweens (gates-saving lines 281-283 —
`tl.to('#sec' + (i + 1), { opacity: 1, duration: 0.25 }, t)` and the `#sec4` line — stay
exactly as they are) or ranking's `gsap.set('.sector', { opacity: 1 })` (line 239 — stays).
Do not touch the 7→10 / 4→6 zoom-out crossfade in gates-saving (lines 245-246) — that's the
camera lead-in, and it finishes at 1.0s, long before the first overlay appears at 6.456s.

Acceptance: `grep -n 'stroke-width="9"' gates-saving/index.html ranking/index.html` returns
nothing; `grep -c 'class="sector"' ` still returns 4 in each.

### Task 2 — gate ticks white throughout (both files)

**`gates-saving/index.html`:**

1. Delete lines 231-234 (the `scoreGate` helper and its comment):
   ```js
       // Static colour swap when a gate is crossed (the app has no gate pulse).
       function scoreGate(tl, k, t) {
         tl.set('#gate' + k + ' .gk', { stroke: SECTOR_COLORS[k - 1], attr: { 'stroke-width': 5, opacity: 1 } }, t);
       }
   ```
2. Replace Beat 4's header comment and the `GATES.forEach` block (lines 274-282). Before:
   ```js
       // Beat 4 (4.8-11.7): second ride. Crossing a gate = static colour swap + the sector paints its tier.
       var RIDE_T0 = 4.8, RIDE_DUR = 6.9;
       tl.fromTo('#rider', { opacity: 0 }, { opacity: 1, duration: 0.3, immediateRender: false }, 4.4);
       ride(tl, RIDE_T0, RIDE_DUR);
       GATES.forEach(function (f, i) {
         var t = RIDE_T0 + f * RIDE_DUR;
         scoreGate(tl, i + 1, t);
         tl.to('#sec' + (i + 1), { opacity: 1, duration: 0.25 }, t);
       });
   ```
   After:
   ```js
       // Beat 4 (4.8-11.7): second ride. Crossing a gate = that sector paints its tier colour (cycle 9: the overlay
       // is now the core's own 6px, so the line changes colour but never width; the gate ticks stay white -- the
       // old recolour-on-cross was never a wanted feature, per Nathan).
       var RIDE_T0 = 4.8, RIDE_DUR = 6.9;
       tl.fromTo('#rider', { opacity: 0 }, { opacity: 1, duration: 0.3, immediateRender: false }, 4.4);
       ride(tl, RIDE_T0, RIDE_DUR);
       GATES.forEach(function (f, i) {
         var t = RIDE_T0 + f * RIDE_DUR;
         tl.to('#sec' + (i + 1), { opacity: 1, duration: 0.25 }, t);
       });
   ```
   Line 283 (`tl.to('#sec4', ...)`), `// hold to 12.4` and the `tl.set('#rider', { opacity: 1 }, 11.70);`
   line stay exactly as they are. The `.gk` base attributes on lines 119-121
   (`style="stroke: var(--ink)" stroke-width="4" stroke-linecap="round" opacity="1"`) are
   already the target state — leave them.

**`ranking/index.html`:**

1. Lines 118-120: change each gate's `.gk` line to gates-saving's base attributes. Before (line 118; 119-120 identical but for `gate2`/`gate3`):
   ```html
           <g class="gate" id="gate1" opacity="0"><line class="gc" stroke-width="8" stroke-linecap="round" /><line class="gk" stroke="#F5C542" stroke-width="3" stroke-linecap="round" opacity="0.6" /></g>
   ```
   After:
   ```html
           <g class="gate" id="gate1" opacity="0"><line class="gc" stroke-width="8" stroke-linecap="round" /><line class="gk" style="stroke: var(--ink)" stroke-width="4" stroke-linecap="round" opacity="1" /></g>
   ```
   (i.e. `stroke="#F5C542" stroke-width="3" ... opacity="0.6"` → `style="stroke: var(--ink)" stroke-width="4" ... opacity="1"`; `.gc` untouched.)
2. Delete lines 231-234 (ranking's copy of `scoreGate`, never called — same four lines as in
   gates-saving except its `tl.set` puts `stroke` inside `attr`).
3. Delete line 241:
   ```js
       for (var k = 1; k <= 3; k++) gsap.set('#gate' + k + ' .gk', { attr: { stroke: SECTOR_COLORS[k - 1], 'stroke-width': 5, opacity: 1 } });
   ```
   and change the Frame 0 comment on line 238 from
   `// Frame 0: end of the second ride — everything scored, rider at the finish.` to
   `// Frame 0: end of the second ride — every sector painted, gate ticks white (cycle 9), rider at the finish = gates-saving's last frame.`
   Lines 239, 240, 242, 243 stay.

Acceptance: `grep -n "scoreGate\|stroke-width': 5" gates-saving/index.html ranking/index.html`
returns nothing. `grep -c 'style="stroke: var(--ink)" stroke-width="4"' ranking/index.html`
returns 3. `SECTOR_COLORS` is still defined in both files (unused; see decisions).

### Task 3 — (intentionally no strip) — nothing to do

Recorded here only so the numbering in the round docs, `CONTEXT.md` and the readout matches
what was discussed: **no S1-S4 strip is added to any marketing scene.** If any later note or
digest suggests adding one, it is out of date.

### Task 4 — `ranking/index.html`: Today's row is a P2 → green

Line 93. Before:
```css
  .trow.today .who, .trow.today .time { color: #9000C8; }
```
After:
```css
  .trow.today .who, .trow.today .time { color: #00D000; }   /* cycle 9: 17:08.9 is a P2 -> green, not purple (Nathan) */
```
Line 92 (`.trow.today { z-index: 2; }`) and the `.tnum` rule stay. Nothing else in the file
references `#9000C8` except the `sec3` stroke (Task 1) — leave that.

Acceptance: `grep -n "#9000C8" ranking/index.html` returns only the `sec3` path line.

### Task 5 — `ranking/index.html`: the climb goes up fast and settles (same 2.2s)

Lines 260-274. Before:
```js
    // Beat 2 (3.0-5.4): "Today" climbs the tower. Old P10 (12 Aug / trow-10) fades out and drops
    // off the bottom first; Today emerges just below slot 10 (top:600px) and rides 540px up to
    // slot 2 in one continuous glide (power1.inOut, 2.2 s). Each row it overtakes steps down one
    // slot (60px, this tower's row pitch), centred on the moment Today crosses it. Step times are
    // pre-computed from the climb's easing (quad inOut inverse) — no callbacks, frame-seek safe.
    tl.to('#trow-10', { opacity: 0, y: 60, duration: 0.35, ease: 'power2.in' }, 3.00);
    var CLIMB_T0 = 3.20, CLIMB_DUR = 2.2;
    tl.fromTo('#trow-today', { y: 0 }, { y: -540, duration: CLIMB_DUR, ease: 'power1.inOut' }, CLIMB_T0);
    tl.fromTo('#trow-today', { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out' }, CLIMB_T0);
    // [row, start] — start = (CLIMB_T0 + u_cross * CLIMB_DUR) - 0.15, where u_cross is when Today's
    // top is half a slot below that row's top (Today at slot 10 pitch, rows at 60*(k-1)).
    var STEP_DOWN = [[9, 3.69], [8, 3.87], [7, 4.02], [6, 4.15], [5, 4.28], [4, 4.43], [3, 4.62], [2, 4.88]];
    STEP_DOWN.forEach(function (s) {
      tl.to('#trow-' + s[0], { y: 60, duration: 0.3, ease: 'power2.inOut' }, s[1]);
    });
```
After:
```js
    // Beat 2 (3.0-5.4): "Today" climbs the tower. Old P10 (12 Aug / trow-10) fades out and drops
    // off the bottom first; Today emerges just below slot 10 (top:600px) and rides 540px up to
    // slot 2 in one continuous glide (power2.out, 2.2 s -- cycle 9: fast off the line, decelerating
    // into slot 2; was power1.inOut, which Nathan read as constant speed; total time unchanged).
    // Each row it overtakes steps down one slot (60px, this tower's row pitch), centred on the
    // moment Today crosses it. Step times are pre-computed from the climb's easing (power2.out
    // inverse: u = 1 - sqrt(1 - e)) — no callbacks, frame-seek safe.
    tl.to('#trow-10', { opacity: 0, y: 60, duration: 0.35, ease: 'power2.in' }, 3.00);
    var CLIMB_T0 = 3.20, CLIMB_DUR = 2.2;
    tl.fromTo('#trow-today', { y: 0 }, { y: -540, duration: CLIMB_DUR, ease: 'power2.out' }, CLIMB_T0);
    // Fade-in shortened 0.4 -> 0.25 with the new ease: Today now reaches row 9 at 3.39s and should be solid by then.
    tl.fromTo('#trow-today', { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power1.out' }, CLIMB_T0);
    // [row, start] — start = (CLIMB_T0 + u_cross * CLIMB_DUR) - 0.15, where u_cross is when Today's
    // top is half a slot below that row's top (Today at slot 10 pitch, rows at 60*(k-1)):
    // e_cross(k) = (570 - 60*(k-1)) / 540, u_cross = 1 - sqrt(1 - e_cross).
    var STEP_DOWN = [[9, 3.24], [8, 3.38], [7, 3.53], [6, 3.69], [5, 3.88], [4, 4.09], [3, 4.35], [2, 4.73]];
    STEP_DOWN.forEach(function (s) {
      tl.to('#trow-' + s[0], { y: 60, duration: 0.3, ease: 'power2.inOut' }, s[1]);
    });
```
The numbers, for Execute to re-derive as a check (rounded to 2 dp, as the file does):

| row k | e_cross | u_cross | cross time = 3.20 + u·2.2 | step start = cross − 0.15 |
|---|---|---|---|---|
| 9 | 0.1667 | 0.0871 | 3.392 | **3.24** |
| 8 | 0.2778 | 0.1502 | 3.530 | **3.38** |
| 7 | 0.3889 | 0.2183 | 3.680 | **3.53** |
| 6 | 0.5000 | 0.2929 | 3.844 | **3.69** |
| 5 | 0.6111 | 0.3764 | 4.028 | **3.88** |
| 4 | 0.7222 | 0.4729 | 4.240 | **4.09** |
| 3 | 0.8333 | 0.5918 | 4.502 | **4.35** |
| 2 | 0.9444 | 0.7643 | 4.881 | **4.73** |

(Sanity check of the method: the same table with the OLD ease, `u = sqrt(e/2)` for e<0.5 and
`1 − sqrt((1−e)/2)` otherwise, gives 3.69 / 3.87 / 4.02 / 4.15 / 4.28 / 4.43 / 4.62 / 4.88 —
exactly the file's current values.) `CLIMB_T0`, `CLIMB_DUR`, the trow-10 drop (3.00) and the
`// hold 5.4-5.9` comment (line 275) are unchanged.

Acceptance: `grep -n "power1.inOut" ranking/index.html` returns only the `#dim` tween (line 253);
`grep -n "CLIMB_DUR = 2.2" ranking/index.html` still matches.

### Task 6 — `ranking/index.html`: one caption, not two

1. Delete line 159:
   ```html
         <p class="caption" id="capA">Compare directly to your previous ride</p>
   ```
   Line 160 (`#capB`, "Compare against **your***selfs*") stays as is.
2. Replace lines 277-285. Before:
   ```js
       // Beat 3 (5.9-7.9): caption.
       tl.fromTo('#capA', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 5.90);
       tl.to('#capA', { opacity: 0, duration: 0.4 }, 7.50);
       tl.set('#capA', { opacity: 0 }, 7.90);

       // Beat 4 (8.2-10.8): caption, out at the 10.8 end.
       tl.fromTo('#capB', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 8.20);
       tl.to('#capB', { opacity: 0, duration: 0.4 }, 10.40);
       tl.set('#capB', { opacity: 0 }, 10.8);
   ```
   After:
   ```js
       // Beat 3 (5.9-10.8): the one caption (cycle 9: "Compare directly to your previous ride" removed per Nathan;
       // "Compare against yourselfs" now comes in where the first caption used to, 5.9, and holds to the same
       // 10.4 fade / 10.8 hard kill, so the scene length and the teaser cut sheet are unchanged).
       tl.fromTo('#capB', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 5.90);
       tl.to('#capB', { opacity: 0, duration: 0.4 }, 10.40);
       tl.set('#capB', { opacity: 0 }, 10.8);
   ```
   `data-duration="10.8"` on both clips (lines 108, 131) is unchanged.

Acceptance: `grep -n "capA" ranking/index.html` returns nothing; `grep -c "capB" ranking/index.html`
returns 4 (one element, three tweens).

### Task 7 — `brandmark/closing/index.html`: opening's second part, as the outro

Read `brandmark/opening/index.html` (109 lines) in full first — everything below is copied from
it. Three regions of closing change; the head (lines 1-37: tokens, `#stage`, `.clip` rules)
and the tail (lines 110-116) stay.

1. **CSS** — replace lines 38-59 (`#stack` … `#ring { stroke: var(--ink); }`, including the
   two comment lines). Before:
   ```css
     #stack {
       position: absolute;
       inset: 0;
       display: flex;
       flex-direction: column;
       align-items: center;
       justify-content: center;
       gap: 48px;
     }

     /* logo mark (ring + slash), rendered in its finished state and faded in as a unit */
     #mark { height: 280px; width: auto; opacity: 0; }
     #mark svg { width: 280px; height: 280px; display: block; }

     #wordmark-text { font-size: 96px; font-weight: 800; letter-spacing: 22px; color: #F5C542; margin: 0; opacity: 0; }
     #tagline-text  { font-size: 34px; font-weight: 500; letter-spacing: 1px;  color: var(--ink-dim); margin: 0; opacity: 0; }

     /* end-fade overlay, above #stack in z-order */
     #fade { position: absolute; inset: 0; background: var(--bg); opacity: 0; pointer-events: none; }

     /* ---- SVG colour tokens (presentation attribute removed from #ring below) ---- */
     #ring { stroke: var(--ink); }
   ```
   After (opening's lines 37 and 44-47, with `#open` → `#close`):
   ```css
     #close .inner { opacity: 1; }

     /* wordmark + tagline, centred -- copied verbatim from ../opening/ (cycle 9: closing = opening's second part, no mark) */
     #wordmark { position: absolute; top: 50%; left: 0; width: 1920px; text-align: center; transform: translateY(-40px); }
     #wordmark .word    { font-size: 96px; font-weight: 800; letter-spacing: 22px; color: var(--ink); margin: 0 0 22px 0; opacity: 0; }
     #wordmark .tagline { font-size: 34px; font-weight: 500; letter-spacing: 1px;  color: var(--ink-dim); margin: 0; opacity: 0; }
   ```
2. **Markup** — replace lines 66-85 (the header comment through `</div>` closing `#close`). Before:
   ```html
     <!-- Closing (4.0s): mark fades in (already fully drawn), QUALIFIRE wordmark fades in, tagline fades in,
          all tightly overlapping (v3: "tighter, more together" per Nathan's v2 feedback, closer to v1's feel),
          holds, fades to black. Split out 2026-09-10 as a standalone HyperFrames composition — v1 was an ffmpeg
          cut of the old teaser (10.5-11.2s) with stray leftover frames from the previous card baked in; v2 was
          the first real render of closing on its own but staggered the reveal over ~1.9s, which read as too
          slow/separate; v3 compresses it back to ~0.75s. Geometry inlined from
          product/brand/logos/qualifire_logo_5_monogram_wordmark.svg (512x512 viewBox), same as ../opening/. -->
     <div id="close" class="clip full" data-start="0" data-duration="4.0" data-track-index="0">
       <div id="stack">
         <div id="mark">
           <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
             <circle id="ring" cx="256" cy="218" r="118" fill="none" stroke-width="30" stroke-linecap="round" transform="rotate(-90 256 218)" />
             <line id="slash" x1="291.355" y1="253.355" x2="387.5206" y2="349.5206" fill="none" stroke="#F5C542" stroke-width="30" stroke-linecap="round" />
           </svg>
         </div>
         <p id="wordmark-text">QUALIFIRE</p>
         <p id="tagline-text">Same road. New meaning.</p>
       </div>
       <div id="fade"></div>
     </div>
   ```
   After:
   ```html
     <!-- Closing (4.0s, v4): opening's second part re-used as the outro, per Nathan (cycle 9): "not the logo drawing,
          but only the qualifier text + the slogan beneath it". No mark. A beat of black, the off-white QUALIFIRE
          wordmark fades in, then the tagline (opening's beat-3 tweens, 2.95/3.35 there -> 0.15/0.55 here), a longer
          hold than opening's (this is the end of the video), then opening's 0.8s fade to black, hard-killed at the
          clip end. Duration stays 4.0s so the teaser cut sheet and closing's soundtrack keep their timings.
          History: v1 = ffmpeg cut of the old teaser's ending (10.5-11.2s); v2 = first standalone composition
          (finished mark + yellow wordmark + tagline, staggered); v3 = the same reveal tightened to ~0.75s. -->
     <div id="close" class="clip full" data-start="0" data-duration="4.0" data-track-index="0">
       <div class="inner">
         <div id="wordmark">
           <p class="word">QUALIFIRE</p>
           <p class="tagline">Same road. New meaning.</p>
         </div>
       </div>
     </div>
   ```
3. **Timeline** — replace lines 89-108 (from `// Ring is rendered fully drawn…` through
   `tl.set('#fade', { opacity: 1 }, 4.0);`). Before:
   ```js
       // Ring is rendered fully drawn from frame 0 — no draw-on animation here, that's opening's job.
       var CIRC = 2 * Math.PI * 118;
       gsap.set('#ring', { strokeDasharray: CIRC, strokeDashoffset: 0 });

       var tl = gsap.timeline({ paused: true });

       // Beat 1 (0.00-0.50): mark fades/scales up — tight, together reveal (v1 feel).
       tl.fromTo('#mark', { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out', transformOrigin: '50% 50%' }, 0);

       // Beat 2 (0.10-0.60): QUALIFIRE wordmark fades in, overlapping the mark.
       tl.fromTo('#wordmark-text', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power1.out' }, 0.10);

       // Beat 3 (0.25-0.75): tagline fades in, overlapping both — everything on screen by 0.75s.
       tl.fromTo('#tagline-text', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power1.out' }, 0.25);

       // Beat 4 (0.75-3.50): hold — no tween.

       // Beat 5 (3.50-4.00): fade to black.
       tl.fromTo('#fade', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power1.inOut' }, 3.5);
       tl.set('#fade', { opacity: 1 }, 4.0);
   ```
   After:
   ```js
       var tl = gsap.timeline({ paused: true });

       // 0.00-0.15: black -- a breath after the hard cut from ranking's last frame (opening has the same empty
       // frame before its wordmark, 2.60-2.95).

       // Beat 1 (0.15-1.25): wordmark in, then tagline -- ../opening/'s beat 3 verbatim, shifted by -2.80s.
       tl.fromTo('#wordmark .word',    { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.80, ease: 'power2.out' }, 0.15);
       tl.fromTo('#wordmark .tagline', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.70, ease: 'power2.out' }, 0.55);

       // Beat 2 (1.25-3.20): hold -- no tween. Beat 3 (3.20-4.00): opening's 0.8s fade to black, hard-killed at the clip end.
       tl.to('#close .inner', { opacity: 0, duration: 0.80, ease: 'power1.inOut' }, 3.20);
       tl.set('#close .inner', { opacity: 0 }, 4.00);
   ```
   Lines 110-111 (`window.__timelines.closing = tl;`) stay — the timeline id is still `closing`.

Acceptance: `grep -n "mark\|ring\|slash\|#fade\|#stack\|F5C542" brandmark/closing/index.html`
returns only the header comment's mentions of "mark" (no `<svg`, no `#F5C542` anywhere — the
day-theme block's tokens don't contain it). `diff <(sed -n 95,96p brandmark/opening/index.html) <(sed -n '/wordmark .word/p;/wordmark .tagline/p' brandmark/closing/index.html)`
differs only in the trailing start times (2.95/3.35 vs 0.15/0.55).

### Task 8 — round docs (no mp4s exist yet; this is the established pattern)

1. Create `marketing/silent-studio/gates-saving/rounds/v6/FEEDBACK.md`, modelled line-for-line
   on `rounds/v5/FEEDBACK.md` (header "Render file: gates-saving_v6.mp4 (not rendered yet)",
   Duration 12.300s unchanged, Source ../../index.html; "What changed since v5"; "What you'll
   see, in order"; "Things to check in the render"; the render command + copy + ffprobe lines
   with `v6`; empty "Nathan's feedback" section). Content:
   - What changed: the sector-coloured overlays are now the core's own 6px instead of 9px, so
     a sector changes **colour** the instant its gate is crossed but the line never fattens
     (the same fix as the app's `eb8ad99`); gate ticks stay white for the whole scene — the old
     recolour-to-tier + 4→5px fatten on crossing is removed (Nathan: never a wanted feature).
     Nothing else changed — same 12.3s, same ride/caption/camera timings; no strip UI added
     (Nathan: it would not read nice in video).
   - What you'll see: as v5's list, with item 5 reworded to "4.4-11.7 — Second ride runs; each
     sector's stretch of route turns green / yellow / purple / green as its gate is crossed
     (6.46 / 9.15 / 10.60s, finish 11.7s), same width as before the crossing; the gate ticks
     stay white."
   - Things to check: (a) with the overlay at exactly the core's width, the tier colour must
     fully replace the yellow along the whole sector, with no yellow fringe at the edges
     (both strokes are round-capped/joined on the same path, so none is expected — but this
     is the one thing a render, not a diff, proves); (b) sector 2 is the yellow tier, so with
     no thickening its "flip" is now invisible (yellow onto yellow) — this is inherent to
     Nathan's ruling and the app has the same property since `eb8ad99`; flag if the gap
     between gate 1 (6.46s) and gate 2 (9.15s) with nothing visibly changing reads as odd;
     (c) white ticks over a painted purple/green sector still read.
2. Create `marketing/silent-studio/ranking/rounds/v6/FEEDBACK.md`, same model as its
   `rounds/v5/FEEDBACK.md`: duration 10.800s unchanged. What changed since v5: (1) Today's row
   is green, not purple — it's a P2; (2) the climb now starts fast and decelerates into slot 2
   (`power2.out`, still 2.2s, 3.2→5.4s); the rows step down at recomputed instants (19 Aug
   3.39s, 21 Aug 3.53, 24 Aug 3.68, 26 Aug 3.84, 29 Aug 4.03, 31 Aug 4.24, 3 Sep 4.50, Sat
   4.88 — crossing times), Today's fade-in shortened to 0.25s so it's solid when it meets the
   first row; (3) the "Compare directly to your previous ride" caption is gone — "Compare
   against yourselfs" now comes in at 5.9s and holds to the 10.4/10.8 exit; (4) the map
   backdrop's painted route is the core's width (no 9px thickening) and the gate ticks are
   white — matching gates-saving v6's last frame. "What you'll see" updated accordingly
   (item 4: "(green)", "fast off the line, settling into slot 2 at 5.4s"; items 6-7 merged
   into "5.9-10.8 — Caption 'Compare against yourselfs', out at the end"). Things to check:
   (a) the fast start — the first three rows are overtaken within ~0.5s of Today appearing;
   flag if it reads as a jump rather than a launch (a `power1.out` would be a gentler
   version); (b) whether the last 0.5s of the climb (the final 30px into slot 2) reads as a
   settle or a stall; (c) 4.5s on one caption (5.9-10.4) over a static tower — if it holds
   too long, the fix is a later start (e.g. 6.5), not a shorter scene (10.8s is in the teaser
   cut sheet and the soundtrack); (d) green "Today 17:08.9" legibility on the card at
   `#00D000`; (e) the match-cut from gates-saving v6's last frame.
3. Create `marketing/silent-studio/brandmark/closing/rounds/v4/FEEDBACK.md`, same model as its
   `rounds/v3/FEEDBACK.md`: duration 4.000s unchanged. What changed since v3: the mark is gone;
   the scene is now opening's second part — off-white QUALIFIRE wordmark fades in with a small
   rise at 0.15s, the tagline at 0.55s (opening's exact tweens), hold, 0.8s fade to black from
   3.2s. "What you'll see": 0.00-0.15 black; 0.15-0.95 wordmark in; 0.55-1.25 tagline in;
   1.25-3.20 hold; 3.20-4.00 fade to black; ends 4.0s. Things to check: (a) the wordmark is
   opening's off-white, not v3's yellow — Plan read "use the second part of the opening
   render" literally; if you want the closing's yellow back it's the one token
   `color: var(--ink)` → `#F5C542` on `#wordmark .word`; (b) whether 0.15s of black before the
   wordmark is the right breath after the cut from ranking, or should be 0; (c) whether the
   1.95s hold + 0.8s fade is the right ending weight, or the fade should start later
   (shortening the hold); (d) the vertical placement (`translateY(-40px)`, copied from
   opening, which had the mark's 400px box to sit inside — here there is nothing else on
   screen, so "slightly above centre" is now a free choice).
4. Add a `v6` row to the "Feedback rounds" table in `gates-saving/README.md` and
   `ranking/README.md` (date 2026-09-16, status "Built, awaiting Nathan's render — cycle 9
   render-remake (no line thickening, white ticks[, ranking: green P2, fast-settle climb, one
   caption])"), and a `v4` row to `brandmark/closing/README.md`'s table (status "Built,
   awaiting Nathan's render — cycle 9: opening's second part re-used, no mark"). Don't rewrite
   the rest of those READMEs even though their tables are missing rows (v4/v5 for the two
   scenes, v3 for closing) — not this brief. Exception, because they'd otherwise be flatly
   wrong: in `brandmark/closing/README.md` change the title line to
   `# brandmark/closing — lockup variant: wordmark + tagline (opening's second part)` and the
   "Behaviour:" paragraph's description to "as of round v4 this is opening's second part
   re-used as the outro — no mark; off-white QUALIFIRE wordmark fades in, tagline fades in
   beneath it, holds, fades to black (v2-v3 showed the finished mark + a yellow wordmark)".
   And in `structure.md`'s folder map, the `brandmark/closing/` row's "What it is" cell:
   `lockup variant: fade-in + yellow wordmark` → `lockup variant: wordmark + tagline only (opening's second part)`.
5. `marketing/silent-studio/teaser/README.md`, the bullet at line 76 ("`index.html` — stale:
   the old 11.2s brand teaser..."): append one sentence to that bullet: *"Its sector beat
   (four bordered boxes with times) predates cycle 9's thin-bar strip in the app
   (`app/src/ui/chips.tsx`) — do not copy it; the marketing scenes deliberately show no strip."*

### Task 9 — Verification (what Execute CAN do without HyperFrames)

1. Re-read all three edited `index.html` files top to bottom once.
2. Syntax-check each inline timeline script: the device shell has `node` v22 (but no npm —
   do not try to install anything). Extract the body of the LAST `<script>` block of each
   edited file to a temp file under the scratchpad and run `node --check <file>` — this
   parses without executing (so `gsap`/`document` being undefined is fine). Must exit 0.
3. Confirm every `tl.to(... { opacity: 0 } ...)` exit fade in the three files has a matching
   hard `tl.set(... { opacity: 0 } ...)` at the clip's boundary (HyperFrames'
   `gsap_exit_missing_hard_kill` contract — see `teaser/README.md`'s 2026-09-09 note):
   gates-saving capA 4.5/4.9 and capB 11.9/12.3 (untouched); ranking capB 10.40/10.8;
   closing `.inner` 3.20/4.00.
4. Re-derive the `STEP_DOWN` table (Task 5) with the formula in the comment and confirm the
   eight values.
5. `git diff --stat marketing/` must list exactly: `gates-saving/index.html`,
   `ranking/index.html`, `brandmark/closing/index.html`, `gates-saving/README.md`,
   `ranking/README.md`, `brandmark/closing/README.md`, `structure.md`, `teaser/README.md`,
   plus the three new `rounds/vN/FEEDBACK.md` files as untracked. Anything else → STOP.
   (Note: `app/src/ui/wayMapGeo.ts` and `wayMapView.tsx` were already modified in the
   working tree before this brief — not yours, don't touch, don't stage.)
6. Report: the full diff of the three `index.html` files, the `node --check` results, and the
   recomputed `STEP_DOWN` values.

Do NOT commit — the coordinator commits after Inspect, per the pipeline.

## What Nathan still has to do (after Execute's edits land)

The edits change source only. New videos need Nathan's PowerShell window on his PC
(`COMMANDS.md`). Preview first if you like (`-Name gates-saving` without `-Render` opens
Studio on port 3002 — for gates-saving scrub to 6.5s, 9.1s, 10.6s, 11.7s; for ranking to
3.4s, 4.9s, 5.4s, 5.9s; for closing to 0.5s, 1.3s, 3.6s), then render all three:

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gates-saving -Render
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name ranking -Render
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name brandmark\closing -Render
```

(`brandmark\closing` is the subpath form `render.ps1 -Name` accepts for the lockup variants —
`structure.md`.) Each lands a timestamped mp4 in `gates-saving\renders\`, `ranking\renders\`
and `brandmark\closing\renders\` — in the same repo this session can see. Nothing else
needs rendering: `start-ride`, `colours`, `brandmark/opening` and the root `brandmark` lockup
are visually unchanged by this pass, and `teaser/index.html` is not the teaser (see the table
above).

Once you've had a look, say so in chat (or write in the three `rounds/vN/FEEDBACK.md` files)
and the follow-up below runs.

## Follow-up (NOT part of this brief's Execute task — needs the three renders to exist)

Mechanical; the coordinator can do it directly, or a small Execute pass:

1. Pick each new render into its round: copy the newest `gates-saving/renders/gates-saving_*.mp4`
   → `gates-saving/rounds/v6/gates-saving_v6.mp4`, `ranking` → `rounds/v6/ranking_v6.mp4`,
   `brandmark/closing/renders/*.mp4` → `brandmark/closing/rounds/v4/closing_v4.mp4`; ffprobe
   all three (expect 12.3s, 10.8s and 4.0s, all unchanged).
2. `silent-studio/all-renders/`: replace `gates-saving_v5.mp4` → `gates-saving_v6.mp4`,
   `ranking_v5.mp4` → `ranking_v6.mp4`, `closing_v3.mp4` → `closing_v4.mp4` (one file per
   composition; superseded files go to `safe_to_delete/`, never deleted — `structure.md`'s
   all-renders checklist).
3. Teaser: gates-saving, ranking and closing are ingredients 3, 4 and 5 of the concat cut.
   Build `teaser/rounds/v7/` (concat.txt pointing at gates-saving_v6 / ranking_v6 /
   closing_v4, FEEDBACK.md, `teaser_v7.mp4` via the same ffmpeg concat recipe as v6 — ffmpeg
   exists in the device shell); durations are unchanged so the cut sheet's timings carry over
   (47.6s). Replace `teaser_v6.mp4` in `silent-studio/all-renders/`.
4. Audio (`marketing/audio-studio/`, runs entirely in Claude's sandbox). Next rounds:
   `gates-saving` → soundv4 on `gates-saving_v6.mp4`, `ranking` → soundv3 on
   `ranking_v6.mp4`, `brandmark/closing` → soundv3 on `closing_v4.mp4`, `teaser` → soundv3 on
   `teaser_v7.mp4`. **Not all of these are plain remuxes** — check each `soundtrack.py` /
   `AUDIO-BRIEF.md` against the new picture before muxing:
   - gates-saving: beat timings unchanged; the AUDIO-BRIEF's "what happens on screen" column
     mentions gate ticks recolouring — update the wording, the cues can stay.
   - ranking: `soundtrack.py` plays a *purple* "personal best" chime at 5.4s and a droplet run
     that *speeds up* to match the old slow-fast-slow climb, then two pads at 5.9 and 8.2 for
     the two captions. With a green P2, a fast-then-settling climb and one caption, the
     composition itself likely needs a revision (green chime if one exists in `synth.py`'s
     palette, droplet run that starts fast, one pad from 5.9) — that is a soundtrack design
     call for its own audio round, flagged here so it isn't silently remuxed.
   - closing: its soundv2 cues a sub-hit at 0.0 for the mark and a chime at 0.35 for the
     tagline; with the wordmark now at 0.15 and the tagline at 0.55 these need re-timing (and
     the 0.0 "mark" hit no longer has a picture event) — same: a small audio revision, not a
     remux.
   Update each `soundvN/FEEDBACK.md`, `README.md` round tables, and the AUDIO-BRIEF "what
   happens on screen" columns. Then `audio-studio/all-renders/`: replace the four with-sound
   files (`gates-saving_v6_with_sound_v4`, `ranking_v6_with_sound_v3`,
   `closing_v4_with_sound_v3`, `teaser_v7_with_sound_v3`).
5. Update `structure.md` folder-map rows if their "Own index.html?" column is refreshed.

## Not in scope — do not do

- Anything under `marketing/audio-studio/` (follow-up step 4).
- Anything in either `all-renders/` folder, any `rounds/vN/*.mp4`, any `renders/`.
- `start-ride/index.html` (its 9px `.sector` paths and its gates never show — leave them),
  `colours/index.html` (chart, no app UI), `teaser/index.html` (stale by record),
  `brandmark/index.html` (root lockup), `brandmark/opening/index.html` (the source being
  copied — read it, don't edit it), `_map/**`, `marketing/website/**`.
- Tier hex values anywhere (already correct) — the one purple→green swap in Task 4 is a tier
  *assignment*, not a hex change.
- Flattening the route to plain yellow anywhere, or removing/never-revealing the `secN`
  overlays — Nathan wants the painted route kept.
- Adding an S1-S4 strip, a "current sector" cue, or any new UI element to any scene.
- Changing `CLIMB_T0`/`CLIMB_DUR`, the row step tween (0.3s, `power2.inOut`, 60px), or any
  scene's `data-duration` — ranking stays 10.8s, closing stays 4.0s, gates-saving 12.3s.
- Renaming `#capB`, or moving its exit (10.40 / 10.8).
- Fixing the stale gaps in the READMEs' round tables beyond adding the new row (and the two
  one-line corrections in closing's README / `structure.md` named in Task 8.4).
- Committing.

**If any ambiguity or surprise arises that this brief doesn't cover, STOP and report back —
never guess.**
