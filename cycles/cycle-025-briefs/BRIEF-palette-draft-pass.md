# BRIEF — Palette draft pass: pink / light-blue / green mockups (cycle 025 · WP-palette-draft-pass · D-039 execution tier)

Written 2026-08-30 by the Opus planning pass (substituting for Fable; Fable and Sonnet
weekly quotas are exhausted, so an Opus plan drives a Haiku executor for the rest of the
week). Every anchor, line number, command, checksum and contrast number below was
**actually run against the repo at HEAD tonight** by the planning pass — the numbers in this
brief are measurements, not estimates.

You are the Haiku executor. **This brief is your ONLY input.** Do not read the WP, the
backlog, DECISIONS.md, or any other planning document. Everything you need is here.

## STOP-ON-AMBIGUITY RULE (read this first, it governs everything below)

Every step in this brief tells you the command to run and the **exact output to expect**.

- If a command's output does **not** match what this brief predicts — even by one character,
  one file, or one digit — **STOP IMMEDIATELY**. Change nothing further. Report the command
  you ran and its complete output **verbatim** to the coordinator, plus the predicted output
  it failed to match. Do not retry with a variation. Do not "fix" it. Do not continue to the
  next step.
- If you find yourself about to make **any** decision this brief has not already made for you
  — a colour value, a filename, a threshold, a code change, a workaround — **STOP** and
  report instead. You are never authorised to invent a value or improvise a fix here.
- Do not edit any file this brief does not explicitly tell you to create.
- Do not run any command this brief does not contain.

There is nothing in this task that requires your judgement. If you need judgement, that is
the signal to stop.

## Environment

- The repo is mounted at `$HOME/mnt/Qualifire`. Access it **ONLY** via the
  `mcp__remote-devices__device_bash` tool. Do not use any local Bash / Read / Write / Edit
  tool — those point at a different filesystem and will silently do nothing useful.
- Every `device_bash` call is a **fresh shell**: no cwd, no environment, no variables carry
  over from the previous call. Every command block below is therefore self-contained and
  starts with its own `cd`.
- The mount is slow tonight. Pass `timeout_ms: 45000` on **every** `device_bash` call.
- **Paste each numbered command block below verbatim as the entire `command` argument.**
  The tool already runs your string through `bash -c`, so do **not** wrap it in
  `bash -c '...'` yourself — that breaks the heredoc quoting.
- Several blocks are heredocs (`cat > file <<'PYEOF' … PYEOF`). Copy them **character for
  character**, including the quotes around the delimiter and the final delimiter line.
- `python3` is `/usr/bin/python3` (Python 3.10.12). No packages beyond the standard library
  are needed. Node is not needed. There are no app tests to run in this task.
- **Do NOT run any `git` write command** (no `add`, `commit`, `checkout`, `restore`, `stash`,
  `clean`). The coordinator commits. Read-only `git status` / `git diff --stat` is fine and
  is used in the final verification step.
- **Never delete a file.** Nothing here requires it.
- **Do NOT run `data/analysis/08_build_route_assets.py`** under any circumstances.

## Mandate — what you are producing and what you are not

Nathan asked for **draft colour-theme mockups** — pink, light blue, green — generated
through the existing `design/make_screens.py` mockup pipeline, purely as design exploration
for him to look at.

**In scope:** three new draft token sets, rendered to 27 new SVG mockups (9 screens x 3
palettes) in a new `design/drafts/` folder, plus a computed contrast report, plus a
no-clobber proof for the `design/edited/` folder.

**Explicitly OUT of scope — do not do any of these:**

- No app code. Nothing under `app/` is touched, read-for-edit, or changed.
- No theme switcher, no new setting, no UI feature.
- No edit to `design/make_screens.py` (it is on the must-not-change list below).
- No edit to `design/canonical/*.svg` (all 18 must stay byte-identical).
- No edit to `product/DECISIONS.md`, `product/BACKLOG.md`, or any process document.

## Three hard constraints, already resolved for you

### Constraint 1 — the verdict colours are NOT part of a theme

The scoring/tier vocabulary (purple = career-best, green, yellow, plus the no-data grey and
the rider dot and the map casing) must render **identically in every palette**. A theme
recolours **chrome only**: backgrounds, cards, borders, text, buttons, the route line.

**The planning pass verified how the script already separates these** (read
`design/make_screens.py` at HEAD):

- **`COLORS` dict, line 73** — the fixed, theme-independent set. Contains `purple`
  `#A667F0`, `purpleInk` `#120521`, `green` `#3ED598`, `neutral` `#F5C542`, `amber`
  `#E8A33D`, `grey` `#6f6e6a`, `riderBlue` `#2F7DE1`, `casing` `#14120C`, `ink`, `inkDim`,
  `white`, and the night race surfaces. **These are the verdict colours. Nothing in this
  task changes them.**
- **`THEMES` dict, line 94** — the per-theme chrome tokens. Two entries today, `"day"`
  (lines 95–100) and `"night"` (lines 101–105), each with exactly **twelve** keys:
  `bg, card, cardBorder, text, textDim, text2, accent, accentText, onAccent, raceBg,
  raceCard, raceBorder`.

So the two groups **are already structurally separate** — good news, no carving apart is
needed. But there is **one real conflation point**, and this brief resolves it:

