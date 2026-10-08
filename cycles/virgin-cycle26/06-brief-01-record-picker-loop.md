# Brief 01 — RECORD picker: the `loop` pill (finish where I start) + the `<Place> loop` title

Written by the Plan tier (Fable) 2026-10-07 ~22:40 UTC from `05-plan.md` (D1-D3, §7) and digest 02; every anchor below was read in the working tree at that time (suite baseline `918 tests: 915 pass, 0 fail, 3 skip`; cycle25 brief 03 present uncommitted). **Amended 2026-10-08 ~00:57 (Nathan's label ruling, plan D13 + §Amendment): a loop route is titled `<Place> loop`, never `<Place> → <Place>`; §4.5 adds the shared `routeTitle` formatter and its seven call sites, §4.3 two more tests.** Executor: Sonnet, alone. Read `EXECUTOR-RULES.md` first, then all of this.

## 0. Rules

- **STOP-ON-AMBIGUITY.** A quoted anchor not at its line or within ±15 lines with no other plausible match, a test of §5 not behaving as predicted, or any call not settled here → STOP, write what you found verbatim into `cycles/virgin-cycle26/06-brief-01-executor-report.md` under `## STOPPED`, return.
- **No warnings, no blocks** (Nathan, ruling 1): no banner, alert, sub-label, disabled state or copy about loops. If you find yourself wanting one, STOP.
- **Rider-facing text:** this brief adds EXACTLY ONE allow-list string, the pill `loop` (§4.4). `git diff -- app/tests/ui-strings.allow.json` must show exactly that one appended entry and nothing else. The title word `loop` of §4.5 lives in `src/store/defaultWay.ts`, which the `ui_strings` scanner does not walk (`tests/ui_strings_extract.ts` `listScanFiles`: `App.tsx`, `src/ui/**`, `src/location/*.ts`) — an allow-list entry for it would be reported STALE, so it is budgeted in plan §7 and pinned by the §4.3 `wayspec_suite` test instead. Any other UNLISTED/STALE report from the `ui_strings` suite → STOP.
- Never delete; no commit; no publish; no new dependency; no edits outside §3; `GIT_OPTIONAL_LOCKS=0`. Strip-only TS.

## 1. Purpose

GOING TO hides the START place (`RecordScreen.tsx:1598`), so a Home loop (the same place at both ends) cannot be chosen — and a stale `to` equal to the START place is a hidden selection nothing shows (digest 02 §1). Nathan's design: GOING TO offers a **`loop`** pill meaning "finish where I start". After this brief:

- GOING TO = the other places (START place still hidden) + `loop` + `new`.
- `to` may hold the UI sentinel `LOOP_ID = '~loop'`. A pure `resolveGoingTo(to, fromId, newId)` turns the pair into `{ toId, loop }`: `LOOP_ID` ⇒ `toId = fromId`; a stale `to === fromId` (not `new`) ⇒ the same, shown as the `loop` pill being on; otherwise `toId = to`. `toId` is what the route lookup, the armed title and the start context consume — so a loop follows a START change and auto-detection.
- The route lookup goes through a pure, tested `routeForEndpoints(routes, fromId, toId)`: the FIRST route with that start and end, loops included (STOP's own `existingRouteFor` rule, `routeCreation.ts:164-168`). With a loop Route it is scored live like any route; without one it is a free ride and STOP's existing naming card turns it into a loop Route (`routeCreation.ts:273, 280`). Nobody is asked anything.
- **Title (Nathan 2026-10-08 00:57):** a loop route reads **`<Place> loop`** — e.g. `Home loop`, and with the way's specs `Home loop · Dry · Fast`, exactly as `Home → Work · Dry · Fast` reads today (the ` · ` suffix is untouched; the only change is the base). One pure formatter `routeTitle(startLabel, endLabel, loop)` in `store/defaultWay.ts` replaces the seven hand-written `${start} → ${end}` templates that name a route: `wayLabelIn` (activities feed, ride detail, replay, gate editor, naming-card "not …?"), the naming card's `existingRouteProps` label, the catalog detail and MAP models, the RECORD armed title, and the two pick-event fallback titles in RidesScreen / RideDetailScreen. `loop` is decided by the caller from landmark IDS (two places may share a label), never from the labels. Non-route templates (`catalogMerge.ts:105` diagnostic, `demoModel.ts` fixed demo names, the three delete-confirmation dialogs in `catalogDeleteActions.ts` whose allow-list templates would otherwise change) stay as they are — plan §8 hands the dialogs over.

## 2. Verified anchors (working tree 2026-10-07 ~22:25 UTC)

- `app/src/ui/RecordScreen.tsx:39` — `import { effectiveFromId, endingSlotFor, interruptedRideAction, isFullscreen, liveMapOverlayFor, namingOfferMode, recordPressAction, wayHintForPick, type RecordPhase } from './recordFlow';`
- `:133` — `const NEW_ID = '~new';`
- `:279` — `  const [to, setTo] = useState(() => defaultEndpoints(activeCatalog()).to ?? NEW_ID);`
- `:725-727`:
  ```
        from: ctx && ctx.from !== NEW_ID ? ctx.from : null,
        to: ctx && ctx.to !== NEW_ID ? ctx.to : null,
      };
  ```
  (reads `startContextRef.current`, which §4.2(d) feeds with `toId` — no edit here.)
- `:1151` — `  const fromId = effectiveFromId({ startMode: settings.startMode, detectedId: detected?.id ?? null, from, fromExplicit });`
- `:1153-1157`:
  ```
    // The way the rider picked, and the routes on it -- so the ghost count is
    // THIS way's, not always Morning's.
    const route = CATALOG.routes.find(
      (w) => w.startLandmarkId === fromId && w.endLandmarkId === to,
    );
  ```
- `:1250-1252`:
  ```
    startContextRef.current = {
      from: fromId, to, fromLabel: landmarkLabel(fromId), toLabel: landmarkLabel(to), pickSource,
    };
  ```
- `:1263` — `          {landmarkLabel(fromId)} → {landmarkLabel(to)}`
- `:1596-1610`:
  ```
                <Text style={styles.flowLabel}>GOING TO</Text>
                <View style={styles.pillRow}>
                  {startable.filter((l) => l.id !== fromId).map((l) => (
                    <Pressable key={l.id} onPress={() => setTo(l.id)}
                      style={[styles.pill, to === l.id && styles.pillOn]}>
                      <Text style={[styles.pillText, to === l.id && styles.pillTextOn]}>{l.label}</Text>
                    </Pressable>
                  ))}
                  {/* WP-B: 'new' — unknown destination (e.g. new>>home), i.e. the
                      first ride from/to this landmark. */}
                  <Pressable key={NEW_ID} onPress={() => setTo(NEW_ID)}
                    style={[styles.pill, to === NEW_ID && styles.pillOn]}>
                    <Text style={[styles.pillText, to === NEW_ID && styles.pillTextOn]}>new</Text>
                  </Pressable>
                </View>
  ```
- `app/src/ui/RecordScreen.tsx:87` — `import { defaultEndpoints, wayLabelIn, wayVariantLabel, sortWaysForDisplay } from '../store/defaultWay';`
- `:1264` — `          {route && pickedWay ? ` · ${wayVariantLabel(pickedWay.id, route, pickedWay.specs)}` : ''}` (the existing ` · ` spec suffix of the armed title — NOT edited; it is what makes `Home loop · Dry` read like `Home → Work · Dry`).
- `app/src/store/defaultWay.ts:3-5` imports `types.ts`, `results.ts`, `waySpecs.ts` only (no import from `routeFromRide.ts`, so §4.5(b) creates no cycle); `:76-83`:
  ```
  export function wayLabelIn(c: Catalog, id: string): string {
    const r = c.ways.find((x) => x.id === id);
    if (!r || !isUserMintedWayId(id)) return wayLabel(id);
    const w = c.routes.find((x) => x.id === r.routeId);
    const lab = (lid: string) => c.landmarks.find((l) => l.id === lid)?.label ?? lid;
    const base = w ? `${lab(w.startLandmarkId)} → ${lab(w.endLandmarkId)}` : id;
    return r.specs?.length ? `${base} · ${r.specs.join(' · ')}` : base;
  }
  ```
  preceded by its doc comment `/** WP-G: full name of a route as the rider knows it — "Home → Work · Dry ·` (`:72-75`).
- `app/src/store/routeFromRide.ts:21` — `import { seedGateChainages } from './gateSeeding.ts';`; `:196` — `    label: `${lab(w.startLandmarkId)} → ${lab(w.endLandmarkId)}`,` (inside `existingRouteProps`, `lab` defined on `:194`). Brief 03 anchors `:117` and `:240` of this file; §4.5(b) adds ONE import line, so if brief 03 runs after you its anchors sit one line lower (within its ±15 tolerance) — say so in your report.
- `app/src/ui/catalogDetailModel.ts:13` — `import { wayLabelIn, wayVariantLabel, sortWaysForDisplay } from '../store/defaultWay.ts';`; `:61-63`:
  ```
  function routeLabel(c: Catalog, w: Route): string {
    return `${landmarkLabel(c, w.startLandmarkId)} → ${landmarkLabel(c, w.endLandmarkId)}`;
  }
  ```
- `app/src/ui/catalogMapModel.ts:19` — `import { wayVariantLabel } from '../store/defaultWay.ts';`; `:42-44`:
  ```
  function routeLabel(c: Catalog, r: Route): string {
    return `${landmarkLabel(c, r.startLandmarkId)} → ${landmarkLabel(c, r.endLandmarkId)}`;
  }
  ```
- `app/src/ui/RidesScreen.tsx:19` — `import { wayLabelIn } from '../store/defaultWay';`; `:140-142`:
  ```
              if (pick && pick.fromLabel && pick.toLabel) {
                updates.set(m.rideId, `${pick.fromLabel} → ${pick.toLabel}`);
              }
  ```
- `app/src/ui/RideDetailScreen.tsx:47` — `import { wayLabelIn } from '../store/defaultWay.ts';`; `:226` — `          setPickLabel(pick && pick.fromLabel && pick.toLabel ? `${pick.fromLabel} → ${pick.toLabel}` : null);`
- `app/src/storage/types.ts:144-153` — `PickEvent { kind: 'pick'; …; from?: string; to?: string; fromLabel?: string; toLabel?: string; … }`. RecordScreen `:725-727` logs `from`/`to` as the landmark id or `null` (`'~new'` is never logged), so `!!pick.from && pick.from === pick.to` is "a loop on a real place" and a `new → new` first ride stays `new → new`.
- `app/tests/wayspec_suite.ts:15` — `import { isUserMintedWayId, wayLabel, wayLabelIn, wayVariantLabel } from '../src/store/defaultWay.ts';`; the file ends with the test whose last lines are `  assert(wayLabelIn(userCat, 'route:not-there') === wayLabel('route:not-there'), 'unknown id: falls back to routeLabel byte-identical');\n});`; `:156-159` define `seedCat` with landmarks `home` (label `Home`) and `work` (label `Work`); `emptyCatalog` is imported on `:16`, types `Catalog, Way, Route` on `:17`.
- `app/tests/catalogdetail_suite.ts:9-11` import `fmtLengthM, placeDetailFor, routeDetailFor, type CatalogDetailDeps` from `'../src/ui/catalogDetailModel.ts'`; fixtures `:20-31`: `lmA` label `Home`, `lmB` label `Work`, `lmC` label `Park Loop`, `routeAB` (`way:AB`, `lm:a` → `lm:b`), `routeLoop` (`way:Loop`, `lm:c` → `lm:c`, `loopDiscriminator: 'via park'`); `DEPS` is the deps object used by every test; the file ends with `  assert(loop.referenceUnscored === true, 'a referenceRideId with no stored result must be flagged unscored');\n});`. `tests/catalogmap_suite.ts:126,142` assert `'Home → Work'` for a non-loop route — must stay green unedited.
- `app/src/ui/recordFlow.ts` — pure, NO `import` lines (`grep -n "^import" src/ui/recordFlow.ts` empty); `effectiveFromId` at `:63-71`; the file ends with `endingSlotFor` (`…  return 'none';\n}\n`).
- `app/tests/recordflow_suite.ts:6-13` imports: `fs`, `path`, `{ assert, test, TESTS_DIR } from './lib.ts'`, then the multi-line import from `'../src/ui/recordFlow.ts'` (`canTransition, effectiveFromId, endingSlotFor, isFullscreen, liveMapOverlayFor, namingOfferMode, recordPressAction, type RecordPhase, wayHintForPick, interruptedRideAction, INTERRUPTED_MIN_FIXES,`), then `import { addSport, emptySports } from '../src/store/sports.ts';`. The file ends with a test whose last lines are `assert(!tw.includes('TODAY · unranked') && tw.includes('>TODAY · Not ranked</Text>'), 'tower ceremony: Not ranked');\n});`.
- `app/tests/ui-strings.allow.json` — dict with `entries` (434), each `{file, kind, text, reason, since, by}`; existing `{ "file": "src/ui/RecordScreen.tsx", "kind": "text", "text": "new", … "by": "bootstrap" }`. Entries are sorted by (file, kind, text) in code-unit order (EXECUTOR-RULES).
- `app/tests/run.ts:40` already imports `recordflow_suite.ts`. **Do not edit `run.ts`.**

## 3. Files (complete list)

1. `app/src/ui/recordFlow.ts` — `LOOP_ID`, `resolveGoingTo`, `routeForEndpoints` appended.
2. `app/src/ui/RecordScreen.tsx` — two import lines (`:39`, `:87`); `toId` derivation; route lookup; start context; armed title via `routeTitle`; `loop` pill.
3. `app/tests/recordflow_suite.ts` — import; three tests appended.
4. `app/tests/ui-strings.allow.json` — one appended entry (§4.4).
5. `app/src/store/defaultWay.ts` — `routeTitle` added; `wayLabelIn` uses it (§4.5a).
6. `app/src/store/routeFromRide.ts` — import + `existingRouteProps` label (§4.5b).
7. `app/src/ui/catalogDetailModel.ts` — import + `routeLabel` (§4.5c).
8. `app/src/ui/catalogMapModel.ts` — import + `routeLabel` (§4.5d).
9. `app/src/ui/RidesScreen.tsx` — import + pick-event fallback title (§4.5e).
10. `app/src/ui/RideDetailScreen.tsx` — import + pick-event fallback title (§4.5f).
11. `app/tests/wayspec_suite.ts` — import + one test appended (§4.3).
12. `app/tests/catalogdetail_suite.ts` — one test appended (§4.3).

## 4. Edits

### 4.1 `recordFlow.ts` — append at the end of the file

```ts

/** virgin-cycle26 brief 01 (Nathan 2026-10-08): GOING TO offers a `loop` pill
 * meaning "finish where I start" instead of listing the START place twice.
 * A UI sentinel like RecordScreen's NEW_ID ('~new'): never a catalog id. */
export const LOOP_ID = '~loop';

/** What the START / GOING TO pair means right now. `to === LOOP_ID` resolves
 * to the START place at the moment of use, so a loop follows a START change
 * and auto-detection. A stale `to` equal to the START place (the rider picked
 * a destination, then made it the start) is the SAME selection — shown as the
 * loop pill being on, never as a hidden state. `newId` is the '~new' sentinel:
 * new → new is the ordinary first ride, not a loop (STOP's draft decides by
 * geometry what it becomes). `toId` is what the route lookup, the armed title
 * and the start context consume. */
export function resolveGoingTo(to: string, fromId: string, newId: string): { toId: string; loop: boolean } {
  if (to === LOOP_ID || (to === fromId && to !== newId)) return { toId: fromId, loop: true };
  return { toId: to, loop: false };
}

/** The Route a START / GOING TO pair resolves to: the FIRST route with exactly
 * this start and this end. `fromId === toId` is a loop and resolves like any
 * other pair — the same first-match rule STOP's existingRouteFor
 * (store/routeCreation.ts) uses, so RECORD finds the Route STOP would have
 * attached the ride to. A '~new' / '~loop' endpoint never matches (no route
 * has that id) and yields undefined = free ride. Generic over the two id
 * fields so this module stays import-free. */
export function routeForEndpoints<R extends { startLandmarkId: string; endLandmarkId: string }>(
  routes: readonly R[], fromId: string, toId: string,
): R | undefined {
  return routes.find((r) => r.startLandmarkId === fromId && r.endLandmarkId === toId);
}
```

### 4.2 `RecordScreen.tsx`

(a) Line 39 → add `LOOP_ID`, `resolveGoingTo`, `routeForEndpoints` (alphabetical, `LOOP_ID` first as a constant):

```
import { LOOP_ID, effectiveFromId, endingSlotFor, interruptedRideAction, isFullscreen, liveMapOverlayFor, namingOfferMode, recordPressAction, resolveGoingTo, routeForEndpoints, wayHintForPick, type RecordPhase } from './recordFlow';
```

(b) Lines 1153-1157 become:

```
  // virgin-cycle26 brief 01: `to` may be the LOOP_ID sentinel ("finish where I
  // start"); resolve it against the effective START before anything reads it.
  const { toId, loop: loopOn } = resolveGoingTo(to, fromId, NEW_ID);

  // The route the rider picked, and the ways on it -- so the ghost count is
  // THIS way's, not always Morning's. A loop (toId === fromId) resolves like
  // any other pair (recordFlow.ts routeForEndpoints).
  const route = routeForEndpoints(CATALOG.routes, fromId, toId);
```

(c) Line 1251 → `    from: fromId, to: toId, fromLabel: landmarkLabel(fromId), toLabel: landmarkLabel(toId), pickSource,`

(d) Line 1263 → `          {routeTitle(landmarkLabel(fromId), landmarkLabel(toId), loopOn && toId !== NEW_ID)}` — the whole JSX line (`{a} → {b}` becomes one expression). Line 1264 (the ` · ${wayVariantLabel(…)}` suffix) is NOT touched: with a loop Route and a picked way the title reads `Home loop · Dry`. `toId !== NEW_ID` keeps `new → loop` (D2: resolves to `new → new`, pill on) titled `new → new`, the ordinary first ride.

(d2) Line 87 → `import { defaultEndpoints, routeTitle, wayLabelIn, wayVariantLabel, sortWaysForDisplay } from '../store/defaultWay';`

(e) GOING TO row: between the places' `))}` (line 1603) and the `{/* WP-B: 'new' …` comment (line 1604) insert:

```
                {/* virgin-cycle26 brief 01 (Nathan 2026-10-08): 'loop' — finish
                    where I start. Resolves to the START place at use time
                    (recordFlow.ts resolveGoingTo), so it follows a START change. */}
                <Pressable key={LOOP_ID} onPress={() => setTo(LOOP_ID)}
                  style={[styles.pill, loopOn && styles.pillOn]}>
                  <Text style={[styles.pillText, loopOn && styles.pillTextOn]}>loop</Text>
                </Pressable>
```

The `.filter((l) => l.id !== fromId)` on line 1598 STAYS. Do NOT touch `pickFrom` (`:284`), `setTo`, `pickSport`, the START row, the `new` pills, `onRecord`, `onStart`, `landmarkLabel`, `ridePickRef`, line 1264, or any other string.

### 4.3 `tests/recordflow_suite.ts`

Add `LOOP_ID, resolveGoingTo, routeForEndpoints,` to the import list from `'../src/ui/recordFlow.ts'` (inside the existing braces, e.g. after `INTERRUPTED_MIN_FIXES,`). Append at the END of the file:

```ts

// ------------------------------------------------ virgin-cycle26 brief 01
const NEW = '~new';

test('virgin-cycle26 01: resolveGoingTo — the loop pill resolves to the START place and follows it; a stale to === from is the same selection; new → loop is new → new', () => {
  assert(LOOP_ID === '~loop' && (LOOP_ID as string) !== NEW, 'sentinels must differ');
  let r = resolveGoingTo(LOOP_ID, 'home', NEW);
  assert(r.toId === 'home' && r.loop, `loop from home: ${JSON.stringify(r)}`);
  r = resolveGoingTo(LOOP_ID, 'work', NEW);
  assert(r.toId === 'work' && r.loop, 'the loop follows a START change');
  r = resolveGoingTo('home', 'home', NEW);
  assert(r.toId === 'home' && r.loop, 'a stale destination equal to the start IS the loop selection (no hidden state)');
  r = resolveGoingTo('work', 'home', NEW);
  assert(r.toId === 'work' && !r.loop, 'an ordinary pair is untouched');
  r = resolveGoingTo(NEW, 'home', NEW);
  assert(r.toId === NEW && !r.loop, 'home → new is untouched');
  r = resolveGoingTo(LOOP_ID, NEW, NEW);
  assert(r.toId === NEW && r.loop, 'new → loop resolves to new → new (ordinary first ride), pill shown on');
  r = resolveGoingTo(NEW, NEW, NEW);
  assert(r.toId === NEW && !r.loop, 'new → new is NOT a loop selection');
});

test('virgin-cycle26 01: routeForEndpoints resolves a loop like any other pair, first match wins, sentinels never match', () => {
  const routes = [
    { id: 'r:home-work', startLandmarkId: 'home', endLandmarkId: 'work' },
    { id: 'r:loop-a', startLandmarkId: 'home', endLandmarkId: 'home', loopDiscriminator: 'loop:a' },
    { id: 'r:loop-b', startLandmarkId: 'home', endLandmarkId: 'home', loopDiscriminator: 'loop:b' },
    { id: 'r:work-home', startLandmarkId: 'work', endLandmarkId: 'home' },
  ];
  assert(routeForEndpoints(routes, 'home', 'work')?.id === 'r:home-work', 'A → B');
  assert(routeForEndpoints(routes, 'work', 'home')?.id === 'r:work-home', 'B → A is a different route');
  assert(routeForEndpoints(routes, 'home', 'home')?.id === 'r:loop-a', 'a Home loop (home, home) resolves to the FIRST loop route (STOP\'s existingRouteFor rule)');
  assert(routeForEndpoints(routes, 'home', NEW) === undefined, 'a ~new endpoint never resolves (free ride)');
  assert(routeForEndpoints(routes, 'home', LOOP_ID) === undefined, 'an unresolved ~loop never resolves either (callers resolve first)');
  assert(routeForEndpoints(routes, 'work', 'work') === undefined, 'no loop route on work: free ride, never an error');
});

test('virgin-cycle26 01: RECORD offers a loop pill in GOING TO, resolves to/toId through recordFlow, keeps hiding the START place, adds no alert', () => {
  const src = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'RecordScreen.tsx'), 'utf8');
  assert(src.includes("filter((l) => l.id !== fromId)"), 'GOING TO must still hide the START place (the loop pill replaces it; Nathan 2026-10-08)');
  assert(src.includes('const { toId, loop: loopOn } = resolveGoingTo(to, fromId, NEW_ID);'), 'to must be resolved through resolveGoingTo');
  assert(src.includes('const route = routeForEndpoints(CATALOG.routes, fromId, toId);'), 'route lookup must go through routeForEndpoints with toId');
  assert(!/CATALOG\.routes\.find\(\s*\(w\) => w\.startLandmarkId === fromId/.test(src), 'the inline route lookup should be gone');
  assert((src.match(/<Pressable key=\{LOOP_ID\} onPress=\{\(\) => setTo\(LOOP_ID\)\}/g) ?? []).length === 1, 'exactly one loop pill');
  assert(src.includes('pillTextOn]}>loop</Text>'), 'the pill reads `loop`');
  assert(src.includes('to: toId, fromLabel: landmarkLabel(fromId), toLabel: landmarkLabel(toId), pickSource,'), 'start context carries the resolved toId');
  assert(src.includes('{routeTitle(landmarkLabel(fromId), landmarkLabel(toId), loopOn && toId !== NEW_ID)}'), 'armed title goes through routeTitle with the resolved toId (Nathan 2026-10-08: "Home loop", never "Home → Home")');
  assert(!/landmarkLabel\(fromId\)\} → \{landmarkLabel/.test(src), 'the hand-written arrow title is gone');
  assert(!/landmarkLabel\(to\)/.test(src), 'no consumer reads the raw `to` for a label');
  // Ruling 1 (no warnings): RecordScreen must not grow an alert or a flash about loops.
  assert(!/Alert\.alert\([^)]*loop/i.test(src) && !/flashSub\([^)]*loop/i.test(src), 'no loop alert / flash on RECORD');
});
```

**`tests/wayspec_suite.ts`** — line 15 → `import { isUserMintedWayId, routeTitle, wayLabel, wayLabelIn, wayVariantLabel } from '../src/store/defaultWay.ts';` and append at the END of the file:

```ts

// ------------------------------------------------ virgin-cycle26 brief 01
test('virgin-cycle26 01: routeTitle — a loop is "<Place> loop", never "<Place> → <Place>"; ids decide, not labels; wayLabelIn keeps the " · spec" suffix', () => {
  assert(routeTitle('Home', 'Home', true) === 'Home loop', `loop: ${routeTitle('Home', 'Home', true)}`);
  assert(routeTitle('Home', 'Work', false) === 'Home → Work', 'an ordinary pair is byte-identical to the old template');
  assert(routeTitle('Home', 'Home', false) === 'Home → Home', 'two DIFFERENT places sharing a label are not a loop (the caller decides from ids)');
  assert(routeTitle('new', 'new', false) === 'new → new', 'a first ride stays new → new');
  const lm = (id: string, label: string) => ({ id, label, lat: 0, lon: 0, radiusM: 1, activeFromMs: 0, activeUntilMs: null, offerAtStart: true });
  const loopRoute: Route = { id: 'home>home', startLandmarkId: 'home', endLandmarkId: 'home', loopDiscriminator: 'loop:park', wayIds: ['route:lp', 'route:lq'] };
  const abRoute: Route = { id: 'home>work', startLandmarkId: 'home', endLandmarkId: 'work', wayIds: ['route:ab'] };
  const lp: Way = { id: 'route:lp', routeId: 'home>home', refLineId: 'route:lp', gateSetVersion: 1, seeded: false };
  const lq: Way = { id: 'route:lq', routeId: 'home>home', refLineId: 'route:lq', gateSetVersion: 1, seeded: false, specs: ['Dry', 'Fast'] };
  const ab: Way = { id: 'route:ab', routeId: 'home>work', refLineId: 'route:ab', gateSetVersion: 1, seeded: false, specs: ['Dry'] };
  const c: Catalog = { ...emptyCatalog(), landmarks: [lm('home', 'Home'), lm('work', 'Work')], routes: [loopRoute, abRoute], ways: [lp, lq, ab] };
  assert(wayLabelIn(c, 'route:lp') === 'Home loop', `plain loop way: ${wayLabelIn(c, 'route:lp')}`);
  assert(wayLabelIn(c, 'route:lq') === 'Home loop · Dry · Fast', `loop way with specs: ${wayLabelIn(c, 'route:lq')}`);
  assert(wayLabelIn(c, 'route:ab') === 'Home → Work · Dry', 'a non-loop way is unchanged');
  assert(!wayLabelIn(c, 'route:lq').includes('→'), 'no arrow anywhere in a loop title');
});
```

**`tests/catalogdetail_suite.ts`** — append at the END of the file:

```ts

// ------------------------------------------------ virgin-cycle26 brief 01
test('virgin-cycle26 01: catalog detail titles a loop route "<Place> loop" and a pair "<From> → <To>"', () => {
  const loopW = routeDetailFor('way:Loop', DEPS)!;
  assert(loopW.label === 'Park Loop loop', `loop route label: ${loopW.label}`);
  const abW = routeDetailFor('way:AB', DEPS)!;
  assert(abW.label === 'Home → Work', `pair label unchanged: ${abW.label}`);
  const place = placeDetailFor('lm:c', DEPS)!;
  assert(place.routes.length === 1 && place.routes[0].label === 'Park Loop loop', `place C's touching route: ${JSON.stringify(place.routes[0])}`);
});
```

(`placeDetailFor`'s `routes[].label` is `routeLabel(c, w)` at `catalogDetailModel.ts:113`; `routeDetailFor`'s `label` at `:153` — both go through the one `routeLabel` edited in §4.5(c).)

### 4.4 `tests/ui-strings.allow.json` — ONE appended entry (python read-modify-write, then sort, dump `indent=2, ensure_ascii=False` + trailing newline, per EXECUTOR-RULES)

```json
{ "file": "src/ui/RecordScreen.tsx", "kind": "text", "text": "loop",
  "reason": "virgin-cycle26 brief 01: GOING TO pill = finish where I start (Nathan 2026-10-08); replaces offering the START place twice",
  "since": "2026-10-08", "by": "Sonnet execute, virgin-cycle26 brief 01" }
