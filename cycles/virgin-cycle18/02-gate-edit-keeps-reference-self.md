# 02 — Editing a way's gates must never lose its reference self

**Source: Nathan, 2026-09-29.** His words: "on my test rides this morning i was surprised by how
poor the app was. yesterday i had a HomeWork ride which was my reference, i then changed the
gates after the ride was saved and wanted to ride it again today with live dot racing (should
have one dot to race). Unfortunately no dot was shown for me to race during my ride + the sector
lines below the map did not colour at all properly so i was left empty handed with nothing to
see. investigate why. my hypothesis is that changing the gates deletes the reference ride in
some way. Because there is a warning message upon gates saving that says that all selfs for that
ride will be erased; but this is a flaw as for the reference ride there should still be freedom
to edit gates without altering the reference self ?!"

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-29 by the Plan
tier (Fable) from a Haiku digest plus anchor checks against the working tree (branch `virgin`,
HEAD `e418dec`) and a throwaway repro run outside the repo (Proof below). Executor: Sonnet,
cold, this file only. Brief 02 of `virgin-cycle18`; independent of brief 01 (different files).

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-29. If a quoted
  line is not where the brief says, or a name/signature differs, **stop and report the
  mismatch verbatim** (file, line, expected, found). Never guess, never patch around it,
  never rule on it yourself.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `safe_to_delete/` is the bin.
