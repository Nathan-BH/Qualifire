# virgin-cycle23 — Fable rulings (Plan tier)

Numbered, dated. Each ruling is binding for the executor and the inspector; the briefs were patched in place to match (see "Brief edits" at the end). Nathan was asleep: decided, not asked.

## 2026-10-06 — brief 01 escalation (Sonnet execute STOPPED)

### R1. trailCache.ts: no TypeScript parameter properties (strip-only mode)

The repo runs the suite with `node --experimental-strip-types`, which only ERASES types: non-erasable syntax (constructor parameter properties, `enum`, `namespace`, `import x = require()`, decorators) throws `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` at import and kills the whole suite. The only class in `app/src` today (`src/live/engine.ts` `LiveEngine`) declares its fields explicitly. The brief's `constructor(readonly capacity: number) {}` was my error.

Ruling: the executor's trial fix is the fix. In `app/src/ui/trailCache.ts` replace the one line
`  constructor(readonly capacity: number) {}`
with the two lines
`  readonly capacity: number;`
`  constructor(capacity: number) { this.capacity = capacity; }`
(`private map = new Map<string, V>();` stays: an accessibility modifier on a member is erasable.) Brief 01 §1f is patched to this form. I grepped all three briefs for parameter properties, enums, namespaces, `require`, decorators: this was the only occurrence.

### R2. tsc: `SectorRowModel.gapS` is required, `tests/replay_suite.ts` builds rows without it

The executor never got a tsc result (empty log). I ran it on the current tree: EXIT 2 with 11 errors, all `Property 'gapS' is missing in type ... but required in type 'SectorRowModel'`, all from ONE fixture: `tests/replay_suite.ts:272-277` (`const sectorRows = [ { index: 0, label: 'S1', ... avgLabel: '3:10' }, ... ]`, four rows, passed to `replayLiveViewModel` eleven times). No error anywhere else (`cycles/virgin-cycle23/tsc-brief01-fable.log`).

Ruling: keep `gapS` required (brief 03 reads `sec.gapS` unguarded; an optional field would push `?? null` into every consumer). Add `gapS: null` to each of the four fixture rows in `app/tests/replay_suite.ts:273-276` (`..., avgLabel: '3:10', gapS: null },` etc.). Nothing else in that file changes; the runtime assertions do not read gapS. Brief 01 §1d gains this as step 4 and `M app/tests/replay_suite.ts` joins the expected `git status`.

### R3. Allow-list: 10 moves + 1 append, and entries must stay SORTED

Facts from the scanner (`tests/ui_strings_extract.ts`), verified by running `scanFiles` on the current tree:
- Strings are keyed `file|kind|text` and de-duplicated per file: an entry only goes STALE when NO occurrence of that key is left in that file.
- `prop:text` `Cancel` still occurs in `RideDetailScreen.tsx` (`:412` `{ text: 'Cancel', style: 'cancel' }` in the Overwrite-reference alert), so its entry is NOT stale and must stay. `rideActions.ts` has its own `Cancel` → a NEW entry.
- `prop:text` `Delete` IS stale in RideDetailScreen.tsx (no `text: 'Delete'` property remains there; the JSX `<Text>Delete</Text>` at `:576` is kind `text`, a different key). The suite printed it as "… and 1 more" after the first 20 violations: the executor read 9 STALE, the real count is 10. So: 11 UNLISTED (rideActions.ts), 10 STALE (RideDetailScreen.tsx).
- `tests/ui_strings_suite.ts:212` "header and entry hygiene" asserts `entries` are sorted by (file, kind, text) in JS code-unit order (uppercase before lowercase: `src/ui/RideDetailScreen.tsx` < `src/ui/rideActions.ts`; `alert-body` < `alert-title` < `literal` < `prop:label` < `prop:text` < `prop:title` < `text`). Editing a `file` field "in place" or appending at the end of the array breaks this test. Neither EXECUTOR-RULES nor any brief said so; fixed now.

