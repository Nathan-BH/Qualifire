# 02 — Shrink the 1.1 GB EAS upload archive (`.easignore`), and measure the actual APK

**Source: Nathan, 2026-09-30, mid-build 7 re-run** — "the app is 1.1Gb, i dont know if it is
much but we can indeed have a look at all the unnecessary things that bloat the app". His EAS
log: "Compressed project files 2m 59s (1.1 GB) Your project archive is 1.1 GB ... excluding
files that are unnecessary for the build process in .easignore file".

**Status: brief only.** Written 2026-09-30 by the Plan tier (Fable) against the working tree
(branch `virgin`, HEAD `ae911bb`). Executor: Sonnet, cold, this file only.

## Read this first, Nathan — two different numbers

1. **1.1 GB = the project archive EAS uploads to its build server**, once per build. It is the
   whole git repository (the Expo project lives in `app/`, but EAS CLI archives from the git
   root — `git rev-parse --show-toplevel` → the Qualifire folder), minus `.gitignore`d files.
   What is in it (measured 2026-09-30, git-tracked bytes): **687 MB total — `marketing/` 608 MB
   (of which `marketing/archive/pre-teaser-full-studios` alone is the bulk), `Claude outputs/`
   41 MB, `soundv1/` 9, `product/` 8, `app/` 8, `design/` 7, `cycles/` 3, `data/` 2.** On top
   of that, without a `.easignore`, EAS CLI leaves the shallow clone's own `.git` directory in
   the archive (its source: `.git` is only removed "when the user's .easignore ignores it") —
   a depth-1 pack of all those media files, roughly another 400-500 MB. 687 MB + that pack is
   the 1.1 GB. **None of it except `app/` is used by the build.** Every build spends ~3
   minutes compressing and uploading it. This brief makes the archive ~`app/` only, expected
   **~10-20 MB**.
2. **The installed app (APK) size is a different, unmeasured number.** Nobody has read it.
   `COMMANDS.md` §2 prints it from the last build's artifact in one line; write the value
   into `PROGRESS.md` here. Brief 01 removes ~4.1 MB of Leuven seed from it; §5 below lists
   the other candidates as options with *unmeasured* estimates — nothing there is briefed
   until the APK has been measured once.

## What this changes on the phone

**Nothing.** The APK/AAB produced from an identical `app/` is identical; only what travels to
the build server changes. It also does not change the OTA fingerprint (expected: `@expo/
fingerprint` hashes `app/.easignore`, and this file lives at the repo root — verified in
`COMMANDS.md` §3; see Decision 4).

## Executor rules (binding)

- **Stop-on-ambiguity** — every anchor below was read 2026-09-30; a mismatch is reported
  verbatim, never patched around.
- No commit unless told (`GIT_OPTIONAL_LOCKS=0`; stray `.git/index.lock` gets `mv`'d aside).
  Never delete; `safe_to_delete/` is the bin.
- No `npm`, `npx`, `eas` in the cloud. The before/after measurement is Nathan's (`COMMANDS.md`
  §1); the executor only writes the file and the test.
- **Files touched — exactly these:**
  - NEW `.easignore` (repo root — the git root, NOT `app/`)
  - NEW `app/tests/easignore_suite.ts`
  - EDIT `app/tests/run.ts` (one import line)
- Do **not** create `app/.easignore` (it would enter the fingerprint — Decision 4). Do not
  touch `.gitignore`, `app/.gitignore`, `eas.json`, `app.json`, any script, `STATE.md`,
  `OPEN-ITEMS.md`, `IDEAS.md`, the cycle README.

## Goal

The next `eas build` (build 8, or Nathan's next run of any build script) uploads only what
`app/` needs: sources, tests, assets, `modules/`, `plugins/`, `package.json`,
`package-lock.json`, `app.json`, `app.config.js`, `eas.json`, `tsconfig.json`, and — after
brief 01 — `metro.config.js` and `assets/seed-stubs/`. Nothing from `marketing/`, `Claude
outputs/`, `cycles/`, `product/`, `design/`, `data/`, `soundv1/`, `safe_to_delete/`,
`_to_delete/`, `app/dist/`, `app/node_modules/`, and no `.git`.

## Current state (verified 2026-09-30)

- No `.easignore` anywhere (`find . -name .easignore` → none). `.gitignore` at root ignores
  `node_modules/ .expo/ err.log *.log *.bak safe_to_delete/ data/*.zip data/analysis/cache/
  /*.gpx app/android/ app/dist/ *.gpx __pycache__/ _to_delete/`; `app/.gitignore` ignores
  `node_modules/ .expo/ dist/ *.apk *.aab`. Untracked non-ignored files: 0.
- `app/` is not its own git repo (`app/.git` absent); the git root is the Qualifire folder.
  `eas.json` (`app/eas.json`) has no root override; `build4.ps1` line 90 `Push-Location $app`
  runs `eas-cli build` from `app/`, which EAS resolves as a project inside the repo root.
- How EAS CLI (current `main`, `packages/eas-cli/src/vcs/clients/git.ts` + `vcs/local.ts`,
  read 2026-09-30) builds the archive: shallow-clones the git root; if `<git root>/.easignore`
  exists, removes clone files matching it (`git ls-files --exclude-from .easignore --ignored
  --cached`) and removes the clone's `.git` **only if `.easignore` ignores `.git`**; then (the
  default, `requireCommit: false`) copies the working tree over it through an `Ignore` that
  **uses `.easignore` INSTEAD of `.gitignore` when `.easignore` exists** (`.git` and
  `node_modules` always excluded in that copy). Consequence: the `.easignore` must repeat every
  `.gitignore` rule that matters inside `app/`, or gitignored junk (`app/dist/`, `*.bak`,
  `err.log`) starts uploading.
