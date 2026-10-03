/**
 * virgin-cycle20 brief 09: generates tests/ui-strings.allow.json from the current
 * tree. Nathan owns that file; this refuses to overwrite it without --force.
 *   cd app && node --experimental-strip-types scripts/gen-ui-strings-allow.ts [--force]
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import {
  MAX_LEN, checkRules, formatViolation, hardViolations, scanFiles,
  type AllowBanner, type AllowEntry, type AllowList, type UiString,
} from '../tests/ui_strings_extract.ts';

const APP_DIR = path.resolve(import.meta.dirname, '..');
const OUT = path.join(APP_DIR, 'tests', 'ui-strings.allow.json');
const force = process.argv.includes('--force');

if (fs.existsSync(OUT) && !force) {
  console.error('allowlist exists — Nathan owns it; agents append entries, they do not regenerate. Pass --force only on Nathan\'s instruction.');
  process.exit(2);
}

const d = new Date();
const pad = (n: number): string => String(n).padStart(2, '0');
const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
let sha = 'unknown';
try {
  sha = execSync('git rev-parse --short HEAD', {
    cwd: APP_DIR, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, stdio: ['ignore', 'pipe', 'ignore'],
  }).toString().trim() || 'unknown';
} catch { /* keep 'unknown' */ }

const found = scanFiles(APP_DIR);
const lineOf = new Map<string, number>();
for (const s of found.strings) lineOf.set(`${s.file}|${s.kind}|${s.text}`, s.line);

const entries: AllowEntry[] = found.strings.map((s: UiString) => {
  const e: AllowEntry = {
    file: s.file, kind: s.kind, text: s.text,
    reason: 'bootstrap: survived the cycle20 clutter audit (CLUTTER-REVIEW.md)',
    since: today, by: 'bootstrap',
  };
  if (s.kind !== 'alert-body' && s.text.length > MAX_LEN) e.long = true;
  const hard = hardViolations(s.kind, s.text);
  if (hard.length > 0) { e.legacy = true; e.violates = hard; }
  return e;
});
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
entries.sort((a, b) => cmp(a.file, b.file) || cmp(a.kind, b.kind) || cmp(a.text, b.text));

const bannerMap = new Map<string, AllowBanner>();
for (const b of found.banners) {
  bannerMap.set(`${b.file}|${b.style}`, { file: b.file, style: b.style, reason: 'bootstrap: existing box at generation — review' });
}
const banners = [...bannerMap.values()].sort((a, b) => cmp(a.file, b.file) || cmp(a.style, b.style));

const allow: AllowList = {
  owner: 'Nathan',
  rule: "Every string a rider can see must be listed here with a reason. Nathan owns this file. Agents may APPEND an entry only with a one-line justification and must say so in their report; they never regenerate this file. Budgets (process/CONVENTIONS.md § Rider-facing text): 40 chars unless long:true; alert body <= 20 words; no em dash (use ' · '); warnings flash in the yellow button's sub-label, never a banner.",
  generatedAt: today,
  generatedFrom: sha,
  legacyCount: entries.filter((e) => e.legacy === true).length,
  banners,
  entries,
};
fs.writeFileSync(OUT, JSON.stringify(allow, null, 2) + '\n');

const vs = checkRules(found, JSON.parse(fs.readFileSync(OUT, 'utf8')) as AllowList);
const kinds = new Map<string, number>();
for (const s of found.strings) kinds.set(s.kind, (kinds.get(s.kind) ?? 0) + 1);
console.log(`wrote ${path.relative(APP_DIR, OUT)}: ${entries.length} entries, ${banners.length} banners, HEAD ${sha}, ${today}`);
console.log('per kind: ' + [...kinds.entries()].sort().map(([k, n]) => `${k}=${n}`).join(', '));
const list = (title: string, pick: (e: AllowEntry) => boolean): void => {
  const sel = entries.filter(pick);
  console.log(`\n${title} (${sel.length})`);
  for (const e of sel) console.log(`  ${e.file}:${lineOf.get(`${e.file}|${e.kind}|${e.text}`)}  [${e.kind}]  "${e.text}"${e.violates ? '  violates: ' + e.violates.join(',') : ''}`);
};
list('LEGACY (hard-rule breakers frozen at bootstrap — Nathan to shorten or accept)', (e) => e.legacy === true);
list('LONG (>40 chars, waived with long:true — review)', (e) => e.long === true);
list('LITERAL (tier-B catches — check each is really rider-visible; a false positive is harmless but worth knowing)', (e) => e.kind === 'literal');
if (banners.length > 0) {
  console.log(`\nBANNERS (${banners.length})`);
  for (const b of banners) console.log(`  ${b.file}  ${b.style}`);
}
if (vs.length > 0) {
  console.error('\nGENERATOR BUG: checkRules reports violations on the file just written:');
  for (const v of vs) console.error(formatViolation(v));
  process.exit(1);
}
