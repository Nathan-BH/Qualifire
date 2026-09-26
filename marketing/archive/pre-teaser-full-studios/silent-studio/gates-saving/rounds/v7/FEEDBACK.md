# 03 — Gates & Saving — Round v7

**Render file:** gates-saving_v7.mp4 (rendered 2026-09-20).
**Duration:** 12.300s (matches v6, no timeline shift).
**Source:** ../../index.html.

## What changed since v6

Not a visual redesign -- a retiming. Nathan's call (2026-09-20): drop the synthesized
E5 gate-chime from the audio entirely and instead make the *video* line up with the
real Interstellar melody's own beats. The three gates keep their real-geography
positions on the route (`GATES = [0.24, 0.63, 0.84]`, unchanged), but the rider no
longer moves at constant speed across the second ride. A new `RIDE_WARP` piecewise-
linear curve paces it so each gate is crossed exactly when the melody's own E5 pulse
lands:

| Gate | Route fraction | Old crossing (v6, uniform speed) | New crossing (v7, warped) | Target (melody E5 onset) |
|---|---|---|---|---|
| 1 | 0.24 | 6.46s | 5.32s | content t=0.92s |
| 2 | 0.63 | 9.15s | 7.18s | content t=2.78s |
| 3 | 0.84 | 10.60s | 9.05s | content t=4.65s |

Total ride duration is unchanged (still 4.8-11.7s, 6.9s), so nothing else on the
timeline (captions, the finish hold, the lead-in) needed to move.

**Secondary fix:** the sector-recolour-on-crossing effect (`GATES.forEach(...)` block)
was still reading off the old uniform-speed formula for its own trigger time. Left
alone, it would have painted each sector before or after the dot visually reached it
once the ride was warped. Retimed to use the same `warpTime()` curve as the rider.

## Verified

Extracted frames from the actual render at the three target times (5.32s / 7.18s /
9.05s) -- in all three, the rider dot sits exactly on the corresponding gate tick, not
before or after it. Cross-checked against an onset scan of `soundtrack_v8.wav`
(bass + real melody, no chime): detected onsets at 5.30 / 7.16 / 9.03s, matching the
design targets within the detector's ~20ms resolution. Video and audio agree.

## Things to watch
- The first leg (ride start to gate 1) now covers 24% of the route in just 0.52s --
  roughly 3x the old pace -- before the rider slows for the rest of the ride. Reads as
  a quick start in the frame check; worth a look at full speed in case it feels
  abrupt. A real easing curve (vs. the current hard piecewise-linear breaks at each
  gate) is the natural follow-up if so.
- Sector recolour: gate 1's sector turns green immediately on crossing (confirmed in
  the 5.32s frame). Later sectors use the existing tier-colour scheme from v6 --
  unchanged behavior, just now correctly timed.

## Render on the PC (PowerShell, from marketing\silent-studio\)
```
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gates-saving -Render
```
Done 2026-09-20 (`renders/gates-saving_2026-09-20_00-41-32.mp4`), copied here as
`gates-saving_v7.mp4`. Muxed with `soundtrack_v8.wav` (bass + real melody, no chime)
at `../../../audio-studio/gates-saving/soundv8/gates-saving_v7_with_sound_v8.mp4` --
that's the current pick for this scene.

## Nathan's feedback
<!-- write your notes below, overall or beat-by-beat -->
