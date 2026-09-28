# 02 — "Save as free ride" after the ride (the free-ride record without gates)

**Source: Nathan, 2026-09-28.** His words: "the way free rides should work now, is never by
having gates scattered on a map (this idea needs complete removal) but instead after ride
completion having the option to save as free ride instead of a saved known or new route; so
it can appear in the RIDES tab, and in the RESULTS tab, in the free ride section."

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-28 by the Plan
tier (Fable) from two Haiku digests plus anchor checks against the working tree (branch
`virgin`, HEAD `2c21265`). Executor: Sonnet, cold, this file only. Brief 02 of
`virgin-cycle16`. **Order: after brief 01** (which stops RECORD calling `rememberFreeRide`;
this brief removes that function). **Before brief 03** (the RIDES/RESULTS sections read the
record shape this brief defines) and **independent of brief 04**. Shares
`app/src/ui/RideDetailScreen.tsx` with nobody else in this folder.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-28. If a quoted
  line is not where the brief says, or a name/signature differs, **stop and report the
  mismatch verbatim** (file, line, what you expected, what you found). Never guess, never
  patch around it, never rule on it yourself.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `_to_delete/` is the bin (`mv`, never `rm`), and
  **never call `device_request_delete_permission`**, for any reason.
- No new dependency. No change to `app/src/live/*`, `app/src/store/catalog.ts`,
  `app/src/store/resultsStore.ts`, `app/src/store/results.ts`, `app/src/ui/colourModel.ts`,
  `app/src/ui/lastRide.ts` (the structural-isolation rule in `freeRides.ts`'s header still
  holds: none of them may import the free-ride store), `app/src/ui/RidesScreen.tsx`,
  `app/src/ui/ResultsScreen.tsx` (brief 03's), `app/src/ui/RecordScreen.tsx` (brief 01's).
- Do not edit `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`, any other `NN-*.md` brief
  here, or anything under `cycles/virgin-cycle15/` / `cycles/virgin-cycle1/` (history).
- Precondition check before any edit: `grep -n "rememberFreeRide" app/src/ui/RecordScreen.tsx`
  → **no hits**. A hit means brief 01 has not landed — stop and report.

## Goal

A free ride is a **post-ride label on an ordinary recorded ride**, chosen by Nathan on the
ride-detail overlay (which opens right after STOP, and from RIDES later). Whenever a ride
matched no known way — the card that today reads "<from> → <to> / sector times not on file"
with the "Make this the reference of a new route" button — there is a second button,
**"Save as free ride"**. Tapping it records `{rideId, startedAtMs, durationS, sportId}` in the
free-ride store and the card becomes the FREE RIDE card (no gates, no sectors — those
concepts are gone). A free ride can be un-saved ("Not a free ride") which returns it to the
unnamed state, naming offer and all. The store's record no longer carries crossings or
sectors; old records on disk are migrated to the new shape (identity kept, gate data
dropped). RIDES rows for free rides show the ride's duration instead of a gate count.

## Current state (verified 2026-09-28 against the tree)

### `app/src/store/freeRides.ts` (219 lines, quoted in full to the executor's benefit)

- Lines 1-26: header comment (WP-B, structural isolation rule, persistence pattern).
- Line 27: `import type { LiveEngineState } from '../live/engine.ts';`
- Lines 31-41:

  ```ts
  export const FREE_RIDES_CACHE_FILE = 'free-rides-cache.json';
  const SCHEMA_VERSION = 2;

  export interface FreeRideRecord {
    kind: 'freeRide';
    schemaVersion: 2;
    rideId: string;
    startedAtMs: number;
    crossings: { wayId: string; gateIndex: number; t: number; estimated: boolean }[];
    sectors: { wayId: string; index: number; rawS: number }[];
  }
  ```

- Lines 53-66: `isValidCrossing`, `isValidFreeSector`.
- Lines 71-79: `isValidFreeRideRecord` — checks `kind`, `rideId`, `startedAtMs`, then
  `crossings`/`sectors` arrays.
- Lines 81-83: `encodeCache` → `JSON.stringify({ schemaVersion: SCHEMA_VERSION, rides: rs }, null, 1) + '\n'`.
- Lines 89-96: `decodeFreeRidesCache` → `upgradeFreeRidesCache(JSON.parse(text))` then
  `.filter(isValidFreeRideRecord)`.
- Lines 101-109: `enqueueWrite(fn)` — serialized, swallows fs errors.
- Lines 111-137: `rememberFreeRide(st: LiveEngineState, meta?)` — builds a record with
  `rideId: \`free:${startedAtMs}\``, appends to `rides`, `enqueueWrite`s `encodeCache(rides)`.
