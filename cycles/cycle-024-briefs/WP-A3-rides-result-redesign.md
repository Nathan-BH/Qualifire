# WP-A3 — RIDES as expandable ride history, RESULT as last-ride + personal bests

**Sequence:** brief 3 of 3 for WP-A. Requires WP-A1 (store) landed and green. A2 (record flow) should land first too — this brief uses A2's `useTabNav()`; if A2 has not landed, STOP and escalate (do not stub navigation).

**DO NOT WRITE ANY REPO FILE until the coordinator confirms cycle 023 has landed.** Re-baseline first: cycle 023's paused-time-in-result toggle may have changed `ResultScreen.tsx` and `settings.tsx`. Diff against the anchors below; carry every 023 addition (e.g. a raw-vs-paused time line) into the redesigned screen; escalate if you cannot see where it belongs.

## Goal (Nathan's words, notes2)

RIDES: "the gpx export is a nice feature but not the main feature. The previous rides should be clickable to expand them and look at them properly (the route, sector times etc, ranking and more)." RESULT: "just a fixed result… not appealing nor useful" → the mockup's redesign: "Your last ride" up top + a Personal Bests accordion per route (dates, never raw ride IDs), with export/delete demoted into the ride detail. Also kills beta findings: Ines "the list is a fix counter, not a ride list", "no per-ride history", Tom "after STOP the app points at the wrong tab".