- No new dependency. Files touched: `app/src/store/resultsStore.ts`,
  `app/src/store/routeFromRide.ts`, `app/src/ui/GateAdjustScreen.tsx`,
  `app/tests/routecreation_suite.ts`, `app/tests/resultsstore_suite.ts`. Nothing else.
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`,
  any other `NN-*.md` brief, or anything under `cycles/virgin-cycle2/` / `virgin-cycle13/`.
- Do not touch `colourModel.ts`, `selfRaceModel.ts`, `lastRide.ts`, `RecordScreen.tsx`,
  `derive.ts`, `live/tracks.ts` — the live side is NOT where the bug is (Root cause, fact 6).

## Symptom, restated as the code sees it

Ride 2 on a way whose ONLY ranked prior ride is the reference should show exactly one self dot
(`ghostsFor(wayId)` = the reference's result, `RecordScreen.tsx:1016-1017` →
`loadSelfTracks`) and colour the sector pane purple/yellow against it (`colourModel.ts`
`MIN_HISTORY = 1`, `tierFor`: n=1 → purple or yellow, never green). Nathan saw zero dots and a
neutral pane. Both are the same fact: **on that ride, the reference ride had no `ranks()`-passing
stored result** (`colourModel.ts:68-73` `rankedFor` reads `recordedResults()`, which
`lastRide.ts:244-253` hydrates from `resultsStore` at boot). Everything else — gate-set version
pointer, `catalogTrackSpecs`, the self-track cache key, `loadSelfTracks` — was checked and is
correct (fact 6).

## ROOT CAUSE — proven

The result store has a **permanent "unmatched" marker** (`results/unmatched.json`,
`resultsStore.ts:8, 401-411`) that `backfillMissingResults` honours unconditionally
(`resultsStore.ts:444`: `if (unmatched.some((u) => u.rideId === rideId && u.engineVersion ===
BACKFILL_ENGINE_VERSION)) continue;`). Nothing in the repo ever clears a marker (grep: the only
writer is `appendUnmatched`; `initResultsStore:143` resets the in-memory list and re-reads the
file). A reference ride carrying that marker has no result and can never get one — and there
are TWO ordinary ways a reference ride ends up with the marker, both silent:

**Path A — the marker predates the way.** The reference ride is, by definition, a ride that
matched nothing when it ended (that is why the naming card appeared). If ANY backfill ran
between that ride ending and the way being minted — a RIDES-tab visit (`RidesScreen.tsx:82-116`
backfills every ended ride on mount) or an app restart (`lastRide.ts:262-276`) — the ride got the
marker. That is exactly the flow when the way is created retroactively from the ride's detail
screen (`RideDetailScreen.tsx:240-278`: the RIDES tab must be opened to get there, so the
backfill has already run). `createRouteFromDraft` (`routeFromRide.ts:219-241`) and
`promoteRideToReference` (`:91-142`) never clear it. `cycles/virgin-cycle13/rides-no-way-naming.md`
§"Root cause" bug 1 documents this exact hole and its "Fix applied" section says in its own
title *"display only -- matching/backfill logic untouched"* — the RIDES row was relabelled
`"<way> — ref"`, the hole stayed. Nathan had already hit it once (cycle13's prompt: "he knows
one of them is now the reference ride of a named route" yet it showed "no way").

**Path B — the gate edit writes the marker.** `editWayGates` (`routeFromRide.ts:312-356`)
removes every stored result on the way (`:351-352`) and re-derives through
`backfillMissingResults` (`:353`). If the reference recording cannot produce a
`clean|interrupted` lap against the NEW gates (`resultsStore.ts:477`) — a gate nudged into a GPS
hole, onto a stretch the recording projects off-corridor, or past where the recording's
crossings resolve — the loop's `accepted.length === 0` branch writes the marker (`:485-486`).
From then on the reference is gone: `clearedRideIds` on the next edit no longer includes it
(`storedResultsForWay` only lists rides WITH a result), `backfill` skips it at `:444`, and
**nudging the gates back does not restore it**. The UI never says so: `GateAdjustScreen.tsx:78-85`
ignores `out.retimed`, and the alert copy (`:57-62`) promises "The reference ride ... kept".

Both paths converge on the same on-device state and the same ride-2 symptom. Which one Nathan
hit cannot be told from code; the on-device diagnostic below tells them apart and the fix
closes both.

### Proof (throwaway script against the real modules, 2026-09-29, memory fs, straight synthetic
ride of 200 fixes, ref length 4395 m, v1 gates `[50,500,1000,1500,1950]`)

- **A.** Reference ride `ref1` with a marker, no result. `editWayGates('W', [50,650,1000,1500,1950])`
  → `{ok:true, moved:true, gateSetVersion:2, clearedRideIds:[], retimed:[]}`; `getStoredResult('ref1')`
  still `null`. The edit did not even try.
- **B.** Same ride with a 46-fix hole (fixes 100–145 removed, ~2200–3200 m) and a clean v1
  result. `editWayGates('W', [50,500,1000,2700,4300])` (gate 3 into the hole) →
  `{ok:true, retimed:[]}`, result `null`, `results/unmatched.json` now lists `ref1`. Then
  `editWayGates('W', [50,500,1000,1500,1950])` (back to sane gates) → `{clearedRideIds:[],
  retimed:[]}`, result still `null`. **Permanent, silent.**
- Control: the same ride with no hole and finish gate moved to the line's end (`[0,…,4395]`)
  re-times clean — so a *middle* nudge on a clean recording does not trigger B; it takes a
  recording defect under the new gate. Real GPS recordings have those.

### What is NOT the cause (checked, leave alone)

6. `addGateSet` (`catalog.ts:183-188`) bumps `Way.gateSetVersion`; `catalogTrackSpecs`
   (`live/tracks.ts:23-46`) reads it at call time; `RecordScreen.tsx:1016` passes the current
   version to `loadSelfTracks`, whose cache key is `rideId:gateSetVersion`
   (`selfRaceModel.ts:260`); `GateAdjustScreen.tsx:78-85` mirrors re-timed results into
   `lastRide.recorded` in-session; nothing filters results by `derivedBy.gateSetVersion`.
   D-045 ruling 1 (`STATE.md:262-265`, `colourModel.ts:37-53`) only silences the reference
   ride's OWN day; ride 2 against one ranked prior is purple/yellow by design. No ruling is
   contradicted by this brief; cycle2 Q2 (`cycles/virgin-cycle2/QUESTIONS-FOR-NATHAN.md:48-60`,
   "re-time, not erase") is exactly what the fix enforces.

## Decisions (pre-resolved — do not re-open)

1. **The reference ride is re-timed directly, not through the candidate loop.** `editWayGates`
   derives `way.referenceRideId` against THIS way's ref + the new gates with `deriveRideResult`
   and `saveResult`s it before the general backfill (which then skips it at `:443`
   `store.has`). Rationale: `Way.referenceRideId` is Nathan's explicit designation and the ref
   line IS that recording — corridor coverage is ~1 by construction, and the loop's tie-break
   could hand the ride to an overlapping variant way. Same `BACKFILL_ENGINE_VERSION`,
   `source:'app'`, so the result is byte-compatible with a loop-derived one.
2. **Block BEFORE saving when the edit would lose a reference that currently times.** Rule:
   refuse iff the reference derives `clean|interrupted` against the CURRENT gates but not
   against the proposed ones. The error names the missed sector(s) so Nathan knows which gate
   to move. A reference that already fails against the current gates (Path A rides after a
   defect, or an unreadable recording) does NOT block the edit — there is nothing to lose, and
   blocking would trap the way forever. Nathan asked for exactly this ("block or warn BEFORE
   saving instead of silently losing it").
3. **Markers are cleared where a way is born or re-referenced.** New `clearUnmatched(rideId)` in
   `resultsStore.ts`; called in `editWayGates` (before the direct derive), `promoteRideToReference`
   (before its backfill — its candidate list already includes the promoted ride, the marker
   was silently defeating it) and `createRouteFromDraft` (so the next boot/RIDES backfill times
   the founding ride, as it does today when no marker exists). Closes Path A for every future
   way; existing stuck ways recover through the on-device step below.
4. **`createRouteFromDraft` does NOT derive a result itself** (only clears the marker). Deriving
   at creation would leave a v1-derived result under the v2 gates `saveAdjustedGates` mints a
   second later, with no re-time — sector comparisons would silently be against the wrong
   chainages. Today's behaviour (the founding ride is timed at the next backfill) is kept.
   See Nathan's call 2.
5. **Honest copy.** The alert and the card subtitle stop saying "history will be reset and past
   ghosts will be lost" / "all selfs erased". Reality: past results are re-timed against the
   new gates; the reference is re-timed too; recordings are never touched. Button:
   `Save & re-time`. If the reference could not be re-timed (only reachable with an
   unreadable/undecodable recording, given decision 2), one plain alert says so after the save.
6. **Outcome shape grows additively**: `referenceRideId: string | null`, `referenceRetimed:
   boolean` on the `moved:true` branch; `retimed` now also lists the reference when it was
   re-timed (it may not have been in `clearedRideIds` — Path A). The screen mirrors
   `clearedRideIds ∪ retimed` into `lastRide.recorded`, so the dot appears in-session too.

## Files to touch

### 1. `app/src/store/resultsStore.ts`

**Anchor (read first):** line 401 `async function appendUnmatched(rideId: string): Promise<void> {`,
body through line 411 `}`. Line 100 `let unmatched: UnmatchedEntry[] = [];`.

**Edit 1A — after line 411** (the closing `}` of `appendUnmatched`), insert:

```ts