- Lines 144-146: `freeRideResults()` (oldest first). 151-154: `lastFreeRide()`.
- Lines 162-176: `FREE_RIDE_MATCH_TOL_MS = 10_000` and `freeRideNear(records, startedAtMs, tolMs)`
  — exact `startedAtMs` hit first, else nearest within tolerance, else null.
- Lines 182-199: `initFreeRidePersistence(fs)` — dedupes by `rideId`.
- Lines 203-205: `flushFreeRideWrites()`. 211-218: `resetFreeRides()` + `resetFreeRidesForTests` alias.

### `app/src/store/migrations.ts`

- Line 8 (header comment): `* kind routinely (saveUserCatalog, saveResult, rememberFreeRide). No new`
- Lines 91-116: `upgradeFreeRidesCache(raw)` — `sv === 2` → `raw.rides` as-is; `sv === 1 ||
  undefined` → each ride's `crossings`/`sectors` mapped through `renameKey(c, 'routeId',
  'wayId')`, `schemaVersion: 2`; anything else → `null`. Doc comment lines 91-95.
- `renameKey` and `isNonNullObject` exist in this file (used at 107, 110).

### `app/src/ui/rideDetailModel.ts`

- Line 9: `import type { FreeRideRecord } from '../store/freeRides.ts';`
- Line 17: `export type RideDetailKind = 'route' | 'free' | 'none';`
- Lines 43, 48: `free: FreeRideRecord | null;` (deps and model).
- Lines 103-111: `rideDetailFor` — `if (res === null || res.wayId === null) { const kind =
  d.free ? 'free' : 'none'; return { ...base, kind, wayId: null, … } }`. **Unchanged by
  this brief** — it only carries the record through.

### `app/src/ui/rideHistoryModel.ts`

- Line 23: `import type { FreeRideRecord } from '../store/freeRides.ts';`
- Line 25: `import { MIN_HISTORY, fmt, positionAmong, tierFor, type UiTier } from './colourModel.ts';`
  (`fmt(s, decimals)` formats seconds as `m:ss`.)
- Lines 130, 139-152 in `buildRideRows`:

  ```ts
    freeFor: (startMs: number) => FreeRideRecord | null = () => null,
    …
          const free = refWay === null ? freeFor(m.startMs) : null;
          if (free !== null) {
            const n = free.crossings.length;
            return {
              rideId: m.rideId,
              startMs: m.startMs,
              dateLabel,
              wayId: null,
              wayName: 'Free ride',
              lapS: null,
              lapLabel: `${n} gate${n === 1 ? '' : 's'}`,
              quality: null,
              rank: null,
            };
          }
  ```

- `RideMeta` (`app/src/storage/types.ts:65-74`) has `startMs`, `endMs`, `nFixes`,
  `sportId?` — no distance.

### `app/src/ui/RideDetailScreen.tsx`

- Line 48: `import { freeRideNear, freeRideResults } from '../store/freeRides.ts';`
- Lines 135-150: state — `tick`, `fixes`, `replaying`, `busy`, `exporting`, `meta`
  (`RideMeta | null`), `draft`, `naming`, `adjust`, `pickLabel`.
- Lines 192-203: `const model = useMemo(() => rideDetailFor(request.rideId,
  request.startedAtMs, { result: getStoredResult(request.rideId), free:
  freeRideNear(freeRideResults(), request.startedAtMs), … }), [request.rideId,
  request.startedAtMs, tick])` — **a `setTick` bump re-reads the free record.**
- Lines 263-267: `offer` / `offerRoute` / `offerLabel` (`'Make this the reference of a new
  route'` when no `existingRouteId`).
- Lines 284-286 (in `onNamingSave`): `setNaming(false); setDraft(null); setTick((v) => v + 1);`
  — the idiom to copy.
- **FREE RIDE card, lines 515-534:**

  ```tsx
        ) : model.kind === 'free' && model.free ? (
          <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder, alignItems: 'center' }]}>
            <Text style={{ color: t.textDim }}>FREE RIDE</Text>
            <Text style={{ color: t.textDim, fontSize: 12.5, marginTop: 4 }}>
              {model.free.crossings.length} gates crossed
            </Text>
            {model.free.sectors.length > 0 ? (
              <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
                {model.free.sectors.map((sec, i) => (
                  <Text key={i} style={[st.freeSectorRow, { color: t.text }]}>
                    {wayLabelIn(currentCatalog(), sec.wayId)} S{sec.index} — {fmt(sec.rawS, 1)} raw
                  </Text>
                ))}
              </View>
            ) : null}
            <View style={{ alignSelf: 'stretch', marginTop: 10 }}>
              <WayMapView
  ```

  (the `WayMapView` block runs to 543: `variant="browse" wayId={null} … trail={fixes ?? undefined} />`, then `</View></View>`).
