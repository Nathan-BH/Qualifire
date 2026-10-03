# 01 — Stop shipping the Leuven seed (catalog, ghost times, `ways.json`, 3 route PNGs) in blank-seed builds

**Source: Nathan, 2026-09-30** — "Why are all these route map assets shipped, if this app is
supposed to be virgin or at least widely used?" (build preflight section 6 listed 20 Leuven
routes + Morning/EveningA/EveningB PNGs).

**Status: brief only. Nothing below is in the app.** Written 2026-09-30 by the Plan tier
(Fable) against the working tree (branch `virgin`, HEAD `ae911bb`, 784 tests / 781 pass /
0 fail / 3 skip, re-run 2026-09-30). Executor: Sonnet, cold, this file only.

## What this changes on the phone — and what it does not

- **Behaviour: nothing.** The blank-seed app already *ignores* the seed at runtime
  (`store/seed.ts` `bundledForSeedMode` returns `{}` and `catalogForSeedMode('empty')` never
  touches the JSON). After this brief it ignores stubs instead of the real files. Same screens,
  same empty catalog, same DEMO tab (DEMO uses its own fixture, untouched — see Open call A).
- **Bytes: the APK / OTA bundle loses ~4.1 MB** (three PNGs 1,302,486 + 1,299,562 + 1,285,151
  bytes, `ways.json` 159 KB, `catalog.seed.json` 13 KB, `results.seed.json` 32 KB) **and no
  longer contains Nathan's commute** — the landmark ids `home`/`work`/`church`/`fosh`/`station`
  with their coordinates, the 20 route/way ids, 10 `home2work` archive results, and the three
  rendered maps of his routes. Today every stranger's install carries all of that.
- **Already-installed APKs keep the old bytes until reinstalled.** An OTA replaces the JS
  bundle and downloads only the assets the new bundle references; the old PNGs stay in the
  updater's cache on that phone, unused, until the next APK install.
- **Dev client:** `npx expo start` (default, empty) — the dev client stops receiving the
  seed too; `dev-phone.ps1 shipped` / `$env:EXPO_PUBLIC_SEED_MODE = "shipped"` keeps working
  and bundles the real files. Switching modes needs a Metro restart (`--clear` is safest) —
  already true today because the env value is inlined at bundle time.

## Evidence that the bytes ship today (read 2026-09-30, `app/dist/` = the 2026-09-29 07:19 export made by `publish-preview.ps1` with `EXPO_PUBLIC_SEED_MODE=empty`)

- `app/dist/assetmap.json` names assets `Morning`, `EveningA`, `EveningB` (png); their files
  under `app/dist/assets/` are byte-for-byte the sizes of `app/assets/ways/*.png` above.
- `app/dist/_expo/static/js/android/AppEntry-7f445fbd….hbc` contains the strings
  `home2work` (5x), `seed:2026` (9x), `WorkHomeDry`, `WorkHomeWet`, `MorningB`, `rideResult`.
- Why: Metro resolves `import`/`require` statically, before any env logic runs.
  `seed.ts` lines 31-32 import both JSONs; `wayMapView.tsx` line 86 imports `ways.json` and
  lines 172-174 `require` the PNGs. `seed.ts`'s own comment (line 64-65) admits it: "the bytes
  still ship; this makes them unreachable".

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-30. If a quoted
  line is not where the brief says, or a name differs, stop and report the mismatch verbatim
  (file, line, expected, found). Never guess, never patch around it.