> `chip_palette()` at **line 646** (which mirrors the app's `chips.tsx` exactly) returns, for
> the `"neutral"` verdict tier, the text colour `t["accentText"]` — **line 657**. That means
> `accentText` is simultaneously a chrome token *and* the ink used to draw one of the
> verdict tiers.

**Ruling, already made — you do not decide this:** all three draft palettes **inherit
`accentText` unchanged from the day theme (`#B98A0A`)**. They override the other eleven
tokens. This keeps the neutral verdict tier reading exactly as it does today, at the cost of
the active-pill label staying gold in all three drafts — which is the correct trade under
Constraint 1. The generator script below **enforces** this with a hard assertion; it exits
non-zero if any palette tries to override `accentText`.

`accent` itself (`#F5C542` in the day theme, i.e. the same hex as the yellow tier) **is**
chrome — the script uses it for the route line (lines 470/473/478/480), the active tab
underline (589), buttons (962/1071/1129/1491), switches and segmented controls (852/861),
and the "current sector" slot border (672). Re-skinning `accent` is the whole point of a
theme and is correct. Where `#F5C542` is drawn as a genuine *yellow tier chip*
(`chip_palette` tier `"yellow"`, line 659), it comes from `COLORS["neutral"]` and is
untouched. Step 6 below proves this distinction held.

### Constraint 2 — contrast is COMPUTED, never eyeballed

Every text/background pair each draft introduces gets a computed WCAG contrast ratio. You do
**not** do this maths yourself and you do **not** judge whether anything "looks OK" — Step 5
gives you a complete script that computes it, and this brief predicts its exact output.

**Formula (implemented for you in the Step 5 script):** WCAG 2.x sRGB relative luminance —
each channel `c/255`, then `c/12.92` if `c <= 0.03928` else `((c+0.055)/1.055) ** 2.4`,
combined as `0.2126*R + 0.7152*G + 0.0722*B`; contrast ratio
`(L_lighter + 0.05) / (L_darker + 0.05)`, rounded to 2 decimal places.

**Thresholds.** The repo does not document a general chrome-contrast standard. The nearest
thing is `product/LAYOUT.md:341`, which sets `WCAG >= 7:1 for text on the dark ground` — but
that is scoped to *tier hues on the night ground* and is itself marked `[ASSUMPTION]`, so it
does not govern these light draft palettes. This brief therefore uses the **WCAG AA**
standard the parent task specified: **4.5:1 for normal text, 3.0:1 for large text and UI
components.** These are cited in the generated report.

Two gates, both implemented in the Step 5 script:

- **Gate A — the pairs each draft introduces.** Absolute WCAG AA thresholds. Must all PASS.
- **Gate B — the inherited verdict pairs.** These are colours the drafts do *not* own, drawn
  on top of the drafts' new backgrounds. Judging them against an absolute threshold would be
  dishonest (the shipped day theme fails several of them today — that is the family the open
  B-149 contrast bug belongs to, and fixing it is app work, not this task). The correct test
  is **non-regression**: each draft's ratio must be **>= the day theme's ratio for the same
  pair, minus a 0.10 tolerance**. This is exactly the guarantee that matters — the new pastel
  grounds must not make the existing contrast situation *worse*.

### Constraint 3 — neutral framing

Nathan's phrasing mentioned girls and children as the inspiration. **Nothing you generate
may say that.** The three drafts are labelled only `pink`, `lightblue`, `green` — as themes
anyone picks. Every string you write below already complies. Do not add any other wording.

## The three draft palettes — fixed values, do not alter any of them

`accentText` is identical in all three and identical to the day theme. That is deliberate
(Constraint 1).

| token | day (existing, for reference) | pink | lightblue | green |
|---|---|---|---|---|
| `bg` | `#FAF7EE` | `#FDF2F6` | `#EFF6FC` | `#F0F7F0` |
| `card` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` |
| `cardBorder` | `#E0D9C4` | `#EBCFD9` | `#C9DCEC` | `#C8DEC8` |
| `text` | `#201F24` | `#241A1E` | `#16202B` | `#17231A` |
| `textDim` | `#8A8577` | `#6E5C63` | `#5A6B78` | `#5A6B5E` |
| `text2` | `#6D6759` | `#5E4E55` | `#47535E` | `#46564A` |
| `accent` | `#F5C542` | `#C2185B` | `#0B5FA5` | `#1B6E3C` |
| `accentText` | `#B98A0A` | `#B98A0A` (inherited) | `#B98A0A` (inherited) | `#B98A0A` (inherited) |
| `onAccent` | `#17171b` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` |
| `raceBg` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` |
| `raceCard` | `#F5F1E6` | `#FCEDF3` | `#E8F2FA` | `#E9F3EA` |
| `raceBorder` | `#E4DECB` | `#EBCFD9` | `#C9DCEC` | `#C8DEC8` |

## How the existing pipeline works (verified — background, no action needed)

- `design/make_screens.py` `main()` (**line 1651**) loops `for screen in IMPLEMENTED` (9
  screens, line 113) x `for theme_name in ("day", "night")` (**line 1664** — a hard-coded
  tuple, not a loop over `THEMES`), writes `f"{screen}_{theme_name}.svg"` (**line 1666**)
  into `design/canonical/` (**line 1655**), and writes **nowhere else**.
- Every SVG passes `validate()` (**line 1594**) before anything is written. That validator
  rejects any `fill`/`stroke` hex not found by `load_allowed_colors()` (**line 134**), which
  scans `app/src/ui/theme.ts`, `chips.tsx`, `settings.tsx` and `routeMapView.tsx`. **The new
  draft hexes are not in those app files** (correct — no app code is being changed), so the
  draft generator below passes `validate()` an allow-set explicitly widened by the draft
  palettes' own twelve hexes. Nothing else about validation is relaxed.
- Only **one** place in the whole script branches on the theme *name* string: **line 869**
  in `build_settings` (`1 if theme_name == "day" else 0` for the Appearance segmented
  control), plus `draw_theme_pill` at **line 598**. The draft generator therefore calls the
  builders with the literal name `"day"` while temporarily swapping the *contents* of
  `THEMES["day"]`, restoring the original immediately afterwards in a `finally`. Every
  screen therefore renders as a correct day-mode screen with new chrome — which is what a
  draft is. (Consequence: the Settings screen in each draft shows "day" selected in the
  Appearance control. That is correct and expected, not a bug.)
- The planning pass confirmed in-memory that rebuilding all 18 canonical SVGs at HEAD
  reproduces the files on disk **byte-for-byte** (18 checked, 0 mismatches). So Step 4's
  regeneration is a genuine no-op, and Step 7's checksum comparison is a real test.
- Nothing anywhere in the repo globs `design/canonical/*.svg` or `design/*.svg` — the
  planning pass checked `demos/` and `scripts/`. A new `design/drafts/` folder therefore
  cannot be accidentally picked up by other tooling. `.gitignore` does not cover it either,
  so the coordinator will see and commit the new files normally.

## The `design/edited/` round-trip — what it actually is, and what you CAN and CANNOT prove

Verified from the two places that define it:

- `process/CONVENTIONS.md` **line 155**: *"Design round-trip check, at cycle start: diff
  `design/edited/` against `design/canonical/` … Nathan's edits in `edited/` are never
  overwritten by this check — it only reads."*
- `design/README.md`: Nathan opens a file from `canonical/` in Inkscape, edits it, saves it
  into `design/edited/` **under the same filename**, and *"Your file in `edited/` is never
  overwritten by this process."* `canonical/` is a build output; `edited/` is his.

So the mechanism is **precedence by separation**: the generator only ever writes
`canonical/` (line 1655), the cycle-start check only ever *reads* `edited/`, and therefore a
file in `edited/` is structurally safe. `design/edited/` currently contains exactly one file,
the placeholder `PUT-EDITED-SVGS-HERE.txt` — **no SVG has ever gone through this loop.**

**What you CANNOT do, and must not pretend to have done:** no agent in this pipeline can open
Inkscape. The genuine GUI half of the round-trip — Inkscape parsing the SVG, Nathan moving
things, Inkscape's own re-serialisation (which typically injects `sodipodi:namedview` and
`<metadata>`, rewrites attributes into `style="…"`, reorders attributes and rounds
coordinates), and the `id`/`inkscape:label` scheme surviving all that in the Objects panel —
**cannot be exercised or verified here at all.**

