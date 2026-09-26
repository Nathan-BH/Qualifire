> 2026-09-26: some paths below moved in the studio-folders restructure — see
../24_studio-folders-restructure/README.md, section "Path map".

# Cycle 11 — open items for Nathan

## Done (2026-09-16, after Nathan ran the render himself)

Nathan ran `render.ps1 -Name colours -Render`. Moving steps completed directly:

- Output `colours_2026-09-17_00-01-35.mp4` (1,668,377 bytes) confirmed via
  `ffprobe`: **19.000s, 1920x1080, 30fps** — exact match to plan.
- Copied to `colours\rounds\v4\colours_v4.mp4` and `all-renders\colours_v4.mp4`.
- Superseded `all-renders\colours_v3.mp4` moved (not deleted) to
  `Qualifire\_to_delete\colours_v3_superseded_by_v4.mp4`.
- `colours\README.md` v4 row and `colours\rounds\v4\FEEDBACK.md` updated
  from "not yet rendered" to rendered/verified.

## Two things worth a look on the actual render (not fixed pre-emptively — judgment calls)

- The "avg" label sits just outside the card's right edge (was inside the card
  in v3, where there was empty width to spare — the real row content now fills
  that space). Should look intentional, not like clipping. If it reads wrong,
  it's a one-line CSS nudge.
- The dashed avg line pokes ~10px past the card's right border before the "avg"
  label. Same possible fix if it looks like a glitch rather than a pointer.

## Leave feedback

`colours\rounds\v4\FEEDBACK.md` has a "What to check" list and a placeholder
for your notes.

## Carried over from cycle 10 (still true, not re-verified this cycle)

- Teaser assembly (`teaser\rounds\v8\concat.txt`) still doesn't include
  `colours/` at all — unrelated to this cycle, flagged again in case it's
  relevant when you next touch the teaser.
- No with-sound version of colours exists yet for v3 or v4 — a soundtrack pass
  is its own follow-up.
- `colours\README.md`'s v2 row still says "not rendered yet" despite a v2 mp4
  existing on disk — pre-existing, cosmetic, still not fixed.