- No commit unless told (`GIT_OPTIONAL_LOCKS=0 git …`; a leftover `.git/index.lock` is
  `mv`'d aside, never deleted). Never delete — `safe_to_delete/` is the bin.
- **No `npm install`, no `npx expo …`, no `eas …` in the cloud** (no network). The export
  inspection in §Verification step 3 is Nathan's, from `COMMANDS.md`.
- **Files touched — exactly these, nothing else:**
  - NEW `app/metro.config.js`
  - NEW `app/assets/seed-stubs/catalog.empty.json`
  - NEW `app/assets/seed-stubs/results.empty.json`
  - NEW `app/assets/seed-stubs/ways.empty.json`
  - NEW `app/assets/seed-stubs/blank.png`
  - NEW `app/tests/seedstubs_suite.ts`
  - EDIT `app/tests/run.ts` (one import line)
  - EDIT `app/src/store/seed.ts` (comment only, lines 59-68 — see Files)
- Do **not** touch `wayMapView.tsx`, `seed.ts`'s code, any `*.seed.json`, `assets/ways/`,
  `demoWayFixture.ts`, `eas.json`, `app.json`, `app.config.js`, `package.json`, any
  `scripts/*.ps1`, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, this folder's `README.md`.
- The headless suite runs under plain Node (`--experimental-strip-types`, ESM): it never
  loads `metro.config.js` (that is a CommonJS file for Metro only) and must keep loading the
  REAL seed (`tests/seedmode_pin.ts` pins `shipped`). The new suite reads files as text/JSON
  only.

## Goal

A blank-seed bundle (`EXPO_PUBLIC_SEED_MODE` anything but `shipped`) contains none of
`catalog.seed.json`, `results.seed.json`, `assets/ways/ways.json`, `Morning.png`,
`EveningA.png`, `EveningB.png`. A `shipped` bundle (dev client on request, the headless suite)
contains all of them exactly as today. No app source changes; `SEED_MODE` /
`bundledForSeedMode` / `catalogForSeedMode` / `resultsForSeedMode` semantics untouched.

## Current state (verified 2026-09-30)

- `app/src/store/seed.ts` — line 31 `import catalogJson from './catalog.seed.json';`, line 32
  `import resultsJson from './results.seed.json';`, lines 38-39 `SEED_MODE` from
  `process.env.EXPO_PUBLIC_SEED_MODE`, line 69 `export function bundledForSeedMode<T>(…)`.
- `app/src/ui/wayMapView.tsx` — line 86 `import manifest from '../../assets/ways/ways.json';`,
  line 89 `import { SEED_MODE, bundledForSeedMode } from '../store/seed.ts';`, lines 151-153
  `const ASSETS … bundledForSeedMode(SEED_MODE, (manifest …).ways)`, lines 171-175
  `const IMAGES … { Morning: require('../../assets/ways/Morning.png'), EveningA: …, EveningB: … }`.
- `app/metro.config.js` — **does not exist** (Expo's default config applies).
  `app/node_modules/@expo/metro-config` 56.0.18, `metro` 0.84.4, `expo` 56.0.19.
- `app/assets/ways/ways.json` — top-level keys `schemaVersion`, `projection`, `ways` (20).
- Tests that read the real seed/manifest from disk by path (must keep working, unaffected
  because the files stay where they are): `store_suite.ts` (many), `migrations_suite.ts`
  75/139, `routecreation_suite.ts` 352, `sectortrail_suite.ts` 37, `waymap_suite.ts` 21-25,
  `waymapgeo_suite.ts` 22, `virginmanifest_suite.ts` 83. Tests that import `seed.ts` through
  the JSON `registerHooks` shim: `catalogstore_suite`, `sportstore_suite`, `catalogdelete_suite`,
  `virginmanifest_suite` (41) and the suites their comments list — all under `shipped`.
- `tests/virginmanifest_suite.ts` lines 255-271 scan `src/**` (code outside comments) for the
  substrings `ways.json` / `assets/ways/` and allow only `ui/routeMapView.tsx` — the new files
  live in `app/` and `app/assets/`, not `src/`, and the stub is named `ways.empty.json`, so
  the scan is unaffected. Lines 279-284 require `bundledForSeedMode(SEED_MODE` twice and the
  exact import line in `wayMapView.tsx` — untouched.
- `tests/run.ts` — line 13 `import './seedmode_pin.ts';` (must stay first), line 61
  `import './ridenotification_suite.ts';`, line 62 `import { runAll } from './lib.ts';`.

## Decisions

1. **Mechanism: a Metro resolver redirect, not a source change.** `app/metro.config.js`
   wraps the default resolver; when `process.env.EXPO_PUBLIC_SEED_MODE !== 'shipped'` (the
   same constant `seed.ts` inlines) any resolution that lands on one of the six real files is
   redirected to a stub in `app/assets/seed-stubs/`. Metro then never sees the real bytes, in
   dev serving, `expo export`, `eas update` (publish-preview bundles locally) and `eas build`
   (the EAS server runs the same `metro.config.js` with `eas.json`'s env) alike.
   Alternatives weighed:
   - *Conditional `require` inside `if (process.env.EXPO_PUBLIC_SEED_MODE === 'shipped')`*,
     relying on Metro's constant folding to drop the branch: only runs in production
     transforms (dev bundles keep the bytes — acceptable), but `seed.ts` is imported by the
     Node ESM test suite where `require` is undefined → would need `typeof require` guards
     and a `createRequire` dance in app code. Rejected: touches app code, fragile.
   - *Split files (`seed.shipped.ts` / `seed.empty.ts`) picked by a resolver*: the same
     resolver trick but with two source files to keep in sync plus test-import churn.
     Rejected: strictly more work for the same result.
   - *Move the seed out of `app/` into `dev-seed/`*: 14 test files read the JSON by path.
     Rejected: churn without benefit.
2. **Stubs are real files with the right shape**, not `type: 'empty'` resolutions:
   `catalog.empty.json` = `{}` (never read: `catalogForSeedMode('empty')` returns
   `emptyCatalog()`), `results.empty.json` = `[]`, `ways.empty.json` =
   `{"schemaVersion": 2, "projection": null, "ways": {}}` (`.ways` is read at module init,
   `wayMapView.tsx` 152), `blank.png` = a 1x1 transparent PNG (the three `require`s all resolve
   to it → one ~70-byte asset in the bundle instead of 3.9 MB).
3. **Redirect after default resolution, by resolved absolute path** (not by module-name
   string): robust to relative-path spelling and to Android asset-scale variants
   (`assetFiles` resolutions carry `filePaths[]`). The redirected asset is re-resolved through
   the default resolver so it is registered as an asset the normal way.
4. **Pinned by a headless test** (`seedstubs_suite.ts`): the config exists, names all six
   real paths and `EXPO_PUBLIC_SEED_MODE`, the four stubs exist and parse / carry the PNG
   signature. Without this, a deleted `metro.config.js` would silently re-ship everything.
5. **`seed.ts` keeps its API and its `bundledForSeedMode` guard** — belt and braces: the
   runtime guard still empties the manifest even if someone bundles with a stale Metro cache.
   Only its comment (lines 59-68, "the bytes still ship") is corrected.
6. **Fingerprint:** `@expo/fingerprint`'s Expo sourcer hashes the Expo config, icons, config
   plugins, `eas.json`, `.easignore`, autolinking and `cng-patches` — `metro.config.js` is not
   in that list (read from the sourcer 2026-09-30), so this brief is expected to be OTA-able
   to the freshly rebuilt Preview. **Expected, not proven** — Nathan runs `COMMANDS.md` §3
   before and after; if the hash moves, this brief ships with build 8 instead.

## Files to touch

### NEW `app/metro.config.js`

```js
// Qualifire — Metro config (virgin-cycle19 brief 01, 2026-09-30).
// The ONLY thing this does: when the bundle is NOT the shipped-seed one
// (EXPO_PUBLIC_SEED_MODE !== 'shipped' — the same constant src/store/seed.ts
// inlines), the six Leuven seed files are swapped for stubs at RESOLUTION time,
// so Metro never bundles the real catalog, archive ghosts, way manifest or the
// three pre-rendered route PNGs (about 4.1 MB, and Nathan's commute geometry).
// The runtime guard in seed.ts (bundledForSeedMode / catalogForSeedMode) stays;
// this closes the "bytes still ship" hole it documents. tests/seedstubs_suite.ts
// pins this file and the stubs.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const SEED_MODE = process.env.EXPO_PUBLIC_SEED_MODE === 'shipped' ? 'shipped' : 'empty';
const STUBS = path.join(__dirname, 'assets', 'seed-stubs');
const REDIRECT = new Map([
  [path.join(__dirname, 'src', 'store', 'catalog.seed.json'), path.join(STUBS, 'catalog.empty.json')],
  [path.join(__dirname, 'src', 'store', 'results.seed.json'), path.join(STUBS, 'results.empty.json')],
  [path.join(__dirname, 'assets', 'ways', 'ways.json'), path.join(STUBS, 'ways.empty.json')],
  [path.join(__dirname, 'assets', 'ways', 'Morning.png'), path.join(STUBS, 'blank.png')],
  [path.join(__dirname, 'assets', 'ways', 'EveningA.png'), path.join(STUBS, 'blank.png')],
  [path.join(__dirname, 'assets', 'ways', 'EveningB.png'), path.join(STUBS, 'blank.png')],
]);

const previousResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = previousResolveRequest ?? context.resolveRequest;
  const resolution = resolve(context, moduleName, platform);
  if (SEED_MODE === 'shipped') return resolution;
  if (resolution.type === 'sourceFile') {
    const stub = REDIRECT.get(path.normalize(resolution.filePath));
    if (stub) return { type: 'sourceFile', filePath: stub };
  }
  if (resolution.type === 'assetFiles') {
    const hit = resolution.filePaths.map((p) => path.normalize(p)).find((p) => REDIRECT.has(p));
    if (hit) return resolve(context, REDIRECT.get(hit), platform);
  }
  return resolution;
};

module.exports = config;
```

Notes for the executor: keep it CommonJS (`require`/`module.exports`) — Metro loads it with
Node's CJS loader. `path.normalize` makes the Windows (`\`) and POSIX spellings compare equal.
`app/node_modules/expo/metro-config.js` is `module.exports = require('@expo/metro-config')`
and `@expo/metro-config/build/ExpoMetroConfig.js` line 8 exports `getDefaultConfig` (verified
2026-09-30). The executor cannot run Metro in the cloud; syntax-check the file with
`node --check app/metro.config.js` only.

### NEW stubs in `app/assets/seed-stubs/`

- `catalog.empty.json`: `{}`
- `results.empty.json`: `[]`
- `ways.empty.json`: `{"schemaVersion": 2, "projection": null, "ways": {}}`
- `blank.png`: a valid 1x1 transparent PNG. Generate it (no retyping bytes):

```python
import struct, zlib
def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 6, 0, 0, 0)) \
    + chunk(b'IDAT', zlib.compress(b'\x00\x00\x00\x00\x00')) + chunk(b'IEND', b'')
open('app/assets/seed-stubs/blank.png', 'wb').write(png)
```

### NEW `app/tests/seedstubs_suite.ts`

Pure text/JSON checks, `test`/`assert`/`loadJson`/`TESTS_DIR` from `./lib.ts`, `node:fs`,
`node:path` — same style as `virginmanifest_suite.ts`'s file scans. Tests (name them
`virgin-cycle19 01: …`):

1. `app/metro.config.js` exists and its text contains `EXPO_PUBLIC_SEED_MODE`,
   `resolveRequest`, and each of: `'catalog.seed.json'`, `'results.seed.json'`,
   `'ways', 'ways.json'`, `'Morning.png'`, `'EveningA.png'`, `'EveningB.png'`,
   `'seed-stubs'`.
2. The three JSON stubs exist and parse; `ways.empty.json` has `ways` equal to `{}`;
   `results.empty.json` is an empty array.
3. `blank.png` exists, starts with the 8-byte PNG signature, and is under 200 bytes.
4. The six real files still exist at their real paths (the redirect is a bundler concern; the
   shipped mode and the suite need the originals): `src/store/catalog.seed.json`,
   `src/store/results.seed.json`, `assets/ways/ways.json`, `assets/ways/{Morning,EveningA,EveningB}.png`.

### EDIT `app/tests/run.ts`

Insert `import './seedstubs_suite.ts';` after line 61 (`import './ridenotification_suite.ts';`),
before `import { runAll } from './lib.ts';`. `seedmode_pin.ts` stays first.

### EDIT `app/src/store/seed.ts` (comment only)

In the doc comment above `bundledForSeedMode` (lines 59-68), replace the sentence
"Static imports are resolved by Metro before any env logic runs, so the bytes still ship;
this makes them unreachable: every consumer sees `{}`." with: "Static imports are resolved
by Metro before any env logic runs; since virgin-cycle19 (2026-09-30) `app/metro.config.js`
redirects the seed files to stubs in `assets/seed-stubs/` on non-shipped bundles, so the
bytes no longer ship either; this guard stays as the runtime belt to that braces: every
consumer sees `{}`." No code line changes; `tsc` must not notice.

## Verification plan

1. `cd app && node --experimental-strip-types tests/run.ts` — expect **788 tests / 785 pass /
   0 fail / 3 skip** (784 + the 4 new; 791 / 788 / 0 / 3 if brief 02's 3 tests landed first,
   which is the README's order). Zero FAIL is the bar; report the exact line.
2. `cd app && ./node_modules/.bin/tsc --noEmit` — clean, exit 0. (`metro.config.js` is
   excluded by `expo/tsconfig.base.json`'s `exclude` list — verified 2026-09-30 — so `tsc`
   never sees it; if it somehow complains, stop and report.)
3. **Export inspection — Nathan, on his PC, `COMMANDS.md` §4.** Expected after this brief:
   `assetmap.json` lists no `Morning`/`EveningA`/`EveningB`; the `.hbc` contains none of
   `home2work`, `seed:2026`, `WorkHomeDry`; `dist/assets/` holds no file over 1 MB from this
   seed; the bundle is ~200 KB smaller than the 2026-09-29 one (2,622,188 bytes). Then the
   same export with `$env:EXPO_PUBLIC_SEED_MODE = "shipped"` must list all three PNGs again.
   Paste both results into `PROGRESS.md` in this folder.
4. **Fingerprint — Nathan, `COMMANDS.md` §3** before and after; same hash expected.
5. Inspect (fresh Opus): reruns 1-2, reads `metro.config.js` against Decision 3, confirms no
   file outside the list changed (`git status --porcelain`).

## On-device checklist (after `publish-preview.ps1`, or after build 8 if §3/§4 said so)

1. Fresh install (or Reset app): RECORD/ROUTES/RESULTS all empty, as today.
2. DEMO tab: FIRST / SECOND / TENTH RIDE still play with the map drawn (the DEMO fixture is
   separate — unchanged).
3. Record one short ride, name it, ride it again: gates, self dot, reveal — as today.
4. SETTINGS → DATA → share `catalog.user.json`: no `home`/`work`/`church`/`fosh`/`station`
   entries unless the rider made them.

## Out of scope

- `demoWayFixture.ts` (Open call A). `seed.ts` code. Deleting the real seed files (the
  shipped dev mode and 14 test files need them). Any script change (brief 03). The archive
  size (brief 02).

## Open calls (default chosen — executor does NOT stop for these)

- **A. DEMO fixture is Nathan's real commute.** `src/ui/demoWayFixture.ts` lines 33-37 hold
  START/G1/G2/G3/FINISH at lat 50.836…/lon 4.640… → 50.8636/4.686 — the "Morning" home→work
  route, hard-coded, shipped in every build by Nathan's 2026-09-03 ruling ("DEMO replays its
  own frozen fixture"). **Default: keep, untouched** (it is a demo track with generic gate
  names; nothing labels it as anyone's home). Menu for Nathan in the cycle README.
- **B. Stub location** `app/assets/seed-stubs/` (default) vs `app/src/store/seed-stubs/`:
  assets, because one of them is a PNG and `virginmanifest_suite` scans `src/`.
