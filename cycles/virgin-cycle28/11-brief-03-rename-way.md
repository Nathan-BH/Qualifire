# Brief 03 · Rename a way (edit its specifier) on the ROUTE detail screen

virgin-cycle28 · written by the Opus PLAN tier 2026-10-09 · executor: Sonnet · inspector: fresh Opus.
Read `cycles/virgin-cycle28/EXECUTOR-RULES.md` first. Self-contained: you do not need the digests.
Runs AFTER brief 01-02 (it touches none of 01-02's files) and BEFORE brief 04.

## Goal

A rider can rename one of their own ways from the ROUTE detail screen (ROUTES tab → a route → its `WAY · <name>`
section), the same way places are renamed today. A way's name is `<From> → <To>` (the places' labels, renamed on
the place screen) plus the way's specifier `specs` (e.g. `['Dry', 'Fast']`, shown `Dry · Fast`). This brief edits
`specs` only.

Rules (decided at Plan; do not re-decide):
- only ways in the USER catalog are renamable (shipped ways never, exactly like shipped places);
- one text field, pre-filled with the current specs joined by ` · `; on save it is split on `·` into parts, each
  trimmed, empties dropped;
- each part at most 24 characters (the naming card's spec cap);
- no parts at all (back to the plain From → To) is allowed ONLY when the way is its route's only way;
- no other way on the same route may end up with the same parts (case-insensitive, position by position);
- only `specs` changes. Way id, refLineId, gate sets, results and ride files are keyed by way id and untouched.

## What this will NOT change on the phone

No change to places, routes, gates, results, ride files, the RECORD tab, or the naming card shown after a ride.
Shipped ways get no rename button. Ride history is not rewritten: names everywhere update because they are
recomputed from the catalog. JS-only (OTA-able).

## Files you may touch (nothing else)

`app/src/store/catalogMerge.ts`, `app/src/ui/catalogDetailModel.ts`, `app/src/ui/CatalogDetailScreen.tsx`,
`app/tests/catalogmerge_suite.ts`, `app/tests/catalogdetail_suite.ts`, `app/tests/ui-strings.allow.json` (one append).

## Pre-flight

1. `cd $HOME/mnt/Qualifire && GIT_OPTIONAL_LOCKS=0 git status --short` (brief 01-02's files may already be modified: expected; do not touch them).
2. Baseline: `cd app && node --experimental-strip-types tests/run.ts` (zero FAIL; record counts) and
   `cd app && ./node_modules/.bin/tsc --noEmit` (exit 0; `timeout_ms: 180000`; tee to `../cycles/virgin-cycle28/12-brief-03-tsc-before.log`).
3. Every anchor below must occur EXACTLY once (`grep -c -F`, or python `src.count(old) == 1`). Otherwise STOP.

## Step 1 · `app/src/store/catalogMerge.ts`

1a. Anchor `import { sameSpecs } from './routeCreation.ts';` → `import { cleanSpecs, sameSpecs } from './routeCreation.ts';`

1b. Anchor (exact line): `export interface FoldedRoute { droppedRouteId: string; intoRouteId: string; movedWayIds: string[] }`
Insert BEFORE it (keep the anchor line itself):
```ts
/** virgin-cycle28 03 (Nathan 2026-10-09): a way's specifier typed in ONE field, parts separated by '·'
 * ("Dry · Fast" -> ['Dry', 'Fast']); trimmed, empties dropped (cleanSpecs). */
export function parseSpecsText(text: string): string[] {
  return cleanSpecs(text.split('·'));
}

/** The naming card's per-part cap (routeNamingCard.tsx spec input maxLength={24}). */
export const MAX_SPEC_LEN = 24;

/** virgin-cycle28 03: rename a way = replace its specs (the only rider-typed part of a way's name; the
 * From → To part is the places' labels). USER catalog in/out like renameLandmark; the caller runs
 * saveUserCatalog (which re-validates the seed+user merge). Only `specs` changes: id, refLineId, gate
 * sets and every stored result are keyed by way id and untouched. A shipped way cannot be renamed; each
 * part <= MAX_SPEC_LEN; no other way on the same route may carry the same parts (sameSpecs,
 * case-insensitive); no parts at all (the plain From → To) only when it is the route's only way. */
export function renameWay(userCat: Catalog, seedCat: Catalog, wayId: string, text: string): RenameOutcome {
  const w = userCat.ways.find((x) => x.id === wayId);
  if (!w) return { ok: false, errors: ['a shipped way cannot be renamed'] };
  const specs = parseSpecsText(text);
  if (specs.some((s) => s.length > MAX_SPEC_LEN)) return { ok: false, errors: [`each part is at most ${MAX_SPEC_LEN} letters`] };
  const siblings = mergeCatalogs(seedCat, userCat).ways.filter((x) => x.routeId === w.routeId && x.id !== wayId);
  if (specs.length === 0 && siblings.length > 0) return { ok: false, errors: ['this route has other ways, so this one needs a name'] };
  if (specs.length > 0 && siblings.some((x) => sameSpecs(cleanSpecs(x.specs), specs))) {
    return { ok: false, errors: [`"${specs.join(' · ')}" is already a way on this route`] };
  }
  const next: Way = { ...w };
  if (specs.length > 0) next.specs = specs;
  else delete next.specs;
  return { ok: true, next: { ...userCat, ways: userCat.ways.map((x) => (x.id === wayId ? next : x)) } };
}

```
(`Way`, `Catalog`, `RenameOutcome` and `mergeCatalogs` are already imported/declared in this file; if not: STOP.)

## Step 2 · `app/src/ui/catalogDetailModel.ts`

2a. Interface. Anchor (exact two lines, inside `WayDetailModel`):
```
  seedOwned: boolean; deletable: boolean;
  lengthLabel: string | null;
```
Replace with:
```
  seedOwned: boolean; deletable: boolean;
  /** virgin-cycle28 03: a user way's specifier can be edited (shipped ways never, like shipped places) */
  renamable: boolean;
  /** the way's specs as one editable line, parts joined ' · '; '' for a plain way */
  specsText: string;
  lengthLabel: string | null;
```
2b. `wayDetailFor`. Anchor (exact two lines):
```
    deletable: !seedOwned,
    lengthLabel: lengthM !== null ? fmtLengthM(lengthM) : null,
```
Replace with:
```
    deletable: !seedOwned,
    renamable: !seedOwned,
    specsText: (r.specs ?? []).join(' · '),
    lengthLabel: lengthM !== null ? fmtLengthM(lengthM) : null,
```

## Step 3 · `app/src/ui/CatalogDetailScreen.tsx`

3a. Anchor `import { mergeLandmarks, renameLandmark } from '../store/catalogMerge.ts';` →
`import { mergeLandmarks, renameLandmark, renameWay } from '../store/catalogMerge.ts';`

3b. Model refresh fix (today `bump()` re-renders but the memo never recomputes, so a saved name would not show).
- Anchor `  const [, setTick] = useState(0);` → `  const [tick, setTick] = useState(0);`
- Anchor `    [request, setTick],` → `    [request, tick],`

3c. Wire the handler into the RouteBody mount. Anchor (exact line): `          onEditGates={(wayId) => tabNav.openGateAdjust({ wayId })}`
Replace with:
```
          onEditGates={(wayId) => tabNav.openGateAdjust({ wayId })}
          onRenameWay={async (wayId, text) => {
            const out = renameWay(userCatalog(), SEED, wayId, text);
            if (!out.ok) { Alert.alert('Could not rename', out.errors.join('\n')); return false; }
            const errs = await saveUserCatalog(out.next);
            if (errs.length > 0) { Alert.alert('Could not rename', errs.join('\n')); return false; }
            bump();
            return true;
          }}
```

3d. RouteBody destructuring. Anchor `  model, t, styles, onOpenPlace, onOpenRide, onEditGates, onDeleteWay, onDeleteRoute,` →
`  model, t, styles, onOpenPlace, onOpenRide, onEditGates, onDeleteWay, onDeleteRoute, onRenameWay,`

3e. RouteBody prop types. Anchor (exact three lines):
```
  onDeleteWay: (wayId: string) => void;
  onDeleteRoute: () => void;
}) {
```
Replace with:
```
  onDeleteWay: (wayId: string) => void;
  onDeleteRoute: () => void;
  onRenameWay: (wayId: string, text: string) => Promise<boolean>;
}) {
```

3f. Pass it to WaySection. Anchor (exact two lines):
```
          onDeleteWay={onDeleteWay}
        />
```
Replace with:
```
          onDeleteWay={onDeleteWay}
          onRenameWay={onRenameWay}
        />
```

3g. WaySection destructuring. Anchor `  r, t, styles, onOpenRide, onEditGates, onDeleteWay,` → `  r, t, styles, onOpenRide, onEditGates, onDeleteWay, onRenameWay,`

3h. WaySection prop types. Anchor (exact two lines; the WaySection copy is the one followed directly by `}) {`):
```
  onDeleteWay: (wayId: string) => void;
}) {
```
Replace with:
```
  onDeleteWay: (wayId: string) => void;
  onRenameWay: (wayId: string, text: string) => Promise<boolean>;
}) {
```
(If after 3e this two-line anchor matches more than once: STOP.)

3i. WaySection state. Anchor `  const gateEditable = r.deletable && gateEditDraftFor(r.id) !== null;` → replace with:
```
  const gateEditable = r.deletable && gateEditDraftFor(r.id) !== null;
  // virgin-cycle28 03 (Nathan 2026-10-09): rename this way's specifier inline, like the place rename
  // above (Alert.prompt is iOS-only). Pre-filled with the parts joined ' · '.
  const [renaming, setRenaming] = useState(false);
  const [renameText, setRenameText] = useState(r.specsText);
```

3j. The button and inline editor, between `edit gates` and `delete way`. Anchor (exact two lines):
```
      {r.deletable ? (
        <Pressable style={[styles.deleteBtn, { borderColor: t.cardBorder, marginTop: 8 }]} onPress={() => onDeleteWay(r.id)}>
```
Insert BEFORE them (keep them):
```
      {r.renamable && !renaming ? (
        <Pressable style={[styles.deleteBtn, { borderColor: t.cardBorder, marginTop: 8 }]} onPress={() => { setRenameText(r.specsText); setRenaming(true); }}>
          <Text style={[styles.deleteText, { color: t.textDim }]}>rename way</Text>
        </Pressable>
      ) : null}
      {renaming ? (
        <View style={st.renameRow}>
          <TextInput
            style={[st.renameInput, { color: t.text, borderColor: t.cardBorder, backgroundColor: t.bg }]}
            value={renameText}
            onChangeText={setRenameText}
            maxLength={40}
            autoFocus
          />
          <Pressable
            style={[styles.deleteBtn, { borderColor: t.cardBorder }]}
            onPress={() => { void onRenameWay(r.id, renameText).then((ok) => { if (ok) setRenaming(false); }); }}
          >
            <Text style={[styles.deleteText, { color: t.text }]}>SAVE</Text>
          </Pressable>
          <Pressable style={[styles.deleteBtn, { borderColor: t.cardBorder }]} onPress={() => setRenaming(false)}>
            <Text style={[styles.deleteText, { color: t.textDim }]}>cancel</Text>
          </Pressable>
        </View>
      ) : null}
```
No placeholder, no hint line, no sub-label.

## Step 4 · allow-list (one append)

One python read-modify-write (json.load → append → sort by (file, kind, text) → json.dump indent=2,
ensure_ascii=False, + '\n'):
```json
{"file": "src/ui/CatalogDetailScreen.tsx", "kind": "text", "text": "rename way",
 "reason": "virgin-cycle28 03 (Nathan 2026-10-09): ways can be renamed like places; lowercase like edit gates / delete way",
 "since": "2026-10-09", "by": "Sonnet execute, virgin-cycle28 brief 03"}
```
`SAVE`, `cancel` (kind text) and `Could not rename` (alert-title) are already listed for this file: no entry.

## Step 5 · tests

5a. `app/tests/catalogmerge_suite.ts`: add `parseSpecsText, renameWay, MAX_SPEC_LEN` to the existing
`import { mergeLandmarks, renameLandmark } from '../src/store/catalogMerge.ts';` and add (uses the suite's existing
`lm` / `rt` / `wy` helpers and its `emptyCatalog`, `mergeCatalogs`, `validateCatalog` imports):
```ts
function renameFixture(): Catalog {
  return {
    ...emptyCatalog(),
    landmarks: [lm('home', 50.0, 4.0), lm('stat', 50.02, 4.0), lm('park', 50.04, 4.0)],
    routes: [rt('r1', 'home', 'stat', ['w1', 'w2']), rt('r2', 'home', 'park', ['w3'])],
    ways: [wy('w1', 'r1', 1), wy('w2', 'r1', 2, ['Dry']), wy('w3', 'r2', 3, ['Original'])],
    gateSets: [
      { wayId: 'w1', version: 1, chainageM: [10, 990], createdAtMs: 0 },
      { wayId: 'w2', version: 1, chainageM: [10, 990], createdAtMs: 0 },
      { wayId: 'w3', version: 1, chainageM: [10, 990], createdAtMs: 0 },
    ],
  };
}

test('virgin-cycle28 03: renameWay replaces only specs; split on ·; merged catalog validates', () => {
  const user = renameFixture();
  assert(JSON.stringify(parseSpecsText(' Wet ·  · Fast ')) === JSON.stringify(['Wet', 'Fast']), 'split, trim, drop empties');
  const out = renameWay(user, emptyCatalog(), 'w1', ' Original ');
  assert(out.ok, `rename refused: ${out.ok ? '' : out.errors.join('; ')}`);
  if (!out.ok) return;
  const w1 = out.next.ways.find((w) => w.id === 'w1')!;
  const was = user.ways.find((w) => w.id === 'w1')!;
  assert(JSON.stringify(w1.specs) === JSON.stringify(['Original']), `specs ${JSON.stringify(w1.specs)}`);
  assert(w1.refLineId === was.refLineId && w1.gateSetVersion === was.gateSetVersion && w1.referenceRideId === was.referenceRideId && w1.routeId === was.routeId, 'only specs changed');
  assert(out.next.ways.find((w) => w.id === 'w2') === user.ways.find((w) => w.id === 'w2'), 'other ways untouched');
  assert(out.next.gateSets === user.gateSets && out.next.routes === user.routes && out.next.landmarks === user.landmarks, 'gates, routes, places untouched');
  const errs = validateCatalog(mergeCatalogs(emptyCatalog(), out.next));
  assert(errs.length === 0, `merged must validate: ${errs.join('; ')}`);
  const multi = renameWay(user, emptyCatalog(), 'w1', 'Wet · Fast');
  assert(multi.ok && JSON.stringify(multi.next.ways.find((w) => w.id === 'w1')!.specs) === JSON.stringify(['Wet', 'Fast']), 'multi-part name');
  const own = renameWay(user, emptyCatalog(), 'w2', 'dry');
  assert(own.ok, 'a way may keep its own name (any casing)');
});

test('virgin-cycle28 03: renameWay refusals: duplicate, empty with siblings, too long, shipped way; empty allowed for a sole way', () => {
  const user = renameFixture();
  const dup = renameWay(user, emptyCatalog(), 'w1', 'DRY');
  assert(!dup.ok, 'same parts as another way on the route (case-insensitive) is refused');
  const empty = renameWay(user, emptyCatalog(), 'w2', '  ·  ');
  assert(!empty.ok, 'no name while the route has other ways is refused');
  const long = renameWay(user, emptyCatalog(), 'w1', 'x'.repeat(MAX_SPEC_LEN + 1));
  assert(!long.ok && MAX_SPEC_LEN === 24, 'a part over 24 is refused');
  assert(renameWay(user, emptyCatalog(), 'w1', 'x'.repeat(MAX_SPEC_LEN)).ok, 'exactly 24 is fine');
  const sole = renameWay(user, emptyCatalog(), 'w3', '');
  assert(sole.ok && !('specs' in sole.next.ways.find((w) => w.id === 'w3')!), 'the sole way may go back to plain: specs field removed');
  const seed: Catalog = { ...emptyCatalog(), ways: [wy('ws', 'r1', 9)] };
  assert(!renameWay(user, seed, 'ws', 'Wet').ok, 'a shipped way cannot be renamed');
});
```
If the suite's helpers have a different signature than `lm(id, lat, lon, radiusM?)`, `rt(id, s, e, wayIds, extra?)`,
`wy(id, routeId, n, specs?)`, or `GateSet`/`Catalog` are not imported there: STOP.

5b. `app/tests/catalogdetail_suite.ts`: add at the top `import * as fs from 'node:fs';`, `import * as path from 'node:path';`
and extend `import { assert, test } from './lib.ts';` to `import { assert, test, TESTS_DIR } from './lib.ts';`, then add:
```ts
test('virgin-cycle28 03: a user way is renamable and carries its specs as one line; a shipped way is not', () => {
  const r = routeDetailFor('way:AB', DEPS)!;
  const std = r.ways.find((w) => w.id === STD_ID)!;
  assert(std.renamable === true && std.specsText === '', `std ${std.renamable}/${std.specsText}`);
  const withSpecs: Catalog = { ...CATALOG, ways: [{ ...wayStd, specs: ['Dry', 'Fast'] }, wayAlt, wayLoop] };
  const r2 = routeDetailFor('way:AB', { ...DEPS, catalog: withSpecs })!;
  assert(r2.ways.find((w) => w.id === STD_ID)!.specsText === 'Dry · Fast', 'parts joined with a middle dot');
  const r3 = routeDetailFor('way:AB', { ...DEPS, seed: { ...SEED, ways: [wayAlt] } })!;
  assert(r3.ways.find((w) => w.id === ALT_ID)!.renamable === false, 'a shipped way is not renamable');
});

test('virgin-cycle28 03: CatalogDetailScreen wires rename way and recomputes the model on bump', () => {
  const src = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'CatalogDetailScreen.tsx'), 'utf8');
  assert(src.includes('const out = renameWay(userCatalog(), SEED, wayId, text);'), 'pure rename on the user catalog');
  assert(src.includes('const [tick, setTick] = useState(0);') && src.includes('[request, tick],'), 'model memo keys on the tick');
  assert(src.includes('{r.renamable && !renaming ? ('), 'button only for a renamable way');
  assert(src.includes('>rename way</Text>'), 'button label');
});
```

## Visible text

| file | kind | exact text | why it earns its place |
|------|------|-----------|------------------------|
| CatalogDetailScreen.tsx | text | `rename way` | NEW, the missing action; lowercase like `edit gates` / `delete way` |
| CatalogDetailScreen.tsx | text | `SAVE`, `cancel` | reused, already listed |
| CatalogDetailScreen.tsx | alert-title | `Could not rename` | reused, already listed |
| store/catalogMerge.ts | alert body (dynamic, `src/store` is not scanned) | `a shipped way cannot be renamed` · `each part is at most 24 letters` · `this route has other ways, so this one needs a name` · `"<name>" is already a way on this route` | <= 11 words each, no em dash |

Allow-list diff must be exactly the one appended `rename way` entry. Any other UNLISTED/STALE: STOP.

## Acceptance

1. `cd app && node --experimental-strip-types tests/run.ts`: zero FAIL; PASS = baseline + 4.
2. `cd app && ./node_modules/.bin/tsc --noEmit`: exit 0 (tee to `../cycles/virgin-cycle28/12-brief-03-tsc.log`).
3. `GIT_OPTIONAL_LOCKS=0 git diff -- app/tests/ui-strings.allow.json`: exactly one added entry, quoted in the report.
4. `GIT_OPTIONAL_LOCKS=0 git diff --stat`: this brief's six files (plus brief 01-02's, untouched by you).
5. `renameLandmark` and `mergeLandmarks` byte-identical (`git diff app/src/store/catalogMerge.ts` shows only the import line and the inserted block).
6. No hunk under `app/modules/`, `app.json`, `app.config.js`, `package.json`, `eas.json`.

## STOP-ON-AMBIGUITY

Any anchor mismatch, undecided call, or unexpected failing check: STOP and report verbatim. Never guess.
Escalations go to a fresh Opus via the coordinator.

## Report

`cycles/virgin-cycle28/12-brief-03-executor-report.md` per EXECUTOR-RULES.md. Inspector focus: the memo-deps fix
(delete way / delete route must still close or refresh the screen: the `model === null` effect), and that a way on
a SEED route but in the user catalog is renamable.
