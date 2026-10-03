# scripts/legacy/ -- old build scripts, history only

Moved here 2026-10-03 (virgin-cycle19 brief 03). The current native build is
`scripts/build8.ps1` (double-click `scripts/build8.cmd`); it runs the engine
`scripts/build4.ps1`, which stays in `scripts/`.

**Do not run these. They are not runnable from here.** build5, build6 and build7
call `build4.ps1` from their own folder (`Join-Path $PSScriptRoot 'build4.ps1'`),
and it is not in this folder: they would run their own first checks (build6 and
build7 even `npm install`) and then stop with "build4.ps1 is not recognized".
build4 itself has changed since they last ran (its route-PNG section is gone).
build3 belongs to a version of the app that no longer exists.

| File | What it was |
|---|---|
| `build3-prepare.ps1`, `build3-build.ps1` | Build 3 (2026-08): a preview APK that froze stale JS -- the failed build that led to the dev client and builds 4+. |
| `build5.ps1`, `build5.cmd` | Build 5 (2026-08-19): the first standalone "Qualifire Preview" APK (wrapper over build4). |
| `build6.ps1`, `build6.cmd` | Build 6: added the OTA updater (expo-updates, fingerprint runtime policy). |
| `build7.ps1`, `build7.cmd` | Build 7 (2026-09-08; re-run 2026-09-30 for the cycle-18 native modules): blank seed + fingerprint re-anchor. |

Each script's own header comment tells its full story; `git log --follow` keeps the history.