/** virgin-cycle18 brief 02 (Nathan 2026-09-29): drop every unmatched marker
 * for `rideId`, at ANY engine version. Until this existed no code path ever
 * cleared a marker, so a ride that matched nothing BEFORE its way was minted
 * from it (createRouteFromDraft / promoteRideToReference), or that failed to
 * re-time under a gate edit (editWayGates), stayed unmatched forever — no
 * result, no self dot, no sector colours, and nudging the gates back could
 * not restore it. Callers that designate a ride as a way's reference call
 * this before re-deriving it. No-op (no write) when nothing is listed. */
export async function clearUnmatched(rideId: string): Promise<void> {
  const next = unmatched.filter((u) => u.rideId !== rideId);
  if (next.length === unmatched.length) return;
  unmatched = next;
  const text = encodeUnmatchedFile(unmatched);
  await enqueueWrite(async (fs) => {
    await fs.ensureDir(RESULTS_DIR);
    await fs.writeText(UNMATCHED_FILE, text);
  });
}

/** virgin-cycle18 brief 02: true when `rideId` carries a marker at the
 * current BACKFILL_ENGINE_VERSION — the exact test backfillMissingResults
 * applies before skipping a ride. Read-only; for callers and tests. */
export function isUnmatched(rideId: string): boolean {
  return unmatched.some((u) => u.rideId === rideId && u.engineVersion === BACKFILL_ENGINE_VERSION);
}
```

`encodeUnmatchedFile`, `enqueueWrite`, `RESULTS_DIR`, `UNMATCHED_FILE` are the same module-level
names `appendUnmatched` uses on lines 406-410 — if any of them is not in scope there, stop.

### 2. `app/src/store/routeFromRide.ts`

**Anchors (read first):** line 26
`import { backfillMissingResults, getStoredResult, removeStoredResult, storedResultsForWay } from './resultsStore.ts';`
line 27 `import type { Catalog } from './types.ts';` line 49 `export async function readRideFixes(rideId: string, fs: FsAdapter) {`
lines 130-132 (promote's reset), lines 230-231 (`createRouteFromDraft`'s `wayId`/`saveUserRef`),
lines 283-295 (`EditGatesOutcome`), lines 312-356 (`editWayGates`; `:321` `const ref = userRefFor(way.refLineId);`,
`:334-335` moved/no-op, `:337` `const version = current.version + 1;`, `:350-355` reset + return).

**Edit 2A — line 26**, replace with:

```ts
import {
  BACKFILL_ENGINE_VERSION, backfillMissingResults, clearUnmatched, getStoredResult,
  removeStoredResult, saveResult, storedResultsForWay,
} from './resultsStore.ts';
import { deriveRideResult } from './derive.ts';
```

**Edit 2B — line 27**, replace `import type { Catalog } from './types.ts';` with
`import type { Catalog, RideResult } from './types.ts';`.

**Edit 2C — the helper.** Insert immediately BEFORE line 283 (`export type EditGatesOutcome =`),
i.e. after the closing `}` of `gateEditDraftFor`:

```ts
/** virgin-cycle18 brief 02: the reference ride's result against `gates`, or
 * null with a reason. Reads the recording exactly as backfillMissingResults
 * does (readRideFixes = chronologicalFixes over every fix, flags included),
 * derives against THIS way's ref (no candidate loop, no corridor test — the
 * ref line IS this recording), and accepts the same qualities the backfill
 * accepts (clean | interrupted). `reason` is human copy for an Alert.
 * `readable` is false only when the recording is absent/unreadable/too short
 * — the caller must not block a gate edit on a ride it could never time. */
