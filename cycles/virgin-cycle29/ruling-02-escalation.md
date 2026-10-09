# Ruling on the brief 02 escalation (virgin-cycle29) — Plan tier (Fable), 2026-10-10

Read: EXECUTOR-RULES.md, 04-brief-02-snapshot-probe.md, exec-report-02.md, 03-fable-ruling.md Q2, CLAUDE.md rule 9,
process/CONVENTIONS.md § Rider-facing text, app/tests/ui_strings_extract.ts, ui-strings.allow.json, and the code as it
now stands (wayMapLayers.ts, cardSnapshotQueue.ts, fsAdapter.ts, expoFsAdapter.ts, the view diff, replay_suite.ts:408,
selfrace_suite.ts:129, cardsnapshot_suite.ts). Every instruction below is exact; the executor applies them and does
not re-decide anything.

## STOP 1 — the 9 UNLISTED [literal] entries. RULING: option (a), append 9 allow-list entries. Rule amended for brief 02 only.

Why not (b)/(c): hiding the ids behind object keys or `'a' + '-' + 'b'` concatenation would contort the code to dodge
the scanner, and it would be AGAINST the existing convention, not in line with it. The repo convention is that
technical identifiers which the scanner cannot tell from prose get an allow-list entry with a "never shown as text"
reason: the very same seven layer ids already have `literal` entries for `src/ui/wayMapView.tsx` (they come from the
`<M.Layer id="route-casing">` JSX attributes — `id` is NOT in NON_VISIBLE_ATTRS, so the executor's note that the view's
attributes are "not flagged" is wrong; they are flagged and listed), `catalogMapView.tsx` got `rider-dot` the same way
in virgin-cycle27 brief 08 ("MapLibre layer id ... never shown as text"), and file paths such as `rides/{…}.jsonl`
are listed for RidesScreen.tsx/replayModel.ts/selfRaceModel.ts. CLAUDE.md rule 9 explicitly allows an agent to
append entries with a one-line reason, said in the report; Nathan reviews that diff. The cycle29 "allow-list
byte-identical" rule was written by me on the false premise that brief 02's literals were single words; its purpose
(no NEW rider-facing string) is untouched by these entries. The rule stays in force for briefs 03, 04 and 05.

Instruction (one python read-modify-write, as EXECUTOR-RULES prescribes; verified today that `json.load` ->
`json.dumps(indent=2, ensure_ascii=False) + '\n'` round-trips the file byte-for-byte, md5 0959f79d5f9eacea385e53375ddcaaca,
and that `entries` is already sorted):

```python
import json
p = 'tests/ui-strings.allow.json'   # run from app/
d = json.load(open(p, encoding='utf-8'))
LAYER_REASON = 'virgin-cycle29 02: MapLibre layer/source id of the card layer stack (same id as wayMapView.tsx), never shown as text'
new = [('src/ui/wayMapLayers.ts', t, LAYER_REASON) for t in
       ['gate-ticks', 'gate-ticks-casing', 'route-casing', 'route-core', 'sector-spans', 'sector-spans-core', 'trail-casing', 'trail-core']]
new.append(('src/ui/cardSnapshotQueue.ts', 'mapsnaps/index.json',
            'virgin-cycle29 02: relative path of the snapshot cache index under the storage root, never shown as text'))
for f, t, r in new:
    d['entries'].append({'file': f, 'kind': 'literal', 'text': t, 'reason': r, 'since': '2026-10-10', 'by': 'Sonnet execute, virgin-cycle29 brief 02'})
d['entries'].sort(key=lambda e: (e['file'], e['kind'], e['text']))
open(p, 'w', encoding='utf-8', newline='\n').write(json.dumps(d, indent=2, ensure_ascii=False) + '\n')
```
Exactly 9 entries, all `kind: "literal"`, no `long`, no other field. Do not touch any existing entry. After it:
`git diff --stat -- app/tests/ui-strings.allow.json` must show +9 lines*7 = 63 insertions and 0 deletions apart from
the two bracket/comma lines json re-emits; quote all 9 entries in the exec report (CONVENTIONS § Rider-facing text).
Acceptance 4 of the brief is amended to: "allow-list differs from HEAD by exactly these 9 appended entries".
Do NOT restructure `cardLayerSpecs()` or `INDEX_PATH`; the code stays as written.

## STOP 2 — tsc: `throwingFs` literals in two test files lack the new members. RULING: add the two stubs to both literals; the members stay REQUIRED.

Optional members would force every production caller to handle `undefined` for an adapter that always has them, and
would weaken the seam the rest of storage relies on. The two test files are the ONLY `FsAdapter` literals outside the
memory adapter (tsc reports no other error), and they are test code, not app code. Acceptance 1 is amended to include
`tests/replay_suite.ts` and `tests/selfrace_suite.ts`.

