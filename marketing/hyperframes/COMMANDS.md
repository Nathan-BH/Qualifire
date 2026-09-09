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

## Why double-clicking `index.html` doesn't work

Opening a composition's `index.html` directly in a browser (double-click, or
`file://...`) will not animate — it needs the HyperFrames dev server running behind
it (loads GSAP, checks the timeline contract, live-reloads). Always go through
`npx hyperframes preview` (or `render.ps1` with no flag) instead; that's what opens
a working browser preview at `http://localhost:3002`.
