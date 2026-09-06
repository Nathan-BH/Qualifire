/**
 * WP-3 §3.6 — TypeScript-parser identifier swap: way<->route, ways<->routes,
 * Way<->Route, Ways<->Routes, WAY<->ROUTE, WAYS<->ROUTES, applied to every
 * Identifier/PrivateIdentifier node in src/**\/*.{ts,tsx} and tests/**\/*.ts.
 * String literals, template literals, JSX text and comments are untouched by
 * construction (the AST walk never visits their text as identifier tokens).
 *
 * Usage:
 *   node --experimental-strip-types scripts/wp3-swap-identifiers.ts             # apply
 *   node --experimental-strip-types scripts/wp3-swap-identifiers.ts --dry-run   # print only
 */
import ts from 'typescript';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = process.cwd();
const DRY_RUN = process.argv.includes('--dry-run');

/** The one identifier on the exception list (§3.4): never swapped, whole-text match only. */
const EXCEPTIONS = new Set<string>(['RoutesScreen']);

const LOWER = ['way', 'ways', 'route', 'routes'];
const CAP = ['Way', 'Ways', 'Route', 'Routes'];
const UPPER = ['WAY', 'WAYS', 'ROUTE', 'ROUTES'];

function pairMap(list: string[]): Map<string, string> {
  const m = new Map<string, string>();
  m.set(list[0], list[2]);
  m.set(list[2], list[0]);
  m.set(list[1], list[3]);
  m.set(list[3], list[1]);
  return m;
}
const lowerMap = pairMap(LOWER);
const capMap = pairMap(CAP);
const upperMap = pairMap(UPPER);

const SWAP_RE =
  /(?<![A-Za-z])(way|ways|route|routes)(?![a-z])|(?<![A-Z])(Way|Ways|Route|Routes)(?![a-z])|(?<![A-Za-z])(WAY|WAYS|ROUTE|ROUTES)(?![A-Za-z])/g;

function swapToken(text: string): string {
  return text.replace(SWAP_RE, (m, lower, cap, upper) => {
    if (lower !== undefined) return lowerMap.get(lower)!;
    if (cap !== undefined) return capMap.get(cap)!;
    if (upper !== undefined) return upperMap.get(upper)!;
    return m;
  });
}

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
      walk(p, out);
    } else if (st.isFile()) {
      const ext = extname(name);
      if (ext === '.ts' || ext === '.tsx') out.push(p);
    }
  }
}

const files: string[] = [];
walk(join(ROOT, 'src'), files);
walk(join(ROOT, 'tests'), files);

const pairs = new Map<string, string>(); // before -> after, distinct

let filesChanged = 0;

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const isTsx = extname(file) === '.tsx';
  const sf = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ true,
    isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const edits: { start: number; end: number; replacement: string }[] = [];

  function visit(node: ts.Node): void {
    if (node.kind === ts.SyntaxKind.Identifier || node.kind === ts.SyntaxKind.PrivateIdentifier) {
      const id = node as ts.Identifier | ts.PrivateIdentifier;
      const original = id.text;
      if (!EXCEPTIONS.has(original)) {
        const replacement = swapToken(original);
        if (replacement !== original) {
          edits.push({ start: node.getStart(sf), end: node.getEnd(), replacement });
          pairs.set(original, replacement);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  if (edits.length === 0) continue;

  edits.sort((a, b) => b.start - a.start); // right-to-left
  let next = text;
  for (const e of edits) {
    next = next.slice(0, e.start) + e.replacement + next.slice(e.end);
  }

  if (!DRY_RUN) {
    writeFileSync(file, next, 'utf8');
  }
  filesChanged++;
}

const sortedPairs = [...pairs.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
console.log(`${DRY_RUN ? '[dry-run] ' : ''}${filesChanged} files ${DRY_RUN ? 'would change' : 'changed'}; ${sortedPairs.length} distinct identifier pairs:`);
for (const [before, after] of sortedPairs) {
  console.log(`  ${before} -> ${after}`);
}