In BOTH `app/tests/replay_suite.ts` (the literal at ~408) and `app/tests/selfrace_suite.ts` (~129), inside the
`const throwingFs: FsAdapter = { ... }` object, after the line
`    deleteFile: async () => {},`
insert these two lines (same 4-space indent, same style as the neighbours):
```ts
    importFile: async () => {},
    fileUri: (relPath) => 'memory://' + relPath,
```
Nothing else in those files changes. Both tests keep their meaning (neither code path reaches the new members).
Re-run tsc to `exec-02-tsc.log` (timeout_ms 180000); it must exit 0 with an empty error list.

## Deviations — confirmed or overruled

(i) `from 'expo-file-system'` count. CONFIRMED: the pin stays narrowed to `src/storage/` (exactly one hit,
`expoFsAdapter.ts`), matching brief §4 "the ONLY expo-file-system importer in `storage/`". `src/ui/themeContext.tsx`
is pre-existing and out of scope. ADD one line to the same test so the probe modules themselves are pinned:
```ts
  for (const f of ['wayMapLayers.ts', 'cardSnapshotModel.ts', 'cardSnapshotQueue.ts']) assert(!src('src', 'ui', f).includes('expo-file-system'), `${f} must not import expo-file-system`);
```
Test count unchanged (same test).

(ii) `as never` on the five expression-bearing paints. CONFIRMED. The view already uses `as never` as "the narrowest
legal escape hatch" across the decoupled-types boundary (`wayMapView.tsx` ~780, `mapStyle={mapStyle as never}`); the
same boundary applies here (pure module, no MapLibre types). The diff shows the five objects are key-for-key and
value-for-value the old inline literals, so runtime is unchanged. Add one comment line in `wayMapLayers.ts` directly
above `export const ROUTE_CASING_PAINT`:
```ts
// `as never` on the expression-bearing paints: same escape hatch as `mapStyle as never` in wayMapView.tsx (pure module, no MapLibre types). Shapes are pinned by cardsnapshot_suite / the inspector's byte diff.
```
`as const` stays on ROUND_LINE, ROUND_CAP, FAINT_OPACITY_EXPR, TRAIL_CASING_PAINT, TRAIL_CORE_PAINT (they type-check).

(iii) `export const rideTrails` in `activityCard.tsx`. CONFIRMED (brief §6 needs `rideTrails.peek` from RidesScreen;
the export adds no behaviour). Inspector item (e) extends to it.

(iv) `gateSetVersion: null` in the probe request. CONFIRMED for the probe: card 0's key then carries `|0|`, which is
fine for an A/B picture that is never persisted across gate edits. Carry to brief 04 as a hard requirement: the feed
card model must expose the result's `derivedBy.gateSetVersion` (store/types.ts) and brief 04's queue passes it; the
coordinator notes this in OPEN-ITEMS as "brief 04 input: gateSetVersion into FeedCardModel".

(v) Test count +8 (990) instead of +7. CONFIRMED (EXECUTOR-RULES: a different zero-FAIL count is reported, not a stop;
the extra case is the brief's own §4 storage_suite memory-adapter case, which the "+7" forgot). The baseline before
02 was 982, not the brief's 972, for the same reason on brief 01's side. Expected after 02: 990 tests, 0 FAIL, 3 skip.

## Finish sequence for the executor
1. Allow-list script (STOP 1). 2. Two stubs (STOP 2). 3. The one-line pin (i) and the comment (ii).
4. `cd app && node --experimental-strip-types tests/run.ts` -> 990 / 0 FAIL (the ui-strings test now passes).
5. `./node_modules/.bin/tsc --noEmit | tee ../cycles/virgin-cycle29/exec-02-tsc.log` -> exit 0.
6. `git status --short`, `git diff --stat`: touched set = brief §8.1 plus `tests/ui-strings.allow.json`,
   `tests/replay_suite.ts`, `tests/selfrace_suite.ts`. Nothing else.
7. Rewrite `exec-report-02.md` as DONE: quote the 9 entries verbatim, list the two stub insertions, keep the
   deviations section (now "ruled by ruling-02-escalation.md"), the inspector items (a)-(e) + rideTrails, and the §9
   OPEN-ITEMS probe line verbatim. Say the snapshotter cannot run here.

## For the Opus inspector (additions)
- `git diff -- app/tests/ui-strings.allow.json` is exactly the 9 entries above; no existing entry moved or changed.
- The 5 `as never` paints vs the removed inline objects in the view diff: identical keys and values.
- `throwingFs` stubs are unreachable in both tests (the tests assert readText is never called).
