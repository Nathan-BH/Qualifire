# 10 — Second ride of a founded route: the sector STRIP chips stay grey (map line: secondary)

> **DECISION: A** — the executor reads this line first. `A` = execute §Files 1-2 as written
> (sector history admits clean + interrupted sectors, like the lap window). `B` = do nothing,
> report "DECISION B — not executed". Nathan can flip this one line before execution.

**Source: Nathan, 2026-10-02 (binding), clarified the same day.** He rode a route for the SECOND
time — racing exactly one earlier ride, the one that founded the route through the "this ride
becomes a route" naming flow — and again saw **no colour on the sector STRIP** (the S1–S4 chips
under the clock) during the ride: every bar stayed grey as the sectors landed. He has never
enabled the 'Sector colours' map-line setting, so the sector-coloured route line is only a
secondary surface here (it is fed by the same history, so the fix reaches it for free — nothing
line-specific is required). He says it is the same issue he reported before, still open, and that
it hits specifically second rides. The STRIP chips are tiered whatever that setting says
(`liveView.tsx` 169 → `RecordScreen.tsx` 1034-1039), which is exactly why the symptom is visible
to him.

**This report contradicts brief 07's conclusion** ("ride 1 paints nothing, as expected; the
earlier complaint was probably the setting being OFF or an earned-yellow line") and is NOT
dismissed here: brief 07 reviewed the *wiring* and found it correct, but never asked what the
founding ride's stored sectors look like. That is where the defect is.

**Status: brief only. Nothing below is in the app.** Written 2026-10-02 by the Plan tier
(Fable) against the working tree (branch `virgin`, HEAD `ae911bb`; 784 tests / 781 pass / 0 fail
/ 3 skip at HEAD per brief 07 — cycle19 and cycle20 briefs 01-09 are unexecuted at writing time;
add their test counts to every number in §Verification if any landed first). Executor: Sonnet,
cold, this file only, tonight — every call below is decided (see §Decisions (coordinator)). **Independent of brief 07** (07 edits `colourModel.ts` AFTER line 174 and
RecordScreen; this brief edits `colourModel.ts` lines 139-155 only and never touches RecordScreen)
and of briefs 06/08/09. Both 07 and 10 append tests to `live_colour_suite.ts` — append-only, no
overlap, either order works.

## What this changes on the phone — and what it does not

- **Changes (DECISION A):** a sector's live verdict — **the S1–S4 strip chip first of all**, the
  sector flash, and (secondary, only if that setting is ever turned on) the sector-coloured map
  line — and its stored verdict (ride detail, RIDES row) are judged against
  the previous rides' **clean AND interrupted** sector times — the same rule the LAP already uses
  (an interrupted lap ranks and sits in the lap window; `store/results.ts` `ranks()`,
  `colourModel.lapValues`). Today a sector whose history rides all contained a stop (≥ 3 s under
  1 m/s inside the sector — `core/src/kinematics.ts` `STOP_T_S`, `core/src/timing.ts`
  `INTERRUPTED_STOP_S`) has NO comparable history at all and renders `'neutral'`: grey bar and
  grey label in the strip, however fast today's sector was. On a freshly founded route the
  history IS the founding ride, so every sector the founding ride stopped in is grey for the
  whole second ride. After the fix, on a second ride each chip turns **purple** (faster than the
  single earlier ride in that sector) or **yellow** (slower) the moment it lands — with n=1 those
  are the only two reachable tiers (`tierFor`: best = mean at a pool of one; green from ride 3).
- **Also changes (same rule, later rides):** a sector containing a traffic light the rider
  usually stops at can today never earn a colour on any ride (no clean history ever accumulates
  for it); after this it is judged like any other sector — "a red light is the lap's own luck",
  the ratified raw-timing ground rule (`store/timing.ts` header, WP-C 2026-09-05).
- **Stays exactly as today:** what is recorded (no result changes, no re-derive), timing mode,
  lap ranking and the tower, `ranks()`, the ghost window (`ghostsFor`, WINDOW_PREV=9, exclusion
  by id), `tierFor` (purple < best, green < mean, else yellow; n=1 ⇒ purple/yellow only),
  'estimated'/'missed' sectors (no real time, never in any history — unchanged), the map line's
  own stricter rule that TODAY's interrupted sector does not paint (`sectorTrailModel.ts` 87,
  WP-K §7.1 — kept, Decision 1b), the earned-yellow line hex (`tierColour.ts` 14 — kept,
  Decision 2; `theme.ts` untouched), the PB sector row on the ride detail
  (`rideHistoryModel.buildPbDetail` 320 keeps "best CLEAN sector" — see §Out of scope), the
  'Sector colours' setting, the strip's palette.
- **JS-only → OTA-able** via EAS Update (`scripts/publish-preview.ps1`; no native, no fingerprint
  change). No new build needed.

## Root cause (proven by headless reproduction, 2026-10-02)

**H1 is the cause: the founding ride's stored sectors are `'interrupted'`, and
`colourModel.sectorValues` is CLEAN-ONLY, so ride 2's sector history is `[]` ⇒ `tierFor` ⇒
`'neutral'` for every sector ⇒ grey strip chips (and, secondary, an unpainted line).** The lap is unaffected
(an interrupted lap ranks), which is why the tower after STOP still shows a P1/P2 of 2 and why
the earlier reviews, which looked at the lap and at the wiring, found nothing.

The chain, line-anchored (all read 2026-10-02):

