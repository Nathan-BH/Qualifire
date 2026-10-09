# Brief 04 · RECORD: a `new` pill in WHICH WAY TODAY?, and "Original" for the old plain way

virgin-cycle28 · written by the Opus PLAN tier 2026-10-09 · executor: Sonnet · inspector: fresh Opus.
Read `cycles/virgin-cycle28/EXECUTOR-RULES.md` first. Self-contained: you do not need the digests.
Runs AFTER brief 03 (rename way) has landed and passed inspection.

## Goal (Nathan's binding rules, 2026-10-09)

On RECORD, when the START / GOING TO pair is a known route:
1. WHICH WAY TODAY? now shows when the route has ONE or more ways (today only > 1), and ends with a `new` pill.
2. `new` is NEVER selected by default, on any route. Only a tap turns it on; a second tap turns it off.
3. Turning `new` on deselects the way pill(s). Turning it off restores the default way (the most-ridden one, the
   existing `defaultWayFor`), not the last way tapped.
4. With `new` on, START starts a free ride on this pair: no reference line, the live trail drawn, no off-route
   scoring. This is exactly today's code path when no way is picked (`wayPick: null`); nothing in the engine,
   the live map or STOP changes. After STOP the existing card offers "New way on <route>" with a required
   specifier, because the ride's start/end discs match the route (`existingRouteId`).
5. When a new way is saved onto a route whose ONLY way is the rider's own and has no specifier, that old way gets
   the specifier "Original" in the same save (one constant). The new way keeps its own required specifier.
6. `new` resets to off at sport switch, ride end and discard (the three places the way pick already resets).

## What this will NOT change on the phone

No change to the timing engine, gates, ranking, reference lines, the live map's drawing rules, STOP's draft logic,
the naming card's text or rules, saved rides, or any route with no ways (a `new` START / GOING TO place still
behaves exactly as today). A known way picked as before rides exactly as before. The armed title reads
`<From> → <To>` with no variant while `new` is on. JS-only (OTA-able).

## Files you may touch (nothing else)

`app/src/ui/recordFlow.ts`, `app/src/ui/RecordScreen.tsx`, `app/src/store/waySpecs.ts`, `app/src/store/routeCreation.ts`,
`app/tests/recordflow_suite.ts`, `app/tests/routecreation_suite.ts`. `app/tests/ui-strings.allow.json` must stay
byte-identical (see Visible text).

## Pre-flight

1. `cd $HOME/mnt/Qualifire && GIT_OPTIONAL_LOCKS=0 git status --short` (briefs 01-02 and 03 may be applied: expected).
2. Baseline: `cd app && node --experimental-strip-types tests/run.ts` (zero FAIL; record counts) and
   `cd app && ./node_modules/.bin/tsc --noEmit` (exit 0; `timeout_ms: 180000`; tee to `../cycles/virgin-cycle28/12-brief-04-tsc-before.log`).
3. Every anchor below must occur EXACTLY once (python `src.count(old) == 1`). Otherwise STOP.

## Step 1 · `app/src/store/waySpecs.ts`

Anchor `export const PLAIN_SPEC_LABEL = 'plain';` → replace with:
```ts
export const PLAIN_SPEC_LABEL = 'plain';

/** virgin-cycle28 04 (Nathan 2026-10-09, ideas 4c/4e): the specifier a route's ONLY, plain way receives
 * when a second way is added to that route, so the two read apart. Provisional (Nathan: "a bit long";
 * fallbacks Classic / First / Main): this is the one place to change it. Renamable afterwards
 * (catalogMerge.ts renameWay). src/store is outside the ui-strings scanner's scope, so it has no
 * allow-list entry; it is reviewed via virgin-cycle28/10-plan.md's visible-text table. */
export const ORIGINAL_SPEC_LABEL = 'Original';
```

## Step 2 · `app/src/store/routeCreation.ts`

2a. Anchor `import { placeByLabel } from './placeSearch.ts';` → replace with:
```ts
import { placeByLabel } from './placeSearch.ts';
import { ORIGINAL_SPEC_LABEL } from './waySpecs.ts';
```
(`waySpecs.ts` imports only `type { Way }`: no cycle. If it imports anything else from routeCreation: STOP.)