```

Use the same key order as the neighbouring entries (`file, kind, text, reason, since, by`). If the `ui_strings` suite reports this string under a different `kind` than `text`, STOP and report the exact line. Do NOT add an entry for the title word `loop` of §4.5 — `src/store/defaultWay.ts` is outside the scanner's walk and the entry would be STALE (see §0).

### 4.5 `routeTitle` — the `<Place> loop` title (Nathan 2026-10-08 00:57)

(a) `app/src/store/defaultWay.ts` — insert immediately ABOVE the `/** WP-G: full name of a route as the rider knows it` doc comment (`:72`):

```ts
/** virgin-cycle26 brief 01 (Nathan 2026-10-08): the rider's name for a
 * start/end pair. A loop (same place at both ends) reads "<Place> loop",
 * never "<Place> → <Place>". Any further specification (the way's specs,
 * the picked variant) is appended by the CALLER with the ' · ' separator
 * the app already uses, so "Home loop · Dry" reads like "Home → Work · Dry".
 * `loop` is decided by the caller from landmark IDS — two places may share
 * a label — never from the labels. Non-loop output is byte-identical to the
 * `${start} → ${end}` template this replaces. */
export function routeTitle(startLabel: string, endLabel: string, loop: boolean): string {
  return loop ? `${startLabel} loop` : `${startLabel} → ${endLabel}`;
}

