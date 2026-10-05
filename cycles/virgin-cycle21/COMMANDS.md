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
3. **Interrupted ride (optional):** during a picked ride, force-stop Qualifire (Android Settings > Apps >
   Qualifire > Force stop) after > 1 min of riding. Reopen the app: the RECORD button's sub-label flashes
   "Interrupted · saved as free activity"; ACTIVITIES shows the ride up to the force-stop, filed as a free
   activity, no times; delete it there if you want. Under ~30 s of riding nothing is kept. A plain
   swipe-away may keep recording (the process can stay alive): if the ride is still running when you
   reopen, the picked way's line must be on the map.
4. Anything odd: write it in `cycles\virgin-cycle21\PROGRESS.md` (create it).