1. The founding flow stores the founding ride's own result from its recording:
   `store/routeFromRide.ts` 258-263 `createRouteFromDraft` → `timeReferenceAt(rideId, wayId,
   builtRef.ref, seed.chainageM, 1, fs)` (389-403) → `deriveRideResult` (`store/derive.ts`
   59-125) → `core/src/timing.ts` `sectorTimes` 45-73: a sector with `stoppedTimeBetween ≥
   INTERRUPTED_STOP_S (1.0 s)` is flagged `'interrupted'` (line 69); `computeKinematics`
   (`core/src/kinematics.ts` 15-38) marks a fix "stopped" when fix-to-fix speed stays under
   `STOP_V_MS = 1.0 m/s` for more than `STOP_T_S = 3.0 s`. So ONE stop of a few seconds inside a
   sector — a light, a yield, a foot down at a junction — makes that founding sector
   `'interrupted'`. The lap inherits the worst sector (`derive.ts` 91-97) → `'interrupted'`,
   which still `ranks()` (`store/results.ts` 92-97).
2. `RecordScreen.tsx` 829-831 mirrors it into the live window: `replaceRecorded(founding)`
   (`ui/lastRide.ts` 313-316 pushes iff `ranks(r)`). So the founding result IS in
   `recordedResults()` for ride 2, same session or after a restart (`initRideHistory` 256-262
   pushes every `ranks()` store result at boot; `resultsStore.backfillMissingResults` 469 never
   re-derives a ride that already has a stored result, so nothing removes it later).
3. Ride 2's strip chip: `liveView.tsx` 169 `tierOf(i + 1, scoredS(sec))` → `RecordScreen.tsx`
   1034-1039 `tierFor(timeS, sectorValues(live.track, sectorIndex))`. Map line: 1061-1070
   `liveSectorColours(live.sectors, (i) => sectorValues(live.track, i), tierLineColour)`.
4. `ui/colourModel.ts` 145-155:
   ```ts
   export function sectorValues(wayId: string, index: number, excludeRideId?: string): number[] {
     const out: number[] = [];
     for (const r of ghostsFor(wayId, excludeRideId)) {
       const s = r.sectors.find((x) => x.index === index);
       if (s && s.quality === 'clean') {
   ```
   — `'interrupted'` sectors are dropped. With the founding ride as the ENTIRE window, every
   sector it stopped in has history `[]` → `tierFor` 168-174 `st === null` → `'neutral'` →
   `chips.tsx` 124-144 `StripSlot`: `tierLineColour('neutral') === null` → bar `t.race.border`,
   label `t.textDim` (grey); `sectorTrailModel.ts` 43-46 `earnedColour` → `null` → the span is
   transparent, the yellow base line shows.
5. The store's OWN canonical sector history disagrees with this lookalike: `store/results.ts`
   141-155 `sectorHistory(results, sectorIndex)` admits `'clean' || 'interrupted'` with a real
   `scoredS` — documented as "the input every colour model consumes", re-pinned by WP-C
   (`tests/store_suite.ts` 423-441: "interrupted sectors keep their scored time and do count").
   `colourModel.ts` line 19 even imports `sectorHistory` and never uses it. `rankedFor` (64-68)
   explicitly refuses a local lookalike of `ranks()`; `sectorValues` is exactly such a lookalike
   of `sectorHistory`. Product intent agrees: `product/CONCEPT.md` 93 "Stop-containing sectors
   are flagged 'interrupted' but keep an earned tier"; `product/LAYOUT.md` 83/102/333
   "Interrupted (‖): earned tier + ‖". The clean-only rule's own justification (`colourModel.ts`
   139-144: EveningA S1 best 174.9 s vs mean 226.7 s read green) dates from when MOVING time
   coloured; under the raw-time default (WP-C) the lap already compares stop-inclusive raw times
   and the same argument would bar interrupted laps from the lap window — which they are not.

**Why the founding ride in particular (why "second rides"):** (a) the founding ride is 100 % of
ride 2's window, so any stop it contains blanks that sector outright — from ride 3 on, one
clean sector in the window is enough to colour; (b) gate seeding makes founding stops land
INSIDE sectors by construction: `store/gateSeeding.ts` 252-287 keeps every quantile gate
≥ 150 m (`SIGNAL_CLEAR_M`) away from the founding ride's own ≥ 20 s stationary runs
(`live/userRefs.ts` 53 `stopChainageM`), so a light the rider waited at is never at a gate and
always inside a sector of the founding result; (c) the founding ride is usually a ride that was
NOT ridden as a race (it became a route afterwards).

### Reproduction (headless, throwaway script outside the repo, 2026-10-02 — numbers for the test)

Synthetic 5 km straight line at 1 Hz, 5.5 m/s, founded through the real stack
(`initCatalogStore`/`initResultsStore`/`initUserRefs` on `createMemoryFsAdapter`,
`draftRouteFromRide` → `createRouteFromDraft` → `replaceRecorded(getStoredResult)` exactly as
RecordScreen 829-831), then ride 2 through `LiveEngine(catalogTrackSpecs())` with `start({ pickId })`
at 6.0 m/s, no stops; seeded gates came out `50, 1249, 2498, 3746, 4945` m.

| founding ride | founding result | ride 2 strip tiers (`tierFor(scoredS(sec), sectorValues(way, i))`) | ride 2 map line | lap chip |
|---|---|---|---|---|
| no stops | lap clean; S1-4 clean 218/227/227/218 s | purple ×4 | 4 purple spans | purple |
| 15 / 12 / 8 / 20 s stops at 15/40/60/90 % | lap **interrupted**, `ranks()` true, rankedCount 1; S1-4 **interrupted** 233/239/235/238 s (moving 218/227/227/218) | **neutral ×4** (`sectorValues` = `[]` ×4) | **all null** | purple |
| stops in S1 and S3 only; ride 2 stops 10 s in S2 | S1/S3 interrupted, S2/S4 clean | S1 neutral, S2 purple (own interrupted sector keeps its strip tier), S3 neutral, S4 purple | only S4 painted (S2: own-interrupted rule, §7.1) | purple |
| no stops, ride 2 SLOWER (5.0 m/s) | all clean | yellow ×4 (yellow bars in the strip) | 4 yellow spans = pixel-identical to the base line (H6) | yellow |

