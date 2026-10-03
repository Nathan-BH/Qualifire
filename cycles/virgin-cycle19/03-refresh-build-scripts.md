# 03 — `build8.ps1` describes the app as it is now; builds 3, 5, 6, 7 to `scripts/legacy/`

**Source: Nathan, 2026-09-30** — "I think we should just make new versions and update the
build-prepare and build files in general to reflect the current app implementations better."
Trigger: the build preflight still prints "6. Route map assets (the faked map --
pre-rendered PNGs, no native module)" and asserts the 20 Leuven routes + 3 PNGs are on disk —
the opposite of what the blank-seed app is. Nathan 2026-10-03: build 8 must describe the app
as it is now, with NO "Route map assets" section.

**Status: brief only, REFRESHED 2026-10-03 — refreshed by Opus 2026-10-03** (Plan tier, Opus
standing in for Fable) against HEAD `1f5e150` (checked-out branch on the PC: `cycle20-wip`).
The 2026-09-30 version (Fable) planned a NEW self-contained `build8.ps1`; since then cycle20
created `scripts/build8.ps1` + `build8.cmd` as a wrapper over `build4.ps1`, and Nathan's
cycle20 runbook already uses them. This refresh therefore EDITS the existing files
surgically instead of writing a new engine. **Pre-validated by the Plan tier 2026-10-03:**
the apply script below was run against copies of the real files (all asserts pass, line counts
in A1), both scripts parse with 0 errors in PowerShell 7.4.6, and a PowerShell 7 `-DryRun
-SkipTests` of the result against a mock repo printed exactly the OK lines listed in "Nathan's
dry run"; with `!/app/`, without `metro.config.js`, without `redirectResolution`, with
`app/.easignore`, with a module lacking `expo-module.config.json`, with a missing stub, with
the rules out of order, and without `.easignore`, it threw before the engine ran. (PowerShell
7 on Linux, not Nathan's 5.1 — Nathan's dry run is still the real check.)
Executor: Sonnet, cold, this file only.
**Run order: 02 -> 01 -> 03, all before build 8.** This brief asserts files that 01 and 02
create; run it only after both have landed (Precondition check below).

## What this changes on the phone

**Nothing.** No file in `app/` is touched. The APK that build 8 produces is exactly what the
current `build8.ps1` would produce from the same tree. Only the preflight changes: it now
asserts the app as it is (blank seed + the Metro seed redirect of brief 01, the native layer of
cycles 18/20, the repo-root `.easignore` of brief 02) and no longer asserts the Leuven route
PNGs. It can therefore REFUSE a build that the old preflight would have let through (seed
redirect missing, `.easignore` missing or written `!/app/`); it can no longer refuse one for a
missing `ways.json`.

## Executor rules (binding)

- **Stop on ambiguity.** Every anchor below was read 2026-10-03 and is asserted by the apply
  script; any assertion failure, any surprise, any undecided call → stop and report verbatim.
  Never guess, never "fix" an anchor.
- Repo is on Nathan's PC, reachable only through `device_bash`; repo root there is
  `$HOME/mnt/Qualifire`. **Never run `git status`** (hangs on this mount). Prefix every git call
  with `GIT_OPTIONAL_LOCKS=0` and give it `timeout_ms 90000`. A stray `.git/index.lock` is
  `mv`'d aside, never deleted.
- **Never delete. `mv` only** (the legacy scripts are moved, not removed). No commit unless
  told. Do not switch branches.
- **No `npm`, `npx`, `eas`, `expo`** anywhere. PowerShell is not on the PC shell (`which pwsh`
  → nothing) — see Acceptance A6 for the optional cloud parse check.
- **Do not retype the code blocks.** Every block you need is marked `<!-- BLOCK: name -->` in
  THIS file; the apply script (Step 2) reads them straight out of this file. Write only the
  apply script itself by hand (quoted heredoc).
- **Files touched — exactly these, nothing else:**
  - EDIT `scripts/build8.ps1` (header lines 1-72, title line 93, lines 147-190)
  - EDIT `scripts/build8.cmd` (line 2, the `rem` description; keep CRLF)
  - EDIT `scripts/build4.ps1` (7 single-line edits, header note, section 6 removed; keep BOM)
  - NEW `scripts/legacy/` with `README.md`
  - MOVE `scripts/build3-prepare.ps1`, `scripts/build3-build.ps1`, `scripts/build5.ps1`,
    `scripts/build5.cmd`, `scripts/build6.ps1`, `scripts/build6.cmd`, `scripts/build7.ps1`,
    `scripts/build7.cmd` → `scripts/legacy/` (same names; 8 files)
  - REWRITE `scripts/README.md`
  - EDIT `scripts/OTA-TROUBLESHOOTING.md` (lines 47-52, one paragraph)
  - EDIT `deployment/CURRENT-STATE.md` (lines 93, 94, 97: three table rows)
  - EDIT `cycles/virgin-cycle19/COMMANDS.md` (§5 expected-output paragraph, 3 lines)
- **Do NOT touch:** `scripts/build4.ps1`'s location (it STAYS in `scripts/`),
  `publish-preview.*`, `dev-phone.*`, `gatefield-replay.*`, `spike-maplibre.ps1`,
  `recolour-icon.py`, `publish-preview.ps1.bak`, anything in `app/`, `.easignore`,
  `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, this folder's `README.md`, briefs 01/02,
  `cycles/virgin-cycle20/SCRIPTS.md`, `cycles/virgin-cycle21/COMMANDS.md`.
- Everything written into `.ps1`/`.cmd` stays **pure ASCII** (the cycle12 mojibake incident:
  Windows PowerShell 5.1 reads a BOM-less file as ANSI). `build4.ps1` keeps its UTF-8 BOM.

## Decisions

1. **Keep delegating to `build4.ps1`; do NOT inline its engine into `build8.ps1`.**
   The 2026-09-30 brief chose a ~300-line self-contained rewrite. Rejected on risk:
   - PowerShell cannot be run before Nathan's paid build (no `pwsh` on the PC shell; a cloud
     PowerShell 7 parse check is possible but Nathan runs Windows PowerShell 5.1). A rewrite
     of the toolchain/tsc/tests/`whoami`/`eas build` plumbing is ~250 lines nobody can
     execute end to end before a build slot is spent. `build4.ps1`'s engine has run builds
     5, 6 and 7 (twice) successfully; its `-DryRun` already spends nothing.
   - Every entry point Nathan's runbook uses keeps working unchanged: `build8.ps1 -DryRun`,
     `build8.ps1`, `build8.cmd dry` (`cycles/virgin-cycle20/SCRIPTS.md` §1-2,
     `cycles/virgin-cycle21/COMMANDS.md` line 14, `cycles/virgin-cycle19/COMMANDS.md` §5).
     Same file names, same parameters (`-DryRun`, `-SkipTests`, `-NoWait`).
   - The stale part is ONE section (`build4.ps1` §6, lines 255-274) plus a few printed
     titles. Removing those is a 20-line surgical edit to a proven file.
   - The "wrapper over engine lets stale sections survive" concern of the 09-30 brief is
     answered by putting every current-app assertion in `build8.ps1` (sections C-E) and
     stating in `build4.ps1`'s header that it is now only build8's engine.
2. **What `build8.ps1` asserts (new sections C-E)**, all read-only, problems collected and
   reported together, then `throw` before the engine runs:
   - **C. Blank seed** — existing checks kept verbatim (`eas.json build.preview.env.
     EXPO_PUBLIC_SEED_MODE == 'empty'`, something under `app/src` reads
     `EXPO_PUBLIC_SEED_MODE`), plus brief 01: `app/metro.config.js` exists and contains
     `expo/metro-config`, `./metro.seedRedirect.js`, `resolveRequest`, `redirectResolution`,
     `seedModeFromEnv` (the exact five strings `seedstubs_suite.ts` test 1 pins);
     `app/metro.seedRedirect.js` exists and contains `SEED_FILES` and `assets/seed-stubs/`;
     the four stubs `app/assets/seed-stubs/{catalog.empty.json,results.empty.json,
     ways.empty.json,blank.png}` exist; `app/tests/seedstubs_suite.ts` and
     `app/tests/easignore_suite.ts` exist.
   - **D. Native layer** — `package.json` declares `expo-location` and `expo-task-manager`;
     `app.json` plugins include `./plugins/withShowWhenLocked.js` and that file exists; every
     folder under `app/modules/` has `expo-module.config.json` (printed by name; today
     `qualifire-lock-screen`, `qualifire-ride-notification`). (MapLibre, expo-audio,
     safe-area, OpenFreeMap tiles stay in build4 §3 — not duplicated.)
   - **E. Upload archive (brief 02)** — repo-root `.easignore` exists; its non-blank,
     non-`#` lines (trimmed) contain `.git`, `/*`, `!/app` in that order; the exact rule
     `!/app/` (trailing slash) is **absent** — it re-includes nothing for EAS's copy filter
     (the npm `ignore` package never matches the bare path `app` against `app/`) and the build
     would get an empty archive; `app/.easignore` is absent; an upload-size estimate = bytes
     of every file under `app/` except `node_modules`, `.expo`, `safe_to_delete`, `_to_delete`,
     `__pycache__` (any depth), `dist`/`android` (top level of `app/` only, mirroring
     `/app/dist`, `/app/android` — `app/modules/*/android` DOES upload and is counted), and
     `*.log *.bak *.apk *.aab *.gpx`; problem if over 50 MB (brief 02 simulated 8.0 MB).
     A PowerShell-level line check, deliberately: no `node_modules/ignore`, no node, cheap.