export async function deriveReferenceAgainst(
  rideId: string, wayId: string, ref: RefLine, gates: number[], gateSetVersion: number, fs: FsAdapter,
): Promise<{ result: RideResult | null; readable: boolean; reason: string | null }> {
  const fixes = await readRideFixes(rideId, fs);
  if (fixes === null || fixes.length < 2) {
    return { result: null, readable: false, reason: 'the reference recording is missing or unreadable' };
  }
  const t = fixes.map((f) => f.tUnixMs / 1000);
  const lat = fixes.map((f) => f.lat);
  const lon = fixes.map((f) => f.lon);
  const result = deriveRideResult({
    rideId, t, lat, lon, ref, gates, wayId, gateSetVersion,
    engineVersion: BACKFILL_ENGINE_VERSION, source: 'app',
  });
  if (result.wayId === wayId && (result.lap.quality === 'clean' || result.lap.quality === 'interrupted')) {
    return { result, readable: true, reason: null };
  }
  const missed = result.sectors.filter((s) => s.quality === 'missed').map((s) => s.index);
  const which = missed.length > 0
    ? `sector ${missed.join(' and ')} (between gate ${missed.map((i) => `${i - 1}→${i}`).join(', ')}) is not timed in its recording`
    : `its lap comes out '${result.lap.quality}'`;
  return { result: null, readable: true, reason: `the reference ride cannot be timed against these gates: ${which}` };
}
```

`RefLine` is already imported as a type on line 17; `readRideFixes` returns fixes with
`tUnixMs`, `lat`, `lon` (it is what `backfillMissingResults` mirrors) — if its element type lacks
`tUnixMs`, stop and report. Gate numbering in the copy is 0-based (`gate 0` = START), matching
`editWayGates`'s own refusal text on line 331 (`gate ${i} at ${c} m`).

**Edit 2D — `EditGatesOutcome` (lines 283-295).** Replace the `moved: true` branch's last field
block

```ts
      /** of clearedRideIds, the ones the immediate re-derive scored on THIS route again */
      retimed: string[];
    }
```

with

```ts
      /** the ones the immediate re-derive scored on THIS route again — every
       * clearedRideIds entry that came back, PLUS the reference ride when it
       * was re-timed (virgin-cycle18 brief 02: it may not have had a result
       * to clear). */
      retimed: string[];
      /** Way.referenceRideId, or null for a way without one */
      referenceRideId: string | null;
      /** true iff referenceRideId is set AND its fresh result is stored on this way */
      referenceRetimed: boolean;
    }
```

**Edit 2E — `editWayGates` precheck.** Between line 335 (`if (!moved) return { ok: true, moved: false };`)
and line 337 (`const version = current.version + 1;`) — line 336 is blank — insert:

```ts
  const version = current.version + 1;
  // virgin-cycle18 brief 02: never lose a reference self to a gate edit.
  // Refuse, with no writes, when the reference times against the CURRENT
  // gates but would not against the new ones (decision 2). A reference that
  // already does not time (or has no readable recording) never blocks.
  const refRideId = way.referenceRideId ?? null;
  let refNext: RideResult | null = null;
  if (refRideId !== null) {
    const next = await deriveReferenceAgainst(refRideId, wayId, ref, chainageM, version, fs);
    if (next.result === null && next.readable) {
      const now = await deriveReferenceAgainst(refRideId, wayId, ref, current.chainageM, current.version, fs);
      if (now.result !== null) {
        return { ok: false, errors: [`${next.reason} — move that gate somewhere the reference ride actually passed`] };
      }
    }
    refNext = next.result;
  }
```

then **change line 337** `const version = current.version + 1;` → delete that line (it now
lives in the inserted block above; there must be exactly ONE `const version` in the function —
`tsc` will refuse a duplicate).

**Edit 2F — the reset (lines 350-355).** Replace

```ts
  // The reset, then the immediate re-derive — promoteRideToReference's exact loop.
  const clearedRideIds = storedResultsForWay(wayId).map((r) => r.rideId);
  for (const id of clearedRideIds) await removeStoredResult(id);
  await backfillMissingResults(fs, clearedRideIds);
  const retimed = clearedRideIds.filter((id) => getStoredResult(id)?.wayId === wayId);
  return { ok: true, moved: true, gateSetVersion: version, clearedRideIds, retimed };
```

with

```ts
  // The reset, then the immediate re-derive — promoteRideToReference's loop,
  // with the reference handled FIRST and directly (virgin-cycle18 brief 02,
  // decisions 1+3): its marker is cleared, its fresh result (derived above
  // against this way's own ref) is stored, and the general backfill then
  // skips it (store.has) instead of re-matching it across every catalog way.
  const clearedRideIds = storedResultsForWay(wayId).map((r) => r.rideId);
  for (const id of clearedRideIds) await removeStoredResult(id);
  if (refRideId !== null) await clearUnmatched(refRideId);
  if (refNext !== null) await saveResult(refNext);
  await backfillMissingResults(fs, clearedRideIds);
  const candidates = refRideId !== null && !clearedRideIds.includes(refRideId)
    ? [...clearedRideIds, refRideId] : clearedRideIds;
  const retimed = candidates.filter((id) => getStoredResult(id)?.wayId === wayId);
  const referenceRetimed = refRideId !== null && getStoredResult(refRideId)?.wayId === wayId;
  return { ok: true, moved: true, gateSetVersion: version, clearedRideIds, retimed, referenceRideId: refRideId, referenceRetimed };
