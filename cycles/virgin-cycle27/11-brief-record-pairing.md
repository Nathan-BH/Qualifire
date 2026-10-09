# Brief 1 — RECORD picker: GOING TO follows STARTING FROM (most-ridden destination from that start)

Written by the Plan tier (Fable) 2026-10-08 ~01:45 UTC from `10-plan.md` §1 and digest 01; every anchor below was re-read in the working tree at that time (cycle26 brief 01 landed, uncommitted; suite baseline `940 tests: 937 pass, 0 fail, 3 skip`). Executor: Sonnet, alone. Read `EXECUTOR-RULES.md` first, then all of this. **Status: APPROVED (Nathan 2026-10-09 00:24) — read the AMENDMENT at the end of this file first; it replaces §0's BLOCKED block. Runs 6th, sequential (`10-plan.md` §15).**

## 0. Rules

- **STOP-ON-AMBIGUITY.** Anchor not where quoted (±15 lines, no other plausible match), a test behaving differently from §5, any unsettled call → STOP, write what you found verbatim into `cycles/virgin-cycle27/12-brief-01-executor-report.md` under `## STOPPED`, return.
- ~~BLOCKED UNTIL NATHAN RULES~~ **RULED 2026-10-08 (ruling 1.2) — see the AMENDMENT section A0 at the end; the items below are kept for the record:**
  - Q1.2 — does GOING TO follow an auto-DETECTED start change too? (a) yes, until the rider taps GOING TO [recommended; this brief is written for (a)]; (b) only on an explicit START tap (then §3.3's effect keys on `fromExplicit && from`, not on `fromId` — STOP and ask for the amended lines rather than improvising).
  - Non-blocking, recorded: Q1.1 count-then-recency (a); Q1.3 no history ⇒ unchanged (a).
- **Rider-facing text: ZERO new strings.** `git diff -- app/tests/ui-strings.allow.json` must be empty at the end. If the `ui_strings` suite reports anything, STOP.
- No warnings, no hints, no sub-labels (standing rule). Nothing persisted: the suggestion is derived at render time from stored results, like the pill order already is.
- Never delete; no commit; no publish; no dependency; no edits outside §3; `GIT_OPTIONAL_LOCKS=0`; strip-only TypeScript (no `enum`, no parameter properties).

## 1. Purpose (Nathan 2026-10-08, plan §1)

> if i pick starting from Home, it should auto-highlight my most popular destination from home which is work … with of course still the option to change it, but just that it auto-picks correctly already.

Today (`RecordScreen.tsx:284`) a START tap sets `from` only; `to` keeps whatever it was (mount default = second landmark in catalog order, or the last ride's destination). After this brief, whenever the effective START changes, `to` becomes the destination the rider has ridden to most often from that start (ties → most recently ridden → catalog order; a loop route selects the `loop` pill); no history from that start ⇒ `to` untouched. The rider's own GOING TO tap wins until the ride ends or the sport switches.

## 2. Verified anchors (working tree 2026-10-08 ~01:40 UTC)

- `app/src/store/landmarkUsage.ts` — whole file is 29 lines: imports (`:1-2`), `landmarkUsageCounts` (`:8-22`), `sortLandmarksByUsage` (`:26-29`). `storedResultsForWay(wayId)` (`resultsStore.ts:224-226`) returns `RideResult[]` ascending `startedAtMs`.
- `app/src/ui/RecordScreen.tsx`:
  - `:87` `import { defaultEndpoints, routeTitle, wayLabelIn, wayVariantLabel, sortWaysForDisplay } from '../store/defaultWay';`
  - `:88` `import { landmarkUsageCounts, sortLandmarksByUsage } from '../store/landmarkUsage';`
  - `:278-279` `const [from, setFrom] = useState(() => defaultEndpoints(activeCatalog()).from ?? NEW_ID);` / `const [to, setTo] = useState(() => defaultEndpoints(activeCatalog()).to ?? NEW_ID);`
  - `:283-284` `const [fromExplicit, setFromExplicit] = useState(false);` / `const pickFrom = (id: string) => { setFrom(id); setFromExplicit(true); };`
  - `:291-300` `pickSport` — contains `setFrom(reset.from ?? NEW_ID);` / `setFromExplicit(false);` / `setTo(reset.to ?? NEW_ID);` / `setWayPick(reset.wayPick);`
  - `:810` `setFromExplicit(false);` inside the ride-end block (comment `:811-822` mentions "D4"); `:1046` the same call in the discard path.
  - `:1135-1138` `startableUnsorted` / `startable` (usage-sorted in setup).
  - `:1151` `const fromId = effectiveFromId({ startMode: settings.startMode, detectedId: detected?.id ?? null, from, fromExplicit });`
  - `:1155` `const { toId, loop: loopOn } = resolveGoingTo(to, fromId, NEW_ID);`
  - `:1599-1620` the GOING TO row: `<Text style={styles.flowLabel}>GOING TO</Text>`, place pills `onPress={() => setTo(l.id)}` (`:1602`), loop pill `onPress={() => setTo(LOOP_ID)}` (`:1610`), new pill `onPress={() => setTo(NEW_ID)}` (`:1616`).
  - `LOOP_ID = '~loop'` and `NEW_ID = '~new'` (`recordFlow.ts:150`, `RecordScreen.tsx:133`).
- `app/tests/landmarkusage_suite.ts` — `:28` `const { landmarkUsageCounts, sortLandmarksByUsage } = await import('../src/store/landmarkUsage.ts');`; helpers `route(...)` `:32-34`, `landmark(...)` `:36-47`; last test ends at `:86`.
- `app/tests/recordflow_suite.ts` — source-pin style, e.g. `:341-347` (`five tabs`). Append new pins at the end of the file.

## 3. Edits

### 3.1 `src/store/landmarkUsage.ts` — append two pure functions (after `sortLandmarksByUsage`)

```ts
/** virgin-cycle27 brief 01 (Nathan 2026-10-08): per-DESTINATION usage from one
 *  start, derived on demand — ride → wayId → route → route.endLandmarkId. A
 *  loop route (start === end) counts under the start id itself. `countForWay`
 *  returns the ride count and the latest start time of a way's stored results
 *  (resultsStore.storedResultsForWay by default). Nothing is persisted. */
export interface DestinationUsage { count: number; lastMs: number }
export function destinationUsageFrom(
  c: Pick<Catalog, 'routes'>,
  fromId: string,
  statsForWay: (wayId: string) => DestinationUsage = (id) => {
    const rs = storedResultsForWay(id);
    return { count: rs.length, lastMs: rs.length ? rs[rs.length - 1].startedAtMs : 0 };
  },
): Map<string, DestinationUsage> {
  const out = new Map<string, DestinationUsage>();
  for (const r of c.routes) {
    if (r.startLandmarkId !== fromId) continue;
    let count = 0, lastMs = 0;
    for (const w of r.wayIds) {
      const s = statsForWay(w);
      count += s.count;
      if (s.lastMs > lastMs) lastMs = s.lastMs;
    }
    if (count === 0) continue;
    const prev = out.get(r.endLandmarkId) ?? { count: 0, lastMs: 0 };
    out.set(r.endLandmarkId, { count: prev.count + count, lastMs: Math.max(prev.lastMs, lastMs) });
  }
  return out;
}

/** The destination to pre-select for `fromId`: most rides first, then the most
 *  recently ridden, then catalog order (`landmarks` is the catalog's own order).
 *  Returns the landmark id — equal to `fromId` for a loop — or null when the
 *  rider has never ridden from this start (the caller then changes nothing). */
export function suggestedDestination(
  c: Pick<Catalog, 'routes' | 'landmarks'>,
  fromId: string,
  statsForWay?: (wayId: string) => DestinationUsage,
): string | null {
  const usage = destinationUsageFrom(c, fromId, statsForWay);
  let best: string | null = null;
  let bestStat: DestinationUsage = { count: 0, lastMs: 0 };
  for (const l of c.landmarks) {
    const s = usage.get(l.id);
    if (!s) continue;
    if (s.count > bestStat.count || (s.count === bestStat.count && s.lastMs > bestStat.lastMs)) {
      best = l.id;
      bestStat = s;
    }
  }
  return best;
}
```

Keep `landmarkUsageCounts` and `sortLandmarksByUsage` byte-identical. `Catalog` and `Landmark` are already imported from `./types.ts` (`:1`); `storedResultsForWay` from `./resultsStore.ts` (`:2`).

### 3.2 `src/ui/RecordScreen.tsx` — import

Replace `:88` with:
```ts
import { landmarkUsageCounts, sortLandmarksByUsage, suggestedDestination } from '../store/landmarkUsage';
```

### 3.3 `src/ui/RecordScreen.tsx` — the follow rule (one state flag + one effect)

Directly after `:284` (`const pickFrom = …`) add:
```ts
  // virgin-cycle27 brief 01 (Nathan 2026-10-08): GOING TO follows the START
  // place — the destination most ridden from it (store/landmarkUsage.ts
  // suggestedDestination) — until the rider taps GOING TO themselves this
  // setup; a ride end or a sport switch re-arms the follow. No history from
  // this start ⇒ `to` is left exactly as it was (never a guess).
  const [toExplicit, setToExplicit] = useState(false);
  const pickTo = (id: string) => { setTo(id); setToExplicit(true); };
```

Directly after `:1155` (`const { toId, loop: loopOn } = resolveGoingTo(to, fromId, NEW_ID);`) add:
```ts
  useEffect(() => {
    if (phase !== 'setup' || toExplicit || fromId === NEW_ID) return;
    const best = suggestedDestination(CATALOG, fromId);
    if (best === null) return;
    setTo(best === fromId ? LOOP_ID : best);
  }, [fromId, toExplicit, phase]);
```
(`phase` (`:185`) and `CATALOG` (`activeCatalog()`, `:269`) already exist in this scope. A sport switch changes `fromId` and resets `toExplicit`, so the effect re-runs without a tick dependency — the tick state at `:268` is deliberately unbound (`const [, setSportSwitchTick]`), do not bind it.) The effect lives below the hooks that already follow `:1155`; it must sit **before** any early `return` in the component — check there is none between `:1155` and the effect you add (there is not at plan time).

### 3.4 `src/ui/RecordScreen.tsx` — the GOING TO taps and the re-arm points

- `:1602` `onPress={() => setTo(l.id)}` → `onPress={() => pickTo(l.id)}`
- `:1610` `onPress={() => setTo(LOOP_ID)}` → `onPress={() => pickTo(LOOP_ID)}`
- `:1616` `onPress={() => setTo(NEW_ID)}` → `onPress={() => pickTo(NEW_ID)}`
- `:298` in `pickSport`: after `setTo(reset.to ?? NEW_ID);` add `setToExplicit(false);`
- `:810` ride end: after `setFromExplicit(false);` add `setToExplicit(false);`
- `:1046` discard: after `setFromExplicit(false);` add `setToExplicit(false);`
No other `setTo(` call changes (`:279` useState, `:298` sport switch stay).

### 3.5 Nothing else

Do not touch `defaultEndpoints`, `afterSportSwitch`, `effectiveFromId`, `resolveGoingTo`, the pill ORDER (`:1135-1138`), `defaultWayFor`, the `loop`/`new` pills' text, or any file outside §3.

## 4. Tests

### 4.1 `tests/landmarkusage_suite.ts` — extend the dynamic import at `:28`
```ts
const { landmarkUsageCounts, sortLandmarksByUsage, destinationUsageFrom, suggestedDestination } = await import('../src/store/landmarkUsage.ts');
```
Append after `:86`:

```ts
// ---------------------------------------------- virgin-cycle27 brief 01: GOING TO follows START

const stat = (table: Record<string, { count: number; lastMs: number }>) =>
  (wayId: string) => table[wayId] ?? { count: 0, lastMs: 0 };

test('virgin-cycle27 01: destinationUsageFrom counts rides per destination from ONE start, loop under the start id, other starts ignored', () => {
  const routes = [
    route('route:hw', 'H', 'W', ['w1', 'w2']),
    route('route:hz', 'H', 'Z', ['w3']),
    route('route:hh', 'H', 'H', ['w4']),
    route('route:wh', 'W', 'H', ['w5']),
  ];
  const u = destinationUsageFrom({ routes }, 'H', stat({ w1: { count: 3, lastMs: 10 }, w2: { count: 2, lastMs: 50 }, w3: { count: 4, lastMs: 20 }, w4: { count: 1, lastMs: 99 }, w5: { count: 9, lastMs: 999 } }));
  assert(u.get('W')?.count === 5 && u.get('W')?.lastMs === 50, `W: ${JSON.stringify(u.get('W'))}`);
  assert(u.get('Z')?.count === 4, 'Z counted');
  assert(u.get('H')?.count === 1, 'loop counted under the start id');
  assert(!u.has('X') && u.size === 3, 'nothing from other starts');
});

test('virgin-cycle27 01: suggestedDestination — most rides wins; ties go to the most recent; then catalog order; loop returns the start id', () => {
  const landmarks = [landmark('H'), landmark('W'), landmark('Z')];
  const routes = [route('route:hw', 'H', 'W', ['w1']), route('route:hz', 'H', 'Z', ['w2']), route('route:hh', 'H', 'H', ['w3'])];
  assert(suggestedDestination({ routes, landmarks }, 'H', stat({ w1: { count: 5, lastMs: 1 }, w2: { count: 2, lastMs: 9 } })) === 'W', 'count wins');
  assert(suggestedDestination({ routes, landmarks }, 'H', stat({ w1: { count: 2, lastMs: 1 }, w2: { count: 2, lastMs: 9 } })) === 'Z', 'tie → most recent');
  assert(suggestedDestination({ routes, landmarks }, 'H', stat({ w1: { count: 2, lastMs: 5 }, w2: { count: 2, lastMs: 5 } })) === 'W', 'full tie → catalog order');
  assert(suggestedDestination({ routes, landmarks }, 'H', stat({ w3: { count: 7, lastMs: 5 } })) === 'H', 'loop → the start id');
});

test('virgin-cycle27 01: suggestedDestination is null with no rides from this start (the picker then changes nothing)', () => {
  const landmarks = [landmark('H'), landmark('W')];
  const routes = [route('route:wh', 'W', 'H', ['w5'])];
  assert(suggestedDestination({ routes, landmarks }, 'H', stat({ w5: { count: 9, lastMs: 1 } })) === null, 'no history from H');
  assert(suggestedDestination({ routes: [], landmarks }, 'H', stat({})) === null, 'empty catalog');
});

test('virgin-cycle27 01: the default statsForWay reads the results store (count + latest startedAtMs) — smoke, empty store', () => {
  assert(destinationUsageFrom({ routes: [route('route:hw', 'H', 'W', ['w-none'])] }, 'H').size === 0, 'no stored results → no usage');
});
```

### 4.2 `tests/recordflow_suite.ts` — append one source pin at the end of the file

```ts
test('virgin-cycle27 01: GOING TO follows START — suggestedDestination effect, pickTo on every GOING TO pill, re-armed at ride end / discard / sport switch', () => {
  const src = fs.readFileSync(path.resolve(TESTS_DIR, '..', 'src', 'ui', 'RecordScreen.tsx'), 'utf8');
  assert(src.includes("import { landmarkUsageCounts, sortLandmarksByUsage, suggestedDestination } from '../store/landmarkUsage';"), 'import');
  assert(src.includes('const [toExplicit, setToExplicit] = useState(false);') && src.includes('const pickTo = (id: string) => { setTo(id); setToExplicit(true); };'), 'toExplicit + pickTo');
  assert(src.includes("if (phase !== 'setup' || toExplicit || fromId === NEW_ID) return;") && src.includes('const best = suggestedDestination(CATALOG, fromId);') && src.includes('setTo(best === fromId ? LOOP_ID : best);'), 'the follow effect');
  assert((src.match(/onPress=\{\(\) => pickTo\(/g) ?? []).length === 3, 'place, loop and new pills all go through pickTo');
  assert(!/onPress=\{\(\) => setTo\(/.test(src), 'no GOING TO pill bypasses pickTo');
  assert((src.match(/setToExplicit\(false\);/g) ?? []).length === 3, 're-armed at sport switch, ride end and discard');
});
```
(`fs`, `path`, `TESTS_DIR` are already imported/defined in that suite — verify at the top of the file before appending; if not, STOP.)

## 5. Acceptance

1. `cd app && node --experimental-strip-types tests/run.ts` → zero FAIL; expected **945 tests** (940 + 5); all four new `landmarkusage` tests and the `recordflow` pin PASS. Before your edits, confirm the two new landmarkusage tests about `suggestedDestination` would FAIL (import error) — i.e. the baseline is 940.
2. `cd app && ./node_modules/.bin/tsc --noEmit` → exit 0 (run with `timeout_ms: 180000`, tee to `cycles/virgin-cycle27/12-brief-01-tsc.log`).
3. `GIT_OPTIONAL_LOCKS=0 git diff --stat` shows exactly: `src/store/landmarkUsage.ts`, `src/ui/RecordScreen.tsx`, `tests/landmarkusage_suite.ts`, `tests/recordflow_suite.ts` (plus the pre-existing cycle26 hunks in `RecordScreen.tsx` — attribute yours by content in the report).
4. `git diff -- app/tests/ui-strings.allow.json` empty.
5. `grep -n "setTo(" src/ui/RecordScreen.tsx` → exactly the useState (`:279`), the sport switch, the effect's `setTo(best === fromId ? LOOP_ID : best)`, and `pickTo`'s own `setTo(id)`; nothing else.

## 6. What this changes on Nathan's phone (JS-only, OTA)

Opening RECORD: GOING TO is pre-selected on the destination he rides to most from the detected/first START place; tapping a different START re-selects that start's usual destination (or the `loop` pill); his own GOING TO tap sticks for this ride. A fresh install or a start never ridden from: exactly today's behaviour. Nothing on the armed/running/ending screens changes. Not a demo: nothing is visible until the OTA/preview build carries it.

## 7. Rollback

Revert the four files (`git checkout -- <file>` is NOT allowed on this mount — instead reverse the hunks by content: remove the two appended functions, restore `:88`, remove the `toExplicit` state/effect/`pickTo`, restore the three `setTo(` presses and remove the three `setToExplicit(false)` lines, remove the appended tests). No data migration, nothing persisted.

## 8. Report

`cycles/virgin-cycle27/12-brief-01-executor-report.md`: steps done; files touched (your hunks vs cycle26's); test counts before/after; tsc result; allow-list diff (must be empty); any STOP verbatim. Hand the coordinator this OPEN-ITEMS line: "RECORD GOING TO follows START (cycle27 brief 01) — on-device check: open RECORD with history; tap each START pill; tap a GOING TO pill then a START pill (must not re-follow); end a ride (follows again)."


---

# AMENDMENT (Fable, 2026-10-09 ~22:45 UTC) — ruling 1.2: the Settings "Start place" toggle and the pill checkmark are REMOVED; auto-detect / smart selection is always on. Status: APPROVED (Nathan 2026-10-09 00:24: execute all briefs).

This amendment is part of the brief; execute §§0-5 above AND this section in one run. Where the two conflict, THIS section wins. Anchors re-read 2026-10-09 ~22:30 UTC (baseline `956 tests: 953 pass, 0 fail, 3 skip`); see `12-last-location-and-auto-start-digest.md` §B for the full inventory.

## A0. Rulings now in force (replace §0's BLOCKED block — nothing in this brief is blocked any more)
- **Q1.2 = (a)** — GOING TO follows an auto-detected START too, until the rider taps GOING TO. Confirmed by ruling 1.2 (`15-rulings-after-plan.md`): "remove the auto start option toggle as well as the little checkmark of it in the pill, and just have our app be smart ... least friction by auto selecting correct pills (of course still always changeable by click)".
- Q1.1 = (a) count then recency; Q1.3 = (a) no history ⇒ unchanged (plan defaults, unanswered = accepted).
- **Fable rulings inside 1.2 (reasons given, not open):**
  1. `startMode` disappears entirely (type, default, Settings row, the whole "STARTING AN ACTIVITY" card since it held only that row, the reader in `effectiveFromId`). Old `settings.json` files get the key scrubbed on load like the retired keys before it.
  2. The ` ✓` glyph on the detected pill goes (Nathan's words). The highlighted pill is the cue.
  3. The STARTING FROM label: `DETECTED START` stays when the effective start IS the detected place (a positive cue, already there, Nathan did not ask to remove it); `STARTING FROM` otherwise. **`START NOT DETECTED` is retired** — it is a "no X" string, forbidden by the cycle's standing rule (EXECUTOR-RULES: no "no X" string anywhere). With the toggle gone, the `: 'STARTING FROM'` pick-mode branch is dead and goes too.
  4. The STATE.md / cycle20 brief 11 docs are history; not edited.

## A1. Extra anchors (verified 2026-10-09)
- `app/src/ui/settings.tsx:33` `  startMode: 'auto' | 'pick';` (inside `export interface Settings`, after the doc comment `:29-32`); `:63` `  startMode: 'auto',` (inside `DEFAULTS`); `:100-103` the four `delete (saved as Record<string, unknown>).<key>; // …` scrub lines; `:653-660`:
  ```tsx
        <Text style={[st.h2, { color: t.textDim }]}>STARTING AN ACTIVITY</Text>
        <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
          <Row label="Start place" help={help} t={t}>
            <Seg t={t} value={s.startMode}
              options={[['auto', 'detect'], ['pick', 'choose']]}
              onPick={(v) => set('startMode', v)} />
          </Row>
        </View>
  ```
  `Seg` stays used by the theme row (`:612`); `Row`/`help` stay used elsewhere.
- `app/src/ui/recordFlow.ts:63-71`:
  ```ts
  export function effectiveFromId(input: {
    startMode: 'auto' | 'pick';
    detectedId: string | null;
    from: string;
    fromExplicit: boolean;
  }): string {
    if (input.startMode !== 'auto' || input.fromExplicit) return input.from;
    return input.detectedId ?? input.from;
  }
  ```
  (its doc comment sits directly above; read it, append one line as in A2.)
- `app/src/ui/RecordScreen.tsx:1151` `  const fromId = effectiveFromId({ startMode: settings.startMode, detectedId: detected?.id ?? null, from, fromExplicit });`; `:1574-1582`:
  ```tsx
              <Text style={styles.flowLabel}>
                {settings.startMode === 'auto'
                  ? (fromId === detected?.id
                      ? 'DETECTED START'
                      : detected
                        ? 'STARTING FROM'
                        : 'START NOT DETECTED')
                  : 'STARTING FROM'}
              </Text>
  ```
  `:1588` `                      {l.label}{detected?.id === l.id ? ' ✓' : ''}`.
- `app/tests/recordflow_suite.ts:58-111` the six `effectiveFromId` tests (quoted in A3).
- `app/tests/ui-strings.allow.json:767-773` entry `src/ui/RecordScreen.tsx | literal | DETECTED START` (KEEP); `:807-813` `src/ui/RecordScreen.tsx | literal | START NOT DETECTED` (REMOVE); `:815-821` `… | STARTING FROM` (KEEP); `:3076-3082` `src/ui/settings.tsx | attr:label | Start place` (REMOVE). The Seg option words `detect` / `choose` have no entries (array literals, not scanned) — if the suite reports them, STOP.
- No other reader of `startMode` in `app/src` or `app/tests` (grepped 2026-10-09).

## A2. Extra edits (in addition to §3)
1. `settings.tsx`: delete line `:33` (`startMode: 'auto' | 'pick';`) and line `:63` (`startMode: 'auto',`). After the `:103` scrub line (`… .tower; // virgin-cycle20 08: Rankings row retired, always on`) add `        delete (saved as Record<string, unknown>).startMode; // virgin-cycle27 01 (Nathan 2026-10-08): Start place row retired — the start is always detected, pills stay tappable`. Delete the block `:653-660` (the `STARTING AN ACTIVITY` heading + its card) entirely. Nothing else in the file.
2. `recordFlow.ts:63-71` → 
```ts
export function effectiveFromId(input: {
  detectedId: string | null;
  from: string;
  fromExplicit: boolean;
}): string {
  if (input.fromExplicit) return input.from;
  return input.detectedId ?? input.from;
}
```
and append to its doc comment: ` * virgin-cycle27 01 (Nathan 2026-10-08 ruling 1.2): no 'pick' mode any more — detection is always consulted until the rider taps a START pill.`
3. `RecordScreen.tsx:1151` → `  const fromId = effectiveFromId({ detectedId: detected?.id ?? null, from, fromExplicit });`
4. `RecordScreen.tsx:1574-1582` → 
```tsx
              <Text style={styles.flowLabel}>
                {fromId === detected?.id ? 'DETECTED START' : 'STARTING FROM'}
              </Text>
```
(when nothing is detected, `detected?.id` is `undefined` and `fromId` is a string ⇒ `STARTING FROM`.) Add the comment line above the `<Text`: `{/* virgin-cycle27 01: always-on detection; no "not detected" wording (nothing negative), no pill checkmark */}`.
5. `RecordScreen.tsx:1588` → `                      {l.label}`.
6. §3.3's effect is unchanged by this amendment (`fromId` already carries the detected start).

## A3. Extra tests
- `tests/recordflow_suite.ts:58-66` the test `'effectiveFromId: pick mode always ignores detection, tapped or not'` → rewrite as:
```ts
test('virgin-cycle27 01 (ruling 1.2): effectiveFromId has no startMode — detection always counts until a tap', () => {
  assert(effectiveFromId({ detectedId: 'work', from: 'home', fromExplicit: false }) === 'work', 'untapped: the detected place wins');
  assert(effectiveFromId({ detectedId: 'work', from: 'home', fromExplicit: true }) === 'home', 'tapped: the tap wins');
  const src = fs.readFileSync(path.resolve(TESTS_DIR, '..', 'src', 'ui', 'recordFlow.ts'), 'utf8');
  assert(!src.includes('startMode'), 'recordFlow.ts no longer knows startMode');
  for (const f of ['src/ui/settings.tsx', 'src/ui/RecordScreen.tsx']) {
    const s = fs.readFileSync(path.resolve(TESTS_DIR, '..', f), 'utf8').replace(/^.*\.startMode;.*$/m, ''); // the one load-scrub line is allowed
    assert(!s.includes('startMode'), `${f}: startMode gone (the load scrub excepted)`);
  }
  const rs = fs.readFileSync(path.resolve(TESTS_DIR, '..', 'src', 'ui', 'RecordScreen.tsx'), 'utf8');
  assert(!rs.includes("' ✓'") && !rs.includes('START NOT DETECTED') && !rs.includes('Start place'), 'no checkmark, no negative label');
  assert(rs.includes("{fromId === detected?.id ? 'DETECTED START' : 'STARTING FROM'}"), 'two-state label');
});
```
(`fs`, `path`, `TESTS_DIR` exist in that suite — same check as §4.2.)
- `:68-111`: in every remaining `effectiveFromId({ … })` call and in the `tapped` object (`:88`), delete `startMode: 'auto', ` / `startMode: 'auto' as const, ` (tsc rejects the excess property in a fresh object literal). Behaviour asserts unchanged.

## A4. Visible text (REPLACES §0's "ZERO strings" line for this brief)
| file | kind | exact text | action | why |
|---|---|---|---|---|
| src/ui/settings.tsx | attr:label | `Start place` | REMOVE entry | row retired (ruling 1.2) |
| src/ui/RecordScreen.tsx | literal | `START NOT DETECTED` | REMOVE entry | "no X" wording retired; label is two-state |
`DETECTED START` and `STARTING FROM` entries stay. Python read-modify-write, re-sorted, as EXECUTOR-RULES says. Any OTHER STALE/UNLISTED → STOP. (`git diff -- app/tests/ui-strings.allow.json` therefore shows exactly two removed entries — EXECUTOR-RULES' "brief 1 adds ZERO" line predates this amendment; the inspector rules were updated 2026-10-09.)

## A5. Acceptance (replaces §5.1/§5.3/§5.4)
1. Suite: **+5 tests vs your recorded baseline** (four `landmarkusage` + one `recordflow` pin; the rewritten `effectiveFromId` test keeps the count), 0 FAIL.
3. `git diff --stat` (your hunks): `src/store/landmarkUsage.ts`, `src/ui/RecordScreen.tsx`, `src/ui/recordFlow.ts`, `src/ui/settings.tsx`, `tests/landmarkusage_suite.ts`, `tests/recordflow_suite.ts`, `tests/ui-strings.allow.json`.
4. Allow-list diff = exactly the two removed entries of A4, quoted in the report.
6. `grep -rn "startMode" src tests` → only the one scrub line in `settings.tsx`.

## A6. On Nathan's phone (adds to §6)
Settings loses the "STARTING AN ACTIVITY / Start place" card. RECORD: the START pill follows the detected place (as the old "detect" default did), no checkmark; the label reads `DETECTED START` when the highlighted pill is the detected one, `STARTING FROM` otherwise; GOING TO follows as §6 says. A rider who had set "choose" now gets detection too (the key is scrubbed).

## A7. Report
Also hand the coordinator: "STATE.md / GLOSSARY: the Settings 'Start place' row is gone (cycle27 brief 01, ruling 1.2); detection is always on."