3. **No export check in build8** (the 09-30 brief's `npx expo export` + `.hbc` scan): it
   costs 1-2 min per run, needs `[Text.Encoding]::Latin1` (absent in Windows PowerShell 5.1)
   and is already done once before build 8 by brief 01 Acceptance 8 (`measure.ps1 -Export`).
   The redirect's presence is asserted every run (C); its effect is pinned by
   `seedstubs_suite.ts`, which build4 §2 runs every time (`tests/run.ts`).
4. **`npm install` (step A) stays** in the real run, as today and as `SCRIPTS.md` §2
   describes ("npm install, tests, EAS build"). Not changing behaviour Nathan's runbook
   documents.
5. **`build4.ps1` stays in `scripts/` next to `build8.ps1`** (build8 line 180 finds it via
   `$PSScriptRoot`). Its §6 (lines 255-274, `ways.json` + PNG assertions and the pointer to
   an archived python script) is replaced by a 3-line comment; printed titles that claim
   "build 4" / "barred until the app is finalized" / "BUILD-4-RUNBOOK.md" (a file that no
   longer exists) are reworded; a dated header note says it is now build8's engine. Sections
   0-5, 7, 8 logic untouched.
6. **Legacy move: build3-prepare/build, build5, build6, build7 (.ps1 + .cmd, 8 files) →
   `scripts/legacy/`. They are documented as history, NOT runnable after the move**: build5/6/7
   call `& (Join-Path $PSScriptRoot 'build4.ps1')` (build5.ps1:32, build6.ps1:113,
   build7.ps1:180), and build4 is no longer beside them. Editing their paths to `..\build4.ps1`
   was considered and rejected: build4's §0/§6 changed since they last ran, so a "runnable"
   build7 would not be the build7 that ran; nobody needs to run them; editing dead scripts is
   churn. `build3-*` were standalone and obsolete (failed build 3). Nothing current references
   any of the 8 by path (verified: `publish-preview.ps1` mentions `build6.ps1` only in comments
   and one error message — see Known stale references).
7. `build8.cmd` keeps its shape (`dry` → `-DryRun`); only its `rem` description changes.

## Current state (verified 2026-10-03 on the PC, HEAD `1f5e150`)

- `scripts/build8.ps1` — 190 lines, LF, no BOM, ASCII. Line 1 `<#`, line 72 `#>`, line 73
  `[CmdletBinding()]`, params `-DryRun -SkipTests -NoWait` (74-78), helpers `Say/Step/Ok/Warn`
  (84-87), line 93 the `Write-Host 'Qualifire build 8 -- ...blank seed + OTA fingerprint
  re-anchor'` title, A (95-124) `expo-updates` + `npm install`, B (126-145) fingerprint
  policy / `updates.url` / channel — defines `$pkg` (97), `$appJson` (128), `$eas` (138);
  C (147-164) seed mode + `app/src` hook, D (166-175) git status warning, `}` /
  `finally { Pop-Location }` (176-177), E (179-181)
  `& (Join-Path $PSScriptRoot 'build4.ps1') -BuildProfile preview -Standalone -DryRun:$DryRun
  -SkipTests:$SkipTests -NoWait:$NoWait`, notes (183-190). Header lines 1-72 are the
  build-7 "blank seed + fingerprint re-anchor" story.
- `scripts/build8.cmd` — 11 lines, CRLF; line 2 `rem ... (blank seed for travel + OTA
  fingerprint re-anchor).`
- `scripts/build4.ps1` — 334 lines, LF, UTF-8 BOM. §0 profile gate (96-107, title line 100),
  title line 92, §1 node (109-116), §2 tsc + tests (118-139), §3 native slate (141-186, title
  line 142), §4 variant (188-231, line 230 the development `Ok`), §5 icons (233-253, title
  line 234), **§6 route assets 255-274** (title line 256 `'6. Route map assets (the faked map
  -- pre-rendered PNGs, no native module)'`; line 273 points at
  `08_build_route_assets.py`), verdict 276-284, dry-run stop 286-291, §7 whoami 293-305,
  §8 build 307-318, Done notes 320-332 (line 332 `BUILD-4-RUNBOOK.md`, which exists nowhere
  in the repo). Header 1-41 (line 41 `#>`).
- `app/assets/ways/{ways.json,Morning.png,EveningA.png,EveningB.png}` still exist and stay
  (brief 01 keeps the real files for shipped mode and the tests) — so old §6 would still
  pass; it is removed because it describes the wrong app, not because it fails.
- `app/package.json` deps include `expo-location`, `expo-task-manager`, `expo-updates`,
  `expo-audio`, `@maplibre/maplibre-react-native`, `react-native-safe-area-context`.
  `app/app.json` plugins: `expo-location` (array form), `expo-status-bar`, `expo-audio`,
  `@maplibre/maplibre-react-native`, `./plugins/withShowWhenLocked.js`; `app/plugins/
  withShowWhenLocked.js` exists; `app/modules/qualifire-lock-screen/` and
  `app/modules/qualifire-ride-notification/` each have `expo-module.config.json`.
  `app/eas.json` `build.preview.env` = `APP_VARIANT: preview`, `EXPO_PUBLIC_SEED_MODE: empty`.
- Before 01/02 land: no `.easignore`, no `app/metro.config.js`, no `app/assets/seed-stubs/`.
  Brief 02's `.easignore` (exact text in `02-shrink-upload-archive.md` "NEW `.easignore`")
  has rules `.git`, `/*`, `!/app` in that order; its comment line 7 contains the text
  `"!/app/"` inside a `#` comment — so the "absent" check must look at rule lines only.
- `scripts/README.md` (14 lines) lists build3/4/5 only; `scripts/OTA-TROUBLESHOOTING.md`
  lines 45-52 tell the reader to "Clone the highest-numbered `scripts/buildN.ps1`"; the
  build-7 cycle-18 fingerprint `610cfe83…` is ALREADY recorded (lines 61-73) — the 09-30
  brief's "record the re-run fingerprint" paragraph is moot and dropped.
- `deployment/CURRENT-STATE.md` line 93 = `scripts/build7.ps1` as current build, 94 =
  `build4.ps1` as "engine build7 calls", 97 = lineage "build3 → build7".
- `cycles/virgin-cycle19/COMMANDS.md` §5 (lines 64-76 today; brief 01 edits §4 above it, so
  anchor by TEXT) expects "section 6 'seed not in bundle' + bundle size, section 7 archive"
  — the 09-30 design; replaced below.
- Searched for references to the files that move: `app/README-dev.md`,
  `HOW-THE-APP-IS-BUILT.md`, `scripts/dev-phone.ps1`, `README.md`,
  `POWERSHELL-SCRIPTS-README.md`, `SCRIPTS-QUICK-REFERENCE.txt` — none. `cycles/virgin-
  cycle20/SCRIPTS.md` and `cycles/virgin-cycle21/COMMANDS.md` reference only `build8.ps1` /
  `build8.cmd` (unchanged names) — **no correction needed**.

## Steps

### Step 0 — Precondition (stop if any line fails)

```bash
cd $HOME/mnt/Qualifire
ls .easignore app/metro.config.js app/metro.seedRedirect.js app/assets/seed-stubs/blank.png \
   app/tests/seedstubs_suite.ts app/tests/easignore_suite.ts
grep -nx '!/app' .easignore ; grep -cx '!/app/' .easignore
wc -l scripts/build8.ps1 scripts/build4.ps1 scripts/build8.cmd
GIT_OPTIONAL_LOCKS=0 git diff --stat -- scripts deployment/CURRENT-STATE.md
ls scripts/legacy 2>&1
```

Expected: all six files listed (briefs 01 and 02 landed); `!/app` found on one line; the
`-cx '!/app/'` count is `0`; `190`, `334`, `11` lines; `git diff --stat` prints nothing for
those paths; `scripts/legacy` does not exist. Anything else → STOP and report.

### Step 1 — Move the legacy scripts

```bash
cd $HOME/mnt/Qualifire
mkdir scripts/legacy
for f in build3-prepare.ps1 build3-build.ps1 build5.ps1 build5.cmd build6.ps1 build6.cmd build7.ps1 build7.cmd; do mv "scripts/$f" "scripts/legacy/$f"; done
ls scripts scripts/legacy
```

Expected `scripts/`: `OTA-TROUBLESHOOTING.md README.md build4.ps1 build8.cmd build8.ps1
dev-phone.cmd dev-phone.ps1 gatefield-replay.cmd gatefield-replay.ps1 legacy
publish-preview.cmd publish-preview.ps1 publish-preview.ps1.bak recolour-icon.py
spike-maplibre.ps1`; `scripts/legacy/`: the 8 moved files.

### Step 2 — Apply every text edit with one script (reads the blocks from this brief)

Write this file with a quoted heredoc (`cat > $HOME/apply03.py <<'PYEOF' ... PYEOF`; it lives
outside the repo), then run `cd $HOME/mnt/Qualifire && python3 $HOME/apply03.py`. It asserts
every anchor first and writes nothing if any assertion fails. Expected last line:
`APPLY-03 OK`.

```python
import re, sys
BRIEF = 'cycles/virgin-cycle19/03-refresh-build-scripts.md'

def blocks():
    out, lines, i = {}, open(BRIEF, encoding='utf-8').read().split('\n'), 0
    while i < len(lines):
        m = re.match(r'<!-- BLOCK: ([a-z0-9-]+) -->$', lines[i])
        if m:
            j = i + 1
            while not (lines[j].startswith('```') or lines[j].startswith('~~~~')):
                j += 1
            fence = re.match(r'(`{3,}|~{4,})', lines[j]).group(1)
            k = j + 1
            while lines[k] != fence:
                k += 1
            out[m.group(1)] = lines[j + 1:k]
            i = k
        i += 1
    return out

B = blocks()
need = ['b8-header', 'b8-title', 'b8-region', 'b8cmd-rem', 'b4-note', 'b4-sec6',
        'legacy-readme', 'scripts-readme', 'ota-para', 'cs-93', 'cs-94', 'cs-97', 'cmd-s5']
missing = [n for n in need if n not in B]
assert not missing, missing

def check_ascii(name, lines):
    bad = [l for l in lines if any(ord(c) > 127 for c in l)]
    assert not bad, (name, bad[:2])

writes = []

# ---- scripts/build8.ps1 (LF, no BOM, ASCII)
p = 'scripts/build8.ps1'
raw = open(p, 'rb').read()
assert not raw.startswith(b'\xef\xbb\xbf') and b'\r\n' not in raw
L = raw.decode('ascii').split('\n')
assert L[-1] == '' and len(L) == 191, len(L)
L = L[:-1]
assert L[0] == '<#' and L[71] == '#>' and L[72] == '[CmdletBinding()]'
assert L[92].startswith("    Write-Host 'Qualifire build 8 -- ") and 're-anchor' in L[92]
assert 'C. blank-seed wiring' in L[146] and L[146].startswith('    # ---')
assert L[175] == '}' and L[176] == 'finally { Pop-Location }'
assert L[179] == "& (Join-Path $PSScriptRoot 'build4.ps1') -BuildProfile preview -Standalone `"
assert L[189] == '}'
for n in ('b8-header', 'b8-title', 'b8-region'):
    check_ascii(n, B[n])
assert len(B['b8-title']) == 1
new = B['b8-header'] + L[72:92] + B['b8-title'] + L[93:146] + B['b8-region']
writes.append((p, ('\n'.join(new) + '\n').encode('ascii')))

# ---- scripts/build8.cmd (CRLF, line 2 only)
p = 'scripts/build8.cmd'
raw = open(p, 'rb').read()
C = raw.decode('ascii').split('\r\n')
assert C[-1] == '' and len(C) == 12 and C[1].startswith('rem Double-clickable launcher for build 8')
assert len(B['b8cmd-rem']) == 1
check_ascii('b8cmd-rem', B['b8cmd-rem'])
C[1] = B['b8cmd-rem'][0]
writes.append((p, '\r\n'.join(C).encode('ascii')))

# ---- scripts/build4.ps1 (LF, keep BOM)
p = 'scripts/build4.ps1'
raw = open(p, 'rb').read()
assert raw.startswith(b'\xef\xbb\xbf') and b'\r\n' not in raw
T = raw[3:].decode('utf-8').split('\n')
assert T[-1] == '' and len(T) == 335, len(T)
T = T[:-1]
single = {
    92:  ('    Write-Host "Qualifire build 4 -- $BuildProfile" -ForegroundColor White',
          '    Write-Host "Qualifire build engine (build4.ps1) -- $BuildProfile" -ForegroundColor White'),
    100: ('        Step "0. Profile gate -- standalone ($BuildProfile) is barred until the app is finalized"',
          '        Step "0. Profile gate -- $BuildProfile is a standalone APK that freezes the JS on disk now"'),
    142: ("    Step '3. Native slate -- build 4 adds ONE native module since build 3: MapLibre (B-50/D-041)'",
          "    Step '3. Native slate -- packages and config plugins the APK must contain'"),
    230: ('        Ok "profile is $BuildProfile -- rebuilds the dev client in place. This IS build 4\'s expected path (Nathan, 2026-08-17): no standalone/preview APK until the app is finalized."',
          '        Ok "profile is $BuildProfile -- rebuilds the dev client (com.nathanbonher.qualifire) in place; no variant check needed"'),
    234: ("    Step '5. Launcher icon (corrected mark -- one of the things build 4 ships)'",
          "    Step '5. Launcher icon'"),
    332: ("    Say 'On-device checklist: see BUILD-4-RUNBOOK.md section 5.'",
          "    Say 'Fingerprint of this build: npx.cmd eas-cli build:list --platform android --limit 1 (record it in scripts\\OTA-TROUBLESHOOTING.md)'"),
}
for ln, (old, newl) in single.items():
    assert T[ln - 1] == old, (ln, T[ln - 1])
assert T[40] == '#>'
assert T[254].startswith('    # ---') and '6. route assets' in T[254]
assert 'Route map assets' in T[255]
assert '08_build_route_assets.py' in T[272] and T[273] == '    }' and T[274] == ''
assert 'the verdict' in T[275]
for n in ('b4-note', 'b4-sec6'):
    check_ascii(n, B[n])
for ln, (old, newl) in single.items():
    T[ln - 1] = newl
T = T[:40] + B['b4-note'] + T[40:254] + B['b4-sec6'] + T[274:]
writes.append((p, b'\xef\xbb\xbf' + ('\n'.join(T) + '\n').encode('utf-8')))

# ---- scripts/legacy/README.md (new) and scripts/README.md (rewrite)
import os
assert os.path.isdir('scripts/legacy') and not os.path.exists('scripts/legacy/README.md')
writes.append(('scripts/legacy/README.md', ('\n'.join(B['legacy-readme']) + '\n').encode('utf-8')))
r = open('scripts/README.md', encoding='utf-8').read()
assert r.startswith('# scripts/') and '| `build4.ps1` |' in r and r.count('\n') == 14
writes.append(('scripts/README.md', ('\n'.join(B['scripts-readme']) + '\n').encode('utf-8')))

# ---- scripts/OTA-TROUBLESHOOTING.md lines 47-52
p = 'scripts/OTA-TROUBLESHOOTING.md'
O = open(p, encoding='utf-8').read().split('\n')
assert O[46] == '  fingerprint policy doing its job. Clone the highest-numbered'
assert O[51] == '  publishing then works against the new build.'
O = O[:46] + B['ota-para'] + O[52:]
writes.append((p, '\n'.join(O).encode('utf-8')))

# ---- deployment/CURRENT-STATE.md lines 93, 94, 97
p = 'deployment/CURRENT-STATE.md'
S = open(p, encoding='utf-8').read().split('\n')
assert S[92].startswith('| `scripts/build7.ps1` | Current APK build:')
assert S[93].startswith('| `scripts/build4.ps1` | The underlying engine build7 calls:')
assert S[96].startswith('| `scripts/README.md` | Build-tooling lineage build3')
for n, idx in (('cs-93', 92), ('cs-94', 93), ('cs-97', 96)):
    assert len(B[n]) == 1
    S[idx] = B[n][0]
writes.append((p, '\n'.join(S).encode('utf-8')))

# ---- cycles/virgin-cycle19/COMMANDS.md §5 expected-output paragraph (anchored by text)
p = 'cycles/virgin-cycle19/COMMANDS.md'
M = open(p, encoding='utf-8').read().split('\n')
hits = [i for i, l in enumerate(M) if l.startswith('Expected: every section OK, section 6 "seed not in bundle"')]
assert len(hits) == 1, hits
h = hits[0]
assert M[h + 2].startswith('`eas-cli build` line it would run. The real build')
M = M[:h] + B['cmd-s5'] + M[h + 3:]
writes.append((p, '\n'.join(M).encode('utf-8')))

for path, data in writes:
    open(path, 'wb').write(data)
    print('wrote', path, len(data), 'bytes')
print('APPLY-03 OK')
```

### The blocks (the apply script reads these — do not edit them, do not retype them)

`scripts/build8.ps1` lines 1-72 become:

<!-- BLOCK: b8-header -->
```powershell
<#
    Qualifire -- build 8: the current native build of "Qualifire Preview"
    (app id com.nathanbonher.qualifire.preview, EAS profile "preview"),
    installed over the existing Preview APK. Its preflight describes the app
    as it is now (2026-10-03); the build itself is the build4.ps1 engine that
    built 5, 6 and 7.

    What the app is, and therefore what this script asserts:
      - Blank seed, permanent (Nathan 2026-09-06): the Preview ships no
        routes, ways, gates or sports. eas.json build.preview sets
        EXPO_PUBLIC_SEED_MODE=empty; src/store/seed.ts reads it at bundle
        time; publish-preview.ps1 sets the same value for OTA bundles.
      - The Leuven seed BYTES stay out too (virgin-cycle19 brief 01):
        app\metro.config.js + app\metro.seedRedirect.js swap the seed
        catalog, archive results, way manifest and three map PNGs for the
        stubs in app\assets\seed-stubs\ on every non-shipped bundle.
      - Native layer: expo-updates (OTA, fingerprint runtime policy),
        expo-location + expo-task-manager (background recording),
        expo-audio, MapLibre 11 on OpenFreeMap tiles, and the two local
        modules in app\modules\ (lock screen, ride notification) with
        plugins\withShowWhenLocked.js (virgin-cycles 18 and 20).
      - Upload archive (virgin-cycle19 brief 02): the repo-root .easignore
        uploads app\ only (about 8 MB instead of 1.1 GB). Its rule must read
        !/app -- written with a trailing slash, EAS's copy filter
        re-includes nothing and the build gets an empty archive.

    Steps (A-F only read; -DryRun installs nothing and spends nothing):
      A. expo-updates declared (the real run also runs npm install)
      B. EAS Update config: fingerprint policy, updates.url, preview channel
      C. blank seed: EXPO_PUBLIC_SEED_MODE=empty, the seed hook in app\src,
         the Metro seed redirect and its four stubs
      D. native layer: background-location packages, the local modules,
         the withShowWhenLocked plugin
      E. upload archive: .easignore rules + an upload-size estimate
      F. working-tree status (the APK freezes what is on disk now)
      G. the build4.ps1 engine: node, tsc + tests, native slate, variant,
         icons, verdict; then eas-cli login + build (skipped by -DryRun)

        powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\build8.ps1" -DryRun
        powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\build8.ps1"

    The real run does npm install, then queues the APK on Expo (about 10-20
    min, one EAS build slot); answer REUSE when asked about the keystore.
    Or double-click build8.cmd (build8.cmd dry = -DryRun).
#>
```

`scripts/build8.ps1` line 93 becomes:

<!-- BLOCK: b8-title -->
```powershell
    Write-Host 'Qualifire build 8 -- "Qualifire Preview" (com.nathanbonher.qualifire.preview), rebuilt in place' -ForegroundColor White
```

`scripts/build8.ps1` lines 147-190 (old C, D, E and the notes) become:

<!-- BLOCK: b8-region -->
```powershell
    # ------------------------------------------------------- C. blank seed
    # Problems found in C-E are collected and reported together, so one dry
    # run shows all of them; A, B and the two seed-mode checks stop at once.
    $b8problems = @()

    Step 'C. Blank seed (EXPO_PUBLIC_SEED_MODE=empty + the Metro seed redirect)'
    $seedMode = $eas.build.preview.env.EXPO_PUBLIC_SEED_MODE
    if ($seedMode -ne 'empty') {
        throw "eas.json build.preview.env.EXPO_PUBLIC_SEED_MODE is '$seedMode', expected 'empty' -- this build would ship the Leuven seed."
    }
    Ok 'eas.json build.preview sets EXPO_PUBLIC_SEED_MODE=empty (blank catalog)'

    $seedHits = Get-ChildItem -Path (Join-Path $app 'src') -Recurse -Include *.ts, *.tsx |
        Select-String -SimpleMatch 'EXPO_PUBLIC_SEED_MODE'
    if (-not $seedHits) {
        throw 'nothing under app/src reads EXPO_PUBLIC_SEED_MODE -- the seed would NOT be emptied. Do not ship this as a blank build.'
    }
    Ok "seed hook present: EXPO_PUBLIC_SEED_MODE is read in $(($seedHits | Select-Object -ExpandProperty Path -Unique | ForEach-Object { Split-Path $_ -Leaf }) -join ', ')"

    # virgin-cycle19 brief 01: keep the seed BYTES out of the bundle. These
    # five strings are the ones app\tests\seedstubs_suite.ts pins (test 1).
    $metroCfg = Join-Path $app 'metro.config.js'
    if (Test-Path $metroCfg) {
        $metroText = [string](Get-Content $metroCfg -Raw)
        $metroMissing = @(@('expo/metro-config', './metro.seedRedirect.js', 'resolveRequest', 'redirectResolution', 'seedModeFromEnv') |
            Where-Object { -not $metroText.Contains($_) })
        if ($metroMissing.Count -gt 0) {
            $b8problems += "app\metro.config.js does not mention $($metroMissing -join ', ') -- the seed redirect is not wired (brief 01)"
        } else {
            Ok 'metro.config.js wires the seed redirect (expo/metro-config + metro.seedRedirect.js via resolveRequest)'
        }
    } else {
        $b8problems += 'app\metro.config.js missing -- blank builds would bundle the Leuven seed files again (brief 01)'
    }
    $redirectJs = Join-Path $app 'metro.seedRedirect.js'
    if (Test-Path $redirectJs) {
        $redirectText = [string](Get-Content $redirectJs -Raw)
        if ($redirectText.Contains('SEED_FILES') -and $redirectText.Contains('assets/seed-stubs/')) {
            Ok 'metro.seedRedirect.js maps SEED_FILES to assets/seed-stubs/'
        } else {
            $b8problems += 'app\metro.seedRedirect.js has no SEED_FILES table pointing at assets/seed-stubs/ (brief 01)'
        }
    } else {
        $b8problems += 'app\metro.seedRedirect.js missing (brief 01)'
    }
    $stubNames = @('catalog.empty.json', 'results.empty.json', 'ways.empty.json', 'blank.png')
    $stubMissing = @($stubNames | Where-Object { -not (Test-Path (Join-Path (Join-Path $app 'assets\seed-stubs') $_)) })
    if ($stubMissing.Count -gt 0) {
        $b8problems += "app\assets\seed-stubs is missing $($stubMissing -join ', ') (brief 01)"
    } else {
        Ok "seed stubs present: $($stubNames -join ', ')"
    }
    foreach ($suite in @('seedstubs_suite.ts', 'easignore_suite.ts')) {
        if (Test-Path (Join-Path (Join-Path $app 'tests') $suite)) {
            Ok "pin test present: tests\$suite"
        } else {
            $b8problems += "app\tests\$suite missing (virgin-cycle19 brief 01/02 pin test)"
        }
    }

    # ----------------------------------------------- D. native layer (now)
    Step 'D. Native layer (background recording, local modules, lock-screen plugin)'
    $depNames = @($pkg.dependencies.PSObject.Properties.Name)
    $depMissing = @(@('expo-location', 'expo-task-manager') | Where-Object { $depNames -notcontains $_ })
    if ($depMissing.Count -gt 0) {
        $b8problems += "package.json does not declare $($depMissing -join ', ') -- background recording needs it"
    } else {
        Ok 'package.json declares expo-location + expo-task-manager (background recording)'
    }
    $pluginNames = @()
    foreach ($pl in $appJson.expo.plugins) {
        if ($pl -is [string]) { $pluginNames += $pl } else { $pluginNames += $pl[0] }
    }
    $lockPlugin = './plugins/withShowWhenLocked.js'
    if (($pluginNames -contains $lockPlugin) -and (Test-Path (Join-Path (Join-Path $app 'plugins') 'withShowWhenLocked.js'))) {
        Ok "app.json plugins include $lockPlugin (file present)"
    } else {
        $b8problems += "app.json plugins must include $lockPlugin and app\plugins\withShowWhenLocked.js must exist (virgin-cycle18)"
    }
    $modules = @(Get-ChildItem -LiteralPath (Join-Path $app 'modules') -Directory -ErrorAction SilentlyContinue)
    if ($modules.Count -eq 0) {
        $b8problems += 'app\modules has no local native module -- expected qualifire-lock-screen and qualifire-ride-notification (virgin-cycle18)'
    }
    foreach ($m in $modules) {
        if (Test-Path (Join-Path $m.FullName 'expo-module.config.json')) {
            Ok "local native module $($m.Name) (expo-module.config.json present)"
        } else {
            $b8problems += "app\modules\$($m.Name) has no expo-module.config.json -- Expo autolinking would skip it"
        }
    }

    # ------------------------------------- E. upload archive (brief 02 .easignore)
    Step 'E. Upload archive (repo-root .easignore uploads app\ only)'
    $easignore = Join-Path $repo '.easignore'
    if (Test-Path $easignore) {
        $rules = @(Get-Content $easignore | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' -and -not $_.StartsWith('#') })
        if ($rules -ccontains '!/app/') {
            $b8problems += ".easignore has the rule '!/app/' (trailing slash): EAS's copy filter re-includes NOTHING with it -- empty archive, failed build. It must read !/app (brief 02)"
        }
        $iGit = [array]::IndexOf($rules, '.git')
        $iAll = [array]::IndexOf($rules, '/*')
        $iApp = [array]::IndexOf($rules, '!/app')
        if ($iGit -lt 0 -or $iAll -lt 0 -or $iApp -lt 0) {
            $b8problems += '.easignore must contain the rules .git, /* and !/app (brief 02)'
        } elseif (-not (($iGit -lt $iAll) -and ($iAll -lt $iApp))) {
            $b8problems += '.easignore rules out of order -- expected .git, then /*, then !/app (later rules win)'
        } else {
            Ok '.easignore rules in order: .git, /*, !/app (no trailing slash)'
        }
    } else {
        $b8problems += '.easignore missing at the repo root -- EAS would upload the whole repo again (about 1.1 GB; brief 02)'
    }
    if (Test-Path (Join-Path $app '.easignore')) {
        $b8problems += 'app\.easignore exists -- EAS reads only the repo-root file, and this one moves the fingerprint. Move it to safe_to_delete (brief 02)'
    } else {
        Ok 'no app\.easignore (only the repo-root file is read)'
    }

    # Rough upload size: app\ minus what .easignore drops. EAS prints the real
    # figure ("Compressed project files ... (N MB)") when it uploads.
    $anyDepth = @('node_modules', '.expo', 'safe_to_delete', '_to_delete', '__pycache__')
    $topOnly  = @('dist', 'android')
    $skipExt  = @('.log', '.bak', '.apk', '.aab', '.gpx')
    function Measure-UploadBytes ([string]$Dir, [bool]$IsTop) {
        $sum = [long]0
        foreach ($e in @(Get-ChildItem -LiteralPath $Dir -Force -ErrorAction SilentlyContinue)) {
            if ($e.PSIsContainer) {
                if ($anyDepth -contains $e.Name) { continue }
                if ($IsTop -and ($topOnly -contains $e.Name)) { continue }
                $sum += Measure-UploadBytes $e.FullName $false
            } elseif ($skipExt -notcontains $e.Extension.ToLowerInvariant()) {
                $sum += $e.Length
            }
        }
        return $sum
    }
    $uploadMB = (Measure-UploadBytes $app $true) / 1MB
    if ($uploadMB -gt 50) {
        $b8problems += ('upload estimate {0:N1} MB is over 50 MB -- something new and big landed in app\ (brief 02 measured about 8 MB)' -f $uploadMB)
    } else {
        Ok ('upload estimate {0:N1} MB (app\ minus node_modules, .expo, dist, android, bins, logs)' -f $uploadMB)
    }

    # ---------------------------------------------- F. working tree status
    Step 'F. Working tree (the APK freezes what is on disk now)'
    $ErrorActionPreference = 'Continue'
    $dirty = git status --porcelain 2>$null
    $ErrorActionPreference = 'Stop'
    if ($dirty) {
        Warn 'git working tree is NOT clean -- uncommitted changes will be baked into the APK. Commit first unless that is what you want.'
    } else {
        Ok 'git working tree is clean'
    }

    # ----------------------------------------- verdict on build 8's own checks
    Step 'Build 8 checks (C-E) verdict'
    if ($b8problems.Count -gt 0) {
        $b8problems | ForEach-Object { Warn $_ }
        throw "build 8 preflight found $($b8problems.Count) problem(s) -- fix the above; nothing was built or spent"
    }
    Ok 'blank seed, native layer and upload archive check out -- handing over to the build4 engine'
}
finally { Pop-Location }

# ------------------------- G. the build4 engine (its preflight 0-5, then the build)
& (Join-Path $PSScriptRoot 'build4.ps1') -BuildProfile preview -Standalone `
    -DryRun:$DryRun -SkipTests:$SkipTests -NoWait:$NoWait

if (-not $DryRun) {
    Write-Host ''
    Say 'Build 8 notes (once the APK is installed over Qualifire Preview):'
    Say '  - installing over the existing Preview keeps its data: ride recordings, results, routes made on the phone.'
    Say '  - record the new fingerprint: npx.cmd eas-cli build:list --platform android --build-profile preview --limit 1'
    Say '    then add it to scripts\OTA-TROUBLESHOOTING.md (Known fingerprints by build); commit package-lock.json if step A changed it.'
    Say '  - publish-preview.ps1 sets EXPO_PUBLIC_SEED_MODE=empty and bundles through the same metro.config.js, so OTA publishes stay blank.'
}
```

`scripts/build8.cmd` line 2 becomes:

<!-- BLOCK: b8cmd-rem -->
```bat
rem Double-clickable launcher for build 8 -- the current Qualifire Preview build (preflight describes the app as it is now; see build8.ps1 header).
```

`scripts/build4.ps1`: inserted before line 41 (`#>`):

<!-- BLOCK: b4-note -->
```powershell

    2026-10-03 (virgin-cycle19 brief 03): this file is now only the ENGINE
    that scripts\build8.ps1 calls; it is not run on its own any more. Builds
    5-7, which also called it, are history in scripts\legacy\ and no longer
    run. Section 6 (the pre-rendered map PNG check) is removed: the
    blank-seed app ships no Leuven map assets, and build8.ps1 asserts the
    Metro seed redirect instead. The text above is build-4 history;
    build8.ps1's header describes the app as it is now.
```

`scripts/build4.ps1` lines 255-274 (section 6) become:

<!-- BLOCK: b4-sec6 -->
```powershell
    # (Section 6, the pre-rendered map PNG check, was removed 2026-10-03 by
    # virgin-cycle19 brief 03: the blank-seed app ships no Leuven map assets;
    # build8.ps1 asserts the Metro seed redirect instead.)
```

NEW `scripts/legacy/README.md`:

<!-- BLOCK: legacy-readme -->
~~~~markdown
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
~~~~

`scripts/README.md` — whole file becomes:

<!-- BLOCK: scripts-readme -->
~~~~markdown
# scripts/ -- build, update and replay tooling (PowerShell/cmd, run on Nathan's PC)

| File | What it is |
|---|---|
| `build8.ps1`, `build8.cmd` | **The current native build** of "Qualifire Preview" (EAS profile `preview`, installs over the existing app, keeps its data). Its preflight describes the app as it is now: blank seed + the Metro seed redirect (`app/metro.config.js`), the native layer (background location, `app/modules/*`, `withShowWhenLocked`), the repo-root `.easignore` upload archive; then it hands over to `build4.ps1`. `build8.cmd dry` = `-DryRun`. Needed only when the native fingerprint changes; JS-only changes go out with `publish-preview.ps1`. |
| `build4.ps1` | The engine `build8.ps1` calls: node, tsc + tests, native slate, variant, icons, verdict, then `eas-cli` login + build. Not run on its own any more. |
| `publish-preview.ps1`, `publish-preview.cmd` | OTA update for JS-only changes (`eas-cli update --channel preview`); sets `APP_VARIANT=preview` + `EXPO_PUBLIC_SEED_MODE=empty` itself; reaches only an installed APK with the same fingerprint. |
| `OTA-TROUBLESHOOTING.md` | Fingerprint-mismatch playbook and the known fingerprint of each build. |
| `dev-phone.ps1`, `dev-phone.cmd` | Phone dev loop: starts the Metro/Expo dev server in `app/` for the installed dev-client (Fast Refresh, no build). `shipped` / `-Shipped` switches to the Leuven seed. |
| `gatefield-replay.ps1`, `gatefield-replay.cmd` | Runs the offline gate-field replay tool (`data/analysis/10_gatefield_replay.py`) from a double-clickable entry point. |
| `spike-maplibre.ps1` | One-off spike script for the MapLibre integration investigation (`product/superseded/MAPLIBRE-SPIKE.md`). |
| `recolour-icon.py` | Recolours the yellow gate-stroke of the two wired launcher PNGs (`app/assets/icon.png`, `adaptive-icon.png`) in place, three-colour barycentric decomposition so ring/ground edges stay clean. `--check` reports without writing. |
| `legacy/` | Builds 3, 5, 6, 7 -- history only, not runnable (see `legacy/README.md`). |

Copy-paste (full paths, as always on this PC):

```
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\build8.ps1" -DryRun
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\build8.ps1"
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-preview.ps1" -DryRun
```

Read by: whoever is doing a build, an OTA publish or a data-analysis replay pass -- these
are the PC-side entry points the app's own `README-dev.md` and the cycle runbooks point to.
Lineage: build3 -> build4 (engine) -> build5/6/7 wrappers (now `legacy/`) -> build8.
~~~~

`scripts/OTA-TROUBLESHOOTING.md` lines 47-52 become:

<!-- BLOCK: ota-para -->
```markdown
  fingerprint policy doing its job. Run the current build script,
  `scripts/build8.ps1` (costs one EAS build slot; builds 3, 5, 6, 7 are
  history in `scripts/legacy/` since 2026-10-03), install the new APK, then
  record the new fingerprint in the section below; OTA publishing then
  works against the new build.
```

`deployment/CURRENT-STATE.md` line 93 becomes:

<!-- BLOCK: cs-93 -->
```markdown
| `scripts/build8.ps1` | Current APK build: preflight for the app as it is now (blank seed + Metro seed redirect, native layer, `.easignore` upload archive), then the `build4.ps1` engine; EAS Build, profile `preview`, ~10-20 min, needs `-ExecutionPolicy Bypass` | Wraps the proven build4 engine; its first build is build 8. Installed today: build 7 (cycle-18 rebuild, fingerprint `610cfe83…` in `scripts/OTA-TROUBLESHOOTING.md`) |
```

line 94 becomes:

<!-- BLOCK: cs-94 -->
```markdown
| `scripts/build4.ps1` | The engine build8 calls (builds 5-7, now in `scripts/legacy/`, called it too): preflight (node/tsc/tests, native slate, variant, icons), `eas login` check, `eas build`. Its route-PNG section was removed 2026-10-03 | Yes — ran builds 5, 6, 7 |
```

line 97 becomes:

<!-- BLOCK: cs-97 -->
```markdown
| `scripts/README.md` | What is in `scripts/` now; lineage build3 → build8 (builds 3, 5-7 in `scripts/legacy/`) | Doc |
```

`cycles/virgin-cycle19/COMMANDS.md` §5, the three lines starting `Expected: every section OK,
section 6 "seed not in bundle"` become:

<!-- BLOCK: cmd-s5 -->
```markdown
Expected (brief 03): sections A-F print only `OK` lines (F may warn about uncommitted files),
then "Build 8 checks (C-E) verdict" OK, then the build4 engine 0-5, "everything checks out --
safe to spend a build" and the `eas-cli build` line it would run. No "Route map" section.
The full expected list is in `03-refresh-build-scripts.md` "Nathan's dry run". The real build:
```

## Acceptance (executor, on the PC shell — paste every output)

A1. `wc -l scripts/build8.ps1 scripts/build4.ps1 scripts/build8.cmd scripts/README.md scripts/legacy/README.md`
→ `295`, `325`, `11`, `25`, `21`.

A2. `grep -ci "route map" scripts/build8.ps1 scripts/build4.ps1` → `scripts/build8.ps1:0`,
`scripts/build4.ps1:0`. `grep -c "ways.json\|08_build_route_assets\|BUILD-4-RUNBOOK" scripts/build8.ps1 scripts/build4.ps1`
→ `build8.ps1:0`; `build4.ps1:1` (the one hit is header line 38, `BUILD-4-RUNBOOK.md`, build-4
history inside the comment block — check with `grep -n` that it is line 38).

A3. Encoding:
```bash
cd $HOME/mnt/Qualifire && python3 - <<'EOF'
for p, bom, crlf in (('scripts/build8.ps1', False, False), ('scripts/build4.ps1', True, False), ('scripts/build8.cmd', False, True)):
    b = open(p, 'rb').read()
    body = b[3:] if bom else b
    print(p, 'BOM' if b.startswith(b'\xef\xbb\xbf') == bom else 'BOM-WRONG',
          'ASCII' if all(c < 128 for c in body) else 'NONASCII',
          'EOL-OK' if (b'\r\n' in b) == crlf and (crlf or b'\r' not in b) else 'EOL-WRONG',
          'braces', body.count(b'{') - body.count(b'}'), 'parens', body.count(b'(') - body.count(b')'))
EOF
```
→ three lines, each `BOM ASCII EOL-OK braces 0 parens 0` (`build4.ps1`'s body is ASCII after
its BOM).

A4. Anchors that must hold:
`grep -n "PSScriptRoot 'build4.ps1'" scripts/build8.ps1` → exactly one hit (line 285);
`grep -n "^param\|DryRun\]\|SkipTests\]\|NoWait\]" scripts/build8.ps1` shows the unchanged
param block; `grep -c 'ExecutionPolicy Bypass -File "C:' scripts/build8.ps1` → `2`;
`grep -n "Step '" scripts/build8.ps1` → A, B, C, D, E, F and "Build 8 checks (C-E) verdict";
`grep -n "Step " scripts/build4.ps1` → no line starting `6.`;
`grep -n "seedModeFromEnv\|redirectResolution" app/tests/seedstubs_suite.ts | head -3` →
present (script and suite pin the same strings).

A5. `ls scripts scripts/legacy` as in Step 1, plus `scripts/legacy/README.md`.
`GIT_OPTIONAL_LOCKS=0 git diff --stat -- scripts deployment cycles/virgin-cycle19/COMMANDS.md`
→ modified: `scripts/README.md`, `scripts/OTA-TROUBLESHOOTING.md`, `scripts/build4.ps1`,
`scripts/build8.cmd`, `scripts/build8.ps1`, `deployment/CURRENT-STATE.md`,
`cycles/virgin-cycle19/COMMANDS.md`; deleted (= moved): the 8 legacy names.
`GIT_OPTIONAL_LOCKS=0 git ls-files --others --exclude-standard scripts` → exactly the 8 files
under `scripts/legacy/` plus `scripts/legacy/README.md` (9 lines; `*.bak` is gitignored).
`GIT_OPTIONAL_LOCKS=0 git diff --stat -- app` → nothing.

A6. **PowerShell parse check in the cloud container (recommended; say if skipped).** GitHub
downloads work from the cloud `Bash` (verified 2026-10-03). Stage the two scripts with
`device_stage_files` (`~/mnt/Qualifire/scripts/build8.ps1`, `~/mnt/Qualifire/scripts/build4.ps1`),
then in the cloud `Bash`, in your scratchpad:
```bash
curl -sSL -o pwsh.tgz https://github.com/PowerShell/PowerShell/releases/download/v7.4.6/powershell-7.4.6-linux-x64.tar.gz
mkdir -p pwsh && tar xzf pwsh.tgz -C pwsh && chmod +x pwsh/pwsh
for f in build8 build4; do ./pwsh/pwsh -NoProfile -Command "\$e=\$null; [void][System.Management.Automation.Language.Parser]::ParseFile('/mnt/user-data/uploads/Qualifire/scripts/$f.ps1',[ref]\$null,[ref]\$e); '$f parse errors: ' + \$e.Count"; done
```
→ `build8 parse errors: 0`, `build4 parse errors: 0`. (PowerShell 7 on Linux, not Nathan's
5.1 — it proves syntax, not behaviour. The new code avoids 7-only syntax: no `??`, no ternary,
no `-AsHashtable`, no `Latin1`.)

## Nathan's dry run (spends nothing — paste the whole output back)

```
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\build8.ps1" -DryRun
```

Expected, in this order (versions/counts may differ; every `OK` below must appear):

```
Qualifire build 8 -- "Qualifire Preview" (com.nathanbonher.qualifire.preview), rebuilt in place
A. expo-updates dependency
  OK  package.json declares expo-updates ~56...
  OK  expo-updates already in node_modules
B. EAS Update config (fingerprint policy + updates.url + preview channel)
  OK  runtimeVersion policy is fingerprint
  OK  updates.url points at this EAS project
  OK  eas.json preview profile is on channel "preview"
C. Blank seed (EXPO_PUBLIC_SEED_MODE=empty + the Metro seed redirect)
  OK  eas.json build.preview sets EXPO_PUBLIC_SEED_MODE=empty (blank catalog)
  OK  seed hook present: EXPO_PUBLIC_SEED_MODE is read in ...
  OK  metro.config.js wires the seed redirect (expo/metro-config + metro.seedRedirect.js via resolveRequest)
  OK  metro.seedRedirect.js maps SEED_FILES to assets/seed-stubs/
  OK  seed stubs present: catalog.empty.json, results.empty.json, ways.empty.json, blank.png
  OK  pin test present: tests\seedstubs_suite.ts
  OK  pin test present: tests\easignore_suite.ts
D. Native layer (background recording, local modules, lock-screen plugin)
  OK  package.json declares expo-location + expo-task-manager (background recording)
  OK  app.json plugins include ./plugins/withShowWhenLocked.js (file present)
  OK  local native module qualifire-lock-screen (expo-module.config.json present)
  OK  local native module qualifire-ride-notification (expo-module.config.json present)
E. Upload archive (repo-root .easignore uploads app\ only)
  OK  .easignore rules in order: .git, /*, !/app (no trailing slash)
  OK  no app\.easignore (only the repo-root file is read)
  OK  upload estimate N.N MB (app\ minus node_modules, .expo, dist, android, bins, logs)   <- about 8
F. Working tree (the APK freezes what is on disk now)
  OK  git working tree is clean        (or the !! warning if files are uncommitted)
Build 8 checks (C-E) verdict
  OK  blank seed, native layer and upload archive check out -- handing over to the build4 engine
Qualifire build engine (build4.ps1) -- preview
  repo: C:\Users\natha\Claude personal projects\Qualifire
  !!  DRY RUN -- checks only, no build will be queued
0. Profile gate -- preview is a standalone APK that freezes the JS on disk now
1. Toolchain ... OK  node version fine
2. Preflight -- typecheck and tests ... OK  tsc clean ... OK  NNN tests: ... 0 fail ...
3. Native slate -- packages and config plugins the APK must contain
  OK  package.json and app.json plugins list all four native packages
  OK  MapLibre native module installed in node_modules, version 11.x
  OK  wayMapView.tsx points at tiles.openfreemap.org (OpenFreeMap, no key)
4. Variant check -- preview must keep its own app id ... OK x2
5. Launcher icon ... OK x4
Preflight verdict
  OK  everything checks out -- safe to spend a build
Dry run complete.
  (dry run) would run: npx.cmd eas-cli build --platform android --profile preview
```

Must NOT appear: any line containing `Route map`, `6.`-numbered section, `ways.json`, or
`!!` lines other than DRY RUN / the preview `-Standalone` reminder / an uncommitted-files
warning. Paste it into `cycles/virgin-cycle19/PROGRESS.md`.

## Inspect checklist (fresh Opus, after the executor reports)

1. Rerun Acceptance A1-A5 yourself on the PC shell, and A6 in the cloud; do not trust pastes.
2. Read the whole new `scripts/build8.ps1` top to bottom: header ASCII and accurate; lines
   73-146 byte-identical to `GIT_OPTIONAL_LOCKS=0 git show HEAD:scripts/build8.ps1` lines
   73-146 except line 93 (diff it: `git diff -U0 -- scripts/build8.ps1` must show no hunk
   inside 74-146 other than 93); `$b8problems` declared before first use; the `throw` comes
   before `finally { Pop-Location }`; the engine call and its parameters unchanged.
3. Read the `build4.ps1` diff (`git diff -- scripts/build4.ps1`): only the header note,
   lines 92/100/142/230/234/332 text, and §6 → comment. No logic line changed elsewhere.
   `Select-String`-equivalent: `grep -ci "route map" scripts/build4.ps1 scripts/build8.ps1` → 0 / 0.
4. **Adversarial, by tracing the code (or in the cloud pwsh against a throwaway mock tree —
   never edit the real repo for this):**
   - a `.easignore` with `!/app/` instead of `!/app` → section E adds the trailing-slash
     problem AND the "must contain .git, /* and !/app" problem → verdict `throw` → build4
     never runs;
   - a `.easignore` with BOTH `!/app` and `!/app/` → still the trailing-slash problem;
   - the comment line `# ... "!/app/" would re-include nothing` alone → NOT a problem
     (comments are filtered before the check);
   - `app/metro.config.js` missing → "metro.config.js missing" problem → `throw`;
   - `metro.config.js` present but without `redirectResolution` → "does not mention
     redirectResolution" problem;
   - `app/.easignore` present → problem;
   - `app/modules/x/` without `expo-module.config.json` → problem naming `x`;
   - `app/android/` or `app/dist/` of 500 MB → not counted; `app/modules/*/android` → counted.
5. Confirm the 8 legacy files are byte-identical to HEAD (`git diff --no-index` or
   `cmp <(git show HEAD:scripts/build7.ps1) scripts/legacy/build7.ps1` for each); confirm
   `build4.ps1` is still at `scripts/build4.ps1`; confirm `scripts/legacy/README.md` says
   "not runnable".
6. Confirm no file outside the Files list changed (A5) — especially nothing in `app/`,
   `.easignore`, `publish-preview.*`, `cycles/virgin-cycle20/SCRIPTS.md`.
7. Confirm `cycles/virgin-cycle20/SCRIPTS.md` §1-2 and `cycles/virgin-cycle21/COMMANDS.md`
   line 14 still name an existing script with existing parameters.

## On-device checklist

None. Nothing on the phone changes. The dry run above is Nathan's check; the next real
`build8.ps1` run is build 8 itself (cycle20 `SCRIPTS.md` §2).

## Known stale references NOT fixed here (coordinator's call, listed so nobody is surprised)

- `scripts/publish-preview.ps1` header lines 5 and 25 mention `build6.ps1`, line 80's error
  message says "run build6.ps1 (its npm install step) first" — only shown if `expo-updates`
  is missing from `node_modules`. Left alone: it is Nathan's OTA path right after build 8,
  and the brief does not touch working scripts beyond build8/build4. One-line follow-up:
  "run npm install in app\ first".
- `deployment/CURRENT-STATE.md` line 77 (`build7.ps1` "reuses keystore", a historical fact),
  `deployment/DEPLOYMENT-OPTIONS.md` 221/303, `deployment/QUESTIONS-FOR-NATHAN.md` 178/278
  name `build7.ps1`/`build4.ps1` in prose — docs, not runbooks.
- `cycles/virgin-cycle19/README.md` row 03 still describes the 09-30 design ("self-contained",
  "export inspected") and "Not briefed" mentions `README-dev.md` / `HOW-THE-APP-IS-BUILT.md`
  (verified: neither mentions any build script) — the coordinator's file.
- `STATE.md` 75/164 mention build7/build4 — coordinator's file.

## Out of scope

- A `play` profile / AAB build. Editing `publish-preview.ps1`. Retiring `spike-maplibre.ps1`.
- An export/bundle scan inside build8 (Decision 3; `measure.ps1 -Export` does it).
- Making the legacy scripts runnable (Decision 6).

## Open calls (default chosen — executor does NOT stop)

- **A. Delegate vs inline** — default delegate (Decision 1). Inline only if Nathan wants one
  self-contained file, as a separate later brief after build 8 has proven the current engine.
- **B. Upload-size ceiling 50 MB** — default; brief 02 simulated 8.0 MB. Lower it once
  build 8's EAS log prints the real figure.
- **C. Legacy scripts not runnable** (default) vs patch their `build4.ps1` path. Default: not
  runnable; they are history.
