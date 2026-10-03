# 02 — Shrink the 1.1 GB EAS upload archive (`.easignore`), and measure the actual APK

**Source: Nathan, 2026-09-30, mid-build 7 re-run** — "the app is 1.1Gb, i dont know if it is
much but we can indeed have a look at all the unnecessary things that bloat the app". His EAS
log: "Compressed project files 2m 59s (1.1 GB) Your project archive is 1.1 GB ... excluding
files that are unnecessary for the build process in .easignore file".

**Status: brief only, REFRESHED 2026-10-03** (Plan tier, Opus standing in for Fable) against
HEAD `1f5e150` (after virgin-cycle20). Originally written 2026-09-30 against `ae911bb`.
Nathan 2026-10-03: execute all three cycle19 briefs, order **02 -> 01 -> 03**, before build 8.
Executor: Sonnet, cold, this file only.

> **2026-10-03 refresh — the 09-30 `.easignore` would have broken build 8.** Its `!/app/`
> (trailing slash) re-includes nothing for the half of EAS CLI that copies the working tree:
> that copy runs through the npm `ignore` package, which never matches a bare directory path
> (`app`) against a `dir/` pattern. Simulated offline with the real `ignore` package against the
> real tree: the 09-30 file uploads **0 files**; the file below uploads **245 files, 8.0 MB,
> all under `app/`**. Details in "How EAS CLI reads this file" and §Verification step 3.

## Read this first, Nathan — two different numbers

1. **1.1 GB = the project archive EAS uploads to its build server**, once per build. It is the
   whole git repository (the Expo project lives in `app/`, but EAS CLI archives from the git
   root — `git rev-parse --show-toplevel` → the Qualifire folder), minus `.gitignore`d files.
   Git-tracked bytes, **measured 2026-10-03: 688 MB — `marketing/` 608 MB, `Claude outputs/`
   41 MB, `soundv1/` 9, `product/` 8, `app/` 8, `design/` 7, `cycles/` 4, `data/` 2**
   (`marketing/` is ~797 MB on disk incl. untracked; the repo's `.git` is 356 MB on disk,
   2026-10-03). On top of that, without a `.easignore`, EAS CLI leaves the shallow clone's own
   `.git` directory in the archive — a depth-1 pack of all those media files. That is the
   1.1 GB. **None of it except `app/` is used by the build** (proved below). Every build
   spends ~3 minutes compressing and uploading it. This brief makes the archive `app/` only:
   **~8 MB** (offline simulation, 2026-10-03).
2. **The installed app (APK) size is a different, unmeasured number.** Nobody has read it.
   `COMMANDS.md` §2 prints it from the last build's artifact in one line; write the value
   into `PROGRESS.md` here. Brief 01 removes ~4.1 MB of Leuven seed from it; §5 below lists
   the other candidates as options with *unmeasured* estimates — nothing there is briefed
   until the APK has been measured once.

## What this changes on the phone

**Nothing.** The APK produced from an identical `app/` is identical; only what travels to
the build server changes. Every file under `app/` that uploads today still uploads (the one
tracked file it drops, `app/tests/fixtures/qualifire-20260815-0024.gpx`, already does not
upload today — see Current state). It does not touch the fingerprint either: `@expo/fingerprint`
hashes `.easignore` only under the *project* root `app/` (Decision 4) — moot for build 8 (a
native build anyway), but it keeps 02 out of every later OTA-vs-build question.

## Executor rules (binding)

- **Stop-on-ambiguity** — every anchor below was re-read 2026-10-03; a mismatch is reported
  verbatim, never patched around. Do not "improve" the `.easignore` text: every character is
  load-bearing (especially: no trailing slash on `!/app`, `/app/android`, `/app/dist`).
