# COMMANDS.md — cycle 14: what to type on your PC

Every copy-paste command this cycle needs lives here, in one place (Nathan, cycle 08).
The evergreen night cheat-sheet is still `marketing/silent-studio/COMMANDS.md`.

**Status 2026-09-20 (third Plan pass): nothing to run yet — the three briefs are finalised and ready to execute, not yet executed.**
Everything below is a placeholder that becomes live only when the cycle README's table
says the brief landed. The audio-side work (Salamander renderer, the ride master, the
muxes) runs in Claude's shell on this PC, not by you; your steps are the gates-saving
render, the frame checks, and the `all-renders/` housekeeping.

Unless a `cd` says otherwise, run from a PowerShell window in
`C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio`.

## 1. Nothing now

There is no check worth your time before the briefs land. (Claude already verified
today that the 29 Salamander mp3s decode, that python3/numpy/ffmpeg are present in
its shell on this PC, and the mix gains/offsets, E5 timing, and route geometry the
briefs assert — see the Inspect note in each brief for exactly what was checked.)

## 2. gates-saving v8 — PLACEHOLDER until `BRIEF-gates-surge-pacing.md` is executed

The round is **v8** (cycle 13's easing brief is superseded, so v8 is free). Render as usual:

```powershell
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gates-saving -Render
$new = Get-ChildItem .\gates-saving\renders\*.mp4 | Where-Object { $_.Name -notlike '*_day.mp4' } | Sort-Object LastWriteTime | Select-Object -Last 1
Copy-Item $new.FullName .\gates-saving\rounds\v8\gates-saving_v8.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 .\gates-saving\rounds\v8\gates-saving_v8.mp4
```

Planned duration 12.300 s (unchanged). Frame checks — five frames, one per E5 pulse: the
rider dot just visible on the start line at 3.80, exactly on each gate tick at 5.81 / 7.65 /
9.51 (the middle one sits inside the hairpin — expected), and on the finish ring at 11.38;
plus one at 8.00 to see the caption ("your" upright, "self" italic):

```powershell
foreach ($t in '3.80','5.81','7.65','9.51','11.38','8.00') { ffmpeg -y -v error -ss $t -i .\gates-saving\rounds\v8\gates-saving_v8.mp4 -frames:v 1 ".\gates-saving\rounds\v8\frame_$($t.Replace('.','_'))s.png" }
```

Then tell Claude the render exists — the mux needs the ride master
(`BRIEF-ride-loop-track.md`), which is Claude's step, not a line here. **Do not mux
`soundtrack_v8.wav` onto this render** — its gate pulses are at the old times and
will be out of sync with the new gates.

## 3. ride v1 — PLACEHOLDER until `BRIEF-ride-loop-track.md` is executed

Claude builds `audio-studio\ride\soundv1\ride_v1.mp4` (26.3 s: start-ride v4 then
gates-saving v8, one continuous Salamander soundtrack) and the two per-scene muxes
(`start-ride\soundv8`, `gates-saving\soundv9`). Your only
step is watching it, and — if you want it in the teaser — saying so (that is a later
round of `audio-studio\teaser\`). To confirm it is the real thing:

```powershell
ffprobe -v error -show_entries format=duration -of csv=p=0 "..\audio-studio\ride\soundv1\ride_v1.mp4"
```

Expect 26.300000.

## 4. Housekeeping — after §2 exists

Cycle 13 `COMMANDS.md` §1a with v7 → v8 on the silent side; the with-sound side
(`gates-saving_v8_with_sound_v9.mp4`, `start-ride_v4_with_sound_v8.mp4`) is placed in
`audio-studio\all-renders\` by the ride brief itself. Nothing is
deleted — superseded files go to `Qualifire\_to_delete\` as before.

## 5. Leave feedback

`gates-saving\rounds\v8\FEEDBACK.md` (video), `audio-studio\ride\soundv1\FEEDBACK.md`
(the join, the loop coming round, the five pulses, the Salamander sound itself — there is
no separate A/B round). The seven questions are answered (`questionsfornathan.md`).