After ride 2 is stored (`rememberRide`), ride 3's window under today's code holds ONLY ride 2's
value per sector (founding still dropped); with the fix it holds both (233 & 200 for S1, etc.).
Same script with `sectorHistory(ghostsFor(way, i))` in place of `sectorValues`: row 2 becomes
purple ×4 / 4 purple spans; row 4 unchanged; moving mode reads the founding sector's moving
time (218, not 233). This is the fix, verified before writing it down.

### Hypothesis readout

| # | Hypothesis | Verdict | Evidence |
|---|---|---|---|
| H1 | founding sectors not `'clean'` ⇒ clean-only `sectorValues` = `[]` ⇒ neutral | **CAUSE — proven by reproduction** | table above; one ≥ 3 s stop inside a sector suffices (`STOP_T_S`, `INTERRUPTED_STOP_S`) |
| H2 | founding result stored but excluded by `ranks()` / wrong wayId / lap `'missed'` | **not a code defect; a REAL second state Nathan may be in** (by reading) | an interrupted lap ranks (results.ts 93-96); wayId is `way:<rideId>` on both sides (routeFromRide 245, engine pick id = way id); a founding lap `'missed'` (GPS hole, gate never crossed, off-corridor — derive.ts 91, `routecreation_suite.ts` 1060-1070 "c18-04") is stored as NO TIME, never ranks, so ride 2 is all-neutral AND the lap chip/tower have nothing to rank against. Honest by design (D-028); distinguishable on device (§Checklist step 0). No fix here. |
| H3 | in-memory `recorded` not refreshed / memo dependency | **ruled out** (by reading) | RecordScreen 829-831 + RideDetailScreen 293-295 + GateAdjustScreen 79-85 mirror every store write with `replaceRecorded`/`dropRecorded`; boot path `initRideHistory` 256-262; the `sectorColours` memo recomputes on every engine emit because `sectors` is a fresh array per `getState()` (brief 07 §Item 2); the strip's `tierOf` runs per render (`viewModelFromEngine`). |
| H4 | gate-set v2 re-time removes the founding result | **ruled out as a defect** (by reading); a real sub-case of H2 | `saveAdjustedGates` 316-325 re-times at v2 and stores (`routecreation_suite.ts` 1031-1058 pins it); only an un-timeable re-time removes it (`removeStoredResult`, 323) and RecordScreen 875-877 mirrors the removal — that is the "no reference time" state, surfaced as `referenceRetimed:false`. `backfillMissingResults` 469 (`store.has`) never re-derives a stored result at boot. |
| H5 | `live.track` null until the lock | **not the cause** | a PICKED way hard-locks within ~400 m; S1 ends at 25 % (≥ 1.2 km on a 5 km route); in the repro the first colour appears exactly at the S1 gate. Brief 06 changes the lock timing; nothing here depends on it. |
| H6 | n=1 ⇒ purple/yellow only; earned yellow = base line | **real, map line ONLY (a surface Nathan has not enabled); cannot explain a grey STRIP** | `StripSlot` paints an earned-yellow bar `YELLOW_TIER` and a neutral bar `t.race.border` — distinguishable; so an all-grey strip means all-neutral, not all-yellow. On the map line, with a clean founding sector, ride 2 shows colour ONLY when faster than the founding sector (purple); slower = yellow = invisible; green unreachable at n=1 (`tierFor` 172-173). Frequency on his route cannot be quantified without his data. Decision 2: leave. |

**Proven vs read:** H1's mechanism and the fix's effect are proven headless. Whether Nathan's
founding ride actually had a ≥ 3 s stop in every sector cannot be settled from code — we do not
have his data and the fix is general for every route. In the archive seed (Leuven commutes,
`results.seed.json`) interrupted sectors are rare (4 of 120), so H1 is not a universal
second-ride state; it is the ONLY code path found that yields a grey strip with a ranked founding
ride. The only other all-grey state is H2's "founding lap not ranked" (NO TIME), which §Checklist
step 0 separates in ten seconds and which is honest, not a defect.

## Decisions (coordinator, Nathan's standing wish: get it ready; he can flip in this line before execution)

- **Decision 1 = A (the `DECISION:` line at the top).** Which history does a SECTOR verdict
  compare against? **A:** clean AND interrupted sectors — the store's own `sectorHistory`, the
  same rule as the lap window, the raw-timing ground rule ("a red light is the lap's own luck"),
  the product docs' "interrupted keeps an earned tier" (`product/CONCEPT.md` 93, `LAYOUT.md`
  83/102/333). Consequence, accepted: a stop in a history ride makes that sector's history slower
  (easier purple/green there) — exactly as a stop in a history LAP already makes the lap window
  slower. The alternative **B** (keep clean-only) would leave a founded route's second ride grey
  in every sector the founding ride stopped in, and a light the rider always stops at grey
  forever; it is selectable only by editing the top line to `DECISION: B`, in which case the
  executor does nothing and reports.
- **Decision 1b = NO (recommended default).** TODAY's own interrupted sector is NOT painted on the
  map line (`sectorTrailModel.ts` 87, WP-K §7.1 "the map line is stricter" stays). The strip
  already shows an own-interrupted sector's earned tier with ‖ (`liveView.tsx` 170), which is the
  surface Nathan uses. No code.
- **Decision 2 = leave as is (recommended default).** The earned-yellow line hex stays the base
  line's (`tierColour.ts` 14 `YELLOW_TIER = colors.neutral`; flagged in `wayMapView.tsx`
  735-760 since cycle9); `theme.ts` untouched. Nathan does not use the line setting and his
  standing rule is less colour emphasis (STATE.md 103-109). If he ever turns the line on and
  wants earned-yellow visible, the minimal option is a dedicated `YELLOW_LINE` tone in
  `tierColour.ts` — a separate, later brief. No code.
