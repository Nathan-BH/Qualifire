# 01 — Stop shipping the Leuven seed (catalog, ghost times, `ways.json`, 3 route PNGs) in blank-seed builds

**Source: Nathan, 2026-09-30** — "Why are all these route map assets shipped, if this app is
supposed to be virgin or at least widely used?" (build preflight section 6 listed 20 Leuven
routes + Morning/EveningA/EveningB PNGs).

**Status: brief REFRESHED 2026-10-03 against HEAD `1f5e150` (branch `virgin`, cycle20
landed; baseline 838 tests / 835 pass / 0 fail / 3 skip, tsc 0). Started by the Plan tier on
Fable (cut off by a rate limit mid-refresh), finished and re-verified line by line by the Plan
tier on Opus the same day, then re-checked by a second Opus Plan pass (anchors, DEMO, Expo 56.0.19 /
Metro 0.84.4 resolver chain). Nothing below is in the app.** The 2026-09-30 version of this brief is archived in
`safe_to_delete/cycle19-briefs-2026-09-30/`. Executor: Sonnet, cold, this file only.
**Run order: brief 02 first, then this one, then 03** (see README "Run order").

**Ships WITH build 8** (Nathan, 2026-10-03). This is no longer an OTA candidate: build 8 is the
next native build (cycle20's notification module + `app.json` permission string need it), so
this brief rides it. `metro.config.js` is bundler config; whether it moves the native
fingerprint no longer matters. An OTA published AFTER build 8 from the same tree matches
build 8's fingerprint (`publish-preview.ps1` derives the runtime version from the tree, and
the Metro redirect runs identically in its local bundle) — nothing to do there.

## What this changes on the phone — and what it does not

- **Behaviour: nothing.** The blank-seed app already *ignores* the seed at runtime
  (`store/seed.ts` `bundledForSeedMode` returns `{}` and `catalogForSeedMode('empty')` never
  touches the JSON). After this brief it ignores stubs instead of the real files. Same screens,
  same empty catalog, **same DEMO tab** (§DEMO below — verified, and pinned by a test).
- **Bytes: the APK / bundle loses ~4.1 MB** (three PNGs 1,302,486 + 1,299,562 + 1,285,151
  bytes, `ways.json` 159 KB, `catalog.seed.json` 13 KB, `results.seed.json` 32 KB): the
  landmark ids `home`/`work`/`church`/`fosh`/`station` with their coordinates, the seed
  catalog's 20 way definitions, the 30 archive ghost results, and the three rendered maps.
- **What still ships after this brief (NOT fixed here — say so to Nathan, do not claim
  "no Leuven left"):** (1) `src/live/refs.ts` line 20 `import refsJson from
  '../../tests/fixtures/refs.json';` — 638 KB, the reference polylines of the same 20 Leuven
  tracks (`Morning`, `EveningA`, … with `lat0`/`lon0`), bundled in EVERY build, consumed by
  `refFor()` / `TRACK_IDS`; it is not behind `bundledForSeedMode` at all. Stubbing it changes
  runtime lookups (`refFor` on an unknown id falls through to `userRefFor`) and needs its own
  Digest of every `refFor`/`TRACK_IDS` consumer — parked as a follow-up in the README, not
  this brief. (2) `src/store/defaultWay.ts` `WAY_DISPLAY_ID` (display names such as
  `WorkHomeDry`) — strings only, no geometry. (3) the DEMO fixture (Open call A).
- **Dev client:** `npx expo start` (default, empty) stops receiving the seed too;
  `dev-phone.ps1 shipped` / `$env:EXPO_PUBLIC_SEED_MODE = "shipped"` keeps working and bundles
  the real files. Switching modes needs a Metro restart with `--clear` (the env value is
  inlined at bundle time — already true today).

## Evidence that the bytes ship today (read 2026-09-30; `app/dist/` = the 2026-09-29 export made with `EXPO_PUBLIC_SEED_MODE=empty`)

- `app/dist/assetmap.json` names assets `Morning`, `EveningA`, `EveningB`; their files under
  `app/dist/assets/` are byte-for-byte the sizes of `app/assets/ways/*.png` above.