- **"no way" card, lines 543-556:** `) : (` … `<Text style={{ color: t.textDim }}>{pickLabel ??
  'no way — recorded only'}</Text>` / `<Text … >sector times not on file for this ride</Text>`
  / the same `WayMapView`.
- **ACTIONS, lines 565-607.** The `offer` button, lines 599-607:

  ```tsx
          {offer !== null && !naming && adjust === null ? (
            <Pressable
              style={[styles.deleteBtn, styles.promoteBtn, busy && styles.busy]}
              disabled={busy}
              onPress={() => setNaming(true)}
            >
              <Text style={styles.deleteText}>{offerLabel}</Text>
            </Pressable>
          ) : null}
        </View>
  ```

  Styles: `deleteBtn` (667), `promoteBtn: { marginTop: 8, alignSelf: 'flex-start' }` (674),
  `deleteText` (675), `busy` (grep).
- `App.tsx:223-229`: the ride detail **replaces** the tab screen (`rideDetail !== null ?
  <RideDetailScreen …> : tab === 'rides' ? <RidesScreen /> : …`), so RIDES/RESULTS remount
  — and re-read the store — when the overlay closes. No refresh plumbing is needed.

### Tests that pin the old shape

- `app/tests/live_colour_suite.ts` 39-40 imports `rememberFreeRide` (and
  `FREE_RIDES_CACHE_FILE, decodeFreeRidesCache, flushFreeRideWrites, freeRideResults,
  initFreeRidePersistence, lastFreeRide, resetFreeRidesForTests`); test at 415
  (`'WP-B: free rides never pollute route history (D-025 mode-consistency)'`, lines
  415-443) and test at 445 (`'WP-B: free-ride cache round-trip — persist/rehydrate,
  corrupt-entry tolerance, idempotent init'`, lines 445-499) both build a free engine
  state and call `rememberFreeRide`; the second also feeds a v1 `goodEntry` with
  `crossings: [], sectors: []` through `decodeFreeRidesCache`.
- `app/tests/ridedetail_suite.ts` 67, 180, 193: fixtures `{ kind: 'freeRide',
  schemaVersion: 2, rideId, startedAtMs, crossings: [], sectors: [] }`.
- `app/tests/ridehistory_suite.ts` 192-201 `makeFree(startedAtMs, nGates)` builds a v2
  record with `nGates` crossings; test 203 asserts `rows[0].lapLabel` is the gate count
  (read 203-216 for the exact assertion text); tests 219, 223, 235, 241 only use
  `makeFree` as an opaque record.
- `app/tests/migrations_suite.ts` 319-350: `'migrations 9: upgradeFreeRidesCache renames
  crossings/sectors routeId -> wayId; a v2 file is untouched; init never rewrites'` —
  asserts v1→v2 renames, v2 returned as the same reference, `schemaVersion: 3` refused.
  Read to its end (past 350) before editing.

## Decisions (pre-resolved — do not re-open)

1. **A free ride is a label, not a live mode.** The record is
   `{ kind: 'freeRide', schemaVersion: 3, rideId, startedAtMs, durationS: number | null, sportId: string | null }`.
   `rideId` is the REAL raw ride id (not `free:<ms>`), so the record can be looked up
   exactly and the RESULTS row (brief 03) can open the ride. `durationS` is the ride's own
   wall-clock length from `RideMeta` (`(endMs - startMs) / 1000`), `null` when the meta is
   not loaded at save time or for a migrated record. `sportId` is the ride's own sport
   (`effectiveRideSportId(meta?.sportId, currentSports())`, the same value the naming draft
   uses), `null` when unknown — brief 03's RESULTS section is sport-scoped and needs it.
   No crossings, no sectors, no gate count — "this idea needs complete removal".
2. **Matching stays by `startedAtMs` (`freeRideNear`), unchanged.** New records store the
   session's `startedAtMs` (= `request.startedAtMs` on the overlay, exact hit); RIDES passes
   the raw index `startMs` (within the existing 10 s tolerance); migrated records match as
   they always did. Changing `buildRideRows`' `freeFor(startMs)` signature would touch
   four tests for no behavioural gain.
