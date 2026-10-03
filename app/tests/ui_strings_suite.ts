/**
 * virgin-cycle20 brief 09 — Nathan's clutter guardrail. Unit-tests the extractor
 * and rule checker on in-memory sources, then runs the guard against the live
 * tree and tests/ui-strings.allow.json (Nathan's file).
 */
import * as path from 'node:path';
import { assert, loadJson, test, TESTS_DIR } from './lib.ts';
import {
  MIN_ENTRIES, checkRules, extractFromSource, formatViolation, listScanFiles, scanFiles,
  type AllowEntry, type AllowList, type UiString, type Violation,
} from './ui_strings_extract.ts';

const APP_DIR = path.resolve(TESTS_DIR, '..');
const ALLOW_PATH = path.join(APP_DIR, 'tests', 'ui-strings.allow.json');

const kt = (list: { kind: string; text: string }[]): string[] => list.map((s) => `${s.kind}|${s.text}`).sort();

// ---- in-memory helpers (no `floor` noise in the unit tests)
function fillerFound(n: number): { strings: UiString[]; banners: [] } {
  const strings: UiString[] = [];
  for (let i = 0; i < n; i++) strings.push({ file: `src/ui/f${i}.tsx`, line: 1, kind: 'text', text: `filler string number ${i}` });
  return { strings, banners: [] };
}
function entryFor(s: { file: string; kind: string; text: string }, extra: Partial<AllowEntry> = {}): AllowEntry {
  return { file: s.file, kind: s.kind, text: s.text, reason: 'bootstrap: unit-test filler', since: '2026-10-03', by: 'bootstrap', ...extra };
}
function fillerAllow(n: number): AllowList {
  return {
    owner: 'Nathan', rule: 'Nathan owns this', generatedAt: '2026-10-03', generatedFrom: 'test', legacyCount: 0,
    banners: [], entries: fillerFound(n).strings.map((s) => entryFor(s)),
  };
}
const rules = (vs: Violation[]): string[] => vs.map((v) => v.rule);

test('ui-strings: extractor: JSX text and string/template children', () => {
  const src = [
    'export const A = () => (',
    '  <View>',
    '    <Text>GPS live</Text>',
    "    <Text>{'same activity · new meaning'}</Text>",
    '    <Text>{`last fix ${n}s ago`}</Text>',
    "    <Text>{'●'} RECORD</Text>",
    '  </View>',
    ');',
  ].join('\n');
  const r = extractFromSource('src/ui/x.tsx', src);
  const got = kt(r.strings);
  const want = ['text|GPS live', 'text|same activity · new meaning', 'text|last fix {…}s ago', 'text|RECORD'].sort();
  assert(JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}`);
});

test('ui-strings: extractor: visible attributes, Alert.alert, notification props', () => {
  const src = [
    'export const A = () => <Row label="Active sport" hint="Everything here is scoped." />;',
    'export const B = () => <X style={s.a} testID="t" />;',
    "Alert.alert('Could not save', 'The gates were not saved.', [{ text: 'OK' }]);",
    "const o = { notificationTitle: 'Qualifire · recording activity', notificationBody: 'GPS on until Stop.' };",
  ].join('\n');
  const got = kt(extractFromSource('src/ui/x.tsx', src).strings);
  const want = [
    'attr:label|Active sport', 'attr:hint|Everything here is scoped.',
    'alert-title|Could not save', 'alert-body|The gates were not saved.', 'prop:text|OK',
    'prop:notificationTitle|Qualifire · recording activity', 'prop:notificationBody|GPS on until Stop.',
  ].sort();
  assert(JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}`);
});

test('ui-strings: extractor: tier-B prose literals via const / ternary / helper call', () => {
  const src = [
    "const GPS_OFF = 'Location (GPS) is turned off';",
    "const line = ok ? 'GPS live' : 'waiting for first GPS fix…';",
    "export const V = () => <View>{yellowSub('the clock runs from here')}</View>;",
  ].join('\n');
  const r = extractFromSource('src/ui/x.tsx', src);
  const want = [
    'literal|Location (GPS) is turned off', 'literal|GPS live', 'literal|waiting for first GPS fix…', 'literal|the clock runs from here',
  ].sort();
  assert(JSON.stringify(kt(r.strings)) === JSON.stringify(want), `got ${JSON.stringify(kt(r.strings))}`);
});

test('ui-strings: extractor: excluded positions yield nothing', () => {
  const src = [
    "import x from 'react native thing';",
    "type P = 'armed phase' | 'setup phase';",
    "if (a === 'not a label') {}",
    "switch (k) { case 'two words': break; }",
    "console.log('two words here');",
    "function f() { throw new Error('bad thing happened'); }",
    "const s = StyleSheet.create({ a: { fontFamily: 'Some Font' } });",
    'const v = <V style={s.warn} key="a b" />;',
    "const o = { 'two words': 1 };",
  ].join('\n');
  const r = extractFromSource('src/ui/x.tsx', src);
  assert(r.strings.length === 0, `strings ${JSON.stringify(r.strings)}`);
  assert(r.banners.length === 0, `banners ${JSON.stringify(r.banners)}`);
});