```

Note `refNext` is derived with `gateSetVersion = version` (Edit 2E), which equals the version
`addGateSet` just minted — WP-I 5's `derivedBy.gateSetVersion === out.gateSetVersion` assertion
must keep holding for loop-derived rides and now holds for the reference too.

**Edit 2G — `promoteRideToReference`.** Line 131-132:

```ts
  const candidates = clearedRideIds.includes(rideId) ? clearedRideIds : [rideId, ...clearedRideIds];
  await backfillMissingResults(fs, candidates);
```

→ insert between them one line: `  await clearUnmatched(rideId); // virgin-cycle18 brief 02: a marker from before this way existed must not defeat the re-time`

**Edit 2H — `createRouteFromDraft`.** After line 231 `  if (builtRef) await saveUserRef(wayId, builtRef.ref);`
insert:

```ts
  // virgin-cycle18 brief 02 (decision 3): the founding ride matched nothing
  // when it ended — if a backfill ran since (RIDES visit, restart) it carries
  // a permanent unmatched marker that would keep it un-timed forever. Clear
  // it; the next backfill (boot / RIDES) times it against this way's gates
  // as it always did when no marker was in the way. Not derived here on
  // purpose: saveAdjustedGates may mint v2 a moment later (decision 4).
  await clearUnmatched(draft.rideId);
```

### 3. `app/src/ui/GateAdjustScreen.tsx`

**Anchors:** lines 55-68 `confirmEditGates`; line 57 `const ghosts = n === 0`; lines 58-59 the two
branches; line 62 the body template; line 65 `{ text: 'Save & reset', style: 'destructive', ... }`;
lines 78-85 the `if (out.moved) { ... }` block; line 117 the `subtitle="Tap a gate ..."` prop.

**Edit 3A — lines 57-62.** Replace

```tsx
    const ghosts = n === 0
      ? 'There are no past results on this way yet.'
      : `Its ${n} past result${n === 1 ? ' is' : 's are'} discarded and re-timed from the recordings against the new gates — old times and ranks do not survive.`;
    Alert.alert(
      `Move the gates of "${wayLabelIn(currentCatalog(), request.wayId)}"?`,
      `This way's history will be reset and past ghosts will be lost.\n\n${ghosts} The reference ride and all ride recordings are kept.`,