- The `.hbc` under `app/dist/_expo/static/js/android/` (2,622,188 bytes) contains
  `seed:2026` (only in `results.seed.json`), `puttestraat` (only in `catalog.seed.json`) and
  `web-mercator` (only in `ways.json`) — re-checked 2026-10-03 with `grep -c -a`: 9 / 1 / 1
  hits. These three are the sentinels: each lives in exactly one of the redirected files and
  nowhere else in `src/`, `core/src/`, `tests/fixtures/refs.json` or the bundled
  `node_modules` JS. **Do NOT use `home2work` or `WorkHomeDry` as sentinels** (the 2026-09-30
  `measure.ps1` did): `home2work` is also in `refs.json` (still shipped, see above) and
  `WorkHomeDry` is a code literal in `src/store/defaultWay.ts` line 17 — both stay in the
  bundle after this brief and would report a false "seed IS in the bundle".
- Why: Metro resolves `import`/`require` statically, before any env logic runs. `seed.ts`
  lines 31-32 import both JSONs; `wayMapView.tsx` line 86 imports `ways.json` and lines 172-174
  `require` the PNGs. `seed.ts`'s own comment (lines 63-64) admits it: "the bytes still ship;
  this makes them unreachable".

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was re-read from the tree on 2026-10-03. If a
  quoted line is not where the brief says, or a name differs, stop and report the mismatch
  verbatim (file, line, expected, found). Never guess, never patch around it, never rule on
  an open question yourself.