**What Step 6 therefore does, and what it is honestly worth:** it writes a *simulated*
hand-edit — the kind of change `design/README.md` says the loop is for, namely *"If you
change a colour in Inkscape, that's a real proposed colour change"* — into
`design/edited/record_armed_draft-pink.svg`, records its checksum, re-runs **both**
generators, and proves the checksum is unchanged. **That proves the no-clobber / precedence
rule and generator determinism, and nothing more.** When you report, you must state this
limitation in exactly these terms:

> Round-trip: **verified precedence rule only** — a hand-edited file placed in
> `design/edited/` survives regeneration of both `canonical/` and `drafts/` byte-identically.
> The full GUI round-trip (Inkscape open / edit / re-save fidelity) **remains genuinely
> unverified** until Nathan does it by hand.

Do not soften, expand, or drop that sentence.

---

# EXECUTION — run these steps in order, one `device_bash` call each

Paste each block verbatim as the whole `command`. Use `timeout_ms: 45000` every time.

## STEP 1 — record the baseline checksums

```
cd "$HOME/mnt/Qualifire/design/canonical" && export LC_ALL=C && ls *.svg | wc -l && sha256sum *.svg | sha256sum
```

**Expect exactly:**

```
18
788374d77a453a25d18b14363acc911a373eec9524e8ad28a8c2d38ea8bd9c80  -
```

If either line differs, **STOP** — the canonical set is not at the state this brief was
planned against, and nothing below is safe. Report both lines verbatim.

## STEP 2 — create `design/draft_palettes.py`