Ruling (exact expected result):
1. Edit `file` → `src/ui/rideActions.ts` on these 10 entries (reason/since/by untouched): alert-title `Delete activity?`, `Could not delete`, `Could not update`, `Exported`, `Shared`, `Export failed`; alert-body `{…} · {…} This permanently removes the raw trace.`, `{…}.gpx saved to the folder you picked.`, `GPX sent as text via the share sheet.`; prop:text `Delete`.
2. Add ONE entry: `{"file": "src/ui/rideActions.ts", "kind": "prop:text", "text": "Cancel", "reason": "virgin-cycle23 brief 01: Delete confirm moved to rideActions.ts; RideDetailScreen.tsx keeps its own Cancel (Overwrite alert)", "since": "2026-10-06", "by": "Sonnet execute, virgin-cycle23 brief 01"}`.
3. Keep: `src/ui/RideDetailScreen.tsx | prop:text | Cancel` and `| text | Delete`.
4. Re-sort `entries` by (file, kind, text). Do the whole edit with ONE python read-modify-write (json.load → mutate → `entries.sort(key=lambda e: (e['file'], e['kind'], e['text']))` → `json.dump(indent=2, ensure_ascii=False)` + trailing newline). This round-trips the file byte-for-byte (verified: dump == current file), so the diff is exactly the entry moves. Python's tuple sort equals the test's code-unit order for these strings (the current file sorts identically under both).
5. Result: 463 entries (was 462); `git diff` on the file shows 10 entries leaving the RideDetailScreen.tsx block and an 11-entry `src/ui/rideActions.ts` block appearing between the last `src/ui/resultsWayList.tsx` entry and the first `src/ui/rideDetailModel.ts` entry, in this order: alert-body `GPX sent…`, `{…} · {…} This permanently…`, `{…}.gpx saved…`; alert-title `Could not delete`, `Could not update`, `Delete activity?`, `Export failed`, `Exported`, `Shared`; prop:text `Cancel`, `Delete`. `legacyCount` 32 unchanged; no legacy entry touched.

Same rule for briefs 02 and 03 (patched): "append" means INSERT at the sorted position; a `kind` edit MOVES the entry to its new sorted slot (brief 03's four prop:label entries land after RideDetailScreen's last `literal` entry and before `prop:text Cancel`, ordered `Count in ranking`, `Delete`, `Export GPX+`, `Ignore in ranking`; brief 02's three land after `literal rides/{…}.events.jsonl` and before `text Activities`). Brief 03's assumption "prop:text Overwrite, Cancel remain in RideDetailScreen.tsx after brief 01" was already correct.

### R4. How to proceed from the CURRENT tree (brief 01, in this order)

The tree already holds, applied correctly (spot-checked against the brief by diff): wayMapView.tsx steps 1-7 (type, prop, 3 consts, rotateEnabled && oneFingerOn, 4 gesture props, mapFill wrapper + style, zoom bar gated), rideActions.ts (same calls, same order, same strings as the removed handlers), RideDetailScreen.tsx (imports trimmed, three handlers call the module, fmtWhen/fmtDur removed), rideHistoryModel.ts gapS (4 hits), feedModel.ts, trailCache.ts (brief text, crashes), both suites, run.ts registration. No deviation found.
1. R1: the two-line trailCache.ts fix.
2. R2: `gapS: null` on the four replay_suite.ts fixture rows.
3. R3: the allow-list python edit.
4. `cd app && node --experimental-strip-types tests/run.ts` → expect `887 tests: 884 pass, 0 fail, 3 skip` (the 3 skips are pre-existing). Baseline is 870 inferred (887 − 17); a measured baseline is not required (do not stash or revert to get one).
5. `cd app && ./node_modules/.bin/tsc --noEmit` → exit 0 (tee to `cycles/virgin-cycle23/tsc-brief01.log`; the earlier empty log means the call timed out: use `timeout_ms: 180000`, it takes ~60-90 s on this mount).
6. Acceptance checks 4-6 of brief 01 §5 unchanged; check 3 and 7 as rewritten; then the report per §8 (quote the 10 file edits, the 1 appended entry, the replay_suite.ts fixture edit).

## Brief edits made by this ruling (2026-10-06)

- `brief-01-map-gestures-actions-feedmodel.md`: §0 allow-list paragraph (Cancel stays; sort rule); §1d step 4 (replay_suite fixture); §1f LruCache constructor (R1) + a "strip-only" note; §3 table (Cancel = NEW/append, Delete = MOVED, sort rule); §5 acceptance 2 (counts), 3 (10 moves + 1 append, sorted, 463 entries), 7 (+ `M app/tests/replay_suite.ts`); §8.
- `brief-02-activities-feed.md`: §3 + §5 check 3: "append" = insert sorted; exact slot.
- `brief-03-detail-page-redesign.md`: §3 + §5 check 2: kind edits move the entries to their sorted slot; exact slot.
- `EXECUTOR-RULES.md`: allow-list bullet: dedupe-per-file rule, sorted-entries rule, python read-modify-write + sort; strip-only syntax rule.
- `EXECUTION-ORDER.md`: brief 01 row + Inspect bullet (10 file edits + 1 append, replay_suite.ts allowed, tsc log).