- No commit unless told (`GIT_OPTIONAL_LOCKS=0 git …`; a leftover `.git/index.lock` is
  `mv`'d aside, never deleted). Never delete — `safe_to_delete/` is the bin.
- **No `npm install`, no `npx expo …`, no `eas …` in the cloud** (no network). The export
  inspection is Nathan's (`COMMANDS.md` §4 / `measure.ps1 -Export`).
- **Files touched — exactly these, nothing else:**
  - NEW `app/metro.config.js`
  - NEW `app/metro.seedRedirect.js`
  - NEW `app/assets/seed-stubs/catalog.empty.json`
  - NEW `app/assets/seed-stubs/results.empty.json`
  - NEW `app/assets/seed-stubs/ways.empty.json`
  - NEW `app/assets/seed-stubs/blank.png`
  - NEW `app/tests/seedstubs_suite.ts`
  - EDIT `app/tests/run.ts` (one import line)
  - EDIT `app/src/store/seed.ts` (comment only, lines 59-68 — see Files)
  - EDIT `cycles/virgin-cycle19/measure.ps1` (sentinel list, line 106 — see Files)
  - EDIT `cycles/virgin-cycle19/COMMANDS.md` (§4 expected-output text, lines 58-62 — see Files)
- Do **not** touch `wayMapView.tsx`, `seed.ts`'s code, any `*.seed.json`, `assets/ways/`,
  `demoWayFixture.ts`, `DemoScreen.tsx`, `eas.json`, `app.json`, `app.config.js`,
  `package.json`, `tsconfig.json`, any `scripts/*`, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`,
  this folder's `README.md`, `src/live/refs.ts`, `tests/fixtures/refs.json`,
  `src/store/defaultWay.ts`, `.easignore` (brief 02's). No rider-facing string is added anywhere
  (`tests/ui-strings.allow.json` untouched).
- The headless suite runs under plain Node (`--experimental-strip-types`, ESM): it never
  loads `metro.config.js` (CommonJS, Metro-only, requires `expo/metro-config`) and must keep
  loading the REAL seed (`tests/seedmode_pin.ts` pins `shipped`). The new suite reads files
  as text/JSON and loads ONLY `metro.seedRedirect.js` (dependency-free CJS) via
  `createRequire`.

## Goal

A blank-seed bundle (`EXPO_PUBLIC_SEED_MODE` anything but `shipped`) contains none of
`catalog.seed.json`, `results.seed.json`, `assets/ways/ways.json`, `Morning.png`,
`EveningA.png`, `EveningB.png`. A `shipped` bundle (dev client on request, the headless suite)
contains all of them exactly as today. No app source changes; `SEED_MODE` /
`bundledForSeedMode` / `catalogForSeedMode` / `resultsForSeedMode` semantics untouched. The
DEMO tab is byte-for-byte unaffected.

## Current state (re-verified 2026-10-03 against HEAD `1f5e150`)

- `app/src/store/seed.ts` — line 31 `import catalogJson from './catalog.seed.json';`, line 32
  `import resultsJson from './results.seed.json';`, lines 38-39 `SEED_MODE` from
  `process.env.EXPO_PUBLIC_SEED_MODE`, line 69 `export function bundledForSeedMode<T>(…)`.
  Lines 59-68 are the doc comment quoted under Files.
- `app/src/ui/wayMapView.tsx` — line 86 `import manifest from '../../assets/ways/ways.json';`,
  line 89 `import { SEED_MODE, bundledForSeedMode } from '../store/seed.ts';`, lines 151-153
  `const ASSETS … bundledForSeedMode(SEED_MODE, (manifest …).ways)`, lines 171-175
  `const IMAGES … { Morning: require('../../assets/ways/Morning.png'), EveningA: …, EveningB: … }`.
  Line 361 and 963: `const asset = props.asset ?? assetFor(id) ?? undefined;` — an explicit
  `asset` prop bypasses the manifest lookup. Line 964: `const img = id !== null ? IMAGES[id] : undefined;`.
- `app/metro.config.js` — **does not exist**; `app/babel.config.js` does not exist either
  (Expo defaults apply). `app/node_modules/expo/metro-config.js` re-exports
  `@expo/metro-config`; `@expo/metro-config/build/ExpoMetroConfig.js` line 8
  `exports.getDefaultConfig = getDefaultConfig;` (line 149 is the function).
- `app/node_modules/expo/tsconfig.base.json` `exclude` lists `${configDir}/metro.config.js`
  (and `babel.config.js`, `jest.config.js`, `android`, `ios`, `node_modules`) — so `tsc`
  never sees `metro.config.js`. It DOES see every other `.js` at the app root (`allowJs: true`,
  no `include` → `app.config.js` and `plugins/withShowWhenLocked.js` are already parsed, with
  `checkJs` off → syntax only). `metro.seedRedirect.js` will be parsed the same way.
- `app/assets/ways/ways.json` — top-level keys `schemaVersion` (value **1**), `projection`
  (`"web-mercator"`), `ways` (20 entries).
- `app/package.json` has no `"type"` field → `.js` files under `app/` are CommonJS (same as
  `plugins/withShowWhenLocked.js`, which `tests/lockscreen_suite.ts` already loads through
  `createRequire`). Metro / Expo CLI (SDK 56,
  `node_modules/@expo/cli/build/src/start/server/metro/withMetroResolvers.js` lines 47-88) run a
  user `config.resolver.resolveRequest` FIRST and hand it a context whose `resolveRequest` is
  Expo's own chain — so calling `context.resolveRequest(...)` from ours is the documented
  chaining. `getDefaultConfig` sets no `resolveRequest` of its own (grep of
  `ExpoMetroConfig.js`: none).
- Tests that read the real seed/manifest from disk by path (must keep working, unaffected
  because the files stay where they are): `waymap_suite.ts` 20-25 (`assets/ways/ways.json`,
  `src/store/catalog.seed.json`), `store_suite.ts`, `migrations_suite.ts`,
  `routecreation_suite.ts`, `sectortrail_suite.ts`, `waymapgeo_suite.ts`,
  `virginmanifest_suite.ts`.
- `tests/virginmanifest_suite.ts` lines 240-271 walk `src/**/*.ts(x)` and, outside comments,
  flag `ways.json` / `assets/ways/` — the new files live in `app/` and `app/assets/`, not
  `src/`, so the scan is unaffected. Lines 273-284 require `bundledForSeedMode(SEED_MODE`
  twice in `wayMapView.tsx` — untouched. Lines 286-288 already assert `DemoScreen.tsx` has no
  `ways.json` / `'Morning'`.
- `tests/run.ts` (69 lines) — line 13 `import './seedmode_pin.ts';` (must stay first),
  line 65 `import './ui_strings_suite.ts';` (the last suite import), line 66
  `import { runAll } from './lib.ts';`. If brief 02 landed first (README order), line 66 is
  `import './easignore_suite.ts';` and `runAll` is line 67 — insert after the easignore line.
- `tests/lib.ts` exports `TESTS_DIR` (16), `test` (30), `assert` (34), `loadJson` (100).

## DEMO tab — verified unaffected (2026-10-03), and pinned

- Importers of `demoWayFixture.ts`: only `src/ui/demoModel.ts` (line 31) and
  `src/ui/DemoScreen.tsx` (line 112). `demoWayFixture.ts` has ONE import, line 15
  `import type { WayAsset } from './wayMapMath.ts';`. It imports none of the six seed files.
- `DEMO_WAY_ASSET` (line 21) has `image: ''` (line 22) — no PNG. `DEMO_WAY_ID =
  'demo:second-ride'` (line 19) is not a key of `ways.json` nor of `IMAGES`.
- `DemoScreen.tsx` line 665 passes `wayId={DEMO_WAY_ID} asset={DEMO_WAY_ASSET}` → `wayMapView`
  line 963 takes `props.asset`, never the manifest; line 964 `IMAGES['demo:second-ride']` is
  `undefined` today and after. Line 662 (`DEMO_FIRST_RIDE_ID`, no asset prop) resolves
  through `ASSETS`, which is already `{}` in every empty-mode bundle.
- Grep of importers of `catalog.seed.json`, `results.seed.json`, `ways.json`, the three PNGs
  across `src/`, `App.tsx`, `modules/`, `plugins/`: code hits are ONLY `seed.ts` 31-32 and
  `wayMapView.tsx` 86, 172-174 (everything else is comments).
- **Conclusion:** none of the six redirected files is on any DEMO import path, and DEMO's own
  asset is an in-code object, not a file the resolver ever sees. The redirect table is keyed
  on six absolute paths; `src/ui/demoWayFixture.ts` is not one of them. Tests 5-6 below pin
  all of this. No STOP condition triggered.

## Decisions

1. **Mechanism: a Metro resolver redirect, not a source change.** `app/metro.config.js`
   wraps the default resolver; when `process.env.EXPO_PUBLIC_SEED_MODE !== 'shipped'` (the
   same constant `seed.ts` inlines) any resolution that lands on one of the six real files is
   redirected to a stub in `app/assets/seed-stubs/`. Metro then never sees the real bytes, in
   dev serving, `expo export`, `eas update` (publish-preview bundles locally) and `eas build`
   (the EAS server runs the same `metro.config.js` with `eas.json`'s env) alike.
   Alternatives (conditional `require` + constant folding; split seed files; moving the seed
   out of `app/`) were weighed on 2026-09-30 and rejected: each touches app code or 14 test
   files for the same result.
2. **The redirect logic lives in a dependency-free CJS module, `app/metro.seedRedirect.js`**,
   and `metro.config.js` only wires it in. Reason: the headless suite cannot load
   `metro.config.js` (it pulls `expo/metro-config`), but it CAN `createRequire` a plain
   module and exercise the exact function Metro will run — with real resolutions for the six
   files, for DEMO's fixture path, in both modes. That turns "the config exists" into "the
   redirect behaves" without Metro.
3. **Stubs are real files with the right shape**, not `type: 'empty'` resolutions:
   `catalog.empty.json` = `{}` (never read: `catalogForSeedMode('empty')` returns
   `emptyCatalog()`), `results.empty.json` = `[]`, `ways.empty.json` =
   `{"schemaVersion": 1, "projection": null, "ways": {}}` (`.ways` is read at module init,
   `wayMapView.tsx` 152; `schemaVersion` mirrors the real file's `1`), `blank.png` = a 1x1 transparent PNG (the three `require`s all resolve
   to it → one ~70-byte asset in the bundle instead of 3.9 MB).
4. **Redirect after default resolution, by resolved absolute path** (not by module-name
   string): robust to relative-path spelling. A `sourceFile` hit becomes
   `{ type: 'sourceFile', filePath: stub }`; an `assetFiles` hit becomes
   `{ type: 'assetFiles', filePaths: [blank.png] }` directly (no re-resolution: `blank.png`
   has no `@2x` variants, so there is nothing for Metro's asset resolver to add).
5. **Pinned by a headless test** (`seedstubs_suite.ts`). Without it, a deleted
   `metro.config.js` would silently re-ship everything.
6. **`seed.ts` keeps its API and its `bundledForSeedMode` guard** — belt and braces: the
   runtime guard still empties the manifest even if someone bundles with a stale Metro cache.
   Only its comment (lines 59-68, "the bytes still ship") is corrected.
7. **Fingerprint: irrelevant** — this rides build 8 (header). The old "expected unchanged /
   OTA" framing is withdrawn.

## Files to touch

### NEW `app/metro.seedRedirect.js` (dependency-free CommonJS)

```js
// Qualifire -- Metro seed redirect (virgin-cycle19 brief 01, 2026-10-03).
// Pure, dependency-free, so tests/seedstubs_suite.ts can run it under plain Node.
// metro.config.js wires it into Metro's resolver. When the bundle is NOT the
// shipped-seed one (EXPO_PUBLIC_SEED_MODE !== 'shipped' -- the same constant
// src/store/seed.ts inlines) the six Leuven seed files are swapped for stubs at
// RESOLUTION time, so Metro never bundles the real catalog, archive ghosts, way
// manifest or the three pre-rendered route PNGs (about 4.1 MB, and Nathan's
// commute geometry). DEMO is untouched: it passes its own in-code asset
// (src/ui/demoWayFixture.ts) and imports none of these files.
const path = require('path');

/** The six real files, relative to the app root, and their stubs. */
const SEED_FILES = [
  ['src/store/catalog.seed.json', 'assets/seed-stubs/catalog.empty.json'],
  ['src/store/results.seed.json', 'assets/seed-stubs/results.empty.json'],
  ['assets/ways/ways.json', 'assets/seed-stubs/ways.empty.json'],
  ['assets/ways/Morning.png', 'assets/seed-stubs/blank.png'],
  ['assets/ways/EveningA.png', 'assets/seed-stubs/blank.png'],
  ['assets/ways/EveningB.png', 'assets/seed-stubs/blank.png'],
];

function seedModeFromEnv(env) {
  return env.EXPO_PUBLIC_SEED_MODE === 'shipped' ? 'shipped' : 'empty';
}

/** Comparison key: normalized, and case-folded on Windows (drive letters and
 * folder names can differ in case between __dirname and Metro's paths there). */
function keyOf(p) {
  const n = path.normalize(p);
  return process.platform === 'win32' ? n.toLowerCase() : n;
}

/** Map of key(absolute real path) -> absolute stub path. Built once per root. */
const tables = new Map();
function redirectTable(appRoot) {
  let table = tables.get(appRoot);
  if (!table) {
    table = new Map();
    for (const [real, stub] of SEED_FILES) {
      table.set(keyOf(path.join(appRoot, real)), path.join(appRoot, stub));
    }
    tables.set(appRoot, table);
  }
  return table;
}

/**
 * Given a Metro resolution (from the default resolver), return the resolution
 * Metro should use. Identity (the SAME object) unless seedMode is 'empty' AND
 * the resolution lands on one of the six files.
 */
function redirectResolution(resolution, appRoot, seedMode) {
  if (seedMode === 'shipped' || !resolution) return resolution;
  const table = redirectTable(appRoot);
  if (resolution.type === 'sourceFile') {
    const stub = table.get(keyOf(resolution.filePath));
    return stub ? { type: 'sourceFile', filePath: stub } : resolution;
  }
  if (resolution.type === 'assetFiles') {
    const hit = resolution.filePaths.map(keyOf).find((k) => table.has(k));
    return hit ? { type: 'assetFiles', filePaths: [table.get(hit)] } : resolution;
  }
  return resolution;
}

module.exports = { SEED_FILES, seedModeFromEnv, redirectTable, redirectResolution };
```

### NEW `app/metro.config.js`

```js
// Qualifire -- Metro config (virgin-cycle19 brief 01, 2026-10-03).
// The ONLY thing this does: wire metro.seedRedirect.js into the resolver so that
// non-shipped bundles (EXPO_PUBLIC_SEED_MODE !== 'shipped') never contain the
// Leuven seed files. The runtime guard in src/store/seed.ts stays; this closes
// the "bytes still ship" hole it documents. tests/seedstubs_suite.ts pins this
// file, the stubs and the redirect behaviour.
const { getDefaultConfig } = require('expo/metro-config');
const { seedModeFromEnv, redirectResolution } = require('./metro.seedRedirect.js');

const config = getDefaultConfig(__dirname);
const SEED_MODE = seedModeFromEnv(process.env);
const previousResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = previousResolveRequest ?? context.resolveRequest;
  const resolution = resolve(context, moduleName, platform);
  return redirectResolution(resolution, __dirname, SEED_MODE);
};

module.exports = config;
```

Notes for the executor: both files are CommonJS (`require`/`module.exports`) — Metro loads
the config with Node's CJS loader. `path.normalize` makes the Windows (`\`) and POSIX
spellings compare equal. The executor cannot run Metro in the cloud; syntax-check with
`node --check app/metro.config.js` and `node --check app/metro.seedRedirect.js`, and run
`node -e "const m=require('./app/metro.seedRedirect.js'); console.log(m.SEED_FILES.length)"`
from the repo root (expect `6`).

### NEW stubs in `app/assets/seed-stubs/`

- `catalog.empty.json`: `{}`
- `results.empty.json`: `[]`
- `ways.empty.json`: `{"schemaVersion": 1, "projection": null, "ways": {}}`
- `blank.png`: a valid 1x1 transparent PNG. Generate it from the repo root (no retyping bytes):

```python
import struct, zlib
def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 6, 0, 0, 0)) \
    + chunk(b'IDAT', zlib.compress(b'\x00\x00\x00\x00\x00')) + chunk(b'IEND', b'')
