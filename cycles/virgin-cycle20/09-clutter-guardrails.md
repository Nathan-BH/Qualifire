# 09 — Clutter guardrails: every rider-visible string is budgeted, allowlisted and owned by Nathan

**Source: Nathan, 2026-10-02** (CLUTTER-AUDIT.md, overall feedback) — "Lets also have measures in
place to avoid adding clutter in the future to the app, I am afraid it might happen in future updates
if I am not carefull. So better to have hard guardrails in place." He has had to ask repeatedly to
remove sub-labels under buttons, hint lines, banners, status lines, helper captions and long alert
bodies. Ruling: **hard guardrails, not goodwill** — (1) a test that fails on any new or changed
visible string until it is consciously allowlisted with a reason, plus budgets that an allowlist
entry cannot waive; (2) repo rules (CLAUDE.md, CONVENTIONS.md, the Inspect checklist); (3) a
re-runnable audit procedure for before launch.

Nathan's philosophy, binding for every rule below (from CLUTTER-AUDIT.md / CLUTTER-REVIEW.md):
rider-facing text is minimal; a figure, a number or one word beats a sentence; no explanatory
sub-labels; no hints that restate the obvious; "the user should not be concerned with this" is the
default for status lines; warnings go in the **existing temporary yellow-button sub-label flash**
(`flashGpsOff`, `RecordScreen.tsx`) — never a banner; ` · ` instead of an em dash.

**Status: brief only. Nothing below is in the repo.** Written 2026-10-02 by the Plan tier (Fable)
against the working tree (branch `virgin`, HEAD `ae911bb`; cycle19 + cycle20 briefs 01-08
unexecuted at writing time). Executor: Sonnet, cold, this file only.
**Sequence: STRICTLY AFTER briefs 04 (PAUSE label), 05 ("ride" → "activity") and 08
(remove-clutter) have landed and their Inspect passed.** The allowlist this brief generates is a
snapshot of the visible strings *after* the cleanup; generated earlier it would freeze the clutter
in. If `git log` / `STATE.md` do not show 04, 05 and 08 landed, STOP and report — do not start.

## What this changes on the phone — and what it does not

- **Nothing on the phone.** Tests, one script, one JSON file, process docs. No `src/` edit, no
  native, no config, no OTA, no build.
- **What changes for every future agent:** adding or changing a string a rider can see makes
  `tests/run.ts` FAIL until `app/tests/ui-strings.allow.json` gets an entry with a reason — that
  entry shows up in Nathan's review diff. Some budgets cannot be waived by an entry at all
  (§Decisions 4).

## Evidence (read 2026-10-02, HEAD `ae911bb`)

- `app/tests/run.ts`: suites are side-effect imports; the last suite import is
  `import './ridenotification_suite.ts';` followed by `import { runAll } from './lib.ts';` and
  `const { fail } = await runAll(); process.exitCode = fail > 0 ? 1 : 0;`.
- `app/tests/lib.ts` exports `test(name, fn)`, `assert(cond, msg)`, `skip(note)`, `loadJson`,
  `TESTS_DIR = import.meta.dirname`. Suites that read source as text already exist
  (`ridenotification_suite.ts`: `const APP_DIR = path.resolve(TESTS_DIR, '..')`, `fs.readFileSync`).
- `app/node_modules/typescript/package.json` → `"version": "5.9.3"` (installed, has
  `lib/typescript.js` + `lib/typescript.d.ts`). Node on the PC: `v22.23.2`.
- `app/tsconfig.json` extends `expo/tsconfig.base` (`esModuleInterop: true`, `jsx: react-jsx`,
  `moduleResolution: bundler`, `allowImportingTsExtensions: true`, no `include` → `tests/` and
  `scripts/` are type-checked by `tsc --noEmit`). `app/scripts/` already holds `.ts` tools
  (`wp3-swap-identifiers.ts` etc.), so a new script there is in convention.
- Scan scope sizes: `App.tsx` + `src/ui/**` (incl. `src/ui/preview/`) + `src/location/*.ts` = **67
  files**. A dry run of the compiler-API walk specified below (Plan's own spot-check, 2026-10-02, on
  the HEAD tree) found **338** structural strings in **~1.1 s** on this mount — well inside budget.
  Distribution: 191 JSX text, 56 alert title/body, 48 visible attributes, 21 visible object props,
  8 template children. Expect fewer after 08.
- Strings that the structural walk alone does **not** see (hence tier B in Decision 2):
  `RecordScreen.tsx` ~975-1004 `const gpsLine = … ? 'waiting for first GPS fix…' : … : 'GPS live'`
  and the `wayLine` ternary; line 102 `const GPS_OFF_MSG = 'Location (GPS) is turned off'`;
  the helper `const yellowSub = (caption: string) => (…)` (line 510) called as
  `{yellowSub('same ride · new meaning')}` (1690) — these are plain string literals assigned to
  variables or passed to a local helper.
- Visible attributes in use: `settings.tsx` `function Row(props: { label: string; hint?: string; … })`
  with 13 `hint="…"` call sites; `GateAdjustScreen.tsx:125` `subtitle="…"`; `accessibilityLabel`
  on several screens; `label` on stat rows in `CatalogDetailScreen.tsx`.
- Notification text lives in `src/location/index.ts` as object properties
  `notificationTitle: '…'`, `notificationBody: '…'` (lines 397-398 at HEAD; brief 05 rewrites them)
  and `src/location/rideNotificationPolicy.ts:46-47` `subText = 'finished'` / `` `S${…}` ``.
