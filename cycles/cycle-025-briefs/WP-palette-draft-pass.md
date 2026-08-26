# WP — Palette draft pass: pink / light-blue / green theme mockups via make_screens.py (cycle 025)

**Status: PROPOSAL ONLY — UNBUILT. Design-folder work only; no app code is touched by this
WP.** Prepared 2026-08-25 from the notes4 review (`Nathan/Nathan's_notes4_review.md` §6,
lines 98–108, and summary line 118), which confirmed nothing in the backlog covers it and
that the infrastructure for exactly this landed in cycle 024 (WP-J).

**Confidence:** HIGH — the `design/` folder generates all 18 screen mockups (9 screens ×
day+night) from one script, `design/make_screens.py`, driven by theme tokens. A new palette =
a new token set = 9 more SVGs per palette, generated, not hand-drawn. **Size: SMALL** (a
Designer job). Bonus value: reviewing the drafts in Inkscape can be the occasion that proves
the still-unproven `design/edited/` round-trip loop Nathan asked for in notes2 (review
line 100).

## The ask, in Nathan's words (2026-08-25, notes4)

> "Lets also think about expanding my two standard night/day palettes to other colours to fit
> a diverse clientele. Make some drafts of what pink/light blue/green layouts would look like
> for girls or children?"

## Deliverable

Three draft token sets — pink, light blue, green — each rendered through
`design/make_screens.py` to the standard 9 screens (day variant at minimum; day+night if the
token structure makes it free), placed in `design/` as clearly-labelled DRAFT palettes for
Nathan's eye. No app code, no theme switcher — drafts to look at, nothing more.

## Three constraints the drafts MUST respect (review lines 104–106)

1. **The verdict colours are not a theme.** D-030 settled the palette as *not a setting*; the
   tier language — purple = career-best, green, yellow — is the app's vocabulary and must
   mean the same thing in every skin. A theme recolours the **chrome** (backgrounds, accents,
   buttons, route line), never the verdicts. If themes proliferate, D-030 deserves a one-line
   clarifying amendment ("chrome themes are free; the verdict palette is fixed") rather than
   silent erosion — flag that to the Team Principal; this WP does not edit DECISIONS.md.
2. **Contrast is checked, not eyeballed.** B-149 (pale purple text on a bare background) is a
   real open app bug that exists precisely because low-contrast pastels bite, and
   light-pastel themes are the highest-risk contrast territory there is. Every draft ships
   with computed contrast ratios for its text/background pairs.
3. **Framing:** present these in any copy as *themes anyone picks*, not "for girls / for
   children" — design with those audiences in mind, label neutrally (review line 106,
   Nathan may take or leave).

## Acceptance sketch

- Token sets live beside the existing day/night sets; `make_screens.py` regenerates the
  canonical SVGs unchanged (existing 18 byte-stable) plus the new draft sets.
- Contrast table included with each draft.
- At least one draft SVG goes through the `design/edited/` Inkscape round-trip and survives
  regeneration — closing the loop notes2 asked for and no cycle has yet exercised.

## NEEDS-NATHAN

None blocking — the review's verdict is "small, concrete, ready to brief as-is". Open only:
which drafts (if any) graduate from `design/` mockups to an in-app theme option, which is a
later, separate decision (and would then interact with D-030's amendment above).

## Already tracked — cite, don't duplicate

- Cycle 024 WP-J — the `design/` folder + `make_screens.py` + `design/edited/` round-trip
  convention (`process/CONVENTIONS.md`).
- D-030 — verdict palette is not a setting.
- B-149 (OPEN) — the live contrast bug; this WP does not fix it (it's app code), but drafts
  must not reproduce its class of error in new palettes.
- Notes2's Inkscape round-trip ask — still unproven; this WP doubles as its first real test.

## What this document is not

Not an app-code change, not a theme-switcher feature, not a D-030 amendment, not a backlog
edit — an explicitly UNBUILT proposal per `process/CYCLE.md`.
