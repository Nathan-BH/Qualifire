# BRIEF-01 -- `play` EAS profile + `publish-play.ps1` + docs (deployment round 2)

Tier: Execute (Sonnet). Plan: `PLAN.md`, same folder. Date: 2026-10-05.

## 0. Rules (binding)

- **Stop-on-ambiguity.** Every edit below quotes the exact current text you must find, with line
  numbers as of 2026-10-05. If a quoted anchor is not found verbatim at or near that line, or any
  instruction can be read two ways, **stop**, do nothing further, and report the mismatch
  verbatim (file, expected text, actual text). Never guess, never "fix forward", never decide a
  design question yourself.
- Repo: `C:\Users\natha\Claude personal projects\Qualifire`, mounted in `device_bash` at
  `$HOME/mnt/Qualifire`. Use absolute paths in every command.
- **Never delete anything** (no `rm`, no delete-permission request). Nothing in this brief needs
  a deletion.
- Git: prefix every git call with `GIT_OPTIONAL_LOCKS=0`. **No `git add`, no `git commit`.**
- **Do not run** `publish-play.ps1`, `eas`, `npx eas-cli`, or anything that reaches the network.
- Do **not** touch: `app/app.json`, `app/app.config.js`, `app/package.json`, anything under
  `app/src/`, `app/tests/`, `scripts/publish-preview.ps1`, `scripts/*.cmd`. Do **not** create
  `app/fingerprint.config.js`. No rider-facing string changes (nothing here is rider-facing).
- Every PowerShell command you write into any file for Nathan uses the full form
  `powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\<name>.ps1" ...`
  -- never `.\x.ps1`, never a relative path.
- Files are LF-terminated; keep them LF. Write files with `cat > path <<'EOF'` (quoted heredoc)
  or `python3` read-modify-write; never retype a file from truncated tool output.
- Finish by writing `deployment/rounds/round2/EXECUTION.md` (§8).

Files touched (exactly six, plus EXECUTION.md):
`app/eas.json` (edit), `scripts/publish-play.ps1` (new), `scripts/README.md` (edit),
`deployment/CURRENT-STATE.md` (edit), `deployment/README.md` (edit), `OPEN-ITEMS.md` (edit).

## 1. Baseline (before any edit)

```
cd "$HOME/mnt/Qualifire" && GIT_OPTIONAL_LOCKS=0 git status --porcelain > /tmp/status_before.txt; cat /tmp/status_before.txt
```
The tree is **already dirty** (cycle-22 files: `OPEN-ITEMS.md`, `STATE.md`, several `app/src/...`).
Keep this output; §7 compares against it. Note that `OPEN-ITEMS.md` is already modified -- your
edit there is additive on top of whatever is in the working copy (do not revert anything).

## 2. `app/eas.json`

Current file (23 lines, verify lines 16-23 verbatim):
```
    16	    "virgin": {
    17	      "distribution": "internal",
    18	      "channel": "virgin",
    19	      "android": { "buildType": "apk" },
    20	      "env": { "APP_VARIANT": "virgin", "EXPO_PUBLIC_SEED_MODE": "empty" }
    21	    }
    22	  }
    23	}
```
Replace the whole file with exactly:
```json
{
  "cli": { "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": { "buildType": "apk" },
      "env": { "APP_VARIANT": "preview", "EXPO_PUBLIC_SEED_MODE": "empty" }
    },
    "virgin": {
      "distribution": "internal",
      "channel": "virgin",
      "android": { "buildType": "apk" },
      "env": { "APP_VARIANT": "virgin", "EXPO_PUBLIC_SEED_MODE": "empty" }
    },
    "play": {
      "distribution": "store",
      "channel": "play",
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" },
      "env": { "EXPO_PUBLIC_SEED_MODE": "empty" }
    }
  }
}
```
Before replacing, confirm lines 1-15 of the current file equal lines 1-15 above (`diff` the
first 15 lines); on any difference, stop and report. The only change is the added `,` after the
`virgin` block's `}` on line 21 and the new `play` block. **No `APP_VARIANT` in `play.env`.
No `submit` section.**

