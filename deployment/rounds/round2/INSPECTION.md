# INSPECTION -- deployment round 2, BRIEF-01

Date: 2026-10-06. Tier: Inspect (Opus, fresh context). Every check rerun independently; the
executor's EXECUTION.md was not trusted. No file other than this one was written.

## Check 1 -- tests + tsc: PASS
- `node --experimental-strip-types tests/run.ts` -> `848 tests: 845 pass, 0 fail, 3 skip`.
- `./node_modules/.bin/tsc --noEmit` -> exit 0.

## Check 2 -- app/eas.json: PASS (as specified) -- but see defect D1
- Valid JSON. `build.play` = `{"distribution":"store","channel":"play","autoIncrement":true,"android":{"buildType":"app-bundle"},"env":{"EXPO_PUBLIC_SEED_MODE":"empty"}}`: no `APP_VARIANT`, no `submit`.
- `git diff app/eas.json`: one hunk, only `},` after `virgin` plus the 6-line `play` block. development / preview / virgin byte-identical.

## Check 3 -- scripts/publish-play.ps1: PASS
- Byte-identical to BRIEF-01 §3.1 (programmatic extract and compare -> True). 237 lines, LF, no CR, ends `finally { Pop-Location }\n`.
- `diff publish-preview.ps1 publish-play.ps1`: hunks only at header 2-34, 70, 74, 90-91, 93-94, 143, 191, 196-198, 201, 207, 209, which is the §3.3 list. Nothing else differs.
- No leftover preview values: channel `play` in the step 5 command and the dry-run echo, `--environment production` in both, banner, step titles, fallback message and Done text all say Play. `APP_VARIANT` is never set (`Remove-Item Env:APP_VARIANT -ErrorAction SilentlyContinue`; `-ErrorAction` overrides the `Stop` preference, so a missing var is not fatal). No path publishes with `APP_VARIANT=preview`.
- JSON paths: `$eas.build.play.channel`, `.android.buildType`, `.env.APP_VARIANT` match eas.json. There is no StrictMode, so a missing `APP_VARIANT` property is `$null`, which is correct.
- Header usage lines use the full absolute bypass form. There is no `.\` invocation. Parameter block, Invoke-Native, preflight, git/message handling and login are unchanged from preview.
- Inherited, informational only: the header "Debugging" lines and the final Done hint show bare `npx eas-cli ...`. `scripts/OTA-TROUBLESHOOTING.md` notes that bare npx fails in PowerShell. publish-preview.ps1 has the same lines, and the brief asked for them.

## Check 4 -- fingerprint-risk claim: FAIL (defect D1)
- `git status`: `app/app.json` and `app/app.config.js` are unmodified. `app/fingerprint.config.js` is absent. No `.fingerprintignore`. (Other `app/src`, `app/tests` modifications are pre-existing cycle-21/22 work and JS-only.)
- **PLAN.md §3 (line 118, table line 123) says `@expo/fingerprint` "does not hash `eas.json`". That is false for the pinned version.** `app/node_modules/@expo/fingerprint` is 0.19.9. In `build/sourcer/Expo.js:200-209`, `getEasBuildSourcesAsync` adds `eas.json` and `.easignore` as whole-file sources (reason `easBuild`). `build/sourcer/Sourcer.js:32` calls this unconditionally. `eas.json` is not in `DEFAULT_IGNORE_PATHS` (`build/Options.js`), and nothing in the repo ignores it.
- Measured locally, network-free, read-only: `APP_VARIANT=preview EXPO_PUBLIC_SEED_MODE=empty node node_modules/@expo/fingerprint/bin/cli.js fingerprint:generate --platform android`
  - working-copy tree (with `play` block): hash `b64062a94297a8bd96da239e5fcf367140d05e5e`; source `eas.json` hash `00c4ec8d...` (= `sha1sum eas.json`).
  - same sources with only the eas.json hash swapped for `git show HEAD:app/eas.json | sha1sum` (`5c739cb4...`), final hash recomputed with the library's own algorithm (sha1 over id+hash; reproduces b640... exactly): `f52e438f6e11965500739e4371c4e020d8ec69e5`.
  - So **the eas.json edit by itself moves the `.preview` runtime version.**
- This repo has seen it before. `scripts/OTA-TROUBLESHOOTING.md` (Build 6 entry) says build 6 drifted partly because of "virgin's app.config.js / eas.json additions".
- Caveat: neither local hash equals build 7's `610cfe837448...`. The Linux VM sees the Windows-installed node_modules and environment, and those can differ from the PC or the EAS builder. So this check cannot tell whether build 7 is still reachable today. It does show that this round's edit changes the hash, whatever the baseline is.
- Confidence: high that the edit changes the fingerprint (code read plus measurement).
- How Nathan can verify on his PC, network-free (prints JSON; the top-level `"hash"` is the runtime version): run it once as the tree is now and once with only `app/eas.json` reverted:
  `powershell -ExecutionPolicy Bypass -Command "cd 'C:\Users\natha\Claude personal projects\Qualifire\app'; `$env:APP_VARIANT='preview'; `$env:EXPO_PUBLIC_SEED_MODE='empty'; node node_modules\@expo\fingerprint\bin\cli.js fingerprint:generate --platform android"`
  As far as I know, `eas fingerprint:compare <hash>` needs network (it fetches the build's stored fingerprint from EAS). It gives the authoritative comparison against 610cfe83.

## Check 5 -- docs: PASS
- `scripts/README.md`: new row sits directly after the publish-preview row, uses the same 2-column `| file | what |` format, and is factually right. The `build3 -> build8` claim in deployment/README holds: `scripts/build8.ps1` exists.
- CURRENT-STATE.md: date set to 2026-10-05; `play` row; the rewritten `.aab` paragraph; tooling row; EAS Free decision appended at the end of `## 8. Cost of the status quo`. deployment/README.md: round-2 paragraph, files row, lineage line. OPEN-ITEMS.md: one new bullet after the signing bullet. All consistent with reality: profile exists, script exists and has never run, fingerprint.config.js deferred, no `-Promote`. One sentence is now wrong: the deferred native-build list in OPEN-ITEMS and PLAN §4 never says the eas.json edit itself moves the fingerprint (D1).
- PowerShell forms: every `powershell` command in PLAN.md, BRIEF-01, EXECUTION.md, CURRENT-STATE/README/OPEN-ITEMS hunks and publish-play.ps1 uses the full-path bypass form. PLAN.md 79/189 mention `.\publish-preview.ps1` only as prose describing the old header. Informational: DIGEST.md lines 145-147 quote the preview header's relative `.\publish-preview.ps1` lines verbatim in a code block. It is a digest quote, not an instruction, and it was not in the brief's scope.