```

and line 81 → `  const base = w ? routeTitle(lab(w.startLandmarkId), lab(w.endLandmarkId), w.startLandmarkId === w.endLandmarkId) : id;`. Line 82 (the ` · ` specs suffix) is NOT touched. In `wayLabelIn`'s own doc comment (`:72-75`) insert one line before its closing ` */`: ` * A loop route reads "Home loop · Dry" (routeTitle, virgin-cycle26).`

(b) `app/src/store/routeFromRide.ts` — after line 21 (`import { seedGateChainages } from './gateSeeding.ts';`) insert `import { routeTitle } from './defaultWay.ts';`. Line 196 (now 197) → `    label: routeTitle(lab(w.startLandmarkId), lab(w.endLandmarkId), w.startLandmarkId === w.endLandmarkId),`.

(c) `app/src/ui/catalogDetailModel.ts` — line 13 → `import { routeTitle, wayLabelIn, wayVariantLabel, sortWaysForDisplay } from '../store/defaultWay.ts';`; the body of `routeLabel` (`:62`) → `  return routeTitle(landmarkLabel(c, w.startLandmarkId), landmarkLabel(c, w.endLandmarkId), w.startLandmarkId === w.endLandmarkId);`.

(d) `app/src/ui/catalogMapModel.ts` — line 19 → `import { routeTitle, wayVariantLabel } from '../store/defaultWay.ts';`; the body of `routeLabel` (`:43`) → `  return routeTitle(landmarkLabel(c, r.startLandmarkId), landmarkLabel(c, r.endLandmarkId), r.startLandmarkId === r.endLandmarkId);`.

(e) `app/src/ui/RidesScreen.tsx` — line 19 → `import { routeTitle, wayLabelIn } from '../store/defaultWay';`; line 141 → `                updates.set(m.rideId, routeTitle(pick.fromLabel, pick.toLabel, !!pick.from && pick.from === pick.to));`.

(f) `app/src/ui/RideDetailScreen.tsx` — line 47 → `import { routeTitle, wayLabelIn } from '../store/defaultWay.ts';`; line 226 → `          setPickLabel(pick && pick.fromLabel && pick.toLabel ? routeTitle(pick.fromLabel, pick.toLabel, !!pick.from && pick.from === pick.to) : null);`.

Each replacement is one occurrence (python read-modify-write on the exact quoted text; 0 or 2+ → STOP). Nothing else in these six files changes. After (a)-(f): `grep -rn "} → \${" app/src --include=*.ts --include=*.tsx` must list ONLY `store/catalogMerge.ts:105` (merge diagnostic), `ui/catalogDeleteActions.ts` ×3 (delete dialogs, allow-listed templates — plan §8 hands them over), `ui/demoModel.ts:188` and `:329` (fixed demo names, never a loop) and `store/defaultWay.ts` (inside `routeTitle` itself). Any other hit → STOP and report it.

## 5. Expected BEFORE / AFTER

| test | before | after |
|---|---|---|
| resolveGoingTo | cannot import (`resolveGoingTo` not exported) — do the BEFORE check by running the suite once with only §4.3 applied and recording the import failure line | PASS |
| routeForEndpoints | same import failure | PASS |
| RecordScreen source pin | would FAIL at `resolveGoingTo(` (absent) | PASS |
| `ui_strings` suite | PASS (nothing new yet) | FAIL after §4.2(e) until §4.4 is applied ("UNLISTED … RecordScreen.tsx|text|loop") → PASS after §4.4 — record both outputs; §4.5 must add NO new report |
| wayspec routeTitle | cannot import (`routeTitle` not exported) | PASS |
| catalogdetail loop title | FAILS at `loopW.label === 'Park Loop loop'` (today `Park Loop → Park Loop`) — run it BEFORE §4.5(c) and record the message | PASS |
| `tests/catalogmap_suite.ts:126,142`, `tests/wayspec_suite.ts:165-167`, `tests/migrations_suite.ts:414`, `tests/ridehistory_suite.ts` | PASS | PASS unedited (non-loop output byte-identical) |

## 6. Steps

1. `GIT_OPTIONAL_LOCKS=0 git status --short`; baseline `cd app && node --experimental-strip-types tests/run.ts | tail -1` (expect `918 tests: 915 pass, 0 fail, 3 skip` or the count brief 02 left if it ran first).
2. §4.3 (`recordflow_suite` part) alone → run → record the import-failure line (BEFORE evidence). Then §4.1.
3. §4.2(a)-(e) with python read-modify-write on the exact quoted text (one occurrence each; 0 or 2+ → STOP). Run the suite → the ONLY new failure must be the `ui_strings` UNLISTED `loop`; record it verbatim.
4. §4.4 → run → zero FAIL, count = baseline + 3.
4b. §4.3's `catalogdetail_suite` test alone → run → record its FAIL message (BEFORE evidence: `Park Loop → Park Loop`). Then §4.5(a)-(f), then §4.3's `wayspec_suite` import + test → run → zero FAIL, count = baseline + 5; `ui_strings` still reports nothing.
5. `cd app && ./node_modules/.bin/tsc --noEmit` (timeout_ms 180000, tee `cycles/virgin-cycle26/06-brief-01-tsc.log`) → exit 0.
6. `GIT_OPTIONAL_LOCKS=0 git diff --stat` → exactly the twelve files of §3 (plus whatever brief 02 left, attributed); `git diff -- app/tests/ui-strings.allow.json` → exactly one added entry (quote it); run the §4.5 closing `grep` and paste its output.
7. Report → `cycles/virgin-cycle26/06-brief-01-executor-report.md`: files, counts, BEFORE/AFTER evidence, tsc, the allow-list diff quoted, deviations verbatim.

## 7. Acceptance

- Suite zero FAIL, +5; tsc exit 0.
- `grep -c "filter((l) => l.id !== fromId)" app/src/ui/RecordScreen.tsx` → 1 (unchanged).
- `grep -n "LOOP_ID" app/src/ui/RecordScreen.tsx` → exactly 2 lines: the import, and the pill's `key={LOOP_ID} onPress={() => setTo(LOOP_ID)}` line.
- `grep -n "landmarkLabel(to)" app/src/ui/RecordScreen.tsx` → none; `grep -c "landmarkLabel(toId)"` → 2; `grep -c "routeTitle("` → 1 (the armed title); `grep -c routeTitle` → 2 (import + title).
- `git diff -- app/src/ui/RecordScreen.tsx` has exactly six hunks (recordFlow import, defaultWay import, toId + lookup, start context, armed title, pill); `recordFlow.ts` still has no `import`.
- `grep -rn "routeTitle(" app/src` → the definition in `defaultWay.ts` + exactly seven call sites (`defaultWay.ts` `wayLabelIn`, `routeFromRide.ts`, `catalogDetailModel.ts`, `catalogMapModel.ts`, `RecordScreen.tsx`, `RidesScreen.tsx`, `RideDetailScreen.tsx`); the §4.5 closing `grep` for `} → ${` lists only the six named leftovers.
- `git diff -- app/src/store/defaultWay.ts` = inserted `routeTitle` block + one comment line + line 81; `git diff -- app/src/store/routeFromRide.ts` = one import line + line 196/197; the other four §4.5 files = one import line + one body line each.
- `git diff -- app/tests/ui-strings.allow.json` = the one entry of §4.4. No Alert, no flashSub, no sub-label.

## 8. Non-goals

- No union of ways across several loop Routes on one place (plan §4). No change to `pickFrom`, `defaultEndpoints`, `afterSportSwitch`, `effectiveFromId`, `location/index.ts`, `routeCreation.ts`, `routeNamingCard.tsx`.
- The title change is `routeTitle` and its seven call sites ONLY: no change to `catalogDeleteActions.ts` (its three dialogs keep `{from} → {to}` because their allow-list templates would change — plan §8), `catalogMerge.ts:105`, `demoModel.ts`, `CatalogDetailScreen.tsx:336` (`loop · {discriminator}` sub-line, already allow-listed), `routeNamingCard.tsx`, `rideHistoryModel.ts`, `feedModel.ts`. No loop glyph, no new word beyond `loop`. No engine, seeding or map change (briefs 02-04).

## 9. For the Inspect pass

Rerun §6-7. Confirm `routeTitle(a, b, false)` is byte-identical to the removed templates (the pre-existing `wayspec_suite`, `catalogmap_suite`, `migrations_suite:414` assertions pass unedited); confirm every `loop` argument is derived from landmark ids (`startLandmarkId === endLandmarkId`, or `!!pick.from && pick.from === pick.to`), never from labels; confirm the `ui_strings` suite reports nothing for §4.5 and that no allow-list entry was added for the title word. Confirm `routeForEndpoints`'s predicate equals the removed inline `find` for non-loop pairs; confirm `resolveGoingTo` never returns `LOOP_ID` as `toId`; confirm every consumer of the destination (`route`, `startContextRef`, armed title) reads `toId` and that `ridePickRef` (`:725-727`) therefore receives a landmark id or null, never `'~loop'`; confirm the source-pin test fails if the pill or the resolver is removed. Quote the one allow-list entry.