Check: `cd "$HOME/mnt/Qualifire/app" && node -e "const e=require('./eas.json'); if(!e.build.play||e.build.play.channel!=='play'||e.build.play.android.buildType!=='app-bundle'||e.build.play.autoIncrement!==true||e.build.play.env.APP_VARIANT!==undefined||e.build.play.env.EXPO_PUBLIC_SEED_MODE!=='empty'||e.build.preview.channel!=='preview') throw new Error('eas.json play profile wrong'); console.log('eas.json OK')"`

## 3. `scripts/publish-play.ps1` (new file)

`scripts/publish-preview.ps1` is the model (212 lines, LF). Write `scripts/publish-play.ps1`
with **exactly** the content in §3.1, then verify with §3.2 that the differences against the
preview script are exactly the list in §3.3 and nothing else.

### 3.1 Full content

```powershell
<#
    Qualifire -- publish a JS-only OTA update to the GOOGLE PLAY line of the app
    (clean package com.nathanbonher.qualifire, display name "Qualifire") over
    EAS Update, channel "play". Added 2026-10-05 (deployment round 2). Every
    Play release -- internal track and closed track alike -- listens to this one
    channel, so one publish reaches every Play install at once.

    Until a build made with the eas.json "play" profile (an .aab) has been
    uploaded to a Play track, there is NO install for this to land on: the
    publish succeeds and nobody downloads it. That is harmless, just pointless.

        powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-play.ps1" -DryRun                  # preflight only, publishes nothing
        powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-play.ps1"                          # publish; message = last commit subject
        powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-play.ps1" -Message "what changed"  # publish with an explicit message

    (-ExecutionPolicy Bypass always; full path always.)

    What this does: bundles the CURRENT JS in app/ (npx expo export under the
    hood) and uploads it to EAS Update -- ~1-2 minutes, NO build slot spent.
    Phones download it on the next launch and APPLY it on the launch after
    that: open the app on network, close it fully, open it again. Two
    launches is normal EAS Update behaviour.

    Identity guard: the Play line is the BASE identity from app.json. The
    preview script sets APP_VARIANT=preview; this one REMOVES APP_VARIANT from
    the environment before bundling, because a stale APP_VARIANT in the shell
    would bundle under the .preview fingerprint and the Play build would
    silently ignore the update (scripts\OTA-TROUBLESHOOTING.md section 3).

    When this is NOT enough: any native-surface change (new/upgraded native
    dependency, app.json plugins/permissions/icon/package, SDK upgrade)
    changes the FINGERPRINT runtime version. An update published after such a
    change silently never applies to older builds -- fail-safe: the phone just
    keeps its current JS. The fix is a new "play" build (.aab) uploaded to
    Play, which then goes through Play review. Debugging:
        npx eas-cli update:list
        npx eas-cli fingerprint:compare

    Same source, two publishes: today the .preview app and the Play app have
    DIFFERENT fingerprints (app.config.js renames the preview), so a bundle
    tested on .preview cannot be promoted as-is; publish the same commit with
    publish-preview.ps1 first, test, then run this script. A -Promote mode
    (eas update:republish) is planned once app/fingerprint.config.js lands --
    see deployment/rounds/round2/PLAN.md.

    Commit first (same D-043 discipline as builds): this publishes whatever
    is in the working tree. The script warns on a dirty tree but proceeds.

    SDK 55+ requires --environment on eas update; EAS knows only the
    environments development / preview / production, so this script passes
    "production" (the store line). If eas-cli ever rejects that environment,
    report it back rather than hand-editing the flag.
#>
[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$SkipTests,
    [string]$Message = ''
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$app  = Join-Path $repo 'app'

function Say  ($m) { Write-Host "  $m" }
function Step ($m) { Write-Host "`n$m" -ForegroundColor Cyan }
function Ok   ($m) { Write-Host "  OK  $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  !!  $m" -ForegroundColor Yellow }
function Would($m) { Write-Host "  (dry run) would $m" -ForegroundColor DarkGray }

