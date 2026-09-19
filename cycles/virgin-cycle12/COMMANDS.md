# virgin-cycle12 -- commands

Copy-paste commands for this cycle only. Run from the repo root unless noted.

## Rerun the checks this cycle relied on

Test suite:

```
cd app
node --experimental-strip-types tests/run.ts
```

Fast syntax-only check on the fixed file (use this instead of a full `tsc --noEmit` if that
times out on this mount):

```
cd app
node -e "
const ts = require('typescript');
const fs = require('fs');
const src = fs.readFileSync('src/ui/routeNamingCard.tsx', 'utf8');
const result = ts.transpileModule(src, { compilerOptions: { jsx: ts.JsxEmit.ReactNative, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 }, reportDiagnostics: true });
if (result.diagnostics && result.diagnostics.length) {
  result.diagnostics.forEach(d => console.log(ts.flattenDiagnosticMessageText(d.messageText, '\n')));
} else {
  console.log('SYNTAX_OK');
}
"
```

Full type-check (per `CLAUDE.md`, this can blow a single call's time budget on this mount --
it did not complete for this cycle):

```
cd app
./node_modules/.bin/tsc --noEmit
```

## Re-verify no other file in the repo has this same mojibake pattern

```
cd app
python3 -c "
import re, os
exts = ('.ts','.tsx','.js','.jsx','.json')
files_with_issue = []
for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in ('node_modules','.git')]
    for fn in files:
        if fn.endswith(exts):
            p = os.path.join(root, fn)
            try:
                data = open(p, encoding='utf-8').read()
            except Exception:
                continue
            hits = re.findall(r'â\x80\x94|â\x80¦|â\x89¥|Â§|Â·|Ã\x97', data)
            if hits:
                files_with_issue.append((p, len(hits)))
for p, c in files_with_issue:
    print(p, c)
print('total files:', len(files_with_issue))
"
```

Expect: no output before "total files: 0" (once this cycle's fix is applied/committed).
