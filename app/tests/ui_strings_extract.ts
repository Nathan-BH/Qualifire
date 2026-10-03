/**
 * virgin-cycle20 brief 09 (Nathan 2026-10-02): the clutter guardrail's engine.
 * Statically extracts every rider-visible string from the app's UI sources with
 * the TypeScript compiler API (syntax only, no type-checker) and checks them
 * against tests/ui-strings.allow.json. PURE: no lib.ts import (the generator
 * script imports this too), no React / Expo imports, erasable TypeScript only.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';

export interface UiString { file: string; line: number; kind: string; text: string }
export interface BannerUse { file: string; line: number; style: string }
export interface AllowEntry {
  file: string; kind: string; text: string; reason: string; since: string; by: string;
  long?: boolean; legacy?: boolean; violates?: string[];
}
export interface AllowBanner { file: string; style: string; reason: string }
export interface AllowList {
  owner: string; rule: string; generatedAt: string; generatedFrom: string; legacyCount: number;
  banners: AllowBanner[]; entries: AllowEntry[];
}
export interface Violation { rule: string; file: string; line?: number; kind?: string; text?: string; message: string }

export const MAX_LEN = 40;
export const MAX_ALERT_BODY_WORDS = 20;
export const MIN_ENTRIES = 50;
export const VISIBLE_PROPS: ReadonlySet<string> = new Set([
  'label', 'title', 'sub', 'subtitle', 'hint', 'caption', 'placeholder',
  'accessibilityLabel', 'accessibilityHint', 'message', 'text', 'helper', 'description', 'note',
  'legend', 'empty', 'emptyText',
]);
export const NOTIFICATION_PROPS: ReadonlySet<string> = new Set(['notificationTitle', 'notificationBody', 'subText']);
export const BANNER_STYLE_RE: RegExp = /\b(warn|notice|banner|hint|info|help|tip)[A-Za-z]*Box\b|\bbanner[A-Za-z]*\b/i;
export const HARD_RULES: readonly string[] = ['alert-words', 'em-dash'];

/** JSX attributes whose string value is never rider-visible prose. */
const NON_VISIBLE_ATTRS: ReadonlySet<string> = new Set([
  'style', 'testID', 'key', 'source', 'uri', 'name', 'accessibilityRole', 'fontFamily',
]);
const ELLIPSIS_SPAN = '{…}';

