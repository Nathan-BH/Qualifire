# COMMANDS.md — copy-paste PowerShell for HyperFrames

> Rewritten 2026-09-26 (marketing cycle 24) for the teaser-full-only layout; previous version archived at
../archive/pre-teaser-full-studios/silent-studio/COMMANDS.md.

## Preview / render the teaser

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
powershell -ExecutionPolicy Bypass -File ".\render.ps1" -Name teaser-full
```

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
powershell -ExecutionPolicy Bypass -File ".\render.ps1" -Name teaser-full -Render
```

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
powershell -ExecutionPolicy Bypass -File ".\render.ps1" -Name teaser-full -Theme day -Render
```

The MP4 lands in `teaser-full\renders\`. Copy it to `all-renders\` afterward:

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
Copy-Item -Path ".\teaser-full\renders\<the file render.ps1 printed>.mp4" -Destination ".\all-renders\teaser-full_vN.mp4"
```

(Replace `<...>` and `N` by hand; never overwrite an existing version.)

## Preview one scene on its own

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
powershell -ExecutionPolicy Bypass -File ".\render.ps1" -Name scenes\start-ride
```

## The three product scenes (start-ride, gates-saving, ranking)

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
$src = "$env:USERPROFILE\Downloads\map.png"
$hf  = "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
foreach ($c in 'scenes\start-ride','scenes\gates-saving','scenes\ranking','teaser-full') { Copy-Item $src (Join-Path $hf "$c\map.png") -Force }
```

(`teaser-full` is included because its `map.png` was confirmed byte-identical to the three scenes' during
the cycle-24 restructure.)

## Scaffolding a brand-new composition folder

Only needed once per new idea (run from `marketing/silent-studio/`, not inside an existing composition folder):

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
npx.cmd hyperframes init <name>
```

## Fallback: running HyperFrames directly

`render.ps1` covers `teaser-full` and every `scenes\<scene>` now, so this shouldn't be needed — but if the
wrapper ever breaks, you can still run HyperFrames directly from inside the composition's own folder
(no bypass needed for `npx.cmd`):

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio\teaser-full"
npx.cmd hyperframes preview
```

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio\teaser-full"
npx.cmd hyperframes render
```

## Before experimenting in Studio: checkpoint, then diff or discard

Studio autosaves straight into a composition's `index.html`. So a good habit before you click around in
there: commit a checkpoint first, so you can always see exactly what you changed afterward — and throw it
away cleanly if you don't like it.

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
powershell -ExecutionPolicy Bypass -File ".\checkpoint.ps1"
```

Then open Studio and experiment as much as you want. When you're done, `git diff`/`git checkout --`/`git commit`
as usual (see the archived COMMANDS.md for the exact commands) — `checkout` throws changes away, `commit`
keeps them.

Building the compositions (`teaser-full/compositions/*.html`) is not a PowerShell command:
`build_teaser_full.py` is a Claude-side tool (its ROOT is the VM path), run by Claude, not from
PowerShell.
