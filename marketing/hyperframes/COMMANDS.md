# COMMANDS.md — copy-paste PowerShell for HyperFrames

Quick reference so you don't have to remember flags. Run these from a PowerShell window
on your PC (not the cloud sandbox — HyperFrames needs npm/Node, which only works here).

## One-time thing you'll hit

Windows blocks local `.ps1` scripts by default. `render.ps1` needs this bypass — it only
affects the one command you run it with, nothing permanent:

```powershell
powershell -ExecutionPolicy Bypass -File .\render.ps1
```

(If you'd rather not type that every time: run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
once, and afterwards plain `.\render.ps1` works on its own.)

## Any composition — teaser, gate, purple, tour

`render.ps1` takes a `-Name` parameter, so every composition uses the same pattern:

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\hyperframes"

# Live preview in your browser (opens automatically, reloads on every save)
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gate

# Render to MP4 (lands in <name>\renders\)
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gate -Render
```

Same pattern for `-Name purple` and `-Name tour`. `-Name teaser`, or omitting `-Name`
entirely (it defaults to `teaser`), still works exactly as before:

```powershell
powershell -ExecutionPolicy Bypass -File .\render.ps1              # preview teaser
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Render       # render teaser
```

## The three product scenes (start-ride, gates-saving, ranking)

They draw on a real map. One-time step first — capture the basemap (needs internet, ~1 min;
full instructions in `_map\README.md`): double-click `_map\map-capture.html`, wait for
**READY**, click **Download map.png**, then copy it into the three folders:

```powershell
$src = "$env:USERPROFILE\Downloads\map.png"
$hf  = "C:\Users\natha\Claude personal projects\Qualifire\marketing\hyperframes"
foreach ($c in 'start-ride','gates-saving','ranking') { Copy-Item $src (Join-Path $hf "$c\map.png") -Force }
```

Then preview / render as usual:

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\hyperframes"
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name start-ride              # preview
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name start-ride -Render      # render
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gates-saving -Render
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name ranking -Render
```

If a preview shows the route on plain black, `map.png` is missing from that folder (or wasn't
served) — `npx hyperframes check` inside the folder will name the missing media. Copy the
finished MP4s to `<scene>\rounds\v2\<scene>_v2.mp4` for review.

## Scaffolding a brand-new composition folder

Only needed once per new idea (run from `marketing/hyperframes/`, not inside an existing
composition folder):

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\hyperframes"
npx hyperframes init <name>
```

## Fallback: running HyperFrames directly

`render.ps1` covers every composition now, so this shouldn't be needed — but if the
wrapper ever breaks, you can still run HyperFrames directly from inside any
composition's own folder (no bypass needed for `npx`):

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\hyperframes\<folder-name>"
npx hyperframes preview     # live preview
npx hyperframes render      # render to MP4
```

## Before experimenting in Studio: checkpoint, then diff or discard

Studio autosaves straight into a composition's `index.html`. So a good habit before you
click around in there: commit a checkpoint first, so you can always see exactly what you
changed afterward — and throw it away cleanly if you don't like it.

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\hyperframes"
powershell -ExecutionPolicy Bypass -File .\checkpoint.ps1
```

Then open Studio and experiment as much as you want. When you're done:

```powershell
git diff marketing              # see exactly what changed, line by line
git checkout -- marketing       # DISCARD it — back to the checkpoint
git add marketing; git commit -m "..."   # KEEP it — a normal commit, once you're happy
```

`checkout` and `commit` go in opposite directions — `checkout` throws the changes away,
`commit` keeps them. Only run `checkout` when you're sure you don't want what's there.

## Why double-clicking `index.html` doesn't work

Opening a composition's `index.html` directly in a browser (double-click, or
`file://...`) will not animate — it needs the HyperFrames dev server running behind
it (loads GSAP, checks the timeline contract, live-reloads). Always go through
`npx hyperframes preview` (or `render.ps1` with no flag) instead; that's what opens
a working browser preview at `http://localhost:3002`.