- No commit unless told (`GIT_OPTIONAL_LOCKS=0` on every git call; a stray `.git/index.lock`
  gets `mv`'d aside, never deleted). Never delete anything; `safe_to_delete/` is the bin.
  Never run `git status` in the device shell (it hangs); use the `git ls-files` checks below.
- No `npm`, `npx`, `eas`, `expo` anywhere. `node` is allowed (tests + the step-3 simulation).
  The real before/after archive measurement is Nathan's (`COMMANDS.md` §1).
- **Files touched — exactly these three:**
  - NEW `.easignore` (repo root — the git root, NOT `app/`)
  - NEW `app/tests/easignore_suite.ts`
  - EDIT `app/tests/run.ts` (one import line, nothing else)
- Do **not** create `app/.easignore` (Decision 4). Do not touch `.gitignore`, `app/.gitignore`,
  `.gitattributes`, `eas.json`, `app.json`, `app.config.js`, `tests/lib.ts`,
  `tests/ui-strings.allow.json`, any script, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, the cycle
  README, briefs 01/03.

## Goal

The next `eas build` (build 8) uploads only `app/`: `package.json`, `package-lock.json`,
`app.json`, `app.config.js`, `eas.json`, `tsconfig.json`, `App.tsx`, `src/`, `core/`,
`modules/` (incl. both `modules/*/android/`), `plugins/`, `assets/`, `tests/`, `scripts/`,
and — after brief 01 — `metro.config.js` and `assets/seed-stubs/` (covered automatically:
`app/` is included wholesale). Nothing from `marketing/`, `Claude outputs/`, `cycles/`,
`product/`, `design/`, `data/`, `soundv1/`, `deployment/`, `process/`, `scripts/` (root),
`safe_to_delete/`, `_to_delete/`, any root file, `app/dist/`, `app/node_modules/`,
`app/android/`, `app/.expo/`, and no `.git`.

## What the cloud build needs from outside `app/` — NOTHING (verified 2026-10-03)

- **Imports/requires.** Every relative `import`/`from`/`require(`/`import(` specifier in
  `app/src`, `app/core`, `app/modules`, `app/plugins`, `app/tests`, `app/scripts`, `App.tsx`,
  `app.config.js` (187 files) resolved: **zero resolve outside `app/`**. The only `../..`
  strings in `app/` are runtime `path.resolve` defaults in offline dev tools, never bundled:
  `app/core/harness/parity.ts:22` (`'../../../data'`), `app/tests/build_fixtures.ts:30` and
  `app/tests/build_seed.ts:26` (`'../../data'`, argv-overridable). `modules/*/android/*.gradle`
  and `expo-module.config.json`: no `../`.
- **Config.** `app/package.json:5` `"main": "node_modules/expo/AppEntry.js"` (→ `app/App.tsx`);
  scripts are `expo start` / `expo run:android` / `tsc --noEmit` only. `app/app.json` paths are
  all `./assets/…` or `./plugins/withShowWhenLocked.js`. `app/app.config.js` reads only
  `process.env.APP_VARIANT`. `app/tsconfig.json` extends `expo/tsconfig.base` (inside
  `app/node_modules`, reinstalled by `npm ci` on the server). No `metro.config.js` /
  `babel.config.js` / jest config exist yet (brief 01 adds `app/metro.config.js`, inside `app/`).
- **EAS itself.** `app/eas.json:2` `"cli": { "appVersionSource": "remote" }` → version codes
  live on EAS servers, nothing read from `.git`. No `requireCommit` → default `false`. No
  repo-root `package.json`/lockfile/workspace (repo root holds only docs, `.ps1` scripts and
  `.gitattributes`/`.gitignore`), so the server's `npm ci` runs from `app/package-lock.json`
  with nothing above it. EAS CLI finds `eas.json` / `app.json` in the project dir (`app/`,
  where `build8.ps1` / `measure.ps1` `Push-Location`), locally, before archiving.
- **Tests** never run in the cloud archive (preflight runs them locally on the full tree), and
  no test reads outside `app/` anyway: every `path.resolve(TESTS_DIR, '..', …)` stops at `app/`.
- **Native.** `app/android/` does not exist (managed workflow, prebuilt on the server).
  `modules/qualifire-lock-screen/android/` and `modules/qualifire-ride-notification/android/`
  are the local Expo modules' native code and MUST upload — hence `/app/android` is anchored.

## How EAS CLI reads this file (eas-cli `main`, read 2026-10-03)

`packages/eas-cli/src/vcs/clients/git.ts` `makeShallowCopyAsync` (with `requireCommit: false`):

1. `git clone --no-checkout --depth 1 file://<git root>` — the clone has **only `.git`**, no
   work tree.
2. If `<git root>/.easignore` exists (`path.join(rootPath, '.easignore')`, `rootPath` =
   `git rev-parse --show-toplevel`): deletes clone files listed by
   `git ls-files --exclude-from .easignore --ignored --cached`, then deletes the clone's
   `.git` **only if** `Ignore.createForCheckingAsync(rootPath).ignores('.git')` — i.e. only if
   the `.easignore` rules themselves (no defaults) ignore `.git`.
3. `makeShallowCopyAsync` (`vcs/local.ts`): `fs.cp` of the working tree into the clone with a
   filter built by `Ignore.createForCopyingAsync` = defaults `.git` + `node_modules`, **plus
   `.easignore` INSTEAD of every `.gitignore`** when `.easignore` exists. The filter is the npm
   package `ignore` (eas-cli pins `5.3.0`; `app/node_modules/ignore` is `5.3.2`, same rules),
   and `fs.cp` hands it **directory paths without a trailing slash** (`app`, `app/dist`) and
   skips the whole subtree when a directory is ignored.

Consequences that fix every character of the file:

- **`!/app` — no trailing slash.** In `ignore`, `foo/` never matches the bare path `foo`
  (its source: "foo/ will not match 'foo'"). With `/*` + `!/app/`, the directory `app` stays
  ignored, `fs.cp` never enters it, the clone is empty (step 1) and its `.git` is gone (step
  2): **an empty archive and a failed paid build.** Simulated 2026-10-03: 0 files. With
  `!/app` the negation matches `app` and `app/`; 245 files, 8.0 MB.
- **`/*` then `!/app` is legal gitignore** (both for `git ls-files` and `ignore`): you cannot
  re-include a path whose PARENT is excluded, but `app`'s parent is the repo root, which is
  never excluded. (`marketing/` + `!marketing/x` would NOT work; nothing here does that.)
  Later rules win, so `!/app` must come after `/*`.
- **`/app/android`, `/app/dist` — anchored, no trailing slash.** Anchored, so
  `modules/*/android/` is untouched; no slash, so the directory itself is skipped (with a
  slash, `fs.cp` would upload an empty `app/android/` folder — and EAS treats an existing
  `android/` as a bare-workflow marker).
- **`.git` explicitly** — `/*` would also match it, but the explicit line is the one EAS's
  `.git` check is meant for; the suite pins both.
- **Repeat the `.gitignore` rules that matter inside `app/`**, because `.gitignore` is no
  longer read once `.easignore` exists: `node_modules` (also an EAS default for the copy, but
  NOT for the `.git` check / clone side), `.expo`, `safe_to_delete`, `_to_delete`,
  `__pycache__` (unanchored like the originals), `*.log`, `*.bak`, `*.apk`, `*.aab`, `*.gpx`.

## Current state (verified 2026-10-03, HEAD `1f5e150`)

- No `.easignore` anywhere (repo root and `app/` both absent).
- Root `.gitignore`: `node_modules/ .expo/ err.log *.log *.bak safe_to_delete/ data/*.zip
  data/analysis/cache/ /*.gpx app/android/ app/dist/ *.gpx __pycache__/ _to_delete/`.
  `app/.gitignore`: `node_modules/ .expo/ dist/ *.apk *.aab`. Root `.gitattributes`:
  `* text=auto` (+ one marketing eol rule).
- `app/` on disk: `.expo/ .gitignore App.tsx README-dev.md README.md _to_delete/ app.config.js
  app.json assets/ core/ dist/ eas.json eas.json.bak err.log modules/ node_modules/
  package-lock.json package.json plugins/ safe_to_delete/ scripts/ src/ tests/ tsconfig.json`.
  246 tracked files under `app/`.
- One tracked file matches `*.gpx`: `app/tests/fixtures/qualifire-20260815-0024.gpx`
  (force-added despite `.gitignore`). Today it does not upload either (clone is
  `--no-checkout`; the working-tree copy honours `.gitignore`'s `*.gpx`). Test-only, never
  needed by the build.
- `app/assets/earcons/*.wav` are not referenced by any `require` in `src/` — repo weight, not
  APK weight. Left alone.
- `app/tests/run.ts` (69 lines): line 13 `import './seedmode_pin.ts';` (must stay first),
  line 65 `import './ui_strings_suite.ts';`, line 66 `import { runAll } from './lib.ts';`,
  line 68 `const { fail } = await runAll();`. Suites register themselves on import via
  `test()` from `./lib.ts`; `run.ts` has no per-suite registration call.
- Test baseline (cycle20 final, 2026-10-03): **838 tests / 835 pass / 0 fail / 3 skip**, tsc 0.
- `app/tests/ui_strings_suite.ts:194` excludes `tests/` from the rider-string scan, so the new
  suite adds no rider-facing strings and needs no allow-list entry.

## Decisions

1. **Allow-list `app/`, deny everything else** (`/*` + `!/app`), rather than a deny-list of
   `marketing/` etc. A deny-list rots the next time a folder is added at the root; the
   allow-list cannot. The suite pins this: every repo-root entry except `app` must be ignored.
   (Open call A offers the deny-list if Nathan prefers readability.)
2. **Ignore `.git` explicitly** — the single biggest line: it is the only way EAS CLI drops the
   clone's pack from the archive.
3. **Repeat the `app/`-relevant `.gitignore` rules inside `.easignore`**, because EAS CLI stops
   reading `.gitignore` once `.easignore` exists. Directory rules are written **without a
   trailing slash** (see "How EAS CLI reads this file").
4. **Repo root, never `app/.easignore`** — rechecked 2026-10-03 now that build 8 is a native
   build (so "keeps the fingerprint stable" no longer matters for 02 itself). The decision
   still holds for two other reasons: (a) EAS CLI only ever reads `<git root>/.easignore`
   (`git.ts` `path.join(rootPath, EASIGNORE_FILENAME)`; `local.ts` `path.join(this.rootDir, …)`
   with `rootDir` = git root) — an `app/.easignore` would shrink nothing; (b)
   `app/node_modules/@expo/fingerprint/build/sourcer/Expo.js:200-201`
   (`getEasBuildSourcesAsync`, `files = ['eas.json', '.easignore']` under `projectRoot` =
   `app/`) hashes it — every later edit would force a native build instead of an OTA.
5. **A headless test pins the file AND its meaning** (`easignore_suite.ts`): a small matcher in
   the suite that reproduces the `ignore` package's directory semantics (including the
   `!/app/` trap), run against the real file and the real tree.
6. **Not done here:** trimming `marketing/` from git history, moving `Claude outputs/` — repo
   hygiene, no effect on the build once the archive is `app/`-only.

## Files to touch

### NEW `.easignore` (repo root) — exact contents

Write it with a quoted heredoc from the repo root (`cat > .easignore <<'EOF' … EOF`); LF line
endings; no BOM; first line is a comment. Byte-for-byte:

```
# .easignore -- Qualifire (virgin-cycle19 brief 02, refreshed 2026-10-03)
# EAS CLI archives the WHOLE git repo (git root = this folder; the Expo project is app/).
# When this file exists EAS CLI uses it INSTEAD of .gitignore for the working-tree copy and
# strips matching committed files from its clone -- so it must be self-sufficient.
# Rule: upload app/ and nothing else. Before: 1.1 GB. Simulated after: ~8 MB (2026-10-03).
# NO trailing slash on directory rules: EAS's copy filter tests directories as "app", not
# "app/", and "!/app/" would re-include nothing (empty archive, failed build).

# 1. the clone's own .git -- EAS CLI only drops it when this file says so
.git

# 2. everything at the repo root except app
/*
!/app

# 3. inside app: what .gitignore + app/.gitignore exclude, repeated on purpose
node_modules
.expo
/app/dist
/app/android
safe_to_delete
_to_delete
__pycache__
*.log
*.bak
*.apk
*.aab
*.gpx
```

### NEW `app/tests/easignore_suite.ts` — exact contents

Text and file-system checks only; no git, no child processes, no npm. Written for
`node --experimental-strip-types` (no enums/namespaces/parameter properties) and `tsc` strict
(every regex capture is guarded). Brief 01's `metro.config.js` / `assets/seed-stubs` are
checked by RULE only (no `existsSync`), so the suite passes before and after brief 01.

```ts
/**
 * virgin-cycle19 brief 02 -- pins the repo-root .easignore that shrinks the EAS
 * upload archive to app/ only. EAS CLI reads <git root>/.easignore twice: with
 * `git ls-files --exclude-from` for its --no-checkout clone, and with the npm
 * `ignore` package for the fs.cp copy of the working tree, whose filter sees
 * directories WITHOUT a trailing slash ("app", "app/dist"). matchIgnore() below
 * mirrors `ignore`: a "dir/" pattern never matches the bare path "dir", and a
 * path is ignored as soon as one ancestor ("app/", "app/dist/") is ignored.
 * That is why the file says "!/app" and never "!/app/" (empty archive).
 * Text and file-system checks only: no git, no npm, no network.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, test, TESTS_DIR } from './lib.ts';

const APP_DIR = path.resolve(TESTS_DIR, '..');
const ROOT = path.resolve(APP_DIR, '..');
const EASIGNORE = path.join(ROOT, '.easignore');

interface Rule { negate: boolean; re: RegExp }

function escapeRe(c: string): string {
  return c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

function globToRe(glob: string): string {
  let out = '';
  let i = 0;
  while (i < glob.length) {
    const c = glob.charAt(i);
    if (c === '*' && glob.charAt(i + 1) === '*' && glob.charAt(i + 2) === '/') { out += '(?:.*/)?'; i += 3; continue; }
    if (c === '*' && glob.charAt(i + 1) === '*') { out += '.*'; i += 2; continue; }
    if (c === '*') { out += '[^/]*'; i += 1; continue; }
    if (c === '?') { out += '[^/]'; i += 1; continue; }
    out += escapeRe(c);
    i += 1;
  }
  return out;
}

function parseRules(text: string): Rule[] {
  const rules: Rule[] = [];
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.replace(/\s+$/, '');
    if (line === '' || line.startsWith('#')) continue;
    let negate = false;
    if (line.startsWith('!')) { negate = true; line = line.slice(1); }
    let dirOnly = false;
    if (line.endsWith('/')) { dirOnly = true; line = line.slice(0, -1); }
    const anchored = line.includes('/');
    if (line.startsWith('/')) line = line.slice(1);
    const head = anchored ? '^' : '(?:^|/)';
    const tail = dirOnly ? '/$' : '(?:$|/$)';
    rules.push({ negate, re: new RegExp(head + globToRe(line) + tail) });
  }
  return rules;
}

function testOne(rules: Rule[], p: string): boolean {
  let ignored = false;
  for (const r of rules) if (r.re.test(p)) ignored = !r.negate;
  return ignored;
}

/** `rel` is repo-root-relative with "/" separators; a directory is passed WITHOUT a trailing slash. */
function matchIgnore(rules: Rule[], rel: string): boolean {
  const segs = rel.split('/').filter((s) => s !== '');
  for (let i = 1; i < segs.length; i++) {
    if (testOne(rules, segs.slice(0, i).join('/') + '/')) return true;
  }
  return testOne(rules, rel);
}

const TEXT = fs.existsSync(EASIGNORE) ? fs.readFileSync(EASIGNORE, 'utf8') : '';
const RULES = parseRules(TEXT);
const LINES = TEXT.split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== '' && !l.startsWith('#'));
const kept = (rel: string): boolean => !matchIgnore(RULES, rel);

// what EAS's build server needs (all inside app/); checked by rule AND on disk
const REQUIRED = [
  'package.json', 'package-lock.json', 'app.json', 'app.config.js', 'eas.json', 'tsconfig.json',
  'App.tsx', 'src', 'core', 'modules', 'plugins', 'assets',
  'modules/qualifire-lock-screen/android/build.gradle',
  'modules/qualifire-ride-notification/android/build.gradle',
  'plugins/withShowWhenLocked.js',
];
// may not exist yet (brief 01 adds metro.config.js + assets/seed-stubs/): checked by rule only
const OPTIONAL = ['metro.config.js', 'babel.config.js', 'assets/seed-stubs', 'assets/seed-stubs/catalog.seed.json'];
// gitignored junk that may sit inside the walked folders and is SUPPOSED to be dropped
const JUNK = /(^|\/)(node_modules|\.expo|safe_to_delete|_to_delete|__pycache__)(\/|$)|\.(log|bak|apk|aab|gpx)$/;

function walk(dirAbs: string, rel: string, out: string[]): void {
  for (const e of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    const childRel = `${rel}/${e.name}`;
    out.push(childRel);
    if (e.isDirectory()) walk(path.join(dirAbs, e.name), childRel, out);
  }
}

test('virgin-cycle19 02: .easignore sits at the repo root, app/.easignore does not exist', () => {
  assert(fs.existsSync(EASIGNORE), `.easignore missing at ${EASIGNORE}`);
  assert(!fs.existsSync(path.join(APP_DIR, '.easignore')), 'app/.easignore exists: EAS never reads it and it enters the fingerprint');
  assert(TEXT.charCodeAt(0) !== 0xfeff, '.easignore starts with a BOM');
});

test('virgin-cycle19 02: load-bearing rules present, !/app after /*, never "!/app/"', () => {
  for (const want of ['.git', '/*', '!/app', 'node_modules', '/app/dist', '/app/android']) {
    assert(LINES.includes(want), `rule missing: ${want}`);
  }
  assert(LINES.indexOf('/*') < LINES.indexOf('!/app'), '!/app must come after /*');
  for (const bad of ['!/app/', '/app/android/', '/app/dist/', 'android', 'android/']) {
    assert(!LINES.includes(bad), `forbidden rule: ${bad}`);
  }
});

test('virgin-cycle19 02: the app directory itself is kept (bare path, as the EAS copy filter sees it)', () => {
  assert(matchIgnore(parseRules('/*\n!/app/\n'), 'app'), 'matcher must reproduce the "!/app/" trap');
  assert(kept('app'), 'bare "app" is ignored: EAS would upload an empty archive');
  assert(kept('app/'), '"app/" is ignored');
  assert(!kept('.git'), '.git is not ignored: EAS keeps the clone pack in the archive');
});

test('virgin-cycle19 02: every build-needed app path is kept (brief 01 paths by rule)', () => {
  for (const rel of REQUIRED) {
    assert(fs.existsSync(path.join(APP_DIR, rel)), `app/${rel} missing on disk`);
    assert(kept(`app/${rel}`), `app/${rel} would be dropped from the EAS archive`);
  }
  for (const rel of OPTIONAL) assert(kept(`app/${rel}`), `app/${rel} would be dropped from the EAS archive`);
});

test('virgin-cycle19 02: nothing under app/{src,core,modules,plugins,assets} is dropped', () => {
  const all: string[] = [];
  for (const d of ['src', 'core', 'modules', 'plugins', 'assets']) walk(path.join(APP_DIR, d), `app/${d}`, all);
  assert(all.length > 50, `walked only ${all.length} paths`);
  const dropped = all.filter((p) => !kept(p) && !JUNK.test(p));
  assert(dropped.length === 0, `would be dropped: ${dropped.slice(0, 5).join(', ')}`);
});

test('virgin-cycle19 02: every repo-root entry except app is ignored, and app junk too', () => {
  const others = fs.readdirSync(ROOT).filter((n) => n !== 'app');
  assert(others.length > 10, `only ${others.length} repo-root entries found`);
  const leaked = others.filter((n) => kept(n));
  assert(leaked.length === 0, `repo-root entries that would upload: ${leaked.join(', ')}`);
  for (const rel of [
    '.git', 'marketing', 'Claude outputs', 'cycles', 'product', 'design', 'data', 'soundv1',
    'safe_to_delete', '_to_delete', 'app/dist', 'app/node_modules', 'app/node_modules/expo/package.json',
    'app/android', 'app/.expo', 'app/safe_to_delete', 'app/_to_delete', 'app/err.log', 'app/eas.json.bak',
  ]) {
    assert(!kept(rel), `${rel} would upload`);
  }
});

test('virgin-cycle19 02: no relative import/require in app code resolves outside app/', () => {
  const SPEC = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)['"](\.{1,2}\/[^'"]*)['"]/gm;
  const files: string[] = [];
  const collect = (abs: string): void => {
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      if (e.name === 'node_modules') continue;
      const p = path.join(abs, e.name);
      if (e.isDirectory()) collect(p);
      else if (/\.(ts|tsx|js|jsx|cjs|mjs)$/.test(e.name)) files.push(p);
    }
  };
  for (const d of ['src', 'core', 'modules', 'plugins', 'tests', 'scripts']) {
    if (fs.existsSync(path.join(APP_DIR, d))) collect(path.join(APP_DIR, d));
  }
  for (const f of ['App.tsx', 'app.config.js', 'metro.config.js']) {
    if (fs.existsSync(path.join(APP_DIR, f))) files.push(path.join(APP_DIR, f));
  }
  assert(files.length > 100, `scanned only ${files.length} files`);
  const escapes: string[] = [];
  for (const f of files) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(SPEC)) {
      const spec = m[1];
      if (spec === undefined) continue;
      const rel = path.relative(APP_DIR, path.resolve(path.dirname(f), spec));
      if (rel.startsWith('..') || path.isAbsolute(rel)) escapes.push(`${path.relative(APP_DIR, f)} -> ${spec}`);
    }
  }
  assert(escapes.length === 0, `imports leaving app/: ${escapes.slice(0, 5).join('; ')}`);
});

test('virgin-cycle19 02: every ./ path in app.json is inside app/, exists, and is kept', () => {
  const found: string[] = [];
  const visit = (v: unknown): void => {
    if (typeof v === 'string') { if (v.startsWith('./') || v.startsWith('../')) found.push(v); }
    else if (Array.isArray(v)) { for (const x of v) visit(x); }
    else if (v !== null && typeof v === 'object') { for (const x of Object.values(v)) visit(x); }
  };
  visit(JSON.parse(fs.readFileSync(path.join(APP_DIR, 'app.json'), 'utf8')));
  assert(found.length >= 3, `only ${found.length} ./ paths in app.json`);
  for (const p of found) {
    const abs = path.resolve(APP_DIR, p);
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    assert(rel.startsWith('app/'), `${p} resolves outside app/`);
    assert(fs.existsSync(abs), `${p} missing on disk`);
    assert(kept(rel), `${p} would be dropped from the EAS archive`);
  }
});
```

That is **8 tests**.

### EDIT `app/tests/run.ts` — one line

Insert exactly `import './easignore_suite.ts';` as a new line **after line 65**
(`import './ui_strings_suite.ts';`) and **before line 66** (`import { runAll } from './lib.ts';`).
Anchor by text, not number: if line 65 is not `import './ui_strings_suite.ts';` or line 66 is
not the `runAll` import, STOP and report. Result: 70 lines, the new import at line 66,
`runAll` import at line 67 (brief 01 then inserts its `seedstubs_suite` import after line 66 —
its own text already expects this). Nothing else in `run.ts` changes (there is no per-suite
`runAll` registration; suites self-register via `test()`).

## Verification plan

Executor, device shell, repo root = `$HOME/mnt/Qualifire`:

1. `cd $HOME/mnt/Qualifire/app && node --experimental-strip-types tests/run.ts 2>&1 | tail -15`
   — expected last line **`846 tests: 843 pass, 0 fail, 3 skip`** (baseline 838/835/0/3 plus
   8 new); the 8 `virgin-cycle19 02:` lines all `PASS`. Zero FAIL.
2. `cd $HOME/mnt/Qualifire/app && ./node_modules/.bin/tsc --noEmit; echo EXIT $?` — no output,
   `EXIT 0`. (Pitfalls already handled in the code above: `m[1]` guarded for
   `noUncheckedIndexedAccess`; no `export`s; `matchAll` on a `/g` regex.)
3. **The real EAS copy filter, offline** — the same `ignore` package EAS uses, over the real
   tree (writes only `/tmp/sim.cjs`, outside the repo):
   ```
   cd $HOME/mnt/Qualifire && cat > /tmp/sim.cjs <<'EOF'
   const fs=require('fs'),path=require('path');
   const ig=require(process.cwd()+'/app/node_modules/ignore');
   const rules=fs.readFileSync('.easignore','utf8');
   const copy=[ig().add('.git\nnode_modules'),ig().add(rules)];
   const ign=p=>copy.some(i=>i.ignores(p));
   let bytes=0,files=0;const tops={};
   function walk(rel){const abs=path.join(process.cwd(),rel);
    for(const e of fs.readdirSync(abs,{withFileTypes:true})){const r=rel?rel+'/'+e.name:e.name;
     if(ign(r))continue;
     if(e.isDirectory())walk(r);else{const s=fs.statSync(path.join(abs,e.name)).size;bytes+=s;files++;const t=r.split('/')[0];tops[t]=(tops[t]||0)+s;}}}
   walk('');
   console.log('files',files,'MB',(bytes/1048576).toFixed(2),'tops',Object.keys(tops).join(','));
   console.log('.git dropped from clone:',ig().add(rules).ignores('.git'));
   EOF
   node /tmp/sim.cjs
   ```
   Expected (2026-10-03 run of the identical rules): `files 245 MB 7.99 tops app` and
   `.git dropped from clone: true`. Any `tops` other than `app`, or `files 0`, → STOP.
4. **The clone side (git):**
   `cd $HOME/mnt/Qualifire && GIT_OPTIONAL_LOCKS=0 git ls-files --exclude-from .easignore --ignored --cached -- app`
   (device_bash `timeout_ms` 90000) — expected exactly one line:
   `app/tests/fixtures/qualifire-20260815-0024.gpx` (see Current state). Then
   `GIT_OPTIONAL_LOCKS=0 git ls-files --exclude-from .easignore --ignored --cached | awk -F/ '{print $1}' | sort -u`
   — expected: every top-level tracked name except `app` (plus the one `app` line from the
   `.gpx`). Paste both outputs into the report.
5. `ls -la $HOME/mnt/Qualifire/.easignore $HOME/mnt/Qualifire/app/.easignore` — first exists,
   second "No such file". `head -c 3 $HOME/mnt/Qualifire/.easignore | od -c | head -1` — starts
   `#   .` (no BOM). `grep -c $'\r' $HOME/mnt/Qualifire/.easignore` — `0`.
6. Changed-files check without `git status`:
   `cd $HOME/mnt/Qualifire && GIT_OPTIONAL_LOCKS=0 git diff --name-only; GIT_OPTIONAL_LOCKS=0 git ls-files --others --exclude-standard -- .easignore app/tests/easignore_suite.ts`
   — `git diff` lists only `app/tests/run.ts` (plus anything that was already modified before
   you started — note it, do not touch it); the second lists the two new files.

### Nathan, PC (needs npx/eas — copy-paste, PowerShell)

Before the executor lands the file (or take 1.1 GB from the build-7 log), and after:

```
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\cycles\virgin-cycle19\measure.ps1" -Archive
```

Runs `eas-cli build:inspect --platform android --profile preview --stage archive` into
`safe_to_delete\eas-archive-inspect` and prints `ARCHIVE <n> MB` plus one line per top-level
entry. Expected before: ~1,100 MB, `.git` and `marketing` listed. **Expected after: ~8 MB,
`app` the only entry** (no `.git`). If after shows `ARCHIVE 0.0 MB` or no `app` line: do not
build — report it. Paste both runs into `cycles\virgin-cycle19\PROGRESS.md`.

Optional (fingerprint unchanged by 02 — informational only, build 8 is native anyway):

```
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\cycles\virgin-cycle19\measure.ps1" -Fingerprint
```

## Inspect checklist (fresh Opus, reruns everything itself)

1. `.easignore` byte-for-byte equal to the block above (`diff` against a heredoc copy); LF,
   no BOM; at repo root; `app/.easignore` absent.
2. `easignore_suite.ts` equal to the block above; `run.ts` differs from HEAD by exactly one
   added line at 66 (`GIT_OPTIONAL_LOCKS=0 git diff app/tests/run.ts`).
3. Rerun Verification 1-6; numbers match (846/843/0/3; tsc exit 0; `files 245`,
   `tops app`, `.git dropped … true`; one `.gpx` line).
4. Adversarial: temporarily run the step-3 simulation with `!/app` replaced by `!/app/` in a
   COPY under `/tmp` (`sed 's#^!/app$#!/app/#' .easignore > /tmp/bad.easignore`, point
   `sim.cjs` at it) — must print `files 0`. Proves the suite and the simulation guard the
   real failure. Never edit the real file.
5. Independently re-grep for paths escaping `app/` (`grep -rnE "\.\./\.\./" app/src app/core
   app/modules app/plugins app/App.tsx app/app.config.js`): only
   `app/core/harness/parity.ts:22` (runtime dev-tool default, not an import).
6. No other file changed; nothing deleted; no `npm`/`npx`/`eas` run.

## On-device checklist

None — nothing reaches the phone. The check is the next build's log line
"Compressed project files … (N MB)" (expected single-digit MB).

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
- **Brief 03 needs a one-word refresh (not done here):** `03-refresh-build-scripts.md:137-138`
  makes `build8.ps1` section 7 assert the line `!/app/`; with this file it must assert `!/app`
  (and ideally that `!/app/` is absent). Coordinator / brief-03 refresh to fix before 03 runs.

## Open calls (default chosen — executor does NOT stop)

- **A. Allow-list vs deny-list.** Default: allow-list `app` (Decision 1). Alternative Nathan
  might prefer for readability: keep the repo and only deny `marketing`, `Claude outputs`,
  `safe_to_delete`, `_to_delete`, `.git` — ~10x smaller instead of ~100x, rots when new root
  folders appear.
- **B. `app/README-dev.md` / `HOW-THE-APP-IS-BUILT.md` mention?** Default: no doc edits here;
  the cycle README + brief 03's `scripts/README.md` carry the explanation.