test('ui-strings: extractor: template skeleton and normalisation', () => {
  const src = [
    'export const A = () => (',
    '  <Text>',
    '    GPS   live',
    '      now',
    '  </Text>',
    ');',
    'export const B = () => <Text>{`${a} · way locked${b}`}</Text>;',
  ].join('\n');
  const got = kt(extractFromSource('src/ui/x.tsx', src).strings);
  const want = ['text|GPS live now', 'text|{…} · way locked{…}'].sort();
  assert(JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}`);
});

test('ui-strings: rules: unlisted and stale both fail, with the remediation message', () => {
  const allow = fillerAllow(MIN_ENTRIES);
  allow.entries.push(entryFor({ file: 'src/ui/old.tsx', kind: 'text', text: 'old listed text' }));
  const found = fillerFound(MIN_ENTRIES);
  found.strings.push({ file: 'src/ui/new.tsx', line: 7, kind: 'text', text: 'brand new clutter' });
  const vs = checkRules(found, allow);
  assert(JSON.stringify(rules(vs).sort()) === JSON.stringify(['stale', 'unlisted']), `rules ${rules(vs)}`);
  const un = formatViolation(vs.find((v) => v.rule === 'unlisted') as Violation);
  assert(un.includes('Nathan owns app/tests/ui-strings.allow.json') && un.includes('APPEND an entry'), 'remediation message');
  assert(un.includes('src/ui/new.tsx:7') && un.includes('brand new clutter'), 'names file:line and text');
});

test('ui-strings: rules: too-long needs long:true', () => {
  const long41 = 'x'.repeat(41);
  const base = (e: AllowEntry, kind: string) => {
    const allow = fillerAllow(MIN_ENTRIES);
    allow.entries.push(e);
    const found = fillerFound(MIN_ENTRIES);
    found.strings.push({ file: e.file, line: 1, kind, text: e.text });
    return checkRules(found, allow);
  };
  const hint = { file: 'src/ui/l.tsx', kind: 'attr:hint', text: long41 };
  assert(JSON.stringify(rules(base(entryFor(hint), 'attr:hint'))) === '["too-long"]', 'too-long without long');
  assert(base(entryFor(hint, { long: true }), 'attr:hint').length === 0, 'long:true waives');
  const body = { file: 'src/ui/l.tsx', kind: 'alert-body', text: 'one two three four five six seven eight' + 'x'.repeat(5) };
  assert(body.text.length > 40 && base(entryFor(body), 'alert-body').length === 0, 'alert-body of 41+ chars / 8 words is clean');
});

test('ui-strings: rules: hard budgets cannot be waived; legacy only with the bootstrap stamp', () => {
  const words21 = Array.from({ length: 21 }, (_, i) => `w${i}x`).join(' ');
  const alert = { file: 'src/ui/h.tsx', kind: 'alert-body', text: words21 };
  const dash = { file: 'src/ui/h.tsx', kind: 'text', text: 'before — after' };
  const run = (alertE: AllowEntry, dashE: AllowEntry, legacyCount: number) => {
    const allow = fillerAllow(MIN_ENTRIES);
    allow.entries.push(alertE, dashE);
    allow.legacyCount = legacyCount;
    const found = fillerFound(MIN_ENTRIES);
    found.strings.push({ ...alert, line: 1 }, { ...dash, line: 2 });
    return rules(checkRules(found, allow)).sort();
  };
  const J = (a: string[]) => JSON.stringify(a);
  assert(J(run(entryFor(alert, { long: true }), entryFor(dash), 0)) === J(['alert-words', 'em-dash']), 'long:true does not waive alert-words; em-dash hard');
  const la = entryFor(alert, { legacy: true, violates: ['alert-words'] });
  const ld = entryFor(dash, { legacy: true, violates: ['em-dash'] });
  assert(run(la, ld, 2).length === 0, 'bootstrap legacy entries are clean');
  assert(J(run({ ...la, since: '2026-10-04' }, ld, 2)) === J(['legacy-stamp']), 'wrong since → legacy-stamp');
  assert(J(run({ ...la, by: 'nathan' }, ld, 2)) === J(['legacy-stamp']), 'wrong by → legacy-stamp');
  assert(J(run(la, ld, 1)) === J(['legacy-count']), 'count mismatch → legacy-count');
  assert(J(run({ ...la, violates: ['em-dash'] }, ld, 2)) === J(['legacy-scope']), 'violates missing alert-words → legacy-scope');
});

test('ui-strings: rules: banner box outside banners[] fails; listed passes; stale banner fails', () => {
  const found = { ...fillerFound(MIN_ENTRIES), banners: [{ file: 'src/ui/b.tsx', line: 3, style: 'warnBox' }] };
  const allow = fillerAllow(MIN_ENTRIES);
  assert(JSON.stringify(rules(checkRules(found, allow))) === '["banner"]', 'unlisted banner fails');
  allow.banners = [{ file: 'src/ui/b.tsx', style: 'warnBox', reason: 'unit test banner' }];
  assert(checkRules(found, allow).length === 0, 'listed banner passes');
  const none = { ...fillerFound(MIN_ENTRIES), banners: [] };
  assert(JSON.stringify(rules(checkRules(none, allow))) === '["banner-stale"]', 'stale banner fails');
});

test('ui-strings: rules: planted clutter string is caught', () => {
  const found = fillerFound(MIN_ENTRIES);
  const planted = extractFromSource('src/ui/__planted__.tsx', 'export const P = () => <Text style={styles.hint}>Tap here to begin your activity</Text>;');
  found.strings.push(...planted.strings);
  const vs = checkRules({ strings: found.strings, banners: [...planted.banners] as never[] }, fillerAllow(MIN_ENTRIES));
  assert(vs.length === 1 && vs[0].rule === 'unlisted' && vs[0].text === 'Tap here to begin your activity', `got ${JSON.stringify(rules(vs))}`);
});

test('ui-strings: live tree: scan is complete and fast', () => {
  const t0 = Date.now();
  const r = scanFiles(APP_DIR);
  const ms = Date.now() - t0;
  const files = listScanFiles(APP_DIR);
  console.log(`ui-strings: scanned ${files.length} files, ${r.strings.length} strings, ${r.banners.length} banners in ${ms} ms`);
  assert(r.strings.length >= MIN_ENTRIES, `only ${r.strings.length} strings`);
  assert(ms < 6000, `scan took ${ms} ms (>= 6000)`);
  const rel = files.map((f) => path.relative(APP_DIR, f).split(path.sep).join('/'));
  for (const must of ['App.tsx', 'src/ui/RecordScreen.tsx', 'src/ui/settings.tsx', 'src/location/index.ts']) {
    assert(rel.includes(must), `scan list is missing ${must}`);
  }
  assert(!rel.some((f) => f.startsWith('tests/') || f.includes('node_modules')), 'tests/ or node_modules in the scan list');
});

test('ui-strings: live tree: every visible string is allowlisted and within budget', () => {
  const allow = loadJson<AllowList>(ALLOW_PATH);
  const found = scanFiles(APP_DIR);
  const inject = process.env.UI_STRINGS_INJECT;
  if (inject) {
    const [file, kind, ...rest] = inject.split('|');
    found.strings.push({ file, line: 0, kind, text: rest.join('|') });
  }
  const vs = checkRules(found, allow);
  if (vs.length > 0) {
    const shown = vs.slice(0, 20).map(formatViolation).join('\n');
    assert(false, `${vs.length} violation(s):\n${shown}${vs.length > 20 ? `\n… and ${vs.length - 20} more` : ''}`);
  }
});

test('ui-strings: allowlist: header and entry hygiene', () => {
  const allow = loadJson<AllowList>(ALLOW_PATH);
  assert(allow.owner === 'Nathan', 'owner must be Nathan');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(allow.generatedAt), 'generatedAt must be YYYY-MM-DD');
  assert(typeof allow.generatedFrom === 'string' && allow.generatedFrom.length > 0, 'generatedFrom required');
  assert(typeof allow.rule === 'string' && allow.rule.includes('Nathan owns'), 'rule must mention "Nathan owns"');
  const keys = new Set<string>();
  let prev: AllowEntry | null = null;
  for (const e of allow.entries) {
    for (const f of ['file', 'kind', 'text', 'reason', 'since', 'by'] as const) {
      assert(typeof e[f] === 'string', `entry ${e.file}|${e.kind}|${e.text}: ${f} must be a string`);
    }
    const key = `${e.file}|${e.kind}|${e.text}`;
    assert(!keys.has(key), `duplicate entry ${key}`);
    keys.add(key);
    if (prev) {
      const a = [prev.file, prev.kind, prev.text];
      const b = [e.file, e.kind, e.text];
      let cmp = 0;
      for (let i = 0; i < 3 && cmp === 0; i++) cmp = a[i] < b[i] ? -1 : a[i] > b[i] ? 1 : 0;
      assert(cmp < 0, `entries not sorted by file, kind, text at ${key}`);
    }
    prev = e;
  }
});
