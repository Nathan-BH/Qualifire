# virgin-cycle19 — COMMANDS.md (Nathan's copy-paste PowerShell, measurement steps only)

Everything here is `measure.ps1` in this folder (so nothing needs hand-quoting — a bare
`powershell -Command "... $x ..."` pasted into a PowerShell window has its `$x` expanded by the
OUTER shell and silently breaks). Each run needs your PC (npx / eas-cli); each writes only under
`safe_to_delete\`. Paste the printed lines into `cycles\virgin-cycle19\PROGRESS.md` (create it) so
the numbers become facts the briefs can cite.

Repo: `C:\Users\natha\Claude personal projects\Qualifire`. App: `…\Qualifire\app`.

## §1 — Upload-archive size WITHOUT spending a build (before and after brief 02)

```
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\cycles\virgin-cycle19\measure.ps1" -Archive
```

Runs `eas build:inspect --stage archive` (the exact folder EAS would upload) into
`safe_to_delete\eas-archive-inspect`, prints its size and one line per top-level entry.
Expected before brief 02: ~1,100 MB, `.git` and `marketing` in the list (~3 min).
Expected after: ~10-20 MB, `app` only.

## §2 — Size and fingerprint of the LAST finished build (the real APK number)

```
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\cycles\virgin-cycle19\measure.ps1" -Apk
```

Prints build id, status, **fingerprint** (= the value for `scripts\OTA-TROUBLESHOOTING.md` —
the 2026-09-30 build-7 re-run has a new one nobody has read) and the APK size after
downloading it to `safe_to_delete\last-preview.apk`.

What is inside it (one row per folder; `lib\arm64-v8a`, `lib\armeabi-v7a`, `lib\x86`,
`lib\x86_64` answer brief 02 §5b, `assets\` shows whether the Leuven PNGs are in the APK):

```
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\cycles\virgin-cycle19\measure.ps1" -ApkContents
```

## §3 — Fingerprint of the tree as it is NOW (before AND after brief 01; after brief 02)

```
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\cycles\virgin-cycle19\measure.ps1" -Fingerprint
```

Same hash before and after a brief = that brief is OTA-able with `publish-preview.ps1`.
Different hash = it must ride a native build (`build8.ps1`). (If `expo-updates
fingerprint:generate` complains about the workflow, run it once by hand from `app\` with
` --workflow managed` appended.)

## §4 — Export inspection: is the Leuven seed in the bundle? (before and after brief 01)

```
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\cycles\virgin-cycle19\measure.ps1" -Export
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\cycles\virgin-cycle19\measure.ps1" -Export -Shipped
```

First line = the blank-seed bundle (what `publish-preview.ps1` and the preview build produce).
Expected BEFORE brief 01 (the 2026-09-29 export in `app\dist` already shows exactly this):
PNGs `Morning,EveningA,EveningB`; seed strings `home2work,seed:2026,WorkHomeDry`; three ~1.3 MB
assets; VERDICT "IS in the bundle". Expected AFTER: both lists empty, no asset over 500 KB,
bundle ~200 KB under 2,622,188 bytes, VERDICT "NOT in the bundle".
Second line = the shipped-seed bundle (dev mode); must print all three PNGs before AND after.

## §5 — Build 8 dry run (after brief 03)

```
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\build8.ps1" -DryRun
```

Expected: every section OK, section 6 "seed not in bundle" + bundle size, section 7 archive
estimate ~10-20 MB + `.easignore` present, verdict "safe to spend a build", then the
`eas-cli build` line it would run. The real build, only when a native change needs one:

```
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\build8.ps1"
```