2b. In `buildRouteCreationCatalog`'s `if (draft.existingRouteId) {` branch. Anchor (exact, six lines):
```
    return {
      schemaVersion: userCat.schemaVersion,
      landmarks: userCat.landmarks,
      routes: userCat.routes.map((w) => (w.id === routeId ? { ...w, wayIds: [...w.wayIds, wayId] } : w)),
      ways: [...userCat.ways, way],
      gateSets: [...userCat.gateSets, gateSet],
```
Replace with:
```
    // virgin-cycle28 04 (Nathan 2026-10-09, 4c/4e): the route's ONLY way, ours and plain, becomes
    // ORIGINAL_SPEC_LABEL in this same write so the two ways read apart (renamable afterwards). Not when
    // the route is shipped (not ours to edit), and not when the new way itself is called that (the two
    // would collide under validateCatalog's duplicate-specs rule): then the old way stays plain, as before.
    const ownRoute = userCat.routes.some((w) => w.id === routeId);
    const siblings = userCat.ways.filter((r) => r.routeId === routeId);
    const relabelId = ownRoute && siblings.length === 1 && cleanSpecs(siblings[0].specs).length === 0
      && !sameSpecs(specs, [ORIGINAL_SPEC_LABEL])
      ? siblings[0].id
      : null;
    return {
      schemaVersion: userCat.schemaVersion,
      landmarks: userCat.landmarks,
      routes: userCat.routes.map((w) => (w.id === routeId ? { ...w, wayIds: [...w.wayIds, wayId] } : w)),
      ways: [...userCat.ways.map((r) => (r.id === relabelId ? { ...r, specs: [ORIGINAL_SPEC_LABEL] } : r)), way],
      gateSets: [...userCat.gateSets, gateSet],
```
Do not touch the brand-new-route path below it, `cleanSpecs`, `sameSpecs`, `findWayWithSpecs`.

## Step 3 · `app/src/ui/recordFlow.ts`

Anchor (exact two lines, end of `routeForEndpoints`):
```
  return routes.find((r) => r.startLandmarkId === fromId && r.endLandmarkId === toId);
}
```
Replace with:
```
  return routes.find((r) => r.startLandmarkId === fromId && r.endLandmarkId === toId);
}

/** virgin-cycle28 04 (Nathan 2026-10-09): WHICH WAY TODAY? shows for any known route, one way included,
 * because it carries the 'new' pill. */
export function showWhichWay(routeWayCount: number): boolean {
  return routeWayCount >= 1;
}

/** virgin-cycle28 04 (4b): the 'new' pill's state is the id of the route it was tapped on (null = off).
 * A tap toggles it; nothing else ever sets it, so it is never the default on any route. */
export function toggleNewWay(cur: string | null, routeId: string): string | null {
  return cur === routeId ? null : routeId;
}

/** On only for the route it was tapped on: an id left over from another pair reads as off. */
export function newWayOn(cur: string | null, routeId: string | null): boolean {
  return routeId !== null && cur === routeId;
}
```

## Step 4 · `app/src/ui/RecordScreen.tsx`

4a. Import. Anchor (the whole line 39):
`import { LOOP_ID, effectiveFromId, endingSlotFor, interruptedRideAction, isFullscreen, liveMapOverlayFor, namingOfferMode, recordPressAction, resolveGoingTo, routeForEndpoints, wayHintForPick, type RecordPhase } from './recordFlow';`
Replace `wayHintForPick, type RecordPhase }` in it with `wayHintForPick, newWayOn, showWhichWay, toggleNewWay, type RecordPhase }`.

4b. State. Anchor `  const [wayPick, setWayPick] = useState<{ routeId: string; wayId: string } | null>(null);` → replace with:
```
  const [wayPick, setWayPick] = useState<{ routeId: string; wayId: string } | null>(null);
  // virgin-cycle28 04 (Nathan 2026-10-09, 4b): WHICH WAY TODAY?'s 'new' pill: the id of the route it is on
  // for, null = off. Never seeded: only a tap sets it (toggleNewWay); cleared with wayPick at sport switch,
  // ride end and discard.
  const [newWayRouteId, setNewWayRouteId] = useState<string | null>(null);
```

4c. Sport switch. Anchor `    setWayPick(reset.wayPick);` → `    setWayPick(reset.wayPick);\n    setNewWayRouteId(null);`

4d. Ride end. Anchor (exact four lines):
```
      setWayPick(null);
      pickedWayRef.current = null;
      setRideWayHint(null);
      setReveal(nextReveal);
```
Replace with the same four lines plus `      setNewWayRouteId(null);` inserted right after `      setWayPick(null);`.