export function normalise(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function skeleton(tpl: ts.TemplateExpression): string {
  let out = tpl.head.text;
  for (const span of tpl.templateSpans) out += ELLIPSIS_SPAN + span.literal.text;
  return out;
}

export function isProse(text: string): boolean {
  return /[A-Za-z]{2,}[^A-Za-z]+[A-Za-z]{2,}/.test(text) || text.endsWith('…');
}

export function wordCount(text: string): number {
  return text.split(ELLIPSIS_SPAN).join(' ').split(/\s+/).filter((w) => w.length > 0).length;
}

function litText(n: ts.Node | undefined): string | null {
  if (!n) return null;
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
  if (ts.isTemplateExpression(n)) return skeleton(n);
  return null;
}

function isStringish(n: ts.Node): boolean {
  return ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateExpression(n);
}

function propName(n: ts.PropertyName): string | null {
  if (ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
  return null;
}

/** Tier-B exclusion list (brief 09 Decision 2). */
function isExcluded(node: ts.Node, sf: ts.SourceFile): boolean {
  const parent = node.parent;
  if (parent) {
    if ((ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) && parent.moduleSpecifier === node) return true;
    if (ts.isExternalModuleReference(parent)) return true;
    if (ts.isCallExpression(parent) && parent.arguments[0] === node) {
      const callee = parent.expression;
      if (callee.kind === ts.SyntaxKind.ImportKeyword) return true;
      if (ts.isIdentifier(callee) && callee.text === 'require') return true;
    }
    if (ts.isComputedPropertyName(parent)) return true;
    if ((parent as unknown as { name?: ts.Node }).name === node && !ts.isJsxAttribute(parent)) return true;
    if (ts.isCaseClause(parent) && parent.expression === node) return true;
    if (ts.isBinaryExpression(parent)) {
      const k = parent.operatorToken.kind;
      if (k === ts.SyntaxKind.EqualsEqualsEqualsToken || k === ts.SyntaxKind.ExclamationEqualsEqualsToken
        || k === ts.SyntaxKind.EqualsEqualsToken || k === ts.SyntaxKind.ExclamationEqualsToken) return true;
    }
  }
  let sawAttr = false;
  for (let a: ts.Node | undefined = node; a; a = a.parent) {
    if (ts.isTypeNode(a)) return true;
    if (ts.isThrowStatement(a)) return true;
    if (ts.isCallExpression(a) || ts.isNewExpression(a)) {
      const callee = a.expression.getText(sf);
      if (callee.startsWith('console.') || callee === 'Error' || callee === 'StyleSheet.create') return true;
    }
    if (!sawAttr && ts.isJsxAttribute(a)) {
      sawAttr = true;
      if (NON_VISIBLE_ATTRS.has(a.name.getText(sf))) return true;
    }
  }
  return false;
}

export function extractFromSource(relFile: string, source: string): { strings: UiString[]; banners: BannerUse[] } {
  const kindOf = relFile.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(relFile, source, ts.ScriptTarget.Latest, true, kindOf);
  const strings: UiString[] = [];
  const banners: BannerUse[] = [];
  const seen = new Set<string>();
  const claimed = new Set<ts.Node>();
  const lineOf = (n: ts.Node): number => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

  const add = (node: ts.Node, kind: string, raw: string, requireProse: boolean): void => {
    const text = normalise(raw);
    if (!/\p{L}{2}/u.test(text)) return;
    if (requireProse && !isProse(text)) return;
    const key = `${relFile}|${kind}|${text}`;
    if (seen.has(key)) return;
    seen.add(key);
    strings.push({ file: relFile, line: lineOf(node), kind, text });
  };

  const visit = (node: ts.Node): void => {
    // ---- Tier A: structural
    if (ts.isJsxText(node)) {
      add(node, 'text', node.text, false);
    } else if (ts.isJsxExpression(node) && node.expression && isStringish(node.expression)
      && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      claimed.add(node.expression);
      add(node.expression, 'text', litText(node.expression) as string, false);
    } else if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sf);
      const init = node.initializer;
      if (VISIBLE_PROPS.has(name) && init) {
        const lit = ts.isJsxExpression(init) ? init.expression : init;
        if (lit && isStringish(lit)) {
          claimed.add(lit);
          add(lit, `attr:${name}`, litText(lit) as string, false);
        }
      }
      if (name === 'style' && init) {
        const re = new RegExp(BANNER_STYLE_RE.source, 'gi');
        const found = new Set<string>();
        for (const m of init.getText(sf).matchAll(re)) found.add(m[0]);
        for (const style of found) banners.push({ file: relFile, line: lineOf(node), style });
      }
    } else if (ts.isCallExpression(node) && node.expression.getText(sf) === 'Alert.alert') {
      const [t, b] = node.arguments;
      if (t && isStringish(t)) { claimed.add(t); add(t, 'alert-title', litText(t) as string, false); }
      if (b && isStringish(b)) { claimed.add(b); add(b, 'alert-body', litText(b) as string, false); }
    } else if (ts.isPropertyAssignment(node)) {
      const name = propName(node.name);
      if (name !== null && (VISIBLE_PROPS.has(name) || NOTIFICATION_PROPS.has(name)) && isStringish(node.initializer)) {
        claimed.add(node.initializer);
        add(node.initializer, `prop:${name}`, litText(node.initializer) as string, false);
      }
    }
    // ---- Tier B: prose literals anywhere else
    if (isStringish(node) && !claimed.has(node) && !isExcluded(node, sf)) {
      add(node, 'literal', litText(node) as string, true);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { strings, banners };
}

function walk(dir: string, out: string[]): void {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
}

export function listScanFiles(appDir: string): string[] {
  const out: string[] = [];
  const appTsx = path.join(appDir, 'App.tsx');
  if (fs.existsSync(appTsx)) out.push(appTsx);
  const ui = path.join(appDir, 'src', 'ui');
  if (fs.existsSync(ui)) walk(ui, out);
  const loc = path.join(appDir, 'src', 'location');
  if (fs.existsSync(loc)) {
    for (const e of fs.readdirSync(loc, { withFileTypes: true })) {
      if (e.isFile() && e.name.endsWith('.ts')) out.push(path.join(loc, e.name));
    }
  }
  return out.sort();
}

export function scanFiles(appDir: string): { strings: UiString[]; banners: BannerUse[] } {
  const strings: UiString[] = [];
  const banners: BannerUse[] = [];
  for (const abs of listScanFiles(appDir)) {
    const rel = path.relative(appDir, abs).split(path.sep).join('/');
    const r = extractFromSource(rel, fs.readFileSync(abs, 'utf8'));
    strings.push(...r.strings);
    banners.push(...r.banners);
  }
  return { strings, banners };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Which hard rules (HARD_RULES) a string breaks. */
export function hardViolations(kind: string, text: string): string[] {
  const out: string[] = [];
  if (kind === 'alert-body' && wordCount(text) > MAX_ALERT_BODY_WORDS) out.push('alert-words');
  if (text.includes('—')) out.push('em-dash');
  return out;
}

export function checkRules(
  found: { strings: UiString[]; banners: BannerUse[] },
  allow: AllowList,
): Violation[] {
  const v: Violation[] = [];
  if (found.strings.length < MIN_ENTRIES) {
    v.push({
      rule: 'floor', file: '(scan)',
      message: `FLOOR scan found only ${found.strings.length} strings (< ${MIN_ENTRIES}): the scanner is scanning nothing — a path moved? fix listScanFiles`,
    });
  }
  const listed = new Map<string, AllowEntry>();
  for (const e of allow.entries) listed.set(`${e.file}|${e.kind}|${e.text}`, e);
  const foundKeys = new Set<string>();
  for (const s of found.strings) {
    const key = `${s.file}|${s.kind}|${s.text}`;
    foundKeys.add(key);
    if (!listed.has(key)) {
      v.push({
        rule: 'unlisted', file: s.file, line: s.line, kind: s.kind, text: s.text,
        message:
`UNLISTED visible string  ${s.file}:${s.line}  [${s.kind}]  "${s.text}"
  New or changed rider-facing text. Nathan owns app/tests/ui-strings.allow.json.
  Either remove the text (preferred — a figure, a number or one word beats a sentence), or
  APPEND an entry {file, kind, text, reason, since, by} with a one-line justification and say so
  in your report. Budgets: <=40 chars (else "long": true), alert body <=20 words, no em dash (use ' · '),
  warnings flash in the yellow button's sub-label — never a banner.`,
      });
    }
  }
  let legacyTotal = 0;
  for (const e of allow.entries) {
    const key = `${e.file}|${e.kind}|${e.text}`;
    const base = { file: e.file, kind: e.kind, text: e.text };
    const where = `${e.file}  [${e.kind}]  "${e.text}"`;
    if (!foundKeys.has(key)) {
      v.push({ rule: 'stale', ...base, message: `STALE allowlist entry  ${where}  no longer in the code: remove the entry` });
    }
    if (typeof e.reason !== 'string' || e.reason.length < 12 || typeof e.since !== 'string' || !DATE_RE.test(e.since)
      || typeof e.by !== 'string' || e.by.length === 0) {
      v.push({ rule: 'no-reason', ...base, message: `NO-REASON  ${where}  entry needs reason (>=12 chars), since (YYYY-MM-DD) and by` });
    }
    if (e.kind !== 'alert-body' && e.text.length > MAX_LEN && e.long !== true) {
      v.push({ rule: 'too-long', ...base, message: `TOO-LONG  ${where}  ${e.text.length} chars > ${MAX_LEN}: shorten, or add "long": true` });
    }
    const hard = hardViolations(e.kind, e.text);
    if (e.legacy === true) {
      legacyTotal++;
      if (e.by !== 'bootstrap' || e.since !== allow.generatedAt) {
        v.push({ rule: 'legacy-stamp', ...base, message: `LEGACY-STAMP  ${where}  legacy needs by "bootstrap" and since === generatedAt (${allow.generatedAt})` });
      }
      const allowed = e.violates ?? [];
      for (const r of hard) {
        if (!allowed.includes(r)) {
          v.push({ rule: 'legacy-scope', ...base, message: `LEGACY-SCOPE  ${where}  breaks ${r} which is not in its violates list` });
        }
      }
    } else {
      for (const r of hard) {
        if (r === 'alert-words') {
          v.push({ rule: 'alert-words', ...base, message: `ALERT-WORDS  ${where}  ${wordCount(e.text)} words > ${MAX_ALERT_BODY_WORDS}: shorten — cannot be waived` });
        } else {
          v.push({ rule: 'em-dash', ...base, message: `EM-DASH  ${where}  contains — : use ' · '` });
        }
      }
    }
  }
  if (legacyTotal !== allow.legacyCount) {
    v.push({
      rule: 'legacy-count', file: '(header)',
      message: `LEGACY-COUNT  header legacyCount ${allow.legacyCount} !== ${legacyTotal} legacy entries: a legacy badge cannot be added later`,
    });
  }
  const bannerKeys = new Set(allow.banners.map((b) => `${b.file}|${b.style}`));
  const usedBanners = new Set<string>();
  for (const b of found.banners) {
    const key = `${b.file}|${b.style}`;
    usedBanners.add(key);
    if (!bannerKeys.has(key)) {
      v.push({ rule: 'banner', file: b.file, line: b.line, text: b.style, message: `BANNER  ${b.file}:${b.line}  banner-style box ${b.style} not in banners[]: use the yellow button sub-label flash instead` });
    }
  }
  for (const b of allow.banners) {
    if (!usedBanners.has(`${b.file}|${b.style}`)) {
      v.push({ rule: 'banner-stale', file: b.file, text: b.style, message: `BANNER-STALE  ${b.file}  banners[] entry ${b.style} no longer used: remove it` });
    }
  }
  return v;
}

export function formatViolation(v: Violation): string {
  return v.message;
}