3. **Offered only on the unnamed card (`model.kind === 'none'`).** A ride that matched a
   known way (`kind === 'route'`) already IS a known ride with a real lap in the results
   store; "instead of a saved known or new route" means the choice is between naming and
   free, not demoting a matched ride. A matched ride can still be ignored in ranking
   (existing button). Open question 1 records the demotion idea.
4. **Un-saving is one button, "Not a free ride"**, shown on the FREE RIDE card's actions;
   it removes the record and the ride returns to the unnamed card with the naming offer.
   One-tap classification with no way back would be a trap on a post-stop screen.
5. **While a ride is free, the naming offer is hidden** (`model.kind !== 'free'` added to the
   offer button's condition). Un-save first, then name. Keeps the two labels exclusive.
6. **Migration v1/v2 → v3 strips gate data, keeps identity.** `upgradeFreeRidesCache` maps
   any older ride to `{ kind, schemaVersion: 3, rideId, startedAtMs, durationS: null, sportId: null }`;
   `schemaVersion === 3` files pass through as-is; `4+` refused, as `3` was before. The
   old `free:<ms>` ids survive on migrated records (they still match by time; they cannot
   be opened from RESULTS — brief 03 handles that).
7. **`rememberFreeRide` and the `LiveEngineState` import are removed; `lastFreeRide` stays**
   (harmless, tested, cheap). The two `live_colour_suite` tests are rewritten against
   `markRideFree`, keeping every assertion that is still meaningful (isolation from route
   history; persist/rehydrate; corrupt-entry tolerance; idempotent init) and dropping the
   sector-stored-verbatim one.
8. **`FreeRideRecord` type import stays in `rideDetailModel.ts` / `rideHistoryModel.ts`**;
   only the fields they touch change.
9. **The FREE RIDE card shows the START pick label** (`pickLabel`, already fetched for the
   unnamed card — "Home → new") as its second line and a plain "no lap, no sectors" line.
   No sector list, no `st.freeSectorRow`.

## Files to touch

### 1. `app/src/store/freeRides.ts`

**Edit A — header (lines 1-26).** After line 13 (`stores with free-ride data.`) insert:

```
 *
 * virgin-cycle16 02 (Nathan 2026-09-28): a free ride is a POST-RIDE LABEL on
 * an ordinary recorded ride, chosen on the ride-detail overlay ("Save as free
 * ride"), never a live mode — free mode, freeCrossings/freeSectors and the
 * gates-only map are retired ("this idea needs complete removal"). The record
 * is identity only: rideId, startedAtMs, durationS, sportId. No crossings, no sectors.
```

Leave the WP-B quote (lines 2-4) and the rest of the header as they are — history.

**Edit B — lines 27-41.** Delete line 27 (`import type { LiveEngineState } …`). Replace
lines 31-41 with:

```ts
export const FREE_RIDES_CACHE_FILE = 'free-rides-cache.json';
const SCHEMA_VERSION = 3;

export interface FreeRideRecord {
  kind: 'freeRide';
  schemaVersion: 3;
  /** The raw ride's own id (storage/index.json) — since v3. Migrated v1/v2
   * records keep their historical `free:<startedAtMs>` id. */
  rideId: string;
  startedAtMs: number;
  /** Wall-clock ride length in seconds from RideMeta (endMs - startMs), or
   * null when unknown (migrated record, or meta not loaded at save time). */
  durationS: number | null;
  /** The ride's own sport (RideMeta.sportId through effectiveRideSportId), or
   * null when unknown (migrated record). RESULTS scopes its free-ride section
   * by this; a null record shows under every sport. */
  sportId: string | null;
}
```

**Edit C — lines 53-66.** Delete `isValidCrossing` and `isValidFreeSector` entirely.

**Edit D — `isValidFreeRideRecord` (71-79).** Replace lines 76-77 (the two array checks) with

```ts
  if (!(v.durationS === null || (typeof v.durationS === 'number' && Number.isFinite(v.durationS)))) return false;
  if (!(v.sportId === null || typeof v.sportId === 'string')) return false;
```

**Edit E — `rememberFreeRide` (111-137).** Replace the doc comment and function with:

```ts
/** Labels an ordinary recorded ride a free ride (virgin-cycle16 02). Called
 * from RideDetailScreen's "Save as free ride"; idempotent by rideId. The raw
 * JSONL stays the real record of the ride (D-023) — this cache only says
 * "Nathan filed it as free". */
export function markRideFree(
  rideId: string, startedAtMs: number, durationS: number | null, sportId: string | null,
): void {
  if (rides.some((r) => r.rideId === rideId)) return;
  const record: FreeRideRecord = { kind: 'freeRide', schemaVersion: 3, rideId, startedAtMs, durationS, sportId };
  rides = [...rides, record];
  const text = encodeCache(rides);
  void enqueueWrite(async (fs) => {
    await fs.writeText(FREE_RIDES_CACHE_FILE, text);
  });
}

/** Undoes markRideFree ("Not a free ride"). Takes the record's own rideId
 * (RideDetailScreen passes `model.free.rideId`, which for a migrated v1/v2
 * record is the historical `free:<ms>` id, not the raw ride's). No-op when
 * absent. */
export function unmarkRideFree(rideId: string): void {
  if (!rides.some((r) => r.rideId === rideId)) return;
  rides = rides.filter((r) => r.rideId !== rideId);
  const text = encodeCache(rides);
  void enqueueWrite(async (fs) => {
    await fs.writeText(FREE_RIDES_CACHE_FILE, text);
  });
}
```

Everything from `freeRideResults` (144) down stays byte-for-byte. Update the doc comment
of `freeRideNear` (156-161) only if it mentions `rememberFreeRide` (it does not — it
mentions the `free:${sessionStartedAtMs}` id; append one sentence: ` Since v3 the id is
the raw ride's own, and the exact startedAtMs hit is the normal case.`).

### 2. `app/src/store/migrations.ts`

**Edit F — line 8.** `rememberFreeRide` → `markRideFree` in the comment.

**Edit G — `upgradeFreeRidesCache` (91-116).** Replace the doc comment and function with:

```ts
/** raw must be an object with array `rides` — else null. File-level
 * schemaVersion === 3 -> raw.rides as-is. 1, 2 or undefined -> each ride
 * reduced to its v3 identity shape (virgin-cycle16 02: kind, rideId,
 * startedAtMs, durationS null, sportId null) — crossings/sectors are dropped, the free-gates
 * idea being retired. Other -> null. isValidFreeRideRecord still filters
 * afterwards, as today. */
export function upgradeFreeRidesCache(raw: unknown): unknown[] | null {
  if (!isNonNullObject(raw)) return null;
  if (!Array.isArray(raw.rides)) return null;

  const sv = raw.schemaVersion;
  if (sv === 3) return raw.rides;
  if (sv === 1 || sv === 2 || sv === undefined) {
    return raw.rides.map((ride) => {
      if (!isNonNullObject(ride)) return ride;
      return {
        kind: ride.kind,
        schemaVersion: 3,
        rideId: ride.rideId,
        startedAtMs: ride.startedAtMs,
        durationS: null,
        sportId: null,
      };
    });
  }
  return null;
}
```

If `renameKey` is now unused in this file (`grep -n "renameKey" app/src/store/migrations.ts`
shows only its definition), leave the definition in place — other upgraders may need it
later and an unused module-private function is not a type error. If `tsc` reports it
unused, report that rather than deleting.

### 3. `app/src/ui/rideHistoryModel.ts`

**Edit H — lines 140-141 and 149.** Delete `const n = free.crossings.length;` and change
`lapLabel: \`${n} gate${n === 1 ? '' : 's'}\`,` to

```ts
            lapLabel: fmt(Math.max(0, (m.endMs - m.startMs) / 1000)),
```

(`fmt` is already imported on line 25.) In the doc comment (lines 100-115) replace the
sentence fragment `is "Free ride" with its gate-crossing count in the lap slot ("3
gates" — the only honest figure a free record carries; D-025: no lap was
ever derived)` with `is "Free ride" with the ride's own wall-clock duration in the lap
slot (virgin-cycle16 02 — a free ride carries no gates; D-025: no lap was ever derived)`.
Wording only; if the fragment is not verbatim, skip the comment edit and report.

### 4. `app/src/ui/RideDetailScreen.tsx`

**Edit I — line 48.**
`import { freeRideNear, freeRideResults } from '../store/freeRides.ts';` →
`import { freeRideNear, freeRideResults, markRideFree, unmarkRideFree } from '../store/freeRides.ts';`

**Edit J — handlers.** Directly after `onNamingSave`'s closing `}` (line 292, before
`async function onAdjustSave`) add:

