/** virgin-cycle19 brief 01: pins the Metro seed redirect (metro.config.js +
 * metro.seedRedirect.js), the stubs, and that DEMO is untouched. Reads files as
 * text/JSON and loads ONLY the dependency-free metro.seedRedirect.js. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import { test, assert, loadJson, TESTS_DIR } from './lib.ts';
import { DEMO_WAY_ASSET, DEMO_WAY_ID } from '../src/ui/demoWayFixture.ts';

const APP = path.join(TESTS_DIR, '..');
type Res = { type: string; filePath?: string; filePaths?: string[] } | undefined;
const redirect = createRequire(import.meta.url)('../metro.seedRedirect.js') as {
  SEED_FILES: [string, string][];
  seedModeFromEnv: (e: Record<string, string | undefined>) => string;
  redirectResolution: (r: Res, root: string, mode: string) => Res;
};

const SIX = [
  'src/store/catalog.seed.json',
  'src/store/results.seed.json',
  'assets/ways/ways.json',
  'assets/ways/Morning.png',
  'assets/ways/EveningA.png',
  'assets/ways/EveningB.png',
];
const abs = (rel: string) => path.join(APP, rel);
const read = (rel: string) => fs.readFileSync(abs(rel), 'utf8');

test('virgin-cycle19 01: metro config present and wired', () => {
  assert(fs.existsSync(abs('metro.config.js')), 'metro.config.js missing');
  const cfg = read('metro.config.js');
  for (const s of ['expo/metro-config', './metro.seedRedirect.js', 'resolveRequest', 'redirectResolution', 'seedModeFromEnv']) {
    assert(cfg.includes(s), `metro.config.js lacks ${s}`);
  }
  assert(fs.existsSync(abs('metro.seedRedirect.js')), 'metro.seedRedirect.js missing');
  assert(redirect.SEED_FILES.length === 6, 'SEED_FILES must have 6 entries');
  const firsts = redirect.SEED_FILES.map((e) => e[0]).sort();
  assert(JSON.stringify(firsts) === JSON.stringify([...SIX].sort()), `SEED_FILES paths differ: ${firsts.join(',')}`);
});

test('virgin-cycle19 01: stubs parse', () => {
  const dir = 'assets/seed-stubs/';
  const ways = loadJson<{ schemaVersion: number; ways: Record<string, unknown> }>(abs(dir + 'ways.empty.json'));
  const realWays = loadJson<{ schemaVersion: number }>(abs('assets/ways/ways.json'));
  assert(JSON.stringify(ways.ways) === '{}', 'ways.empty.json ways must be {}');
  assert(ways.schemaVersion === realWays.schemaVersion, 'schemaVersion must mirror the real manifest');
  const results = loadJson<unknown>(abs(dir + 'results.empty.json'));
  assert(Array.isArray(results) && results.length === 0, 'results.empty.json must be []');
  const cat = loadJson<Record<string, unknown>>(abs(dir + 'catalog.empty.json'));
  assert(typeof cat === 'object' && cat !== null && !Array.isArray(cat) && Object.keys(cat).length === 0, 'catalog.empty.json must be {}');
});

test('virgin-cycle19 01: blank.png is a tiny valid PNG', () => {
  const buf = fs.readFileSync(abs('assets/seed-stubs/blank.png'));
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  assert(sig.every((b, i) => buf[i] === b), 'PNG signature wrong');
  assert(buf.length < 200, `blank.png too big: ${buf.length}`);
});

test('virgin-cycle19 01: real seed files still exist at their real paths', () => {
  for (const rel of SIX) assert(fs.existsSync(abs(rel)), `missing real file ${rel}`);
});

test('virgin-cycle19 01: redirect behaviour (offline proof)', () => {
  const r = redirect;
  assert(r.seedModeFromEnv({}) === 'empty', 'default mode must be empty');
  assert(r.seedModeFromEnv({ EXPO_PUBLIC_SEED_MODE: 'shipped' }) === 'shipped', 'shipped');
  assert(r.seedModeFromEnv({ EXPO_PUBLIC_SEED_MODE: 'empty' }) === 'empty', 'empty');

  const stubFor = (rel: string) =>
    rel.endsWith('.png') ? 'assets/seed-stubs/blank.png'
    : rel.endsWith('catalog.seed.json') ? 'assets/seed-stubs/catalog.empty.json'
    : rel.endsWith('results.seed.json') ? 'assets/seed-stubs/results.empty.json'
    : 'assets/seed-stubs/ways.empty.json';
  for (const rel of SIX) {
    const isPng = rel.endsWith('.png');
    const input: Res = isPng ? { type: 'assetFiles', filePaths: [abs(rel)] } : { type: 'sourceFile', filePath: abs(rel) };
    const out = r.redirectResolution(input, APP, 'empty');
    if (isPng) {
      assert(out !== input && out?.type === 'assetFiles' && out.filePaths?.length === 1 && out.filePaths[0] === abs(stubFor(rel)), `png not redirected: ${rel}`);
    } else {
      assert(out !== input && out?.type === 'sourceFile' && out.filePath === abs(stubFor(rel)), `json not redirected: ${rel}`);
    }
    assert(r.redirectResolution(input, APP, 'shipped') === input, `shipped must return the same object: ${rel}`);
  }

  if (process.platform === 'win32') {
    const winPath = abs('src/store/catalog.seed.json').replace(/\//g, '\\');
    const out = r.redirectResolution({ type: 'sourceFile', filePath: winPath }, APP, 'empty');
    assert(out?.filePath === abs('assets/seed-stubs/catalog.empty.json'), 'windows spelling not redirected');
  } else {
    const out = r.redirectResolution({ type: 'sourceFile', filePath: abs('src/store/catalog.seed.json') }, APP, 'empty');
    assert(out?.filePath === abs('assets/seed-stubs/catalog.empty.json'), 'posix path not redirected');
  }

  for (const rel of ['src/ui/demoWayFixture.ts', 'src/ui/DemoScreen.tsx', 'src/ui/wayMapView.tsx']) {
    const input: Res = { type: 'sourceFile', filePath: abs(rel) };
    assert(r.redirectResolution(input, APP, 'empty') === input, `DEMO path touched: ${rel}`);
  }
  const icon: Res = { type: 'assetFiles', filePaths: [abs('assets/icon.png')] };
  assert(r.redirectResolution(icon, APP, 'empty') === icon, 'icon.png touched');
  const emptyRes: Res = { type: 'empty' };
  assert(r.redirectResolution(emptyRes, APP, 'empty') === emptyRes, '{type:empty} touched');
  assert(r.redirectResolution(undefined, APP, 'empty') === undefined, 'undefined touched');
});

test('virgin-cycle19 01: DEMO static and runtime pin', () => {
  const fx = read('src/ui/demoWayFixture.ts');
  const imports = fx.split('\n').filter((l) => l.startsWith('import'));
  assert(imports.length === 1, `fixture must have exactly 1 import line, found ${imports.length}`);
  assert(imports[0] === "import type { WayAsset } from './wayMapMath.ts';", `unexpected import: ${imports[0]}`);
  assert(fx.includes("image: ''"), "fixture must have image: ''");
  for (const s of ['catalog.seed', 'results.seed', 'ways.json', 'Morning.png', 'EveningA.png', 'EveningB.png', 'seed-stubs']) {
    assert(!fx.includes(s), `fixture mentions ${s}`);
  }
  assert(read('src/ui/DemoScreen.tsx').includes('asset={DEMO_WAY_ASSET}'), 'DemoScreen must pass asset={DEMO_WAY_ASSET}');
  const m = /DEMO_WAY_ID = '([^']+)'/.exec(fx);
  assert(m !== null, 'DEMO_WAY_ID not found');
  const realWays = loadJson<{ ways: Record<string, unknown> }>(abs('assets/ways/ways.json'));
  assert(!(m[1] in realWays.ways), 'DEMO_WAY_ID must not be a manifest key');
  assert(DEMO_WAY_ASSET.image === '', 'DEMO image must be empty');
  assert((DEMO_WAY_ASSET.path ?? []).length > 1, 'DEMO path must have geometry');
  assert(DEMO_WAY_ASSET.gates.length > 0, 'DEMO gates must exist');
  assert(DEMO_WAY_ID === 'demo:second-ride', 'DEMO_WAY_ID changed');
});