4e. Discard. Anchor (exact four lines):
```
            setWayPick(null);
            pickedWayRef.current = null;
            setRideWayHint(null);
            setPhase('setup');
```
Replace with the same four lines plus `            setNewWayRouteId(null);` inserted right after `            setWayPick(null);`.

4f. The picked way. Anchor (exact two lines):
```
  const pickedWay: Way | null = route
    ? (wayPick && wayPick.routeId === route.id
```
Replace with:
```
  // virgin-cycle28 04: 'new' on = no way picked = the free ride on this known pair (no reference, live
  // trail, no off-route scoring); STOP then offers "New way on <route>" (existingRouteId).
  const newOn = newWayOn(newWayRouteId, route?.id ?? null);
  const pickedWay: Way | null = route && !newOn
    ? (wayPick && wayPick.routeId === route.id
```

4g. The pill renderer. Anchor `  pickedWayRef.current = pickedWay;` (exact line) → replace with:
```
  pickedWayRef.current = pickedWay;
  // virgin-cycle28 04: the 'new' pill that ends WHICH WAY TODAY?. A tap toggles it; either way the explicit
  // way pick is cleared, so on = no way pill lit, off = back to the default (most-ridden) way.
  const newWayPill = (routeId: string) => (
    <Pressable key={NEW_ID} onPress={() => { setNewWayRouteId((cur) => toggleNewWay(cur, routeId)); setWayPick(null); }}
      style={[styles.pill, newOn && styles.pillOn]}>
      <Text style={[styles.pillText, newOn && styles.pillTextOn]}>new</Text>
    </Pressable>
  );
```

4h. Block condition. Anchors:
- `              {/* A 'new' endpoint never resolves a route, so this is hidden by construction. */}` → `              {/* A 'new' endpoint never resolves a route, so this is hidden by construction. virgin-cycle28 04: shown from ONE way, ending with the 'new' pill. */}`
- `              {route && routeWays.length > 1 ? (` → `              {route && showWhichWay(routeWays.length) ? (`

4i. Spec rows (only with 2+ ways: `specPickRows` returns [] below 2). Anchor (exact two lines):
```
                  {hasSpecs(routeWays)
                    ? specPickRows(routeWays, pickedWay?.id ?? null, defaultWayFor).map((row) => (
```
Replace with:
```
                  {hasSpecs(routeWays) && routeWays.length > 1
                    ? specPickRows(routeWays, pickedWay?.id ?? null, defaultWayFor).filter((_, i) => !newOn || i === 0).map((row, i) => (
```

4j. Spec option + pill. Anchor (exact six lines):
```
                            <Pressable key={`${row.depth}:${o.label}`} onPress={() => setWayPick({ routeId: route.id, wayId: o.way.id })}
                              style={[styles.pill, o.on && styles.pillOn]}>
                              <Text style={[styles.pillText, o.on && styles.pillTextOn]}>{o.label}</Text>
                            </Pressable>
                          ))}
                        </View>
```
Replace with:
```
                            <Pressable key={`${row.depth}:${o.label}`} onPress={() => { setNewWayRouteId(null); setWayPick({ routeId: route.id, wayId: o.way.id }); }}
                              style={[styles.pill, o.on && !newOn && styles.pillOn]}>
                              <Text style={[styles.pillText, o.on && !newOn && styles.pillTextOn]}>{o.label}</Text>
                            </Pressable>
                          ))}
                          {i === 0 ? newWayPill(route.id) : null}
                        </View>
```

4k. Flat row option. Anchor `<Pressable key={r.id} onPress={() => setWayPick({ routeId: route.id, wayId: r.id })}` →
`<Pressable key={r.id} onPress={() => { setNewWayRouteId(null); setWayPick({ routeId: route.id, wayId: r.id }); }}`
(Its `pillOn` test `pickedWay?.id === r.id` is already false while `new` is on, because `pickedWay` is null.)

4l. Flat row pill. Anchor (exact five lines):
```
                              {wayVariantLabel(r.id, route, r.specs)}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
```
Replace with the same five lines plus `                        {newWayPill(route.id)}` inserted right before the final `                      </View>`.

Do NOT change: `startTracking({ wayPick: pickedWayRef.current?.id ?? null, ... })`, `setRideWayHint(pickedWayRef.current?.refLineId ?? null)`,
`defaultWayFor`, `pickSource` (it reads `'none'` while `new` is on: no type change), the STARTING FROM / GOING TO pills,
`onNamingSave`, `liveMapOverlayFor`, anything under `src/live/` or `src/location/`.