```

with

```tsx
    const ghosts = n === 0
      ? 'There are no timed rides on this way yet.'
      : `Its ${n} timed ride${n === 1 ? ' is' : 's are'} re-timed from the recordings against the new gates — old times and ranks do not survive, the rides do.`;
    Alert.alert(
      `Move the gates of "${wayLabelIn(currentCatalog(), request.wayId)}"?`,
      `${ghosts} The reference ride is kept and re-timed too, so it still races you as a dot. Recordings are never touched.`,
```

**Edit 3B — line 65.** `'Save & reset'` → `'Save & re-time'` (style stays `'destructive'`).

**Edit 3C — lines 78-85.** Replace

```tsx
      if (out.moved) {
        for (const id of out.clearedRideIds) dropRecorded(id);
        if (getLastRide()?.wayId === request.wayId) clearLastRide();
        for (const id of out.clearedRideIds) {
          const r = getStoredResult(id);
          if (r) replaceRecorded(r);
        }
      }
```

with

```tsx
      if (out.moved) {
        for (const id of out.clearedRideIds) dropRecorded(id);
        if (getLastRide()?.wayId === request.wayId) clearLastRide();
        // virgin-cycle18 brief 02: mirror every re-timed result, the
        // reference included — it may not have been in clearedRideIds.
        for (const id of new Set([...out.clearedRideIds, ...out.retimed])) {
          const r = getStoredResult(id);
          if (r) replaceRecorded(r);
        }
        if (out.referenceRideId !== null && !out.referenceRetimed) {
          Alert.alert(
            'Gates saved — reference not re-timed',
            'The gates are saved, but this way\'s reference ride could not be timed against them (its recording is missing or unreadable), so it will not race you as a dot.',
          );
        }
      }
```

**Edit 3D — line 117**, the subtitle string. Replace
`Saving moved gates resets this way's history: past results are re-timed from their recordings against the new gates, old times and ranks do not survive.`
with
`Saving moved gates re-times this way's rides — the reference ride included — against the new gates; old times and ranks do not survive, recordings and rides do.`
(rest of the prop unchanged).

### 4. Tests

#### `app/tests/routecreation_suite.ts` — append after WP-I 6 (which ends at line 1151 `});`)

Use the existing `wph*` harness (`wphSetup`, `wphFixes`, `wphWriteRideFile`, `wphEstablishRef`,
`wphGhost`, `wphResultsStore`, `wphCatalogStore`, `wphRouteFromRide`). `wphUserCatalog`'s way
`WphRoute` has `referenceRideId: 'oldref1'` and no recording for it — that keeps WP-I 2-6
byte-for-byte valid (an unreadable reference never blocks, decision 2). For the new tests the
reference needs a recording: write `rides/oldref1.jsonl` from the same fixes the ref is built
from.

```ts
// ============================================================ virgin-cycle18
// brief 02: a gate edit never loses the way's reference self.

/** WphRoute's reference ride 'oldref1' with a real recording = the same track its ref is built from. */
async function c18Setup(holeFrom?: number, holeTo?: number) {
  const { fs } = await wphSetup();
  const f = wphFixes(200, 0.0002, 1_700_100_000);
  const ref = await wphEstablishRef('WphRoute', f);
  const keep = (i: number) => holeFrom === undefined || i < holeFrom! || i > holeTo!;
  const g = { t: f.t.filter((_, i) => keep(i)), lat: f.lat.filter((_, i) => keep(i)), lon: f.lon.filter((_, i) => keep(i)) };
  await wphWriteRideFile(fs, 'oldref1', g);
  return { fs, ref };
}

test('c18-02 1 (editWayGates): a reference ride stuck behind an unmatched marker is cleared and re-timed by a gate edit', async () => {
  const { fs } = await c18Setup();
  await fs.ensureDir('results');
  await fs.writeText('results/unmatched.json', JSON.stringify({
    schemaVersion: 1, entries: [{ rideId: 'oldref1', engineVersion: wphResultsStore.BACKFILL_ENGINE_VERSION }],
  }));
  await wphResultsStore.initResultsStore(fs);
  await wphResultsStore.backfillMissingResults(fs, ['oldref1']);
  assert(wphResultsStore.getStoredResult('oldref1') === null, 'precondition: the marker keeps the reference un-timed');
  const out = await wphRouteFromRide.editWayGates('WphRoute', [50, 650, 1000, 1500, 1950], fs);
  assert(out.ok && out.moved, `expected a moved save, got ${JSON.stringify(out)}`);
  if (!out.ok || !out.moved) return;
  assert(out.referenceRideId === 'oldref1' && out.referenceRetimed, 'the reference must be reported re-timed');
  assert(out.retimed.includes('oldref1'), 'retimed lists the reference even though it was not cleared');
  const r = wphResultsStore.getStoredResult('oldref1');
  assert(r !== null && r.wayId === 'WphRoute' && r.derivedBy.gateSetVersion === out.gateSetVersion,
    'the reference has a fresh result on its own way at the minted version');
  assert(!wphResultsStore.isUnmatched('oldref1'), 'the marker is gone');
  await wphResultsStore.flushResultWrites();
  assert(!(fs.files.get('results/unmatched.json') ?? '').includes('oldref1'), 'and gone on disk');
});

test('c18-02 2 (editWayGates): a nudge the reference recording cannot be timed against is refused BEFORE any write', async () => {
  const { fs } = await c18Setup(100, 145); // ~46 fixes missing around 2200-3200 m
  await wphResultsStore.backfillMissingResults(fs, ['oldref1']);
  assert(wphResultsStore.getStoredResult('oldref1')?.lap.quality === 'clean', 'precondition: times clean under v1');
  const beforeCat = JSON.stringify(wphCatalogStore.userCatalog());
  const out = await wphRouteFromRide.editWayGates('WphRoute', [50, 500, 1000, 2700, 4300], fs);
  assert(!out.ok, `a gate in the recording's hole must refuse, got ${JSON.stringify(out)}`);
  if (out.ok) return;
  assert(out.errors[0].includes('cannot be timed'), `error names the cause, got: ${out.errors[0]}`);
  assert(JSON.stringify(wphCatalogStore.userCatalog()) === beforeCat, 'catalog untouched — still v1');
  assert(wphResultsStore.getStoredResult('oldref1') !== null, 'the v1 result is still stored');
  assert(!wphResultsStore.isUnmatched('oldref1'), 'no marker was written');
});

test('c18-02 3 (editWayGates): a reference that already fails under the CURRENT gates never blocks an edit, and a fixing edit re-times it', async () => {
  const { fs } = await c18Setup(100, 145);
  // v1 -> a set with gate 3 in the hole, forced in through the catalog directly (as if saved before this brief).
  const forced = wphCatalogStore.userCatalog();
  const errs = await wphCatalogStore.saveUserCatalog({
    ...forced,
    ways: forced.ways.map((w) => (w.id === 'WphRoute' ? { ...w, gateSetVersion: 2 } : w)),
    gateSets: [...forced.gateSets, { wayId: 'WphRoute', version: 2, chainageM: [50, 500, 1000, 2700, 4300], createdAtMs: 1 }],
  });
  assert(errs.length === 0, `forced v2 must save, got ${errs.join('; ')}`);
  await wphResultsStore.backfillMissingResults(fs, ['oldref1']);
  assert(wphResultsStore.getStoredResult('oldref1') === null && wphResultsStore.isUnmatched('oldref1'),
    'precondition: under the bad v2 the reference is un-timed and marked (Path B state)');
  const out = await wphRouteFromRide.editWayGates('WphRoute', [50, 500, 1000, 1500, 1950], fs);
  assert(out.ok && out.moved, `the fixing edit must go through, got ${JSON.stringify(out)}`);
  if (!out.ok || !out.moved) return;
  assert(out.gateSetVersion === 3 && out.referenceRetimed, 'v3 minted, reference re-timed');
  assert(wphResultsStore.getStoredResult('oldref1')?.lap.quality === 'clean', 'and clean again');
});

