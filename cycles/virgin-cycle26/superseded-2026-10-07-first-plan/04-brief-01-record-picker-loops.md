# Brief 01 — RECORD picker: Home → Home is a legal pick

Written by the Plan tier (Fable) 2026-10-07 ~22:10 UTC from `03-plan.md` (D1-D3) and digest 02; every anchor below was read in the working tree at that time (suite baseline `923 tests: 920 pass, 0 fail, 3 skip`). Executor: Sonnet, alone. Read `EXECUTOR-RULES.md` first, then all of this.

## 0. Rules

- **STOP-ON-AMBIGUITY.** If a quoted anchor is not at its line or within ±15 lines with no other plausible match, or a call you need is not settled here: STOP, write what you found verbatim into `cycles/virgin-cycle26/04-brief-01-executor-report.md` under `## STOPPED`, return.
- **No warnings, no blocks** (Nathan, ruling 1): you add no banner, alert, sub-label, disabled state or copy about loops. If you find yourself wanting one, STOP.
- **Rider-facing text:** this brief adds ZERO strings. `tests/ui-strings.allow.json` must have NO diff when you finish (`GIT_OPTIONAL_LOCKS=0 git diff -- app/tests/ui-strings.allow.json` empty). If the `ui_strings` suite reports anything after your edits, STOP and report it verbatim.
- Never delete; no commit; no publish; no new dependency; no edits outside §3's file list; `GIT_OPTIONAL_LOCKS=0`.

## 1. Purpose

Today the GOING TO row hides the START place (`RecordScreen.tsx:1598`), so a rider cannot pick Home → Home. Everything downstream already handles `from === to`: the route lookup (`:1155-1157`) matches a loop Route, `to === l.id` highlights the pill (`:1600`), the armed title renders `Home → Home` (`:1263`), `onRecord`/`onStart` check nothing about endpoints (digest 02 §1), and with no loop Route the pick is a free ride that STOP already turns into a loop Route via the existing naming card (`routeCreation.ts:273, 280`). After this brief:

- GOING TO lists every startable place, the START place included (one more pill; no other visual change).
- The route lookup goes through a pure, tested `routeForEndpoints` in `recordFlow.ts` whose loop behaviour is asserted (first Route with that start AND end, loops included — the same first-match rule `existingRouteFor` uses at STOP, `routeCreation.ts:164-168`).

## 2. Verified anchors (working tree 2026-10-07 ~21:50 UTC)

- `app/src/ui/RecordScreen.tsx:39` — `import { effectiveFromId, endingSlotFor, interruptedRideAction, isFullscreen, liveMapOverlayFor, namingOfferMode, recordPressAction, wayHintForPick, type RecordPhase } from './recordFlow';`
- `app/src/ui/RecordScreen.tsx:1152-1157`:
  ```
    // The way the rider picked, and the routes on it -- so the ghost count is
    // THIS way's, not always Morning's.
    const route = CATALOG.routes.find(
      (w) => w.startLandmarkId === fromId && w.endLandmarkId === to,
    );
  ```
- `app/src/ui/RecordScreen.tsx:1596-1603`:
  ```
                <Text style={styles.flowLabel}>GOING TO</Text>
                <View style={styles.pillRow}>
                  {startable.filter((l) => l.id !== fromId).map((l) => (
                    <Pressable key={l.id} onPress={() => setTo(l.id)}
                      style={[styles.pill, to === l.id && styles.pillOn]}>
  ```
- `app/src/ui/recordFlow.ts` — pure module, NO imports at all (`grep -n "^import" src/ui/recordFlow.ts` is empty); `effectiveFromId` at `:63-71`; the file ends with `endingSlotFor` (`export type EndingSlot = …` … `return 'none';\n}`).
- `app/tests/recordflow_suite.ts:6-13` imports: `import * as fs from 'node:fs'; import * as path from 'node:path'; import { assert, test, TESTS_DIR } from './lib.ts'; import { canTransition, effectiveFromId, endingSlotFor, isFullscreen, liveMapOverlayFor, namingOfferMode, recordPressAction, type RecordPhase, wayHintForPick, interruptedRideAction, INTERRUPTED_MIN_FIXES, } from '../src/ui/recordFlow.ts';` — the source-pin pattern is `fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'RecordScreen.tsx'), 'utf8')` (`:128`). `effectiveFromId` tests start at `:56`.
- `app/tests/run.ts:40` — `import './recordflow_suite.ts';` already present; **do not edit `run.ts`.**