open('app/assets/seed-stubs/blank.png', 'wb').write(png)
```

### NEW `app/tests/seedstubs_suite.ts`

Imports: `test`, `assert`, `loadJson`, `TESTS_DIR` from `./lib.ts`; `node:fs`, `node:path`;
`createRequire` from `node:module`. `const APP = path.join(TESTS_DIR, '..');`
`const redirect = createRequire(import.meta.url)('../metro.seedRedirect.js');` (type it as
`{ SEED_FILES: [string, string][]; seedModeFromEnv: (e: Record<string, string | undefined>) => string; redirectResolution: (r: unknown, root: string, mode: string) => unknown }`
or `any` with a one-line reason comment — `tsc` must stay clean). Six tests, names prefixed
`virgin-cycle19 01: `:

1. **config present and wired** — `app/metro.config.js` exists; its text contains
   `expo/metro-config`, `./metro.seedRedirect.js`, `resolveRequest`, `redirectResolution`,
   `seedModeFromEnv`. `app/metro.seedRedirect.js` exists; `redirect.SEED_FILES` has exactly 6
   entries whose first elements are exactly the six real relative paths in the `SEED_FILES`
   block above (compare as a sorted array).
2. **stubs parse** — the three JSON stubs exist and parse; `ways.empty.json` has `ways` deep
   equal `{}` and `schemaVersion` equal to the real `assets/ways/ways.json`'s (`1`); `results.empty.json` is an empty array;
   `catalog.empty.json` is an object with zero keys.
3. **blank.png** — exists, starts with the 8-byte PNG signature
   `89 50 4E 47 0D 0A 1A 0A`, size under 200 bytes.
4. **real files still exist** at their real paths (the redirect is a bundler concern; shipped
   mode and the suite need the originals): all six.
5. **redirect behaviour** (the offline proof) — with `APP` as root:
   - `seedModeFromEnv({})` → `'empty'`; `({EXPO_PUBLIC_SEED_MODE:'shipped'})` → `'shipped'`;
     `({EXPO_PUBLIC_SEED_MODE:'empty'})` → `'empty'`.
   - for each of the six: a `{type:'sourceFile', filePath: <abs real>}` resolution in mode
     `'empty'` returns `{type:'sourceFile', filePath: <abs stub>}` (JSON files) and the three
     PNGs as `{type:'assetFiles', filePaths:[<abs Morning.png>]}` return
     `{type:'assetFiles', filePaths:[<abs blank.png>]}`; the same inputs in mode `'shipped'`
     return the SAME object (`===`).
   - the Windows spelling (`filePath.replace(/\//g, '\\')`) of `catalog.seed.json` is
     redirected too on win32 only (guard with `process.platform === 'win32'`; on POSIX assert
     the POSIX path is redirected — do not assert backslash behaviour on Linux).
   - **DEMO is never touched:** `{type:'sourceFile', filePath: <abs src/ui/demoWayFixture.ts>}`,
     `<abs src/ui/DemoScreen.tsx>`, `<abs src/ui/wayMapView.tsx>`, and
     `{type:'assetFiles', filePaths:[<abs assets/icon.png>]}` are returned `===` unchanged in
     mode `'empty'`; `{type:'empty'}` is returned unchanged; `undefined` is returned unchanged.
6. **DEMO static pin** — `src/ui/demoWayFixture.ts` text: its only `import` line is
   `import type { WayAsset } from './wayMapMath.ts';` (count lines starting with `import` ==
   1); contains `image: ''`; contains none of `catalog.seed`, `results.seed`, `ways.json`,
   `Morning.png`, `EveningA.png`, `EveningB.png`, `seed-stubs`. `src/ui/DemoScreen.tsx` text
   contains `asset={DEMO_WAY_ASSET}`. `DEMO_WAY_ID`'s value (regex
   `DEMO_WAY_ID = '([^']+)'` on the fixture) is NOT a key of the real `ways.json` `ways`.
   Then the runtime half: `import { DEMO_WAY_ASSET, DEMO_WAY_ID } from
   '../src/ui/demoWayFixture.ts';` at the top of the suite (the fixture's only import is a
   type, so plain Node loads it) and assert `DEMO_WAY_ASSET.image === ''`,
   `(DEMO_WAY_ASSET.path ?? []).length > 1` (`path` is OPTIONAL in `WayAsset`, `wayMapMath.ts` line 35 — a bare `.path.length` fails `tsc` strict), `DEMO_WAY_ASSET.gates.length > 0`, and
   `DEMO_WAY_ID === 'demo:second-ride'` — i.e. the DEMO map draws from in-code geometry and no
   file the redirect could touch. (If `WayAsset`'s field names differ from `image` / `path` /
   `gates`, STOP and report — do not adapt.)