- `app/` tracked content outside `src/ tests/ core/ assets/ modules/`: `.gitignore App.tsx
  README-dev.md README.md app.config.js app.json eas.json package-lock.json package.json
  plugins/withShowWhenLocked.js scripts/wp3-*.{py,ts} tsconfig.json`. On disk but gitignored:
  `app/dist/` 12 MB (2026-09-29 export), `app/eas.json.bak`, `app/err.log`, `app/node_modules`,
  `app/_to_delete/`, `app/safe_to_delete/`.
- `app/assets/earcons/*.wav` (8 files, ~450 KB) are **not referenced by any `require` in
  `src/`** (grep `.wav` → nothing) — so Metro never bundles them; they are repo weight, not APK
  weight. Left alone (README-worthy, not this brief).
- `tests/run.ts` — line 61 `import './ridenotification_suite.ts';`, line 62 `import { runAll }`.

## Decisions

1. **Allow-list `app/`, deny everything else** (`/*` + `!/app/`), rather than a deny-list of
   `marketing/` etc. A deny-list rots the next time a folder is added at the root; the
   allow-list cannot. (Open call A offers the deny-list if Nathan prefers readability.)
2. **Ignore `.git` explicitly** — the single biggest line: it is the only way EAS CLI drops the
   clone's pack from the archive.
3. **Repeat the `app/`-relevant `.gitignore` rules inside `.easignore`**, because EAS CLI stops
   reading `.gitignore` once `.easignore` exists (Current state). Anchored where the originals
   were anchored.
4. **Repo root, never `app/.easignore`.** EAS CLI looks for it at the git root
   (`path.join(rootPath, '.easignore')`, `rootPath` = `git rev-parse --show-toplevel`);
   `@expo/fingerprint`'s `getEasBuildSourcesAsync` hashes `eas.json` and `.easignore` under
   the *project* root (`app/`). So a root file changes the archive and not the fingerprint.
   Expected; Nathan confirms with `COMMANDS.md` §3 (hash before == hash after).
5. **A headless test pins the file** (`easignore_suite.ts`): it exists at the repo root, not in
   `app/`, and contains the load-bearing lines. Cheap insurance against a future cleanup.
6. **Not done here:** trimming `marketing/` from git history, moving `Claude outputs/` — repo
   hygiene, no effect on the build once the archive is `app/`-only.

## Files to touch

### NEW `.easignore` (repo root) — exact contents

```
# .easignore — Qualifire (virgin-cycle19 brief 02, 2026-09-30)
# EAS CLI archives the WHOLE git repo (git root = this folder; the Expo project is app/).
# When this file exists EAS CLI uses it INSTEAD of .gitignore for the working-tree copy and
# strips matching committed files from its clone — so it must be self-sufficient.
# Rule: upload app/ and nothing else. Measured before this file: 1.1 GB. Expected after: ~10-20 MB.

# 1. the clone's own .git — EAS CLI only drops it when this file says so
.git

# 2. everything at the repo root except app/
/*
!/app/

# 3. inside app/: what .gitignore + app/.gitignore already exclude, repeated on purpose
node_modules/
.expo/
/app/dist/
/app/android/
/app/safe_to_delete/
/app/_to_delete/
/app/eas.json.bak
*.log
*.bak
*.apk
*.aab
*.gpx
__pycache__/
```

Write it with a heredoc; LF line endings; no BOM.

### NEW `app/tests/easignore_suite.ts`

Text checks only (`test`/`assert`/`TESTS_DIR` from `./lib.ts`, `node:fs`, `node:path`). Repo
root = `path.join(TESTS_DIR, '..', '..')`. Tests (`virgin-cycle19 02: …`):

