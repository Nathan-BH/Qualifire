# COMMANDS.md — cycle 17: the one thing Nathan runs himself

Everything else in this cycle runs from the chat (file copies, ffmpeg concats and muxes, docs,
the alignment-tool restyle). HyperFrames cannot run from the chat's shell on your PC (the npm
registry refuses the package there and it has no Chrome), so the **gates-saving render** is
yours. One command, about a minute.

## 1. Render gates-saving v9 (after the chat says "index.html edited, checks pass")

Open PowerShell, then:

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gates-saving -Render
```

The MP4 lands in `marketing\silent-studio\gates-saving\renders\` with a timestamp name. Do not
rename or copy it — reply "rendered" in the chat and the executor picks it up (it checks it
is 369 frames / 12.300 s, files it as `gates-saving\rounds\v9\gates-saving_v9.mp4`, swaps
`all-renders\`, measures the rider's speed on every frame, and only then re-cuts the teaser
and the ride and re-muxes the sound).

Optional, to watch it live before rendering (opens a browser tab; close it with Ctrl+C in
the PowerShell window when done):

```powershell
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gates-saving
```

## 2. What to look at afterwards (no commands)

- `marketing\silent-studio\gates-saving\rounds\v9\gates-saving_v9.mp4` — the rider should now
  be slowest exactly on each gate tick (5.81 / 7.65 / 9.51 s) and fastest halfway between.
- `marketing\silent-studio\ride\rounds\v1\ride_v1.mp4` — both rides, silent, 26.3 s.
- `marketing\audio-studio\ride\soundv3\ride_v1_with_sound_v3.mp4` — the same with the Tunetank
  soundtrack (unchanged from cycle 16).
- `marketing\audio-studio\tools\av-align\av-align.html` — double-click; the ride preset now
  expects `ride_v1.mp4` (pick it from `marketing\silent-studio\all-renders\`).

## 3. Committing

Nothing in this cycle is committed by an agent. When you are happy:

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire"
git add marketing
git commit -m "marketing cycle017: silent versions in silent-studio, gate easing inverted, av-align UI"
```

(`_to_delete\` is where every replaced or withdrawn file went — nothing was deleted. The
folder is git-ignored, so it never enters a commit; the files stay on disk until you clear
them yourself.)