- **Map line = optional, last.** The one-line fix feeds the line automatically (same
  `sectorValues`), so there is nothing line-specific to build. The ONLY line-related items in
  this brief are two assertion blocks in the tests (marked `// (secondary surface: map line)` in
  §Files 2, tests 1 and 4). They are kept because they cost nothing and pin the shared history;
  if the coordinator wants a strip-only change set, those two blocks may be dropped without
  affecting anything else — the strip fix is self-contained and ships alone.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor was read from the tree on 2026-10-02. If a quoted line is
  not where the brief says, or a name differs, stop and report the mismatch verbatim (file,
  line, expected, found). Never guess, never patch around it.
- No commit unless told (`GIT_OPTIONAL_LOCKS=0 git …`; a leftover `.git/index.lock` is `mv`'d
  aside, never deleted). **Never delete** — `safe_to_delete/` is the bin. No `npm install`, no
  `npx …`, no `eas …`. Never grep the whole repo or `node_modules`; `timeout 40 grep -n` on the
  named files only.
- **Files touched — exactly these, nothing else:**
  - EDIT `app/src/ui/colourModel.ts` (the `sectorValues` doc comment + body, lines 139-155)
  - EDIT `app/tests/live_colour_suite.ts` (append one import block + helpers + four tests)
- Do **not** touch: `RecordScreen.tsx`, `liveView.tsx`, `chips.tsx`, `theme.ts`,
  `tierColour.ts`, `sectorTrailModel.ts`, `rideHistoryModel.ts`, `rideDetailModel.ts`,
  `store/results.ts`, `store/derive.ts`, `core/src/*`, `engine.ts`, `lastRide.ts`,
  `routeFromRide.ts`, `tests/run.ts` (no new suite file), `tests/store_suite.ts`,
  `tests/sectortrail_suite.ts`, `tests/ridedetail_suite.ts`, `tests/ridehistory_suite.ts`,
  `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, this folder's other files, anything briefs 06/07/08/09
  name.

## Goal

DECISION A: on the second ride of a freshly founded route whose founding ride stopped inside
sectors, the S1–S4 **strip chips** earn purple / yellow the moment each sector lands (green from
ride 3) against the founding ride's sector times, exactly as the lap chip and tower already do
(the sector-coloured map line, a secondary surface Nathan has not enabled, follows for free); ride 3 compares against both earlier rides; estimated/missed sectors still never
enter any history; nothing recorded changes. Four headless tests pin it on a real founded-route
→ second-ride → third-ride fixture driven through `createRouteFromDraft` and `LiveEngine`; the
first fails against today's tree on the exact symptom (four `'neutral'` tiers, four `null`
spans).

## Decisions

1. **`sectorValues` delegates to the store's own `sectorHistory` over `ghostsFor`.** One line,
   no new rule invented: the window (`ghostsFor`: ranked rides, exclusion by id, last 9) is
   unchanged; the per-sector predicate becomes the store's (`clean | interrupted`, real
   `scoredS`). This is the same discipline `rankedFor` already states for `ranks()`
   ("not a local lookalike"). The dead import at line 19 becomes live.
2. **Timing mode is honoured automatically** — `sectorHistory` reads `scoredS(s)`: raw mode gives
   the interrupted sector's raw (stop-inclusive) time, moving mode its `movingS` (raw − stop,
   real for interrupted sectors — `derive.ts` 78, `lastRide.ts` 104). Test 3 pins both.
3. **Today's own interrupted sector:** unchanged everywhere — the strip shows its tier with ‖
   (`liveView.tsx` 170), the map line leaves it unpainted (`sectorTrailModel.ts` 87, §7.1), the
   stored ride detail/RIDES likewise (`storedSectorColours` 64). Decision 1b keeps it.
4. **PB sector row** (`rideHistoryModel.buildPbDetail` 320, "best CLEAN sector", pinned by
   `ridehistory_suite.ts` 315-346) stays clean-only: a PB is a best, and a red-light time is not
   a best. Visible consequence, accepted: on a ride-2 detail a sector can be purple (faster than
   the founding ride's interrupted time) while the PB row still shows '–' for it until a clean
   time exists. Flagged in §Out of scope for the coordinator.
5. **No recorded data changes, no re-derive, no migration.** The fix is read-time only — the
   property the store was built for (`store/results.ts` header: no tier is ever stored).
6. **Tests live in `live_colour_suite.ts`** (it already has the JSON hook, `LiveEngine`,
   `catalogTrackSpecs`, `createMemoryFsAdapter`, `rememberRide`, `resetRecordedForTests`,
   `sectorValues`/`tierFor`/`lapValues`/`rankedCountFor`). New dynamic imports are added as
   SEPARATE `const` lines after line 42 (never editing the existing destructure at 29-32, which
   brief 07 edits). The suite runs under the shipped seed (`seedmode_pin.ts`), so the founded way
   sits beside the 20 seed ways in `catalogTrackSpecs()` — the hard pick makes that irrelevant;
   each test resets the catalog store / recorded window / user refs on exit so later suites
   (`catalogstore_suite`, `routecreation_suite`) start from the seed as today.

## Files to touch

### 1. EDIT `app/src/ui/colourModel.ts` — replace lines 139-155 (the `sectorValues` doc comment and function)

Replace, from the line `/**` directly above `* Sector history for the window. CLEAN ONLY — an
interrupted sector carries a` through the closing `}` of `sectorValues` (line 155, the line
before the blank line and the `/**` of `tierFor`'s comment), with:
```ts
/**
 * Sector history for the window: the store's OWN sectorHistory()
 * (store/results.ts — "the input every colour model consumes") over the same
 * ghost window the lap uses. Clean AND interrupted sectors count, each at its
 * scoredS() (store/timing.ts: raw by default — a stop is the sector's own
 * luck, exactly as an interrupted LAP already ranks and sits in lapValues());
 * estimated and missed sectors have no real time and never enter.
 *
 * virgin-cycle20 brief 10 (Nathan's ruling, 2026-10): until now this was a
 * local CLEAN-ONLY lookalike (cycle 009: EveningA S1 best 174.9 s vs mean
 * 226.7 s read green — a moving-time-era argument). The cost showed up on
 * every freshly founded route: the founding ride is ride 2's whole window,
 * gate seeding keeps its stops INSIDE sectors (gateSeeding.ts SIGNAL_CLEAR_M),
 * so every sector it stopped in had history [] and stayed 'neutral' (grey
 * strip bar, unpainted line) for the entire second ride — and a sector with
 * a light the rider always stops at could never earn a colour at all. Same
 * discipline as rankedFor() above: the store's predicate, not a lookalike.
 */
