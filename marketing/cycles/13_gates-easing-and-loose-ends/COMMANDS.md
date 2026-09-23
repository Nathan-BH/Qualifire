# COMMANDS.md — cycle 13: what to type on your PC

Every copy-paste command this cycle needs lives here, in one place (Nathan, cycle 08:
"keep all the commands in the cycle folder so it stays in one place"). The evergreen
night cheat-sheet is still `marketing/silent-studio/COMMANDS.md`; nothing from this
cycle is added there.

Unless a `cd` says otherwise, run everything from a PowerShell window on your PC in
`C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio`. The
`-ExecutionPolicy Bypass` prefix is the same one-time story as in
`silent-studio/COMMANDS.md` ("One-time thing you'll hit").

Status of each section, 2026-09-20: §1 is carried-over housekeeping that can run now;
§2 and §3 are **placeholders** — their briefs are written but not executed, so there is
nothing to render yet. Do not run §2/§3 until the cycle README says the brief landed.

## 1. Carried over from earlier cycles — not new to this cycle

### 1a. `all-renders/` is one round behind on gates-saving (both sides)

`silent-studio\all-renders\gates-saving_v6.mp4` and
`audio-studio\all-renders\gates-saving_v6_with_sound_v3.mp4` are still the cycle-9 pick;
the current pick since cycle 12 is v7 silent + the v8 mux. Per
`silent-studio/structure.md`, both folders track the same "current" set and must move
together. Nothing is deleted — superseded files go to `Qualifire\_to_delete\` like
cycle 11 did with `colours_v3`.

```powershell
$q = "C:\Users\natha\Claude personal projects\Qualifire"
# silent side
Copy-Item "$q\marketing\silent-studio\gates-saving\rounds\v7\gates-saving_v7.mp4" "$q\marketing\silent-studio\all-renders\gates-saving_v7.mp4"
Move-Item "$q\marketing\silent-studio\all-renders\gates-saving_v6.mp4" "$q\_to_delete\all-renders_gates-saving_v6_superseded_by_v7.mp4"
# with-sound side
Copy-Item "$q\marketing\audio-studio\gates-saving\soundv8\gates-saving_v7_with_sound_v8.mp4" "$q\marketing\audio-studio\all-renders\gates-saving_v7_with_sound_v8.mp4"
Move-Item "$q\marketing\audio-studio\all-renders\gates-saving_v6_with_sound_v3.mp4" "$q\_to_delete\all-renders_gates-saving_v6_with_sound_v3_superseded.mp4"
Get-ChildItem "$q\marketing\silent-studio\all-renders", "$q\marketing\audio-studio\all-renders" | Select-Object Name, Length
```

Expect exactly one `gates-saving_*` file in each listing afterwards (v7 / v7_with_sound_v8).
If §2 below runs later and produces a v8, repeat this with v7 → v8 (and v8 mux).

### 1b. start-ride v4 and brandmark/opening v3 — NO render needed (Digest correction)

The Digest for this cycle reported these two renders as still owed, going by their
FEEDBACK.md status lines ("not rendered yet — device_bash was unreachable this
session"). On disk both exist from 2026-09-10 and are already in both `all-renders\`
folders — so the *lines* are stale, not the renders. That fix is Claude's (two lines,
no brief; see `questionsfornathan.md` "Informational"). Nothing for you to render.

If you want to confirm the files are the real rounds (planned 14.000 s and 6.500 s):

```powershell
ffprobe -v error -show_entries format=duration -of csv=p=0 .\start-ride\rounds\v4\start-ride_v4.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 .\brandmark\opening\rounds\v3\opening_v3.mp4
```

Their "Nathan's feedback" sections are still empty — see Q2 in `questionsfornathan.md`.

## 2. gates-saving v8 — PLACEHOLDER until `BRIEF-gates-warp-easing.md` is executed

Once the brief has landed (the cycle README's table will say "executed" and
`gates-saving\rounds\v8\FEEDBACK.md` will exist), render the night round as usual:

```powershell
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gates-saving -Render
```

Then file it as round v8 and confirm the duration is unchanged (planned 12.300 s — the
easing changes *how* the rider moves between gates, not when the ride starts or ends):

```powershell
$new = Get-ChildItem .\gates-saving\renders\*.mp4 | Where-Object { $_.Name -notlike '*_day.mp4' } | Sort-Object LastWriteTime | Select-Object -Last 1
Copy-Item $new.FullName .\gates-saving\rounds\v8\gates-saving_v8.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 .\gates-saving\rounds\v8\gates-saving_v8.mp4
```

Gate-time check — the whole point of the brief is that these three frames must look
*identical* to v7's (dot exactly on the gate tick), while the frames between them move
smoothly. Extract the same three frames round 7 checked:

```powershell
foreach ($t in '5.32','7.18','9.05') { ffmpeg -y -v error -ss $t -i .\gates-saving\rounds\v8\gates-saving_v8.mp4 -frames:v 1 ".\gates-saving\rounds\v8\frame_$($t.Replace('.','_'))s.png" }
```

Sound: the soundtrack is unchanged (anchors identical, so `soundtrack_v8.wav` still
lines up). Mux the new silent onto the existing v8 audio, same line as every other
round, and file it next to the v7 mux:

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\audio-studio\gates-saving\soundv8"
ffmpeg -y -i "..\..\..\silent-studio\gates-saving\rounds\v8\gates-saving_v8.mp4" -i soundtrack_v8.wav -c:v copy -c:a aac -b:a 192k -shortest gates-saving_v8_with_sound_v8.mp4
```

Then repeat §1a with v7 → v8 on both sides. Leave feedback in
`gates-saving\rounds\v8\FEEDBACK.md` — specifically whether the run-in to gate 1 now
reads as a glide rather than a jolt, which is Q1.

## 3. colours v5 — PLACEHOLDER until `BRIEF-colours-cosmetic-polish.md` is executed

Once the brief has landed (`colours\rounds\v5\FEEDBACK.md` will exist):

```powershell
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name colours -Render
$new = Get-ChildItem .\colours\renders\*.mp4 | Where-Object { $_.Name -notlike '*_day.mp4' } | Sort-Object LastWriteTime | Select-Object -Last 1
Copy-Item $new.FullName .\colours\rounds\v5\colours_v5.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 .\colours\rounds\v5\colours_v5.mp4
```

Planned duration is unchanged: 19.000 s. The avg line and label fade in at 2.2 s and
are fully visible by 3.4 s, so one frame is enough to judge the two fixes:

```powershell
ffmpeg -y -v error -ss 4.0 -i .\colours\rounds\v5\colours_v5.mp4 -frames:v 1 .\colours\rounds\v5\frame_4_0s.png
```

What to look for on that frame: the dashed line ends flush with the inside of the card's
right border (not past it), and "avg" sits on the line, left of the time column, with
the dashes broken around it. Then `all-renders\colours_v4.mp4` → v5 with the v4 file
moved to `_to_delete\colours_v4_superseded_by_v5.mp4` (same pattern as §1a; colours has
no with-sound v4, so only the silent side moves). Feedback: `colours\rounds\v5\FEEDBACK.md`.

## 4. Leave feedback

Each new round's `FEEDBACK.md` has a "Nathan's feedback" section at the bottom; the
questions that would change what gets built next are in `questionsfornathan.md` here.