# Same rationale as build4.ps1: native stderr chatter must not be fatal; only
# the exit code decides.
function Invoke-Native {
    param([scriptblock]$Cmd)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $out  = & $Cmd 2>&1 | ForEach-Object { "$_" }
        $code = $LASTEXITCODE
    } finally { $ErrorActionPreference = $prev }
    [pscustomobject]@{ Output = $out; Code = $code }
}

if (-not (Test-Path $app)) { throw "app folder not found at $app" }

Push-Location $app
try {
    Write-Host 'Qualifire -- OTA publish to the Google Play line (channel: play)' -ForegroundColor White
    if ($DryRun) { Warn 'DRY RUN -- checks only, nothing will be published' }

    # -------------------------------- 0. the updater must exist to publish to
    Step '0. Updater present and configured (play profile must exist in eas.json)'
    $pkg = Get-Content (Join-Path $app 'package.json') -Raw | ConvertFrom-Json
    if (-not $pkg.dependencies.'expo-updates') {
        throw 'package.json does not declare expo-updates -- run the EAS Update setup + build6 first'
    }
    if (-not (Test-Path (Join-Path $app 'node_modules\expo-updates\package.json'))) {
        throw 'expo-updates not in node_modules -- run build6.ps1 (its npm install step) first'
    }
    $appJson = Get-Content (Join-Path $app 'app.json') -Raw | ConvertFrom-Json
    if ($appJson.expo.runtimeVersion.policy -ne 'fingerprint') {
        throw "app.json runtimeVersion policy is '$($appJson.expo.runtimeVersion.policy)', expected 'fingerprint'"
    }
    if ($appJson.expo.updates.url -ne 'https://u.expo.dev/a9f51461-f939-49a2-8c47-087fc39dc5f3') {
        throw 'app.json expo.updates.url missing or wrong'
    }
    $eas = Get-Content (Join-Path $app 'eas.json') -Raw | ConvertFrom-Json
    if ($eas.build.play.channel -ne 'play') {
        throw 'eas.json build.play.channel is not "play"'
    }
    if ($eas.build.play.android.buildType -ne 'app-bundle') {
        throw 'eas.json build.play.android.buildType is not "app-bundle"'
    }
    if ($null -ne $eas.build.play.env.APP_VARIANT) {
        throw 'eas.json build.play.env sets APP_VARIANT -- the Play line must keep the base identity (no variant)'
    }
    Ok 'expo-updates installed; fingerprint policy + updates.url + play channel all configured'
    Say 'reminder: this reaches only Play installs built from the "play" profile -- never the .preview APK.'

    # --------------------------------------------------------- 1. toolchain
    Step '1. Toolchain'
    $node = (node --version)
    Say "node $node"
    if ([int](($node -replace '^v(\d+)\..*$', '$1')) -lt 22) {
        throw "node 22+ required (the test runner uses --experimental-strip-types); found $node"
    }
    Ok 'node version fine'

    # -------------------------------------------------------- 2. preflight
    Step '2. Preflight -- typecheck and tests (same gate as a build)'
    if ($SkipTests) {
        Warn 'skipped by -SkipTests'
    } else {
        Say 'npx tsc --noEmit'
        $r = Invoke-Native { npx.cmd tsc --noEmit }
        if ($r.Code -ne 0) {
            $r.Output | ForEach-Object { Say $_ }
            throw 'TypeScript errors -- fix before publishing'
        }
        Ok 'tsc clean'

        Say 'node --experimental-strip-types tests/run.ts'
        $r = Invoke-Native { node --experimental-strip-types tests/run.ts }
        $summary = $r.Output | Select-String -Pattern '^\d+ tests:' | Select-Object -Last 1
        if ($r.Code -ne 0) {
            $r.Output | Select-String -Pattern '^FAIL' | ForEach-Object { Warn $_ }
            throw 'test failures -- fix before publishing'
        }
        Ok $summary
    }

    # -------------------------------- 3. commit-first discipline (D-043)
    Step '3. Working tree (the publish bakes whatever is in app/ RIGHT NOW)'
    $r = Invoke-Native { git status --porcelain }
    if ($r.Code -eq 0 -and $r.Output) {
        $r.Output | ForEach-Object { Warn $_ }
        Warn 'working tree is dirty -- commit first is the discipline. Publishing anyway, tree as-is.'
    } elseif ($r.Code -eq 0) {
        Ok 'working tree clean'
    } else {
        Warn 'could not read git status -- continuing'
    }

    if (-not $Message) {
        $r = Invoke-Native { git log -1 --format=%s }
        if ($r.Code -eq 0 -and $r.Output) { $Message = ($r.Output | Select-Object -Last 1) }
        if (-not $Message) { $Message = 'qualifire play OTA update' }
        Say "no -Message given; using last commit subject: $Message"
    }
    # Windows arg-parsing gotcha (Nathan, 2026-09-24 -- hit on a real commit
    # subject with embedded quotes, `RIDES: ... "no way" rides ...`):
    # PowerShell does NOT escape a literal " inside "$Message" when it builds
    # the command line for the native exe below (eas-cli, reached through the
    # npx.cmd/node shim chain) -- the embedded quote closes --message's value
    # early and everything after it lands as stray positional args, which
    # eas-cli then rejects ("Unexpected argument: ..."). This is message-only
    # text, never code, so swapping any embedded " for ' is the simplest safe
    # fix -- correctly escaping through two shim layers (cmd.exe, then
    # node's own argv parser) is not worth chasing for a human-readable
    # string. Applies to BOTH the -Message param and the git-derived
    # fallback above -- a hand-typed -Message with a quote in it hits the
    # exact same failure.
    if ($Message -match '"') {
        Warn 'commit message contains a double quote -- eas-cli chokes on it through the npx/node shim chain; using '' instead for this publish'
        $Message = $Message -replace '"', "'"
    }

    # --------------------------------------------- 4. Expo CLI + account
    # Checked in BOTH dry run and real run: npx has to fetch eas-cli itself on
    # its very first invocation anywhere on this machine, and that fetch asks
    # an interactive "Ok to proceed? (y)" -- which Invoke-Native's buffered
    # capture makes INVISIBLE, so the script looks hung for however long the
    # download takes (Nathan, 2026-09-15: looked stuck 5+ min on a bare
    # `npx eas-cli whoami`). -y/--yes makes npx auto-confirm so this can never
    # silently wait on a keypress again, in either mode.
    Step '4. Expo CLI + account'
    $r = Invoke-Native { npx.cmd -y eas-cli whoami }
    if ($r.Code -ne 0) {
        if ($DryRun) {
            Warn 'not logged in to eas-cli -- the real run will need `npx eas-cli login` (interactive, opens a browser)'
        } else {
            Say 'not logged in -- opening login'
            $ErrorActionPreference = 'Continue'   # login is interactive; let it talk
            npx.cmd -y eas-cli login
            $code = $LASTEXITCODE
            $ErrorActionPreference = 'Stop'
            if ($code -ne 0) { throw 'login failed' }
        }
    } else {
        Ok "logged in as $($r.Output | Select-Object -Last 1)"
    }

    if ($DryRun) {
        Step 'Dry run complete.'
        Would "run: npx eas-cli update --channel play --message ""$Message"" --environment production"
        Say 'Rerun without -DryRun to actually publish.'
        return
    }

    Step '5. Publishing (channel: play)'
    Remove-Item Env:APP_VARIANT -ErrorAction SilentlyContinue   # Play line = base identity; a stale APP_VARIANT would drift the fingerprint
    $env:EXPO_PUBLIC_SEED_MODE = 'empty'   # must match eas.json build.play.env
    Say 'bundles locally (npx expo export) then uploads -- ~1-2 min, spends NO build slot.'
    $ErrorActionPreference = 'Continue'
    npx.cmd -y eas-cli update --channel play --message "$Message" --environment production --platform android
    $code = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($code -ne 0) { throw 'eas update reported an error -- check the output above' }

    Step 'Done.'
    Say 'On a Play-installed phone: open Qualifire (on network), close it FULLY, open it again.'
    Say 'The update downloads on the first launch and applies on the second.'
    Say 'If no "play" build has been uploaded to Play yet, nothing receives this -- expected.'
    Say 'If a Play phone stays on old JS: the fingerprint may have moved (native change'
    Say 'since the last build?) -- check with: npx eas-cli update:list'
}
finally { Pop-Location }
```

### 3.2 Verification of the new script

```
cd "$HOME/mnt/Qualifire/scripts" && diff publish-preview.ps1 publish-play.ps1 > /tmp/play.diff; echo "diff exit $?"; cat /tmp/play.diff
```
Expected: hunks only at the regions listed in §3.3 (header block; line 70 banner; step 0 lines
74 + 89-94; line 143 fallback; line 191 dry-run echo; lines 196-198 step 5; line 201 command;
lines 207-210 Done messages). Any hunk elsewhere = you mistyped; fix to match §3.1 exactly.

Structural check (no `pwsh` in this shell; this is the best available):
```
cd "$HOME/mnt/Qualifire/scripts" && python3 - <<'PY'
s=open('publish-play.ps1',encoding='utf-8').read()
assert s.count('{')==s.count('}'), ('braces', s.count('{'), s.count('}'))
assert s.count('(')==s.count(')'), ('parens', s.count('('), s.count(')'))
assert s.startswith('<#') and '#>' in s and s.rstrip().endswith('finally { Pop-Location }')
assert 'APP_VARIANT = ' not in s, 'must never SET APP_VARIANT'
assert '--channel play' in s and '--environment production' in s and '--channel preview' not in s
assert "Remove-Item Env:APP_VARIANT" in s
assert '\r' not in s, 'CRLF crept in'
assert '.\\publish-play.ps1' not in s, 'relative path form forbidden'
print('publish-play.ps1 structural checks OK', s.count('\n'), 'lines')
PY
```
Also report the brace/paren counts of `publish-preview.ps1` with the same script (they should be
equal to each other too), as a sanity comparison. Nathan will run `-DryRun` himself; you do not.

### 3.3 Enumerated differences vs `publish-preview.ps1` (for the inspector)

| preview line(s) | preview text (abridged) | play |
|---|---|---|
| 1-35 | header comment block | rewritten (Play line, channel `play`, full-path usage lines, identity guard, no-install-yet note, `--environment production`) |
| 70 | `'Qualifire -- OTA publish to the Preview APK (channel: preview)'` | `'Qualifire -- OTA publish to the Google Play line (channel: play)'` |
| 74 | `Step '0. Updater present and configured (build 6 must have landed)'` | `Step '0. Updater present and configured (play profile must exist in eas.json)'` |
| 90-92 | `if ($eas.build.preview.channel -ne 'preview') { throw 'eas.json build.preview.channel is not "preview"' }` | checks `build.play.channel -ne 'play'`, then two new checks: `build.play.android.buildType -ne 'app-bundle'`, `$null -ne $eas.build.play.env.APP_VARIANT` |
| 93 | `Ok '... preview channel all configured'` | `... play channel all configured` |
| 94 | `Say 'reminder: only builds >= 6 carry the updater ...'` | `Say 'reminder: this reaches only Play installs built from the "play" profile -- never the .preview APK.'` |
| 143 | `'qualifire preview OTA update'` | `'qualifire play OTA update'` |
| 191 | `Would "run: npx eas-cli update --channel preview ... --environment preview"` | `--channel play ... --environment production` |
| 196 | `Step '5. Publishing (channel: preview)'` | `(channel: play)` |
| 197 | `$env:APP_VARIANT = 'preview'   # ...` | `Remove-Item Env:APP_VARIANT -ErrorAction SilentlyContinue   # ...` |
| 198 | `$env:EXPO_PUBLIC_SEED_MODE = 'empty'   # Preview ships blank ... see cycles/virgin-cycle4` | same assignment, comment `# must match eas.json build.play.env` |
| 201 | `npx.cmd -y eas-cli update --channel preview --message "$Message" --environment preview --platform android` | `--channel play ... --environment production --platform android` |
| 207 | `Say 'On the phone: open Qualifire Preview (on network), ...'` | `Say 'On a Play-installed phone: open Qualifire (on network), ...'` |
| 209 | `Say 'If the phone stays on old JS: ...'` | one added line `Say 'If no "play" build has been uploaded to Play yet, nothing receives this -- expected.'` then `Say 'If a Play phone stays on old JS: ...'` |
| everything else (36-69, 71-73, 75-89, 95-142, 144-190, 192-195, 199-200, 202-206, 208, 210-212) | identical | identical |