test('c18-02 4 (promoteRideToReference / createRouteFromDraft): both clear a pre-existing marker on the ride they make the reference', async () => {
  {
    const { fs } = await wphSetup();
    const f = wphFixes(200, 0.0002, 1_700_100_000);
    await wphWriteRideFile(fs, 'newref9', f);
    await fs.ensureDir('results');
    await fs.writeText('results/unmatched.json', JSON.stringify({
      schemaVersion: 1, entries: [{ rideId: 'newref9', engineVersion: wphResultsStore.BACKFILL_ENGINE_VERSION }],
    }));
    await wphResultsStore.initResultsStore(fs);
    const out = await wphRouteFromRide.promoteRideToReference('WphRoute', 'newref9', fs);
    assert(out.ok && out.retimed.includes('newref9'), `promote must re-time a marked ride, got ${JSON.stringify(out)}`);
    assert(!wphResultsStore.isUnmatched('newref9'), 'promote cleared the marker');
  }
  {
    const { fs } = await wphSetup();
    await wphWriteRideFile(fs, 'create9', wphFixes(200, 0.0002, 1_700_100_000));
    await fs.ensureDir('results');
    await fs.writeText('results/unmatched.json', JSON.stringify({
      schemaVersion: 1, entries: [{ rideId: 'create9', engineVersion: wphResultsStore.BACKFILL_ENGINE_VERSION }],
    }));
    await wphResultsStore.initResultsStore(fs);
    const d = await wphRouteFromRide.draftRouteFromRide('create9', 1_700_100_000_000, null, fs);
    assert(d !== null, 'precondition: a draft');
    const out = await wphRouteFromRide.createRouteFromDraft(d!, { start: '', end: 'Far North' }, fs);
    assert(out.ok, `create must succeed, got ${JSON.stringify(out)}`);
    assert(!wphResultsStore.isUnmatched('create9'), 'create cleared the marker (the next backfill can time it)');
    assert(wphResultsStore.getStoredResult('create9') === null, 'create does NOT derive itself (decision 4)');
  }
});
```

If `wphSetup`/`wphEstablishRef`/`draftRouteFromRide` signatures differ from the ones quoted in
"Current state", stop and report. The unmatched-file shape `{ schemaVersion, entries }` is the
one `resultsStore.ts:8` documents and `resultsstore_suite.ts:516-520` reads back — if
`initResultsStore` rejects it (`isValidUnmatchedEntry`), stop and report the validator's shape.

**Expected before the fix:** test 1 fails at "the reference must be reported re-timed" (a
type error on `referenceRideId` first, under `tsc`); test 2 fails at "must refuse"; test 3 fails
at "the fixing edit must go through … reference re-timed" (`retimed:[]`, result null — the
repro's B'2); test 4 fails at both "cleared the marker" asserts. **After:** all pass, WP-H 22-27
and WP-I 1-6 unchanged.

#### `app/tests/resultsstore_suite.ts` — append after the test that starts on line 504

```ts
test('resultsstore (c18-02): clearUnmatched lets a marked ride be retried; no-op when nothing is marked', async () => {
  const fs = createMemoryFsAdapter();
  const fx = loadFixture('clean_morning');
  const rideId = 'nonsenseride2';
  await writeRideFile(fs, rideId, fx.fixes.t, fx.fixes.lat.map((v) => v + 0.1), fx.fixes.lon);
  resultsStore.resetResultsStoreForTests();
  await resultsStore.initResultsStore(fs);
  await resultsStore.backfillMissingResults(fs, [rideId]);
  assert(resultsStore.isUnmatched(rideId), 'precondition: marked');
  await resultsStore.clearUnmatched(rideId);
  assert(!resultsStore.isUnmatched(rideId), 'cleared in memory');
  await resultsStore.flushResultWrites();
  assert(!(fs.files.get('results/unmatched.json') ?? '').includes(rideId), 'cleared on disk');
  await resultsStore.clearUnmatched('never-marked'); // must not throw or write
  // retried: still nonsense, so it is marked again — proof the skip at :444 no longer fires
  await resultsStore.backfillMissingResults(fs, [rideId]);
  assert(resultsStore.isUnmatched(rideId), 'a retried nonsense ride is marked again');
});
```

## Verification

From the repo root:

- `cd app && node --experimental-strip-types tests/run.ts` → **zero FAIL** (5 new tests pass;
  WP-H 22-27, WP-I 1-6, every resultsstore/selfrace/colourmodel test unchanged).
- `cd app && ./node_modules/.bin/tsc --noEmit` → clean, exit 0 (the new outcome fields are
  required on the `moved:true` branch — any other constructor of `EditGatesOutcome` would fail
  here; grep says `editWayGates` is the only one).
- `grep -rn "Save & reset\|past ghosts will be lost\|history will be reset" app/src` → **no hits**.
- `grep -rn "clearUnmatched" app/src` → 4 hits: the definition in `resultsStore.ts` and one call
  each in `editWayGates`, `promoteRideToReference`, `createRouteFromDraft`.
- `GIT_OPTIONAL_LOCKS=0 git diff --stat` → exactly the five files listed under Executor rules.

## On-device: diagnostic first, then the check (Nathan, after publish)

**Diagnostic (works on the CURRENT build, before the fix ships — tells A from B):**
1. RIDES → yesterday's Home → Work ride. If the card reads **"this ride is the reference for
   this way — no lap time on file for it"** (`RideDetailScreen.tsx:508-520`), the reference has
   no result: that is the state this brief fixes. A lap card there instead means something else
   — report it, the brief's cause is then wrong.
2. ROUTES → Home → Work → the way's detail: **"rides on file"** reads `0`
   (`CatalogDetailScreen.tsx:325`, `rankedCountFor`). Same fact, second view.
3. Which path: SETTINGS → DATA shares `catalog.user.json`; if the way's `gateSets` has only
   `version: 1` plus the edited one, and the ride's `results/<rideId>.json` never existed,
   it was Path A (the reference was never timed); if a `results/` sidecar existed and vanished
   after the edit, Path B. Not needed for the fix — both are covered.

**Recovery of the stuck way, after the fix ships (no data is lost — the recording is intact):**
ROUTES → Home → Work → EDIT GATES → nudge any gate one step and **Save & re-time** (or nudge it
back first, then save). `editWayGates` clears the marker and re-times the reference. If the
save is refused with "cannot be timed against these gates: sector N …", that gate sits where
the recording has no fixes — move it and save again. Then ROUTES detail shows "rides on file 1".

**The check:** RECORD → ride Home → Work → one self dot races you from the START gate
(`selfDots` on), the sector pane colours each sector **purple or yellow** (one prior ride: no
green until a second one exists — D-045, unchanged), the reveal after STOP ranks you P1/P2 of 2.

## Nathan's call (recommended defaults applied; change = one-line follow-ups)

1. **Block vs warn-and-save on a nudge the reference can't time.** Default: **block** (decision
   2) — Nathan asked for "block or warn BEFORE saving"; a block never loses the self and the
   error names the gate. Alternative: save anyway with a warning and `referenceRetimed:false`
   (drop the `return { ok:false … }` in Edit 2E) — then the reference shows "no lap time on
   file" until the gate moves again, which is the state he just complained about.
2. **Same-session first re-ride after CREATING a way.** Unchanged by this brief: the founding
   ride is timed at the next boot / RIDES visit, not at creation (decision 4), so a second ride
   in the same session with no RIDES visit in between still shows no dot — today's behaviour.
   Fixing it properly means `saveAdjustedGates`/`onAdjustKeep` triggering a direct re-time (the
   `deriveReferenceAgainst` helper makes that a ~10-line follow-up in `routeFromRide.ts` +
   `RecordScreen.tsx`). Recommended as the next brief, not folded in here.
3. **Existing stuck ways on the phone.** Default: recover by re-saving gates (above). Alternative:
   bump `BACKFILL_ENGINE_VERSION` so every marker is retried once at next boot — heavier (retries
   every genuinely-unmatched ride) and not needed once `clearUnmatched` exists.

## JS-only / what changes on Nathan's phone

Nothing yet — parked brief. Once executed: **JS-only** (three source files, no dependency, no
`app.json`/`eas.json`/native change) → ships to the Preview APK over EAS Update via
`scripts/publish-preview.cmd` (from `C:\Users\natha\Claude personal projects\Qualifire\scripts`:
`powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-preview.ps1"`),
no new numbered build, no reinstall. On the phone: (1) EDIT GATES → the alert and the card no
longer threaten to erase history; the button reads `Save & re-time`; a nudge the reference
cannot be timed against is refused with the sector named, nothing saved; (2) after a save the
reference ride is re-timed and immediately races again (dot + purple/yellow sectors on the next
ride, in the same session too); (3) a way whose founding ride got stuck un-timed (the cycle13
"— ref, no lap time on file" state) recovers on its next gate save; new ways never get stuck.
Every other screen, the ranking window, D-045 and the colour model are untouched.

## Out of scope

- Same-session re-time at way creation (Nathan's call 2). Free rides (never candidates).
- Changing D-045 (not needed — see "What is NOT the cause"). The 20 m start tolerance in
  `core/src/timing.ts:21`. The candidate loop's corridor rule for non-reference rides.
- The RIDES-row / RideDetail copy from cycle13 (still accurate: it describes a real state that
  is now recoverable). iOS. `STATE.md`, `OPEN-ITEMS.md`, this folder's `README.md`.

## Open questions / assumptions (logged, not blocking)

1. Assumed `readRideFixes`' elements carry `tUnixMs` (they are `decodeRideFile(...).fixes`
   through `chronologicalFixes`, the same objects `backfillMissingResults:448-452` maps with
   `f.tUnixMs / 1000`). Verified by reading, not by `tsc` — the executor's `tsc` run settles it.
2. `deriveRideResult` returns `wayId: null` only when a sector is missed AND no lap bounds exist
   (`derive.ts:106`); the helper checks `result.wayId === wayId` anyway so a null never gets
   `saveResult`'d.
3. The repro script lives outside the repo (`$HOME/repro/repro.mts` on the Cowork VM) and is
   not part of this brief; tests 1-3 above reproduce its three cases inside the suite.