### EDIT `app/tests/run.ts`

Insert `import './seedstubs_suite.ts';` as a new line directly before
`import { runAll } from './lib.ts';` (line 66 today; line 67 if brief 02's
`import './easignore_suite.ts';` is already there — then insert after that line).
`seedmode_pin.ts` stays first (line 13).

### EDIT `cycles/virgin-cycle19/measure.ps1` (line 106) and `COMMANDS.md` §4

`measure.ps1` line 106 today:
`        $hits = @('home2work', 'seed:2026', 'WorkHomeDry') | Where-Object { $txt.Contains($_) }`
→ replace the array with `@('seed:2026', 'puttestraat', 'web-mercator')` (one per redirected
JSON — see Evidence; the other two strings stay in the bundle legitimately). Nothing else in
`measure.ps1` changes; keep it ASCII.

`COMMANDS.md` lines 59-62: change the BEFORE seed strings to `seed:2026,puttestraat,web-mercator`
and the AFTER text to: "both lists empty, no asset over 500 KB, bundle noticeably under
2,622,188 bytes (roughly 0.1-0.25 MB less), VERDICT "NOT in the bundle"." Leave the rest of
`COMMANDS.md` alone.

### EDIT `app/src/store/seed.ts` (comment only, lines 59-68)

In the doc comment above `bundledForSeedMode`, replace the two lines