## 4. `scripts/README.md`

Anchor (line 7, verify verbatim):
```
| `publish-preview.ps1`, `publish-preview.cmd` | OTA update for JS-only changes (`eas-cli update --channel preview`); sets `APP_VARIANT=preview` + `EXPO_PUBLIC_SEED_MODE=empty` itself; reaches only an installed APK with the same fingerprint. |
```
Insert **directly after it** (new line 8) exactly:
```
| `publish-play.ps1` | OTA update for JS-only changes to the **Google Play line** (`eas-cli update --channel play --environment production`); clears `APP_VARIANT` (base identity `com.nathanbonher.qualifire`) and sets `EXPO_PUBLIC_SEED_MODE=empty` itself; same preflight as `publish-preview.ps1`. Reaches only Play installs built from the `play` profile in `app/eas.json` (an `.aab`); none exists yet, so it lands on nothing until the first Play upload. Added 2026-10-05, `deployment/rounds/round2/`. No `-Promote` yet (needs `app/fingerprint.config.js`, deferred). |
```

## 5. `deployment/CURRENT-STATE.md`

5a. Line 1 anchor: `# Deployment — current state (as of 2026-09-10)` -> change the date to
`(as of 2026-10-05)`. Nothing else on the line.

5b. Build-profiles table. Anchor line 70 (verify verbatim):
```
| `virgin` | internal | `virgin` | apk | same seed env | Dormant per `STATE.md`. |
```
Insert directly after it:
```
| `play` | store | `play` | app-bundle (`.aab`), `autoIncrement: true` | `EXPO_PUBLIC_SEED_MODE=empty` only — **no `APP_VARIANT`**, so `app.config.js` yields the clean `com.nathanbonher.qualifire` / "Qualifire" | **Defined 2026-10-05 (round 2), never built.** The Play line. OTA script: `scripts/publish-play.ps1`. No `submit` section yet (needs a Play Console app + service-account JSON; first `.aab` upload is manual by Google's rule). |
```

