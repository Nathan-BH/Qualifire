# virgin-cycle21 — COMMANDS.md (Nathan's copy-paste PowerShell)

Nothing here is ready to run yet: the briefs are written but NOT executed. Run these only after the
coordinator says briefs 01-03 are executed and Opus-inspected (tests green, tsc 0).

## 1. Cycle 21 is JavaScript-only — OTA, no new build
No native module, plugin or manifest is touched. But cycle 20 contains NATIVE changes (notification
look/body: build 8). If build 8 is not installed on the phone yet, build it first; the OTA below then
rides on top of it. If the publish script reports a fingerprint drift, stop and send me the output.

Build 8 (only if not yet installed; see `scripts\README.md` for what it does):
```
cd "C:\Users\natha\Claude personal projects\Qualifire"
powershell -ExecutionPolicy Bypass -File .\scripts\build8.ps1
```

Publish the JS (cycle 20 JS + cycle 21):
```
cd "C:\Users\natha\Claude personal projects\Qualifire"
powershell -ExecutionPolicy Bypass -File .\scripts\publish-preview.ps1
```

## 2. On-device checklist (two short rides are enough)
1. **Picked way:** pick a way on RECORD, press START. Its line, S1 and the selfs are there from START.
   Ride > 1 km on a street that a *different* way shares or splits from: the label and the line never
   change to another way. Blue dot is visible on top of the yellow line the whole time.
2. **Work -> New ride (no pick):** pick 'new' at one end, START. No yellow way line, no S-label, no
   selfs; only your own trail. After STOP the naming flow appears as for any new ride, and the ride is
   NOT filed under an existing way.
3. **Relaunch mid-ride (optional):** swipe the app away during a picked ride, reopen: the picked way is
   still the line on the map.
4. Anything odd: write it in `cycles\virgin-cycle21\PROGRESS.md` (create it).