export function sectorValues(wayId: string, index: number, excludeRideId?: string): number[] {
  return sectorHistory(ghostsFor(wayId, excludeRideId), index);
}
```
(`sectorHistory` is already imported at line 19 — `import { ranks, sectorHistory } from
'../store/results.ts';` — confirm with `timeout 40 grep -n "sectorHistory" app/src/ui/colourModel.ts`
→ the import line and exactly one call after the edit.)

### 2. EDIT `app/tests/live_colour_suite.ts`

(a) Directly after the line `const { createMemoryFsAdapter } = await import('../src/storage/fsAdapter.ts');`
(line 42 at HEAD; line 44 once brief 07 landed — it added a `node:path` import and a
`buildRankingReveal` dynamic import above it; anchor on the text) — insert (do not touch the
`colourModel` destructure or the other existing dynamic imports):
```ts
// virgin-cycle20 brief 10: the founded-route → second-ride fixture needs the
// real catalog / results / user-ref stack and the ride-file encoder.
const b10CatalogStore = await import('../src/store/catalogStore.ts');
const b10ResultsStore = await import('../src/store/resultsStore.ts');
const b10UserRefs = await import('../src/live/userRefs.ts');
const b10RouteFromRide = await import('../src/store/routeFromRide.ts');
const { replaceRecorded: b10ReplaceRecorded, dropRecorded: b10DropRecorded } = await import('../src/ui/lastRide.ts');
const { liveSectorColours: b10LiveSectorColours } = await import('../src/ui/sectorTrailModel.ts');
const { tierLineColour: b10TierLineColour } = await import('../src/ui/tierColour.ts');
const { encodeEnd: b10EncodeEnd, encodeFix: b10EncodeFix, encodeHeader: b10EncodeHeader } = await import('../src/storage/jsonl.ts');
const { scoredS: b10ScoredS, setTimingMode: b10SetTimingMode, DEFAULT_TIMING: b10DefaultTiming } = await import('../src/store/timing.ts');
const { ranks: b10Ranks } = await import('../src/store/results.ts');
const { STOP_T_S: b10StopTS } = await import('../core/src/kinematics.ts');
```

(b) Append at the very end of the file — after the last test, whatever it is: at HEAD the file
ends with `resetFreeRidesForTests();\n});`; once brief 07 landed it ends with its test 4
(`'virgin-cycle20 07: RecordScreen wires the real lap tier …'`, closing `});`). Either is the
expected end, not an anchor mismatch:
```ts
// ------------------------------------------------- virgin-cycle20 brief 10 (2026-10-02)
// Nathan: second ride of a freshly founded route — no sector colour in the strip.
// Cause: the founding ride's sectors are 'interrupted' (a stop inside each) and
// sectorValues was clean-only, so ride 2's sector history was [] ⇒ 'neutral'.
// Fixture: a real founded route (createRouteFromDraft on a memory fs, mirrored into
// the live window exactly as RecordScreen.tsx 829-831 does), ride 2 through the
// LiveEngine with a hard pick, ride 3's window after rememberRide.

const B10_LAT0 = 51.30;
const B10_LON0 = 4.50;

/** A straight 1 Hz ride northwards at `vMs`, with a stationary run of `s`
 * seconds (same coordinates, 1 Hz) at each `frac` of `lengthM`. A run longer
 * than STOP_T_S is what core flags as a stop ⇒ the enclosing sector is
 * 'interrupted' (core/src/timing.ts INTERRUPTED_STOP_S). */
function b10Ride(lengthM: number, vMs: number, startS: number, stops: { frac: number; s: number }[]) {
  const t: number[] = []; const lat: number[] = []; const lon: number[] = [];
  const left = [...stops].sort((a, b) => a.frac - b.frac);
  let d = 0; let tt = startS;
  while (d <= lengthM) {
    t.push(tt); lat.push(B10_LAT0 + d / 110540); lon.push(B10_LON0);
    if (left.length > 0 && d / lengthM >= left[0].frac) {
      const st = left.shift()!;
      for (let k = 1; k <= st.s; k++) { tt += 1; t.push(tt); lat.push(B10_LAT0 + d / 110540); lon.push(B10_LON0); }
    }
    tt += 1; d += vMs;
  }
  return { t, lat, lon };
}

async function b10WriteRide(fs: ReturnType<typeof createMemoryFsAdapter>, rideId: string, f: { t: number[]; lat: number[]; lon: number[] }) {
  let text = b10EncodeHeader(rideId, f.t[0] * 1000);
  for (let i = 0; i < f.t.length; i++) text += b10EncodeFix({ tUnixMs: f.t[i] * 1000, lat: f.lat[i], lon: f.lon[i] });
  text += b10EncodeEnd(f.t[f.t.length - 1] * 1000, f.t.length);
  await fs.ensureDir('rides');
  await fs.writeText(`rides/${rideId}.jsonl`, text);
}