## Check 6 -- moved-file references: PASS
- No reference to `deployment/DEPLOYMENT-OPTIONS.md` or `deployment/QUESTIONS-FOR-NATHAN.md` remains in STATE.md, OPEN-ITEMS.md, or process/CONVENTIONS.md. CONVENTIONS 139/141 mention `cycles/*/QUESTIONS-FOR-NATHAN.md`, which is unrelated.
- Link scan of deployment/rounds/README.md, round1/*, round2/*, deployment/README.md, CURRENT-STATE.md: every reference to `review.md` / `questions-and-rulings.md` resolves. The unresolved hits are all intentional:
  - `roundN/` placeholders
  - the deferred `app/fingerprint.config.js`
  - historical stray `QUESTIONS-FOR-NATHAN2.md`
  - `build7.ps1`, which is now `scripts/legacy/build7.ps1`, in historical round-1 text
- `deployment/TOKEN-USAGE.md:38` names the old path in a historical log row. It is out of scope and acceptable.

## Defects (by severity)

1. **D1 -- CRITICAL: the `play` profile in `app/eas.json` moves the `.preview` fingerprint.**
   - `eas.json` is a hashed fingerprint source in @expo/fingerprint 0.19.9, and the eas.json edit alone changes the preview hash (measured: b640... vs f52e...).
   - PLAN.md §3's "cannot move the installed build's fingerprint" analysis is wrong.
   - Consequence: as long as this edit is in the working tree (committed or not), the next `publish-preview.ps1` run bundles for a runtime version that build 7 (610cfe83...) does not have. The OTA then silently never applies to the installed Preview.
   - Coordinator options, not decided here:
     - (a) Move the `play` block out of eas.json now and land it in the deferred native-build cycle, together with fingerprint.config.js. That cycle rebuilds anyway. Note that publish-play.ps1 step 0 then throws until the profile exists, which is acceptable and fail-safe.
     - (b) Keep it and accept that the next JS change needs a rebuild.
   - Either way, PLAN §3, the OPEN-ITEMS bullet and the CURRENT-STATE wording need correcting. Ignoring `eas.json` via fingerprint.config.js / `.fingerprintignore` also changes the hash, so it belongs to the native-build cycle too.
2. **D2 -- LOW (process): EXECUTION.md does not contain what brief §9 requires.** It should hold the full `diff` output of §3.2 and the verbatim status before/after diff. It only summarises them as hunk ranges. The contents were independently re-derived here and match.

Informational, not counted: inherited bare `npx eas-cli` hints in publish-play.ps1 (same as preview, per brief); DIGEST.md quotes relative-path lines verbatim.

VERDICT: FAIL (2 defects)
