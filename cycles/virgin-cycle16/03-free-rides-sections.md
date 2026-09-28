# 03 — A FREE RIDES section on RIDES and on RESULTS

**Source: Nathan, 2026-09-28.** His words: "… having the option to save as free ride instead
of a saved known or new route; so it can appear in the RIDES tab, and in the RESULTS tab,
in the free ride section."

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-28 by the Plan
tier (Fable) from two Haiku digests plus anchor checks against the working tree (branch
`virgin`, HEAD `2c21265`). Executor: Sonnet, cold, this file only. Brief 03 of
`virgin-cycle16`. **Order: after briefs 01 and 02** (02 defines the v3 record —
`rideId`, `startedAtMs`, `durationS`, `sportId` — that both sections read). Independent of
brief 04. Shares `app/src/ui/rideHistoryModel.ts` with brief 02 (02 edits lines 140-149;
this brief adds one export near the top and changes one literal on line ~145 — match on
**quoted text**, not line numbers).

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-28 (before
  brief 02 ran; where 02 changes a line this brief says so). If a quoted line is not where
  the brief says, or a name/signature differs, **stop and report the mismatch verbatim**
  (file, line, what you expected, what you found). Never guess, never patch around it.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `_to_delete/` is the bin (`mv`, never `rm`), and
  **never call `device_request_delete_permission`**, for any reason.
- No new dependency. No change to `app/src/store/*` (the structural-isolation rule:
  `resultsStore.ts`/`results.ts`/`colourModel.ts`/`lastRide.ts` never import
  `freeRides.ts`; this brief imports it from **screens only**, which the rule allows),
  `app/src/ui/resultsListModel.ts`, `app/src/ui/resultsWayList.tsx`,
  `app/src/ui/RideDetailScreen.tsx` (02's), `app/src/ui/RecordScreen.tsx` (01's).
- Do not edit `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`, any other `NN-*.md` brief
  here, or anything under `cycles/virgin-cycle15/` (brief 13 there is the RESULTS overhaul
  this builds on — history).
- Precondition: `grep -n "durationS\|sportId" app/src/store/freeRides.ts` → hits (brief 02
  landed); `grep -n "rememberFreeRide" app/src` → no hits. Otherwise stop and report.

## Goal

