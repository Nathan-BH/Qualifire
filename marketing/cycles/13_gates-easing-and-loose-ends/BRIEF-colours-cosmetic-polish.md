# BRIEF — colours: bring the "avg" label and the dashed avg line inside the card (round v5)

**Status: this brief is not yet executed.** Written 2026-09-20 (Plan tier, Fable).
Sonnet-executable: two CSS declarations in one `index.html` plus round docs. No renders.
Stop-on-ambiguity applies — anchors quoted verbatim from disk on 2026-09-20.

## 0. What this is

Cycle 11 (`11_colours-real-tower/OPEN-ITEMS.md`) shipped `colours` v4 and left two
cosmetic calls open on purpose:

> - The "avg" label sits just outside the card's right edge (was inside the card in
>   v3, where there was empty width to spare — the real row content now fills that
>   space). Should look intentional, not like clipping. If it reads wrong, it's a
>   one-line CSS nudge.
> - The dashed avg line pokes ~10px past the card's right border before the "avg"
>   label. Same possible fix if it looks like a glitch rather than a pointer.

`rounds/v4/FEEDBACK.md` says the same under "Open questions" ("placed outside the
card's right edge (#tower-relative left:824px) rather than inside it, because the real
row content (who/time text) now occupies the width v3's blank rule used to leave free
for an inside label — confirm this looks right on render"). Nobody has recorded a
verdict. This brief makes the fix cycle 11 sized as "a one-line CSS nudge" — twice —
and reports the pixel deltas so Nathan can judge them before, or instead of, a render.

## 1. Where the two elements are and why they end up outside

File: `marketing/silent-studio/colours/index.html`. Geometry, all from the CSS in
that file (`* { box-sizing: border-box; }`; absolute children of `.card` are positioned
relative to its padding box, i.e. inside the 2 px border):

| element | CSS | resulting card-relative x (px) | stage x (px) |
|---|---|---|---|
| `#tower` (`.card`) | `left: 560px; width: 800px; border: 2px` | padding box 0 → 796 | 562 → 1358; outer border edge at 1360 |
| `#tower .rows` | `left: 40px; right: 40px; top: 84px; height: 600px` | 40 → 756 | 602 → 1318 |
| `.trow .time` (right-aligned in `.trow`, which is `left: 70px; right: 0` inside `.rows`) | 34 px, weight 800, tabular | ends at 756; "17:48.9" starts ≈ 624 | ≈ 1186 → 1318 |
| **`#avg`** (line 49, child of `.rows`) | `left: 50px; right: -52px; top: 299px; border-top: 3px dashed` | 90 → **808** | 652 → **1370** |
| **`#avg-label`** (line 50, child of `.card`) | `left: 824px; top: 369px; font-size: 24px; line-height: 30px` | **824** → ≈ 869 | **1386** → ≈ 1431 |

So the dashed line ends 12 px past the inside of the border / 10 px past the card's
outer edge (the "~10px" cycle 11 saw), and the label starts 26 px to the right of the
card's outer edge — entirely outside. Vertically both are right: the line occupies
card y 383–386 (row 5/6 boundary; rows are 60 px, row 5 = 324–384), and the label's
30 px line box is centred on 384. Only the horizontal placement changes.

For reference, v3 (`rounds/v3/index_v3-source.html` lines 54–55) had
`#avg { left: 100px; width: 540px }` and `#avg-label { left: 656px }` — the line
*stopped* and the label sat at its end, inside the card. v4 stretched the line across
the (now populated) row width and pushed the label out.

## 2. Ruling (default = alternative A; B and C logged in `questionsfornathan.md` Q4)

**A — line stops at the border; label sits on the line, knocked out, left of the
time column.** Keeps v4's full-width rule (which is what makes it read as "the
average cuts the ranking here") and puts the word back inside the card without
colliding with the numbers. The classic label-on-a-rule treatment.

- `#avg`: `right: -52px` → **`right: -40px`**. The line now ends at card x 796, flush
  with the inside of the 2 px border (stage x 1358). **Delta: 12 px shorter**; it no
  longer paints over or past the border. `left: 50px` is unchanged (the line still
  starts under the rank-number column at card x 90).
- `#avg-label`: `left: 824px` → **`left: auto; right: 200px;`** and add
  **`padding: 0 8px; background: var(--card);`**. Right edge of the label box lands at
  card x 596 (stage 1158), i.e. ≈ 28 px clear of where "17:48.9" begins (≈ 624); with
  the 8 px padding the box is ≈ 61 px wide, spanning ≈ card x 535–596. The
  `--card`-coloured background (30 px tall, covering the 3 px line) breaks the dashes
  around the word in both night (`#141414`) and day (`#FFFFFF`) themes. **Delta: the
  label moves from stage x 1386 (26 px outside the card) to ≈ 1097–1158 (200 px inside
  the card's right edge, vertically unchanged).** `top: 369px`, font, colour and the
  two GSAP tweens that animate `#avg`/`#avg-label` (line 121 fade-in at 2.2 s, line 154
  flash at 9.15 s) are untouched.

Paint order is already right: `#avg-label` comes after `.rows` in the DOM and is
absolutely positioned, so it paints over the line; the only `z-index` in the file
(`.trow.today`, rank 11) is 216 px lower and irrelevant.

**Why 200 px and not "just inside the numbers":** the time strings' width depends on
the Windows font (`Segoe UI` first in the stack); 28 px of clearance at the estimated
132 px string width is enough margin that a ±15 px font-width surprise cannot cause an
overlap. If Nathan wants it tighter after seeing a render it is one number.

**Alternatives, not executed unless Q4 says so:**
- **B — label floats just above the line, no knockout:** same as A but `top: 352px`
  (box 352–382, bottom 1 px above the line) and *no* `padding`/`background`. Glyphs sit
  in the empty middle of row 5 (x ≈ 535–580), clear of "29 Aug" (ends ≈ 190) and
  "17:48.9" (starts ≈ 624).
- **C — keep v4's outboard pointer, but clean:** leave `#avg-label` exactly as is and
  change only `#avg` to `right: -68px`, so the line ends at card x 824 and touches the
  label instead of stopping 16 px short. This is the "it was intentional" reading.

## 3. The edit — two lines in one file

File: `marketing/silent-studio/colours/index.html`. **Anchors (must match verbatim,
currently lines 49–50):**

```css
  #avg { position: absolute; left: 50px; right: -52px; top: 299px; height: 0; border-top: 3px dashed var(--ink-dim); opacity: 0; }
  #avg-label { position: absolute; left: 824px; top: 369px; margin: 0; font-size: 24px; line-height: 30px; color: var(--ink-dim); opacity: 0; }
```

**Replace with:**

```css
  #avg { position: absolute; left: 50px; right: -40px; top: 299px; height: 0; border-top: 3px dashed var(--ink-dim); opacity: 0; }  /* v5: ends flush with the inside of the card border (was -52px, 10px past it) */
  #avg-label { position: absolute; left: auto; right: 200px; top: 369px; margin: 0; padding: 0 8px; font-size: 24px; line-height: 30px; color: var(--ink-dim); background: var(--card); opacity: 0; }  /* v5: inside the card, sitting on the avg line left of the time column, card-coloured so the dashes break around it (was left: 824px, outside the card) */
```

Nothing else in the file changes. Stop-on-ambiguity triggers: either anchor line is
not found verbatim; `#avg` or `#avg-label` are styled anywhere else in the file
(`grep -n "avg" index.html` should show exactly six lines: 49, 50, 80, 83, 121, 154 —
the caption sentences say "average", which does not match); a `rounds/v5/` folder
already exists. Any of these →
stop and report.

## 4. Round docs (markdown + one source snapshot)

1. **Create `marketing/silent-studio/colours/rounds/v5/FEEDBACK.md`** in the shape of
   `rounds/v4/FEEDBACK.md` (read it first; do not edit it). Header
   `# Colours — Round v5`; **Render file:** `colours_v5.mp4 (not rendered yet —
   Nathan's PC step; commands in marketing/cycles/13_gates-easing-and-loose-ends/
   COMMANDS.md §3)`; **Duration planned:** `19.0 s (unchanged from v4)`;
   **Composition source:** `../../index.html`. Sections: "What changed (v4 -> v5)" —
   the two deltas from §2 with the before/after pixel numbers; "What to check" — the
   line ending flush with the border, the word on the line left of the numbers with the
   dashes broken around it, no overlap with "17:48.9"/"17:55.4", and that the 9.15 s
   flash still reads; "Open questions" — none, other than Q4 in the cycle folder;
   "Render" — the single `render.ps1 -Name colours -Render` line and a pointer to
   `COMMANDS.md` §3 for the copy / ffprobe / frame steps; an empty "Nathan's feedback".
2. **Snapshot the source**: copy the edited `index.html` to
   `rounds/v5/index_v5-source.html` — this composition's convention (v3 and v4 both
   have one).
3. **`marketing/silent-studio/colours/README.md`**: add a v5 row after the v4 row
   (currently line 47): `| [v5](rounds/v5/FEEDBACK.md) | colours_v5.mp4 | — | Built,
   awaiting Nathan's render — avg label brought inside the card, avg line stops at the
   border (cycle 13) |`. Add a one-line `**v5 (2026-09-20):**` entry in the same place
   the v2/v3/v4 entries live near the top of that README (lines 5–8 pattern), saying
   the same thing. Nothing else.

## 5. Verification (executor — no render possible)

1. `grep -n "avg" marketing/silent-studio/colours/index.html` — paste the output; the
   only changed lines are 49 and 50.
2. Recompute and report the geometry from the edited values exactly as §1/§2 do:
   line end (card x, stage x), label box left/right (card x, stage x), clearance to the
   time column (assume the 132 px string width; state it as an estimate). These are
   the numbers Nathan sanity-checks.
3. Confirm the two `#avg`/`#avg-label` tweens (lines 121 and 154) are untouched.
4. Confirm the day theme still resolves: `--card` is defined in both `:root` and
   `:root[data-theme="day"]` blocks (lines 8–19) — quote the two values.
5. Not applicable, do not run: the app test suite and `tsc` — nothing under `app/`.
6. The render and the 4.0 s frame check are Nathan's — `COMMANDS.md` §3.

## 6. Report format

The two replaced lines (before/after), the §5 numbers, the three files
created/edited, and one sentence per §3 stop-trigger confirming it did not fire.
Describe the change in pixels, not in adjectives — nobody has seen it rendered.