5c. Anchor lines 72-73 (verify verbatim):
```
All three profiles are `distribution: internal` and `buildType: apk`. **No profile produces
an `.aab` (Android App Bundle)**, which is the format Google Play requires for new apps.
```
Replace those two lines with:
```
The three original profiles are `distribution: internal` and `buildType: apk`. The `play` profile
(added 2026-10-05) is the only one that produces the `.aab` Google Play requires for new apps — it has
not been built yet. Its fingerprint will differ from `.preview`'s until `app/fingerprint.config.js`
lands (deferred to the Sentry / disclosure-UI native build, `deployment/rounds/round2/PLAN.md` §4), so
a bundle tested on `.preview` cannot yet be promoted as-is to channel `play`.
```

5d. Tooling table. Anchor line 95 begins with:
```
| `scripts/publish-preview.ps1` | OTA publish: `npx eas-cli update --channel preview --environment preview --platform android`;
```
(verify the start; the line is long). Insert directly after that whole line:
```
| `scripts/publish-play.ps1` | OTA publish to the Play line: `npx eas-cli update --channel play --environment production --platform android`; removes `APP_VARIANT` from the environment (base identity) + sets `EXPO_PUBLIC_SEED_MODE=empty`; same tsc + tests preflight; checks `eas.json build.play` (channel, `app-bundle`, no `APP_VARIANT`) | **No** — written 2026-10-05 (round 2), never run; nothing to land on until a `play` build is on a Play track. First run should be `-DryRun`. |
```