**RIDES:** free rides leave the chronological list and sit in their own **FREE RIDES**
section below it, same row look (title, date · duration, chevron → the ride's detail).
The section exists only when there is at least one free ride for the active sport.

**RESULTS:** below the route cards (or below "NO RESULTS YET …" when there are none) a
**FREE RIDES** block: a header and one row per free ride of the active sport, newest first,
showing the date and the duration, tappable to the ride's detail. Free rides never enter a
route card, a way list or a ranking — they are a separate population by construction
(`resultsStore.ts:476` `if (result.wayId === null) continue;` and the isolation rule stay
exactly as they are).

## Current state (verified 2026-09-28 against the tree)

### `app/src/ui/rideHistoryModel.ts`

- Lines 60-72: `export interface RideRowModel { rideId; startMs; dateLabel; wayId; wayName;
  lapS; lapLabel; quality; rank }`.
- Line 52: `export function dateTimeLabel(ms: number): string {`.
- Lines 139-152 (after brief 02): the free-row branch returns `wayName: 'Free ride'` (the
  literal `'Free ride'` on the `wayName:` line) and `lapLabel: fmt(Math.max(0, (m.endMs -
  m.startMs) / 1000))`.
- Tests `app/tests/ridehistory_suite.ts` 211 / 223 / 235 / 241 assert on
  `rows[0].wayName === 'Free ride'` — the literal must not change.

### `app/src/ui/RidesScreen.tsx`

- Line 10: `import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';`
  (`FlatList` is used once, line 194.)
- Line 15: `import { freeRideNear, freeRideResults } from '../store/freeRides';`
- Line 22: `import { buildRideRows } from './rideHistoryModel';`
- Lines 43-58: `refresh` — `listRides()` filtered to the active sport via
  `effectiveRideSportId(r.sportId, f) === active`, newest first, into `rides`.
- Lines 162-174: `const rows = useMemo(() => buildRideRows(rides ?? [], …, (startMs) =>
  freeRideNear(freeRideResults(), startMs)), [rides, resultsTick, pickLabels]);`
- Line 175: `const sportLabel = …`.
- **The list, lines 189-220:**

  ```tsx
        {rides == null ? (
          <Text style={styles.sub}>Loading…</Text>
        ) : rides.length === 0 ? (
          <Text style={styles.sub}>No rides yet. Record one on the Record tab.</Text>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(r) => r.rideId}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Pressable
                  style={styles.rowHead}
                  onPress={() => tabNav.openRide({ rideId: item.rideId, source: 'rides', startedAtMs: item.startMs })}
                >
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle}>{item.wayName ?? 'no way — recorded only'}</Text>
                    <Text style={styles.sub}>
                      {item.dateLabel} · {item.lapLabel}
                      {item.quality ? ` · ${item.quality}` : ''}
                    </Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.rank}>
                      {item.rank ? `P${item.rank.pos}/${item.rank.of}` : '–'}
                    </Text>
                    <Text style={styles.chev}>›</Text>
                  </View>
                </Pressable>
              </View>
            )}
          />
        )}
      </View>
    );
  }
  ```

- Styles (`makeStyles`, from 224): `container` (`flex: 1, padding: 16, gap: 14`), `sub`
  (`color: t.text2, fontSize: 14, …`), `row`, `rowHead`, `rowInfo`, `rowTitle`, `rowRight`,
  `rank`, `chev` (273), sheet closes at 274.
- `App.tsx:223-229`: the ride-detail overlay REPLACES the tab screen, so RIDES remounts
  (and `refresh`es) whenever the overlay closes — a ride saved as free on the overlay is in
  the section the moment Nathan comes back. No extra plumbing.

### `app/src/ui/ResultsScreen.tsx` (143 lines)

- Line 21: `import { useEffect, useMemo, useState } from 'react';`
- Line 22: `import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';`
- Line 23: `import { activeCatalog, activeSportId, currentSports } from '../store/sportStore';`
- Line 25: `import { allTimeBestLapS } from './colourModel';`
- Line 28: `import { useTabNav } from './tabNav';`
- Lines 40-43: `const [tick, setTick] = useState(0); useEffect(() => { setTick((v) => v + 1); }, []);`
- Lines 45-47: `const CATALOG = activeCatalog(); const sportId = activeSportId(); const sportLabel = …`
- Lines 49-53: `const routes: ResultsRoute[] = useMemo(() => buildResultsRoutes(…), [CATALOG, tick]);`
- Lines 64-72: the `openRoute !== null` early return (`<ResultsWayList …/>`).
- **The list, lines 78-114:**

  ```tsx
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <Text style={styles.title}>Results</Text>
        {/* Q5/WP-1: bare sport-name badge, same convention as ROUTES/RIDES. */}
        <Text style={styles.sub}>
          {sportLabel !== null ? sportLabel.toUpperCase() : 'NO SPORT YET — ADD ONE IN SETTINGS'}
        </Text>
        {routes.length === 0 ? (
          // decision 8: no ridden route at all.
          <Text style={styles.empty}>NO RESULTS YET — RIDE A ROUTE FIRST</Text>
        ) : (
          <View>
            {routes.map((route) => (
              <Pressable
                key={route.routeId}
                style={styles.card}
                onPress={…}
              >
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{route.label}</Text>
                    <Text style={styles.cardSub}>
                      {route.ways.length} way{…} · {route.rideCount} ride{…}
                    </Text>
                  </View>
                  <Text style={styles.chev}>›</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }
  ```

- Styles 117-142: `container` (`padding: 16, paddingBottom: 40, gap: 14`), `title`, `sub`,
  `empty` (`color: t.textDim, fontSize: 14`), `card`, `cardRow`, `cardTitle`, `cardSub`,
  `chev`. Sheet closes at 142.
- `tabNav.tsx:36`: `RideDetailRequest.source: 'post-stop' | 'rides' | 'routes' | 'results'`
  — `'results'` already exists (`RideDetailScreen.tsx:415` labels its primary button
  "BACK TO RESULTS" for it).
- `app/src/store/freeRides.ts` (after 02): `freeRideResults(): FreeRideRecord[]` oldest
  first; record `{ rideId, startedAtMs, durationS: number | null, sportId: string | null }`;
  migrated records have `rideId` starting with `free:` and both nullables `null`.
- `colourModel.ts:195`: `export function fmt(s: number, decimals: 0 | 1 = 0): string` → `m:ss`.

## Decisions (pre-resolved — do not re-open)

1. **RIDES uses a `SectionList` with at most two sections**: the existing rows (no header)
   and `FREE RIDES` (header) — the free rows are removed from the main list, not
   duplicated. The row renderer is reused verbatim for both. An empty section is not
   rendered at all (no orphan header). `stickySectionHeadersEnabled={false}` so the header
   scrolls like content.
2. **A free row is identified by its `wayName` being the exported constant
   `FREE_RIDE_ROW_NAME` (`'Free ride'`)**, which `buildRideRows` already assigns exactly and
   only to free rows (a ride that founded a way wins as "<way> — ref" and is not free; a
   matched ride never consults `freeFor`). Adding a boolean to `RideRowModel` would be
   cleaner but touches every fixture that builds rows; the constant is the smaller change
   and the literal is pinned by four tests.
3. **RESULTS gets a FREE RIDES block rendered inline in the same ScrollView**, after the
   route cards / the empty text — not a synthetic route card (a free ride has no ways, no
   laps, nothing `ResultsWayList`/`ResultsDetailScreen` could show), not a tab. Rows use
   the existing `card`/`cardRow`/`cardTitle`/`cardSub`/`chev` register so it reads as one
   screen. When there are no free rides the block is absent.
4. **RESULTS rows are sport-scoped by the record's `sportId`**: shown when
   `record.sportId === sportId || record.sportId === null` (a migrated record, sport
   unknown, shows under every sport rather than vanishing; open question 1).
5. **A RESULTS row opens the ride detail** (`tabNav.openRide({ rideId, source: 'results',
   startedAtMs })`) **only when its `rideId` is a real ride id** — i.e. does not start with
   `free:` (the migrated-record shape). Migrated rows render without a chevron and without
   `onPress`.
6. **Row content:** RIDES — unchanged (`Free ride` / `<date> · <m:ss>`); RESULTS —
   title `dateTimeLabel(startedAtMs)`, sub `fmt(durationS)` or `'–'` when null, then
   `· free ride`. Newest first in both.
7. **No count badge, no totals, no "best" free ride** — a free ride is not compared to
   anything (D-013/D-025 spirit; Nathan's "not a saved known or new route"). Anything
   comparative belongs in a future brief with its own ruling.
8. **The RESULTS empty text stays** `NO RESULTS YET — RIDE A ROUTE FIRST` even when free
   rides exist below it — the routes block is empty; the free block says its own thing.

## Files to touch

### 1. `app/src/ui/rideHistoryModel.ts`

**Edit A.** Directly above `export interface RideRowModel {` (line 60) add:

```ts
/** The `wayName` buildRideRows gives a free ride, and the ONLY way a row is
 * free (virgin-cycle16 03): RidesScreen partitions its FREE RIDES section on
 * this exact literal. Four ridehistory_suite tests pin the text. */
export const FREE_RIDE_ROW_NAME = 'Free ride';
```

**Edit B.** In the free-row branch of `buildRideRows` change `wayName: 'Free ride',` to
`wayName: FREE_RIDE_ROW_NAME,`. Exactly one occurrence; if `grep -c "'Free ride'"` on the
file is not 1 before the edit (excluding comments), stop and report.

### 2. `app/src/ui/RidesScreen.tsx`

**Edit C — imports.** Line 10: `FlatList` → `SectionList`. Line 22:
`import { buildRideRows } from './rideHistoryModel';` →
`import { FREE_RIDE_ROW_NAME, buildRideRows, type RideRowModel } from './rideHistoryModel';`.

**Edit D — sections.** Directly after the `rows` `useMemo` (ends line 174, `[rides,
resultsTick, pickLabels],\n  );`) add:

```tsx
  // virgin-cycle16 03 (Nathan 2026-09-28): free rides sit in their own
  // FREE RIDES section under the list, not inline. A row is free iff
  // buildRideRows named it FREE_RIDE_ROW_NAME (decision 2). Empty sections
  // are not rendered, so a rider with no free rides sees the list as before.
  const sections = useMemo(() => {
    const main = rows.filter((r) => r.wayName !== FREE_RIDE_ROW_NAME);
    const free = rows.filter((r) => r.wayName === FREE_RIDE_ROW_NAME);
    const out: { title: string | null; data: RideRowModel[] }[] = [];
    if (main.length > 0) out.push({ title: null, data: main });
    if (free.length > 0) out.push({ title: 'FREE RIDES', data: free });
    return out;
  }, [rows]);
```

**Edit E — the list.** Replace `<FlatList\n          data={rows}\n          keyExtractor={(r) => r.rideId}`
with

```tsx
        <SectionList
          sections={sections}
          keyExtractor={(r) => r.rideId}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            section.title !== null ? <Text style={styles.sectionHead}>{section.title}</Text> : null
          )}
```

The `renderItem={({ item }) => ( … )}` body and the closing `/>` stay byte-for-byte.

**Edit F — style.** In `makeStyles`, after the `chev:` line (273) add:

```ts
  // virgin-cycle16 03: the FREE RIDES section header — same small-caps
  // register as the ride detail's ACTIONS / ON THIS WAY headings.
  sectionHead: { color: t.textDim, fontSize: 12, letterSpacing: 1.5, marginTop: 12, marginBottom: 6 },
```

### 3. `app/src/ui/ResultsScreen.tsx`

**Edit G — imports.**

- Line 25: `import { allTimeBestLapS } from './colourModel';` →
  `import { allTimeBestLapS, fmt } from './colourModel';`
- After line 26 (`import { buildResultsRoutes, … } from './resultsListModel';`) add:
  `import { freeRideResults, type FreeRideRecord } from '../store/freeRides';` and
  `import { dateTimeLabel } from './rideHistoryModel';`

**Edit H — the free list.** Directly after the `routes` `useMemo` (ends line 53) add:

```tsx
  // virgin-cycle16 03 (Nathan 2026-09-28): the FREE RIDES section — a
  // separate population, never a route card (decision 3). Sport-scoped by the
  // record's own sportId; a migrated record (sportId null) shows everywhere.
  // Newest first. `tick` re-reads the store after mount, same as `routes`.
  const freeRides: FreeRideRecord[] = useMemo(
    () => freeRideResults()
      .filter((r) => r.sportId === null || r.sportId === sportId)
      .sort((a, b) => b.startedAtMs - a.startedAtMs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sportId, tick],
  );
```

**Edit I — render.** In the JSX, directly after the `routes.length === 0 ? (…) : (…)`
ternary's closing `)}` (line 112) and before `</ScrollView>` (113), add:

```tsx
      {freeRides.length > 0 ? (
        <View>
          <Text style={styles.sectionHead}>FREE RIDES</Text>
          {freeRides.map((r) => {
            // decision 5: a migrated v1/v2 record keeps its `free:<ms>` id,
            // which is not a raw ride — no detail to open.
            const openable = !r.rideId.startsWith('free:');
            return (
              <Pressable
                key={r.rideId}
                style={styles.card}
                disabled={!openable}
                onPress={() => tabNav.openRide({ rideId: r.rideId, source: 'results', startedAtMs: r.startedAtMs })}
              >
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{dateTimeLabel(r.startedAtMs)}</Text>
                    <Text style={styles.cardSub}>{r.durationS !== null ? fmt(r.durationS) : '–'} · free ride</Text>
                  </View>
                  {openable ? <Text style={styles.chev}>›</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
```

**Edit J — style.** In `makeStyles`, after the `chev:` line (141) add:

```ts
  // virgin-cycle16 03: FREE RIDES header, same register as RidesScreen's.
  sectionHead: { color: t.textDim, fontSize: 12, letterSpacing: 1.5, marginTop: 4, marginBottom: 6 },
```

### 4. Tests

No existing test breaks (the `'Free ride'` literal is unchanged; screens are not
unit-tested). Add one test to `app/tests/ridehistory_suite.ts`, after test 241:

```ts
test('virgin-cycle16 03: FREE_RIDE_ROW_NAME is exactly the wayName buildRideRows gives a free ride', () => {
  const metas: RideMeta[] = [{ rideId: 'r1', startMs: 1000, endMs: 2000, nFixes: 10 }];
  const rows = buildRideRows(metas, () => null, () => [], undefined, () => null, () => null, () => makeFree(1000));
  assert(rows[0].wayName === FREE_RIDE_ROW_NAME, 'the section partition key must be the row name');
  assert(FREE_RIDE_ROW_NAME === 'Free ride', 'the literal is pinned — RidesScreen partitions on it');
});
```

and add `FREE_RIDE_ROW_NAME` to the suite's `rideHistoryModel.ts` import. (`makeFree` is
the suite's own fixture helper, updated by brief 02 to the v3 shape — if its signature is
not `makeFree(startedAtMs, durationS = null)`, stop and report.)

## Verification

From `app/`: `node --experimental-strip-types tests/run.ts` → zero FAIL;
`./node_modules/.bin/tsc --noEmit` → exit 0. Then:

- `grep -n "FlatList" app/src/ui/RidesScreen.tsx` → no hits; `grep -n "SectionList"` → the
  import and the element.
- `grep -n "FREE_RIDE_ROW_NAME" app/src/ui/rideHistoryModel.ts app/src/ui/RidesScreen.tsx app/tests/ridehistory_suite.ts`
  → definition + one use in the model; import + two filters in RidesScreen; the test.
- `grep -n "freeRideResults\|FREE RIDES\|source: 'results'" app/src/ui/ResultsScreen.tsx`
  → the import, the memo, the header, the `openRide`.
- `grep -rn "freeRides" app/src/store/resultsStore.ts app/src/store/results.ts app/src/ui/colourModel.ts app/src/ui/lastRide.ts app/src/ui/resultsListModel.ts`
  → **no hits** (isolation rule intact).

## On-device checklist (Nathan, after publish)

1. RIDES with no free rides: identical to before — one flat list, no header anywhere.
2. Save a ride as free (brief 02) → RECORD ANOTHER → RIDES: the ride is gone from the main
   list and sits under a **FREE RIDES** header at the bottom, row "Free ride · <date> ·
   <m:ss>". Tap → its detail, BACK TO RIDES returns.
3. "Not a free ride" on its detail → RIDES: it is back in the main list as "Home → new".
4. RESULTS with a free ride and no route results: "NO RESULTS YET — RIDE A ROUTE FIRST",
   then **FREE RIDES**, one card "<date> / <m:ss> · free ride" with a chevron. Tap → the
   detail, primary button reads BACK TO RESULTS.
5. RESULTS with route cards too: route cards first, FREE RIDES block last.
6. Switch sport in SETTINGS: a free ride saved under the other sport is not listed in
   RESULTS (and not in RIDES, which was already sport-scoped by `RideMeta`).
7. A free ride from before brief 02 (migrated, if any): listed in RESULTS under every
   sport, no chevron, not tappable; in RIDES under FREE RIDES, tappable as before.
8. Delete a free ride from its detail → RIDES/RESULTS: gone from the section (brief 02's
   `onDelete` also drops the free record).

## Out of scope

- Any comparison, ranking, "best free ride", totals (decision 7).
- Distance on rows (brief 02 open question 2).
- Purging free records whose ride was deleted — brief 02 Edit M does it on delete.
- Brief 04's machinery removal.
- `STATE.md`, `OPEN-ITEMS.md`, this folder's `README.md` — the coordinator's.

## What this changes on Nathan's phone

Nothing yet — this is a parked brief. Once executed: JS-only, ships over EAS Update via
`scripts/publish-preview.cmd`. Visible: RIDES groups free rides under a FREE RIDES header at
the bottom; RESULTS gains a FREE RIDES block under the route cards, each row opening the
ride. Nothing changes for a rider with no free rides.

## Open questions / assumptions (logged, not blocking)

1. **Migrated records show under every sport in RESULTS** (sportId null). The alternative
   — hide them — loses rides silently. Nathan's phone is on a virgin seed; this is at most
   a few rows, and "Not a free ride" on their detail (reachable from RIDES) removes them.
2. **Free records orphaned by a delete before brief 02 landed** (none expected — the
   only deletes so far were of route rides) would list in RESULTS un-openable; "Not a
   free ride" cannot reach them (no detail). A `_to_delete`-style purge on init is a
   chore if it ever shows up.
3. **Section header for the main list** ("ROUTE RIDES"?) — left headerless: the main list
   is the tab's content; the free section is the exception.