- Banner pattern: `RecordScreen.tsx` `styles.warnBox` (style at line 1791: card-coloured box with
  border, used at 1199 and 1209 for the two permission banners that brief 08 removes). No other
  `*Box`-named warn/notice style exists in `src/ui/*.tsx` (grep 2026-10-02).
- Em dashes: 17 visible ones at HEAD; brief 08 (Q7 default) replaces all but the lone `—`
  placeholders. Any survivor is handled by the bootstrap `legacy` mechanism (Decision 5).
- Process files: `CLAUDE.md` has numbered points 1-8 (8 = pointer to CONVENTIONS.md).
  `process/CONVENTIONS.md` holds the tier table (the Inspect row reads
  `| **Inspect** | Opus subagent, **fresh context** | Adversarial verification; reruns every check itself | trusting the executor's report; editing |`),
  `## Honesty rules`, `## Verification, every time code lands` (a two-line code block). There is
  **no** `process/CYCLE.md` (README.md still lists it — stale, out of scope); the Inspect
  checklist IS the tier table row + the verification block, so that is where the Inspect duty goes.
- `process/README.md` is a 3-row table of files in `process/`.

## Executor rules (binding)

- **Stop-on-ambiguity.** Any anchor not where this brief says, any name that differs, any test
  that fails for a reason this brief does not predict → stop and report verbatim (file, expected,
  found). Never guess, never patch around it. In particular: **never edit a string in `src/` to
  make a budget pass** — wording is Nathan's; the bootstrap `legacy` mechanism exists for exactly
  that case.
- No commit unless told (`GIT_OPTIONAL_LOCKS=0 git …`). **Never delete** — `safe_to_delete/`.
  No `npm install`, no `npx`. Node only.