```
cat > "$HOME/mnt/Qualifire/design/draft_palettes.py" <<'PALEOF'
"""Draft chrome palettes for the cycle-025 palette draft pass.

DRAFT ONLY. These are mockup token sets for Nathan to look at; they are not an app
setting, not a theme switcher, and not referenced by any app code.

Key structure is identical to make_screens.THEMES["day"] / ["night"] (same twelve keys),
so the existing screen builders consume them unchanged.

Constraint (D-030): a theme recolours CHROME only. The scoring verdict colours live in
make_screens.COLORS and are never touched here. `accentText` is listed in
INHERITED_FROM_DAY because make_screens.chip_palette() (line 646) uses it as the text
colour of the "neutral" VERDICT tier as well as for chrome accents -- so it must stay
identical to the day theme in every palette. make_draft_screens.py asserts this.
"""

INHERITED_FROM_DAY = ("accentText",)

DRAFT_THEMES = {
    "pink": {
        "bg": "#FDF2F6", "card": "#FFFFFF", "cardBorder": "#EBCFD9",
        "text": "#241A1E", "textDim": "#6E5C63", "text2": "#5E4E55",
        "accent": "#C2185B", "accentText": "#B98A0A", "onAccent": "#FFFFFF",
        "raceBg": "#FFFFFF", "raceCard": "#FCEDF3", "raceBorder": "#EBCFD9",
    },
    "lightblue": {
        "bg": "#EFF6FC", "card": "#FFFFFF", "cardBorder": "#C9DCEC",
        "text": "#16202B", "textDim": "#5A6B78", "text2": "#47535E",
        "accent": "#0B5FA5", "accentText": "#B98A0A", "onAccent": "#FFFFFF",
        "raceBg": "#FFFFFF", "raceCard": "#E8F2FA", "raceBorder": "#C9DCEC",
    },
    "green": {
        "bg": "#F0F7F0", "card": "#FFFFFF", "cardBorder": "#C8DEC8",
        "text": "#17231A", "textDim": "#5A6B5E", "text2": "#46564A",
        "accent": "#1B6E3C", "accentText": "#B98A0A", "onAccent": "#FFFFFF",
        "raceBg": "#FFFFFF", "raceCard": "#E9F3EA", "raceBorder": "#C8DEC8",
    },
}
PALEOF
timeout 40 python3 -c "import sys; sys.path.insert(0,'$HOME/mnt/Qualifire/design'); import draft_palettes as p; print('palettes:', sorted(p.DRAFT_THEMES)); print('keys per palette:', sorted({len(v) for v in p.DRAFT_THEMES.values()})); print('inherited:', p.INHERITED_FROM_DAY)"
```

**Expect exactly:**

```
palettes: ['green', 'lightblue', 'pink']
keys per palette: [12]
inherited: ('accentText',)
```

## STEP 3 — create `design/make_draft_screens.py`

```
cat > "$HOME/mnt/Qualifire/design/make_draft_screens.py" <<'GENEOF'
#!/usr/bin/env python3
"""Render the cycle-025 DRAFT chrome palettes to design/drafts/.

Does NOT touch make_screens.py and does NOT write design/canonical/ or design/edited/.
Each draft is rendered as a day-mode screen (the builders' only theme-name branches --
make_screens.py lines 598 and 869 -- must see "day") with THEMES["day"] temporarily
swapped for the draft's tokens and restored immediately afterwards.

Output: design/drafts/<screen>_draft-<palette>.svg  (9 screens x 3 palettes = 27)
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import make_screens as ms
from draft_palettes import DRAFT_THEMES, INHERITED_FROM_DAY

README = """# design/drafts/ -- DRAFT palette mockups, NOT canonical

These SVGs are an exploration for Nathan to look at. They are **not** ship-ready, they are
**not** what the app renders, and no app code refers to them. The canonical mockups -- the
ones that mirror what actually ships -- remain the 18 files in `design/canonical/`.

Generated by `design/make_draft_screens.py` from the token sets in
`design/draft_palettes.py`. Regenerate with:

    cd design && python3 make_draft_screens.py

Three chrome palettes: **pink**, **lightblue**, **green**. Each is rendered as a day-mode
screen, so the Settings screen's Appearance control shows "day" selected in all three --
that is correct, not a bug.

A theme here recolours **chrome only** -- backgrounds, cards, borders, text, buttons, the
route line. The scoring **verdict** colours (purple career-best, green, yellow, the no-data
grey, the rider dot, the map casing) are the app's vocabulary and render identically in
every palette. `accentText` is inherited unchanged from the day theme because the neutral
verdict tier is drawn with it.

`CONTRAST.md` in this folder carries the computed WCAG contrast ratios for every pair, from
`design/check_draft_contrast.py`. Nothing here was eyeballed.
"""


def main() -> int:
    repo_root = os.path.normpath(os.path.join(HERE, ".."))
    out_dir = os.path.join(HERE, "drafts")
    base_allowed = ms.load_allowed_colors(repo_root)
    original_day = dict(ms.THEMES["day"])

    # Guard rails: key parity with the real theme dict, and the verdict-inherited tokens.
    for name, tok in DRAFT_THEMES.items():
        if set(tok) != set(original_day):
            print(f"FATAL: palette {name} key set differs from THEMES['day']", file=sys.stderr)
            return 2
        for k in INHERITED_FROM_DAY:
            if tok[k] != original_day[k]:
                print(f"FATAL: palette {name} overrides inherited verdict token {k!r} "
                      f"({tok[k]} != {original_day[k]})", file=sys.stderr)
                return 2

    all_errors: list[str] = []
    to_write: list[tuple[str, str]] = []
    for name, tok in DRAFT_THEMES.items():
        allowed = set(base_allowed) | {ms._normalize_hex(v) for v in tok.values()}
        ms.THEMES["day"] = dict(tok)
        try:
            for screen in ms.IMPLEMENTED:
                svg_root = ms.BUILDERS[screen]("day", repo_root)
                fname = f"{screen}_draft-{name}.svg"
                errs = ms.validate(svg_root, fname, allowed)
                if errs:
                    all_errors.extend(errs)
                    continue
                to_write.append((fname, ms.serialize(svg_root)))
        finally:
            ms.THEMES["day"] = dict(original_day)

    if all_errors:
        print("VALIDATION FAILED:", file=sys.stderr)
        for e in all_errors:
            print("  " + e, file=sys.stderr)
        return 1

    os.makedirs(out_dir, exist_ok=True)
    for fname, content in to_write:
        with open(os.path.join(out_dir, fname), "w", encoding="utf-8") as f:
            f.write(content)
    with open(os.path.join(out_dir, "README.md"), "w", encoding="utf-8") as f:
        f.write(README)

    print(f"Wrote {len(to_write)} draft SVGs + README.md to {out_dir}")
    for fname in sorted(f for f, _ in to_write):
        print("  " + fname)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
GENEOF
echo "written"
```

