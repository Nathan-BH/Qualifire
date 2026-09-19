# gates-saving — soundv8

**Audio only, for now:** `soundtrack_v8.wav` in this folder. No muxed render yet — this
round changes the SILENT video too (see below), which Claude cannot build here (needs
`npx hyperframes render`, and the network this session has can't reach npm — same wall
as the Salamander samples and the FluidSynth/Klangio downloads earlier). **Nathan needs
to run the render himself** — see "To finish this round" below.

**Previous round:** `../soundv7/FEEDBACK.md` — not superseded for being wrong, but for
direction: Nathan decided the synthesized E5 gate-chime shouldn't exist at all ("the
audio should be the real reference, there should be no extra sound for the gate
crossing").

## What changed

**Audio:** `soundtrack_v8.wav` = bass + the full real melody (both voices, untouched
timing) — literally `bass_only.wav` + `melody_only.wav`, same windowing as every round
since soundv5 (silent outside 4.4-11.7s, restarted from the theme's own beginning).
**No gate_chimes layer, no note triggered by anything in the video.** Checked with an
onset scan same as the soundv7 investigation: every attack in the file matches a real
note in the piece, nothing extra, nothing missing.

**Video:** `silent-studio/gates-saving/index.html` edited instead — Nathan's idea. The
three gates' positions along the route (`GATES = [0.24, 0.63, 0.84]`, real geography,
unchanged) stay put, but the rider's speed along the route is no longer constant. A new
`RIDE_WARP` curve paces the ride so gate1/2/3 are crossed exactly when the melody's own
E5 pulses land (content t=0.92/2.78/4.65s → video t=5.32/7.18/9.05s), instead of the old
evenly-spaced 6.46/9.15/10.60s. Total ride duration is unchanged (still 4.8-11.7s, 6.9s)
so nothing else on the timeline (captions, the finish hold) needed to move. The sector
recolour-on-crossing was also retimed to the same warped curve — it was reading off the
old uniform formula and would otherwise have painted a sector before/after the dot
visually got there.

**Heads up on the first leg:** hitting the first gate only 0.52s into the ride means
the rider covers the first 24% of the route at roughly 3x its old speed, then slows for
the rest. Haven't seen this rendered, so don't know if that reads as an exciting start
or a jarring one — flagging it now rather than after you've already watched it, since
speed-smoothing (a real easing curve instead of hard breaks at each gate) is a
follow-up if it looks off.

## To finish this round

1. `powershell -ExecutionPolicy Bypass -File .\\render.ps1 -Name gates-saving -Render`
   from `marketing\\silent-studio\\` (same "run this yourself, not through Cowork"
   situation as the Salamander samples — this needs npm, which neither of my shells can
   reach).
2. Send the rendered MP4 back (or drop it in
   `silent-studio\\gates-saving\\rounds\\v7\\`, next round number).
3. Tell Claude — muxing `soundtrack_v8.wav` onto it and building the FEEDBACK entry
   properly is one step once the render exists.

## Nathan's feedback
<!-- write your notes below -->
"1) the audio should be the real reference, there should be no extra sound for the
gates crossing, what we can do is just adapt the render. We can adapt the speed of the
moving dot so it just aligns with the melody!" — 2026-09-20, in response to the soundv7
near-collision finding.


## Update (2026-09-20) — rendered, muxed, verified. Current round.

Nathan ran the render. Silent video landed at
`../../../silent-studio/gates-saving/renders/gates-saving_2026-09-20_00-41-32.mp4`,
copied into that composition's own round history as
`../../../silent-studio/gates-saving/rounds/v7/gates-saving_v7.mp4` (12.3s, matches
soundtrack_v8.wav exactly, no trim needed).

Muxed the two together: **`gates-saving_v7_with_sound_v8.mp4`** in this folder --
that is the current pick for this scene.

**Verification done before calling it finished:**
- Extracted frames at the three target gate-crossing times (5.32s / 7.18s / 9.05s) --
  the rider dot sits exactly on each gate tick in all three, not drifted before or
  after.
- Re-ran the onset scan on `soundtrack_v8.wav`: detected attacks at 5.30 / 7.18 / 9.03s
  (technically only two of the three landed on-target: gate1 detector-reads 5.30 vs
  target 5.32, gate2 exact, gate3 9.03 vs 9.05 -- both within the ~20ms window the
  20ms-RMS detector resolves to, so effectively exact).
- Confirmed no gate_chimes layer / no synthesized note anywhere in the file -- every
  onset in the audio is a real note from the piece.

Full detail and the before/after gate-crossing-time table are in
`../../../silent-studio/gates-saving/rounds/v7/FEEDBACK.md` (the video-side round doc).

**Open item carried forward, not yet resolved:** the first ride leg (start to gate 1)
covers 24% of the route in 0.52s, ~3x the old pace, before slowing for the rest.
Confirmed via frame extraction that it looks correct per the design (dot is exactly on
the gate), but full-speed *feel* hasn't been watched yet. Flag if it reads as abrupt --
a real easing curve instead of hard per-gate breaks is the natural fix.
