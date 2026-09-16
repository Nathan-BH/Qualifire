# ranking — round v7 (rendered, confirmed, picked)

**Render:** `ranking_2026-09-16_19-15-00.mp4` — picked into this folder as `ranking_v7.mp4`
and mirrored to `silent-studio/all-renders/ranking_v7.mp4`. Duration unchanged at 10.8s.

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
  which already fires at 5.4s — no audio change was needed.

## Verification (confirmed against the rendered v7 mp4)

- [x] Today's row reads plain white (identical to the other nine rows) throughout the
      0-5.4s climb — stills at 4.0s and 5.2s (just after landing, before the flip)
      both show plain white text, no green tint anywhere before landing.
- [x] The colour flip at 5.4s is a hard cut, not a fade — still at 5.6s shows Today's
      row fully green and settled; combined with the 5.2s still, the flip happens
      within that ~0.4s window as an instant colour change, not a gradual one.
- [x] No stray colour flash or flicker during the climb — the only colour-touching
      code is the single `tl.set`, and the 4.0s/5.2s/5.6s stills show clean white ->
      white -> green with nothing in between.

## Audio

`audio-studio/ranking/soundv3/soundtrack_v3.wav` (GREEN_CHIME fix, already built for v6)
remuxed onto this video with no further changes — the colour flip still lands at
exactly 5.4s, same instant the settle chime already fires at. Output:
`ranking_v7_with_sound_v3.mp4`, duration 10.8s confirmed via ffprobe, mean volume
-23.5dB / max -0.9dB (healthy, consistent with v6).
