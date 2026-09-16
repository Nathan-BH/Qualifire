# ranking — round v7 (not yet rendered)

**Source change:** `index.html` only, no render exists yet — this file documents what
to check once Nathan runs `render.ps1 -Name ranking -Render` on his PC.

## What changed since v6

Nathan: "Instead of having it come up the ranking already green. Lets have it come up
white, and become green only when it slots in the P2 position."

- Removed the static `.trow.today .who, .trow.today .time { color: #00D000; }` CSS rule
  (v6's fix for the P2-not-purple bug, but it coloured the row green from frame 0 —
  including during the whole climb, not just on arrival).
- Today's row now inherits the same white (`var(--ink)`) as every other row in the
  tower while it climbs.
- Added `tl.set('#trow-today .who, #trow-today .time', { color: '#00D000' }, CLIMB_T0 + CLIMB_DUR)`
  — an instant flip (not a fade), timed to the exact moment Today lands in slot 2
  (5.4s), matching the same "flip on completion, never progressive" rule the app's own
  sector strip uses. This also lines up exactly with the audio's green settle chime,
  which already fires at 5.4s — no audio change needed.

## Things to check once rendered

- [ ] Today's row reads plain white (identical to the other nine rows) throughout the
      0–5.4s climb — no green tint anywhere before landing.
- [ ] The colour flip at 5.4s is a hard cut, not a fade — should be visually
      simultaneous with the row settling into its final position.
- [ ] No stray colour flash or flicker during the climb (the only colour-touching
      code left is this one `tl.set`, so there shouldn't be, but worth a frame-by-frame
      glance around 5.3–5.5s).