```ts
  // virgin-cycle16 02 (Nathan 2026-09-28): a free ride is a post-ride label.
  // meta (listRides, read on mount) gives the wall-clock duration; null if it
  // has not arrived yet — the record is identity, the raw JSONL is the ride.
  function onSaveFree() {
    markRideFree(
      request.rideId,
      request.startedAtMs,
      meta ? Math.max(0, (meta.endMs - meta.startMs) / 1000) : null,
      effectiveRideSportId(meta?.sportId, currentSports()),
    );
    setNaming(false);
    setTick((v) => v + 1); // model re-reads: free = the new record → kind 'free'
  }
  function onUnsaveFree() {
    if (model.free === null) return;
    unmarkRideFree(model.free.rideId);
    setTick((v) => v + 1); // model re-reads: free = null → kind 'none', offer back
  }
```

**Edit K — FREE RIDE card, lines 518-529.** Replace from
`<Text style={{ color: t.textDim, fontSize: 12.5, marginTop: 4 }}>` (518) through the
`) : null}` that closes the sectors block (529) with:

```tsx
          <Text style={{ color: t.textDim, fontSize: 12.5, marginTop: 4 }}>
            {pickLabel ?? 'saved as a free ride'}
          </Text>
          <Text style={{ color: t.textDim, marginTop: 4 }}>no lap, no sectors — a free ride is not compared to anything</Text>
```