After editing, check: `newOn` is declared before `newWayPill` and before the JSX; `NEW_ID`, `Pressable`, `Text`,
`styles` are already in scope in RecordScreen (they are used by the STARTING FROM pills). If not: STOP.

## Step 5 · tests

5a. `app/tests/recordflow_suite.ts`: add `showWhichWay, toggleNewWay, newWayOn,` to the import list from
`'../src/ui/recordFlow.ts'` (anchor line `  LOOP_ID, resolveGoingTo, routeForEndpoints, NEW_ID, pickedLoop,` →
`  LOOP_ID, resolveGoingTo, routeForEndpoints, NEW_ID, pickedLoop, showWhichWay, toggleNewWay, newWayOn,`) and add:
```ts
test('virgin-cycle28 04: the new pill is opt-in, toggles, is keyed to its route; WHICH WAY shows from one way', () => {
  assert(showWhichWay(1) && showWhichWay(3) && !showWhichWay(0), 'shown from one way');
  assert(toggleNewWay(null, 'r1') === 'r1' && toggleNewWay('r1', 'r1') === null && toggleNewWay('r2', 'r1') === 'r1', 'toggle');
  assert(newWayOn('r1', 'r1') && !newWayOn('r1', 'r2') && !newWayOn(null, 'r1') && !newWayOn('r1', null), 'keyed to its route');
  const rec = fs.readFileSync(path.resolve(TESTS_DIR, '..', 'src', 'ui', 'RecordScreen.tsx'), 'utf8');
  assert(rec.includes('const [newWayRouteId, setNewWayRouteId] = useState<string | null>(null);'), 'starts off, never seeded');
  assert((rec.match(/setNewWayRouteId\(null\)/g) ?? []).length === 5, 'cleared at sport switch, ride end, discard and on both way-pill taps');
  assert((rec.match(/setNewWayRouteId\(\(cur\) => toggleNewWay\(cur, routeId\)\)/g) ?? []).length === 1 && (rec.match(/setNewWayRouteId\(/g) ?? []).length === 6, 'only the pill turns it on');
  assert(rec.includes('const pickedWay: Way | null = route && !newOn'), "'new' on = no way picked");
  assert(rec.includes('{route && showWhichWay(routeWays.length) ? (') && !rec.includes('route && routeWays.length > 1'), 'one-way routes show the block');
  assert(rec.includes('wayPick: pickedWayRef.current?.id ?? null,') && rec.includes('setRideWayHint(pickedWayRef.current?.refLineId ?? null);'), 'START path unchanged');
  assert((rec.match(/newWayPill\(route\.id\)/g) ?? []).length === 2, 'pill in both layouts');
});
```
(`fs`, `path`, `TESTS_DIR` are already imported at the top of this suite.)

5b. `app/tests/routecreation_suite.ts`:
- add `import { ORIGINAL_SPEC_LABEL } from '../src/store/waySpecs.ts';` next to the other top-of-file imports (before line `const LAT0 = 50.87;`);
- in test `'WP-G 1: variant build on a user way'`, after the anchor line
  `  assert(JSON.stringify(way.specs) === JSON.stringify(['Dry', 'Fast']), 'specs trimmed, empty dropped, order kept');`
  add:
  `  assert(JSON.stringify(built.ways.find((r) => r.id === 'r1')!.specs) === JSON.stringify([ORIGINAL_SPEC_LABEL]), 'virgin-cycle28 04: the sole plain way became Original');`