**Expect exactly:**

```
written
```

## STEP 4 — create `design/check_draft_contrast.py`

```
cat > "$HOME/mnt/Qualifire/design/check_draft_contrast.py" <<'CHKEOF'
#!/usr/bin/env python3
"""Computed WCAG contrast report for the cycle-025 draft palettes.

Writes design/drafts/CONTRAST.md and prints a three-line summary.

Gate A -- the text/background and UI pairs each draft INTRODUCES, judged against absolute
WCAG AA thresholds (4.5:1 normal text, 3.0:1 large text / UI components).

Gate B -- the pairs each draft INHERITS but redraws on its own ground: the fixed verdict
colours from make_screens.COLORS, plus accentText. These are not the drafts' to change, and
the shipped day theme already fails several of them absolutely (the family the open B-149
contrast bug belongs to; fixing that is app work, out of scope here). The honest test is
non-regression: each draft ratio must be >= the day theme's ratio for the same pair, minus
a 0.10 tolerance.
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import make_screens as ms
from draft_palettes import DRAFT_THEMES

DAY = ms.THEMES["day"]
TOL = 0.10


def _lin(c: float) -> float:
    c = c / 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def lum(h: str) -> float:
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(x * 2 for x in h)
    return (0.2126 * _lin(int(h[0:2], 16))
            + 0.7152 * _lin(int(h[2:4], 16))
            + 0.0722 * _lin(int(h[4:6], 16)))


def ratio(a: str, b: str) -> float:
    la, lb = lum(a), lum(b)
    hi, lo = (la, lb) if la >= lb else (lb, la)
    return round((hi + 0.05) / (lo + 0.05), 2)


CHROME = [
    ("text", "bg", 4.5), ("text", "card", 4.5), ("text", "raceBg", 4.5),
    ("text", "raceCard", 4.5), ("text2", "bg", 4.5), ("text2", "card", 4.5),
    ("textDim", "bg", 4.5), ("textDim", "card", 4.5), ("onAccent", "accent", 4.5),
    ("accent", "bg", 3.0), ("accent", "card", 3.0),
]
VERDICT_HEX = {
    "purple": ms.COLORS["purple"],
    "tierGreen": ms.COLORS["green"],
    "tierYellow": ms.COLORS["neutral"],
    "noData": ms.COLORS["grey"],
}


def main() -> int:
    out_dir = os.path.join(HERE, "drafts")
    os.makedirs(out_dir, exist_ok=True)
    lines: list[str] = []
    a_pass = a_tot = b_ok = b_tot = 0

    lines.append("# Draft palette contrast report")
    lines.append("")
    lines.append("Formula: WCAG 2.x relative luminance (sRGB, gamma 2.4, coefficients")
    lines.append("0.2126/0.7152/0.0722) and contrast ratio (L_hi+0.05)/(L_lo+0.05), rounded to 2 dp.")
    lines.append("Gate A thresholds: 4.5:1 normal text, 3.0:1 UI component / large text (WCAG AA).")
    lines.append("")

    for name in ("pink", "lightblue", "green"):
        T = DRAFT_THEMES[name]
        lines.append("## " + name)
        lines.append("")
        lines.append("### Gate A - chrome pairs this draft introduces (must all PASS)")
        lines.append("")
        lines.append("| foreground | background | ratio | threshold | result |")
        lines.append("|---|---|---:|---:|---|")
        for fg, bg, thr in CHROME:
            r = ratio(T[fg], T[bg])
            a_tot += 1
            ok = r >= thr
            a_pass += 1 if ok else 0
            lines.append(f"| {fg} `{T[fg]}` | {bg} `{T[bg]}` | {r:.2f} | {thr:.1f} | "
                         f"{'PASS' if ok else 'FAIL'} |")
        lines.append("")
        lines.append("### Gate B - inherited verdict pairs (must be NOT-WORSE than day, tol 0.10)")
        lines.append("")
        lines.append("| foreground | background | draft | day | result |")
        lines.append("|---|---|---:|---:|---|")
        pairs = [("accentText", g) for g in ("bg", "card")]
        for v in VERDICT_HEX:
            for g in ("bg", "card", "raceCard"):
                pairs.append((v, g))
        for fg, g in pairs:
            hx = T[fg] if fg in T else VERDICT_HEX[fg]
            dr = ratio(hx, DAY[g])
            fr = ratio(hx, T[g])
            b_tot += 1
            ok = fr >= dr - TOL
            b_ok += 1 if ok else 0
            lines.append(f"| {fg} `{hx}` | {g} | {fr:.2f} | {dr:.2f} | "
                         f"{'NOT-WORSE' if ok else 'REGRESSED'} |")
        lines.append("")

    overall = "PASS" if (a_pass == a_tot and b_ok == b_tot) else "FAIL"
    lines.append(f"GATE A: {a_pass}/{a_tot} PASS")
    lines.append(f"GATE B: {b_ok}/{b_tot} NOT-WORSE")
    lines.append(f"OVERALL: {overall}")

    with open(os.path.join(out_dir, "CONTRAST.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"GATE A: {a_pass}/{a_tot} PASS")
    print(f"GATE B: {b_ok}/{b_tot} NOT-WORSE")
    print(f"OVERALL: {overall}")
    return 0 if overall == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
CHKEOF
echo "written"
```