## 3. Files (the complete list; nothing else may change)

1. `app/src/ui/recordFlow.ts` — add one exported function.
2. `app/src/ui/RecordScreen.tsx` — two edits (import line, route lookup) + one one-line edit (GOING TO filter).
3. `app/tests/recordflow_suite.ts` — two new tests.

## 4. Edits

### 4.1 `recordFlow.ts` — append at the end of the file (after `endingSlotFor`'s closing `}`)

Keep the module import-free: the function is generic over the two id fields, not over `Route`.

```ts

/** virgin-cycle26 brief 01 (Nathan, 2026-10-07: Home-to-Home must be a legal
 * pick, never a warning). The Route the START / GOING TO pair resolves to: the
 * FIRST route with exactly this start and this end. `fromId === to` is a loop
 * and resolves like any other pair — the same first-match rule the STOP flow's
 * existingRouteFor (store/routeCreation.ts) uses, so RECORD finds the Route
 * STOP would have attached the ride to. A '~new' endpoint never matches (no
 * route has that id) and yields undefined = free ride. */
export function routeForEndpoints<R extends { startLandmarkId: string; endLandmarkId: string }>(
  routes: readonly R[], fromId: string, to: string,
): R | undefined {
  return routes.find((r) => r.startLandmarkId === fromId && r.endLandmarkId === to);
}
```

### 4.2 `RecordScreen.tsx`

(a) Line 39: add `routeForEndpoints` to the import, alphabetically after `recordPressAction`:

```
import { effectiveFromId, endingSlotFor, interruptedRideAction, isFullscreen, liveMapOverlayFor, namingOfferMode, recordPressAction, routeForEndpoints, wayHintForPick, type RecordPhase } from './recordFlow';
```

(b) Lines 1152-1157 become (comment updated, lookup delegated):

```
  // The route the rider picked, and the ways on it -- so the ghost count is
  // THIS way's, not always Morning's. virgin-cycle26 brief 01: fromId === to
  // is a loop (Home -> Home) and resolves like any other pair.
  const route = routeForEndpoints(CATALOG.routes, fromId, to);
```

(c) Line 1598: `{startable.filter((l) => l.id !== fromId).map((l) => (` becomes `{startable.map((l) => (`. Nothing else on the surrounding lines changes.

Do NOT touch `pickFrom` (`:284`), `setTo`, the START row, the `new` pills, `onRecord`, `onStart`, the armed title, or any string.

### 4.3 `tests/recordflow_suite.ts`

Add `routeForEndpoints` to the import list from `'../src/ui/recordFlow.ts'`. Then add these two tests directly after the last `effectiveFromId` test (the one starting at `:78`; find its closing `});` and insert after it):