- The two new `tests/` files and the script run under `node --experimental-strip-types`: use
  **erasable TypeScript only** — no `enum`, no `namespace`, no parameter properties, no
  `import x = require()`. Import the compiler as `import ts from 'typescript';` (CJS default
  export; works under strip-types and under `tsc` with the base config's `esModuleInterop`).
  Relative imports carry the `.ts` extension, as every suite does.
- **Files touched — exactly these, nothing else:**
  - NEW `app/tests/ui_strings_extract.ts` (extractor + rule checker; pure; shared)
  - NEW `app/tests/ui_strings_suite.ts`
  - NEW `app/tests/ui-strings.allow.json` (**generated**, never hand-written by the executor)
  - NEW `app/scripts/gen-ui-strings-allow.ts`
  - EDIT `app/tests/run.ts` (one import line)
  - EDIT `app/tests/README.md` (one paragraph appended at the end)
  - EDIT `CLAUDE.md` (new point 9)
  - EDIT `process/CONVENTIONS.md` (Inspect row, new section, verification block)
  - EDIT `process/README.md` (one table row)
  - NEW `process/CLUTTER-AUDIT-HOWTO.md`
  - NEW `cycles/virgin-cycle20/09-ALLOWLIST-REVIEW.md` (generator summary for Nathan)
- Do **not** touch: anything under `app/src/`, `App.tsx`, `app.json`, `package.json`,
  `tsconfig.json`, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, other files in this folder, `node_modules/`.

## Goal

After this brief: `node --experimental-strip-types tests/run.ts` includes a `ui_strings` suite that
(a) statically extracts every rider-visible string from the scan scope with the TypeScript compiler
API, (b) fails on any string not in `tests/ui-strings.allow.json` — and on any allowlist entry that
no longer exists — with a message that says exactly what to do, (c) enforces budgets (40-char
sub-labels unless `long: true`; alert bodies ≤ 20 words; no em dash; no banner box outside the
approved list) that no new entry can waive, (d) is itself unit-tested on in-memory samples and
proves it catches a planted string. The allowlist is generated once from the post-08 tree, is owned
by Nathan, and every later change to it is a conscious, justified, reviewable diff. CLAUDE.md,
CONVENTIONS.md and the Inspect duty say so; a HOWTO explains re-running the human audit.

## Decisions

1. **TypeScript compiler API, not regex.** `ts.createSourceFile(file, text, ts.ScriptTarget.Latest,
   true, ScriptKind.TSX|TS)` + a recursive `ts.forEachChild` walk. Regex cannot tell a `<Text>`
   child from a storage key or a comment; the AST can, and the installed `typescript@5.9.3` costs
   ~1 s for the whole scope. No type-checker (`createProgram`) — syntax only, keeps it fast.
2. **Two extraction tiers, one output shape** `{ file, line, kind, text }` (`file` relative to
   `app/`, forward slashes; `text` whitespace-normalised: `\s+` → one space, trimmed).
   **Tier A — structural (kind names fixed):**
   - `text`: `JsxText` nodes; and `JsxExpression` children of a JSX element whose expression is a
     `StringLiteral`, `NoSubstitutionTemplateLiteral` or `TemplateExpression`.
   - `attr:<name>`: `JsxAttribute` whose name is in `VISIBLE_PROPS` and whose initializer is a
     string literal, or a `JsxExpression` wrapping a string / no-substitution / template literal.
   - `alert-title`, `alert-body`: arguments 0 and 1 of a `CallExpression` whose callee text is
     exactly `Alert.alert`, when they are string / template literals.
   - `prop:<name>`: `PropertyAssignment` whose name is in `VISIBLE_PROPS ∪ NOTIFICATION_PROPS` and
     whose initializer is a string / template literal (covers `Alert.alert` button `text:`,
     `notificationTitle`, `notificationBody`, `subText`).
   - `VISIBLE_PROPS = ['label','title','sub','subtitle','hint','caption','placeholder',
     'accessibilityLabel','accessibilityHint','message','text','helper','description','note',
     'legend','empty','emptyText']`; `NOTIFICATION_PROPS = ['notificationTitle','notificationBody','subText']`.
   **Tier B — prose literals (kind `literal`):** every other `StringLiteral`,
   `NoSubstitutionTemplateLiteral` or `TemplateExpression` in the scanned files whose normalised
   text is *prose* — matches `/[A-Za-z]{2,}[^A-Za-z]+[A-Za-z]{2,}/` (two words) **or** ends with
   `…` — **unless** the node sits in an excluded position: module specifier of an import/export or
   `import()`/`require()` argument; inside a type (`LiteralTypeNode`, or any ancestor that is a
   type node); a property name or computed property name; a `CaseClause` expression; either
   operand of a `BinaryExpression` with `===`, `!==`, `==`, `!=`; any argument of a call whose
   callee text starts with `console.`; the argument of `new Error(` / `Error(` or the operand of a
   `throw`; the value of a JSX attribute named `style`, `testID`, `key`, `source`, `uri`, `name`,
   `accessibilityRole`, `fontFamily`; anywhere inside a `StyleSheet.create(` call. Tier B is why a
   string assigned to a `const`, returned from a `.ts` model, or passed to a local helper like
   `yellowSub('…')` cannot slip through. False positives are cheap (one bootstrap entry) and are
   listed for Nathan in `09-ALLOWLIST-REVIEW.md`.
   **Templates** are recorded as their skeleton: literal parts kept, every `${…}` span replaced by
   the three characters `{…}` (so `` `last fix ${n}s ago` `` → `last fix {…}s ago`).
   **Dropped**: any text without two consecutive letters (`·`, `●`, `—`, `:`, numbers) — except
   that the lone `—` placeholder is deliberately not an entry (it is not prose). **Dedupe** by
   `file|kind|text`, first line kept.
   Scan scope (`scanFiles(appDir)`): `App.tsx`; every `.ts`/`.tsx` under `src/ui/` recursively
   (including `preview/`); every `.ts` directly under `src/location/`. Sorted by path. `src/store/`
   is **not** scanned (its one message reaches the UI only via `Alert.alert(…, e.message)`; Open call A).
3. **The allowlist mirrors the code exactly — both directions fail.** A string in code and not in
   the list → `unlisted`; an entry in the list with no string in code → `stale`. Exact mirroring is
   what makes the diff of `ui-strings.allow.json` a complete, honest record of what riders see; it
   also stops anyone pre-seeding entries. Key = `(file, kind, text)` — moving a string to another
   file or promoting it (e.g. from `alert-body` to always-visible `text`) is a conscious new entry.
4. **Budgets — two classes.**
   *Waivable per entry (visible in the diff):* **`too-long`** — `text.length > 40` for every kind
   except `alert-body` requires `"long": true` on the entry (plus the ordinary reason).
   *Hard (no entry field waives them; only the bootstrap `legacy` mechanism, Decision 5):*
   **`alert-words`** — an `alert-body` with more than 20 words (skeleton words, `{…}` not counted);
   **`em-dash`** — any text containing `—` (U+2014) — the message says `use ' · '`;
   **`banner`** — any JSX `style` attribute whose expression text contains an identifier matching
   `/\b(warn|notice|banner|hint|info|help|tip)[A-Za-z]*Box\b|\bbanner[A-Za-z]*\b/i` must appear in
   the allowlist's `banners` array (`{file, style, reason}`), and every `banners` entry must still
   be used (stale fails too). This is the "warnBox-like pattern" — a bordered box of warning prose;
   the yellow-button flash is the approved channel for warnings.
   Also hard: **`no-reason`** — every entry needs `reason` (≥ 12 chars), `since` (`YYYY-MM-DD`),
   `by` (free text: `bootstrap`, `nathan`, or `agent:<cycle>/<brief>`); **`floor`** — the live scan
   must find ≥ 50 entries (guards against the scanner silently scanning nothing after a path move).
5. **Bootstrap honesty: `legacy` entries, frozen.** The post-08 tree may still hold strings that
   break a hard rule (an alert body of 31 words in `GateAdjustScreen.tsx:90` at HEAD; any em dash
   08 left). The executor must not reword them. The generator marks each such entry
   `"legacy": true, "violates": ["alert-words"|"em-dash", …]`, sets `by: "bootstrap"`,
   `since: <generatedAt>`, and writes `legacyCount: <n>` in the header. The checker accepts a
   legacy entry only if `by === 'bootstrap'`, `since === header.generatedAt`, and it violates
   nothing outside its own `violates` list; and the number of legacy entries must equal
   `legacyCount`. So a legacy badge cannot be added later without also editing the header — two
   glaring lines in Nathan's diff. Shortening a legacy string later means: remove its `legacy`
   fields and decrement `legacyCount` (good news, visible).
6. **Allowlist file shape** (`app/tests/ui-strings.allow.json`, 2-space JSON, entries sorted by
   `file`, then `kind`, then `text` — line numbers are NOT stored, they drift):
   ```json
   {
     "owner": "Nathan",
     "rule": "Every string a rider can see must be listed here with a reason. Nathan owns this file. Agents may APPEND an entry only with a one-line justification and must say so in their report; they never regenerate this file. Budgets (process/CONVENTIONS.md § Rider-facing text): 40 chars unless long:true; alert body <= 20 words; no em dash (use ' · '); warnings flash in the yellow button's sub-label, never a banner box.",
     "generatedAt": "2026-10-XX",
     "generatedFrom": "<short HEAD sha>",
     "legacyCount": 0,
     "banners": [],
     "entries": [
       { "file": "src/ui/RecordScreen.tsx", "kind": "text", "text": "GPS live",
         "reason": "bootstrap: survived the cycle20 clutter audit (CLUTTER-REVIEW.md)",
         "since": "2026-10-XX", "by": "bootstrap" }
     ]
   }
   ```
   Optional per-entry fields: `"long": true`, `"legacy": true`, `"violates": [...]`.
7. **Generator refuses to overwrite.** `gen-ui-strings-allow.ts` exits 2 with a message if the
   allowlist exists, unless `--force` is passed — regenerating is how an agent could launder new
   strings, so it is loud and explicit. The generator prints a summary (counts; every `long`,
   `legacy` and `literal`-kind entry with file:line) which the executor saves verbatim into
   `cycles/virgin-cycle20/09-ALLOWLIST-REVIEW.md` for Nathan.
8. **Self-test by construction.** The extractor and the checker are pure functions over
   `(fileName, sourceText)` and `(entries, allowlist)`, so the suite unit-tests them on small
   in-memory sources and an in-memory allowlist — including a planted clutter string that must
   produce exactly one `unlisted` violation. A second, live proof: with env
   `UI_STRINGS_INJECT="src/ui/RecordScreen.tsx|text|Tap here to begin your activity"` the live-tree
   test appends that synthetic entry to the real scan and must FAIL naming it. The hook can only
   add entries, never remove — it cannot be used to pass.
9. **Perf bar.** The live scan asserts `< 6000 ms` (hard FAIL above) and prints the measured
   time; target on the PC is `< 3 s` (dry run: ~1.1 s). The mount is slow; 6 s keeps the test
   stable without letting a `createProgram`-style regression in unnoticed.
10. **Process text is minimal and lands in the files agents actually read**: a 4-line point 9 in
    `CLAUDE.md`; a `## Rider-facing text` section in `CONVENTIONS.md`; the Inspect duty in the tier
    table row and the verification block (the only Inspect checklist this branch has); a short
    HOWTO for the periodic human audit.

## Files to touch

### 1. NEW `app/tests/ui_strings_extract.ts`

Pure module, no `lib.ts` import (so the generator can import it too), no React/Expo imports.
Exports, with these exact names and signatures:

```ts
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
export const VISIBLE_PROPS: ReadonlySet<string>;      // Decision 2 list
export const NOTIFICATION_PROPS: ReadonlySet<string>; // Decision 2 list
export const BANNER_STYLE_RE: RegExp;                  // Decision 4 pattern
export const HARD_RULES: readonly string[] = ['alert-words', 'em-dash'];

export function normalise(text: string): string;               // \s+ → ' ', trim
export function skeleton(tpl: ts.TemplateExpression): string;  // literal parts + '{…}' per span
export function isProse(text: string): boolean;                // Decision 2 tier-B test
export function extractFromSource(relFile: string, source: string): { strings: UiString[]; banners: BannerUse[] };
export function listScanFiles(appDir: string): string[];       // absolute paths, sorted
export function scanFiles(appDir: string): { strings: UiString[]; banners: BannerUse[] };
export function wordCount(text: string): number;               // skeleton minus '{…}', split on \s+
export function checkRules(found: { strings: UiString[]; banners: BannerUse[] }, allow: AllowList): Violation[];
export function formatViolation(v: Violation): string;
```

Behaviour per Decisions 2-5. `extractFromSource` picks `ScriptKind.TSX` for `.tsx`, `TS` otherwise;
`setParentNodes = true`. Line = `sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1`.
Banner detection: every `JsxAttribute` named `style` → take its initializer's full text
(`getText(sf)`), run `BANNER_STYLE_RE` with the `g` flag, record each distinct identifier matched
(e.g. `warnBox`) as `{file, line, style}`.

`checkRules` emits, in this order: `floor` (if `found.strings.length < MIN_ENTRIES`, one
violation), then per extracted string `unlisted`, then per entry `stale`, `no-reason`, `too-long`,
`alert-words`, `em-dash`, legacy misuse (`legacy-stamp`: `by`/`since` wrong; `legacy-scope`: a
violated rule not in `violates`; `legacy-count`: total ≠ header), then `banner` (unlisted use) and
`banner-stale`. The `unlisted` message is exactly:

```
UNLISTED visible string  <file>:<line>  [<kind>]  "<text>"
  New or changed rider-facing text. Nathan owns app/tests/ui-strings.allow.json.
  Either remove the text (preferred — a figure, a number or one word beats a sentence), or
  APPEND an entry {file, kind, text, reason, since, by} with a one-line justification and say so
  in your report. Budgets: <=40 chars (else "long": true), alert body <=20 words, no em dash (use ' · '),
  warnings flash in the yellow button's sub-label — never a banner.
```
Other messages are one line each, naming the rule, `file:line`, kind, text and the fix
(`stale` → "remove the entry"; `too-long` → `N chars > 40: shorten, or add "long": true`;
`alert-words` → `N words > 20: shorten — cannot be waived`; `em-dash` → `contains — : use ' · '`;
`banner` → `banner-style box <style> not in banners[]: use the yellow button sub-label flash instead`).

### 2. NEW `app/tests/ui_strings_suite.ts`

Imports `test`, `assert`, `loadJson`, `TESTS_DIR` from `./lib.ts` and everything needed from
`./ui_strings_extract.ts`. `const APP_DIR = path.resolve(TESTS_DIR, '..')`. Thirteen tests, names
prefixed `ui-strings:`:

1. `extractor: JSX text and string/template children` — in-memory `.tsx` with
   `<Text>GPS live</Text>`, `<Text>{'same activity · new meaning'}</Text>`,
   `` <Text>{`last fix ${n}s ago`}</Text> ``, `<Text>{'●'} RECORD</Text>` → entries
   `text|GPS live`, `text|same activity · new meaning`, `text|last fix {…}s ago`, `text|RECORD`;
   nothing for `●`.
2. `extractor: visible attributes, Alert.alert, notification props` — sample with
   `<Row label="Active sport" hint="Everything here is scoped." />`, `<X style={s.a} testID="t" />`,
   `Alert.alert('Could not save', 'The gates were not saved.', [{ text: 'OK' }])`,
   `const o = { notificationTitle: 'Qualifire · recording activity', notificationBody: 'GPS on until Stop.' }`
   → `attr:label`, `attr:hint`, `alert-title`, `alert-body`, `prop:text`, `prop:notificationTitle`,
   `prop:notificationBody`; no entry for `testID`/`style`.
3. `extractor: tier-B prose literals via const / ternary / helper call` — sample
   `const GPS_OFF = 'Location (GPS) is turned off'; const line = ok ? 'GPS live' : 'waiting for first GPS fix…'; {yellowSub('the clock runs from here')}`
   → `literal` entries for all four texts (`GPS live` qualifies only if two-word: it does — "GPS"
   + "live"), kind `literal`.
4. `extractor: excluded positions yield nothing` — sample with `import x from 'react native thing'`,
   `type P = 'armed phase' | 'setup phase'`, `if (a === 'not a label') {}`, `case 'two words':`,
   `console.log('two words here')`, `throw new Error('bad thing happened')`,
   `StyleSheet.create({ a: { fontFamily: 'Some Font' } })`, `<V style={s.warn} key="a b" />`,
   `{ 'two words': 1 }` → zero strings. (Banner detection still records `warn`? No — `warn` does
   not match `BANNER_STYLE_RE` (needs `…Box` or `banner…`); assert zero banners too.)
5. `extractor: template skeleton and normalisation` — multi-line JSX text with newlines and
   double spaces normalises to single spaces; `` `${a} · way locked${b}` `` → `{…} · way locked{…}`.
6. `rules: unlisted and stale both fail, with the remediation message` — in-memory allowlist with
   one entry; found has one different string → exactly one `unlisted` (message contains
   `Nathan owns app/tests/ui-strings.allow.json` and `APPEND an entry`) and one `stale`.
   Use `MIN_ENTRIES` bypass: build `found.strings` by repeating a listed filler string across 50
   synthetic files **or** pass an allowlist whose entries cover 50 synthetic strings — pick the
   simplest; the point is no `floor` noise in these unit tests (a helper `fillerFound(n)` +
   `fillerAllow(n)` in the suite is fine).
7. `rules: too-long needs long:true` — a 41-char `attr:hint` without `long` → `too-long`; with
   `"long": true` → clean. An `alert-body` of 41 chars / 8 words → clean without `long`.
8. `rules: hard budgets cannot be waived; legacy only with the bootstrap stamp` — an `alert-body`
   of 21 words with `long: true` still → `alert-words`; a text with `—` → `em-dash`; the same
   entries with `legacy: true, violates: [...], by: 'bootstrap', since: allow.generatedAt` and
   `legacyCount: 2` → clean; change `since` → `legacy-stamp`; `legacyCount: 1` → `legacy-count`;
   `violates: ['em-dash']` on the alert → `legacy-scope`.
9. `rules: banner box outside banners[] fails; listed passes; stale banner fails` — found.banners
   `[{file, line, style: 'warnBox'}]` vs empty `banners` → `banner`; listed → clean; listed but
   not found → `banner-stale`.
10. `rules: planted clutter string is caught` — the regression fixture: in-memory file
    `src/ui/__planted__.tsx` containing
    `<Text style={styles.hint}>Tap here to begin your activity</Text>` run through
    `extractFromSource`, merged into a found-set that otherwise matches a clean allowlist →
    exactly one violation, rule `unlisted`, text `Tap here to begin your activity`.
11. `live tree: scan is complete and fast` — `scanFiles(APP_DIR)`: `strings.length >= MIN_ENTRIES`,
    elapsed `< 6000` ms (print `ui-strings: scanned N files, M strings, K banners in T ms` via
    `console.log`), `listScanFiles` includes `App.tsx`, `src/ui/RecordScreen.tsx`,
    `src/ui/settings.tsx`, `src/location/index.ts` and nothing under `tests/` or `node_modules/`.
12. `live tree: every visible string is allowlisted and within budget` — **the guard.** Load
    `ui-strings.allow.json` with `loadJson`; if `process.env.UI_STRINGS_INJECT` is set
    (`file|kind|text`), push that synthetic `UiString` (line 0) onto `found.strings`;
    `checkRules` → must be `[]`; on failure the assert message is the first 20 violations joined by
    `\n` plus `… and N more` — so the FAIL line in `run.ts` output tells the developer what to do.
13. `allowlist: header and entry hygiene` — `owner === 'Nathan'`, `generatedAt` matches
    `/^\d{4}-\d{2}-\d{2}$/`, `generatedFrom` non-empty, `rule` mentions `Nathan owns`, every entry
    has string `file`/`kind`/`text`/`reason`/`since`/`by`, entries are sorted by
    `file, kind, text` (so diffs stay minimal), no duplicate keys.

### 3. NEW `app/scripts/gen-ui-strings-allow.ts`

```
cd app && node --experimental-strip-types scripts/gen-ui-strings-allow.ts [--force]
```
Imports from `../tests/ui_strings_extract.ts`. Steps: refuse if `tests/ui-strings.allow.json`
exists and no `--force` (exit 2, message: `allowlist exists — Nathan owns it; agents append
entries, they do not regenerate. Pass --force only on Nathan's instruction.`); `scanFiles`; build
entries with `reason: 'bootstrap: survived the cycle20 clutter audit (CLUTTER-REVIEW.md)'`,
`since` = today (`YYYY-MM-DD`, local date), `by: 'bootstrap'`, `long: true` where
`kind !== 'alert-body' && text.length > MAX_LEN`, `legacy: true` + `violates` where a hard rule
fails (`alert-words`, `em-dash`); `banners` from `found.banners` (dedupe by `file|style`, reason
`bootstrap: existing box at generation — review`); header `generatedFrom` = `git rev-parse --short HEAD`
via `child_process.execSync` with `GIT_OPTIONAL_LOCKS=0` in env (fall back to `'unknown'` on error);
`legacyCount` = number of legacy entries; sort; write with `JSON.stringify(_, null, 2) + '\n'`.
Then run `checkRules` on what it just wrote and exit 1 if any violation remains (there must be
none by construction — if there is, that is a bug in the generator: stop and report).
Print the summary (stdout): totals per kind; then three lists with `file:line  [kind]  "text"`:
**LEGACY (hard-rule breakers frozen at bootstrap — Nathan to shorten or accept)**,
**LONG (>40 chars, waived with long:true — review)**, **LITERAL (tier-B catches — check each is
really rider-visible; a false positive is harmless but worth knowing)**.

### 4. EDIT `app/tests/run.ts`

After the line `import './ridenotification_suite.ts';` add `import './ui_strings_suite.ts';`
(before `import { runAll } from './lib.ts';`). Nothing else.

### 5. Bootstrap — run order (do it in this order, record every output)

1. Create files 1-3, edit 4. Run `cd app && node --experimental-strip-types tests/run.ts` once
   **before** generating the allowlist: expect exactly **one** FAIL — test 12 (`loadJson` on a
   missing file, or `floor`/`unlisted` if you stub) — and test 13 FAIL as well (missing file) →
   i.e. 2 FAILs, all other `ui-strings:` tests PASS. Record the summary line. (If any *other*
   suite's count changed, stop: something outside this brief is in the tree.)
2. `cd app && node --experimental-strip-types scripts/gen-ui-strings-allow.ts` → file written;
   save the printed summary verbatim as `cycles/virgin-cycle20/09-ALLOWLIST-REVIEW.md` under a
   heading `# 09 — allowlist bootstrap, <date>, HEAD <sha>` and one line for Nathan:
   `Nathan: this file is yours from here on. LEGACY = texts still over a hard budget after brief 08 — shorten them or leave them frozen; LONG = over 40 chars, review; LITERAL = heuristic catches, glance for false positives.`
3. Run the suite again → **zero FAIL**; record the summary line and the `ui-strings: scanned …`
   timing line.
4. Proof the guard bites: `cd app && UI_STRINGS_INJECT="src/ui/RecordScreen.tsx|text|Tap here to begin your activity" node --experimental-strip-types tests/run.ts`
   → exactly one FAIL (test 12) whose message contains `UNLISTED visible string` and the planted
   text. Record the FAIL line verbatim. Run once more without the env → zero FAIL.
5. `cd app && ./node_modules/.bin/tsc --noEmit` → exit 0.

### 6. EDIT `app/tests/README.md` — append at end of file

```
**UI strings suite** (`ui_strings_suite.ts`, virgin-cycle20 brief 09, Nathan's clutter guardrail): a TypeScript-compiler-API scan of `App.tsx`, `src/ui/**` and `src/location/*` extracts every rider-visible string (JSX text, `<Text>` children, visible attributes such as `label`/`hint`/`subtitle`/`accessibilityLabel`, `Alert.alert` title/body, notification props, plus any prose literal assigned to a variable or passed to a helper) and mirrors it against `ui-strings.allow.json` — **Nathan's file**. Unlisted string → FAIL; stale entry → FAIL; >40 chars without `long: true` → FAIL; alert body >20 words, any em dash, any `*Box` banner style outside `banners[]` → FAIL and cannot be waived (bootstrap `legacy` entries are frozen by count). Regenerating the list is `scripts/gen-ui-strings-allow.ts --force`, Nathan's call only. Plant-test: `UI_STRINGS_INJECT="src/ui/RecordScreen.tsx|text|Tap here" node --experimental-strip-types tests/run.ts` must FAIL once.
```

### 7. EDIT `CLAUDE.md` — new point 9, appended after point 8 (keep the numbered-list style)

```
9. **Rider-facing text is budgeted and owned by Nathan.** Every string a rider can see is mirrored
   in `app/tests/ui-strings.allow.json`; `tests/run.ts` fails on any string not in it, any entry no
   longer in code, >40 chars without `long: true`, any alert body >20 words, any em dash, any banner
   box. Agents may append an entry only with a one-line reason and must say so in their report;
   warnings flash in the yellow button's sub-label, never a banner. `process/CONVENTIONS.md` § Rider-facing text.
```

### 8. EDIT `process/CONVENTIONS.md`

(a) Tier table, Inspect row — replace
```
| **Inspect** | Opus subagent, **fresh context** | Adversarial verification; reruns every check itself | trusting the executor's report; editing |
```
with
```
| **Inspect** | Opus subagent, **fresh context** | Adversarial verification; reruns every check itself — including `tests/run.ts` with the `ui-strings` suite and `git diff -- app/tests/ui-strings.allow.json`: every added/changed entry is quoted in the Inspect report (see § Rider-facing text) | trusting the executor's report; editing |
```

(b) New section, inserted immediately **before** `## File ownership`:
```
## Rider-facing text (added 2026-10-02 at Nathan's request, virgin-cycle20)

Nathan has had to ask repeatedly to remove sub-labels, hint lines, banners, status lines and long
alert bodies; these rules are the guardrail so it does not creep back.

- **Minimal.** A figure, a number or one word beats a sentence. No explanatory sub-label under a
  button; no hint that restates the obvious; no status line about machinery the rider "should not
  be concerned with" (GPS fix age, route detection, loading).
- **Warnings use the yellow button's sub-label flash, never a banner.** The pattern is
  `flashGpsOff` in `RecordScreen.tsx`: the message replaces the button's caption for ~2 s, fades,
  and the caption returns. No `warnBox`-style boxes, no top-of-screen notices.
- **` · ` not `—`.** Middle dot between fragments; the lone `—` stays only as an empty-value placeholder.
- **Budgets, enforced by `app/tests/ui_strings_suite.ts`:** every visible string must be in
  `app/tests/ui-strings.allow.json` (**Nathan's file**) with `reason`/`since`/`by`; >40 chars needs
  `long: true`; alert bodies ≤ 20 words, no em dash, no banner box — these three cannot be waived
  (bootstrap `legacy` entries are frozen by count). Agents **append** entries, never regenerate the
  file, and say in their report exactly which entries they added. Nathan reviews that diff.
- **Every brief that adds or changes visible text carries an `## Added visible text` table**
  (`file | kind | exact text | why it earns its place`) — so the decision is made at Plan time,
  not discovered by the test.
- **Inspect** runs the suite and diffs the allowlist; any new entry is quoted in its report.
- **Before launch** the human audit is re-run: `process/CLUTTER-AUDIT-HOWTO.md`.
```

(c) Verification block — replace
```
cd app && node --experimental-strip-types tests/run.ts   # zero FAIL
cd app && ./node_modules/.bin/tsc --noEmit                # exit 0
```
with
```
cd app && node --experimental-strip-types tests/run.ts   # zero FAIL (includes the ui-strings guard)
cd app && ./node_modules/.bin/tsc --noEmit                # exit 0
GIT_OPTIONAL_LOCKS=0 git diff --stat -- app/tests/ui-strings.allow.json   # any change → quote the entries in the report
```

### 9. EDIT `process/README.md` — add one table row after the `BETA-TESTERS.md` row

```
| `CLUTTER-AUDIT-HOWTO.md` | How to re-run the rider-visible-text (clutter) audit before launch; pairs with the `ui-strings` test guard (virgin-cycle20 brief 09). |
```
(Do not fix the stale `CYCLE.md` row — out of scope; mention it in the report.)

### 10. NEW `process/CLUTTER-AUDIT-HOWTO.md`

```
# Clutter audit — how to re-run it (before launch, and after any big UI cycle)

Nathan, 2026-10-02: "great analysis that should be done some time in the future again before the app
is actually launched." The automated guard (`app/tests/ui_strings_suite.ts`) stops *new* text from
slipping in unnoticed; this human pass judges whether what is *listed* still earns its place.

## When
Before the first public launch; afterwards after any cycle that touched more than one screen.

## How (Haiku Digest, ~20 min, no code changes)
1. Dispatch a Haiku subagent with the prompt below; it reads `app/tests/ui-strings.allow.json`
   first (the complete inventory — no grep needed), then opens each file at the listed strings
   for context.
2. Save its table as `cycles/<current-cycle>/CLUTTER-AUDIT.md`.
3. Nathan answers inline under each table (`*` lines) as in `cycles/virgin-cycle20/CLUTTER-AUDIT.md`.
4. A Fable pass turns the answers into briefs; every removal shrinks the allowlist (stale entries
   fail the suite until removed — that is the checkable artifact).

## The prompt (paste verbatim, fill the cycle name)
> Audit every rider-visible string in the Qualifire app. Start from `app/tests/ui-strings.allow.json`
> (the complete inventory: file, kind, exact text). For each entry open the file, find the string
> and fill one table row per screen section: **Exact text | file:line | context (what element) |
> when shown (state/phase) | how to see it (tap path) | rating** where rating ∈ `likely-clutter`
> (explanatory sub-label, hint restating the obvious, status about internals, banner, sentence
> where a word would do) · `maybe` · `useful`. Rules of thumb from Nathan: rider-facing text is
> minimal; a figure, a number or one word beats a sentence; "the user should not be concerned with
> this" is the default for status lines; warnings belong in the yellow button's sub-label flash,
> never a banner; ` · ` not `—`. Also list any `long: true` or `legacy: true` entries separately.
> Present text as-is, no rewrites. End with totals by rating and by screen. Write the result to
> `cycles/<cycle>/CLUTTER-AUDIT.md`.
```

## Verification plan

1. §5 step 1: suite with the new files but **no** allowlist → exactly the predicted FAILs
   (tests 12 and 13), every other `ui-strings:` test PASS; all pre-existing suites unchanged.
2. §5 steps 2-3: generator writes the file; `cd app && node --experimental-strip-types tests/run.ts`
   → **zero FAIL**, total = (baseline after 04/05/08) + 13. Report the exact summary line and
   the `ui-strings: scanned N files, M strings …` line (expect N = 67 unless 08 added/removed a
   file, M in the low hundreds, T well under 3000 ms).
3. §5 step 4: the `UI_STRINGS_INJECT` run → exactly **one** FAIL, message contains
   `UNLISTED visible string` and `Tap here to begin your activity`; a clean rerun → zero FAIL.
   This is the "failed before, passes after" artifact for the guard itself.
4. `cd app && ./node_modules/.bin/tsc --noEmit` → exit 0 (the new files are type-checked; the
   `typescript` default import must satisfy `esModuleInterop`).
5. Generator refusal: run `node --experimental-strip-types scripts/gen-ui-strings-allow.ts` a
   second time **without** `--force` → exit 2 and the refusal message; file byte-unchanged
   (`git diff --stat` or `md5sum` before/after).
6. `GIT_OPTIONAL_LOCKS=0 git status --porcelain` lists exactly: `?? app/tests/ui_strings_extract.ts`,
   `?? app/tests/ui_strings_suite.ts`, `?? app/tests/ui-strings.allow.json`,
   `?? app/scripts/gen-ui-strings-allow.ts`, `M app/tests/run.ts`, `M app/tests/README.md`,
   `M CLAUDE.md`, `M process/CONVENTIONS.md`, `M process/README.md`,
   `?? process/CLUTTER-AUDIT-HOWTO.md`, `?? cycles/virgin-cycle20/09-ALLOWLIST-REVIEW.md`
   (plus whatever was already untracked before you started — list it separately).
7. Inspect (fresh Opus): reruns 2-5; reads `ui_strings_extract.ts` against Decision 2's exclusion
   list (each excluded position has a unit test — check test 4 really exercises each one);
   checks that `checkRules` cannot be satisfied by `legacy: true` on a non-bootstrap entry (test 8);
   opens `09-ALLOWLIST-REVIEW.md` and spot-checks 5 random `literal` entries in the code to confirm
   they are rider-visible or harmless; confirms the three process edits are verbatim.

## Acceptance checklist

- [ ] 04, 05 and 08 landed before the generator ran (`git log` shows them; `09-ALLOWLIST-REVIEW.md`
      header names the HEAD sha).
- [ ] `tests/run.ts` → zero FAIL; `ui-strings` adds 13 tests; scan time printed, < 3 s on the PC.
- [ ] `UI_STRINGS_INJECT` run → exactly one FAIL naming the planted text; clean run → zero FAIL.
- [ ] `tsc --noEmit` exit 0.
- [ ] `ui-strings.allow.json`: `owner: "Nathan"`, sorted, every entry has `reason/since/by`,
      `legacyCount` equals the number of `legacy: true` entries, `banners[]` lists only boxes that
      exist in code.
- [ ] Generator refuses to overwrite without `--force`.
- [ ] No file under `app/src/` or `App.tsx` changed (`git status` has none).
- [ ] CLAUDE.md point 9, CONVENTIONS.md (Inspect row + section + verification block),
      process/README.md row, CLUTTER-AUDIT-HOWTO.md — all present, text as specified.
- [ ] `09-ALLOWLIST-REVIEW.md` lists LEGACY / LONG / LITERAL entries for Nathan.

## For the coordinator (not the executor) — exact lines to add

`OPEN-ITEMS.md`, under the current cycle's open items:
```
- **Clutter guardrail is live (virgin-cycle20 09).** `app/tests/ui-strings.allow.json` is Nathan's;
  review `cycles/virgin-cycle20/09-ALLOWLIST-REVIEW.md` (LEGACY = texts still over budget, LONG =
  >40 chars, LITERAL = heuristic catches) and shorten/accept. Before launch: re-run the human audit
  per `process/CLUTTER-AUDIT-HOWTO.md`.
```
`STATE.md`, in "what's settled about how the app behaves":
```
- Rider-facing text is budgeted: every visible string is mirrored in `app/tests/ui-strings.allow.json`
  (Nathan's file); the `ui-strings` suite fails on unlisted/stale strings, >40 chars without
  `long: true`, alert bodies >20 words, em dashes, banner boxes. Warnings use the yellow button's
  sub-label flash, never a banner. Rules: `process/CONVENTIONS.md` § Rider-facing text.
```

## Out of scope

- Any wording change in `src/` (Nathan's; see LEGACY list). `src/store/` strings (Open call A).
  i18n (none exists). The stale `CYCLE.md` row in `process/README.md`. Hiding dev-only screens
  (`src/ui/preview/`, `DemoScreen`) from the scan — they are scanned like everything else; if
  Nathan wants them exempt, that is a one-line `listScanFiles` filter later.

## Open calls (default chosen — executor does NOT stop for these)

- **A. Scan `src/store/`?** Chosen: no. Its strings reach the rider only through
  `Alert.alert(title, e.message)`, whose *title* is scanned. Adding `src/store/` would bury the
  list in storage keys. Revisit if a store message ever renders directly.
- **B. Key includes `kind`.** Chosen: yes — promotion of a string (alert → always-visible text) is
  exactly the kind of creep Nathan wants to see in the diff.
- **C. `floor` = 50.** Chosen: well under the expected post-08 count (~300) and well above zero;
  it only guards against scanning nothing.
- **D. Perf assertion 6 s (target 3 s).** Chosen: the mount is slow and a flaky FAIL would teach
  people to ignore the suite. The measured time is printed every run.
- **E. Prose test for tier B** = two letter-words or a trailing `…`. Chosen over "any letters":
  single tokens (`armed`, `RECORD`, `rides/index.json`) would flood the list with non-text; a
  one-word visible label still gets caught when it is JSX text or a visible attribute (tier A).

## Report back

- The three `run.ts` summary lines (no allowlist / after generation / with `UI_STRINGS_INJECT`),
  the one planted-string FAIL line verbatim, the `ui-strings: scanned …` timing line, `tsc` exit code.
- The generator's summary (also saved to `09-ALLOWLIST-REVIEW.md`): counts per kind, number of
  LEGACY / LONG / LITERAL entries, and the LEGACY list in full.
- The generator-refusal output from Verification 5.
- `git status --porcelain`.
- The sentence, verbatim: **"No string under app/src/ was edited; the allowlist is Nathan's from
  here on — agents append with a reason and report it."**
- Any anchor mismatch, verbatim, with what was found — and stop there.