**Expect exactly:**

```
written
```

## STEP 5 — generate the 27 draft SVGs

```
cd "$HOME/mnt/Qualifire/design" && timeout 40 python3 make_draft_screens.py
```

**Expect:** a first line beginning `Wrote 27 draft SVGs + README.md to ` (the absolute path
after it will be your machine's path — that part is not predicted), then exactly these 27
indented filenames, in exactly this order:

```
  demo_draft-green.svg
  demo_draft-lightblue.svg
  demo_draft-pink.svg
  record_armed_draft-green.svg
  record_armed_draft-lightblue.svg
  record_armed_draft-pink.svg
  record_finished_draft-green.svg
  record_finished_draft-lightblue.svg
  record_finished_draft-pink.svg
  record_running_draft-green.svg
  record_running_draft-lightblue.svg
  record_running_draft-pink.svg
  record_setup_draft-green.svg
  record_setup_draft-lightblue.svg
  record_setup_draft-pink.svg
  result_draft-green.svg
  result_draft-lightblue.svg
  result_draft-pink.svg
  rides_draft-green.svg
  rides_draft-lightblue.svg
  rides_draft-pink.svg
  routes_draft-green.svg
  routes_draft-lightblue.svg
  routes_draft-pink.svg
  settings_draft-green.svg
  settings_draft-lightblue.svg
  settings_draft-pink.svg
```

Exit code must be 0. If you see `VALIDATION FAILED` or `FATAL:`, **STOP** and report every
line verbatim — do not attempt to widen the allow-list or change a colour.

Then confirm the bytes match what the planning pass measured:

```
cd "$HOME/mnt/Qualifire/design/drafts" && export LC_ALL=C && ls *.svg | wc -l && sha256sum *.svg | sha256sum
```

**Expect exactly:**

```
27
aa25b0dbcf5eb232c9e68d640931a6153b41d38ca6d9f7c9fc6c2e1944022a54  -
```

## STEP 6 — compute the contrast report

```
cd "$HOME/mnt/Qualifire/design" && timeout 40 python3 check_draft_contrast.py
```

**Expect exactly (all three lines, exit code 0):**

```
GATE A: 33/33 PASS
GATE B: 42/42 NOT-WORSE
OVERALL: PASS
```

Any other numbers, any `FAIL`, or any `REGRESSED` row: **STOP** and report the full
`design/drafts/CONTRAST.md` verbatim.

Now spot-check three specific rows the planning pass computed by hand, to confirm the maths
matches:

```
cd "$HOME/mnt/Qualifire/design/drafts" && grep -n "onAccent \`#FFFFFF\` | accent" CONTRAST.md && grep -n "textDim" CONTRAST.md | head -6
```

**Expect exactly these nine lines (line numbers as shown):**

```
21:| onAccent `#FFFFFF` | accent `#C2185B` | 5.87 | 4.5 | PASS |
58:| onAccent `#FFFFFF` | accent `#0B5FA5` | 6.57 | 4.5 | PASS |
95:| onAccent `#FFFFFF` | accent `#1B6E3C` | 6.28 | 4.5 | PASS |
19:| textDim `#6E5C63` | bg `#FDF2F6` | 5.69 | 4.5 | PASS |
20:| textDim `#6E5C63` | card `#FFFFFF` | 6.22 | 4.5 | PASS |
56:| textDim `#5A6B78` | bg `#EFF6FC` | 5.06 | 4.5 | PASS |
57:| textDim `#5A6B78` | card `#FFFFFF` | 5.51 | 4.5 | PASS |
93:| textDim `#5A6B5E` | bg `#F0F7F0` | 5.21 | 4.5 | PASS |
94:| textDim `#5A6B5E` | card `#FFFFFF` | 5.68 | 4.5 | PASS |
```

(For your report: the tightest Gate A margin across all three drafts is
`textDim #5A6B78 on bg #EFF6FC = 5.06` in **lightblue**, against a 4.5 threshold. The
tightest Gate B margin is `noData #6f6e6a on bg`, which drops from the day theme's 4.76 to
4.67 in pink — a 0.09 drop, inside the 0.10 tolerance.)