/** Founds a route from ride 'b10-ride1' (5 km at 5.5 m/s with `stops`) through the
 * real flow and mirrors the stored founding result into the live window the way
 * RecordScreen.tsx 829-831 does. Returns the way id and the stored founding result. */
async function b10Found(stops: { frac: number; s: number }[]) {
  b10CatalogStore.resetCatalogStoreForTests();
  resetRecordedForTests(); // also resets the results store
  b10UserRefs.resetUserRefsForTests();
  const fs = createMemoryFsAdapter();
  await b10CatalogStore.initCatalogStore(fs);
  await b10ResultsStore.initResultsStore(fs);
  await b10UserRefs.initUserRefs(fs);
  const r1 = b10Ride(5000, 5.5, 1_700_000_000, stops);
  await b10WriteRide(fs, 'b10-ride1', r1);
  const d = await b10RouteFromRide.draftRouteFromRide('b10-ride1', r1.t[0] * 1000, null, fs);
  assert(d !== null, 'b10: the founding ride drafts a route');
  const out = await b10RouteFromRide.createRouteFromDraft(d!, { start: 'B10 Home', end: 'B10 Work' }, fs);
  assert(out.ok && out.referenceTimed, `b10: createRouteFromDraft must store the founding result, got ${JSON.stringify(out)}`);
  if (!out.ok) throw new Error('unreachable');
  const founding = b10ResultsStore.getStoredResult('b10-ride1');
  if (founding) b10ReplaceRecorded(founding); else b10DropRecorded('b10-ride1');
  assert(founding !== null, 'b10: founding result stored');
  return { fs, wayId: out.wayId, founding: founding! };
}

/** Ride 2/3: the real LiveEngine over the real catalog specs, hard-picked on the way. */
function b10Drive(wayId: string, f: { t: number[]; lat: number[]; lon: number[] }): LiveEngineState {
  const engine = new LiveEngine(catalogTrackSpecs());
  engine.start({ pickId: wayId });
  for (let i = 0; i < f.t.length; i++) engine.feed(f.lat[i], f.lon[i], f.t[i] * 1000);
  return engine.getState();
}

function b10Teardown() {
  b10CatalogStore.resetCatalogStoreForTests();
  resetRecordedForTests();
  b10UserRefs.resetUserRefsForTests();
}

/** The strip chip's verdict for sector i, exactly RecordScreen.tierOf's body
 * (tierFor over sectorValues of the locked way; neutral with no lock / no time). */
function b10StripTier(st: LiveEngineState, i: number) {
  const sec = st.sectors[i - 1];
  const v = sec.kind === 'done' ? b10ScoredS(sec) : null;
  return st.track === null || v === null ? 'neutral' : tierFor(v, sectorValues(st.track, i));
}

const B10_STOPS = [{ frac: 0.15, s: 15 }, { frac: 0.4, s: 12 }, { frac: 0.6, s: 8 }, { frac: 0.9, s: 20 }];

test('virgin-cycle20 10: founded route, founding ride stopped in every sector — ride 2 STRIP chips earn purple, not neutral (map line follows)', async () => {
  const { wayId, founding } = await b10Found(B10_STOPS);
  try {
    // Preconditions (true before AND after the fix — if these fail, the stop
    // detection or the founding flow changed, not the colour rule).
    assert(B10_STOPS.every((s) => s.s > b10StopTS), 'every synthetic stop is longer than STOP_T_S');
    assert(founding.lap.quality === 'interrupted', `founding lap is interrupted (a stop in it), got ${founding.lap.quality}`);
    assert(founding.sectors.length === 4 && founding.sectors.every((s) => s.quality === 'interrupted'),
      `every founding sector is interrupted, got ${JSON.stringify(founding.sectors.map((s) => s.quality))}`);
    assert(b10Ranks(founding) && rankedCountFor(wayId) === 1, 'the founding ride ranks and is ride 2\'s whole window');
    assert(lapValues(wayId).length === 1, 'the LAP window already sees the founding ride (the lap chip was never the problem)');

    // Ride 2: clean, faster everywhere.
    const st = b10Drive(wayId, b10Ride(5000, 6.0, 1_700_100_000, []));
    assert(st.track === wayId && st.phase === 'finished' && st.sectors.every((s) => s.kind === 'done'),
      `ride 2 locks the pick and scores all four sectors, got track=${st.track} phase=${st.phase}`);
    assert(st.lap !== null && !st.lap.estimated && tierFor(b10ScoredS(st.lap), lapValues(wayId)) === 'purple', 'ride 2 lap verdict is purple (unchanged)');

    // THE SYMPTOM — fails on today's tree with four 'neutral's / four nulls.
    for (let i = 1; i <= 4; i++) {
      const hist = sectorValues(wayId, i);
      assert(hist.length === 1, `S${i}: the founding ride's interrupted sector IS ride 2's history, got ${JSON.stringify(hist)}`);
      const sec = st.sectors[i - 1];
      const v = sec.kind === 'done' ? b10ScoredS(sec) : null;
      assert(v !== null && v < hist[0], `S${i}: ride 2 (${v}) is faster than the founding sector (${hist[0]})`);
      assert(b10StripTier(st, i) === 'purple', `S${i}: strip chip must be purple (faster than the only earlier ride), got ${b10StripTier(st, i)}`);
    }
    // (secondary surface: map line) — same history, so it follows the strip for free; droppable.
    const spans = b10LiveSectorColours(st.sectors, (i) => (st.track === null ? [] : sectorValues(st.track, i)), b10TierLineColour);
    assert(spans.length === 5 && spans[0] === null, 'sector-colour array shape: [START, S1..S4]');
    assert(spans.slice(1).every((c) => c === b10TierLineColour('purple')), `map line paints all four sectors purple, got ${JSON.stringify(spans)}`);
  } finally {
    b10Teardown();
  }
});