The `<Text style={{ color: t.textDim }}>FREE RIDE</Text>` line (517) and the `WayMapView`
block below (from 530) stay. Then `grep -n "freeSectorRow" app/src/ui/RideDetailScreen.tsx`: remove
the `freeSectorRow` entry from the `st`/`styles` sheet if that grep shows no other use.
`grep -n "\bfmt\b\|wayLabelIn" app/src/ui/RideDetailScreen.tsx`: both are still used
elsewhere in the file (the route card, `offer.matchedWayId`); if `tsc` says otherwise,
report, do not remove.

**Edit L — ACTIONS, lines 599-607.** Change the offer button's condition

```tsx
        {offer !== null && !naming && adjust === null ? (
```

to

```tsx
        {offer !== null && !naming && adjust === null && model.kind !== 'free' ? (
```

and directly after that block's `) : null}` (line 607), before `</View>`, add:

```tsx
        {model.kind === 'none' && !naming && adjust === null ? (
          <Pressable
            style={[styles.deleteBtn, styles.promoteBtn, busy && styles.busy]}
            disabled={busy}
            onPress={onSaveFree}
          >
            <Text style={styles.deleteText}>Save as free ride</Text>
          </Pressable>
        ) : null}
        {model.kind === 'free' ? (
          <Pressable
            style={[styles.deleteBtn, styles.promoteBtn, busy && styles.busy]}
            disabled={busy}
            onPress={onUnsaveFree}
          >
            <Text style={styles.deleteText}>Not a free ride</Text>
          </Pressable>
        ) : null}
```

**Edit M — delete keeps the cache honest.** In `onDelete`'s confirm handler (lines
353-358), directly after `dropRecorded(meta.rideId);` (line 357) add:

```ts
              if (model.free !== null) unmarkRideFree(model.free.rideId); // virgin-cycle16 02: no orphan free record
```

(Anchor: the three lines `await deleteRide(meta.rideId);` / `await removeStoredResult(meta.rideId);`
/ `dropRecorded(meta.rideId);` in that order. If they are not adjacent, stop and report.)

### 5. Tests

**`app/tests/live_colour_suite.ts`.**

- Lines 39-40: drop `rememberFreeRide` from the destructured import; add `markRideFree`.
- Test at 415 ("free rides never pollute route history"): replace the `stateWith({ mode:
  'free', … })` fixture and the `rememberFreeRide(freeState);` call with
  `markRideFree('ride-free-1', 1000, 123, null);`. Keep the four `ghostsFor` / `lapValues` /
  `recordedResults` / `freeRideResults().length === 1` assertions. Replace the last
  assertion (`saved.sectors.length === 1 …`) with
  `assert(saved.rideId === 'ride-free-1' && saved.durationS === 123 && saved.sportId === null && saved.schemaVersion === 3, 'the record is identity only: rideId, startedAtMs, durationS, sportId');`.
  If `stateWith` / `LiveEngineState` become unused in this suite after this, leave them
  (other tests in the file use `stateWith`; check with grep before touching).