## STEP 7 — prove the verdict colours are byte-for-byte identical across every palette

This is the machine check for Constraint 1: for each of the 9 screens, the number of times
each fixed verdict colour appears must be **identical** in `canonical/<screen>_day.svg` and
in all three `drafts/<screen>_draft-*.svg`.

```
cd "$HOME/mnt/Qualifire/design" && timeout 40 python3 - <<'PYEOF'
import os
HERE = os.path.dirname(os.path.abspath("make_screens.py"))
CAN, DR = os.path.join(HERE, "canonical"), os.path.join(HERE, "drafts")
SCREENS = ["routes", "settings", "demo", "record_setup", "record_armed",
           "record_running", "record_finished", "rides", "result"]
PALETTES = ["pink", "lightblue", "green"]
FIXED = {"purple": "#A667F0", "purpleInk": "#120521", "tierGreen": "#3ED598",
         "amber": "#E8A33D", "noData": "#6f6e6a", "riderBlue": "#2F7DE1",
         "casing": "#14120C", "accentText": "#B98A0A"}
def counts(p):
    t = open(p, encoding="utf-8").read().lower()
    return {k: t.count(v.lower()) for k, v in FIXED.items()}
checked = bad = 0
for s in SCREENS:
    d = counts(os.path.join(CAN, s + "_day.svg"))
    for pal in PALETTES:
        f = counts(os.path.join(DR, f"{s}_draft-{pal}.svg"))
        checked += 1
        if d != f:
            bad += 1
            print("MISMATCH", s, pal, {k: (d[k], f[k]) for k in FIXED if d[k] != f[k]})
print(f"verdict-parity checks: {checked}  mismatches: {bad}")
print("RESULT:", "PASS" if bad == 0 else "FAIL")
PYEOF
```

**Expect exactly:**

```
verdict-parity checks: 27  mismatches: 0
RESULT: PASS
```

Any `MISMATCH` line: **STOP** and report it verbatim.

(Note for your report, not an action: `#F5C542` is deliberately **not** in the parity set
above, because it is both the yellow tier colour *and* the day theme's chrome `accent`. It
correctly disappears from the drafts wherever it was chrome, and correctly survives wherever
it is a yellow tier chip — e.g. `record_finished` keeps 3 occurrences and `rides` keeps 2 in
draft-pink, down from 5 and 7 in canonical day.)

## STEP 8 — regenerate the canonical 18 and prove they are byte-identical

```
cd "$HOME/mnt/Qualifire/design" && timeout 40 python3 make_screens.py | head -1
```

**Expect** a single line beginning `Wrote 18 SVGs to ` (absolute path not predicted).

```
cd "$HOME/mnt/Qualifire/design/canonical" && export LC_ALL=C && ls *.svg | wc -l && sha256sum *.svg | sha256sum
```