test('virgin-cycle20 10: ride 3 still works — window holds the founding sector AND ride 2, green reachable, exclusion by id intact', async () => {
  const { wayId, founding } = await b10Found(B10_STOPS);
  try {
    const st2 = b10Drive(wayId, b10Ride(5000, 6.0, 1_700_100_000, []));
    rememberRide(st2, { rideId: 'b10-ride2', startedAtMs: 1_700_100_000_000 }); // onEnd's store write
    assert(rankedCountFor(wayId) === 2, 'two ranked rides on file');
    for (let i = 1; i <= 4; i++) {
      const hist = sectorValues(wayId, i, 'b10-ride3'); // ride 3, not yet stored: exclusion is a no-op
      const f = founding.sectors.find((s) => s.index === i)!;
      const own2 = st2.sectors[i - 1];
      const v2 = own2.kind === 'done' ? b10ScoredS(own2) : null;
      assert(hist.length === 2 && v2 !== null, `S${i}: ride 3 sees both earlier rides, got ${JSON.stringify(hist)}`);
      assert(hist.includes(b10ScoredS(f) as number) && hist.includes(v2), `S${i}: the window is [founding ${b10ScoredS(f)}, ride 2 ${v2}]`);
      const best = Math.min(...hist); const mean = (hist[0] + hist[1]) / 2;
      assert(tierFor(best - 1, hist) === 'purple', `S${i}: faster than both ⇒ purple`);
      assert(tierFor(mean - 1, hist) === 'green', `S${i}: between best and mean ⇒ green (n=2 unlocks green)`);
      assert(tierFor(mean + 1, hist) === 'yellow', `S${i}: slower than the mean ⇒ yellow`);
      // B-44 exclusion unchanged: ride 2 re-judged on its own detail sees only the founding sector
      const excl = sectorValues(wayId, i, 'b10-ride2');
      assert(excl.length === 1 && excl[0] === b10ScoredS(f), `S${i}: excluding ride 2 by id leaves the founding sector only, got ${JSON.stringify(excl)}`);
    }
  } finally {
    b10Teardown();
  }
});

test('virgin-cycle20 10: timing mode — raw reads the interrupted founding sector\'s stop-inclusive time, moving its raw − stop', async () => {
  const { wayId, founding } = await b10Found(B10_STOPS);
  try {
    const f1 = founding.sectors.find((s) => s.index === 1)!;
    assert(f1.movingS !== null && f1.rawS > f1.movingS + b10StopTS, `founding S1 carries a real moving time below its raw time (raw ${f1.rawS}, moving ${f1.movingS})`);
    assert(JSON.stringify(sectorValues(wayId, 1)) === JSON.stringify([f1.rawS]), 'raw mode (default): the sector\'s raw time');
    b10SetTimingMode('moving');
    try {
      assert(JSON.stringify(sectorValues(wayId, 1)) === JSON.stringify([f1.movingS]), 'moving mode: the sector\'s moving time');
    } finally {
      b10SetTimingMode(b10DefaultTiming);
    }
    assert(JSON.stringify(sectorValues(wayId, 1)) === JSON.stringify([f1.rawS]), 'mode restored to raw');
  } finally {
    b10Teardown();
  }
});

test('virgin-cycle20 10: a clean founding ride is unchanged — ride 2 slower ⇒ yellow everywhere (n=1: never green), faster ⇒ purple', async () => {
  const { wayId, founding } = await b10Found([]);
  try {
    assert(founding.lap.quality === 'clean' && founding.sectors.every((s) => s.quality === 'clean'), 'a no-stop founding ride is clean throughout');
    const slow = b10Drive(wayId, b10Ride(5000, 5.0, 1_700_100_000, []));
    for (let i = 1; i <= 4; i++) assert(b10StripTier(slow, i) === 'yellow', `S${i}: slower than the clean founding sector ⇒ yellow, got ${b10StripTier(slow, i)}`);
    // (secondary surface: map line) — droppable.
    const slowSpans = b10LiveSectorColours(slow.sectors, (i) => sectorValues(wayId, i), b10TierLineColour);
    assert(slowSpans.slice(1).every((c) => c === b10TierLineColour('yellow')), 'map line: four earned-yellow spans (H6: same hex as the base line — Decision 2)');
    const fast = b10Drive(wayId, b10Ride(5000, 6.0, 1_700_100_000, []));
    for (let i = 1; i <= 4; i++) assert(b10StripTier(fast, i) === 'purple', `S${i}: faster ⇒ purple, got ${b10StripTier(fast, i)}`);
    // estimated / missed sectors never enter a history: pinned on the store's own
    // sectorHistory by store_suite.ts 423-441, which this fix now delegates to.
  } finally {
    b10Teardown();
  }
});
```
Notes for the executor: `LiveEngineState` is already imported as a type at line 13; `assert`,
`test` at line 12; `rememberRide`, `resetRecordedForTests` at 34-35; `LiveEngine` 36;
`catalogTrackSpecs` 37; `createMemoryFsAdapter` 42; `sectorValues`, `tierFor`, `lapValues`,
`rankedCountFor` in the destructure at 29-32 (brief 07 adds `liveTierFor` there — leave that
line to brief 07 whether or not it has landed). Expected ride numbers (for your own sanity, not asserted as literals): founding S1-4 raw ≈ 233 /
239 / 235 / 238 s, moving ≈ 218 / 227 / 227 / 218 s; ride 2 at 6.0 m/s ≈ 200 / 208 / 208 /
200 s; at 5.0 m/s ≈ 240 / 250 / 250 / 240 s; seeded gates ≈ 50 / 1249 / 2498 / 3746 / 4945 m.

## Verification plan

1. **Failed-before artifact.** Before editing `colourModel.ts`: apply ONLY §Files 2 (the tests),
   run `cd app && node --experimental-strip-types tests/run.ts` and report the FAIL lines —
   expected: test 1 fails at `S1: the founding ride's interrupted sector IS ride 2's history,
   got []`; test 2 fails at `S1: ride 3 sees both earlier rides, got [<one value>]`; test 3 fails
   at `raw mode (default): the sector's raw time`; test 4 PASSES (unchanged behaviour). Any other
   failure, or a precondition failure, is an anchor mismatch — stop and report it verbatim.