```
 * Static imports are resolved by Metro before any env logic runs, so the
 * bytes still ship; this makes them unreachable: every consumer sees `{}`.
```

with

```
 * Static imports are resolved by Metro before any env logic runs; since
 * virgin-cycle19 (2026-10-03) app/metro.config.js redirects the six seed
 * files to stubs in assets/seed-stubs/ on non-shipped bundles, so the bytes
 * no longer ship either. This guard stays as the runtime belt to that
 * braces: every consumer sees `{}`.
```

Comment lines only (each starts with ` *`); no code line changes; `tsc` must not notice;
`virginmanifest_suite`'s scan strips `*`-prefixed lines, so mentioning `seed-stubs` here is
fine (do NOT write `ways.json` or `assets/ways/` in the new text).

## Acceptance (exact commands, expected output)

Run from the repo root unless noted. Baseline before this brief: 838 / 835 / 0 / 3
(or 843 / 840 / 0 / 3 if brief 02 landed first, as the README orders).

1. `node --check app/metro.config.js && node --check app/metro.seedRedirect.js && echo SYNTAX-OK`
   → `SYNTAX-OK`.
1b. `grep -n "seed:2026', 'puttestraat', 'web-mercator'" cycles/virgin-cycle19/measure.ps1` → line 106;
   `grep -c "WorkHomeDry\|home2work" cycles/virgin-cycle19/measure.ps1` → `0`.