```ts
test('virgin-cycle26 01: routeForEndpoints resolves a loop (from === to) like any other pair, first match wins', () => {
  const routes = [
    { id: 'r:home-work', startLandmarkId: 'home', endLandmarkId: 'work' },
    { id: 'r:loop-a', startLandmarkId: 'home', endLandmarkId: 'home', loopDiscriminator: 'loop:a' },
    { id: 'r:loop-b', startLandmarkId: 'home', endLandmarkId: 'home', loopDiscriminator: 'loop:b' },
    { id: 'r:work-home', startLandmarkId: 'work', endLandmarkId: 'home' },
  ];
  assert(routeForEndpoints(routes, 'home', 'work')?.id === 'r:home-work', 'A -> B must resolve to the A -> B route');
  assert(routeForEndpoints(routes, 'work', 'home')?.id === 'r:work-home', 'B -> A is a different route');
  assert(routeForEndpoints(routes, 'home', 'home')?.id === 'r:loop-a', 'Home -> Home must resolve to the FIRST loop route (same rule as STOP\'s existingRouteFor)');
  assert(routeForEndpoints(routes, 'home', '~new') === undefined, 'a ~new endpoint never resolves (free ride)');
  assert(routeForEndpoints(routes, 'work', 'work') === undefined, 'no loop route on work: free ride, never an error');
});

test('virgin-cycle26 01: RECORD offers the START place in GOING TO (no equality filter) and resolves routes via routeForEndpoints', () => {
  const src = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'RecordScreen.tsx'), 'utf8');
  assert(!src.includes("filter((l) => l.id !== fromId)"), 'GOING TO still hides the START place — Home -> Home cannot be picked (Nathan 2026-10-07 ruling 3)');
  assert((src.match(/\{startable\.map\(\(l\) => \(/g) ?? []).length === 2, 'expected exactly two pill rows mapping startable (START and GOING TO)');
  assert(src.includes('const route = routeForEndpoints(CATALOG.routes, fromId, to);'), 'route lookup must go through recordFlow.ts routeForEndpoints');
  assert(!/CATALOG\.routes\.find\(\s*\(w\) => w\.startLandmarkId === fromId/.test(src), 'the inline route lookup should be gone');
  // Ruling 1 (no warnings): RecordScreen must not grow an Alert about loops.
  assert(!/Alert\.alert\([^)]*loop/i.test(src), 'no loop alert on RECORD');
});
```

The first test FAILS before 4.1 (import error: `routeForEndpoints` is not exported). The second FAILS before 4.2 (the filter is present, the inline `find` is present). Both pass after. (The word "loop" legitimately occurs in RecordScreen code at `:1345`, `loop={naming.loop}` — the naming card prop — so the test does not forbid the word, only an alert about it.)

## 5. Steps

1. `GIT_OPTIONAL_LOCKS=0 git status --short` (expect only `?? cycles/...` entries, plus whatever an earlier cycle26 brief left if one ran before you — see EXECUTION-ORDER.md). Baseline: `cd app && node --experimental-strip-types tests/run.ts | tail -1` → record the counts.
2. Edit 4.1, 4.2(a)(b)(c) with in-place Python read-modify-write on the exact quoted text (one occurrence each; if a quoted text occurs 0 or 2+ times, STOP).
3. Edit 4.3.
4. `cd app && node --experimental-strip-types tests/run.ts` → zero FAIL, count = baseline + 2.
5. `cd app && ./node_modules/.bin/tsc --noEmit` (timeout_ms 180000, tee to `cycles/virgin-cycle26/04-brief-01-tsc.log`) → exit 0.
6. `GIT_OPTIONAL_LOCKS=0 git diff --stat` → exactly the three files of §3; `git diff -- app/tests/ui-strings.allow.json` → empty.
7. Write `cycles/virgin-cycle26/04-brief-01-executor-report.md`: files touched, counts before/after, tsc result, the allow-list diff (empty), deviations verbatim.

## 6. Acceptance

- Suite zero FAIL, +2 tests; tsc exit 0.
- `grep -n "filter((l) => l.id !== fromId)" app/src/ui/RecordScreen.tsx` → no hit.
- `grep -c "startable.map((l) => (" app/src/ui/RecordScreen.tsx` → 2.
- `grep -n "routeForEndpoints" app/src/ui/RecordScreen.tsx` → exactly 2 hits (import + call).
- `git diff -- app/tests/ui-strings.allow.json` → empty. No new string, no Alert, no sub-label.
- `git diff -- app/src/ui/RecordScreen.tsx` has exactly three hunks (import, lookup, filter).

## 7. Non-goals

- No union of ways across several loop Routes on one place (plan §4). No change to `pickFrom`, `defaultEndpoints`, `afterSportSwitch`, `effectiveFromId`.
- No change to the armed title or any label (`Home → Home` stays, plan D9).
- No engine change (brief 02), no seeding/editor change (brief 03).
- `routeCreation.ts`, `routeNamingCard.tsx`, `location/index.ts` untouched.

## 8. For the Inspect pass

Rerun the suite and tsc; `git diff` must be the three files only with the hunks of §4; `ui-strings.allow.json` unchanged; confirm `routeForEndpoints`'s behaviour equals the removed inline `find` for non-loop pairs (same predicate, same `find` semantics); confirm the second test would FAIL if the filter were restored (it greps for the literal).
