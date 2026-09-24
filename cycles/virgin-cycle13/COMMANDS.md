# virgin-cycle13 -- commands

Copy-paste commands for this cycle only. Run from the repo root unless noted.

## Rerun the checks this cycle relied on

Test suite:

```
cd app
node --experimental-strip-types tests/run.ts
```

Full type-check:

```
cd app
powershell -ExecutionPolicy Bypass -File .\node_modules\.bin\tsc.ps1 --noEmit
```

## Ship this change to the Preview APK (JS-only OTA, no rebuild needed)

This cycle only touched paint values in `app/src/ui/wayMapView.tsx` -- no native/config
change -- so it goes out over EAS Update, not a new numbered build.

```
cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
powershell -ExecutionPolicy Bypass -File .\publish-preview.ps1 -DryRun
```

Preflight only, publishes nothing -- confirms the working tree/build config look right.
Then the real publish:

```
cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
powershell -ExecutionPolicy Bypass -File .\publish-preview.ps1
```

Or just double-click `scripts\publish-preview.cmd` (double-click `publish-preview.cmd dry`
first if you want the dry run instead).

Commit first -- the script publishes whatever is in the working tree (this cycle's commit
already covers `wayMapView.tsx`). After it succeeds: open the Preview app on the phone with
network, close it fully, open it again -- EAS Update applies on the *second* launch after
a publish, not the first. That's normal, not staleness.

If the phone still shows the old dot sizes after two full relaunches, check for fingerprint
drift before assuming the publish failed:

```
cd "C:\Users\natha\Claude personal projects\Qualifire\app"
npx.cmd eas-cli update:list --branch preview
npx.cmd eas-cli fingerprint:compare <build6's fingerprint>
```