**Expect exactly** (identical to STEP 1 — this is the acceptance criterion "the existing 18
canonical SVGs stay byte-identical"):

```
18
788374d77a453a25d18b14363acc911a373eec9524e8ad28a8c2d38ea8bd9c80  -
```

If this hash differs from STEP 1, **STOP IMMEDIATELY** and report both hashes. Do not try to
restore anything; the coordinator will.

## STEP 9 — the `design/edited/` no-clobber proof (simulated hand-edit)

Read the section "The `design/edited/` round-trip" above before running this, so you report
its limits correctly.

```
cd "$HOME/mnt/Qualifire/design" && timeout 40 python3 - <<'PYEOF'
import hashlib, os
HERE = os.path.dirname(os.path.abspath("make_screens.py"))
src = os.path.join(HERE, "drafts", "record_armed_draft-pink.svg")
dst = os.path.join(HERE, "edited", "record_armed_draft-pink.svg")
MARK = "<!-- hand-edit (simulated Inkscape re-save), cycle 025 palette draft pass -->\n"
t = open(src, encoding="utf-8").read()
assert t.startswith('<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n'), "unexpected header"
n = t.count("#C2185B")
t2 = t.replace('standalone="no"?>\n', 'standalone="no"?>\n' + MARK, 1).replace("#C2185B", "#D81B60")
open(dst, "w", encoding="utf-8").write(t2)
print("accent swaps applied:", n)
print("edited bytes:", len(t2.encode("utf-8")))
print("edited sha256:", hashlib.sha256(t2.encode("utf-8")).hexdigest())
PYEOF
```

**Expect exactly:**

```
accent swaps applied: 7
edited bytes: 10626
edited sha256: 0086c7c5b9b97a830c39b22893651ea02562ab06b61847c0d5436ce9f430684e
```

The simulated edit is exactly what `design/README.md` says the loop is for: a proposed
colour change (the pink accent `#C2185B` nudged to `#D81B60`, 7 occurrences) plus a leading
XML comment standing in for the marker an Inkscape re-save leaves behind.

Now re-run **both** generators and prove nothing was clobbered:

```
cd "$HOME/mnt/Qualifire/design" && timeout 40 python3 make_screens.py > /dev/null && timeout 40 python3 make_draft_screens.py > /dev/null && export LC_ALL=C && echo -n "canonical: " && (cd canonical && sha256sum *.svg | sha256sum) && echo -n "drafts:    " && (cd drafts && sha256sum *.svg | sha256sum) && echo -n "edited:    " && sha256sum edited/record_armed_draft-pink.svg && ls edited/
```

**Expect exactly:**

```
canonical: 788374d77a453a25d18b14363acc911a373eec9524e8ad28a8c2d38ea8bd9c80  -
drafts:    aa25b0dbcf5eb232c9e68d640931a6153b41d38ca6d9f7c9fc6c2e1944022a54  -
edited:    0086c7c5b9b97a830c39b22893651ea02562ab06b61847c0d5436ce9f430684e  edited/record_armed_draft-pink.svg
PUT-EDITED-SVGS-HERE.txt
record_armed_draft-pink.svg
```

All three hashes unchanged from Steps 1/5/9 = the no-clobber rule holds and both generators
are deterministic.

## STEP 10 — final inventory

```
cd "$HOME/mnt/Qualifire" && export LC_ALL=C && ls design/ && echo "--- drafts ---" && ls design/drafts/ | wc -l && echo "--- git ---" && timeout 40 git status --porcelain -- design/ | sort
```

**Expect** `ls design/` to list exactly:

```
ChatGPT attempt at improved design
README.md
__pycache__
canonical
check_draft_contrast.py
draft_palettes.py
drafts
edited
make_draft_screens.py
make_screens.py
```

**Expect** `--- drafts ---` to be followed by `29` (27 SVGs + `README.md` + `CONTRAST.md`).

**Expect** the git section to be exactly these six lines (sorted):

```
?? design/__pycache__/
?? design/check_draft_contrast.py
?? design/draft_palettes.py
?? design/drafts/
?? design/edited/record_armed_draft-pink.svg
?? design/make_draft_screens.py
```

(`design/__pycache__/` sorts first. It is Python's own bytecode cache,
created by importing `make_screens`; the planning pass already caused it to exist and it
cannot be removed from this mount. Flag it to the coordinator as a possible `.gitignore`
addition; do **not** try to delete it.)

`design/canonical/` and `design/make_screens.py` must **not** appear in that list. If either
does, **STOP** and report.

---

## Must-not-change list — byte-identical at the end of your pass

Proven by STEP 8 and STEP 9:

- All 18 files in `design/canonical/` — aggregate sha256 of `sha256sum *.svg`
  must remain `788374d77a453a25d18b14363acc911a373eec9524e8ad28a8c2d38ea8bd9c80`.
- `design/make_screens.py` — not edited at all. It must not appear in `git status`.
- `design/README.md`, `design/edited/PUT-EDITED-SVGS-HERE.txt` — not edited.
- Everything under `app/`, `product/`, `process/`, `demos/`, `scripts/`, `data/` — not
  touched by any step in this brief.

## Complete list of files you create (33 new files, 0 modified)

| path | what |
|---|---|
| `design/draft_palettes.py` | the three draft token sets |
| `design/make_draft_screens.py` | draft renderer (writes only `design/drafts/`) |
| `design/check_draft_contrast.py` | WCAG contrast computation + report writer |
| `design/drafts/README.md` | written by the generator; says these are drafts, not canonical |
| `design/drafts/CONTRAST.md` | written by the checker; Gate A + Gate B tables |
| `design/drafts/<screen>_draft-<palette>.svg` | 27 mockups (9 screens x 3 palettes) |
| `design/edited/record_armed_draft-pink.svg` | the simulated hand-edit for the no-clobber proof |

The `drafts/` directory plus the `_draft-<palette>` filename suffix are both deliberate: a
new folder that no existing tooling globs, and a filename no one can mistake for a canonical
screen. Nothing outside `design/drafts/` reads these files.

## Report back to the coordinator

Report, in this order:

1. **Every command's output matched the brief: YES / NO.** If NO, stop at the first
   mismatch and paste the command, the predicted output and the actual output verbatim.
2. The three contrast summary lines from STEP 6.
3. The STEP 7 verdict-parity line (`27 checks, 0 mismatches`).
4. The three hashes from the end of STEP 9.
5. This sentence, verbatim, unchanged:

   > Round-trip: **verified precedence rule only** — a hand-edited file placed in
   > `design/edited/` survives regeneration of both `canonical/` and `drafts/`
   > byte-identically. The full GUI round-trip (Inkscape open / edit / re-save fidelity)
   > **remains genuinely unverified** until Nathan does it by hand.

6. These three notes for the coordinator (informational, no action from you):
   - **`design/__pycache__/` is untracked** and cannot be deleted from this mount; consider
     a `.gitignore` line.
   - **The `edited/` filename convention has a gap for drafts.** `process/CONVENTIONS.md`
     line 155 and `design/README.md` both define the cycle-start check as *diff `edited/`
     against `canonical/`*. A file named `record_armed_draft-pink.svg` in `edited/` has no
     counterpart in `canonical/` — it belongs to `drafts/`. The check needs either a second
     comparison directory or a rule for draft filenames. That is a convention decision, not
     an executor decision.
   - **`accentText` is shared between chrome and the neutral verdict tier**
     (`make_screens.py` line 657). This brief resolved it by freezing `accentText` at the
     day value in all three drafts. If more themes follow, the clean fix is to split that
     one token into a chrome token and a verdict token in `chips.tsx` / `make_screens.py` —
     app work, out of scope here, worth raising alongside the D-030 clarifying amendment the
     WP mentions.
