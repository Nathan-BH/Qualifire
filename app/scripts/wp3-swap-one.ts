/** One-off: apply the identical WP-3 identifier swap (see
 * scripts/wp3-swap-identifiers.ts) to a single out-of-scope-but-still-
 * type-checked file (safe_to_delete/ResultScreen.tsx), so `tsc --noEmit`
 * stays green without deleting dead code (CLAUDE.md rule 5) or leaving the
 * whole program broken. Same regex/exception list, verbatim. */
import ts from 'typescript';
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) throw new Error('usage: node wp3-swap-one.ts <file>');

const EXCEPTIONS = new Set<string>(['RoutesScreen']);
const LOWER = ['way', 'ways', 'route', 'routes'];
const CAP = ['Way', 'Ways', 'Route', 'Routes'];
const UPPER = ['WAY', 'WAYS', 'ROUTE', 'ROUTES'];
function pairMap(list: string[]): Map<string, string> {
  const m = new Map<string, string>();
  m.set(list[0], list[2]); m.set(list[2], list[0]);
  m.set(list[1], list[3]); m.set(list[3], list[1]);
  return m;
}
const lowerMap = pairMap(LOWER), capMap = pairMap(CAP), upperMap = pairMap(UPPER);
const SWAP_RE = /(?<![A-Za-z])(way|ways|route|routes)(?![a-z])|(?<![A-Z])(Way|Ways|Route|Routes)(?![a-z])|(?<![A-Za-z])(WAY|WAYS|ROUTE|ROUTES)(?![A-Za-z])/g;
function swapToken(text: string): string {
  return text.replace(SWAP_RE, (m, lower, cap, upper) => {
    if (lower !== undefined) return lowerMap.get(lower)!;
    if (cap !== undefined) return capMap.get(cap)!;
    if (upper !== undefined) return upperMap.get(upper)!;
    return m;
  });
}

const text = readFileSync(file, 'utf8');
const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const edits: { start: number; end: number; replacement: string }[] = [];
const pairs = new Map<string, string>();
function visit(node: ts.Node): void {
  if (node.kind === ts.SyntaxKind.Identifier || node.kind === ts.SyntaxKind.PrivateIdentifier) {
    const id = node as ts.Identifier;
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
edits.sort((a, b) => b.start - a.start);
let next = text;
for (const e of edits) next = next.slice(0, e.start) + e.replacement + next.slice(e.end);
writeFileSync(file, next, 'utf8');
console.log(`${file}: ${edits.length} edits, pairs:`, [...pairs.entries()]);