- Test at 445 (round-trip): replace the fixture + `rememberFreeRide(freeState);` with
  `markRideFree('ride-free-2', 5000, 60, 'cycling');`. `lastFreeRide()` and the rest of the
  persist/rehydrate/idempotence block stay. In the decode block, change `goodEntry` to
  `{ kind: 'freeRide', schemaVersion: 1, rideId: 'free:1', startedAtMs: 1, crossings: [], sectors: [] }`
  **unchanged** (it is a v1 entry and must still decode — the migration strips it) and
  add after the existing `decoded` assertion:
  `assert(decoded![0].schemaVersion === 3 && decoded![0].durationS === null && !('crossings' in decoded![0]), 'a v1 entry migrates to the v3 identity shape');`.
  Then append a new test at the end of the WP-B section:

  ```ts
  test('virgin-cycle16 02: unmarkRideFree removes exactly that record and persists the removal', async () => {
    resetFreeRidesForTests();
    const fs = createMemoryFsAdapter();
    await initFreeRidePersistence(fs);
    markRideFree('r-a', 1000, 10, null);
    markRideFree('r-b', 2000, 20, 'cycling');
    markRideFree('r-a', 1000, 10, null); // idempotent
    assert(freeRideResults().length === 2, 'two distinct records, no duplicate');
    unmarkRideFree('r-a');
    assert(freeRideResults().length === 1 && freeRideResults()[0].rideId === 'r-b', 'only r-b remains');
    unmarkRideFree('nope'); // no-op
    await flushFreeRideWrites();
    resetFreeRidesForTests();
    await initFreeRidePersistence(fs);
    assert(freeRideResults().length === 1 && freeRideResults()[0].rideId === 'r-b', 'the removal reached disk');
    resetFreeRidesForTests();
  });
  ```

  (add `unmarkRideFree` to the import.)