- add a new test (uses the suite's own `lm`, `catWith`, `variantDraft`, `LAT0`, `LON0`):
```ts
test('virgin-cycle28 04: Original only for the sole, plain, own way; never when the new way is called that', () => {
  const wa = lm('a', LAT0, LON0, 150);
  const wb = lm('b', LAT0 + 0.019, LON0, 150);
  const w1: Route = { id: 'w1', startLandmarkId: 'a', endLandmarkId: 'b', wayIds: ['r1'] };
  const plain: Way = { id: 'r1', routeId: 'w1', refLineId: 'r1', gateSetVersion: 1, seeded: false };
  const gs: GateSet[] = [{ wayId: 'r1', version: 1, chainageM: [10, 990], createdAtMs: 0 }];
  const one = catWith([wa, wb], [w1], [plain]); one.gateSets = gs;
  const built = buildRouteCreationCatalog(one, variantDraft('ride-o1', 'w1', 'a', 'b'), { start: '', end: '', specs: ['Dry'] });
  const old = built.ways.find((r) => r.id === 'r1')!;
  assert(ORIGINAL_SPEC_LABEL === 'Original' && JSON.stringify(old.specs) === JSON.stringify(['Original']), `old specs ${JSON.stringify(old.specs)}`);
  assert(old.refLineId === 'r1' && old.gateSetVersion === 1 && old.routeId === 'w1', 'only specs changed');
  assert(validateCatalog(mergeCatalogs(emptyCatalog(), built)).length === 0, 'merged validates');
  const same = buildRouteCreationCatalog(one, variantDraft('ride-o2', 'w1', 'a', 'b'), { start: '', end: '', specs: ['original'] });
  assert(same.ways.find((r) => r.id === 'r1')!.specs === undefined, 'new way called Original: old way stays plain');
  assert(validateCatalog(mergeCatalogs(emptyCatalog(), same)).length === 0, 'and that validates too');
  const named = catWith([wa, wb], [w1], [{ ...plain, specs: ['Wet'] }]); named.gateSets = gs;
  const b2 = buildRouteCreationCatalog(named, variantDraft('ride-o3', 'w1', 'a', 'b'), { start: '', end: '', specs: ['Dry'] });
  assert(JSON.stringify(b2.ways.find((r) => r.id === 'r1')!.specs) === JSON.stringify(['Wet']), 'a named sole way keeps its name');
  const r2: Way = { id: 'r2', routeId: 'w1', refLineId: 'r2', gateSetVersion: 1, seeded: false, specs: ['Wet'] };
  const two = catWith([wa, wb], [{ ...w1, wayIds: ['r1', 'r2'] }], [plain, r2]);
  two.gateSets = [...gs, { wayId: 'r2', version: 1, chainageM: [10, 990], createdAtMs: 0 }];
  const b3 = buildRouteCreationCatalog(two, variantDraft('ride-o4', 'w1', 'a', 'b'), { start: '', end: '', specs: ['Dry'] });
  assert(b3.ways.find((r) => r.id === 'r1')!.specs === undefined, 'with two ways already, nothing is relabelled');
});
```
If `variantDraft`, `catWith`, `lm` (4 args), `LAT0`, `LON0`, `GateSet`, `Route`, `Way` are not available at that point
in the suite: STOP. The existing test `'WP-G 2: variant on a SEED-owned way'` must pass unchanged (seed route: not ours).

## Visible text

| file | kind | exact text | why it earns its place |
|------|------|-----------|------------------------|
| RecordScreen.tsx | text | `new` | the pill; `src/ui/RecordScreen.tsx|text|new` is ALREADY listed (same file, same kind): no entry |
| store/waySpecs.ts | spec value shown as a pill / name part | `Original` | Nathan 4e, provisional. `src/store` is not scanned and it is one word: no entry possible (it would be reported STALE); reviewed via 10-plan.md |

Allow-list: **byte-identical**. Any UNLISTED/STALE line from the ui-strings suite: STOP.

## Acceptance

1. `cd app && node --experimental-strip-types tests/run.ts`: zero FAIL; PASS = baseline + 2.
2. `cd app && ./node_modules/.bin/tsc --noEmit`: exit 0 (tee to `../cycles/virgin-cycle28/12-brief-04-tsc.log`).
3. `GIT_OPTIONAL_LOCKS=0 git diff --stat -- app/tests/ui-strings.allow.json`: empty (nothing beyond brief 03's one entry).
4. `GIT_OPTIONAL_LOCKS=0 git diff --stat`: this brief's six files plus earlier briefs' (untouched by you).
5. `git diff app/src/live app/src/location app/src/ui/routeNamingCard.tsx app/src/store/routeFromRide.ts`: empty.
6. No hunk under `app/modules/`, `app.json`, `app.config.js`, `package.json`, `eas.json`.

## STOP-ON-AMBIGUITY

Any anchor mismatch, undecided call, or unexpected failing check: STOP and report verbatim. Never guess.
Escalations go to a fresh Opus via the coordinator.

## Report

`cycles/virgin-cycle28/12-brief-04-executor-report.md` per EXECUTOR-RULES.md. Inspector focus: hook/variable order
in RecordScreen (`newOn` before use; `newWayPill` is not a hook), that no path sets `newWayRouteId` to non-null except
the pill, that a route with ONE way renders `<way> | new` (flat row even when that way has specs), and that a picked
known way still reaches `startTracking` exactly as before. OPEN-ITEMS line for the coordinator: "'Original' is
provisional (Nathan 4e): revisit after device use; constant ORIGINAL_SPEC_LABEL in app/src/store/waySpecs.ts."
