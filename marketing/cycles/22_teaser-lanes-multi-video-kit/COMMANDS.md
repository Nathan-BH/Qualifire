# Cycle 22 — copy-paste commands (Nathan's PC, PowerShell)

## Serve teaser-lanes (default kit auto-loads, header menu switches kits)
```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\audio-studio\tools\teaser-lanes"
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```
Opens `localhost:8765` in your default browser. Ctrl+C in the terminal stops the server.

## Rebuild the new kit (kit-teaser-full/, teaser-full v1, default)
```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\audio-studio\tools\teaser-lanes"
python prep_kit.py teaser-full_v1
```

## Rebuild the old kit (kit/, teaser v9)
```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\audio-studio\tools\teaser-lanes"
python prep_kit.py teaser_v9
```

## Open cycle 20's option A/B files on the new kit (in-tool, no command)
1. Open teaser-lanes.html (double-click or `serve.ps1`) and load `kit-teaser-full/`.
2. Click **Open arrangement** and choose
   `marketing\audio-studio\teaser\arrangements\arrangement_v1\rides-options\option-A-piano-then-bed.json`
   (or `option-B-piano-plus-stems.json`).
3. No "made for a different video" note should appear — both files were re-stamped for teaser-full this cycle; their
   clip timings were already re-cascaded for the new video's −0.3 s offset.