**`app/tests/ridedetail_suite.ts`** — lines 67, 180, 193: change each fixture to
`{ kind: 'freeRide', schemaVersion: 3, rideId: …, startedAtMs: …, durationS: null, sportId: null }`
(keep each one's `rideId`/`startedAtMs` values). No assertion changes.

**`app/tests/ridehistory_suite.ts`** — `makeFree(startedAtMs, nGates)` (192-201): change
to `makeFree(startedAtMs: number, durationS: number | null = null)` returning
`{ kind: 'freeRide' as const, schemaVersion: 3 as const, rideId: \`free:${startedAtMs}\`, startedAtMs, durationS, sportId: null }`.
Update the callers: `makeFree(1000, 3)` at 209 → `makeFree(1000)`, `makeFree(1000, 1)` at
219 → `makeFree(1000)`, others unchanged. Test 203 (lines 203-216) uses the meta
`{ rideId: 'r1', startMs: 1000, endMs: 2000, nFixes: 10 }` — one second — so change line 212
`assert(rows[0].lapLabel === '3 gates', \`the lap slot carries the gate count, got ${rows[0].lapLabel}\`);`
to
`assert(rows[0].lapLabel === '0:01', \`the lap slot carries the ride's duration, got ${rows[0].lapLabel}\`);`
and retitle the test `'virgin-cycle15 §1 / cycle16 02: buildRideRows — an unnamed free ride with a record on file reads "Free ride" + its duration, not the START pick'`.

**`app/tests/migrations_suite.ts`** — test 9 (319-…): keep the `v1Raw` fixture; replace
the four v1→v2 assertions (`ride.schemaVersion === 2`, the `crossings`/`sectors` renames)
with:

```ts
  assert(ride.schemaVersion === 3, 'the ride record itself is bumped to v3');
  assert(ride.rideId === 'free:1' && ride.startedAtMs === 1000, 'identity kept');
  assert(ride.durationS === null && ride.sportId === null && !('crossings' in ride) && !('sectors' in ride), 'gate data dropped (virgin-cycle16 02)');
```

Keep `v2Raw`; replace `assert(asIs === v2Raw.rides, …)` with
`const fromV2 = upgradeFreeRidesCache(v2Raw) as unknown as Record<string, unknown>[]; assert(fromV2 !== null && fromV2[0].schemaVersion === 3 && !('crossings' in fromV2[0]), 'a v2 file is migrated the same way');`.
Add `const v3Raw = { schemaVersion: 3, rides: [{ kind: 'freeRide', schemaVersion: 3, rideId: 'r', startedAtMs: 3000, durationS: 42, sportId: null }] }; assert(upgradeFreeRidesCache(v3Raw) === v3Raw.rides, 'a v3 file returns its rides array as-is (same reference)');`.
Change `{ schemaVersion: 3, rides: [] }` in the "future refused" assertion to
`{ schemaVersion: 4, rides: [] }`. Retitle: `'migrations 9: upgradeFreeRidesCache reduces v1/v2 rides to the v3 identity shape; a v3 file is untouched; …'` (keep the tail of the title). Read the rest of the test past 350 — if it asserts on `crossings`/`sectors` after `isValidFreeRideRecord`, adapt those lines to the v3 shape the same way; if anything there is not obviously mechanical, stop and report.

## Verification

From `app/`: `node --experimental-strip-types tests/run.ts` → zero FAIL;
`./node_modules/.bin/tsc --noEmit` → exit 0. Then:

- `grep -rn "rememberFreeRide" app/src app/tests` → **no hits**.
- `grep -rn "\.crossings\|\.sectors" app/src/store/freeRides.ts app/src/ui/rideHistoryModel.ts app/src/ui/RideDetailScreen.tsx app/src/ui/rideDetailModel.ts`
  → hits only on `result.sectors` / `r.sectors` (RideResult sectors, `rideHistoryModel.ts`
  ~219, ~311-315) — none on a free record.
- `grep -n "markRideFree\|unmarkRideFree" app/src/ui/RideDetailScreen.tsx` → import + two
  handler bodies + two `onPress` + the one line in `onDelete`.
- `grep -n "schemaVersion: 2" app/src/store/freeRides.ts app/tests/ridedetail_suite.ts app/tests/ridehistory_suite.ts`
  → no hits.
- `grep -n "LiveEngineState" app/src/store/freeRides.ts` → no hits.
- `grep -n "effectiveRideSportId\|currentSports" app/src/ui/RideDetailScreen.tsx` → the two
  existing imports (lines 42-43) plus the existing draft call and the new `markRideFree` call.

## On-device checklist (Nathan, after publish)

1. RECORD → Home → new → ride somewhere unknown → STOP. Overlay: "Home → new" card, then
   under ACTIONS **two** buttons: "Make this the reference of a new route" and **"Save as
   free ride"**.
2. Tap "Save as free ride": the card flips to **FREE RIDE / Home → new / no lap, no sectors
   …** with the trail map; the naming button is gone; a **"Not a free ride"** button is
   there.
3. Tap "Not a free ride": back to step 1's card and both buttons.
4. Save as free again → RECORD ANOTHER → RIDES: the row reads **"Free ride · <date> ·
   <m:ss duration>"** (duration, not "N gates"). Tap it → the FREE RIDE card.
5. A ride recorded as free BEFORE this publish (if any survived Reset to virgin): RIDES
   row now shows its duration; its detail shows the FREE RIDE card without a sector list;
   "Not a free ride" removes it.
6. A known-route ride (Home → Church, lap on file): no "Save as free ride" button.
7. Kill and relaunch the app: the free rides from 4/5 are still free (the cache persisted).
8. Settings → Reset to virgin still clears them (unchanged `resetFreeRides` caller).
9. Delete a free ride from its detail → it is gone from RIDES and (after brief 03) from
   RESULTS' free section too — no orphan record.

## Out of scope

- A FREE RIDES section on RIDES and RESULTS — brief 03 (this brief leaves RIDES' inline
  "Free ride" row as is, with the duration instead of the gate count).
- Removing free mode from the engine, `freeRideWayIds`, the gates-only map — brief 04.
- Demoting a matched (known-way) ride to free (open question 1).
- Distance on the free-ride record (open question 2).
- `STATE.md`, `OPEN-ITEMS.md`, this folder's `README.md` — the coordinator's.

## What this changes on Nathan's phone

Nothing yet — this is a parked brief. Once executed: JS-only, ships over EAS Update via
`scripts/publish-preview.cmd`. Visible: every unnamed ride's detail (right after STOP and
from RIDES) gets a "Save as free ride" button; a free ride's card loses the gate count and
sector list and gains "Not a free ride"; RIDES shows a free ride's duration. On first launch
after the update the free-ride cache is silently migrated (gate data dropped, rides kept).

## Open questions / assumptions (logged, not blocking)

1. **Demote a matched ride to free?** Today a ride that locked onto a known way has a real
   lap in the results store. Making it "free" would need `resultsStore` to forget/ignore
   that result, which crosses the structural-isolation line (`freeRides.ts` header). If
   Nathan wants it, it is a separate brief with `ignoredFromRanking` as the likely lever.
2. **Distance.** `RideMeta` has no distance; the trail's length could be summed from the
   JSONL at save time (RideDetailScreen already loads `fixes`). Left out: `durationS` is
   the one figure that costs nothing and is always honest. Add `distanceM` later if the
   RESULTS section wants it.
3. **A migrated record's `free:<ms>` id** cannot open the ride from a RESULTS row (brief
   03 renders those rows un-tappable). Nathan's phone is on a virgin seed with, at most, a
   handful of such records; not worth a lookup pass.
4. **`meta` may still be `null` at the moment "Save as free ride" is tapped** (listRides
   is async, read on mount). Then `durationS` is stored `null` and RIDES still shows the
   duration (it computes from its own `RideMeta`). Only the RESULTS row (brief 03) would
   show "–" for that ride. Acceptable; a re-save after un-save fixes it.