2. `node -e "const m=require('./app/metro.seedRedirect.js'); console.log(m.SEED_FILES.length, m.seedModeFromEnv({}), m.seedModeFromEnv({EXPO_PUBLIC_SEED_MODE:'shipped'}))"`
   → `6 empty shipped`.
3. `ls -la app/assets/seed-stubs/` → four files; `blank.png` under 200 bytes.
4. `cd app && node --experimental-strip-types tests/run.ts` → last summary line reports
   **baseline + 6 tests, + 6 pass, 0 fail, 3 skip**. In the README order (02 already landed,
   +5): `849 tests: 846 pass, 0 fail, 3 skip`. If run without 02: `844 tests: 841 pass, 0 fail, 3 skip`. Zero FAIL is the bar; paste the exact line.
5. `cd app && ./node_modules/.bin/tsc --noEmit; echo exit=$?` → no output, `exit=0`.
6. `GIT_OPTIONAL_LOCKS=0 git status --porcelain` is NOT to be run (hangs on this mount).
   Instead: `GIT_OPTIONAL_LOCKS=0 git diff --stat` → exactly four files:
   `app/src/store/seed.ts` (comment lines), `app/tests/run.ts` (1 insertion),
   `cycles/virgin-cycle19/measure.ps1`, `cycles/virgin-cycle19/COMMANDS.md` (the cycle folder
   is tracked since `1f5e150`); and
   `GIT_OPTIONAL_LOCKS=0 git ls-files --others --exclude-standard app` → exactly
   `app/metro.config.js`, `app/metro.seedRedirect.js`, the four stubs,
   `app/tests/seedstubs_suite.ts`.