5e. EAS cost note. Find the `## ` heading whose text contains `Cost of the status quo`
(digest: lines 172-186). Append, as the **last paragraph of that section** (before the next `## `
heading or end of file), one paragraph:
```
**Decision (round 2, 2026-10-05):** stay on EAS Free. Free has no overage — builds stop until the 1st
when the 15 Android builds/month are used up; 5–10 testers are far below the 1,000 update MAU. Revisit
only if builds exceed ~12/month for two consecutive months (`deployment/rounds/round2/review.md` §2).
```
If the heading cannot be found by that text, stop and report the actual `## ` headings.

## 6. `deployment/README.md`

6a. Anchor lines 17-20 (verify verbatim):
```
if anything here disagrees with them. **Status as of 2026-09-10: route and signing are fully
decided** (Google Play closed testing, 5–10 Android testers, clean package name, Play
generates the signing key) — `rounds/round1/questions-and-rulings.md` is fully answered, nothing left open.
What's left is execution: the repo-prep and Play Console steps in `rounds/round1/review.md` §0.
```
Append directly after line 20 (new line, same paragraph):
```
**Round 2 (2026-10-05):** Nathan's Expo questions answered in `rounds/round2/review.md`; the `play`
EAS profile and `scripts/publish-play.ps1` now exist (`rounds/round2/PLAN.md`); `fingerprint.config.js`,
the version bump and `-Promote` wait for the Sentry / disclosure-UI native build.
```