2. Apply §Files 1. `cd app && node --experimental-strip-types tests/run.ts` → **788 tests /
   785 pass / 0 fail / 3 skip** (784 + 4; add brief 07's 4 and any cycle19/20 counts that landed
   first). Zero FAIL is the bar; report the exact summary line. In particular these must still
   pass untouched: `store_suite` "sector history drops dirty sectors", `sectortrail_suite`
   (own-interrupted stays null), `ridedetail_suite` 137, `ridehistory_suite` 315 (PB sectors
   ignore interrupted), every `live_colour_suite` B-44 / NW-1 / D-045 case.
3. `cd app && ./node_modules/.bin/tsc --noEmit` — clean, exit 0.
4. `timeout 40 grep -n "sectorHistory\|quality === 'clean'" app/src/ui/colourModel.ts` → the
   import (line 19), the one call in `sectorValues`, and NO `quality === 'clean'` left in the file.
5. `GIT_OPTIONAL_LOCKS=0 git status --porcelain` shows (besides the pre-existing
   `M scripts/OTA-TROUBLESHOOTING.md`, the untracked `cycles/…`, `marketing/…`, and whatever
   other landed briefs changed) exactly: `M app/src/ui/colourModel.ts`,
   `M app/tests/live_colour_suite.ts`.
6. Inspect (fresh Opus): reruns 1-5; confirms the `colourModel.ts` diff is the doc comment + the
   one-line body and nothing else (`git diff app/src/ui/colourModel.ts`); confirms
   `store/results.ts`, `sectorTrailModel.ts`, `RecordScreen.tsx`, `rideHistoryModel.ts` are
   byte-identical to HEAD (`git diff --stat` lists none of them); confirms test 1's failed-before
   output named four sectors (not one), i.e. the fixture really produced an all-interrupted
   founding ride; confirms test 4 passed both before and after.

## On-device checklist — Nathan (what the STRIP shows on a second ride)

**Step 0 — which state were you in? (do this first, before any OTA; it separates H1 from H2):**
open RIDES → the ride that founded the route (the first one). In its detail: (i) does it show a
lap time and a position, or **NO TIME**? (ii) in its sector rows, do the labels read `S1 ‖`,
`S2 ‖` … (‖ = a stop inside that sector)? **Lap time + ‖ on the sectors = H1, this brief's
case.** NO TIME = H2: the founding recording could not be timed against its own gates (a GPS
hole or a gate it never crossed) — honest, not this bug; the route needs a re-timed reference
(ROUTES → edit gates, or promote a later clean ride to reference).
Also: after that second ride, did the tower show you P1/P2 **of 2**? (yes = H1).

After the OTA (JS-only; DECISION A):
1. Found a new route (any ride that ends with the naming card), KEEP the gates. Ride it a second
   time. As each sector lands, its chip in the S1–S4 strip turns **purple** (faster than your
   founding ride in that sector) or **yellow** (slower) — bar and label coloured, never left grey,
   even in a sector where you waited at a light the first time. Green is impossible on ride 2
   (one earlier ride: best = mean); it becomes reachable on ride 3.
2. If you stop inside a sector yourself, its chip still earns its colour and shows `S2 ‖`.
3. The sector flash after each gate carries the same colour as the chip.
4. Nothing in RESULTS / the tower / the lap chip changes. Your founding ride's detail may show
   coloured sector rows for later rides while its PB row still says '–' for a sector no ride has
   yet ridden clean (Decision 4).
5. (Optional, only if you ever switch 'Sector colours' on:) the route line paints purple
   sectors; yellow ones look unpainted — Decision 2 kept that hex, say if you want earned-yellow
   visible; your own interrupted sector stays unpainted on the line — Decision 1b.

## Out of scope

- Decisions 1b/2 are kept at their defaults (no code); reopen only if Nathan starts using the
  line setting.
- `rideHistoryModel.buildPbDetail` PB sectors staying clean-only (Decision 4) — coordinator
  may raise it with Nathan later.
- H2's "founding lap NO TIME" state: honest by design; the checklist's step 0 tells it apart.
  A UI hint ("this route's reference has no time — nothing to race") would be new copy, which
  briefs 08/09 are actively removing; not proposed.
- `STATE.md`: the coordinator adds one line under the sector-coloured-trail entry (103-109) when
  this lands: "sector history = clean + interrupted (store sectorHistory), since cycle20/10".

## Report back

- Step 1's FAIL lines (three tests, the exact messages), the final summary line (0 FAIL, 788
  unless other briefs landed), `tsc` exit code, the grep from Verification 4, the
  `git status --porcelain` list.
- Any anchor mismatch, verbatim, with the line actually found — and stop there.
- Reminder lines for the coordinator: "JS-only; OTA-able; executed under DECISION A (or:
  DECISION B — not executed); Decisions 1b/2 at default, no code; PB-row note (Decision 4) still
  open; STATE.md line to add".