Reference spec: `demos/mockup.html` — `ridesScreen()` L592-628 (row: route + date + lap + P-rank; expand → sector splits coloured vs that route's tower, avg column, export/delete pills), `resultScreen()` L516-558 + `resultDetail()` L562-584 (last-ride card with rank line + RECORD ANOTHER; PB rows expanding to a dated ranking table with gaps to P1 and PB sectors), `rankInTower` L276-292 (rank by identity, in place, never double-counting), `shortDate` L207-215.

## Environment / hard constraints

- No new packages. Tests pure: `cd app && node --experimental-strip-types tests/run.ts` → 0 FAIL. `npx tsc --noEmit` clean via device_bash (`cd "$HOME/mnt/Qualifire/app" && npx.cmd tsc --noEmit`). Re-baseline counts first.
- Honesty rules: position is a fact, colour a judgement (D-013) — rank never coloured; MIN_HISTORY=5 before any colour or rank (D-008/D-028); estimated laps never rank; no raw B-NN/D-NN IDs or ride IDs in user-facing copy (plain words; existing on-screen "(D-028)"-style captions in ResultScreen must NOT survive the redesign — plain language, decision IDs only in code comments).
- D-023: read-only over raw; everything shown derives from the A1 store + storage index.
- Never delete files → `safe_to_delete/`. Stop-on-ambiguity → escalate.

## Current state (anchors, snapshot 2026-08-20)

- `app/src/ui/RidesScreen.tsx` (260 lines): flat FlatList of `{rideId,startMs,endMs,nFixes}` from `listRides()` (`../storage`), stats header (rides / recorded / gps fixes) L110-129, rows date + duration + "N fixes" with always-visible Export GPX+ / ✕ delete L138-165. A1 added `removeStoredResult` + `dropRecorded` into `onDelete` L59-82.
- `app/src/ui/ResultScreen.tsx` (204 lines): `FALLBACK_ROUTE='Morning'` L23; ghost stand-in when no ride L69-74; lap card L110-120; VIEW TRACE toggle + browse `RouteMapView` L122-136 (B-57); `TimingTower` + `buildTowerModel` L138-158; sector rows L160-182; captions quoting D-013/D-025/D-028 on screen. A1 changed L49 to `ride?.rideId`.
- `app/src/ui/lastRide.ts` (post-A1): `getLastRide()`, `getLastRideOrStored()` (falls back to newest stored app ride), `FinishedRide.rideId`.
- `app/src/store/resultsStore.ts` (post-A1): `storedResults()`, `getStoredResult(rideId)`, `backfillMissingResults(fs, rideIds)`.
- `app/src/ui/colourModel.ts`: `ghostsFor(routeId, excludeRideId?)`, `lapValues`, `sectorValues`, `tierFor`, `allTimeBestLapS`, `positionAmong`, `fmt(s, decimals)`, `MIN_HISTORY=5`, `WINDOW_N=10`. Seed routes: Morning/EveningA/EveningB (+ MorningB app-recorded only — PB list must be driven by data present, not a hardcoded route list).
- `app/src/ui/towerModel.ts` L30-34: `towerDate(ms)` → "Tue 05 Aug" (reuse for dated rows).
- `app/src/ui/tower.tsx` / `towerModel.ts`: stay in the repo (Preview/Demo still import them) — ResultScreen simply stops using them.
- `app/src/ui/chips.tsx`: `chipColors(tier, t)`, `Tier`. `theme.ts`: `PaddockTheme`, `colors`, `radius`.
- `app/src/ui/settings.tsx` L169-171: "Timing tower" switch (`s.tower`), hint "rank today against the ghost set" — currently gates the tower block on Result.
- `app/src/ui/RecordScreen.tsx` L74-76 `routeLabel(id)` ("EveningA"→"Evening A") — do NOT import from RecordScreen; duplicate in the new model module (3 lines, noted).
- `app/src/storage/rideIndex.ts` `decodeIndex`; `app/src/storage/index.ts` `listRides`, `exportGpxPlus`, `deleteRide`.
- Mockup rank/N-history semantics: rank INCLUDES the ride itself slotted into its route's comparison set (P4 of 10 = 4th among the 10 laps counting mine, mockup `rankInTower`); `positionAmong(value, history)` (colourModel L106) implements exactly that — pass history EXCLUDING the ride, it inserts the value.

## Change list

### 1. NEW `app/src/ui/rideHistoryModel.ts` — pure view-model builders (no React, no expo; headless-testable)

Exports:
- `routeLabel(id: string): string` — same 1-liner as RecordScreen's (comment: duplicated by design to avoid a cross-screen import; keep in sync).
- `interface RideRowModel { rideId: string; startMs: number; dateLabel: string; routeId: string | null; routeName: string | null; lapS: number | null; lapLabel: string; quality: string | null; rank: { pos: number; of: number } | null }`
- `buildRideRows(metas: RideMeta[], resultFor: (rideId: string) => RideResult | null, laps: (routeId: string, excl: string) => number[]): RideRowModel[]` — newest first (`startMs` desc). Per ride: result present → routeName = `routeLabel(routeId)`, `lapS = lap.movingS` (null for estimated/missed → lapLabel "no lap" / `~raw` for estimated per existing conventions: estimated → `~${fmt(lap.rawS)}`), quality shown only when not 'clean'; `rank = null` unless `lapS != null` AND `laps(routeId, rideId).length >= MIN_HISTORY`, else `positionAmong(lapS, laps(routeId, rideId))`. No result → routeName null (renders "no route — recorded only"), everything else null. `dateLabel` = `towerDate(startMs)` + time `HH:MM` (e.g. "Tue 05 Aug · 08:31" — build a small `dateTimeLabel(ms)` here; local time, absolute dates only).
- `interface SectorRowModel { index: number; label: string; timeLabel: string; tier: UiTier; avgLabel: string }`
- `buildSectorRows(result: RideResult, hist: (index: number) => number[]): SectorRowModel[]` — per sector ascending index: clean with movingS → `fmt(movingS,1)`, `tier = tierFor(movingS, hist(index))` where the caller's `hist` already excludes this ride (see screen wiring); estimated → `~${fmt(rawS)}`, tier 'est'; missed → "– did not traverse –", tier 'est'; interrupted → time + tier on movingS with a ‖ suffix in label. `avgLabel` = "avg m:ss" over hist, '' when hist empty.
- `interface PbRowModel { routeId: string; routeName: string; pbLabel: string; nOnFile: number }`
- `buildPbRows(routeIds: string[], pb: (r: string) => number | null, count: (r: string) => number): PbRowModel[]` — one per routeId with count>0, catalog-ish order = order given.
- `interface PbDetailModel { ranking: { posLabel: string; dateLabel: string; timeLabel: string; gapLabel: string; today: boolean }[]; pbSectors: { label: string; timeLabel: string }[] }`
- `buildPbDetail(window: RideResult[], lastRideId: string | null): PbDetailModel` — window = the route's last-N rankable results (caller passes `ghostsFor(routeId)`); sort ascending movingS; P1..Pn; gap '' for P1 else `+${Math.round(v-p1)}s`; dateLabel `towerDate(startedAtMs)`; `today` when rideId === lastRideId (renders "today", accent). **Never a rideId in any label.** pbSectors: per sector index min clean movingS across the window, `fmt(v,1)`, missing → '–'.

### 2. MOD `app/src/ui/RidesScreen.tsx` — redesign (mockup ridesScreen)

- Load: `listRides()` (as today) + after load, fire `backfillMissingResults(createExpoFsAdapter(), endedIds)` once per mount, then re-read results and re-render (so old phone rides gain route/lap on first visit; loading hint "matching routes…" while it runs).
- Rows via `buildRideRows(metas, getStoredResult, (routeId, excl) => lapValues(routeId, excl))`. Row UI (keep the existing card style L219-232): left — routeName (or "no route — recorded only") bold + `dateLabel · lapLabel` sub-line (+ quality when present); right — rank as `P4/10` in dim ink (never coloured) or '–', chevron ›/▾. Whole row Pressable → toggle `expandedId`.
- Expanded detail: sector table from `buildSectorRows(result, (i) => sectorValues(result.routeId!, i, result.rideId))` — three columns S#/time/avg, time+S# coloured via `chipColors(tier, t)` (est → dim); below it two secondary pill buttons: **export GPX+** (existing `onExport`) and **delete** (existing `onDelete`) — demoted here, no longer on the collapsed row. No result → "sector times not on file for this ride" + the same two pills.
- Header: title "Rides" + Refresh stays; DELETE the stats card (rides/recorded/gps-fixes, L110-129) — fix-count purge. Delete-confirm copy L63: drop "· N fixes" (keep date, duration, "This permanently removes the raw trace.").
- Empty/loading states unchanged in spirit.

### 3. MOD `app/src/ui/ResultScreen.tsx` — redesign (mockup resultScreen)

Replace the board with:
- **Your last ride** card: `const ride = getLastRideOrStored()`. None → "Record a ride to see it here." card + nothing else above PBs. Present → route name (`routeLabel`), big lap figure `fmt(lapMovingS ?? lapRawS, 1)` coloured by `tierFor(lapMovingS, lapValues(routeId, ride.rideId))` (estimated → dim + `~` prefix, never coloured); rank line (plain ink): `lapMovingS != null && history ≥ MIN_HISTORY` → `P{pos} of {of} on this route` via `positionAmong`; estimated → "no time — an estimated lap never ranks"; too little history → "{n} rides of history — too few to rank"; no lap → "ended early — no full lap to rank". Keep **VIEW TRACE** toggle + browse map exactly as today (L122-136, gate colours memo L95-106 — keep, updating the exclusion id which A1 already made `ride.rideId`). Add **RECORD ANOTHER** slim button → `useTabNav().go('record')`.
- **Personal bests — tap a route**: routeIds = unique routeIds present in `[...seed ghosts, ...storedResults()]` preserving TRACK_IDS order first, then others (derive: iterate `TRACK_IDS` then any extra routeIds found). Rows via `buildPbRows(ids, allTimeBestLapS, (r) => ghostsFor(r).length)` — sub-line "personal best m:ss.d · N rides on file" (N = rankable count; use `ghostsFor(r).length` which is the window — see pre-resolved #4). One expanded at a time (`openRoute` state, default = last ride's route else first row). Detail via `buildPbDetail(ghostsFor(routeId), ride?.rideId ?? null)`: caption "last {n} on this route", table pos/date-or-today/time/gap (ranking table rendered only when `s.tower` is on — see change 4), then "personal best sectors" mini-table. If `s.tower` off: PB sectors only.
- Bottom caption, plain language (no IDs): "Position is a fact; colour is a judgement — a mid-pack ride is never dressed as failure. Purple beats your best, green beats your recent average, yellow is an ordinary lap."
- REMOVE: `FALLBACK_ROUTE`, the ghost stand-in "TODAY is the most recent ghost" path, `TimingTower`/`buildTowerModel` imports, `ANIMATED_RIDES` set, on-screen "(D-028)/(D-025)/(D-013)" captions. `tower.tsx`/`towerModel.ts` files stay (Preview/Demo use them).

### 4. MOD `app/src/ui/settings.tsx` — tower switch copy

L169-171: label "Rankings" (was "Timing tower"), hint "show where each ride placed against your others on that route" — the switch now gates the ranking table in Personal Bests (change 3) and continues to gate nothing else. It must remain a real switch (file doctrine: never a decorative row).

### 5. Tests — NEW `app/tests/ridehistory_suite.ts` (+8), imported from `run.ts`

Build small RideResult fixtures inline (copy the shape from `resultsstore_suite`/seed). Use the `registerHooks` JSON-loader pattern from `live_colour_suite.ts` L15-31 if importing anything that pulls a bare `.json` (colourModel does — so yes, dynamic import after hook, exactly as that suite does).
1. `buildRideRows`: newest-first ordering; a ride with a result gets routeName/lap; one without gets nulls.
2. Rank excludes self: a ride ranked against `laps(routeId, rideId)` that would be P1-of-itself yields `positionAmong` over the others only — feed 5 other laps, assert pos/of = expected (of = 6, mockup in-place semantics).
3. Rank gating: with only 4 other laps (< MIN_HISTORY) rank is null.
4. `buildSectorRows`: estimated → `~` time, tier 'est'; missed → "did not traverse"; clean → tier from history; avg label present iff history non-empty.
5. `buildPbDetail`: rows sorted ascending, P1 gap '', others `+Ns`; `today` true only for the matching rideId; **no label anywhere contains a raw rideId substring** (assert none of the fixture rideIds appear in any label).
6. `buildPbRows`: routes with zero results are omitted; order preserved.
7. Lap label honesty: estimated lap → `~`-prefixed raw, `lapS` null (never ranks).
8. `dateTimeLabel` is absolute (contains month name + HH:MM; no "today"/"yesterday" relative forms).
- Expected: A2's baseline + 8, 0 FAIL. Re-baseline and report exact numbers.

## Verification

1. `cd app && node --experimental-strip-types tests/run.ts` → 0 FAIL (sandbox-pure).
2. device_bash: `cd "$HOME/mnt/Qualifire/app" && npx.cmd tsc --noEmit` → clean; rerun suite on PC.
3. Greps: `fixes` gone from `RidesScreen.tsx` user copy; no `D-0\d\d` / `B-\d\d` / `§\d` inside JSX Text of the two redesigned screens; `FALLBACK_ROUTE` gone from ResultScreen.
4. `demos/mockup.html`: NOT regenerated — the app is being changed TO MATCH the cycle-022 mockup; note this in the completion report (CLAUDE.md rule 6 satisfied by direction of travel).

## Files touched

`app/src/ui/rideHistoryModel.ts` (NEW) · `app/src/ui/RidesScreen.tsx` (redesign) · `app/src/ui/ResultScreen.tsx` (redesign) · `app/src/ui/settings.tsx` (copy/gate) · `app/tests/ridehistory_suite.ts` (NEW) · `app/tests/run.ts`

## Conflict-with-023 flags

- **`ResultScreen.tsx` — HIGH:** 023's paused-time-in-result toggle likely adds a raw-vs-moving/paused line here. Re-baseline; port that line into the "Your last ride" card (under the rank line). If its data plumbing conflicts with `getLastRideOrStored()`, STOP and escalate.
- **`settings.tsx` — MEDIUM:** 023 may add the paused-time toggle row; merge around it, don't reorder its rows.
- `RidesScreen.tsx`: low (023 scope doesn't mention it) — still re-baseline.
- WP-B (free rides) will later add a "free rides" category to this history; keep `routeId:null` rendering generic ("no route — recorded only") so WP-B can specialise it.

## Pre-resolved ambiguities (recap)

1. Rank semantics = mockup's in-place rank via `positionAmong` (self excluded from history, value inserted); gated by MIN_HISTORY; never coloured.
2. Dates always absolute (towerDate + HH:MM); "today" appears only as the marker inside PB ranking rows; raw ride IDs appear nowhere on screen.
3. Mockup's "new" badge on session rides is NOT ported (dates make it redundant); mockup's "archive rides are not deletable" toast is moot — on-device rides are all deletable, seed ghosts never appear in RIDES (they are results, not stored rides).
4. "N rides on file" = the comparison window's count (`ghostsFor().length`, ≤10) — matches what the ranking table shows; the label reads "rides on file" per the mockup, and if Nathan ever wants the all-time count that is a one-line change.
5. Last ride survives restarts via `getLastRideOrStored()` (store fallback) — beta finding #1 closed.
6. `s.tower` switch repurposed to gate ranking tables (kept real, never decorative).
7. The timing tower + slot-in leave the Result tab (mockup supersedes LAYOUT §3/§3b there); the component survives in Demo/Preview.

## NEEDS-NATHAN

1. **Tower slot-in animation homeless.** Your 2026-08-15 ruling loved the "shoot up into position" slot-in; the 2026-08-19 mockup Result has no tower, so after this change the slot-in only exists in the Demo tab. OK, or do you want the ranked table (with the slot-in) back on the last-ride card later? Default shipped: mockup as-is, no tower on Result.

## Rollback

Revert the six files; the store (A1) is untouched by rollback and keeps accumulating results for a retry.