6b. Files table. Anchor line 30 (verify verbatim start):
```
| `rounds/round1/questions-and-rulings.md` | All ten questions, all answered
```
Insert directly after that whole line:
```
| `rounds/round2/ideas.md`, `review.md`, `DIGEST.md`, `PLAN.md`, `BRIEF-01-*.md`, `EXECUTION.md` | Round 2 (2026-10-05): Nathan's two Expo questions (updates/builds once the Play key is in play; is Expo free for good), the reviewed answers, and the plan + brief + execution record that added the `play` profile and `publish-play.ps1`. `PLAN.md` §4 holds the checklist for the deferred native-build cycle. |
```

6c. Anchor line 52 (verify verbatim):
```
- `scripts/README.md` — the build-script lineage (build3 → build7, publish-preview).
```
Replace with:
```
- `scripts/README.md` — the build-script lineage (build3 → build8, publish-preview, publish-play).
```

## 7. `OPEN-ITEMS.md` -- Distribution section

Anchor: lines 180-185 (verify verbatim; the file is already modified in the working copy, so
check the text, and if the line numbers have shifted by a few lines, locate by text and report
the actual numbers in EXECUTION.md -- a shift is NOT a mismatch; different text IS):
```
- **Signing decided 2026-09-10:** Google generates the Play app-signing key (Q6); no keystore
  backup needed for the Play-signed key (Q7) — Play keeps its own copy. Nothing left open on
  distribution route or signing. Real remaining work, tracked in
  `deployment/rounds/round1/review.md` §0: a `play` EAS build profile, the background-location
  in-app disclosure UI (can ride along with the Sentry native build), a privacy policy page,
  the Play Console setup itself, and the written background-location justification for review.
```
Insert **directly after** that bullet (before the blank line and `## Housekeeping`), one new
bullet, without changing any existing bullet:
```
- **Round 2 landed 2026-10-05 (`deployment/rounds/round2/`):** `play` profile in `app/eas.json`
  (store, `.aab`, channel `play`, `autoIncrement`, no `APP_VARIANT`) and `scripts/publish-play.ps1`
  exist; neither has been built or run. **Deferred to one native-build cycle** (own `cycles/`
  folder; trigger = the next native build, i.e. Sentry): `app/fingerprint.config.js` (skip name +
  package, probably version, so `.preview` and Play hash the same), `app.json` version bump,
  Sentry, background-location disclosure UI, build `preview` + `play`, verify with
  `eas fingerprint:compare` that both fingerprints match, first manual `.aab` upload to the Play
  internal track, then add `-Promote` (`eas update:republish --destination-channel play`) to
  `publish-play.ps1` and the OTA loop becomes preview → check on phone → republish to `play`.
  Checklist: `deployment/rounds/round2/PLAN.md` §4. Optional, Nathan-only: download the `.preview`
  credentials once as a backup (`eas credentials`, interactive).
```