1. `<root>/.easignore` exists; `<root>/app/.easignore` does NOT exist.
2. Its non-comment lines include exactly these, each on its own line: `.git`, `/*`, `!/app/`,
   `node_modules/`, `/app/dist/`, `/app/android/`, `*.log`, `*.bak`.
3. `!/app/` comes after `/*` (order matters for gitignore semantics).

### EDIT `app/tests/run.ts`

Insert `import './easignore_suite.ts';` after line 61 (if brief 01 landed first, after its
`import './seedstubs_suite.ts';`), before `import { runAll } from './lib.ts';`.

## Verification plan

1. `cd app && node --experimental-strip-types tests/run.ts` — 784 + 3 new (787 / 784 / 0 / 3;
   or 791 / 788 / 0 / 3 if brief 01 is already in). Zero FAIL.
2. `cd app && ./node_modules/.bin/tsc --noEmit` — clean (only a test file was added).
3. `git check-ignore` cannot test `.easignore`; instead the executor runs the exact matcher EAS
   uses on the clone side, from the repo root:
   `GIT_OPTIONAL_LOCKS=0 git ls-files --exclude-from .easignore --ignored --cached | awk -F/ '{print $1}' | sort | uniq -c`
   — expected: every top-level folder EXCEPT `app` appears, and `app` does not. Then
   `GIT_OPTIONAL_LOCKS=0 git ls-files --exclude-from .easignore --ignored --cached -- app | head`
   — expected: empty (no tracked file under `app/` is ignored). Paste both into `PROGRESS.md`.
4. **Nathan, PC — `COMMANDS.md` §1** (`eas build:inspect --stage archive`): run BEFORE the
   file lands (or read the 1.1 GB from the last build log) and AFTER. Expected after: the
   inspect folder holds only `app/…` and is ~10-20 MB (node_modules never included). Record
   both numbers in `PROGRESS.md`.
5. **Nathan — `COMMANDS.md` §3**: fingerprint before == after.
6. Inspect (fresh Opus): reruns 1-3; checks the file byte-for-byte against the block above;
   `git status --porcelain` shows only the three paths.

## On-device checklist

None — nothing reaches the phone. The check is the next build's log line
"Compressed project files … (N MB)".

## §5 — APK bloat candidates (OPTIONS for Nathan; every number here is an unmeasured estimate)

Measure first (`COMMANDS.md` §2), then pick. Nothing below is briefed.

| # | candidate | what it is | expected saving (guess, unmeasured) | cost |
|---|---|---|---|---|
| a | Leuven seed + 3 PNGs | brief 01 | ~4 MB, certain (file sizes) | none — OTA |
| b | ABI splits / arm64-only | the sideloaded Preview APK is a *universal* APK carrying MapLibre + Hermes + RN native libs for arm64-v8a, armeabi-v7a, x86, x86_64. Setting `reactNativeArchitectures=arm64-v8a` (e.g. `eas.json` `env.ORG_GRADLE_PROJECT_reactNativeArchitectures`) keeps one. | plausibly a third to a half of the APK — MapLibre's native lib is the big one | native rebuild (touches `eas.json` → fingerprint moves); x86 emulators and 32-bit-only phones excluded. **Irrelevant for the Play route:** Play takes an AAB and serves per-device splits itself. |
| c | `expo-dev-client` in `package.json` | a dependency of every build; its launcher UI is meant to be inert in release builds, but whether its native code is compiled into the *preview* APK is unverified | 1-3 MB if present | check by unzipping the APK (`COMMANDS.md` §2 note); removing it from release builds needs a separate profile or a `package.json` change (fingerprint moves) |
| d | Hermes bundle 2.6 MB (`app/dist` 2026-09-29) | the app's JS | ~0.2 MB from brief 01 | — |
| e | `assets/earcons/*.wav`, `assets/icon/*` | unreferenced by `require` → not in the APK at all | 0 | repo hygiene only |
| f | MapLibre itself | the map engine; the only way to cut it is to not have a map | — | not an option |

## Out of scope

- Any APK change (options above are for a later brief once measured). Git-history rewriting.
  `marketing/` reorganisation. `app/dist/` cleanup.

## Open calls (default chosen — executor does NOT stop)

- **A. Allow-list vs deny-list.** Default: allow-list `app/` (Decision 1). Alternative Nathan
  might prefer for readability: keep the repo and only deny `marketing/`, `Claude outputs/`,
  `safe_to_delete/`, `_to_delete/`, `.git` — ~10x smaller instead of ~50x, rots when new root
  folders appear.
- **B. `app/README-dev.md` / `HOW-THE-APP-IS-BUILT.md` mention?** Default: no doc edits here;
  the cycle README + brief 03's `scripts/README.md` carry the explanation.
