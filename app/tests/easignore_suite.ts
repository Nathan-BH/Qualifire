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