## 8. Verification (run all; paste results into EXECUTION.md)

```
cd "$HOME/mnt/Qualifire/app" && node -e "JSON.parse(require('fs').readFileSync('eas.json','utf8')); console.log('eas.json valid JSON')"
cd "$HOME/mnt/Qualifire/app" && node -e "const c=require('./app.config.js'); const base={android:{package:'x'}}; const r=c({config:base}); console.log('app.config.js loads; base identity preserved:', r.android.package==='x' && r.name===undefined)"
cd "$HOME/mnt/Qualifire/app" && node --experimental-strip-types tests/run.ts 2>&1 | tail -5
cd "$HOME/mnt/Qualifire/app" && ./node_modules/.bin/tsc --noEmit; echo "tsc exit $?"
cd "$HOME/mnt/Qualifire" && GIT_OPTIONAL_LOCKS=0 git status --porcelain > /tmp/status_after.txt; diff /tmp/status_before.txt /tmp/status_after.txt
cd "$HOME/mnt/Qualifire" && GIT_OPTIONAL_LOCKS=0 git diff --stat -- app/eas.json scripts/README.md deployment/CURRENT-STATE.md deployment/README.md OPEN-ITEMS.md
cd "$HOME/mnt/Qualifire" && GIT_OPTIONAL_LOCKS=0 git diff -- app/eas.json app/app.json app/app.config.js | head -80
ls -la "$HOME/mnt/Qualifire/app/fingerprint.config.js" 2>&1   # must say: No such file
```
Pass criteria: test runner reports zero FAIL; tsc exit 0; the `status` diff shows exactly
`?? scripts/publish-play.ps1` plus `M` for `app/eas.json`, `scripts/README.md`,
`deployment/CURRENT-STATE.md`, `deployment/README.md` as the only additions (`OPEN-ITEMS.md` was
already `M`), and `?? deployment/rounds/round2/EXECUTION.md` once written; `git diff` shows no
change to `app/app.json` or `app/app.config.js`; `fingerprint.config.js` absent. The app.config.js
load check is a pure-function call with a dummy config and `APP_VARIANT` unset in this shell -- if
`APP_VARIANT` happens to be set in the device shell, `unset APP_VARIANT` first and say so.

If the test runner or tsc fails on **pre-existing** cycle-22 working-copy changes (files you did
not touch), do not fix them: report the failure verbatim, state that none of your six files are
imported by app code, and let the coordinator rule.

## 9. `deployment/rounds/round2/EXECUTION.md`

Write it last, with: date; every file touched (path, what changed, line numbers found vs
expected); every command from §2, §3.2 and §8 with a one-line result; the full `diff` of §3.2;
the `status` before/after diff; any deviation from this brief, or "none"; anything you stopped
on. Plain Markdown, no readout table (the coordinator writes that).