7. `grep -n "ways.json\|assets/ways/" app/src/store/seed.ts` → only pre-existing comment
   hits (line 62 `routes.json` text is pre-existing; no new code hit).
8. **Nathan, on the PC, BEFORE build 8 (`COMMANDS.md` §4):**
   `measure.ps1 -Export` → `PNGs named in assetmap :` (empty), `seed strings in bundle :`
   (empty), bundle bytes below 2,622,188, `VERDICT: Leuven seed NOT in the bundle`;
   then `measure.ps1 -Export -Shipped` → `VERDICT: shipped mode intact (all three PNGs
   present)`. Paste both into `PROGRESS.md` in this folder. (build8.ps1 §6 repeats the empty
   check on every build — brief 03.)

## Inspect checklist (fresh Opus, after the executor reports)

- Rerun Acceptance 1-7 yourself; do not trust the executor's paste.
- Read `metro.seedRedirect.js` against Decision 4: sourceFile → stub sourceFile;
  assetFiles → `[blank.png]` directly; shipped → identity; nothing else touched.
- Read `metro.config.js`: it calls the previous resolver (or `context.resolveRequest`) FIRST
  and passes `__dirname` — not `process.cwd()` — as the root.
- Confirm `seedstubs_suite.ts` test 5 really asserts `===` identity for shipped mode and for
  the DEMO paths (not deep-equal — a copy would hide a bug).
- Confirm the six SEED_FILES relative paths exactly match `seed.ts` 31-32 and
  `wayMapView.tsx` 86/172-174 targets (`src/store/…`, `assets/ways/…`).
- Confirm no file outside the Files list changed (Acceptance 6); `ui-strings.allow.json`
  untouched; `demoWayFixture.ts` and `DemoScreen.tsx` untouched.
- Re-grep the sentinel claim: each of `seed:2026`, `puttestraat`, `web-mercator` occurs in
  exactly one of the six redirected files and in no `src/`/`core/src/` code nor
  `tests/fixtures/refs.json`; the existing `app/dist` hbc contains all three (pre-brief).
- Confirm the brief's "what still ships" paragraph is true (refs.json import in
  `src/live/refs.ts`) and that the executor did NOT touch refs.json or refs.ts.
- Confirm `seed.ts` diff is comment-only (every changed line starts with ` *`).

## On-device checklist (after build 8 is installed)

1. Fresh install (or Reset app): RECORD/ROUTES/RESULTS all empty, as today.
2. DEMO tab: FIRST / SECOND / TENTH RIDE still play with the map drawn (the DEMO fixture is
   separate — unchanged).
3. Record one short ride, name it, ride it again: gates, self dot, reveal — as today.
4. SETTINGS → DATA → share `catalog.user.json`: no `home`/`work`/`church`/`fosh`/`station`
   entries unless the rider made them.

## Out of scope

- `src/live/refs.ts` → `tests/fixtures/refs.json` (638 KB of Leuven reference lines, still
  bundled — see "What still ships"; README parked follow-up). `demoWayFixture.ts` (Open call A). `seed.ts` code. Deleting the real seed files (the
  shipped dev mode and the test files need them). Any script change (brief 03). The archive
  size (brief 02).

## Open calls (defaults chosen 2026-10-03 — executor does NOT stop for these)

- **A. DEMO fixture is Nathan's real commute.** `src/ui/demoWayFixture.ts` holds
  START/G1/G2/G3/FINISH coordinates of the "Morning" home→work route, shipped in every build
  by Nathan's 2026-09-03 ruling ("DEMO replays its own frozen fixture"). **Default: keep,
  untouched** (generic gate names; nothing labels it as anyone's home). Menu in the README.
- **B. Stub location** `app/assets/seed-stubs/` (default) vs `app/src/store/seed-stubs/`:
  assets, because one of them is a PNG and `virginmanifest_suite` scans `src/`.
- **C. Two files (`metro.config.js` + `metro.seedRedirect.js`) vs one.** Default: two
  (Decision 2) — the second file is what makes the redirect testable without Metro.
